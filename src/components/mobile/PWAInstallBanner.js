// file: /src/components/mobile/PWAInstallBanner.js v4 - iOS Safari compatible banner
'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export function PWAInstallBanner() {
    const { isInstallable, isInstalled, installPWA, isIOS } = usePWA();
    const [dismissed, setDismissed] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Check if running in standalone mode (PWA is already installed and running)
        const checkStandalone = () => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone ||
                document.referrer.includes('android-app://');
            setIsStandalone(isStandaloneMode);
            return isStandaloneMode;
        };

        // Check session storage for dismissal
        const checkDismissed = () => {
            const wasDismissed = sessionStorage.getItem('pwa-install-dismissed') === 'true' ||
                localStorage.getItem('pwa-install-permanently-dismissed') === 'true';
            setDismissed(wasDismissed);
            return wasDismissed;
        };

        const isStandaloneMode = checkStandalone();
        const isDismissed = checkDismissed();

        // Show banner if:
        // - Not dismissed
        // - Not already in standalone mode
        // - Either iOS Safari OR installable on other browsers
        if (!isDismissed && !isStandaloneMode) {
            if (isIOS || isInstallable) {
                // Add a small delay to ensure page is loaded
                const timer = setTimeout(() => {
                    setShowBanner(true);
                }, 1000);

                return () => clearTimeout(timer);
            }
        }
    }, [isIOS, isInstallable]);

    const handleInstall = async () => {
        if (isIOS) {
            // For iOS, show installation instructions
            showIOSInstructions();
        } else {
            // For Android/Chrome, try automatic installation
            const success = await installPWA();
            if (!success) {
                handleDismiss();
            }
        }
    };

    const showIOSInstructions = () => {
        // Create and show iOS installation instructions modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                <div class="text-center">
                    <h3 class="text-lg font-semibold mb-4 text-gray-900">Install App</h3>
                    <div class="space-y-3 text-left text-sm text-gray-700">
                        <div class="flex items-center space-x-3">
                            <span class="text-2xl">1️⃣</span>
                            <span>Tap the <strong>Share</strong> button</span>
                            <span class="text-xl">📤</span>
                        </div>
                        <div class="flex items-center space-x-3">
                            <span class="text-2xl">2️⃣</span>
                            <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                            <span class="text-xl">➕</span>
                        </div>
                        <div class="flex items-center space-x-3">
                            <span class="text-2xl">3️⃣</span>
                            <span>Tap <strong>"Add"</strong> to install</span>
                        </div>
                    </div>
                    <div class="mt-6 space-y-2">
                        <button 
                            onclick="this.parentElement.parentElement.parentElement.parentElement.remove()"
                            class="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700"
                        >
                            Got it!
                        </button>
                        <button 
                            onclick="this.parentElement.parentElement.parentElement.parentElement.remove(); sessionStorage.setItem('pwa-install-dismissed', 'true');"
                            class="w-full text-gray-600 py-2 px-4 rounded-lg hover:bg-gray-100"
                        >
                            Don't show again
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Remove modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    };

    const handleDismiss = () => {
        setShowBanner(false);
        setDismissed(true);
        sessionStorage.setItem('pwa-install-dismissed', 'true');
    };

    // Don't show if:
    // - Already installed
    // - Dismissed
    // - Running in standalone mode (already installed and launched as PWA)
    // - Not installable and not iOS
    if (isInstalled || dismissed || isStandalone || !showBanner) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-indigo-600 text-white p-3 shadow-lg pwa-install-banner mobile-optimized">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="bg-white p-1.5 rounded-lg flex-shrink-0">
                        <span className="text-indigo-600 text-lg emoji">📱</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate">Install Doc Bear's Comfort Kitchen</h3>
                        <p className="text-indigo-100 text-xs truncate">
                            {isIOS ? 'Tap to see installation guide' : 'Add to home screen for quick access'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                    <TouchEnhancedButton
                        onClick={handleDismiss}
                        className="text-indigo-200 hover:text-white p-1 rounded touch-friendly"
                        aria-label="Dismiss"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={handleInstall}
                        className="bg-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-50 active:bg-indigo-100 transition-colors flex-shrink-0 touch-friendly"
                        style={{ color: '#4f46e5' }}
                    >
                        {isIOS ? 'How to Install' : 'Install'}
                    </TouchEnhancedButton>
                </div>
            </div>
        </div>
    );
}