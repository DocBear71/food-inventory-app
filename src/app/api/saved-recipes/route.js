// file: /src/app/api/saved-recipes/route.js v6 - FIXED comprehensive error handling and validation

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User, Recipe } from '@/lib/models';

// Simple saved recipe limit check
const checkSavedRecipeLimits = (userTier, currentCount) => {
    const limits = {
        free: 10,
        gold: 200,
        platinum: -1 // unlimited
    };

    const limit = limits[userTier] || limits.free;

    if (limit === -1) return { allowed: true }; // unlimited

    if (currentCount >= limit) {
        return {
            allowed: false,
            reason: 'limit_exceeded',
            currentCount,
            limit,
            tier: userTier
        };
    }

    return { allowed: true };
};

// Helper function to ensure user has required fields
const ensureUserValidation = async (user) => {
    try {
        let hasChanges = false;

        // Initialize savedRecipes array if it doesn't exist
        if (!user.savedRecipes) {
            user.savedRecipes = [];
            hasChanges = true;
            console.log('📝 Initialized savedRecipes array for user:', user._id);
        }

        // Check and fix legal acceptance fields
        if (!user.legalAcceptance) {
            user.legalAcceptance = {
                termsAccepted: false,
                privacyAccepted: false,
                acceptanceDate: user.createdAt || new Date()
            };
            hasChanges = true;
            console.log('📝 Initialized legalAcceptance for user:', user._id);
        } else {
            // Ensure all required legal acceptance fields exist
            if (user.legalAcceptance.termsAccepted === undefined) {
                user.legalAcceptance.termsAccepted = false;
                hasChanges = true;
            }
            if (user.legalAcceptance.privacyAccepted === undefined) {
                user.legalAcceptance.privacyAccepted = false;
                hasChanges = true;
            }
            if (!user.legalAcceptance.acceptanceDate) {
                user.legalAcceptance.acceptanceDate = user.createdAt || new Date();
                hasChanges = true;
            }
        }

        // Check and fix legal version fields
        if (!user.legalVersion) {
            user.legalVersion = {
                termsVersion: '1.0',
                privacyVersion: '1.0'
            };
            hasChanges = true;
            console.log('📝 Initialized legalVersion for user:', user._id);
        }

        // Check and fix usage tracking
        if (!user.usageTracking) {
            const now = new Date();
            user.usageTracking = {
                currentMonth: now.getMonth(),
                currentYear: now.getFullYear(),
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                totalInventoryItems: 0,
                totalPersonalRecipes: 0,
                totalSavedRecipes: user.savedRecipes.length,
                totalPublicRecipes: 0,
                totalRecipeCollections: 0,
                savedRecipes: user.savedRecipes.length,
                lastUpdated: now
            };
            hasChanges = true;
            console.log('📝 Initialized usageTracking for user:', user._id);
        } else {
            // Update saved recipes count in usage tracking
            user.usageTracking.savedRecipes = user.savedRecipes.length;
            user.usageTracking.totalSavedRecipes = user.savedRecipes.length;
            user.usageTracking.lastUpdated = new Date();
            hasChanges = true;
        }

        // Save if there were changes
        if (hasChanges) {
            await user.save();
            console.log('✅ User validation fields updated successfully');
        }

        return user;
    } catch (error) {
        console.error('❌ Error ensuring user validation:', error);
        throw error;
    }
};

