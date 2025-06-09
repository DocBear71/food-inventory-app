// file: /src/app/layout.js - Updated with PWA support

import { Inter } from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import PWAWrapper from '@/components/PWAWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Doc Bear\'s Comfort Kitchen',
    description: 'Manage your Food Inventory and find recipes based on what you have',
    // PWA metadata
    manifest: '/manifest.json',
    themeColor: '#4f46e5',
    viewport: {
        width: 'device-width',
        initialScale: 1,
        maximumScale: 1,
        userScalable: false,
        viewportFit: 'cover'
    },
    // Apple PWA support
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Doc Bear\'s Comfort Kitchen'
    },
    // Icons
    icons: {
        icon: [
            { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' }
        ],
        apple: [
            { url: '/icons/apple-icon-180x180.png', sizes: '180x180', type: 'image/png' },
            { url: '/icons/apple-icon-152x152.png', sizes: '152x152', type: 'image/png' },
            { url: '/icons/apple-icon-144x144.png', sizes: '144x144', type: 'image/png' },
            { url: '/icons/apple-icon-120x120.png', sizes: '120x120', type: 'image/png' }
        ]
    },
    // Additional PWA meta tags
    other: {
        'mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'default',
        'msapplication-TileColor': '#4f46e5',
        'msapplication-tap-highlight': 'no'
    }
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <head>
            {/* PWA meta tags */}
            <link rel="manifest" href="/manifest.json" />
            <meta name="theme-color" content="#4f46e5" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content="Doc Bear\'s Comfort Kitchen" />
            <meta name="msapplication-TileColor" content="#4f46e5" />
            <meta name="msapplication-tap-highlight" content="no" />

            {/* Prevent zoom on input focus (iOS) */}
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        </head>
        <body className={inter.className}>
        <PWAWrapper>
            <SessionProvider>
                {children}
            </SessionProvider>
        </PWAWrapper>
        </body>
        </html>
    );
}
