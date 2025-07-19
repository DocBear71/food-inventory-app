'use client';

// file: /src/components/recipes/RecipePhotoGallery.js - Photo display and management

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-config';

export default function RecipePhotoGallery({ recipeId, canEdit = false, className = "" }) {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (recipeId) {
            fetchPhotos();
        }
    }, [recipeId]);

    const fetchPhotos = async () => {
        try {
            setLoading(true);
            const response = await apiGet(`/api/recipes/photos?recipeId=${recipeId}`);
            const data = await response.json();

            if (data.success) {
                setPhotos(data.photos);
            } else {
                setError(data.error);
            }
        } catch (error) {
            console.error('Error fetching photos:', error);
            setError('Failed to load photos');
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
                await fetchPhotos(); // Refresh photos
            }
        } catch (error) {
            console.error('Error setting primary photo:', error);
        }
    };

    const deletePhoto = async (photoId) => {
        if (!confirm('Are you sure you want to delete this photo?')) {
            return;
        }

        try {
            const response = await apiDelete(`/api/recipes/photos/${photoId}`);

            if (response.ok) {
                await fetchPhotos(); // Refresh photos
                setShowModal(false);
            }
        } catch (error) {
            console.error('Error deleting photo:', error);
        }
    };

    const openModal = (photo) => {
        setSelectedPhoto(photo);
        setShowModal(true);
    };

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
                <p>{error}</p>
            </div>
        );
    }

    if (photos.length === 0) {
        return (
            <div className={`${className} text-center text-gray-500 py-8`}>
                <div className="text-4xl mb-2">📸</div>
                <p>No photos available</p>
                {canEdit && (
                    <p className="text-sm mt-2">Upload photos or search for AI-generated images</p>
                )}
            </div>
        );
    }

    const primaryPhoto = photos.find(p => p.isPrimary);
    const otherPhotos = photos.filter(p => !p.isPrimary);

    return (
        <div className={className}>
            {/* Primary Photo */}
            {primaryPhoto && (
                <div className="mb-4">
                    <div className="relative group">
                        <img
                            src={primaryPhoto.url}
                            alt={primaryPhoto.originalName}
                            className="w-full h-64 md:h-80 object-cover rounded-lg cursor-pointer"
                            onClick={() => openModal(primaryPhoto)}
                        />
                        <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                            Primary
                        </div>
                        {primaryPhoto.source !== 'user_upload' && (
                            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                                AI Generated
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Other Photos Grid */}
            {otherPhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {otherPhotos.map((photo) => (
                        <div key={photo._id} className="relative group">
                            <img
                                src={photo.url}
                                alt={photo.originalName}
                                className="w-full h-32 object-cover rounded-lg cursor-pointer"
                                onClick={() => openModal(photo)}
                            />
                            {photo.source !== 'user_upload' && (
                                <div className="absolute top-1 right-1 bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-xs">
                                    AI
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Photo Modal */}
            {showModal && selectedPhoto && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                {selectedPhoto.originalName}
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
                                <img
                                    src={selectedPhoto.url}
                                    alt={selectedPhoto.originalName}
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
                                                    {selectedPhoto.source.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Size:</span>
                                                <span className="ml-2">
                                                    {(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Added:</span>
                                                <span className="ml-2">
                                                    {new Date(selectedPhoto.uploadedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Analysis */}
                                    {selectedPhoto.aiAnalysis && (
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">AI Analysis</h4>
                                            <div className="space-y-2 text-sm">
                                                {selectedPhoto.aiAnalysis.description && (
                                                    <div>
                                                        <span className="text-gray-500">Description:</span>
                                                        <p className="mt-1 text-gray-700">
                                                            {selectedPhoto.aiAnalysis.description}
                                                        </p>
                                                    </div>
                                                )}
                                                {selectedPhoto.aiAnalysis.confidence && (
                                                    <div>
                                                        <span className="text-gray-500">Confidence:</span>
                                                        <span className="ml-2">
                                                            {(selectedPhoto.aiAnalysis.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedPhoto.aiAnalysis.tags && selectedPhoto.aiAnalysis.tags.length > 0 && (
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
                                            {!selectedPhoto.isPrimary && (
                                                <TouchEnhancedButton
                                                    onClick={() => setPrimaryPhoto(selectedPhoto._id)}
                                                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                                                >
                                                    Set as Primary Photo
                                                </TouchEnhancedButton>
                                            )}
                                            <TouchEnhancedButton
                                                onClick={() => deletePhoto(selectedPhoto._id)}
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