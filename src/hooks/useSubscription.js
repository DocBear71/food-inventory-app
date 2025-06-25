'use client';

// file: /src/hooks/useSubscription.js v4 - FIXED to support SAVE_RECIPE and collections

import { useState, useEffect, useContext, createContext, useCallback, useRef } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import {
    SUBSCRIPTION_TIERS,
    FEATURE_GATES,
    checkFeatureAccess,
    checkUsageLimit,
    getUpgradeMessage,
    getRemainingUsage,
    getRequiredTier
} from '@/lib/subscription-config';

const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) {
    const { data: session, status } = useSafeSession();
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const fetchTimeoutRef = useRef(null);
    const lastFetchRef = useRef(0);

    // Debounced fetch function to prevent excessive API calls
    const fetchSubscriptionData = useCallback(async (force = false) => {
        // Check for signout flags before making API calls
        const preventCalls = localStorage.getItem('prevent-session-calls') === 'true';
        const signingOut = sessionStorage.getItem('signout-in-progress') === 'true';
        const justSignedOut = sessionStorage.getItem('just-signed-out') === 'true';

        if (preventCalls || signingOut || justSignedOut) {
            console.log('Subscription: Skipping data fetch - signout in progress');
            setSubscriptionData(null);
            setError(null);
            setLoading(false);
            setRetryCount(0);
            return;
        }

        // Prevent excessive calls - only allow one call per 5 seconds unless forced
        const now = Date.now();
        if (!force && (now - lastFetchRef.current) < 5000) {
            console.log('Subscription fetch throttled - too soon since last call');
            return;
        }

        // Clear any existing timeout
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        try {
            setLoading(true);
            setError(null);
            lastFetchRef.current = now;

            console.log('Fetching subscription data...');
            const response = await fetch('/api/subscription/status?' + new URLSearchParams({
                t: Date.now(), // Cache buster
                force: 'true'
            }), {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Subscription data fetched successfully:', data.tier);
                setSubscriptionData(data);
                setError(null);
                setRetryCount(0);
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
                console.error('Subscription API error:', errorMessage);

                // Don't set error state for auth issues - user might not be logged in
                if (response.status === 401) {
                    console.log('User not authenticated, clearing subscription data');
                    setSubscriptionData(null);
                    setError(null);

                    // If API fails with 401, might be because session is invalid - clear signout flags
                    localStorage.removeItem('prevent-session-calls');
                    sessionStorage.removeItem('signout-in-progress');
                    sessionStorage.removeItem('just-signed-out');
                } else {
                    setError(errorMessage);

                    // Exponential backoff retry for server errors
                    if (response.status >= 500 && retryCount < 3) {
                        const retryDelay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
                        console.log(`Retrying subscription fetch in ${retryDelay}ms (attempt ${retryCount + 1}/3)`);

                        fetchTimeoutRef.current = setTimeout(() => {
                            setRetryCount(prev => prev + 1);
                            fetchSubscriptionData(true);
                        }, retryDelay);
                    }
                }
            }
        } catch (err) {
            console.error('Network error fetching subscription data:', err);

            // Only set error for network issues if we have a session
            if (session?.user?.id) {
                setError('Network error while fetching subscription data');

                // Retry network errors with exponential backoff
                if (retryCount < 3) {
                    const retryDelay = Math.pow(2, retryCount) * 2000;
                    console.log(`Retrying subscription fetch in ${retryDelay}ms due to network error`);

                    fetchTimeoutRef.current = setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                        fetchSubscriptionData(true);
                    }, retryDelay);
                }
            }
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id, retryCount]);

    // Effect to fetch subscription data when session changes
    useEffect(() => {
        if (status === 'loading') {
            return; // Wait for session to load
        }

        // Check for signout flags before making API calls
        const preventCalls = localStorage.getItem('prevent-session-calls') === 'true';
        const signingOut = sessionStorage.getItem('signout-in-progress') === 'true';
        const justSignedOut = sessionStorage.getItem('just-signed-out') === 'true';

        if (preventCalls || signingOut || justSignedOut) {
            console.log('Subscription: Skipping data fetch - signout flags active');
            setSubscriptionData(null);
            setError(null);
            setLoading(false);
            setRetryCount(0);
            return;
        }

        if (session?.user?.id) {
            console.log('Session found, fetching subscription data');
            fetchSubscriptionData(true);
        } else {
            console.log('No session, clearing subscription data');
            setSubscriptionData(null);
            setError(null);
            setLoading(false);
            setRetryCount(0);

            // Clear signout flags when session is properly cleared
            localStorage.removeItem('prevent-session-calls');
            sessionStorage.removeItem('signout-in-progress');
            sessionStorage.removeItem('just-signed-out');
        }

        // Cleanup timeout on unmount or session change
        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, [session?.user?.id, status, fetchSubscriptionData]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, []);

    const value = {
        subscriptionData,
        loading,
        error,
        refetch: () => fetchSubscriptionData(true)
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }

    const { subscriptionData, loading, error, refetch } = context;

    // Helper functions with better error handling
    const checkFeature = (feature) => {
        if (!subscriptionData) return false;

        // NEW: Admin always has access to all features
        if (subscriptionData.isAdmin) return true;

        try {
            return checkFeatureAccess(subscriptionData, feature);
        } catch (err) {
            console.warn('Error checking feature access:', err);
            return false;
        }
    };

    // In your PWA, you can force refresh the subscription data
    const forceRefreshSubscription = async () => {
        // Clear any cached subscription data
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                await cache.delete('/api/subscription/status');
            }
        }

        // Force refetch
        subscription.refetch();
    };

    const checkLimit = (feature, currentCount) => {
        if (!subscriptionData) return false;

        // NEW: Admin always passes limit checks
        if (subscriptionData.isAdmin) return true;

        try {
            return checkUsageLimit(subscriptionData, feature, currentCount);
        } catch (err) {
            console.warn('Error checking usage limit:', err);
            return false;
        }
    };

    const getFeatureMessage = (feature) => {
        try {
            const requiredTier = getRequiredTier(feature);
            return getUpgradeMessage(feature, requiredTier);
        } catch (err) {
            console.warn('Error getting feature message:', err);
            return 'Upgrade required for this feature.';
        }
    };

    const getRemainingCount = (feature) => {
        if (!subscriptionData) return 0;

        // NEW: Admin always has unlimited
        if (subscriptionData.isAdmin) return 'Unlimited';

        try {
            const currentCount = getCurrentUsageCount(feature);
            return getRemainingUsage(subscriptionData, feature, currentCount);
        } catch (err) {
            console.warn('Error getting remaining count:', err);
            return 0;
        }
    };

    // NEW: Admin status checks
    const isAdmin = () => {
        return subscriptionData?.isAdmin === true;
    };

    const getEffectiveTier = () => {
        if (subscriptionData?.isAdmin) return 'admin';
        return subscriptionData?.tier || 'free';
    };

    // Rest of your existing functions...
    const isGoldOrHigher = () => {
        if (subscriptionData?.isAdmin) return true; // Admin is higher than gold
        const tier = subscriptionData?.tier || 'free';
        return tier === 'gold' || tier === 'platinum';
    };

    const isPlatinum = () => {
        if (subscriptionData?.isAdmin) return true; // Admin is higher than platinum
        return subscriptionData?.tier === 'platinum';
    };

    // FIXED: Map feature gates to correct usage tracking fields with SAVE_RECIPE support
    const getCurrentUsageCount = (feature) => {
        if (!subscriptionData?.usage) return 0;

        switch (feature) {
            case FEATURE_GATES.INVENTORY_LIMIT:
                return subscriptionData.usage.inventoryItems || 0;
            case FEATURE_GATES.PERSONAL_RECIPES:
                return subscriptionData.usage.personalRecipes || 0;
            case FEATURE_GATES.UPC_SCANNING:
                return subscriptionData.usage.monthlyUPCScans || 0;
            case FEATURE_GATES.RECEIPT_SCAN:
                return subscriptionData.usage.monthlyReceiptScans || 0;
            case FEATURE_GATES.MAKE_RECIPE_PUBLIC:
                return subscriptionData.usage.publicRecipes || 0;
            case FEATURE_GATES.RECIPE_COLLECTIONS:
                return subscriptionData.usage.recipeCollections || 0;
            case FEATURE_GATES.SAVE_RECIPE: // ADDED: Support for saved recipes
                return subscriptionData.usage.savedRecipes || 0;

            // Feature-access gates that don't have usage counts:
            case FEATURE_GATES.COMMON_ITEMS_WIZARD:
            case FEATURE_GATES.CONSUMPTION_HISTORY:
            case FEATURE_GATES.CREATE_MEAL_PLAN:
            case FEATURE_GATES.EMAIL_SHARING:
            case FEATURE_GATES.EMAIL_NOTIFICATIONS:
            case FEATURE_GATES.WRITE_REVIEW:
            case FEATURE_GATES.NUTRITION_ACCESS:
            case FEATURE_GATES.NUTRITION_SEARCH:
            case FEATURE_GATES.NUTRITION_ANALYSIS:
            case FEATURE_GATES.NUTRITION_GOALS:
            case FEATURE_GATES.PUBLIC_RECIPES:
            case FEATURE_GATES.BULK_INVENTORY_ADD:
                return 0; // These are access-based, not usage-limited

            default:
                return 0;
        }
    };

    return {
        // Data
        tier: getEffectiveTier(),
        status: subscriptionData?.status || 'free',
        billingCycle: subscriptionData?.billingCycle,
        isActive: subscriptionData?.isActive !== false,
        isTrialActive: subscriptionData?.isTrialActive || false,
        daysUntilTrialEnd: subscriptionData?.daysUntilTrialEnd,

        // NEW: Admin status
        isAdmin: isAdmin(),

        // Usage counts
        usage: subscriptionData?.usage || {},

        // State
        loading,
        error,

        // Tier checks (updated with admin support)
        isFree: getEffectiveTier() === 'free',
        isGold: getEffectiveTier() === 'gold',
        isPlatinum: isPlatinum(),
        isGoldOrHigher: isGoldOrHigher(),

        // Feature checks (all now admin-aware)
        checkFeature,
        checkLimit,
        getFeatureMessage,
        getRemainingCount,
        getCurrentUsageCount,

        // All your existing feature helpers will now work with admin
        canAddInventoryItem: checkLimit(FEATURE_GATES.INVENTORY_LIMIT, getCurrentUsageCount(FEATURE_GATES.INVENTORY_LIMIT)),
        canScanUPC: checkLimit(FEATURE_GATES.UPC_SCANNING, getCurrentUsageCount(FEATURE_GATES.UPC_SCANNING)),
        canScanReceipt: checkLimit(FEATURE_GATES.RECEIPT_SCAN, getCurrentUsageCount(FEATURE_GATES.RECEIPT_SCAN)),
        canAddPersonalRecipe: checkLimit(FEATURE_GATES.PERSONAL_RECIPES, getCurrentUsageCount(FEATURE_GATES.PERSONAL_RECIPES)),
        canSaveRecipe: checkLimit(FEATURE_GATES.SAVE_RECIPE, getCurrentUsageCount(FEATURE_GATES.SAVE_RECIPE)),
        canCreateCollection: checkLimit(FEATURE_GATES.RECIPE_COLLECTIONS, getCurrentUsageCount(FEATURE_GATES.RECIPE_COLLECTIONS)),
        canWriteReviews: checkFeature(FEATURE_GATES.WRITE_REVIEW),
        canMakeRecipesPublic: checkFeature(FEATURE_GATES.MAKE_RECIPE_PUBLIC),
        hasNutritionAccess: checkFeature(FEATURE_GATES.NUTRITION_ACCESS),
        hasMealPlanning: checkFeature(FEATURE_GATES.CREATE_MEAL_PLAN),
        hasEmailNotifications: checkFeature(FEATURE_GATES.EMAIL_NOTIFICATIONS),
        hasEmailSharing: checkFeature(FEATURE_GATES.EMAIL_SHARING),
        hasCommonItemsWizard: checkFeature(FEATURE_GATES.COMMON_ITEMS_WIZARD),
        hasConsumptionHistory: checkFeature(FEATURE_GATES.CONSUMPTION_HISTORY),
        hasRecipeCollections: checkFeature(FEATURE_GATES.RECIPE_COLLECTIONS),

        // Remaining counts (all now show unlimited for admin)
        remainingInventoryItems: getRemainingCount(FEATURE_GATES.INVENTORY_LIMIT),
        remainingPersonalRecipes: getRemainingCount(FEATURE_GATES.PERSONAL_RECIPES),
        remainingUPCScans: getRemainingCount(FEATURE_GATES.UPC_SCANNING),
        remainingReceiptScans: getRemainingCount(FEATURE_GATES.RECEIPT_SCAN),
        remainingSavedRecipes: getRemainingCount(FEATURE_GATES.SAVE_RECIPE),
        remainingCollections: getRemainingCount(FEATURE_GATES.RECIPE_COLLECTIONS),

        // Actions
        refetch
    };
}

