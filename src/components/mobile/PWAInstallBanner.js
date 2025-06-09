// file: /src/components/mobile/PWAInstallBanner.js - Install banner component
'use client';

import { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export function PWAInstallBanner() {
    const { isInstallable, isInstalled, installPWA } = usePWA();
    const [dismissed, setDismissed] = useState(false);

    // Don't show if already installed, not installable, or dismissed
    if (isInstalled || !isInstallable || dismissed) {
        return null;
    }

    const handleInstall = async () => {
        const success = await installPWA();
        if (!success) {
            setDismissed(true);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        // Remember dismissal for this session
        sessionStorage.setItem('pwa-install-dismissed', 'true');
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-indigo-600 text-white p-4 shadow-lg">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center space-x-3">
                    <div className="bg-white p-2 rounded-lg">
                        <span className="text-indigo-600 text-lg">📱</span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">Install Doc Bear's Comfort Kitchen</h3>
                        <p className="text-indigo-100 text-xs">
                            Add to home screen for quick access
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <TouchEnhancedButton
                        onClick={handleDismiss}
                        className="text-indigo-200 hover:text-white p-1"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={handleInstall}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
                    >
                        Install
                    </TouchEnhancedButton>
                </div>
            </div>
        </div>
    );
}
