'use client';

// file: /app/recipe-preview/[id]/page.js - Enhanced Public Recipe Preview with Multi-Part Banner

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Footer from "@/components/legal/Footer";

export default function PublicRecipePreview() {
    const params = useParams();
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [servingMultiplier, setServingMultiplier] = useState(1);
    const [activeTab, setActiveTab] = useState('ingredients');
    const [relatedRecipes, setRelatedRecipes] = useState([]);

    // Fetch the recipe data using the public API
    useEffect(() => {
        const fetchRecipe = async () => {
            if (!params.id) return;

            try {
                setLoading(true);
                setError('');

                // Use the dedicated public recipe API
                const response = await fetch(`/api/public-recipe/${params.id}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Recipe not found or not publicly available');
                    } else {
                        throw new Error(`Failed to load recipe: ${response.status}`);
                    }
                }

                const data = await response.json();

                if (data.success && data.recipe) {
                    console.log('📋 Raw recipe data from API:', {
                        id: data.recipe._id,
                        title: data.recipe.title,
                        isMultiPart: data.recipe.isMultiPart,
                        parts: data.recipe.parts,
                        ingredients: data.recipe.ingredients,
                        allKeys: Object.keys(data.recipe)
                    });

                    setRecipe(data.recipe);

                    // Fetch related recipes
                    await fetchRelatedRecipes(data.recipe);
                } else {
                    throw new Error(data.error || 'Failed to load recipe');
                }

            } catch (error) {
                console.error('Error fetching recipe:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchRecipe();
    }, [params.id]);

    const fetchRelatedRecipes = async (currentRecipe) => {
        try {
            const response = await fetch('/api/public-recipes');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Find related recipes (same category or similar tags)
                    const related = data.recipes
                        .filter(r => r._id !== currentRecipe._id)
                        .filter(r => {
                            const sameCategory = r.category === currentRecipe.category;
                            const sharedTags = currentRecipe.tags?.some(tag =>
                                r.tags?.includes(tag)
                            ) || false;
                            return sameCategory || sharedTags;
                        })
                        .sort((a, b) => (b.ratingStats?.averageRating || 0) - (a.ratingStats?.averageRating || 0))
                        .slice(0, 3);

                    setRelatedRecipes(related);
                }
            }
        } catch (error) {
            console.error('Error fetching related recipes:', error);
        }
    };

    const adjustAmount = (amount) => {
        if (!amount || typeof amount !== 'number') return '';
        const adjusted = amount * servingMultiplier;
        return adjusted.toFixed(2).replace(/\.?0+$/, '');
    };

    const formatTime = (minutes) => {
        if (!minutes || minutes === 0) return 'No time specified';
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

    const renderStars = (rating) => {
        const stars = [];
        const safeRating = Math.max(0, Math.min(5, rating || 0));

        for (let i = 1; i <= 5; i++) {
            stars.push(
                <span key={i} className={i <= safeRating ? 'text-yellow-400' : 'text-gray-300'}>
                    ★
                </span>
            );
        }
        return stars;
    };

    // ADDED: Helper to get multi-part recipe stats
    const getMultiPartStats = (recipe) => {
        // Add debug logging
        console.log('🧩 Multi-part detection debug:', {
            recipeId: recipe?._id,
            recipeTitle: recipe?.title,
            isMultiPart: recipe?.isMultiPart,
            isMultiPartType: typeof recipe?.isMultiPart,
            hasParts: !!recipe?.parts,
            partsLength: recipe?.parts?.length,
            wholeRecipeKeys: recipe ? Object.keys(recipe) : []
        });

        if (!recipe || !recipe.isMultiPart || !recipe.parts || !Array.isArray(recipe.parts)) {
            console.log('❌ Not a multi-part recipe');
            return null;
        }

        const totalIngredients = recipe.parts.reduce((total, part) => total + (part?.ingredients?.length || 0), 0);
        const totalInstructions = recipe.parts.reduce((total, part) => total + (part?.instructions?.length || 0), 0);

        const stats = {
            partCount: recipe.parts.length,
            totalIngredients,
            totalInstructions,
            partNames: recipe.parts.map(part => part?.name || 'Unnamed Part')
        };

        console.log('✅ Multi-part stats:', stats);
        return stats;
    };

    const getRecipeImage = (recipe) => {
        console.log('🔍 getRecipeImage debug:', {
            hasPrimaryPhoto: !!recipe.primaryPhoto,
            primaryPhotoType: typeof recipe.primaryPhoto,
            hasPhotos: recipe.hasPhotos,
            photosLength: recipe.photos?.length,
            hasUploadedImage: !!recipe.uploadedImage?.data,
            imageUrl: recipe.imageUrl,
            imagePriority: recipe.imagePriority
        });

        // Priority 1: Primary Photo (populated from RecipePhoto collection)
        if (recipe.primaryPhoto && recipe.hasPhotos) {
            // Check if primaryPhoto is populated (object) vs just ObjectId (string)
            if (typeof recipe.primaryPhoto === 'object') {
                // If primaryPhoto is populated as an object with image data
                if (recipe.primaryPhoto.imageData) {
                    console.log('✅ Using primaryPhoto.imageData');
                    return `data:${recipe.primaryPhoto.mimeType || 'image/jpeg'};base64,${recipe.primaryPhoto.imageData}`;
                }
                // If primaryPhoto has a URL
                if (recipe.primaryPhoto.url) {
                    console.log('✅ Using primaryPhoto.url');
                    return recipe.primaryPhoto.url;
                }
                // If primaryPhoto has direct data field
                if (recipe.primaryPhoto.data) {
                    console.log('✅ Using primaryPhoto.data');
                    return `data:${recipe.primaryPhoto.mimeType || 'image/jpeg'};base64,${recipe.primaryPhoto.data}`;
                }
            } else {
                console.log('⚠️ primaryPhoto is not populated (just ObjectId):', recipe.primaryPhoto);
            }
        }

        // Priority 2: Photos array (if populated)
        if (recipe.photos && recipe.photos.length > 0) {
            const firstPhoto = recipe.photos[0];
            if (typeof firstPhoto === 'object') {
                if (firstPhoto.imageData) {
                    console.log('✅ Using photos[0].imageData');
                    return `data:${firstPhoto.mimeType || 'image/jpeg'};base64,${firstPhoto.imageData}`;
                }
                if (firstPhoto.url) {
                    console.log('✅ Using photos[0].url');
                    return firstPhoto.url;
                }
                if (firstPhoto.data) {
                    console.log('✅ Using photos[0].data');
                    return `data:${firstPhoto.mimeType || 'image/jpeg'};base64,${firstPhoto.data}`;
                }
            } else {
                console.log('⚠️ photos[0] is not populated (just ObjectId):', firstPhoto);
            }
        }

        // Priority 3: Uploaded Image (embedded in recipe document)
        if (recipe.uploadedImage?.data) {
            console.log('✅ Using uploadedImage.data');
            return `data:${recipe.uploadedImage.mimeType || 'image/jpeg'};base64,${recipe.uploadedImage.data}`;
        }

        // Priority 4: External Image URL
        if (recipe.imageUrl && recipe.imageUrl !== '/images/recipe-placeholder.jpg') {
            console.log('✅ Using imageUrl');
            return recipe.imageUrl;
        }

        // Priority 5: Extracted Image from video
        if (recipe.extractedImage?.data) {
            console.log('✅ Using extractedImage.data');
            return `data:${recipe.extractedImage.mimeType || 'image/jpeg'};base64,${recipe.extractedImage.data}`;
        }

        // Fallback: Placeholder
        console.log('❌ Using placeholder - no images found');
        return '/images/recipe-placeholder.jpg';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Recently';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 recipe-container">
                <nav className="bg-white shadow-sm border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-4">
                            <Link href="/" className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                                    <span className="text-white text-xl">🍳</span>
                                </div>
                                <div className="hidden sm:block">
                                    <h1 className="text-xl font-bold text-gray-900">Doc Bear's Comfort Kitchen</h1>
                                </div>
                            </Link>
                        </div>
                    </div>
                </nav>

                <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                            <div className="space-y-2">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                            <div className="space-y-2">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !recipe) {
        return (
            <div className="min-h-screen bg-gray-50">
                <nav className="bg-white shadow-sm border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-4">
                            <Link href="/" className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                                    <span className="text-white text-xl">🍳</span>
                                </div>
                                <div className="hidden sm:block">
                                    <h1 className="text-xl font-bold text-gray-900">Doc Bear's Comfort Kitchen</h1>
                                </div>
                            </Link>
                        </div>
                    </div>
                </nav>

                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center px-4">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Recipe Not Available</h2>
                        <p className="text-gray-600 mb-8">
                            {error || 'This recipe is not publicly available or doesn\'t exist.'}
                        </p>
                        <Link
                            href="/recipe-search"
                            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Browse All Recipes
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

// ADDED: Get multi-part stats for banner
    const multiPartStats = getMultiPartStats(recipe);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Add custom CSS for better text wrapping and scrollbar hiding */}
            <style jsx>{`
                .scrollbar-hide {
                    -ms-overflow-style: none !important;  /* Internet Explorer 10+ */
                    scrollbar-width: none !important;  /* Firefox */
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none !important;  /* Safari and Chrome */
                }
                .overflow-wrap-anywhere {
                    overflow-wrap: anywhere !important;
                    word-break: break-all !important;
                    hyphens: auto !important;
                }
                .mobile-url-break {
                    font-size: 0.875rem !important;
                    line-height: 1.3 !important;
                    max-width: 100% !important;
                    overflow-wrap: anywhere !important;
                    word-break: break-all !important;
                    hyphens: auto !important;
                }
                @media (max-width: 640px) {
                    .mobile-url-break {
                        font-size: 0.75rem !important;
                        line-height: 1.2 !important;
                    }
                }
                /* Ensure no horizontal overflow */
                .recipe-container {
                    max-width: 100vw !important;
                    overflow-x: hidden !important;
                }
                .recipe-content {
                    max-width: 100% !important;
                    overflow-wrap: break-word !important;
                    word-wrap: break-word !important;
                }
                /* Add this CSS to your recipe page or global styles */
                /* This ensures optimal image display across all devices */

                .recipe-hero-image {
                    /* Responsive image heights */
                    height: 16rem !important; /* 256px - mobile */
                }

                @media (min-width: 640px) {
                    .recipe-hero-image {
                        height: 20rem !important; /* 320px - tablet */
                    }
                }

                @media (min-width: 1024px) {
                    .recipe-hero-image {
                        height: 24rem !important; /* 384px - desktop */
                    }
                }

                @media (min-width: 1280px) {
                    .recipe-hero-image {
                        height: 32rem !important; /* 512px - large desktop */
                    }
                }

                /* Ensure images cover the full area properly */
                .recipe-hero-image img {
                    width: 100% !important;
                    object-fit: cover !important;
                    object-position: center !important;
                }

                /* Improve text readability over images */
                .recipe-overlay-text {
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5) !important;
                    background: rgba(0, 0, 0, 0.4) !important;
                    backdrop-filter: blur(2px) !important;
                }

                /* Enhanced responsive grid for recipe stats */
                .recipe-stats-grid {
                    display: grid !important;
                    gap: 1rem !important;
                }

                @media (min-width: 1024px) {
                    .recipe-stats-grid {
                        grid-template-columns: 1fr 1fr !important;
                        gap: 1.5rem !important;
                    }
                }

                /* Better mobile spacing */
                @media (max-width: 639px) {
                    .recipe-content {
                        padding-left: 1rem !important;
                        padding-right: 1rem !important;
                    }

                    .recipe-hero-image {
                        margin-left: -1rem !important;
                        margin-right: -1rem !important;
                        border-radius: 0 !important;
                    }
                }

                /* Improve button layout on different screen sizes */
                .recipe-action-buttons {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 0.75rem !important;
                }

                @media (min-width: 640px) {
                    .recipe-action-buttons {
                        flex-direction: row !important;
                    }
                }

                /* Enhanced card styling for better visual hierarchy */
                .recipe-card {
                    background: white !important;
                    border-radius: 1rem !important;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
                    overflow: hidden !important;
                    transition: box-shadow 0.3s ease !important;
                }

                .recipe-card:hover {
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
                }

                /* Better typography scaling */
                .recipe-title {
                    font-size: 1.5rem !important;
                    line-height: 1.2 !important;
                }

                @media (min-width: 640px) {
                    .recipe-title {
                        font-size: 1.875rem !important;
                    }
                }

                @media (min-width: 1024px) {
                    .recipe-title {
                        font-size: 2.25rem !important;
                    }
                }

                @media (min-width: 1280px) {
                    .recipe-title {
                        font-size: 3rem !important;
                    }
                }
            `}</style>
            {/* Navigation */}
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <Link href="/" className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                                <span className="text-white text-xl">🍳</span>
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold text-gray-900">Doc Bear's Comfort Kitchen</h1>
                                </div>
                            </Link>

                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <Link href="/recipe-search" className="text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 text-sm font-medium">
                                    ← Back to Recipes
                                </Link>
                                <Link href="/auth/signup" className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium">
                                    Save Recipe
                                </Link>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* ADDED: Multi-Part Recipe Banner */}
                {multiPartStats && (
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4">
                        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex flex-col sm:flex-row items-center justify-between">
                                <div className="flex items-center space-x-3 mb-3 sm:mb-0">
                                    <div className="bg-white bg-opacity-20 rounded-full p-2">
                                        <span className="text-2xl">🧩</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold">Multi-Part Recipe</h3>
                                        <p className="text-sm text-blue-100">
                                            This recipe has {multiPartStats.partCount} parts with {multiPartStats.totalIngredients} total ingredients and {multiPartStats.totalInstructions} total steps
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
                                    <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                                        {multiPartStats.partNames.slice(0, 2).map((partName, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white"
                                            >
                                            {partName}
                                        </span>
                                        ))}
                                        {multiPartStats.partNames.length > 2 && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
                                            +{multiPartStats.partNames.length - 2} more
                                        </span>
                                        )}
                                    </div>
                                    <Link
                                        href="/auth/signup"
                                        className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm"
                                    >
                                        Sign Up to See Full Multi-Part View
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Enhanced Recipe Header with Better Image Display */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 recipe-content">
                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6 sm:mb-8">
                        {/* Desktop: Image above content, Mobile: Maintain current layout */}
                        <div className="block">
                            {/* Hero Image Section - Full width on all devices */}
                            <div className="relative w-full">
                                <Image
                                    src={getRecipeImage(recipe)}
                                    alt={recipe.title || 'Recipe'}
                                    width={1200}
                                    height={600}
                                    className="w-full h-64 sm:h-80 lg:h-96 xl:h-[32rem] object-cover"
                                    priority
                                />
                                <div className="absolute top-4 left-4">
                                    {recipe.difficulty && (
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                            {recipe.difficulty}
                        </span>
                                    )}
                                </div>
                                {/* Recipe Stats Overlay on Desktop */}
                                <div className="hidden lg:block absolute bottom-4 right-4">
                                    <div className="bg-black bg-opacity-70 rounded-lg p-3 text-white">
                                        <div className="flex items-center space-x-4 text-sm">
                                            {((recipe.cookTime || 0) + (recipe.prepTime || 0)) > 0 && (
                                                <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                                    {formatTime((recipe.cookTime || 0) + (recipe.prepTime || 0))}
                                </span>
                                            )}
                                            {recipe.servings && (
                                                <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                    </svg>
                                                    {recipe.servings} servings
                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recipe Info Section */}
                            <div className="p-4 sm:p-6 lg:p-8">
                                {/* Tags */}
                                {recipe.tags && recipe.tags.length > 0 && (
                                    <div className="flex flex-wrap items-center space-x-2 mb-4">
                                        {recipe.tags.slice(0, 3).map((tag, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800"
                                            >
                                {tag}
                            </span>
                                        ))}
                                        {recipe.tags.length > 3 && (
                                            <span className="text-xs text-gray-500">+{recipe.tags.length - 3} more</span>
                                        )}
                                    </div>
                                )}

                                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-4">
                                    {recipe.title}
                                </h1>

                                {recipe.description && (
                                    <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 leading-relaxed">
                                        {recipe.description}
                                    </p>
                                )}

                                {/* Two Column Layout for Desktop */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                                    {/* Left Column: Author and Rating */}
                                    <div>
                                        {/* Author Info */}
                                        <div className="flex items-center mb-6">
                                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-purple-600 font-semibold">
                                    {recipe.author.name.charAt(0).toUpperCase()}
                                </span>
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">
                                                    {recipe.author.name}
                                                </div>
                                                {recipe.importedFrom && (
                                                    <div className="text-sm text-gray-600">
                                                        From {recipe.importedFrom}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Rating */}
                                        {recipe.rating.average > 0 && (
                                            <div className="flex items-center mb-6">
                                                <div className="flex items-center mr-4">
                                                    {renderStars(recipe.rating.average)}
                                                    <span className="text-lg font-semibold text-gray-900 ml-2">
                                        {recipe.rating.average.toFixed(1)}
                                    </span>
                                                </div>
                                                <span className="text-gray-600">
                                    ({recipe.rating.totalRatings} review{recipe.rating.totalRatings !== 1 ? 's' : ''})
                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: Recipe Stats and Actions */}
                                    <div>
                                        {/* Recipe Stats - Mobile/Tablet Visible */}
                                        <div className="grid grid-cols-3 gap-4 mb-6 lg:hidden">
                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                <div className="text-lg sm:text-xl font-bold text-gray-900">
                                                    {formatTime(recipe.prepTime)}
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-600">Prep Time</div>
                                            </div>
                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                <div className="text-lg sm:text-xl font-bold text-gray-900">
                                                    {formatTime(recipe.cookTime)}
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-600">Cook Time</div>
                                            </div>
                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                <div className="text-lg sm:text-xl font-bold text-gray-900">
                                                    {recipe.servings || 'N/A'}
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-600">Servings</div>
                                            </div>
                                        </div>

                                        {/* Enhanced Stats for Desktop */}
                                        <div className="hidden lg:grid lg:grid-cols-2 gap-4 mb-6">
                                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                                                <div className="text-sm text-blue-600 font-medium">Total Time</div>
                                                <div className="text-2xl font-bold text-blue-900">
                                                    {formatTime((recipe.cookTime || 0) + (recipe.prepTime || 0))}
                                                </div>
                                                <div className="text-xs text-blue-600">
                                                    Prep: {formatTime(recipe.prepTime)} | Cook: {formatTime(recipe.cookTime)}
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                                                <div className="text-sm text-green-600 font-medium">Servings</div>
                                                <div className="text-2xl font-bold text-green-900">
                                                    {recipe.servings || 'N/A'}
                                                </div>
                                                <div className="text-xs text-green-600">
                                                    Difficulty: {recipe.difficulty || 'Medium'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Serving Adjuster */}
                                        {recipe.servings && (
                                            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
                                                <span className="text-lg font-semibold text-gray-900">Adjust Servings:</span>
                                                <div className="flex items-center space-x-3">
                                                    <button
                                                        onClick={() => setServingMultiplier(Math.max(0.5, servingMultiplier - 0.5))}
                                                        className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center hover:bg-purple-300 transition-colors"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-lg font-semibold w-12 text-center">
                                        {Math.round(recipe.servings * servingMultiplier)}
                                    </span>
                                                    <button
                                                        onClick={() => setServingMultiplier(servingMultiplier + 0.5)}
                                                        className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center hover:bg-purple-300 transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* CTA Buttons */}
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Link
                                                href="/auth/signup"
                                                className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold text-center"
                                            >
                                                Save Recipe
                                            </Link>
                                            <Link
                                                href="/auth/signup"
                                                className="flex-1 border border-purple-600 text-purple-600 px-6 py-3 rounded-lg hover:bg-purple-50 transition-colors font-semibold text-center"
                                            >
                                                Add to Meal Plan
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recipe Content */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
                        {/* Main Content */}
                        <div className="xl:col-span-2">
                            {/* Tab Navigation */}
                            <div className="bg-white rounded-t-2xl shadow-sm border-b">
                                <div className="flex border-b border-gray-200 overflow-x-auto">
                                    {[
                                        { id: 'ingredients', label: 'Ingredients', icon: '📝' },
                                        { id: 'instructions', label: 'Instructions', icon: '👨‍🍳' },
                                        { id: 'reviews', label: 'Reviews', icon: '⭐' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex-1 min-w-0 py-4 px-4 sm:px-6 text-center font-medium transition-colors whitespace-nowrap ${
                                                activeTab === tab.id
                                                    ? 'border-b-2 border-purple-600 text-purple-600'
                                                    : 'text-gray-600 hover:text-gray-800'
                                            }`}
                                        >
                                            <span className="hidden sm:inline">{tab.icon} </span>
                                            {tab.label}
                                            {tab.id === 'reviews' && recipe.rating.totalRatings > 0 && (
                                                <span className="ml-1 text-xs bg-gray-200 rounded-full px-2 py-1">
                                                    {recipe.rating.totalRatings}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="bg-white rounded-b-2xl shadow-sm border border-t-0 p-4 sm:p-6">
                                {activeTab === 'ingredients' && (
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-4">Ingredients</h3>
                                        {recipe.ingredients.length > 0 ? (
                                            <div className="space-y-3">
                                                {recipe.ingredients.map((ingredient, index) => (
                                                    <div key={index} className="flex items-start py-2 border-b border-gray-100 last:border-b-0">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded flex-shrink-0 mt-0.5"
                                                        />
                                                        <div className="ml-3 flex-1">
                                                            <span className="text-gray-900">
                                                                {(ingredient.amount || ingredient.unit) && (
                                                                    <span className="font-medium text-gray-700 mr-2">
                                                                        {ingredient.amount && adjustAmount(ingredient.amount)} {ingredient.unit}
                                                                    </span>
                                                                )}
                                                                {ingredient.name}
                                                                {ingredient.optional && (
                                                                    <span className="text-gray-500 text-sm ml-1">(optional)</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic">No ingredients listed</p>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'instructions' && (
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-4">Instructions</h3>
                                        {recipe.instructions.length > 0 ? (
                                            <div className="space-y-6">
                                                {recipe.instructions.map((instruction, index) => (
                                                    <div key={index} className="flex">
                                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold mr-4 mt-1">
                                                            {instruction.step}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-gray-700 mb-2">{instruction.text}</p>
                                                            {instruction.videoTimestamp && (
                                                                <div className="text-sm text-blue-600">
                                                                    🎥 Video timestamp: {Math.floor(instruction.videoTimestamp / 60)}:{(instruction.videoTimestamp % 60).toString().padStart(2, '0')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic">No instructions provided</p>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'reviews' && (
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                                            Reviews ({recipe.rating.totalRatings})
                                        </h3>

                                        {/* Rating Summary */}
                                        {recipe.rating.average > 0 && (
                                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-center">
                                                        <div className="text-3xl font-bold text-gray-900">
                                                            {recipe.rating.average.toFixed(1)}
                                                        </div>
                                                        <div className="flex justify-center mb-1">
                                                            {renderStars(recipe.rating.average)}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {recipe.rating.totalRatings} reviews
                                                        </div>
                                                    </div>

                                                    {/* Rating Distribution */}
                                                    <div className="flex-1 ml-8">
                                                        {[5, 4, 3, 2, 1].map(stars => {
                                                            const count = recipe.rating.distribution[stars] || 0;
                                                            const percentage = recipe.rating.totalRatings > 0
                                                                ? (count / recipe.rating.totalRatings) * 100
                                                                : 0;

                                                            return (
                                                                <div key={stars} className="flex items-center mb-1">
                                                                    <span className="text-sm w-8">{stars}★</span>
                                                                    <div className="flex-1 mx-2 bg-gray-200 rounded-full h-2">
                                                                        <div
                                                                            className="bg-yellow-400 h-2 rounded-full"
                                                                            style={{ width: `${percentage}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className="text-sm text-gray-600 w-8">{count}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Individual Reviews */}
                                        {recipe.reviews.length > 0 ? (
                                            <div className="space-y-4">
                                                {recipe.reviews.map((review) => (
                                                    <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center space-x-3">
                                                                <span className="font-semibold text-gray-900">
                                                                    {review.authorName}
                                                                </span>
                                                                <div className="flex items-center">
                                                                    {renderStars(review.rating)}
                                                                </div>
                                                            </div>
                                                            <span className="text-sm text-gray-500">
                                                                {formatDate(review.createdAt)}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-700 mb-2">{review.comment}</p>
                                                        {review.helpfulCount > 0 && (
                                                            <div className="flex items-center text-sm text-gray-500">
                                                                <span>👍 {review.helpfulCount} found this helpful</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="text-gray-500 mb-4">
                                                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.436L3 21l1.436-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"/>
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
                                                <p className="text-gray-500 mb-4">
                                                    Be the first to review this recipe!
                                                </p>
                                                <Link
                                                    href="/auth/signup"
                                                    className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                                                >
                                                    Sign Up to Review
                                                </Link>
                                            </div>
                                        )}

                                        {/* Write Review CTA */}
                                        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                            <h4 className="font-semibold text-purple-900 mb-2">Share your experience!</h4>
                                            <p className="text-purple-700 text-sm mb-3">
                                                Help other cooks by sharing your thoughts on this recipe.
                                            </p>
                                            <Link
                                                href="/auth/signup"
                                                className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                            >
                                                Sign Up to Write Review
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Recipe Source */}
                            {recipe.source && (
                                <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Recipe Source</h3>
                                    <div className="w-full">
                                        <a
                                            href={recipe.source}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 underline text-sm mobile-url-break block w-full"
                                            style={{
                                                overflowWrap: 'anywhere',
                                                wordBreak: 'break-all',
                                                hyphens: 'auto'
                                            }}
                                        >
                                            {recipe.source}
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Video Info */}
                            {recipe.videoMetadata && (
                                <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Video Recipe</h3>
                                    <div className="space-y-2 text-sm text-gray-700">
                                        <p>📹 This recipe was imported from a video</p>
                                        {recipe.videoMetadata.duration && (
                                            <p>⏱️ Duration: {Math.floor(recipe.videoMetadata.duration / 60)}:{(recipe.videoMetadata.duration % 60).toString().padStart(2, '0')}</p>
                                        )}
                                        {recipe.videoMetadata.title && (
                                            <p className="font-medium">"{recipe.videoMetadata.title}"</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Recipe Stats */}
                            <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Recipe Stats</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Views</span>
                                        <span className="font-medium">{recipe.viewCount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Category</span>
                                        <span className="font-medium capitalize">{recipe.category.replace('-', ' ')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Added</span>
                                        <span className="font-medium">{formatDate(recipe.createdAt)}</span>
                                    </div>
                                    {/* ADDED: Multi-part info in stats */}
                                    {multiPartStats && (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Recipe Type</span>
                                                <span className="font-medium text-blue-600">Multi-Part</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Parts</span>
                                                <span className="font-medium">{multiPartStats.partCount}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Total Ingredients</span>
                                                <span className="font-medium">{multiPartStats.totalIngredients}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Total Steps</span>
                                                <span className="font-medium">{multiPartStats.totalInstructions}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Related Recipes */}
                            {relatedRecipes.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">You Might Also Like</h3>
                                    <div className="space-y-4">
                                        {relatedRecipes.map((relatedRecipe) => (
                                            <Link
                                                key={relatedRecipe._id}
                                                href={`/recipe-preview/${relatedRecipe._id}`}
                                                className="block hover:bg-gray-50 p-3 rounded-lg transition-colors"
                                            >
                                                <div className="text-center">
                                                    <Image
                                                        src={relatedRecipe.imageUrl || '/images/recipe-placeholder.jpg'}
                                                        alt={relatedRecipe.title || 'Recipe'}
                                                        width={80}
                                                        height={80}
                                                        className="w-20 h-20 object-cover rounded-lg mx-auto mb-3"
                                                    />
                                                    <h4 className="font-medium text-gray-900 text-sm text-center mb-1">
                                                        {relatedRecipe.title || 'Untitled Recipe'}
                                                    </h4>
                                                    {relatedRecipe.ratingStats?.averageRating > 0 && (
                                                        <div className="flex items-center justify-center">
                                                            <span className="text-yellow-400 text-sm">★</span>
                                                            <span className="text-xs text-gray-600 ml-1">
                                                                {relatedRecipe.ratingStats.averageRating.toFixed(1)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Call to Action */}
                            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4 sm:p-6 border border-purple-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Love This Recipe?</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Create your free account to save recipes, plan meals, get nutrition data, and access our full collection of 650+ recipes!
                                </p>

                                {/* ADDED: Enhanced CTA for multi-part recipes */}
                                {multiPartStats && (
                                    <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 mb-4">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="text-blue-600">🧩</span>
                                            <span className="text-sm font-semibold text-blue-900">Multi-Part Recipe Benefits</span>
                                        </div>
                                        <ul className="text-xs text-blue-800 space-y-1">
                                            <li>• Organized view with {multiPartStats.partCount} separate sections</li>
                                            <li>• Interactive ingredient lists for each part</li>
                                            <li>• Step-by-step instructions by section</li>
                                            <li>• Professional cooking workflow</li>
                                        </ul>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Link
                                        href="/auth/signup"
                                        className="block w-full bg-purple-600 text-white text-center px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                                    >
                                        Get Started Free
                                    </Link>
                                    <Link
                                        href="/pricing"
                                        className="block w-full text-purple-600 text-center px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium"
                                    >
                                        View All Plans
                                    </Link>
                                </div>

                                {/* Premium Features Teaser */}
                                <div className="mt-4 pt-4 border-t border-purple-200">
                                    <p className="text-xs text-purple-700 font-medium mb-2">Premium features:</p>
                                    <div className="grid grid-cols-2 gap-1 text-xs text-purple-600">
                                        <span>• Nutrition data</span>
                                        <span>• Meal planning</span>
                                        <span>• Shopping lists</span>
                                        <span>• Recipe editing</span>
                                        {multiPartStats && (
                                            <>
                                                <span>• Multi-part view</span>
                                                <span>• Part organization</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-8 sm:mt-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 sm:p-8 text-center text-white">
                        <h2 className="text-xl sm:text-2xl font-bold mb-4">Ready to Start Cooking?</h2>
                        <p className="text-base sm:text-lg mb-6 opacity-90">
                            Join thousands of home cooks using Doc Bear's Comfort Kitchen to organize their recipes and plan amazing meals.
                        </p>

                        {/* ADDED: Multi-part specific messaging */}
                        {multiPartStats && (
                            <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-6">
                                <p className="text-sm mb-2">
                                    🧩 This multi-part recipe has {multiPartStats.partCount} sections with organized ingredients and step-by-step instructions for each part.
                                </p>
                                <p className="text-xs opacity-90">
                                    Sign up to see the full interactive multi-part experience!
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/auth/signup"
                                className="bg-white text-purple-600 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                            >
                                Create Free Account
                            </Link>
                            <Link
                                href="/recipe-search"
                                className="border-2 border-white text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors"
                            >
                                Browse More Recipes
                            </Link>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }