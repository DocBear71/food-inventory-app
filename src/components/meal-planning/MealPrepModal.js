// file: /src/components/meal-planning/MealPrepModal.js v1

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function MealPrepModal({ mealPlanId, mealPlanName, onClose }) {
    const { data: session } = useSession();
    const [mealPrepData, setMealPrepData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('suggestions');

    useEffect(() => {
        if (session?.user?.id && mealPlanId) {
            fetchMealPrepSuggestions();
        }
    }, [session?.user?.id, mealPlanId]);

    const fetchMealPrepSuggestions = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/meal-prep/${mealPlanId}`);
            const data = await response.json();

            if (data.success) {
                setMealPrepData(data);
            } else {
                setError(data.error || 'Failed to generate meal prep suggestions');
            }
        } catch (error) {
            console.error('Error fetching meal prep suggestions:', error);
            setError('Failed to load meal prep suggestions');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (minutes) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`;
    };

    const getDifficultyColor = (difficulty) => {
        const colors = {
            easy: '#10b981',
            medium: '#f59e0b',
            hard: '#ef4444'
        };
        return colors[difficulty?.toLowerCase()] || '#6b7280';
    };

    const getServingsColor = (servings) => {
        if (servings >= 8) return '#10b981'; // Green for high batch potential
        if (servings >= 4) return '#f59e0b'; // Amber for medium batch
        return '#6b7280'; // Gray for low batch
    };

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
                            🍱 Meal Prep Suggestions
                        </h2>
                        <p style={{
                            margin: '0.25rem 0 0 0',
                            fontSize: '0.875rem',
                            color: '#6b7280'
                        }}>
                            Batch cooking recommendations for: {mealPlanName}
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

                {/* Tabs */}
                <div style={{
                    padding: '0 1.5rem',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: '#f9fafb'
                }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[
                            { id: 'suggestions', label: 'Batch Suggestions', icon: '🍱' },
                            { id: 'schedule', label: 'Prep Schedule', icon: '📅' },
                            { id: 'tips', label: 'Prep Tips', icon: '💡' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '0.75rem 1rem',
                                    border: 'none',
                                    borderRadius: '6px 6px 0 0',
                                    backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                                    color: activeTab === tab.id ? '#111827' : '#6b7280',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    borderBottom: activeTab === tab.id ? '2px solid #f59e0b' : '2px solid transparent'
                                }}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    padding: '1.5rem',
                    overflow: 'auto'
                }}>
                    {loading ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3rem',
                            flexDirection: 'column',
                            gap: '1rem'
                        }}>
                            <div style={{
                                width: '2rem',
                                height: '2rem',
                                border: '3px solid #e5e7eb',
                                borderTop: '3px solid #f59e0b',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <p style={{ color: '#6b7280' }}>Analyzing your meal plan for batch cooking opportunities...</p>
                        </div>
                    ) : error ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem',
                            color: '#ef4444'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                            <p>{error}</p>
                            <button
                                onClick={fetchMealPrepSuggestions}
                                style={{
                                    marginTop: '1rem',
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'suggestions' && (
                                <BatchSuggestionsTab
                                    data={mealPrepData}
                                    formatTime={formatTime}
                                    getDifficultyColor={getDifficultyColor}
                                    getServingsColor={getServingsColor}
                                />
                            )}
                            {activeTab === 'schedule' && (
                                <PrepScheduleTab
                                    data={mealPrepData}
                                    formatTime={formatTime}
                                />
                            )}
                            {activeTab === 'tips' && (
                                <PrepTipsTab data={mealPrepData} />
                            )}
                        </>
                    )}
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

