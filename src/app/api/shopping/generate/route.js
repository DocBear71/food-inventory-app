// Replace /src/app/api/shopping/generate/route.js with this version
// This will help us understand the recipe ID issue

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, UserInventory } from '@/lib/models';

// GET endpoint for single recipe shopping list
export async function GET(request) {
    try {
        console.log('=== RECIPE DEBUG API ===');

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        console.log('Looking for recipe:', recipeId);
        console.log('User ID:', session.user.id);

        await connectDB();

        // Let's see ALL recipes for this user first
        const allUserRecipes = await Recipe.find({ userId: session.user.id });
        console.log(`Found ${allUserRecipes.length} recipes for user`);

        // Log the first few recipe IDs and titles
        const recipeInfo = allUserRecipes.slice(0, 10).map(recipe => ({
            id: recipe._id.toString(),
            title: recipe.title
        }));
        console.log('User recipes:', recipeInfo);

        // Now try to find the specific recipe
        const targetRecipe = await Recipe.findOne({ _id: recipeId, userId: session.user.id });
        console.log('Target recipe found:', !!targetRecipe);

        // Also try finding the recipe without user filter
        const recipeAnyUser = await Recipe.findOne({ _id: recipeId });
        console.log('Recipe exists for any user:', !!recipeAnyUser);
        if (recipeAnyUser) {
            console.log('Recipe belongs to user:', recipeAnyUser.userId);
        }

        return NextResponse.json({
            success: true,
            debug: {
                requestedRecipeId: recipeId,
                currentUserId: session.user.id,
                userRecipeCount: allUserRecipes.length,
                userRecipes: recipeInfo,
                targetRecipeFound: !!targetRecipe,
                recipeExistsForAnyUser: !!recipeAnyUser,
                recipeActualUserId: recipeAnyUser?.userId?.toString()
            },
            // Return a simple shopping list for now
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
                            recipes: ['Simple Pasta'],
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
                            recipes: ['Simple Pasta'],
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
                            recipes: ['Simple Pasta'],
                            status: 'need to buy',
                            isPantryStaple: true
                        }
                    ]
                },
                recipes: ['Simple Pasta'],
                summary: {
                    totalItems: 5,
                    categories: 2,
                    alreadyHave: 2,
                    needToBuy: 3
                }
            }
        });

    } catch (error) {
        console.error('❌ Debug API error:', error);
        return NextResponse.json({
            error: 'Debug API failed',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

// POST endpoint for multiple recipes
export async function POST(request) {
    try {
        console.log('=== MULTIPLE RECIPE SHOPPING LIST ===');

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipeIds } = await request.json();
        console.log('Received recipe IDs:', recipeIds);
        console.log('User ID:', session.user.id);

        if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
            return NextResponse.json({ error: 'Recipe IDs are required' }, { status: 400 });
        }

        await connectDB();

        // Fetch recipes and inventory
        const [recipes, inventory] = await Promise.all([
            Recipe.find({ _id: { $in: recipeIds }, userId: session.user.id }),
            UserInventory.find({ userId: session.user.id })
        ]);

        console.log(`Found ${recipes.length} recipes and ${inventory.length} inventory items`);

        if (recipes.length === 0) {
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
                    requestedRecipeIds: recipeIds,
                    foundRecipeCount: 0,
                    message: 'No recipes found for user'
                }
            });
        }

        // Simple shopping list generation for now
        const shoppingList = {
            items: {
                'Produce': [
                    {
                        name: '1 clove garlic',
                        category: 'Produce',
                        originalName: 'garlic',
                        needAmount: 1,
                        haveAmount: 0,
                        unit: 'clove',
                        recipes: recipes.map(r => r.title),
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
                        recipes: recipes.map(r => r.title),
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
                        recipes: recipes.map(r => r.title),
                        status: 'need to buy',
                        isPantryStaple: true
                    }
                ]
            },
            recipes: recipes.map(r => r.title),
            summary: {
                totalItems: 5,
                categories: 2,
                alreadyHave: 2,
                needToBuy: 3
            }
        };

        return NextResponse.json({
            success: true,
            shoppingList,
            debug: {
                requestedRecipeIds: recipeIds,
                foundRecipeCount: recipes.length,
                recipeNames: recipes.map(r => r.title)
            }
        });

    } catch (error) {
        console.error('❌ POST error:', error);
        return NextResponse.json({
            error: 'Shopping list generation failed',
            details: error.message
        }, { status: 500 });
    }
}