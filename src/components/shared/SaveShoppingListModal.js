// file: /src/components/shared/SaveShoppingListModal.js v1

'use client';

import { useState } from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { getApiUrl } from '@/lib/api-config';

export default function SaveShoppingListModal({
                                                  isOpen,
                                                  onClose,
                                                  onSave,
                                                  shoppingList,
                                                  listType = 'recipes', // 'recipe', 'recipes', 'meal-plan', 'custom'
                                                  contextName = '',
                                                  sourceRecipeIds = [],
                                                  sourceMealPlanId = null
                                              }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        tags: '',
        color: '#3b82f6',
        isTemplate: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Generate suggested name based on context
    const getSuggestedName = () => {
        const now = new Date();
        const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (listType === 'recipe') {
            return `${contextName} - ${date}`;
        } else if (listType === 'recipes') {
            const recipeCount = sourceRecipeIds.length;
            return `${recipeCount} Recipes - ${date}`;
        } else if (listType === 'meal-plan') {
            return `${contextName} - ${date}`;
        } else {
            return `Shopping List - ${date}`;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Prepare items for saving
            const items = [];

            if (shoppingList?.items) {
                Object.entries(shoppingList.items).forEach(([category, categoryItems]) => {
                    categoryItems.forEach(item => {
                        items.push({
                            ingredient: item.ingredient || item.name,
                            amount: item.amount || '',
                            category: category.toLowerCase(),
                            inInventory: item.inInventory || false,
                            purchased: item.purchased || false,
                            recipes: item.recipes || [],
                            originalName: item.originalName || '',
                            needAmount: item.needAmount || '',
                            haveAmount: item.haveAmount || '',
                            itemKey: item.itemKey || `${item.ingredient}-${category.toLowerCase()}`,
                            notes: item.notes || ''
                        });
                    });
                });
            }

            const saveData = {
                name: formData.name.trim() || getSuggestedName(),
                description: formData.description.trim(),
                listType,
                contextName,
                sourceRecipeIds,
                sourceMealPlanId,
                items,
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                color: formData.color,
                isTemplate: formData.isTemplate
            };

            const response = await fetch(getApiUrl('/api/shopping/saved', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(saveData),
            }));

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save shopping list');
            }

            // Call the onSave callback with the saved list info
            onSave && onSave(result.savedList);

            // Reset form and close
            setFormData({
                name: '',
                description: '',
                tags: '',
                color: '#3b82f6',
                isTemplate: false
            });
            onClose();

        } catch (error) {
            console.error('Error saving shopping list:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const predefinedColors = [
        '#3b82f6', // Blue
        '#10b981', // Green
        '#f59e0b', // Yellow
        '#ef4444', // Red
        '#8b5cf6', // Purple
        '#06b6d4', // Cyan
        '#f97316', // Orange
        '#84cc16', // Lime
        '#ec4899', // Pink
        '#6b7280'  // Gray
    ];

    const predefinedTags = [
        'Weekly', 'Quick', 'Healthy', 'Budget', 'Party',
        'Holiday', 'Meal Prep', 'Family', 'Date Night', 'Bulk'
    ];

    if (!isOpen) return null;

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
                maxWidth: '500px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#111827'
                    }}>
                        💾 Save Shopping List
                    </h2>
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

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
                    {error && (
                        <div style={{
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            marginBottom: '1rem',
                            fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* List Info */}
                    <div style={{
                        backgroundColor: '#f3f4f6',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                            Saving {shoppingList?.summary?.totalItems || 0} items from:
                        </div>
                        <div style={{ fontWeight: '600', color: '#111827' }}>
                            {contextName || 'Custom Shopping List'}
                        </div>
                        {shoppingList?.recipes && shoppingList.recipes.length > 0 && (
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                {shoppingList.recipes.join(', ')}
                            </div>
                        )}
                    </div>

                    {/* Name Field */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                        }}>
                            List Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={getSuggestedName()}
                            maxLength={100}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            Leave blank to use suggested name
                        </div>
                    </div>

                    {/* Description Field */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                        }}>
                            Description (Optional)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Add notes about this shopping list..."
                            maxLength={500}
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Tags Field */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                        }}>
                            Tags (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            placeholder="weekly, healthy, quick (comma-separated)"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ marginTop: '0.5rem' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                Quick tags:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                {predefinedTags.map(tag => (
                                    <TouchEnhancedButton
                                        key={tag}
                                        type="button"
                                        onClick={() => {
                                            const currentTags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
                                            if (!currentTags.includes(tag)) {
                                                setFormData({
                                                    ...formData,
                                                    tags: [...currentTags, tag].join(', ')
                                                });
                                            }
                                        }}
                                        style={{
                                            backgroundColor: '#f3f4f6',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '0.25rem 0.5rem',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            color: '#6b7280'
                                        }}
                                    >
                                        +{tag}
                                    </TouchEnhancedButton>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                        }}>
                            Color
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {predefinedColors.map(color => (
                                <TouchEnhancedButton
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color })}
                                    style={{
                                        width: '2rem',
                                        height: '2rem',
                                        borderRadius: '6px',
                                        border: formData.color === color ? '2px solid #111827' : '1px solid #d1d5db',
                                        backgroundColor: color,
                                        cursor: 'pointer'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Template Checkbox */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer'
                        }}>
                            <input
                                type="checkbox"
                                checked={formData.isTemplate}
                                onChange={(e) => setFormData({ ...formData, isTemplate: e.target.checked })}
                                style={{ margin: 0 }}
                            />
                            <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                                Save as template (reusable shopping list)
                            </span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        justifyContent: 'flex-end'
                    }}>
                        <TouchEnhancedButton
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            style={{
                                padding: '0.75rem 1rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                backgroundColor: 'white',
                                color: '#374151',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.75rem 1rem',
                                border: 'none',
                                borderRadius: '6px',
                                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                                color: 'white',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {loading ? (
                                <>
                                    <div style={{
                                        width: '1rem',
                                        height: '1rem',
                                        border: '2px solid transparent',
                                        borderTop: '2px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    Saving...
                                </>
                            ) : (
                                <>💾 Save List</>
                            )}
                        </TouchEnhancedButton>
                    </div>
                </form>

                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
}