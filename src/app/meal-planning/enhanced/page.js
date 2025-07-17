'use client';
// file: /src/app/meal-planning/enhanced/page.js v1 - Enhanced meal planning with full price intelligence integration

import { useSafeSession } from '@/hooks/useSafeSession';
import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import FeatureGate, { SubscriptionIndicator } from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import PriceAwareMealPlanningCalendar from '@/components/meal-planning/PriceAwareMealPlanningCalendar';
import { apiGet } from '@/lib/api-config';

export default function EnhancedMealPlanningPage() {
    const { data: session, status } = useSafeSession();
    const subscription = useSubscription();
    const mealPlanningGate = useFeatureGate(FEATURE_GATES.CREATE_MEAL_PLAN);

    const [priceIntelligenceEnabled, setPriceIntelligenceEnabled] = useState(false);
    const [userPreferences, setUserPreferences] = useState({
        budgetOptimization: true,
        dealAlerts: true,
        inventoryFirst: true,
        priceTracking: true
    });
    const [onboardingComplete, setOnboardingComplete] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session?.user?.id) {
            checkPriceIntelligenceStatus();
            loadUserPreferences();
        }
    }, [session?.user?.id]);

    const checkPriceIntelligenceStatus = async () => {
        try {
            const response = await apiGet('/api/price-tracking/status');
            const data = await response.json();
            if (data.success) {
                setPriceIntelligenceEnabled(data.enabled);
                setOnboardingComplete(data.onboardingComplete);

                // Show welcome for first-time users
                if (!data.onboardingComplete && data.enabled) {
                    setShowWelcome(true);
                }
            }
        } catch (error) {
            console.error('Error checking price intelligence status:', error);
        }
    };

    const loadUserPreferences = async () => {
        try {
            const response = await apiGet('/api/user/meal-planning-preferences');
            const data = await response.json();
            if (data.success && data.preferences) {
                setUserPreferences(data.preferences);
            }
        } catch (error) {
            console.error('Error loading user preferences:', error);
        }
    };

    const handleEnablePriceIntelligence = async () => {
        try {
            const response = await apiPost('/api/price-tracking/enable', {
                preferences: userPreferences
            });
            const data = await response.json();
            if (data.success) {
                setPriceIntelligenceEnabled(true);
                setShowWelcome(true);
            }
        } catch (error) {
            console.error('Error enabling price intelligence:', error);
        }
    };

    const completeOnboarding = async () => {
        try {
            await apiPost('/api/price-tracking/complete-onboarding', {
                preferences: userPreferences
            });
            setOnboardingComplete(true);
            setShowWelcome(false);
        } catch (error) {
            console.error('Error completing onboarding:', error);
        }
    };

    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                        <div className="grid grid-cols-7 gap-4">
                            {[...Array(7)].map((_, i) => (
                                <div key={i} className="space-y-3">
                                    <div className="h-6 bg-gray-200 rounded"></div>
                                    {[...Array(4)].map((_, j) => (
                                        <div key={j} className="h-24 bg-gray-200 rounded"></div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    <Footer />
                </div>
            </MobileOptimizedLayout>
        );
    }

    // Welcome/Onboarding Modal
    if (showWelcome && priceIntelligenceEnabled) {
        return (
            <MobileOptimizedLayout>
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Header */}
                            <div className="text-center mb-6">
                                <div className="text-6xl mb-4">🚀✨</div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    Welcome to Smart Meal Planning!
                                </h2>
                                <p className="text-gray-600">
                                    Your meal planning just got a major upgrade with price intelligence
                                </p>
                            </div>

                            {/* Features Overview */}
                            <div className="space-y-4 mb-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center mb-2">
                                        <span className="text-2xl mr-3">💰</span>
                                        <h3 className="font-semibold text-blue-900">Budget-Aware Planning</h3>
                                    </div>
                                    <p className="text-blue-800 text-sm">
                                        Set weekly budgets and get real-time cost tracking as you plan meals
                                    </p>
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center mb-2">
                                        <span className="text-2xl mr-3">🎯</span>
                                        <h3 className="font-semibold text-green-900">Deal Detection</h3>
                                    </div>
                                    <p className="text-green-800 text-sm">
                                        Get notified about deals on ingredients and receive money-saving meal suggestions
                                    </p>
                                </div>

                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <div className="flex items-center mb-2">
                                        <span className="text-2xl mr-3">📦</span>
                                        <h3 className="font-semibold text-purple-900">Inventory-First Planning</h3>
                                    </div>
                                    <p className="text-purple-800 text-sm">
                                        Prioritize meals using ingredients you already have to minimize waste and cost
                                    </p>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex items-center mb-2">
                                        <span className="text-2xl mr-3">🛒</span>
                                        <h3 className="font-semibold text-yellow-900">Smart Shopping Lists</h3>
                                    </div>
                                    <p className="text-yellow-800 text-sm">
                                        Generate optimized shopping lists with store recommendations and price comparisons
                                    </p>
                                </div>
                            </div>

                            {/* Preferences */}
                            <div className="mb-6">
                                <h3 className="font-semibold text-gray-900 mb-3">⚙️ Your Preferences</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={userPreferences.budgetOptimization}
                                            onChange={(e) => setUserPreferences(prev => ({
                                                ...prev,
                                                budgetOptimization: e.target.checked
                                            }))}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">Budget Optimization</div>
                                            <div className="text-sm text-gray-600">Always suggest budget-friendly alternatives</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={userPreferences.dealAlerts}
                                            onChange={(e) => setUserPreferences(prev => ({
                                                ...prev,
                                                dealAlerts: e.target.checked
                                            }))}
                                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">Deal Alerts</div>
                                            <div className="text-sm text-gray-600">Notify me about sales on ingredients I use</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={userPreferences.inventoryFirst}
                                            onChange={(e) => setUserPreferences(prev => ({
                                                ...prev,
                                                inventoryFirst: e.target.checked
                                            }))}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">Inventory-First Planning</div>
                                            <div className="text-sm text-gray-600">Prioritize meals using items I already have</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={userPreferences.priceTracking}
                                            onChange={(e) => setUserPreferences(prev => ({
                                                ...prev,
                                                priceTracking: e.target.checked
                                            }))}
                                            className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">Price Tracking</div>
                                            <div className="text-sm text-gray-600">Track price history and trends for better decisions</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-3">
                                <TouchEnhancedButton
                                    onClick={() => setShowWelcome(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                >
                                    Skip for Now
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={completeOnboarding}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    🚀 Start Smart Planning!
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    return (
        <MobileOptimizedLayout>
            <div className="max-w-7xl mx-auto">
                <FeatureGate
                    feature={FEATURE_GATES.CREATE_MEAL_PLAN}
                    fallback={
                        <div className="px-4 py-8">
                            {/* Enhanced Header for Free Users */}
                            <div className="text-center mb-8">
                                <div className="flex items-center justify-center space-x-3 mb-4">
                                    <h1 className="text-3xl font-bold text-gray-900">💰 Smart Meal Planning</h1>
                                    <SubscriptionIndicator />
                                </div>
                                <p className="text-gray-600">
                                    Plan your meals with intelligent price optimization and budget tracking
                                </p>
                            </div>

                            {/* Enhanced Premium Feature Showcase */}
                            <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 rounded-xl p-8 mb-8 border-2 border-gradient-to-r border-blue-200">
                                <div className="text-center mb-6">
                                    <div className="text-6xl mb-4">🧠💰📅</div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                        Smart Meal Planning with Price Intelligence
                                    </h2>
                                    <p className="text-gray-700 max-w-3xl mx-auto">
                                        Transform your meal planning with AI-powered price optimization, budget tracking,
                                        deal detection, and smart grocery shopping. Save money while eating better.
                                    </p>
                                </div>

                                {/* Enhanced Feature Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-blue-200">
                                        <div className="text-3xl mb-2">💰</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Budget Tracking</h3>
                                        <p className="text-sm text-gray-600">Set weekly budgets and track spending in real-time</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-green-200">
                                        <div className="text-3xl mb-2">🎯</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Deal Detection</h3>
                                        <p className="text-sm text-gray-600">Get alerts on sales and money-saving opportunities</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-purple-200">
                                        <div className="text-3xl mb-2">🧠</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Smart Suggestions</h3>
                                        <p className="text-sm text-gray-600">AI-powered meal recommendations based on your inventory</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-yellow-200">
                                        <div className="text-3xl mb-2">🛒</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Optimized Shopping</h3>
                                        <p className="text-sm text-gray-600">Generate cost-optimized shopping lists with store recommendations</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-red-200">
                                        <div className="text-3xl mb-2">📊</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Price Analytics</h3>
                                        <p className="text-sm text-gray-600">Track price trends and identify best buying times</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-indigo-200">
                                        <div className="text-3xl mb-2">📦</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Inventory Integration</h3>
                                        <p className="text-sm text-gray-600">Prioritize meals using what you already have</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-pink-200">
                                        <div className="text-3xl mb-2">🔄</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Smart Substitutions</h3>
                                        <p className="text-sm text-gray-600">Automatic cheaper alternatives when ingredients are expensive</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-teal-200">
                                        <div className="text-3xl mb-2">📱</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Mobile Optimized</h3>
                                        <p className="text-sm text-gray-600">Plan and shop seamlessly on any device</p>
                                    </div>
                                </div>

                                {/* Interactive Demo Preview */}
                                <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                                        Preview: Smart Meal Planning in Action
                                    </h3>

                                    {/* Mock Budget Display */}
                                    <div className="grid grid-cols-4 gap-3 mb-4">
                                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                            <div className="text-sm font-medium text-blue-900">Weekly Budget</div>
                                            <div className="text-lg font-bold text-blue-600">$120.00</div>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                            <div className="text-sm font-medium text-green-900">Current Cost</div>
                                            <div className="text-lg font-bold text-green-600">$87.50</div>
                                        </div>
                                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                            <div className="text-sm font-medium text-purple-900">Deals Found</div>
                                            <div className="text-lg font-bold text-purple-600">8</div>
                                        </div>
                                        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                                            <div className="text-sm font-medium text-yellow-900">Potential Savings</div>
                                            <div className="text-lg font-bold text-yellow-600">$23.40</div>
                                        </div>
                                    </div>

                                    {/* Mock Calendar */}
                                    <div className="grid grid-cols-7 gap-2 text-center text-xs">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                            <div key={day}>
                                                <div className="font-medium text-gray-700 mb-2">{day}</div>
                                                <div className="space-y-1">
                                                    {index === 1 ? (
                                                        <>
                                                            <div className="bg-green-100 border border-green-300 rounded p-1 min-h-[2rem] flex items-center justify-center">
                                                                <span className="text-green-800">Pancakes 💰$3.50</span>
                                                            </div>
                                                            <div className="bg-blue-100 border border-blue-300 rounded p-1 min-h-[2rem] flex items-center justify-center">
                                                                <span className="text-blue-800">Caesar Salad 🎯DEAL</span>
                                                            </div>
                                                            <div className="bg-purple-100 border border-purple-300 rounded p-1 min-h-[2rem] flex items-center justify-center">
                                                                <span className="text-purple-800">Chicken Parmesan 📦INV</span>
                                                            </div>
                                                        </>
                                                    ) : index === 2 ? (
                                                        <>
                                                            <div className="bg-gray-100 border border-gray-300 rounded p-1 min-h-[2rem] flex items-center justify-center">
                                                                <span className="text-gray-600">Oatmeal</span>
                                                            </div>
                                                            <div className="bg-gray-100 border border-gray-300 rounded p-1 min-h-[2rem] flex items-center justify-center">
                                                                <span className="text-gray-600">Sandwich</span>
                                                            </div>
                                                            <div className="bg-yellow-100 border border-yellow-300 rounded p-1 min-h-[2rem] flex items-center justify-center">
                                                                <span className="text-yellow-800">Tacos 💡SMART</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        Array(3).fill(0).map((_, i) => (
                                                            <div key={i} className="bg-gray-50 border border-gray-200 rounded p-1 min-h-[2rem] flex items-center justify-center">
                                                                <span className="text-gray-400">Plan meal</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="text-center mt-4 text-sm text-gray-500">
                                        💰 = Budget-friendly • 🎯 = On sale • 📦 = Uses inventory • 💡 = Smart suggestion
                                    </div>
                                </div>

                                {/* Enhanced Upgrade CTA */}
                                <div className="text-center">
                                    <TouchEnhancedButton
                                        onClick={() => window.location.href = '/pricing?source=smart-meal-planning'}
                                        className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-green-700 transition-all transform hover:scale-105 shadow-xl"
                                    >
                                        🚀 Upgrade to Gold - Start Smart Planning!
                                    </TouchEnhancedButton>
                                    <p className="text-sm text-gray-600 mt-3">
                                        7-day free trial • Gold $4.99/month, Platinum $9.99/month • Cancel anytime
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Save an average of $40+ per month on groceries with smart meal planning
                                    </p>
                                </div>
                            </div>

                            {/* Enhanced What's Included Section */}
                            <div className="bg-white rounded-lg border p-6 mb-8">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                                    🎯 Complete Smart Meal Planning Feature Set
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3">🥇 Gold Features ($4.99/mo)</h4>
                                        <div className="space-y-2">
                                            {[
                                                'Smart meal planning (2 weeks)',
                                                'Budget tracking & optimization',
                                                'Basic deal detection',
                                                'Inventory-first suggestions',
                                                'Enhanced shopping lists',
                                                '250 inventory items',
                                                'Unlimited UPC scanning',
                                                'Recipe reviews & ratings'
                                            ].map((feature, index) => (
                                                <div key={index} className="flex items-center space-x-2">
                                                    <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                                    <span className="text-sm text-gray-700">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3">💎 Platinum Features ($9.99/mo)</h4>
                                        <div className="space-y-2">
                                            {[
                                                'Advanced price analytics',
                                                'Multi-store optimization',
                                                'Predictive price trends',
                                                'Custom deal alerts',
                                                'Seasonal suggestions',
                                                'Nutrition optimization',
                                                'Meal prep planning',
                                                'Export capabilities'
                                            ].map((feature, index) => (
                                                <div key={index} className="flex items-center space-x-2">
                                                    <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                                    <span className="text-sm text-gray-700">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3">🚀 Business Features (Custom)</h4>
                                        <div className="space-y-2">
                                            {[
                                                'Family meal coordination',
                                                'Bulk shopping optimization',
                                                'Restaurant menu planning',
                                                'Nutritionist collaboration',
                                                'Advanced reporting',
                                                'API access',
                                                'Priority support',
                                                'Custom integrations'
                                            ].map((feature, index) => (
                                                <div key={index} className="flex items-center space-x-2">
                                                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                                    <span className="text-sm text-gray-700">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Free User Alternatives */}
                            <div className="bg-gray-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                                    💡 Free Tools While You Decide
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/recipes'}
                                            className="w-full bg-blue-100 text-blue-700 py-3 px-4 rounded-lg hover:bg-blue-200 transition-colors"
                                        >
                                            Browse Recipes
                                        </TouchEnhancedButton>
                                        <p className="text-xs text-gray-600 mt-2">Find budget-friendly meal ideas</p>
                                    </div>
                                    <div className="text-center">
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/inventory'}
                                            className="w-full bg-green-100 text-green-700 py-3 px-4 rounded-lg hover:bg-green-200 transition-colors"
                                        >
                                            Check Inventory
                                        </TouchEnhancedButton>
                                        <p className="text-xs text-gray-600 mt-2">See what you can cook now</p>
                                    </div>
                                    <div className="text-center">
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/pricing'}
                                            className="w-full bg-purple-100 text-purple-700 py-3 px-4 rounded-lg hover:bg-purple-200 transition-colors"
                                        >
                                            View Pricing
                                        </TouchEnhancedButton>
                                        <p className="text-xs text-gray-600 mt-2">See all features and pricing</p>
                                    </div>
                                </div>
                            </div>

                            <Footer />
                        </div>
                    }
                >
                    {/* Enhanced Header for Subscribers */}
                    <div className="px-4 py-6 bg-gradient-to-r from-blue-50 to-green-50 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <h1 className="text-2xl font-bold text-gray-900">🧠 Smart Meal Planning</h1>
                                <SubscriptionIndicator />
                                {priceIntelligenceEnabled && (
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                        💡 Price Intelligence Active
                                    </span>
                                )}
                            </div>

                            {!priceIntelligenceEnabled && (
                                <TouchEnhancedButton
                                    onClick={handleEnablePriceIntelligence}
                                    className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-green-700 font-medium"
                                >
                                    🚀 Enable Price Intelligence
                                </TouchEnhancedButton>
                            )}
                        </div>

                        {priceIntelligenceEnabled && (
                            <p className="text-gray-600">
                                Plan your meals with intelligent budget tracking, deal detection, and cost optimization
                            </p>
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="px-4">
                        {priceIntelligenceEnabled ? (
                            <PriceAwareMealPlanningCalendar />
                        ) : (
                            // Fallback to original meal planning if price intelligence not enabled
                            <div className="py-8">
                                <div className="text-center mb-8">
                                    <div className="text-4xl mb-4">📅</div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                        Basic Meal Planning
                                    </h2>
                                    <p className="text-gray-600">
                                        Enable Price Intelligence for smart budgeting and cost optimization features
                                    </p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                                    <TouchEnhancedButton
                                        onClick={handleEnablePriceIntelligence}
                                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium text-lg"
                                    >
                                        🚀 Upgrade to Smart Planning
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        )}
                    </div>
                </FeatureGate>
            </div>
        </MobileOptimizedLayout>
    );
}