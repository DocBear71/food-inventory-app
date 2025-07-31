'use client';
// file: /src/app/recipes/[id]/page.js v15 - Fixed multi-part recipe display with proper JSX structure

import {useEffect, useState} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import {useParams, useRouter} from 'next/navigation';
import Image from 'next/image';
import {StarRating, RatingStats} from '@/components/reviews/RecipeRating';
import RecipeReviewsSection from '@/components/reviews/RecipeReviewsSection';
import NutritionFacts from '@/components/nutrition/NutritionFacts';
import RecipeShoppingList from '@/components/recipes/RecipeShoppingList';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import {apiGet, apiPost, apiPut} from '@/lib/api-config';
import AddToCollectionButton from "@/components/recipes/AddToCollectionButton";
import {useSubscription, useFeatureGate} from '@/hooks/useSubscription';
import {FEATURE_GATES} from '@/lib/subscription-config';
import NutritionModal from '@/components/nutrition/NutritionModal';
import RecipePhotoGallery from '@/components/recipes/RecipePhotoGallery';
import RecipePhotoUpload from '@/components/recipes/RecipePhotoUpload';
import RecipeTransformationPanel from '@/components/recipes/RecipeTransformationPanel';

// Hero Recipe Image Component - ENHANCED with full schema support
const RecipeHeroImage = ({recipe, session, className = "", onImageUpdate}) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [showFullImage, setShowFullImage] = useState(false);
    const [showImageSelector, setShowImageSelector] = useState(false);
    const [availableImages, setAvailableImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPrimaryPhoto, setCurrentPrimaryPhoto] = useState(null);

    // Fetch current primary photo from collection
    useEffect(() => {
        fetchCurrentPrimaryPhoto();
    }, [recipe._id, recipe.primaryPhoto]);

    // Add this useEffect to run the priority fix
    useEffect(() => {
        if (recipe && recipe._id) {
            // Run priority fix when recipe loads
            fixImagePriorityMismatch();
        }
    }, [recipe?._id, recipe?.imagePriority, recipe?.primaryPhoto]);


    // Add this enhanced sync function to fix priority mismatches
    const fixImagePriorityMismatch = async () => {
        if (!recipe._id) return;

        try {
            console.log('🔧 Checking for image priority mismatch...');
            console.log('Current priority:', recipe.imagePriority);
            console.log('Has primaryPhoto:', !!recipe.primaryPhoto);
            console.log('Has imageUrl:', !!recipe.imageUrl);

            let needsUpdate = false;
            let updateData = {};

            // Case 1: Has primaryPhoto but wrong priority
            if (recipe.primaryPhoto && recipe.imagePriority !== 'primary_photo') {
                console.log('🔧 Fixing: Has primaryPhoto but wrong priority');
                updateData = {
                    imagePriority: 'primary_photo',
                    'imageMetadata.primarySource': 'photo_collection',
                    hasUserImage: true
                };
                needsUpdate = true;
            }

            // Case 2: Has external URL but no primaryPhoto and wrong priority
            else if (recipe.imageUrl && !recipe.primaryPhoto && recipe.imagePriority !== 'external_url') {
                console.log('🔧 Fixing: Has imageUrl but wrong priority');
                updateData = {
                    imagePriority: 'external_url',
                    'imageMetadata.primarySource': 'external_url'
                };
                needsUpdate = true;
            }

            // Case 3: Has embedded images but wrong priority
            else if (recipe.uploadedImage?.data && recipe.imagePriority !== 'uploaded_image') {
                console.log('🔧 Fixing: Has uploadedImage but wrong priority');
                updateData = {
                    imagePriority: 'uploaded_image',
                    'imageMetadata.primarySource': 'embedded_upload',
                    hasUserImage: true
                };
                needsUpdate = true;
            } else if (recipe.extractedImage?.data && recipe.imagePriority !== 'extracted_image') {
                console.log('🔧 Fixing: Has extractedImage but wrong priority');
                updateData = {
                    imagePriority: 'extracted_image',
                    'imageMetadata.primarySource': 'ai_extracted'
                };
                needsUpdate = true;
            }

            // Case 4: Priority says external_url but no imageUrl exists - find best alternative
            else if (recipe.imagePriority === 'external_url' && !recipe.imageUrl) {
                console.log('🔧 Fixing: Priority is external_url but no imageUrl exists');

                if (recipe.primaryPhoto) {
                    updateData = {
                        imagePriority: 'primary_photo',
                        'imageMetadata.primarySource': 'photo_collection',
                        hasUserImage: true
                    };
                } else if (recipe.uploadedImage?.data) {
                    updateData = {
                        imagePriority: 'uploaded_image',
                        'imageMetadata.primarySource': 'embedded_upload',
                        hasUserImage: true
                    };
                } else if (recipe.extractedImage?.data) {
                    updateData = {
                        imagePriority: 'extracted_image',
                        'imageMetadata.primarySource': 'ai_extracted'
                    };
                }
                needsUpdate = true;
            }

            if (needsUpdate) {
                updateData['imageMetadata.lastUpdated'] = new Date();
                updateData['imageMetadata.updateCount'] = (recipe.imageMetadata?.updateCount || 0) + 1;

                console.log('🔧 Applying priority fix:', updateData);

                const response = await apiPut(`/api/recipes/${recipe._id}`, updateData);
                if (response.ok) {
                    console.log('✅ Fixed image priority mismatch');
                    // Refresh the recipe data
                    await fetchRecipe();
                } else {
                    console.error('❌ Failed to fix image priority mismatch');
                }
            } else {
                console.log('✅ Image priority is already correct');
            }

        } catch (error) {
            console.error('Error fixing image priority:', error);
        }
    };

