'use client';

// file: /src/app/layout.js v13 - Enhanced SEO with comprehensive meta tags and structured data

import {Inter} from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import CapacitorAuthProvider from '@/components/providers/CapacitorAuthProvider';
import {SubscriptionProvider} from '@/hooks/useSubscription';
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider';
import ViewportHandler from '@/components/ViewportHandler';
import PlatformAwareWrapper from '@/components/PlatformAwareWrapper';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
            "url": "https://docbearscomfort.kitchen",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "5249 N Park Pl NE, PMB 4011",
                "addressLocality": "Cedar Rapids",
                "addressRegion": "IA",
                "postalCode": "52402",
                "addressCountry": "US"
            },
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+1-319-826-3463",
                "email": "privacy@docbearscomfort.kitchen",
                "contactType": "customer service"
            }
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
        ],
        "screenshot": "https://docbearscomfort.kitchen/images/hero-app-screenshot.jpg",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "1247",
            "bestRating": "5",
            "worstRating": "1"
        },
        "downloadUrl": [
            "https://play.google.com/store/apps/details?id=kitchen.docbearscomfort",
            "https://apps.apple.com/app/doc-bears-comfort-kitchen/id-coming-soon"
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
    return (
        <html lang="en">
        <head>
            {/* Primary Meta Tags */}
            <title>Doc Bear's Comfort Kitchen - AI-Powered Recipe & Food Inventory Management</title>
            <meta name="title" content="Doc Bear's Comfort Kitchen - AI-Powered Recipe & Food Inventory Management" />
            <meta name="description" content="Smart food inventory management with AI-powered recipe discovery, multi-part recipes, international barcode scanning, and social media recipe extraction. Free app for iOS, Android & Web." />
            <meta name="keywords" content="recipe app, food inventory, meal planning, barcode scanner, AI recipes, multi-part recipes, social media recipe extraction, TikTok recipes, food management, cooking app, grocery list, nutrition tracker, recipe discovery, voice nutrition, international barcode, recipe scaling" />

            {/* Geo-targeting */}
            <meta name="geo.region" content="US" />
            <meta name="geo.placename" content="Cedar Rapids, Iowa" />
            <meta name="geo.position" content="42.0080;-91.6780" />
            <meta name="ICBM" content="42.0080, -91.6780" />

            {/* Language and Region */}
            <link rel="alternate" hrefLang="en-us" href="https://docbearscomfort.kitchen/" />
            <link rel="alternate" hrefLang="en-gb" href="https://docbearscomfort.kitchen/" />
            <link rel="alternate" hrefLang="en-ca" href="https://docbearscomfort.kitchen/" />
            <link rel="alternate" hrefLang="en-au" href="https://docbearscomfort.kitchen/" />
            <link rel="alternate" hrefLang="x-default" href="https://docbearscomfort.kitchen/" />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content="https://docbearscomfort.kitchen/" />
            <meta property="og:title" content="Doc Bear's Comfort Kitchen - AI Recipe & Food Management App" />
            <meta property="og:description" content="Revolutionary food inventory app with AI recipe extraction from TikTok/Instagram, multi-part recipes, international barcode scanning, and smart meal planning. Free to start!" />
            <meta property="og:image" content="https://docbearscomfort.kitchen/images/og-image.jpg" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content="Doc Bear's Comfort Kitchen app interface showing recipe discovery and inventory management" />
            <meta property="og:site_name" content="Doc Bear's Comfort Kitchen" />
            <meta property="og:locale" content="en_US" />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content="https://docbearscomfort.kitchen/" />
            <meta property="twitter:title" content="Doc Bear's Comfort Kitchen - AI Recipe & Food Management" />
            <meta property="twitter:description" content="Smart food inventory with AI recipe extraction from social media, multi-part recipes, international barcode scanning. Free app for all devices!" />
            <meta property="twitter:image" content="https://docbearscomfort.kitchen/images/twitter-card.jpg" />
            <meta property="twitter:image:alt" content="Doc Bear's Comfort Kitchen app showcasing recipe management features" />
            <meta name="twitter:creator" content="@DocBearsKitchen" />

            {/* App Store / Mobile App */}
            <meta name="apple-itunes-app" content="app-id=coming-soon, app-argument=https://docbearscomfort.kitchen/" />
            <meta name="google-play-app" content="app-id=kitchen.docbearscomfort" />

            {/* Mobile Web App */}
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content="Doc Bear's Kitchen" />

            {/* Canonical URL */}
            <link rel="canonical" href="https://docbearscomfort.kitchen/" />

            {/* Additional SEO Tags */}
            <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
            <meta name="googlebot" content="index, follow" />
            <meta name="bingbot" content="index, follow" />

            {/* Author and Publisher */}
            <meta name="author" content="Dr. Edward McKeown" />
            <meta name="publisher" content="Doc Bear Enterprises, LLC" />
            <meta name="copyright" content="© 2025 Doc Bear Enterprises, LLC" />

            {/* Theme and Branding */}
            <meta name="theme-color" content="#7c3aed" />
            <meta name="msapplication-TileColor" content="#7c3aed" />
            <meta name="msapplication-TileImage" content="/icons/mstile-144x144.png" />

            {/* Icons and Favicons */}
            <link rel="icon" type="image/x-icon" href="/favicon.ico" />
            <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
            <link rel="manifest" href="/manifest.json" />

            {/* Structured Data */}
            <StructuredData />

            {/* Preconnect to Important Domains */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="preconnect" href="https://www.google-analytics.com" />

            {/* Performance Hints */}
            <link rel="dns-prefetch" href="//fonts.googleapis.com" />
            <link rel="dns-prefetch" href="//fonts.gstatic.com" />
            <link rel="dns-prefetch" href="//www.google-analytics.com" />
        </head>
        <body className={inter.className}>
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
        </body>
        </html>
    );
}