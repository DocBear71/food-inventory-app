'use client';
// file: /src/components/pricing/PricingTiers.js v2 - Updated for consistency with main pricing page

import React, { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

const PricingTiers = ({
                          showHeader = true,
                          onSignup = null,
                          currentTier = null,
                          className = "",
                          compactMode = false,
                          showFAQ = true,
                          initialBillingCycle = 'annual'
                      }) => {
    const [billingCycle, setBillingCycle] = useState(initialBillingCycle);
    const [expandedFeatures, setExpandedFeatures] = useState({});

    const toggleFeatures = (tierId) => {
        setExpandedFeatures(prev => ({
            ...prev,
            [tierId]: !prev[tierId]
        }));
    };

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
                // 🆕 ADD PRICE TRACKING FEATURES FOR FREE:
                { name: 'Basic price tracking (10 items)', included: true },
                { name: 'Price history (30 days)', included: true },
                // EXISTING EXCLUDED FEATURES:
                { name: 'Full meal planning capabilities', included: false },
                { name: 'Nutritional information access', included: false },
                { name: 'Email notifications & alerts', included: false },
                { name: 'Common Items Wizard', included: false },
                { name: 'Write recipe reviews', included: false },
                { name: 'Make recipes public', included: false },
                // 🆕 ADD EXCLUDED PRICE FEATURES:
                { name: 'Extended price tracking & history', included: false },
                { name: 'Price alerts & notifications', included: false }
            ],
            cta: 'Get Started Free',
            popular: false,
            trialAvailable: false,
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            textColor: 'text-gray-900',
            buttonStyle: 'bg-gray-600 hover:bg-gray-700 text-white'
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
                // 🆕 ADD PRICE TRACKING FEATURES FOR GOLD:
                { name: 'Enhanced price tracking (50 items)', included: true },
                { name: 'Extended price history (6 months)', included: true },
                { name: 'Price comparison across stores', included: true },
                // EXCLUDED FEATURES:
                { name: 'Advanced meal prep planning tools', included: false },
                { name: 'Nutrition goal setting & tracking', included: false },
                { name: 'Priority support & early access', included: false },
                // 🆕 ADD EXCLUDED PREMIUM PRICE FEATURES:
                { name: 'Unlimited price tracking & alerts', included: false },
                { name: 'Price drop email notifications', included: false }
            ],
            cta: 'Start 7-Day Free Trial',
            popular: true,
            trialAvailable: true,
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
                // 🆕 ADD PREMIUM PRICE TRACKING FEATURES:
                { name: 'Unlimited price tracking for all items', included: true },
                { name: 'Unlimited price history & analytics', included: true },
                { name: 'Smart price alerts & email notifications', included: true },
                { name: 'Price trend analysis & insights', included: true },
                { name: 'Export price data & shopping analytics', included: true }
            ],
            cta: 'Start 7-Day Free Trial',
            popular: false,
            trialAvailable: true,
            bgColor: 'bg-gradient-to-br from-purple-50 to-violet-50',
            borderColor: 'border-purple-300',
            textColor: 'text-purple-900',
            buttonStyle: 'bg-purple-600 hover:bg-purple-700 text-white'
        }
    ];

    const handleSignup = (tierId, isTrialSignup = false) => {
        if (onSignup) {
            onSignup(tierId, isTrialSignup, billingCycle);
        } else {
            // Default behavior - construct signup URL with parameters
            const params = new URLSearchParams({
                tier: tierId,
                billing: billingCycle
            });

            if (isTrialSignup) {
                params.append('trial', 'true');
            }

            window.location.href = `/auth/signup?${params.toString()}`;
        }
    };

    const getSavingsPercentage = (tier) => {
        if (tier.price.monthly === 0) return null;
        const monthlyCost = tier.price.monthly * 12;
        const savings = ((monthlyCost - tier.price.annual) / monthlyCost) * 100;
        return Math.round(savings);
    };

    if (compactMode) {
        return (
            <div className={`max-w-4xl mx-auto ${className}`}>
                {showHeader && (
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
                        <p className="text-gray-600">Upgrade anytime to unlock more features</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tiers.map((tier) => {
                        const isCurrentTier = currentTier === tier.id;
                        return (
                            <div
                                key={tier.id}
                                className={`relative rounded-lg border-2 p-6 ${tier.bgColor} ${tier.borderColor} ${
                                    tier.popular ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                                } ${isCurrentTier ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
                            >
                                {tier.badge && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                            {tier.badge}
                                        </span>
                                    </div>
                                )}

                                {isCurrentTier && (
                                    <div className="absolute -top-3 right-4">
                                        <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                                            Current
                                        </span>
                                    </div>
                                )}

                                <div className="text-center mb-4">
                                    <h3 className={`text-xl font-bold ${tier.textColor}`}>{tier.name}</h3>
                                    <div className="mt-2">
                                        {tier.price.monthly === 0 ? (
                                            <span className="text-3xl font-bold text-gray-900">Free</span>
                                        ) : (
                                            <div>
                                                <span className="text-3xl font-bold text-gray-900">
                                                    ${billingCycle === 'annual' ? tier.price.annual : tier.price.monthly}
                                                </span>
                                                <span className="text-gray-600 ml-1">
                                                    /{billingCycle === 'annual' ? 'year' : 'month'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <TouchEnhancedButton
                                    onClick={() => handleSignup(tier.id, tier.trialAvailable)}
                                    disabled={isCurrentTier && tier.id === 'free'}
                                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                                        isCurrentTier && tier.id === 'free'
                                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                            : tier.buttonStyle
                                    }`}
                                >
                                    {isCurrentTier && tier.id === 'free' ? 'Current Plan' : tier.cta}
                                </TouchEnhancedButton>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className={`max-w-7xl mx-auto ${className}`}>
            {showHeader && (
                <div className="text-center mb-12">
                    <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">
                        Choose Your Perfect Plan
                    </h1>
                    <p className="text-lg lg:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        Start with our free tier and upgrade anytime to unlock powerful features for serious home cooking and meal planning.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center mb-8">
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
            )}

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {tiers.map((tier) => {
                    const savings = getSavingsPercentage(tier);
                    const isCurrentTier = currentTier === tier.id;

                    return (
                        <div
                            key={tier.id}
                            className={`relative rounded-xl border-2 ${tier.bgColor} ${tier.borderColor} ${
                                tier.popular ? 'ring-4 ring-blue-500 ring-opacity-20 shadow-xl lg:scale-105' : 'shadow-lg'
                            } ${isCurrentTier ? 'ring-4 ring-green-500 ring-opacity-30' : ''} transition-all duration-300 hover:shadow-xl`}
                        >
                            {tier.badge && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                    <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
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

                            <div className="p-6 lg:p-8">
                                {/* Header */}
                                <div className="text-center mb-8">
                                    <h3 className={`text-2xl font-bold ${tier.textColor} mb-2`}>
                                        {tier.name}
                                    </h3>
                                    <p className="text-gray-600 text-sm mb-6">
                                        {tier.description}
                                    </p>

                                    {/* Pricing */}
                                    <div className="mb-6">
                                        {tier.price.monthly === 0 ? (
                                            <div>
                                                <span className="text-4xl lg:text-5xl font-bold text-gray-900">Free</span>
                                                <div className="text-sm text-gray-500 mt-1">Forever</div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center justify-center">
                                                    <span className="text-4xl lg:text-5xl font-bold text-gray-900">
                                                        ${billingCycle === 'annual' ? tier.price.annual : tier.price.monthly}
                                                    </span>
                                                    <span className="text-gray-600 ml-2">
                                                        /{billingCycle === 'annual' ? 'year' : 'month'}
                                                    </span>
                                                </div>
                                                {billingCycle === 'annual' && savings && (
                                                    <div className="text-sm text-green-600 font-semibold mt-2">
                                                        Save {savings}% vs monthly
                                                    </div>
                                                )}
                                                {billingCycle === 'monthly' && (
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        ${tier.price.annual}/year if billed annually
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* CTA Button */}
                                    <TouchEnhancedButton
                                        onClick={() => handleSignup(tier.id, tier.trialAvailable)}
                                        disabled={isCurrentTier && tier.id === 'free'}
                                        className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all transform hover:scale-105 ${
                                            isCurrentTier && tier.id === 'free'
                                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                                : tier.buttonStyle
                                        } ${tier.popular ? 'shadow-lg' : ''}`}
                                    >
                                        {isCurrentTier && tier.id === 'free' ? 'Current Plan' : tier.cta}
                                    </TouchEnhancedButton>

                                    {tier.trialAvailable && !isCurrentTier && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            No credit card required • Cancel anytime
                                        </p>
                                    )}
                                </div>

                                {/* Features List */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">
                                        What's Included:
                                    </h4>
                                    <ul className="space-y-2">
                                        {(expandedFeatures[tier.id] ? tier.features : tier.features.slice(0, 6)).map((feature, index) => (
                                            <li key={index} className="flex items-start space-x-3">
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
                                                <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
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

            {/* FAQ/Additional Info */}
            {showFAQ && (
                <div className="bg-gray-50 rounded-xl p-6 lg:p-8 text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                        Questions about our plans?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
                        <div>
                            <div className="font-semibold text-gray-900 mb-2">✅ No Commitment</div>
                            <p>Cancel anytime with no hidden fees or long-term contracts.</p>
                        </div>
                        <div>
                            <div className="font-semibold text-gray-900 mb-2">🔄 Easy Upgrades</div>
                            <p>Start free and upgrade when you're ready. Downgrade anytime.</p>
                        </div>
                        <div>
                            <div className="font-semibold text-gray-900 mb-2">📱 All Devices</div>
                            <p>Access your account on mobile, tablet, and desktop with sync.</p>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-gray-600">
                            Need help choosing? <TouchEnhancedButton className="text-blue-600 hover:text-blue-700 font-medium">Contact our support team</TouchEnhancedButton>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PricingTiers;