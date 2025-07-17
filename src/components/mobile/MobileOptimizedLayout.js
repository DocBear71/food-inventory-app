// file: /src/components/mobile/MobileOptimizedLayout.js - Mobile-first layout wrapper
'use client';

import { useState, useEffect } from 'react';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { OfflineIndicator } from './OfflineIndicator';
import { PWAUpdatePrompt } from './PWAUpdatePrompt';
import { usePWA } from '@/hooks/usePWA';

export function MobileOptimizedLayout({ children }) {
    const [isMobile, setIsMobile] = useState(false);
    const [orientation, setOrientation] = useState('portrait');
    const [safeAreaInsets, setSafeAreaInsets] = useState({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
    });
    const { isInstalled, setAppBadge } = usePWA();

    // Detect mobile device and orientation
    useEffect(() => {
        const checkDevice = () => {
            const userAgent = navigator.userAgent;
            const mobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            setIsMobile(mobile);
        };

        const checkOrientation = () => {
            if (screen.orientation) {
                setOrientation(screen.orientation.angle === 0 || screen.orientation.angle === 180 ? 'portrait' : 'landscape');
            } else {
                setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
            }
        };

        checkDevice();
        checkOrientation();

        // Listen for orientation changes
        window.addEventListener('orientationchange', checkOrientation);
        window.addEventListener('resize', checkOrientation);

        return () => {
            window.removeEventListener('orientationchange', checkOrientation);
            window.removeEventListener('resize', checkOrientation);
        };
    }, []);

    // Handle safe area insets
    useEffect(() => {
        const updateSafeAreaInsets = () => {
            const computedStyle = getComputedStyle(document.documentElement);
            setSafeAreaInsets({
                top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
                bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
                left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
                right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0')
            });
        };

        updateSafeAreaInsets();
        window.addEventListener('resize', updateSafeAreaInsets);

        return () => window.removeEventListener('resize', updateSafeAreaInsets);
    }, []);

    // Handle app badge for notifications
    useEffect(() => {
        // Example: Clear badge when app opens
        if (isInstalled) {
            setAppBadge(0);
        }
    }, [isInstalled, setAppBadge]);

    return (
        <div
            className={`mobile-optimized-layout ${isMobile ? 'mobile' : 'desktop'} ${orientation}`}
            style={{
                minHeight: '100vh',
                paddingTop: `max(env(safe-area-inset-top, 0px), 0px)`,
                paddingBottom: `max(env(safe-area-inset-bottom, 0px), 0px)`,
                paddingLeft: `max(env(safe-area-inset-left, 0px), 0px)`,
                paddingRight: `max(env(safe-area-inset-right, 0px), 0px)`,
                backgroundColor: '#ffffff',
                position: 'relative'
            }}
        >
            {/* PWA Status Components */}
            <OfflineIndicator />
            <PWAUpdatePrompt />

            {/* Main Content */}
            <main style={{
                minHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
                position: 'relative'
            }}>
                {children}
            </main>

            {/* PWA Install Prompt */}
            {!isInstalled && <PWAInstallPrompt />}

            {/* Mobile-specific styles */}
            <style jsx>{`
        .mobile-optimized-layout {
          /* Touch optimization */
          touch-action: manipulation;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
          
          /* iOS Safari optimizations */
          -webkit-overflow-scrolling: touch;
          -webkit-appearance: none;
        }
        
        .mobile-optimized-layout.mobile {
          /* Mobile-specific optimizations */
          overflow-x: hidden;
        }
        
        .mobile-optimized layout.landscape {
          /* Landscape-specific adjustments */
        }
        
        /* Disable zoom on input focus (iOS Safari) */
        :global(input, select, textarea) {
          font-size: 16px !important;
        }
        
        /* Improve tap targets */
        :global(button, a, [role="button"]) {
          min-height: 44px;
          min-width: 44px;
        }
        
        /* Remove iOS Safari bounce effect */
        :global(body) {
          position: fixed;
          overflow: hidden;
          width: 100%;
          height: 100%;
        }
        
        /* Optimize scrolling */
        :global(.scrollable) {
          -webkit-overflow-scrolling: touch;
          overflow-scrolling: touch;
        }
        
        /* High DPI optimizations */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
          .mobile-optimized-layout {
            /* Crisp rendering on high DPI displays */
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .mobile-optimized-layout {
            background-color: #111827;
            color: #f9fafb;
          }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .mobile-optimized-layout * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
        </div>
    );
}