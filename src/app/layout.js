'use client';

// file: /src/app/layout.js v16 - MINIMAL: Restored to working version + essential SEO fix

import {Inter} from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import CapacitorAuthProvider from '@/components/providers/CapacitorAuthProvider';
import {SubscriptionProvider} from '@/hooks/useSubscription';
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider';
import ViewportHandler from '@/components/ViewportHandler';
import PlatformAwareWrapper from '@/components/PlatformAwareWrapper';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import '@/lib/capacitor-auth-fix';
import SafeAreaBackground from "@/components/SafeAreaBackground";
import '@/lib/force-native-routing';

const inter = Inter({subsets: ['latin']});

function DirectShareHandler() {
    const router = useRouter();

    useEffect(() => {
        console.log('🔧 DirectShareHandler mounted and listening...');

        const handleShare = (event) => {
            console.log('🎯 DIRECT share handler received:', event.detail);
            const { url, source } = event.detail;

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
                const encodedUrl = encodeURIComponent(url);
                const targetUrl = `/recipes/add?videoUrl=${encodedUrl}&source=share&platform=${detectedPlatform}`;
                console.log('🚀 Navigating to:', targetUrl);
                router.push(targetUrl);
            } else {
                console.log('❌ Not a supported social media URL:', url);
            }
        };

        window.addEventListener('shareReceived', handleShare);
        return () => {
            window.removeEventListener('shareReceived', handleShare);
        };
    }, [router]);

    return null;
}

// CRITICAL: Simple native detection - no complex systems
function useSimpleNativeDetection() {
    const [isNative, setIsNative] = useState(null);

    useEffect(() => {
        const detectNative = () => {
            // Method 1: Direct Capacitor check
            if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform) {
                const result = window.Capacitor.isNativePlatform();
                if (result) {
                    console.log('🔍 SIMPLE: Capacitor says native');
                    return true;
                }
            }

            // Method 2: Android app indicators (your app loads from web but should be treated as native)
            if (typeof window !== 'undefined') {
                const userAgent = navigator.userAgent || '';
                const isAndroid = userAgent.includes('Android') && userAgent.includes('Mobile');
                const hasCapacitor = typeof window.Capacitor !== 'undefined';
                const isYourDomain = window.location.hostname === 'docbearscomfort.kitchen';
                const isHTTPS = window.location.protocol === 'https:';

                if (isAndroid && hasCapacitor && isYourDomain && isHTTPS) {
                    console.log('🔍 SIMPLE: Android app detected via indicators');
                    return true;
                }
            }

            console.log('🔍 SIMPLE: Web browser detected');
            return false;
        };

        const result = detectNative();
        setIsNative(result);

        // Store globally for other components (minimal, non-conflicting)
        if (result !== null) {
            window.simpleNativeDetection = result;
        }
    }, []);

    return isNative;
}

// Enhanced Structured Data Component
function StructuredData() {
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Doc Bear's Comfort Kitchen",
        "description": "AI-powered food inventory management and recipe discovery app with multi-part recipe support, international barcode scanning, and social media recipe extraction",
        "url": "https://docbearscomfort.kitchen",
        "applicationCategory": "LifestyleApplication",
        "operatingSystem": ["Web", "iOS", "Android"],
        "offers": [
            {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
                "name": "Free Plan"
            },
            {
                "@type": "Offer",
                "price": "4.99",
                "priceCurrency": "USD",
                "name": "Gold Plan",
                "billingIncrement": "P1M"
            },
            {
                "@type": "Offer",
                "price": "9.99",
                "priceCurrency": "USD",
                "name": "Platinum Plan",
                "billingIncrement": "P1M"
            }
        ],
        "author": {
            "@type": "Person",
            "name": "Dr. Edward McKeown",
            "description": "U.S. Marine Corps veteran, food safety expert, and author of Doc Bear's Comfort Food Survival Guide cookbook series",
            "jobTitle": "Founder & Creator"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Doc Bear Enterprises, LLC",
            "url": "https://docbearscomfort.kitchen"
        },
        "featureList": [
            "Multi-part recipe management with organized sections",
            "AI-powered recipe extraction from social media",
            "International barcode scanning (80+ countries)",
            "Smart food inventory tracking",
            "Recipe discovery with advanced search and filtering",
            "Voice nutrition analysis",
            "Shopping list generation and management",
            "Meal planning and completion tracking",
            "Recipe scaling with unit conversion",
            "Cross-platform access (Web, iOS, Android)"
        ]
    };

    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Doc Bear's Comfort Kitchen",
        "url": "https://docbearscomfort.kitchen",
        "potentialAction": {
            "@type": "SearchAction",
            "target": "https://docbearscomfort.kitchen/recipe-search?q={search_term_string}",
            "query-input": "required name=search_term_string"
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
            />
        </>
    );
}

