// file: /src/app/api/recipes/video-extract/route.js - Phase 1: Transcript-based extraction

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import {
    parseIngredientLine,
    parseInstructionLine,
    extractMetadata,
    cleanTitle
} from '@/lib/recipe-parsing-utils';

// Video platform detection patterns
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
    },
    tiktok: {
        patterns: [
            /tiktok\.com\/@[^/]+\/video\/(\d+)/,
            /tiktok\.com\/v\/(\d+)/,
            /vm\.tiktok\.com\/([a-zA-Z0-9]+)/
        ],
        extractId: (url) => {
            for (const pattern of VIDEO_PLATFORMS.tiktok.patterns) {
                const match = url.match(pattern);
                if (match) return match[1];
            }
            return null;
        }
    },
    instagram: {
        patterns: [
            /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
            /instagram\.com\/p\/([a-zA-Z0-9_-]+)/
        ],
        extractId: (url) => {
            for (const pattern of VIDEO_PLATFORMS.instagram.patterns) {
                const match = url.match(pattern);
                if (match) return match[1];
            }
            return null;
        }
    }
};

// Detect video platform and extract video ID
function detectVideoPlatform(url) {
    console.log('🎥 Detecting video platform for URL:', url);

    for (const [platform, config] of Object.entries(VIDEO_PLATFORMS)) {
        const videoId = config.extractId(url);
        if (videoId) {
            console.log(`✅ Detected ${platform} video: ${videoId}`);
            return { platform, videoId, originalUrl: url };
        }
    }

    throw new Error('Unsupported video platform. Currently supports YouTube, TikTok, and Instagram.');
}

// Extract transcript from YouTube video
// Replace the extractYouTubeTranscript function in your /src/app/api/recipes/video-extract/route.js

async function extractYouTubeTranscript(videoId) {
    console.log('📝 Extracting YouTube transcript for video:', videoId);

    try {
        // Import the library
        const { YoutubeTranscript } = await import('youtube-transcript');

        console.log('🔍 Attempting transcript extraction...');

        // Method 1: Try with default settings first
        try {
            console.log('📋 Trying default transcript extraction...');
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);

            if (transcript && transcript.length > 0) {
                console.log(`✅ Success! Found ${transcript.length} transcript segments`);

                // Transform the transcript data
                const segments = transcript.map(segment => ({
                    text: segment.text,
                    start: segment.offset / 1000, // Convert to seconds
                    duration: segment.duration / 1000
                }));

                const fullText = transcript.map(t => t.text).join(' ');
                const totalDuration = Math.max(...transcript.map(t => (t.offset + t.duration) / 1000));

                console.log('📊 Transcript stats:', {
                    segments: segments.length,
                    textLength: fullText.length,
                    duration: Math.round(totalDuration / 60) + ' minutes'
                });

                return {
                    segments: segments,
                    fullText: fullText,
                    totalDuration: totalDuration
                };
            }
        } catch (defaultError) {
            console.log('❌ Default method failed:', defaultError.message);
        }

        // Method 2: Try with explicit language settings
        const languageOptions = [
            { lang: 'en' },
            { lang: 'en', country: 'US' },
            { lang: 'en-US' },
            { lang: 'en-GB' },
            {} // Try with no language specified
        ];

        for (const options of languageOptions) {
            try {
                console.log('🔍 Trying with options:', options);
                const transcript = await YoutubeTranscript.fetchTranscript(videoId, options);

                if (transcript && transcript.length > 0) {
                    console.log(`✅ Success with options ${JSON.stringify(options)}! Found ${transcript.length} segments`);

                    const segments = transcript.map(segment => ({
                        text: segment.text,
                        start: segment.offset / 1000,
                        duration: segment.duration / 1000
                    }));

                    return {
                        segments: segments,
                        fullText: transcript.map(t => t.text).join(' '),
                        totalDuration: Math.max(...transcript.map(t => (t.offset + t.duration) / 1000))
                    };
                }
            } catch (optionError) {
                console.log(`❌ Failed with options ${JSON.stringify(options)}:`, optionError.message);
                continue;
            }
        }

        // Method 3: Try alternative approach with manual language detection
        try {
            console.log('🔍 Trying manual language detection...');

            // Get available languages first
            const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });

            if (transcript && transcript.length > 0) {
                console.log(`✅ Manual detection success! Found ${transcript.length} segments`);

                const segments = transcript.map(segment => ({
                    text: segment.text,
                    start: segment.offset / 1000,
                    duration: segment.duration / 1000
                }));

                return {
                    segments: segments,
                    fullText: transcript.map(t => t.text).join(' '),
                    totalDuration: Math.max(...transcript.map(t => (t.offset + t.duration) / 1000))
                };
            }
        } catch (manualError) {
            console.log('❌ Manual detection failed:', manualError.message);
        }

        // If we get here, nothing worked
        throw new Error('Unable to extract transcript. This could be due to: 1) Captions are disabled by the creator, 2) Video is private/restricted, 3) Regional restrictions, or 4) The video is too new and captions haven\'t been processed yet.');

    } catch (error) {
        console.error('❌ YouTube transcript extraction failed:', error);

        // Provide specific error messages based on the error type
        if (error.message.includes('Video unavailable')) {
            throw new Error('Video is unavailable or private. Please try a different public video.');
        } else if (error.message.includes('Transcript is disabled')) {
            throw new Error('The video creator has disabled captions for this video. Please try a different video.');
        } else if (error.message.includes('No transcript found')) {
            throw new Error('No captions found. Try videos from major cooking channels like Bon Appétit, Tasty, or Joshua Weissman that typically have captions.');
        } else if (error.message.includes('Could not retrieve transcript')) {
            throw new Error('Unable to access video captions. The video may be region-locked or have restricted access.');
        } else {
            // For debugging, include the original error
            throw new Error(`Transcript extraction failed: ${error.message}. Please try a different video with clear captions.`);
        }
    }
}

