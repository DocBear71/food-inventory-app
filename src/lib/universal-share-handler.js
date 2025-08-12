// file: /src/lib/universal-share-handler.js v1 - Universal platform share support

/**
 * Universal Share Handler
 * Handles incoming shared content from ANY supported platform
 * Detects platform, validates URLs, and routes to appropriate import method
 */
export function getShareInstructions(platform) {
    const instructions = {
        tiktok: {
            title: 'Share from TikTok',
            steps: [
                'Open the TikTok video',
                'Tap the Share button (→)',
                'Select "Copy Link"',
                'Paste the link in Doc Bear\'s import page'
            ],
            mobileSteps: [
                'Tap Share → Copy Link',
                'Open Doc Bear\'s app',
                'Go to Import Recipe',
                'Paste the TikTok link'
            ],
            webIntentSupported: true
        },
        instagram: {
            title: 'Share from Instagram',
            steps: [
                'Open the Instagram post/reel',
                'Tap the Share button (paper plane icon)',
                'Select "Copy Link"',
                'Paste the link in Doc Bear\'s import page'
            ],
            mobileSteps: [
                'Tap Share → Copy Link',
                'Open Doc Bear\'s app',
                'Go to Import Recipe',
                'Paste the Instagram link'
            ],
            webIntentSupported: true
        },
        facebook: {
            title: 'Share from Facebook',
            steps: [
                'Open the Facebook video/post',
                'Click the Share button',
                'Select "Copy Link"',
                'Paste the link in Doc Bear\'s import page'
            ],
            mobileSteps: [
                'Tap Share → Copy Link',
                'Open Doc Bear\'s app',
                'Go to Import Recipe',
                'Paste the Facebook link'
            ],
            webIntentSupported: true
        },
        twitter: {
            title: 'Share from Twitter/X',
            steps: [
                'Open the Twitter/X post',
                'Click the Share button',
                'Select "Copy link to post"',
                'Paste the link in Doc Bear\'s import page'
            ],
            mobileSteps: [
                'Tap Share → Copy link',
                'Open Doc Bear\'s app',
                'Go to Import Recipe',
                'Paste the Twitter/X link'
            ],
            webIntentSupported: true
        },
        youtube: {
            title: 'Share from YouTube',
            steps: [
                'Open the YouTube video',
                'Click the Share button',
                'Copy the video URL',
                'Paste the link in Doc Bear\'s import page'
            ],
            mobileSteps: [
                'Tap Share → Copy',
                'Open Doc Bear\'s app',
                'Go to Import Recipe',
                'Paste the YouTube link'
            ],
            webIntentSupported: true
        },
        reddit: {
            title: 'Share from Reddit',
            steps: [
                'Open the Reddit post',
                'Click the Share button',
                'Copy the post URL',
                'Paste the link in Doc Bear\'s import page'
            ],
            mobileSteps: [
                'Tap Share → Copy',
                'Open Doc Bear\'s app',
                'Go to Import Recipe',
                'Paste the Reddit link'
            ],
            webIntentSupported: true
        },
        pinterest: {
            title: 'Share from Pinterest',
            steps: [
                'Open the Pinterest pin',
                'Click the Share button',
                'Copy the pin URL',
                'Paste the link in Doc Bear\'s import page'
            ],
            mobileSteps: [
                'Tap Share → Copy link',
                'Open Doc Bear\'s app',
                'Go to Import Recipe',
                'Paste the Pinterest link'
            ],
            webIntentSupported: true
        },
        bluesky: {
            title: 'Share from Bluesky',
            steps: [
                'Open the Bluesky post',
                'Click the Share button',
                'Copy the post URL',
                'Paste the link in Doc Bear\'s import page'
            ],
            mobileSteps: [
                'Tap Share → Copy link',
                'Open Doc Bear\'s app',
                'Go to Import Recipe',
                'Paste the Bluesky link'
            ],
            webIntentSupported: true
        },
        linkedin: {
            title: 'Share from LinkedIn',
            steps: [
                'Open the LinkedIn post',
                'Click the Share button',
                'Copy the post URL',
                'Paste the link in Doc Bear\'s import page'
            ],
            mobileSteps: [
                'Tap Share → Copy link',
                'Open Doc Bear\'s app',
                'Go to Import Recipe',
                'Paste the LinkedIn link'
            ],
            webIntentSupported: true
        },
        threads: {
            title: 'Share from Threads',
            steps: [
                'Open the Threads post',
                'Tap the Share button',
                'Copy the post URL',
                'Paste the link in Doc Bear\'s import page'
            ],
            mobileSteps: [
                'Tap Share → Copy link',
                'Open Doc Bear\'s app',
                'Go to Import Recipe',
                'Paste the Threads link'
            ],
            webIntentSupported: true
        }
    };

    return instructions[platform] || {
        title: 'Share Content',
        steps: [
            'Copy the content URL',
            'Open Doc Bear\'s Comfort Kitchen',
            'Go to Import Recipe',
            'Paste the URL'
        ],
        webIntentSupported: false
    };
}

