'use client';
// file: /src/components/recipes/RecipeCard.js - v2 (With Cooking Integration)


import { useState } from 'react';
import RecipeCookingIntegration from '@/components/recipes/RecipeCookingIntegration';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function RecipeCard({ recipe, onEdit, onDelete, showActions = true }) {
    const [showCooking, setShowCooking] = useState(false);

    const handleCookingComplete = (summary) => {
        console.log('Cooking completed:', summary);
        alert(`Successfully updated inventory! ${summary.itemsRemoved.length} items removed, ${summary.itemsUpdated.length} items updated.`);
        setShowCooking(false);
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'bg-green-100 text-green-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'hard': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">{recipe.title}</h3>
                        {recipe.difficulty && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getDifficultyColor(recipe.difficulty)}`}>
                                {recipe.difficulty}
                            </span>
                        )}
                    </div>

                    {recipe.description && (
                        <p className="text-gray-600 mb-4 line-clamp-2">{recipe.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-500">
                        {recipe.prepTime && (
                            <div className="flex items-center">
                                <span className="mr-1">⏱️</span>
                                Prep: {recipe.prepTime}min
                            </div>
                        )}
                        {recipe.cookTime && (
                            <div className="flex items-center">
                                <span className="mr-1">🔥</span>
                                Cook: {recipe.cookTime}min
                            </div>
                        )}
                        {recipe.servings && (
                            <div className="flex items-center">
                                <span className="mr-1">🍽️</span>
                                Serves: {recipe.servings}
                            </div>
                        )}
                    </div>

                    {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                            {recipe.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                    {tag}
                                </span>
                            ))}
                            {recipe.tags.length > 3 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                                    +{recipe.tags.length - 3} more
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            <TouchEnhancedButton
                                onClick={() => setShowCooking(true)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                                👨‍🍳 Cook This
                            </TouchEnhancedButton>
                            <TouchEnhancedButton className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                📖 View Recipe
                            </TouchEnhancedButton>
                        </div>

                        {showActions && (
                            <div className="flex gap-2">
                                {onEdit && (
                                    <TouchEnhancedButton
                                        onClick={() => onEdit(recipe)}
                                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                                    >
                                        Edit
                                    </TouchEnhancedButton>
                                )}
                                {onDelete && (
                                    <TouchEnhancedButton
                                        onClick={() => onDelete(recipe._id)}
                                        className="text-red-600 hover:text-red-900 text-sm"
                                    >
                                        Delete
                                    </TouchEnhancedButton>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cooking Integration Modal */}
            {showCooking && (
                <RecipeCookingIntegration
                    recipe={recipe}
                    onCookingComplete={handleCookingComplete}
                    onClose={() => setShowCooking(false)}
                    servingsMultiplier={1}
                />
            )}
        </>
    );
}