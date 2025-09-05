'use client';
// file: /src/app/pricing/page.js v4 - Added basic weekly test subscription

import { useState, useEffect, Suspense } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useRouter, useSearchParams } from 'next/navigation';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import { useSubscription } from '@/hooks/useSubscription';
import Footer from '@/components/legal/Footer';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

// Separate component for search params to wrap in Suspense
function PricingContent() {
    const { data: session, status } = useSafeSession();
    const subscription = useSubscription();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [billingCycle, setBillingCycle] = useState('annual');
    const [expandedFeatures, setExpandedFeatures] = useState({});

    // Check if user came from a specific source
    const source = searchParams.get('source');
    const currentTier = searchParams.get('current');

    useEffect(() => {
        // Set billing cycle from URL params if provided
        const billing = searchParams.get('billing');
        if (billing === 'monthly' || billing === 'annual') {
            setBillingCycle(billing);
        }
    }, [searchParams]);

    const toggleFeatures = (tierId) => {
        setExpandedFeatures(prev => ({
            ...prev,
            [tierId]: !prev[tierId]
        }));
    };

    // UPDATED: Added basic weekly test tier
    const tiers = [
        {
            id: 'free',
            name: 'Free',
            price: { monthly: 0, annual: 0 },
            description: 'Perfect for getting started with basic inventory management',
            badge: null,
            features: [
                { name: 'Up to 50 inventory items', included: true },
                { name: '100 starter recipes from cookbook series', included: true },
                { name: 'Basic "What Can I Make?" matching', included: true },
                { name: 'Simple shopping lists from individual recipes', included: true },
                { name: 'Basic profile settings', included: true },
                { name: 'UPC scanning (10 scans/month)', included: true },
                { name: 'Add up to 5 personal recipes (all input methods)', included: true },
                { name: 'Receipt scanning (2 receipts/month)', included: true },
                { name: 'Create 2 collections with a total of 10 saved recipes', included: true },
                { name: 'Read recipe reviews', included: true },
                { name: 'Mobile & desktop access', included: true },
                { name: 'Basic price tracking (10 items)', included: true },
                { name: 'Price history (30 days)', included: true },
                { name: 'Full meal planning capabilities', included: false },
                { name: 'Nutritional information access', included: false },
                { name: 'Email notifications & alerts', included: false },
                { name: 'Common Items Wizard', included: false },
                { name: 'Write recipe reviews', included: false },
                { name: 'Make recipes public', included: false },
                { name: 'Extended price tracking & history', included: false },
                { name: 'Price alerts & notifications', included: false }
            ],
            cta: session ? 'Current Plan' : 'Get Started Free',
            popular: false,
            trialAvailable: false,
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            textColor: 'text-gray-900',
            buttonStyle: 'bg-gray-600 hover:bg-gray-700 text-white'
        },
        {
            id: 'basic',
            name: 'Basic Weekly Access',
            price: { weekly: 0.99 },
            description: 'Essential kitchen management tools - weekly subscription',
            badge: 'Test Plan',
            features: [
                { name: 'Essential tools access', included: true },
                { name: 'Weekly billing cycle', included: true },
                { name: 'All Free plan features', included: true },
                { name: 'Enhanced inventory tracking', included: true },
                { name: 'Basic meal planning (1 week)', included: true },
                { name: 'Email notifications', included: true },
                { name: 'UPC scanning (unlimited)', included: true },
                { name: 'Receipt scanning (5 receipts/week)', included: true },
                { name: 'Create 5 collections with 50 saved recipes', included: true },
                { name: 'Write recipe reviews', included: true },
                { name: 'Standard support', included: true },
                { name: 'Advanced meal prep planning', included: false },
                { name: 'Unlimited features', included: false },
                { name: 'Priority support', included: false }
            ],
            cta: 'Try Basic Weekly',
            popular: false,
            trialAvailable: false,
            bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
            borderColor: 'border-green-300',
            textColor: 'text-green-900',
            buttonStyle: 'bg-green-600 hover:bg-green-700 text-white'
        },
        {
            id: 'gold',
            name: 'Gold',
            price: { monthly: 4.99, annual: 49.99 },
            description: 'Essential tools for active home cooks and meal planners',
            badge: 'Most Popular',
            features: [
                { name: 'Up to 250 inventory items with full tracking', included: true },
                { name: 'Access to 500 recipes with filtering & categories', included: true },
                { name: 'Advanced "What Can I Make?" with percentage matching', included: true },
                { name: 'All shopping list generation methods', included: true },
                { name: 'Meal planning up to 2 weeks ahead', included: true },
                { name: 'Email integration for shopping lists', included: true },
                { name: 'Nutritional information for all recipes & ingredients', included: true },
                { name: 'Unlimited UPC scanning & Common Items Wizard', included: true },
                { name: 'Up to 100 personal recipes (all input methods)', included: true },
                { name: 'Receipt scanning (20 receipts/month)', included: true },
                { name: 'Create 10 collections with a total of 200 saved recipes', included: true },
                { name: 'Write & edit recipe reviews with photos', included: true },
                { name: 'Make up to 25 personal recipes public', included: true },
                { name: 'Email notifications & expiration alerts', included: true },
                { name: 'Recipe organization with custom categories', included: true },
                { name: 'Enhanced price tracking (50 items)', included: true },
                { name: 'Extended price history (6 months)', included: true },
                { name: 'Price comparison across stores', included: true },
                { name: 'Advanced meal prep planning tools', included: false },
                { name: 'Nutrition goal setting & tracking', included: false },
                { name: 'Priority support & early access', included: false },
                { name: 'Unlimited price tracking & alerts', included: false },
                { name: 'Price drop email notifications', included: false }
            ],
            cta: (session && subscription.hasUsedFreeTrial)
                ? (billingCycle === 'annual' ? 'Subscribe Gold Annual' : 'Subscribe Gold Monthly')
                : (billingCycle === 'annual' ? 'Start 7-Day Free Trial' : 'Start 7-Day Free Trial'),
            popular: true,
            trialAvailable: session ? !subscription.hasUsedFreeTrial : true,
            bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
            borderColor: 'border-blue-300',
            textColor: 'text-blue-900',
            buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white'
        },
        {
            id: 'platinum',
            name: 'Platinum',
            price: { monthly: 9.99, annual: 99.99 },
            description: 'Complete kitchen management for serious cooking enthusiasts',
            badge: 'Premium',
            features: [
                { name: 'Unlimited inventory items with advanced analytics', included: true },
                { name: 'All Gold features included', included: true },
                { name: 'Unlimited meal planning (multiple weeks/months)', included: true },
                { name: 'Advanced meal prep planning & organization tools', included: true },
                { name: 'Nutrition goal setting & progress tracking', included: true },
                { name: 'Advanced profile settings & dietary restrictions', included: true },
                { name: 'Unlimited personal recipes with all features', included: true },
                { name: 'Unlimited receipt scanning', included: true },
                { name: 'Unlimited collections with Unlimited saved recipes & sharing', included: true },
                { name: 'Create & share public recipe collections', included: true },
                { name: 'Recipe collaboration with other users', included: true },
                { name: 'Creator analytics for public recipes', included: true },
                { name: 'Priority recipe review & featuring', included: true },
                { name: 'Advanced search & filtering capabilities', included: true },
                { name: 'Priority support & fastest response times', included: true },
                { name: 'Early access to all new features & recipes', included: true },
                { name: 'Recipe backup & export functionality', included: true },
                { name: 'Unlimited price tracking for all items', included: true },
                { name: 'Unlimited price history & analytics', included: true },
                { name: 'Smart price alerts & email notifications', included: true },
                { name: 'Price trend analysis & insights', included: true },
                { name: 'Export price data & shopping analytics', included: true }
            ],
            cta: (session && subscription.hasUsedFreeTrial)
                ? (billingCycle === 'annual' ? 'Subscribe Platinum Annual' : 'Subscribe Platinum Monthly')
                : (billingCycle === 'annual' ? 'Start 7-Day Free Trial' : 'Start 7-Day Free Trial'),
            popular: false,
            trialAvailable: session ? !subscription.hasUsedFreeTrial : true,
            bgColor: 'bg-gradient-to-br from-purple-50 to-violet-50',
            borderColor: 'border-purple-300',
            textColor: 'text-purple-900',
            buttonStyle: 'bg-purple-600 hover:bg-purple-700 text-white'
        }
    ];

    const handleSignup = (tierId, isTrialSignup = false) => {
        if (session) {
            // If user is logged in, go to billing page
            if (isTrialSignup || tierId !== 'free') {
                const params = new URLSearchParams({
                    tier: tierId,
                    billing: tierId === 'basic' ? 'weekly' : billingCycle
                });

                // Only add trial param if user hasn't used free trial
                if (isTrialSignup && !subscription.hasUsedFreeTrial) {
                    params.append('trial', 'true');
                }

                if (source) {
                    params.append('source', source);
                }

                router.push(`/account/billing?${params.toString()}`);
            } else {
                // For free tier, go to dashboard
                router.push('/dashboard');
            }
        } else {
            // If not logged in, always go to signup (which creates free accounts)
            router.push('/auth/signup');
        }
    };

    const getSavingsPercentage = (tier) => {
        if (tier.price.monthly === 0) return null;
        const monthlyCost = tier.price.monthly * 12;
        const savings = ((monthlyCost - tier.price.annual) / monthlyCost) * 100;
        return Math.round(savings);
    };

    const getUpgradeMessage = () => {
        if (source === 'limit-reached') {
            return {
                title: "You've reached your plan limits!",
                subtitle: "Upgrade to continue enjoying all the features of Doc Bear's Comfort Kitchen",
                bgColor: "bg-yellow-50",
                borderColor: "border-yellow-200"
            };
        }
        if (source === 'dashboard') {
            return {
                title: "Unlock More Features",
                subtitle: "Take your cooking and meal planning to the next level",
                bgColor: "bg-blue-50",
                borderColor: "border-blue-200"
            };
        }
        return null;
    };

    const upgradeMessage = getUpgradeMessage();

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6">
                {/* Upgrade Message */}
                {upgradeMessage && (
                    <div className={`rounded-lg p-6 border-2 ${upgradeMessage.bgColor} ${upgradeMessage.borderColor}`}>
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                                {upgradeMessage.title}
                            </h2>
                            <p className="text-gray-700">
                                {upgradeMessage.subtitle}
                            </p>
                        </div>
                    </div>
                )}

                {/* Page Header */}
                <div className="text-center">
                    <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">
                        Choose Your Perfect Plan
                    </h1>
                    <p className="text-lg lg:text-xl text-gray-600 mb-8">
                        Start with our free tier and upgrade anytime to unlock powerful features for serious home cooking and meal planning.
                    </p>

                    {/* Billing Toggle - Enhanced Design */}
                    <div className="flex items-center justify-center mb-12">
                        <div className="bg-blue-50 p-1.5 rounded-xl border border-blue-200">
                            <TouchEnhancedButton
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                                    billingCycle === 'monthly'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-blue-600 hover:text-blue-700 hover:bg-blue-100'
                                }`}
                            >
                                Monthly
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => setBillingCycle('annual')}
                                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all relative ${
                                    billingCycle === 'annual'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-blue-600 hover:text-blue-700 hover:bg-blue-100'
                                }`}
                            >
                                Annual
                                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                    Save 17%
                                </span>
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-5">
                    {tiers.map((tier) => {
                        const savings = getSavingsPercentage(tier);
                        const isCurrentTier = currentTier === tier.id;

                        return (
                            <div
                                key={tier.id}
                                className={`relative rounded-xl border-2 ${tier.bgColor} ${tier.borderColor} ${
                                    tier.popular ? 'ring-4 ring-blue-500 ring-opacity-20 shadow-xl scale-105' : 'shadow-md'
                                } ${isCurrentTier ? 'ring-4 ring-green-500 ring-opacity-30' : ''} transition-all duration-300 hover:shadow-lg`}
                            >
                                {tier.badge && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap ${
                                            tier.id === 'basic' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                                        }`}>
                                            {tier.badge}
                                        </span>
                                    </div>
                                )}

                                {isCurrentTier && (
                                    <div className="absolute -top-4 right-4">
                                        <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                                            Current Plan
                                        </span>
                                    </div>
                                )}

                                <div className="p-6">
                                    {/* Header */}
                                    <div className="text-center mb-6">
                                        <h3 className={`text-xl font-bold ${tier.textColor} mb-2`}>
                                            {tier.name}
                                        </h3>
                                        <p className="text-gray-600 text-sm mb-4">
                                            {tier.description}
                                        </p>

                                        {/* Pricing */}
                                        <div className="mb-4">
                                            {tier.price.monthly === 0 && tier.id === 'free' ? (
                                                <div>
                                                    <span className="text-3xl font-bold text-gray-900">Free</span>
                                                    <div className="text-xs text-gray-500 mt-1">Forever</div>
                                                </div>
                                            ) : tier.id === 'basic' ? (
                                                <div>
                                                    <div className="flex items-center justify-center">
                                                        <span className="text-3xl font-bold text-gray-900">
                                                            ${tier.price.weekly}
                                                        </span>
                                                        <span className="text-gray-600 ml-1 text-sm">
                                                            /week
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-green-600 font-semibold mt-1">
                                                        Test subscription
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex items-center justify-center">
                                                        <span className="text-3xl font-bold text-gray-900">
                                                            ${billingCycle === 'annual' ? tier.price.annual : tier.price.monthly}
                                                        </span>
                                                        <span className="text-gray-600 ml-1 text-sm">
                                                            /{billingCycle === 'annual' ? 'year' : 'month'}
                                                        </span>
                                                    </div>
                                                    {billingCycle === 'annual' && savings && (
                                                        <div className="text-xs text-green-600 font-semibold mt-1">
                                                            Save {savings}% vs monthly
                                                        </div>
                                                    )}
                                                    {billingCycle === 'monthly' && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            ${tier.price.annual}/year annually
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* CTA Button */}
                                        <TouchEnhancedButton
                                            onClick={() => handleSignup(tier.id, tier.trialAvailable)}
                                            disabled={isCurrentTier && tier.id === 'free'}
                                            className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                                                isCurrentTier && tier.id === 'free'
                                                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                                    : tier.buttonStyle
                                            } ${tier.popular ? 'shadow-md' : ''}`}
                                        >
                                            {isCurrentTier && tier.id === 'free' ? 'Current Plan' : tier.cta}
                                        </TouchEnhancedButton>

                                        {tier.trialAvailable && !isCurrentTier && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                {session && subscription.hasUsedFreeTrial
                                                    ? 'Subscription starts immediately'
                                                    : 'No credit card required'
                                                }
                                            </p>
                                        )}

                                        {tier.id === 'basic' && !isCurrentTier && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                Perfect for testing our premium features
                                            </p>
                                        )}
                                    </div>

                                    {/* Features List */}
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider">
                                            What's Included:
                                        </h4>
                                        <ul className="space-y-2">
                                            {(expandedFeatures[tier.id] ? tier.features : tier.features.slice(0, 6)).map((feature, index) => (
                                                <li key={index} className="flex items-start space-x-2">
                                                    <div className="flex-shrink-0 mt-0.5">
                                                        {feature.included ? (
                                                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span className={`text-xs ${feature.included ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                                                        {feature.name}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        {tier.features.length > 6 && (
                                            <div className="pt-2">
                                                <TouchEnhancedButton
                                                    onClick={() => toggleFeatures(tier.id)}
                                                    className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium py-2 rounded-lg hover:bg-blue-50 transition-colors"
                                                >
                                                    {expandedFeatures[tier.id]
                                                        ? 'Show Less Features'
                                                        : `+ Show ${tier.features.length - 6} More Features`
                                                    }
                                                </TouchEnhancedButton>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Special Notice for Basic Weekly Plan */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="text-center">
                        <h3 className="text-green-900 font-semibold text-lg mb-2">New: Basic Weekly Access</h3>
                        <p className="text-green-700 mb-4">
                            Try our essential features with a low-commitment weekly subscription. Perfect for testing premium functionality before committing to a longer plan.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-green-600">
                            <div className="text-center">
                                <div className="font-semibold mb-1">Flexible Billing</div>
                                <p>Pay weekly, cancel anytime</p>
                            </div>
                            <div className="text-center">
                                <div className="font-semibold mb-1">Essential Features</div>
                                <p>Core functionality included</p>
                            </div>
                            <div className="text-center">
                                <div className="font-semibold mb-1">Easy Upgrade</div>
                                <p>Switch to Gold or Platinum anytime</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ/Additional Info */}
                <div className="bg-white rounded-xl p-6 lg:p-8 shadow-lg">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                        Frequently Asked Questions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm text-gray-600 mb-6">
                        <div className="text-center">
                            <div className="font-semibold text-gray-900 mb-2">No Commitment</div>
                            <p>Cancel anytime with no hidden fees or long-term contracts. Your data stays safe.</p>
                        </div>
                        <div className="text-center">
                            <div className="font-semibold text-gray-900 mb-2">Easy Upgrades</div>
                            <p>Start free and upgrade when you're ready. Downgrade or change plans anytime.</p>
                        </div>
                        <div className="text-center">
                            <div className="font-semibold text-gray-900 mb-2">All Devices</div>
                            <p>Access your account on mobile, tablet, and desktop with automatic sync.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600 mb-6">
                        <div className="text-center">
                            <div className="font-semibold text-gray-900 mb-2">Trial Period</div>
                            <p>7-day free trials include full access to all tier features. No credit card required to start.</p>
                        </div>
                        <div className="text-center">
                            <div className="font-semibold text-gray-900 mb-2">Secure Payments</div>
                            <p>All payments processed securely. We never store your payment information.</p>
                        </div>
                    </div>

                    <div className="text-center pt-6 border-t border-gray-200">
                        <p className="text-gray-600">
                            Need help choosing? <TouchEnhancedButton className="text-blue-600 hover:text-blue-700 font-medium">Contact our support team</TouchEnhancedButton> or{' '}
                            <TouchEnhancedButton
                                onClick={() => NativeNavigation.routerPush(router, '/auth/signup')}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                start with our free plan
                            </TouchEnhancedButton>.
                        </p>
                    </div>
                </div>

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}

// Main component wrapped with Suspense
export default function PricingPage() {
    return (
        <Suspense fallback={
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        }>
            <PricingContent />
        </Suspense>
    );
}