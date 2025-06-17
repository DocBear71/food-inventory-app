'use client';
// file: /src/app/recipes/[id]/page.js v9 - Fixed scaling bug and improved user tracking


import { useEffect, useState } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useParams, useRouter } from 'next/navigation';
import { StarRating, RatingStats } from '@/components/reviews/RecipeRating';
import RecipeReviewsSection from '@/components/reviews/RecipeReviewsSection';
import NutritionFacts from '@/components/nutrition/NutritionFacts';
import RecipeShoppingList from '@/components/recipes/RecipeShoppingList';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { getApiUrl } from '@/lib/api-config';

export default function RecipeDetailPage() {
    let session = null;

    try {
        const sessionResult = useSafeSession();
        session = sessionResult?.data || null;
    } catch (error) {
        // Mobile build fallback
        session = null;
    }
    const params = useParams();
    const router = useRouter();
    const recipeId = params.id;

    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNutrition, setShowNutrition] = useState(false);
    const [servings, setServings] = useState(1);
    const [showQuickShoppingList, setShowQuickShoppingList] = useState(false);
    const [showMealPlanModal, setShowMealPlanModal] = useState(false);
    const [showCollectionsModal, setShowCollectionsModal] = useState(false);
    const [mealPlans, setMealPlans] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loadingMealPlans, setLoadingMealPlans] = useState(false);
    const [loadingCollections, setLoadingCollections] = useState(false);

    useEffect(() => {
        if (recipeId) {
            fetchRecipe();
        }
    }, [recipeId]);

    useEffect(() => {
        if (recipe && recipe.servings) {
            setServings(recipe.servings);
        }
    }, [recipe]);

    const fetchRecipe = async () => {
        try {
            const response = await fetch(getApiUrl(`/api/recipes/${recipeId}`));
            const data = await response.json();

            if (data.success) {
                setRecipe(data.recipe);
                // Increment view count
                await fetch(getApiUrl(`/api/recipes/${recipeId}/view`, { method: 'POST' }));
            } else {
                setError(data.error || 'Recipe not found');
            }
        } catch (error) {
            console.error('Error fetching recipe:', error);
            setError('Failed to load recipe');
        } finally {
            setLoading(false);
        }
    };

    const fetchMealPlans = async () => {
        setLoadingMealPlans(true);
        try {
            const response = await fetch(getApiUrl('/api/meal-plans'));
            const data = await response.json();
            if (data.success) {
                setMealPlans(data.mealPlans);
            }
        } catch (error) {
            console.error('Error fetching meal plans:', error);
        } finally {
            setLoadingMealPlans(false);
        }
    };

    // NEW: Fetch user's recipe collections
    const fetchCollections = async () => {
        setLoadingCollections(true);
        try {
            const response = await fetch(getApiUrl('/api/collections'));
            const data = await response.json();
            if (data.success) {
                setCollections(data.collections);
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
        } finally {
            setLoadingCollections(false);
        }
    };

    // NEW: Add recipe to collection
    const addToCollection = async (collectionId) => {
        try {
            const response = await fetch(getApiUrl(`/api/collections/${collectionId}/recipes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipeId: recipe._id
                })
            }));

            const data = await response.json();
            if (data.success) {
                alert(`Added "${recipe.title}" to your collection!`);
                setShowCollectionsModal(false);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error adding to collection:', error);
            alert('Failed to add recipe to collection');
        }
    };

    // NEW: Create new collection and add recipe
    const createCollectionAndAdd = async (name, description = '') => {
        try {
            const response = await fetch(getApiUrl('/api/collections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    description,
                    recipes: [{ recipeId: recipe._id }]
                })
            }));

            const data = await response.json();
            if (data.success) {
                alert(`Created collection "${name}" and added "${recipe.title}"!`);
                setShowCollectionsModal(false);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error creating collection:', error);
            alert('Failed to create collection');
        }
    };

    const addToMealPlan = async (mealPlanId, day, mealType) => {
        try {
            const response = await fetch(getApiUrl(`/api/meal-plans/${mealPlanId}`, {
                method: 'GET'
            }));

            const data = await response.json();
            if (!data.success) {
                throw new Error('Failed to fetch meal plan');
            }

            const mealPlan = data.mealPlan;

            const newMeal = {
                recipeId: recipe._id,
                recipeName: recipe.title,
                mealType: mealType,
                servings: recipe.servings || 4,
                notes: '',
                prepTime: recipe.prepTime || 0,
                cookTime: recipe.cookTime || 0,
                createdAt: new Date()
            };

            const updatedMeals = {
                ...mealPlan.meals,
                [day]: [...(mealPlan.meals[day] || []), newMeal]
            };

            const updateResponse = await fetch(getApiUrl(`/api/meal-plans/${mealPlanId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    meals: updatedMeals
                })
            }));

            const updateData = await updateResponse.json();
            if (updateData.success) {
                alert(`Added "${recipe.title}" to your meal plan!`);
                setShowMealPlanModal(false);
            } else {
                throw new Error(updateData.error);
            }
        } catch (error) {
            console.error('Error adding to meal plan:', error);
            alert('Failed to add recipe to meal plan');
        }
    };

    const formatCookTime = (minutes) => {
        if (!minutes) return 'Not specified';
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const getDifficultyColor = (difficulty) => {
        const colors = {
            easy: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            hard: 'bg-red-100 text-red-800'
        };
        return colors[difficulty] || colors.medium;
    };

    // FIXED: Improved scaling function to handle different data types
    const getScaledAmount = (amount) => {
        if (!amount || !recipe?.servings) return amount;

        // Convert amount to string if it's not already
        const amountStr = String(amount);

        // Extract number from amount string - handles decimals and fractions
        const match = amountStr.match(/^(\d+(?:\.\d+)?|\d+\/\d+)/);
        if (match) {
            const originalNumber = match[1];
            let number;

            // Handle fractions like "1/2"
            if (originalNumber.includes('/')) {
                const [numerator, denominator] = originalNumber.split('/');
                number = parseFloat(numerator) / parseFloat(denominator);
            } else {
                number = parseFloat(originalNumber);
            }

            const scaledNumber = (number * servings) / recipe.servings;

            // Format the scaled number nicely
            let formattedNumber;
            if (scaledNumber % 1 === 0) {
                // Whole number
                formattedNumber = scaledNumber.toString();
            } else if (scaledNumber < 1) {
                // Convert to fraction if it's a simple fraction
                const fraction = getFractionFromDecimal(scaledNumber);
                formattedNumber = fraction || scaledNumber.toFixed(2);
            } else {
                // Round to 2 decimal places and remove trailing zeros
                formattedNumber = parseFloat(scaledNumber.toFixed(2)).toString();
            }

            return amountStr.replace(originalNumber, formattedNumber);
        }
        return amountStr;
    };

    // Helper function to convert decimals to common fractions
    const getFractionFromDecimal = (decimal) => {
        const commonFractions = {
            0.125: '1/8',
            0.25: '1/4',
            0.333: '1/3',
            0.375: '3/8',
            0.5: '1/2',
            0.625: '5/8',
            0.667: '2/3',
            0.75: '3/4',
            0.875: '7/8'
        };

        // Round to 3 decimal places for comparison
        const rounded = Math.round(decimal * 1000) / 1000;
        return commonFractions[rounded] || null;
    };

    // Check if recipe has nutrition data - handle both structured and simple formats
    const hasNutritionData = recipe?.nutrition && (
        // Structured format: { calories: { value: 203 } }
        (recipe.nutrition.calories && (recipe.nutrition.calories.value > 0 || recipe.nutrition.calories > 0)) ||
        (recipe.nutrition.protein && (recipe.nutrition.protein.value > 0 || recipe.nutrition.protein > 0)) ||
        (recipe.nutrition.fat && (recipe.nutrition.fat.value > 0 || recipe.nutrition.fat > 0)) ||
        (recipe.nutrition.carbs && (recipe.nutrition.carbs.value > 0 || recipe.nutrition.carbs > 0)) ||
        // Simple format: { calories: 203 }
        (typeof recipe.nutrition.calories === 'number' && recipe.nutrition.calories > 0) ||
        (typeof recipe.nutrition.protein === 'number' && recipe.nutrition.protein > 0) ||
        (typeof recipe.nutrition.fat === 'number' && recipe.nutrition.fat > 0) ||
        (typeof recipe.nutrition.carbs === 'number' && recipe.nutrition.carbs > 0)
    );

    // Convert simple nutrition format to structured format for the component
    const getNormalizedNutrition = () => {
        if (!recipe?.nutrition) return null;

        // If already in structured format, return as-is
        if (recipe.nutrition.calories && typeof recipe.nutrition.calories === 'object') {
            return recipe.nutrition;
        }

        // Convert simple format to structured format
        return {
            calories: {
                value: parseFloat(recipe.nutrition.calories) || 0,
                unit: 'kcal',
                name: 'Calories'
            },
            protein: {
                value: parseFloat(recipe.nutrition.protein) || 0,
                unit: 'g',
                name: 'Protein'
            },
            fat: {
                value: parseFloat(recipe.nutrition.fat) || 0,
                unit: 'g',
                name: 'Fat'
            },
            carbs: {
                value: parseFloat(recipe.nutrition.carbs) || 0,
                unit: 'g',
                name: 'Carbohydrates'
            },
            fiber: {
                value: parseFloat(recipe.nutrition.fiber) || 0,
                unit: 'g',
                name: 'Fiber'
            },
            sodium: {
                value: parseFloat(recipe.nutrition.sodium) || 0,
                unit: 'mg',
                name: 'Sodium'
            }
        };
    };

    if (loading) {
        return (
            <MobileOptimizedLayout>
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="h-32 bg-gray-200 rounded"></div>
                                <div className="h-64 bg-gray-200 rounded"></div>
                            </div>
                            <div className="h-96 bg-gray-200 rounded"></div>
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
                            onClick={() => router.push('/recipes')}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                        >
                            Back to Recipes
                        </TouchEnhancedButton>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    return (
        <MobileOptimizedLayout>
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <TouchEnhancedButton
                            onClick={() => router.push('/recipes')}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span>Back to Recipes</span>
                        </TouchEnhancedButton>
                        <div className="text-sm text-gray-500">
                            {recipe.isPublic ? '🌍 Public Recipe' : '🔒 Private Recipe'}
                        </div>
                    </div>

                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
                            {recipe.description && (
                                <p className="text-gray-600 text-lg mb-4">{recipe.description}</p>
                            )}

                            {/* Rating and Stats */}
                            <div className="flex items-center space-x-6 mb-4">
                                <RatingStats ratingStats={recipe.ratingStats} compact={true} />
                                {recipe.metrics?.viewCount > 0 && (
                                    <span className="text-sm text-gray-500">
                                        {recipe.metrics.viewCount} view{recipe.metrics.viewCount !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-2 ml-4">
                            {/* Show edit button if user owns the recipe */}
                            {session?.user?.id === recipe.createdBy?._id && (
                                <TouchEnhancedButton
                                    onClick={() => router.push(`/recipes/${recipeId}/edit`)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    Edit Recipe
                                </TouchEnhancedButton>
                            )}
                            {hasNutritionData && (
                                <TouchEnhancedButton
                                    onClick={() => setShowNutrition(!showNutrition)}
                                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                                >
                                    {showNutrition ? 'Hide' : 'Show'} Nutrition
                                </TouchEnhancedButton>
                            )}
                            <TouchEnhancedButton
                                onClick={() => window.print()}
                                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Print
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* Recipe Meta */}
                    <div className="flex flex-wrap items-center space-x-4 text-sm text-gray-600">
                        {recipe.prepTime && (
                            <span className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Prep: {formatCookTime(recipe.prepTime)}</span>
                            </span>
                        )}
                        {recipe.cookTime && (
                            <span className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                                </svg>
                                <span>Cook: {formatCookTime(recipe.cookTime)}</span>
                            </span>
                        )}
                        {recipe.servings && (
                            <span className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>Serves: {recipe.servings}</span>
                            </span>
                        )}
                        {recipe.difficulty && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                                {recipe.difficulty}
                            </span>
                        )}
                    </div>

                    {/* Tags */}
                    {recipe.tags && recipe.tags.length > 0 && (
                        <div className="mt-4">
                            <div className="flex flex-wrap gap-2">
                                {recipe.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Nutrition Panel */}
                {showNutrition && hasNutritionData && (
                    <div className="mb-8">
                        <NutritionFacts
                            nutrition={getNormalizedNutrition()}
                            servings={recipe.servings || 1}
                            showPerServing={true}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Ingredients */}
                        <div className="bg-white rounded-lg border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">Ingredients</h2>
                                {recipe.servings && (
                                    <div className="flex items-center space-x-2">
                                        <label htmlFor="servings" className="text-sm font-medium text-gray-700">
                                            Servings:
                                        </label>
                                        <input
                                            id="servings"
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={servings}
                                            onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                                            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                )}
                            </div>
                            <ul className="space-y-2">
                                {recipe.ingredients?.map((ingredient, index) => (
                                    <li key={index} className="flex items-start space-x-4">
                                        <input
                                            type="checkbox"
                                            className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-gray-700">
                                            {ingredient.amount && (
                                                <span className="font-medium">
                                                    {getScaledAmount(ingredient.amount)}
                                                    {ingredient.unit && ` ${ingredient.unit}`}{' '}
                                                </span>
                                            )}
                                            {ingredient.name}
                                            {ingredient.optional && (
                                                <span className="text-gray-500 text-sm"> (optional)</span>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Instructions */}
                        <div className="bg-white rounded-lg border p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
                            <ol className="space-y-4">
                                {recipe.instructions?.map((instruction, index) => (
                                    <li key={index} className="flex items-start space-x-4">
                                        <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                            {index + 1}
                                        </span>
                                        <p className="text-gray-700 leading-relaxed">{instruction}</p>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {/* Reviews Section */}
                        <div className="bg-white rounded-lg border p-6">
                            <RecipeReviewsSection
                                recipeId={recipeId}
                                recipeOwnerId={recipe.createdBy}
                            />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Recipe Info Card - Updated with user tracking */}
                        <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipe Info</h3>
                            <div className="space-y-3 text-sm">
                                {/* Source */}
                                {recipe.source && (
                                    <div>
                                        <span className="text-gray-500">Source:</span>
                                        <span className="ml-2 text-gray-900">{recipe.source}</span>
                                    </div>
                                )}

                                {/* Imported From (for cookbook recipes) */}
                                {recipe.importedFrom && (
                                    <div>
                                        <span className="text-gray-500">Imported from:</span>
                                        <span className="ml-2 text-gray-900 italic">{recipe.importedFrom}</span>
                                    </div>
                                )}

                                {/* Created By */}
                                <div>
                                    <span className="text-gray-500">Added by:</span>
                                    <span className="ml-2 text-gray-900">
                {recipe.createdBy ? (
                    <span className="flex items-center gap-1">
                        <span>{recipe.createdBy.name || recipe.createdBy.email}</span>
                        {recipe.importedFrom && (
                            <span className="text-xs text-gray-400">(imported)</span>
                        )}
                    </span>
                ) : (
                    <span className="text-gray-400">Unknown</span>
                )}
            </span>
                                </div>

                                {/* Created Date */}
                                <div>
                                    <span className="text-gray-500">Created:</span>
                                    <span className="ml-2 text-gray-900">
                {new Date(recipe.createdAt).toLocaleDateString()}
            </span>
                                </div>

                                {/* Last Edited (only show if different from created) */}
                                {recipe.updatedAt !== recipe.createdAt && (
                                    <>
                                        <div>
                                            <span className="text-gray-500">Last edited by:</span>
                                            <span className="ml-2 text-gray-900">
                        {recipe.lastEditedBy ? (
                            recipe.lastEditedBy.name || recipe.lastEditedBy.email
                        ) : (
                            recipe.createdBy ? (
                                recipe.createdBy.name || recipe.createdBy.email
                            ) : (
                                <span className="text-gray-400">Unknown</span>
                            )
                        )}
                    </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Updated:</span>
                                            <span className="ml-2 text-gray-900">
                        {new Date(recipe.updatedAt).toLocaleDateString()}
                    </span>
                                        </div>
                                    </>
                                )}

                                {/* Category */}
                                {recipe.category && (
                                    <div>
                                        <span className="text-gray-500">Category:</span>
                                        <span className="ml-2 text-gray-900 capitalize">
                    {recipe.category.replace(/-/g, ' ')}
                </span>
                                    </div>
                                )}

                                {/* Privacy Status */}
                                <div>
                                    <span className="text-gray-500">Visibility:</span>
                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                        recipe.isPublic
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}>
                {recipe.isPublic ? 'Public' : 'Private'}
            </span>
                                </div>
                            </div>
                        </div>

                        {/* Compact Nutrition Display */}
                        {hasNutritionData && !showNutrition && (
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Nutrition Summary</h3>
                                <NutritionFacts
                                    nutrition={getNormalizedNutrition()}
                                    servings={recipe.servings || 1}
                                    showPerServing={true}
                                    compact={true}
                                />
                                <TouchEnhancedButton
                                    onClick={() => setShowNutrition(true)}
                                    className="w-full mt-3 text-sm text-indigo-600 hover:text-indigo-700"
                                >
                                    View detailed nutrition facts →
                                </TouchEnhancedButton>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <TouchEnhancedButton
                                    onClick={() => {
                                        fetchMealPlans();
                                        setShowMealPlanModal(true);
                                    }}
                                    className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                                >
                                    Add to Meal Plan
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => setShowQuickShoppingList(true)}
                                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                                >
                                    Generate Shopping List
                                </TouchEnhancedButton>
                                {/* UPDATED: Collections TouchEnhancedButton now functional */}
                                <TouchEnhancedButton
                                    onClick={() => {
                                        fetchCollections();
                                        setShowCollectionsModal(true);
                                    }}
                                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors shadow-sm"
                                >
                                    📚 Save to Collection
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Shopping List Modal */}
            {showQuickShoppingList && (
                <RecipeShoppingList
                    recipeId={recipeId}
                    recipeName={recipe.title}
                    onClose={() => setShowQuickShoppingList(false)}
                />
            )}

            {/* Add to Meal Plan Modal */}
            {showMealPlanModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Add "{recipe.title}" to Meal Plan
                                </h3>
                                <TouchEnhancedButton
                                    onClick={() => setShowMealPlanModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-xl"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>
                        </div>

                        <div className="p-4 max-h-80 overflow-y-auto">
                            {loadingMealPlans ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                    <p className="mt-2 text-gray-600">Loading meal plans...</p>
                                </div>
                            ) : mealPlans.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 mb-4">No meal plans found. Create one first!</p>
                                    <TouchEnhancedButton
                                        onClick={() => {
                                            setShowMealPlanModal(false);
                                            router.push('/meal-planning');
                                        }}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                                    >
                                        Go to Meal Planning
                                    </TouchEnhancedButton>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600 mb-4">
                                        Select a meal plan and specify when you'd like to add this recipe:
                                    </p>

                                    {mealPlans.map(mealPlan => (
                                        <div key={mealPlan._id} className="border border-gray-200 rounded-lg p-4">
                                            <h4 className="font-medium text-gray-900 mb-2">{mealPlan.name}</h4>
                                            <p className="text-sm text-gray-600 mb-3">
                                                Week of {new Date(mealPlan.weekStartDate).toLocaleDateString()}
                                            </p>

                                            <div className="grid grid-cols-2 gap-2">
                                                {/* Days and Meal Types */}
                                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                                                    <div key={day} className="space-y-1">
                                                        <div className="text-xs font-medium text-gray-700 capitalize">
                                                            {day}
                                                        </div>
                                                        <div className="space-y-1">
                                                            {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => (
                                                                <TouchEnhancedButton
                                                                    key={`${day}-${mealType}`}
                                                                    onClick={() => addToMealPlan(mealPlan._id, day, mealType)}
                                                                    className="w-full text-left px-2 py-1 text-xs bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 rounded transition-colors"
                                                                >
                                                                    {mealType}
                                                                </TouchEnhancedButton>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* NEW: Add to Collection Modal */}
            {showCollectionsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-lg w-full max-h-96 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    📚 Save "{recipe.title}" to Collection
                                </h3>
                                <TouchEnhancedButton
                                    onClick={() => setShowCollectionsModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-xl"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>
                        </div>

                        <div className="p-4 max-h-80 overflow-y-auto">
                            {loadingCollections ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                                    <p className="mt-2 text-gray-600">Loading collections...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Existing Collections */}
                                    {collections.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 mb-3">Add to existing collection:</h4>
                                            <div className="space-y-2">
                                                {collections.map(collection => (
                                                    <TouchEnhancedButton
                                                        key={collection._id}
                                                        onClick={() => addToCollection(collection._id)}
                                                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                                                    >
                                                        <div className="font-medium text-gray-900">{collection.name}</div>
                                                        {collection.description && (
                                                            <div className="text-sm text-gray-600 mt-1">{collection.description}</div>
                                                        )}
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {collection.recipes?.length || 0} recipe{(collection.recipes?.length || 0) !== 1 ? 's' : ''}
                                                        </div>
                                                    </TouchEnhancedButton>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Create New Collection */}
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                                            {collections.length > 0 ? 'Or create a new collection:' : 'Create your first collection:'}
                                        </h4>
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                const formData = new FormData(e.target);
                                                const name = formData.get('name');
                                                const description = formData.get('description');
                                                if (name.trim()) {
                                                    createCollectionAndAdd(name.trim(), description.trim());
                                                }
                                            }}
                                            className="space-y-3"
                                        >
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Collection Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    required
                                                    placeholder="e.g., Favorite Desserts, Quick Weeknight Meals"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Description (Optional)
                                                </label>
                                                <textarea
                                                    name="description"
                                                    rows={2}
                                                    placeholder="Brief description of this collection..."
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                                />
                                            </div>
                                            <TouchEnhancedButton
                                                type="submit"
                                                className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                                            >
                                                ✨ Create Collection & Add Recipe
                                            </TouchEnhancedButton>
                                        </form>
                                    </div>

                                    {collections.length === 0 && (
                                        <div className="text-center py-4 text-gray-500 text-sm">
                                            Collections help you organize your favorite recipes by theme, occasion, or dietary preferences.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </MobileOptimizedLayout>
    );
}