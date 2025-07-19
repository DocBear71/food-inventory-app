'use client';

// file: /src/components/recipes/RecipePhotoUpload.js - Fixed export

import React, { useState, useRef } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';

// Changed to default export to match the import in page.js
export default function RecipePhotoUpload({ recipeId, existingPhotos = [], onPhotosUpdate }) {
    const [photos, setPhotos] = useState(existingPhotos);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = (files) => {
        const fileArray = Array.from(files);
        const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
            // Validate file sizes (5MB limit for MongoDB binary storage)
            const oversizedFiles = imageFiles.filter(file => file.size > 5242880);
            if (oversizedFiles.length > 0) {
                setError(`Some files are too large. Maximum size is 5MB per photo.`);
                MobileHaptics?.error();
                return;
            }

            uploadPhotos(imageFiles);
        } else {
            setError('Please select image files only.');
            MobileHaptics?.error();
        }
    };

    const uploadPhotos = async (files) => {
        setUploading(true);
        setError(null);
        MobileHaptics?.light();

        try {
            const uploadPromises = files.map(async (file, index) => {
                const formData = new FormData();
                formData.append('photo', file);
                formData.append('recipeId', recipeId);
                formData.append('isPrimary', (photos.length === 0 && index === 0).toString());
                formData.append('source', 'user_upload');

                const response = await fetch('/api/recipes/photos', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Upload failed');
                }

                return response.json();
            });

            const results = await Promise.all(uploadPromises);
            const newPhotos = results.filter(result => result.success).map(result => result.photo);

            const updatedPhotos = [...photos, ...newPhotos];
            setPhotos(updatedPhotos);
            onPhotosUpdate?.(updatedPhotos);

            MobileHaptics?.success();
            console.log(`✅ Successfully uploaded ${newPhotos.length} photos to MongoDB`);
        } catch (error) {
            console.error('Error uploading photos:', error);
            setError(error.message || 'Upload failed. Please try again.');
            MobileHaptics?.error();
        } finally {
            setUploading(false);
        }
    };

    const deletePhoto = async (photoId) => {
        try {
            const response = await fetch(`/api/recipes/photos/${photoId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`🗑️ Deleted photo (${result.storageType} storage)`);

                const updatedPhotos = photos.filter(photo => photo._id !== photoId && photo.id !== photoId);
                setPhotos(updatedPhotos);
                onPhotosUpdate?.(updatedPhotos);
                MobileHaptics?.light();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Error deleting photo:', error);
            setError(error.message || 'Failed to delete photo');
            MobileHaptics?.error();
        }
    };

    const setPrimaryPhoto = async (photoId) => {
        try {
            const response = await fetch(`/api/recipes/photos/${photoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isPrimary: true }),
                credentials: 'include'
            });

            if (response.ok) {
                const updatedPhotos = photos.map(photo => ({
                    ...photo,
                    isPrimary: (photo._id === photoId || photo.id === photoId)
                }));
                setPhotos(updatedPhotos);
                onPhotosUpdate?.(updatedPhotos);
                MobileHaptics?.light();
            }
        } catch (error) {
            console.error('Error setting primary photo:', error);
            setError('Failed to set primary photo');
            MobileHaptics?.error();
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        const files = e.dataTransfer.files;
        handleFileSelect(files);
    };

    // Helper functions
    const getPhotoId = (photo) => photo._id || photo.id;
    const getPhotoUrl = (photo) => {
        if (photo.url) return photo.url;
        if (photo._id) return `/api/recipes/photos/${photo._id}`;
        if (photo.id) return `/api/recipes/photos/${photo.id}`;
        return '';
    };

    return (
        <div className="space-y-6">
            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : uploading
                            ? 'border-gray-300 bg-gray-50'
                            : 'border-gray-300 hover:border-gray-400'
                } ${uploading ? 'pointer-events-none' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    disabled={uploading}
                />

                {uploading ? (
                    <div className="space-y-4">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                        <div>
                            <div className="text-xl font-medium text-gray-900">Uploading photos...</div>
                            <div className="text-sm text-gray-500">Please wait while we process your images</div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-6xl">📸</div>
                        <div>
                            <div className="text-2xl font-medium text-gray-900 mb-2">Add Recipe Photos</div>
                            <div className="text-gray-600 mb-1">
                                Drag and drop images here, or use the options below
                            </div>
                            <div className="text-sm text-gray-400">
                                Supports JPEG, PNG, WebP up to 5MB each
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <TouchEnhancedButton
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-3 text-lg font-medium"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>Choose Photos</span>
                            </TouchEnhancedButton>

                            {/* Camera option for mobile */}
                            <TouchEnhancedButton
                                onClick={() => {
                                    if (fileInputRef.current) {
                                        fileInputRef.current.capture = "environment";
                                        fileInputRef.current.click();
                                    }
                                }}
                                disabled={uploading}
                                className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-3 text-lg font-medium"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>Take Photo</span>
                            </TouchEnhancedButton>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-red-700 text-sm">{error}</span>
                        </div>
                        <TouchEnhancedButton
                            onClick={() => setError(null)}
                            className="text-red-400 hover:text-red-600"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>
                </div>
            )}

            {/* Photos Grid */}
            {photos.length > 0 && (
                <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                        Recipe Photos ({photos.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {photos.map((photo) => {
                            const photoId = getPhotoId(photo);
                            const photoUrl = getPhotoUrl(photo);

                            return (
                                <div key={photoId} className="relative group">
                                    <img
                                        src={photoUrl}
                                        alt={photo.originalName || photo.alt || 'Recipe photo'}
                                        className="w-full h-32 object-cover rounded-lg shadow-md"
                                        loading="lazy"
                                    />

                                    {/* Photo Controls Overlay */}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <div className="flex space-x-2">
                                            {/* Set Primary Button */}
                                            {!photo.isPrimary && (
                                                <TouchEnhancedButton
                                                    onClick={() => setPrimaryPhoto(photoId)}
                                                    className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
                                                    title="Set as primary photo"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                    </svg>
                                                </TouchEnhancedButton>
                                            )}

                                            {/* Delete Button */}
                                            <TouchEnhancedButton
                                                onClick={() => deletePhoto(photoId)}
                                                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                                                title="Delete photo"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>

                                    {/* Photo Badges */}
                                    <div className="absolute top-2 left-2 flex flex-col space-y-1">
                                        {/* Primary photo badge */}
                                        {photo.isPrimary && (
                                            <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                </svg>
                                                <span>Primary</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* File size info */}
                                    {photo.size && (
                                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                            {(photo.size / 1024 / 1024).toFixed(1)}MB
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Upload Tips */}
            {photos.length === 0 && !uploading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-medium text-blue-900 mb-3">📸 Photo Tips for Great Recipe Images</h4>
                    <ul className="text-sm text-blue-700 space-y-2">
                        <li>• <strong>Good lighting:</strong> Use natural light near a window</li>
                        <li>• <strong>Clean background:</strong> Simple plates and surfaces work best</li>
                        <li>• <strong>Multiple angles:</strong> Upload photos of ingredients, cooking process, and final dish</li>
                        <li>• <strong>First photo matters:</strong> Your first upload becomes the primary recipe image</li>
                        <li>• <strong>High quality:</strong> Use your phone's main camera for best results</li>
                    </ul>
                </div>
            )}
        </div>
    );
}

// Also export as named export for backward compatibility
export { RecipePhotoUpload };