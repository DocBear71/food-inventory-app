import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'kitchen.docbearscomfort',
    appName: "Doc Bear's Comfort Kitchen",
    webDir: 'out',
    
    // ENHANCED: Better server config for iOS routing
    server: {
        url: 'https://food-inventory-app-git-ios-fixes-edward-mckeowns-projects.vercel.app?_vercel_share=vGtAPUpvHm2Y1SsK2T0X2ML6RYdaakFl', 
        cleartext: true,
        androidScheme: 'https',
        iosScheme: 'https',
        allowNavigation: [
            'https://www.docbearscomfort.kitchen',
            'https://docbearscomfort.kitchen',
            'https://*.docbearscomfort.kitchen',
            'https://food-inventory-app-git-ios-fixes-edward-mckeowns-projects.vercel.app', // ADD THIS TOO
            'https://*.vercel.app' // ADD THIS FOR ALL VERCEL PREVIEWS
        ],
        // CRITICAL: Handle 404s for dynamic routes
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
        },
        
        Camera: {
            permissions: ['camera']
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
            enabled: true
        },
        CapacitorCookies: {
            enabled: true
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