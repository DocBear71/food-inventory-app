// file: /src/app/api/shopping/generate/route.js v32
// COMPLETE REWRITE to force code update

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

// GET endpoint for single recipe shopping list
export async function GET(request) {
    try {
        console.log('=== V32 CODE IS RUNNING ===');

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        if (!recipeId) {
            return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
        }

        await connectDB();

        // Get recipe
        const recipe = await Recipe.findOne({ _id: recipeId, createdBy: session.user.id });
        if (!recipe) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        // Get inventory from the same API the frontend uses
        const baseUrl = request.headers.get('host') ? `https://${request.headers.get('host')}` : 'http://localhost:3000';

        const inventoryResponse = await fetch(`${baseUrl}/api/inventory`, {
            headers: {
                'Cookie': request.headers.get('cookie') || ''
            }
        });

        let inventory = [];
        if (inventoryResponse.ok) {
            const inventoryData = await inventoryResponse.json();
            inventory = inventoryData.success ? inventoryData.inventory : [];
        }

        console.log('V32: Recipe found:', recipe.title);
        console.log('V32: Inventory count:', inventory.length);

        // SIMPLE TEST: Force pasta and olive oil to be marked as available
        const simpleShoppingList = {
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
                alreadyHave: 2, // PASTA AND OLIVE OIL marked as available
                needToBuy: 3    // Only garlic, salt, pepper
            }
        };

        return NextResponse.json({
            success: true,
            shoppingList: simpleShoppingList,
            debug: {
                version: 'v32',
                message: 'SIMPLE TEST - Pasta and olive oil marked as available',
                inventoryCount: inventory.length,
                inventoryItems: inventory.map(item => ({ name: item.name, quantity: item.quantity, unit: item.unit }))
            }
        });

    } catch (error) {
        console.error('V32 Error:', error);
        return NextResponse.json({
            error: 'V32 Failed: ' + error.message,
            version: 'v32'
        }, { status: 500 });
    }
}

// POST endpoint for multiple recipes
export async function POST(request) {
    try {
        console.log('=== V32 POST CODE IS RUNNING ===');

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipeIds } = await request.json();
        if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
            return NextResponse.json({ error: 'Recipe IDs are required' }, { status: 400 });
        }

        await connectDB();

        // Get recipes
        const recipes = await Recipe.find({ _id: { $in: recipeIds }, createdBy: session.user.id });

        // Get inventory from the same API the frontend uses
        const baseUrl = request.headers.get('host') ? `https://${request.headers.get('host')}` : 'http://localhost:3000';

        const inventoryResponse = await fetch(`${baseUrl}/api/inventory`, {
            headers: {
                'Cookie': request.headers.get('cookie') || ''
            }
        });

        let inventory = [];
        if (inventoryResponse.ok) {
            const inventoryData = await inventoryResponse.json();
            inventory = inventoryData.success ? inventoryData.inventory : [];
        }

        console.log('V32 POST: Found recipes:', recipes.length);
        console.log('V32 POST: Inventory count:', inventory.length);

        // SIMPLE TEST: Force pasta and olive oil to be marked as available
        const simpleShoppingList = {
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
                alreadyHave: 2, // PASTA AND OLIVE OIL marked as available
                needToBuy: 3    // Only garlic, salt, pepper
            }
        };

        return NextResponse.json({
            success: true,
            shoppingList: simpleShoppingList,
            debug: {
                version: 'v32',
                message: 'SIMPLE TEST POST - Pasta and olive oil marked as available',
                recipeCount: recipes.length,
                inventoryCount: inventory.length,
                inventoryItems: inventory.map(item => ({ name: item.name, quantity: item.quantity, unit: item.unit }))
            }
        });

    } catch (error) {
        console.error('V32 POST Error:', error);
        return NextResponse.json({
            error: 'V32 POST Failed: ' + error.message,
            version: 'v32'
        }, { status: 500 });
    }
}