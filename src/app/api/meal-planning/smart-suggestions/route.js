// file: /src/app/api/meal-planning/smart-suggestions/route.js v1 - Generate intelligent meal suggestions

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, MealPlan, UserInventory } from '@/lib/models';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            mealPlanId,
            inventory = [],
            dealOpportunities = [],
            budget = null,
            preferences = {}
        } = await request.json();

        if (!mealPlanId) {
            return NextResponse.json({
                error: 'Meal plan ID is required'
            }, { status: 400 });
        }

        await connectDB();

        // Get the meal plan
        const mealPlan = await MealPlan.findOne({
            _id: mealPlanId,
            userId: session.user.id
        });

        if (!mealPlan) {
            return NextResponse.json({
                error: 'Meal plan not found'
            }, { status: 404 });
        }

        // Generate suggestions
        const suggestions = await generateSmartSuggestions({
            mealPlan,
            inventory,
            dealOpportunities,
            budget,
            preferences,
            userId: session.user.id
        });

        return NextResponse.json({
            success: true,
            suggestions,
            totalSuggestions: suggestions.length,
            potentialSavings: suggestions.reduce((sum, s) => sum + (s.savings || 0), 0),
            metadata: {
                mealPlanId,
                generatedAt: new Date().toISOString(),
                preferences
            }
        });

    } catch (error) {
        console.error('Smart suggestions error:', error);
        return NextResponse.json(
            { error: 'Failed to generate suggestions', details: error.message },
            { status: 500 }
        );
    }
}

async function generateSmartSuggestions({ mealPlan, inventory, dealOpportunities, budget, preferences, userId }) {
    const suggestions = [];

    // 1. Inventory-based suggestions
    const inventorySuggestions = await generateInventoryBasedSuggestions(
        inventory,
        mealPlan,
        userId
    );
    suggestions.push(...inventorySuggestions);

    // 2. Deal-based suggestions
    const dealSuggestions = await generateDealBasedSuggestions(
        dealOpportunities,
        mealPlan,
        userId
    );
    suggestions.push(...dealSuggestions);

    // 3. Budget optimization suggestions
    if (budget && preferences.prioritizeSavings) {
        const budgetSuggestions = await generateBudgetOptimizationSuggestions(
            mealPlan,
            budget,
            userId
        );
        suggestions.push(...budgetSuggestions);
    }

    // 4. Seasonal and efficiency suggestions
    const seasonalSuggestions = await generateSeasonalSuggestions(mealPlan, userId);
    suggestions.push(...seasonalSuggestions);

    // 5. Nutrition balance suggestions
    const nutritionSuggestions = await generateNutritionSuggestions(mealPlan, userId);
    suggestions.push(...nutritionSuggestions);

    // Sort by priority and potential impact
    return suggestions
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, 10); // Limit to top 10 suggestions
}

