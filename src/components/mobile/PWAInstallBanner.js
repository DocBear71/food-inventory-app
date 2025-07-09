'use client';

// file: /src/components/mobile/PWAInstallBanner.js v12 - Fixed for Capacitor apps

import { useSafeSession } from '@/hooks/useSafeSession';
import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { PlatformDetection, debugPlatformInfo } from '@/utils/platformDetection';
import { apiGet, apiPut } from '@/lib/api-config';

export function PWAInstallBanner() {
    // Enhanced check using your Capacitor setup
    if (PlatformDetection.isRunningInMobileApp()) {
        console.log('PWA Banner: Not showing - running in mobile app');
        // Debug info for troubleshooting
        if (process.env.NODE_ENV === 'development') {
            debugPlatformInfo();
        }
        return null;
    }

    return <PWAInstallBannerContent/>;
}

function PWAInstallBannerContent() {
    const sessionResult = useSafeSession();
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [userDisabledBanner, setUserDisabledBanner] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    // Safely extract session data with null checks
    const session = sessionResult || {};
    const sessionStatus = session.status || 'loading';
    const sessionData = session.data || null;
    const userId = sessionData?.user?.id || null;

    // Detect if we're in a signout process
    useEffect(() => {
        const checkSignoutProcess = () => {
            if (typeof window !== 'undefined') {
                const isOnSignoutPage = window.location.pathname === '/auth/signout';
                const cameFromSignout = sessionStorage.getItem('signout-in-progress') === 'true';
                const justSignedOut = sessionStorage.getItem('just-signed-out') === 'true';

                console.log('PWA Banner: Signout check - onSignoutPage:', isOnSignoutPage, 'cameFromSignout:', cameFromSignout, 'justSignedOut:', justSignedOut);

                if (isOnSignoutPage) {
                    sessionStorage.setItem('signout-in-progress', 'true');
                    sessionStorage.setItem('just-signed-out', 'true');
                    setIsSigningOut(true);
                    console.log('PWA Banner: On signout page - setting signout flags');
                } else if (cameFromSignout || justSignedOut) {
                    setIsSigningOut(true);
                    console.log('PWA Banner: Signout in progress - blocking API calls');
                    setTimeout(() => {
                        sessionStorage.removeItem('signout-in-progress');
                        sessionStorage.removeItem('just-signed-out');
                        setIsSigningOut(false);
                        console.log('PWA Banner: Signout process completed - API calls allowed again');
                    }, 15000);
                }
            }
        };

        checkSignoutProcess();

        const handleRouteChange = () => {
            checkSignoutProcess();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('popstate', handleRouteChange);
            return () => window.removeEventListener('popstate', handleRouteChange);
        }
    }, []);

    // Prevent hydration issues
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || isSigningOut) return;

        // Additional safety check - don't show in mobile apps
        if (PlatformDetection.isRunningInMobileApp()) {
            console.log('PWA Banner: Double-check detected mobile app - not showing banner');
            return;
        }

        const isiOS = PlatformDetection.isIOS();
        const isStandaloneMode = PlatformDetection.isPWAInstalled();

        setIsIOS(isiOS);
        setIsStandalone(isStandaloneMode);

        console.log('PWA Banner: iOS:', isiOS, 'Standalone:', isStandaloneMode, 'Session status:', sessionStatus, 'Signing out:', isSigningOut);

        // Don't show if already running as PWA
        if (isStandaloneMode) {
            console.log('PWA Banner: Not showing - already in standalone mode');
            return;
        }

        // Wait for session to load
        if (sessionStatus === 'loading') {
            console.log('PWA Banner: Waiting for session to load');
            return;
        }

        // Check if user has disabled PWA banner in their profile
        const checkUserDisabledBanner = async () => {
            const preventCalls = localStorage.getItem('prevent-session-calls') === 'true';
            const signingOut = sessionStorage.getItem('signout-in-progress') === 'true';
            const justSignedOut = sessionStorage.getItem('just-signed-out') === 'true';

            if (isSigningOut || sessionStatus !== 'authenticated' || !userId || preventCalls || signingOut || justSignedOut) {
                console.log('PWA Banner: Skipping user preferences API call - signout flags:', {
                    isSigningOut, sessionStatus, userId: !!userId, preventCalls, signingOut, justSignedOut
                });
                return false;
            }

            try {
                console.log('PWA Banner: Fetching user preferences...');
                const response = await apiGet('/api/user/preferences');
                if (response.ok) {
                    const data = await response.json();
                    console.log('PWA Banner: User preferences received:', data.preferences?.disablePWABanner);
                    return data.preferences?.disablePWABanner === true;
                } else {
                    console.log('PWA Banner: User preferences API failed:', response.status);
                    if (response.status === 401) {
                        localStorage.removeItem('prevent-session-calls');
                        sessionStorage.removeItem('signout-in-progress');
                        sessionStorage.removeItem('just-signed-out');
                    }
                }
            } catch (error) {
                console.log('PWA Banner: Could not fetch user preferences:', error);
            }
            return false;
        };

        // Check user preference if logged in (but not if signing out)
        if (sessionStatus === 'authenticated' && userId && !isSigningOut) {
            checkUserDisabledBanner().then(disabled => {
                console.log('PWA Banner: User disabled banner:', disabled);
                setUserDisabledBanner(disabled);

                if (!disabled) {
                    setTimeout(() => {
                        console.log('PWA Banner: Showing banner for logged in user');
                        setShowBanner(true);
                    }, 1000);
                }
            });
        } else if (sessionStatus === 'unauthenticated' && !isSigningOut) {
            // For non-logged in users, always show (but not during signout)
            localStorage.removeItem('prevent-session-calls');
            sessionStorage.removeItem('signout-in-progress');
            sessionStorage.removeItem('just-signed-out');

            setTimeout(() => {
                console.log('PWA Banner: Showing banner for guest user');
                setShowBanner(true);
            }, 1000);
        }
    }, [mounted, sessionStatus, userId, isSigningOut]);

    const handleInstall = async () => {
        console.log('PWA Banner: Install clicked - iOS:', isIOS);

        if (isIOS) {
            showIOSInstructions();
        } else {
            try {
                if (typeof window !== 'undefined' && window.deferredPrompt) {
                    const result = await window.deferredPrompt.prompt();
                    if (result.outcome === 'accepted') {
                        setShowBanner(false);
                    }
                } else {
                    showManualInstructions();
                }
            } catch (error) {
                console.log('PWA installation failed:', error);
                showManualInstructions();
            }
        }
    };

    const disablePWABanner = async () => {
        try {
            const response = await apiPut('/api/user/preferences', { disablePWABanner: true });
            if (response.ok) {
                document.querySelector('.fixed').remove();
                window.location.reload();
            } else {
                throw new Error('Failed to disable banner');
            }
        } catch (error) {
            console.error('Failed to disable PWA banner:', error);
            document.querySelector('.fixed').remove();
        }
    };

    const showIOSInstructions = () => {
        if (typeof document === 'undefined') return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div style="background: white; border-radius: 8px; padding: 24px; max-width: 400px; width: 100%; margin: 16px;">
                <div style="text-align: center;">
                    <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #111827;">Install App</h3>
                    <div style="text-align: left; font-size: 14px; color: #374151; margin-bottom: 24px;">
                        <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <span style="font-size: 24px; margin-right: 12px;">1️⃣</span>
                            <span>Tap the <strong>Share</strong> button</span>
                            <span style="font-size: 20px; margin-left: 8px;">📤</span>
                        </div>
                        <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <span style="font-size: 24px; margin-right: 12px;">2️⃣</span>
                            <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                            <span style="font-size: 20px; margin-left: 8px;">➕</span>
                        </div>
                        <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <span style="font-size: 24px; margin-right: 12px;">3️⃣</span>
                            <span>Tap <strong>"Add"</strong> to install</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button 
                            onclick="this.closest('.fixed').remove()"
                            style="width: 100%; background: #4f46e5; color: white; padding: 10px 16px; border-radius: 8px; font-weight: 500; border: none; cursor: pointer; font-size: 14px;"
                        >
                            Got it!
                        </button>
                        ${sessionStatus === 'authenticated' && userId && !isSigningOut ? `
                            <button 
                                onclick="window.disablePWABanner()"
                                style="width: 100%; background: transparent; color: #6b7280; padding: 8px 16px; border-radius: 8px; border: 1px solid #d1d5db; cursor: pointer; font-size: 14px;"
                            >
                                Don't show again
                            </button>
                            ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    };

    if (typeof window !== 'undefined') {
        window.disablePWABanner = disablePWABanner;
    }

    const showManualInstructions = () => {
        if (typeof window !== 'undefined') {
            alert('Look for an "Add to Home Screen" or "Install" option in your browser menu.');
        }
    };

    const handleDismiss = () => {
        console.log('PWA Banner: Dismissed for this session');
        setShowBanner(false);
    };

    // Don't render anything during SSR or before mounting
    if (!mounted || typeof window === 'undefined') {
        return null;
    }

    // Final safety checks
    if (isStandalone || userDisabledBanner || !showBanner || sessionStatus === 'loading' ||
        isSigningOut || PlatformDetection.isRunningInMobileApp()) {
        return null;
    }

    console.log('PWA Banner: Rendering banner');

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-indigo-600 text-white p-3 shadow-lg mobile-optimized">
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