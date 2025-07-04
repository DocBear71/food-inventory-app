'use client';
// file: /src/components/recipes/EnhancedRecipeForm.js v5 - MOBILE RESPONSIVE LAYOUT


import { useState, useEffect, useRef } from 'react';
import RecipeParser from './RecipeParser';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { getApiUrl } from '@/lib/api-config';

export default function EnhancedRecipeForm({ initialData, onSubmit, onCancel, isEditing = false }) {
    const [inputMethod, setInputMethod] = useState('manual'); // 'manual', 'parser', 'url'
    const [showParser, setShowParser] = useState(false);
    const [showUrlImport, setShowUrlImport] = useState(false);

    const CATEGORY_OPTIONS = [
        { value: 'seasonings', label: 'Seasonings' },
        { value: 'sauces', label: 'Sauces' },
        { value: 'salad-dressings', label: 'Salad Dressings' },
        { value: 'marinades', label: 'Marinades' },
        { value: 'ingredients', label: 'Basic Ingredients' },
        { value: 'entrees', label: 'Entrees' },
        { value: 'side-dishes', label: 'Side Dishes' },
        { value: 'soups', label: 'Soups' },
        { value: 'sandwiches', label: 'Sandwiches' },
        { value: 'appetizers', label: 'Appetizers' },
        { value: 'desserts', label: 'Desserts' },
        { value: 'breads', label: 'Breads' },
        { value: 'pizza-dough', label: 'Pizza Dough' },
        { value: 'specialty-items', label: 'Specialty Items' },
        { value: 'beverages', label: 'Beverages' },
        { value: 'breakfast', label: 'Breakfast' }
    ];

    // Recipe form state
    const [recipe, setRecipe] = useState({
        title: '',
        description: '',
        ingredients: [{ name: '', amount: '', unit: '', optional: false }],
        instructions: [{ step: 1, instruction: '' }],
        prepTime: '',
        cookTime: '',
        servings: '',
        difficulty: 'medium',
        tags: [],
        source: '',
        isPublic: false,
        category: 'entrees',
        nutrition: {
            calories: '',
            protein: '',
            carbs: '',
            fat: '',
            fiber: ''
        },
        ...initialData
    });

    const [tagInput, setTagInput] = useState('');
    // FIXED: Add state for tags string to prevent comma parsing issues
    const [tagsString, setTagsString] = useState(
        initialData?.tags ? initialData.tags.join(', ') : ''
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // URL import state
    const [urlInput, setUrlInput] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState('');

    // Auto-expanding textarea hook
    const useAutoExpandingTextarea = () => {
        const textareaRef = useRef(null);

        const adjustHeight = () => {
            const textarea = textareaRef.current;
            if (textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = `${Math.max(textarea.scrollHeight, 48)}px`;
            }
        };

        useEffect(() => {
            adjustHeight();
        });

        return [textareaRef, adjustHeight];
    };

    // Helper function to clean nutrition values (remove units)
    const cleanNutritionValue = (value) => {
        if (!value) return '';

        // Extract just the number from strings like "203 kcal", "12 g", "9 mg"
        const strValue = String(value);
        const match = strValue.match(/^(\d+(?:\.\d+)?)/);
        return match ? match[1] : '';
    };

    // Handle parsed recipe data
    const handleParsedRecipe = (parsedData) => {
        setRecipe(prevRecipe => ({
            ...prevRecipe,
            title: parsedData.title || prevRecipe.title,
            description: parsedData.description || prevRecipe.description,
            ingredients: parsedData.ingredients.length > 0 ? parsedData.ingredients : prevRecipe.ingredients,
            instructions: parsedData.instructions.length > 0 ? parsedData.instructions : prevRecipe.instructions,
            prepTime: parsedData.prepTime || prevRecipe.prepTime,
            cookTime: parsedData.cookTime || prevRecipe.cookTime,
            servings: parsedData.servings || prevRecipe.servings,
            tags: [...new Set([...prevRecipe.tags, ...parsedData.tags])], // Merge tags
            source: parsedData.source || prevRecipe.source,
            nutrition: parsedData.nutrition || prevRecipe.nutrition
        }));

        // Update tags string as well
        const allTags = [...new Set([...recipe.tags, ...parsedData.tags])];
        setTagsString(allTags.join(', '));

        setShowParser(false);
        setInputMethod('manual'); // Switch back to manual editing
    };

    // Enhanced URL import with smart parsing
    const handleUrlImport = async (url) => {
        if (!url || !url.trim()) {
            setImportError('Please enter a valid URL');
            return;
        }

        setIsImporting(true);
        setImportError('');

        try {
            console.log('Importing recipe from URL:', url);

            const response = await fetch(getApiUrl('/api/recipes/scrape'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url.trim() })
            });

            const data = await response.json();

            if (data.success) {
                console.log('Successfully imported recipe:', data.recipe);

                // ENHANCED: Use smart parsing for ingredients like RecipeParser
                const parseImportedIngredients = (ingredients) => {
                    if (!ingredients || !Array.isArray(ingredients)) return [{ name: '', amount: '', unit: '', optional: false }];

                    return ingredients.map(ingredient => {
                        // If ingredient is already parsed as object, use it
                        if (typeof ingredient === 'object' && ingredient.name) {
                            return {
                                name: ingredient.name || '',
                                amount: ingredient.amount || '',
                                unit: ingredient.unit || '',
                                optional: ingredient.optional || false
                            };
                        }

                        // If ingredient is a string, parse it using RecipeParser logic
                        const ingredientString = typeof ingredient === 'string' ? ingredient : (ingredient.name || '');
                        return parseIngredientLine(ingredientString);
                    }).filter(ing => ing && ing.name); // Remove any null results
                };

                // ENHANCED: Use smart parsing for instructions
                const parseImportedInstructions = (instructions) => {
                    if (!instructions || !Array.isArray(instructions)) return [{ step: 1, instruction: '' }];

                    return instructions.map((instruction, index) => {
                        const instructionText = typeof instruction === 'string' ? instruction : (instruction.instruction || instruction);
                        const cleanInstruction = parseInstructionLine(instructionText, index);
                        return cleanInstruction || { step: index + 1, instruction: instructionText };
                    }).filter(inst => inst && inst.instruction);
                };

                // Transform scraped data with enhanced parsing
                const importedRecipe = {
                    title: data.recipe.title || '',
                    description: data.recipe.description || '',
                    ingredients: parseImportedIngredients(data.recipe.ingredients),
                    instructions: parseImportedInstructions(data.recipe.instructions),
                    prepTime: data.recipe.prepTime || '',
                    cookTime: data.recipe.cookTime || '',
                    servings: data.recipe.servings || '',
                    difficulty: data.recipe.difficulty || 'medium',
                    tags: data.recipe.tags || [],
                    source: data.recipe.source || url,
                    isPublic: false, // Default to private, user can change
                    category: 'entrees',
                    nutrition: {
                        // Convert from structured format to simple values for form
                        calories: data.recipe.nutrition?.calories?.value || '',
                        protein: data.recipe.nutrition?.protein?.value || '',
                        carbs: data.recipe.nutrition?.carbs?.value || '',
                        fat: data.recipe.nutrition?.fat?.value || '',
                        fiber: data.recipe.nutrition?.fiber?.value || ''
                    }
                };

                setRecipe(importedRecipe);
                // Update tags string
                setTagsString(importedRecipe.tags.join(', '));
                setShowUrlImport(false);
                setInputMethod('manual'); // Switch to manual editing
                setUrlInput(''); // Clear the URL input
            } else {
                console.error('Import failed:', data.error);
                setImportError(data.error || 'Failed to import recipe from URL');
            }
        } catch (error) {
            console.error('URL import error:', error);
            setImportError('Network error. Please check your connection and try again.');
        } finally {
            setIsImporting(false);
        }
    };

    // ENHANCED PARSING FUNCTIONS (from RecipeParser)
    // Enhanced ingredient parsing (same logic as RecipeParser)
    const parseIngredientLine = (line) => {
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

        console.log('🥕 Parsing URL import ingredient:', cleanLine);

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
        match = cleanLine.match(/^(\d+(?:\/\d+)?(?:\.\d+)?(?:\s+\d+\/\d+)?)\s+(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|cloves?|ribs?|stalks?|sprigs?|leaves?|bulbs?|heads?|ears?|slices?|pieces?|cans?|jars?|bottles?|small|medium|large|bunch|handful)\s+(.+)$/i);
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
            const unitMatch = secondPart.match(/^(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|cloves?|ribs?|stalks?|sprigs?|leaves?|bulbs?|heads?|ears?|slices?|pieces?|cans?|jars?|bottles?)\s+(.+)$/i);
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
            const unitMatch = secondPart.match(/^(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|cloves?|ribs?|stalks?|sprigs?|leaves?|bulbs?|heads?|ears?|slices?|pieces?|cans?|jars?|bottles?)\s+(.+)$/i);

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

    // Enhanced instruction parsing (same logic as RecipeParser)
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

    // Helper function for fraction conversion
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

    // Original manual form handlers
    const updateRecipe = (field, value) => {
        setRecipe(prev => ({ ...prev, [field]: value }));
    };

    const updateNutrition = (field, value) => {
        setRecipe(prev => ({
            ...prev,
            nutrition: { ...prev.nutrition, [field]: value }
        }));
    };

    const addIngredient = () => {
        setRecipe(prev => ({
            ...prev,
            ingredients: [...prev.ingredients, { name: '', amount: '', unit: '', optional: false }]
        }));
    };

    const updateIngredient = (index, field, value) => {
        setRecipe(prev => ({
            ...prev,
            ingredients: prev.ingredients.map((ing, i) =>
                i === index ? { ...ing, [field]: value } : ing
            )
        }));
    };

    const removeIngredient = (index) => {
        setRecipe(prev => ({
            ...prev,
            ingredients: prev.ingredients.filter((_, i) => i !== index)
        }));
    };

    const addInstruction = () => {
        setRecipe(prev => ({
            ...prev,
            instructions: [...prev.instructions, { step: prev.instructions.length + 1, instruction: '' }]
        }));
    };

    const updateInstruction = (index, value) => {
        setRecipe(prev => ({
            ...prev,
            instructions: prev.instructions.map((inst, i) =>
                i === index ? { ...inst, instruction: value } : inst
            )
        }));
    };

    const removeInstruction = (index) => {
        setRecipe(prev => ({
            ...prev,
            instructions: prev.instructions
                .filter((_, i) => i !== index)
                .map((inst, i) => ({ ...inst, step: i + 1 }))
        }));
    };

    const addTag = () => {
        if (tagInput.trim() && !recipe.tags.includes(tagInput.trim())) {
            const newTags = [...recipe.tags, tagInput.trim()];
            setRecipe(prev => ({
                ...prev,
                tags: newTags
            }));
            setTagsString(newTags.join(', '));
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        const newTags = recipe.tags.filter(tag => tag !== tagToRemove);
        setRecipe(prev => ({
            ...prev,
            tags: newTags
        }));
        setTagsString(newTags.join(', '));
    };

    // FIXED: Handle tags string changes without immediately parsing
    const handleTagsStringChange = (value) => {
        setTagsString(value);
    };

    // FIXED: Process tags string on blur
    const handleTagsStringBlur = () => {
        const tags = tagsString
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        setRecipe(prev => ({
            ...prev,
            tags: tags
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Make sure tags are processed from the string before submitting
            const finalTags = tagsString
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            const finalRecipe = {
                ...recipe,
                tags: finalTags
            };

            await onSubmit(finalRecipe);
        } catch (error) {
            console.error('Error submitting recipe:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto-expanding textarea component
    const AutoExpandingTextarea = ({ value, onChange, placeholder, className, ...props }) => {
        const [textareaRef, adjustHeight] = useAutoExpandingTextarea();

        return (
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                    onChange(e);
                    setTimeout(adjustHeight, 0);
                }}
                onInput={adjustHeight}
                placeholder={placeholder}
                className={`${className} resize-none overflow-hidden`}
                style={{ minHeight: '48px' }}
                {...props}
            />
        );
    };

    // Show parser component
    if (showParser) {
        return (
            <RecipeParser
                onRecipeParsed={handleParsedRecipe}
                onCancel={() => setShowParser(false)}
            />
        );
    }

    // Show URL import component
    if (showUrlImport) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    🌐 Import from URL
                </h2>
                <p className="text-gray-600 mb-4">
                    Import recipes directly from cooking websites like AllRecipes, Food Network, Epicurious, and more.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Recipe URL
                        </label>
                        <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => {
                                setUrlInput(e.target.value);
                                setImportError(''); // Clear error when user types
                            }}
                            placeholder="https://www.allrecipes.com/recipe/..."
                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            style={{ minHeight: '48px' }}
                            disabled={isImporting}
                        />
                    </div>

                    {importError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="text-sm text-red-800">
                                <strong>Import Failed:</strong> {importError}
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm text-blue-800">
                            <strong>✨ Supported Sites:</strong> AllRecipes, Food Network, Epicurious, Simply Recipes,
                            Cookist, Delish, Taste of Home, The Kitchn, Bon Appétit, and many more recipe websites.
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
                        <TouchEnhancedButton
                            onClick={() => {
                                setShowUrlImport(false);
                                setUrlInput('');
                                setImportError('');
                            }}
                            className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 min-h-[48px] text-center"
                            disabled={isImporting}
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <TouchEnhancedButton
                                onClick={() => {
                                    setShowUrlImport(false);
                                    setShowParser(true);
                                    setUrlInput('');
                                    setImportError('');
                                }}
                                className="px-4 py-3 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 min-h-[48px] text-center"
                                disabled={isImporting}
                            >
                                📝 Use Text Parser Instead
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => handleUrlImport(urlInput)}
                                disabled={!urlInput.trim() || isImporting}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2 min-h-[48px]"
                            >
                                {isImporting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        🌐 Import Recipe
                                    </>
                                )}
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Input Method Selection */}
            {!isEditing && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        How would you like to add this recipe?
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <TouchEnhancedButton
                            onClick={() => setInputMethod('manual')}
                            className={`p-4 border-2 rounded-lg text-left transition-colors min-h-[120px] ${
                                inputMethod === 'manual'
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className="text-2xl mb-2">✏️</div>
                            <h3 className="font-medium text-gray-900">Manual Entry</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Enter recipe details step by step
                            </p>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => setShowParser(true)}
                            className="p-4 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-colors min-h-[120px]"
                        >
                            <div className="text-2xl mb-2">📝</div>
                            <h3 className="font-medium text-gray-900">Parse Recipe Text</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Paste recipe text and auto-extract details
                            </p>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => setShowUrlImport(true)}
                            className="p-4 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-colors min-h-[120px]"
                        >
                            <div className="text-2xl mb-2">🌐</div>
                            <h3 className="font-medium text-gray-900">Import from URL</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Import from recipe websites automatically
                            </p>
                        </TouchEnhancedButton>
                    </div>

                    {inputMethod === 'manual' && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                💡 <strong>Tip:</strong> You can always switch to the text parser or URL import if you have a recipe to import!
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Manual Recipe Form */}
            {(inputMethod === 'manual' || isEditing) && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                            {!isEditing && (
                                <div className="flex flex-wrap gap-2">
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setShowParser(true)}
                                        className="text-sm text-indigo-600 hover:text-indigo-700 px-3 py-2 min-h-[44px]"
                                    >
                                        📝 Text Parser
                                    </TouchEnhancedButton>
                                    <span className="text-gray-300 hidden sm:inline">|</span>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setShowUrlImport(true)}
                                        className="text-sm text-indigo-600 hover:text-indigo-700 px-3 py-2 min-h-[44px]"
                                    >
                                        🌐 URL Import
                                    </TouchEnhancedButton>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Recipe Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={recipe.title}
                                    onChange={(e) => updateRecipe('title', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                    placeholder="Enter recipe title..."
                                />
                            </div>

                            {/* Category Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <select
                                    value={recipe.category || 'entrees'}
                                    onChange={(e) => updateRecipe('category', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                >
                                    {CATEGORY_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <AutoExpandingTextarea
                                    value={recipe.description}
                                    onChange={(e) => updateRecipe('description', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Brief description of the recipe..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Prep Time (minutes)
                                </label>
                                <input
                                    type="number"
                                    value={recipe.prepTime}
                                    onChange={(e) => updateRecipe('prepTime', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                    placeholder="15"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cook Time (minutes)
                                </label>
                                <input
                                    type="number"
                                    value={recipe.cookTime}
                                    onChange={(e) => updateRecipe('cookTime', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                    placeholder="30"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Servings
                                </label>
                                <input
                                    type="number"
                                    value={recipe.servings}
                                    onChange={(e) => updateRecipe('servings', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                    placeholder="4"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Difficulty
                                </label>
                                <select
                                    value={recipe.difficulty}
                                    onChange={(e) => updateRecipe('difficulty', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Ingredients - MOBILE RESPONSIVE */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Ingredients ({recipe.ingredients.length})
                        </h3>

                        <div className="space-y-4">
                            {recipe.ingredients.map((ingredient, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    {/* Top row: Optional checkbox and Delete button */}
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="flex items-center text-sm text-gray-600 pl-2"> {/* Add pl-2 for left padding */}
                                            <input
                                                type="checkbox"
                                                checked={ingredient.optional}
                                                onChange={(e) => updateIngredient(index, 'optional', e.target.checked)}
                                                className="ingredient-checkbox h-4 w-4"
                                            />
                                            <span className="ml-3">Optional</span>
                                        </label>
                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={() => removeIngredient(index)}
                                            className="font-semibold text-red-600 hover:text-red-700 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                            disabled={recipe.ingredients.length === 1}
                                        >
                                            ✕
                                        </TouchEnhancedButton>
                                    </div>

                                    {/* Input fields */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {/* Amount and Unit row on mobile, side by side */}
                                        <div className="flex gap-3 sm:w-auto">
                                            <div className="flex-1 sm:w-24">
                                                <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">
                                                    Amount
                                                </label>
                                                <input
                                                    type="text"
                                                    value={ingredient.amount}
                                                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                                                    placeholder="1"
                                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{ minHeight: '48px' }}
                                                />
                                            </div>
                                            <div className="flex-1 sm:w-24">
                                                <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">
                                                    Unit
                                                </label>
                                                <input
                                                    type="text"
                                                    value={ingredient.unit}
                                                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                                                    placeholder="cup"
                                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{ minHeight: '48px' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Ingredient name - full width on mobile */}
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">
                                                Ingredient
                                            </label>
                                            <input
                                                type="text"
                                                value={ingredient.name}
                                                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                                                placeholder="Ingredient name"
                                                className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ minHeight: '48px' }}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <TouchEnhancedButton
                            type="button"
                            onClick={addIngredient}
                            className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium px-4 py-3 min-h-[48px]"
                        >
                            + Add Ingredient
                        </TouchEnhancedButton>
                    </div>

                    {/* Instructions - MOBILE RESPONSIVE */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Instructions ({recipe.instructions.length})
                        </h3>

                        <div className="space-y-4">
                            {recipe.instructions.map((instruction, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    {/* Top row: Step number and Delete button */}
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                                            {instruction.step}
                                        </div>
                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={() => removeInstruction(index)}
                                            className="font-semibold text-red-600 hover:text-red-700 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                            disabled={recipe.instructions.length === 1}
                                        >
                                            ✕
                                        </TouchEnhancedButton>
                                    </div>

                                    {/* Textarea - full width */}
                                    <AutoExpandingTextarea
                                        value={instruction.instruction}
                                        onChange={(e) => updateInstruction(index, e.target.value)}
                                        placeholder="Describe this step..."
                                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    />
                                </div>
                            ))}
                        </div>

                        <TouchEnhancedButton
                            type="button"
                            onClick={addInstruction}
                            className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium px-4 py-3 min-h-[48px]"
                        >
                            + Add Step
                        </TouchEnhancedButton>
                    </div>

                    {/* Tags - MOBILE RESPONSIVE */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {recipe.tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-2 rounded-full text-sm bg-indigo-100 text-indigo-700 min-h-[36px]"
                                >
                                    {tag}
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                        className="ml-2 text-indigo-500 hover:text-indigo-700 min-h-[24px] min-w-[24px] flex items-center justify-center"
                                    >
                                        ✕
                                    </TouchEnhancedButton>
                                </span>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tags (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={tagsString}
                                    onChange={(e) => handleTagsStringChange(e.target.value)}
                                    onBlur={handleTagsStringBlur}
                                    placeholder="italian, dinner, easy, comfort-food"
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Enter tags separated by commas. Press Tab or click elsewhere to apply.
                                </p>
                            </div>

                            <div className="border-t pt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Add individual tag
                                </label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        placeholder="Add a tag..."
                                        className="flex-1 px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        style={{ minHeight: '48px' }}
                                    />
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={addTag}
                                        className="px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 min-h-[48px] sm:w-auto w-full"
                                    >
                                        Add
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Nutrition (Optional) - MOBILE RESPONSIVE */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Nutrition Information (Optional)
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Calories
                                </label>
                                <input
                                    type="number"
                                    value={recipe.nutrition.calories}
                                    onChange={(e) => updateNutrition('calories', e.target.value)}
                                    placeholder="250"
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Protein (g)
                                </label>
                                <input
                                    type="number"
                                    value={recipe.nutrition.protein}
                                    onChange={(e) => updateNutrition('protein', e.target.value)}
                                    placeholder="15"
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Carbs (g)
                                </label>
                                <input
                                    type="number"
                                    value={recipe.nutrition.carbs}
                                    onChange={(e) => updateNutrition('carbs', e.target.value)}
                                    placeholder="30"
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fat (g)
                                </label>
                                <input
                                    type="number"
                                    value={recipe.nutrition.fat}
                                    onChange={(e) => updateNutrition('fat', e.target.value)}
                                    placeholder="10"
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fiber (g)
                                </label>
                                <input
                                    type="number"
                                    value={recipe.nutrition.fiber}
                                    onChange={(e) => updateNutrition('fiber', e.target.value)}
                                    placeholder="5"
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Source - MOBILE RESPONSIVE */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipe Settings</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Source (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={recipe.source}
                                    onChange={(e) => updateRecipe('source', e.target.value)}
                                    placeholder="Recipe source or URL..."
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                />
                            </div>

                            <div className="flex items-start">
                                <div className="flex items-center h-5 mt-3">
                                    <input
                                        id="isPublic"
                                        type="checkbox"
                                        checked={recipe.isPublic}
                                        onChange={(e) => updateRecipe('isPublic', e.target.checked)}
                                        className="focus:ring-indigo-500 h-5 w-5 text-indigo-600 border-gray-300 rounded"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="isPublic" className="font-medium text-gray-700 block mb-1">
                                        Make this recipe public
                                    </label>
                                    <p className="text-gray-500">
                                        Public recipes can be viewed and rated by other users
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Buttons - MOBILE RESPONSIVE */}
                    <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 pb-8">
                        <TouchEnhancedButton
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 min-h-[48px] order-2 sm:order-1"
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center gap-2 min-h-[48px] order-1 sm:order-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    {isEditing ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                <>
                                    {isEditing ? '💾 Update Recipe' : '✨ Create Recipe'}
                                </>
                            )}
                        </TouchEnhancedButton>
                    </div>
                </form>
            )}
        </div>
    );
}