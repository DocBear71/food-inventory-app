// UPDATED /src/lib/utils/ingredientMatching.js
// This becomes the SINGLE SOURCE OF TRUTH for all ingredient matching logic

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
    'fresh tomatoes': ['tomato paste', 'tomato sauce', 'crushed tomatoes', 'diced tomatoes'],

    // BEEF CUTS - Prevent inappropriate cross-matching
    'cube steaks': ['ground beef', 'steak', 'roast'],
    'cubed steaks': ['ground beef', 'steak', 'roast'],
    'ground beef': ['cube steaks', 'cubed steaks', 'steak', 'roast'],
    'ribeye steak': ['ground beef', 'chuck roast', 'round steak'],
    'strip steak': ['ground beef', 'chuck roast', 'round steak'],
    'sirloin steak': ['ground beef', 'chuck roast'],
    'chuck roast': ['steak', 'ground beef'],
    'brisket': ['steak', 'ground beef', 'roast'],
    'short ribs': ['steak', 'ground beef'],
    'stew meat': ['steak', 'roast'],

    // PORK CUTS - Prevent inappropriate cross-matching
    'pork shoulder': ['pork chops', 'pork tenderloin', 'ground pork', 'bacon'],
    'boston butt': ['pork chops', 'pork tenderloin', 'ground pork', 'bacon'],
    'pork chops': ['ground pork', 'pork shoulder', 'pork belly', 'bacon'],
    'pork tenderloin': ['ground pork', 'pork shoulder', 'pork chops', 'bacon'],
    'ground pork': ['pork chops', 'pork tenderloin', 'pork shoulder', 'bacon'],
    'pork belly': ['pork chops', 'pork tenderloin', 'ground pork'],
    'bacon': ['pork chops', 'pork tenderloin', 'ground pork', 'pork shoulder'],
    'italian sausage': ['ground pork', 'pork chops', 'pork tenderloin'],
    'baby back ribs': ['spare ribs', 'pork chops', 'ground pork'],
    'spare ribs': ['baby back ribs', 'pork chops', 'ground pork'],

    // POULTRY CUTS - Prevent inappropriate cross-matching
    'chicken breast': ['ground chicken', 'chicken thighs', 'chicken wings', 'chicken legs'],
    'chicken thighs': ['chicken breast', 'ground chicken', 'chicken wings'],
    'chicken legs': ['chicken breast', 'chicken thighs', 'ground chicken', 'chicken wings'],
    'chicken wings': ['chicken breast', 'chicken thighs', 'chicken legs', 'ground chicken'],
    'ground chicken': ['chicken breast', 'chicken thighs', 'chicken legs', 'chicken wings'],
    'whole chicken': ['chicken breast', 'chicken thighs', 'ground chicken'],
    'turkey breast': ['ground turkey', 'turkey thighs', 'turkey legs'],
    'ground turkey': ['turkey breast', 'turkey thighs', 'turkey legs', 'whole turkey'],
    'whole turkey': ['turkey breast', 'ground turkey'],

    // CROSS-SPECIES PREVENTION
    'pork': ['chicken', 'turkey', 'beef', 'duck'],
    'chicken': ['pork', 'beef', 'turkey', 'duck'],
    'turkey': ['chicken', 'pork', 'beef', 'duck'],
    'beef': ['pork', 'chicken', 'turkey', 'duck'],
    'duck': ['chicken', 'turkey', 'pork', 'beef']
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
    },

    // ENHANCED: Add meat cut substitutions
    'cube steaks': {
        canSubstituteWith: ['cubed steaks', 'minute steaks', 'swiss steaks', 'tenderized steaks'],
        conversionNote: 'All are mechanically tenderized steaks - same cooking method'
    },
    'ground beef': {
        canSubstituteWith: ['ground chuck', 'ground round', 'ground sirloin', 'lean ground beef'],
        conversionNote: 'Ground chuck (80/20), round (85/15), sirloin (90/10) - adjust for fat content'
    },
    'chicken breast': {
        canSubstituteWith: ['boneless chicken breast', 'boneless skinless chicken breast', 'chicken breast fillets'],
        conversionNote: 'Boneless cuts cook faster - adjust cooking time'
    },
    'pork chops': {
        canSubstituteWith: ['center cut pork chops', 'loin chops', 'rib chops', 'boneless pork chops'],
        conversionNote: 'Bone-in vs boneless affects cooking time'
    },
    'italian sausage': {
        canSubstituteWith: ['sweet italian sausage', 'hot italian sausage', 'mild italian sausage'],
        conversionNote: 'Adjust spice level - sweet/mild vs hot/spicy'
    },

    // ENHANCED: Add baking substitutions
    'all purpose flour': {
        canSubstituteWith: ['plain flour', 'white flour', 'unbleached flour'],
        conversionNote: 'Standard 1:1 substitution for basic flour'
    },
    'whole milk': {
        canSubstituteWith: ['2% milk', '1% milk', 'skim milk'],
        conversionNote: 'Lower fat content may affect richness in baking'
    },
    'unsalted butter': {
        canSubstituteWith: ['salted butter', 'sweet cream butter'],
        conversionNote: 'If using salted butter, reduce salt in recipe by 1/4 tsp per stick'
    },

    // ENHANCED: Add cooking substitutions
    'vegetable oil': {
        canSubstituteWith: ['canola oil', 'sunflower oil', 'corn oil', 'safflower oil'],
        conversionNote: 'Neutral flavor oils - 1:1 substitution'
    },
    'olive oil': {
        canSubstituteWith: ['extra virgin olive oil', 'light olive oil', 'virgin olive oil'],
        conversionNote: 'Extra virgin has stronger flavor - use less for subtle dishes'
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
    'diced tomatoes': ['diced canned tomatoes', 'chopped tomatoes'],

    // ==========================================
    // COMPREHENSIVE BEEF CUTS
    // ==========================================

    // FOREQUARTER - Chuck
    'chuck roast': ['chuck pot roast', 'chuck arm roast', 'chuck blade roast', 'shoulder roast', 'chuck shoulder roast', 'pot roast'],
    'chuck steak': ['chuck blade steak', 'chuck arm steak', 'shoulder steak', 'chuck eye steak', 'chuck steaks'],
    'chuck eye steak': ['chuck steak', 'chuck eye', 'mock tender steak'],
    'ground chuck': ['ground beef chuck', 'chuck ground beef', '80/20 ground beef'],

    // FOREQUARTER - Rib
    'prime rib': ['standing rib roast', 'prime rib roast', 'rib roast'],
    'rib eye steak': ['ribeye steak', 'ribeye', 'rib eye', 'delmonico steak', 'spencer steak'],
    'ribeye steak': ['rib eye steak', 'ribeye', 'rib eye', 'delmonico steak'],
    'ribeye': ['rib eye steak', 'ribeye steak', 'rib eye'],
    'short ribs': ['beef short ribs', 'braising ribs', 'chuck short ribs', 'plate ribs'],

    // SPECIALTY CUTS - Cube/Mechanically Tenderized (MOST IMPORTANT FOR YOUR ISSUE)
    'cube steaks': ['cubed steaks', 'cube steak', 'cubed steak', 'minute steaks', 'swiss steaks', 'minute steak'],
    'cubed steaks': ['cube steaks', 'cube steak', 'cubed steak', 'minute steaks', 'swiss steaks'],
    'cube steak': ['cubed steak', 'cube steaks', 'cubed steaks', 'minute steak', 'swiss steak'],
    'cubed steak': ['cube steak', 'cube steaks', 'cubed steaks', 'minute steak'],
    'minute steaks': ['cube steaks', 'cubed steaks', 'minute steak', 'swiss steaks'],
    'minute steak': ['minute steaks', 'cube steak', 'cubed steak'],
    'swiss steaks': ['cube steaks', 'cubed steaks', 'swiss steak'],
    'swiss steak': ['swiss steaks', 'cube steaks'],

    // GROUND BEEF VARIATIONS
    'ground round': ['ground beef', 'lean ground beef', '85/15 ground beef'],
    'ground sirloin': ['ground beef', 'extra lean ground beef', '90/10 ground beef'],
    'lean ground beef': ['ground beef', 'ground round', '85/15 ground beef'],
    'extra lean ground beef': ['ground beef', 'ground sirloin', '90/10 ground beef'],

    // STEW AND SOUP CUTS
    'stew meat': ['beef stew meat', 'stewing beef', 'stew beef', 'beef for stew'],
    'beef stew meat': ['stew meat', 'stewing beef', 'chuck stew meat'],
    'stewing beef': ['stew meat', 'beef stew meat', 'stew beef'],
    'soup bones': ['beef soup bones', 'marrow bones', 'beef bones'],

    // ==========================================
    // COMPREHENSIVE PORK CUTS
    // ==========================================

    // PORK SHOULDER/BOSTON BUTT
    'pork shoulder': ['boston butt', 'pork butt', 'shoulder roast', 'boston shoulder', 'pork shoulder roast', 'pulled pork'],
    'boston butt': ['pork shoulder', 'pork butt', 'shoulder roast', 'boston shoulder', 'pulled pork'],
    'pork butt': ['boston butt', 'pork shoulder', 'shoulder roast', 'pulled pork'],

    // PORK LOIN & CHOPS
    'pork loin': ['center cut loin', 'loin roast', 'pork loin roast', 'whole pork loin'],
    'pork chops': ['center cut pork chops', 'loin chops', 'center cut chops', 'pork loin chops'],
    'pork tenderloin': ['tenderloin', 'pork filet', 'pork tender', 'whole tenderloin'],

    // PORK RIBS
    'baby back ribs': ['baby ribs', 'back ribs', 'loin ribs', 'top loin ribs'],
    'spare ribs': ['spareribs', 'side ribs', 'pork spare ribs'],
    'country style ribs': ['country-style ribs', 'country ribs', 'blade end ribs'],

    // PORK GROUND & SAUSAGES
    'ground pork': ['pork mince', 'minced pork', 'ground pork meat'],
    'italian sausage': ['italian pork sausage', 'sweet italian sausage', 'hot italian sausage'],
    'pork sausage': ['fresh pork sausage', 'breakfast sausage', 'bulk sausage'],

    // ==========================================
    // COMPREHENSIVE POULTRY CUTS
    // ==========================================

    // WHOLE CHICKEN
    'whole chicken': ['whole fryer', 'whole roaster', 'whole broiler', 'fryer chicken', 'roaster chicken'],
    'fryer chicken': ['whole fryer', 'young chicken', 'broiler chicken'],

    // CHICKEN BREASTS
    'chicken breast': ['chicken breasts', 'bone-in chicken breast', 'skin-on chicken breast'],
    'boneless chicken breast': ['boneless chicken breasts', 'boneless skinless chicken breast', 'chicken breast boneless'],
    'boneless skinless chicken breast': ['boneless skinless chicken breasts', 'boneless chicken breast', 'skinless chicken breast'],
    'chicken tenderloins': ['chicken tenderloin', 'chicken tenders', 'chicken strips'],
    'chicken tenders': ['chicken tenderloins', 'chicken tenderloin', 'chicken strips'],

    // CHICKEN THIGHS
    'chicken thighs': ['chicken thigh', 'bone-in chicken thighs', 'skin-on chicken thighs'],
    'boneless chicken thighs': ['boneless chicken thigh', 'boneless skinless chicken thighs', 'chicken thighs boneless'],

    // CHICKEN LEGS & WINGS
    'chicken legs': ['chicken leg', 'whole chicken legs', 'chicken drumsticks'],
    'chicken drumsticks': ['chicken drumstick', 'drumsticks', 'chicken legs'],
    'chicken wings': ['chicken wing', 'whole chicken wings', 'party wings'],

    // GROUND CHICKEN & TURKEY
    'ground chicken': ['chicken mince', 'minced chicken', 'ground chicken meat'],
    'ground turkey': ['turkey mince', 'minced turkey', 'ground turkey meat'],
    'lean ground turkey': ['ground turkey', 'extra lean ground turkey'],

    // TURKEY PARTS
    'turkey breast': ['turkey breasts', 'bone-in turkey breast', 'whole turkey breast'],
    'boneless turkey breast': ['boneless turkey breasts', 'turkey breast boneless', 'boneless skinless turkey breast']
};

