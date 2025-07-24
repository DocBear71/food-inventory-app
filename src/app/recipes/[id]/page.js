'use client';
// file: /src/app/recipes/[id]/page.js v11 - FIXED transformation handling and reset functionality

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
import { apiGet, apiPost, apiPut } from '@/lib/api-config';
import AddToCollectionButton from "@/components/recipes/AddToCollectionButton";
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import { FEATURE_GATES } from '@/lib/subscription-config';
import NutritionModal from '@/components/nutrition/NutritionModal';
import RecipePhotoGallery from '@/components/recipes/RecipePhotoGallery';
import RecipePhotoUpload from '@/components/recipes/RecipePhotoUpload';
import RecipeTransformationPanel from '@/components/recipes/RecipeTransformationPanel';


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

    // Add this function to handle photo uploads:
    const handlePhotoUploaded = (photo) => {
        setRefreshPhotos(prev => prev + 1);
        setShowPhotoUpload(false);
        // Optionally refresh the recipe to get updated photo count
        fetchRecipe();
    };

    const fetchRecipe = async () => {
        try {
            const response = await apiGet(`/api/recipes/${recipeId}`);
            const data = await response.json();

            if (data.success) {
                setRecipe(data.recipe);
                setOriginalRecipe(data.recipe); // Store original for revert
                // Increment view count
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

    const fetchMealPlans = async () => {
        setLoadingMealPlans(true);
        try {
            const response = await apiGet('/api/meal-plans');
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

    const addToMealPlan = async (mealPlanId, day, mealType) => {
        try {
            const response = await apiGet(`/api/meal-plans/${mealPlanId}`);

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

            const updateResponse = await apiPut(`/api/meal-plans/${mealPlanId}`, {
                meals: updatedMeals
            });

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

    // Handle meal planning feature gate
    const handleMealPlanClick = () => {
        if (!mealPlanFeatureGate.canUse) {
            // Redirect to pricing page for free users
            window.location.href = `/pricing?source=meal-planning&feature=${FEATURE_GATES.CREATE_MEAL_PLAN}&required=${mealPlanFeatureGate.requiredTier}`;
            return;
        }

        fetchMealPlans();
        setShowMealPlanModal(true);
    };

    // FIXED: Enhanced transformation change handler
    const handleTransformationChange = (transformedRecipe) => {
        console.log('🔄 Recipe transformation applied:', transformedRecipe);

        // Create a deep copy to avoid mutation issues
        const updatedRecipe = {
            ...recipe,
            ...transformedRecipe,
            // Ensure we keep the original recipe metadata
            _id: recipe._id,
            title: recipe.title,
            description: recipe.description,
            createdBy: recipe.createdBy,
            createdAt: recipe.createdAt,
            updatedAt: recipe.updatedAt
        };

        console.log('🔄 Setting updated recipe:', updatedRecipe);
        setRecipe(updatedRecipe);

        // Update servings if changed
        if (transformedRecipe.servings && transformedRecipe.servings !== servings) {
            setServings(transformedRecipe.servings);
        }
    };

    // FIXED: Enhanced revert functionality that actually works
    const handleRevert = () => {
        console.log('🔄 Reverting to original recipe - Current recipe:', recipe);
        console.log('🔄 Original recipe stored:', originalRecipe);

        if (originalRecipe) {
            // Create a completely clean copy of the original recipe
            const revertedRecipe = JSON.parse(JSON.stringify(originalRecipe));

            // Ensure transformation flags are cleared
            delete revertedRecipe.transformationApplied;
            delete revertedRecipe.currentMeasurementSystem;
            delete revertedRecipe.currentServings;

            console.log('🔄 Setting reverted recipe:', revertedRecipe);
            setRecipe(revertedRecipe);
            setServings(originalRecipe.servings || 4);
        } else {
            console.error('❌ No original recipe stored for revert');
            // Fallback: reload the recipe from server
            fetchRecipe();
        }
    };

    // FIXED: Make reset function globally available for widgets
    useEffect(() => {
        window.handleRevertFromWidget = handleRevert;
        return () => {
            delete window.handleRevertFromWidget;
        };
    }, [originalRecipe]);

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

                    {/* UPDATED: Action Buttons - Separate row with better wrapping */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {/* Show edit button if user owns the recipe */}
                        {session?.user?.id === recipe.createdBy?._id && (
                            <TouchEnhancedButton
                                onClick={() => router.push(`/recipes/${recipeId}/edit`)}
                                className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                <span className="hidden sm:inline">Edit Recipe</span>
                                <span className="sm:hidden">Edit</span>
                            </TouchEnhancedButton>
                        )}

                        <AddToCollectionButton
                            recipeId={recipe._id}
                            recipeName={recipe.title}
                        />

                        {/* UPDATED: Meal Planning Button with Feature Gate */}
                        <TouchEnhancedButton
                            onClick={handleMealPlanClick}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                mealPlanFeatureGate.canUse
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                            }`}
                            title={mealPlanFeatureGate.canUse ? 'Add to meal plan' : 'Upgrade to add to meal plans'}
                        >
                            {mealPlanFeatureGate.canUse ? (
                                <>
                                    <span className="hidden sm:inline">📅 Add to Meal Plan</span>
                                    <span className="sm:hidden">📅 Meal Plan</span>
                                </>
                            ) : (
                                <>
                                    <span className="hidden sm:inline">🔒 Meal Planning (Gold)</span>
                                    <span className="sm:hidden">🔒 Meal Plan</span>
                                </>
                            )}
                        </TouchEnhancedButton>

                        {/* Shopping List Button */}
                        <TouchEnhancedButton
                            onClick={() => setShowQuickShoppingList(true)}
                            className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                            <span className="hidden sm:inline">🛒 Generate Shopping List</span>
                            <span className="sm:hidden">🛒 Shopping</span>
                        </TouchEnhancedButton>

                        {hasNutritionData && (
                            <TouchEnhancedButton
                                onClick={() => setShowNutritionModal(true)}
                                className="bg-emerald-600 text-white px-3 py-2 rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
                            >
                                <span className="hidden sm:inline">🥗 Nutrition Details</span>
                                <span className="sm:hidden">🥗 Nutrition</span>
                            </TouchEnhancedButton>
                        )}

                        <TouchEnhancedButton
                            onClick={() => window.print()}
                            className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                        >
                            Print
                        </TouchEnhancedButton>
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
                        {/* Recipe Photos Section */}
                        <div className="bg-white rounded-lg border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">Photos</h2>
                                {session?.user?.id === recipe.createdBy?._id && (
                                    <TouchEnhancedButton
                                        onClick={() => setShowPhotoUpload(!showPhotoUpload)}
                                        className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm font-medium flex items-center space-x-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span>Add Photo</span>
                                    </TouchEnhancedButton>
                                )}
                            </div>

                            {/* Photo Upload Section */}
                            {showPhotoUpload && session?.user?.id === recipe.createdBy?._id && (
                                <div className="mb-6">
                                    <RecipePhotoUpload
                                        recipeId={recipe._id}
                                        onPhotoUploaded={handlePhotoUploaded}
                                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                                    />
                                </div>
                            )}

                            {/* Photo Gallery */}
                            <RecipePhotoGallery
                                recipeId={recipe._id}
                                canEdit={session?.user?.id === recipe.createdBy?._id}
                                key={refreshPhotos} // Force refresh when photos change
                            />
                        </div>
                        <br/>

                        {/* RECIPE TRANSFORMATION PANEL */}
                        <RecipeTransformationPanel
                            recipe={recipe}
                            onTransformationChange={handleTransformationChange}
                            onRevert={handleRevert}
                            showSaveOptions={true}
                            defaultExpanded={false}
                        />

                        {/* FIXED: Ingredients section with debug logging */}
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

                            {/* DEBUG: Show ingredient count */}
                            <div className="mb-2 text-xs text-gray-500">
                                {recipe.ingredients?.length || 0} ingredients •
                                {recipe.transformationApplied ? ` Transformed (${recipe.transformationApplied.type})` : ' Original'}
                            </div>

                            <ul className="space-y-2">
                                {recipe.ingredients?.length > 0 ? (
                                    recipe.ingredients.map((ingredient, index) => {
                                        // FIXED: Extract ingredient data from complex Mongoose objects
                                        const ingredientData = ingredient._doc || ingredient;
                                        const name = ingredientData.name || ingredient.name || 'Unknown ingredient';
                                        const amount = ingredient.amount || ingredientData.amount;
                                        const unit = ingredient.unit || ingredientData.unit;
                                        const optional = ingredient.optional || ingredientData.optional;

                                        console.log(`🥘 Rendering ingredient ${index}:`, {
                                            ingredient,
                                            ingredientData,
                                            name,
                                            amount,
                                            unit
                                        });

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
                                                    {/* FIXED: Show conversion notes if present */}
                                                    {ingredient.conversionMethod && ingredient.conversionMethod !== 'no_conversion_needed' && (
                                                        <span className="text-blue-600 text-xs ml-2">
                                                            ({ingredient.conversionMethod.replace(/_/g, ' ')})
                                                        </span>
                                                    )}
                                                    {/* FIXED: Show scaling notes if present */}
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
                                    // Handle both string instructions and video instruction objects
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
                                                {/* Show video timestamp link if available */}
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

                            {/* Show video source info if this recipe has video timestamps */}
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

                                {/* FIXED: Show transformation status if applied */}
                                {recipe.transformationApplied && (
                                    <div className="pt-2 border-t border-gray-200">
                                        <span className="text-gray-500">Transformation:</span>
                                        <div className="ml-2 text-sm">
                                            {recipe.transformationApplied.type === 'scale' && (
                                                <span className="text-blue-600">
                                                    Scaled to {recipe.servings} servings
                                                </span>
                                            )}
                                            {recipe.transformationApplied.type === 'convert' && (
                                                <span className="text-purple-600">
                                                    Converted to {recipe.transformationApplied.targetSystem === 'metric' ? 'Metric' : 'US Standard'}
                                                </span>
                                            )}
                                            {recipe.transformationApplied.type === 'both' && (
                                                <span className="text-green-600">
                                                    Scaled & Converted
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Compact Nutrition Display - Professional Style */}
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

            {/* Improved Add to Meal Plan Modal */}
            {showMealPlanModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-200 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Add "{recipe.title}" to Meal Plan
                                </h3>
                                <TouchEnhancedButton
                                    onClick={() => setShowMealPlanModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                                Select a meal plan and choose when you'd like to add this recipe.
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingMealPlans ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600">Loading meal plans...</p>
                                </div>
                            ) : mealPlans.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">📅</div>
                                    <h4 className="text-lg font-medium text-gray-900 mb-2">No meal plans found</h4>
                                    <p className="text-gray-500 mb-6">Create your first meal plan to get started!</p>
                                    <TouchEnhancedButton
                                        onClick={() => {
                                            setShowMealPlanModal(false);
                                            router.push('/meal-planning');
                                        }}
                                        className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors font-medium"
                                    >
                                        Go to Meal Planning
                                    </TouchEnhancedButton>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {mealPlans.map(mealPlan => (
                                        <div key={mealPlan._id} className="border border-gray-200 rounded-lg overflow-hidden">
                                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                                <h4 className="font-semibold text-gray-900 text-lg">{mealPlan.name}</h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Week of {new Date(mealPlan.weekStartDate).toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                                </p>
                                            </div>

                                            <div className="p-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                                                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                                                        <div key={day} className="space-y-3">
                                                            <div className="font-medium text-gray-700 capitalize text-center">
                                                                {day}
                                                            </div>
                                                            <div className="space-y-2">
                                                                {['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'].map(mealType => (
                                                                    <TouchEnhancedButton
                                                                        key={`${day}-${mealType}`}
                                                                        onClick={() => addToMealPlan(mealPlan._id, day, mealType)}
                                                                        className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-gray-200 rounded-md transition-colors"
                                                                    >
                                                                        {mealType}
                                                                    </TouchEnhancedButton>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    💡 Tip: You can create and manage meal plans in the
                                    <TouchEnhancedButton
                                        onClick={() => {
                                            setShowMealPlanModal(false);
                                            router.push('/meal-planning');
                                        }}
                                        className="ml-1 text-indigo-600 hover:text-indigo-700 underline"
                                    >
                                        Meal Planning
                                    </TouchEnhancedButton> section
                                </p>
                                <TouchEnhancedButton
                                    onClick={() => setShowMealPlanModal(false)}
                                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Nutrition Details Modal */}
            <NutritionModal
                nutrition={getNormalizedNutrition()}
                isOpen={showNutritionModal}
                onClose={() => setShowNutritionModal(false)}
                servings={recipe?.servings || 1}
                recipeTitle={recipe?.title || "Recipe"}
            />

            <Footer />
        </MobileOptimizedLayout>
    );
}