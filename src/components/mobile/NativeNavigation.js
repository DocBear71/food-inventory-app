'use client';
// file: /src/components/mobile/NativeNavigation.js v1 - Native iOS navigation system

import { PlatformDetection } from '@/utils/PlatformDetection';

import {TouchEnhancedButton} from "@/components/mobile/TouchEnhancedButton";

/**
 * Native iOS Navigation System
 * Provides native iOS navigation patterns with swipe gestures and native transitions
 * Falls back to Next.js router on non-iOS platforms for seamless cross-platform compatibility
 */
export class NativeNavigation {

    /**
     * Navigate back using native iOS patterns or web fallback
     * @param {Object} [options] - Navigation options
     * @param {Object} [options.router] - Next.js router instance (required for non-iOS)
     * @param {Function} [options.onComplete] - Callback when navigation completes
     * @param {boolean} [options.animated=true] - Use animation (iOS only)
     */
    static async goBack({ router, onComplete, animated = true } = {}) {
        try {
            if (PlatformDetection.isIOS()) {
                // Use native iOS navigation controller
                const { App } = await import('@capacitor/app');

                console.log('🎯 Using native iOS back navigation');

                // Trigger haptic feedback for navigation
                try {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.navigationChange();
                } catch (error) {
                    console.log('Navigation haptic failed:', error);
                }

                // Check if we can go back in the app history
                // For iOS, we'll use the Capacitor App plugin to handle back navigation
                await App.addListener('backButton', () => {
                    // This handles hardware back button and swipe gestures
                    if (router) {
                        router.back();
                    } else {
                        window.history.back();
                    }
                });

                // For immediate navigation, still use router but with iOS optimizations
                if (router) {
                    router.back();
                } else {
                    window.history.back();
                }

                if (onComplete) {
                    // Give time for native transition
                    setTimeout(onComplete, animated ? 350 : 0);
                }

                return { success: true, platform: 'ios' };
            } else {
                // Standard Next.js navigation for Web/PWA/Android
                console.log('🌐 Using standard web navigation');

                if (router) {
                    router.back();
                } else {
                    window.history.back();
                }

                if (onComplete) {
                    setTimeout(onComplete, 0);
                }

                return { success: true, platform: 'web' };
            }
        } catch (error) {
            console.warn('Native navigation failed, using web fallback:', error);

            // Fallback to standard navigation
            if (router) {
                router.back();
            } else {
                window.history.back();
            }

            if (onComplete) {
                onComplete();
            }

            return { success: false, error: error.message, platform: 'fallback' };
        }
    }

    /**
     * Navigate to a specific route using native iOS patterns or web routing
     * @param {Object} options - Navigation options
     * @param {string} options.path - Route path to navigate to
     * @param {Object} [options.router] - Next.js router instance (required for non-iOS)
     * @param {Function} [options.onComplete] - Callback when navigation completes
     * @param {boolean} [options.replace=false] - Replace current route instead of pushing
     * @param {boolean} [options.animated=true] - Use animation (iOS only)
     */
    static async navigateTo({ path, router, onComplete, replace = false, animated = true }) {
        try {
            if (PlatformDetection.isIOS()) {
                console.log('🎯 Using native iOS navigation to:', path);

                // Trigger haptic feedback for navigation
                try {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.navigationChange();
                } catch (error) {
                    console.log('Navigation haptic failed:', error);
                }

                // Use Next.js router but with iOS optimizations
                if (router) {
                    if (replace) {
                        await router.replace(path);
                    } else {
                        await router.push(path);
                    }
                } else {
                    if (replace) {
                        window.location.replace(path);
                    } else {
                        window.location.href = path;
                    }
                }

                if (onComplete) {
                    // Give time for native transition
                    setTimeout(onComplete, animated ? 350 : 0);
                }

                return { success: true, platform: 'ios', path };
            } else {
                // Standard Next.js navigation for Web/PWA/Android
                console.log('🌐 Using standard web navigation to:', path);

                if (router) {
                    if (replace) {
                        await router.replace(path);
                    } else {
                        await router.push(path);
                    }
                } else {
                    if (replace) {
                        window.location.replace(path);
                    } else {
                        window.location.href = path;
                    }
                }

                if (onComplete) {
                    setTimeout(onComplete, 0);
                }

                return { success: true, platform: 'web', path };
            }
        } catch (error) {
            console.warn('Native navigation failed, using fallback:', error);

            // Fallback to standard navigation
            if (router) {
                if (replace) {
                    router.replace(path);
                } else {
                    router.push(path);
                }
            } else {
                if (replace) {
                    window.location.replace(path);
                } else {
                    window.location.href = path;
                }
            }

            if (onComplete) {
                onComplete();
            }

            return { success: false, error: error.message, platform: 'fallback', path };
        }
    }

