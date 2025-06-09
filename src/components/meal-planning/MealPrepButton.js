// file: /src/components/meal-planning/MealPrepButton.js v2

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
                style={{
                    backgroundColor: disabled ? '#9ca3af' : '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.2s',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
                onMouseOver={(e) => {
                    if (!disabled) {
                        e.target.style.backgroundColor = '#7c3aed';
                    }
                }}
                onMouseOut={(e) => {
                    if (!disabled) {
                        e.target.style.backgroundColor = '#8b5cf6';
                    }
                }}
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