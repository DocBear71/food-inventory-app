// file: /src/app/api/recipes/transform/route.js v2 - FIXED response structure and Modal.com integration

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Recipe, User } from '@/lib/models';
import { detectMeasurementSystem } from '@/lib/recipeTransformation';
import {
    checkAITransformationAccess,
    createTransformedRecipe,
    scaleRecipeBasic,
    convertUnitsBasic,
    trackTransformationUsage,
    checkTransformationLimit,
    validateTransformationParams,
    formatTransformationResult,
    callModalTransformationService
} from '@/lib/recipeTransformation';

export async function POST(request) {
    try {
        const session = await getEnhancedSession(request);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const requestBody = await request.json();
        console.log('🔄 Full request body received:', JSON.stringify(requestBody, null, 2));

        // FIXED: Handle nested requestData structure if present
        const {
            recipeId,
            transformationType,
            options,
            useAI = true
        } = requestBody.requestData || requestBody;

        console.log('🔄 Extracted parameters:', {
            recipeId,
            transformationType,
            options,
            useAI,
            userId: session.user.id
        });

        // Validate input parameters
        const validation = validateTransformationParams(transformationType, options);
        if (!validation.isValid) {
            console.error('❌ Validation failed:', validation.errors);
            return NextResponse.json({
                error: 'Invalid parameters',
                details: validation.errors
            }, { status: 400 });
        }

        await connectDB();

        // Get the recipe
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        // Check if user can access this recipe
        const canAccess = recipe.isPublic ||
            recipe.createdBy.toString() === session.user.id ||
            session.user.isAdmin;

        if (!canAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get user for subscription and usage checking
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Determine if AI should be used
        const shouldUseAI = useAI && checkAITransformationAccess(user);

        // Check usage limits
        const transformationTypes = transformationType === 'both' ? ['scale', 'convert'] : [transformationType];

        for (const type of transformationTypes) {
            const limitCheck = checkTransformationLimit(user, type, shouldUseAI);
            if (!limitCheck.allowed) {
                return NextResponse.json({
                    error: `${type} limit exceeded`,
                    code: 'USAGE_LIMIT_EXCEEDED',
                    details: limitCheck,
                    upgradeUrl: `/pricing?source=${type}-limit&tier=${user.getEffectiveTier()}`
                }, { status: 403 });
            }
        }

        let transformationResult;
        try {
            // Perform the transformation
            if (transformationType === 'scale') {
                transformationResult = await performScaling(recipe, options, shouldUseAI);
            } else if (transformationType === 'convert') {
                transformationResult = await performConversion(recipe, options, shouldUseAI);
            } else if (transformationType === 'both') {
                console.log('🔧 Processing both transformation (scale + convert)');
                transformationResult = await performCombinedTransformation(recipe, options, useAI);
            }

            if (!transformationResult.success) {
                return NextResponse.json({
                    error: 'Transformation failed',
                    details: transformationResult.error
                }, { status: 500 });
            }

            // Track usage
            for (const type of transformationTypes) {
                await trackTransformationUsage(session.user.id, type, shouldUseAI, User);
            }

            // Record transformation in recipe history if user owns the recipe
            if (recipe.createdBy.toString() === session.user.id) {
                if (transformationType === 'scale') {
                    await recipe.recordScaling(
                        recipe.servings || 4,
                        options.targetServings,
                        session.user.id,
                        shouldUseAI ? {
                            notes: transformationResult.scaling_notes,
                            cookingAdjustments: transformationResult.cooking_adjustments
                        } : null
                    );
                } else if (transformationType === 'convert') {
                    const sourceSystem = recipe.currentMeasurementSystem || 'unknown';
                    await recipe.recordConversion(
                        sourceSystem,
                        options.targetSystem,
                        session.user.id,
                        shouldUseAI ? {
                            notes: transformationResult.conversion_notes?.regional_adaptations,
                            method: transformationResult.method,
                            culturalAdaptations: transformationResult.cultural_notes ? [transformationResult.cultural_notes] : []
                        } : null
                    );
                }
            }

            // Save transformed recipe if requested
            let savedRecipe = null;
            if (options.saveAsNew) {
                try {
                    savedRecipe = await createTransformedRecipe(
                        recipe,
                        transformationResult,
                        session.user.id,
                        { ...options, transformationType },
                        Recipe
                    );

                    console.log('✅ Saved transformed recipe:', savedRecipe._id);
                } catch (saveError) {
                    console.error('❌ Error saving transformed recipe:', saveError);
                    // Don't fail the whole request if saving fails
                }
            }

            // FIXED: Format response with correct structure
            const formattedResult = formatTransformationResult(transformationResult, transformationType);

            console.log('✅ Transformation completed successfully:', {
                type: transformationType,
                method: transformationResult.method,
                aiUsed: shouldUseAI
            });

            return NextResponse.json({
                success: true,
                transformation: formattedResult,
                recipe: transformationResult, // FIXED: Include raw transformation data
                savedRecipe: savedRecipe ? {
                    id: savedRecipe._id,
                    title: savedRecipe.title,
                    url: `/recipes/${savedRecipe._id}`
                } : null,
                usageInfo: {
                    aiUsed: shouldUseAI,
                    method: transformationResult.method,
                    tokensUsed: transformationResult.tokens_used,
                    cost: transformationResult.cost
                }
            });

        } catch (transformError) {
            console.error('❌ Transformation error:', transformError);
            return NextResponse.json({
                error: 'Transformation processing failed',
                details: transformError.message
            }, { status: 500 });
        }

    } catch (error) {
        console.error('❌ Recipe transformation API error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}

// FIXED: Enhanced scaling function with better Modal.com integration
async function performScaling(recipe, options, useAI) {
    console.log(`🔢 Performing ${useAI ? 'AI' : 'basic'} recipe scaling`);

    if (useAI) {
        try {
            console.log('🤖 Attempting AI scaling via Modal...');
            const modalResult = await callModalTransformationService({
                transformation_type: 'scale',
                recipe_data: recipe.toObject ? recipe.toObject() : recipe,
                options: { target_servings: options.targetServings },
                use_ai: true
            });

            // FIXED: Ensure proper success response structure
            if (modalResult && modalResult.success !== false) {
                return {
                    success: true,
                    ...modalResult,
                    method: 'ai_scaling'
                };
            } else {
                throw new Error(modalResult?.error || 'AI scaling failed');
            }
        } catch (modalError) {
            console.warn('⚠️ AI scaling failed, falling back to basic math:', modalError.message);
            return scaleRecipeBasic(recipe, options.targetServings);
        }
    } else {
        console.log('📐 Using basic math scaling');
        return scaleRecipeBasic(recipe, options.targetServings);
    }
}

// FIXED: Enhanced conversion function with better Modal.com integration
async function performConversion(recipe, options, useAI) {
    console.log(`🔄 Performing ${useAI ? 'AI' : 'basic'} unit conversion`);

    if (useAI) {
        try {
            console.log('🤖 Attempting AI conversion via Modal...');
            const modalResult = await callModalTransformationService({
                transformation_type: 'convert',
                recipe_data: recipe.toObject ? recipe.toObject() : recipe,
                options: { target_system: options.targetSystem },
                use_ai: true
            });

            // FIXED: Ensure proper success response structure
            if (modalResult && modalResult.success !== false) {
                return {
                    success: true,
                    ...modalResult,
                    method: 'ai_conversion'
                };
            } else {
                throw new Error(modalResult?.error || 'AI conversion failed');
            }
        } catch (modalError) {
            console.warn('⚠️ AI conversion failed, falling back to basic math:', modalError.message);
            return convertUnitsBasic(recipe, options.targetSystem);
        }
    } else {
        console.log('🔄 Using basic math conversion');
        return convertUnitsBasic(recipe, options.targetSystem);
    }
}

// FIXED: New combined transformation function
async function performCombinedTransformation(recipe, options, useAI) {
    console.log(`🚀 Performing ${useAI ? 'AI' : 'basic'} combined transformation`);

    if (useAI) {
        try {
            console.log('🤖 Attempting AI combined transformation via Modal...');
            const modalResult = await callModalTransformationService({
                transformation_type: 'both',
                recipe_data: recipe.toObject ? recipe.toObject() : recipe,
                options: {
                    target_servings: options.targetServings,
                    target_system: options.targetSystem
                },
                use_ai: true
            });

            // FIXED: Ensure proper success response structure
            if (modalResult && modalResult.success !== false) {
                return {
                    success: true,
                    ...modalResult,
                    method: 'ai_combined_transformation'
                };
            } else {
                throw new Error(modalResult?.error || 'AI combined transformation failed');
            }
        } catch (modalError) {
            console.warn('⚠️ AI combined transformation failed, falling back to basic math:', modalError.message);
            // Fall back to sequential basic transformations
            return performBasicCombinedTransformation(recipe, options);
        }
    } else {
        console.log('🔧 Using basic math combined transformation');
        return performBasicCombinedTransformation(recipe, options);
    }
}

// Helper function for basic combined transformation
function performBasicCombinedTransformation(recipe, options) {
    try {
        // First scale the recipe
        const scalingResult = scaleRecipeBasic(recipe, options.targetServings);

        if (!scalingResult.success) {
            return scalingResult;
        }

        // Create a temporary recipe object with scaled ingredients
        const scaledRecipe = {
            ...recipe.toObject ? recipe.toObject() : recipe,
            ingredients: scalingResult.scaled_ingredients,
            servings: options.targetServings
        };

        // Then convert the scaled recipe
        const conversionResult = convertUnitsBasic(scaledRecipe, options.targetSystem);

        if (!conversionResult.success) {
            return conversionResult;
        }

        // Combine the results
        return {
            success: true,
            scaled_ingredients: conversionResult.converted_ingredients,
            cooking_adjustments: scalingResult.cooking_adjustments,
            conversion_notes: conversionResult.conversion_notes,
            scaling_notes: scalingResult.scaling_notes,
            method: 'basic_combined_transformation',
            success_probability: Math.min(scalingResult.success_probability, conversionResult.success_probability)
        };

    } catch (error) {
        console.error('❌ Basic combined transformation failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
// GET endpoint to check transformation limits
export async function GET(request) {
    try {
        const session = await getEnhancedSession(request);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const tier = user.getEffectiveTier();
        const canUseAI = checkAITransformationAccess(user);

        // Get current usage and limits
        const scalingLimit = checkTransformationLimit(user, 'scale', false);
        const aiScalingLimit = checkTransformationLimit(user, 'scale', true);
        const conversionLimit = checkTransformationLimit(user, 'convert', false);
        const aiConversionLimit = checkTransformationLimit(user, 'convert', true);

        return NextResponse.json({
            success: true,
            userTier: tier,
            canUseAI,
            limits: {
                basicScaling: scalingLimit,
                aiScaling: aiScalingLimit,
                basicConversion: conversionLimit,
                aiConversion: aiConversionLimit
            },
            features: {
                basicScaling: scalingLimit.allowed,
                aiScaling: aiScalingLimit.allowed && canUseAI,
                basicConversion: conversionLimit.allowed,
                aiConversion: aiConversionLimit.allowed && canUseAI,
                saveTransformed: tier !== 'free' || (scalingLimit.remaining > 0 || conversionLimit.remaining > 0)
            }
        });

    } catch (error) {
        console.error('❌ Error checking transformation limits:', error);
        return NextResponse.json({
            error: 'Failed to check limits',
            details: error.message
        }, { status: 500 });
    }
}