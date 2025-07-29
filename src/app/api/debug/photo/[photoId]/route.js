// file: /src/app/api/debug/photo/[photoId]/route.js - Detailed diagnostic endpoint

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { RecipePhoto } from '@/lib/models';

export async function GET(request, { params }) {
    try {
        const { photoId } = await params;

        console.log(`🔍 Debug request for photo: ${photoId}`);

        await connectDB();
        const photo = await RecipePhoto.findById(photoId);

        if (!photo) {
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
        }

        // Detailed analysis of the data structure
        const analysis = {
            photoId: photo._id,
            originalName: photo.originalName,
            mimeType: photo.mimeType,
            expectedSize: photo.size,

            // Data structure analysis
            dataType: typeof photo.data,
            dataConstructor: photo.data?.constructor?.name,
            isBuffer: Buffer.isBuffer(photo.data),

            // MongoDB Binary specific checks
            hasBsonType: !!photo.data?._bsontype,
            bsonType: photo.data?._bsontype,
            hasBuffer: !!photo.data?.buffer,
            hasValue: !!photo.data?.value,
            hasToString: typeof photo.data?.toString === 'function',

            // Try to get actual data length
            actualDataLength: null,
            conversionResults: {},
            errors: []
        };

        // Test different conversion methods
        const testMethods = [
            'buffer_property',
            'value_method_true',
            'value_method_false',
            'toString_base64',
            'direct_buffer',
            'string_base64'
        ];

        for (const method of testMethods) {
            try {
                let testBuffer = null;

                switch (method) {
                    case 'buffer_property':
                        if (photo.data?.buffer) {
                            testBuffer = Buffer.from(photo.data.buffer);
                        }
                        break;
                    case 'value_method_true':
                        if (typeof photo.data?.value === 'function') {
                            testBuffer = photo.data.value(true);
                        }
                        break;
                    case 'value_method_false':
                        if (typeof photo.data?.value === 'function') {
                            const result = photo.data.value(false);
                            testBuffer = Buffer.from(result);
                        }
                        break;
                    case 'toString_base64':
                        if (typeof photo.data?.toString === 'function') {
                            const base64String = photo.data.toString('base64');
                            testBuffer = Buffer.from(base64String, 'base64');
                        }
                        break;
                    case 'direct_buffer':
                        if (Buffer.isBuffer(photo.data)) {
                            testBuffer = photo.data;
                        }
                        break;
                    case 'string_base64':
                        if (typeof photo.data === 'string') {
                            testBuffer = Buffer.from(photo.data, 'base64');
                        }
                        break;
                }

                if (testBuffer) {
                    analysis.conversionResults[method] = {
                        success: true,
                        length: testBuffer.length,
                        matchesExpected: testBuffer.length === photo.size,
                        firstBytes: Array.from(testBuffer.slice(0, 10)),
                        firstBytesHex: testBuffer.slice(0, 10).toString('hex'),
                        isValidJPEG: testBuffer[0] === 0xFF && testBuffer[1] === 0xD8, // JPEG magic bytes
                        lastBytes: Array.from(testBuffer.slice(-4)),
                        lastBytesHex: testBuffer.slice(-4).toString('hex')
                    };
                } else {
                    analysis.conversionResults[method] = {
                        success: false,
                        reason: 'Method not applicable or returned null'
                    };
                }
            } catch (error) {
                analysis.conversionResults[method] = {
                    success: false,
                    error: error.message
                };
                analysis.errors.push(`${method}: ${error.message}`);
            }
        }

        // Additional MongoDB-specific checks
        if (photo.data && typeof photo.data === 'object') {
            analysis.objectKeys = Object.keys(photo.data);
            analysis.objectMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(photo.data));
        }

        return NextResponse.json({
            success: true,
            analysis,
            recommendations: generateRecommendations(analysis)
        });

    } catch (error) {
        console.error('Debug photo error:', error);
        return NextResponse.json({
            error: 'Debug failed',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

function generateRecommendations(analysis) {
    const recommendations = [];

    // Find the best conversion method
    const workingMethods = Object.entries(analysis.conversionResults)
        .filter(([method, result]) => result.success && result.matchesExpected && result.isValidJPEG);

    if (workingMethods.length > 0) {
        recommendations.push(`✅ Use method: ${workingMethods[0][0]}`);
        recommendations.push(`✅ Data length matches expected: ${workingMethods[0][1].length} bytes`);
        recommendations.push(`✅ Valid JPEG format detected`);
    } else {
        recommendations.push(`❌ No working conversion method found`);

        // Check for partial matches
        const sizeMismatches = Object.entries(analysis.conversionResults)
            .filter(([method, result]) => result.success && !result.matchesExpected);

        if (sizeMismatches.length > 0) {
            recommendations.push(`⚠️ Size mismatches found - check data corruption`);
        }

        const invalidJpegs = Object.entries(analysis.conversionResults)
            .filter(([method, result]) => result.success && !result.isValidJPEG);

        if (invalidJpegs.length > 0) {
            recommendations.push(`⚠️ Invalid JPEG headers - data may be corrupted or wrong format`);
        }
    }

    return recommendations;
}