// file: /src/lib/utils/ingredientMatching.js
// Shared ingredient matching utilities for consistent logic across the app

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

    // Tomato products - NEVER cross-match
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

    // Tomato product cross-matching prevention
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

const INTELLIGENT_SUBSTITUTIONS = {
    'garlic cloves': {
        canSubstituteWith: ['minced garlic', 'garlic', 'chopped garlic', 'garlic jar'],
        conversionNote: '1 clove ≈ 1 tsp minced garlic'
    },
    'garlic cloves minced': {
        canSubstituteWith: ['minced garlic', 'garlic', 'garlic cloves'],
        conversionNote: '1 clove ≈ 1 tsp minced garlic'
    },
    'minced garlic': {
        canSubstituteWith: ['garlic cloves', 'garlic', 'fresh garlic'],
        conversionNote: '1 tsp ≈ 1 clove fresh garlic'
    },
    'bread': {
        canSubstituteWith: [
            'sandwich bread', 'wheat bread', 'white bread', 'sandwich wheat bread',
            'honey wheat bread', 'texas toast', 'sourdough bread', 'rye bread'
        ],
        conversionNote: 'Any bread type works for generic bread'
    },
    'ground hamburger': {
        canSubstituteWith: ['ground beef', 'hamburger', 'ground chuck', 'lean ground beef'],
        conversionNote: 'Ground hamburger is the same as ground beef'
    },
    'hamburger': {
        canSubstituteWith: ['ground beef', 'ground hamburger', 'ground chuck'],
        conversionNote: 'Hamburger meat is ground beef'
    }
};

const INGREDIENT_VARIATIONS = {
    // WATER
    'water': ['tap water', 'filtered water', 'cold water', 'warm water', 'hot water', 'boiling water'],
    'hot water': ['water', 'warm water', 'boiling water'],

    // EGGS
    'eggs': [
        'egg', 'large eggs', 'extra large eggs', 'jumbo eggs', 'medium eggs',
        'fresh eggs', 'whole eggs', 'brown eggs', 'white eggs'
    ],
    'egg': ['eggs', 'large egg', 'extra large egg', 'fresh egg', 'whole egg'],

    // FLOUR - Basic flour only
    'flour': [
        'all purpose flour', 'all-purpose flour', 'plain flour', 'white flour',
        'unbleached flour', 'bleached flour', 'enriched flour', 'wheat flour',
        'ap flour', 'general purpose flour'
    ],

    // SUGAR - White sugar only
    'sugar': [
        'white sugar', 'granulated sugar', 'cane sugar', 'pure cane sugar',
        'granulated white sugar', 'table sugar', 'regular sugar'
    ],

    // MILK
    'milk': [
        'whole milk', '2% milk', '1% milk', 'skim milk', 'vitamin d milk',
        'reduced fat milk', 'low fat milk', 'fresh milk', 'dairy milk'
    ],

    // BUTTER
    'butter': [
        'unsalted butter', 'salted butter', 'sweet cream butter', 'dairy butter',
        'real butter', 'churned butter'
    ],

    // GARLIC
    'garlic': [
        'garlic cloves', 'garlic bulb', 'minced garlic', 'fresh garlic',
        'chopped garlic', 'whole garlic', 'garlic head'
    ],
    'garlic cloves': ['garlic', 'fresh garlic', 'minced garlic'],
    'minced garlic': ['garlic', 'garlic cloves'],

    // ONION
    'onion': [
        'onions', 'yellow onion', 'white onion', 'sweet onion', 'cooking onion',
        'spanish onion', 'diced onion'
    ],
    'onions': ['onion', 'yellow onion', 'white onion', 'sweet onion'],

    // GROUND BEEF/HAMBURGER
    'ground beef': [
        'beef', 'hamburger', 'ground chuck', 'lean ground beef', 'ground hamburger',
        'extra lean ground beef'
    ],
    'hamburger': ['ground beef', 'ground hamburger', 'beef', 'ground chuck'],

    // BREAD
    'bread': [
        'sandwich bread', 'wheat bread', 'white bread', 'sandwich wheat bread',
        'honey wheat bread', 'texas toast', 'sourdough bread', 'sliced bread'
    ],

    // TOMATOES - Keep specific types separate
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
    'diced tomatoes': ['diced canned tomatoes', 'chopped tomatoes']
};

export function normalizeIngredientName(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }

    return name
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

