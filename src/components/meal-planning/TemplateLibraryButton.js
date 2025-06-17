'use client';
// file: /src/components/meal-planning/TemplateLibraryButton.js v1


import { useState } from 'react';
import MealPlanTemplateLibrary from './MealPlanTemplateLibrary';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function TemplateLibraryButton({
                                                  mealPlanId,
                                                  mealPlanName,
                                                  onTemplateApplied,
                                                  disabled = false
                                              }) {
    const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);

    const handleClick = () => {
        if (!disabled && mealPlanId) {
            setShowTemplateLibrary(true);
        }
    };

    const handleTemplateApplied = (updatedMealPlan) => {
        if (onTemplateApplied) {
            onTemplateApplied(updatedMealPlan);
        }
        setShowTemplateLibrary(false);
    };

    return (
        <>
            <TouchEnhancedButton
                onClick={handleClick}
                disabled={disabled}
                className={`${
                    disabled
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-violet-600 hover:bg-violet-700 cursor-pointer'
                } text-white px-6 py-3 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-md`}
                title={disabled ? 'Create a meal plan first' : 'Browse and apply meal plan templates'}
            >
                🔄 Templates
            </TouchEnhancedButton>

            {showTemplateLibrary && (
                <MealPlanTemplateLibrary
                    mealPlanId={mealPlanId}
                    mealPlanName={mealPlanName}
                    onClose={() => setShowTemplateLibrary(false)}
                    onTemplateApplied={handleTemplateApplied}
                />
            )}
        </>
    );
}
