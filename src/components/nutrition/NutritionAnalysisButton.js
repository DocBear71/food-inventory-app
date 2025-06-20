'use client';
// file: /src/components/nutrition/NutritionAnalysisButton.js v2 - Added subscription gate for Gold+ users

import { useState } from 'react';
import WeeklyNutritionDashboard from './WeeklyNutritionDashboard';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';

export default function NutritionAnalysisButton({ mealPlanId, mealPlanName, disabled = false }) {
    const [showNutritionDashboard, setShowNutritionDashboard] = useState(false);

    // Subscription hooks
    const subscription = useSubscription();
    const nutritionGate = useFeatureGate(FEATURE_GATES.NUTRITION_ACCESS);

    const handleClick = () => {
        if (!disabled && mealPlanId && nutritionGate.hasAccess) {
            setShowNutritionDashboard(true);
        }
    };

    return (
        <>
            <FeatureGate
                feature={FEATURE_GATES.NUTRITION_ACCESS}
                fallback={
                    <div className="relative group">
                        <TouchEnhancedButton
                            disabled={true}
                            className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 text-sm font-medium shadow-md cursor-not-allowed opacity-75"
                        >
                            🔒 Nutrition Overview
                        </TouchEnhancedButton>

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-yellow-600 text-white text-xs rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                            <div className="text-center">
                                <div className="font-semibold mb-1">Gold Feature</div>
                                <div className="mb-2">Get detailed nutrition analysis for your meal plans with a Gold subscription.</div>
                                <TouchEnhancedButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = '/pricing?source=nutrition-analysis';
                                    }}
                                    className="bg-white text-yellow-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100"
                                >
                                    Upgrade Now
                                </TouchEnhancedButton>
                            </div>
                            {/* Arrow */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-yellow-600"></div>
                        </div>
                    </div>
                }
            >
                <TouchEnhancedButton
                    onClick={handleClick}
                    disabled={disabled}
                    className={`${
                        disabled
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                    } text-white px-6 py-3 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-md`}
                    title={disabled ? 'Add some meals to your plan first' : 'View weekly nutrition analysis'}
                >
                    📊 Nutrition Overview
                </TouchEnhancedButton>
            </FeatureGate>

            {showNutritionDashboard && (
                <WeeklyNutritionDashboard
                    mealPlanId={mealPlanId}
                    mealPlanName={mealPlanName}
                    onClose={() => setShowNutritionDashboard(false)}
                />
            )}
        </>
    );
}