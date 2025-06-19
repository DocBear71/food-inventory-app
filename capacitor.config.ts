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
        Camera: {
            permissions: ['camera']
        },
        CapacitorHttp: {
            enabled: true
        },
        CapacitorCookies: {
            enabled: true
        }
    },
    android: {
        allowMixedContent: true,
        captureInput: true,
        webContentsDebuggingEnabled: true
    }
};

export default config;