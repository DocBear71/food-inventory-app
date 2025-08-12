// UPDATED /src/app/api/shopping/generate/route.js
// Remove ALL duplicate ingredient matching logic and import from the centralized system

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, UserInventory, MealPlan } from '@/lib/models';
import { CategoryUtils, findBestCategoryMatch, getAllCategoryNames } from '@/lib/groceryCategories';

// IMPORT the centralized ingredient matching system
import {
    extractIngredientName,
    normalizeIngredientName,
    createIngredientKey,
    getIngredientVariations,
    findBestInventoryMatch
} from '@/utils/ingredientMatching.js';

// Parse amount and unit from ingredient amount string (keep this - it's API-specific)
function parseAmountAndUnit(amountStr) {
    if (!amountStr) {
        return { amount: '', unit: '', numeric: 0, isToTaste: false, originalAmount: amountStr };
    }

    const str = String(amountStr).trim().toLowerCase();

    if (!str) {
        return { amount: '', unit: '', numeric: 0, isToTaste: false, originalAmount: amountStr };
    }

    if (str.includes('to taste')) {
        return { amount: 'to taste', unit: '', numeric: 0, isToTaste: true, originalAmount: amountStr };
    }

    const match = str.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s*(.*)$/);
    if (match) {
        const numericValue = parseFloat(match[1]);
        const unit = match[2].trim();
        return {
            amount: match[1],
            unit: unit,
            numeric: numericValue,
            isToTaste: false,
            originalAmount: amountStr
        };
    }

    const fractionMatch = str.match(/^(\d+\/\d+)\s*(.*)$/);
    if (fractionMatch) {
        const [numerator, denominator] = fractionMatch[1].split('/').map(Number);
        const numericValue = numerator / denominator;
        const unit = fractionMatch[2].trim();
        return {
            amount: fractionMatch[1],
            unit: unit,
            numeric: numericValue,
            isToTaste: false,
            originalAmount: amountStr
        };
    }

    return { amount: str, unit: '', numeric: 0, isToTaste: false, originalAmount: amountStr };
}

// Smart combination of ingredient amounts (keep this - it's API-specific)
function combineIngredientAmounts(existing, newIngredient) {
    const existingAmountStr = existing.amount ? String(existing.amount) : '';
    const newAmountStr = newIngredient.amount ? String(newIngredient.amount) : '';

    const existingParsed = parseAmountAndUnit(existingAmountStr);
    const newParsed = parseAmountAndUnit(newAmountStr);

    console.log(`Combining amounts: "${existingAmountStr}" (${existing.unit}) + "${newAmountStr}" (${newIngredient.unit})`);

    if (existingParsed.isToTaste && newParsed.isToTaste) {
        return {
            amount: 'to taste',
            unit: existing.unit || newIngredient.unit || ''
        };
    }

    if (existingParsed.isToTaste && !newParsed.isToTaste) {
        const newUnit = newIngredient.unit || newParsed.unit || '';
        const newAmountStr = newUnit ? `${newParsed.amount} ${newUnit}` : newParsed.amount;
        return {
            amount: `${newAmountStr}, to taste`,
            unit: ''
        };
    }

    if (!existingParsed.isToTaste && newParsed.isToTaste) {
        const existingUnit = existing.unit || existingParsed.unit || '';
        const existingAmountDisplay = existingUnit ? `${existingParsed.amount} ${existingUnit}` : existingParsed.amount;
        return {
            amount: `${existingAmountDisplay}, to taste`,
            unit: ''
        };
    }

    if (existingParsed.numeric > 0 && newParsed.numeric > 0) {
        const existingUnit = existing.unit || existingParsed.unit || '';
        const newUnit = newIngredient.unit || newParsed.unit || '';

        if (existingUnit === newUnit || (!existingUnit && !newUnit)) {
            const combinedAmount = existingParsed.numeric + newParsed.numeric;
            const unit = existingUnit || newUnit;

            console.log(`Combined numeric: ${existingParsed.numeric} + ${newParsed.numeric} = ${combinedAmount} ${unit}`);

            return {
                amount: combinedAmount.toString(),
                unit: unit
            };
        } else {
            const existingStr = existingUnit ? `${existingParsed.amount} ${existingUnit}` : existingParsed.amount;
            const newStr = newUnit ? `${newParsed.amount} ${newUnit}` : newParsed.amount;

            return {
                amount: `${existingStr}, ${newStr}`,
                unit: ''
            };
        }
    }

    const existingUnit = existing.unit || existingParsed.unit || '';
    const newUnit = newIngredient.unit || newParsed.unit || '';
    const existingStr = existingUnit ? `${existingParsed.amount} ${existingUnit}` : existingParsed.amount;
    const newStr = newUnit ? `${newParsed.amount} ${newUnit}` : newParsed.amount;

    return {
        amount: `${existingStr}, ${newStr}`,
        unit: ''
    };
}