// Extract transcript from other platforms (placeholder for now)
async function extractTranscriptFromOtherPlatforms(platform, videoId) {
    console.log(`📝 Extracting transcript from ${platform}:`, videoId);

    // For now, return a helpful message
    // In Phase 2, we'll implement actual extraction
    return {
        segments: [],
        fullText: `Video detected from ${platform}. Advanced extraction for ${platform} videos will be available in the next update. For now, please manually enter the recipe or try a YouTube video.`,
        totalDuration: 0,
        platform: platform,
        needsManualEntry: true
    };
}

// Parse recipe from transcript using AI-enhanced logic
async function parseRecipeFromTranscript(transcriptData, videoInfo) {
    console.log('🧠 Parsing recipe from transcript...');
    console.log('Transcript preview:', transcriptData.fullText.substring(0, 200) + '...');

    const recipe = {
        title: '',
        description: '',
        ingredients: [],
        instructions: [],
        prepTime: null,
        cookTime: null,
        servings: null,
        difficulty: 'medium',
        tags: ['video-recipe'],
        source: `Extracted from ${videoInfo.platform} video`,
        videoSource: videoInfo.originalUrl,
        videoId: videoInfo.videoId,
        videoPlatform: videoInfo.platform,
        category: 'entrees',
        timestamps: []
    };

    // If this needs manual entry, return template
    if (transcriptData.needsManualEntry) {
        recipe.title = `Recipe from ${videoInfo.platform} Video`;
        recipe.description = transcriptData.fullText;
        return recipe;
    }

    const text = transcriptData.fullText.toLowerCase();
    const segments = transcriptData.segments;

    // Step 1: Extract title from common patterns
    recipe.title = extractTitleFromTranscript(transcriptData.fullText, videoInfo);

    // Step 2: Identify recipe sections in transcript
    const sections = identifyRecipeSections(text, segments);

    // Step 3: Parse ingredients with timestamps
    if (sections.ingredients.length > 0) {
        recipe.ingredients = sections.ingredients.map(item => {
            const parsed = parseIngredientLine(item.text);
            if (parsed) {
                parsed.timestamp = item.timestamp;
                parsed.videoLink = `${videoInfo.originalUrl}&t=${Math.floor(item.timestamp)}s`;
            }
            return parsed;
        }).filter(Boolean);
    }

    // Step 4: Parse instructions with timestamps
    if (sections.instructions.length > 0) {
        recipe.instructions = sections.instructions.map((item, index) => {
            const parsed = parseInstructionLine(item.text, index);
            if (parsed) {
                parsed.timestamp = item.timestamp;
                parsed.videoLink = `${videoInfo.originalUrl}&t=${Math.floor(item.timestamp)}s`;
            }
            return parsed?.instruction || item.text;
        });
    }

    // Step 5: Extract metadata (cooking times, servings, etc.)
    extractVideoMetadata(transcriptData.fullText, recipe);

    // Step 6: Auto-detect category and difficulty
    const fullText = `${recipe.title} ${transcriptData.fullText}`;
    extractMetadata(fullText, recipe);

    // Step 7: Add video-specific tags
    recipe.tags.push(videoInfo.platform, 'video-extracted');
    if (recipe.title.toLowerCase().includes('quick')) recipe.tags.push('quick');
    if (recipe.title.toLowerCase().includes('easy')) recipe.tags.push('easy');

    console.log('✅ Recipe parsing complete:', {
        title: recipe.title,
        ingredients: recipe.ingredients.length,
        instructions: recipe.instructions.length,
        platform: videoInfo.platform
    });

    return recipe;
}

