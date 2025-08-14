// file: /src/lib/aggressive-native-auth.js - Add this new file to force native auth behavior

'use client';

if (typeof window !== 'undefined') {
    console.log('🔥 Aggressive native auth override loaded');

    // Override NextAuth and any auth-related redirects
    const forceNativeAuthBehavior = () => {
        console.log('🔥 Applying aggressive native auth overrides');

        // Override window.open globally to prevent any popups
        const originalOpen = window.open;
        window.open = function(url, target, features) {
            console.log('🔥 BLOCKED: window.open attempt in native app:', url);

            // If it's an auth URL, navigate in same window
            if (url && (url.includes('auth') || url.includes('signin') || url.includes('login'))) {
                console.log('🔥 Converting auth popup to in-app navigation');
                window.location.href = url;
                return null;
            }

            // Block all other popups
            console.log('🔥 Blocked popup in native app');
            return null;
        };

        // Override any form submissions that might redirect
        const originalSubmit = HTMLFormElement.prototype.submit;
        HTMLFormElement.prototype.submit = function() {
            const action = this.action;
            console.log('🔥 Form submit intercepted:', action);

            if (action && action.includes('/api/auth/')) {
                console.log('🔥 Auth form detected - ensuring native behavior');

                // Add hidden input to indicate native app
                const nativeInput = document.createElement('input');
                nativeInput.type = 'hidden';
                nativeInput.name = 'native-app';
                nativeInput.value = 'true';
                this.appendChild(nativeInput);
            }

            return originalSubmit.call(this);
        };

        // Override location.href assignments
        let locationHrefDescriptor;
        try {
            locationHrefDescriptor = Object.getOwnPropertyDescriptor(window.location, 'href') ||
                Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window.location), 'href');
        } catch (e) {
            console.log('🔥 Cannot access location.href descriptor');
        }

        if (locationHrefDescriptor && locationHrefDescriptor.configurable) {
            Object.defineProperty(window.location, 'href', {
                get: locationHrefDescriptor.get,
                set: function(url) {
                    console.log('🔥 location.href assignment intercepted:', url);

                    // If trying to redirect to external auth, block it
                    if (url && url.startsWith('http') && !url.includes('docbearscomfort.kitchen')) {
                        console.log('🔥 BLOCKED external redirect in native app:', url);
                        return;
                    }

                    return locationHrefDescriptor.set.call(this, url);
                },
                configurable: true
            });
        }

        // Intercept any NextAuth signIn calls
        const interceptNextAuth = () => {
            // Check for NextAuth on window
            if (window.NextAuth && window.NextAuth.signIn) {
                const originalSignIn = window.NextAuth.signIn;
                window.NextAuth.signIn = function(provider, options = {}) {
                    console.log('🔥 NextAuth.signIn intercepted:', provider);

                    const nativeOptions = {
                        ...options,
                        redirect: false,
                        callbackUrl: '/dashboard'
                    };

                    return originalSignIn.call(this, provider, nativeOptions);
                };
            }

            // Check for NextAuth in modules
            if (window.next?.auth?.signIn) {
                const originalSignIn = window.next.auth.signIn;
                window.next.auth.signIn = function(provider, options = {}) {
                    console.log('🔥 next.auth.signIn intercepted:', provider);

                    const nativeOptions = {
                        ...options,
                        redirect: false,
                        callbackUrl: '/dashboard'
                    };

                    return originalSignIn.call(this, provider, nativeOptions);
                };
            }
        };

        // Apply NextAuth overrides
        interceptNextAuth();

        // Also apply after a delay to catch late-loading auth
        setTimeout(interceptNextAuth, 1000);
        setTimeout(interceptNextAuth, 3000);

        // Override fetch for auth requests to add native headers
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            if (typeof url === 'string' && url.includes('/api/auth/')) {
                console.log('🔥 Auth fetch intercepted:', url);

                const headers = {
                    ...options.headers,
                    'X-Native-App': 'true',
                    'X-Force-Native': 'true',
                    'X-Platform': 'android'
                };

                return originalFetch(url, {
                    ...options,
                    headers
                });
            }

            return originalFetch(url, options);
        };

        // Prevent any redirect attempts by overriding router
        const interceptRouter = () => {
            if (window.next?.router) {
                const originalPush = window.next.router.push;
                const originalReplace = window.next.router.replace;

                window.next.router.push = function(url, as, options = {}) {
                    console.log('🔥 Router.push intercepted:', url);

                    // If trying to go to sign-in page while in native app, redirect to dashboard
                    if (typeof url === 'string' && url.includes('/auth/signin')) {
                        console.log('🔥 Redirecting signin to dashboard in native app');
                        return originalPush.call(this, '/dashboard', as, options);
                    }

                    return originalPush.call(this, url, as, options);
                };

                window.next.router.replace = function(url, as, options = {}) {
                    console.log('🔥 Router.replace intercepted:', url);

                    // If trying to go to sign-in page while in native app, redirect to dashboard
                    if (typeof url === 'string' && url.includes('/auth/signin')) {
                        console.log('🔥 Redirecting signin to dashboard in native app');
                        return originalReplace.call(this, '/dashboard', as, options);
                    }

                    return originalReplace.call(this, url, as, options);
                };
            }
        };

        // Apply router overrides
        interceptRouter();
        setTimeout(interceptRouter, 1000);

        console.log('🔥 Aggressive native auth overrides applied');
    };

    // Apply when platform is detected as native
    window.addEventListener('platformDetected', (event) => {
        if (event.detail.isNative) {
            console.log('🔥 Platform detected as native - applying aggressive auth overrides');
            setTimeout(forceNativeAuthBehavior, 100);
        }
    });

    // Also apply immediately if we know we're native
    const checkAndApply = () => {
        const isNative = window.platformInfo?.isNative ||
            window.layoutPlatformInfo?.isNative ||
            (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

        if (isNative) {
            console.log('🔥 Native platform detected immediately - applying aggressive overrides');
            forceNativeAuthBehavior();
        }
    };

    // Check immediately and on DOM ready
    checkAndApply();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndApply);
    }

    // Also check periodically for the first few seconds
    let checkCount = 0;
    const aggressiveCheckInterval = setInterval(() => {
        checkCount++;
        checkAndApply();

        if (checkCount >= 6) { // Check for 3 seconds
            clearInterval(aggressiveCheckInterval);
        }
    }, 500);
}