/**
 * Register share target for PWA (to be called in service worker)
 * @returns {object} Share target configuration
 */
export function getPWAShareTarget() {
    return {
        action: '/recipes/import',
        method: 'GET',
        params: {
            title: 'title',
            text: 'text',
            url: 'videoUrl',
            source: 'share'
        }
    };
}

/**
 * Handle URL parameters from share intent
 * @param {URLSearchParams} searchParams - URL search parameters
 * @returns {object} Parsed share data
 */
export function parseShareParams(searchParams) {
    const videoUrl = searchParams.get('videoUrl') || searchParams.get('url');
    const source = searchParams.get('source');
    const platform = searchParams.get('platform');
    const title = searchParams.get('title');
    const text = searchParams.get('text');

    if (!videoUrl || source !== 'share') {
        return { isShare: false };
    }

    const shareData = handleShareIntent({
        url: decodeURIComponent(videoUrl),
        title,
        text
    });

    return {
        isShare: true,
        ...shareData,
        detectedPlatform: platform || shareData.platform
    };
}

/**
 * Generate Web Share API data for sharing recipes
 * @param {object} recipe - Recipe object
 * @returns {object} Share data for Web Share API
 */
export function generateRecipeShareData(recipe) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.docbearscomfort.kitchen';
    const recipeUrl = `${baseUrl}/recipes/${recipe._id}`;

    return {
        title: `${recipe.title} - Doc Bear's Comfort Kitchen`,
        text: `Check out this delicious ${recipe.title} recipe! 🍳`,
        url: recipeUrl
    };
}

/**
 * Check if URL is already imported (to prevent duplicates)
 * @param {string} url - Content URL
 * @param {Array} existingRecipes - Array of existing recipes
 * @returns {object} Duplicate check result
 */
export function checkForDuplicateImport(url, existingRecipes = []) {
    const normalizedUrl = validateAndNormalizeUrl(url);

    if (!normalizedUrl.success) {
        return { isDuplicate: false };
    }

    const duplicateRecipe = existingRecipes.find(recipe => {
        const recipeSource = recipe.source || recipe.videoSource || recipe.contentMetadata?.contentSource;
        if (!recipeSource) return false;

        const normalizedRecipeSource = validateAndNormalizeUrl(recipeSource);
        return normalizedRecipeSource.success &&
            normalizedRecipeSource.cleanUrl === normalizedUrl.cleanUrl;
    });

    return {
        isDuplicate: !!duplicateRecipe,
        existingRecipe: duplicateRecipe || null,
        normalizedUrl: normalizedUrl.cleanUrl
    };
}

/**
 * Get platform-specific extraction hints
 * @param {string} platform - Platform identifier
 * @returns {object} Extraction hints and tips
 */
