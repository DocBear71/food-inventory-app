'use client';
// file: /src/app/recipes/[id]/edit/page.js v6 - FIXED: Move AutoExpandingTextarea outside component

import { useSafeSession } from '@/hooks/useSafeSession';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import UpdateNutritionButton from '@/components/nutrition/UpdateNutritionButton';
import { apiGet, apiPut } from '@/lib/api-config';
import NutritionModal from "@/components/nutrition/NutritionModal";

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
    const [recipe, setRecipe] = useState(null);
    const [showNutritionModal, setShowNutritionModal] = useState(false);

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
        category: 'entrees',
        nutrition: {}
    });

    useEffect(() => {
        if (recipeId) {
            fetchRecipe();
        }
    }, [recipeId]);

    const fetchRecipe = async () => {
        try {
            const response = await apiGet(`/api/recipes/${recipeId}`);
            const data = await response.json();

            if (data.success) {
                const recipeData = data.recipe;
                setRecipe(recipeData);

                // FIXED: Simplified instruction processing - keep it as strings for editing
                const processedInstructions = recipeData.instructions && recipeData.instructions.length > 0
                    ? recipeData.instructions.map(instruction => {
                        // Always convert to string for editing, regardless of original format
                        if (typeof instruction === 'string') {
                            return instruction;
                        }
                        // If it's an object, extract the text content
                        return instruction.text || instruction.instruction || String(instruction);
                    })
                    : [''];

                setFormData({
                    title: recipeData.title || '',
                    description: recipeData.description || '',
                    ingredients: recipeData.ingredients && recipeData.ingredients.length > 0
                        ? recipeData.ingredients.map(ing => ({
                            name: ing.name || '',
                            amount: ing.amount || '',
                            unit: ing.unit || '',
                            optional: ing.optional || false
                        }))
                        : [{ name: '', amount: '', unit: '', optional: false }],
                    instructions: processedInstructions, // Use simplified strings
                    prepTime: recipeData.prepTime ? recipeData.prepTime.toString() : '',
                    cookTime: recipeData.cookTime ? recipeData.cookTime.toString() : '',
                    servings: recipeData.servings ? recipeData.servings.toString() : '',
                    difficulty: recipeData.difficulty || 'medium',
                    tags: recipeData.tags ? recipeData.tags.join(', ') : '',
                    source: recipeData.source || '',
                    isPublic: recipeData.isPublic || false,
                    category: recipeData.category || 'entrees',
                    nutrition: recipeData.nutrition || {}
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

    const updateInstruction = useCallback((index, value) => {
        setFormData(prev => ({
            ...prev,
            instructions: prev.instructions.map((instruction, i) =>
                i === index ? value : instruction  // Direct string assignment
            )
        }));
    }, []); // Empty dependencies - this function is stable

    // Handle nutrition update from AI analysis
    const handleNutritionUpdate = (nutrition, analysisResult) => {
        setFormData(prev => ({
            ...prev,
            nutrition: nutrition || {}
        }));

        // Update the recipe object for the nutrition button
        setRecipe(prev => ({
            ...prev,
            nutrition: nutrition,
            nutritionCalculatedAt: new Date(),
            nutritionCoverage: analysisResult.coverage
        }));

        // Show success message
        alert(`Nutrition updated successfully! Coverage: ${Math.round((analysisResult.coverage || 0) * 100)}%`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Process tags into array
            const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

            // Filter out empty ingredients and instructions
            const ingredients = formData.ingredients.filter(ing => ing.name.trim());

            // FIXED: Keep instructions as strings for compatibility
            const instructions = formData.instructions
                .filter(inst => inst.trim())
                .map((inst, index) => inst.trim()); // Keep as strings, not objects

            const recipeData = {
                ...formData,
                tags,
                ingredients,
                instructions, // Send as string array
                prepTime: formData.prepTime ? parseInt(formData.prepTime) : null,
                cookTime: formData.cookTime ? parseInt(formData.cookTime) : null,
                servings: formData.servings ? parseInt(formData.servings) : null
            };

            const response = await apiPut(`/api/recipes/${recipeId}`, recipeData);
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
                            className="bg-indigo-600 text-white px-4 py-3 rounded-md hover:bg-indigo-700 min-h-[48px]"
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <h1 className="text-3xl font-bold text-gray-900">Edit Recipe</h1>
                    <TouchEnhancedButton
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-gray-800 px-4 py-3 min-h-[48px] self-start sm:self-center"
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
                                    className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                    placeholder="Enter recipe title..."
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <AutoExpandingTextarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
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
                                    className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
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
                                    className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
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
                                    className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
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
                                    className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
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
                                    className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
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
                                    className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
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
                                    className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                    placeholder="Grandma's cookbook"
                                />
                            </div>

                            <div className="flex items-center min-h-[48px]">
                                <input
                                    type="checkbox"
                                    id="isPublic"
                                    checked={formData.isPublic}
                                    onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                                />
                                <label htmlFor="isPublic" className="ml-3 text-sm text-gray-700">
                                    Make this recipe public
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Ingredients - MOBILE RESPONSIVE */}
                    <div className="bg-white rounded-lg border p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Ingredients</h2>

                        <div className="space-y-4">
                            {formData.ingredients.map((ingredient, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    {/* Top row: Optional checkbox and Delete button */}
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="flex items-center text-sm text-gray-600">
                                            <input
                                                type="checkbox"
                                                checked={ingredient.optional || false}
                                                onChange={(e) => updateIngredient(index, 'optional', e.target.checked)}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ingredient-checkbox h-4 w-4"
                                            />
                                            <span className="ml-3">Optional</span>
                                        </label>
                                        {formData.ingredients.length > 1 && (
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => removeIngredient(index)}
                                                className="font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                title="Remove ingredient"
                                            >
                                                ✕
                                            </TouchEnhancedButton>
                                        )}
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
                                                    placeholder="Amount"
                                                    value={ingredient.amount || ''}
                                                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                                                    className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{ minHeight: '48px' }}
                                                />
                                            </div>
                                            <div className="flex-1 sm:w-24">
                                                <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">
                                                    Unit
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Unit"
                                                    value={ingredient.unit || ''}
                                                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                                                    className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
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
                                                placeholder="Ingredient name *"
                                                value={ingredient.name || ''}
                                                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                                                className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ minHeight: '48px' }}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Ingredient Button - Moved to bottom */}
                        <div className="mt-6">
                            <TouchEnhancedButton
                                type="button"
                                onClick={addIngredient}
                                className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-3 rounded-md text-sm hover:bg-indigo-700 min-h-[48px]"
                            >
                                Add Ingredient
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* Instructions - FIXED */}
                    <div className="bg-white rounded-lg border p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Instructions</h2>

                        <div className="space-y-4">
                            {formData.instructions.map((instruction, index) => (
                                <div key={`instruction-${index}`} className="border border-gray-200 rounded-lg p-4">
                                    {/* Top row: Step number and Delete button */}
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                            {index + 1}
                                        </span>
                                        {formData.instructions.length > 1 && (
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => removeInstruction(index)}
                                                className="font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                title="Remove step"
                                            >
                                                ✕
                                            </TouchEnhancedButton>
                                        )}
                                    </div>

                                    {/* FIXED: Use stable AutoExpandingTextarea without dynamic key */}
                                    <AutoExpandingTextarea
                                        value={instruction}
                                        onChange={(e) => updateInstruction(index, e.target.value)}
                                        placeholder={`Step ${index + 1} instructions...`}
                                        className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Add Step Button */}
                        <div className="mt-6">
                            <TouchEnhancedButton
                                type="button"
                                onClick={addInstruction}
                                className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-3 rounded-md text-sm hover:bg-indigo-700 min-h-[48px]"
                            >
                                Add Step
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* AI Nutrition Analysis */}
                    <div className="bg-white rounded-lg border p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">Nutrition Information</h2>
                            {/* View Details Button */}
                            {formData.nutrition && Object.keys(formData.nutrition).length > 0 && (
                                <TouchEnhancedButton
                                    onClick={() => setShowNutritionModal(true)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                                >
                                    View Details
                                </TouchEnhancedButton>
                            )}
                        </div>

                        {/* Current nutrition display if available */}
                        {formData.nutrition && Object.keys(formData.nutrition).length > 0 && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Current Nutrition (per serving):</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                    {formData.nutrition.calories && (
                                        <div>
                                            <span className="font-medium">Calories:</span> {Math.round(formData.nutrition.calories.value)}
                                        </div>
                                    )}
                                    {formData.nutrition.protein && (
                                        <div>
                                            <span className="font-medium">Protein:</span> {Math.round(formData.nutrition.protein.value)}g
                                        </div>
                                    )}
                                    {formData.nutrition.carbs && (
                                        <div>
                                            <span className="font-medium">Carbs:</span> {Math.round(formData.nutrition.carbs.value)}g
                                        </div>
                                    )}
                                    {formData.nutrition.fat && (
                                        <div>
                                            <span className="font-medium">Fat:</span> {Math.round(formData.nutrition.fat.value)}g
                                        </div>
                                    )}
                                </div>

                                {/* AI Analysis Info */}
                                {formData.nutrition.calculationMethod === 'ai_calculated' && (
                                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center text-blue-800 text-sm">
                                            <span className="mr-2">🤖</span>
                                            <span>Nutrition calculated by AI analysis</span>
                                            {formData.nutrition.confidence && (
                                                <span className="ml-2 text-blue-600">
                                Confidence: {Math.round(formData.nutrition.confidence * 100)}%
                            </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* KEEP THIS: Update Nutrition Button - This is what you need for your 650 recipes! */}
                        <UpdateNutritionButton
                            recipe={{
                                ...recipe,
                                ingredients: formData.ingredients, // Use current form ingredients
                                servings: parseInt(formData.servings) || recipe?.servings || 4
                            }}
                            onNutritionUpdate={handleNutritionUpdate}
                            disabled={!formData.ingredients.some(ing => ing.name && ing.name.trim())}
                        />
                    </div>

                    {/* Submit Buttons - MOBILE RESPONSIVE */}
                    <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 pb-8">
                        <TouchEnhancedButton
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-gray-500 border border-gray-300 rounded-md text-white hover:bg-gray-700 font-medium min-h-[48px] order-2 sm:order-1"
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium min-h-[48px] order-1 sm:order-2"
                        >
                            {loading ? 'Updating...' : 'Update Recipe'}
                        </TouchEnhancedButton>
                    </div>
                </form>

                <NutritionModal
                    nutrition={formData.nutrition}
                    isOpen={showNutritionModal}
                    onClose={() => setShowNutritionModal(false)}
                    servings={parseInt(formData.servings) || 4}
                    recipeTitle={formData.title || "Recipe"} // ADD THIS
                />

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}