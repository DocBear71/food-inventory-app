// file: /src/app/api/admin/users/[id]/upgrade/route.js
// UPDATED - Admin User Upgrade API with Email Notifications

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { sendSubscriptionUpgradeEmail } from '@/lib/email';

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
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

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

        // Update user subscription
        user.subscription = {
            ...user.subscription,
            ...subscriptionUpdate,
            // Keep trial history
            trialStartDate: user.subscription?.trialStartDate,
            trialEndDate: user.subscription?.trialEndDate,
            hasUsedFreeTrial: user.subscription?.hasUsedFreeTrial || false,
            // Add audit trail
            adminUpgradeHistory: [
                ...(user.subscription?.adminUpgradeHistory || []),
                previousSubscription
            ].slice(-10) // Keep last 10 changes
        };

        await user.save();

        console.log('✅ User subscription updated successfully:', {
            userId,
            userEmail: user.email,
            newTier: tier,
            previousTier: previousTier,
            endDate: endDate || 'none',
            isUpgrade
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
            isUpgrade: isUpgrade
        });

    } catch (error) {
        console.error('❌ Admin user upgrade API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Bulk upgrade endpoint for Google Play testers - UPDATED with email notifications
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
            emailResults: []
        };

        // Process each user
        for (const user of users) {
            try {
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

                await user.save();

                const userResult = {
                    email: user.email,
                    name: user.name,
                    previousTier,
                    newTier: tier,
                    isUpgrade
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