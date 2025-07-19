// file: /src/app/api/shopping/smart-generate/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory, MealPlan, User } from '@/lib/models';
import { modalBridge } from '@/lib/modal-bridge';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const {
            mealPlanIds = [],
            preferences = {},
            budget = null,
            timeframe = 'week'
        } = await request.json();

        // Get user data
        const [user, userInventory, mealPlans] = await Promise.all([
            User.findById(session.user.id).select('mealPlanningPreferences nutritionGoals'),
            UserInventory.findOne({ userId: session.user.id }),
            mealPlanIds.length > 0
                ? MealPlan.find({ _id: { $in: mealPlanIds }, userId: session.user.id })
                    .populate('meals.monday.recipeId meals.tuesday.recipeId meals.wednesday.recipeId meals.thursday.recipeId meals.friday.recipeId meals.saturday.recipeId meals.sunday.recipeId')
                : MealPlan.find({
                    userId: session.user.id,
                    isActive: true,
                    weekStartDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                })
                    .populate('meals.monday.recipeId meals.tuesday.recipeId meals.wednesday.recipeId meals.thursday.recipeId meals.friday.recipeId meals.saturday.recipeId meals.sunday.recipeId')
                    .limit(2)
        ]);

        // Prepare data for AI analysis
        const requestData = {
            currentInventory: userInventory?.items || [],
            mealPlans: mealPlans.map(plan => ({
                _id: plan._id,
                name: plan.name,
                weekStartDate: plan.weekStartDate,
                meals: plan.meals
            })),
            preferences: {
                ...user?.mealPlanningPreferences,
                ...preferences
            },
            nutritionGoals: user?.nutritionGoals,
            budget: budget,
            timeframe: timeframe
        };

        // Generate smart shopping list using AI
        const shoppingResult = await modalBridge.suggestInventoryItems({
            type: 'smart_shopping_list',
            ...requestData,
            userId: session.user.id
        });

        if (!shoppingResult.success) {
            return NextResponse.json({
                success: false,
                error: 'Failed to generate smart shopping list',
                details: shoppingResult.error
            });
        }

        // Process and enhance the shopping list
        const enhancedShoppingList = await enhanceShoppingList(
            shoppingResult.shoppingList || [],
            userInventory?.items || [],
            user?.currencyPreferences
        );

        return NextResponse.json({
            success: true,
            shoppingList: enhancedShoppingList,
            estimatedCost: shoppingResult.estimatedCost || {},
            nutritionImpact: shoppingResult.nutritionImpact || {},
            alternatives: shoppingResult.alternatives || {},
            smartSuggestions: shoppingResult.smartSuggestions || [],
            metadata: {
                generatedAt: new Date(),
                basedOnMealPlans: mealPlans.length,
                inventoryItems: userInventory?.items?.length || 0,
                method: 'ai_smart_shopping'
            }
        });
    } catch (error) {
        console.error('Smart shopping list generation error:', error);
        return NextResponse.json({
            error: 'Smart shopping list generation failed',
            details: error.message
        }, { status: 500 });
    }
}

async function enhanceShoppingList(shoppingList, inventoryItems, currencyPreferences) {
    // Group by category for better organization
    const categorizedList = {};

    shoppingList.forEach(item => {
        const category = item.category || 'Other';
        if (!categorizedList[category]) {
            categorizedList[category] = [];
        }

        // Check if item is already in inventory
        const inventoryMatch = inventoryItems.find(invItem =>
            invItem.name.toLowerCase().includes(item.item.toLowerCase()) ||
            item.item.toLowerCase().includes(invItem.name.toLowerCase())
        );

        const enhancedItem = {
            ...item,
            inInventory: !!inventoryMatch,
            inventoryQuantity: inventoryMatch ? `${inventoryMatch.quantity} ${inventoryMatch.unit}` : null,
            needToBuy: !inventoryMatch,
            priority: item.priority || (inventoryMatch ? 'low' : 'medium'),
            // Add currency formatting
            formattedPrice: formatPrice(item.estimatedPrice, currencyPreferences)
        };

        categorizedList[category].push(enhancedItem);
    });

    // Sort categories by importance
    const categoryPriority = {
        'Fresh Vegetables': 1,
        'Fresh Fruits': 2,
        'Fresh/Frozen Poultry': 3,
        'Fresh/Frozen Beef': 4,
        'Fresh/Frozen Fish & Seafood': 5,
        'Dairy': 6,
        'Grains & Cereals': 7,
        'Pantry Staples': 8,
        'Other': 99
    };

    const sortedCategories = Object.keys(categorizedList).sort((a, b) => {
        return (categoryPriority[a] || 50) - (categoryPriority[b] || 50);
    });

    return sortedCategories.map(category => ({
        category,
        items: categorizedList[category].sort((a, b) => {
            // Sort by priority within category
            const priorityOrder = { high: 1, medium: 2, low: 3 };
            return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        })
    }));
}

function formatPrice(price, currencyPreferences) {
    if (!price || typeof price !== 'number') return null;

    const currency = currencyPreferences?.currency || 'USD';
    const symbol = currencyPreferences?.currencySymbol || '$';
    const position = currencyPreferences?.currencyPosition || 'before';
    const decimals = currencyPreferences?.decimalPlaces || 2;

    const formattedAmount = price.toFixed(decimals);

    return position === 'before'
        ? `${symbol}${formattedAmount}`
        : `${formattedAmount}${symbol}`;
}
