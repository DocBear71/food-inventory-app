// file: /src/app/api/subscription/status/route.js v4 - Added admin support

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

        // NEW: Include isAdmin field in the query
        const user = await User.findById(session.user.id).select('+isAdmin').lean();

        if (!user) {
            console.log('User not found in database');
            return Response.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        let isUserAdmin = user.isAdmin;
        if (isUserAdmin === undefined) {
            // Check if this user should be admin based on email (migration logic)
            const adminEmails = [
                'your-email@gmail.com',              // Replace with your actual email
                'admin@docbearscomfortkitchen.com',
                // Add more admin emails as needed
            ];

            isUserAdmin = adminEmails.includes(user.email.toLowerCase());

            if (isUserAdmin) {
                console.log('🔧 User should be admin, will be updated on next save:', user.email);
            }
        }

        if (isUserAdmin) {
            console.log('Admin user detected:', user.email);
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

            // Mark for saving since we changed monthly data
            try {
                await user.save();
                console.log('Monthly usage counters reset and saved');
            } catch (saveError) {
                console.error('Error saving monthly reset:', saveError);
            }
        }

        // Update current counts
        user.usageTracking.totalInventoryItems = currentInventoryCount;
        user.usageTracking.totalPersonalRecipes = personalRecipes;
        user.usageTracking.totalSavedRecipes = savedRecipeCount;
        user.usageTracking.totalRecipeCollections = collectionCount;
        user.usageTracking.lastUpdated = now;

        // Save user with error handling and validation fix
        try {
            // FIXED: Ensure required legal fields exist before saving
            if (!user.legalAcceptance?.acceptanceDate) {
                console.log('User missing required legal acceptance date, setting defaults');

                if (!user.legalAcceptance) {
                    user.legalAcceptance = {};
                }

                // Set required fields with defaults if missing
                if (user.legalAcceptance.termsAccepted === undefined) {
                    user.legalAcceptance.termsAccepted = false;
                }
                if (user.legalAcceptance.privacyAccepted === undefined) {
                    user.legalAcceptance.privacyAccepted = false;
                }
                if (!user.legalAcceptance.acceptanceDate) {
                    user.legalAcceptance.acceptanceDate = user.createdAt || new Date();
                }

                // Set version defaults if missing
                if (!user.legalVersion) {
                    user.legalVersion = {
                        termsVersion: '1.0',
                        privacyVersion: '1.0'
                    };
                }
            }

            await user.save();
            console.log('User usage tracking updated successfully');
        } catch (saveError) {
            console.error('Error saving user usage tracking:', saveError);

            // If it's a validation error, log the specific validation issues
            if (saveError.name === 'ValidationError') {
                console.error('Validation errors:', saveError.errors);

                // Try to fix validation errors and save again
                try {
                    // Ensure all required fields have values
                    if (!user.legalAcceptance) {
                        user.legalAcceptance = {
                            termsAccepted: false,
                            privacyAccepted: false,
                            acceptanceDate: user.createdAt || new Date()
                        };
                    }
                    if (!user.legalVersion) {
                        user.legalVersion = {
                            termsVersion: '1.0',
                            privacyVersion: '1.0'
                        };
                    }

                    await user.save();
                    console.log('User saved after fixing validation errors');
                } catch (retryError) {
                    console.error('Failed to save user even after fixing validation:', retryError);
                    // Continue without failing the request - usage tracking update is not critical
                }
            }
            // Continue without failing the request - usage tracking is not critical for the API response
        }

        // Initialize subscription data with safe defaults
        let subscription = user.subscription || {};

        // NEW: Override subscription for admin users
        // UPDATED: Override subscription for admin users
        if (isUserAdmin) {
            console.log('Overriding subscription for admin user');
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

        if (subscription.status === 'trial' && subscription.trialEndDate) {
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

            // NEW: Admin status
            isAdmin: isUserAdmin || false,

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
                subscription.tier === 'admin' || // NEW: Admin is always active
                !subscription.status, // Default to active for users without subscription data
            isTrialActive: isTrialActive && !user.isAdmin, // NEW: Admin users don't need trials
            daysUntilTrialEnd: user.isAdmin ? null : daysUntilTrialEnd, // NEW: Admin users don't have trial limits

            // Additional metadata
            lastUpdated: now.toISOString()
        };

        console.log('Subscription data prepared successfully:', {
            tier: subscriptionData.tier,
            status: subscriptionData.status,
            isActive: subscriptionData.isActive,
            isAdmin: subscriptionData.isAdmin, // NEW
            inventoryItems: subscriptionData.usage.inventoryItems,
            savedRecipes: subscriptionData.usage.savedRecipes,
            collections: subscriptionData.usage.recipeCollections
        });

        return Response.json(subscriptionData);

    } catch (error) {
        console.error('Subscription status error:', error);
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