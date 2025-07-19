// file: /src/app/api/integrations/enhanced-recipe-import/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, UserInventory, User } from '@/lib/models';
import { modalBridge } from '@/lib/modal-bridge';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { source, data } = await request.json();

        let result;

        switch (source) {
            case 'social_video':
                result = await importFromSocialVideo(data, session.user.id);
                break;
            case 'receipt_items':
                result = await importFromReceiptItems(data, session.user.id);
                break;
            case 'url':
                result = await importFromUrl(data, session.user.id);
                break;
            default:
                return NextResponse.json({ error: 'Invalid import source' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Enhanced recipe import error:', error);
        return NextResponse.json({
            error: 'Recipe import failed',
            details: error.message
        }, { status: 500 });
    }
}

async function importFromSocialVideo(videoData, userId) {
    try {
        console.log('🎬 Importing recipe from social video...');

        // Extract recipe with nutrition analysis
        const extractionResult = await modalBridge.extractRecipeWithNutrition({
            ...videoData,
            userId: userId
        });

        if (!extractionResult.success) {
            return {
                success: false,
                error: 'Failed to extract recipe from video'
            };
        }

        // Save recipe to database
        const recipe = new Recipe({
            ...extractionResult.recipe,
            createdBy: userId,
            source: videoData.video_url,
            videoMetadata: extractionResult.metadata,
            isPublic: false
        });

        await recipe.save();

        // Generate inventory suggestions
        const inventorySuggestions = await generateInventorySuggestions(
            extractionResult.recipe.ingredients,
            userId
        );

        // Update user's recipe count
        const user = await User.findById(userId);
        if (user) {
            await user.updatePersonalRecipeCount(
                await Recipe.countDocuments({ createdBy: userId })
            );
        }

        return {
            success: true,
            recipe: recipe,
            inventorySuggestions: inventorySuggestions,
            nutritionAnalysis: extractionResult.recipe.nutritionAnalysis,
            method: 'social_video_import'
        };
    } catch (error) {
        console.error('Social video import failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function importFromReceiptItems(receiptData, userId) {
    try {
        console.log('🧾 Generating recipes from receipt items...');

        // Use Modal AI to suggest recipes based on purchased items
        const recipeResult = await modalBridge.suggestInventoryItems({
            type: 'recipe_suggestions',
            items: receiptData.items,
            userId: userId,
            preferences: receiptData.userPreferences || {}
        });

        if (!recipeResult.success) {
            return {
                success: false,
                error: 'Failed to generate recipe suggestions from receipt'
            };
        }

        const savedRecipes = [];

        // Save each suggested recipe
        for (const suggestedRecipe of recipeResult.suggestions) {
            // Analyze nutrition for each recipe
            const nutritionResult = await modalBridge.analyzeNutrition({
                type: 'recipe',
                recipe: suggestedRecipe,
                userId: userId
            });

            const recipe = new Recipe({
                ...suggestedRecipe,
                createdBy: userId,
                source: `Generated from receipt items`,
                nutrition: nutritionResult.success ? nutritionResult.nutrition : null,
                isPublic: false,
                tags: [...(suggestedRecipe.tags || []), 'receipt-generated', 'ai-suggested']
            });

            await recipe.save();
            savedRecipes.push(recipe);
        }

        return {
            success: true,
            recipes: savedRecipes,
            totalSuggestions: recipeResult.suggestions.length,
            method: 'receipt_item_import'
        };
    } catch (error) {
        console.error('Receipt items import failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function generateInventorySuggestions(ingredients, userId) {
    try {
        // Get user's current inventory
        const userInventory = await UserInventory.findOne({ userId: userId });
        const currentItems = userInventory?.items || [];

        // Use Modal AI to generate smart inventory suggestions
        const suggestionResult = await modalBridge.suggestInventoryItems({
            type: 'ingredient_optimization',
            recipeIngredients: ingredients,
            currentInventory: currentItems.map(item => ({
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit
            })),
            userId: userId
        });

        if (suggestionResult.success) {
            return {
                missingIngredients: suggestionResult.missing || [],
                substitutions: suggestionResult.substitutions || [],
                shoppingListItems: suggestionResult.shoppingList || [],
                optimizations: suggestionResult.optimizations || []
            };
        }

        return {
            missingIngredients: ingredients.map(ing => ({ name: ing.name, needed: true })),
            substitutions: [],
            shoppingListItems: [],
            optimizations: []
        };
    } catch (error) {
        console.error('Inventory suggestions failed:', error);
        return {
            missingIngredients: [],
            substitutions: [],
            shoppingListItems: [],
            optimizations: []
        };
    }
}
