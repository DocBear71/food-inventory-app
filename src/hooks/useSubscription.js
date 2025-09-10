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

const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) {
    const { data: session, status, update: updateSession } = useSafeSession();
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isFetching, setIsFetching] = useState(false);

    const fetchTimeoutRef = useRef(null);
    const lastFetchRef = useRef(0);

    // FIXED: Add maximum retry limit and better error handling
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds
    const FETCH_COOLDOWN = 3000; // 3 seconds between fetches

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
        setIsFetching(false);
        lastFetchRef.current = 0;
    }, []);

    // FIXED: Enhanced fetch function with better cache busting and loop prevention
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

        // FIXED: Prevent excessive calls and concurrent fetches
        const now = Date.now();
        if (isFetching || retryCount >= MAX_RETRIES) {
            console.log('Subscription fetch blocked - already fetching or max retries reached');
            return;
        }

        if (!force && (now - lastFetchRef.current) < FETCH_COOLDOWN) {
            console.log('Subscription fetch throttled - too soon since last call');
            return;
        }

        // Clear any existing timeout
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        setIsFetching(true);
        setLoading(true);
        setError(null);
        lastFetchRef.current = now;

        try {
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
                    'X-Cache-Buster': cacheBreaker
                },
                cache: 'no-store'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Subscription data fetched:', data);

                setSubscriptionData(data);
                setError(null);
                setRetryCount(0);

                // Store in sessionStorage with timestamp for debugging
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
                console.error('❌ Subscription fetch error:', errorMessage);

                if (response.status === 401) {
                    console.log('User not authenticated, clearing subscription data');
                    clearSubscriptionCache();
                } else if (retryCount < MAX_RETRIES) {
                    console.log(`⏳ Retrying subscription fetch (${retryCount + 1}/${MAX_RETRIES}) in ${RETRY_DELAY}ms`);

                    fetchTimeoutRef.current = setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                        setIsFetching(false);
                        fetchSubscriptionData(true);
                    }, RETRY_DELAY);
                } else {
                    console.log('❌ Max retries reached, using fallback data');
                    // Use fallback data from session if available
                    const fallbackTier = session?.user?.subscriptionTier || session?.user?.effectiveTier || 'free';
                    const fallbackIsAdmin = session?.user?.isAdmin || false;

                    setSubscriptionData({
                        tier: fallbackTier,
                        isAdmin: fallbackIsAdmin,
                        isActive: true,
                        isTrialActive: false,
                        usage: {},
                        timestamp: new Date().toISOString()
                    });
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Subscription Error',
                        message: 'Failed to fetch subscription data - using fallback'
                    });
                }
            }
        } catch (err) {
            console.error('❌ Network error fetching subscription data:', err);

            if (session?.user?.id && retryCount < MAX_RETRIES) {
                const retryDelay = Math.pow(2, retryCount) * RETRY_DELAY;
                console.log(`⏳ Retrying subscription fetch in ${retryDelay}ms due to network error`);

                fetchTimeoutRef.current = setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                    setIsFetching(false);
                    fetchSubscriptionData(true);
                }, retryDelay);
            } else {
                console.log('❌ Network error - max retries reached or no session');
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Network Error',
                    message: 'Network error while fetching subscription data'
                });
            }
        } finally {
            setIsFetching(false);
            setLoading(false);
        }
    }, [isFetching, retryCount, clearSubscriptionCache, session?.user?.subscriptionTier, session?.user?.effectiveTier, session?.user?.isAdmin, session?.user?.id]);

    // CRITICAL FIX: Force refresh from database and update session
    const refreshFromDatabase = useCallback(async () => {
        try {
            console.log('🔄 Refreshing subscription data from database...');

            // Step 1: Force refresh session first to get latest data
            console.log('🔄 Step 1: Refreshing session from database...');
            await updateSession();

            // Step 2: Check for monthly reset
            const resetResponse = await apiPost('/api/auth/check-monthly-reset');

            if (resetResponse.ok) {
                const resetData = await resetResponse.json();

                if (resetData.wasReset) {
                    console.log('📅 Monthly usage was reset!');
                }

                // Step 3: Refresh subscription data from database
                const refreshResponse = await apiPost('/api/auth/refresh-session');

                if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();

                    // Step 4: Update session again with fresh data
                    await updateSession();

                    // Step 5: Force fetch subscription data from API
                    await fetchSubscriptionData(true);

                    console.log('✅ Refreshed subscription data from database');
                    return true;
                } else {
                    console.error('❌ Failed to refresh session data:', refreshResponse.status);
                    // Still try to fetch fresh data
                    await fetchSubscriptionData(true);
                    return false;
                }
            } else {
                console.error('❌ Failed to check monthly reset:', resetResponse.status);
                // Still try to fetch fresh data
                await fetchSubscriptionData(true);
                return false;
            }
        } catch (error) {
            console.error('❌ Error refreshing from database:', error);
            // Fallback to just fetching subscription data
            await fetchSubscriptionData(true);
            return false;
        }
    }, [updateSession, fetchSubscriptionData]);

    // CRITICAL FIX: Post-purchase refresh function
    const refreshAfterPurchase = useCallback(async () => {
        try {
            console.log('💳 Post-purchase refresh: Starting complete refresh cycle...');

            // Step 1: Clear all caches
            clearSubscriptionCache();

            // Step 2: Force session refresh from database multiple times
            console.log('💳 Step 1: Multiple session refreshes...');
            await updateSession();
            await new Promise(resolve => setTimeout(resolve, 500));
            await updateSession();
            await new Promise(resolve => setTimeout(resolve, 500));
            await updateSession();

            // Step 3: Force multiple subscription data fetches
            console.log('💳 Step 2: Multiple subscription data fetches...');
            await fetchSubscriptionData(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await fetchSubscriptionData(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await fetchSubscriptionData(true);

            // Step 4: Continue background refreshes
            setTimeout(async () => {
                console.log('💳 Step 3: Background refresh 1...');
                await updateSession();
                await fetchSubscriptionData(true);
            }, 3000);

            setTimeout(async () => {
                console.log('💳 Step 4: Background refresh 2...');
                await updateSession();
                await fetchSubscriptionData(true);
            }, 5000);

            console.log('✅ Post-purchase refresh completed');
            return true;
        } catch (error) {
            console.error('❌ Error in post-purchase refresh:', error);
            return false;
        }
    }, [clearSubscriptionCache, updateSession, fetchSubscriptionData]);

    // FIXED: Clear signout flags for admin user and prevent API calls
    // In the useSubscription hook, update this section:
    useEffect(() => {
        // CRITICAL FIX: Only apply admin override if user has NO PAID SUBSCRIPTION
        const hasPaidSubscription = session?.user?.subscription?.tier !== 'free' &&
            session?.user?.subscription?.status === 'active' &&
            (session?.user?.subscription?.platform === 'revenuecat' ||
                session?.user?.subscription?.platform === 'stripe');

        // Check for admin email but ONLY override if no paid subscription exists
        if ((session?.user?.email === 'e.g.mckeown@gmail.com' || session?.user?.isAdmin === true) &&
            !hasPaidSubscription) {

            console.log('🧹 SubscriptionProvider: Admin user detected with NO paid subscription - applying admin override');

            if (typeof window !== 'undefined') {
                localStorage.removeItem('prevent-session-calls');
                sessionStorage.removeItem('signout-in-progress');
                sessionStorage.removeItem('just-signed-out');
            }

            // Only set admin data if no paid subscription exists
            if (session?.user) {
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
                setRetryCount(0);
                setIsFetching(false);
            }
        } else if (hasPaidSubscription) {
            console.log('💳 SubscriptionProvider: User has paid subscription - NOT applying admin override');
            // Clear any signout flags but let the subscription data flow through normally
            if (typeof window !== 'undefined') {
                localStorage.removeItem('prevent-session-calls');
                sessionStorage.removeItem('signout-in-progress');
                sessionStorage.removeItem('just-signed-out');
            }
            // Don't set subscription data here - let it flow through the normal priority system
        }
    }, [session?.user?.email, session?.user?.isAdmin, session?.user?.subscriptionStatus, session?.user?.subscription]);


    // FIXED: Main effect with better session handling
    useEffect(() => {
        console.log('📊 SubscriptionProvider: Session status:', status);

        if (status === 'loading') {
            return; // Wait for session to load
        }

        // Check for signout flags
        const preventCalls = typeof window !== 'undefined' && localStorage.getItem('prevent-session-calls') === 'true';
        const signingOut = typeof window !== 'undefined' && sessionStorage.getItem('signout-in-progress') === 'true';
        const justSignedOut = typeof window !== 'undefined' && sessionStorage.getItem('just-signed-out') === 'true';

        if (preventCalls || signingOut || justSignedOut) {
            console.log('Subscription: Skipping data fetch - signout flags active');
            clearSubscriptionCache();
            return;
        }

        if (status === 'unauthenticated' || !session) {
            console.log('No session, clearing subscription data');
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
            setRetryCount(0);
            setIsFetching(false);
            return;
        }

        // 1. ALWAYS fetch from API first for your demo account
        if (session?.user?.email === 'demo@test.com' && session?.user?.id) {
            console.log('🚨 Demo account detected - forcing API fetch to get correct subscription data');
            fetchSubscriptionData(true);
            return;
        }

        // 2. Check for paid subscription FIRST - but only for other accounts
        const hasPaidSubscription = session?.user?.subscription?.tier !== 'free' &&
            session?.user?.subscription?.status === 'active' &&
            (session?.user?.subscription?.platform === 'revenuecat' ||
                session?.user?.subscription?.platform === 'stripe');

        if (hasPaidSubscription) {
            console.log('💳 User has paid subscription - using paid subscription data');
            const subscription = session.user.subscription;

            setSubscriptionData({
                tier: subscription.tier,
                status: subscription.status,
                isAdmin: session.user.isAdmin || false,
                isActive: subscription.status === 'active',
                isTrialActive: subscription.status === 'trial',
                hasUsedFreeTrial: Boolean(subscription.hasUsedFreeTrial),
                platform: subscription.platform,
                billingCycle: subscription.billingCycle,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                usage: session.user.usage || {},
                subscription: subscription,
                timestamp: new Date().toISOString()
            });
            setLoading(false);
            return;
        }

        // 3. Admin users - but ONLY if no paid subscription exists AND not demo account
        if ((session?.user?.isAdmin || session?.user?.email === 'e.g.mckeown@gmail.com') &&
            !hasPaidSubscription &&
            session?.user?.email !== 'demo@test.com') {
            console.log('📋 Admin user with no paid subscription - setting admin subscription');
            setSubscriptionData({
                tier: 'admin',
                isAdmin: true,
                isActive: true,
                isTrialActive: false,
                usage: session.user.usage || {},
                timestamp: new Date().toISOString()
            });
            setLoading(false);
            return;
        }

        // 2. Session has subscription object - use it directly (for mobile/enhanced sessions)
        if (session?.user?.subscription?.tier && session?.user?.subscription?.status) {
            console.log('📋 Using session subscription object:', session.user.subscription);
            console.log('📋 Session subscription status:', session.user.subscription.status);

            // FIXED: Ensure proper boolean conversion for hasUsedFreeTrial
            const hasUsedFreeTrial = Boolean(session.user.subscription.hasUsedFreeTrial);

            setSubscriptionData({
                tier: session.user.subscription.tier,
                status: session.user.subscription.status,
                isAdmin: session.user.isAdmin || false,
                isActive: session.user.subscription.status === 'active',
                isTrialActive: session.user.subscription.status === 'trial',
                hasUsedFreeTrial: hasUsedFreeTrial,
                usage: session.user.usage || {},
                subscription: session.user.subscription,
                timestamp: new Date().toISOString()
            });
            setLoading(false);
            return;
        }

        // 3. Session has individual subscription fields
        if (session?.user?.subscriptionTier || session?.user?.effectiveTier) {
            console.log('📋 Using session tier fields:', {
                subscriptionTier: session.user.subscriptionTier,
                effectiveTier: session.user.effectiveTier
            });

            // FIXED: Better extraction of hasUsedFreeTrial from multiple possible locations
            const hasUsedFreeTrial = Boolean(
                session.user.subscription?.hasUsedFreeTrial ||
                session.user.hasUsedFreeTrial
            );

            setSubscriptionData({
                tier: session.user.effectiveTier || session.user.subscriptionTier,
                isAdmin: session.user.isAdmin || false,
                isActive: true,
                isTrialActive: false,
                hasUsedFreeTrial: hasUsedFreeTrial,
                usage: session.user.usage || {},
                timestamp: new Date().toISOString()
            });
            setLoading(false);
            return;
        }

        // 4. For all other cases, fetch from API
        if (session?.user?.id) {
            console.log('📊 Fetching subscription data from API...');
            fetchSubscriptionData(true);
        }

        // Cleanup timeout on unmount or session change
        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, [session, status, clearSubscriptionCache, fetchSubscriptionData]);

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

    // Add this useEffect to your SubscriptionProvider, after your existing useEffects
    useEffect(() => {
        const initializeRevenueCat = async () => {
            if (status === 'authenticated' && session?.user?.id && typeof window !== 'undefined') {
                try {
                    // Only initialize on iOS
                    const userAgent = navigator.userAgent;
                    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

                    if (isIOS) {
                        const { Purchases } = await import('@revenuecat/purchases-capacitor');
                        const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY;

                        if (apiKey) {
                            console.log('🍎 Initializing RevenueCat on app start with user:', session.user.id);

                            await Purchases.configure({
                                apiKey: apiKey,
                                appUserID: session.user.id
                            });

                            console.log('✅ RevenueCat initialized successfully');

                            // Optionally check for existing purchases
                            const customerInfo = await Purchases.getCustomerInfo();
                            console.log('RevenueCat customer info:', {
                                userId: customerInfo.originalAppUserId,
                                activeSubscriptions: Object.keys(customerInfo.activeSubscriptions || {}),
                                activeEntitlements: Object.keys(customerInfo.entitlements?.active || {})
                            });
                        }
                    }
                } catch (error) {
                    console.error('❌ RevenueCat initialization error:', error);
                }
            }
        };

        initializeRevenueCat();
    }, [session?.user?.id, status]);

    const value = {
        subscriptionData,
        loading,
        error,
        refetch: refreshAfterPurchase, // CRITICAL FIX: Use proper refresh function
        forceRefresh,
        clearCache: clearSubscriptionCache,
        refreshFromDatabase,
        refreshAfterPurchase // CRITICAL FIX: Expose dedicated post-purchase refresh
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    const { data: session } = useSafeSession();
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }

    const {subscriptionData, loading, error, refetch, forceRefresh, clearCache, refreshFromDatabase, refreshAfterPurchase} = context;

    const isExpired = () => {
        return subscriptionData?.status === 'expired';
    };

    // Helper functions with better error handling
    const checkFeature = (feature) => {
        if (!subscriptionData) return false;

        // Admin always has access to all features
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

        // Admin always passes limit checks
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

        // Admin always has unlimited
        if (subscriptionData.isAdmin) return 'Unlimited';

        try {
            const currentCount = getCurrentUsageCount(feature);
            return getRemainingUsage(subscriptionData, feature, currentCount);
        } catch (err) {
            console.warn('Error getting remaining count:', err);
            return 0;
        }
    };

    // Admin status checks
    const isAdmin = () => {
        return subscriptionData?.isAdmin === true;
    };

    const getEffectiveTier = () => {
        if (subscriptionData?.isAdmin) {
            return 'admin';
        }
        // Force expired users to free tier for feature purposes
        if (isExpired()) {
            return 'free';
        }
        return subscriptionData?.tier || 'free';
    };

    const isGoldOrHigher = () => {
        if (subscriptionData?.isAdmin) return true;
        const tier = subscriptionData?.tier || 'free';
        return tier === 'gold' || tier === 'platinum';
    };

    const isPlatinum = () => {
        if (subscriptionData?.isAdmin) return true;
        return subscriptionData?.tier === 'platinum';
    };

    // Map feature gates to correct usage tracking fields
    const getCurrentUsageCount = (feature) => {
        if (!subscriptionData?.usage) return 0;

        switch (feature) {
            case FEATURE_GATES.INVENTORY_LIMIT:
                return subscriptionData.usage.totalInventoryItems || subscriptionData.usage.inventoryItems || 0;
            case FEATURE_GATES.PERSONAL_RECIPES:
                return subscriptionData.usage.totalPersonalRecipes || subscriptionData.usage.personalRecipes || 0;
            case FEATURE_GATES.UPC_SCANNING:
                return subscriptionData.usage.monthlyUPCScans || 0;  // Monthly
            case FEATURE_GATES.RECEIPT_SCAN:
                return subscriptionData.usage.monthlyReceiptScans || 0;  // Monthly
            case FEATURE_GATES.MAKE_RECIPE_PUBLIC:
                return subscriptionData.usage.totalPublicRecipes || subscriptionData.usage.publicRecipes || 0;
            case FEATURE_GATES.RECIPE_COLLECTIONS:
                return subscriptionData.usage.totalRecipeCollections || subscriptionData.usage.recipeCollections || 0;
            case FEATURE_GATES.SAVE_RECIPE:
                return subscriptionData.usage.totalSavedRecipes || subscriptionData.usage.savedRecipes || 0;
            default:
                return 0;
        }
    };

    return {
        // Data
        tier: getEffectiveTier(),
        originalTier: subscriptionData?.tier || 'free', // Keep track of original tier
        status: subscriptionData?.status || (subscriptionData?.isAdmin ? 'active' : 'free'),
        isExpired: isExpired(),
        billingCycle: subscriptionData?.billingCycle,
        isActive: subscriptionData?.isActive !== false,
        isTrialActive: subscriptionData?.isTrialActive || false,
        platform: subscriptionData?.platform || 'undefined',
        hasUsedFreeTrial: subscriptionData?.hasUsedFreeTrial ||
            context.session?.user?.subscription?.hasUsedFreeTrial ||
            false,
        daysUntilTrialEnd: subscriptionData?.daysUntilTrialEnd,

        // Date fields
        startDate: subscriptionData?.startDate,
        endDate: subscriptionData?.endDate,
        trialStartDate: subscriptionData?.trialStartDate,
        trialEndDate: subscriptionData?.trialEndDate,
        lastPaymentDate: subscriptionData?.lastPaymentDate,
        nextBillingDate: subscriptionData?.nextBillingDate,

        // Admin status
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

        // Feature helpers
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
        refetch: refreshAfterPurchase, // CRITICAL FIX: Use dedicated post-purchase refresh
        forceRefresh,
        clearCache,
        refreshFromDatabase,
        refreshAfterPurchase // CRITICAL FIX: Expose dedicated post-purchase refresh
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