// file: /src/app/api/integrations/nutrition-analysis/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, InventoryItem } from '@/lib/models';
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
            default:
                return NextResponse.json({ error: 'Invalid analysis type' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Nutrition analysis error:', error);
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
            await InventoryItem.findByIdAndUpdate(itemData.itemId, {
                nutrition: nutritionResult.nutrition,
                fdcId: nutritionResult.fdcId,
                nutritionLastCalculated: new Date()
            });
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
