'use client';
// file: /src/app/meal-planning/page.js v4 - Enhanced meal planning as default for beta

import { useSafeSession } from '@/hooks/useSafeSession';
import { useEffect, useState } from 'react';
import {redirect, useRouter, userRouter} from 'next/navigation';
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import FeatureGate, { SubscriptionIndicator } from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import MealPlanningCalendar from '@/components/meal-planning/MealPlanningCalendar'; // This will be the enhanced version
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
    const [showDebugInfo, setShowDebugInfo] = useState(true);


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

    const debugInfo = {
        subscription: {
            tier: subscription.tier || 'undefined',
            status: subscription.status || 'undefined',
            isActive: subscription.isActive ? 'Yes' : 'No',
            isAdmin: subscription.isAdmin ? 'Yes' : 'No',
            isExpired: subscription.isExpired ? 'Yes' : 'No',
            originalTier: subscription.originalTier || 'undefined',
            effectiveTier: subscription.isExpired ? 'free' : (subscription.tier || 'free')
        },
        featureGate: {
            CREATE_MEAL_PLAN: FEATURE_GATES.CREATE_MEAL_PLAN,
            gateResult: mealPlanningGate ? 'PASS' : 'FAIL',
            gateType: typeof mealPlanningGate
        },
        session: {
            hasSession: session ? 'Yes' : 'No',
            userId: session?.user?.id ? 'Present' : 'Missing'
        }
    };


    return (
        <MobileOptimizedLayout>
            <div className="max-w-7xl mx-auto px-4 py-6">

                {/* VISUAL DEBUG PANEL - Always visible */}
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-yellow-800">🔍 Debug Information</h2>
                        <TouchEnhancedButton
                            onClick={() => setShowDebugInfo(!showDebugInfo)}
                            className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm"
                        >
                            {showDebugInfo ? 'Hide' : 'Show'}
                        </TouchEnhancedButton>
                    </div>

                    {showDebugInfo && (
                        <div className="space-y-3 text-sm">
                            <div className="bg-white p-3 rounded border">
                                <h3 className="font-semibold text-gray-800 mb-2">Subscription Status:</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><strong>Tier:</strong> {debugInfo.subscription.tier}</div>
                                    <div><strong>Status:</strong> {debugInfo.subscription.status}</div>
                                    <div><strong>Active:</strong> {debugInfo.subscription.isActive}</div>
                                    <div><strong>Admin:</strong> {debugInfo.subscription.isAdmin}</div>
                                    <div><strong>Expired:</strong> {debugInfo.subscription.isExpired}</div>
                                    <div><strong>Effective:</strong> {debugInfo.subscription.effectiveTier}</div>
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded border">
                                <h3 className="font-semibold text-gray-800 mb-2">Feature Gate:</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><strong>Feature:</strong> {debugInfo.featureGate.CREATE_MEAL_PLAN}</div>
                                    <div><strong>Result:</strong>
                                        <span className={`ml-1 px-2 py-1 rounded text-xs ${
                                            debugInfo.featureGate.gateResult === 'PASS'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {debugInfo.featureGate.gateResult}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded border">
                                <h3 className="font-semibold text-gray-800 mb-2">Session:</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><strong>Has Session:</strong> {debugInfo.session.hasSession}</div>
                                    <div><strong>User ID:</strong> {debugInfo.session.userId}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* TEST BUTTONS */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h2 className="text-lg font-bold text-blue-800 mb-3">🧪 Test Actions</h2>
                    <div className="space-y-2">
                        <TouchEnhancedButton
                            onClick={() => router.push('/pricing?source=meal-planning-test')}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded"
                        >
                            Test Navigation to Pricing Page
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => subscription.refetch()}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded"
                        >
                            Refresh Subscription Data
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* CONDITIONAL CONTENT BASED ON TIER */}
                {debugInfo.subscription.effectiveTier === 'platinum' || debugInfo.subscription.isAdmin === 'Yes' ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-green-900 mb-2">✅ PLATINUM ACCESS DETECTED</h1>
                            <p className="text-green-700 mb-4">You should see the meal planning interface below:</p>

                            {/* Placeholder for actual meal planning */}
                            <div className="bg-white rounded-lg p-8 border-2 border-green-300">
                                <h2 className="text-xl font-semibold mb-4">🧠 Smart Meal Planning</h2>
                                <p className="text-gray-600">
                                    This is where MealPlanningCalendar component would render.
                                    If you see this, the access control is working correctly.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-red-900 mb-2">❌ NO PLATINUM ACCESS</h1>
                            <p className="text-red-700 mb-4">
                                Current tier: {debugInfo.subscription.effectiveTier} |
                                Admin: {debugInfo.subscription.isAdmin}
                            </p>

                            <div className="bg-white rounded-lg p-6 border-2 border-red-300">
                                <h2 className="text-xl font-bold text-gray-900 mb-3">
                                    Smart Meal Planning is a Gold Feature
                                </h2>

                                <TouchEnhancedButton
                                    onClick={() => {
                                        // Add visual feedback when button is clicked
                                        const button = event.target;
                                        button.style.background = 'green';
                                        button.textContent = 'Navigating...';

                                        setTimeout(() => {
                                            router.push('/pricing?source=meal-planning');
                                        }, 500);
                                    }}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-indigo-700"
                                >
                                    Upgrade to Gold - Start Smart Planning!
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                )}

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}