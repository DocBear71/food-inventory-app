// file: /src/app/api/shopping/generate/route.js v35

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, UserInventory, MealPlan } from '@/lib/models';

// Enhanced ingredient matching and categorization system
const INGREDIENT_CATEGORIES = {
    // Fresh produce
    'produce': [
        'tomato', 'onion', 'garlic', 'ginger', 'potato', 'carrot', 'celery', 'bell pepper', 'pepper',
        'cucumber', 'lettuce', 'spinach', 'kale', 'broccoli', 'cauliflower', 'cabbage', 'zucchini',
        'eggplant', 'mushroom', 'avocado', 'lemon', 'lime', 'orange', 'apple', 'banana', 'berry',
        'strawberry', 'blueberry', 'raspberry', 'grape', 'pineapple', 'mango', 'cilantro', 'parsley',
        'basil', 'mint', 'rosemary', 'thyme', 'oregano', 'sage', 'dill', 'chive', 'scallion',
        'green onion', 'shallot', 'leek', 'jalapeño', 'serrano', 'habanero', 'poblano', 'anaheim'
    ],

    // Pantry staples
    'pantry': [
        'flour', 'sugar', 'brown sugar', 'salt', 'pepper', 'baking powder', 'baking soda', 'vanilla',
        'olive oil', 'vegetable oil', 'coconut oil', 'vinegar', 'soy sauce', 'worcestershire',
        'hot sauce', 'ketchup', 'mustard', 'mayonnaise', 'honey', 'maple syrup', 'rice', 'pasta',
        'quinoa', 'oats', 'bread', 'tortilla', 'beans', 'lentils', 'chickpeas', 'broth', 'stock',
        'tomato sauce', 'tomato paste', 'coconut milk', 'peanut butter', 'almond butter', 'nuts',
        'almonds', 'walnuts', 'pecans', 'cashews', 'peanuts', 'pine nuts', 'sesame seeds', 'chia seeds'
    ],

    // Dairy products
    'dairy': [
        'milk', 'butter', 'cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta', 'goat cheese',
        'cream cheese', 'sour cream', 'yogurt', 'greek yogurt', 'heavy cream', 'half and half',
        'buttermilk', 'cottage cheese', 'ricotta', 'swiss cheese', 'provolone', 'brie', 'camembert'
    ],

    // Meat and seafood
    'meat': [
        'chicken', 'beef', 'pork', 'turkey', 'lamb', 'duck', 'bacon', 'ham', 'sausage', 'ground beef',
        'ground turkey', 'ground chicken', 'ground pork', 'steak', 'roast', 'chop', 'tenderloin',
        'brisket', 'ribs', 'wings', 'thigh', 'breast', 'leg', 'salmon', 'tuna', 'cod', 'halibut',
        'shrimp', 'crab', 'lobster', 'scallops', 'mussels', 'clams', 'oysters', 'fish', 'seafood'
    ],

    // Frozen foods
    'frozen': [
        'frozen vegetables', 'frozen fruit', 'frozen berries', 'ice cream', 'frozen pizza',
        'frozen dinner', 'frozen chicken', 'frozen fish', 'frozen shrimp', 'frozen peas',
        'frozen corn', 'frozen broccoli', 'frozen spinach', 'frozen strawberries', 'frozen mango'
    ],

    // Beverages
    'beverages': [
        'water', 'sparkling water', 'juice', 'coffee', 'tea', 'wine', 'beer', 'soda', 'kombucha',
        'almond milk', 'oat milk', 'soy milk', 'coconut milk', 'energy drink', 'sports drink'
    ],

    // Bakery
    'bakery': [
        'bread', 'bagel', 'muffin', 'croissant', 'baguette', 'sourdough', 'whole wheat bread',
        'pita bread', 'naan', 'tortilla', 'wrap', 'roll', 'bun', 'cake', 'pie', 'cookie', 'donut'
    ],

    // Deli
    'deli': [
        'turkey', 'ham', 'salami', 'pepperoni', 'prosciutto', 'roast beef', 'pastrami', 'bologna',
        'deli meat', 'lunch meat', 'sliced cheese', 'hummus', 'olives', 'pickles'
    ]
};

