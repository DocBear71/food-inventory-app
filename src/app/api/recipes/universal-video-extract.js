
// file: /src/pages/api/recipes/universal-video-extract.js v1 - Universal video recipe extraction endpoint (simplified)

const MODAL_ENDPOINT = process.env.MODAL_ENDPOINT_URL || 'https://doc-bears-comfort-kitchen--social-video-recipe-extractor-703821.modal.run';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use POST.'
        });
    }

    try {
        const { video_url, platform, analysis_type = 'ai_vision_enhanced', extract_image = true } = req.body;

        // Basic validation
        if (!video_url) {
            return res.status(400).json({
                success: false,
                error: 'video_url is required'
            });
        }

        // Enhanced URL validation for universal support
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(video_url)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid URL format. Please provide a valid HTTP/HTTPS URL.'
            });
        }

        // Log the extraction attempt
        console.log(`🌍 Universal video extraction request:`, {
            platform: platform || 'auto-detect',
            url: video_url.substring(0, 100) + '...',
            extract_image
        });

        // Call Modal.com extraction endpoint (same as your existing one)
        const modalResponse = await fetch(MODAL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                video_url,
                platform: platform || 'auto-detect',
                analysis_type,
                extract_image
            }),
            // Longer timeout for video processing
            timeout: 300000 // 5 minutes
        });

        if (!modalResponse.ok) {
            const errorText = await modalResponse.text();
            console.error('❌ Modal.com universal extraction failed:', {
                status: modalResponse.status,
                statusText: modalResponse.statusText,
                error: errorText
            });

            return res.status(500).json({
                success: false,
                error: 'Video extraction service temporarily unavailable',
                details: modalResponse.status === 504 ? 'Request timeout - video may be too long or platform may be slow' : 'Service error'
            });
        }

        const extractionResult = await modalResponse.json();

        if (!extractionResult.success) {
            console.error('❌ Universal video extraction failed:', extractionResult.error);

            // Enhanced error handling for different platforms
            let userFriendlyError = extractionResult.error;
            let suggestion = '';

            if (extractionResult.error?.includes('Twitter') || extractionResult.error?.includes('twitter')) {
                suggestion = 'Twitter videos may require the post to be public. Try copying the tweet text and using Text Parser instead.';
            } else if (extractionResult.error?.includes('YouTube') || extractionResult.error?.includes('youtube')) {
                suggestion = 'YouTube videos may be restricted. Try shorter videos or use the direct share link.';
            } else if (extractionResult.error?.includes('Reddit') || extractionResult.error?.includes('reddit')) {
                suggestion = 'Reddit videos may be in a private community. Try videos from public cooking subreddits.';
            } else if (extractionResult.platform) {
                suggestion = `${extractionResult.platform} content may not be accessible. Try copying any recipe text and using Text Parser.`;
            }

            return res.status(400).json({
                success: false,
                error: userFriendlyError,
                suggestion,
                platform: extractionResult.platform || platform,
                troubleshooting: extractionResult.troubleshooting || {}
            });
        }

        // Success response
        console.log(`✅ Universal video extraction successful:`, {
            platform: extractionResult.recipe?.method || platform,
            title: extractionResult.recipe?.title?.substring(0, 50) + '...',
            hasImage: !!extractionResult.recipe?.extractedImage
        });

        return res.status(200).json({
            success: true,
            recipe: {
                ...extractionResult.recipe,
                // Add metadata about the extraction
                extractionMetadata: {
                    extractedAt: new Date().toISOString(),
                    platform: extractionResult.recipe?.method || platform || 'universal',
                    imageExtracted: !!extractionResult.recipe?.extractedImage,
                    apiVersion: 'universal-v1'
                }
            },
            metadata: extractionResult.metadata
        });

    } catch (error) {
        console.error('❌ Universal video extraction API error:', error);

        // Handle different types of errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                error: 'Video extraction service temporarily unavailable',
                details: 'Please try again in a few minutes'
            });
        }

        if (error.name === 'TimeoutError') {
            return res.status(504).json({
                success: false,
                error: 'Video processing timeout',
                details: 'The video may be too long or the platform may be experiencing delays'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Internal server error during video extraction',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
        });
    }
}
