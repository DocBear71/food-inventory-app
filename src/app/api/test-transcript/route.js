// Create this new file: /src/app/api/test-transcript/route.js

import { NextResponse } from 'next/server';

export async function POST(request) {
    console.log('🧪 [TEST] Starting transcript test endpoint');

    try {
        const { videoId = '6iFTwmZGKIw' } = await request.json();
        console.log('🧪 [TEST] Testing with video ID:', videoId);

        // Test 1: Basic environment check
        console.log('🧪 [TEST] Environment check:');
        console.log('  - typeof window:', typeof window);
        console.log('  - Node.js version:', process.version);
        console.log('  - Platform:', process.platform);

        // Test 2: Try to import the library
        console.log('🧪 [TEST] Attempting to import youtube-transcript...');

        try {
            // Method 1: Dynamic import
            console.log('🧪 [TEST] Trying dynamic import...');
            const transcriptModule = await import('youtube-transcript');
            console.log('🧪 [TEST] Dynamic import successful, keys:', Object.keys(transcriptModule));

            const YoutubeTranscript = transcriptModule.YoutubeTranscript;
            console.log('🧪 [TEST] YoutubeTranscript extracted:', typeof YoutubeTranscript);

            if (YoutubeTranscript) {
                console.log('🧪 [TEST] Attempting to fetch transcript...');

                // Simple test call
                const transcript = await YoutubeTranscript.fetchTranscript(videoId);
                console.log('🧪 [TEST] SUCCESS! Transcript length:', transcript?.length);

                return NextResponse.json({
                    success: true,
                    message: 'Transcript extraction test successful!',
                    transcriptLength: transcript?.length,
                    firstSegment: transcript?.[0],
                    environment: {
                        isServer: typeof window === 'undefined',
                        nodeVersion: process.version,
                        platform: process.platform
                    }
                });
            }

        } catch (importError) {
            console.error('🧪 [TEST] Import failed:', importError);

            // Test 3: Try require instead
            console.log('🧪 [TEST] Trying require...');
            try {
                const { YoutubeTranscript } = require('youtube-transcript');
                console.log('🧪 [TEST] Require successful');

                const transcript = await YoutubeTranscript.fetchTranscript(videoId);
                console.log('🧪 [TEST] SUCCESS with require! Transcript length:', transcript?.length);

                return NextResponse.json({
                    success: true,
                    message: 'Transcript extraction test successful with require!',
                    transcriptLength: transcript?.length,
                    method: 'require'
                });

            } catch (requireError) {
                console.error('🧪 [TEST] Require also failed:', requireError);
                throw new Error(`Both import and require failed. Import: ${importError.message}, Require: ${requireError.message}`);
            }
        }

    } catch (error) {
        console.error('🧪 [TEST] Test endpoint failed:', error);

        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
            environment: {
                isServer: typeof window === 'undefined',
                nodeVersion: process?.version,
                platform: process?.platform
            }
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Test endpoint is working. Use POST with videoId to test transcript extraction.',
        example: {
            method: 'POST',
            body: { videoId: '6iFTwmZGKIw' }
        }
    });
}