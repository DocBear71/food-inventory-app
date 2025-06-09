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
                style={{
                    backgroundColor: disabled ? '#9ca3af' : '#059669',
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
                        e.target.style.backgroundColor = '#047857';
                    }
                }}
                onMouseOut={(e) => {
                    if (!disabled) {
                        e.target.style.backgroundColor = '#059669';
                    }
                }}
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