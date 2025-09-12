'use client';
// file: /src/app/meal-planning/page.js v4 - Enhanced meal planning as default for beta

import { useSafeSession } from '@/hooks/useSafeSession';
import { useEffect, useState } from 'react';
import {redirect, useRouter} from 'next/navigation';
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import FeatureGate, { SubscriptionIndicator } from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import MealPlanningCalendar from '@/components/meal-planning/MealPlanningCalendar';
import { apiGet, apiPost } from '@/lib/api-config';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export default function MealPlanningPage() {
    const { data: session, status } = useSafeSession();
    const subscription = useSubscription();
    const mealPlanningGate = useFeatureGate(FEATURE_GATES.CREATE_MEAL_PLAN);
    const router = useRouter();

    // Price intelligence state
    const [priceIntelligenceEnabled, setPriceIntelligenceEnabled] = useState(true); // Default enabled for beta
    const [userPreferences, setUserPreferences] = useState({
        budgetOptimization: true,
        dealAlerts: true,
        inventoryFirst: true,
        priceTracking: true
    });
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session?.user?.id) {
            initializePriceIntelligence();
        }
    }, [session?.user?.id]);

    const initializePriceIntelligence = async () => {
        try {
            // Check if user has seen the welcome message
            const hasSeenWelcome = localStorage.getItem('price-intelligence-welcome-seen');
            if (!hasSeenWelcome) {
                setShowWelcome(true);
            }

            // Initialize price intelligence if not already done
            const response = await apiPost('/api/price-tracking/enable', {
                preferences: userPreferences
            });

            if (response.ok) {
                setPriceIntelligenceEnabled(true);
            }
        } catch (error) {
            console.error('Error initializing price intelligence:', error);
            // Continue with basic meal planning if price intelligence fails
            setPriceIntelligenceEnabled(false);
        }
    };

    const handleWelcomeComplete = () => {
        localStorage.setItem('price-intelligence-welcome-seen', 'true');
        setShowWelcome(false);
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

    // Welcome Modal for New Price Intelligence Features
    if (showWelcome) {
        return (
            <MobileOptimizedLayout>
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Header */}
                            <div className="text-center mb-6">
                                <div className="text-6xl mb-4">🎉💰</div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    Welcome to Smart Meal Planning!
                                </h2>
                                <p className="text-gray-600">
                                    Your meal planning just got a major upgrade with intelligent budget tracking and deal detection
                                </p>
                            </div>

                            {/* Features Overview */}
                            <div className="space-y-4 mb-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center mb-2">
                                        <span className="text-2xl mr-3">💰</span>
                                        <h3 className="font-semibold text-blue-900">Budget Tracking</h3>
                                    </div>
                                    <p className="text-blue-800 text-sm">
                                        Set weekly budgets and see real-time cost estimates for your meal plans
                                    </p>
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center mb-2">
                                        <span className="text-2xl mr-3">🎯</span>
                                        <h3 className="font-semibold text-green-900">Deal Detection</h3>
                                    </div>
                                    <p className="text-green-800 text-sm">
                                        Get smart meal suggestions when your favorite ingredients go on sale
                                    </p>
                                </div>

                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <div className="flex items-center mb-2">
                                        <span className="text-2xl mr-3">🛒</span>
                                        <h3 className="font-semibold text-purple-900">Smart Shopping Lists</h3>
                                    </div>
                                    <p className="text-purple-800 text-sm">
                                        Generate price-optimized shopping lists with store recommendations
                                    </p>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex items-center mb-2">
                                        <span className="text-2xl mr-3">📦</span>
                                        <h3 className="font-semibold text-yellow-900">Inventory-First Planning</h3>
                                    </div>
                                    <p className="text-yellow-800 text-sm">
                                        Prioritize meals using ingredients you already have to minimize waste
                                    </p>
                                </div>
                            </div>

                            {/* Beta Tester Message */}
                            <div className="bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-300 rounded-lg p-4 mb-6">
                                <div className="flex items-center mb-2">
                                    <span className="text-2xl mr-3">🧪</span>
                                    <h3 className="font-semibold text-blue-900">Beta Tester Exclusive!</h3>
                                </div>
                                <p className="text-blue-800 text-sm">
                                    You're getting early access to these amazing features! Your feedback helps us make
                                    Doc Bear's Comfort Kitchen the best meal planning app possible.
                                </p>
                            </div>

                            {/* Action Button */}
                            <div className="text-center">
                                <TouchEnhancedButton
                                    onClick={handleWelcomeComplete}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold text-lg"
                                >
                                    🚀 Start Smart Planning!
                                </TouchEnhancedButton>
                                <p className="text-sm text-gray-500 mt-3">
                                    Ready to save money and plan better meals?
                                </p>
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
                            {/* Free user experience remains the same */}
                            <div className="text-center mb-8">
                                <div className="flex items-center justify-center space-x-3 mb-4">
                                    <h1 className="text-3xl font-bold text-gray-900">Meal Planning</h1>
                                    <SubscriptionIndicator />
                                </div>
                                <p className="text-gray-600">Plan your meals in advance with our powerful meal planning tools</p>
                            </div>

                            {/* Premium Feature Showcase */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-8 mb-8 border border-blue-200">
                                <div className="text-center mb-6">
                                    <div className="text-6xl mb-4">📅✨</div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                        Smart Meal Planning is a Gold Feature
                                    </h2>
                                    <p className="text-gray-700 max-w-2xl mx-auto">
                                        Take control of your kitchen with advanced meal planning tools, budget tracking,
                                        deal detection, and smart shopping lists.
                                    </p>
                                </div>

                                {/* Enhanced Features Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                        <div className="text-2xl mb-2">💰</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Budget Tracking</h3>
                                        <p className="text-sm text-gray-600">Track weekly spending and get cost estimates</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                        <div className="text-2xl mb-2">🎯</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Deal Detection</h3>
                                        <p className="text-sm text-gray-600">Get alerts when ingredients go on sale</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                        <div className="text-2xl mb-2">🛒</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Smart Shopping</h3>
                                        <p className="text-sm text-gray-600">Price-optimized lists with store recommendations</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                        <div className="text-2xl mb-2">📦</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Inventory Integration</h3>
                                        <p className="text-sm text-gray-600">Use what you have, reduce waste</p>
                                    </div>
                                </div>

                                {/* Upgrade CTA */}
                                <div className="text-center">
                                    <TouchEnhancedButton
                                        onClick={() => router.push('/pricing?source=meal-planning')}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        Upgrade to Gold - Start Smart Planning!
                                    </TouchEnhancedButton>
                                    <p className="text-sm text-gray-600 mt-3">
                                        7-day free trial • $4.99/month Gold, $9.99/month Platinum • Cancel anytime
                                    </p>
                                </div>
                            </div>

                            <Footer />
                        </div>
                    }
                >
                    {/* Enhanced Meal Planning for Subscribers */}
                    <div className="px-4">
                        {/* Enhanced Header */}
                        <div className="py-6 bg-gradient-to-r from-blue-50 to-green-50 border-b border-gray-200 -mx-4 px-4 mb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <h1 className="text-2xl font-bold text-gray-900">🧠 Smart Meal Planning</h1>
                                    <SubscriptionIndicator />
                                    {priceIntelligenceEnabled && (
                                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                            💡 Price Intelligence Active
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-gray-600 mt-2">
                                Plan your meals with intelligent budget tracking, deal detection, and cost optimization
                            </p>
                        </div>

                        {/* Main Enhanced Meal Planning Calendar */}
                        <MealPlanningCalendar />
                    </div>
                </FeatureGate>
                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}