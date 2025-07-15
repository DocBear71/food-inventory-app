// file: /src/app/api/analytics/prices/route.js

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

        await connectDB();

        const { searchParams } = new URL(request.url);
        const timeRange = searchParams.get('range') || '30'; // days
        const category = searchParams.get('category');

        // Get user's inventory with price history
        const inventory = await UserInventory.findOne({ userId: session.user.id });
        if (!inventory) {
            return NextResponse.json({ success: true, data: { analytics: null } });
        }

        const items = inventory.items || [];
        const cutoffDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000);

        // Filter items with price history
        const itemsWithPrices = items.filter(item => {
            if (category && item.category !== category) return false;
            return item.priceHistory && item.priceHistory.length > 0;
        });

        // Calculate analytics
        const analytics = {
            overview: {
                totalItemsTracked: itemsWithPrices.length,
                totalPriceEntries: itemsWithPrices.reduce((sum, item) => sum + (item.priceHistory?.length || 0), 0),
                averageSavings: 0,
                topSavingCategory: null
            },
            trends: {
                priceChanges: [],
                storeComparison: {},
                categoryAnalysis: {},
                monthlySpending: []
            },
            recommendations: {
                bestDeals: [],
                worstDeals: [],
                stockUpAlerts: [],
                storeRecommendations: []
            }
        };

        // Process price trends
        const priceData = [];
        const storeData = {};
        const categoryData = {};

        itemsWithPrices.forEach(item => {
            const recentPrices = item.priceHistory.filter(p => new Date(p.date) >= cutoffDate);

            recentPrices.forEach(price => {
                priceData.push({
                    date: price.date,
                    price: price.price,
                    store: price.store,
                    category: item.category || 'Other',
                    itemName: item.name,
                    unitPrice: price.unitPrice
                });

                // Store analysis
                if (!storeData[price.store]) {
                    storeData[price.store] = { totalPrice: 0, count: 0, items: new Set() };
                }
                storeData[price.store].totalPrice += price.price;
                storeData[price.store].count += 1;
                storeData[price.store].items.add(item.name);

                // Category analysis
                const cat = item.category || 'Other';
                if (!categoryData[cat]) {
                    categoryData[cat] = { totalPrice: 0, count: 0, items: new Set() };
                }
                categoryData[cat].totalPrice += price.price;
                categoryData[cat].count += 1;
                categoryData[cat].items.add(item.name);
            });
        });

        // Calculate store averages and rankings
        const storeRankings = Object.entries(storeData).map(([store, data]) => ({
            store,
            averagePrice: data.totalPrice / data.count,
            itemCount: data.items.size,
            totalEntries: data.count,
            totalSpent: data.totalPrice
        })).sort((a, b) => a.averagePrice - b.averagePrice);

        analytics.trends.storeComparison = storeRankings;

        // Category analysis
        const categoryAnalysis = Object.entries(categoryData).map(([category, data]) => ({
            category,
            averagePrice: data.totalPrice / data.count,
            itemCount: data.items.size,
            totalSpent: data.totalPrice,
            pricePerItem: data.totalPrice / data.items.size
        })).sort((a, b) => b.totalSpent - a.totalSpent);

        analytics.trends.categoryAnalysis = categoryAnalysis;

        // Find best and worst deals
        const deals = itemsWithPrices.map(item => {
            const prices = item.priceHistory.map(p => p.price).sort((a, b) => a - b);
            if (prices.length < 2) return null;

            const lowest = prices[0];
            const highest = prices[prices.length - 1];
            const savings = ((highest - lowest) / highest) * 100;

            return {
                itemName: item.name,
                category: item.category || 'Other',
                lowestPrice: lowest,
                highestPrice: highest,
                savings: savings,
                savingsAmount: highest - lowest,
                currentBestPrice: item.currentBestPrice
            };
        }).filter(Boolean).sort((a, b) => b.savings - a.savings);

        analytics.recommendations.bestDeals = deals.slice(0, 10);
        analytics.recommendations.worstDeals = deals.slice(-5).reverse();

        // Stock up alerts (items with historically low current prices)
        const stockUpAlerts = itemsWithPrices.filter(item => {
            if (!item.currentBestPrice) return false;

            const allPrices = item.priceHistory.map(p => p.price);
            const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
            const currentPrice = item.currentBestPrice.price;

            return currentPrice <= avgPrice * 0.8; // 20% below average
        }).map(item => ({
            itemName: item.name,
            category: item.category || 'Other',
            currentPrice: item.currentBestPrice.price,
            averagePrice: item.priceHistory.reduce((a, b) => a + b.price, 0) / item.priceHistory.length,
            savings: 'Up to 20% below average',
            store: item.currentBestPrice.store
        }));

        analytics.recommendations.stockUpAlerts = stockUpAlerts;

        // Store recommendations based on savings
        if (storeRankings.length > 1) {
            const bestStore = storeRankings[0];
            const worstStore = storeRankings[storeRankings.length - 1];

            analytics.recommendations.storeRecommendations = [
                {
                    type: 'best_value',
                    store: bestStore.store,
                    reason: `Lowest average prices ($${bestStore.averagePrice.toFixed(2)} avg)`,
                    savings: `Save ~$${(worstStore.averagePrice - bestStore.averagePrice).toFixed(2)} per item`
                }
            ];
        }

        return NextResponse.json({ success: true, data: { analytics } });

    } catch (error) {
        console.error('Price analytics error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}