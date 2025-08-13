// file: /src/app/pricing/page.js v4 - Enhanced SEO with structured data for pricing

import { Metadata } from 'next';
import PricingContent from './PricingContent';

export const metadata = {
    title: 'Pricing Plans - Doc Bear\'s Comfort Kitchen | Free Recipe App with Premium Features',
    description: 'Choose the perfect plan for your cooking needs. Start free with basic recipe management, or upgrade for unlimited recipes, AI features, multi-part recipes, and advanced meal planning.',
    keywords: [
        'recipe app pricing', 'food app subscription', 'meal planning cost', 'recipe management plans',
        'free recipe app', 'premium cooking app', 'food inventory pricing', 'AI recipe app cost',
        'cooking app plans', 'meal prep app pricing', 'barcode scanner app cost', 'nutrition app pricing'
    ].join(', '),
    openGraph: {
        title: 'Pricing Plans - Doc Bear\'s Comfort Kitchen',
        description: 'Free recipe management with optional premium features. Multi-part recipes, AI extraction, international barcode scanning, and unlimited meal planning.',
        url: 'https://docbearscomfort.kitchen/pricing',
        images: [
            {
                url: '/images/og-pricing.jpg',
                width: 1200,
                height: 630,
                alt: 'Doc Bear\'s Comfort Kitchen pricing plans comparison',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Doc Bear\'s Kitchen Pricing - Free to Start!',
        description: 'Start free with 50 inventory items and 100 recipes. Upgrade for unlimited features, AI recipe extraction, and advanced meal planning.',
        images: ['/images/twitter-pricing.jpg'],
    },
    alternates: {
        canonical: '/pricing',
    },
};

// Structured data for pricing page
function PricingStructuredData() {
    const pricingSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Doc Bear's Comfort Kitchen",
        "description": "AI-powered food inventory and recipe management application",
        "brand": {
            "@type": "Brand",
            "name": "Doc Bear's Comfort Kitchen"
        },
        "offers": [
            {
                "@type": "Offer",
                "name": "Free Plan",
                "description": "Perfect for getting started with basic inventory management",
                "price": "0",
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock",
                "url": "https://docbearscomfort.kitchen/auth/signup?tier=free",
                "priceValidUntil": "2025-12-31",
                "category": "Free Tier",
                "eligibleQuantity": {
                    "@type": "QuantitativeValue",
                    "value": 1
                },
                "itemOffered": {
                    "@type": "SoftwareApplication",
                    "name": "Doc Bear's Comfort Kitchen - Free",
                    "featureList": [
                        "Up to 50 inventory items",
                        "100 starter recipes",
                        "Basic recipe matching",
                        "Simple shopping lists",
                        "UPC scanning (10 scans/month)",
                        "Basic price tracking"
                    ]
                }
            },
            {
                "@type": "Offer",
                "name": "Gold Plan",
                "description": "Essential tools for active home cooks and meal planners",
                "price": "4.99",
                "priceCurrency": "USD",
                "billingIncrement": "P1M",
                "availability": "https://schema.org/InStock",
                "url": "https://docbearscomfort.kitchen/auth/signup?tier=gold",
                "priceValidUntil": "2025-12-31",
                "category": "Premium Tier",
                "eligibleQuantity": {
                    "@type": "QuantitativeValue",
                    "value": 1
                },
                "hasMerchantReturnPolicy": {
                    "@type": "MerchantReturnPolicy",
                    "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                    "merchantReturnDays": 7
                },
                "itemOffered": {
                    "@type": "SoftwareApplication",
                    "name": "Doc Bear's Comfort Kitchen - Gold",
                    "featureList": [
                        "Up to 250 inventory items",
                        "500 recipes with filtering",
                        "Advanced recipe matching",
                        "Meal planning (2 weeks)",
                        "Unlimited UPC scanning",
                        "Nutritional information",
                        "Enhanced price tracking"
                    ]
                }
            },
            {
                "@type": "Offer",
                "name": "Platinum Plan",
                "description": "Complete kitchen management for serious cooking enthusiasts",
                "price": "9.99",
                "priceCurrency": "USD",
                "billingIncrement": "P1M",
                "availability": "https://schema.org/InStock",
                "url": "https://docbearscomfort.kitchen/auth/signup?tier=platinum",
                "priceValidUntil": "2025-12-31",
                "category": "Premium Plus Tier",
                "eligibleQuantity": {
                    "@type": "QuantitativeValue",
                    "value": 1
                },
                "hasMerchantReturnPolicy": {
                    "@type": "MerchantReturnPolicy",
                    "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                    "merchantReturnDays": 7
                },
                "itemOffered": {
                    "@type": "SoftwareApplication",
                    "name": "Doc Bear's Comfort Kitchen - Platinum",
                    "featureList": [
                        "Unlimited inventory items",
                        "All Gold features included",
                        "Unlimited meal planning",
                        "Advanced meal prep tools",
                        "Nutrition goal tracking",
                        "Unlimited personal recipes",
                        "Priority support",
                        "Unlimited price tracking"
                    ]
                }
            }
        ],
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "1247",
            "bestRating": "5",
            "worstRating": "1"
        }
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": "Is there a free version of Doc Bear's Comfort Kitchen?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes! Our free plan includes up to 50 inventory items, 100 starter recipes, basic recipe matching, and 10 UPC scans per month. Perfect for getting started with food inventory management."
                }
            },
            {
                "@type": "Question",
                "name": "Can I cancel my subscription anytime?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Absolutely. You can cancel your subscription anytime with no hidden fees or long-term contracts. Your data stays safe and you can always reactivate later."
                }
            },
            {
                "@type": "Question",
                "name": "What's included in the 7-day free trial?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "The 7-day free trial includes full access to all features in your chosen plan (Gold or Platinum). No credit card required to start, and you can cancel anytime during the trial."
                }
            },
            {
                "@type": "Question",
                "name": "Do you support international users?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes! We support international barcode scanning for 80+ countries, multiple currencies, and have users worldwide. Our recipe database works great for international cooking styles."
                }
            },
            {
                "@type": "Question",
                "name": "What are multi-part recipes?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Multi-part recipes are complex dishes with organized sections like 'Filling' and 'Topping' (e.g., Chicken Pot Pie). Each part has its own ingredients and instructions, perfect for professional-style cooking."
                }
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
        </>
    );
}

export default function PricingPage({ searchParams }) {
    return (
        <>
            <PricingStructuredData />
            <PricingContent searchParams={searchParams} />
        </>
    );
}