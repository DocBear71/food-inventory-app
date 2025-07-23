// file: /src/app/api/meal-plans/[id]/shopping-list/route.js v2 - Fixed for Next.js 15

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { MealPlan, Recipe, UserInventory } from '@/lib/models';

// Helper function to parse ingredient amounts
function parseIngredientAmount(amountStr) {
    // FIXED: Add comprehensive type checking and validation
    if (!amountStr) return { amount: 0, unit: '' };

    // Ensure amountStr is a string
    let amountString;
    if (typeof amountStr === 'string') {
        amountString = amountStr.trim();
    } else if (typeof amountStr === 'number') {
        amountString = String(amountStr);
    } else if (amountStr && typeof amountStr === 'object' && amountStr.toString) {
        amountString = String(amountStr).trim();
    } else {
        console.warn('Invalid amountStr type:', typeof amountStr, amountStr);
        return { amount: 0, unit: String(amountStr || '') };
    }

    if (!amountString) return { amount: 0, unit: '' };

    try {
        // Extract number from string (handles fractions, decimals, etc.)
        const match = amountString.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)/);
        if (match) {
            let amount = match[1];
            // Handle fractions
            if (amount.includes('/')) {
                const [num, den] = amount.split('/');
                const numVal = parseFloat(num);
                const denVal = parseFloat(den);
                if (denVal !== 0 && !isNaN(numVal) && !isNaN(denVal)) {
                    amount = numVal / denVal;
                } else {
                    amount = 0;
                }
            } else {
                amount = parseFloat(amount);
                if (isNaN(amount)) amount = 0;
            }

            // Extract unit (everything after the number)
            const unit = amountString.replace(match[0], '').trim();
            return { amount: Math.max(0, amount), unit };
        }

        // If no number found, treat the whole string as a unit
        return { amount: 0, unit: amountString };
    } catch (error) {
        console.error('Error parsing ingredient amount:', error, 'Input:', amountStr);
        return { amount: 0, unit: String(amountStr || '') };
    }
}

