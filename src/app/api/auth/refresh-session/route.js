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
        const freshUser = await User.findById(session.user.id);

        if (!freshUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get fresh usage data
        const usageTracking = freshUser.usageTracking || {};
        const usage = {
            inventoryItems: usageTracking.totalInventoryItems || 0,
            monthlyReceiptScans: usageTracking.monthlyReceiptScans || 0,
            recipeCollections: usageTracking.totalRecipeCollections || 0,
            savedRecipes: usageTracking.totalSavedRecipes || freshUser.savedRecipes?.length || 0,
            personalRecipes: usageTracking.totalPersonalRecipes || 0,
            monthlyUPCScans: usageTracking.monthlyUPCScans || 0
        };

        return NextResponse.json({
            success: true,
            usage,
            subscription: freshUser.subscription,
            message: 'Session data refreshed'
        });

    } catch (error) {
        console.error('Error refreshing session:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}