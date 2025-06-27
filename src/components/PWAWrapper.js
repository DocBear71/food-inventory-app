'use client';

// file: /src/components/PWAWrapper.js - Final working version

import { useEffect } from 'react';
import { PWAInstallBanner } from '@/components/mobile/PWAInstallBanner';

export default function PWAWrapper({ children }) {
    useEffect(() => {
        console.log('PWAWrapper starting...');

        // Register service worker immediately (don't wait for load event in dev)
        if ('serviceWorker' in navigator) {
            console.log('Registering service worker...');

            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('✅ Service Worker registered:', registration);

                    // Handle updates
                    registration.addEventListener('updatefound', () => {
                        console.log('Service worker update found');
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('New service worker installed');
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
                        console.log('Service worker controller changed');
                        if (!refreshing) {
                            window.location.reload();
                            refreshing = true;
                        }
                    });

                })
                .catch((error) => {
                    console.error('❌ Service Worker registration failed:', error);
                });
        } else {
            console.log('Service workers not supported');
        }

        // Add PWA-specific CSS class
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;

        if (isStandalone) {
            document.body.classList.add('pwa-mode');
            console.log('Running in PWA mode');
        }
    }, []);

    return (
        <>
            {children}
            <PWAInstallBanner />
        </>
    );
}