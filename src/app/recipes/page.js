// file: /src/app/recipes/page.js v4 - Enhanced with tabbed interface for My Recipes vs Public Recipes

'use client';

import {useSession} from 'next-auth/react';
import {useEffect, useState, Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {StarRating} from '@/components/reviews/RecipeRating';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

function RecipesContent() {
    const {data: session, status} = useSession();
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [allTags, setAllTags] = useState([]);
    const searchParams = useSearchParams();
    const [selectedCategory, setSelectedCategory] = useState('');
    const [allCategories, setAllCategories] = useState([]);

    // NEW: Tab state for My Recipes vs Public Recipes
    const [activeTab, setActiveTab] = useState('my-recipes');

    const CATEGORY_OPTIONS = [
        {value: 'seasonings', label: 'Seasonings'},
        {value: 'sauces', label: 'Sauces'},
        {value: 'salad-dressings', label: 'Salad Dressings'},
        {value: 'marinades', label: 'Marinades'},
        {value: 'ingredients', label: 'Basic Ingredients'},
        {value: 'entrees', label: 'Entrees'},
        {value: 'side-dishes', label: 'Side Dishes'},
        {value: 'soups', label: 'Soups'},
        {value: 'sandwiches', label: 'Sandwiches'},
        {value: 'appetizers', label: 'Appetizers'},
        {value: 'desserts', label: 'Desserts'},
        {value: 'breads', label: 'Breads'},
        {value: 'pizza-dough', label: 'Pizza Dough'},
        {value: 'specialty-items', label: 'Specialty Items'},
        {value: 'beverages', label: 'Beverages'},
        {value: 'breakfast', label: 'Breakfast'}
    ];

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session) {
            fetchRecipes();
        }
    }, [session]);

    const fetchRecipes = async () => {
        try {
            const response = await fetch('/api/recipes');
            const data = await response.json();

            if (data.success) {
                setRecipes(data.recipes);

                // Extract all unique tags and categories
                const tags = new Set();
                const categories = new Set();
                data.recipes.forEach(recipe => {
                    if (recipe.tags) {
                        recipe.tags.forEach(tag => tags.add(tag));
                    }
                    if (recipe.category) {
                        categories.add(recipe.category);
                    }
                });
                setAllTags(Array.from(tags).sort());
                setAllCategories(Array.from(categories).sort());
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (recipeId) => {
        if (!confirm('Are you sure you want to delete this recipe?')) {
            return;
        }

        try {
            const response = await fetch(`/api/recipes/${recipeId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setRecipes(prev => prev.filter(recipe => recipe._id !== recipeId));
            } else {
                alert('Failed to delete recipe');
            }
        } catch (error) {
            console.error('Error deleting recipe:', error);
            alert('Error deleting recipe');
        }
    };

    // NEW: Filter recipes by tab and other criteria
    const getFilteredAndSortedRecipes = () => {
        let filtered = recipes.filter(recipe => {
            // NEW: Filter by tab selection
            const matchesTab = activeTab === 'my-recipes'
                ? recipe.createdBy?._id === session?.user?.id || recipe.createdBy === session?.user?.id
                : recipe.isPublic === true;

            const matchesSearch = !searchTerm ||
                recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                recipe.description?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesTag = !selectedTag ||
                (recipe.tags && recipe.tags.includes(selectedTag));

            const matchesDifficulty = !selectedDifficulty ||
                recipe.difficulty === selectedDifficulty;

            const matchesCategory = !selectedCategory ||
                recipe.category === selectedCategory;

            return matchesTab && matchesSearch && matchesTag && matchesDifficulty && matchesCategory;
        });

        // Sort recipes
        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'rating':
                    const aRating = a.ratingStats?.averageRating || 0;
                    const bRating = b.ratingStats?.averageRating || 0;
                    if (bRating !== aRating) return bRating - aRating;
                    return (b.ratingStats?.totalRatings || 0) - (a.ratingStats?.totalRatings || 0);
                case 'popular':
                    const aViews = a.metrics?.viewCount || 0;
                    const bViews = b.metrics?.viewCount || 0;
                    if (bViews !== aViews) return bViews - aViews;
                    return (b.ratingStats?.averageRating || 0) - (a.ratingStats?.averageRating || 0);
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });
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

    // NEW: Get tab-specific counts
    const getTabCounts = () => {
        const myRecipes = recipes.filter(recipe =>
            recipe.createdBy?._id === session?.user?.id || recipe.createdBy === session?.user?.id
        );
        const publicRecipes = recipes.filter(recipe => recipe.isPublic === true);

        return {
            myRecipes: myRecipes.length,
            publicRecipes: publicRecipes.length
        };
    };

    // NEW: Check if user can edit recipe
    const canEditRecipe = (recipe) => {
        return recipe.createdBy?._id === session?.user?.id || recipe.createdBy === session?.user?.id;
    };

    if (status === 'loading' || loading) {
        return (
            <MobileOptimizedLayout>
                <div className="max-w-6xl mx-auto px-4 py-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-64 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    const filteredRecipes = getFilteredAndSortedRecipes();
    const tabCounts = getTabCounts();

    return (
        <MobileOptimizedLayout>
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
                        <p className="text-gray-600 mt-1">
                            {activeTab === 'my-recipes'
                                ? 'Manage your personal recipe collection'
                                : 'Browse recipes shared by the community'
                            }
                        </p>
                    </div>
                    {/* Only show Add Recipe button on My Recipes tab */}
                    {activeTab === 'my-recipes' && (
                        <Link
                            href="/recipes/add"
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors whitespace-nowrap"
                        >
                            Add New Recipe
                        </Link>
                    )}
                </div>

                {/* NEW: Mobile-Optimized Tab Navigation */}
                <div className="mb-6">
                    <div className="bg-gray-100 p-1 rounded-lg flex">
                        <TouchEnhancedButton
                            onClick={() => setActiveTab('my-recipes')}
                            className={`flex-1 py-3 px-4 rounded-md text-center font-medium transition-all touch-friendly ${
                                activeTab === 'my-recipes'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>📝 My Recipes</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    activeTab === 'my-recipes'
                                        ? 'bg-indigo-100 text-indigo-600'
                                        : 'bg-gray-200 text-gray-600'
                                }`}>
                                    {tabCounts.myRecipes}
                                </span>
                            </div>
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => setActiveTab('public-recipes')}
                            className={`flex-1 py-3 px-4 rounded-md text-center font-medium transition-all touch-friendly ${
                                activeTab === 'public-recipes'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>🌍 Public Recipes</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    activeTab === 'public-recipes'
                                        ? 'bg-indigo-100 text-indigo-600'
                                        : 'bg-gray-200 text-gray-600'
                                }`}>
                                    {tabCounts.publicRecipes}
                                </span>
                            </div>
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Tab Content Info */}
                <div className="mb-6">
                    {activeTab === 'my-recipes' ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <div className="text-blue-600 mr-3 mt-0.5">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-blue-800">Your Personal Recipe Collection</h3>
                                    <p className="text-sm text-blue-700 mt-1">
                                        These are recipes you've created or added to your personal collection. You can edit, delete, and manage these recipes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <div className="text-green-600 mr-3 mt-0.5">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-green-800">Community Recipe Collection</h3>
                                    <p className="text-sm text-green-700 mt-1">
                                        Discover recipes shared by the community, including Doc Bear's Comfort Food collection. Save favorites to your personal collection!
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-lg border p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        {/* Search - spans 2 columns */}
                        <div className="lg:col-span-2">
                            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                                Search Recipes
                            </label>
                            <input
                                type="text"
                                id="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by title or description..."
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

                        {/* Tag Filter */}
                        <div>
                            <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700 mb-1">
                                Tag
                            </label>
                            <select
                                id="tag-filter"
                                value={selectedTag}
                                onChange={(e) => setSelectedTag(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Tags</option>
                                {allTags.map(tag => (
                                    <option key={tag} value={tag}>{tag}</option>
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
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="rating">Highest Rated</option>
                                <option value="popular">Most Popular</option>
                                <option value="title">Title (A-Z)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Results Count */}
                <div className="flex justify-between items-center mb-6">
                    <p className="text-gray-600">
                        Showing {filteredRecipes.length} of {getTabCounts()[activeTab === 'my-recipes' ? 'myRecipes' : 'publicRecipes']} recipe{filteredRecipes.length !== 1 ? 's' : ''}
                        <span className="text-indigo-600 font-medium ml-1">
                            ({activeTab === 'my-recipes' ? 'My Recipes' : 'Public Recipes'})
                        </span>
                    </p>
                    {(searchTerm || selectedTag || selectedDifficulty || selectedCategory) && (
                        <TouchEnhancedButton
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedTag('');
                                setSelectedDifficulty('');
                                setSelectedCategory('');
                            }}
                            className="text-indigo-600 hover:text-indigo-800 text-sm"
                        >
                            Clear Filters
                        </TouchEnhancedButton>
                    )}
                </div>

                {/* Recipe Grid */}
                {filteredRecipes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRecipes.map((recipe) => (
                            <div key={recipe._id}
                                 className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                                <div className="p-6">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <Link
                                            href={`/recipes/${recipe._id}`}
                                            className="text-lg font-semibold text-gray-900 hover:text-indigo-600 line-clamp-2"
                                        >
                                            {recipe.title}
                                        </Link>
                                        {/* NEW: Only show edit/delete buttons for user's own recipes */}
                                        {canEditRecipe(recipe) && (
                                            <div className="flex space-x-1 ml-2">
                                                <TouchEnhancedButton
                                                    onClick={() => window.location.href = `/recipes/${recipe._id}/edit`}
                                                    className="flex items-center justify-center w-8 h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors touch-friendly"
                                                    title="Edit recipe"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                    </svg>
                                                </TouchEnhancedButton>
                                                <TouchEnhancedButton
                                                    onClick={() => handleDelete(recipe._id)}
                                                    className="flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors touch-friendly"
                                                    title="Delete recipe"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                    </svg>
                                                </TouchEnhancedButton>
                                            </div>
                                        )}
                                    </div>

                                    {/* NEW: Recipe Author Info (for public recipes) */}
                                    {activeTab === 'public-recipes' && recipe.createdBy && (
                                        <div className="mb-3">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span>
                                                    by {recipe.createdBy.name || recipe.createdBy.email}
                                                    {recipe.importedFrom && (
                                                        <span className="text-xs text-gray-500 ml-1">
                                                            (from {recipe.importedFrom})
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rating and Views */}
                                    <div className="flex items-center justify-between mb-3">
                                        <StarRating
                                            rating={recipe.ratingStats?.averageRating || 0}
                                            size="small"
                                            showNumber={false}
                                        />
                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                            {recipe.ratingStats?.totalRatings > 0 && (
                                                <span>{recipe.ratingStats.totalRatings} review{recipe.ratingStats.totalRatings !== 1 ? 's' : ''}</span>
                                            )}
                                            {recipe.metrics?.viewCount > 0 && (
                                                <span>{recipe.metrics.viewCount} view{recipe.metrics.viewCount !== 1 ? 's' : ''}</span>
                                            )}
                                        </div>
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
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                         viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth={2}
                                                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                                    </svg>
                                                    <span>{recipe.servings}</span>
                                                </span>
                                            )}
                                            {formatCookTime(recipe.cookTime) && (
                                                <span className="flex items-center space-x-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                         viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth={2}
                                                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                    </svg>
                                                    <span>{formatCookTime(recipe.cookTime)}</span>
                                                </span>
                                            )}
                                        </div>
                                        {recipe.difficulty && (
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                                                {recipe.difficulty}
                                            </span>
                                        )}
                                    </div>

                                    {/* Tags */}
                                    {recipe.tags && recipe.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {recipe.tags.slice(0, 3).map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {recipe.tags.length > 3 && (
                                                <span className="text-xs text-gray-500">
                                                    +{recipe.tags.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {/* Category */}
                                    {recipe.category && (
                                        <div className="mt-2">
                                            <span
                                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                                                {CATEGORY_OPTIONS.find(opt => opt.value === recipe.category)?.label || recipe.category}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-gray-500 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {activeTab === 'my-recipes' ? (
                                searchTerm || selectedTag || selectedDifficulty || selectedCategory ? 'No recipes found' : 'No recipes yet'
                            ) : (
                                searchTerm || selectedTag || selectedDifficulty || selectedCategory ? 'No public recipes found' : 'No public recipes available'
                            )}
                        </h3>
                        <p className="text-gray-500 mb-4">
                            {activeTab === 'my-recipes' ? (
                                searchTerm || selectedTag || selectedDifficulty || selectedCategory
                                    ? 'Try adjusting your filters to find more recipes.'
                                    : 'Start building your recipe collection by adding your first recipe!'
                            ) : (
                                searchTerm || selectedTag || selectedDifficulty || selectedCategory
                                    ? 'Try adjusting your filters to find more public recipes.'
                                    : 'Public recipes will appear here when they become available.'
                            )}
                        </p>
                        {activeTab === 'my-recipes' && !searchTerm && !selectedTag && !selectedDifficulty && !selectedCategory && (
                            <div className="space-y-3">
                                <Link
                                    href="/recipes/add"
                                    className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                                >
                                    Add Your First Recipe
                                </Link>
                                <div className="text-sm text-gray-500">
                                    <p>or</p>
                                    <TouchEnhancedButton
                                        onClick={() => setActiveTab('public-recipes')}
                                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        Browse public recipes to save to your collection
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        )}
                        {activeTab === 'public-recipes' && !searchTerm && !selectedTag && !selectedDifficulty && !selectedCategory && (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-500">
                                    Check back later for community recipes, or
                                </p>
                                <TouchEnhancedButton
                                    onClick={() => setActiveTab('my-recipes')}
                                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    Start by adding your own recipes
                                </TouchEnhancedButton>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <br/>
            <Footer />
        </MobileOptimizedLayout>
    );
}

export default function RecipesPage() {
    return (
        <Suspense fallback={
            <MobileOptimizedLayout>
                <div className="max-w-6xl mx-auto px-4 py-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-64 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                    <Footer />
                </div>
            </MobileOptimizedLayout>
        }>
            <RecipesContent/>
        </Suspense>
    );
}