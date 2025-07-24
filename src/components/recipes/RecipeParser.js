'use client';
// file: /src/components/recipes/RecipeParser.js v5 - FIXED: Move AutoExpandingTextarea outside component

import { useState, useEffect, useRef, useCallback } from 'react';
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
import {KeyboardOptimizedInput} from '@/components/forms/KeyboardOptimizedInput';

// FIXED: Move AutoExpandingTextarea OUTSIDE the main component
const AutoExpandingTextarea = ({ value, onChange, placeholder, className, ...props }) => {
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
    }, [value, adjustHeight]); // Add value as dependency

    // FIXED: Use stable onChange handler
    const handleChange = useCallback((e) => {
        onChange(e);
        // Use setTimeout to ensure DOM update happens first
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
            style={{ minHeight: '48px' }}
            {...props}
        />
    );
};

export default function RecipeParser({ onRecipeParsed, onCancel }) {
    const [rawText, setRawText] = useState('');
    const [parsedRecipe, setParsedRecipe] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Enhanced parsing function with admin-level intelligence using shared utilities
    const parseRecipeText = (text) => {
        console.log('🔍 Starting enhanced recipe parsing using shared utilities:', text.substring(0, 100) + '...');

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

            // Detect section headers using shared utilities
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

        // Extract additional metadata using shared utility
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

            // Classify line as ingredient or instruction using shared utilities
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

        // Extract metadata using shared utility
        extractMetadata(lines.join('\n'), recipe);

        // Set default title if none found
        if (!recipe.title) {
            recipe.title = 'Imported Recipe';
        }

        console.log(`📊 Auto-detection results: ${recipe.ingredients.length} ingredients, ${recipe.instructions.length} instructions`);

        return recipe;
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

    // FIXED: Stable handleEditInstruction function
    const handleEditInstruction = useCallback((index, value) => {
        setParsedRecipe(prev => ({
            ...prev,
            instructions: prev.instructions.map((inst, i) =>
                i === index ? { ...inst, instruction: value } : inst
            )
        }));
    }, []); // Empty dependencies - this function is stable

    return (
        <div className="space-y-6">
            {!showPreview ? (
                // Input Phase
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        📝 Smart Recipe Text Parser
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Paste a recipe from anywhere! The smart parser can handle structured recipes, YouTube transcripts,
                        unformatted text, and more:
                    </p>

                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-medium text-blue-900 mb-2">✨ Supported Formats:</h3>
                        <ul className="text-blue-800 text-sm space-y-1">
                            <li>• <strong>Structured recipes</strong> with "Ingredients:" and "Instructions:" headers</li>
                            <li>• <strong>Delimited format</strong> with --Ingredients-- and --Instructions-- sections</li>
                            <li>• <strong>Unstructured text</strong> from websites, messages, or documents</li>
                            <li>• <strong>YouTube transcripts</strong> - copy/paste video captions for recipe extraction</li>
                            <li>• <strong>Pricing removal</strong> - automatically removes cost info like ($0.37)</li>
                            <li>• <strong>Smart detection</strong> - separates ingredients from instructions automatically</li>
                        </ul>
                    </div>

                    <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-start">
                            <div className="text-purple-600 mr-3 mt-0.5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-purple-900 mb-2">📺 YouTube Recipe Extraction</h3>
                                <p className="text-purple-800 text-sm mb-3">
                                    Want to extract recipes from YouTube cooking videos? Follow these steps:
                                </p>
                                <div className="bg-purple-100 rounded-lg p-3 mb-3">
                                    <h4 className="font-medium text-purple-900 text-sm mb-2">How to get YouTube transcripts:</h4>
                                    <ol className="list-decimal list-inside text-purple-800 text-sm space-y-1">
                                        <li>Open the YouTube video on desktop or mobile</li>
                                        <li>Click the "..." (more) menu below the video</li>
                                        <li>Select <strong>"Show transcript"</strong> or <strong>"Open transcript"</strong></li>
                                        <li>Copy all the transcript text</li>
                                        <li>Paste it in the text box below</li>
                                        <li>Let our AI extract the recipe automatically! 🤖</li>
                                    </ol>
                                </div>
                                <div className="flex items-center text-sm text-purple-700">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span><strong>Pro tip:</strong> Works best with cooking channels that clearly mention ingredients and steps!</span>
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
• YouTube video transcripts (copy from transcript feature)
• Bullet-pointed ingredients with pricing
• Clear section headers like 'Ingredients' and 'Instructions'
• Mixed format text from websites
• Copy-pasted recipes from anywhere!

The parser will automatically:
- Extract recipes from YouTube transcripts
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
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h3 className="font-medium text-green-900 mb-2">📊 Enhanced Parsing Results</h3>
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
                                        style={{ minHeight: '48px' }}
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
                                        style={{ minHeight: '48px' }}
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
                                        style={{ minHeight: '48px' }}
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
                                <AutoExpandingTextarea
                                    value={parsedRecipe.description}
                                    onChange={(e) => handleEditField('description', e.target.value)}
                                    placeholder="Brief description of the recipe..."
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Ingredients - Mobile Responsive */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Ingredients ({parsedRecipe.ingredients.length})
                                </h3>
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {parsedRecipe.ingredients.map((ingredient, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            {/* Top row: Optional checkbox and delete button */}
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

                                            {/* Input fields */}
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

                            {/* Instructions - FIXED */}
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
                                                    className="font-semibold text-red-600 hover:text-red-700 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                                >
                                                    ✕
                                                </TouchEnhancedButton>
                                            </div>

                                            {/* FIXED: Stable AutoExpandingTextarea */}
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
                                    style={{ minHeight: '48px' }}
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
                                    style={{ minHeight: '48px' }}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    🎯 Auto-determined based on complexity and instruction count
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