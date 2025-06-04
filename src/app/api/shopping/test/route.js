// Create this file: /src/app/api/shopping/test/route.js
// This is just to test if API routes are working

import { NextResponse } from 'next/server';

export async function GET(request) {
    console.log('Test API route called');

    return NextResponse.json({
        success: true,
        message: 'Shopping API routes are working!',
        timestamp: new Date().toISOString()
    });
}