// file: /src/app/api/recipes/import-enhanced/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, User } from '@/lib/models';
import { modalBridge } from '@/lib/modal-bridge';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { source, data } = await request.json();

        let importResult;

        switch (source) {
            case 'social_video':
                importResult = await importFromSocialVideo(data, session.user.id);
                break;
            case 'url':
                importResult = await importFromUrl(data, session.user.id);
                break;
            case 'text':
                importResult = await importFromText(data, session.user.id);
                break;
            default:
                return NextResponse.json({
                    error: 'Invalid import source'
                }, { status: 400 });
        }

        return NextResponse.json(importResult);
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

        // Extract recipe with nutrition analysis using Modal bridge
        const extractionResult = await modalBridge.extractRecipeWithNutrition({
            ...videoData,
            userId: userId
        });

        if (!extractionResult.success) {
            return {
                success: false,
                error: 'Failed to extract recipe from video',
                details: extractionResult.error
            };
        }

        // Process and save recipe
        const recipeData = extractionResult.recipe;

        // Enhanced recipe processing
        const recipe = new Recipe({
            title: recipeData.title || 'Imported Recipe',
            description: recipeData.description || '',
            ingredients: processIngredients(recipeData.ingredients || []),
            instructions: processInstructions(recipeData.instructions || []),
            prepTime: recipeData.prepTime || 0,
            cookTime: recipeData.cookTime || 0,
            servings: recipeData.servings || 4,
            difficulty: recipeData.difficulty || 'medium',
            category: recipeData.category || 'entrees',
            tags: [...(recipeData.tags || []), 'social-media', 'ai-imported'],
            createdBy: userId,
            source: videoData.video_url || 'Social Media Video',
            nutrition: recipeData.nutrition,
            videoMetadata: {
                ...extractionResult.metadata,
                videoSource: videoData.video_url,
                videoPlatform: videoData.platform,
                extractionMethod: 'modal-ai',
                importedAt: new Date()
            },
            isPublic: false
        });

        await recipe.save();

        // Update user's recipe count
        const user = await User.findById(userId);
        if (user) {
            const recipeCount = await Recipe.countDocuments({ createdBy: userId });
            await user.updatePersonalRecipeCount(recipeCount);
        }

        // Generate inventory suggestions based on recipe ingredients
        let inventorySuggestions = null;
        try {
            const suggestionResult = await modalBridge.suggestInventoryItems({
                type: 'ingredient_optimization',
                recipeIngredients: recipe.ingredients,
                userId: userId
            });

            if (suggestionResult.success) {
                inventorySuggestions = {
                    missing: suggestionResult.missing || [],
                    substitutions: suggestionResult.substitutions || [],
                    shoppingList: suggestionResult.shoppingList || []
                };
            }
        } catch (error) {
            console.warn('Inventory suggestions failed:', error);
        }

        return {
            success: true,
            recipe: {
                _id: recipe._id,
                title: recipe.title,
                description: recipe.description,
                ingredients: recipe.ingredients,
                instructions: recipe.instructions,
                nutrition: recipe.nutrition,
                tags: recipe.tags,
                videoMetadata: recipe.videoMetadata
            },
            inventorySuggestions,
            nutritionAnalysis: recipeData.nutritionAnalysis || null,
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

async function importFromUrl(urlData, userId) {
    try {
        console.log('🌐 Importing recipe from URL...');

        // Use existing recipe scraping with enhanced nutrition
        const response = await fetch('/api/recipes/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: urlData.url })
        });

        const scrapeResult = await response.json();

        if (!scrapeResult.success) {
            return {
                success: false,
                error: 'Failed to scrape recipe from URL'
            };
        }

        // Enhance with nutrition analysis
        const nutritionResult = await modalBridge.analyzeNutrition({
            type: 'recipe',
            recipe: scrapeResult.recipe,
            userId: userId,
            analysis_level: 'comprehensive'
        });

        const recipe = new Recipe({
            ...scrapeResult.recipe,
            createdBy: userId,
            nutrition: nutritionResult.success ? nutritionResult.nutrition : null,
            tags: [...(scrapeResult.recipe.tags || []), 'url-import', 'ai-enhanced'],
            isPublic: false
        });

        await recipe.save();

        return {
            success: true,
            recipe: recipe,
            nutritionAnalysis: nutritionResult.analysis || null,
            method: 'url_import'
        };
    } catch (error) {
        console.error('URL import failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function importFromText(textData, userId) {
    try {
        console.log('📝 Importing recipe from text...');

        // Parse text using AI
        const parseResult = await modalBridge.analyzeNutrition({
            type: 'text_parsing',
            text: textData.text,
            userId: userId
        });

        if (!parseResult.success) {
            return {
                success: false,
                error: 'Failed to parse recipe from text'
            };
        }

        const recipe = new Recipe({
            ...parseResult.recipe,
            createdBy: userId,
            nutrition: parseResult.nutrition,
            tags: [...(parseResult.recipe.tags || []), 'text-import', 'ai-parsed'],
            isPublic: false
        });

        await recipe.save();

        return {
            success: true,
            recipe: recipe,
            method: 'text_import'
        };
    } catch (error) {
        console.error('Text import failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

function processIngredients(ingredients) {
    return ingredients.map(ingredient => {
        if (typeof ingredient === 'string') {
            // Parse string format: "1 cup flour"
            const parts = ingredient.trim().split(' ');
            const amount = parts[0];
            const unit = parts[1];
            const name = parts.slice(2).join(' ');

            return {
                name: name || ingredient,
                amount: amount || '',
                unit: unit || '',
                optional: false
            };
        }

        return {
            name: ingredient.name || ingredient.item || '',
            amount: ingredient.amount || ingredient.quantity || '',
            unit: ingredient.unit || '',
            optional: ingredient.optional || false,
            category: ingredient.category || '',
            alternatives: ingredient.alternatives || []
        };
    });
}

function processInstructions(instructions) {
    return instructions.map((instruction, index) => {
        if (typeof instruction === 'string') {
            return {
                step: index + 1,
                text: instruction.trim(),
                time: null,
                temperature: null
            };
        }

        return {
            step: instruction.step || index + 1,
            text: instruction.text || instruction.instruction || '',
            time: instruction.time || null,
            temperature: instruction.temperature || null
        };
    });
}