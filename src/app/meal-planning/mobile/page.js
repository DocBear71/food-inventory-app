'use client';
// file: /src/app/meal-planning/mobile/page.js - Mobile-optimized meal planning

import { useState, useEffect } from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import MobileDashboardLayout from '@/components/layout/MobileDashboardLayout';
import { SwipeableWeekNavigation } from '@/components/mobile/SwipeNavigation';
import { DragDropMealCard, MealDropZone } from '@/components/mobile/DragDropMeal';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';
import {TouchEnhancedButton} from "@/components/mobile/TouchEnhancedButton";
import Footer from '@/components/legal/Footer';
import { getApiUrl } from '@/lib/api-config';

export default function MobileMealPlanningPage() {
    const { data: session } = useSafeSession();
    const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
    const [mealPlans, setMealPlans] = useState([]);
    const [activeMealPlan, setActiveMealPlan] = useState(null);
    const [loading, setLoading] = useState(true);

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

    useEffect(() => {
        if (session) {
            fetchMealPlans();
        }
    }, [session, currentWeekStart]);

    const fetchMealPlans = async () => {
        try {
            const response = await fetch(getApiUrl('/api/meal-plans'));
            const data = await response.json();
            if (data.success) {
                setMealPlans(data.mealPlans);
                // Find meal plan for current week
                const weekPlan = data.mealPlans.find(plan =>
                    new Date(plan.weekStartDate).getTime() === currentWeekStart.getTime()
                );
                setActiveMealPlan(weekPlan || null);
            }
        } catch (error) {
            console.error('Error fetching meal plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePreviousWeek = () => {
        MobileHaptics.light();
        const newWeek = new Date(currentWeekStart);
        newWeek.setDate(newWeek.getDate() - 7);
        setCurrentWeekStart(newWeek);
    };

    const handleNextWeek = () => {
        MobileHaptics.light();
        const newWeek = new Date(currentWeekStart);
        newWeek.setDate(newWeek.getDate() + 7);
        setCurrentWeekStart(newWeek);
    };

    const handleMealDrop = async (meal, targetDay, targetMealType) => {
        MobileHaptics.success();

        if (!activeMealPlan) {
            // Create new meal plan if none exists
            try {
                const response = await fetch(getApiUrl('/api/meal-plans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: `Week of ${currentWeekStart.toLocaleDateString()}`,
                        weekStartDate: currentWeekStart,
                        meals: {
                            [targetDay]: [{
                                ...meal,
                                mealType: targetMealType
                            }]
                        }
                    })
                }));

                if (response.ok) {
                    await fetchMealPlans();
                }
            } catch (error) {
                MobileHaptics.error();
                console.error('Error creating meal plan:', error);
            }
            return;
        }

        // Update existing meal plan
        try {
            const updatedMeals = { ...activeMealPlan.meals };
            if (!updatedMeals[targetDay]) {
                updatedMeals[targetDay] = [];
            }

            // Remove meal from original position
            Object.keys(updatedMeals).forEach(day => {
                updatedMeals[day] = updatedMeals[day].filter(m =>
                    !(m.recipeId === meal.recipeId && m.mealType === meal.mealType)
                );
            });

            // Add to new position
            updatedMeals[targetDay].push({
                ...meal,
                mealType: targetMealType
            });

            const response = await fetch(getApiUrl(`/api/meal-plans/${activeMealPlan._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meals: updatedMeals })
            }));

            if (response.ok) {
                await fetchMealPlans();
            }
        } catch (error) {
            MobileHaptics.error();
            console.error('Error updating meal plan:', error);
        }
    };

    if (loading) {
        return (
            <MobileDashboardLayout>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </MobileDashboardLayout>
        );
    }

    return (
        <MobileDashboardLayout>
            <SwipeableWeekNavigation
                currentWeek={currentWeekStart}
                onPreviousWeek={handlePreviousWeek}
                onNextWeek={handleNextWeek}
                className="mb-6"
            >
                {/* Mobile Meal Plan Grid */}
                <div className="space-y-4">
                    {daysOfWeek.map(day => (
                        <div key={day} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                            {/* Day Header */}
                            <div className="bg-gray-50 px-4 py-3 border-b">
                                <h3 className="font-semibold text-gray-900 capitalize">
                                    {day}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {new Date(currentWeekStart.getTime() + daysOfWeek.indexOf(day) * 24 * 60 * 60 * 1000)
                                        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                            </div>

                            {/* Meal Types for this day */}
                            <div className="p-4 space-y-4">
                                {mealTypes.map(mealType => {
                                    const meals = activeMealPlan?.meals[day]?.filter(meal =>
                                        meal.mealType === mealType
                                    ) || [];

                                    return (
                                        <div key={mealType}>
                                            <h4 className="text-sm font-medium text-gray-700 capitalize mb-2">
                                                {mealType}
                                            </h4>

                                            <MealDropZone
                                                day={day}
                                                mealType={mealType}
                                                onMealDrop={handleMealDrop}
                                                isEmpty={meals.length === 0}
                                            >
                                                {meals.map((meal, index) => (
                                                    <DragDropMealCard
                                                        key={`${meal.recipeId}-${index}`}
                                                        meal={meal}
                                                        onDrop={(droppedMeal) => handleMealDrop(droppedMeal, day, mealType)}
                                                        onEdit={(meal) => {
                                                            // Handle edit
                                                            MobileHaptics.light();
                                                        }}
                                                        onDelete={(meal) => {
                                                            // Handle delete
                                                            MobileHaptics.medium();
                                                        }}
                                                    />
                                                ))}
                                            </MealDropZone>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    <Footer />
                </div>
            </SwipeableWeekNavigation>

            {/* Floating Action Button */}
            <TouchEnhancedButton
                onClick={() => {
                    MobileHaptics.medium();
                    // Navigate to recipe selection
                }}
                className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all z-20 flex items-center justify-center"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </TouchEnhancedButton>
        </MobileDashboardLayout>
    );
}