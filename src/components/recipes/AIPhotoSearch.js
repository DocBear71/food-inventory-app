'use client';

// file: /src/components/recipes/AIPhotoSearch.js - AI-powered photo search and selection

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiPost } from '@/lib/api-config';

export default function AIPhotoSearch({ recipeId, onPhotoAdded, onClose }) {
    const [searchType, setSearchType] = useState('ingredients');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const searchTypes = [
        { value: 'ingredients', label: 'Based on Ingredients', description: 'Search using main recipe ingredients' },
        { value: 'title', label: 'Based on Title', description: 'Search using the recipe title' },
        { value: 'combined', label: 'Combined Search', description: 'Use title, ingredients, and tags' }
    ];

    const handleSearch = async () => {
        setSearching(true);
        setError(null);
        setSearchResults([]);

        try {
            const response = await apiPost('/api/recipes/photos/search', {
                recipeId,
                searchType,
                autoSelect: false
            });

            const data = await response.json();

            if (data.success) {
                setSearchResults(data.photos || []);
                if (data.photos.length === 0) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showAlert({
                        title: 'No Photos Found',
                        message: 'No suitable photos found. Try a different search type.'
                    });
                }
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Search Failed',
                    message: data.error || 'Search failed'
                });
            }
        } catch (error) {
            console.error('Photo search error:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Search Error',
                message: 'Failed to search for photos'
            });
        } finally {
            setSearching(false);
        }
    };

    const handleAutoSelect = async () => {
        setSearching(true);
        setError(null);

        try {
            const response = await apiPost('/api/recipes/photos/search', {
                recipeId,
                searchType,
                autoSelect: true
            });

            const data = await response.json();

            if (data.success && data.autoSelected) {
                onPhotoAdded(data.photo);
                onClose();
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Auto-Select Failed',
                    message: data.error || 'Auto-select failed'
                });
            }
        } catch (error) {
            console.error('Auto-select error:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Auto-Select Error',
                message: 'Failed to auto-select photo'
            });
        } finally {
            setSearching(false);
        }
    };

    const saveSelectedPhoto = async () => {
        if (!selectedPhoto) return;

        setSaving(true);
        setError(null);

        try {
            // Download and save the selected photo
            const response = await fetch('/api/recipes/photos/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipeId,
                    photoUrl: selectedPhoto.url,
                    metadata: selectedPhoto,
                    isPrimary: true // Set as primary if it's the first photo
                })
            });

            const data = await response.json();

            if (data.success) {
                onPhotoAdded(data.photo);
                onClose();
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Save Failed',
                    message: data.error || 'Failed to save photo'
                });
            }
        } catch (error) {
            console.error('Save photo error:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Save Error',
                message: 'Failed to save selected photo'
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-gray-900">
                            AI Photo Search
                        </h3>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        Find the perfect photo for your recipe using AI-powered image search
                    </p>
                </div>

                {/* Search Controls */}
                <div className="p-6 border-b border-gray-200 flex-shrink-0">
                    <div className="space-y-4">
                        {/* Search Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Search Method
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {searchTypes.map((type) => (
                                    <label
                                        key={type.value}
                                        className={`relative flex flex-col p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                                            searchType === type.value
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="searchType"
                                            value={type.value}
                                            checked={searchType === type.value}
                                            onChange={(e) => setSearchType(e.target.value)}
                                            className="sr-only"
                                        />
                                        <div className="flex items-center">
                                            <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                                                searchType === type.value
                                                    ? 'border-blue-500 bg-blue-500'
                                                    : 'border-gray-300'
                                            }`}>
                                                {searchType === type.value && (
                                                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1"></div>
                                                )}
                                            </div>
                                            <span className="font-medium text-gray-900">{type.label}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1 ml-7">{type.description}</p>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Search Buttons */}
                        <div className="flex flex-wrap gap-3">
                            <TouchEnhancedButton
                                onClick={handleSearch}
                                disabled={searching}
                                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                            >
                                {searching ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Searching...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <span>Search Photos</span>
                                    </>
                                )}
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={handleAutoSelect}
                                disabled={searching}
                                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                            >
                                {searching ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Auto-selecting...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span>Auto-Select Best</span>
                                    </>
                                )}
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex-shrink-0">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-red-700">{error}</span>
                        </div>
                    </div>
                )}

                {/* Search Results */}
                <div className="flex-1 overflow-y-auto p-6">
                    {searchResults.length > 0 ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-lg font-medium text-gray-900">
                                    Search Results ({searchResults.length} photos)
                                </h4>
                                <div className="text-sm text-gray-500">
                                    Click a photo to select it
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {searchResults.map((photo, index) => (
                                    <div
                                        key={index}
                                        className={`relative bg-white border-2 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                                            selectedPhoto === photo
                                                ? 'border-blue-500 shadow-lg'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => setSelectedPhoto(photo)}
                                    >
                                        {/* Photo */}
                                        <div className="aspect-w-16 aspect-h-12">
                                            <img
                                                src={photo.thumbnail || photo.url}
                                                alt={photo.description}
                                                className="w-full h-48 object-cover"
                                            />
                                        </div>

                                        {/* Selection Indicator */}
                                        {selectedPhoto === photo && (
                                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Photo Info */}
                                        <div className="p-4">
                                            <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                                                {photo.description}
                                            </p>

                                            {/* Quality Scores */}
                                            <div className="flex items-center space-x-4 mb-3">
                                                <div className="flex items-center">
                                                    <span className="text-xs text-gray-500 mr-1">Relevance:</span>
                                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-green-500 h-2 rounded-full"
                                                            style={{ width: `${(photo.foodRelevanceScore || 0) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs text-gray-600 ml-1">
                                                        {Math.round((photo.foodRelevanceScore || 0) * 100)}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Tags */}
                                            {photo.tags && photo.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {photo.tags.slice(0, 3).map((tag, tagIndex) => (
                                                        <span
                                                            key={tagIndex}
                                                            className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {photo.tags.length > 3 && (
                                                        <span className="text-gray-400 text-xs">
                                                            +{photo.tags.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Source */}
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span className="capitalize">{photo.source}</span>
                                                {photo.attribution && (
                                                    <span>by {photo.attribution.photographer}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : !searching && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🔍</div>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">Ready to Search</h4>
                            <p className="text-gray-500 mb-6">
                                Choose a search method above and click "Search Photos" to find the perfect image for your recipe.
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
                                <h5 className="font-medium text-blue-900 mb-2">💡 Tips for Better Results:</h5>
                                <ul className="text-sm text-blue-700 space-y-1">
                                    <li>• "Ingredients" works best for specific dishes</li>
                                    <li>• "Title" is good for well-known recipes</li>
                                    <li>• "Combined" gives the most options</li>
                                    <li>• "Auto-Select" picks the best match instantly</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {selectedPhoto && (
                    <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                <strong>Selected:</strong> {selectedPhoto.description}
                                {selectedPhoto.attribution && (
                                    <span className="block text-xs mt-1">
                                        Photo by {selectedPhoto.attribution.photographer} on {selectedPhoto.attribution.source}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center space-x-3">
                                <TouchEnhancedButton
                                    onClick={() => setSelectedPhoto(null)}
                                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                                >
                                    Deselect
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={saveSelectedPhoto}
                                    disabled={saving}
                                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {saving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                            </svg>
                                            <span>Save Photo</span>
                                        </>
                                    )}
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}