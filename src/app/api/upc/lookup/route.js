// file: /src/app/api/upc/lookup/route.js - v2 FIXED - Redirect to main UPC route for backward compatibility

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
    try {
        // Extract the UPC parameter from the original request
        const { searchParams } = new URL(request.url);
        const upc = searchParams.get('upc');

        if (!upc) {
            return NextResponse.json({ error: 'UPC code is required' }, { status: 400 });
        }

        // Create a new URL for the main UPC route
        const mainUpcUrl = new URL('/api/upc', request.url);
        mainUpcUrl.searchParams.set('upc', upc);

        console.log(`🔄 Redirecting /api/upc/lookup to /api/upc for UPC: ${upc}`);

        // Forward the request to the main UPC route
        const response = await fetch(mainUpcUrl.toString(), {
            method: 'GET',
            headers: {
                // Forward relevant headers
                'Authorization': request.headers.get('Authorization'),
                'Cookie': request.headers.get('Cookie'),
                'User-Agent': request.headers.get('User-Agent'),
                'Accept': 'application/json'
            }
        });

        // Get the response data
        const data = await response.json();

        // Return the response with the same structure expected by the old lookup route
        if (data.success && data.product?.found) {
            return NextResponse.json({
                success: true,
                product: data.product,
                usageIncremented: data.usageIncremented,
                dataSource: data.dataSource || 'Enhanced Database',
                remainingScans: data.remainingScans
            });
        } else {
            return NextResponse.json({
                success: false,
                found: false,
                message: data.message || 'Product not found',
                upc: upc,
                usageIncremented: data.usageIncremented || false,
                remainingScans: data.remainingScans
            }, { status: response.status });
        }

    } catch (error) {
        console.error('❌ UPC lookup redirect error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to lookup product information',
            details: error.message
        }, { status: 500 });
    }
}