export function getPlatformExtractionHints(platform) {
    const hints = {
        tiktok: {
            primaryMethod: 'page_scraping_first',
            tips: [
                'TikTok videos are processed for both audio and visual content',
                'Captions and descriptions are analyzed for recipe information',
                'Works best with cooking TikToks that show ingredients'
            ],
            expectedContent: ['video', 'captions', 'description']
        },
        instagram: {
            primaryMethod: 'page_scraping_first',
            tips: [
                'Instagram posts and reels are analyzed for recipe content',
                'Captions, hashtags, and comments are processed',
                'Images are analyzed for cooking steps and ingredients'
            ],
            expectedContent: ['image', 'video', 'captions', 'hashtags']
        },
        facebook: {
            primaryMethod: 'page_scraping_first',
            tips: [
                'Facebook videos and posts are processed for recipe content',
                'Post descriptions and comments are analyzed',
                'Video content is processed for cooking instructions'
            ],
            expectedContent: ['video', 'text', 'comments']
        },
        twitter: {
            primaryMethod: 'page_scraping_first',
            tips: [
                'Twitter/X posts are analyzed for recipe text content',
                'Threads and replies are processed for additional recipe info',
                'Videos and images are analyzed when present'
            ],
            expectedContent: ['text', 'video', 'images', 'thread']
        },
        youtube: {
            primaryMethod: 'page_scraping_first',
            tips: [
                'YouTube video descriptions are processed first (fastest)',
                'Video content is analyzed if description lacks recipe info',
                'Comments are checked for additional recipe details'
            ],
            expectedContent: ['description', 'video', 'comments']
        },
        reddit: {
            primaryMethod: 'page_scraping_first',
            tips: [
                'Reddit posts and top comments are analyzed',
                'Recipe subreddits provide rich recipe content',
                'Post titles and content are processed for ingredients'
            ],
            expectedContent: ['post', 'comments', 'images']
        },
        pinterest: {
            primaryMethod: 'page_scraping_first',
            tips: [
                'Pinterest pins and descriptions are processed',
                'Linked recipe websites are also analyzed',
                'Pin images are processed for recipe content'
            ],
            expectedContent: ['description', 'linked_recipe', 'image']
        },
        bluesky: {
            primaryMethod: 'page_scraping_first',
            tips: [
                'Bluesky posts are analyzed for recipe text content',
                'Images and embedded content are processed',
                'Hashtags are analyzed for cooking context'
            ],
            expectedContent: ['text', 'images', 'hashtags']
        },
        linkedin: {
            primaryMethod: 'page_scraping_first',
            tips: [
                'LinkedIn posts from food professionals are processed',
                'Professional cooking content and tips are extracted',
                'Industry insights and recipes are analyzed'
            ],
            expectedContent: ['text', 'images', 'professional_content']
        },
        threads: {
            primaryMethod: 'page_scraping_first',
            tips: [
                'Threads posts are analyzed for recipe discussions',
                'Thread conversations are processed for recipe details',
                'Images and text content are both analyzed'
            ],
            expectedContent: ['text', 'images', 'conversation']
        }
    };

    return hints[platform] || {
        primaryMethod: 'page_scraping_first',
        tips: ['Content will be analyzed using universal extraction methods'],
        expectedContent: ['text', 'images']
    };
}

