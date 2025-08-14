// file: /src/lib/complete-native-fix.js - Ensure complete native behavior

'use client';

if (typeof window !== 'undefined') {
    console.log('🔧 Complete native fix loaded');

    // Global flag to force native behavior everywhere
    window.__FORCE_NATIVE_MODE__ = false;

    const applyNativeMode = () => {
        if (window.platformInfo?.isNative) {
            console.log('🔧 APPLYING COMPLETE NATIVE MODE');
            window.__FORCE_NATIVE_MODE__ = true;

            // Override NextAuth to prevent web redirects
            if (window.next && window.next.router) {
                const originalPush = window.next.router.push;
                const originalReplace = window.next.router.replace;

                window.next.router.push = function(url, as, options) {
                    console.log('🔧 Native router.push intercepted:', url);

                    // If it's an auth URL, handle it natively
                    if (typeof url === 'string' && url.includes('/auth/')) {
                        console.log('🔧 Keeping auth navigation in native app');
                        return originalPush.call(this, url, as, { ...options, forceOptimisticNavigation: false });
                    }

                    return originalPush.call(this, url, as, options);
                };

                window.next.router.replace = function(url, as, options) {
                    console.log('🔧 Native router.replace intercepted:', url);
                    return originalReplace.call(this, url, as, options);
                };
            }

            // Override window.open to prevent popup windows
            const originalOpen = window.open;
            window.open = function(url, target, features) {
                console.log('🔧 Native app blocking window.open to:', url);

                // In native app, handle auth in same window
                if (url && url.includes('/auth/')) {
                    window.location.href = url;
                    return null;
                }

                // Block other popups
                console.log('🚫 Blocked popup in native app');
                return null;
            };

            // Force native auth behavior
            const forceNativeAuth = () => {
                // Override any auth redirects to stay in app
                const originalRedirect = window.location.replace;
                window.location.replace = function(url) {
                    console.log('🔧 Native auth redirect intercepted:', url);

                    // If it's an external auth URL, convert to in-app navigation
                    if (url.includes('accounts.google.com') || url.includes('github.com') || url.includes('auth')) {
                        console.log('🔧 Converting external auth to in-app navigation');
                        // Use Next.js router instead of location.replace
                        if (window.next?.router) {
                            window.next.router.push(url);
                            return;
                        }
                    }

                    return originalRedirect.call(this, url);
                };
            };

            forceNativeAuth();

            // Force all components to recognize native mode
            const forceComponentUpdate = () => {
                // Update any existing platform info
                window.platformInfo = {
                    ...window.platformInfo,
                    isNative: true,
                    forceNative: true,
                    timestamp: Date.now()
                };

                // Emit multiple events to ensure all components update
                const events = [
                    'platformDetected',
                    'nativeModeForced',
                    'forceNativeUpdate'
                ];

                events.forEach(eventName => {
                    const event = new CustomEvent(eventName, {
                        detail: {
                            isNative: true,
                            forceNative: true,
                            platform: 'android'
                        }
                    });
                    window.dispatchEvent(event);
                });

                console.log('🔧 Forced component updates for native mode');
            };

            // Apply component updates
            forceComponentUpdate();

            // Re-apply every 2 seconds to catch late-loading components
            const interval = setInterval(() => {
                if (window.__FORCE_NATIVE_MODE__) {
                    forceComponentUpdate();
                } else {
                    clearInterval(interval);
                }
            }, 2000);

            // Stop after 30 seconds
            setTimeout(() => {
                clearInterval(interval);
            }, 30000);
        }
    };

    // Apply when platform is detected
    window.addEventListener('platformDetected', (event) => {
        if (event.detail.isNative) {
            console.log('🔧 Platform detected as native, applying complete native mode');
            setTimeout(applyNativeMode, 100);
        }
    });

    // Also apply immediately if already detected
    if (window.platformInfo?.isNative) {
        applyNativeMode();
    }

    // Apply on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.platformInfo?.isNative) {
                applyNativeMode();
            }
        });
    }
}