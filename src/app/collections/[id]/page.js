'use client';
// file: /src/app/collections/[id]/page.js v1 - Individual collection view page

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSafeSession } from '@/hooks/useSafeSession';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { StarRating } from '@/components/reviews/RecipeRating';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { getApiUrl } from '@/lib/api-config';
import SaveRecipeButton from "@/components/recipes/SaveRecipeButton";
import AddToCollectionButton from "@/components/recipes/AddToCollectionButton";

export default function CollectionViewPage() {
    const { data: session, status } = useSafeSession();
    const params = useParams();
    const router = useRouter();
    const [collection, setCollection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        description: '',
        isPublic: false
    });
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchCollection();
        }
    }, [params.id]);

    const fetchCollection = async () => {
        try {
            setLoading(true);
            const response = await fetch(getApiUrl(`/api/collections/${params.id}`));
            const data = await response.json();

            if (data.success) {
                setCollection(data.collection);
                setEditData({
                    name: data.collection.name,
                    description: data.collection.description || '',
                    isPublic: data.collection.isPublic
                });
            } else {
                setError(data.error || 'Collection not found');
            }
        } catch (error) {
            console.error('Error fetching collection:', error);
            setError('Failed to load collection');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCollection = async () => {
        setUpdating(true);
        setError('');

        try {
            const response = await fetch(getApiUrl(`/api/collections/${params.id}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editData)
            });

            const data = await response.json();

            if (data.success) {
                setCollection(data.collection);
                setEditMode(false);
            } else {
                setError(data.error || 'Failed to update collection');
            }
        } catch (error) {
            console.error('Error updating collection:', error);
            setError('Failed to update collection');
        } finally {
            setUpdating(false);
        }
    };

    const handleRemoveRecipe = async (recipeId) => {
        if (!confirm('Remove this recipe from the collection?')) {
            return;
        }

        try {
            const response = await fetch(getApiUrl(`/api/collections/${params.id}/recipes?recipeId=${recipeId}`), {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                setCollection(data.collection);
            } else {
                setError(data.error || 'Failed to remove recipe');
            }
        } catch (error) {
            console.error('Error removing recipe:', error);
            setError('Failed to remove recipe');
        }
    };

    const formatCookTime = (minutes) => {
        if (!minutes) return null;
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const getDifficultyColor = (difficulty) => {
        const colors = {
            easy: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            hard: 'bg-red-100 text-red-800'
        };
        return colors[difficulty] || colors.medium;
    };

    const canEdit = () => {
        return session?.user?.id === collection?.userId?._id || session?.user?.id === collection?.userId;
    };

    if (status === 'loading' || loading) {
        return (
            <MobileOptimizedLayout>
                <div className="max-w-6xl mx-auto px-4 py-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-24 bg-gray-200 rounded"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-64 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    if (error) {
        return (
            <MobileOptimizedLayout>
                <div className="max-w-6xl mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <div className="text-red-500 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {error}
                        </h3>
                        <TouchEnhancedButton
                            onClick={() => router.back()}
                            className="text-indigo-600 hover:text-indigo-700"
                        >
                            ← Go Back
                        </TouchEnhancedButton>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    if (!collection) {
        return null;
    }

    return (
        <MobileOptimizedLayout>
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <TouchEnhancedButton
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
                    >
                        ← Back
                    </TouchEnhancedButton>

                    {canEdit() && (
                        <div className="flex gap-2">
                            <TouchEnhancedButton
                                onClick={() => setEditMode(!editMode)}
                                className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                                ✏️ {editMode ? 'Cancel Edit' : 'Edit Collection'}
                            </TouchEnhancedButton>
                        </div>
                    )}
                </div>

                {/* Collection Header */}
                {editMode ? (
                    <div className="bg-white rounded-lg border p-6 mb-8">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Collection</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Collection Name
                                </label>
                                <input
                                    type="text"
                                    value={editData.name}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    maxLength={100}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={editData.description}
                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    rows={3}
                                    maxLength={500}
                                />
                            </div>

                            <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input
                                        id="isPublic"
                                        type="checkbox"
                                        checked={editData.isPublic}
                                        onChange={(e) => setEditData({ ...editData, isPublic: e.target.checked })}
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
                                    onClick={() => {
                                        setEditMode(false);
                                        setEditData({
                                            name: collection.name,
                                            description: collection.description || '',
                                            isPublic: collection.isPublic
                                        });
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={handleUpdateCollection}
                                    disabled={updating || !editData.name.trim()}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
                                >
                                    {updating ? 'Saving...' : 'Save Changes'}
                                </TouchEnhancedButton>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="text-sm text-red-800">
                                    <strong>Error:</strong> {error}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border p-6 mb-8">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        📁 {collection.name}
                                    </h1>
                                    {collection.isPublic && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                            🌍 Public Collection
                                        </span>
                                    )}
                                </div>

                                {collection.description && (
                                    <p className="text-gray-600 mb-4">{collection.description}</p>
                                )}

                                <div className="flex items-center gap-6 text-sm text-gray-500">
                                    <span>{collection.recipes.length} recipe{collection.recipes.length !== 1 ? 's' : ''}</span>
                                    <span>Updated {new Date(collection.updatedAt).toLocaleDateString()}</span>
                                    {collection.userId?.name && (
                                        <span>by {collection.userId.name}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recipes Grid */}
                {collection.recipes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {collection.recipes.map((recipeEntry) => {
                            const recipe = recipeEntry.recipeId;
                            if (!recipe) return null;

                            return (
                                <div key={recipe._id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                                    <div className="p-6">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-3">
                                            <a
                                                href={`/recipes/${recipe._id}`}
                                                className="text-lg font-semibold text-gray-900 hover:text-indigo-600 line-clamp-2"
                                            >
                                                {recipe.title}
                                            </a>
                                            {canEdit() && (
                                                <TouchEnhancedButton
                                                    onClick={() => handleRemoveRecipe(recipe._id)}
                                                    className="text-red-500 hover:text-red-700 ml-2"
                                                    title="Remove from collection"
                                                >
                                                    ✕
                                                </TouchEnhancedButton>
                                            )}
                                        </div>

                                        {/* Rating */}
                                        <div className="mb-3">
                                            <StarRating
                                                rating={recipe.ratingStats?.averageRating || 0}
                                                size="small"
                                                showNumber={false}
                                            />
                                        </div>

                                        <AddToCollectionButton
                                            recipeId={recipe._id}
                                            recipeName={recipe.title}
                                        />

                                        {/* Description */}
                                        {recipe.description && (
                                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                                {recipe.description}
                                            </p>
                                        )}

                                        {/* Recipe Info */}
                                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                                            <div className="flex items-center space-x-4">
                                                {recipe.servings && (
                                                    <span className="flex items-center space-x-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        <span>{recipe.servings}</span>
                                                    </span>
                                                )}
                                                {formatCookTime(recipe.cookTime) && (
                                                    <span className="flex items-center space-x-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>{formatCookTime(recipe.cookTime)}</span>
                                                    </span>
                                                )}
                                            </div>
                                            {recipe.difficulty && (
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                                                    {recipe.difficulty}
                                                </span>
                                            )}
                                        </div>

                                        {/* Added Date */}
                                        <div className="text-xs text-gray-400">
                                            Added {new Date(recipeEntry.addedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-gray-500 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No recipes in this collection yet
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Start adding recipes to organize them by theme, cuisine, or occasion
                        </p>
                        <TouchEnhancedButton
                            onClick={() => router.push('/recipes')}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
                        >
                            Browse Recipes
                        </TouchEnhancedButton>
                    </div>
                )}
            </div>
            <Footer />
        </MobileOptimizedLayout>
    );
}