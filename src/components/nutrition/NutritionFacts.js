// file: /src/components/nutrition/NutritionFacts.js v1

'use client';

import { useState, useEffect } from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function NutritionFacts({
                                           recipeId,
                                           nutrition,
                                           servings = 1,
                                           showPerServing = true,
                                           compact = false,
                                           onNutritionLoad
                                       }) {
    const [nutritionData, setNutritionData] = useState(nutrition);
    const [loading, setLoading] = useState(!nutrition && !!recipeId);
    const [error, setError] = useState(null);
    const [currentServings, setCurrentServings] = useState(servings);
    const [calculationInfo, setCalculationInfo] = useState(null);

    useEffect(() => {
        if (recipeId && !nutrition) {
            fetchNutrition();
        }
    }, [recipeId, nutrition]);

    const fetchNutrition = async () => {
        if (!recipeId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/recipes/nutrition?recipeId=${recipeId}`);
            const data = await response.json();

            if (data.success) {
                setNutritionData(data.nutrition);
                setCalculationInfo({
                    coverage: data.coverage,
                    foundIngredients: data.foundIngredients,
                    totalIngredients: data.totalIngredients,
                    cached: data.cached,
                    calculatedAt: data.calculatedAt
                });
                if (onNutritionLoad) {
                    onNutritionLoad(data.nutrition);
                }
            } else {
                setError(data.error || 'Failed to load nutrition data');
            }
        } catch (err) {
            setError('Error loading nutrition data');
            console.error('Nutrition fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getScaledValue = (nutrient) => {
        if (!nutrient || !nutrient.value) return 0;
        const baseValue = nutrient.value;
        const totalServings = servings || 1;
        const perServingValue = baseValue / totalServings;
        return showPerServing ? perServingValue : baseValue;
    };

    const formatValue = (value, unit) => {
        if (value === 0) return '0';
        if (value < 1) return value.toFixed(1);
        return Math.round(value).toString();
    };

    const getDailyValue = (nutrient, value) => {
        const dailyValues = {
            calories: 2000,
            fat: 65,
            sodium: 2300,
            carbs: 300,
            fiber: 25,
            protein: 50,
            vitaminC: 90,
            vitaminA: 900,
            calcium: 1000,
            iron: 18
        };

        const dv = dailyValues[nutrient];
        if (!dv) return null;

        const percentage = (value / dv) * 100;
        return percentage > 0 ? Math.round(percentage) : 0;
    };

    const getCalorieBreakdown = () => {
        const protein = getScaledValue(nutritionData?.protein) * 4; // 4 cal/g
        const fat = getScaledValue(nutritionData?.fat) * 9; // 9 cal/g
        const carbs = getScaledValue(nutritionData?.carbs) * 4; // 4 cal/g
        const total = protein + fat + carbs;

        if (total === 0) return { protein: 0, fat: 0, carbs: 0 };

        return {
            protein: Math.round((protein / total) * 100),
            fat: Math.round((fat / total) * 100),
            carbs: Math.round((carbs / total) * 100)
        };
    };

    if (loading) {
        return (
            <div className={`bg-white border rounded-lg p-4 ${compact ? 'max-w-sm' : 'max-w-md'}`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex justify-between">
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${compact ? 'max-w-sm' : 'max-w-md'}`}>
                <div className="text-red-800 text-sm">
                    <div className="font-medium mb-1">Nutrition data unavailable</div>
                    <div>{error}</div>
                    {recipeId && (
                        <TouchEnhancedButton
                            onClick={fetchNutrition}
                            className="text-red-600 hover:text-red-800 underline mt-2"
                        >
                            Try again
                        </TouchEnhancedButton>
                    )}
                </div>
            </div>
        );
    }

    if (!nutritionData) {
        return (
            <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${compact ? 'max-w-sm' : 'max-w-md'}`}>
                <div className="text-gray-600 text-sm text-center">
                    No nutrition data available
                </div>
            </div>
        );
    }

    const calorieBreakdown = getCalorieBreakdown();

    if (compact) {
        return (
            <div className="bg-white border rounded-lg p-3 max-w-sm">
                <div className="text-sm font-medium text-gray-900 mb-2">Nutrition Facts</div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Calories</span>
                        <span className="font-medium">{formatValue(getScaledValue(nutritionData.calories))}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Protein</span>
                        <span>{formatValue(getScaledValue(nutritionData.protein))}g</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Carbs</span>
                        <span>{formatValue(getScaledValue(nutritionData.carbs))}g</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Fat</span>
                        <span>{formatValue(getScaledValue(nutritionData.fat))}g</span>
                    </div>
                </div>
                {calculationInfo && calculationInfo.coverage < 0.8 && (
                    <div className="text-xs text-orange-600 mt-2">
                        ⚠️ Limited data ({Math.round(calculationInfo.coverage * 100)}% coverage)
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white border-2 border-black rounded-lg max-w-md font-mono">
            {/* Header */}
            <div className="border-b-4 border-black p-3">
                <h3 className="text-xl font-bold">Nutrition Facts</h3>
                <div className="text-sm text-gray-600">
                    {showPerServing ? `Per serving (${currentServings} of ${servings})` : 'Total recipe'}
                </div>
                {showPerServing && servings > 1 && (
                    <div className="mt-2">
                        <label className="text-xs text-gray-600">Servings:</label>
                        <input
                            type="number"
                            min="0.5"
                            max="10"
                            step="0.5"
                            value={currentServings}
                            onChange={(e) => setCurrentServings(parseFloat(e.target.value) || 1)}
                            className="ml-2 w-16 text-xs border border-gray-300 rounded px-1 py-0.5"
                        />
                    </div>
                )}
            </div>

            {/* Calories */}
            <div className="border-b border-black p-3">
                <div className="flex justify-between items-baseline">
                    <span className="text-lg font-bold">Calories</span>
                    <span className="text-2xl font-bold">
                        {formatValue(getScaledValue(nutritionData.calories) * (currentServings / (showPerServing ? 1 : servings)))}
                    </span>
                </div>
            </div>

            {/* Calorie Breakdown */}
            {(calorieBreakdown.protein + calorieBreakdown.fat + calorieBreakdown.carbs) > 0 && (
                <div className="border-b border-gray-300 p-3">
                    <div className="text-xs text-gray-600 mb-2">Calories from:</div>
                    <div className="flex space-x-4 text-xs">
                        <div>Protein: {calorieBreakdown.protein}%</div>
                        <div>Fat: {calorieBreakdown.fat}%</div>
                        <div>Carbs: {calorieBreakdown.carbs}%</div>
                    </div>
                </div>
            )}

            <div className="p-3 text-xs">
                <div className="text-right text-gray-600 mb-2">% Daily Value*</div>

                {/* Macronutrients */}
                {[
                    { key: 'fat', label: 'Total Fat', unit: 'g' },
                    { key: 'sodium', label: 'Sodium', unit: 'mg' },
                    { key: 'carbs', label: 'Total Carbohydrate', unit: 'g' },
                    { key: 'fiber', label: 'Dietary Fiber', unit: 'g', indent: true },
                    { key: 'sugars', label: 'Total Sugars', unit: 'g', indent: true },
                    { key: 'protein', label: 'Protein', unit: 'g' }
                ].map(({ key, label, unit, indent }) => {
                    const value = getScaledValue(nutritionData[key]) * (currentServings / (showPerServing ? 1 : servings));
                    const dailyValue = getDailyValue(key, value);

                    if (value === 0) return null;

                    return (
                        <div key={key} className={`flex justify-between border-b border-gray-200 py-1 ${indent ? 'ml-4' : ''}`}>
                            <span className={indent ? 'text-gray-600' : 'font-medium'}>
                                {label} {formatValue(value)}{unit}
                            </span>
                            {dailyValue !== null && (
                                <span className="font-bold">{dailyValue}%</span>
                            )}
                        </div>
                    );
                })}

                {/* Vitamins and Minerals */}
                <div className="border-t-2 border-black mt-3 pt-2">
                    {[
                        { key: 'vitaminA', label: 'Vitamin A', unit: 'IU' },
                        { key: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
                        { key: 'calcium', label: 'Calcium', unit: 'mg' },
                        { key: 'iron', label: 'Iron', unit: 'mg' }
                    ].map(({ key, label, unit }) => {
                        const value = getScaledValue(nutritionData[key]) * (currentServings / (showPerServing ? 1 : servings));
                        const dailyValue = getDailyValue(key, value);

                        if (value === 0) return null;

                        return (
                            <div key={key} className="flex justify-between py-1">
                                <span>{label}</span>
                                <span>{dailyValue !== null ? `${dailyValue}%` : `${formatValue(value)}${unit}`}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-300 mt-3 pt-2 text-xs text-gray-600">
                    <div>* The % Daily Value tells you how much a nutrient in a serving contributes to a daily diet.</div>
                    <div className="mt-1">2,000 calories a day is used for general nutrition advice.</div>
                </div>

                {/* Calculation Info */}
                {calculationInfo && (
                    <div className="border-t border-gray-300 mt-3 pt-2 text-xs text-gray-500">
                        <div className="flex justify-between items-center">
                            <span>
                                Data coverage: {Math.round(calculationInfo.coverage * 100)}%
                                ({calculationInfo.foundIngredients}/{calculationInfo.totalIngredients} ingredients)
                            </span>
                            {calculationInfo.cached && (
                                <span className="text-blue-600">📋 Cached</span>
                            )}
                        </div>
                        {calculationInfo.coverage < 0.8 && (
                            <div className="text-orange-600 mt-1">
                                ⚠️ Some ingredients lack nutrition data. Values may be incomplete.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}