// file: /src/hooks/usePWA.js v2 - iOS Safari compatible PWA hook
'use client';

import { useState, useEffect } from 'react';

export function usePWA() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

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

    return {
        isInstallable,
        isInstalled,
        installPWA,
        isIOS
    };
}