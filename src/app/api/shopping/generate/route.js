// file: /src/app/api/shopping/generate/route.js v33
// Working implementation with real smart package matching

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

// Enhanced ingredient variations matching (same as recipe suggestions)
const ingredientVariations = {
    'pasta': ['penne', 'spaghetti', 'macaroni', 'fettuccine', 'rigatoni', 'fusilli', 'linguine', 'angel hair', 'bow tie', 'rotini'],
    'olive oil': ['extra virgin olive oil', 'virgin olive oil', 'light olive oil', 'pure olive oil', 'evoo'],
    'garlic': ['garlic cloves', 'fresh garlic', 'garlic bulb', 'minced garlic'],
    'onion': ['yellow onion', 'white onion', 'red onion', 'sweet onion'],
    'tomato': ['roma tomato', 'cherry tomato', 'grape tomato', 'beefsteak tomato', 'diced tomato', 'crushed tomato'],
    'cheese': ['cheddar', 'mozzarella', 'parmesan', 'swiss', 'american cheese'],
    'milk': ['whole milk', '2% milk', 'skim milk', 'low fat milk'],
    'butter': ['unsalted butter', 'salted butter', 'sweet butter'],
    'flour': ['all purpose flour', 'bread flour', 'cake flour', 'whole wheat flour'],
    'sugar': ['white sugar', 'granulated sugar', 'brown sugar', 'raw sugar'],
    'salt': ['table salt', 'sea salt', 'kosher salt', 'iodized salt'],
    'pepper': ['black pepper', 'white pepper', 'ground pepper', 'cracked pepper']
};

// Standard package sizes for common items
const standardPackageSizes = {
    'pasta': { amount: 16, unit: 'oz' },
    'penne': { amount: 16, unit: 'oz' },
    'spaghetti': { amount: 16, unit: 'oz' },
    'olive oil': { amount: 32, unit: 'oz' },
    'extra virgin olive oil': { amount: 32, unit: 'oz' },
    'flour': { amount: 80, unit: 'oz' },
    'sugar': { amount: 64, unit: 'oz' },
    'milk': { amount: 32, unit: 'oz' },
    'butter': { amount: 16, unit: 'oz' },
    'rice': { amount: 32, unit: 'oz' }
};

// GET endpoint for single recipe shopping list
export async function GET(request) {
    try {
        console.log('=== V33 REAL SMART MATCHING ===');

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

        console.log('V33: Recipe found:', recipe.title);
        console.log('V33: Inventory count:', inventory.length);

        // Generate real shopping list with smart matching
        const shoppingList = generateSmartShoppingList([recipe], inventory);

        return NextResponse.json({
            success: true,
            shoppingList,
            debug: {
                version: 'v33',
                message: 'Real smart package matching implementation',
                inventoryCount: inventory.length,
                inventoryItems: inventory.map(item => ({ name: item.name, quantity: item.quantity, unit: item.unit }))
            }
        });

    } catch (error) {
        console.error('V33 Error:', error);
        return NextResponse.json({
            error: 'V33 Failed: ' + error.message,
            version: 'v33'
        }, { status: 500 });
    }
}

// POST endpoint for multiple recipes
export async function POST(request) {
    try {
        console.log('=== V33 POST REAL SMART MATCHING ===');

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

        console.log('V33 POST: Found recipes:', recipes.length);
        console.log('V33 POST: Inventory count:', inventory.length);

        // Generate real shopping list with smart matching
        const shoppingList = generateSmartShoppingList(recipes, inventory);

        return NextResponse.json({
            success: true,
            shoppingList,
            debug: {
                version: 'v33',
                message: 'Real smart package matching POST implementation',
                recipeCount: recipes.length,
                inventoryCount: inventory.length,
                inventoryItems: inventory.map(item => ({ name: item.name, quantity: item.quantity, unit: item.unit }))
            }
        });

    } catch (error) {
        console.error('V33 POST Error:', error);
        return NextResponse.json({
            error: 'V33 POST Failed: ' + error.message,
            version: 'v33'
        }, { status: 500 });
    }
}

