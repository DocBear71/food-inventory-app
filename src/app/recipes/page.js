'use client';
// file: /src/app/recipes/page.js v7 - FIXED undefined filter errors and improved error handling

import {useSafeSession} from '@/hooks/useSafeSession';
import {useEffect, useState, Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {useSubscription} from '@/hooks/useSubscription';
import {StarRating} from '@/components/reviews/RecipeRating';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import {getApiUrl} from '@/lib/api-config';
import RecipesLoadingModal from "@/components/recipes/RecipesLoadingModal";
import SaveRecipeButton from "@/components/recipes/SaveRecipeButton";
import RecipeCollections from '@/components/recipes/RecipeCollections';
import {FEATURE_GATES} from "@/lib/subscription-config";
import FeatureGate from "@/components/subscription/FeatureGate";

function RecipesContent() {
    const {data: session, status} = useSafeSession();
    const subscription = useSubscription();
    const [showLoadingModal, setShowLoadingModal] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
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

    // Enhanced state for saved recipes and collections counts with better error handling
    const [collectionsCount, setCollectionsCount] = useState(0);
    const [loadingCounts, setLoadingCounts] = useState(true);
    const [countsError, setCountsError] = useState('');

    // Ingredient search state
    const [ingredientSearch, setIngredientSearch] = useState('');
    const [ingredientSearchType, setIngredientSearchType] = useState('any');

    // Tab state for My Recipes vs Public Recipes
    const [activeTab, setActiveTab] = useState('my-recipes');

    // Error state for main recipes
    const [recipesError, setRecipesError] = useState('');

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

    // COMMENTED OUT: Quick search presets for common decimal issues (used for import cleanup)
    // const DECIMAL_PRESETS = [
    //     { label: '1/3 issues (0.333...)', value: '0.33333333333', type: 'amount' },
    //     { label: '2/3 issues (0.666...)', value: '0.6666666666', type: 'amount' },
    //     { label: '1/6 issues (0.166...)', value: '0.16666666666', type: 'amount' },
    //     { label: '5/6 issues (0.833...)', value: '0.83333333333', type: 'amount' },
    //     { label: 'All decimal issues', value: '\\d+\\.\\d{5,}', type: 'regex' }
    // ];

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session) {
            fetchRecipes();
            fetchCounts();
        }
    }, [session]);

    const fetchRecipes = async () => {
        try {
            if (isInitialLoad) {
                setShowLoadingModal(true);
            }

            setRecipesError('');
            const response = await fetch(getApiUrl('/api/recipes'));

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                // FIXED: Ensure recipes is always an array
                const recipesArray = Array.isArray(data.recipes) ? data.recipes : [];
                setRecipes(recipesArray);

                // Extract all unique tags and categories with null checks
                const tags = new Set();
                const categories = new Set();

                recipesArray.forEach(recipe => {
                    // FIXED: Add null checks for recipe properties
                    if (recipe && Array.isArray(recipe.tags)) {
                        recipe.tags.forEach(tag => {
                            if (tag && typeof tag === 'string') {
                                tags.add(tag);
                            }
                        });
                    }
                    if (recipe && recipe.category && typeof recipe.category === 'string') {
                        categories.add(recipe.category);
                    }
                });

                setAllTags(Array.from(tags).sort());
                setAllCategories(Array.from(categories).sort());
            } else {
                console.error('Failed to fetch recipes:', data.error || 'Unknown error');
                setRecipesError(data.error || 'Failed to load recipes');
                setRecipes([]); // Ensure empty array on error
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
            setRecipesError(error.message || 'Failed to load recipes');
            setRecipes([]); // Ensure empty array on error
        } finally {
            setLoading(false);

            if (isInitialLoad) {
                setTimeout(() => {
                    setShowLoadingModal(false);
                    setIsInitialLoad(false);
                }, 1000);
            }
        }
    };

    // Update the fetchCounts function to only fetch collections (since global hook handles saved recipes):
    const fetchCounts = async (showLoading = true, retryCount = 0) => {
        const maxRetries = 1; // Reduced retries to prevent connection spam

        try {
            if (showLoading) {
                setLoadingCounts(true);
            }
            setCountsError('');

            console.log(`🔄 Fetching collections count (attempt ${retryCount + 1}/${maxRetries + 1})`);

            // Only fetch collections count now (saved recipes handled by global hook)
            const createSafeRequest = async (url, name) => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);

                    const response = await fetch(getApiUrl(url), {
                        signal: controller.signal,
                        headers: {
                            'Cache-Control': 'no-cache',
                        },
                    });

                    clearTimeout(timeoutId);
                    return {response, name, success: true};
                } catch (error) {
                    console.warn(`⚠️ ${name} request failed:`, error.message);
                    return {success: false, name, error: error.message};
                }
            };

            // Only fetch collections
            const collectionsResult = await createSafeRequest('/api/collections', 'Collections');

            let collectionsCountVal = collectionsCount; // Keep current value as fallback
            let hasUpdates = false;
            let hasErrors = false;

            // Handle collections response
            if (collectionsResult.success && collectionsResult.response.ok) {
                try {
                    const collectionsData = await collectionsResult.response.json();
                    if (collectionsData.success) {
                        collectionsCountVal = Array.isArray(collectionsData.collections) ? collectionsData.collections.length : 0;
                        hasUpdates = true;
                        console.log('✅ Collections count fetched:', collectionsCountVal);
                    } else if (collectionsData.code === 'DATABASE_CONNECTION_ERROR' || collectionsData.code === 'DATABASE_NETWORK_ERROR') {
                        console.warn('⚠️ Database temporarily unavailable for collections');
                        hasErrors = true;
                    } else {
                        console.warn('Collections API returned error:', collectionsData.error);
                    }
                } catch (parseError) {
                    console.error('Error parsing collections response:', parseError);
                    collectionsCountVal = 0;
                    hasErrors = true;
                }
            } else if (collectionsResult.success && collectionsResult.response.status === 503) {
                console.warn('⚠️ Collections API temporarily unavailable (503)');
                hasErrors = true;
            } else {
                console.warn('Collections API failed:', collectionsResult.success ? collectionsResult.response.status : collectionsResult.error);
                hasErrors = true;
            }

            // Update collections count if we got successful response
            if (hasUpdates || retryCount === 0) {
                setCollectionsCount(collectionsCountVal);
            }

            // Handle retry logic more conservatively
            if (hasErrors && !hasUpdates && retryCount < maxRetries) {
                console.log(`🔄 Collections request failed, retrying once in 5 seconds...`);
                setTimeout(() => {
                    fetchCounts(false, retryCount + 1);
                }, 5000);
                return;
            }

            // Show error only if failed on final attempt
            if (hasErrors && !hasUpdates && retryCount >= maxRetries) {
                setCountsError('Collections data temporarily unavailable');
            }

        } catch (error) {
            console.error('Error in fetchCounts:', error);

            if (retryCount < maxRetries) {
                console.log(`🔄 Network error, retrying once in 8 seconds...`);
                setTimeout(() => {
                    fetchCounts(false, retryCount + 1);
                }, 8000);
            } else {
                setCountsError('Data temporarily unavailable - please refresh');
            }
        } finally {
            if (showLoading) {
                setLoadingCounts(false);
            }
        }
    };
