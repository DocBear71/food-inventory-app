'use client';
// file: /src/components/recipes/AddToCollectionButton.js v2 - FIXED error handling and API calls

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { apiGet, apiPost } from '@/lib/api-config';
import {KeyboardOptimizedInput} from '@/components/forms/KeyboardOptimizedInput';

export default function AddToCollectionButton({ recipeId, recipeName, className = '' }) {
    const [collections, setCollections] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [creatingCollection, setCreatingCollection] = useState(false);

    useEffect(() => {
        if (showDropdown && collections.length === 0) {
            fetchCollections();
        }
    }, [showDropdown]);

    // Clear messages after delay
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess('');
                setError('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    const fetchCollections = async () => {
        try {
            setLoading(true);
            const response = await apiGet('/api/collections');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                setCollections(data.collections || []);
            } else {
                throw new Error(data.error || 'Failed to fetch collections');
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
            setError('Failed to load collections');
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCollection = async (collectionId) => {
        try {
            const response = await apiPost(`/api/collections/${collectionId}/recipes`, { recipeId });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                setSuccess(`Added "${recipeName}" to collection!`);
                setShowDropdown(false);

                // Update collections to reflect the change
                if (data.collection) {
                    setCollections(collections.map(collection =>
                        collection._id === collectionId ? data.collection : collection
                    ));
                }
            } else {
                if (data.error && data.error.includes('already in this collection')) {
                    setError('Recipe is already in this collection');
                } else if (data.code === 'USAGE_LIMIT_EXCEEDED') {
                    if (confirm(`${data.error}\n\nWould you like to upgrade now?`)) {
                        window.location.href = data.upgradeUrl || '/pricing';
                    }
                    return;
                } else {
                    throw new Error(data.error || 'Failed to add recipe to collection');
                }
            }
        } catch (error) {
            console.error('Error adding recipe to collection:', error);
            setError(error.message || 'Failed to add recipe to collection');
        }
    };

    // NEW: Handle creating a new collection and adding the recipe to it
    const handleCreateCollection = async (formData) => {
        try {
            setCreatingCollection(true);
            const name = formData.get('name');
            const description = formData.get('description');

            if (!name || name.trim().length === 0) {
                setError('Collection name is required');
                return;
            }

            const response = await apiPost('/api/collections', {
                name: name.trim(),
                description: description?.trim() || '',
                recipes: [{ recipeId }]
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                setSuccess(`Created collection "${name}" and added "${recipeName}"!`);
                setShowDropdown(false);
                setShowCreateForm(false);

                // Add new collection to the list
                setCollections([...collections, data.collection]);
            } else {
                if (data.code === 'USAGE_LIMIT_EXCEEDED') {
                    if (confirm(`${data.error}\n\nWould you like to upgrade now?`)) {
                        window.location.href = data.upgradeUrl || '/pricing';
                    }
                    return;
                } else {
                    throw new Error(data.error || 'Failed to create collection');
                }
            }
        } catch (error) {
            console.error('Error creating collection:', error);
            setError(error.message || 'Failed to create collection');
        } finally {
            setCreatingCollection(false);
        }
    };

    const isRecipeInCollection = (collection) => {
        if (!collection.recipes || !Array.isArray(collection.recipes)) {
            return false;
        }
        return collection.recipes.some(recipe => {
            const id = recipe.recipeId?._id || recipe.recipeId;
            return id === recipeId;
        });
    };

    return (
        <FeatureGate
            feature={FEATURE_GATES.RECIPE_COLLECTIONS}
            fallback={
                <TouchEnhancedButton
                    onClick={() => window.location.href = '/pricing?source=add-to-collection'}
                    className={`bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-md font-medium hover:from-yellow-500 hover:to-orange-600 ${className}`}
                >
                    📁 Collections (Gold)
                </TouchEnhancedButton>
            }
        >
            <div className="relative">
                {/* Main Button */}
                <TouchEnhancedButton
                    onClick={() => setShowDropdown(!showDropdown)}
                    className={`bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2 ${className}`}
                >
                    📁 Add to Collection
                    <svg className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </TouchEnhancedButton>

                {/* Dropdown */}
                {showDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <div className="p-4">
                            <h3 className="text-sm font-medium text-gray-900 mb-3">
                                Add to Collection
                            </h3>

                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                                    <p className="text-sm text-gray-500 mt-2">Loading collections...</p>
                                </div>
                            ) : error && collections.length === 0 ? (
                                <div className="text-center py-4">
                                    <div className="text-red-600 text-sm mb-3">{error}</div>
                                    <TouchEnhancedButton
                                        onClick={() => {
                                            setError('');
                                            fetchCollections();
                                        }}
                                        className="text-purple-600 hover:text-purple-700 text-sm"
                                    >
                                        Try again
                                    </TouchEnhancedButton>
                                </div>
                            ) : showCreateForm ? (
                                // NEW: Inline collection creation form
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-gray-900">Create New Collection</h4>
                                        <TouchEnhancedButton
                                            onClick={() => setShowCreateForm(false)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            ×
                                        </TouchEnhancedButton>
                                    </div>
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            const formData = new FormData(e.target);
                                            handleCreateCollection(formData);
                                        }}
                                        className="space-y-3"
                                    >
                                        <div>
                                            <KeyboardOptimizedInput
                                                type="text"
                                                name="name"
                                                placeholder="Collection name"
                                                required
                                                maxLength={100}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <textarea
                                                name="description"
                                                placeholder="Description (optional)"
                                                rows={2}
                                                maxLength={500}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <TouchEnhancedButton
                                                type="submit"
                                                disabled={creatingCollection}
                                                className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-md text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {creatingCollection ? 'Creating...' : 'Create & Add Recipe'}
                                            </TouchEnhancedButton>
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => setShowCreateForm(false)}
                                                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-700"
                                            >
                                                Cancel
                                            </TouchEnhancedButton>
                                        </div>
                                    </form>
                                </div>
                            ) : collections.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {collections.map((collection) => {
                                        const isInCollection = isRecipeInCollection(collection);
                                        return (
                                            <TouchEnhancedButton
                                                key={collection._id}
                                                onClick={() => !isInCollection && handleAddToCollection(collection._id)}
                                                disabled={isInCollection}
                                                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                                    isInCollection
                                                        ? 'bg-green-50 text-green-800 cursor-not-allowed'
                                                        : 'hover:bg-gray-50 text-gray-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium">
                                                            {isInCollection ? '✓ ' : '📁 '}{collection.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {collection.recipes?.length || 0} recipe{(collection.recipes?.length || 0) !== 1 ? 's' : ''}
                                                        </div>
                                                    </div>
                                                    {isInCollection && (
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                            Added
                                                        </span>
                                                    )}
                                                </div>
                                            </TouchEnhancedButton>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="text-gray-500 text-sm mb-3">
                                        No collections yet
                                    </div>
                                    <TouchEnhancedButton
                                        onClick={() => setShowCreateForm(true)}
                                        className="bg-purple-600 text-white px-3 py-2 rounded-md text-sm hover:bg-purple-700"
                                    >
                                        Create your first collection
                                    </TouchEnhancedButton>
                                </div>
                            )}

                            {/* Create New Collection Link */}
                            {collections.length > 0 && !showCreateForm && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <TouchEnhancedButton
                                        onClick={() => setShowCreateForm(true)}
                                        className="w-full text-purple-600 hover:text-purple-700 text-sm text-center py-2"
                                    >
                                        + Create New Collection
                                    </TouchEnhancedButton>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Click outside to close */}
                {showDropdown && (
                    <div
                        className="fixed inset-0 z-0"
                        onClick={() => setShowDropdown(false)}
                    />
                )}

                {/* Success/Error Messages */}
                {success && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-green-50 border border-green-200 rounded-lg p-3 z-10">
                        <div className="text-sm text-green-800">
                            ✓ {success}
                        </div>
                    </div>
                )}

                {error && !showDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-red-50 border border-red-200 rounded-lg p-3 z-10">
                        <div className="text-sm text-red-800">
                            ⚠️ {error}
                        </div>
                    </div>
                )}
            </div>
        </FeatureGate>
    );
}