// Real smart shopping list generation
function generateSmartShoppingList(recipes, inventory) {
    console.log('V33: Generating smart shopping list...');

    const neededIngredients = {};

    // Collect all needed ingredients from recipes
    recipes.forEach(recipe => {
        console.log(`V33: Processing recipe: ${recipe.title}`);

        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            return;
        }

        recipe.ingredients.forEach(ingredient => {
            if (!ingredient || !ingredient.name) return;

            const normalizedName = normalizeIngredientName(ingredient.name);
            const key = normalizedName;

            if (!neededIngredients[key]) {
                neededIngredients[key] = {
                    name: ingredient.name,
                    normalizedName,
                    totalAmount: 0,
                    unit: ingredient.unit || 'item',
                    recipes: [],
                    category: categorizeIngredient(ingredient.name)
                };
            }

            // Handle "to taste" amounts and empty/invalid amounts
            let amount = 1;
            if (ingredient.amount === 'to taste') {
                amount = 1;
            } else if (typeof ingredient.amount === 'string' && ingredient.amount.trim()) {
                const parsed = parseFloat(ingredient.amount);
                amount = isNaN(parsed) ? 1 : parsed;
            } else if (typeof ingredient.amount === 'number') {
                amount = ingredient.amount;
            }

            let unit = 'item';
            if (ingredient.amount === 'to taste') {
                unit = 'tsp';
            } else if (ingredient.unit && typeof ingredient.unit === 'string' && ingredient.unit.trim()) {
                unit = ingredient.unit.trim();
            }

            neededIngredients[key].totalAmount += amount;
            neededIngredients[key].recipes.push(recipe.title);
            neededIngredients[key].unit = unit;

            console.log(`V33: Added ingredient: ${ingredient.name} - ${amount} ${unit}`);
        });
    });

    console.log('V33: Starting inventory matching...');

    // Check what we have vs what we need
    Object.values(neededIngredients).forEach(needed => {
        const inventoryMatch = findInventoryMatch(needed.normalizedName, inventory);

        let haveAmount = 0;
        let needAmount = needed.totalAmount;
        let status = 'need to buy';

        console.log(`V33: Checking ${needed.name} (${needed.totalAmount} ${needed.unit})`);

        if (inventoryMatch) {
            console.log(`V33: Found match: ${inventoryMatch.name} (${inventoryMatch.quantity} ${inventoryMatch.unit})`);

            // Simple smart package matching logic
            const isSmartMatch = checkSmartPackageMatch(needed, inventoryMatch);

            if (isSmartMatch) {
                haveAmount = needed.totalAmount;
                needAmount = 0;
                status = 'have enough';
                console.log(`V33: ✅ Smart package match! Have enough.`);
            } else {
                console.log(`V33: ❌ Not enough or no package match.`);
            }
        } else {
            console.log(`V33: ❌ No inventory match found.`);
        }

        // Check if it's a pantry staple
        const pantryStaples = ['salt', 'pepper'];
        const isPantryStaple = pantryStaples.some(staple =>
            needed.normalizedName.includes(staple)
        );

        needed.haveAmount = haveAmount;
        needed.needAmount = needAmount;
        needed.status = status;
        needed.isPantryStaple = isPantryStaple;

        console.log(`V33: Final: ${needed.name} - Have: ${haveAmount}, Need: ${needAmount}, Status: ${status}`);
    });

    // Filter and categorize shopping list
    const shoppingListItems = Object.values(neededIngredients)
        .filter(item => item.needAmount > 0)
        .map(item => ({
            name: `${item.needAmount} ${item.unit} ${item.name}`,
            category: item.category,
            originalName: item.name,
            needAmount: item.needAmount,
            haveAmount: item.haveAmount,
            unit: item.unit,
            recipes: item.recipes,
            status: item.status,
            isPantryStaple: item.isPantryStaple || false
        }));

    // Group by category
    const categorizedList = {};
    shoppingListItems.forEach(item => {
        if (!categorizedList[item.category]) {
            categorizedList[item.category] = [];
        }
        categorizedList[item.category].push(item);
    });

    // Calculate summary
    const totalItems = Object.values(neededIngredients).length;
    const alreadyHave = Object.values(neededIngredients).filter(item => item.needAmount === 0).length;
    const needToBuy = shoppingListItems.length;

    console.log(`V33: Summary - Total: ${totalItems}, Have: ${alreadyHave}, Need: ${needToBuy}`);

    return {
        items: categorizedList,
        recipes: recipes.map(r => r.title),
        summary: {
            totalItems,
            categories: Object.keys(categorizedList).length,
            alreadyHave,
            needToBuy
        }
    };
}

