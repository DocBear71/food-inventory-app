// file: /src/components/mobile/PWAInstallBanner.js v3 - SMART Install banner component
'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export function PWAInstallBanner() {
    const { isInstallable, isInstalled, installPWA } = usePWA();
    const [dismissed, setDismissed] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    // Check if running in standalone mode (PWA is already installed and running)
    useEffect(() => {
        const checkStandalone = () => {
            // Check if running in standalone mode
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone ||
                document.referrer.includes('android-app://');
            setIsStandalone(isStandaloneMode);
        };

        checkStandalone();

        // Check session storage for dismissal
        const wasDismissed = sessionStorage.getItem('pwa-install-dismissed') === 'true';
        if (wasDismissed) {
            setDismissed(true);
        }
    }, []);

    // Don't show if:
    // - Already installed
    // - Not installable
    // - Dismissed this session
    // - Running in standalone mode (already installed and launched as PWA)
    if (isInstalled || !isInstallable || dismissed || isStandalone) {
        return null;
    }

    const handleInstall = async () => {
        const success = await installPWA();
        if (!success) {
            setDismissed(true);
            sessionStorage.setItem('pwa-install-dismissed', 'true');
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        // Remember dismissal for this session
        sessionStorage.setItem('pwa-install-dismissed', 'true');
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-indigo-600 text-white p-3 shadow-lg pwa-install-banner">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="bg-white p-1.5 rounded-lg flex-shrink-0">
                        <span className="text-indigo-600 text-lg">📱</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate">Install Doc Bear's Comfort Kitchen</h3>
                        <p className="text-indigo-100 text-xs truncate">
                            Add to home screen for quick access
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                    <TouchEnhancedButton
                        onClick={handleDismiss}
                        className="text-indigo-200 hover:text-white p-1 rounded"
                        aria-label="Dismiss"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={handleInstall}
                        className="bg-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-50 active:bg-indigo-100 transition-colors flex-shrink-0"
                        style={{ color: '#4f46e5' }}
                    >
                        Install
                    </TouchEnhancedButton>
                </div>
            </div>
        </div>
    );
}