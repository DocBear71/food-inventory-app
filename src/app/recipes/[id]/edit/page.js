'use client';
// file: /src/app/recipes/[id]/edit/page.js v3 - Fixed layout and labels


import { useSafeSession } from '@/hooks/useSafeSession';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

export default function EditRecipePage() {
    let session = null;

    try {
        const sessionResult = useSafeSession();
        session = sessionResult?.data || null;
    } catch (error) {
        // Mobile build fallback
        session = null;
    }
    const router = useRouter();
    const params = useParams();
    const recipeId = params.id;

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [error, setError] = useState(null);

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

// 2. Update formData state to include category:
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        ingredients: [{ name: '', amount: '', unit: '', optional: false }],
        instructions: [''],
        prepTime: '',
        cookTime: '',
        servings: '',
        difficulty: 'medium',
        tags: '',
        source: '',
        isPublic: false,
        category: 'entrees'
    });

    useEffect(() => {
        if (recipeId) {
            fetchRecipe();
        }
    }, [recipeId]);

    const fetchRecipe = async () => {
        try {
            const response = await fetch(getApiUrl(`/api/recipes/${recipeId}`));
            const data = await response.json();

            if (data.success) {
                const recipe = data.recipe;
                setFormData({
                    title: recipe.title || '',
                    description: recipe.description || '',
                    ingredients: recipe.ingredients && recipe.ingredients.length > 0
                        ? recipe.ingredients
                        : [{ name: '', amount: '', unit: '', optional: false }],
                    instructions: recipe.instructions && recipe.instructions.length > 0
                        ? recipe.instructions
                        : [''],
                    prepTime: recipe.prepTime ? recipe.prepTime.toString() : '',
                    cookTime: recipe.cookTime ? recipe.cookTime.toString() : '',
                    servings: recipe.servings ? recipe.servings.toString() : '',
                    difficulty: recipe.difficulty || 'medium',
                    tags: recipe.tags ? recipe.tags.join(', ') : '',
                    source: recipe.source || '',
                    isPublic: recipe.isPublic || false,
                    category: recipe.category || 'entrees'
                });
            } else {
                setError(data.error || 'Failed to load recipe');
            }
        } catch (error) {
            console.error('Error fetching recipe:', error);
            setError('Failed to load recipe');
        } finally {
            setFetchLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addIngredient = () => {
        setFormData(prev => ({
            ...prev,
            ingredients: [...prev.ingredients, { name: '', amount: '', unit: '', optional: false }]
        }));
    };

    const removeIngredient = (index) => {
        setFormData(prev => ({
            ...prev,
            ingredients: prev.ingredients.filter((_, i) => i !== index)
        }));
    };

    const updateIngredient = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            ingredients: prev.ingredients.map((ingredient, i) =>
                i === index ? { ...ingredient, [field]: value } : ingredient
            )
        }));
    };

    const addInstruction = () => {
        setFormData(prev => ({
            ...prev,
            instructions: [...prev.instructions, '']
        }));
    };

    const removeInstruction = (index) => {
        setFormData(prev => ({
            ...prev,
            instructions: prev.instructions.filter((_, i) => i !== index)
        }));
    };

    const updateInstruction = (index, value) => {
        setFormData(prev => ({
            ...prev,
            instructions: prev.instructions.map((instruction, i) =>
                i === index ? value : instruction
            )
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Process tags into array
            const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

            // Filter out empty ingredients and instructions
            const ingredients = formData.ingredients.filter(ing => ing.name.trim());
            const instructions = formData.instructions.filter(inst => inst.trim());

            const recipeData = {
                ...formData,
                tags,
                ingredients,
                instructions,
                prepTime: formData.prepTime ? parseInt(formData.prepTime) : null,
                cookTime: formData.cookTime ? parseInt(formData.cookTime) : null,
                servings: formData.servings ? parseInt(formData.servings) : null
            };

            const response = await fetch(getApiUrl(`/api/recipes/${recipeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recipeData)
            }));

            const data = await response.json();

            if (data.success) {
                router.push(`/recipes/${recipeId}`);
            } else {
                alert(data.error || 'Failed to update recipe');
            }
        } catch (error) {
            console.error('Error updating recipe:', error);
            alert('Error updating recipe');
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <MobileOptimizedLayout>
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                        <div className="space-y-4">
                            <div className="h-32 bg-gray-200 rounded"></div>
                            <div className="h-64 bg-gray-200 rounded"></div>
                            <div className="h-32 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    if (error) {
        return (
            <MobileOptimizedLayout>
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="text-center">
                        <div className="text-red-600 text-lg font-medium mb-4">{error}</div>
                        <TouchEnhancedButton
                            onClick={() => router.back()}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                        >
                            Go Back
                        </TouchEnhancedButton>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    return (
        <MobileOptimizedLayout>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Edit Recipe</h1>
                    <TouchEnhancedButton
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-gray-800"
                    >
                        ← Back
                    </TouchEnhancedButton>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info */}
                    <div className="bg-white rounded-lg border p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                                    Recipe Title *
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    required
                                    value={formData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Enter recipe title..."
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Describe your recipe..."
                                />
                            </div>

                            <div>
                                <label htmlFor="prepTime" className="block text-sm font-medium text-gray-700 mb-2">
                                    Prep Time (minutes)
                                </label>
                                <input
                                    type="number"
                                    id="prepTime"
                                    value={formData.prepTime}
                                    onChange={(e) => handleInputChange('prepTime', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="15"
                                />
                            </div>

                            <div>
                                <label htmlFor="cookTime" className="block text-sm font-medium text-gray-700 mb-2">
                                    Cook Time (minutes)
                                </label>
                                <input
                                    type="number"
                                    id="cookTime"
                                    value={formData.cookTime}
                                    onChange={(e) => handleInputChange('cookTime', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="30"
                                />
                            </div>

                            <div>
                                <label htmlFor="servings" className="block text-sm font-medium text-gray-700 mb-2">
                                    Servings
                                </label>
                                <input
                                    type="number"
                                    id="servings"
                                    value={formData.servings}
                                    onChange={(e) => handleInputChange('servings', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="4"
                                />
                            </div>

                            <div>
                                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
                                    Difficulty
                                </label>
                                <select
                                    id="difficulty"
                                    value={formData.difficulty}
                                    onChange={(e) => handleInputChange('difficulty', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <select
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => handleInputChange('category', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {CATEGORY_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                                    Tags (comma separated)
                                </label>
                                <input
                                    type="text"
                                    id="tags"
                                    value={formData.tags}
                                    onChange={(e) => handleInputChange('tags', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="pasta, quick, vegetarian"
                                />
                            </div>

                            <div>
                                <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-2">
                                    Source
                                </label>
                                <input
                                    type="text"
                                    id="source"
                                    value={formData.source}
                                    onChange={(e) => handleInputChange('source', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Grandma's cookbook"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isPublic"
                                    checked={formData.isPublic}
                                    onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                                    Make this recipe public
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Ingredients */}
                    <div className="bg-white rounded-lg border p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">Ingredients</h2>
                            <TouchEnhancedButton
                                type="button"
                                onClick={addIngredient}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
                            >
                                Add Ingredient
                            </TouchEnhancedButton>
                        </div>

                        {/* Column Headers */}
                        <div className="grid grid-cols-12 gap-3 mb-3 text-sm font-medium text-gray-600">
                            <div className="col-span-2">Amount</div>
                            <div className="col-span-2">Unit</div>
                            <div className="col-span-5">Ingredient Name</div>
                            <div className="col-span-2 text-center">Optional</div>
                            <div className="col-span-1 text-center">Remove</div>
                        </div>

                        <div className="space-y-4">
                            {formData.ingredients.map((ingredient, index) => (
                                <div key={index} className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            placeholder="Amount"
                                            value={ingredient.amount || ''}
                                            onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            placeholder="Unit"
                                            value={ingredient.unit || ''}
                                            onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="col-span-5">
                                        <input
                                            type="text"
                                            placeholder="Ingredient name *"
                                            value={ingredient.name || ''}
                                            onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={ingredient.optional || false}
                                                onChange={(e) => updateIngredient(index, 'optional', e.target.checked)}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-xs text-gray-600">Optional</span>
                                        </label>
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        {formData.ingredients.length > 1 && (
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => removeIngredient(index)}
                                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-md"
                                                title="Remove ingredient"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </TouchEnhancedButton>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-white rounded-lg border p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">Instructions</h2>
                            <TouchEnhancedButton
                                type="button"
                                onClick={addInstruction}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
                            >
                                Add Step
                            </TouchEnhancedButton>
                        </div>

                        <div className="space-y-4">
                            {formData.instructions.map((instruction, index) => (
                                <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                                    <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mt-1">
                                        {index + 1}
                                    </span>
                                    <textarea
                                        value={instruction}
                                        onChange={(e) => updateInstruction(index, e.target.value)}
                                        placeholder={`Step ${index + 1} instructions...`}
                                        rows={3}
                                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    />
                                    {formData.instructions.length > 1 && (
                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={() => removeInstruction(index)}
                                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-md mt-1"
                                            title="Remove step"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </TouchEnhancedButton>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Submit Buttons */}<br/>
                    <div className="flex justify-end space-x-4 pt-6 pb-8">
                        <TouchEnhancedButton
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-gray-500 border border-gray-300 rounded-md text-black hover:bg-gray-700 font-medium"
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-indigo-400 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium"
                        >
                            {loading ? 'Updating...' : 'Update Recipe'}
                        </TouchEnhancedButton>
                    </div>
                </form><br/>

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}