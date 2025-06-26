'use client';
// file: /src/components/recipes/RecipeCollections.js v3 - Added usage limits and early upgrade prompts

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { useSubscription } from '@/hooks/useSubscription';
import { getApiUrl } from '@/lib/api-config';

const RecipeCollections = ({
                               selectedRecipeId = null,
                               onCollectionUpdate = null,
                               showAddToCollection = false,
                               onCountChange = null
                           }) => {
    const subscription = useSubscription();
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

    // Collection limit checking
    const checkCollectionLimits = (currentCount) => {
        if (!subscription || subscription.loading) {
            return { allowed: true }; // Allow if we can't determine limits yet
        }

        const userTier = subscription.tier || 'free';
        const limits = {
            free: 2,
            gold: 10,
            platinum: -1, // unlimited
            admin: -1     // NEW: Admin unlimited
        };

        const limit = limits[userTier] || limits.free;

        if (limit === -1 || userTier === 'admin') return { allowed: true }; // NEW: Admin always allowed

        if (currentCount >= limit) {
            return {
                allowed: false,
                reason: 'limit_exceeded',
                currentCount,
                limit,
                tier: userTier
            };
        }

        return { allowed: true };
    };

    // Handle create collection button click with early limit checking
    const handleCreateCollectionClick = () => {
        const currentCount = collections.length;
        const limitCheck = checkCollectionLimits(currentCount);

        if (!limitCheck.allowed) {
            let errorMessage;
            if (limitCheck.tier === 'free') {
                errorMessage = `You've reached the free plan limit of 2 recipe collections. Upgrade to Gold for 10 collections or Platinum for unlimited.`;
            } else if (limitCheck.tier === 'gold') {
                errorMessage = `You've reached the Gold plan limit of 10 recipe collections. Upgrade to Platinum for unlimited collections.`;
            } else {
                errorMessage = `You've reached your collection limit.`;
            }

            // Show upgrade prompt immediately
            if (confirm(`${errorMessage}\n\nWould you like to upgrade now?`)) {
                window.location.href = `/pricing?source=collection-limit&tier=${limitCheck.tier}`;
            }
            return; // Don't show the form
        }

        // If within limits, show the create form
        setShowCreateForm(true);
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    // Update parent count when collections change
    useEffect(() => {
        if (onCountChange) {
            onCountChange(collections.length);
        }
    }, [collections.length, onCountChange]);

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
                if (data.code === 'USAGE_LIMIT_EXCEEDED') {
                    // This should rarely happen now since we check limits early
                    setError(data.error || 'Collection limit exceeded');
                    setShowCreateForm(false); // Hide the form
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

    // Get current usage info for display
    const getUsageInfo = () => {
        if (!subscription || subscription.loading) {
            return { current: collections.length, limit: '...', tier: 'free' };
        }

        const tier = subscription.tier || 'free';
        const limits = {
            free: 2,
            gold: 10,
            platinum: -1,
            admin: -1  // NEW: Admin has unlimited collections
        };

        const limit = limits[tier] || limits.free;

        return {
            current: collections.length,
            limit: limit === -1 ? 'Unlimited' : limit,
            tier,
            isUnlimited: limit === -1 || tier === 'admin',  // NEW: Admin is unlimited
            isAtLimit: (limit !== -1 && tier !== 'admin') && collections.length >= limit,  // NEW: Admin never at limit
            isNearLimit: (limit !== -1 && tier !== 'admin') && collections.length >= (limit * 0.8)  // NEW: Admin never near limit
        };
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

    const usageInfo = getUsageInfo();

    return (
        <div className="space-y-6">
            {/* Header with Usage Info */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                        Recipe Collections ({(() => {
                        if (usageInfo.isUnlimited || usageInfo.tier === 'admin') {
                            return `${usageInfo.current}`;
                        }
                        return `${usageInfo.current}/${usageInfo.limit}`;
                    })()})
                    </h2>
                    {!subscription.loading && (
                        <p className="text-sm text-gray-600 mt-1">
                            {(() => {
                                if (usageInfo.isUnlimited || usageInfo.tier === 'admin') {
                                    return `Unlimited collections on ${usageInfo.tier} plan`;
                                } else if (usageInfo.isAtLimit) {
                                    return (
                                        <span className="text-red-600 font-medium">
                                You've reached your {usageInfo.tier} plan limit
                            </span>
                                    );
                                } else if (usageInfo.isNearLimit) {
                                    return (
                                        <span className="text-orange-600">
                                {typeof usageInfo.limit === 'number' ? usageInfo.limit - usageInfo.current : 0} collection{(usageInfo.limit - usageInfo.current) !== 1 ? 's' : ''} remaining
                            </span>
                                    );
                                } else {
                                    return `${typeof usageInfo.limit === 'number' ? usageInfo.limit - usageInfo.current : 0} collection${(usageInfo.limit - usageInfo.current) !== 1 ? 's' : ''} remaining on ${usageInfo.tier} plan`;
                                }
                            })()}
                        </p>
                    )}
                </div>

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
                            <h3 className="text-xl font-medium text-gray-900 mb-2">
                                Save Recipes with Collections
                            </h3>
                            <p className="text-gray-500 mb-4 max-w-md mx-auto">
                                Collections are the primary way to save and organize your favorite recipes. Create themed collections like "Comfort Food", "Quick Dinners", or "Holiday Recipes".
                            </p>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                <div className="text-sm text-yellow-800">
                                    <strong>🎯 How Recipe Collections Work:</strong>
                                    <ul className="mt-2 space-y-1 text-left">
                                        <li>• <strong>Free:</strong> 2 collections, 10 total recipes across collections</li>
                                        <li>• <strong>Gold:</strong> 10 collections, 200 total recipes across collections</li>
                                        <li>• <strong>Platinum:</strong> Unlimited collections and recipes</li>
                                        <li>• Organize recipes by theme, cuisine, or occasion</li>
                                        <li>• Share collections publicly with others</li>
                                        <li>• Only way to save recipes for easy access</li>
                                    </ul>
                                </div>
                            </div>
                            <TouchEnhancedButton
                                onClick={() => window.location.href = '/pricing?source=recipe-collections'}
                                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-md font-medium hover:from-yellow-500 hover:to-orange-600"
                            >
                                🚀 Upgrade to Save Recipes
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
                            Create your first collection to start saving and organizing recipes. Collections are the primary way to save recipes on Doc Bear's Comfort Kitchen.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
                            <strong>💡 Pro Tip:</strong> Start with collections like "Weekly Favorites", "Comfort Food", or "Quick Meals" to organize your recipe discoveries.
                        </div>
                        <TouchEnhancedButton
                            onClick={handleCreateCollectionClick}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
                        >
                            📁 Create Your First Collection
                        </TouchEnhancedButton>
                    </div>
                </FeatureGate>
            </div>

            {/* Usage Warning for Near Limit */}
            {usageInfo.isNearLimit && !usageInfo.isAtLimit && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <div className="text-orange-500 mr-3 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                      clipRule="evenodd"/>
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-orange-800">
                                Approaching Collection Limit
                            </h3>
                            <p className="text-sm text-orange-700 mt-1">
                                You have {usageInfo.limit - usageInfo.current} collection{usageInfo.limit - usageInfo.current !== 1 ? 's' : ''} remaining on your {usageInfo.tier} plan.
                                {usageInfo.tier === 'free' && ' Upgrade to Gold for 10 collections or Platinum for unlimited.'}
                                {usageInfo.tier === 'gold' && ' Upgrade to Platinum for unlimited collections.'}
                            </p>
                            <TouchEnhancedButton
                                onClick={() => window.location.href = `/pricing?source=collection-warning&tier=${usageInfo.tier}`}
                                className="mt-2 text-orange-600 hover:text-orange-800 underline text-sm"
                            >
                                View Upgrade Options
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
                    )}

                    {/* At Limit Warning */}
                    {usageInfo.isAtLimit && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <div className="text-red-500 mr-3 mt-0.5">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd"
                                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                              clipRule="evenodd"/>
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-red-800">
                                        Collection Limit Reached
                                    </h3>
                                    <p className="text-sm text-red-700 mt-1">
                                        You've reached your {usageInfo.tier} plan limit of {usageInfo.limit} collections.
                                        {usageInfo.tier === 'free' && ' Upgrade to Gold for 10 collections or Platinum for unlimited.'}
                                        {usageInfo.tier === 'gold' && ' Upgrade to Platinum for unlimited collections.'}
                                    </p>
                                    <TouchEnhancedButton
                                        onClick={() => window.location.href = `/pricing?source=collection-limit&tier=${usageInfo.tier}`}
                                        className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                                    >
                                        🚀 Upgrade Now
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                            )}

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
                                                    <strong>🎯 Collection Features:</strong>
                                                    <ul className="mt-2 space-y-1 text-left">
                                                        <li>• <strong>Free:</strong> 2 recipe collections</li>
                                                        <li>• <strong>Gold:</strong> 10 recipe collections</li>
                                                        <li>• <strong>Platinum:</strong> Unlimited collections</li>
                                                        <li>• Organize recipes by theme, cuisine, or occasion</li>
                                                        <li>• Share collections publicly</li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <TouchEnhancedButton
                                                onClick={() => window.location.href = '/pricing?source=recipe-collections'}
                                                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-md font-medium hover:from-yellow-500 hover:to-orange-600"
                                            >
                                                🚀 Upgrade to Unlock Collections
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
                                            onClick={handleCreateCollectionClick}
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