export function extractIngredientName(ingredientString) {
    if (!ingredientString || typeof ingredientString !== 'string') {
        return '';
    }

    const nameString = ingredientString.name || ingredientString;
    let cleaned = nameString.replace(/\([^)]*\)/g, '');

    // Remove leading count numbers
    cleaned = cleaned.replace(/^\d+\s+/, '');

    // Remove measurements aggressively
    cleaned = cleaned
        .replace(/\d+\s*[½¼¾]/g, '')
        .replace(/[½¼¾]/g, '')
        .replace(/\d*\.\d+/g, '')
        .replace(/\b\d+\b/g, '')
        .replace(/\b(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|ml|liters?|l|grams?|g|kg|kilograms?|pt\.?|pints?|qt|quarts?|gal|gallons?|fl\.?\s*oz|fluid\s*ounces?)\b/gi, '')
        .replace(/\b(beaten|melted|softened|minced|chopped|sliced|diced|crushed|grated|shredded|packed|cold|hot|warm|uncooked|cooked|finely)\b/gi, '')
        .replace(/\b(optional|to\s+taste|dash|pinch)\b/gi, '')
        .replace(/^\s*(adds?\s+richness\s+and\s+color|about)\s*/gi, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return cleaned;
}

export function isSpecialtyIngredient(ingredient) {
    const normalized = normalizeIngredientName(ingredient);
    return NEVER_MATCH_INGREDIENTS.some(specialty => {
        const specialtyNorm = normalizeIngredientName(specialty);
        return normalized === specialtyNorm || normalized.includes(specialtyNorm);
    });
}

export function canIngredientsMatch(recipeIngredient, inventoryIngredient) {
    const recipeNorm = normalizeIngredientName(recipeIngredient);
    const inventoryNorm = normalizeIngredientName(inventoryIngredient);

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
        const ingredientNorm = normalizeIngredientName(ingredient);

        if (recipeNorm === ingredientNorm || recipeNorm.includes(ingredientNorm)) {
            if (blockedMatches.some(blocked => {
                const blockedNorm = normalizeIngredientName(blocked);
                return inventoryNorm === blockedNorm || inventoryNorm.includes(blockedNorm);
            })) {
                return false;
            }
        }

        if (inventoryNorm === ingredientNorm || inventoryNorm.includes(ingredientNorm)) {
            if (blockedMatches.some(blocked => {
                const blockedNorm = normalizeIngredientName(blocked);
                return recipeNorm === blockedNorm || recipeNorm.includes(blockedNorm);
            })) {
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

export function getIngredientVariations(ingredient) {
    const normalized = normalizeIngredientName(ingredient);

    // If it's a specialty ingredient, only return itself for exact matching
    if (isSpecialtyIngredient(ingredient)) {
        return [normalized, ingredient.toLowerCase().trim()];
    }

    const variations = new Set([normalized]);
    variations.add(ingredient.toLowerCase().trim());

    // Check if this ingredient has defined variations
    if (INGREDIENT_VARIATIONS[normalized]) {
        INGREDIENT_VARIATIONS[normalized].forEach(variation => {
            variations.add(normalizeIngredientName(variation));
        });
    }

    // Check if this ingredient is a variation of something else
    for (const [base, variationList] of Object.entries(INGREDIENT_VARIATIONS)) {
        const normalizedVariations = variationList.map(v => normalizeIngredientName(v));
        if (normalizedVariations.includes(normalized)) {
            variations.add(base);
            normalizedVariations.forEach(v => variations.add(v));
            break;
        }
    }

    return Array.from(variations);
}

export function findBestInventoryMatch(recipeIngredient, inventoryItems) {
    const recipeNorm = normalizeIngredientName(recipeIngredient);

    // First, try exact matches
    const exactMatches = inventoryItems.filter(item => {
        const itemNorm = normalizeIngredientName(item.name);
        return itemNorm === recipeNorm;
    });

    if (exactMatches.length > 0) {
        return exactMatches[0];
    }

    // Then try intelligent matching
    const compatibleItems = inventoryItems.filter(item =>
        canIngredientsMatch(recipeIngredient, item.name)
    );

    if (compatibleItems.length > 0) {
        // Prefer items with higher quantity available
        return compatibleItems.sort((a, b) => (b.quantity || 0) - (a.quantity || 0))[0];
    }

    return null;
}

// Export constants for use in other files
export {
    NEVER_MATCH_INGREDIENTS,
    NEVER_CROSS_MATCH,
    INTELLIGENT_SUBSTITUTIONS,
    INGREDIENT_VARIATIONS
};