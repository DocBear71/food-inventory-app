'use client';

// file: /src/components/recipes/RecipeScaler.js

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';

export function RecipeScaler({ recipe, onScaleChange }) {
    const [targetServings, setTargetServings] = useState(recipe.servings || 4);
    const [scaledIngredients, setScaledIngredients] = useState(recipe.ingredients || []);
    const [scalingFactor, setScalingFactor] = useState(1);
    const [cookingTimeAdjustment, setCookingTimeAdjustment] = useState(1);

    useEffect(() => {
        const factor = targetServings / (recipe.servings || 4);
        setScalingFactor(factor);
        scaleIngredients(factor);
        calculateCookingTimeAdjustment(factor);
    }, [targetServings, recipe]);

    const scaleIngredients = (factor) => {
        const scaled = recipe.ingredients.map(ingredient => {
            const scaledIngredient = { ...ingredient };

            // Parse quantity and scale it
            const quantityInfo = parseQuantity(ingredient.quantity);
            if (quantityInfo) {
                scaledIngredient.quantity = formatScaledQuantity(quantityInfo.amount * factor, quantityInfo.unit);
                scaledIngredient.originalQuantity = ingredient.quantity;
                scaledIngredient.scalingFactor = factor;
            }

            return scaledIngredient;
        });

        setScaledIngredients(scaled);
        onScaleChange?.({
            scaledIngredients: scaled,
            scalingFactor: factor,
            targetServings,
            cookingTimeAdjustment
        });
    };

    const parseQuantity = (quantityStr) => {
        if (!quantityStr) return null;

        // Handle fractions like "1/2", "1 1/2", etc.
        const fractionRegex = /(\d+)?\s*(\d+)\/(\d+)/;
        const fractionMatch = quantityStr.match(fractionRegex);

        if (fractionMatch) {
            const whole = parseInt(fractionMatch[1]) || 0;
            const numerator = parseInt(fractionMatch[2]);
            const denominator = parseInt(fractionMatch[3]);
            const amount = whole + (numerator / denominator);
            const unit = quantityStr.replace(fractionRegex, '').trim();
            return { amount, unit };
        }

        // Handle decimal numbers
        const decimalRegex = /(\d+\.?\d*)\s*(.+)?/;
        const decimalMatch = quantityStr.match(decimalRegex);

        if (decimalMatch) {
            const amount = parseFloat(decimalMatch[1]);
            const unit = decimalMatch[2] ? decimalMatch[2].trim() : '';
            return { amount, unit };
        }

        return null;
    };

    const formatScaledQuantity = (amount, unit) => {
        // Round to reasonable precision
        const rounded = Math.round(amount * 100) / 100;

        // Convert to fractions if it makes sense
        const fraction = decimalToFraction(rounded);
        if (fraction && fraction.length < 8) { // Use fraction if it's concise
            return `${fraction} ${unit}`.trim();
        }

        // Otherwise use decimal
        return `${rounded} ${unit}`.trim();
    };

    const decimalToFraction = (decimal) => {
        if (decimal === Math.floor(decimal)) {
            return decimal.toString();
        }

        const tolerance = 1.0E-6;
        let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
        let b = decimal;

        do {
            const a = Math.floor(b);
            let aux = h1; h1 = a * h1 + h2; h2 = aux;
            aux = k1; k1 = a * k1 + k2; k2 = aux;
            b = 1 / (b - a);
        } while (Math.abs(decimal - h1 / k1) > decimal * tolerance);

        if (h1 > k1) {
            const whole = Math.floor(h1 / k1);
            const remainder = h1 % k1;
            if (remainder === 0) {
                return whole.toString();
            }
            return `${whole} ${remainder}/${k1}`;
        }

        return `${h1}/${k1}`;
    };

    const calculateCookingTimeAdjustment = (factor) => {
        // Cooking time doesn't scale linearly with servings
        // Use a logarithmic scale for more realistic adjustments
        let timeAdjustment = 1;

        if (factor > 1) {
            // Increasing servings: time increases but not proportionally
            timeAdjustment = 1 + (Math.log(factor) / Math.log(2)) * 0.3;
        } else if (factor < 1) {
            // Decreasing servings: time decreases but not proportionally
            timeAdjustment = 1 - (Math.log(1/factor) / Math.log(2)) * 0.2;
        }

        setCookingTimeAdjustment(timeAdjustment);
    };

    const getScaledTime = (originalTime) => {
        if (!originalTime) return originalTime;

        const timeMatch = originalTime.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
        if (!timeMatch) return originalTime;

        const amount = parseInt(timeMatch[1]);
        const unit = timeMatch[2];
        const scaledAmount = Math.round(amount * cookingTimeAdjustment);

        return `${scaledAmount} ${unit}`;
    };

    const quickScaleOptions = [
        { label: '1 serving', value: 1 },
        { label: '2 servings', value: 2 },
        { label: '4 servings', value: 4 },
        { label: '6 servings', value: 6 },
        { label: '8 servings', value: 8 },
        { label: '12 servings', value: 12 }
    ];

    const handleQuickScale = (servings) => {
        setTargetServings(servings);
        MobileHaptics?.light();
    };

    const generateShoppingList = () => {
        const shoppingList = scaledIngredients.map(ingredient => ({
            name: ingredient.name,
            quantity: ingredient.quantity,
            category: ingredient.category || 'Other',
            notes: `For ${recipe.title} (${targetServings} servings)`
        }));

        onScaleChange?.({
            action: 'generate_shopping_list',
            shoppingList,
            recipeName: recipe.title,
            servings: targetServings
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">⚖️ Recipe Scaler</h3>
                <div className="text-sm text-gray-600">
                    Original: {recipe.servings || 4} servings
                </div>
            </div>

            {/* Quick Scale Buttons */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Quick Scale Options</label>
                <div className="grid grid-cols-3 gap-2">
                    {quickScaleOptions.map((option) => (
                        <TouchEnhancedButton
                            key={option.value}
                            onClick={() => handleQuickScale(option.value)}
                            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                                targetServings === option.value
                                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {option.label}
                        </TouchEnhancedButton>
                    ))}
                </div>
            </div>

            {/* Custom Servings Input */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Custom Servings</label>
                <div className="flex items-center space-x-3">
                    <input
                        type="number"
                        value={targetServings}
                        onChange={(e) => setTargetServings(parseInt(e.target.value) || 1)}
                        min="1"
                        max="50"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-600">servings</span>
                    <div className="flex-1 text-right">
                        <span className="text-sm font-medium text-blue-600">
                            {scalingFactor.toFixed(2)}x scale
                        </span>
                    </div>
                </div>
            </div>

            {/* Scaled Ingredients */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">🧄 Scaled Ingredients</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                        {scaledIngredients.map((ingredient, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex-1">
                                    <span className="text-sm text-gray-900">{ingredient.name}</span>
                                    {ingredient.notes && (
                                        <span className="text-xs text-gray-500 ml-2">({ingredient.notes})</span>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    {scalingFactor !== 1 && (
                                        <span className="text-xs text-gray-400 line-through">
                                            {ingredient.originalQuantity}
                                        </span>
                                    )}
                                    <span className="text-sm font-medium text-gray-900">
                                        {ingredient.quantity}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cooking Time Adjustment */}
            {(recipe.prepTime || recipe.cookTime) && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">⏱️ Adjusted Cooking Times</h4>
                    <div className="bg-yellow-50 rounded-lg p-3 space-y-2">
                        {recipe.prepTime && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-700">Prep Time:</span>
                                <span className="text-sm font-medium">
                                    {getScaledTime(recipe.prepTime)}
                                </span>
                            </div>
                        )}
                        {recipe.cookTime && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-700">Cook Time:</span>
                                <span className="text-sm font-medium">
                                    {getScaledTime(recipe.cookTime)}
                                </span>
                            </div>
                        )}
                        {cookingTimeAdjustment !== 1 && (
                            <div className="text-xs text-gray-600 mt-2">
                                ℹ️ Times adjusted by {(cookingTimeAdjustment * 100).toFixed(0)}%
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
                <TouchEnhancedButton
                    onClick={generateShoppingList}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                >
                    <span>🛒</span>
                    <span>Add to Shopping List</span>
                </TouchEnhancedButton>

                <TouchEnhancedButton
                    onClick={() => setTargetServings(recipe.servings || 4)}
                    className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                    Reset
                </TouchEnhancedButton>
            </div>

            {/* Scaling Tips */}
            {scalingFactor > 2 && (
                <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                        <span className="text-blue-600">💡</span>
                        <div className="text-sm text-blue-800">
                            <strong>Scaling Tip:</strong> When scaling up significantly, consider:
                            <ul className="mt-1 ml-4 list-disc text-xs">
                                <li>Using larger cookware</li>
                                <li>Cooking in batches if needed</li>
                                <li>Adjusting seasonings gradually</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

