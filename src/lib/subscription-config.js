// file: /src/lib/subscription-config.js v8 - Added EMAIL_NOTIFICATIONS feature gate

// Subscription tier definitions
export const SUBSCRIPTION_TIERS = {
    FREE: 'free',
    GOLD: 'gold',
    PLATINUM: 'platinum'
};

// Feature gate definitions
export const FEATURE_GATES = {
    // Inventory limits
    INVENTORY_LIMIT: 'inventory_limit',
    UPC_SCANNING: 'upc_scanning',
    BULK_INVENTORY_ADD: 'bulk_inventory_add',
    RECEIPT_SCAN: 'receipt_scan',

    // Recipe limits
    PERSONAL_RECIPES: 'personal_recipes',
    WRITE_REVIEW: 'write_review',

    // Premium features
    COMMON_ITEMS_WIZARD: 'common_items_wizard',
    CREATE_MEAL_PLAN: 'create_meal_plan',
    EMAIL_SHARING: 'email_sharing',
    EMAIL_NOTIFICATIONS: 'email_notifications', // NEW: Email notifications for expiration alerts

    // Nutrition features
    NUTRITION_ACCESS: 'nutrition_access',
    NUTRITION_SEARCH: 'nutrition_search',
    NUTRITION_ANALYSIS: 'nutrition_analysis',
    NUTRITION_GOALS: 'nutrition_goals',

    // Recipe collections and public recipes
    RECIPE_COLLECTIONS: 'recipe_collections',
    PUBLIC_RECIPES: 'public_recipes',
    MAKE_RECIPE_PUBLIC: 'make_recipe_public' // Specific gate for making individual recipes public
};

// Usage limits by tier
export const USAGE_LIMITS = {
    [SUBSCRIPTION_TIERS.FREE]: {
        inventoryItems: 50,
        upcScansPerMonth: 10,
        monthlyReceiptScans: 2,
        personalRecipes: 5,
        savedRecipes: 25,
        publicRecipes: 0, // FREE: Cannot make recipes public
        recipeCollections: 2,
        mealPlansActive: 0,
        emailSharesPerMonth: 0,
        emailNotificationsPerMonth: 0 // NEW: Free users get no email notifications
    },
    [SUBSCRIPTION_TIERS.GOLD]: {
        inventoryItems: 250,
        upcScansPerMonth: -1, // unlimited
        monthlyReceiptScans: 20,
        personalRecipes: 100,
        savedRecipes: 500,
        publicRecipes: 25, // GOLD: Up to 25 public recipes
        recipeCollections: 10,
        mealPlansActive: 3,
        emailSharesPerMonth: 50,
        emailNotificationsPerMonth: 100 // NEW: Gold users get email notifications
    },
    [SUBSCRIPTION_TIERS.PLATINUM]: {
        inventoryItems: -1, // unlimited
        upcScansPerMonth: -1, // unlimited
        monthlyReceiptScans: -1, // unlimited
        personalRecipes: -1, // unlimited
        savedRecipes: -1, // unlimited
        publicRecipes: -1, // PLATINUM: Unlimited public recipes
        recipeCollections: -1, // unlimited
        mealPlansActive: -1, // unlimited
        emailSharesPerMonth: -1, // unlimited
        emailNotificationsPerMonth: -1 // NEW: Unlimited email notifications
    }
};

