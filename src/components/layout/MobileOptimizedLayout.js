'use client';
// file: /src/components/layout/MobileOptimizedLayout.js v4 - Fixed iPad detection and layout switching
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

            // Enhanced iPad detection using feature detection
            const isIPad = (() => {
                // Check for iPad in user agent first (most reliable for older iPads)
                if (/iPad/.test(navigator.userAgent)) {
                    return true;
                }

                // Feature detection for newer iPads (iOS 13+) that identify as Mac
                const isMacintosh = navigator.userAgent.includes('Macintosh');
                const hasMultiTouch = navigator.maxTouchPoints > 1;
                const hasTouchEvents = 'ontouchend' in document;
                const hasDeviceMotion = 'DeviceMotionEvent' in window;
                const hasDeviceOrientation = 'DeviceOrientationEvent' in window;

                // Modern iPads report as Macintosh but have touch capabilities
                // and motion sensors that typical Macs don't have
                const isProbablyIPad = isMacintosh &&
                    hasMultiTouch &&
                    hasTouchEvents &&
                    (hasDeviceMotion || hasDeviceOrientation);

                return isProbablyIPad;
            })();

            // UPDATED LOGIC: More aggressive mobile detection for iPad
            // Consider it mobile if:
            // - It's running as a native app (PWA/Capacitor) - always mobile
            // - OR it's an iPad (regardless of screen size - force mobile layout)
            // - OR width is less than 768px (phones)
            // - OR it's a touch device with width less than 1024px (small tablets)
            const shouldUseMobileLayout =
                isNativePlatform ||
                isIPad ||
                width < 768 ||
                (isTouchDevice && width < 1024);

            setIsMobile(shouldUseMobileLayout);

            // Enhanced debug logging
            console.log('📱 Enhanced Layout Detection:', {
                width,
                height,
                isTouchDevice,
                isNativePlatform,
                isIPad,
                shouldUseMobileLayout,
                userAgent: navigator.userAgent.substring(0, 100),
                maxTouchPoints: navigator.maxTouchPoints,
                hasDeviceMotion: 'DeviceMotionEvent' in window,
                hasDeviceOrientation: 'DeviceOrientationEvent' in window,
                layoutChoice: shouldUseMobileLayout ? 'MOBILE' : 'DESKTOP'
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