// file: /src/app/api/recipes/video-extract/route.js v6 - TIKTOK & INSTAGRAM FOCUS

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Enhanced video platform detection with TikTok/Instagram focus
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
                if (match) return match[match.length - 1]; // Get the last captured group
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
    console.log('🎥 [SOCIAL] Detecting video platform for URL:', url);

    for (const [platform, config] of Object.entries(VIDEO_PLATFORMS)) {
        const videoId = config.extractId(url);
        if (videoId) {
            console.log(`✅ [SOCIAL] Detected ${platform} video: ${videoId}`);
            return { platform, videoId, originalUrl: url };
        }
    }

    throw new Error('Unsupported video platform. Currently supports TikTok, Instagram, and YouTube.');
}

// TikTok video processing (using Modal for audio extraction)
async function processTikTokVideo(videoInfo) {
    console.log('🎵 [TIKTOK] Processing TikTok video:', videoInfo.videoId);

    try {
        // Call Modal for TikTok processing
        const modalResponse = await fetch(process.env.MODAL_ENDPOINT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MODAL_API_KEY}`
            },
            body: JSON.stringify({
                video_url: videoInfo.originalUrl,
                openai_api_key: process.env.OPENAI_API_KEY,
                platform: 'tiktok'
            })
        });

        if (!modalResponse.ok) {
            throw new Error(`Modal API error: ${modalResponse.status}`);
        }

        const result = await modalResponse.json();

        if (!result.success) {
            throw new Error(result.error || 'TikTok processing failed');
        }

        console.log('✅ [TIKTOK] Processing successful');

        return {
            recipe: result.recipe,
            metadata: result.metadata,
            extractionMethod: 'tiktok-modal-ai',
            cost: 0.05 // Estimate for short TikTok video
        };

    } catch (error) {
        console.error('❌ [TIKTOK] Processing failed:', error);
        throw error;
    }
}

// Instagram video processing
async function processInstagramVideo(videoInfo) {
    console.log('📸 [INSTAGRAM] Processing Instagram video:', videoInfo.videoId);

    try {
        // Call Modal for Instagram processing
        const modalResponse = await fetch(process.env.MODAL_ENDPOINT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MODAL_API_KEY}`
            },
            body: JSON.stringify({
                video_url: videoInfo.originalUrl,
                openai_api_key: process.env.OPENAI_API_KEY,
                platform: 'instagram'
            })
        });

        if (!modalResponse.ok) {
            throw new Error(`Modal API error: ${modalResponse.status}`);
        }

        const result = await modalResponse.json();

        if (!result.success) {
            throw new Error(result.error || 'Instagram processing failed');
        }

        console.log('✅ [INSTAGRAM] Processing successful');

        return {
            recipe: result.recipe,
            metadata: result.metadata,
            extractionMethod: 'instagram-modal-ai',
            cost: 0.08 // Estimate for Instagram reel
        };

    } catch (error) {
        console.error('❌ [INSTAGRAM] Processing failed:', error);
        throw error;
    }
}

// YouTube processing with caption fallback
async function processYouTubeVideo(videoInfo) {
    console.log('📺 [YOUTUBE] Processing YouTube video with captions:', videoInfo.videoId);

    try {
        // Try caption extraction first
        const transcriptModule = await import('youtube-transcript');
        const YoutubeTranscript = transcriptModule.YoutubeTranscript;

        const extractionMethods = [
            { name: 'Default', attempt: () => YoutubeTranscript.fetchTranscript(videoInfo.videoId) },
            { name: 'English', attempt: () => YoutubeTranscript.fetchTranscript(videoInfo.videoId, { lang: 'en' }) }
        ];

        for (const method of extractionMethods) {
            try {
                console.log(`🔍 [YOUTUBE] Trying ${method.name} captions...`);
                const transcript = await method.attempt();

                if (transcript && Array.isArray(transcript) && transcript.length > 0) {
                    console.log(`✅ [YOUTUBE] Captions found with ${method.name}!`);

                    const fullText = transcript.map(t => t.text || '').join(' ');

                    // Use AI to parse captions
                    const aiRecipe = await parseTranscriptWithAI(fullText, videoInfo);

                    return {
                        recipe: aiRecipe,
                        extractionMethod: 'youtube-captions-ai',
                        cost: 0.002 // Very low cost for caption processing
                    };
                }
            } catch (methodError) {
                console.log(`❌ [YOUTUBE] ${method.name} failed:`, methodError.message);
                continue;
            }
        }

        throw new Error('No captions available for this YouTube video');

    } catch (error) {
        console.error('❌ [YOUTUBE] Caption processing failed:', error);
        throw error;
    }
}

