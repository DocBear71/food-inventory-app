// file: /src/lib/api-config.js - Safe session injection without blocking

import { Capacitor } from '@capacitor/core';

// Your Vercel deployment URL
const PRODUCTION_API_URL = 'https://www.docbearscomfort.kitchen';

// Function to get the correct API base URL
export function getApiBaseUrl() {
    // If we're running in a Capacitor app (mobile), use the production URL
    if (Capacitor.isNativePlatform()) {
        return PRODUCTION_API_URL;
    }

    // If we're running in a browser (web), use relative URLs
    return '';
}

// Helper function for making API calls (your existing function)
export function getApiUrl(endpoint) {
    const baseUrl = getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
}

// Safe function to get session headers for mobile (non-blocking)
export async function getSessionHeaders() {
    const headers = {};

    // For mobile platforms, try to get session data but don't block if it fails
    if (Capacitor.isNativePlatform()) {
        try {
            // Dynamic import to avoid initialization issues
            const { MobileSession } = await import('@/lib/mobile-session');

            // Add timeout to prevent hanging
            const sessionPromise = MobileSession.getSession();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Session timeout')), 1000)
            );

            const mobileSession = await Promise.race([sessionPromise, timeoutPromise]);

            if (mobileSession?.user) {
                // Add session data to headers
                headers['X-User-Email'] = mobileSession.user.email;
                headers['X-User-ID'] = mobileSession.user.id;

                // Add mobile session token if available
                if (mobileSession.token) {
                    headers['Authorization'] = `Bearer mobile-${mobileSession.token}`;
                }

                // Add session data as encoded header
                headers['X-Mobile-Session'] = encodeURIComponent(JSON.stringify({
                    user: mobileSession.user,
                    timestamp: Date.now()
                }));

                console.log('📱 Added mobile session headers for API call');
            }
        } catch (error) {
            console.warn('Could not add mobile session to headers (non-blocking):', error.message);
            // Don't block the request, just proceed without session headers
        }
    }

    return headers;
}

// Safer fetch override that doesn't block initialization
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    // Wait for the app to be fully initialized before overriding fetch
    document.addEventListener('DOMContentLoaded', () => {
        const originalFetch = window.fetch;

        window.fetch = async function(url, options = {}) {
            // Only enhance API calls (not external URLs)
            if (typeof url === 'string' && (url.startsWith('/api/') || url.includes('/api/'))) {
                try {
                    const sessionHeaders = await getSessionHeaders();

                    const enhancedOptions = {
                        ...options,
                        headers: {
                            ...sessionHeaders,
                            ...options.headers
                        }
                    };

                    console.log('🌐 Enhanced API call to:', url);
                    return originalFetch.call(this, url, enhancedOptions);
                } catch (error) {
                    console.warn('Error enhancing API call, proceeding without session headers:', error);
                    // If session header injection fails, proceed with original options
                    return originalFetch.call(this, url, options);
                }
            }

            // For non-API calls, use original fetch
            return originalFetch.call(this, url, options);
        };
    });
}

// Alternative approach: Manual session injection function
export async function fetchWithSession(url, options = {}) {
    const sessionHeaders = await getSessionHeaders();

    const enhancedOptions = {
        ...options,
        headers: {
            ...sessionHeaders,
            ...options.headers
        }
    };

    console.log('🌐 Making session-aware API call to:', url);
    return fetch(url, enhancedOptions);
}