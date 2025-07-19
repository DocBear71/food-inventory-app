import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        await connectDB();
        const user = await User.findById(session.user.id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check and expire trial first
        const trialExpired = user.checkAndExpireTrial();

        // Then check and reset monthly usage
        const usageReset = user.checkAndResetMonthlyUsage();

        // Save if anything changed
        if (trialExpired || usageReset) {
            await user.save();

            if (trialExpired) {
                console.log(`⏰ Trial expired and user downgraded via API: ${user.email}`);
            }
            if (usageReset) {
                console.log(`🔄 Monthly usage reset applied for ${user.email} via API`);
            }
        }

        // Return fresh usage data
        const usageTracking = user.usageTracking || {};
        const usage = {
            monthlyReceiptScans: usageTracking.monthlyReceiptScans || 0,
            monthlyUPCScans: usageTracking.monthlyUPCScans || 0,
            totalInventoryItems: usageTracking.totalInventoryItems || 0,
            totalPersonalRecipes: usageTracking.totalPersonalRecipes || 0,
            totalRecipeCollections: usageTracking.totalRecipeCollections || 0,
            totalSavedRecipes: usageTracking.totalSavedRecipes || user.savedRecipes?.length || 0,
            // Backwards compatibility
            inventoryItems: usageTracking.totalInventoryItems || 0,
            recipeCollections: usageTracking.totalRecipeCollections || 0,
            savedRecipes: usageTracking.totalSavedRecipes || user.savedRecipes?.length || 0
        };

        return NextResponse.json({
            success: true,
            trialExpired,
            usageReset,
            usage,
            subscription: user.subscription,
            effectiveTier: user.getEffectiveTier?.() || 'free',
            currentMonth: usageTracking.currentMonth,
            currentYear: usageTracking.currentYear,
            message: trialExpired ? 'Trial expired - downgraded to free' :
                usageReset ? 'Monthly usage was reset' : 'No changes needed'
        });

    } catch (error) {
        console.error('Error checking monthly reset/trial expiration:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}