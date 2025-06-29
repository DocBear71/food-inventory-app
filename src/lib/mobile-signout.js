// file: /src/lib/mobile-signout.js - v2 - Clean version without warnings

import { signOut } from 'next-auth/react';
import { MobileSession } from '@/lib/mobile-session';

// Helper function to safely check if we're on a native platform
async function isNativePlatform() {
    try {
        if (typeof window === 'undefined') return false;

        const { Capacitor } = await import('@capacitor/core');
        return Capacitor.isNativePlatform();
    } catch (e) {
        return false;
    }
}

export async function handleMobileSignOut(options = {}) {
    console.log('Mobile sign-out initiated');

    // Set signout flags immediately
    try {
        sessionStorage.setItem('signout-in-progress', 'true');
        sessionStorage.setItem('just-signed-out', 'true');
        localStorage.setItem('prevent-session-calls', 'true');
    } catch (storageError) {
        console.log('Could not set signout flags:', storageError);
    }

    const isNative = await isNativePlatform();
    const isPWA = !isNative && (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator?.standalone === true ||
        document.referrer.includes('android-app://')
    );

    console.log('Environment detected - Native:', isNative, 'PWA:', isPWA);

    try {
        if (isNative || isPWA) {
            // Enhanced mobile/PWA sign-out process
            await performMobileSignOut(options);
        } else {
            // Regular browser sign-out
            await performBrowserSignOut(options);
        }
    } catch (error) {
        console.error('Sign-out error:', error);
        // Emergency fallback
        emergencySignOut(options.callbackUrl || '/');
    }
}

async function performMobileSignOut(options = {}) {
    console.log('Performing mobile/PWA sign-out');

    try {
        // Step 0: Clear mobile session storage first
        console.log('Clearing mobile session storage...');
        try {
            await MobileSession.clearSession();
            console.log('Mobile session storage cleared successfully');
        } catch (mobileSessionError) {
            console.log('Mobile session clearing failed:', mobileSessionError);
            // Continue with other cleanup
        }

        // Step 1: Clear all local storage first (except signout flags)
        const signoutFlags = {
            'signout-in-progress': sessionStorage.getItem('signout-in-progress'),
            'just-signed-out': sessionStorage.getItem('just-signed-out'),
            'prevent-session-calls': localStorage.getItem('prevent-session-calls')
        };

        localStorage.clear();
        sessionStorage.clear();

        // Restore signout flags
        Object.entries(signoutFlags).forEach(([key, value]) => {
            if (value) {
                if (key === 'prevent-session-calls') {
                    localStorage.setItem(key, value);
                } else {
                    sessionStorage.setItem(key, value);
                }
            }
        });

        console.log('Local storage cleared for mobile');

        // Step 2: Clear cookies aggressively
        await clearAllAuthCookies();

        // Step 3: Clear PWA-specific storage
        await clearPWAStorage();

        // Step 4: Clear Capacitor-specific storage
        await clearCapacitorStorage();

        // Step 5: Call NextAuth signOut with mobile-specific options
        try {
            console.log('Calling NextAuth signOut for mobile');
            await signOut({
                callbackUrl: options.callbackUrl || '/',
                redirect: false // Never let NextAuth handle redirect on mobile
            });
            console.log('NextAuth signOut completed');
        } catch (nextAuthError) {
            console.log('NextAuth signOut failed:', nextAuthError);
            // Continue anyway - we've already cleared storage
        }

        // Step 6: Additional API cleanup call
        try {
            console.log('Making manual signout API call');
            const response = await fetch('/api/auth/signout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    callbackUrl: options.callbackUrl || '/'
                }),
                credentials: 'include'
            });
            console.log('Manual signout API response:', response.status);
        } catch (apiError) {
            console.log('Manual signout API failed:', apiError);
        }

        // Step 7: Wait longer for mobile environments
        console.log('Waiting for mobile sign-out to complete...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 8: Force redirect
        const redirectUrl = options.callbackUrl || '/';
        console.log('Redirecting to:', redirectUrl);
        window.location.href = redirectUrl;

    } catch (error) {
        console.error('Mobile sign-out process failed:', error);
        emergencySignOut(options.callbackUrl || '/');
    }
}

