// file: /src/app/recipes/page.js v3 - Enhanced with Ratings

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
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, rating, popular, title
    const [allTags, setAllTags] = useState([]);
    const searchParams = useSearchParams();
    const [selectedCategory, setSelectedCategory] = useState('');
    const [allCategories, setAllCategories] = useState([]);


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

                // Extract all unique tags
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

    const getFilteredAndSortedRecipes = () => {
        let filtered = recipes.filter(recipe => {
            const matchesSearch = !searchTerm ||
                recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                recipe.description?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesTag = !selectedTag ||
                (recipe.tags && recipe.tags.includes(selectedTag));

            const matchesDifficulty = !selectedDifficulty ||
                recipe.difficulty === selectedDifficulty;

            const matchesCategory = !selectedCategory ||
                recipe.category === selectedCategory;

            return matchesSearch && matchesTag && matchesDifficulty && matchesCategory;
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
                    // Secondary sort by number of ratings
                    return (b.ratingStats?.totalRatings || 0) - (a.ratingStats?.totalRatings || 0);
                case 'popular':
                    const aViews = a.metrics?.viewCount || 0;
                    const bViews = b.metrics?.viewCount || 0;
                    if (bViews !== aViews) return bViews - aViews;
                    // Secondary sort by ratings
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

    return (
        <MobileOptimizedLayout>
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Recipes</h1>
                    <Link
                        href="/recipes/add"
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        Add New Recipe
                    </Link>
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
                        Showing {filteredRecipes.length} of {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
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
                                        <div className="flex space-x-1 ml-2">
                                            <Link
                                                href={`/recipes/${recipe._id}/edit`}
                                                className="text-gray-400 hover:text-indigo-600"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                     viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                </svg>
                                            </Link>
                                            <TouchEnhancedButton
                                                onClick={() => handleDelete(recipe._id)}
                                                className="text-gray-400 hover:text-red-600"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                     viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                </svg>
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>

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
                            {searchTerm || selectedTag || selectedDifficulty || selectedCategory ? 'No recipes found' : 'No recipes yet'}

                        </h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm || selectedTag || selectedDifficulty || selectedCategory
                                ? 'Try adjusting your filters to find more recipes.'
                                : 'Start building your recipe collection by adding your first recipe!'
                            }
                        </p>
                        {!searchTerm && !selectedTag && !selectedDifficulty && !selectedCategory && (
                            <Link
                                href="/recipes/add"
                                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                            >
                                Add Your First Recipe
                            </Link>
                        )}
                    </div>
                )}
            </div>
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