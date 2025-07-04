// file: /src/lib/recipe-parsing-utils.js
// Shared recipe parsing utilities for both client and server

// Helper function for fraction conversion
export const convertFractions = (text) => {
    return text
        .replace(/½/g, '1/2')
        .replace(/¼/g, '1/4')
        .replace(/¾/g, '3/4')
        .replace(/⅓/g, '1/3')
        .replace(/⅔/g, '2/3')
        .replace(/⅛/g, '1/8')
        .replace(/⅜/g, '3/8')
        .replace(/⅝/g, '5/8')
        .replace(/⅞/g, '7/8');
};

// Helper function to clean titles
export const cleanTitle = (text) => {
    return text
        .replace(/^recipe:?\s*/i, '')
        .replace(/\s*recipe$/i, '')
        .trim();
};

// Enhanced ingredient parsing (from RecipeParser.js)
export const parseIngredientLine = (line) => {
    if (!line || line.length < 2) return null;

    // Remove bullets, pricing, and clean the line
    let cleanLine = line
        .replace(/^[\*\-\•]\s*/, '') // Remove bullet points only (*, -, •)
        .replace(/^\d+\.\s*/, '') // Remove numbered list markers like "1. " but not measurements
        .replace(/^\d+\)\s*/, '') // Remove numbered list markers like "1) " but not measurements
        .replace(/\(\$[\d\.]+\)/g, '') // Remove pricing like ($0.37)
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

    if (!cleanLine) return null;

    console.log('🥕 Parsing ingredient:', cleanLine);

    // Convert fraction characters
    cleanLine = convertFractions(cleanLine);

    let match;

    // Pattern 1: "to taste" ingredients
    match = cleanLine.match(/^(.+?)\s*,?\s*to\s+taste$/i);
    if (match) {
        return {
            name: match[1].trim(),
            amount: 'to taste',
            unit: '',
            optional: false
        };
    }

    // Pattern 2: Amount + Unit + Description (e.g., "2 cups flour", "1 tsp salt")
    match = cleanLine.match(/^(\d+(?:\/\d+)?(?:\.\d+)?(?:\s+\d+\/\d+)?)\s+(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|cloves?|ribs?|rib?|stalks?|sprigs?|leaves?|bulbs?|heads?|ears?|slices?|pieces?|cans?|jars?|bottles?|small|medium|large|bunch|handful)\s+(.+)$/i);
    if (match) {
        return {
            name: match[3].trim(),
            amount: match[1].trim(),
            unit: match[2].toLowerCase(),
            optional: cleanLine.toLowerCase().includes('optional')
        };
    }

    // Pattern 3: Amount + Description (no unit)
    match = cleanLine.match(/^(\d+(?:\/\d+)?(?:\.\d+)?(?:\s+\d+\/\d+)?)\s+(.+)$/);
    if (match) {
        const secondPart = match[2].trim();

        // Check if second part starts with a unit
        const unitMatch = secondPart.match(/^(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|cloves?|ribs?|rib?|stalks?|sprigs?|leaves?|bulbs?|heads?|ears?|slices?|pieces?|cans?|jars?|bottles?)\s+(.+)$/i);
        if (unitMatch) {
            return {
                name: unitMatch[2].trim(),
                amount: match[1].trim(),
                unit: unitMatch[1].toLowerCase(),
                optional: cleanLine.toLowerCase().includes('optional')
            };
        }

        return {
            name: secondPart,
            amount: match[1].trim(),
            unit: '',
            optional: cleanLine.toLowerCase().includes('optional')
        };
    }

    // Pattern 4: Fractional amounts (e.g., "1/2 onion", "3/4 cup butter")
    match = cleanLine.match(/^(\d+\/\d+)\s+(.+)$/);
    if (match) {
        const secondPart = match[2].trim();
        const unitMatch = secondPart.match(/^(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|cloves?|ribs?|rib?|stalks?|sprigs?|leaves?|bulbs?|heads?|ears?|slices?|pieces?|cans?|jars?|bottles?)\s+(.+)$/i);

        if (unitMatch) {
            return {
                name: unitMatch[2].trim(),
                amount: match[1],
                unit: unitMatch[1].toLowerCase(),
                optional: cleanLine.toLowerCase().includes('optional')
            };
        }

        return {
            name: secondPart,
            amount: match[1],
            unit: '',
            optional: cleanLine.toLowerCase().includes('optional')
        };
    }

    // Fallback: treat entire line as ingredient name
    return {
        name: cleanLine,
        amount: '',
        unit: '',
        optional: cleanLine.toLowerCase().includes('optional')
    };
};

