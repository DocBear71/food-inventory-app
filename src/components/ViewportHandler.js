'use client';

// components/ViewportHandler.js

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function ViewportHandler() {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        function updateViewport() {
            // Set CSS custom properties for viewport height
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);

            // For Capacitor apps, also handle safe areas
            if (Capacitor.isNativePlatform()) {
                console.log('📱 Updating viewport for native app');

                // Force immediate safe area calculation
                setTimeout(() => {
                    const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0px';
                    const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0px';

                    console.log('Safe areas:', { top: safeAreaTop, bottom: safeAreaBottom });

                    // Apply additional bottom padding for navigation
                    const navBarHeight = 60;
                    const bottomPadding = Math.max(
                        parseInt(safeAreaBottom) || 0,
                        navBarHeight
                    );

                    document.documentElement.style.setProperty('--safe-bottom', `${bottomPadding}px`);
                    document.body.classList.add('native-app');
                    document.body.classList.add('has-bottom-nav');
                }, 0);
            }
        }

        // Multiple calls to ensure it takes effect
        updateViewport();
        setTimeout(updateViewport, 100);
        setTimeout(updateViewport, 500);

        // Also trigger on document ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateViewport);
        }

        // Update on resize and orientation change
        window.addEventListener('resize', updateViewport);
        window.addEventListener('orientationchange', () => {
            setTimeout(updateViewport, 500);
        });

        // For Capacitor, also listen to app state changes
        if (Capacitor.isNativePlatform()) {
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    setTimeout(updateViewport, 100);
                }
            });
        }

        return () => {
            window.removeEventListener('resize', updateViewport);
            window.removeEventListener('orientationchange', updateViewport);
            document.removeEventListener('DOMContentLoaded', updateViewport);
        };
    }, []);

    return null;
}