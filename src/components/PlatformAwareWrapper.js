'use client';

// file: /src/components/PlatformAwareWrapper.js v6 - FORCE ANDROID: Override Capacitor detection

import { useState, useEffect } from 'react';
import PWAWrapper from '@/components/PWAWrapper';
import NativeAuthHandler from '@/components/NativeAuthHandler';

export default function PlatformAwareWrapper({ children }) {
    const [isNativeApp, setIsNativeApp] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [debugInfo, setDebugInfo] = useState('');

    useEffect(() => {
        setMounted(true);

        const detectPlatform = async () => {
            console.log('🚀 === FORCE ANDROID DETECTION ===');

            try {
                let isNativeApp = false;
                let detectionMethod = 'none';

                // Method 1: Check if we're running in an Android app context
                const isRunningInAndroidApp = () => {
                    // If we have a service worker, PWA banner, etc. but user agent shows desktop,
                    // we're likely in an Android app that's masquerading as desktop
                    const hasWebFeatures = typeof navigator.serviceWorker !== 'undefined';
                    const hasDesktopUA = navigator.userAgent.includes('Windows NT') ||
                        navigator.userAgent.includes('Macintosh');
                    const hasCapacitor = typeof window.Capacitor !== 'undefined';

                    // If we have Capacitor + web features + desktop UA = Android app
                    const suspiciousCombo = hasCapacitor && hasWebFeatures && hasDesktopUA;

                    console.log('🔍 Android app context check:', {
                        hasWebFeatures,
                        hasDesktopUA,
                        hasCapacitor,
                        suspiciousCombo,
                        location: window.location.href,
                        protocol: window.location.protocol
                    });

                    return suspiciousCombo;
                };

                // Method 2: Check for Android-specific environment indicators
                const hasAndroidEnvironment = () => {
                    // Look for Android app package structure in URL or other indicators
                    const url = window.location.href;
                    const isFileProtocol = window.location.protocol === 'file:';
                    const isAndroidAssets = url.includes('android_asset') || url.includes('file:///android');
                    const hasAndroidFeatures = typeof window.Android !== 'undefined';

                    console.log('🔍 Android environment check:', {
                        url,
                        isFileProtocol,
                        isAndroidAssets,
                        hasAndroidFeatures,
                        protocol: window.location.protocol
                    });

                    return isFileProtocol || isAndroidAssets || hasAndroidFeatures;
                };

                // Method 3: Standard Capacitor check (for comparison)
                let capacitorResult = false;
                try {
                    const { Capacitor } = await import('@capacitor/core');
                    capacitorResult = Capacitor.isNativePlatform();
                    console.log('📱 Standard Capacitor check:', {
                        isNativePlatform: capacitorResult,
                        getPlatform: Capacitor.getPlatform(),
                        hasCapacitor: !!Capacitor
                    });
                } catch (error) {
                    console.log('❌ Capacitor check failed:', error);
                }

                // Method 4: FORCE DETECTION for your specific case
                const androidAppContext = isRunningInAndroidApp();
                const androidEnvironment = hasAndroidEnvironment();

                // Since we know you removed server.url and are running from Android,
                // if we have Capacitor but it says "web", we're likely in Android
                const forceAndroid = (
                    typeof window.Capacitor !== 'undefined' &&
                    !capacitorResult && // Capacitor says web but...
                    (androidAppContext || androidEnvironment) // We have Android indicators
                );

                console.log('🎯 DETECTION LOGIC:', {
                    capacitorResult,
                    androidAppContext,
                    androidEnvironment,
                    forceAndroid,
                    hasCapacitor: !!window.Capacitor
                });

                // Final decision: Trust Capacitor OR force Android detection
                isNativeApp = capacitorResult || forceAndroid;
                detectionMethod = capacitorResult ? 'capacitor-native' :
                    forceAndroid ? 'forced-android' : 'web-browser';

                console.log('🏆 FINAL RESULT:', {
                    isNativeApp,
                    detectionMethod,
                    reasoning: isNativeApp ?
                        'Detected as Android native app' :
                        'Confirmed as web browser'
                });

                const debugMessage = `${isNativeApp ? 'ANDROID' : 'WEB'} via ${detectionMethod}`;
                setDebugInfo(debugMessage);
                setIsNativeApp(isNativeApp);

                // Store platform info globally
                if (typeof window !== 'undefined') {
                    window.platformInfo = {
                        isNative: isNativeApp,
                        isPWA: false,
                        isReady: true,
                        detectionMethod,
                        forced: forceAndroid,
                        timestamp: Date.now()
                    };

                    // Emit platform detection event
                    const event = new CustomEvent('platformDetected', {
                        detail: {
                            isNative: isNativeApp,
                            detectionMethod,
                            forced: forceAndroid,
                            debugMessage
                        }
                    });
                    window.dispatchEvent(event);
                    console.log('🚀 Platform event emitted:', event.detail);
                }

                console.log('🏁 === FORCE DETECTION COMPLETE ===');

            } catch (error) {
                console.error('💥 FORCE DETECTION ERROR:', error);
                setIsNativeApp(false);
                setDebugInfo(`ERROR: ${error.message}`);
            }
        };

        // Start detection immediately
        detectPlatform();

        // No timeout needed - we'll force a decision
        return () => {};
    }, []);

    if (!mounted || isNativeApp === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">🔍 Force detecting Android...</p>
                    {debugInfo && (
                        <p className="text-xs text-gray-400 mt-2 font-mono">{debugInfo}</p>
                    )}
                </div>
            </div>
        );
    }

    console.log(`🎯 FORCE RENDERING: ${isNativeApp ? '📱 ANDROID NATIVE' : '🌐 WEB BROWSER'} (${debugInfo})`);

    if (isNativeApp) {
        return (
            <>
                <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white text-xs p-2 text-center font-mono">
                    ✅ ANDROID NATIVE DETECTED - {debugInfo}
                </div>
                <div style={{ paddingTop: '40px' }}>
                    <NativeAuthHandler>
                        {children}
                    </NativeAuthHandler>
                </div>
            </>
        );
    } else {
        return (
            <>
                <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white text-xs p-2 text-center font-mono">
                    🌐 WEB BROWSER CONFIRMED - {debugInfo}
                </div>
                <div style={{ paddingTop: '40px' }}>
                    <PWAWrapper>
                        {children}
                    </PWAWrapper>
                </div>
            </>
        );
    }
}