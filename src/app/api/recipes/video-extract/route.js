// file: /src/app/api/recipes/video-extract/route.js v11 - UNIVERSAL PLATFORM SUPPORT WITH PAGE SCRAPING

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';

// ENHANCED: Universal platform detection
const UNIVERSAL_PLATFORMS = {
    // Social media with video content
    tiktok: {
        patterns: [
            /(www\.)?tiktok\.com\/@([^/]+)\/video\/(\d+)(\?.*)?/,
            /(www\.)?tiktok\.com\/t\/([a-zA-Z0-9]+)(\?.*)?/,  // ✅ NOW SUPPORTS query params
            /vm\.tiktok\.com\/([a-zA-Z0-9]+)(\?.*)?/,
            /(www\.)?tiktok\.com\/.*?\/video\/(\d+)(\?.*)?/
        ],
        extractId: (url) => {
            for (const pattern of UNIVERSAL_PLATFORMS.tiktok.patterns) {
                const match = url.match(pattern);
                if (match) {
                    // Find the last captured group that's not query params
                    for (let i = match.length - 1; i >= 0; i--) {
                        if (match[i] && !match[i].startsWith('?')) {
                            return match[i];
                        }
                    }
                }
            }
            return null;
        }
    },
    instagram: {
        patterns: [
            /(www\.)?instagram\.com\/reel\/([a-zA-Z0-9_-]+)(\?.*)?/,
            /(www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)(\?.*)?/,  // ✅ NOW SUPPORTS ?igsh=... etc.
            /(www\.)?instagram\.com\/tv\/([a-zA-Z0-9_-]+)(\?.*)?/
        ],
        extractId: (url) => {
            for (const pattern of UNIVERSAL_PLATFORMS.instagram.patterns) {
                const match = url.match(pattern);
                if (match) return match[match.length - 2]; // Get the ID, not the query params
            }
            return null;
        }
    },
    facebook: {
        patterns: [
            /(www\.)?facebook\.com\/watch\/?\?v=(\d+)/i,
            /(www\.)?facebook\.com\/([^\/]+)\/videos\/(\d+)/i,
            /fb\.watch\/([a-zA-Z0-9_-]+)/i,
            /(www\.)?facebook\.com\/share\/r\/([a-zA-Z0-9_-]+)/i,
            /(www\.)?facebook\.com\/share\/v\/([a-zA-Z0-9_-]+)/i,  // 🚀 ADDED: Missing /share/v/ format!
            /(www\.)?facebook\.com\/story\.php\?story_fbid=(\d+)/i,
            /(www\.)?facebook\.com\/reel\/(\d+)/i,
            /(www\.)?facebook\.com\/.*\/posts\/([a-zA-Z0-9_-]+)/i,  // 🚀 ADDED: Posts format
            /(www\.)?facebook\.com\/.*\/photos\/([a-zA-Z0-9_-]+)/i  // 🚀 ADDED: Photos with videos
        ],
        extractId: (url) => {
            for (const pattern of UNIVERSAL_PLATFORMS.facebook.patterns) {
                const match = url.match(pattern);
                if (match) return match[match.length - 1];
            }
            return null;
        }
    },
    // ENHANCED: New social platforms with www. support
    twitter: {
        patterns: [
            /(www\.)?(twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/
        ],
        extractId: (url) => {
            const match = url.match(/(www\.)?(twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/);
            return match ? match[match.length - 1] : null;
        }
    },
    youtube: {
        patterns: [
            /(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
            /youtu\.be\/([a-zA-Z0-9_-]+)/,
            /(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/
        ],
        extractId: (url) => {
            for (const pattern of UNIVERSAL_PLATFORMS.youtube.patterns) {
                const match = url.match(pattern);
                if (match) return match[match.length - 1];
            }
            return null;
        }
    },
    reddit: {
        patterns: [
            /(www\.)?reddit\.com\/r\/[^\/]+\/comments\/([a-zA-Z0-9]+)/,
            /redd\.it\/([a-zA-Z0-9]+)/
        ],
        extractId: (url) => {
            for (const pattern of UNIVERSAL_PLATFORMS.reddit.patterns) {
                const match = url.match(pattern);
                if (match) return match[match.length - 1];
            }
            return null;
        }
    },
    pinterest: {
        patterns: [
            /(www\.)?pinterest\.com\/pin\/(\d+)/
        ],
        extractId: (url) => {
            const match = url.match(/(www\.)?pinterest\.com\/pin\/(\d+)/);
            return match ? match[match.length - 1] : null;
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
    },
    linkedin: {
        patterns: [
            /(www\.)?linkedin\.com\/posts\/([a-zA-Z0-9_-]+)/,
            /(www\.)?linkedin\.com\/feed\/update\/([a-zA-Z0-9_:-]+)/
        ],
        extractId: (url) => {
            for (const pattern of UNIVERSAL_PLATFORMS.linkedin.patterns) {
                const match = url.match(pattern);
                if (match) return match[match.length - 1];
            }
            return null;
        }
    },
    threads: {
        patterns: [
            /threads\.net\/@[^\/]+\/post\/([a-zA-Z0-9]+)/
        ],
        extractId: (url) => {
            const match = url.match(/threads\.net\/@[^\/]+\/post\/([a-zA-Z0-9]+)/);
            return match ? match[1] : null;
        }
    },
    snapchat: {
        patterns: [
            /(www\.)?snapchat\.com\/discover\/[^\/]+\/(\d+)/,
            /(www\.)?snapchat\.com\/spotlight\/([a-zA-Z0-9_-]+)/
        ],
        extractId: (url) => {
            for (const pattern of UNIVERSAL_PLATFORMS.snapchat.patterns) {
                const match = url.match(pattern);
                if (match) return match[match.length - 1];
            }
            return null;
        }
    }
};

function safeTransformModalResponse(modalResponse) {
    try {
        // Ensure we have a valid response object
        if (!modalResponse || typeof modalResponse !== 'object') {
            console.error('❌ Invalid modal response:', modalResponse);
            return {
                success: false,
                error: 'Invalid response from processing service'
            };
        }

        // Transform snake_case to camelCase safely
        const transformed = {
            success: modalResponse.success || false,
            extractionMethod: modalResponse.extraction_method || 'unknown',
            urlVariant: modalResponse.url_variant || null,
            videoTitle: modalResponse.video_title || null,
            recipe: modalResponse.recipe || {},
            source: modalResponse.source || null,
            framesAnalyzed: modalResponse.frames_analyzed || 0,
            extractedImage: modalResponse.extracted_image || null,
            metadata: modalResponse.metadata || {}
        };

        // Debug logging
        console.log('📸 TRANSFORM DEBUG: Original extracted_image exists:', !!modalResponse.extracted_image);
        console.log('📸 TRANSFORM DEBUG: Transformed extractedImage exists:', !!transformed.extractedImage);

        if (transformed.extractedImage) {
            console.log('📸 TRANSFORM DEBUG: Image data length:', transformed.extractedImage.data?.length);
        }

        return transformed;

    } catch (error) {
        console.error('❌ Error transforming modal response:', error);
        return {
            success: false,
            error: 'Failed to process response data'
        };
    }
}

function transformSnakeCaseToCamelCase(obj) {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(transformSnakeCaseToCamelCase);
    }

    const transformed = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
        transformed[camelKey] = transformSnakeCaseToCamelCase(value);
    }
    return transformed;
}

// ENHANCED: Universal platform detection
async function detectUniversalPlatform(url) {
    console.log('🌟 [VERCEL] Detecting universal platform for URL:', url);

    // Check each platform
    for (const [platform, config] of Object.entries(UNIVERSAL_PLATFORMS)) {
        const contentId = config.extractId(url);
        if (contentId) {
            console.log(`✅ [VERCEL] Detected ${platform} content: ${contentId}`);
            return {platform, contentId, originalUrl: url};
        }
    }

    // Check for direct video files
    if (url.match(/\.(mp4|mov|avi|mkv|webm)(\?|$)/i)) {
        return {platform: 'direct_video', contentId: url.split('/').pop(), originalUrl: url};
    }

    // Generic video/content detection
    if (url.match(/\/video|\/watch|\/play|\/post|\/status/)) {
        return {platform: 'generic_content', contentId: 'unknown', originalUrl: url};
    }

    const {NativeDialog} = await import('@/components/mobile/NativeDialog');
    await NativeDialog.showError({
        title: 'Platform Failed',
        message: 'Platform not supported yet. Currently supports TikTok, Instagram, Facebook, Twitter/X, YouTube, Reddit, Pinterest, Bluesky, LinkedIn, Threads, Snapchat, and direct video files.'
    });
    return;
}

// ENHANCED: Transform Modal response for universal platforms
function transformUniversalDataToSchema(modalData, contentInfo) {
    console.log('🔄 [VERCEL] Transforming universal Modal data to schema format...');

    const recipe = modalData.recipe;
    const metadata = modalData.metadata;

    // Transform instructions: handle various formats
    const transformedInstructions = (recipe.instructions || []).map((instruction, index) => ({
        text: instruction.instruction || instruction.text || instruction,
        step: instruction.step || index + 1,
        videoTimestamp: instruction.timestamp || null,
        videoLink: instruction.videoLink || null
    }));

    // Transform ingredients: handle various formats
    const transformedIngredients = (recipe.ingredients || []).map(ingredient => {
        if (typeof ingredient === 'string') {
            // Parse string ingredients
            return {
                name: ingredient,
                amount: '',
                unit: '',
                optional: false
            };
        }
        return {
            name: ingredient.name || '',
            amount: ingredient.amount || '',
            unit: ingredient.unit || '',
            optional: ingredient.optional || false,
            ...(ingredient.timestamp && {
                videoTimestamp: ingredient.timestamp,
                videoLink: ingredient.videoLink
            })
        };
    });

    // Create properly structured recipe for MongoDB
    const transformedRecipe = {
        title: recipe.title || '',
        description: recipe.description || '',
        ingredients: transformedIngredients,
        instructions: transformedInstructions,
        prepTime: recipe.prepTime || recipe.prep_time || null,
        cookTime: recipe.cookTime || recipe.cook_time || null,
        servings: recipe.servings || null,
        difficulty: recipe.difficulty || 'medium',
        tags: recipe.tags || [],
        source: recipe.source || contentInfo.originalUrl,
        category: recipe.category || 'entrees',

        // Enhanced nutrition data (if present)
        nutrition: recipe.nutrition || {
            calories: null,
            protein: null,
            carbs: null,
            fat: null,
            fiber: null
        },

        // ENHANCED: Extracted image data (if present)
        ...(recipe.extractedImage || modalData.extractedImage ? {
            extractedImage: {
                data: (recipe.extractedImage || modalData.extractedImage).data,
                extractionMethod: (recipe.extractedImage || modalData.extractedImage).extractionMethod || 'video_frame',
                frameCount: (recipe.extractedImage || modalData.extractedImage).frameCount || 1,
                source: (recipe.extractedImage || modalData.extractedImage).source || contentInfo.platform,
                extractedAt: new Date()
            }
        } : {}),

        // ENHANCED: Universal content metadata
        contentMetadata: {
            contentSource: recipe.source || contentInfo.originalUrl,
            contentPlatform: recipe.platform || contentInfo.platform,
            contentId: contentInfo.contentId || null,
            contentTitle: recipe.title || metadata?.originalTitle || null,
            extractionMethod: recipe.extraction_method || metadata?.processingMethod || 'universal-ai',
            importedFrom: `${contentInfo.platform} content via Universal AI`,
            socialMediaOptimized: recipe.socialMediaOptimized || false,
            hasExtractedImage: !!(recipe.extractedImage || modalData.extractedImage),
            processingTime: recipe.processingTime || metadata?.processingMethod || null,

            // ENHANCED: Content-specific metadata
            ...(recipe.transcriptLength && { transcriptLength: recipe.transcriptLength }),
            ...(recipe.videoDuration && { videoDuration: recipe.videoDuration }),
            ...(recipe.sourceTextLength && { sourceTextLength: recipe.sourceTextLength })
        },

        // Default values for required schema fields
        isPublic: false,
        importedFrom: `${contentInfo.platform} content`
    };

    console.log('✅ [VERCEL] Universal schema transformation complete');
    if (transformedRecipe.extractedImage) {
        console.log('📸 [VERCEL] Image data included in transformation');
    }
    return transformedRecipe;
}

// ENHANCED: Universal Modal API call
async function callModalForUniversalExtraction(contentInfo, analysisType = 'page_scraping_first', extractImage = false, userContext = null) {
    console.log(`🚀 [VERCEL] Calling Modal for ${contentInfo.platform} content extraction...`);
    console.log('🔧 [VERCEL] Analysis type:', analysisType);
    console.log('📸 [VERCEL] Extract image:', extractImage);

    try {
        const payload = {
            video_url: contentInfo.originalUrl,
            platform: contentInfo.platform,
            analysis_type: analysisType,
            extract_image: extractImage,
            user_context: userContext || {
                location: 'US',
                measurementSystem: 'imperial',
                currency: 'USD'
            }
        };

        console.log('📦 [VERCEL] Universal Modal payload:', payload);

        const modalResponse = await fetch(process.env.MODAL_ENDPOINT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // After calling Modal, before returning to frontend
        console.log('🔍 RAW MODAL RESPONSE:', JSON.stringify(modalResponse, null, 2));
        console.log('🔍 Response has extracted_image:', !!modalResponse.extracted_image);
        console.log('🔍 Image data available:', !!modalResponse.extracted_image?.data);

        if (!modalResponse.ok) {
            const errorText = await modalResponse.text();
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Modal API Failed',
                message: `Modal API error (${modalResponse.status}): ${errorText}`
            });
            return;
        }

        const rawResult = await modalResponse.json();
        const result = transformSnakeCaseToCamelCase(rawResult);

        console.log('📸 MODAL DEBUG: result.extracted_image exists:', !!result.extracted_image);
        console.log('📸 MODAL DEBUG: result.recipe.extractedImage exists:', !!result.recipe.extractedImage);
        if (result.extracted_image) {
            console.log('📸 MODAL DEBUG: Image data keys:', Object.keys(result.extracted_image));
            console.log('📸 MODAL DEBUG: Image data length:', result.extracted_image.data?.length);
        }

        if (!result.success) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Modal Processing Failed',
                message: result.error || 'Universal Modal processing failed'
            });
            return;
        }

        console.log(`✅ [VERCEL] Universal Modal ${contentInfo.platform} processing successful`);

        // Log extraction details
        if (result.recipe?.extractedImage) {
            console.log('📸 [VERCEL] Image successfully extracted from content');
        }
        if (result.metadata?.extraction_method) {
            console.log('🔍 [VERCEL] Extraction method used:', result.metadata.extraction_method);
        }

        // Transform Modal data to match our MongoDB schema
        const transformedRecipe = transformUniversalDataToSchema(result, contentInfo);

        return {
            recipe: transformedRecipe,
            metadata: result.metadata,
            extractionMethod: `${contentInfo.platform}-universal-ai`,
            cost: result.metadata?.cost || 0.05,
            originalModalData: result
        };

    } catch (error) {
        console.error(`❌ [VERCEL] Universal Modal ${contentInfo.platform} processing failed:`, error);
        throw error;
    }
}

