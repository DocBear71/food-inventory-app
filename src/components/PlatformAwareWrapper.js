'use client';

// file: /src/components/PlatformAwareWrapper.js - Runtime platform detection wrapper

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import PWAWrapper from '@/components/PWAWrapper';
import NativeAuthHandler from '@/components/NativeAuthHandler';

export default function PlatformAwareWrapper({ children }) {
    const [isNativeApp, setIsNativeApp] = useState(null); // null = loading, true/false = determined
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Runtime detection of platform
        const detectPlatform = () => {
            try {
                // Primary check: Capacitor native platform detection
                const isCapacitorNative = Capacitor.isNativePlatform();

                // Additional checks for edge cases
                const buildTimeCheck = process.env.CAPACITOR_PLATFORM === 'ios' ||
                    process.env.CAPACITOR_PLATFORM === 'android';

                // Check user agent for mobile app indicators (backup)
                const userAgent = navigator.userAgent || '';
                const hasAppSignature = userAgent.includes('CapacitorWebView') ||
                    userAgent.includes('DocBearsComfortKitchen');

                const finalResult = isCapacitorNative || buildTimeCheck || hasAppSignature;

                console.log('🔍 Platform Detection in Layout:', {
                    capacitorNative: isCapacitorNative,
                    buildTimeCheck,
                    hasAppSignature,
                    userAgent: userAgent.substring(0, 60) + '...',
                    finalResult
                });

                setIsNativeApp(finalResult);
            } catch (error) {
                console.error('Platform detection failed:', error);
                // Default to web if detection fails
                setIsNativeApp(false);
            }
        };

        // Small delay to ensure Capacitor is fully initialized
        const timer = setTimeout(detectPlatform, 100);

        return () => clearTimeout(timer);
    }, []);

    // Show loading state during SSR and initial platform detection
    if (!mounted || isNativeApp === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your kitchen...</p>
                </div>
            </div>
        );
    }

    // Render appropriate wrapper based on platform
    if (isNativeApp) {
        console.log('📱 Rendering native app wrapper');
        return (
            <NativeAuthHandler>
                {children}
            </NativeAuthHandler>
        );
    } else {
        console.log('🌐 Rendering web app wrapper with PWA features');
        return (
            <PWAWrapper>
                {children}
            </PWAWrapper>
        );
    }
}