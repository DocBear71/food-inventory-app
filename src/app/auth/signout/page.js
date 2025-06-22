'use client';
// file: /src/app/auth/signout/page.js - v2 - Aggressive cookie clearing with exact attribute matching

import { useEffect } from 'react';

export default function SignOutPage() {
    useEffect(() => {
        const performAggressiveSignOut = async () => {
            try {
                console.log('Starting aggressive signout...');

                // IMMEDIATELY set signout flags to prevent any API calls
                sessionStorage.setItem('signout-in-progress', 'true');
                sessionStorage.setItem('just-signed-out', 'true');
                localStorage.setItem('prevent-session-calls', 'true');

                // Clear all storage (except our signout flags)
                const signoutFlags = {
                    'signout-in-progress': sessionStorage.getItem('signout-in-progress'),
                    'just-signed-out': sessionStorage.getItem('just-signed-out')
                };

                localStorage.clear();
                sessionStorage.clear();

                // Restore signout flags
                Object.entries(signoutFlags).forEach(([key, value]) => {
                    if (value) sessionStorage.setItem(key, value);
                });
                localStorage.setItem('prevent-session-calls', 'true');

                // ADDED: Clear PWA-specific storage
                try {
                    // Clear IndexedDB if available
                    if (typeof window !== 'undefined' && window.indexedDB) {
                        console.log('Clearing IndexedDB...');
                        // This is more complex but often not needed for auth
                    }

                    // Clear Service Worker cache if available
                    if ('serviceWorker' in navigator && 'caches' in window) {
                        console.log('Clearing service worker caches...');
                        caches.keys().then(function(cacheNames) {
                            return Promise.all(
                                cacheNames.map(function(cacheName) {
                                    console.log('Deleting cache:', cacheName);
                                    return caches.delete(cacheName);
                                })
                            );
                        }).then(() => {
                            console.log('Service worker caches cleared');
                        }).catch(err => {
                            console.log('Cache clearing failed:', err);
                        });
                    }

                    // Force service worker to update/restart
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(function(registrations) {
                            for(let registration of registrations) {
                                console.log('Updating service worker...');
                                registration.update();
                            }
                        });
                    }
                } catch (cacheError) {
                    console.log('PWA cache clearing failed:', cacheError);
                }

                console.log('Storage cleared with signout flags preserved');

                // Get all current cookies for debugging
                const allCookies = document.cookie.split(";");
                console.log('Current cookies before clearing:', allCookies.map(c => c.trim()));

                // Define all possible cookie configurations that NextAuth might use
                const cookieConfigs = [
                    // Basic configurations
                    { path: '/', secure: false, sameSite: '', domain: '' },
                    { path: '/', secure: true, sameSite: '', domain: '' },
                    { path: '/', secure: false, sameSite: 'lax', domain: '' },
                    { path: '/', secure: true, sameSite: 'lax', domain: '' },
                    { path: '/', secure: false, sameSite: 'strict', domain: '' },
                    { path: '/', secure: true, sameSite: 'strict', domain: '' },

                    // With domain variations
                    { path: '/', secure: true, sameSite: 'lax', domain: '.docbearscomfort.kitchen' },
                    { path: '/', secure: true, sameSite: 'lax', domain: 'www.docbearscomfort.kitchen' },
                    { path: '/', secure: true, sameSite: 'lax', domain: 'docbearscomfort.kitchen' },
                    { path: '/', secure: false, sameSite: 'lax', domain: '.docbearscomfort.kitchen' },
                    { path: '/', secure: false, sameSite: 'lax', domain: 'www.docbearscomfort.kitchen' },
                    { path: '/', secure: false, sameSite: 'lax', domain: 'docbearscomfort.kitchen' },
                ];

                // All possible NextAuth cookie names
                const authCookieNames = [
                    'next-auth.session-token',
                    'next-auth.csrf-token',
                    'next-auth.callback-url',
                    '__Secure-next-auth.session-token',
                    '__Secure-next-auth.csrf-token',
                    '__Secure-next-auth.callback-url',
                    '__Host-next-auth.session-token',
                    '__Host-next-auth.csrf-token',
                    '__Host-next-auth.callback-url',
                    // Chunked session tokens
                    '__Secure-next-auth.session-token.0',
                    '__Secure-next-auth.session-token.1',
                    '__Secure-next-auth.session-token.2',
                    'next-auth.session-token.0',
                    'next-auth.session-token.1',
                    'next-auth.session-token.2',
                ];

                // Also clear any existing cookies we find
                for (let cookie of allCookies) {
                    const eqPos = cookie.indexOf("=");
                    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
                    if (name && (name.includes('next-auth') || name.includes('session') || name.includes('csrf'))) {
                        authCookieNames.push(name);
                    }
                }

                // Remove duplicates
                const uniqueCookieNames = [...new Set(authCookieNames)];

                console.log('Attempting to clear these cookies:', uniqueCookieNames);

                // Try to clear each cookie with each possible configuration
                for (const cookieName of uniqueCookieNames) {
                    for (const config of cookieConfigs) {
                        try {
                            let cookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${config.path}`;

                            if (config.domain) {
                                cookieString += `; domain=${config.domain}`;
                            }

                            if (config.secure) {
                                cookieString += `; secure`;
                            }

                            if (config.sameSite) {
                                cookieString += `; samesite=${config.sameSite}`;
                            }

                            document.cookie = cookieString;

                        } catch (error) {
                            // Ignore individual cookie clearing errors
                        }
                    }
                }

                console.log('Cookie clearing attempts completed');

                // Check what cookies remain
                const remainingCookies = document.cookie.split(";");
                console.log('Remaining cookies after clearing:', remainingCookies.map(c => c.trim()));

                // Also try to call NextAuth signOut API directly
                try {
                    console.log('Calling NextAuth signOut API...');
                    const response = await fetch('/api/auth/signout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: 'callbackUrl=/',
                    });
                    console.log('NextAuth signOut API response:', response.status);
                } catch (apiError) {
                    console.log('NextAuth API call failed:', apiError);
                }

                // Wait longer for PWA environments to ensure everything clears
                const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    window.navigator.standalone === true;
                const waitTime = isPWA ? 2000 : 1000; // 2 seconds for PWA, 1 second for browser

                console.log(`Waiting ${waitTime}ms for signout to complete (PWA: ${isPWA})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));

                console.log('Redirecting to home page...');

                // Force redirect to home
                window.location.href = '/';

            } catch (error) {
                console.error('Aggressive signout error:', error);
                // Fallback - just go home
                window.location.href = '/';
            }
        };

        performAggressiveSignOut();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center p-8 bg-white rounded-lg shadow-md">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Signing Out...</h1>
                <p className="text-gray-600">Please wait while we securely sign you out.</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few seconds.</p>
            </div>
        </div>
    );
}