// file: /src/components/nutrition/WeeklyNutritionDashboard.js v2 - Mobile optimized

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { getApiUrl } from '@/lib/api-config';

export default function WeeklyNutritionDashboard({ mealPlanId, mealPlanName, onClose }) {
    const { data: session } = useSession();
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [goals, setGoals] = useState(null);
    const [showGoalsEditor, setShowGoalsEditor] = useState(false);

    useEffect(() => {
        if (mealPlanId && session?.user?.id) {
            fetchGoalsAndAnalysis();
        }
    }, [mealPlanId, session?.user?.id]);

    const fetchGoalsAndAnalysis = async () => {
        setLoading(true);
        setError('');

        try {
            // Fetch goals and analysis in parallel
            const [goalsResponse, analysisResponse] = await Promise.all([
                fetch(getApiUrl('/api/nutrition/goals')),
                fetch(getApiUrl(`/api/nutrition/analyze?mealPlanId=${mealPlanId}`))
            ]);

            const goalsData = await goalsResponse.json();
            const analysisData = await analysisResponse.json();

            if (goalsData.success) {
                setGoals(goalsData.goals);
            }

            if (analysisData.success && analysisData.analysis) {
                setAnalysis(analysisData.analysis);
            } else {
                // Generate new analysis
                await generateAnalysis();
            }
        } catch (error) {
            console.error('Error fetching nutrition data:', error);
            setError('Failed to load nutrition data');
        } finally {
            setLoading(false);
        }
    };

    const generateAnalysis = async () => {
        try {
            const response = await fetch(getApiUrl('/api/nutrition/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ mealPlanId }),
            }));

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to analyze nutrition');
            }

            setAnalysis(result.analysis);
        } catch (error) {
            console.error('Error generating nutrition analysis:', error);
            setError(error.message);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            excellent: 'text-green-600',
            good: 'text-cyan-600',
            warning: 'text-yellow-600',
            under: 'text-red-600',
            over: 'text-orange-600'
        };
        return colors[status] || 'text-gray-600';
    };

    const getStatusBgColor = (status) => {
        const colors = {
            excellent: 'bg-green-500',
            good: 'bg-cyan-500',
            warning: 'bg-yellow-500',
            under: 'bg-red-500',
            over: 'bg-orange-500'
        };
        return colors[status] || 'bg-gray-500';
    };

    const getStatusIcon = (status) => {
        const icons = {
            excellent: '🎯',
            good: '✅',
            warning: '⚠️',
            under: '📉',
            over: '📈'
        };
        return icons[status] || '📊';
    };

    const formatNutrientValue = (value, unit) => {
        if (value === undefined || value === null) return '0';
        if (value < 1) return value.toFixed(1);
        return Math.round(value).toString();
    };

    const getDayName = (day) => {
        const days = {
            monday: 'Monday',
            tuesday: 'Tuesday',
            wednesday: 'Wednesday',
            thursday: 'Thursday',
            friday: 'Friday',
            saturday: 'Saturday',
            sunday: 'Sunday'
        };
        return days[day] || day;
    };

    const renderProgressBar = (percentage, status) => {
        const clampedPercentage = Math.min(Math.max(percentage, 0), 200); // Cap at 200%
        const width = Math.min(clampedPercentage, 100); // Visual width caps at 100%

        return (
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStatusBgColor(status)}`}
                    style={{ width: `${width}%` }}
                />
            </div>
        );
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-lg text-center max-w-sm mx-4">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Analyzing your weekly nutrition...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-6 rounded-lg text-center max-w-sm w-full">
                    <div className="text-4xl mb-4">❌</div>
                    <h3 className="text-lg font-semibold text-red-600 mb-2">Analysis Error</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <div className="flex gap-2 justify-center">
                        <TouchEnhancedButton
                            onClick={() => generateAnalysis()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                        >
                            Try Again
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                        >
                            Close
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        );
    }

    if (!analysis) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white w-full h-full md:max-w-4xl md:max-h-[90vh] md:rounded-lg overflow-hidden shadow-2xl flex flex-col">
                {/* Compact Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold text-gray-900 truncate">
                            📊 Nutrition Overview
                        </h2>
                        <p className="text-xs text-gray-600 truncate">
                            {mealPlanName}
                        </p>
                    </div>
                    <TouchEnhancedButton
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl p-1 ml-2"
                    >
                        ×
                    </TouchEnhancedButton>
                </div>

                {/* Compact Summary Cards - Mobile Optimized */}
                {analysis.nutritionScore !== undefined && (
                    <div className="p-3 border-b border-gray-100 bg-gray-50">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-blue-50 p-2 rounded text-center">
                                <div className={`text-lg font-bold ${
                                    analysis.nutritionScore >= 80 ? 'text-green-600' :
                                        analysis.nutritionScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                    {analysis.nutritionScore}
                                </div>
                                <div className="text-xs text-blue-500">Nutrition Score</div>
                            </div>
                            <div className="bg-green-50 p-2 rounded text-center">
                                <div className="text-lg font-bold text-green-600">
                                    {analysis.weeklyNutrition?.daysWithMeals || 0}/7
                                </div>
                                <div className="text-xs text-green-500">Days Planned</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Compact Tabs - Mobile Scrollable */}
                <div className="border-b border-gray-200 bg-white">
                    <div className="flex overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'overview', label: 'Overview', icon: '📊' },
                            { id: 'daily', label: 'Daily', icon: '📅' },
                            { id: 'insights', label: 'Insights', icon: '💡' },
                            { id: 'goals', label: 'Goals', icon: '🎯' }
                        ].map(tab => (
                            <TouchEnhancedButton
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 ${
                                    activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <span className="mr-1">{tab.icon}</span>
                                <span className="whitespace-nowrap">{tab.label}</span>
                            </TouchEnhancedButton>
                        ))}
                    </div>
                </div>

                {/* Scrollable Content - Takes remaining space */}
                <div className="flex-1 overflow-auto p-4">
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                                    📈 Weekly Averages vs Goals
                                </h3>
                            </div>

                            {analysis.goalComparison && (
                                <div className="space-y-3">
                                    {Object.entries(analysis.goalComparison).map(([nutrient, comp]) => (
                                        <div key={nutrient} className="bg-white border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{getStatusIcon(comp.status)}</span>
                                                    <div className="font-medium text-gray-900 capitalize">
                                                        {nutrient}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-gray-900">
                                                        {formatNutrientValue(comp.actual)}{comp.unit}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Goal: {formatNutrientValue(comp.goal)}{comp.unit}
                                                    </div>
                                                </div>
                                            </div>

                                            {renderProgressBar(comp.percentage, comp.status)}

                                            <div className="mt-2 flex justify-between items-center text-sm">
                                                <span className={`font-medium ${getStatusColor(comp.status)}`}>
                                                    {comp.percentage}% of goal
                                                </span>
                                                {comp.difference !== 0 && (
                                                    <span className="text-gray-600">
                                                        ({comp.difference > 0 ? '+' : ''}{formatNutrientValue(comp.difference)}{comp.unit})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'daily' && (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                📅 Daily Nutrition Breakdown
                            </h3>
                            <div className="space-y-3">
                                {analysis.dailyNutrition && Object.entries(analysis.dailyNutrition).map(([day, dayData]) => (
                                    <div key={day} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 p-3 border-b border-gray-200">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-semibold text-gray-900">
                                                    {getDayName(day)}
                                                </h4>
                                                <div className="text-sm text-gray-600">
                                                    {dayData.mealCount} meal{dayData.mealCount !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            {dayData.mealCount > 0 ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-gray-900">
                                                            {formatNutrientValue(dayData.calories?.value)}
                                                        </div>
                                                        <div className="text-xs text-gray-600">Calories</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-gray-900">
                                                            {formatNutrientValue(dayData.protein?.value)}g
                                                        </div>
                                                        <div className="text-xs text-gray-600">Protein</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-gray-900">
                                                            {formatNutrientValue(dayData.carbs?.value)}g
                                                        </div>
                                                        <div className="text-xs text-gray-600">Carbs</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-gray-900">
                                                            {formatNutrientValue(dayData.fat?.value)}g
                                                        </div>
                                                        <div className="text-xs text-gray-600">Fat</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-500 text-sm py-4">
                                                    No meals planned for this day
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'insights' && (
                        <div className="space-y-4">
                            {/* Highlights */}
                            {analysis.insights?.highlights?.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                                        🌟 Highlights
                                    </h3>
                                    <div className="space-y-3">
                                        {analysis.insights.highlights.map((highlight, index) => (
                                            <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-xl">{highlight.icon}</span>
                                                    <p className="text-green-800 text-sm flex-1">
                                                        {highlight.message}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Concerns */}
                            {analysis.insights?.concerns?.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                                        ⚠️ Areas for Improvement
                                    </h3>
                                    <div className="space-y-3">
                                        {analysis.insights.concerns.map((concern, index) => (
                                            <div key={index} className={`border rounded-lg p-4 ${
                                                concern.priority === 'high'
                                                    ? 'bg-red-50 border-red-200'
                                                    : 'bg-yellow-50 border-yellow-200'
                                            }`}>
                                                <div className="flex items-start gap-3">
                                                    <span className="text-xl">{concern.icon}</span>
                                                    <div className="flex-1">
                                                        <p className={`text-sm ${
                                                            concern.priority === 'high' ? 'text-red-800' : 'text-yellow-800'
                                                        }`}>
                                                            {concern.message}
                                                        </p>
                                                        {concern.priority === 'high' && (
                                                            <div className="mt-2">
                                                                <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                                                                    High Priority
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            {analysis.insights?.recommendations?.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                                        💡 Recommendations
                                    </h3>
                                    <div className="space-y-3">
                                        {analysis.insights.recommendations.map((rec, index) => (
                                            <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-medium text-blue-900 capitalize text-sm">
                                                        {rec.category}
                                                    </h4>
                                                    <span className={`px-2 py-1 rounded text-xs text-white ${
                                                        rec.difficulty === 'easy' ? 'bg-green-500' :
                                                            rec.difficulty === 'moderate' ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}>
                                                        {rec.difficulty}
                                                    </span>
                                                </div>
                                                <p className="text-blue-800 text-sm mb-2">
                                                    {rec.suggestion}
                                                </p>
                                                <p className="text-blue-600 text-xs italic">
                                                    {rec.impact}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'goals' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-gray-900">
                                    🎯 Nutrition Goals
                                </h3>
                                <TouchEnhancedButton
                                    onClick={() => setShowGoalsEditor(!showGoalsEditor)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm"
                                >
                                    {showGoalsEditor ? 'View Goals' : 'Edit Goals'}
                                </TouchEnhancedButton>
                            </div>

                            {showGoalsEditor ? (
                                <GoalsEditor
                                    goals={goals}
                                    onUpdate={(newGoals) => {
                                        setGoals(newGoals);
                                        setShowGoalsEditor(false);
                                        // Re-analyze with new goals
                                        fetchGoalsAndAnalysis();
                                    }}
                                />
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {goals && Object.entries(goals).map(([key, value]) => (
                                        <div key={key} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                                            <div className="text-lg font-bold text-gray-900 mb-1">
                                                {value}{key === 'dailyCalories' ? ' kcal' : key === 'sodium' ? ' mg' : ' g'}
                                            </div>
                                            <div className="text-xs text-gray-600 capitalize">
                                                {key === 'dailyCalories' ? 'Daily Calories' : key}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Compact Footer */}
                <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div className="text-xs text-gray-600">
                        Last analyzed: {new Date(analysis.generatedAt).toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                        <TouchEnhancedButton
                            onClick={generateAnalysis}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                        >
                            🔄 Refresh
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                        >
                            Close
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Simple Goals Editor Component
function GoalsEditor({ goals, onUpdate }) {
    const [formData, setFormData] = useState(goals || {});
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(getApiUrl('/api/nutrition/goals', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            }));

            const result = await response.json();

            if (result.success) {
                onUpdate(result.goals);
            } else {
                alert(result.error || 'Failed to update goals');
            }
        } catch (error) {
            console.error('Error updating goals:', error);
            alert('Error updating goals');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            [key]: parseFloat(value) || 0
        }));
    };

    const resetToDefaults = async () => {
        setLoading(true);
        try {
            const response = await fetch(getApiUrl('/api/nutrition/goals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            }));

            const result = await response.json();

            if (result.success) {
                setFormData(result.goals);
                onUpdate(result.goals);
            } else {
                alert(result.error || 'Failed to reset goals');
            }
        } catch (error) {
            console.error('Error resetting goals:', error);
            alert('Error resetting goals');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                        Edit Nutrition Goals
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                        Set your daily nutrition targets. These will be used to evaluate your meal plans.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {[
                        { key: 'dailyCalories', label: 'Daily Calories', unit: 'kcal', description: 'Total daily calorie target' },
                        { key: 'protein', label: 'Protein', unit: 'g', description: 'Daily protein goal in grams' },
                        { key: 'carbs', label: 'Carbohydrates', unit: 'g', description: 'Daily carb goal in grams' },
                        { key: 'fat', label: 'Fat', unit: 'g', description: 'Daily fat goal in grams' },
                        { key: 'fiber', label: 'Fiber', unit: 'g', description: 'Daily fiber goal in grams' },
                        { key: 'sodium', label: 'Sodium', unit: 'mg', description: 'Daily sodium limit in milligrams' }
                    ].map(({ key, label, unit, description }) => (
                        <div key={key} className="bg-white p-3 rounded-md border border-gray-200">
                            <label className="block text-sm font-medium text-gray-900 mb-1">
                                {label}
                            </label>
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="number"
                                    min="0"
                                    step={unit === 'kcal' ? '50' : unit === 'mg' ? '100' : '1'}
                                    value={formData[key] || ''}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="flex-1 p-2 border border-gray-300 rounded text-sm"
                                    placeholder="0"
                                />
                                <span className="text-xs text-gray-600 font-medium min-w-8">
                                    {unit}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 leading-tight">
                                {description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2 justify-between pt-4 border-t border-gray-200">
                    <TouchEnhancedButton
                        type="button"
                        onClick={resetToDefaults}
                        disabled={loading}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm disabled:opacity-50"
                    >
                        Reset to Defaults
                    </TouchEnhancedButton>

                    <TouchEnhancedButton
                        type="submit"
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                    >
                        {loading ? 'Updating...' : 'Update Goals'}
                    </TouchEnhancedButton>
                </div>
            </form>

            {/* Helpful Guidelines */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h5 className="text-sm font-medium text-blue-900 mb-2">
                    💡 Nutrition Guidelines
                </h5>
                <div className="text-xs text-blue-800 leading-relaxed">
                    <p className="mb-2">
                        <strong>General recommendations for adults:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Calories: 1,800-2,400 (varies by age, sex, activity level)</li>
                        <li>Protein: 0.8-1.2g per kg body weight</li>
                        <li>Carbs: 45-65% of total calories</li>
                        <li>Fat: 20-35% of total calories</li>
                        <li>Fiber: 25-35g per day</li>
                        <li>Sodium: Less than 2,300mg per day</li>
                    </ul>
                    <p className="mt-2 italic">
                        Consult with a healthcare provider for personalized nutrition advice.
                    </p>
                </div>
            </div>
        </div>
    );
}