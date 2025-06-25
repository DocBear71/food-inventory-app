'use client';
// file: /src/components/layout/MobileOptimizedLayout.js - Conditionally use mobile layout

import { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import MobileDashboardLayout from './MobileDashboardLayout';
import AdminDebug from "@/components/debug/AdminDebug";

export default function MobileOptimizedLayout({ children }) {
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Prevent hydration mismatch
    if (!mounted) {
        return (
            <DashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return isMobile ? (
        <MobileDashboardLayout>
            {children}
            <AdminDebug />
        </MobileDashboardLayout>
    ) : (
        <DashboardLayout>
            {children}
            <AdminDebug />
        </DashboardLayout>
    );
}
