// file: /src/components/meal-planning/MealPlanTemplateLibrary.js v1

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function MealPlanTemplateLibrary({
                                                    mealPlanId,
                                                    mealPlanName,
                                                    onClose,
                                                    onTemplateApplied
                                                }) {
    const { data: session } = useSession();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('my-templates');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState(null);

    const categories = [
        { value: 'all', label: 'All Categories' },
        { value: 'family', label: 'Family Favorites' },
        { value: 'healthy', label: 'Healthy Eating' },
        { value: 'quick', label: 'Quick & Easy' },
        { value: 'budget', label: 'Budget Friendly' },
        { value: 'vegetarian', label: 'Vegetarian' },
        { value: 'keto', label: 'Keto' },
        { value: 'custom', label: 'Custom' }
    ];

    useEffect(() => {
        if (session?.user?.id) {
            fetchTemplates();
        }
    }, [session?.user?.id, activeTab, selectedCategory]);

    const fetchTemplates = async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (selectedCategory !== 'all') {
                params.append('category', selectedCategory);
            }
            if (activeTab === 'public') {
                params.append('public', 'true');
            }
            params.append('limit', '20');

            const response = await fetch(`/api/meal-plan-templates?${params}`);
            const data = await response.json();

            if (data.success) {
                setTemplates(data.templates);
            } else {
                setError(data.error || 'Failed to load templates');
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
            setError('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyTemplate = async (templateId, mergeMeals = false) => {
        try {
            const response = await fetch(`/api/meal-plan-templates/${templateId}/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mealPlanId,
                    mergeMeals
                }),
            });

            const result = await response.json();

            if (result.success) {
                if (onTemplateApplied) {
                    onTemplateApplied(result.mealPlan);
                }
                onClose();
            } else {
                alert(result.error || 'Failed to apply template');
            }
        } catch (error) {
            console.error('Error applying template:', error);
            alert('Error applying template');
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }

        try {
            const response = await fetch(`/api/meal-plan-templates/${templateId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setTemplates(prev => prev.filter(t => t._id !== templateId));
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to delete template');
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Error deleting template');
        }
    };

    const handlePreviewTemplate = async (templateId) => {
        try {
            const response = await fetch(`/api/meal-plan-templates/${templateId}/apply`);
            const data = await response.json();

            if (data.success) {
                setPreviewTemplate(data);
            } else {
                alert(data.error || 'Failed to load template preview');
            }
        } catch (error) {
            console.error('Error previewing template:', error);
            alert('Error loading template preview');
        }
    };

    const getCategoryIcon = (category) => {
        const icons = {
            family: '👨‍👩‍👧‍👦',
            healthy: '🥗',
            quick: '⚡',
            budget: '💰',
            vegetarian: '🌱',
            keto: '🥑',
            custom: '⭐'
        };
        return icons[category] || '📋';
    };

    const formatTimeAgo = (date) => {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
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
                            🔄 Meal Plan Templates
                        </h2>
                        <p style={{
                            margin: '0.25rem 0 0 0',
                            fontSize: '0.875rem',
                            color: '#6b7280'
                        }}>
                            Apply to: {mealPlanName}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <TouchEnhancedButton
                            onClick={() => setShowCreateModal(true)}
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
                            💾 Save Current Plan
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
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
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Filters */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: '#f9fafb'
                }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {[
                                { id: 'my-templates', label: 'My Templates', icon: '📁' },
                                { id: 'public', label: 'Community', icon: '🌐' }
                            ].map(tab => (
                                <TouchEnhancedButton
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        border: 'none',
                                        borderRadius: '6px',
                                        backgroundColor: activeTab === tab.id ? '#3b82f6' : 'white',
                                        color: activeTab === tab.id ? 'white' : '#6b7280',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {tab.icon} {tab.label}
                                </TouchEnhancedButton>
                            ))}
                        </div>

                        {/* Category Filter */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            style={{
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                backgroundColor: 'white'
                            }}
                        >
                            {categories.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
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
                                borderTop: '3px solid #3b82f6',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <p style={{ color: '#6b7280' }}>Loading templates...</p>
                        </div>
                    ) : error ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem',
                            color: '#ef4444'
                        }}>
                            <div style={{
                                fontSize: '3rem',
                                marginBottom: '1rem'
                            }}>❌</div>
                            <p>{error}</p>
                            <TouchEnhancedButton
                                onClick={fetchTemplates}
                                style={{
                                    marginTop: '1rem',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Try Again
                            </TouchEnhancedButton>
                        </div>
                    ) : templates.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem',
                            color: '#6b7280'
                        }}>
                            <div style={{
                                fontSize: '3rem',
                                marginBottom: '1rem'
                            }}>📋</div>
                            <h3 style={{
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                margin: '0 0 0.5rem 0',
                                color: '#111827'
                            }}>
                                {activeTab === 'my-templates' ? 'No templates yet' : 'No public templates found'}
                            </h3>
                            <p style={{ margin: '0 0 1rem 0' }}>
                                {activeTab === 'my-templates'
                                    ? 'Save your current meal plan as a template to reuse it later!'
                                    : 'Try changing the category filter to find more templates.'
                                }
                            </p>
                            {activeTab === 'my-templates' && (
                                <TouchEnhancedButton
                                    onClick={() => setShowCreateModal(true)}
                                    style={{
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '0.75rem 1.5rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    💾 Save Current Plan as Template
                                </TouchEnhancedButton>
                            )}
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            {templates.map(template => (
                                <TemplateCard
                                    key={template._id}
                                    template={template}
                                    isOwner={template.userId._id === session?.user?.id}
                                    onApply={handleApplyTemplate}
                                    onDelete={handleDeleteTemplate}
                                    onPreview={handlePreviewTemplate}
                                    getCategoryIcon={getCategoryIcon}
                                    formatTimeAgo={formatTimeAgo}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Create Template Modal */}
                {showCreateModal && (
                    <CreateTemplateModal
                        mealPlanId={mealPlanId}
                        onClose={() => setShowCreateModal(false)}
                        onCreated={() => {
                            setShowCreateModal(false);
                            fetchTemplates();
                        }}
                    />
                )}

                {/* Preview Modal */}
                {previewTemplate && (
                    <TemplatePreviewModal
                        preview={previewTemplate}
                        onClose={() => setPreviewTemplate(null)}
                        onApply={(mergeMeals) => {
                            handleApplyTemplate(previewTemplate.template._id, mergeMeals);
                            setPreviewTemplate(null);
                        }}
                    />
                )}
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

// Template Card Component
function TemplateCard({
                          template,
                          isOwner,
                          onApply,
                          onDelete,
                          onPreview,
                          getCategoryIcon,
                          formatTimeAgo
                      }) {
    const totalMeals = Object.values(template.templateMeals || {}).reduce(
        (total, dayMeals) => total + (dayMeals?.length || 0), 0
    );

    return (
        <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s'
        }}
             onMouseEnter={(e) => {
                 e.currentTarget.style.transform = 'translateY(-2px)';
                 e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
             }}
             onMouseLeave={(e) => {
                 e.currentTarget.style.transform = 'translateY(0)';
                 e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
             }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>
                            {getCategoryIcon(template.category)}
                        </span>
                        <h3 style={{
                            margin: 0,
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: '#111827'
                        }}>
                            {template.name}
                        </h3>
                        {template.isPublic && (
                            <span style={{
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '500'
                            }}>
                                Public
                            </span>
                        )}
                    </div>
                    {template.description && (
                        <p style={{
                            margin: '0 0 0.75rem 0',
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            lineHeight: '1.4'
                        }}>
                            {template.description}
                        </p>
                    )}
                </div>
                {isOwner && (
                    <TouchEnhancedButton
                        onClick={() => onDelete(template._id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            borderRadius: '4px'
                        }}
                        title="Delete template"
                    >
                        🗑️
                    </TouchEnhancedButton>
                )}
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: '#111827'
                    }}>
                        {totalMeals}
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                    }}>
                        Meals
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: '#111827'
                    }}>
                        {template.timesUsed || 0}
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                    }}>
                        Uses
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: '#111827'
                    }}>
                        {template.rating ? template.rating.toFixed(1) : '—'}
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                    }}>
                        Rating
                    </div>
                </div>
            </div>

            {/* Metadata */}
            <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginBottom: '1rem'
            }}>
                <div>Category: {template.category}</div>
                <div>Created: {formatTimeAgo(template.createdAt)}</div>
                {!isOwner && template.userId?.name && (
                    <div>By: {template.userId.name}</div>
                )}
            </div>

            {/* Actions */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap'
            }}>
                <TouchEnhancedButton
                    onClick={() => onPreview(template._id)}
                    style={{
                        flex: 1,
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                    }}
                >
                    👁️ Preview
                </TouchEnhancedButton>
                <TouchEnhancedButton
                    onClick={() => onApply(template._id, false)}
                    style={{
                        flex: 1,
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    🔄 Apply
                </TouchEnhancedButton>
                <TouchEnhancedButton
                    onClick={() => onApply(template._id, true)}
                    style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                    }}
                    title="Add to existing meals"
                >
                    ➕
                </TouchEnhancedButton>
            </div>
        </div>
    );
}

