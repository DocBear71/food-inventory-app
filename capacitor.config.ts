// file: /src/capacitor.config.ts v4 - CORRECTED - Removed invalid iOS permissions property

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.edward.docbearscomfort2025',
    appName: "Doc Bear's Comfort Kitchen",
    webDir: 'out',
    
    server: {
        url: 'https://docbearscomfort.kitchen',
        cleartext: true,
        androidScheme: 'https',
        iosScheme: 'https',
        allowNavigation: [
            'https://docbearscomfort.kitchen',
            'https://*.docbearscomfort.kitchen'
        ],
        errorPath: 'index.html',
    },
    
    plugins: {
        StatusBar: {
            style: 'LIGHT_CONTENT',
            backgroundColor: '#00000000',
            overlaysWebView: false,
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
        
        App: {
            launchUrl: 'index.html',
            enableBackButtonHandler: true,
            enableSwipeGestures: true
        },
        
        Dialog: {
            iosStyle: 'actionSheet',
            androidTheme: 'THEME_DEVICE_DEFAULT_LIGHT'
        },
        
        ActionSheet: {
            style: 'automatic'
        },
        
        Browser: {
            iosOptions: {
                modalPresentationStyle: 'overFullScreen',
                modalTransitionStyle: 'coverVertical',
                enableViewportScale: true,
                allowOverScroll: true,
                enableBarsCollapsing: true,
                toolbarColor: '#4f46e5',
                closeButtonColor: '#ffffff'
            },
            androidOptions: {
                showTitle: true,
                toolbarColor: '#4f46e5',
                secondaryToolbarColor: '#ffffff',
                enableUrlBarHiding: true,
                enableDefaultShare: true
            }
        },
                
        Camera: {
            permissions: ['camera', 'photos']
        },
        
        BarcodeScanning: {
            // Optional: Configure MLKit barcode scanning
            // These are the default values, so you can omit this entirely
            formats: ['UPC_A', 'UPC_E', 'EAN_8', 'EAN_13', 'CODE_128', 'CODE_39', 'QR_CODE'],
            lensFacing: 'back'
        },
        
        HapticFeedback: {
            enabled: true
        },
        
        
        Microphone: {
            permissions: ['microphone']
        },
        Permissions: {},
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
        Device: {},
        Keyboard: {
            resize: 'native',
            style: 'light',
            resizeOnFullScreen: true
        },
        Haptics: {},
        Purchases: {}
    },
    android: {
        allowMixedContent: true,
        captureInput: true,
        webContentsDebuggingEnabled: true,
        loggingBehavior: 'debug',
        backgroundColor: '#ffffff'
    },
    ios: {
        contentInset: 'automatic',
        allowsLinkPreview: false,
        webContentsDebuggingEnabled: true,
        scheme: 'App'
        // REMOVED: permissions array - this property doesn't exist
    }
};

export default config;