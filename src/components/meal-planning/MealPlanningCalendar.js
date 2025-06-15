// file: /src/components/meal-planning/MealPlanningCalendar.js v15 - Updated with expanded meal types (Breakfast, AM Snack, Lunch, Afternoon Snack, Dinner, PM Snack)

'use client';

import {useState, useEffect} from 'react';
import {useSession} from 'next-auth/react';
import ShoppingListGenerator from './ShoppingListGenerator';
import MealPrepButton from './MealPrepButton';
import NutritionAnalysisButton from '../nutrition/NutritionAnalysisButton';
import TemplateLibraryButton from './TemplateLibraryButton';
import SimpleMealBuilder from './SimpleMealBuilder';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function MealPlanningCalendar() {
    const {data: session} = useSession();
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [mealPlan, setMealPlan] = useState(null);
    const [recipes, setRecipes] = useState([]);
    const [filteredRecipes, setFilteredRecipes] = useState([]);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [showSimpleMealBuilder, setShowSimpleMealBuilder] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [showShoppingList, setShowShoppingList] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [weekStartDay, setWeekStartDay] = useState('monday');
    // UPDATED: Default to expanded meal types
    const [userMealTypes, setUserMealTypes] = useState(['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack']);
    const [showWeekSettings, setShowWeekSettings] = useState(false);
    const [showWeekNotification, setShowWeekNotification] = useState(true);

    // User dietary preferences
    const [userDietaryRestrictions, setUserDietaryRestrictions] = useState([]);
    const [userAvoidIngredients, setUserAvoidIngredients] = useState([]);
    const [dietaryWarningMessage, setDietaryWarningMessage] = useState('');

    // Week days configuration based user preference
    const getWeekDaysOrder = (startDay) => {
        const allDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const startIndex = allDays.indexOf(startDay);
        return [...allDays.slice(startIndex), ...allDays.slice(0, startIndex)];
    };

    const weekDays = getWeekDaysOrder(weekStartDay);
    const mealTypes = userMealTypes;

    // Filter recipes based on dietary restrictions and avoided ingredients
    const filterRecipesByDietaryPreferences = (recipeList) => {
        if (!recipeList || recipeList.length === 0) return [];

        return recipeList.filter(recipe => {
            // Check dietary restrictions
            if (userDietaryRestrictions.length > 0) {
                const recipeTags = recipe.tags || [];
                const recipeDietaryTags = recipe.dietaryTags || [];
                const allRecipeTags = [...recipeTags, ...recipeDietaryTags].map(tag => tag.toLowerCase());

                // Check if recipe matches user's dietary restrictions
                const hasRequiredRestrictions = userDietaryRestrictions.every(restriction => {
                    const restrictionLower = restriction.toLowerCase().trim();

                    // Common dietary restriction mappings
                    const restrictionMappings = {
                        'vegetarian': ['vegetarian', 'veggie'],
                        'vegan': ['vegan'],
                        'gluten-free': ['gluten-free', 'glutenfree', 'gluten free'],
                        'dairy-free': ['dairy-free', 'dairyfree', 'dairy free'],
                        'keto': ['keto', 'ketogenic', 'low-carb'],
                        'paleo': ['paleo'],
                        'low-sodium': ['low-sodium', 'low sodium'],
                        'nut-free': ['nut-free', 'nut free', 'no nuts']
                    };

                    const mappedRestrictions = restrictionMappings[restrictionLower] || [restrictionLower];
                    return mappedRestrictions.some(mapped =>
                        allRecipeTags.some(tag => tag.includes(mapped))
                    );
                });

                if (!hasRequiredRestrictions) {
                    return false;
                }
            }

            // Check avoided ingredients
            if (userAvoidIngredients.length > 0) {
                const recipeIngredients = recipe.ingredients || [];
                const recipeTitle = recipe.title?.toLowerCase() || '';
                const recipeDescription = recipe.description?.toLowerCase() || '';

                // Check if recipe contains any avoided ingredients
                const hasAvoidedIngredients = userAvoidIngredients.some(avoidedIngredient => {
                    const avoidedLower = avoidedIngredient.toLowerCase().trim();

                    // Check in recipe title
                    if (recipeTitle.includes(avoidedLower)) return true;

                    // Check in recipe description
                    if (recipeDescription.includes(avoidedLower)) return true;

                    // Check in ingredients list
                    return recipeIngredients.some(ingredient => {
                        const ingredientName = typeof ingredient === 'string'
                            ? ingredient.toLowerCase()
                            : ingredient.name?.toLowerCase() || '';
                        return ingredientName.includes(avoidedLower);
                    });
                });

                if (hasAvoidedIngredients) {
                    return false;
                }
            }

            return true;
        });
    };

    // Check if a meal conflicts with dietary preferences
    const checkMealDietaryConflicts = (meal) => {
        const conflicts = [];

        if (meal.entryType === 'simple' && meal.simpleMeal?.items) {
            // Check simple meal items against avoided ingredients
            meal.simpleMeal.items.forEach(item => {
                const itemName = item.itemName?.toLowerCase() || '';
                userAvoidIngredients.forEach(avoidedIngredient => {
                    const avoidedLower = avoidedIngredient.toLowerCase().trim();
                    if (itemName.includes(avoidedLower)) {
                        conflicts.push(`Contains avoided ingredient: ${avoidedIngredient}`);
                    }
                });
            });
        } else if (meal.entryType === 'recipe') {
            // For recipes, we could check if the recipe should have been filtered out
            // This is more complex and would require the full recipe data
        }

        return conflicts;
    };

    const dismissWeekNotification = () => {
        setShowWeekNotification(false);
        localStorage.setItem('weekSettingsNotificationDismissed', 'true');
    };

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (session?.user) {
            loadUserPreferences();
        }
    }, [session]);

    useEffect(() => {
        const dismissed = localStorage.getItem('weekSettingsNotificationDismissed');
        if (dismissed === 'true') {
            setShowWeekNotification(false);
        }
    }, []);

    // Filter recipes whenever recipes or dietary preferences change
    useEffect(() => {
        if (recipes.length > 0) {
            const filtered = filterRecipesByDietaryPreferences(recipes);
            setFilteredRecipes(filtered);

            // Show warning if many recipes were filtered out
            if (recipes.length > 0 && filtered.length < recipes.length * 0.5) {
                setDietaryWarningMessage(
                    `${recipes.length - filtered.length} of ${recipes.length} recipes were filtered out based on your dietary preferences.`
                );
            }
        }
    }, [recipes, userDietaryRestrictions, userAvoidIngredients]);

    // UPDATED: Migration function for existing users with old meal types
    const migrateOldMealTypes = (mealTypes) => {
        const oldMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        const newMealTypes = ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'];

        // If user has the old format, upgrade to new format
        if (mealTypes && mealTypes.length > 0 && mealTypes.every(type => oldMealTypes.includes(type.toLowerCase()))) {
            console.log('Migrating old meal types to new expanded format');
            return newMealTypes;
        }

        // If empty or undefined, return new default
        if (!mealTypes || mealTypes.length === 0) {
            return newMealTypes;
        }

        // Otherwise, keep existing selection
        return mealTypes;
    };

    const loadUserPreferences = async () => {
        try {
            const response = await fetch('/api/user/preferences');
            const data = await response.json();
            if (data.success && data.preferences) {
                // Set week start day
                if (data.preferences.weekStartDay) {
                    setWeekStartDay(data.preferences.weekStartDay);
                }

                // UPDATED: Set user's preferred meal types with migration
                if (data.preferences.defaultMealTypes && data.preferences.defaultMealTypes.length > 0) {
                    const migratedMealTypes = migrateOldMealTypes(data.preferences.defaultMealTypes);
                    setUserMealTypes(migratedMealTypes);
                    console.log('Loaded user meal types:', migratedMealTypes);
                } else {
                    // UPDATED: New default meal types
                    setUserMealTypes(['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack']);
                }

                // Load dietary restrictions and avoided ingredients
                if (data.preferences.dietaryRestrictions) {
                    setUserDietaryRestrictions(data.preferences.dietaryRestrictions);
                    console.log('Loaded dietary restrictions:', data.preferences.dietaryRestrictions);
                }

                if (data.preferences.avoidIngredients) {
                    setUserAvoidIngredients(data.preferences.avoidIngredients);
                    console.log('Loaded avoided ingredients:', data.preferences.avoidIngredients);
                }
            }
        } catch (error) {
            console.error('Error loading user preferences:', error);
        }
    };

    const updateWeekStartPreference = async (newStartDay) => {
        try {
            const response = await fetch('/api/user/preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    weekStartDay: newStartDay
                })
            });

            const data = await response.json();
            if (data.success) {
                setWeekStartDay(newStartDay);
                setShowWeekSettings(false);
                await fetchMealPlan();
            }
        } catch (error) {
            console.error('Error updating week start preference:', error);
        }
    };

    const updateMealTypePreferences = async (newMealTypes) => {
        try {
            const response = await fetch('/api/user/preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    defaultMealTypes: newMealTypes
                })
            });

            const data = await response.json();
            if (data.success) {
                setUserMealTypes(newMealTypes);
                console.log('Updated user meal types:', newMealTypes);
            }
        } catch (error) {
            console.error('Error updating meal type preferences:', error);
        }
    };

    const getWeekStart = (date) => {
        const d = new Date(date);
        const currentDay = d.getDay();

        const dayNumbers = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6
        };

        const startDayNumber = dayNumbers[weekStartDay];

        let daysToSubtract = currentDay - startDayNumber;
        if (daysToSubtract < 0) {
            daysToSubtract += 7;
        }

        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - daysToSubtract);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    };

    const getFormattedWeekStart = (date) => {
        const weekStart = getWeekStart(date);
        return weekStart.toISOString().split('T')[0];
    };

    const hasMealsPlanned = () => {
        if (!mealPlan?.meals) return false;

        const totalMeals = Object.values(mealPlan.meals).reduce((total, dayMeals) => {
            return total + (Array.isArray(dayMeals) ? dayMeals.length : 0);
        }, 0);

        return totalMeals > 0;
    };

    const fetchMealPlan = async () => {
        const weekStartParam = getFormattedWeekStart(currentWeek);

        try {
            const response = await fetch(`/api/meal-plans?weekStart=${weekStartParam}`);
            const data = await response.json();

            if (data.success && data.mealPlans.length > 0) {
                setMealPlan(data.mealPlans[0]);
            } else {
                await createMealPlan();
            }
        } catch (error) {
            console.error('Error fetching meal plan:', error);
        } finally {
            setLoading(false);
        }
    };

    const createMealPlan = async () => {
        try {
            const weekStart = getWeekStart(currentWeek);

            const mealsObject = {};
            weekDays.forEach(day => {
                mealsObject[day] = [];
            });

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
                    meals: mealsObject,
                    preferences: {
                        mealTypes: userMealTypes,
                        weekStartDay: weekStartDay,
                        // Include dietary preferences in meal plan
                        dietaryRestrictions: userDietaryRestrictions,
                        avoidIngredients: userAvoidIngredients
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

    const handleTemplateApplied = (updatedMealPlan) => {
        console.log('Template applied, updating meal plan:', updatedMealPlan);
        setMealPlan(updatedMealPlan);
    };

    const addMealToSlot = async (day, mealType, recipe) => {
        if (!mealPlan) return;

        const newMeal = {
            entryType: 'recipe',
            recipeId: recipe._id,
            recipeName: recipe.title,
            mealType: mealType,
            servings: recipe.servings || 4,
            notes: '',
            prepTime: recipe.prepTime || 0,
            cookTime: recipe.cookTime || 0,
            createdAt: new Date()
        };

        const updatedMeals = {
            ...mealPlan.meals,
            [day]: [...(mealPlan.meals[day] || []), newMeal]
        };

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

            if (data.success) {
                setMealPlan(prev => ({
                    ...prev,
                    meals: updatedMeals
                }));
            }
        } catch (error) {
            console.error('Error adding meal:', error);
        }

        setShowRecipeModal(false);
        setSelectedSlot(null);
    };

    const addSimpleMealToSlot = async (day, mealType, simpleMealEntry) => {
        if (!mealPlan) return;

        // Check for dietary conflicts before adding
        const conflicts = checkMealDietaryConflicts(simpleMealEntry);
        if (conflicts.length > 0) {
            const confirmAdd = window.confirm(
                `This meal may conflict with your dietary preferences:\n\n${conflicts.join('\n')}\n\nDo you want to add it anyway?`
            );
            if (!confirmAdd) return;
        }

        const updatedMeals = {
            ...mealPlan.meals,
            [day]: [...(mealPlan.meals[day] || []), simpleMealEntry]
        };

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

            if (data.success) {
                setMealPlan(prev => ({
                    ...prev,
                    meals: updatedMeals
                }));
            }
        } catch (error) {
            console.error('Error adding simple meal:', error);
        }

        setShowSimpleMealBuilder(false);
        setSelectedSlot(null);
    };

    const removeMealFromSlot = async (day, mealIndex) => {
        if (!mealPlan) return;

        const updatedMeals = {
            ...mealPlan.meals,
            [day]: mealPlan.meals[day].filter((_, index) => index !== mealIndex)
        };

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

            if (data.success) {
                setMealPlan(prev => ({
                    ...prev,
                    meals: updatedMeals
                }));
            }
        } catch (error) {
            console.error('Error removing meal:', error);
        }
    };

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

    const getFormattedDate = (dayIndex) => {
        const weekStart = getWeekStart(currentWeek);
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    };

    const getDayName = (day) => {
        return day.charAt(0).toUpperCase() + day.slice(1);
    };

    const getMealDisplayName = (meal) => {
        if (meal.entryType === 'simple') {
            return meal.simpleMeal?.name || meal.simpleMeal?.items?.map(item => item.itemName).join(', ') || 'Simple Meal';
        }
        return meal.recipeName || 'Recipe';
    };

    const getMealDisplayDetails = (meal) => {
        if (meal.entryType === 'simple') {
            const time = meal.simpleMeal?.totalEstimatedTime || 30;
            return `${meal.servings || 1} servings • ${time} min`;
        }
        return `${meal.servings} servings • ${meal.prepTime + meal.cookTime} min`;
    };

    // Render meal with dietary conflict warnings
    const renderMealWithWarnings = (meal, mealTypeIndex, day, actualIndex) => {
        const conflicts = checkMealDietaryConflicts(meal);
        const hasConflicts = conflicts.length > 0;

        return (
            <div
                key={`${meal.recipeId || meal.simpleMeal?.name}-${mealTypeIndex}`}
                className={`p-3 border rounded-lg relative ${
                    meal.entryType === 'simple' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                } ${hasConflicts ? 'border-orange-300 bg-orange-50' : ''}`}
            >
                <div className="pr-6">
                    <div className="font-medium text-gray-900 text-sm">
                        {meal.entryType === 'simple' && (
                            <span className="text-green-600 mr-1">🍽️</span>
                        )}
                        {hasConflicts && (
                            <span className="text-orange-600 mr-1" title={conflicts.join(', ')}>⚠️</span>
                        )}
                        {getMealDisplayName(meal)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                        {getMealDisplayDetails(meal)}
                    </div>
                    {meal.entryType === 'simple' && meal.simpleMeal?.description && (
                        <div className="text-xs text-gray-600 mt-1">
                            {meal.simpleMeal.description}
                        </div>
                    )}
                    {hasConflicts && (
                        <div className="text-xs text-orange-600 mt-1">
                            {conflicts[0]}
                        </div>
                    )}
                </div>

                <TouchEnhancedButton
                    onClick={() => removeMealFromSlot(day, actualIndex)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                    title="Remove meal"
                >
                    ×
                </TouchEnhancedButton>
            </div>
        );
    };

    const renderAddMealButtons = (day, mealType) => {
        return (
            <div className="space-y-2">
                <TouchEnhancedButton
                    onClick={() => {
                        setSelectedSlot({day, mealType});
                        setShowRecipeModal(true);
                    }}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-sm"
                >
                    + Add Recipe
                    {filteredRecipes.length < recipes.length && (
                        <span className="block text-xs text-orange-600 mt-1">
                            ({recipes.length - filteredRecipes.length} filtered)
                        </span>
                    )}
                </TouchEnhancedButton>
                <TouchEnhancedButton
                    onClick={() => {
                        setSelectedSlot({day, mealType});
                        setShowSimpleMealBuilder(true);
                    }}
                    className="w-full border-2 border-dashed border-green-300 rounded-lg p-3 text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors text-sm"
                >
                    + Quick Meal
                    <span className="block text-xs text-green-600 mt-1">
                        (from inventory)
                    </span>
                </TouchEnhancedButton>
            </div>
        );
    };

    useEffect(() => {
        if (session?.user && weekStartDay && userMealTypes.length > 0) {
            fetchMealPlan();
            fetchRecipes();
        }
    }, [session, currentWeek, weekStartDay, userMealTypes]);

    const mealsPlanned = hasMealsPlanned();

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

    // UPDATED: Available meal types constant
    const availableMealTypes = ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'];

    // Mobile Layout
    if (isMobile) {
        return (
            <div className="max-w-full mx-auto p-4">
                {/* Mobile Header */}
                <div className="mb-6">
                    <div className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">📅 Meal Planning</h1>
                                <p className="text-gray-600 text-sm mt-1">Plan your meals for the week</p>
                                {/* Show dietary preferences summary */}
                                {(userDietaryRestrictions.length > 0 || userAvoidIngredients.length > 0) && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        {userDietaryRestrictions.length > 0 && (
                                            <span>Diet: {userDietaryRestrictions.join(', ')}</span>
                                        )}
                                        {userDietaryRestrictions.length > 0 && userAvoidIngredients.length > 0 &&
                                            <span> • </span>}
                                        {userAvoidIngredients.length > 0 && (
                                            <span>Avoiding: {userAvoidIngredients.join(', ')}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <TouchEnhancedButton
                                onClick={() => setShowWeekSettings(true)}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Week Settings"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                            </TouchEnhancedButton>
                        </div>

                        {/* Dietary filtering notification */}
                        {dietaryWarningMessage && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <div className="flex items-start">
                                    <span className="text-orange-500 mr-2">⚠️</span>
                                    <div className="text-sm text-orange-700">
                                        {dietaryWarningMessage}
                                        <TouchEnhancedButton
                                            onClick={() => setDietaryWarningMessage('')}
                                            className="ml-2 text-orange-500 hover:text-orange-700"
                                        >
                                            Dismiss
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons - Mobile */}
                        <div className="flex flex-col space-y-3">
                            {mealPlan && (
                                <TemplateLibraryButton
                                    mealPlanId={mealPlan._id}
                                    mealPlanName={mealPlan.name}
                                    onTemplateApplied={handleTemplateApplied}
                                    disabled={false}
                                />
                            )}

                            {mealsPlanned && (
                                <TouchEnhancedButton
                                    onClick={() => setShowShoppingList(true)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-md w-full"
                                    title="Generate shopping list from your meal plan"
                                >
                                    🛒 Shopping List
                                </TouchEnhancedButton>
                            )}

                            {mealPlan && (
                                <MealPrepButton
                                    mealPlanId={mealPlan._id}
                                    mealPlanName={mealPlan.name}
                                    disabled={!mealsPlanned}
                                />
                            )}

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
                        <TouchEnhancedButton
                            onClick={goToPreviousWeek}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                            </svg>
                        </TouchEnhancedButton>

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

                        <TouchEnhancedButton
                            onClick={goToNextWeek}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                            </svg>
                        </TouchEnhancedButton>
                    </div>
                    <TouchEnhancedButton
                        onClick={goToToday}
                        className="px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                        Today
                    </TouchEnhancedButton>
                </div>

                {/* Week Start Notification */}
                {showWeekNotification && (
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                          clipRule="evenodd"/>
                                </svg>
                            </div>
                            <div className="ml-3 flex-1">
                                <h3 className="text-sm font-medium text-blue-800">
                                    💡 Customize Your Week
                                </h3>
                                <div className="mt-1 text-sm text-blue-700">
                                    <p>
                                        Click the <span className="inline-flex items-center mx-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                        </span> settings icon to choose which day starts your week and which meal types to show.
                                    </p>
                                </div>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                                <TouchEnhancedButton
                                    onClick={dismissWeekNotification}
                                    className="bg-blue-50 rounded-md text-blue-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    title="Dismiss notification"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd"
                                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                              clipRule="evenodd"/>
                                    </svg>
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                )}

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
                                        <h4 className="font-medium text-gray-800 mb-2">{mealType}</h4>
                                        <div className="space-y-2">
                                            {/* Existing Meals - with dietary warnings */}
                                            {mealPlan?.meals[day]?.filter(meal => meal.mealType === mealType).map((meal, mealTypeIndex) => {
                                                const actualIndex = mealPlan.meals[day].findIndex(m =>
                                                    m.recipeId === meal.recipeId &&
                                                    m.mealType === meal.mealType &&
                                                    m.createdAt === meal.createdAt
                                                );

                                                return renderMealWithWarnings(meal, mealTypeIndex, day, actualIndex);
                                            })}

                                            {/* Add Meal Buttons */}
                                            {renderAddMealButtons(day, mealType)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Week Settings Modal - UPDATED with new meal types */}
                {showWeekSettings && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Week Settings</h3>
                                <TouchEnhancedButton
                                    onClick={() => setShowWeekSettings(false)}
                                    className="text-gray-400 hover:text-gray-600 text-xl"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Week starts on:
                                    </label>
                                    <div className="space-y-2">
                                        {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                                            <TouchEnhancedButton
                                                key={day}
                                                onClick={() => updateWeekStartPreference(day)}
                                                className={`w-full text-left px-3 py-2 rounded-md border ${
                                                    weekStartDay === day
                                                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                {day.charAt(0).toUpperCase() + day.slice(1)}
                                                {weekStartDay === day && (
                                                    <span className="ml-2 text-indigo-600">✓</span>
                                                )}
                                            </TouchEnhancedButton>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Show meal types:
                                    </label>
                                    <div className="space-y-2">
                                        {/* UPDATED: Use new meal types */}
                                        {availableMealTypes.map(mealType => (
                                            <div key={mealType} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={`meal-type-${mealType.toLowerCase().replace(' ', '-')}`}
                                                    checked={userMealTypes.includes(mealType)}
                                                    onChange={(e) => {
                                                        const updatedMealTypes = e.target.checked
                                                            ? [...userMealTypes, mealType]
                                                            : userMealTypes.filter(m => m !== mealType);

                                                        if (updatedMealTypes.length > 0) {
                                                            updateMealTypePreferences(updatedMealTypes);
                                                        }
                                                    }}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                />
                                                <label
                                                    htmlFor={`meal-type-${mealType.toLowerCase().replace(' ', '-')}`}
                                                    className="ml-3 text-sm text-gray-700"
                                                >
                                                    {mealType}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Select which meal types you want to see in your calendar. You must have at least
                                        one selected.
                                    </p>
                                </div>

                                {/* Show current dietary preferences */}
                                {(userDietaryRestrictions.length > 0 || userAvoidIngredients.length > 0) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Current dietary preferences:
                                        </label>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            {userDietaryRestrictions.length > 0 && (
                                                <div>
                                                    <span
                                                        className="font-medium">Diet:</span> {userDietaryRestrictions.join(', ')}
                                                </div>
                                            )}
                                            {userAvoidIngredients.length > 0 && (
                                                <div>
                                                    <span
                                                        className="font-medium">Avoiding:</span> {userAvoidIngredients.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            To change these, go to Profile → Meal Planning
                                        </p>
                                    </div>
                                )}

                                <div className="text-xs text-gray-500">
                                    These settings will apply to all your meal plans and will update the calendar
                                    layout.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Recipe Selection Modal - uses filtered recipes */}
                {showRecipeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-hidden">
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Add Recipe
                                        to {selectedSlot && getDayName(selectedSlot.day)} {selectedSlot?.mealType}
                                    </h3>
                                    <TouchEnhancedButton
                                        onClick={() => {
                                            setShowRecipeModal(false);
                                            setSelectedSlot(null);
                                        }}
                                        className="text-gray-400 hover:text-gray-600 text-xl"
                                    >
                                        ×
                                    </TouchEnhancedButton>
                                </div>
                                {/* Show filtering info */}
                                {filteredRecipes.length < recipes.length && (
                                    <div className="mt-2 text-sm text-orange-600">
                                        Showing {filteredRecipes.length} of {recipes.length} recipes (filtered by
                                        dietary preferences)
                                    </div>
                                )}
                            </div>

                            <div className="p-4 max-h-80 overflow-y-auto">
                                {filteredRecipes.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">
                                            {recipes.length === 0
                                                ? "No recipes found. Add some recipes first!"
                                                : "No recipes match your dietary preferences. Try adjusting your filters in Profile → Meal Planning."}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredRecipes.map(recipe => (
                                            <TouchEnhancedButton
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
                                            </TouchEnhancedButton>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Simple Meal Builder Modal - Pass dietary preferences */}
                {showSimpleMealBuilder && (
                    <SimpleMealBuilder
                        isOpen={showSimpleMealBuilder}
                        onClose={() => {
                            setShowSimpleMealBuilder(false);
                            setSelectedSlot(null);
                        }}
                        onSave={addSimpleMealToSlot}
                        selectedSlot={selectedSlot}
                        userDietaryRestrictions={userDietaryRestrictions}
                        userAvoidIngredients={userAvoidIngredients}
                    />
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
                            <p className="text-gray-600">Start by using a template, adding recipes, or creating quick
                                meals.</p>
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
                        {/* Show dietary preferences summary on desktop */}
                        {(userDietaryRestrictions.length > 0 || userAvoidIngredients.length > 0) && (
                            <div className="text-sm text-gray-500 mt-1">
                                {userDietaryRestrictions.length > 0 && (
                                    <span>Diet: {userDietaryRestrictions.join(', ')}</span>
                                )}
                                {userDietaryRestrictions.length > 0 && userAvoidIngredients.length > 0 &&
                                    <span> • </span>}
                                {userAvoidIngredients.length > 0 && (
                                    <span>Avoiding: {userAvoidIngredients.join(', ')}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons - Desktop */}
                    <div className="flex items-center space-x-3">
                        <div className="text-sm text-gray-500">
                            Meals: {mealsPlanned ? 'Yes' : 'No'}
                        </div>

                        <TouchEnhancedButton
                            onClick={() => setShowWeekSettings(true)}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Week Settings"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                        </TouchEnhancedButton>

                        {mealPlan && (
                            <TemplateLibraryButton
                                mealPlanId={mealPlan._id}
                                mealPlanName={mealPlan.name}
                                onTemplateApplied={handleTemplateApplied}
                                disabled={false}
                            />
                        )}

                        {mealsPlanned && (
                            <TouchEnhancedButton
                                onClick={() => setShowShoppingList(true)}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-md"
                                title="Generate shopping list from your meal plan"
                            >
                                🛒 Shopping List
                            </TouchEnhancedButton>
                        )}

                        {mealPlan && (
                            <MealPrepButton
                                mealPlanId={mealPlan._id}
                                mealPlanName={mealPlan.name}
                                disabled={!mealsPlanned}
                            />
                        )}

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
                        <TouchEnhancedButton
                            onClick={goToPreviousWeek}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M15 19l-7-7 7-7"/>
                            </svg>
                        </TouchEnhancedButton>

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

                        <TouchEnhancedButton
                            onClick={goToNextWeek}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M9 5l7 7-7 7"/>
                            </svg>
                        </TouchEnhancedButton>
                    </div>

                    <TouchEnhancedButton
                        onClick={goToToday}
                        className="px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                        Today
                    </TouchEnhancedButton>
                </div>
            </div>

            {/* Dietary filtering notification for desktop */}
            {dietaryWarningMessage && (
                <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <span className="text-orange-500 mr-2">⚠️</span>
                        <div className="text-sm text-orange-700 flex-1">
                            {dietaryWarningMessage}
                        </div>
                        <TouchEnhancedButton
                            onClick={() => setDietaryWarningMessage('')}
                            className="ml-2 text-orange-500 hover:text-orange-700"
                        >
                            Dismiss
                        </TouchEnhancedButton>
                    </div>
                </div>
            )}

            {/* Week Start Notification */}
            {showWeekNotification && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                      clipRule="evenodd"/>
                            </svg>
                        </div>
                        <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-blue-800">
                                💡 Customize Your Week
                            </h3>
                            <div className="mt-1 text-sm text-blue-700">
                                <p>
                                    Click the <span className="inline-flex items-center mx-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                        </span> settings icon to choose which day starts your week and which meal types to show.
                                </p>
                            </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                            <TouchEnhancedButton
                                onClick={dismissWeekNotification}
                                className="bg-blue-50 rounded-md text-blue-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Dismiss notification"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                          clipRule="evenodd"/>
                                </svg>
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            )}

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
                            <h3 className="font-medium text-gray-900">{mealType}</h3>
                        </div>

                        {/* Day Columns */}
                        <div className="grid grid-cols-7">
                            {weekDays.map(day => (
                                <div key={`${day}-${mealType}`}
                                     className="p-3 border-r border-gray-200 last:border-r-0 min-h-24">
                                    <div className="space-y-2">
                                        {/* Existing Meals - with dietary warnings */}
                                        {mealPlan?.meals[day]?.filter(meal => meal.mealType === mealType).map((meal, mealTypeIndex) => {
                                            const actualIndex = mealPlan.meals[day].findIndex(m =>
                                                m.recipeId === meal.recipeId &&
                                                m.mealType === meal.mealType &&
                                                m.createdAt === meal.createdAt
                                            );

                                            return renderMealWithWarnings(meal, mealTypeIndex, day, actualIndex);
                                        })}

                                        {/* Add Meal Buttons */}
                                        {renderAddMealButtons(day, mealType)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Week Settings Modal - Same as mobile but UPDATED with new meal types */}
            {showWeekSettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Week Settings</h3>
                            <TouchEnhancedButton
                                onClick={() => setShowWeekSettings(false)}
                                className="text-gray-400 hover:text-gray-600 text-xl"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Week starts on:
                                </label>
                                <div className="space-y-2">
                                    {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                                        <TouchEnhancedButton
                                            key={day}
                                            onClick={() => updateWeekStartPreference(day)}
                                            className={`w-full text-left px-3 py-2 rounded-md border ${
                                                weekStartDay === day
                                                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            {day.charAt(0).toUpperCase() + day.slice(1)}
                                            {weekStartDay === day && (
                                                <span className="ml-2 text-indigo-600">✓</span>
                                            )}
                                        </TouchEnhancedButton>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Show meal types:
                                </label>
                                <div className="space-y-2">
                                    {/* UPDATED: Use new meal types */}
                                    {availableMealTypes.map(mealType => (
                                        <div key={mealType} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`meal-type-${mealType.toLowerCase().replace(' ', '-')}`}
                                                checked={userMealTypes.includes(mealType)}
                                                onChange={(e) => {
                                                    const updatedMealTypes = e.target.checked
                                                        ? [...userMealTypes, mealType]
                                                        : userMealTypes.filter(m => m !== mealType);

                                                    if (updatedMealTypes.length > 0) {
                                                        updateMealTypePreferences(updatedMealTypes);
                                                    }
                                                }}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            />
                                            <label
                                                htmlFor={`meal-type-${mealType.toLowerCase().replace(' ', '-')}`}
                                                className="ml-3 text-sm text-gray-700"
                                            >
                                                {mealType}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Select which meal types you want to see in your calendar. You must have at least one
                                    selected.
                                </p>
                            </div>

                            {/* Show current dietary preferences */}
                            {(userDietaryRestrictions.length > 0 || userAvoidIngredients.length > 0) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Current dietary preferences:
                                    </label>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        {userDietaryRestrictions.length > 0 && (
                                            <div>
                                                <span
                                                    className="font-medium">Diet:</span> {userDietaryRestrictions.join(', ')}
                                            </div>
                                        )}
                                        {userAvoidIngredients.length > 0 && (
                                            <div>
                                                <span
                                                    className="font-medium">Avoiding:</span> {userAvoidIngredients.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        To change these, go to Profile → Meal Planning
                                    </p>
                                </div>
                            )}

                            <div className="text-xs text-gray-500">
                                These settings will apply to all your meal plans and will update the calendar layout.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Recipe Selection Modal - uses filtered recipes */}
            {showRecipeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Select Recipe
                                    for {selectedSlot && getDayName(selectedSlot.day)} {selectedSlot?.mealType}
                                </h3>
                                <TouchEnhancedButton
                                    onClick={() => {
                                        setShowRecipeModal(false);
                                        setSelectedSlot(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 text-xl"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>
                            {/* Show filtering info */}
                            {filteredRecipes.length < recipes.length && (
                                <div className="mt-2 text-sm text-orange-600">
                                    Showing {filteredRecipes.length} of {recipes.length} recipes (filtered by dietary
                                    preferences)
                                </div>
                            )}
                        </div>

                        <div className="p-4 max-h-80 overflow-y-auto">
                            {filteredRecipes.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">
                                        {recipes.length === 0
                                            ? "No recipes found. Add some recipes first!"
                                            : "No recipes match your dietary preferences. Try adjusting your filters in Profile → Meal Planning."}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredRecipes.map(recipe => (
                                        <TouchEnhancedButton
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
                                        </TouchEnhancedButton>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Simple Meal Builder Modal - Desktop */}
            {showSimpleMealBuilder && (
                <SimpleMealBuilder
                    isOpen={showSimpleMealBuilder}
                    onClose={() => {
                        setShowSimpleMealBuilder(false);
                        setSelectedSlot(null);
                    }}
                    onSave={addSimpleMealToSlot}
                    selectedSlot={selectedSlot}
                    userDietaryRestrictions={userDietaryRestrictions}
                    userAvoidIngredients={userAvoidIngredients}
                />
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
                        <p className="text-gray-600">Start by using a template, adding recipes, or creating quick
                            meals.</p>
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