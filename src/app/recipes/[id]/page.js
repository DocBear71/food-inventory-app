// file: /src/app/recipes/[id]/page.js - v1

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import NutritionFacts from '@/components/nutrition/NutritionFacts';
import { redirect } from 'next/navigation';

export default function RecipeDetailPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const router = useRouter();
    const recipeId = params.id;

    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNutrition, setShowNutrition] = useState(false);
    const [selectedServings, setSelectedServings] = useState(1);

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session && recipeId) {
            fetchRecipe();
        }
    }, [session, recipeId]);

    const fetchRecipe = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/recipes?recipeId=${recipeId}`);
            const data = await response.json();

            if (data.success && data.recipe) {
                setRecipe(data.recipe);
                setSelectedServings(data.recipe.servings || 1);
            } else {
                setError('Recipe not found');
            }
        } catch (err) {
            setError('Failed to load recipe');
            console.error('Recipe fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        router.push(`/recipes?action=edit&id=${recipeId}`);
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this recipe?')) return;

        try {
            const response = await fetch(`/api/recipes?recipeId=${recipeId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                router.push('/recipes');
            } else {
                alert(data.error || 'Failed to delete recipe');
            }
        } catch (err) {
            alert('Error deleting recipe');
            console.error('Recipe delete error:', err);
        }
    };

    const getDifficultyIcon = (difficulty) => {
        switch (difficulty) {
            case 'easy': return '🟢';
            case 'medium': return '🟡';
            case 'hard': return '🔴';
            default: return '⚪';
        }
    };

    if (status === 'loading' || loading) {
        return (
            <DashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-lg">Loading recipe...</div>
                </div>
            </DashboardLayout>
        );
    }

    if (!session) {
        return null;
    }

    if (error || !recipe) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto py-8">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <div className="text-red-800 text-lg font-medium mb-2">
                            {error || 'Recipe not found'}
                        </div>
                        <button
                            onClick={() => router.push('/recipes')}
                            className="text-red-600 hover:text-red-800 underline"
                        >
                            ← Back to Recipes
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const canEdit = recipe.createdBy === session.user.id;

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto py-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => router.push('/recipes')}
                            className="text-indigo-600 hover:text-indigo-800 flex items-center"
                        >
                            ← Back to Recipes
                        </button>
                        {canEdit && (
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleEdit}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                >
                                    Edit Recipe
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>

                    {recipe.description && (
                        <p className="text-lg text-gray-600 mb-4">{recipe.description}</p>
                    )}

                    {/* Recipe Meta */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        {recipe.prepTime && (
                            <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                                <span className="mr-1">⏱️</span>
                                Prep: {recipe.prepTime}m
                            </div>
                        )}
                        {recipe.cookTime && (
                            <div className="flex items-center bg-orange-50 px-3 py-1 rounded-full">
                                <span className="mr-1">🔥</span>
                                Cook: {recipe.cookTime}m
                            </div>
                        )}
                        {recipe.servings && (
                            <div className="flex items-center bg-green-50 px-3 py-1 rounded-full">
                                <span className="mr-1">🍽️</span>
                                Serves: {recipe.servings}
                            </div>
                        )}
                        <div className={`flex items-center px-3 py-1 rounded-full ${getDifficultyColor(recipe.difficulty)}`}>
                            <span className="mr-1">{getDifficultyIcon(recipe.difficulty)}</span>
                            {recipe.difficulty || 'medium'}
                        </div>
                    </div>

                    {/* Tags */}
                    {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {recipe.tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Source */}
                    {recipe.source && (
                        <div className="mt-4 text-sm text-gray-600">
                            <span className="font-medium">Source:</span> {recipe.source}
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Recipe Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Ingredients */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                Ingredients
                                {recipe.servings && recipe.servings !== selectedServings && (
                                    <span className="text-sm font-normal text-gray-600 ml-2">
                                        (scaled for {selectedServings} serving{selectedServings !== 1 ? 's' : ''})
                                    </span>
                                )}
                            </h2>

                            {recipe.servings && recipe.servings > 1 && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Adjust servings:
                                    </label>
                                    <input
                                        type="number"
                                        min="0.5"
                                        max="20"
                                        step="0.5"
                                        value={selectedServings}
                                        onChange={(e) => setSelectedServings(parseFloat(e.target.value) || 1)}
                                        className="w-24 border border-gray-300 rounded-md px-3 py-1 text-sm"
                                    />
                                </div>
                            )}

                            <ul className="space-y-3">
                                {recipe.ingredients?.map((ingredient, index) => {
                                    const scaleFactor = selectedServings / (recipe.servings || 1);
                                    let scaledAmount = ingredient.amount;

                                    // Try to scale numeric amounts
                                    if (ingredient.amount && !isNaN(parseFloat(ingredient.amount))) {
                                        const numAmount = parseFloat(ingredient.amount);
                                        scaledAmount = (numAmount * scaleFactor).toString();
                                        if (scaledAmount.includes('.') && scaledAmount.split('.')[1].length > 2) {
                                            scaledAmount = parseFloat(scaledAmount).toFixed(2);
                                        }
                                    }

                                    return (
                                        <li key={index} className={`flex items-start ${ingredient.optional ? 'text-gray-600' : ''}`}>
                                            <span className="inline-block w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                            <span>
                                                {scaledAmount && `${scaledAmount} `}
                                                {ingredient.unit && `${ingredient.unit} `}
                                                <span className="font-medium">{ingredient.name}</span>
                                                {ingredient.optional && <span className="text-sm"> (optional)</span>}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Instructions */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
                            <ol className="space-y-4">
                                {recipe.instructions?.map((instruction, index) => (
                                    <li key={index} className="flex items-start">
                                        <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-600 text-white text-sm font-medium rounded-full mr-4 flex-shrink-0">
                                            {index + 1}
                                        </span>
                                        <p className="text-gray-700 leading-relaxed">{instruction}</p>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>

                    {/* Right Column - Nutrition & Actions */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowNutrition(!showNutrition)}
                                    className="w-full flex items-center justify-center px-4 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
                                >
                                    <span className="mr-2">🥗</span>
                                    {showNutrition ? 'Hide' : 'Show'} Nutrition Facts
                                </button>

                                <button
                                    onClick={() => router.push(`/shopping/generate?recipeId=${recipeId}`)}
                                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                                >
                                    <span className="mr-2">🛒</span>
                                    Generate Shopping List
                                </button>

                                <button
                                    onClick={() => window.print()}
                                    className="w-full flex items-center justify-center px-4 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                                >
                                    <span className="mr-2">🖨️</span>
                                    Print Recipe
                                </button>
                            </div>
                        </div>

                        {/* Nutrition Facts */}
                        {showNutrition && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Nutrition Information</h3>
                                <NutritionFacts
                                    recipeId={recipeId}
                                    servings={selectedServings}
                                    showPerServing={true}
                                />
                            </div>
                        )}

                        {/* Recipe Stats */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipe Stats</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Ingredients:</span>
                                    <span className="font-medium">{recipe.ingredients?.length || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Instructions:</span>
                                    <span className="font-medium">{recipe.instructions?.length || 0} steps</span>
                                </div>
                                {recipe.prepTime && recipe.cookTime && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Time:</span>
                                        <span className="font-medium">{recipe.prepTime + recipe.cookTime} minutes</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Visibility:</span>
                                    <span className={`font-medium ${recipe.isPublic ? 'text-green-600' : 'text-gray-600'}`}>
                                        {recipe.isPublic ? 'Public' : 'Private'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Created:</span>
                                    <span className="font-medium">
                                        {new Date(recipe.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
        case 'easy': return 'bg-green-100 text-green-800';
        case 'medium': return 'bg-yellow-100 text-yellow-800';
        case 'hard': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};