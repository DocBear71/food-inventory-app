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
        // UPDATED: StatusBar configuration for Android 15+ compatibility
        StatusBar: {
            style: 'LIGHT_CONTENT',
            backgroundColor: '#00000000', // Transparent - handled by theme
            overlaysWebView: false, // Prevents deprecated overlay methods - IMPORTANT for bottom nav
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

        // UPDATED: Enhanced microphone configuration
        Microphone: {
            permissions: ['microphone'],
            // Add audio quality settings for better voice recognition
            audioQuality: 'high',
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        },

        // UPDATED: @gachlab/capacitor-permissions configuration for microphone
        Permissions: {
            permissions: [
                'microphone',
                'camera',
                'geolocation'
            ],
            // Configure specific permission behavior
            microphone: {
                alias: 'microphone',
                permission: 'microphone',
                // Android-specific settings
                android: {
                    permissions: [
                        'android.permission.RECORD_AUDIO',
                        'android.permission.MODIFY_AUDIO_SETTINGS'
                    ]
                },
                // iOS-specific settings
                ios: {
                    usage: 'This app needs microphone access for voice input features.'
                }
            }
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

        // ADDED: Device plugin configuration for better permission handling
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
        webContentsDebuggingEnabled: true, // Set to false for production
        loggingBehavior: 'debug', // Set to 'none' for production
        backgroundColor: '#ffffff',
        useLegacyBridge: false,
    },

    ios: {
        contentInset: 'automatic',
    }
};

export default config;