// MAIN API ENDPOINT - ENHANCED FOR UNIVERSAL PLATFORM SUPPORT
export async function POST(request) {
    try {
        console.log('=== 🌟 [VERCEL] UNIVERSAL CONTENT RECIPE EXTRACTION START ===');

        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in to extract recipes from content.' },
                { status: 401 }
            );
        }

        const { video_url, analysisType, platform, extractImage } = await request.json();
        console.log('🌟 [VERCEL] Analysis type requested:', analysisType);
        console.log('🌟 [VERCEL] Platform hint provided:', platform);
        console.log('📸 [VERCEL] Image extraction requested:', extractImage);

        if (!video_url) {
            return NextResponse.json(
                { error: 'Content URL is required' },
                { status: 400 }
            );
        }

        console.log('🌟 [VERCEL] Processing content URL:', video_url);

        // ENHANCED: Universal platform detection
        let contentInfo;
        try {
            contentInfo = detectUniversalPlatform(video_url);
        } catch (error) {
            // If detection fails but platform hint provided, use hint
            const supportedPlatforms = [
                'tiktok', 'instagram', 'facebook', 'twitter', 'youtube',
                'reddit', 'pinterest', 'bluesky', 'linkedin', 'threads',
                'snapchat', 'direct_video', 'generic_content'
            ];
            if (platform && supportedPlatforms.includes(platform)) {
                console.log(`🎯 [VERCEL] Using platform hint: ${platform}`);
                contentInfo = {
                    platform: platform,
                    contentId: video_url.split('/').pop() || 'unknown',
                    originalUrl: video_url
                };
            } else {
                throw error;
            }
        }

        console.log(`📺 [VERCEL] Content info: ${contentInfo.platform} - ${contentInfo.contentId}`);

        // ENHANCED: Use Universal Modal with intelligent processing and user context
        const userContext = {
            location: session.user.country || 'US',
            measurementSystem: session.user.internationalPreferences?.unitSystem || 'imperial',
            currency: session.user.currencyPreferences?.currency || 'USD',
            extractImage: extractImage || false
        };

        const result = await callModalForUniversalExtraction(
            contentInfo,
            analysisType || 'page_scraping_first',
            extractImage || false,
            userContext
        );

        console.log('✅ [VERCEL] Universal extraction complete:', {
            platform: contentInfo.platform,
            method: result.extractionMethod,
            cost: result.cost,
            hasTimestamps: result.recipe.instructions.some(i => i.videoTimestamp),
            hasImage: !!(result.recipe.extractedImage),
            title: result.recipe.title,
            extractionMethod: result.metadata?.extraction_method || 'unknown'
        });

        // ENHANCED: Return comprehensive extraction info
        return NextResponse.json({
            success: true,
            recipe: result.recipe,
            extractedImage: result.extracted_image || result.recipe.extractedImage,
            contentInfo: {
                platform: contentInfo.platform,
                contentId: contentInfo.contentId,
                originalUrl: contentInfo.originalUrl
            },
            extractionInfo: {
                method: result.extractionMethod,
                platform: contentInfo.platform,
                cost: { total_usd: result.cost },
                socialMediaOptimized: result.recipe.contentMetadata?.socialMediaOptimized || false,
                metadata: result.metadata || null,
                hasTimestamps: result.recipe.instructions.some(i => i.videoTimestamp) ||
                    result.recipe.ingredients.some(i => i.videoTimestamp),
                hasExtractedImage: !!(result.recipe.extractedImage || result.extracted_image),
                instructionCount: result.recipe.instructions.length,
                ingredientCount: result.recipe.ingredients.length,
                primaryExtractionMethod: result.metadata?.extraction_method || 'unknown',
                fallbackUsed: result.metadata?.fallback_used || false,
                contentAnalyzed: result.metadata?.content_analyzed || false,
                processingTimeMs: result.metadata?.processing_time_ms || null
            },
            message: `Recipe extracted from ${contentInfo.platform} using Universal AI processing${result.extracted_image ? ' with image' : ''}${result.metadata?.extraction_method ? ` via ${result.metadata.extraction_method}` : ''}`
        });

    } catch (error) {
        console.error('=== 🌟 [VERCEL] UNIVERSAL EXTRACTION ERROR ===');
        console.error('Error:', error.message);

        // ENHANCED: Platform-specific error messages
        let enhancedErrorMessage = error.message;
        let troubleshootingTips = [];

        if (error.message.includes('Platform not supported yet')) {
            enhancedErrorMessage = 'This platform is not yet supported. We support TikTok, Instagram, Facebook, Twitter/X, YouTube, Reddit, Pinterest, Bluesky, LinkedIn, Threads, Snapchat, and direct video files.';
            troubleshootingTips = [
                'Try copying any recipe text from the content and use the Text Parser',
                'Check if the URL is publicly accessible',
                'Verify the URL format is correct'
            ];
        } else if (error.message.includes('Twitter') || error.message.includes('twitter')) {
            enhancedErrorMessage = 'Twitter/X content processing failed. The post may be private or deleted.';
            troubleshootingTips = [
                'Ensure the post is public (not from a private account)',
                'Try copying the text from the post and use Text Parser',
                'Check if the post still exists'
            ];
        } else if (error.message.includes('YouTube') || error.message.includes('youtube')) {
            enhancedErrorMessage = 'YouTube content processing failed. The video may be private or age-restricted.';
            troubleshootingTips = [
                'Ensure the video is public',
                'Try copying the description and use Text Parser',
                'Check if the video has recipe content in the description'
            ];
        } else if (error.message.includes('Reddit') || error.message.includes('reddit')) {
            enhancedErrorMessage = 'Reddit content processing failed. The post may be in a private community.';
            troubleshootingTips = [
                'Ensure the post is in a public subreddit',
                'Try copying recipe text from the post or comments',
                'Check if the post contains actual recipe content'
            ];
        } else if (error.message.includes('Modal API error')) {
            enhancedErrorMessage = 'Content processing service is temporarily unavailable. Please try again in a few minutes.';
            troubleshootingTips = [
                'Wait a few minutes and try again',
                'Try using Text Parser for manual entry',
                'Check if the content is still accessible'
            ];
        }

        return NextResponse.json({
            error: enhancedErrorMessage,
            supportedPlatforms: [
                'TikTok', 'Instagram', 'Facebook', 'Twitter/X', 'YouTube',
                'Reddit', 'Pinterest', 'Bluesky', 'LinkedIn', 'Threads',
                'Snapchat', 'Direct Video Files'
            ],
            note: 'Universal content processing with intelligent page scraping + video analysis fallback.',
            troubleshooting: {
                general: troubleshootingTips,
                tiktok: [
                    'Use share links directly from TikTok app',
                    'Ensure video is public',
                    'Try popular cooking creators'
                ],
                instagram: [
                    'Make sure posts are public',
                    'Use direct share links from Instagram',
                    'Try content from cooking accounts'
                ],
                facebook: [
                    'Use public Facebook content',
                    'Try share links from Facebook mobile app',
                    'Copy text content if video fails'
                ],
                twitter: [
                    'Make sure posts are public',
                    'Try copying post text if processing fails',
                    'Check if the post contains recipe content'
                ],
                youtube: [
                    'Use public YouTube videos',
                    'Check video descriptions for recipes',
                    'Try shorter cooking videos'
                ],
                reddit: [
                    'Use posts from public cooking subreddits',
                    'Copy recipe text from posts or comments',
                    'Try r/recipes, r/MealPrepSunday, etc.'
                ],
                pinterest: [
                    'Use public Pinterest pins',
                    'Check if pin links to recipe website',
                    'Copy pin description if needed'
                ],
                bluesky: [
                    'Make sure posts are public',
                    'Copy post text if processing fails',
                    'Check for recipe hashtags'
                ],
                linkedin: [
                    'Use public LinkedIn posts',
                    'Try posts from food industry professionals',
                    'Copy post content if needed'
                ],
                threads: [
                    'Make sure posts are public',
                    'Copy post text if processing fails',
                    'Check for cooking-related content'
                ]
            },
            processingMethods: [
                'Page content analysis (primary - fast)',
                'Video download and analysis (fallback)',
                'AI-powered recipe generation (final fallback)'
            ]
        }, { status: 400 });
    }
}