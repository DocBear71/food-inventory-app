// file: /src/app/api/collections/route.js
// GET /api/collections - Fetch user's collections
// POST /api/collections - Create new collection

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import RecipeCollection from '@/models/RecipeCollection';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectToDatabase();

        // Fetch user's collections, populate recipe details
        const collections = await RecipeCollection.find({
            userId: session.user.id
        })
            .populate({
                path: 'recipes.recipeId',
                select: 'title description difficulty prepTime cookTime servings isPublic createdAt',
                model: 'Recipe'
            })
            .sort({ updatedAt: -1 });

        return NextResponse.json({
            success: true,
            collections: collections
        });

    } catch (error) {
        console.error('Error fetching collections:', error);
        return NextResponse.json(
            { error: 'Failed to fetch collections' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, description, recipes = [], isPublic = false } = body;

        // Validation
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

        if (description && description.length > 500) {
            return NextResponse.json(
                { error: 'Description must be 500 characters or less' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Check if user already has a collection with this name
        const existingCollection = await RecipeCollection.findOne({
            userId: session.user.id,
            name: name.trim()
        });

        if (existingCollection) {
            return NextResponse.json(
                { error: 'You already have a collection with this name' },
                { status: 400 }
            );
        }

        // Process recipes array if provided
        const processedRecipes = recipes.map(recipe => ({
            recipeId: recipe.recipeId || recipe,
            addedAt: new Date()
        }));

        // Create new collection
        const newCollection = new RecipeCollection({
            userId: session.user.id,
            name: name.trim(),
            description: description?.trim() || '',
            recipes: processedRecipes,
            isPublic,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await newCollection.save();

        // Populate the created collection for response
        await newCollection.populate({
            path: 'recipes.recipeId',
            select: 'title description difficulty prepTime cookTime servings isPublic createdAt',
            model: 'Recipe'
        });

        return NextResponse.json({
            success: true,
            collection: newCollection,
            message: 'Collection created successfully'
        });

    } catch (error) {
        console.error('Error creating collection:', error);
        return NextResponse.json(
            { error: 'Failed to create collection' },
            { status: 500 }
        );
    }
}

