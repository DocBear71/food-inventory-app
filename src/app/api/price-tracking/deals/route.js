// file: /src/app/api/price-tracking/deals/route.js v1 - Deal opportunities detection

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory } from '@/lib/models';

export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const minSavings = parseFloat(searchParams.get('minSavings') || '0.20'); // 20% minimum savings
        const limit = parseInt(searchParams.get('limit') || '10');

        await connectDB();

        const inventory = await UserInventory.findOne({ userId: session.user.id });
        if (!inventory) {
            return NextResponse.json({ success: true, deals: [] });
        }

        const deals = [];

        inventory.items.forEach(item => {
            if (!item.priceHistory || item.priceHistory.length < 3) return;
            if (!item.currentBestPrice) return;

            const prices = item.priceHistory.map(p => p.price).filter(p => p > 0);
            if (prices.length === 0) return;

            const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
            const currentPrice = item.currentBestPrice.price;
            const savingsPercent = ((avgPrice - currentPrice) / avgPrice);

            // Only include items with significant savings
            if (savingsPercent >= minSavings) {
                deals.push({
                    itemId: item._id,
                    itemName: item.name,
                    category: item.category || 'Other',
                    currentPrice,
                    avgPrice,
                    savings: avgPrice - currentPrice,
                    savingsPercent: (savingsPercent * 100).toFixed(1),
                    store: item.currentBestPrice.store,
                    lastUpdated: item.currentBestPrice.date,
                    recommendation: savingsPercent >= 0.3 ? 'stock_up' : 'good_deal',
                    confidence: Math.min(item.priceHistory.length / 10, 1) // More data = higher confidence
                });
            }
        });

        // Sort by savings amount (highest first)
        deals.sort((a, b) => b.savings - a.savings);

        return NextResponse.json({
            success: true,
            deals: deals.slice(0, limit),
            summary: {
                totalDeals: deals.length,
                totalSavings: deals.reduce((sum, deal) => sum + deal.savings, 0),
                avgSavingsPercent: deals.length > 0
                    ? (deals.reduce((sum, deal) => sum + parseFloat(deal.savingsPercent), 0) / deals.length).toFixed(1)
                    : 0
            }
        });

    } catch (error) {
        console.error('Error fetching deals:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