// Use groceryCategories categorization system (keep this - it's API-specific)
function categorizeIngredient(ingredientName) {
    if (!ingredientName || typeof ingredientName !== 'string') {
        return 'Other';
    }

    console.log(`[CATEGORIZATION] Input ingredient: "${ingredientName}"`);

    try {
        // Use the enhanced category suggestion system from groceryCategories
        const category = findBestCategoryMatch(ingredientName, 'Other');
        console.log(`[CATEGORIZATION] "${ingredientName}" -> "${category}"`);
        return category;
    } catch (error) {
        console.error(`[CATEGORIZATION] Error categorizing "${ingredientName}":`, error);
        return 'Other';
    }
}

// Check if inventory covers the needed amount (keep this - it's API-specific)
function checkInventoryCoverage(neededAmount, inventoryItem, packageInfo) {
    if (!inventoryItem) return false;

    const neededAmountStr = neededAmount ? String(neededAmount) : '';
    const neededMatch = neededAmountStr.match(/(\d+(?:\.\d+)?)/);
    const neededNumber = neededMatch ? parseFloat(neededMatch[1]) : 1;
    const inventoryQuantity = inventoryItem.quantity || 1;
    const inventoryUnit = (inventoryItem.unit || 'item').toLowerCase();

    console.log(`[COVERAGE CHECK] Need: "${neededAmountStr}", Have: ${inventoryQuantity} ${inventoryUnit}, Item: "${inventoryItem.name}"`);

    const itemName = normalizeIngredientName(inventoryItem.name);

    // Smart coverage rules
    if (itemName.includes('pasta') ||
        ['spaghetti', 'penne', 'fettuccine', 'fusilli', 'rigatoni', 'linguine', 'macaroni', 'shells'].some(p => itemName.includes(p))) {
        console.log(`[COVERAGE CHECK] ✅ Pasta rule: Have pasta item, covers pasta need`);
        return inventoryQuantity >= 1;
    }

    if (itemName.includes('oil') && neededAmountStr && (neededAmountStr.includes('tbsp') || neededAmountStr.includes('tsp'))) {
        console.log(`[COVERAGE CHECK] ✅ Oil rule: Have oil item, covers small oil need`);
        return inventoryQuantity >= 1;
    }

    if (neededAmountStr === 'to taste' || neededAmountStr.includes('to taste')) {
        const spiceKeywords = ['salt', 'pepper', 'garlic powder', 'onion powder', 'oregano', 'basil', 'thyme'];
        if (spiceKeywords.some(spice => itemName.includes(spice))) {
            console.log(`[COVERAGE CHECK] ✅ Spice rule: Have spice, covers "to taste" need`);
            return inventoryQuantity >= 1;
        }
    }

    if (inventoryUnit !== 'item' && neededAmountStr && neededAmountStr.toLowerCase().includes(inventoryUnit)) {
        console.log(`[COVERAGE CHECK] Unit match: comparing ${neededNumber} needed vs ${inventoryQuantity} have`);
        return inventoryQuantity >= neededNumber;
    }

    if (neededNumber <= 3 && inventoryQuantity >= 1) {
        console.log(`[COVERAGE CHECK] ✅ Small amount rule: Need ${neededNumber}, have ${inventoryQuantity}`);
        return true;
    }

    if (inventoryUnit === 'item' && inventoryQuantity >= 1) {
        console.log(`[COVERAGE CHECK] ✅ Item rule: Have 1+ items of "${inventoryItem.name}"`);
        return true;
    }

    console.log(`[COVERAGE CHECK] ❌ No rule matched - need: ${neededNumber}, have: ${inventoryQuantity} ${inventoryUnit}`);
    return false;
}

