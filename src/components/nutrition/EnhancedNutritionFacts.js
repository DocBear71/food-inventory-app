// file: /src/components/nutrition/EnhancedNutritionFacts.js
// Comprehensive nutrition facts display matching your pizza screenshot

'use client';

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiGet } from '@/lib/api-config';
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';

export default function EnhancedNutritionFacts({
                                                   recipeId,
                                                   nutrition,
                                                   servings = 1,
                                                   showPerServing = true,
                                                   compact = false,
                                                   onNutritionLoad,
                                                   showTiered = true // New prop for tiered display
                                               }) {
    const [nutritionData, setNutritionData] = useState(nutrition);
    const [loading, setLoading] = useState(!nutrition && !!recipeId);
    const [error, setError] = useState(null);
    const [currentServings, setCurrentServings] = useState(servings);
    const [calculationInfo, setCalculationInfo] = useState(null);
    const [displayLevel, setDisplayLevel] = useState('basic'); // 'basic', 'detailed', 'comprehensive'

    // Subscription hooks
    const subscription = useSubscription();
    const nutritionGate = useFeatureGate(FEATURE_GATES.NUTRITION_ACCESS);

    useEffect(() => {
        if (recipeId && !nutrition && nutritionGate.hasAccess) {
            fetchNutrition();
        }
    }, [recipeId, nutrition, nutritionGate.hasAccess]);

    const fetchNutrition = async () => {
        if (!recipeId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await apiGet(`/api/recipes/nutrition?recipeId=${recipeId}`);
            const data = await response.json();

            if (data.success) {
                setNutritionData(data.nutrition);
                setCalculationInfo({
                    coverage: data.coverage,
                    foundIngredients: data.foundIngredients,
                    totalIngredients: data.totalIngredients,
                    cached: data.cached,
                    calculatedAt: data.calculatedAt,
                    method: data.method || 'unknown'
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

    // Gate the entire component
    return (
        <FeatureGate
            feature={FEATURE_GATES.NUTRITION_ACCESS}
            fallback={
                <div className={`bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-6 text-center ${compact ? 'max-w-sm' : 'max-w-md'}`}>
                    <div className="text-4xl mb-3">🔒</div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                        Comprehensive Nutrition Facts - Gold Feature
                    </h3>
                    <p className="text-yellow-700 text-sm mb-4">
                        Get detailed nutrition information including micronutrients, vitamins, and minerals.
                    </p>

                    <div className="bg-yellow-200 border border-yellow-400 rounded-lg p-3 mb-4">
                        <div className="text-yellow-800 text-xs">
                            <div className="font-medium mb-1">✨ Enhanced Nutrition Analysis:</div>
                            <ul className="text-left space-y-1">
                                <li>• Complete nutrition facts panel</li>
                                <li>• All vitamins & minerals</li>
                                <li>• Fat breakdown (saturated, trans, etc.)</li>
                                <li>• Daily value percentages</li>
                                <li>• AI-powered accuracy</li>
                                <li>• Tiered detail levels</li>
                            </ul>
                        </div>
                    </div>

                    <TouchEnhancedButton
                        onClick={() => window.location.href = '/pricing?source=enhanced-nutrition'}
                        className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-700 text-sm"
                    >
                        Upgrade to Gold - $4.99/month
                    </TouchEnhancedButton>
                </div>
            }
        >
            <EnhancedNutritionFactsContent
                nutritionData={nutritionData}
                loading={loading}
                error={error}
                currentServings={currentServings}
                setCurrentServings={setCurrentServings}
                calculationInfo={calculationInfo}
                fetchNutrition={fetchNutrition}
                servings={servings}
                showPerServing={showPerServing}
                compact={compact}
                showTiered={showTiered}
                displayLevel={displayLevel}
                setDisplayLevel={setDisplayLevel}
            />
        </FeatureGate>
    );
}

function EnhancedNutritionFactsContent({
                                           nutritionData,
                                           loading,
                                           error,
                                           currentServings,
                                           setCurrentServings,
                                           calculationInfo,
                                           fetchNutrition,
                                           servings,
                                           showPerServing,
                                           compact,
                                           showTiered,
                                           displayLevel,
                                           setDisplayLevel
                                       }) {
    const getScaledValue = (nutrient) => {
        if (!nutrient || !nutrient.value) return 0;
        const baseValue = nutrient.value;
        const totalServings = servings || 1;
        const perServingValue = baseValue / totalServings;
        return showPerServing ? perServingValue * currentServings : baseValue;
    };

    const formatValue = (value, unit) => {
        if (value === 0) return '0';
        if (value < 1 && unit !== 'mg' && unit !== 'µg') return value.toFixed(1);
        if (value < 10 && (unit === 'mg' || unit === 'µg')) return value.toFixed(1);
        return Math.round(value).toString();
    };

    const getDailyValue = (nutrient, value) => {
        const dailyValues = {
            // Macronutrients
            calories: 2000,
            fat: 65,
            saturatedFat: 20,
            transFat: 0, // No established DV
            cholesterol: 300,
            sodium: 2300,
            carbs: 300,
            fiber: 25,
            sugars: 50, // Added sugars
            protein: 50,

            // Vitamins
            vitaminA: 900, // µg RAE
            vitaminC: 90, // mg
            vitaminD: 20, // µg
            vitaminE: 15, // mg
            vitaminK: 120, // µg
            thiamin: 1.2, // mg
            riboflavin: 1.3, // mg
            niacin: 16, // mg
            vitaminB6: 1.7, // mg
            folate: 400, // µg
            vitaminB12: 2.4, // µg
            biotin: 30, // µg
            pantothenicAcid: 5, // mg

            // Minerals
            calcium: 1000, // mg
            iron: 18, // mg
            magnesium: 400, // mg
            phosphorus: 1000, // mg
            potassium: 4700, // mg
            zinc: 11, // mg
            choline: 550 // mg
        };

        const dv = dailyValues[nutrient];
        if (!dv) return null;

        const percentage = (value / dv) * 100;
        return percentage > 0 ? Math.round(percentage) : 0;
    };

    // Nutrition Grade (A-E like in your pizza screenshot)
    const getNutritionGrade = () => {
        if (!nutritionData) return { grade: 'C', color: '#F59E0B', label: 'Moderate' };

        const calories = getScaledValue(nutritionData.calories);
        const fiber = getScaledValue(nutritionData.fiber);
        const protein = getScaledValue(nutritionData.protein);
        const sodium = getScaledValue(nutritionData.sodium);
        const saturatedFat = getScaledValue(nutritionData.saturatedFat);

        let score = 50; // Start at C

        // Positive factors
        if (fiber >= 5) score += 15;
        if (protein >= 10) score += 10;
        if (getScaledValue(nutritionData.vitaminA) > 0) score += 5;
        if (getScaledValue(nutritionData.vitaminC) > 0) score += 5;
        if (getScaledValue(nutritionData.calcium) > 0) score += 5;
        if (getScaledValue(nutritionData.iron) > 0) score += 5;

        // Negative factors
        if (sodium > 600) score -= 10;
        if (sodium > 1000) score -= 10;
        if (saturatedFat > 5) score -= 10;
        if (saturatedFat > 10) score -= 15;
        if (getScaledValue(nutritionData.transFat) > 0) score -= 20;
        if (calories > 400) score -= 5;

        // Convert score to grade
        if (score >= 85) return { grade: 'A', color: '#10B981', label: 'Excellent' };
        if (score >= 70) return { grade: 'B', color: '#84CC16', label: 'Good' };
        if (score >= 50) return { grade: 'C', color: '#F59E0B', label: 'Moderate' };
        if (score >= 30) return { grade: 'D', color: '#F97316', label: 'Poor' };
        return { grade: 'E', color: '#EF4444', label: 'Very Poor' };
    };

    const nutritionGrade = getNutritionGrade();

    // Organize nutrients by category for tiered display
    const nutrientCategories = {
        basic: {
            title: 'Basic Nutrition',
            nutrients: ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sodium']
        },
        detailed: {
            title: 'Detailed Breakdown',
            nutrients: ['saturatedFat', 'transFat', 'cholesterol', 'sugars', 'addedSugars', 'potassium']
        },
        comprehensive: {
            title: 'Vitamins & Minerals',
            nutrients: [
                'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK',
                'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'folate', 'vitaminB12',
                'calcium', 'iron', 'magnesium', 'phosphorus', 'zinc', 'choline'
            ]
        }
    };

    const getDisplayedNutrients = () => {
        switch (displayLevel) {
            case 'basic':
                return nutrientCategories.basic.nutrients;
            case 'detailed':
                return [...nutrientCategories.basic.nutrients, ...nutrientCategories.detailed.nutrients];
            case 'comprehensive':
                return [
                    ...nutrientCategories.basic.nutrients,
                    ...nutrientCategories.detailed.nutrients,
                    ...nutrientCategories.comprehensive.nutrients
                ];
            default:
                return nutrientCategories.basic.nutrients;
        }
    };

    if (loading) {
        return (
            <div className={`bg-white border rounded-lg p-4 ${compact ? 'max-w-sm' : 'max-w-md'}`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(8)].map((_, i) => (
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
                    <TouchEnhancedButton
                        onClick={fetchNutrition}
                        className="text-red-600 hover:text-red-800 underline mt-2"
                    >
                        Try again
                    </TouchEnhancedButton>
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

    if (compact) {
        return (
            <div className="bg-white border rounded-lg p-3 max-w-sm">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-900">Nutrition Facts</div>
                    <div
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
                        style={{ backgroundColor: nutritionGrade.color }}
                        title={`Nutrition Grade: ${nutritionGrade.label}`}
                    >
                        {nutritionGrade.grade}
                    </div>
                </div>
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

                {showTiered && (
                    <TouchEnhancedButton
                        onClick={() => setDisplayLevel('comprehensive')}
                        className="w-full mt-3 text-xs text-indigo-600 hover:text-indigo-700 underline"
                    >
                        View complete nutrition facts →
                    </TouchEnhancedButton>
                )}

                {calculationInfo && calculationInfo.coverage < 0.8 && (
                    <div className="text-xs text-orange-600 mt-2">
                        ⚠️ Limited data ({Math.round(calculationInfo.coverage * 100)}% coverage)
                    </div>
                )}
            </div>
        );
    }

    const displayedNutrients = getDisplayedNutrients();

    return (
        <div className="bg-white border-2 border-black rounded-lg max-w-md font-mono">
            {/* Header with Nutrition Grade */}
            <div className="border-b-4 border-black p-3">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold">Nutrition Facts</h3>
                    <div className="flex items-center gap-2">
                        {/* Nutrition Grade Indicator */}
                        <div className="text-center">
                            <div
                                className="inline-flex items-center justify-center w-12 h-12 rounded-full text-white font-bold text-lg mb-1"
                                style={{ backgroundColor: nutritionGrade.color }}
                                title={`Nutrition Grade: ${nutritionGrade.label}`}
                            >
                                {nutritionGrade.grade}
                            </div>
                            <div className="text-xs text-gray-600">Grade</div>
                        </div>
                    </div>
                </div>

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

                {/* Tiered Display Controls */}
                {showTiered && (
                    <div className="mt-3 flex gap-1">
                        {[
                            { level: 'basic', label: 'Basic', color: 'bg-blue-100 text-blue-700' },
                            { level: 'detailed', label: 'Detailed', color: 'bg-green-100 text-green-700' },
                            { level: 'comprehensive', label: 'Complete', color: 'bg-purple-100 text-purple-700' }
                        ].map(({ level, label, color }) => (
                            <TouchEnhancedButton
                                key={level}
                                onClick={() => setDisplayLevel(level)}
                                className={`px-2 py-1 text-xs rounded ${
                                    displayLevel === level
                                        ? color
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {label}
                            </TouchEnhancedButton>
                        ))}
                    </div>
                )}
            </div>

            {/* Calories - Always prominent */}
            <div className="border-b border-black p-3">
                <div className="flex justify-between items-baseline">
                    <span className="text-lg font-bold">Calories</span>
                    <span className="text-2xl font-bold">
                        {formatValue(getScaledValue(nutritionData.calories))}
                    </span>
                </div>
            </div>

            <div className="p-3 text-xs">
                <div className="text-right text-gray-600 mb-2">% Daily Value*</div>

                {/* Dynamic Nutrient Display */}
                {displayedNutrients.map(nutrientKey => {
                    const nutrient = nutritionData[nutrientKey];
                    if (!nutrient || nutrient.value === 0) return null;

                    const value = getScaledValue(nutrient);
                    const dailyValue = getDailyValue(nutrientKey, value);
                    const isIndented = ['saturatedFat', 'transFat', 'monounsaturatedFat', 'polyunsaturatedFat', 'fiber', 'sugars', 'addedSugars'].includes(nutrientKey);

                    return (
                        <div key={nutrientKey} className={`flex justify-between border-b border-gray-200 py-1 ${isIndented ? 'ml-4' : ''}`}>
                            <span className={isIndented ? 'text-gray-600' : 'font-medium'}>
                                {nutrient.name} {formatValue(value)}{nutrient.unit}
                            </span>
                            {dailyValue !== null && (
                                <span className="font-bold">{dailyValue}%</span>
                            )}
                        </div>
                    );
                })}

                {/* AI Analysis Info */}
                {calculationInfo?.method === 'ai_calculated' && (
                    <div className="border-t border-gray-300 mt-3 pt-2">
                        <div className="flex items-center gap-1 text-xs text-purple-600">
                            <span>🤖</span>
                            <span>AI-Enhanced Analysis</span>
                            {calculationInfo.confidence && (
                                <span className="ml-2 text-gray-500">
                                    {Math.round(calculationInfo.confidence * 100)}% confidence
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Calculation Info */}
                {calculationInfo && (
                    <div className="border-t border-gray-300 mt-3 pt-2 text-xs text-gray-500">
                        <div className="flex justify-between items-center">
                            <span>
                                Data coverage: {Math.round(calculationInfo.coverage * 100)}%
                                {calculationInfo.foundIngredients && calculationInfo.totalIngredients && (
                                    <span> ({calculationInfo.foundIngredients}/{calculationInfo.totalIngredients} ingredients)</span>
                                )}
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

                {/* Footer */}
                <div className="border-t border-gray-300 mt-3 pt-2 text-xs text-gray-600">
                    <div>* The % Daily Value tells you how much a nutrient in a serving contributes to a daily diet.</div>
                    <div className="mt-1">2,000 calories a day is used for general nutrition advice.</div>
                </div>
            </div>
        </div>
    );
}