'use client';

// file: /src/components/recipes/BulkRecipeScaler.js

import React, { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';

export function BulkRecipeScaler({ recipes, onBulkScale }) {
    const [targetServings, setTargetServings] = useState(4);
    const [selectedRecipes, setSelectedRecipes] = useState(new Set());
    const [scaling, setScaling] = useState(false);

    const handleRecipeSelect = (recipeId) => {
        const newSelected = new Set(selectedRecipes);
        if (newSelected.has(recipeId)) {
            newSelected.delete(recipeId);
        } else {
            newSelected.add(recipeId);
        }
        setSelectedRecipes(newSelected);
        MobileHaptics?.light();
    };

    const handleBulkScale = async () => {
        if (selectedRecipes.size === 0) return;

        setScaling(true);
        MobileHaptics?.medium();

        try {
            const response = await fetch('/api/recipes/bulk-scale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipeIds: Array.from(selectedRecipes),
                    targetServings
                })
            });

            if (response.ok) {
                const data = await response.json();
                onBulkScale?.(data.scaledRecipes);
                MobileHaptics?.success();
            }
        } catch (error) {
            console.error('Error bulk scaling recipes:', error);
            MobileHaptics?.error();
        } finally {
            setScaling(false);
        }
    };

    const generateCombinedShoppingList = async () => {
        if (selectedRecipes.size === 0) return;

        try {
            const response = await fetch('/api/recipes/combined-shopping-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipeIds: Array.from(selectedRecipes),
                    targetServings
                })
            });

            if (response.ok) {
                const data = await response.json();
                onBulkScale?.({ action: 'shopping_list', items: data.combinedList });
                MobileHaptics?.success();
            }
        } catch (error) {
            console.error('Error generating combined shopping list:', error);
            MobileHaptics?.error();
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">⚖️ Bulk Recipe Scaler</h3>
                <span className="text-sm text-gray-600">
                    {selectedRecipes.size} selected
                </span>
            </div>

            {/* Target Servings */}
            <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Scale to:</label>
                <input
                    type="number"
                    value={targetServings}
                    onChange={(e) => setTargetServings(parseInt(e.target.value) || 1)}
                    min="1"
                    max="50"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">servings each</span>
            </div>

            {/* Recipe Selection */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {recipes.map((recipe) => (
                    <div
                        key={recipe.id}
                        onClick={() => handleRecipeSelect(recipe.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedRecipes.has(recipe.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-gray-900">{recipe.title}</h4>
                                <p className="text-sm text-gray-600">
                                    Original: {recipe.servings || 4} servings
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                {selectedRecipes.has(recipe.id) && (
                                    <span className="text-blue-600">✓</span>
                                )}
                                <span className="text-sm text-gray-500">
                                    {recipe.ingredients?.length || 0} ingredients
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
                <TouchEnhancedButton
                    onClick={handleBulkScale}
                    disabled={selectedRecipes.size === 0 || scaling}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                    <span>⚖️</span>
                    <span>{scaling ? 'Scaling...' : 'Scale Recipes'}</span>
                </TouchEnhancedButton>

                <TouchEnhancedButton
                    onClick={generateCombinedShoppingList}
                    disabled={selectedRecipes.size === 0}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                    <span>🛒</span>
                    <span>Combined List</span>
                </TouchEnhancedButton>
            </div>

            {/* Scaling Summary */}
            {selectedRecipes.size > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">📊 Scaling Summary</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                        <div>Selected recipes: {selectedRecipes.size}</div>
                        <div>Target servings: {targetServings} each</div>
                        <div>Total servings: {selectedRecipes.size * targetServings}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

