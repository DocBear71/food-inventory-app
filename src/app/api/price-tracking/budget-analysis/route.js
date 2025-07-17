// file: /src/app/api/price-tracking/budget-analysis/route.js v1 - Budget analysis and recommendations

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
        const period = searchParams.get('period') || '30'; // days

        await connectDB();

        const inventory = await UserInventory.findOne({ userId: session.user.id });
        if (!inventory) {
            return NextResponse.json({
                success: true,
                analysis: getEmptyAnalysis()
            });
        }

        const cutoffDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

        let totalSpending = 0;
        let totalSavings = 0;
        let priceEntries = 0;
        let dealsFound = 0;
        let storeBreakdown = {};
        let categoryBreakdown = {};

        inventory.items.forEach(item => {
            if (!item.priceHistory) return;

            const recentPrices = item.priceHistory.filter(p => new Date(p.date) >= cutoffDate);

            recentPrices.forEach(price => {
                totalSpending += price.price;
                priceEntries++;

                // Store breakdown
                if (!storeBreakdown[price.store]) {
                    storeBreakdown[price.store] = { spending: 0, entries: 0 };
                }
                storeBreakdown[price.store].spending += price.price;
                storeBreakdown[price.store].entries += 1;

                // Category breakdown
                const category = item.category || 'Other';
                if (!categoryBreakdown[category]) {
                    categoryBreakdown[category] = { spending: 0, entries: 0 };
                }
                categoryBreakdown[category].spending += price.price;
                categoryBreakdown[category].entries += 1;

                // Check if it was a deal
                if (price.isOnSale || price.price < (item.averagePrice || price.price) * 0.9) {
                    dealsFound++;
                    totalSavings += (item.averagePrice || price.price) - price.price;
                }
            });
        });

        // Generate recommendations
        const recommendations = generateBudgetRecommendations({
            totalSpending,
            totalSavings,
            dealsFound,
            storeBreakdown,
            categoryBreakdown,
            period: parseInt(period)
        });

        // Convert store and category breakdowns to arrays
        const topStores = Object.entries(storeBreakdown)
            .map(([store, data]) => ({
                store,
                spending: data.spending,
                entries: data.entries,
                avgPerEntry: data.spending / data.entries
            }))
            .sort((a, b) => b.spending - a.spending)
            .slice(0, 5);

        const topCategories = Object.entries(categoryBreakdown)
            .map(([category, data]) => ({
                category,
                spending: data.spending,
                entries: data.entries,
                avgPerEntry: data.spending / data.entries
            }))
            .sort((a, b) => b.spending - a.spending)
            .slice(0, 5);

        const analysis = {
            period: parseInt(period),
            monthlySpending: totalSpending,
            avgSavings: totalSavings,
            dealsFound,
            itemsTracked: inventory.items.filter(item => item.priceHistory?.length > 0).length,
            priceEntries,
            avgSpendingPerEntry: priceEntries > 0 ? totalSpending / priceEntries : 0,
            topStores,
            topCategories,
            recommendations,
            trends: {
                savingsRate: totalSpending > 0 ? (totalSavings / totalSpending * 100).toFixed(1) : 0,
                dealsRate: priceEntries > 0 ? (dealsFound / priceEntries * 100).toFixed(1) : 0
            }
        };

        return NextResponse.json({
            success: true,
            analysis
        });

    } catch (error) {
        console.error('Error generating budget analysis:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

function generateBudgetRecommendations(data) {
    const recommendations = [];
    const { totalSpending, totalSavings, dealsFound, storeBreakdown, period } = data;

    // Spending analysis
    const avgDailySpending = totalSpending / period;
    if (avgDailySpending > 50) {
        recommendations.push("Consider setting a daily spending limit to control grocery costs");
    }

    // Savings opportunities
    if (totalSavings < totalSpending * 0.1) {
        recommendations.push("Look for more sale opportunities - you could save 10%+ with better timing");
    }

    // Store optimization
    const stores = Object.keys(storeBreakdown);
    if (stores.length > 3) {
        recommendations.push("You're shopping at many stores - consider consolidating to 2-3 for better deals");
    }

    // Deal frequency
    if (dealsFound < 5) {
        recommendations.push("Set up more price alerts to catch deals automatically");
    }

    // Bulk buying opportunities
    recommendations.push("Consider bulk buying for frequently purchased items to reduce unit costs");

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
}

function getEmptyAnalysis() {
    return {
        period: 30,
        monthlySpending: 0,
        avgSavings: 0,
        dealsFound: 0,
        itemsTracked: 0,
        priceEntries: 0,
        avgSpendingPerEntry: 0,
        topStores: [],
        topCategories: [],
        recommendations: ["Start tracking prices to see budget insights and recommendations"],
        trends: {
            savingsRate: 0,
            dealsRate: 0
        }
    };
}

