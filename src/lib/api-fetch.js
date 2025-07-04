// file: /src/lib/api-fetch.js
// Enhanced fetch wrapper that includes mobile session headers

export async function apiRequest(url, options = {}) {
    console.log('🌐 Making API request to:', url);

    try {
        // Get mobile session if available
        const { MobileSession } = await import('@/lib/mobile-session-simple');
        const mobileSession = await MobileSession.getSession();

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add mobile session headers if available
        if (mobileSession?.user) {
            headers['X-Mobile-Session'] = JSON.stringify(mobileSession);
            headers['X-User-Email'] = mobileSession.user.email;
            headers['X-User-ID'] = mobileSession.user.id;

            console.log('📱 Adding mobile session headers for:', mobileSession.user.email);
        }

        // Make the request
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include' // Important for cookies
        });

        return response;

    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Convenience methods
export const api = {
    get: (url, options = {}) => apiRequest(url, { ...options, method: 'GET' }),
    post: (url, data, options = {}) => apiRequest(url, {
        ...options,
        method: 'POST',
        body: JSON.stringify(data)
    }),
    put: (url, data, options = {}) => apiRequest(url, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (url, options = {}) => apiRequest(url, { ...options, method: 'DELETE' })
};