// ENHANCED ingredient extraction function
export function extractIngredientName(ingredientString) {
    if (!ingredientString || typeof ingredientString !== 'string') {
        return '';
    }

    const nameString = ingredientString.name || ingredientString;
    let cleaned = nameString;

    // Remove parenthetical content first (critical for cube steaks)
    cleaned = cleaned.replace(/\([^)]*\)/g, '');

    // Remove commas and everything after (preparation instructions)
    cleaned = cleaned.split(',')[0];

    // Remove leading count numbers
    cleaned = cleaned.replace(/^\d+\s+/, '');

    // Remove measurements and fractions aggressively
    cleaned = cleaned
        .replace(/\d+\s*[½¼¾]/g, '')
        .replace(/[½¼¾]/g, '')
        .replace(/\d*\.\d+/g, '')
        .replace(/\b\d+\/\d+\b/g, '') // Remove fractions like 1/3
        .replace(/\b\d+\b/g, '')
        .replace(/\b(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|ml|liters?|l|grams?|g|kg|kilograms?|pt\.?|pints?|qt|quarts?|gal|gallons?|fl\.?\s*oz|fluid\s*ounces?)\b/gi, '')

        // Remove cooking/preparation methods and descriptors
        .replace(/\b(beaten|melted|softened|minced|chopped|sliced|diced|crushed|grated|shredded|packed|cold|hot|warm|uncooked|cooked|finely)\b/gi, '')
        .replace(/\b(pounded|flattened|tenderized|marinated|seasoned|trimmed|cut|split|halved|quartered)\b/gi, '')
        .replace(/\b(thick|thin|medium|large|small|extra|jumbo|mini)\b/gi, '')
        .replace(/\b(bone-in|boneless|skin-on|skinless|lean|extra lean|fat free|low fat)\b/gi, '')

        // Remove specific measurement descriptors
        .replace(/\b(inch|inches|thickness|diameter|width|length)\b/gi, '')
        .replace(/\b(about|approximately|roughly|around)\b/gi, '')
        .replace(/\b(each|per|piece|pieces)\b/gi, '')
        .replace(/\b(to taste|optional|dash|pinch)\b/gi, '')

        // Remove connecting words and prepositions
        .replace(/\b(to|into|for|with|from|of|the|and|or|a|an)\b/gi, '')

        // Clean up punctuation and extra spaces
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    console.log(`[EXTRACT] "${nameString}" -> "${cleaned}"`);
    return cleaned;
}

