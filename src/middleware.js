import { NextResponse } from 'next/server'

export function middleware(request) {
    // Get origin and determine if it's allowed
    const origin = request.headers.get('origin');
    const allowedOrigins = [
        'https://localhost', // Capacitor mobile
        'http://localhost:3000', // Development
        'https://docbearscomfort.kitchen', // Production
        'https://www.docbearscomfort.kitchen', // Production with www
        'capacitor://localhost',
        'ionic://localhost'
    ];

    console.log('🌍 Middleware request from origin:', origin, 'to:', request.nextUrl.pathname);

    // Handle CORS for all API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            const allowOrigin = (origin && allowedOrigins.includes(origin)) ? origin : 'https://localhost';

            return new NextResponse(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': allowOrigin,
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-native-platform, Accept, x-auth-return-redirect, Cookie', // Added missing headers
                    'Access-Control-Allow-Credentials': 'true',
                },
            });
        }

        // Add CORS headers to actual requests
        const response = NextResponse.next();
        const allowOrigin = (origin && allowedOrigins.includes(origin)) ? origin : 'https://localhost';

        response.headers.set('Access-Control-Allow-Origin', allowOrigin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-native-platform, Accept, x-auth-return-redirect, Cookie'); // Added missing headers
        response.headers.set('Access-Control-Allow-Credentials', 'true');

        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
}