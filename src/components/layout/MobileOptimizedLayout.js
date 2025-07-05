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

    // Setup StatusBar for native platforms
    useEffect(() => {
        const setupStatusBar = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    console.log('📱 Setting up StatusBar...');
                    await StatusBar.setOverlaysWebView({ overlay: false });
                    await StatusBar.setStyle({ style: 'default' });
                    await StatusBar.setBackgroundColor({ color: '#ffffff' });
                    console.log('✅ StatusBar configured');
                } catch (error) {
                    console.error('❌ StatusBar setup failed:', error);
                }
            }
        };

        if (mounted) {
            setupStatusBar();
        }
    }, [mounted]);

    useEffect(() => {
        if (mounted) {
            document.body.style.overscrollBehavior = 'none';
            document.documentElement.style.overscrollBehavior = 'none';

            // Add capacitor class to body for CSS targeting
            if (Capacitor.isNativePlatform()) {
                document.body.classList.add('capacitor-app');
                if (Capacitor.getPlatform() === 'android') {
                    document.body.classList.add('capacitor-android');
                }
            }

            return () => {
                document.body.style.overscrollBehavior = '';
                document.documentElement.style.overscrollBehavior = '';
            };
        }
    }, [mounted]);

    if (!mounted || !isReady) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const LayoutComponent = isMobile ? MobileDashboardLayout : DashboardLayout;

    return (
        <div className="mobile-safe-layout">
            <LayoutComponent>
                {children}
            </LayoutComponent>

            {/* Debug overlay for development */}
            {process.env.NODE_ENV === 'development' && (
                <div className="fixed top-2 right-2 bg-red-500 text-white text-xs p-2 rounded z-50">
                    Platform: {Capacitor.getPlatform()}<br/>
                    Native: {Capacitor.isNativePlatform() ? 'Yes' : 'No'}<br/>
                    Mobile: {isMobile ? 'Yes' : 'No'}
                </div>
            )}
        </div>
    );
}