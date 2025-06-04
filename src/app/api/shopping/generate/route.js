// Replace the contents of: /src/app/api/shopping/generate/route.js
// This simplified version focuses on debugging the 404 issue

import { NextResponse } from 'next/server';

// GET endpoint for single recipe shopping list
export async function GET(request) {
    try {
        console.log('=== SHOPPING API CALLED ===');
        console.log('Request URL:', request.url);

        // Basic response first - let's make sure the route works
        return NextResponse.json({
            success: true,
            message: 'Shopping API is working!',
            timestamp: new Date().toISOString(),
            debug: {
                url: request.url,
                method: 'GET'
            }
        });

    } catch (error) {
        console.error('❌ Shopping API Error:', error);

        // Return detailed error information
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

// POST endpoint for multiple recipes
export async function POST(request) {
    try {
        console.log('=== SHOPPING API POST CALLED ===');

        return NextResponse.json({
            success: true,
            message: 'Shopping API POST is working!',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Shopping API POST Error:', error);

        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}