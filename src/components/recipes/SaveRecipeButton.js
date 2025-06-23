'use client';
// file: /src/components/recipes/SaveRecipeButton.js v4 - FIXED excessive API calls with caching and debouncing

import {useState, useEffect, useRef} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import FeatureGate from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import {getApiUrl} from '@/lib/api-config';

// Global cache for saved recipes to prevent multiple API calls
let savedRecipesCache = null;
let cacheTimestamp = null;
let ongoingRequest = null;
const CACHE_DURATION = 30000; // 30 seconds
const pendingComponents = new Set();

export default function SaveRecipeButton({
                                             recipeId,
                                             recipeName,
                                             initialSavedState = false,
                                             onSaveStateChange = null,
                                             className = '',
                                             showText = true,
                                             size = 'medium' // 'small', 'medium', 'large'
                                         }) {
    const {data: session} = useSafeSession();
    const [isSaved, setIsSaved] = useState(initialSavedState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [statusCheckFailed, setStatusCheckFailed] = useState(false);
    const mountedRef = useRef(true);
    const componentId = useRef(`save-btn-${Date.now()}-${Math.random()}`);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            pendingComponents.delete(componentId.current);
        };
    }, []);

    // Check if cache is valid
    const isCacheValid = () => {
        return savedRecipesCache !== null &&
            cacheTimestamp !== null &&
            (Date.now() - cacheTimestamp) < CACHE_DURATION;
    };

    // Get saved status from cache or API
    const getSavedRecipes = async () => {
        // If cache is valid, use it
        if (isCacheValid()) {
            console.log('🎯 SaveRecipeButton - Using cached saved recipes');
            return savedRecipesCache;
        }

        // If there's already an ongoing request, wait for it
        if (ongoingRequest) {
            console.log('⏳ SaveRecipeButton - Waiting for ongoing request');
            try {
                return await ongoingRequest;
            } catch (error) {
                console.warn('⚠️ SaveRecipeButton - Ongoing request failed:', error);
                throw error;
            }
        }

        // Make a new request
        console.log('🔄 SaveRecipeButton - Making new API request for saved recipes');

        ongoingRequest = (async () => {
            try {
                const response = await fetch(getApiUrl('/api/saved-recipes'), {
                    method: 'GET',
                    headers: {
                        'Cache-Control': 'no-cache',
                    },
                });

                if (!response.ok) {
                    // Handle server errors gracefully
                    if (response.status >= 500) {
                        console.warn('🚨 SaveRecipeButton - Server error, using fallback');
                        savedRecipesCache = [];
                        cacheTimestamp = Date.now();
                        return [];
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.success && Array.isArray(data.savedRecipes)) {
                    const savedRecipeIds = data.savedRecipes
                        .map(saved => saved.recipeId?._id || saved.recipeId)
                        .filter(id => id);

                    savedRecipesCache = savedRecipeIds;
                    cacheTimestamp = Date.now();
                    console.log(`✅ SaveRecipeButton - Cached ${savedRecipeIds.length} saved recipes`);
                    return savedRecipeIds;
                } else if (data.warning) {
                    console.warn('⚠️ SaveRecipeButton - API returned warning:', data.warning);
                    savedRecipesCache = [];
                    cacheTimestamp = Date.now();
                    return [];
                } else {
                    throw new Error('Unexpected API response format');
                }
            } catch (error) {
                console.warn('⚠️ SaveRecipeButton - Error fetching saved recipes:', error.message);
                // Set empty cache on error to prevent repeated failed requests
                savedRecipesCache = [];
                cacheTimestamp = Date.now();
                throw error;
            } finally {
                ongoingRequest = null;
            }
        })();

        return await ongoingRequest;
    };

    // Check saved status with caching and debouncing
    const checkSavedStatus = async () => {
        if (!session?.user?.id || !recipeId) return;

        // Add this component to pending set to prevent duplicate calls
        pendingComponents.add(componentId.current);

        try {
            console.log('🔍 SaveRecipeButton - Checking saved status for recipe:', recipeId);
            setStatusCheckFailed(false);

            const savedRecipeIds = await getSavedRecipes();

            if (!mountedRef.current) return; // Component unmounted

            const isCurrentlySaved = savedRecipeIds.includes(recipeId);
            setIsSaved(isCurrentlySaved);

            console.log('✅ SaveRecipeButton - Status check complete. Recipe saved:', isCurrentlySaved);
        } catch (error) {
            if (!mountedRef.current) return; // Component unmounted

            console.warn('⚠️ SaveRecipeButton - Status check failed:', error.message);
            setStatusCheckFailed(true);
            // Don't show error to user for status check failures
        } finally {
            pendingComponents.delete(componentId.current);
        }
    };

    // Invalidate cache when save/unsave operations complete
    const invalidateCache = () => {
        savedRecipesCache = null;
        cacheTimestamp = null;
        ongoingRequest = null;
        console.log('🗑️ SaveRecipeButton - Cache invalidated');
    };

    // Check saved status on mount with debouncing
    useEffect(() => {
        if (session?.user?.id && recipeId) {
            // Small delay to allow multiple components to mount before making API call
            const timeoutId = setTimeout(() => {
                checkSavedStatus();
            }, 100);

            return () => clearTimeout(timeoutId);
        }
    }, [session?.user?.id, recipeId]);

    const handleSaveToggle = async () => {
        if (!session?.user?.id) {
            alert('Please sign in to save recipes');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (isSaved) {
                // Unsave recipe
                const response = await fetch(getApiUrl(`/api/saved-recipes?recipeId=${recipeId}`), {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    if (response.status >= 500) {
                        throw new Error('Server temporarily unavailable. Please try again later.');
                    }
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                }

                const data = await response.json();

                if (data.success) {
                    setIsSaved(false);
                    setSuccess('Recipe removed from saved recipes');
                    invalidateCache(); // Clear cache
                    if (onSaveStateChange) onSaveStateChange(recipeId, false);
                } else {
                    throw new Error(data.error || 'Failed to unsave recipe');
                }
            } else {
                // Save recipe
                const response = await fetch(getApiUrl('/api/saved-recipes'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({recipeId})
                });

                if (!response.ok) {
                    if (response.status >= 500) {
                        throw new Error('Server temporarily unavailable. Please try again later.');
                    }
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                }

                const data = await response.json();

                if (data.success) {
                    setIsSaved(true);
                    setSuccess(data.message || 'Recipe saved successfully');
                    invalidateCache(); // Clear cache
                    if (onSaveStateChange) onSaveStateChange(recipeId, true);
                } else {
                    if (data.code === 'USAGE_LIMIT_EXCEEDED') {
                        // Handle upgrade prompt
                        if (confirm(`${data.error}\n\nWould you like to upgrade now?`)) {
                            window.location.href = data.upgradeUrl || '/pricing';
                        }
                        return; // Don't show error message for upgrade prompts
                    } else {
                        throw new Error(data.error || 'Failed to save recipe');
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling save state:', error);

            // Provide more user-friendly error messages
            let userMessage = 'An error occurred';
            if (error.message.includes('Server temporarily unavailable')) {
                userMessage = error.message;
            } else if (error.message.includes('500')) {
                userMessage = 'Server temporarily unavailable. Please try again later.';
            } else if (error.message.includes('503')) {
                userMessage = 'Service temporarily unavailable. Please try again later.';
            } else if (error.message.includes('401')) {
                userMessage = 'Please sign in again to save recipes.';
            } else if (error.message.includes('403')) {
                userMessage = 'You have reached your saved recipe limit.';
            } else if (error.message.includes('404')) {
                userMessage = 'Recipe not found or no longer available.';
            } else if (error.message.includes('Network') || error.message.includes('fetch')) {
                userMessage = 'Network error. Please check your connection.';
            } else {
                userMessage = error.message || 'An error occurred';
            }

            setError(userMessage);
        } finally {
            setLoading(false);
        }
    };

    // Clear messages after delay
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess('');
                setError('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    const getSizeClasses = () => {
        switch (size) {
            case 'small':
                return 'px-2 py-1 text-sm';
            case 'large':
                return 'px-6 py-3 text-lg';
            default:
                return 'px-4 py-2';
        }
    };

    const getIconSize = () => {
        switch (size) {
            case 'small':
                return 'w-4 h-4';
            case 'large':
                return 'w-6 h-6';
            default:
                return 'w-5 h-5';
        }
    };

    return (
        <FeatureGate
            feature={FEATURE_GATES.SAVE_RECIPE}
            fallback={
                <TouchEnhancedButton
                    onClick={() => window.location.href = '/pricing?source=save-recipe'}
                    className={`bg-gradient-to-r from-blue-400 to-purple-500 text-white rounded-md font-medium hover:from-blue-500 hover:to-purple-600 flex items-center gap-2 ${getSizeClasses()} ${className}`}
                >
                    <svg className={getIconSize()} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                    </svg>
                    {showText && <span>Save Recipe (Gold)</span>}
                </TouchEnhancedButton>
            }
        >
            <div className="relative">
                <TouchEnhancedButton
                    onClick={handleSaveToggle}
                    disabled={loading}
                    className={`${
                        isSaved
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    } rounded-md font-medium transition-colors flex items-center gap-2 ${getSizeClasses()} ${className} ${
                        statusCheckFailed ? 'opacity-90' : ''
                    }`}
                    title={statusCheckFailed ? 'Save status could not be verified' : ''}
                >
                    {loading ? (
                        <div className={`animate-spin rounded-full border-b-2 ${
                            isSaved ? 'border-white' : 'border-gray-600'
                        } ${getIconSize()}`}></div>
                    ) : (
                        <svg
                            className={getIconSize()}
                            fill={isSaved ? "currentColor" : "none"}
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                        </svg>
                    )}
                    {showText && (
                        <span>
                            {loading ? 'Saving...' : isSaved ? 'Saved' : 'Save Recipe'}
                            {statusCheckFailed && !loading && (
                                <span className="text-xs opacity-75"> (?)</span>
                            )}
                        </span>
                    )}
                </TouchEnhancedButton>

                {/* Success/Error Messages */}
                {(success || error) && (
                    <div className={`absolute top-full left-0 mt-2 w-64 rounded-lg p-3 z-10 shadow-lg ${
                        success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                        <div className={`text-sm ${
                            success ? 'text-green-800' : 'text-red-800'
                        }`}>
                            {success ? `✓ ${success}` : `⚠️ ${error}`}
                        </div>
                    </div>
                )}

                {/* Status Check Failed Warning (only show if user hovers and check failed) */}
                {statusCheckFailed && !loading && !success && !error && (
                    <div className="absolute top-full left-0 mt-1 w-48 text-xs text-gray-500 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                        Save status could not be verified
                    </div>
                )}
            </div>
        </FeatureGate>
    );
}