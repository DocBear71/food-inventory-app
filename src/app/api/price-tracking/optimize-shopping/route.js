// file: /src/app/api/price-tracking/optimize-shopping/route.js v1 - Enhanced shopping optimization with price data

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory, Store } from '@/lib/models';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            items = [],
            budget = null,
            preferredStores = [],
            maxStores = 3,
            prioritize = 'savings' // 'savings', 'convenience', 'quality'
        } = await request.json();

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({
                error: 'Shopping items list is required'
            }, { status: 400 });
        }

        await connectDB();

        // Get user's inventory for price data
        const inventory = await UserInventory.findOne({ userId: session.user.id });

        // Get available stores
        const stores = await Store.find({ isActive: true });

        // Optimize shopping list with price intelligence
        const optimization = await optimizeShoppingWithPrices({
            items,
            budget,
            preferredStores,
            maxStores,
            prioritize,
            inventory: inventory?.items || [],
            availableStores: stores
        });

        return NextResponse.json({
            success: true,
            optimization
        });

    } catch (error) {
        console.error('Shopping optimization error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

async function optimizeShoppingWithPrices(params) {
    const { items, budget, preferredStores, maxStores, prioritize, inventory, availableStores } = params;

    const optimizedItems = [];
    const storeRecommendations = {};
    let totalCost = 0;
    let totalSavings = 0;

    // Process each shopping item
    for (const shoppingItem of items) {
        const itemName = typeof shoppingItem === 'string' ? shoppingItem : shoppingItem.name;

        // Find matching inventory items
        const matches = inventory.filter(invItem =>
            invItem.name.toLowerCase().includes(itemName.toLowerCase()) ||
            itemName.toLowerCase().includes(invItem.name.toLowerCase())
        );

        let bestPrice = null;
        let priceOptions = [];

        if (matches.length > 0) {
            // Collect all price options from matching items
            matches.forEach(match => {
                if (match.priceHistory && match.priceHistory.length > 0) {
                    match.priceHistory.forEach(price => {
                        priceOptions.push({
                            ...price,
                            itemName: match.name,
                            avgPrice: match.averagePrice
                        });
                    });
                }
            });

            // Find best current price
            if (priceOptions.length > 0) {
                // Group by store and find latest price for each
                const storeLatestPrices = {};
                priceOptions.forEach(price => {
                    const storeKey = price.store;
                    if (!storeLatestPrices[storeKey] ||
                        new Date(price.date) > new Date(storeLatestPrices[storeKey].date)) {
                        storeLatestPrices[storeKey] = price;
                    }
                });

                // Sort by price (lowest first) or by preference
                const sortedPrices = Object.values(storeLatestPrices).sort((a, b) => {
                    if (prioritize === 'savings') {
                        return a.price - b.price;
                    } else if (prioritize === 'convenience') {
                        // Prefer stores user shops at more
                        const aPreferred = preferredStores.includes(a.store) ? 0 : 1;
                        const bPreferred = preferredStores.includes(b.store) ? 0 : 1;
                        return aPreferred - bPreferred || a.price - b.price;
                    }
                    return a.price - b.price;
                });

                bestPrice = sortedPrices[0];
            }
        }

        // Create optimized item
        const optimizedItem = {
            name: itemName,
            originalRequest: shoppingItem,
            bestPrice: bestPrice ? {
                price: bestPrice.price,
                store: bestPrice.store,
                date: bestPrice.date,
                savings: bestPrice.avgPrice ? bestPrice.avgPrice - bestPrice.price : 0
            } : null,
            alternatives: priceOptions.slice(1, 4).map(alt => ({
                price: alt.price,
                store: alt.store,
                savings: alt.avgPrice ? alt.avgPrice - alt.price : 0
            })),
            estimatedPrice: bestPrice ? bestPrice.price : 3.00, // Default estimate
            category: matches[0]?.category || 'General'
        };

        optimizedItems.push(optimizedItem);

        // Update totals
        if (bestPrice) {
            totalCost += bestPrice.price;
            if (bestPrice.avgPrice) {
                totalSavings += Math.max(0, bestPrice.avgPrice - bestPrice.price);
            }
        } else {
            totalCost += 3.00; // Default estimate
        }

        // Track store recommendations
        if (bestPrice) {
            if (!storeRecommendations[bestPrice.store]) {
                storeRecommendations[bestPrice.store] = {
                    store: bestPrice.store,
                    items: [],
                    totalCost: 0,
                    totalSavings: 0
                };
            }
            storeRecommendations[bestPrice.store].items.push(itemName);
            storeRecommendations[bestPrice.store].totalCost += bestPrice.price;
            storeRecommendations[bestPrice.store].totalSavings += bestPrice.avgPrice ?
                Math.max(0, bestPrice.avgPrice - bestPrice.price) : 0;
        }
    }

    // Generate store route optimization
    const storeRouteOptimization = optimizeStoreRoute(
        Object.values(storeRecommendations),
        maxStores,
        prioritize
    );

    // Budget analysis
    const budgetAnalysis = budget ? {
        budget,
        estimatedCost: totalCost,
        remaining: budget - totalCost,
        overBudget: totalCost > budget,
        recommendations: totalCost > budget ?
            generateBudgetCutRecommendations(optimizedItems, totalCost - budget) : []
    } : null;

    return {
        items: optimizedItems,
        storeRecommendations: Object.values(storeRecommendations),
        storeRoute: storeRouteOptimization,
        totalCost,
        totalSavings,
        budgetAnalysis,
        summary: {
            itemCount: optimizedItems.length,
            storesNeeded: Object.keys(storeRecommendations).length,
            avgPricePerItem: totalCost / optimizedItems.length,
            savingsRate: totalCost > 0 ? (totalSavings / (totalCost + totalSavings) * 100).toFixed(1) : 0
        }
    };
}

function optimizeStoreRoute(storeRecommendations, maxStores, prioritize) {
    // Sort stores by optimization criteria
    const sortedStores = [...storeRecommendations].sort((a, b) => {
        if (prioritize === 'savings') {
            return b.totalSavings - a.totalSavings;
        } else if (prioritize === 'convenience') {
            return b.items.length - a.items.length; // Prefer stores with more items
        }
        return b.totalCost - a.totalCost; // Prefer stores with higher total value
    });

    // Limit to maxStores
    const selectedStores = sortedStores.slice(0, maxStores);

    return {
        recommendedStores: selectedStores,
        consolidationSavings: calculateConsolidationSavings(storeRecommendations, selectedStores),
        routeEfficiency: selectedStores.length <= 2 ? 'optimal' :
            selectedStores.length <= 3 ? 'good' : 'consider_consolidating'
    };
}

function calculateConsolidationSavings(allStores, selectedStores) {
    const allStoresCost = allStores.reduce((sum, store) => sum + store.totalCost, 0);
    const selectedStoresCost = selectedStores.reduce((sum, store) => sum + store.totalCost, 0);

    return {
        timeSaved: Math.max(0, (allStores.length - selectedStores.length) * 20), // 20 min per store
        potentialSavings: Math.max(0, allStoresCost - selectedStoresCost)
    };
}

function generateBudgetCutRecommendations(items, overage) {
    const recommendations = [];

    // Sort items by price (highest first) to suggest cuts
    const expensiveItems = items
        .filter(item => item.bestPrice)
        .sort((a, b) => b.bestPrice.price - a.bestPrice.price);

    let cumulativeSavings = 0;
    for (const item of expensiveItems) {
        if (cumulativeSavings >= overage) break;

        recommendations.push({
            action: 'remove',
            item: item.name,
            savings: item.bestPrice.price,
            reason: 'Highest cost item'
        });

        cumulativeSavings += item.bestPrice.price;
    }

    return recommendations.slice(0, 3); // Limit to 3 suggestions
}