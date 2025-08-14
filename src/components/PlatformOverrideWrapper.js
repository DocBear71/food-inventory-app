'use client';

// file: /src/components/PlatformOverrideWrapper.js - Force correct platform info for problematic components

import { useEffect, useState } from 'react';

export default function PlatformOverrideWrapper({ children, componentName = 'Unknown' }) {
    const [unifiedInfo, setUnifiedInfo] = useState(null);
    const [forceUpdate, setForceUpdate] = useState(0);

    useEffect(() => {
        console.log(`🔧 PlatformOverrideWrapper for ${componentName} mounting`);

        // Function to get and apply unified platform info
        const applyUnifiedInfo = () => {
            let info = null;

            // Try multiple sources in order of preference
            if (window.UnifiedPlatformManager) {
                info = window.UnifiedPlatformManager.getPlatformInfo();
            }

            if (!info && window.unifiedPlatformInfo) {
                info = window.unifiedPlatformInfo;
            }

            if (!info && window.platformInfo && window.platformInfo.isReady) {
                info = window.platformInfo;
            }

            if (!info && window.layoutPlatformInfo) {
                info = window.layoutPlatformInfo;
            }

            if (info) {
                console.log(`🔧 ${componentName}: Applying unified platform info:`, info);
                setUnifiedInfo(info);

                // FORCE override any existing window.platformInfo that components might be reading
                window.platformInfo = {
                    ...info,
                    isNative: info.isNative,
                    isPWA: info.isPWA || false,
                    isReady: true,
                    statusBarHeight: info.statusBarHeight || (info.isNative ? 24 : 0),
                    // Ensure all the properties that MobileDashboardLayout expects
                    capacitorNative: info.isNative,
                    standalonePWA: info.standalonePWA || false,
                    androidWebView: info.androidWebView || (info.isNative && info.platform === 'android'),
                    iOSApp: info.iOSApp || (info.isNative && info.platform === 'ios'),
                    fromAndroidApp: info.fromAndroidApp || (info.isNative && info.platform === 'android')
                };

                // Also force other window properties
                window.isNativeApp = info.isNative;
                window.isAndroidApp = info.isNative && info.platform === 'android';
                window.isiOSApp = info.isNative && info.platform === 'ios';

                // Trigger force update
                setForceUpdate(prev => prev + 1);

                console.log(`✅ ${componentName}: Platform info forcefully applied`);
                return true;
            }

            console.log(`⚠️ ${componentName}: No unified platform info available yet`);
            return false;
        };

        // Try immediately
        const success = applyUnifiedInfo();

        if (!success) {
            // If not successful, set up listeners and periodic checks
            const handleUnifiedUpdate = (event) => {
                console.log(`🔧 ${componentName}: Received unified platform update`);
                applyUnifiedInfo();
            };

            // Listen for platform events
            const events = ['platformDetected', 'unifiedPlatformUpdate', 'forceNativeUpdate'];
            events.forEach(eventName => {
                window.addEventListener(eventName, handleUnifiedUpdate);
            });

            // Subscribe to unified manager if available
            let unsubscribe = null;
            if (window.UnifiedPlatformManager) {
                unsubscribe = window.UnifiedPlatformManager.subscribe((info) => {
                    console.log(`🔧 ${componentName}: Unified manager update:`, info);
                    applyUnifiedInfo();
                });
            }

            // Periodic check for the first few seconds
            let checkCount = 0;
            const checkInterval = setInterval(() => {
                checkCount++;
                const success = applyUnifiedInfo();

                if (success || checkCount >= 10) {
                    clearInterval(checkInterval);
                }
            }, 500);

            // Cleanup
            return () => {
                events.forEach(eventName => {
                    window.removeEventListener(eventName, handleUnifiedUpdate);
                });

                if (unsubscribe) {
                    unsubscribe();
                }

                clearInterval(checkInterval);
            };
        }
    }, [componentName]);

    // Additional effect to monitor and override platform info changes
    useEffect(() => {
        if (!unifiedInfo?.isNative) return;

        // Monitor for any attempts to override platform info incorrectly
        const monitorInterval = setInterval(() => {
            const currentPlatformInfo = window.platformInfo;

            if (currentPlatformInfo &&
                unifiedInfo.isNative &&
                !currentPlatformInfo.isNative) {

                console.log(`🚨 ${componentName}: Platform info was incorrectly overridden! Fixing...`);
                console.log('Expected:', unifiedInfo);
                console.log('Found:', currentPlatformInfo);

                // Force correct it
                window.platformInfo = {
                    ...unifiedInfo,
                    isNative: true,
                    isReady: true,
                    statusBarHeight: unifiedInfo.statusBarHeight || 24
                };

                setForceUpdate(prev => prev + 1);
            }
        }, 1000);

        return () => clearInterval(monitorInterval);
    }, [unifiedInfo, componentName]);

    // Don't render until we have platform info or after timeout
    if (!unifiedInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading {componentName}...</p>
                    <p className="text-xs text-gray-400">Force update #{forceUpdate}</p>
                </div>
            </div>
        );
    }

    console.log(`🎯 ${componentName}: Rendering with unified platform info:`, unifiedInfo);

    return children;
}