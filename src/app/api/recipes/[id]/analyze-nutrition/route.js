// file: /src/app/api/recipes/[id]/analyze-nutrition/route.js v2 - FIXED: Added multi-part recipe support
// Dedicated endpoint for AI nutrition analysis

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Recipe, User } from '@/lib/models';
import { ModalNutritionService } from '@/lib/services/modalNutritionService';


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

        // FIXED: Convert recipe to plain object first to avoid property access issues
        const recipeData = recipe.toObject ? recipe.toObject() : recipe;

        // FIXED: Handle multi-part recipes - extract all ingredients
        let allIngredients = [];

        if (recipeData.isMultiPart && recipeData.parts && Array.isArray(recipeData.parts)) {
            console.log(`📋 Processing multi-part recipe with ${recipeData.parts.length} parts`);

            // Flatten ingredients from all parts
            allIngredients = recipeData.parts.reduce((acc, part, partIndex) => {
                const partIngredients = (part.ingredients || [])
                    .filter(ing => ing && ing.name && ing.name.trim())
                    .map(ing => ({
                        name: ing.name,
                        amount: ing.amount || '',
                        unit: ing.unit || '',
                        optional: ing.optional || false,
                        partName: part.name || `Part ${partIndex + 1}`,
                        partIndex
                    }));

                console.log(`📋 Part ${partIndex + 1} (${part.name || `Part ${partIndex + 1}`}): ${partIngredients.length} ingredients`);
                return [...acc, ...partIngredients];
            }, []);
        } else {
            // Single-part recipe (legacy)
            allIngredients = (recipeData.ingredients || []).filter(ing => ing && ing.name && ing.name.trim());
            console.log(`📋 Processing single-part recipe with ${allIngredients.length} ingredients`);
        }

        // Validate recipe has ingredients
        if (allIngredients.length === 0) {
            return NextResponse.json({
                error: 'Recipe must have ingredients to analyze nutrition',
                code: 'MISSING_INGREDIENTS'
            }, { status: 400 });
        }

        console.log(`🤖 Starting forced AI nutrition analysis for recipe: ${recipeData.title || 'Untitled Recipe'}`);
        console.log(`📊 Total ingredients across all parts: ${allIngredients.length}`);

        const startTime = Date.now();

        try {
            // FIXED: Create a normalized recipe object for analysis
            const recipeForAnalysis = {
                _id: recipeData._id,
                title: recipeData.title || 'Untitled Recipe',
                description: recipeData.description || '',
                servings: recipeData.servings || 4,
                cookTime: recipeData.cookTime || null,
                prepTime: recipeData.prepTime || null,
                isMultiPart: Boolean(recipeData.isMultiPart),
                parts: recipeData.parts || [],
                ingredients: allIngredients, // Use flattened ingredients
                // Flatten instructions if multi-part
                instructions: recipeData.isMultiPart && recipeData.parts && Array.isArray(recipeData.parts) ?
                    recipeData.parts.reduce((allInstructions, part, partIndex) => {
                        const partInstructions = (part.instructions || []).map(instruction => {
                            const instructionText = typeof instruction === 'string' ? instruction :
                                (instruction.text || instruction.instruction || '');
                            return `[${part.name || `Part ${partIndex + 1}`}] ${instructionText}`;
                        });
                        return [...allInstructions, ...partInstructions];
                    }, [])
                    : recipeData.instructions || []
            };

            const aiService = new ModalNutritionService();
            const analysisResult = await aiService.analyzeRecipeNutrition(recipeForAnalysis);

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
                        analyzedAt: new Date(),
                        // FIXED: Add multi-part metadata
                        multiPart: Boolean(recipeData.isMultiPart),
                        totalParts: recipeData.parts?.length || (recipeData.isMultiPart ? 0 : 1),
                        totalIngredients: allIngredients.length
                    },
                    updatedAt: new Date()
                };

                await Recipe.findByIdAndUpdate(recipeId, updateData);

                console.log(`✅ AI nutrition analysis completed in ${processingTime}ms`);
                console.log(`📊 Coverage: ${Math.round(analysisResult.metadata.coverage * 100)}%`);
                console.log(`💰 Cost: ${analysisResult.metadata.aiAnalysis?.cost?.toFixed(4) || '0.0000'}`);

                return NextResponse.json({
                    success: true,
                    message: 'Nutrition analysis completed successfully',
                    nutrition: analysisResult.nutrition,
                    analysisResult: {
                        ...analysisResult.metadata,
                        processingTime,
                        forcedAnalysis: true,
                        // FIXED: Include multi-part info in response
                        multiPart: Boolean(recipeData.isMultiPart),
                        totalParts: recipeData.parts?.length || (recipeData.isMultiPart ? 0 : 1),
                        totalIngredients: allIngredients.length
                    },
                    // Include detailed breakdown if requested
                    ...(includeDetails && {
                        details: {
                            ingredientBreakdown: analysisResult.ingredientBreakdown,
                            dataSourcesUsed: analysisResult.dataSourcesUsed,
                            cookingAdjustments: analysisResult.cookingAdjustments,
                            // FIXED: Add part breakdown for multi-part recipes
                            ...(recipeData.isMultiPart && {
                                partBreakdown: recipeData.parts?.map((part, index) => ({
                                    partName: part.name || `Part ${index + 1}`,
                                    ingredientCount: (part.ingredients || []).filter(ing => ing && ing.name && ing.name.trim()).length
                                })) || []
                            })
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
            'aiAnalysis.nutritionMetadata': 1,
            // FIXED: Include fields needed for multi-part validation
            isMultiPart: 1,
            parts: 1,
            ingredients: 1
        });

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        // FIXED: Calculate total ingredients correctly for multi-part recipes
        let totalIngredients = 0;
        const recipeData = recipe.toObject ? recipe.toObject() : recipe;

        if (recipeData.isMultiPart && recipeData.parts && Array.isArray(recipeData.parts)) {
            totalIngredients = recipeData.parts.reduce((total, part) => {
                return total + ((part.ingredients || []).filter(ing => ing && ing.name && ing.name.trim()).length);
            }, 0);
        } else {
            totalIngredients = (recipeData.ingredients || []).filter(ing => ing && ing.name && ing.name.trim()).length;
        }

        return NextResponse.json({
            success: true,
            hasNutrition: !!(recipeData.nutrition && Object.keys(recipeData.nutrition).length > 0),
            nutritionCalculatedAt: recipeData.nutritionCalculatedAt,
            nutritionCoverage: recipeData.nutritionCoverage,
            isManuallySet: recipeData.nutritionManuallySet,
            aiMetadata: recipeData.aiAnalysis?.nutritionMetadata,
            canAnalyze: totalIngredients > 0,
            // FIXED: Include multi-part info in status
            isMultiPart: Boolean(recipeData.isMultiPart),
            totalParts: recipeData.parts?.length || (recipeData.isMultiPart ? 0 : 1),
            totalIngredients
        });

    } catch (error) {
        console.error('GET /api/recipes/[id]/analyze-nutrition error:', error);
        return NextResponse.json(
            { error: 'Failed to get nutrition status' },
            { status: 500 }
        );
    }
}