'use client';

// file: /src/hooks/usePlatform.js v1

import { useState, useEffect } from 'react';

export function usePlatform() {
    const [platform, setPlatform] = useState({
        type: 'web', // 'web', 'android', 'ios'
        isWeb: true,
        isAndroid: false,
        isIOS: false,
        isNative: false,
        billingProvider: 'stripe' // 'stripe', 'googleplay', 'appstore'
    });

    useEffect(() => {
        const detectPlatform = async () => {
            // Check if we're in a Capacitor environment
            if (typeof window !== 'undefined') {
                try {
                    // Dynamic import to avoid SSR issues
                    const { Capacitor } = await import('@capacitor/core');

                    if (Capacitor.isNativePlatform()) {
                        const platformType = Capacitor.getPlatform();

                        setPlatform({
                            type: platformType,
                            isWeb: false,
                            isAndroid: platformType === 'android',
                            isIOS: platformType === 'ios',
                            isNative: true,
                            billingProvider: platformType === 'android' ? 'googleplay' :
                                platformType === 'ios' ? 'appstore' : 'stripe'
                        });
                    } else {
                        // Web environment
                        setPlatform({
                            type: 'web',
                            isWeb: true,
                            isAndroid: false,
                            isIOS: false,
                            isNative: false,
                            billingProvider: 'stripe'
                        });
                    }
                } catch (error) {
                    console.log('Capacitor not available, assuming web environment');
                    // Fallback to web if Capacitor isn't available
                    setPlatform({
                        type: 'web',
                        isWeb: true,
                        isAndroid: false,
                        isIOS: false,
                        isNative: false,
                        billingProvider: 'stripe'
                    });
                }
            }
        };

        detectPlatform();
    }, []);

    return platform;
}