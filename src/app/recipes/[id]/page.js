'use client';
// file: /src/app/recipes/[id]/page.js v15 - Fixed multi-part recipe display with proper JSX structure

import { useEffect, useState } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { StarRating, RatingStats } from '@/components/reviews/RecipeRating';
import RecipeReviewsSection from '@/components/reviews/RecipeReviewsSection';
import NutritionFacts from '@/components/nutrition/NutritionFacts';
import RecipeShoppingList from '@/components/recipes/RecipeShoppingList';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiGet, apiPost, apiPut } from '@/lib/api-config';
import AddToCollectionButton from "@/components/recipes/AddToCollectionButton";
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import { FEATURE_GATES } from '@/lib/subscription-config';
import NutritionModal from '@/components/nutrition/NutritionModal';
import RecipePhotoGallery from '@/components/recipes/RecipePhotoGallery';
import RecipePhotoUpload from '@/components/recipes/RecipePhotoUpload';
import RecipeTransformationPanel from '@/components/recipes/RecipeTransformationPanel';

// Hero Recipe Image Component (placeholder - keep your existing implementation)
const RecipeHeroImage = ({ recipe, session, className = "", onImageUpdate }) => {
    // Your existing RecipeHeroImage implementation goes here
    return (
        <div className={`bg-gray-200 rounded-lg h-64 flex items-center justify-center ${className}`}>
            <span className="text-gray-500">Recipe Hero Image</span>
        </div>
    );
};