// Ingredient variations and aliases
const INGREDIENT_VARIATIONS = {
    'tomato': ['tomatoes', 'cherry tomatoes', 'grape tomatoes', 'roma tomatoes', 'beefsteak tomatoes'],
    'onion': ['onions', 'yellow onion', 'white onion', 'red onion', 'sweet onion', 'vidalia onion'],
    'garlic': ['garlic cloves', 'garlic bulb', 'minced garlic', 'garlic powder'],
    'bell pepper': ['bell peppers', 'red bell pepper', 'green bell pepper', 'yellow bell pepper', 'orange bell pepper'],
    'mushroom': ['mushrooms', 'button mushrooms', 'cremini mushrooms', 'portobello mushrooms', 'shiitake mushrooms'],
    'chicken': ['chicken breast', 'chicken thighs', 'chicken legs', 'chicken wings', 'whole chicken'],
    'ground beef': ['ground chuck', 'ground sirloin', 'lean ground beef', 'extra lean ground beef'],
    'cheese': ['shredded cheese', 'sliced cheese', 'block cheese', 'grated cheese'],
    'pasta': ['spaghetti', 'penne', 'fusilli', 'rigatoni', 'linguine', 'fettuccine', 'angel hair'],
    'rice': ['white rice', 'brown rice', 'jasmine rice', 'basmati rice', 'wild rice', 'arborio rice'],
    'oil': ['olive oil', 'vegetable oil', 'canola oil', 'sunflower oil', 'avocado oil', 'coconut oil'],
    'vinegar': ['white vinegar', 'apple cider vinegar', 'balsamic vinegar', 'red wine vinegar', 'rice vinegar'],
    'flour': ['all-purpose flour', 'whole wheat flour', 'bread flour', 'cake flour', 'self-rising flour'],
    'sugar': ['white sugar', 'granulated sugar', 'cane sugar', 'brown sugar', 'powdered sugar', 'confectioners sugar'],
    'milk': ['whole milk', '2% milk', '1% milk', 'skim milk', 'fat-free milk', 'almond milk', 'oat milk', 'soy milk']
};

// Standard package sizes for inventory matching
const STANDARD_PACKAGE_SIZES = {
    // Liquids (in oz)
    'olive oil': { size: 16.9, unit: 'fl oz', type: 'liquid' },
    'vegetable oil': { size: 48, unit: 'fl oz', type: 'liquid' },
    'milk': { size: 64, unit: 'fl oz', type: 'liquid' },
    'heavy cream': { size: 16, unit: 'fl oz', type: 'liquid' },
    'chicken broth': { size: 32, unit: 'fl oz', type: 'liquid' },
    'vegetable broth': { size: 32, unit: 'fl oz', type: 'liquid' },
    'beef broth': { size: 32, unit: 'fl oz', type: 'liquid' },
    'soy sauce': { size: 10, unit: 'fl oz', type: 'liquid' },
    'vinegar': { size: 16, unit: 'fl oz', type: 'liquid' },
    'vanilla extract': { size: 2, unit: 'fl oz', type: 'liquid' },

    // Dry goods (in oz or lbs)
    'flour': { size: 5, unit: 'lb', type: 'dry' },
    'sugar': { size: 4, unit: 'lb', type: 'dry' },
    'brown sugar': { size: 2, unit: 'lb', type: 'dry' },
    'rice': { size: 2, unit: 'lb', type: 'dry' },
    'pasta': { size: 1, unit: 'lb', type: 'dry' },
    'quinoa': { size: 16, unit: 'oz', type: 'dry' },
    'oats': { size: 18, unit: 'oz', type: 'dry' },
    'beans': { size: 15, unit: 'oz', type: 'canned' },
    'chickpeas': { size: 15, unit: 'oz', type: 'canned' },
    'lentils': { size: 16, unit: 'oz', type: 'dry' },

    // Dairy (various units)
    'butter': { size: 1, unit: 'lb', type: 'dairy' },
    'cheese': { size: 8, unit: 'oz', type: 'dairy' },
    'cream cheese': { size: 8, unit: 'oz', type: 'dairy' },
    'sour cream': { size: 16, unit: 'oz', type: 'dairy' },
    'yogurt': { size: 32, unit: 'oz', type: 'dairy' },

    // Canned goods (in oz)
    'tomato sauce': { size: 15, unit: 'oz', type: 'canned' },
    'tomato paste': { size: 6, unit: 'oz', type: 'canned' },
    'coconut milk': { size: 13.5, unit: 'fl oz', type: 'canned' },
    'diced tomatoes': { size: 14.5, unit: 'oz', type: 'canned' },
    'crushed tomatoes': { size: 28, unit: 'oz', type: 'canned' },

    // Condiments and sauces (in oz)
    'ketchup': { size: 20, unit: 'oz', type: 'condiment' },
    'mustard': { size: 8, unit: 'oz', type: 'condiment' },
    'mayonnaise': { size: 30, unit: 'oz', type: 'condiment' },
    'hot sauce': { size: 5, unit: 'fl oz', type: 'condiment' },
    'worcestershire sauce': { size: 10, unit: 'fl oz', type: 'condiment' },

    // Spices (in oz)
    'salt': { size: 26, unit: 'oz', type: 'spice' },
    'black pepper': { size: 3, unit: 'oz', type: 'spice' },
    'garlic powder': { size: 3.12, unit: 'oz', type: 'spice' },
    'onion powder': { size: 2.33, unit: 'oz', type: 'spice' },
    'paprika': { size: 2.37, unit: 'oz', type: 'spice' },
    'cumin': { size: 1.5, unit: 'oz', type: 'spice' },
    'oregano': { size: 1, unit: 'oz', type: 'spice' },
    'basil': { size: 1, unit: 'oz', type: 'spice' },
    'thyme': { size: 1, unit: 'oz', type: 'spice' },
    'rosemary': { size: 1, unit: 'oz', type: 'spice' },

    // Nuts and seeds (in oz or lbs)
    'almonds': { size: 16, unit: 'oz', type: 'nuts' },
    'walnuts': { size: 16, unit: 'oz', type: 'nuts' },
    'peanuts': { size: 16, unit: 'oz', type: 'nuts' },
    'cashews': { size: 10, unit: 'oz', type: 'nuts' },
    'pine nuts': { size: 2, unit: 'oz', type: 'nuts' }
};