// Helper function to combine similar ingredients
function combineIngredients(ingredients) {
    const combined = {};

    if (!Array.isArray(ingredients)) {
        console.warn('combineIngredients received non-array:', typeof ingredients);
        return [];
    }

    ingredients.forEach((ingredient, index) => {
        // FIXED: Add comprehensive validation
        if (!ingredient || typeof ingredient !== 'object') {
            console.warn(`⚠️ Skipping invalid ingredient at index ${index}:`, ingredient);
            return;
        }

        if (!ingredient.name || typeof ingredient.name !== 'string') {
            console.warn(`⚠️ Skipping ingredient with invalid name at index ${index}:`, ingredient);
            return;
        }

        const key = ingredient.name.toLowerCase().trim();
        if (!key) {
            console.warn(`⚠️ Skipping ingredient with empty name at index ${index}:`, ingredient);
            return;
        }

        try {
            if (combined[key]) {
                // Same ingredient, try to combine amounts
                const existingUnit = combined[key].unit || '';
                const newUnit = ingredient.unit || '';

                if (existingUnit === newUnit) {
                    combined[key].amount += (ingredient.amount || 0);
                } else {
                    // Different units, add as separate entries
                    combined[key].alternativeAmounts = combined[key].alternativeAmounts || [];
                    combined[key].alternativeAmounts.push({
                        amount: ingredient.amount || 0,
                        unit: newUnit,
                        recipes: Array.isArray(ingredient.recipes) ? ingredient.recipes : []
                    });
                }

                // Combine recipe lists safely
                const existingRecipes = Array.isArray(combined[key].recipes) ? combined[key].recipes : [];
                const newRecipes = Array.isArray(ingredient.recipes) ? ingredient.recipes : [];
                combined[key].recipes = [...new Set([...existingRecipes, ...newRecipes])];
            } else {
                combined[key] = {
                    ...ingredient,
                    amount: ingredient.amount || 0,
                    unit: ingredient.unit || '',
                    recipes: Array.isArray(ingredient.recipes) ? ingredient.recipes : []
                };
            }
        } catch (combineError) {
            console.error(`❌ Error combining ingredient "${ingredient.name}":`, combineError);
            // Add as new ingredient to avoid losing it
            const fallbackKey = `${key}-${Date.now()}-${index}`;
            combined[fallbackKey] = {
                name: ingredient.name,
                amount: ingredient.amount || 0,
                unit: ingredient.unit || '',
                category: ingredient.category || 'Other',
                recipes: Array.isArray(ingredient.recipes) ? ingredient.recipes : [],
                optional: !!ingredient.optional
            };
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
                recipe.ingredients.forEach((ingredient, index) => {
                    // FIXED: Add comprehensive ingredient validation
                    if (!ingredient || typeof ingredient !== 'object') {
                        console.warn(`⚠️ Skipping invalid ingredient at index ${index} in recipe ${recipe.title}:`, ingredient);
                        return;
                    }

                    // Validate ingredient name
                    if (!ingredient.name || typeof ingredient.name !== 'string' || !ingredient.name.trim()) {
                        console.warn(`⚠️ Skipping ingredient with invalid name in recipe ${recipe.title}:`, ingredient);
                        return;
                    }

                    // Calculate total needed based on all planned servings
                    let totalAmount = 0;
                    let baseAmount = 0;

                    try {
                        // Parse the ingredient amount with enhanced safety
                        const parsed = parseIngredientAmount(ingredient.amount);
                        baseAmount = parsed.amount;

                        // Calculate total needed across all meals using this recipe
                        if (recipeUsage && recipeUsage.meals && Array.isArray(recipeUsage.meals)) {
                            recipeUsage.meals.forEach(meal => {
                                const scalingFactor = (meal.servings || 1) / (recipe.servings || 1);
                                totalAmount += baseAmount * scalingFactor;
                            });
                        } else {
                            // Fallback: use base amount if no meal usage data
                            totalAmount = baseAmount;
                        }

                        allIngredients.push({
                            name: ingredient.name.trim(),
                            amount: Math.max(0, totalAmount),
                            unit: parsed.unit || '',
                            category: categorizeIngredient(ingredient.name),
                            recipes: recipeUsage && recipeUsage.recipeName ? [recipeUsage.recipeName] : [recipe.title],
                            recipeIds: [recipe._id.toString()],
                            optional: !!ingredient.optional
                        });
                    } catch (ingredientError) {
                        console.error(`❌ Error processing ingredient "${ingredient.name}" in recipe ${recipe.title}:`, ingredientError);
                        // Add ingredient with minimal data to avoid losing it completely
                        allIngredients.push({
                            name: ingredient.name.trim(),
                            amount: 0,
                            unit: '',
                            category: 'Other',
                            recipes: [recipe.title],
                            recipeIds: [recipe._id.toString()],
                            optional: !!ingredient.optional
                        });
                    }
                });
            } else {
                console.warn(`⚠️ Recipe ${recipe.title} has no valid ingredients array:`, recipe.ingredients);
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

            // FIXED: Ensure we include ALL required fields for MealPlan schema validation
            return {
                // Primary identifier - use 'ingredient' as required by schema
                ingredient: ingredient.name,
                name: ingredient.name, // Keep both for compatibility

                // Amount/quantity fields
                amount: displayAmount,
                quantity: displayAmount, // Keep both for compatibility
                unit: ingredient.unit || '',

                // Categorization
                category: ingredient.category,

                // Recipe references
                recipes: Array.isArray(ingredient.recipes) ? ingredient.recipes : [],
                recipeIds: Array.isArray(ingredient.recipeIds) ? ingredient.recipeIds : [],

                // Inventory status
                inInventory,
                inventoryItem: inventoryItem ? {
                    name: inventoryItem.name,
                    quantity: inventoryItem.quantity,
                    unit: inventoryItem.unit,
                    location: inventoryItem.location
                } : null,
                haveAmount: inventoryItem ? inventoryItem.quantity : null,

                // Purchase status
                purchased: false,
                selected: true, // Default to selected
                checked: false,

                // Additional properties
                optional: !!ingredient.optional,
                alternativeAmounts: Array.isArray(ingredient.alternativeAmounts) ? ingredient.alternativeAmounts : [],

                // Ensure we have an ID for tracking
                id: `${ingredient.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`
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

        // FIXED: Store shopping list data in the format expected by the MealPlan schema
        // Some schemas expect a flat array, others expect categorized object
        // Let's try flat array first since that's what the error suggests
        const shoppingListForSave = {
            generated: true,
            generatedAt: new Date(),
            items: shoppingListItems // Use flat array format for schema compatibility
        };

        // Update meal plan with generated shopping list
        try {
            mealPlan.shoppingList = shoppingListForSave;
            await mealPlan.save();
            console.log('✅ Shopping list saved to meal plan successfully');
        } catch (saveError) {
            console.error('❌ Error saving shopping list to meal plan:', saveError);
            // Continue anyway - we can still return the shopping list even if saving fails
            console.log('⚠️ Continuing without saving to meal plan...');
        }

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