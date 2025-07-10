// file: /src/app/api/recipes/video-extract/route.js v6 - CALLS MODAL

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';

// Video platform detection
const VIDEO_PLATFORMS = {
    tiktok: {
        patterns: [
            /tiktok\.com\/@([^/]+)\/video\/(\d+)/,
            /tiktok\.com\/t\/([a-zA-Z0-9]+)/,
            /vm\.tiktok\.com\/([a-zA-Z0-9]+)/,
            /tiktok\.com\/.*?\/video\/(\d+)/
        ],
        extractId: (url) => {
            for (const pattern of VIDEO_PLATFORMS.tiktok.patterns) {
                const match = url.match(pattern);
                if (match) return match[match.length - 1];
            }
            return null;
        }
    },
    instagram: {
        patterns: [
            /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
            /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
            /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/
        ],
        extractId: (url) => {
            for (const pattern of VIDEO_PLATFORMS.instagram.patterns) {
                const match = url.match(pattern);
                if (match) return match[1];
            }
            return null;
        }
    },
    youtube: {
        patterns: [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
        ],
        extractId: (url) => {
            for (const pattern of VIDEO_PLATFORMS.youtube.patterns) {
                const match = url.match(pattern);
                if (match) return match[1];
            }
            return null;
        }
    }
};

function detectVideoPlatform(url) {
    console.log('🎥 [VERCEL] Detecting video platform for URL:', url);

    for (const [platform, config] of Object.entries(VIDEO_PLATFORMS)) {
        const videoId = config.extractId(url);
        if (videoId) {
            console.log(`✅ [VERCEL] Detected ${platform} video: ${videoId}`);
            return { platform, videoId, originalUrl: url };
        }
    }

    throw new Error('Unsupported video platform. Currently supports TikTok, Instagram, and YouTube.');
}

// Call Modal for video processing
async function callModalForVideoExtraction(videoInfo) {
    console.log('🚀 [VERCEL] Calling Modal for video extraction:', videoInfo.platform);

    try {
        const modalResponse = await fetch(process.env.MODAL_ENDPOINT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add auth if Modal requires it
                ...(process.env.MODAL_API_KEY && {
                    'Authorization': `Bearer ${process.env.MODAL_API_KEY}`
                })
            },
            body: JSON.stringify({
                video_url: videoInfo.originalUrl,
                openai_api_key: process.env.OPENAI_API_KEY,
                platform: videoInfo.platform
            })
        });

        if (!modalResponse.ok) {
            const errorText = await modalResponse.text();
            throw new Error(`Modal API error (${modalResponse.status}): ${errorText}`);
        }

        const result = await modalResponse.json();

        if (!result.success) {
            throw new Error(result.error || 'Modal processing failed');
        }

        console.log('✅ [VERCEL] Modal processing successful');

        return {
            recipe: result.recipe,
            metadata: result.metadata,
            extractionMethod: `${videoInfo.platform}-modal-ai`,
            cost: 0.05 // Estimate
        };

    } catch (error) {
        console.error('❌ [VERCEL] Modal processing failed:', error);
        throw error;
    }
}

// Fallback: YouTube caption extraction (if Modal fails)
async function fallbackYouTubeCaption(videoInfo) {
    console.log('📝 [VERCEL] Trying YouTube caption fallback:', videoInfo.videoId);

    try {
        const transcriptModule = await import('youtube-transcript');
        const YoutubeTranscript = transcriptModule.YoutubeTranscript;

        const transcript = await YoutubeTranscript.fetchTranscript(videoInfo.videoId);

        if (transcript && transcript.length > 0) {
            const fullText = transcript.map(t => t.text || '').join(' ');

            // Basic recipe parsing (you could enhance this)
            return {
                recipe: {
                    title: `Recipe from YouTube Video`,
                    description: `Extracted from video captions`,
                    ingredients: [{ name: 'See video for ingredients', amount: '', unit: '', optional: false }],
                    instructions: ['Follow along with the video for detailed instructions.'],
                    videoSource: videoInfo.originalUrl,
                    videoPlatform: videoInfo.platform,
                    extractionMethod: 'youtube-captions-basic'
                },
                extractionMethod: 'youtube-captions-fallback',
                cost: 0
            };
        }

        throw new Error('No captions available');

    } catch (error) {
        console.log('❌ [VERCEL] YouTube caption fallback failed:', error.message);
        throw error;
    }
}

// MAIN API ENDPOINT
export async function POST(request) {
    try {
        console.log('=== 🎬 [VERCEL] SOCIAL MEDIA VIDEO RECIPE EXTRACTION START ===');

        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in to extract recipes from videos.' },
                { status: 401 }
            );
        }

        const { url } = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: 'Video URL is required' },
                { status: 400 }
            );
        }

        console.log('🎬 [VERCEL] Processing video URL:', url);

        // Detect video platform
        const videoInfo = detectVideoPlatform(url);
        console.log('📺 [VERCEL] Video info:', videoInfo);

        let result;

        try {
            // Try Modal first (works for TikTok, Instagram, YouTube)
            result = await callModalForVideoExtraction(videoInfo);
        } catch (modalError) {
            console.log('⚠️ [VERCEL] Modal failed, trying fallback:', modalError.message);

            // Fallback for YouTube only
            if (videoInfo.platform === 'youtube') {
                try {
                    result = await fallbackYouTubeCaption(videoInfo);
                } catch (fallbackError) {
                    throw new Error(`Both Modal and caption fallback failed. Modal: ${modalError.message}. Fallback: ${fallbackError.message}`);
                }
            } else {
                throw modalError; // No fallback for TikTok/Instagram
            }
        }

        console.log('✅ [VERCEL] Extraction complete:', {
            platform: videoInfo.platform,
            method: result.extractionMethod,
            cost: result.cost
        });

        return NextResponse.json({
            success: true,
            recipe: result.recipe,
            videoInfo: {
                platform: videoInfo.platform,
                videoId: videoInfo.videoId,
                originalUrl: videoInfo.originalUrl
            },
            extractionInfo: {
                method: result.extractionMethod,
                platform: videoInfo.platform,
                cost: { total_usd: result.cost },
                betaTesting: true,
                socialMediaOptimized: true
            },
            message: `Recipe extracted from ${videoInfo.platform} using AI processing`
        });

    } catch (error) {
        console.error('=== 🎬 [VERCEL] VIDEO EXTRACTION ERROR ===');
        console.error('Error:', error.message);

        return NextResponse.json({
            error: error.message,
            betaTesting: true,
            supportedPlatforms: ['TikTok', 'Instagram', 'YouTube'],
            note: 'Beta testing - social media video extraction'
        }, { status: 400 });
    }
}