// Simple smart package matching
function checkSmartPackageMatch(needed, inventoryItem) {
    const itemName = inventoryItem.name.toLowerCase();
    const neededName = needed.normalizedName.toLowerCase();
    const inventoryUnit = (inventoryItem.unit || 'item').toLowerCase();
    const neededUnit = (needed.unit || 'item').toLowerCase();

    console.log(`V33: Package check: ${itemName} (${inventoryItem.quantity} ${inventoryUnit}) vs ${neededName} (${needed.totalAmount} ${neededUnit})`);

    // If inventory is in "items", check package sizes
    if (inventoryUnit === 'item' || inventoryUnit === 'items') {

        // Check variations first
        for (const [baseIngredient, variations] of Object.entries(ingredientVariations)) {
            if (variations.includes(neededName) || neededName.includes(baseIngredient) ||
                variations.includes(itemName) || itemName.includes(baseIngredient)) {

                // Found a variation match, check package size
                const packageSize = standardPackageSizes[baseIngredient];
                if (packageSize) {
                    const totalPackageAmount = inventoryItem.quantity * packageSize.amount;
                    console.log(`V33: Package size check: ${baseIngredient} = ${packageSize.amount} ${packageSize.unit}`);
                    console.log(`V33: Total available: ${totalPackageAmount} ${packageSize.unit}`);

                    // Check if units are compatible and we have enough
                    if (unitsAreCompatible(packageSize.unit, neededUnit)) {
                        const hasEnough = totalPackageAmount >= needed.totalAmount;
                        console.log(`V33: Compatible units, hasEnough = ${hasEnough}`);
                        return hasEnough;
                    }
                }
            }
        }

        // For small amounts, assume one package is enough
        if (needed.totalAmount <= 2) {
            console.log(`V33: Small amount assumption - assuming 1 package covers ${needed.totalAmount} ${neededUnit}`);
            return true;
        }
    }

    return false;
}

// Simple unit compatibility check
function unitsAreCompatible(unit1, unit2) {
    if (!unit1 || !unit2) return false;

    const u1 = unit1.toLowerCase();
    const u2 = unit2.toLowerCase();

    // Direct match
    if (u1 === u2) return true;

    // Common aliases
    const aliases = {
        'oz': ['ounce', 'ounces'],
        'ounce': ['oz', 'ounces'],
        'tbsp': ['tablespoon', 'tablespoons'],
        'tablespoon': ['tbsp', 'tablespoons'],
        'tsp': ['teaspoon', 'teaspoons'],
        'teaspoon': ['tsp', 'teaspoons']
    };

    if (aliases[u1] && aliases[u1].includes(u2)) return true;
    if (aliases[u2] && aliases[u2].includes(u1)) return true;

    return false;
}

// Find matching item in inventory
function findInventoryMatch(ingredientName, inventory) {
    const normalizedIngredient = normalizeIngredientName(ingredientName);

    console.log(`V33: Looking for: "${normalizedIngredient}"`);

    // 1. Exact match
    let match = inventory.find(item =>
        normalizeIngredientName(item.name) === normalizedIngredient
    );

    if (match) {
        console.log(`V33: ✅ Exact match: ${match.name}`);
        return match;
    }

    // 2. Ingredient variations match
    for (const [baseIngredient, variations] of Object.entries(ingredientVariations)) {
        if (normalizedIngredient.includes(baseIngredient) ||
            variations.some(v => normalizedIngredient.includes(v) || v.includes(normalizedIngredient))) {

            match = inventory.find(item => {
                const itemName = normalizeIngredientName(item.name);
                return variations.some(variation =>
                    itemName.includes(variation) || variation.includes(itemName)
                ) || itemName.includes(baseIngredient) || baseIngredient.includes(itemName);
            });

            if (match) {
                console.log(`V33: ✅ Variation match: ${match.name} matches ${normalizedIngredient}`);
                return match;
            }
        }
    }

    console.log(`V33: ❌ No match found for: ${normalizedIngredient}`);
    return null;
}

// Normalize ingredient names for matching
function normalizeIngredientName(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }
    return name.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Categorize ingredients for shopping list organization
function categorizeIngredient(name) {
    if (!name || typeof name !== 'string') {
        return 'Other';
    }

    const lowerName = name.toLowerCase();

    const categories = {
        'Produce': ['garlic', 'onion', 'tomato', 'lettuce', 'carrot', 'celery', 'pepper', 'mushroom'],
        'Grains': ['pasta', 'rice', 'bread', 'flour', 'cereal', 'penne', 'spaghetti'],
        'Pantry': ['oil', 'vinegar', 'salt', 'pepper', 'sugar', 'honey', 'vanilla', 'spice'],
        'Condiments': ['olive oil', 'vegetable oil', 'ketchup', 'mustard'],
        'Dairy': ['milk', 'cheese', 'butter', 'yogurt', 'cream']
    };

    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => lowerName.includes(keyword))) {
            return category;
        }
    }

    return 'Other';
}