// file: /src/components/meal-planning/MealPrepButton.js v3

'use client';

import { useState } from 'react';
import MealPrepSuggestions from './MealPrepSuggestions';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function MealPrepButton({
                                           mealPlanId,
                                           mealPlanName,
                                           disabled = false
                                       }) {
    const [showMealPrepSuggestions, setShowMealPrepSuggestions] = useState(false);

    const handleClick = () => {
        if (!disabled && mealPlanId) {
            setShowMealPrepSuggestions(true);
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
                        : 'bg-violet-500 hover:bg-violet-600 cursor-pointer'
                } text-white px-6 py-3 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-md`}
                title={disabled ? 'Add some meals to your plan first' : 'Get intelligent meal prep suggestions for batch cooking'}
            >
                🍳 Meal Prep
            </TouchEnhancedButton>

            {showMealPrepSuggestions && (
                <MealPrepSuggestions
                    mealPlanId={mealPlanId}
                    mealPlanName={mealPlanName}
                    onClose={() => setShowMealPrepSuggestions(false)}
                />
            )}
        </>
    );
}