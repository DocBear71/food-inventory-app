// file: /src/app/api/saved-recipes/route.js v1 - Individual recipe saving API

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User, Recipe } from '@/lib/models';
import { FEATURE_GATES, checkFeatureAccess, checkUsageLimit, getRequiredTier, getUpgradeMessage } from '@/lib/subscription-config';

// GET - Fetch user's saved recipes
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

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
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Filter out any saved recipes where the recipe was deleted
        const validSavedRecipes = user.savedRecipes.filter(saved => saved.recipeId);

        return NextResponse.json({
            success: true,
            savedRecipes: validSavedRecipes,
            totalCount: validSavedRecipes.length
        });

    } catch (error) {
        console.error('Error fetching saved recipes:', error);
        return NextResponse.json(
            { error: 'Failed to fetch saved recipes' },
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

        // Get user and check subscription
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check feature access
        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };

        const hasAccess = checkFeatureAccess(userSubscription, FEATURE_GATES.SAVE_RECIPE);
        if (!hasAccess) {
            const requiredTier = getRequiredTier(FEATURE_GATES.SAVE_RECIPE);
            return NextResponse.json({
                error: getUpgradeMessage(FEATURE_GATES.SAVE_RECIPE, requiredTier),
                code: 'FEATURE_NOT_AVAILABLE',
                feature: FEATURE_GATES.SAVE_RECIPE,
                requiredTier: requiredTier,
                upgradeUrl: `/pricing?source=save-recipe&feature=${FEATURE_GATES.SAVE_RECIPE}&required=${requiredTier}`
            }, { status: 403 });
        }

        // Initialize savedRecipes array if it doesn't exist
        if (!user.savedRecipes) {
            user.savedRecipes = [];
        }

        // Check usage limits
        const currentSavedCount = user.savedRecipes.length;
        const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.SAVE_RECIPE, currentSavedCount);

        if (!hasCapacity) {
            const requiredTier = getRequiredTier(FEATURE_GATES.SAVE_RECIPE);
            let errorMessage;

            if (userSubscription.tier === 'free') {
                errorMessage = `You've reached the free plan limit of 10 saved recipes. Upgrade to Gold for 200 saved recipes or Platinum for unlimited.`;
            } else if (userSubscription.tier === 'gold') {
                errorMessage = `You've reached the Gold plan limit of 200 saved recipes. Upgrade to Platinum for unlimited saved recipes.`;
            } else {
                errorMessage = getUpgradeMessage(FEATURE_GATES.SAVE_RECIPE, requiredTier);
            }

            return NextResponse.json({
                error: errorMessage,
                code: 'USAGE_LIMIT_EXCEEDED',
                feature: FEATURE_GATES.SAVE_RECIPE,
                currentCount: currentSavedCount,
                currentTier: userSubscription.tier,
                requiredTier: requiredTier,
                upgradeUrl: `/pricing?source=save-recipe-limit&feature=${FEATURE_GATES.SAVE_RECIPE}&required=${requiredTier}`
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

        // Update usage tracking
        if (!user.usageTracking) {
            user.usageTracking = {};
        }
        user.usageTracking.savedRecipes = user.savedRecipes.length;
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
            saved => saved.recipeId._id.toString() === recipeId
        );

        return NextResponse.json({
            success: true,
            message: `"${recipe.title}" saved successfully`,
            savedRecipe: savedRecipe,
            totalSaved: user.savedRecipes.length,
            remainingSaves: userSubscription.tier === 'free' ?
                Math.max(0, 10 - user.savedRecipes.length) :
                userSubscription.tier === 'gold' ?
                    Math.max(0, 200 - user.savedRecipes.length) : 'Unlimited'
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
        const session = await getServerSession(authOptions);

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

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Initialize savedRecipes array if it doesn't exist
        if (!user.savedRecipes) {
            user.savedRecipes = [];
        }

        // Find and remove the saved recipe
        const initialLength = user.savedRecipes.length;
        user.savedRecipes = user.savedRecipes.filter(
            saved => saved.recipeId.toString() !== recipeId
        );

        if (user.savedRecipes.length === initialLength) {
            return NextResponse.json(
                { error: 'Recipe was not saved' },
                { status: 404 }
            );
        }

        // Update usage tracking
        if (!user.usageTracking) {
            user.usageTracking = {};
        }
        user.usageTracking.savedRecipes = user.savedRecipes.length;
        user.usageTracking.lastUpdated = new Date();

        await user.save();

        return NextResponse.json({
            success: true,
            message: 'Recipe unsaved successfully',
            totalSaved: user.savedRecipes.length
        });

    } catch (error) {
        console.error('Error unsaving recipe:', error);
        return NextResponse.json(
            { error: 'Failed to unsave recipe' },
            { status: 500 }
        );
    }
}