// file: /src/app/api/recipes/route.js v8 - Enhanced with image support and AI nutrition

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Recipe, User } from '@/lib/models';
import { FEATURE_GATES, checkUsageLimit, getUpgradeMessage, getRequiredTier } from '@/lib/subscription-config';
import { AIRecipeNutritionService } from '@/lib/services/aiNutritionService';
// import { uploadToCloudinary } from '@/lib/cloudinary'; // Add when you set up Cloudinary

async function checkPublicRecipePermission(userId, requestedIsPublic) {
    // If user doesn't want to make it public, allow it
    if (!requestedIsPublic) {
        return false;
    }

    // Get user subscription info
    const user = await User.findById(userId);
    if (!user) {
        return false; // Default to private if can't find user
    }

    const userSubscription = {
        tier: user.getEffectiveTier(),
        status: user.subscription?.status || 'free'
    };

    // Free users cannot make recipes public
    if (userSubscription.tier === 'free') {
        return false;
    }

    // Gold users have limits, Platinum users are unlimited
    if (userSubscription.tier === 'gold') {
        const currentPublicCount = await Recipe.countDocuments({
            createdBy: userId,
            isPublic: true
        });

        // Gold users can have up to 25 public recipes
        if (currentPublicCount >= 25) {
            return false;
        }
    }

    // Platinum users or within limits
    return true;
}

// ENHANCED: AI nutrition analysis function
async function analyzeRecipeNutritionAI(recipe, userId) {
    try {
        // Check if AI nutrition analysis is enabled
        if (!process.env.OPENAI_API_KEY || process.env.ENABLE_AI_NUTRITION !== 'true') {
            console.log('🤖 AI nutrition analysis disabled - missing API key or flag');
            return null;
        }

        // Only analyze recipes with ingredients
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            console.log('🤖 Skipping AI nutrition - no ingredients');
            return null;
        }

        // Check if user has subscription for AI nutrition
        const user = await User.findById(userId);
        const userTier = user?.getEffectiveTier() || 'free';

        // AI nutrition requires Gold+ subscription
        if (userTier === 'free') {
            console.log('🤖 Skipping AI nutrition - requires Gold+ subscription');
            return null;
        }

        console.log(`🤖 Starting AI nutrition analysis for recipe: ${recipe.title}`);
        const startTime = Date.now();

        const aiService = new AIRecipeNutritionService();
        const analysisResult = await aiService.analyzeRecipeNutrition(recipe);

        const processingTime = Date.now() - startTime;

        if (analysisResult.success) {
            console.log(`✅ AI nutrition analysis completed in ${processingTime}ms`);
            console.log(`📊 Coverage: ${Math.round(analysisResult.metadata.coverage * 100)}%`);
            console.log(`💰 Cost: $${analysisResult.metadata.aiAnalysis.cost.toFixed(4)}`);

            return {
                success: true,
                nutrition: analysisResult.nutrition,
                metadata: {
                    ...analysisResult.metadata,
                    processingTime,
                    calculationMethod: 'ai_calculated'
                }
            };
        } else {
            console.log(`❌ AI nutrition analysis failed: ${analysisResult.error}`);
            return {
                success: false,
                error: analysisResult.error
            };
        }

    } catch (error) {
        console.error('❌ AI nutrition analysis error:', error);
        return {
            success: false,
            error: 'AI analysis failed but recipe was saved'
        };
    }
}

// GET - Fetch user's recipes or a single recipe
export async function GET(request) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            console.log('GET /api/recipes - No session found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('GET /api/recipes - Session found:', session.user.email, 'source:', session.source);

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        await connectDB();

        if (recipeId) {
            // Get single recipe with user information populated
            const recipe = await Recipe.findOne({
                _id: recipeId,
                $or: [
                    { createdBy: session.user.id },
                    { isPublic: true }
                ]
            })
                .populate('createdBy', 'name email')
                .populate('lastEditedBy', 'name email');

            if (!recipe) {
                return NextResponse.json(
                    { error: 'Recipe not found or access denied' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                recipe
            });
        } else {
            // Get user's recipes and public recipes with user info
            const recipes = await Recipe.find({
                $or: [
                    { createdBy: session.user.id },
                    { isPublic: true }
                ]
            })
                .populate('createdBy', 'name email')
                .populate('lastEditedBy', 'name email')
                .sort({ createdAt: -1 });

            console.log(`GET /api/recipes - Found ${recipes.length} recipes for user`);

            return NextResponse.json({
                success: true,
                recipes
            });
        }

    } catch (error) {
        console.error('GET recipes error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch recipes' },
            { status: 500 }
        );
    }
}

