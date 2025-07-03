'use client';
// file: /src/components/recipes/RecipeParser.js v3 - IMPROVED SMART PARSING


import { useState } from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function RecipeParser({ onRecipeParsed, onCancel }) {
    const [rawText, setRawText] = useState('');
    const [parsedRecipe, setParsedRecipe] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Enhanced parsing function with admin-level intelligence
    const parseRecipeText = (text) => {
        console.log('🔍 Starting enhanced recipe parsing:', text.substring(0, 100) + '...');

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
            category: 'entrees',
            nutrition: {
                calories: '',
                protein: '',
                carbs: '',
                fat: '',
                fiber: ''
            }
        };

        // Step 1: Try to detect delimited format first (like admin system)
        const delimitedResult = parseDelimitedFormat(text, recipe);
        if (delimitedResult.success) {
            console.log('✅ Successfully parsed delimited format');
            return delimitedResult.recipe;
        }

        // Step 2: Try structured section parsing (Ingredients: / Instructions:)
        const structuredResult = parseStructuredFormat(lines, recipe);
        if (structuredResult.success) {
            console.log('✅ Successfully parsed structured format');
            return structuredResult.recipe;
        }

        // Step 3: Fall back to smart auto-detection
        console.log('⚡ Using smart auto-detection parsing');
        return parseSmartAutoDetection(lines, recipe);
    };

    // Parse delimited format (--Ingredients--, --Instructions--, etc.)
    const parseDelimitedFormat = (text, recipe) => {
        const sections = text.split(/--([A-Za-z\s]+)--/);

        if (sections.length < 3) {
            return { success: false };
        }

        let currentSection = null;
        let hasIngredients = false;
        let hasInstructions = false;

        // First section before any delimiter is usually the title
        const firstSection = sections[0].trim();
        if (firstSection) {
            const firstLines = firstSection.split('\n').filter(line => line.trim());
            if (firstLines.length > 0) {
                recipe.title = cleanTitle(firstLines[0]);
                if (firstLines.length > 1) {
                    recipe.description = firstLines.slice(1).join(' ').trim();
                }
            }
        }

        for (let i = 1; i < sections.length; i += 2) {
            const sectionName = sections[i].toLowerCase().trim();
            const sectionContent = sections[i + 1] ? sections[i + 1].trim() : '';

            switch (sectionName) {
                case 'description':
                    recipe.description = sectionContent;
                    break;
                case 'ingredients':
                    recipe.ingredients = parseIngredientsSection(sectionContent);
                    hasIngredients = true;
                    break;
                case 'instructions':
                case 'directions':
                case 'method':
                    recipe.instructions = parseInstructionsSection(sectionContent);
                    hasInstructions = true;
                    break;
                case 'tags':
                    recipe.tags = sectionContent.split(',').map(tag => tag.trim()).filter(tag => tag);
                    break;
            }
        }

        return {
            success: hasIngredients && hasInstructions,
            recipe: hasIngredients && hasInstructions ? recipe : null
        };
    };

    // Parse structured format (clear section headers)
    const parseStructuredFormat = (lines, recipe) => {
        let currentSection = 'title';
        let ingredientSectionFound = false;
        let instructionSectionFound = false;
        let hasProcessedTitle = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lowerLine = line.toLowerCase();

            // Detect section headers
            if (isIngredientSectionHeader(lowerLine)) {
                currentSection = 'ingredients';
                ingredientSectionFound = true;
                continue;
            }

            if (isInstructionSectionHeader(lowerLine)) {
                currentSection = 'instructions';
                instructionSectionFound = true;
                continue;
            }

            // Process content based on current section
            switch (currentSection) {
                case 'title':
                    if (!hasProcessedTitle && line.length > 2) {
                        recipe.title = cleanTitle(line);
                        hasProcessedTitle = true;
                        currentSection = 'description'; // Move to description after title
                    }
                    break;

                case 'description':
                    if (line.length > 10 && !isIngredientLine(line) && !isInstructionLine(line)) {
                        recipe.description = recipe.description ? recipe.description + ' ' + line : line;
                    }
                    break;

                case 'ingredients':
                    const ingredient = parseIngredientLine(line);
                    if (ingredient) {
                        recipe.ingredients.push(ingredient);
                    }
                    break;

                case 'instructions':
                    const instruction = parseInstructionLine(line, recipe.instructions.length);
                    if (instruction) {
                        recipe.instructions.push(instruction);
                    }
                    break;
            }
        }

        // Extract additional metadata
        extractMetadata(lines.join('\n'), recipe);

        return {
            success: ingredientSectionFound && instructionSectionFound && recipe.ingredients.length > 0 && recipe.instructions.length > 0,
            recipe: ingredientSectionFound && instructionSectionFound ? recipe : null
        };
    };

    // Smart auto-detection for unstructured text
    const parseSmartAutoDetection = (lines, recipe) => {
        let titleSet = false;
        const potentialIngredients = [];
        const potentialInstructions = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Set title from first non-header line
            if (!titleSet && !isHeaderLine(line) && line.length > 2) {
                recipe.title = cleanTitle(line);
                titleSet = true;
                continue;
            }

            // Skip obvious header/section lines
            if (isHeaderLine(line)) {
                continue;
            }

            // Classify line as ingredient or instruction
            if (isIngredientLine(line)) {
                const ingredient = parseIngredientLine(line);
                if (ingredient) {
                    potentialIngredients.push(ingredient);
                }
            } else if (isInstructionLine(line) && line.length > 10) {
                const instruction = parseInstructionLine(line, potentialInstructions.length);
                if (instruction) {
                    potentialInstructions.push(instruction);
                }
            } else if (!recipe.description && line.length > 20 && titleSet) {
                // Potential description
                recipe.description = line;
            }
        }

        recipe.ingredients = potentialIngredients;
        recipe.instructions = potentialInstructions;

        // Extract metadata
        extractMetadata(lines.join('\n'), recipe);

        // Set default title if none found
        if (!recipe.title) {
            recipe.title = 'Imported Recipe';
        }

        console.log(`📊 Auto-detection results: ${recipe.ingredients.length} ingredients, ${recipe.instructions.length} instructions`);

        return recipe;
    };

    // Helper: Check if line is a section header
    const isIngredientSectionHeader = (line) => {
        return /^(ingredients?|shopping\s+list|what\s+you.?ll\s+need):?\s*$/i.test(line) ||
            /^ingredients?\s*[-:]/i.test(line);
    };

    const isInstructionSectionHeader = (line) => {
        return /^(instructions?|directions?|method|steps?|preparation|how\s+to\s+make):?\s*$/i.test(line) ||
            /^(instructions?|directions?|method)\s*[-:]/i.test(line);
    };

    const isHeaderLine = (line) => {
        return isIngredientSectionHeader(line) || isInstructionSectionHeader(line);
    };

    // Enhanced ingredient line detection
    const isIngredientLine = (line) => {
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
    const isInstructionLine = (line) => {
        const lowerLine = line.toLowerCase();

        // Contains cooking verbs
        if (/\b(cook|bake|fry|sauté|saute|boil|simmer|mix|stir|add|combine|heat|preheat|serve|garnish|slice|dice|chop|prepare|remove|place|set|turn|cover|uncover|drain|rinse|wash|cut|blend|whisk|beat|fold|pour|spread|sprinkle|season)\b/i.test(line)) return true;

        // Contains time or temperature references
        if (/\b(\d+\s*(minutes?|mins?|hours?|hrs?|seconds?|secs?)|degrees?|°[CF]|\d+°)\b/i.test(line)) return true;

        // Starts with step indicators
        if (/^\d+[\.\)]\s/.test(line)) return true;

        // Longer descriptive sentences
        if (line.length > 30 && /\b(until|then|while|when|after|before|during)\b/i.test(line)) return true;

        return false;
    };

    // Enhanced ingredient parsing
    const parseIngredientLine = (line) => {
        if (!line || line.length < 2) return null;

        // Remove bullets, pricing, and clean the line
        let cleanLine = line
            .replace(/^[\*\-\•\d+\.\)]\s*/, '') // Remove bullets and numbers
            .replace(/\(\$[\d\.]+\)/g, '') // Remove pricing like ($0.37)
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        if (!cleanLine) return null;

        console.log('🥕 Parsing ingredient:', cleanLine);

        // Convert fraction characters
        cleanLine = convertFractions(cleanLine);

        // Try various parsing patterns
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
        match = cleanLine.match(/^(\d+(?:\/\d+)?(?:\.\d+)?(?:\s+\d+\/\d+)?)\s+(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|cloves?|slices?|pieces?|cans?|jars?|bottles?|small|medium|large|bunch|handful)\s+(.+)$/i);
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
            const unitMatch = secondPart.match(/^(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|cloves?|slices?|pieces?|cans?|jars?|bottles?)\s+(.+)$/i);
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
            const unitMatch = secondPart.match(/^(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|cloves?|slices?|pieces?|cans?|jars?|bottles?)\s+(.+)$/i);

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

    // Enhanced instruction parsing
    const parseInstructionLine = (line, stepNumber) => {
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

    // Parse ingredients section (for delimited format)
    const parseIngredientsSection = (content) => {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        const ingredients = [];

        for (const line of lines) {
            const ingredient = parseIngredientLine(line);
            if (ingredient) {
                ingredients.push(ingredient);
            }
        }

        return ingredients;
    };

    // Parse instructions section (for delimited format)
    const parseInstructionsSection = (content) => {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        const instructions = [];

        for (const line of lines) {
            const instruction = parseInstructionLine(line, instructions.length);
            if (instruction) {
                instructions.push(instruction);
            }
        }

        return instructions;
    };

    // Extract metadata (servings, times, tags)
    const extractMetadata = (text, recipe) => {
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
        if (recipe.instructions.length > 8 || text.includes('advanced') || text.includes('complex')) {
            recipe.difficulty = 'hard';
        } else if (recipe.instructions.length < 4 || text.includes('easy') || text.includes('simple') || text.includes('quick')) {
            recipe.difficulty = 'easy';
        }

        recipe.tags = Array.from(autoTags);
    };

    // Helper functions
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

    const cleanTitle = (text) => {
        return text
            .replace(/^recipe:?\s*/i, '')
            .replace(/\s*recipe$/i, '')
            .trim();
    };

    // Rest of the component remains the same...
    const handleParse = () => {
        setIsParsing(true);

        setTimeout(() => {
            const parsed = parseRecipeText(rawText);
            setParsedRecipe(parsed);
            setShowPreview(true);
            setIsParsing(false);
        }, 500);
    };

    const handleUseRecipe = () => {
        if (parsedRecipe) {
            onRecipeParsed(parsedRecipe);
        }
    };

    const handleEditField = (field, value) => {
        setParsedRecipe(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleEditIngredient = (index, field, value) => {
        setParsedRecipe(prev => ({
            ...prev,
            ingredients: prev.ingredients.map((ing, i) =>
                i === index ? { ...ing, [field]: value } : ing
            )
        }));
    };

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
                        📝 Smart Recipe Text Parser
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Paste a recipe from anywhere! The smart parser can handle:
                    </p>

                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-medium text-blue-900 mb-2">✨ Supported Formats:</h3>
                        <ul className="text-blue-800 text-sm space-y-1">
                            <li>• <strong>Structured recipes</strong> with "Ingredients:" and "Instructions:" headers</li>
                            <li>• <strong>Delimited format</strong> with --Ingredients-- and --Instructions-- sections</li>
                            <li>• <strong>Unstructured text</strong> from websites, messages, or documents</li>
                            <li>• <strong>Pricing removal</strong> - automatically removes cost info like ($0.37)</li>
                            <li>• <strong>Smart detection</strong> - separates ingredients from instructions automatically</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Recipe Text
                            </label>
                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder="Paste your recipe here...

Examples that work great:
• Bullet-pointed ingredients with pricing
• Clear section headers like 'Ingredients' and 'Instructions'
• Mixed format text from websites
• Copy-pasted recipes from anywhere!

The parser will automatically:
- Remove pricing info like ($0.37)
- Detect ingredients vs instructions
- Extract serving size and cooking times
- Generate relevant tags"
                                className="w-full h-64 px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                style={{ minHeight: '256px' }}
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between gap-3">
                            <TouchEnhancedButton
                                onClick={onCancel}
                                className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 min-h-[48px] order-2 sm:order-1"
                            >
                                Cancel
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={handleParse}
                                disabled={!rawText.trim() || isParsing}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2 min-h-[48px] order-1 sm:order-2"
                            >
                                {isParsing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Parsing...
                                    </>
                                ) : (
                                    <>
                                        🧠 Smart Parse Recipe
                                    </>
                                )}
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            ) : (
                // Preview Phase - keeping the existing preview UI
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        ✨ Parsed Recipe Preview
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Review and edit the extracted information before adding to your recipe collection.
                    </p>

                    {parsedRecipe && (
                        <div className="space-y-6">
                            {/* Parsing Results Summary */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h3 className="font-medium text-green-900 mb-2">📊 Parsing Results</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-green-700">{parsedRecipe.ingredients.length}</div>
                                        <div className="text-green-600">Ingredients</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-green-700">{parsedRecipe.instructions.length}</div>
                                        <div className="text-green-600">Instructions</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-green-700">{parsedRecipe.tags.length}</div>
                                        <div className="text-green-600">Auto Tags</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-green-700">{parsedRecipe.servings || 'N/A'}</div>
                                        <div className="text-green-600">Servings</div>
                                    </div>
                                </div>
                            </div>

                            {/* Rest of preview form - keeping existing structure but with mobile responsive updates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Recipe Title
                                    </label>
                                    <input
                                        type="text"
                                        value={parsedRecipe.title}
                                        onChange={(e) => handleEditField('title', e.target.value)}
                                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        style={{ minHeight: '48px' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Cook Time (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={parsedRecipe.cookTime || ''}
                                        onChange={(e) => handleEditField('cookTime', parseInt(e.target.value) || null)}
                                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        style={{ minHeight: '48px' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Servings
                                    </label>
                                    <input
                                        type="number"
                                        value={parsedRecipe.servings || ''}
                                        onChange={(e) => handleEditField('servings', parseInt(e.target.value) || null)}
                                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        style={{ minHeight: '48px' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Prep Time (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={parsedRecipe.prepTime || ''}
                                        onChange={(e) => handleEditField('prepTime', parseInt(e.target.value) || null)}
                                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        style={{ minHeight: '48px' }}
                                    />
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <select
                                    value={parsedRecipe.category}
                                    onChange={(e) => handleEditField('category', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={parsedRecipe.description}
                                    onChange={(e) => handleEditField('description', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 resize-none overflow-hidden"
                                    style={{ minHeight: '48px' }}
                                />
                            </div>

                            {/* Ingredients - Mobile Responsive */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Ingredients ({parsedRecipe.ingredients.length})
                                </h3>
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {parsedRecipe.ingredients.map((ingredient, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-3">
                                            {/* Top row: Optional checkbox and delete button */}
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="flex items-center text-sm text-gray-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={ingredient.optional || false}
                                                        onChange={(e) => handleEditIngredient(index, 'optional', e.target.checked)}
                                                        className="mr-2 h-4 w-4"
                                                    />
                                                    Optional
                                                </label>
                                                <TouchEnhancedButton
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = parsedRecipe.ingredients.filter((_, i) => i !== index);
                                                        setParsedRecipe(prev => ({ ...prev, ingredients: updated }));
                                                    }}
                                                    className="text-red-500 hover:text-red-700 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                                >
                                                    ✕
                                                </TouchEnhancedButton>
                                            </div>

                                            {/* Input fields */}
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <div className="flex gap-2 sm:w-auto">
                                                    <div className="flex-1 sm:w-20">
                                                        <input
                                                            type="text"
                                                            value={ingredient.amount}
                                                            onChange={(e) => handleEditIngredient(index, 'amount', e.target.value)}
                                                            placeholder="Amount"
                                                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded"
                                                        />
                                                    </div>
                                                    <div className="flex-1 sm:w-20">
                                                        <input
                                                            type="text"
                                                            value={ingredient.unit}
                                                            onChange={(e) => handleEditIngredient(index, 'unit', e.target.value)}
                                                            placeholder="Unit"
                                                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        value={ingredient.name}
                                                        onChange={(e) => handleEditIngredient(index, 'name', e.target.value)}
                                                        placeholder="Ingredient name"
                                                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <TouchEnhancedButton
                                    type="button"
                                    onClick={() => {
                                        const newIngredient = { name: '', amount: '', unit: '', optional: false };
                                        setParsedRecipe(prev => ({
                                            ...prev,
                                            ingredients: [...prev.ingredients, newIngredient]
                                        }));
                                    }}
                                    className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium px-3 py-2"
                                >
                                    + Add Ingredient
                                </TouchEnhancedButton>
                            </div>

                            {/* Instructions - Mobile Responsive */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Instructions ({parsedRecipe.instructions.length})
                                </h3>
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {parsedRecipe.instructions.map((instruction, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-3">
                                            {/* Top row: Step number and delete button */}
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                                                    {instruction.step}
                                                </div>
                                                <TouchEnhancedButton
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = parsedRecipe.instructions
                                                            .filter((_, i) => i !== index)
                                                            .map((inst, i) => ({ ...inst, step: i + 1 }));
                                                        setParsedRecipe(prev => ({ ...prev, instructions: updated }));
                                                    }}
                                                    className="text-red-500 hover:text-red-700 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                                >
                                                    ✕
                                                </TouchEnhancedButton>
                                            </div>

                                            {/* Textarea */}
                                            <textarea
                                                value={instruction.instruction}
                                                onChange={(e) => handleEditInstruction(index, e.target.value)}
                                                rows={2}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <TouchEnhancedButton
                                    type="button"
                                    onClick={() => {
                                        const newInstruction = {
                                            step: parsedRecipe.instructions.length + 1,
                                            instruction: ''
                                        };
                                        setParsedRecipe(prev => ({
                                            ...prev,
                                            instructions: [...prev.instructions, newInstruction]
                                        }));
                                    }}
                                    className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium px-3 py-2"
                                >
                                    + Add Step
                                </TouchEnhancedButton>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tags (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={parsedRecipe.tags.join(', ')}
                                    onChange={(e) => handleEditField('tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                                    placeholder="italian, dinner, easy"
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    ✨ Auto-generated tags based on recipe content
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row justify-between pt-4 border-t gap-3">
                                <TouchEnhancedButton
                                    onClick={() => setShowPreview(false)}
                                    className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 min-h-[48px] order-3 sm:order-1"
                                >
                                    ← Back to Edit Text
                                </TouchEnhancedButton>
                                <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
                                    <TouchEnhancedButton
                                        onClick={onCancel}
                                        className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 min-h-[48px] order-2 sm:order-1"
                                    >
                                        Cancel
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        onClick={handleUseRecipe}
                                        className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 min-h-[48px] order-1 sm:order-2"
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