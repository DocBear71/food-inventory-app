'use client';

// file: /src/components/PWAWrapper.js v2 - FIXED: Ensure content renders for PWA users

import { useEffect, useState } from 'react';
import { PWAInstallBanner } from '@/components/mobile/PWAInstallBanner';

export default function PWAWrapper({ children }) {
    const [isPWA, setIsPWA] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        console.log('PWAWrapper starting...');

        // Detect PWA mode
        const detectPWA = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true ||
                document.referrer.includes('android-app://');

            setIsPWA(isStandalone);

            if (isStandalone) {
                console.log('🎯 PWA mode detected');
                document.body.classList.add('pwa-mode');
            } else {
                console.log('🌐 Web mode in PWAWrapper');
            }

            setIsReady(true);
        };

        // Run detection immediately
        detectPWA();

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
                            newWorker.addEventListener('statechange', async () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('New service worker installed');
                                    const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                                    const confirmed = await NativeDialog.showConfirm({
                                        title: 'Update Available',
                                        message: 'A new version is available. Refresh to update?',
                                        confirmText: 'Refresh',
                                        cancelText: 'Later'
                                    });
                                    if (confirmed) {
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

        // Listen for display mode changes
        const mediaQuery = window.matchMedia('(display-mode: standalone)');
        const handleDisplayModeChange = (e) => {
            console.log('Display mode changed:', e.matches ? 'standalone' : 'browser');
            detectPWA();
        };

        mediaQuery.addEventListener('change', handleDisplayModeChange);

        return () => {
            mediaQuery.removeEventListener('change', handleDisplayModeChange);
        };
    }, []);

    // FIXED: Always render children, don't wait for PWA detection
    console.log('🎯 PWAWrapper rendering:', { isPWA, isReady });

    return (
        <>
            {children}
            {/* Only show PWA banner for non-PWA users */}
            {isReady && !isPWA && <PWAInstallBanner />}
        </>
    );
}