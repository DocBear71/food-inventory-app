// file: /src/app/api/price-tracking/budget-optimize/route.js v1 - Budget-focused shopping list optimization

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory } from '@/lib/models';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            items = [],
            budgetLimit,
            currentTotal,
            store = null,
            prioritizeEssentials = true
        } = await request.json();

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({
                error: 'Shopping items list is required'
            }, { status: 400 });
        }

        if (!budgetLimit || budgetLimit <= 0) {
            return NextResponse.json({
                error: 'Valid budget limit is required'
            }, { status: 400 });
        }

        await connectDB();

        // Get user's inventory for price data and alternatives
        const inventory = await UserInventory.findOne({ userId: session.user.id });

        // Perform budget optimization
        const optimization = await optimizeForBudget({
            items,
            budgetLimit,
            currentTotal,
            store,
            prioritizeEssentials,
            inventory: inventory?.items || []
        });

        return NextResponse.json({
            success: true,
            ...optimization
        });

    } catch (error) {
        console.error('Budget optimization error:', error);
        return NextResponse.json({
            error: 'Failed to optimize budget',
            details: error.message
        }, { status: 500 });
    }
}

async function optimizeForBudget(params) {
    const { items, budgetLimit, currentTotal, store, prioritizeEssentials, inventory } = params;

    const optimizations = [];
    const warnings = [];
    const suggestions = [];

    // Calculate how much we need to cut
    const overage = currentTotal - budgetLimit;

    if (overage <= 0) {
        // Already under budget
        return {
            optimizations: [],
            newTotal: currentTotal,
            savings: 0,
            warnings: [],
            suggestions: [{
                type: 'success',
                message: `You're under budget by $${Math.abs(overage).toFixed(2)}!`
            }]
        };
    }

    // Categorize items by priority
    const categorizedItems = categorizeItemsByPriority(items, prioritizeEssentials);

    // Strategy 1: Find cheaper alternatives
    let totalSavings = 0;
    for (const item of categorizedItems.all) {
        const alternatives = await findCheaperAlternatives(item, inventory, store);

        if (alternatives.length > 0) {
            const bestAlternative = alternatives[0];
            const savings = (item.actualPrice || item.estimatedPrice || 0) - bestAlternative.price;

            if (savings > 0) {
                optimizations.push({
                    itemId: item.id || item.name,
                    type: 'alternative',
                    changes: {
                        name: bestAlternative.name,
                        estimatedPrice: bestAlternative.price,
                        originalPrice: item.actualPrice || item.estimatedPrice || 0,
                        savings: savings,
                        reason: `Switch to ${bestAlternative.name} (${bestAlternative.store || 'alternative option'})`
                    }
                });

                totalSavings += savings;

                if (totalSavings >= overage) {
                    break; // We've found enough savings
                }
            }
        }
    }

    // Strategy 2: Reduce quantities of non-essential items
    if (totalSavings < overage) {
        for (const item of categorizedItems.nonEssential) {
            const currentQty = item.quantity || 1;
            const unitPrice = (item.actualPrice || item.estimatedPrice || 0) / currentQty;

            if (currentQty > 1) {
                const newQty = Math.max(1, currentQty - 1);
                const savings = (currentQty - newQty) * unitPrice;

                optimizations.push({
                    itemId: item.id || item.name,
                    type: 'quantity_reduction',
                    changes: {
                        quantity: newQty,
                        originalQuantity: currentQty,
                        savings: savings,
                        reason: `Reduced quantity from ${currentQty} to ${newQty}`
                    }
                });

                totalSavings += savings;

                if (totalSavings >= overage) {
                    break;
                }
            }
        }
    }

    // Strategy 3: Remove non-essential items
    if (totalSavings < overage) {
        for (const item of categorizedItems.nonEssential) {
            const itemCost = (item.actualPrice || item.estimatedPrice || 0) * (item.quantity || 1);

            optimizations.push({
                itemId: item.id || item.name,
                type: 'removal',
                changes: {
                    selected: false,
                    removed: true,
                    savings: itemCost,
                    reason: 'Removed to stay within budget'
                }
            });

            totalSavings += itemCost;

            if (totalSavings >= overage) {
                break;
            }
        }
    }

    // Strategy 4: If still over budget, warn about essential items
    if (totalSavings < overage) {
        const remainingOverage = overage - totalSavings;
        warnings.push({
            type: 'budget_constraint',
            message: `Still $${remainingOverage.toFixed(2)} over budget. Consider removing essential items or increasing your budget.`
        });

        // Suggest removing some essential items
        for (const item of categorizedItems.essential.slice(-3)) { // Last 3 essential items
            const itemCost = (item.actualPrice || item.estimatedPrice || 0) * (item.quantity || 1);

            suggestions.push({
                type: 'optional_removal',
                itemId: item.id || item.name,
                itemName: item.name || item.ingredient,
                savings: itemCost,
                message: `Consider removing "${item.name || item.ingredient}" to save $${itemCost.toFixed(2)}`
            });
        }
    }

    // Calculate final totals
    const newTotal = currentTotal - totalSavings;
    const success = newTotal <= budgetLimit;

    // Add success message
    if (success && optimizations.length > 0) {
        suggestions.unshift({
            type: 'success',
            message: `Great! Found $${totalSavings.toFixed(2)} in savings to fit your $${budgetLimit.toFixed(2)} budget.`
        });
    }

    return {
        optimizations,
        newTotal,
        savings: totalSavings,
        success,
        overage: Math.max(0, newTotal - budgetLimit),
        warnings,
        suggestions,
        summary: {
            originalTotal: currentTotal,
            budgetLimit,
            optimizationsApplied: optimizations.length,
            strategiesUsed: getStrategiesUsed(optimizations)
        }
    };
}