    /**
     * Navigate to external URL using platform-appropriate method
     * @param {Object} options - Navigation options
     * @param {string} options.url - External URL to navigate to
     * @param {boolean} [options.openInApp=false] - Open in app browser (iOS only)
     * @param {Function} [options.onComplete] - Callback when navigation completes
     */
    static async navigateExternal({ url, openInApp = false, onComplete }) {
        try {
            if (PlatformDetection.isIOS()) {
                console.log('🎯 iOS external navigation:', url);

                if (openInApp) {
                    // Use Capacitor Browser for in-app browsing on iOS
                    const { Browser } = await import('@capacitor/browser');

                    await Browser.open({
                        url,
                        windowName: '_blank',
                        toolbarColor: '#4f46e5',
                        presentationStyle: 'popover'
                    });
                } else {
                    // Open in external Safari
                    window.open(url, '_blank');
                }

                if (onComplete) {
                    onComplete();
                }

                return { success: true, platform: 'ios', url };
            } else {
                // Standard web navigation for Web/PWA/Android
                console.log('🌐 Web external navigation:', url);

                window.open(url, '_blank');

                if (onComplete) {
                    onComplete();
                }

                return { success: true, platform: 'web', url };
            }
        } catch (error) {
            console.warn('External navigation failed:', error);

            // Fallback to standard window.open
            window.open(url, '_blank');

            if (onComplete) {
                onComplete();
            }

            return { success: false, error: error.message, platform: 'fallback', url };
        }
    }

