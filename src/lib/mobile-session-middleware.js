// file: /src/lib/mobile-session-middleware.js
// Middleware to check both NextAuth and mobile sessions

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function getSessionFromRequest(request) {
    console.log('🔍 Checking session for API request...');

    try {
        // First, try NextAuth session
        const nextAuthSession = await getServerSession(authOptions);

        if (nextAuthSession?.user) {
            console.log('✅ NextAuth session found:', nextAuthSession.user.email);
            return {
                user: nextAuthSession.user,
                source: 'nextauth'
            };
        }

        console.log('⚠️ No NextAuth session, checking headers for mobile session...');

        // Check for mobile session in headers
        const mobileSessionHeader = request.headers.get('X-Mobile-Session');
        const userEmailHeader = request.headers.get('X-User-Email');
        const userIdHeader = request.headers.get('X-User-ID');

        if (mobileSessionHeader && userEmailHeader) {
            try {
                const mobileSession = JSON.parse(mobileSessionHeader);

                if (mobileSession.user?.email === userEmailHeader) {
                    console.log('✅ Valid mobile session found in headers:', userEmailHeader);
                    return {
                        user: mobileSession.user,
                        source: 'mobile-header'
                    };
                }
            } catch (e) {
                console.log('❌ Failed to parse mobile session header');
            }
        }

        // Check for user info in headers (fallback)
        if (userEmailHeader && userIdHeader) {
            console.log('✅ User info found in headers:', userEmailHeader);
            return {
                user: {
                    email: userEmailHeader,
                    id: userIdHeader,
                    // Add other necessary fields as needed
                },
                source: 'headers'
            };
        }

        console.log('❌ No valid session found');
        return null;

    } catch (error) {
        console.error('Session middleware error:', error);
        return null;
    }
}

// Enhanced API wrapper that accepts both session types
export function withMobileSessionSupport(handler) {
    return async (request) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
            return new Response(
                JSON.stringify({ error: 'Authentication required' }),
                {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Add session to request for the handler
        request.session = session;
        return handler(request);
    };
}