// /src/lib/analytics.js - Complete PostHog analytics implementation

// Client-side analytics (PostHog)
let posthog = null;

// Initialize PostHog on client-side
export const initializeAnalytics = () => {
    if (typeof window === 'undefined') return;

    // Only initialize once
    if (posthog) return posthog;

    try {
        const { PostHog } = require('posthog-js/react');

        if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
            console.warn('PostHog key not configured - analytics disabled');
            return null;
        }

        posthog = new PostHog();
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
            autocapture: {
                pageview: true,
                click: true,
                scroll: true,
                input: false, // Don't capture form inputs for privacy
                submit: true
            },
            capture_pageview: false, // We'll handle this manually for better Next.js support
            disable_session_recording: false,
            session_recording: {
                recordCanvas: false,
                recordCrossOriginIframes: false
            },
            persistence: 'localStorage+cookie',
            cross_subdomain_cookie: false,
            secure_cookie: true,
            loaded: (posthog) => {
                if (process.env.NODE_ENV === 'development') {
                    console.log('PostHog loaded successfully');
                }
            }
        });

        return posthog;
    } catch (error) {
        console.error('Failed to initialize PostHog:', error);
        return null;
    }
};

// Client-side event tracking
export const trackEvent = (eventName, properties = {}) => {
    if (typeof window === 'undefined') return;

    if (!posthog) {
        posthog = initializeAnalytics();
    }

    if (posthog) {
        try {
            posthog.capture(eventName, {
                ...properties,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                referrer: document.referrer || null
            });

            if (process.env.NODE_ENV === 'development') {
                console.log('📊 Analytics event tracked:', eventName, properties);
            }
        } catch (error) {
            console.error('Failed to track event:', error);
        }
    }
};

// Track page views manually for better Next.js support
export const trackPageView = (url = null) => {
    if (typeof window === 'undefined') return;

    if (!posthog) {
        posthog = initializeAnalytics();
    }

    if (posthog) {
        try {
            const pageUrl = url || window.location.href;
            posthog.capture('$pageview', {
                $current_url: pageUrl,
                $host: window.location.host,
                $pathname: window.location.pathname,
                $search: window.location.search,
                title: document.title
            });

            if (process.env.NODE_ENV === 'development') {
                console.log('📄 Page view tracked:', pageUrl);
            }
        } catch (error) {
            console.error('Failed to track page view:', error);
        }
    }
};

// Identify user (call when user signs in)
export const identifyUser = (userId, userProperties = {}) => {
    if (typeof window === 'undefined') return;

    if (!posthog) {
        posthog = initializeAnalytics();
    }

    if (posthog && userId) {
        try {
            posthog.identify(userId, {
                ...userProperties,
                identified_at: new Date().toISOString()
            });

            if (process.env.NODE_ENV === 'development') {
                console.log('👤 User identified:', userId, userProperties);
            }
        } catch (error) {
            console.error('Failed to identify user:', error);
        }
    }
};

// Reset user (call when user signs out)
export const resetUser = () => {
    if (typeof window === 'undefined') return;

    if (posthog) {
        try {
            posthog.reset();

            if (process.env.NODE_ENV === 'development') {
                console.log('🔄 User session reset');
            }
        } catch (error) {
            console.error('Failed to reset user:', error);
        }
    }
};

// Set user properties
export const setUserProperties = (properties = {}) => {
    if (typeof window === 'undefined') return;

    if (!posthog) {
        posthog = initializeAnalytics();
    }

    if (posthog) {
        try {
            posthog.people.set(properties);

            if (process.env.NODE_ENV === 'development') {
                console.log('👤 User properties set:', properties);
            }
        } catch (error) {
            console.error('Failed to set user properties:', error);
        }
    }
};

// Server-side analytics tracking
export const trackServerEvent = async (eventName, properties = {}, distinctId = null) => {
    // Only run on server-side
    if (typeof window !== 'undefined') return;

    try {
        const { PostHog } = await import('posthog-node');

        if (!process.env.POSTHOG_API_KEY) {
            console.warn('PostHog API key not configured - server analytics disabled');
            return;
        }

        const client = new PostHog(process.env.POSTHOG_API_KEY, {
            host: process.env.POSTHOG_HOST || 'https://app.posthog.com'
        });

        await client.capture({
            distinctId: distinctId || 'anonymous',
            event: eventName,
            properties: {
                ...properties,
                timestamp: new Date().toISOString(),
                source: 'server'
            }
        });

        await client.shutdown();

        if (process.env.NODE_ENV === 'development') {
            console.log('📊 Server analytics event tracked:', eventName, properties);
        }

        return true;

    } catch (error) {
        console.error('Failed to track server event:', error);
        return false;
    }
};

