// file: /src/hooks/useSavedRecipes.js v1 - Global saved recipes management

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { apiGet } from '@/lib/api-config';

// Global state to prevent duplicate API calls
let globalSavedRecipes = null;
let globalCacheTimestamp = null;
let globalOngoingRequest = null;
const CACHE_DURATION = 30000; // 30 seconds
const subscribers = new Set();

// Custom hook for managing saved recipes globally
export function useSavedRecipes() {
    const { data: session } = useSafeSession();
    const [savedRecipes, setSavedRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const mountedRef = useRef(true);
    const subscriberIdRef = useRef(`subscriber-${Date.now()}-${Math.random()}`);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            subscribers.delete(subscriberIdRef.current);
        };
    }, []);

    // Subscribe to global updates
    useEffect(() => {
        const subscriberId = subscriberIdRef.current;
        subscribers.add(subscriberId);

        // If we have cached data, use it immediately
        if (isCacheValid() && globalSavedRecipes !== null) {
            setSavedRecipes(globalSavedRecipes);
        }

        return () => {
            subscribers.delete(subscriberId);
        };
    }, []);

    // Check if cache is valid
    const isCacheValid = useCallback(() => {
        return globalSavedRecipes !== null &&
            globalCacheTimestamp !== null &&
            (Date.now() - globalCacheTimestamp) < CACHE_DURATION;
    }, []);

    // Notify all subscribers of updates
    const notifySubscribers = useCallback((newSavedRecipes) => {
        subscribers.forEach(subscriberId => {
            // We can't directly call setState from here, so we'll use a custom event
            window.dispatchEvent(new CustomEvent('savedRecipesUpdated', {
                detail: { savedRecipes: newSavedRecipes }
            }));
        });
    }, []);

    // Listen for global updates
    useEffect(() => {
        const handleGlobalUpdate = (event) => {
            if (mountedRef.current) {
                setSavedRecipes(event.detail.savedRecipes);
            }
        };

        window.addEventListener('savedRecipesUpdated', handleGlobalUpdate);
        return () => window.removeEventListener('savedRecipesUpdated', handleGlobalUpdate);
    }, []);

    // Fetch saved recipes from API
    const fetchSavedRecipes = useCallback(async (forceRefresh = false) => {
        if (!session?.user?.id) return [];

        // Use cache if valid and not forcing refresh
        if (!forceRefresh && isCacheValid()) {
            console.log('🎯 useSavedRecipes - Using cached data');
            setSavedRecipes(globalSavedRecipes);
            return globalSavedRecipes;
        }

        // If there's already an ongoing request, wait for it
        if (globalOngoingRequest) {
            console.log('⏳ useSavedRecipes - Waiting for ongoing request');
            try {
                const result = await globalOngoingRequest;
                if (mountedRef.current) {
                    setSavedRecipes(result);
                }
                return result;
            } catch (error) {
                console.warn('⚠️ useSavedRecipes - Ongoing request failed:', error);
                throw error;
            }
        }

        // Make a new request
        console.log('🔄 useSavedRecipes - Fetching saved recipes from API');
        setLoading(true);
        setError(null);

        globalOngoingRequest = (async () => {
            try {
                const response = await apiGet('/api/saved-recipes', null, {
                    headers: {
                        'Cache-Control': 'no-cache',
                    },
                });

                if (!response.ok) {
                    if (response.status >= 500) {
                        console.warn('🚨 useSavedRecipes - Server error, using fallback');
                        globalSavedRecipes = [];
                        globalCacheTimestamp = Date.now();
                        return [];
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.success && Array.isArray(data.savedRecipes)) {
                    const savedRecipeIds = data.savedRecipes
                        .map(saved => saved.recipeId?._id || saved.recipeId)
                        .filter(id => id);

                    globalSavedRecipes = savedRecipeIds;
                    globalCacheTimestamp = Date.now();

                    console.log(`✅ useSavedRecipes - Cached ${savedRecipeIds.length} saved recipes`);

                    // Notify all subscribers
                    notifySubscribers(savedRecipeIds);

                    return savedRecipeIds;
                } else if (data.warning) {
                    console.warn('⚠️ useSavedRecipes - API returned warning:', data.warning);
                    globalSavedRecipes = [];
                    globalCacheTimestamp = Date.now();
                    notifySubscribers([]);
                    return [];
                } else {
                    throw new Error('Unexpected API response format');
                }
            } catch (error) {
                console.warn('⚠️ useSavedRecipes - Error fetching saved recipes:', error.message);
                setError(error.message);
                globalSavedRecipes = [];
                globalCacheTimestamp = Date.now();
                notifySubscribers([]);
                throw error;
            } finally {
                globalOngoingRequest = null;
                if (mountedRef.current) {
                    setLoading(false);
                }
            }
        })();

        return await globalOngoingRequest;
    }, [session?.user?.id, isCacheValid, notifySubscribers]);

    // Check if a specific recipe is saved
    const isRecipeSaved = useCallback((recipeId) => {
        return savedRecipes.includes(recipeId);
    }, [savedRecipes]);

    // Add recipe to saved list (optimistic update)
    const addToSaved = useCallback((recipeId) => {
        const newSavedRecipes = [...savedRecipes, recipeId];
        globalSavedRecipes = newSavedRecipes;
        globalCacheTimestamp = Date.now();
        setSavedRecipes(newSavedRecipes);
        notifySubscribers(newSavedRecipes);
    }, [savedRecipes, notifySubscribers]);

    // Remove recipe from saved list (optimistic update)
    const removeFromSaved = useCallback((recipeId) => {
        const newSavedRecipes = savedRecipes.filter(id => id !== recipeId);
        globalSavedRecipes = newSavedRecipes;
        globalCacheTimestamp = Date.now();
        setSavedRecipes(newSavedRecipes);
        notifySubscribers(newSavedRecipes);
    }, [savedRecipes, notifySubscribers]);

    // Invalidate cache
    const invalidateCache = useCallback(() => {
        globalSavedRecipes = null;
        globalCacheTimestamp = null;
        globalOngoingRequest = null;
        console.log('🗑️ useSavedRecipes - Cache invalidated');
    }, []);

    // Initialize on mount
    useEffect(() => {
        if (session?.user?.id) {
            fetchSavedRecipes().catch(error => {
                console.warn('Failed to fetch saved recipes on mount:', error);
            });
        }
    }, [session?.user?.id, fetchSavedRecipes]);

    return {
        savedRecipes,
        loading,
        error,
        fetchSavedRecipes,
        isRecipeSaved,
        addToSaved,
        removeFromSaved,
        invalidateCache,
        totalCount: savedRecipes.length
    };
}