'use client';
// file: /src/components/meal-planning/PriceAwareMealPlanningCalendar.js v1 - Enhanced meal planning with price intelligence

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';
import { apiGet, apiPost, apiPut } from '@/lib/api-config';
import { useSafeSession } from '@/hooks/useSafeSession';
import MealCompletionModal from './MealCompletionModal';
import SimpleMealBuilder from './SimpleMealBuilder';
import ShoppingListGenerator from './ShoppingListGenerator';

export default function PriceAwareMealPlanningCalendar() {
    const { data: session } = useSafeSession();
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [mealPlan, setMealPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Price Intelligence State
    const [priceData, setPriceData] = useState({});
    const [budgetInfo, setBudgetInfo] = useState({
        weeklyBudget: 0,
        currentCost: 0,
        projectedCost: 0,
        savingsOpportunities: []
    });
    const [dealOpportunities, setDealOpportunities] = useState([]);
    const [priceAlerts, setPriceAlerts] = useState([]);

    // Modal States
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [showSimpleMealBuilder, setShowSimpleMealBuilder] = useState(false);
    const [showShoppingListGenerator, setShowShoppingListGenerator] = useState(false);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [showPriceInsights, setShowPriceInsights] = useState(false);

    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedMeal, setSelectedMeal] = useState(null);
    const [inventory, setInventory] = useState([]);

    const MEAL_TYPES = ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'];
    const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    useEffect(() => {
        if (session?.user?.id) {
            loadMealPlan();
            loadInventory();
            loadPriceIntelligence();
        }
    }, [currentWeek, session?.user?.id]);

    const loadMealPlan = async () => {
        try {
            setLoading(true);
            const weekStart = getWeekStart(currentWeek);
            const response = await apiGet(`/api/meal-plans?weekStart=${weekStart.toISOString()}`);
            const data = await response.json();

            if (data.success && data.mealPlans.length > 0) {
                setMealPlan(data.mealPlans[0]);
                calculateMealPlanCosts(data.mealPlans[0]);
            } else {
                await createNewMealPlan(weekStart);
            }
        } catch (error) {
            console.error('Error loading meal plan:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadInventory = async () => {
        try {
            const response = await apiGet('/api/inventory');
            const data = await response.json();
            if (data.success) {
                setInventory(data.inventory?.items || []);
            }
        } catch (error) {
            console.error('Error loading inventory:', error);
        }
    };

    const loadPriceIntelligence = async () => {
        try {
            // Load current deals and price alerts
            const [dealsResponse, alertsResponse] = await Promise.all([
                apiGet('/api/price-tracking/deals?limit=20'),
                apiGet('/api/price-tracking/alerts')
            ]);

            const dealsData = await dealsResponse.json();
            const alertsData = await alertsResponse.json();

            if (dealsData.success) {
                setDealOpportunities(dealsData.deals || []);
            }

            if (alertsData.success) {
                setPriceAlerts(alertsData.alerts?.filter(alert => alert.triggered) || []);
            }
        } catch (error) {
            console.error('Error loading price intelligence:', error);
        }
    };

    const calculateMealPlanCosts = async (plan) => {
        if (!plan?.meals) return;

        try {
            // Get all recipes used in the meal plan
            const recipeIds = [];
            Object.values(plan.meals).forEach(dayMeals => {
                dayMeals.forEach(meal => {
                    if (meal.recipeId && !recipeIds.includes(meal.recipeId)) {
                        recipeIds.push(meal.recipeId);
                    }
                });
            });

            if (recipeIds.length === 0) return;

            // Calculate costs for each recipe/meal
            const costPromises = recipeIds.map(async (recipeId) => {
                try {
                    const response = await apiPost('/api/meal-planning/calculate-cost', {
                        recipeId,
                        servings: 4 // Default serving size
                    });
                    const data = await response.json();
                    return data.success ? { recipeId, cost: data.cost } : null;
                } catch (error) {
                    console.error(`Error calculating cost for recipe ${recipeId}:`, error);
                    return null;
                }
            });

            const costs = await Promise.all(costPromises);
            const validCosts = costs.filter(Boolean);

            // Calculate total weekly cost
            let totalCost = 0;
            const mealCosts = {};

            Object.entries(plan.meals).forEach(([day, dayMeals]) => {
                dayMeals.forEach(meal => {
                    if (meal.recipeId) {
                        const costData = validCosts.find(c => c.recipeId === meal.recipeId);
                        if (costData) {
                            const mealCost = (costData.cost * (meal.servings || 1)) / 4; // Adjust for servings
                            totalCost += mealCost;
                            mealCosts[`${day}-${meal.mealType}-${meal.recipeId}`] = mealCost;
                        }
                    }
                });
            });

            setPriceData(mealCosts);
            setBudgetInfo(prev => ({
                ...prev,
                currentCost: totalCost,
                projectedCost: totalCost
            }));

        } catch (error) {
            console.error('Error calculating meal plan costs:', error);
        }
    };

    const createNewMealPlan = async (weekStart) => {
        try {
            const response = await apiPost('/api/meal-plans', {
                name: `Meal Plan - ${weekStart.toLocaleDateString()}`,
                description: 'Weekly meal plan with price optimization',
                weekStartDate: weekStart.toISOString(),
                preferences: {
                    defaultServings: 4,
                    mealTypes: MEAL_TYPES,
                    budgetOptimized: true,
                    useInventoryFirst: true
                }
            });

            const data = await response.json();
            if (data.success) {
                setMealPlan(data.mealPlan);
            }
        } catch (error) {
            console.error('Error creating meal plan:', error);
        }
    };

    const getWeekStart = (date) => {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day;
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        return start;
    };

    const getDayMeals = (day, mealType) => {
        if (!mealPlan?.meals?.[day.toLowerCase()]) return [];
        return mealPlan.meals[day.toLowerCase()].filter(meal => meal.mealType === mealType);
    };

    const addMealToSlot = async (day, mealType, meal) => {
        try {
            setSaving(true);
            const updatedMeals = { ...mealPlan.meals };
            const dayKey = day.toLowerCase();

            if (!updatedMeals[dayKey]) {
                updatedMeals[dayKey] = [];
            }

            updatedMeals[dayKey].push(meal);

            const response = await apiPut(`/api/meal-plans/${mealPlan._id}`, {
                meals: updatedMeals
            });

            const data = await response.json();
            if (data.success) {
                setMealPlan(data.mealPlan);
                calculateMealPlanCosts(data.mealPlan);
                MobileHaptics?.success();
            }
        } catch (error) {
            console.error('Error adding meal:', error);
            MobileHaptics?.error();
        } finally {
            setSaving(false);
        }
    };

    const removeMealFromSlot = async (day, mealType, mealIndex) => {
        try {
            setSaving(true);
            const updatedMeals = { ...mealPlan.meals };
            const dayKey = day.toLowerCase();

            if (updatedMeals[dayKey]) {
                const dayMeals = updatedMeals[dayKey];
                const mealsOfType = dayMeals.filter(meal => meal.mealType === mealType);

                if (mealIndex < mealsOfType.length) {
                    const mealToRemove = mealsOfType[mealIndex];
                    const overallIndex = dayMeals.indexOf(mealToRemove);
                    updatedMeals[dayKey].splice(overallIndex, 1);
                }
            }

            const response = await apiPut(`/api/meal-plans/${mealPlan._id}`, {
                meals: updatedMeals
            });

            const data = await response.json();
            if (data.success) {
                setMealPlan(data.mealPlan);
                calculateMealPlanCosts(data.mealPlan);
                MobileHaptics?.success();
            }
        } catch (error) {
            console.error('Error removing meal:', error);
            MobileHaptics?.error();
        } finally {
            setSaving(false);
        }
    };

    const handleSlotClick = (day, mealType) => {
        setSelectedSlot({ day, mealType });
        setShowSimpleMealBuilder(true);
        MobileHaptics?.light();
    };

    const handleMealClick = (day, mealType, meal, index) => {
        setSelectedMeal(meal);
        setSelectedSlot({ day, mealType, index });
        setShowCompletionModal(true);
        MobileHaptics?.light();
    };

    const navigateWeek = (direction) => {
        const newWeek = new Date(currentWeek);
        newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
        setCurrentWeek(newWeek);
        MobileHaptics?.light();
    };

    const generateSmartSuggestions = async () => {
        try {
            const response = await apiPost('/api/meal-planning/smart-suggestions', {
                mealPlanId: mealPlan._id,
                inventory: inventory,
                dealOpportunities: dealOpportunities,
                budget: budgetInfo.weeklyBudget,
                preferences: {
                    prioritizeSavings: true,
                    useInventoryFirst: true,
                    maxCostPerMeal: budgetInfo.weeklyBudget / 21 // 3 meals * 7 days
                }
            });

            const data = await response.json();
            if (data.success) {
                // Handle smart suggestions
                alert(`Found ${data.suggestions.length} money-saving meal suggestions!`);
            }
        } catch (error) {
            console.error('Error generating smart suggestions:', error);
        }
    };

    const formatPrice = (price) => {
        return typeof price === 'number' ? `$${price.toFixed(2)}` : '$0.00';
    };

    const getMealCostIndicator = (day, mealType, recipeId) => {
        const costKey = `${day.toLowerCase()}-${mealType}-${recipeId}`;
        const cost = priceData[costKey];

        if (!cost) return null;

        const avgCostPerMeal = budgetInfo.weeklyBudget / 21; // Rough estimate
        let colorClass = 'text-green-600';
        let indicator = '💰';

        if (cost > avgCostPerMeal * 1.5) {
            colorClass = 'text-red-600';
            indicator = '💸';
        } else if (cost > avgCostPerMeal) {
            colorClass = 'text-yellow-600';
            indicator = '💵';
        }

        return (
            <div className={`text-xs ${colorClass} font-semibold`}>
                {indicator} {formatPrice(cost)}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading your meal plan...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            {/* Enhanced Header with Price Intelligence */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-2xl font-bold text-gray-900">💰 Smart Meal Planning</h1>

                        {/* Price Intelligence Toggle */}
                        <TouchEnhancedButton
                            onClick={() => setShowPriceInsights(!showPriceInsights)}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                                showPriceInsights
                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                            }`}
                        >
                            {showPriceInsights ? '💡 Insights On' : '💡 Show Insights'}
                        </TouchEnhancedButton>
                    </div>

                    <div className="flex items-center space-x-2">
                        <TouchEnhancedButton
                            onClick={() => navigateWeek('prev')}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                        >
                            ←
                        </TouchEnhancedButton>
                        <div className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
                            {getWeekStart(currentWeek).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </div>
                        <TouchEnhancedButton
                            onClick={() => navigateWeek('next')}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                        >
                            →
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Budget Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="text-sm font-medium text-blue-900">Weekly Budget</div>
                        <div className="text-xl font-bold text-blue-600">
                            {formatPrice(budgetInfo.weeklyBudget)}
                        </div>
                        <TouchEnhancedButton
                            onClick={() => setShowBudgetModal(true)}
                            className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                        >
                            {budgetInfo.weeklyBudget === 0 ? 'Set Budget' : 'Edit'}
                        </TouchEnhancedButton>
                    </div>

                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="text-sm font-medium text-green-900">Current Cost</div>
                        <div className="text-xl font-bold text-green-600">
                            {formatPrice(budgetInfo.currentCost)}
                        </div>
                        <div className="text-xs text-green-700">
                            {budgetInfo.weeklyBudget > 0 && (
                                `${((budgetInfo.currentCost / budgetInfo.weeklyBudget) * 100).toFixed(1)}% used`
                            )}
                        </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                        <div className="text-sm font-medium text-purple-900">Deals Available</div>
                        <div className="text-xl font-bold text-purple-600">
                            {dealOpportunities.length}
                        </div>
                        <TouchEnhancedButton
                            onClick={generateSmartSuggestions}
                            className="text-xs text-purple-600 hover:text-purple-700 mt-1"
                        >
                            Apply Deals
                        </TouchEnhancedButton>
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                        <div className="text-sm font-medium text-yellow-900">Price Alerts</div>
                        <div className="text-xl font-bold text-yellow-600">
                            {priceAlerts.length}
                        </div>
                        <div className="text-xs text-yellow-700">
                            {priceAlerts.length > 0 ? 'Items on sale!' : 'All good'}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                    <TouchEnhancedButton
                        onClick={() => setShowShoppingListGenerator(true)}
                        disabled={!mealPlan}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-medium"
                    >
                        🛒 Smart Shopping List
                    </TouchEnhancedButton>

                    <TouchEnhancedButton
                        onClick={generateSmartSuggestions}
                        disabled={!mealPlan}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
                    >
                        💡 Money-Saving Suggestions
                    </TouchEnhancedButton>

                    <TouchEnhancedButton
                        onClick={() => {/* Open price optimization modal */}}
                        disabled={!mealPlan}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium"
                    >
                        📊 Price Analysis
                    </TouchEnhancedButton>
                </div>
            </div>

            {/* Price Insights Panel */}
            {showPriceInsights && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4 mb-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">💡 Smart Insights</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Inventory Opportunities */}
                        <div className="bg-white rounded-lg p-3 border border-green-300">
                            <h4 className="font-medium text-green-900 mb-2">📦 Use Your Inventory</h4>
                            <div className="text-sm text-green-800">
                                You have {inventory.length} items that could be used in meals this week
                            </div>
                            <TouchEnhancedButton
                                onClick={() => {/* Suggest inventory-based meals */}}
                                className="text-xs text-green-600 hover:text-green-700 mt-2"
                            >
                                See Suggestions →
                            </TouchEnhancedButton>
                        </div>

                        {/* Current Deals */}
                        <div className="bg-white rounded-lg p-3 border border-green-300">
                            <h4 className="font-medium text-green-900 mb-2">🎯 Best Deals Today</h4>
                            <div className="text-sm text-green-800">
                                {dealOpportunities.length > 0 ? (
                                    <>
                                        {dealOpportunities.slice(0, 2).map((deal, index) => (
                                            <div key={index} className="mb-1">
                                                {deal.itemName} - {deal.savingsPercent}% off
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    'No special deals detected right now'
                                )}
                            </div>
                        </div>

                        {/* Budget Status */}
                        <div className="bg-white rounded-lg p-3 border border-green-300">
                            <h4 className="font-medium text-green-900 mb-2">💰 Budget Status</h4>
                            <div className="text-sm text-green-800">
                                {budgetInfo.weeklyBudget > 0 ? (
                                    budgetInfo.currentCost < budgetInfo.weeklyBudget ? (
                                        `Under budget by ${formatPrice(budgetInfo.weeklyBudget - budgetInfo.currentCost)}`
                                    ) : (
                                        `Over budget by ${formatPrice(budgetInfo.currentCost - budgetInfo.weeklyBudget)}`
                                    )
                                ) : (
                                    'Set a weekly budget to track spending'
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Calendar Grid */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Days Header */}
                <div className="grid grid-cols-7 border-b border-gray-200">
                    {DAYS_OF_WEEK.map(day => (
                        <div key={day} className="p-3 bg-gray-50 border-r border-gray-200 last:border-r-0">
                            <div className="font-semibold text-gray-900 text-center">{day}</div>
                        </div>
                    ))}
                </div>

                {/* Meal Types Rows */}
                {MEAL_TYPES.map(mealType => (
                    <div key={mealType} className="border-b border-gray-200 last:border-b-0">
                        {/* Meal Type Header */}
                        <div className="bg-gray-50 px-4 py-2 border-r border-gray-200 font-medium text-gray-700 text-sm">
                            {mealType}
                        </div>

                        {/* Day Slots */}
                        <div className="grid grid-cols-7">
                            {DAYS_OF_WEEK.map(day => {
                                const dayMeals = getDayMeals(day, mealType);

                                return (
                                    <div
                                        key={`${day}-${mealType}`}
                                        className="border-r border-gray-200 last:border-r-0 min-h-[120px] p-2"
                                    >
                                        {dayMeals.length > 0 ? (
                                            <div className="space-y-2">
                                                {dayMeals.map((meal, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => handleMealClick(day, mealType, meal, index)}
                                                        className="bg-blue-50 border border-blue-200 rounded-lg p-2 cursor-pointer hover:bg-blue-100 transition-colors"
                                                    >
                                                        <div className="text-sm font-medium text-blue-900 mb-1">
                                                            {meal.recipeName || meal.simpleMeal?.name}
                                                        </div>

                                                        {/* Enhanced with Price Information */}
                                                        {meal.recipeId && getMealCostIndicator(day, mealType, meal.recipeId)}

                                                        {meal.servings && (
                                                            <div className="text-xs text-blue-700">
                                                                Serves {meal.servings}
                                                            </div>
                                                        )}

                                                        {meal.completed && (
                                                            <div className="text-xs text-green-600 font-semibold">
                                                                ✅ Completed
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <TouchEnhancedButton
                                                onClick={() => handleSlotClick(day, mealType)}
                                                className="w-full h-full min-h-[100px] border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center text-gray-500 hover:text-indigo-600"
                                            >
                                                <div className="text-center">
                                                    <div className="text-2xl mb-1">+</div>
                                                    <div className="text-xs">Add Meal</div>
                                                </div>
                                            </TouchEnhancedButton>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modals */}
            {showCompletionModal && selectedMeal && selectedSlot && (
                <MealCompletionModal
                    isOpen={showCompletionModal}
                    onClose={() => setShowCompletionModal(false)}
                    onComplete={async (completionData) => {
                        // Handle meal completion with inventory consumption
                        console.log('Meal completed:', completionData);
                        setShowCompletionModal(false);
                        loadMealPlan(); // Refresh
                    }}
                    meal={selectedMeal}
                    selectedSlot={selectedSlot}
                    inventory={inventory}
                />
            )}

            {showSimpleMealBuilder && selectedSlot && (
                <SimpleMealBuilder
                    isOpen={showSimpleMealBuilder}
                    onClose={() => setShowSimpleMealBuilder(false)}
                    onSave={addMealToSlot}
                    selectedSlot={selectedSlot}
                />
            )}

            {showShoppingListGenerator && mealPlan && (
                <ShoppingListGenerator
                    mealPlanId={mealPlan._id}
                    mealPlanName={mealPlan.name}
                    onClose={() => setShowShoppingListGenerator(false)}
                />
            )}

            {/* Budget Setting Modal */}
            {showBudgetModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Set Weekly Budget</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Weekly Meal Budget
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={budgetInfo.weeklyBudget}
                                    onChange={(e) => setBudgetInfo(prev => ({
                                        ...prev,
                                        weeklyBudget: parseFloat(e.target.value) || 0
                                    }))}
                                    className="pl-8 w-full border border-gray-300 rounded-lg px-3 py-2"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                This helps track spending and find cost-effective meal options
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <TouchEnhancedButton
                                onClick={() => setShowBudgetModal(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            >
                                Cancel
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => {
                                    setShowBudgetModal(false);
                                    MobileHaptics?.success();
                                }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Save Budget
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {saving && (
                <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40">
                    <div className="bg-white rounded-lg p-4 shadow-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                        <div className="text-gray-600">Saving...</div>
                    </div>
                </div>
            )}
        </div>
    );
}