// file: /src/app/api/debug/session/route.js
// Debug API to test session detection

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { cookies } from 'next/headers';

export async function GET(request) {
    console.log('🔍 Debug: Session API called');

    try {
        // Check NextAuth session
        const session = await auth();

        // Get all cookies
        const cookieStore = cookies();
        const allCookies = {};

        try {
            // Try to get session-related cookies
            const sessionToken = cookieStore.get('next-auth.session-token');
            const callbackUrl = cookieStore.get('next-auth.callback-url');
            const csrfToken = cookieStore.get('next-auth.csrf-token');

            allCookies.sessionToken = sessionToken ? 'present' : 'missing';
            allCookies.callbackUrl = callbackUrl ? 'present' : 'missing';
            allCookies.csrfToken = csrfToken ? 'present' : 'missing';

            // Get all cookie names
            allCookies.allCookieNames = Array.from(cookieStore).map(cookie => cookie.name);

        } catch (cookieError) {
            allCookies.error = cookieError.message;
        }

        // Check headers
        const headers = {
            authorization: request.headers.get('authorization') || 'none',
            cookie: request.headers.get('cookie') ? 'present' : 'missing',
            userAgent: request.headers.get('user-agent') || 'none'
        };

        const debugInfo = {
            session: {
                exists: !!session,
                userEmail: session?.user?.email || 'none',
                userId: session?.user?.id || 'none',
                isAdmin: session?.user?.isAdmin || false
            },
            cookies: allCookies,
            headers: headers,
            timestamp: new Date().toISOString()
        };

        console.log('🔍 Debug session info:', debugInfo);

        return NextResponse.json({
            success: true,
            message: session ? 'Session found' : 'No session found',
            debug: debugInfo
        });

    } catch (error) {
        console.error('Debug session error:', error);

        return NextResponse.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}