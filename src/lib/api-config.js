// file: /src/lib/api-config.js - Enhanced with automatic session injection

import { Capacitor } from '@capacitor/core';
import { MobileSession } from '@/lib/mobile-session';

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

// Enhanced function to get session headers for mobile
export async function getSessionHeaders() {
    const headers = {};

    // For mobile platforms, try to get session data and add it to headers
    if (Capacitor.isNativePlatform()) {
        try {
            const mobileSession = await MobileSession.getSession();
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
            console.warn('Could not add mobile session to headers:', error);
        }
    }

    return headers;
}

// Override the global fetch function for mobile platforms
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    const originalFetch = window.fetch;

    window.fetch = async function(url, options = {}) {
        // Only enhance API calls (not external URLs)
        if (typeof url === 'string' && (url.startsWith('/api/') || url.includes('/api/'))) {
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
        }

        // For non-API calls, use original fetch
        return originalFetch.call(this, url, options);
    };
}