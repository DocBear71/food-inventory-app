'use client';

// file: /src/app/recipes/import/page.js v3 - Universal platform support with enhanced page scraping

import {useEffect, useState} from 'react';
import { useRouter } from 'next/navigation';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import EnhancedRecipeForm from '@/components/recipes/EnhancedRecipeForm';
import Footer from '@/components/legal/Footer';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiPost } from '@/lib/api-config';
import VideoImportLoadingModal from '@/components/recipes/VideoImportLoadingModal';
import {
    NativeTextInput,
    ValidationPatterns
} from '@/components/forms/NativeIOSFormComponents';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export default function ImportRecipePage() {
    const router = useRouter();
    const [importMethod, setImportMethod] = useState(''); // '', 'website', 'social', 'form'
    const [urlInput, setUrlInput] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [isVideoImporting, setIsVideoImporting] = useState(false);
    const [extractImages, setExtractImages] = useState(true);
    const [processingMethod, setProcessingMethod] = useState('page_scraping_first'); // NEW: Processing method preference
    const [videoImportProgress, setVideoImportProgress] = useState({
        stage: '',
        platform: '',
        message: ''
    });

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);

        // Handle different parameter names from different platforms
        const videoUrl = urlParams.get('videoUrl') ||
            urlParams.get('url') ||
            urlParams.get('link') ||
            urlParams.get('text'); // iOS sometimes uses 'text' parameter

        const source = urlParams.get('source') || 'share';
        const platform = urlParams.get('platform');
        const title = urlParams.get('title');

        // Enhanced auto-import detection for universal sharing
        if (videoUrl && (source === 'share' || title || urlParams.has('url'))) {
            console.log(`📱 Auto-importing content from share:`, {
                url: videoUrl,
                platform: platform || 'auto-detect',
                source,
                title
            });

            // Decode the URL if it's encoded
            const decodedVideoUrl = decodeURIComponent(videoUrl);

            // Only proceed if it looks like a valid URL
            if (decodedVideoUrl.startsWith('http')) {
                setImportMethod('url');
                setUrlInput(decodedVideoUrl);

                // Clean up URL parameters
                const cleanUrl = new URL(window.location);
                ['videoUrl', 'url', 'link', 'text', 'source', 'platform', 'title'].forEach(param => {
                    cleanUrl.searchParams.delete(param);
                });
                window.history.replaceState({}, '', cleanUrl);

                // Start the import
                const timer = setTimeout(() => {
                    handleUrlImport();
                }, 1000);

                return () => clearTimeout(timer);
            }
        }
    }, []);

    // ENHANCED: Universal platform detection
    const detectPlatformFromUrl = (url) => {
        if (!url) return 'unknown';
        const urlLower = url.toLowerCase();

        // Social media platforms with recipe content - ENHANCED with better pattern matching
        if (urlLower.includes('tiktok.com') || urlLower.includes('vm.tiktok.com')) return 'tiktok';
        if (urlLower.includes('instagram.com')) return 'instagram';
        if (urlLower.includes('facebook.com') || urlLower.includes('fb.com') || urlLower.includes('fb.watch')) return 'facebook';

        // ENHANCED: Additional social platforms
        if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
        if (urlLower.includes('reddit.com') || urlLower.includes('redd.it')) return 'reddit';
        if (urlLower.includes('bsky.app') || urlLower.includes('bluesky.app')) return 'bluesky';
        if (urlLower.includes('pinterest.com')) return 'pinterest';
        if (urlLower.includes('snapchat.com')) return 'snapchat';
        if (urlLower.includes('linkedin.com')) return 'linkedin';
        if (urlLower.includes('threads.net')) return 'threads';

        // Direct video files
        if (urlLower.match(/\.(mp4|mov|avi|mkv|webm)(\?|$)/)) return 'direct_video';

        // Recipe websites
        if (urlLower.includes('allrecipes.com')) return 'allrecipes';
        if (urlLower.includes('foodnetwork.com')) return 'foodnetwork';
        if (urlLower.includes('epicurious.com')) return 'epicurious';

        // Generic patterns
        if (urlLower.includes('video') || urlLower.includes('watch') || urlLower.includes('play')) {
            return 'generic_video';
        }
        if (urlLower.includes('recipe') || urlLower.includes('cook') || urlLower.includes('food')) {
            return 'website';
        }

        return 'unknown';
    };

    // ENHANCED: Universal content detection (not just videos)
    const isContentUrl = (url) => {
        // Social media content patterns (includes text posts with recipe content)
        const contentPatterns = [
            // TikTok patterns - ENHANCED with www. support
            /(www\.)?tiktok\.com\/@[^\/]+\/video\/\d+(\?.*)?/,
            /(www\.)?tiktok\.com\/t\/[a-zA-Z0-9]+(\?.*)?/,  // ✅ NOW SUPPORTS query params
            /vm\.tiktok\.com\/[a-zA-Z0-9]+(\?.*)?/,
            /(www\.)?tiktok\.com\/.*?\/video\/\d+(\?.*)?/,

            // Instagram patterns - ENHANCED with www. support
            /(www\.)?instagram\.com\/reel\/[a-zA-Z0-9_-]+(\?.*)?/,
            /(www\.)?instagram\.com\/p\/[a-zA-Z0-9_-]+(\?.*)?/,  // ✅ NOW SUPPORTS ?igsh=... etc.
            /(www\.)?instagram\.com\/tv\/[a-zA-Z0-9_-]+(\?.*)?/,


            // Facebook patterns - ENHANCED with www. support
            /(www\.)?facebook\.com\/watch\/?\?v=\d+(&.*)?/,
            /(www\.)?facebook\.com\/[^\/]+\/videos\/\d+(\?.*)?/,
            /fb\.watch\/[a-zA-Z0-9_-]+(\?.*)?/,
            /(www\.)?facebook\.com\/share\/r\/[a-zA-Z0-9_-]+(\?.*)?/,
            /(www\.)?facebook\.com\/reel\/\d+(\?.*)?/,

            // ENHANCED: Social content patterns (includes text posts)
            /(www\.)?(twitter\.com|x\.com)\/[^\/]+\/status\/\d+/,  // Twitter/X posts (any content)
            /(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/,       // YouTube videos
            /youtu\.be\/[a-zA-Z0-9_-]+/,                           // YouTube short links
            /(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]+/,        // YouTube Shorts
            /(www\.)?reddit\.com\/r\/[^\/]+\/comments\/[a-zA-Z0-9]+/, // Reddit posts
            /redd\.it\/[a-zA-Z0-9]+/,                              // Reddit short links
            /(www\.)?pinterest\.com\/pin\/\d+/,                    // Pinterest pins
            /bsky\.app\/profile\/[^\/]+\/post\/[a-zA-Z0-9]+/,      // Bluesky posts
            /(www\.)?linkedin\.com\/posts\/[a-zA-Z0-9_-]+/,        // LinkedIn posts
            /threads\.net\/@[^\/]+\/post\/[a-zA-Z0-9]+/,           // Threads posts

            // Direct video files
            /\.(mp4|mov|avi|mkv|webm)(\?|$)/i,

            // Generic content patterns
            /\/post[\?\/]/,
            /\/status[\?\/]/,
            /\/watch[\?\/]/,
            /\/video[\?\/]/,
            /\/play[\?\/]/,
            /\/v\/[a-zA-Z0-9_-]+/
        ];

        return contentPatterns.some(pattern => pattern.test(url));
    };


    const handleUrlImport = async () => {
        if (!urlInput.trim()) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Missing URL',
                message: 'Please enter a valid URL to import from.'
            });
            return;
        }

        setIsImporting(true);
        setImportError('');

        try {
            const trimmedUrl = urlInput.trim();
            const platform = detectPlatformFromUrl(trimmedUrl);
            const isContent = isContentUrl(trimmedUrl);

            console.log('🔍 Enhanced import analysis:', {
                platform,
                isContent,
                url: trimmedUrl,
                extractImages,
                processingMethod
            });

            if (isContent || ['twitter', 'youtube', 'reddit', 'bluesky', 'pinterest', 'linkedin', 'threads'].includes(platform)) {
                // ENHANCED: Handle ANY content extraction using universal endpoint
                console.log(`🌟 Processing ${platform} content with universal extraction...`);
                await handleUniversalContentImport(trimmedUrl, platform);
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

    // ENHANCED: Universal content import (replaces video-specific import)
    const handleUniversalContentImport = async (url, platform) => {
        setIsVideoImporting(true);
        setVideoImportProgress({
            stage: 'connecting',
            platform: platform,
            message: `🔗 Connecting to ${getPlatformName(platform)}...`
        });

        try {
            // Update progress with platform-specific messages
            setVideoImportProgress({
                stage: 'analyzing',
                platform: platform,
                message: `📄 Analyzing ${getPlatformName(platform)} content...`
            });

            // ENHANCED: Use universal endpoint for ALL platforms
            const response = await apiPost('/api/recipes/video-extract', {
                video_url: url,
                platform: platform,
                analysis_type: processingMethod,
                extractImage: extractImages
            });

            setVideoImportProgress({
                stage: 'processing',
                platform: platform,
                message: `🤖 AI processing ${getPlatformName(platform)} content${extractImages ? ' and extracting images' : ''}...`
            });

            const data = await response.json();

            if (data.success) {
                setVideoImportProgress({
                    stage: 'complete',
                    platform: platform,
                    message: `✅ ${getPlatformName(platform)} recipe extraction complete!`
                });

                // Log extraction results
                if (data.extractionInfo) {
                    console.log('📊 Extraction info:', {
                        method: data.extractionInfo.method,
                        hasImage: data.extractionInfo.hasExtractedImage,
                        hasTimestamps: data.extractionInfo.hasTimestamps
                    });
                }

                // Navigate to add page with the extracted recipe data
                setTimeout(() => {
                    // Store recipe data in sessionStorage to avoid URL length limits
                    sessionStorage.setItem('importedRecipe', JSON.stringify(data.recipe));
                    router.push(`/recipes/add?imported=true&source=${platform}`);
                }, 2000);
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Extraction Failed',
                    message: data.error || `Failed to extract recipe from ${getPlatformName(platform)} content`
                });
                return;
            }
        } catch (error) {
            console.error('Import error:', error);
            setImportError(error.message);

            // CRITICAL: Reset the modal state
            setIsVideoImporting(false);
            setVideoImportProgress({ stage: '', platform: '', message: '' });
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
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Import Failed',
                    message: data.error || 'Failed to import recipe from website'
                });
                return;
            }
        } catch (error) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Import Failed',
                message:`Website import failed: ${error.message}`
            });
            return;
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

    const handleCancel = async () => {
        await NativeNavigation.routerPush(router, '/recipes');
    };

    // ENHANCED: Platform icons with new platforms
    const getPlatformIcon = (platform) => {
        const icons = {
            // Existing platforms
            tiktok: '🎵',
            instagram: '📸',
            facebook: '👥',
            allrecipes: '🍳',
            foodnetwork: '📺',
            epicurious: '⭐',

            // ENHANCED: New platforms
            twitter: '🐦',
            bluesky: '🦋',
            youtube: '📺',
            reddit: '🤖',
            pinterest: '📌',
            snapchat: '👻',
            linkedin: '💼',
            threads: '🧵',
            direct_video: '🎬',
            generic_video: '🎥',

            // Fallbacks
            website: '🌐',
            unknown: '🔗'
        };
        return icons[platform] || icons.website;
    };

    // ENHANCED: Platform names with new platforms
    const getPlatformName = (platform) => {
        const names = {
            // Existing platforms
            tiktok: 'TikTok',
            instagram: 'Instagram',
            facebook: 'Facebook',
            allrecipes: 'AllRecipes',
            foodnetwork: 'Food Network',
            epicurious: 'Epicurious',

            // ENHANCED: New platforms
            twitter: 'Twitter/X',
            bluesky: 'Bluesky',
            youtube: 'YouTube',
            reddit: 'Reddit',
            pinterest: 'Pinterest',
            snapchat: 'Snapchat',
            linkedin: 'LinkedIn',
            threads: 'Threads',
            direct_video: 'Direct Video',
            generic_video: 'Video Platform',

            // Fallbacks
            website: 'Recipe Website',
            unknown: 'Website'
        };
        return names[platform] || 'Website';
    };

    // ENHANCED: Processing method descriptions
    const getProcessingMethodInfo = (method) => {
        const methods = {
            'page_scraping_first': {
                name: 'Smart Extraction (Recommended)',
                description: 'Tries page content first, then video if needed',
                icon: '🧠',
                fast: true
            },
            'ai_vision_enhanced': {
                name: 'Video Analysis',
                description: 'Downloads and analyzes video content with AI',
                icon: '🤖',
                fast: false
            },
            'page_scraping_only': {
                name: 'Page Content Only',
                description: 'Extracts text content from the page only',
                icon: '📄',
                fast: true
            }
        };
        return methods[method] || methods['page_scraping_first'];
    };

    const detectedPlatform = detectPlatformFromUrl(urlInput);
    const isContent = isContentUrl(urlInput);
    const processingInfo = getProcessingMethodInfo(processingMethod);

    return (
        <MobileOptimizedLayout>
            <VideoImportLoadingModal
                isVisible={isVideoImporting}
                platform={videoImportProgress.platform || 'unknown'}
                stage={videoImportProgress.stage || 'processing'}
                message={videoImportProgress.message || 'Processing content...'}
                videoUrl={urlInput}
                onComplete={() => {}}
                style={{zIndex: 9999}}
            />

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* ENHANCED: Import-specific header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="text-4xl">🌟</div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Universal Recipe Import
                            </h1>
                            <p className="text-gray-600">
                                Import from ANY social platform, video, or website with AI-powered extraction
                            </p>
                        </div>
                    </div>

                    {/* ENHANCED: Universal import capabilities */}
                    <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 border border-purple-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl mb-2">🌐</div>
                                <h3 className="font-semibold text-purple-900">Universal Platform Support</h3>
                                <p className="text-sm text-purple-700">TikTok, Instagram, Facebook, Twitter/X, YouTube, Reddit, Pinterest, Bluesky, LinkedIn, Threads</p>
                                <p className="text-xs text-purple-600 mt-1">Smart page analysis + video fallback</p>
                            </div>
                            <div>
                                <div className="text-2xl mb-2">🧠</div>
                                <h3 className="font-semibold text-blue-900">Intelligent Processing</h3>
                                <p className="text-sm text-blue-700">Page scraping first, then video analysis</p>
                                <p className="text-xs text-blue-600 mt-1">Faster, more reliable extraction</p>
                            </div>
                            <div>
                                <div className="text-2xl mb-2">🤖</div>
                                <h3 className="font-semibold text-green-900">AI Enhancement</h3>
                                <p className="text-sm text-green-700">Complete nutrition analysis + image extraction</p>
                                <p className="text-xs text-green-600 mt-1">Professional recipe formatting</p>
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
                                <div className="text-3xl mb-3">🌟</div>
                                <h3 className="font-semibold text-gray-900 mb-2">Universal URL Import</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                    Paste ANY recipe URL - we automatically detect the platform and use the best extraction method
                                </p>
                                <div className="text-xs text-gray-500">
                                    <div className="mb-1"><strong>Social Media:</strong> TikTok, Instagram, Facebook, Twitter/X, YouTube, Reddit, Pinterest, Bluesky, LinkedIn, Threads</div>
                                    <div className="mb-1"><strong>Websites:</strong> AllRecipes, Food Network, Epicurious, recipe blogs</div>
                                    <div><strong>Smart Processing:</strong> Page content first, video analysis as fallback</div>
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

                {/* ENHANCED: Universal URL Import Method */}
                {importMethod === 'url' && (
                    <div className="bg-white shadow rounded-lg p-6 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">
                                🌟 Universal URL Import
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
                                            {isContent && ' (Content)'}
                                        </span>
                                    )}
                                </label>
                                <div className="flex gap-3">
                                    <NativeTextInput
                                        type="url"
                                        inputMode="url"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="https://example.com/recipe or video URL"
                                        autoComplete="url"
                                        validation={(value) => {
                                            if (!value) return { isValid: false, message: '' };
                                            try {
                                                new URL(value);
                                                return {
                                                    isValid: true,
                                                    message: 'URL looks good!'
                                                };
                                            } catch {
                                                return {
                                                    isValid: false,
                                                    message: 'Please enter a valid URL'
                                                };
                                            }
                                        }}
                                        errorMessage="Please enter a valid URL (e.g., https://example.com)"
                                        successMessage="URL looks good!"
                                    />
                                    <TouchEnhancedButton
                                        onClick={handleUrlImport}
                                        disabled={!urlInput.trim() || isImporting}
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2 min-h-[48px]"
                                    >
                                        {isImporting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Extracting...
                                            </>
                                        ) : (
                                            <>
                                                🌟 Extract Recipe
                                            </>
                                        )}
                                    </TouchEnhancedButton>
                                </div>
                            </div>

                            {/* ENHANCED: Processing Method Selection */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h4 className="text-sm font-medium text-blue-900">🧠 Processing Method</h4>
                                        <p className="text-xs text-blue-700 mt-1">
                                            Choose how you want to extract the recipe content
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {Object.entries({
                                        'page_scraping_first': getProcessingMethodInfo('page_scraping_first'),
                                        'ai_vision_enhanced': getProcessingMethodInfo('ai_vision_enhanced'),
                                        'page_scraping_only': getProcessingMethodInfo('page_scraping_only')
                                    }).map(([method, info]) => (
                                        <label key={method} className="flex items-center p-3 border rounded cursor-pointer hover:bg-blue-50">
                                            <input
                                                type="radio"
                                                name="processingMethod"
                                                value={method}
                                                checked={processingMethod === method}
                                                onChange={(e) => setProcessingMethod(e.target.value)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                disabled={isImporting}
                                            />
                                            <div className="ml-3 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">{info.icon}</span>
                                                    <span className="text-sm font-medium text-blue-900">{info.name}</span>
                                                    {info.fast && <span className="text-xs bg-green-100 text-green-800 px-1 rounded">Fast</span>}
                                                </div>
                                                <p className="text-xs text-blue-700 mt-1">{info.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* ENHANCED: Image Extraction Toggle */}
                            {isContent && urlInput && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium text-purple-900">📸 AI Image Extraction</h4>
                                            <p className="text-xs text-purple-700 mt-1">
                                                Automatically extract or generate the best food image using AI
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
                                            ✨ AI will analyze available content and create the most appetizing image for your recipe
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

                            {/* ENHANCED: Universal platform support info */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="text-sm text-blue-800">
                                    <strong>🌟 Universal Platform Support:</strong>
                                    <div className="mt-2 text-xs">
                                        <div className="mb-3">
                                            <strong>📱 Social Media Platforms:</strong>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mt-1 ml-2">
                                                <span>• TikTok (videos + text)</span>
                                                <span>• Instagram (posts + stories)</span>
                                                <span>• Facebook (videos + posts)</span>
                                                <span>• Twitter/X (all content)</span>
                                                <span>• YouTube (videos + descriptions)</span>
                                                <span>• Reddit (posts + comments)</span>
                                                <span>• Pinterest (pins + links)</span>
                                                <span>• Bluesky (posts)</span>
                                                <span>• LinkedIn (posts)</span>
                                                <span>• Threads (posts)</span>
                                                <span>• Snapchat (content)</span>
                                                <span>• Direct video files</span>
                                            </div>
                                        </div>
                                        <div>
                                            <strong>🌐 Recipe Websites:</strong>
                                            <div className="ml-2 mt-1">
                                                AllRecipes, Food Network, Epicurious, recipe blogs, cooking websites
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs bg-green-100 text-green-800 p-2 rounded">
                                        ✨ <strong>How it works:</strong> We first try to extract recipe content from the page (fast), then fall back to video analysis if needed. This gives you the best of both worlds!
                                    </div>
                                </div>
                            </div>

                            {/* ENHANCED: URL Analysis Preview */}
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
                                                {processingInfo.name} will be used
                                                {extractImages && ' with image extraction'}
                                            </div>

                                            {/* ENHANCED: Platform-specific extraction info */}
                                            {detectedPlatform === 'twitter' && (
                                                <div className="text-xs text-blue-600 mt-1">
                                                    🐦 Twitter/X posts will be analyzed for recipe content in text, images, and videos
                                                </div>
                                            )}
                                            {detectedPlatform === 'youtube' && (
                                                <div className="text-xs text-red-600 mt-1">
                                                    📺 YouTube descriptions will be extracted first, video analysis if needed
                                                </div>
                                            )}
                                            {detectedPlatform === 'reddit' && (
                                                <div className="text-xs text-orange-600 mt-1">
                                                    🤖 Reddit posts and top comments will be analyzed for recipe information
                                                </div>
                                            )}
                                            {detectedPlatform === 'pinterest' && (
                                                <div className="text-xs text-pink-600 mt-1">
                                                    📌 Pinterest pins and linked recipes will be processed
                                                </div>
                                            )}
                                            {detectedPlatform === 'bluesky' && (
                                                <div className="text-xs text-blue-600 mt-1">
                                                    🦋 Bluesky posts will be analyzed for cooking content and recipes
                                                </div>
                                            )}
                                            {detectedPlatform === 'linkedin' && (
                                                <div className="text-xs text-blue-600 mt-1">
                                                    💼 LinkedIn posts will be processed for professional cooking content
                                                </div>
                                            )}
                                            {detectedPlatform === 'threads' && (
                                                <div className="text-xs text-purple-600 mt-1">
                                                    🧵 Threads posts will be analyzed for recipe discussions and content
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