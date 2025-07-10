'use client';

// file: /src/components/recipes/VideoImportSection.js - New component for video import

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiPost } from '@/lib/api-config';

export default function VideoImportSection({ onRecipeExtracted, disabled = false }) {
    const [videoUrl, setVideoUrl] = useState('');
    const [extracting, setExtracting] = useState(false);
    const [error, setError] = useState('');
    const [extractionInfo, setExtractionInfo] = useState(null);

    // Detect if URL is a video URL
    const isVideoUrl = (url) => {
        const videoPatterns = [
            /youtube\.com\/watch\?v=/,
            /youtu\.be\//,
            /tiktok\.com\/@[^/]+\/video\//,
            /instagram\.com\/reel\//,
            /instagram\.com\/p\//
        ];
        return videoPatterns.some(pattern => pattern.test(url));
    };

    const handleVideoExtraction = async () => {
        if (!videoUrl.trim()) {
            setError('Please enter a video URL');
            return;
        }

        if (!isVideoUrl(videoUrl)) {
            setError('Please enter a valid YouTube, TikTok, or Instagram video URL');
            return;
        }

        setExtracting(true);
        setError('');
        setExtractionInfo(null);

        try {
            console.log('🎥 Starting video extraction for:', videoUrl);

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
                    extractionMethod: data.extractionMethod,
                    hasTimestamps: data.recipe.ingredients.some(i => i.timestamp)
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

    const getSupportedPlatformsText = () => {
        return (
            <div className="text-xs text-gray-500 mt-1">
                <strong>Supported:</strong> YouTube (with captions), TikTok & Instagram (coming soon)
            </div>
        );
    };

    const getExampleUrls = () => {
        return (
            <div className="text-xs text-gray-400 mt-2">
                <strong>Examples:</strong><br/>
                • https://youtube.com/watch?v=dQw4w9WgXcQ<br/>
                • https://youtu.be/dQw4w9WgXcQ<br/>
                • https://tiktok.com/@user/video/123456<br/>
                • https://instagram.com/reel/ABC123/
            </div>
        );
    };

    return (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
                <div className="flex-shrink-0 mr-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        🎥 Extract Recipe from Video
                    </h3>
                    <p className="text-sm text-gray-600">
                        Import recipes directly from cooking videos using AI-powered extraction
                    </p>
                </div>
            </div>

            {/* Video URL Input */}
            <div className="space-y-4">
                <div>
                    <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 mb-2">
                        Video URL
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="url"
                            id="video-url"
                            value={videoUrl}
                            onChange={handleUrlChange}
                            placeholder="Paste YouTube, TikTok, or Instagram video URL here..."
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-sm"
                            disabled={disabled || extracting}
                            style={{ fontSize: '16px' }} // Prevent zoom on mobile
                        />
                        <TouchEnhancedButton
                            onClick={handleVideoExtraction}
                            disabled={disabled || extracting || !videoUrl.trim()}
                            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                                extracting
                                    ? 'bg-purple-300 text-white cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
                            }`}
                        >
                            {extracting ? (
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Extracting...
                                </div>
                            ) : (
                                'Extract Recipe'
                            )}
                        </TouchEnhancedButton>
                    </div>
                    {getSupportedPlatformsText()}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex items-start">
                            <div className="text-red-500 mr-2 mt-0.5">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="text-sm">
                                <p className="text-red-800 font-medium">Video Extraction Failed</p>
                                <p className="text-red-700 mt-1">{error}</p>
                                {error.includes('captions') && (
                                    <div className="mt-2 text-red-600">
                                        <p className="font-medium">Troubleshooting tips:</p>
                                        <ul className="list-disc list-inside mt-1 text-xs">
                                            <li>Try videos from popular cooking channels (they usually have good captions)</li>
                                            <li>Look for videos with the "CC" (closed captions) button</li>
                                            <li>YouTube auto-generates captions for most videos after upload</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Success/Extraction Info Display */}
                {extractionInfo && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <div className="flex items-start">
                            <div className="text-green-500 mr-3 mt-0.5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-green-800 font-medium text-sm">
                                    ✅ Recipe Successfully Extracted!
                                </h4>
                                <div className="text-green-700 text-sm mt-2 space-y-1">
                                    <p><strong>Title:</strong> {extractionInfo.title}</p>
                                    <p><strong>Platform:</strong> {extractionInfo.platform.charAt(0).toUpperCase() + extractionInfo.platform.slice(1)}</p>
                                    <p><strong>Found:</strong> {extractionInfo.ingredients} ingredients, {extractionInfo.instructions} instructions</p>
                                    <p><strong>Method:</strong> {extractionInfo.extractionMethod.replace('-', ' ')}</p>
                                    {extractionInfo.hasTimestamps && (
                                        <p className="text-green-600">
                                            <span className="inline-flex items-center">
                                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                </svg>
                                                Includes video timestamps for ingredients!
                                            </span>
                                        </p>
                                    )}
                                </div>
                                <div className="mt-3 text-xs text-green-600">
                                    The extracted recipe has been loaded into the form below. Review and edit as needed before saving.
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
                                <p className="font-medium text-sm">Extracting recipe from video...</p>
                                <p className="text-xs text-blue-600 mt-1">
                                    This may take 10-30 seconds depending on video length and platform
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 bg-blue-100 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                        </div>
                    </div>
                )}

                {/* Help Section */}
                {!extracting && !extractionInfo && !error && (
                    <details className="mt-4">
                        <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                            📖 How does video extraction work?
                        </summary>
                        <div className="mt-3 text-xs text-gray-500 space-y-2 pl-4 border-l-2 border-gray-200">
                            <p>
                                <strong>Phase 1 (Current):</strong> We extract the video's transcript/captions and use AI to identify ingredients, instructions, and cooking times.
                            </p>
                            <p>
                                <strong>Coming Soon:</strong> Advanced frame analysis will identify ingredients visually and provide even more accurate extraction.
                            </p>
                            <p>
                                <strong>Best Results:</strong> Use videos with clear speech, good captions, and structured recipe presentations.
                            </p>
                            {getExampleUrls()}
                        </div>
                    </details>
                )}
            </div>
        </div>
    );
}