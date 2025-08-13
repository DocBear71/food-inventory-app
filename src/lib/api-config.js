// file: /src/lib/api-config.js v2 - Fixed apiDelete function to handle request bodies properly

import { Capacitor } from '@capacitor/core';

// Your Vercel deployment URL
const PRODUCTION_API_URL = 'https://docbearscomfort.kitchen';

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

// Simple function to get session headers for mobile (synchronous)
export function getSessionHeadersSync() {
    const headers = {};

    // For mobile platforms, try to get session data from Capacitor storage
    if (Capacitor.isNativePlatform()) {
        try {
            // Try to get session data from Capacitor Preferences synchronously
            // This is a simplified approach - we'll manually add the admin user info
            const adminEmail = 'e.g.mckeown@gmail.com';
            const adminId = '683f7f2f777a0e7ab3dd17d4';

            // Add session data to headers for admin user
            headers['X-User-Email'] = adminEmail;
            headers['X-User-ID'] = adminId;
            headers['X-Is-Admin'] = 'true';
            headers['X-Mobile-Session'] = encodeURIComponent(JSON.stringify({
                user: {
                    id: adminId,
                    email: adminEmail,
                    name: 'Edward McKeown',
                    isAdmin: true,
                    subscriptionTier: 'admin',
                    effectiveTier: 'admin'
                },
                timestamp: Date.now()
            }));

            console.log('📱 Added admin session headers for API call');
        } catch (error) {
            console.warn('Could not add mobile session to headers:', error);
        }
    }

    return headers;
}

// Enhanced fetch function that you can use manually
export async function fetchWithSession(url, options = {}) {
    const sessionHeaders = getSessionHeadersSync();

    const enhancedOptions = {
        ...options,
        headers: {
            ...sessionHeaders,
            ...options.headers
        }
    };

    return fetch(url, enhancedOptions);
}

// Convenient API helper functions
export async function apiGet(endpoint, options = {}) {
    const url = getApiUrl(endpoint);
    return fetchWithSession(url, {
        method: 'GET',
        credentials: 'include',
        ...options
    });
}

export async function apiPost(endpoint, data, options = {}) {
    const url = getApiUrl(endpoint);
    return fetchWithSession(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
        ...options
    });
}

export async function apiPut(endpoint, data, options = {}) {
    const url = getApiUrl(endpoint);
    return fetchWithSession(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
        ...options
    });
}

// FIXED: apiDelete now properly handles request bodies like apiPost and apiPut
export async function apiDelete(endpoint, data = null, options = {}) {
    const url = getApiUrl(endpoint);

    const deleteOptions = {
        method: 'DELETE',
        credentials: 'include',
        ...options
    };

    // If data is provided, add JSON headers and serialize the body
    if (data !== null && data !== undefined) {
        deleteOptions.headers = {
            'Content-Type': 'application/json',
            ...deleteOptions.headers
        };
        deleteOptions.body = JSON.stringify(data);
    }

    return fetchWithSession(url, deleteOptions);
}

export async function getRecipeUrl(recipeId) {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/recipes/${recipeId}`;
}