import { NextResponse } from 'next/server'

export function middleware(request) {
    // Handle CORS for mobile app
    // if (request.nextUrl.pathname.startsWith('/api/')) {
    //     const response = NextResponse.next()

    //     // Allow mobile app origins
    //     response.headers.set('Access-Control-Allow-Origin', 'https://localhost')
    //     response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    //     response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    //     response.headers.set('Access-Control-Allow-Credentials', 'true')

    //     // Handle preflight requests
    //     if (request.method === 'OPTIONS') {
    //         return new Response(null, { status: 200, headers: response.headers })
    //     }

    //     return response
    // }

    return NextResponse.next()
}

export const config = {
    matcher: '/api/:path*',
}