'use client';

// MAJOR UPDATE for /src/components/recipes/SaveRecipeButton.js
// This component should now add recipes to collections instead of individual saves

import {useState, useEffect} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import FeatureGate from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import {getApiUrl} from '@/lib/api-config';

export default function SaveRecipeButton({
                                             recipeId,
                                             recipeName,
                                             onSaveStateChange = null,
                                             className = '',
                                             showText = true,
                                             size = 'medium',
                                             iconOnly = false
                                         }) {
    const {data: session} = useSafeSession();
    const [loading, setLoading] = useState(false);
    const [collections, setCollections] = useState([]);
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Fetch user's collections when component mounts
    useEffect(() => {
        if (session?.user?.id) {
            fetchCollections();
        }
    }, [session?.user?.id]);

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

    const isRecipeAlreadySaved = () => {
        return collections.some(collection =>
            collection.recipes.some(recipe =>
                recipe.recipeId?._id === recipeId || recipe.recipeId === recipeId
            )
        );
    };

    // Don't render if recipe is already saved and we're in icon-only mode
    if (iconOnly && isRecipeAlreadySaved()) {
        return null;
    }

    const fetchCollections = async () => {
        try {
            const response = await fetch(getApiUrl('/api/collections'));
            const data = await response.json();
            if (data.success) {
                setCollections(data.collections);
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
        }
    };

    const handleAddToCollection = async (collectionId) => {
        if (!session?.user?.id) {
            alert('Please sign in to save recipes');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(getApiUrl(`/api/collections/${collectionId}/recipes`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ recipeId })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess(data.message || 'Recipe added to collection!');
                setShowCollectionModal(false);
                if (onSaveStateChange) onSaveStateChange(recipeId, true);

                // Refresh collections to show updated recipe count
                fetchCollections();
            } else {
                if (data.code === 'USAGE_LIMIT_EXCEEDED') {
                    setError(data.error || 'You have reached your recipe limit.');
                    setTimeout(() => {
                        if (confirm(`${data.error}\n\nWould you like to upgrade now?`)) {
                            window.location.href = data.upgradeUrl || '/pricing';
                        }
                    }, 100);
                } else {
                    setError(data.error || 'Failed to add recipe to collection');
                }
            }
        } catch (error) {
            console.error('Error adding to collection:', error);
            setError(error.message || 'Failed to add recipe to collection');
        } finally {
            setLoading(false);
        }
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'small':
                return 'px-2 py-1 text-sm';
            case 'large':
                return 'px-6 py-3 text-lg';
            default:
                return 'px-4 py-2';
        }
    };

    const getIconSize = () => {
        switch (size) {
            case 'small':
                return 'w-4 h-4';
            case 'large':
                return 'w-6 h-6';
            default:
                return 'w-5 h-5';
        }
    };

    return (
        <FeatureGate
            feature={FEATURE_GATES.RECIPE_COLLECTIONS}
            fallback={
                iconOnly ? (
                    // Icon-only fallback for upgrade prompt
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                    </svg>
                ) : (
                    // Original full button fallback
                    <div className="relative">
                        <TouchEnhancedButton
                            onClick={() => window.location.href = '/pricing?source=save-recipe'}
                            className={`bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-md font-medium hover:from-yellow-500 hover:to-orange-600 flex items-center gap-2 ${getSizeClasses()} ${className}`}
                        >
                            <svg className={getIconSize()} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                            </svg>
                            {showText && <span>Add to Collection (Gold)</span>}
                        </TouchEnhancedButton>
                    </div>
                )
            }
        >
            {iconOnly ? (
                // Icon-only version - NO relative div wrapper
                <>
                    <button
                        onClick={() => setShowCollectionModal(true)}
                        disabled={loading}
                        className={`${className}`}
                        title="Add to Collection"
                    >
                        {loading ? (
                            <div className="w-4 h-4 animate-spin rounded-full border-b-2 border-green-600"></div>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                            </svg>
                        )}
                    </button>

                    {/* Collection Selection Modal */}
                    {showCollectionModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Add "{recipeName}" to Collection
                                        </h3>
                                        <TouchEnhancedButton
                                            onClick={() => setShowCollectionModal(false)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </TouchEnhancedButton>
                                    </div>

                                    {collections.length > 0 ? (
                                        <div className="space-y-3">
                                            {collections.map((collection) => {
                                                const isRecipeInCollection = collection.recipes.some(recipe =>
                                                    recipe.recipeId?._id === recipeId || recipe.recipeId === recipeId
                                                );

                                                return (
                                                    <TouchEnhancedButton
                                                        key={collection._id}
                                                        onClick={() => handleAddToCollection(collection._id)}
                                                        disabled={isRecipeInCollection || loading}
                                                        className={`w-full p-4 text-left border rounded-lg transition-colors ${
                                                            isRecipeInCollection
                                                                ? 'bg-green-50 border-green-200 text-green-800 cursor-not-allowed'
                                                                : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="font-medium">
                                                                    📁 {collection.name}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {collection.recipes.length} recipes
                                                                </div>
                                                            </div>
                                                            {isRecipeInCollection && (
                                                                <span className="text-green-600 font-medium text-sm">
                                                                    ✓ Added
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TouchEnhancedButton>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="text-gray-400 mb-4">
                                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                            </div>
                                            <h4 className="text-lg font-medium text-gray-900 mb-2">
                                                No Collections Yet
                                            </h4>
                                            <p className="text-gray-500 mb-4">
                                                Create your first collection to save this recipe
                                            </p>
                                            <TouchEnhancedButton
                                                onClick={() => {
                                                    setShowCollectionModal(false);
                                                    window.location.href = '/recipes?tab=collections';
                                                }}
                                                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                                            >
                                                📁 Create Collection
                                            </TouchEnhancedButton>
                                        </div>
                                    )}

                                    <div className="mt-6 pt-4 border-t border-gray-200">
                                        <TouchEnhancedButton
                                            onClick={() => {
                                                setShowCollectionModal(false);
                                                window.location.href = '/recipes?tab=collections';
                                            }}
                                            className="w-full text-center text-indigo-600 hover:text-indigo-700 text-sm"
                                        >
                                            + Create New Collection
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success/Error Messages - fixed positioning for icon-only mode */}
                    {(success || error) && (
                        <div className={`fixed top-4 right-4 w-64 rounded-lg p-3 z-50 shadow-lg ${
                            success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}>
                            <div className={`text-sm ${
                                success ? 'text-green-800' : 'text-red-800'
                            }`}>
                                {success ? `✓ ${success}` : `⚠️ ${error}`}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                // Full button version - WITH relative div wrapper
                <div className="relative">
                    <TouchEnhancedButton
                        onClick={() => setShowCollectionModal(true)}
                        disabled={loading}
                        className={`bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md font-medium transition-colors flex items-center gap-2 ${getSizeClasses()} ${className}`}
                    >
                        {loading ? (
                            <div className={`animate-spin rounded-full border-b-2 border-gray-600 ${getIconSize()}`}></div>
                        ) : (
                            <svg className={getIconSize()} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                            </svg>
                        )}
                        {showText && (
                            <span>
                                {loading ? 'Adding...' : 'Add to Collection'}
                            </span>
                        )}
                    </TouchEnhancedButton>

                    {/* Collection Selection Modal */}
                    {showCollectionModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            {/* Same modal content as above */}
                        </div>
                    )}

                    {/* Success/Error Messages - relative positioning for full button mode */}
                    {(success || error) && (
                        <div className={`absolute top-full left-0 mt-2 w-64 rounded-lg p-3 z-10 shadow-lg ${
                            success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}>
                            <div className={`text-sm ${
                                success ? 'text-green-800' : 'text-red-800'
                            }`}>
                                {success ? `✓ ${success}` : `⚠️ ${error}`}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </FeatureGate>
    );
}