// Function to extract recipe IDs from meal plan (keep this - it's API-specific)
async function getRecipeIdsFromMealPlan(mealPlanId) {
    try {
        await connectDB();

        const mealPlan = await MealPlan.findById(mealPlanId);
        if (!mealPlan) {
            throw new Error('Meal plan not found');
        }

        const recipeIds = new Set();

        Object.values(mealPlan.meals).forEach(dayMeals => {
            if (Array.isArray(dayMeals)) {
                dayMeals.forEach(meal => {
                    if (meal.recipeId) {
                        recipeIds.add(meal.recipeId.toString());
                    }
                });
            }
        });

        return Array.from(recipeIds);
    } catch (error) {
        console.error('Error extracting recipe IDs from meal plan:', error);
        throw error;
    }
}

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipeIds: providedRecipeIds, mealPlanId } = await request.json();

        await connectDB();

        let recipeIds = providedRecipeIds;

        if (mealPlanId) {
            console.log('Processing meal plan:', mealPlanId);
            try {
                recipeIds = await getRecipeIdsFromMealPlan(mealPlanId);
                console.log('Extracted recipe IDs from meal plan:', recipeIds);
            } catch (error) {
                console.error('Error processing meal plan:', error);
                return NextResponse.json({
                    error: 'Failed to process meal plan: ' + error.message
                }, { status: 400 });
            }
        }

        if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
            return NextResponse.json({
                error: 'Recipe IDs are required'
            }, { status: 400 });
        }

        const recipes = await Recipe.find({
            _id: { $in: recipeIds }
        });

        if (recipes.length === 0) {
            return NextResponse.json({
                error: 'No valid recipes found'
            }, { status: 404 });
        }

        console.log(`[SHOPPING API] Found ${recipes.length} recipes for shopping list generation`);

        const userInventory = await UserInventory.findOne({
            userId: session.user.id
        });
        const inventory = userInventory ? userInventory.items : [];

        console.log(`[SHOPPING API] Found ${inventory.length} items in user inventory`);

        // Enhanced ingredient aggregation using centralized system
        const ingredientMap = new Map();

        recipes.forEach((recipe, recipeIndex) => {
            console.log(`[SHOPPING API] Processing recipe ${recipeIndex + 1}/${recipes.length}: ${recipe.title}`);

            let allRecipeIngredients = [];

            // Handle single-part recipes
            if (recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
                console.log(`[SHOPPING API] Found ${recipe.ingredients.length} single-part ingredients in ${recipe.title}`);
                allRecipeIngredients = [...recipe.ingredients];
            }

            // Handle multi-part recipes
            if (recipe.isMultiPart && recipe.parts && Array.isArray(recipe.parts)) {
                console.log(`[SHOPPING API] Found multi-part recipe with ${recipe.parts.length} parts in ${recipe.title}`);
                recipe.parts.forEach(part => {
                    if (part.ingredients && Array.isArray(part.ingredients)) {
                        console.log(`[SHOPPING API] Part "${part.name}" has ${part.ingredients.length} ingredients`);
                        allRecipeIngredients.push(...part.ingredients);
                    }
                });
            }

            console.log(`[SHOPPING API] Total ingredients for ${recipe.title}: ${allRecipeIngredients.length}`);

            if (allRecipeIngredients.length === 0) {
                console.log(`[SHOPPING API] ⚠️ Recipe ${recipe.title} has no ingredients - skipping`);
                return;
            }

            // Process each ingredient using CENTRALIZED SYSTEM
            allRecipeIngredients.forEach((ingredient, ingredientIndex) => {
                try {
                    if (!ingredient) {
                        console.log(`[SHOPPING API] ⚠️ Null ingredient at index ${ingredientIndex} in recipe ${recipe.title}`);
                        return;
                    }

                    // Handle different ingredient formats
                    let ingredientName;
                    let ingredientAmount = '';
                    let ingredientUnit = '';

                    if (typeof ingredient === 'string') {
                        ingredientName = ingredient;
                    } else if (typeof ingredient === 'object') {
                        ingredientName = ingredient.name || ingredient.ingredient;
                        ingredientAmount = ingredient.amount || '';
                        ingredientUnit = ingredient.unit || '';
                    } else {
                        console.log(`[SHOPPING API] ⚠️ Invalid ingredient type at index ${ingredientIndex}:`, typeof ingredient);
                        return;
                    }

                    if (!ingredientName || typeof ingredientName !== 'string' || ingredientName.trim() === '') {
                        console.log(`[SHOPPING API] ⚠️ Invalid ingredient name at index ${ingredientIndex}:`, ingredient);
                        return;
                    }

                    // ENHANCED: Use centralized extraction system
                    const cleanedIngredientName = extractIngredientName(ingredientName);
                    const finalIngredientName = cleanedIngredientName || ingredientName.trim();

                    console.log(`[SHOPPING API] ✅ Processing: "${ingredientName}" -> cleaned: "${cleanedIngredientName}" -> final: "${finalIngredientName}"`);

                    // ENHANCED: Use centralized key creation
                    const ingredientKey = createIngredientKey(finalIngredientName);

                    // Ensure amounts are strings
                    let safeAmount = '';
                    if (ingredientAmount !== null && ingredientAmount !== undefined) {
                        safeAmount = String(ingredientAmount).trim();
                    }

                    let safeUnit = '';
                    if (ingredientUnit && typeof ingredientUnit === 'string') {
                        safeUnit = ingredientUnit.trim();
                    }

                    // Process ingredient (combine or add new)
                    if (ingredientMap.has(ingredientKey)) {
                        // Combine with existing ingredient
                        const existing = ingredientMap.get(ingredientKey);
                        existing.recipes.push(recipe.title);

                        const combinedAmounts = combineIngredientAmounts({
                            amount: existing.amount,
                            unit: existing.unit
                        }, {
                            amount: safeAmount,
                            unit: safeUnit
                        });

                        existing.amount = combinedAmounts.amount;
                        existing.unit = combinedAmounts.unit;

                        // Use the longer/more descriptive name
                        if (finalIngredientName.length > existing.name.length) {
                            existing.name = finalIngredientName;
                            existing.originalName = finalIngredientName;
                        }

                        console.log(`[SHOPPING API] ✅ Combined ingredient: ${existing.name} - ${existing.amount} ${existing.unit}`);
                    } else {
                        // Add new ingredient using centralized categorization
                        const category = categorizeIngredient(finalIngredientName);

                        const newIngredient = {
                            name: finalIngredientName,
                            originalName: finalIngredientName,
                            normalizedName: normalizeIngredientName(finalIngredientName),
                            amount: safeAmount,
                            unit: safeUnit,
                            category: category,
                            recipes: [recipe.title],
                            optional: ingredient.optional || false,
                            alternatives: ingredient.alternatives || [],
                            // ENHANCED: Use centralized variations system
                            variations: getIngredientVariations(finalIngredientName),
                            ingredientKey: ingredientKey
                        };

                        ingredientMap.set(ingredientKey, newIngredient);

                        console.log(`[SHOPPING API] ✅ New ingredient added: ${finalIngredientName} - ${safeAmount} ${safeUnit} -> ${category}`);
                    }

                } catch (ingredientError) {
                    console.error(`[SHOPPING API] ❌ Error processing ingredient ${ingredientIndex} in recipe ${recipe.title}:`, ingredientError);
                }
            });

            console.log(`[SHOPPING API] ✅ Completed processing ${recipe.title} - Total ingredients in map: ${ingredientMap.size}`);
        });

        if (ingredientMap.size === 0) {
            console.error(`[SHOPPING API] ❌ CRITICAL: No ingredients were processed from ${recipes.length} recipes!`);
            return NextResponse.json({
                error: 'No ingredients could be processed from the provided recipes'
            }, { status: 400 });
        }

        console.log(`[SHOPPING API] Aggregated ${ingredientMap.size} unique ingredients after combination`);

        // Enhanced inventory checking using centralized system
        const shoppingListItems = [];
        const itemsByCategory = {};

        for (const [key, ingredient] of ingredientMap) {
            if (ingredient.optional) {
                console.log(`[SHOPPING API] Skipping optional ingredient: ${ingredient.name}`);
                continue;
            }

            // ENHANCED: Use centralized inventory matching
            const inventoryMatch = findBestInventoryMatch(ingredient.name, inventory);
            const category = ingredient.category;

            const hasEnoughInInventory = inventoryMatch &&
                checkInventoryCoverage(ingredient.amount, inventoryMatch);

            let displayAmount = ingredient.amount || '';
            let displayUnit = ingredient.unit || '';

            if (displayUnit && displayAmount && !displayAmount.includes(displayUnit)) {
                if (displayAmount !== 'to taste') {
                    displayAmount = `${displayAmount} ${displayUnit}`.trim();
                    displayUnit = '';
                }
            }

            const item = {
                name: ingredient.name,
                ingredient: ingredient.name,
                originalName: ingredient.originalName,
                amount: displayAmount,
                unit: displayUnit,
                category: category,
                recipes: ingredient.recipes,
                inInventory: hasEnoughInInventory,
                inventoryItem: inventoryMatch ? {
                    id: inventoryMatch._id,
                    name: inventoryMatch.name,
                    quantity: inventoryMatch.quantity,
                    unit: inventoryMatch.unit,
                    location: inventoryMatch.location,
                    expirationDate: inventoryMatch.expirationDate,
                    brand: inventoryMatch.brand,
                    // Include all price information from inventory
                    averagePrice: inventoryMatch.averagePrice || 0,
                    lowestPrice: inventoryMatch.lowestPrice || 0,
                    highestPrice: inventoryMatch.highestPrice || 0,
                    lastPurchasePrice: inventoryMatch.lastPurchasePrice || 0,
                    priceHistory: inventoryMatch.priceHistory || []
                } : null,
                // Extract and use inventory price as estimated price
                estimatedPrice: inventoryMatch?.averagePrice || inventoryMatch?.lowestPrice || 0,
                priceSource: inventoryMatch?.averagePrice > 0 ? 'inventory_average' :
                    inventoryMatch?.lowestPrice > 0 ? 'inventory_lowest' : 'none',
                needAmount: displayAmount || '1',
                haveAmount: inventoryMatch ? `${inventoryMatch.quantity} ${inventoryMatch.unit}` : '0',
                alternatives: ingredient.alternatives,
                variations: ingredient.variations,
                normalizedName: ingredient.normalizedName,
                ingredientKey: ingredient.ingredientKey,
                // Price optimization fields
                priceOptimized: (inventoryMatch?.averagePrice || 0) > 0,
                dealStatus: 'normal',
                actualPrice: null
            };

            shoppingListItems.push(item);

            // Group by category
            if (!itemsByCategory[category]) {
                itemsByCategory[category] = [];
            }
            itemsByCategory[category].push(item);
        }

        console.log(`[SHOPPING API] Generated shopping list with ${shoppingListItems.length} items across ${Object.keys(itemsByCategory).length} categories`);

        // Calculate summary statistics
        const summary = {
            totalItems: shoppingListItems.length,
            needToBuy: shoppingListItems.filter(item => !item.inInventory).length,
            alreadyHave: shoppingListItems.filter(item => item.inInventory).length,
            inInventory: shoppingListItems.filter(item => item.inInventory).length,
            categories: Object.keys(itemsByCategory).length,
            recipeCount: recipes.length,
            optionalItemsSkipped: Array.from(ingredientMap.values()).filter(i => i.optional).length,
            ingredientsCombined: recipes.reduce((total, recipe) =>
                total + (recipe.ingredients ? recipe.ingredients.length : 0), 0) - ingredientMap.size
        };

        // Enhanced shopping list response
        const response = {
            success: true,
            shoppingList: {
                items: itemsByCategory,
                recipes: recipes.map(r => r.title),
                summary,
                generatedAt: new Date().toISOString(),
                source: mealPlanId ? 'meal_plan' : 'recipes',
                sourceId: mealPlanId || null,
                sourceRecipeIds: recipeIds,
                metadata: {
                    totalRecipes: recipes.length,
                    totalIngredients: ingredientMap.size,
                    inventoryItems: inventory.length,
                    categoriesUsed: Object.keys(itemsByCategory),
                    totalAvailableCategories: getAllCategoryNames().length,
                    variationsMatched: shoppingListItems.filter(item => item.variations.length > 1).length,
                    ingredientsCombined: summary.ingredientsCombined,
                    categorizationSystem: 'unified-grocery-categories-v2',
                    ingredientMatchingSystem: 'centralized-v1', // NEW: Track that we're using centralized system
                    matchingStats: {
                        exactMatches: shoppingListItems.filter(item => item.inventoryItem).length,
                        noMatches: shoppingListItems.filter(item => !item.inventoryItem).length
                    }
                }
            }
        };

        console.log('[SHOPPING API] Enhanced shopping list generated successfully with centralized matching:', {
            totalItems: summary.totalItems,
            categories: summary.categories,
            source: response.shoppingList.source,
            matchingSystem: response.shoppingList.metadata.ingredientMatchingSystem,
            exactMatches: response.shoppingList.metadata.matchingStats.exactMatches
        });

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error generating shopping list with centralized system:', error);
        return NextResponse.json({
            error: 'Failed to generate shopping list',
            details: error.message
        }, { status: 500 });
    }
}