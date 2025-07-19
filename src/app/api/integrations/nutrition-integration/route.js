// file: /src/app/api/integrations/nutrition-integration/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, InventoryItem, UserInventory, User } from '@/lib/models';
import { modalBridge } from '@/lib/modal-bridge';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { type, data } = await request.json();

        let result;

        switch (type) {
            case 'recipe':
                result = await analyzeRecipeNutrition(data, session.user.id);
                break;
            case 'inventory_item':
                result = await analyzeInventoryItemNutrition(data, session.user.id);
                break;
            case 'ingredients_list':
                result = await analyzeIngredientsNutrition(data, session.user.id);
                break;
            case 'bulk_inventory':
                result = await bulkAnalyzeInventory(data, session.user.id);
                break;
            default:
                return NextResponse.json({ error: 'Invalid analysis type' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Nutrition integration error:', error);
        return NextResponse.json({
            error: 'Nutrition analysis failed',
            details: error.message
        }, { status: 500 });
    }
}

async function analyzeRecipeNutrition(recipeData, userId) {
    try {
        const nutritionResult = await modalBridge.analyzeNutrition({
            type: 'recipe',
            recipe: recipeData,
            userId: userId,
            analysis_level: 'comprehensive'
        });

        if (nutritionResult.success && recipeData.recipeId) {
            // Save nutrition data to recipe
            await Recipe.findByIdAndUpdate(recipeData.recipeId, {
                nutrition: nutritionResult.nutrition,
                nutritionCalculatedAt: new Date(),
                nutritionCoverage: nutritionResult.coverage || 0
            });
        }

        return {
            success: true,
            nutrition: nutritionResult.nutrition,
            analysis: nutritionResult.analysis,
            method: 'modal_ai_analysis'
        };
    } catch (error) {
        console.error('Recipe nutrition analysis failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function analyzeInventoryItemNutrition(itemData, userId) {
    try {
        const nutritionResult = await modalBridge.analyzeNutrition({
            type: 'inventory_item',
            item: itemData,
            userId: userId,
            analysis_level: 'standard'
        });

        if (nutritionResult.success && itemData.itemId) {
            // Update inventory item with nutrition data
            const userInventory = await UserInventory.findOne({ userId });
            if (userInventory) {
                const itemIndex = userInventory.items.findIndex(item =>
                    item._id.toString() === itemData.itemId.toString()
                );

                if (itemIndex !== -1) {
                    userInventory.items[itemIndex].nutrition = nutritionResult.nutrition;
                    userInventory.items[itemIndex].nutritionLastCalculated = new Date();
                    await userInventory.save();
                }
            }
        }

        return {
            success: true,
            nutrition: nutritionResult.nutrition,
            confidence: nutritionResult.confidence,
            method: 'modal_ai_analysis'
        };
    } catch (error) {
        console.error('Inventory item nutrition analysis failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function analyzeIngredientsNutrition(ingredientsData, userId) {
    try {
        const nutritionResult = await modalBridge.analyzeNutrition({
            type: 'ingredients_list',
            ingredients: ingredientsData.ingredients,
            servings: ingredientsData.servings || 1,
            userId: userId,
            analysis_level: 'comprehensive'
        });

        return {
            success: true,
            totalNutrition: nutritionResult.totalNutrition,
            perServingNutrition: nutritionResult.perServingNutrition,
            ingredientBreakdown: nutritionResult.ingredientBreakdown,
            method: 'modal_ai_analysis'
        };
    } catch (error) {
        console.error('Ingredients nutrition analysis failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function bulkAnalyzeInventory(data, userId) {
    try {
        const userInventory = await UserInventory.findOne({ userId });
        if (!userInventory) {
            return {
                success: false,
                error: 'No inventory found'
            };
        }

        const itemsToAnalyze = userInventory.items.filter(item => !item.nutrition);
        const results = [];
        const batchSize = 5;

        for (let i = 0; i < itemsToAnalyze.length; i += batchSize) {
            const batch = itemsToAnalyze.slice(i, i + batchSize);

            const batchPromises = batch.map(async (item) => {
                try {
                    const result = await modalBridge.analyzeNutrition({
                        type: 'inventory_item',
                        item: {
                            name: item.name,
                            brand: item.brand,
                            category: item.category,
                            quantity: item.quantity,
                            unit: item.unit
                        },
                        userId: userId
                    });

                    if (result.success) {
                        const itemIndex = userInventory.items.findIndex(invItem =>
                            invItem._id.toString() === item._id.toString()
                        );

                        if (itemIndex !== -1) {
                            userInventory.items[itemIndex].nutrition = result.nutrition;
                            userInventory.items[itemIndex].nutritionLastCalculated = new Date();
                        }
                    }

                    return {
                        itemId: item._id,
                        itemName: item.name,
                        success: result.success,
                        nutrition: result.nutrition,
                        error: result.error
                    };
                } catch (error) {
                    return {
                        itemId: item._id,
                        itemName: item.name,
                        success: false,
                        error: error.message
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Small delay between batches
            if (i + batchSize < itemsToAnalyze.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        await userInventory.save();

        return {
            success: true,
            analyzed: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results: results
        };
    } catch (error) {
        console.error('Bulk inventory analysis failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // Fetch comprehensive nutrition dashboard data
        const dashboardData = await getDashboardData(session.user.id);

        return NextResponse.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('Nutrition dashboard GET error:', error);
        return NextResponse.json({
            error: 'Failed to fetch nutrition dashboard data',
            details: error.message
        }, { status: 500 });
    }
}

async function getDashboardData(userId) {
    try {
        // Get user's inventory
        const userInventory = await UserInventory.findOne({ userId }).populate('items');

        // Get user's recipes with nutrition data
        const recipes = await Recipe.find({ createdBy: userId, nutrition: { $exists: true } });

        // Get user for nutrition goals
        const user = await User.findById(userId);

        // Calculate summary statistics
        const inventoryWithNutrition = userInventory?.items?.filter(item => item.nutrition) || [];
        const recipesWithNutrition = recipes.filter(recipe => recipe.nutrition);

        return {
            overview: {
                totalInventoryItems: userInventory?.items?.length || 0,
                itemsWithNutrition: inventoryWithNutrition.length,
                totalRecipes: recipes.length,
                recipesWithNutrition: recipesWithNutrition.length,
                nutritionCoverage: userInventory?.items?.length > 0 ?
                    Math.round((inventoryWithNutrition.length / userInventory.items.length) * 100) : 0
            },
            inventory: {
                items: inventoryWithNutrition,
                totalItems: userInventory?.items?.length || 0,
                lastUpdated: userInventory?.lastUpdated
            },
            recipes: {
                items: recipesWithNutrition,
                totalRecipes: recipes.length
            },
            goals: {
                dailyCalories: user?.nutritionGoals?.dailyCalories || 2000,
                protein: user?.nutritionGoals?.protein || 150,
                carbs: user?.nutritionGoals?.carbs || 250,
                fat: user?.nutritionGoals?.fat || 65,
                fiber: user?.nutritionGoals?.fiber || 25,
                sodium: user?.nutritionGoals?.sodium || 2300
            },
            mealPlans: {
                // Add meal plan nutrition data if you have meal plans
                totalPlans: 0,
                activePlans: 0
            }
        };
    } catch (error) {
        console.error('Error getting dashboard data:', error);
        return {
            overview: { totalInventoryItems: 0, itemsWithNutrition: 0, totalRecipes: 0, recipesWithNutrition: 0, nutritionCoverage: 0 },
            inventory: { items: [], totalItems: 0 },
            recipes: { items: [], totalRecipes: 0 },
            goals: { dailyCalories: 2000, protein: 150, carbs: 250, fat: 65, fiber: 25, sodium: 2300 },
            mealPlans: { totalPlans: 0, activePlans: 0 }
        };
    }
}