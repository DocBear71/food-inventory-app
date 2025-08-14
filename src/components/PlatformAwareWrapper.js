'use client';

// file: /src/components/PlatformAwareWrapper.js v5 - FIXED: Works with existing capacitor-auth-fix.js

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
            console.log('🚀 === PLATFORM DETECTION (v5) ===');

            try {
                let isCapacitorNative = false;
                let detectionMethod = 'none';

                // Method 1: Use Capacitor import (same as your auth fix)
                try {
                    console.log('🔄 Attempting Capacitor import (like auth fix)...');
                    const { Capacitor } = await import('@capacitor/core');

                    if (Capacitor && typeof Capacitor.isNativePlatform === 'function') {
                        isCapacitorNative = Capacitor.isNativePlatform();
                        detectionMethod = 'capacitor-import';
                        console.log('✅ Capacitor import successful:', {
                            isNativePlatform: isCapacitorNative,
                            getPlatform: Capacitor.getPlatform ? Capacitor.getPlatform() : 'unknown'
                        });
                    } else {
                        console.log('❌ Capacitor import returned invalid object');
                    }
                } catch (importError) {
                    console.log('❌ Capacitor import failed:', importError);
                }

                // Method 2: Check if Capacitor is already on window (from auth fix)
                if (!isCapacitorNative && typeof window !== 'undefined' && window.Capacitor) {
                    console.log('✅ Found window.Capacitor (from auth fix?)');
                    try {
                        isCapacitorNative = window.Capacitor.isNativePlatform();
                        detectionMethod = 'window-capacitor';
                        console.log('📱 Window Capacitor check:', isCapacitorNative);
                    } catch (error) {
                        console.log('❌ Window Capacitor error:', error);
                    }
                }

                // Method 3: Wait for Capacitor to be ready (sync with auth fix timing)
                if (!isCapacitorNative) {
                    console.log('⏳ Waiting for Capacitor to be ready (like auth fix)...');

                    // Wait for DOMContentLoaded (same as auth fix)
                    const waitForCapacitorReady = () => {
                        return new Promise((resolve) => {
                            const checkCapacitor = async () => {
                                try {
                                    const { Capacitor } = await import('@capacitor/core');
                                    if (Capacitor && Capacitor.isNativePlatform) {
                                        resolve({
                                            isNative: Capacitor.isNativePlatform(),
                                            method: 'delayed-ready'
                                        });
                                    } else {
                                        resolve({ isNative: false, method: 'delayed-failed' });
                                    }
                                } catch (error) {
                                    resolve({ isNative: false, method: 'delayed-error' });
                                }
                            };

                            if (document.readyState === 'loading') {
                                document.addEventListener('DOMContentLoaded', checkCapacitor);
                            } else {
                                checkCapacitor();
                            }
                        });
                    };

                    const delayedResult = await waitForCapacitorReady();
                    isCapacitorNative = delayedResult.isNative;
                    detectionMethod = delayedResult.method;
                    console.log('📱 Delayed Capacitor result:', delayedResult);
                }

                // Method 4: Android-specific fallback (since you mentioned Android issues)
                let androidFallback = false;
                if (!isCapacitorNative) {
                    const userAgent = navigator.userAgent || '';
                    console.log('🔍 Android fallback detection...');
                    console.log('User Agent:', userAgent);

                    // Strong Android app indicators
                    androidFallback = (
                        // Android WebView in app
                        (userAgent.includes('Android') && userAgent.includes('wv')) ||
                        // Your custom signature from Capacitor config
                        userAgent.includes('DocBearsComfortKitchen') ||
                        // Standard Capacitor signature
                        userAgent.includes('CapacitorWebView') ||
                        // File or Capacitor protocol
                        window.location.protocol === 'file:' ||
                        window.location.protocol === 'capacitor:' ||
                        // Android app without Chrome browser
                        (userAgent.includes('Android') && !userAgent.includes('Chrome/'))
                    );

                    if (androidFallback) {
                        detectionMethod = 'android-fallback';
                        console.log('📱 Android fallback detection: TRUE');
                    } else {
                        console.log('🌐 Android fallback detection: FALSE');
                    }
                }

                const finalResult = isCapacitorNative || androidFallback;

                console.log('🎯 FINAL DETECTION:', {
                    isCapacitorNative,
                    androidFallback,
                    finalResult,
                    detectionMethod,
                    userAgent: navigator.userAgent.substring(0, 100)
                });

                const debugMessage = `${finalResult ? 'NATIVE' : 'WEB'} via ${detectionMethod}`;
                setDebugInfo(debugMessage);
                setIsNativeApp(finalResult);

                // Store platform info globally and emit event
                if (typeof window !== 'undefined') {
                    window.platformInfo = {
                        isNative: finalResult,
                        isPWA: false,
                        isReady: true,
                        detectionMethod,
                        timestamp: Date.now()
                    };

                    const event = new CustomEvent('platformDetected', {
                        detail: {
                            isNative: finalResult,
                            detectionMethod,
                            debugMessage
                        }
                    });
                    window.dispatchEvent(event);
                    console.log('🚀 Platform event emitted:', event.detail);
                }

                console.log('🏁 === DETECTION COMPLETE ===');

            } catch (error) {
                console.error('💥 PLATFORM DETECTION ERROR:', error);

                // Emergency Android detection based on user agent only
                const userAgent = navigator.userAgent || '';
                const emergencyAndroid = userAgent.includes('Android') && !userAgent.includes('Chrome/');

                console.log('🚨 Emergency Android detection:', { userAgent, emergencyAndroid });

                setIsNativeApp(emergencyAndroid);
                setDebugInfo(`ERROR-RECOVERY: ${emergencyAndroid ? 'ANDROID' : 'WEB'}`);
            }
        };

        // Start detection with a small delay to let auth fix load
        setTimeout(() => {
            detectPlatform();
        }, 100);

        // Fallback timeout
        const fallbackTimer = setTimeout(() => {
            if (isNativeApp === null) {
                console.log('⏰ DETECTION TIMEOUT - Using emergency detection');

                const userAgent = navigator.userAgent || '';
                const timeoutDetection = (
                    userAgent.includes('Android') &&
                    (userAgent.includes('wv') || !userAgent.includes('Chrome/'))
                );

                console.log('🚨 Timeout detection result:', { userAgent, timeoutDetection });
                setIsNativeApp(timeoutDetection);
                setDebugInfo(`TIMEOUT: ${timeoutDetection ? 'ANDROID' : 'WEB'}`);
            }
        }, 3000);

        return () => clearTimeout(fallbackTimer);
    }, []);

    if (!mounted || isNativeApp === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">🔍 Detecting platform...</p>
                    {debugInfo && (
                        <p className="text-xs text-gray-400 mt-2 font-mono">{debugInfo}</p>
                    )}
                </div>
            </div>
        );
    }

    console.log(`🎯 RENDERING: ${isNativeApp ? '📱 NATIVE APP' : '🌐 WEB BROWSER'} (${debugInfo})`);

    if (isNativeApp) {
        return (
            <>
                {process.env.NODE_ENV === 'development' && (
                    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white text-xs p-2 text-center font-mono">
                        📱 NATIVE APP - {debugInfo}
                    </div>
                )}
                <NativeAuthHandler>
                    {children}
                </NativeAuthHandler>
            </>
        );
    } else {
        return (
            <>
                {process.env.NODE_ENV === 'development' && (
                    <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white text-xs p-2 text-center font-mono">
                        🌐 WEB BROWSER - {debugInfo}
                    </div>
                )}
                <PWAWrapper>
                    {children}
                </PWAWrapper>
            </>
        );
    }
}