// ENHANCED: Universal platform detection and validation
export const SUPPORTED_PLATFORMS = {
    tiktok: {
        name: 'TikTok',
        icon: '🎵',
        domains: ['tiktok.com', 'vm.tiktok.com'],
        patterns: [
            /tiktok\.com\/@([^/]+)\/video\/(\d+)/,
            /tiktok\.com\/t\/([a-zA-Z0-9]+)/,
            /vm\.tiktok\.com\/([a-zA-Z0-9]+)/
        ],
        shareSupported: true,
        contentTypes: ['video', 'text']
    },
    instagram: {
        name: 'Instagram',
        icon: '📸',
        domains: ['instagram.com'],
        patterns: [
            /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
            /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
            /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/
        ],
        shareSupported: true,
        contentTypes: ['video', 'image', 'text']
    },
    facebook: {
        name: 'Facebook',
        icon: '👥',
        domains: ['facebook.com', 'fb.watch'],
        patterns: [
            /facebook\.com\/watch\?v=(\d+)/,
            /facebook\.com\/share\/r\/([a-zA-Z0-9_-]+)/,
            /facebook\.com\/reel\/(\d+)/,
            /fb\.watch\/([a-zA-Z0-9_-]+)/
        ],
        shareSupported: true,
        contentTypes: ['video', 'text', 'image']
    },
    twitter: {
        name: 'Twitter/X',
        icon: '🐦',
        domains: ['twitter.com', 'x.com'],
        patterns: [
            /(twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/
        ],
        shareSupported: true,
        contentTypes: ['text', 'video', 'image']
    },
    youtube: {
        name: 'YouTube',
        icon: '📺',
        domains: ['youtube.com', 'youtu.be'],
        patterns: [
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
            /youtu\.be\/([a-zA-Z0-9_-]+)/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/
        ],
        shareSupported: true,
        contentTypes: ['video', 'text']
    },
    reddit: {
        name: 'Reddit',
        icon: '🤖',
        domains: ['reddit.com', 'redd.it'],
        patterns: [
            /reddit\.com\/r\/[^\/]+\/comments\/([a-zA-Z0-9]+)/,
            /redd\.it\/([a-zA-Z0-9]+)/
        ],
        shareSupported: true,
        contentTypes: ['text', 'video', 'image']
    },
    pinterest: {
        name: 'Pinterest',
        icon: '📌',
        domains: ['pinterest.com'],
        patterns: [
            /pinterest\.com\/pin\/(\d+)/
        ],
        shareSupported: true,
        contentTypes: ['image', 'text']
    },
    bluesky: {
        name: 'Bluesky',
        icon: '🦋',
        domains: ['bsky.app'],
        patterns: [
            /bsky\.app\/profile\/[^\/]+\/post\/([a-zA-Z0-9]+)/
        ],
        shareSupported: true,
        contentTypes: ['text', 'image']
    },
    linkedin: {
        name: 'LinkedIn',
        icon: '💼',
        domains: ['linkedin.com'],
        patterns: [
            /linkedin\.com\/posts\/([a-zA-Z0-9_-]+)/,
            /linkedin\.com\/feed\/update\/([a-zA-Z0-9_:-]+)/
        ],
        shareSupported: true,
        contentTypes: ['text', 'video', 'image']
    },
    threads: {
        name: 'Threads',
        icon: '🧵',
        domains: ['threads.net'],
        patterns: [
            /threads\.net\/@[^\/]+\/post\/([a-zA-Z0-9]+)/
        ],
        shareSupported: true,
        contentTypes: ['text', 'image']
    },
    snapchat: {
        name: 'Snapchat',
        icon: '👻',
        domains: ['snapchat.com'],
        patterns: [
            /snapchat\.com\/discover\/[^\/]+\/(\d+)/,
            /snapchat\.com\/spotlight\/([a-zA-Z0-9_-]+)/
        ],
        shareSupported: false, // Snapchat doesn't typically support web sharing
        contentTypes: ['video', 'image']
    }
};

/**
 * Detect platform from URL
 * @param {string} url - The shared URL
 * @returns {object} Platform detection result
 */
export function detectPlatformFromUrl(url) {
    if (!url || typeof url !== 'string') {
        return { platform: 'unknown', supported: false, error: 'Invalid URL' };
    }

    const urlLower = url.toLowerCase();

    // Check each supported platform
    for (const [platformKey, platformConfig] of Object.entries(SUPPORTED_PLATFORMS)) {
        // Check domain match
        const domainMatch = platformConfig.domains.some(domain => urlLower.includes(domain));

        if (domainMatch) {
            // Verify pattern match
            const patternMatch = platformConfig.patterns.some(pattern => pattern.test(url));

            if (patternMatch) {
                return {
                    platform: platformKey,
                    platformName: platformConfig.name,
                    icon: platformConfig.icon,
                    supported: true,
                    shareSupported: platformConfig.shareSupported,
                    contentTypes: platformConfig.contentTypes,
                    originalUrl: url
                };
            } else {
                return {
                    platform: platformKey,
                    platformName: platformConfig.name,
                    supported: false,
                    error: `Invalid ${platformConfig.name} URL format`
                };
            }
        }
    }

    // Check for direct video files
    if (url.match(/\.(mp4|mov|avi|mkv|webm)(\?|$)/i)) {
        return {
            platform: 'direct_video',
            platformName: 'Direct Video',
            icon: '🎬',
            supported: true,
            shareSupported: false,
            contentTypes: ['video'],
            originalUrl: url
        };
    }

    // Check for generic content patterns
    if (url.match(/\/video|\/watch|\/play|\/post|\/status/)) {
        return {
            platform: 'generic_content',
            platformName: 'Generic Content',
            icon: '🌐',
            supported: true,
            shareSupported: false,
            contentTypes: ['text', 'video'],
            originalUrl: url
        };
    }

    return {
        platform: 'unknown',
        supported: false,
        error: 'Platform not supported'
    };
}

/**
 * Validate and normalize shared URL
 * @param {string} rawUrl - Raw URL from share intent
 * @returns {object} Validation result
 */
export function validateAndNormalizeUrl(rawUrl) {
    try {
        // Remove common share tracking parameters
        const cleanUrl = rawUrl
            .replace(/[?&]utm_[^&]*/g, '') // Remove UTM parameters
            .replace(/[?&]fbclid=[^&]*/g, '') // Remove Facebook click ID
            .replace(/[?&]igshid=[^&]*/g, '') // Remove Instagram share ID
            .replace(/[?&]si=[^&]*/g, '') // Remove YouTube share ID
            .replace(/[?&]feature=[^&]*/g, '') // Remove feature parameters
            .replace(/\?$/, ''); // Remove trailing question mark

        // Detect platform
        const detection = detectPlatformFromUrl(cleanUrl);

        if (!detection.supported) {
            return {
                success: false,
                error: detection.error || 'Platform not supported',
                originalUrl: rawUrl
            };
        }

        return {
            success: true,
            cleanUrl: cleanUrl,
            originalUrl: rawUrl,
            platform: detection.platform,
            platformName: detection.platformName,
            icon: detection.icon,
            shareSupported: detection.shareSupported,
            contentTypes: detection.contentTypes
        };

    } catch (error) {
        return {
            success: false,
            error: `URL validation failed: ${error.message}`,
            originalUrl: rawUrl
        };
    }
}

/**
 * Generate share URL for importing to Doc Bear's Comfort Kitchen
 * @param {string} contentUrl - The content URL to import
 * @param {string} platform - Platform identifier (optional, will be auto-detected)
 * @returns {string} Import URL
 */
export function generateImportUrl(contentUrl, platform = null) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.docbearscomfort.kitchen';

    // Validate URL first
    const validation = validateAndNormalizeUrl(contentUrl);

    if (!validation.success) {
        console.warn('Invalid URL for share import:', validation.error);
        // Return fallback URL
        return `${baseUrl}/recipes/import`;
    }

    // Create import URL with parameters
    const importUrl = new URL(`${baseUrl}/recipes/import`);
    importUrl.searchParams.set('videoUrl', encodeURIComponent(validation.cleanUrl));
    importUrl.searchParams.set('source', 'share');
    importUrl.searchParams.set('platform', platform || validation.platform);

    return importUrl.toString();
}

