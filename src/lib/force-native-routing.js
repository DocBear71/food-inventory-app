// file: /src/lib/force-native-routing.js v3 - SAFE: No problematic dynamic imports

'use client';

// Force native routing and component behavior when Android/iOS is detected
if (typeof window !== 'undefined') {
    console.log('🔧 Safe force native routing loaded');

    // Store original methods before overriding
    const originalFetch = window.fetch;
    const originalOpen = window.open;
    let originalLocationReplace, originalLocationAssign;

    // Safe Capacitor check without problematic dynamic imports
    const checkCapacitorSafely = () => {
        try {
            if (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform) {
                const isNative = window.Capacitor.isNativePlatform();
                const platform = window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'unknown';

                console.log('🔧 Safe Capacitor check:', { isNative, platform });

                if (isNative) {
                    window.capacitorReady = true;

                    // Dispatch event to let components know Capacitor is ready
                    const event = new CustomEvent('capacitorReady', {
                        detail: {
                            isNative: true,
                            platform: platform
                        }
                    });
                    window.dispatchEvent(event);
                }

                return isNative;
            }
        } catch (error) {
            console.error('🚫 Safe Capacitor check error:', error);
        }
        return false;
    };

    // Enhanced auth request interceptor
    window.fetch = function(...args) {
        const [url, options = {}] = args;

        // Check if this is an auth request and we're in a native app
        if (typeof url === 'string' && url.includes('/api/auth/')) {
            const isNative = window.platformInfo?.isNative ||
                window.layoutPlatformInfo?.isNative ||
                checkCapacitorSafely();

            if (isNative) {
                console.log('🔧 Native app intercepting auth request:', url);

                // Add headers to indicate this is from native app
                const headers = {
                    ...options.headers,
                    'X-Native-App': 'true',
                    'X-App-Platform': 'capacitor',
                    'X-Native-Platform': window.platformInfo?.platform || 'android'
                };

                return originalFetch(url, {
                    ...options,
                    headers,
                    // Ensure credentials are included for auth
                    credentials: options.credentials || 'same-origin'
                });
            }
        }

        return originalFetch(...args);
    };

    // Enhanced native navigation behavior
    const forceNativeNavigation = () => {
        const isNative = window.platformInfo?.isNative ||
            window.layoutPlatformInfo?.isNative ||
            checkCapacitorSafely();

        if (!isNative) return;

        console.log('🔧 Applying safe native navigation behavior');

        // Store original methods if not already stored
        if (!originalLocationReplace) {
            originalLocationReplace = window.location.replace;
            originalLocationAssign = window.location.assign;
        }

        // Try to override location methods safely (some browsers don't allow this)
        try {
            const locationDescriptor = Object.getOwnPropertyDescriptor(window.location, 'replace');
            if (!locationDescriptor || locationDescriptor.configurable) {
                window.location.replace = function(url) {
                    console.log('🔧 Native app intercepting location.replace to:', url);

                    // Allow internal navigation within your domain
                    if (url.includes('docbearscomfort.kitchen') || url.startsWith('/') || url.startsWith('#')) {
                        return originalLocationReplace.call(this, url);
                    }

                    // Block external redirects that could take user out of app
                    if (url.startsWith('http') && !url.includes('docbearscomfort.kitchen')) {
                        console.log('🚫 Blocked external redirect in native app:', url);
                        return;
                    }

                    return originalLocationReplace.call(this, url);
                };
            } else {
                console.log('🔧 Cannot override location.replace (read-only)');
            }
        } catch (error) {
            console.log('🔧 Cannot override location.replace:', error.message);
        }

        try {
            const assignDescriptor = Object.getOwnPropertyDescriptor(window.location, 'assign');
            if (!assignDescriptor || assignDescriptor.configurable) {
                window.location.assign = function(url) {
                    console.log('🔧 Native app intercepting location.assign to:', url);

                    // Allow internal navigation within your domain
                    if (url.includes('docbearscomfort.kitchen') || url.startsWith('/') || url.startsWith('#')) {
                        return originalLocationAssign.call(this, url);
                    }

                    // Block external redirects
                    if (url.startsWith('http') && !url.includes('docbearscomfort.kitchen')) {
                        console.log('🚫 Blocked external redirect in native app:', url);
                        return;
                    }

                    return originalLocationAssign.call(this, url);
                };
            } else {
                console.log('🔧 Cannot override location.assign (read-only)');
            }
        } catch (error) {
            console.log('🔧 Cannot override location.assign:', error.message);
        }

        // Enhanced window.open override
        window.open = function(url, target, features) {
            console.log('🔧 Native app intercepting window.open to:', url);

            // In native app, convert popups to in-app navigation
            if (url && url.includes('/auth/')) {
                console.log('🔧 Converting auth popup to in-app navigation');

                // Use Next.js router if available, otherwise use location
                if (window.next?.router) {
                    window.next.router.push(url);
                } else {
                    window.location.href = url;
                }
                return null;
            }

            // Block all other popups in native app
            console.log('🚫 Blocked popup in native app');
            return null;
        };

        // Override history methods to ensure proper native navigation
        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;

        window.history.pushState = function(state, title, url) {
            console.log('🔧 Native app history.pushState:', url);
            return originalPushState.call(this, state, title, url);
        };

        window.history.replaceState = function(state, title, url) {
            console.log('🔧 Native app history.replaceState:', url);
            return originalReplaceState.call(this, state, title, url);
        };
    };

    // Safe NextAuth override for native apps
    const forceNativeAuth = () => {
        const isNative = window.platformInfo?.isNative ||
            window.layoutPlatformInfo?.isNative ||
            checkCapacitorSafely();

        if (!isNative) return;

        console.log('🔧 Applying safe native auth overrides');

        // Override NextAuth signIn to prevent external redirects
        if (typeof window !== 'undefined' && window.next?.auth) {
            const originalSignIn = window.next.auth.signIn;

            window.next.auth.signIn = function(provider, options = {}) {
                console.log('🔧 Native app overriding NextAuth signIn:', provider);

                // Force redirect: false to prevent external popups
                const nativeOptions = {
                    ...options,
                    redirect: false,
                    callbackUrl: options.callbackUrl || '/dashboard'
                };

                return originalSignIn.call(this, provider, nativeOptions);
            };
        }

        // Also check for global NextAuth
        if (typeof window.NextAuth !== 'undefined') {
            const originalSignIn = window.NextAuth.signIn;

            window.NextAuth.signIn = function(provider, options = {}) {
                console.log('🔧 Native app overriding global NextAuth signIn:', provider);

                const nativeOptions = {
                    ...options,
                    redirect: false,
                    callbackUrl: options.callbackUrl || '/dashboard'
                };

                return originalSignIn.call(this, provider, nativeOptions);
            };
        }
    };

    // Apply native behavior when platform is detected
    const applyNativeBehavior = (isNative) => {
        if (isNative) {
            console.log('🔧 Platform detected as native, applying safe native overrides');

            // Check Capacitor safely
            checkCapacitorSafely();

            // Apply navigation overrides
            forceNativeNavigation();

            // Apply auth overrides
            forceNativeAuth();

            // Force update components
            setTimeout(() => {
                const nativeEvent = new CustomEvent('forceNativeUpdate', {
                    detail: {
                        isNative: true,
                        timestamp: Date.now()
                    }
                });
                window.dispatchEvent(nativeEvent);
                console.log('🔧 Dispatched safe forceNativeUpdate event');
            }, 100);

            // Set global flag for other components
            window.__FORCE_NATIVE_MODE__ = true;
        }
    };

    // Listen for platform detection events
    window.addEventListener('platformDetected', (event) => {
        console.log('🔧 Safe force routing received platform event:', event.detail);
        applyNativeBehavior(event.detail.isNative);
    });

    // Listen for layout platform detection
    window.addEventListener('layoutPlatformDetected', (event) => {
        console.log('🔧 Safe force routing received layout platform event:', event.detail);
        applyNativeBehavior(event.detail.isNative);
    });

    // Apply immediately if platform info already exists
    const checkExistingPlatform = () => {
        const isNative = window.platformInfo?.isNative ||
            window.layoutPlatformInfo?.isNative ||
            checkCapacitorSafely();

        if (isNative) {
            console.log('🔧 Existing native platform detected, applying safe overrides');
            applyNativeBehavior(true);
        }
    };

    // Check for existing platform info
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkExistingPlatform);
    } else {
        checkExistingPlatform();
    }

    // Also check periodically for the first few seconds in case platform detection is delayed
    let checkCount = 0;
    const platformCheckInterval = setInterval(() => {
        checkCount++;

        const isNative = window.platformInfo?.isNative ||
            window.layoutPlatformInfo?.isNative ||
            checkCapacitorSafely();

        if (isNative || checkCount >= 10) {
            clearInterval(platformCheckInterval);
            if (isNative) {
                console.log('🔧 Delayed native platform detected via safe check');
                applyNativeBehavior(true);
            }
        }
    }, 500);

    // Enhanced error handling for addEventListener
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(type, listener, options) {
        try {
            return originalAddEventListener.call(this, type, listener, options);
        } catch (error) {
            console.error('🚫 addEventListener error (safely handled):', error.message);
            // Don't let event listener errors break the app
        }
    };

    // Safe Capacitor plugin wrapper (no dynamic imports)
    window.safeCapacitorCall = function(pluginName, methodName, ...args) {
        try {
            if (!window.capacitorReady && !checkCapacitorSafely()) {
                console.log('⏳ Capacitor not ready for safe call');
                return Promise.resolve(null);
            }

            // Only use plugins that are directly available on window.Capacitor
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[pluginName]) {
                const plugin = window.Capacitor.Plugins[pluginName];
                if (plugin && plugin[methodName]) {
                    return plugin[methodName](...args);
                }
            }

            console.log(`⚠️ Plugin ${pluginName}.${methodName} not available via safe call`);
            return Promise.resolve(null);
        } catch (error) {
            console.error(`🚫 Safe Capacitor call failed for ${pluginName}.${methodName}:`, error.message);
            return Promise.resolve(null);
        }
    };

    console.log('🔧 Safe force native routing setup complete');
}