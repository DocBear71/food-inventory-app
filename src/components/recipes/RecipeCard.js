'use client';

// file: /src/components/recipes/RecipeCard.js - v3 (With Photos, Social Sharing, and Cooking Integration)

import { useState } from 'react';
import Link from 'next/link';
import RecipeCookingIntegration from '@/components/recipes/RecipeCookingIntegration';
import { SocialMediaShare } from '@/components/recipes/SocialMediaShare';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function RecipeCard({ recipe, onEdit, onDelete, showActions = true }) {
    const [showCooking, setShowCooking] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);

    // Get primary photo or first photo
    const primaryPhoto = recipe.photos?.find(photo => photo.isPrimary) || recipe.photos?.[0];

    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-orange-500' : 'bg-blue-500';

        toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full opacity-0`;
        toast.innerHTML = `
        <div class="flex items-center space-x-2">
            <span>${message}</span>
        </div>
    `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    };

    const handleCookingComplete = (summary) => {
        console.log('Cooking completed:', summary);
        showToast(`Successfully updated inventory! ${summary.itemsRemoved.length} items removed, ${summary.itemsUpdated.length} items updated.`);
        setShowCooking(false);
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'bg-green-100 text-green-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'hard': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* Recipe Photo */}
                <div className="relative h-48 bg-gray-200">
                    {primaryPhoto ? (
                        <img
                            src={primaryPhoto.url}
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-6xl">🍳</span>
                        </div>
                    )}

                    {/* Photo Count Badge */}
                    {recipe.photos?.length > 1 && (
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                            📸 {recipe.photos.length}
                        </div>
                    )}

                    {/* Difficulty Badge */}
                    {recipe.difficulty && (
                        <div className="absolute top-2 left-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getDifficultyColor(recipe.difficulty)}`}>
                                {recipe.difficulty}
                            </span>
                        </div>
                    )}

                    {/* Quick Share Button */}
                    <div className="absolute top-2 right-2">
                        <TouchEnhancedButton
                            onClick={() => setShowShareMenu(!showShareMenu)}
                            className="bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-80 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                            </svg>
                        </TouchEnhancedButton>

                        {/* Share Menu Dropdown */}
                        {showShareMenu && (
                            <div className="absolute right-0 top-12 bg-white rounded-lg shadow-lg border p-2 z-10 min-w-[200px]">
                                <SocialMediaShare recipe={recipe} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                            <Link href={`/recipes/${recipe._id}`} className="hover:text-indigo-600">
                                {recipe.title}
                            </Link>
                        </h3>
                    </div>

                    {recipe.description && (
                        <p className="text-gray-600 mb-4 line-clamp-2">{recipe.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-500">
                        {recipe.prepTime && (
                            <div className="flex items-center">
                                <span className="mr-1">⏱️</span>
                                Prep: {recipe.prepTime}min
                            </div>
                        )}
                        {recipe.cookTime && (
                            <div className="flex items-center">
                                <span className="mr-1">🔥</span>
                                Cook: {recipe.cookTime}min
                            </div>
                        )}
                        {recipe.servings && (
                            <div className="flex items-center">
                                <span className="mr-1">🍽️</span>
                                Serves: {recipe.servings}
                            </div>
                        )}
                    </div>

                    {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                            {recipe.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                    {tag}
                                </span>
                            ))}
                            {recipe.tags.length > 3 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                                    +{recipe.tags.length - 3} more
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <div className="flex gap-2 flex-wrap">
                            <TouchEnhancedButton
                                onClick={() => setShowCooking(true)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                                👨‍🍳 Cook This
                            </TouchEnhancedButton>

                            <Link href={`/recipes/${recipe._id}`}>
                                <TouchEnhancedButton className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    📖 View Recipe
                                </TouchEnhancedButton>
                            </Link>

                            {/* Scale Recipe Button */}
                            <Link href={`/recipes/${recipe._id}?scale=true`}>
                                <TouchEnhancedButton className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    ⚖️ Scale
                                </TouchEnhancedButton>
                            </Link>
                        </div>

                        {showActions && (
                            <div className="flex gap-2">
                                {onEdit && (
                                    <TouchEnhancedButton
                                        onClick={() => onEdit(recipe)}
                                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                                    >
                                        Edit
                                    </TouchEnhancedButton>
                                )}
                                {onDelete && (
                                    <TouchEnhancedButton
                                        onClick={() => onDelete(recipe._id)}
                                        className="text-red-600 hover:text-red-900 text-sm"
                                    >
                                        Delete
                                    </TouchEnhancedButton>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cooking Integration Modal */}
            {showCooking && (
                <RecipeCookingIntegration
                    recipe={recipe}
                    onCookingComplete={handleCookingComplete}
                    onClose={() => setShowCooking(false)}
                    servingsMultiplier={1}
                />
            )}

            {/* Overlay to close share menu */}
            {showShareMenu && (
                <div
                    className="fixed inset-0 z-5"
                    onClick={() => setShowShareMenu(false)}
                />
            )}
        </>
    );
}