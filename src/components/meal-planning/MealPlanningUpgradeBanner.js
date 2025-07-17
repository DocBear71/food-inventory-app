'use client';
// file: /src/components/meal-planning/MealPlanningUpgradeBanner.js v1 - Banner to promote enhanced meal planning

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { useRouter } from 'next/navigation';

export default function MealPlanningUpgradeBanner({
                                                      onDismiss = null,
                                                      showOnce = true,
                                                      variant = 'full' // 'full', 'compact', 'minimal'
                                                  }) {
    const router = useRouter();
    const [dismissed, setDismissed] = useState(false);

    const handleDismiss = () => {
        setDismissed(true);
        if (onDismiss) onDismiss();

        if (showOnce) {
            localStorage.setItem('meal-planning-upgrade-banner-dismissed', 'true');
        }
    };

    const handleUpgrade = () => {
        router.push('/meal-planning/enhanced');
    };

    // Don't show if dismissed and showOnce is enabled
    if (showOnce && (dismissed || localStorage.getItem('meal-planning-upgrade-banner-dismissed'))) {
        return null;
    }

    if (dismissed) return null;

    if (variant === 'minimal') {
        return (
            <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-3 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="text-lg">💰</span>
                        <span className="font-medium">Try Smart Meal Planning with budget tracking!</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <TouchEnhancedButton
                            onClick={handleUpgrade}
                            className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50"
                        >
                            Try Now
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={handleDismiss}
                            className="text-white hover:text-blue-200"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        );
    }

    if (variant === 'compact') {
        return (
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="text-2xl">🚀</div>
                        <div>
                            <h3 className="font-semibold text-blue-900">Upgrade to Smart Meal Planning</h3>
                            <p className="text-blue-700 text-sm">Budget tracking, deal detection, and price optimization</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <TouchEnhancedButton
                            onClick={handleUpgrade}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                        >
                            Try Enhanced Version
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={handleDismiss}
                            className="text-gray-400 hover:text-gray-600 text-xl p-1"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        );
    }

    // Full variant (default)
    return (
        <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                    <div className="text-4xl">🧠💰</div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Introducing Smart Meal Planning!</h2>
                        <p className="text-gray-600">Save money with intelligent budget tracking and deal detection</p>
                    </div>
                </div>
                <TouchEnhancedButton
                    onClick={handleDismiss}
                    className="text-gray-400 hover:text-gray-600 text-xl p-1"
                >
                    ×
                </TouchEnhancedButton>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center mb-2">
                        <span className="text-xl mr-2">💰</span>
                        <h3 className="font-semibold text-blue-900">Budget Tracking</h3>
                    </div>
                    <p className="text-blue-800 text-sm">Set weekly budgets and track spending in real-time</p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex items-center mb-2">
                        <span className="text-xl mr-2">🎯</span>
                        <h3 className="font-semibold text-green-900">Deal Detection</h3>
                    </div>
                    <p className="text-green-800 text-sm">Get alerts when ingredients go on sale</p>
                </div>

                <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center mb-2">
                        <span className="text-xl mr-2">🛒</span>
                        <h3 className="font-semibold text-purple-900">Smart Shopping</h3>
                    </div>
                    <p className="text-purple-800 text-sm">Optimized shopping lists with price comparisons</p>
                </div>
            </div>

            {/* Call to action */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                    <span className="font-semibold text-green-600">New!</span> Available now for Gold and Platinum subscribers
                </div>
                <div className="flex space-x-3">
                    <TouchEnhancedButton
                        onClick={() => router.push('/pricing')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                        Learn More
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={handleUpgrade}
                        className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-green-700 font-medium"
                    >
                        🚀 Try Smart Planning
                    </TouchEnhancedButton>
                </div>
            </div>
        </div>
    );
}