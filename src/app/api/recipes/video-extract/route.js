// file: /src/app/api/recipes/video-extract/route.js - ADVANCED HYBRID SYSTEM

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import OpenAI from 'openai';
import {
    parseIngredientLine,
    parseInstructionLine,
    extractMetadata,
    cleanTitle
} from '@/lib/recipe-parsing-utils';

// Initialize OpenAI (make sure to add OPENAI_API_KEY to your environment variables)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Video platform detection (your existing code)
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
    console.log('🎥 [HYBRID] Detecting video platform for URL:', url);

    for (const [platform, config] of Object.entries(VIDEO_PLATFORMS)) {
        const videoId = config.extractId(url);
        if (videoId) {
            console.log(`✅ [HYBRID] Detected ${platform} video: ${videoId}`);
            return { platform, videoId, originalUrl: url };
        }
    }

    throw new Error('Unsupported video platform. Currently supports YouTube.');
}

// METHOD 1: Try caption extraction first (your existing method, enhanced)
async function extractYouTubeTranscript(videoId) {
    console.log('📝 [CAPTIONS] Attempting caption extraction for:', videoId);

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
                console.log(`🔍 [CAPTIONS] Trying ${method.name} method...`);
                const transcript = await method.attempt();

                if (transcript && Array.isArray(transcript) && transcript.length > 0) {
                    console.log(`✅ [CAPTIONS] SUCCESS with ${method.name}! Found ${transcript.length} segments`);

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
                console.log(`❌ [CAPTIONS] ${method.name} failed:`, methodError.message);
                continue;
            }
        }

        throw new Error('All caption extraction methods failed');

    } catch (error) {
        console.log('❌ [CAPTIONS] Caption extraction failed:', error.message);
        throw error;
    }
}

// METHOD 2: AI Audio Transcription with Whisper
async function extractAudioWithWhisper(videoId) {
    console.log('🤖 [AI] Starting Whisper audio transcription for:', videoId);

    try {
        // Get video info and audio stream using yt-dlp
        const { spawn } = require('child_process');
        const fs = require('fs');
        const path = require('path');

        // Create temp directory
        const tempDir = '/tmp';
        const audioFile = path.join(tempDir, `${videoId}-audio.mp3`);

        console.log('🎵 [AI] Extracting audio with yt-dlp...');

        // Use yt-dlp to extract audio (first 10 minutes to control costs)
        const ytDlpProcess = spawn('yt-dlp', [
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', '128K',
            '--postprocessor-args', 'ffmpeg:-ss 0 -t 600', // First 10 minutes
            '-o', audioFile.replace('.mp3', '.%(ext)s'),
            `https://www.youtube.com/watch?v=${videoId}`
        ]);

        await new Promise((resolve, reject) => {
            ytDlpProcess.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`yt-dlp failed with code ${code}`));
            });
            ytDlpProcess.on('error', reject);
        });

        console.log('✅ [AI] Audio extracted successfully');

        // Check if file exists
        if (!fs.existsSync(audioFile)) {
            throw new Error('Audio file was not created');
        }

        console.log('🤖 [AI] Sending to Whisper API...');

        // Transcribe with OpenAI Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFile),
            model: 'whisper-1',
            response_format: 'verbose_json',
            language: 'en',
            prompt: 'This is a cooking video with recipe instructions, ingredients, and cooking techniques.' // Help Whisper understand context
        });

        // Clean up temp file
        fs.unlinkSync(audioFile);
        console.log('🗑️ [AI] Cleaned up temporary audio file');

        console.log('✅ [AI] Whisper transcription complete:', {
            duration: transcription.duration,
            segments: transcription.segments?.length,
            text_length: transcription.text?.length
        });

        // Transform to our format
        const segments = transcription.segments?.map(segment => ({
            text: segment.text,
            start: segment.start,
            duration: segment.end - segment.start
        })) || [];

        return {
            segments: segments,
            fullText: transcription.text,
            totalDuration: transcription.duration,
            extractionMethod: 'ai-whisper',
            quality: 'high',
            cost: calculateWhisperCost(transcription.duration)
        };

    } catch (error) {
        console.error('❌ [AI] Whisper transcription failed:', error);
        throw error;
    }
}

