'use client';

// file: /src/app/recipes/page.js v9 - Enhanced with recipe images

import { useSafeSession } from '@/hooks/useSafeSession';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { StarRating } from '@/components/reviews/RecipeRating';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import RecipesLoadingModal from "@/components/recipes/RecipesLoadingModal";
import SaveRecipeButton from "@/components/recipes/SaveRecipeButton";
import RecipeCollections from '@/components/recipes/RecipeCollections';
import AdvancedRecipeFilters from '@/components/recipes/AdvancedRecipeFilters';
import RecipeDiscoveryDashboard from '@/components/recipes/RecipeDiscoveryDashboard';
import EnhancedPagination from '@/components/recipes/EnhancedPagination';
import { FEATURE_GATES } from "@/lib/subscription-config";
import FeatureGate from "@/components/subscription/FeatureGate";
import { apiGet, apiDelete, getRecipeUrl } from '@/lib/api-config';
import { RecipeSearchEngine } from '@/lib/recipeSearch';
import { VoiceInput } from '@/components/mobile/VoiceInput';
import KeyboardOptimizedInput from '@/components/forms/KeyboardOptimizedInput';
import RecipeNavigationLink from '@/components/recipes/RecipeNavigationLink';

// FINAL: RecipeImage Component with correct layout and styling
const RecipeImage = ({ recipe, className = "", priority = false }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [currentImageSrc, setCurrentImageSrc] = useState('');

    // Add this to your RecipeImage component's getImageSrc function
    const getImageSrc = () => {
        console.log('🖼️ iOS Image Debug for recipe:', recipe._id, {
            imageUrl: recipe.imageUrl,
            primaryPhoto: recipe.primaryPhoto,
            hasPhotos: recipe.hasPhotos,
            uploadedImage: !!recipe.uploadedImage?.data,
            extractedImage: !!recipe.extractedImage?.data,
            imagePriority: recipe.imagePriority
        });

        // IMMEDIATE FIX: If we have primaryPhoto but wrong priority, use it anyway
        if (recipe.primaryPhoto && recipe.primaryPhoto._id) {
            const photoUrl = `/api/recipes/photos/${recipe.primaryPhoto._id}`;
            console.log('🖼️ iOS FORCE: Using primary photo despite wrong priority:', photoUrl);
            return photoUrl;
        }

        // FIXED: Enhanced fallback logic for iOS
        console.log('🖼️ Available sources:', {
            primaryPhoto: !!recipe.primaryPhoto,
            uploadedImage: !!recipe.uploadedImage?.data,
            extractedImage: !!recipe.extractedImage?.data,
            imageUrl: !!recipe.imageUrl,
            imageError: imageError
        });

        // Use imagePriority to determine which image to show (existing logic)
        switch (recipe.imagePriority) {
            case 'primary_photo':
                if (recipe.primaryPhoto && !imageError) {
                    const photoUrl = `/api/recipes/photos/${recipe.primaryPhoto._id}`;
                    console.log('🖼️ Using primary photo from priority:', photoUrl);
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

        // ENHANCED fallback logic - try all available sources
        console.log('🖼️ Priority-based selection failed, trying fallback logic...');

        // First try uploaded image
        if (recipe.uploadedImage?.data && !imageError) {
            console.log('🖼️ Fallback: Using uploadedImage');
            return `data:${recipe.uploadedImage.mimeType};base64,${recipe.uploadedImage.data}`;
        }

        // Then try extracted image
        if (recipe.extractedImage?.data && !imageError) {
            console.log('🖼️ Fallback: Using extractedImage');
            return `data:image/jpeg;base64,${recipe.extractedImage.data}`;
        }

        // Try external URL even if priority is undefined
        if (recipe.imageUrl && !imageError) {
            console.log('🖼️ Fallback: Using external imageUrl:', recipe.imageUrl);
            return recipe.imageUrl;
        }

        console.log('🖼️ No image sources found, using placeholder');
        return '/images/recipe-placeholder.jpg';
    };

    // Set image source on component mount and recipe change
    useEffect(() => {
        const imageSrc = getImageSrc();
        setCurrentImageSrc(imageSrc);
        setImageLoaded(false);
        setImageError(false);
    }, [recipe._id, recipe.imageUrl, recipe.primaryPhoto?._id]);

    const handleImageLoad = () => {
        setImageLoaded(true);
        setImageError(false);
    };

    const handleImageError = () => {
        setImageError(true);
        setImageLoaded(false);

        // Fallback to placeholder on error
        if (currentImageSrc !== '/images/recipe-placeholder.jpg') {
            setCurrentImageSrc('/images/recipe-placeholder.jpg');
        }
    };

    // Don't render anything until we have an image source
    if (!currentImageSrc) {
        return (
            <div className={`absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center ${className}`}>
                <div className="text-gray-400">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
        );
    }

    return (
        <>
            <Image
                src={currentImageSrc}
                alt={recipe.title || 'Recipe image'}
                fill
                className={`object-cover transition-all duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                } group-hover:scale-105 ${className}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                priority={priority}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                unoptimized={currentImageSrc.startsWith('/api/')}
            />

            {/* Loading placeholder - only shows while image is loading */}
            {!imageLoaded && !imageError && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                    <div className="text-gray-400">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Image attribution overlay - subtle, appears on hover */}
            {recipe.imageAttribution && imageLoaded && !imageError && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {recipe.imageAttribution}
                </div>
            )}

            {/* Image type indicators - small badges */}
            {imageLoaded && !imageError && (
                <>
                    {/* External image indicator */}
                    {recipe.imageUrl && recipe.imageUrl !== '/images/recipe-placeholder.jpg' && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                            🌐
                        </div>
                    )}

                    {/* User upload indicator */}
                    {(recipe.primaryPhoto || (recipe.photos && recipe.photos.length > 0)) && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                            📷
                        </div>
                    )}

                    {/* AI extracted indicator */}
                    {recipe.extractedImage?.data && (
                        <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                            🤖
                        </div>
                    )}

                    {/* Multiple photos indicator */}
                    {(recipe.photoCount > 1 || (recipe.photos && recipe.photos.length > 1)) && (
                        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                            +{(recipe.photoCount || recipe.photos?.length || 1) - 1}
                        </div>
                    )}
                </>
            )}
        </>
    );
};

function RecipesContent() {
    const { data: session, status } = useSafeSession();
    const subscription = useSubscription();
    const [showLoadingModal, setShowLoadingModal] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchEngine] = useState(() => new RecipeSearchEngine());

    // Search and filter state
    const [searchFilters, setSearchFilters] = useState({
        query: '',
        category: '',
        tags: [],
        difficulty: '',
        maxCookTime: '',
        maxPrepTime: '',
        servings: '',
        minRating: '',
        includeIngredients: [],
        excludeIngredients: [],
        dietaryRestrictions: [],
        nutrition: {},
        sortBy: 'relevance'
    });

    // UI state
    const [activeTab, setActiveTab] = useState('discovery');
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [viewMode, setViewMode] = useState('grid');

    // Enhanced pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [paginationMode, setPaginationMode] = useState('traditional');

    // Collections and counts state
    const [collectionsCount, setCollectionsCount] = useState(0);
    const [loadingCounts, setLoadingCounts] = useState(true);
    const [countsError, setCountsError] = useState('');
    const [recipesError, setRecipesError] = useState('');

    const [allTags, setAllTags] = useState([]);
    const [allCategories, setAllCategories] = useState([]);

    // Voice Search State
    const [showVoiceSearch, setShowVoiceSearch] = useState(false);
    const [voiceSearchResults, setVoiceSearchResults] = useState('');
    const [processingVoiceSearch, setProcessingVoiceSearch] = useState(false);
    const [originalRecipe, setOriginalRecipe] = useState(null);

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

    // ... (keeping all your existing useEffect hooks and functions unchanged)

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    // Fetch recipes when component mounts
    useEffect(() => {
        if (session) {
            fetchRecipes();
            fetchCounts();
        }
    }, [session]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchFilters, activeTab]);

    // Add search term to history when searching
    useEffect(() => {
        if (searchFilters.query && searchFilters.query.trim().length > 2) {
            searchEngine.addToSearchHistory(searchFilters.query);
        }
    }, [searchFilters.query]);

    const fetchRecipes = async () => {
        try {
            if (isInitialLoad) {
                setShowLoadingModal(true);
            }

            setRecipesError('');
            const response = await apiGet('/api/recipes');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success) {
                const recipesArray = Array.isArray(data.recipes) ? data.recipes : [];
                setRecipes(recipesArray);

                // Extract all unique tags and categories
                const tags = new Set();
                const categories = new Set();

                recipesArray.forEach(recipe => {
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
                setRecipes([]);
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
            setRecipesError(error.message || 'Failed to load recipes');
            setRecipes([]);
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

    const fetchCounts = async (showLoading = true, retryCount = 0) => {
        const maxRetries = 1;

        try {
            if (showLoading) {
                setLoadingCounts(true);
            }
            setCountsError('');

            const createSafeRequest = async (url, name) => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);

                    const response = await apiGet(url);
                    clearTimeout(timeoutId);
                    return { response, name, success: true };
                } catch (error) {
                    console.warn(`⚠️ ${name} request failed:`, error.message);
                    return { success: false, name, error: error.message };
                }
            };

            const collectionsResult = await createSafeRequest('/api/collections', 'Collections');

            let collectionsCountVal = collectionsCount;
            let hasUpdates = false;
            let hasErrors = false;

            if (collectionsResult.success && collectionsResult.response.ok) {
                try {
                    const collectionsData = await collectionsResult.response.json();
                    if (collectionsData.success) {
                        collectionsCountVal = Array.isArray(collectionsData.collections) ? collectionsData.collections.length : 0;
                        hasUpdates = true;
                    } else if (collectionsData.code === 'DATABASE_CONNECTION_ERROR' || collectionsData.code === 'DATABASE_NETWORK_ERROR') {
                        console.warn('⚠️ Database temporarily unavailable for collections');
                        hasErrors = true;
                    }
                } catch (parseError) {
                    console.error('Error parsing collections response:', parseError);
                    collectionsCountVal = 0;
                    hasErrors = true;
                }
            }

            if (hasUpdates || retryCount === 0) {
                setCollectionsCount(collectionsCountVal);
            }

            if (hasErrors && !hasUpdates && retryCount < maxRetries) {
                setTimeout(() => {
                    fetchCounts(false, retryCount + 1);
                }, 5000);
                return;
            }

            if (hasErrors && !hasUpdates && retryCount >= maxRetries) {
                setCountsError('Collections data temporarily unavailable');
            }

        } catch (error) {
            console.error('Error in fetchCounts:', error);
            if (retryCount < maxRetries) {
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

    // Enhanced recipe filtering using the search engine
    const getFilteredAndSortedRecipes = () => {
        const recipesArray = Array.isArray(recipes) ? recipes : [];

        // First filter by tab
        let tabFiltered = recipesArray;
        if (activeTab === 'my-recipes') {
            tabFiltered = recipesArray.filter(recipe =>
                recipe.createdBy?._id === session?.user?.id || recipe.createdBy === session?.user?.id
            );
        } else if (activeTab === 'public-recipes') {
            tabFiltered = recipesArray.filter(recipe => recipe.isPublic === true);
        }

        // Then apply search filters using the search engine
        return searchEngine.searchRecipes(tabFiltered, searchFilters);
    };

    // Pagination logic
    const getDisplayedRecipes = () => {
        const filtered = getFilteredAndSortedRecipes();
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return {
            recipes: filtered.slice(startIndex, endIndex),
            totalRecipes: filtered.length,
            totalPages: Math.ceil(filtered.length / itemsPerPage)
        };
    };

    const handleDelete = async (recipeId) => {
        if (!confirm('Are you sure you want to delete this recipe?')) {
            return;
        }

        try {
            const response = await apiDelete(`/api/recipes?recipeId=${recipeId}`);

            if (response.ok) {
                setRecipes(prev => Array.isArray(prev) ? prev.filter(recipe => recipe._id !== recipeId) : []);
            } else {
                alert('Failed to delete recipe');
            }
        } catch (error) {
            console.error('Error deleting recipe:', error);
            alert('Error deleting recipe');
        }
    };

    const handleCollectionsCountChange = (newCount) => {
        if (typeof newCount === 'number' && newCount >= 0) {
            setCollectionsCount(newCount);
        }
    };

    const handleRecipeSaveStateChange = (recipeId, isSaved) => {
        console.log('📊 Recipe save state changed:', recipeId, isSaved);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLoadMore = () => {
        setCurrentPage(prev => prev + 1);
    };

    // Voice Search Functions (keeping all existing voice search functionality)
    const handleVoiceSearchResult = async (transcript, confidence) => {
        console.log('🎤 Voice search received:', transcript, 'Confidence:', confidence);
        setVoiceSearchResults(transcript);
        setProcessingVoiceSearch(true);

        try {
            const parsedCriteria = parseVoiceSearchCriteria(transcript);

            setSearchFilters(prev => ({
                ...prev,
                ...parsedCriteria
            }));

            if (parsedCriteria.searchTarget) {
                setActiveTab(parsedCriteria.searchTarget);
            }

            setShowVoiceSearch(false);
            setVoiceSearchResults('');

            const searchType = parsedCriteria.query ? 'search' : 'filter';
            alert(`✅ Applied voice ${searchType}: "${transcript}"`);

        } catch (error) {
            console.error('Error processing voice search:', error);
            alert('❌ Error processing voice search. Please try again.');
        } finally {
            setProcessingVoiceSearch(false);
        }
    };

    const handleVoiceSearchError = (error) => {
        console.error('🎤 Voice search error:', error);
        setProcessingVoiceSearch(false);

        let userMessage = 'Voice search failed. ';
        if (error.includes('not-allowed') || error.includes('denied')) {
            userMessage += 'Please allow microphone access in your browser settings.';
        } else if (error.includes('network')) {
            userMessage += 'Voice recognition requires an internet connection.';
        } else {
            userMessage += 'Please try again.';
        }

        alert(`🎤 ${userMessage}`);
    };

    const parseVoiceSearchCriteria = (transcript) => {
        if (!transcript || transcript.trim().length === 0) return {};

        const cleanTranscript = transcript.toLowerCase().trim();
        let criteria = {};

        const searchMatch = cleanTranscript.match(/(?:search for|find|look for|show me)\s+(.+?)(?:\s+(?:recipes?|that|with|under|in|for)|\s*$)/);
        if (searchMatch) {
            criteria.query = searchMatch[1].trim();
        } else if (!cleanTranscript.includes('show me') && !cleanTranscript.includes('filter')) {
            criteria.query = cleanTranscript;
        }

        const timeMatch = cleanTranscript.match(/(?:under|less than|within)\s+(\d+)\s*(?:minutes?|mins?)/);
        if (timeMatch) {
            criteria.maxCookTime = parseInt(timeMatch[1]);
        }

        if (cleanTranscript.includes('easy') || cleanTranscript.includes('simple') || cleanTranscript.includes('beginner')) {
            criteria.difficulty = 'easy';
        } else if (cleanTranscript.includes('medium') || cleanTranscript.includes('intermediate')) {
            criteria.difficulty = 'medium';
        } else if (cleanTranscript.includes('hard') || cleanTranscript.includes('difficult') || cleanTranscript.includes('advanced')) {
            criteria.difficulty = 'hard';
        }

        const dietaryTags = [];
        if (cleanTranscript.includes('vegetarian')) dietaryTags.push('vegetarian');
        if (cleanTranscript.includes('vegan')) dietaryTags.push('vegan');
        if (cleanTranscript.includes('gluten free') || cleanTranscript.includes('gluten-free')) dietaryTags.push('gluten-free');
        if (cleanTranscript.includes('healthy')) dietaryTags.push('healthy');
        if (cleanTranscript.includes('low carb') || cleanTranscript.includes('keto')) dietaryTags.push('low-carb');

        if (dietaryTags.length > 0) {
            criteria.tags = dietaryTags;
        }

        const categoryKeywords = {
            'breakfast': 'breakfast',
            'lunch': 'entrees',
            'dinner': 'entrees',
            'dessert': 'desserts',
            'desserts': 'desserts',
            'soup': 'soups',
            'soups': 'soups',
            'salad': 'side-dishes',
            'appetizer': 'appetizers',
            'appetizers': 'appetizers',
            'drinks': 'beverages',
            'beverages': 'beverages'
        };

        for (const [keyword, category] of Object.entries(categoryKeywords)) {
            if (cleanTranscript.includes(keyword)) {
                criteria.category = category;
                break;
            }
        }

        if (cleanTranscript.includes('popular') || cleanTranscript.includes('trending')) {
            criteria.sortBy = 'popular';
        } else if (cleanTranscript.includes('highest rated') || cleanTranscript.includes('best rated')) {
            criteria.sortBy = 'rating';
        } else if (cleanTranscript.includes('newest') || cleanTranscript.includes('recent')) {
            criteria.sortBy = 'newest';
        } else if (cleanTranscript.includes('quick') || cleanTranscript.includes('fast')) {
            criteria.sortBy = 'quickest';
        }

        if (cleanTranscript.includes('my recipes') || cleanTranscript.includes('my recipe')) {
            criteria.searchTarget = 'my-recipes';
        } else if (cleanTranscript.includes('public') || cleanTranscript.includes('community')) {
            criteria.searchTarget = 'public-recipes';
        } else if (criteria.query || Object.keys(criteria).length > 0) {
            criteria.searchTarget = 'public-recipes';
        }

        console.log('🎤 Parsed voice criteria:', criteria);
        return criteria;
    };

    // ... (keeping all your existing helper functions - getTabCounts, getUsageInfo, etc.)

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

    const getUsageInfo = (tabType) => {
        if (!subscription || subscription.loading) {
            return { current: 0, limit: '...', isUnlimited: false, tier: 'free' };
        }

        const tier = session?.user?.subscriptionTier || session?.user?.effectiveTier || 'free';
        const counts = getTabCounts();

        switch (tabType) {
            case 'my-recipes':
                return {
                    current: counts.myRecipes || 0,
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
                return { current: 0, limit: 'N/A', isUnlimited: false, tier };
        }
    };

    const formatCountWithLimit = (tabType) => {
        if (subscription.loading) return '...';
        if (tabType !== 'collections' && loadingCounts) return '...';

        const usage = getUsageInfo(tabType);
        const count = getTabCounts()[tabType] || usage.current;

        if (usage.isUnlimited || usage.tier === 'admin') {
            return `${count}`;
        }

        return `${count}/${usage.limit}`;
    };

    const getCountColor = (tabType, isActive) => {
        if (subscription.loading || (tabType !== 'collections' && loadingCounts)) {
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

    const canEditRecipe = (recipe) => {
        return recipe && (recipe.createdBy?._id === session?.user?.id || recipe.createdBy === session?.user?.id);
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

    // Loading state
    if (status === 'loading' || loading) {
        return (
            <MobileOptimizedLayout>
                <RecipesLoadingModal
                    isOpen={true}
                    activeTab="discovery"
                    myRecipesCount={0}
                    publicRecipesCount={0}
                    savedRecipesCount={0}
                    collectionsCount={0}
                    loadingMessage="Loading recipe discovery... This may take a moment."
                />
            </MobileOptimizedLayout>
        );
    }

    const { recipes: displayedRecipes, totalRecipes, totalPages } = getDisplayedRecipes();
    const tabCounts = getTabCounts();

    return (
        <MobileOptimizedLayout>
            <RecipesLoadingModal
                isOpen={showLoadingModal}
                activeTab={activeTab}
                myRecipesCount={tabCounts.myRecipes || 0}
                publicRecipesCount={tabCounts.publicRecipes || 0}
                savedRecipesCount={0}
                collectionsCount={tabCounts.collections || 0}
            />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Error Messages */}
                {recipesError && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <div className="text-red-500 mr-3 mt-0.5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-red-800">Unable to Load Recipes</h3>
                                <div className="text-sm text-red-700 mt-1">
                                    <p><strong>Error:</strong> {recipesError}</p>
                                    <button onClick={fetchRecipes} className="mt-2 text-red-600 hover:text-red-800 underline text-xs">
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Recipe Discovery</h1>
                        <p className="text-gray-600 mt-1">Discover, search, and organize your recipes</p>
                    </div>

                    {/* View Mode Toggle with Voice Search */}
                    <div className="flex items-center space-x-2">
                        <TouchEnhancedButton
                            onClick={() => setShowVoiceSearch(true)}
                            className="px-3 py-2 rounded-md text-sm font-medium transition-colors bg-purple-600 text-white hover:bg-purple-700"
                            title="Voice Search"
                        >
                            🎤 Voice
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                showAdvancedSearch ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                            }`}
                        >
                            🔍 Advanced Search
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Enhanced Mobile-Responsive Tab Navigation */}
                <div className="mb-6">
                    <div className="bg-gray-100 p-1 rounded-lg overflow-hidden">
                        {/* Mobile: 2x2 Grid - Compact */}
                        <div className="grid grid-cols-2 gap-1 md:hidden">
                            <TouchEnhancedButton
                                onClick={() => setActiveTab('discovery')}
                                className={`py-2 px-1 rounded-md text-center font-medium transition-all ${
                                    activeTab === 'discovery'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center min-h-[60px]">
                                    <span className="text-xs mb-1">🎯 Discovery</span>
                                    <span className="text-xs opacity-75">Browse</span>
                                </div>
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => setActiveTab('my-recipes')}
                                className={`py-2 px-1 rounded-md text-center font-medium transition-all ${
                                    activeTab === 'my-recipes'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center min-h-[60px]">
                                    <span className="text-xs mb-1">📝 My Recipes</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${getCountColor('my-recipes', activeTab === 'my-recipes')}`}>
                                        {formatCountWithLimit('my-recipes')}
                                    </span>
                                </div>
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => setActiveTab('public-recipes')}
                                className={`py-2 px-1 rounded-md text-center font-medium transition-all ${
                                    activeTab === 'public-recipes'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center min-h-[60px]">
                                    <span className="text-xs mb-1">🌍 Public</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
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
                                className={`py-2 px-1 rounded-md text-center font-medium transition-all ${
                                    activeTab === 'collections'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center min-h-[60px]">
                                    <span className="text-xs mb-1">📁 Collections</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${getCountColor('collections', activeTab === 'collections')}`}>
                                        {formatCountWithLimit('collections')}
                                    </span>
                                </div>
                            </TouchEnhancedButton>
                        </div>

                        {/* Desktop: Horizontal Flex (hidden on mobile) */}
                        <div className="hidden md:flex">
                            <TouchEnhancedButton
                                onClick={() => setActiveTab('discovery')}
                                className={`flex-1 py-3 px-4 rounded-md text-center font-medium transition-all ${
                                    activeTab === 'discovery'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center">
                                    <span>🎯 Discovery</span>
                                    <span className="text-xs opacity-75">Collections & Search</span>
                                </div>
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => setActiveTab('my-recipes')}
                                className={`flex-1 py-3 px-4 rounded-md text-center font-medium transition-all ${
                                    activeTab === 'my-recipes'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center">
                                    <span>📝 My Recipes</span>
                                    <span className={`text-xs px-2 py-1 rounded-full mt-1 ${getCountColor('my-recipes', activeTab === 'my-recipes')}`}>
                                        {formatCountWithLimit('my-recipes')}
                                    </span>
                                </div>
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => setActiveTab('public-recipes')}
                                className={`flex-1 py-3 px-4 rounded-md text-center font-medium transition-all ${
                                    activeTab === 'public-recipes'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center">
                                    <span>🌍 Public Recipes</span>
                                    <span className={`text-xs px-2 py-1 rounded-full mt-1 ${
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
                                className={`flex-1 py-3 px-4 rounded-md text-center font-medium transition-all ${
                                    activeTab === 'collections'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center">
                                    <span>📁 Collections</span>
                                    <span className={`text-xs px-2 py-1 rounded-full mt-1 ${getCountColor('collections', activeTab === 'collections')}`}>
                                        {formatCountWithLimit('collections')}
                                    </span>
                                </div>
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>

                {/* Advanced Search Filters */}
                {showAdvancedSearch && activeTab !== 'collections' && (
                    <div className="mb-6">
                        <AdvancedRecipeFilters
                            onFiltersChange={setSearchFilters}
                            initialFilters={searchFilters}
                            availableTags={allTags}
                            availableCategories={allCategories}
                        />
                    </div>
                )}

                {/* Tab Content */}
                {activeTab === 'discovery' ? (
                    <>
                        {/* Mobile-Optimized Recipe Discovery Dashboard */}
                        <div className="space-y-6">
                            <RecipeDiscoveryDashboard
                                recipes={recipes.filter(recipe => recipe.isPublic === true)}
                                showCollections={true}
                                isMobile={typeof window !== 'undefined' && window.innerWidth < 768}
                                compactMode={true}
                            />

                            {/* Quick Search - Mobile Optimized */}
                            {!showAdvancedSearch && (
                                <div className="mt-6 mb-6">
                                    <div className="w-full">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <KeyboardOptimizedInput
                                                type="text"
                                                value={searchFilters.query}
                                                onChange={(e) => setSearchFilters(prev => ({ ...prev, query: e.target.value }))}
                                                placeholder="Search 650+ recipes..."
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                                                style={{ fontSize: '16px' }}
                                            />
                                        </div>
                                        <div className="mt-2 text-center">
                                            <TouchEnhancedButton
                                                onClick={() => setShowAdvancedSearch(true)}
                                                className="text-indigo-600 hover:text-indigo-700 text-sm"
                                            >
                                                🔍 Advanced search options →
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Fixed Mobile-Friendly Quick Categories */}
                            <div className="bg-white rounded-lg border p-4 w-full overflow-hidden">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">🚀 Quick Browse</h3>
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    {[
                                        { label: 'Quick Meals', icon: '⚡', filter: { maxCookTime: '30' } },
                                        { label: 'Vegetarian', icon: '🥗', filter: { tags: ['vegetarian'] } },
                                        { label: 'Desserts', icon: '🍰', filter: { category: 'desserts' } },
                                        { label: 'Easy', icon: '👌', filter: { difficulty: 'easy' } },
                                        { label: 'Popular', icon: '⭐', filter: { sortBy: 'rating' } },
                                        { label: 'Recent', icon: '🆕', filter: { sortBy: 'newest' } }
                                    ].map((category, index) => (
                                        <TouchEnhancedButton
                                            key={index}
                                            onClick={() => {
                                                setSearchFilters(prev => ({ ...prev, ...category.filter }));
                                                setActiveTab('public-recipes');
                                            }}
                                            className="flex items-center justify-center space-x-1 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm w-full min-w-0"
                                        >
                                            <span className="text-base flex-shrink-0">{category.icon}</span>
                                            <span className="truncate text-xs sm:text-sm">{category.label}</span>
                                        </TouchEnhancedButton>
                                    ))}
                                </div>
                            </div>

                            {/* Mobile Stats Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {recipes.filter(r => r.isPublic).length}
                                    </div>
                                    <div className="text-sm text-blue-700">Public Recipes</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {collectionsCount}
                                    </div>
                                    <div className="text-sm text-green-700">Collections</div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : activeTab === 'collections' ? (
                    <RecipeCollections onCountChange={handleCollectionsCountChange} />
                ) : (
                    <>
                        {/* Recipe List Content */}
                        {/* Add New Recipe Button for My Recipes */}
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
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-medium text-red-800">Recipe Limit Reached</h3>
                                                    <p className="text-sm text-red-700 mt-1">
                                                        You've reached your {getUsageInfo('my-recipes').tier} plan limit of {getUsageInfo('my-recipes').limit} recipes.
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

                        {/* Results Info and Pagination Controls */}
                        <div className="flex justify-between items-center mb-6">
                            <p className="text-gray-600">
                                {totalRecipes.toLocaleString()} recipe{totalRecipes !== 1 ? 's' : ''}
                                {(searchFilters.query || Object.values(searchFilters).some(v =>
                                    Array.isArray(v) ? v.length > 0 : v && v !== 'relevance'
                                )) && ' found'}
                            </p>

                            {/* Items per page selector */}
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <label className="text-sm text-gray-600">Show:</label>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(parseInt(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <label className="text-sm text-gray-600">Mode:</label>
                                    <select
                                        value={paginationMode}
                                        onChange={(e) => {
                                            setPaginationMode(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                                    >
                                        <option value="traditional">Pages</option>
                                        <option value="loadMore">Load More</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* UPDATED: Recipe Grid with Images */}
                        {displayedRecipes.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {displayedRecipes.map((recipe, index) => {
                                        if (!recipe) return null;

                                        return (
                                            <div key={recipe._id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                                                {/* Recipe Image */}
                                                <div className="relative h-32 bg-gray-100">
                                                    <RecipeImage
                                                        recipe={recipe}
                                                        className="rounded-t-lg"
                                                        priority={index < 6} // Prioritize first 6 images
                                                    />

                                                    {/* Overlay Actions - FIXED positioning to avoid title overlap */}
                                                    <div className="absolute top-1 right-1 flex space-x-1">
                                                        {activeTab === 'public-recipes' && (
                                                            <TouchEnhancedButton
                                                                onClick={() => {
                                                                    // Trigger the SaveRecipeButton functionality directly
                                                                    const saveButton = document.querySelector(`[data-recipe-id="${recipe._id}"] .save-recipe-button`);
                                                                    if (saveButton) saveButton.click();
                                                                }}
                                                                className="bg-green-500 bg-opacity-95 rounded-full p-2 shadow-lg text-white hover:bg-green-600 hover:bg-opacity-100 transition-all duration-200 flex items-center justify-center w-8 h-8"
                                                                title="Save to Collection"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                                                </svg>
                                                            </TouchEnhancedButton>
                                                        )}

                                                        {canEditRecipe(recipe) && (
                                                            <>
                                                                <TouchEnhancedButton
                                                                    onClick={async () => window.location.href = await getRecipeUrl(`${recipe._id}/edit`)}
                                                                    className="bg-blue-500 bg-opacity-95 rounded-full p-2 shadow-lg text-white hover:bg-blue-600 hover:bg-opacity-100 transition-all duration-200 flex items-center justify-center w-8 h-8"
                                                                    title="Edit recipe"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                                    </svg>
                                                                </TouchEnhancedButton>
                                                                <TouchEnhancedButton
                                                                    onClick={() => handleDelete(recipe._id)}
                                                                    className="bg-red-500 bg-opacity-95 rounded-full p-2 shadow-lg text-white hover:bg-red-600 hover:bg-opacity-100 transition-all duration-200 flex items-center justify-center w-8 h-8"
                                                                    title="Delete recipe"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                                    </svg>
                                                                </TouchEnhancedButton>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Hidden SaveRecipeButton for functionality */}
                                                    {activeTab === 'public-recipes' && (
                                                        <div className="hidden" data-recipe-id={recipe._id}>
                                                            <SaveRecipeButton
                                                                recipeId={recipe._id}
                                                                recipeName={recipe.title || 'Recipe'}
                                                                size="small"
                                                                showText={false}
                                                                iconOnly={true}
                                                                onSaveStateChange={handleRecipeSaveStateChange}
                                                                className="save-recipe-button"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Quick Info Overlay */}
                                                    <div className="absolute bottom-2 left-2 right-2">
                                                        <div className="bg-black bg-opacity-50 rounded-md px-2 py-1 text-white text-xs flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="flex items-center space-x-2">
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
                                                                <span className="bg-white bg-opacity-20 px-1 py-0.5 rounded text-xs">
                                                                    {recipe.difficulty}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4">
                                                    {/* Header - Title */}
                                                    <div className="mb-3">
                                                        <RecipeNavigationLink
                                                            recipeId={recipe._id}
                                                            className="pyt-8 text-base font-semibold text-gray-900 hover:text-indigo-600 line-clamp-2 block group-hover:text-indigo-600 transition-colors"
                                                        >
                                                            {recipe.title || 'Untitled Recipe'}
                                                        </RecipeNavigationLink>
                                                    </div>

                                                    {/* Recipe Author Info (for public recipes) */}
                                                    {activeTab === 'public-recipes' && recipe.createdBy && (
                                                        <div className="mb-3">
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
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
                                                            {/*{recipe.metrics?.viewCount > 0 && (*/}
                                                            {/*    <span>{recipe.metrics.viewCount} view{recipe.metrics.viewCount !== 1 ? 's' : ''}</span>*/}
                                                            {/*)}*/}
                                                        </div>
                                                    </div>

                                                    {/* Description */}
                                                    {recipe.description && (
                                                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                                            {recipe.description}
                                                        </p>
                                                    )}

                                                    {/* Tags */}
                                                    {Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mb-2">
                                                            {recipe.tags.slice(0, 3).map((tag, tagIndex) => (
                                                                <span
                                                                    key={tagIndex}
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
                                                        <div>
                                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                                                                {CATEGORY_OPTIONS.find(opt => opt.value === recipe.category)?.label || recipe.category}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Enhanced Pagination */}
                                <div className="mt-8">
                                    <EnhancedPagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={totalRecipes}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={handlePageChange}
                                        onLoadMore={paginationMode === 'loadMore' ? handleLoadMore : null}
                                        showLoadMore={paginationMode === 'loadMore'}
                                        loading={loading}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-gray-500 mb-4">
                                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {searchFilters.query || Object.values(searchFilters).some(v =>
                                        Array.isArray(v) ? v.length > 0 : v && v !== 'relevance'
                                    ) ? 'No recipes found' : 'No recipes yet'}
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    {searchFilters.query || Object.values(searchFilters).some(v =>
                                        Array.isArray(v) ? v.length > 0 : v && v !== 'relevance'
                                    ) ? (
                                        'Try adjusting your search criteria or clearing some filters.'
                                    ) : activeTab === 'my-recipes' ? (
                                        'Start building your recipe collection by adding your first recipe!'
                                    ) : (
                                        'Public recipes will appear here when they become available.'
                                    )}
                                </p>

                                {/* Clear filters button */}
                                {(searchFilters.query || Object.values(searchFilters).some(v =>
                                    Array.isArray(v) ? v.length > 0 : v && v !== 'relevance'
                                )) && (
                                    <TouchEnhancedButton
                                        onClick={() => setSearchFilters({
                                            query: '',
                                            category: '',
                                            tags: [],
                                            difficulty: '',
                                            maxCookTime: '',
                                            maxPrepTime: '',
                                            servings: '',
                                            minRating: '',
                                            includeIngredients: [],
                                            excludeIngredients: [],
                                            dietaryRestrictions: [],
                                            nutrition: {},
                                            sortBy: 'relevance'
                                        })}
                                        className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors mb-4"
                                    >
                                        Clear All Filters
                                    </TouchEnhancedButton>
                                )}

                                {/* Action buttons based on tab */}
                                {activeTab === 'my-recipes' && !searchFilters.query && (
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

                                {activeTab === 'public-recipes' && !searchFilters.query && (
                                    <TouchEnhancedButton
                                        onClick={() => setActiveTab('discovery')}
                                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        Try the Discovery tab for better recipe browsing
                                    </TouchEnhancedButton>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Voice Search Modal */}
                {showVoiceSearch && (
                    <div style={{
                        position: 'fixed',
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1300,
                        padding: '1rem'
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            maxWidth: '500px',
                            width: '100%',
                            maxHeight: '80vh',
                            overflow: 'auto'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1.5rem'
                            }}>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '1.25rem',
                                    fontWeight: '600',
                                    color: '#111827'
                                }}>
                                    🎤 Voice Recipe Search
                                </h3>
                                <TouchEnhancedButton
                                    onClick={() => setShowVoiceSearch(false)}
                                    disabled={processingVoiceSearch}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '1.5rem',
                                        color: '#6b7280',
                                        cursor: processingVoiceSearch ? 'not-allowed' : 'pointer',
                                        opacity: processingVoiceSearch ? 0.6 : 1
                                    }}
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>

                            {/* Instructions */}
                            <div style={{
                                marginBottom: '1.5rem',
                                padding: '1rem',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '8px',
                                border: '1px solid #0ea5e9'
                            }}>
                                <h4 style={{
                                    margin: '0 0 0.5rem 0',
                                    fontSize: '1rem',
                                    fontWeight: '500',
                                    color: '#0c4a6e'
                                }}>
                                    💡 Voice Search Examples
                                </h4>
                                <ul style={{
                                    margin: 0,
                                    paddingLeft: '1.25rem',
                                    fontSize: '0.875rem',
                                    color: '#0369a1',
                                    lineHeight: '1.4'
                                }}>
                                    <li>"Find chicken recipes under 30 minutes"</li>
                                    <li>"Show me easy vegetarian meals"</li>
                                    <li>"Search for popular desserts"</li>
                                    <li>"Find healthy breakfast recipes"</li>
                                    <li>"Show me my pasta recipes"</li>
                                    <li>"Find quick dinner ideas"</li>
                                </ul>
                            </div>

                            {/* Voice Input Component */}
                            <div style={{
                                marginBottom: '1.5rem'
                            }}>
                                <VoiceInput
                                    onResult={handleVoiceSearchResult}
                                    onError={handleVoiceSearchError}
                                    placeholder="Say what you want to find: 'chicken recipes under 30 minutes'..."
                                />
                            </div>

                            {/* Processing Status */}
                            {processingVoiceSearch && (
                                <div style={{
                                    marginBottom: '1.5rem',
                                    padding: '1rem',
                                    backgroundColor: '#fef3c7',
                                    borderRadius: '8px',
                                    border: '1px solid #f59e0b',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '1rem',
                                        fontWeight: '500',
                                        color: '#92400e',
                                        marginBottom: '0.5rem'
                                    }}>
                                        🤖 Processing voice search...
                                    </div>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: '#d97706'
                                    }}>
                                        Understanding your search criteria
                                    </div>
                                </div>
                            )}

                            {/* Recent Voice Results */}
                            {voiceSearchResults && !processingVoiceSearch && (
                                <div style={{
                                    marginBottom: '1.5rem',
                                    padding: '1rem',
                                    backgroundColor: '#f0fdf4',
                                    borderRadius: '8px',
                                    border: '1px solid #16a34a'
                                }}>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        color: '#14532d',
                                        marginBottom: '0.5rem'
                                    }}>
                                        Last voice search:
                                    </div>
                                    <div style={{
                                        fontSize: '1rem',
                                        color: '#166534',
                                        fontStyle: 'italic'
                                    }}>
                                        "{voiceSearchResults}"
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '0.75rem'
                            }}>
                                <TouchEnhancedButton
                                    onClick={() => setShowVoiceSearch(false)}
                                    disabled={processingVoiceSearch}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        backgroundColor: '#f3f4f6',
                                        color: '#374151',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        cursor: processingVoiceSearch ? 'not-allowed' : 'pointer',
                                        opacity: processingVoiceSearch ? 0.6 : 1
                                    }}
                                >
                                    Close
                                </TouchEnhancedButton>

                                <TouchEnhancedButton
                                    onClick={() => {
                                        setVoiceSearchResults('');
                                    }}
                                    disabled={processingVoiceSearch || !voiceSearchResults}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        backgroundColor: voiceSearchResults && !processingVoiceSearch ? '#3b82f6' : '#9ca3af',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        cursor: (processingVoiceSearch || !voiceSearchResults) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Clear & Try Again
                                </TouchEnhancedButton>
                            </div>

                            {/* Voice Search Tips */}
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                backgroundColor: '#eff6ff',
                                borderRadius: '6px',
                                border: '1px solid #bfdbfe'
                            }}>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#1e40af',
                                    fontWeight: '500',
                                    marginBottom: '0.25rem'
                                }}>
                                    💡 Voice Search Tips:
                                </div>
                                <ul style={{
                                    fontSize: '0.75rem',
                                    color: '#1e40af',
                                    marginLeft: '1rem',
                                    lineHeight: '1.4',
                                    margin: '0 0 0 1rem'
                                }}>
                                    <li>Be specific: "chicken pasta" vs just "pasta"</li>
                                    <li>Include time: "under 30 minutes", "quick"</li>
                                    <li>Mention diet: "vegetarian", "gluten free"</li>
                                    <li>Use natural language like you're talking to a friend</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

            </div>
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