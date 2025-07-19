'use client';

// file: /src/components/recipes/RecipeImageManager.js - SIMPLIFIED version

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import {apiPost} from "@/lib/api-config.js";

export default function RecipeImageManager({ recipe, onImageUpdate }) {
    const [uploading, setUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);

    const handleImageUpload = async (file) => {
        if (!file) return;

        setUploading(true);
        try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('recipeImage', file);
            formData.append('recipeId', recipe._id);

            const response = await apiPost('/api/recipes/photos/upload', {
                formData
            });

            const data = await response.json();

            if (data.success) {
                onImageUpdate(data.imageUrl);
                setImagePreview(data.imageUrl);
            } else {
                console.error('Upload failed:', data.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setUploading(false);
        }
    };

    const displayImage = recipe.getDisplayImage ? recipe.getDisplayImage() : null;

    return (
        <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📸 Recipe Image
            </h3>

            {displayImage ? (
                <div className="space-y-4">
                    {/* Current Image */}
                    <div className="relative">
                        <img
                            src={displayImage.data}
                            alt={recipe.title}
                            className="w-full h-64 object-cover rounded-lg"
                        />

                        {/* Image Source Badge */}
                        <div className="absolute top-2 right-2">
                            {displayImage.type === 'extracted' ? (
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                                    🤖 AI Extracted from {displayImage.source}
                                </span>
                            ) : (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                    📁 User Uploaded
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Replace Image Option */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-3">
                            Want to use your own photo instead?
                        </p>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e.target.files[0])}
                            className="hidden"
                            id="replace-image-upload"
                            disabled={uploading}
                        />
                        <label
                            htmlFor="replace-image-upload"
                            className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                        >
                            {uploading ? 'Uploading...' : 'Replace Image'}
                        </label>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Upload Area */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e.target.files[0])}
                            className="hidden"
                            id="recipe-image-upload"
                            disabled={uploading}
                        />
                        <label
                            htmlFor="recipe-image-upload"
                            className="cursor-pointer flex flex-col items-center"
                        >
                            <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-lg font-medium text-gray-700 mb-2">
                                {uploading ? 'Uploading...' : 'Upload Recipe Photo'}
                            </span>
                            <span className="text-sm text-gray-500">
                                PNG, JPG, or WebP up to 5MB
                            </span>
                        </label>
                    </div>

                    {/* Social Media Tip */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <span className="text-blue-600 mr-2 mt-0.5">💡</span>
                            <div className="text-sm text-blue-800">
                                <strong>Tip:</strong> When you import recipes from TikTok, Instagram, or Facebook videos,
                                we automatically extract the best food image using AI - no upload needed!
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}