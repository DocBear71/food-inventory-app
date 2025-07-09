// file: /src/utils/platformDetection.js - Enhanced platform detection

import { Capacitor } from '@capacitor/core';

export const PlatformDetection = {
    // Check if running in any mobile app (Capacitor, PWA, etc.)
    isRunningInMobileApp: () => {
        if (typeof window === 'undefined') return false;

        // Primary check: Capacitor native platform
        if (Capacitor.isNativePlatform()) {
            console.log('🔍 Platform Detection: Capacitor native platform detected');
            return true;
        }

        // Secondary checks for edge cases
        const userAgent = navigator.userAgent || '';
        const isStandalonePWA = window.matchMedia?.('(display-mode: standalone)').matches ||
            window.navigator?.standalone === true;

        // Check for Android WebView (sometimes Capacitor might not detect correctly)
        const isAndroidWebView = userAgent.includes('wv') && userAgent.includes('Android');

        // Check for iOS app context
        const isIOSApp = window.navigator?.standalone === true;

        // Check document referrer for Android app context
        const fromAndroidApp = document.referrer.includes('android-app://');

        const isMobileApp = isStandalonePWA || isAndroidWebView || isIOSApp || fromAndroidApp;

        console.log('🔍 Platform Detection Results:', {
            capacitorNative: Capacitor.isNativePlatform(),
            standalonePWA: isStandalonePWA,
            androidWebView: isAndroidWebView,
            iOSApp: isIOSApp,
            fromAndroidApp: fromAndroidApp,
            finalResult: isMobileApp,
            userAgent: userAgent.substring(0, 80) + '...'
        });

        return isMobileApp;
    },

    // Get detailed platform information
    getPlatformInfo: () => {
        return {
            platform: Capacitor.getPlatform(),
            isNative: Capacitor.isNativePlatform(),
            isCapacitor: true, // Since we're importing Capacitor
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            standalone: typeof window !== 'undefined' ? window.navigator?.standalone : false,
            displayMode: typeof window !== 'undefined' && window.matchMedia ?
                window.matchMedia('(display-mode: standalone)').matches : false
        };
    },

    // Enhanced iOS detection
    isIOS: () => {
        if (typeof window === 'undefined') return false;

        // Capacitor method first
        if (Capacitor.isNativePlatform()) {
            return Capacitor.getPlatform() === 'ios';
        }

        // Fallback detection
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    },

    // Enhanced Android detection
    isAndroid: () => {
        if (typeof window === 'undefined') return false;

        // Capacitor method first
        if (Capacitor.isNativePlatform()) {
            return Capacitor.getPlatform() === 'android';
        }

        // Fallback detection
        return /Android/.test(navigator.userAgent);
    },

    // Check if PWA is installed (but not native app)
    isPWAInstalled: () => {
        if (typeof window === 'undefined') return false;

        // Don't count native apps as PWA
        if (Capacitor.isNativePlatform()) return false;

        return window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator?.standalone === true;
    }
};

// Debug function to log all platform info
export const debugPlatformInfo = () => {
    const info = PlatformDetection.getPlatformInfo();
    console.log('🔍 Complete Platform Debug Info:', info);
    console.log('🔍 Is running in mobile app:', PlatformDetection.isRunningInMobileApp());
    console.log('🔍 Is iOS:', PlatformDetection.isIOS());
    console.log('🔍 Is Android:', PlatformDetection.isAndroid());
    console.log('🔍 Is PWA installed:', PlatformDetection.isPWAInstalled());
};