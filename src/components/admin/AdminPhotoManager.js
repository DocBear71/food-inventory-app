'use client';

// file: /src/components/admin/AdminPhotoManager.js - Simplified admin photo management

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiGet } from '@/lib/api-config';

export default function AdminPhotoManager({ onClose }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recipesWithoutPhotos, setRecipesWithoutPhotos] = useState([]);
    const [selectedRecipes, setSelectedRecipes] = useState(new Set());
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchPhotoStats();
    }, []);

    const fetchPhotoStats = async () => {
        try {
            setLoading(true);

            // Get recipes without photos
            const response = await apiGet('/api/recipes?hasPhotos=false&limit=50');
            const data = await response.json();

            if (data.success) {
                setRecipesWithoutPhotos(data.recipes || []);

                // Calculate stats
                const totalRecipes = data.totalCount || 0;
                const recipesWithoutPhotosCount = data.recipes?.length || 0;

                setStats({
                    totalRecipes,
                    recipesWithoutPhotos: recipesWithoutPhotosCount,
                    recipesWithPhotos: totalRecipes - recipesWithoutPhotosCount,
                    photoCompletionRate: Math.round(((totalRecipes - recipesWithoutPhotosCount) / totalRecipes) * 100)
                });
            }
        } catch (error) {
            console.error('Error fetching photo stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRecipeSelect = (recipeId) => {
        const newSelected = new Set(selectedRecipes);
        if (newSelected.has(recipeId)) {
            newSelected.delete(recipeId);
        } else {
            newSelected.add(recipeId);
        }
        setSelectedRecipes(newSelected);
    };

    const selectAll = () => {
        setSelectedRecipes(new Set(recipesWithoutPhotos.map(r => r._id)));
    };

    const clearSelection = () => {
        setSelectedRecipes(new Set());
    };

    const bulkUploadPhotos = async () => {
        if (selectedRecipes.size === 0) {
            alert('Please select recipes first');
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';

        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            setUploading(true);

            try {
                const selectedRecipeArray = Array.from(selectedRecipes);
                let successCount = 0;

                // Assign photos to recipes (round-robin if more recipes than photos)
                for (let i = 0; i < selectedRecipeArray.length; i++) {
                    const recipeId = selectedRecipeArray[i];
                    const file = files[i % files.length]; // Cycle through files

                    try {
                        const formData = new FormData();
                        formData.append('photo', file);
                        formData.append('recipeId', recipeId);
                        formData.append('isPrimary', 'true');
                        formData.append('source', 'admin_upload');

                        const response = await fetch('/api/recipes/photos', {
                            method: 'POST',
                            body: formData,
                            credentials: 'include'
                        });

                        if (response.ok) {
                            successCount++;
                        }
                    } catch (error) {
                        console.error(`Error uploading photo for recipe ${recipeId}:`, error);
                    }
                }

                alert(`Successfully uploaded photos to ${successCount} recipes!`);
                await fetchPhotoStats(); // Refresh data
                clearSelection();

            } catch (error) {
                console.error('Bulk upload error:', error);
                alert('Some uploads failed. Please try again.');
            } finally {
                setUploading(false);
            }
        };

        input.click();
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full p-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p>Loading photo statistics...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-gray-900">
                            Admin Photo Manager
                        </h3>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        Manage photos for recipes across your app
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Statistics */}
                    {stats && (
                        <div className="mb-8">
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Photo Statistics</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-blue-600">{stats.totalRecipes}</div>
                                    <div className="text-sm text-blue-700">Total Recipes</div>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-green-600">{stats.recipesWithPhotos}</div>
                                    <div className="text-sm text-green-700">With Photos</div>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-orange-600">{stats.recipesWithoutPhotos}</div>
                                    <div className="text-sm text-orange-700">Need Photos</div>
                                </div>
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-purple-600">{stats.photoCompletionRate}%</div>
                                    <div className="text-sm text-purple-700">Completion</div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Photo Completion</span>
                                    <span className="text-sm text-gray-500">{stats.photoCompletionRate}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-green-500 h-3 rounded-full transition-all duration-300"
                                        style={{ width: `${stats.photoCompletionRate}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bulk Actions */}
                    {recipesWithoutPhotos.length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-medium text-gray-900">
                                    Recipes Without Photos ({recipesWithoutPhotos.length})
                                </h4>
                                <div className="flex items-center space-x-2">
                                    <TouchEnhancedButton
                                        onClick={selectAll}
                                        className="text-blue-600 hover:text-blue-700 text-sm"
                                    >
                                        Select All
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        onClick={clearSelection}
                                        className="text-gray-600 hover:text-gray-700 text-sm"
                                    >
                                        Clear
                                    </TouchEnhancedButton>
                                </div>
                            </div>

                            {/* Bulk Actions Bar */}
                            {selectedRecipes.size > 0 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-blue-700">
                                            {selectedRecipes.size} recipe{selectedRecipes.size !== 1 ? 's' : ''} selected
                                        </div>
                                        <TouchEnhancedButton
                                            onClick={bulkUploadPhotos}
                                            disabled={uploading}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                                        >
                                            {uploading ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    <span>Uploading...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                    </svg>
                                                    <span>Upload Photos</span>
                                                </>
                                            )}
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            )}

                            {/* Recipe List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                                {recipesWithoutPhotos.map((recipe) => (
                                    <div
                                        key={recipe._id}
                                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                            selectedRecipes.has(recipe._id)
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => handleRecipeSelect(recipe._id)}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedRecipes.has(recipe._id)}
                                                onChange={() => handleRecipeSelect(recipe._id)}
                                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-medium text-gray-900 truncate">
                                                    {recipe.title}
                                                </h5>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {recipe.ingredients?.length || 0} ingredients • {' '}
                                                    {recipe.instructions?.length || 0} steps
                                                </div>
                                                {recipe.tags && recipe.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {recipe.tags.slice(0, 2).map((tag, index) => (
                                                            <span
                                                                key={index}
                                                                className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        {recipe.tags.length > 2 && (
                                                            <span className="text-gray-400 text-xs">
                                                                +{recipe.tags.length - 2} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <h4 className="font-medium text-gray-900 mb-3">📸 Photo Upload Instructions</h4>
                        <ul className="text-sm text-gray-700 space-y-2">
                            <li>• <strong>Select recipes</strong> that need photos using the checkboxes</li>
                            <li>• <strong>Upload multiple photos</strong> - they'll be distributed among selected recipes</li>
                            <li>• <strong>Photos are stored in MongoDB</strong> as binary data (up to 5MB each)</li>
                            <li>• <strong>First photo uploaded</strong> becomes the primary photo for each recipe</li>
                            <li>• <strong>Recommended:</strong> Use high-quality food photos with good lighting</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            Bulk upload photos to enhance your recipe collection
                        </p>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                        >
                            Close
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        </div>
    );
}