// Extract title from transcript
function extractTitleFromTranscript(fullText, videoInfo) {
    const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Look for title patterns in the first few segments
    const titlePatterns = [
        /(?:today (?:we're|i'm) (?:making|cooking|preparing|doing)|let's make|how to (?:make|cook)|recipe for) (.+?)(?:\.|,|!|\?|$)/i,
        /(?:this is|here's) (?:my|a|the) (.+?) recipe/i,
        /^(.+?) recipe$/i,
        /^(?:making|cooking) (.+?)$/i
    ];

    // Check first 3 segments for title patterns
    for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i];

        for (const pattern of titlePatterns) {
            const match = line.match(pattern);
            if (match) {
                const title = cleanTitle(match[1]);
                if (title.length > 3 && title.length < 100) {
                    console.log('📝 Extracted title from transcript:', title);
                    return title;
                }
            }
        }
    }

    // Fallback: use generic title
    const platform = videoInfo.platform.charAt(0).toUpperCase() + videoInfo.platform.slice(1);
    return `Recipe from ${platform} Video`;
}

// Identify different sections of the recipe in transcript
function identifyRecipeSections(text, segments) {
    console.log('🔍 Identifying recipe sections in transcript...');

    const sections = {
        ingredients: [],
        instructions: [],
        prep: [],
        cooking: []
    };

    // Keywords that indicate different sections
    const sectionKeywords = {
        ingredients: ['ingredients', 'you need', 'you\'ll need', 'shopping list', 'what you need'],
        instructions: ['instructions', 'method', 'how to', 'first', 'next', 'then', 'now', 'step'],
        prep: ['prep', 'prepare', 'preparation', 'get ready', 'start by'],
        cooking: ['cook', 'cooking', 'bake', 'fry', 'heat', 'temperature']
    };

    // Ingredient detection patterns
    const ingredientPatterns = [
        /(\d+(?:\.\d+)?)\s*(cups?|tbsp|tsp|oz|pounds?|lbs?|grams?|g|kg)\s+(?:of\s+)?([^,\.]+)/gi,
        /([^,\.]+?)\s*[,-]\s*(\d+(?:\.\d+)?)\s*(cups?|tbsp|tsp|oz|pounds?|lbs?)/gi,
        /(a|an|one|two|three|four|five)\s+(cup|tablespoon|teaspoon|pound|ounce)\s+(?:of\s+)?([^,\.]+)/gi
    ];

    // Process each segment
    segments.forEach((segment, index) => {
        const segmentText = segment.text.toLowerCase();

        // Check for ingredient mentions
        for (const pattern of ingredientPatterns) {
            const matches = [...segmentText.matchAll(pattern)];
            matches.forEach(match => {
                sections.ingredients.push({
                    text: segment.text,
                    timestamp: segment.start,
                    confidence: 0.8
                });
            });
        }

        // Check for instruction keywords
        const instructionKeywords = ['first', 'then', 'next', 'now', 'add', 'mix', 'stir', 'cook', 'bake', 'heat'];
        if (instructionKeywords.some(keyword => segmentText.includes(keyword))) {
            sections.instructions.push({
                text: segment.text,
                timestamp: segment.start,
                step: sections.instructions.length + 1
            });
        }
    });

    // Remove duplicates and sort by timestamp
    sections.ingredients = removeDuplicateSegments(sections.ingredients);
    sections.instructions = removeDuplicateSegments(sections.instructions);

    console.log('📊 Section identification results:', {
        ingredients: sections.ingredients.length,
        instructions: sections.instructions.length
    });

    return sections;
}

// Remove duplicate segments based on similarity
function removeDuplicateSegments(segments) {
    const unique = [];

    segments.forEach(segment => {
        const isDuplicate = unique.some(existing =>
            Math.abs(existing.timestamp - segment.timestamp) < 5 || // Within 5 seconds
            similarity(existing.text, segment.text) > 0.8 // 80% similar text
        );

        if (!isDuplicate) {
            unique.push(segment);
        }
    });

    return unique.sort((a, b) => a.timestamp - b.timestamp);
}

// Calculate text similarity (simple implementation)
function similarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

// Levenshtein distance calculation
function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

