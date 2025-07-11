'use client';

// file: /src/components/recipes/VideoImportSection.js - Updated for TikTok/Instagram

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiPost } from '@/lib/api-config';

export default function VideoImportSection({ onRecipeExtracted, disabled = false }) {
    const [videoUrl, setVideoUrl] = useState('');
    const [extracting, setExtracting] = useState(false);
    const [error, setError] = useState('');
    const [extractionInfo, setExtractionInfo] = useState(null);

    // Detect video platform
    const detectVideoPlatform = (url) => {
        const platforms = {
            tiktok: /tiktok\.com/i,
            instagram: /instagram\.com/i,
            facebook: /facebook\.com|fb\.watch/i
        };

        for (const [platform, pattern] of Object.entries(platforms)) {
            if (pattern.test(url)) {
                return platform;
            }
        }
        return 'unknown';
    };

    // Validate video URL
    const isValidVideoUrl = (url) => {
        const videoPatterns = [
            // TikTok patterns
            /tiktok\.com\/@[^/]+\/video\/\d+/,
            /tiktok\.com\/t\/[a-zA-Z0-9]+/,
            /vm\.tiktok\.com\/[a-zA-Z0-9]+/,

            // Instagram patterns
            /instagram\.com\/reel\/[a-zA-Z0-9_-]+/,
            /instagram\.com\/p\/[a-zA-Z0-9_-]+/,
            /instagram\.com\/tv\/[a-zA-Z0-9_-]+/,

            // Facebook patterns - ADD these
            /facebook\.com\/watch\/?\?v=\d+/,
            /facebook\.com\/[^\/]+\/videos\/\d+/,
            /fb\.watch\/[a-zA-Z0-9_-]+/,
            /facebook\.com\/share\/r\/[a-zA-Z0-9_-]+/,
            /facebook\.com\/reel\/\d+/
        ];

        return videoPatterns.some(pattern => pattern.test(url));
    };

    const handleVideoExtraction = async () => {
        if (!videoUrl.trim()) {
            setError('Please enter a video URL');
            return;
        }

        if (!isValidVideoUrl(videoUrl)) {
            setError('Please enter a valid TikTok, Instagram, or Facebook video URL. For YouTube, use the Text Paste option.');
            return;
        }


        const platform = detectVideoPlatform(videoUrl);

        setExtracting(true);
        setError('');
        setExtractionInfo(null);

        try {
            console.log(`🎥 Starting ${platform} video extraction for:`, videoUrl);

            const response = await apiPost('/api/recipes/video-extract', {
                url: videoUrl.trim()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to extract recipe from video');
            }

            const data = await response.json();

            if (data.success) {
                console.log('✅ Video extraction successful:', data.recipe.title);

                setExtractionInfo({
                    platform: data.videoInfo.platform,
                    title: data.recipe.title,
                    ingredients: data.recipe.ingredients.length,
                    instructions: data.recipe.instructions.length,
                    extractionMethod: data.extractionInfo.method,
                    hasTimestamps: data.recipe.ingredients?.some(i => i.timestamp) ||
                        data.recipe.instructions?.some(i => i.timestamp),
                    cost: data.extractionInfo.cost?.total_usd || 0,
                    videoDuration: data.recipe.videoDuration
                });

                // Pass the extracted recipe to parent component
                onRecipeExtracted(data.recipe, data.videoInfo);

                // Clear the URL input
                setVideoUrl('');
            } else {
                throw new Error(data.error || 'Failed to extract recipe');
            }

        } catch (error) {
            console.error('❌ Video extraction error:', error);
            setError(error.message);
            setExtractionInfo(null);
        } finally {
            setExtracting(false);
        }
    };

    const handleUrlChange = (e) => {
        const url = e.target.value;
        setVideoUrl(url);

        // Clear previous error when user starts typing
        if (error) setError('');

        // Clear extraction info when URL changes
        if (extractionInfo) setExtractionInfo(null);
    };

    const getPlatformIcon = (platform) => {
        const icons = {
            tiktok: '🎵',
            instagram: '📸',
            facebook: '👥',
            unknown: '🎥'
        };
        return icons[platform] || icons.unknown;
    };

    const getPlatformColor = (platform) => {
        const colors = {
            tiktok: 'from-pink-50 to-purple-50 border-pink-200',
            instagram: 'from-purple-50 to-pink-50 border-purple-200',
            facebook: 'from-blue-50 to-indigo-50 border-blue-200',
            unknown: 'from-gray-50 to-blue-50 border-gray-200'
        };
        return colors[platform] || colors.unknown;
    };

    const detectedPlatform = videoUrl ? detectVideoPlatform(videoUrl) : 'unknown';

    return (
        <div className={`bg-gradient-to-r ${getPlatformColor(detectedPlatform)} border rounded-lg p-6`}>
            <div className="flex items-center mb-4">
                <div className="flex-shrink-0 mr-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-2xl">{getPlatformIcon(detectedPlatform)}</span>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        🎥 Extract Recipe from Video (AI-Powered)
                    </h3>
                    <p className="text-sm text-gray-600">
                        Extract recipes from TikTok, Instagram, and Facebook using advanced AI audio analysis  {/* ADD Facebook */}
                    </p>
                </div>
            </div>

            {/* Video URL Input */}
            <div className="space-y-4">
                <div>
                    <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 mb-2">
                        Video URL
                        {detectedPlatform !== 'unknown' && (
                            <span className="ml-2 text-xs bg-white px-2 py-1 rounded-full text-gray-600">
                                {getPlatformIcon(detectedPlatform)} {detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)} detected
                            </span>
                        )}
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="url"
                            id="video-url"
                            value={videoUrl}
                            onChange={handleUrlChange}
                            placeholder="Paste TikTok, Instagram, or Facebook video URL here..."
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-sm"
                            disabled={disabled || extracting}
                            style={{fontSize: '16px'}} // Prevent zoom on mobile
                        />
                        <TouchEnhancedButton
                            onClick={handleVideoExtraction}
                            disabled={disabled || extracting || !videoUrl.trim()}
                            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                                extracting
                                    ? 'bg-gray-300 text-white cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
                            }`}
                        >
                            {extracting ? (
                                <div className="flex items-center">
                                    <div
                                        className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Extracting...
                                </div>
                            ) : (
                                'Extract Recipe'
                            )}
                        </TouchEnhancedButton>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        <strong>✨ AI-Powered:</strong> Works with any video - no captions required for YouTube!
                    </div>
                </div>

                {/* Error Display - Updated for Modal-only */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex items-start">
                            <div className="text-red-500 mr-2 mt-0.5">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                          clipRule="evenodd"/>
                                </svg>
                            </div>
                            <div className="text-sm">
                                <p className="text-red-800 font-medium">Video Extraction Failed</p>
                                <p className="text-red-700 mt-1">{error}</p>
                                <div className="mt-2 text-red-600">
                                    <p className="font-medium">Platform-specific tips:</p>
                                    <ul className="list-disc list-inside mt-1 text-xs">
                                        {detectedPlatform === 'tiktok' && (
                                            <>
                                                <li>Copy the share link directly from TikTok app</li>
                                                <li>Make sure the video is public and not age-restricted</li>
                                                <li>Try cooking videos from popular creators</li>
                                            </>
                                        )}
                                        {detectedPlatform === 'instagram' && (
                                            <>
                                                <li>Use public Instagram Reels (not private accounts)</li>
                                                <li>Copy the direct share link from Instagram</li>
                                                <li>Try content from popular cooking accounts</li>
                                            </>
                                        )}
                                        {detectedPlatform === 'facebook' && (
                                            <>
                                                <li>Use public Facebook videos (not private posts)</li>
                                                <li>Copy the share link directly from Facebook</li>
                                                <li>Try cooking videos from popular Facebook pages</li>
                                                <li>Share URLs (facebook.com/share/r/) work best</li>
                                            </>
                                        )}
                                        {detectedPlatform === 'unknown' && (
                                            <>
                                                <li>Use TikTok, Instagram, or Facebook video URLs</li>
                                                <li>For YouTube videos, copy the transcript and use Text Paste instead</li>
                                                <li>Make sure the video is public and accessible</li>
                                                <li>AI processing works best with clear audio</li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State - Updated */}
                {extracting && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                            <div className="text-blue-800">
                                <p className="font-medium text-sm">🤖 AI analyzing {detectedPlatform} video audio...</p>
                                <p className="text-xs text-blue-600 mt-1">
                                    {detectedPlatform === 'tiktok' && 'TikTok videos typically process in 15-45 seconds using AI audio analysis'}
                                    {detectedPlatform === 'instagram' && 'Instagram Reels usually take 20-60 seconds to process with AI'}
                                    {detectedPlatform === 'facebook' && 'Facebook videos typically process in 30-90 seconds using AI audio analysis'}
                                    {detectedPlatform === 'unknown' && 'Processing time varies by platform and video length - all powered by AI'}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 bg-blue-100 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                        </div>
                    </div>
                )}

                {/* Help Section - Updated for Modal-only */}
                {!extracting && !extractionInfo && !error && (
                    <details className="mt-4">
                        <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                            📖 How does AI video extraction work?
                        </summary>
                        <div className="mt-3 text-xs text-gray-500 space-y-2 pl-4 border-l-2 border-gray-200">
                            <p>
                                <strong>🤖 AI-Powered Processing:</strong> We extract audio from social media videos and use advanced
                                AI to identify ingredients, instructions, and cooking techniques.
                            </p>
                            <p>
                                <strong>🎵 TikTok & 📸 Instagram & 👥 Facebook:</strong> Perfect for quick recipes with clear ingredient
                                callouts and step-by-step cooking instructions.
                            </p>
                            <p>
                                <strong>📺 YouTube Videos:</strong> Not supported for direct video extraction. Instead, copy the
                                video transcript/captions and use the <strong>📋 Text Paste</strong> option - it works even better
                                than video processing!
                            </p>
                            <p>
                                <strong>✨ Best Results:</strong> Videos with clear speech, ingredient mentions, and
                                step-by-step cooking instructions work great across all supported platforms.
                            </p>
                            <div className="mt-2">
                                <strong>🌟 Recommended sources:</strong><br/>
                                • TikTok: @gordonramsayofficial, @cookingwithlynja<br/>
                                • Instagram: @tasty, @buzzfeedtasty<br/>
                                • Facebook: Public cooking pages and viral recipe videos<br/>
                                • YouTube: Any cooking channel → copy transcript → use Text Paste ✨
                            </div>
                            <div className="mt-2 bg-green-50 border border-green-200 rounded p-2">
                                <strong>🚀 Best of Both Worlds:</strong> Social media videos get direct AI processing,
                                while YouTube transcripts through Text Paste often give even better results since the
                                text is cleaner and more accurate!
                            </div>
                        </div>
                    </details>
                )}
            </div>
        </div>
    );
}