'use client';
// file: /src/components/meal-planning/MealPlanTemplateLibrary.js v2 - Fixed button styling


import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { apiGet, apiPost, apiDelete } from '@/lib/api-config';

export default function MealPlanTemplateLibrary({
                                                    mealPlanId,
                                                    mealPlanName,
                                                    onClose,
                                                    onTemplateApplied
                                                }) {
    const { data: session } = useSafeSession();
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

            const response = await apiGet(`/api/meal-plan-templates?${params}`);
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
            const response = await apiPost(`/api/meal-plan-templates/${templateId}/apply`, {
                mealPlanId,
                mergeMeals
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
            const response = await apiDelete(`/api/meal-plan-templates/${templateId}`);

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
            const response = await apiGet(`/api/meal-plan-templates/${templateId}/apply`);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-1">
                            🔄 Meal Plan Templates
                        </h2>
                        <p className="text-sm text-gray-600">
                            Apply to: {mealPlanName}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <TouchEnhancedButton
                            onClick={() => setShowCreateModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            💾 Save Current Plan
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl p-1"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex gap-4 items-center flex-wrap">
                        {/* Tabs */}
                        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm">
                            {[
                                { id: 'my-templates', label: 'My Templates', icon: '📁' },
                                { id: 'public', label: 'Community', icon: '🌐' }
                            ].map(tab => (
                                <TouchEnhancedButton
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                                        activeTab === tab.id
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </TouchEnhancedButton>
                            ))}
                        </div>

                        {/* Category Filter */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
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
                <div className="flex-1 p-6 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 flex-col gap-4">
                            <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-gray-600">Loading templates...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <div className="text-5xl mb-4">❌</div>
                            <p className="text-red-600 mb-4">{error}</p>
                            <TouchEnhancedButton
                                onClick={fetchTemplates}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                            >
                                Try Again
                            </TouchEnhancedButton>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-5xl mb-4">📋</div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {activeTab === 'my-templates' ? 'No templates yet' : 'No public templates found'}
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {activeTab === 'my-templates'
                                    ? 'Save your current meal plan as a template to reuse it later!'
                                    : 'Try changing the category filter to find more templates.'
                                }
                            </p>
                            {activeTab === 'my-templates' && (
                                <TouchEnhancedButton
                                    onClick={() => setShowCreateModal(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
                                >
                                    💾 Save Current Plan as Template
                                </TouchEnhancedButton>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">
                            {getCategoryIcon(template.category)}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {template.name}
                        </h3>
                        {template.isPublic && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                Public
                            </span>
                        )}
                    </div>
                    {template.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {template.description}
                        </p>
                    )}
                </div>
                {isOwner && (
                    <TouchEnhancedButton
                        onClick={() => onDelete(template._id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50"
                        title="Delete template"
                    >
                        🗑️
                    </TouchEnhancedButton>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md mb-4">
                <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">
                        {totalMeals}
                    </div>
                    <div className="text-xs text-gray-600">
                        Meals
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">
                        {template.timesUsed || 0}
                    </div>
                    <div className="text-xs text-gray-600">
                        Uses
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">
                        {template.rating ? template.rating.toFixed(1) : '—'}
                    </div>
                    <div className="text-xs text-gray-600">
                        Rating
                    </div>
                </div>
            </div>

            {/* Metadata */}
            <div className="text-xs text-gray-500 space-y-1 mb-4">
                <div>Category: {template.category}</div>
                <div>Created: {formatTimeAgo(template.createdAt)}</div>
                {!isOwner && template.userId?.name && (
                    <div>By: {template.userId.name}</div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <TouchEnhancedButton
                    onClick={() => onPreview(template._id)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-md text-sm font-medium transition-colors"
                >
                    👁️ Preview
                </TouchEnhancedButton>
                <TouchEnhancedButton
                    onClick={() => onApply(template._id, false)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors"
                >
                    🔄 Apply
                </TouchEnhancedButton>
                <TouchEnhancedButton
                    onClick={() => onApply(template._id, true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors"
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
            const response = await apiPost('/api/meal-plan-templates', {
                mealPlanId,
                ...formData
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    💾 Save as Template
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Template Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Family Favorites Week"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe this meal plan template..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                            {categories.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isPublic"
                            checked={formData.isPublic}
                            onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="isPublic" className="text-sm text-gray-700">
                            Make this template public (share with community)
                        </label>
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                        <TouchEnhancedButton
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            type="submit"
                            disabled={loading || !formData.name.trim()}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                        👁️ Preview: {template.name}
                    </h3>
                    <TouchEnhancedButton
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl"
                    >
                        ×
                    </TouchEnhancedButton>
                </div>

                {template.description && (
                    <p className="text-gray-600 text-sm mb-4">
                        {template.description}
                    </p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md mb-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                            {stats.totalMeals}
                        </div>
                        <div className="text-sm text-gray-600">Total Meals</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                            {stats.uniqueRecipes}
                        </div>
                        <div className="text-sm text-gray-600">Unique Recipes</div>
                    </div>
                </div>

                {/* Meal breakdown */}
                <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Weekly Breakdown
                    </h4>
                    <div className="grid grid-cols-7 gap-2">
                        {Object.entries(stats.mealCounts).map(([day, count]) => (
                            <div key={day} className={`text-center p-3 rounded-md ${
                                count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                                <div className="text-xs font-medium mb-1">
                                    {day.slice(0, 3).toUpperCase()}
                                </div>
                                <div className="text-lg font-bold">
                                    {count}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <TouchEnhancedButton
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={() => onApply(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    >
                        ➕ Add to Current
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={() => onApply(false)}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
                    >
                        🔄 Replace Current
                    </TouchEnhancedButton>
                </div>
            </div>
        </div>
    );
}