// file: /src/components/recipes/EnhancedRecipeForm.js v3 - FIXED COMMA INPUT ISSUE

'use client';

import { useState } from 'react';
import RecipeParser from './RecipeParser';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

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

    // Handle URL import
    const handleUrlImport = async (url) => {
        if (!url || !url.trim()) {
            setImportError('Please enter a valid URL');
            return;
        }

        setIsImporting(true);
        setImportError('');

        try {
            console.log('Importing recipe from URL:', url);

            const response = await fetch('/api/recipes/scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url.trim() })
            });

            const data = await response.json();

            if (data.success) {
                console.log('Successfully imported recipe:', data.recipe);

                // Transform scraped data to match our form structure
                const importedRecipe = {
                    title: data.recipe.title || '',
                    description: data.recipe.description || '',
                    ingredients: data.recipe.ingredients.length > 0 ? data.recipe.ingredients : [{ name: '', amount: '', unit: '', optional: false }],
                    instructions: data.recipe.instructions.length > 0
                        ? data.recipe.instructions.map((inst, index) => ({ step: index + 1, instruction: inst }))
                        : [{ step: 1, instruction: '' }],
                    prepTime: data.recipe.prepTime || '',
                    cookTime: data.recipe.cookTime || '',
                    servings: data.recipe.servings || '',
                    difficulty: data.recipe.difficulty || 'medium',
                    tags: data.recipe.tags || [],
                    source: data.recipe.source || url,
                    isPublic: false, // Default to private, user can change
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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

                    <div className="flex justify-between">
                        <TouchEnhancedButton
                            onClick={() => {
                                setShowUrlImport(false);
                                setUrlInput('');
                                setImportError('');
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            disabled={isImporting}
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <div className="flex gap-2">
                            <TouchEnhancedButton
                                onClick={() => {
                                    setShowUrlImport(false);
                                    setShowParser(true);
                                    setUrlInput('');
                                    setImportError('');
                                }}
                                className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50"
                                disabled={isImporting}
                            >
                                📝 Use Text Parser Instead
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => handleUrlImport(urlInput)}
                                disabled={!urlInput.trim() || isImporting}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
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
            {/* Back to Recipes Button */}
            <div className="flex justify-between items-center">
                <TouchEnhancedButton
                    type="button"
                    onClick={() => window.location.href = '/recipes'}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Back to Recipes</span>
                </TouchEnhancedButton>
                {!isEditing && (
                    <span className="text-sm text-gray-500">
                        {inputMethod === 'manual' ? 'Manual Entry' : inputMethod === 'parser' ? 'Text Parser' : 'URL Import'}
                    </span>
                )}
            </div>

            {/* Input Method Selection */}
            {!isEditing && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        How would you like to add this recipe?
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <TouchEnhancedButton
                            onClick={() => setInputMethod('manual')}
                            className={`p-4 border-2 rounded-lg text-left transition-colors ${
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
                            className="p-4 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-colors"
                        >
                            <div className="text-2xl mb-2">📝</div>
                            <h3 className="font-medium text-gray-900">Parse Recipe Text</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Paste recipe text and auto-extract details
                            </p>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => setShowUrlImport(true)}
                            className="p-4 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-colors"
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
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                            {!isEditing && (
                                <div className="flex gap-2">
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setShowParser(true)}
                                        className="text-sm text-indigo-600 hover:text-indigo-700"
                                    >
                                        📝 Text Parser
                                    </TouchEnhancedButton>
                                    <span className="text-gray-300">|</span>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setShowUrlImport(true)}
                                        className="text-sm text-indigo-600 hover:text-indigo-700"
                                    >
                                        🌐 URL Import
                                    </TouchEnhancedButton>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Recipe Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={recipe.title}
                                    onChange={(e) => updateRecipe('title', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Enter recipe title..."
                                />
                            </div>

                            {/* Category Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category
                                </label>
                                <select
                                    value={recipe.category || 'entrees'}
                                    onChange={(e) => updateRecipe('category', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={recipe.description}
                                    onChange={(e) => updateRecipe('description', e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Brief description of the recipe..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Prep Time (minutes)
                                </label>
                                <input
                                    type="number"
                                    value={recipe.prepTime}
                                    onChange={(e) => updateRecipe('prepTime', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="15"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cook Time (minutes)
                                </label>
                                <input
                                    type="number"
                                    value={recipe.cookTime}
                                    onChange={(e) => updateRecipe('cookTime', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="30"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Servings
                                </label>
                                <input
                                    type="number"
                                    value={recipe.servings}
                                    onChange={(e) => updateRecipe('servings', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="4"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Difficulty
                                </label>
                                <select
                                    value={recipe.difficulty}
                                    onChange={(e) => updateRecipe('difficulty', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Ingredients */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Ingredients ({recipe.ingredients.length})
                        </h3>

                        <div className="space-y-3">
                            {recipe.ingredients.map((ingredient, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="w-20">
                                        <input
                                            type="text"
                                            value={ingredient.amount}
                                            onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                                            placeholder="1"
                                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="w-20">
                                        <input
                                            type="text"
                                            value={ingredient.unit}
                                            onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                                            placeholder="cup"
                                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={ingredient.name}
                                            onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                                            placeholder="Ingredient name"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <label className="flex items-center text-sm text-gray-600">
                                            <input
                                                type="checkbox"
                                                checked={ingredient.optional}
                                                onChange={(e) => updateIngredient(index, 'optional', e.target.checked)}
                                                className="mr-1"
                                            />
                                            Optional
                                        </label>
                                    </div>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => removeIngredient(index)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                        disabled={recipe.ingredients.length === 1}
                                    >
                                        ✕
                                    </TouchEnhancedButton>
                                </div>
                            ))}
                        </div>

                        <TouchEnhancedButton
                            type="button"
                            onClick={addIngredient}
                            className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                            + Add Ingredient
                        </TouchEnhancedButton>
                    </div>

                    {/* Instructions */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Instructions ({recipe.instructions.length})
                        </h3>

                        <div className="space-y-3">
                            {recipe.instructions.map((instruction, index) => (
                                <div key={index} className="flex gap-3 items-start">
                                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                                        {instruction.step}
                                    </div>
                                    <div className="flex-1">
                                        <textarea
                                            value={instruction.instruction}
                                            onChange={(e) => updateInstruction(index, e.target.value)}
                                            placeholder="Describe this step..."
                                            rows={2}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        />
                                    </div>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => removeInstruction(index)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                        disabled={recipe.instructions.length === 1}
                                    >
                                        ✕
                                    </TouchEnhancedButton>
                                </div>
                            ))}
                        </div>

                        <TouchEnhancedButton
                            type="button"
                            onClick={addInstruction}
                            className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                            + Add Step
                        </TouchEnhancedButton>
                    </div>

                    {/* Tags - FIXED */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>

                        <div className="flex flex-wrap gap-2 mb-3">
                            {recipe.tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700"
                                >
                                    {tag}
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                        className="ml-2 text-indigo-500 hover:text-indigo-700"
                                    >
                                        ✕
                                    </TouchEnhancedButton>
                                </span>
                            ))}
                        </div>

                        {/* FIXED: Use string input that doesn't immediately parse commas */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tags (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={tagsString}
                                    onChange={(e) => handleTagsStringChange(e.target.value)}
                                    onBlur={handleTagsStringBlur}
                                    placeholder="italian, dinner, easy, comfort-food"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Enter tags separated by commas. Press Tab or click elsewhere to apply.
                                </p>
                            </div>

                            <div className="border-t pt-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Add individual tag
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        placeholder="Add a tag..."
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={addTag}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                    >
                                        Add
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Nutrition (Optional) */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Nutrition Information (Optional)
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Calories
                                </label>
                                <input
                                    type="number"
                                    value={recipe.nutrition.calories}
                                    onChange={(e) => updateNutrition('calories', e.target.value)}
                                    placeholder="250"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Protein (g)
                                </label>
                                <input
                                    type="number"
                                    value={recipe.nutrition.protein}
                                    onChange={(e) => updateNutrition('protein', e.target.value)}
                                    placeholder="15"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Carbs (g)
                                </label>
                                <input
                                    type="number"
                                    value={recipe.nutrition.carbs}
                                    onChange={(e) => updateNutrition('carbs', e.target.value)}
                                    placeholder="30"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fat (g)
                                </label>
                                <input
                                    type="number"
                                    value={recipe.nutrition.fat}
                                    onChange={(e) => updateNutrition('fat', e.target.value)}
                                    placeholder="10"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fiber (g)
                                </label>
                                <input
                                    type="number"
                                    value={recipe.nutrition.fiber}
                                    onChange={(e) => updateNutrition('fiber', e.target.value)}
                                    placeholder="5"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Source */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipe Settings</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Source (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={recipe.source}
                                    onChange={(e) => updateRecipe('source', e.target.value)}
                                    placeholder="Recipe source or URL..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input
                                        id="isPublic"
                                        type="checkbox"
                                        checked={recipe.isPublic}
                                        onChange={(e) => updateRecipe('isPublic', e.target.checked)}
                                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="isPublic" className="font-medium text-gray-700">
                                        Make this recipe public
                                    </label>
                                    <p className="text-gray-500">
                                        Public recipes can be viewed and rated by other users
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <br/>
                    {/* Submit Buttons */}
                    <div className="flex justify-end space-x-4 pt-6 pb-8">
                        <TouchEnhancedButton
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center gap-2"
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
            <br/>
        </div>
    );
}