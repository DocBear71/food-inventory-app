'use client';
// file: /src/app/recipes/[id]/edit/page.js v7 - Added multi-part recipe editing support

import { useSafeSession } from '@/hooks/useSafeSession';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import UpdateNutritionButton from '@/components/nutrition/UpdateNutritionButton';
import { apiGet, apiPut } from '@/lib/api-config';
import NutritionModal from "@/components/nutrition/NutritionModal";
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

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

    // NEW: Multi-part editing state
    const [isMultiPart, setIsMultiPart] = useState(false);
    const [activePart, setActivePart] = useState(0);

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
        isMultiPart: false,
        parts: [],
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

                // NEW: Handle multi-part recipe initialization
                if (recipeData.isMultiPart && recipeData.parts && recipeData.parts.length > 0) {
                    setIsMultiPart(true);
                    setFormData({
                        title: recipeData.title || '',
                        description: recipeData.description || '',
                        isMultiPart: true,
                        parts: recipeData.parts.map(part => ({
                            name: part.name || '',
                            description: part.description || '',
                            ingredients: part.ingredients && part.ingredients.length > 0
                                ? part.ingredients.map(ing => ({
                                    name: ing.name || '',
                                    amount: ing.amount || '',
                                    unit: ing.unit || '',
                                    optional: ing.optional || false
                                }))
                                : [{ name: '', amount: '', unit: '', optional: false }],
                            instructions: part.instructions && part.instructions.length > 0
                                ? part.instructions.map(inst => {
                                    if (typeof inst === 'string') {
                                        return inst;
                                    }
                                    return inst.text || inst.instruction || String(inst);
                                })
                                : [''],
                            prepTime: part.prepTime ? part.prepTime.toString() : '',
                            cookTime: part.cookTime ? part.cookTime.toString() : '',
                            notes: part.notes || ''
                        })),
                        // Keep legacy fields empty for multi-part
                        ingredients: [],
                        instructions: [],
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
                    // Handle single-part recipe
                    setIsMultiPart(false);

                    const processedInstructions = recipeData.instructions && recipeData.instructions.length > 0
                        ? recipeData.instructions.map(instruction => {
                            if (typeof instruction === 'string') {
                                return instruction;
                            }
                            return instruction.text || instruction.instruction || String(instruction);
                        })
                        : [''];

                    setFormData({
                        title: recipeData.title || '',
                        description: recipeData.description || '',
                        isMultiPart: false,
                        parts: [],
                        ingredients: recipeData.ingredients && recipeData.ingredients.length > 0
                            ? recipeData.ingredients.map(ing => ({
                                name: ing.name || '',
                                amount: ing.amount || '',
                                unit: ing.unit || '',
                                optional: ing.optional || false
                            }))
                            : [{ name: '', amount: '', unit: '', optional: false }],
                        instructions: processedInstructions,
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
                }
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Load Failed',
                    message: data.error || 'Failed to load recipe'
                });
            }
        } catch (error) {
            console.error('Error fetching recipe:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Load Error',
                message: 'Failed to load recipe'
            });
        } finally {
            setFetchLoading(false);
        }
    };

    // NEW: Multi-part recipe functions
    const toggleMultiPart = () => {
        const newIsMultiPart = !isMultiPart;
        setIsMultiPart(newIsMultiPart);

        if (newIsMultiPart) {
            // Convert single-part to multi-part
            setFormData(prev => ({
                ...prev,
                isMultiPart: true,
                parts: [
                    {
                        name: 'Main Recipe',
                        description: '',
                        ingredients: prev.ingredients.length > 0 ? prev.ingredients : [{ name: '', amount: '', unit: '', optional: false }],
                        instructions: prev.instructions.length > 0 ? prev.instructions : [''],
                        prepTime: '',
                        cookTime: '',
                        notes: ''
                    }
                ]
            }));
        } else {
            // Convert multi-part back to single-part (use first part)
            const firstPart = formData.parts?.[0] || {
                ingredients: [{ name: '', amount: '', unit: '', optional: false }],
                instructions: ['']
            };

            setFormData(prev => ({
                ...prev,
                isMultiPart: false,
                ingredients: firstPart.ingredients,
                instructions: firstPart.instructions,
                parts: []
            }));
        }
        setActivePart(0);
    };

    const addRecipePart = () => {
        setFormData(prev => ({
            ...prev,
            parts: [
                ...prev.parts,
                {
                    name: `Part ${prev.parts.length + 1}`,
                    description: '',
                    ingredients: [{ name: '', amount: '', unit: '', optional: false }],
                    instructions: [''],
                    prepTime: '',
                    cookTime: '',
                    notes: ''
                }
            ]
        }));
        setActivePart(formData.parts.length);
    };

    const removeRecipePart = (partIndex) => {
        if (formData.parts.length <= 1) return;

        setFormData(prev => ({
            ...prev,
            parts: prev.parts.filter((_, index) => index !== partIndex)
        }));

        if (activePart >= partIndex && activePart > 0) {
            setActivePart(activePart - 1);
        }
    };

    const updatePartField = (partIndex, field, value) => {
        setFormData(prev => ({
            ...prev,
            parts: prev.parts.map((part, index) =>
                index === partIndex ? { ...part, [field]: value } : part
            )
        }));
    };

    // NEW: Multi-part ingredient functions
    const addIngredientToPart = (partIndex) => {
        setFormData(prev => ({
            ...prev,
            parts: prev.parts.map((part, index) =>
                index === partIndex
                    ? { ...part, ingredients: [...part.ingredients, { name: '', amount: '', unit: '', optional: false }] }
                    : part
            )
        }));
    };

    const updateIngredientInPart = (partIndex, ingredientIndex, field, value) => {
        setFormData(prev => ({
            ...prev,
            parts: prev.parts.map((part, pIndex) =>
                pIndex === partIndex
                    ? {
                        ...part,
                        ingredients: part.ingredients.map((ing, iIndex) =>
                            iIndex === ingredientIndex ? { ...ing, [field]: value } : ing
                        )
                    }
                    : part
            )
        }));
    };

    const removeIngredientFromPart = (partIndex, ingredientIndex) => {
        setFormData(prev => ({
            ...prev,
            parts: prev.parts.map((part, pIndex) =>
                pIndex === partIndex
                    ? { ...part, ingredients: part.ingredients.filter((_, iIndex) => iIndex !== ingredientIndex) }
                    : part
            )
        }));
    };

    // NEW: Multi-part instruction functions
    const addInstructionToPart = (partIndex) => {
        setFormData(prev => ({
            ...prev,
            parts: prev.parts.map((part, pIndex) =>
                pIndex === partIndex
                    ? { ...part, instructions: [...part.instructions, ''] }
                    : part
            )
        }));
    };

    const updateInstructionInPart = useCallback((partIndex, instructionIndex, value) => {
        setFormData(prev => ({
            ...prev,
            parts: prev.parts.map((part, pIndex) =>
                pIndex === partIndex
                    ? {
                        ...part,
                        instructions: part.instructions.map((inst, iIndex) =>
                            iIndex === instructionIndex ? value : inst
                        )
                    }
                    : part
            )
        }));
    }, []);

    const removeInstructionFromPart = (partIndex, instructionIndex) => {
        setFormData(prev => ({
            ...prev,
            parts: prev.parts.map((part, pIndex) =>
                pIndex === partIndex
                    ? { ...part, instructions: part.instructions.filter((_, iIndex) => iIndex !== instructionIndex) }
                    : part
            )
        }));
    };

    // Helper function to get current part's data
    const getCurrentPartData = () => {
        if (isMultiPart && formData.parts && formData.parts[activePart]) {
            return formData.parts[activePart];
        }
        return {
            ingredients: formData.ingredients || [],
            instructions: formData.instructions || []
        };
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Legacy functions for single-part recipes
    const addIngredient = () => {
        if (isMultiPart) {
            addIngredientToPart(activePart);
        } else {
            setFormData(prev => ({
                ...prev,
                ingredients: [...prev.ingredients, { name: '', amount: '', unit: '', optional: false }]
            }));
        }
    };

    const removeIngredient = (index) => {
        if (isMultiPart) {
            removeIngredientFromPart(activePart, index);
        } else {
            setFormData(prev => ({
                ...prev,
                ingredients: prev.ingredients.filter((_, i) => i !== index)
            }));
        }
    };

    const updateIngredient = (index, field, value) => {
        if (isMultiPart) {
            updateIngredientInPart(activePart, index, field, value);
        } else {
            setFormData(prev => ({
                ...prev,
                ingredients: prev.ingredients.map((ingredient, i) =>
                    i === index ? { ...ingredient, [field]: value } : ingredient
                )
            }));
        }
    };

    const addInstruction = () => {
        if (isMultiPart) {
            addInstructionToPart(activePart);
        } else {
            setFormData(prev => ({
                ...prev,
                instructions: [...prev.instructions, '']
            }));
        }
    };

    const removeInstruction = (index) => {
        if (isMultiPart) {
            removeInstructionFromPart(activePart, index);
        } else {
            setFormData(prev => ({
                ...prev,
                instructions: prev.instructions.filter((_, i) => i !== index)
            }));
        }
    };

    const updateInstruction = useCallback((index, value) => {
        if (isMultiPart) {
            updateInstructionInPart(activePart, index, value);
        } else {
            setFormData(prev => ({
                ...prev,
                instructions: prev.instructions.map((instruction, i) =>
                    i === index ? value : instruction
                )
            }));
        }
    }, [isMultiPart, activePart]);

    const handleNutritionUpdate = async (nutrition, analysisResult) => {
        setFormData(prev => ({
            ...prev,
            nutrition: nutrition || {}
        }));

        setRecipe(prev => ({
            ...prev,
            nutrition: nutrition,
            nutritionCalculatedAt: new Date(),
            nutritionCoverage: analysisResult.coverage
        }));

        const {NativeDialog} = await import('@/components/mobile/NativeDialog');
        await NativeDialog.showSuccess({
            title: 'Nutrition Updated',
            message: `Nutrition updated successfully! Coverage: ${Math.round((analysisResult.coverage || 0) * 100)}%`
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

            // Prepare recipe data based on type
            const recipeData = {
                ...formData,
                tags,
                isMultiPart,
                prepTime: formData.prepTime ? parseInt(formData.prepTime) : null,
                cookTime: formData.cookTime ? parseInt(formData.cookTime) : null,
                servings: formData.servings ? parseInt(formData.servings) : null
            };

            if (isMultiPart) {
                // Clean up multi-part data
                recipeData.parts = formData.parts.map(part => ({
                    ...part,
                    ingredients: part.ingredients.filter(ing => ing.name.trim()),
                    instructions: part.instructions.filter(inst => inst.trim()),
                    prepTime: part.prepTime ? parseInt(part.prepTime) : null,
                    cookTime: part.cookTime ? parseInt(part.cookTime) : null
                }));
                // FIXED: Set legacy fields to empty arrays instead of deleting them
                recipeData.ingredients = [];
                recipeData.instructions = [];
            } else {
                // Clean up single-part data
                recipeData.ingredients = formData.ingredients.filter(ing => ing.name.trim());
                recipeData.instructions = formData.instructions.filter(inst => inst.trim());
                // FIXED: Set parts to empty array instead of deleting
                recipeData.parts = [];
            }

            const response = await apiPut(`/api/recipes/${recipeId}`, recipeData);
            const data = await response.json();

            if (data.success) {
                router.push(`/recipes/${recipeId}`);
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Update Failed',
                    message: data.error || 'Failed to update recipe'
                });
            }
        } catch (error) {
            console.error('Error updating recipe:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Update Error',
                message: 'Error updating recipe'
            });
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
                            onClick={() => NativeNavigation.routerBack(router)}
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
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Edit Recipe</h1>
                        {formData.isMultiPart && (
                            <p className="text-gray-600 mt-1">🧩 Multi-part recipe with {formData.parts?.length || 0} parts</p>
                        )}
                    </div>
                    <TouchEnhancedButton
                        onClick={() => NativeNavigation.routerBack(router)}
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

                            {/* NEW: Multi-Part Toggle */}
                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Recipe Type
                                        </label>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="isMultiPart"
                                                checked={isMultiPart}
                                                onChange={toggleMultiPart}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                            />
                                            <label htmlFor="isMultiPart" className="ml-2 text-sm text-gray-700">
                                                Multi-part recipe (e.g., pot pie with filling + topping)
                                            </label>
                                        </div>
                                    </div>
                                    {isMultiPart && (
                                        <div className="text-sm text-blue-600">
                                            🧩 {formData.parts?.length || 0} parts
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Rest of basic info fields */}
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

                    {/* NEW: Multi-Part Recipe Sections */}
                    {isMultiPart ? (
                        <div className="bg-white rounded-lg border p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Recipe Parts ({formData.parts?.length || 0})
                                </h2>
                                <TouchEnhancedButton
                                    type="button"
                                    onClick={addRecipePart}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add Part
                                </TouchEnhancedButton>
                            </div>

                            {/* Part Tabs */}
                            {formData.parts && formData.parts.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {formData.parts.map((part, index) => (
                                            <div key={index} className="flex items-center">
                                                <TouchEnhancedButton
                                                    type="button"
                                                    onClick={() => setActivePart(index)}
                                                    className={`px-4 py-2 rounded-l-md text-sm font-medium transition-colors ${
                                                        activePart === index
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    }`}
                                                >
                                                    {part.name || `Part ${index + 1}`}
                                                </TouchEnhancedButton>
                                                {formData.parts.length > 1 && (
                                                    <TouchEnhancedButton
                                                        type="button"
                                                        onClick={() => removeRecipePart(index)}
                                                        className="bg-red-500 text-white px-2 py-2 rounded-r-md hover:bg-red-600 transition-colors"
                                                        title="Remove this part"
                                                    >
                                                        ×
                                                    </TouchEnhancedButton>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Active Part Editor */}
                                    <div className="space-y-6">
                                        {/* Part Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Part Name
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.parts[activePart]?.name || ''}
                                                onChange={(e) => updatePartField(activePart, 'name', e.target.value)}
                                                className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{minHeight: '48px'}}
                                                placeholder={`Part ${activePart + 1} (e.g., "Filling", "Topping", "Marinade")`}
                                            />
                                        </div>

                                        {/* Part Description */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Part Description (Optional)
                                            </label>
                                            <AutoExpandingTextarea
                                                value={formData.parts[activePart]?.description || ''}
                                                onChange={(e) => updatePartField(activePart, 'description', e.target.value)}
                                                className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="Brief description of this part..."
                                            />
                                        </div>

                                        {/* Part Timing */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Part Prep Time (minutes)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formData.parts[activePart]?.prepTime || ''}
                                                    onChange={(e) => updatePartField(activePart, 'prepTime', e.target.value)}
                                                    className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{minHeight: '48px'}}
                                                    placeholder="15"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Part Cook Time (minutes)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formData.parts[activePart]?.cookTime || ''}
                                                    onChange={(e) => updatePartField(activePart, 'cookTime', e.target.value)}
                                                    className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{minHeight: '48px'}}
                                                    placeholder="30"
                                                />
                                            </div>
                                        </div>

                                        {/* Current Part Ingredients */}
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                                Ingredients for {formData.parts[activePart]?.name || `Part ${activePart + 1}`}
                                                ({getCurrentPartData().ingredients?.length || 0})
                                            </h3>

                                            <div className="space-y-4">
                                                {getCurrentPartData().ingredients?.map((ingredient, index) => (
                                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <label className="flex items-center text-sm text-gray-600">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={ingredient.optional || false}
                                                                    onChange={(e) => updateIngredient(index, 'optional', e.target.checked)}
                                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                                />
                                                                <span className="ml-3">Optional</span>
                                                            </label>
                                                            {getCurrentPartData().ingredients?.length > 1 && (
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

                                                        <div className="flex flex-col sm:flex-row gap-3">
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

                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={addIngredient}
                                                className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium px-4 py-3 min-h-[48px]"
                                            >
                                                + Add Ingredient
                                            </TouchEnhancedButton>
                                        </div>

                                        {/* Current Part Instructions */}
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                                Instructions for {formData.parts[activePart]?.name || `Part ${activePart + 1}`}
                                                ({getCurrentPartData().instructions?.length || 0})
                                            </h3>

                                            <div className="space-y-4">
                                                {getCurrentPartData().instructions?.map((instruction, index) => (
                                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                                                {index + 1}
                                                            </span>
                                                            {getCurrentPartData().instructions?.length > 1 && (
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

                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={addInstruction}
                                                className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium px-4 py-3 min-h-[48px]"
                                            >
                                                + Add Step
                                            </TouchEnhancedButton>
                                        </div>

                                        {/* Part Notes */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Part Notes (Optional)
                                            </label>
                                            <AutoExpandingTextarea
                                                value={formData.parts[activePart]?.notes || ''}
                                                onChange={(e) => updatePartField(activePart, 'notes', e.target.value)}
                                                className="w-full border border-gray-300 rounded-md px-3 py-3 text-base focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="Any special notes for this part..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Single-Part Recipe Sections (Legacy) */
                        <>
                            {/* Ingredients - MOBILE RESPONSIVE */}
                            <div className="bg-white rounded-lg border p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-6">Ingredients</h2>

                                <div className="space-y-4">
                                    {formData.ingredients.map((ingredient, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="flex items-center text-sm text-gray-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={ingredient.optional || false}
                                                        onChange={(e) => updateIngredient(index, 'optional', e.target.checked)}
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
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

                                            <div className="flex flex-col sm:flex-row gap-3">
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
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
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
                        </>
                    )}

                    {/* AI Nutrition Analysis - same as before */}
                    <div className="bg-white rounded-lg border p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">Nutrition Information</h2>
                            {formData.nutrition && Object.keys(formData.nutrition).length > 0 && (
                                <TouchEnhancedButton
                                    onClick={() => setShowNutritionModal(true)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                                >
                                    View Details
                                </TouchEnhancedButton>
                            )}
                        </div>

                        {formData.nutrition && Object.keys(formData.nutrition).length > 0 && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Current Nutrition (per serving):</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                    {formData.nutrition.calories && (
                                        <div>
                                            <span className="font-medium">Calories:</span> {Math.round(formData.nutrition.calories.value || formData.nutrition.calories)}
                                        </div>
                                    )}
                                    {formData.nutrition.protein && (
                                        <div>
                                            <span className="font-medium">Protein:</span> {Math.round(formData.nutrition.protein.value || formData.nutrition.protein)}g
                                        </div>
                                    )}
                                    {formData.nutrition.carbs && (
                                        <div>
                                            <span className="font-medium">Carbs:</span> {Math.round(formData.nutrition.carbs.value || formData.nutrition.carbs)}g
                                        </div>
                                    )}
                                    {formData.nutrition.fat && (
                                        <div>
                                            <span className="font-medium">Fat:</span> {Math.round(formData.nutrition.fat.value || formData.nutrition.fat)}g
                                        </div>
                                    )}
                                </div>

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

                        <UpdateNutritionButton
                            recipe={{
                                ...recipe,
                                ingredients: isMultiPart ?
                                    formData.parts?.reduce((all, part) => [...all, ...(part.ingredients || [])], []) :
                                    formData.ingredients,
                                servings: parseInt(formData.servings) || recipe?.servings || 4
                            }}
                            onNutritionUpdate={handleNutritionUpdate}
                            disabled={
                                isMultiPart ?
                                    !formData.parts?.some(part => part.ingredients?.some(ing => ing.name && ing.name.trim())) :
                                    !formData.ingredients.some(ing => ing.name && ing.name.trim())
                            }
                        />
                    </div>

                    {/* Submit Buttons - MOBILE RESPONSIVE */}
                    <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 pb-8">
                        <TouchEnhancedButton
                            type="button"
                            onClick={() => NativeNavigation.routerBack(router)}
                            className="px-6 py-3 bg-gray-500 border border-gray-300 rounded-md text-white hover:bg-gray-700 font-medium min-h-[48px] order-2 sm:order-1"
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium min-h-[48px] order-1 sm:order-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Updating...
                                </>
                            ) : (
                                <>
                                    Update Recipe
                                    {isMultiPart && <span className="text-xs ml-2">(Multi-part)</span>}
                                </>
                            )}
                        </TouchEnhancedButton>
                    </div>
                </form>

                <NutritionModal
                    nutrition={formData.nutrition}
                    isOpen={showNutritionModal}
                    onClose={() => setShowNutritionModal(false)}
                    servings={parseInt(formData.servings) || 4}
                    recipeTitle={formData.title || "Recipe"}
                />

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}