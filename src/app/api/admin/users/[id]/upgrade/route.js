// file: /src/app/api/admin/users/[id]/upgrade/route.js v2 - FIXED: Handle old user schema migration
// UPDATED - Admin User Upgrade API with Email Notifications and Old User Schema Support

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { sendSubscriptionUpgradeEmail } from '@/lib/email';

// Helper function to safely migrate old user schema
function migrateUserSubscriptionSchema(user) {
    const now = new Date();

    // If user doesn't have subscription object at all, create it
    if (!user.subscription) {
        console.log(`🔧 Creating subscription schema for old user: ${user.email}`);
        user.subscription = {
            tier: 'free',
            status: 'free',
            billingCycle: null,
            startDate: now,
            endDate: null,
            trialStartDate: null,
            trialEndDate: null,
            hasUsedFreeTrial: false,
            paymentMethod: null,
            stripeCustomerId: null,
            lastPaymentDate: null,
            nextBillingDate: null,
            adminUpgradeHistory: []
        };
    }

    // Ensure all required fields exist
    const requiredFields = {
        tier: 'free',
        status: 'free',
        billingCycle: null,
        startDate: now,
        endDate: null,
        trialStartDate: null,
        trialEndDate: null,
        hasUsedFreeTrial: false,
        paymentMethod: null,
        stripeCustomerId: null,
        lastPaymentDate: null,
        nextBillingDate: null,
        adminUpgradeHistory: []
    };

    // Add any missing fields with defaults
    for (const [field, defaultValue] of Object.entries(requiredFields)) {
        if (user.subscription[field] === undefined) {
            user.subscription[field] = defaultValue;
        }
    }

    return user;
}

