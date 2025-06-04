// Replace /src/app/api/shopping/generate/route.js with this debug version
// We'll add functionality step by step to find what breaks

import { NextResponse } from 'next/server';

// GET endpoint for single recipe shopping list
export async function GET(request) {
    try {
        console.log('=== STEP 1: Basic API Call ===');

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');
        console.log('Recipe ID:', recipeId);

        if (!recipeId) {
            return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
        }

        console.log('=== STEP 2: Try Auth Import ===');
        let authModule;
        try {
            authModule = await import('@/lib/auth');
            console.log('✅ Auth import successful');
        } catch (error) {
            console.error('❌ Auth import failed:', error);
            return NextResponse.json({
                error: 'Auth import failed',
                details: error.message
            }, { status: 500 });
        }

        console.log('=== STEP 3: Try Session Check ===');
        let session;
        try {
            const { getServerSession } = await import('next-auth/next');
            session = await getServerSession(authModule.authOptions);
            console.log('Session result:', session ? 'found' : 'null');
        } catch (error) {
            console.error('❌ Session check failed:', error);
            return NextResponse.json({
                error: 'Session check failed',
                details: error.message
            }, { status: 500 });
        }

        if (!session?.user?.id) {
            console.log('❌ No authenticated user');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('=== STEP 4: Try MongoDB Import ===');
        let connectDB;
        try {
            const mongoModule = await import('@/lib/mongodb');
            connectDB = mongoModule.default;
            console.log('✅ MongoDB import successful');
        } catch (error) {
            console.error('❌ MongoDB import failed:', error);
            return NextResponse.json({
                error: 'MongoDB import failed',
                details: error.message
            }, { status: 500 });
        }

        console.log('=== STEP 5: Try Database Connection ===');
        try {
            await connectDB();
            console.log('✅ Database connected');
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            return NextResponse.json({
                error: 'Database connection failed',
                details: error.message
            }, { status: 500 });
        }

        console.log('=== STEP 6: Try Models Import ===');
        let Recipe, UserInventory;
        try {
            const modelsModule = await import('@/lib/models');
            Recipe = modelsModule.Recipe;
            UserInventory = modelsModule.UserInventory;
            console.log('✅ Models import successful');
        } catch (error) {
            console.error('❌ Models import failed:', error);
            return NextResponse.json({
                error: 'Models import failed',
                details: error.message
            }, { status: 500 });
        }

        console.log('=== STEP 7: Try Database Queries ===');
        let recipe, inventory;
        try {
            console.log('Querying recipe with ID:', recipeId);
            console.log('User ID:', session.user.id);

            recipe = await Recipe.findOne({ _id: recipeId, userId: session.user.id });
            console.log('Recipe query result:', recipe ? `Found: ${recipe.title}` : 'Not found');

            inventory = await UserInventory.find({ userId: session.user.id });
            console.log('Inventory query result:', `Found ${inventory.length} items`);

        } catch (error) {
            console.error('❌ Database query failed:', error);
            return NextResponse.json({
                error: 'Database query failed',
                details: error.message,
                stack: error.stack
            }, { status: 500 });
        }

        if (!recipe) {
            console.log('❌ Recipe not found');
            return NextResponse.json({
                error: 'Recipe not found',
                debug: {
                    recipeId,
                    userId: session.user.id,
                    foundRecipe: false
                }
            }, { status: 404 });
        }

        console.log('=== SUCCESS: All steps completed ===');

        // Return minimal shopping list for now
        return NextResponse.json({
            success: true,
            shoppingList: {
                items: {
                    'Produce': [
                        {
                            name: '1 clove garlic',
                            category: 'Produce',
                            originalName: 'garlic',
                            needAmount: 1,
                            haveAmount: 0,
                            unit: 'clove',
                            recipes: [recipe.title],
                            status: 'need to buy',
                            isPantryStaple: false
                        }
                    ],
                    'Pantry': [
                        {
                            name: '1 tsp salt',
                            category: 'Pantry',
                            originalName: 'salt',
                            needAmount: 1,
                            haveAmount: 0,
                            unit: 'tsp',
                            recipes: [recipe.title],
                            status: 'need to buy',
                            isPantryStaple: true
                        },
                        {
                            name: '1 tsp pepper',
                            category: 'Pantry',
                            originalName: 'pepper',
                            needAmount: 1,
                            haveAmount: 0,
                            unit: 'tsp',
                            recipes: [recipe.title],
                            status: 'need to buy',
                            isPantryStaple: true
                        }
                    ]
                },
                recipes: [recipe.title],
                summary: {
                    totalItems: 5,
                    categories: 2,
                    alreadyHave: 2, // pasta and oil
                    needToBuy: 3 // garlic, salt, pepper
                }
            },
            debug: {
                recipeTitle: recipe.title,
                inventoryCount: inventory.length,
                step: 'All steps successful'
            }
        });

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        return NextResponse.json({
            error: 'Unexpected error occurred',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

// POST endpoint for multiple recipes
export async function POST(request) {
    try {
        console.log('=== MULTIPLE RECIPE REQUEST ===');

        // For now, return a simple response
        const body = await request.json();

        return NextResponse.json({
            success: true,
            shoppingList: {
                items: {},
                recipes: [],
                summary: {
                    totalItems: 0,
                    categories: 0,
                    alreadyHave: 0,
                    needToBuy: 0
                }
            },
            debug: {
                receivedRecipeIds: body.recipeIds
            }
        });

    } catch (error) {
        console.error('❌ POST error:', error);
        return NextResponse.json({
            error: 'POST request failed',
            details: error.message
        }, { status: 500 });
    }
}