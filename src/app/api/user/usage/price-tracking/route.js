// file: /src/app/api/user/usage/price-tracking/route.js
// ==============================================================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User, UserInventory } from '@/lib/models';
import { checkUsageLimit, getRemainingUsage, getUsageLimit } from '@/lib/subscription-config';
import { FEATURE_GATES } from '@/lib/subscription-config';

export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get user's inventory to count items with price tracking
        const inventory = await UserInventory.findOne({ userId: session.user.id });
        const itemsWithPrices = inventory?.items?.filter(item =>
            item.priceHistory && item.priceHistory.length > 0
        ) || [];

        const currentCount = itemsWithPrices.length;
        const limit = getUsageLimit(user.subscription, 'priceTrackingItems');
        const remaining = getRemainingUsage(user.subscription, FEATURE_GATES.PRICE_TRACKING, currentCount);

        return NextResponse.json({
            success: true,
            usage: {
                currentCount,
                remainingCount: remaining === 'Unlimited' ? -1 : remaining,
                limit: limit === -1 ? -1 : limit,
                tier: user.subscription?.tier || 'free'
            }
        });

    } catch (error) {
        console.error('Usage tracking error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}