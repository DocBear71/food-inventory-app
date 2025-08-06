import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'kitchen.docbearscomfort',
    appName: "Doc Bear's Comfort Kitchen",
    webDir: 'out',
    server: {
        url: 'https://www.docbearscomfort.kitchen',
        cleartext: true,
        androidScheme: 'https'
    },
    plugins: {
        StatusBar: {
            style: 'LIGHT_CONTENT',
            backgroundColor: '#00000000',
            overlaysWebView: false, // IMPORTANT: This fixes bottom nav issues
        },

        SplashScreen: {
            launchAutoHide: false,
            androidScaleType: 'CENTER_CROP',
            androidSpinnerStyle: 'large',
            iosSpinnerStyle: 'small',
            spinnerColor: '#4f46e5',
            showSpinner: true,
            splashFullScreen: true,
            splashImmersive: true
        },

        Camera: {
            permissions: ['camera']
        },

        Microphone: {
            permissions: ['microphone']
        },

        // FIXED: Proper @gachlab/capacitor-permissions configuration
        Permissions: {
            // This should match the plugin's expected configuration
        },

        Geolocation: {
            permissions: ['coarse-location', 'fine-location']
        },

        PushNotifications: {
            presentationOptions: ["badge", "sound", "alert"]
        },

        LocalNotifications: {
            smallIcon: "ic_stat_icon_config_sample",
            iconColor: "#4f46e5"
        },

        CapacitorHttp: {
            enabled: false
        },

        CapacitorCookies: {
            enabled: false
        },

        ImageToText: {
            language: 'en'
        },

        // ADDED: Device plugin for better permission handling
        Device: {
            // This helps with platform detection in VoiceInput component
        },

        // ADDED: Keyboard plugin for better voice input UX
        Keyboard: {
            resize: 'native',
            style: 'light',
            resizeOnFullScreen: true
        },

        // ADDED: Haptics for voice input feedback
        Haptics: {
            // Enable haptic feedback for voice input buttons
        },

        Purchases: {
            // Your existing purchases config
        }
    },

    android: {
        allowMixedContent: true,
        captureInput: true,
        webContentsDebuggingEnabled: true,
        loggingBehavior: 'debug',
        backgroundColor: '#ffffff'
    },

    ios: {
        contentInset: 'automatic'
    }

};

export default config;