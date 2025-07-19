'use client';

// file: /src/components/integrations/NutritionOverview.js v1

import React, { useState, useEffect } from 'react';

export function NutritionOverview({ data, loading, onAnalyze }) {
    const [insights, setInsights] = useState(null);

    useEffect(() => {
        if (data) {
            generateInsights(data);
        }
    }, [data]);

    const generateInsights = (dashboardData) => {
        const nutritionCoverage = dashboardData.inventory?.nutritionCoverage?.percentage || 0;
        const expiringItems = dashboardData.inventory?.expiringItems?.length || 0;
        const recipeSuggestions = dashboardData.smartInsights?.recipeSuggestions?.length || 0;

        const overallScore = calculateNutritionScore(dashboardData);

        setInsights({
            coverage: nutritionCoverage,
            expiring: expiringItems,
            suggestions: recipeSuggestions,
            score: overallScore
        });
    };

    const calculateNutritionScore = (data) => {
        let score = 0;

        // Nutrition coverage (40%)
        const coverage = data.inventory?.nutritionCoverage?.percentage || 0;
        score += (coverage / 100) * 40;

        // Inventory variety (30%)
        const categories = data.inventory?.categoryBreakdown ? Object.keys(data.inventory.categoryBreakdown).length : 0;
        score += Math.min(categories / 10, 1) * 30;

        // Goal progress (30%)
        const goalProgress = data.goals?.progress;
        if (goalProgress) {
            const avgProgress = Object.values(goalProgress).reduce((sum, goal) => {
                return sum + Math.min(goal.percentage / 100, 1);
            }, 0) / Object.keys(goalProgress).length;
            score += avgProgress * 30;
        }

        return Math.round(score);
    };

    if (loading && !data) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                            <div className="h-8 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const stats = [
        {
            title: 'Nutrition Score',
            value: insights?.score || 0,
            subtitle: 'Overall nutrition quality',
            icon: '🎯',
            color: getScoreColor(insights?.score || 0),
            suffix: '/100'
        },
        {
            title: 'Coverage',
            value: `${insights?.coverage || 0}%`,
            subtitle: 'Items with nutrition data',
            icon: '📊',
            color: getCoverageColor(insights?.coverage || 0)
        },
        {
            title: 'Expiring Soon',
            value: insights?.expiring || 0,
            subtitle: 'Items to use first',
            icon: '⏰',
            color: getExpiringColor(insights?.expiring || 0)
        },
        {
            title: 'AI Suggestions',
            value: insights?.suggestions || 0,
            subtitle: 'Recipe recommendations',
            icon: '🤖',
            color: 'bg-blue-100 text-blue-600'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-900">{stat.title}</h3>
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${stat.color}`}>
                                {stat.icon}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                            {stat.value}{stat.suffix || ''}
                        </div>
                        <div className="text-sm text-gray-600">{stat.subtitle}</div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={onAnalyze}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">🔬</div>
                        <div className="font-medium">Analyze Nutrition</div>
                        <div className="text-xs opacity-90">AI-powered analysis</div>
                    </button>

                    <button className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors text-center">
                        <div className="text-lg mb-1">🍳</div>
                        <div className="font-medium">Recipe Ideas</div>
                        <div className="text-xs opacity-90">From your inventory</div>
                    </button>

                    <button className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-center">
                        <div className="text-lg mb-1">🛒</div>
                        <div className="font-medium">Smart Shopping</div>
                        <div className="text-xs opacity-90">Optimized lists</div>
                    </button>

                    <button className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors text-center">
                        <div className="text-lg mb-1">📋</div>
                        <div className="font-medium">Meal Planning</div>
                        <div className="text-xs opacity-90">AI suggestions</div>
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            {data?.smartInsights?.recipeSuggestions?.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Recent Insights</h3>
                    <div className="space-y-3">
                        {data.smartInsights.recipeSuggestions.slice(0, 3).map((suggestion, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <span className="text-2xl">🤖</span>
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{suggestion.name}</h4>
                                    <p className="text-sm text-gray-600">{suggestion.description}</p>
                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                        <span>⏱️ {suggestion.cookingTime} min</span>
                                        <span>👥 {suggestion.servings} servings</span>
                                        {suggestion.inventoryUsage && (
                                            <span>📊 {Math.round(suggestion.inventoryUsage * 100)}% inventory use</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Nutrition Summary */}
            {data?.overview && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Nutrition Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{data.overview.inventoryCount}</div>
                            <div className="text-sm text-gray-600">Total Items</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{data.overview.itemsWithNutrition}</div>
                            <div className="text-sm text-gray-600">With Nutrition</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{data.overview.personalRecipes}</div>
                            <div className="text-sm text-gray-600">Personal Recipes</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{data.overview.recentMealPlans}</div>
                            <div className="text-sm text-gray-600">Active Meal Plans</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function getScoreColor(score) {
    if (score >= 80) return 'bg-green-100 text-green-600';
    if (score >= 60) return 'bg-blue-100 text-blue-600';
    if (score >= 40) return 'bg-yellow-100 text-yellow-600';
    return 'bg-red-100 text-red-600';
}

function getCoverageColor(coverage) {
    if (coverage >= 80) return 'bg-green-100 text-green-600';
    if (coverage >= 60) return 'bg-blue-100 text-blue-600';
    if (coverage >= 40) return 'bg-yellow-100 text-yellow-600';
    return 'bg-red-100 text-red-600';
}

function getExpiringColor(expiring) {
    if (expiring === 0) return 'bg-green-100 text-green-600';
    if (expiring <= 3) return 'bg-yellow-100 text-yellow-600';
    return 'bg-red-100 text-red-600';
}