// ENHANCED POST - Add new recipe with image support and automatic AI nutrition analysis
export async function POST(request) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            console.log('POST /api/recipes - No session found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('POST /api/recipes - Session found:', session.user.email, 'source:', session.source);

        // NEW: Handle both form data (with image files) and JSON data
        let recipeData;
        let imageFile = null;

        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            // Handle form data with potential image upload
            const formData = await request.formData();
            recipeData = JSON.parse(formData.get('recipeData') || '{}');
            imageFile = formData.get('recipeImage');
        } else {
            // Handle JSON data
            const body = await request.json();
            recipeData = body.recipeData || body;
        }

        const {
            title,
            description,
            ingredients,
            instructions,
            cookTime,
            prepTime,
            servings,
            difficulty,
            tags,
            source,
            isPublic,
            category,
            nutrition,
            importedFrom,
            videoMetadata,
            extractedImage, // NEW: Extracted image from video
            skipAIAnalysis = false
        } = recipeData;

        if (!title || !ingredients || ingredients.length === 0) {
            return NextResponse.json(
                { error: 'Recipe title and at least one ingredient are required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Get user and check subscription limits
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get current recipe count for this user
        const currentRecipeCount = await Recipe.countDocuments({ createdBy: session.user.id });

        // Check subscription limits
        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };

        const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.ADD_PERSONAL_RECIPE, currentRecipeCount);

        if (!hasCapacity) {
            const requiredTier = getRequiredTier(FEATURE_GATES.ADD_PERSONAL_RECIPE);
            return NextResponse.json({
                error: getUpgradeMessage(FEATURE_GATES.ADD_PERSONAL_RECIPE, requiredTier),
                code: 'USAGE_LIMIT_EXCEEDED',
                feature: FEATURE_GATES.ADD_PERSONAL_RECIPE,
                currentCount: currentRecipeCount,
                currentTier: userSubscription.tier,
                requiredTier: requiredTier,
                upgradeUrl: `/pricing?source=recipe-limit&feature=${FEATURE_GATES.ADD_PERSONAL_RECIPE}&required=${requiredTier}`
            }, { status: 403 });
        }

        // NEW: Handle image upload if present
        let imageUrl = null;
        if (imageFile && imageFile.size > 0) {
            try {
                console.log('📸 Processing uploaded recipe image...');

                // Convert to base64 and store in uploadedImage field
                const bytes = await imageFile.arrayBuffer();
                const buffer = Buffer.from(bytes);
                const base64Data = buffer.toString('base64');

                // Store in your existing uploadedImage schema field
                newRecipeData.uploadedImage = {
                    data: base64Data,
                    mimeType: imageFile.type,
                    size: imageFile.size,
                    originalName: imageFile.name,
                    uploadedAt: new Date(),
                    source: 'user_upload'
                };

                console.log('✅ Image stored as base64 in uploadedImage field');
            } catch (uploadError) {
                console.warn('⚠️ Image processing failed:', uploadError.message);
                // Continue without image rather than failing the entire recipe
            }
        }

        // FIXED: Handle both string and object instructions (for video imports)
        const processedInstructions = instructions.filter(inst => {
            // Handle both string and object instructions
            if (typeof inst === 'string') {
                return inst.trim() !== '';
            } else if (typeof inst === 'object' && inst !== null) {
                // Video import format: {text: "...", step: 1, videoTimestamp: 123}
                return inst.text && inst.text.trim() !== '';
            }
            return false;
        });

        // FIXED: Handle ingredients with video metadata
        const processedIngredients = ingredients.filter(ing => ing.name && ing.name.trim() !== '');

        const newRecipeData = {
            title,
            description: description || '',
            ingredients: processedIngredients,
            instructions: processedInstructions,
            cookTime: cookTime || null,
            prepTime: prepTime || null,
            servings: servings || null,
            difficulty: difficulty || 'medium',
            tags: tags || [],
            source: source || '',
            category: category || 'entrees',
            createdBy: session.user.id,
            lastEditedBy: session.user.id,
            importedFrom: importedFrom || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            isPublic: await checkPublicRecipePermission(session.user.id, isPublic),

            // NEW: Handle images
            ...(imageUrl && { imageUrl }), // Uploaded image URL
            ...(extractedImage && {
                extractedImage: {
                    data: extractedImage.data,
                    extractionMethod: extractedImage.extractionMethod || 'video_frame_analysis',
                    frameCount: extractedImage.frameCount || 0,
                    source: extractedImage.source || 'unknown',
                    extractedAt: new Date(),
                    confidence: extractedImage.confidence,
                    metadata: extractedImage.metadata || {}
                }
            }),

            // Add video metadata if present
            ...(videoMetadata && {
                videoMetadata: {
                    ...videoMetadata,
                    hasExtractedImage: !!(extractedImage) // NEW: Flag for image presence
                }
            }),

            // Handle manual nutrition data
            ...(nutrition && Object.keys(nutrition).length > 0 && {
                nutrition: nutrition,
                nutritionManuallySet: true,
                nutritionCalculatedAt: new Date()
            })
        };

        console.log('Creating recipe with data:', {
            title: newRecipeData.title,
            instructionCount: newRecipeData.instructions.length,
            ingredientCount: newRecipeData.ingredients.length,
            hasVideoMetadata: !!newRecipeData.videoMetadata,
            hasExtractedImage: !!(newRecipeData.extractedImage),
            hasUploadedImage: !!(newRecipeData.imageUrl),
            instructionTypes: newRecipeData.instructions.map(inst => typeof inst),
            skipAIAnalysis
        });

        // Create the recipe first
        const recipe = new Recipe(newRecipeData);
        await recipe.save();

        // NEW: Automatic AI nutrition analysis (if not skipped and no manual nutrition)
        let nutritionAnalysis = null;
        console.log('🔍 AI Analysis Check:', {
            skipAIAnalysis,
            hasNutrition: !!nutrition,
            ingredientCount: processedIngredients.length,
            shouldRun: !skipAIAnalysis && !nutrition && processedIngredients.length > 0
        });

        if (!skipAIAnalysis && !nutrition && processedIngredients.length > 0) {
            console.log('🤖 About to start AI nutrition analysis...');
            nutritionAnalysis = await analyzeRecipeNutritionAI(recipe, session.user.id);
            console.log('🤖 AI analysis result:', nutritionAnalysis);
        }

        // If AI analysis succeeded, update the recipe with nutrition data
        if (nutritionAnalysis?.success) {
            await Recipe.findByIdAndUpdate(recipe._id, {
                nutrition: nutritionAnalysis.nutrition,
                nutritionCalculatedAt: new Date(),
                nutritionCoverage: nutritionAnalysis.metadata.coverage,
                nutritionManuallySet: false,
                // Store AI analysis metadata
                'aiAnalysis.nutritionGenerated': true,
                'aiAnalysis.nutritionMetadata': nutritionAnalysis.metadata
            });

            // Update the local recipe object for response
            recipe.nutrition = nutritionAnalysis.nutrition;
            recipe.nutritionCalculatedAt = new Date();
            recipe.nutritionCoverage = nutritionAnalysis.metadata.coverage;
        }

        // Update user's usage tracking
        if (!user.usageTracking) {
            user.usageTracking = {};
        }
        user.usageTracking.totalPersonalRecipes = currentRecipeCount + 1;
        user.usageTracking.lastUpdated = new Date();
        await user.save();

        // Populate user info for response
        await recipe.populate('createdBy', 'name email');
        await recipe.populate('lastEditedBy', 'name email');

        // NEW: Log image processing results
        let imageInfo = 'no image';
        if (recipe.extractedImage) {
            imageInfo = `extracted image from ${recipe.extractedImage.source}`;
        } else if (recipe.imageUrl) {
            imageInfo = 'uploaded image';
        }

        console.log('POST /api/recipes - Recipe created successfully:', {
            id: recipe._id,
            hasVideoMetadata: !!recipe.videoMetadata,
            hasAINutrition: !!(nutritionAnalysis?.success),
            imageInfo
        });

        return NextResponse.json({
            success: true,
            recipe: {
                ...recipe.toObject(),
                // NEW: Include image information in response
                hasImage: !!(recipe.extractedImage || recipe.imageUrl),
                imageType: recipe.extractedImage ? 'extracted' : (recipe.imageUrl ? 'uploaded' : null),
                imageSource: recipe.extractedImage?.source || 'upload'
            },
            nutritionAnalysis, // Include AI analysis results
            message: 'Recipe added successfully' +
                (nutritionAnalysis?.success ? ' with AI nutrition analysis' : '') +
                (imageInfo !== 'no image' ? ` and ${imageInfo}` : ''),
            remainingRecipes: userSubscription.tier === 'free' ?
                Math.max(0, 5 - (currentRecipeCount + 1)) :
                userSubscription.tier === 'gold' ?
                    Math.max(0, 100 - (currentRecipeCount + 1)) : 'Unlimited'
        });

    } catch (error) {
        console.error('POST recipes error:', error);
        console.error('Error stack:', error.stack);
        return NextResponse.json(
            {
                error: 'Failed to add recipe',
                details: error.message,
                type: error.name
            },
            { status: 500 }
        );
    }
}

