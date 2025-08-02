'use client';
// file: /src/components/meal-planning/MealPlanningCalendar.js v17 - Fixed button layout and mobile responsiveness

import {useState, useEffect} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import ShoppingListGenerator from '@/components/meal-planning/ShoppingListGenerator';
import MealPrepButton from '@/components/meal-planning/MealPrepButton';
import NutritionAnalysisButton from '@/components/nutrition/NutritionAnalysisButton';
import TemplateLibraryButton from '@/components/meal-planning/TemplateLibraryButton';
import SimpleMealBuilder from '@/components/meal-planning/SimpleMealBuilder';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MealCompletionModal from '@/components/meal-planning/MealCompletionModal';
import {apiGet, apiPost, apiPut} from '@/lib/api-config';
import SmartSuggestionsModal from '@/components/meal-planning/SmartSuggestionsModal';
import {VoiceInput} from '@/components/mobile/VoiceInput';
import KeyboardOptimizedInput from '@/components/forms/KeyboardOptimizedInput';

export default function MealPlanningCalendar() {
    const {data: session} = useSafeSession();
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
    const [userMealTypes, setUserMealTypes] = useState(['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack']);
    const [showWeekSettings, setShowWeekSettings] = useState(false);
    const [showWeekNotification, setShowWeekNotification] = useState(true);

    // User dietary preferences
    const [userDietaryRestrictions, setUserDietaryRestrictions] = useState([]);
    const [userAvoidIngredients, setUserAvoidIngredients] = useState([]);
    const [dietaryWarningMessage, setDietaryWarningMessage] = useState('');
    const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
    const [selectedRecipeCategory, setSelectedRecipeCategory] = useState('all');
    const [showMealCompletion, setShowMealCompletion] = useState(false);
    const [selectedMealForCompletion, setSelectedMealForCompletion] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [mealDropdowns, setMealDropdowns] = useState({});

    // 💰 NEW: Price Intelligence State
    const [priceIntelligence, setPriceIntelligence] = useState({
        enabled: true,
        showInsights: false,
        weeklyBudget: 0,
        currentCost: 0,
        projectedCost: 0,
        savingsOpportunities: [],
        dealOpportunities: [],
        priceAlerts: []
    });
    const [mealCosts, setMealCosts] = useState({});
    const [dealNotifications, setDealNotifications] = useState([]);
    const [showPriceSettings, setShowPriceSettings] = useState(false);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
    const [smartSuggestions, setSmartSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    // NEW: Voice Input State for Meal Planning
    const [showVoiceMealPlanning, setShowVoiceMealPlanning] = useState(false);
    const [processingVoiceMeal, setProcessingVoiceMeal] = useState(false);
    const [voiceMealResults, setVoiceMealResults] = useState('');

    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-orange-500' : 'bg-blue-500';

        toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full opacity-0`;
        toast.innerHTML = `
        <div class="flex items-center space-x-2">
            <span>${message}</span>
        </div>
    `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    };

    const RECIPE_CATEGORIES = [
        {id: 'entree', name: 'Entrees', icon: '🍖'},
        {id: 'side', name: 'Sides', icon: '🥗'},
        {id: 'appetizer', name: 'Appetizers', icon: '🥨'},
        {id: 'dessert', name: 'Desserts', icon: '🍰'},
        {id: 'soup', name: 'Soups', icon: '🍲'},
        {id: 'salad', name: 'Salads', icon: '🥬'},
        {id: 'breakfast', name: 'Breakfast', icon: '🥞'},
        {id: 'snack', name: 'Snacks', icon: '🍿'}
    ];

    // 💰 NEW: Price Intelligence Functions
    const loadPriceIntelligence = async () => {
        if (!session?.user?.id) return;

        try {
            const [dealsResponse, alertsResponse, budgetResponse] = await Promise.all([
                apiGet('/api/price-tracking/deals?limit=20'),
                apiGet('/api/price-tracking/alerts'),
                apiGet('/api/user/budget')
            ]);

            const [dealsData, alertsData, budgetData] = await Promise.all([
                dealsResponse.json(),
                alertsResponse.json(),
                budgetResponse.json()
            ]);

            if (dealsData.success) {
                setPriceIntelligence(prev => ({
                    ...prev,
                    dealOpportunities: dealsData.deals || []
                }));
            }

            if (alertsData.success) {
                setPriceIntelligence(prev => ({
                    ...prev,
                    priceAlerts: alertsData.alerts?.filter(alert => alert.triggered) || []
                }));
            }

            if (budgetData.success && budgetData.budget) {
                setPriceIntelligence(prev => ({
                    ...prev,
                    weeklyBudget: budgetData.budget.weeklyMealBudget || 0
                }));
            }
        } catch (error) {
            console.error('Error loading price intelligence:', error);
        }
    };

    const calculateMealPlanCosts = async (plan) => {
        if (!plan?.meals || !priceIntelligence.enabled) return;

        try {
            const recipeIds = [];
            Object.values(plan.meals).forEach(dayMeals => {
                dayMeals.forEach(meal => {
                    if (meal.recipeId && !recipeIds.includes(meal.recipeId)) {
                        recipeIds.push(meal.recipeId);
                    }
                });
            });

            if (recipeIds.length === 0) return;

            const costPromises = recipeIds.map(async (recipeId) => {
                try {
                    const response = await apiPost('/api/meal-planning/calculate-cost', {
                        recipeId,
                        servings: 4
                    });
                    const data = await response.json();
                    return data.success ? {recipeId, cost: data.cost, breakdown: data.breakdown} : null;
                } catch (error) {
                    console.error(`Error calculating cost for recipe ${recipeId}:`, error);
                    return null;
                }
            });

            const costs = await Promise.all(costPromises);
            const validCosts = costs.filter(Boolean);

            let totalCost = 0;
            const costMap = {};

            Object.entries(plan.meals).forEach(([day, dayMeals]) => {
                dayMeals.forEach(meal => {
                    if (meal.recipeId) {
                        const costData = validCosts.find(c => c.recipeId === meal.recipeId);
                        if (costData) {
                            const mealCost = (costData.cost * (meal.servings || 1)) / 4;
                            totalCost += mealCost;
                            costMap[`${day}-${meal.mealType}-${meal.recipeId}`] = {
                                cost: mealCost,
                                breakdown: costData.breakdown
                            };
                        }
                    }
                });
            });

            setMealCosts(costMap);
            setPriceIntelligence(prev => ({
                ...prev,
                currentCost: totalCost,
                projectedCost: totalCost
            }));

        } catch (error) {
            console.error('Error calculating meal plan costs:', error);
        }
    };

    const generateSmartSuggestions = async () => {
        console.log('🔍 generateSmartSuggestions called');

        if (!mealPlan) {
            console.log('❌ No meal plan found');
            showToast('No meal plan found', 'error');
            return;
        }

        console.log('🎯 Starting smart suggestions generation...');

        // Start loading state immediately
        setSuggestionsLoading(true);
        console.log('⏳ Set suggestionsLoading to true');

        setShowSmartSuggestions(true); // Show modal first
        console.log('🔓 Set showSmartSuggestions to true');

        setSmartSuggestions([]); // Clear previous suggestions
        console.log('🧹 Cleared previous suggestions');

        try {
            console.log('📡 Making API call with:', {
                mealPlanId: mealPlan._id,
                inventoryCount: inventory.length,
                dealCount: priceIntelligence.dealOpportunities.length,
                budget: priceIntelligence.weeklyBudget
            });

            const response = await apiPost('/api/meal-planning/smart-suggestions', {
                mealPlanId: mealPlan._id,
                inventory: inventory,
                dealOpportunities: priceIntelligence.dealOpportunities,
                budget: priceIntelligence.weeklyBudget,
                preferences: {
                    prioritizeSavings: true,
                    useInventoryFirst: true,
                    maxCostPerMeal: priceIntelligence.weeklyBudget > 0 ? priceIntelligence.weeklyBudget / 21 : null,
                    dietaryRestrictions: userDietaryRestrictions,
                    avoidIngredients: userAvoidIngredients
                }
            });

            console.log('📨 API Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Smart suggestions response:', data);

            if (data.success) {
                console.log(`🎯 Setting ${data.suggestions?.length || 0} suggestions`);
                setSmartSuggestions(data.suggestions || []);

                if (data.suggestions && data.suggestions.length > 0) {
                    const totalSavings = data.suggestions.reduce((sum, s) => sum + (s.savings || 0), 0);
                    showToast(
                        `Found ${data.suggestions.length} money-saving suggestions with ${formatPrice(totalSavings)} potential savings!`,
                        'success'
                    );
                } else {
                    showToast('Your meal plan is already well optimized! 🎉', 'info');
                    // Keep modal open to show the "well optimized" message
                }
            } else {
                throw new Error(data.error || 'Failed to generate suggestions');
            }
        } catch (error) {
            console.error('💥 Error generating smart suggestions:', error);

            // Show error in modal instead of closing it
            setSmartSuggestions([]);
            showToast(`Unable to generate suggestions: ${error.message}`, 'error');

            // Don't close the modal - let user see the error state and close manually
        } finally {
            console.log('🏁 Setting suggestionsLoading to false');
            setSuggestionsLoading(false);
            // Modal stays open regardless of success/failure
        }
    };

    const handleApplySuggestion = async (suggestion) => {
        try {
            console.log('Applying suggestion:', suggestion);

            // Track suggestion application for analytics
            if (typeof window !== 'undefined' && window.gtag) {
                window.gtag('event', 'apply_smart_suggestion', {
                    suggestion_type: suggestion.type,
                    potential_savings: suggestion.savings || 0,
                    urgency: suggestion.urgency
                });
            }

            let message = '';
            let actionTaken = false;

            switch (suggestion.action) {
                case 'replace_meal':
                    message = `📝 Ready to replace a meal!\n\n` +
                        `💡 ${suggestion.title}\n\n` +
                        `📋 Next steps:\n` +
                        `1. Choose one of these recommended recipes:\n` +
                        suggestion.recipes.slice(0, 3).map((recipe, idx) =>
                            `   ${idx + 1}. ${recipe.name} (${recipe.difficulty || 'medium'})`
                        ).join('\n');

                    if (suggestion.targetSlots && suggestion.targetSlots.length > 0) {
                        message += `\n\n📅 Available slots to replace:\n` +
                            suggestion.targetSlots.slice(0, 3).map(slot =>
                                `   • ${slot.day} ${slot.mealType}`
                            ).join('\n');
                    }

                    message += `\n\n💰 Potential savings: ${formatPrice(suggestion.savings || 0)}` +
                        `\n\n🎯 Tip: Look for the "Remove" option on existing meals, then add one of the suggested recipes.`;
                    break;

                case 'add_meal':
                    message = `➕ Ready to add a new meal!\n\n` +
                        `💡 ${suggestion.title}\n\n` +
                        `📋 Recommended recipes:\n` +
                        suggestion.recipes.slice(0, 3).map((recipe, idx) =>
                            `   ${idx + 1}. ${recipe.name} (${recipe.difficulty || 'medium'})`
                        ).join('\n');

                    if (suggestion.targetSlots && suggestion.targetSlots.length > 0) {
                        message += `\n\n📅 Empty slots available:\n` +
                            suggestion.targetSlots.slice(0, 3).map(slot =>
                                `   • ${slot.day} ${slot.mealType}`
                            ).join('\n');
                    }

                    message += `\n\n💰 Potential savings: ${formatPrice(suggestion.savings || 0)}` +
                        `\n\n🎯 Tip: Click "Add Recipe" or "Quick Meal" in any of the suggested slots.`;
                    break;

                case 'meal_prep':
                    message = `🍲 Meal Prep Time!\n\n` +
                        `💡 ${suggestion.title}\n\n` +
                        `📋 Batch cooking recipes:\n` +
                        suggestion.recipes.slice(0, 2).map((recipe, idx) =>
                            `   ${idx + 1}. ${recipe.name} (serves ${recipe.servings || 'multiple'})`
                        ).join('\n') +
                        `\n\n📝 Meal prep steps:\n` +
                        `   1. Choose one recipe above\n` +
                        `   2. Cook 2-3x the normal amount\n` +
                        `   3. Portion into containers\n` +
                        `   4. Add portions to multiple meal slots\n\n` +
                        `💰 Estimated savings: ${formatPrice(suggestion.savings || 0)}\n` +
                        `⏰ Time saved: 2-3 hours this week`;
                    break;

                default:
                    message = `💡 ${suggestion.title}\n\n` +
                        `📝 ${suggestion.description}\n\n`;

                    if (suggestion.dealInfo) {
                        message += `🏷️ Deal Details:\n` +
                            `   🏪 Store: ${suggestion.dealInfo.store}\n` +
                            `   💰 Price: ${formatPrice(suggestion.dealInfo.salePrice)} ` +
                            `(was ${formatPrice(suggestion.dealInfo.originalPrice)})\n` +
                            `   🎯 Savings: ${suggestion.dealInfo.savingsPercent}% off\n`;

                        if (suggestion.dealInfo.validUntil) {
                            const validDate = new Date(suggestion.dealInfo.validUntil).toLocaleDateString();
                            message += `   ⏰ Valid until: ${validDate}\n`;
                        }
                        message += '\n';
                    }

                    if (suggestion.recipes && suggestion.recipes.length > 0) {
                        message += `🍳 Try these recipes:\n` +
                            suggestion.recipes.slice(0, 3).map((recipe, idx) =>
                                `   ${idx + 1}. ${recipe.name}`
                            ).join('\n') + '\n\n';
                    }

                    message += `💰 Potential savings: ${formatPrice(suggestion.savings || 0)}`;

                    if (suggestion.benefits && suggestion.benefits.length > 0) {
                        message += `\n\n✨ Benefits:\n${suggestion.benefits.map(benefit => `   • ${benefit}`).join('\n')}`;
                    }
            }

            // Show the detailed message
            const userConfirmed = confirm(`${message}\n\nWould you like to proceed with this suggestion?`);

            if (userConfirmed) {
                // Here you could implement automatic meal plan updates
                // For now, we'll show a success message
                showToast(`Suggestion applied! Check your meal plan for updates.`, 'success');
                actionTaken = true;

                // Optionally refresh the meal plan
                if (onMealPlanUpdate) {
                    await onMealPlanUpdate();
                }
            }

            return actionTaken;

        } catch (error) {
            console.error('Error applying suggestion:', error);
            showToast(`Error applying suggestion: ${error.message}`, 'error');
            return false;
        }
    };

    // Add this function to handle meal plan updates when suggestions are applied:
    const handleMealPlanUpdate = async () => {
        try {
            await fetchMealPlan();
            if (priceIntelligence.enabled) {
                await calculateMealPlanCosts(mealPlan);
            }
            showToast('Meal plan updated!', 'success');
        } catch (error) {
            console.error('Error updating meal plan:', error);
            showToast('Error updating meal plan', 'error');
        }
    };

    const formatPrice = (price) => {
        return typeof price === 'number' ? `$${price.toFixed(2)}` : '$0.00';
    };

    // NEW: Voice Functions for Meal Planning
    const handleVoiceMealPlanning = async (transcript, confidence) => {
        console.log('🎤 Voice meal planning received:', transcript);
        setVoiceMealResults(transcript);
        setProcessingVoiceMeal(true);

        try {
            const mealPlan = parseVoiceMealPlanning(transcript);

            if (mealPlan && mealPlan.actions.length > 0) {
                // Process the meal planning actions
                let successCount = 0;
                let errorCount = 0;

                for (const action of mealPlan.actions) {
                    try {
                        await processMealPlanningAction(action);
                        successCount++;
                    } catch (error) {
                        console.error('Error processing meal action:', error);
                        errorCount++;
                    }
                }

                setShowVoiceMealPlanning(false);
                setVoiceMealResults('');

                if (successCount > 0) {
                    showToast(`✅ Successfully planned ${successCount} meal${successCount > 1 ? 's' : ''}!`, 'success');
                    // Refresh meal plan
                    await fetchMealPlan();
                } else if (errorCount > 0) {
                    showToast(`❌ Had trouble planning meals. Please try again.`, 'error');
                }
            } else {
                alert('❌ Could not understand meal planning request. Try saying something like "Add spaghetti to Monday dinner"');
            }
        } catch (error) {
            console.error('Error processing voice meal planning:', error);
            alert('❌ Error processing voice input. Please try again.');
        } finally {
            setProcessingVoiceMeal(false);
        }
    };

    const handleVoiceMealError = (error) => {
        console.error('🎤 Voice meal planning error:', error);
        setProcessingVoiceMeal(false);

        let userMessage = 'Voice meal planning failed. ';
        if (error.includes('not-allowed') || error.includes('denied')) {
            userMessage += 'Please allow microphone access in your browser settings.';
        } else if (error.includes('network')) {
            userMessage += 'Voice recognition requires an internet connection.';
        } else {
            userMessage += 'Please try again.';
        }

        alert(`🎤 ${userMessage}`);
    };

    const parseVoiceMealPlanning = (transcript) => {
        if (!transcript || transcript.trim().length === 0) return null;

        const cleanTranscript = transcript.toLowerCase().trim();
        console.log('🎤 Parsing meal planning:', cleanTranscript);

        const actions = [];

        // Split by connectors to handle multiple actions
        const segments = cleanTranscript.split(/\band\b|\bthen\b|\balso\b/);

        segments.forEach(segment => {
            segment = segment.trim();
            if (segment.length < 5) return;

            const action = parseSingleMealAction(segment);
            if (action) {
                actions.push(action);
            }
        });

        return actions.length > 0 ? {actions} : null;
    };

    const parseSingleMealAction = (segment) => {
        // Remove command words
        let cleanSegment = segment.replace(/^(add|put|schedule|plan|make)\s+/i, '');

        // Extract day
        const dayMap = {
            'monday': 'monday',
            'tuesday': 'tuesday',
            'wednesday': 'wednesday',
            'thursday': 'thursday',
            'friday': 'friday',
            'saturday': 'saturday',
            'sunday': 'sunday',
            'today': getTodayAsDay(),
            'tomorrow': getTomorrowAsDay()
        };

        let day = null;
        for (const [keyword, dayValue] of Object.entries(dayMap)) {
            if (cleanSegment.includes(keyword)) {
                day = dayValue;
                cleanSegment = cleanSegment.replace(keyword, '').trim();
                break;
            }
        }

        // Extract meal type
        const mealTypeMap = {
            'breakfast': 'Breakfast',
            'lunch': 'Lunch',
            'dinner': 'Dinner',
            'snack': 'PM Snack',
            'morning snack': 'AM Snack',
            'afternoon snack': 'Afternoon Snack'
        };

        let mealType = 'Dinner'; // Default
        for (const [keyword, mealValue] of Object.entries(mealTypeMap)) {
            if (cleanSegment.includes(keyword)) {
                mealType = mealValue;
                cleanSegment = cleanSegment.replace(keyword, '').trim();
                break;
            }
        }

        // Extract recipe name
        cleanSegment = cleanSegment.replace(/\b(to|for|on)\b/gi, '').trim();

        if (cleanSegment.length > 0 && day) {
            return {
                type: 'add_recipe',
                day: day,
                mealType: mealType,
                recipeName: cleanSegment,
                originalText: segment
            };
        }

        return null;
    };

    const getTodayAsDay = () => {
        const today = new Date();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[today.getDay()];
    };

    const getTomorrowAsDay = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[tomorrow.getDay()];
    };

    const processMealPlanningAction = async (action) => {
        if (action.type === 'add_recipe') {
            // Find matching recipe
            const matchingRecipe = findBestRecipeMatch(action.recipeName);

            if (matchingRecipe) {
                // Add the recipe to the meal plan
                await addMealToSlot(action.day, action.mealType, matchingRecipe);
                console.log(`✅ Added ${matchingRecipe.title} to ${action.day} ${action.mealType}`);
            } else {
                // Create a simple meal instead
                const simpleMeal = {
                    entryType: 'simple',
                    mealType: action.mealType,
                    simpleMeal: {
                        name: action.recipeName,
                        description: `Voice-added meal: ${action.recipeName}`,
                        items: [{
                            itemName: action.recipeName,
                            quantity: '1',
                            unit: 'serving'
                        }],
                        totalEstimatedTime: 30
                    },
                    servings: 1,
                    notes: 'Added via voice input',
                    createdAt: new Date()
                };

                await addSimpleMealToSlot(action.day, action.mealType, simpleMeal);
                console.log(`✅ Added simple meal "${action.recipeName}" to ${action.day} ${action.mealType}`);
            }
        }
    };

    const findBestRecipeMatch = (recipeName) => {
        if (!recipes || recipes.length === 0) return null;

        const queryLower = recipeName.toLowerCase();

        // Exact title match
        let match = recipes.find(recipe =>
            recipe.title.toLowerCase() === queryLower
        );
        if (match) return match;

        // Partial title match
        match = recipes.find(recipe =>
            recipe.title.toLowerCase().includes(queryLower) ||
            queryLower.includes(recipe.title.toLowerCase())
        );
        if (match) return match;

        // Tag match
        match = recipes.find(recipe =>
                recipe.tags && recipe.tags.some(tag =>
                    tag.toLowerCase().includes(queryLower) ||
                    queryLower.includes(tag.toLowerCase())
                )
        );
        if (match) return match;

        // Description match
        match = recipes.find(recipe =>
            recipe.description &&
            recipe.description.toLowerCase().includes(queryLower)
        );
        if (match) return match;

        return null;
    };

    const getMealCostIndicator = (day, mealType, recipeId) => {
        if (!priceIntelligence.enabled) return null;

        const costKey = `${day.toLowerCase()}-${mealType}-${recipeId}`;
        const costData = mealCosts[costKey];

        if (!costData) return null;

        const cost = costData.cost;
        const avgCostPerMeal = priceIntelligence.weeklyBudget / 21;

        let colorClass = 'text-green-600';
        let indicator = '💰';

        if (avgCostPerMeal > 0) {
            if (cost > avgCostPerMeal * 1.5) {
                colorClass = 'text-red-600';
                indicator = '💸';
            } else if (cost > avgCostPerMeal) {
                colorClass = 'text-yellow-600';
                indicator = '💵';
            }
        }

        return (
            <div className={`text-xs ${colorClass} font-medium mt-1`}>
                {indicator} {formatPrice(cost)}
            </div>
        );
    };

    // Enhanced categorize recipe function
    const categorizeRecipe = (recipe) => {
        const title = recipe.title?.toLowerCase() || '';
        const tags = recipe.tags || [];
        const category = recipe.category?.toLowerCase() || '';

        const tagCategories = {
            'entree': ['entree', 'main dish', 'main course', 'dinner', 'lunch'],
            'side': ['side dish', 'side', 'sides'],
            'appetizer': ['appetizer', 'starter', 'appetizers'],
            'dessert': ['dessert', 'sweet', 'cake', 'cookie', 'pie', 'desserts'],
            'soup': ['soup', 'stew', 'broth', 'chili'],
            'salad': ['salad', 'salads'],
            'breakfast': ['breakfast', 'brunch'],
            'snack': ['snack', 'snacks']
        };

        for (const [cat, keywords] of Object.entries(tagCategories)) {
            if (tags.some(tag => keywords.some(keyword => tag.toLowerCase().includes(keyword)))) {
                return cat;
            }
        }

        for (const [cat, keywords] of Object.entries(tagCategories)) {
            if (keywords.some(keyword => title.includes(keyword))) {
                return cat;
            }
        }

        if (category) {
            for (const [cat, keywords] of Object.entries(tagCategories)) {
                if (keywords.some(keyword => category.includes(keyword))) {
                    return cat;
                }
            }
        }

        if (title.includes('salad')) return 'salad';
        if (title.includes('soup') || title.includes('stew')) return 'soup';
        if (title.includes('cake') || title.includes('cookie') || title.includes('pie') || title.includes('dessert')) return 'dessert';
        if (title.includes('breakfast') || title.includes('pancake') || title.includes('waffle') || title.includes('omelette')) return 'breakfast';

        return 'entree';
    };

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
            if (userDietaryRestrictions.length > 0) {
                const recipeTags = recipe.tags || [];
                const recipeDietaryTags = recipe.dietaryTags || [];
                const allRecipeTags = [...recipeTags, ...recipeDietaryTags].map(tag => tag.toLowerCase());

                const hasRequiredRestrictions = userDietaryRestrictions.every(restriction => {
                    const restrictionLower = restriction.toLowerCase().trim();

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

            if (userAvoidIngredients.length > 0) {
                const recipeIngredients = recipe.ingredients || [];
                const recipeTitle = recipe.title?.toLowerCase() || '';
                const recipeDescription = recipe.description?.toLowerCase() || '';

                const hasAvoidedIngredients = userAvoidIngredients.some(avoidedIngredient => {
                    const avoidedLower = avoidedIngredient.toLowerCase().trim();

                    if (recipeTitle.includes(avoidedLower)) return true;
                    if (recipeDescription.includes(avoidedLower)) return true;

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
            meal.simpleMeal.items.forEach(item => {
                const itemName = item.itemName?.toLowerCase() || '';
                userAvoidIngredients.forEach(avoidedIngredient => {
                    const avoidedLower = avoidedIngredient.toLowerCase().trim();
                    if (itemName.includes(avoidedLower)) {
                        conflicts.push(`Contains avoided ingredient: ${avoidedIngredient}`);
                    }
                });
            });
        }

        return conflicts;
    };

    const dismissWeekNotification = () => {
        setShowWeekNotification(false);
        localStorage.setItem('weekSettingsNotificationDismissed', 'true');
    };

    const fetchInventory = async () => {
        try {
            const response = await apiGet('/api/inventory');
            const data = await response.json();
            if (data.success) {
                setInventory(data.inventory);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    // All the meal handling functions
    const handleMealCompletion = async (completionData) => {
        if (!mealPlan) return;

        try {
            const mealEntry = selectedMealForCompletion.meal;
            const updatedMeal = {
                ...mealEntry,
                completed: true,
                completedAt: completionData.completedAt,
                completionType: completionData.completionType,
                completionPercentage: completionData.completionPercentage,
                completionNotes: completionData.notes
            };

            const updatedMeals = {...mealPlan.meals};
            const dayMeals = updatedMeals[selectedMealForCompletion.day] || [];
            const mealIndex = dayMeals.findIndex(m =>
                (m.recipeId === mealEntry.recipeId && m.mealType === mealEntry.mealType) ||
                (m.simpleMeal?.name === mealEntry.simpleMeal?.name && m.mealType === mealEntry.mealType)
            );

            if (mealIndex !== -1) {
                dayMeals[mealIndex] = updatedMeal;
            }

            const response = await apiPut(`/api/meal-plans/${mealPlan._id}`, {meals: updatedMeals});

            if (response.ok) {
                setMealPlan(prev => ({
                    ...prev,
                    meals: updatedMeals
                }));

                await fetchInventory();
                showToast(`Meal completed! ${completionData.itemsConsumed} ingredients consumed from inventory.`);
            }
        } catch (error) {
            console.error('Error updating meal completion:', error);
            alert('Error completing meal. Please try again.');
        }
    };

    const handleUndoCompletion = async (meal, day) => {
        if (!mealPlan) return;

        const confirmUndo = window.confirm(
            `Are you sure you want to undo the completion of "${getMealDisplayName(meal)}"?\n\n` +
            `This will:\n` +
            `• Remove the completed status from the meal\n` +
            `• NOT restore consumed ingredients to inventory\n` +
            `• Keep the consumption history for your records\n\n` +
            `Note: To restore ingredients to inventory, use the "Undo" button in Inventory History within 24 hours.`
        );

        if (!confirmUndo) return;

        try {
            const updatedMeals = {...mealPlan.meals};
            const dayMeals = updatedMeals[day] || [];
            const mealIndex = dayMeals.findIndex(m =>
                (m.recipeId === meal.recipeId && m.mealType === meal.mealType && m.createdAt === meal.createdAt) ||
                (m.simpleMeal?.name === meal.simpleMeal?.name && m.mealType === meal.mealType && m.createdAt === meal.createdAt)
            );

            if (mealIndex !== -1) {
                const updatedMeal = {
                    ...dayMeals[mealIndex],
                    completed: false,
                    completedAt: null,
                    completionType: 'full',
                    completionPercentage: 100,
                    completionNotes: '',
                    itemsConsumed: []
                };

                dayMeals[mealIndex] = updatedMeal;
            }

            const response = await apiPut(`/api/meal-plans/${mealPlan._id}`, {meals: updatedMeals});

            if (response.ok) {
                setMealPlan(prev => ({
                    ...prev,
                    meals: updatedMeals
                }));

                showToast(`Meal completion status removed. Ingredients remain consumed in inventory history.`);
            } else {
                throw new Error('Failed to update meal plan');
            }
        } catch (error) {
            console.error('Error undoing meal completion:', error);
            alert('Error undoing completion. Please try again.');
        }
    };

    const handleMarkComplete = (meal, day, mealType) => {
        setSelectedMealForCompletion({
            meal,
            day,
            mealType: mealType || meal.mealType
        });
        setShowMealCompletion(true);
        closeMealDropdowns();
    };

    const handleEditMeal = (meal, day) => {
        if (meal.entryType === 'simple') {
            setSelectedSlot({day, mealType: meal.mealType});
            setShowSimpleMealBuilder(true);
        } else if (meal.entryType === 'recipe') {
            alert(`Recipe meal editing: You can remove this meal and add a different recipe, or modify the servings/notes.\n\nFull recipe editing should be done in the Recipe section.`);
        }
        closeMealDropdowns();
    };

    const handleDeleteMeal = (day, actualIndex) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this meal?');
        if (confirmDelete) {
            removeMealFromSlot(day, actualIndex);
        }
        closeMealDropdowns();
    };

    const toggleMealDropdown = (mealId) => {
        setMealDropdowns(prev => {
            const newState = {
                ...prev,
                [mealId]: !prev[mealId]
            };
            return newState;
        });
    };

    const closeMealDropdowns = () => {
        setMealDropdowns({});
    };

    // Migration function for existing users with old meal types
    const migrateOldMealTypes = (mealTypes) => {
        const oldMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        const newMealTypes = ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'];

        if (mealTypes && mealTypes.length > 0 && mealTypes.every(type => oldMealTypes.includes(type.toLowerCase()))) {
            console.log('Migrating old meal types to new expanded format');
            return newMealTypes;
        }

        if (!mealTypes || mealTypes.length === 0) {
            return newMealTypes;
        }

        return mealTypes;
    };

    const loadUserPreferences = async () => {
        try {
            const response = await apiGet('/api/user/preferences');
            const data = await response.json();
            if (data.success && data.preferences) {
                if (data.preferences.weekStartDay) {
                    setWeekStartDay(data.preferences.weekStartDay);
                }

                if (data.preferences.defaultMealTypes && data.preferences.defaultMealTypes.length > 0) {
                    const migratedMealTypes = migrateOldMealTypes(data.preferences.defaultMealTypes);
                    setUserMealTypes(migratedMealTypes);
                } else {
                    setUserMealTypes(['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack']);
                }

                if (data.preferences.dietaryRestrictions) {
                    setUserDietaryRestrictions(data.preferences.dietaryRestrictions);
                }

                if (data.preferences.avoidIngredients) {
                    setUserAvoidIngredients(data.preferences.avoidIngredients);
                }

                // NEW: Load price intelligence preferences
                if (data.preferences.priceIntelligence) {
                    setPriceIntelligence(prev => ({
                        ...prev,
                        enabled: data.preferences.priceIntelligence.enabled !== false,
                        showInsights: data.preferences.priceIntelligence.showInsights || false
                    }));
                }
            }
        } catch (error) {
            console.error('Error loading user preferences:', error);
        }
    };

    const updateWeekStartPreference = async (newStartDay) => {
        try {
            const response = await api;
            Put('/api/user/preferences', {
                weekStartDay: newStartDay
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

    // Enhanced meal rendering with price information
    const renderMealWithWarnings = (meal, mealTypeIndex, day, actualIndex) => {
        const conflicts = checkMealDietaryConflicts(meal);
        const hasConflicts = conflicts.length > 0;

        const mealId = `${day}-${meal.mealType}-${actualIndex}`;
        const isDropdownOpen = mealDropdowns[mealId] || false;

        const isCompleted = meal.completed || false;
        const completionPercentage = meal.completionPercentage || 100;

        return (
            <div
                key={`${meal.recipeId || meal.simpleMeal?.name}-${mealTypeIndex}`}
                className={`p-3 border rounded-lg relative ${
                    isCompleted
                        ? 'bg-gray-100 border-gray-300 opacity-75'
                        : meal.entryType === 'simple'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200'
                } ${hasConflicts ? 'border-orange-300 bg-orange-50' : ''}`}
            >
                <div className="pr-6">
                    <div className="font-medium text-gray-900 text-sm flex items-center">
                        {meal.entryType === 'simple' && (
                            <span className="text-green-600 mr-1">🍽️</span>
                        )}
                        {hasConflicts && (
                            <span className="text-orange-600 mr-1" title={conflicts.join(', ')}>⚠️</span>
                        )}
                        {isCompleted && (
                            <span className="text-green-600 mr-1" title={`Completed ${completionPercentage}%`}>
                            {completionPercentage === 100 ? '✅' : '🔄'}
                        </span>
                        )}
                        {getMealDisplayName(meal)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                        {getMealDisplayDetails(meal)}
                    </div>

                    {/* NEW: Price information display */}
                    {meal.recipeId && getMealCostIndicator(day, meal.mealType, meal.recipeId)}

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
                    {isCompleted && (
                        <div className="text-xs text-green-600 mt-1 font-medium">
                            {completionPercentage === 100 ? 'Completed' : `${completionPercentage}% Complete`}
                            {meal.completedAt && (
                                <span className="ml-1">
                                • {new Date(meal.completedAt).toLocaleDateString()}
                            </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Dropdown Menu Button */}
                <div className="absolute top-2 right-2">
                    <TouchEnhancedButton
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleMealDropdown(mealId);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors"
                        title="Meal options"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                        </svg>
                    </TouchEnhancedButton>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div
                            className="meal-dropdown absolute right-0 top-8 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="py-1">
                                {!isCompleted && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleMarkComplete(meal, day, meal.mealType);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                    >
                                        <span className="mr-2">✅</span>
                                        Mark Complete
                                    </button>
                                )}

                                {isCompleted && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleUndoCompletion(meal, day);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center"
                                    >
                                        <span className="mr-2">↶</span>
                                        Undo Complete
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleEditMeal(meal, day);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                >
                                    <span className="mr-2">✏️</span>
                                    Edit Meal
                                </button>

                                <div className="border-t border-gray-100 my-1"></div>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteMeal(day, actualIndex);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                                >
                                    <span className="mr-2">🗑️</span>
                                    Delete Meal
                                </button>
                            </div>
                        </div>
                    )}
                </div>
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

    const updateMealTypePreferences = async (newMealTypes) => {
        try {
            const response = await apiPut('/api/user/preferences', {
                defaultMealTypes: newMealTypes
            });

            const data = await response.json();
            if (data.success) {
                setUserMealTypes(newMealTypes);
            }
        } catch (error) {
            console.error('Error updating meal type preferences:', error);
        }
    };

    // NEW: Update price intelligence preferences
    const updatePricePreferences = async (newPreferences) => {
        try {
            const response = await apiPut('/api/user/preferences', {
                priceIntelligence: newPreferences
            });

            const data = await response.json();
            if (data.success) {
                setPriceIntelligence(prev => ({
                    ...prev,
                    ...newPreferences
                }));
            }
        } catch (error) {
            console.error('Error updating price preferences:', error);
        }
    };

    const updateWeeklyBudget = async (newBudget) => {
        try {
            const response = await apiPut('/api/user/budget', {
                weeklyMealBudget: newBudget
            });

            const data = await response.json();
            if (data.success) {
                setPriceIntelligence(prev => ({
                    ...prev,
                    weeklyBudget: newBudget
                }));
                showToast('Weekly budget updated!', 'success');
            }
        } catch (error) {
            console.error('Error updating budget:', error);
            showToast('Failed to update budget', 'error');
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
            const response = await apiGet(`/api/meal-plans?weekStart=${weekStartParam}`);
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

            const response = await apiPost('/api/meal-plans', {
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
                    dietaryRestrictions: userDietaryRestrictions,
                    avoidIngredients: userAvoidIngredients,
                    priceIntelligence: priceIntelligence // NEW: Include price preferences
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

    const fetchRecipes = async () => {
        try {
            const response = await apiGet('/api/recipes');
            const data = await response.json();
            if (data.success) {
                setRecipes(data.recipes);
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
        }
    };

    const handleTemplateApplied = (updatedMealPlan) => {
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
            const response = await apiPut(`/api/meal-plans/${mealPlan._id}`, {
                meals: updatedMeals
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
        setRecipeSearchQuery('');
        setSelectedRecipeCategory('all');
    };

    const addSimpleMealToSlot = async (day, mealType, simpleMealEntry) => {
        if (!mealPlan) return;

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
            const response = await apiPut(`/api/meal-plans/${mealPlan._id}`, {
                meals: updatedMeals
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
            const response = await apiPut(`/api/meal-plans/${mealPlan._id}`, {
                meals: updatedMeals
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
            loadPriceIntelligence();
        }
    }, [session]);

    useEffect(() => {
        const dismissed = localStorage.getItem('weekSettingsNotificationDismissed');
        if (dismissed === 'true') {
            setShowWeekNotification(false);
        }
    }, []);

    useEffect(() => {
        if (recipes.length > 0) {
            let filtered = filterRecipesByDietaryPreferences(recipes);

            console.log(`🔍 Recipe filtering: Starting with ${recipes.length} recipes, after dietary filter: ${filtered.length}`);

            if (recipeSearchQuery.trim()) {
                const query = recipeSearchQuery.toLowerCase();
                filtered = filtered.filter(recipe =>
                    recipe.title.toLowerCase().includes(query) ||
                    (recipe.description && recipe.description.toLowerCase().includes(query)) ||
                    (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(query))) ||
                    (recipe.ingredients && recipe.ingredients.some(ingredient => {
                        const ingredientName = typeof ingredient === 'string'
                            ? ingredient.toLowerCase()
                            : ingredient.name?.toLowerCase() || '';
                        return ingredientName.includes(query);
                    }))
                );
                console.log(`🔍 After search filter "${query}": ${filtered.length} recipes`);
            }

            if (selectedRecipeCategory !== 'all') {
                filtered = filtered.filter(recipe =>
                    categorizeRecipe(recipe) === selectedRecipeCategory
                );
                console.log(`🔍 After category filter "${selectedRecipeCategory}": ${filtered.length} recipes`);
            }

            setFilteredRecipes(filtered);

            if (recipes.length > 0 && filtered.length < recipes.length * 0.5) {
                setDietaryWarningMessage(
                    `${recipes.length - filtered.length} of ${recipes.length} recipes were filtered out based on your preferences.`
                );
            } else {
                setDietaryWarningMessage('');
            }
        }
    }, [recipes, userDietaryRestrictions, userAvoidIngredients, recipeSearchQuery, selectedRecipeCategory]);

    useEffect(() => {
        if (session?.user) {
            fetchInventory();
        }
    }, [session]);

    useEffect(() => {
        if (mealPlan && priceIntelligence.enabled) {
            calculateMealPlanCosts(mealPlan);
        }
    }, [mealPlan, priceIntelligence.enabled]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.meal-dropdown')) {
                closeMealDropdowns();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // MOVE THIS useEffect HERE - before any early returns
    useEffect(() => {
        if (session?.user && weekStartDay && userMealTypes.length > 0) {
            fetchMealPlan();
            fetchRecipes();
        }
    }, [session, currentWeek, weekStartDay, userMealTypes]);


    const availableMealTypes = ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack']
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

    // Mobile Layout
    if (isMobile) {
        return (
            <div className="max-w-full mx-auto p-4">
                {/* Enhanced Mobile Header with Price Intelligence */}
                <div className="mb-6">
                    <div className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {priceIntelligence.enabled ? '💰📅' : '📅'} Meal Planning
                                </h1>
                                <p className="text-gray-600 text-sm mt-1">Plan your meals for the week</p>

                                {/* NEW: Price Intelligence Summary */}
                                {priceIntelligence.enabled && (
                                    <div className="text-xs text-gray-500 mt-1 space-y-1">
                                        {priceIntelligence.weeklyBudget > 0 && (
                                            <div className="flex items-center space-x-2">
                                                <span>Budget: {formatPrice(priceIntelligence.weeklyBudget)}</span>
                                                <span>•</span>
                                                <span>Used: {formatPrice(priceIntelligence.currentCost)}</span>
                                                <span
                                                    className={priceIntelligence.currentCost > priceIntelligence.weeklyBudget ? 'text-red-600' : 'text-green-600'}>
                                                ({priceIntelligence.weeklyBudget > 0 ? ((priceIntelligence.currentCost / priceIntelligence.weeklyBudget) * 100).toFixed(0) : 0}%)
                                            </span>
                                            </div>
                                        )}
                                        {priceIntelligence.dealOpportunities.length > 0 && (
                                            <div className="text-green-600">
                                                💡 {priceIntelligence.dealOpportunities.length} deals available
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Dietary preferences summary */}
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

                            <div className="flex items-center space-x-2">
                                {/* NEW: Price Intelligence Toggle */}
                                {priceIntelligence.enabled && (
                                    <TouchEnhancedButton
                                        onClick={() => setPriceIntelligence(prev => ({
                                            ...prev,
                                            showInsights: !prev.showInsights
                                        }))}
                                        className={`p-2 rounded-lg transition-colors ${
                                            priceIntelligence.showInsights
                                                ? 'text-green-600 bg-green-100'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                        }`}
                                        title="Toggle Price Insights"
                                    >
                                        💡
                                    </TouchEnhancedButton>
                                )}

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
                        </div>

                        {/* Enhanced Action Buttons - Mobile - FIXED LAYOUT */}
                        <div className="flex flex-col space-y-3">
                            {/* First row - Templates */}
                            <div className="w-full">
                                {mealPlan && (
                                    <TemplateLibraryButton
                                        mealPlanId={mealPlan._id}
                                        mealPlanName={mealPlan.name}
                                        onTemplateApplied={handleTemplateApplied}
                                        disabled={false}
                                    />
                                )}
                            </div>

                            {/* Second row - Two button grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {mealsPlanned && (
                                    <TouchEnhancedButton
                                        onClick={() => setShowShoppingList(true)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-md"
                                        title="Generate shopping list from your meal plan"
                                    >
                                        🛒 Shopping List
                                    </TouchEnhancedButton>
                                )}

                                {/* NEW: Smart Suggestions Button */}
                                {priceIntelligence.enabled && mealPlan && (
                                    <TouchEnhancedButton
                                        onClick={generateSmartSuggestions}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-md"
                                        title="Get AI-powered money-saving meal suggestions"
                                    >
                                        💡 Smart Ideas
                                    </TouchEnhancedButton>
                                )}
                            </div>

                            {/* Third row - Voice & Additional Features */}
                            <div className="grid grid-cols-1 gap-3">
                                {/* NEW: Voice Meal Planning Button */}
                                <TouchEnhancedButton
                                    onClick={() => setShowVoiceMealPlanning(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-md"
                                    title="Plan meals using voice commands"
                                >
                                    🎤 Voice Planning
                                </TouchEnhancedButton>
                            </div>

                            {/* Fourth row - Meal Prep and Nutrition */}
                            <div className="grid grid-cols-2 gap-3">
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

                        <h2 className="text-lg font-semibold text-gray-900 text-center flex-1">
                            {getWeekStart(currentWeek).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                            })} - {(() => {
                            const weekEnd = new Date(getWeekStart(currentWeek));
                            weekEnd.setDate(weekEnd.getDate() + 6);
                            return weekEnd.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
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
                    <div className="mt-2 text-center">
                        <TouchEnhancedButton
                            onClick={goToToday}
                            className="px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors text-sm"
                        >
                            Today
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* NEW: Mobile Price Intelligence Insights Panel */}
                {priceIntelligence.enabled && priceIntelligence.showInsights && (
                    <div
                        className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4">
                        <h3 className="text-sm font-semibold text-green-900 mb-3">💡 Smart Insights</h3>

                        <div className="grid grid-cols-1 gap-3">
                            {/* Budget Status */}
                            <div className="bg-white rounded-lg p-3 border border-green-300">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-green-900 text-sm">💰 Budget Status</h4>
                                    <TouchEnhancedButton
                                        onClick={() => setShowBudgetModal(true)}
                                        className="text-xs text-green-600 hover:text-green-700"
                                    >
                                        {priceIntelligence.weeklyBudget === 0 ? 'Set Budget' : 'Edit'}
                                    </TouchEnhancedButton>
                                </div>
                                <div className="text-sm text-green-800">
                                    {priceIntelligence.weeklyBudget > 0 ? (
                                        priceIntelligence.currentCost < priceIntelligence.weeklyBudget ? (
                                            `Under budget by ${formatPrice(priceIntelligence.weeklyBudget - priceIntelligence.currentCost)}`
                                        ) : (
                                            `Over budget by ${formatPrice(priceIntelligence.currentCost - priceIntelligence.weeklyBudget)}`
                                        )
                                    ) : (
                                        'Set a weekly budget to track spending'
                                    )}
                                </div>
                            </div>

                            {/* Inventory Opportunities */}
                            <div className="bg-white rounded-lg p-3 border border-green-300">
                                <h4 className="font-medium text-green-900 mb-2 text-sm">📦 Use Your Inventory</h4>
                                <div className="text-sm text-green-800">
                                    You have {inventory.length} items that could be used in meals this week
                                </div>
                                <TouchEnhancedButton
                                    onClick={generateSmartSuggestions}
                                    className="text-xs text-green-600 hover:text-green-700 mt-2"
                                >
                                    Get Suggestions →
                                </TouchEnhancedButton>
                            </div>

                            {/* Current Deals */}
                            {priceIntelligence.dealOpportunities.length > 0 && (
                                <div className="bg-white rounded-lg p-3 border border-green-300">
                                    <h4 className="font-medium text-green-900 mb-2 text-sm">🎯 Best Deals Today</h4>
                                    <div className="text-sm text-green-800">
                                        {priceIntelligence.dealOpportunities.slice(0, 2).map((deal, index) => (
                                            <div key={index} className="mb-1">
                                                {deal.itemName} - {deal.savingsPercent}% off
                                            </div>
                                        ))}
                                        {priceIntelligence.dealOpportunities.length > 2 && (
                                            <div className="text-xs text-green-600 mt-1">
                                                +{priceIntelligence.dealOpportunities.length - 2} more deals
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Dietary filtering notification */}
                {dietaryWarningMessage && (
                    <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
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
                                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                                  strokeWidth={2}
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
                                            {/* Existing Meals - with dietary warnings and price info */}
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

                {/* Enhanced Week Settings Modal with Price Intelligence */}
                {showWeekSettings && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
                                <TouchEnhancedButton
                                    onClick={() => setShowWeekSettings(false)}
                                    className="text-gray-400 hover:text-gray-600 text-xl"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>

                            <div className="space-y-6">
                                {/* NEW: Price Intelligence Settings */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        Price Intelligence:
                                    </label>
                                    <div className="space-y-3">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="price-intelligence-enabled"
                                                checked={priceIntelligence.enabled}
                                                onChange={(e) => updatePricePreferences({enabled: e.target.checked})}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="price-intelligence-enabled"
                                                   className="ml-3 text-sm text-gray-700">
                                                Enable price tracking and budget features
                                            </label>
                                        </div>

                                        {priceIntelligence.enabled && (
                                            <div className="ml-7 space-y-2">
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id="show-insights"
                                                        checked={priceIntelligence.showInsights}
                                                        onChange={(e) => updatePricePreferences({showInsights: e.target.checked})}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                    />
                                                    <label htmlFor="show-insights"
                                                           className="ml-3 text-sm text-gray-700">
                                                        Show smart insights panel
                                                    </label>
                                                </div>

                                                <div className="mt-3">
                                                    <TouchEnhancedButton
                                                        onClick={() => setShowBudgetModal(true)}
                                                        className="text-sm text-indigo-600 hover:text-indigo-700"
                                                    >
                                                        {priceIntelligence.weeklyBudget === 0 ? 'Set Weekly Budget' : `Update Budget (${formatPrice(priceIntelligence.weeklyBudget)})`}
                                                    </TouchEnhancedButton>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

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

                {/* NEW: Budget Setting Modal */}
                {showBudgetModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-md w-full p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Set Weekly Budget</h3>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Weekly Meal Budget
                                </label>
                                <div className="relative">
                                    <span
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                    <KeyboardOptimizedInput
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={priceIntelligence.weeklyBudget}
                                        onChange={(e) => setPriceIntelligence(prev => ({
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
                                        updateWeeklyBudget(priceIntelligence.weeklyBudget);
                                        setShowBudgetModal(false);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Save Budget
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recipe Selection Modal - Enhanced with price info */}
                {showRecipeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-lg w-full h-[85vh] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="p-4 border-b border-gray-200 flex-shrink-0">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Add Recipe
                                        to {selectedSlot && getDayName(selectedSlot.day)} {selectedSlot?.mealType}
                                    </h3>
                                    <TouchEnhancedButton
                                        onClick={() => {
                                            setShowRecipeModal(false);
                                            setSelectedSlot(null);
                                            setRecipeSearchQuery('');
                                            setSelectedRecipeCategory('all');
                                        }}
                                        className="text-gray-400 hover:text-gray-600 text-xl"
                                    >
                                        ×
                                    </TouchEnhancedButton>
                                </div>

                                {/* Compact filters */}
                                <div className="space-y-2">
                                    {/* Search */}
                                    <KeyboardOptimizedInput
                                        type="text"
                                        placeholder="Search recipes..."
                                        value={recipeSearchQuery}
                                        onChange={(e) => setRecipeSearchQuery(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />

                                    {/* Category Filter */}
                                    <select
                                        value={selectedRecipeCategory}
                                        onChange={(e) => setSelectedRecipeCategory(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                                    >
                                        <option value="all">All Categories ({recipes.length})</option>
                                        {RECIPE_CATEGORIES.map(category => {
                                            const count = recipes.filter(recipe => categorizeRecipe(recipe) === category.id).length;
                                            return (
                                                <option key={category.id} value={category.id}>
                                                    {category.icon} {category.name} ({count})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Filter Info */}
                                <div className="mt-2 text-sm text-orange-600">
                                    Showing {filteredRecipes.length} of {recipes.length} recipes
                                    {recipes.length - filteredRecipes.length > 0 && (
                                        <span> ({recipes.length - filteredRecipes.length} filtered)</span>
                                    )}
                                </div>
                            </div>

                            {/* Recipe list area */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {filteredRecipes.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">
                                            {recipes.length === 0
                                                ? "No recipes found. Add some recipes first!"
                                                : "No recipes match your current filters."}
                                        </p>
                                        {(recipeSearchQuery || selectedRecipeCategory !== 'all') && (
                                            <TouchEnhancedButton
                                                onClick={() => {
                                                    setRecipeSearchQuery('');
                                                    setSelectedRecipeCategory('all');
                                                }}
                                                className="mt-2 text-indigo-600 hover:text-indigo-800"
                                            >
                                                Clear filters
                                            </TouchEnhancedButton>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredRecipes.map(recipe => {
                                            const recipeCategory = categorizeRecipe(recipe);
                                            const categoryInfo = RECIPE_CATEGORIES.find(c => c.id === recipeCategory) || RECIPE_CATEGORIES.find(c => c.id === 'entree');

                                            return (
                                                <TouchEnhancedButton
                                                    key={recipe._id}
                                                    onClick={() => addMealToSlot(selectedSlot.day, selectedSlot.mealType, recipe)}
                                                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1">
                                                            <div
                                                                className="font-medium text-gray-900 mb-1">{recipe.title}</div>
                                                            <div className="text-xs text-gray-600 mb-1">
                                                                {categoryInfo.icon} {categoryInfo.name}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-sm text-gray-600 mb-2">
                                                        {recipe.servings} servings
                                                        • {recipe.prepTime + recipe.cookTime} min • {recipe.difficulty}
                                                    </div>

                                                    {recipe.description && (
                                                        <div className="text-sm text-gray-500 mb-2 line-clamp-2">
                                                            {recipe.description}
                                                        </div>
                                                    )}

                                                    {recipe.tags && recipe.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {recipe.tags.slice(0, 3).map(tag => (
                                                                <span key={tag}
                                                                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                        {tag}
                                    </span>
                                                            ))}
                                                            {recipe.tags.length > 3 && (
                                                                <span
                                                                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                        +{recipe.tags.length - 3} more
                                    </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </TouchEnhancedButton>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* NEW: Voice Meal Planning Modal */}
                {showVoiceMealPlanning && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-lg w-full p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">🎤 Voice Meal Planning</h3>
                                <TouchEnhancedButton
                                    onClick={() => setShowVoiceMealPlanning(false)}
                                    disabled={processingVoiceMeal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>

                            <div className="mb-4">
                                <VoiceInput
                                    onResult={handleVoiceMealPlanning}
                                    onError={handleVoiceMealError}
                                    placeholder="Say what meals you want to plan..."
                                />
                            </div>

                            {/* Processing Status */}
                            {processingVoiceMeal && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                                    <div className="text-blue-800 font-medium">
                                        🤖 Processing meal plan...
                                    </div>
                                    <div className="text-sm text-blue-600 mt-1">
                                        Finding recipes and scheduling meals
                                    </div>
                                </div>
                            )}

                            {/* Recent Voice Results */}
                            {voiceMealResults && !processingVoiceMeal && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="text-sm font-medium text-green-800 mb-1">
                                        Last voice command:
                                    </div>
                                    <div className="text-green-700 italic">
                                        "{voiceMealResults}"
                                    </div>
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <p className="text-sm text-blue-800 mb-2">
                                    💡 <strong>Voice Meal Planning Examples:</strong>
                                </p>
                                <ul className="text-sm text-blue-700 space-y-1">
                                    <li>• "Add spaghetti to Monday dinner"</li>
                                    <li>• "Plan chicken salad for Tuesday lunch"</li>
                                    <li>• "Schedule pancakes for Sunday breakfast"</li>
                                    <li>• "Put pizza on Friday dinner and tacos on Saturday"</li>
                                    <li>• "Add soup to today's lunch"</li>
                                    <li>• "Plan stir fry for tomorrow dinner"</li>
                                </ul>
                            </div>

                            {/* Tips */}
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                <div className="text-xs text-yellow-800">
                                    <strong>💡 Tips:</strong>
                                    <ul className="mt-1 space-y-1">
                                        <li>• Say the day (Monday, Tuesday, etc.) or "today"/"tomorrow"</li>
                                        <li>• Include meal type (breakfast, lunch, dinner, snack)</li>
                                        <li>• Use recipe names you have, or describe simple meals</li>
                                        <li>• You can plan multiple meals in one command</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Smart Suggestions Modal */}
                {showSmartSuggestions && (
                    <SmartSuggestionsModal
                        isOpen={showSmartSuggestions}
                        onClose={() => setShowSmartSuggestions(false)}
                        suggestions={smartSuggestions}
                        onApplySuggestion={handleApplySuggestion}
                        isLoading={suggestionsLoading}
                        mealPlan={mealPlan}
                        onMealPlanUpdate={handleMealPlanUpdate}
                    />
                )}

                {/* Simple Meal Builder Modal */}
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
                        priceIntelligence={priceIntelligence.enabled} // NEW: Pass price intelligence flag
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

                {/* Meal Completion Modal */}
                {showMealCompletion && selectedMealForCompletion && (
                    <MealCompletionModal
                        isOpen={showMealCompletion}
                        onClose={() => {
                            setShowMealCompletion(false);
                            setSelectedMealForCompletion(null);
                        }}
                        onComplete={handleMealCompletion}
                        meal={selectedMealForCompletion.meal}
                        selectedSlot={selectedMealForCompletion}
                        inventory={inventory}
                    />
                )}
            </div>
        );
    }

// Desktop Layout
    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Enhanced Desktop Header with Price Intelligence - FIXED BUTTON LAYOUT */}
            <div className="mb-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900">
                            {priceIntelligence.enabled ? '💰📅' : '📅'} Meal Planning</h1>
                        <p className="text-gray-600 mt-1">Plan your meals for the week</p>

                        {/* NEW: Desktop Price Intelligence Summary */}
                        {priceIntelligence.enabled && (
                            <div className="text-sm text-gray-500 mt-1 space-y-1">
                                {priceIntelligence.weeklyBudget > 0 && (
                                    <div className="flex items-center space-x-4">
                                        <span>Budget: {formatPrice(priceIntelligence.weeklyBudget)}</span>
                                        <span>Used: {formatPrice(priceIntelligence.currentCost)} ({priceIntelligence.weeklyBudget > 0 ? ((priceIntelligence.currentCost / priceIntelligence.weeklyBudget) * 100).toFixed(0) : 0}%)</span>
                                        {priceIntelligence.dealOpportunities.length > 0 && (
                                            <span
                                                className="text-green-600">💡 {priceIntelligence.dealOpportunities.length} deals available</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Dietary preferences summary on desktop */}
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

                    {/* Enhanced Action Buttons - Desktop - FIXED GRID LAYOUT */}
                    <div className="flex-shrink-0 ml-6">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            {/* Top row */}
                            <div className="col-span-2">
                                {mealPlan && (
                                    <TemplateLibraryButton
                                        mealPlanId={mealPlan._id}
                                        mealPlanName={mealPlan.name}
                                        onTemplateApplied={handleTemplateApplied}
                                        disabled={false}
                                    />
                                )}
                            </div>

                            {/* Second row */}
                            {mealsPlanned && (
                                <TouchEnhancedButton
                                    onClick={() => setShowShoppingList(true)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-md"
                                    title="Generate shopping list from your meal plan"
                                >
                                    🛒 Smart Shopping
                                </TouchEnhancedButton>
                            )}

                            {/* NEW: Smart Suggestions Button */}
                            {priceIntelligence.enabled && mealPlan && (
                                <TouchEnhancedButton
                                    onClick={generateSmartSuggestions}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-md"
                                    title="Get AI-powered money-saving meal suggestions"
                                >
                                    💡 Smart Ideas
                                </TouchEnhancedButton>
                            )}

                            {/* Third row */}
                            <TouchEnhancedButton
                                onClick={() => setShowVoiceMealPlanning(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-md"
                                title="Plan meals using voice commands"
                            >
                                🎤 Voice Planning
                            </TouchEnhancedButton>

                            <div className="flex items-center space-x-2">
                                {/* NEW: Price Intelligence Toggle */}
                                {priceIntelligence.enabled && (
                                    <TouchEnhancedButton
                                        onClick={() => setPriceIntelligence(prev => ({
                                            ...prev,
                                            showInsights: !prev.showInsights
                                        }))}
                                        className={`p-2 rounded-lg transition-colors ${
                                            priceIntelligence.showInsights
                                                ? 'text-green-600 bg-green-100'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                        }`}
                                        title="Toggle Price Insights"
                                    >
                                        💡
                                    </TouchEnhancedButton>
                                )}

                                <TouchEnhancedButton
                                    onClick={() => setShowWeekSettings(true)}
                                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Settings"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                </TouchEnhancedButton>
                            </div>
                        </div>

                        {/* Fourth row - Meal Prep and Nutrition */}
                        <div className="grid grid-cols-2 gap-3">
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

            {/* NEW: Desktop Price Intelligence Insights Panel */}
            {priceIntelligence.enabled && priceIntelligence.showInsights && (
                <div
                    className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">💡 Smart Insights</h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Budget Status */}
                        <div className="bg-white rounded-lg p-3 border border-green-300">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-green-900">💰 Budget Status</h4>
                                <TouchEnhancedButton
                                    onClick={() => setShowBudgetModal(true)}
                                    className="text-xs text-green-600 hover:text-green-700"
                                >
                                    {priceIntelligence.weeklyBudget === 0 ? 'Set' : 'Edit'}
                                </TouchEnhancedButton>
                            </div>
                            <div className="text-sm text-green-800">
                                {priceIntelligence.weeklyBudget > 0 ? (
                                    <div>
                                        <div>{formatPrice(priceIntelligence.currentCost)} / {formatPrice(priceIntelligence.weeklyBudget)}</div>
                                        <div
                                            className={priceIntelligence.currentCost > priceIntelligence.weeklyBudget ? 'text-red-600' : 'text-green-600'}>
                                            {priceIntelligence.currentCost < priceIntelligence.weeklyBudget ? 'Under budget' : 'Over budget'}
                                        </div>
                                    </div>
                                ) : (
                                    'Set a weekly budget to track spending'
                                )}
                            </div>
                        </div>

                        {/* Inventory Opportunities */}
                        <div className="bg-white rounded-lg p-3 border border-green-300">
                            <h4 className="font-medium text-green-900 mb-2">📦 Use Your Inventory</h4>
                            <div className="text-sm text-green-800">
                                {inventory.length} items available
                            </div>
                            <TouchEnhancedButton
                                onClick={generateSmartSuggestions}
                                className="text-xs text-green-600 hover:text-green-700 mt-2"
                            >
                                Get Suggestions →
                            </TouchEnhancedButton>
                        </div>

                        {/* Current Deals */}
                        <div className="bg-white rounded-lg p-3 border border-green-300">
                            <h4 className="font-medium text-green-900 mb-2">🎯 Best Deals Today</h4>
                            <div className="text-sm text-green-800">
                                {priceIntelligence.dealOpportunities.length > 0 ? (
                                    <>
                                        {priceIntelligence.dealOpportunities.slice(0, 2).map((deal, index) => (
                                            <div key={index} className="mb-1">
                                                {deal.itemName} - {deal.savingsPercent}% off
                                            </div>
                                        ))}
                                        {priceIntelligence.dealOpportunities.length > 2 && (
                                            <div className="text-xs text-green-600 mt-1">
                                                +{priceIntelligence.dealOpportunities.length - 2} more
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    'No special deals detected right now'
                                )}
                            </div>
                        </div>

                        {/* Week Summary */}
                        <div className="bg-white rounded-lg p-3 border border-green-300">
                            <h4 className="font-medium text-green-900 mb-2">📊 Week Summary</h4>
                            <div className="text-sm text-green-800">
                                <div>{Object.keys(mealPlan?.meals || {}).reduce((total, day) => total + (mealPlan.meals[day]?.length || 0), 0)} meals
                                    planned
                                </div>
                                <div>Cost: {formatPrice(priceIntelligence.currentCost)}</div>
                                {priceIntelligence.priceAlerts.length > 0 && (
                                    <div className="text-orange-600">
                                        {priceIntelligence.priceAlerts.length} price alerts
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dietary filtering notification */}
            {dietaryWarningMessage && (
                <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
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

            {/* Enhanced Desktop Calendar Grid */}
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
                                        {/* Existing Meals - with dietary warnings and price info */}
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

            {/* All modals and other components remain the same... */}
            {/* Enhanced Week Settings Modal with Price Intelligence */}
            {showWeekSettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
                            <TouchEnhancedButton
                                onClick={() => setShowWeekSettings(false)}
                                className="text-gray-400 hover:text-gray-600 text-xl"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>

                        <div className="space-y-6">
                            {/* NEW: Price Intelligence Settings */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Price Intelligence:
                                </label>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="price-intelligence-enabled"
                                            checked={priceIntelligence.enabled}
                                            onChange={(e) => updatePricePreferences({enabled: e.target.checked})}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="price-intelligence-enabled"
                                               className="ml-3 text-sm text-gray-700">
                                            Enable price tracking and budget features
                                        </label>
                                    </div>

                                    {priceIntelligence.enabled && (
                                        <div className="ml-7 space-y-2">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="show-insights"
                                                    checked={priceIntelligence.showInsights}
                                                    onChange={(e) => updatePricePreferences({showInsights: e.target.checked})}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor="show-insights" className="ml-3 text-sm text-gray-700">
                                                    Show smart insights panel
                                                </label>
                                            </div>

                                            <div className="mt-3">
                                                <TouchEnhancedButton
                                                    onClick={() => setShowBudgetModal(true)}
                                                    className="text-sm text-indigo-600 hover:text-indigo-700"
                                                >
                                                    {priceIntelligence.weeklyBudget === 0 ? 'Set Weekly Budget' : `Update Budget (${formatPrice(priceIntelligence.weeklyBudget)})`}
                                                </TouchEnhancedButton>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

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

            {/* NEW: Budget Setting Modal */}
            {showBudgetModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Set Weekly Budget</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Weekly Meal Budget
                            </label>
                            <div className="relative">
                                <span
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                <KeyboardOptimizedInput
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={priceIntelligence.weeklyBudget}
                                    onChange={(e) => setPriceIntelligence(prev => ({
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
                                    updateWeeklyBudget(priceIntelligence.weeklyBudget);
                                    setShowBudgetModal(false);
                                }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Save Budget
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Recipe Selection Modal - Enhanced desktop version */}
            {showRecipeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-6xl w-full h-[85vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 flex-shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Select Recipe
                                    for {selectedSlot && getDayName(selectedSlot.day)} {selectedSlot?.mealType}
                                </h3>
                                <TouchEnhancedButton
                                    onClick={() => {
                                        setShowRecipeModal(false);
                                        setSelectedSlot(null);
                                        setRecipeSearchQuery('');
                                        setSelectedRecipeCategory('all');
                                    }}
                                    className="text-gray-400 hover:text-gray-600 text-xl"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>

                            {/* Search and Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Search */}
                                <div className="md:col-span-2">
                                    <KeyboardOptimizedInput
                                        type="text"
                                        placeholder="Search recipes by title, description, tags, or ingredients..."
                                        value={recipeSearchQuery}
                                        onChange={(e) => setRecipeSearchQuery(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>

                                {/* Category Filter */}
                                <div>
                                    <select
                                        value={selectedRecipeCategory}
                                        onChange={(e) => setSelectedRecipeCategory(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-white"
                                    >
                                        <option value="all">All Categories ({recipes.length})</option>
                                        {RECIPE_CATEGORIES.map(category => {
                                            const count = recipes.filter(recipe => categorizeRecipe(recipe) === category.id).length;
                                            return (
                                                <option key={category.id} value={category.id}>
                                                    {category.icon} {category.name} ({count})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Quick Stats */}
                                <div className="text-sm text-gray-600 flex items-center">
                                    Showing {filteredRecipes.length} of {recipes.length} recipes
                                    {(recipeSearchQuery || selectedRecipeCategory !== 'all') && (
                                        <TouchEnhancedButton
                                            onClick={() => {
                                                setRecipeSearchQuery('');
                                                setSelectedRecipeCategory('all');
                                            }}
                                            className="ml-2 text-indigo-600 hover:text-indigo-800 text-xs"
                                        >
                                            Clear
                                        </TouchEnhancedButton>
                                    )}
                                </div>
                            </div>

                            {/* Enhanced Filter Info */}
                            {(recipeSearchQuery || selectedRecipeCategory !== 'all' || filteredRecipes.length < recipes.length) && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                                    <div className="text-sm text-blue-700">
                                        {recipeSearchQuery && (
                                            <span>Search: "{recipeSearchQuery}" • </span>
                                        )}
                                        {selectedRecipeCategory !== 'all' && (
                                            <span>Category: {RECIPE_CATEGORIES.find(c => c.id === selectedRecipeCategory)?.name} • </span>
                                        )}
                                        {filteredRecipes.length < recipes.length && userDietaryRestrictions.length > 0 && (
                                            <span>Dietary filtering applied • </span>
                                        )}
                                        <span>{recipes.length - filteredRecipes.length} recipes filtered out</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Recipe grid area */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {filteredRecipes.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">🍽️</div>
                                    <h4 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h4>
                                    <p className="text-gray-500 mb-4">
                                        {recipes.length === 0
                                            ? "You haven't added any recipes yet."
                                            : "No recipes match your current filters."}
                                    </p>
                                    {(recipeSearchQuery || selectedRecipeCategory !== 'all') && (
                                        <TouchEnhancedButton
                                            onClick={() => {
                                                setRecipeSearchQuery('');
                                                setSelectedRecipeCategory('all');
                                            }}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                        >
                                            Clear all filters
                                        </TouchEnhancedButton>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredRecipes.map(recipe => {
                                        const recipeCategory = categorizeRecipe(recipe);
                                        const categoryInfo = RECIPE_CATEGORIES.find(c => c.id === recipeCategory) || RECIPE_CATEGORIES.find(c => c.id === 'entree');

                                        return (
                                            <TouchEnhancedButton
                                                key={recipe._id}
                                                onClick={() => addMealToSlot(selectedSlot.day, selectedSlot.mealType, recipe)}
                                                className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors h-full flex flex-col"
                                            >
                                                {/* Recipe Header */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{recipe.title}</h4>
                                                        <div className="text-xs text-gray-600 mb-1">
                                                            {categoryInfo.icon} {categoryInfo.name}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Recipe Info */}
                                                <div className="text-sm text-gray-600 mb-3">
                                                    <div className="flex items-center gap-4 mb-1">
                                                        <span>👥 {recipe.servings} servings</span>
                                                        <span>⏱️ {recipe.prepTime + recipe.cookTime} min</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span>📊 {recipe.difficulty}</span>
                                                        {recipe.rating && (
                                                            <span>⭐ {recipe.rating}/5</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                {recipe.description && (
                                                    <div className="text-sm text-gray-500 mb-3 line-clamp-2 flex-1">
                                                        {recipe.description}
                                                    </div>
                                                )}

                                                {/* Ingredients Preview */}
                                                {recipe.ingredients && recipe.ingredients.length > 0 && (
                                                    <div className="text-xs text-gray-500 mb-3">
                                                        <div className="font-medium mb-1">Key ingredients:</div>
                                                        <div className="line-clamp-1">
                                                            {recipe.ingredients.slice(0, 3).map(ingredient => {
                                                                const ingredientName = typeof ingredient === 'string'
                                                                    ? ingredient
                                                                    : ingredient.name || ingredient;
                                                                return ingredientName;
                                                            }).join(', ')}
                                                            {recipe.ingredients.length > 3 && ` +${recipe.ingredients.length - 3} more`}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Tags */}
                                                {recipe.tags && recipe.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-auto">
                                                        {recipe.tags.slice(0, 3).map(tag => (
                                                            <span key={tag}
                                                                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                            {tag}
                                        </span>
                                                        ))}
                                                        {recipe.tags.length > 3 && (
                                                            <span
                                                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                            +{recipe.tags.length - 3}
                                        </span>
                                                        )}
                                                    </div>
                                                )}
                                            </TouchEnhancedButton>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* NEW: Voice Meal Planning Modal */}
            {showVoiceMealPlanning && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">🎤 Voice Meal Planning</h3>
                            <TouchEnhancedButton
                                onClick={() => setShowVoiceMealPlanning(false)}
                                disabled={processingVoiceMeal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>

                        <div className="mb-4">
                            <VoiceInput
                                onResult={handleVoiceMealPlanning}
                                onError={handleVoiceMealError}
                                placeholder="Say what meals you want to plan..."
                            />
                        </div>

                        {/* Processing Status */}
                        {processingVoiceMeal && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                                <div className="text-blue-800 font-medium">
                                    🤖 Processing meal plan...
                                </div>
                                <div className="text-sm text-blue-600 mt-1">
                                    Finding recipes and scheduling meals
                                </div>
                            </div>
                        )}

                        {/* Recent Voice Results */}
                        {voiceMealResults && !processingVoiceMeal && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="text-sm font-medium text-green-800 mb-1">
                                    Last voice command:
                                </div>
                                <div className="text-green-700 italic">
                                    "{voiceMealResults}"
                                </div>
                            </div>
                        )}

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm text-blue-800 mb-2">
                                💡 <strong>Voice Meal Planning Examples:</strong>
                            </p>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• "Add spaghetti to Monday dinner"</li>
                                <li>• "Plan chicken salad for Tuesday lunch"</li>
                                <li>• "Schedule pancakes for Sunday breakfast"</li>
                                <li>• "Put pizza on Friday dinner and tacos on Saturday"</li>
                                <li>• "Add soup to today's lunch"</li>
                                <li>• "Plan stir fry for tomorrow dinner"</li>
                            </ul>
                        </div>

                        {/* Tips */}
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <div className="text-xs text-yellow-800">
                                <strong>💡 Tips:</strong>
                                <ul className="mt-1 space-y-1">
                                    <li>• Say the day (Monday, Tuesday, etc.) or "today"/"tomorrow"</li>
                                    <li>• Include meal type (breakfast, lunch, dinner, snack)</li>
                                    <li>• Use recipe names you have, or describe simple meals</li>
                                    <li>• You can plan multiple meals in one command</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Smart Suggestions Modal */}
            {showSmartSuggestions && (
                <SmartSuggestionsModal
                    isOpen={showSmartSuggestions}
                    onClose={() => setShowSmartSuggestions(false)}
                    suggestions={smartSuggestions}
                    onApplySuggestion={handleApplySuggestion}
                    isLoading={suggestionsLoading}
                    mealPlan={mealPlan}
                    onMealPlanUpdate={handleMealPlanUpdate}
                />
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
                    priceIntelligence={priceIntelligence.enabled} // NEW: Pass price intelligence flag
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

            {/* Meal Completion Modal */}
            {showMealCompletion && selectedMealForCompletion && (
                <MealCompletionModal
                    isOpen={showMealCompletion}
                    onClose={() => {
                        setShowMealCompletion(false);
                        setSelectedMealForCompletion(null);
                    }}
                    onComplete={handleMealCompletion}
                    meal={selectedMealForCompletion.meal}
                    selectedSlot={selectedMealForCompletion}
                    inventory={inventory}
                />
            )}
        </div>
    );
}