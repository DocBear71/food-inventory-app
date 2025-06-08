// file: /src/components/meal-planning/MealPlanningCalendar.js v9

'use client';

import {useState, useEffect} from 'react';
import {useSession} from 'next-auth/react';
import ShoppingListGenerator from './ShoppingListGenerator';
import MealPrepButton from './MealPrepButton';
import NutritionAnalysisButton from '../nutrition/NutritionAnalysisButton';
import TemplateLibraryButton from './TemplateLibraryButton';

export default function MealPlanningCalendar() {
    const {data: session} = useSession();
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [mealPlan, setMealPlan] = useState(null);
    const [recipes, setRecipes] = useState([]);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [showShoppingList, setShowShoppingList] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Get the start of the week (Monday)
    const getWeekStart = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    };

    const getFormattedWeekStart = (date) => {
        const weekStart = getWeekStart(date);
        return weekStart.toISOString().split('T')[0];
    };

    // Check if we have any meals planned
    const hasMealsPlanned = () => {
        console.log('=== Checking if meals are planned ===');
        console.log('Meal plan:', mealPlan);

        if (!mealPlan?.meals) {
            console.log('No meal plan or meals object');
            return false;
        }

        const totalMeals = Object.values(mealPlan.meals).reduce((total, dayMeals) => {
            return total + (Array.isArray(dayMeals) ? dayMeals.length : 0);
        }, 0);

        console.log('Total meals planned:', totalMeals);
        console.log('Meals by day:', mealPlan.meals);

        return totalMeals > 0;
    };

    // Fetch meal plan for current week
    const fetchMealPlan = async () => {
        console.log('=== Fetching meal plan ===');
        const weekStartParam = getFormattedWeekStart(currentWeek);
        console.log('Week start param:', weekStartParam);

        try {
            const response = await fetch(`/api/meal-plans?weekStart=${weekStartParam}`);
            const data = await response.json();
            console.log('Fetch response:', data);

            if (data.success && data.mealPlans.length > 0) {
                console.log('Found existing meal plan:', data.mealPlans[0]);
                setMealPlan(data.mealPlans[0]);
            } else {
                console.log('No meal plan found, creating new one');
                await createMealPlan();
            }
        } catch (error) {
            console.error('Error fetching meal plan:', error);
        } finally {
            setLoading(false);
        }
    };

    // Create new meal plan
    const createMealPlan = async () => {
        try {
            const weekStart = getWeekStart(currentWeek);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            const response = await fetch('/api/meal-plans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: `Week of ${weekStart.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    })}`,
                    weekStartDate: weekStart.toISOString(),
                    meals: {
                        monday: [],
                        tuesday: [],
                        wednesday: [],
                        thursday: [],
                        friday: [],
                        saturday: [],
                        sunday: []
                    }
                })
            });

            const data = await response.json();
            if (data.success) {
                setMealPlan(data.mealPlan);
            }
        } catch (error) {
            console.error('Error creating meal plan:', error);
        }
    };

    // Fetch user's recipes
    const fetchRecipes = async () => {
        try {
            const response = await fetch('/api/recipes');
            const data = await response.json();
            if (data.success) {
                setRecipes(data.recipes);
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
        }
    };

    // Handle template applied
    const handleTemplateApplied = (updatedMealPlan) => {
        console.log('Template applied, updating meal plan:', updatedMealPlan);
        setMealPlan(updatedMealPlan);
    };

    // Add meal to slot
    const addMealToSlot = async (day, mealType, recipe) => {
        console.log('=== Adding meal to slot ===');
        console.log('Selected slot:', {day, mealType});
        console.log('Recipe:', recipe.title);
        console.log('Current meal plan ID:', mealPlan?._id);

        if (!mealPlan) return;

        const newMeal = {
            recipeId: recipe._id,
            recipeName: recipe.title,
            mealType: mealType,
            servings: recipe.servings || 4,
            notes: '',
            prepTime: recipe.prepTime || 0,
            cookTime: recipe.cookTime || 0,
            createdAt: new Date()
        };

        // Update local state
        const updatedMeals = {
            ...mealPlan.meals,
            [day]: [...(mealPlan.meals[day] || []), newMeal]
        };

        console.log('Sending update to API:', {
            mealPlanId: mealPlan._id,
            meals: updatedMeals
        });

        try {
            const response = await fetch(`/api/meal-plans/${mealPlan._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    meals: updatedMeals
                })
            });

            const data = await response.json();
            console.log('API Response:', data);

            if (data.success) {
                setMealPlan(prev => ({
                    ...prev,
                    meals: updatedMeals
                }));
                console.log('Meal saved successfully!');
            }
        } catch (error) {
            console.error('Error adding meal:', error);
        }

        setShowRecipeModal(false);
        setSelectedSlot(null);
    };

    // Remove meal from slot - FIXED
    const removeMealFromSlot = async (day, mealIndex) => {
        console.log('=== Removing meal from slot ===');
        console.log('Day:', day, 'Meal index:', mealIndex);

        if (!mealPlan) return;

        const updatedMeals = {
            ...mealPlan.meals,
            [day]: mealPlan.meals[day].filter((_, index) => index !== mealIndex)
        };

        console.log('Updated meals after removal:', updatedMeals);

        try {
            const response = await fetch(`/api/meal-plans/${mealPlan._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    meals: updatedMeals
                })
            });

            const data = await response.json();
            console.log('Remove meal API response:', data);

            if (data.success) {
                setMealPlan(prev => ({
                    ...prev,
                    meals: updatedMeals
                }));
                console.log('Meal removed successfully!');
            }
        } catch (error) {
            console.error('Error removing meal:', error);
        }
    };

    // Navigation functions
    const goToPreviousWeek = () => {
        const prevWeek = new Date(currentWeek);
        prevWeek.setDate(prevWeek.getDate() - 7);
        setCurrentWeek(prevWeek);
    };

    const goToNextWeek = () => {
        const nextWeek = new Date(currentWeek);
        nextWeek.setDate(nextWeek.getDate() + 7);
        setCurrentWeek(nextWeek);
    };

    const goToToday = () => {
        setCurrentWeek(new Date());
    };

    // Get formatted date for display
    const getFormattedDate = (dayIndex) => {
        const weekStart = getWeekStart(currentWeek);
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    };

    // Get day name
    const getDayName = (day) => {
        return day.charAt(0).toUpperCase() + day.slice(1);
    };

    useEffect(() => {
        if (session?.user) {
            fetchMealPlan();
            fetchRecipes();
        }
    }, [session, currentWeek]);

    const mealsPlanned = hasMealsPlanned();
    console.log('Meals planned check result:', mealsPlanned);

    // Early returns for auth and loading
    if (!session) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-600">Please sign in to access meal planning.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-gray-600">Loading meal plan...</p>
            </div>
        );
    }

    // Mobile Layout
    if (isMobile) {
        return (
            <div className="max-w-full mx-auto p-4">
                {/* Mobile Header */}
                <div className="mb-6">
                    <div className="flex flex-col space-y-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">📅 Meal Planning</h1>
                            <p className="text-gray-600 text-sm mt-1">Plan your meals for the week</p>
                        </div>

                        {/* Action Buttons - Mobile */}
                        <div className="flex flex-col space-y-3">
                            {/* Template Button - First for easy access */}
                            {mealPlan && (
                                <TemplateLibraryButton
                                    mealPlanId={mealPlan._id}
                                    mealPlanName={mealPlan.name}
                                    onTemplateApplied={handleTemplateApplied}
                                    disabled={false}
                                />
                            )}

                            {/* Shopping List Button - FIXED PADDING */}
                            {mealsPlanned && (
                                <button
                                    onClick={() => setShowShoppingList(true)}
                                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 5H19M9 17v1a1 1 0 102 0v-1m4 0v1a1 1 0 102 0v-1"/>
                                    </svg>
                                    <span>Generate Shopping List</span>
                                </button>
                            )}

                            {/* Meal Prep Button */}
                            {mealPlan && (
                                <MealPrepButton
                                    mealPlanId={mealPlan._id}
                                    mealPlanName={mealPlan.name}
                                    disabled={!mealsPlanned}
                                />
                            )}

                            {/* Nutrition Analysis Button */}
                            {mealPlan && (
                                <NutritionAnalysisButton
                                    mealPlanId={mealPlan._id}
                                    mealPlanName={mealPlan.name}
                                    disabled={!mealsPlanned}
                                />
                            )}
                        </div>
                    </div>

                    {/* Week Navigation */}
                    <div className="mt-4 flex items-center justify-between">
                        <button
                            onClick={goToPreviousWeek}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                            </svg>
                        </button>

                        <h2 className="text-xl font-semibold text-gray-900">
                            {getWeekStart(currentWeek).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })} - {(() => {
                            const weekEnd = new Date(getWeekStart(currentWeek));
                            weekEnd.setDate(weekEnd.getDate() + 6);
                            return weekEnd.toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            });
                        })()}
                        </h2>

                        <button
                            onClick={goToNextWeek}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                    <button
                        onClick={goToToday}
                        className="px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                        Today
                    </button>
                </div>

                {/* Mobile Day-by-Day Layout */}
                <div className="space-y-4">
                    {weekDays.map((day, dayIndex) => (
                        <div key={day} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            {/* Day Header */}
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                <h3 className="font-semibold text-gray-900">
                                    {getDayName(day)} - {getFormattedDate(dayIndex)}
                                </h3>
                            </div>

                            {/* Meals for this day */}
                            <div className="p-4 space-y-4">
                                {mealTypes.map(mealType => (
                                    <div key={`${day}-${mealType}`}>
                                        <h4 className="font-medium text-gray-800 capitalize mb-2">{mealType}</h4>
                                        <div className="space-y-2">
                                            {/* Existing Meals - FIXED REMOVE BUTTON */}
                                            {mealPlan?.meals[day]?.filter(meal => meal.mealType === mealType).map((meal, mealTypeIndex) => {
                                                // Get the actual index in the day's meals array
                                                const actualIndex = mealPlan.meals[day].findIndex(m =>
                                                    m.recipeId === meal.recipeId &&
                                                    m.mealType === meal.mealType &&
                                                    m.createdAt === meal.createdAt
                                                );

                                                return (
                                                    <div
                                                        key={`${meal.recipeId}-${mealTypeIndex}`}
                                                        className="group relative bg-indigo-100 border border-indigo-200 rounded-lg p-3"
                                                    >
                                                        <div className="text-sm font-medium text-indigo-900">{meal.recipeName}</div>
                                                        <div className="text-xs text-indigo-700">
                                                            {meal.servings} servings • {meal.prepTime + meal.cookTime} min
                                                        </div>

                                                        {/* Remove Button */}
                                                        <button
                                                            onClick={() => removeMealFromSlot(day, actualIndex)}
                                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                                            title="Remove meal"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            {/* Add Meal Button */}
                                            <button
                                                onClick={() => {
                                                    setSelectedSlot({day, mealType});
                                                    setShowRecipeModal(true);
                                                }}
                                                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-sm"
                                            >
                                                + Add Recipe
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mobile Recipe Selection Modal */}
                {showRecipeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-hidden">
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Add to {selectedSlot && getDayName(selectedSlot.day)} {selectedSlot?.mealType}
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setShowRecipeModal(false);
                                            setSelectedSlot(null);
                                        }}
                                        className="text-gray-400 hover:text-gray-600 text-xl"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 max-h-80 overflow-y-auto">
                                {recipes.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">No recipes found. Add some recipes first!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {recipes.map(recipe => (
                                            <button
                                                key={recipe._id}
                                                onClick={() => addMealToSlot(selectedSlot.day, selectedSlot.mealType, recipe)}
                                                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="font-medium text-gray-900 mb-1">{recipe.title}</div>
                                                <div className="text-sm text-gray-600 mb-2">
                                                    {recipe.servings} servings • {recipe.prepTime + recipe.cookTime} min
                                                    • {recipe.difficulty}
                                                </div>
                                                {recipe.tags && recipe.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {recipe.tags.slice(0, 3).map(tag => (
                                                            <span key={tag}
                                                                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                            {tag}
                                                        </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Shopping List Modal */}
                {showShoppingList && mealPlan && (
                    <ShoppingListGenerator
                        mealPlanId={mealPlan._id}
                        mealPlanName={mealPlan.name}
                        onClose={() => setShowShoppingList(false)}
                    />
                )}

                {/* Empty State */}
                {!loading && (!mealPlan?.meals || !mealsPlanned) && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg mt-6">
                        <div className="text-6xl mb-4">🍽️</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No meals planned yet</h3>
                        <div className="space-y-2">
                            <p className="text-gray-600">Start by using a template or adding recipes manually.</p>
                            {mealPlan && (
                                <div className="mt-4">
                                    <TemplateLibraryButton
                                        mealPlanId={mealPlan._id}
                                        mealPlanName={mealPlan.name}
                                        onTemplateApplied={handleTemplateApplied}
                                        disabled={false}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Desktop Layout
    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">📅 Meal Planning</h1>
                        <p className="text-gray-600 mt-1">Plan your meals for the week</p>
                    </div>

                    {/* Action Buttons - Desktop */}
                    <div className="flex items-center space-x-3">
                        <div className="text-sm text-gray-500">
                            Meals: {mealsPlanned ? 'Yes' : 'No'}
                        </div>

                        {/* Template Button - First for prominence */}
                        {mealPlan && (
                            <TemplateLibraryButton
                                mealPlanId={mealPlan._id}
                                mealPlanName={mealPlan.name}
                                onTemplateApplied={handleTemplateApplied}
                                disabled={false}
                            />
                        )}

                        {/* Shopping List Button - FIXED PADDING */}
                        {mealsPlanned && (
                            <button
                                onClick={() => setShowShoppingList(true)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 5H19M9 17v1a1 1 0 102 0v-1m4 0v1a1 1 0 102 0v-1"/>
                                </svg>
                                <span>Shopping List</span>
                            </button>
                        )}

                        {/* Meal Prep Button */}
                        {mealPlan && (
                            <MealPrepButton
                                mealPlanId={mealPlan._id}
                                mealPlanName={mealPlan.name}
                                disabled={!mealsPlanned}
                            />
                        )}

                        {/* Nutrition Analysis Button */}
                        {mealPlan && (
                            <NutritionAnalysisButton
                                mealPlanId={mealPlan._id}
                                mealPlanName={mealPlan.name}
                                disabled={!mealsPlanned}
                            />
                        )}
                    </div>
                </div>

                {/* Week Navigation */}
                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={goToPreviousWeek}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M15 19l-7-7 7-7"/>
                            </svg>
                        </button>

                        <h2 className="text-xl font-semibold text-gray-900">
                            {getWeekStart(currentWeek).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })} - {(() => {
                            const weekEnd = new Date(getWeekStart(currentWeek));
                            weekEnd.setDate(weekEnd.getDate() + 6);
                            return weekEnd.toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            });
                        })()}
                        </h2>

                        <button
                            onClick={goToNextWeek}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M9 5l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>

                    <button
                        onClick={goToToday}
                        className="px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                        Today
                    </button>
                </div>
            </div>

            {/* Desktop Calendar Grid */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Header Row */}
                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                    {weekDays.map((day, index) => (
                        <div key={day} className="p-4 text-center">
                            <div className="font-semibold text-gray-900">{getDayName(day)}</div>
                            <div className="text-sm text-gray-600">{getFormattedDate(index)}</div>
                        </div>
                    ))}
                </div>

                {/* Meal Type Rows */}
                {mealTypes.map(mealType => (
                    <div key={mealType} className="border-b border-gray-200 last:border-b-0">
                        {/* Meal Type Label */}
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                            <h3 className="font-medium text-gray-900 capitalize">{mealType}</h3>
                        </div>

                        {/* Day Columns */}
                        <div className="grid grid-cols-7">
                            {weekDays.map(day => (
                                <div key={`${day}-${mealType}`}
                                     className="p-3 border-r border-gray-200 last:border-r-0 min-h-24">
                                    <div className="space-y-2">
                                        {/* Existing Meals - FIXED REMOVE BUTTON */}
                                        {mealPlan?.meals[day]?.filter(meal => meal.mealType === mealType).map((meal, mealTypeIndex) => {
                                            // Get the actual index in the day's meals array
                                            const actualIndex = mealPlan.meals[day].findIndex(m =>
                                                m.recipeId === meal.recipeId &&
                                                m.mealType === meal.mealType &&
                                                m.createdAt === meal.createdAt
                                            );

                                            return (
                                                <div
                                                    key={`${meal.recipeId}-${mealTypeIndex}`}
                                                    className="group relative bg-indigo-100 border border-indigo-200 rounded-lg p-2 hover:bg-indigo-200 transition-colors"
                                                >
                                                    <div className="text-sm font-medium text-indigo-900">{meal.recipeName}</div>
                                                    <div className="text-xs text-indigo-700">
                                                        {meal.servings} servings • {meal.prepTime + meal.cookTime} min
                                                    </div>

                                                    {/* Remove Button */}
                                                    <button
                                                        onClick={() => removeMealFromSlot(day, actualIndex)}
                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                        title="Remove meal"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* Add Meal Button */}
                                        <button
                                            onClick={() => {
                                                setSelectedSlot({day, mealType});
                                                setShowRecipeModal(true);
                                            }}
                                            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-sm"
                                        >
                                            + Add Recipe
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Recipe Selection Modal */}
            {showRecipeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Select Recipe for {selectedSlot && getDayName(selectedSlot.day)} {selectedSlot?.mealType}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowRecipeModal(false);
                                        setSelectedSlot(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 text-xl"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="p-4 max-h-80 overflow-y-auto">
                            {recipes.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">No recipes found. Add some recipes first!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {recipes.map(recipe => (
                                        <button
                                            key={recipe._id}
                                            onClick={() => addMealToSlot(selectedSlot.day, selectedSlot.mealType, recipe)}
                                            className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="font-medium text-gray-900">{recipe.title}</div>
                                            <div className="text-sm text-gray-600">
                                                {recipe.servings} servings • {recipe.prepTime + recipe.cookTime} min
                                                • {recipe.difficulty}
                                            </div>
                                            {recipe.tags && recipe.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {recipe.tags.slice(0, 3).map(tag => (
                                                        <span key={tag}
                                                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                        {tag}
                                                    </span>
                                                    ))}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Shopping List Modal */}
            {showShoppingList && mealPlan && (
                <ShoppingListGenerator
                    mealPlanId={mealPlan._id}
                    mealPlanName={mealPlan.name}
                    onClose={() => setShowShoppingList(false)}
                />
            )}

            {/* Empty State */}
            {!loading && (!mealPlan?.meals || !mealsPlanned) && (
                <div className="text-center py-12 bg-gray-50 rounded-lg mt-6">
                    <div className="text-6xl mb-4">🍽️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No meals planned yet</h3>
                    <div className="space-y-4">
                        <p className="text-gray-600">Start by using a template or adding recipes manually.</p>
                        {mealPlan && (
                            <TemplateLibraryButton
                                mealPlanId={mealPlan._id}
                                mealPlanName={mealPlan.name}
                                onTemplateApplied={handleTemplateApplied}
                                disabled={false}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}