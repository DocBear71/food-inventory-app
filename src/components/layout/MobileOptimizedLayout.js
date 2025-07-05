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
    const [statusBarHeight, setStatusBarHeight] = useState(0);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        setMounted(true);

        const readyTimer = setTimeout(() => {
            setIsReady(true);
        }, 100);

        return () => {
            window.removeEventListener('resize', checkMobile);
            clearTimeout(readyTimer);
        };
    }, []);

    // More aggressive StatusBar setup
    useEffect(() => {
        const setupStatusBar = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    console.log('📱 Setting up StatusBar aggressively...');

                    // Force status bar configuration
                    await StatusBar.setOverlaysWebView({ overlay: false });
                    await StatusBar.setStyle({ style: 'default' });
                    await StatusBar.setBackgroundColor({ color: '#ffffff' });

                    // Get actual status bar height
                    const info = await StatusBar.getInfo();
                    console.log('📱 StatusBar info:', info);
                    setStatusBarHeight(info.height || 32);

                    // Force body styles
                    document.body.style.margin = '0';
                    document.body.style.padding = '0';
                    document.documentElement.style.margin = '0';
                    document.documentElement.style.padding = '0';

                    console.log('✅ StatusBar configured with height:', info.height);
                } catch (error) {
                    console.error('❌ StatusBar setup failed:', error);
                    // Fallback height
                    setStatusBarHeight(40);
                }
            }
        };

        if (mounted) {
            setupStatusBar();
        }
    }, [mounted]);

    if (!mounted || !isReady) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: '#f9fafb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    animation: 'spin 1s linear infinite',
                    borderRadius: '50%',
                    height: '32px',
                    width: '32px',
                    borderBottom: '2px solid #4f46e5'
                }}></div>
            </div>
        );
    }

    const LayoutComponent = isMobile ? MobileDashboardLayout : DashboardLayout;

    // Calculate safe area values - be more aggressive for Android
    const isNative = Capacitor.isNativePlatform();
    const isAndroid = Capacitor.getPlatform() === 'android';

    // More aggressive padding values
    const topPadding = isNative ? Math.max(statusBarHeight, 48) : 0;
    const bottomPadding = isNative && isAndroid ? 80 : (isNative ? 40 : 0);

    // Force container styles with high specificity
    const containerStyle = {
        paddingTop: `${topPadding}px`,
        paddingBottom: `${bottomPadding}px`,
        paddingLeft: '0px',
        paddingRight: '0px',
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        backgroundColor: '#ffffff',
        // Force override any conflicting styles
        margin: '0 !important',
        overflow: 'visible'
    };

    return (
        <>
            {/* Debug info at the very top */}
            {process.env.NODE_ENV === 'development' && (
                <div style={{
                    position: 'fixed',
                    top: '4px',
                    right: '4px',
                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                    color: 'white',
                    fontSize: '10px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    zIndex: 9999,
                    fontFamily: 'monospace'
                }}>
                    Platform: {Capacitor.getPlatform()}<br/>
                    Native: {isNative ? 'Yes' : 'No'}<br/>
                    StatusBar: {statusBarHeight}px<br/>
                    TopPad: {topPadding}px<br/>
                    BottomPad: {bottomPadding}px
                </div>
            )}

            <div style={containerStyle}>
                <LayoutComponent>
                    {children}
                </LayoutComponent>
            </div>
        </>
    );
}