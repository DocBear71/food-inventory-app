// file: /src/app/api/integrations/smart-inventory/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory, Recipe, MealPlan } from '@/lib/models';
import { modalBridge } from '@/lib/modal-bridge';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { action, data } = await request.json();

        let result;

        switch (action) {
            case 'suggest_recipes':
                result = await suggestRecipesFromInventory(data, session.user.id);
                break;
            case 'optimize_inventory':
                result = await optimizeInventoryItems(data, session.user.id);
                break;
            case 'generate_shopping_list':
                result = await generateSmartShoppingList(data, session.user.id);
                break;
            case 'suggest_meal_plan':
                result = await suggestMealPlanFromInventory(data, session.user.id);
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Smart inventory management error:', error);
        return NextResponse.json({
            error: 'Smart inventory operation failed',
            details: error.message
        }, { status: 500 });
    }
}

async function suggestRecipesFromInventory(data, userId) {
    try {
        // Get user's current inventory
        const userInventory = await UserInventory.findOne({ userId: userId });
        if (!userInventory || !userInventory.items.length) {
            return {
                success: false,
                error: 'No inventory items found'
            };
        }

        // Use Modal AI to suggest recipes
        const suggestionResult = await modalBridge.suggestInventoryItems({
            type: 'recipe_suggestions',
            inventory: userInventory.items.map(item => ({
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                expirationDate: item.expirationDate
            })),
            preferences: data.preferences || {},
            userId: userId
        });

        if (!suggestionResult.success) {
            return {
                success: false,
                error: 'Failed to generate recipe suggestions'
            };
        }

        // Match with existing recipes in database
        const existingRecipes = await Recipe.find({
            $or: [
                { createdBy: userId },
                { isPublic: true }
            ]
        });

        const enhancedSuggestions = suggestionResult.suggestions.map(suggestion => {
            // Find matching recipes
            const matchingRecipes = existingRecipes.filter(recipe =>
                recipe.title.toLowerCase().includes(suggestion.name.toLowerCase()) ||
                suggestion.matchingRecipeIds?.includes(recipe._id.toString())
            );

            return {
                ...suggestion,
                matchingRecipes: matchingRecipes,
                hasExistingRecipe: matchingRecipes.length > 0
            };
        });

        return {
            success: true,
            suggestions: enhancedSuggestions,
            inventoryUtilization: suggestionResult.utilization || {},
            method: 'ai_inventory_analysis'
        };
    } catch (error) {
        console.error('Recipe suggestions from inventory failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function optimizeInventoryItems(data, userId) {
    try {
        const userInventory = await UserInventory.findOne({ userId: userId });
        if (!userInventory) {
            return {
                success: false,
                error: 'No inventory found'
            };
        }

        const optimizationResult = await modalBridge.suggestInventoryItems({
            type: 'inventory_optimization',
            inventory: userInventory.items,
            goals: data.goals || ['reduce_waste', 'save_money', 'improve_nutrition'],
            userId: userId
        });

        if (optimizationResult.success) {
            return {
                success: true,
                optimizations: optimizationResult.optimizations,
                wasteReduction: optimizationResult.wasteReduction,
                costSavings: optimizationResult.costSavings,
                nutritionImprovements: optimizationResult.nutritionImprovements,
                method: 'ai_optimization'
            };
        }

        return {
            success: false,
            error: 'Optimization analysis failed'
        };
    } catch (error) {
        console.error('Inventory optimization failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function generateSmartShoppingList(data, userId) {
    try {
        // Get current inventory and meal plans
        const [userInventory, activeMealPlans] = await Promise.all([
            UserInventory.findOne({ userId: userId }),
            MealPlan.find({
                userId: userId,
                isActive: true,
                weekStartDate: {
                    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last week
                }
            }).populate('meals.monday.recipeId meals.tuesday.recipeId meals.wednesday.recipeId meals.thursday.recipeId meals.friday.recipeId meals.saturday.recipeId meals.sunday.recipeId')
        ]);

        const shoppingListResult = await modalBridge.suggestInventoryItems({
            type: 'smart_shopping_list',
            currentInventory: userInventory?.items || [],
            mealPlans: activeMealPlans || [],
            preferences: data.preferences || {},
            budget: data.budget,
            userId: userId
        });

        if (shoppingListResult.success) {
            return {
                success: true,
                shoppingList: shoppingListResult.shoppingList,
                estimatedCost: shoppingListResult.estimatedCost,
                nutritionImpact: shoppingListResult.nutritionImpact,
                alternatives: shoppingListResult.alternatives,
                method: 'ai_smart_shopping'
            };
        }

        return {
            success: false,
            error: 'Smart shopping list generation failed'
        };
    } catch (error) {
        console.error('Smart shopping list generation failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function suggestMealPlanFromInventory(data, userId) {
    try {
        const userInventory = await UserInventory.findOne({ userId: userId });
        if (!userInventory) {
            return {
                success: false,
                error: 'No inventory found for meal planning'
            };
        }

        const mealPlanResult = await modalBridge.suggestInventoryItems({
            type: 'meal_plan_suggestions',
            inventory: userInventory.items,
            preferences: data.preferences || {},
            nutritionGoals: data.nutritionGoals,
            timeframe: data.timeframe || 'week',
            userId: userId
        });

        if (mealPlanResult.success) {
            return {
                success: true,
                mealPlan: mealPlanResult.mealPlan,
                inventoryUtilization: mealPlanResult.utilization,
                nutritionAnalysis: mealPlanResult.nutrition,
                costEstimate: mealPlanResult.cost,
                method: 'ai_meal_planning'
            };
        }

        return {
            success: false,
            error: 'Meal plan suggestion failed'
        };
    } catch (error) {
        console.error('Meal plan suggestion failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
