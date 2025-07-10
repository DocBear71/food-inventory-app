// file: /src/app/api/recipes/video-extract/route.js - SIMPLIFIED FOR TESTING

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import {
    parseIngredientLine,
    parseInstructionLine,
    extractMetadata,
    cleanTitle
} from '@/lib/recipe-parsing-utils';

// Video platform detection
const VIDEO_PLATFORMS = {
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
    console.log('🎥 [SIMPLIFIED] Detecting video platform for URL:', url);

    for (const [platform, config] of Object.entries(VIDEO_PLATFORMS)) {
        const videoId = config.extractId(url);
        if (videoId) {
            console.log(`✅ [SIMPLIFIED] Detected ${platform} video: ${videoId}`);
            return { platform, videoId, originalUrl: url };
        }
    }

    throw new Error('Unsupported video platform. Currently supports YouTube.');
}

// SIMPLIFIED: Only caption extraction (no AI methods)
async function extractYouTubeTranscript(videoId) {
    console.log('📝 [SIMPLIFIED] Attempting caption extraction for:', videoId);

    try {
        const transcriptModule = await import('youtube-transcript');
        const YoutubeTranscript = transcriptModule.YoutubeTranscript;

        if (!YoutubeTranscript) {
            throw new Error('Failed to load YoutubeTranscript library');
        }

        const extractionMethods = [
            { name: 'Default', attempt: () => YoutubeTranscript.fetchTranscript(videoId) },
            { name: 'English', attempt: () => YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' }) },
            { name: 'English-US', attempt: () => YoutubeTranscript.fetchTranscript(videoId, { lang: 'en', country: 'US' }) },
            { name: 'Auto-generated', attempt: () => YoutubeTranscript.fetchTranscript(videoId, { lang: 'en-US' }) }
        ];

        for (const method of extractionMethods) {
            try {
                console.log(`🔍 [SIMPLIFIED] Trying ${method.name} method...`);
                const transcript = await method.attempt();

                if (transcript && Array.isArray(transcript) && transcript.length > 0) {
                    console.log(`✅ [SIMPLIFIED] SUCCESS with ${method.name}! Found ${transcript.length} segments`);

                    const segments = transcript.map(segment => ({
                        text: segment.text || '',
                        start: (segment.offset || 0) / 1000,
                        duration: (segment.duration || 0) / 1000
                    }));

                    const fullText = transcript.map(t => t.text || '').join(' ');
                    const totalDuration = Math.max(...transcript.map(t => ((t.offset || 0) + (t.duration || 0)) / 1000));

                    return {
                        segments: segments,
                        fullText: fullText,
                        totalDuration: totalDuration,
                        extractionMethod: 'captions',
                        quality: 'high'
                    };
                }
            } catch (methodError) {
                console.log(`❌ [SIMPLIFIED] ${method.name} failed:`, methodError.message);
                continue;
            }
        }

        throw new Error('All caption extraction methods failed');

    } catch (error) {
        console.log('❌ [SIMPLIFIED] Caption extraction failed:', error.message);

        // Enhanced error handling with specific messages
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('transcript is disabled')) {
            throw new Error(`This video has captions disabled by the creator. Please try a different video from channels like Bon Appétit, Tasty, or Joshua Weissman that typically enable captions.

SUGGESTED VIDEOS TO TRY:
• Bon Appétit cooking videos
• Tasty recipe demonstrations  
• Joshua Weissman tutorials
• America's Test Kitchen episodes

These channels usually have captions enabled for accessibility.`);
        } else if (errorMessage.includes('video unavailable') || errorMessage.includes('private')) {
            throw new Error('Video is unavailable, private, or restricted. Please try a different public video.');
        } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            throw new Error('Video not found. Please verify the URL is correct.');
        } else if (errorMessage.includes('blocked') || errorMessage.includes('region')) {
            throw new Error('Video is geo-blocked or region-restricted. Please try a different video.');
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
            throw new Error('Rate limit exceeded. Please wait a minute and try again.');
        } else if (errorMessage.includes('no transcript') || errorMessage.includes('captions')) {
            throw new Error(`No captions found for this video. Please try videos from major cooking channels that typically have captions enabled.

TIP: Look for the "CC" button in the YouTube player - if it's grayed out or missing, the video doesn't have captions.`);
        } else {
            throw new Error(`Could not extract captions from this video. This may be because:

1. The video creator has disabled captions
2. The video is too new and captions haven't been generated yet
3. The video is in a language that doesn't support auto-captions

Please try a different cooking video from a major channel.

Debug info: ${error.message}`);
        }
    }
}