// Hook for feature gating components
export function useFeatureGate(feature, currentCount = null) {
    const subscription = useSubscription();

    // Don't throw errors if subscription is loading or has errors
    if (subscription.loading) {
        return {
            hasAccess: false,
            hasCapacity: false,
            canUse: false,
            message: 'Loading subscription data...',
            requiredTier: 'free',
            remaining: 0,
            tier: 'free',
            isGoldOrHigher: false,
            isPlatinum: false,
            isAdmin: false // NEW
        };
    }

    if (subscription.error) {
        // Default to allowing access on error for better UX
        console.warn('Subscription error in useFeatureGate:', subscription.error);
        return {
            hasAccess: true,
            hasCapacity: true,
            canUse: true,
            message: 'Unable to verify subscription status',
            requiredTier: 'free',
            remaining: 'Unknown',
            tier: 'free',
            isGoldOrHigher: false,
            isPlatinum: false,
            isAdmin: false // NEW
        };
    }

    try {
        // NEW: Admin users always have full access
        if (subscription.isAdmin) {
            return {
                hasAccess: true,
                hasCapacity: true,
                canUse: true,
                message: 'Admin access - unlimited',
                requiredTier: 'admin',
                remaining: 'Unlimited',
                tier: 'admin',
                isGoldOrHigher: true,
                isPlatinum: true,
                isAdmin: true
            };
        }

        const hasAccess = subscription.checkFeature(feature);
        const hasCapacity = currentCount !== null ? subscription.checkLimit(feature, currentCount) : true;
        const message = subscription.getFeatureMessage(feature);
        const requiredTier = getRequiredTier(feature);
        const remaining = subscription.getRemainingCount(feature);

        return {
            hasAccess,
            hasCapacity,
            canUse: hasAccess && hasCapacity,
            message,
            requiredTier,
            remaining,
            tier: subscription.tier,
            isGoldOrHigher: subscription.isGoldOrHigher,
            isPlatinum: subscription.isPlatinum,
            isAdmin: subscription.isAdmin // NEW
        };
    } catch (err) {
        console.error('Error in useFeatureGate:', err);
        // Return safe defaults on error - allow access
        return {
            hasAccess: true,
            hasCapacity: true,
            canUse: true,
            message: 'Error checking feature access',
            requiredTier: 'free',
            remaining: 'Unknown',
            tier: 'free',
            isGoldOrHigher: false,
            isPlatinum: false,
            isAdmin: false // NEW
        };
    }
}

// Hook for upgrade prompts
export function useUpgradePrompt() {
    const subscription = useSubscription();

    const promptUpgrade = (feature, options = {}) => {
        try {
            const requiredTier = getRequiredTier(feature);
            const message = getUpgradeMessage(feature, requiredTier);

            if (options.onUpgrade) {
                options.onUpgrade(requiredTier, message);
            } else {
                // Default behavior - could show a modal or redirect to pricing
                window.location.href = `/pricing?source=feature-gate&feature=${feature}&required=${requiredTier}`;
            }
        } catch (err) {
            console.error('Error in promptUpgrade:', err);
            // Fallback to pricing page
            window.location.href = '/pricing?source=feature-gate';
        }
    };

    return {
        promptUpgrade,
        tier: subscription.tier,
        isTrialActive: subscription.isTrialActive,
        daysUntilTrialEnd: subscription.daysUntilTrialEnd
    };
}