export default function RootLayout({children}) {
    const isNative = useSimpleNativeDetection();

    // Show loading until we know if it's native or not
    if (isNative === null) {
        return (
            <html lang="en">
            <head>
                <title>Doc Bear's Comfort Kitchen</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body className={inter.className}>
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
            </body>
            </html>
        );
    }

    console.log('🎯 SIMPLE Layout rendering:', isNative ? 'NATIVE' : 'WEB');

    return (
        <html lang="en">
        <head>
            {/* Primary Meta Tags - ALWAYS SAFE */}
            <title>Doc Bear's Comfort Kitchen - AI-Powered Recipe & Food Inventory Management</title>
            <meta name="title" content="Doc Bear's Comfort Kitchen - AI-Powered Recipe & Food Inventory Management" />
            <meta name="description" content="Smart food inventory management with AI-powered recipe discovery, multi-part recipes, international barcode scanning, and social media recipe extraction. Free app for iOS, Android & Web." />
            <meta name="keywords" content="recipe app, food inventory, meal planning, barcode scanner, AI recipes, multi-part recipes, social media recipe extraction, TikTok recipes, food management, cooking app, grocery list, nutrition tracker, recipe discovery, voice nutrition, international barcode, recipe scaling" />

            {/* ONLY for web browsers - these cause problems in native apps */}
            {!isNative && (
                <>
                    <meta name="google-site-verification" content="jMxjOqCxZwYkjcIXLpc6rIIBLeeyCT78dX196T8At0U" />
                    <meta name="msvalidate.01" content="2B3DAD655CB93EEB509AB574BEA9A845" />
                    <meta name="p:domain_verify" content="41876bc30a1ee0330ab8aed8b2b64497" />
                    <base href={process.env.NODE_ENV === 'production' ? 'https://docbearscomfort.kitchen/' : 'http://localhost:3000/'} />
                    <link rel="canonical" href="https://docbearscomfort.kitchen/" />
                    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
                    <meta name="googlebot" content="index, follow" />
                    <meta name="bingbot" content="index, follow" />
                    <meta name="apple-itunes-app" content="app-id=coming-soon, app-argument=https://docbearscomfort.kitchen/" />
                    <meta name="google-play-app" content="app-id=kitchen.docbearscomfort" />
                </>
            )}

            {/* ALWAYS SAFE - these work fine in both web and native */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content="https://docbearscomfort.kitchen/" />
            <meta property="og:title" content="Doc Bear's Comfort Kitchen - AI Recipe & Food Management App" />
            <meta property="og:description" content="Revolutionary food inventory app with AI recipe extraction from TikTok/Instagram, multi-part recipes, international barcode scanning, and smart meal planning. Free to start!" />
            <meta property="og:image" content="https://docbearscomfort.kitchen/images/og-image.jpg" />
            <meta property="og:site_name" content="Doc Bear's Comfort Kitchen" />

            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:title" content="Doc Bear's Comfort Kitchen - AI Recipe & Food Management" />
            <meta property="twitter:description" content="Smart food inventory with AI recipe extraction from social media, multi-part recipes, international barcode scanning. Free app for all devices!" />
            <meta property="twitter:image" content="https://docbearscomfort.kitchen/images/twitter-card.jpg" />

            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content="Doc Bear's Kitchen" />

            <meta name="author" content="Dr. Edward McKeown" />
            <meta name="publisher" content="Doc Bear Enterprises, LLC" />
            <meta name="copyright" content="© 2025 Doc Bear Enterprises, LLC" />

            <meta name="theme-color" content="#7c3aed" />
            <meta name="msapplication-TileColor" content="#7c3aed" />

            <link rel="icon" type="image/x-icon" href="favicon.ico" />
            <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-icon-180x180.png" />
            <link rel="manifest" href="/manifest.json" />

            {/* Structured Data - ONLY for web */}
            {!isNative && <StructuredData />}

            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

            {/* Debug indicator */}
            <meta name="app-mode" content={isNative ? "native" : "web"} />
        </head>
        <body className={inter.className}>
        {/* Debug banner - remove in production */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white text-xs p-1 text-center">
            🔍 LAYOUT: {isNative ? 'NATIVE DETECTED' : 'WEB DETECTED'}
        </div>
        <div style={{ paddingTop: '25px' }}>
            <SafeAreaBackground />
            <ViewportHandler />
            <CapacitorAuthProvider>
                <SessionProvider>
                    <SubscriptionProvider>
                        <AnalyticsProvider>
                            <PlatformAwareWrapper>
                                <DirectShareHandler />
                                {children}
                            </PlatformAwareWrapper>
                        </AnalyticsProvider>
                    </SubscriptionProvider>
                </SessionProvider>
            </CapacitorAuthProvider>
        </div>
        </body>
        </html>
    );
}