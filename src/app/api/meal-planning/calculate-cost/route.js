// file: /src/app/api/meal-planning/calculate-cost/route.js v1 - Calculate meal costs with price intelligence

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Recipe, UserInventory } from '@/lib/models';

export async function POST(request) {
    try {
        const session = await getEnhancedSession(request);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipeId, servings = 4, includePriceOptimization = true } = await request.json();

        if (!recipeId) {
            return NextResponse.json({
                error: 'Recipe ID is required'
            }, { status: 400 });
        }

        await connectDB();

        // Get the recipe
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return NextResponse.json({
                error: 'Recipe not found'
            }, { status: 404 });
        }

        // Get user's inventory for price data
        const inventory = await UserInventory.findOne({ userId: session.user.id });

        // Calculate recipe cost
        const costCalculation = await calculateRecipeCost(
            recipe,
            servings,
            inventory?.items || [],
            includePriceOptimization
        );

        return NextResponse.json({
            success: true,
            cost: costCalculation.totalCost,
            costPerServing: costCalculation.costPerServing,
            breakdown: costCalculation.breakdown,
            optimization: costCalculation.optimization,
            metadata: {
                recipeId,
                recipeName: recipe.title,
                servings,
                calculatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Meal cost calculation error:', error);
        return NextResponse.json(
            { error: 'Failed to calculate meal cost', details: error.message },
            { status: 500 }
        );
    }
}

async function calculateRecipeCost(recipe, servings, inventory, includePriceOptimization) {
    const breakdown = [];
    let totalCost = 0;
    let optimizedCost = 0;
    let savingsOpportunities = [];

    // Process each ingredient
    for (const ingredient of recipe.ingredients || []) {
        const ingredientCost = await calculateIngredientCost(
            ingredient,
            servings / (recipe.servings || 1), // Scale factor
            inventory,
            includePriceOptimization
        );

        breakdown.push(ingredientCost);
        totalCost += ingredientCost.estimatedCost;
        optimizedCost += ingredientCost.optimizedCost || ingredientCost.estimatedCost;

        if (ingredientCost.savings > 0) {
            savingsOpportunities.push({
                ingredient: ingredient.name,
                currentCost: ingredientCost.estimatedCost,
                optimizedCost: ingredientCost.optimizedCost,
                savings: ingredientCost.savings,
                reason: ingredientCost.savingsReason
            });
        }
    }

    const optimization = {
        totalSavings: totalCost - optimizedCost,
        savingsPercentage: totalCost > 0 ? ((totalCost - optimizedCost) / totalCost * 100) : 0,
        savingsOpportunities,
        recommendations: generateCostOptimizationRecommendations(breakdown, savingsOpportunities)
    };

    return {
        totalCost: parseFloat(totalCost.toFixed(2)),
        optimizedCost: parseFloat(optimizedCost.toFixed(2)),
        costPerServing: parseFloat((totalCost / servings).toFixed(2)),
        optimizedCostPerServing: parseFloat((optimizedCost / servings).toFixed(2)),
        breakdown,
        optimization
    };
}

async function calculateIngredientCost(ingredient, scaleFactor, inventory, includePriceOptimization) {
    const ingredientName = ingredient.name;
    const amount = parseFloat(ingredient.amount) || 1;
    const unit = ingredient.unit || 'item';
    const scaledAmount = amount * scaleFactor;

    // Find matching inventory items
    const matchingInventoryItems = inventory.filter(item =>
        item.name.toLowerCase().includes(ingredientName.toLowerCase()) ||
        ingredientName.toLowerCase().includes(item.name.toLowerCase())
    );

    let estimatedCost = 0;
    let optimizedCost = 0;
    let priceSource = 'estimated';
    let savings = 0;
    let savingsReason = '';

    if (matchingInventoryItems.length > 0) {
        // Use price data from inventory
        const bestMatch = matchingInventoryItems[0];

        if (bestMatch.priceHistory && bestMatch.priceHistory.length > 0) {
            // Use latest price data
            const latestPrice = bestMatch.priceHistory[bestMatch.priceHistory.length - 1];
            const unitCost = latestPrice.unitPrice || (latestPrice.price / (bestMatch.quantity || 1));

            estimatedCost = unitCost * scaledAmount;
            priceSource = 'price_history';

            if (includePriceOptimization) {
                // Check for better prices
                const avgPrice = bestMatch.averagePrice || estimatedCost;
                const currentBestPrice = bestMatch.currentBestPrice?.price;

                if (currentBestPrice && currentBestPrice < avgPrice) {
                    const betterUnitCost = currentBestPrice / (bestMatch.quantity || 1);
                    optimizedCost = betterUnitCost * scaledAmount;
                    savings = estimatedCost - optimizedCost;
                    savingsReason = `${bestMatch.currentBestPrice.store} has better price`;
                } else {
                    optimizedCost = estimatedCost;
                }
            } else {
                optimizedCost = estimatedCost;
            }
        } else {
            // No price history, use category-based estimation
            estimatedCost = estimateIngredientCost(ingredientName, scaledAmount, unit);
            optimizedCost = estimatedCost;
            priceSource = 'category_estimate';
        }
    } else {
        // No inventory match, use category-based estimation
        estimatedCost = estimateIngredientCost(ingredientName, scaledAmount, unit);
        optimizedCost = estimatedCost;
        priceSource = 'category_estimate';
    }

    return {
        ingredient: ingredientName,
        amount: scaledAmount,
        unit,
        estimatedCost: parseFloat(estimatedCost.toFixed(2)),
        optimizedCost: parseFloat(optimizedCost.toFixed(2)),
        savings: parseFloat(savings.toFixed(2)),
        savingsReason,
        priceSource,
        inventoryMatch: matchingInventoryItems.length > 0 ? matchingInventoryItems[0] : null
    };
}

function estimateIngredientCost(ingredientName, amount, unit) {
    // Category-based cost estimation
    const categoryPrices = {
        // Proteins (per lb)
        'chicken': 4.50,
        'beef': 8.00,
        'pork': 5.50,
        'fish': 10.00,
        'salmon': 12.00,
        'turkey': 5.00,
        'eggs': 3.00, // per dozen

        // Dairy (per unit)
        'milk': 3.50, // per gallon
        'cheese': 5.00, // per lb
        'butter': 4.00, // per lb
        'yogurt': 1.00, // per container
        'cream': 2.50, // per pint

        // Produce (per lb unless noted)
        'onion': 1.50,
        'garlic': 4.00,
        'tomato': 3.00,
        'potato': 1.20,
        'carrot': 1.00,
        'bell pepper': 2.50,
        'broccoli': 2.00,
        'spinach': 3.00,
        'lettuce': 2.00,
        'apple': 2.00,
        'banana': 1.50,
        'lemon': 0.75, // per item
        'lime': 0.50, // per item

        // Pantry staples
        'flour': 0.50, // per cup
        'sugar': 0.25, // per cup
        'salt': 0.05, // per tsp
        'pepper': 0.10, // per tsp
        'oil': 0.25, // per tbsp
        'vinegar': 0.15, // per tbsp
        'rice': 0.30, // per cup
        'pasta': 1.00, // per box
        'bread': 2.50, // per loaf

        // Canned/packaged goods
        'beans': 1.50, // per can
        'tomato sauce': 1.00, // per can
        'stock': 2.00, // per container
        'coconut milk': 2.00, // per can
    };

    const ingredientLower = ingredientName.toLowerCase();

    // Find matching category
    let unitPrice = 3.00; // Default fallback price

    for (const [category, price] of Object.entries(categoryPrices)) {
        if (ingredientLower.includes(category) || category.includes(ingredientLower)) {
            unitPrice = price;
            break;
        }
    }

    // Unit conversions and scaling
    let costMultiplier = 1;

    switch (unit.toLowerCase()) {
        case 'cup':
        case 'cups':
            costMultiplier = 0.25; // Assume 4 cups per unit
            break;
        case 'tbsp':
        case 'tablespoon':
        case 'tablespoons':
            costMultiplier = 0.06; // 16 tbsp per cup
            break;
        case 'tsp':
        case 'teaspoon':
        case 'teaspoons':
            costMultiplier = 0.02; // 48 tsp per cup
            break;
        case 'oz':
        case 'ounce':
        case 'ounces':
            costMultiplier = 0.0625; // 16 oz per lb
            break;
        case 'lb':
        case 'pound':
        case 'pounds':
            costMultiplier = 1;
            break;
        case 'item':
        case 'items':
        case 'piece':
        case 'pieces':
            costMultiplier = 1;
            break;
        case 'can':
        case 'cans':
        case 'jar':
        case 'jars':
        case 'bottle':
        case 'bottles':
            costMultiplier = 1;
            break;
        default:
            costMultiplier = 0.5; // Conservative estimate for unknown units
    }

    return unitPrice * costMultiplier * amount;
}

function generateCostOptimizationRecommendations(breakdown, savingsOpportunities) {
    const recommendations = [];

    // Identify most expensive ingredients
    const expensiveIngredients = breakdown
        .filter(item => item.estimatedCost > 5.00)
        .sort((a, b) => b.estimatedCost - a.estimatedCost)
        .slice(0, 3);

    expensiveIngredients.forEach(ingredient => {
        recommendations.push({
            type: 'substitution',
            ingredient: ingredient.ingredient,
            message: `Consider cheaper alternatives for ${ingredient.ingredient} (${ingredient.estimatedCost.toFixed(2)})`,
            impact: 'medium',
            savings: ingredient.estimatedCost * 0.3 // Assume 30% savings potential
        });
    });

    // Bulk buying opportunities
    const bulkOpportunities = breakdown.filter(item =>
        ['rice', 'pasta', 'flour', 'sugar', 'oil'].some(bulk =>
            item.ingredient.toLowerCase().includes(bulk)
        )
    );

    if (bulkOpportunities.length > 0) {
        recommendations.push({
            type: 'bulk_buying',
            message: `Buy pantry staples in bulk for better unit prices`,
            impact: 'low',
            savings: bulkOpportunities.reduce((sum, item) => sum + item.estimatedCost, 0) * 0.15
        });
    }

    // Seasonal produce recommendations
    const produce = breakdown.filter(item =>
        ['tomato', 'pepper', 'broccoli', 'spinach', 'apple', 'banana'].some(prod =>
            item.ingredient.toLowerCase().includes(prod)
        )
    );

    if (produce.length > 0) {
        recommendations.push({
            type: 'seasonal',
            message: `Look for seasonal produce discounts`,
            impact: 'medium',
            savings: produce.reduce((sum, item) => sum + item.estimatedCost, 0) * 0.25
        });
    }

    // Store comparison recommendation
    if (savingsOpportunities.length > 0) {
        recommendations.push({
            type: 'store_comparison',
            message: `Compare prices across stores for key ingredients`,
            impact: 'high',
            savings: savingsOpportunities.reduce((sum, opp) => sum + opp.savings, 0)
        });
    }

    return recommendations;
}