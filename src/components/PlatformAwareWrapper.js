'use client';

// file: /src/components/PlatformAwareWrapper.js v3 - ENHANCED: Platform info events for landing page

import { useState, useEffect } from 'react';
import PWAWrapper from '@/components/PWAWrapper';
import NativeAuthHandler from '@/components/NativeAuthHandler';

export default function PlatformAwareWrapper({ children }) {
    const [isNativeApp, setIsNativeApp] = useState(null); // null = loading, true/false = determined
    const [mounted, setMounted] = useState(false);
    const [debugInfo, setDebugInfo] = useState('');

    useEffect(() => {
        setMounted(true);

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

                // FIXED: Be more conservative - only consider native if we have strong indicators
                const finalResult = isCapacitorNative || (buildTimeCheck && hasAppSignature);

                const debugMessage = `Platform: ${finalResult ? 'Native' : 'Web/PWA'} (Capacitor: ${isCapacitorNative}, Build: ${buildTimeCheck}, UA: ${hasAppSignature})`;
                setDebugInfo(debugMessage);

                console.log('🔍 Platform Detection in Layout:', {
                    capacitorNative: isCapacitorNative,
                    buildTimeCheck,
                    hasAppSignature,
                    userAgent: userAgent.substring(0, 60) + '...',
                    finalResult,
                    debugMessage
                });

                setIsNativeApp(finalResult);

                // ADDED: Emit platform detection event for landing page
                if (typeof window !== 'undefined') {
                    // Store platform info globally for immediate access
                    window.platformInfo = {
                        isNative: finalResult,
                        isPWA: false, // Will be updated by PWAWrapper if needed
                        isReady: true
                    };

                    // Emit custom event
                    const event = new CustomEvent('platformDetected', {
                        detail: {
                            isNative: finalResult,
                            isCapacitor: isCapacitorNative,
                            buildTime: buildTimeCheck,
                            hasSignature: hasAppSignature,
                            userAgent: userAgent.substring(0, 60),
                            debugMessage
                        }
                    });
                    window.dispatchEvent(event);
                    console.log('🚀 Platform detection event emitted:', event.detail);
                }

            } catch (error) {
                console.error('Platform detection failed:', error);
                // FIXED: Default to web/PWA if detection fails (more common case)
                setIsNativeApp(false);
                setDebugInfo('Detection failed, defaulting to web');

                // ADDED: Emit fallback event
                if (typeof window !== 'undefined') {
                    window.platformInfo = {
                        isNative: false,
                        isPWA: false,
                        isReady: true
                    };

                    const event = new CustomEvent('platformDetected', {
                        detail: {
                            isNative: false,
                            error: error.message,
                            debugMessage: 'Detection failed, defaulting to web'
                        }
                    });
                    window.dispatchEvent(event);
                }
            }
        };

        // FIXED: Reduce delay and add immediate detection
        detectPlatform();

        // Also set a fallback timeout to prevent infinite loading
        const fallbackTimer = setTimeout(() => {
            if (isNativeApp === null) {
                console.log('⚠️ Platform detection timeout, defaulting to web');
                setIsNativeApp(false);
                setDebugInfo('Detection timeout, defaulting to web');

                // ADDED: Emit timeout event
                if (typeof window !== 'undefined') {
                    window.platformInfo = {
                        isNative: false,
                        isPWA: false,
                        isReady: true
                    };

                    const event = new CustomEvent('platformDetected', {
                        detail: {
                            isNative: false,
                            timeout: true,
                            debugMessage: 'Detection timeout, defaulting to web'
                        }
                    });
                    window.dispatchEvent(event);
                }
            }
        }, 2000); // 2 second timeout

        return () => clearTimeout(fallbackTimer);
    }, []);

    // FIXED: Reduce loading time and provide better feedback
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

    // FIXED: Add debug info to help troubleshoot
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