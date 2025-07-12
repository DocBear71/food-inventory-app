'use client';

// file: /src/app/layout.js v9 - Added global share handler

import {Inter} from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import PWAWrapper from '@/components/PWAWrapper';
import CapacitorAuthProvider from '@/components/providers/CapacitorAuthProvider';
import NativeAuthHandler from '@/components/NativeAuthHandler';
import {SubscriptionProvider} from '@/hooks/useSubscription';
import ViewportHandler from '@/components/ViewportHandler';
import PlatformAwareWrapper from '@/components/PlatformAwareWrapper';
import GlobalShareHandler from '@/components/GlobalShareHandler';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ADDED: Import the auth fix for native apps
import '@/lib/capacitor-auth-fix';
import SafeAreaBackground from "@/components/SafeAreaBackground";

const inter = Inter({subsets: ['latin']});

function DirectShareHandler() {
    const router = useRouter();

    useEffect(() => {
        console.log('🔧 DirectShareHandler mounted and listening...');

        const handleShare = (event) => {
            console.log('🎯 DIRECT share handler received:', event.detail);
            const { url, source } = event.detail;

            // Check if it's a Facebook URL
            if (url && (url.includes('facebook.com') || url.includes('fb.watch'))) {
                console.log('✅ Facebook URL detected, navigating...');

                alert(`🚀 Facebook share detected!\nNavigating to recipe import...\nURL: ${url}`);

                // Navigate to recipe import
                const encodedUrl = encodeURIComponent(url);
                const targetUrl = `/recipes/add?videoUrl=${encodedUrl}&source=share&platform=facebook`;

                console.log('🚀 Navigating to:', targetUrl);
                router.push(targetUrl);
            } else {
                console.log('❌ Not a Facebook URL:', url);
            }
        };

        window.addEventListener('shareReceived', handleShare);

        return () => {
            console.log('🔧 DirectShareHandler unmounting...');
            window.removeEventListener('shareReceived', handleShare);
        };
    }, [router]);

    return (
        <div className="fixed top-0 left-0 right-0 bg-green-100 border border-green-400 text-green-700 px-4 py-3 text-sm z-50">
            <strong>Debug:</strong> DirectShareHandler active - ready for shares
        </div>
    );
}

export default function RootLayout({children}) {
    return (
        <html lang="en">
        <body className={inter.className}>
        <SafeAreaBackground />
        <ViewportHandler />
        <CapacitorAuthProvider>
            <SessionProvider>
                <SubscriptionProvider>
                    <PlatformAwareWrapper>
                        <DirectShareHandler />
                        {children}
                    </PlatformAwareWrapper>
                </SubscriptionProvider>
            </SessionProvider>
        </CapacitorAuthProvider>
        </body>
        </html>
    );
}