// file: /src/app/api/recipes/[id]/analyze-nutrition/route.js
// Automatic nutrition analysis for recipes

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';
import { AIRecipeNutritionService } from '@/lib/services/aiNutritionService';

export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: recipeId } = params;

        await connectDB();

        // Get the recipe
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        // Check if user owns the recipe or is admin
        if (recipe.createdBy.toString() !== session.user.id && !session.user.isAdmin) {
            return NextResponse.json({ error: 'Not authorized to analyze this recipe' }, { status: 403 });
        }

        // Check if recipe has ingredients
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            return NextResponse.json({
                error: 'Recipe must have ingredients to analyze nutrition'
            }, { status: 400 });
        }

        console.log(`🤖 Starting AI nutrition analysis for recipe: ${recipe.title}`);

        // Perform AI nutrition analysis
        const aiService = new AIRecipeNutritionService();
        const analysisResult = await aiService.analyzeRecipeNutrition(recipe);

        if (!analysisResult.success) {
            return NextResponse.json({
                error: 'Nutrition analysis failed',
                details: analysisResult.error
            }, { status: 500 });
        }

        // Update the recipe with nutrition data
        const updatedRecipe = await Recipe.findByIdAndUpdate(
            recipeId,
            {
                nutrition: analysisResult.nutrition,
                nutritionCalculatedAt: new Date(),
                nutritionCoverage: analysisResult.metadata.coverage,
                nutritionManuallySet: false,
                'aiAnalysis.nutritionGenerated': true,
                'aiAnalysis.nutritionMetadata': analysisResult.metadata
            },
            { new: true }
        );

        console.log(`✅ Nutrition analysis completed for recipe: ${recipe.title}`);
        console.log(`📊 Coverage: ${Math.round(analysisResult.metadata.coverage * 100)}%`);
        console.log(`💰 Cost: $${analysisResult.metadata.aiAnalysis.cost.toFixed(4)}`);

        return NextResponse.json({
            success: true,
            nutrition: analysisResult.nutrition,
            metadata: analysisResult.metadata,
            message: 'Nutrition analysis completed successfully'
        });

    } catch (error) {
        console.error('Error in nutrition analysis API:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}

// GET route to check if nutrition analysis is needed
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: recipeId } = params;

        await connectDB();

        const recipe = await Recipe.findById(recipeId).select('nutrition nutritionCalculatedAt ingredients');
        if (!recipe) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        const needsAnalysis = !recipe.nutrition ||
            !recipe.nutritionCalculatedAt ||
            recipe.ingredients.length === 0;

        return NextResponse.json({
            success: true,
            needsAnalysis,
            hasNutrition: !!recipe.nutrition,
            lastCalculated: recipe.nutritionCalculatedAt,
            ingredientCount: recipe.ingredients.length
        });

    } catch (error) {
        console.error('Error checking nutrition status:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}