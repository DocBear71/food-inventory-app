// file: /src/app/api/shopping/generate/route.js v40 - FIXED ingredient matching

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, UserInventory, MealPlan } from '@/lib/models';

// UPDATED: Use the same sophisticated ingredient matching as recipe suggestions
const NEVER_MATCH_INGREDIENTS = [
    // Specialty flours
    'almond flour', 'coconut flour', 'cake flour', 'bread flour', 'self rising flour',
    'whole wheat flour', 'gluten free flour', 'gluten-free flour', 'oat flour', 'rice flour',

    // Specialty sugars
    'powdered sugar', 'confectioners sugar', 'coconut sugar', 'maple sugar',
    'swerve', 'stevia', 'erythritol', 'monk fruit', 'xylitol', 'sugar substitute',

    // Alternative milks
    'almond milk', 'oat milk', 'soy milk', 'coconut milk', 'rice milk', 'cashew milk',

    // Compound dairy products
    'buttermilk', 'sour cream', 'heavy cream', 'half and half', 'cream cheese',

    // Vegan/diet-specific ingredients
    'vegan butter', 'vegan cheese', 'vegan milk', 'vegan bacon', 'vegan sausage',
    'vegan beef', 'vegan chicken', 'plant butter', 'plant milk', 'plant beef',

    // Specialty extracts and seasonings
    'vanilla extract', 'almond extract', 'garlic powder', 'onion powder',

    // Specialty baking ingredients
    'baking powder', 'baking soda', 'cream of tartar', 'xanthan gum',

    // CRITICAL: Tomato products - NEVER cross-match these
    'tomato paste', 'tomato sauce', 'crushed tomatoes', 'diced tomatoes', 'tomato puree',
    'sun dried tomatoes', 'cherry tomatoes', 'roma tomatoes', 'whole tomatoes'
];

const NEVER_CROSS_MATCH = {
    'peanut butter': ['butter'],
    'almond butter': ['butter'],
    'green onions': ['onion', 'onions'],
    'scallions': ['onion', 'onions'],
    'red bell pepper': ['pepper'],
    'green bell pepper': ['pepper'],
    'red pepper diced': ['pepper'],
    'buttermilk': ['milk', 'butter'],
    'heavy cream': ['milk'],
    'sour cream': ['cream', 'milk'],
    'cream cheese': ['cheese', 'cream'],
    'vegan bacon': ['bacon'],
    'sugar substitute': ['sugar'],
    'brown sugar': ['sugar'],
    'packed brown sugar': ['sugar'],

    // CRITICAL: Tomato product cross-matching prevention
    'tomato paste': ['tomato', 'tomatoes', 'whole tomatoes', 'fresh tomatoes'],
    'tomato sauce': ['tomato', 'tomatoes', 'whole tomatoes', 'fresh tomatoes'],
    'crushed tomatoes': ['tomato', 'tomatoes', 'whole tomatoes', 'fresh tomatoes'],
    'diced tomatoes': ['tomato', 'tomatoes', 'whole tomatoes', 'fresh tomatoes'],
    'tomato puree': ['tomato', 'tomatoes', 'whole tomatoes', 'fresh tomatoes'],
    'sun dried tomatoes': ['tomato', 'tomatoes', 'whole tomatoes', 'fresh tomatoes'],
    'cherry tomatoes': ['tomato', 'tomatoes', 'whole tomatoes'],
    'roma tomatoes': ['tomato', 'tomatoes', 'whole tomatoes'],
    'whole tomatoes': ['tomato paste', 'tomato sauce', 'crushed tomatoes', 'diced tomatoes'],
    'fresh tomatoes': ['tomato paste', 'tomato sauce', 'crushed tomatoes', 'diced tomatoes']
};

