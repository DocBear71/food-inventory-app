// file: /src/components/recipes/EnhancedRecipeForm.js v1

'use client';

import { useState } from 'react';
import RecipeParser from './RecipeParser';

export default function EnhancedRecipeForm({ initialData, onSubmit, onCancel, isEditing = false }) {
    const [inputMethod, setInputMethod] = useState('manual'); // 'manual', 'parser', 'url'
    const [showParser, setShowParser] = useState(false);
    const [showUrlImport, setShowUrlImport] = useState(false);

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
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            source: parsedData.source || prevRecipe.source
        }));
        setShowParser(false);
        setInputMethod('manual'); // Switch back to manual editing
    };

    // Handle URL import (placeholder for future implementation)
    const handleUrlImport = async (url) => {
        // TODO: Implement URL scraping functionality
        alert('URL import feature coming soon! For now, please copy and paste the recipe text.');
        setShowUrlImport(false);
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
            setRecipe(prev => ({
                ...prev,
                tags: [...prev.tags, tagInput.trim()]
            }));
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setRecipe(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await onSubmit(recipe);
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

    // Show URL import component (placeholder)
    if (showUrlImport) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    🌐 Import from URL
                </h2>
                <p className="text-gray-600 mb-4">
                    Import recipes directly from cooking websites like AllRecipes, Food Network, etc.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Recipe URL
                        </label>
                        <input
                            type="url"
                            placeholder="https://www.allrecipes.com/recipe/..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="text-sm text-yellow-800">
                            <strong>Coming Soon!</strong> URL import is under development.
                            For now, please copy the recipe text and use the "Parse Recipe Text" option.
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={() => setShowUrlImport(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => {
                                setShowUrlImport(false);
                                setShowParser(true);
                            }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Use Text Parser Instead
                        </button>
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
                        <button
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
                        </button>

                        <button
                            onClick={() => setShowParser(true)}
                            className="p-4 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-colors"
                        >
                            <div className="text-2xl mb-2">📝</div>
                            <h3 className="font-medium text-gray-900">Parse Recipe Text</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Paste recipe text and auto-extract details
                            </p>
                        </button>

                        <button
                            onClick={() => setShowUrlImport(true)}
                            className="p-4 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-colors opacity-75"
                        >
                            <div className="text-2xl mb-2">🌐</div>
                            <h3 className="font-medium text-gray-900">Import from URL</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Import from recipe websites (Coming Soon)
                            </p>
                        </button>
                    </div>

                    {inputMethod === 'manual' && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                💡 <strong>Tip:</strong> You can always switch to the text parser later if you have a recipe to paste!
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
                                <button
                                    type="button"
                                    onClick={() => setShowParser(true)}
                                    className="text-sm text-indigo-600 hover:text-indigo-700"
                                >
                                    📝 Switch to Text Parser
                                </button>
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
                                    <button
                                        type="button"
                                        onClick={() => removeIngredient(index)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                        disabled={recipe.ingredients.length === 1}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addIngredient}
                            className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                            + Add Ingredient
                        </button>
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
                                    <button
                                        type="button"
                                        onClick={() => removeInstruction(index)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                        disabled={recipe.instructions.length === 1}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addInstruction}
                            className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                            + Add Step
                        </button>
                    </div>

                    {/* Tags */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>

                        <div className="flex flex-wrap gap-2 mb-3">
                            {recipe.tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700"
                                >
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                        className="ml-2 text-indigo-500 hover:text-indigo-700"
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                placeholder="Add a tag..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button
                                type="button"
                                onClick={addTag}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                Add
                            </button>
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
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Source (Optional)</h3>
                        <input
                            type="text"
                            value={recipe.source}
                            onChange={(e) => updateRecipe('source', e.target.value)}
                            placeholder="Recipe source or URL..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-between pt-6">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
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
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}