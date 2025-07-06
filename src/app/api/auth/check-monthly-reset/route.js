import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        await connectDB();
        const user = await User.findById(session.user.id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check and reset monthly usage
        const wasReset = user.checkAndResetMonthlyUsage();
        if (wasReset) {
            await user.save();
            console.log(`🔄 Monthly usage reset applied for ${user.email} via API`);
        }

        // Return fresh usage data
        const usageTracking = user.usageTracking || {};
        const usage = {
            inventoryItems: usageTracking.totalInventoryItems || 0,
            monthlyReceiptScans: usageTracking.monthlyReceiptScans || 0,
            recipeCollections: usageTracking.totalRecipeCollections || 0,
            savedRecipes: usageTracking.totalSavedRecipes || user.savedRecipes?.length || 0,
            personalRecipes: usageTracking.totalPersonalRecipes || 0,
            monthlyUPCScans: usageTracking.monthlyUPCScans || 0
        };

        return NextResponse.json({
            success: true,
            wasReset,
            usage,
            currentMonth: usageTracking.currentMonth,
            currentYear: usageTracking.currentYear,
            message: wasReset ? 'Monthly usage was reset' : 'No reset needed'
        });

    } catch (error) {
        console.error('Error checking monthly reset:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}