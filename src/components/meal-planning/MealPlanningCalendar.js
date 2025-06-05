// file: /src/components/meal-planning/MealPlanningCalendar.js v1

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Helper function to get week dates
function getWeekDates(weekStartDate) {
    const dates = [];
    const start = new Date(weekStartDate);

    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date);
    }

    return dates;
}

// Helper function to format date
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

// Helper function to get Monday of current week
function getMondayOfCurrentWeek() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(today.setDate(diff));
}

// Individual Meal Slot Component
function MealSlot({ day, mealType, meals, onAddMeal, onRemoveMeal }) {
    const dayMeals = meals.filter(meal => meal.mealType === mealType);

    return (
        <div className="border border-gray-200 rounded-lg p-3 min-h-24 bg-white hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {mealType}
                </span>
                <button
                    onClick={() => onAddMeal(day, mealType)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                    title={`Add ${mealType}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            <div className="space-y-2">
                {dayMeals.length > 0 ? (
                    dayMeals.map((meal, index) => (
                        <div
                            key={index}
                            className="bg-indigo-50 border border-indigo-200 rounded-md p-2 group"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-indigo-900 truncate">
                                        {meal.recipeName}
                                    </h4>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className="text-xs text-indigo-600">
                                            {meal.servings} serving{meal.servings !== 1 ? 's' : ''}
                                        </span>
                                        {meal.prepTime && (
                                            <span className="text-xs text-gray-500">
                                                {meal.prepTime}min prep
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveMeal(day, meal)}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                                    title="Remove meal"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            {meal.notes && (
                                <p className="text-xs text-gray-600 mt-1 truncate">{meal.notes}</p>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-xs text-gray-400 italic">
                        No {mealType} planned
                    </div>
                )}
            </div>
        </div>
    );
}

// Recipe Selection Modal Component
function RecipeSelectionModal({ isOpen, onClose, onSelectRecipe, recipes, loading }) {
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredRecipes = recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Select a Recipe</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Search recipes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                </div>

                <div className="p-6 max-h-64 overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading recipes...</div>
                    ) : filteredRecipes.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredRecipes.map((recipe) => (
                                <button
                                    key={recipe._id}
                                    onClick={() => onSelectRecipe(recipe)}
                                    className="text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                    <div className="font-medium text-gray-900">{recipe.title}</div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        {recipe.prepTime && `${recipe.prepTime} min prep`}
                                        {recipe.prepTime && recipe.cookTime && ' • '}
                                        {recipe.cookTime && `${recipe.cookTime} min cook`}
                                        {recipe.difficulty && ` • ${recipe.difficulty}`}
                                    </div>
                                    {recipe.tags && recipe.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {recipe.tags.slice(0, 3).map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No recipes found. Try a different search term.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Main Calendar Component
export default function MealPlanningCalendar() {
    const { data: session } = useSession();
    const [currentWeekStart, setCurrentWeekStart] = useState(getMondayOfCurrentWeek());
    const [mealPlan, setMealPlan] = useState(null);
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingRecipes, setLoadingRecipes] = useState(false);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState({ day: '', mealType: '' });

    const weekDates = getWeekDates(currentWeekStart);
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

    useEffect(() => {
        fetchMealPlan();
        fetchRecipes();
    }, [currentWeekStart]);

    const fetchMealPlan = async () => {
        try {
            const weekStartParam = currentWeekStart.toISOString().split('T')[0];
            const response = await fetch(`/api/meal-plans?weekStart=${weekStartParam}`);
            const data = await response.json();

            if (data.success) {
                if (data.mealPlans.length > 0) {
                    setMealPlan(data.mealPlans[0]);
                } else {
                    // Create a new meal plan for this week
                    await createMealPlan();
                }
            }
        } catch (error) {
            console.error('Error fetching meal plan:', error);
        } finally {
            setLoading(false);
        }
    };

    const createMealPlan = async () => {
        try {
            const response = await fetch('/api/meal-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `Week of ${formatDate(weekDates[0])}`,
                    weekStartDate: currentWeekStart
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

    const fetchRecipes = async () => {
        setLoadingRecipes(true);
        try {
            const response = await fetch('/api/recipes');
            const data = await response.json();

            if (data.success) {
                setRecipes(data.recipes);
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
        } finally {
            setLoadingRecipes(false);
        }
    };

    const navigateWeek = (direction) => {
        const newWeekStart = new Date(currentWeekStart);
        newWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
        setCurrentWeekStart(newWeekStart);
    };

    const handleAddMeal = (day, mealType) => {
        setSelectedSlot({ day, mealType });
        setShowRecipeModal(true);
    };

    const handleSelectRecipe = async (recipe) => {
        if (!mealPlan) return;

        const newMeal = {
            recipeId: recipe._id,
            recipeName: recipe.title,
            mealType: selectedSlot.mealType,
            servings: mealPlan.preferences?.defaultServings || 4,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            notes: ''
        };

        try {
            const updatedMeals = { ...mealPlan.meals };
            updatedMeals[selectedSlot.day] = [...(updatedMeals[selectedSlot.day] || []), newMeal];

            const response = await fetch('/api/meal-plans', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mealPlanId: mealPlan._id,
                    meals: updatedMeals
                })
            });

            const data = await response.json();
            if (data.success) {
                setMealPlan(data.mealPlan);
            }
        } catch (error) {
            console.error('Error adding meal:', error);
        }

        setShowRecipeModal(false);
        setSelectedSlot({ day: '', mealType: '' });
    };

    const handleRemoveMeal = async (day, mealToRemove) => {
        if (!mealPlan) return;

        try {
            const updatedMeals = { ...mealPlan.meals };
            updatedMeals[day] = updatedMeals[day].filter(meal =>
                !(meal.recipeId === mealToRemove.recipeId && meal.mealType === mealToRemove.mealType)
            );

            const response = await fetch('/api/meal-plans', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mealPlanId: mealPlan._id,
                    meals: updatedMeals
                })
            });

            const data = await response.json();
            if (data.success) {
                setMealPlan(data.mealPlan);
            }
        } catch (error) {
            console.error('Error removing meal:', error);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="grid grid-cols-7 gap-4">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="space-y-3">
                                <div className="h-6 bg-gray-200 rounded"></div>
                                {[...Array(4)].map((_, j) => (
                                    <div key={j} className="h-24 bg-gray-200 rounded"></div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Meal Planning</h1>
                    <p className="text-gray-600">
                        Week of {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => navigateWeek(-1)}
                        className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        title="Previous week"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button
                        onClick={() => setCurrentWeekStart(getMondayOfCurrentWeek())}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                    >
                        Today
                    </button>

                    <button
                        onClick={() => navigateWeek(1)}
                        className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        title="Next week"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-4">
                {dayNames.map((day, dayIndex) => (
                    <div key={day} className="space-y-3">
                        {/* Day Header */}
                        <div className="text-center">
                            <h3 className="font-semibold text-gray-900 capitalize">{day}</h3>
                            <p className="text-sm text-gray-500">{formatDate(weekDates[dayIndex])}</p>
                        </div>

                        {/* Meal Slots */}
                        <div className="space-y-2">
                            {mealTypes.map(mealType => (
                                <MealSlot
                                    key={`${day}-${mealType}`}
                                    day={day}
                                    mealType={mealType}
                                    meals={mealPlan?.meals[day] || []}
                                    onAddMeal={handleAddMeal}
                                    onRemoveMeal={handleRemoveMeal}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Recipe Selection Modal */}
            <RecipeSelectionModal
                isOpen={showRecipeModal}
                onClose={() => setShowRecipeModal(false)}
                onSelectRecipe={handleSelectRecipe}
                recipes={recipes}
                loading={loadingRecipes}
            />
        </div>
    );
}