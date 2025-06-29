// file: /src/app/api/subscription/status/route.js v5 - FIXED admin detection

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User, UserInventory, Recipe, RecipeCollection } from '@/lib/models';

export async function GET(request) {
    try {
        console.log('Subscription status API called');

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return Response.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        console.log('User ID:', session.user.id);

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
        console.log('🔍 === USER DEBUG INFO ===');
        console.log('📧 User email:', user.email);
        console.log('👤 User isAdmin field:', user.isAdmin);
        console.log('📊 User subscription:', user.subscription);
        console.log('🎯 Session user info:', {
            id: session.user.id,
            email: session.user.email,
            subscriptionTier: session.user.subscriptionTier,
            isAdmin: session.user.isAdmin
        });
        console.log('🔍 === END USER DEBUG ===');

        // FIXED: Admin detection logic
        let isUserAdmin = user.isAdmin === true;
        console.log('🔍 Initial isUserAdmin from database:', isUserAdmin);

        // Double-check with email if isAdmin field is not set correctly
        if (!isUserAdmin) {
            const adminEmails = [
                'e.g.mckeown@gmail.com',              // Your email
                'admin@docbearscomfortkitchen.com',
                // Add more admin emails as needed
            ];

            console.log('🔍 Checking email against admin list:', user.email.toLowerCase());
            console.log('🔍 Admin emails:', adminEmails);

            if (adminEmails.includes(user.email.toLowerCase())) {
                console.log('🔧 ✅ User email matches admin list, setting admin status:', user.email);
                isUserAdmin = true;

                // Update the user record to have correct admin status
                user.isAdmin = true;
                if (!user.subscription) {
                    user.subscription = {};
                }
                user.subscription.tier = 'admin';
                user.subscription.status = 'active';

                try {
                    await user.save();
                    console.log('✅ User admin status updated in database');

                    // **VERIFY THE SAVE WORKED:**
                    const verifyUser = await User.findById(session.user.id).select('+isAdmin');
                    console.log('🔍 Verification after save - isAdmin:', verifyUser.isAdmin);
                    console.log('🔍 Verification after save - subscription:', verifyUser.subscription);
                } catch (saveError) {
                    console.error('❌ Error saving admin status:', saveError);
                }
            } else {
                console.log('❌ Email does not match admin list');
            }
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

        // FIXED: Override subscription for admin users - set BOTH tier and isAdmin correctly
        if (isUserAdmin) {
            console.log('🔧 Overriding subscription for admin user');
            subscription = {
                ...subscription,
                tier: 'admin',
                status: 'active',
                startDate: subscription.startDate || user.createdAt,
                endDate: null, // Never expires
                billingCycle: null // No billing for admin
            };
        }

        // Calculate trial status more safely
        let isTrialActive = false;
        let daysUntilTrialEnd = null;

        // FIXED: Admin users don't have trials
        if (!isUserAdmin && subscription.status === 'trial' && subscription.trialEndDate) {
            try {
                const trialEndDate = new Date(subscription.trialEndDate);
                const now = new Date();
                isTrialActive = now < trialEndDate;
                daysUntilTrialEnd = isTrialActive
                    ? Math.max(0, Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24)))
                    : 0;
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

            // FIXED: Admin status - make sure this is set correctly
            isAdmin: isUserAdmin,

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
            isActive: subscription.status === 'active' ||
                subscription.status === 'trial' ||
                subscription.tier === 'free' ||
                subscription.tier === 'admin' || // Admin is always active
                !subscription.status, // Default to active for users without subscription data
            isTrialActive: isTrialActive && !isUserAdmin, // Admin users don't need trials
            daysUntilTrialEnd: isUserAdmin ? null : daysUntilTrialEnd, // Admin users don't have trial limits

            // Additional metadata
            lastUpdated: now.toISOString()
        };

        console.log('✅ Subscription data prepared successfully:', {
            tier: subscriptionData.tier,
            status: subscriptionData.status,
            isActive: subscriptionData.isActive,
            isAdmin: subscriptionData.isAdmin,
            inventoryItems: subscriptionData.usage.inventoryItems,
            savedRecipes: subscriptionData.usage.savedRecipes,
            collections: subscriptionData.usage.recipeCollections
        });

        console.log('🔍 === FINAL RESPONSE DEBUG ===');
        console.log('📊 Returning subscription data:', {
            tier: subscriptionData.tier,
            isAdmin: subscriptionData.isAdmin,
            status: subscriptionData.status
        });
        console.log('🔍 === END RESPONSE DEBUG ===');

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