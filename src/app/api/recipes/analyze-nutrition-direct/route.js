// file: /src/app/api/recipes/analyze-nutrition-direct/route.js
// Direct nutrition analysis for unsaved recipes (including multi-part)

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { AIRecipeNutritionService } from '@/lib/services/aiNutritionService';

// POST - Analyze nutrition for unsaved recipe data
export async function POST(request) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            console.log('POST /api/recipes/analyze-nutrition-direct - No session found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('POST /api/recipes/analyze-nutrition-direct - Session found:', session.user.email);

        const body = await request.json();
        const { recipe, includeDetails = false } = body;

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe data is required' },
                { status: 400 }
            );
        }

        await connectDB();

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

        // FIXED: Handle multi-part recipes - extract all ingredients
        let allIngredients = [];

        if (recipe.isMultiPart && recipe.parts && Array.isArray(recipe.parts)) {
            console.log(`📋 Processing multi-part recipe with ${recipe.parts.length} parts`);

            // Flatten ingredients from all parts
            allIngredients = recipe.parts.reduce((acc, part, partIndex) => {
                const partIngredients = (part.ingredients || [])
                    .filter(ing => ing.name && ing.name.trim())
                    .map(ing => ({
                        ...ing,
                        partName: part.name || `Part ${partIndex + 1}`,
                        partIndex
                    }));

                console.log(`📋 Part ${partIndex + 1} (${part.name}): ${partIngredients.length} ingredients`);
                return [...acc, ...partIngredients];
            }, []);
        } else {
            // Single-part recipe
            allIngredients = (recipe.ingredients || []).filter(ing => ing.name && ing.name.trim());
            console.log(`📋 Processing single-part recipe with ${allIngredients.length} ingredients`);
        }

        // Validate recipe has ingredients
        if (allIngredients.length === 0) {
            return NextResponse.json({
                error: 'Recipe must have ingredients to analyze nutrition',
                code: 'MISSING_INGREDIENTS'
            }, { status: 400 });
        }

        console.log(`🤖 Starting direct AI nutrition analysis for: ${recipe.title || 'Unsaved Recipe'}`);
        console.log(`📊 Total ingredients across all parts: ${allIngredients.length}`);

        const startTime = Date.now();

        try {
            // Create a normalized recipe object for analysis
            const recipeForAnalysis = {
                title: recipe.title || 'Unsaved Recipe',
                ingredients: allIngredients, // Use flattened ingredients
                instructions: recipe.instructions || [],
                servings: recipe.servings || 4,
                cookTime: recipe.cookTime,
                prepTime: recipe.prepTime,
                isMultiPart: recipe.isMultiPart || false,
                parts: recipe.parts || []
            };

            const aiService = new AIRecipeNutritionService();
            const analysisResult = await aiService.analyzeRecipeNutrition(recipeForAnalysis);

            const processingTime = Date.now() - startTime;

            if (analysisResult.success) {
                console.log(`✅ Direct AI nutrition analysis completed in ${processingTime}ms`);
                console.log(`📊 Coverage: ${Math.round(analysisResult.metadata.coverage * 100)}%`);
                console.log(`💰 Cost: $${analysisResult.metadata.aiAnalysis?.cost?.toFixed(4) || '0.0000'}`);

                return NextResponse.json({
                    success: true,
                    message: 'Nutrition analysis completed successfully',
                    nutrition: analysisResult.nutrition,
                    analysisResult: {
                        ...analysisResult.metadata,
                        processingTime,
                        directAnalysis: true,
                        multiPart: recipe.isMultiPart || false,
                        totalParts: recipe.parts?.length || (recipe.isMultiPart ? 0 : 1),
                        totalIngredients: allIngredients.length
                    },
                    // Include detailed breakdown if requested
                    ...(includeDetails && {
                        details: {
                            ingredientBreakdown: analysisResult.ingredientBreakdown,
                            dataSourcesUsed: analysisResult.dataSourcesUsed,
                            cookingAdjustments: analysisResult.cookingAdjustments,
                            partBreakdown: recipe.isMultiPart ? recipe.parts.map((part, index) => ({
                                partName: part.name || `Part ${index + 1}`,
                                ingredientCount: (part.ingredients || []).filter(ing => ing.name && ing.name.trim()).length
                            })) : null
                        }
                    })
                });

            } else {
                console.log(`❌ Direct AI nutrition analysis failed: ${analysisResult.error}`);

                return NextResponse.json({
                    success: false,
                    error: analysisResult.error || 'AI analysis failed',
                    code: 'ANALYSIS_FAILED',
                    processingTime
                }, { status: 500 });
            }

        } catch (analysisError) {
            const processingTime = Date.now() - startTime;
            console.error('❌ Direct AI nutrition analysis error:', analysisError);

            return NextResponse.json({
                success: false,
                error: 'AI analysis encountered an error',
                code: 'ANALYSIS_ERROR',
                details: analysisError.message,
                processingTime
            }, { status: 500 });
        }

    } catch (error) {
        console.error('POST /api/recipes/analyze-nutrition-direct error:', error);
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