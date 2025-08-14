// file: /src/app/api/auth/[...nextauth]/route.js v2 - Fixed with CORS support for mobile

import { handlers } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Add CORS headers to all auth requests
async function addCorsHeaders(request, response) {
    const headers = new Headers(response.headers);

    // Add CORS headers for mobile apps
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-native-platform');
    headers.set('Access-Control-Allow-Credentials', 'true');

    return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

export async function GET(request) {
    try {
        const response = await handlers.GET(request);
        return addCorsHeaders(request, response);
    } catch (error) {
        console.error('NextAuth GET error:', error);
        return NextResponse.json(
            { error: 'Authentication error' },
            {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-native-platform',
                }
            }
        );
    }
}

export async function POST(request) {
    try {
        const response = await handlers.POST(request);
        return addCorsHeaders(request, response);
    } catch (error) {
        console.error('NextAuth POST error:', error);
        return NextResponse.json(
            { error: 'Authentication error' },
            {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-native-platform',
                }
            }
        );
    }
}

export async function OPTIONS(request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-native-platform',
            'Access-Control-Allow-Credentials': 'true',
        },
    });
}