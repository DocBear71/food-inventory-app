'use client';

// file: /src/components/PlatformAwareWrapper.js v8 - ENHANCED: Better Android detection and SEO compatibility

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
            console.log('🚀 === ENHANCED PLATFORM DETECTION ===');

            try {
                let isNativeApp = false;
                let detectionMethod = 'none';

                // Get comprehensive device information
                const userAgent = navigator.userAgent || '';
                const isAndroidUA = userAgent.includes('Android');
                const isMobileUA = userAgent.includes('Mobile');
                const isRealAndroidDevice = isAndroidUA && isMobileUA;
                const currentURL = window.location.href;
                const isYourDomain = window.location.hostname === 'docbearscomfort.kitchen';

                console.log('🔍 Enhanced Device Analysis:', {
                    userAgent: userAgent.substring(0, 100) + '...',
                    isAndroidUA,
                    isMobileUA,
                    isRealAndroidDevice,
                    currentURL,
                    isYourDomain,
                    protocol: window.location.protocol,
                    hostname: window.location.hostname
                });

                // Method 1: Enhanced Capacitor check
                let capacitorResult = false;
                let capacitorPlatform = 'unknown';
                try {
                    // Check if Capacitor exists in window first
                    if (typeof window.Capacitor !== 'undefined') {
                        const { Capacitor } = await import('@capacitor/core');
                        capacitorResult = Capacitor.isNativePlatform();
                        capacitorPlatform = Capacitor.getPlatform();

                        console.log('📱 Enhanced Capacitor check:', {
                            isNativePlatform: capacitorResult,
                            getPlatform: capacitorPlatform,
                            isPluginAvailable: Capacitor.isPluginAvailable('Device'),
                            capacitorVersion: window.Capacitor?.version || 'unknown'
                        });
                    } else {
                        console.log('📱 Capacitor not found in window object');
                    }
                } catch (error) {
                    console.log('❌ Capacitor check failed:', error.message);
                }

                // Method 2: CRITICAL - Enhanced Android app detection
                const detectAndroidAppFromWeb = () => {
                    // Enhanced criteria for detecting your Android app loading from web
                    const hasCapacitorObject = typeof window.Capacitor !== 'undefined';
                    const hasServiceWorker = 'serviceWorker' in navigator;
                    const isHTTPS = window.location.protocol === 'https:';
                    const isCorrectPort = !window.location.port || window.location.port === '443';

                    // Check for app-specific indicators
                    const hasAppManifest = document.querySelector('link[rel="manifest"]');
                    const hasAppIcons = document.querySelector('link[rel="apple-touch-icon"]');
                    const hasThemeColor = document.querySelector('meta[name="theme-color"]');

                    // Your Android app characteristics:
                    // 1. Real Android device
                    // 2. Your domain
                    // 3. HTTPS
                    // 4. Has Capacitor (even if it says "web")
                    // 5. Has PWA features
                    const isYourAndroidApp = isRealAndroidDevice &&
                        isYourDomain &&
                        isHTTPS &&
                        hasCapacitorObject &&
                        hasServiceWorker &&
                        hasAppManifest;

                    console.log('🔍 Enhanced Android app detection:', {
                        isRealAndroidDevice,
                        isYourDomain,
                        isHTTPS,
                        isCorrectPort,
                        hasCapacitorObject,
                        hasServiceWorker,
                        hasAppManifest: !!hasAppManifest,
                        hasAppIcons: !!hasAppIcons,
                        hasThemeColor: !!hasThemeColor,
                        isYourAndroidApp
                    });

                    return isYourAndroidApp;
                };

                // Method 3: Check for existing platform info from layout
                const hasExistingPlatformInfo = () => {
                    const layoutInfo = window.layoutPlatformInfo;
                    const wrapperInfo = window.platformInfo;

                    console.log('🔍 Existing platform info check:', {
                        layoutInfo,
                        wrapperInfo,
                        hasLayout: !!layoutInfo,
                        hasWrapper: !!wrapperInfo
                    });

                    return layoutInfo?.isNative || wrapperInfo?.isNative;
                };

                // Method 4: Browser-specific Android app detection
                const detectBrowserSpecificAndroidApp = () => {
                    // Look for specific browser behaviors that indicate your app
                    const isChrome = userAgent.includes('Chrome');
                    const isWebView = userAgent.includes('wv') || userAgent.includes('WebView');
                    const hasCustomUserAgent = userAgent.includes('docbearscomfort') || userAgent.includes('DocBear');

                    // Check for app-specific localStorage or sessionStorage
                    let hasAppStorage = false;
                    try {
                        hasAppStorage = localStorage.getItem('app-platform') === 'android' ||
                            sessionStorage.getItem('capacitor-platform') === 'android';
                    } catch (e) {
                        // Storage might not be available
                    }

                    const isBrowserApp = isRealAndroidDevice &&
                        isYourDomain &&
                        (isWebView || hasCustomUserAgent || hasAppStorage);

                    console.log('🔍 Browser-specific detection:', {
                        isChrome,
                        isWebView,
                        hasCustomUserAgent,
                        hasAppStorage,
                        isBrowserApp
                    });

                    return isBrowserApp;
                };

                // Run all detection methods
                const androidAppFromWeb = detectAndroidAppFromWeb();
                const hasExistingInfo = hasExistingPlatformInfo();
                const browserSpecificApp = detectBrowserSpecificAndroidApp();

                // Final decision logic
                isNativeApp = capacitorResult || androidAppFromWeb || hasExistingInfo || browserSpecificApp;

                // Determine detection method for debugging
                if (capacitorResult) {
                    detectionMethod = `capacitor-native-${capacitorPlatform}`;
                } else if (androidAppFromWeb) {
                    detectionMethod = 'android-app-from-web';
                } else if (hasExistingInfo) {
                    detectionMethod = 'existing-platform-info';
                } else if (browserSpecificApp) {
                    detectionMethod = 'browser-specific-android';
                } else {
                    detectionMethod = 'web-browser';
                }

                console.log('🎯 ENHANCED FINAL DETECTION:', {
                    capacitorResult,
                    androidAppFromWeb,
                    hasExistingInfo,
                    browserSpecificApp,
                    isNativeApp,
                    detectionMethod
                });

                const debugMessage = `${isNativeApp ? 'NATIVE' : 'WEB'} via ${detectionMethod}`;
                setDebugInfo(debugMessage);
                setIsNativeApp(isNativeApp);

                // Store comprehensive platform info globally AND in unified system
                if (typeof window !== 'undefined') {
                    const platformData = {
                        isNative: isNativeApp,
                        isPWA: !isNativeApp && hasServiceWorker && isYourDomain,
                        isReady: true,
                        detectionMethod,
                        platform: isNativeApp ? (isRealAndroidDevice ? 'android' : 'ios') : 'web',
                        userAgent: userAgent.substring(0, 100),
                        timestamp: Date.now(),
                        statusBarHeight: isNativeApp ? (isRealAndroidDevice ? 24 : 44) : 0,
                        // Enhanced properties for components
                        capacitorNative: capacitorResult,
                        standalonePWA: window.navigator?.standalone === true,
                        androidWebView: isNativeApp && isRealAndroidDevice,
                        iOSApp: isNativeApp && !isRealAndroidDevice,
                        fromAndroidApp: isNativeApp && isRealAndroidDevice
                    };

                    // Store in legacy locations
                    window.platformInfo = platformData;

                    // CRITICAL: Store in unified system for consistency across all components
                    if (window.UnifiedPlatformManager) {
                        console.log('🌟 Setting platform info in unified system');
                        window.UnifiedPlatformManager.setPlatformInfo(platformData);
                    } else {
                        console.log('⚠️ UnifiedPlatformManager not available yet, storing for later');
                        // Store for when unified system loads
                        window.__PENDING_PLATFORM_INFO__ = platformData;
                    }

                    // Also store backup references
                    window.isNativeApp = isNativeApp;
                    window.isAndroidApp = isNativeApp && isRealAndroidDevice;
                    window.isiOSApp = isNativeApp && !isRealAndroidDevice;

                    // Dispatch comprehensive platform event
                    const event = new CustomEvent('platformDetected', {
                        detail: platformData
                    });
                    window.dispatchEvent(event);

                    console.log('🚀 Enhanced platform event dispatched:', event.detail);

                    // CRITICAL: Force unified system update after short delay
                    setTimeout(() => {
                        if (window.UnifiedPlatformManager) {
                            console.log('🌟 Force updating unified system after dispatch');
                            window.UnifiedPlatformManager.forceGlobalUpdate();
                        }

                        // Re-emit events for any late-loading components
                        window.dispatchEvent(new CustomEvent('platformDetected', {
                            detail: platformData
                        }));

                        // Also dispatch layout-specific event
                        window.dispatchEvent(new CustomEvent('layoutPlatformDetected', {
                            detail: platformData
                        }));

                        console.log('🔄 Re-emitted platform events with unified system update');
                    }, 100);

                    // Additional forced update after 1 second for stubborn components
                    setTimeout(() => {
                        if (window.UnifiedPlatformManager && isNativeApp) {
                            console.log('🌟 Final forced update for native app');
                            window.UnifiedPlatformManager.forceGlobalUpdate();
                        }
                    }, 1000);

                    // Store in localStorage for future visits (if available)
                    try {
                        if (isNativeApp) {
                            localStorage.setItem('app-platform', isRealAndroidDevice ? 'android' : 'ios');
                            sessionStorage.setItem('capacitor-platform', isRealAndroidDevice ? 'android' : 'ios');
                        }
                    } catch (e) {
                        // Storage might not be available
                    }
                }

                console.log('🏁 === ENHANCED DETECTION COMPLETE ===');

            } catch (error) {
                console.error('💥 ENHANCED DETECTION ERROR:', error);
                setIsNativeApp(false);
                setDebugInfo(`ERROR: ${error.message}`);

                // Even on error, try to set basic platform info
                if (typeof window !== 'undefined') {
                    window.platformInfo = {
                        isNative: false,
                        isPWA: false,
                        isReady: true,
                        detectionMethod: 'error-fallback',
                        platform: 'web',
                        timestamp: Date.now()
                    };
                }
            }
        };

        detectPlatform();
        return () => {};
    }, []);

    // Enhanced loading state
    if (!mounted || isNativeApp === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">🔍 Enhanced platform detection...</p>
                    {debugInfo && (
                        <p className="text-xs text-gray-400 mt-2 font-mono">{debugInfo}</p>
                    )}
                    <p className="text-xs text-gray-300 mt-1">Ensuring native app compatibility...</p>
                </div>
            </div>
        );
    }

    console.log(`🎯 ENHANCED FINAL RENDER: ${isNativeApp ? '📱 NATIVE APP' : '🌐 WEB BROWSER'} (${debugInfo})`);

    if (isNativeApp) {
        return (
            <>
                {/* Enhanced debug banner for native apps */}
                <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white text-xs p-2 text-center font-mono">
                    ✅ NATIVE APP MODE - {debugInfo}
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
                {/* Enhanced debug banner for web */}
                <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white text-xs p-2 text-center font-mono">
                    🌐 WEB MODE - {debugInfo}
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