// AI transcript parsing
async function parseTranscriptWithAI(transcriptText, videoInfo) {
    console.log('🤖 [AI] Parsing transcript with AI...');

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
            role: "user",
            content: `Analyze this ${videoInfo.platform} video transcript and extract a recipe:

PLATFORM: ${videoInfo.platform.toUpperCase()}
TRANSCRIPT: ${transcriptText.substring(0, 3000)}...

Extract as JSON:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [
    {"name": "ingredient", "amount": "1", "unit": "cup", "optional": false}
  ],
  "instructions": [
    "Step 1: Clear instruction...",
    "Step 2: Next step..."
  ],
  "prepTime": 5,
  "cookTime": 15,
  "servings": 2,
  "difficulty": "easy",
  "tags": ["quick", "${videoInfo.platform}", "social-media"]
}

For ${videoInfo.platform} videos:
- Keep it simple and quick (${videoInfo.platform === 'tiktok' ? '15-60 seconds' : '30-90 seconds'})
- Focus on visual cooking techniques
- Use trendy, accessible ingredients
- Write concise, action-oriented steps

Return ONLY JSON.`
        }],
        temperature: 0.2,
        max_tokens: 1500
    });

    let recipe_json = response.choices[0].message.content.trim();
    if (recipe_json.startsWith("```json")) {
        recipe_json = recipe_json.replace("```json", "").replace("```", "").trim();
    }

    const recipe = JSON.parse(recipe_json);

    // Add platform metadata
    recipe.videoSource = videoInfo.originalUrl;
    recipe.videoPlatform = videoInfo.platform;
    recipe.videoId = videoInfo.videoId;
    recipe.extractionMethod = `${videoInfo.platform}-ai-enhanced`;
    recipe.socialMedia = true;

    return recipe;
}

// Main extraction router
async function extractRecipeFromSocialVideo(videoInfo) {
    console.log('🚀 [SOCIAL] Starting social media video extraction for:', videoInfo.platform);

    switch (videoInfo.platform) {
        case 'tiktok':
            return await processTikTokVideo(videoInfo);

        case 'instagram':
            return await processInstagramVideo(videoInfo);

        case 'youtube':
            return await processYouTubeVideo(videoInfo);

        default:
            throw new Error(`Unsupported platform: ${videoInfo.platform}`);
    }
}

// MAIN API ENDPOINT
export async function POST(request) {
    try {
        console.log('=== 🎬 [SOCIAL] SOCIAL MEDIA VIDEO RECIPE EXTRACTION START ===');

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

        console.log('🎬 [SOCIAL] Processing video URL:', url);

        // Detect video platform
        const videoInfo = detectVideoPlatform(url);
        console.log('📺 [SOCIAL] Video info:', videoInfo);

        // Extract recipe from social video
        const result = await extractRecipeFromSocialVideo(videoInfo);

        console.log('✅ [SOCIAL] Extraction complete:', {
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
        console.error('=== 🎬 [SOCIAL] VIDEO EXTRACTION ERROR ===');
        console.error('Error:', error.message);

        // Platform-specific error messages
        let suggestions = [];
        if (error.message.includes('tiktok')) {
            suggestions = [
                'Try TikTok cooking videos from popular food creators',
                'Look for recipe-focused content (not just food shows)',
                'Use shorter videos (15-60 seconds work best)'
            ];
        } else if (error.message.includes('instagram')) {
            suggestions = [
                'Try Instagram Reels from food accounts',
                'Look for recipe videos (not just food photography)',
                'Use @tasty, @buzzfeedtasty, or similar accounts'
            ];
        } else {
            suggestions = [
                'Try TikTok or Instagram videos (they work better than YouTube)',
                'Look for short, recipe-focused content',
                'Use our "Parse Recipe Text" feature as an alternative'
            ];
        }

        return NextResponse.json({
            error: error.message,
            betaTesting: true,
            preferredPlatforms: ['TikTok', 'Instagram', 'YouTube (with captions)'],
            suggestions: suggestions,
            note: 'Beta testing - TikTok and Instagram videos work best'
        }, { status: 400 });
    }
}