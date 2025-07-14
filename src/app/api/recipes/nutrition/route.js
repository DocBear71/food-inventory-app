// file: /src/app/api/recipes/nutrition/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';
import { NutritionService } from '@/lib/services/nutritionService';

// GET - Get nutrition information for a recipe
export async function GET(request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const recipe = await Recipe.findOne({
            _id: recipeId,
            $or: [
                { createdBy: session.user.id },
                { isPublic: true }
            ]
        });

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        // Check if nutrition is already calculated and cached
        if (recipe.nutrition && recipe.nutritionCalculatedAt) {
            const calculatedAgo = Date.now() - new Date(recipe.nutritionCalculatedAt).getTime();
            const oneWeekAgo = 7 * 24 * 60 * 60 * 1000;

            // Return cached nutrition if calculated within the last week
            if (calculatedAgo < oneWeekAgo) {
                return NextResponse.json({
                    success: true,
                    nutrition: recipe.nutrition,
                    servings: recipe.servings || 1,
                    cached: true,
                    calculatedAt: recipe.nutritionCalculatedAt
                });
            }
        }

        // Calculate nutrition for the recipe
        console.log('Calculating nutrition for recipe:', recipe.title);
        const nutritionResult = await NutritionService.calculateRecipeNutrition(recipe.ingredients || []);

        if (nutritionResult.success) {
            // Cache the nutrition data in the recipe
            recipe.nutrition = nutritionResult.nutrition;
            recipe.nutritionCalculatedAt = new Date();
            recipe.nutritionCoverage = nutritionResult.coverage;
            await recipe.save();

            return NextResponse.json({
                success: true,
                nutrition: nutritionResult.nutrition,
                servings: recipe.servings || 1,
                coverage: nutritionResult.coverage,
                foundIngredients: nutritionResult.foundIngredients,
                totalIngredients: nutritionResult.totalIngredients,
                cached: false,
                calculatedAt: recipe.nutritionCalculatedAt
            });
        } else {
            return NextResponse.json({
                success: false,
                error: nutritionResult.error || 'Failed to calculate nutrition',
                nutrition: NutritionService.getEmptyNutritionProfile()
            });
        }

    } catch (error) {
        console.error('Recipe nutrition API error:', error);
        return NextResponse.json(
            { error: 'Failed to get recipe nutrition' },
            { status: 500 }
        );
    }
}

// POST - Manually update nutrition for a recipe
export async function POST(request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipeId, nutrition } = await request.json();

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const recipe = await Recipe.findOne({
            _id: recipeId,
            createdBy: session.user.id // Only recipe owner can update nutrition
        });

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found or you do not have permission to edit it' },
                { status: 404 }
            );
        }

        // Update nutrition data
        recipe.nutrition = nutrition || NutritionService.getEmptyNutritionProfile();
        recipe.nutritionCalculatedAt = new Date();
        recipe.nutritionManuallySet = true; // Flag to indicate manual override
        await recipe.save();

        return NextResponse.json({
            success: true,
            message: 'Recipe nutrition updated successfully',
            nutrition: recipe.nutrition
        });

    } catch (error) {
        console.error('Recipe nutrition update error:', error);
        return NextResponse.json(
            { error: 'Failed to update recipe nutrition' },
            { status: 500 }
        );
    }
}

// DELETE - Clear cached nutrition data for a recipe (force recalculation)
export async function DELETE(request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const recipe = await Recipe.findOne({
            _id: recipeId,
            createdBy: session.user.id
        });

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found or you do not have permission to edit it' },
                { status: 404 }
            );
        }

        // Clear nutrition cache
        recipe.nutrition = undefined;
        recipe.nutritionCalculatedAt = undefined;
        recipe.nutritionCoverage = undefined;
        recipe.nutritionManuallySet = undefined;
        await recipe.save();

        return NextResponse.json({
            success: true,
            message: 'Recipe nutrition cache cleared successfully'
        });

    } catch (error) {
        console.error('Recipe nutrition clear error:', error);
        return NextResponse.json(
            { error: 'Failed to clear recipe nutrition cache' },
            { status: 500 }
        );
    }
}