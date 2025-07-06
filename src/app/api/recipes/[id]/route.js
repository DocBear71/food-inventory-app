// file: /src/app/api/recipes/[id]/route.js v3 - Updated with User Tracking

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth'
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

// GET - Fetch a single recipe
export async function GET(request, { params }) {
    try {
        const session = await getEnhancedSession(authOptions);
        const { id: recipeId } = await params;

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const recipe = await Recipe.findById(recipeId)
            .populate('createdBy', 'name profile.cookingLevel')
            .populate('lastEditedBy', 'name') // NEW: Populate last editor info
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
        const session = await getServerSession(authOptions);
        const { id: recipeId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

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

        // Update recipe fields
        const allowedUpdates = [
            'title', 'description', 'ingredients', 'instructions',
            'cookTime', 'prepTime', 'servings', 'difficulty', 'tags',
            'source', 'isPublic', 'category' // Added category to allowed updates
        ];

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                recipe[field] = updates[field];
            }
        });

        // NEW: Track who last edited this recipe
        recipe.lastEditedBy = session.user.id;
        recipe.updatedAt = new Date();

        await recipe.save();

        // Return populated recipe for better response
        const updatedRecipe = await Recipe.findById(recipeId)
            .populate('createdBy', 'name profile.cookingLevel')
            .populate('lastEditedBy', 'name')
            .lean();

        return NextResponse.json({
            success: true,
            recipe: updatedRecipe,
            message: 'Recipe updated successfully'
        });

    } catch (error) {
        console.error('PUT recipe error:', error);
        return NextResponse.json(
            { error: 'Failed to update recipe' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a recipe (only by owner)
export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        const { id: recipeId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

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