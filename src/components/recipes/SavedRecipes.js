'use client';
// file: /src/components/recipes/SavedRecipes.js v2 - FIXED with enhanced error handling and null checks

import React, { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { StarRating } from '@/components/reviews/RecipeRating';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { getApiUrl } from '@/lib/api-config';
import SaveRecipeButton from './SaveRecipeButton';

const SavedRecipes = ({ onCountChange }) => {
    const { data: session } = useSafeSession();
    const [savedRecipes, setSavedRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    const CATEGORY_OPTIONS = [
        { value: 'seasonings', label: 'Seasonings' },
        { value: 'sauces', label: 'Sauces' },
        { value: 'salad-dressings', label: 'Salad Dressings' },
        { value: 'marinades', label: 'Marinades' },
        { value: 'ingredients', label: 'Basic Ingredients' },
        { value: 'entrees', label: 'Entrees' },
        { value: 'side-dishes', label: 'Side Dishes' },
        { value: 'soups', label: 'Soups' },
        { value: 'sandwiches', label: 'Sandwiches' },
        { value: 'appetizers', label: 'Appetizers' },
        { value: 'desserts', label: 'Desserts' },
        { value: 'breads', label: 'Breads' },
        { value: 'pizza-dough', label: 'Pizza Dough' },
        { value: 'specialty-items', label: 'Specialty Items' },
        { value: 'beverages', label: 'Beverages' },
        { value: 'breakfast', label: 'Breakfast' }
    ];

    useEffect(() => {
        if (session?.user?.id) {
            fetchSavedRecipes();
        }
    }, [session?.user?.id]);

    const fetchSavedRecipes = async () => {
        try {
            setLoading(true);
            setError('');

            console.log('🔍 SavedRecipes - Fetching saved recipes...');

            const response = await fetch(getApiUrl('/api/saved-recipes'), {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                },
            });

            if (!response.ok) {
                console.error('❌ SavedRecipes - API request failed:', response.status, response.statusText);

                if (response.status >= 500) {
                    throw new Error('Server temporarily unavailable. Please try again later.');
                } else if (response.status === 401) {
                    throw new Error('Please sign in again to view your saved recipes.');
                } else if (response.status === 403) {
                    throw new Error('You don\'t have permission to view saved recipes.');
                } else {
                    throw new Error(`Failed to load saved recipes (${response.status})`);
                }
            }

            const data = await response.json();

            if (data.success) {
                // FIXED: Ensure savedRecipes is always an array and filter out invalid entries
                const validSavedRecipes = Array.isArray(data.savedRecipes)
                    ? data.savedRecipes.filter(saved => saved && saved.recipeId)
                    : [];

                setSavedRecipes(validSavedRecipes);

                // Update parent component count
                if (onCountChange) {
                    onCountChange(validSavedRecipes.length);
                }

                console.log('✅ SavedRecipes - Successfully loaded:', validSavedRecipes.length, 'saved recipes');

                if (data.warning) {
                    console.warn('⚠️ SavedRecipes - API warning:', data.warning);
                }
            } else {
                console.error('❌ SavedRecipes - API returned error:', data.error);
                setError(data.error || 'Failed to fetch saved recipes');
                setSavedRecipes([]); // Ensure empty array on error
                if (onCountChange) onCountChange(0);
            }
        } catch (error) {
            console.error('❌ SavedRecipes - Error fetching saved recipes:', error);
            setError(error.message || 'Failed to fetch saved recipes');
            setSavedRecipes([]); // Ensure empty array on error
            if (onCountChange) onCountChange(0);
        } finally {
            setLoading(false);
        }
    };

    const handleUnsaveRecipe = async (recipeId) => {
        try {
            console.log('🗑️ SavedRecipes - Unsaving recipe:', recipeId);

            const response = await fetch(getApiUrl(`/api/saved-recipes?recipeId=${recipeId}`), {
                method: 'DELETE'
            });

            if (!response.ok) {
                console.error('❌ SavedRecipes - Failed to unsave recipe:', response.status);
                throw new Error(`Failed to unsave recipe (${response.status})`);
            }

            const data = await response.json();

            if (data.success) {
                // FIXED: Use safe filtering with null checks
                const updatedSavedRecipes = Array.isArray(savedRecipes)
                    ? savedRecipes.filter(saved =>
                        saved && saved.recipeId && saved.recipeId._id !== recipeId
                    )
                    : [];

                setSavedRecipes(updatedSavedRecipes);

                // Update parent component count
                if (onCountChange) {
                    onCountChange(updatedSavedRecipes.length);
                }

                console.log('✅ SavedRecipes - Recipe successfully unsaved');
            } else {
                console.error('❌ SavedRecipes - API returned error:', data.error);
                setError(data.error || 'Failed to unsave recipe');
            }
        } catch (error) {
            console.error('❌ SavedRecipes - Error unsaving recipe:', error);
            setError(error.message || 'Failed to unsave recipe');
        }
    };

    const formatCookTime = (minutes) => {
        if (!minutes) return null;
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

    const getFilteredAndSortedRecipes = () => {
        // FIXED: Ensure savedRecipes is always an array before filtering
        const recipesArray = Array.isArray(savedRecipes) ? savedRecipes : [];

        let filtered = recipesArray.filter(saved => {
            // FIXED: Add comprehensive null checks
            if (!saved || !saved.recipeId) return false;

            const recipe = saved.recipeId;
            if (!recipe) return false;

            const matchesSearch = !searchTerm ||
                (recipe.title && recipe.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (recipe.description && recipe.description.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = !selectedCategory ||
                recipe.category === selectedCategory;

            const matchesDifficulty = !selectedDifficulty ||
                recipe.difficulty === selectedDifficulty;

            return matchesSearch && matchesCategory && matchesDifficulty;
        });

        // Sort recipes with null checks
        return filtered.sort((a, b) => {
            // FIXED: Add null checks for sorting
            if (!a || !b || !a.recipeId || !b.recipeId) return 0;

            const recipeA = a.recipeId;
            const recipeB = b.recipeId;

            switch (sortBy) {
                case 'newest':
                    const aDate = a.savedAt ? new Date(a.savedAt) : new Date(0);
                    const bDate = b.savedAt ? new Date(b.savedAt) : new Date(0);
                    return bDate - aDate;
                case 'oldest':
                    const aDateOld = a.savedAt ? new Date(a.savedAt) : new Date(0);
                    const bDateOld = b.savedAt ? new Date(b.savedAt) : new Date(0);
                    return aDateOld - bDateOld;
                case 'rating':
                    const aRating = recipeA.ratingStats?.averageRating || 0;
                    const bRating = recipeB.ratingStats?.averageRating || 0;
                    if (bRating !== aRating) return bRating - aRating;
                    return (recipeB.ratingStats?.totalRatings || 0) - (recipeA.ratingStats?.totalRatings || 0);
                case 'title':
                    const aTitle = recipeA.title || '';
                    const bTitle = recipeB.title || '';
                    return aTitle.localeCompare(bTitle);
                default:
                    return 0;
            }
        });
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-32 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const filteredRecipes = getFilteredAndSortedRecipes();

    return (
        <FeatureGate
            feature={FEATURE_GATES.SAVE_RECIPE}
            fallback={
                <div className="text-center py-8">
                    <div className="text-gray-500 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Save Individual Recipes
                    </h3>
                    <p className="text-gray-500 mb-4">
                        Quickly save your favorite recipes for easy access without organizing into collections
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="text-sm text-blue-800">
                            <strong>📚 Saved Recipes Feature:</strong>
                            <ul className="mt-2 space-y-1 text-left">
                                <li>• <strong>Free:</strong> Save up to 10 individual recipes</li>
                                <li>• <strong>Gold:</strong> Save up to 200 individual recipes</li>
                                <li>• <strong>Platinum:</strong> Unlimited saved recipes</li>
                                <li>• Quick access to your favorite recipes</li>
                                <li>• No need to organize into collections</li>
                            </ul>
                        </div>
                    </div>
                    <TouchEnhancedButton
                        onClick={() => window.location.href = '/pricing?source=saved-recipes'}
                        className="bg-gradient-to-r from-blue-400 to-purple-500 text-white px-6 py-3 rounded-md font-medium hover:from-blue-500 hover:to-purple-600"
                    >
                        🚀 Upgrade to Save Recipes
                    </TouchEnhancedButton>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                        📚 Saved Recipes ({Array.isArray(savedRecipes) ? savedRecipes.length : 0})
                    </h2>
                    {error && (
                        <TouchEnhancedButton
                            onClick={fetchSavedRecipes}
                            className="text-sm bg-indigo-100 text-indigo-600 px-3 py-1 rounded-md hover:bg-indigo-200"
                        >
                            Retry
                        </TouchEnhancedButton>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="text-sm text-red-800">
                            <strong>Error:</strong> {error}
                        </div>
                    </div>
                )}

                {/* Filters */}
                {Array.isArray(savedRecipes) && savedRecipes.length > 0 && (
                    <div className="bg-white rounded-lg border p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Search */}
                            <div>
                                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                                    Search
                                </label>
                                <input
                                    type="text"
                                    id="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search saved recipes..."
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Category Filter */}
                            <div>
                                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                                    Category
                                </label>
                                <select
                                    id="category-filter"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">All Categories</option>
                                    {CATEGORY_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Difficulty Filter */}
                            <div>
                                <label htmlFor="difficulty-filter" className="block text-sm font-medium text-gray-700 mb-1">
                                    Difficulty
                                </label>
                                <select
                                    id="difficulty-filter"
                                    value={selectedDifficulty}
                                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">All Levels</option>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>

                            {/* Sort */}
                            <div>
                                <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
                                    Sort By
                                </label>
                                <select
                                    id="sort"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="newest">Recently Saved</option>
                                    <option value="oldest">Oldest Saved</option>
                                    <option value="rating">Highest Rated</option>
                                    <option value="title">Title (A-Z)</option>
                                </select>
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {(searchTerm || selectedCategory || selectedDifficulty) && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <TouchEnhancedButton
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSelectedCategory('');
                                        setSelectedDifficulty('');
                                    }}
                                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                                >
                                    Clear All Filters
                                </TouchEnhancedButton>
                            </div>
                        )}
                    </div>
                )}

                {/* Results Count */}
                {Array.isArray(savedRecipes) && savedRecipes.length > 0 && (
                    <div className="flex justify-between items-center">
                        <p className="text-gray-600">
                            Showing {Array.isArray(filteredRecipes) ? filteredRecipes.length : 0} of {savedRecipes.length} saved recipe{filteredRecipes.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}

                {/* Saved Recipes Grid */}
                {Array.isArray(filteredRecipes) && filteredRecipes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRecipes.map((saved) => {
                            // FIXED: Add comprehensive null checks
                            if (!saved || !saved.recipeId) return null;

                            const recipe = saved.recipeId;
                            if (!recipe) return null;

                            return (
                                <div key={saved._id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                                    <div className="p-6">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-3">
                                            <a
                                                href={`/recipes/${recipe._id}`}
                                                className="text-lg font-semibold text-gray-900 hover:text-indigo-600 line-clamp-2"
                                            >
                                                {recipe.title || 'Untitled Recipe'}
                                            </a>
                                            <TouchEnhancedButton
                                                onClick={() => handleUnsaveRecipe(recipe._id)}
                                                className="text-red-500 hover:text-red-700 ml-2"
                                                title="Remove from saved recipes"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                </svg>
                                            </TouchEnhancedButton>
                                        </div>

                                        {/* Author Info */}
                                        {recipe.createdBy && (
                                            <div className="mb-3">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    <span>by {recipe.createdBy.name || recipe.createdBy.email || 'Unknown'}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Rating */}
                                        <div className="mb-3">
                                            <StarRating
                                                rating={recipe.ratingStats?.averageRating || 0}
                                                size="small"
                                                showNumber={false}
                                            />
                                            {recipe.ratingStats?.totalRatings > 0 && (
                                                <span className="text-xs text-gray-500 ml-2">
                                                    {recipe.ratingStats.totalRatings} review{recipe.ratingStats.totalRatings !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>

                                        {/* Description */}
                                        {recipe.description && (
                                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                                {recipe.description}
                                            </p>
                                        )}

                                        {/* Recipe Info */}
                                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                                            <div className="flex items-center space-x-4">
                                                {recipe.servings && (
                                                    <span className="flex items-center space-x-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        <span>{recipe.servings}</span>
                                                    </span>
                                                )}
                                                {formatCookTime(recipe.cookTime) && (
                                                    <span className="flex items-center space-x-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>{formatCookTime(recipe.cookTime)}</span>
                                                    </span>
                                                )}
                                            </div>
                                            {recipe.difficulty && (
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                                                    {recipe.difficulty}
                                                </span>
                                            )}
                                        </div>

                                        {/* Saved Date */}
                                        <div className="text-xs text-gray-400">
                                            Saved {saved.savedAt ? new Date(saved.savedAt).toLocaleDateString() : 'recently'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : Array.isArray(savedRecipes) && savedRecipes.length > 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-500 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No recipes found
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Try adjusting your filters to find more saved recipes
                        </p>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-gray-500 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No Saved Recipes Yet
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Start saving your favorite recipes for quick access
                        </p>
                        <TouchEnhancedButton
                            onClick={() => window.location.href = '/recipes?tab=public-recipes'}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
                        >
                            Browse Public Recipes
                        </TouchEnhancedButton>
                    </div>
                )}
            </div>
        </FeatureGate>
    );
};

export default SavedRecipes;