// file: /src/hooks/usePlatformDetection.js v1 - Platform detection for hiding store badges
'use client';

import { useState, useEffect } from 'react';

export function usePlatformDetection() {
    const [platform, setPlatform] = useState({
        isNative: false,
        isIOS: false,
        isAndroid: false,
        isWeb: true,
        loading: true
    });

    useEffect(() => {
        const detectPlatform = () => {
            // Check if running in Capacitor (native app)
            const isCapacitor = typeof window !== 'undefined' &&
                (window.Capacitor ||
                    (window.navigator && window.navigator.userAgent.includes('CapacitorWebView')));

            // Check for iOS
            const isIOSDevice = typeof window !== 'undefined' &&
                (/iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
                    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1));

            // Check for Android
            const isAndroidDevice = typeof window !== 'undefined' &&
                /Android/.test(window.navigator.userAgent);

            // Determine if we're in a native app context
            const isNativeApp = isCapacitor ||
                (typeof window !== 'undefined' && window.navigator.standalone) || // iOS PWA
                (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches); // Android PWA

            setPlatform({
                isNative: isNativeApp,
                isIOS: isIOSDevice,
                isAndroid: isAndroidDevice,
                isWeb: !isNativeApp,
                loading: false
            });
        };

        // Initial detection
        detectPlatform();

        // Re-detect after a short delay to ensure Capacitor has loaded
        const timer = setTimeout(detectPlatform, 500);

        return () => clearTimeout(timer);
    }, []);

    return platform;
}