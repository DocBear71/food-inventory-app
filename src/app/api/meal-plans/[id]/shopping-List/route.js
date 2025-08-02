// file: /src/app/api/meal-plans/[id]/shopping-list/route.js v3 - UNIFIED with groceryCategories.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { MealPlan, Recipe, UserInventory } from '@/lib/models';
import { CategoryUtils, suggestCategoryForItem, findBestCategoryMatch } from '@/lib/groceryCategories';

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

// UNIFIED: Use the comprehensive categorization from groceryCategories.js
function categorizeIngredient(ingredientName) {
    if (!ingredientName || typeof ingredientName !== 'string') {
        return 'Other';
    }

    // Use the unified category suggestion system
    const category = findBestCategoryMatch(ingredientName, 'Other');

    console.log(`[CATEGORIZATION] "${ingredientName}" -> "${category}"`);

    return category;
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

                        // UNIFIED: Use the comprehensive categorization system
                        const category = categorizeIngredient(ingredient.name);

                        allIngredients.push({
                            name: ingredient.name.trim(),
                            amount: Math.max(0, totalAmount),
                            unit: ingredient.unit || parsed.unit || '',
                            category: category,
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
            let numericAmount = '';
            if (ingredient.amount > 0) {
                // Round to reasonable precision
                const rounded = Math.round(ingredient.amount * 100) / 100;
                numericAmount = `${rounded}`;
                displayAmount = `${rounded}`;
            }

            return {
                ingredient: ingredient.name,
                name: ingredient.name,

                // Amount/quantity fields
                amount: displayAmount,
                quantity: numericAmount,
                unit: ingredient.unit || '',

                // Categorization - using unified system
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

        // Group by category for better organization using unified categories
        const categorizedItems = {};
        shoppingListItems.forEach(item => {
            // Validate category exists in our unified system
            const validCategory = CategoryUtils.isValidCategory(item.category) ? item.category : 'Other';
            if (!categorizedItems[validCategory]) {
                categorizedItems[validCategory] = [];
            }
            categorizedItems[validCategory].push(item);
        });

        // Sort items within each category
        Object.keys(categorizedItems).forEach(category => {
            categorizedItems[category].sort((a, b) => a.ingredient.localeCompare(b.ingredient));
        });

        // FIXED: Store shopping list data in the format expected by the MealPlan schema
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
        console.log('Categories used:', Object.keys(categorizedItems));

        // Calculate statistics
        const summary = {
            totalItems: shoppingListItems.length,
            inInventory: shoppingListItems.filter(item => item.inInventory).length,
            needToBuy: shoppingListItems.filter(item => !item.inInventory).length,
            purchased: 0, // Initially no items are purchased
            alreadyHave: shoppingListItems.filter(item => item.inInventory).length, // For compatibility
            categories: Object.keys(categorizedItems).length
        };

        return NextResponse.json({
            success: true,
            shoppingList: {
                items: categorizedItems, // Return categorized items using unified system
                generatedAt: mealPlan.shoppingList.generatedAt,
                mealPlanName: mealPlan.name,
                weekStart: mealPlan.weekStartDate,
                summary,
                stats: summary, // Add both for compatibility
                recipes: recipes.map(r => ({
                    id: r._id.toString(),
                    title: r.title,
                    servings: r.servings
                })),
                metadata: {
                    categoriesUsed: Object.keys(categorizedItems),
                    totalCategories: CategoryUtils.getAllCategoryNames().length,
                    categorizationSystem: 'unified-grocery-categories-v2'
                }
            },
            message: 'Shopping list generated successfully using unified categorization'
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