// Batch Suggestions Tab Component
function BatchSuggestionsTab({ data, formatTime, getDifficultyColor, getServingsColor }) {
    if (!data?.batchSuggestions) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍱</div>
                <p>No batch cooking suggestions available for this meal plan.</p>
            </div>
        );
    }

    const { highBatchPotential, mediumBatchPotential, batchableIngredients } = data.batchSuggestions;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Summary Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem'
            }}>
                <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>
                        {highBatchPotential?.length || 0}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#166534' }}>High Batch Potential</div>
                </div>
                <div style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fed7aa',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>
                        {mediumBatchPotential?.length || 0}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#92400e' }}>Medium Batch Potential</div>
                </div>
                <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#475569' }}>
                        {batchableIngredients?.length || 0}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#334155' }}>Batchable Ingredients</div>
                </div>
            </div>

            {/* High Batch Potential Recipes */}
            {highBatchPotential && highBatchPotential.length > 0 && (
                <div>
                    <h3 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: '#111827',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        🏆 High Batch Potential Recipes
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1rem'
                    }}>
                        {highBatchPotential.map((recipe, index) => (
                            <RecipeCard
                                key={index}
                                recipe={recipe}
                                formatTime={formatTime}
                                getDifficultyColor={getDifficultyColor}
                                getServingsColor={getServingsColor}
                                priority="high"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Medium Batch Potential Recipes */}
            {mediumBatchPotential && mediumBatchPotential.length > 0 && (
                <div>
                    <h3 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: '#111827',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        🥈 Medium Batch Potential Recipes
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1rem'
                    }}>
                        {mediumBatchPotential.map((recipe, index) => (
                            <RecipeCard
                                key={index}
                                recipe={recipe}
                                formatTime={formatTime}
                                getDifficultyColor={getDifficultyColor}
                                getServingsColor={getServingsColor}
                                priority="medium"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Batchable Ingredients */}
            {batchableIngredients && batchableIngredients.length > 0 && (
                <div>
                    <h3 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: '#111827',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        🥕 Ingredients Perfect for Batch Prep
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '1rem'
                    }}>
                        {batchableIngredients.map((ingredient, index) => (
                            <div key={index} style={{
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '1rem'
                            }}>
                                <h4 style={{
                                    margin: '0 0 0.5rem 0',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: '#111827'
                                }}>
                                    {ingredient.name}
                                </h4>
                                <p style={{
                                    margin: '0 0 0.5rem 0',
                                    fontSize: '0.875rem',
                                    color: '#6b7280'
                                }}>
                                    Used in {ingredient.recipeCount} recipes
                                </p>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#374151',
                                    backgroundColor: '#f1f5f9',
                                    padding: '0.5rem',
                                    borderRadius: '4px',
                                    marginTop: '0.5rem'
                                }}>
                                    💡 {ingredient.batchTip}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Recipe Card Component
function RecipeCard({ recipe, formatTime, getDifficultyColor, getServingsColor, priority }) {
    const borderColor = priority === 'high' ? '#10b981' : '#f59e0b';
    const bgColor = priority === 'high' ? '#f0fdf4' : '#fffbeb';

    return (
        <div style={{
            backgroundColor: bgColor,
            border: `2px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '1.5rem',
            transition: 'transform 0.2s, box-shadow 0.2s'
        }}
             onMouseEnter={(e) => {
                 e.currentTarget.style.transform = 'translateY(-2px)';
                 e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
             }}
             onMouseLeave={(e) => {
                 e.currentTarget.style.transform = 'translateY(0)';
                 e.currentTarget.style.boxShadow = 'none';
             }}>
            <h4 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827'
            }}>
                {recipe.title}
            </h4>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                marginBottom: '1rem'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: getServingsColor(recipe.servings)
                    }}>
                        {recipe.servings}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Servings</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: '#111827'
                    }}>
                        {formatTime(recipe.totalTime || recipe.prepTime + recipe.cookTime)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Time</div>
                </div>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
            }}>
                <span style={{
                    backgroundColor: getDifficultyColor(recipe.difficulty),
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                }}>
                    {recipe.difficulty || 'Medium'}
                </span>
                <span style={{
                    backgroundColor: '#e2e8f0',
                    color: '#475569',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem'
                }}>
                    Batch Score: {recipe.batchScore || 'N/A'}
                </span>
            </div>

            {recipe.batchTips && recipe.batchTips.length > 0 && (
                <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    marginTop: '1rem'
                }}>
                    <h5 style={{
                        margin: '0 0 0.5rem 0',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#111827'
                    }}>
                        💡 Batch Cooking Tips:
                    </h5>
                    <ul style={{
                        margin: 0,
                        paddingLeft: '1rem',
                        fontSize: '0.875rem',
                        color: '#374151'
                    }}>
                        {recipe.batchTips.map((tip, index) => (
                            <li key={index} style={{ marginBottom: '0.25rem' }}>{tip}</li>
                        ))}
                    </ul>
                </div>
            )}

            {recipe.freezerFriendly && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '4px'
                }}>
                    <span style={{ fontSize: '1rem' }}>❄️</span>
                    <span style={{
                        fontSize: '0.875rem',
                        color: '#1e40af',
                        fontWeight: '500'
                    }}>
                        Freezer Friendly
                    </span>
                </div>
            )}
        </div>
    );
}

// Prep Schedule Tab Component
function PrepScheduleTab({ data, formatTime }) {
    if (!data?.prepSchedule) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                <p>No prep schedule available.</p>
            </div>
        );
    }

    const { recommended, dayByDay } = data.prepSchedule;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Recommended Prep Day */}
            {recommended && (
                <div style={{
                    backgroundColor: '#f0f9ff',
                    border: '2px solid #0ea5e9',
                    borderRadius: '8px',
                    padding: '1.5rem'
                }}>
                    <h3 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#0c4a6e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        ⭐ Recommended Prep Day: {recommended.day}
                    </h3>
                    <p style={{
                        margin: '0 0 1rem 0',
                        fontSize: '0.875rem',
                        color: '#075985'
                    }}>
                        Total prep time: {formatTime(recommended.totalTime)} |
                        {recommended.tasks.length} tasks
                    </p>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '1rem'
                    }}>
                        {recommended.tasks.map((task, index) => (
                            <div key={index} style={{
                                backgroundColor: 'white',
                                border: '1px solid #bae6fd',
                                borderRadius: '6px',
                                padding: '1rem'
                            }}>
                                <h4 style={{
                                    margin: '0 0 0.5rem 0',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: '#111827'
                                }}>
                                    {task.task}
                                </h4>
                                <p style={{
                                    margin: '0 0 0.5rem 0',
                                    fontSize: '0.875rem',
                                    color: '#6b7280'
                                }}>
                                    {formatTime(task.time)} | {task.recipes.join(', ')}
                                </p>
                                {task.tip && (
                                    <p style={{
                                        margin: '0.5rem 0 0 0',
                                        fontSize: '0.75rem',
                                        color: '#374151',
                                        fontStyle: 'italic'
                                    }}>
                                        💡 {task.tip}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Day-by-Day Schedule */}
            {dayByDay && Object.keys(dayByDay).length > 0 && (
                <div>
                    <h3 style={{
                        margin: '0 0 1.5rem 0',
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#111827'
                    }}>
                        📅 Weekly Prep Schedule
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1rem'
                    }}>
                        {Object.entries(dayByDay).map(([day, schedule]) => (
                            <div key={day} style={{
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '1.5rem'
                            }}>
                                <h4 style={{
                                    margin: '0 0 1rem 0',
                                    fontSize: '1.125rem',
                                    fontWeight: '600',
                                    color: '#111827',
                                    textTransform: 'capitalize'
                                }}>
                                    {day}
                                </h4>
                                {schedule.tasks.map((task, index) => (
                                    <div key={index} style={{
                                        backgroundColor: 'white',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        padding: '0.75rem',
                                        marginBottom: '0.5rem'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '0.25rem'
                                        }}>
                                            <span style={{
                                                fontSize: '0.875rem',
                                                fontWeight: '500',
                                                color: '#111827'
                                            }}>
                                                {task.task}
                                            </span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                color: '#6b7280'
                                            }}>
                                                {formatTime(task.time)}
                                            </span>
                                        </div>
                                        <p style={{
                                            margin: 0,
                                            fontSize: '0.75rem',
                                            color: '#374151'
                                        }}>
                                            {task.recipes.join(', ')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Prep Tips Tab Component
function PrepTipsTab({ data }) {
    const generalTips = [
        {
            category: "🥄 Ingredient Prep",
            tips: [
                "Wash, chop, and store vegetables at the beginning of the week",
                "Cook grains and proteins in bulk and refrigerate in portions",
                "Pre-mix dry spice blends and store in labeled containers",
                "Freeze herbs in oil or water for easy use later"
            ]
        },
        {
            category: "🍱 Storage Solutions",
            tips: [
                "Use glass containers for better food preservation",
                "Label everything with contents and date",
                "Store proteins and vegetables separately when possible",
                "Use vacuum-sealed bags for freezer storage"
            ]
        },
        {
            category: "⏰ Time Management",
            tips: [
                "Start with longest cooking items first",
                "Use multiple cooking methods simultaneously (oven + stovetop)",
                "Prep ingredients while other items cook",
                "Clean as you go to save time later"
            ]
        },
        {
            category: "❄️ Freezer Tips",
            tips: [
                "Cool foods completely before freezing",
                "Use freezer-safe containers with tight lids",
                "Leave space for food expansion when freezing",
                "Thaw overnight in refrigerator for best results"
            ]
        }
    ];

    const specificTips = data?.prepTips || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Specific Tips for This Meal Plan */}
            {specificTips.length > 0 && (
                <div>
                    <h3 style={{
                        margin: '0 0 1.5rem 0',
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#111827'
                    }}>
                        🎯 Tips for Your Meal Plan
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1rem'
                    }}>
                        {specificTips.map((tip, index) => (
                            <div key={index} style={{
                                backgroundColor: '#fef3c7',
                                border: '2px solid #f59e0b',
                                borderRadius: '8px',
                                padding: '1.5rem'
                            }}>
                                <h4 style={{
                                    margin: '0 0 0.75rem 0',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: '#92400e'
                                }}>
                                    {tip.title}
                                </h4>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.875rem',
                                    color: '#78350f',
                                    lineHeight: '1.5'
                                }}>
                                    {tip.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* General Meal Prep Tips */}
            <div>
                <h3 style={{
                    margin: '0 0 1.5rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#111827'
                }}>
                    💡 General Meal Prep Tips
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {generalTips.map((section, index) => (
                        <div key={index} style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '1.5rem'
                        }}>
                            <h4 style={{
                                margin: '0 0 1rem 0',
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                color: '#111827'
                            }}>
                                {section.category}
                            </h4>
                            <ul style={{
                                margin: 0,
                                paddingLeft: '1rem',
                                fontSize: '0.875rem',
                                color: '#374151',
                                lineHeight: '1.6'
                            }}>
                                {section.tips.map((tip, tipIndex) => (
                                    <li key={tipIndex} style={{ marginBottom: '0.5rem' }}>
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Equipment Recommendations */}
            <div style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '1.5rem'
            }}>
                <h3 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#0c4a6e'
                }}>
                    🔧 Recommended Equipment
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '1rem'
                }}>
                    {[
                        { item: 'Glass Food Storage Containers', reason: 'Better preservation, microwave safe' },
                        { item: 'Sharp Chef\'s Knife', reason: 'Faster, safer chopping' },
                        { item: 'Large Cutting Board', reason: 'More space for batch prep' },
                        { item: 'Sheet Pans', reason: 'Batch roasting vegetables and proteins' },
                        { item: 'Slow Cooker/Instant Pot', reason: 'Hands-off cooking for large batches' },
                        { item: 'Food Scale', reason: 'Accurate portion control' }
                    ].map((equipment, index) => (
                        <div key={index} style={{
                            backgroundColor: 'white',
                            border: '1px solid #bae6fd',
                            borderRadius: '6px',
                            padding: '1rem'
                        }}>
                            <h5 style={{
                                margin: '0 0 0.5rem 0',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#111827'
                            }}>
                                {equipment.item}
                            </h5>
                            <p style={{
                                margin: 0,
                                fontSize: '0.75rem',
                                color: '#374151'
                            }}>
                                {equipment.reason}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}