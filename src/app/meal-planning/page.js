'use client';
// file: /src/app/meal-planning/page.js v3 - Updated existing page with enhanced features promotion

import { useSafeSession } from '@/hooks/useSafeSession';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import MealPlanningCalendar from '@/components/meal-planning/MealPlanningCalendar';
import MealPlanningUpgradeBanner from '@/components/meal-planning/MealPlanningUpgradeBanner';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import FeatureGate, { SubscriptionIndicator } from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function MealPlanningPage() {
    const { data: session, status } = useSafeSession();
    const subscription = useSubscription();
    const mealPlanningGate = useFeatureGate(FEATURE_GATES.CREATE_MEAL_PLAN);

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

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

    return (
        <MobileOptimizedLayout>
            <div className="max-w-7xl mx-auto">
                <FeatureGate
                    feature={FEATURE_GATES.CREATE_MEAL_PLAN}
                    fallback={
                        <div className="px-4 py-8">
                            {/* Header with subscription info */}
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
                                        Meal Planning is a Gold Feature
                                    </h2>
                                    <p className="text-gray-700 max-w-2xl mx-auto">
                                        Take control of your kitchen with advanced meal planning tools. Plan up to 2 weeks ahead,
                                        generate shopping lists, get meal prep suggestions, and never wonder "what's for dinner?" again.
                                    </p>
                                </div>

                                {/* Feature Preview */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                        <div className="text-2xl mb-2">📋</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Weekly Planning</h3>
                                        <p className="text-sm text-gray-600">Plan up to 2 weeks of meals with our visual calendar</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                        <div className="text-2xl mb-2">🛒</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Smart Shopping Lists</h3>
                                        <p className="text-sm text-gray-600">Auto-generate lists from your meal plans</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                        <div className="text-2xl mb-2">👨‍🍳</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Meal Prep Tips</h3>
                                        <p className="text-sm text-gray-600">Get suggestions for efficient meal preparation</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                        <div className="text-2xl mb-2">📱</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Mobile Optimized</h3>
                                        <p className="text-sm text-gray-600">Plan meals on any device, anywhere</p>
                                    </div>
                                </div>

                                {/* Mock Calendar Preview */}
                                <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Preview: Weekly Meal Plan</h3>
                                    <div className="grid grid-cols-7 gap-2 text-center">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                            <div key={day}>
                                                <div className="font-medium text-gray-700 mb-2 text-sm">{day}</div>
                                                <div className="space-y-1">
                                                    {['Breakfast', 'Lunch', 'Dinner'].map((meal, mealIndex) => (
                                                        <div
                                                            key={meal}
                                                            className="bg-gray-100 rounded p-2 text-xs text-gray-500 min-h-[3rem] flex items-center justify-center"
                                                        >
                                                            {index === 1 && mealIndex === 0 ? 'Pancakes' :
                                                                index === 1 && mealIndex === 1 ? 'Caesar Salad' :
                                                                    index === 1 && mealIndex === 2 ? 'Chicken Parmesan' :
                                                                        index === 2 && mealIndex === 2 ? 'Tacos' :
                                                                            'Click to plan'}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-center mt-4 text-sm text-gray-500">
                                        ↑ This is what your meal planning calendar would look like
                                    </div>
                                </div>

                                {/* Upgrade CTA */}
                                <div className="text-center">
                                    <TouchEnhancedButton
                                        onClick={() => window.location.href = '/pricing?source=meal-planning'}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        Upgrade to Gold - Start Planning Today!
                                    </TouchEnhancedButton>
                                    <p className="text-sm text-gray-600 mt-3">
                                        7-day free trial • $4.99/month Gold, $9.99/month Platinum • Cancel anytime
                                    </p>
                                </div>
                            </div>

                            {/* What Gold Includes */}
                            <div className="bg-white rounded-lg border p-6 mb-8">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                                    🎯 What's Included with Gold
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">Meal planning (up to 2 weeks)</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">250 inventory items (vs 50 free)</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">Unlimited UPC scanning</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">Common Items Wizard</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">Recipe reviews & ratings</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">Email notifications</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">Nutritional information</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">100 personal recipes (vs 5 free)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alternative Options for Free Users */}
                            <div className="bg-gray-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                                    💡 Free Alternatives While You Decide
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/recipes'}
                                            className="w-full bg-blue-100 text-blue-700 py-3 px-4 rounded-lg hover:bg-blue-200 transition-colors"
                                        >
                                            Browse Recipes
                                        </TouchEnhancedButton>
                                        <p className="text-xs text-gray-600 mt-2">Find inspiration for your next meal</p>
                                    </div>
                                    <div className="text-center">
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/inventory'}
                                            className="w-full bg-green-100 text-green-700 py-3 px-4 rounded-lg hover:bg-green-200 transition-colors"
                                        >
                                            Check Inventory
                                        </TouchEnhancedButton>
                                        <p className="text-xs text-gray-600 mt-2">See what you have available</p>
                                    </div>
                                    <div className="text-center">
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/recipes/suggestions'}
                                            className="w-full bg-purple-100 text-purple-700 py-3 px-4 rounded-lg hover:bg-purple-200 transition-colors"
                                        >
                                            Recipe Suggestions
                                        </TouchEnhancedButton>
                                        <p className="text-xs text-gray-600 mt-2">Find recipes you can make now</p>
                                    </div>
                                </div>
                            </div>

                            <Footer />
                        </div>
                    }
                >
                    {/* Enhanced Content for Gold/Platinum Subscribers */}
                    <div className="px-4">
                        {/* Header */}
                        <div className="py-6 border-b border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <h1 className="text-2xl font-bold text-gray-900">📅 Meal Planning</h1>
                                    <SubscriptionIndicator />
                                </div>
                            </div>
                            <p className="text-gray-600">
                                Plan your meals in advance with our powerful meal planning tools
                            </p>
                        </div>

                        {/* Smart Planning Upgrade Banner */}
                        {subscription?.data?.tier === 'gold' || subscription?.data?.tier === 'platinum' ? (
                            <div className="py-6">
                                <MealPlanningUpgradeBanner
                                    variant="compact"
                                    showOnce={true}
                                />
                            </div>
                        ) : null}

                        {/* Main Meal Planning Calendar */}
                        <div className="py-6">
                            <MealPlanningCalendar />
                        </div>
                    </div>
                </FeatureGate>
            </div>
        </MobileOptimizedLayout>
    );
}