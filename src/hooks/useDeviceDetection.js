// file: /src/hooks/useDeviceDetection.js - Device detection hook
'use client';

import { useState, useEffect } from 'react';

export function useDeviceDetection() {
    const [deviceInfo, setDeviceInfo] = useState({
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isTouchDevice: false,
        screenSize: 'unknown'
    });

    useEffect(() => {
        const checkDevice = () => {
            const width = window.innerWidth;
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            setDeviceInfo({
                isMobile: width < 768,
                isTablet: width >= 768 && width < 1024,
                isDesktop: width >= 1024,
                isTouchDevice,
                screenSize: width < 640 ? 'sm' : width < 768 ? 'md' : width < 1024 ? 'lg' : 'xl'
            });
        };

        checkDevice();
        window.addEventListener('resize', checkDevice);

        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    return deviceInfo;
}