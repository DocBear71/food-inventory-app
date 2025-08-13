// file: /src/app/page.js v2.0 - Enhanced SEO with meta tags and structured data

import { Metadata } from 'next';
import LandingPageContent from './LandingPageContent';

// Enhanced metadata for the landing page
export const metadata = {
    title: 'Doc Bear\'s Comfort Kitchen - AI Recipe App with Multi-Part Recipes & Barcode Scanner',
    description: 'Revolutionary food inventory management with AI recipe extraction from TikTok/Instagram, multi-part recipe creation, international barcode scanning (80+ countries), voice nutrition analysis, and smart meal planning. Free to start!',
    keywords: [
        // Primary keywords
        'recipe app', 'food inventory app', 'AI recipe extraction', 'multi-part recipes',
        // Feature-specific keywords
        'barcode scanner app', 'TikTok recipe importer', 'social media recipes', 'voice nutrition',
        'meal planning app', 'grocery list app', 'food tracker', 'recipe discovery',
        // Technical keywords
        'international barcode', 'recipe scaling', 'nutrition analysis', 'food management',
        // Single-syllable keywords
        'food', 'cook', 'eat', 'plan', 'scan', 'shop', 'meal', 'diet', 'save'
    ].join(', '),
    authors: [{ name: 'Dr. Edward McKeown', url: 'https://docbearscomfort.kitchen' }],
    creator: 'Dr. Edward McKeown',
    publisher: 'Doc Bear Enterprises, LLC',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    metadataBase: new URL('https://docbearscomfort.kitchen'),
    alternates: {
        canonical: '/',
        languages: {
            'en-US': '/en-US',
            'en-GB': '/en-GB',
            'en-CA': '/en-CA',
            'en-AU': '/en-AU',
        },
    },
    openGraph: {
        title: 'Doc Bear\'s Comfort Kitchen - AI Recipe & Food Management App',
        description: 'Smart food inventory with AI recipe extraction from social media, multi-part recipes, international barcode scanning, and voice nutrition analysis. Free app for iOS, Android & Web!',
        url: 'https://docbearscomfort.kitchen',
        siteName: 'Doc Bear\'s Comfort Kitchen',
        images: [
            {
                url: '/images/og-hero-app.jpg',
                width: 1200,
                height: 630,
                alt: 'Doc Bear\'s Comfort Kitchen app interface showing multi-part recipe creation and AI features',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Doc Bear\'s Kitchen - AI Recipe App with Multi-Part Recipes',
        description: 'Extract recipes from TikTok/Instagram with AI, create multi-part recipes, scan international barcodes, get voice nutrition analysis. Free to start!',
        creator: '@DocBearsKitchen',
        images: ['/images/twitter-hero-app.jpg'],
    },
    icons: {
        icon: [
            { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
            { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        ],
        apple: [
            { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    },
    manifest: '/manifest.json',
    other: {
        'google-site-verification': 'YOUR_GOOGLE_VERIFICATION_CODE',
        'msvalidate.01': 'YOUR_BING_VERIFICATION_CODE',
        'p:domain_verify': 'YOUR_PINTEREST_VERIFICATION_CODE',
    },
};

export default function HomePage() {
    return <LandingPageContent />;
}