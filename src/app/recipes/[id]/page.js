// file: /src/app/recipes/[id]/page.js v6

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { StarRating, RatingStats } from '@/components/reviews/RecipeRating';
import RecipeReviewsSection from '@/components/reviews/RecipeReviewsSection';
import NutritionFacts from '@/components/nutrition/NutritionFacts';

export default function RecipeDetailPage() {
    const { data: session } = useSession();
    const params = useParams();
    const router = useRouter();
    const recipeId = params.id;

    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNutrition, setShowNutrition] = useState(false);
    const [servings, setServings] = useState(1);

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
            const response = await fetch(`/api/recipes/${recipeId}`);
            const data = await response.json();

            if (data.success) {
                setRecipe(data.recipe);
                // Increment view count
                await fetch(`/api/recipes/${recipeId}/view`, { method: 'POST' });
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

        // Extract number from amount string
        const match = amount.match(/^(\d+(?:\.\d+)?)/);
        if (match) {
            const number = parseFloat(match[1]);
            const scaledNumber = (number * servings) / recipe.servings;
            return amount.replace(match[1], scaledNumber.toString());
        }
        return amount;
    };

    if (loading) {
        return (
            <DashboardLayout>
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
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="text-center">
                        <div className="text-red-600 text-lg font-medium mb-4">{error}</div>
                        <button
                            onClick={() => window.history.back()}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
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
                                <button
                                    onClick={() => router.push(`/recipes/${recipeId}/edit`)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    Edit Recipe
                                </button>
                            )}
                            <button
                                onClick={() => setShowNutrition(!showNutrition)}
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                            >
                                {showNutrition ? 'Hide' : 'Show'} Nutrition
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Print
                            </button>
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
                {showNutrition && recipe.nutrition && (
                    <div className="mb-8">
                        <NutritionFacts nutrition={recipe.nutrition} servings={servings} />
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
                                    <li key={index} className="flex items-start space-x-3">
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
                        {/* Recipe Info Card */}
                        <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipe Info</h3>
                            <div className="space-y-3 text-sm">
                                {recipe.source && (
                                    <div>
                                        <span className="text-gray-500">Source:</span>
                                        <span className="ml-2 text-gray-900">{recipe.source}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-gray-500">Created:</span>
                                    <span className="ml-2 text-gray-900">
                                        {new Date(recipe.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                {recipe.updatedAt !== recipe.createdAt && (
                                    <div>
                                        <span className="text-gray-500">Updated:</span>
                                        <span className="ml-2 text-gray-900">
                                            {new Date(recipe.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
                                    Add to Meal Plan
                                </button>
                                <button className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                                    Generate Shopping List
                                </button>
                                <button className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
                                    Save to Collection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}