async function generateInventoryBasedSuggestions(inventory, mealPlan, userId) {
    const suggestions = [];

    // Find inventory items that are expiring soon
    const expiringItems = inventory.filter(item => {
        if (!item.expirationDate) return false;
        const daysUntilExpiry = Math.ceil(
            (new Date(item.expirationDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
    });

    for (const item of expiringItems) {
        // Find recipes that use this ingredient
        const matchingRecipes = await Recipe.find({
            $or: [
                { 'ingredients.name': { $regex: item.name, $options: 'i' } },
                { 'ingredients.name': { $regex: item.name.split(' ')[0], $options: 'i' } }
            ]
        }).limit(3);

        if (matchingRecipes.length > 0) {
            suggestions.push({
                type: 'inventory_expiry',
                title: `Use ${item.name} before it expires`,
                description: `${item.name} expires in ${Math.ceil(
                    (new Date(item.expirationDate) - new Date()) / (1000 * 60 * 60 * 24)
                )} days`,
                urgency: 'high',
                priority: 9,
                recipes: matchingRecipes.map(r => ({
                    id: r._id,
                    name: r.title,
                    difficulty: r.difficulty,
                    totalTime: r.totalTime
                })),
                savings: item.price || 5.00, // Avoid waste savings
                action: 'replace_meal',
                targetSlots: findAvailableSlots(mealPlan)
            });
        }
    }

    // Find abundance opportunities (items with large quantities)
    const abundantItems = inventory.filter(item =>
        item.quantity && parseFloat(item.quantity) > 5
    );

    for (const item of abundantItems.slice(0, 3)) {
        const batchRecipes = await Recipe.find({
            'ingredients.name': { $regex: item.name, $options: 'i' },
            servings: { $gte: 6 } // Large batch recipes
        }).limit(2);

        if (batchRecipes.length > 0) {
            suggestions.push({
                type: 'batch_cooking',
                title: `Batch cook with your ${item.name}`,
                description: `You have plenty of ${item.name} - perfect for meal prep`,
                urgency: 'medium',
                priority: 6,
                recipes: batchRecipes.map(r => ({
                    id: r._id,
                    name: r.title,
                    servings: r.servings,
                    difficulty: r.difficulty
                })),
                savings: 15.00, // Estimated meal prep savings
                action: 'meal_prep',
                benefits: ['Saves time', 'Reduces waste', 'Cost effective']
            });
        }
    }

    return suggestions;
}

async function generateDealBasedSuggestions(dealOpportunities, mealPlan, userId) {
    const suggestions = [];

    for (const deal of dealOpportunities.slice(0, 5)) {
        // Find recipes that use this deal item
        const matchingRecipes = await Recipe.find({
            'ingredients.name': { $regex: deal.itemName, $options: 'i' }
        }).limit(3);

        if (matchingRecipes.length > 0) {
            suggestions.push({
                type: 'deal_opportunity',
                title: `Take advantage of ${deal.itemName} sale`,
                description: `${deal.itemName} is ${deal.savingsPercent}% off at ${deal.store}`,
                urgency: 'medium',
                priority: 7,
                dealInfo: {
                    store: deal.store,
                    originalPrice: deal.originalPrice,
                    salePrice: deal.salePrice,
                    savingsPercent: deal.savingsPercent,
                    validUntil: deal.validUntil
                },
                recipes: matchingRecipes.map(r => ({
                    id: r._id,
                    name: r.title,
                    difficulty: r.difficulty,
                    totalTime: r.totalTime
                })),
                savings: deal.savings || (deal.originalPrice - deal.salePrice),
                action: 'replace_meal',
                targetSlots: findAvailableSlots(mealPlan)
            });
        }
    }

    return suggestions;
}

async function generateBudgetOptimizationSuggestions(mealPlan, budget, userId) {
    const suggestions = [];

    // Find current expensive meals and suggest cheaper alternatives
    const currentMeals = extractMealsFromPlan(mealPlan);

    // Find budget-friendly recipes
    const budgetRecipes = await Recipe.find({
        estimatedCost: { $lt: budget * 0.15 }, // Less than 15% of weekly budget per meal
        difficulty: { $in: ['easy', 'medium'] }
    }).limit(5);

    if (budgetRecipes.length > 0) {
        suggestions.push({
            type: 'budget_optimization',
            title: 'Switch to budget-friendly meals',
            description: `Replace expensive meals with these budget options`,
            urgency: 'low',
            priority: 5,
            recipes: budgetRecipes.map(r => ({
                id: r._id,
                name: r.title,
                estimatedCost: r.estimatedCost,
                difficulty: r.difficulty,
                totalTime: r.totalTime
            })),
            savings: budget * 0.25, // Estimated 25% savings
            action: 'replace_meal',
            budgetImpact: 'Reduces weekly spending by up to 25%'
        });
    }

    return suggestions;
}

async function generateSeasonalSuggestions(mealPlan, userId) {
    const suggestions = [];
    const currentMonth = new Date().getMonth();

    // Define seasonal ingredients
    const seasonalIngredients = {
        spring: ['asparagus', 'peas', 'spinach', 'strawberries', 'artichoke'],
        summer: ['tomato', 'corn', 'bell pepper', 'zucchini', 'berries'],
        fall: ['squash', 'pumpkin', 'apple', 'sweet potato', 'brussels sprouts'],
        winter: ['root vegetables', 'cabbage', 'citrus', 'hearty greens']
    };

    const currentSeason = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer',
        'summer', 'summer', 'fall', 'fall', 'fall', 'winter'][currentMonth];

    const seasonalItems = seasonalIngredients[currentSeason] || [];

    if (seasonalItems.length > 0) {
        // Find recipes using seasonal ingredients
        const seasonalRecipes = await Recipe.find({
            'ingredients.name': {
                $in: seasonalItems.map(item => new RegExp(item, 'i'))
            }
        }).limit(4);

        if (seasonalRecipes.length > 0) {
            suggestions.push({
                type: 'seasonal',
                title: `Embrace ${currentSeason} flavors`,
                description: `These recipes feature fresh, seasonal ingredients that are cheaper and tastier`,
                urgency: 'low',
                priority: 4,
                season: currentSeason,
                recipes: seasonalRecipes.map(r => ({
                    id: r._id,
                    name: r.title,
                    seasonalIngredients: r.ingredients.filter(ing =>
                        seasonalItems.some(seasonal =>
                            ing.name.toLowerCase().includes(seasonal.toLowerCase())
                        )
                    ).map(ing => ing.name),
                    difficulty: r.difficulty
                })),
                savings: 10.00, // Estimated seasonal savings
                action: 'add_meal',
                benefits: ['Fresh ingredients', 'Better prices', 'Peak flavor']
            });
        }
    }

    return suggestions;
}

async function generateNutritionSuggestions(mealPlan, userId) {
    const suggestions = [];

    // Analyze current meal plan for nutrition gaps
    const currentMeals = extractMealsFromPlan(mealPlan);

    // Simple nutrition analysis (in real app, this would be more sophisticated)
    const mealTypes = currentMeals.map(meal => meal.mealType);
    const vegetableCount = currentMeals.filter(meal =>
        meal.recipeName && meal.recipeName.toLowerCase().includes('vegetable')
    ).length;

    if (vegetableCount < 7) { // Less than one veggie meal per day
        const vegetableRecipes = await Recipe.find({
            $or: [
                { title: { $regex: 'vegetable|salad|veggie', $options: 'i' } },
                { tags: { $in: ['vegetarian', 'healthy', 'vegetables'] } }
            ]
        }).limit(3);

        if (vegetableRecipes.length > 0) {
            suggestions.push({
                type: 'nutrition_balance',
                title: 'Add more vegetables to your plan',
                description: 'Boost nutrition and often save money with more vegetable-based meals',
                urgency: 'low',
                priority: 3,
                nutritionGoal: 'More vegetables',
                recipes: vegetableRecipes.map(r => ({
                    id: r._id,
                    name: r.title,
                    nutritionHighlights: ['High fiber', 'Vitamins', 'Low calorie'],
                    difficulty: r.difficulty
                })),
                savings: 8.00, // Vegetables often cost less than meat
                action: 'add_meal',
                healthBenefits: ['Better nutrition', 'Often lower cost', 'Environmentally friendly']
            });
        }
    }

    return suggestions;
}

function extractMealsFromPlan(mealPlan) {
    const meals = [];

    if (mealPlan.meals) {
        Object.entries(mealPlan.meals).forEach(([day, dayMeals]) => {
            if (Array.isArray(dayMeals)) {
                dayMeals.forEach(meal => {
                    meals.push({
                        ...meal,
                        day
                    });
                });
            }
        });
    }

    return meals;
}

function findAvailableSlots(mealPlan) {
    const availableSlots = [];
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];

    days.forEach(day => {
        mealTypes.forEach(mealType => {
            const dayMeals = mealPlan.meals[day] || [];
            const mealsOfType = dayMeals.filter(meal => meal.mealType === mealType);

            if (mealsOfType.length === 0) {
                availableSlots.push({
                    day: day.charAt(0).toUpperCase() + day.slice(1),
                    mealType
                });
            }
        });
    });

    return availableSlots.slice(0, 5); // Return first 5 available slots
}