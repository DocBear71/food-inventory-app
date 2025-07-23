// file: /src/app/api/meal-plans/[id]/shopping-list/route.js v2 - Fixed for Next.js 15

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { MealPlan, Recipe, UserInventory } from '@/lib/models';

// Helper function to parse ingredient amounts
function parseIngredientAmount(amountStr) {
    if (!amountStr) return { amount: 0, unit: '' };

    // Extract number from string (handles fractions, decimals, etc.)
    const match = amountStr.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)/);
    if (match) {
        let amount = match[1];
        // Handle fractions
        if (amount.includes('/')) {
            const [num, den] = amount.split('/');
            amount = parseFloat(num) / parseFloat(den);
        } else {
            amount = parseFloat(amount);
        }

        // Extract unit (everything after the number)
        const unit = amountStr.replace(match[0], '').trim();
        return { amount, unit };
    }

    return { amount: 0, unit: amountStr };
}

// Helper function to combine similar ingredients
function combineIngredients(ingredients) {
    const combined = {};

    ingredients.forEach(ingredient => {
        const key = ingredient.name.toLowerCase().trim();

        if (combined[key]) {
            // Same ingredient, try to combine amounts
            if (ingredient.unit === combined[key].unit) {
                combined[key].amount += ingredient.amount;
            } else {
                // Different units, add as separate entries
                combined[key].alternativeAmounts = combined[key].alternativeAmounts || [];
                combined[key].alternativeAmounts.push({
                    amount: ingredient.amount,
                    unit: ingredient.unit,
                    recipes: ingredient.recipes
                });
            }

            // Combine recipe lists
            combined[key].recipes = [...new Set([...combined[key].recipes, ...ingredient.recipes])];
        } else {
            combined[key] = { ...ingredient };
        }
    });

    return Object.values(combined);
}

// Helper function to categorize ingredients
function categorizeIngredient(ingredientName) {
    const categories = {
        'Produce': [
            'tomato', 'onion', 'garlic', 'pepper', 'carrot', 'celery', 'lettuce', 'spinach',
            'apple', 'banana', 'lemon', 'lime', 'potato', 'broccoli', 'cucumber', 'mushroom'
        ],
        'Meat': [
            'chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp',
            'bacon', 'ham', 'sausage', 'ground beef', 'ground turkey'
        ],
        'Dairy': [
            'milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream', 'cottage cheese',
            'mozzarella', 'cheddar', 'parmesan', 'eggs'
        ],
        'Pantry': [
            'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'pasta', 'rice',
            'beans', 'breadcrumbs', 'spices', 'herbs', 'vanilla', 'baking powder'
        ],
        'Frozen': [
            'frozen peas', 'frozen corn', 'ice cream', 'frozen berries', 'frozen pizza'
        ],
        'Bakery': [
            'bread', 'rolls', 'bagels', 'tortillas', 'pita'
        ]
    };

    const name = ingredientName.toLowerCase();

    for (const [category, items] of Object.entries(categories)) {
        if (items.some(item => name.includes(item))) {
            return category;
        }
    }

    return 'Other';
}

// Helper function to check inventory for ingredient
function checkInventoryForIngredient(inventory, ingredientName) {
    if (!inventory || !inventory.items) return null;

    const name = ingredientName.toLowerCase();
    return inventory.items.find(item =>
        item.name.toLowerCase().includes(name) ||
        name.includes(item.name.toLowerCase())
    );
}