// Enhanced instruction parsing (from RecipeParser.js)
export const parseInstructionLine = (line, stepNumber) => {
    if (!line || line.length < 5) return null;

    // Clean the line
    let cleanLine = line
        .replace(/^[\*\-\•]\s*/, '') // Remove bullets
        .replace(/^\d+[\.\)]\s*/, '') // Remove step numbers
        .replace(/^(step\s*\d*[:.]?\s*)/i, '') // Remove "Step X:" prefixes
        .trim();

    if (!cleanLine || cleanLine.length < 5) return null;

    return {
        step: stepNumber + 1,
        instruction: cleanLine
    };
};

// Extract metadata (servings, times, tags) from text
export const extractMetadata = (text, recipe) => {
    // Extract servings
    const servingsMatch = text.match(/(?:serves?|servings?|feeds?|portions?|yields?)\s*:?\s*(\d+)/i);
    if (servingsMatch) {
        recipe.servings = parseInt(servingsMatch[1]);
    }

    // Extract prep time
    const prepMatch = text.match(/(?:prep\s*(?:time)?|preparation\s*time)\s*:?\s*(\d+)\s*(?:min|minutes?|hrs?|hours?)/i);
    if (prepMatch) {
        recipe.prepTime = parseInt(prepMatch[1]);
    }

    // Extract cook time
    const cookMatch = text.match(/(?:cook\s*(?:time)?|cooking\s*time|bake\s*(?:time)?|baking\s*time)\s*:?\s*(\d+)\s*(?:min|minutes?|hrs?|hours?)/i);
    if (cookMatch) {
        recipe.cookTime = parseInt(cookMatch[1]);
    }

    // Extract total time
    const totalMatch = text.match(/(?:total\s*time)\s*:?\s*(\d+)\s*(?:min|minutes?|hrs?|hours?)/i);
    if (totalMatch && !recipe.prepTime && !recipe.cookTime) {
        const totalTime = parseInt(totalMatch[1]);
        recipe.prepTime = Math.round(totalTime * 0.3);
        recipe.cookTime = Math.round(totalTime * 0.7);
    }

    // Auto-generate tags based on content
    const autoTags = new Set();
    const lowerText = text.toLowerCase();

    // Cuisine types
    const cuisines = ['italian', 'mexican', 'chinese', 'indian', 'thai', 'french', 'american', 'mediterranean', 'asian'];
    cuisines.forEach(cuisine => {
        if (lowerText.includes(cuisine)) autoTags.add(cuisine);
    });

    // Meal types
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'appetizer'];
    mealTypes.forEach(mealType => {
        if (lowerText.includes(mealType)) autoTags.add(mealType);
    });

    // Cooking methods
    const methods = ['baked', 'fried', 'grilled', 'roasted', 'steamed', 'slow cooker', 'instant pot'];
    methods.forEach(method => {
        if (lowerText.includes(method)) autoTags.add(method.replace(/\s+/g, '-'));
    });

    // Dietary
    const dietary = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'low-carb', 'healthy'];
    dietary.forEach(diet => {
        if (lowerText.includes(diet)) autoTags.add(diet);
    });

    // Add difficulty based on instruction complexity
    if (recipe.instructions && recipe.instructions.length > 8 || text.includes('advanced') || text.includes('complex')) {
        recipe.difficulty = 'hard';
    } else if (recipe.instructions && recipe.instructions.length < 4 || text.includes('easy') || text.includes('simple') || text.includes('quick')) {
        recipe.difficulty = 'easy';
    }

    // Add existing tags to the set
    if (recipe.tags && Array.isArray(recipe.tags)) {
        recipe.tags.forEach(tag => autoTags.add(tag));
    }

    recipe.tags = Array.from(autoTags);
    return recipe;
};

