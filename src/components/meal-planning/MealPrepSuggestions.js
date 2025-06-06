// file: /src/components/meal-planning/MealPrepSuggestions.js v1

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function MealPrepSuggestions({ mealPlanId, mealPlanName, onClose }) {
    const { data: session } = useSession();
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
            const response = await fetch(`/api/meal-prep/generate?mealPlanId=${mealPlanId}`);
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
            const response = await fetch('/api/meal-prep/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mealPlanId,
                    userPreferences,
                    regenerate
                }),
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
            const response = await fetch(`/api/meal-prep/${suggestions._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'markTaskComplete',
                    taskId
                }),
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
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    textAlign: 'center',
                    maxWidth: '400px'
                }}>
                    <div style={{
                        width: '3rem',
                        height: '3rem',
                        border: '4px solid #e5e7eb',
                        borderTop: '4px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
                    <p style={{ color: '#6b7280' }}>Analyzing your meal plan for prep opportunities...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    textAlign: 'center',
                    maxWidth: '400px'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#dc2626' }}>Error</h3>
                    <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280' }}>{error}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                            onClick={() => generateSuggestions(true)}
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.75rem 1rem',
                                cursor: 'pointer'
                            }}
                        >
                            Try Again
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.75rem 1rem',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!suggestions) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '900px',
                maxHeight: '90vh',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#111827'
                        }}>
                            🍳 Meal Prep Suggestions
                        </h2>
                        <p style={{
                            margin: '0.25rem 0 0 0',
                            fontSize: '0.875rem',
                            color: '#6b7280'
                        }}>
                            {mealPlanName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: '#6b7280',
                            padding: '0.25rem'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Summary Cards */}
                {suggestions.metrics && (
                    <div style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #f3f4f6'
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                            gap: '1rem'
                        }}>
                            <div style={{
                                backgroundColor: '#f0f9ff',
                                padding: '1rem',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0369a1' }}>
                                    {formatTime(suggestions.metrics.totalPrepTime)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.25rem' }}>
                                    Total Prep Time
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: '#f0fdf4',
                                padding: '1rem',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#15803d' }}>
                                    {formatTime(suggestions.metrics.timeSaved)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>
                                    Time Saved
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: '#fef3c7',
                                padding: '1rem',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706' }}>
                                    {suggestions.metrics.efficiency}%
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                                    Efficiency
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: '#f3e8ff',
                                padding: '1rem',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7c3aed' }}>
                                    {suggestions.metrics.recipesAffected}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '0.25rem' }}>
                                    Recipes Affected
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div style={{
                    padding: '0 1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    gap: '1rem'
                }}>
                    {[
                        { id: 'overview', label: 'Overview', icon: '📋' },
                        { id: 'batch', label: 'Batch Cooking', icon: '🍳' },
                        { id: 'prep', label: 'Ingredient Prep', icon: '🔪' },
                        { id: 'schedule', label: 'Schedule', icon: '📅' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '1rem 0',
                                border: 'none',
                                background: 'none',
                                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                                fontWeight: activeTab === tab.id ? '600' : '400',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    padding: '1.5rem',
                    overflow: 'auto'
                }}>
                    {activeTab === 'overview' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                                    📊 Meal Prep Summary
                                </h3>
                                <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                                    <p style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>
                                        Based on your meal plan, we found <strong>{suggestions.batchCookingSuggestions?.length || 0}</strong> batch cooking opportunities
                                        and <strong>{suggestions.ingredientPrepSuggestions?.length || 0}</strong> ingredient prep tasks that could save you time during the week.
                                    </p>
                                    <p style={{ margin: '0', color: '#6b7280' }}>
                                        Total prep time: <strong>{formatTime(suggestions.metrics.totalPrepTime)}</strong> •
                                        Estimated time saved: <strong>{formatTime(suggestions.metrics.timeSaved)}</strong>
                                    </p>
                                </div>
                            </div>

                            {suggestions.batchCookingSuggestions?.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#111827' }}>
                                        🍳 Top Batch Cooking Opportunities
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {suggestions.batchCookingSuggestions.slice(0, 3).map((suggestion, index) => (
                                            <div key={index} style={{
                                                backgroundColor: 'white',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                padding: '1rem'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <h5 style={{ margin: '0 0 0.25rem 0', fontWeight: '600', color: '#111827' }}>
                                                            {suggestion.totalAmount} {suggestion.ingredient}
                                                        </h5>
                                                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                                                            Used in: {suggestion.recipes.join(', ')}
                                                        </p>
                                                        <p style={{ margin: '0', fontSize: '0.875rem', color: '#374151' }}>
                                                            {suggestion.prepInstructions}
                                                        </p>
                                                    </div>
                                                    <div style={{
                                                        backgroundColor: '#f3f4f6',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        color: '#6b7280'
                                                    }}>
                                                        {formatTime(suggestion.estimatedPrepTime)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {suggestions.ingredientPrepSuggestions?.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#111827' }}>
                                        🔪 Top Ingredient Prep Tasks
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {suggestions.ingredientPrepSuggestions.slice(0, 3).map((suggestion, index) => (
                                            <div key={index} style={{
                                                backgroundColor: 'white',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                padding: '1rem'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <h5 style={{ margin: '0 0 0.25rem 0', fontWeight: '600', color: '#111827' }}>
                                                            {suggestion.prepType} {suggestion.totalAmount} {suggestion.ingredient}
                                                        </h5>
                                                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                                                            Used in: {suggestion.recipes.join(', ')}
                                                        </p>
                                                        <p style={{ margin: '0', fontSize: '0.875rem', color: '#374151' }}>
                                                            {suggestion.prepInstructions}
                                                        </p>
                                                    </div>
                                                    <div style={{
                                                        backgroundColor: '#f3f4f6',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        color: '#6b7280'
                                                    }}>
                                                        {formatTime(suggestion.estimatedPrepTime)}
                                                    </div>
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
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                                🍳 Batch Cooking Suggestions
                            </h3>
                            {suggestions.batchCookingSuggestions?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {suggestions.batchCookingSuggestions.map((suggestion, index) => (
                                        <div key={index} style={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '1.5rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <div>
                                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                                                        {suggestion.totalAmount} {suggestion.ingredient}
                                                    </h4>
                                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                                        <span>⏱️ {formatTime(suggestion.estimatedPrepTime)}</span>
                                                        <span>📊 {suggestion.difficulty}</span>
                                                        <span>🗓️ {suggestion.shelfLife}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ marginBottom: '1rem' }}>
                                                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                                                    Used in these recipes:
                                                </h5>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {suggestion.recipes.map((recipe, idx) => (
                                                        <span key={idx} style={{
                                                            backgroundColor: '#f3f4f6',
                                                            padding: '0.25rem 0.75rem',
                                                            borderRadius: '4px',
                                                            fontSize: '0.75rem',
                                                            color: '#6b7280'
                                                        }}>
                                                            {recipe}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div style={{ marginBottom: '1rem' }}>
                                                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                                                    Instructions:
                                                </h5>
                                                <p style={{ margin: '0', fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                                                    {suggestion.prepInstructions}
                                                </p>
                                            </div>

                                            <div>
                                                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                                                    Storage:
                                                </h5>
                                                <p style={{ margin: '0', fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                                                    {suggestion.storageInstructions}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍳</div>
                                    <p>No batch cooking opportunities found for this meal plan.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'prep' && (
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                                🔪 Ingredient Prep Tasks
                            </h3>
                            {suggestions.ingredientPrepSuggestions?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {suggestions.ingredientPrepSuggestions.map((suggestion, index) => (
                                        <div key={index} style={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '1.5rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <div>
                                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                                                        {suggestion.prepType} {suggestion.totalAmount} {suggestion.ingredient}
                                                    </h4>
                                                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                        ⏱️ {formatTime(suggestion.estimatedPrepTime)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ marginBottom: '1rem' }}>
                                                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                                                    Used in these recipes:
                                                </h5>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {suggestion.recipes.map((recipe, idx) => (
                                                        <span key={idx} style={{
                                                            backgroundColor: '#f3f4f6',
                                                            padding: '0.25rem 0.75rem',
                                                            borderRadius: '4px',
                                                            fontSize: '0.75rem',
                                                            color: '#6b7280'
                                                        }}>
                                                            {recipe}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div style={{ marginBottom: '1rem' }}>
                                                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                                                    Instructions:
                                                </h5>
                                                <p style={{ margin: '0', fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                                                    {suggestion.prepInstructions}
                                                </p>
                                            </div>

                                            <div>
                                                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                                                    Storage:
                                                </h5>
                                                <p style={{ margin: '0', fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                                                    {suggestion.storageMethod}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔪</div>
                                    <p>No ingredient prep tasks found for this meal plan.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                                📅 Prep Schedule
                            </h3>
                            {suggestions.prepSchedule?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {suggestions.prepSchedule.map((daySchedule, index) => (
                                        <div key={index} style={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                backgroundColor: '#f9fafb',
                                                padding: '1rem',
                                                borderBottom: '1px solid #e5e7eb'
                                            }}>
                                                <h4 style={{ margin: '0', fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                                                    {getDayName(daySchedule.day)}
                                                </h4>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                                                    {daySchedule.tasks.length} task{daySchedule.tasks.length !== 1 ? 's' : ''} •
                                                    Total time: {formatTime(daySchedule.tasks.reduce((total, task) => total + (task.estimatedTime || 0), 0))}
                                                </p>
                                            </div>
                                            <div style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {daySchedule.tasks.map((task, taskIndex) => {
                                                        const taskId = `${daySchedule.day}-${taskIndex}`;
                                                        const isCompleted = completedTasks.has(taskId);

                                                        return (
                                                            <div key={taskIndex} style={{
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                gap: '1rem',
                                                                padding: '1rem',
                                                                backgroundColor: isCompleted ? '#f0fdf4' : '#f9fafb',
                                                                borderRadius: '6px',
                                                                opacity: isCompleted ? 0.7 : 1
                                                            }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isCompleted}
                                                                    onChange={() => handleTaskComplete(taskId)}
                                                                    style={{
                                                                        marginTop: '0.125rem',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                />
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                                        <span style={{ fontSize: '1rem' }}>{getTaskIcon(task.taskType)}</span>
                                                                        <h5 style={{
                                                                            margin: '0',
                                                                            fontSize: '1rem',
                                                                            fontWeight: '600',
                                                                            color: '#111827',
                                                                            textDecoration: isCompleted ? 'line-through' : 'none'
                                                                        }}>
                                                                            {task.description}
                                                                        </h5>
                                                                        <div style={{
                                                                            backgroundColor: getPriorityColor(task.priority),
                                                                            color: 'white',
                                                                            padding: '0.125rem 0.5rem',
                                                                            borderRadius: '4px',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: '500'
                                                                        }}>
                                                                            {task.priority}
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                                                        <span>⏱️ {formatTime(task.estimatedTime)}</span>
                                                                        {task.equipment && task.equipment.length > 0 && (
                                                                            <span>🔧 {task.equipment.join(', ')}</span>
                                                                        )}
                                                                    </div>
                                                                    {task.ingredients && task.ingredients.length > 0 && (
                                                                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
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
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                                    <p>No prep schedule available for this meal plan.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Completion: {suggestions.implementation?.completionRate || 0}%
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={() => generateSuggestions(true)}
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                cursor: 'pointer'
                            }}
                        >
                            🔄 Regenerate
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                backgroundColor: '#374151',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}