// ENHANCED PUT - Update recipe with AI nutrition re-analysis if ingredients changed
export async function PUT(request) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            console.log('PUT /api/recipes - No session found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('PUT /api/recipes - Session found:', session.user.email, 'source:', session.source);

        const body = await request.json();
        const { recipeId, skipAIAnalysis = false, ...updateData } = body;

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Find recipe and verify ownership
        const existingRecipe = await Recipe.findOne({
            _id: recipeId,
            createdBy: session.user.id
        });

        if (!existingRecipe) {
            return NextResponse.json(
                { error: 'Recipe not found or you do not have permission to edit it' },
                { status: 404 }
            );
        }

        // NEW: Check if ingredients changed (for AI re-analysis)
        const ingredientsChanged = updateData.ingredients &&
            JSON.stringify(existingRecipe.ingredients) !== JSON.stringify(updateData.ingredients);

        console.log('PUT /api/recipes - Ingredients changed:', ingredientsChanged);

        // Prepare update data
        const updateFields = {
            ...updateData,
            ingredients: updateData.ingredients?.filter(ing => ing.name && ing.name.trim() !== ''),
            instructions: updateData.instructions?.filter(inst => {
                if (typeof inst === 'string') {
                    return inst.trim() !== '';
                } else if (typeof inst === 'object' && inst !== null) {
                    return inst.text && inst.text.trim() !== '';
                }
                return false;
            }),
            lastEditedBy: session.user.id,
            updatedAt: new Date(),

            // NEW: Clear AI nutrition data if ingredients changed (unless manual nutrition)
            ...(ingredientsChanged && !existingRecipe.nutritionManuallySet && {
                nutritionCalculatedAt: null,
                nutritionCoverage: null,
                'aiAnalysis.nutritionGenerated': false
            })
        };

        // PUBLIC RECIPE SUBSCRIPTION CHECK for updates
        if (updateData.hasOwnProperty('isPublic')) {
            const canMakePublic = await checkPublicRecipePermission(session.user.id, updateData.isPublic);

            if (updateData.isPublic && !canMakePublic) {
                const user = await User.findById(session.user.id);
                const userTier = user?.getEffectiveTier() || 'free';

                if (userTier === 'free') {
                    return NextResponse.json({
                        error: 'Public recipes are available with Gold and Platinum plans',
                        code: 'FEATURE_NOT_AVAILABLE',
                        feature: 'public_recipes',
                        currentTier: userTier,
                        requiredTier: 'gold',
                        upgradeUrl: '/pricing?source=public-recipe&feature=public_recipes&required=gold'
                    }, { status: 403 });
                } else if (userTier === 'gold') {
                    const currentPublicCount = await Recipe.countDocuments({
                        createdBy: session.user.id,
                        isPublic: true
                    });

                    return NextResponse.json({
                        error: `Gold users can have up to 25 public recipes. You currently have ${currentPublicCount}.`,
                        code: 'USAGE_LIMIT_EXCEEDED',
                        feature: 'public_recipes',
                        currentCount: currentPublicCount,
                        limit: 25,
                        currentTier: userTier,
                        requiredTier: 'platinum',
                        upgradeUrl: '/pricing?source=public-recipe-limit&feature=public_recipes&required=platinum'
                    }, { status: 403 });
                }
            }

            updateFields.isPublic = canMakePublic;
        }

        // Handle manual nutrition data if provided
        if (updateData.nutrition && Object.keys(updateData.nutrition).length > 0) {
            updateFields.nutrition = updateData.nutrition;
            updateFields.nutritionManuallySet = true;
            updateFields.nutritionCalculatedAt = new Date();
        }

        // Update the recipe
        const updatedRecipe = await Recipe.findByIdAndUpdate(
            recipeId,
            updateFields,
            { new: true }
        )
            .populate('createdBy', 'name email')
            .populate('lastEditedBy', 'name email');

        // NEW: AI nutrition re-analysis if ingredients changed
        let nutritionAnalysis = null;
        if (!skipAIAnalysis && ingredientsChanged && !updateData.nutrition &&
            updateData.ingredients?.length > 0) {

            console.log('🤖 Re-analyzing nutrition due to ingredient changes');
            nutritionAnalysis = await analyzeRecipeNutritionAI(updatedRecipe, session.user.id);

            if (nutritionAnalysis?.success) {
                // Update with new nutrition data
                await Recipe.findByIdAndUpdate(recipeId, {
                    nutrition: nutritionAnalysis.nutrition,
                    nutritionCalculatedAt: new Date(),
                    nutritionCoverage: nutritionAnalysis.metadata.coverage,
                    nutritionManuallySet: false,
                    'aiAnalysis.nutritionGenerated': true,
                    'aiAnalysis.nutritionMetadata': nutritionAnalysis.metadata
                });

                // Update local object for response
                updatedRecipe.nutrition = nutritionAnalysis.nutrition;
                updatedRecipe.nutritionCalculatedAt = new Date();
                updatedRecipe.nutritionCoverage = nutritionAnalysis.metadata.coverage;
            }
        }

        console.log('PUT /api/recipes - Recipe updated successfully:', {
            ingredientsChanged,
            hasAINutritionUpdate: !!(nutritionAnalysis?.success)
        });

        return NextResponse.json({
            success: true,
            recipe: updatedRecipe,
            nutritionAnalysis, // Include AI analysis results
            message: 'Recipe updated successfully' +
                (nutritionAnalysis?.success ? ' with updated AI nutrition analysis' : '')
        });

    } catch (error) {
        console.error('PUT recipes error:', error);
        return NextResponse.json(
            { error: 'Failed to update recipe' },
            { status: 500 }
        );
    }
}

// DELETE - Remove recipe (with usage tracking update)
export async function DELETE(request) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            console.log('DELETE /api/recipes - No session found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('DELETE /api/recipes - Session found:', session.user.email, 'source:', session.source);

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Find and delete recipe (verify ownership)
        const recipe = await Recipe.findOneAndDelete({
            _id: recipeId,
            createdBy: session.user.id
        });

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found or you do not have permission to delete it' },
                { status: 404 }
            );
        }

        // Update user's usage tracking
        const user = await User.findById(session.user.id);
        if (user) {
            const currentRecipeCount = await Recipe.countDocuments({ createdBy: session.user.id });
            if (!user.usageTracking) {
                user.usageTracking = {};
            }
            user.usageTracking.totalPersonalRecipes = currentRecipeCount;
            user.usageTracking.lastUpdated = new Date();
            await user.save();
        }

        console.log('DELETE /api/recipes - Recipe deleted successfully');

        return NextResponse.json({
            success: true,
            message: 'Recipe deleted successfully'
        });

    } catch (error) {
        console.error('DELETE recipes error:', error);
        return NextResponse.json(
            { error: 'Failed to delete recipe' },
            { status: 500 }
        );
    }
}