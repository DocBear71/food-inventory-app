'use client';
// file: /src/components/recipes/RecipePhotoGallery.js - Unified version supporting both photo systems

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-config';
import Image from 'next/image';

export default function RecipePhotoGallery({ recipeId, canEdit = false, className = "", refreshTrigger = 0 }) {
    const [photos, setPhotos] = useState([]);
    const [recipeImageData, setRecipeImageData] = useState(null); // For uploadedImage in recipe
    const [loading, setLoading] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (recipeId) {
            fetchAllPhotos();
        }
    }, [recipeId, refreshTrigger]);

    const fetchAllPhotos = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch both recipe data and separate photos
            const [recipeResponse, photosResponse] = await Promise.all([
                apiGet(`/api/recipes/${recipeId}`),
                apiGet(`/api/recipes/photos?recipeId=${recipeId}`)
            ]);

            // Handle recipe's built-in image
            const recipeData = await recipeResponse.json();
            if (recipeData.success && recipeData.recipe) {
                const recipe = recipeData.recipe;

                // Check for uploadedImage or extractedImage
                if (recipe.uploadedImage?.data) {
                    setRecipeImageData({
                        id: `recipe-uploaded-${recipeId}`,
                        type: 'uploaded',
                        url: `/api/recipes/photos/upload?recipeId=${recipeId}`,
                        dataUrl: `data:${recipe.uploadedImage.mimeType};base64,${recipe.uploadedImage.data}`,
                        source: 'user_upload',
                        isPrimary: true, // Recipe's main image is always primary
                        originalName: recipe.uploadedImage.originalName || 'Recipe Photo',
                        size: recipe.uploadedImage.size,
                        uploadedAt: recipe.uploadedImage.uploadedAt,
                        mimeType: recipe.uploadedImage.mimeType
                    });
                } else if (recipe.extractedImage?.data) {
                    setRecipeImageData({
                        id: `recipe-extracted-${recipeId}`,
                        type: 'extracted',
                        url: `/api/recipes/photos/upload?recipeId=${recipeId}`,
                        dataUrl: `data:image/jpeg;base64,${recipe.extractedImage.data}`,
                        source: 'ai_generated',
                        isPrimary: true,
                        originalName: 'AI Extracted Photo',
                        extractionMethod: recipe.extractedImage.extractionMethod,
                        confidence: recipe.extractedImage.confidence,
                        uploadedAt: recipe.extractedImage.extractedAt
                    });
                } else {
                    setRecipeImageData(null);
                }
            }

            // Handle separate photos collection
            if (photosResponse.ok) {
                const photosData = await photosResponse.json();
                if (photosData.success) {
                    setPhotos(photosData.photos || []);
                } else {
                    console.warn('Photos fetch warning:', photosData.error);
                    setPhotos([]);
                }
            } else {
                console.warn('Photos endpoint not available, using recipe image only');
                setPhotos([]);
            }

        } catch (error) {
            console.error('Error fetching photos:', error);
            setError('Failed to load photos');
            setPhotos([]);
            setRecipeImageData(null);
        } finally {
            setLoading(false);
        }
    };

    const setPrimaryPhoto = async (photoId) => {
        try {
            const response = await apiPut(`/api/recipes/photos/${photoId}`, {
                isPrimary: true
            });

            if (response.ok) {
                await fetchAllPhotos(); // Refresh all photos
            }
        } catch (error) {
            console.error('Error setting primary photo:', error);
        }
    };

    const deletePhoto = async (photo) => {
        if (!confirm('Are you sure you want to delete this photo?')) {
            return;
        }

        try {
            let response;

            if (photo.type === 'uploaded' || photo.type === 'extracted') {
                // Delete recipe's built-in image
                response = await fetch(`/api/recipes/photos/upload?recipeId=${recipeId}`, {
                    method: 'DELETE',
                });
            } else {
                // Delete separate photo document
                response = await apiDelete(`/api/recipes/photos/${photo._id}`);
            }

            if (response.ok) {
                await fetchAllPhotos(); // Refresh all photos
                setShowModal(false);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete photo');
            }
        } catch (error) {
            console.error('Error deleting photo:', error);
            setError('Failed to delete photo');
        }
    };

    const openModal = (photo) => {
        setSelectedPhoto(photo);
        setShowModal(true);
    };

    // Combine all photos for display
    const allPhotos = [];

    // Add recipe's built-in image first (if exists)
    if (recipeImageData) {
        allPhotos.push(recipeImageData);
    }

    // Add separate photos
    allPhotos.push(...photos);

    // Find primary photo (recipe image takes precedence)
    const primaryPhoto = allPhotos.find(p => p.isPrimary) || allPhotos[0];
    const otherPhotos = allPhotos.filter(p => p !== primaryPhoto);

    if (loading) {
        return (
            <div className={`${className}`}>
                <div className="animate-pulse bg-gray-200 rounded-lg h-48"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${className} text-center text-gray-500 py-8`}>
                <div className="text-red-500 mb-2">
                    <svg className="mx-auto h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                </div>
                <p className="text-sm text-red-600">{error}</p>
                <TouchEnhancedButton
                    onClick={fetchAllPhotos}
                    className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                >
                    Try Again
                </TouchEnhancedButton>
            </div>
        );
    }

    if (allPhotos.length === 0) {
        return (
            <div className={`${className} text-center text-gray-500 py-8`}>
                <div className="text-4xl mb-2">📸</div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Photos Yet</h3>
                <p className="text-sm">
                    {canEdit ?
                        'Upload photos to showcase this recipe!' :
                        'This recipe doesn\'t have any photos yet.'
                    }
                </p>
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Primary Photo */}
            {primaryPhoto && (
                <div className="mb-4">
                    <div className="relative group">
                        <div className="relative h-64 md:h-80 rounded-lg overflow-hidden bg-gray-100">
                            <Image
                                src={primaryPhoto.dataUrl || primaryPhoto.url}
                                alt={primaryPhoto.originalName || 'Recipe photo'}
                                fill
                                className="object-cover cursor-pointer transition-transform group-hover:scale-105"
                                onClick={() => openModal(primaryPhoto)}
                                unoptimized={true}
                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                            />
                        </div>

                        {/* Primary badge */}
                        <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                            Primary
                        </div>

                        {/* Source indicator */}
                        {primaryPhoto.source !== 'user_upload' && (
                            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                                {primaryPhoto.type === 'extracted' ? 'AI Extracted' : 'AI Generated'}
                            </div>
                        )}

                        {/* User upload indicator */}
                        {primaryPhoto.source === 'user_upload' && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                                📷 User Photo
                            </div>
                        )}

                        {/* Click to enlarge hint */}
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            🔍 Click to enlarge
                        </div>
                    </div>
                </div>
            )}

            {/* Other Photos Grid */}
            {otherPhotos.length > 0 && (
                <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Additional Photos</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {otherPhotos.map((photo) => (
                            <div key={photo.id || photo._id} className="relative group">
                                <div className="relative h-32 rounded-lg overflow-hidden bg-gray-100">
                                    <Image
                                        src={photo.dataUrl || photo.url}
                                        alt={photo.originalName || 'Recipe photo'}
                                        fill
                                        className="object-cover cursor-pointer transition-transform group-hover:scale-105"
                                        onClick={() => openModal(photo)}
                                        unoptimized={true}
                                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                    />
                                </div>

                                {/* Source indicator */}
                                {photo.source !== 'user_upload' && (
                                    <div className="absolute top-1 right-1 bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-xs">
                                        AI
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Photo Modal */}
            {showModal && selectedPhoto && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                {selectedPhoto.originalName || 'Recipe Photo'}
                            </h3>
                            <TouchEnhancedButton
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>

                        {/* Modal Content */}
                        <div className="flex flex-col md:flex-row max-h-[calc(90vh-120px)]">
                            {/* Image */}
                            <div className="flex-1 flex items-center justify-center bg-gray-100">
                                <Image
                                    src={selectedPhoto.dataUrl || selectedPhoto.url}
                                    alt={selectedPhoto.originalName || 'Recipe photo'}
                                    width={800}
                                    height={600}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>

                            {/* Photo Info */}
                            <div className="w-full md:w-80 p-4 bg-gray-50 overflow-y-auto">
                                <div className="space-y-4">
                                    {/* Photo Details */}
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Photo Details</h4>
                                        <div className="space-y-2 text-sm">
                                            <div>
                                                <span className="text-gray-500">Source:</span>
                                                <span className="ml-2 capitalize">
                                                    {selectedPhoto.source?.replace('_', ' ') || 'Unknown'}
                                                </span>
                                            </div>
                                            {selectedPhoto.size && (
                                                <div>
                                                    <span className="text-gray-500">Size:</span>
                                                    <span className="ml-2">
                                                        {(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-gray-500">Added:</span>
                                                <span className="ml-2">
                                                    {new Date(selectedPhoto.uploadedAt || selectedPhoto.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {selectedPhoto.type && (
                                                <div>
                                                    <span className="text-gray-500">Type:</span>
                                                    <span className="ml-2 capitalize">
                                                        {selectedPhoto.type}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* AI Analysis or Extraction Info */}
                                    {(selectedPhoto.aiAnalysis || selectedPhoto.extractionMethod) && (
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">AI Information</h4>
                                            <div className="space-y-2 text-sm">
                                                {selectedPhoto.extractionMethod && (
                                                    <div>
                                                        <span className="text-gray-500">Extraction Method:</span>
                                                        <span className="ml-2 capitalize">
                                                            {selectedPhoto.extractionMethod.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedPhoto.confidence && (
                                                    <div>
                                                        <span className="text-gray-500">Confidence:</span>
                                                        <span className="ml-2">
                                                            {(selectedPhoto.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedPhoto.aiAnalysis?.description && (
                                                    <div>
                                                        <span className="text-gray-500">Description:</span>
                                                        <p className="mt-1 text-gray-700">
                                                            {selectedPhoto.aiAnalysis.description}
                                                        </p>
                                                    </div>
                                                )}
                                                {selectedPhoto.aiAnalysis?.tags && selectedPhoto.aiAnalysis.tags.length > 0 && (
                                                    <div>
                                                        <span className="text-gray-500">Tags:</span>
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {selectedPhoto.aiAnalysis.tags.map((tag, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Attribution */}
                                    {selectedPhoto.searchMetadata?.attribution && (
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Attribution</h4>
                                            <div className="text-sm text-gray-700">
                                                <p>
                                                    Photo by{' '}
                                                    <a
                                                        href={selectedPhoto.searchMetadata.attribution.photographerUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        {selectedPhoto.searchMetadata.attribution.photographer}
                                                    </a>
                                                    {' '}on{' '}
                                                    <a
                                                        href={selectedPhoto.searchMetadata.attribution.sourceUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        {selectedPhoto.searchMetadata.attribution.source}
                                                    </a>
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {canEdit && (
                                        <div className="space-y-2 pt-4 border-t border-gray-200">
                                            {!selectedPhoto.isPrimary && selectedPhoto._id && (
                                                <TouchEnhancedButton
                                                    onClick={() => setPrimaryPhoto(selectedPhoto._id)}
                                                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                                                >
                                                    Set as Primary Photo
                                                </TouchEnhancedButton>
                                            )}
                                            <TouchEnhancedButton
                                                onClick={() => deletePhoto(selectedPhoto)}
                                                className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700"
                                            >
                                                Delete Photo
                                            </TouchEnhancedButton>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}