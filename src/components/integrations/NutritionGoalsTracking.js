'use client';

// file: /src/components/integrations/NutritionGoalsTracking.js v1

import React, { useState, useEffect } from 'react';

export function NutritionGoalsTracking({ data, loading, onGoalsUpdate }) {
    const [goals, setGoals] = useState({
        dailyCalories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65,
        fiber: 25,
        sodium: 2300
    });

    const [saving, setSaving] = useState(false);
    const [progress, setProgress] = useState({});
    const [recommendations, setRecommendations] = useState([]);

    useEffect(() => {
        if (data?.goals?.current) {
            setGoals(data.goals.current);
        }
        if (data?.goals?.progress) {
            setProgress(data.goals.progress);
        }
        if (data?.goals?.recommendations) {
            setRecommendations(data.goals.recommendations);
        }
    }, [data]);

    const saveGoals = async () => {
        try {
            setSaving(true);

            const response = await fetch('/api/nutrition/goals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(goals),
            });

            if (response.ok) {
                onGoalsUpdate?.();
            }
        } catch (error) {
            console.error('Error saving goals:', error);
        } finally {
            setSaving(false);
        }
    };

    const updateGoal = (key, value) => {
        setGoals(prev => ({
            ...prev,
            [key]: parseFloat(value) || 0
        }));
    };

    const getGoalStatus = (percentage, nutrient) => {
        if (nutrient === 'sodium') {
            if (percentage <= 100) return { status: 'excellent', color: 'green', icon: '✅' };
            if (percentage <= 120) return { status: 'good', color: 'blue', icon: '👍' };
            return { status: 'over', color: 'red', icon: '⚠️' };
        } else {
            if (percentage >= 90) return { status: 'excellent', color: 'green', icon: '✅' };
            if (percentage >= 70) return { status: 'good', color: 'blue', icon: '👍' };
            if (percentage >= 50) return { status: 'fair', color: 'yellow', icon: '📈' };
            return { status: 'needs_improvement', color: 'red', icon: '🎯' };
        }
    };

    const getRecommendationIcon = (type) => {
        const icons = {
            increase: '📈',
            decrease: '📉',
            maintain: '✅',
            adjust: '⚖️'
        };
        return icons[type] || '💡';
    };

    const getProgressBarColor = (color) => {
        const colorMap = {
            green: 'bg-green-500',
            blue: 'bg-blue-500',
            yellow: 'bg-yellow-500',
            red: 'bg-red-500'
        };
        return colorMap[color] || 'bg-gray-500';
    };

    const getTextColor = (color) => {
        const colorMap = {
            green: 'text-green-600',
            blue: 'text-blue-600',
            yellow: 'text-yellow-600',
            red: 'text-red-600'
        };
        return colorMap[color] || 'text-gray-600';
    };

    const getGoalUnit = (nutrient) => {
        const units = {
            dailyCalories: 'kcal',
            protein: 'g',
            carbs: 'g',
            fat: 'g',
            fiber: 'g',
            sodium: 'mg'
        };
        return units[nutrient] || '';
    };

    if (loading && !data) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="grid grid-cols-2 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded"></div>
                                <div className="h-10 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Goals Setting */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">🎯 Nutrition Goals</h3>
                        <p className="text-sm text-gray-600">
                            Set your daily nutrition targets for personalized recommendations
                        </p>
                    </div>
                    <button
                        onClick={saveGoals}
                        disabled={saving}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? '💾 Saving...' : '💾 Save Goals'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { key: 'dailyCalories', label: 'Daily Calories', unit: 'kcal', color: 'blue', min: 1200, max: 4000 },
                        { key: 'protein', label: 'Protein', unit: 'g', color: 'green', min: 50, max: 300 },
                        { key: 'carbs', label: 'Carbohydrates', unit: 'g', color: 'orange', min: 100, max: 500 },
                        { key: 'fat', label: 'Fat', unit: 'g', color: 'purple', min: 30, max: 200 },
                        { key: 'fiber', label: 'Fiber', unit: 'g', color: 'teal', min: 15, max: 50 },
                        { key: 'sodium', label: 'Sodium (limit)', unit: 'mg', color: 'red', min: 1000, max: 3000 }
                    ].map(goal => (
                        <div key={goal.key} className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">
                                {goal.label}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={goals[goal.key]}
                                    onChange={(e) => updateGoal(goal.key, e.target.value)}
                                    min={goal.min}
                                    max={goal.max}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={`Enter ${goal.label.toLowerCase()}`}
                                />
                                <span className="absolute right-3 top-2 text-sm text-gray-500">
                                    {goal.unit}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500">
                                Recommended: {goal.min}-{goal.max} {goal.unit}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Progress Tracking */}
            {Object.keys(progress).length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 Current Progress</h4>
                    <p className="text-sm text-gray-600 mb-6">
                        Based on your recent meal plans and nutrition data
                    </p>

                    <div className="space-y-4">
                        {Object.entries(progress).map(([nutrient, data]) => {
                            const status = getGoalStatus(data.percentage, nutrient);

                            return (
                                <div key={nutrient} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-gray-900 capitalize">
                                                {nutrient.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                            </span>
                                            <span className="text-lg">{status.icon}</span>
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            {data.current} / {data.goal} {getGoalUnit(nutrient)}
                                        </span>
                                    </div>

                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor(status.color)}`}
                                            style={{ width: `${Math.min(data.percentage, 100)}%` }}
                                        ></div>
                                    </div>

                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500">
                                            {data.percentage}% of goal
                                        </span>
                                        <span className={`font-medium ${getTextColor(status.color)}`}>
                                            {status.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* AI Recommendations */}
            {recommendations.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI Recommendations</h4>

                    <div className="space-y-3">
                        {recommendations.map((rec, index) => (
                            <div key={index} className={`p-4 rounded-lg border-l-4 ${
                                rec.priority === 'high' ? 'border-red-400 bg-red-50' :
                                    rec.priority === 'medium' ? 'border-yellow-400 bg-yellow-50' :
                                        'border-green-400 bg-green-50'
                            }`}>
                                <div className="flex items-start space-x-3">
                                    <span className="text-xl">{getRecommendationIcon(rec.type)}</span>
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="text-sm font-medium text-gray-900 capitalize">
                                                {rec.nutrient}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                                                rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-green-100 text-green-700'
                                            }`}>
                                                {rec.priority}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-2">{rec.message}</p>
                                        <p className="text-xs text-gray-600">{rec.action}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Goal Templates */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 Goal Templates</h4>
                <p className="text-sm text-gray-600 mb-4">
                    Quick setup based on common nutrition goals
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        {
                            name: 'Weight Loss',
                            description: 'Moderate calorie deficit with high protein',
                            icon: '⚖️',
                            goals: { dailyCalories: 1600, protein: 120, carbs: 150, fat: 55, fiber: 30, sodium: 2000 }
                        },
                        {
                            name: 'Muscle Gain',
                            description: 'Higher calories and protein for building muscle',
                            icon: '💪',
                            goals: { dailyCalories: 2400, protein: 180, carbs: 300, fat: 80, fiber: 25, sodium: 2300 }
                        },
                        {
                            name: 'Maintenance',
                            description: 'Balanced macros for maintaining current weight',
                            icon: '⚖️',
                            goals: { dailyCalories: 2000, protein: 150, carbs: 250, fat: 65, fiber: 25, sodium: 2300 }
                        },
                        {
                            name: 'Low Carb',
                            description: 'Reduced carbs, higher fat and protein',
                            icon: '🥩',
                            goals: { dailyCalories: 1800, protein: 140, carbs: 100, fat: 120, fiber: 20, sodium: 2000 }
                        },
                        {
                            name: 'Heart Healthy',
                            description: 'Low sodium, high fiber, balanced macros',
                            icon: '❤️',
                            goals: { dailyCalories: 2000, protein: 120, carbs: 250, fat: 60, fiber: 35, sodium: 1500 }
                        },
                        {
                            name: 'Athletic',
                            description: 'High calorie and carb for active lifestyle',
                            icon: '🏃',
                            goals: { dailyCalories: 2800, protein: 160, carbs: 400, fat: 90, fiber: 30, sodium: 2500 }
                        }
                    ].map((template, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center space-x-3 mb-3">
                                <span className="text-2xl">{template.icon}</span>
                                <div>
                                    <h5 className="font-medium text-gray-900">{template.name}</h5>
                                    <p className="text-xs text-gray-600">{template.description}</p>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>Calories: {template.goals.dailyCalories}</div>
                                    <div>Protein: {template.goals.protein}g</div>
                                    <div>Carbs: {template.goals.carbs}g</div>
                                    <div>Fat: {template.goals.fat}g</div>
                                    <div>Fiber: {template.goals.fiber}g</div>
                                    <div>Sodium: {template.goals.sodium}mg</div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setGoals(template.goals);
                                }}
                                className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                            >
                                Use Template
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Progress Chart Placeholder */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📈 Progress Over Time</h4>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-4xl mb-2">📊</div>
                        <p className="text-gray-600">Charts will appear here when you have progress data</p>
                        <p className="text-sm text-gray-500 mt-1">Track your nutrition goals over time</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
