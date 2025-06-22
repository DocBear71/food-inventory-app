'use client';

// file: /src/hooks/useSubscription.js v3 - Fixed to prevent API calls during signout

import { useState, useEffect, useContext, createContext, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
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
    const { data: session, status } = useSession();
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const fetchTimeoutRef = useRef(null);
    const lastFetchRef = useRef(0);

    // Debounced fetch function to prevent excessive API calls
    const fetchSubscriptionData = useCallback(async (force = false) => {
        // ADDED: Check for signout flags before making API calls
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
            const response = await fetch('/api/subscription/status', {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
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

                    // ADDED: If API fails with 401, might be because session is invalid - clear signout flags
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

        // ADDED: Check for signout flags before making API calls
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

            // ADDED: Clear signout flags when session is properly cleared
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
        try {
            return checkFeatureAccess(subscriptionData, feature);
        } catch (err) {
            console.warn('Error checking feature access:', err);
            return false;
        }
    };

    const checkLimit = (feature, currentCount) => {
        if (!subscriptionData) return false;
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
        try {
            const currentCount = getCurrentUsageCount(feature);
            return getRemainingUsage(subscriptionData, feature, currentCount);
        } catch (err) {
            console.warn('Error getting remaining count:', err);
            return 0;
        }
    };

    // FIXED: Map feature gates to correct usage tracking fields
    const getCurrentUsageCount = (feature) => {
        if (!subscriptionData?.usage) return 0;

        switch (feature) {
            // FIXED: Use correct feature gate names
            case FEATURE_GATES.INVENTORY_LIMIT:
                return subscriptionData.usage.inventoryItems || 0;
            case FEATURE_GATES.PERSONAL_RECIPES:
                return subscriptionData.usage.personalRecipes || 0;
            case FEATURE_GATES.UPC_SCANNING:
                return subscriptionData.usage.monthlyUPCScans || 0;
            case FEATURE_GATES.RECEIPT_SCAN:  // FIXED: Now using proper constant
                return subscriptionData.usage.monthlyReceiptScans || 0;
            case FEATURE_GATES.MAKE_RECIPE_PUBLIC:
                return subscriptionData.usage.publicRecipes || 0;
            case FEATURE_GATES.RECIPE_COLLECTIONS:
                return subscriptionData.usage.recipeCollections || 0;

            // Feature-access gates that don't have usage counts:
            case FEATURE_GATES.COMMON_ITEMS_WIZARD:
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

    const isGoldOrHigher = () => {
        const tier = subscriptionData?.tier || 'free';
        return tier === 'gold' || tier === 'platinum';
    };

    const isPlatinum = () => {
        return subscriptionData?.tier === 'platinum';
    };

    const isTrialActive = () => {
        return subscriptionData?.isTrialActive || false;
    };

    // FIXED: Feature-specific helpers using correct feature gates
    const canAddInventoryItem = () => {
        return checkLimit(FEATURE_GATES.INVENTORY_LIMIT, getCurrentUsageCount(FEATURE_GATES.INVENTORY_LIMIT));
    };

    const canScanUPC = () => {
        return checkLimit(FEATURE_GATES.UPC_SCANNING, getCurrentUsageCount(FEATURE_GATES.UPC_SCANNING));
    };

    const canScanReceipt = () => {
        return checkLimit(FEATURE_GATES.RECEIPT_SCAN, getCurrentUsageCount(FEATURE_GATES.RECEIPT_SCAN));
    };

    const canAddPersonalRecipe = () => {
        return checkLimit(FEATURE_GATES.PERSONAL_RECIPES, getCurrentUsageCount(FEATURE_GATES.PERSONAL_RECIPES));
    };

    return {
        // Data
        tier: subscriptionData?.tier || 'free',
        status: subscriptionData?.status || 'free',
        billingCycle: subscriptionData?.billingCycle,
        isActive: subscriptionData?.isActive !== false, // Default to true if undefined
        isTrialActive: isTrialActive(),
        daysUntilTrialEnd: subscriptionData?.daysUntilTrialEnd,

        // Usage counts
        usage: subscriptionData?.usage || {},

        // State
        loading,
        error,

        // Tier checks
        isFree: (subscriptionData?.tier || 'free') === 'free',
        isGold: (subscriptionData?.tier || 'free') === 'gold',
        isPlatinum: isPlatinum(),
        isGoldOrHigher: isGoldOrHigher(),

        // Feature checks
        checkFeature,
        checkLimit,
        getFeatureMessage,
        getRemainingCount,
        getCurrentUsageCount,

        // FIXED: Specific feature helpers using correct feature gates
        canAddInventoryItem: canAddInventoryItem(),
        canScanUPC: canScanUPC(),
        canScanReceipt: canScanReceipt(),
        canAddPersonalRecipe: canAddPersonalRecipe(),
        canWriteReviews: checkFeature(FEATURE_GATES.WRITE_REVIEW),
        canMakeRecipesPublic: checkFeature(FEATURE_GATES.MAKE_RECIPE_PUBLIC),
        hasNutritionAccess: checkFeature(FEATURE_GATES.NUTRITION_ACCESS),
        hasMealPlanning: checkFeature(FEATURE_GATES.CREATE_MEAL_PLAN),
        hasEmailNotifications: checkFeature(FEATURE_GATES.EMAIL_NOTIFICATIONS),
        hasEmailSharing: checkFeature(FEATURE_GATES.EMAIL_SHARING),
        hasCommonItemsWizard: checkFeature(FEATURE_GATES.COMMON_ITEMS_WIZARD),
        hasDataExport: checkFeature('DATA_EXPORT'), // Add to FEATURE_GATES if needed
        hasRecipeCollections: checkFeature(FEATURE_GATES.RECIPE_COLLECTIONS),

        // FIXED: Remaining counts using correct feature gates
        remainingInventoryItems: getRemainingCount(FEATURE_GATES.INVENTORY_LIMIT),
        remainingPersonalRecipes: getRemainingCount(FEATURE_GATES.PERSONAL_RECIPES),
        remainingUPCScans: getRemainingCount(FEATURE_GATES.UPC_SCANNING),
        remainingReceiptScans: getRemainingCount('RECEIPT_SCAN'),
        remainingSavedRecipes: getRemainingCount('SAVE_PUBLIC_RECIPE'),

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
            isPlatinum: false
        };
    }

    if (subscription.error) {
        // Default to free tier behavior on error
        console.warn('Subscription error in useFeatureGate:', subscription.error);
        return {
            hasAccess: feature === null || !feature, // Allow access if no specific feature required
            hasCapacity: true,
            canUse: feature === null || !feature,
            message: 'Unable to verify subscription status',
            requiredTier: 'free',
            remaining: 0,
            tier: 'free',
            isGoldOrHigher: false,
            isPlatinum: false
        };
    }

    try {
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
            isPlatinum: subscription.isPlatinum
        };
    } catch (err) {
        console.error('Error in useFeatureGate:', err);
        // Return safe defaults on error
        return {
            hasAccess: false,
            hasCapacity: false,
            canUse: false,
            message: 'Error checking feature access',
            requiredTier: 'free',
            remaining: 0,
            tier: 'free',
            isGoldOrHigher: false,
            isPlatinum: false
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