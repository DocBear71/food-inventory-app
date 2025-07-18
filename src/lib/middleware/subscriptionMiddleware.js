// file: /src/lib/middleware/subscriptionMiddleware.js v2 - FIXED: Use proper feature gates

import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import {
    checkFeatureAccess,
    checkUsageLimit,
    getUpgradeMessage,
    getRequiredTier,
    FEATURE_GATES // FIXED: Import the actual feature gates
} from '@/lib/subscription-config';

export async function withSubscriptionCheck(handler, requiredFeature, options = {}) {
    return async (req, res) => {
        try {
            // Get the session
            const session = await auth();

            if (!session?.user?.id) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Connect to database and get user
            await connectDB();
            const user = await User.findById(session.user.id);

            if (!user) {
                return res.status(404).json({
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Prepare subscription object for checking
            const userSubscription = {
                tier: user.getEffectiveTier(),
                status: user.subscription?.status || 'free'
            };

            // Check if user has access to the required feature
            const hasFeatureAccess = checkFeatureAccess(userSubscription, requiredFeature);

            if (!hasFeatureAccess) {
                const requiredTier = getRequiredTier(requiredFeature);
                return res.status(403).json({
                    error: getUpgradeMessage(requiredFeature, requiredTier),
                    code: 'FEATURE_NOT_AVAILABLE',
                    feature: requiredFeature,
                    currentTier: userSubscription.tier,
                    requiredTier: requiredTier,
                    upgradeUrl: `/pricing?source=api-gate&feature=${requiredFeature}&required=${requiredTier}`
                });
            }

            // Check usage limits if specified
            if (options.checkUsageLimit && options.getCurrentCount) {
                const currentCount = await options.getCurrentCount(user, session);
                const hasCapacity = checkUsageLimit(userSubscription, requiredFeature, currentCount);

                if (!hasCapacity) {
                    const requiredTier = getRequiredTier(requiredFeature);
                    return res.status(403).json({
                        error: getUpgradeMessage(requiredFeature, requiredTier),
                        code: 'USAGE_LIMIT_EXCEEDED',
                        feature: requiredFeature,
                        currentCount: currentCount,
                        currentTier: userSubscription.tier,
                        requiredTier: requiredTier,
                        upgradeUrl: `/pricing?source=api-gate&feature=${requiredFeature}&required=${requiredTier}`
                    });
                }
            }

            // Add user and subscription info to request
            req.user = user;
            req.subscription = userSubscription;

            // Call the original handler
            return handler(req, res);

        } catch (error) {
            console.error('Subscription middleware error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                code: 'SERVER_ERROR'
            });
        }
    };
}

// Helper function to track usage after successful API call
export async function trackUsage(userId, feature, count = 1) {
    try {
        await connectDB();
        const user = await User.findById(userId);

        if (!user) {
            console.error('User not found for usage tracking:', userId);
            return { success: false, error: 'User not found' };
        }

        // FIXED: Use proper feature gate constants instead of strings
        switch (feature) {
            case FEATURE_GATES.UPC_SCANNING: // FIXED: Use feature gate constant
                await user.trackUPCScan();
                break;
            case FEATURE_GATES.RECEIPT_SCAN:
                await user.trackReceiptScan();
                break;
            case FEATURE_GATES.INVENTORY_LIMIT:
                // Count will be updated by the API endpoint that creates/deletes items
                break;
            case FEATURE_GATES.PERSONAL_RECIPES:
                // Count will be updated by the API endpoint that creates/deletes recipes
                break;
            default:
                console.log('No tracking needed for feature:', feature);
        }

        return { success: true };
    } catch (error) {
        console.error('Error tracking usage:', error);
        return { success: false, error: 'Failed to track usage' };
    }
}

// Specific middleware functions for common use cases

// FIXED: Middleware for UPC scanning
export function withUPCScanLimit(handler) {
    return withSubscriptionCheck(
        handler,
        FEATURE_GATES.UPC_SCANNING, // FIXED: Use proper feature gate
        {
            checkUsageLimit: true,
            getCurrentCount: async (user) => {
                // Reset monthly counter if needed
                const now = new Date();
                if (!user.usageTracking ||
                    user.usageTracking.currentMonth !== now.getMonth() ||
                    user.usageTracking.currentYear !== now.getFullYear()) {
                    return 0;
                }
                return user.usageTracking.monthlyUPCScans || 0;
            }
        }
    );
}

// FIXED: Middleware for inventory item limits
export function withInventoryLimit(handler) {
    return withSubscriptionCheck(
        handler,
        FEATURE_GATES.INVENTORY_LIMIT, // FIXED: Use proper feature gate
        {
            checkUsageLimit: true,
            getCurrentCount: async (user) => {
                const { UserInventory } = require('@/lib/models');
                const inventory = await UserInventory.findOne({ userId: user._id });
                return inventory?.items?.length || 0;
            }
        }
    );
}

// FIXED: Middleware for personal recipe limits
export function withPersonalRecipeLimit(handler) {
    return withSubscriptionCheck(
        handler,
        FEATURE_GATES.PERSONAL_RECIPES, // FIXED: Use proper feature gate
        {
            checkUsageLimit: true,
            getCurrentCount: async (user) => {
                const { Recipe } = require('@/lib/models');
                return await Recipe.countDocuments({ createdBy: user._id });
            }
        }
    );
}

// FIXED: Middleware for receipt scanning
export function withReceiptScanLimit(handler) {
    return withSubscriptionCheck(
        handler,
        FEATURE_GATES.RECEIPT_SCAN, // FIXED: Use proper feature gate
        {
            checkUsageLimit: true,
            getCurrentCount: async (user) => {
                const now = new Date();
                if (!user.usageTracking ||
                    user.usageTracking.currentMonth !== now.getMonth() ||
                    user.usageTracking.currentYear !== now.getFullYear()) {
                    return 0;
                }
                return user.usageTracking.monthlyReceiptScans || 0;
            }
        }
    );
}

// Middleware for features that don't need usage tracking (just tier check)
export function withFeatureAccess(feature) {
    return function(handler) {
        return withSubscriptionCheck(handler, feature);
    };
}