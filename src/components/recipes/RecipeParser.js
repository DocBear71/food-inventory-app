'use client';
// file: /src/components/recipes/RecipeParser.js v6 - Enhanced with multi-part recipe parsing support

import {useState, useEffect, useRef, useCallback} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {
    parseIngredientLine,
    parseInstructionLine,
    extractMetadata,
    isIngredientLine,
    isInstructionLine,
    isIngredientSectionHeader,
    isInstructionSectionHeader,
    isHeaderLine,
    cleanTitle
} from '@/lib/recipe-parsing-utils';
import KeyboardOptimizedInput from '@/components/forms/KeyboardOptimizedInput';

// AutoExpandingTextarea component (moved outside to prevent re-creation)
const AutoExpandingTextarea = ({value, onChange, placeholder, className, ...props}) => {
    const textareaRef = useRef(null);

    const adjustHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.max(textarea.scrollHeight, 48)}px`;
        }
    }, []);

    useEffect(() => {
        adjustHeight();
    }, [value, adjustHeight]);

    const handleChange = useCallback((e) => {
        onChange(e);
        setTimeout(adjustHeight, 0);
    }, [onChange, adjustHeight]);

    return (
        <textarea
            ref={textareaRef}
            value={value || ''}
            onChange={handleChange}
            onInput={adjustHeight}
            placeholder={placeholder}
            className={`${className} resize-none overflow-hidden`}
            style={{minHeight: '48px'}}
            {...props}
        />
    );
};

export default function RecipeParser({onRecipeParsed, onCancel}) {
    const [rawText, setRawText] = useState('');
    const [parsedRecipe, setParsedRecipe] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [forceMultiPart, setForceMultiPart] = useState(false);
    const [detectedMultiPart, setDetectedMultiPart] = useState(false);

    // NEW: Multi-part recipe detection
    const detectMultiPartRecipe = useCallback((text) => {
        const multiPartIndicators = [
            // Common multi-part section headers
            /^(filling|topping|sauce|marinade|base|crust|dough|biscuit|pastry|glaze|frosting)/im,
            // Multiple sections with ingredients/instructions
            /(\w+\s*(ingredients?|preparation|instructions?):)/gi,
            // Numbered or lettered sections
            /^(part\s*\d+|section\s*[a-z]|step\s*[a-z])/im,
            // Recipe name followed by another recipe name
            /(recipe|for\s+the)\s*\w+.*\n.*\n.*(recipe|for\s+the)\s*\w+/i,
            // Multiple "For the" sections
            /(for\s+the\s+\w+)/gi
        ];

        const matches = multiPartIndicators.reduce((count, pattern) => {
            const result = text.match(pattern);
            return count + (result ? result.length : 0);
        }, 0);

        return matches >= 2; // Need at least 2 indicators for multi-part
    }, []);

    // Update detection when text changes
    useEffect(() => {
        const isMultiPart = detectMultiPartRecipe(rawText);
        setDetectedMultiPart(isMultiPart);
    }, [rawText, detectMultiPartRecipe]);

    // Enhanced parsing function with multi-part support
    const parseRecipeText = (text) => {
        console.log('🔍 Starting enhanced recipe parsing with multi-part support:', text.substring(0, 100) + '...');

        if (!text || text.trim().length === 0) {
            return null;
        }

        const shouldParseMultiPart = forceMultiPart || detectedMultiPart;

        if (shouldParseMultiPart) {
            console.log('🧩 Attempting multi-part recipe parsing');
            const multiPartResult = parseMultiPartRecipe(text);
            if (multiPartResult && multiPartResult.parts && multiPartResult.parts.length > 1) {
                console.log('✅ Successfully parsed as multi-part recipe with', multiPartResult.parts.length, 'parts');
                return multiPartResult;
            }
            console.log('⚠️ Multi-part parsing failed, falling back to single-part');
        }

        console.log('📝 Parsing as single-part recipe');
        return parseSinglePartRecipe(text);
    };

    // NEW: Multi-part recipe parsing
    const parseMultiPartRecipe = (text) => {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);

        // Initialize recipe object
        const recipe = {
            title: '',
            description: '',
            isMultiPart: true,
            parts: [],
            ingredients: [], // Empty for multi-part
            instructions: [], // Empty for multi-part
            prepTime: null,
            cookTime: null,
            servings: null,
            difficulty: 'medium',
            tags: [],
            source: 'Text Parser',
            isPublic: false,
            category: 'entrees',
            nutrition: {}
        };

        let currentPart = null;
        let currentSection = 'title';
        let hasProcessedTitle = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lowerLine = line.toLowerCase();

            // Extract title (first meaningful line)
            if (!hasProcessedTitle && line.length > 2 && !isHeaderLine(line) && !isRecipeSectionHeader(line)) {
                recipe.title = cleanTitle(line);
                hasProcessedTitle = true;
                continue;
            }

            // Check for recipe part headers (e.g., "Filling", "Biscuit Topping", "For the sauce")
            if (isRecipeSectionHeader(line)) {
                // Save previous part
                if (currentPart && (currentPart.ingredients.length > 0 || currentPart.instructions.length > 0)) {
                    recipe.parts.push(currentPart);
                }

                // Start new part
                currentPart = {
                    name: cleanPartName(line),
                    description: '',
                    ingredients: [],
                    instructions: [],
                    order: recipe.parts.length
                };
                currentSection = 'part_content';
                continue;
            }

            // Check for section headers within a part
            if (isIngredientSectionHeader(lowerLine)) {
                currentSection = 'ingredients';
                continue;
            }

            if (isInstructionSectionHeader(lowerLine)) {
                currentSection = 'instructions';
                continue;
            }

            // Process content based on current section
            switch (currentSection) {
                case 'title':
                case 'description':
                    if (line.length > 20 && !isIngredientLine(line) && !isInstructionLine(line)) {
                        recipe.description = recipe.description ? recipe.description + ' ' + line : line;
                    }
                    break;

                case 'part_content':
                case 'ingredients':
                    if (currentPart) {
                        if (isIngredientLine(line) || currentSection === 'ingredients') {
                            const ingredient = parseIngredientLine(line);
                            if (ingredient) {
                                currentPart.ingredients.push(ingredient);
                            }
                        } else if (isInstructionLine(line) && line.length > 10) {
                            // Auto-switch to instructions if we see instruction-like content
                            const instruction = parseInstructionLine(line, currentPart.instructions.length);
                            if (instruction) {
                                currentPart.instructions.push({
                                    step: currentPart.instructions.length + 1,
                                    instruction: instruction
                                });
                            }
                        }
                    }
                    break;

                case 'instructions':
                    if (currentPart) {
                        const instruction = parseInstructionLine(line, currentPart.instructions.length);
                        if (instruction) {
                            currentPart.instructions.push({
                                step: currentPart.instructions.length + 1,
                                instruction: instruction
                            });
                        }
                    }
                    break;
            }
        }

        // Add final part
        if (currentPart && (currentPart.ingredients.length > 0 || currentPart.instructions.length > 0)) {
            recipe.parts.push(currentPart);
        }

        // Extract metadata from full text
        extractMetadata(text, recipe);

        // Validate multi-part recipe
        if (recipe.parts.length === 0) {
            return null; // No parts found
        }

        // If only one part, might be better as single-part
        if (recipe.parts.length === 1 && !forceMultiPart) {
            return null; // Let single-part parser handle it
        }

        // Set default title if none found
        if (!recipe.title) {
            recipe.title = 'Multi-Part Recipe';
        }

        console.log(`🧩 Multi-part parsing results: ${recipe.parts.length} parts`);
        recipe.parts.forEach((part, index) => {
            console.log(`   Part ${index + 1}: "${part.name}" - ${part.ingredients.length} ingredients, ${part.instructions.length} instructions`);
        });

        return recipe;
    };

    // Enhanced single-part parsing using existing utilities
    const parseSinglePartRecipe = (text) => {
        console.log('📝 Parsing single-part recipe using enhanced utilities');

        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Initialize recipe object
        const recipe = {
            title: '',
            description: '',
            isMultiPart: false,
            parts: [],
            ingredients: [],
            instructions: [],
            prepTime: null,
            cookTime: null,
            servings: null,
            difficulty: 'medium',
            tags: [],
            source: 'Text Parser',
            isPublic: false,
            category: 'entrees',
            nutrition: {}
        };

        // Try structured format first (clear section headers)
        const structuredResult = parseStructuredFormat(lines, recipe);
        if (structuredResult.success) {
            console.log('✅ Successfully parsed structured format');
            return structuredResult.recipe;
        }

        // Try delimited format (--Ingredients--, --Instructions--, etc.)
        const delimitedResult = parseDelimitedFormat(text, recipe);
        if (delimitedResult.success) {
            console.log('✅ Successfully parsed delimited format');
            return delimitedResult.recipe;
        }

        // Fall back to smart auto-detection
        console.log('⚡ Using smart auto-detection parsing');
        return parseSmartAutoDetection(lines, recipe);
    };

    // Helper functions for parsing (keeping your existing logic)
    const parseStructuredFormat = (lines, recipe) => {
        let currentSection = 'title';
        let ingredientSectionFound = false;
        let instructionSectionFound = false;
        let hasProcessedTitle = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lowerLine = line.toLowerCase();

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

            switch (currentSection) {
                case 'title':
                    if (!hasProcessedTitle && line.length > 2) {
                        recipe.title = cleanTitle(line);
                        hasProcessedTitle = true;
                        currentSection = 'description';
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
                        recipe.instructions.push({
                            step: recipe.instructions.length + 1,
                            instruction: instruction
                        });
                    }
                    break;
            }
        }

        extractMetadata(lines.join('\n'), recipe);

        return {
            success: ingredientSectionFound && instructionSectionFound && recipe.ingredients.length > 0 && recipe.instructions.length > 0,
            recipe: ingredientSectionFound && instructionSectionFound ? recipe : null
        };
    };

    const parseDelimitedFormat = (text, recipe) => {
        const sections = text.split(/--([A-Za-z\s]+)--/);

        if (sections.length < 3) {
            return {success: false};
        }

        let hasIngredients = false;
        let hasInstructions = false;

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

    const parseSmartAutoDetection = (lines, recipe) => {
        let titleSet = false;
        const potentialIngredients = [];
        const potentialInstructions = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (!titleSet && !isHeaderLine(line) && line.length > 2) {
                recipe.title = cleanTitle(line);
                titleSet = true;
                continue;
            }

            if (isHeaderLine(line)) {
                continue;
            }

            if (isIngredientLine(line)) {
                const ingredient = parseIngredientLine(line);
                if (ingredient) {
                    potentialIngredients.push(ingredient);
                }
            } else if (isInstructionLine(line) && line.length > 10) {
                const instruction = parseInstructionLine(line, potentialInstructions.length);
                if (instruction) {
                    potentialInstructions.push({
                        step: potentialInstructions.length + 1,
                        instruction: instruction
                    });
                }
            } else if (!recipe.description && line.length > 20 && titleSet) {
                recipe.description = line;
            }
        }

        recipe.ingredients = potentialIngredients;
        recipe.instructions = potentialInstructions;

        extractMetadata(lines.join('\n'), recipe);

        if (!recipe.title) {
            recipe.title = 'Imported Recipe';
        }

        console.log(`📊 Auto-detection results: ${recipe.ingredients.length} ingredients, ${recipe.instructions.length} instructions`);

        return recipe;
    };

    // Helper parsing functions
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

    const parseInstructionsSection = (content) => {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        const instructions = [];

        for (const line of lines) {
            const instruction = parseInstructionLine(line, instructions.length);
            if (instruction) {
                instructions.push({
                    step: instructions.length + 1,
                    instruction: instruction
                });
            }
        }

        return instructions;
    };

    // NEW: Multi-part specific helpers
    const isRecipeSectionHeader = (line) => {
        const sectionPatterns = [
            /^(filling|topping|sauce|marinade|base|crust|dough|biscuit|pastry|glaze|frosting)/i,
            /^(for\s+the\s+\w+)/i,
            /^(\w+\s+topping|\w+\s+filling|\w+\s+sauce|\w+\s+dough|\w+\s+marinade)/i,
            /^(part\s*\d+|section\s*[a-z])/i
        ];

        return sectionPatterns.some(pattern => pattern.test(line)) &&
            !line.includes(':') &&
            line.length < 60; // Headers are usually short
    };

    const cleanPartName = (line) => {
        return line
            .replace(/^(for\s+the\s+)/i, '')
            .replace(/^\d+\.\s*/, '')
            .replace(/^[a-z]\.\s*/i, '')
            .trim()
            .replace(/\b\w/g, l => l.toUpperCase()); // Title case
    };

    // Main parsing handler
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

    // Field editing handlers
    const handleEditField = (field, value) => {
        setParsedRecipe(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleEditIngredient = (index, field, value, partIndex = null) => {
        setParsedRecipe(prev => {
            if (prev.isMultiPart && partIndex !== null) {
                // Edit ingredient in specific part
                const updatedParts = [...prev.parts];
                updatedParts[partIndex].ingredients[index] = {
                    ...updatedParts[partIndex].ingredients[index],
                    [field]: value
                };
                return {...prev, parts: updatedParts};
            } else {
                // Edit ingredient in single-part recipe
                return {
                    ...prev,
                    ingredients: prev.ingredients.map((ing, i) =>
                        i === index ? {...ing, [field]: value} : ing
                    )
                };
            }
        });
    };

    const handleEditInstruction = useCallback((index, value, partIndex = null) => {
        setParsedRecipe(prev => {
            if (prev.isMultiPart && partIndex !== null) {
                // Edit instruction in specific part
                const updatedParts = [...prev.parts];
                updatedParts[partIndex].instructions[index] = {
                    ...updatedParts[partIndex].instructions[index],
                    instruction: value
                };
                return {...prev, parts: updatedParts};
            } else {
                // Edit instruction in single-part recipe
                return {
                    ...prev,
                    instructions: prev.instructions.map((inst, i) =>
                        i === index ? {...inst, instruction: value} : inst
                    )
                };
            }
        });
    }, []);

    const handleEditPart = (partIndex, field, value) => {
        setParsedRecipe(prev => {
            const updatedParts = [...prev.parts];
            updatedParts[partIndex] = {
                ...updatedParts[partIndex],
                [field]: value
            };
            return {...prev, parts: updatedParts};
        });
    };

    // Example multi-part recipe text
    const exampleMultiPartText = `Chicken Pot Pie

