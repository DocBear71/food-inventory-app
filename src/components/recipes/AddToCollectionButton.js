'use client';
// file: /src/components/recipes/AddToCollectionButton.js v1 - Button to add recipes to collections

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { getApiUrl } from '@/lib/api-config';

export default function AddToCollectionButton({ recipeId, recipeName, className = '' }) {
    const [collections, setCollections] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (showDropdown && collections.length === 0) {
            fetchCollections();
        }
    }, [showDropdown]);

    const fetchCollections = async () => {
        try {
            setLoading(true);
            const response = await fetch(getApiUrl('/api/collections'));
            const data = await response.json();

            if (data.success) {
                setCollections(data.collections);
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCollection = async (collectionId) => {
        try {
            const response = await fetch(getApiUrl(`/api/collections/${collectionId}/recipes`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ recipeId })
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(`Added "${recipeName}" to collection!`);
                setShowDropdown(false);

                // Update collections to reflect the change
                setCollections(collections.map(collection =>
                    collection._id === collectionId ? data.collection : collection
                ));

                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.error || 'Failed to add recipe to collection');
            }
        } catch (error) {
            console.error('Error adding recipe to collection:', error);
            setError('Failed to add recipe to collection');
        }
    };

    const isRecipeInCollection = (collection) => {
        return collection.recipes.some(recipe =>
            recipe.recipeId?._id === recipeId || recipe.recipeId === recipeId
        );
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
                                                            {collection.recipes.length} recipe{collection.recipes.length !== 1 ? 's' : ''}
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
                                        onClick={() => {
                                            setShowDropdown(false);
                                            window.location.href = '/recipes?tab=collections';
                                        }}
                                        className="text-purple-600 hover:text-purple-700 text-sm"
                                    >
                                        Create your first collection
                                    </TouchEnhancedButton>
                                </div>
                            )}

                            {/* Create New Collection Link */}
                            {collections.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <TouchEnhancedButton
                                        onClick={() => {
                                            setShowDropdown(false);
                                            window.location.href = '/recipes?tab=collections';
                                        }}
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

                {error && (
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