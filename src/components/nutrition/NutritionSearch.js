'use client';
// file: /src/components/nutrition/NutritionSearch.js v2 - Added subscription gate for Gold+ users

import { useState, useEffect } from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { getApiUrl} from "@/lib/api-config";
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';

export default function NutritionSearch({
                                            onFoodSelected,
                                            initialQuery = '',
                                            placeholder = 'Search for foods...',
                                            compact = false
                                        }) {
    const [query, setQuery] = useState(initialQuery);
    const [foods, setFoods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [selectedFood, setSelectedFood] = useState(null);

    // Subscription hooks
    const subscription = useSubscription();
    const nutritionGate = useFeatureGate(FEATURE_GATES.NUTRITION_ACCESS);

    useEffect(() => {
        if (query.length >= 3 && nutritionGate.hasAccess) {
            const timeoutId = setTimeout(() => {
                searchFoods();
            }, 300); // Debounce search

            return () => clearTimeout(timeoutId);
        } else {
            setFoods([]);
            setShowResults(false);
        }
    }, [query, nutritionGate.hasAccess]);

    const searchFoods = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(getApiUrl(`/api/nutrition?query=${encodeURIComponent(query)}&limit=8`));
            const data = await response.json();

            if (data.success) {
                setFoods(data.foods || []);
                setShowResults(true);
            } else {
                setError(data.error || 'Failed to search foods');
                setFoods([]);
            }
        } catch (err) {
            setError('Error searching for foods');
            setFoods([]);
            console.error('Nutrition search error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFoodSelect = async (food) => {
        setSelectedFood(food);
        setShowResults(false);

        // Get detailed nutrition information
        try {
            const response = await fetch(getApiUrl(`/api/nutrition?fdcId=${food.fdcId}`));
            const data = await response.json();

            if (data.success && data.food) {
                if (onFoodSelected) {
                    onFoodSelected({
                        ...data.food,
                        searchQuery: query
                    });
                }
            } else {
                // Fallback to basic nutrition from search results
                if (onFoodSelected) {
                    onFoodSelected(food);
                }
            }
        } catch (err) {
            console.error('Error getting food details:', err);
            // Fallback to basic nutrition from search results
            if (onFoodSelected) {
                onFoodSelected(food);
            }
        }
    };

    const formatNutrientValue = (nutrient) => {
        if (!nutrient || !nutrient.value) return '';
        return `${Math.round(nutrient.value)}${nutrient.unit}`;
    };

    const getDataTypeColor = (dataType) => {
        switch (dataType) {
            case 'Foundation': return 'bg-green-100 text-green-800';
            case 'SR Legacy': return 'bg-blue-100 text-blue-800';
            case 'Survey': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <FeatureGate
            feature={FEATURE_GATES.NUTRITION_ACCESS}
            fallback={
                <div className={`relative ${compact ? 'max-w-sm' : 'max-w-md'}`}>
                    {/* Disabled search input */}
                    <div className="relative">
                        <input
                            type="text"
                            value=""
                            disabled
                            placeholder="🔒 Gold feature - Search nutrition database"
                            className={`w-full border-2 border-yellow-300 bg-yellow-50 text-yellow-700 rounded-md shadow-sm cursor-not-allowed ${
                                compact ? 'px-3 py-2 text-sm' : 'px-4 py-3'
                            }`}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="text-yellow-600">🔒</div>
                        </div>
                    </div>

                    {/* Upgrade prompt */}
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="text-center">
                            <div className="text-2xl mb-2">🥗</div>
                            <h3 className="font-semibold text-yellow-800 mb-2">
                                Nutrition Database Access
                            </h3>
                            <p className="text-yellow-700 text-sm mb-3">
                                Search thousands of foods and get detailed nutrition information with a Gold subscription.
                            </p>

                            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-3">
                                <div className="text-yellow-800 text-xs">
                                    <div className="font-medium mb-1">✨ What you get:</div>
                                    <ul className="text-left space-y-1">
                                        <li>• Search 350,000+ foods</li>
                                        <li>• USDA nutrition database</li>
                                        <li>• Detailed nutrient breakdowns</li>
                                        <li>• Recipe nutrition calculation</li>
                                        <li>• Meal plan nutrition analysis</li>
                                    </ul>
                                </div>
                            </div>

                            <TouchEnhancedButton
                                onClick={() => window.location.href = '/pricing?source=nutrition-search'}
                                className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-700 text-sm"
                            >
                                Upgrade to Gold - $4.99/month
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            }
        >
            <NutritionSearchContent
                query={query}
                setQuery={setQuery}
                foods={foods}
                loading={loading}
                error={error}
                showResults={showResults}
                selectedFood={selectedFood}
                setSelectedFood={setSelectedFood}
                handleFoodSelect={handleFoodSelect}
                formatNutrientValue={formatNutrientValue}
                getDataTypeColor={getDataTypeColor}
                placeholder={placeholder}
                compact={compact}
                onFoodSelected={onFoodSelected}
            />
        </FeatureGate>
    );
}

// Extracted component content for cleaner code
function NutritionSearchContent({
                                    query,
                                    setQuery,
                                    foods,
                                    loading,
                                    error,
                                    showResults,
                                    selectedFood,
                                    setSelectedFood,
                                    handleFoodSelect,
                                    formatNutrientValue,
                                    getDataTypeColor,
                                    placeholder,
                                    compact,
                                    onFoodSelected
                                }) {
    return (
        <div className={`relative ${compact ? 'max-w-sm' : 'max-w-md'}`}>
            {/* Search Input */}
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                        compact ? 'px-3 py-2 text-sm' : 'px-4 py-3'
                    }`}
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    </div>
                )}
            </div>

            {/* Selected Food Display */}
            {selectedFood && !showResults && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-green-900">{selectedFood.description}</div>
                            {selectedFood.brandOwner && (
                                <div className="text-sm text-green-700">{selectedFood.brandOwner}</div>
                            )}
                        </div>
                        <TouchEnhancedButton
                            onClick={() => {
                                setSelectedFood(null);
                                setQuery('');
                            }}
                            className="text-green-600 hover:text-green-800"
                        >
                            ✕
                        </TouchEnhancedButton>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                    {error}
                </div>
            )}

            {/* Search Results */}
            {showResults && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
                    {foods.length === 0 && !loading ? (
                        <div className="p-4 text-gray-500 text-center">
                            No foods found for "{query}"
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {foods.map((food) => (
                                <TouchEnhancedButton
                                    key={food.fdcId}
                                    onClick={() => handleFoodSelect(food)}
                                    className="w-full text-left p-4 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 truncate">
                                                {food.description}
                                            </div>
                                            {food.brandOwner && (
                                                <div className="text-sm text-gray-500 truncate">
                                                    {food.brandOwner}
                                                </div>
                                            )}

                                            {/* Basic Nutrition Preview */}
                                            <div className="flex space-x-4 mt-1 text-xs text-gray-600">
                                                {food.nutrients?.calories?.value > 0 && (
                                                    <span>{formatNutrientValue(food.nutrients.calories)} cal</span>
                                                )}
                                                {food.nutrients?.protein?.value > 0 && (
                                                    <span>{formatNutrientValue(food.nutrients.protein)} protein</span>
                                                )}
                                                {food.nutrients?.carbs?.value > 0 && (
                                                    <span>{formatNutrientValue(food.nutrients.carbs)} carbs</span>
                                                )}
                                                {food.nutrients?.fat?.value > 0 && (
                                                    <span>{formatNutrientValue(food.nutrients.fat)} fat</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="ml-2 flex-shrink-0">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDataTypeColor(food.dataType)}`}>
                                                {food.dataType === 'Foundation' ? '🥇' : food.dataType === 'SR Legacy' ? '📚' : '📊'}
                                                {food.dataType}
                                            </span>
                                        </div>
                                    </div>
                                </TouchEnhancedButton>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Instructions */}
            {!selectedFood && query.length < 3 && query.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                    Type at least 3 characters to search
                </div>
            )}
        </div>
    );
}