
'use client';

// file: /src/components/integrations/InventoryNutritionSummary.js v1

import React, { useState } from 'react';

export function InventoryNutritionSummary({ data, loading, onAnalyze }) {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [analysisProgress, setAnalysisProgress] = useState(null);

    const inventory = data?.inventory?.items || [];
    const itemsWithNutrition = inventory.filter(item => item.nutrition && Object.keys(item.nutrition).length > 0);
    const itemsWithoutNutrition = inventory.filter(item => !item.nutrition || Object.keys(item.nutrition).length === 0);

    const categoryBreakdown = data?.inventory?.categoryBreakdown || {};
    const nutritionCoverage = data?.inventory?.nutritionCoverage || { percentage: 0, total: 0, withNutrition: 0 };

    const analyzeCategory = async (category) => {
        setAnalysisProgress({ category, progress: 0 });

        try {
            const response = await fetch('/api/inventory/enhance-nutrition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: category !== 'all' ? category : null,
                    analysisLevel: 'standard'
                })
            });

            const result = await response.json();

            if (result.success) {
                setAnalysisProgress({ category, progress: 100, completed: true });
                setTimeout(() => {
                    setAnalysisProgress(null);
                    onAnalyze?.();
                }, 2000);
            }
        } catch (error) {
            console.error('Category analysis failed:', error);
            setAnalysisProgress({ category, progress: 0, error: true });
        }
    };

    const getCategoryNutritionStats = (category) => {
        const categoryItems = category === 'all'
            ? inventory
            : inventory.filter(item => item.category === category);

        const withNutrition = categoryItems.filter(item => item.nutrition).length;
        const total = categoryItems.length;
        const percentage = total > 0 ? Math.round((withNutrition / total) * 100) : 0;

        return { withNutrition, total, percentage };
    };

    if (loading && !data) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="text-center">
                                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">📊 Coverage</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCoverageColorClass(nutritionCoverage.percentage)}`}>
                            {nutritionCoverage.percentage}%
                        </span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>With nutrition:</span>
                            <span className="font-medium text-green-600">{nutritionCoverage.withNutrition}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Missing nutrition:</span>
                            <span className="font-medium text-orange-600">{nutritionCoverage.total - nutritionCoverage.withNutrition}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Total items:</span>
                            <span className="font-medium">{nutritionCoverage.total}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">🔬 Analysis</h3>
                        <span className="text-sm text-gray-500">AI-powered</span>
                    </div>
                    <div className="space-y-3">
                        <button
                            onClick={() => analyzeCategory('all')}
                            disabled={analysisProgress !== null}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                        >
                            {analysisProgress?.category === 'all' ?
                                '🔄 Analyzing...' :
                                '🔬 Analyze All Items'
                            }
                        </button>
                        <p className="text-xs text-gray-600 text-center">
                            Get comprehensive nutrition data for all inventory items
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">📈 Quality</h3>
                        <span className="text-sm text-gray-500">Accuracy</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>AI analyzed:</span>
                            <span className="font-medium text-blue-600">
                                {itemsWithNutrition.filter(item => item.nutrition?.calculationMethod === 'ai_calculated').length}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>USDA data:</span>
                            <span className="font-medium text-green-600">
                                {itemsWithNutrition.filter(item => item.nutrition?.calculationMethod === 'usda_lookup').length}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Manual entry:</span>
                            <span className="font-medium text-gray-600">
                                {itemsWithNutrition.filter(item => item.nutrition?.calculationMethod === 'manual_entry').length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📂 By Category</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(categoryBreakdown).map(([category, count]) => {
                        const stats = getCategoryNutritionStats(category);
                        const isAnalyzing = analysisProgress?.category === category;

                        return (
                            <div key={category} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-medium text-gray-900 text-sm">{category}</h4>
                                        <p className="text-xs text-gray-500">{count} items</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getCoverageColorClass(stats.percentage)}`}>
                                        {stats.percentage}%
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                stats.percentage >= 80 ? 'bg-green-500' :
                                                    stats.percentage >= 60 ? 'bg-blue-500' :
                                                        stats.percentage >= 40 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                            }`}
                                            style={{ width: `${stats.percentage}%` }}
                                        ></div>
                                    </div>

                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span>{stats.withNutrition}/{stats.total}</span>
                                        <button
                                            onClick={() => analyzeCategory(category)}
                                            disabled={isAnalyzing || stats.percentage === 100}
                                            className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                                        >
                                            {isAnalyzing ? '🔄' : stats.percentage === 100 ? '✅' : '🔬'}
                                        </button>
                                    </div>
                                </div>

                                {isAnalyzing && (
                                    <div className="mt-2 text-xs text-blue-600">
                                        Analyzing...
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Progress Indicator */}
            {analysisProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-900">
                            🔬 Analyzing {analysisProgress.category === 'all' ? 'all items' : analysisProgress.category}
                        </span>
                        {analysisProgress.completed && (
                            <span className="text-green-600 text-sm">✅ Complete</span>
                        )}
                    </div>

                    {!analysisProgress.completed && !analysisProgress.error && (
                        <div className="text-xs text-blue-700 mb-2">
                            AI is analyzing nutrition data for your inventory items...
                        </div>
                    )}

                    {analysisProgress.error && (
                        <div className="text-xs text-red-700">
                            ❌ Analysis failed. Please try again.
                        </div>
                    )}
                </div>
            )}

            {/* Items needing analysis */}
            {itemsWithoutNutrition.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="font-medium text-orange-900">📋 Items Awaiting Analysis</h4>
                            <p className="text-sm text-orange-700">
                                {itemsWithoutNutrition.length} items can be analyzed for complete nutrition data
                            </p>
                        </div>
                        <button
                            onClick={() => analyzeCategory('all')}
                            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm"
                        >
                            🔬 Analyze Now
                        </button>
                    </div>
                </div>
            )}

            {/* Items with Nutrition Data */}
            {itemsWithNutrition.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">✅ Items with Nutrition Data</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {itemsWithNutrition.slice(0, 9).map((item, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                        📊 Complete
                                    </span>
                                </div>

                                {item.brand && (
                                    <p className="text-xs text-gray-500 mb-2">{item.brand}</p>
                                )}

                                <div className="space-y-1 text-sm">
                                    {item.nutrition.calories && (
                                        <div className="flex justify-between">
                                            <span>Calories:</span>
                                            <span className="font-medium">{Math.round(item.nutrition.calories.value)} kcal</span>
                                        </div>
                                    )}
                                    {item.nutrition.protein && (
                                        <div className="flex justify-between">
                                            <span>Protein:</span>
                                            <span className="font-medium">{item.nutrition.protein.value?.toFixed(1)}g</span>
                                        </div>
                                    )}
                                    {item.nutrition.carbs && (
                                        <div className="flex justify-between">
                                            <span>Carbs:</span>
                                            <span className="font-medium">{item.nutrition.carbs.value?.toFixed(1)}g</span>
                                        </div>
                                    )}
                                    {item.nutrition.fat && (
                                        <div className="flex justify-between">
                                            <span>Fat:</span>
                                            <span className="font-medium">{item.nutrition.fat.value?.toFixed(1)}g</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                        <span>
                                            {item.nutrition.calculationMethod === 'ai_calculated' ? '🤖 AI' :
                                                item.nutrition.calculationMethod === 'usda_lookup' ? '🗃️ USDA' :
                                                    '📋 Manual'}
                                        </span>
                                        {item.nutrition.confidence && (
                                            <span>{Math.round(item.nutrition.confidence * 100)}% confidence</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {itemsWithNutrition.length > 9 && (
                        <div className="mt-4 text-center">
                            <p className="text-sm text-gray-600">
                                Showing 9 of {itemsWithNutrition.length} items with nutrition data
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function getCoverageColorClass(percentage) {
    if (percentage >= 80) return 'bg-green-100 text-green-700';
    if (percentage >= 60) return 'bg-blue-100 text-blue-700';
    if (percentage >= 40) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
}