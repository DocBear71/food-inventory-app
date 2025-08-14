'use client';

// file: /src/components/PlatformAwareWrapper.js v2 - RESTORED: Back to July 20th working version with minimal Android fix

import { useState, useEffect } from 'react';
import PWAWrapper from '@/components/PWAWrapper';
import NativeAuthHandler from '@/components/NativeAuthHandler';

export default function PlatformAwareWrapper({ children }) {
    const [isNativeApp, setIsNativeApp] = useState(null); // null = loading, true/false = determined
    const [mounted, setMounted] = useState(false);
    const [debugInfo, setDebugInfo] = useState('');

    useEffect(() => {
        setMounted(true);

        // CRITICAL: Prevent multiple instances from conflicting
        if (window.platformDetectionInProgress) {
            console.log('⚠️ Platform detection already in progress, waiting...');

            // Wait for existing detection to complete
            const checkExisting = setInterval(() => {
                if (window.platformInfo?.isReady) {
                    console.log('✅ Using existing platform detection result:', window.platformInfo);
                    setIsNativeApp(window.platformInfo.isNative);
                    setDebugInfo('Used existing detection: ' + (window.platformInfo.isNative ? 'Native' : 'Web'));
                    clearInterval(checkExisting);
                }
            }, 100);

            // Clear check after 3 seconds
            setTimeout(() => clearInterval(checkExisting), 3000);
            return;
        }

        // Mark detection as in progress
        window.platformDetectionInProgress = true;

        // Runtime detection of platform
        const detectPlatform = async () => {
            try {
                let isCapacitorNative = false;
                let buildTimeCheck = false;
                let hasAppSignature = false;

                // Check if Capacitor is available
                if (typeof window !== 'undefined' && window.Capacitor) {
                    try {
                        const { Capacitor } = await import('@capacitor/core');
                        isCapacitorNative = Capacitor.isNativePlatform();
                    } catch (capacitorError) {
                        console.log('Capacitor import failed:', capacitorError);
                        isCapacitorNative = false;
                    }
                }

                // Additional checks for edge cases
                buildTimeCheck = process.env.CAPACITOR_PLATFORM === 'ios' ||
                    process.env.CAPACITOR_PLATFORM === 'android';

                // Check user agent for mobile app indicators (backup)
                const userAgent = navigator.userAgent || '';
                hasAppSignature = userAgent.includes('CapacitorWebView') ||
                    userAgent.includes('DocBearsComfortKitchen');

                // MINIMAL FIX: Add check for your Android app that loads from web
                let isYourAndroidApp = false;
                if (!isCapacitorNative && typeof window !== 'undefined') {
                    const isAndroidDevice = userAgent.includes('Android') && userAgent.includes('Mobile');
                    const hasCapacitorLib = typeof window.Capacitor !== 'undefined';
                    const isYourDomain = window.location.hostname === 'docbearscomfort.kitchen';
                    const isHTTPS = window.location.protocol === 'https:';

                    // Your specific app signature
                    isYourAndroidApp = isAndroidDevice && hasCapacitorLib && isYourDomain && isHTTPS;

                    if (isYourAndroidApp) {
                        console.log('🔍 Detected your Android app loading from web');
                    }
                }

                // RESTORED: Original conservative logic with Android app fix
                const finalResult = isCapacitorNative || isYourAndroidApp || (buildTimeCheck && hasAppSignature);

                const debugMessage = `Platform: ${finalResult ? 'Native' : 'Web/PWA'} (Capacitor: ${isCapacitorNative}, AndroidApp: ${isYourAndroidApp}, Build: ${buildTimeCheck}, UA: ${hasAppSignature})`;
                setDebugInfo(debugMessage);

                console.log('🔍 Platform Detection in Layout:', {
                    capacitorNative: isCapacitorNative,
                    isYourAndroidApp,
                    buildTimeCheck,
                    hasAppSignature,
                    userAgent: userAgent.substring(0, 60) + '...',
                    finalResult,
                    debugMessage
                });

                setIsNativeApp(finalResult);

                // Store globally for other components (minimal)
                window.platformInfo = {
                    isNative: finalResult,
                    isReady: true,
                    platform: finalResult ? 'android' : 'web'
                };
                window.isNativeApp = finalResult;

                // Mark detection as complete
                window.platformDetectionInProgress = false;

            } catch (error) {
                console.error('Platform detection failed:', error);
                // RESTORED: Default to web/PWA if detection fails (more common case)
                setIsNativeApp(false);
                setDebugInfo('Detection failed, defaulting to web');

                // Mark detection as complete even on error
                window.platformDetectionInProgress = false;
            }
        };

        // RESTORED: Original timing
        detectPlatform();

        // Also set a fallback timeout to prevent infinite loading
        const fallbackTimer = setTimeout(() => {
            if (isNativeApp === null) {
                console.log('⚠️ Platform detection timeout, checking for existing result...');

                // Check if another instance already detected
                if (window.platformInfo?.isReady) {
                    console.log('✅ Found existing platform result during timeout');
                    setIsNativeApp(window.platformInfo.isNative);
                    setDebugInfo('Timeout - used existing: ' + (window.platformInfo.isNative ? 'Native' : 'Web'));
                } else {
                    console.log('❌ No existing result found, defaulting to web');
                    setIsNativeApp(false);
                    setDebugInfo('Detection timeout, defaulting to web');
                }

                // Clear the progress flag
                window.platformDetectionInProgress = false;
            }
        }, 5000); // INCREASED: 5 second timeout instead of 2 seconds

        return () => {
            clearTimeout(fallbackTimer);
            // Only clear progress flag if this instance set it
            if (window.platformDetectionInProgress) {
                window.platformDetectionInProgress = false;
            }
        };
    }, []);

    // RESTORED: Original loading screen
    if (!mounted || isNativeApp === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your kitchen...</p>
                    {debugInfo && (
                        <p className="text-xs text-gray-400 mt-2">{debugInfo}</p>
                    )}
                </div>
            </div>
        );
    }

    // RESTORED: Original debug info
    console.log(`🎯 PlatformAwareWrapper rendering: ${isNativeApp ? 'Native' : 'Web/PWA'} wrapper`);

    // Render appropriate wrapper based on platform
    if (isNativeApp) {
        console.log('📱 Rendering native app wrapper');
        return (
            <>
                {process.env.NODE_ENV === 'development' && (
                    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-100 text-blue-800 text-xs p-1 text-center">
                        🔧 Native App Mode - {debugInfo}
                    </div>
                )}
                <NativeAuthHandler>
                    {children}
                </NativeAuthHandler>
            </>
        );
    } else {
        console.log('🌐 Rendering web app wrapper with PWA features');
        return (
            <>
                {process.env.NODE_ENV === 'development' && (
                    <div className="fixed top-0 left-0 right-0 z-50 bg-green-100 text-green-800 text-xs p-1 text-center">
                        🔧 Web/PWA Mode - {debugInfo}
                    </div>
                )}
                <PWAWrapper>
                    {children}
                </PWAWrapper>
            </>
        );
    }
}