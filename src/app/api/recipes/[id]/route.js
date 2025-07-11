// file: /src/app/api/recipes/[id]/route.js v4 - FIXED session handling and video instruction support

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Recipe, User } from '@/lib/models';

// GET - Fetch a single recipe
export async function GET(request, { params }) {
    try {
        const session = await getEnhancedSession(request);
        const { id: recipeId } = await params;

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const recipe = await Recipe.findById(recipeId)
            .populate('createdBy', 'name email')
            .populate('lastEditedBy', 'name email')
            .lean();

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        // Check if user can view this recipe
        if (!recipe.isPublic && (!session?.user?.id || recipe.createdBy._id.toString() !== session.user.id)) {
            return NextResponse.json(
                { error: 'Not authorized to view this recipe' },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            recipe
        });

    } catch (error) {
        console.error('GET single recipe error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch recipe' },
            { status: 500 }
        );
    }
}

// PUT - Update a recipe (only by owner)
export async function PUT(request, { params }) {
    try {
        const session = await getEnhancedSession(request);
        const { id: recipeId } = await params;

        if (!session?.user?.id) {
            console.log('PUT /api/recipes/[id] - No session found');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        console.log('PUT /api/recipes/[id] - Session found:', session.user.email, 'source:', session.source);

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        const updates = await request.json();

        await connectDB();

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        // Check if user owns this recipe
        if (recipe.createdBy.toString() !== session.user.id) {
            return NextResponse.json(
                { error: 'Not authorized to update this recipe' },
                { status: 403 }
            );
        }

        // FIXED: Handle both string and object instructions (preserve video format if editing video recipe)
        if (updates.instructions) {
            const processedInstructions = updates.instructions
                .filter(inst => {
                    if (typeof inst === 'string') {
                        return inst.trim() !== '';
                    } else if (typeof inst === 'object' && inst !== null && inst.text) {
                        return inst.text.trim() !== '';
                    }
                    return false;
                })
                .map((inst, index) => {
                    if (typeof inst === 'string') {
                        // Convert string to object format for consistency
                        return {
                            text: inst,
                            step: index + 1,
                            videoTimestamp: null,
                            videoLink: null
                        };
                    }
                    return inst; // Already an object
                });

            updates.instructions = processedInstructions;
        }

        // Filter ingredients
        if (updates.ingredients) {
            updates.ingredients = updates.ingredients.filter(ing => ing.name && ing.name.trim() !== '');
        }

        // Check public recipe permissions
        if (updates.hasOwnProperty('isPublic') && updates.isPublic) {
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
                    isPublic: true,
                    _id: { $ne: recipeId } // Exclude current recipe from count
                });

                if (currentPublicCount >= 25) {
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
        }

        // Update recipe fields
        const allowedUpdates = [
            'title', 'description', 'ingredients', 'instructions',
            'cookTime', 'prepTime', 'servings', 'difficulty', 'tags',
            'source', 'isPublic', 'category', 'nutrition'
        ];

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                recipe[field] = updates[field];
            }
        });

        // Handle nutrition data
        if (updates.nutrition && Object.keys(updates.nutrition).length > 0) {
            recipe.nutrition = updates.nutrition;
            recipe.nutritionManuallySet = true;
            recipe.nutritionCalculatedAt = new Date();
        }

        // Track who last edited this recipe
        recipe.lastEditedBy = session.user.id;
        recipe.updatedAt = new Date();

        await recipe.save();

        // Return populated recipe for better response
        const updatedRecipe = await Recipe.findById(recipeId)
            .populate('createdBy', 'name email')
            .populate('lastEditedBy', 'name email')
            .lean();

        console.log('PUT /api/recipes/[id] - Recipe updated successfully');

        return NextResponse.json({
            success: true,
            recipe: updatedRecipe,
            message: 'Recipe updated successfully'
        });

    } catch (error) {
        console.error('PUT recipe error:', error);
        console.error('Error stack:', error.stack);
        return NextResponse.json(
            {
                error: 'Failed to update recipe',
                details: error.message
            },
            { status: 500 }
        );
    }
}

// DELETE - Delete a recipe (only by owner)
export async function DELETE(request, { params }) {
    try {
        const session = await getEnhancedSession(request);
        const { id: recipeId } = await params;

        if (!session?.user?.id) {
            console.log('DELETE /api/recipes/[id] - No session found');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        console.log('DELETE /api/recipes/[id] - Session found:', session.user.email, 'source:', session.source);

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        // Check if user owns this recipe
        if (recipe.createdBy.toString() !== session.user.id) {
            return NextResponse.json(
                { error: 'Not authorized to delete this recipe' },
                { status: 403 }
            );
        }

        await Recipe.findByIdAndDelete(recipeId);

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

        console.log('DELETE /api/recipes/[id] - Recipe deleted successfully');

        return NextResponse.json({
            success: true,
            message: 'Recipe deleted successfully'
        });

    } catch (error) {
        console.error('DELETE recipe error:', error);
        return NextResponse.json(
            { error: 'Failed to delete recipe' },
            { status: 500 }
        );
    }
}