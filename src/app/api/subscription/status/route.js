// file: /src/app/api/subscription/status/route.js v1 - Get user subscription status and usage counts

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User, UserInventory, Recipe } from '@/lib/models';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return Response.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();
        const user = await User.findById(session.user.id);

        if (!user) {
            return Response.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get current usage counts
        const [inventory, personalRecipes] = await Promise.all([
            UserInventory.findOne({ userId: session.user.id }),
            Recipe.countDocuments({ createdBy: session.user.id })
        ]);

        const currentInventoryCount = inventory?.items?.length || 0;

        // Reset monthly counts if needed (you might want to do this in a cron job instead)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Initialize usage tracking if not present
        if (!user.usageTracking) {
            user.usageTracking = {
                currentMonth: currentMonth,
                currentYear: currentYear,
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                totalInventoryItems: currentInventoryCount,
                totalPersonalRecipes: personalRecipes,
                totalSavedRecipes: 0, // You'll need to implement saved recipes tracking
                totalPublicRecipes: 0, // Count of user's public recipes
                totalRecipeCollections: 0 // You'll need to implement collections counting
            };
        }

        // Reset monthly counters if it's a new month
        if (user.usageTracking.currentMonth !== currentMonth ||
            user.usageTracking.currentYear !== currentYear) {
            user.usageTracking.currentMonth = currentMonth;
            user.usageTracking.currentYear = currentYear;
            user.usageTracking.monthlyUPCScans = 0;
            user.usageTracking.monthlyReceiptScans = 0;
        }

        // Update current counts
        user.usageTracking.totalInventoryItems = currentInventoryCount;
        user.usageTracking.totalPersonalRecipes = personalRecipes;

        await user.save();

        // Prepare subscription data
        const subscriptionData = {
            // Subscription info
            tier: user.subscription?.tier || 'free',
            status: user.subscription?.status || 'free',
            billingCycle: user.subscription?.billingCycle,
            startDate: user.subscription?.startDate,
            endDate: user.subscription?.endDate,
            trialStartDate: user.subscription?.trialStartDate,
            trialEndDate: user.subscription?.trialEndDate,

            // Usage counts
            usage: {
                inventoryItems: currentInventoryCount,
                personalRecipes: personalRecipes,
                monthlyUPCScans: user.usageTracking.monthlyUPCScans,
                monthlyReceiptScans: user.usageTracking.monthlyReceiptScans,
                savedRecipes: user.usageTracking.totalSavedRecipes,
                publicRecipes: user.usageTracking.totalPublicRecipes,
                recipeCollections: user.usageTracking.totalRecipeCollections
            },

            // Status flags
            isActive: user.subscription?.status === 'active' ||
                user.subscription?.status === 'trial' ||
                user.subscription?.tier === 'free',
            isTrialActive: user.subscription?.status === 'trial' &&
                user.subscription?.trialEndDate &&
                new Date() < new Date(user.subscription.trialEndDate),
            daysUntilTrialEnd: user.subscription?.trialEndDate
                ? Math.max(0, Math.ceil((new Date(user.subscription.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24)))
                : null
        };

        return Response.json(subscriptionData);

    } catch (error) {
        console.error('Subscription status error:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}