/**
 * Handle incoming share intent
 * @param {object} shareData - Share data from Web Share API or URL parameters
 * @returns {object} Processing result
 */
export function handleShareIntent(shareData) {
    console.log('🔗 Processing share intent:', shareData);

    // Extract URL from various possible sources
    let contentUrl = shareData.url || shareData.videoUrl || shareData.text;

    if (!contentUrl) {
        return {
            success: false,
            error: 'No URL found in share data'
        };
    }

    // If text contains URL, extract it
    if (shareData.text && !shareData.url) {
        const urlMatch = shareData.text.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
            contentUrl = urlMatch[1];
        }
    }

    // Validate and normalize the URL
    const validation = validateAndNormalizeUrl(contentUrl);

    if (!validation.success) {
        return {
            success: false,
            error: validation.error,
            originalUrl: contentUrl
        };
    }

    console.log(`✅ Share intent processed: ${validation.platformName} content detected`);

    return {
        success: true,
        contentUrl: validation.cleanUrl,
        platform: validation.platform,
        platformName: validation.platformName,
        icon: validation.icon,
        shareSupported: validation.shareSupported,
        contentTypes: validation.contentTypes,
        importUrl: generateImportUrl(validation.cleanUrl, validation.platform)
    };
}

/**
 * Check if current browser supports sharing to this app
 * @returns {object} Share capability info
 */
export function getShareCapabilities() {
    const isWebShareSupported = typeof navigator !== 'undefined' && navigator.share;
    const canReceiveShares = typeof window !== 'undefined' && 'serviceWorker' in navigator;

    return {
        webShareSupported: isWebShareSupported,
        canReceiveShares: canReceiveShares,
        supportedPlatforms: Object.keys(SUPPORTED_PLATFORMS).filter(
            platform => SUPPORTED_PLATFORMS[platform].shareSupported
        ),
        totalSupportedPlatforms: Object.keys(SUPPORTED_PLATFORMS).length
    };
}

