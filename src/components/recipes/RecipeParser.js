'use client';
// file: /src/components/recipes/RecipeParser.js v2


import { useState } from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function RecipeParser({ onRecipeParsed, onCancel }) {
    const [rawText, setRawText] = useState('');
    const [parsedRecipe, setParsedRecipe] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Main parsing function
    const parseRecipeText = (text) => {
        console.log('Parsing recipe text:', text);

        if (!text || text.trim().length === 0) {
            return null;
        }

        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Initialize recipe object
        const recipe = {
            title: '',
            description: '',
            ingredients: [],
            instructions: [],
            prepTime: null,
            cookTime: null,
            servings: null,
            difficulty: 'medium',
            tags: [],
            source: 'Pasted Recipe',
            isPublic: false,
            category: 'entrees'
        };

        let currentSection = 'title';
        let ingredientSection = false;
        let instructionSection = false;

        lines.forEach((line, index) => {
            const lowerLine = line.toLowerCase();

            // Detect title (usually first line or line before ingredients)
            if (index === 0 && !lowerLine.includes('ingredient') && !lowerLine.includes('instruction')) {
                recipe.title = cleanTitle(line);
                return;
            }

            // Detect ingredients section
            if (lowerLine.includes('ingredient') && lowerLine.includes(':')) {
                ingredientSection = true;
                instructionSection = false;
                currentSection = 'ingredients';
                return;
            }

            // Detect instructions section
            if ((lowerLine.includes('instruction') || lowerLine.includes('direction') || lowerLine.includes('method')) && lowerLine.includes(':')) {
                ingredientSection = false;
                instructionSection = true;
                currentSection = 'instructions';
                return;
            }

            // Parse ingredients
            if (ingredientSection || (currentSection === 'ingredients' && !instructionSection)) {
                const ingredient = parseIngredient(line);
                if (ingredient) {
                    recipe.ingredients.push(ingredient);
                }
                return;
            }

            // Parse instructions
            if (instructionSection || currentSection === 'instructions') {
                const instruction = parseInstruction(line, recipe.instructions.length);
                if (instruction) {
                    recipe.instructions.push(instruction);
                }
                return;
            }

            // If we haven't found sections yet, try to auto-detect
            if (!ingredientSection && !instructionSection) {
                // Check if line looks like an ingredient
                if (isIngredientLine(line)) {
                    if (!ingredientSection) {
                        ingredientSection = true;
                        currentSection = 'ingredients';
                    }
                    const ingredient = parseIngredient(line);
                    if (ingredient) {
                        recipe.ingredients.push(ingredient);
                    }
                    return;
                }

                // Check if line looks like an instruction
                if (isInstructionLine(line)) {
                    if (!instructionSection) {
                        instructionSection = true;
                        ingredientSection = false;
                        currentSection = 'instructions';
                    }
                    const instruction = parseInstruction(line, recipe.instructions.length);
                    if (instruction) {
                        recipe.instructions.push(instruction);
                    }
                    return;
                }

                // If it's not title, ingredient, or instruction, treat as description
                if (recipe.title && !recipe.description && line.length > 10) {
                    recipe.description = line;
                }
            }
        });

        // Extract additional info from text
        extractServings(text, recipe);
        extractTimes(text, recipe);
        extractTags(text, recipe);

        // Set default title if none found
        if (!recipe.title) {
            recipe.title = 'Pasted Recipe';
        }

        // Clean up empty arrays
        if (recipe.ingredients.length === 0) {
            // Try to find ingredients in a different way
            const fallbackIngredients = extractFallbackIngredients(text);
            recipe.ingredients = fallbackIngredients;
        }

        if (recipe.instructions.length === 0) {
            // Try to find instructions in a different way
            const fallbackInstructions = extractFallbackInstructions(text);
            recipe.instructions = fallbackInstructions;
        }

        console.log('Parsed recipe:', recipe);
        return recipe;
    };

    // Clean title text
    const cleanTitle = (text) => {
        return text
            .replace(/^recipe:?\s*/i, '')
            .replace(/\s*recipe$/i, '')
            .trim();
    };

    // Parse individual ingredient line
    const parseIngredient = (line) => {
        if (!line || line.length < 2) return null;

        // Remove bullets, numbers, and common prefixes more carefully
        let cleanLine = line
            .replace(/^[•\-\*]+\s*/, '') // Remove bullets but preserve leading numbers
            .replace(/^ingredients?:?\s*/i, '')
            .trim();

        if (!cleanLine) return null;

        console.log('Parsing ingredient line:', cleanLine);

        // Skip lines that are clearly instructions or serving suggestions, but NOT garnish ingredients
        if (/serve|enjoy|bold|spicy|delicious/i.test(cleanLine) && !/basil|parsley|cilantro|herbs/i.test(cleanLine)) {
            console.log('Skipping instruction/serving line:', cleanLine);
            return null;
        }

        // Enhanced patterns for better parsing

        // Convert fraction characters first
        const convertFractions = (text) => {
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

        cleanLine = convertFractions(cleanLine);

        // Declare match variable for reuse
        let match;

        // Pattern 1: Amount + Unit + Description (e.g., "8 oz pappardelle or fettuccine", "1/2 lb Italian sausage")
        const amountUnitDescPattern = /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(oz|ounces|lb|lbs|pound|pounds|cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|clove|cloves|g|gram|grams)\s+(.+)$/i;

        // Pattern 2: Amount + Size + Item (e.g., "1 bell pepper, sliced", "1 small onion")
        const amountSizeItemPattern = /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(small|medium|large|bell)?\s*(pepper|onion|clove|cloves|garlic)(?:\s*,?\s*(.*))?$/i;

        // Pattern 3: Amount + General Item (e.g., "1 cup diced tomatoes")
        const amountItemPattern = /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(.+)$/;

        // Pattern 4: "to taste" ingredients
        const toTastePattern = /^(.+?)\s+to\s+taste$/i;

        // Pattern 5: Garnish ingredients (e.g., "Fresh basil, for garnish")
        const garnishPattern = /^(.+?),?\s+for\s+garnish$/i;

        // Handle garnish items - parse but mark as optional
        match = cleanLine.match(garnishPattern);
        if (match) {
            console.log('Matched garnish item:', match);
            return {
                name: match[1].trim(),
                amount: '',
                unit: '',
                optional: true // Mark garnish items as optional
            };
        }

        // Try "to taste" pattern first
        match = cleanLine.match(toTastePattern);
        if (match) {
            console.log('Matched to taste:', match);
            return {
                name: match[1].trim(),
                amount: 'to taste',
                unit: '',
                optional: false
            };
        }

        // Try amount + unit + description pattern
        match = cleanLine.match(amountUnitDescPattern);
        if (match) {
            console.log('Matched amount+unit+description:', match);
            return {
                name: match[3].trim(),
                amount: match[1],
                unit: match[2],
                optional: cleanLine.toLowerCase().includes('optional')
            };
        }

        // Try amount + size + item pattern for vegetables
        match = cleanLine.match(amountSizeItemPattern);
        if (match) {
            console.log('Matched amount+size+item:', match);
            const size = match[2] ? match[2] + ' ' : '';
            const additional = match[4] ? ', ' + match[4] : '';
            return {
                name: (size + match[3] + additional).trim(),
                amount: match[1],
                unit: '',
                optional: cleanLine.toLowerCase().includes('optional')
            };
        }

        // Special handling for specific problematic patterns
        // Handle "2 cloves garlic, minced" specifically
        if (/(\d+(?:\/\d+)?)\s+cloves?\s+garlic/i.test(cleanLine)) {
            const garlicMatch = cleanLine.match(/(\d+(?:\/\d+)?)\s+cloves?\s+(garlic.*)/i);
            if (garlicMatch) {
                console.log('Matched garlic specifically:', garlicMatch);
                return {
                    name: garlicMatch[2].trim(),
                    amount: garlicMatch[1],
                    unit: 'cloves',
                    optional: false
                };
            }
        }

        // Handle "1 cup diced tomatoes" - look for measurement words
        const measurementPattern = /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(cup|cups|tablespoon|tablespoons|tbsp|teaspoon|teaspoons|tsp)\s+(.+)$/i;
        match = cleanLine.match(measurementPattern);
        if (match) {
            console.log('Matched measurement pattern:', match);
            return {
                name: match[3].trim(),
                amount: match[1],
                unit: match[2],
                optional: cleanLine.toLowerCase().includes('optional')
            };
        }

        // Try general amount + item pattern
        match = cleanLine.match(amountItemPattern);
        if (match) {
            console.log('Matched general amount+item:', match);

            // Check if the second part starts with a unit word
            const secondPart = match[2].trim();
            const unitWords = ['cup', 'cups', 'tbsp', 'tsp', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons', 'oz', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'clove', 'cloves', 'slice', 'slices'];

            for (const unit of unitWords) {
                if (secondPart.toLowerCase().startsWith(unit.toLowerCase() + ' ')) {
                    const remainder = secondPart.substring(unit.length).trim();
                    return {
                        name: remainder,
                        amount: match[1],
                        unit: unit,
                        optional: cleanLine.toLowerCase().includes('optional')
                    };
                }
            }

            // No unit found, treat as item name
            return {
                name: secondPart,
                amount: match[1],
                unit: '',
                optional: cleanLine.toLowerCase().includes('optional')
            };
        }

        // Final fallback: treat entire line as ingredient name
        console.log('No pattern matched, using entire line as name');
        return {
            name: cleanLine,
            amount: '',
            unit: '',
            optional: cleanLine.toLowerCase().includes('optional')
        };
    };

    // Parse individual instruction line
    const parseInstruction = (line, stepNumber) => {
        if (!line || line.length < 3) return null;

        // Remove step numbers and common prefixes
        let cleanLine = line
            .replace(/^[\d+\.\)\s]+/, '')
            .replace(/^instructions?:?\s*/i, '')
            .replace(/^directions?:?\s*/i, '')
            .replace(/^method:?\s*/i, '')
            .replace(/^step\s*\d*:?\s*/i, '')
            .trim();

        if (!cleanLine) return null;

        return {
            step: stepNumber + 1,
            instruction: cleanLine
        };
    };

    // Check if line looks like an ingredient
    const isIngredientLine = (line) => {
        const lowerLine = line.toLowerCase();

        // Skip obviously non-ingredient lines
        if (lowerLine.includes('serve') || lowerLine.includes('enjoy') || lowerLine.includes('garnish with basil and serve')) {
            return false;
        }

        // Has bullet point or number
        if (/^[•\-\*\d+\.\)]/.test(line)) return true;

        // Contains measurement units (enhanced list)
        if (/\b(cup|cups|tablespoon|tablespoons|tbsp|teaspoon|teaspoons|tsp|pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|g|clove|cloves|slice|slices|piece|pieces|can|cans|jar|jars|bottle|bottles|small|medium|large)\b/i.test(line)) return true;

        // Has fraction characters
        if (/[½¼¾⅓⅔⅛⅜⅝⅞]/.test(line)) return true;

        // Has number at start followed by space
        if (/^\d+(?:\/\d+)?\s/.test(line)) return true;

        // Common ingredient patterns
        if (/\b(salt|pepper|oil|butter|flour|sugar|milk|cheese|onion|garlic|tomato|wine|basil|sausage|pasta|bell pepper|red pepper)\b/i.test(line)) return true;

        // Contains "to taste"
        if (/to taste/i.test(line)) return true;

        return false;
    };

    // Check if line looks like an instruction
    const isInstructionLine = (line) => {
        const lowerLine = line.toLowerCase();

        // Starts with step number
        if (/^\d+\.?\s/.test(line)) return true;

        // Contains cooking verbs
        if (/\b(cook|bake|fry|sauté|boil|simmer|mix|stir|add|combine|heat|preheat|season|serve|garnish|slice|dice|chop|prepare)\b/i.test(line)) return true;

        // Longer lines are more likely to be instructions
        if (line.length > 30) return true;

        return false;
    };

    // Extract servings from text
    const extractServings = (text, recipe) => {
        const servingsPattern = /serves?\s*(\d+)/i;
        const yieldsPattern = /yields?\s*(\d+)/i;
        const portionsPattern = /(\d+)\s*portions?/i;

        const match = text.match(servingsPattern) ||
            text.match(yieldsPattern) ||
            text.match(portionsPattern);

        if (match) {
            recipe.servings = parseInt(match[1]);
        }
    };

    // Extract cooking times from text
    const extractTimes = (text, recipe) => {
        const prepPattern = /prep(?:\s+time)?:?\s*(\d+)\s*(?:min|minutes?|hrs?|hours?)/i;
        const cookPattern = /cook(?:\s+time)?:?\s*(\d+)\s*(?:min|minutes?|hrs?|hours?)/i;
        const totalPattern = /total(?:\s+time)?:?\s*(\d+)\s*(?:min|minutes?|hrs?|hours?)/i;

        const prepMatch = text.match(prepPattern);
        const cookMatch = text.match(cookPattern);
        const totalMatch = text.match(totalPattern);

        if (prepMatch) {
            recipe.prepTime = parseInt(prepMatch[1]);
        }

        if (cookMatch) {
            recipe.cookTime = parseInt(cookMatch[1]);
        }

        // If we have total time but not prep/cook, make educated guess
        if (totalMatch && !prepMatch && !cookMatch) {
            const totalTime = parseInt(totalMatch[1]);
            recipe.prepTime = Math.round(totalTime * 0.3); // 30% prep
            recipe.cookTime = Math.round(totalTime * 0.7); // 70% cook
        }
    };

    // Extract tags from text
    const extractTags = (text, recipe) => {
        const tags = new Set();
        const lowerText = text.toLowerCase();

        // Common cuisine types
        const cuisines = ['italian', 'mexican', 'chinese', 'indian', 'thai', 'french', 'american', 'mediterranean', 'asian'];
        cuisines.forEach(cuisine => {
            if (lowerText.includes(cuisine)) tags.add(cuisine);
        });

        // Meal types
        const mealTypes = ['breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'appetizer'];
        mealTypes.forEach(mealType => {
            if (lowerText.includes(mealType)) tags.add(mealType);
        });

        // Cooking methods
        const methods = ['baked', 'fried', 'grilled', 'roasted', 'steamed'];
        methods.forEach(method => {
            if (lowerText.includes(method)) tags.add(method);
        });

        // Dietary
        const dietary = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'low-carb'];
        dietary.forEach(diet => {
            if (lowerText.includes(diet)) tags.add(diet);
        });

        recipe.tags = Array.from(tags);
    };

    // Fallback ingredient extraction for unstructured text
    const extractFallbackIngredients = (text) => {
        const ingredients = [];
        const lines = text.split('\n');

        // Look for any line that might be an ingredient
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && isIngredientLine(trimmed)) {
                const ingredient = parseIngredient(trimmed);
                if (ingredient) {
                    ingredients.push(ingredient);
                }
            }
        });

        return ingredients;
    };

    // Fallback instruction extraction for unstructured text
    const extractFallbackInstructions = (text) => {
        const instructions = [];
        const lines = text.split('\n');

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && isInstructionLine(trimmed)) {
                const instruction = parseInstruction(trimmed, instructions.length);
                if (instruction) {
                    instructions.push(instruction);
                }
            }
        });

        return instructions;
    };

    // Handle parsing
    const handleParse = () => {
        setIsParsing(true);

        setTimeout(() => {
            const parsed = parseRecipeText(rawText);
            setParsedRecipe(parsed);
            setShowPreview(true);
            setIsParsing(false);
        }, 500); // Small delay for UX
    };

    // Handle using parsed recipe
    const handleUseRecipe = () => {
        if (parsedRecipe) {
            onRecipeParsed(parsedRecipe);
        }
    };

    // Handle editing parsed recipe
    const handleEditField = (field, value) => {
        setParsedRecipe(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle editing ingredients
    const handleEditIngredient = (index, field, value) => {
        setParsedRecipe(prev => ({
            ...prev,
            ingredients: prev.ingredients.map((ing, i) =>
                i === index ? { ...ing, [field]: value } : ing
            )
        }));
    };

    // Handle editing instructions
    const handleEditInstruction = (index, value) => {
        setParsedRecipe(prev => ({
            ...prev,
            instructions: prev.instructions.map((inst, i) =>
                i === index ? { ...inst, instruction: value } : inst
            )
        }));
    };

    return (
        <div className="space-y-6">
            {!showPreview ? (
                // Input Phase
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        📝 Paste Recipe Text
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Paste a recipe from anywhere - text messages, websites, or documents.
                        I'll automatically extract the ingredients, instructions, and other details.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Recipe Text
                            </label>
                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder="Paste your recipe here...

Example:
Italian Drunken Noodles
Ingredients:
• 8 oz pappardelle or fettuccine
• ½ lb Italian sausage, crumbled
• 1 bell pepper, sliced
Instructions:
1. Cook pasta, reserve ½ cup pasta water
2. Sauté sausage until browned..."
                                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex justify-between">
                            <TouchEnhancedButton
                                onClick={onCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={handleParse}
                                disabled={!rawText.trim() || isParsing}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
                            >
                                {isParsing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Parsing...
                                    </>
                                ) : (
                                    <>
                                        🔍 Parse Recipe
                                    </>
                                )}
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            ) : (
                // Preview Phase
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        ✨ Parsed Recipe Preview
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Review and edit the extracted information before adding to your recipe collection.
                    </p>

                    {parsedRecipe && (
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Recipe Title
                                    </label>
                                    <input
                                        type="text"
                                        value={parsedRecipe.title}
                                        onChange={(e) => handleEditField('title', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Servings
                                    </label>
                                    <input
                                        type="number"
                                        value={parsedRecipe.servings || ''}
                                        onChange={(e) => handleEditField('servings', parseInt(e.target.value) || null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Prep Time (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={parsedRecipe.prepTime || ''}
                                        onChange={(e) => handleEditField('prepTime', parseInt(e.target.value) || null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cook Time (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={parsedRecipe.cookTime || ''}
                                        onChange={(e) => handleEditField('cookTime', parseInt(e.target.value) || null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category
                                </label>
                                <select
                                    value={parsedRecipe.category}
                                    onChange={(e) => handleEditField('category', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="entrees">Entrees</option>
                                    <option value="appetizers">Appetizers</option>
                                    <option value="side-dishes">Side Dishes</option>
                                    <option value="soups">Soups</option>
                                    <option value="salads">Salads</option>
                                    <option value="desserts">Desserts</option>
                                    <option value="beverages">Beverages</option>
                                    <option value="breakfast">Breakfast</option>
                                    <option value="lunch">Lunch</option>
                                    <option value="dinner">Dinner</option>
                                    <option value="snacks">Snacks</option>
                                    <option value="sauces">Sauces</option>
                                    <option value="seasonings">Seasonings</option>
                                    <option value="breads">Breads</option>
                                    <option value="pasta">Pasta</option>
                                    <option value="pizza">Pizza</option>
                                    <option value="seafood">Seafood</option>
                                    <option value="vegetarian">Vegetarian</option>
                                    <option value="comfort-food">Comfort Food</option>
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={parsedRecipe.description}
                                    onChange={(e) => handleEditField('description', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Ingredients */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Ingredients ({parsedRecipe.ingredients.length})
                                </h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {parsedRecipe.ingredients.map((ingredient, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-2">
                                                <input
                                                    type="text"
                                                    value={ingredient.amount}
                                                    onChange={(e) => handleEditIngredient(index, 'amount', e.target.value)}
                                                    placeholder="Amount"
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="text"
                                                    value={ingredient.unit}
                                                    onChange={(e) => handleEditIngredient(index, 'unit', e.target.value)}
                                                    placeholder="Unit"
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                />
                                            </div>
                                            <div className="col-span-8">
                                                <input
                                                    type="text"
                                                    value={ingredient.name}
                                                    onChange={(e) => handleEditIngredient(index, 'name', e.target.value)}
                                                    placeholder="Ingredient name"
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Instructions */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Instructions ({parsedRecipe.instructions.length})
                                </h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {parsedRecipe.instructions.map((instruction, index) => (
                                        <div key={index} className="flex gap-2">
                                            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                                                {instruction.step}
                                            </div>
                                            <textarea
                                                value={instruction.instruction}
                                                onChange={(e) => handleEditInstruction(index, e.target.value)}
                                                rows={2}
                                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tags (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={parsedRecipe.tags.join(', ')}
                                    onChange={(e) => handleEditField('tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                                    placeholder="italian, dinner, easy"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-between pt-4 border-t">
                                <TouchEnhancedButton
                                    onClick={() => setShowPreview(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    ← Back to Edit Text
                                </TouchEnhancedButton>
                                <div className="flex gap-2">
                                    <TouchEnhancedButton
                                        onClick={onCancel}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        onClick={handleUseRecipe}
                                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    >
                                        ✓ Use This Recipe
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}