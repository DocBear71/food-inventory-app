// file: /src/app/api/admin/users/[id]/upgrade/route.js v3 - COMPLETE FIX: Handle old user schema migration
// UPDATED - Admin User Upgrade API with Email Notifications and Old User Schema Support

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

// Helper function to safely migrate old user schema
function migrateUserSubscriptionSchema(user) {
    const now = new Date();

    console.log(`🔧 Checking user schema for: ${user.email}`);

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
        return true; // Indicate migration occurred
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

    let fieldsAdded = false;

    // Add any missing fields with defaults
    for (const [field, defaultValue] of Object.entries(requiredFields)) {
        if (user.subscription[field] === undefined) {
            console.log(`🔧 Adding missing field ${field} to user ${user.email}`);
            user.subscription[field] = defaultValue;
            fieldsAdded = true;
        }
    }

    // Ensure other required user fields exist for old users
    if (!user.usageTracking) {
        console.log(`🔧 Adding usageTracking to user ${user.email}`);
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
        fieldsAdded = true;
    }

    if (!user.accountStatus) {
        console.log(`🔧 Adding accountStatus to user ${user.email}`);
        user.accountStatus = {
            status: 'active',
            suspensionHistory: []
        };
        fieldsAdded = true;
    }

    if (!user.inventoryPreferences) {
        console.log(`🔧 Adding inventoryPreferences to user ${user.email}`);
        user.inventoryPreferences = {
            defaultSortBy: 'expiration',
            defaultFilterStatus: 'all',
            defaultFilterLocation: 'all',
            showQuickFilters: true,
            itemsPerPage: 'all',
            compactView: false
        };
        fieldsAdded = true;
    }

    if (!user.currencyPreferences) {
        console.log(`🔧 Adding currencyPreferences to user ${user.email}`);
        user.currencyPreferences = {
            currency: 'USD',
            currencySymbol: '$',
            currencyPosition: 'before',
            showCurrencyCode: false,
            decimalPlaces: 2
        };
        fieldsAdded = true;
    }

    if (!user.priceTrackingPreferences) {
        console.log(`🔧 Adding priceTrackingPreferences to user ${user.email}`);
        user.priceTrackingPreferences = {
            defaultStore: null,
            priceAlertFrequency: 'daily',
            trackPricesAutomatically: true,
            showPriceHistory: true,
            preferredCurrency: 'USD',
            roundPricesToCents: true
        };
        fieldsAdded = true;
    }

    // FIXED: Add missing mealPlanningPreferences with CORRECT schema values
    if (!user.mealPlanningPreferences) {
        console.log(`🔧 Adding mealPlanningPreferences to user ${user.email}`);
        user.mealPlanningPreferences = {
            defaultMealTypes: ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'], // From schema default
            planningHorizon: 'week',
            shoppingDay: 'sunday',
            mealPrepDays: ['sunday'],
            dietaryRestrictions: [],
            avoidIngredients: [],
            preferredCuisines: [],
            cookingTimePreference: 'any',
            weekStartDay: 'monday'
        };
        fieldsAdded = true;
    } else if (!user.mealPlanningPreferences.defaultMealTypes || !Array.isArray(user.mealPlanningPreferences.defaultMealTypes)) {
        // Fix existing but invalid defaultMealTypes
        console.log(`🔧 Fixing defaultMealTypes for user ${user.email}`);
        user.mealPlanningPreferences.defaultMealTypes = ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'];
        fieldsAdded = true;
    }

    // FIXED: Add missing nutritionGoals (separate from nutritionPreferences)
    if (!user.nutritionGoals) {
        console.log(`🔧 Adding nutritionGoals to user ${user.email}`);
        user.nutritionGoals = {
            dailyCalories: 2000,
            protein: 150, // grams
            fat: 65, // grams
            carbs: 250, // grams
            fiber: 25, // grams
            sodium: 2300 // mg
        };
        fieldsAdded = true;
    }

    // FIXED: Add missing profile
    if (!user.profile) {
        console.log(`🔧 Adding profile to user ${user.email}`);
        user.profile = {
            bio: '',
            cookingLevel: 'beginner',
            favoritesCuisines: [],
            reviewCount: 0,
            averageRatingGiven: 0
        };
        fieldsAdded = true;
    }

    // FIXED: Add missing customCategories and categoryPreferences
    if (!user.customCategories) {
        console.log(`🔧 Adding customCategories to user ${user.email}`);
        user.customCategories = {};
        fieldsAdded = true;
    }

    if (!user.categoryPreferences) {
        console.log(`🔧 Adding categoryPreferences to user ${user.email}`);
        user.categoryPreferences = {};
        fieldsAdded = true;
    }

    if (!user.storeCategories) {
        console.log(`🔧 Adding storeCategories to user ${user.email}`);
        user.storeCategories = {};
        fieldsAdded = true;
    }

    // FIXED: Add missing emailPreferences
    if (!user.emailPreferences) {
        console.log(`🔧 Adding emailPreferences to user ${user.email}`);
        user.emailPreferences = {
            expirationAlerts: true,
            weeklyDigest: false,
            recipeRecommendations: false,
            mealPlanReminders: false,
            shoppingListUpdates: false,
            promotionalEmails: false,
            frequency: 'daily'
        };
        fieldsAdded = true;
    }

    return fieldsAdded;
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

        // FIXED: Handle nested upgradeData structure from frontend
        let requestData;
        if (body.upgradeData) {
            // Frontend sends nested structure: {upgradeData: {tier, endDate, reason, sendNotification}}
            requestData = body.upgradeData;
        } else {
            // Direct structure: {tier, endDate, reason, sendNotification}
            requestData = body;
        }

        const {
            tier,
            endDate,
            reason,
            sendNotification = true,
            billingCycle = null
        } = requestData;

        console.log(`🔧 Admin upgrading user ${userId}:`, {
            tier,
            endDate,
            reason,
            sendNotification,
            adminUser: session.user.email
        });

        // Validate inputs - FIXED: Check if tier exists first
        if (!tier || typeof tier !== 'string') {
            return NextResponse.json(
                { error: 'Tier is required and must be a string' },
                { status: 400 }
            );
        }

        const tierLower = tier.toLowerCase();
        if (!['free', 'gold', 'platinum'].includes(tierLower)) {
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

        console.log(`📋 Found user: ${user.email}, checking schema...`);

        // FIXED: Migrate old user schema before processing
        const migrationPerformed = migrateUserSubscriptionSchema(user);

        if (migrationPerformed) {
            console.log(`✅ Schema migration completed for user: ${user.email}`);
        } else {
            console.log(`✅ User schema already up to date: ${user.email}`);
        }

        // Store previous subscription for comparison and audit
        const previousTier = user.subscription?.tier || 'free';
        const isUpgrade = (tierLower === 'platinum' && previousTier !== 'platinum') ||
            (tierLower === 'gold' && previousTier === 'free');

        // Prepare subscription update - use normalized tier
        const now = new Date();
        const subscriptionUpdate = {
            tier: tierLower, // Use lowercase tier
            status: 'active',
            billingCycle,
            startDate: now,
            endDate: endDate ? new Date(endDate) : null,
            lastUpdated: now
        };

        // If downgrading to free, ensure proper cleanup
        if (tierLower === 'free') {
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

        // Save with error handling
        try {
            await user.save();
            console.log('💾 User saved successfully after upgrade');
        } catch (saveError) {
            console.error('❌ Error saving user after migration:', saveError);

            // ENHANCED: More detailed validation error handling
            if (saveError.name === 'ValidationError') {
                console.error('Validation errors details:', saveError.errors);

                // Try to fix meal type validation by using correct schema values
                if (saveError.errors['mealPlanningPreferences.defaultMealTypes.0']) {
                    console.log('🔧 Attempting to fix meal types with correct schema values...');
                    user.mealPlanningPreferences.defaultMealTypes = ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'];

                    try {
                        await user.save();
                        console.log('✅ Fixed meal types with correct schema values');
                    } catch (secondSaveError) {
                        console.error('❌ Still failed with correct values, trying empty array:', secondSaveError);

                        // Try empty array
                        user.mealPlanningPreferences.defaultMealTypes = [];

                        try {
                            await user.save();
                            console.log('✅ Fixed meal types with empty array');
                        } catch (thirdSaveError) {
                            console.error('❌ Failed with empty array, removing mealPlanningPreferences entirely...');

                            // Last resort: remove the entire mealPlanningPreferences
                            user.mealPlanningPreferences = undefined;

                            try {
                                await user.save();
                                console.log('✅ Saved without mealPlanningPreferences');
                            } catch (fourthSaveError) {
                                console.error('❌ Failed even without mealPlanningPreferences:', fourthSaveError);
                                return NextResponse.json(
                                    {
                                        error: 'User schema validation failed - unable to migrate old user data',
                                        details: 'Multiple migration attempts failed',
                                        originalError: saveError.message,
                                        migrationPerformed: migrationPerformed
                                    },
                                    { status: 400 }
                                );
                            }
                        }
                    }
                } else {
                    // Other validation errors
                    return NextResponse.json(
                        {
                            error: 'User data validation failed after migration',
                            details: Object.keys(saveError.errors).join(', '),
                            validationErrors: Object.fromEntries(
                                Object.entries(saveError.errors).map(([key, err]) => [key, err.message])
                            ),
                            migrationPerformed: migrationPerformed
                        },
                        { status: 400 }
                    );
                }
            } else {
                return NextResponse.json(
                    { error: 'Failed to save user data after migration. Please try again.' },
                    { status: 500 }
                );
            }
        }

        console.log('✅ User subscription updated successfully:', {
            userId,
            userEmail: user.email,
            newTier: tier,
            previousTier: previousTier,
            endDate: endDate || 'none',
            isUpgrade,
            migrationPerformed
        });

        // Send email notification if requested
        let emailResult = null;
        if (sendNotification) {
            try {
                console.log('📧 Sending subscription upgrade notification email...');

                // Try to import and use the email function
                try {
                    const { sendSubscriptionUpgradeEmail } = await import('@/lib/email');

                    const emailData = {
                        userName: user.name,
                        userEmail: user.email,
                        newTier: tierLower, // Use normalized tier
                        previousTier: previousTier,
                        endDate: endDate,
                        upgradeReason: reason,
                        isUpgrade: isUpgrade
                    };

                    emailResult = await sendSubscriptionUpgradeEmail(emailData);
                    console.log('✅ Subscription upgrade email sent successfully:', emailResult.messageId);
                } catch (emailImportError) {
                    console.log('📧 Email function not available, skipping notification:', emailImportError.message);
                    emailResult = {
                        success: false,
                        error: 'Email function not available',
                        skipped: true
                    };
                }

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
            message: `User subscription updated to ${tierLower} successfully`,
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
            migrationPerformed: migrationPerformed,
            userEmail: user.email // Include for debugging
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

        // Check for connection errors
        if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
            return NextResponse.json(
                { error: 'Database connection error. Please try again.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            {
                error: 'Internal server error',
                errorType: error.name || 'Unknown',
                errorMessage: error.message
            },
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
                console.log(`🔧 Processing user: ${user.email}`);

                // FIXED: Migrate old user schema
                const wasMigrated = migrateUserSubscriptionSchema(user);

                if (wasMigrated) {
                    results.migrated.push(user.email);
                    console.log(`✅ Schema migrated for: ${user.email}`);
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

                await user.save();
                console.log(`✅ Upgraded user: ${user.email} to ${tier}`);

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
                        const { sendSubscriptionUpgradeEmail } = await import('@/lib/email');

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
                    error: userError.message,
                    errorType: userError.name
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
            {
                error: 'Internal server error',
                errorType: error.name || 'Unknown',
                errorMessage: error.message
            },
            { status: 500 }
        );
    }
}