// Replace /src/app/api/shopping/generate/route.js with this version
// We'll add back imports one by one to find the issue

import { NextResponse } from 'next/server';

// Step 1: Test basic imports first
let authModule, mongoModule, modelsModule;

try {
    // Try importing auth
    authModule = await import('@/lib/auth');
    console.log('✅ Auth import successful');
} catch (error) {
    console.error('❌ Auth import failed:', error.message);
}

try {
    // Try importing mongodb
    mongoModule = await import('@/lib/mongodb');
    console.log('✅ MongoDB import successful');
} catch (error) {
    console.error('❌ MongoDB import failed:', error.message);
}

try {
    // Try importing models
    modelsModule = await import('@/lib/models');
    console.log('✅ Models import successful');
} catch (error) {
    console.error('❌ Models import failed:', error.message);
}

// GET endpoint for single recipe shopping list
export async function GET(request) {
    try {
        console.log('=== SHOPPING API CALLED ===');

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        console.log('Recipe ID:', recipeId);

        // Check what imports worked
        const importStatus = {
            auth: !!authModule,
            mongodb: !!mongoModule,
            models: !!modelsModule,
            authOptions: !!authModule?.authOptions,
            connectDB: !!mongoModule?.default,
            Recipe: !!modelsModule?.Recipe,
            UserInventory: !!modelsModule?.UserInventory
        };

        console.log('Import status:', importStatus);

        // Basic functionality test
        if (!recipeId) {
            return NextResponse.json({
                success: false,
                error: 'Recipe ID is required',
                debug: {
                    recipeId,
                    importStatus,
                    url: request.url
                }
            }, { status: 400 });
        }

        // Try session check if auth is available
        let sessionResult = null;
        if (authModule?.authOptions) {
            try {
                const { getServerSession } = await import('next-auth/next');
                sessionResult = await getServerSession(authModule.authOptions);
                console.log('Session check:', sessionResult ? 'authenticated' : 'not authenticated');
            } catch (sessionError) {
                console.error('Session error:', sessionError.message);
                sessionResult = { error: sessionError.message };
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Shopping API with imports working!',
            debug: {
                recipeId,
                importStatus,
                sessionResult: sessionResult ? 'session found' : 'no session',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Shopping API Error:', error);

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

        const body = await request.json();
        console.log('Request body:', body);

        return NextResponse.json({
            success: true,
            message: 'Shopping API POST working!',
            receivedData: body,
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