Filling
Ingredients:
3 ea Onions, diced
3 ea Carrots, diced
2 bunches Celery, diced
1 qt Chicken stock
3 ea Potatoes, peeled & diced
5 lb Chicken, diced
1 bag Peas
1 qt Heavy cream
To Taste Salt
To Taste Pepper

Instructions:
1. In a medium stockpot, sweat the onions, carrots and celery until tender.
2. Add the chicken stock, diced potatoes and chicken; continue to cook until potatoes are tender.
3. Add the peas and heavy cream; reduce heat and cook until sauce has thickened.
4. Season to taste with the salt and pepper.
5. When thickened sufficiently, ladle into large dishes and top with the biscuit dough.
6. Bake in the broiler until biscuit is golden brown.

Biscuit Topping
Ingredients:
2 cup Flour
8 tbsp Butter
½ tsp Baking soda
¼ tsp Salt
As Needed Milk

Instructions:
1. Combine flour and butter; blend until only pea-sized crumbles remain.
2. Add the baking soda and salt, blend well
3. Slowly add in the milk; only add enough to form a soft dough.
4. Cover, label, store and refrigerate until needed.`;

    return (
        <div className="space-y-6">
            {!showPreview ? (
                // Input Phase
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        📝 Smart Recipe Text Parser
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Paste a recipe from anywhere! The smart parser can handle structured recipes, YouTube
                        transcripts,
                        unformatted text, and now <strong>multi-part recipes</strong> like pot pies with separate
                        fillings and toppings!
                    </p>

                    {/* NEW: Multi-part detection indicator */}
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-blue-900">✨ Enhanced Parsing Features:</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-blue-600">
                                    {detectedMultiPart ? '🧩 Multi-part detected' : '📝 Single-part detected'}
                                </span>
                            </div>
                        </div>
                        <ul className="text-blue-800 text-sm space-y-1">
                            <li>• <strong>Multi-part recipes</strong> with separate components (filling + topping)</li>
                            <li>• <strong>Structured recipes</strong> with "Ingredients:" and "Instructions:" headers
                            </li>
                            <li>• <strong>Delimited format</strong> with --Ingredients-- and --Instructions-- sections
                            </li>
                            <li>• <strong>Unstructured text</strong> from websites, messages, or documents</li>
                            <li>• <strong>YouTube transcripts</strong> - copy/paste video captions for recipe extraction
                            </li>
                            <li>• <strong>Smart detection</strong> - separates ingredients from instructions
                                automatically
                            </li>
                        </ul>
                    </div>

                    {/* Force multi-part toggle */}
                    <div
                        className="mb-4 flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={forceMultiPart}
                                    onChange={(e) => setForceMultiPart(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                                <span className="ml-2 text-sm font-medium text-purple-900">
                                    Force multi-part parsing
                                </span>
                            </label>
                            <p className="text-xs text-purple-700 mt-1">
                                Check this for recipes with multiple components that aren't auto-detected
                            </p>
                        </div>
                        <div className="text-purple-600 text-2xl">
                            🧩
                        </div>
                    </div>

                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start">
                            <div className="text-green-600 mr-3 mt-0.5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-green-900 mb-2">📺 YouTube Recipe Extraction</h3>
                                <p className="text-green-800 text-sm mb-3">
                                    Want to extract recipes from YouTube cooking videos? Follow these steps:
                                </p>
                                <div className="bg-green-100 rounded-lg p-3 mb-3">
                                    <h4 className="font-medium text-green-900 text-sm mb-2">How to get YouTube
                                        transcripts:</h4>
                                    <ol className="list-decimal list-inside text-green-800 text-sm space-y-1">
                                        <li>Open the YouTube video on desktop or mobile</li>
                                        <li>Click the "..." (more) menu below the video</li>
                                        <li>Select <strong>"Show transcript"</strong> or <strong>"Open
                                            transcript"</strong></li>
                                        <li>Copy all the transcript text</li>
                                        <li>Paste it in the text box below</li>
                                        <li>Let our AI extract the recipe automatically! 🤖</li>
                                    </ol>
                                </div>
                                <div className="flex items-center text-sm text-green-700">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd"
                                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                              clipRule="evenodd"/>
                                    </svg>
                                    <span><strong>Pro tip:</strong> Works great with complex recipes like pot pies that have multiple components!</span>
                                </div>
                            </div>
                        </div>
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
• Multi-part recipes (pot pie with filling + biscuit topping)
• YouTube video transcripts (copy from transcript feature)
• Bullet-pointed ingredients with pricing
• Clear section headers like 'Ingredients' and 'Instructions'
• Mixed format text from websites
• Copy-pasted recipes from anywhere!

The parser will automatically:
- Detect multi-part recipes with separate components
- Extract recipes from YouTube transcripts
- Remove pricing info like ($0.37)
- Detect ingredients vs instructions
- Extract serving size and cooking times
- Generate relevant tags"
                                className="w-full h-64 px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                style={{minHeight: '256px'}}
                            />
                        </div>

                        {/* Example button */}
                        <div className="flex items-center justify-between">
                            <TouchEnhancedButton
                                type="button"
                                onClick={() => setRawText(exampleMultiPartText)}
                                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                            >
                                📋 Load Example Multi-Part Recipe
                            </TouchEnhancedButton>

                            <div className="text-xs text-gray-500">
                                Auto-detects: {detectedMultiPart || forceMultiPart ? '🧩 Multi-part' : '📝 Single-part'}
                            </div>
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
                                        <div
                                            className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Parsing...
                                    </>
                                ) : (
                                    <>
                                        🧠 Smart Parse Recipe
                                        {(detectedMultiPart || forceMultiPart) &&
                                            <span className="text-xs">(Multi-part)</span>}
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
                            {/* Parsing Results Summary */}
                            <div className={`border rounded-lg p-4 ${parsedRecipe.isMultiPart ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'}`}>
                                <h3 className={`font-medium mb-2 ${parsedRecipe.isMultiPart ? 'text-purple-900' : 'text-green-900'}`}>
                                    📊 {parsedRecipe.isMultiPart ? '🧩 Multi-Part' : '📝 Single-Part'} Parsing Results
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    {parsedRecipe.isMultiPart ? (
                                        <>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-700">{parsedRecipe.parts.length}</div>
                                                <div className="text-purple-600">Recipe Parts</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-700">
                                                    {parsedRecipe.parts.reduce((total, part) => total + part.ingredients.length, 0)}
                                                </div>
                                                <div className="text-purple-600">Total Ingredients</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-700">
                                                    {parsedRecipe.parts.reduce((total, part) => total + part.instructions.length, 0)}
                                                </div>
                                                <div className="text-purple-600">Total Steps</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-700">{parsedRecipe.tags.length}</div>
                                                <div className="text-purple-600">Auto Tags</div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Basic info fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Recipe Title
                                    </label>
                                    <KeyboardOptimizedInput
                                        type="text"
                                        value={parsedRecipe.title}
                                        onChange={(e) => handleEditField('title', e.target.value)}
                                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        style={{minHeight: '48px'}}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Cook Time (minutes)
                                    </label>
                                    <KeyboardOptimizedInput
                                        type="number"
                                        value={parsedRecipe.cookTime || ''}
                                        onChange={(e) => handleEditField('cookTime', parseInt(e.target.value) || null)}
                                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        style={{minHeight: '48px'}}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Servings
                                    </label>
                                    <KeyboardOptimizedInput
                                        type="number"
                                        value={parsedRecipe.servings || ''}
                                        onChange={(e) => handleEditField('servings', parseInt(e.target.value) || null)}
                                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        style={{minHeight: '48px'}}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Prep Time (minutes)
                                    </label>
                                    <KeyboardOptimizedInput
                                        type="number"
                                        value={parsedRecipe.prepTime || ''}
                                        onChange={(e) => handleEditField('prepTime', parseInt(e.target.value) || null)}
                                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        style={{minHeight: '48px'}}
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
                                    style={{minHeight: '48px'}}
                                >
                                    <option value="entrees">Entrees</option>
                                    <option value="appetizers">Appetizers</option>
                                    <option value="side-dishes">Side Dishes</option>
                                    <option value="soups">Soups</option>
                                    <option value="desserts">Desserts</option>
                                    <option value="beverages">Beverages</option>
                                    <option value="breakfast">Breakfast</option>
                                    <option value="sauces">Sauces</option>
                                    <option value="seasonings">Seasonings</option>
                                    <option value="breads">Breads</option>
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <AutoExpandingTextarea
                                    value={parsedRecipe.description}
                                    onChange={(e) => handleEditField('description', e.target.value)}
                                    placeholder="Brief description of the recipe..."
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Recipe Content - Multi-part vs Single-part */}
                            {parsedRecipe.isMultiPart ? (
                                // Multi-part recipe display
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        🧩 Recipe Parts ({parsedRecipe.parts.length})
                                    </h3>
                                    <div className="space-y-6">
                                        {parsedRecipe.parts.map((part, partIndex) => (
                                            <div key={partIndex} className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                                                {/* Part header */}
                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-purple-900 mb-2">
                                                        Part {partIndex + 1} Name
                                                    </label>
                                                    <KeyboardOptimizedInput
                                                        type="text"
                                                        value={part.name}
                                                        onChange={(e) => handleEditPart(partIndex, 'name', e.target.value)}
                                                        className="w-full px-3 py-2 text-base border border-purple-300 rounded-md focus:ring-purple-500 focus:border-purple-500 bg-white"
                                                    />
                                                </div>

                                                {/* Part ingredients */}
                                                <div className="mb-4">
                                                    <h4 className="font-medium text-purple-900 mb-2">
                                                        Ingredients ({part.ingredients.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {part.ingredients.map((ingredient, ingredientIndex) => (
                                                            <div key={ingredientIndex} className="bg-white border border-purple-200 rounded p-3">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <label className="flex items-center text-sm text-purple-700">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={ingredient.optional || false}
                                                                            onChange={(e) => handleEditIngredient(ingredientIndex, 'optional', e.target.checked, partIndex)}
                                                                            className="h-4 w-4 text-purple-600 rounded"
                                                                        />
                                                                        <span className="ml-2">Optional</span>
                                                                    </label>
                                                                    <TouchEnhancedButton
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updatedParts = [...parsedRecipe.parts];
                                                                            updatedParts[partIndex].ingredients = updatedParts[partIndex].ingredients.filter((_, i) => i !== ingredientIndex);
                                                                            setParsedRecipe(prev => ({ ...prev, parts: updatedParts }));
                                                                        }}
                                                                        className="text-red-600 hover:text-red-700 p-1"
                                                                    >
                                                                        ✕
                                                                    </TouchEnhancedButton>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <KeyboardOptimizedInput
                                                                        type="text"
                                                                        value={ingredient.amount}
                                                                        onChange={(e) => handleEditIngredient(ingredientIndex, 'amount', e.target.value, partIndex)}
                                                                        placeholder="Amount"
                                                                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                                                    />
                                                                    <KeyboardOptimizedInput
                                                                        type="text"
                                                                        value={ingredient.unit}
                                                                        onChange={(e) => handleEditIngredient(ingredientIndex, 'unit', e.target.value, partIndex)}
                                                                        placeholder="Unit"
                                                                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                                                    />
                                                                    <KeyboardOptimizedInput
                                                                        type="text"
                                                                        value={ingredient.name}
                                                                        onChange={(e) => handleEditIngredient(ingredientIndex, 'name', e.target.value, partIndex)}
                                                                        placeholder="Ingredient name"
                                                                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <TouchEnhancedButton
                                                        type="button"
                                                        onClick={() => {
                                                            const updatedParts = [...parsedRecipe.parts];
                                                            updatedParts[partIndex].ingredients.push({ name: '', amount: '', unit: '', optional: false });
                                                            setParsedRecipe(prev => ({ ...prev, parts: updatedParts }));
                                                        }}
                                                        className="mt-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
                                                    >
                                                        + Add Ingredient
                                                    </TouchEnhancedButton>
                                                </div>

                                                {/* Part instructions */}
                                                <div>
                                                    <h4 className="font-medium text-purple-900 mb-2">
                                                        Instructions ({part.instructions.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {part.instructions.map((instruction, instructionIndex) => (
                                                            <div key={instructionIndex} className="bg-white border border-purple-200 rounded p-3">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <div className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium">
                                                                        {instruction.step}
                                                                    </div>
                                                                    <TouchEnhancedButton
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updatedParts = [...parsedRecipe.parts];
                                                                            updatedParts[partIndex].instructions = updatedParts[partIndex].instructions
                                                                                .filter((_, i) => i !== instructionIndex)
                                                                                .map((inst, i) => ({ ...inst, step: i + 1 }));
                                                                            setParsedRecipe(prev => ({ ...prev, parts: updatedParts }));
                                                                        }}
                                                                        className="text-red-600 hover:text-red-700 p-1"
                                                                    >
                                                                        ✕
                                                                    </TouchEnhancedButton>
                                                                </div>
                                                                <AutoExpandingTextarea
                                                                    value={instruction.instruction}
                                                                    onChange={(e) => handleEditInstruction(instructionIndex, e.target.value, partIndex)}
                                                                    placeholder={`Step ${instruction.step} instructions...`}
                                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <TouchEnhancedButton
                                                        type="button"
                                                        onClick={() => {
                                                            const updatedParts = [...parsedRecipe.parts];
                                                            const newStep = {
                                                                step: updatedParts[partIndex].instructions.length + 1,
                                                                instruction: ''
                                                            };
                                                            updatedParts[partIndex].instructions.push(newStep);
                                                            setParsedRecipe(prev => ({ ...prev, parts: updatedParts }));
                                                        }}
                                                        className="mt-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
                                                    >
                                                        + Add Step
                                                    </TouchEnhancedButton>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add new part button */}
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => {
                                            const newPart = {
                                                name: `Part ${parsedRecipe.parts.length + 1}`,
                                                description: '',
                                                ingredients: [],
                                                instructions: [],
                                                order: parsedRecipe.parts.length
                                            };
                                            setParsedRecipe(prev => ({
                                                ...prev,
                                                parts: [...prev.parts, newPart]
                                            }));
                                        }}
                                        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
                                    >
                                        + Add Recipe Part
                                    </TouchEnhancedButton>
                                </div>
                            ) : (
                                // Single-part recipe display
                                <>
                                    {/* Ingredients */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                            Ingredients ({parsedRecipe.ingredients.length})
                                        </h3>
                                        <div className="space-y-3 max-h-64 overflow-y-auto">
                                            {parsedRecipe.ingredients.map((ingredient, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <label className="flex items-center text-sm text-gray-600">
                                                            <input
                                                                type="checkbox"
                                                                checked={ingredient.optional || false}
                                                                onChange={(e) => handleEditIngredient(index, 'optional', e.target.checked)}
                                                                className="ingredient-checkbox h-4 w-4"
                                                            />
                                                            <span className="ml-3">Optional</span>
                                                        </label>
                                                        <TouchEnhancedButton
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = parsedRecipe.ingredients.filter((_, i) => i !== index);
                                                                setParsedRecipe(prev => ({ ...prev, ingredients: updated }));
                                                            }}
                                                            className="font-semibold text-red-600 hover:text-red-700 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                                        >
                                                            ✕
                                                        </TouchEnhancedButton>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <div className="flex gap-2 sm:w-auto">
                                                            <div className="flex-1 sm:w-20">
                                                                <KeyboardOptimizedInput
                                                                    type="text"
                                                                    value={ingredient.amount}
                                                                    onChange={(e) => handleEditIngredient(index, 'amount', e.target.value)}
                                                                    placeholder="Amount"
                                                                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded"
                                                                />
                                                            </div>
                                                            <div className="flex-1 sm:w-20">
                                                                <KeyboardOptimizedInput
                                                                    type="text"
                                                                    value={ingredient.unit}
                                                                    onChange={(e) => handleEditIngredient(index, 'unit', e.target.value)}
                                                                    placeholder="Unit"
                                                                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <KeyboardOptimizedInput
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

                                    {/* Instructions */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                            Instructions ({parsedRecipe.instructions.length})
                                        </h3>
                                        <div className="space-y-3 max-h-64 overflow-y-auto">
                                            {parsedRecipe.instructions.map((instruction, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-3">
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
                                                            className="font-semibold text-red-600 hover:text-red-700 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                                        >
                                                            ✕
                                                        </TouchEnhancedButton>
                                                    </div>
                                                    <AutoExpandingTextarea
                                                        value={instruction.instruction}
                                                        onChange={(e) => handleEditInstruction(index, e.target.value)}
                                                        placeholder={`Step ${instruction.step} instructions...`}
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
                                </>
                            )}

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tags (comma-separated)
                                </label>
                                <KeyboardOptimizedInput
                                    type="text"
                                    value={parsedRecipe.tags.join(', ')}
                                    onChange={(e) => handleEditField('tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                                    placeholder="italian, dinner, easy"
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{minHeight: '48px'}}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    ✨ Auto-generated tags based on recipe content using enhanced parsing
                                </p>
                            </div>

                            {/* Difficulty */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Difficulty
                                </label>
                                <select
                                    value={parsedRecipe.difficulty}
                                    onChange={(e) => handleEditField('difficulty', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{minHeight: '48px'}}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    🎯 Auto-determined based on complexity and instruction count
                                </p>
                            </div>

                            {/* Multi-part conversion option for single-part recipes */}
                            {!parsedRecipe.isMultiPart && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={false}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    // Convert to multi-part
                                                    setParsedRecipe(prev => ({
                                                        ...prev,
                                                        isMultiPart: true,
                                                        parts: [{
                                                            name: 'Main Recipe',
                                                            description: '',
                                                            ingredients: prev.ingredients,
                                                            instructions: prev.instructions,
                                                            order: 0
                                                        }],
                                                        ingredients: [],
                                                        instructions: []
                                                    }));
                                                }
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                        />
                                        <span className="ml-2 text-sm font-medium text-blue-900">
                                Convert to multi-part recipe
                            </span>
                                    </label>
                                    <p className="text-xs text-blue-700 mt-1">
                                        This will allow you to add separate components like toppings or sauces
                                    </p>
                                </div>
                            )}

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
                                        {parsedRecipe.isMultiPart && (
                                            <span className="ml-1 text-xs">(Multi-part)</span>
                                        )}
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