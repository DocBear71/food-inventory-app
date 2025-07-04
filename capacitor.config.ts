import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'kitchen.docbearscomfort',
    appName: "Doc Bear's Comfort Kitchen",
    webDir: 'out',

    // ADDED: Server configuration for Android session persistence
    server: {
        androidScheme: 'https',
        cleartext: true,
        hostname: 'localhost',
        iosScheme: 'ionic'
    },

    plugins: {
        Camera: {
            // FIXED: Proper camera permissions configuration for Capacitor 7
            permissions: ['camera']
        },

        CapacitorHttp: {
            enabled: true
        },

        CapacitorCookies: {
            enabled: true
        },

        // Add ImageToText plugin configuration
        ImageToText: {
            // ML Kit Text Recognition configuration
            language: 'en' // Default language for OCR
        }
    },

    android: {
        allowMixedContent: true,
        captureInput: true,
        webContentsDebuggingEnabled: true,

        // FIXED: Add proper Android-specific settings
        loggingBehavior: 'debug',

        // Handle system bars properly
        backgroundColor: '#ffffff',

        // ADDED: Additional Android session handling
        appendUserAgent: 'DocBearsKitchen'
    },

    // Add iOS config for completeness
    ios: {
        contentInset: 'automatic',

        // ADDED: iOS session handling
        allowsLinkPreview: false
    }
};

export default config;