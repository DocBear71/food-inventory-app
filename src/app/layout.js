// file: /src/app/layout.js v7 - Added NativeAuthHandler

import {Inter} from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import PWAWrapper from '@/components/PWAWrapper';
import CapacitorAuthProvider from '@/components/providers/CapacitorAuthProvider';
import NativeAuthHandler from '@/components/NativeAuthHandler';
import {SubscriptionProvider} from '@/hooks/useSubscription';
import ViewportHandler from '@/components/ViewportHandler';

// ADDED: Import the auth fix for native apps
import '@/lib/capacitor-auth-fix';
import SafeAreaBackground from "@/components/SafeAreaBackground";

const inter = Inter({subsets: ['latin']});

export const metadata = {
    title: 'Doc Bear\'s Comfort Kitchen',
    description: 'Manage your Food Inventory and find recipes based on what you have',
    manifest: '/manifest.json',
    // Icons - Enhanced with more Apple sizes
    icons: {
        icon: [
            {url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png'},
            {url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png'},
            {url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png'},
            {url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png'}
        ],
        apple: [
            {url: '/icons/apple-icon-57x57.png', sizes: '57x57'},
            {url: '/icons/apple-icon-60x60.png', sizes: '60x60'},
            {url: '/icons/apple-icon-72x72.png', sizes: '72x72'},
            {url: '/icons/apple-icon-76x76.png', sizes: '76x76'},
            {url: '/icons/apple-icon-114x114.png', sizes: '114x114'},
            {url: '/icons/apple-icon-120x120.png', sizes: '120x120'},
            {url: '/icons/apple-icon-144x144.png', sizes: '144x144'},
            {url: '/icons/apple-icon-152x152.png', sizes: '152x152'},
            {url: '/icons/apple-icon-180x180.png', sizes: '180x180'}
        ]
    },
    // Additional PWA meta tags
    other: {
        'mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'default',
        'apple-mobile-web-app-title': 'Comfort Kitchen',
        'msapplication-TileColor': '#4f46e5',
        'msapplication-tap-highlight': 'no',
        'format-detection': 'telephone=no, date=no, email=no, address=no'
    }
};

export function generateViewport() {
    return {
        width: 'device-width',
        initialScale: 1,
        maximumScale: 1,
        userScalable: false,
        viewportFit: 'cover',
        themeColor: '#4f46e5'
    }
}

export default async function RootLayout({children}) {
    // Determine if this is a native mobile app (Capacitor) vs web
    const isNativeMobileApp = process.env.CAPACITOR_PLATFORM === 'ios' ||
        process.env.CAPACITOR_PLATFORM === 'android';

    return (
        <html lang="en">
        <body className={inter.className}>
        <SafeAreaBackground />
        <ViewportHandler />
        <CapacitorAuthProvider>
            {isNativeMobileApp ? (
                // FIXED: Native mobile apps with proper auth handling
                <SessionProvider>
                    <SubscriptionProvider>
                        <NativeAuthHandler>
                            {children}
                        </NativeAuthHandler>
                    </SubscriptionProvider>
                </SessionProvider>
            ) : (
                // Web builds (including PWA) - full PWA functionality
                <SessionProvider>
                    <SubscriptionProvider>
                        <PWAWrapper>
                            {children}
                        </PWAWrapper>
                    </SubscriptionProvider>
                </SessionProvider>
            )}
        </CapacitorAuthProvider>
        </body>
        </html>
    );
}