import { Capacitor } from '@capacitor/core';

// Your Vercel deployment URL
const PRODUCTION_API_URL = 'https://food-inventory-a6bstbeti-edward-mckeowns-projects.vercel.app';

// Function to get the correct API base URL
export function getApiBaseUrl() {
    // If we're running in a Capacitor app (mobile), use the production URL
    if (Capacitor.isNativePlatform()) {
        return PRODUCTION_API_URL;
    }

    // If we're running in a browser (web), use relative URLs
    return '';
}

// Helper function for making API calls
export function getApiUrl(endpoint) {
    const baseUrl = getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
}