// Extract cooking metadata from transcript
function extractVideoMetadata(text, recipe) {
    const lowerText = text.toLowerCase();

    // Extract cooking time
    const timePatterns = [
        /(?:cook|bake|roast|grill)(?:\s+for)?\s+(\d+)(?:\s+to\s+\d+)?\s*(?:minutes?|mins?)/gi,
        /(\d+)\s*(?:minutes?|mins?)\s+(?:in the oven|cooking time|baking time)/gi,
        /(?:total|cooking|baking)\s+time[:\s]*(\d+)\s*(?:minutes?|mins?)/gi
    ];

    for (const pattern of timePatterns) {
        const match = lowerText.match(pattern);
        if (match) {
            const time = parseInt(match[1]);
            if (time > 0 && time < 300) { // Reasonable cooking time
                recipe.cookTime = time;
                break;
            }
        }
    }

    // Extract prep time
    const prepPatterns = [
        /prep(?:\s+time)?[:\s]*(\d+)\s*(?:minutes?|mins?)/gi,
        /preparation\s+time[:\s]*(\d+)\s*(?:minutes?|mins?)/gi,
        /(?:takes|need)\s+(\d+)\s*(?:minutes?|mins?)\s+to\s+prep/gi
    ];

    for (const pattern of prepPatterns) {
        const match = lowerText.match(pattern);
        if (match) {
            const time = parseInt(match[1]);
            if (time > 0 && time < 120) { // Reasonable prep time
                recipe.prepTime = time;
                break;
            }
        }
    }

    // Extract servings
    const servingPatterns = [
        /(?:serves|servings?|portions?)[:\s]*(\d+)/gi,
        /(?:makes|feeds)\s+(\d+)\s*(?:people|persons?|servings?)/gi,
        /recipe\s+for\s+(\d+)/gi
    ];

    for (const pattern of servingPatterns) {
        const match = lowerText.match(pattern);
        if (match) {
            const servings = parseInt(match[1]);
            if (servings > 0 && servings < 20) { // Reasonable serving size
                recipe.servings = servings;
                break;
            }
        }
    }

    // Extract difficulty indicators
    if (lowerText.includes('easy') || lowerText.includes('simple') || lowerText.includes('quick')) {
        recipe.difficulty = 'easy';
    } else if (lowerText.includes('advanced') || lowerText.includes('difficult') || lowerText.includes('complex')) {
        recipe.difficulty = 'hard';
    }
}

// Main API route handler
export async function POST(request) {
    try {
        console.log('=== 🎥 VIDEO RECIPE EXTRACTION API START ===');

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

        console.log('🎬 Processing video URL:', url);

        // Step 1: Detect video platform and extract ID
        const videoInfo = detectVideoPlatform(url);

        // Step 2: Extract transcript based on platform
        let transcriptData;

        if (videoInfo.platform === 'youtube') {
            transcriptData = await extractYouTubeTranscript(videoInfo.videoId);
        } else {
            transcriptData = await extractTranscriptFromOtherPlatforms(videoInfo.platform, videoInfo.videoId);
        }

        // Step 3: Parse recipe from transcript
        const recipe = await parseRecipeFromTranscript(transcriptData, videoInfo);

        console.log('✅ Video recipe extraction complete:', {
            platform: videoInfo.platform,
            title: recipe.title,
            ingredients: recipe.ingredients.length,
            instructions: recipe.instructions.length,
            hasTimestamps: recipe.ingredients.some(i => i.timestamp)
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
            message: `Recipe successfully extracted from ${videoInfo.platform} video using transcript analysis`,
            extractionMethod: 'transcript-based',
            phase: 1
        });

    } catch (error) {
        console.error('=== 🎥 VIDEO RECIPE EXTRACTION ERROR ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);

        // Return user-friendly error messages
        let errorMessage = 'Failed to extract recipe from video';

        if (error.message.includes('Unsupported video platform')) {
            errorMessage = error.message;
        } else if (error.message.includes('transcript')) {
            errorMessage = 'Could not extract transcript from video. Please ensure the video has captions/subtitles available, or try a different video.';
        } else if (error.message.includes('Unauthorized')) {
            errorMessage = 'Please log in to extract recipes from videos.';
        }

        return NextResponse.json({
            error: errorMessage,
            details: error.message,
            supportedPlatforms: 'YouTube (with captions), TikTok and Instagram (coming in Phase 2)',
            extractionMethod: 'transcript-based',
            phase: 1,
            suggestions: [
                'Ensure the video has captions or subtitles available',
                'Try videos from popular cooking channels that typically have good captions',
                'For best results, use YouTube videos with clear speech and good audio quality'
            ]
        }, { status: 400 });
    }
}