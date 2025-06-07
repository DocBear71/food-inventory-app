// file: /src/components/nutrition/WeeklyNutritionDashboard.js v1

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

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
                fetch('/api/nutrition/goals'),
                fetch(`/api/nutrition/analyze?mealPlanId=${mealPlanId}`)
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
            const response = await fetch('/api/nutrition/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ mealPlanId }),
            });

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
            excellent: '#10b981',  // green
            good: '#06b6d4',       // cyan
            warning: '#f59e0b',    // amber
            under: '#ef4444',      // red
            over: '#f97316'        // orange
        };
        return colors[status] || '#6b7280';
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
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                        width: `${width}%`,
                        backgroundColor: getStatusColor(status)
                    }}
                />
            </div>
        );
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
                    <p style={{ color: '#6b7280' }}>Analyzing your weekly nutrition...</p>
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
                    <h3 style={{ margin: '0 0 1rem 0', color: '#dc2626' }}>Analysis Error</h3>
                    <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280' }}>{error}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                            onClick={() => generateAnalysis()}
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

    if (!analysis) return null;

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
                maxWidth: '1000px',
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
                            📊 Weekly Nutrition Overview
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

                {/* Nutrition Score Card */}
                {analysis.nutritionScore !== undefined && (
                    <div style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: '#f9fafb'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1rem'
                        }}>
                            <div style={{
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '3rem',
                                    fontWeight: 'bold',
                                    color: analysis.nutritionScore >= 80 ? '#10b981' : analysis.nutritionScore >= 60 ? '#f59e0b' : '#ef4444'
                                }}>
                                    {analysis.nutritionScore}
                                </div>
                                <div style={{
                                    fontSize: '0.875rem',
                                    color: '#6b7280',
                                    marginTop: '0.25rem'
                                }}>
                                    Nutrition Score
                                </div>
                            </div>
                            <div style={{
                                textAlign: 'center',
                                borderLeft: '1px solid #e5e7eb',
                                paddingLeft: '1rem'
                            }}>
                                <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold',
                                    color: '#374151'
                                }}>
                                    {analysis.weeklyNutrition.daysWithMeals}/7
                                </div>
                                <div style={{
                                    fontSize: '0.875rem',
                                    color: '#6b7280',
                                    marginTop: '0.25rem'
                                }}>
                                    Days Planned
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
                        { id: 'overview', label: 'Overview', icon: '📊' },
                        { id: 'daily', label: 'Daily Breakdown', icon: '📅' },
                        { id: 'insights', label: 'Insights', icon: '💡' },
                        { id: 'goals', label: 'Goals', icon: '🎯' }
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
                                    📈 Weekly Averages vs Goals
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                                    {analysis.goalComparison && Object.entries(analysis.goalComparison).map(([nutrient, comp]) => (
                                        <div key={nutrient} style={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '1rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <div style={{ fontWeight: '500', color: '#111827', textTransform: 'capitalize' }}>
                                                    {nutrient}
                                                </div>
                                                <div style={{ fontSize: '1.25rem' }}>
                                                    {getStatusIcon(comp.status)}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                                                    {formatNutrientValue(comp.actual)}{comp.unit}
                                                </span>
                                                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                    Goal: {formatNutrientValue(comp.goal)}{comp.unit}
                                                </span>
                                            </div>
                                            {renderProgressBar(comp.percentage, comp.status)}
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                                                <span style={{ color: getStatusColor(comp.status), fontWeight: '500' }}>
                                                    {comp.percentage}% of goal
                                                </span>
                                                {comp.difference !== 0 && (
                                                    <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                                                        ({comp.difference > 0 ? '+' : ''}{formatNutrientValue(comp.difference)}{comp.unit})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'daily' && (
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                                📅 Daily Nutrition Breakdown
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {analysis.dailyNutrition && Object.entries(analysis.dailyNutrition).map(([day, dayData]) => (
                                    <div key={day} style={{
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
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h4 style={{ margin: '0', fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                                                    {getDayName(day)}
                                                </h4>
                                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                    {dayData.mealCount} meal{dayData.mealCount !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ padding: '1rem' }}>
                                            {dayData.mealCount > 0 ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>
                                                            {formatNutrientValue(dayData.calories?.value)}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Calories</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>
                                                            {formatNutrientValue(dayData.protein?.value)}g
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Protein</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>
                                                            {formatNutrientValue(dayData.carbs?.value)}g
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Carbs</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>
                                                            {formatNutrientValue(dayData.fat?.value)}g
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Fat</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Highlights */}
                            {analysis.insights?.highlights?.length > 0 && (
                                <div>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                                        🌟 Highlights
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {analysis.insights.highlights.map((highlight, index) => (
                                            <div key={index} style={{
                                                backgroundColor: '#f0fdf4',
                                                border: '1px solid #bbf7d0',
                                                borderRadius: '8px',
                                                padding: '1rem',
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '0.75rem'
                                            }}>
                                                <span style={{ fontSize: '1.25rem' }}>{highlight.icon}</span>
                                                <p style={{ margin: '0', color: '#166534', fontSize: '0.875rem' }}>
                                                    {highlight.message}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Concerns */}
                            {analysis.insights?.concerns?.length > 0 && (
                                <div>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                                        ⚠️ Areas for Improvement
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {analysis.insights.concerns.map((concern, index) => (
                                            <div key={index} style={{
                                                backgroundColor: concern.priority === 'high' ? '#fef2f2' : '#fffbeb',
                                                border: concern.priority === 'high' ? '1px solid #fecaca' : '1px solid #fed7aa',
                                                borderRadius: '8px',
                                                padding: '1rem',
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '0.75rem'
                                            }}>
                                                <span style={{ fontSize: '1.25rem' }}>{concern.icon}</span>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{
                                                        margin: '0',
                                                        color: concern.priority === 'high' ? '#dc2626' : '#d97706',
                                                        fontSize: '0.875rem'
                                                    }}>
                                                        {concern.message}
                                                    </p>
                                                    {concern.priority === 'high' && (
                                                        <div style={{
                                                            marginTop: '0.5rem',
                                                            padding: '0.25rem 0.5rem',
                                                            backgroundColor: '#dc2626',
                                                            color: 'white',
                                                            borderRadius: '4px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '500',
                                                            display: 'inline-block'
                                                        }}>
                                                            High Priority
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            {analysis.insights?.recommendations?.length > 0 && (
                                <div>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                                        💡 Recommendations
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {analysis.insights.recommendations.map((rec, index) => (
                                            <div key={index} style={{
                                                backgroundColor: '#f0f9ff',
                                                border: '1px solid #bae6fd',
                                                borderRadius: '8px',
                                                padding: '1rem'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                    <h4 style={{ margin: '0', fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', textTransform: 'capitalize' }}>
                                                        {rec.category}
                                                    </h4>
                                                    <span style={{
                                                        padding: '0.125rem 0.5rem',
                                                        backgroundColor: rec.difficulty === 'easy' ? '#10b981' : rec.difficulty === 'moderate' ? '#f59e0b' : '#ef4444',
                                                        color: 'white',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        {rec.difficulty}
                                                    </span>
                                                </div>
                                                <p style={{ margin: '0 0 0.5rem 0', color: '#075985', fontSize: '0.875rem' }}>
                                                    {rec.suggestion}
                                                </p>
                                                <p style={{ margin: '0', color: '#0891b2', fontSize: '0.75rem', fontStyle: 'italic' }}>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0', color: '#111827' }}>
                                    🎯 Nutrition Goals
                                </h3>
                                <button
                                    onClick={() => setShowGoalsEditor(!showGoalsEditor)}
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
                                    {showGoalsEditor ? 'View Goals' : 'Edit Goals'}
                                </button>
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
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    {goals && Object.entries(goals).map(([key, value]) => (
                                        <div key={key} style={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            textAlign: 'center'
                                        }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.25rem' }}>
                                                {value}{key === 'dailyCalories' ? ' kcal' : key === 'sodium' ? ' mg' : ' g'}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize' }}>
                                                {key === 'dailyCalories' ? 'Daily Calories' : key}
                                            </div>
                                        </div>
                                    ))}
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
                        Last analyzed: {new Date(analysis.generatedAt).toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={generateAnalysis}
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
                            🔄 Refresh Analysis
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

// Simple Goals Editor Component
function GoalsEditor({ goals, onUpdate }) {
    const [formData, setFormData] = useState(goals || {});
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/nutrition/goals', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

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
            const response = await fetch('/api/nutrition/goals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

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
        <div style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                        Edit Nutrition Goals
                    </h4>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                        Set your daily nutrition targets. These will be used to evaluate your meal plans.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    {[
                        { key: 'dailyCalories', label: 'Daily Calories', unit: 'kcal', description: 'Total daily calorie target' },
                        { key: 'protein', label: 'Protein', unit: 'g', description: 'Daily protein goal in grams' },
                        { key: 'carbs', label: 'Carbohydrates', unit: 'g', description: 'Daily carb goal in grams' },
                        { key: 'fat', label: 'Fat', unit: 'g', description: 'Daily fat goal in grams' },
                        { key: 'fiber', label: 'Fiber', unit: 'g', description: 'Daily fiber goal in grams' },
                        { key: 'sodium', label: 'Sodium', unit: 'mg', description: 'Daily sodium limit in milligrams' }
                    ].map(({ key, label, unit, description }) => (
                        <div key={key} style={{
                            backgroundColor: 'white',
                            padding: '1rem',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb'
                        }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#111827',
                                marginBottom: '0.25rem'
                            }}>
                                {label}
                            </label>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.5rem'
                            }}>
                                <input
                                    type="number"
                                    min="0"
                                    step={unit === 'kcal' ? '50' : unit === 'mg' ? '100' : '1'}
                                    value={formData[key] || ''}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '0.5rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem'
                                    }}
                                    placeholder="0"
                                />
                                <span style={{
                                    fontSize: '0.75rem',
                                    color: '#6b7280',
                                    fontWeight: '500',
                                    minWidth: '30px'
                                }}>
                                    {unit}
                                </span>
                            </div>
                            <p style={{
                                margin: '0',
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                lineHeight: '1.3'
                            }}>
                                {description}
                            </p>
                        </div>
                    ))}
                </div>

                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    paddingTop: '1rem',
                    borderTop: '1px solid #e5e7eb'
                }}>
                    <button
                        type="button"
                        onClick={resetToDefaults}
                        disabled={loading}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.75rem 1rem',
                            fontSize: '0.875rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        Reset to Defaults
                    </button>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.75rem 1.5rem',
                            fontSize: '0.875rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            fontWeight: '500'
                        }}
                    >
                        {loading ? 'Updating...' : 'Update Goals'}
                    </button>
                </div>
            </form>

            {/* Helpful Guidelines */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px'
            }}>
                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#1e40af' }}>
                    💡 Nutrition Guidelines
                </h5>
                <div style={{ fontSize: '0.75rem', color: '#1e3a8a', lineHeight: '1.4' }}>
                    <p style={{ margin: '0 0 0.5rem 0' }}>
                        <strong>General recommendations for adults:</strong>
                    </p>
                    <ul style={{ margin: '0', paddingLeft: '1rem' }}>
                        <li>Calories: 1,800-2,400 (varies by age, sex, activity level)</li>
                        <li>Protein: 0.8-1.2g per kg body weight</li>
                        <li>Carbs: 45-65% of total calories</li>
                        <li>Fat: 20-35% of total calories</li>
                        <li>Fiber: 25-35g per day</li>
                        <li>Sodium: Less than 2,300mg per day</li>
                    </ul>
                    <p style={{ margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>
                        Consult with a healthcare provider for personalized nutrition advice.
                    </p>
                </div>
            </div>
        </div>
    );
}