// Create Template Modal Component
function CreateTemplateModal({ mealPlanId, onClose, onCreated }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'custom',
        isPublic: false
    });
    const [loading, setLoading] = useState(false);

    const categories = [
        { value: 'family', label: 'Family Favorites' },
        { value: 'healthy', label: 'Healthy Eating' },
        { value: 'quick', label: 'Quick & Easy' },
        { value: 'budget', label: 'Budget Friendly' },
        { value: 'vegetarian', label: 'Vegetarian' },
        { value: 'keto', label: 'Keto' },
        { value: 'custom', label: 'Custom' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setLoading(true);

        try {
            const response = await fetch('/api/meal-plan-templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mealPlanId,
                    ...formData
                }),
            });

            const result = await response.json();

            if (result.success) {
                onCreated(result.template);
            } else {
                alert(result.error || 'Failed to create template');
            }
        } catch (error) {
            console.error('Error creating template:', error);
            alert('Error creating template');
        } finally {
            setLoading(false);
        }
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
            zIndex: 1001
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto'
            }}>
                <h3 style={{
                    margin: '0 0 1.5rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#111827'
                }}>
                    💾 Save as Template
                </h3>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.25rem'
                        }}>
                            Template Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Family Favorites Week"
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.25rem'
                        }}>
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe this meal plan template..."
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.25rem'
                        }}>
                            Category
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem'
                            }}
                        >
                            {categories.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            id="isPublic"
                            checked={formData.isPublic}
                            onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                        />
                        <label htmlFor="isPublic" style={{
                            fontSize: '0.875rem',
                            color: '#374151'
                        }}>
                            Make this template public (share with community)
                        </label>
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        justifyContent: 'flex-end',
                        marginTop: '1rem'
                    }}>
                        <TouchEnhancedButton
                            type="button"
                            onClick={onClose}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.75rem 1rem',
                                fontSize: '0.875rem',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            type="submit"
                            disabled={loading || !formData.name.trim()}
                            style={{
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.75rem 1.5rem',
                                fontSize: '0.875rem',
                                cursor: loading || !formData.name.trim() ? 'not-allowed' : 'pointer',
                                opacity: loading || !formData.name.trim() ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Creating...' : 'Create Template'}
                        </TouchEnhancedButton>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Template Preview Modal Component
function TemplatePreviewModal({ preview, onClose, onApply }) {
    const template = preview.template;
    const stats = preview.preview;

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
            zIndex: 1001
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '2rem',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1.5rem'
                }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#111827'
                    }}>
                        👁️ Preview: {template.name}
                    </h3>
                    <TouchEnhancedButton
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: '#6b7280'
                        }}
                    >
                        ×
                    </TouchEnhancedButton>
                </div>

                {template.description && (
                    <p style={{
                        margin: '0 0 1rem 0',
                        color: '#6b7280',
                        fontSize: '0.875rem'
                    }}>
                        {template.description}
                    </p>
                )}

                {/* Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                            {stats.totalMeals}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Meals</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                            {stats.uniqueRecipes}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Unique Recipes</div>
                    </div>
                </div>

                {/* Meal breakdown */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#111827'
                    }}>
                        Weekly Breakdown
                    </h4>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '0.5rem'
                    }}>
                        {Object.entries(stats.mealCounts).map(([day, count]) => (
                            <div key={day} style={{
                                textAlign: 'center',
                                padding: '0.5rem',
                                backgroundColor: count > 0 ? '#dbeafe' : '#f3f4f6',
                                borderRadius: '4px'
                            }}>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '0.25rem'
                                }}>
                                    {day.slice(0, 3)}
                                </div>
                                <div style={{
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    color: count > 0 ? '#1e40af' : '#9ca3af'
                                }}>
                                    {count}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end'
                }}>
                    <TouchEnhancedButton
                        onClick={onClose}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.75rem 1rem',
                            fontSize: '0.875rem',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={() => onApply(true)}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.75rem 1rem',
                            fontSize: '0.875rem',
                            cursor: 'pointer'
                        }}
                    >
                        ➕ Add to Current
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={() => onApply(false)}
                        style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.75rem 1.5rem',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        🔄 Replace Current
                    </TouchEnhancedButton>
                </div>
            </div>
        </div>
    );
}