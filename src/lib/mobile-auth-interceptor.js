// file: /src/lib/mobile-auth-interceptor.js - Mobile authentication interceptor for production

import { CapacitorHttp } from '@capacitor/core';

class MobileAuthInterceptor {
    constructor() {
        this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://www.docbearscomfort.kitchen';
        this.sessionData = null;
    }

    // Set mobile session data
    setSessionData(session) {
        this.sessionData = session;
        console.log('📱 Mobile auth interceptor: Session data set');
    }

    // Clear session data
    clearSessionData() {
        this.sessionData = null;
        console.log('📱 Mobile auth interceptor: Session data cleared');
    }

    // Get standard headers for mobile requests
    getMobileHeaders(additionalHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'X-Mobile-App': 'docbears-comfort-kitchen',
            'X-User-Agent': 'DocBearsComfortKitchen/1.6.0',
            'X-Platform': 'ios',
            ...additionalHeaders
        };

        // Add session headers if available
        if (this.sessionData?.user) {
            headers['X-User-Email'] = this.sessionData.user.email;
            headers['X-User-ID'] = this.sessionData.user.id;

            if (this.sessionData.token) {
                headers['Authorization'] = `Bearer mobile-${this.sessionData.token}`;
            }
        }

        return headers;
    }

    // Enhanced fetch for mobile authentication
    async authenticatedFetch(url, options = {}) {
        const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

        const requestOptions = {
            ...options,
            headers: this.getMobileHeaders(options.headers)
        };

        console.log('📱 Mobile authenticated fetch:', {
            url: fullUrl,
            method: options.method || 'GET',
            hasSession: !!this.sessionData
        });

        try {
            // Use CapacitorHttp for mobile requests
            const response = await CapacitorHttp.request({
                url: fullUrl,
                method: options.method || 'GET',
                headers: requestOptions.headers,
                data: options.body ? JSON.parse(options.body) : undefined
            });

            // Convert CapacitorHttp response to standard fetch response format
            const standardResponse = {
                ok: response.status >= 200 && response.status < 300,
                status: response.status,
                headers: response.headers,
                json: async () => response.data,
                text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
                url: response.url
            };

            return standardResponse;
        } catch (error) {
            console.error('📱 Mobile authenticated fetch error:', error);
            throw error;
        }
    }

    // Specific method for authentication requests
    async authRequest(endpoint, credentials) {
        const url = `${this.baseURL}/api/auth${endpoint}`;

        console.log('🔐 Mobile auth request:', endpoint);

        const headers = this.getMobileHeaders({
            'X-Auth-Request': 'mobile-login'
        });

        try {
            const response = await CapacitorHttp.request({
                url,
                method: 'POST',
                headers,
                data: credentials
            });

            console.log('🔐 Mobile auth response:', {
                status: response.status,
                hasData: !!response.data
            });

            return {
                ok: response.status >= 200 && response.status < 300,
                status: response.status,
                data: response.data,
                headers: response.headers
            };
        } catch (error) {
            console.error('🔐 Mobile auth request error:', error);
            return {
                ok: false,
                status: 500,
                error: error.message
            };
        }
    }

    // Handle NextAuth callback URLs for mobile
    async handleAuthCallback(callbackUrl) {
        try {
            const url = new URL(callbackUrl);
            const searchParams = url.searchParams;

            // Check for authentication errors
            if (searchParams.has('error')) {
                const error = searchParams.get('error');
                console.error('🔐 Auth callback error:', error);

                if (error === 'MissingCSRF') {
                    console.log('🔧 CSRF error detected, attempting mobile auth flow');
                    return { success: false, error: 'MissingCSRF', requiresMobileAuth: true };
                }

                return { success: false, error };
            }

            // Check for successful authentication
            if (searchParams.has('token') || url.pathname.includes('dashboard')) {
                console.log('✅ Auth callback success detected');
                return { success: true };
            }

            return { success: false, error: 'Unknown callback state' };
        } catch (error) {
            console.error('🔐 Auth callback handling error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
export const mobileAuthInterceptor = new MobileAuthInterceptor();

// Enhanced mobile sign in function with debug - UPDATE in mobile-auth-interceptor.js
export async function mobileSignIn(email, password) {
    console.log('📱 Starting mobile sign in for:', email);

    try {
        const headers = mobileAuthInterceptor.getMobileHeaders();
        console.log('📱 Request headers:', headers);

        const requestBody = { email, password };
        console.log('📱 Request body:', requestBody);

        // Use the new mobile-specific auth endpoint
        const response = await mobileAuthInterceptor.authenticatedFetch('/api/auth/mobile-signin', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        console.log('📱 Response status:', response.status);
        console.log('📱 Response ok:', response.ok);

        let data;
        try {
            data = await response.json();
            console.log('📱 Response data:', data);
        } catch (jsonError) {
            console.error('📱 Failed to parse JSON response:', jsonError);
            const textResponse = await response.text();
            console.log('📱 Response text:', textResponse);
            return { success: false, error: 'Invalid server response' };
        }

        if (response.ok && data.success) {
            console.log('✅ Mobile sign in successful via direct API');

            // Store session data in the interceptor
            mobileAuthInterceptor.setSessionData(data.session);

            return {
                success: true,
                session: data.session,
                token: data.token
            };
        } else {
            console.log('❌ Mobile sign in failed:', data.error || data.message);
            return {
                success: false,
                error: data.error || data.message || 'Authentication failed'
            };
        }
    } catch (error) {
        console.error('📱 Mobile sign in error:', error);
        return { success: false, error: error.message };
    }
}

export default mobileAuthInterceptor;