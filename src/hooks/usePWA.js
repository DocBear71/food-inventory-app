// file: /src/hooks/usePWA.js - PWA installation hook
'use client';

import { useState, useEffect } from 'react';

export function usePWA() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true) {
            setIsInstalled(true);
        }

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
    }, []);

    const installPWA = async () => {
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
        installPWA
    };
}