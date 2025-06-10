// file: /src/components/nutrition/NutritionAnalysisButton.js v1

'use client';

import { useState } from 'react';
import WeeklyNutritionDashboard from './WeeklyNutritionDashboard';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function NutritionAnalysisButton({ mealPlanId, mealPlanName, disabled = false }) {
    const [showNutritionDashboard, setShowNutritionDashboard] = useState(false);

    const handleClick = () => {
        if (!disabled && mealPlanId) {
            setShowNutritionDashboard(true);
        }
    };

    return (
        <>
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