// Simplified recipe parsing (basic version)
function parseRecipeFromTranscript(transcriptData, videoInfo) {
    console.log('🧠 [SIMPLIFIED] Parsing recipe from transcript...');

    const recipe = {
        title: '',
        description: '',
        ingredients: [],
        instructions: [],
        prepTime: null,
        cookTime: null,
        servings: null,
        difficulty: 'medium',
        tags: ['video-recipe', 'beta-testing'],
        source: `Extracted from ${videoInfo.platform} video`,
        videoSource: videoInfo.originalUrl,
        videoId: videoInfo.videoId,
        videoPlatform: videoInfo.platform,
        category: 'entrees',
        extractionMethod: 'captions-only'
    };

    const text = transcriptData.fullText;
    const segments = transcriptData.segments;

    // Simple title extraction
    recipe.title = extractSimpleTitle(text, videoInfo);

    // Basic ingredient and instruction extraction
    const parsedContent = parseBasicRecipeContent(text, segments, videoInfo);
    recipe.ingredients = parsedContent.ingredients;
    recipe.instructions = parsedContent.instructions;

    // Extract basic metadata
    extractBasicMetadata(text, recipe);

    console.log('✅ [SIMPLIFIED] Recipe parsing complete:', {
        title: recipe.title,
        ingredients: recipe.ingredients.length,
        instructions: recipe.instructions.length,
        platform: videoInfo.platform
    });

    return recipe;
}

// Simple title extraction
function extractSimpleTitle(text, videoInfo) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    // Look for common cooking patterns in first few lines
    const patterns = [
        /(?:making|cooking|preparing)\s+(.+?)(?:\.|,|!|\?|$)/i,
        /(?:recipe for|how to make)\s+(.+?)(?:\.|,|!|\?|$)/i,
        /(?:today.*?)\s+(.+?)(?:\.|,|!|\?|$)/i
    ];

    for (let i = 0; i < Math.min(3, lines.length); i++) {
        for (const pattern of patterns) {
            const match = lines[i].match(pattern);
            if (match && match[1].length > 3 && match[1].length < 50) {
                return cleanTitle(match[1]);
            }
        }
    }

    return `Recipe from ${videoInfo.platform} Video`;
}

// Basic content parsing
function parseBasicRecipeContent(text, segments, videoInfo) {
    const ingredients = [];
    const instructions = [];

    // Simple keyword-based parsing
    segments.forEach((segment, index) => {
        const segmentText = segment.text.toLowerCase();

        // Look for ingredient-like segments
        if (hasIngredientKeywords(segmentText)) {
            const parsed = parseIngredientLine(segment.text);
            if (parsed && parsed.name) {
                parsed.timestamp = segment.start;
                parsed.videoLink = `${videoInfo.originalUrl}&t=${Math.floor(segment.start)}s`;
                ingredients.push(parsed);
            }
        }

        // Look for instruction-like segments
        if (hasInstructionKeywords(segmentText)) {
            instructions.push({
                step: instructions.length + 1,
                instruction: segment.text,
                timestamp: segment.start,
                videoLink: `${videoInfo.originalUrl}&t=${Math.floor(segment.start)}s`
            });
        }
    });

    // Fallback: if no structured content found, create basic recipe
    if (ingredients.length === 0) {
        ingredients.push({ name: 'See video for ingredients', amount: '', unit: '', optional: false });
    }

    if (instructions.length === 0) {
        instructions.push({
            step: 1,
            instruction: 'Follow along with the video for detailed instructions.',
            timestamp: 0,
            videoLink: videoInfo.originalUrl
        });
    }

    return { ingredients, instructions };
}

