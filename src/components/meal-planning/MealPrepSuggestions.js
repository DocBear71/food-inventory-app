'use client';
// file: /src/components/meal-planning/MealPrepSuggestions.js v2 - Mobile optimized


import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { apiGet, apiPost, apiPut } from '@/lib/api-config';

export default function MealPrepSuggestions({ mealPlanId, mealPlanName, onClose }) {
    const { data: session } = useSafeSession();
    const [suggestions, setSuggestions] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [completedTasks, setCompletedTasks] = useState(new Set());
    const [userPreferences, setUserPreferences] = useState({
        maxPrepTime: 180,
        preferredPrepDays: ['sunday'],
        skillLevel: 'beginner'
    });

    useEffect(() => {
        if (mealPlanId && session?.user?.id) {
            fetchOrGenerateSuggestions();
        }
    }, [mealPlanId, session?.user?.id]);

    const fetchOrGenerateSuggestions = async () => {
        setLoading(true);
        setError('');

        try {
            // First try to fetch existing suggestions
            const response = await apiGet(`/api/meal-prep/generate?mealPlanId=${mealPlanId}`);
            const result = await response.json();

            if (result.success && result.suggestions) {
                setSuggestions(result.suggestions);
                setCompletedTasks(new Set(result.suggestions.implementation?.tasksCompleted || []));
            } else {
                // Generate new suggestions
                await generateSuggestions();
            }
        } catch (error) {
            console.error('Error fetching meal prep suggestions:', error);
            setError('Failed to load meal prep suggestions');
        } finally {
            setLoading(false);
        }
    };

    const generateSuggestions = async (regenerate = false) => {
        setLoading(true);
        setError('');

        try {
            const response = await apiPost('/api/meal-prep/generate', {
                mealPlanId,
                userPreferences,
                regenerate
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate suggestions');
            }

            setSuggestions(result.suggestions);
            setCompletedTasks(new Set());
        } catch (error) {
            console.error('Error generating meal prep suggestions:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTaskComplete = async (taskId) => {
        try {
            const response = await apiPut(`/api/meal-prep/${suggestions._id}`, {
                action: 'markTaskComplete',
                taskId
            });

            if (response.ok) {
                const updatedCompletedTasks = new Set(completedTasks);
                updatedCompletedTasks.add(taskId);
                setCompletedTasks(updatedCompletedTasks);

                // Refresh suggestions to get updated completion rate
                const result = await response.json();
                setSuggestions(result.suggestion);
            }
        } catch (error) {
            console.error('Error marking task complete:', error);
        }
    };

    const getDayName = (day) => {
        const days = {
            sunday: 'Sunday',
            monday: 'Monday',
            tuesday: 'Tuesday',
            wednesday: 'Wednesday',
            thursday: 'Thursday',
            friday: 'Friday',
            saturday: 'Saturday'
        };
        return days[day] || day;
    };

    const getTaskIcon = (taskType) => {
        const icons = {
            batch_cook: '🍳',
            ingredient_prep: '🔪',
            portion: '📦',
            marinate: '🥄'
        };
        return icons[taskType] || '📋';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#10b981'
        };
        return colors[priority] || '#6b7280';
    };

    const formatTime = (minutes) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-lg text-center max-w-sm mx-4">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Analyzing your meal plan for prep opportunities...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-6 rounded-lg text-center max-w-sm w-full">
                    <div className="text-4xl mb-4">❌</div>
                    <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <div className="flex gap-2 justify-center">
                        <TouchEnhancedButton
                            onClick={() => generateSuggestions(true)}
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

    if (!suggestions) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white w-full h-full md:max-w-4xl md:max-h-[90vh] md:rounded-lg overflow-hidden shadow-2xl flex flex-col">
                {/* Compact Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold text-gray-900 truncate">
                            🍳 Meal Prep
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
                {suggestions.metrics && (
                    <div className="p-3 border-b border-gray-100 bg-gray-50">
                        <div className="grid grid-cols-4 gap-2">
                            <div className="bg-blue-50 p-2 rounded text-center">
                                <div className="text-sm font-bold text-blue-600">
                                    {formatTime(suggestions.metrics.totalPrepTime)}
                                </div>
                                <div className="text-xs text-blue-500">Prep Time</div>
                            </div>
                            <div className="bg-green-50 p-2 rounded text-center">
                                <div className="text-sm font-bold text-green-600">
                                    {formatTime(suggestions.metrics.timeSaved)}
                                </div>
                                <div className="text-xs text-green-500">Time Saved</div>
                            </div>
                            <div className="bg-yellow-50 p-2 rounded text-center">
                                <div className="text-sm font-bold text-yellow-600">
                                    {suggestions.metrics.efficiency}%
                                </div>
                                <div className="text-xs text-yellow-500">Efficiency</div>
                            </div>
                            <div className="bg-purple-50 p-2 rounded text-center">
                                <div className="text-sm font-bold text-purple-600">
                                    {suggestions.metrics.recipesAffected}
                                </div>
                                <div className="text-xs text-purple-500">Recipes</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Compact Tabs - Mobile Optimized - NO HORIZONTAL SCROLL */}
                <div className="border-b border-gray-200 bg-white">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
                        {[
                            { id: 'overview', label: 'Overview', icon: '📋', shortLabel: 'Info' },
                            { id: 'batch', label: 'Batch Cook', icon: '🍳', shortLabel: 'Batch' },
                            { id: 'prep', label: 'Prep Tasks', icon: '🔪', shortLabel: 'Prep' },
                            { id: 'schedule', label: 'Schedule', icon: '📅', shortLabel: 'Plan' }
                        ].map(tab => (
                            <TouchEnhancedButton
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-2 py-3 text-xs font-medium border-b-2 text-center ${
                                    activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-sm">{tab.icon}</span>
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    <span className="sm:hidden">{tab.shortLabel}</span>
                                </div>
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
                                    📊 Summary
                                </h3>
                                <p className="text-sm text-gray-700 mb-2">
                                    Found <strong>{suggestions.batchCookingSuggestions?.length || 0}</strong> batch cooking opportunities
                                    and <strong>{suggestions.ingredientPrepSuggestions?.length || 0}</strong> ingredient prep tasks.
                                </p>
                                <p className="text-xs text-gray-600">
                                    Total prep: <strong>{formatTime(suggestions.metrics.totalPrepTime)}</strong> •
                                    Time saved: <strong>{formatTime(suggestions.metrics.timeSaved)}</strong>
                                </p>
                            </div>

                            {suggestions.batchCookingSuggestions?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                        🍳 Top Batch Cooking
                                    </h4>
                                    <div className="space-y-3">
                                        {suggestions.batchCookingSuggestions.slice(0, 3).map((suggestion, index) => (
                                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h5 className="font-medium text-gray-900 mb-1">
                                                            {suggestion.totalAmount} {suggestion.ingredient}
                                                        </h5>
                                                        <p className="text-xs text-gray-600 mb-2">
                                                            Used in: {suggestion.recipes.join(', ')}
                                                        </p>
                                                        <p className="text-xs text-gray-700">
                                                            {suggestion.prepInstructions}
                                                        </p>
                                                    </div>
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs ml-2">
                                                        {formatTime(suggestion.estimatedPrepTime)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {suggestions.ingredientPrepSuggestions?.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                        🔪 Top Prep Tasks
                                    </h4>
                                    <div className="space-y-3">
                                        {suggestions.ingredientPrepSuggestions.slice(0, 3).map((suggestion, index) => (
                                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h5 className="font-medium text-gray-900 mb-1">
                                                            {suggestion.prepType} {suggestion.totalAmount} {suggestion.ingredient}
                                                        </h5>
                                                        <p className="text-xs text-gray-600 mb-2">
                                                            Used in: {suggestion.recipes.join(', ')}
                                                        </p>
                                                        <p className="text-xs text-gray-700">
                                                            {suggestion.prepInstructions}
                                                        </p>
                                                    </div>
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs ml-2">
                                                        {formatTime(suggestion.estimatedPrepTime)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'batch' && (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                🍳 Batch Cooking Suggestions
                            </h3>
                            {suggestions.batchCookingSuggestions?.length > 0 ? (
                                <div className="space-y-4">
                                    {suggestions.batchCookingSuggestions.map((suggestion, index) => (
                                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-semibold text-gray-900">
                                                    {suggestion.totalAmount} {suggestion.ingredient}
                                                </h4>
                                                <div className="text-xs text-gray-500 text-right">
                                                    <div>⏱️ {formatTime(suggestion.estimatedPrepTime)}</div>
                                                    <div>📊 {suggestion.difficulty}</div>
                                                    <div>🗓️ {suggestion.shelfLife}</div>
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <h5 className="text-sm font-medium text-gray-700 mb-1">Used in:</h5>
                                                <div className="flex flex-wrap gap-1">
                                                    {suggestion.recipes.map((recipe, idx) => (
                                                        <span key={idx} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                                            {recipe}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <h5 className="text-sm font-medium text-gray-700 mb-1">Instructions:</h5>
                                                <p className="text-sm text-gray-600">{suggestion.prepInstructions}</p>
                                            </div>

                                            <div>
                                                <h5 className="text-sm font-medium text-gray-700 mb-1">Storage:</h5>
                                                <p className="text-sm text-gray-600">{suggestion.storageInstructions}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="text-4xl mb-4">🍳</div>
                                    <p>No batch cooking opportunities found.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'prep' && (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                🔪 Ingredient Prep Tasks
                            </h3>
                            {suggestions.ingredientPrepSuggestions?.length > 0 ? (
                                <div className="space-y-4">
                                    {suggestions.ingredientPrepSuggestions.map((suggestion, index) => (
                                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-semibold text-gray-900">
                                                    {suggestion.prepType} {suggestion.totalAmount} {suggestion.ingredient}
                                                </h4>
                                                <span className="text-xs text-gray-500">
                                                    ⏱️ {formatTime(suggestion.estimatedPrepTime)}
                                                </span>
                                            </div>

                                            <div className="mb-3">
                                                <h5 className="text-sm font-medium text-gray-700 mb-1">Used in:</h5>
                                                <div className="flex flex-wrap gap-1">
                                                    {suggestion.recipes.map((recipe, idx) => (
                                                        <span key={idx} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                                            {recipe}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <h5 className="text-sm font-medium text-gray-700 mb-1">Instructions:</h5>
                                                <p className="text-sm text-gray-600">{suggestion.prepInstructions}</p>
                                            </div>

                                            <div>
                                                <h5 className="text-sm font-medium text-gray-700 mb-1">Storage:</h5>
                                                <p className="text-sm text-gray-600">{suggestion.storageMethod}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="text-4xl mb-4">🔪</div>
                                    <p>No ingredient prep tasks found.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                📅 Prep Schedule
                            </h3>
                            {suggestions.prepSchedule?.length > 0 ? (
                                <div className="space-y-4">
                                    {suggestions.prepSchedule.map((daySchedule, index) => (
                                        <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                            <div className="bg-gray-50 p-3 border-b border-gray-200">
                                                <h4 className="font-semibold text-gray-900">
                                                    {getDayName(daySchedule.day)}
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    {daySchedule.tasks.length} task{daySchedule.tasks.length !== 1 ? 's' : ''} •
                                                    {formatTime(daySchedule.tasks.reduce((total, task) => total + (task.estimatedTime || 0), 0))}
                                                </p>
                                            </div>
                                            <div className="p-3">
                                                <div className="space-y-3">
                                                    {daySchedule.tasks.map((task, taskIndex) => {
                                                        const taskId = `${daySchedule.day}-${taskIndex}`;
                                                        const isCompleted = completedTasks.has(taskId);

                                                        return (
                                                            <div
                                                                key={taskIndex}
                                                                className={`flex items-start gap-3 p-3 rounded-lg ${
                                                                    isCompleted ? 'bg-green-50' : 'bg-gray-50'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isCompleted}
                                                                    onChange={() => handleTaskComplete(taskId)}
                                                                    className="mt-1"
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span>{getTaskIcon(task.taskType)}</span>
                                                                        <h5 className={`font-medium text-gray-900 ${
                                                                            isCompleted ? 'line-through' : ''
                                                                        }`}>
                                                                            {task.description}
                                                                        </h5>
                                                                        <span
                                                                            className="px-2 py-1 rounded text-xs text-white"
                                                                            style={{ backgroundColor: getPriorityColor(task.priority) }}
                                                                        >
                                                                            {task.priority}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-sm text-gray-600">
                                                                        ⏱️ {formatTime(task.estimatedTime)}
                                                                        {task.equipment && task.equipment.length > 0 && (
                                                                            <span className="ml-2">🔧 {task.equipment.join(', ')}</span>
                                                                        )}
                                                                    </div>
                                                                    {task.ingredients && task.ingredients.length > 0 && (
                                                                        <div className="text-sm text-gray-600 mt-1">
                                                                            <strong>Ingredients:</strong> {task.ingredients.join(', ')}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="text-4xl mb-4">📅</div>
                                    <p>No prep schedule available.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Compact Footer */}
                <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        Completion: {suggestions.implementation?.completionRate || 0}%
                    </div>
                    <div className="flex gap-2">
                        <TouchEnhancedButton
                            onClick={() => generateSuggestions(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                        >
                            🔄 Regenerate
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