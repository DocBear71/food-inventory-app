'use client';

// file: /src/components/PlatformAwareWrapper.js v7 - FINAL: Detect Android app loading from web

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
            console.log('🚀 === FINAL ANDROID DETECTION ===');

            try {
                let isNativeApp = false;
                let detectionMethod = 'none';

                // Get user agent details
                const userAgent = navigator.userAgent || '';
                const isAndroidUA = userAgent.includes('Android');
                const isMobileUA = userAgent.includes('Mobile');
                const isRealAndroidDevice = isAndroidUA && isMobileUA;

                console.log('🔍 User Agent Analysis:', {
                    userAgent,
                    isAndroidUA,
                    isMobileUA,
                    isRealAndroidDevice,
                    location: window.location.href
                });

                // Method 1: Standard Capacitor check
                let capacitorResult = false;
                try {
                    const { Capacitor } = await import('@capacitor/core');
                    capacitorResult = Capacitor.isNativePlatform();
                    console.log('📱 Capacitor check:', {
                        isNativePlatform: capacitorResult,
                        getPlatform: Capacitor.getPlatform()
                    });
                } catch (error) {
                    console.log('❌ Capacitor failed:', error);
                }

                // Method 2: CRITICAL - Detect Android app loading from web
                const isAndroidAppLoadingFromWeb = () => {
                    // If we have:
                    // 1. Real Android device (user agent)
                    // 2. Capacitor available
                    // 3. Loading from https://docbearscomfort.kitchen
                    // 4. But Capacitor says "web"
                    // = Android app configured to load from web

                    const hasCapacitor = typeof window.Capacitor !== 'undefined';
                    const loadingFromYourSite = window.location.href.includes('docbearscomfort.kitchen');
                    const capacitorSaysWeb = !capacitorResult;

                    const isAndroidAppFromWeb = isRealAndroidDevice &&
                        hasCapacitor &&
                        loadingFromYourSite &&
                        capacitorSaysWeb;

                    console.log('🔍 Android app from web check:', {
                        isRealAndroidDevice,
                        hasCapacitor,
                        loadingFromYourSite,
                        capacitorSaysWeb,
                        isAndroidAppFromWeb
                    });

                    return isAndroidAppFromWeb;
                };

                // Method 3: Additional Android app indicators
                const hasAndroidAppFeatures = () => {
                    // Look for other signs this is your Android app
                    const hasServiceWorker = 'serviceWorker' in navigator;
                    const hasPWAFeatures = hasServiceWorker; // Your logs show SW registration
                    const isCorrectDomain = window.location.hostname === 'docbearscomfort.kitchen';

                    // Android device + your domain + PWA features + Capacitor = your app
                    const isYourAndroidApp = isRealAndroidDevice &&
                        isCorrectDomain &&
                        hasPWAFeatures &&
                        typeof window.Capacitor !== 'undefined';

                    console.log('🔍 Android app features check:', {
                        hasServiceWorker,
                        hasPWAFeatures,
                        isCorrectDomain,
                        isYourAndroidApp
                    });

                    return isYourAndroidApp;
                };

                // Run detection methods
                const androidAppFromWeb = isAndroidAppLoadingFromWeb();
                const hasAppFeatures = hasAndroidAppFeatures();

                // Final decision
                isNativeApp = capacitorResult || androidAppFromWeb || hasAppFeatures;

                if (capacitorResult) {
                    detectionMethod = 'capacitor-native';
                } else if (androidAppFromWeb) {
                    detectionMethod = 'android-app-from-web';
                } else if (hasAppFeatures) {
                    detectionMethod = 'android-app-features';
                } else {
                    detectionMethod = 'web-browser';
                }

                console.log('🎯 FINAL DETECTION:', {
                    capacitorResult,
                    androidAppFromWeb,
                    hasAppFeatures,
                    isNativeApp,
                    detectionMethod
                });

                const debugMessage = `${isNativeApp ? 'ANDROID' : 'WEB'} via ${detectionMethod}`;
                setDebugInfo(debugMessage);
                setIsNativeApp(isNativeApp);

                // Store platform info
                if (typeof window !== 'undefined') {
                    window.platformInfo = {
                        isNative: isNativeApp,
                        isPWA: false,
                        isReady: true,
                        detectionMethod,
                        userAgent: userAgent.substring(0, 100),
                        timestamp: Date.now()
                    };

                    const event = new CustomEvent('platformDetected', {
                        detail: {
                            isNative: isNativeApp,
                            detectionMethod,
                            debugMessage
                        }
                    });
                    window.dispatchEvent(event);
                    console.log('🚀 Final platform event:', event.detail);
                }

                console.log('🏁 === FINAL DETECTION COMPLETE ===');

            } catch (error) {
                console.error('💥 FINAL DETECTION ERROR:', error);
                setIsNativeApp(false);
                setDebugInfo(`ERROR: ${error.message}`);
            }
        };

        detectPlatform();
        return () => {};
    }, []);

    if (!mounted || isNativeApp === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">🔍 Final Android detection...</p>
                    {debugInfo && (
                        <p className="text-xs text-gray-400 mt-2 font-mono">{debugInfo}</p>
                    )}
                </div>
            </div>
        );
    }

    console.log(`🎯 FINAL RENDER: ${isNativeApp ? '📱 ANDROID APP' : '🌐 WEB BROWSER'} (${debugInfo})`);

    if (isNativeApp) {
        return (
            <>
                <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white text-xs p-2 text-center font-mono">
                    ✅ ANDROID APP DETECTED - {debugInfo}
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
                    🌐 WEB BROWSER - {debugInfo}
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