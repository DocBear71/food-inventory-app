'use client';
// file: /src/components/layout/MobileOptimizedLayout.js - Fixed over-scroll and loading issues

import { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import MobileDashboardLayout from './MobileDashboardLayout';
import AdminDebug from "@/components/debug/AdminDebug";

export default function MobileOptimizedLayout({ children }) {
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Check immediately
        checkMobile();
        setMounted(true);

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Prevent hydration mismatch with a more seamless loading
    if (!mounted) {
        // Use a minimal loading that doesn't interfere with scroll
        return (
            <div className="min-h-screen bg-gray-50" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Add CSS to prevent over-scrolling
    useEffect(() => {
        if (mounted) {
            // Prevent over-scroll behavior
            document.body.style.overscrollBehavior = 'none';
            document.documentElement.style.overscrollBehavior = 'none';

            return () => {
                // Cleanup
                document.body.style.overscrollBehavior = '';
                document.documentElement.style.overscrollBehavior = '';
            };
        }
    }, [mounted]);

    const LayoutComponent = isMobile ? MobileDashboardLayout : DashboardLayout;

    return (
        <div style={{
            minHeight: '100vh',
            overscrollBehavior: 'none',
            position: 'relative',
            overflow: 'hidden auto'
        }}>
            <LayoutComponent>
                {children}
            </LayoutComponent>
        </div>
    );
}