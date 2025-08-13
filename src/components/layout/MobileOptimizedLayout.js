'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import MobileDashboardLayout from './MobileDashboardLayout';
import AdminDebug from "@/components/debug/AdminDebug";
import {Capacitor} from "@capacitor/core";

export default function MobileOptimizedLayout({ children }) {
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isNativePlatform = Capacitor.isNativePlatform();
            
            // Detect iPad specifically
            const isIPad = /iPad/.test(navigator.userAgent) || 
                         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                         (navigator.userAgent.includes('Macintosh') && 'ontouchend' in document);

            // Consider it mobile if:
            // - It's running as a native app (PWA/Capacitor) - always mobile
            // - OR it's an iPad (regardless of orientation/screen size)
            // - OR width is less than 1200px AND it's a touch device
            // - OR width is less than 768px (phones)
            const shouldUseMobileLayout =
                isNativePlatform ||
                isIPad ||
                width < 768 ||
                (width < 1200 && isTouchDevice);

            setIsMobile(shouldUseMobileLayout);
            
            // Debug logging
            console.log('📱 Layout Detection:', {
                width,
                height,
                isTouchDevice,
                isNativePlatform,
                isIPad,
                shouldUseMobileLayout,
                userAgent: navigator.userAgent.substring(0, 100)
            });
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        window.addEventListener('orientationchange', checkMobile);
        setMounted(true);

        const readyTimer = setTimeout(() => {
            setIsReady(true);
        }, 100);

        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('orientationchange', checkMobile);
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

    if (!mounted || !isReady) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const LayoutComponent = isMobile ? MobileDashboardLayout : DashboardLayout;

    const containerStyle = {
        overscrollBehavior: 'none',
        position: 'relative'
    };

    return (
        <div style={containerStyle}>
            <LayoutComponent>
                {children}
            </LayoutComponent>
        </div>
    );
}