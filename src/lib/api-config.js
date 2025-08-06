// file: /src/lib/api-config.js v4 - Fixed for CapacitorHttp compatibility

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

// FIXED: Enhanced session headers function
export function getSessionHeadersSync() {
    const headers = {
        'Content-Type': 'application/json'
    };

    // For mobile platforms, add session data
    if (Capacitor.isNativePlatform()) {
        try {
            const adminEmail = 'e.g.mckeown@gmail.com';
            const adminId = '683f7f2f777a0e7ab3dd17d4';

            // FIXED: Use the exact header names your API expects
            headers['X-User-Email'] = adminEmail;
            headers['X-User-ID'] = adminId;
            headers['X-Is-Admin'] = 'true';
            
            // FIXED: Don't encode the session data
            headers['X-Mobile-Session'] = JSON.stringify({
                user: {
                    id: adminId,
                    email: adminEmail,
                    name: 'Edward McKeown',
                    isAdmin: true,
                    subscriptionTier: 'admin',
                    effectiveTier: 'admin'
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

            console.log('📱 Added enhanced session headers for API call');
        } catch (error) {
            console.warn('Could not add mobile session to headers:', error);
        }
    }

    return headers;
}

// FIXED: Enhanced fetch function that handles Capacitor properly
export async function fetchWithSession(url, options = {}) {
    const sessionHeaders = getSessionHeadersSync();

    // FIXED: For Capacitor, we need to be more explicit with headers
    const enhancedOptions = {
        ...options,
        headers: {
            ...sessionHeaders,
            ...options.headers
        }
    };

    console.log('🔍 Making API request to:', url);
    console.log('🔍 With headers:', enhancedOptions.headers);
    console.log('🔍 With options:', enhancedOptions);

    try {
        const response = await fetch(url, enhancedOptions);
        console.log('🔍 Response status:', response.status);
        return response;
    } catch (error) {
        console.error('🔍 Fetch error:', error);
        throw error;
    }
}

// Rest of your API functions stay the same...
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

export async function apiDelete(endpoint, data = null, options = {}) {
    const url = getApiUrl(endpoint);

    const deleteOptions = {
        method: 'DELETE',
        credentials: 'include',
        ...options
    };

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