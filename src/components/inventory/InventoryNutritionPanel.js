'use client';

// file: /src/components/inventory/InventoryNutritionPanel.js v1 - Display nutrition info for inventory items

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { NutritionAnalyzer } from '@/lib/nutritionAnalysis';

export default function InventoryNutritionPanel({
                                                    item,
                                                    onNutritionUpdate = null,
                                                    compact = false,
                                                    showAnalyzeButton = true
                                                }) {
    const [nutrition, setNutrition] = useState(item?.nutrition || null);
    const [loading, setLoading] = useState(false);
    const [analyzer] = useState(() => new NutritionAnalyzer());
    const [showDetails, setShowDetails] = useState(!compact);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (item?.nutrition) {
            setNutrition(item.nutrition);
        }
    }, [item?.nutrition]);

    const handleAnalyzeNutrition = async () => {
        if (!item) return;

        setLoading(true);
        setError(null);

        try {
            console.log('🔍 Starting nutrition analysis for:', item.name);

            const result = await analyzer.analyzeItem({
                name: item.name,
                brand: item.brand,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                upc: item.upc
            });

            if (result.success) {
                setNutrition(result.nutrition);

                // Save to backend if callback provided
                if (onNutritionUpdate) {
                    await onNutritionUpdate(item._id, result.nutrition);
                }

                console.log('✅ Nutrition analysis completed');
            } else {
                setError('Failed to analyze nutrition');
                console.error('❌ Nutrition analysis failed');
            }
        } catch (error) {
            console.error('❌ Nutrition analysis error:', error);
            setError('Error analyzing nutrition');
        } finally {
            setLoading(false);
        }
    };

    const getNutritionQuality = () => {
        if (!nutrition) return 'unknown';
        return analyzer.getNutritionQuality(nutrition);
    };

    const getQualityColor = (quality) => {
        const colors = {
            high: 'text-green-600 bg-green-100',
            medium: 'text-yellow-600 bg-yellow-100',
            low: 'text-orange-600 bg-orange-100',
            unknown: 'text-gray-600 bg-gray-100'
        };
        return colors[quality] || colors.unknown;
    };

    const getQualityLabel = (quality) => {
        const labels = {
            high: 'Verified Data',
            medium: 'AI Estimated',
            low: 'Basic Estimate',
            unknown: 'No Data'
        };
        return labels[quality] || 'Unknown';
    };

    const formatNutrientValue = (nutrient) => {
        if (!nutrient || typeof nutrient !== 'object') return null;
        return `${nutrient.value?.toFixed(1) || 0}${nutrient.unit || ''}`;
    };

    const getMainNutrients = () => {
        if (!nutrition) return [];

        return [
            { label: 'Calories', value: formatNutrientValue(nutrition.calories), key: 'calories' },
            { label: 'Protein', value: formatNutrientValue(nutrition.protein), key: 'protein' },
            { label: 'Carbs', value: formatNutrientValue(nutrition.carbs), key: 'carbs' },
            { label: 'Fat', value: formatNutrientValue(nutrition.fat), key: 'fat' },
            { label: 'Fiber', value: formatNutrientValue(nutrition.fiber), key: 'fiber' },
            { label: 'Sodium', value: formatNutrientValue(nutrition.sodium), key: 'sodium' }
        ].filter(n => n.value && n.value !== '0' && n.value !== '0g' && n.value !== '0mg');
    };

    const getDetailedNutrients = () => {
        if (!nutrition) return [];

        const detailed = [
            { label: 'Saturated Fat', value: formatNutrientValue(nutrition.saturatedFat) },
            { label: 'Cholesterol', value: formatNutrientValue(nutrition.cholesterol) },
            { label: 'Sugars', value: formatNutrientValue(nutrition.sugars) },
            { label: 'Calcium', value: formatNutrientValue(nutrition.calcium) },
            { label: 'Iron', value: formatNutrientValue(nutrition.iron) },
            { label: 'Vitamin C', value: formatNutrientValue(nutrition.vitaminC) },
            { label: 'Vitamin A', value: formatNutrientValue(nutrition.vitaminA) }
        ].filter(n => n.value && n.value !== '0' && n.value !== '0g' && n.value !== '0mg' && n.value !== '0µg');

        return detailed;
    };

    if (compact && !nutrition) {
        return showAnalyzeButton ? (
            <TouchEnhancedButton
                onClick={handleAnalyzeNutrition}
                disabled={loading}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
            >
                {loading ? '🔍...' : '🔍 Nutrition'}
            </TouchEnhancedButton>
        ) : null;
    }

    return (
        <div className={`bg-white border border-gray-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
                    📊 Nutrition Facts
                </h3>
                <div className="flex items-center gap-2">
                    {nutrition && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getQualityColor(getNutritionQuality())}`}>
                            {getQualityLabel(getNutritionQuality())}
                        </span>
                    )}
                    {showAnalyzeButton && (
                        <TouchEnhancedButton
                            onClick={handleAnalyzeNutrition}
                            disabled={loading}
                            className={`text-xs px-3 py-1 rounded transition-colors ${
                                loading
                                    ? 'bg-gray-100 text-gray-500'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            {loading ? '🔍 Analyzing...' : nutrition ? '🔄 Refresh' : '🔍 Analyze'}
                        </TouchEnhancedButton>
                    )}
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                    <div className="flex items-center gap-2 text-red-700 text-sm">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="text-center py-6">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-sm text-gray-600">Analyzing nutrition...</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Checking UPC database, USDA data, and AI estimation
                    </p>
                </div>
            )}

            {/* No Nutrition Data */}
            {!nutrition && !loading && (
                <div className="text-center py-6">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-sm text-gray-600 mb-3">
                        No nutrition data available
                    </p>
                    {showAnalyzeButton && (
                        <TouchEnhancedButton
                            onClick={handleAnalyzeNutrition}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                            🤖 Analyze with AI
                        </TouchEnhancedButton>
                    )}
                </div>
            )}

            {/* Nutrition Display */}
            {nutrition && !loading && (
                <>
                    {/* Main Nutrients */}
                    <div className="space-y-2 mb-4">
                        {getMainNutrients().map((nutrient, index) => (
                            <div key={index} className="flex justify-between items-center">
                                <span className={`text-gray-700 ${compact ? 'text-sm' : 'text-base'}`}>
                                    {nutrient.label}
                                </span>
                                <span className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
                                    {nutrient.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Show More/Less Toggle */}
                    {!compact && getDetailedNutrients().length > 0 && (
                        <div className="border-t border-gray-200 pt-3">
                            <TouchEnhancedButton
                                onClick={() => setShowDetails(!showDetails)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                {showDetails ? '▼ Hide Details' : '▶ Show More Details'}
                            </TouchEnhancedButton>
                        </div>
                    )}

                    {/* Detailed Nutrients */}
                    {!compact && showDetails && getDetailedNutrients().length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                            {getDetailedNutrients().map((nutrient, index) => (
                                <div key={index} className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">
                                        {nutrient.label}
                                    </span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {nutrient.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Metadata */}
                    {nutrition.warnings && nutrition.warnings.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                <div className="text-xs text-yellow-800">
                                    <div className="font-medium mb-1">⚠️ Notes:</div>
                                    <ul className="space-y-1">
                                        {nutrition.warnings.map((warning, index) => (
                                            <li key={index}>• {warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Data Source Info */}
                    {!compact && nutrition.calculatedAt && (
                        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                            <div>Analyzed: {new Date(nutrition.calculatedAt).toLocaleDateString()}</div>
                            {nutrition.fdcId && (
                                <div>USDA ID: {nutrition.fdcId}</div>
                            )}
                            {nutrition.confidence && (
                                <div>Confidence: {Math.round(nutrition.confidence * 100)}%</div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
