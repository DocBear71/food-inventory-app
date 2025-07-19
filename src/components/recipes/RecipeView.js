'use client';

// file: /src/components/recipes/RecipeView.js - Fixed and Enhanced with Photos & Scaling

import React, { useState } from 'react';
import { RecipeScaler } from './RecipeScaler';
import { RecipePhotoUpload } from './RecipePhotoUpload';
import { SocialMediaShare } from './SocialMediaShare';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export function RecipeView({ recipe, canEdit = false }) {
    const [showScaler, setShowScaler] = useState(false);
    const [showPhotoUpload, setShowPhotoUpload] = useState(false);
    const [scaledData, setScaledData] = useState(null);
    const [photos, setPhotos] = useState(recipe.photos || []);

    // Get primary photo for display
    const primaryPhoto = photos.find(photo => photo.isPrimary) || photos[0];

    const handleScaleChange = (data) => {
        setScaledData(data);

        if (data.action === 'generate_shopping_list') {
            // Handle shopping list generation
            addToShoppingList(data.shoppingList);
        }
    };

    const addToShoppingList = async (items) => {
        try {
            const response = await fetch('/api/shopping/add-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items })
            });

            if (response.ok) {
                alert('Items added to shopping list!');
            }
        } catch (error) {
            console.error('Error adding to shopping list:', error);
        }
    };

    const handlePhotosUpdate = (updatedPhotos) => {
        setPhotos(updatedPhotos);
    };

    const displayIngredients = scaledData?.scaledIngredients || recipe.ingredients;

    // Calculate scaled cooking times
    const getScaledTime = (originalTime) => {
        if (!scaledData?.cookingTimeAdjustment || !originalTime) return originalTime;

        const timeMatch = originalTime.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
        if (!timeMatch) return originalTime;

        const amount = parseInt(timeMatch[1]);
        const unit = timeMatch[2];
        const scaledAmount = Math.round(amount * scaledData.cookingTimeAdjustment);

        return `${scaledAmount} ${unit}`;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Recipe Header with Photo */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Hero Photo Section */}
                {primaryPhoto ? (
                    <div className="relative h-64 md:h-80">
                        <img
                            src={primaryPhoto.url}
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                        />
                        {/* Photo Count Badge */}
                        {photos.length > 1 && (
                            <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white text-sm px-3 py-1 rounded-full">
                                📸 {photos.length} photos
                            </div>
                        )}
                        {/* Social Share Button */}
                        <div className="absolute top-4 right-4">
                            <SocialMediaShare recipe={recipe} />
                        </div>
                    </div>
                ) : (
                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                        <span className="text-6xl text-gray-400">🍳</span>
                    </div>
                )}

                {/* Header Content */}
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
                            {recipe.description && (
                                <p className="text-gray-600 text-lg">{recipe.description}</p>
                            )}
                        </div>
                    </div>

                    {/* Recipe Meta Info */}
                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-4">
                        <div className="flex items-center space-x-1">
                            <span>👥</span>
                            <span>{scaledData?.targetServings || recipe.servings || 4} servings</span>
                        </div>
                        {recipe.prepTime && (
                            <div className="flex items-center space-x-1">
                                <span>⏱️</span>
                                <span>{scaledData ? getScaledTime(recipe.prepTime) : recipe.prepTime} prep</span>
                            </div>
                        )}
                        {recipe.cookTime && (
                            <div className="flex items-center space-x-1">
                                <span>🔥</span>
                                <span>{scaledData ? getScaledTime(recipe.cookTime) : recipe.cookTime} cook</span>
                            </div>
                        )}
                        {recipe.difficulty && (
                            <div className="flex items-center space-x-1">
                                <span>📊</span>
                                <span className="capitalize">{recipe.difficulty}</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <TouchEnhancedButton
                            onClick={() => setShowScaler(!showScaler)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                        >
                            <span>⚖️</span>
                            <span>{showScaler ? 'Hide Scaler' : 'Scale Recipe'}</span>
                        </TouchEnhancedButton>

                        {canEdit && (
                            <TouchEnhancedButton
                                onClick={() => setShowPhotoUpload(!showPhotoUpload)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
                            >
                                <span>📸</span>
                                <span>{showPhotoUpload ? 'Hide Photos' : 'Manage Photos'}</span>
                            </TouchEnhancedButton>
                        )}

                        <TouchEnhancedButton
                            onClick={() => {
                                const items = displayIngredients.map(ingredient => ({
                                    name: ingredient.name,
                                    quantity: ingredient.quantity,
                                    category: ingredient.category || 'Other',
                                    notes: `For ${recipe.title}`
                                }));
                                addToShoppingList(items);
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                        >
                            <span>🛒</span>
                            <span>Add to Shopping List</span>
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>

            {/* Photo Upload Section */}
            {showPhotoUpload && canEdit && (
                <RecipePhotoUpload
                    recipeId={recipe._id || recipe.id}
                    existingPhotos={photos}
                    onPhotosUpdate={handlePhotosUpdate}
                />
            )}

            {/* Recipe Scaler */}
            {showScaler && (
                <RecipeScaler
                    recipe={recipe}
                    onScaleChange={handleScaleChange}
                />
            )}

            {/* Photo Gallery */}
            {photos.length > 1 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">📸 Recipe Photos</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {photos.map((photo, index) => (
                            <div key={photo.id || index} className="relative group">
                                <img
                                    src={photo.url}
                                    alt={`${recipe.title} - Photo ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
                                />
                                {photo.isPrimary && (
                                    <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                        Primary
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Ingredients */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">🧄 Ingredients</h2>
                    {scaledData && (
                        <span className="text-sm text-blue-600 font-medium">
                            Scaled for {scaledData.targetServings} servings ({scaledData.scalingFactor?.toFixed(2)}x)
                        </span>
                    )}
                </div>

                <div className="space-y-3">
                    {displayIngredients.map((ingredient, index) => (
                        <div key={index} className="flex items-center space-x-3 group">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <span className="text-gray-900 font-medium">{ingredient.quantity}</span>
                                <span className="text-gray-900 ml-2">{ingredient.name}</span>
                                {ingredient.notes && (
                                    <span className="text-gray-500 text-sm ml-2">({ingredient.notes})</span>
                                )}
                            </div>
                            {scaledData && ingredient.originalQuantity && (
                                <span className="text-xs text-gray-400 line-through opacity-0 group-hover:opacity-100 transition-opacity">
                                    Originally: {ingredient.originalQuantity}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Instructions</h2>
                <div className="space-y-4">
                    {recipe.instructions && recipe.instructions.map((instruction, index) => (
                        <div key={index} className="flex items-start space-x-3 group">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-1">
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <p className="text-gray-700 leading-relaxed">{instruction}</p>
                            </div>
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                title={`Mark step ${index + 1} as complete`}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Recipe Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">🏷️ Tags</h2>
                    <div className="flex flex-wrap gap-2">
                        {recipe.tags.map((tag, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Nutrition Info (if available) */}
            {recipe.nutrition && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Nutrition Information</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(recipe.nutrition).map(([key, value]) => (
                            <div key={key} className="text-center">
                                <div className="text-2xl font-bold text-gray-900">
                                    {typeof value === 'object' ? value.value : value}
                                </div>
                                <div className="text-sm text-gray-600 capitalize">
                                    {key.replace(/([A-Z])/g, ' $1')}
                                    {typeof value === 'object' && value.unit && ` (${value.unit})`}
                                </div>
                            </div>
                        ))}
                    </div>
                    {scaledData && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                                ℹ️ Nutrition values shown are for the original recipe serving size.
                                Scale factor: {scaledData.scalingFactor?.toFixed(2)}x
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Cooking Tips */}
            {recipe.tips && recipe.tips.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">💡 Cooking Tips</h2>
                    <div className="space-y-3">
                        {recipe.tips.map((tip, index) => (
                            <div key={index} className="flex items-start space-x-3">
                                <span className="text-yellow-500 text-lg">💡</span>
                                <p className="text-gray-700">{tip}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}