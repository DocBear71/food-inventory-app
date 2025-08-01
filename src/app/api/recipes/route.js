// file: /src/app/api/recipes/route.js v9 - FIXED: Photo population without breaking existing functionality

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';

// Import RecipePhoto model
import {Recipe, RecipePhoto, User} from '@/lib/models';
import { FEATURE_GATES, checkUsageLimit, getUpgradeMessage, getRequiredTier } from '@/lib/subscription-config';
import { AIRecipeNutritionService } from '@/lib/services/aiNutritionService';

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

// FIXED GET - Fetch user's recipes with selective photo population
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
            // Single recipe - include full photo data but still exclude binary for performance
            const recipe = await Recipe.findOne({
                _id: recipeId,
                $or: [
                    { createdBy: session.user.id },
                    { isPublic: true }
                ]
            })
                .populate('createdBy', 'name email')
                .populate('lastEditedBy', 'name email')
                .populate({
                    path: 'primaryPhoto',
                    select: 'originalName mimeType size uploadedAt' // Include metadata but not binary data
                })
                .populate({
                    path: 'photos',
                    select: 'originalName mimeType size uploadedAt' // Include metadata but not binary data
                });

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
            // FIXED: Get user's recipes WITH photo population but WITHOUT binary data
            const recipes = await Recipe.find({
                $or: [
                    { createdBy: session.user.id },
                    { isPublic: true }
                ]
            })
                .populate('createdBy', 'name email')
                .populate('lastEditedBy', 'name email')
                // FIXED: Populate photos but exclude binary data for list view
                .populate({
                    path: 'primaryPhoto',
                    select: '_id originalName mimeType size uploadedAt' // Only include needed fields (excludes data automatically)
                })
                .populate({
                    path: 'photos',
                    select: '_id originalName mimeType size uploadedAt', // Only include needed fields (excludes data automatically)
                    options: { limit: 1 } // Only get first photo for performance
                })
                .sort({ createdAt: -1 });

            console.log(`GET /api/recipes - Found ${recipes.length} recipes for user`);

            // FIXED: Add computed properties for the RecipeImage component AND ensure all image fields are included
            const enhancedRecipes = recipes.map(recipe => {
                const recipeObj = recipe.toObject();

                // FIXED: Ensure image-related fields are preserved in the response
                return {
                    ...recipeObj,
                    // Preserve original image fields (these were getting lost)
                    imageUrl: recipeObj.imageUrl || null,
                    imageSource: recipeObj.imageSource || null,
                    imageAttribution: recipeObj.imageAttribution || null,
                    imagePriority: recipeObj.imagePriority || null,
                    imageMetadata: recipeObj.imageMetadata || null,

                    // Add computed properties that RecipeImage component expects
                    hasPhotos: !!(recipeObj.primaryPhoto || (recipeObj.photos && recipeObj.photos.length > 0)),
                    photoCount: (recipeObj.photos ? recipeObj.photos.length : 0) + (recipeObj.primaryPhoto ? 1 : 0),
                    hasImage: !!(
                        recipeObj.primaryPhoto ||
                        (recipeObj.photos && recipeObj.photos.length > 0) ||
                        recipeObj.uploadedImage?.data ||
                        recipeObj.extractedImage?.data ||
                        (recipeObj.imageUrl && recipeObj.imageUrl !== '/images/recipe-placeholder.jpg')
                    ),
                    imageType: recipeObj.extractedImage?.data ? 'extracted' :
                        (recipeObj.primaryPhoto || (recipeObj.photos && recipeObj.photos.length > 0)) ? 'uploaded' :
                            recipeObj.imageUrl ? 'external' : null,
                    // FIXED: Better imageSource logic
                    imageSourceType: recipeObj.extractedImage?.source ||
                        recipeObj.imageSource ||
                        (recipeObj.primaryPhoto || (recipeObj.photos && recipeObj.photos.length > 0) ? 'upload' : 'unknown')
                };
            });

            return NextResponse.json({
                success: true,
                recipes: enhancedRecipes
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

// Complete POST function - Replace your entire POST function with this:
export async function POST(request) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            console.log('POST /api/recipes - No session found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // CRITICAL FIX: Get submission ID from headers
        const submissionId = request.headers.get('x-submission-id');
        console.log('POST /api/recipes - Session found:', session.user.email, 'source:', session.source, 'submissionId:', submissionId);

        // FIXED: Better form data handling for multi-part recipes
        let recipeData;
        let imageFile = null;

        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            // Handle form data with potential image upload
            console.log('📸 Processing FormData request');
            const formData = await request.formData();

            // FIXED: Better parsing with error handling
            const recipeDataString = formData.get('recipeData');
            console.log('🔍 Raw recipeData string length:', recipeDataString?.length || 0);

            try {
                recipeData = JSON.parse(recipeDataString || '{}');
                console.log('🔍 Parsed recipeData keys:', Object.keys(recipeData));
                console.log('🔍 Parsed isMultiPart:', recipeData.isMultiPart);
                console.log('🔍 Parsed parts length:', recipeData.parts?.length);
            } catch (parseError) {
                console.error('❌ JSON parsing error:', parseError);
                console.log('🔍 Raw recipeData string:', recipeDataString);
                return NextResponse.json(
                    { error: 'Invalid recipe data format' },
                    { status: 400 }
                );
            }

            imageFile = formData.get('recipeImage');
            console.log('🔍 Image file:', imageFile ? `${imageFile.name} (${imageFile.size} bytes)` : 'none');
        } else {
            // Handle JSON data
            console.log('📝 Processing JSON request');
            const body = await request.json();
            recipeData = body.recipeData || body;
            console.log('🔍 JSON recipeData keys:', Object.keys(recipeData));
            console.log('🔍 JSON isMultiPart:', recipeData.isMultiPart);
            console.log('🔍 JSON parts length:', recipeData.parts?.length);
        }

        // ENHANCED LOGGING TO DEBUG THE ISSUE
        console.log('🔍 DEBUG: Received recipe data structure:', {
            title: recipeData.title,
            isMultiPart: recipeData.isMultiPart,
            hasPartsArray: !!recipeData.parts,
            partsLength: recipeData.parts?.length || 0,
            allKeys: Object.keys(recipeData),
            hasNutrition: !!recipeData.nutrition,
            hasImage: !!imageFile,
            hasExtractedImage: !!recipeData.extractedImage,
            parts: recipeData.parts?.map(part => ({
                name: part.name,
                ingredientCount: part.ingredients?.length || 0,
                instructionCount: part.instructions?.length || 0
            }))
        });

        // EXTRACT ALL FIELDS INCLUDING MULTI-PART DATA
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
            nutrition,          // ✅ USED: Manual nutrition data
            importedFrom,       // ✅ USED: Track import source
            videoMetadata,      // ✅ USED: Video import metadata
            extractedImage,     // ✅ USED: AI-extracted images
            skipAIAnalysis = false, // ✅ USED: Skip AI nutrition analysis
            // CRITICAL: Extract multi-part fields
            isMultiPart,
            parts
        } = recipeData;

        // VALIDATE REQUIRED FIELDS
        if (!title || (!ingredients || ingredients.length === 0) && (!isMultiPart || !parts || parts.length === 0)) {
            return NextResponse.json(
                { error: 'Recipe title and at least one ingredient (or parts for multi-part recipes) are required' },
                { status: 400 }
            );
        }

        await connectDB();

        // CRITICAL FIX: Enhanced duplicate prevention
        const recentTimeThreshold = new Date(Date.now() - 30000); // 30 seconds ago

        // Check for recent duplicate by title AND user
        const duplicateQuery = {
            createdBy: session.user.id,
            title: recipeData.title,
            createdAt: { $gte: recentTimeThreshold }
        };

        const existingRecipe = await Recipe.findOne(duplicateQuery);

        if (existingRecipe) {
            console.log('🚫 DUPLICATE SUBMISSION PREVENTED:', {
                existingId: existingRecipe._id,
                title: existingRecipe.title,
                createdAt: existingRecipe.createdAt,
                isMultiPart: existingRecipe.isMultiPart,
                timeDiff: Date.now() - existingRecipe.createdAt.getTime()
            });

            // Return the existing recipe instead of creating a new one
            await existingRecipe.populate('createdBy', 'name email');
            await existingRecipe.populate('lastEditedBy', 'name email');

            return NextResponse.json({
                success: true,
                recipe: {
                    ...existingRecipe.toObject(),
                    hasImage: !!(existingRecipe.primaryPhoto || existingRecipe.extractedImage || existingRecipe.uploadedImage),
                    imageType: existingRecipe.extractedImage ? 'extracted' : (existingRecipe.uploadedImage ? 'uploaded' : null),
                    imageSource: existingRecipe.extractedImage?.source || 'upload',
                    primaryPhoto: existingRecipe.primaryPhoto
                },
                message: 'Recipe already exists (duplicate prevented)',
                isDuplicate: true,
                originalId: existingRecipe._id
            });
        }

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

        // FIXED: Handle both string and object instructions (for video imports)
        const processedInstructions = instructions ? instructions.filter(inst => {
            // Handle both string and object instructions
            if (typeof inst === 'string') {
                return inst.trim() !== '';
            } else if (typeof inst === 'object' && inst !== null) {
                // Video import format: {text: "...", step: 1, videoTimestamp: 123}
                return inst.text && inst.text.trim() !== '';
            }
            return false;
        }) : [];

        // FIXED: Handle ingredients with video metadata
        const processedIngredients = ingredients ? ingredients.filter(ing => ing.name && ing.name.trim() !== '') : [];

        // CRITICAL FIX: Handle multi-part recipe data properly
        const newRecipeData = {
            title,
            description: description || '',

            // MULTI-PART HANDLING
            isMultiPart: Boolean(isMultiPart), // Ensure it's a boolean
            parts: isMultiPart && parts && Array.isArray(parts) ? parts : [],

            // For backward compatibility and search, populate flat arrays
            ingredients: isMultiPart && parts && Array.isArray(parts) && parts.length > 0 ?
                // Flatten ingredients from all parts
                parts.reduce((allIngredients, part) => {
                    return [...allIngredients, ...(part.ingredients || [])];
                }, [])
                : processedIngredients,

            instructions: isMultiPart && parts && Array.isArray(parts) && parts.length > 0 ?
                // Flatten instructions from all parts with part labels
                parts.reduce((allInstructions, part) => {
                    const partInstructions = (part.instructions || []).map(instruction => {
                        const instructionText = typeof instruction === 'string' ? instruction :
                            (instruction.text || instruction.instruction || '');
                        return `[${part.name}] ${instructionText}`;
                    });
                    return [...allInstructions, ...partInstructions];
                }, [])
                : processedInstructions,

            // Rest of your fields
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

            // Handle extracted images from video processing
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
                    hasExtractedImage: !!(extractedImage)
                }
            }),

            // Handle manual nutrition data
            ...(nutrition && Object.keys(nutrition).length > 0 && {
                nutrition: nutrition,
                nutritionManuallySet: true,
                nutritionCalculatedAt: new Date()
            })
        };

        // ENHANCED: Validate multi-part data before creating recipe
        if (newRecipeData.isMultiPart) {
            if (!newRecipeData.parts || newRecipeData.parts.length === 0) {
                console.error('❌ Multi-part recipe validation failed: No parts provided');
                return NextResponse.json(
                    { error: 'Multi-part recipe must have at least one part' },
                    { status: 400 }
                );
            }

            // Validate each part
            for (let i = 0; i < newRecipeData.parts.length; i++) {
                const part = newRecipeData.parts[i];
                console.log(`🔍 Validating part ${i + 1}:`, {
                    name: part.name,
                    hasIngredients: !!(part.ingredients && part.ingredients.length > 0),
                    hasInstructions: !!(part.instructions && part.instructions.length > 0),
                    ingredientCount: part.ingredients?.length || 0,
                    instructionCount: part.instructions?.length || 0
                });

                if (!part.name || part.name.trim() === '') {
                    console.error(`❌ Part ${i + 1} validation failed: Missing name`);
                    return NextResponse.json(
                        { error: `Part ${i + 1} must have a name` },
                        { status: 400 }
                    );
                }

                if (!part.ingredients || part.ingredients.length === 0) {
                    console.error(`❌ Part ${i + 1} validation failed: No ingredients`);
                    return NextResponse.json(
                        { error: `Part ${i + 1} (${part.name}) must have at least one ingredient` },
                        { status: 400 }
                    );
                }

                if (!part.instructions || part.instructions.length === 0) {
                    console.error(`❌ Part ${i + 1} validation failed: No instructions`);
                    return NextResponse.json(
                        { error: `Part ${i + 1} (${part.name}) must have at least one instruction` },
                        { status: 400 }
                    );
                }
            }

            console.log('✅ Multi-part recipe validation passed');
        }

        console.log('Creating recipe with data:', {
            title: newRecipeData.title,
            instructionCount: newRecipeData.instructions.length,
            ingredientCount: newRecipeData.ingredients.length,
            hasVideoMetadata: !!newRecipeData.videoMetadata,
            hasExtractedImage: !!(newRecipeData.extractedImage),
            skipAIAnalysis,
            isMultiPart: newRecipeData.isMultiPart,
            partsCount: newRecipeData.parts?.length || 0,
            partsData: newRecipeData.parts?.map(part => ({
                name: part.name,
                ingredientCount: part.ingredients?.length || 0,
                instructionCount: part.instructions?.length || 0
            }))
        });

        // Create the recipe with enhanced error handling
        let recipe;
        try {
            recipe = new Recipe(newRecipeData);

            console.log('🔍 Recipe object before save:', {
                title: recipe.title,
                isMultiPart: recipe.isMultiPart,
                partsLength: recipe.parts?.length || 0,
                ingredientsLength: recipe.ingredients?.length || 0,
                instructionsLength: recipe.instructions?.length || 0
            });

            await recipe.save();
            console.log('✅ Recipe created successfully:', recipe._id);

            // Verify the saved recipe
            const savedRecipe = await Recipe.findById(recipe._id);
            console.log('🔍 Verification - Recipe after save:', {
                id: savedRecipe._id,
                isMultiPart: savedRecipe.isMultiPart,
                partsCount: savedRecipe.parts?.length || 0,
                parts: savedRecipe.parts?.map(part => ({
                    name: part.name,
                    ingredientCount: part.ingredients?.length || 0,
                    instructionCount: part.instructions?.length || 0
                }))
            });

        } catch (saveError) {
            console.error('❌ Recipe save error:', saveError);
            console.error('❌ Recipe save error details:', {
                name: saveError.name,
                message: saveError.message,
                errors: saveError.errors
            });

            return NextResponse.json(
                {
                    error: 'Failed to save recipe',
                    details: saveError.message,
                    validationErrors: saveError.errors
                },
                { status: 400 }
            );
        }

        // Handle image upload using the unified photo system
        let primaryPhotoId = null;
        if (imageFile && imageFile.size > 0) {
            try {
                console.log('📸 Processing uploaded recipe image using unified photo system...');

                // Import RecipePhoto from your models
                const { RecipePhoto } = await import('@/lib/models');

                // Validate file
                if (!imageFile.type.startsWith('image/')) {
                    throw new Error('File must be an image');
                }

                if (imageFile.size > 5242880) { // 5MB
                    throw new Error('File size must be under 5MB');
                }

                // Store as binary data in RecipePhoto collection
                const buffer = await imageFile.arrayBuffer();
                const photoBuffer = Buffer.from(buffer);

                console.log(`📸 Creating RecipePhoto document: ${imageFile.size} bytes`);

                // Create photo record
                const photo = new RecipePhoto({
                    recipeId: recipe._id,
                    filename: `recipe_${recipe._id}_${Date.now()}_${imageFile.name}`,
                    originalName: imageFile.name,
                    mimeType: imageFile.type,
                    size: imageFile.size,
                    data: photoBuffer,
                    isPrimary: true,
                    source: 'user_upload',
                    uploadedBy: session.user.id
                });

                await photo.save();
                primaryPhotoId = photo._id;

                console.log(`✅ Photo saved with ID: ${photo._id}`);

                // Update recipe with photo references
                await Recipe.findByIdAndUpdate(recipe._id, {
                    primaryPhoto: photo._id,
                    $addToSet: { photos: photo._id },
                    photoCount: 1,
                    hasPhotos: true,
                    updatedAt: new Date()
                });

                console.log('✅ Recipe updated with photo references');

            } catch (uploadError) {
                console.warn('⚠️ Image processing failed:', uploadError.message);
                console.error('Full upload error:', uploadError);
                // Continue without image rather than failing the entire recipe
            }
        }

        // Automatic AI nutrition analysis (if not skipped and no manual nutrition)
        let nutritionAnalysis = null;
        console.log('🔍 AI Analysis Check:', {
            skipAIAnalysis,
            hasManualNutrition: !!nutrition,
            ingredientCount: newRecipeData.ingredients.length,
            shouldRun: !skipAIAnalysis && !nutrition && newRecipeData.ingredients.length > 0
        });

        if (!skipAIAnalysis && !nutrition && newRecipeData.ingredients.length > 0) {
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

        // Log results
        let imageInfo = 'no image';
        if (primaryPhotoId) {
            imageInfo = 'uploaded image via unified photo system';
        } else if (recipe.extractedImage) {
            imageInfo = `extracted image from ${recipe.extractedImage.source}`;
        }

        console.log('POST /api/recipes - Recipe created successfully:', {
            id: recipe._id,
            hasVideoMetadata: !!recipe.videoMetadata,
            hasAINutrition: !!(nutritionAnalysis?.success),
            imageInfo,
            primaryPhotoId,
            isMultiPart: recipe.isMultiPart,
            partsCount: recipe.parts?.length || 0
        });

        return NextResponse.json({
            success: true,
            recipe: {
                ...recipe.toObject(),
                hasImage: !!(primaryPhotoId || recipe.extractedImage),
                imageType: primaryPhotoId ? 'uploaded' : (recipe.extractedImage ? 'extracted' : null),
                imageSource: primaryPhotoId ? 'user_upload' : (recipe.extractedImage?.source || null),
                primaryPhoto: primaryPhotoId
            },
            nutritionAnalysis,
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
        // FIXED: Don't populate photos with binary data

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