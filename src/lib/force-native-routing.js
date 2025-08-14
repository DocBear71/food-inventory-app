// file: /src/lib/force-native-routing.js - Create this file to force native behavior

'use client';

// Force native routing and component behavior when Android is detected
if (typeof window !== 'undefined') {
    console.log('🔧 Force native routing loaded');

    // Override fetch to handle auth requests natively
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const [url, options = {}] = args;

        // Check if this is an auth request and we're in Android app
        if (typeof url === 'string' && url.includes('/api/auth/') && window.platformInfo?.isNative) {
            console.log('🔧 Native app intercepting auth request:', url);

            // Add headers to indicate this is from native app
            const headers = {
                ...options.headers,
                'X-Native-App': 'android',
                'X-App-Platform': 'capacitor'
            };

            return originalFetch(url, {
                ...options,
                headers
            });
        }

        return originalFetch(...args);
    };

    // Force native navigation behavior
    const forceNativeNavigation = () => {
        if (window.platformInfo?.isNative) {
            console.log('🔧 Forcing native navigation behavior');

            // Override any web-specific redirects
            const originalReplace = window.location.replace;
            const originalAssign = window.location.assign;

            window.location.replace = function(url) {
                console.log('🔧 Native app blocking location.replace to:', url);
                // Don't allow external redirects in native app
                if (url.startsWith('http') && !url.includes('docbearscomfort.kitchen')) {
                    console.log('🚫 Blocked external redirect in native app');
                    return;
                }
                return originalReplace.call(this, url);
            };

            window.location.assign = function(url) {
                console.log('🔧 Native app blocking location.assign to:', url);
                // Don't allow external redirects in native app
                if (url.startsWith('http') && !url.includes('docbearscomfort.kitchen')) {
                    console.log('🚫 Blocked external redirect in native app');
                    return;
                }
                return originalAssign.call(this, url);
            };
        }
    };

    // Apply native behavior when platform is detected
    window.addEventListener('platformDetected', (event) => {
        if (event.detail.isNative) {
            console.log('🔧 Platform detected as native, applying native overrides');
            forceNativeNavigation();

            // Force update any components that need to know about native status
            setTimeout(() => {
                const nativeEvent = new CustomEvent('forceNativeUpdate', {
                    detail: { isNative: true }
                });
                window.dispatchEvent(nativeEvent);
            }, 100);
        }
    });

    // Also apply immediately if platform info already exists
    if (window.platformInfo?.isNative) {
        forceNativeNavigation();
    }
}