// file: /src/app/api/collections/route.js v6 - Added mobile session support

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { RecipeCollection, User } from '@/lib/models';

// Simple collection limit check that works with your existing system
const checkCollectionLimits = (userTier, currentCount) => {
    const limits = {
        free: 2,
        gold: 10,
        platinum: -1, // unlimited
        admin: -1 // unlimited
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

export async function GET(request) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            console.log('GET /api/collections - No session found');
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        console.log('GET /api/collections - Session found:', session.user.email, 'source:', session.source);

        await connectDB();

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

        console.log(`GET /api/collections - Found ${collections.length} collections`);

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
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            console.log('POST /api/collections - No session found');
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        console.log('POST /api/collections - Session found:', session.user.email, 'source:', session.source);

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

        await connectDB();

        // Get user
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get effective tier
        const userTier = user.getEffectiveTier();

        const currentCollectionCount = await RecipeCollection.countDocuments({
            userId: session.user.id
        });

        // Check collection limits
        const limitCheck = checkCollectionLimits(userTier, currentCollectionCount);
        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: `Collection limit reached. ${userTier === 'free' ? 'Free users' : 'Gold users'} can create up to ${limitCheck.limit} collections.`,
                upgradeRequired: userTier === 'free',
                requiredTier: userTier === 'free' ? 'gold' : 'platinum',
                currentCount: limitCheck.currentCount,
                limit: limitCheck.limit,
                feature: 'recipe_collections'
            }, { status: 403 });
        }

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

        // Update user's collection count if they have usage tracking
        try {
            if (user.updateRecipeCollectionCount) {
                const newCount = await RecipeCollection.countDocuments({ userId: session.user.id });
                await user.updateRecipeCollectionCount(newCount);
            }
        } catch (error) {
            console.warn('Could not update collection count:', error);
            // Don't fail the request for this
        }

        // Populate the created collection for response
        await newCollection.populate({
            path: 'recipes.recipeId',
            select: 'title description difficulty prepTime cookTime servings isPublic createdAt',
            model: 'Recipe'
        });

        console.log('POST /api/collections - Collection created successfully');

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