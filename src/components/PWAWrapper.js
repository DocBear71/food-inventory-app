'use client';

// file: /src/components/PWAWrapper.js - PWA functionality wrapper

import { useEffect } from 'react';
import { PWAInstallBanner } from '@/components/mobile/PWAInstallBanner';

export default function PWAWrapper({ children }) {
    useEffect(() => {
        // Register service worker
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', async () => {
                try {
                    const registration = await navigator.serviceWorker.register('/sw.js');
                    console.log('SW registered: ', registration);

                    // Handle updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // Show update available notification
                                    if (confirm('A new version is available. Refresh to update?')) {
                                        window.location.reload();
                                    }
                                }
                            });
                        }
                    });

                    // Handle controller changes
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

        // Add PWA-specific CSS class
        if (window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true) {
            document.body.classList.add('pwa-mode');
        }
    }, []);

    return (
        <>
            {children}
            <PWAInstallBanner />
        </>
    );
}