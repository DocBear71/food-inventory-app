// file: /src/hooks/useSubscription.js v1 - React hook for subscription management and feature gating

import { useState, useEffect, useContext, createContext } from 'react';
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
    const { data: session } = useSession();
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (session?.user?.id) {
            fetchSubscriptionData();
        } else {
            setLoading(false);
            setSubscriptionData(null);
        }
    }, [session]);

    const fetchSubscriptionData = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/subscription/status');

            if (response.ok) {
                const data = await response.json();
                setSubscriptionData(data);
                setError(null);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to fetch subscription data');
            }
        } catch (err) {
            console.error('Error fetching subscription data:', err);
            setError('Network error while fetching subscription data');
        } finally {
            setLoading(false);
        }
    };

    const value = {
        subscriptionData,
        loading,
        error,
        refetch: fetchSubscriptionData
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

    // Helper functions
    const checkFeature = (feature) => {
        if (!subscriptionData) return false;
        return checkFeatureAccess(subscriptionData, feature);
    };

    const checkLimit = (feature, currentCount) => {
        if (!subscriptionData) return false;
        return checkUsageLimit(subscriptionData, feature, currentCount);
    };

    const getFeatureMessage = (feature) => {
        const requiredTier = getRequiredTier(feature);
        return getUpgradeMessage(feature, requiredTier);
    };

    const getRemainingCount = (feature) => {
        if (!subscriptionData) return 0;
        const currentCount = getCurrentUsageCount(feature);
        return getRemainingUsage(subscriptionData, feature, currentCount);
    };

    const getCurrentUsageCount = (feature) => {
        if (!subscriptionData?.usage) return 0;

        switch (feature) {
            case FEATURE_GATES.ADD_INVENTORY_ITEM:
                return subscriptionData.usage.inventoryItems;
            case FEATURE_GATES.ADD_PERSONAL_RECIPE:
                return subscriptionData.usage.personalRecipes;
            case FEATURE_GATES.UPC_SCAN:
                return subscriptionData.usage.monthlyUPCScans;
            case FEATURE_GATES.RECEIPT_SCAN:
                return subscriptionData.usage.monthlyReceiptScans;
            case FEATURE_GATES.SAVE_PUBLIC_RECIPE:
                return subscriptionData.usage.savedRecipes;
            case FEATURE_GATES.MAKE_RECIPE_PUBLIC:
                return subscriptionData.usage.publicRecipes;
            case FEATURE_GATES.CREATE_COLLECTION:
                return subscriptionData.usage.recipeCollections;
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

    // Feature-specific helpers
    const canAddInventoryItem = () => {
        return checkLimit(FEATURE_GATES.ADD_INVENTORY_ITEM, getCurrentUsageCount(FEATURE_GATES.ADD_INVENTORY_ITEM));
    };

    const canScanUPC = () => {
        return checkLimit(FEATURE_GATES.UPC_SCAN, getCurrentUsageCount(FEATURE_GATES.UPC_SCAN));
    };

    const canScanReceipt = () => {
        return checkLimit(FEATURE_GATES.RECEIPT_SCAN, getCurrentUsageCount(FEATURE_GATES.RECEIPT_SCAN));
    };

    const canAddPersonalRecipe = () => {
        return checkLimit(FEATURE_GATES.ADD_PERSONAL_RECIPE, getCurrentUsageCount(FEATURE_GATES.ADD_PERSONAL_RECIPE));
    };

    const canSavePublicRecipe = () => {
        return checkLimit(FEATURE_GATES.SAVE_PUBLIC_RECIPE, getCurrentUsageCount(FEATURE_GATES.SAVE_PUBLIC_RECIPE));
    };

    return {
        // Data
        tier: subscriptionData?.tier || 'free',
        status: subscriptionData?.status || 'free',
        billingCycle: subscriptionData?.billingCycle,
        isActive: subscriptionData?.isActive || false,
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

        // Specific feature helpers
        canAddInventoryItem: canAddInventoryItem(),
        canScanUPC: canScanUPC(),
        canScanReceipt: canScanReceipt(),
        canAddPersonalRecipe: canAddPersonalRecipe(),
        canSavePublicRecipe: canSavePublicRecipe(),
        canWriteReviews: checkFeature(FEATURE_GATES.WRITE_REVIEW),
        canMakeRecipesPublic: checkFeature(FEATURE_GATES.MAKE_RECIPE_PUBLIC),
        hasNutritionAccess: checkFeature(FEATURE_GATES.ACCESS_NUTRITION),
        hasMealPlanning: checkFeature(FEATURE_GATES.CREATE_MEAL_PLAN),
        hasEmailNotifications: checkFeature(FEATURE_GATES.EMAIL_NOTIFICATIONS),
        hasEmailSharing: checkFeature(FEATURE_GATES.EMAIL_SHARING),
        hasCommonItemsWizard: checkFeature(FEATURE_GATES.COMMON_ITEMS_WIZARD),
        hasDataExport: checkFeature(FEATURE_GATES.DATA_EXPORT),
        hasRecipeCollections: checkFeature(FEATURE_GATES.CREATE_COLLECTION),

        // Remaining counts
        remainingInventoryItems: getRemainingCount(FEATURE_GATES.ADD_INVENTORY_ITEM),
        remainingPersonalRecipes: getRemainingCount(FEATURE_GATES.ADD_PERSONAL_RECIPE),
        remainingUPCScans: getRemainingCount(FEATURE_GATES.UPC_SCAN),
        remainingReceiptScans: getRemainingCount(FEATURE_GATES.RECEIPT_SCAN),
        remainingSavedRecipes: getRemainingCount(FEATURE_GATES.SAVE_PUBLIC_RECIPE),

        // Actions
        refetch
    };
}

// Hook for feature gating components
export function useFeatureGate(feature, currentCount = null) {
    const subscription = useSubscription();

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
}

// Hook for upgrade prompts
export function useUpgradePrompt() {
    const subscription = useSubscription();

    const promptUpgrade = (feature, options = {}) => {
        const requiredTier = getRequiredTier(feature);
        const message = getUpgradeMessage(feature, requiredTier);

        if (options.onUpgrade) {
            options.onUpgrade(requiredTier, message);
        } else {
            // Default behavior - could show a modal or redirect to pricing
            window.location.href = `/pricing?source=feature-gate&feature=${feature}&required=${requiredTier}`;
        }
    };

    return {
        promptUpgrade,
        tier: subscription.tier,
        isTrialActive: subscription.isTrialActive,
        daysUntilTrialEnd: subscription.daysUntilTrialEnd
    };
}