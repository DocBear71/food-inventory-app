// file: /src/components/recipes/RecipeParser.js v1

'use client';

import { useState } from 'react';

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
            source: 'Pasted Recipe'
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

        // Remove bullets, numbers, and common prefixes
        let cleanLine = line
            .replace(/^[•\-\*\d+\.\)\s]+/, '')
            .replace(/^ingredients?:?\s*/i, '')
            .trim();

        if (!cleanLine) return null;

        console.log('Parsing ingredient line:', cleanLine);

        // Enhanced patterns for better parsing

        // Pattern 1: Handle fractions with units (e.g., "½ lb Italian sausage", "8 oz pappardelle")
        const fractionWithUnitPattern = /^([½¼¾\d]+(?:\/\d+)?(?:\.\d+)?)\s*(oz|ounces|lb|lbs|pound|pounds|cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|clove|cloves|g|gram|grams)\s+(.+)$/i;

        // Pattern 2: Handle numbers with units (e.g., "2 cloves garlic, minced")
        const numberWithUnitPattern = /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(clove|cloves|cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounces|lb|lbs|pound|pounds|slice|slices|piece|pieces|g|gram|grams)\s+(.+)$/i;

        // Pattern 3: Handle "to taste" ingredients (e.g., "Salt & pepper to taste")
        const toTastePattern = /^(.+?)\s+to\s+taste$/i;

        // Pattern 4: Handle standalone amounts with units (e.g., "1 bell pepper", "1 small onion")
        const standaloneAmountPattern = /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(small|medium|large)?\s*(.+)$/i;

        // Pattern 5: Handle measurement conversions (e.g., "½ cup" = "1/2 cup")
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

        // Try fraction with unit pattern first
        let match = cleanLine.match(fractionWithUnitPattern);
        if (match) {
            console.log('Matched fraction with unit:', match);
            return {
                name: match[3].trim(),
                amount: match[1],
                unit: match[2],
                optional: cleanLine.toLowerCase().includes('optional')
            };
        }

        // Try number with unit pattern
        match = cleanLine.match(numberWithUnitPattern);
        if (match) {
            console.log('Matched number with unit:', match);
            return {
                name: match[3].trim(),
                amount: match[1],
                unit: match[2],
                optional: cleanLine.toLowerCase().includes('optional')
            };
        }

        // Try "to taste" pattern
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

        // Try standalone amount pattern (for items like "1 bell pepper")
        match = cleanLine.match(standaloneAmountPattern);
        if (match) {
            console.log('Matched standalone amount:', match);
            const size = match[2] ? match[2] + ' ' : '';
            return {
                name: (size + match[3]).trim(),
                amount: match[1],
                unit: '',
                optional: cleanLine.toLowerCase().includes('optional')
            };
        }

        // Enhanced unit detection for common cooking units
        const enhancedUnitPattern = /^(.+?)\s+(cup|cups|tablespoon|tablespoons|tbsp|teaspoon|teaspoons|tsp|pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|g|kilogram|kg|clove|cloves|piece|pieces|slice|slices|can|cans|jar|jars|bottle|bottles|package|packages|bunch|bunches)\s*(.*)$/i;

        const unitMatch = cleanLine.match(enhancedUnitPattern);
        if (unitMatch) {
            console.log('Matched enhanced unit:', unitMatch);
            // Extract amount from the first part
            const firstPart = unitMatch[1].trim();
            const amountMatch = firstPart.match(/(\d+(?:\/\d+)?(?:\.\d+)?)(?:\s+(.*))?$/);

            if (amountMatch) {
                return {
                    name: (amountMatch[2] || '') + ' ' + (unitMatch[3] || '').trim(),
                    amount: amountMatch[1],
                    unit: unitMatch[2],
                    optional: cleanLine.toLowerCase().includes('optional')
                };
            } else {
                return {
                    name: unitMatch[3] || firstPart,
                    amount: '1',
                    unit: unitMatch[2],
                    optional: cleanLine.toLowerCase().includes('optional')
                };
            }
        }

        // If no pattern matches, try to extract any number from the beginning
        const fallbackPattern = /^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(.+)$/;
        const fallbackMatch = cleanLine.match(fallbackPattern);

        if (fallbackMatch) {
            console.log('Matched fallback pattern:', fallbackMatch);
            return {
                name: fallbackMatch[2].trim(),
                amount: fallbackMatch[1],
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
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
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
                            </button>
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
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    ← Back to Edit Text
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={onCancel}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUseRecipe}
                                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    >
                                        ✓ Use This Recipe
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}