// Feature access by tier
export const FEATURE_ACCESS = {
    [SUBSCRIPTION_TIERS.FREE]: {
        [FEATURE_GATES.INVENTORY_LIMIT]: true,
        [FEATURE_GATES.UPC_SCANNING]: true, // limited by usage
        [FEATURE_GATES.BULK_INVENTORY_ADD]: false,
        [FEATURE_GATES.PERSONAL_RECIPES]: true, // limited by usage
        [FEATURE_GATES.WRITE_REVIEW]: false,
        [FEATURE_GATES.COMMON_ITEMS_WIZARD]: false,
        [FEATURE_GATES.CREATE_MEAL_PLAN]: false,
        [FEATURE_GATES.EMAIL_SHARING]: false,
        [FEATURE_GATES.EMAIL_NOTIFICATIONS]: false, // NEW: Free users cannot get email notifications
        [FEATURE_GATES.NUTRITION_ACCESS]: false,
        [FEATURE_GATES.NUTRITION_SEARCH]: false,
        [FEATURE_GATES.NUTRITION_ANALYSIS]: false,
        [FEATURE_GATES.NUTRITION_GOALS]: false,
        [FEATURE_GATES.RECIPE_COLLECTIONS]: true, // limited by usage
        [FEATURE_GATES.PUBLIC_RECIPES]: false, // Free users cannot access public recipe features
        [FEATURE_GATES.MAKE_RECIPE_PUBLIC]: false // Free users cannot make recipes public
    },
    [SUBSCRIPTION_TIERS.GOLD]: {
        [FEATURE_GATES.INVENTORY_LIMIT]: true,
        [FEATURE_GATES.UPC_SCANNING]: true,
        [FEATURE_GATES.BULK_INVENTORY_ADD]: true,
        [FEATURE_GATES.PERSONAL_RECIPES]: true,
        [FEATURE_GATES.WRITE_REVIEW]: true,
        [FEATURE_GATES.COMMON_ITEMS_WIZARD]: true,
        [FEATURE_GATES.CREATE_MEAL_PLAN]: true,
        [FEATURE_GATES.EMAIL_SHARING]: true,
        [FEATURE_GATES.EMAIL_NOTIFICATIONS]: true, // NEW: Gold users can get email notifications
        [FEATURE_GATES.NUTRITION_ACCESS]: true,
        [FEATURE_GATES.NUTRITION_SEARCH]: true,
        [FEATURE_GATES.NUTRITION_ANALYSIS]: true,
        [FEATURE_GATES.NUTRITION_GOALS]: true,
        [FEATURE_GATES.RECIPE_COLLECTIONS]: true,
        [FEATURE_GATES.PUBLIC_RECIPES]: true, // Gold users can access public recipe features
        [FEATURE_GATES.MAKE_RECIPE_PUBLIC]: true // Gold users can make recipes public (limited by usage)
    },
    [SUBSCRIPTION_TIERS.PLATINUM]: {
        [FEATURE_GATES.INVENTORY_LIMIT]: true,
        [FEATURE_GATES.UPC_SCANNING]: true,
        [FEATURE_GATES.BULK_INVENTORY_ADD]: true,
        [FEATURE_GATES.PERSONAL_RECIPES]: true,
        [FEATURE_GATES.WRITE_REVIEW]: true,
        [FEATURE_GATES.COMMON_ITEMS_WIZARD]: true,
        [FEATURE_GATES.CREATE_MEAL_PLAN]: true,
        [FEATURE_GATES.EMAIL_SHARING]: true,
        [FEATURE_GATES.EMAIL_NOTIFICATIONS]: true, // NEW: Platinum users can get email notifications
        [FEATURE_GATES.NUTRITION_ACCESS]: true,
        [FEATURE_GATES.NUTRITION_SEARCH]: true,
        [FEATURE_GATES.NUTRITION_ANALYSIS]: true,
        [FEATURE_GATES.NUTRITION_GOALS]: true,
        [FEATURE_GATES.RECIPE_COLLECTIONS]: true,
        [FEATURE_GATES.PUBLIC_RECIPES]: true, // Platinum users can access public recipe features
        [FEATURE_GATES.MAKE_RECIPE_PUBLIC]: true // Platinum users can make unlimited public recipes
    }
};

// Helper functions
export function getSubscriptionTier(subscription) {
    if (!subscription || subscription.status === 'free') {
        return SUBSCRIPTION_TIERS.FREE;
    }

    if (subscription.status === 'trial' || subscription.status === 'active') {
        return subscription.tier || SUBSCRIPTION_TIERS.FREE;
    }

    return SUBSCRIPTION_TIERS.FREE;
}

