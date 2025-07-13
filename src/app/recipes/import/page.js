'use client';

import {useEffect, useState} from 'react';
import { useRouter } from 'next/navigation';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import EnhancedRecipeForm from '@/components/recipes/EnhancedRecipeForm';
import Footer from '@/components/legal/Footer';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiPost } from '@/lib/api-config';
import VideoImportLoadingModal from '@/components/recipes/VideoImportLoadingModal';

export default function ImportRecipePage() {
    const router = useRouter();
    const [importMethod, setImportMethod] = useState(''); // '', 'website', 'social', 'form'
    const [urlInput, setUrlInput] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [isVideoImporting, setIsVideoImporting] = useState(false);
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

        // Social media platforms
        if (urlLower.includes('tiktok.com')) return 'tiktok';
        if (urlLower.includes('instagram.com')) return 'instagram';
        if (urlLower.includes('facebook.com') || urlLower.includes('fb.com') || urlLower.includes('fb.watch')) return 'facebook';

        // Recipe websites
        if (urlLower.includes('allrecipes.com')) return 'allrecipes';
        if (urlLower.includes('foodnetwork.com')) return 'foodnetwork';
        if (urlLower.includes('epicurious.com')) return 'epicurious';

        // Default to website if it has common recipe site patterns
        if (urlLower.includes('recipe') || urlLower.includes('cook') || urlLower.includes('food')) {
            return 'website';
        }

        return 'website'; // Default assumption
    };

    const isSocialMediaUrl = (url) => {
        const socialPatterns = [
            // TikTok
            /tiktok\.com\/@[^\/]+\/video\/\d+/,
            /tiktok\.com\/t\/[a-zA-Z0-9]+/,
            /vm\.tiktok\.com\/[a-zA-Z0-9]+/,
            // Instagram
            /instagram\.com\/reel\/[a-zA-Z0-9_-]+/,
            /instagram\.com\/p\/[a-zA-Z0-9_-]+/,
            /instagram\.com\/tv\/[a-zA-Z0-9_-]+/,
            // Facebook
            /facebook\.com\/watch\?v=\d+/,
            /facebook\.com\/[^\/]+\/videos\/\d+/,
            /fb\.watch\/[a-zA-Z0-9_-]+/,
            /facebook\.com\/share\/r\/[a-zA-Z0-9_-]+/,
            /facebook\.com\/reel\/\d+/
        ];

        return socialPatterns.some(pattern => pattern.test(url));
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
            const isSocial = isSocialMediaUrl(trimmedUrl);

            console.log('🔍 Import analysis:', { platform, isSocial, url: trimmedUrl });

            if (isSocial) {
                // Handle social media video extraction
                console.log(`🎥 Processing ${platform} video...`);
                await handleVideoImport(trimmedUrl);
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

    const handleVideoImport = async (url) => {
        const platform = detectPlatformFromUrl(url);

        setIsVideoImporting(true);
        setVideoImportProgress({
            stage: 'connecting',
            platform: platform,
            message: `🔗 Connecting to ${platform.charAt(0).toUpperCase() + platform.slice(1)}...`
        });

        try {
            // Update progress messages with correct platform names
            setVideoImportProgress({
                stage: 'downloading',
                platform: platform,
                message: `📥 Downloading ${platform} video content...`
            });

            const response = await apiPost('/api/recipes/video-extract', {
                url: url,
                platform: platform, // Pass platform to API
                analysisType: 'ai_vision_enhanced'
            });

            setVideoImportProgress({
                stage: 'processing',
                platform: platform,
                message: `🤖 AI analyzing ${platform} video content...`
            });

            const data = await response.json();

            if (data.success) {
                setVideoImportProgress({
                    stage: 'complete',
                    platform: platform,
                    message: `✅ ${platform.charAt(0).toUpperCase() + platform.slice(1)} recipe extraction complete!`
                });

                // Navigate to add page with the extracted recipe data
                setTimeout(() => {
                    router.push(`/recipes/add?imported=true&source=${platform}&data=${encodeURIComponent(JSON.stringify(data.recipe))}`);
                }, 2000);
            } else {
                throw new Error(data.error || `Failed to extract recipe from ${platform} video`);
            }
        } catch (error) {
            console.error(`${platform} video import error:`, error);
            setImportError(`${platform.charAt(0).toUpperCase() + platform.slice(1)} video extraction failed: ${error.message}`);
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

            const response = await fetch('/api/recipes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(recipeData)
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
            tiktok: '🎵',
            instagram: '📸',
            facebook: '👥',
            allrecipes: '🍳',
            foodnetwork: '📺',
            epicurious: '⭐',
            website: '🌐',
            unknown: '🔗'
        };
        return icons[platform] || icons.website;
    };

    const getPlatformName = (platform) => {
        const names = {
            tiktok: 'TikTok',
            instagram: 'Instagram',
            facebook: 'Facebook',
            allrecipes: 'AllRecipes',
            foodnetwork: 'Food Network',
            epicurious: 'Epicurious',
            website: 'Recipe Website',
            unknown: 'Website'
        };
        return names[platform] || 'Website';
    };

    const detectedPlatform = detectPlatformFromUrl(urlInput);
    const isSocial = isSocialMediaUrl(urlInput);

    return (
        <MobileOptimizedLayout>
            <VideoImportLoadingModal
                isVisible={isVideoImporting}
                platform={videoImportProgress.platform}
                stage={videoImportProgress.stage}
                message={videoImportProgress.message}
                videoUrl={urlInput}
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

                    {/* Import method highlights */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl mb-2">🎥</div>
                                <h3 className="font-semibold text-purple-900">Social Media</h3>
                                <p className="text-sm text-purple-700">TikTok, Instagram, Facebook</p>
                            </div>
                            <div>
                                <div className="text-2xl mb-2">🌐</div>
                                <h3 className="font-semibold text-blue-900">Recipe Websites</h3>
                                <p className="text-sm text-blue-700">AllRecipes, Food Network, etc.</p>
                            </div>
                            <div>
                                <div className="text-2xl mb-2">🤖</div>
                                <h3 className="font-semibold text-green-900">AI Enhancement</h3>
                                <p className="text-sm text-green-700">Comprehensive nutrition analysis</p>
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
                                    <div className="mb-1"><strong>Social Media:</strong> TikTok, Instagram, Facebook</div>
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
                                    Use our enhanced recipe form with text parsing and AI nutrition analysis
                                </p>
                                <div className="text-xs text-gray-500">
                                    <div className="mb-1"><strong>Features:</strong> Text paste parsing, URL import, manual entry</div>
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
                                            {isSocial && ' (Video)'}
                                        </span>
                                    )}
                                </label>
                                <div className="flex gap-3">
                                    <input
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
                                                {isSocial ? 'Extracting...' : 'Importing...'}
                                            </>
                                        ) : (
                                            <>
                                                {isSocial ? '🤖 Extract Recipe' : '🌐 Import Recipe'}
                                            </>
                                        )}
                                    </TouchEnhancedButton>
                                </div>
                            </div>

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
                                    <strong>✨ Supported Sources:</strong>
                                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <strong>🎥 Social Media (AI Video Extraction):</strong>
                                            <ul className="list-disc list-inside ml-2 mt-1">
                                                <li>TikTok recipe videos</li>
                                                <li>Instagram Reels & posts</li>
                                                <li>Facebook cooking videos</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <strong>🌐 Recipe Websites:</strong>
                                            <ul className="list-disc list-inside ml-2 mt-1">
                                                <li>AllRecipes, Food Network</li>
                                                <li>Epicurious, Simply Recipes</li>
                                                <li>The Kitchn, Bon Appétit</li>
                                                <li>Most recipe blogs & sites</li>
                                            </ul>
                                        </div>
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
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {getPlatformName(detectedPlatform)}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {isSocial
                                                    ? 'AI video extraction will be used'
                                                    : 'Website scraping will be used'
                                                }
                                            </div>
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