// Enhanced fetchCurrentPrimaryPhoto with error handling
    const fetchCurrentPrimaryPhoto = async () => {
        try {
            // First check if recipe has a primaryPhoto reference
            if (recipe.primaryPhoto) {
                console.log('🔍 Fetching primaryPhoto by ID:', recipe.primaryPhoto);

                try {
                    const response = await apiGet(`/api/recipes/photos/${recipe.primaryPhoto}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            setCurrentPrimaryPhoto(data.photo);
                            console.log('✅ Found primaryPhoto from recipe reference:', data.photo._id);
                            return;
                        } else {
                            console.warn('⚠️ Primary photo API returned error:', data.error);
                        }
                    } else {
                        console.warn('⚠️ Primary photo API request failed:', response.status);
                    }
                } catch (photoError) {
                    console.error('❌ Error fetching primary photo by ID:', photoError);
                    // Continue to fallback method
                }
            }

            // Fallback: check photos collection for isPrimary flag
            console.log('🔍 Falling back to collection scan for primary photo');

            try {
                const response = await apiGet(`/api/recipes/photos?recipeId=${recipe._id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.photos) {
                        const primaryPhoto = data.photos.find(p => p.isPrimary);
                        setCurrentPrimaryPhoto(primaryPhoto || null);
                        console.log('🔍 Found primary photo in collection:', primaryPhoto?._id || 'none');

                        // Sync recipe document if we found a primary but recipe doesn't reference it
                        if (primaryPhoto && recipe.primaryPhoto !== primaryPhoto._id) {
                            console.log('🔄 Syncing found primary photo to recipe document');
                            await syncPrimaryPhotoToRecipe(primaryPhoto._id);
                        }
                    } else {
                        console.warn('⚠️ Photos collection API returned error:', data.error);
                        setCurrentPrimaryPhoto(null);
                    }
                } else {
                    console.warn('⚠️ Photos collection API request failed:', response.status);
                    setCurrentPrimaryPhoto(null);
                }
            } catch (collectionError) {
                console.error('❌ Error fetching photos collection:', collectionError);
                setCurrentPrimaryPhoto(null);
            }

        } catch (error) {
            console.error('❌ Unexpected error in fetchCurrentPrimaryPhoto:', error);
            setCurrentPrimaryPhoto(null);
        }
    };


    const syncPrimaryPhotoToRecipe = async (photoId) => {
        try {
            await apiPut(`/api/recipes/${recipe._id}`, {
                primaryPhoto: photoId,
                hasPhotos: true,
                imagePriority: 'primary_photo',
                'imageMetadata.primarySource': 'photo_collection',
                'imageMetadata.lastUpdated': new Date(),
                'imageMetadata.updateCount': (recipe.imageMetadata?.updateCount || 0) + 1
            });
            console.log('🔄 Synced primary photo to recipe document');
        } catch (error) {
            console.error('Error syncing primary photo to recipe:', error);
        }
    };

    // Fetch available images when selector is opened
    const fetchAvailableImages = async () => {
        if (availableImages.length > 0) return; // Already fetched

        setLoading(true);
        try {
            const response = await apiGet(`/api/recipes/photos?recipeId=${recipe._id}`);
            const images = [];

            // Add uploaded photos from collection
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.photos) {
                    images.push(...data.photos.map(photo => ({
                        id: photo._id,
                        type: 'collection',
                        url: `/api/recipes/photos/${photo._id}`,
                        source: 'user_upload',
                        name: photo.originalName || 'Uploaded Photo',
                        isPrimary: photo.isPrimary || (recipe.primaryPhoto === photo._id)
                    })));
                }
            }

            // Add recipe's embedded images
            if (recipe.uploadedImage?.data) {
                images.push({
                    id: 'recipe-uploaded',
                    type: 'embedded',
                    url: `data:${recipe.uploadedImage.mimeType};base64,${recipe.uploadedImage.data}`,
                    source: 'user_upload',
                    name: recipe.uploadedImage.originalName || 'Recipe Photo',
                    isPrimary: recipe.imagePriority === 'uploaded_image'
                });
            }

            if (recipe.extractedImage?.data) {
                images.push({
                    id: 'recipe-extracted',
                    type: 'embedded',
                    url: `data:image/jpeg;base64,${recipe.extractedImage.data}`,
                    source: 'ai_extracted',
                    name: 'AI Extracted Photo',
                    isPrimary: recipe.imagePriority === 'extracted_image'
                });
            }

            // Add external image
            if (recipe.imageUrl) {
                images.push({
                    id: 'recipe-external',
                    type: 'external',
                    url: recipe.imageUrl,
                    source: 'external',
                    name: 'External Image',
                    isPrimary: recipe.imagePriority === 'external_url'
                });
            }

            setAvailableImages(images);
            console.log('🖼️ Available images for selection:', images.length);
        } catch (error) {
            console.error('Error fetching available images:', error);
        }
        setLoading(false);
    };

    const getImageSrc = () => {
        console.log('🖼️ RecipeHeroImage - Getting image source using priority:', recipe.imagePriority);

        // Use imagePriority to determine which image to show
        switch (recipe.imagePriority) {
            case 'primary_photo':
                if (currentPrimaryPhoto && !imageError) {
                    const photoUrl = `/api/recipes/photos/${currentPrimaryPhoto._id}`;
                    console.log('🖼️ Using primary photo from collection:', photoUrl);
                    return photoUrl;
                }
                break;

            case 'uploaded_image':
                if (recipe.uploadedImage?.data && !imageError) {
                    console.log('🖼️ Using uploadedImage (embedded base64)');
                    return `data:${recipe.uploadedImage.mimeType};base64,${recipe.uploadedImage.data}`;
                }
                break;

            case 'extracted_image':
                if (recipe.extractedImage?.data && !imageError) {
                    console.log('🖼️ Using extractedImage (embedded base64)');
                    return `data:image/jpeg;base64,${recipe.extractedImage.data}`;
                }
                break;

            case 'external_url':
                if (recipe.imageUrl && !imageError) {
                    console.log('🖼️ Using external imageUrl:', recipe.imageUrl);
                    return recipe.imageUrl;
                }
                break;
        }

        // Fallback logic if priority doesn't match or fails
        if (currentPrimaryPhoto && !imageError) {
            const photoUrl = `/api/recipes/photos/${currentPrimaryPhoto._id}`;
            console.log('🖼️ Fallback: Using primary photo from collection:', photoUrl);
            return photoUrl;
        }

        if (recipe.uploadedImage?.data && !imageError) {
            console.log('🖼️ Fallback: Using uploadedImage');
            return `data:${recipe.uploadedImage.mimeType};base64,${recipe.uploadedImage.data}`;
        }

        if (recipe.extractedImage?.data && !imageError) {
            console.log('🖼️ Fallback: Using extractedImage');
            return `data:image/jpeg;base64,${recipe.extractedImage.data}`;
        }

        if (recipe.imageUrl && !imageError) {
            console.log('🖼️ Fallback: Using external imageUrl');
            return recipe.imageUrl;
        }

        console.log('🖼️ No image sources found, using placeholder');
        return '/images/recipe-placeholder.jpg';
    };

    const getImageAlt = () => {
        return recipe.title || 'Recipe image';
    };

    const getImageAttribution = () => {
        // Show user upload status first
        if (currentPrimaryPhoto || recipe.imagePriority === 'primary_photo' || recipe.hasUserImage || recipe.uploadedImage?.data) {
            return 'Photo uploaded by user';
        }
        if (recipe.extractedImage?.data) {
            return `AI extracted from ${recipe.extractedImage.source || 'video'}`;
        }
        if (recipe.imageAttribution && recipe.imageAttribution !== 'Unknown from Unknown') {
            return recipe.imageAttribution;
        }
        if (recipe.imageSource === 'unsplash') {
            return 'Photo from Unsplash';
        }
        if (recipe.imageSource === 'pexels_enhanced') {
            return 'Photo from Pexels';
        }
        return null;
    };

    const setPrimaryImage = async (imageId, imageType) => {
        try {
            console.log('🔄 Setting primary image:', imageId, imageType);

            let updateData = {
                'imageMetadata.lastUpdated': new Date(),
                'imageMetadata.updateCount': (recipe.imageMetadata?.updateCount || 0) + 1
            };

            if (imageType === 'collection') {
                // Set primary photo in collection
                const response = await apiPut(`/api/recipes/photos/${imageId}`, {
                    isPrimary: true
                });

                if (response.ok) {
                    // Update recipe document with new primary photo
                    updateData = {
                        ...updateData,
                        primaryPhoto: imageId,
                        hasPhotos: true,
                        hasUserImage: true,
                        imagePriority: 'primary_photo',
                        'imageMetadata.primarySource': 'photo_collection'
                    };

                    const updateResponse = await apiPut(`/api/recipes/${recipe._id}`, updateData);

                    if (updateResponse.ok) {
                        console.log('✅ Successfully set primary image and updated recipe');
                        await fetchCurrentPrimaryPhoto();
                        onImageUpdate?.();
                        setShowImageSelector(false);
                    } else {
                        console.error('❌ Failed to update recipe document');
                    }
                } else {
                    console.error('❌ Failed to set primary photo in collection');
                }
            } else if (imageType === 'external') {
                // Clear any primary photos in collection and set external as primary
                try {
                    const photosResponse = await apiGet(`/api/recipes/photos?recipeId=${recipe._id}`);
                    if (photosResponse.ok) {
                        const photosData = await photosResponse.json();
                        if (photosData.success && photosData.photos) {
                            for (const photo of photosData.photos) {
                                if (photo.isPrimary) {
                                    await apiPut(`/api/recipes/photos/${photo._id}`, {
                                        isPrimary: false
                                    });
                                }
                            }
                        }
                    }

                    // Update recipe to use external image
                    updateData = {
                        ...updateData,
                        primaryPhoto: null,
                        imagePriority: 'external_url',
                        'imageMetadata.primarySource': 'external_url'
                    };

                    const updateResponse = await apiPut(`/api/recipes/${recipe._id}`, updateData);

                    if (updateResponse.ok) {
                        console.log('✅ Set external image as primary');
                        setCurrentPrimaryPhoto(null);
                        onImageUpdate?.();
                        setShowImageSelector(false);
                    }
                } catch (error) {
                    console.error('❌ Failed to set external image as primary:', error);
                }
            } else if (imageType === 'embedded') {
                // Handle embedded images (uploadedImage or extractedImage)
                const priority = imageId === 'recipe-uploaded' ? 'uploaded_image' : 'extracted_image';
                const source = imageId === 'recipe-uploaded' ? 'embedded_upload' : 'ai_extracted';

                // Clear primary photos in collection
                const photosResponse = await apiGet(`/api/recipes/photos?recipeId=${recipe._id}`);
                if (photosResponse.ok) {
                    const photosData = await photosResponse.json();
                    if (photosData.success && photosData.photos) {
                        for (const photo of photosData.photos) {
                            if (photo.isPrimary) {
                                await apiPut(`/api/recipes/photos/${photo._id}`, {
                                    isPrimary: false
                                });
                            }
                        }
                    }
                }

                updateData = {
                    ...updateData,
                    primaryPhoto: null,
                    imagePriority: priority,
                    'imageMetadata.primarySource': source
                };

                const updateResponse = await apiPut(`/api/recipes/${recipe._id}`, updateData);

                if (updateResponse.ok) {
                    console.log('✅ Set embedded image as primary');
                    setCurrentPrimaryPhoto(null);
                    onImageUpdate?.();
                    setShowImageSelector(false);
                }
            }
        } catch (error) {
            console.error('Error setting primary image:', error);
        }
    };

    const hasMultipleImages = () => {
        let imageCount = 0;
        if (currentPrimaryPhoto || recipe.hasPhotos) imageCount++;
        if (recipe.uploadedImage?.data) imageCount++;
        if (recipe.extractedImage?.data) imageCount++;
        if (recipe.imageUrl) imageCount++;
        return imageCount > 1;
    };

    const getCurrentImageType = () => {
        switch (recipe.imagePriority) {
            case 'primary_photo':
                return 'user_upload';
            case 'uploaded_image':
                return 'user_upload';
            case 'extracted_image':
                return 'ai_extracted';
            case 'external_url':
                return 'external';
            default:
                return 'unknown';
        }
    };

    const currentImageSrc = getImageSrc();
    const isUsingApiRoute = currentImageSrc.startsWith('/api/');
    const hasAnyImage = currentPrimaryPhoto || recipe.hasPhotos || recipe.uploadedImage?.data || recipe.extractedImage?.data || recipe.imageUrl;

    // Don't render if no image available
    if (!hasAnyImage) {
        return null;
    }

    return (
        <>
            <div className={`relative overflow-hidden ${className}`}>
                <Image
                    src={currentImageSrc}
                    alt={getImageAlt()}
                    fill
                    className={`object-cover transition-all duration-500 cursor-pointer ${
                        imageLoaded ? 'opacity-100' : 'opacity-0'
                    } hover:scale-105`}
                    onLoad={() => {
                        console.log('✅ Hero image loaded successfully');
                        setImageLoaded(true);
                        setImageError(false);
                    }}
                    onError={() => {
                        console.error('❌ Hero image failed to load:', currentImageSrc);
                        setImageError(true);
                    }}
                    onClick={() => setShowFullImage(true)}
                    priority={true}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
                    unoptimized={isUsingApiRoute}
                />

                {/* Loading placeholder */}
                {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                        <div className="text-gray-400">
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                      d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                      clipRule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                )}

                {/* Image attribution overlay */}
                {getImageAttribution() && imageLoaded && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                        <div className="text-white text-sm opacity-75">
                            📷 {getImageAttribution()}
                        </div>
                    </div>
                )}

                {/* Enhanced image type indicators */}
                {getCurrentImageType() === 'user_upload' && (
                    <div
                        className="absolute top-4 right-4 bg-green-500 text-white text-sm px-3 py-1 rounded-full shadow-lg">
                        📷 User Photo
                    </div>
                )}

                {getCurrentImageType() === 'ai_extracted' && (
                    <div
                        className="absolute top-4 right-4 bg-purple-500 text-white text-sm px-3 py-1 rounded-full shadow-lg">
                        🤖 AI Extracted
                    </div>
                )}

                {getCurrentImageType() === 'external' && (
                    <div
                        className="absolute top-4 right-4 bg-blue-500 text-white text-sm px-3 py-1 rounded-full shadow-lg">
                        🌐 External
                    </div>
                )}

                {/* Image priority indicator (for debugging) */}
                {recipe.imagePriority && recipe.imagePriority !== 'external_url' && (
                    <div
                        className="absolute top-16 right-4 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        Priority: {recipe.imagePriority.replace('_', ' ')}
                    </div>
                )}

                {/* Change primary image button */}
                {hasMultipleImages() && session?.user?.id === recipe.createdBy?._id && (
                    <div className="absolute top-4 left-4">
                        <TouchEnhancedButton
                            onClick={(e) => {
                                e.stopPropagation();
                                fetchAvailableImages();
                                setShowImageSelector(true);
                            }}
                            className="bg-blue-500 bg-opacity-90 text-white text-sm px-3 py-1 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
                        >
                            🖼️ Change Hero
                        </TouchEnhancedButton>
                    </div>
                )}

                {/* Click to expand indicator */}
                <div
                    className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                    🔍 Click to enlarge
                </div>
            </div>

            {/* Enhanced Image Selector Modal */}
            {showImageSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Choose Hero Image
                                </h3>
                                <TouchEnhancedButton
                                    onClick={() => setShowImageSelector(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                                Select which image should be displayed as the main hero image for this recipe.
                            </p>
                            <div className="text-xs text-gray-500 mt-1">
                                Current priority: <span
                                className="font-medium">{recipe.imagePriority?.replace('_', ' ') || 'none'}</span>
                            </div>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {loading ? (
                                <div className="text-center py-12">
                                    <div
                                        className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600">Loading images...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {availableImages.map((image) => {
                                        const isCurrentHero = (
                                            (image.type === 'collection' && recipe.imagePriority === 'primary_photo' && recipe.primaryPhoto === image.id) ||
                                            (image.type === 'external' && recipe.imagePriority === 'external_url') ||
                                            (image.type === 'embedded' &&
                                                ((image.id === 'recipe-uploaded' && recipe.imagePriority === 'uploaded_image') ||
                                                    (image.id === 'recipe-extracted' && recipe.imagePriority === 'extracted_image')))
                                        );

                                        return (
                                            <div
                                                key={image.id}
                                                className={`relative cursor-pointer rounded-lg overflow-hidden border-4 transition-all ${
                                                    isCurrentHero
                                                        ? 'border-blue-500 shadow-lg'
                                                        : 'border-gray-200 hover:border-blue-300'
                                                }`}
                                                onClick={() => setPrimaryImage(image.id, image.type)}
                                            >
                                                <div className="aspect-video relative bg-gray-100">
                                                    <Image
                                                        src={image.url}
                                                        alt={image.name}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized={image.url.startsWith('/api/')}
                                                    />
                                                </div>

                                                {/* Current hero indicator */}
                                                {isCurrentHero && (
                                                    <div
                                                        className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                                                        Current Hero
                                                    </div>
                                                )}

                                                {/* Image type indicator */}
                                                <div className="absolute top-2 right-2">
                                                    {image.source === 'user_upload' && (
                                                        <div
                                                            className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                                            📷 Uploaded
                                                        </div>
                                                    )}
                                                    {image.source === 'ai_extracted' && (
                                                        <div
                                                            className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                                                            🤖 AI
                                                        </div>
                                                    )}
                                                    {image.source === 'external' && (
                                                        <div
                                                            className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                                            🌐 External
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Image name */}
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                                                    <div className="text-white text-sm font-medium truncate">
                                                        {image.name}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Full Image Modal */}
            {showFullImage && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowFullImage(false)}
                >
                    <div className="relative max-w-4xl max-h-full">
                        <Image
                            src={currentImageSrc}
                            alt={getImageAlt()}
                            width={800}
                            height={600}
                            className="object-contain max-w-full max-h-full"
                            onClick={(e) => e.stopPropagation()}
                            unoptimized={isUsingApiRoute}
                        />
                        <TouchEnhancedButton
                            onClick={() => setShowFullImage(false)}
                            className="absolute top-4 right-4 bg-red-500 bg-opacity-20 text-white text-2xl w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-700"
                        >
                            ×
                        </TouchEnhancedButton>
                        {getImageAttribution() && (
                            <div
                                className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded">
                                📷 {getImageAttribution()}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

// FIXED: Multi-Part Recipe Component with proper JSX structure
const MultiPartRecipeSection = ({recipe, servings, getScaledAmount, formatCookTime, getDifficultyColor}) => {
    const [activePartTab, setActivePartTab] = useState(0);
    const [showAllParts, setShowAllParts] = useState(false);

    if (!recipe.isMultiPart || !recipe.parts || recipe.parts.length === 0) {
        return null;
    }

    const totalIngredients = recipe.parts.reduce((total, part) => total + (part.ingredients?.length || 0), 0);
    const totalInstructions = recipe.parts.reduce((total, part) => total + (part.instructions?.length || 0), 0);

    return (
        <div className="space-y-8">
            {/* Multi-Part Recipe Header */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">
                            🧩 Multi-Part Recipe
                        </h3>
                        <p className="text-blue-800 text-sm mb-3">
                            This recipe has {recipe.parts.length} parts with {totalIngredients} total ingredients
                            and {totalInstructions} total steps.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {recipe.parts.map((part, index) => (
                                <span key={index}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                                    {part.name || `Part ${index + 1}`}
                                </span>
                            ))}
                        </div>
                    </div>
                    <TouchEnhancedButton
                        onClick={() => setShowAllParts(!showAllParts)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                        {showAllParts ? 'Show Tabs' : 'Show All Parts'}
                    </TouchEnhancedButton>
                </div>
            </div>

            {showAllParts ? (
                /* Show All Parts in Sequence */
                <div className="space-y-8">
                    {recipe.parts.map((part, partIndex) => (
                        <div key={partIndex} className="bg-white rounded-lg border p-6">
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        {part.name || `Part ${partIndex + 1}`}
                                    </h3>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <span>👥 {part.ingredients?.length || 0} ingredients</span>
                                        <span>📋 {part.instructions?.length || 0} steps</span>
                                        {part.prepTime && (
                                            <span>⏱️ {formatCookTime(part.prepTime)} prep</span>
                                        )}
                                        {part.cookTime && (
                                            <span>🔥 {formatCookTime(part.cookTime)} cook</span>
                                        )}
                                    </div>
                                </div>

                                {part.description && (
                                    <p className="text-gray-600 mb-4">{part.description}</p>
                                )}
                            </div>

                            {/* Part Ingredients */}
                            <div className="mb-6">
                                <h4 className="text-lg font-medium text-gray-900 mb-3">
                                    Ingredients for {part.name}
                                </h4>
                                <ul className="space-y-2">
                                    {part.ingredients?.map((ingredient, index) => (
                                        <li key={index} className="flex items-start space-x-4">
                                            <input
                                                type="checkbox"
                                                className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-gray-700">
                                                {ingredient.amount && (
                                                    <span className="font-medium">
                                                        {getScaledAmount(ingredient.amount)}
                                                        {ingredient.unit && ` ${ingredient.unit}`}{' '}
                                                    </span>
                                                )}
                                                {ingredient.name}
                                                {ingredient.optional && (
                                                    <span className="text-gray-500 text-sm"> (optional)</span>
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Part Instructions */}
                            <div>
                                <h4 className="text-lg font-medium text-gray-900 mb-3">
                                    Instructions for {part.name}
                                </h4>
                                <ol className="space-y-3">
                                    {part.instructions?.map((instruction, index) => {
                                        const instructionText = typeof instruction === 'string' ? instruction :
                                            (instruction.text || instruction.instruction || '');
                                        const hasVideoTimestamp = typeof instruction === 'object' && instruction.videoTimestamp;

                                        return (
                                            <li key={index} className="flex items-start space-x-4">
                                                <span
                                                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                                        hasVideoTimestamp
                                                            ? 'bg-purple-600 text-white'
                                                            : 'bg-indigo-600 text-white'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-gray-700 leading-relaxed">{instructionText}</p>
                                                    {hasVideoTimestamp && instruction.videoLink && (
                                                        <div className="mt-2">
                                                            <a
                                                                href={instruction.videoLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm bg-purple-50 px-3 py-1 rounded-full border border-purple-200 hover:bg-purple-100 transition-colors"
                                                                title={`Jump to ${Math.floor(instruction.videoTimestamp / 60)}:${Math.floor(instruction.videoTimestamp % 60).toString().padStart(2, '0')} in video`}
                                                            >
                                                                <svg className="w-4 h-4 mr-2" fill="currentColor"
                                                                     viewBox="0 0 20 20">
                                                                    <path d="M8 5v10l7-5-7-5z"/>
                                                                </svg>
                                                                Watch
                                                                step: {Math.floor(instruction.videoTimestamp / 60)}:{Math.floor(instruction.videoTimestamp % 60).toString().padStart(2, '0')}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* FIXED: Show Tabbed View with proper JSX structure */
                <div className="bg-white rounded-lg border">
                    {/* Part Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6 pt-4" aria-label="Recipe parts">
                            {recipe.parts.map((part, index) => (
                                <TouchEnhancedButton
                                    key={index}
                                    onClick={() => setActivePartTab(index)}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activePartTab === index
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {part.name || `Part ${index + 1}`}
                                    <span className="ml-2 text-xs text-gray-400">
                                        ({part.ingredients?.length || 0} ingredients)
                                    </span>
                                </TouchEnhancedButton>
                            ))}
                        </nav>
                    </div>

                    {/* Active Part Content */}
                    <div className="p-6">
                        {recipe.parts[activePartTab] && (
                            <div>
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            {recipe.parts[activePartTab].name || `Part ${activePartTab + 1}`}
                                        </h3>
                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            {recipe.parts[activePartTab].prepTime && (
                                                <span>⏱️ Prep: {formatCookTime(recipe.parts[activePartTab].prepTime)}</span>
                                            )}
                                            {recipe.parts[activePartTab].cookTime && (
                                                <span>🔥 Cook: {formatCookTime(recipe.parts[activePartTab].cookTime)}</span>
                                            )}
                                        </div>
                                    </div>

                                    {recipe.parts[activePartTab].description && (
                                        <p className="text-gray-600 mb-4">{recipe.parts[activePartTab].description}</p>
                                    )}
                                </div>

                                {/* Ingredients for Active Part */}
                                <div className="mb-8">
                                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                                        Ingredients ({recipe.parts[activePartTab].ingredients?.length || 0})
                                    </h4>
                                    <ul className="space-y-2">
                                        {recipe.parts[activePartTab].ingredients?.map((ingredient, index) => (
                                            <li key={index} className="flex items-start space-x-4">
                                                <input
                                                    type="checkbox"
                                                    className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-gray-700">
                                                    {ingredient.amount && (
                                                        <span className="font-medium">
                                                            {getScaledAmount(ingredient.amount)}
                                                            {ingredient.unit && ` ${ingredient.unit}`}{' '}
                                                        </span>
                                                    )}
                                                    {ingredient.name}
                                                    {ingredient.optional && (
                                                        <span className="text-gray-500 text-sm"> (optional)</span>
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Instructions for Active Part */}
                                <div>
                                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                                        Instructions ({recipe.parts[activePartTab].instructions?.length || 0})
                                    </h4>
                                    <ol className="space-y-4">
                                        {recipe.parts[activePartTab].instructions?.map((instruction, index) => {
                                            const instructionText = typeof instruction === 'string' ? instruction :
                                                (instruction.text || instruction.instruction || '');
                                            const hasVideoTimestamp = typeof instruction === 'object' && instruction.videoTimestamp;

                                            return (
                                                <li key={index} className="flex items-start space-x-4">
                                                    <span
                                                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                                            hasVideoTimestamp
                                                                ? 'bg-purple-600 text-white'
                                                                : 'bg-indigo-600 text-white'
                                                        }`}>
                                                        {index + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="text-gray-700 leading-relaxed">{instructionText}</p>
                                                        {hasVideoTimestamp && instruction.videoLink && (
                                                            <div className="mt-2">
                                                                <a
                                                                    href={instruction.videoLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm bg-purple-50 px-3 py-1 rounded-full border border-purple-200 hover:bg-purple-100 transition-colors"
                                                                    title={`Jump to ${Math.floor(instruction.videoTimestamp / 60)}:${Math.floor(instruction.videoTimestamp % 60).toString().padStart(2, '0')} in video`}
                                                                >
                                                                    <svg className="w-4 h-4 mr-2" fill="currentColor"
                                                                         viewBox="0 0 20 20">
                                                                        <path d="M8 5v10l7-5-7-5z"/>
                                                                    </svg>
                                                                    Watch
                                                                    step: {Math.floor(instruction.videoTimestamp / 60)}:{Math.floor(instruction.videoTimestamp % 60).toString().padStart(2, '0')}
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Single-Part Recipe Component (for backward compatibility)
const SinglePartRecipeSection = ({recipe, servings, getScaledAmount, formatCookTime}) => {
    if (recipe.isMultiPart) {
        return null;
    }

    return (
        <div className="space-y-8">
            {/* Ingredients section */}
            <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Ingredients</h2>
                    {recipe.servings && (
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Servings:</span>
                            <span
                                className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium text-gray-900 min-w-[3rem] text-center">
                                {servings}
                            </span>
                        </div>
                    )}
                </div>

                <div className="mb-2 text-xs text-gray-500">
                    {recipe.ingredients?.length || 0} ingredients •
                    {recipe.transformationApplied ? ` Transformed (${recipe.transformationApplied.type})` : ' Original'}
                </div>

                <ul className="space-y-2">
                    {recipe.ingredients?.length > 0 ? (
                        recipe.ingredients.map((ingredient, index) => {
                            const ingredientData = ingredient._doc || ingredient;
                            const name = ingredientData.name || ingredient.name || 'Unknown ingredient';
                            const amount = ingredient.amount || ingredientData.amount;
                            const unit = ingredient.unit || ingredientData.unit;
                            const optional = ingredient.optional || ingredientData.optional;

                            return (
                                <li key={index} className="flex items-start space-x-4">
                                    <input
                                        type="checkbox"
                                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-gray-700">
                                        {amount && (
                                            <span className="font-medium">
                                                {getScaledAmount(amount)}
                                                {unit && ` ${unit}`}{' '}
                                            </span>
                                        )}
                                        {name}
                                        {optional && (
                                            <span className="text-gray-500 text-sm"> (optional)</span>
                                        )}
                                        {ingredient.conversionMethod && ingredient.conversionMethod !== 'no_conversion_needed' && (
                                            <span className="text-blue-600 text-xs ml-2">
                                                ({ingredient.conversionMethod.replace(/_/g, ' ')})
                                            </span>
                                        )}
                                        {ingredient.scalingNotes && (
                                            <span className="text-green-600 text-xs ml-2">
                                                ({ingredient.scalingNotes})
                                            </span>
                                        )}
                                    </span>
                                </li>
                            );
                        })
                    ) : (
                        <li className="text-gray-500 italic">No ingredients available</li>
                    )}
                </ul>
            </div>

            {/* Instructions Section */}
            <div className="bg-white rounded-lg border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
                <ol className="space-y-4">
                    {recipe.instructions?.map((instruction, index) => {
                        const instructionText = typeof instruction === 'string' ? instruction : instruction.text;
                        const hasVideoTimestamp = typeof instruction === 'object' && instruction.videoTimestamp;

                        return (
                            <li key={index} className="flex items-start space-x-4">
                                <span
                                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                        hasVideoTimestamp
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-indigo-600 text-white'
                                    }`}>
                                    {typeof instruction === 'object' ? instruction.step || (index + 1) : (index + 1)}
                                </span>
                                <div className="flex-1">
                                    <p className="text-gray-700 leading-relaxed">{instructionText}</p>
                                    {hasVideoTimestamp && instruction.videoLink && (
                                        <div className="mt-2">
                                            <a
                                                href={instruction.videoLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm bg-purple-50 px-3 py-1 rounded-full border border-purple-200 hover:bg-purple-100 transition-colors"
                                                title={`Jump to ${Math.floor(instruction.videoTimestamp / 60)}:${Math.floor(instruction.videoTimestamp % 60).toString().padStart(2, '0')} in video`}
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M8 5v10l7-5-7-5z"/>
                                                </svg>
                                                Watch
                                                step: {Math.floor(instruction.videoTimestamp / 60)}:{Math.floor(instruction.videoTimestamp % 60).toString().padStart(2, '0')}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ol>

                {recipe.videoMetadata?.videoSource && (
                    <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="text-purple-600 mr-2">🎥</span>
                                <span className="text-sm text-purple-800 font-medium">
                                    Extracted from {recipe.videoMetadata.videoPlatform} video
                                </span>
                            </div>
                            <a
                                href={recipe.videoMetadata.videoSource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
                            >
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8 5v10l7-5-7-5z"/>
                                </svg>
                                Watch Original
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function RecipeDetailPage() {
    let session = null;

    try {
        const sessionResult = useSafeSession();
        session = sessionResult?.data || null;
    } catch (error) {
        session = null;
    }

    const params = useParams();
    const router = useRouter();
    const recipeId = params.id;
    const subscription = useSubscription();
    const mealPlanFeatureGate = useFeatureGate(FEATURE_GATES.CREATE_MEAL_PLAN);

    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNutrition, setShowNutrition] = useState(false);
    const [servings, setServings] = useState(1);
    const [showQuickShoppingList, setShowQuickShoppingList] = useState(false);
    const [showMealPlanModal, setShowMealPlanModal] = useState(false);
    const [mealPlans, setMealPlans] = useState([]);
    const [loadingMealPlans, setLoadingMealPlans] = useState(false);
    const [showNutritionModal, setShowNutritionModal] = useState(false);
    const [showPhotoUpload, setShowPhotoUpload] = useState(false);
    const [refreshPhotos, setRefreshPhotos] = useState(0);
    const [originalRecipe, setOriginalRecipe] = useState(null);
    const [refreshHeroImage, setRefreshHeroImage] = useState(0);

    useEffect(() => {
        if (recipeId) {
            fetchRecipe();
        }
    }, [recipeId]);

    useEffect(() => {
        if (recipe && recipe.servings) {
            setServings(recipe.servings);
        }
    }, [recipe]);

    // Handle photo uploads - updated to work with your existing RecipePhotoUpload component
    const handlePhotoUploaded = async () => {
        console.log('📸 Photos updated, refreshing gallery and hero image');

        try {
            // Refresh the photos gallery
            setRefreshPhotos(prev => prev + 1);
            setShowPhotoUpload(false);

            // Get updated photos count and check for primary
            const photosResponse = await apiGet(`/api/recipes/photos?recipeId=${recipe._id}`);
            if (photosResponse.ok) {
                const photosData = await photosResponse.json();
                if (photosData.success && photosData.photos) {
                    console.log('📸 Found photos after upload:', photosData.photos.length);

                    const hasOtherImages = recipe.imageUrl || recipe.uploadedImage?.data || recipe.extractedImage?.data;
                    const primaryPhoto = photosData.photos.find(p => p.isPrimary);
                    const photoCount = photosData.photos.length;

                    // Prepare recipe update data
                    let updateData = {
                        photoCount: photoCount,
                        hasPhotos: photoCount > 0,
                        photos: photosData.photos.map(p => p._id),
                        'imageMetadata.lastUpdated': new Date(),
                        'imageMetadata.updateCount': (recipe.imageMetadata?.updateCount || 0) + 1
                    };

                    // If this is the first photo and no other images exist, make it primary
                    if (photoCount === 1 && !hasOtherImages && !primaryPhoto) {
                        console.log('📸 Setting first uploaded photo as primary hero image');
                        const photoId = photosData.photos[0]._id;

                        // Set as primary in collection
                        await apiPut(`/api/recipes/photos/${photoId}`, { isPrimary: true });

                        // Update recipe with primary photo settings
                        updateData = {
                            ...updateData,
                            primaryPhoto: photoId,
                            hasUserImage: true,
                            imagePriority: 'primary_photo',
                            'imageMetadata.primarySource': 'photo_collection'
                        };
                    }
                    // If no images existed before and now we have photos, set newest as primary
                    else if (!hasOtherImages && !primaryPhoto && photoCount > 0) {
                        console.log('📸 Making newest upload primary since no other images exist');
                        const newestPhoto = photosData.photos[photosData.photos.length - 1];

                        await apiPut(`/api/recipes/photos/${newestPhoto._id}`, { isPrimary: true });

                        updateData = {
                            ...updateData,
                            primaryPhoto: newestPhoto._id,
                            hasUserImage: true,
                            imagePriority: 'primary_photo',
                            'imageMetadata.primarySource': 'photo_collection'
                        };
                    }
                    // If we have a primary photo, make sure recipe references it
                    else if (primaryPhoto && recipe.primaryPhoto !== primaryPhoto._id) {
                        console.log('📸 Syncing existing primary photo to recipe document');
                        updateData = {
                            ...updateData,
                            primaryPhoto: primaryPhoto._id,
                            hasUserImage: true,
                            imagePriority: 'primary_photo',
                            'imageMetadata.primarySource': 'photo_collection'
                        };
                    }

                    // Update recipe document with photo metadata
                    await apiPut(`/api/recipes/${recipe._id}`, updateData);
                    console.log('✅ Updated recipe with photo metadata');
                }
            }

            // Trigger hero image refresh
            handleImageUpdate();

        } catch (error) {
            console.error('Error handling photo upload:', error);
            // Still refresh the gallery even if sync fails
            setRefreshPhotos(prev => prev + 1);
            setShowPhotoUpload(false);
            handleImageUpdate();
        }
    };

    const fetchRecipe = async () => {
        try {
            const response = await apiGet(`/api/recipes/${recipeId}`);
            const data = await response.json();

            if (data.success) {
                setRecipe(data.recipe);
                setOriginalRecipe(data.recipe);
                await apiPost(`/api/recipes/${recipeId}/view`, {});
            } else {
                setError(data.error || 'Recipe not found');
            }
        } catch (error) {
            console.error('Error fetching recipe:', error);
            setError('Failed to load recipe');
        } finally {
            setLoading(false);
        }
    };

    const fetchMealPlans = async () => {
        setLoadingMealPlans(true);
        try {
            const response = await apiGet('/api/meal-plans');
            const data = await response.json();
            if (data.success) {
                setMealPlans(data.mealPlans);
            }
        } catch (error) {
            console.error('Error fetching meal plans:', error);
        } finally {
            setLoadingMealPlans(false);
        }
    };

    const addToMealPlan = async (mealPlanId, day, mealType) => {
        try {
            const response = await apiGet(`/api/meal-plans/${mealPlanId}`);

            const data = await response.json();
            if (!data.success) {
                throw new Error('Failed to fetch meal plan');
            }

            const mealPlan = data.mealPlan;

            const newMeal = {
                recipeId: recipe._id,
                recipeName: recipe.title,
                mealType: mealType,
                servings: recipe.servings || 4,
                notes: '',
                prepTime: recipe.prepTime || 0,
                cookTime: recipe.cookTime || 0,
                createdAt: new Date()
            };

            const updatedMeals = {
                ...mealPlan.meals,
                [day]: [...(mealPlan.meals[day] || []), newMeal]
            };

            const updateResponse = await apiPut(`/api/meal-plans/${mealPlanId}`, {
                meals: updatedMeals
            });

            const updateData = await updateResponse.json();
            if (updateData.success) {
                alert(`Added "${recipe.title}" to your meal plan!`);
                setShowMealPlanModal(false);
            } else {
                throw new Error(updateData.error);
            }
        } catch (error) {
            console.error('Error adding to meal plan:', error);
            alert('Failed to add recipe to meal plan');
        }
    };

    // Helper functions
    const formatCookTime = (minutes) => {
        if (!minutes) return 'Not specified';
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

    const getScaledAmount = (amount) => {
        if (!amount || !recipe?.servings) return amount;

        const amountStr = String(amount);
        const match = amountStr.match(/^(\d+(?:\.\d+)?|\d+\/\d+)/);
        if (match) {
            const originalNumber = match[1];
            let number;

            if (originalNumber.includes('/')) {
                const [numerator, denominator] = originalNumber.split('/');
                number = parseFloat(numerator) / parseFloat(denominator);
            } else {
                number = parseFloat(originalNumber);
            }

            const scaledNumber = (number * servings) / recipe.servings;
            let formattedNumber;
            if (scaledNumber % 1 === 0) {
                formattedNumber = scaledNumber.toString();
            } else if (scaledNumber < 1) {
                const fraction = getFractionFromDecimal(scaledNumber);
                formattedNumber = fraction || scaledNumber.toFixed(2);
            } else {
                formattedNumber = parseFloat(scaledNumber.toFixed(2)).toString();
            }

            return amountStr.replace(originalNumber, formattedNumber);
        }
        return amountStr;
    };

    const getFractionFromDecimal = (decimal) => {
        const commonFractions = {
            0.125: '1/8',
            0.25: '1/4',
            0.333: '1/3',
            0.375: '3/8',
            0.5: '1/2',
            0.625: '5/8',
            0.667: '2/3',
            0.75: '3/4',
            0.875: '7/8'
        };

        const rounded = Math.round(decimal * 1000) / 1000;
        return commonFractions[rounded] || null;
    };

    const hasNutritionData = recipe?.nutrition && (
        (recipe.nutrition.calories && (recipe.nutrition.calories.value > 0 || recipe.nutrition.calories > 0)) ||
        (recipe.nutrition.protein && (recipe.nutrition.protein.value > 0 || recipe.nutrition.protein > 0)) ||
        (recipe.nutrition.fat && (recipe.nutrition.fat.value > 0 || recipe.nutrition.fat > 0)) ||
        (recipe.nutrition.carbs && (recipe.nutrition.carbs.value > 0 || recipe.nutrition.carbs > 0)) ||
        (typeof recipe.nutrition.calories === 'number' && recipe.nutrition.calories > 0) ||
        (typeof recipe.nutrition.protein === 'number' && recipe.nutrition.protein > 0) ||
        (typeof recipe.nutrition.fat === 'number' && recipe.nutrition.fat > 0) ||
        (typeof recipe.nutrition.carbs === 'number' && recipe.nutrition.carbs > 0)
    );

    const getNormalizedNutrition = () => {
        if (!recipe?.nutrition) return null;

        if (recipe.nutrition.calories && typeof recipe.nutrition.calories === 'object') {
            return recipe.nutrition;
        }

        return {
            calories: {
                value: parseFloat(recipe.nutrition.calories) || 0,
                unit: 'kcal',
                name: 'Calories'
            },
            protein: {
                value: parseFloat(recipe.nutrition.protein) || 0,
                unit: 'g',
                name: 'Protein'
            },
            fat: {
                value: parseFloat(recipe.nutrition.fat) || 0,
                unit: 'g',
                name: 'Fat'
            },
            carbs: {
                value: parseFloat(recipe.nutrition.carbs) || 0,
                unit: 'g',
                name: 'Carbohydrates'
            },
            fiber: {
                value: parseFloat(recipe.nutrition.fiber) || 0,
                unit: 'g',
                name: 'Fiber'
            },
            sodium: {
                value: parseFloat(recipe.nutrition.sodium) || 0,
                unit: 'mg',
                name: 'Sodium'
            }
        };
    };

    const handleMealPlanClick = () => {
        if (!mealPlanFeatureGate.canUse) {
            window.location.href = `/pricing?source=meal-planning&feature=${FEATURE_GATES.CREATE_MEAL_PLAN}&required=${mealPlanFeatureGate.requiredTier}`;
            return;
        }

        fetchMealPlans();
        setShowMealPlanModal(true);
    };

    const handleTransformationChange = (transformedRecipe) => {
        console.log('🔄 Recipe transformation applied:', transformedRecipe);

        const updatedRecipe = {
            ...recipe,
            ...transformedRecipe,
            _id: recipe._id,
            title: recipe.title,
            description: recipe.description,
            createdBy: recipe.createdBy,
            createdAt: recipe.createdAt,
            updatedAt: recipe.updatedAt
        };

        console.log('🔄 Setting updated recipe:', updatedRecipe);
        setRecipe(updatedRecipe);

        if (transformedRecipe.servings && transformedRecipe.servings !== servings) {
            setServings(transformedRecipe.servings);
        }
    };

    const handleRevert = () => {
        console.log('🔄 Reverting to original recipe - Current recipe:', recipe);
        console.log('🔄 Original recipe stored:', originalRecipe);

        if (originalRecipe) {
            const revertedRecipe = JSON.parse(JSON.stringify(originalRecipe));

            delete revertedRecipe.transformationApplied;
            delete revertedRecipe.currentMeasurementSystem;
            delete revertedRecipe.currentServings;

            console.log('🔄 Setting reverted recipe:', revertedRecipe);
            setRecipe(revertedRecipe);
            setServings(originalRecipe.servings || 4);
        } else {
            console.error('❌ No original recipe stored for revert');
            fetchRecipe();
        }
    };

    useEffect(() => {
        window.handleRevertFromWidget = handleRevert;
        return () => {
            delete window.handleRevertFromWidget;
        };
    }, [originalRecipe]);

    const handleImageUpdate = () => {
        console.log('🔄 Image updated, refreshing hero image and fetching latest recipe data');
        setRefreshHeroImage(prev => prev + 1);
        // Refresh the entire recipe to get updated schema fields
        fetchRecipe();
    };

    const syncRecipeImageMetadata = async () => {
        if (!recipe._id) return;

        try {
            console.log('🔄 Syncing recipe image metadata...');

            // Get current photos
            const photosResponse = await apiGet(`/api/recipes/photos?recipeId=${recipe._id}`);
            let updateData = {
                'imageMetadata.lastUpdated': new Date(),
                'imageMetadata.updateCount': (recipe.imageMetadata?.updateCount || 0) + 1
            };

            if (photosResponse.ok) {
                const photosData = await photosResponse.json();
                if (photosData.success && photosData.photos) {
                    const photoCount = photosData.photos.length;
                    const primaryPhoto = photosData.photos.find(p => p.isPrimary);

                    updateData = {
                        ...updateData,
                        photoCount: photoCount,
                        hasPhotos: photoCount > 0,
                        photos: photosData.photos.map(p => p._id)
                    };

                    if (primaryPhoto) {
                        updateData = {
                            ...updateData,
                            primaryPhoto: primaryPhoto._id,
                            hasUserImage: true,
                            imagePriority: 'primary_photo',
                            'imageMetadata.primarySource': 'photo_collection'
                        };
                    }
                }
            }

            // Determine image priority if not set
            if (!recipe.imagePriority) {
                if (updateData.primaryPhoto) {
                    updateData.imagePriority = 'primary_photo';
                    updateData['imageMetadata.primarySource'] = 'photo_collection';
                } else if (recipe.uploadedImage?.data) {
                    updateData.imagePriority = 'uploaded_image';
                    updateData['imageMetadata.primarySource'] = 'embedded_upload';
                } else if (recipe.extractedImage?.data) {
                    updateData.imagePriority = 'extracted_image';
                    updateData['imageMetadata.primarySource'] = 'ai_extracted';
                } else if (recipe.imageUrl) {
                    updateData.imagePriority = 'external_url';
                    updateData['imageMetadata.primarySource'] = 'external_url';
                } else {
                    updateData.imagePriority = 'external_url'; // Default
                    updateData['imageMetadata.primarySource'] = 'none';
                }
            }

            // Update recipe with synced metadata
            const response = await apiPut(`/api/recipes/${recipe._id}`, updateData);
            if (response.ok) {
                console.log('✅ Successfully synced recipe image metadata');
                fetchRecipe(); // Refresh to get updated data
            }

        } catch (error) {
            console.error('Error syncing recipe image metadata:', error);
        }
    };

// Add this useEffect to run sync when component loads (run once per recipe)
    useEffect(() => {
        if (recipe && !recipe.imageMetadata?.lastUpdated) {
            // Only sync if metadata hasn't been initialized
            syncRecipeImageMetadata();
        }
    }, [recipe?._id]);

    if (loading) {
        return (
            <MobileOptimizedLayout>
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="h-32 bg-gray-200 rounded"></div>
                                <div className="h-64 bg-gray-200 rounded"></div>
                            </div>
                            <div className="h-96 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    if (error) {
        return (
            <MobileOptimizedLayout>
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="text-center">
                        <div className="text-red-600 text-lg font-medium mb-4">{error}</div>
                        <TouchEnhancedButton
                            onClick={() => router.push('/recipes')}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                        >
                            Back to Recipes
                        </TouchEnhancedButton>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    return (
        <MobileOptimizedLayout>
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <TouchEnhancedButton
                            onClick={() => router.push('/recipes')}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                            </svg>
                            <span>Back to Recipes</span>
                        </TouchEnhancedButton>
                        <div className="text-sm text-gray-500">
                            {recipe.isPublic ? '🌍 Public Recipe' : '🔒 Private Recipe'}
                            {recipe.isMultiPart && <span className="ml-2">🧩 Multi-Part</span>}
                        </div>
                    </div>

                    {/* Hero Image Section - Enhanced with full schema support */}
                    {(recipe.hasPhotos ||
                        recipe.primaryPhoto ||
                        recipe.uploadedImage?.data ||
                        recipe.extractedImage?.data ||
                        recipe.imageUrl) && (
                        <div className="mb-8">
                            <RecipeHeroImage
                                recipe={recipe}
                                session={session}
                                className="w-full h-64 md:h-80 lg:h-96 rounded-xl shadow-lg"
                                onImageUpdate={handleImageUpdate}
                                key={refreshHeroImage}
                            />
                        </div>
                    )}

                    {/* Title and Description */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
                        {recipe.description && (
                            <p className="text-gray-600 text-lg mb-4">{recipe.description}</p>
                        )}

                        {/* Rating and Stats */}
                        <div className="flex items-center space-x-6 mb-4">
                            <RatingStats ratingStats={recipe.ratingStats} compact={true}/>
                            {recipe.metrics?.viewCount > 0 && (
                                <span className="text-sm text-gray-500">
                                    {recipe.metrics.viewCount} view{recipe.metrics.viewCount !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {session?.user?.id === recipe.createdBy?._id && (
                            <TouchEnhancedButton
                                onClick={() => router.push(`/recipes/${recipeId}/edit`)}
                                className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                <span className="hidden sm:inline">Edit Recipe</span>
                                <span className="sm:hidden">Edit</span>
                            </TouchEnhancedButton>
                        )}

                        <AddToCollectionButton
                            recipeId={recipe._id}
                            recipeName={recipe.title}
                        />

                        <TouchEnhancedButton
                            onClick={handleMealPlanClick}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                mealPlanFeatureGate.canUse
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                            }`}
                            title={mealPlanFeatureGate.canUse ? 'Add to meal plan' : 'Upgrade to add to meal plans'}
                        >
                            {mealPlanFeatureGate.canUse ? (
                                <>
                                    <span className="hidden sm:inline">📅 Add to Meal Plan</span>
                                    <span className="sm:hidden">📅 Meal Plan</span>
                                </>
                            ) : (
                                <>
                                    <span className="hidden sm:inline">🔒 Meal Planning (Gold)</span>
                                    <span className="sm:hidden">🔒 Meal Plan</span>
                                </>
                            )}
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => setShowQuickShoppingList(true)}
                            className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                            <span className="hidden sm:inline">🛒 Generate Shopping List</span>
                            <span className="sm:hidden">🛒 Shopping</span>
                        </TouchEnhancedButton>

                        {hasNutritionData && (
                            <TouchEnhancedButton
                                onClick={() => setShowNutritionModal(true)}
                                className="bg-emerald-600 text-white px-3 py-2 rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
                            >
                                <span className="hidden sm:inline">🥗 Nutrition Details</span>
                                <span className="sm:hidden">🥗 Nutrition</span>
                            </TouchEnhancedButton>
                        )}

                        <TouchEnhancedButton
                            onClick={() => window.print()}
                            className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                        >
                            Print
                        </TouchEnhancedButton>


                        {/* Recipe Meta */}
                        <div className="flex flex-wrap items-center space-x-4 text-sm text-gray-600">
                            {recipe.prepTime && (
                                <span className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span>Prep: {formatCookTime(recipe.prepTime)}</span>
                            </span>
                            )}
                            {recipe.cookTime && (
                                <span className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/>
                                </svg>
                                <span>Cook: {formatCookTime(recipe.cookTime)}</span>
                            </span>
                            )}
                            {recipe.servings && (
                                <span className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                                <span>Serves: {recipe.servings}</span>
                            </span>
                            )}
                            {recipe.difficulty && (
                                <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                                {recipe.difficulty}
                            </span>
                            )}
                        </div>

                        {/* Tags */}
                        {recipe.tags && recipe.tags.length > 0 && (
                            <div className="mt-4">
                                <div className="flex flex-wrap gap-2">
                                    {recipe.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                        >
                                        {tag}
                                    </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* LEFT COLUMN - Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Recipe Photos Section */}
                            <div className="bg-white rounded-lg border p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900">Additional Photos</h2>
                                    {session?.user?.id === recipe.createdBy?._id && (
                                        <TouchEnhancedButton
                                            onClick={() => setShowPhotoUpload(!showPhotoUpload)}
                                            className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm font-medium flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                            </svg>
                                            <span>Add Photo</span>
                                        </TouchEnhancedButton>
                                    )}
                                </div>
                            </div>

                            {/* User image indicator */}
                            {(recipe.hasUserImage || recipe.uploadedImage?.data) && (
                                <div
                                    className="absolute top-4 right-4 bg-green-500 text-white text-sm px-3 py-1 rounded-full shadow-lg">
                                    📷 User Photo
                                </div>
                            )}

                            {/* AI extracted indicator */}
                            {recipe.extractedImage?.data && !recipe.uploadedImage?.data && (
                                <div
                                    className="absolute top-4 right-4 bg-purple-500 text-white text-sm px-3 py-1 rounded-full shadow-lg">
                                    🤖 AI Extracted
                                </div>
                            )} {/* Recipe Photos Section - Updated to work with your existing components */}
                            <div className="bg-white rounded-lg border p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900">Recipe Photos</h2>
                                    {session?.user?.id === recipe.createdBy?._id && (
                                        <TouchEnhancedButton
                                            onClick={() => setShowPhotoUpload(!showPhotoUpload)}
                                            className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm font-medium flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                            </svg>
                                            <span>Add Photos</span>
                                        </TouchEnhancedButton>
                                    )}
                                </div>

                                {/* Photo Upload Section */}
                                {showPhotoUpload && session?.user?.id === recipe.createdBy?._id && (
                                    <div className="mb-6">
                                        <RecipePhotoUpload
                                            recipeId={recipe._id}
                                            onPhotoUploaded={handlePhotoUploaded}
                                            className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                                        />
                                    </div>
                                )}

                                {/* Photo Gallery */}
                                <RecipePhotoGallery
                                    recipeId={recipe._id}
                                    canEdit={session?.user?.id === recipe.createdBy?._id}
                                    key={refreshPhotos}
                                />
                            </div>

                            {/* RECIPE TRANSFORMATION PANEL */}
                            <RecipeTransformationPanel
                                recipe={recipe}
                                onTransformationChange={handleTransformationChange}
                                onRevert={handleRevert}
                                showSaveOptions={true}
                                defaultExpanded={false}
                            />


                            {/* Multi-Part or Single-Part Recipe Content */}
                            {recipe.isMultiPart ? (
                                <MultiPartRecipeSection
                                    recipe={recipe}
                                    servings={servings}
                                    getScaledAmount={getScaledAmount}
                                    formatCookTime={formatCookTime}
                                    getDifficultyColor={getDifficultyColor}
                                />
                            ) : (
                                <SinglePartRecipeSection
                                    recipe={recipe}
                                    servings={servings}
                                    getScaledAmount={getScaledAmount}
                                    formatCookTime={formatCookTime}
                                />
                            )}

                            {recipe.videoMetadata?.videoSource && (
                                <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="text-purple-600 mr-2">🎥</span>
                                            <span className="text-sm text-purple-800 font-medium">
                                                Extracted from {recipe.videoMetadata.videoPlatform} video
                                            </span>
                                        </div>
                                        <a
                                            href={recipe.videoMetadata.videoSource}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
                                        >
                                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M8 5v10l7-5-7-5z"/>
                                            </svg>
                                            Watch Original
                                        </a>
                                    </div>
                                </div>
                            )}


                            {/* Reviews Section */}
                            <div className="bg-white rounded-lg border p-6">
                                <RecipeReviewsSection
                                    recipeId={recipeId}
                                    recipeOwnerId={recipe.createdBy}
                                />
                            </div>
                        </div>

                        {/* RIGHT COLUMN - Sidebar */}
                        <div className="space-y-6">
                            {/* Recipe Info Card */}
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipe Info</h3>
                                <div className="space-y-3 text-sm">
                                    {/* Multi-part indicator */}
                                    {recipe.isMultiPart && (
                                        <div>
                                            <span className="text-gray-500">Type:</span>
                                            <div className="ml-2 text-gray-900">
                                                <span className="text-blue-600 font-medium">🧩 Multi-part recipe</span>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {recipe.parts?.length || 0} parts
                                                    with {recipe.parts?.reduce((total, part) => total + (part.ingredients?.length || 0), 0) || 0} total
                                                    ingredients
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <span className="text-gray-500">Added by:</span>
                                        <span className="ml-2 text-gray-900">
                                        {recipe.createdBy ? (
                                            <span className="flex items-center gap-1">
                                                <span>{recipe.createdBy.name || recipe.createdBy.email}</span>
                                                {recipe.importedFrom && (
                                                    <span className="text-xs text-gray-400">(imported)</span>
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">Unknown</span>
                                        )}
                                    </span>
                                    </div>

                                    <div>
                                        <span className="text-gray-500">Created:</span>
                                        <span className="ml-2 text-gray-900">
                                        {new Date(recipe.createdAt).toLocaleDateString()}
                                    </span>
                                    </div>

                                    {/* Category */}
                                    {recipe.category && (
                                        <div>
                                            <span className="text-gray-500">Category:</span>
                                            <span className="ml-2 text-gray-900 capitalize">
                                            {recipe.category.replace(/-/g, ' ')}
                                        </span>
                                        </div>
                                    )}

                                    {/* Privacy Status */}
                                    <div>
                                        <span className="text-gray-500">Visibility:</span>
                                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                            recipe.isPublic
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {recipe.isPublic ? 'Public' : 'Private'}
                                    </span>
                                    </div>

                                    {/* FIXED: Show transformation status if applied */}
                                    {recipe.transformationApplied && (
                                        <div className="pt-2 border-t border-gray-200">
                                            <span className="text-gray-500">Transformation:</span>
                                            <div className="ml-2 text-sm">
                                                {recipe.transformationApplied.type === 'scale' && (
                                                    <span className="text-blue-600">
                                                    Scaled to {recipe.servings} servings
                                                </span>
                                                )}
                                                {recipe.transformationApplied.type === 'convert' && (
                                                    <span className="text-purple-600">
                                                    Converted to {recipe.transformationApplied.targetSystem === 'metric' ? 'Metric' : 'US Standard'}
                                                </span>
                                                )}
                                                {recipe.transformationApplied.type === 'both' && (
                                                    <span className="text-green-600">
                                                    Scaled & Converted
                                                </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Compact Nutrition Display */}
                            {!showNutrition && hasNutritionData && (
                                <div className="bg-white rounded-lg border p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Nutrition Facts</h3>
                                        <TouchEnhancedButton
                                            onClick={() => setShowNutritionModal(true)}
                                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                                        >
                                            View Details
                                        </TouchEnhancedButton>
                                    </div>
                                    <NutritionFacts
                                        nutrition={getNormalizedNutrition()}
                                        servings={recipe.servings || 1}
                                        showPerServing={true}
                                        compact={false}
                                    />
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="bg-white rounded-lg border p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipe Actions</h3>
                                <div className="space-y-3">
                                    <TouchEnhancedButton
                                        onClick={() => setShowQuickShoppingList(true)}
                                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        🛒 Shopping List
                                    </TouchEnhancedButton>

                                    <AddToCollectionButton recipeId={recipeId}/>

                                    {session?.user?.id === recipe.createdBy && (
                                        <TouchEnhancedButton
                                            onClick={() => router.push(`/recipes/${recipeId}/edit`)}
                                            className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                                        >
                                            ✏️ Edit Recipe
                                        </TouchEnhancedButton>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Shopping List Modal */}
            {showQuickShoppingList && (
                <RecipeShoppingList
                    recipeId={recipeId}
                    recipeName={recipe.title}
                    onClose={() => setShowQuickShoppingList(false)}
                />
            )}

            {/* Add to Meal Plan Modal */}
            {showMealPlanModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-200 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Add "{recipe.title}" to Meal Plan
                                </h3>
                                <TouchEnhancedButton
                                    onClick={() => setShowMealPlanModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                                Select a meal plan and choose when you'd like to add this recipe.
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingMealPlans ? (
                                <div className="text-center py-12">
                                    <div
                                        className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600">Loading meal plans...</p>
                                </div>
                            ) : mealPlans.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">📅</div>
                                    <h4 className="text-lg font-medium text-gray-900 mb-2">No meal plans found</h4>
                                    <p className="text-gray-500 mb-6">Create your first meal plan to get started!</p>
                                    <TouchEnhancedButton
                                        onClick={() => {
                                            setShowMealPlanModal(false);
                                            router.push('/meal-planning');
                                        }}
                                        className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors font-medium"
                                    >
                                        Go to Meal Planning
                                    </TouchEnhancedButton>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {mealPlans.map(mealPlan => (
                                        <div key={mealPlan._id}
                                             className="border border-gray-200 rounded-lg overflow-hidden">
                                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                                <h4 className="font-semibold text-gray-900 text-lg">{mealPlan.name}</h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Week
                                                    of {new Date(mealPlan.weekStartDate).toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                                </p>
                                            </div>

                                            <div className="p-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                                                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                                                        <div key={day} className="space-y-3">
                                                            <div
                                                                className="font-medium text-gray-700 capitalize text-center">
                                                                {day}
                                                            </div>
                                                            <div className="space-y-2">
                                                                {['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'].map(mealType => (
                                                                    <TouchEnhancedButton
                                                                        key={`${day}-${mealType}`}
                                                                        onClick={() => addToMealPlan(mealPlan._id, day, mealType)}
                                                                        className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-gray-200 rounded-md transition-colors"
                                                                    >
                                                                        {mealType}
                                                                    </TouchEnhancedButton>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    💡 Tip: You can create and manage meal plans in the
                                    <TouchEnhancedButton
                                        onClick={() => {
                                            setShowMealPlanModal(false);
                                            router.push('/meal-planning');
                                        }}
                                        className="ml-1 text-indigo-600 hover:text-indigo-700 underline"
                                    >
                                        Meal Planning
                                    </TouchEnhancedButton> section
                                </p>
                                <TouchEnhancedButton
                                    onClick={() => setShowMealPlanModal(false)}
                                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Nutrition Details Modal */}
            <NutritionModal
                nutrition={getNormalizedNutrition()}
                isOpen={showNutritionModal}
                onClose={() => setShowNutritionModal(false)}
                servings={recipe?.servings || 1}
                recipeTitle={recipe?.title || "Recipe"}
            />

            <Footer/>
        </MobileOptimizedLayout>
    );
}