// FIXED: Enhanced ingredient variations - more specific and targeted
const INGREDIENT_VARIATIONS = {
    'garlic': ['garlic cloves', 'garlic bulb', 'minced garlic', 'fresh garlic', 'chopped garlic'],
    'garlic cloves': ['garlic', 'fresh garlic', 'minced garlic'],
    'minced garlic': ['garlic', 'garlic cloves'],

    'onion': ['onions', 'yellow onion', 'white onion', 'red onion', 'sweet onion', 'vidalia onion'],
    'onions': ['onion', 'yellow onion', 'white onion', 'sweet onion'],

    'green onion': ['green onions', 'scallions', 'scallion', 'spring onions'],
    'bell pepper': ['bell peppers', 'red bell pepper', 'green bell pepper', 'yellow bell pepper'],
    'red bell pepper': ['red bell peppers', 'red pepper'],
    'green bell pepper': ['green bell peppers', 'green pepper'],

    // FIXED: Keep tomato types separate - no cross-matching
    'tomatoes': ['fresh tomatoes', 'whole tomatoes', 'ripe tomatoes'],
    'fresh tomatoes': ['tomatoes', 'whole tomatoes', 'ripe tomatoes'],
    'whole tomatoes': ['fresh tomatoes', 'tomatoes', 'ripe tomatoes'],

    // Cherry/Roma tomatoes can substitute for each other but not for paste/sauce
    'cherry tomatoes': ['grape tomatoes', 'small tomatoes'],
    'roma tomatoes': ['plum tomatoes', 'paste tomatoes'],

    // Processed tomato products are separate
    'tomato paste': ['concentrated tomato paste', 'double concentrated tomato paste'],
    'tomato sauce': ['marinara sauce', 'basic tomato sauce'],
    'crushed tomatoes': ['crushed canned tomatoes'],
    'diced tomatoes': ['diced canned tomatoes', 'chopped tomatoes'],

    'mushroom': ['mushrooms', 'button mushrooms', 'cremini mushrooms', 'portobello mushrooms'],
    'chicken': ['chicken breast', 'chicken thighs', 'chicken legs', 'chicken wings', 'whole chicken'],
    'chicken breast': ['chicken breasts', 'boneless chicken breast', 'skinless chicken breast'],
    'ground beef': ['ground chuck', 'ground sirloin', 'lean ground beef', 'extra lean ground beef'],
    'beef sirloin': ['sirloin steak', 'beef sirloin steak', 'sirloin'],
    'italian sausage': ['italian turkey sausage', 'sweet italian sausage', 'spicy italian sausage'],
    'mozzarella': ['mozzarella cheese', 'fresh mozzarella', 'part skim mozzarella'],
    'shredded mozzarella': ['shredded mozzarella cheese', 'grated mozzarella'],
    'cheddar': ['cheddar cheese', 'sharp cheddar', 'mild cheddar', 'aged cheddar'],
    'shredded cheddar': ['shredded cheddar cheese', 'grated cheddar'],
    'eggs': ['large eggs', 'extra large eggs', 'jumbo eggs', 'medium eggs', 'small eggs'],

    // Enhanced pasta variations
    'pasta': [
        'spaghetti', 'penne', 'fusilli', 'rigatoni', 'linguine', 'fettuccine', 'angel hair',
        'penne pasta', 'spaghetti pasta', 'fusilli pasta', 'rigatoni pasta', 'linguine pasta',
        'fettuccine pasta', 'angel hair pasta', 'bow tie pasta', 'rotini pasta', 'macaroni',
        'macaroni pasta', 'shells', 'shell pasta', 'farfalle', 'gemelli'
    ],

    'spaghetti': ['spaghetti pasta', 'thin spaghetti', 'whole wheat spaghetti'],
    'penne': ['penne pasta', 'penne rigate', 'whole wheat penne'],
    'fettuccine': ['fettuccine pasta', 'fresh fettuccine', 'whole wheat fettuccine'],
    'fusilli': ['fusilli pasta', 'rotini', 'spiral pasta'],
    'rigatoni': ['rigatoni pasta', 'large rigatoni'],
    'linguine': ['linguine pasta', 'thin linguine'],
    'angel hair': ['angel hair pasta', 'capellini', 'thin pasta'],
    'bow tie': ['bow tie pasta', 'farfalle', 'farfalle pasta'],
    'macaroni': ['macaroni pasta', 'elbow macaroni', 'elbow pasta'],
    'shells': ['shell pasta', 'conchiglie', 'pasta shells'],

    'rice': ['white rice', 'brown rice', 'jasmine rice', 'basmati rice', 'wild rice'],
    'olive oil': ['extra virgin olive oil', 'virgin olive oil', 'light olive oil'],
    'vegetable oil': ['canola oil', 'sunflower oil', 'corn oil'],
    'flour': ['all purpose flour', 'all-purpose flour', 'plain flour', 'white flour'],
    'sugar': ['white sugar', 'granulated sugar', 'cane sugar', 'pure cane sugar'],
    'brown sugar': ['light brown sugar', 'dark brown sugar', 'packed brown sugar'],
    'butter': ['unsalted butter', 'salted butter', 'sweet cream butter'],
    'milk': ['whole milk', '2% milk', '1% milk', 'skim milk', 'vitamin d milk'],
    'salt': ['table salt', 'sea salt', 'kosher salt', 'fine salt'],
    'pepper': ['black pepper', 'ground pepper', 'cracked pepper'],
    'sesame seeds': ['toasted sesame seeds', 'white sesame seeds'],
    'white wine': ['dry white wine', 'cooking wine', 'white cooking wine'],
    'red pepper flakes': ['crushed red pepper', 'red chili flakes'],
    'chives': ['fresh chives', 'chopped chives']
};

