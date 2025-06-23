// file: /src/app/api/saved-recipes/route.js v5 - Enhanced error handling and debugging

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

// GET - Fetch user's saved recipes
export async function GET(request) {
    try {
        console.log('🔍 GET /api/saved-recipes - Starting request');

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.log('❌ GET /api/saved-recipes - No session found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('✅ GET /api/saved-recipes - Session found for user:', session.user.id);

        await connectDB();
        console.log('✅ GET /api/saved-recipes - Database connected');

        // Get user with saved recipes
        const user = await User.findById(session.user.id)
            .populate({
                path: 'savedRecipes.recipeId',
                select: 'title description category difficulty prepTime cookTime servings isPublic createdAt ratingStats metrics tags',
                populate: {
                    path: 'createdBy',
                    select: 'name email'
                }
            });

        if (!user) {
            console.log('❌ GET /api/saved-recipes - User not found');
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log('✅ GET /api/saved-recipes - User found');

        // Initialize savedRecipes array if it doesn't exist
        if (!user.savedRecipes) {
            user.savedRecipes = [];
            console.log('📝 GET /api/saved-recipes - Initialized empty savedRecipes array');
        }

        // Filter out any saved recipes where the recipe was deleted
        const validSavedRecipes = user.savedRecipes.filter(saved => saved.recipeId);
        console.log(`✅ GET /api/saved-recipes - Found ${validSavedRecipes.length} valid saved recipes`);

        return NextResponse.json({
            success: true,
            savedRecipes: validSavedRecipes,
            totalCount: validSavedRecipes.length
        });

    } catch (error) {
        console.error('❌ GET /api/saved-recipes - Error:', error);
        console.error('❌ GET /api/saved-recipes - Stack:', error.stack);
        return NextResponse.json(
            { error: 'Failed to fetch saved recipes', details: error.message },
            { status: 500 }
        );
    }
}

// POST - Save a recipe
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { recipeId } = body;

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Get user
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Initialize savedRecipes array if it doesn't exist
        if (!user.savedRecipes) {
            user.savedRecipes = [];
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
                { error: 'Recipe not found or not accessible' },
                { status: 404 }
            );
        }

        // Check if recipe is already saved
        const alreadySaved = user.savedRecipes.some(
            saved => saved.recipeId.toString() === recipeId
        );

        if (alreadySaved) {
            return NextResponse.json(
                { error: 'Recipe is already saved' },
                { status: 400 }
            );
        }

        // Add recipe to saved recipes
        user.savedRecipes.push({
            recipeId: recipeId,
            savedAt: new Date()
        });

        // Update usage tracking if available
        try {
            if (!user.usageTracking) {
                user.usageTracking = {};
            }
            user.usageTracking.savedRecipes = user.savedRecipes.length;
            user.usageTracking.lastUpdated = new Date();
        } catch (error) {
            console.warn('Could not update usage tracking:', error);
            // Don't fail the request for this
        }

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
        console.error('Error saving recipe:', error);
        return NextResponse.json(
            { error: 'Failed to save recipe' },
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('✅ DELETE /api/saved-recipes - Session found for user:', session.user.id);

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        if (!recipeId) {
            console.log('❌ DELETE /api/saved-recipes - No recipeId provided');
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        console.log('✅ DELETE /api/saved-recipes - Recipe ID:', recipeId);

        await connectDB();
        console.log('✅ DELETE /api/saved-recipes - Database connected');

        const user = await User.findById(session.user.id);
        if (!user) {
            console.log('❌ DELETE /api/saved-recipes - User not found');
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log('✅ DELETE /api/saved-recipes - User found');

        // Initialize savedRecipes array if it doesn't exist
        if (!user.savedRecipes) {
            user.savedRecipes = [];
            console.log('📝 DELETE /api/saved-recipes - Initialized empty savedRecipes array');
        }

        // Find and remove the saved recipe
        const initialLength = user.savedRecipes.length;
        user.savedRecipes = user.savedRecipes.filter(
            saved => saved.recipeId.toString() !== recipeId
        );

        if (user.savedRecipes.length === initialLength) {
            console.log('❌ DELETE /api/saved-recipes - Recipe was not saved');
            return NextResponse.json(
                { error: 'Recipe was not saved' },
                { status: 404 }
            );
        }

        console.log('✅ DELETE /api/saved-recipes - Recipe removed from saved recipes');

        // Update usage tracking if available
        try {
            if (!user.usageTracking) {
                user.usageTracking = {};
            }
            user.usageTracking.savedRecipes = user.savedRecipes.length;
            user.usageTracking.lastUpdated = new Date();
            console.log('✅ DELETE /api/saved-recipes - Updated usage tracking');
        } catch (trackingError) {
            console.warn('⚠️ DELETE /api/saved-recipes - Could not update usage tracking:', trackingError);
            // Don't fail the request for this
        }

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
        return NextResponse.json(
            { error: 'Failed to unsave recipe', details: error.message },
            { status: 500 }
        );
    }
}