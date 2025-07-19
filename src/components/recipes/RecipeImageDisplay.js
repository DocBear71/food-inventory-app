'use client';

// file: /src/components/recipes/RecipeImageDisplay.js v1 - Component for displaying recipe images

import { useState } from 'react';
import Image from 'next/image';

export default function RecipeImageDisplay({ recipe, className = '', showImageInfo = false, size = 'medium' }) {
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Get image data using the recipe method
    const displayImage = recipe.getDisplayImage ? recipe.getDisplayImage() : getRecipeDisplayImage(recipe);

    // Size configurations
    const sizeConfig = {
        small: { width: 150, height: 150, className: 'w-24 h-24' },
        medium: { width: 300, height: 225, className: 'w-full h-48' },
        large: { width: 600, height: 400, className: 'w-full h-96' },
        card: { width: 400, height: 300, className: 'w-full h-64' }
    };

    const config = sizeConfig[size] || sizeConfig.medium;

    // Fallback function for when recipe method isn't available
    function getRecipeDisplayImage(recipe) {
        if (recipe.extractedImage?.data) {
            return {
                type: 'extracted',
                data: `data:image/jpeg;base64,${recipe.extractedImage.data}`,
                source: recipe.extractedImage.source,
                method: recipe.extractedImage.extractionMethod
            };
        }

        if (recipe.imageUrl) {
            return {
                type: 'uploaded',
                data: recipe.imageUrl,
                source: 'user_upload',
                method: 'manual_upload'
            };
        }

        return null;
    }

    const handleImageLoad = () => {
        setIsLoading(false);
    };

    const handleImageError = () => {
        setImageError(true);
        setIsLoading(false);
    };

    const getImageSourceInfo = (imageData) => {
        if (!imageData) return null;

        const sourceInfo = {
            extracted: {
                tiktok: { icon: '🎵', name: 'TikTok', color: 'bg-pink-100 text-pink-800' },
                instagram: { icon: '📸', name: 'Instagram', color: 'bg-purple-100 text-purple-800' },
                facebook: { icon: '👥', name: 'Facebook', color: 'bg-blue-100 text-blue-800' },
                unknown: { icon: '🎥', name: 'Video', color: 'bg-gray-100 text-gray-800' }
            },
            uploaded: {
                icon: '📁', name: 'Uploaded', color: 'bg-green-100 text-green-800'
            },
            imported: {
                icon: '🌐', name: 'Website', color: 'bg-indigo-100 text-indigo-800'
            }
        };

        if (imageData.type === 'extracted') {
            return sourceInfo.extracted[imageData.source] || sourceInfo.extracted.unknown;
        } else if (imageData.type === 'uploaded') {
            return sourceInfo.uploaded;
        } else {
            return sourceInfo.imported;
        }
    };

    // If no image, show placeholder
    if (!displayImage || imageError) {
        return (
            <div className={`${config.className} ${className} bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300`}>
                <div className="text-center text-gray-500">
                    <div className="text-3xl mb-2">🍽️</div>
                    <div className="text-sm font-medium">No Image</div>
                    {recipe.videoMetadata?.videoPlatform && (
                        <div className="text-xs mt-1">
                            Video from {recipe.videoMetadata.videoPlatform}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const imageSourceInfo = getImageSourceInfo(displayImage);

    return (
        <div className={`relative ${className}`}>
            {/* Main Image */}
            <div className={`${config.className} relative overflow-hidden rounded-lg bg-gray-100`}>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                )}

                {displayImage.type === 'extracted' ? (
                    // Base64 image from video extraction
                    <img
                        src={displayImage.data}
                        alt={recipe.title || 'Recipe image'}
                        className="w-full h-full object-cover"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                    />
                ) : (
                    // URL-based image (uploaded or imported)
                    <Image
                        src={displayImage.data}
                        alt={recipe.title || 'Recipe image'}
                        width={config.width}
                        height={config.height}
                        className="object-cover"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        priority={size === 'large'}
                    />
                )}

                {/* Image Source Badge */}
                {imageSourceInfo && (
                    <div className="absolute top-2 right-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${imageSourceInfo.color}`}>
                            <span className="mr-1">{imageSourceInfo.icon}</span>
                            {imageSourceInfo.name}
                        </span>
                    </div>
                )}

                {/* AI Extraction Badge */}
                {displayImage.type === 'extracted' && (
                    <div className="absolute bottom-2 right-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <span className="mr-1">🤖</span>
                            AI Extracted
                        </span>
                    </div>
                )}
            </div>

            {/* Image Information Panel */}
            {showImageInfo && imageSourceInfo && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                        📸 Image Information
                    </h4>
                    <div className="space-y-2 text-xs text-gray-600">
                        <div className="flex items-center justify-between">
                            <span>Source:</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${imageSourceInfo.color}`}>
                                {imageSourceInfo.icon} {imageSourceInfo.name}
                            </span>
                        </div>

                        {displayImage.type === 'extracted' && (
                            <>
                                <div className="flex items-center justify-between">
                                    <span>Extraction Method:</span>
                                    <span className="font-medium">AI Frame Analysis</span>
                                </div>
                                {recipe.extractedImage?.frameCount && (
                                    <div className="flex items-center justify-between">
                                        <span>Frames Analyzed:</span>
                                        <span className="font-medium">{recipe.extractedImage.frameCount}</span>
                                    </div>
                                )}
                                {recipe.extractedImage?.confidence && (
                                    <div className="flex items-center justify-between">
                                        <span>AI Confidence:</span>
                                        <span className="font-medium">
                                            {Math.round(recipe.extractedImage.confidence * 100)}%
                                        </span>
                                    </div>
                                )}
                                {recipe.extractedImage?.extractedAt && (
                                    <div className="flex items-center justify-between">
                                        <span>Extracted:</span>
                                        <span className="font-medium">
                                            {new Date(recipe.extractedImage.extractedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {displayImage.method && (
                            <div className="flex items-center justify-between">
                                <span>Method:</span>
                                <span className="font-medium capitalize">
                                    {displayImage.method.replace(/_/g, ' ')}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Video Source Link */}
                    {displayImage.type === 'extracted' && recipe.videoMetadata?.videoSource && (
                        <div className="mt-3 pt-2 border-t border-gray-200">
                            <a
                                href={recipe.videoMetadata.videoSource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-purple-600 hover:text-purple-800"
                            >
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8 5v10l7-5-7-5z"/>
                                </svg>
                                View Original Video
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Utility component for recipe cards
export function RecipeCardImage({ recipe, className = '' }) {
    return (
        <RecipeImageDisplay
            recipe={recipe}
            size="card"
            className={className}
            showImageInfo={false}
        />
    );
}

// Utility component for recipe detail pages
export function RecipeDetailImage({ recipe, className = '' }) {
    return (
        <RecipeImageDisplay
            recipe={recipe}
            size="large"
            className={className}
            showImageInfo={true}
        />
    );
}

// Utility component for recipe thumbnails
export function RecipeThumbnailImage({ recipe, className = '' }) {
    return (
        <RecipeImageDisplay
            recipe={recipe}
            size="small"
            className={className}
            showImageInfo={false}
        />
    );
}