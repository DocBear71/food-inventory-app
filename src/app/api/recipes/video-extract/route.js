// file: /src/app/api/recipes/video-extract/route.js v9 - MODAL FOR ALL PLATFORMS

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
    facebook: {
        patterns: [
            /facebook\.com\/watch\/?\?v=(\d+)/i,
            /facebook\.com\/([^\/]+)\/videos\/(\d+)/i,
            /fb\.watch\/([a-zA-Z0-9_-]+)/i,
            /facebook\.com\/share\/r\/([a-zA-Z0-9_-]+)/i,
            /facebook\.com\/story\.php\?story_fbid=(\d+)/i,
            /facebook\.com\/events\/(\d+)\/permalink\/(\d+)/i,
            /facebook\.com\/reel\/(\d+)/i
        ],
        extractId: (url) => {
            for (const pattern of VIDEO_PLATFORMS.facebook.patterns) {
                const match = url.match(pattern);
                if (match) {
                    return match[match.length - 1];
                }
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
    throw new Error('Unsupported video platform. Currently supports TikTok, Instagram, and Facebook. For YouTube videos, please copy the transcript and use the Text Paste option instead.');
}

// Transform Modal response to match MongoDB schema
function transformModalDataToSchema(modalData, videoInfo) {
    console.log('🔄 [VERCEL] Transforming Modal data to schema format...');

    const recipe = modalData.recipe;
    const metadata = modalData.metadata;

    // Transform instructions: Modal format -> Schema format
    const transformedInstructions = (recipe.instructions || []).map(instruction => ({
        text: instruction.instruction || instruction.text || instruction, // Handle string fallback
        step: instruction.step || 1,
        videoTimestamp: instruction.timestamp || null, // Modal uses 'timestamp', schema uses 'videoTimestamp'
        videoLink: instruction.videoLink || null
    }));

    // Transform ingredients: Add videoTimestamp if present
    const transformedIngredients = (recipe.ingredients || []).map(ingredient => ({
        name: ingredient.name || '',
        amount: ingredient.amount || '',
        unit: ingredient.unit || '',
        optional: ingredient.optional || false,
        // Add video fields if present
        ...(ingredient.timestamp && {
            videoTimestamp: ingredient.timestamp,
            videoLink: ingredient.videoLink
        })
    }));

    // Create properly structured recipe for MongoDB
    const transformedRecipe = {
        title: recipe.title || '',
        description: recipe.description || '',
        ingredients: transformedIngredients,
        instructions: transformedInstructions,
        prepTime: recipe.prepTime || null,
        cookTime: recipe.cookTime || null,
        servings: recipe.servings || null,
        difficulty: recipe.difficulty || 'medium',
        tags: recipe.tags || [],
        source: recipe.videoSource || videoInfo.originalUrl,
        category: recipe.category || 'entrees',

        // Nutrition data (if present)
        nutrition: recipe.nutrition || {
            calories: null,
            protein: null,
            carbs: null,
            fat: null,
            fiber: null
        },

        // Video metadata - properly nested according to schema
        videoMetadata: {
            videoSource: recipe.videoSource || videoInfo.originalUrl,
            videoPlatform: recipe.videoPlatform || videoInfo.platform,
            videoId: videoInfo.videoId || null,
            videoTitle: recipe.videoTitle || metadata?.originalTitle || null,
            videoDuration: recipe.videoDuration || metadata?.videoDuration || null,
            extractionMethod: recipe.extractionMethod || metadata?.processingMethod || 'modal-ai',
            importedFrom: `${videoInfo.platform} video via Modal AI`,
            socialMediaOptimized: recipe.socialMediaOptimized || false,
            transcriptLength: recipe.transcriptLength || metadata?.transcriptLength || null,
            processingTime: recipe.processingTime || metadata?.processingMethod || null
        },

        // Default values for required schema fields
        isPublic: false,
        importedFrom: `${videoInfo.platform} video`
    };

    console.log('✅ [VERCEL] Schema transformation complete');
    return transformedRecipe;
}


// Call Modal for video processing (ALL PLATFORMS) - NO AUTH REQUIRED
async function callModalForVideoExtraction(videoInfo) {
    console.log(`🚀 [VERCEL] Calling Modal for ${videoInfo.platform} video extraction...`);

    try {
        const modalResponse = await fetch(process.env.MODAL_ENDPOINT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // No authorization needed - Modal web endpoints are public
            },
            body: JSON.stringify({
                video_url: videoInfo.originalUrl,
                platform: videoInfo.platform
                // OpenAI API key handled by Modal secrets
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

        console.log(`✅ [VERCEL] Modal ${videoInfo.platform} processing successful`);

        // Transform Modal data to match our MongoDB schema
        const transformedRecipe = transformModalDataToSchema(result, videoInfo);

        return {
            recipe: transformedRecipe,
            metadata: result.metadata,
            extractionMethod: `${videoInfo.platform}-modal-ai`,
            cost: result.metadata?.cost || 0.05,
            originalModalData: result // Keep for debugging
        };

    } catch (error) {
        console.error(`❌ [VERCEL] Modal ${videoInfo.platform} processing failed:`, error);
        throw error;
    }
}

// MAIN API ENDPOINT - SIMPLIFIED (Modal only)
export async function POST(request) {
    try {
        console.log('=== 🎬 [VERCEL] UNIFIED VIDEO RECIPE EXTRACTION START ===');

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
        console.log(`📺 [VERCEL] Video info: ${videoInfo.platform} - ${videoInfo.videoId}`);

        // Use Modal for ALL platforms (TikTok, Instagram, YouTube)
        const result = await callModalForVideoExtraction(videoInfo);

        console.log('✅ [VERCEL] Extraction complete:', {
            platform: videoInfo.platform,
            method: result.extractionMethod,
            cost: result.cost,
            hasTimestamps: result.recipe.instructions.some(i => i.videoTimestamp),
            title: result.recipe.title
        });

        // Return schema-compatible data
        return NextResponse.json({
            success: true,
            recipe: result.recipe, // Already transformed to match schema
            videoInfo: {
                platform: videoInfo.platform,
                videoId: videoInfo.videoId,
                originalUrl: videoInfo.originalUrl
            },
            extractionInfo: {
                method: result.extractionMethod,
                platform: videoInfo.platform,
                cost: { total_usd: result.cost },
                socialMediaOptimized: result.recipe.videoMetadata?.socialMediaOptimized || false,
                metadata: result.metadata || null,
                hasTimestamps: result.recipe.instructions.some(i => i.videoTimestamp) ||
                    result.recipe.ingredients.some(i => i.videoTimestamp),
                instructionCount: result.recipe.instructions.length,
                ingredientCount: result.recipe.ingredients.length,
                videoDuration: result.recipe.videoMetadata?.videoDuration,
                transcriptLength: result.recipe.videoMetadata?.transcriptLength
            },
            message: `Recipe extracted from ${videoInfo.platform} using Modal AI processing`
        });

    } catch (error) {
        console.error('=== 🎬 [VERCEL] VIDEO EXTRACTION ERROR ===');
        console.error('Error:', error.message);

        // Enhanced error messages per platform
        let enhancedErrorMessage = error.message;

        if (error.message.includes('Unsupported video platform')) {
            enhancedErrorMessage = 'Please enter a valid TikTok, Instagram, or Facebook video URL. For YouTube videos, copy the transcript and use the Text Paste option.';
        } else if (error.message.includes('Modal API error')) {
            enhancedErrorMessage = 'Video processing service is temporarily unavailable. Please try again in a few minutes.';
        }

        return NextResponse.json({
            error: enhancedErrorMessage,
            supportedPlatforms: ['TikTok', 'Instagram', 'Facebook'], // REMOVED YouTube
            note: 'All video processing powered by Modal AI. For YouTube, use Text Paste with transcripts.',
            troubleshooting: {
                tiktok: 'Use share links directly from TikTok app',
                instagram: 'Make sure Reels are public',
                facebook: 'Use public Facebook videos - share links work best',
                youtube: 'YouTube not supported - copy transcript and use Text Paste option instead' // NEW
            }
        }, { status: 400 });

    }
}