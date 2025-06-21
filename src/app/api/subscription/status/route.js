// file: /src/app/api/subscription/status/route.js v2 - Fixed error handling and data validation

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User, UserInventory, Recipe } from '@/lib/models';

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

        const user = await User.findById(session.user.id);

        if (!user) {
            console.log('User not found in database');
            return Response.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        console.log('User found, fetching usage data...');

        // Get current usage counts with better error handling
        let currentInventoryCount = 0;
        let personalRecipes = 0;

        try {
            const [inventory, recipeCount] = await Promise.all([
                UserInventory.findOne({ userId: session.user.id }).catch(err => {
                    console.warn('Error fetching inventory:', err);
                    return null;
                }),
                Recipe.countDocuments({ createdBy: session.user.id }).catch(err => {
                    console.warn('Error counting recipes:', err);
                    return 0;
                })
            ]);

            currentInventoryCount = inventory?.items?.length || 0;
            personalRecipes = recipeCount || 0;

            console.log('Usage counts - Inventory:', currentInventoryCount, 'Recipes:', personalRecipes);
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
                totalSavedRecipes: 0,
                totalPublicRecipes: 0,
                totalRecipeCollections: 0,
                lastUpdated: now
            };
        }

        // Reset monthly counters if it's a new month
        if (user.usageTracking.currentMonth !== currentMonth ||
            user.usageTracking.currentYear !== currentYear) {
            console.log('Resetting monthly counters for new month');
            user.usageTracking.currentMonth = currentMonth;
            user.usageTracking.currentYear = currentYear;
            user.usageTracking.monthlyUPCScans = 0;
            user.usageTracking.monthlyReceiptScans = 0;
            user.usageTracking.monthlyEmailShares = 0;
            user.usageTracking.monthlyEmailNotifications = 0;
        }

        // Update current counts
        user.usageTracking.totalInventoryItems = currentInventoryCount;
        user.usageTracking.totalPersonalRecipes = personalRecipes;
        user.usageTracking.lastUpdated = now;

        // Save user with error handling
        try {
            await user.save();
            console.log('User usage tracking updated successfully');
        } catch (saveError) {
            console.error('Error saving user usage tracking:', saveError);
            // Continue without failing the request
        }

        // Initialize subscription data with safe defaults
        const subscription = user.subscription || {};

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

        // Prepare subscription data with comprehensive fallbacks
        const subscriptionData = {
            // Subscription info
            tier: subscription.tier || 'free',
            status: subscription.status || 'free',
            billingCycle: subscription.billingCycle || null,
            startDate: subscription.startDate || null,
            endDate: subscription.endDate || null,
            trialStartDate: subscription.trialStartDate || null,
            trialEndDate: subscription.trialEndDate || null,

            // Usage counts
            usage: {
                inventoryItems: currentInventoryCount,
                personalRecipes: personalRecipes,
                monthlyUPCScans: user.usageTracking.monthlyUPCScans || 0,
                monthlyReceiptScans: user.usageTracking.monthlyReceiptScans || 0,
                monthlyEmailShares: user.usageTracking.monthlyEmailShares || 0,
                monthlyEmailNotifications: user.usageTracking.monthlyEmailNotifications || 0,
                savedRecipes: user.usageTracking.totalSavedRecipes || 0,
                publicRecipes: user.usageTracking.totalPublicRecipes || 0,
                recipeCollections: user.usageTracking.totalRecipeCollections || 0
            },

            // Status flags
            isActive: subscription.status === 'active' ||
                subscription.status === 'trial' ||
                subscription.tier === 'free' ||
                !subscription.status, // Default to active for users without subscription data
            isTrialActive: isTrialActive,
            daysUntilTrialEnd: daysUntilTrialEnd,

            // Additional metadata
            lastUpdated: now.toISOString()
        };

        console.log('Subscription data prepared successfully:', {
            tier: subscriptionData.tier,
            status: subscriptionData.status,
            isActive: subscriptionData.isActive,
            inventoryItems: subscriptionData.usage.inventoryItems
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