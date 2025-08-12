'use client';

// file: /src/app/recipes/import/page.js v2 - Enhanced with image extraction

import {useEffect, useState} from 'react';
import { useRouter } from 'next/navigation';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import EnhancedRecipeForm from '@/components/recipes/EnhancedRecipeForm';
import Footer from '@/components/legal/Footer';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiPost } from '@/lib/api-config';
import VideoImportLoadingModal from '@/components/recipes/VideoImportLoadingModal';
import KeyboardOptimizedInput from '@/components/forms/KeyboardOptimizedInput';

export default function ImportRecipePage() {
    const router = useRouter();
    const [importMethod, setImportMethod] = useState(''); // '', 'website', 'social', 'form'
    const [urlInput, setUrlInput] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [isVideoImporting, setIsVideoImporting] = useState(false);
    const [extractImages, setExtractImages] = useState(true); // NEW: Image extraction toggle
    const [videoImportProgress, setVideoImportProgress] = useState({
        stage: '',
        platform: '',
        message: ''
    });

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const videoUrl = urlParams.get('videoUrl');
        const source = urlParams.get('source');
        const platform = urlParams.get('platform');

        // Handle auto-import from share buttons
        if (videoUrl && source === 'share' && ['facebook', 'tiktok', 'instagram'].includes(platform)) {
            console.log(`📱 Auto-importing ${platform} video from share button:`, videoUrl);

            // Decode the URL
            const decodedVideoUrl = decodeURIComponent(videoUrl);

            // Set import method and URL
            setImportMethod('url');
            setUrlInput(decodedVideoUrl);

            // Clean up URL parameters immediately
            const cleanUrl = new URL(window.location);
            cleanUrl.searchParams.delete('videoUrl');
            cleanUrl.searchParams.delete('source');
            cleanUrl.searchParams.delete('platform');
            window.history.replaceState({}, '', cleanUrl);

            // Start the import after UI is ready
            const timer = setTimeout(() => {
                handleUrlImport();
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, []); // Empty dependency array - only run once on mount

    // Enhanced platform detection
    const detectPlatformFromUrl = (url) => {
        if (!url) return 'unknown';
        const urlLower = url.toLowerCase();

        // Existing social media platforms
        if (urlLower.includes('tiktok.com') || urlLower.includes('vm.tiktok.com')) return 'tiktok';
        if (urlLower.includes('instagram.com')) return 'instagram';
        if (urlLower.includes('facebook.com') || urlLower.includes('fb.com') || urlLower.includes('fb.watch')) return 'facebook';

        // NEW: Additional video platforms
        if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
        if (urlLower.includes('reddit.com') || urlLower.includes('redd.it')) return 'reddit';
        if (urlLower.includes('bsky.app') || urlLower.includes('bluesky.app')) return 'bluesky';
        if (urlLower.includes('pinterest.com')) return 'pinterest';
        if (urlLower.includes('snapchat.com')) return 'snapchat';

        // Direct video files
        if (urlLower.match(/\.(mp4|mov|avi|mkv|webm)(\?|$)/)) return 'direct_video';

        // Recipe websites
        if (urlLower.includes('allrecipes.com')) return 'allrecipes';
        if (urlLower.includes('foodnetwork.com')) return 'foodnetwork';
        if (urlLower.includes('epicurious.com')) return 'epicurious';

        // Generic video platform detection
        if (urlLower.includes('video') || urlLower.includes('watch') || urlLower.includes('play')) {
            return 'generic_video';
        }

        // Recipe website patterns
        if (urlLower.includes('recipe') || urlLower.includes('cook') || urlLower.includes('food')) {
            return 'website';
        }

        return 'unknown';
    };

    const isVideoUrl = (url) => {
        const videoPatterns = [
            // Existing social media
            /tiktok\.com\/@[^\/]+\/video\/\d+/,
            /tiktok\.com\/t\/[a-zA-Z0-9]+/,
            /vm\.tiktok\.com\/[a-zA-Z0-9]+/,
            /instagram\.com\/reel\/[a-zA-Z0-9_-]+/,
            /instagram\.com\/p\/[a-zA-Z0-9_-]+/,
            /instagram\.com\/tv\/[a-zA-Z0-9_-]+/,
            /facebook\.com\/watch\?v=\d+/,
            /facebook\.com\/[^\/]+\/videos\/\d+/,
            /fb\.watch\/[a-zA-Z0-9_-]+/,
            /facebook\.com\/share\/r\/[a-zA-Z0-9_-]+/,
            /facebook\.com\/reel\/\d+/,

            // NEW: Additional video platforms
            /(twitter\.com|x\.com)\/[^\/]+\/status\/\d+/,  // Twitter/X posts
            /youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/,       // YouTube videos
            /youtu\.be\/[a-zA-Z0-9_-]+/,                   // YouTube short links
            /youtube\.com\/shorts\/[a-zA-Z0-9_-]+/,        // YouTube Shorts
            /reddit\.com\/r\/[^\/]+\/comments\/[a-zA-Z0-9]+/, // Reddit posts
            /redd\.it\/[a-zA-Z0-9]+/,                      // Reddit short links
            /pinterest\.com\/pin\/\d+/,                    // Pinterest pins

            // Direct video files
            /\.(mp4|mov|avi|mkv|webm)(\?|$)/i,

            // Generic video patterns
            /\/watch[\?\/]/,
            /\/video[\?\/]/,
            /\/play[\?\/]/,
            /\/v\/[a-zA-Z0-9_-]+/
        ];

        return videoPatterns.some(pattern => pattern.test(url));
    };

    const handleUrlImport = async () => {
        if (!urlInput.trim()) {
            setImportError('Please enter a valid URL');
            return;
        }

        setIsImporting(true);
        setImportError('');

        try {
            const trimmedUrl = urlInput.trim();
            const platform = detectPlatformFromUrl(trimmedUrl);
            const isVideo = isVideoUrl(trimmedUrl);

            console.log('🔍 Enhanced import analysis:', { platform, isVideo, url: trimmedUrl, extractImages });

            if (isVideo) {
                // Handle ANY video extraction using single endpoint
                console.log(`🎥 Processing ${platform} video with image extraction: ${extractImages}...`);
                await handleUniversalVideoImport(trimmedUrl, platform);
            } else {
                // Handle website recipe scraping
                console.log('🌐 Processing website recipe...');
                await handleWebsiteImport(trimmedUrl);
            }
        } catch (error) {
            console.error('Import error:', error);
            setImportError(error.message || 'Import failed');
        } finally {
            setIsImporting(false);
        }
    };

    const handleUniversalVideoImport = async (url, platform) => {
        setIsVideoImporting(true);
        setVideoImportProgress({
            stage: 'connecting',
            platform: platform,
            message: `🔗 Connecting to ${getPlatformName(platform)}...`
        });

        try {
            // Update progress with platform-specific messages
            setVideoImportProgress({
                stage: 'downloading',
                platform: platform,
                message: `📥 Analyzing ${getPlatformName(platform)} content...`
            });

            // SIMPLIFIED: Use single endpoint for ALL platforms
            const response = await apiPost('/api/recipes/video-extract', {
                video_url: url,
                platform: platform,
                analysis_type: 'ai_vision_enhanced',
                extract_image: extractImages
            });

            setVideoImportProgress({
                stage: 'processing',
                platform: platform,
                message: `🤖 AI analyzing ${getPlatformName(platform)} content${extractImages ? ' and extracting image' : ''}...`
            });

            const data = await response.json();

            if (data.success) {
                setVideoImportProgress({
                    stage: 'complete',
                    platform: platform,
                    message: `✅ ${getPlatformName(platform)} recipe extraction complete!`
                });

                // Log image extraction results
                if (extractImages && data.recipe.extractedImage) {
                    console.log('📸 Image successfully extracted from video');
                } else if (extractImages) {
                    console.log('📸 Image extraction was attempted but no image was extracted');
                }

                // Navigate to add page with the extracted recipe data
                setTimeout(() => {
                    router.push(`/recipes/add?imported=true&source=${platform}&data=${encodeURIComponent(JSON.stringify(data.recipe))}`);
                }, 2000);
            } else {
                throw new Error(data.error || `Failed to extract recipe from ${getPlatformName(platform)} content`);
            }
        } catch (error) {
            console.error(`${platform} video import error:`, error);
            setImportError(`${getPlatformName(platform)} content extraction failed: ${error.message}`);
        } finally {
            setTimeout(() => {
                setIsVideoImporting(false);
                setVideoImportProgress({ stage: '', platform: '', message: '' });
            }, 3000);
        }
    };

    const handleWebsiteImport = async (url) => {
        try {
            const response = await apiPost('/api/recipes/scrape', { url });
            const data = await response.json();

            if (data.success) {
                // Navigate to add page with the scraped recipe data
                router.push(`/recipes/add?imported=true&source=website&data=${encodeURIComponent(JSON.stringify(data.recipe))}`);
            } else {
                throw new Error(data.error || 'Failed to import recipe from website');
            }
        } catch (error) {
            throw new Error(`Website import failed: ${error.message}`);
        }
    };

    const handleRecipeSubmit = async (recipeData) => {
        try {
            console.log('🎯 Importing recipe:', recipeData);

            const response = await apiPost('/api/recipes', {
                recipeData
            });

            const data = await response.json();

            if (data.success) {
                console.log('✅ Recipe imported successfully:', data.recipe._id);
                router.push(`/recipes/${data.recipe._id}`);
            } else {
                console.error('Recipe import failed:', data.error);
            }
        } catch (error) {
            console.error('Error importing recipe:', error);
        }
    };

    const handleCancel = () => {
        router.push('/recipes');
    };

    const getPlatformIcon = (platform) => {
        const icons = {
            // Existing platforms
            tiktok: '🎵',
            instagram: '📸',
            facebook: '👥',
            allrecipes: '🍳',
            foodnetwork: '📺',
            epicurious: '⭐',

            // NEW: Additional platforms
            twitter: '🐦',
            bluesky: '🦋',
            youtube: '📺',
            reddit: '🤖',
            pinterest: '📌',
            snapchat: '👻',
            direct_video: '🎬',
            generic_video: '🎥',

            // Fallbacks
            website: '🌐',
            unknown: '🔗'
        };
        return icons[platform] || icons.website;
    };

    const getPlatformName = (platform) => {
        const names = {
            // Existing platforms
            tiktok: 'TikTok',
            instagram: 'Instagram',
            facebook: 'Facebook',
            allrecipes: 'AllRecipes',
            foodnetwork: 'Food Network',
            epicurious: 'Epicurious',

            // NEW: Additional platforms
            twitter: 'Twitter/X',
            bluesky: 'Bluesky',
            youtube: 'YouTube',
            reddit: 'Reddit',
            pinterest: 'Pinterest',
            snapchat: 'Snapchat',
            direct_video: 'Direct Video',
            generic_video: 'Video Platform',

            // Fallbacks
            website: 'Recipe Website',
            unknown: 'Website'
        };
        return names[platform] || 'Website';
    };

    const detectedPlatform = detectPlatformFromUrl(urlInput);
    const isVideo = isVideoUrl(urlInput);

    return (
        <MobileOptimizedLayout>
            <VideoImportLoadingModal
                isVisible={isVideoImporting}
                platform={videoImportProgress.platform || 'facebook'}
                stage={videoImportProgress.stage || 'processing'}
                message={videoImportProgress.message || 'Processing video...'}
                videoUrl={urlInput}
                onComplete={() => {}}
                style={{zIndex: 9999}}
            />

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Import-specific header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="text-4xl">🎯</div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Import Recipe
                            </h1>
                            <p className="text-gray-600">
                                Import from social media, websites, or enhance with AI nutrition analysis
                            </p>
                        </div>
                    </div>

                    {/* Enhanced import method highlights */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl mb-2">🎥</div>
                                <h3 className="font-semibold text-purple-900">Social Media + AI</h3>
                                <p className="text-sm text-purple-700">TikTok, Instagram, Facebook</p>
                                <p className="text-xs text-purple-600 mt-1">With automatic image extraction</p>
                            </div>
                            <div>
                                <div className="text-2xl mb-2">🌐</div>
                                <h3 className="font-semibold text-blue-900">Recipe Websites</h3>
                                <p className="text-sm text-blue-700">AllRecipes, Food Network, etc.</p>
                                <p className="text-xs text-blue-600 mt-1">With existing recipe images</p>
                            </div>
                            <div>
                                <div className="text-2xl mb-2">🤖</div>
                                <h3 className="font-semibold text-green-900">AI Enhancement</h3>
                                <p className="text-sm text-green-700">Comprehensive nutrition analysis</p>
                                <p className="text-xs text-green-600 mt-1">Smart image processing</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Import Method Selection */}
                {!importMethod && (
                    <div className="bg-white shadow rounded-lg p-6 mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">
                            Choose Import Method
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <TouchEnhancedButton
                                onClick={() => setImportMethod('url')}
                                className="p-6 border-2 border-gray-200 rounded-lg text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                            >
                                <div className="text-3xl mb-3">🔗</div>
                                <h3 className="font-semibold text-gray-900 mb-2">Import from URL</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                    Paste any recipe URL - we'll automatically detect if it's from social media or a recipe website
                                </p>
                                <div className="text-xs text-gray-500">
                                    <div className="mb-1"><strong>Social Media:</strong> TikTok, Instagram, Facebook (with AI image extraction)</div>
                                    <div><strong>Websites:</strong> AllRecipes, Food Network, Epicurious, etc.</div>
                                </div>
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => setImportMethod('form')}
                                className="p-6 border-2 border-gray-200 rounded-lg text-left hover:border-green-300 hover:bg-green-50 transition-colors"
                            >
                                <div className="text-3xl mb-3">📝</div>
                                <h3 className="font-semibold text-gray-900 mb-2">Manual Import</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                    Use our enhanced recipe form with text parsing, image upload, and AI nutrition analysis
                                </p>
                                <div className="text-xs text-gray-500">
                                    <div className="mb-1"><strong>Features:</strong> Text paste parsing, URL import, manual entry, image upload</div>
                                    <div><strong>AI:</strong> Complete nutrition analysis included</div>
                                </div>
                            </TouchEnhancedButton>
                        </div>
                    </div>
                )}

                {/* URL Import Method */}
                {importMethod === 'url' && (
                    <div className="bg-white shadow rounded-lg p-6 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">
                                🔗 Import from URL
                            </h2>
                            <TouchEnhancedButton
                                onClick={() => setImportMethod('')}
                                className="text-gray-600 hover:text-gray-800"
                            >
                                ← Back to Methods
                            </TouchEnhancedButton>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Recipe URL
                                    {urlInput && detectedPlatform !== 'unknown' && (
                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
        {getPlatformIcon(detectedPlatform)} {getPlatformName(detectedPlatform)} detected
                                            {isVideo && ' (Video)'}
    </span>
                                    )}
                                </label>
                                <div className="flex gap-3">
                                    <KeyboardOptimizedInput
                                        type="url"
                                        value={urlInput}
                                        onChange={(e) => {
                                            setUrlInput(e.target.value);
                                            setImportError('');
                                        }}
                                        placeholder="Paste TikTok, Instagram, Facebook, or recipe website URL..."
                                        className="flex-1 px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        style={{minHeight: '48px'}}
                                        disabled={isImporting}
                                    />
                                    <TouchEnhancedButton
                                        onClick={handleUrlImport}
                                        disabled={!urlInput.trim() || isImporting}
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2 min-h-[48px]"
                                    >
                                        {isImporting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                {isVideo ? 'Extracting...' : 'Importing...'}
                                            </>
                                        ) : (
                                            <>
                                                {isVideo ? '🤖 Extract Recipe' : '🌐 Import Recipe'}
                                            </>
                                        )}
                                    </TouchEnhancedButton>
                                </div>
                            </div>

                            {/* NEW: Image Extraction Toggle for Social Media */}
                            {isVideo && urlInput && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium text-purple-900">📸 AI Image Extraction</h4>
                                            <p className="text-xs text-purple-700 mt-1">
                                                Automatically extract the best food image from the video using AI
                                            </p>
                                        </div>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={extractImages}
                                                onChange={(e) => setExtractImages(e.target.checked)}
                                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                                disabled={isImporting}
                                            />
                                            <span className="ml-2 text-sm text-purple-900">
                                                {extractImages ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </label>
                                    </div>
                                    {extractImages && (
                                        <div className="mt-3 text-xs text-purple-600">
                                            ✨ AI will analyze video frames and select the most appetizing image for your recipe
                                        </div>
                                    )}
                                </div>
                            )}

                            {importError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="text-sm text-red-800">
                                        <strong>Import Failed:</strong> {importError}
                                    </div>
                                </div>
                            )}

                            {/* Platform-specific help */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="text-sm text-blue-800">
                                    <strong>✨ Universal Video Support:</strong>
                                    <div className="mt-2 text-xs">
                                        <div className="mb-3">
                                            <strong>🎥 All Video Platforms (Single AI Endpoint):</strong>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mt-1 ml-2">
                                                <span>• TikTok cooking videos</span>
                                                <span>• Instagram Reels & posts</span>
                                                <span>• Facebook cooking videos</span>
                                                <span>• Twitter/X cooking posts</span>
                                                <span>• YouTube cooking videos</span>
                                                <span>• YouTube Shorts</span>
                                                <span>• Reddit video posts</span>
                                                <span>• Bluesky cooking posts</span>
                                                <span>• Direct video files</span>
                                            </div>
                                        </div>
                                        <div>
                                            <strong>🌐 Recipe Websites:</strong>
                                            <div className="ml-2 mt-1">
                                                AllRecipes, Food Network, Epicurious, recipe blogs, Pinterest pins
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs bg-green-100 text-green-800 p-2 rounded">
                                        ✨ <strong>New:</strong> All video platforms now use the same intelligent AI extraction with automatic image processing!
                                    </div>
                                </div>
                            </div>

                            {/* URL Analysis Preview */}
                            {urlInput && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl">
                                            {getPlatformIcon(detectedPlatform)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">
                                                {getPlatformName(detectedPlatform)}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {isVideo
                                                    ? `AI video analysis + ${extractImages ? 'image extraction' : 'recipe extraction'} will be used`
                                                    : 'Website scraping will be used'
                                                }
                                            </div>
                                            {/* NEW: Show additional platform info */}
                                            {detectedPlatform === 'twitter' && (
                                                <div className="text-xs text-blue-600 mt-1">
                                                    ⚡ Twitter/X posts with cooking videos will be analyzed for recipe content
                                                </div>
                                            )}
                                            {detectedPlatform === 'bluesky' && (
                                                <div className="text-xs text-blue-600 mt-1">
                                                    🦋 Bluesky posts with cooking content will be analyzed for recipe information
                                                </div>
                                            )}
                                            {detectedPlatform === 'youtube' && (
                                                <div className="text-xs text-red-600 mt-1">
                                                    📺 YouTube cooking videos & Shorts supported (may take longer)
                                                </div>
                                            )}
                                            {detectedPlatform === 'reddit' && (
                                                <div className="text-xs text-orange-600 mt-1">
                                                    🤖 Reddit cooking posts with videos will be processed
                                                </div>
                                            )}
                                            {detectedPlatform === 'direct_video' && (
                                                <div className="text-xs text-green-600 mt-1">
                                                    🎬 Direct video file - will be analyzed for cooking content
                                                </div>
                                            )}
                                            {detectedPlatform === 'generic_video' && (
                                                <div className="text-xs text-purple-600 mt-1">
                                                    🎥 Generic video platform detected - will attempt extraction
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Enhanced Form Method */}
                {importMethod === 'form' && (
                    <EnhancedRecipeForm
                        onSubmit={handleRecipeSubmit}
                        onCancel={handleCancel}
                        isEditing={false}
                        isImportMode={true}
                        showAdvancedNutrition={true}
                    />
                )}

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}