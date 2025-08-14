// file: /src/lib/capacitor-fix.js - Create this file to ensure Capacitor loads properly

'use client';

// Ensure Capacitor is properly initialized before app starts
if (typeof window !== 'undefined') {
    console.log('🔧 Capacitor initialization fix loaded');

    // Check if we're in a native environment
    const isLikelyNative = () => {
        const userAgent = navigator.userAgent || '';
        return (
            // Android WebView indicators
            (userAgent.includes('Android') && userAgent.includes('wv')) ||
            // iOS WebView indicators
            (/iPhone|iPad/.test(userAgent) && !userAgent.includes('Safari')) ||
            // Custom app signatures
            userAgent.includes('CapacitorWebView') ||
            userAgent.includes('DocBearsComfortKitchen') ||
            // Protocol indicators
            window.location.protocol === 'file:' ||
            window.location.protocol === 'capacitor:'
        );
    };

    if (isLikelyNative()) {
        console.log('🔧 Native environment detected, ensuring Capacitor setup');

        // Prevent triggerEvent errors by providing a minimal fallback
        if (!window.Capacitor) {
            console.log('🔧 Creating Capacitor fallback object');
            window.Capacitor = {
                isNativePlatform: () => true,
                getPlatform: () => {
                    const userAgent = navigator.userAgent || '';
                    if (userAgent.includes('Android')) return 'android';
                    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'ios';
                    return 'unknown';
                },
                triggerEvent: (eventName, eventData) => {
                    console.log('🔧 Fallback triggerEvent called:', eventName, eventData);
                    // Prevent the undefined errors
                    return Promise.resolve();
                }
            };
        }

        // Wait for real Capacitor to load and replace fallback
        const waitForCapacitor = async () => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds total

            while (attempts < maxAttempts) {
                try {
                    // Try to import the real Capacitor
                    const { Capacitor } = await import('@capacitor/core');
                    if (Capacitor && typeof Capacitor.isNativePlatform === 'function') {
                        console.log('✅ Real Capacitor loaded, replacing fallback');
                        window.Capacitor = Capacitor;
                        break;
                    }
                } catch (error) {
                    // Import failed, continue waiting
                }

                attempts++;
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (attempts >= maxAttempts) {
                console.log('⚠️ Real Capacitor failed to load, using fallback');
            }
        };

        waitForCapacitor();
    }
}