function categorizeItemsByPriority(items, prioritizeEssentials) {
    if (!prioritizeEssentials) {
        return {
            all: items,
            essential: [],
            nonEssential: items
        };
    }

    const essential = [];
    const nonEssential = [];

    // Essential categories (food necessities)
    const essentialCategories = [
        'Fresh Meat', 'Dairy', 'Fresh Fruits', 'Fresh Vegetables',
        'Bread & Bakery', 'Pantry Staples', 'Grains'
    ];

    // Essential keywords
    const essentialKeywords = [
        'milk', 'bread', 'eggs', 'chicken', 'beef', 'rice', 'flour',
        'butter', 'oil', 'salt', 'sugar', 'onion', 'potato'
    ];

    items.forEach(item => {
        const itemName = (item.name || item.ingredient || '').toLowerCase();
        const category = item.category || '';

        const isEssentialCategory = essentialCategories.includes(category);
        const hasEssentialKeyword = essentialKeywords.some(keyword =>
            itemName.includes(keyword)
        );

        if (isEssentialCategory || hasEssentialKeyword) {
            essential.push(item);
        } else {
            nonEssential.push(item);
        }
    });

    return {
        all: items,
        essential,
        nonEssential
    };
}

async function findCheaperAlternatives(item, inventory, preferredStore) {
    const itemName = item.name || item.ingredient || '';
    const currentPrice = item.actualPrice || item.estimatedPrice || 0;

    if (!itemName || currentPrice <= 0) {
        return [];
    }

    // Find similar items in inventory
    const alternatives = [];

    inventory.forEach(invItem => {
        if (!invItem.name) return;

        const similarity = calculateNameSimilarity(itemName, invItem.name);

        // If reasonably similar (>70% match or contains keywords)
        if (similarity > 0.7 || hasCommonKeywords(itemName, invItem.name)) {

            // Check for better prices in price history
            if (invItem.priceHistory && invItem.priceHistory.length > 0) {
                invItem.priceHistory.forEach(priceEntry => {
                    if (priceEntry.price < currentPrice) {
                        alternatives.push({
                            name: invItem.name,
                            price: priceEntry.price,
                            store: priceEntry.store,
                            similarity: similarity,
                            savings: currentPrice - priceEntry.price,
                            date: priceEntry.date
                        });
                    }
                });
            }

            // Also check current best price
            if (invItem.currentBestPrice && invItem.currentBestPrice.price < currentPrice) {
                alternatives.push({
                    name: invItem.name,
                    price: invItem.currentBestPrice.price,
                    store: invItem.currentBestPrice.store,
                    similarity: similarity,
                    savings: currentPrice - invItem.currentBestPrice.price,
                    date: invItem.currentBestPrice.date || new Date()
                });
            }
        }
    });

    // Sort by savings (highest first), then by store preference
    return alternatives
        .sort((a, b) => {
            const savingsSort = b.savings - a.savings;
            if (savingsSort !== 0) return savingsSort;

            // Prefer the specified store
            if (preferredStore) {
                const aStoreMatch = a.store === preferredStore ? 1 : 0;
                const bStoreMatch = b.store === preferredStore ? 1 : 0;
                return bStoreMatch - aStoreMatch;
            }

            return b.similarity - a.similarity;
        })
        .slice(0, 3); // Top 3 alternatives
}

function calculateNameSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const a = str1.toLowerCase();
    const b = str2.toLowerCase();

    // Simple similarity check
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.8;

    // Check for common words
    const words1 = a.split(/\s+/);
    const words2 = b.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));

    return commonWords.length / Math.max(words1.length, words2.length);
}

function hasCommonKeywords(str1, str2) {
    const keywords1 = str1.toLowerCase().split(/\s+/);
    const keywords2 = str2.toLowerCase().split(/\s+/);

    // Remove common words that don't help identify the product
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const meaningfulWords1 = keywords1.filter(word =>
        word.length > 2 && !stopWords.includes(word)
    );
    const meaningfulWords2 = keywords2.filter(word =>
        word.length > 2 && !stopWords.includes(word)
    );

    return meaningfulWords1.some(word => meaningfulWords2.includes(word));
}

function getStrategiesUsed(optimizations) {
    const strategies = new Set();

    optimizations.forEach(opt => {
        strategies.add(opt.type);
    });

    const strategyNames = {
        'alternative': 'Cheaper Alternatives',
        'quantity_reduction': 'Quantity Reductions',
        'removal': 'Item Removals'
    };

    return Array.from(strategies).map(strategy => strategyNames[strategy] || strategy);
}