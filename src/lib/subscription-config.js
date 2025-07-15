// file: /src/lib/subscription-config.js v10 - Added ADMIN tier support

// Subscription tier definitions
export const SUBSCRIPTION_TIERS = {
    FREE: 'free',
    GOLD: 'gold',
    PLATINUM: 'platinum',
    ADMIN: 'admin' // NEW: Admin tier
};

// Feature gate definitions (unchanged)
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
    CONSUMPTION_HISTORY: 'consumption_history', // FIXED: lowercase
    CREATE_MEAL_PLAN: 'create_meal_plan',
    EMAIL_SHARING: 'email_sharing',
    EMAIL_NOTIFICATIONS: 'email_notifications',

    // Nutrition features
    NUTRITION_ACCESS: 'nutrition_access',
    NUTRITION_SEARCH: 'nutrition_search',
    NUTRITION_ANALYSIS: 'nutrition_analysis',
    NUTRITION_GOALS: 'nutrition_goals',

    // Recipe collections and public recipes
    RECIPE_COLLECTIONS: 'recipe_collections',
    SAVE_RECIPE: 'save_recipe',
    PUBLIC_RECIPES: 'public_recipes',
    MAKE_RECIPE_PUBLIC: 'make_recipe_public',

    // 🆕 ADD THESE NEW PRICE TRACKING FEATURES:
    PRICE_TRACKING: 'price_tracking',
    PRICE_HISTORY: 'price_history',
    PRICE_ALERTS: 'price_alerts',
    PRICE_EXPORT: 'price_export'
};

// Usage limits by tier
export const USAGE_LIMITS = {
    [SUBSCRIPTION_TIERS.FREE]: {
        inventoryItems: 50,
        upcScansPerMonth: 10,
        monthlyReceiptScans: 2,
        personalRecipes: 5,
        savedRecipes: 10,
        publicRecipes: 0,
        recipeCollections: 2,
        mealPlansActive: 0,
        emailSharesPerMonth: 0,
        emailNotificationsPerMonth: 0,
        priceTrackingItems: 10,        // Can track prices for 10 items
        priceEntriesPerMonth: 25,      // Can add 25 price entries per month
        priceHistoryDays: 30          // Keep 30 days of price history
    },
    [SUBSCRIPTION_TIERS.GOLD]: {
        inventoryItems: 250,
        upcScansPerMonth: -1, // unlimited
        monthlyReceiptScans: 20,
        personalRecipes: 100,
        savedRecipes: 200,
        publicRecipes: 25,
        recipeCollections: 10,
        mealPlansActive: 3,
        emailSharesPerMonth: 50,
        emailNotificationsPerMonth: 100,
        priceTrackingItems: 50,        // Can track prices for 50 items
        priceEntriesPerMonth: 100,     // Can add 100 price entries per month
        priceHistoryDays: 180         // Keep 180 days of price history
    },
    [SUBSCRIPTION_TIERS.PLATINUM]: {
        inventoryItems: -1, // unlimited
        upcScansPerMonth: -1, // unlimited
        monthlyReceiptScans: -1, // unlimited
        personalRecipes: -1, // unlimited
        savedRecipes: -1, // unlimited
        publicRecipes: -1,
        recipeCollections: -1, // unlimited
        mealPlansActive: -1, // unlimited
        emailSharesPerMonth: -1, // unlimited
        emailNotificationsPerMonth: -1,
        priceTrackingItems: -1,        // Unlimited price tracking
        priceEntriesPerMonth: -1,      // Unlimited price entries
        priceHistoryDays: -1          // Keep unlimited price history
    },
    // NEW: Admin tier - unlimited everything
    [SUBSCRIPTION_TIERS.ADMIN]: {
        inventoryItems: -1, // unlimited
        upcScansPerMonth: -1, // unlimited
        monthlyReceiptScans: -1, // unlimited
        personalRecipes: -1, // unlimited
        savedRecipes: -1, // unlimited
        publicRecipes: -1, // unlimited
        recipeCollections: -1, // unlimited
        mealPlansActive: -1, // unlimited
        emailSharesPerMonth: -1, // unlimited
        emailNotificationsPerMonth: -1, // unlimited
        priceTrackingItems: -1,        // Unlimited price tracking
        priceEntriesPerMonth: -1,      // Unlimited price entries
        priceHistoryDays: -1          // Keep unlimited price history
    }
};

