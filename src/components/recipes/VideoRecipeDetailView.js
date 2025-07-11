'use client';

// file: /src/components/recipes/VideoRecipeDetailView.js - Schema Compatible

import { useState } from 'react';

export default function VideoRecipeDetailView({ recipe }) {
    const [activeTab, setActiveTab] = useState('ingredients');
    const [showAllTimestamps, setShowAllTimestamps] = useState(false);

    // Check for video source using schema structure
    const hasVideoSource = recipe.videoMetadata?.videoSource && recipe.videoMetadata?.videoPlatform;

    // Check for timestamps in schema format (videoTimestamp in instructions, ingredients can have them too)
    const hasTimestamps = recipe.ingredients?.some(i => i.videoTimestamp) ||
        recipe.instructions?.some(i => i.videoTimestamp);

    const formatTime = (seconds) => {
        if (!seconds) return '';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getVideoPlatformIcon = (platform) => {
        switch (platform?.toLowerCase()) {
            case 'youtube':
                return '📺';
            case 'tiktok':
                return '🎵';
            case 'instagram':
                return '📸';
            default:
                return '🎥';
        }
    };

    const getVideoPlatformColor = (platform) => {
        switch (platform?.toLowerCase()) {
            case 'youtube':
                return 'from-red-50 to-orange-50 border-red-200';
            case 'tiktok':
                return 'from-pink-50 to-purple-50 border-pink-200';
            case 'instagram':
                return 'from-purple-50 to-pink-50 border-purple-200';
            default:
                return 'from-gray-50 to-blue-50 border-gray-200';
        }
    };

    const formatVideoDuration = (seconds) => {
        if (!seconds) return '';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getPlatformDisplayName = (platform) => {
        switch (platform?.toLowerCase()) {
            case 'youtube':
                return 'YouTube';
            case 'tiktok':
                return 'TikTok';
            case 'instagram':
                return 'Instagram';
            default:
                return 'Video';
        }
    };

    // Get timestamped items using schema structure
    const timestampedIngredients = recipe.ingredients?.filter(i => i.videoTimestamp) || [];
    const timestampedInstructions = recipe.instructions?.filter(i => i.videoTimestamp) || [];

    return (
        <div className="space-y-6">
            {/* Video Source Header - Using schema structure */}
            {hasVideoSource && (
                <div className={`bg-gradient-to-r ${getVideoPlatformColor(recipe.videoMetadata.videoPlatform)} border rounded-lg p-6`}>
                    <div className="flex items-start justify-between flex-col sm:flex-row gap-4">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-4 shadow-sm">
                                <span className="text-2xl">{getVideoPlatformIcon(recipe.videoMetadata.videoPlatform)}</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    🎥 {getPlatformDisplayName(recipe.videoMetadata.videoPlatform)} Recipe
                                    {recipe.videoMetadata.socialMediaOptimized && (
                                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                            Social Media Optimized
                                        </span>
                                    )}
                                </h3>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>Extracted from {getPlatformDisplayName(recipe.videoMetadata.videoPlatform)}
                                        {recipe.videoMetadata.extractionMethod && (
                                            <span className="ml-1">• {recipe.videoMetadata.extractionMethod}</span>
                                        )}
                                    </p>
                                    {recipe.videoMetadata.videoDuration && (
                                        <p>Video duration: {formatVideoDuration(recipe.videoMetadata.videoDuration)}</p>
                                    )}
                                    {hasTimestamps && (
                                        <p>{timestampedIngredients.length + timestampedInstructions.length} timestamped items</p>
                                    )}
                                    {recipe.videoMetadata.transcriptLength && (
                                        <p className="text-xs text-gray-500">
                                            Processed {recipe.videoMetadata.transcriptLength} characters of transcript
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <a
                                href={recipe.videoMetadata.videoSource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white text-purple-600 px-4 py-2 rounded-lg border border-purple-300 hover:bg-purple-50 transition-colors flex items-center justify-center text-sm"
                            >
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8 5v10l7-5-7-5z"/>
                                </svg>
                                Watch Original Video
                            </a>
                            {hasTimestamps && (
                                <button
                                    onClick={() => setShowAllTimestamps(!showAllTimestamps)}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                >
                                    {showAllTimestamps ? 'Hide' : 'Show'} All Timestamps
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Video Features Summary */}
                    {hasTimestamps && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-purple-600">{timestampedIngredients.length}</div>
                                <div className="text-sm text-gray-600">Ingredients with timestamps</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-blue-600">{timestampedInstructions.length}</div>
                                <div className="text-sm text-gray-600">Instructions with timestamps</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {getVideoPlatformIcon(recipe.videoMetadata.videoPlatform)}
                                </div>
                                <div className="text-sm text-gray-600">Platform: {getPlatformDisplayName(recipe.videoMetadata.videoPlatform)}</div>
                            </div>
                        </div>
                    )}

                    {/* Social Media Optimization Notice */}
                    {recipe.videoMetadata.socialMediaOptimized && (
                        <div className="mt-4 bg-white rounded-lg p-3 border-l-4 border-purple-500">
                            <div className="flex items-center">
                                <span className="text-purple-600 mr-2">⚡</span>
                                <span className="text-sm text-gray-700">
                                    This recipe was optimized for {getPlatformDisplayName(recipe.videoMetadata.videoPlatform)} format using AI extraction
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Modal Processing Info */}
                    {recipe.videoMetadata.extractionMethod && recipe.videoMetadata.extractionMethod.includes('modal') && (
                        <div className="mt-4 bg-white rounded-lg p-3 border-l-4 border-blue-500">
                            <div className="flex items-center">
                                <span className="text-blue-600 mr-2">🤖</span>
                                <span className="text-sm text-gray-700">
                                    Processed using advanced AI video analysis • Modal serverless computing
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* All Timestamps View */}
            {hasTimestamps && showAllTimestamps && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        🕒 All Video Timestamps
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {[...timestampedIngredients.map(i => ({
                            type: 'ingredient',
                            timestamp: i.videoTimestamp,
                            text: `${i.amount} ${i.unit} ${i.name}`.trim(),
                            link: i.videoLink
                        })), ...timestampedInstructions.map(i => ({
                            type: 'instruction',
                            timestamp: i.videoTimestamp,
                            text: i.text || i.instruction,
                            link: i.videoLink
                        }))].sort((a, b) => a.timestamp - b.timestamp).map((item, index) => (
                            <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                                <div className="flex items-center">
                                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded mr-3">
                                        {formatTime(item.timestamp)}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded mr-3 ${
                                        item.type === 'ingredient'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {item.type}
                                    </span>
                                    <span className="text-sm text-gray-700">{item.text}</span>
                                </div>
                                {item.link && (
                                    <a
                                        href={item.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-600 hover:text-purple-800 text-xs flex items-center"
                                    >
                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M8 5v10l7-5-7-5z"/>
                                        </svg>
                                        Watch
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Enhanced Ingredients Section */}
            <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🥕 Ingredients
                    {timestampedIngredients.length > 0 && (
                        <span className="ml-2 text-sm text-purple-600">
                            ({timestampedIngredients.length} with video links)
                        </span>
                    )}
                </h3>
                <div className="space-y-3">
                    {recipe.ingredients?.map((ingredient, index) => (
                        <div key={index} className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                            ingredient.videoTimestamp ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                        }`}>
                            <div className="flex items-center">
                                <span className="text-gray-900">
                                    {ingredient.amount && `${ingredient.amount} `}
                                    {ingredient.unit && `${ingredient.unit} `}
                                    {ingredient.name}
                                </span>
                                {ingredient.optional && (
                                    <span className="ml-2 text-xs text-gray-500 italic">(optional)</span>
                                )}
                            </div>
                            {ingredient.videoTimestamp && ingredient.videoLink && (
                                <a
                                    href={ingredient.videoLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center text-purple-600 hover:text-purple-800 text-sm bg-white px-2 py-1 rounded border border-purple-300 hover:bg-purple-50 transition-colors"
                                    title={`Jump to ${formatTime(ingredient.videoTimestamp)} in video`}
                                >
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M8 5v10l7-5-7-5z"/>
                                    </svg>
                                    {formatTime(ingredient.videoTimestamp)}
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Enhanced Instructions Section */}
            <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    📋 Instructions
                    {timestampedInstructions.length > 0 && (
                        <span className="ml-2 text-sm text-purple-600">
                            ({timestampedInstructions.length} with video links)
                        </span>
                    )}
                </h3>
                <div className="space-y-4">
                    {recipe.instructions?.map((instruction, index) => {
                        // Handle schema format: {text, step, videoTimestamp, videoLink}
                        const instructionText = instruction.text || instruction.instruction;
                        const timestamp = instruction.videoTimestamp;
                        const videoLink = instruction.videoLink;

                        return (
                            <div key={index} className={`flex gap-4 p-4 rounded-lg ${
                                timestamp ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                            }`}>
                                <div className="flex-shrink-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                        timestamp ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-700'
                                    }`}>
                                        {instruction.step || index + 1}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-gray-900 leading-relaxed">{instructionText}</p>
                                    {timestamp && videoLink && (
                                        <div className="mt-2">
                                            <a
                                                href={videoLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm bg-white px-3 py-1 rounded-full border border-purple-300 hover:bg-purple-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M8 5v10l7-5-7-5z"/>
                                                </svg>
                                                Watch this step: {formatTime(timestamp)}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Video Recipe Benefits */}
            {hasVideoSource && (
                <div className={`bg-gradient-to-r ${getVideoPlatformColor(recipe.videoMetadata.videoPlatform)} border rounded-lg p-6`}>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        🌟 {getPlatformDisplayName(recipe.videoMetadata.videoPlatform)} Recipe Benefits
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                            <div className="flex items-center text-gray-800">
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Visual cooking techniques
                            </div>
                            <div className="flex items-center text-gray-800">
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                {hasTimestamps ? 'Jump to specific steps' : 'Follow along with video'}
                            </div>
                            <div className="flex items-center text-gray-800">
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                See ingredient preparation
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center text-gray-800">
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Learn proper timing
                            </div>
                            <div className="flex items-center text-gray-800">
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                {recipe.videoMetadata.videoPlatform === 'tiktok' && 'Quick, trendy recipes'}
                                {recipe.videoMetadata.videoPlatform === 'instagram' && 'Beautiful, shareable content'}
                                {recipe.videoMetadata.videoPlatform === 'youtube' && 'Detailed cooking tutorials'}
                                {!['tiktok', 'instagram', 'youtube'].includes(recipe.videoMetadata.videoPlatform) && 'Interactive cooking experience'}
                            </div>
                            <div className="flex items-center text-gray-800">
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                AI-powered extraction
                            </div>
                        </div>
                    </div>

                    {/* Platform-specific tips */}
                    {recipe.videoMetadata.videoPlatform === 'tiktok' && (
                        <div className="mt-4 bg-white rounded-lg p-3 border-l-4 border-pink-500">
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">🎵 TikTok Recipe:</span> This recipe is optimized for quick cooking - perfect for busy weeknights!
                                {recipe.videoMetadata.socialMediaOptimized && ' Extracted using AI analysis of TikTok audio.'}
                            </p>
                        </div>
                    )}
                    {recipe.videoMetadata.videoPlatform === 'instagram' && (
                        <div className="mt-4 bg-white rounded-lg p-3 border-l-4 border-purple-500">
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">📸 Instagram Recipe:</span> This recipe focuses on beautiful presentation - great for sharing!
                                {recipe.videoMetadata.socialMediaOptimized && ' Extracted using AI analysis of Instagram content.'}
                            </p>
                        </div>
                    )}
                    {recipe.videoMetadata.videoPlatform === 'youtube' && (
                        <div className="mt-4 bg-white rounded-lg p-3 border-l-4 border-red-500">
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">📺 YouTube Recipe:</span> Detailed tutorial with comprehensive instructions.
                                {recipe.videoMetadata.extractionMethod && recipe.videoMetadata.extractionMethod.includes('captions') && ' Extracted from video captions.'}
                                {recipe.videoMetadata.extractionMethod && recipe.videoMetadata.extractionMethod.includes('modal') && ' Extracted using AI audio analysis.'}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}