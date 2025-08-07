'use client';

// file: /app/recipe-search/page.js - Enhanced Public Recipe Search with Multi-Part Indicators

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Footer from "@/components/legal/Footer";

export default function PublicRecipeSearch() {
    const [searchQuery, setSearchQuery] = useState('');
    const [recipes, setRecipes] = useState([]);
    const [filteredRecipes, setFilteredRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        category: '',
        difficulty: '',
        maxTime: '',
        dietary: [],
        isMultiPart: false // ADDED: Multi-part filter
    });
    const [sortBy, setSortBy] = useState('relevance');
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [recipesPerPage] = useState(20);

    // Fetch real recipes from your API
    useEffect(() => {
        const fetchRecipes = async () => {
            try {
                setLoading(true);
                setError('');

                // Fetch public recipes without authentication
                const response = await fetch('/api/public-recipes');

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.success) {
                    const publicRecipes = Array.isArray(data.recipes) ? data.recipes : [];
                    setRecipes(publicRecipes);
                    setFilteredRecipes(publicRecipes);
                    console.log(`Loaded ${publicRecipes.length} public recipes`);

                    // ADDED: Log multi-part recipe count
                    const multiPartCount = publicRecipes.filter(r => r.isMultiPart).length;
                    console.log(`Found ${multiPartCount} multi-part recipes`);
                } else {
                    throw new Error(data.error || 'Failed to load recipes');
                }

            } catch (error) {
                console.error('Error fetching recipes:', error);
                setError('Failed to load recipes. Please try again later.');
                setRecipes([]);
                setFilteredRecipes([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRecipes();
    }, []);

    // Real categories from your system
    const categories = [
        { value: '', label: 'All Categories' },
        { value: 'breakfast', label: 'Breakfast' },
        { value: 'entrees', label: 'Main Dishes' },
        { value: 'side-dishes', label: 'Side Dishes' },
        { value: 'soups', label: 'Soups & Stews' },
        { value: 'desserts', label: 'Desserts' },
        { value: 'appetizers', label: 'Appetizers' },
        { value: 'beverages', label: 'Beverages' },
        { value: 'seasonings', label: 'Seasonings' },
        { value: 'sauces', label: 'Sauces' },
        { value: 'salad-dressings', label: 'Salad Dressings' },
        { value: 'marinades', label: 'Marinades' },
        { value: 'sandwiches', label: 'Sandwiches' },
        { value: 'breads', label: 'Breads' },
        { value: 'specialty-items', label: 'Specialty Items' }
    ];

    const dietaryOptions = [
        'vegetarian', 'vegan', 'gluten-free', 'healthy', 'protein-rich', 'low-carb'
    ];

    // ADDED: Helper to get multi-part recipe stats
    const getMultiPartStats = (recipe) => {
        if (!recipe.isMultiPart || !recipe.parts) return null;

        const totalIngredients = recipe.parts.reduce((total, part) => total + (part.ingredients?.length || 0), 0);
        const totalInstructions = recipe.parts.reduce((total, part) => total + (part.instructions?.length || 0), 0);

        return {
            partCount: recipe.parts.length,
            totalIngredients,
            totalInstructions
        };
    };

    // Filter and sort recipes
    useEffect(() => {
        let filtered = [...recipes];

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(recipe =>
                recipe.title?.toLowerCase().includes(query) ||
                recipe.description?.toLowerCase().includes(query) ||
                (Array.isArray(recipe.tags) && recipe.tags.some(tag =>
                    tag.toLowerCase().includes(query)
                )) ||
                (Array.isArray(recipe.ingredients) && recipe.ingredients.some(ing =>
                    ing.name?.toLowerCase().includes(query)
                ))
            );
        }

        // Apply category filter
        if (filters.category) {
            filtered = filtered.filter(recipe => recipe.category === filters.category);
        }

        // Apply difficulty filter
        if (filters.difficulty) {
            filtered = filtered.filter(recipe => recipe.difficulty === filters.difficulty);
        }

        // Apply time filter
        if (filters.maxTime) {
            const maxMinutes = parseInt(filters.maxTime);
            filtered = filtered.filter(recipe => {
                const totalTime = (recipe.cookTime || 0) + (recipe.prepTime || 0);
                return totalTime <= maxMinutes;
            });
        }

        // Apply dietary filters
        if (filters.dietary.length > 0) {
            filtered = filtered.filter(recipe =>
                Array.isArray(recipe.tags) &&
                filters.dietary.every(diet => recipe.tags.includes(diet))
            );
        }

        // ADDED: Apply multi-part filter
        if (filters.isMultiPart) {
            filtered = filtered.filter(recipe => recipe.isMultiPart);
        }

        // Apply sorting
        if (sortBy === 'rating') {
            filtered.sort((a, b) => (b.ratingStats?.averageRating || 0) - (a.ratingStats?.averageRating || 0));
        } else if (sortBy === 'time') {
            filtered.sort((a, b) => {
                const aTime = (a.cookTime || 0) + (a.prepTime || 0);
                const bTime = (b.cookTime || 0) + (b.prepTime || 0);
                return aTime - bTime;
            });
        } else if (sortBy === 'reviews') {
            filtered.sort((a, b) => (b.ratingStats?.totalRatings || 0) - (a.ratingStats?.totalRatings || 0));
        } else if (sortBy === 'newest') {
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        setFilteredRecipes(filtered);
        setCurrentPage(1); // Reset to first page when filters change
    }, [searchQuery, filters, sortBy, recipes]);

    const handleDietaryChange = (diet) => {
        setFilters(prev => ({
            ...prev,
            dietary: prev.dietary.includes(diet)
                ? prev.dietary.filter(d => d !== diet)
                : [...prev.dietary, diet]
        }));
    };

    const clearFilters = () => {
        setFilters({
            category: '',
            difficulty: '',
            maxTime: '',
            dietary: [],
            isMultiPart: false // ADDED: Reset multi-part filter
        });
        setSearchQuery('');
    };

    const formatTime = (minutes) => {
        if (!minutes || minutes === 0) return 'No cooking time';
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
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;

        for (let i = 0; i < fullStars; i++) {
            stars.push(
                <span key={i} className="text-yellow-400">★</span>
            );
        }

        if (hasHalfStar) {
            stars.push(
                <span key="half" className="text-yellow-400">☆</span>
            );
        }

        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars.push(
                <span key={`empty-${i}`} className="text-gray-300">★</span>
            );
        }

        return stars;
    };

    // FIXED: Enhanced getRecipeImage function with proper photo detection
    const getRecipeImage = (recipe) => {
        console.log(`🔍 Getting image for "${recipe.title}":`, {
            hasPrimaryPhoto: !!recipe.primaryPhoto,
            primaryPhotoType: typeof recipe.primaryPhoto,
            hasPhotos: recipe.hasPhotos,
            photosLength: recipe.photos?.length,
            hasImageUrl: !!recipe.imageUrl,
            hasUploadedImage: !!recipe.uploadedImage?.data,
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

        // Fallback: Placeholder (FIXED: Use correct path)
        console.log('❌ Using placeholder - no images found');
        return '/images/recipe-placeholder.jpg';
    };

    // Pagination
    const indexOfLastRecipe = currentPage * recipesPerPage;
    const indexOfFirstRecipe = indexOfLastRecipe - recipesPerPage;
    const currentRecipes = filteredRecipes.slice(indexOfFirstRecipe, indexOfLastRecipe);
    const totalPages = Math.ceil(filteredRecipes.length / recipesPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // ADDED: Get stats for display
    const multiPartCount = recipes.filter(r => r.isMultiPart).length;

    return (
        <div className="min-h-screen bg-gray-50">
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
                            <Link href="/pricing" className="text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 text-sm font-medium">
                                Pricing
                            </Link>
                            <Link href="/auth/signin" className="text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 text-sm font-medium">
                                Sign In
                            </Link>
                            <Link href="/auth/signup" className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Header */}
                <div className="text-center mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        Discover Amazing Recipes
                    </h1>
                    <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                        Search through our collection of {recipes.length}+ professional recipes from Dr. Edward McKeown's cookbook series
                        {multiPartCount > 0 && (
                            <span className="block mt-2 text-sm">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                                    🧩 {multiPartCount} Multi-Part Recipes
                                </span>
                                available with organized sections
                            </span>
                        )}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="text-red-700">{error}</div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="mb-6 sm:mb-8">
                    <div className="max-w-2xl mx-auto">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search recipes by name, ingredient, or cuisine..."
                                className="w-full pl-10 pr-4 py-3 sm:py-4 text-base sm:text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Quick Category Buttons */}
                <div className="flex flex-wrap justify-center gap-2 mb-6 sm:mb-8">
                    {[
                        { label: 'Quick Meals', filter: { maxTime: '30' } },
                        { label: 'Multi-Part', filter: { isMultiPart: true } }, // ADDED: Multi-part quick filter
                        { label: 'Vegetarian', filter: { dietary: ['vegetarian'] } },
                        { label: 'Desserts', filter: { category: 'desserts' } },
                        { label: 'Healthy', filter: { dietary: ['healthy'] } },
                        { label: 'Comfort Food', search: 'comfort' }
                    ].map((category, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                if (category.filter) {
                                    setFilters(prev => ({ ...prev, ...category.filter }));
                                } else if (category.search) {
                                    setSearchQuery(category.search);
                                }
                            }}
                            className={`px-3 sm:px-4 py-2 border rounded-full text-sm font-medium transition-colors ${
                                (category.filter?.isMultiPart && filters.isMultiPart) ?
                                    'bg-blue-600 text-white border-blue-600' :
                                    'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {category.label === 'Multi-Part' && '🧩 '}
                            {category.label}
                        </button>
                    ))}
                </div>

                {/* Filters and Results */}
                <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
                    {/* Sidebar Filters */}
                    <div className="lg:w-1/4">
                        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="lg:hidden text-purple-600 hover:text-purple-700"
                                >
                                    {showFilters ? 'Hide' : 'Show'}
                                </button>
                            </div>

                            <div className={`space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                                {/* ADDED: Multi-Part Filter */}
                                <div>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={filters.isMultiPart}
                                            onChange={(e) => setFilters(prev => ({ ...prev, isMultiPart: e.target.checked }))}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm font-medium text-gray-700">
                                            🧩 Multi-Part Recipes Only
                                        </span>
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1 ml-6">
                                        Recipes with organized sections like "Filling" and "Topping"
                                    </p>
                                </div>

                                {/* Category Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                    <select
                                        value={filters.category}
                                        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Difficulty Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                                    <select
                                        value={filters.difficulty}
                                        onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">Any Difficulty</option>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>

                                {/* Time Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Total Time</label>
                                    <select
                                        value={filters.maxTime}
                                        onChange={(e) => setFilters(prev => ({ ...prev, maxTime: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">Any Time</option>
                                        <option value="15">15 minutes or less</option>
                                        <option value="30">30 minutes or less</option>
                                        <option value="60">1 hour or less</option>
                                        <option value="120">2 hours or less</option>
                                    </select>
                                </div>

                                {/* Dietary Restrictions */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Dietary</label>
                                    <div className="space-y-2">
                                        {dietaryOptions.map(diet => (
                                            <label key={diet} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={filters.dietary.includes(diet)}
                                                    onChange={() => handleDietaryChange(diet)}
                                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 capitalize">
                                                    {diet.replace('-', ' ')}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Clear Filters */}
                                <button
                                    onClick={clearFilters}
                                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:w-3/4">
                        {/* Results Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                            <p className="text-gray-600 mb-4 sm:mb-0">
                                {loading ? 'Loading...' : `${filteredRecipes.length} recipe${filteredRecipes.length !== 1 ? 's' : ''} found`}
                                {filters.isMultiPart && ` (multi-part only)`}
                            </p>

                            <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600">Sort by:</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
                                >
                                    <option value="relevance">Relevance</option>
                                    <option value="rating">Highest Rated</option>
                                    <option value="time">Quickest</option>
                                    <option value="reviews">Most Reviews</option>
                                    <option value="newest">Newest</option>
                                </select>
                            </div>
                        </div>

                        {/* Recipe Grid */}
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-xl shadow-sm border animate-pulse">
                                        <div className="h-48 bg-gray-200 rounded-t-xl"></div>
                                        <div className="p-4 sm:p-6 space-y-3">
                                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-3 bg-gray-200 rounded w-full"></div>
                                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : currentRecipes.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                    {currentRecipes.map((recipe) => {
                                        const multiPartStats = getMultiPartStats(recipe); // ADDED: Get multi-part stats

                                        return (
                                            <Link
                                                key={recipe._id}
                                                href={`/recipe-preview/${recipe._id}`}
                                                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow group relative"
                                            >
                                                {/* ADDED: Multi-Part Badge */}
                                                {recipe.isMultiPart && (
                                                    <div className="absolute top-2 left-2 z-10">
                                                        <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                                                            🧩 Multi-Part
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="relative">
                                                    <Image
                                                        src={getRecipeImage(recipe)}
                                                        alt={recipe.title || 'Recipe'}
                                                        width={400}
                                                        height={300}
                                                        className="w-full h-32 object-cover rounded-t-xl group-hover:opacity-90 transition-opacity"
                                                    />
                                                    <div className="absolute top-3 right-3">
                                                        {recipe.difficulty && (
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                                                                {recipe.difficulty}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="p-4 sm:p-6">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors line-clamp-2">
                                                        {recipe.title || 'Untitled Recipe'}
                                                    </h3>

                                                    {/* ADDED: Multi-Part Info */}
                                                    {multiPartStats && (
                                                        <div className="text-xs text-blue-600 mb-2 font-medium">
                                                            {multiPartStats.partCount} parts • {multiPartStats.totalIngredients} ingredients • {multiPartStats.totalInstructions} steps
                                                        </div>
                                                    )}

                                                    {recipe.description && (
                                                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                                            {recipe.description}
                                                        </p>
                                                    )}

                                                    {recipe.ratingStats?.averageRating > 0 && (
                                                        <div className="flex items-center mb-3">
                                                            <div className="flex items-center mr-3">
                                                                {renderStars(recipe.ratingStats.averageRating)}
                                                                <span className="text-sm text-gray-600 ml-1">
                                                                    {recipe.ratingStats.averageRating.toFixed(1)} ({recipe.ratingStats.totalRatings || 0})
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                                                        <div className="flex items-center space-x-3">
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
                                                                    {recipe.servings}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Tags */}
                                                    {Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mb-2">
                                                            {recipe.tags.slice(0, 3).map((tag, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800"
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

                                                    {/* Author */}
                                                    {recipe.createdBy && (
                                                        <div className="text-xs text-gray-500">
                                                            by {recipe.createdBy.name || recipe.createdBy.email}
                                                            {recipe.importedFrom && (
                                                                <span className="ml-1">(from {recipe.importedFrom})</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="mt-8 flex justify-center">
                                        <nav className="flex items-center space-x-2">
                                            <button
                                                onClick={() => paginate(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>

                                            {/* Page numbers */}
                                            {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = index + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = index + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + index;
                                                } else {
                                                    pageNum = currentPage - 2 + index;
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => paginate(pageNum)}
                                                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                                                            currentPage === pageNum
                                                                ? 'bg-purple-600 text-white'
                                                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}

                                            <button
                                                onClick={() => paginate(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </nav>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-gray-500 mb-4">
                                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
                                <p className="text-gray-500 mb-4">
                                    Try adjusting your search criteria or clearing some filters.
                                </p>
                                <button
                                    onClick={clearFilters}
                                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Call to Action */}
                <div className="mt-12 sm:mt-16 bg-gradient-to-r from-purple-500 to-blue-400 rounded-2xl p-6 sm:p-8 text-center text-white">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4">Ready to Cook?</h2>
                    <p className="text-base sm:text-lg mb-6 opacity-90">
                        Create your free account to save recipes, plan meals, and access our full collection
                        {multiPartCount > 0 && (
                            <span className="block mt-2">
                                Including {multiPartCount} multi-part recipes with organized sections!
                            </span>
                        )}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/auth/signup"
                            className="bg-white text-purple-600 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                        >
                            Start Free Today
                        </Link>
                        <Link
                            href="/pricing"
                            className="border-2 border-white text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors"
                        >
                            View Pricing
                        </Link>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}