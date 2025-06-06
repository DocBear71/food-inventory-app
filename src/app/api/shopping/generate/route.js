// file: /src/app/api/shopping/generate/route.js v37

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
        'almonds', 'walnuts', 'pecans', 'cashews', 'peanuts', 'pine nuts', 'sesame seeds', 'chia seeds',
        'enchilada sauce', 'pasta sauce', 'marinara sauce', 'alfredo sauce', 'pizza sauce'
    ],

    // Dairy products
    'dairy': [
        'milk', 'butter', 'cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta', 'goat cheese',
        'cream cheese', 'sour cream', 'yogurt', 'greek yogurt', 'heavy cream', 'half and half',
        'buttermilk', 'cottage cheese', 'ricotta', 'swiss cheese', 'provolone', 'brie', 'camembert',
        'shredded cheese', 'sliced cheese', 'block cheese', 'grated cheese', 'shredded mozzarella',
        'shredded cheddar', 'string cheese'
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

// Improved ingredient variations - more specific and targeted
const INGREDIENT_VARIATIONS = {
    'garlic': ['garlic cloves', 'garlic bulb', 'minced garlic', 'garlic powder', 'fresh garlic', 'chopped garlic'],
    'onion': ['onions', 'yellow onion', 'white onion', 'red onion', 'sweet onion', 'vidalia onion', 'small onion', 'large onion', 'medium onion'],
    'green onion': ['green onions', 'scallions', 'scallion', 'spring onions'],
    'bell pepper': ['bell peppers', 'red bell pepper', 'green bell pepper', 'yellow bell pepper', 'orange bell pepper'],
    'red bell pepper': ['red bell peppers', 'red pepper'],
    'green bell pepper': ['green bell peppers', 'green pepper'],
    'tomato': ['tomatoes', 'cherry tomatoes', 'grape tomatoes', 'roma tomatoes', 'beefsteak tomatoes'],
    'tomato sauce': ['marinara sauce', 'pasta sauce', 'pizza sauce', 'tomato pasta sauce'],
    'mushroom': ['mushrooms', 'button mushrooms', 'cremini mushrooms', 'portobello mushrooms', 'shiitake mushrooms'],
    'chicken': ['chicken breast', 'chicken thighs', 'chicken legs', 'chicken wings', 'whole chicken'],
    'ground beef': ['ground chuck', 'ground sirloin', 'lean ground beef', 'extra lean ground beef'],
    'mozzarella': ['mozzarella cheese', 'fresh mozzarella', 'part skim mozzarella'],
    'shredded mozzarella': ['shredded mozzarella cheese', 'grated mozzarella'],
    'cheddar': ['cheddar cheese', 'sharp cheddar', 'mild cheddar', 'aged cheddar'],
    'shredded cheddar': ['shredded cheddar cheese', 'grated cheddar'],
    'pasta': ['spaghetti', 'penne', 'fusilli', 'rigatoni', 'linguine', 'fettuccine', 'angel hair'],
    'rice': ['white rice', 'brown rice', 'jasmine rice', 'basmati rice', 'wild rice', 'arborio rice'],
    'olive oil': ['extra virgin olive oil', 'virgin olive oil', 'light olive oil'],
    'vegetable oil': ['canola oil', 'sunflower oil', 'corn oil'],
    'flour': ['all purpose flour', 'whole wheat flour', 'bread flour', 'cake flour', 'self rising flour'],
    'sugar': ['white sugar', 'granulated sugar', 'cane sugar'],
    'brown sugar': ['light brown sugar', 'dark brown sugar', 'packed brown sugar'],
    'butter': ['unsalted butter', 'salted butter', 'sweet cream butter'],
    'milk': ['whole milk', '2% milk', '1% milk', 'skim milk', 'fat free milk'], // Keep milk separate from cheese
    'salt': ['table salt', 'sea salt', 'kosher salt', 'fine salt', 'coarse salt'],
    'sesame seeds': ['toasted sesame seeds', 'white sesame seeds', 'black sesame seeds']
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
    'mozzarella': { size: 8, unit: 'oz', type: 'dairy' },
    'shredded mozzarella': { size: 8, unit: 'oz', type: 'dairy' },
    'cheddar': { size: 8, unit: 'oz', type: 'dairy' },
    'shredded cheddar': { size: 8, unit: 'oz', type: 'dairy' },
    'cream cheese': { size: 8, unit: 'oz', type: 'dairy' },
    'sour cream': { size: 16, unit: 'oz', type: 'dairy' },
    'yogurt': { size: 32, unit: 'oz', type: 'dairy' },

    // Canned goods (in oz)
    'tomato sauce': { size: 15, unit: 'oz', type: 'canned' },
    'tomato paste': { size: 6, unit: 'oz', type: 'canned' },
    'coconut milk': { size: 13.5, unit: 'fl oz', type: 'canned' },
    'diced tomatoes': { size: 14.5, unit: 'oz', type: 'canned' },
    'crushed tomatoes': { size: 28, unit: 'oz', type: 'canned' },
    'enchilada sauce': { size: 10, unit: 'oz', type: 'canned' },

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
    'pine nuts': { size: 2, unit: 'oz', type: 'nuts' },
    'sesame seeds': { size: 4, unit: 'oz', type: 'nuts' }
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

// Create a standardized key for ingredient combination
function createIngredientKey(ingredient) {
    const normalized = normalizeIngredient(ingredient);

    // Remove common descriptors that shouldn't prevent combination
    const cleaned = normalized
        .replace(/\b(fresh|dried|minced|chopped|sliced|diced|whole|ground|crushed|grated|shredded|toasted)\b/g, '')
        .replace(/\b(small|medium|large|extra large)\b/g, '')
        .replace(/\b(can|jar|bottle|bag|box|package)\b/g, '')
        .replace(/\b(of|the|and|or)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Handle specific cases for better combination
    if (cleaned.includes('garlic')) return 'garlic';
    if (cleaned.includes('onion') && !cleaned.includes('green')) return 'onion';
    if (cleaned.includes('green onion') || cleaned.includes('scallion')) return 'green-onion';
    if (cleaned.includes('bell pepper')) return 'bell-pepper';
    if (cleaned.includes('red bell pepper') || cleaned.includes('red pepper')) return 'red-bell-pepper';
    if (cleaned.includes('green bell pepper') || cleaned.includes('green pepper')) return 'green-bell-pepper';
    if (cleaned.includes('tomato sauce') || cleaned.includes('marinara')) return 'tomato-sauce';
    if (cleaned.includes('mozzarella')) return 'mozzarella';
    if (cleaned.includes('cheddar')) return 'cheddar';
    if (cleaned.includes('sesame seeds')) return 'sesame-seeds';
    if (cleaned.includes('vegetable oil')) return 'vegetable-oil';
    if (cleaned.includes('olive oil')) return 'olive-oil';
    if (cleaned.includes('soy sauce')) return 'soy-sauce';
    if (cleaned.includes('salt')) return 'salt';

    return cleaned;
}

// Parse amount and unit from ingredient amount string
function parseAmountAndUnit(amountStr) {
    if (!amountStr || typeof amountStr !== 'string') {
        return { amount: '', unit: '', numeric: 0, isToTaste: false };
    }

    const str = amountStr.trim().toLowerCase();

    // Handle "to taste" specially
    if (str.includes('to taste')) {
        return { amount: 'to taste', unit: '', numeric: 0, isToTaste: true };
    }

    // Extract numeric value and unit
    const match = str.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s*(.*)$/);
    if (match) {
        const numericValue = parseFloat(match[1]);
        const unit = match[2].trim();
        return {
            amount: match[1],
            unit: unit,
            numeric: numericValue,
            isToTaste: false
        };
    }

    // If no numeric match, return as-is
    return { amount: str, unit: '', numeric: 0, isToTaste: false };
}

// Smart combination of ingredient amounts
function combineIngredientAmounts(existing, newIngredient) {
    const existingParsed = parseAmountAndUnit(existing.amount);
    const newParsed = parseAmountAndUnit(newIngredient.amount);

    console.log(`Combining amounts: "${existing.amount}" + "${newIngredient.amount}"`);
    console.log(`Parsed - Existing: ${JSON.stringify(existingParsed)}, New: ${JSON.stringify(newParsed)}`);

    // Handle "to taste" items - only keep one "to taste"
    if (existingParsed.isToTaste && newParsed.isToTaste) {
        return {
            amount: 'to taste',
            unit: existing.unit || newIngredient.unit || ''
        };
    }

    // If one is "to taste" and other has measurement, combine them
    if (existingParsed.isToTaste && !newParsed.isToTaste) {
        return {
            amount: `${newParsed.amount}${newParsed.unit ? ' ' + newParsed.unit : ''}, to taste`,
            unit: newParsed.unit || existing.unit || ''
        };
    }

    if (!existingParsed.isToTaste && newParsed.isToTaste) {
        return {
            amount: `${existingParsed.amount}${existingParsed.unit ? ' ' + existingParsed.unit : ''}, to taste`,
            unit: existingParsed.unit || newIngredient.unit || ''
        };
    }

    // Both have numeric values
    if (existingParsed.numeric > 0 && newParsed.numeric > 0) {
        // If units match or one is empty, combine
        if (!existingParsed.unit || !newParsed.unit || existingParsed.unit === newParsed.unit) {
            const combinedAmount = existingParsed.numeric + newParsed.numeric;
            const unit = existingParsed.unit || newParsed.unit || '';

            console.log(`Combined numeric: ${existingParsed.numeric} + ${newParsed.numeric} = ${combinedAmount} ${unit}`);

            return {
                amount: combinedAmount.toString(),
                unit: unit
            };
        } else {
            // Different units - list them separately
            const existingStr = `${existingParsed.amount}${existingParsed.unit ? ' ' + existingParsed.unit : ''}`;
            const newStr = `${newParsed.amount}${newParsed.unit ? ' ' + newParsed.unit : ''}`;

            return {
                amount: `${existingStr}, ${newStr}`,
                unit: '' // Clear unit since we have mixed units
            };
        }
    }

    // Fallback - just concatenate
    const existingStr = existing.amount + (existing.unit ? ' ' + existing.unit : '');
    const newStr = newIngredient.amount + (newIngredient.unit ? ' ' + newIngredient.unit : '');

    return {
        amount: `${existingStr}, ${newStr}`,
        unit: ''
    };
}

// Get all variations of an ingredient - more conservative approach
function getIngredientVariations(ingredient) {
    const normalized = normalizeIngredient(ingredient);
    const variations = new Set([normalized]);

    // Only add variations that are explicitly defined
    for (const [base, vars] of Object.entries(INGREDIENT_VARIATIONS)) {
        // More strict matching - only if the base exactly matches or is contained
        if (normalized === base || normalized.includes(base)) {
            variations.add(base);
            vars.forEach(v => variations.add(normalizeIngredient(v)));
            break; // Stop after first match to prevent cross-contamination
        }

        // Check if any variation matches exactly
        for (const variation of vars) {
            if (normalized === normalizeIngredient(variation)) {
                variations.add(base);
                vars.forEach(v => variations.add(normalizeIngredient(v)));
                break;
            }
        }
    }

    return Array.from(variations);
}

// Categorize ingredient based on name - more precise matching
function categorizeIngredient(ingredient) {
    const normalized = normalizeIngredient(ingredient);

    // First check for exact matches or very specific matches
    for (const [category, items] of Object.entries(INGREDIENT_CATEGORIES)) {
        for (const item of items) {
            // Exact match
            if (normalized === item) {
                return category;
            }
            // Check if ingredient contains the category item as a whole word
            if (normalized.includes(item) && (
                normalized.startsWith(item + ' ') ||
                normalized.endsWith(' ' + item) ||
                normalized.includes(' ' + item + ' ') ||
                normalized === item
            )) {
                return category;
            }
        }
    }

    return 'other';
}

// Enhanced inventory matching with much more conservative approach
function findBestInventoryMatch(ingredient, inventory) {
    if (!inventory || inventory.length === 0) return null;

    const normalizedIngredient = normalizeIngredient(ingredient);
    const ingredientKey = createIngredientKey(ingredient);

    console.log(`Looking for inventory match for: "${ingredient}" (normalized: "${normalizedIngredient}", key: "${ingredientKey}")`);

    // 1. Exact name matches first (highest priority)
    for (const item of inventory) {
        const itemName = normalizeIngredient(item.name);
        if (itemName === normalizedIngredient) {
            console.log(`✓ Exact match found: ${item.name}`);
            return item;
        }
    }

    // 2. Check if ingredient key matches inventory item key
    for (const item of inventory) {
        const itemKey = createIngredientKey(item.name);
        if (itemKey === ingredientKey && itemKey.length > 3) {
            console.log(`✓ Key match found: ${item.name} (key: ${itemKey})`);
            return item;
        }
    }

    // 3. Check defined variations only
    const ingredientVariations = getIngredientVariations(ingredient);
    for (const variation of ingredientVariations) {
        for (const item of inventory) {
            const itemName = normalizeIngredient(item.name);
            if (itemName === variation) {
                console.log(`✓ Variation match found: ${item.name} (variation: ${variation})`);
                return item;
            }
        }
    }

    // 4. Conservative partial matching - only for specific cases
    const specificMatches = [
        { ingredient: 'garlic', inventory: ['garlic'] },
        { ingredient: 'onion', inventory: ['onion'] },
        { ingredient: 'tomato', inventory: ['tomato'] },
        { ingredient: 'pepper', inventory: ['bell pepper', 'pepper'] },
        { ingredient: 'cheese', inventory: ['cheese'] }
    ];

    for (const match of specificMatches) {
        if (normalizedIngredient.includes(match.ingredient)) {
            for (const item of inventory) {
                const itemName = normalizeIngredient(item.name);
                for (const invMatch of match.inventory) {
                    if (itemName.includes(invMatch)) {
                        console.log(`✓ Specific match found: ${item.name} (rule: ${match.ingredient} -> ${invMatch})`);
                        return item;
                    }
                }
            }
        }
    }

    console.log(`✗ No match found for: ${ingredient}`);
    return null;
}

// Get standard package information for an ingredient - more precise
function getStandardPackageInfo(ingredient) {
    const normalized = normalizeIngredient(ingredient);
    const ingredientKey = createIngredientKey(ingredient);

    // Direct match first
    if (STANDARD_PACKAGE_SIZES[normalized]) {
        return STANDARD_PACKAGE_SIZES[normalized];
    }

    // Check by ingredient key
    if (STANDARD_PACKAGE_SIZES[ingredientKey]) {
        return STANDARD_PACKAGE_SIZES[ingredientKey];
    }

    // Check specific ingredient types
    if (normalized.includes('mozzarella')) {
        return STANDARD_PACKAGE_SIZES['mozzarella'] || STANDARD_PACKAGE_SIZES['cheese'];
    }
    if (normalized.includes('cheddar')) {
        return STANDARD_PACKAGE_SIZES['cheddar'] || STANDARD_PACKAGE_SIZES['cheese'];
    }
    if (normalized.includes('tomato sauce') || normalized.includes('marinara')) {
        return STANDARD_PACKAGE_SIZES['tomato sauce'];
    }
    if (normalized.includes('sesame seeds')) {
        return STANDARD_PACKAGE_SIZES['sesame seeds'];
    }

    // Only check very specific partial matches to avoid contamination
    const specificPackageMatches = {
        'cheese': ['mozzarella', 'cheddar', 'parmesan', 'swiss'],
        'oil': ['olive oil', 'vegetable oil'],
        'milk': ['milk'] // Keep milk separate and specific
    };

    for (const [packageType, ingredients] of Object.entries(specificPackageMatches)) {
        for (const ing of ingredients) {
            if (normalized.includes(ing) && STANDARD_PACKAGE_SIZES[packageType]) {
                return STANDARD_PACKAGE_SIZES[packageType];
            }
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

        // Enhanced ingredient aggregation with improved combination logic
        const ingredientMap = new Map();

        recipes.forEach(recipe => {
            console.log(`Processing recipe: ${recipe.title}`);

            if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
                console.log(`Recipe ${recipe.title} has no ingredients array`);
                return;
            }

            recipe.ingredients.forEach(ingredient => {
                const ingredientKey = createIngredientKey(ingredient.name);

                console.log(`Processing ingredient: "${ingredient.name}" -> key: "${ingredientKey}"`);
                console.log(`Amount: "${ingredient.amount}", Unit: "${ingredient.unit}"`);

                if (ingredientMap.has(ingredientKey)) {
                    const existing = ingredientMap.get(ingredientKey);
                    existing.recipes.push(recipe.title);

                    // Smart amount combination
                    const combinedAmounts = combineIngredientAmounts(existing, ingredient);
                    existing.amount = combinedAmounts.amount;
                    existing.unit = combinedAmounts.unit;

                    // Keep the most descriptive name
                    if (ingredient.name.length > existing.name.length) {
                        existing.name = ingredient.name;
                        existing.originalName = ingredient.name;
                    }

                    console.log(`Combined ingredient: ${existing.name} - ${existing.amount} ${existing.unit}`);
                } else {
                    const category = categorizeIngredient(ingredient.name);
                    const packageInfo = getStandardPackageInfo(ingredient.name);

                    // Ensure we preserve the unit from the ingredient
                    const finalAmount = ingredient.amount || '';
                    const finalUnit = ingredient.unit || '';

                    ingredientMap.set(ingredientKey, {
                        name: ingredient.name,
                        originalName: ingredient.name,
                        normalizedName: normalizeIngredient(ingredient.name),
                        amount: finalAmount,
                        unit: finalUnit,
                        category: category,
                        recipes: [recipe.title],
                        optional: ingredient.optional || false,
                        alternatives: ingredient.alternatives || [],
                        packageInfo: packageInfo,
                        variations: getIngredientVariations(ingredient.name),
                        ingredientKey: ingredientKey
                    });

                    console.log(`New ingredient: ${ingredient.name} - ${finalAmount} ${finalUnit}`);
                }
            });
        });

        console.log(`Aggregated ${ingredientMap.size} unique ingredients after combination`);

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

            // Create the display amount with unit
            let displayAmount = ingredient.amount || '';
            if (ingredient.unit && displayAmount && !displayAmount.includes(ingredient.unit)) {
                // Only add unit if it's not already included in the amount
                if (displayAmount !== 'to taste') {
                    displayAmount = `${displayAmount} ${ingredient.unit}`.trim();
                }
            }

            const item = {
                name: ingredient.name,
                ingredient: ingredient.name,
                originalName: ingredient.originalName,
                amount: displayAmount, // Use display amount with unit
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
                needAmount: displayAmount || '1',
                haveAmount: inventoryMatch ? `${inventoryMatch.quantity} ${inventoryMatch.unit}` : '0',
                packageInfo: ingredient.packageInfo,
                alternatives: ingredient.alternatives,
                variations: ingredient.variations,
                normalizedName: ingredient.normalizedName,
                ingredientKey: ingredient.ingredientKey
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
                    packageSizesApplied: shoppingListItems.filter(item => item.packageInfo).length,
                    variationsMatched: shoppingListItems.filter(item => item.variations.length > 1).length,
                    ingredientsCombined: summary.ingredientsCombined,
                    matchingStats: {
                        exactMatches: shoppingListItems.filter(item => item.inventoryItem).length,
                        noMatches: shoppingListItems.filter(item => !item.inventoryItem).length
                    }
                }
            }
        };

        console.log('Enhanced shopping list generated successfully:', {
            totalItems: summary.totalItems,
            categories: summary.categories,
            source: response.shoppingList.source,
            packagesApplied: response.shoppingList.metadata.packageSizesApplied,
            variationsMatched: response.shoppingList.metadata.variationsMatched,
            ingredientsCombined: summary.ingredientsCombined,
            exactMatches: response.shoppingList.metadata.matchingStats.exactMatches
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