/**
 * Generate share URLs for social media platforms
 * @param {string} recipeUrl - URL of the recipe to share
 * @param {string} recipeTitle - Title of the recipe
 * @param {string} platform - Target platform for sharing
 * @returns {string} Share URL for the platform
 */
export function generatePlatformShareUrl(recipeUrl, recipeTitle, platform) {
    const encodedUrl = encodeURIComponent(recipeUrl);
    const encodedTitle = encodeURIComponent(recipeTitle);
    const encodedText = encodeURIComponent(`Check out this delicious ${recipeTitle} recipe!`);

    const shareUrls = {
        twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}`,
        reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
        threads: `https://threads.net/intent/post?text=${encodedText}%20${encodedUrl}`,
        bluesky: `https://bsky.app/intent/compose?text=${encodedText}%20${encodedUrl}`
    };

    return shareUrls[platform] || recipeUrl;
}

/**
 * Create deep link for mobile app sharing
 * @param {string} contentUrl - URL of content to import
 * @param {string} platform - Platform of the content
 * @returns {string} Deep link URL
 */
export function createMobileDeepLink(contentUrl, platform) {
    const baseScheme = 'docbearscomfort://';
    const encodedUrl = encodeURIComponent(contentUrl);

    return `${baseScheme}import?url=${encodedUrl}&platform=${platform}&source=share`;
}

/**
 * Check if device supports native sharing
 * @returns {boolean} Whether native sharing is supported
 */
export function supportsNativeSharing() {
    return typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function';
}

/**
 * Share using native Web Share API if available
 * @param {object} shareData - Data to share
 * @returns {Promise<boolean>} Success status
 */
export async function shareWithNativeAPI(shareData) {
    if (!supportsNativeSharing()) {
        return false;
    }

    try {
        if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return true;
        }
    } catch (error) {
        console.warn('Native sharing failed:', error);
    }

    return false;
}

/**
 * Copy to clipboard fallback
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }

        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
    } catch (error) {
        console.error('Copy to clipboard failed:', error);
        return false;
    }
}

/**
 * Show platform-specific help modal content
 * @param {string} platform - Platform identifier
 * @returns {object} Help modal content
 */
