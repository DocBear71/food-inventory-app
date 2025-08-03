// file: /src/app/api/shopping/generate/route.js v42 - FIXED MongoDB connection issue

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { Recipe, UserInventory, MealPlan } from '@/lib/models';
import { CategoryUtils, suggestCategoryForItem, findBestCategoryMatch, getAllCategoryNames } from '@/lib/groceryCategories';

// UNIFIED: Use comprehensive ingredients matching from groceryCategories + enhanced variations
const NEVER_MATCH_INGREDIENTS = [
    // Only the most critical specialty items that should NEVER cross-match
    'tomato paste', 'tomato sauce', 'crushed tomatoes', 'diced tomatoes', 'tomato puree',
    'sun dried tomatoes', 'fire roasted tomatoes', 'whole tomatoes', 'stewed tomatoes',

    // Specialty flours (but allow basic flour matching)
    'almond flour', 'coconut flour', 'cake flour', 'bread flour', 'self rising flour',
    'whole wheat flour', 'gluten free flour', 'gluten-free flour', 'oat flour', 'rice flour',

    // Specialty sugars (but allow basic sugar matching)
    'powdered sugar', 'confectioners sugar', 'coconut sugar', 'maple sugar',
    'swerve', 'stevia', 'erythritol', 'monk fruit', 'xylitol', 'sugar substitute',

    // Alternative milks (but allow regular milk matching)
    'almond milk', 'oat milk', 'soy milk', 'coconut milk', 'rice milk', 'cashew milk',

    // Specialty dairy (but allow basic dairy matching)
    'buttermilk', 'heavy cream', 'half and half', 'cream cheese',

    // Vegan alternatives
    'vegan butter', 'vegan cheese', 'vegan milk', 'vegan bacon', 'vegan sausage',
    'vegan beef', 'vegan chicken', 'plant butter', 'plant milk', 'plant beef',

    // Specialty extracts and very specific seasonings
    'vanilla extract', 'almond extract'
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

// ENHANCED: Comprehensive ingredient variations incorporating groceryCategories knowledge
const INGREDIENT_VARIATIONS = {
    // Garlic variations
    'garlic': ['garlic cloves', 'garlic bulb', 'minced garlic', 'fresh garlic', 'chopped garlic', 'garlic minced'],
    'garlic cloves': ['garlic', 'fresh garlic', 'minced garlic', 'cloves garlic'],
    'minced garlic': ['garlic', 'garlic cloves', 'garlic minced'],

    // Onion variations
    'onion': ['onions', 'yellow onion', 'white onion', 'red onion', 'sweet onion', 'vidalia onion', 'onion chopped'],
    'onions': ['onion', 'yellow onion', 'white onion', 'sweet onion', 'onion chopped'],
    'yellow onion': ['onion', 'onions', 'white onion', 'sweet onion'],
    'red onion': ['onion', 'onions'],
    'sweet onion': ['onion', 'onions', 'yellow onion', 'vidalia onion'],

    // Green onions (separate from regular onions)
    'green onion': ['green onions', 'scallions', 'scallion', 'spring onions'],
    'green onions': ['green onion', 'scallions', 'scallion', 'spring onions'],
    'scallions': ['green onions', 'green onion', 'scallion', 'spring onions'],

    // Bell peppers
    'bell pepper': ['bell peppers', 'red bell pepper', 'green bell pepper', 'yellow bell pepper'],
    'red bell pepper': ['red bell peppers', 'red pepper'],
    'green bell pepper': ['green bell peppers', 'green pepper'],
    'yellow bell pepper': ['yellow bell peppers', 'yellow pepper'],

    // Hot peppers
    'jalapeno': ['jalapeños', 'jalapenos', 'jalapeño'],
    'serrano': ['serranos', 'serrano pepper', 'serrano peppers'],
    'poblano': ['poblanos', 'poblano pepper', 'poblano peppers'],

    // Tomatoes - KEEP SEPARATE TYPES
    'tomatoes': ['fresh tomatoes', 'whole tomatoes', 'ripe tomatoes'],
    'fresh tomatoes': ['tomatoes', 'whole tomatoes', 'ripe tomatoes'],
    'whole tomatoes': ['fresh tomatoes', 'tomatoes', 'ripe tomatoes'],
    'cherry tomatoes': ['grape tomatoes', 'small tomatoes'],
    'roma tomatoes': ['plum tomatoes', 'paste tomatoes'],

    // Processed tomato products (separate from fresh)
    'tomato paste': ['concentrated tomato paste', 'double concentrated tomato paste'],
    'tomato sauce': ['marinara sauce', 'basic tomato sauce'],
    'crushed tomatoes': ['crushed canned tomatoes'],
    'diced tomatoes': ['diced canned tomatoes', 'chopped tomatoes'],

    // Mushrooms
    'mushroom': ['mushrooms', 'button mushrooms', 'cremini mushrooms'],
    'mushrooms': ['mushroom', 'button mushrooms', 'cremini mushrooms'],
    'shiitake': ['shiitake mushrooms'],
    'portobello': ['portobello mushrooms'],

    // Chicken variations
    'chicken': ['chicken breast', 'chicken thighs', 'chicken legs', 'chicken wings', 'whole chicken'],
    'chicken breast': ['chicken breasts', 'boneless chicken breast', 'skinless chicken breast'],
    'chicken thighs': ['chicken thigh', 'boneless chicken thighs'],

    // Beef variations
    'ground beef': ['ground chuck', 'ground sirloin', 'lean ground beef', 'extra lean ground beef'],
    'beef sirloin': ['sirloin steak', 'beef sirloin steak', 'sirloin'],
    'steak': ['beef steak', 'steaks'],

    // Sausage variations
    'italian sausage': ['italian turkey sausage', 'sweet italian sausage', 'spicy italian sausage'],

    // Cheese variations
    'mozzarella': ['mozzarella cheese', 'fresh mozzarella', 'part skim mozzarella'],
    'shredded mozzarella': ['shredded mozzarella cheese', 'grated mozzarella'],
    'cheddar': ['cheddar cheese', 'sharp cheddar', 'mild cheddar', 'aged cheddar'],
    'shredded cheddar': ['shredded cheddar cheese', 'grated cheddar'],
    'parmesan': ['parmigiano-reggiano', 'parmesan cheese', 'grated parmesan'],

    // Egg variations
    'eggs': ['large eggs', 'extra large eggs', 'jumbo eggs', 'medium eggs', 'small eggs'],
    'egg': ['eggs', 'large egg', 'extra large egg', 'jumbo egg', 'medium egg', 'small egg'],

    // COMPREHENSIVE pasta variations (unified from groceryCategories)
    'pasta': [
        'spaghetti', 'penne', 'fusilli', 'rigatoni', 'linguine', 'fettuccine', 'angel hair',
        'penne pasta', 'spaghetti pasta', 'fusilli pasta', 'rigatoni pasta', 'linguine pasta',
        'fettuccine pasta', 'angel hair pasta', 'bow tie pasta', 'rotini pasta', 'macaroni',
        'macaroni pasta', 'shells', 'shell pasta', 'farfalle', 'gemelli', 'orzo',
        'pappardelle', 'tagliatelle', 'bucatini', 'cavatappi', 'ziti'
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

    // Rice variations
    'rice': ['white rice', 'brown rice', 'jasmine rice', 'basmati rice', 'wild rice'],
    'white rice': ['rice', 'long grain rice'],
    'brown rice': ['rice', 'whole grain rice'],
    'jasmine rice': ['rice', 'fragrant rice'],
    'basmati rice': ['rice', 'long grain rice'],

    // Oil variations
    'olive oil': ['extra virgin olive oil', 'virgin olive oil', 'light olive oil'],
    'vegetable oil': ['canola oil', 'sunflower oil', 'corn oil'],

    // Flour variations
    'flour': ['all purpose flour', 'all-purpose flour', 'plain flour', 'white flour'],
    'all purpose flour': ['flour', 'all-purpose flour', 'plain flour'],

    // Sugar variations
    'sugar': ['white sugar', 'granulated sugar', 'cane sugar', 'pure cane sugar'],
    'brown sugar': ['light brown sugar', 'dark brown sugar', 'packed brown sugar'],

    // Butter and dairy
    'butter': ['unsalted butter', 'salted butter', 'sweet cream butter'],
    'milk': ['whole milk', '2% milk', '1% milk', 'skim milk', 'vitamin d milk'],

    // Salt and pepper
    'salt': ['table salt', 'sea salt', 'kosher salt', 'fine salt'],
    'pepper': ['black pepper', 'ground pepper', 'cracked pepper'],
    'black pepper': ['pepper', 'ground black pepper'],

    // International ingredients
    'soy sauce': ['light soy sauce', 'dark soy sauce', 'tamari'],
    'sesame oil': ['toasted sesame oil', 'pure sesame oil'],
    'rice vinegar': ['rice wine vinegar', 'seasoned rice vinegar'],

    // Mexican ingredients
    'tortillas': ['flour tortillas', 'corn tortillas'],
    'salsa': ['chunky salsa', 'smooth salsa', 'mild salsa', 'hot salsa'],
    'cilantro': ['fresh cilantro', 'cilantro leaves'],

    // Herbs and spices
    'oregano': ['fresh oregano', 'dried oregano'],
    'basil': ['fresh basil', 'dried basil'],
    'thyme': ['fresh thyme', 'dried thyme'],
    'rosemary': ['fresh rosemary', 'dried rosemary'],
    'parsley': ['fresh parsley', 'dried parsley', 'flat leaf parsley', 'curly parsley'],

    // Other common ingredients
    'sesame seeds': ['toasted sesame seeds', 'white sesame seeds'],
    'white wine': ['dry white wine', 'cooking wine', 'white cooking wine'],
    'red pepper flakes': ['crushed red pepper', 'red chili flakes'],
    'chives': ['fresh chives', 'chopped chives'],
    'bread crumbs': ['fresh bread crumbs', 'italian bread crumbs', 'panko bread crumbs', 'panko']
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

    console.log(`[SHOPPING API] Checking match: "${recipeIngredient}" (${recipeNorm}) vs "${inventoryIngredient}" (${inventoryNorm})`);

    // Exact match
    if (recipeNorm === inventoryNorm) {
        console.log(`[SHOPPING API] ✅ EXACT MATCH`);
        return true;
    }

    // Check NEVER_CROSS_MATCH rules FIRST
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

    // Check if either is a specialty ingredient
    if (isSpecialtyIngredient(recipeIngredient) || isSpecialtyIngredient(inventoryIngredient)) {
        const recipeVariations = getIngredientVariations(recipeIngredient);
        const inventoryVariations = getIngredientVariations(inventoryIngredient);

        for (const recipeVar of recipeVariations) {
            for (const invVar of inventoryVariations) {
                if (recipeVar === invVar) {
                    console.log(`[SHOPPING API] ✅ SPECIALTY VARIATION MATCH: ${recipeVar}`);
                    return true;
                }
            }
        }
        console.log(`[SHOPPING API] ❌ SPECIALTY INGREDIENT - no variation match`);
        return false;
    }

    // Check ingredient variations
    const recipeVariations = getIngredientVariations(recipeIngredient);
    const inventoryVariations = getIngredientVariations(inventoryIngredient);

    for (const recipeVar of recipeVariations) {
        for (const invVar of inventoryVariations) {
            if (recipeVar === invVar) {
                console.log(`[SHOPPING API] ✅ VARIATION MATCH: ${recipeVar}`);
                return true;
            }
        }
    }

    // Relaxed partial matching for common ingredients
    if (recipeNorm.length >= 4 && inventoryNorm.length >= 4) {
        if (recipeNorm.includes(inventoryNorm) || inventoryNorm.includes(recipeNorm)) {
            const shorterLength = Math.min(recipeNorm.length, inventoryNorm.length);
            const longerLength = Math.max(recipeNorm.length, inventoryNorm.length);
            const similarity = shorterLength / longerLength;

            if (similarity >= 0.7) {
                console.log(`[SHOPPING API] ✅ PARTIAL MATCH: similarity ${similarity.toFixed(2)}`);
                return true;
            }
        }
    }

    console.log(`[SHOPPING API] ❌ NO MATCH`);
    return false;
}

// Get all variations of an ingredient
function getIngredientVariations(ingredient) {
    const normalized = normalizeIngredient(ingredient);

    if (isSpecialtyIngredient(ingredient)) {
        return [normalized, ingredient.toLowerCase().trim()];
    }

    const variations = new Set([normalized]);
    variations.add(ingredient.toLowerCase().trim());

    if (INGREDIENT_VARIATIONS[normalized]) {
        INGREDIENT_VARIATIONS[normalized].forEach(variation => {
            variations.add(normalizeIngredient(variation));
        });
    }

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

// Enhanced inventory matching
function findBestInventoryMatch(ingredient, inventory) {
    if (!inventory || inventory.length === 0) return null;

    const normalizedIngredient = normalizeIngredient(ingredient);

    console.log(`[SHOPPING API] Looking for inventory match for: "${ingredient}" (normalized: "${normalizedIngredient}")`);

    // 1. EXACT MATCH
    for (const item of inventory) {
        const itemName = normalizeIngredient(item.name);
        if (itemName === normalizedIngredient && normalizedIngredient.length > 2) {
            console.log(`[SHOPPING API] ✅ EXACT MATCH: "${item.name}"`);
            return item;
        }
    }

    // 2. INTELLIGENT MATCHING
    for (const item of inventory) {
        if (canIngredientsMatch(ingredient, item.name)) {
            console.log(`[SHOPPING API] ✅ INTELLIGENT MATCH: "${item.name}" matches "${ingredient}"`);
            return item;
        }
    }

    // 3. FALLBACK PARTIAL MATCHING
    for (const item of inventory) {
        const itemName = normalizeIngredient(item.name);

        if (normalizedIngredient.length >= 4 && itemName.length >= 4) {
            if (itemName.includes(normalizedIngredient) || normalizedIngredient.includes(itemName)) {
                const shorterLength = Math.min(itemName.length, normalizedIngredient.length);
                const longerLength = Math.max(itemName.length, normalizedIngredient.length);
                const similarity = shorterLength / longerLength;

                if (similarity >= 0.75) {
                    console.log(`[SHOPPING API] ✅ FALLBACK PARTIAL MATCH: "${item.name}" similarity ${similarity.toFixed(2)}`);
                    return item;
                }
            }
        }
    }

    console.log(`[SHOPPING API] ❌ NO MATCH found for: "${ingredient}"`);
    return null;
}

// UNIFIED: Use groceryCategories for ingredient keys
function createIngredientKey(ingredient) {
    // Use the same normalization function from groceryCategories
    const normalized = normalizeIngredientForCategorization(ingredient);

    // Remove common descriptors (this logic can be simplified now)
    const cleaned = normalized
        .replace(/\b(of|the|and|or|into|cut|for|with|from|about)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    console.log(`[INGREDIENT KEY] "${ingredient}" -> "${cleaned}"`);

    // ENHANCED: Use groceryCategories knowledge for better grouping
    // Pasta normalization
    if (/\b(pasta|spaghetti|penne|fettuccine|fusilli|rigatoni|linguine|angel hair|bow tie|farfalle|macaroni|shells|rotini|gemelli|orzo|pappardelle|tagliatelle|bucatini|cavatappi|ziti|lasagna|ravioli|tortellini|gnocchi)\b/i.test(cleaned)) {
        return 'pasta';
    }

    // Specific ingredient grouping for better combination
    if (cleaned.includes('red bell pepper')) return 'red-bell-pepper';
    if (cleaned.includes('green bell pepper')) return 'green-bell-pepper';
    if (cleaned.includes('bell pepper') && !cleaned.includes('red') && !cleaned.includes('green')) return 'bell-pepper';
    if (cleaned.includes('green onion') || cleaned.includes('scallion')) return 'green-onion';
    if (cleaned.includes('red pepper flakes')) return 'red-pepper-flakes';
    if (cleaned.includes('garlic')) return 'garlic';
    if (cleaned.includes('onion') && !cleaned.includes('green') && !cleaned.includes('red')) return 'onion';

    // CRITICAL: Keep tomato products separate (from groceryCategories knowledge)
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

    // Cheese variations
    if (cleaned.includes('shredded mozzarella')) return 'shredded-mozzarella';
    if (cleaned.includes('mozzarella') && !cleaned.includes('shredded')) return 'mozzarella';
    if (cleaned.includes('cheddar')) return 'cheddar';
    if (cleaned.includes('parmesan')) return 'parmesan';

    // Oil variations
    if (cleaned.includes('sesame oil')) return 'sesame-oil';
    if (cleaned.includes('olive oil')) return 'olive-oil';
    if (cleaned.includes('vegetable oil')) return 'vegetable-oil';
    if (cleaned.includes('coconut oil')) return 'coconut-oil';

    // Asian ingredients
    if (cleaned.includes('soy sauce')) return 'soy-sauce';
    if (cleaned.includes('rice vinegar')) return 'rice-vinegar';
    if (cleaned.includes('sesame seeds')) return 'sesame-seeds';

    // Mexican ingredients
    if (cleaned.includes('enchilada sauce')) return 'enchilada-sauce';
    if (cleaned.includes('salsa')) return 'salsa';
    if (cleaned.includes('cilantro')) return 'cilantro';

    // Common ingredients
    if (cleaned.includes('white wine')) return 'white-wine';
    if (cleaned.includes('italian sausage')) return 'italian-sausage';
    if (cleaned.includes('chicken breast')) return 'chicken-breast';
    if (cleaned.includes('ground beef')) return 'ground-beef';
    if (cleaned.includes('beef sirloin')) return 'beef-sirloin';
    if (cleaned.includes('salt') && cleaned.includes('pepper')) return 'salt-and-pepper';
    if (cleaned.includes('salt') && !cleaned.includes('pepper')) return 'salt';
    if (cleaned.includes('pepper') && !cleaned.includes('salt') && !cleaned.includes('bell')) return 'pepper';
    if (cleaned.includes('cornstarch') || cleaned.includes('corn starch')) return 'cornstarch';

    return cleaned;
}

// Parse amount and unit from ingredient amount string
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

// Smart combination of ingredient amounts
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

// UNIFIED: Use groceryCategories categorization system with enhanced preprocessing
function categorizeIngredient(ingredientName) {
    if (!ingredientName || typeof ingredientName !== 'string') {
        return 'Other';
    }

    console.log(`[CATEGORIZATION] Input ingredient: "${ingredientName}"`);

    // Use the enhanced category suggestion system from groceryCategories
    const category = findBestCategoryMatch(ingredientName, 'Other');

    console.log(`[CATEGORIZATION] "${ingredientName}" -> "${category}"`);

    return category;
}

// Check if inventory covers the needed amount
function checkInventoryCoverage(neededAmount, inventoryItem, packageInfo) {
    if (!inventoryItem) return false;

    const neededAmountStr = neededAmount ? String(neededAmount) : '';
    const neededMatch = neededAmountStr.match(/(\d+(?:\.\d+)?)/);
    const neededNumber = neededMatch ? parseFloat(neededMatch[1]) : 1;
    const inventoryQuantity = inventoryItem.quantity || 1;
    const inventoryUnit = (inventoryItem.unit || 'item').toLowerCase();

    console.log(`[COVERAGE CHECK] Need: "${neededAmountStr}", Have: ${inventoryQuantity} ${inventoryUnit}, Item: "${inventoryItem.name}"`);

    const itemName = normalizeIngredient(inventoryItem.name);

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

// FIXED: Function to extract recipe IDs from meal plan - now properly awaits DB connection
async function getRecipeIdsFromMealPlan(mealPlanId) {
    try {
        // Ensure DB connection is established
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

        // FIXED: Establish DB connection BEFORE any database operations
        await connectDB();

        let recipeIds = providedRecipeIds;

        if (mealPlanId) {
            console.log('Processing meal plan:', mealPlanId);
            try {
                // DB connection is already established above
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

        // Enhanced ingredient aggregation with unified categorization
        const ingredientMap = new Map();

        recipes.forEach((recipe, recipeIndex) => {
            console.log(`[SHOPPING API] Processing recipe ${recipeIndex + 1}/${recipes.length}: ${recipe.title}`);

            if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
                console.log(`[SHOPPING API] Recipe ${recipe.title} has no ingredients array`);
                return;
            }

            recipe.ingredients.forEach((ingredient, ingredientIndex) => {
                try {
                    if (!ingredient || typeof ingredient !== 'object') {
                        console.log(`[SHOPPING API] Invalid ingredient at index ${ingredientIndex} in recipe ${recipe.title}:`, ingredient);
                        return;
                    }

                    if (!ingredient.name || typeof ingredient.name !== 'string') {
                        console.log(`[SHOPPING API] Ingredient missing name at index ${ingredientIndex} in recipe ${recipe.title}:`, ingredient);
                        return;
                    }

                    const ingredientKey = createIngredientKey(ingredient.name);

                    console.log(`[SHOPPING API] Processing ingredient: "${ingredient.name}" -> key: "${ingredientKey}"`);

                    let safeAmount = '';
                    if (ingredient.amount !== null && ingredient.amount !== undefined) {
                        safeAmount = String(ingredient.amount);
                    }

                    let safeUnit = '';
                    if (ingredient.unit && typeof ingredient.unit === 'string') {
                        safeUnit = ingredient.unit;
                    }

                    console.log(`Amount: "${safeAmount}", Unit: "${safeUnit}"`);

                    if (ingredientMap.has(ingredientKey)) {
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

                        if (ingredient.name.length > existing.name.length) {
                            existing.name = ingredient.name;
                            existing.originalName = ingredient.name;
                        }

                        console.log(`[SHOPPING API] Combined ingredient: ${existing.name} - ${existing.amount} ${existing.unit}`);
                    } else {
                        // UNIFIED: Use groceryCategories categorization
                        const category = categorizeIngredient(ingredient.name);

                        ingredientMap.set(ingredientKey, {
                            name: ingredient.name,
                            originalName: ingredient.name,
                            normalizedName: normalizeIngredient(ingredient.name),
                            amount: safeAmount,
                            unit: safeUnit,
                            category: category,
                            recipes: [recipe.title],
                            optional: ingredient.optional || false,
                            alternatives: ingredient.alternatives || [],
                            variations: getIngredientVariations(ingredient.name),
                            ingredientKey: ingredientKey
                        });

                        console.log(`[SHOPPING API] New ingredient: ${ingredient.name} - ${safeAmount} ${safeUnit} -> ${category}`);
                    }
                } catch (ingredientError) {
                    console.error(`[SHOPPING API] Error processing ingredient ${ingredientIndex} in recipe ${recipe.title}:`, ingredientError);
                    console.error(`[SHOPPING API] Ingredient data:`, ingredient);
                }
            });
        });

        console.log(`[SHOPPING API] Aggregated ${ingredientMap.size} unique ingredients after combination`);

        // Enhanced inventory checking and categorization using unified system
        const shoppingListItems = [];
        const itemsByCategory = {};

        for (const [key, ingredient] of ingredientMap) {
            if (ingredient.optional) {
                console.log(`[SHOPPING API] Skipping optional ingredient: ${ingredient.name}`);
                continue;
            }

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
                category: category, // Using unified categorization
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

            // Group by unified category
            if (!itemsByCategory[category]) {
                itemsByCategory[category] = [];
            }
            itemsByCategory[category].push(item);
        }

        console.log(`[SHOPPING API] Generated shopping list with ${shoppingListItems.length} items across ${Object.keys(itemsByCategory).length} categories`);
        console.log(`[SHOPPING API] Categories used:`, Object.keys(itemsByCategory));

        // Validate all categories exist in our unified system
        const invalidCategories = Object.keys(itemsByCategory).filter(cat => !CategoryUtils.isValidCategory(cat));
        if (invalidCategories.length > 0) {
            console.warn(`[SHOPPING API] Invalid categories found:`, invalidCategories);
        }

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

        // Enhanced shopping list response with unified categorization metadata
        const response = {
            success: true,
            shoppingList: {
                items: itemsByCategory, // Categorized using unified system
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
                    matchingStats: {
                        exactMatches: shoppingListItems.filter(item => item.inventoryItem).length,
                        noMatches: shoppingListItems.filter(item => !item.inventoryItem).length
                    }
                }
            }
        };

        console.log('[SHOPPING API] Enhanced shopping list generated successfully with unified categorization:', {
            totalItems: summary.totalItems,
            categories: summary.categories,
            source: response.shoppingList.source,
            categorizationSystem: response.shoppingList.metadata.categorizationSystem,
            variationsMatched: response.shoppingList.metadata.variationsMatched,
            ingredientsCombined: summary.ingredientsCombined,
            exactMatches: response.shoppingList.metadata.matchingStats.exactMatches
        });

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error generating shopping list with unified categorization:', error);
        return NextResponse.json({
            error: 'Failed to generate shopping list',
            details: error.message
        }, { status: 500 });
    }
}