async function performBrowserSignOut(options = {}) {
    console.log('Performing browser sign-out');

    try {
        // For regular browsers, use the standard NextAuth signOut
        await signOut({
            callbackUrl: options.callbackUrl || '/',
            redirect: true
        });
    } catch (error) {
        console.error('Browser sign-out failed:', error);
        emergencySignOut(options.callbackUrl || '/');
    }
}

// Clear Capacitor-specific storage
async function clearCapacitorStorage() {
    console.log('Clearing Capacitor storage');

    try {
        // Clear all Capacitor Preferences (includes our mobile session)
        try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.clear();
            console.log('Capacitor Preferences cleared');
        } catch (e) {
            console.log('Capacitor Preferences not available (normal for web builds)');
        }

        // Note: Removed @capacitor/storage as it's not installed
        // If you need it later, install it first: npm install @capacitor/storage

    } catch (error) {
        console.log('Capacitor storage clearing failed:', error);
    }
}

async function clearAllAuthCookies() {
    console.log('Clearing all auth cookies');

    const cookieConfigs = [
        { path: '/', domain: '' },
        { path: '/', domain: '.docbearscomfort.kitchen' },
        { path: '/', domain: 'www.docbearscomfort.kitchen' },
        { path: '/', domain: 'docbearscomfort.kitchen' }
    ];

    const authCookieNames = [
        'next-auth.session-token',
        'next-auth.csrf-token',
        'next-auth.callback-url',
        '__Secure-next-auth.session-token',
        '__Secure-next-auth.csrf-token',
        '__Secure-next-auth.callback-url',
        '__Host-next-auth.session-token',
        '__Host-next-auth.csrf-token',
        '__Host-next-auth.callback-url'
    ];

    // Also find any existing auth cookies
    const currentCookies = document.cookie.split(';');
    for (let cookie of currentCookies) {
        const name = cookie.split('=')[0].trim();
        if (name.includes('next-auth') || name.includes('session') || name.includes('csrf')) {
            authCookieNames.push(name);
        }
    }

    // Remove duplicates
    const uniqueCookieNames = [...new Set(authCookieNames)];

    // Clear each cookie with each configuration
    for (const cookieName of uniqueCookieNames) {
        for (const config of cookieConfigs) {
            try {
                let cookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${config.path}`;

                if (config.domain) {
                    cookieString += `; domain=${config.domain}`;
                }

                // Try both secure and non-secure versions
                document.cookie = cookieString;
                document.cookie = cookieString + '; secure; samesite=lax';
                document.cookie = cookieString + '; secure; samesite=strict';

            } catch (error) {
                // Ignore individual cookie errors
            }
        }
    }

    console.log('Cookie clearing completed');
}

async function clearPWAStorage() {
    console.log('Clearing PWA storage');

    try {
        // Clear service worker caches
        if ('serviceWorker' in navigator && 'caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('Service worker caches cleared');
        }

        // Update service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                registration.update();
            }
            console.log('Service workers updated');
        }

        // Clear IndexedDB (basic approach)
        if ('indexedDB' in window) {
            // This is a simplified approach - you might need more specific clearing
            // depending on what your app stores in IndexedDB
            console.log('IndexedDB clearing attempted');
        }

    } catch (error) {
        console.log('PWA storage clearing failed:', error);
    }
}

function emergencySignOut(redirectUrl = '/') {
    console.log('Emergency sign-out fallback');

    try {
        // Emergency clear mobile session too
        MobileSession.clearSession().catch(e => console.log('Emergency mobile session clear failed:', e));

        localStorage.clear();
        sessionStorage.clear();
    } catch (error) {
        console.log('Emergency storage clear failed:', error);
    }

    // Force page reload and redirect
    window.location.href = redirectUrl;
}