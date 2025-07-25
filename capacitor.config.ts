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
        // ADDED: StatusBar configuration for Android 15+ compatibility
        StatusBar: {
            style: 'LIGHT_CONTENT',
            backgroundColor: '#00000000', // Transparent - handled by theme
            overlaysWebView: false, // Prevents deprecated overlay methods
            androidColorScheme: 'auto' // Let system handle color scheme
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
            enabled: true
        },

        CapacitorCookies: {
            enabled: true
        },

        ImageToText: {
            language: 'en'
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