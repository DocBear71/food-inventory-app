// file: /src/lib/unified-platform-detection.js - Create this new file to unify all platform detection

'use client';

if (typeof window !== 'undefined') {
    console.log('🌟 Unified platform detection system loaded');

    // Central platform state management
    class UnifiedPlatformManager {
        constructor() {
            this.platformInfo = null;
            this.listeners = new Set();
            this.isReady = false;
        }

        // Set the authoritative platform info (called by PlatformAwareWrapper)
        setPlatformInfo(info) {
            console.log('🌟 Setting authoritative platform info:', info);

            this.platformInfo = {
                ...info,
                timestamp: Date.now(),
                source: 'unified-manager'
            };

            this.isReady = true;

            // Store in multiple locations for maximum compatibility
            window.platformInfo = this.platformInfo;
            window.layoutPlatformInfo = this.platformInfo;
            window.unifiedPlatformInfo = this.platformInfo;

            // Legacy flags for old components
            window.isNativeApp = this.platformInfo.isNative;
            window.isAndroidApp = this.platformInfo.isNative && this.platformInfo.platform === 'android';
            window.isiOSApp = this.platformInfo.isNative && this.platformInfo.platform === 'ios';

            // Force update localStorage/sessionStorage
            try {
                if (this.platformInfo.isNative) {
                    localStorage.setItem('unified-platform', 'native');
                    localStorage.setItem('app-platform', this.platformInfo.platform);
                    sessionStorage.setItem('unified-platform', 'native');
                    sessionStorage.setItem('capacitor-platform', this.platformInfo.platform);
                } else {
                    localStorage.setItem('unified-platform', 'web');
                    sessionStorage.setItem('unified-platform', 'web');
                }
            } catch (e) {
                // Storage might not be available
            }

            // Notify all listeners
            this.notifyListeners();
        }

        // Get current platform info
        getPlatformInfo() {
            // If we have authoritative info, use it
            if (this.platformInfo) {
                return this.platformInfo;
            }

            // Try to get from window objects
            const candidates = [
                window.unifiedPlatformInfo,
                window.platformInfo,
                window.layoutPlatformInfo
            ];

            for (const candidate of candidates) {
                if (candidate && typeof candidate === 'object' && candidate.isReady) {
                    console.log('🌟 Found platform info from window object');
                    return candidate;
                }
            }

            // Try localStorage as fallback
            try {
                const storedPlatform = localStorage.getItem('unified-platform');
                if (storedPlatform) {
                    console.log('🌟 Using stored platform info:', storedPlatform);
                    return {
                        isNative: storedPlatform === 'native',
                        platform: localStorage.getItem('app-platform') || 'android',
                        source: 'localStorage-fallback',
                        isReady: true
                    };
                }
            } catch (e) {
                // Storage not available
            }

            console.log('🌟 No platform info available yet');
            return null;
        }

        // Subscribe to platform info changes
        subscribe(callback) {
            this.listeners.add(callback);

            // If we already have info, call immediately
            if (this.isReady && this.platformInfo) {
                setTimeout(() => callback(this.platformInfo), 0);
            }

            // Return unsubscribe function
            return () => {
                this.listeners.delete(callback);
            };
        }

        // Notify all listeners
        notifyListeners() {
            console.log('🌟 Notifying', this.listeners.size, 'platform listeners');

            this.listeners.forEach(callback => {
                try {
                    callback(this.platformInfo);
                } catch (error) {
                    console.error('🌟 Error in platform listener:', error);
                }
            });

            // Also dispatch global events for legacy compatibility
            const events = [
                'platformDetected',
                'unifiedPlatformUpdate',
                'forceNativeUpdate'
            ];

            events.forEach(eventName => {
                const event = new CustomEvent(eventName, {
                    detail: this.platformInfo
                });
                window.dispatchEvent(event);
            });
        }

        // Force all components to refresh with current platform info
        forceGlobalUpdate() {
            console.log('🌟 Forcing global platform update');

            if (!this.platformInfo) {
                console.log('🌟 No platform info to force update with');
                return;
            }

            // Update all window references
            window.platformInfo = this.platformInfo;
            window.layoutPlatformInfo = this.platformInfo;
            window.unifiedPlatformInfo = this.platformInfo;

            // Notify listeners
            this.notifyListeners();

            // Force component re-renders by updating React state if possible
            if (window.React && window.React.forceUpdate) {
                window.React.forceUpdate();
            }

            // Force update any React state updaters we can find
            if (window.__REACT_PLATFORM_UPDATERS__) {
                window.__REACT_PLATFORM_UPDATERS__.forEach(updater => {
                    try {
                        updater(this.platformInfo);
                    } catch (e) {
                        console.error('🌟 Error forcing React update:', e);
                    }
                });
            }
        }
    }

    // Create global instance
    window.UnifiedPlatformManager = window.UnifiedPlatformManager || new UnifiedPlatformManager();

    // Override common platform detection methods to use unified info
    const overridePlatformMethods = () => {
        const manager = window.UnifiedPlatformManager;

        // Override Capacitor.isNativePlatform for consistency
        if (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform) {
            const originalIsNative = window.Capacitor.isNativePlatform;

            window.Capacitor.isNativePlatform = function() {
                const unifiedInfo = manager.getPlatformInfo();
                if (unifiedInfo) {
                    console.log('🌟 Overriding Capacitor.isNativePlatform with unified info:', unifiedInfo.isNative);
                    return unifiedInfo.isNative;
                }
                return originalIsNative.call(this);
            };
        }

        // Helper function for components to get consistent platform info
        window.getUnifiedPlatformInfo = () => {
            return manager.getPlatformInfo();
        };

        // Helper function to check if native
        window.isUnifiedNative = () => {
            const info = manager.getPlatformInfo();
            return info ? info.isNative : false;
        };

        console.log('🌟 Platform detection methods overridden for consistency');
    };

    // Apply overrides
    overridePlatformMethods();

    // React integration helper
    window.useUnifiedPlatform = () => {
        if (typeof window.React !== 'undefined' && window.React.useState && window.React.useEffect) {
            const [platformInfo, setPlatformInfo] = window.React.useState(window.UnifiedPlatformManager.getPlatformInfo());

            window.React.useEffect(() => {
                const unsubscribe = window.UnifiedPlatformManager.subscribe(setPlatformInfo);
                return unsubscribe;
            }, []);

            return platformInfo;
        }

        // Fallback for non-React usage
        return window.UnifiedPlatformManager.getPlatformInfo();
    };

    // Register React state updater helper
    window.registerReactPlatformUpdater = (updater) => {
        window.__REACT_PLATFORM_UPDATERS__ = window.__REACT_PLATFORM_UPDATERS__ || [];
        window.__REACT_PLATFORM_UPDATERS__.push(updater);
    };

    // Listen for existing platform events and convert them to unified system
    const handleLegacyPlatformEvent = (event) => {
        if (event.detail && typeof event.detail === 'object') {
            console.log('🌟 Received legacy platform event, converting to unified:', event.detail);
            window.UnifiedPlatformManager.setPlatformInfo(event.detail);
        }
    };

    window.addEventListener('platformDetected', handleLegacyPlatformEvent);
    window.addEventListener('layoutPlatformDetected', handleLegacyPlatformEvent);

    // Periodically check for platform info if not set yet
    let checkCount = 0;
    const unifiedCheckInterval = setInterval(() => {
        checkCount++;

        if (!window.UnifiedPlatformManager.isReady) {
            // Try to find platform info from any source
            const candidates = [
                window.platformInfo,
                window.layoutPlatformInfo,
                window.unifiedPlatformInfo
            ];

            for (const candidate of candidates) {
                if (candidate && typeof candidate === 'object' && candidate.isReady) {
                    console.log('🌟 Found platform info during periodic check');
                    window.UnifiedPlatformManager.setPlatformInfo(candidate);
                    break;
                }
            }
        }

        if (window.UnifiedPlatformManager.isReady || checkCount >= 20) {
            clearInterval(unifiedCheckInterval);
        }
    }, 250);

    console.log('🌟 Unified platform detection system initialized');
}