// FIXED: Multi-Part Recipe Component with proper JSX structure
const MultiPartRecipeSection = ({ recipe, servings, getScaledAmount, formatCookTime, getDifficultyColor }) => {
    const [activePartTab, setActivePartTab] = useState(0);
    const [showAllParts, setShowAllParts] = useState(false);

    if (!recipe.isMultiPart || !recipe.parts || recipe.parts.length === 0) {
        return null;
    }

    const totalIngredients = recipe.parts.reduce((total, part) => total + (part.ingredients?.length || 0), 0);
    const totalInstructions = recipe.parts.reduce((total, part) => total + (part.instructions?.length || 0), 0);

    return (
        <div className="space-y-8">
            {/* Multi-Part Recipe Header */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">
                            🧩 Multi-Part Recipe
                        </h3>
                        <p className="text-blue-800 text-sm mb-3">
                            This recipe has {recipe.parts.length} parts with {totalIngredients} total ingredients
                            and {totalInstructions} total steps.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {recipe.parts.map((part, index) => (
                                <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                                    {part.name || `Part ${index + 1}`}
                                </span>
                            ))}
                        </div>
                    </div>
                    <TouchEnhancedButton
                        onClick={() => setShowAllParts(!showAllParts)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                        {showAllParts ? 'Show Tabs' : 'Show All Parts'}
                    </TouchEnhancedButton>
                </div>
            </div>

            {showAllParts ? (
                /* Show All Parts in Sequence */
                <div className="space-y-8">
                    {recipe.parts.map((part, partIndex) => (
                        <div key={partIndex} className="bg-white rounded-lg border p-6">
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        {part.name || `Part ${partIndex + 1}`}
                                    </h3>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <span>👥 {part.ingredients?.length || 0} ingredients</span>
                                        <span>📋 {part.instructions?.length || 0} steps</span>
                                        {part.prepTime && (
                                            <span>⏱️ {formatCookTime(part.prepTime)} prep</span>
                                        )}
                                        {part.cookTime && (
                                            <span>🔥 {formatCookTime(part.cookTime)} cook</span>
                                        )}
                                    </div>
                                </div>

                                {part.description && (
                                    <p className="text-gray-600 mb-4">{part.description}</p>
                                )}
                            </div>

                            {/* Part Ingredients */}
                            <div className="mb-6">
                                <h4 className="text-lg font-medium text-gray-900 mb-3">
                                    Ingredients for {part.name}
                                </h4>
                                <ul className="space-y-2">
                                    {part.ingredients?.map((ingredient, index) => (
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

                            {/* Part Instructions */}
                            <div>
                                <h4 className="text-lg font-medium text-gray-900 mb-3">
                                    Instructions for {part.name}
                                </h4>
                                <ol className="space-y-3">
                                    {part.instructions?.map((instruction, index) => {
                                        const instructionText = typeof instruction === 'string' ? instruction :
                                            (instruction.text || instruction.instruction || '');
                                        const hasVideoTimestamp = typeof instruction === 'object' && instruction.videoTimestamp;

                                        return (
                                            <li key={index} className="flex items-start space-x-4">
                                                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                                    hasVideoTimestamp
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-indigo-600 text-white'
                                                }`}>
                                                    {index + 1}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-gray-700 leading-relaxed">{instructionText}</p>
                                                    {hasVideoTimestamp && instruction.videoLink && (
                                                        <div className="mt-2">
                                                            <a
                                                                href={instruction.videoLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm bg-purple-50 px-3 py-1 rounded-full border border-purple-200 hover:bg-purple-100 transition-colors"
                                                                title={`Jump to ${Math.floor(instruction.videoTimestamp / 60)}:${Math.floor(instruction.videoTimestamp % 60).toString().padStart(2, '0')} in video`}
                                                            >
                                                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M8 5v10l7-5-7-5z"/>
                                                                </svg>
                                                                Watch step: {Math.floor(instruction.videoTimestamp / 60)}:{Math.floor(instruction.videoTimestamp % 60).toString().padStart(2, '0')}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* FIXED: Show Tabbed View with proper JSX structure */
                <div className="bg-white rounded-lg border">
                    {/* Part Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6 pt-4" aria-label="Recipe parts">
                            {recipe.parts.map((part, index) => (
                                <TouchEnhancedButton
                                    key={index}
                                    onClick={() => setActivePartTab(index)}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activePartTab === index
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {part.name || `Part ${index + 1}`}
                                    <span className="ml-2 text-xs text-gray-400">
                                        ({part.ingredients?.length || 0} ingredients)
                                    </span>
                                </TouchEnhancedButton>
                            ))}
                        </nav>
                    </div>

                    {/* Active Part Content */}
                    <div className="p-6">
                        {recipe.parts[activePartTab] && (
                            <div>
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            {recipe.parts[activePartTab].name || `Part ${activePartTab + 1}`}
                                        </h3>
                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            {recipe.parts[activePartTab].prepTime && (
                                                <span>⏱️ Prep: {formatCookTime(recipe.parts[activePartTab].prepTime)}</span>
                                            )}
                                            {recipe.parts[activePartTab].cookTime && (
                                                <span>🔥 Cook: {formatCookTime(recipe.parts[activePartTab].cookTime)}</span>
                                            )}
                                        </div>
                                    </div>

                                    {recipe.parts[activePartTab].description && (
                                        <p className="text-gray-600 mb-4">{recipe.parts[activePartTab].description}</p>
                                    )}
                                </div>

                                {/* Ingredients for Active Part */}
                                <div className="mb-8">
                                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                                        Ingredients ({recipe.parts[activePartTab].ingredients?.length || 0})
                                    </h4>
                                    <ul className="space-y-2">
                                        {recipe.parts[activePartTab].ingredients?.map((ingredient, index) => (
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

                                {/* Instructions for Active Part */}
                                <div>
                                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                                        Instructions ({recipe.parts[activePartTab].instructions?.length || 0})
                                    </h4>
                                    <ol className="space-y-4">
                                        {recipe.parts[activePartTab].instructions?.map((instruction, index) => {
                                            const instructionText = typeof instruction === 'string' ? instruction :
                                                (instruction.text || instruction.instruction || '');
                                            const hasVideoTimestamp = typeof instruction === 'object' && instruction.videoTimestamp;

                                            return (
                                                <li key={index} className="flex items-start space-x-4">
                                                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                                        hasVideoTimestamp
                                                            ? 'bg-purple-600 text-white'
                                                            : 'bg-indigo-600 text-white'
                                                    }`}>
                                                        {index + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="text-gray-700 leading-relaxed">{instructionText}</p>
                                                        {hasVideoTimestamp && instruction.videoLink && (
                                                            <div className="mt-2">
                                                                <a
                                                                    href={instruction.videoLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm bg-purple-50 px-3 py-1 rounded-full border border-purple-200 hover:bg-purple-100 transition-colors"
                                                                    title={`Jump to ${Math.floor(instruction.videoTimestamp / 60)}:${Math.floor(instruction.videoTimestamp % 60).toString().padStart(2, '0')} in video`}
                                                                >
                                                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M8 5v10l7-5-7-5z"/>
                                                                    </svg>
                                                                    Watch step: {Math.floor(instruction.videoTimestamp / 60)}:{Math.floor(instruction.videoTimestamp % 60).toString().padStart(2, '0')}
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Single-Part Recipe Component (for backward compatibility)
const SinglePartRecipeSection = ({ recipe, servings, getScaledAmount, formatCookTime }) => {
    if (recipe.isMultiPart) {
        return null;
    }

    return (
        <div className="space-y-8">
            {/* Ingredients section */}
            <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Ingredients</h2>
                    {recipe.servings && (
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Servings:</span>
                            <span className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium text-gray-900 min-w-[3rem] text-center">
                                {servings}
                            </span>
                        </div>
                    )}
                </div>

                <div className="mb-2 text-xs text-gray-500">
                    {recipe.ingredients?.length || 0} ingredients •
                    {recipe.transformationApplied ? ` Transformed (${recipe.transformationApplied.type})` : ' Original'}
                </div>

                <ul className="space-y-2">
                    {recipe.ingredients?.length > 0 ? (
                        recipe.ingredients.map((ingredient, index) => {
                            const ingredientData = ingredient._doc || ingredient;
                            const name = ingredientData.name || ingredient.name || 'Unknown ingredient';
                            const amount = ingredient.amount || ingredientData.amount;
                            const unit = ingredient.unit || ingredientData.unit;
                            const optional = ingredient.optional || ingredientData.optional;

                            return (
                                <li key={index} className="flex items-start space-x-4">
                                    <input
                                        type="checkbox"
                                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-gray-700">
                                        {amount && (
                                            <span className="font-medium">
                                                {getScaledAmount(amount)}
                                                {unit && ` ${unit}`}{' '}
                                            </span>
                                        )}
                                        {name}
                                        {optional && (
                                            <span className="text-gray-500 text-sm"> (optional)</span>
                                        )}
                                        {ingredient.conversionMethod && ingredient.conversionMethod !== 'no_conversion_needed' && (
                                            <span className="text-blue-600 text-xs ml-2">
                                                ({ingredient.conversionMethod.replace(/_/g, ' ')})
                                            </span>
                                        )}
                                        {ingredient.scalingNotes && (
                                            <span className="text-green-600 text-xs ml-2">
                                                ({ingredient.scalingNotes})
                                            </span>
                                        )}
                                    </span>
                                </li>
                            );
                        })
                    ) : (
                        <li className="text-gray-500 italic">No ingredients available</li>
                    )}
                </ul>
            </div>

            {/* Instructions Section */}
            <div className="bg-white rounded-lg border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
                <ol className="space-y-4">
                    {recipe.instructions?.map((instruction, index) => {
                        const instructionText = typeof instruction === 'string' ? instruction : instruction.text;
                        const hasVideoTimestamp = typeof instruction === 'object' && instruction.videoTimestamp;

                        return (
                            <li key={index} className="flex items-start space-x-4">
                                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                    hasVideoTimestamp
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-indigo-600 text-white'
                                }`}>
                                    {typeof instruction === 'object' ? instruction.step || (index + 1) : (index + 1)}
                                </span>
                                <div className="flex-1">
                                    <p className="text-gray-700 leading-relaxed">{instructionText}</p>
                                    {hasVideoTimestamp && instruction.videoLink && (
                                        <div className="mt-2">
                                            <a
                                                href={instruction.videoLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm bg-purple-50 px-3 py-1 rounded-full border border-purple-200 hover:bg-purple-100 transition-colors"
                                                title={`Jump to ${Math.floor(instruction.videoTimestamp / 60)}:${Math.floor(instruction.videoTimestamp % 60).toString().padStart(2, '0')} in video`}
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M8 5v10l7-5-7-5z"/>
                                                </svg>
                                                Watch step: {Math.floor(instruction.videoTimestamp / 60)}:{Math.floor(instruction.videoTimestamp % 60).toString().padStart(2, '0')}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ol>

                {recipe.videoMetadata?.videoSource && (
                    <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="text-purple-600 mr-2">🎥</span>
                                <span className="text-sm text-purple-800 font-medium">
                                    Extracted from {recipe.videoMetadata.videoPlatform} video
                                </span>
                            </div>
                            <a
                                href={recipe.videoMetadata.videoSource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
                            >
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8 5v10l7-5-7-5z"/>
                                </svg>
                                Watch Original
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function RecipeDetailPage() {
    let session = null;

    try {
        const sessionResult = useSafeSession();
        session = sessionResult?.data || null;
    } catch (error) {
        session = null;
    }

    const params = useParams();
    const router = useRouter();
    const recipeId = params.id;
    const subscription = useSubscription();
    const mealPlanFeatureGate = useFeatureGate(FEATURE_GATES.CREATE_MEAL_PLAN);

    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNutrition, setShowNutrition] = useState(false);
    const [servings, setServings] = useState(1);
    const [showQuickShoppingList, setShowQuickShoppingList] = useState(false);
    const [showMealPlanModal, setShowMealPlanModal] = useState(false);
    const [mealPlans, setMealPlans] = useState([]);
    const [loadingMealPlans, setLoadingMealPlans] = useState(false);
    const [showNutritionModal, setShowNutritionModal] = useState(false);
    const [showPhotoUpload, setShowPhotoUpload] = useState(false);
    const [refreshPhotos, setRefreshPhotos] = useState(0);
    const [originalRecipe, setOriginalRecipe] = useState(null);
    const [refreshHeroImage, setRefreshHeroImage] = useState(0);

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
            const response = await apiGet(`/api/recipes/${recipeId}`);
            const data = await response.json();

            if (data.success) {
                setRecipe(data.recipe);
                setOriginalRecipe(data.recipe);
                await apiPost(`/api/recipes/${recipeId}/view`, {});
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

    // Helper functions
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

    const getScaledAmount = (amount) => {
        if (!amount || !recipe?.servings) return amount;

        const amountStr = String(amount);
        const match = amountStr.match(/^(\d+(?:\.\d+)?|\d+\/\d+)/);
        if (match) {
            const originalNumber = match[1];
            let number;

            if (originalNumber.includes('/')) {
                const [numerator, denominator] = originalNumber.split('/');
                number = parseFloat(numerator) / parseFloat(denominator);
            } else {
                number = parseFloat(originalNumber);
            }

            const scaledNumber = (number * servings) / recipe.servings;
            let formattedNumber;
            if (scaledNumber % 1 === 0) {
                formattedNumber = scaledNumber.toString();
            } else if (scaledNumber < 1) {
                const fraction = getFractionFromDecimal(scaledNumber);
                formattedNumber = fraction || scaledNumber.toFixed(2);
            } else {
                formattedNumber = parseFloat(scaledNumber.toFixed(2)).toString();
            }

            return amountStr.replace(originalNumber, formattedNumber);
        }
        return amountStr;
    };

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

        const rounded = Math.round(decimal * 1000) / 1000;
        return commonFractions[rounded] || null;
    };

    const hasNutritionData = recipe?.nutrition && (
        (recipe.nutrition.calories && (recipe.nutrition.calories.value > 0 || recipe.nutrition.calories > 0)) ||
        (recipe.nutrition.protein && (recipe.nutrition.protein.value > 0 || recipe.nutrition.protein > 0)) ||
        (recipe.nutrition.fat && (recipe.nutrition.fat.value > 0 || recipe.nutrition.fat > 0)) ||
        (recipe.nutrition.carbs && (recipe.nutrition.carbs.value > 0 || recipe.nutrition.carbs > 0)) ||
        (typeof recipe.nutrition.calories === 'number' && recipe.nutrition.calories > 0) ||
        (typeof recipe.nutrition.protein === 'number' && recipe.nutrition.protein > 0) ||
        (typeof recipe.nutrition.fat === 'number' && recipe.nutrition.fat > 0) ||
        (typeof recipe.nutrition.carbs === 'number' && recipe.nutrition.carbs > 0)
    );

    const getNormalizedNutrition = () => {
        if (!recipe?.nutrition) return null;

        if (recipe.nutrition.calories && typeof recipe.nutrition.calories === 'object') {
            return recipe.nutrition;
        }

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
                            {recipe.isMultiPart && <span className="ml-2">🧩 Multi-Part</span>}
                        </div>
                    </div>

                    {/* Title and Description */}
                    <div className="mb-6">
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN - Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Recipe Hero Image */}
                        <RecipeHeroImage
                            recipe={recipe}
                            session={session}
                            className="w-full"
                            onImageUpdate={() => setRefreshHeroImage(prev => prev + 1)}
                        />

                        {/* Recipe Transformation Panel - Add your existing component here */}
                        {/* <RecipeTransformationPanel recipe={recipe} onRecipeUpdate={setRecipe} /> */}

                        {/* Multi-Part or Single-Part Recipe Content */}
                        {recipe.isMultiPart ? (
                            <MultiPartRecipeSection
                                recipe={recipe}
                                servings={servings}
                                getScaledAmount={getScaledAmount}
                                formatCookTime={formatCookTime}
                                getDifficultyColor={getDifficultyColor}
                            />
                        ) : (
                            <SinglePartRecipeSection
                                recipe={recipe}
                                servings={servings}
                                getScaledAmount={getScaledAmount}
                                formatCookTime={formatCookTime}
                            />
                        )}

                        {/* Reviews Section */}
                        <div className="bg-white rounded-lg border p-6">
                            <RecipeReviewsSection
                                recipeId={recipeId}
                                recipeOwnerId={recipe.createdBy}
                            />
                        </div>
                    </div>

                    {/* RIGHT COLUMN - Sidebar */}
                    <div className="space-y-6">
                        {/* Recipe Info Card */}
                        <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipe Info</h3>
                            <div className="space-y-3 text-sm">
                                {/* Multi-part indicator */}
                                {recipe.isMultiPart && (
                                    <div>
                                        <span className="text-gray-500">Type:</span>
                                        <div className="ml-2 text-gray-900">
                                            <span className="text-blue-600 font-medium">🧩 Multi-part recipe</span>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {recipe.parts?.length || 0} parts with {recipe.parts?.reduce((total, part) => total + (part.ingredients?.length || 0), 0) || 0} total ingredients
                                            </div>
                                        </div>
                                    </div>
                                )}

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

                                <div>
                                    <span className="text-gray-500">Created:</span>
                                    <span className="ml-2 text-gray-900">
                                        {new Date(recipe.createdAt).toLocaleDateString()}
                                    </span>
                                </div>

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
                        {!showNutrition && hasNutritionData && (
                            <div className="bg-white rounded-lg border p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Nutrition Facts</h3>
                                    <TouchEnhancedButton
                                        onClick={() => setShowNutritionModal(true)}
                                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                                    >
                                        View Details
                                    </TouchEnhancedButton>
                                </div>
                                <NutritionFacts
                                    nutrition={getNormalizedNutrition()}
                                    servings={recipe.servings || 1}
                                    showPerServing={true}
                                    compact={false}
                                />
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipe Actions</h3>
                            <div className="space-y-3">
                                <TouchEnhancedButton
                                    onClick={() => setShowQuickShoppingList(true)}
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    🛒 Shopping List
                                </TouchEnhancedButton>

                                <AddToCollectionButton recipeId={recipeId} />

                                {session?.user?.id === recipe.createdBy && (
                                    <TouchEnhancedButton
                                        onClick={() => router.push(`/recipes/${recipeId}/edit`)}
                                        className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                                    >
                                        ✏️ Edit Recipe
                                    </TouchEnhancedButton>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals - Add your existing modals here */}
            {showQuickShoppingList && (
                <RecipeShoppingList
                    recipe={recipe}
                    isOpen={showQuickShoppingList}
                    onClose={() => setShowQuickShoppingList(false)}
                />
            )}

            {showNutritionModal && (
                <NutritionModal
                    nutrition={getNormalizedNutrition()}
                    isOpen={showNutritionModal}
                    onClose={() => setShowNutritionModal(false)}
                    servings={recipe.servings || 1}
                />
            )}

            <Footer />
        </MobileOptimizedLayout>
    );
}