export function checkFeatureAccess(subscription, feature) {
    const tier = getSubscriptionTier(subscription);
    return FEATURE_ACCESS[tier]?.[feature] || false;
}

export function checkUsageLimit(subscription, limitType, currentUsage) {
    const tier = getSubscriptionTier(subscription);
    const limit = USAGE_LIMITS[tier]?.[limitType];

    if (limit === -1) return true; // unlimited
    if (limit === 0) return false; // not allowed
    if (limit === undefined) return true; // no limit defined

    return currentUsage < limit;
}

export function getUsageLimit(subscription, limitType) {
    const tier = getSubscriptionTier(subscription);
    return USAGE_LIMITS[tier]?.[limitType] || 0;
}

export function getRemainingUsage(subscription, limitType, currentUsage) {
    const limit = getUsageLimit(subscription, limitType);
    if (limit === -1) return -1; // unlimited
    return Math.max(0, limit - currentUsage);
}

// Helper function to get required tier for a feature
export function getRequiredTier(feature) {
    // Find the lowest tier that has access to this feature
    const tiers = [SUBSCRIPTION_TIERS.FREE, SUBSCRIPTION_TIERS.GOLD, SUBSCRIPTION_TIERS.PLATINUM];

    for (const tier of tiers) {
        if (FEATURE_ACCESS[tier]?.[feature]) {
            return tier;
        }
    }

    return SUBSCRIPTION_TIERS.PLATINUM; // Default to highest tier if not found
}

// Helper function to get upgrade message for a feature
export function getUpgradeMessage(feature, requiredTier) {
    const featureDescription = FEATURE_DESCRIPTIONS[feature] || 'This feature';
    const tierName = requiredTier === SUBSCRIPTION_TIERS.GOLD ? 'Gold' : 'Platinum';

    return `${featureDescription} requires a ${tierName} subscription. Upgrade to unlock this feature.`;
}

// Feature descriptions for UI
export const FEATURE_DESCRIPTIONS = {
    [FEATURE_GATES.INVENTORY_LIMIT]: 'Track your food inventory',
    [FEATURE_GATES.UPC_SCANNING]: 'Scan product barcodes',
    [FEATURE_GATES.RECEIPT_SCAN]: 'Scan grocery receipts to quickly add items to inventory',
    [FEATURE_GATES.BULK_INVENTORY_ADD]: 'Add multiple items at once',
    [FEATURE_GATES.PERSONAL_RECIPES]: 'Create and save your own recipes',
    [FEATURE_GATES.WRITE_REVIEW]: 'Write and read recipe reviews',
    [FEATURE_GATES.COMMON_ITEMS_WIZARD]: 'Quick-add common household items',
    [FEATURE_GATES.CREATE_MEAL_PLAN]: 'Plan your meals for the week',
    [FEATURE_GATES.EMAIL_SHARING]: 'Share shopping lists via email',
    [FEATURE_GATES.EMAIL_NOTIFICATIONS]: 'Receive expiration alerts via email', // NEW
    [FEATURE_GATES.NUTRITION_ACCESS]: 'View detailed nutrition facts',
    [FEATURE_GATES.NUTRITION_SEARCH]: 'Search nutrition database',
    [FEATURE_GATES.NUTRITION_ANALYSIS]: 'Analyze meal plan nutrition',
    [FEATURE_GATES.NUTRITION_GOALS]: 'Set and track nutrition goals',
    [FEATURE_GATES.RECIPE_COLLECTIONS]: 'Organize recipes in collections',
    [FEATURE_GATES.PUBLIC_RECIPES]: 'Share recipes with the community',
    [FEATURE_GATES.MAKE_RECIPE_PUBLIC]: 'Make individual recipes public'
};