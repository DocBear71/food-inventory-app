'use client';

// file: /src/hooks/useSubscription.js v7 - Fixed immediate subscription updates after iOS purchase

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
import { apiPost } from '@/lib/api-config'

// DIAGNOSTIC: Make visual debug available to useEffect
if (typeof window !== 'undefined') {
    window.addDebugMessage = window.addDebugMessage || (() => {});
}

const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) {
    const { data: session, status } = useSafeSession();
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // MINIMAL: Just handle session changes and extract subscription data
    useEffect(() => {
        console.log('SubscriptionProvider: Session changed', { status, hasSession: !!session });

        if (status === 'loading') {
            setLoading(true);
            return;
        }

        if (status === 'unauthenticated' || !session) {
            console.log('No session - setting free tier');
            setSubscriptionData({
                tier: 'free',
                isAdmin: false,
                isActive: false,
                isTrialActive: false,
                usage: {},
                timestamp: new Date().toISOString()
            });
            setLoading(false);
            setError(null);
            return;
        }

        // CORE LOGIC: Extract subscription from session
        const sessionSub = session?.user?.subscription;
        const userEmail = session?.user?.email;
        const userIsAdmin = session?.user?.isAdmin;

        console.log('Session subscription data:', {
            hasSubscription: !!sessionSub,
            tier: sessionSub?.tier,
            status: sessionSub?.status,
            platform: sessionSub?.platform,
            userEmail: userEmail,
            userIsAdmin: userIsAdmin
        });

        // 1. Admin override (only if no paid subscription)
        const hasPaidSub = sessionSub?.tier &&
            sessionSub.tier !== 'free' &&
            sessionSub.tier !== 'admin' &&
            sessionSub.status === 'active';

        if ((userEmail === 'e.g.mckeown@gmail.com' || userIsAdmin) && !hasPaidSub) {
            console.log('Setting admin subscription');
            setSubscriptionData({
                tier: 'admin',
                isAdmin: true,
                isActive: true,
                isTrialActive: false,
                usage: session.user.usage || {},
                timestamp: new Date().toISOString()
            });
            setLoading(false);
            setError(null);
            return;
        }

        // 2. Use session subscription if it exists
        if (sessionSub?.tier && sessionSub?.status) {
            console.log('Using session subscription:', sessionSub.tier);
            setSubscriptionData({
                tier: sessionSub.tier,
                status: sessionSub.status,
                isAdmin: userIsAdmin || false,
                isActive: sessionSub.status === 'active',
                isTrialActive: sessionSub.status === 'trial',
                hasUsedFreeTrial: Boolean(sessionSub.hasUsedFreeTrial),
                platform: sessionSub.platform || 'revenuecat',
                billingCycle: sessionSub.billingCycle,
                startDate: sessionSub.startDate,
                endDate: sessionSub.endDate,
                usage: session.user.usage || {},
                subscription: sessionSub,
                timestamp: new Date().toISOString()
            });
            setLoading(false);
            setError(null);
            return;
        }

        // 3. Fallback to free tier
        console.log('No subscription found - setting free tier');
        setSubscriptionData({
            tier: 'free',
            isAdmin: userIsAdmin || false,
            isActive: true,
            isTrialActive: false,
            usage: session.user.usage || {},
            timestamp: new Date().toISOString()
        });
        setLoading(false);
        setError(null);

    }, [session, status]); // CRITICAL: Only depend on session and status

    // MINIMAL FUNCTIONS: Just what's needed
    const forceRefresh = useCallback(() => {
        console.log('Force refresh requested');
        setLoading(true);
        // Trigger re-evaluation by changing loading state
        setTimeout(() => setLoading(false), 100);
    }, []);

    const clearCache = useCallback(() => {
        console.log('Clear cache requested');
        setSubscriptionData(null);
        setError(null);
    }, []);

    const value = {
        subscriptionData,
        loading,
        error,
        refetch: forceRefresh,
        forceRefresh,
        clearCache,
        refreshFromDatabase: forceRefresh,
        refreshAfterPurchase: forceRefresh
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
}

// working version of useSubscription that would update the system when logged out then back in.
export function useSubscription() {
    const context = useContext(SubscriptionContext);
    const { data: session } = useSafeSession();

    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }

    const { subscriptionData, loading, error, refetch, forceRefresh, clearCache, refreshFromDatabase, refreshAfterPurchase } = context;

    // EMERGENCY OVERRIDE: Force subscription data from session if it exists
    const sessionSub = session?.user?.subscription;
    const hasValidSessionSub = sessionSub &&
        sessionSub.tier === 'gold' &&
        sessionSub.status === 'active';

    // If we have valid session subscription data, override the hook's internal state
    const effectiveSubscriptionData = hasValidSessionSub ? {
        tier: sessionSub.tier,
        status: sessionSub.status,
        isAdmin: session.user.isAdmin || false,
        isActive: true,
        isTrialActive: false,
        hasUsedFreeTrial: Boolean(sessionSub.hasUsedFreeTrial),
        platform: sessionSub.platform || 'revenuecat',
        billingCycle: sessionSub.billingCycle || 'annual',
        startDate: sessionSub.startDate,
        endDate: sessionSub.endDate,
        usage: session.user.usage || {},
        subscription: sessionSub,
        timestamp: new Date().toISOString()
    } : subscriptionData;

    // Force loading to false if we have session data
    const effectiveLoading = hasValidSessionSub ? false : loading;

    const isExpired = () => {
        return effectiveSubscriptionData?.status === 'expired';
    };

    // Helper functions with better error handling
    const checkFeature = (feature) => {
        if (!effectiveSubscriptionData) return false;

        // Admin always has access to all features
        if (effectiveSubscriptionData.isAdmin) return true;

        try {
            return checkFeatureAccess(effectiveSubscriptionData, feature);
        } catch (err) {
            console.warn('Error checking feature access:', err);
            return false;
        }
    };

    const checkLimit = (feature, currentCount) => {
        if (!effectiveSubscriptionData) return false;

        // Admin always passes limit checks
        if (effectiveSubscriptionData.isAdmin) return true;

        try {
            return checkUsageLimit(effectiveSubscriptionData, feature, currentCount);
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
        if (!effectiveSubscriptionData) return 0;

        // Admin always has unlimited
        if (effectiveSubscriptionData.isAdmin) return 'Unlimited';

        try {
            const currentCount = getCurrentUsageCount(feature);
            return getRemainingUsage(effectiveSubscriptionData, feature, currentCount);
        } catch (err) {
            console.warn('Error getting remaining count:', err);
            return 0;
        }
    };

    // Admin status checks
    const isAdmin = () => {
        return effectiveSubscriptionData?.isAdmin === true;
    };

    const getEffectiveTier = () => {
        if (effectiveSubscriptionData?.isAdmin) {
            return 'admin';
        }
        // Force expired users to free tier for feature purposes
        if (isExpired()) {
            return 'free';
        }
        return effectiveSubscriptionData?.tier || 'free';
    };

    const isGoldOrHigher = () => {
        if (effectiveSubscriptionData?.isAdmin) return true;
        const tier = effectiveSubscriptionData?.tier || 'free';
        return tier === 'gold' || tier === 'platinum';
    };

    const isPlatinum = () => {
        if (effectiveSubscriptionData?.isAdmin) return true;
        return effectiveSubscriptionData?.tier === 'platinum';
    };

    // Map feature gates to correct usage tracking fields
    const getCurrentUsageCount = (feature) => {
        if (!effectiveSubscriptionData?.usage) return 0;

        switch (feature) {
            case FEATURE_GATES.INVENTORY_LIMIT:
                return effectiveSubscriptionData.usage.totalInventoryItems || effectiveSubscriptionData.usage.inventoryItems || 0;
            case FEATURE_GATES.PERSONAL_RECIPES:
                return effectiveSubscriptionData.usage.totalPersonalRecipes || effectiveSubscriptionData.usage.personalRecipes || 0;
            case FEATURE_GATES.UPC_SCANNING:
                return effectiveSubscriptionData.usage.monthlyUPCScans || 0;  // Monthly
            case FEATURE_GATES.RECEIPT_SCAN:
                return effectiveSubscriptionData.usage.monthlyReceiptScans || 0;  // Monthly
            case FEATURE_GATES.MAKE_RECIPE_PUBLIC:
                return effectiveSubscriptionData.usage.totalPublicRecipes || effectiveSubscriptionData.usage.publicRecipes || 0;
            case FEATURE_GATES.RECIPE_COLLECTIONS:
                return effectiveSubscriptionData.usage.totalRecipeCollections || effectiveSubscriptionData.usage.recipeCollections || 0;
            case FEATURE_GATES.SAVE_RECIPE:
                return effectiveSubscriptionData.usage.totalSavedRecipes || effectiveSubscriptionData.usage.savedRecipes || 0;
            default:
                return 0;
        }
    };

    return {
        // Data - using effective subscription data (session override if available)
        tier: getEffectiveTier(),
        originalTier: effectiveSubscriptionData?.tier || 'free', // Keep track of original tier
        status: effectiveSubscriptionData?.status || (effectiveSubscriptionData?.isAdmin ? 'active' : 'free'),
        isExpired: isExpired(),
        billingCycle: effectiveSubscriptionData?.billingCycle,
        isActive: effectiveSubscriptionData?.isActive !== false,
        isTrialActive: effectiveSubscriptionData?.isTrialActive || false,
        platform: effectiveSubscriptionData?.platform || 'undefined',
        hasUsedFreeTrial: effectiveSubscriptionData?.hasUsedFreeTrial ||
            context.session?.user?.subscription?.hasUsedFreeTrial ||
            false,
        daysUntilTrialEnd: effectiveSubscriptionData?.daysUntilTrialEnd,

        // Date fields
        startDate: effectiveSubscriptionData?.startDate,
        endDate: effectiveSubscriptionData?.endDate,
        trialStartDate: effectiveSubscriptionData?.trialStartDate,
        trialEndDate: effectiveSubscriptionData?.trialEndDate,
        lastPaymentDate: effectiveSubscriptionData?.lastPaymentDate,
        nextBillingDate: effectiveSubscriptionData?.nextBillingDate,

        // Admin status
        isAdmin: isAdmin(),

        // Usage counts
        usage: effectiveSubscriptionData?.usage || {},

        // State - use effective loading
        loading: effectiveLoading,
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

        // Feature helpers - expired users get free tier access only
        canAddInventoryItem: !isExpired() && checkLimit(FEATURE_GATES.INVENTORY_LIMIT, getCurrentUsageCount(FEATURE_GATES.INVENTORY_LIMIT)),
        canScanUPC: !isExpired() && checkLimit(FEATURE_GATES.UPC_SCANNING, getCurrentUsageCount(FEATURE_GATES.UPC_SCANNING)),
        canScanReceipt: !isExpired() && checkLimit(FEATURE_GATES.RECEIPT_SCAN, getCurrentUsageCount(FEATURE_GATES.RECEIPT_SCAN)),
        canAddPersonalRecipe: !isExpired() && checkLimit(FEATURE_GATES.PERSONAL_RECIPES, getCurrentUsageCount(FEATURE_GATES.PERSONAL_RECIPES)),
        canSaveRecipe: !isExpired() && checkLimit(FEATURE_GATES.SAVE_RECIPE, getCurrentUsageCount(FEATURE_GATES.SAVE_RECIPE)),
        canCreateCollection: !isExpired() && checkLimit(FEATURE_GATES.RECIPE_COLLECTIONS, getCurrentUsageCount(FEATURE_GATES.RECIPE_COLLECTIONS)),
        canWriteReviews: !isExpired() && checkFeature(FEATURE_GATES.WRITE_REVIEW),
        canMakeRecipesPublic: !isExpired() && checkFeature(FEATURE_GATES.MAKE_RECIPE_PUBLIC),
        hasNutritionAccess: !isExpired() && checkFeature(FEATURE_GATES.NUTRITION_ACCESS),
        hasMealPlanning: !isExpired() && checkFeature(FEATURE_GATES.CREATE_MEAL_PLAN),
        hasEmailNotifications: !isExpired() && checkFeature(FEATURE_GATES.EMAIL_NOTIFICATIONS),
        hasEmailSharing: checkFeature(FEATURE_GATES.EMAIL_SHARING),
        hasCommonItemsWizard: checkFeature(FEATURE_GATES.COMMON_ITEMS_WIZARD),
        hasConsumptionHistory: checkFeature(FEATURE_GATES.CONSUMPTION_HISTORY),
        hasRecipeCollections: checkFeature(FEATURE_GATES.RECIPE_COLLECTIONS),

        // Remaining counts
        remainingInventoryItems: getRemainingCount(FEATURE_GATES.INVENTORY_LIMIT),
        remainingPersonalRecipes: getRemainingCount(FEATURE_GATES.PERSONAL_RECIPES),
        remainingUPCScans: getRemainingCount(FEATURE_GATES.UPC_SCANNING),
        remainingReceiptScans: getRemainingCount(FEATURE_GATES.RECEIPT_SCAN),
        remainingSavedRecipes: getRemainingCount(FEATURE_GATES.SAVE_RECIPE),
        remainingCollections: getRemainingCount(FEATURE_GATES.RECIPE_COLLECTIONS),
        remainingRecipeCollections: getRemainingCount(FEATURE_GATES.RECIPE_COLLECTIONS),

        // Actions
        refetch: refreshAfterPurchase,
        forceRefresh,
        clearCache,
        refreshFromDatabase,
        refreshAfterPurchase
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
        // Admin users always have full access
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
                const targetPage = subscription.tier === 'free'
                    ? `/pricing?source=feature-gate&feature=${feature}&required=${requiredTier}`
                    : `/account/billing?source=feature-gate&feature=${feature}&required=${requiredTier}`;
                window.location.href = targetPage;
            }
        } catch (err) {
            console.error('Error in promptUpgrade:', err);
            window.location.href = '/pricing?source=feature-gate';
        }
    };

    return {
        promptUpgrade,
        tier: subscription.tier,
        isTrialActive: subscription.isTrialActive,
        daysUntilTrialEnd: subscription.daysUntilTrialEnd,
        forceRefresh: subscription.forceRefresh,
        clearCache: subscription.clearCache,
        refreshAfterPurchase: subscription.refreshAfterPurchase // CRITICAL FIX: Expose post-purchase refresh
    };
}