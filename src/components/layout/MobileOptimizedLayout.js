'use client';

// file: src/components/layout/MobileOptimizedLayout.js v2

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

        // Add a small delay to ensure proper mounting
        const timer = setTimeout(() => {
            setMounted(true);
        }, 100);

        window.addEventListener('resize', checkMobile);
        return () => {
            window.removeEventListener('resize', checkMobile);
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        if (mounted) {
            // Prevent overscroll and ensure proper mobile behavior
            document.body.style.overscrollBehavior = 'none';
            document.documentElement.style.overscrollBehavior = 'none';

            // Ensure body doesn't have conflicting styles
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100vh';

            return () => {
                document.body.style.overscrollBehavior = '';
                document.documentElement.style.overscrollBehavior = '';
                document.body.style.overflow = '';
                document.body.style.height = '';
            };
        }
    }, [mounted]);

    // Show loading screen only when not mounted
    if (!mounted) {
        return (
            <div className="loading-screen-overlay">
                <div className="loading-spinner">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <div className="mt-2 text-sm text-gray-600">Loading...</div>
                </div>

                <style jsx>{`
                    .loading-screen-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: white;
                        z-index: 9999;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-direction: column;
                    }
                    
                    .loading-spinner {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }
                `}</style>
            </div>
        );
    }

    const LayoutComponent = isMobile ? MobileDashboardLayout : DashboardLayout;

    return (
        <div className="main-app-container">
            <LayoutComponent>
                {children}
            </LayoutComponent>

            <style jsx>{`
                .main-app-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                    -webkit-overflow-scrolling: touch;
                    background: white;
                    z-index: 1;
                }
                
                /* Ensure this is the only visible container */
                .main-app-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: white;
                    z-index: -1;
                }
            `}</style>
        </div>
    );
}

// ALSO: Check your MobileDashboardLayout component for similar issues
// It should look something like this:

export function MobileDashboardLayout({ children }) {
    return (
        <div className="mobile-dashboard">
            {/* Your navigation/header */}
            <div className="mobile-content">
                {children}
            </div>
            {/* Your bottom navigation */}

            <style jsx>{`
                .mobile-dashboard {
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    background: white;
                }
                
                .mobile-content {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    -webkit-overflow-scrolling: touch;
                    position: relative;
                    background: white;
                }
            `}</style>
        </div>
    );
}

// QUICK DEBUGGING: Add this to your app temporarily to see what's happening
// Add this component to your pages to debug the stacking:

export function DebugLayoutInfo() {
    const [debugInfo, setDebugInfo] = useState({});

    useEffect(() => {
        const updateDebugInfo = () => {
            const elements = document.querySelectorAll('[class*="layout"], [class*="container"], [class*="page"]');
            const info = {
                totalElements: elements.length,
                positions: Array.from(elements).map(el => ({
                    className: el.className,
                    position: window.getComputedStyle(el).position,
                    zIndex: window.getComputedStyle(el).zIndex,
                    top: window.getComputedStyle(el).top,
                    height: el.offsetHeight
                }))
            };
            setDebugInfo(info);
        };

        updateDebugInfo();
        window.addEventListener('resize', updateDebugInfo);
        return () => window.removeEventListener('resize', updateDebugInfo);
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: 10,
            right: 10,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            fontSize: '12px',
            zIndex: 10000,
            maxHeight: '200px',
            overflow: 'auto'
        }}>
            <div>Layout Debug Info:</div>
            <div>Total Elements: {debugInfo.totalElements}</div>
            {debugInfo.positions?.slice(0, 5).map((pos, i) => (
                <div key={i}>
                    {pos.className.substring(0, 20)}... - {pos.position} - z:{pos.zIndex}
                </div>
            ))}
        </div>
    );
}