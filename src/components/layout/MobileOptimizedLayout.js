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

    // ADD THIS useEffect WITH THE OTHER HOOKS AT THE TOP:
    useEffect(() => {
        const logPaddingValues = () => {
            if (Capacitor.isNativePlatform()) {
                const isAndroid = Capacitor.getPlatform() === 'android';
                const topPadding = Math.max(statusBarHeight, 48);
                const bottomPadding = isAndroid ? 80 : 40;

                console.log('🎯 CALCULATED PADDING VALUES:');
                console.log('📱 statusBarHeight:', statusBarHeight);
                console.log('📱 topPadding calculated:', topPadding);
                console.log('📱 bottomPadding calculated:', bottomPadding);
                console.log('📱 isAndroid:', isAndroid);

                // Check if container element actually has the padding
                setTimeout(() => {
                    const container = document.querySelector('.mobile-safe-layout');
                    if (container) {
                        const styles = window.getComputedStyle(container);
                        console.log('🎯 ACTUAL CONTAINER STYLES:');
                        console.log('📱 container paddingTop:', styles.paddingTop);
                        console.log('📱 container paddingBottom:', styles.paddingBottom);
                        console.log('📱 container position:', styles.position);
                        console.log('📱 container display:', styles.display);
                    }
                }, 100);
            }
        };

        if (mounted && statusBarHeight > 0) {
            logPaddingValues();
        }
    }, [mounted, statusBarHeight]);

    useEffect(() => {
        const testStatusBar = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    const info = await StatusBar.getInfo();
                    console.log('✅ StatusBar plugin working:', info);
                } catch (error) {
                    console.error('❌ StatusBar plugin failed:', error);
                    console.log('📱 Available Capacitor plugins:', Object.keys(Capacitor.Plugins || {}));
                }
            }
        };
        testStatusBar();
    }, []);

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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            console.log('🔍 DEBUGGING SAFE AREA SETUP');
            console.log('📱 Platform:', Capacitor.getPlatform());
            console.log('📱 Is Native:', Capacitor.isNativePlatform());
            console.log('📱 User Agent:', navigator.userAgent);
            console.log('📱 Window size:', window.innerWidth, 'x', window.innerHeight);
            console.log('📱 Screen size:', screen.width, 'x', screen.height);

            // Check CSS environment variables
            const testDiv = document.createElement('div');
            testDiv.style.paddingTop = 'env(safe-area-inset-top)';
            document.body.appendChild(testDiv);
            const computedTop = window.getComputedStyle(testDiv).paddingTop;
            document.body.removeChild(testDiv);
            console.log('📱 CSS env(safe-area-inset-top):', computedTop);

            // Check viewport meta tag
            const viewport = document.querySelector('meta[name="viewport"]');
            console.log('📱 Viewport meta:', viewport?.getAttribute('content'));

            // Check body styles
            const bodyStyles = window.getComputedStyle(document.body);
            console.log('📱 Body margin:', bodyStyles.margin);
            console.log('📱 Body padding:', bodyStyles.padding);
        }
    }, [mounted]);

    // More aggressive StatusBar setup
    useEffect(() => {
        const setupStatusBar = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    console.log('📱 Setting up StatusBar aggressively...');

                    // Force status bar configuration
                    await StatusBar.setOverlaysWebView({overlay: false});
                    await StatusBar.setStyle({style: 'default'});
                    await StatusBar.setBackgroundColor({color: '#ffffff'});

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
        paddingTop: `${topPadding}px !important`,
        paddingBottom: `${bottomPadding}px !important`,
        paddingLeft: '0px',
        paddingRight: '0px',
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        backgroundColor: '#ffffff',
        margin: '0',
        overflow: 'visible',
        // Force all child elements to respect the container
        isolation: 'isolate'
    };

// And add this style object for the inner content
    const innerContentStyle = {
        width: '100%',
        minHeight: `calc(100vh - ${topPadding + bottomPadding}px)`,
        position: 'relative',
        zIndex: 1
    };

    return (
        <>
            {/* Debug info */}
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

            {/* Visual safe area indicators */}
            {process.env.NODE_ENV === 'development' && isNative && (
                <>
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: `${topPadding}px`,
                        backgroundColor: 'rgba(255, 0, 0, 0.5)',
                        zIndex: 9998,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: 'white',
                        fontWeight: 'bold'
                    }}>
                        TOP SAFE AREA ({topPadding}px)
                    </div>

                    <div style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${bottomPadding}px`,
                        backgroundColor: 'rgba(0, 0, 255, 0.5)',
                        zIndex: 9998,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: 'white',
                        fontWeight: 'bold'
                    }}>
                        BOTTOM SAFE AREA ({bottomPadding}px)
                    </div>
                </>
            )}

            <div style={containerStyle} className="mobile-safe-layout">
                <div style={innerContentStyle}>
                    <LayoutComponent>
                        {children}
                    </LayoutComponent>
                </div>
            </div>
        </>
    );
}