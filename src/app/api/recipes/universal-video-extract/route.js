// file: /src/app/api/recipes/universal-video-extract/route.js

import { NextResponse } from 'next/server';

const MODAL_ENDPOINT = process.env.MODAL_ENDPOINT_URL || 'https://doc-bears-comfort-kitchen--social-video-recipe-extractor-703821.modal.run';

export async function POST(request) {
    try {
        console.log('🚀 Starting universal video extraction...');
        console.log('🔧 Modal endpoint:', MODAL_ENDPOINT);
        console.log('🔧 Environment variables:', {
            hasModalEndpoint: !!process.env.MODAL_ENDPOINT_URL,
            modalEndpointValue: process.env.MODAL_ENDPOINT_URL ? 'SET' : 'NOT SET',
            nodeEnv: process.env.NODE_ENV
        });

        const requestBody = await request.json();
        console.log('📦 Request body received:', requestBody);

        const { video_url, platform, analysisType = 'ai_vision_enhanced', extractImage = true } = requestBody;

        // Basic validation
        if (!video_url) {
            console.log('❌ Missing video_url');
            return NextResponse.json({
                success: false,
                error: 'video_url is required'
            }, { status: 400 });
        }

        // Enhanced URL validation for universal support
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(video_url)) {
            console.log('❌ Invalid URL format:', video_url);
            return NextResponse.json({
                success: false,
                error: 'Invalid URL format. Please provide a valid HTTP/HTTPS URL.'
            }, { status: 400 });
        }

        // Log the extraction attempt
        console.log('🌍 Universal video extraction request:', {
            platform: platform || 'auto-detect',
            url: video_url.substring(0, 100) + '...',
            extractImage,
            analysisType
        });

        // Prepare payload for Modal.com
        const modalPayload = {
            video_url,
            platform: platform || 'auto-detect',
            analysis_type: analysisType,
            extract_image: extractImage
        };

        console.log('📦 Sending to Modal.com:', modalPayload);
        console.log('🎯 Modal endpoint URL:', MODAL_ENDPOINT);

        // Call Modal.com extraction endpoint with better error handling
        let modalResponse;
        try {
            modalResponse = await fetch(MODAL_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(modalPayload)
            });
            console.log('📡 Modal.com response status:', modalResponse.status);
        } catch (fetchError) {
            console.error('❌ Fetch to Modal.com failed:', fetchError);
            console.error('❌ Fetch error details:', {
                name: fetchError.name,
                message: fetchError.message,
                cause: fetchError.cause,
                stack: fetchError.stack
            });

            return NextResponse.json({
                success: false,
                error: 'Failed to connect to video extraction service',
                details: `Network error: ${fetchError.message}`,
                modalEndpoint: MODAL_ENDPOINT,
                debugInfo: {
                    errorType: fetchError.name,
                    errorMessage: fetchError.message
                }
            }, { status: 503 });
        }

        if (!modalResponse.ok) {
            const errorText = await modalResponse.text();
            console.error('❌ Modal.com universal extraction failed:', {
                status: modalResponse.status,
                statusText: modalResponse.statusText,
                error: errorText
            });

            return NextResponse.json({
                success: false,
                error: 'Video extraction service error',
                details: `Modal.com responded with ${modalResponse.status}: ${errorText}`,
                modalStatus: modalResponse.status
            }, { status: 500 });
        }

        const extractionResult = await modalResponse.json();
        console.log('✅ Modal.com response received:', {
            success: extractionResult.success,
            hasRecipe: !!extractionResult.recipe,
            platform: extractionResult.platform
        });

        if (!extractionResult.success) {
            console.error('❌ Universal video extraction failed:', extractionResult.error);

            return NextResponse.json({
                success: false,
                error: extractionResult.error,
                platform: extractionResult.platform || platform,
                troubleshooting: extractionResult.troubleshooting || {}
            }, { status: 400 });
        }

        // Success response
        console.log('✅ Universal video extraction successful:', {
            platform: extractionResult.recipe?.method || platform,
            title: extractionResult.recipe?.title?.substring(0, 50) + '...',
            hasImage: !!extractionResult.recipe?.extractedImage
        });

        return NextResponse.json({
            success: true,
            recipe: {
                ...extractionResult.recipe,
                extractionMetadata: {
                    extractedAt: new Date().toISOString(),
                    platform: extractionResult.recipe?.method || platform || 'universal',
                    imageExtracted: !!extractionResult.recipe?.extractedImage,
                    apiVersion: 'universal-v1'
                }
            },
            extractedImage: extractionResult.extractedImage || extractionResult.recipe?.extractedImage,
            metadata: extractionResult.metadata
        });

    } catch (error) {
        console.error('❌ Universal video extraction API error:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error details:', {
            name: error.name,
            message: error.message,
            cause: error.cause
        });

        return NextResponse.json({
            success: false,
            error: 'Internal server error during video extraction',
            details: error.message,
            errorType: error.name,
            debugInfo: {
                stack: error.stack.split('\n').slice(0, 5) // First 5 lines of stack trace
            }
        }, { status: 500 });
    }
}