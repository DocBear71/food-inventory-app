// file: /src/hooks/usePWA.js v3 - Enhanced with new mobile features for Doc Bear's Comfort Kitchen
'use client';

import { useState, useEffect, useCallback } from 'react';

export function usePWA() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [swRegistration, setSwRegistration] = useState(null);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        // Check if running on iOS
        const checkIsIOS = () => {
            return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        };

        // Check if already installed
        const checkIsInstalled = () => {
            return window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true ||
                document.referrer.includes('android-app://');
        };

        const isiOS = checkIsIOS();
        const isInstalledPWA = checkIsInstalled();

        setIsIOS(isiOS);
        setIsInstalled(isInstalledPWA);

        // For iOS devices, we can show install prompt if:
        // - Not already installed
        // - Running in Safari (not in PWA mode)
        if (isiOS) {
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            setIsInstallable(!isInstalledPWA && isSafari);
        } else {
            // For non-iOS, use existing logic
            // Listen for install prompt
            const handleBeforeInstallPrompt = (e) => {
                e.preventDefault();
                setDeferredPrompt(e);
                setIsInstallable(true);
            };

            // Listen for successful installation
            const handleAppInstalled = () => {
                setIsInstalled(true);
                setIsInstallable(false);
                setDeferredPrompt(null);

                // Track installation
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'pwa_install', {
                        event_category: 'engagement',
                        event_label: 'PWA Installation'
                    });
                }
            };

            window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.addEventListener('appinstalled', handleAppInstalled);

            return () => {
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
                window.removeEventListener('appinstalled', handleAppInstalled);
            };
        }
    }, []);

    // NEW: Monitor online/offline status
    useEffect(() => {
        const updateOnlineStatus = () => {
            setIsOnline(navigator.onLine);

            if (navigator.onLine) {
                // Trigger background sync when back online
                if (swRegistration && 'sync' in swRegistration) {
                    swRegistration.sync.register('inventory-sync');
                    swRegistration.sync.register('shopping-sync');
                    swRegistration.sync.register('recipe-sync');
                }
            }
        };

        setIsOnline(navigator.onLine);
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }, [swRegistration]);

    // NEW: Enhanced service worker registration
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            registerEnhancedServiceWorker();
        }
    }, []);

    const registerEnhancedServiceWorker = async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            setSwRegistration(registration);
            console.log('✅ Enhanced Service Worker registered:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            setUpdateAvailable(true);
                            console.log('🔄 App update available');
                        }
                    });
                }
            });

            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'SYNC_SUCCESS') {
                    console.log('✅ Sync completed:', event.data.data);
                    // Could trigger a toast notification here
                }
            });

        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
        }
    };

    const installPWA = async () => {
        if (isIOS) {
            // For iOS, we can't programmatically install
            // Return false to indicate manual installation needed
            return false;
        }

        if (!deferredPrompt) return false;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsInstallable(false);
            setDeferredPrompt(null);
            return true;
        }

        return false;
    };

    // NEW: Update the PWA
    const updatePWA = useCallback(() => {
        if (swRegistration && swRegistration.waiting) {
            swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
        }
    }, [swRegistration]);

    // NEW: Share content using Web Share API
    const shareContent = useCallback(async (data) => {
        if (navigator.share) {
            try {
                await navigator.share(data);
                return true;
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Share failed:', error);
                }
                return false;
            }
        } else {
            // Fallback for browsers without Web Share API
            if (navigator.clipboard && data.text) {
                try {
                    await navigator.clipboard.writeText(data.text);
                    return true;
                } catch (error) {
                    console.error('Clipboard write failed:', error);
                }
            }
            return false;
        }
    }, []);

    // NEW: Request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }, []);

    // NEW: Show local notification
    const showNotification = useCallback(async (title, options = {}) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            if (swRegistration) {
                // Use service worker to show notification (better for PWAs)
                await swRegistration.showNotification(title, {
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/icon-72x72.png',
                    ...options
                });
            } else {
                // Fallback to regular notification
                new Notification(title, {
                    icon: '/icons/icon-192x192.png',
                    ...options
                });
            }
            return true;
        }
        return false;
    }, [swRegistration]);

    // NEW: Cache shopping list for offline access
    const cacheShoppingList = useCallback(async (listData) => {
        if ('caches' in window) {
            try {
                const cache = await caches.open('food-inventory-v1');
                const response = new Response(JSON.stringify(listData), {
                    headers: { 'Content-Type': 'application/json' }
                });
                await cache.put(`/offline/shopping-list/${listData.id}`, response);
                return true;
            } catch (error) {
                console.error('Failed to cache shopping list:', error);
                return false;
            }
        }
        return false;
    }, []);

    // NEW: Get cached shopping lists
    const getCachedShoppingLists = useCallback(async () => {
        if ('caches' in window) {
            try {
                const cache = await caches.open('food-inventory-v1');
                const keys = await cache.keys();
                const lists = [];

                for (const request of keys) {
                    if (request.url.includes('/offline/shopping-list/')) {
                        const response = await cache.match(request);
                        if (response) {
                            const data = await response.json();
                            lists.push(data);
                        }
                    }
                }

                return lists;
            } catch (error) {
                console.error('Failed to get cached shopping lists:', error);
                return [];
            }
        }
        return [];
    }, []);

    // NEW: Check device capabilities
    const getDeviceCapabilities = useCallback(() => {
        return {
            camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
            geolocation: 'geolocation' in navigator,
            vibration: 'vibrate' in navigator,
            share: 'share' in navigator,
            clipboard: 'clipboard' in navigator,
            notifications: 'Notification' in window,
            serviceWorker: 'serviceWorker' in navigator,
            webShare: 'share' in navigator,
            fileHandling: 'launchQueue' in window,
            badging: 'setAppBadge' in navigator,
            wakeLock: 'wakeLock' in navigator
        };
    }, []);

    // NEW: Set app badge (Android/iOS)
    const setAppBadge = useCallback(async (count = 0) => {
        if ('setAppBadge' in navigator) {
            try {
                if (count > 0) {
                    await navigator.setAppBadge(count);
                } else {
                    await navigator.clearAppBadge();
                }
                return true;
            } catch (error) {
                console.error('Failed to set app badge:', error);
                return false;
            }
        }
        return false;
    }, []);

    // NEW: Vibrate device (mobile feedback)
    const vibrateDevice = useCallback((pattern = [200]) => {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
            return true;
        }
        return false;
    }, []);

    // NEW: Wake lock for active sessions
    const requestWakeLock = useCallback(async () => {
        if ('wakeLock' in navigator) {
            try {
                const wakeLock = await navigator.wakeLock.request('screen');
                console.log('🔆 Screen wake lock activated');
                return wakeLock;
            } catch (error) {
                console.error('Wake lock request failed:', error);
                return null;
            }
        }
        return null;
    }, []);

    return {
        // Existing functionality
        isInstallable,
        isInstalled,
        installPWA,
        isIOS,

        // NEW: Enhanced PWA features
        isOnline,
        updateAvailable,
        swRegistration,
        updatePWA,
        shareContent,
        requestNotificationPermission,
        showNotification,
        cacheShoppingList,
        getCachedShoppingLists,
        setAppBadge,
        vibrateDevice,
        requestWakeLock,
        getDeviceCapabilities
    };
}