// METHOD 3: AI Vision Analysis (fallback)
async function analyzeVideoWithVision(videoId, videoUrl) {
    console.log('👁️ [AI] Starting GPT-4 Vision analysis for:', videoId);

    try {
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

        // Get video title from YouTube (if possible)
        let videoTitle = '';
        try {
            const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
            const html = await videoPageResponse.text();
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            videoTitle = titleMatch ? titleMatch[1].replace(' - YouTube', '') : '';
        } catch (titleError) {
            console.log('⚠️ [AI] Could not extract video title');
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this cooking video thumbnail and create a recipe extraction. 

Video Title: "${videoTitle}"
Video URL: ${videoUrl}

Based on the thumbnail and title, provide a structured recipe with:
1. Recipe title (clean, descriptive)
2. Brief description
3. Likely ingredients (be specific with common amounts)
4. Step-by-step cooking instructions
5. Estimated prep/cook times
6. Difficulty level (easy/medium/hard)
7. Relevant tags

Format this as a natural recipe that someone could actually follow. Be practical and assume standard cooking knowledge.`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: thumbnailUrl
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1500
        });

        const analysis = response.choices[0].message.content;
        console.log('✅ [AI] Vision analysis complete');

        return {
            segments: [],
            fullText: analysis,
            totalDuration: 0,
            extractionMethod: 'ai-vision',
            quality: 'medium',
            cost: calculateVisionCost(),
            aiAnalysis: analysis,
            note: 'This recipe was created by AI analysis of the video thumbnail and title. For best accuracy, consider using videos with captions or manual transcription.'
        };

    } catch (error) {
        console.error('❌ [AI] Vision analysis failed:', error);
        throw error;
    }
}

// Calculate API costs for transparency
function calculateWhisperCost(durationSeconds) {
    const minutes = Math.ceil(durationSeconds / 60);
    const cost = minutes * 0.006; // $0.006 per minute
    return {
        duration_minutes: minutes,
        estimated_cost_usd: cost.toFixed(4),
        note: 'Whisper API pricing'
    };
}

function calculateVisionCost() {
    return {
        estimated_cost_usd: '0.01',
        note: 'GPT-4 Vision API pricing'
    };
}

// MAIN HYBRID EXTRACTION FUNCTION
async function extractRecipeWithHybridMethod(videoInfo) {
    console.log('🚀 [HYBRID] Starting advanced recipe extraction for:', videoInfo.videoId);

    const extractionResults = {
        attempts: [],
        successful_method: null,
        total_cost: 0,
        quality_score: 0
    };

    // METHOD 1: Try captions first (free, high quality)
    try {
        console.log('📝 [HYBRID] Phase 1: Attempting caption extraction...');
        const captionResult = await extractYouTubeTranscript(videoInfo.videoId);

        extractionResults.attempts.push({
            method: 'captions',
            status: 'success',
            quality: 'high',
            cost: 0
        });

        extractionResults.successful_method = 'captions';
        extractionResults.quality_score = 10;

        console.log('✅ [HYBRID] Caption extraction successful! Skipping AI methods.');
        return {
            ...captionResult,
            extractionResults
        };

    } catch (captionError) {
        console.log('❌ [HYBRID] Caption extraction failed:', captionError.message);
        extractionResults.attempts.push({
            method: 'captions',
            status: 'failed',
            error: captionError.message
        });
    }

    // METHOD 2: Try AI audio transcription (paid, high quality)
    try {
        console.log('🤖 [HYBRID] Phase 2: Attempting AI audio transcription...');
        const audioResult = await extractAudioWithWhisper(videoInfo.videoId);

        extractionResults.attempts.push({
            method: 'ai-whisper',
            status: 'success',
            quality: 'high',
            cost: audioResult.cost.estimated_cost_usd
        });

        extractionResults.successful_method = 'ai-whisper';
        extractionResults.total_cost = parseFloat(audioResult.cost.estimated_cost_usd);
        extractionResults.quality_score = 9;

        console.log('✅ [HYBRID] AI audio transcription successful!');
        return {
            ...audioResult,
            extractionResults
        };

    } catch (audioError) {
        console.log('❌ [HYBRID] AI audio transcription failed:', audioError.message);
        extractionResults.attempts.push({
            method: 'ai-whisper',
            status: 'failed',
            error: audioError.message
        });
    }

    // METHOD 3: AI vision analysis (paid, medium quality)
    try {
        console.log('👁️ [HYBRID] Phase 3: Attempting AI vision analysis...');
        const visionResult = await analyzeVideoWithVision(videoInfo.videoId, videoInfo.originalUrl);

        extractionResults.attempts.push({
            method: 'ai-vision',
            status: 'success',
            quality: 'medium',
            cost: visionResult.cost.estimated_cost_usd
        });

        extractionResults.successful_method = 'ai-vision';
        extractionResults.total_cost = parseFloat(visionResult.cost.estimated_cost_usd);
        extractionResults.quality_score = 6;

        console.log('✅ [HYBRID] AI vision analysis successful!');
        return {
            ...visionResult,
            extractionResults
        };

    } catch (visionError) {
        console.log('❌ [HYBRID] AI vision analysis failed:', visionError.message);
        extractionResults.attempts.push({
            method: 'ai-vision',
            status: 'failed',
            error: visionError.message
        });
    }

    // If all methods failed
    extractionResults.successful_method = 'none';
    throw new Error(`All extraction methods failed. Attempted: captions, AI audio transcription, and AI vision analysis. Consider using manual transcription.`);
}

// Enhanced recipe parsing with AI assistance
async function parseRecipeFromTranscriptWithAI(transcriptData, videoInfo) {
    console.log('🧠 [AI-PARSE] Starting enhanced recipe parsing...');

    // If we have good transcript data, use AI to enhance the parsing
    if (transcriptData.extractionMethod === 'captions' || transcriptData.extractionMethod === 'ai-whisper') {
        try {
            console.log('🤖 [AI-PARSE] Using AI to enhance recipe structure...');

            const enhancedParsingPrompt = `Analyze this cooking video transcript and extract a structured recipe:

TRANSCRIPT:
${transcriptData.fullText.substring(0, 4000)}...

Please extract:
1. Recipe title (clean, descriptive)
2. Brief description  
3. Ingredients with amounts and units
4. Step-by-step instructions
5. Prep time and cook time (if mentioned)
6. Number of servings (if mentioned)
7. Difficulty level
8. Relevant cooking tags

Format as JSON with this structure:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": [{"name": "ingredient", "amount": "1", "unit": "cup"}],
  "instructions": ["Step 1", "Step 2"],
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "difficulty": "medium",
  "tags": ["tag1", "tag2"]
}`;

            const aiResponse = await openai.chat.completions.create({
                model: "gpt-4-turbo-preview",
                messages: [
                    {
                        role: "user",
                        content: enhancedParsingPrompt
                    }
                ],
                response_format: { type: "json_object" }
            });

            const aiParsedRecipe = JSON.parse(aiResponse.choices[0].message.content);
            console.log('✅ [AI-PARSE] AI-enhanced parsing complete');

            // Add video metadata
            aiParsedRecipe.videoSource = videoInfo.originalUrl;
            aiParsedRecipe.videoPlatform = videoInfo.platform;
            aiParsedRecipe.videoId = videoInfo.videoId;
            aiParsedRecipe.extractionMethod = transcriptData.extractionMethod;
            aiParsedRecipe.aiEnhanced = true;

            return aiParsedRecipe;

        } catch (aiParseError) {
            console.log('⚠️ [AI-PARSE] AI enhancement failed, using fallback parsing:', aiParseError.message);
        }
    }

    // Fallback to your existing parsing logic
    return parseRecipeFromTranscript(transcriptData, videoInfo);
}

// MAIN API ENDPOINT
export async function POST(request) {
    try {
        console.log('=== 🚀 ADVANCED HYBRID VIDEO RECIPE EXTRACTION START ===');

        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in to extract recipes from videos.' },
                { status: 401 }
            );
        }

        const { url, method = 'hybrid' } = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: 'Video URL is required' },
                { status: 400 }
            );
        }

        console.log('🎬 [HYBRID] Processing video URL:', url);
        console.log('🎯 [HYBRID] Extraction method:', method);

        // Detect video platform
        const videoInfo = detectVideoPlatform(url);
        console.log('📺 [HYBRID] Video info:', videoInfo);

        // Extract transcript using hybrid method
        const transcriptData = await extractRecipeWithHybridMethod(videoInfo);

        // Parse recipe with AI enhancement
        const recipe = await parseRecipeFromTranscriptWithAI(transcriptData, videoInfo);

        console.log('✅ [HYBRID] Advanced extraction complete:', {
            method: transcriptData.extractionResults.successful_method,
            quality_score: transcriptData.extractionResults.quality_score,
            total_cost: transcriptData.extractionResults.total_cost,
            title: recipe.title,
            ingredients: recipe.ingredients?.length || 0,
            instructions: recipe.instructions?.length || 0
        });

        return NextResponse.json({
            success: true,
            recipe,
            videoInfo: {
                platform: videoInfo.platform,
                videoId: videoInfo.videoId,
                originalUrl: videoInfo.originalUrl
            },
            extractionInfo: {
                method: transcriptData.extractionResults.successful_method,
                quality: transcriptData.quality,
                attempts: transcriptData.extractionResults.attempts,
                cost: {
                    total_usd: transcriptData.extractionResults.total_cost,
                    breakdown: transcriptData.cost || null
                },
                aiEnhanced: recipe.aiEnhanced || false
            },
            message: `Recipe extracted using ${transcriptData.extractionResults.successful_method} with quality score ${transcriptData.extractionResults.quality_score}/10`
        });

    } catch (error) {
        console.error('=== 🚀 ADVANCED HYBRID VIDEO EXTRACTION ERROR ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);

        return NextResponse.json({
            error: error.message,
            fallbackOptions: [
                'Try a different video with captions enabled',
                'Use our "Parse Recipe Text" feature with manual transcript',
                'Look for the same recipe from channels like Bon Appétit or Tasty'
            ],
            supportedPlatforms: 'YouTube',
            advancedFeatures: [
                'Automatic caption extraction (free)',
                'AI audio transcription (paid)',
                'AI vision analysis (paid)',
                'Hybrid fallback system'
            ]
        }, { status: 400 });
    }
}

// Add these helper functions to the end of your new video-extract/route.js file
// (These are from your original implementation that the advanced version references)

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

// Original recipe parsing (fallback method)
function parseRecipeFromTranscript(transcriptData, videoInfo) {
    console.log('🧠 [FALLBACK] Parsing recipe from transcript...');

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

    console.log('✅ [FALLBACK] Recipe parsing complete:', {
        title: recipe.title,
        ingredients: recipe.ingredients.length,
        instructions: recipe.instructions.length,
        platform: videoInfo.platform
    });

    return recipe;
}