// GET - Fetch user's saved recipes
export async function GET(request) {
    try {
        console.log('🔍 GET /api/saved-recipes - Starting request');

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.log('❌ GET /api/saved-recipes - No session found');
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }

        console.log('✅ GET /api/saved-recipes - Session found for user:', session.user.id);

        await connectDB();
        console.log('✅ GET /api/saved-recipes - Database connected');

        // ENHANCED: More robust user fetching with detailed error handling
        let user;
        try {
            console.log('🔍 GET /api/saved-recipes - Fetching user...');
            user = await User.findById(session.user.id);
            console.log('✅ GET /api/saved-recipes - User query completed, user found:', !!user);
        } catch (userFetchError) {
            console.error('❌ GET /api/saved-recipes - Error fetching user:', userFetchError);
            return NextResponse.json({
                success: false,
                error: 'Database error while fetching user',
                details: userFetchError.message
            }, { status: 500 });
        }

        if (!user) {
            console.log('❌ GET /api/saved-recipes - User not found in database');
            return NextResponse.json({
                success: false,
                error: 'User not found'
            }, { status: 404 });
        }

        console.log('✅ GET /api/saved-recipes - User found, ensuring validation...');

        // ENHANCED: Ensure user has all required fields before proceeding
        try {
            user = await ensureUserValidation(user);
        } catch (validationError) {
            console.error('❌ GET /api/saved-recipes - User validation failed:', validationError);
            // Return empty array rather than error to prevent client crashes
            return NextResponse.json({
                success: true,
                savedRecipes: [],
                totalCount: 0,
                warning: 'User validation issues detected, returning empty list'
            });
        }

        console.log(`✅ GET /api/saved-recipes - User has ${user.savedRecipes.length} saved recipes`);

        // ENHANCED: Safely populate saved recipes with better error handling
        let populatedUser;
        try {
            console.log('🔍 GET /api/saved-recipes - Populating saved recipes...');
            populatedUser = await User.findById(session.user.id)
                .populate({
                    path: 'savedRecipes.recipeId',
                    select: 'title description category difficulty prepTime cookTime servings isPublic createdAt ratingStats metrics tags',
                    populate: {
                        path: 'createdBy',
                        select: 'name email'
                    }
                });
            console.log('✅ GET /api/saved-recipes - Population completed');
        } catch (populateError) {
            console.error('❌ GET /api/saved-recipes - Error during population:', populateError);
            // Fallback: return basic user data without population
            console.log('📝 GET /api/saved-recipes - Returning unpopulated data as fallback');
            return NextResponse.json({
                success: true,
                savedRecipes: user.savedRecipes.map(saved => ({
                    _id: saved._id,
                    recipeId: saved.recipeId,
                    savedAt: saved.savedAt
                })),
                totalCount: user.savedRecipes.length,
                warning: 'Recipe details could not be loaded'
            });
        }

        // Filter out any saved recipes where the recipe was deleted or failed to populate
        const validSavedRecipes = (populatedUser?.savedRecipes || user.savedRecipes).filter(saved => {
            if (!saved) {
                console.warn('⚠️ GET /api/saved-recipes - Found null saved recipe entry, filtering out');
                return false;
            }
            if (!saved.recipeId) {
                console.warn('⚠️ GET /api/saved-recipes - Found saved recipe with no recipeId, filtering out');
                return false;
            }
            return true;
        });

        console.log(`✅ GET /api/saved-recipes - Found ${validSavedRecipes.length} valid saved recipes`);

        // Clean up invalid saved recipes from user document if needed
        if (validSavedRecipes.length !== user.savedRecipes.length) {
            console.log('🧹 GET /api/saved-recipes - Cleaning up invalid saved recipes...');
            try {
                user.savedRecipes = validSavedRecipes.map(saved => ({
                    recipeId: saved.recipeId._id || saved.recipeId,
                    savedAt: saved.savedAt
                }));
                await user.save();
                console.log('✅ GET /api/saved-recipes - Cleaned up invalid saved recipes');
            } catch (cleanupError) {
                console.warn('⚠️ GET /api/saved-recipes - Could not clean up invalid saved recipes:', cleanupError);
                // Continue anyway, this is not critical
            }
        }

        return NextResponse.json({
            success: true,
            savedRecipes: validSavedRecipes,
            totalCount: validSavedRecipes.length
        });

    } catch (error) {
        console.error('❌ GET /api/saved-recipes - Outer catch error:', error);
        console.error('❌ GET /api/saved-recipes - Error stack:', error.stack);
        console.error('❌ GET /api/saved-recipes - Error name:', error.name);
        console.error('❌ GET /api/saved-recipes - Error message:', error.message);

        // Provide user-friendly error response
        let userMessage = 'Failed to fetch saved recipes';
        let statusCode = 500;

        if (error.name === 'ValidationError') {
            userMessage = 'User data validation error';
            statusCode = 422;
        } else if (error.name === 'CastError') {
            userMessage = 'Invalid data format';
            statusCode = 400;
        } else if (error.message.includes('timeout')) {
            userMessage = 'Database timeout, please try again';
            statusCode = 503;
        }

        return NextResponse.json(
            {
                success: false,
                error: userMessage,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                errorType: error.name || 'Unknown'
            },
            { status: statusCode }
        );
    }
}

