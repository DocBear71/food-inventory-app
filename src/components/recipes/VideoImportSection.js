'use client';

// file: /src/components/recipes/VideoImportSection.js - Updated for ALL platforms

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiPost } from '@/lib/api-config';

export default function VideoImportSection({ onRecipeExtracted, disabled = false }) {
    const [videoUrl, setVideoUrl] = useState('');
    const [extracting, setExtracting] = useState(false);
    const [error, setError] = useState('');
    const [extractionInfo, setExtractionInfo] = useState(null);

    // Enhanced platform detection for ALL supported platforms
    const detectVideoPlatform = (url) => {
        if (!url) return 'unknown';
        const urlLower = url.toLowerCase();

        // Enhanced platform detection for ALL social media platforms
        if (urlLower.includes('tiktok.com') || urlLower.includes('vm.tiktok.com')) return 'tiktok';
        if (urlLower.includes('instagram.com')) return 'instagram';
        if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch') || urlLower.includes('fb.com')) return 'facebook';
        if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
        if (urlLower.includes('reddit.com') || urlLower.includes('redd.it')) return 'reddit';
        if (urlLower.includes('bsky.app') || urlLower.includes('bluesky.app')) return 'bluesky';
        if (urlLower.includes('pinterest.com')) return 'pinterest';
        if (urlLower.includes('snapchat.com')) return 'snapchat';
        if (urlLower.includes('linkedin.com')) return 'linkedin';
        if (urlLower.includes('threads.net')) return 'threads';

        return 'unknown';
    };

    // Comprehensive URL validation for ALL platforms
    const isValidVideoUrl = (url) => {
        if (!url) return false;

        const contentPatterns = [
            // TikTok patterns
            /tiktok\.com\/@[^\/]+\/video\/\d+/,
            /tiktok\.com\/t\/[a-zA-Z0-9]+/,
            /vm\.tiktok\.com\/[a-zA-Z0-9]+/,
            /tiktok\.com\/.*?\/video\/\d+/,

            // Instagram patterns
            /instagram\.com\/reel\/[a-zA-Z0-9_-]+/,
            /instagram\.com\/p\/[a-zA-Z0-9_-]+/,
            /instagram\.com\/tv\/[a-zA-Z0-9_-]+/,

            // Facebook patterns
            /facebook\.com\/watch\/?\?v=\d+/,
            /facebook\.com\/[^\/]+\/videos\/\d+/,
            /fb\.watch\/[a-zA-Z0-9_-]+/,
            /facebook\.com\/share\/r\/[a-zA-Z0-9_-]+/,
            /facebook\.com\/reel\/\d+/,

            // Twitter/X patterns
            /(twitter\.com|x\.com)\/[^\/]+\/status\/\d+/,

            // YouTube patterns
            /youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/,
            /youtu\.be\/[a-zA-Z0-9_-]+/,
            /youtube\.com\/shorts\/[a-zA-Z0-9_-]+/,

            // Reddit patterns
            /reddit\.com\/r\/[^\/]+\/comments\/[a-zA-Z0-9]+/,
            /redd\.it\/[a-zA-Z0-9]+/,

            // Pinterest patterns
            /pinterest\.com\/pin\/\d+/,

            // Bluesky patterns
            /bsky\.app\/profile\/[^\/]+\/post\/[a-zA-Z0-9]+/,

            // LinkedIn patterns
            /linkedin\.com\/posts\/[a-zA-Z0-9_-]+/,

            // Threads patterns
            /threads\.net\/@[^\/]+\/post\/[a-zA-Z0-9]+/,

            // Direct video files
            /\.(mp4|mov|avi|mkv|webm)(\?|$)/i
        ];

        return contentPatterns.some(pattern => pattern.test(url));
    };


    const handleVideoExtraction = async () => {
        if (!videoUrl.trim()) {
            setError('Please enter a video URL');
            return;
        }

        if (!isValidVideoUrl(videoUrl)) {
            setError('Please enter a valid social media URL from TikTok, Instagram, Facebook, Twitter/X, YouTube, Reddit, Pinterest, Bluesky, LinkedIn, Threads, or Snapchat.');
            return;
        }

        const platform = detectVideoPlatform(videoUrl);
        console.log(`🎥 Starting ${platform} video extraction for:`, videoUrl);

        setExtracting(true);
        setError('');
        setExtractionInfo(null);

        try {
            const response = await apiPost('/api/recipes/video-extract', {
                video_url: videoUrl.trim(),  // ✅ FIXED: Changed from 'url' to 'video_url'
                analysisType: 'ai_vision_enhanced',
                extractImage: true,
                platform: detectVideoPlatform(videoUrl)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to extract recipe from video');
            }

            const data = await response.json();

            if (data.success) {
                console.log(`✅ ${platform} video extraction successful:`, data.recipe.title);

                setExtractionInfo({
                    platform: data.videoInfo.platform,
                    title: data.recipe.title,
                    ingredients: data.recipe.ingredients.length,
                    instructions: data.recipe.instructions.length,
                    extractionMethod: data.extractionInfo.method,
                    hasTimestamps: data.recipe.ingredients?.some(i => i.videoTimestamp) ||
                        data.recipe.instructions?.some(i => i.videoTimestamp),
                    cost: data.extractionInfo.cost?.total_usd || 0,
                    videoDuration: data.recipe.videoMetadata?.videoDuration
                });

                // Pass the extracted recipe to parent component
                onRecipeExtracted(data.recipe, data.videoInfo);

                // Clear the URL input
                setVideoUrl('');
            } else {
                throw new Error(data.error || 'Failed to extract recipe');
            }

        } catch (error) {
            console.error(`❌ ${platform} video extraction error:`, error);
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

    const getPlatformName = (platform) => {
        const names = {
            tiktok: 'TikTok',
            instagram: 'Instagram',
            facebook: 'Facebook',
            twitter: 'Twitter/X',
            youtube: 'YouTube',
            reddit: 'Reddit',
            pinterest: 'Pinterest',
            bluesky: 'Bluesky',
            linkedin: 'LinkedIn',
            threads: 'Threads',
            snapchat: 'Snapchat',
            unknown: 'Social Media'
        };
        return names[platform] || 'Social Media';
    };

    const getPlatformIcon = (platform) => {
        const icons = {
            tiktok: '🎵',
            instagram: '📷',
            facebook: '📘',
            twitter: '🐦',
            youtube: '📺',
            reddit: '🔴',
            pinterest: '📌',
            bluesky: '🦋',
            linkedin: '💼',
            threads: '🧵',
            snapchat: '👻',
            unknown: '🎥'
        };
        return icons[platform] || '🎥';
    };

    const getPlatformColor = (platform) => {
        const colors = {
            tiktok: 'from-pink-500 to-red-500',
            instagram: 'from-purple-500 to-pink-500',
            facebook: 'from-blue-600 to-blue-700',
            twitter: 'from-sky-400 to-blue-500',
            youtube: 'from-red-500 to-red-600',
            reddit: 'from-orange-500 to-red-500',
            pinterest: 'from-red-600 to-pink-600',
            bluesky: 'from-blue-400 to-sky-500',
            linkedin: 'from-blue-600 to-blue-800',
            threads: 'from-gray-700 to-black',
            snapchat: 'from-yellow-400 to-yellow-500',
            unknown: 'from-purple-500 to-indigo-600'
        };
        return colors[platform] || 'from-purple-500 to-indigo-600';
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
                        🎥 Extract Recipe from Social Video (AI-Powered)
                    </h3>
                    <p className="text-sm text-gray-600">
                        Extract recipes from TikTok, Instagram, and Facebook using advanced AI analysis
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
                                {getPlatformIcon(detectedPlatform)} {getPlatformName(detectedPlatform)} detected
                            </span>
                        )}
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="url"
                            id="video-url"
                            value={videoUrl}
                            onChange={handleUrlChange}
                            placeholder="Paste any social media URL (TikTok, Instagram, Facebook, Twitter, YouTube, Reddit, etc.)"
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
                        <strong>✨ AI-Powered:</strong> Works with videos from all supported platforms - no captions required!
                    </div>
                </div>

                {/* Error Display */}
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

                {/* Loading State */}
                {extracting && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                            <div className="text-blue-800">
                                <p className="font-medium text-sm">🤖 AI analyzing {getPlatformName(detectedPlatform)} video...</p>
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

                {/* Success State */}
                {extractionInfo && !extracting && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <div className="flex items-start">
                            <div className="text-green-500 mr-2 mt-0.5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-green-800 font-medium text-sm">
                                    🎉 {getPlatformName(extractionInfo.platform)} Recipe Successfully Extracted!
                                </p>
                                <div className="text-green-700 text-xs mt-2 space-y-1">
                                    <p>✅ <strong>Title:</strong> {extractionInfo.title}</p>
                                    <p>🥕 <strong>Ingredients:</strong> {extractionInfo.ingredients} items</p>
                                    <p>📋 <strong>Instructions:</strong> {extractionInfo.instructions} steps</p>
                                    {extractionInfo.hasTimestamps && (
                                        <p>🎥 <strong>Video Features:</strong> Timestamps and video links included</p>
                                    )}
                                    <p>🤖 <strong>Method:</strong> {extractionInfo.extractionMethod}</p>
                                    {extractionInfo.videoDuration && (
                                        <p>⏱️ <strong>Video Duration:</strong> {Math.round(extractionInfo.videoDuration / 60)} minutes</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Help Section */}
                {!extracting && !extractionInfo && !error && (
                    <details className="mt-4">
                        <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                            📖 How does AI video extraction work? (All Platforms)
                        </summary>
                        <div className="mt-3 text-xs text-gray-500 space-y-2 pl-4 border-l-2 border-gray-200">
                            <p>
                                <strong>🤖 AI-Powered Processing:</strong> We extract audio from social media videos and use advanced
                                AI to identify ingredients, instructions, and cooking techniques across all supported platforms.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                                <div className="bg-pink-50 p-2 rounded">
                                    <p><strong>🎵 TikTok:</strong></p>
                                    <ul className="list-disc list-inside text-xs mt-1">
                                        <li>Full audio + video analysis</li>
                                        <li>Perfect for quick recipes</li>
                                        <li>15-45 second processing</li>
                                    </ul>
                                </div>
                                <div className="bg-purple-50 p-2 rounded">
                                    <p><strong>📸 Instagram:</strong></p>
                                    <ul className="list-disc list-inside text-xs mt-1">
                                        <li>Reels & posts supported</li>
                                        <li>Audio + text extraction</li>
                                        <li>20-60 second processing</li>
                                    </ul>
                                </div>
                                <div className="bg-blue-50 p-2 rounded">
                                    <p><strong>👥 Facebook:</strong></p>
                                    <ul className="list-disc list-inside text-xs mt-1">
                                        <li>Public videos supported</li>
                                        <li>Share button integration</li>
                                        <li>30-90 second processing</li>
                                    </ul>
                                </div>
                            </div>
                            <p>
                                <strong>📺 YouTube Videos:</strong> Not supported for direct video extraction. Instead, copy the
                                video transcript/captions and use the <strong>📋 Text Paste</strong> option - it works even better
                                than video processing!
                            </p>
                            <p>
                                <strong>✨ Best Results:</strong> Videos with clear speech, ingredient mentions, and
                                step-by-step cooking instructions work great across all supported platforms.
                            </p>
                            <div className="mt-2 bg-green-50 border border-green-200 rounded p-2">
                                <strong>🌟 Recommended sources:</strong><br/>
                                • TikTok: @gordonramsayofficial, @cookingwithlynja<br/>
                                • Instagram: @tasty, @buzzfeedtasty<br/>
                                • Facebook: Public cooking pages and viral recipe videos<br/>
                                • YouTube: Any cooking channel → copy transcript → use Text Paste ✨
                            </div>
                            <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2">
                                <strong>🚀 Share Button Integration:</strong> All three platforms (TikTok, Instagram, Facebook)
                                support direct sharing to our app! Just use the share button in the mobile app and select
                                our recipe app for instant import.
                            </div>
                        </div>
                    </details>
                )}
            </div>
        </div>
    );
}