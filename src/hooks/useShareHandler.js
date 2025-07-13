// File: src/hooks/useShareHandler.js - COMPLETE FIX
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export const useShareHandler = (onRecipeShare) => {
    useEffect(() => {
        let appUrlOpenListener;

        const setupShareHandling = async () => {
            if (Capacitor.isNativePlatform()) {
                // Handle app launch from share intent
                appUrlOpenListener = await App.addListener('appUrlOpen', (event) => {
                    console.log('📱 App opened with URL:', event.url);
                    handleSharedContent(event.url);
                });

                // Check if app was launched with intent
                const initialUrl = await App.getLaunchUrl();
                if (initialUrl?.url) {
                    console.log('📱 App launched with URL:', initialUrl.url);
                    handleSharedContent(initialUrl.url);
                }
            } else {
                // Web platform - listen for custom events
                const handleWebShare = (event) => {
                    console.log('🌐 Web share received:', event.detail);
                    if (event.detail?.url) {
                        handleSharedContent(event.detail.url);
                    }
                };

                window.addEventListener('shareReceived', handleWebShare);

                return () => {
                    window.removeEventListener('shareReceived', handleWebShare);
                };
            }
        };

        const handleSharedContent = (content) => {
            console.log('📥 handleSharedContent called with:', content);

            // Extract URL from content
            let url = content;
            if (typeof content === 'string' && content.includes('http')) {
                const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
                if (urlMatch) {
                    url = urlMatch[1];
                }
            }

            console.log('📋 Extracted URL:', url);

            // ENHANCED platform detection for ALL social media platforms
            const socialPlatforms = {
                facebook: {
                    patterns: [
                        /facebook\.com\/reel\/\d+/,
                        /facebook\.com\/watch\?v=\d+/,
                        /facebook\.com\/share\/r\/[^\/\s]+/,
                        /facebook\.com\/[^\/]+\/videos\/\d+/,
                        /fb\.watch\/[^\/\s]+/
                    ]
                },
                tiktok: {
                    patterns: [
                        /tiktok\.com\/@[^\/]+\/video\/\d+/,
                        /tiktok\.com\/t\/[a-zA-Z0-9]+/,
                        /vm\.tiktok\.com\/[a-zA-Z0-9]+/,
                        /tiktok\.com\/.*?\/video\/\d+/
                    ]
                },
                instagram: {
                    patterns: [
                        /instagram\.com\/reel\/[a-zA-Z0-9_-]+/,
                        /instagram\.com\/p\/[a-zA-Z0-9_-]+/,
                        /instagram\.com\/tv\/[a-zA-Z0-9_-]+/
                    ]
                }
            };

            // Test each platform
            let detectedPlatform = null;
            for (const [platform, config] of Object.entries(socialPlatforms)) {
                const isMatch = config.patterns.some(pattern => {
                    const matches = pattern.test(url);
                    console.log(`🔍 Testing ${platform} pattern ${pattern}: ${matches}`);
                    return matches;
                });

                if (isMatch) {
                    detectedPlatform = platform;
                    break;
                }
            }

            console.log('🎯 Detected platform:', detectedPlatform);

            if (detectedPlatform) {
                console.log(`✅ ${detectedPlatform} video detected, calling onRecipeShare!`);
                onRecipeShare({
                    type: `${detectedPlatform}_video`,
                    platform: detectedPlatform,
                    url: url.trim(),
                    source: Capacitor.isNativePlatform() ? 'mobile_share' : 'web_share',
                    timestamp: Date.now()
                });
            } else {
                console.log('❌ Not recognized as supported social media URL');
                console.log('   Supported platforms: Facebook, TikTok, Instagram');
            }
        };

        setupShareHandling();

        // Cleanup
        return () => {
            if (appUrlOpenListener) {
                appUrlOpenListener.remove();
            }
        };
    }, [onRecipeShare]);
};