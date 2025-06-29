'use client';

// file: /src/hooks/useSubscription.js v5 - FIXED mobile caching and admin support

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

    // FIXED: Clear cache function for mobile issues
    const clearSubscriptionCache = useCallback(() => {
        console.log('🧹 Clearing subscription cache...');

        // Clear any cached data
        if (typeof window !== 'undefined') {
            // Clear session storage subscription cache
            Object.keys(sessionStorage).forEach(key => {
                if (key.includes('subscription') || key.includes('tier') || key.includes('admin')) {
                    sessionStorage.removeItem(key);
                }
            });

            // Clear local storage subscription cache
            Object.keys(localStorage).forEach(key => {
                if (key.includes('subscription') || key.includes('tier') || key.includes('admin')) {
                    localStorage.removeItem(key);
                }
            });

            // Clear any global cache variables
            if (window.subscriptionCache) {
                delete window.subscriptionCache;
            }
        }

        // Reset component state
        setSubscriptionData(null);
        setError(null);
        setRetryCount(0);
        lastFetchRef.current = 0;
    }, []);

    // FIXED: Enhanced fetch function with better cache busting
    const fetchSubscriptionData = useCallback(async (force = false) => {
        // Check for signout flags before making API calls
        const preventCalls = typeof window !== 'undefined' && localStorage.getItem('prevent-session-calls') === 'true';
        const signingOut = typeof window !== 'undefined' && sessionStorage.getItem('signout-in-progress') === 'true';
        const justSignedOut = typeof window !== 'undefined' && sessionStorage.getItem('just-signed-out') === 'true';

        if (preventCalls || signingOut || justSignedOut) {
            console.log('Subscription: Skipping data fetch - signout in progress');
            clearSubscriptionCache();
            setLoading(false);
            return;
        }

        // Prevent excessive calls - only allow one call per 3 seconds unless forced
        const now = Date.now();
        if (!force && (now - lastFetchRef.current) < 3000) {
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

            console.log('📊 Fetching subscription data...');

            // FIXED: Enhanced cache busting for mobile devices
            const cacheBreaker = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const params = new URLSearchParams({
                t: cacheBreaker,
                force: force ? 'true' : 'false',
                mobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'true' : 'false'
            });

            const response = await fetch(`/api/subscription/status?${params}`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'X-Requested-With': 'XMLHttpRequest',
                    // FIXED: Add mobile-specific headers
                    'X-Cache-Buster': cacheBreaker
                },
                // FIXED: Disable all caching
                cache: 'no-store'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📊 Raw subscription data received:', data);

                // FIXED: Immediate state update and cache clear
                setSubscriptionData(data);
                setError(null);
                setRetryCount(0);

                // FIXED: Store in sessionStorage with timestamp for debugging
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('subscription-debug', JSON.stringify({
                        data,
                        timestamp: now,
                        userAgent: navigator.userAgent.substring(0, 100)
                    }));
                }

                console.log('✅ Subscription data set successfully:', {
                    tier: data.tier,
                    isAdmin: data.isAdmin,
                    isActive: data.isActive,
                    isTrialActive: data.isTrialActive,
                    timestamp: new Date(now).toISOString()
                });
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
                console.error('Subscription API error:', errorMessage);

                // Don't set error state for auth issues
                if (response.status === 401) {
                    console.log('User not authenticated, clearing subscription data');
                    clearSubscriptionCache();
                    setLoading(false);
                } else {
                    setError(errorMessage);

                    // Exponential backoff retry for server errors
                    if (response.status >= 500 && retryCount < 3) {
                        const retryDelay = Math.pow(2, retryCount) * 2000;
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
    }, [session?.user?.id, retryCount, clearSubscriptionCache]);

    // Effect to fetch subscription data when session changes
    useEffect(() => {
        if (status === 'loading') {
            return; // Wait for session to load
        }

        // Check for signout flags before making API calls
        const preventCalls = typeof window !== 'undefined' && localStorage.getItem('prevent-session-calls') === 'true';
        const signingOut = typeof window !== 'undefined' && sessionStorage.getItem('signout-in-progress') === 'true';
        const justSignedOut = typeof window !== 'undefined' && sessionStorage.getItem('just-signed-out') === 'true';

        if (preventCalls || signingOut || justSignedOut) {
            console.log('Subscription: Skipping data fetch - signout flags active');
            clearSubscriptionCache();
            setLoading(false);
            return;
        }

        if (session?.user?.id) {
            console.log('📊 Session found, fetching subscription data...');
            fetchSubscriptionData(true);
        } else {
            console.log('No session, clearing subscription data');
            clearSubscriptionCache();
            setLoading(false);
        }

        // Cleanup timeout on unmount or session change
        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, [session?.user?.id, status, fetchSubscriptionData, clearSubscriptionCache]);

    // FIXED: Force refresh function for mobile cache issues
    const forceRefresh = useCallback(async () => {
        console.log('🔄 Force refreshing subscription data...');
        clearSubscriptionCache();
        await fetchSubscriptionData(true);
    }, [clearSubscriptionCache, fetchSubscriptionData]);

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
        refetch: () => fetchSubscriptionData(true),
        forceRefresh, // FIXED: Add force refresh for mobile issues
        clearCache: clearSubscriptionCache // FIXED: Add cache clear function
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {

    useEffect(() => {
        if (subscriptionData) {
            debugSubscriptionVsSession();
        }
    }, [subscriptionData]);

    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }

    const { subscriptionData, loading, error, refetch, forceRefresh, clearCache } = context;

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

    const DEBUG_SUBSCRIPTION = true;

    // UPDATE the isAdmin function to check session data:
    const isAdmin = () => {
        // **FIXED: Check session data first, then subscriptionData**
        const { data: session } = useSafeSession();
        const sessionAdmin = session?.user?.isAdmin === true;
        const subscriptionAdmin = subscriptionData?.isAdmin === true;

        const adminStatus = sessionAdmin || subscriptionAdmin;

        if (DEBUG_SUBSCRIPTION) {
            console.log('🔍 Admin status check:', {
                sessionAdmin,
                subscriptionAdmin,
                finalStatus: adminStatus,
                sessionTier: session?.user?.subscriptionTier,
                subscriptionTier: subscriptionData?.tier
            });
        }
        return adminStatus;
    };

    const getEffectiveTier = () => {
        // **FIXED: Check session data first for admin status**
        const { data: session } = useSafeSession();

        if (DEBUG_SUBSCRIPTION) {
            console.log('🔍 Getting effective tier:', {
                sessionUser: session?.user,
                subscriptionData: subscriptionData
            });
        }

        // Check admin status from both sources
        const sessionAdmin = session?.user?.isAdmin === true;
        const subscriptionAdmin = subscriptionData?.isAdmin === true;

        if (sessionAdmin || subscriptionAdmin) {
            if (DEBUG_SUBSCRIPTION) {
                console.log('✅ User is admin (session:', sessionAdmin, ', subscription:', subscriptionAdmin, '), returning admin tier');
            }
            return 'admin';
        }

        // Get tier from session first, then fallback to subscriptionData
        const sessionTier = session?.user?.subscriptionTier || session?.user?.effectiveTier;
        const tier = sessionTier || subscriptionData?.tier || 'free';

        if (DEBUG_SUBSCRIPTION) {
            console.log('📊 Returning tier:', tier, '(session:', sessionTier, ', subscription:', subscriptionData?.tier, ')');
        }
        return tier;
    };

    // UPDATE the isGoldOrHigher function:
    const isGoldOrHigher = () => {
        // **FIXED: Use the updated isAdmin and getEffectiveTier functions**
        if (isAdmin()) return true; // Admin is higher than gold
        const tier = getEffectiveTier();
        return tier === 'gold' || tier === 'platinum';
    };

// UPDATE the isPlatinum function:
    const isPlatinum = () => {
        // **FIXED: Use the updated isAdmin and getEffectiveTier functions**
        if (isAdmin()) return true; // Admin is higher than platinum
        const tier = getEffectiveTier();
        return tier === 'platinum';
    };

    // **ADD THIS DEBUG FUNCTION to see what's happening:**
    const debugSubscriptionVsSession = () => {
        if (DEBUG_SUBSCRIPTION) {
            const { data: session } = useSafeSession();
            console.log('🔍 === SUBSCRIPTION VS SESSION DEBUG ===');
            console.log('📊 subscriptionData:', {
                tier: subscriptionData?.tier,
                isAdmin: subscriptionData?.isAdmin,
                status: subscriptionData?.status
            });
            console.log('👤 session.user:', {
                subscriptionTier: session?.user?.subscriptionTier,
                effectiveTier: session?.user?.effectiveTier,
                isAdmin: session?.user?.isAdmin,
                subscriptionStatus: session?.user?.subscriptionStatus
            });
            console.log('🎯 Final decisions:', {
                effectiveTier: getEffectiveTier(),
                isAdmin: isAdmin(),
                isGoldOrHigher: isGoldOrHigher()
            });
            console.log('🔍 === END SUBSCRIPTION DEBUG ===');
        }
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

        // NEW: Add missing date fields
        startDate: subscriptionData?.startDate,
        endDate: subscriptionData?.endDate,
        trialStartDate: subscriptionData?.trialStartDate,
        trialEndDate: subscriptionData?.trialEndDate,
        lastPaymentDate: subscriptionData?.lastPaymentDate,
        nextBillingDate: subscriptionData?.nextBillingDate,

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

        // All existing feature helpers will now work with admin
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

        // Actions - FIXED: Add mobile-specific refresh functions
        refetch,
        forceRefresh, // NEW: For mobile cache issues
        clearCache    // NEW: For debugging mobile issues
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
            isAdmin: false
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
            isAdmin: false
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
            isAdmin: subscription.isAdmin
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
            isAdmin: false
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
                // Default behavior - redirect to pricing or billing page
                const targetPage = subscription.tier === 'free'
                    ? `/pricing?source=feature-gate&feature=${feature}&required=${requiredTier}`
                    : `/account/billing?source=feature-gate&feature=${feature}&required=${requiredTier}`;
                window.location.href = targetPage;
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
        daysUntilTrialEnd: subscription.daysUntilTrialEnd,
        forceRefresh: subscription.forceRefresh, // NEW: For mobile debugging
        clearCache: subscription.clearCache      // NEW: For mobile debugging
    };
}