export function normalizeIngredientName(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }

    let normalized = name
        .toLowerCase()
        .trim()
        .replace(/\([^)]*\)/g, '') // Remove parentheses first

        // Remove descriptive words that don't affect the core ingredient
        .replace(/\b(organic|natural|pure|fresh|raw|whole|fine|coarse|ground)\b/g, '')
        .replace(/\b(small|medium|large|extra large|jumbo|mini|thick|thin)\b/g, '')
        .replace(/\b(bone-in|boneless|skin-on|skinless|lean|extra lean)\b/g, '')
        .replace(/\b(can|jar|bottle|bag|box|package|container)\b/g, '')

        // Remove measurement and preparation descriptors
        .replace(/\b(pounded|flattened|tenderized|cut|sliced|diced|chopped|minced|crushed|grated|shredded)\b/g, '')
        .replace(/\b(inch|inches|thickness|diameter|about|approximately|each|per|piece|pieces)\b/g, '')
        .replace(/\b(to|into|for|with|from|of|the|and|or|a|an)\b/g, '')

        // Remove numbers and fractions
        .replace(/\d+\s*[½¼¾]/g, '')
        .replace(/[½¼¾]/g, '')
        .replace(/\d*\.\d+/g, '')
        .replace(/\b\d+\/\d+\b/g, '')
        .replace(/\b\d+\b/g, '')

        // Clean up punctuation and whitespace
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return normalized;
}

