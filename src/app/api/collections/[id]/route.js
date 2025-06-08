// file: /src/app/api/collections/[id]/route.js
// GET /api/collections/[id] - Get specific collection
// PUT /api/collections/[id] - Update collection details
// DELETE /api/collections/[id] - Delete collection

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import RecipeCollection from '@/models/RecipeCollection';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: 'Invalid collection ID' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Find collection - check if public or user owns it
        const collection = await RecipeCollection.findOne({
            _id: id,
            $or: [
                { userId: session?.user?.id },
                { isPublic: true }
            ]
        })
            .populate({
                path: 'recipes.recipeId',
                select: 'title description difficulty prepTime cookTime servings isPublic createdAt createdBy',
                model: 'Recipe'
            })
            .populate({
                path: 'userId',
                select: 'name email',
                model: 'User'
            });

        if (!collection) {
            return NextResponse.json(
                { error: 'Collection not found or access denied' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            collection: collection
        });

    } catch (error) {
        console.error('Error fetching collection:', error);
        return NextResponse.json(
            { error: 'Failed to fetch collection' },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
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
        const { name, description, isPublic } = body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: 'Invalid collection ID' },
                { status: 400 }
            );
        }

        await connectToDatabase();

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

        // Validation
        if (name !== undefined) {
            if (!name || name.trim().length === 0) {
                return NextResponse.json(
                    { error: 'Collection name is required' },
                    { status: 400 }
                );
            }

            if (name.length > 100) {
                return NextResponse.json(
                    { error: 'Collection name must be 100 characters or less' },
                    { status: 400 }
                );
            }

            // Check for duplicate name (excluding current collection)
            const existingCollection = await RecipeCollection.findOne({
                userId: session.user.id,
                name: name.trim(),
                _id: { $ne: id }
            });

            if (existingCollection) {
                return NextResponse.json(
                    { error: 'You already have a collection with this name' },
                    { status: 400 }
                );
            }
        }

        if (description !== undefined && description.length > 500) {
            return NextResponse.json(
                { error: 'Description must be 500 characters or less' },
                { status: 400 }
            );
        }

        // Update collection
        const updateData = { updatedAt: new Date() };
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description.trim();
        if (isPublic !== undefined) updateData.isPublic = isPublic;

        const updatedCollection = await RecipeCollection.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate({
            path: 'recipes.recipeId',
            select: 'title description difficulty prepTime cookTime servings isPublic createdAt',
            model: 'Recipe'
        });

        return NextResponse.json({
            success: true,
            collection: updatedCollection,
            message: 'Collection updated successfully'
        });

    } catch (error) {
        console.error('Error updating collection:', error);
        return NextResponse.json(
            { error: 'Failed to update collection' },
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

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: 'Invalid collection ID' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Find and delete collection (verify ownership)
        const deletedCollection = await RecipeCollection.findOneAndDelete({
            _id: id,
            userId: session.user.id
        });

        if (!deletedCollection) {
            return NextResponse.json(
                { error: 'Collection not found or access denied' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Collection deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting collection:', error);
        return NextResponse.json(
            { error: 'Failed to delete collection' },
            { status: 500 }
        );
    }
}