// UPDATED: Better ingredient normalization
function normalizeIngredient(ingredient) {
    if (!ingredient || typeof ingredient !== 'string') {
        return '';
    }

    return ingredient
        .toLowerCase()
        .trim()
        .replace(/\([^)]*\)/g, '')
        .replace(/\b(organic|natural|pure|fresh|raw|whole|fine|coarse|ground)\b/g, '')
        .replace(/\b(small|medium|large|extra large|jumbo|mini)\b/g, '')
        .replace(/\b(can|jar|bottle|bag|box|package|container)\b/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// UPDATED: Check if ingredient is specialty and shouldn't cross-match
function isSpecialtyIngredient(ingredient) {
    const normalized = normalizeIngredient(ingredient);
    return NEVER_MATCH_INGREDIENTS.some(specialty => {
        const specialtyNorm = normalizeIngredient(specialty);
        return normalized === specialtyNorm || normalized.includes(specialtyNorm);
    });
}

// UPDATED: Check if two ingredients can match
function canIngredientsMatch(recipeIngredient, inventoryIngredient) {
    const recipeNorm = normalizeIngredient(recipeIngredient);
    const inventoryNorm = normalizeIngredient(inventoryIngredient);

    // Exact match
    if (recipeNorm === inventoryNorm) {
        return true;
    }

    // Check if either is a specialty ingredient that shouldn't cross-match
    if (isSpecialtyIngredient(recipeIngredient) || isSpecialtyIngredient(inventoryIngredient)) {
        return false;
    }

    // Check NEVER_CROSS_MATCH rules
    for (const [ingredient, blockedMatches] of Object.entries(NEVER_CROSS_MATCH)) {
        const ingredientNorm = normalizeIngredient(ingredient);

        if (recipeNorm === ingredientNorm || recipeNorm.includes(ingredientNorm)) {
            if (blockedMatches.some(blocked => {
                const blockedNorm = normalizeIngredient(blocked);
                return inventoryNorm === blockedNorm || inventoryNorm.includes(blockedNorm);
            })) {
                console.log(`[SHOPPING API] ❌ BLOCKED MATCH: "${recipeIngredient}" cannot match "${inventoryIngredient}"`);
                return false;
            }
        }

        if (inventoryNorm === ingredientNorm || inventoryNorm.includes(ingredientNorm)) {
            if (blockedMatches.some(blocked => {
                const blockedNorm = normalizeIngredient(blocked);
                return recipeNorm === blockedNorm || recipeNorm.includes(blockedNorm);
            })) {
                console.log(`[SHOPPING API] ❌ BLOCKED MATCH: "${recipeIngredient}" cannot match "${inventoryIngredient}"`);
                return false;
            }
        }
    }

    // Check ingredient variations
    const recipeVariations = getIngredientVariations(recipeIngredient);
    const inventoryVariations = getIngredientVariations(inventoryIngredient);

    // Check if any variations match
    for (const recipeVar of recipeVariations) {
        for (const invVar of inventoryVariations) {
            if (recipeVar === invVar) {
                return true;
            }
        }
    }

    return false;
}

// Get all variations of an ingredient - more conservative approach
function getIngredientVariations(ingredient) {
    const normalized = normalizeIngredient(ingredient);

    // If it's a specialty ingredient, only return itself for exact matching
    if (isSpecialtyIngredient(ingredient)) {
        return [normalized, ingredient.toLowerCase().trim()];
    }

    const variations = new Set([normalized]);
    variations.add(ingredient.toLowerCase().trim());

    // Check if this ingredient has defined variations
    if (INGREDIENT_VARIATIONS[normalized]) {
        INGREDIENT_VARIATIONS[normalized].forEach(variation => {
            variations.add(normalizeIngredient(variation));
        });
    }

    // Check if this ingredient is a variation of something else
    for (const [base, variationList] of Object.entries(INGREDIENT_VARIATIONS)) {
        const normalizedVariations = variationList.map(v => normalizeIngredient(v));
        if (normalizedVariations.includes(normalized)) {
            variations.add(base);
            normalizedVariations.forEach(v => variations.add(v));
            break;
        }
    }

    return Array.from(variations);
}

// COMPLETELY REPLACED: Enhanced inventory matching using sophisticated logic
function findBestInventoryMatch(ingredient, inventory) {
    if (!inventory || inventory.length === 0) return null;

    const normalizedIngredient = normalizeIngredient(ingredient);

    console.log(`[SHOPPING API] Looking for inventory match for: "${ingredient}" (normalized: "${normalizedIngredient}")`);

    // 1. EXACT MATCH (highest priority)
    for (const item of inventory) {
        const itemName = normalizeIngredient(item.name);
        if (itemName === normalizedIngredient && normalizedIngredient.length > 2) {
            console.log(`[SHOPPING API] ✅ EXACT MATCH: "${item.name}"`);
            return item;
        }
    }

    // 2. INTELLIGENT MATCHING using canIngredientsMatch
    for (const item of inventory) {
        if (canIngredientsMatch(ingredient, item.name)) {
            console.log(`[SHOPPING API] ✅ INTELLIGENT MATCH: "${item.name}" matches "${ingredient}"`);
            return item;
        }
    }

    console.log(`[SHOPPING API] ❌ NO MATCH found for: "${ingredient}"`);
    return null;
}

// Create a more specific standardized key for ingredient combination
function createIngredientKey(ingredient) {
    const normalized = normalizeIngredient(ingredient);

    // Remove common descriptors that shouldn't prevent combination
    const cleaned = normalized
        .replace(/\b(fresh|dried|minced|chopped|sliced|diced|whole|ground|crushed|grated|shredded|toasted|crumbled|cooked)\b/g, '')
        .replace(/\b(small|medium|large|extra large)\b/g, '')
        .replace(/\b(can|jar|bottle|bag|box|package)\b/g, '')
        .replace(/\b(of|the|and|or|into|cut)\b/g, '')
        .replace(/\b(matchsticks|strips|florets)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // IMPROVED: Better pasta handling - normalize all pasta types to 'pasta'
    if (cleaned.includes('pasta') ||
        cleaned.includes('spaghetti') ||
        cleaned.includes('penne') ||
        cleaned.includes('fettuccine') ||
        cleaned.includes('fusilli') ||
        cleaned.includes('rigatoni') ||
        cleaned.includes('linguine') ||
        cleaned.includes('angel hair') ||
        cleaned.includes('bow tie') ||
        cleaned.includes('farfalle') ||
        cleaned.includes('macaroni') ||
        cleaned.includes('shells') ||
        cleaned.includes('rotini') ||
        cleaned.includes('gemelli') ||
        cleaned.includes('orzo')) {
        return 'pasta';
    }

    // Handle specific cases for better combination - be more specific to avoid wrong combinations
    if (cleaned.includes('red bell pepper')) return 'red-bell-pepper';
    if (cleaned.includes('green bell pepper')) return 'green-bell-pepper';
    if (cleaned.includes('bell pepper') && !cleaned.includes('red') && !cleaned.includes('green')) return 'bell-pepper';
    if (cleaned.includes('green onion') || cleaned.includes('scallion')) return 'green-onion';
    if (cleaned.includes('red pepper flakes')) return 'red-pepper-flakes';
    if (cleaned.includes('garlic')) return 'garlic';
    if (cleaned.includes('onion') && !cleaned.includes('green') && !cleaned.includes('red')) return 'onion';

    // CRITICAL: Keep tomato products separate
    if (cleaned.includes('tomato paste')) return 'tomato-paste';
    if (cleaned.includes('tomato sauce') || cleaned.includes('marinara')) return 'tomato-sauce';
    if (cleaned.includes('crushed tomatoes')) return 'crushed-tomatoes';
    if (cleaned.includes('diced tomatoes')) return 'diced-tomatoes';
    if (cleaned.includes('sun dried tomatoes')) return 'sun-dried-tomatoes';
    if (cleaned.includes('cherry tomatoes')) return 'cherry-tomatoes';
    if (cleaned.includes('roma tomatoes')) return 'roma-tomatoes';
    if (cleaned.includes('whole tomatoes')) return 'whole-tomatoes';
    if (cleaned.includes('fresh tomatoes')) return 'fresh-tomatoes';
    if (cleaned.includes('tomatoes') && !cleaned.includes('paste') && !cleaned.includes('sauce') && !cleaned.includes('crushed') && !cleaned.includes('diced')) return 'tomatoes';

    if (cleaned.includes('shredded mozzarella')) return 'shredded-mozzarella';
    if (cleaned.includes('mozzarella') && !cleaned.includes('shredded')) return 'mozzarella';
    if (cleaned.includes('cheddar')) return 'cheddar';
    if (cleaned.includes('sesame seeds')) return 'sesame-seeds';
    if (cleaned.includes('vegetable oil')) return 'vegetable-oil';
    if (cleaned.includes('olive oil')) return 'olive-oil';
    if (cleaned.includes('soy sauce')) return 'soy-sauce';
    if (cleaned.includes('white wine')) return 'white-wine';
    if (cleaned.includes('italian sausage')) return 'italian-sausage';
    if (cleaned.includes('chicken breast')) return 'chicken-breast';
    if (cleaned.includes('beef sirloin')) return 'beef-sirloin';
    if (cleaned.includes('salt') && cleaned.includes('pepper')) return 'salt-and-pepper';
    if (cleaned.includes('salt') && !cleaned.includes('pepper')) return 'salt';
    if (cleaned.includes('pepper') && !cleaned.includes('salt') && !cleaned.includes('bell')) return 'pepper';
    if (cleaned.includes('cornstarch') || cleaned.includes('corn starch')) return 'cornstarch';
    if (cleaned.includes('chives')) return 'chives';
    if (cleaned.includes('broccoli')) return 'broccoli';
    if (cleaned.includes('pineapple')) return 'pineapple';
    if (cleaned.includes('carrots')) return 'carrots';

    return cleaned;
}

// Parse amount and unit from ingredient amount string with better handling
function parseAmountAndUnit(amountStr) {
    if (!amountStr || typeof amountStr !== 'string') {
        return { amount: '', unit: '', numeric: 0, isToTaste: false, originalAmount: amountStr };
    }

    const str = amountStr.trim().toLowerCase();

    // Handle "to taste" specially
    if (str.includes('to taste')) {
        return { amount: 'to taste', unit: '', numeric: 0, isToTaste: true, originalAmount: amountStr };
    }

    // Extract numeric value and unit with better regex
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

    // Handle fractions and special cases
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

    // If no numeric match, return as-is
    return { amount: str, unit: '', numeric: 0, isToTaste: false, originalAmount: amountStr };
}

// Smart combination of ingredient amounts with better unit handling
function combineIngredientAmounts(existing, newIngredient) {
    const existingParsed = parseAmountAndUnit(existing.amount);
    const newParsed = parseAmountAndUnit(newIngredient.amount);

    console.log(`Combining amounts: "${existing.amount}" (${existing.unit}) + "${newIngredient.amount}" (${newIngredient.unit})`);

    // Handle "to taste" items - only keep one "to taste"
    if (existingParsed.isToTaste && newParsed.isToTaste) {
        return {
            amount: 'to taste',
            unit: existing.unit || newIngredient.unit || ''
        };
    }

    // If one is "to taste" and other has measurement, combine them properly
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
        const existingAmountStr = existingUnit ? `${existingParsed.amount} ${existingUnit}` : existingParsed.amount;
        return {
            amount: `${existingAmountStr}, to taste`,
            unit: ''
        };
    }

    // Both have numeric values
    if (existingParsed.numeric > 0 && newParsed.numeric > 0) {
        const existingUnit = existing.unit || existingParsed.unit || '';
        const newUnit = newIngredient.unit || newParsed.unit || '';

        // If units match or are compatible, combine
        if (existingUnit === newUnit || (!existingUnit && !newUnit)) {
            const combinedAmount = existingParsed.numeric + newParsed.numeric;
            const unit = existingUnit || newUnit;

            console.log(`Combined numeric: ${existingParsed.numeric} + ${newParsed.numeric} = ${combinedAmount} ${unit}`);

            return {
                amount: combinedAmount.toString(),
                unit: unit
            };
        } else {
            // Different units - list them separately with proper formatting
            const existingStr = existingUnit ? `${existingParsed.amount} ${existingUnit}` : existingParsed.amount;
            const newStr = newUnit ? `${newParsed.amount} ${newUnit}` : newParsed.amount;

            return {
                amount: `${existingStr}, ${newStr}`,
                unit: '' // Clear unit since we have mixed units
            };
        }
    }

    // Fallback - just concatenate with proper formatting
    const existingUnit = existing.unit || existingParsed.unit || '';
    const newUnit = newIngredient.unit || newParsed.unit || '';
    const existingStr = existingUnit ? `${existingParsed.amount} ${existingUnit}` : existingParsed.amount;
    const newStr = newUnit ? `${newParsed.amount} ${newUnit}` : newParsed.amount;

    return {
        amount: `${existingStr}, ${newStr}`,
        unit: ''
    };
}

// Enhanced ingredient categorization system
const INGREDIENT_CATEGORIES = {
    // Fresh produce
    'produce': [
        'tomato', 'onion', 'garlic', 'ginger', 'potato', 'carrot', 'celery', 'bell pepper', 'pepper',
        'cucumber', 'lettuce', 'spinach', 'kale', 'broccoli', 'cauliflower', 'cabbage', 'zucchini',
        'eggplant', 'mushroom', 'avocado', 'lemon', 'lime', 'orange', 'apple', 'banana', 'berry',
        'strawberry', 'blueberry', 'raspberry', 'grape', 'pineapple', 'mango', 'cilantro', 'parsley',
        'basil', 'mint', 'rosemary', 'thyme', 'oregano', 'sage', 'dill', 'chive', 'scallion',
        'green onion', 'shallot', 'leek', 'jalapeño', 'serrano', 'habanero', 'poblano', 'anaheim',
        'red pepper flakes', 'chives'
    ],

    // Pantry staples
    'pantry': [
        'flour', 'sugar', 'brown sugar', 'salt', 'pepper', 'baking powder', 'baking soda', 'vanilla',
        'olive oil', 'vegetable oil', 'coconut oil', 'vinegar', 'soy sauce', 'worcestershire',
        'hot sauce', 'ketchup', 'mustard', 'mayonnaise', 'honey', 'maple syrup', 'rice', 'pasta',
        'quinoa', 'oats', 'bread', 'tortilla', 'beans', 'lentils', 'chickpeas', 'broth', 'stock',
        'tomato sauce', 'tomato paste', 'coconut milk', 'peanut butter', 'almond butter', 'nuts',
        'almonds', 'walnuts', 'pecans', 'cashews', 'peanuts', 'pine nuts', 'sesame seeds', 'chia seeds',
        'enchilada sauce', 'pasta sauce', 'marinara sauce', 'alfredo sauce', 'pizza sauce', 'cornstarch',
        // Add all pasta types to pantry
        'spaghetti', 'penne', 'fettuccine', 'fusilli', 'rigatoni', 'linguine', 'angel hair',
        'bow tie', 'farfalle', 'macaroni', 'shells', 'rotini', 'gemelli', 'orzo'
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
        'shrimp', 'crab', 'lobster', 'scallops', 'mussels', 'clams', 'oysters', 'fish', 'seafood',
        'italian sausage', 'chicken breast', 'beef sirloin'
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
        'almond milk', 'oat milk', 'soy milk', 'coconut milk', 'energy drink', 'sports drink',
        'white wine'
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
    ],

    // Other (catch-all for items that don't fit elsewhere)
    'other': [
        'pappardelle', 'lasagna noodles', 'diced tomatoes'
    ]
};

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

// Check if inventory covers the needed amount
function checkInventoryCoverage(neededAmount, inventoryItem, packageInfo) {
    if (!inventoryItem) return false;

    const neededMatch = neededAmount?.match(/(\d+(?:\.\d+)?)/);
    const neededNumber = neededMatch ? parseFloat(neededMatch[1]) : 1;
    const inventoryQuantity = inventoryItem.quantity || 1;
    const inventoryUnit = (inventoryItem.unit || 'item').toLowerCase();

    console.log(`[COVERAGE CHECK] Need: "${neededAmount}", Have: ${inventoryQuantity} ${inventoryUnit}, Item: "${inventoryItem.name}"`);

    // Smart coverage rules for different ingredient types
    const itemName = normalizeIngredient(inventoryItem.name);

    // Rule 1: If we have any pasta and need pasta (regardless of weight vs count), we're good
    if (itemName.includes('pasta') ||
        ['spaghetti', 'penne', 'fettuccine', 'fusilli', 'rigatoni', 'linguine', 'macaroni', 'shells'].some(p => itemName.includes(p))) {
        console.log(`[COVERAGE CHECK] ✅ Pasta rule: Have pasta item, covers pasta need`);
        return inventoryQuantity >= 1; // Just need to have at least 1 package/box
    }

    // Rule 2: If we have oil and need tablespoons/teaspoons, we're good
    if (itemName.includes('oil') && neededAmount && (neededAmount.includes('tbsp') || neededAmount.includes('tsp'))) {
        console.log(`[COVERAGE CHECK] ✅ Oil rule: Have oil item, covers small oil need`);
        return inventoryQuantity >= 1;
    }

    // Rule 3: If we have spices/seasonings and need "to taste", we're good
    if (neededAmount === 'to taste' || neededAmount.includes('to taste')) {
        const spiceKeywords = ['salt', 'pepper', 'garlic powder', 'onion powder', 'oregano', 'basil', 'thyme'];
        if (spiceKeywords.some(spice => itemName.includes(spice))) {
            console.log(`[COVERAGE CHECK] ✅ Spice rule: Have spice, covers "to taste" need`);
            return inventoryQuantity >= 1;
        }
    }

    // Rule 4: Same units - direct comparison
    if (inventoryUnit !== 'item' && neededAmount && neededAmount.toLowerCase().includes(inventoryUnit)) {
        console.log(`[COVERAGE CHECK] Unit match: comparing ${neededNumber} needed vs ${inventoryQuantity} have`);
        return inventoryQuantity >= neededNumber;
    }

    // Rule 5: Small amounts - if we need 1-3 of something and have at least 1, probably OK
    if (neededNumber <= 3 && inventoryQuantity >= 1) {
        console.log(`[COVERAGE CHECK] ✅ Small amount rule: Need ${neededNumber}, have ${inventoryQuantity}`);
        return true;
    }

    // Rule 6: Default for "items" - if we have the item, assume it covers reasonable recipe needs
    if (inventoryUnit === 'item' && inventoryQuantity >= 1) {
        console.log(`[COVERAGE CHECK] ✅ Item rule: Have 1+ items of "${inventoryItem.name}"`);
        return true;
    }

    console.log(`[COVERAGE CHECK] ❌ No rule matched - need: ${neededNumber}, have: ${inventoryQuantity} ${inventoryUnit}`);
    return false;
}

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

        console.log(`[SHOPPING API] Found ${recipes.length} recipes for shopping list generation`);

        // Fetch user's inventory
        const userInventory = await UserInventory.findOne({
            userId: session.user.id
        });
        const inventory = userInventory ? userInventory.items : [];

        console.log(`[SHOPPING API] Found ${inventory.length} items in user inventory`);
        console.log(`[SHOPPING API] Inventory items:`, inventory.map(item => ({
            name: item.name,
            category: item.category || 'none'
        })));

        // Enhanced ingredient aggregation with improved combination logic
        const ingredientMap = new Map();

        recipes.forEach(recipe => {
            console.log(`[SHOPPING API] Processing recipe: ${recipe.title}`);

            if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
                console.log(`Recipe ${recipe.title} has no ingredients array`);
                return;
            }

            recipe.ingredients.forEach(ingredient => {
                const ingredientKey = createIngredientKey(ingredient.name);

                console.log(`[SHOPPING API] Processing ingredient: "${ingredient.name}" -> key: "${ingredientKey}"`);
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

                    console.log(`[SHOPPING API] Combined ingredient: ${existing.name} - ${existing.amount} ${existing.unit}`);
                } else {
                    const category = categorizeIngredient(ingredient.name);

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
                        variations: getIngredientVariations(ingredient.name),
                        ingredientKey: ingredientKey
                    });

                    console.log(`[SHOPPING API] New ingredient: ${ingredient.name} - ${finalAmount} ${finalUnit}`);
                }
            });
        });

        console.log(`[SHOPPING API] Aggregated ${ingredientMap.size} unique ingredients after combination`);

        // Enhanced inventory checking and categorization
        const shoppingListItems = [];
        const itemsByCategory = {};

        for (const [key, ingredient] of ingredientMap) {
            // Skip optional ingredients for now (could be a user preference later)
            if (ingredient.optional) {
                console.log(`[SHOPPING API] Skipping optional ingredient: ${ingredient.name}`);
                continue;
            }

            const inventoryMatch = findBestInventoryMatch(ingredient.name, inventory);
            const category = ingredient.category;

            // Normalize category name for display
            const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

            // Enhanced inventory coverage check
            const hasEnoughInInventory = inventoryMatch &&
                checkInventoryCoverage(ingredient.amount, inventoryMatch);

            // Create the display amount with unit
            let displayAmount = ingredient.amount || '';
            let displayUnit = ingredient.unit || '';

            if (displayUnit && displayAmount && !displayAmount.includes(displayUnit)) {
                // Only add unit if it's not already included in the amount
                if (displayAmount !== 'to taste') {
                    displayAmount = `${displayAmount} ${displayUnit}`.trim();
                    displayUnit = ''; // Clear unit since it's now in the amount
                }
            }

            const item = {
                name: ingredient.name,
                ingredient: ingredient.name,
                originalName: ingredient.originalName,
                amount: displayAmount, // Use display amount with unit
                unit: displayUnit,
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

        console.log(`[SHOPPING API] Generated shopping list with ${shoppingListItems.length} items across ${Object.keys(itemsByCategory).length} categories`);

        // Log specific inventory matches for debugging
        console.log(`[SHOPPING API] Inventory matching results:`);
        shoppingListItems.forEach(item => {
            if (item.inInventory) {
                console.log(`[SHOPPING API] ✅ "${item.name}" -> Found in inventory: "${item.inventoryItem.name}"`);
            } else {
                console.log(`[SHOPPING API] ❌ "${item.name}" -> Not found in inventory`);
            }
        });

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
                    variationsMatched: shoppingListItems.filter(item => item.variations.length > 1).length,
                    ingredientsCombined: summary.ingredientsCombined,
                    matchingStats: {
                        exactMatches: shoppingListItems.filter(item => item.inventoryItem).length,
                        noMatches: shoppingListItems.filter(item => !item.inventoryItem).length
                    }
                }
            }
        };

        console.log('[SHOPPING API] Enhanced shopping list generated successfully:', {
            totalItems: summary.totalItems,
            categories: summary.categories,
            source: response.shoppingList.source,
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