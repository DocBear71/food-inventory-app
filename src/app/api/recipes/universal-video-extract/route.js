// file: /src/app/api/recipes/universal-video-extract/route.js

import { NextResponse } from 'next/server';

const MODAL_ENDPOINT = process.env.MODAL_VIDEO_EXTRACT_ENDPOINT || 'https://docbear--social-video-recipe-extractor-extract-recipe-from-social-video.modal.run';

export async function POST(request) {
    try {
        console.log('🚀 Modal endpoint:', MODAL_ENDPOINT);
        console.log('🔧 Environment check:', {
            hasModalEndpoint: !!process.env.MODAL_VIDEO_EXTRACT_ENDPOINT,
            nodeEnv: process.env.NODE_ENV
        });

        const { video_url, platform, analysisType = 'ai_vision_enhanced', extractImage = true } = await request.json();

        // Basic validation
        if (!video_url) {
            return NextResponse.json({
                success: false,
                error: 'video_url is required'
            }, { status: 400 });
        }

        // Enhanced URL validation for universal support
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(video_url)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid URL format. Please provide a valid HTTP/HTTPS URL.'
            }, { status: 400 });
        }

        // Log the extraction attempt
        console.log(`🌍 Universal video extraction request:`, {
            platform: platform || 'auto-detect',
            url: video_url.substring(0, 100) + '...',
            extractImage
        });

        // Call Modal.com extraction endpoint
        const modalResponse = await fetch(MODAL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                video_url,
                platform: platform || 'auto-detect',
                analysis_type: analysisType,
                extract_image: extractImage
            })
        });

        if (!modalResponse.ok) {
            const errorText = await modalResponse.text();
            console.error('❌ Modal.com universal extraction failed:', {
                status: modalResponse.status,
                statusText: modalResponse.statusText,
                error: errorText
            });

            return NextResponse.json({
                success: false,
                error: 'Video extraction service temporarily unavailable',
                details: modalResponse.status === 504 ? 'Request timeout - video may be too long or platform may be slow' : 'Service error'
            }, { status: 500 });
        }

        const extractionResult = await modalResponse.json();

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
        console.log(`✅ Universal video extraction successful:`, {
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
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            cause: error.cause
        });

        return NextResponse.json({
            success: false,
            error: 'Internal server error during video extraction',
            details: error.message // Always show the actual error message for debugging
        }, { status: 500 });
    }
}