// Also add this enhanced count update function:
    const updateCountsWithFallback = () => {
        // Try to fetch counts, but don't show loading if it fails
        fetchCounts(false).catch(error => {
            console.warn('Background count update failed:', error);
            // Fallback: keep current counts
        });
    };

    // Update collections count handlers:
    const handleCollectionsCountChange = (newCount) => {
        console.log('📊 Updating collections count:', newCount);
        if (typeof newCount === 'number' && newCount >= 0) {
            setCollectionsCount(newCount);
        }
    };

    // Replace the handleRecipeSaveStateChange function with this simplified version:
    const handleRecipeSaveStateChange = (recipeId, isSaved) => {
        console.log('📊 Recipe save state changed:', recipeId, isSaved);
    };

    // Add this new error boundary component to handle network errors gracefully:
    const ErrorBoundary = ({children, fallback}) => {
        return (
            <div className="min-h-[200px] flex items-center justify-center">
                {fallback || (
                    <div className="text-center">
                        <div className="text-gray-400 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Temporarily Unavailable
                        </h3>
                        <p className="text-gray-500 mb-4">
                            This feature is temporarily unavailable due to high server load.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            Refresh Page
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const handleDelete = async (recipeId) => {
        if (!confirm('Are you sure you want to delete this recipe?')) {
            return;
        }

        try {
            const response = await fetch(getApiUrl(`/api/recipes/${recipeId}`), {
                method: 'DELETE'
            });

            if (response.ok) {
                // FIXED: Ensure recipes is always an array before filtering
                setRecipes(prev => Array.isArray(prev) ? prev.filter(recipe => recipe._id !== recipeId) : []);
            } else {
                alert('Failed to delete recipe');
            }
        } catch (error) {
            console.error('Error deleting recipe:', error);
            alert('Error deleting recipe');
        }
    };

    // Enhanced ingredient search function with null checks
    const searchInIngredients = (recipe, searchTerm, searchType) => {
        // FIXED: Add null checks for recipe and ingredients
        if (!recipe || !Array.isArray(recipe.ingredients) || !searchTerm) return true;

        const normalizedSearch = searchTerm.toLowerCase().trim();

        return recipe.ingredients.some(ingredient => {
            if (!ingredient) return false;

            const ingredientText = typeof ingredient === 'string'
                ? ingredient
                : `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.name || ingredient.ingredient || ''}`.trim();

            const normalizedIngredient = ingredientText.toLowerCase();

            switch (searchType) {
                case 'exact':
                    return normalizedIngredient.includes(normalizedSearch);
                case 'amount':
                    const amountMatch = ingredientText.match(/[\d\.\/]+/g);
                    if (amountMatch) {
                        return amountMatch.some(amount => amount.includes(searchTerm));
                    }
                    return false;
                case 'regex':
                    try {
                        const regex = new RegExp(searchTerm, 'i');
                        return regex.test(ingredientText);
                    } catch (e) {
                        return normalizedIngredient.includes(normalizedSearch);
                    }
                case 'any':
                default:
                    return normalizedIngredient.includes(normalizedSearch);
            }
        });
    };

    // Enhanced filter function with ingredient search and null checks
    const getFilteredAndSortedRecipes = () => {
        // FIXED: Ensure recipes is always an array before filtering
        const recipesArray = Array.isArray(recipes) ? recipes : [];

        let filtered = recipesArray.filter(recipe => {
            // FIXED: Add null checks for recipe properties
            if (!recipe) return false;

            const matchesTab = activeTab === 'my-recipes'
                ? (recipe.createdBy?._id === session?.user?.id || recipe.createdBy === session?.user?.id)
                : recipe.isPublic === true;

            const matchesSearch = !searchTerm ||
                (recipe.title && recipe.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (recipe.description && recipe.description.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesTag = !selectedTag ||
                (Array.isArray(recipe.tags) && recipe.tags.includes(selectedTag));

            const matchesDifficulty = !selectedDifficulty ||
                recipe.difficulty === selectedDifficulty;

            const matchesCategory = !selectedCategory ||
                recipe.category === selectedCategory;

            const matchesIngredient = !ingredientSearch ||
                searchInIngredients(recipe, ingredientSearch, ingredientSearchType);

            return matchesTab && matchesSearch && matchesTag && matchesDifficulty && matchesCategory && matchesIngredient;
        });

        return filtered.sort((a, b) => {
            // FIXED: Add null checks for sorting properties
            if (!a || !b) return 0;

            switch (sortBy) {
                case 'newest':
                    const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    return bDate - aDate;
                case 'oldest':
                    const aDateOld = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    const bDateOld = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    return aDateOld - bDateOld;
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
                    const aTitle = a.title || '';
                    const bTitle = b.title || '';
                    return aTitle.localeCompare(bTitle);
                default:
                    return 0;
            }
        });
    };

    // COMMENTED OUT: Quick preset handler for decimal cleanup
    // const handleDecimalPreset = (preset) => {
    //     setIngredientSearch(preset.value);
    //     setIngredientSearchType(preset.type);
    // };

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

    // Update the getTabCounts function to use globalSavedCount:
    const getTabCounts = () => {
        const recipesArray = Array.isArray(recipes) ? recipes : [];

        const myRecipes = recipesArray.filter(recipe =>
            recipe && (recipe.createdBy?._id === session?.user?.id || recipe.createdBy === session?.user?.id)
        );
        const publicRecipes = recipesArray.filter(recipe => recipe && recipe.isPublic === true);

        return {
            myRecipes: myRecipes.length,
            publicRecipes: publicRecipes.length,
            collections: collectionsCount
        };
    };

    // Update the getUsageInfo function to use globalSavedCount:
    const getUsageInfo = (tabType) => {
        if (!subscription || subscription.loading) {
            return {current: 0, limit: '...', isUnlimited: false, tier: 'free'};
        }

        const tier = subscription.tier || 'free';

        switch (tabType) {
            case 'my-recipes':
                return {
                    current: subscription.usage?.personalRecipes || 0,
                    limit: tier === 'free' ? 5 :
                        tier === 'gold' ? 100 :
                            tier === 'admin' ? 'Unlimited' : 'Unlimited',
                    isUnlimited: tier === 'platinum' || tier === 'admin',
                    tier
                };
            case 'collections':
                return {
                    current: collectionsCount,
                    limit: tier === 'free' ? 2 :
                        tier === 'gold' ? 10 :
                            tier === 'admin' ? 'Unlimited' : 'Unlimited',
                    isUnlimited: tier === 'platinum' || tier === 'admin',
                    tier
                };
            default:
                return {current: 0, limit: 'N/A', isUnlimited: false, tier};
        }
    };


    // Update formatCountWithLimit to handle loading states better:
    const formatCountWithLimit = (tabType) => {
        if (subscription.loading) {
            return '...';
        }

        if (tabType !== 'collections' && loadingCounts) {
            return '...';
        }

        const usage = getUsageInfo(tabType);
        const count = getTabCounts()[tabType] || usage.current;

        if (usage.isUnlimited || usage.tier === 'admin') {
            return `${count}`;
        }

        return `${count}/${usage.limit}`;
    };


    // Update getCountColor to use proper loading states:
    const getCountColor = (tabType, isActive) => {
        if (subscription.loading) {
            return isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600';
        }

        if (tabType !== 'collections' && loadingCounts) {
            return isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600';
        }

        const usage = getUsageInfo(tabType);
        const count = getTabCounts()[tabType] || usage.current;

        if (usage.isUnlimited || usage.tier === 'admin') {
            return isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600';
        }

        const limit = typeof usage.limit === 'number' ? usage.limit : 999999;
        const percentage = (count / limit) * 100;

        if (isActive) {
            if (percentage >= 100) return 'bg-red-100 text-red-600';
            if (percentage >= 80) return 'bg-orange-100 text-orange-600';
            return 'bg-indigo-100 text-indigo-600';
        } else {
            if (percentage >= 100) return 'bg-red-200 text-red-700';
            if (percentage >= 80) return 'bg-orange-200 text-orange-700';
            return 'bg-gray-200 text-gray-600';
        }
    };

    // Check if user can edit recipe
    const canEditRecipe = (recipe) => {
        return recipe && (recipe.createdBy?._id === session?.user?.id || recipe.createdBy === session?.user?.id);
    };

    // Keep your existing RecipesLoadingModal but enhance the message:
    if (status === 'loading' || loading) {
        return (
            <MobileOptimizedLayout>
                <RecipesLoadingModal
                    isOpen={true}
                    activeTab="my-recipes"
                    myRecipesCount={0}
                    publicRecipesCount={0}
                    savedRecipesCount={0}
                    collectionsCount={0}
                    loadingMessage="Loading your recipes... This may take a moment due to high server traffic."
                />
            </MobileOptimizedLayout>
        );
    }

    // FIXED: Use safe filtering
    const filteredRecipes = getFilteredAndSortedRecipes();
    const tabCounts = getTabCounts();

    return (
        <MobileOptimizedLayout>
            <RecipesLoadingModal
                isOpen={showLoadingModal}
                activeTab={activeTab}
                myRecipesCount={tabCounts.myRecipes || 0}
                publicRecipesCount={tabCounts.publicRecipes || 0}
                savedRecipesCount={tabCounts.savedRecipes || 0}
                collectionsCount={tabCounts.collections || 0}
            />
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Enhanced Error Messages */}
                {recipesError && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <div className="text-red-500 mr-3 mt-0.5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                          clipRule="evenodd"/>
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-red-800">
                                    Unable to Load Recipes
                                </h3>
                                <div className="text-sm text-red-700 mt-1">
                                    {recipesError.includes('503') || recipesError.includes('temporarily') ? (
                                        <>
                                            <p>Our servers are experiencing high traffic. This usually resolves within a
                                                few minutes.</p>
                                            <div className="mt-2 flex gap-2">
                                                <button
                                                    onClick={fetchRecipes}
                                                    className="text-red-600 hover:text-red-800 underline text-xs"
                                                >
                                                    Try Again
                                                </button>
                                                <span className="text-red-500">•</span>
                                                <button
                                                    onClick={() => window.location.reload()}
                                                    className="text-red-600 hover:text-red-800 underline text-xs"
                                                >
                                                    Refresh Page
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p><strong>Error:</strong> {recipesError}</p>
                                            <button
                                                onClick={fetchRecipes}
                                                className="mt-2 text-red-600 hover:text-red-800 underline text-xs"
                                            >
                                                Try Again
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {countsError && (
                    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <div className="text-yellow-500 mr-3 mt-0.5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                          clipRule="evenodd"/>
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-yellow-800">
                                    Some Features Temporarily Limited
                                </h3>
                                <p className="text-sm text-yellow-700 mt-1">
                                    {countsError} The main recipe functionality is still available.
                                </p>
                            </div>
                        </div>
                    </div>
                )}


                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
                        <p className="text-gray-600 mt-1">

                        </p>
                    </div>
                </div>

                {/* Enhanced Tab Navigation with Usage Counts - Real-time Updates */}
                <div className="mb-6" key={`tab-counts-${collectionsCount}-${Date.now()}`}>
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
                                <span
                                    className={`text-xs px-2 py-1 rounded-full ${getCountColor('my-recipes', activeTab === 'my-recipes')}`}>
                    {formatCountWithLimit('my-recipes')}
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
                    {getTabCounts().publicRecipes}
                </span>
                            </div>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => setActiveTab('collections')}
                            className={`flex-1 py-3 px-4 rounded-md text-center font-medium transition-all touch-friendly ${
                                activeTab === 'collections'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>📁 Collections</span>
                                <span
                                    className={`text-xs px-2 py-1 rounded-full ${getCountColor('collections', activeTab === 'collections')}`}>
                    {formatCountWithLimit('collections')}
                </span>
                            </div>
                        </TouchEnhancedButton>
                    </div>
                </div>


                {/* Enhanced Tab Content Info with Usage Details */}
                <div className="mb-6">
                    {activeTab === 'my-recipes' ? (
                        <>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <div className="text-blue-600 mr-3 mt-0.5">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd"
                                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                  clipRule="evenodd"/>
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-blue-800">Your Personal Recipe
                                            Collection</h3>
                                        <p className="text-sm text-blue-700 mt-1">
                                            These are recipes you've created or added to your personal collection. You
                                            can edit, delete, and manage these recipes.
                                        </p>
                                        {!loadingCounts && !subscription.loading && (
                                            <div className="mt-2 text-xs text-blue-600">
                                                {(() => {
                                                    const usage = getUsageInfo('my-recipes');
                                                    if (usage.isUnlimited || usage.tier === 'admin') {
                                                        return `${usage.current} used • Unlimited on ${usage.tier} plan`;
                                                    }
                                                    const remaining = Math.max(0, (typeof usage.limit === 'number' ? usage.limit : 0) - usage.current);
                                                    return `${usage.current} used • ${remaining} remaining on ${usage.tier} plan`;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <br/>
                            {/* Header with Usage Info - MOVED OUTSIDE THE BLUE BOX */}
                            <div className="flex items-center justify-between my-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        📝 My Recipes
                                        ({getUsageInfo('my-recipes').current}/{getUsageInfo('my-recipes').limit})
                                    </h2>
                                    {!subscription.loading && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            {(() => {
                                                const usage = getUsageInfo('my-recipes');
                                                if (usage.isUnlimited || usage.tier === 'admin') {
                                                    return `Unlimited recipes on ${usage.tier} plan`;
                                                } else if (usage.current >= usage.limit) {
                                                    return (
                                                        <span className="text-red-600 font-medium">
                        You've reached your {usage.tier} plan limit
                    </span>
                                                    );
                                                } else if (usage.current >= (usage.limit * 0.8)) {
                                                    return (
                                                        <span className="text-orange-600">
                        {usage.limit - usage.current} recipe{usage.limit - usage.current !== 1 ? 's' : ''} remaining
                    </span>
                                                    );
                                                } else {
                                                    return `${usage.limit - usage.current} recipe${usage.limit - usage.current !== 1 ? 's' : ''} remaining on ${usage.tier} plan`;
                                                }
                                            })()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : activeTab === 'public-recipes' ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <div className="text-green-600 mr-3 mt-0.5">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd"
                                              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                                              clipRule="evenodd"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-green-800">Community Recipe Collection</h3>
                                    <p className="text-sm text-green-700 mt-1">
                                        Discover recipes shared by the community, including Doc Bear's Comfort Food
                                        Survival Guides. Save favorites to your personal collection!
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <div className="text-orange-600 mr-3 mt-0.5">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd"
                                              d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                                              clipRule="evenodd"/>
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-orange-800">Recipe Collections</h3>
                                    <p className="text-sm text-orange-700 mt-1">
                                        Save and organize your recipes into themed collections like "Comfort Food", "Quick
                                        Dinners", or "Holiday Recipes". This is the only way to save recipes for easy access.
                                    </p>
                                    {!loadingCounts && !subscription.loading && (
                                        <div className="mt-2 text-xs text-orange-600">
                                            {(() => {
                                                const usage = getUsageInfo('collections');
                                                if (usage.isUnlimited || usage.tier === 'admin') {
                                                    return `${usage.current} created • Unlimited on ${usage.tier} plan`;
                                                }
                                                const remaining = Math.max(0, (typeof usage.limit === 'number' ? usage.limit : 0) - usage.current);
                                                return `${usage.current} created • ${remaining} remaining on ${usage.tier} plan`;
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content - Conditional Rendering for Collections vs Recipes */}
                {activeTab === 'collections' ? (
                    <RecipeCollections onCountChange={handleCollectionsCountChange}/>
                ) : (
                    <>
                        {/* Add the recipe limit check ONLY for My Recipes tab */}
                        {activeTab === 'my-recipes' && (
                            <div className="mb-6">
                                <FeatureGate
                                    feature={FEATURE_GATES.PERSONAL_RECIPES}
                                    currentCount={getUsageInfo('my-recipes').current}
                                    fallback={
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <div className="flex items-start">
                                                <div className="text-red-500 mr-3 mt-0.5">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd"
                                                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                              clipRule="evenodd"/>
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-medium text-red-800">Recipe Limit
                                                        Reached</h3>
                                                    <p className="text-sm text-red-700 mt-1">
                                                        You've reached your {getUsageInfo('my-recipes').tier} plan limit
                                                        of {getUsageInfo('my-recipes').limit} recipes.
                                                        {getUsageInfo('my-recipes').tier === 'free' && ' Upgrade to Gold for 100 recipes or Platinum for unlimited.'}
                                                        {getUsageInfo('my-recipes').tier === 'gold' && ' Upgrade to Platinum for unlimited recipes.'}
                                                    </p>
                                                    <TouchEnhancedButton
                                                        onClick={() => window.location.href = `/pricing?source=recipe-limit&tier=${getUsageInfo('my-recipes').tier}`}
                                                        className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                                                    >
                                                        🚀 Upgrade Now
                                                    </TouchEnhancedButton>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                >
                                    <div className="flex justify-center mb-6">
                                        <Link
                                            href="/recipes/add"
                                            className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors font-medium"
                                        >
                                            📝 Add New Recipe
                                        </Link>
                                    </div>
                                </FeatureGate>
                            </div>
                        )}

                        {/* COMMENTED OUT: Decimal Issues Quick Search (for future import cleanup needs)
                {activeTab === 'my-recipes' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                            <div className="text-orange-600 mr-3 mt-0.5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-orange-800 mb-2">🔧 Import Cleanup Tools</h3>
                                <p className="text-sm text-orange-700 mb-3">
                                    Quick search for common decimal conversion issues from cookbook imports:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {DECIMAL_PRESETS.map((preset, index) => (
                                        <TouchEnhancedButton
                                            key={index}
                                            onClick={() => handleDecimalPreset(preset)}
                                            className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-3 py-1 rounded-full transition-colors"
                                        >
                                            {preset.label}
                                        </TouchEnhancedButton>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                */}


                        {/* Enhanced Filters and Search */}
                        <div className="bg-white rounded-lg border p-6 mb-8">

                            {/* NEW: Ingredient Search Section */}
                            {/* Blocked out while not needed..
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">🔍 Ingredient Search</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label htmlFor="ingredient-search" className="block text-sm font-medium text-gray-700 mb-1">
                                    Search in Ingredients
                                </label>
                                <input
                                    type="text"
                                    id="ingredient-search"
                                    value={ingredientSearch}
                                    onChange={(e) => setIngredientSearch(e.target.value)}
                                    placeholder="e.g., 0.33333333333, flour, 2 cups..."
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="search-type" className="block text-sm font-medium text-gray-700 mb-1">
                                    Search Type
                                </label>
                                <select
                                    id="search-type"
                                    value={ingredientSearchType}
                                    onChange={(e) => setIngredientSearchType(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="any">Any Match</option>
                                    <option value="exact">Exact Text</option>
                                    <option value="amount">Amount/Quantity</option>
                                    <option value="regex">Regex Pattern</option>
                                </select>
                            </div>
                        </div>
                        {ingredientSearch && (
                            <div className="mt-2 text-xs text-gray-600">
                                <span className="font-medium">Active search:</span> Looking for "{ingredientSearch}" in ingredient {ingredientSearchType === 'amount' ? 'amounts' : ingredientSearchType === 'regex' ? 'using regex pattern' : 'text'}
                            </div>
                        )}
                    </div>
                    */}


                            {/* Existing Filters */}

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
                                    <label htmlFor="category-filter"
                                           className="block text-sm font-medium text-gray-700 mb-1">
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
                                    <label htmlFor="tag-filter"
                                           className="block text-sm font-medium text-gray-700 mb-1">
                                        Tag
                                    </label>
                                    <select
                                        id="tag-filter"
                                        value={selectedTag}
                                        onChange={(e) => setSelectedTag(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">All Tags</option>
                                        {Array.isArray(allTags) && allTags.map(tag => (
                                            <option key={tag} value={tag}>{tag}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Difficulty Filter */}
                                <div>
                                    <label htmlFor="difficulty-filter"
                                           className="block text-sm font-medium text-gray-700 mb-1">
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
                                Showing {Array.isArray(filteredRecipes) ? filteredRecipes.length : 0} of {getTabCounts()[activeTab === 'my-recipes' ? 'myRecipes' : 'publicRecipes']} recipe{(Array.isArray(filteredRecipes) ? filteredRecipes.length : 0) !== 1 ? 's' : ''}
                                <span className="text-indigo-600 font-medium ml-1">
                                    ({activeTab === 'my-recipes' ? 'My Recipes' : 'Public Recipes'})
                                </span>
                            </p>
                            {(searchTerm || selectedTag || selectedDifficulty || selectedCategory || ingredientSearch) && (
                                <TouchEnhancedButton
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSelectedTag('');
                                        setSelectedDifficulty('');
                                        setSelectedCategory('');
                                        setIngredientSearch('');
                                        setIngredientSearchType('any');
                                    }}
                                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                                >
                                    Clear All Filters
                                </TouchEnhancedButton>
                            )}
                        </div>

                        {/* Recipe Grid */}
                        {Array.isArray(filteredRecipes) && filteredRecipes.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredRecipes.map((recipe) => {
                                    // FIXED: Add null check for recipe
                                    if (!recipe) return null;

                                    return (
                                        <div key={recipe._id}
                                             className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                                            <div className="p-6">
                                                {/* Header */}
                                                <div className="flex justify-between items-start mb-3">
                                                    <Link
                                                        href={`/recipes/${recipe._id}`}
                                                        className="text-lg font-semibold text-gray-900 hover:text-indigo-600 line-clamp-2"
                                                    >
                                                        {recipe.title || 'Untitled Recipe'}
                                                    </Link>
                                                    {/* Show appropriate buttons based on tab */}
                                                    <div className="flex gap-1 ml-2">
                                                        {activeTab === 'public-recipes' && (
                                                            <SaveRecipeButton
                                                                recipeId={recipe._id}
                                                                recipeName={recipe.title || 'Recipe'}
                                                                size="small"
                                                                showText={false}
                                                                onSaveStateChange={handleRecipeSaveStateChange}
                                                            />
                                                        )}
                                                        {canEditRecipe(recipe) && (
                                                            <div className="flex space-x-1">
                                                                <TouchEnhancedButton
                                                                    onClick={() => window.location.href = `/recipes/${recipe._id}/edit`}
                                                                    className="flex items-center justify-center w-8 h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors touch-friendly"
                                                                    title="Edit recipe"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none"
                                                                         stroke="currentColor"
                                                                         viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round"
                                                                              strokeLinejoin="round"
                                                                              strokeWidth={2}
                                                                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                                    </svg>
                                                                </TouchEnhancedButton>
                                                                <TouchEnhancedButton
                                                                    onClick={() => handleDelete(recipe._id)}
                                                                    className="flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors touch-friendly"
                                                                    title="Delete recipe"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none"
                                                                         stroke="currentColor"
                                                                         viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round"
                                                                              strokeLinejoin="round"
                                                                              strokeWidth={2}
                                                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                                    </svg>
                                                                </TouchEnhancedButton>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Recipe Author Info (for public recipes) */}
                                                {activeTab === 'public-recipes' && recipe.createdBy && (
                                                    <div className="mb-3">
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <svg className="w-4 h-4 mr-1" fill="none"
                                                                 stroke="currentColor"
                                                                 viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                                      strokeWidth={2}
                                                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                                            </svg>
                                                            <span>
                                                                by {recipe.createdBy.name || recipe.createdBy.email || 'Unknown'}
                                                                {recipe.importedFrom && (
                                                                    <span className="text-xs text-gray-500 ml-1">
                                                                        (from {recipe.importedFrom})
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Ingredient Search Match Indicator */}
                                                {ingredientSearch && searchInIngredients(recipe, ingredientSearch, ingredientSearchType) && (
                                                    <div className="mb-3">
                                                        <div
                                                            className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                                                            <div className="flex items-center text-xs text-yellow-800">
                                                                <svg className="w-3 h-3 mr-1" fill="currentColor"
                                                                     viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd"
                                                                          d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                                                          clipRule="evenodd"/>
                                                                </svg>
                                                                <span
                                                                    className="font-medium">Contains: "{ingredientSearch}"</span>
                                                            </div>
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
                                                <div
                                                    className="flex items-center justify-between text-sm text-gray-500 mb-4">
                                                    <div className="flex items-center space-x-4">
                                                        {recipe.servings && (
                                                            <span className="flex items-center space-x-1">
                                                                <svg className="w-4 h-4" fill="none"
                                                                     stroke="currentColor"
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
                                                                <svg className="w-4 h-4" fill="none"
                                                                     stroke="currentColor"
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
                                                {Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
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
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-gray-500 mb-4">
                                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24"
                                         stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {activeTab === 'my-recipes' ? (
                                        searchTerm || selectedTag || selectedDifficulty || selectedCategory || ingredientSearch ? 'No recipes found' : 'No recipes yet'
                                    ) : (
                                        searchTerm || selectedTag || selectedDifficulty || selectedCategory || ingredientSearch ? 'No public recipes found' : 'No public recipes available'
                                    )}
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    {activeTab === 'my-recipes' ? (
                                        searchTerm || selectedTag || selectedDifficulty || selectedCategory || ingredientSearch
                                            ? 'Try adjusting your filters to find more recipes.'
                                            : 'Start building your recipe collection by adding your first recipe!'
                                    ) : (
                                        searchTerm || selectedTag || selectedDifficulty || selectedCategory || ingredientSearch
                                            ? 'Try adjusting your filters to find more public recipes.'
                                            : 'Public recipes will appear here when they become available.'
                                    )}
                                </p>
                                {activeTab === 'my-recipes' && !searchTerm && !selectedTag && !selectedDifficulty && !selectedCategory && !ingredientSearch && (
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
                                {activeTab === 'public-recipes' && !searchTerm && !selectedTag && !selectedDifficulty && !selectedCategory && !ingredientSearch && (
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
                    </>
                )}
            </div>
            <br/>
            <Footer/>
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
                    <Footer/>
                </div>
            </MobileOptimizedLayout>
        }>
            <RecipesContent/>
        </Suspense>
    );
}