// Function to extract recipe IDs from meal plan
async function getRecipeIdsFromMealPlan(mealPlanId) {
    try {
        const mealPlan = await MealPlan.findById(mealPlanId);
        if (!mealPlan) {
            throw new Error('Meal plan not found');
        }

        const recipeIds = new Set();

        // Extract recipe IDs from all days
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

// Enhanced ingredient normalization
function normalizeIngredient(ingredient) {
    if (!ingredient || typeof ingredient !== 'string') {
        return '';
    }

    return ingredient
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, ' ')  // Replace non-word characters with spaces
        .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
        .trim();
}

// Get all variations of an ingredient
function getIngredientVariations(ingredient) {
    const normalized = normalizeIngredient(ingredient);
    const variations = new Set([normalized]);

    // Add known variations
    for (const [base, vars] of Object.entries(INGREDIENT_VARIATIONS)) {
        if (normalized.includes(base) || vars.some(v => normalized.includes(v))) {
            variations.add(base);
            vars.forEach(v => variations.add(normalizeIngredient(v)));
        }
    }

    return Array.from(variations);
}

// Categorize ingredient based on name
function categorizeIngredient(ingredient) {
    const normalized = normalizeIngredient(ingredient);

    for (const [category, items] of Object.entries(INGREDIENT_CATEGORIES)) {
        for (const item of items) {
            if (normalized.includes(item) || item.includes(normalized)) {
                return category;
            }
        }
    }

    // Check variations
    const variations = getIngredientVariations(ingredient);
    for (const variation of variations) {
        for (const [category, items] of Object.entries(INGREDIENT_CATEGORIES)) {
            for (const item of items) {
                if (variation.includes(item) || item.includes(variation)) {
                    return category;
                }
            }
        }
    }

    return 'other';
}

// Enhanced inventory matching with variations and fuzzy matching
function findBestInventoryMatch(ingredient, inventory) {
    if (!inventory || inventory.length === 0) return null;

    const ingredientVariations = getIngredientVariations(ingredient);

    // Direct exact matches first
    for (const variation of ingredientVariations) {
        for (const item of inventory) {
            const itemName = normalizeIngredient(item.name);
            if (itemName === variation) {
                return item;
            }
        }
    }

    // Partial matches - ingredient contains item name or vice versa
    for (const variation of ingredientVariations) {
        for (const item of inventory) {
            const itemName = normalizeIngredient(item.name);
            if (variation.includes(itemName) || itemName.includes(variation)) {
                return item;
            }
        }
    }

    // Fuzzy matching - check if key words match
    const ingredientWords = ingredientVariations.flatMap(v => v.split(' '));
    for (const item of inventory) {
        const itemWords = normalizeIngredient(item.name).split(' ');
        const commonWords = ingredientWords.filter(word =>
                word.length > 3 && itemWords.some(itemWord =>
                    itemWord.includes(word) || word.includes(itemWord)
                )
        );

        if (commonWords.length > 0) {
            return item;
        }
    }

    return null;
}

// Get standard package information for an ingredient
function getStandardPackageInfo(ingredient) {
    const normalized = normalizeIngredient(ingredient);

    // Direct match
    if (STANDARD_PACKAGE_SIZES[normalized]) {
        return STANDARD_PACKAGE_SIZES[normalized];
    }

    // Check variations
    const variations = getIngredientVariations(ingredient);
    for (const variation of variations) {
        if (STANDARD_PACKAGE_SIZES[variation]) {
            return STANDARD_PACKAGE_SIZES[variation];
        }
    }

    // Check partial matches
    for (const [packageItem, info] of Object.entries(STANDARD_PACKAGE_SIZES)) {
        if (normalized.includes(packageItem) || packageItem.includes(normalized)) {
            return info;
        }
    }

    return null;
}

// Check if inventory covers the needed amount
function checkInventoryCoverage(neededAmount, inventoryItem, packageInfo) {
    if (!inventoryItem) return false;

    // If we have package info, do smart comparison
    if (packageInfo) {
        const inventoryQuantity = inventoryItem.quantity || 1;
        const inventoryUnit = inventoryItem.unit || 'item';

        // Convert to comparable units if possible
        if (packageInfo.unit === inventoryUnit) {
            const packageSize = packageInfo.size;
            const totalInventory = inventoryQuantity * packageSize;

            // Try to parse needed amount
            const neededMatch = neededAmount?.match(/(\d+(?:\.\d+)?)/);
            const neededNumber = neededMatch ? parseFloat(neededMatch[1]) : 1;

            return totalInventory >= neededNumber;
        }
    }

    // Fallback to simple check - if we have any inventory, assume it covers small amounts
    const neededMatch = neededAmount?.match(/(\d+(?:\.\d+)?)/);
    const neededNumber = neededMatch ? parseFloat(neededMatch[1]) : 1;
    const inventoryQuantity = inventoryItem.quantity || 1;

    // Simple heuristic: if we need 1-2 of something and have at least 1, probably OK
    if (neededNumber <= 2 && inventoryQuantity >= 1) {
        return true;
    }

    return inventoryQuantity >= neededNumber;
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipeIds: providedRecipeIds, mealPlanId } = await request.json();

        let recipeIds = providedRecipeIds;

        // If mealPlanId is provided, extract recipe IDs from the meal plan
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

        // Validation
        if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
            return NextResponse.json({
                error: 'Recipe IDs are required'
            }, { status: 400 });
        }

        await connectDB();

        // Fetch recipes
        const recipes = await Recipe.find({
            _id: { $in: recipeIds }
        });

        if (recipes.length === 0) {
            return NextResponse.json({
                error: 'No valid recipes found'
            }, { status: 404 });
        }

        console.log(`Found ${recipes.length} recipes for shopping list generation`);

        // Fetch user's inventory
        const userInventory = await UserInventory.findOne({
            userId: session.user.id
        });
        const inventory = userInventory ? userInventory.items : [];

        console.log(`Found ${inventory.length} items in user inventory`);

        // Aggregate ingredients from all recipes with enhanced processing
        const ingredientMap = new Map();

        recipes.forEach(recipe => {
            console.log(`Processing recipe: ${recipe.title}`);

            if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
                console.log(`Recipe ${recipe.title} has no ingredients array`);
                return;
            }

            recipe.ingredients.forEach(ingredient => {
                const normalizedName = normalizeIngredient(ingredient.name);
                const key = normalizedName;

                if (ingredientMap.has(key)) {
                    const existing = ingredientMap.get(key);
                    existing.recipes.push(recipe.title);
                    // Could add logic here to combine amounts intelligently
                } else {
                    const category = categorizeIngredient(ingredient.name);
                    const packageInfo = getStandardPackageInfo(ingredient.name);

                    ingredientMap.set(key, {
                        name: ingredient.name,
                        originalName: ingredient.name,
                        normalizedName: normalizedName,
                        amount: ingredient.amount || '',
                        unit: ingredient.unit || '',
                        category: category,
                        recipes: [recipe.title],
                        optional: ingredient.optional || false,
                        alternatives: ingredient.alternatives || [],
                        packageInfo: packageInfo,
                        variations: getIngredientVariations(ingredient.name)
                    });
                }
            });
        });

        console.log(`Aggregated ${ingredientMap.size} unique ingredients`);

        // Enhanced inventory checking and categorization
        const shoppingListItems = [];
        const itemsByCategory = {};

        for (const [key, ingredient] of ingredientMap) {
            // Skip optional ingredients for now (could be a user preference later)
            if (ingredient.optional) {
                console.log(`Skipping optional ingredient: ${ingredient.name}`);
                continue;
            }

            const inventoryMatch = findBestInventoryMatch(ingredient.name, inventory);
            const category = ingredient.category;

            // Normalize category name for display
            const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

            // Enhanced inventory coverage check
            const hasEnoughInInventory = inventoryMatch &&
                checkInventoryCoverage(ingredient.amount, inventoryMatch, ingredient.packageInfo);

            const item = {
                name: ingredient.name,
                ingredient: ingredient.name,
                originalName: ingredient.originalName,
                amount: ingredient.amount,
                unit: ingredient.unit,
                category: normalizedCategory,
                recipes: ingredient.recipes,
                inInventory: hasEnoughInInventory,
                inventoryItem: inventoryMatch ? {
                    id: inventoryMatch._id,
                    name: inventoryMatch.name,
                    quantity: inventoryMatch.quantity,
                    unit: inventoryMatch.unit,
                    location: inventoryMatch.location,
                    expirationDate: inventoryMatch.expirationDate,
                    brand: inventoryMatch.brand
                } : null,
                needAmount: ingredient.amount || '1',
                haveAmount: inventoryMatch ? `${inventoryMatch.quantity} ${inventoryMatch.unit}` : '0',
                packageInfo: ingredient.packageInfo,
                alternatives: ingredient.alternatives,
                variations: ingredient.variations,
                normalizedName: ingredient.normalizedName
            };

            shoppingListItems.push(item);

            // Group by category
            if (!itemsByCategory[normalizedCategory]) {
                itemsByCategory[normalizedCategory] = [];
            }
            itemsByCategory[normalizedCategory].push(item);
        }

        console.log(`Generated shopping list with ${shoppingListItems.length} items across ${Object.keys(itemsByCategory).length} categories`);

        // Calculate comprehensive summary statistics
        const summary = {
            totalItems: shoppingListItems.length,
            needToBuy: shoppingListItems.filter(item => !item.inInventory).length,
            alreadyHave: shoppingListItems.filter(item => item.inInventory).length,
            inInventory: shoppingListItems.filter(item => item.inInventory).length,
            categories: Object.keys(itemsByCategory).length,
            recipeCount: recipes.length,
            optionalItemsSkipped: Array.from(ingredientMap.values()).filter(i => i.optional).length
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
                    packageSizesApplied: shoppingListItems.filter(item => item.packageInfo).length,
                    variationsMatched: shoppingListItems.filter(item => item.variations.length > 1).length
                }
            }
        };

        console.log('Enhanced shopping list generated successfully:', {
            totalItems: summary.totalItems,
            categories: summary.categories,
            source: response.shoppingList.source,
            packagesApplied: response.shoppingList.metadata.packageSizesApplied,
            variationsMatched: response.shoppingList.metadata.variationsMatched
        });

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error generating shopping list:', error);
        return NextResponse.json({
            error: 'Failed to generate shopping list',
            details: error.message
        }, { status: 500 });
    }
}