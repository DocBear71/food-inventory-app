// File: src/lib/shareHandler.js - Enhanced for all platforms
export const setupWebShareTarget = () => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Register service worker for share target (PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', event => {
            console.log('🌐 Service Worker message:', event.data);

            if (event.data && event.data.type === 'SHARE_TARGET') {
                const { url } = event.data;

                // Enhanced platform detection
                const socialPlatforms = [
                    {
                        platform: 'facebook',
                        patterns: [
                            /facebook\.com\/watch/,
                            /facebook\.com\/reel/,
                            /facebook\.com\/share\/[rv]/,
                            /facebook\.com\/.*\/videos/,
                            /facebook\.com\/.*\/posts/,
                            /facebook\.com\/story\.php/,
                            /fb\.watch/,
                            /facebook\.com\/.*\/photos/
                        ]
                    },
                    {
                        platform: 'tiktok',
                        patterns: [
                            /tiktok\.com/,
                            /vm\.tiktok\.com/
                        ]
                    },
                    {
                        platform: 'instagram',
                        patterns: [
                            /instagram\.com/
                        ]
                    }
                ];

                // Check if URL matches any supported platform
                const matchedPlatform = socialPlatforms.find(platform =>
                    platform.patterns.some(pattern => pattern.test(url))
                );

                if (matchedPlatform) {
                    // Trigger the same handler as mobile
                    window.dispatchEvent(new CustomEvent('shareReceived', {
                        detail: {
                            url,
                            platform: matchedPlatform.platform,
                            source: 'web_share_target'
                        }
                    }));
                }
            }
        });
    }

    // Handle URL parameters for web share target
    const handleShareParams = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedUrl = urlParams.get('url') || urlParams.get('text');
        const source = urlParams.get('source');

        if (sharedUrl && source === 'share') {
            console.log('🌐 Web share target activated:', sharedUrl);

            // Detect platform from shared URL
            let platform = 'unknown';
            if (sharedUrl.includes('facebook.com') || sharedUrl.includes('fb.watch')) {
                platform = 'facebook';
            } else if (sharedUrl.includes('tiktok.com')) {
                platform = 'tiktok';
            } else if (sharedUrl.includes('instagram.com')) {
                platform = 'instagram';
            }

            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Dispatch share event
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('shareReceived', {
                    detail: {
                        url: sharedUrl,
                        platform: platform,
                        source: 'web_share_target'
                    }
                }));
            }, 100);
        }
    };

    // Run on page load
    handleShareParams();
};

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupWebShareTarget);
    } else {
        setupWebShareTarget();
    }
}