// file: /src/app/api/shopping/price-lookup/route.js v1 - Smart price lookup for shopping lists

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory, Store } from '@/lib/models';

export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const itemName = searchParams.get('item');
        const preferredStore = searchParams.get('store');
        const radius = parseFloat(searchParams.get('radius') || '10'); // miles

        if (!itemName) {
            return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
        }

        await connectDB();

        // Get user's inventory to find price data
        const inventory = await UserInventory.findOne({ userId: session.user.id });

        // Find matching items in user's inventory
        const matchingItems = inventory?.items?.filter(item =>
            item.name.toLowerCase().includes(itemName.toLowerCase()) ||
            itemName.toLowerCase().includes(item.name.toLowerCase())
        ) || [];

        // Aggregate all price data from matching items
        let allPrices = [];
        let inventoryMatch = null;
        let currentBestPrice = null;

        if (matchingItems.length > 0) {
            // Use the best matching item (exact match preferred)
            const exactMatch = matchingItems.find(item =>
                item.name.toLowerCase() === itemName.toLowerCase()
            );

            const selectedItem = exactMatch || matchingItems[0];
            inventoryMatch = {
                itemId: selectedItem._id,
                name: selectedItem.name,
                category: selectedItem.category,
                currentStock: selectedItem.quantity
            };

            // Get all price history from this item
            if (selectedItem.priceHistory && selectedItem.priceHistory.length > 0) {
                allPrices = selectedItem.priceHistory.map(price => ({
                    ...price,
                    itemName: selectedItem.name,
                    source: 'user_inventory'
                }));
            }

            currentBestPrice = selectedItem.currentBestPrice;
        }

        // If no user data, try to find similar items across all user inventory
        if (allPrices.length === 0) {
            const similarItems = await findSimilarItems(itemName, session.user.id);
            allPrices = similarItems.flatMap(item =>
                (item.priceHistory || []).map(price => ({
                    ...price,
                    itemName: item.name,
                    source: 'similar_item'
                }))
            );
        }

        // Filter by preferred store if specified
        let storeFilteredPrices = allPrices;
        if (preferredStore && preferredStore !== '') {
            storeFilteredPrices = allPrices.filter(price =>
                price.store.toLowerCase().includes(preferredStore.toLowerCase())
            );
        }

        // Calculate price statistics
        const priceStats = calculatePriceStatistics(allPrices);
        const storeComparison = calculateStoreComparison(allPrices);
        const dealAnalysis = analyzeDealOpportunities(allPrices, currentBestPrice);

        // Get store recommendations based on price and location
        const storeRecommendations = await getStoreRecommendations(
            allPrices,
            preferredStore,
            session.user.id,
            radius
        );

        return NextResponse.json({
            success: true,
            item: itemName,
            inventoryMatch,
            currentBestPrice,
            prices: storeFilteredPrices.slice(0, 20), // Limit to recent 20 entries
            statistics: priceStats,
            storeComparison,
            dealAnalysis,
            storeRecommendations,
            dataSource: inventoryMatch ? 'user_inventory' : 'similar_items'
        });

    } catch (error) {
        console.error('Price lookup error:', error);
        return NextResponse.json(
            { error: 'Failed to lookup prices', details: error.message },
            { status: 500 }
        );
    }
}

async function findSimilarItems(itemName, userId) {
    try {
        // Find items with similar names in user's inventory
        const inventory = await UserInventory.findOne({ userId });
        if (!inventory?.items) return [];

        const searchTerms = itemName.toLowerCase().split(' ');

        const similarItems = inventory.items.filter(item => {
            const itemNameLower = item.name.toLowerCase();
            return searchTerms.some(term =>
                itemNameLower.includes(term) && term.length > 2
            );
        });

        return similarItems;
    } catch (error) {
        console.error('Error finding similar items:', error);
        return [];
    }
}

function calculatePriceStatistics(prices) {
    if (prices.length === 0) {
        return {
            count: 0,
            average: 0,
            min: 0,
            max: 0,
            trend: 'stable'
        };
    }

    const priceValues = prices.map(p => p.price).filter(p => p > 0);
    if (priceValues.length === 0) {
        return { count: 0, average: 0, min: 0, max: 0, trend: 'stable' };
    }

    const average = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;
    const min = Math.min(...priceValues);
    const max = Math.max(...priceValues);

    // Calculate trend (last 5 prices vs previous 5)
    let trend = 'stable';
    if (prices.length >= 10) {
        const sortedPrices = [...prices].sort((a, b) => new Date(b.date) - new Date(a.date));
        const recent = sortedPrices.slice(0, 5).map(p => p.price);
        const older = sortedPrices.slice(5, 10).map(p => p.price);

        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

        if (recentAvg > olderAvg * 1.05) trend = 'increasing';
        else if (recentAvg < olderAvg * 0.95) trend = 'decreasing';
    }

    return {
        count: priceValues.length,
        average: parseFloat(average.toFixed(2)),
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        trend
    };
}

