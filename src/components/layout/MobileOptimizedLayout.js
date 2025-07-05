'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import MobileDashboardLayout from './MobileDashboardLayout';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import AdminDebug from "@/components/debug/AdminDebug";

export default function MobileOptimizedLayout({ children }) {
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [safeAreaInsets, setSafeAreaInsets] = useState({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
    });

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

    // Setup safe area insets for mobile platforms
    useEffect(() => {
        const setupSafeArea = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    console.log('📱 Setting up safe area for native platform...');

                    // Configure status bar
                    await StatusBar.setStyle({ style: 'default' });
                    await StatusBar.setBackgroundColor({ color: '#ffffff' });
                    await StatusBar.setOverlaysWebView({ overlay: false });

                    // Get safe area information
                    const statusBarInfo = await StatusBar.getInfo();
                    console.log('📱 Status bar info:', statusBarInfo);

                    // Calculate safe area insets
                    const topInset = statusBarInfo.height || 24;

                    // For Android, account for navigation bar
                    // You might need to adjust this based on your device
                    const bottomInset = Capacitor.getPlatform() === 'android' ? 48 : 0;

                    const newInsets = {
                        top: topInset,
                        bottom: bottomInset,
                        left: 0,
                        right: 0
                    };

                    console.log('📱 Calculated safe area insets:', newInsets);
                    setSafeAreaInsets(newInsets);

                } catch (error) {
                    console.error('❌ Error setting up safe area:', error);
                    // Fallback safe area values for common Android devices
                    setSafeAreaInsets({
                        top: 24,
                        bottom: 48,
                        left: 0,
                        right: 0
                    });
                }
            } else {
                console.log('🌐 Web platform detected, no safe area adjustments needed');
            }
        };

        if (mounted) {
            setupSafeArea();
        }
    }, [mounted]);

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

    // Create container style with safe area insets for native platforms
    const containerStyle = Capacitor.isNativePlatform() ? {
        paddingTop: `${safeAreaInsets.top}px`,
        paddingBottom: `${safeAreaInsets.bottom}px`,
        paddingLeft: `${safeAreaInsets.left}px`,
        paddingRight: `${safeAreaInsets.right}px`,
        minHeight: '100vh',
        boxSizing: 'border-box',
        overscrollBehavior: 'none',
        position: 'relative'
    } : {
        minHeight: '100vh',
        overscrollBehavior: 'none',
        position: 'relative'
    };

    return (
        <div style={containerStyle} className="mobile-safe-layout">
            <LayoutComponent>
                {children}
            </LayoutComponent>
            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && Capacitor.isNativePlatform() && (
                <div className="fixed bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-50">
                    Safe Area: T:{safeAreaInsets.top} B:{safeAreaInsets.bottom}
                </div>
            )}
        </div>
    );
}