// Enhanced ingredient key creation
export function createIngredientKey(ingredient) {
    const cleaned = extractIngredientName(ingredient).toLowerCase().trim();

    console.log(`[INGREDIENT KEY] Input: "${ingredient}" -> Cleaned: "${cleaned}"`);

    // PRIORITY MATCHES - Handle specific cuts first
    if (cleaned.includes('cube steaks') || cleaned.includes('cubed steaks') ||
        cleaned.includes('cube steak') || cleaned.includes('cubed steak') ||
        cleaned.includes('minute steaks') || cleaned.includes('minute steak') ||
        cleaned.includes('swiss steaks') || cleaned.includes('swiss steak')) {
        console.log(`[INGREDIENT KEY] Matched cube steaks variant: "${cleaned}"`);
        return 'cube-steaks';
    }

    // Handle other ground beef variants
    if (cleaned.includes('ground beef') || cleaned.includes('lean beef') ||
        cleaned.includes('hamburger') || cleaned.includes('ground chuck')) {
        return 'ground-beef';
    }

    // Additional meat cut groupings...
    if (cleaned.includes('chicken breast') && !cleaned.includes('ground')) return 'chicken-breast';
    if (cleaned.includes('ground chicken')) return 'ground-chicken';
    if (cleaned.includes('pork chops')) return 'pork-chops';
    if (cleaned.includes('italian sausage')) return 'italian-sausage';

    // Default: use cleaned name with dashes
    return cleaned.replace(/\s+/g, '-');
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
    const cleaned = extractIngredientName(ingredient);
    const normalized = normalizeIngredientName(cleaned);

    // If it's a specialty ingredient, only return itself for exact matching
    if (isSpecialtyIngredient(ingredient)) {
        return [normalized, ingredient.toLowerCase().trim()];
    }

    const variations = new Set([normalized]);
    variations.add(ingredient.toLowerCase().trim());
    variations.add(cleaned.toLowerCase().trim());

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
    const cleaned = extractIngredientName(recipeIngredient);
    const recipeNorm = normalizeIngredientName(cleaned);

    console.log(`[INVENTORY MATCH] Looking for: "${recipeIngredient}" -> cleaned: "${cleaned}" -> normalized: "${recipeNorm}"`);

    // First, try exact matches on cleaned names
    const exactMatches = inventoryItems.filter(item => {
        const itemCleaned = extractIngredientName(item.name);
        const itemNorm = normalizeIngredientName(itemCleaned);
        return itemNorm === recipeNorm;
    });

    if (exactMatches.length > 0) {
        console.log(`[INVENTORY MATCH] ✅ EXACT MATCH: "${exactMatches[0].name}"`);
        return exactMatches[0];
    }

    // Then try intelligent matching
    const compatibleItems = inventoryItems.filter(item =>
        canIngredientsMatch(cleaned, item.name)
    );

    if (compatibleItems.length > 0) {
        console.log(`[INVENTORY MATCH] ✅ INTELLIGENT MATCH: "${compatibleItems[0].name}"`);
        // Prefer items with higher quantity available
        return compatibleItems.sort((a, b) => (b.quantity || 0) - (a.quantity || 0))[0];
    }

    console.log(`[INVENTORY MATCH] ❌ NO MATCH found for: "${recipeIngredient}"`);
    return null;
}