export function getPlatformHelpContent(platform) {
    const helpContent = {
        tiktok: {
            title: 'Importing from TikTok',
            icon: '🎵',
            overview: 'Import cooking videos and recipes directly from TikTok posts.',
            steps: [
                {
                    title: 'Find a Recipe Video',
                    description: 'Look for TikTok videos with cooking instructions, ingredients, or food preparation.',
                    tips: ['Cooking creators often include recipe details in captions', 'Look for ingredient lists in the video description']
                },
                {
                    title: 'Copy the Link',
                    description: 'Tap the Share button (→) and select "Copy Link".',
                    tips: ['Make sure the video is public', 'Use the mobile app for best link compatibility']
                },
                {
                    title: 'Import to Doc Bear\'s',
                    description: 'Paste the TikTok link in our import page and we\'ll extract the recipe using AI.',
                    tips: ['Our AI analyzes both audio and visual content', 'We can extract recipes even from videos without explicit text']
                }
            ],
            troubleshooting: [
                'Make sure the TikTok video is public (not private)',
                'Try using the share link from the TikTok mobile app',
                'If extraction fails, copy any recipe text manually and use Text Parser'
            ]
        },
        instagram: {
            title: 'Importing from Instagram',
            icon: '📸',
            overview: 'Import recipes from Instagram posts, reels, and stories.',
            steps: [
                {
                    title: 'Find Recipe Content',
                    description: 'Look for Instagram posts with cooking content, ingredient lists, or recipe instructions.',
                    tips: ['Check captions for detailed recipes', 'Look for cooking hashtags and ingredient lists']
                },
                {
                    title: 'Share the Post',
                    description: 'Tap the paper plane icon and select "Copy Link".',
                    tips: ['Ensure the post is public', 'Reels and regular posts both work']
                },
                {
                    title: 'AI Recipe Extraction',
                    description: 'Our AI will analyze the post content, captions, and any video content for recipe information.',
                    tips: ['Works with both video and image posts', 'Captions and hashtags are analyzed for ingredients']
                }
            ],
            troubleshooting: [
                'Make sure the Instagram post is completely public',
                'Private accounts or private posts cannot be accessed',
                'Try waiting a few minutes if you\'ve tried multiple imports (rate limiting)'
            ]
        },
        twitter: {
            title: 'Importing from Twitter/X',
            icon: '🐦',
            overview: 'Extract recipes from Twitter/X posts, threads, and cooking discussions.',
            steps: [
                {
                    title: 'Find Cooking Content',
                    description: 'Look for posts with recipe instructions, cooking tips, or food preparation content.',
                    tips: ['Thread posts often contain detailed recipes', 'Check replies for additional recipe details']
                },
                {
                    title: 'Copy the Post Link',
                    description: 'Click the Share button and select "Copy link to post".',
                    tips: ['Works with both regular posts and thread posts', 'Make sure the post is public']
                },
                {
                    title: 'Smart Content Analysis',
                    description: 'Our system will analyze the post text, images, and any linked content for recipe information.',
                    tips: ['Threads are analyzed for complete recipe information', 'Images and videos are processed when present']
                }
            ],
            troubleshooting: [
                'Ensure the Twitter/X post is public',
                'Private accounts cannot be accessed',
                'Try copying the post text manually if extraction fails'
            ]
        },
        youtube: {
            title: 'Importing from YouTube',
            icon: '📺',
            overview: 'Extract recipes from YouTube cooking videos and descriptions.',
            steps: [
                {
                    title: 'Find Cooking Videos',
                    description: 'Look for YouTube videos with cooking instructions, recipes, or food preparation.',
                    tips: ['Check video descriptions for ingredient lists', 'Cooking channels often include detailed recipes']
                },
                {
                    title: 'Share the Video',
                    description: 'Click the Share button and copy the video URL.',
                    tips: ['Both regular videos and Shorts work', 'Make sure the video is public']
                },
                {
                    title: 'Multi-Source Analysis',
                    description: 'We analyze video descriptions first (fastest), then video content if needed.',
                    tips: ['Descriptions are processed first for speed', 'Video content is analyzed if description lacks recipe info']
                }
            ],
            troubleshooting: [
                'Ensure the YouTube video is public (not private or unlisted)',
                'Age-restricted videos may not be accessible',
                'Try copying description text manually if needed'
            ]
        },
        reddit: {
            title: 'Importing from Reddit',
            icon: '🤖',
            overview: 'Extract recipes from Reddit posts and cooking community discussions.',
            steps: [
                {
                    title: 'Find Recipe Posts',
                    description: 'Look for posts in cooking subreddits with recipe content.',
                    tips: ['r/recipes, r/MealPrepSunday, and cooking subs work great', 'Check post content and top comments']
                },
                {
                    title: 'Copy Post URL',
                    description: 'Click the Share button and copy the post URL.',
                    tips: ['Both the post and comments are analyzed', 'Works with image and text posts']
                },
                {
                    title: 'Community Recipe Analysis',
                    description: 'We analyze the post content and top comments for comprehensive recipe information.',
                    tips: ['Comments often contain recipe modifications', 'Post titles and content are both processed']
                }
            ],
            troubleshooting: [
                'Make sure the subreddit and post are public',
                'Private communities cannot be accessed',
                'Copy recipe text from post or comments if extraction fails'
            ]
        }
    };

    return helpContent[platform] || {
        title: 'General Import Help',
        icon: '🔗',
        overview: 'Import recipes from various platforms using our universal extraction system.',
        steps: [
            {
                title: 'Copy Content URL',
                description: 'Copy the URL of the content containing recipe information.',
                tips: ['Make sure the content is publicly accessible']
            },
            {
                title: 'Paste in Import Page',
                description: 'Paste the URL in our import page and we\'ll analyze it for recipe content.',
                tips: ['Our AI works across many different platforms']
            }
        ],
        troubleshooting: [
            'Ensure the content is public and accessible',
            'Try copying recipe text manually if automatic extraction fails'
        ]
    };
}

/**
 * Track import analytics
 * @param {string} platform - Platform imported from
 * @param {boolean} success - Whether import was successful
 * @param {string} method - Extraction method used
 */
export function trackImportAnalytics(platform, success, method) {
    try {
        // Only track if analytics are available
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'recipe_import', {
                platform: platform,
                success: success,
                method: method,
                event_category: 'recipe_extraction'
            });
        }
    } catch (error) {
        // Silently fail if analytics tracking fails
        console.debug('Analytics tracking failed:', error);
    }
}
