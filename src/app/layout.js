'use client';

// file: /src/app/layout.js v12 - SIMPLIFIED: Let PlatformAwareWrapper handle platform detection

import {Inter} from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import CapacitorAuthProvider from '@/components/providers/CapacitorAuthProvider';
import {SubscriptionProvider} from '@/hooks/useSubscription';
import ViewportHandler from '@/components/ViewportHandler';
import PlatformAwareWrapper from '@/components/PlatformAwareWrapper';
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

            // FIXED: Check for ALL social media platforms, not just Facebook
            const socialPlatforms = {
                facebook: {
                    patterns: [
                        /facebook\.com\/reel\/\d+/,
                        /facebook\.com\/watch\?v=\d+/,
                        /facebook\.com\/share\/r\/[^\/\s]+/,
                        /facebook\.com\/[^\/]+\/videos\/\d+/,
                        /fb\.watch\/[^\/\s]+/
                    ]
                },
                tiktok: {
                    patterns: [
                        /tiktok\.com\/@[^\/]+\/video\/\d+/,
                        /tiktok\.com\/t\/[a-zA-Z0-9]+/,
                        /vm\.tiktok\.com\/[a-zA-Z0-9]+/,
                        /tiktok\.com\/.*?\/video\/\d+/
                    ]
                },
                instagram: {
                    patterns: [
                        /instagram\.com\/reel\/[a-zA-Z0-9_-]+/,
                        /instagram\.com\/p\/[a-zA-Z0-9_-]+/,
                        /instagram\.com\/tv\/[a-zA-Z0-9_-]+/
                    ]
                }
            };

            // Test each platform
            let detectedPlatform = null;
            for (const [platform, config] of Object.entries(socialPlatforms)) {
                const isMatch = config.patterns.some(pattern => pattern.test(url));
                if (isMatch) {
                    detectedPlatform = platform;
                    break;
                }
            }

            if (detectedPlatform && url) {
                console.log(`✅ ${detectedPlatform} video detected!`);

                // Navigate to recipe import with detected platform
                const encodedUrl = encodeURIComponent(url);
                const targetUrl = `/recipes/add?videoUrl=${encodedUrl}&source=share&platform=${detectedPlatform}`;

                console.log('🚀 Navigating to:', targetUrl);
                router.push(targetUrl);
            } else {
                console.log('❌ Not a supported social media URL:', url);
                console.log('   Supported platforms: Facebook, TikTok, Instagram');
            }
        };

        window.addEventListener('shareReceived', handleShare);

        return () => {
            console.log('🔧 DirectShareHandler unmounting...');
            window.removeEventListener('shareReceived', handleShare);
        };
    }, [router]);

    return null; // This component doesn't render anything
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