'use client';
// file: /src/components/recipes/RecipeCollections.js v2 - Fixed imports and export

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { getApiUrl } from '@/lib/api-config';

const RecipeCollections = ({
                               selectedRecipeId = null,
                               onCollectionUpdate = null,
                               showAddToCollection = false
                           }) => {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        name: '',
        description: '',
        isPublic: false
    });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchCollections();
    }, []);

    const fetchCollections = async () => {
        try {
            setLoading(true);
            const response = await fetch(getApiUrl('/api/collections'));
            const data = await response.json();

            if (data.success) {
                setCollections(data.collections);
            } else {
                setError(data.error || 'Failed to fetch collections');
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
            setError('Failed to fetch collections');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCollection = async (e) => {
        e.preventDefault();
        setCreating(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(getApiUrl('/api/collections'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(createFormData)
            });

            const data = await response.json();

            if (data.success) {
                setCollections([data.collection, ...collections]);
                setCreateFormData({ name: '', description: '', isPublic: false });
                setShowCreateForm(false);
                setSuccess('Collection created successfully!');
                setTimeout(() => setSuccess(''), 3000);

                if (onCollectionUpdate) {
                    onCollectionUpdate();
                }
            } else {
                if (data.upgradeRequired) {
                    setError(`${data.error} Upgrade to ${data.requiredTier} to create more collections.`);
                } else {
                    setError(data.error || 'Failed to create collection');
                }
            }
        } catch (error) {
            console.error('Error creating collection:', error);
            setError('Failed to create collection');
        } finally {
            setCreating(false);
        }
    };

    const handleAddRecipeToCollection = async (collectionId) => {
        if (!selectedRecipeId) return;

        try {
            const response = await fetch(getApiUrl(`/api/collections/${collectionId}/recipes`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ recipeId: selectedRecipeId })
            });

            const data = await response.json();

            if (data.success) {
                // Update the collection in state
                setCollections(collections.map(collection =>
                    collection._id === collectionId ? data.collection : collection
                ));
                setSuccess(data.message);
                setTimeout(() => setSuccess(''), 3000);

                if (onCollectionUpdate) {
                    onCollectionUpdate();
                }
            } else {
                setError(data.error || 'Failed to add recipe to collection');
            }
        } catch (error) {
            console.error('Error adding recipe to collection:', error);
            setError('Failed to add recipe to collection');
        }
    };

    const handleDeleteCollection = async (collectionId) => {
        if (!confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(getApiUrl(`/api/collections/${collectionId}`), {
                method: 'DELETE'
            });

            if (response.ok) {
                setCollections(collections.filter(collection => collection._id !== collectionId));
                setSuccess('Collection deleted successfully');
                setTimeout(() => setSuccess(''), 3000);

                if (onCollectionUpdate) {
                    onCollectionUpdate();
                }
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to delete collection');
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
            setError('Failed to delete collection');
        }
    };

    const isRecipeInCollection = (collection) => {
        if (!selectedRecipeId) return false;
        return collection.recipes.some(recipe =>
            recipe.recipeId?._id === selectedRecipeId || recipe.recipeId === selectedRecipeId
        );
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                    Recipe Collections ({collections.length})
                </h2>

                <FeatureGate
                    feature={FEATURE_GATES.RECIPE_COLLECTIONS}
                    fallback={
                        <TouchEnhancedButton
                            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-md font-medium"
                        >
                            🎯 Unlock Collections
                        </TouchEnhancedButton>
                    }
                >
                    <TouchEnhancedButton
                        onClick={() => setShowCreateForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                        📁 New Collection
                    </TouchEnhancedButton>
                </FeatureGate>
            </div>

            {/* Success/Error Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-sm text-red-800">
                        <strong>Error:</strong> {error}
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-sm text-green-800">
                        <strong>Success:</strong> {success}
                    </div>
                </div>
            )}

            {/* Create Collection Form */}
            {showCreateForm && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Collection</h3>

                    <form onSubmit={handleCreateCollection} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Collection Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={createFormData.name}
                                onChange={(e) => setCreateFormData({
                                    ...createFormData,
                                    name: e.target.value
                                })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="e.g., Comfort Food Favorites"
                                maxLength={100}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Optional)
                            </label>
                            <textarea
                                value={createFormData.description}
                                onChange={(e) => setCreateFormData({
                                    ...createFormData,
                                    description: e.target.value
                                })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Describe this collection..."
                                rows={3}
                                maxLength={500}
                            />
                        </div>

                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="isPublic"
                                    type="checkbox"
                                    checked={createFormData.isPublic}
                                    onChange={(e) => setCreateFormData({
                                        ...createFormData,
                                        isPublic: e.target.checked
                                    })}
                                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="isPublic" className="font-medium text-gray-700">
                                    Make this collection public
                                </label>
                                <p className="text-gray-500">
                                    Public collections can be viewed by other users
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <TouchEnhancedButton
                                type="button"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setCreateFormData({ name: '', description: '', isPublic: false });
                                    setError('');
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                type="submit"
                                disabled={creating || !createFormData.name.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center gap-2"
                            >
                                {creating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Creating...
                                    </>
                                ) : (
                                    '📁 Create Collection'
                                )}
                            </TouchEnhancedButton>
                        </div>
                    </form>
                </div>
            )}

            {/* Collections List */}
            {collections.length > 0 ? (
                <div className="space-y-4">
                    {collections.map((collection) => (
                        <div key={collection._id}
                             className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">

                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-medium text-gray-900">
                                            📁 {collection.name}
                                        </h3>
                                        {collection.isPublic && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                🌍 Public
                                            </span>
                                        )}
                                        <span className="text-sm text-gray-500">
                                            ({collection.recipeCount || collection.recipes.length} recipes)
                                        </span>
                                    </div>

                                    {collection.description && (
                                        <p className="text-gray-600 text-sm mb-3">
                                            {collection.description}
                                        </p>
                                    )}

                                    {/* Recipe Preview */}
                                    {collection.recipes.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {collection.recipes.slice(0, 3).map((recipe, index) => (
                                                <span key={index}
                                                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                                    {recipe.recipeId?.title || 'Recipe'}
                                                </span>
                                            ))}
                                            {collection.recipes.length > 3 && (
                                                <span className="text-xs text-gray-500">
                                                    +{collection.recipes.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2 ml-4">
                                    {/* Add Recipe to Collection Button */}
                                    {showAddToCollection && selectedRecipeId && (
                                        <TouchEnhancedButton
                                            onClick={() => handleAddRecipeToCollection(collection._id)}
                                            disabled={isRecipeInCollection(collection)}
                                            className={`px-3 py-1 text-sm rounded-md ${
                                                isRecipeInCollection(collection)
                                                    ? 'bg-green-100 text-green-800 cursor-not-allowed'
                                                    : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                                            }`}
                                        >
                                            {isRecipeInCollection(collection) ? '✓ Added' : '+ Add Recipe'}
                                        </TouchEnhancedButton>
                                    )}

                                    {/* View Collection Button */}
                                    <TouchEnhancedButton
                                        onClick={() => window.location.href = `/collections/${collection._id}`}
                                        className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                                    >
                                        👀 View
                                    </TouchEnhancedButton>

                                    {/* Delete Collection Button */}
                                    <TouchEnhancedButton
                                        onClick={() => handleDeleteCollection(collection._id)}
                                        className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                                    >
                                        🗑️ Delete
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <FeatureGate
                    feature={FEATURE_GATES.RECIPE_COLLECTIONS}
                    fallback={
                        <div className="text-center py-8">
                            <div className="text-gray-500 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Recipe Collections Available with Gold
                            </h3>
                            <p className="text-gray-500 mb-4">
                                Organize your recipes into collections like "Comfort Food", "Quick Dinners", or "Holiday Recipes"
                            </p>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                <div className="text-sm text-yellow-800">
                                    <strong>🎯 Gold Features:</strong>
                                    <ul className="mt-2 space-y-1 text-left">
                                        <li>• Create up to 10 recipe collections</li>
                                        <li>• Organize recipes by theme, cuisine, or occasion</li>
                                        <li>• Share collections publicly</li>
                                        <li>• Quick recipe organization and discovery</li>
                                    </ul>
                                </div>
                            </div>
                            <TouchEnhancedButton
                                onClick={() => window.location.href = '/pricing?source=recipe-collections'}
                                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-md font-medium hover:from-yellow-500 hover:to-orange-600"
                            >
                                🚀 Upgrade to Gold
                            </TouchEnhancedButton>
                        </div>
                    }
                >
                    <div className="text-center py-8">
                        <div className="text-gray-500 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No Collections Yet
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Start organizing your recipes by creating your first collection
                        </p>
                        <TouchEnhancedButton
                            onClick={() => setShowCreateForm(true)}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
                        >
                            📁 Create Your First Collection
                        </TouchEnhancedButton>
                    </div>
                </FeatureGate>
            )}
        </div>
    );
};

export default RecipeCollections;