function calculateStoreComparison(prices) {
    const storeData = {};

    prices.forEach(price => {
        if (!storeData[price.store]) {
            storeData[price.store] = {
                store: price.store,
                prices: [],
                totalPrice: 0,
                count: 0,
                lastSeen: price.date
            };
        }

        storeData[price.store].prices.push(price.price);
        storeData[price.store].totalPrice += price.price;
        storeData[price.store].count += 1;

        if (new Date(price.date) > new Date(storeData[price.store].lastSeen)) {
            storeData[price.store].lastSeen = price.date;
        }
    });

    // Calculate averages and rank stores
    const storeComparison = Object.values(storeData).map(store => ({
        store: store.store,
        averagePrice: parseFloat((store.totalPrice / store.count).toFixed(2)),
        priceCount: store.count,
        lowestPrice: Math.min(...store.prices),
        highestPrice: Math.max(...store.prices),
        lastSeen: store.lastSeen
    })).sort((a, b) => a.averagePrice - b.averagePrice);

    return storeComparison;
}

function analyzeDealOpportunities(prices, currentBestPrice) {
    if (prices.length === 0) {
        return {
            hasDeals: false,
            currentDealStatus: 'no_data',
            recommendations: []
        };
    }

    const priceValues = prices.map(p => p.price).filter(p => p > 0);
    const avgPrice = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;
    const minPrice = Math.min(...priceValues);

    let currentDealStatus = 'no_data';
    const recommendations = [];

    if (currentBestPrice?.price) {
        const currentPrice = currentBestPrice.price;

        if (currentPrice <= avgPrice * 0.8) {
            currentDealStatus = 'excellent_deal';
        } else if (currentPrice <= avgPrice * 0.9) {
            currentDealStatus = 'good_deal';
        } else if (currentPrice >= avgPrice * 1.2) {
            currentDealStatus = 'expensive';
        } else {
            currentDealStatus = 'fair_price';
        }

        // Add recommendations
        if (currentDealStatus === 'excellent_deal') {
            recommendations.push({
                type: 'stock_up',
                message: 'Excellent price! Consider buying extra.',
                savings: `${((avgPrice - currentPrice) / avgPrice * 100).toFixed(1)}% below average`
            });
        } else if (currentDealStatus === 'expensive') {
            recommendations.push({
                type: 'wait',
                message: 'Price is high. Consider waiting or checking other stores.',
                avgPrice: avgPrice.toFixed(2),
                potentialSavings: (currentPrice - avgPrice).toFixed(2)
            });
        }
    }

    return {
        hasDeals: recommendations.length > 0,
        currentDealStatus,
        recommendations,
        averagePrice: avgPrice.toFixed(2),
        historicalLow: minPrice.toFixed(2)
    };
}

async function getStoreRecommendations(prices, preferredStore, userId, radius) {
    try {
        // Get stores near user (this would integrate with user's location/preferred stores)
        const stores = await Store.find({ isActive: true }).limit(10);

        const storeData = {};

        // Group prices by store
        prices.forEach(price => {
            if (!storeData[price.store]) {
                storeData[price.store] = {
                    store: price.store,
                    prices: [],
                    avgPrice: 0,
                    count: 0
                };
            }
            storeData[price.store].prices.push(price.price);
            storeData[price.store].count += 1;
        });

        // Calculate averages
        Object.values(storeData).forEach(store => {
            store.avgPrice = store.prices.reduce((a, b) => a + b, 0) / store.prices.length;
        });

        // Sort by price and create recommendations
        const sortedStores = Object.values(storeData)
            .sort((a, b) => a.avgPrice - b.avgPrice)
            .slice(0, 5);

        const recommendations = sortedStores.map((store, index) => ({
            store: store.store,
            averagePrice: store.avgPrice.toFixed(2),
            rank: index + 1,
            priceCount: store.count,
            recommendation: index === 0 ? 'best_price' :
                index < 3 ? 'good_option' : 'consider',
            savings: index > 0 ? (store.avgPrice - sortedStores[0].avgPrice).toFixed(2) : '0.00'
        }));

        return recommendations;

    } catch (error) {
        console.error('Error getting store recommendations:', error);
        return [];
    }
}

// POST - Add price alert for shopping list item
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { itemName, targetPrice, alertType = 'below', stores = [] } = await request.json();

        if (!itemName || !targetPrice) {
            return NextResponse.json({
                error: 'Item name and target price are required'
            }, { status: 400 });
        }

        await connectDB();

        // Find matching inventory item
        const inventory = await UserInventory.findOne({ userId: session.user.id });
        const matchingItem = inventory?.items?.find(item =>
            item.name.toLowerCase() === itemName.toLowerCase()
        );

        if (!matchingItem) {
            return NextResponse.json({
                error: 'Item not found in inventory'
            }, { status: 404 });
        }

        // Update price alert settings
        matchingItem.priceAlerts = {
            enabled: true,
            targetPrice: parseFloat(targetPrice),
            alertWhenBelow: alertType === 'below',
            stores: stores,
            lastAlertSent: null,
            createdAt: new Date()
        };

        await inventory.save();

        return NextResponse.json({
            success: true,
            message: 'Price alert created successfully',
            alert: matchingItem.priceAlerts
        });

    } catch (error) {
        console.error('Error creating price alert:', error);
        return NextResponse.json(
            { error: 'Failed to create price alert' },
            { status: 500 }
        );
    }
}