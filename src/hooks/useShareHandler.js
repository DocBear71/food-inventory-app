// File: src/hooks/useShareHandler.js
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
            console.log('📥 Processing shared content:', content);

            // Extract URL from content (handle both direct URLs and shared text)
            let url = content;
            if (typeof content === 'string' && content.includes('http')) {
                const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
                if (urlMatch) {
                    url = urlMatch[1];
                }
            }

            // Check if it's a Facebook URL
            const facebookPatterns = [
                /facebook\.com\/reel\/\d+/,
                /facebook\.com\/watch\?v=\d+/,
                /facebook\.com\/share\/r\/[^\/\s]+/,
                /fb\.watch\/[^\/\s]+/
            ];

            const isFacebookURL = facebookPatterns.some(pattern => pattern.test(url));

            if (isFacebookURL) {
                console.log('🎯 Facebook video detected!');
                onRecipeShare({
                    type: 'facebook_video',
                    url: url.trim(),
                    source: Capacitor.isNativePlatform() ? 'mobile_share' : 'web_share',
                    timestamp: Date.now()
                });
            } else {
                console.log('ℹ️ Non-Facebook URL shared:', url);
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