    /**
     * Enable native iOS swipe-to-go-back gesture support
     * Call this in your layout component or page initialization
     * @param {Object} [options] - Gesture options
     * @param {Object} [options.router] - Next.js router instance
     * @param {Function} [options.onSwipeBack] - Custom swipe back handler
     */
    static async enableSwipeGestures({ router, onSwipeBack } = {}) {
        try {
            if (PlatformDetection.isIOS()) {
                console.log('🎯 Enabling native iOS swipe gestures');

                // Add hardware back button support for iOS
                const { App } = await import('@capacitor/app');

                App.addListener('backButton', async (data) => {
                    console.log('🎯 iOS back gesture detected');

                    // Trigger haptic feedback
                    try {
                        const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                        await MobileHaptics.navigationChange();
                    } catch (error) {
                        console.log('Gesture haptic failed:', error);
                    }

                    if (onSwipeBack) {
                        onSwipeBack(data);
                    } else {
                        this.goBack({ router });
                    }
                });

                return { success: true, platform: 'ios' };
            } else {
                // No additional setup needed for web platforms
                console.log('🌐 Swipe gestures handled by browser');
                return { success: true, platform: 'web' };
            }
        } catch (error) {
            console.warn('Swipe gesture setup failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set native iOS navigation bar appearance
     * @param {Object} options - Navigation bar options
     * @param {string} [options.title] - Navigation title
     * @param {string} [options.backgroundColor] - Background color
     * @param {boolean} [options.translucent=true] - Translucent appearance
     * @param {Array} [options.buttons] - Navigation bar buttons
     */
    static async setNavigationBar({ title, backgroundColor = '#4f46e5', translucent = true, buttons = [] }) {
        try {
            if (PlatformDetection.isIOS()) {
                console.log('🎯 Setting native iOS navigation bar');

                // Use Capacitor StatusBar for iOS-specific styling
                const { StatusBar } = await import('@capacitor/status-bar');

                await StatusBar.setStyle({
                    style: translucent ? 'light' : 'dark'
                });

                await StatusBar.setBackgroundColor({
                    color: backgroundColor
                });

                return { success: true, platform: 'ios' };
            } else {
                // Web platforms use CSS styling
                console.log('🌐 Navigation bar handled by CSS');
                return { success: true, platform: 'web' };
            }
        } catch (error) {
            console.warn('Navigation bar setup failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if native navigation is available
     * @returns {boolean} True if native navigation is available
     */
    static isNativeAvailable() {
        return PlatformDetection.isIOS();
    }

    /**
     * Get navigation platform info for debugging
     * @returns {Object} Platform navigation information
     */
    static getPlatformInfo() {
        return {
            isIOS: PlatformDetection.isIOS(),
            platformInfo: PlatformDetection.getPlatformInfo(),
            nativeNavigationAvailable: this.isNativeAvailable(),
            features: {
                swipeGestures: PlatformDetection.isIOS(),
                nativeBar: PlatformDetection.isIOS(),
                hapticNavigation: PlatformDetection.isIOS()
            }
        };
    }

    /**
     * Convenience function to replace window.history.back()
     * @param {Object} [options] - Navigation options
     */
    static async historyBack(options = {}) {
        return this.goBack(options);
    }

    /**
     * Convenience function to replace router.back()
     * @param {Object} router - Next.js router instance
     * @param {Object} [options] - Additional navigation options
     */
    static async routerBack(router, options = {}) {
        return this.goBack({ router, ...options });
    }

    /**
     * Convenience function to replace router.push()
     * @param {Object} router - Next.js router instance
     * @param {string} path - Route path
     * @param {Object} [options] - Additional navigation options
     */
    static async routerPush(router, path, options = {}) {
        return this.navigateTo({ router, path, ...options });
    }

    /**
     * Convenience function to replace router.replace()
     * @param {Object} router - Next.js router instance
     * @param {string} path - Route path
     * @param {Object} [options] - Additional navigation options
     */
    static async routerReplace(router, path, options = {}) {
        return this.navigateTo({ router, path, replace: true, ...options });
    }
}

/**
 * React Hook for Native Navigation
 * Provides easy access to native navigation in React components
 */
export function useNativeNavigation() {
    const isIOS = PlatformDetection.isIOS();

    return {
        goBack: (options) => NativeNavigation.goBack(options),
        navigateTo: (options) => NativeNavigation.navigateTo(options),
        navigateExternal: (options) => NativeNavigation.navigateExternal(options),
        enableSwipeGestures: (options) => NativeNavigation.enableSwipeGestures(options),
        setNavigationBar: (options) => NativeNavigation.setNavigationBar(options),
        isNative: isIOS,
        platformInfo: NativeNavigation.getPlatformInfo()
    };
}

/**
 * Enhanced Navigation Button Component
 * Drop-in replacement for back buttons with native iOS behavior
 */
export function NativeBackButton({
                                     router,
                                     children = '← Back',
                                     className = '',
                                     onComplete,
                                     style = 'default' // 'default', 'minimal', 'prominent'
                                 }) {


    const handleClick = async () => {
        await NativeNavigation.goBack({ router, onComplete });
    };

    const getStyleClasses = () => {
        const baseClasses = 'inline-flex items-center';

        switch (style) {
            case 'minimal':
                return `${baseClasses} text-gray-600 hover:text-gray-800 px-2 py-1`;
            case 'prominent':
                return `${baseClasses} bg-indigo-600 text-white px-4 py-3 rounded-md hover:bg-indigo-700 min-h-[48px]`;
            default:
                return `${baseClasses} px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50`;
        }
    };

    return (
        <TouchEnhancedButton
            onClick={handleClick}
            className={`${getStyleClasses()} ${className}`}
        >
            {children}
        </TouchEnhancedButton>
    );
}

/**
 * Enhanced Navigation Link Component
 * Drop-in replacement for navigation links with native iOS behavior
 */
export function NativeNavLink({
                                  href,
                                  router,
                                  children,
                                  className = '',
                                  replace = false,
                                  external = false,
                                  onComplete
                              }) {


    const handleClick = async (e) => {
        e.preventDefault();

        if (external) {
            await NativeNavigation.navigateExternal({
                url: href,
                onComplete
            });
        } else {
            await NativeNavigation.navigateTo({
                path: href,
                router,
                replace,
                onComplete
            });
        }
    };

    return (
        <TouchEnhancedButton
            onClick={handleClick}
            className={className}
        >
            {children}
        </TouchEnhancedButton>
    );
}

export default NativeNavigation;