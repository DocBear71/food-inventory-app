// file: /src/app/api/recipes/[id]/analyze-nutrition/route.js
// Dedicated endpoint for AI nutrition analysis

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Recipe, User } from '@/lib/models';
import { AIRecipeNutritionService } from '@/lib/services/aiNutritionService';

// POST - Analyze nutrition for a specific recipe
export async function POST(request, { params }) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            console.log('POST /api/recipes/[id]/analyze-nutrition - No session found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('POST /api/recipes/[id]/analyze-nutrition - Session found:', session.user.email);

        const { id: recipeId } = params;
        const body = await request.json();
        const { forceAnalysis = false, includeDetails = false } = body;

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Find recipe and verify ownership
        const recipe = await Recipe.findOne({
            _id: recipeId,
            createdBy: session.user.id
        });

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found or you do not have permission to analyze it' },
                { status: 404 }
            );
        }

        // Check if user has subscription for AI nutrition
        const user = await User.findById(session.user.id);
        const userTier = user?.getEffectiveTier() || 'free';

        if (userTier === 'free') {
            return NextResponse.json({
                error: 'AI nutrition analysis requires Gold+ subscription',
                code: 'FEATURE_NOT_AVAILABLE',
                feature: 'ai_nutrition',
                currentTier: userTier,
                requiredTier: 'gold',
                upgradeUrl: '/pricing?source=ai-nutrition&feature=ai_nutrition&required=gold'
            }, { status: 403 });
        }

        // Check if AI nutrition analysis is enabled
        if (!process.env.OPENAI_API_KEY || process.env.ENABLE_AI_NUTRITION !== 'true') {
            return NextResponse.json({
                error: 'AI nutrition analysis is currently unavailable',
                code: 'SERVICE_UNAVAILABLE'
            }, { status: 503 });
        }

        // Validate recipe has ingredients
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            return NextResponse.json({
                error: 'Recipe must have ingredients to analyze nutrition',
                code: 'MISSING_INGREDIENTS'
            }, { status: 400 });
        }

        console.log(`🤖 Starting forced AI nutrition analysis for recipe: ${recipe.title}`);
        console.log(`📊 Recipe has ${recipe.ingredients.length} ingredients`);

        const startTime = Date.now();

        try {
            const aiService = new AIRecipeNutritionService();
            const analysisResult = await aiService.analyzeRecipeNutrition(recipe);

            const processingTime = Date.now() - startTime;

            if (analysisResult.success) {
                // Update recipe with new nutrition data
                const updateData = {
                    nutrition: analysisResult.nutrition,
                    nutritionCalculatedAt: new Date(),
                    nutritionCoverage: analysisResult.metadata.coverage,
                    nutritionManuallySet: false, // Mark as AI-generated
                    'aiAnalysis.nutritionGenerated': true,
                    'aiAnalysis.nutritionMetadata': {
                        ...analysisResult.metadata,
                        processingTime,
                        forcedAnalysis: true,
                        analyzedAt: new Date()
                    },
                    updatedAt: new Date()
                };

                await Recipe.findByIdAndUpdate(recipeId, updateData);

                console.log(`✅ AI nutrition analysis completed in ${processingTime}ms`);
                console.log(`📊 Coverage: ${Math.round(analysisResult.metadata.coverage * 100)}%`);
                console.log(`💰 Cost: $${analysisResult.metadata.aiAnalysis?.cost?.toFixed(4) || '0.0000'}`);

                return NextResponse.json({
                    success: true,
                    message: 'Nutrition analysis completed successfully',
                    nutrition: analysisResult.nutrition,
                    analysisResult: {
                        ...analysisResult.metadata,
                        processingTime,
                        forcedAnalysis: true
                    },
                    // Include detailed breakdown if requested
                    ...(includeDetails && {
                        details: {
                            ingredientBreakdown: analysisResult.ingredientBreakdown,
                            dataSourcesUsed: analysisResult.dataSourcesUsed,
                            cookingAdjustments: analysisResult.cookingAdjustments
                        }
                    })
                });

            } else {
                console.log(`❌ AI nutrition analysis failed: ${analysisResult.error}`);

                return NextResponse.json({
                    success: false,
                    error: analysisResult.error || 'AI analysis failed',
                    code: 'ANALYSIS_FAILED',
                    processingTime
                }, { status: 500 });
            }

        } catch (analysisError) {
            const processingTime = Date.now() - startTime;
            console.error('❌ AI nutrition analysis error:', analysisError);

            return NextResponse.json({
                success: false,
                error: 'AI analysis encountered an error',
                code: 'ANALYSIS_ERROR',
                details: analysisError.message,
                processingTime
            }, { status: 500 });
        }

    } catch (error) {
        console.error('POST /api/recipes/[id]/analyze-nutrition error:', error);
        return NextResponse.json(
            {
                error: 'Failed to analyze nutrition',
                code: 'SERVER_ERROR',
                details: error.message
            },
            { status: 500 }
        );
    }
}

// GET - Get current nutrition analysis status/metadata
export async function GET(request, { params }) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: recipeId } = params;

        await connectDB();

        const recipe = await Recipe.findOne({
            _id: recipeId,
            createdBy: session.user.id
        }, {
            nutrition: 1,
            nutritionCalculatedAt: 1,
            nutritionCoverage: 1,
            nutritionManuallySet: 1,
            'aiAnalysis.nutritionMetadata': 1
        });

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            hasNutrition: !!(recipe.nutrition && Object.keys(recipe.nutrition).length > 0),
            nutritionCalculatedAt: recipe.nutritionCalculatedAt,
            nutritionCoverage: recipe.nutritionCoverage,
            isManuallySet: recipe.nutritionManuallySet,
            aiMetadata: recipe.aiAnalysis?.nutritionMetadata,
            canAnalyze: !!(recipe.ingredients && recipe.ingredients.length > 0)
        });

    } catch (error) {
        console.error('GET /api/recipes/[id]/analyze-nutrition error:', error);
        return NextResponse.json(
            { error: 'Failed to get nutrition status' },
            { status: 500 }
        );
    }
}