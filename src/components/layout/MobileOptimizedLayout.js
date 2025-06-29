'use client';
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

        checkMobile();
        setMounted(true);

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Move this useEffect BEFORE the early return
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

    // Now the early return comes AFTER all hooks
    if (!mounted) {
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