export async function POST(request, { params }) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        // Verify admin status
        const adminUser = await User.findById(session.user.id).select('+isAdmin');
        if (!adminUser?.isAdmin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const userId = params.id;
        const body = await request.json();
        const {
            tier,
            endDate,
            reason,
            sendNotification = true,
            billingCycle = null
        } = body;

        console.log(`🔧 Admin upgrading user ${userId} to ${tier}`, {
            endDate,
            reason,
            sendNotification,
            adminUser: session.user.email
        });

        // Validate inputs
        if (!['free', 'gold', 'platinum'].includes(tier)) {
            return NextResponse.json(
                { error: 'Invalid tier. Must be free, gold, or platinum' },
                { status: 400 }
            );
        }

        // Get target user
        let user = await User.findById(userId);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // FIXED: Migrate old user schema before processing
        user = migrateUserSubscriptionSchema(user);

        // Store previous subscription for comparison and audit
        const previousTier = user.subscription?.tier || 'free';
        const isUpgrade = (tier === 'platinum' && previousTier !== 'platinum') ||
            (tier === 'gold' && previousTier === 'free');

        // Prepare subscription update
        const now = new Date();
        const subscriptionUpdate = {
            tier,
            status: 'active',
            billingCycle,
            startDate: now,
            endDate: endDate ? new Date(endDate) : null,
            lastUpdated: now
        };

        // If downgrading to free, ensure proper cleanup
        if (tier === 'free') {
            subscriptionUpdate.status = 'free';
            subscriptionUpdate.billingCycle = null;
            subscriptionUpdate.endDate = null;
        }

        // Store previous subscription for audit trail
        const previousSubscription = {
            tier: previousTier,
            status: user.subscription?.status || 'free',
            endDate: user.subscription?.endDate,
            changedAt: now,
            changedBy: session.user.id,
            changedByEmail: session.user.email,
            reason: reason || 'Admin upgrade'
        };

        // Update user subscription - FIXED: Properly handle old schema
        user.subscription = {
            ...user.subscription,
            ...subscriptionUpdate,
            // Keep trial history (if exists)
            trialStartDate: user.subscription?.trialStartDate || null,
            trialEndDate: user.subscription?.trialEndDate || null,
            hasUsedFreeTrial: user.subscription?.hasUsedFreeTrial || false,
            // Add audit trail
            adminUpgradeHistory: [
                ...(user.subscription?.adminUpgradeHistory || []),
                previousSubscription
            ].slice(-10) // Keep last 10 changes
        };

        // FIXED: Also ensure other required fields exist for old users
        if (!user.usageTracking) {
            user.usageTracking = {
                currentMonth: now.getMonth(),
                currentYear: now.getFullYear(),
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                totalInventoryItems: 0,
                totalPersonalRecipes: 0,
                totalSavedRecipes: 0,
                totalPublicRecipes: 0,
                totalRecipeCollections: 0,
                lastUpdated: now
            };
        }

        if (!user.accountStatus) {
            user.accountStatus = {
                status: 'active',
                suspensionHistory: []
            };
        }

        // Save with error handling
        try {
            await user.save();
        } catch (saveError) {
            console.error('❌ Error saving user after migration:', saveError);
            return NextResponse.json(
                { error: 'Failed to save user data after migration. Please try again.' },
                { status: 500 }
            );
        }

        console.log('✅ User subscription updated successfully:', {
            userId,
            userEmail: user.email,
            newTier: tier,
            previousTier: previousTier,
            endDate: endDate || 'none',
            isUpgrade,
            wasMigrated: true
        });

        // Send email notification if requested
        let emailResult = null;
        if (sendNotification) {
            try {
                console.log('📧 Sending subscription upgrade notification email...');

                const emailData = {
                    userName: user.name,
                    userEmail: user.email,
                    newTier: tier,
                    previousTier: previousTier,
                    endDate: endDate,
                    upgradeReason: reason,
                    isUpgrade: isUpgrade
                };

                emailResult = await sendSubscriptionUpgradeEmail(emailData);
                console.log('✅ Subscription upgrade email sent successfully:', emailResult.messageId);

            } catch (emailError) {
                console.error('❌ Failed to send subscription upgrade email:', emailError);
                // Don't fail the whole operation if email fails
                emailResult = {
                    success: false,
                    error: emailError.message
                };
            }
        }

        return NextResponse.json({
            success: true,
            message: `User subscription updated to ${tier} successfully`,
            subscription: {
                tier: user.subscription.tier,
                status: user.subscription.status,
                startDate: user.subscription.startDate,
                endDate: user.subscription.endDate,
                billingCycle: user.subscription.billingCycle
            },
            previousSubscription,
            emailSent: sendNotification,
            emailResult: emailResult,
            isUpgrade: isUpgrade,
            migrationPerformed: true
        });

    } catch (error) {
        console.error('❌ Admin user upgrade API error:', error);

        // Enhanced error logging for debugging
        if (error.name === 'ValidationError') {
            console.error('Validation Error Details:', error.errors);
            return NextResponse.json(
                {
                    error: 'User data validation failed',
                    details: Object.keys(error.errors).join(', '),
                    validationErrors: error.errors
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Bulk upgrade endpoint for Google Play testers - UPDATED with schema migration
export async function PATCH(request, { params }) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        // Verify admin status
        const adminUser = await User.findById(session.user.id).select('+isAdmin');
        if (!adminUser?.isAdmin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const {
            userEmails,
            tier = 'platinum',
            endDate,
            reason = 'Google Play tester access',
            sendNotifications = false // Default to false for bulk operations to avoid spam
        } = body;

        console.log(`🚀 Bulk upgrading ${userEmails.length} users to ${tier}`, {
            endDate,
            reason,
            sendNotifications
        });

        if (!Array.isArray(userEmails) || userEmails.length === 0) {
            return NextResponse.json(
                { error: 'userEmails array is required' },
                { status: 400 }
            );
        }

        if (userEmails.length > 100) {
            return NextResponse.json(
                { error: 'Maximum 100 users per bulk operation' },
                { status: 400 }
            );
        }

        // Get all users to upgrade
        const users = await User.find({
            email: { $in: userEmails.map(email => email.toLowerCase()) }
        });

        if (users.length === 0) {
            return NextResponse.json(
                { error: 'No users found with provided emails' },
                { status: 404 }
            );
        }

        console.log(`📧 Found ${users.length} users out of ${userEmails.length} emails`);

        const now = new Date();
        const results = {
            successful: [],
            failed: [],
            notFound: [],
            emailResults: [],
            migrated: []
        };

        // Process each user
        for (const user of users) {
            try {
                // FIXED: Migrate old user schema
                const wasMigrated = !user.subscription;
                migrateUserSubscriptionSchema(user);

                if (wasMigrated) {
                    results.migrated.push(user.email);
                }

                const previousTier = user.subscription?.tier || 'free';
                const isUpgrade = (tier === 'platinum' && previousTier !== 'platinum') ||
                    (tier === 'gold' && previousTier === 'free');

                user.subscription = {
                    ...user.subscription,
                    tier,
                    status: 'active',
                    billingCycle: null, // Free upgrade
                    startDate: now,
                    endDate: endDate ? new Date(endDate) : null,
                    lastUpdated: now,
                    // Keep trial history
                    trialStartDate: user.subscription?.trialStartDate,
                    trialEndDate: user.subscription?.trialEndDate,
                    hasUsedFreeTrial: user.subscription?.hasUsedFreeTrial || false,
                    // Add to admin upgrade history
                    adminUpgradeHistory: [
                        ...(user.subscription?.adminUpgradeHistory || []),
                        {
                            tier: previousTier,
                            status: user.subscription?.status || 'free',
                            endDate: user.subscription?.endDate,
                            changedAt: now,
                            changedBy: session.user.id,
                            changedByEmail: session.user.email,
                            reason: `Bulk upgrade: ${reason}`
                        }
                    ].slice(-10)
                };

                // Ensure other required fields for old users
                if (!user.usageTracking) {
                    user.usageTracking = {
                        currentMonth: now.getMonth(),
                        currentYear: now.getFullYear(),
                        monthlyUPCScans: 0,
                        monthlyReceiptScans: 0,
                        totalInventoryItems: 0,
                        totalPersonalRecipes: 0,
                        totalSavedRecipes: 0,
                        totalPublicRecipes: 0,
                        totalRecipeCollections: 0,
                        lastUpdated: now
                    };
                }

                await user.save();

                const userResult = {
                    email: user.email,
                    name: user.name,
                    previousTier,
                    newTier: tier,
                    isUpgrade,
                    wasMigrated
                };

                results.successful.push(userResult);

                // Send individual email if notifications are enabled
                if (sendNotifications) {
                    try {
                        const emailData = {
                            userName: user.name,
                            userEmail: user.email,
                            newTier: tier,
                            previousTier: previousTier,
                            endDate: endDate,
                            upgradeReason: reason,
                            isUpgrade: isUpgrade
                        };

                        const emailResult = await sendSubscriptionUpgradeEmail(emailData);
                        results.emailResults.push({
                            email: user.email,
                            success: true,
                            messageId: emailResult.messageId
                        });

                    } catch (emailError) {
                        console.error(`❌ Failed to send email to ${user.email}:`, emailError);
                        results.emailResults.push({
                            email: user.email,
                            success: false,
                            error: emailError.message
                        });
                    }
                }

            } catch (userError) {
                console.error(`❌ Failed to upgrade user ${user.email}:`, userError);
                results.failed.push({
                    email: user.email,
                    error: userError.message
                });
            }
        }

        // Find emails that weren't found
        const foundEmails = users.map(u => u.email.toLowerCase());
        const notFoundEmails = userEmails.filter(email =>
            !foundEmails.includes(email.toLowerCase())
        );

        results.notFound = notFoundEmails.map(email => ({ email }));

        console.log('✅ Bulk upgrade completed:', {
            successful: results.successful.length,
            failed: results.failed.length,
            notFound: results.notFound.length,
            migrated: results.migrated.length,
            emailsSent: results.emailResults.filter(r => r.success).length,
            emailsFailed: results.emailResults.filter(r => !r.success).length
        });

        return NextResponse.json({
            success: true,
            message: `Bulk upgrade completed. ${results.successful.length} users upgraded successfully.`,
            results,
            summary: {
                total: userEmails.length,
                successful: results.successful.length,
                failed: results.failed.length,
                notFound: results.notFound.length,
                migrated: results.migrated.length,
                emailsSent: sendNotifications ? results.emailResults.filter(r => r.success).length : 0,
                emailsFailed: sendNotifications ? results.emailResults.filter(r => !r.success).length : 0
            }
        });

    } catch (error) {
        console.error('❌ Bulk upgrade API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}