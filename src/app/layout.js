// file: /src/app/layout.js v2 - Updated with iOS Safari PWA support


import { Inter } from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import PWAWrapper from '@/components/PWAWrapper';
import CapacitorAuthProvider from '@/components/CapacitorAuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Doc Bear\'s Comfort Kitchen',
    description: 'Manage your Food Inventory and find recipes based on what you have',
    // ... keep all your existing metadata
    manifest: '/manifest.json',
    themeColor: '#4f46e5',
    viewport: {
        width: 'device-width',
        initialScale: 1,
        maximumScale: 1,
        userScalable: false,
        viewportFit: 'cover'
    },
    // Apple PWA support - Enhanced for iOS
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Comfort Kitchen'
    },
    formatDetection: {
        telephone: false,
        date: false,
        email: false,
        address: false
    },
    // Icons - Enhanced with more Apple sizes
    icons: {
        icon: [
            { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
            { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ],
        apple: [
            { url: '/icons/apple-icon-57x57.png', sizes: '57x57' },
            { url: '/icons/apple-icon-60x60.png', sizes: '60x60' },
            { url: '/icons/apple-icon-72x72.png', sizes: '72x72' },
            { url: '/icons/apple-icon-76x76.png', sizes: '76x76' },
            { url: '/icons/apple-icon-114x114.png', sizes: '114x114' },
            { url: '/icons/apple-icon-120x120.png', sizes: '120x120' },
            { url: '/icons/apple-icon-144x144.png', sizes: '144x144' },
            { url: '/icons/apple-icon-152x152.png', sizes: '152x152' },
            { url: '/icons/apple-icon-180x180.png', sizes: '180x180' }
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

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <head>
            {/* PWA meta tags */}
            <link rel="manifest" href="/manifest.json" />
            <meta name="theme-color" content="#4f46e5" />

            {/* iOS Safari specific meta tags */}
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content="Comfort Kitchen" />
            <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />

            {/* Microsoft Tiles */}
            <meta name="msapplication-TileColor" content="#4f46e5" />
            <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
            <meta name="msapplication-tap-highlight" content="no" />

            {/* iOS Safari viewport - Critical for proper iOS display */}
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />

            {/* Additional Apple touch icons for better iOS support */}
            <link rel="apple-touch-icon" sizes="57x57" href="/icons/apple-icon-57x57.png" />
            <link rel="apple-touch-icon" sizes="60x60" href="/icons/apple-icon-60x60.png" />
            <link rel="apple-touch-icon" sizes="72x72" href="/icons/apple-icon-72x72.png" />
            <link rel="apple-touch-icon" sizes="76x76" href="/icons/apple-icon-76x76.png" />
            <link rel="apple-touch-icon" sizes="114x114" href="/icons/apple-icon-114x114.png" />
            <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-icon-120x120.png" />
            <link rel="apple-touch-icon" sizes="144x144" href="/icons/apple-icon-144x144.png" />
            <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-icon-152x152.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-icon-180x180.png" />

            {/* iOS Safari startup images (optional) */}
            <link rel="apple-touch-startup-image"
                  media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
                  href="/splash/apple-splash-1125-2436.png" />
            <link rel="apple-touch-startup-image"
                  media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
                  href="/splash/apple-splash-828-1792.png" />

            {/* Service Worker and iOS fixes */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `
                        // iOS viewport height fix
                        function setVH() {
                            const vh = window.innerHeight * 0.01;
                            document.documentElement.style.setProperty('--vh', vh + 'px');
                        }
                        
                        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                            setVH();
                            window.addEventListener('resize', setVH);
                            window.addEventListener('orientationchange', () => {
                                setTimeout(setVH, 100);
                            });
                        }
                    `,
                }}
            />
        </head>
        <body className={inter.className}>
        <CapacitorAuthProvider>
            <PWAWrapper>
                <SessionProvider>
                    {children}
                </SessionProvider>
            </PWAWrapper>
        </CapacitorAuthProvider>
        </body>
        </html>
    );
}