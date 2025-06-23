// file: /src/app/api/collections/route.js v2 - Added subscription gates for collection limits
// GET /api/collections - Fetch user's collections
// POST /api/collections - Create new collection (with subscription limits)

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import RecipeCollection from '@/models/RecipeCollection';
import { User } from '@/lib/models';
import { FEATURE_GATES, checkFeatureAccess, checkUsageLimit } from '@/lib/subscription-config';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

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

        await connectDB();

        // SUBSCRIPTION CHECK: Get user with subscription data
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if user has feature access for recipe collections
        const hasAccess = checkFeatureAccess(user.subscription, FEATURE_GATES.RECIPE_COLLECTIONS);
        if (!hasAccess) {
            return NextResponse.json({
                error: 'Recipe collections are not available on your current plan',
                upgradeRequired: true,
                requiredTier: 'gold',
                feature: 'recipe_collections'
            }, { status: 403 });
        }

        const currentCollectionCount = await RecipeCollection.countDocuments({
            userId: session.user.id
        });

        // Check feature access
        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };

        // Initialize usageTracking if it doesn't exist
        if (!user.usageTracking) {
            user.usageTracking = {
                currentMonth: new Date().getMonth(),
                currentYear: new Date().getFullYear(),
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                totalInventoryItems: 0,
                totalPersonalRecipes: 0,
                savedRecipes: user.savedRecipes ? user.savedRecipes.length : 0,
                lastUpdated: new Date()
            };
            await user.save();
        }

        console.log('Collection count check:', {
            userId: session.user.id,
            actualCollections: currentCollectionCount,
            userTier: userSubscription.tier,
            hasAccess
        });

        // Check usage limits using ACTUAL count from database
        const hasCapacity = checkUsageLimit(
            userSubscription,
            FEATURE_GATES.RECIPE_COLLECTIONS,
            currentCollectionCount  // Use actual count, not cached count
        );

        if (!hasCapacity) {
            const tier = user.subscription?.tier || 'free';
            const limits = {
                free: 2,
                gold: 10,
                platinum: 'unlimited'
            };

            return NextResponse.json({
                error: `Collection limit reached. ${tier === 'free' ? 'Free users' : 'Gold users'} can create up to ${limits[tier]} collections.`,
                upgradeRequired: tier === 'free',
                requiredTier: tier === 'free' ? 'gold' : 'platinum',
                currentCount: currentCollectionCount,
                limit: limits[tier],
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

        // Update user's collection count in usage tracking
        await user.updateRecipeCollectionCount(currentCollectionCount + 1);

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