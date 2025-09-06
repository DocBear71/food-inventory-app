// file: /src/app/api/subscription/status/route.js v6 - Added RevenueCat support

import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User, UserInventory, Recipe, RecipeCollection } from '@/lib/models';

export async function GET(request) {
    try {
        console.log('🔍 === SUBSCRIPTION API DEBUG START ===');
        console.log('Subscription status API called');

        const session = await auth();

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return Response.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        console.log('📧 Session user info:', {
            id: session.user.id,
            email: session.user.email,
            subscriptionTier: session.user.subscriptionTier,
            effectiveTier: session.user.effectiveTier,
            isAdmin: session.user.isAdmin
        });

        await connectDB();
        console.log('Database connected');

        // FIXED: Include isAdmin field in the query and get the fresh user data
        const user = await User.findById(session.user.id).select('+isAdmin');

        if (!user) {
            console.log('User not found in database');
            return Response.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // **ADD THESE DEBUG LOGS:**
        console.log('🔍 === USER DATABASE INFO ===');
        console.log('📧 Database user email:', user.email);
        console.log('👤 Database user isAdmin field:', user.isAdmin);
        console.log('📊 Database user subscription:', user.subscription);
        console.log('🆔 User ID match check:', session.user.id === user._id.toString());
        console.log('🔍 === END USER DATABASE INFO ===');

        // FIXED: Admin detection logic
        let isUserAdmin = user.isAdmin === true;
        console.log('🔍 Initial isUserAdmin from database:', isUserAdmin);

// CRITICAL: Check if user has an active paid subscription FIRST
        // CRITICAL: Check if user has an active paid subscription FIRST
        const hasPaidSubscription = user.subscription &&
            user.subscription.tier !== 'free' &&
            user.subscription.status === 'active' &&
            (user.subscription.platform === 'revenuecat' ||
                user.subscription.platform === 'stripe' ||
                // Handle subscriptions without platform field (legacy RevenueCat)
                (!user.subscription.platform && user.subscription.hasUsedFreeTrial === true));

// FIX: If we detect a paid subscription without platform, set it
        if (hasPaidSubscription && !user.subscription.platform && user.subscription.hasUsedFreeTrial) {
            console.log('🔧 Setting missing platform field for paid subscription');
            user.subscription.platform = 'revenuecat';
            await user.save();
        }

        console.log('💳 Paid subscription check:', {
            hasPaidSubscription,
            tier: user.subscription?.tier,
            status: user.subscription?.status,
            platform: user.subscription?.platform
        });

// Only override with admin if NO paid subscription exists
        if (!isUserAdmin && !hasPaidSubscription) {
            const adminEmails = [
                'e.g.mckeown@gmail.com',              // Your email
                'admin@docbearscomfortkitchen.com',
            ];

            console.log('🔍 Checking email against admin list (no paid subscription found)...');

            if (adminEmails.includes(user.email.toLowerCase())) {
                console.log('🔧 ✅ User email matches admin list, setting admin status');
                isUserAdmin = true;

                // Update the user record to have correct admin status
                user.isAdmin = true;
                if (!user.subscription) {
                    user.subscription = {};
                }
                // Only set admin subscription if no paid subscription exists
                if (!hasPaidSubscription) {
                    user.subscription.tier = 'admin';
                    user.subscription.status = 'active';
                }

                try {
                    await user.save();
                    console.log('✅ User admin status updated (but paid subscription preserved)');
                } catch (saveError) {
                    console.error('❌ Error saving admin status:', saveError);
                }
            }
        } else if (hasPaidSubscription) {
            console.log('💳 User has paid subscription - NOT overriding with admin status');
            // Keep isUserAdmin as false to show their paid subscription tier
            isUserAdmin = false;
        }

        console.log('🎯 Final isUserAdmin decision:', isUserAdmin);

        if (isUserAdmin) {
            console.log('✅ Admin user confirmed:', user.email);
        }

        console.log('User found, fetching usage data...');

        // Get current usage counts with better error handling
        let currentInventoryCount = 0;
        let personalRecipes = 0;
        let savedRecipeCount = 0;
        let collectionCount = 0;

        try {
            const [inventory, recipeCount, collections] = await Promise.all([
                UserInventory.findOne({ userId: session.user.id }).catch(err => {
                    console.warn('Error fetching inventory:', err);
                    return null;
                }),
                Recipe.countDocuments({ createdBy: session.user.id }).catch(err => {
                    console.warn('Error counting recipes:', err);
                    return 0;
                }),
                RecipeCollection.countDocuments({ userId: session.user.id }).catch(err => {
                    console.warn('Error counting collections:', err);
                    return 0;
                })
            ]);

            currentInventoryCount = inventory?.items?.length || 0;
            personalRecipes = recipeCount || 0;
            savedRecipeCount = user.savedRecipes?.length || 0;
            collectionCount = collections || 0;

            console.log('Usage counts - Inventory:', currentInventoryCount, 'Recipes:', personalRecipes, 'Saved:', savedRecipeCount, 'Collections:', collectionCount);
        } catch (usageError) {
            console.error('Error fetching usage data:', usageError);
            // Continue with default values rather than failing
        }

        // Reset monthly counts if needed
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Initialize usage tracking if not present with better defaults
        if (!user.usageTracking) {
            console.log('Initializing usage tracking for user');
            user.usageTracking = {
                currentMonth: currentMonth,
                currentYear: currentYear,
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                monthlyEmailShares: 0,
                monthlyEmailNotifications: 0,
                totalInventoryItems: currentInventoryCount,
                totalPersonalRecipes: personalRecipes,
                totalSavedRecipes: savedRecipeCount,
                totalPublicRecipes: 0,
                totalRecipeCollections: collectionCount,
                lastUpdated: now
            };
        } else {
            // ENHANCED: Ensure all required fields exist
            if (user.usageTracking.monthlyUPCScans === undefined) {
                user.usageTracking.monthlyUPCScans = 0;
            }
            if (user.usageTracking.monthlyReceiptScans === undefined) {
                user.usageTracking.monthlyReceiptScans = 0;
            }
            if (user.usageTracking.monthlyEmailShares === undefined) {
                user.usageTracking.monthlyEmailShares = 0;
            }
            if (user.usageTracking.monthlyEmailNotifications === undefined) {
                user.usageTracking.monthlyEmailNotifications = 0;
            }
        }

        // Reset monthly counters if it's a new month
        if (user.usageTracking.currentMonth !== currentMonth ||
            user.usageTracking.currentYear !== currentYear) {
            console.log('Resetting monthly counters for new month/year');
            user.usageTracking.currentMonth = currentMonth;
            user.usageTracking.currentYear = currentYear;
            user.usageTracking.monthlyUPCScans = 0;
            user.usageTracking.monthlyReceiptScans = 0;
            user.usageTracking.monthlyEmailShares = 0;
            user.usageTracking.monthlyEmailNotifications = 0;
            user.usageTracking.lastUpdated = now;
        }

        // Update current counts
        user.usageTracking.totalInventoryItems = currentInventoryCount;
        user.usageTracking.totalPersonalRecipes = personalRecipes;
        user.usageTracking.totalSavedRecipes = savedRecipeCount;
        user.usageTracking.totalRecipeCollections = collectionCount;
        user.usageTracking.lastUpdated = now;

        // Initialize subscription data with safe defaults
        let subscription = user.subscription || {};

        // CRITICAL: Check for subscription expiration
        let isExpired = false;
        if (subscription.endDate && subscription.status !== 'cancelled') {
            const endDate = new Date(subscription.endDate);
            const now = new Date();
            isExpired = now > endDate;

            if (isExpired && subscription.status === 'active') {
                console.log('📅 Subscription has expired, updating status');
                subscription.status = 'expired';
                subscription.tier = 'free'; // Downgrade to free on expiration
            }
        }

        // FIXED: Override subscription for admin users - set BOTH tier and isAdmin correctly
        if (isUserAdmin && !hasPaidSubscription) {
            console.log('🔧 Overriding subscription for admin user (no paid subscription)');
            subscription = {
                ...subscription,
                tier: 'admin',
                status: 'active',
                startDate: subscription.startDate || user.createdAt,
                endDate: null, // Never expires
                billingCycle: null, // No billing for admin
                platform: 'admin' // Set admin platform
            };
        } else if (hasPaidSubscription) {
            console.log('💳 Preserving paid subscription data for user');
            // Don't override anything - keep the paid subscription as-is
        }

        // ADDED: Handle RevenueCat subscriptions specifically
        if (subscription.platform === 'revenuecat') {
            console.log('📱 Processing RevenueCat subscription:', {
                tier: subscription.tier,
                status: subscription.status,
                endDate: subscription.endDate,
                revenueCatCustomerId: subscription.revenueCatCustomerId
            });

            // For RevenueCat, ensure subscription data is properly formatted
            if (subscription.tier && subscription.tier !== 'free' && !isExpired) {
                // RevenueCat subscription is active and valid
                subscription.isActive = true;
            } else if (isExpired) {
                // Expired RevenueCat subscription
                subscription.tier = 'free';
                subscription.status = 'expired';
                subscription.isActive = false;
            }
        }

        // ADDED: Handle Stripe subscriptions specifically
        if (subscription.platform === 'stripe' || subscription.stripeSubscriptionId) {
            console.log('💳 Processing Stripe subscription');
            // Keep existing Stripe logic
            subscription.platform = subscription.platform || 'stripe';
        }

        // Calculate trial status more safely
        let isTrialActive = false;
        let daysUntilTrialEnd = null;
        let hasUsedFreeTrial = subscription.hasUsedFreeTrial || false;

        // FIXED: Admin users don't have trials
        if (!isUserAdmin && subscription.status === 'trial' && subscription.trialEndDate) {
            try {
                const trialEndDate = new Date(subscription.trialEndDate);
                const now = new Date();
                isTrialActive = now < trialEndDate;
                daysUntilTrialEnd = isTrialActive
                    ? Math.max(0, Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24)))
                    : 0;

                // If trial has ended, mark as expired
                if (!isTrialActive && subscription.status === 'trial') {
                    subscription.tier = 'free';
                    subscription.status = 'expired';
                    hasUsedFreeTrial = true;
                }
            } catch (dateError) {
                console.warn('Error calculating trial dates:', dateError);
                isTrialActive = false;
                daysUntilTrialEnd = null;
            }
        }

        // Save user with error handling and validation fix
        try {
            // FIXED: Ensure required legal fields exist before saving
            if (!user.legalAcceptance?.acceptanceDate) {
                if (!user.legalAcceptance) {
                    user.legalAcceptance = {};
                }
                if (user.legalAcceptance.termsAccepted === undefined) {
                    user.legalAcceptance.termsAccepted = false;
                }
                if (user.legalAcceptance.privacyAccepted === undefined) {
                    user.legalAcceptance.privacyAccepted = false;
                }
                if (!user.legalAcceptance.acceptanceDate) {
                    user.legalAcceptance.acceptanceDate = user.createdAt || new Date();
                }
                if (!user.legalVersion) {
                    user.legalVersion = {
                        termsVersion: '1.0',
                        privacyVersion: '1.0'
                    };
                }
            }

            await user.save();
            console.log('✅ User usage tracking updated successfully');
        } catch (saveError) {
            console.error('❌ Error saving user usage tracking:', saveError);
        }

        // FIXED: Return data structure that matches what useSubscription expects
        const subscriptionData = {
            // Subscription info (what the subscription-config functions expect)
            tier: subscription.tier || 'free',
            status: subscription.status || 'free',
            billingCycle: subscription.billingCycle || null,
            startDate: subscription.startDate || null,
            endDate: subscription.endDate || null,
            trialStartDate: subscription.trialStartDate || null,
            trialEndDate: subscription.trialEndDate || null,

            // CRITICAL: Add RevenueCat and platform info
            platform: subscription.platform || null,
            revenueCatCustomerId: subscription.revenueCatCustomerId || null,
            stripeSubscriptionId: subscription.stripeSubscriptionId || null,

            // FIXED: Admin status - make sure this is set correctly
            isAdmin: isUserAdmin,

            // ADDED: Trial flag handling
            hasUsedFreeTrial: hasUsedFreeTrial,

            // Usage counts (what useSubscription getCurrentUsageCount expects)
            usage: {
                inventoryItems: currentInventoryCount,
                personalRecipes: personalRecipes,
                monthlyUPCScans: user.usageTracking.monthlyUPCScans || 0,
                monthlyReceiptScans: user.usageTracking.monthlyReceiptScans || 0,
                monthlyEmailShares: user.usageTracking.monthlyEmailShares || 0,
                monthlyEmailNotifications: user.usageTracking.monthlyEmailNotifications || 0,
                savedRecipes: savedRecipeCount,
                publicRecipes: user.usageTracking.totalPublicRecipes || 0,
                recipeCollections: collectionCount,

                // Current month/year for debugging
                currentMonth: user.usageTracking.currentMonth,
                currentYear: user.usageTracking.currentYear,
                lastUpdated: user.usageTracking.lastUpdated
            },

            // Status flags
            isActive: (subscription.status === 'active' ||
                subscription.status === 'trial' ||
                subscription.tier === 'free' ||
                subscription.tier === 'admin') && !isExpired, // Admin is always active
            isTrialActive: isTrialActive && !isUserAdmin, // Admin users don't need trials
            daysUntilTrialEnd: isUserAdmin ? null : daysUntilTrialEnd, // Admin users don't have trial limits

            // ADDED: Expiration status
            isExpired: isExpired,

            // Additional metadata
            lastUpdated: now.toISOString()
        };

        console.log('✅ Subscription data prepared successfully:', {
            tier: subscriptionData.tier,
            status: subscriptionData.status,
            platform: subscriptionData.platform,
            isActive: subscriptionData.isActive,
            isAdmin: subscriptionData.isAdmin,
            isExpired: subscriptionData.isExpired,
            hasUsedFreeTrial: subscriptionData.hasUsedFreeTrial,
            inventoryItems: subscriptionData.usage.inventoryItems,
            savedRecipes: subscriptionData.usage.savedRecipes,
            collections: subscriptionData.usage.recipeCollections
        });

        console.log('🔍 === FINAL API RESPONSE DEBUG ===');
        console.log('📊 Returning subscription data:', {
            tier: subscriptionData.tier,
            isAdmin: subscriptionData.isAdmin,
            status: subscriptionData.status,
            platform: subscriptionData.platform,
            usage: {
                inventoryItems: subscriptionData.usage.inventoryItems
            }
        });
        console.log('🔍 === END API RESPONSE DEBUG ===');
        console.log('🔍 === SUBSCRIPTION API DEBUG END ===');

        return Response.json(subscriptionData);

    } catch (error) {
        console.error('❌ Subscription status error:', error);
        console.error('Error stack:', error.stack);

        // Return more detailed error information in development
        const isDevelopment = process.env.NODE_ENV === 'development';

        return Response.json(
            {
                error: 'Internal server error',
                ...(isDevelopment && {
                    details: error.message,
                    stack: error.stack
                })
            },
            { status: 500 }
        );
    }
}