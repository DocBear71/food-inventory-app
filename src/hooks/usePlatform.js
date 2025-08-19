'use client';

// file: /src/hooks/usePlatform.js v2 - Unified platform detection for all needs
// Replaces usePlatformDetection.js - this single hook handles all platform detection needs

import { useState, useEffect } from 'react';

export function usePlatform() {
    const [platform, setPlatform] = useState({
        // Platform type
        type: 'web', // 'web', 'android', 'ios'
        isWeb: true,
        isAndroid: false,
        isIOS: false,
        isNative: false,

        // Device characteristics
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isTouchDevice: false,
        screenSize: 'unknown',

        // Billing provider
        billingProvider: 'stripe', // 'stripe', 'googleplay', 'appstore'

        // Loading state
        loading: true
    });

    useEffect(() => {
        const detectPlatform = async () => {
            if (typeof window === 'undefined') {
                // Server-side rendering - return defaults
                setPlatform(prev => ({ ...prev, loading: false }));
                return;
            }

            try {
                // Device detection
                const width = window.innerWidth;
                const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                const isMobileDevice = width < 768;
                const isTabletDevice = width >= 768 && width < 1024;
                const isDesktopDevice = width >= 1024;

                // Platform detection
                let platformType = 'web';
                let isNativeApp = false;
                let isIOSDevice = false;
                let isAndroidDevice = false;

                // Check for native app (Capacitor)
                try {
                    const { Capacitor } = await import('@capacitor/core');
                    if (Capacitor.isNativePlatform()) {
                        platformType = Capacitor.getPlatform();
                        isNativeApp = true;
                        isIOSDevice = platformType === 'ios';
                        isAndroidDevice = platformType === 'android';
                    }
                } catch (error) {
                    // Capacitor not available - continue with web detection
                    console.log('Capacitor not available, using web-based detection');
                }

                // Fallback platform detection if not native
                if (!isNativeApp) {
                    // Check for iOS devices
                    isIOSDevice = /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
                        (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

                    // Check for Android devices
                    isAndroidDevice = /Android/.test(window.navigator.userAgent);

                    // Check if running as PWA
                    const isPWA = window.navigator.standalone || // iOS PWA
                        window.matchMedia('(display-mode: standalone)').matches; // Android PWA

                    if (isPWA) {
                        isNativeApp = true;
                        if (isIOSDevice) platformType = 'ios';
                        else if (isAndroidDevice) platformType = 'android';
                    }
                }

                // Determine billing provider
                let billingProvider = 'stripe';
                if (isNativeApp) {
                    if (isIOSDevice) billingProvider = 'appstore';
                    else if (isAndroidDevice) billingProvider = 'googleplay';
                }

                // Screen size classification
                const screenSize = width < 640 ? 'sm' :
                    width < 768 ? 'md' :
                        width < 1024 ? 'lg' : 'xl';

                setPlatform({
                    // Platform type
                    type: platformType,
                    isWeb: !isNativeApp,
                    isAndroid: isAndroidDevice,
                    isIOS: isIOSDevice,
                    isNative: isNativeApp,

                    // Device characteristics
                    isMobile: isMobileDevice,
                    isTablet: isTabletDevice,
                    isDesktop: isDesktopDevice,
                    isTouchDevice,
                    screenSize,

                    // Billing provider
                    billingProvider,

                    // Loading state
                    loading: false
                });

            } catch (error) {
                console.error('Platform detection error:', error);

                // Fallback to basic web detection
                const width = window.innerWidth || 1024;
                const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

                setPlatform({
                    type: 'web',
                    isWeb: true,
                    isAndroid: false,
                    isIOS: false,
                    isNative: false,
                    isMobile: width < 768,
                    isTablet: width >= 768 && width < 1024,
                    isDesktop: width >= 1024,
                    isTouchDevice,
                    screenSize: width < 640 ? 'sm' : width < 768 ? 'md' : width < 1024 ? 'lg' : 'xl',
                    billingProvider: 'stripe',
                    loading: false
                });
            }
        };

        // Initial detection
        detectPlatform();

        // Handle window resize for responsive detection
        const handleResize = () => {
            if (typeof window !== 'undefined') {
                const width = window.innerWidth;
                const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

                setPlatform(prev => ({
                    ...prev,
                    isMobile: width < 768,
                    isTablet: width >= 768 && width < 1024,
                    isDesktop: width >= 1024,
                    isTouchDevice,
                    screenSize: width < 640 ? 'sm' : width < 768 ? 'md' : width < 1024 ? 'lg' : 'xl'
                }));
            }
        };

        window.addEventListener('resize', handleResize);

        // Re-detect after a short delay to ensure all APIs are loaded
        const timer = setTimeout(detectPlatform, 500);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }, []);

    return platform;
}