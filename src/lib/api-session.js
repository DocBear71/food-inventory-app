// file: /src/lib/api-session.js
// Fixed API session wrapper

import { auth } from '@/lib/auth';

import { NextResponse } from 'next/server';

export async function requireApiSession(request) {
    console.log('🔐 Checking API session...');

    try {
        const session = await auth();

        if (!session?.user) {
            console.log('❌ No server session found');
            return {
                error: NextResponse.json(
                    { error: 'Authentication required' },
                    { status: 401 }
                )
            };
        }

        console.log('✅ Server session found:', session.user.email);
        return { session };

    } catch (error) {
        console.error('API session check error:', error);
        return {
            error: NextResponse.json(
                { error: 'Authentication error' },
                { status: 500 }
            )
        };
    }
}

// Easy wrapper for API routes
export function withApiSession(handler) {
    return async (request) => {
        const authResult = await requireApiSession(request);

        if (authResult.error) {
            return authResult.error;
        }

        // Add session to request context
        request.session = authResult.session;
        return handler(request);
    };
}