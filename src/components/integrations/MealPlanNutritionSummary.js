'use client';

// file: /src/components/integrations/MealPlanNutritionSummary.js v2

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import { FEATURE_GATES } from '@/lib/subscription-config';

export function MealPlanNutritionSummary({ data, loading, onRefresh }) {
    const router = useRouter();
    const subscription = useSubscription();
    const mealPlanningGate = useFeatureGate(FEATURE_GATES.CREATE_MEAL_PLAN);

    const [selectedPlan, setSelectedPlan] = useState(null);
    const [nutritionView, setNutritionView] = useState('summary'); // 'summary', 'daily', 'goals'

    const mealPlans = data?.mealPlans?.recent || [];
    const weeklyNutrition = data?.mealPlans?.weeklyNutrition || {};
    const upcomingMeals = data?.mealPlans?.upcomingMeals || [];
    const nutritionGoals = data?.goals?.current || {};

    // Enhanced navigation function that determines best route based on subscription
    const handleCreateMealPlan = () => {
        if (!mealPlanningGate.hasAccess) {
            // Redirect to pricing if no access
            router.push('/app/pricing');
            return;
        }

        // Determine which meal planning interface to use based on subscription tier
        if (subscription?.plan === 'platinum') {
            // Platinum users get the enhanced experience with full price intelligence
            router.push('/meal-planning/enhanced');
        } else if (subscription?.plan === 'gold') {
            // Gold users get smart meal planning with basic price intelligence
            router.push('/meal-planning');
        } else {
            // Fallback to basic meal planning
            router.push('/meal-planning');
        }
    };

    const calculateMealPlanNutrition = (mealPlan) => {
        // This would calculate actual nutrition from meal plan
        // For now, returning mock data based on plan structure
        const mockNutrition = {
            totalCalories: 1850 + Math.floor(Math.random() * 300),
            totalProtein: 125 + Math.floor(Math.random() * 50),
            totalCarbs: 220 + Math.floor(Math.random() * 80),
            totalFat: 68 + Math.floor(Math.random() * 25),
            mealCount: (mealPlan?.meals?.length || 0) + Math.floor(Math.random() * 5) + 10
        };

        mockNutrition.dailyAverage = {
            calories: Math.round(mockNutrition.totalCalories / 7),
            protein: Math.round(mockNutrition.totalProtein / 7),
            carbs: Math.round(mockNutrition.totalCarbs / 7),
            fat: Math.round(mockNutrition.totalFat / 7)
        };

        return mockNutrition;
    };

    const getNutritionProgress = (current, goal) => {
        if (!goal || goal === 0) return 0;
        return Math.round((current / goal) * 100);
    };

    const getProgressColor = (percentage) => {
        if (percentage >= 90 && percentage <= 110) return 'bg-green-500';
        if (percentage >= 70 && percentage <= 130) return 'bg-blue-500';
        if (percentage >= 50 && percentage <= 150) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getUnit = (nutrient) => {
        const units = {
            dailyCalories: 'kcal',
            calories: 'kcal',
            protein: 'g',
            fat: 'g',
            carbs: 'g',
            fiber: 'g',
            sodium: 'mg'
        };
        return units[nutrient] || '';
    };

    const getStatus = (percentage, nutrient) => {
        if (nutrient === 'sodium') {
            if (percentage <= 100) return 'Excellent';
            if (percentage <= 120) return 'Good';
            return 'Too High';
        } else {
            if (percentage >= 90) return 'On Track';
            if (percentage >= 70) return 'Good';
            if (percentage >= 50) return 'Fair';
            return 'Needs Work';
        }
    };

    const getStatusColor = (percentage) => {
        if (percentage >= 90 && percentage <= 110) return 'text-green-600';
        if (percentage >= 70 && percentage <= 130) return 'text-blue-600';
        if (percentage >= 50 && percentage <= 150) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (loading && !data) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-4 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with View Toggle */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">📊 Meal Plan Nutrition</h3>
                    <button
                        onClick={onRefresh}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                        🔄 Refresh
                    </button>
                </div>

                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    {[
                        { id: 'summary', label: '📋 Summary' },
                        { id: 'daily', label: '📅 Daily' },
                        { id: 'goals', label: '🎯 Goals' }
                    ].map(view => (
                        <button
                            key={view.id}
                            onClick={() => setNutritionView(view.id)}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                                nutritionView === view.id
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {view.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary View */}
            {nutritionView === 'summary' && (
                <div className="space-y-6">
                    {/* Weekly Overview */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">📈 Weekly Overview</h4>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                {
                                    label: 'Avg Daily Calories',
                                    value: weeklyNutrition.averageCalories || 0,
                                    unit: 'kcal',
                                    color: 'blue'
                                },
                                {
                                    label: 'Avg Daily Protein',
                                    value: weeklyNutrition.averageProtein || 0,
                                    unit: 'g',
                                    color: 'green'
                                },
                                {
                                    label: 'Avg Daily Carbs',
                                    value: weeklyNutrition.averageCarbs || 0,
                                    unit: 'g',
                                    color: 'orange'
                                },
                                {
                                    label: 'Avg Daily Fat',
                                    value: weeklyNutrition.averageFat || 0,
                                    unit: 'g',
                                    color: 'purple'
                                }
                            ].map((metric, index) => (
                                <div key={index} className="text-center">
                                    <div className={`text-2xl font-bold text-${metric.color}-600`}>
                                        {Math.round(metric.value)}
                                    </div>
                                    <div className="text-xs text-gray-500 mb-1">{metric.unit}</div>
                                    <div className="text-sm text-gray-700">{metric.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Meals planned this week:</span>
                                <span className="font-medium">{weeklyNutrition.mealsPlanned || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Active Meal Plans */}
                    {mealPlans.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 Active Meal Plans</h4>

                            <div className="space-y-3">
                                {mealPlans.slice(0, 3).map((plan, index) => {
                                    const nutrition = calculateMealPlanNutrition(plan);

                                    return (
                                        <div
                                            key={index}
                                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                            onClick={() => setSelectedPlan(selectedPlan === plan._id ? null : plan._id)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h5 className="font-medium text-gray-900">{plan.name}</h5>
                                                    <p className="text-sm text-gray-600">
                                                        Week of {new Date(plan.weekStartDate).toLocaleDateString()}
                                                    </p>

                                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                                        <span>🍽️ {nutrition.mealCount} meals</span>
                                                        <span>🔥 {nutrition.totalCalories} cal</span>
                                                        <span>💪 {nutrition.totalProtein}g protein</span>
                                                    </div>
                                                </div>

                                                <button className="text-gray-400 hover:text-gray-600">
                                                    {selectedPlan === plan._id ? '▼' : '▶'}
                                                </button>
                                            </div>

                                            {selectedPlan === plan._id && (
                                                <div className="mt-4 pt-4 border-t border-gray-100">
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-gray-600">Daily Average:</span>
                                                            <div className="mt-1 space-y-1">
                                                                <div>Calories: {nutrition.dailyAverage.calories}</div>
                                                                <div>Protein: {nutrition.dailyAverage.protein}g</div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Weekly Total:</span>
                                                            <div className="mt-1 space-y-1">
                                                                <div>Carbs: {nutrition.totalCarbs}g</div>
                                                                <div>Fat: {nutrition.totalFat}g</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Daily View */}
            {nutritionView === 'daily' && (
                <div className="space-y-6">
                    {/* Upcoming Meals */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">📅 Upcoming Meals</h4>

                        {upcomingMeals.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingMeals.slice(0, 7).map((meal, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-sm font-medium text-gray-900 capitalize">
                                                    {meal.day}
                                                </span>
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                    {meal.mealType}
                                                </span>
                                                <span className="text-sm text-gray-700">
                                                    {meal.name}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-xs text-gray-500">
                                            ~{200 + Math.floor(Math.random() * 400)} cal
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-2">📅</div>
                                <h5 className="font-medium text-gray-900 mb-2">No Upcoming Meals</h5>
                                <p className="text-gray-600 text-sm">
                                    Create a meal plan to see daily nutrition breakdown.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Daily Nutrition Breakdown */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 Daily Breakdown</h4>

                        <div className="space-y-4">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                                // Mock daily nutrition data
                                const dayNutrition = {
                                    calories: 1800 + Math.floor(Math.random() * 400),
                                    protein: 120 + Math.floor(Math.random() * 40),
                                    carbs: 200 + Math.floor(Math.random() * 80),
                                    fat: 60 + Math.floor(Math.random() * 20),
                                    meals: Math.floor(Math.random() * 5) + 2
                                };

                                return (
                                    <div key={day} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h5 className="font-medium text-gray-900">{day}</h5>
                                            <span className="text-xs text-gray-500">
                                                {dayNutrition.meals} meals planned
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-4 gap-4 text-sm">
                                            <div className="text-center">
                                                <div className="font-medium text-blue-600">{dayNutrition.calories}</div>
                                                <div className="text-xs text-gray-500">calories</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-medium text-green-600">{dayNutrition.protein}g</div>
                                                <div className="text-xs text-gray-500">protein</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-medium text-orange-600">{dayNutrition.carbs}g</div>
                                                <div className="text-xs text-gray-500">carbs</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-medium text-purple-600">{dayNutrition.fat}g</div>
                                                <div className="text-xs text-gray-500">fat</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Goals View */}
            {nutritionView === 'goals' && (
                <div className="space-y-6">
                    {/* Goal Progress */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">🎯 Goal Progress</h4>

                        {Object.keys(nutritionGoals).length > 0 ? (
                            <div className="space-y-4">
                                {Object.entries(nutritionGoals).map(([nutrient, goal]) => {
                                    // Mock current progress
                                    const current = goal * (0.7 + Math.random() * 0.6);
                                    const percentage = Math.min((current / goal) * 100, 120);

                                    return (
                                        <div key={nutrient} className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-900 capitalize">
                                                    {nutrient.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                                </span>
                                                <span className="text-sm text-gray-600">
                                                    {Math.round(current)} / {goal} {getUnit(nutrient)}
                                                </span>
                                            </div>

                                            <div className="w-full bg-gray-200 rounded-full h-3">
                                                <div
                                                    className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(percentage)}`}
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                ></div>
                                            </div>

                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500">
                                                    {Math.round(percentage)}% of goal
                                                </span>
                                                <span className={`font-medium ${getStatusColor(percentage)}`}>
                                                    {getStatus(percentage, nutrient)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-2">🎯</div>
                                <h5 className="font-medium text-gray-900 mb-2">No Goals Set</h5>
                                <p className="text-gray-600 text-sm mb-4">
                                    Set nutrition goals to track your meal plan progress.
                                </p>
                                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                    Set Goals
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Recommendations */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommendations</h4>

                        <div className="space-y-3">
                            {[
                                {
                                    type: 'protein',
                                    message: 'Add more protein sources to your breakfast meals',
                                    action: 'Try Greek yogurt or protein smoothies',
                                    icon: '💪',
                                    priority: 'medium'
                                },
                                {
                                    type: 'fiber',
                                    message: 'Increase fiber intake with more vegetables',
                                    action: 'Include a salad with lunch and dinner',
                                    icon: '🥗',
                                    priority: 'high'
                                },
                                {
                                    type: 'sodium',
                                    message: 'Reduce sodium by choosing fresh ingredients',
                                    action: 'Replace processed foods with whole foods',
                                    icon: '🧂',
                                    priority: 'low'
                                }
                            ].map((rec, index) => (
                                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                                    rec.priority === 'high' ? 'border-red-400 bg-red-50' :
                                        rec.priority === 'medium' ? 'border-yellow-400 bg-yellow-50' :
                                            'border-green-400 bg-green-50'
                                }`}>
                                    <div className="flex items-start space-x-3">
                                        <span className="text-lg">{rec.icon}</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{rec.message}</p>
                                            <p className="text-xs text-gray-600 mt-1">{rec.action}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                                            rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-green-100 text-green-700'
                                        }`}>
                                            {rec.priority}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced No Meal Plans State */}
            {mealPlans.length === 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <div className="text-4xl mb-4">📋</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Meal Plans Found</h3>
                    <p className="text-gray-600 mb-6">
                        Create a meal plan to track nutrition and get AI-powered insights.
                    </p>

                    {/* Enhanced CTA with smart routing */}
                    <div className="space-y-3">
                        <button
                            onClick={handleCreateMealPlan}
                            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                                mealPlanningGate.hasAccess
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                            }`}
                        >
                            {mealPlanningGate.hasAccess
                                ? (subscription?.plan === 'platinum' ? '🚀 Create Smart Meal Plan' : '📅 Create Meal Plan')
                                : '🔓 Upgrade to Create Meal Plans'
                            }
                        </button>

                        {!mealPlanningGate.hasAccess && (
                            <p className="text-sm text-gray-500">
                                Meal planning is available with Gold and Platinum subscriptions
                            </p>
                        )}

                        {mealPlanningGate.hasAccess && subscription?.plan === 'platinum' && (
                            <p className="text-sm text-green-600">
                                💎 Platinum: Includes price intelligence and advanced optimization
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}