// Enhanced ingredient line detection
export const isIngredientLine = (line) => {
    const lowerLine = line.toLowerCase();

    // Skip obviously non-ingredient lines
    if (lowerLine.includes('preheat') || lowerLine.includes('cook for') || lowerLine.includes('bake for') ||
        lowerLine.includes('add to') || lowerLine.includes('mix until') || lowerLine.includes('stir in') ||
        lowerLine.length < 3) {
        return false;
    }

    // Has bullet point, number, or asterisk
    if (/^[\*\-\•\d+\.\)]\s/.test(line)) return true;

    // Contains measurement units
    if (/\b(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|kg|cloves?|slices?|pieces?|cans?|jars?|bottles?|small|medium|large|bunch|handful)\b/i.test(line)) return true;

    // Has fraction characters or number patterns
    if (/[½¼¾⅓⅔⅛⅜⅝⅞]/.test(line) || /^\d+[\s\/\-]\d*\s/.test(line)) return true;

    // Contains "to taste"
    if (/to taste/i.test(line)) return true;

    // Common ingredient words
    if (/\b(salt|pepper|oil|butter|flour|sugar|milk|cheese|onion|garlic|tomato|wine|herbs?|spices?|chicken|beef|pork|fish|rice|pasta|bread|eggs?)\b/i.test(line)) return true;

    return false;
};

// Enhanced instruction line detection
export const isInstructionLine = (line) => {
    const lowerLine = line.toLowerCase();

    // Contains cooking verbs
    if (/\b(cook|bake|fry|sauté|saute|boil|simmer|mix|stir|add|combine|heat|preheat|season|serve|garnish|slice|dice|chop|prepare|remove|place|set|turn|cover|uncover|drain|rinse|wash|cut|blend|whisk|beat|fold|pour|spread|sprinkle|season)\b/i.test(line)) return true;

    // Contains time or temperature references
    if (/\b(\d+\s*(minutes?|mins?|hours?|hrs?|seconds?|secs?)|degrees?|°[CF]|\d+°)\b/i.test(line)) return true;

    // Starts with step indicators
    if (/^\d+[\.\)]\s/.test(line)) return true;

    // Longer descriptive sentences
    if (line.length > 30 && /\b(until|then|while|when|after|before|during)\b/i.test(line)) return true;

    return false;
};

// Helper function to check if line is a section header
export const isIngredientSectionHeader = (line) => {
    return /^(ingredients?|shopping\s+list|what\s+you.?ll\s+need):?\s*$/i.test(line) ||
        /^ingredients?\s*[-:]/i.test(line);
};

export const isInstructionSectionHeader = (line) => {
    return /^(instructions?|directions?|method|steps?|preparation|how\s+to\s+make):?\s*$/i.test(line) ||
        /^(instructions?|directions?|method)\s*[-:]/i.test(line);
};

export const isHeaderLine = (line) => {
    return isIngredientSectionHeader(line) || isInstructionSectionHeader(line);
};

// Helper function to extract numeric values from nutrition data
export const extractNumericValue = (value) => {
    if (!value) return '';

    // Convert to string if it's not already
    const strValue = String(value);

    // Extract just the number from strings like "203 kcal", "12 g", "9 mg"
    const match = strValue.match(/^(\d+(?:\.\d+)?)/);
    return match ? match[1] : '';
};

// Helper function to extract text from various formats
export const extractText = (data) => {
    if (!data) return '';
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return data.join(' ');
    if (data.text) return data.text;
    if (data['@value']) return data['@value'];
    return String(data);
};

// Helper function to parse duration (ISO 8601 format like "PT30M")
export const parseDuration = (duration) => {
    if (!duration) return null;
    if (typeof duration === 'number') return duration;

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        return hours * 60 + minutes;
    }
    return null;
};