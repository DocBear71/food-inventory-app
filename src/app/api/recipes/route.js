// file: /src/app/api/recipes/route.js v5 - Added subscription-based recipe creation limits

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, User } from '@/lib/models';
import { FEATURE_GATES, checkUsageLimit, getUpgradeMessage, getRequiredTier } from '@/lib/subscription-config';

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

// GET - Fetch user's recipes or a single recipe
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
                .populate('createdBy', 'name email') // Populate creator info
                .populate('lastEditedBy', 'name email'); // Populate last editor info

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

// POST - Add new recipe (with subscription limits)
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
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
            importedFrom // ADD THIS for imported recipes
        } = body;

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

        const recipeData = {
            title,
            description: description || '',
            ingredients: ingredients.filter(ing => ing.name && ing.name.trim() !== ''),
            instructions: instructions.filter(inst => inst && inst.trim() !== ''),
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
            // PUBLIC RECIPE SUBSCRIPTION CHECK
            isPublic: await checkPublicRecipePermission(session.user.id, isPublic),
            ...(nutrition && Object.keys(nutrition).length > 0 && {
                nutrition: nutrition,
                nutritionManuallySet: true,
                nutritionCalculatedAt: new Date()
            })
        };

        const recipe = new Recipe(recipeData);
        await recipe.save();

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

        return NextResponse.json({
            success: true,
            recipe,
            message: 'Recipe added successfully',
            remainingRecipes: userSubscription.tier === 'free' ?
                Math.max(0, 5 - (currentRecipeCount + 1)) :
                userSubscription.tier === 'gold' ?
                    Math.max(0, 100 - (currentRecipeCount + 1)) : 'Unlimited'
        });

    } catch (error) {
        console.error('POST recipes error:', error);
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

// PUT - Update recipe
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { recipeId, ...updateData } = body;

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
                { error: 'Recipe not found or you do not have permission to edit it' },
                { status: 404 }
            );
        }

        // Prepare update data
        const updateFields = {
            ...updateData,
            ingredients: updateData.ingredients?.filter(ing => ing.name && ing.name.trim() !== ''),
            instructions: updateData.instructions?.filter(inst => inst && inst.trim() !== ''),
            lastEditedBy: session.user.id,
            updatedAt: new Date()
        };

        // PUBLIC RECIPE SUBSCRIPTION CHECK for updates
        if (updateData.hasOwnProperty('isPublic')) {
            const canMakePublic = await checkPublicRecipePermission(session.user.id, updateData.isPublic);

            if (updateData.isPublic && !canMakePublic) {
                // User wants to make it public but doesn't have permission
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

        // Handle nutrition data if provided
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

        return NextResponse.json({
            success: true,
            recipe: updatedRecipe,
            message: 'Recipe updated successfully'
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