// Feature access by tier
export const FEATURE_ACCESS = {
    [SUBSCRIPTION_TIERS.FREE]: {
        [FEATURE_GATES.INVENTORY_LIMIT]: true,
        [FEATURE_GATES.UPC_SCANNING]: true,
        [FEATURE_GATES.BULK_INVENTORY_ADD]: false,
        [FEATURE_GATES.PERSONAL_RECIPES]: true,
        [FEATURE_GATES.RECEIPT_SCAN]: true,
        [FEATURE_GATES.WRITE_REVIEW]: false,
        [FEATURE_GATES.COMMON_ITEMS_WIZARD]: false,
        [FEATURE_GATES.CONSUMPTION_HISTORY]: false,
        [FEATURE_GATES.CREATE_MEAL_PLAN]: false,
        [FEATURE_GATES.EMAIL_SHARING]: false,
        [FEATURE_GATES.EMAIL_NOTIFICATIONS]: false,
        [FEATURE_GATES.NUTRITION_ACCESS]: false,
        [FEATURE_GATES.NUTRITION_SEARCH]: false,
        [FEATURE_GATES.NUTRITION_ANALYSIS]: false,
        [FEATURE_GATES.NUTRITION_GOALS]: false,
        [FEATURE_GATES.RECIPE_COLLECTIONS]: true, // limited by usage
        [FEATURE_GATES.SAVE_RECIPE]: true, // limited
        [FEATURE_GATES.PUBLIC_RECIPES]: false,
        [FEATURE_GATES.MAKE_RECIPE_PUBLIC]: false,
        [FEATURE_GATES.PRICE_TRACKING]: true,     // Basic price tracking (limited)
        [FEATURE_GATES.PRICE_HISTORY]: true,      // View price history (limited)
        [FEATURE_GATES.PRICE_ALERTS]: false,      // No price alerts
        [FEATURE_GATES.PRICE_EXPORT]: false       // No price export
    },
    [SUBSCRIPTION_TIERS.GOLD]: {
        [FEATURE_GATES.INVENTORY_LIMIT]: true,
        [FEATURE_GATES.UPC_SCANNING]: true,
        [FEATURE_GATES.BULK_INVENTORY_ADD]: true,
        [FEATURE_GATES.PERSONAL_RECIPES]: true,
        [FEATURE_GATES.RECEIPT_SCAN]: true,
        [FEATURE_GATES.WRITE_REVIEW]: true,
        [FEATURE_GATES.COMMON_ITEMS_WIZARD]: true,
        [FEATURE_GATES.CONSUMPTION_HISTORY]: true,
        [FEATURE_GATES.CREATE_MEAL_PLAN]: true,
        [FEATURE_GATES.EMAIL_SHARING]: true,
        [FEATURE_GATES.EMAIL_NOTIFICATIONS]: true,
        [FEATURE_GATES.NUTRITION_ACCESS]: true,
        [FEATURE_GATES.NUTRITION_SEARCH]: true,
        [FEATURE_GATES.NUTRITION_ANALYSIS]: true,
        [FEATURE_GATES.NUTRITION_GOALS]: true,
        [FEATURE_GATES.RECIPE_COLLECTIONS]: true,
        [FEATURE_GATES.SAVE_RECIPE]: true,
        [FEATURE_GATES.PUBLIC_RECIPES]: true,
        [FEATURE_GATES.MAKE_RECIPE_PUBLIC]: true,
        [FEATURE_GATES.PRICE_TRACKING]: true,     // Enhanced price tracking
        [FEATURE_GATES.PRICE_HISTORY]: true,      // Extended price history
        [FEATURE_GATES.PRICE_ALERTS]: false,      // No email alerts yet
        [FEATURE_GATES.PRICE_EXPORT]: false       // No export yet
    },
    [SUBSCRIPTION_TIERS.PLATINUM]: {
        [FEATURE_GATES.INVENTORY_LIMIT]: true,
        [FEATURE_GATES.UPC_SCANNING]: true,
        [FEATURE_GATES.BULK_INVENTORY_ADD]: true,
        [FEATURE_GATES.PERSONAL_RECIPES]: true,
        [FEATURE_GATES.RECEIPT_SCAN]: true,
        [FEATURE_GATES.WRITE_REVIEW]: true,
        [FEATURE_GATES.COMMON_ITEMS_WIZARD]: true,
        [FEATURE_GATES.CONSUMPTION_HISTORY]: true,
        [FEATURE_GATES.CREATE_MEAL_PLAN]: true,
        [FEATURE_GATES.EMAIL_SHARING]: true,
        [FEATURE_GATES.EMAIL_NOTIFICATIONS]: true,
        [FEATURE_GATES.NUTRITION_ACCESS]: true,
        [FEATURE_GATES.NUTRITION_SEARCH]: true,
        [FEATURE_GATES.NUTRITION_ANALYSIS]: true,
        [FEATURE_GATES.NUTRITION_GOALS]: true,
        [FEATURE_GATES.RECIPE_COLLECTIONS]: true,
        [FEATURE_GATES.SAVE_RECIPE]: true,
        [FEATURE_GATES.PUBLIC_RECIPES]: true,
        [FEATURE_GATES.MAKE_RECIPE_PUBLIC]: true,
        [FEATURE_GATES.PRICE_TRACKING]: true,     // Unlimited price tracking
        [FEATURE_GATES.PRICE_HISTORY]: true,      // Unlimited price history
        [FEATURE_GATES.PRICE_ALERTS]: true,       // Email price alerts
        [FEATURE_GATES.PRICE_EXPORT]: true        // Export price data
    },
    // NEW: Admin tier - access to everything
    [SUBSCRIPTION_TIERS.ADMIN]: {
        [FEATURE_GATES.INVENTORY_LIMIT]: true,
        [FEATURE_GATES.UPC_SCANNING]: true,
        [FEATURE_GATES.BULK_INVENTORY_ADD]: true,
        [FEATURE_GATES.PERSONAL_RECIPES]: true,
        [FEATURE_GATES.RECEIPT_SCAN]: true,
        [FEATURE_GATES.WRITE_REVIEW]: true,
        [FEATURE_GATES.COMMON_ITEMS_WIZARD]: true,
        [FEATURE_GATES.CONSUMPTION_HISTORY]: true,
        [FEATURE_GATES.CREATE_MEAL_PLAN]: true,
        [FEATURE_GATES.EMAIL_SHARING]: true,
        [FEATURE_GATES.EMAIL_NOTIFICATIONS]: true,
        [FEATURE_GATES.NUTRITION_ACCESS]: true,
        [FEATURE_GATES.NUTRITION_SEARCH]: true,
        [FEATURE_GATES.NUTRITION_ANALYSIS]: true,
        [FEATURE_GATES.NUTRITION_GOALS]: true,
        [FEATURE_GATES.RECIPE_COLLECTIONS]: true,
        [FEATURE_GATES.SAVE_RECIPE]: true,
        [FEATURE_GATES.PUBLIC_RECIPES]: true,
        [FEATURE_GATES.MAKE_RECIPE_PUBLIC]: true,
        [FEATURE_GATES.PRICE_TRACKING]: true,     // Unlimited price tracking
        [FEATURE_GATES.PRICE_HISTORY]: true,      // Unlimited price history
        [FEATURE_GATES.PRICE_ALERTS]: true,       // Email price alerts
        [FEATURE_GATES.PRICE_EXPORT]: true        // Export price data
    }
};