// POST - Generate shopping list from meal plan
export async function POST(request, { params }) {
    try {
        console.log('=== POST /api/meal-plans/[id]/shopping-list START ===');

        const session = await auth();
        console.log('Auth session:', !!session, session?.user?.id);

        // Fix for Next.js 15 - properly await params and handle errors
        let mealPlanId;
        try {
            const resolvedParams = await params;
            console.log('Resolved params:', resolvedParams);
            mealPlanId = resolvedParams?.id;
        } catch (paramError) {
            console.error('Error resolving params:', paramError);
            return NextResponse.json(
                { error: 'Invalid route parameters', details: paramError.message },
                { status: 400 }
            );
        }

        console.log('Resolved meal plan ID:', mealPlanId);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        if (!mealPlanId) {
            console.log('No meal plan ID provided');
            return NextResponse.json(
                { error: 'Meal plan ID is required' },
                { status: 400 }
            );
        }

        let body;
        try {
            body = await request.json();
        } catch (jsonError) {
            console.log('No JSON body or invalid JSON, using defaults');
            body = {};
        }

        const { options = {} } = body;

        console.log('Generating shopping list for meal plan:', mealPlanId);
        console.log('User ID:', session.user.id);
        console.log('Options:', options);

        await connectDB();

        // Get the meal plan
        const mealPlan = await MealPlan.findOne({
            _id: mealPlanId,
            userId: session.user.id
        });

        console.log('Found meal plan:', !!mealPlan);

        if (!mealPlan) {
            console.log('Meal plan not found for ID:', mealPlanId, 'User:', session.user.id);
            return NextResponse.json(
                { error: 'Meal plan not found' },
                { status: 404 }
            );
        }

        console.log('Meal plan meals:', mealPlan.meals);

        // Get user's current inventory
        const inventory = await UserInventory.findOne({ userId: session.user.id });
        console.log('Found inventory:', !!inventory);

        // Collect all recipe IDs from the meal plan
        const recipeIds = [];
        const mealRecipes = {}; // Track which recipes are used for which meals

        Object.keys(mealPlan.meals).forEach(day => {
            if (Array.isArray(mealPlan.meals[day])) {
                mealPlan.meals[day].forEach(meal => {
                    if (meal.recipeId && !recipeIds.includes(meal.recipeId.toString())) {
                        recipeIds.push(meal.recipeId.toString());
                    }

                    // Track recipe usage
                    if (meal.recipeId) {
                        const recipeKey = meal.recipeId.toString();
                        if (!mealRecipes[recipeKey]) {
                            mealRecipes[recipeKey] = {
                                recipeName: meal.recipeName,
                                meals: []
                            };
                        }
                        mealRecipes[recipeKey].meals.push({
                            day,
                            mealType: meal.mealType,
                            servings: meal.servings
                        });
                    }
                });
            }
        });

        console.log('Found recipes to process:', recipeIds.length);
        console.log('Recipe IDs:', recipeIds);

        if (recipeIds.length === 0) {
            console.log('No recipes found in meal plan');
            return NextResponse.json({
                success: true,
                shoppingList: {
                    items: {},
                    generatedAt: new Date(),
                    mealPlanName: mealPlan.name,
                    weekStart: mealPlan.weekStartDate,
                    summary: {
                        totalItems: 0,
                        inInventory: 0,
                        needToBuy: 0,
                        purchased: 0
                    }
                },
                message: 'No recipes found in meal plan'
            });
        }

        // Get all recipes
        const recipes = await Recipe.find({
            _id: { $in: recipeIds }
        }).lean();

        console.log('Retrieved recipes from database:', recipes.length);

        if (recipes.length === 0) {
            console.log('No recipe documents found in database');
            return NextResponse.json(
                { error: 'No recipes found in database for the planned meals' },
                { status: 404 }
            );
        }

        // Process all ingredients
        const allIngredients = [];

        recipes.forEach(recipe => {
            console.log('Processing recipe:', recipe.title);
            const recipeUsage = mealRecipes[recipe._id.toString()];

            if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                recipe.ingredients.forEach(ingredient => {
                    // Calculate total needed based on all planned servings
                    let totalAmount = 0;
                    let baseAmount = 0;

                    // Parse the ingredient amount
                    const parsed = parseIngredientAmount(ingredient.amount);
                    baseAmount = parsed.amount;

                    // Calculate total needed across all meals using this recipe
                    if (recipeUsage && recipeUsage.meals) {
                        recipeUsage.meals.forEach(meal => {
                            const scalingFactor = meal.servings / (recipe.servings || 1);
                            totalAmount += baseAmount * scalingFactor;
                        });
                    }

                    allIngredients.push({
                        name: ingredient.name,
                        amount: totalAmount,
                        unit: parsed.unit,
                        category: categorizeIngredient(ingredient.name),
                        recipes: recipeUsage ? [recipeUsage.recipeName] : [recipe.title],
                        recipeIds: [recipe._id.toString()],
                        optional: ingredient.optional || false
                    });
                });
            }
        });

        console.log('Processed ingredients:', allIngredients.length);

        // Combine similar ingredients
        const combinedIngredients = combineIngredients(allIngredients);

        console.log('Combined ingredients:', combinedIngredients.length);

        // Check against inventory and create shopping list items
        const shoppingListItems = combinedIngredients.map(ingredient => {
            const inventoryItem = checkInventoryForIngredient(inventory, ingredient.name);
            const inInventory = !!inventoryItem;

            // Format amount for display
            let displayAmount = '';
            if (ingredient.amount > 0) {
                // Round to reasonable precision
                const rounded = Math.round(ingredient.amount * 100) / 100;
                displayAmount = `${rounded}${ingredient.unit ? ' ' + ingredient.unit : ''}`;
            }

            return {
                ingredient: ingredient.name,
                name: ingredient.name, // Add both for compatibility
                quantity: displayAmount,
                amount: displayAmount, // Add both for compatibility
                unit: ingredient.unit,
                category: ingredient.category,
                recipes: ingredient.recipes,
                inInventory,
                inventoryItem: inventoryItem ? {
                    name: inventoryItem.name,
                    quantity: inventoryItem.quantity,
                    unit: inventoryItem.unit,
                    location: inventoryItem.location
                } : null,
                purchased: false,
                optional: ingredient.optional,
                alternativeAmounts: ingredient.alternativeAmounts || [],
                haveAmount: inventoryItem ? inventoryItem.quantity : null
            };
        });

        // Group by category for better organization
        const categorizedItems = {};
        shoppingListItems.forEach(item => {
            if (!categorizedItems[item.category]) {
                categorizedItems[item.category] = [];
            }
            categorizedItems[item.category].push(item);
        });

        // Sort items within each category
        Object.keys(categorizedItems).forEach(category => {
            categorizedItems[category].sort((a, b) => a.ingredient.localeCompare(b.ingredient));
        });

        // Update meal plan with generated shopping list
        mealPlan.shoppingList = {
            generated: true,
            generatedAt: new Date(),
            items: categorizedItems // Store as categorized object
        };

        await mealPlan.save();

        console.log('Shopping list generated successfully with', shoppingListItems.length, 'items');

        // Calculate statistics
        const summary = {
            totalItems: shoppingListItems.length,
            inInventory: shoppingListItems.filter(item => item.inInventory).length,
            needToBuy: shoppingListItems.filter(item => !item.inInventory).length,
            purchased: 0, // Initially no items are purchased
            alreadyHave: shoppingListItems.filter(item => item.inInventory).length // For compatibility
        };

        return NextResponse.json({
            success: true,
            shoppingList: {
                items: categorizedItems, // Return categorized items
                generatedAt: mealPlan.shoppingList.generatedAt,
                mealPlanName: mealPlan.name,
                weekStart: mealPlan.weekStartDate,
                summary,
                stats: summary, // Add both for compatibility
                recipes: recipes.map(r => ({
                    id: r._id.toString(),
                    title: r.title,
                    servings: r.servings
                }))
            },
            message: 'Shopping list generated successfully'
        });

    } catch (error) {
        console.error('=== POST shopping list generation error ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        return NextResponse.json(
            { error: 'Failed to generate shopping list', details: error.message },
            { status: 500 }
        );
    }
}

