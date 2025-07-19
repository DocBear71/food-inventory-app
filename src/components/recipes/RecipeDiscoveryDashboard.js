'use client';

// file: /src/components/recipes/RecipeDiscoveryDashboard.js v1 - Recipe discovery and collections

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import Link from 'next/link';
import { StarRating } from '@/components/reviews/RecipeRating';

export default function RecipeDiscoveryDashboard({
                                                     recipes = [],
                                                     onRecipeSelect = null,
                                                     showCollections = true
                                                 }) {
    const [activeCollection, setActiveCollection] = useState('quickMeals');
    const [collections, setCollections] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        generateCollections();
    }, [recipes]);

    const generateCollections = () => {
        setLoading(true);

        if (!Array.isArray(recipes) || recipes.length === 0) {
            setCollections({});
            setLoading(false);
            return;
        }

        const collections = {
            quickMeals: getQuickMeals(recipes),
            highlyRated: getHighlyRated(recipes),
            recentlyAdded: getRecentlyAdded(recipes),
            comfortFood: getComfortFood(recipes),
            healthy: getHealthyRecipes(recipes),
            beginner: getBeginnerFriendly(recipes),
            trending: getTrending(recipes)
        };

        setCollections(collections);
        setLoading(false);
    };

    // Collection generation methods (simplified versions of the search engine methods)
    const getQuickMeals = (recipes) => {
        return recipes
            .filter(recipe => {
                const totalTime = (recipe.cookTime || 0) + (recipe.prepTime || 0);
                return totalTime <= 30;
            })
            .sort((a, b) => {
                const aTotalTime = (a.cookTime || 0) + (a.prepTime || 0);
                const bTotalTime = (b.cookTime || 0) + (b.prepTime || 0);
                return aTotalTime - bTotalTime;
            })
            .slice(0, 8);
    };

    const getHighlyRated = (recipes) => {
        return recipes
            .filter(recipe =>
                (recipe.ratingStats?.averageRating || 0) >= 4.0 &&
                (recipe.ratingStats?.totalRatings || 0) >= 2
            )
            .sort((a, b) => (b.ratingStats?.averageRating || 0) - (a.ratingStats?.averageRating || 0))
            .slice(0, 8);
    };

    const getRecentlyAdded = (recipes) => {
        return recipes
            .filter(recipe => recipe.createdAt)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 8);
    };

    const getComfortFood = (recipes) => {
        const comfortKeywords = ['comfort', 'hearty', 'warm', 'cozy', 'classic', 'traditional', 'homestyle', 'casserole', 'soup', 'stew'];
        return recipes
            .filter(recipe => {
                const text = `${recipe.title} ${recipe.description} ${(recipe.tags || []).join(' ')}`.toLowerCase();
                return comfortKeywords.some(keyword => text.includes(keyword));
            })
            .slice(0, 8);
    };

    const getHealthyRecipes = (recipes) => {
        return recipes
            .filter(recipe => {
                // Look for healthy keywords or nutrition data
                const text = `${recipe.title} ${recipe.description} ${(recipe.tags || []).join(' ')}`.toLowerCase();
                const healthyKeywords = ['healthy', 'light', 'lean', 'fresh', 'salad', 'grilled'];

                if (recipe.nutrition) {
                    const calories = recipe.nutrition.calories?.value || 0;
                    const protein = recipe.nutrition.protein?.value || 0;
                    return calories < 500 && protein > 15;
                }

                return healthyKeywords.some(keyword => text.includes(keyword));
            })
            .slice(0, 8);
    };

    const getBeginnerFriendly = (recipes) => {
        return recipes
            .filter(recipe => recipe.difficulty === 'easy')
            .sort((a, b) => {
                const aTotalTime = (a.cookTime || 0) + (a.prepTime || 0);
                const bTotalTime = (b.cookTime || 0) + (b.prepTime || 0);
                return aTotalTime - bTotalTime;
            })
            .slice(0, 8);
    };

    const getTrending = (recipes) => {
        return recipes
            .filter(recipe => (recipe.metrics?.viewCount || 0) > 0)
            .sort((a, b) => {
                const aScore = (a.metrics?.viewCount || 0) * 0.7 + (a.ratingStats?.averageRating || 0) * 3;
                const bScore = (b.metrics?.viewCount || 0) * 0.7 + (b.ratingStats?.averageRating || 0) * 3;
                return bScore - aScore;
            })
            .slice(0, 8);
    };

    const collectionConfig = {
        quickMeals: {
            name: '⚡ Quick Meals',
            description: '30 minutes or less',
            color: 'bg-green-100 text-green-800 border-green-200'
        },
        highlyRated: {
            name: '⭐ Highly Rated',
            description: '4+ stars with reviews',
            color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        },
        recentlyAdded: {
            name: '🆕 Recently Added',
            description: 'Latest recipe additions',
            color: 'bg-blue-100 text-blue-800 border-blue-200'
        },
        comfortFood: {
            name: '🏠 Comfort Food',
            description: 'Hearty and satisfying',
            color: 'bg-orange-100 text-orange-800 border-orange-200'
        },
        healthy: {
            name: '🥗 Healthy Options',
            description: 'Light and nutritious',
            color: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        },
        beginner: {
            name: '👨‍🍳 Beginner Friendly',
            description: 'Easy recipes to start with',
            color: 'bg-purple-100 text-purple-800 border-purple-200'
        },
        trending: {
            name: '🔥 Trending',
            description: 'Popular recipes right now',
            color: 'bg-red-100 text-red-800 border-red-200'
        }
    };

    const formatCookTime = (minutes) => {
        if (!minutes) return null;
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    if (!showCollections) return null;

    return (
        <div className="space-y-6">
            {/* Collection Tabs */}
            <div className="flex overflow-x-auto gap-2 pb-2">
                {Object.entries(collectionConfig).map(([key, config]) => {
                    const count = collections[key]?.length || 0;
                    if (count === 0) return null;

                    return (
                        <TouchEnhancedButton
                            key={key}
                            onClick={() => setActiveCollection(key)}
                            className={`flex-shrink-0 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                activeCollection === key
                                    ? config.color
                                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                            }`}
                        >
                            <div className="flex flex-col items-center">
                                <span>{config.name}</span>
                                <span className="text-xs opacity-75">
                                    {count} recipe{count !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </TouchEnhancedButton>
                    );
                })}
            </div>

            {/* Collection Content */}
            {loading ? (
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-sm text-gray-600">Discovering recipes...</p>
                </div>
            ) : (
                <div>
                    {/* Collection Header */}
                    {collections[activeCollection] && (
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {collectionConfig[activeCollection].name}
                            </h3>
                            <p className="text-sm text-gray-600">
                                {collectionConfig[activeCollection].description} • {collections[activeCollection].length} recipes
                            </p>
                        </div>
                    )}

                    {/* Recipe Grid */}
                    {collections[activeCollection]?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {collections[activeCollection].map((recipe) => (
                                <div key={recipe._id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                                    <div className="p-4">
                                        {/* Recipe Title */}
                                        <div className="mb-3">
                                            <Link
                                                href={`/recipes/${recipe._id}`}
                                                className="text-sm font-semibold text-gray-900 hover:text-indigo-600 line-clamp-2 block"
                                            >
                                                {recipe.title || 'Untitled Recipe'}
                                            </Link>
                                        </div>

                                        {/* Rating */}
                                        <div className="flex items-center justify-between mb-2">
                                            <StarRating
                                                rating={recipe.ratingStats?.averageRating || 0}
                                                size="small"
                                                showNumber={false}
                                            />
                                            {recipe.ratingStats?.totalRatings > 0 && (
                                                <span className="text-xs text-gray-500">
                                                    {recipe.ratingStats.totalRatings} review{recipe.ratingStats.totalRatings !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>

                                        {/* Recipe Info */}
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                            <div className="flex items-center space-x-3">
                                                {recipe.servings && (
                                                    <span className="flex items-center space-x-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                                        </svg>
                                                        <span>{recipe.servings}</span>
                                                    </span>
                                                )}
                                                {formatCookTime((recipe.cookTime || 0) + (recipe.prepTime || 0)) && (
                                                    <span className="flex items-center space-x-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                        </svg>
                                                        <span>{formatCookTime((recipe.cookTime || 0) + (recipe.prepTime || 0))}</span>
                                                    </span>
                                                )}
                                            </div>
                                            {recipe.difficulty && (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    recipe.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                                        recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                }`}>
                                                    {recipe.difficulty}
                                                </span>
                                            )}
                                        </div>

                                        {/* Tags */}
                                        {Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {recipe.tags.slice(0, 2).map((tag, index) => (
                                                    <span
                                                        key={index}
                                                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                                {recipe.tags.length > 2 && (
                                                    <span className="text-xs text-gray-500">
                                                        +{recipe.tags.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Select Button */}
                                        {onRecipeSelect && (
                                            <div className="mt-3">
                                                <TouchEnhancedButton
                                                    onClick={() => onRecipeSelect(recipe)}
                                                    className="w-full bg-indigo-600 text-white py-2 px-3 rounded-md text-xs font-medium hover:bg-indigo-700 transition-colors"
                                                >
                                                    Select Recipe
                                                </TouchEnhancedButton>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="text-gray-400 mb-2">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No recipes found
                            </h3>
                            <p className="text-gray-500">
                                No recipes match the criteria for {collectionConfig[activeCollection]?.name.replace(/[^a-zA-Z\s]/g, '').trim()}.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
