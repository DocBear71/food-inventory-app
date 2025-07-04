'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import MobileDashboardLayout from './MobileDashboardLayout';
import AdminDebug from "@/components/debug/AdminDebug";

// Android Status Bar and Safe Area Hook
function useAndroidStatusBar() {
    useEffect(() => {
        const setupAndroidStatusBar = async () => {
            // Only run on client side
            if (typeof window === 'undefined') return;

            try {
                // Check if we're in a Capacitor environment first
                if (typeof window.Capacitor === 'undefined') {
                    // Try dynamic import as fallback
                    try {
                        const capacitorModule = await import('@capacitor/core');
                        if (!capacitorModule?.Capacitor) return;

                        const { Capacitor } = capacitorModule;
                        if (!Capacitor.isNativePlatform()) return;

                        const deviceModule = await import('@capacitor/device');
                        if (!deviceModule?.Device) return;

                        const { Device } = deviceModule;
                        const info = await Device.getInfo();

                        if (info.platform === 'android') {
                            console.log('🤖 Setting up Android status bar and safe areas...');

                            try {
                                // Set up status bar if plugin is available
                                const statusBarModule = await import('@capacitor/status-bar');
                                if (statusBarModule?.StatusBar) {
                                    const { StatusBar } = statusBarModule;

                                    // Set status bar style
                                    await StatusBar.setStyle({ style: 'DARK' });

                                    // Set status bar background color (indigo to match your theme)
                                    await StatusBar.setBackgroundColor({ color: '#6366f1' });

                                    // Show status bar
                                    await StatusBar.show();

                                    console.log('✅ Android status bar configured');
                                }
                            } catch (statusBarError) {
                                console.log('Status bar plugin not available:', statusBarError);
                            }

                            // Add safe area CSS variables for Android
                            const root = document.documentElement;
                            root.style.setProperty('--safe-area-inset-top', '24px');
                            root.style.setProperty('--safe-area-inset-bottom', '48px');
                            root.style.setProperty('--safe-area-inset-left', '0px');
                            root.style.setProperty('--safe-area-inset-right', '0px');

                            // Add Android-specific body styles
                            document.body.style.paddingTop = 'env(safe-area-inset-top, 24px)';
                            document.body.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';

                            console.log('✅ Android safe area insets configured');
                        }
                    } catch (importError) {
                        console.log('Capacitor modules not available (web environment):', importError.message);
                    }
                } else {
                    // Capacitor is available globally
                    if (!window.Capacitor.isNativePlatform()) return;

                    // Use global Capacitor - this shouldn't happen but just in case
                    console.log('Using global Capacitor (should not happen in normal builds)');
                }
            } catch (error) {
                console.log('Android setup failed (normal for web):', error.message);
            }
        };

        setupAndroidStatusBar();
    }, []);
}

// Android Session Persistence Hook
function useAndroidSessionPersistence() {
    useEffect(() => {
        const setupAndroidSession = async () => {
            // Only run on client side
            if (typeof window === 'undefined') return;

            try {
                // Check if we're in a Capacitor environment first
                let isAndroid = false;

                try {
                    const capacitorModule = await import('@capacitor/core');
                    if (capacitorModule?.Capacitor && capacitorModule.Capacitor.isNativePlatform()) {
                        const deviceModule = await import('@capacitor/device');
                        if (deviceModule?.Device) {
                            const { Device } = deviceModule;
                            const info = await Device.getInfo();
                            isAndroid = info.platform === 'android';
                        }
                    }
                } catch (importError) {
                    console.log('Capacitor not available (web environment):', importError.message);
                    return; // Exit early for web
                }

                if (isAndroid) {
                    console.log('🤖 Setting up Android session persistence...');

                    // Set up periodic session backup for Android
                    const backupSession = async () => {
                        try {
                            const nextAuthModule = await import('next-auth/react');
                            if (!nextAuthModule?.getSession) return;

                            const { getSession } = nextAuthModule;
                            const session = await getSession();

                            if (session?.user) {
                                // Multiple backup strategies for Android
                                const sessionData = {
                                    user: session.user,
                                    expires: session.expires,
                                    timestamp: Date.now(),
                                    platform: 'android'
                                };

                                // Backup 1: Mobile session storage
                                try {
                                    const mobileSessionModule = await import('@/lib/mobile-session-simple');
                                    if (mobileSessionModule?.MobileSession) {
                                        await mobileSessionModule.MobileSession.setSession(sessionData);
                                    }
                                } catch (mobileSessionError) {
                                    console.log('Mobile session storage not available:', mobileSessionError.message);
                                }

                                // Backup 2: localStorage
                                if (typeof localStorage !== 'undefined') {
                                    localStorage.setItem('android-session-backup', JSON.stringify(sessionData));
                                    localStorage.setItem('android-last-seen', Date.now().toString());
                                }

                                // Backup 3: sessionStorage
                                if (typeof sessionStorage !== 'undefined') {
                                    sessionStorage.setItem('android-active-session', JSON.stringify(sessionData));
                                }

                                console.log('📱 Android session backed up successfully');
                            }
                        } catch (error) {
                            console.error('Android session backup failed:', error);
                        }
                    };

                    // Initial backup
                    await backupSession();

                    // Backup every 30 seconds while app is active
                    const backupInterval = setInterval(backupSession, 30000);

                    // Backup on page visibility change (app focus/blur)
                    const handleVisibilityChange = () => {
                        if (!document.hidden) {
                            backupSession();
                        }
                    };

                    document.addEventListener('visibilitychange', handleVisibilityChange);

                    // Cleanup
                    return () => {
                        clearInterval(backupInterval);
                        document.removeEventListener('visibilitychange', handleVisibilityChange);
                    };
                }
            } catch (error) {
                console.log('Android session setup failed (normal for web):', error.message);
            }
        };

        const cleanup = setupAndroidSession();
        return cleanup;
    }, []);
}

export default function MobileOptimizedLayout({ children }) {
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Initialize Android-specific features
    useAndroidStatusBar();
    useAndroidSessionPersistence();

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Set mounted immediately
        setMounted(true);

        // Add a small delay to ensure everything is ready
        const readyTimer = setTimeout(() => {
            setIsReady(true);
        }, 100);

        return () => {
            window.removeEventListener('resize', checkMobile);
            clearTimeout(readyTimer);
        };
    }, []);

    useEffect(() => {
        if (mounted) {
            document.body.style.overscrollBehavior = 'none';
            document.documentElement.style.overscrollBehavior = 'none';

            return () => {
                document.body.style.overscrollBehavior = '';
                document.documentElement.style.overscrollBehavior = '';
            };
        }
    }, [mounted]);

    // Show loading only if not mounted OR not ready
    if (!mounted || !isReady) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const LayoutComponent = isMobile ? MobileDashboardLayout : DashboardLayout;

    return (
        <div
            className="min-h-screen"
            style={{
                overscrollBehavior: 'none',
                position: 'relative',
                // Add safe area padding for Android
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                paddingLeft: 'env(safe-area-inset-left, 0px)',
                paddingRight: 'env(safe-area-inset-right, 0px)',
                // Ensure minimum height accounts for safe areas
                minHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))'
            }}
        >
            <LayoutComponent>
                {children}
            </LayoutComponent>
        </div>
    );
}