// Comprehensive event tracking functions for your app
export const AnalyticsEvents = {
    // Authentication events
    userSignUp: (userId, properties = {}) => {
        trackEvent('user_signed_up', {
            user_id: userId,
            ...properties
        });
    },

    userSignIn: (userId, properties = {}) => {
        trackEvent('user_signed_in', {
            user_id: userId,
            ...properties
        });
    },

    userSignOut: (userId) => {
        trackEvent('user_signed_out', {
            user_id: userId
        });
        resetUser();
    },

    // Subscription events
    subscriptionUpgraded: (userId, fromTier, toTier, properties = {}) => {
        trackEvent('subscription_upgraded', {
            user_id: userId,
            from_tier: fromTier,
            to_tier: toTier,
            ...properties
        });
    },

    subscriptionDowngraded: (userId, fromTier, toTier, properties = {}) => {
        trackEvent('subscription_downgraded', {
            user_id: userId,
            from_tier: fromTier,
            to_tier: toTier,
            ...properties
        });
    },

    subscriptionCancelled: (userId, tier, properties = {}) => {
        trackEvent('subscription_cancelled', {
            user_id: userId,
            tier: tier,
            ...properties
        });
    },

    trialStarted: (userId, tier, properties = {}) => {
        trackEvent('trial_started', {
            user_id: userId,
            tier: tier,
            ...properties
        });
    },

    trialConverted: (userId, tier, properties = {}) => {
        trackEvent('trial_converted', {
            user_id: userId,
            tier: tier,
            ...properties
        });
    },

    // Pre-registration events
    preRegistrationRewardClaimed: (userId, properties = {}) => {
        trackEvent('pre_registration_reward_claimed', {
            user_id: userId,
            reward_type: 'pre_registration',
            platform: 'google-play',
            reward_duration_days: 30,
            ...properties
        });
    },

    // Inventory events
    inventoryItemAdded: (userId, properties = {}) => {
        trackEvent('inventory_item_added', {
            user_id: userId,
            ...properties
        });
    },

    inventoryItemRemoved: (userId, properties = {}) => {
        trackEvent('inventory_item_removed', {
            user_id: userId,
            ...properties
        });
    },

    barcodeScanned: (userId, type, properties = {}) => {
        trackEvent('barcode_scanned', {
            user_id: userId,
            scan_type: type, // 'upc' or 'receipt'
            ...properties
        });
    },

    // Recipe events
    recipeViewed: (userId, recipeId, properties = {}) => {
        trackEvent('recipe_viewed', {
            user_id: userId,
            recipe_id: recipeId,
            ...properties
        });
    },

    recipeSaved: (userId, recipeId, properties = {}) => {
        trackEvent('recipe_saved', {
            user_id: userId,
            recipe_id: recipeId,
            ...properties
        });
    },

    recipeShared: (userId, recipeId, shareMethod, properties = {}) => {
        trackEvent('recipe_shared', {
            user_id: userId,
            recipe_id: recipeId,
            share_method: shareMethod, // 'email', 'link', etc.
            ...properties
        });
    },

    personalRecipeCreated: (userId, properties = {}) => {
        trackEvent('personal_recipe_created', {
            user_id: userId,
            ...properties
        });
    },

    // Shopping list events
    shoppingListCreated: (userId, properties = {}) => {
        trackEvent('shopping_list_created', {
            user_id: userId,
            ...properties
        });
    },

    shoppingListShared: (userId, recipientCount, properties = {}) => {
        trackEvent('shopping_list_shared', {
            user_id: userId,
            recipient_count: recipientCount,
            share_method: 'email',
            ...properties
        });
    },

    // Voice input events
    voiceInputUsed: (userId, feature, properties = {}) => {
        trackEvent('voice_input_used', {
            user_id: userId,
            feature: feature, // 'inventory_add', 'search', etc.
            ...properties
        });
    },

    // Error tracking
    errorOccurred: (userId, errorType, errorMessage, properties = {}) => {
        trackEvent('error_occurred', {
            user_id: userId,
            error_type: errorType,
            error_message: errorMessage,
            ...properties
        });
    },

    // Feature usage
    featureUsed: (userId, featureName, properties = {}) => {
        trackEvent('feature_used', {
            user_id: userId,
            feature_name: featureName,
            ...properties
        });
    }
};

// Next.js specific hooks and components
export const useAnalytics = () => {
    const track = (eventName, properties = {}) => {
        trackEvent(eventName, properties);
    };

    const identify = (userId, userProperties = {}) => {
        identifyUser(userId, userProperties);
    };

    const reset = () => {
        resetUser();
    };

    const setProperties = (properties = {}) => {
        setUserProperties(properties);
    };

    return {
        track,
        identify,
        reset,
        setProperties,
        events: AnalyticsEvents
    };
};

// Provider component for Next.js App Router
export const AnalyticsProvider = ({ children }) => {
    // Initialize analytics on mount
    React.useEffect(() => {
        initializeAnalytics();
    }, []);

    return children;
};

// Page view tracking hook for Next.js App Router
export const usePageViews = () => {
    React.useEffect(() => {
        // Track initial page view
        trackPageView();

        // Track subsequent page views
        const handleRouteChange = () => {
            trackPageView();
        };

        // For App Router, we need to listen to navigation events
        if (typeof window !== 'undefined' && window.navigation) {
            window.navigation.addEventListener('navigate', handleRouteChange);

            return () => {
                window.navigation.removeEventListener('navigate', handleRouteChange);
            };
        }
    }, []);
};

export default {
    initializeAnalytics,
    trackEvent,
    trackPageView,
    trackServerEvent,
    identifyUser,
    resetUser,
    setUserProperties,
    AnalyticsEvents,
    useAnalytics,
    AnalyticsProvider,
    usePageViews
};