// Function to get intelligent substitutions for an ingredient
export function getIngredientSubstitutions(ingredient) {
    const cleaned = extractIngredientName(ingredient);
    const normalized = normalizeIngredientName(cleaned);

    // Check if we have direct substitutions
    if (INTELLIGENT_SUBSTITUTIONS[normalized]) {
        return INTELLIGENT_SUBSTITUTIONS[normalized];
    }

    // Check if the ingredient appears in any substitution lists
    for (const [baseIngredient, substitutionData] of Object.entries(INTELLIGENT_SUBSTITUTIONS)) {
        if (substitutionData.canSubstituteWith.some(sub =>
            normalizeIngredientName(sub) === normalized
        )) {
            return {
                canSubstituteWith: [baseIngredient, ...substitutionData.canSubstituteWith.filter(s =>
                    normalizeIngredientName(s) !== normalized
                )],
                conversionNote: `Can substitute for ${baseIngredient}. ${substitutionData.conversionNote}`
            };
        }
    }

    return null;
}

// Function to check if two ingredients can be substituted
export function canSubstitute(ingredient1, ingredient2) {
    const substitutions1 = getIngredientSubstitutions(ingredient1);
    const substitutions2 = getIngredientSubstitutions(ingredient2);

    const normalized1 = normalizeIngredientName(extractIngredientName(ingredient1));
    const normalized2 = normalizeIngredientName(extractIngredientName(ingredient2));

    // Check if ingredient2 is in ingredient1's substitution list
    if (substitutions1 && substitutions1.canSubstituteWith.some(sub =>
        normalizeIngredientName(sub) === normalized2
    )) {
        return true;
    }

    // Check if ingredient1 is in ingredient2's substitution list
    if (substitutions2 && substitutions2.canSubstituteWith.some(sub =>
        normalizeIngredientName(sub) === normalized1
    )) {
        return true;
    }

    return false;
}

// Export constants for use in other files
export {
    NEVER_MATCH_INGREDIENTS,
    NEVER_CROSS_MATCH,
    INGREDIENT_VARIATIONS,
    INTELLIGENT_SUBSTITUTIONS
};