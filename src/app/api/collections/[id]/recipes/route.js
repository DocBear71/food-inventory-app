// file: /src/app/api/collections/[id]/recipes/route.js v2 - FIXED imports
// POST /api/collections/[id]/recipes - Add recipe to collection
// DELETE /api/collections/[id]/recipes - Remove recipe from collection

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { RecipeCollection, Recipe } from '@/lib/models'; // FIXED: Correct import
import mongoose from 'mongoose';

export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { id } = params;
        const body = await request.json();
        const { recipeId } = body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: 'Invalid collection ID' },
                { status: 400 }
            );
        }

        if (!mongoose.Types.ObjectId.isValid(recipeId)) {
            return NextResponse.json(
                { error: 'Invalid recipe ID' },
                { status: 400 }
            );
        }

        await connectDB();

        // Verify collection exists and user owns it
        const collection = await RecipeCollection.findOne({
            _id: id,
            userId: session.user.id
        });

        if (!collection) {
            return NextResponse.json(
                { error: 'Collection not found or access denied' },
                { status: 404 }
            );
        }

        // Verify recipe exists and is accessible
        const recipe = await Recipe.findOne({
            _id: recipeId,
            $or: [
                { createdBy: session.user.id },
                { isPublic: true }
            ]
        });

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found or access denied' },
                { status: 404 }
            );
        }

        // Check if recipe is already in collection
        const recipeExists = collection.recipes.some(
            r => r.recipeId.toString() === recipeId
        );

        if (recipeExists) {
            return NextResponse.json(
                { error: 'Recipe is already in this collection' },
                { status: 400 }
            );
        }

        // Add recipe to collection
        collection.recipes.push({
            recipeId: recipeId,
            addedAt: new Date()
        });
        collection.updatedAt = new Date();

        await collection.save();

        // Return updated collection with populated recipes
        const updatedCollection = await RecipeCollection.findById(id)
            .populate({
                path: 'recipes.recipeId',
                select: 'title description difficulty prepTime cookTime servings isPublic createdAt',
                model: 'Recipe'
            });

        return NextResponse.json({
            success: true,
            collection: updatedCollection,
            message: `"${recipe.title}" added to collection successfully`
        });

    } catch (error) {
        console.error('Error adding recipe to collection:', error);
        return NextResponse.json(
            { error: 'Failed to add recipe to collection' },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { id } = params;
        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: 'Invalid collection ID' },
                { status: 400 }
            );
        }

        if (!mongoose.Types.ObjectId.isValid(recipeId)) {
            return NextResponse.json(
                { error: 'Invalid recipe ID' },
                { status: 400 }
            );
        }

        await connectDB();

        // Find collection and verify ownership
        const collection = await RecipeCollection.findOne({
            _id: id,
            userId: session.user.id
        });

        if (!collection) {
            return NextResponse.json(
                { error: 'Collection not found or access denied' },
                { status: 404 }
            );
        }

        // Check if recipe exists in collection
        const recipeIndex = collection.recipes.findIndex(
            r => r.recipeId.toString() === recipeId
        );

        if (recipeIndex === -1) {
            return NextResponse.json(
                { error: 'Recipe not found in this collection' },
                { status: 404 }
            );
        }

        // Remove recipe from collection
        collection.recipes.splice(recipeIndex, 1);
        collection.updatedAt = new Date();

        await collection.save();

        // Return updated collection with populated recipes
        const updatedCollection = await RecipeCollection.findById(id)
            .populate({
                path: 'recipes.recipeId',
                select: 'title description difficulty prepTime cookTime servings isPublic createdAt',
                model: 'Recipe'
            });

        return NextResponse.json({
            success: true,
            collection: updatedCollection,
            message: 'Recipe removed from collection successfully'
        });

    } catch (error) {
        console.error('Error removing recipe from collection:', error);
        return NextResponse.json(
            { error: 'Failed to remove recipe from collection' },
            { status: 500 }
        );
    }
}