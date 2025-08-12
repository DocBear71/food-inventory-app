// file: /src/app/api/recipes/video-extract/route.js v10 - ENHANCED WITH IMAGE EXTRACTION

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
    },
    twitter: {
        patterns: [
            /(twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/
        ],
        extractId: (url) => {
            const match = url.match(/(twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/);
            return match ? match[2] : null;
        }
    },
    youtube: {
        patterns: [
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
            /youtu\.be\/([a-zA-Z0-9_-]+)/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/
        ],
        extractId: (url) => {
            for (const pattern of VIDEO_PLATFORMS.youtube.patterns) {
                const match = url.match(pattern);
                if (match) return match[1];
            }
            return null;
        }
    },
    reddit: {
        patterns: [
            /reddit\.com\/r\/[^\/]+\/comments\/([a-zA-Z0-9]+)/,
            /redd\.it\/([a-zA-Z0-9]+)/
        ],
        extractId: (url) => {
            for (const pattern of VIDEO_PLATFORMS.reddit.patterns) {
                const match = url.match(pattern);
                if (match) return match[1];
            }
            return null;
        }
    },
    bluesky: {
        patterns: [
            /bsky\.app\/profile\/[^\/]+\/post\/([a-zA-Z0-9]+)/
        ],
        extractId: (url) => {
            const match = url.match(/bsky\.app\/profile\/[^\/]+\/post\/([a-zA-Z0-9]+)/);
            return match ? match[1] : null;
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
    throw new Error('Unsupported video platform. Currently supports TikTok, Instagram, Facebook, Twitter/X, YouTube, Reddit, and Bluesky videos.');
}

// ENHANCED: Transform Modal response with image data
function transformModalDataToSchema(modalData, videoInfo) {
    console.log('🔄 [VERCEL] Transforming Modal data to schema format...');

    const recipe = modalData.recipe;
    const metadata = modalData.metadata;

    // Transform instructions: Modal format -> Schema format
    const transformedInstructions = (recipe.instructions || []).map(instruction => ({
        text: instruction.instruction || instruction.text || instruction,
        step: instruction.step || 1,
        videoTimestamp: instruction.timestamp || null,
        videoLink: instruction.videoLink || null
    }));

    // Transform ingredients: Add videoTimestamp if present
    const transformedIngredients = (recipe.ingredients || []).map(ingredient => ({
        name: ingredient.name || '',
        amount: ingredient.amount || '',
        unit: ingredient.unit || '',
        optional: ingredient.optional || false,
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

        // NEW: Extracted image data (if present)
        ...(recipe.extractedImage && {
            extractedImage: {
                data: recipe.extractedImage.data,
                extractionMethod: recipe.extractedImage.extractionMethod,
                frameCount: recipe.extractedImage.frameCount,
                source: recipe.extractedImage.source || videoInfo.platform,
                extractedAt: new Date()
            }
        }),

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
            processingTime: recipe.processingTime || metadata?.processingMethod || null,
            hasExtractedImage: !!(recipe.extractedImage)  // NEW: Flag for image presence
        },

        // Default values for required schema fields
        isPublic: false,
        importedFrom: `${videoInfo.platform} video`
    };

    console.log('✅ [VERCEL] Schema transformation complete');
    if (transformedRecipe.extractedImage) {
        console.log('📸 [VERCEL] Image data included in transformation');
    }
    return transformedRecipe;
}

// ENHANCED: Call Modal for video processing with image extraction
async function callModalForVideoExtraction(videoInfo, analysisType = 'standard', extractImage = false) {
    console.log(`🚀 [VERCEL] Calling Modal for ${videoInfo.platform} video extraction...`);
    console.log('🔧 [VERCEL] Analysis type:', analysisType);
    console.log('📸 [VERCEL] Extract image:', extractImage);  // NEW: Log image flag

    try {
        const payload = {
            video_url: videoInfo.originalUrl,
            platform: videoInfo.platform,
            analysis_type: analysisType,
            extract_image: extractImage  // NEW: Pass image extraction flag
        };

        console.log('📦 [VERCEL] Modal payload:', payload);

        const modalResponse = await fetch(process.env.MODAL_ENDPOINT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
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

        // NEW: Log image extraction status
        if (result.recipe?.extractedImage) {
            console.log('📸 [VERCEL] Image successfully extracted from video');
        }

        // Transform Modal data to match our MongoDB schema
        const transformedRecipe = transformModalDataToSchema(result, videoInfo);

        return {
            recipe: transformedRecipe,
            metadata: result.metadata,
            extractionMethod: `${videoInfo.platform}-modal-ai`,
            cost: result.metadata?.cost || 0.05,
            originalModalData: result
        };

    } catch (error) {
        console.error(`❌ [VERCEL] Modal ${videoInfo.platform} processing failed:`, error);
        throw error;
    }
}

// MAIN API ENDPOINT - ENHANCED WITH IMAGE EXTRACTION
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

        const { url, analysisType, platform, extractImage } = await request.json(); // NEW: extractImage parameter
        console.log('🎬 [VERCEL] Analysis type requested:', analysisType);
        console.log('🎬 [VERCEL] Platform hint provided:', platform);
        console.log('📸 [VERCEL] Image extraction requested:', extractImage);  // NEW: Log image flag

        if (!url) {
            return NextResponse.json(
                { error: 'Video URL is required' },
                { status: 400 }
            );
        }

        console.log('🎬 [VERCEL] Processing video URL:', url);

        // Detect video platform (with hint support)
        let videoInfo;
        try {
            videoInfo = detectVideoPlatform(url);
        } catch (error) {
            // If detection fails but platform hint provided, use hint
            const supportedPlatforms = ['tiktok', 'instagram', 'facebook', 'twitter', 'youtube', 'reddit', 'bluesky'];
            if (platform && supportedPlatforms.includes(platform)) {
                console.log(`🎯 [VERCEL] Using platform hint: ${platform}`);
                videoInfo = {
                    platform: platform,
                    videoId: url.split('/').pop(),
                    originalUrl: url
                };
            } else {
                throw error;
            }
        }

        console.log(`📺 [VERCEL] Video info: ${videoInfo.platform} - ${videoInfo.videoId}`);

        // ENHANCED: Use Modal with image extraction support
        const result = await callModalForVideoExtraction(
            videoInfo,
            analysisType,
            extractImage || false  // NEW: Pass image extraction flag
        );

        console.log('✅ [VERCEL] Extraction complete:', {
            platform: videoInfo.platform,
            method: result.extractionMethod,
            cost: result.cost,
            hasTimestamps: result.recipe.instructions.some(i => i.videoTimestamp),
            hasImage: !!(result.recipe.extractedImage),  // NEW: Log image status
            title: result.recipe.title
        });

        // ENHANCED: Return schema-compatible data with image info
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
                hasExtractedImage: !!(result.recipe.extractedImage),  // NEW: Image status
                instructionCount: result.recipe.instructions.length,
                ingredientCount: result.recipe.ingredients.length,
                videoDuration: result.recipe.videoMetadata?.videoDuration,
                transcriptLength: result.recipe.videoMetadata?.transcriptLength
            },
            message: `Recipe extracted from ${videoInfo.platform} using Modal AI processing${result.recipe.extractedImage ? ' with image' : ''}`  // NEW: Include image status
        });

    } catch (error) {
        console.error('=== 🎬 [VERCEL] VIDEO EXTRACTION ERROR ===');
        console.error('Error:', error.message);

        // Enhanced error messages per platform
        let enhancedErrorMessage = error.message;

        if (error.message.includes('Unsupported video platform')) {
            enhancedErrorMessage = 'Please enter a valid TikTok, Instagram, or Facebook video URL. For YouTube videos, copy the transcript and use the Text Paste option.';
        } else if (error.message.includes('TikTok')) {
            enhancedErrorMessage = 'TikTok video processing failed. Try ensuring the video is public and using the share link from the TikTok mobile app.';
        } else if (error.message.includes('Instagram')) {
            enhancedErrorMessage = 'Instagram video processing failed. Try ensuring the Reel is public and using the share link from Instagram.';
        } else if (error.message.includes('Facebook video could not be processed')) {
            enhancedErrorMessage = 'Facebook video processing failed. Try ensuring the video is public, or copy any recipe text from the video and use Text Paste instead.';
        } else if (error.message.includes('Modal API error')) {
            enhancedErrorMessage = 'Video processing service is temporarily unavailable. Please try again in a few minutes.';
        }

        return NextResponse.json({
            error: enhancedErrorMessage,
            supportedPlatforms: ['TikTok', 'Instagram', 'Facebook', 'Twitter/X', 'YouTube', 'Reddit', 'Bluesky'],
            note: 'All video processing powered by Modal AI with universal platform support.',
            troubleshooting: {
                tiktok: [
                    'Use share links directly from TikTok app',
                    'Ensure video is public (not private or followers-only)',
                    'Try popular cooking creators for best results'
                ],
                instagram: [
                    'Make sure Reels are public (not private accounts)',
                    'Use direct share links from Instagram',
                    'Try content from popular cooking accounts'
                ],
                facebook: [
                    'Use public Facebook videos',
                    'Try using the share link from Facebook mobile app',
                    'For private videos, copy any recipe text and use Text Paste'
                ],
                twitter: [
                    'Make sure tweets are public',
                    'Video tweets work best for recipe content',
                    'Try copying tweet text if video fails'
                ],
                youtube: [
                    'Use public YouTube videos or Shorts',
                    'Cooking channels work best',
                    'Try shorter videos for better results'
                ],
                reddit: [
                    'Use posts from public cooking subreddits',
                    'Video posts work better than GIFs',
                    'Try copying recipe text from comments if video fails'
                ],
                bluesky: [
                    'Make sure posts are public',
                    'Cooking content with video works best',
                    'Try copying post text if video processing fails'
                ]
            }
        }, { status: 400 });
    }
}