// Helper functions
function hasIngredientKeywords(text) {
    const keywords = ['cup', 'tablespoon', 'teaspoon', 'pound', 'ounce', 'gram', 'add', 'need', 'take'];
    return keywords.some(keyword => text.includes(keyword));
}

function hasInstructionKeywords(text) {
    const keywords = ['first', 'then', 'next', 'now', 'mix', 'stir', 'cook', 'bake', 'heat', 'pour'];
    return keywords.some(keyword => text.includes(keyword));
}

function extractBasicMetadata(text, recipe) {
    const lowerText = text.toLowerCase();

    // Basic time extraction
    const timeMatch = lowerText.match(/(\d+)\s*minutes?/);
    if (timeMatch) {
        const time = parseInt(timeMatch[1]);
        if (time > 0 && time < 180) {
            recipe.cookTime = time;
        }
    }

    // Basic serving extraction
    const servingMatch = lowerText.match(/(?:serves?|for)\s*(\d+)/);
    if (servingMatch) {
        const servings = parseInt(servingMatch[1]);
        if (servings > 0 && servings < 20) {
            recipe.servings = servings;
        }
    }

    // Basic difficulty
    if (lowerText.includes('easy') || lowerText.includes('simple')) {
        recipe.difficulty = 'easy';
    } else if (lowerText.includes('advanced') || lowerText.includes('difficult')) {
        recipe.difficulty = 'hard';
    }
}

// MAIN API ENDPOINT (SIMPLIFIED)
export async function POST(request) {
    try {
        console.log('=== 🎥 [SIMPLIFIED] VIDEO RECIPE EXTRACTION START ===');

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

        console.log('🎬 [SIMPLIFIED] Processing video URL:', url);

        // Detect video platform
        const videoInfo = detectVideoPlatform(url);
        console.log('📺 [SIMPLIFIED] Video info:', videoInfo);

        // Extract transcript using ONLY captions (no AI methods)
        const transcriptData = await extractYouTubeTranscript(videoInfo.videoId);

        // Parse recipe
        const recipe = await parseRecipeFromTranscript(transcriptData, videoInfo);

        console.log('✅ [SIMPLIFIED] Extraction complete:', {
            method: 'captions-only',
            title: recipe.title,
            ingredients: recipe.ingredients.length,
            instructions: recipe.instructions.length
        });

        return NextResponse.json({
            success: true,
            recipe,
            videoInfo: {
                platform: videoInfo.platform,
                videoId: videoInfo.videoId,
                originalUrl: videoInfo.originalUrl,
                transcriptSegments: transcriptData.segments?.length || 0,
                totalDuration: transcriptData.totalDuration
            },
            extractionInfo: {
                method: 'captions-only',
                quality: 'high',
                cost: { total_usd: 0, note: 'Free caption extraction' },
                betaTesting: true
            },
            message: `Recipe extracted using caption extraction (beta testing mode)`
        });

    } catch (error) {
        console.error('=== 🎥 [SIMPLIFIED] VIDEO EXTRACTION ERROR ===');
        console.error('Error:', error.message);

        return NextResponse.json({
            error: error.message,
            betaTesting: true,
            currentMethod: 'captions-only',
            suggestions: [
                'Try videos from channels with good captions (Bon Appétit, Tasty, Joshua Weissman)',
                'Look for the CC button in the YouTube player',
                'Use our "Parse Recipe Text" feature as an alternative'
            ],
            supportedPlatforms: 'YouTube (with captions only during beta)',
            note: 'Currently in beta testing - only caption extraction is available'
        }, { status: 400 });
    }
}