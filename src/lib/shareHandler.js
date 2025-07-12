// File: src/lib/shareHandler.js
export const setupWebShareTarget = () => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Register service worker for share target (PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', event => {
            console.log('🌐 Service Worker message:', event.data);

            if (event.data && event.data.type === 'SHARE_TARGET') {
                const { url } = event.data;

                if (url && (url.includes('facebook.com') || url.includes('fb.watch'))) {
                    // Trigger the same handler as mobile
                    window.dispatchEvent(new CustomEvent('shareReceived', {
                        detail: { url, source: 'web_share_target' }
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

            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Dispatch share event
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('shareReceived', {
                    detail: { url: sharedUrl, source: 'web_share_target' }
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