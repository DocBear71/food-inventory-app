'use client';

// /src/components/providers/AnalyticsProvider.jsx - Fixed Analytics provider for your app

import { createContext, useContext, useEffect, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSafeSession } from '@/hooks/useSafeSession'; // Using your existing session hook
import { initializeAnalytics, trackPageView, identifyUser, resetUser, trackEvent, AnalyticsEvents } from '@/lib/analytics';

const AnalyticsContext = createContext({});

// Separate component for search params to handle Suspense boundary
function SearchParamsHandler({ onParamsChange }) {
    const searchParams = useSearchParams();

    useEffect(() => {
        onParamsChange(searchParams);
    }, [searchParams, onParamsChange]);

    return null;
}

function AnalyticsProviderInner({ children }) {
    const { data: session, status } = useSafeSession();
    const pathname = usePathname();
    const [searchParams, setSearchParams] = useState(null);
    const [analyticsInitialized, setAnalyticsInitialized] = useState(false);

    // Initialize analytics on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && !analyticsInitialized) {
            const analytics = initializeAnalytics();
            setAnalyticsInitialized(true);
            console.log('📊 Analytics initialized');
        }
    }, [analyticsInitialized]);

    // Track page views on route changes
    useEffect(() => {
        if (analyticsInitialized) {
            trackPageView();
        }
    }, [pathname, searchParams, analyticsInitialized]);

    // Handle user identification and session changes
    useEffect(() => {
        if (!analyticsInitialized) return;

        if (status === 'authenticated' && session?.user) {
            // Identify user with relevant properties
            identifyUser(session.user.id, {
                email: session.user.email,
                name: session.user.name,
                subscription_tier: session.user.subscriptionTier || session.user.effectiveTier || 'free',
                is_admin: session.user.isAdmin || false,
                email_verified: session.user.emailVerified || false,
                created_at: session.user.createdAt,
                last_sign_in: new Date().toISOString()
            });

            // Track sign in event
            AnalyticsEvents.userSignIn(session.user.id, {
                subscription_tier: session.user.subscriptionTier || session.user.effectiveTier || 'free',
                is_admin: session.user.isAdmin || false,
                sign_in_method: 'session_resume' // This is for existing sessions
            });

        } else if (status === 'unauthenticated') {
            // Reset analytics session when user signs out
            resetUser();
        }
    }, [session, status, analyticsInitialized]);

    const analyticsValue = {
        initialized: analyticsInitialized,
        trackEvent: (eventName, properties = {}) => {
            if (analyticsInitialized) {
                trackEvent(eventName, {
                    ...properties,
                    user_id: session?.user?.id || null,
                    subscription_tier: session?.user?.subscriptionTier || session?.user?.effectiveTier || 'free'
                });
            }
        },
        events: AnalyticsEvents
    };

    return (
            <AnalyticsContext.Provider value={analyticsValue}>
                <Suspense fallback={null}>
                    <SearchParamsHandler onParamsChange={setSearchParams} />
                </Suspense>
                {children}
            </AnalyticsContext.Provider>
    );
}

// Main export - this is what gets imported in layout.js
export function AnalyticsProvider({ children }) {
    return (
            <Suspense fallback={null}>
                <AnalyticsProviderInner>{children}</AnalyticsProviderInner>
            </Suspense>
    );
}

export async function useAnalyticsContext() {
    const context = useContext(AnalyticsContext);
    if (context === undefined) {
        const {NativeDialog} = await import('@/components/mobile/NativeDialog');
        await NativeDialog.showError({
            title: 'Analytics Failed',
            message: 'useAnalyticsContext must be used within an AnalyticsProvider'
        });
        return;
    }
    return context;
}

// Convenience hook for tracking events with automatic user context
export function useTrackEvent() {
    const { trackEvent } = useAnalyticsContext();
    const { data: session } = useSafeSession();

    return (eventName, properties = {}) => {
        trackEvent(eventName, {
            ...properties,
            user_id: session?.user?.id || null,
            subscription_tier: session?.user?.subscriptionTier || session?.user?.effectiveTier || 'free',
            timestamp: new Date().toISOString()
        });
    };
}

// Hook for common analytics events
export function useAnalyticsEvents() {
    const { data: session } = useSafeSession();
    const trackEvent = useTrackEvent();

    return {
        // Pre-registration events
        trackPreRegRewardClaimed: (properties = {}) => {
            AnalyticsEvents.preRegistrationRewardClaimed(session?.user?.id, {
                ...properties,
                subscription_tier: session?.user?.subscriptionTier || 'free'
            });
        },

        // Subscription events
        trackSubscriptionUpgrade: (fromTier, toTier, properties = {}) => {
            AnalyticsEvents.subscriptionUpgraded(session?.user?.id, fromTier, toTier, properties);
        },

        trackTrialStarted: (tier, properties = {}) => {
            AnalyticsEvents.trialStarted(session?.user?.id, tier, properties);
        },

        // Inventory events
        trackInventoryItemAdded: (method, properties = {}) => {
            AnalyticsEvents.inventoryItemAdded(session?.user?.id, {
                ...properties,
                add_method: method // 'manual', 'barcode', 'voice', 'receipt'
            });
        },

        trackBarcodeScanned: (type, success, properties = {}) => {
            AnalyticsEvents.barcodeScanned(session?.user?.id, type, {
                ...properties,
                success: success,
                platform: typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'web'
            });
        },

        // Voice input events
        trackVoiceInputUsed: (feature, success, properties = {}) => {
            AnalyticsEvents.voiceInputUsed(session?.user?.id, feature, {
                ...properties,
                success: success,
                browser: typeof window !== 'undefined' ? navigator.userAgent.split(' ')[0] : 'unknown'
            });
        },

        // Recipe events
        trackRecipeViewed: (recipeId, source, properties = {}) => {
            AnalyticsEvents.recipeViewed(session?.user?.id, recipeId, {
                ...properties,
                source: source // 'search', 'recommendation', 'saved', etc.
            });
        },

        trackRecipeSaved: (recipeId, properties = {}) => {
            AnalyticsEvents.recipeSaved(session?.user?.id, recipeId, properties);
        },

        trackShoppingListShared: (recipientCount, context, properties = {}) => {
            AnalyticsEvents.shoppingListShared(session?.user?.id, recipientCount, {
                ...properties,
                context: context, // 'recipe', 'meal-plan', 'manual'
                subscription_tier: session?.user?.subscriptionTier || 'free'
            });
        },

        // Error tracking
        trackError: (errorType, errorMessage, component, properties = {}) => {
            AnalyticsEvents.errorOccurred(session?.user?.id, errorType, errorMessage, {
                ...properties,
                component: component,
                url: typeof window !== 'undefined' ? window.location.href : null,
                user_agent: typeof window !== 'undefined' ? navigator.userAgent : null
            });
        },

        // Feature usage
        trackFeatureUsed: (featureName, properties = {}) => {
            AnalyticsEvents.featureUsed(session?.user?.id, featureName, {
                ...properties,
                subscription_tier: session?.user?.subscriptionTier || 'free'
            });
        },

        // Generic event tracker with user context
        track: trackEvent
    };
}

// Default export for convenience
export default AnalyticsProvider;