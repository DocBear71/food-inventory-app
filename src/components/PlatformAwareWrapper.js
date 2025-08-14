'use client';

// file: /src/components/PlatformAwareWrapper.js - DEBUG VERSION: Let's see what's actually happening

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
            console.log('🚀 === PLATFORM DETECTION DEBUG START ===');

            try {
                // Log everything we can see
                console.log('🔍 Window object checks:', {
                    hasCapacitor: typeof window !== 'undefined' && !!window.Capacitor,
                    windowLocation: window.location.href,
                    windowProtocol: window.location.protocol,
                    userAgent: navigator.userAgent,
                    hasProcess: typeof process !== 'undefined',
                    processEnv: process?.env?.NODE_ENV,
                    capacitorPlatform: process?.env?.CAPACITOR_PLATFORM
                });

                let isCapacitorNative = false;
                let buildTimeCheck = false;
                let hasAppSignature = false;

                // Method 1: Check Capacitor
                if (typeof window !== 'undefined' && window.Capacitor) {
                    console.log('✅ window.Capacitor exists!');
                    try {
                        const { Capacitor } = await import('@capacitor/core');
                        isCapacitorNative = Capacitor.isNativePlatform();
                        const platform = Capacitor.getPlatform();

                        console.log('📱 Capacitor details:', {
                            isNativePlatform: isCapacitorNative,
                            getPlatform: platform,
                            capacitorObject: !!Capacitor
                        });
                    } catch (capacitorError) {
                        console.log('❌ Capacitor import failed:', capacitorError);
                    }
                } else {
                    console.log('❌ window.Capacitor does not exist');
                }

                // Method 2: Build time check
                buildTimeCheck = process.env.CAPACITOR_PLATFORM === 'ios' ||
                    process.env.CAPACITOR_PLATFORM === 'android';
                console.log('🏗️ Build time check:', {
                    buildTimeCheck,
                    capacitorPlatform: process.env.CAPACITOR_PLATFORM,
                    nodeEnv: process.env.NODE_ENV
                });

                // Method 3: User Agent Analysis
                const userAgent = navigator.userAgent || '';
                hasAppSignature = userAgent.includes('CapacitorWebView') ||
                    userAgent.includes('DocBearsComfortKitchen');

                console.log('🔍 User Agent Analysis:', {
                    userAgent: userAgent,
                    hasCapacitorWebView: userAgent.includes('CapacitorWebView'),
                    hasDocBearsSignature: userAgent.includes('DocBearsComfortKitchen'),
                    hasAppSignature
                });

                // Method 4: Additional checks
                const protocolCheck = window.location.protocol === 'capacitor:' ||
                    window.location.protocol === 'file:';
                const hasNativeGlobals = typeof window.cordova !== 'undefined' ||
                    typeof window.PhoneGap !== 'undefined';

                console.log('🔍 Additional checks:', {
                    protocolCheck,
                    protocol: window.location.protocol,
                    hasNativeGlobals,
                    hasCordova: typeof window.cordova !== 'undefined',
                    hasPhoneGap: typeof window.PhoneGap !== 'undefined'
                });

                // Final decision
                const finalResult = isCapacitorNative || (buildTimeCheck && hasAppSignature);

                console.log('🎯 FINAL DECISION:', {
                    isCapacitorNative,
                    buildTimeCheck,
                    hasAppSignature,
                    finalResult,
                    logic: 'isCapacitorNative || (buildTimeCheck && hasAppSignature)'
                });

                const debugMessage = `RESULT: ${finalResult ? 'NATIVE' : 'WEB'} | Cap:${isCapacitorNative} | Build:${buildTimeCheck} | UA:${hasAppSignature}`;
                setDebugInfo(debugMessage);

                setIsNativeApp(finalResult);

                // Store globally and emit event
                if (typeof window !== 'undefined') {
                    window.platformInfo = {
                        isNative: finalResult,
                        isPWA: false,
                        isReady: true,
                        debug: {
                            isCapacitorNative,
                            buildTimeCheck,
                            hasAppSignature,
                            userAgent: userAgent.substring(0, 100)
                        }
                    };

                    const event = new CustomEvent('platformDetected', {
                        detail: {
                            isNative: finalResult,
                            debug: window.platformInfo.debug,
                            debugMessage
                        }
                    });
                    window.dispatchEvent(event);
                    console.log('🚀 Event emitted:', event.detail);
                }

                console.log('🏁 === PLATFORM DETECTION DEBUG END ===');

            } catch (error) {
                console.error('💥 PLATFORM DETECTION ERROR:', error);
                setIsNativeApp(false);
                setDebugInfo(`ERROR: ${error.message}`);
            }
        };

        detectPlatform();

        const fallbackTimer = setTimeout(() => {
            if (isNativeApp === null) {
                console.log('⏰ TIMEOUT: Defaulting to web');
                setIsNativeApp(false);
                setDebugInfo('TIMEOUT: Defaulted to web');
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

    console.log(`🎯 RENDERING: ${isNativeApp ? '📱 NATIVE WRAPPER' : '🌐 WEB BROWSER'}`);

    if (isNativeApp) {
        return (
            <>
                <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white text-xs p-2 text-center font-mono">
                    📱 NATIVE APP DETECTED - {debugInfo}
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
                <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white text-xs p-2 text-center font-mono">
                    🌐 WEB BROWSER DETECTED - {debugInfo}
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