// Helper functions (updated to handle admin tier)
export function getSubscriptionTier(subscription) {
    if (!subscription || subscription.status === 'free') {
        return SUBSCRIPTION_TIERS.FREE;
    }

    // NEW: Check for admin status first
    if (subscription.tier === 'admin') {
        return SUBSCRIPTION_TIERS.ADMIN;
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

export function checkUsageLimit(subscription, feature, currentUsage) {
    const tier = getSubscriptionTier(subscription);

    // NEW: Admin always has unlimited access
    if (tier === SUBSCRIPTION_TIERS.ADMIN) {
        return true;
    }

    // Map feature gates to usage limit keys
    let limitKey;
    switch (feature) {
        case FEATURE_GATES.INVENTORY_LIMIT:
            limitKey = 'inventoryItems';
            break;
        case FEATURE_GATES.UPC_SCANNING:
            limitKey = 'upcScansPerMonth';
            break;
        case FEATURE_GATES.RECEIPT_SCAN:
            limitKey = 'monthlyReceiptScans';
            break;
        case FEATURE_GATES.PERSONAL_RECIPES:
            limitKey = 'personalRecipes';
            break;
        case FEATURE_GATES.SAVE_RECIPE:
            limitKey = 'savedRecipes';
            break;
        case FEATURE_GATES.MAKE_RECIPE_PUBLIC:
            limitKey = 'publicRecipes';
            break;
        case FEATURE_GATES.RECIPE_COLLECTIONS:
            limitKey = 'recipeCollections';
            break;
        case FEATURE_GATES.PRICE_TRACKING:
            limitKey = 'priceTrackingItems';
            break;
        case 'priceEntriesPerMonth':  // Special case for monthly price entries
            limitKey = 'priceEntriesPerMonth';
            break;
        case 'priceHistoryDays':      // Special case for price history retention
            limitKey = 'priceHistoryDays';
            break;
        default:
            // For access-only features, check if tier has access
            return checkFeatureAccess(subscription, feature);
    }

    const limit = USAGE_LIMITS[tier]?.[limitKey];

    if (limit === undefined) return true; // no limit defined, allow access
    if (limit === -1) return true; // unlimited
    if (limit === 0) return false; // not allowed

    return currentUsage < limit;
}

export function getUsageLimit(subscription, limitType) {
    const tier = getSubscriptionTier(subscription);
    return USAGE_LIMITS[tier]?.[limitType] || 0;
}

export function getRemainingUsage(subscription, feature, currentUsage) {
    const tier = getSubscriptionTier(subscription);

    // NEW: Admin always has unlimited
    if (tier === SUBSCRIPTION_TIERS.ADMIN) {
        return 'Unlimited';
    }

    // Map feature gates to usage limit keys
    let limitKey;
    switch (feature) {
        case FEATURE_GATES.INVENTORY_LIMIT:
            limitKey = 'inventoryItems';
            break;
        case FEATURE_GATES.UPC_SCANNING:
            limitKey = 'upcScansPerMonth';
            break;
        case FEATURE_GATES.RECEIPT_SCAN:
            limitKey = 'monthlyReceiptScans';
            break;
        case FEATURE_GATES.PERSONAL_RECIPES:
            limitKey = 'personalRecipes';
            break;
        case FEATURE_GATES.SAVE_RECIPE:
            limitKey = 'savedRecipes';
            break;
        case FEATURE_GATES.MAKE_RECIPE_PUBLIC:
            limitKey = 'publicRecipes';
            break;
        case FEATURE_GATES.RECIPE_COLLECTIONS:
            limitKey = 'recipeCollections';
            break;
        case FEATURE_GATES.PRICE_TRACKING:
            limitKey = 'priceTrackingItems';
            break;
        case 'priceEntriesPerMonth':
            limitKey = 'priceEntriesPerMonth';
            break;
        case 'priceHistoryDays':
            limitKey = 'priceHistoryDays';
            break;
        default:
            return 0;
    }

    const limit = USAGE_LIMITS[tier]?.[limitKey];
    if (limit === -1) return 'Unlimited';
    if (limit === undefined || limit === 0) return 0;

    return Math.max(0, limit - currentUsage);
}

// Helper function to get required tier for a feature
export function getRequiredTier(feature) {
    const tiers = [SUBSCRIPTION_TIERS.FREE, SUBSCRIPTION_TIERS.GOLD, SUBSCRIPTION_TIERS.PLATINUM];

    for (const tier of tiers) {
        if (FEATURE_ACCESS[tier]?.[feature]) {
            return tier;
        }
    }

    return SUBSCRIPTION_TIERS.PLATINUM;
}

// Helper function to get upgrade message for a feature
export function getUpgradeMessage(feature, requiredTier) {
    const featureDescription = FEATURE_DESCRIPTIONS[feature] || 'This feature';
    const tierName = requiredTier === SUBSCRIPTION_TIERS.GOLD ? 'Gold' : 'Platinum';

    return `${featureDescription} requires a ${tierName} subscription. Upgrade to unlock this feature.`;
}

// Feature descriptions for UI (unchanged, no need to show admin features to users)
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
    [FEATURE_GATES.EMAIL_NOTIFICATIONS]: 'Receive expiration alerts via email',
    [FEATURE_GATES.NUTRITION_ACCESS]: 'View detailed nutrition facts',
    [FEATURE_GATES.NUTRITION_SEARCH]: 'Search nutrition database',
    [FEATURE_GATES.NUTRITION_ANALYSIS]: 'Analyze meal plan nutrition',
    [FEATURE_GATES.NUTRITION_GOALS]: 'Set and track nutrition goals',
    [FEATURE_GATES.RECIPE_COLLECTIONS]: 'Organize recipes in collections',
    [FEATURE_GATES.SAVE_RECIPE]: 'Save individual recipes for quick access',
    [FEATURE_GATES.PUBLIC_RECIPES]: 'Share recipes with the community',
    [FEATURE_GATES.MAKE_RECIPE_PUBLIC]: 'Make individual recipes public',
    [FEATURE_GATES.PRICE_TRACKING]: 'Track grocery prices for your inventory items',
    [FEATURE_GATES.PRICE_HISTORY]: 'View historical price data and trends',
    [FEATURE_GATES.PRICE_ALERTS]: 'Get email alerts when prices drop below your target',
    [FEATURE_GATES.PRICE_EXPORT]: 'Export price data for analysis'
};