// POST - Save a recipe
export async function POST(request) {
    try {
        console.log('📝 POST /api/saved-recipes - Starting request');

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }

        const body = await request.json();
        const { recipeId } = body;

        if (!recipeId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Recipe ID is required'
                },
                { status: 400 }
            );
        }

        await connectDB();

        // Get user and ensure validation
        let user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'User not found'
            }, { status: 404 });
        }

        // Ensure user validation
        try {
            user = await ensureUserValidation(user);
        } catch (validationError) {
            console.error('❌ POST /api/saved-recipes - User validation failed:', validationError);
            return NextResponse.json({
                success: false,
                error: 'User validation error'
            }, { status: 422 });
        }

        // Get user tier for limit checking
        const userTier = user.subscription?.tier || 'free';

        // Check saved recipe limits
        const currentSavedCount = user.savedRecipes.length;
        const limitCheck = checkSavedRecipeLimits(userTier, currentSavedCount);

        if (!limitCheck.allowed) {
            let errorMessage;
            if (userTier === 'free') {
                errorMessage = `You've reached the free plan limit of 10 saved recipes. Upgrade to Gold for 200 saved recipes or Platinum for unlimited.`;
            } else if (userTier === 'gold') {
                errorMessage = `You've reached the Gold plan limit of 200 saved recipes. Upgrade to Platinum for unlimited saved recipes.`;
            } else {
                errorMessage = `You've reached your saved recipe limit.`;
            }

            return NextResponse.json({
                success: false,
                error: errorMessage,
                code: 'USAGE_LIMIT_EXCEEDED',
                feature: 'save_recipe',
                currentCount: limitCheck.currentCount,
                currentTier: userTier,
                upgradeUrl: `/pricing?source=save-recipe-limit`
            }, { status: 403 });
        }

        // Verify recipe exists and is accessible
        const recipe = await Recipe.findOne({
            _id: recipeId,
            $or: [
                { createdBy: session.user.id }, // User's own recipes
                { isPublic: true } // Public recipes
            ]
        });

        if (!recipe) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Recipe not found or not accessible'
                },
                { status: 404 }
            );
        }

        // Check if recipe is already saved
        const alreadySaved = user.savedRecipes.some(
            saved => saved.recipeId.toString() === recipeId
        );

        if (alreadySaved) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Recipe is already saved'
                },
                { status: 400 }
            );
        }

        // Add recipe to saved recipes
        user.savedRecipes.push({
            recipeId: recipeId,
            savedAt: new Date()
        });

        // Update usage tracking
        user.usageTracking.savedRecipes = user.savedRecipes.length;
        user.usageTracking.totalSavedRecipes = user.savedRecipes.length;
        user.usageTracking.lastUpdated = new Date();

        await user.save();

        // Get the saved recipe with populated data for response
        const savedUser = await User.findById(session.user.id)
            .populate({
                path: 'savedRecipes.recipeId',
                match: { _id: recipeId },
                select: 'title description category difficulty prepTime cookTime servings isPublic createdAt',
                populate: {
                    path: 'createdBy',
                    select: 'name email'
                }
            });

        const savedRecipe = savedUser.savedRecipes.find(
            saved => saved.recipeId && saved.recipeId._id.toString() === recipeId
        );

        const tier = user.subscription?.tier || 'free';
        let remainingSaves;
        if (tier === 'free') {
            remainingSaves = Math.max(0, 10 - user.savedRecipes.length);
        } else if (tier === 'gold') {
            remainingSaves = Math.max(0, 200 - user.savedRecipes.length);
        } else {
            remainingSaves = 'Unlimited';
        }

        return NextResponse.json({
            success: true,
            message: `"${recipe.title}" saved successfully`,
            savedRecipe: savedRecipe,
            totalSaved: user.savedRecipes.length,
            remainingSaves: remainingSaves
        });

    } catch (error) {
        console.error('❌ POST /api/saved-recipes - Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to save recipe',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}

// DELETE - Unsave a recipe
export async function DELETE(request) {
    try {
        console.log('🔍 DELETE /api/saved-recipes - Starting request');

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.log('❌ DELETE /api/saved-recipes - No session found');
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }

        console.log('✅ DELETE /api/saved-recipes - Session found for user:', session.user.id);

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        if (!recipeId) {
            console.log('❌ DELETE /api/saved-recipes - No recipeId provided');
            return NextResponse.json(
                {
                    success: false,
                    error: 'Recipe ID is required'
                },
                { status: 400 }
            );
        }

        console.log('✅ DELETE /api/saved-recipes - Recipe ID:', recipeId);

        await connectDB();
        console.log('✅ DELETE /api/saved-recipes - Database connected');

        let user = await User.findById(session.user.id);
        if (!user) {
            console.log('❌ DELETE /api/saved-recipes - User not found');
            return NextResponse.json({
                success: false,
                error: 'User not found'
            }, { status: 404 });
        }

        console.log('✅ DELETE /api/saved-recipes - User found');

        // Ensure user validation
        try {
            user = await ensureUserValidation(user);
        } catch (validationError) {
            console.error('❌ DELETE /api/saved-recipes - User validation failed:', validationError);
            return NextResponse.json({
                success: false,
                error: 'User validation error'
            }, { status: 422 });
        }

        // Find and remove the saved recipe
        const initialLength = user.savedRecipes.length;
        user.savedRecipes = user.savedRecipes.filter(
            saved => saved.recipeId.toString() !== recipeId
        );

        if (user.savedRecipes.length === initialLength) {
            console.log('❌ DELETE /api/saved-recipes - Recipe was not saved');
            return NextResponse.json(
                {
                    success: false,
                    error: 'Recipe was not saved'
                },
                { status: 404 }
            );
        }

        console.log('✅ DELETE /api/saved-recipes - Recipe removed from saved recipes');

        // Update usage tracking
        user.usageTracking.savedRecipes = user.savedRecipes.length;
        user.usageTracking.totalSavedRecipes = user.savedRecipes.length;
        user.usageTracking.lastUpdated = new Date();

        await user.save();
        console.log('✅ DELETE /api/saved-recipes - User saved successfully');

        console.log('✅ DELETE /api/saved-recipes - Request completed successfully');

        return NextResponse.json({
            success: true,
            message: 'Recipe unsaved successfully',
            totalSaved: user.savedRecipes.length
        });

    } catch (error) {
        console.error('❌ DELETE /api/saved-recipes - Error:', error);
        console.error('❌ DELETE /api/saved-recipes - Stack:', error.stack);

        // Provide user-friendly error response
        let userMessage = 'Failed to unsave recipe';
        let statusCode = 500;

        if (error.name === 'ValidationError') {
            userMessage = 'User data validation error';
            statusCode = 422;
        } else if (error.name === 'CastError') {
            userMessage = 'Invalid recipe ID format';
            statusCode = 400;
        }

        return NextResponse.json(
            {
                success: false,
                error: userMessage,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: statusCode }
        );
    }
}