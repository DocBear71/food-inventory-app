// file: /src/components/meal-planning/TemplateLibraryButton.js v1

'use client';

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
                style={{
                    backgroundColor: disabled ? '#9ca3af' : '#7c3aed',
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
                        e.target.style.backgroundColor = '#6d28d9';
                    }
                }}
                onMouseOut={(e) => {
                    if (!disabled) {
                        e.target.style.backgroundColor = '#7c3aed';
                    }
                }}
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