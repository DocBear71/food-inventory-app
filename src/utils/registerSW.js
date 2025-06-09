// file: /src/utils/registerSW.js - Service Worker registration
'use client';

export function registerServiceWorker() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('SW registered: ', registration);

                // Update available
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // Show update available notification
                                showUpdateNotification();
                            }
                        });
                    }
                });

                // Handle updates
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                        window.location.reload();
                        refreshing = true;
                    }
                });

            } catch (error) {
                console.log('SW registration failed: ', error);
            }
        });
    }
}

function showUpdateNotification() {
    if (confirm('A new version is available. Refresh to update?')) {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ command: 'skipWaiting' });
        }
    }
}