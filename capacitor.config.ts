import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.edward.docbearscomfort2025',
    appName: "Doc Bear\'s Comfort Kitchen",
    webDir: 'out',
    
    // ENHANCED: Better server config for iOS routing
    server: {
        url: 'https://docbearscomfort.kitchen',
        cleartext: true,
        androidScheme: 'https',
        iosScheme: 'https',
        allowNavigation: [
            'https://docbearscomfort.kitchen',
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
        
        // CRITICAL: Add App plugin configuration for routing
        App: {
            launchUrl: 'index.html',
            handleUrl: (url: string) => {
                console.log('📱 iOS handling shared URL:', url);
                return { url };
            }
        },
                
        Camera: {
            permissions: ['camera', 'photos']
        },
        
        // NEW: Official Capacitor Barcode Scanner (iOS optimized)
        BarcodeScanner: {
            targetedFormats: ['UPC_A', 'UPC_E', 'EAN_8', 'EAN_13', 'CODE_128', 'CODE_39', 'QR_CODE'],
            cameraDirection: 'back',
            scanButton: false,
            scanText: 'Position barcode in the center',
            maxZoom: 3,
            showTorchButton: true,
            enableTorch: false
        },
        
        // KEEP: MLKit barcode scanner for fallback compatibility
        CapacitorMlkitBarcodeScanning: {
            // Keep this for potential fallback scenarios
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
        scheme: 'App',
    }
};

export default config;