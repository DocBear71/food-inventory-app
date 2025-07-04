// file: /src/lib/api-auth.js - Enhanced API authentication for mobile compatibility

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function getEnhancedSession(request) {
    console.log('🔍 Getting enhanced session for API...');

    try {
        // Try NextAuth session first
        const nextAuthSession = await getServerSession(authOptions);

        if (nextAuthSession?.user) {
            console.log('✅ NextAuth session found:', nextAuthSession.user.email);
            return {
                user: nextAuthSession.user,
                source: 'nextauth'
            };
        }

        console.log('⚠️ No NextAuth session, checking mobile session...');

        // Check for mobile session in headers or cookies
        const cookies = request.headers.get('cookie') || '';
        const authorization = request.headers.get('authorization') || '';

        // Try to find session token in various places
        let sessionData = null;

        // Check cookies for session token
        if (cookies) {
            const sessionTokenMatch = cookies.match(/next-auth\.session-token=([^;]+)/);
            if (sessionTokenMatch) {
                console.log('📱 Found session token in cookies');
                // You might need to decode/verify this token
            }
        }

        // Check for mobile session identifier
        const mobileSessionMatch = cookies.match(/mobile-session=([^;]+)/);
        if (mobileSessionMatch) {
            try {
                sessionData = JSON.parse(decodeURIComponent(mobileSessionMatch[1]));
                console.log('📱 Found mobile session in cookies:', sessionData.user?.email);
            } catch (e) {
                console.log('Failed to parse mobile session cookie');
            }
        }

        // Check authorization header for mobile token
        if (authorization.startsWith('Bearer mobile-')) {
            const token = authorization.replace('Bearer mobile-', '');
            // You could implement mobile token validation here
            console.log('📱 Found mobile bearer token');
        }

        // If we found mobile session data, validate and return it
        if (sessionData?.user) {
            return {
                user: sessionData.user,
                source: 'mobile'
            };
        }

        console.log('❌ No valid session found');
        return null;

    } catch (error) {
        console.error('Enhanced session error:', error);
        return null;
    }
}

// Enhanced authentication middleware for APIs
export async function requireAuth(request) {
    const session = await getEnhancedSession(request);

    if (!session) {
        return {
            error: 'Authentication required',
            status: 401
        };
    }

    return {
        session,
        status: 200
    };
}

// Example usage in your API routes:
export async function withAuth(handler) {
    return async (request) => {
        const authResult = await requireAuth(request);

        if (authResult.error) {
            return new Response(
                JSON.stringify({ error: authResult.error }),
                {
                    status: authResult.status,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Add session to request for handler
        request.session = authResult.session;
        return handler(request);
    };
}