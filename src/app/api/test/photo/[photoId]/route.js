// file: /src/app/api/test/photo/[photoId]/route.js - Test endpoint with verbose logging

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { RecipePhoto } from '@/lib/models';

export async function GET(request, { params }) {
    const startTime = Date.now();

    try {
        const { photoId } = await params;
        console.log(`🧪 TEST: Starting photo request for ${photoId}`);

        if (!photoId) {
            console.error('❌ TEST: No photoId provided');
            return new NextResponse('No photo ID provided', { status: 400 });
        }

        await connectDB();
        console.log('✅ TEST: Database connected');

        const photo = await RecipePhoto.findById(photoId);

        if (!photo) {
            console.error('❌ TEST: Photo not found in database');
            return new NextResponse('Photo not found', { status: 404 });
        }

        console.log(`✅ TEST: Photo found - ${photo.originalName}`);
        console.log(`📊 TEST: Expected size: ${photo.size} bytes`);
        console.log(`📊 TEST: MIME type: ${photo.mimeType}`);
        console.log(`📊 TEST: Data type: ${typeof photo.data}`);
        console.log(`📊 TEST: Constructor: ${photo.data?.constructor?.name}`);

        let imageBuffer = null;
        let conversionMethod = 'unknown';

        // Try conversion methods in order of likelihood
        try {
            // Method 1: MongoDB Binary .value(true)
            if (photo.data && typeof photo.data.value === 'function') {
                console.log('🔄 TEST: Trying .value(true) method');
                imageBuffer = photo.data.value(true);
                conversionMethod = 'value_true';
                console.log(`✅ TEST: .value(true) succeeded - ${imageBuffer.length} bytes`);
            }
        } catch (error) {
            console.log(`❌ TEST: .value(true) failed - ${error.message}`);
        }

        if (!imageBuffer) {
            try {
                // Method 2: MongoDB Binary .buffer property
                if (photo.data?.buffer) {
                    console.log('🔄 TEST: Trying .buffer property');
                    imageBuffer = Buffer.from(photo.data.buffer);
                    conversionMethod = 'buffer_property';
                    console.log(`✅ TEST: .buffer succeeded - ${imageBuffer.length} bytes`);
                }
            } catch (error) {
                console.log(`❌ TEST: .buffer failed - ${error.message}`);
            }
        }

        if (!imageBuffer) {
            try {
                // Method 3: toString base64 then convert
                if (photo.data && typeof photo.data.toString === 'function') {
                    console.log('🔄 TEST: Trying .toString("base64") method');
                    const base64String = photo.data.toString('base64');
                    imageBuffer = Buffer.from(base64String, 'base64');
                    conversionMethod = 'toString_base64';
                    console.log(`✅ TEST: toString base64 succeeded - ${imageBuffer.length} bytes`);
                }
            } catch (error) {
                console.log(`❌ TEST: toString base64 failed - ${error.message}`);
            }
        }

        if (!imageBuffer) {
            try {
                // Method 4: Direct Buffer (if already a buffer)
                if (Buffer.isBuffer(photo.data)) {
                    console.log('🔄 TEST: Data is already a Buffer');
                    imageBuffer = photo.data;
                    conversionMethod = 'direct_buffer';
                    console.log(`✅ TEST: Direct buffer - ${imageBuffer.length} bytes`);
                }
            } catch (error) {
                console.log(`❌ TEST: Direct buffer failed - ${error.message}`);
            }
        }

        if (!imageBuffer) {
            try {
                // Method 5: String base64
                if (typeof photo.data === 'string') {
                    console.log('🔄 TEST: Trying string base64 conversion');
                    imageBuffer = Buffer.from(photo.data, 'base64');
                    conversionMethod = 'string_base64';
                    console.log(`✅ TEST: String base64 succeeded - ${imageBuffer.length} bytes`);
                }
            } catch (error) {
                console.log(`❌ TEST: String base64 failed - ${error.message}`);
            }
        }

        if (!imageBuffer || imageBuffer.length === 0) {
            console.error('❌ TEST: All conversion methods failed');
            return new NextResponse('Failed to process image data', { status: 500 });
        }

        // Validate the image data
        const isValidJPEG = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8;
        const sizeMatches = imageBuffer.length === photo.size;

        console.log(`🔍 TEST: Validation - JPEG: ${isValidJPEG}, Size match: ${sizeMatches}`);
        console.log(`🔍 TEST: First 4 bytes: ${imageBuffer.slice(0, 4).toString('hex')}`);
        console.log(`🔍 TEST: Last 4 bytes: ${imageBuffer.slice(-4).toString('hex')}`);

        if (!isValidJPEG) {
            console.warn('⚠️ TEST: Invalid JPEG header detected');
        }

        if (!sizeMatches) {
            console.warn(`⚠️ TEST: Size mismatch - expected ${photo.size}, got ${imageBuffer.length}`);
        }

        const processingTime = Date.now() - startTime;
        console.log(`✅ TEST: Serving image via ${conversionMethod} method in ${processingTime}ms`);

        // Return the image with detailed headers
        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': photo.mimeType || 'image/jpeg',
                'Content-Length': imageBuffer.length.toString(),
                'Cache-Control': 'no-cache', // Disable cache for testing
                'X-Conversion-Method': conversionMethod,
                'X-Original-Size': photo.size.toString(),
                'X-Actual-Size': imageBuffer.length.toString(),
                'X-Processing-Time': processingTime.toString(),
                'X-Valid-JPEG': isValidJPEG.toString(),
                'Content-Disposition': `inline; filename="${photo.originalName || 'test-photo.jpg'}"`,
            },
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error('❌ TEST: Fatal error:', error);
        console.error('❌ TEST: Stack:', error.stack);

        return new NextResponse(`Test failed: ${error.message}`, {
            status: 500,
            headers: {
                'X-Error': error.message,
                'X-Processing-Time': processingTime.toString()
            }
        });
    }
}