// PUT - Update shopping list (mark items as purchased, etc.)
export async function PUT(request, { params }) {
    try {
        const session = await auth();

        // Fix for Next.js 15 - properly await params and handle errors
        let mealPlanId;
        try {
            const resolvedParams = await params;
            mealPlanId = resolvedParams?.id;
        } catch (paramError) {
            console.error('Error resolving params in PUT:', paramError);
            return NextResponse.json(
                { error: 'Invalid route parameters', details: paramError.message },
                { status: 400 }
            );
        }

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        let body;
        try {
            body = await request.json();
        } catch (jsonError) {
            return NextResponse.json(
                { error: 'Invalid JSON body' },
                { status: 400 }
            );
        }

        const { updates } = body; // Array of {ingredientName, purchased, etc.}

        await connectDB();

        const mealPlan = await MealPlan.findOne({
            _id: mealPlanId,
            userId: session.user.id
        });

        if (!mealPlan) {
            return NextResponse.json(
                { error: 'Meal plan not found' },
                { status: 404 }
            );
        }

        // Update shopping list items
        if (updates && Array.isArray(updates)) {
            updates.forEach(update => {
                // Handle both flat array and categorized object structures
                if (mealPlan.shoppingList.items) {
                    if (Array.isArray(mealPlan.shoppingList.items)) {
                        // Flat array structure
                        const item = mealPlan.shoppingList.items.find(
                            item => item.ingredient === update.ingredientName
                        );
                        if (item) {
                            Object.keys(update).forEach(key => {
                                if (key !== 'ingredientName') {
                                    item[key] = update[key];
                                }
                            });
                        }
                    } else {
                        // Categorized object structure
                        Object.keys(mealPlan.shoppingList.items).forEach(category => {
                            const item = mealPlan.shoppingList.items[category].find(
                                item => item.ingredient === update.ingredientName
                            );
                            if (item) {
                                Object.keys(update).forEach(key => {
                                    if (key !== 'ingredientName') {
                                        item[key] = update[key];
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }

        await mealPlan.save();

        return NextResponse.json({
            success: true,
            shoppingList: mealPlan.shoppingList,
            message: 'Shopping list updated successfully'
        });

    } catch (error) {
        console.error('PUT shopping list error:', error);
        return NextResponse.json(
            { error: 'Failed to update shopping list', details: error.message },
            { status: 500 }
        );
    }
}