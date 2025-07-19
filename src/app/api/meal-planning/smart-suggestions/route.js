// file: /src/app/api/meal-planning/smart-suggestions/route.js v3 - Corrected and Clean

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, MealPlan, UserInventory, User } from '@/lib/models';

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

        // Get user preferences for better suggestions
        const user = await User.findById(session.user.id);
        const userPreferences = user?.preferences || {};

        // Generate comprehensive suggestions
        let suggestions = await generateSmartSuggestions({
            mealPlan,
            inventory,
            dealOpportunities,
            budget,
            preferences: { ...userPreferences, ...preferences },
            userId: session.user.id
        });

        // Enhance suggestions with context and diversify
        suggestions = enhanceSuggestionsWithContext(suggestions, mealPlan, preferences);
        suggestions = diversifySuggestions(suggestions);

        // Calculate total potential savings
        const totalSavings = suggestions.reduce((sum, s) => sum + (s.savings || 0), 0);

        return NextResponse.json({
            success: true,
            suggestions,
            totalSuggestions: suggestions.length,
            potentialSavings: totalSavings,
            metadata: {
                mealPlanId,
                generatedAt: new Date().toISOString(),
                preferences,
                analysisResults: {
                    inventoryItems: inventory.length,
                    dealOpportunities: dealOpportunities.length,
                    weeklyBudget: budget,
                    currentMeals: countMealsInPlan(mealPlan)
                }
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

    try {
        // 1. Inventory-based suggestions (high priority)
        const inventorySuggestions = await generateInventoryBasedSuggestions(
            inventory,
            mealPlan,
            userId,
            preferences
        );
        suggestions.push(...inventorySuggestions);

        // 2. Deal-based suggestions (medium-high priority)
        const dealSuggestions = await generateDealBasedSuggestions(
            dealOpportunities,
            mealPlan,
            userId,
            preferences
        );
        suggestions.push(...dealSuggestions);

        // 3. Budget optimization suggestions (medium priority)
        if (budget && budget > 0) {
            const budgetSuggestions = await generateBudgetOptimizationSuggestions(
                mealPlan,
                budget,
                userId,
                preferences
            );
            suggestions.push(...budgetSuggestions);
        }

        // 4. Seasonal and efficiency suggestions (low-medium priority)
        const seasonalSuggestions = await generateSeasonalSuggestions(mealPlan, userId, preferences);
        suggestions.push(...seasonalSuggestions);

        // 5. Nutrition balance suggestions (low priority)
        const nutritionSuggestions = await generateNutritionSuggestions(mealPlan, userId, preferences);
        suggestions.push(...nutritionSuggestions);

        // 6. Meal prep optimization suggestions
        const mealPrepSuggestions = await generateMealPrepSuggestions(mealPlan, inventory, userId);
        suggestions.push(...mealPrepSuggestions);

        // Sort by priority, urgency, and potential impact
        return suggestions
            .sort((a, b) => {
                // First sort by urgency (high > medium > low)
                const urgencyOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                const urgencyDiff = (urgencyOrder[b.urgency] || 1) - (urgencyOrder[a.urgency] || 1);
                if (urgencyDiff !== 0) return urgencyDiff;

                // Then by priority score
                const priorityDiff = (b.priority || 0) - (a.priority || 0);
                if (priorityDiff !== 0) return priorityDiff;

                // Finally by potential savings
                return (b.savings || 0) - (a.savings || 0);
            })
            .slice(0, 12); // Limit to top 12 suggestions

    } catch (error) {
        console.error('Error in generateSmartSuggestions:', error);
        return [];
    }
}

async function generateInventoryBasedSuggestions(inventory, mealPlan, userId, preferences) {
    const suggestions = [];

    try {
        // Find inventory items that are expiring soon
        const expiringItems = inventory.filter(item => {
            if (!item.expirationDate) return false;
            const daysUntilExpiry = Math.ceil(
                (new Date(item.expirationDate) - new Date()) / (1000 * 60 * 60 * 24)
            );
            return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
        });

        for (const item of expiringItems.slice(0, 5)) { // Limit to 5 most urgent
            try {
                // Use helper function for better recipe matching
                const matchingRecipes = await findRecipesByIngredient(item.name, 5);

                if (matchingRecipes.length > 0) {
                    const daysUntilExpiry = Math.ceil(
                        (new Date(item.expirationDate) - new Date()) / (1000 * 60 * 60 * 24)
                    );

                    suggestions.push({
                        type: 'inventory_expiry',
                        title: `Use ${item.name} before it expires`,
                        description: `${item.name} expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Avoid waste and save money!`,
                        urgency: daysUntilExpiry <= 2 ? 'high' : daysUntilExpiry <= 4 ? 'medium' : 'low',
                        priority: 10 - daysUntilExpiry, // Higher priority for sooner expiry
                        recipes: matchingRecipes.map(r => ({
                            id: r._id,
                            name: r.title,
                            difficulty: r.difficulty,
                            totalTime: (r.prepTime || 0) + (r.cookTime || 0),
                            servings: r.servings,
                            estimatedCost: r.estimatedCost
                        })),
                        savings: parseFloat(item.price) || 5.00, // Avoid waste savings
                        action: 'replace_meal',
                        targetSlots: findAvailableSlots(mealPlan),
                        expiryInfo: {
                            itemName: item.name,
                            daysUntilExpiry,
                            originalPrice: item.price
                        }
                    });
                }
            } catch (error) {
                console.error(`Error processing expiring item ${item.name}:`, error);
            }
        }

        // Find abundance opportunities (items with large quantities)
        const abundantItems = inventory.filter(item => {
            const quantity = parseFloat(item.quantity);
            return !isNaN(quantity) && quantity >= 3; // Threshold for "abundant"
        });

        for (const item of abundantItems.slice(0, 3)) {
            try {
                const batchRecipes = await Recipe.find({
                    'ingredients.name': { $regex: escapeRegex(item.name), $options: 'i' },
                    servings: { $gte: 6 } // Large batch recipes
                }).limit(3);

                if (batchRecipes.length > 0) {
                    suggestions.push({
                        type: 'batch_cooking',
                        title: `Batch cook with your ${item.name}`,
                        description: `You have plenty of ${item.name} (${item.quantity} ${item.unit || 'units'}) - perfect for meal prep!`,
                        urgency: 'medium',
                        priority: 6,
                        recipes: batchRecipes.map(r => ({
                            id: r._id,
                            name: r.title,
                            servings: r.servings,
                            difficulty: r.difficulty,
                            totalTime: (r.prepTime || 0) + (r.cookTime || 0),
                            estimatedCost: r.estimatedCost
                        })),
                        savings: 15.00, // Estimated meal prep savings
                        action: 'meal_prep',
                        benefits: ['Saves time', 'Reduces waste', 'Cost effective', 'Meal prep convenience']
                    });
                }
            } catch (error) {
                console.error(`Error processing abundant item ${item.name}:`, error);
            }
        }

    } catch (error) {
        console.error('Error in generateInventoryBasedSuggestions:', error);
    }

    return suggestions;
}

async function generateDealBasedSuggestions(dealOpportunities, mealPlan, userId, preferences) {
    const suggestions = [];

    try {
        // Sort deals by savings percentage (best deals first)
        const sortedDeals = dealOpportunities
            .sort((a, b) => (b.savingsPercent || 0) - (a.savingsPercent || 0))
            .slice(0, 6); // Top 6 deals

        for (const deal of sortedDeals) {
            try {
                // Use helper function for better recipe matching
                const matchingRecipes = await findRecipesByIngredient(deal.itemName, 4);

                if (matchingRecipes.length > 0) {
                    const savings = deal.savings || (deal.originalPrice - deal.salePrice) || 5.00;

                    suggestions.push({
                        type: 'deal_opportunity',
                        title: `Take advantage of ${deal.itemName} sale`,
                        description: `${deal.itemName} is ${deal.savingsPercent}% off at ${deal.store} - great time to stock up!`,
                        urgency: deal.savingsPercent >= 40 ? 'high' : deal.savingsPercent >= 25 ? 'medium' : 'low',
                        priority: Math.floor(deal.savingsPercent / 10), // Higher savings = higher priority
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
                            totalTime: (r.prepTime || 0) + (r.cookTime || 0),
                            servings: r.servings,
                            estimatedCost: r.estimatedCost
                        })),
                        savings: savings,
                        action: 'replace_meal',
                        targetSlots: findAvailableSlots(mealPlan)
                    });
                }
            } catch (error) {
                console.error(`Error processing deal for ${deal.itemName}:`, error);
            }
        }

    } catch (error) {
        console.error('Error in generateDealBasedSuggestions:', error);
    }

    return suggestions;
}

async function generateBudgetOptimizationSuggestions(mealPlan, budget, userId, preferences) {
    const suggestions = [];

    try {
        const avgCostPerMeal = budget / 21; // 21 meals per week (3 meals × 7 days)
        const budgetFriendlyThreshold = avgCostPerMeal * 0.8; // 80% of average

        // Find budget-friendly recipes
        const budgetRecipes = await Recipe.find({
            $or: [
                { estimatedCost: { $lt: budgetFriendlyThreshold, $gt: 0 } },
                { estimatedCost: { $exists: false } } // Include recipes without cost estimates
            ],
            difficulty: { $in: ['easy', 'medium'] }
        }).limit(8);

        if (budgetRecipes.length > 0) {
            const estimatedSavings = budget * 0.20; // Estimate 20% savings

            // Calculate costs for budget recipes
            const recipesWithCosts = await Promise.all(
                budgetRecipes.map(async (recipe) => {
                    const costData = await calculateRecipeCost(recipe);
                    return {
                        id: recipe._id,
                        name: recipe.title,
                        estimatedCost: costData.costPerServing,
                        difficulty: recipe.difficulty,
                        totalTime: (recipe.prepTime || 0) + (recipe.cookTime || 0),
                        servings: recipe.servings
                    };
                })
            );

            suggestions.push({
                type: 'budget_optimization',
                title: 'Switch to budget-friendly meals',
                description: `Replace expensive meals with these budget options to stay within your $${budget.toFixed(2)} weekly budget`,
                urgency: 'medium',
                priority: 5,
                recipes: recipesWithCosts,
                savings: estimatedSavings,
                action: 'replace_meal',
                budgetImpact: `Could reduce weekly spending by up to ${Math.round((estimatedSavings / budget) * 100)}%`,
                targetSlots: findAvailableSlots(mealPlan)
            });
        }

        // Suggest bulk cooking for budget savings
        const bulkRecipes = await Recipe.find({
            servings: { $gte: 6 },
            difficulty: { $in: ['easy', 'medium'] }
        }).limit(4);

        if (bulkRecipes.length > 0) {
            suggestions.push({
                type: 'budget_optimization',
                title: 'Cook in bulk to save money',
                description: 'Bulk cooking reduces cost per serving and saves time',
                urgency: 'low',
                priority: 4,
                recipes: bulkRecipes.map(r => ({
                    id: r._id,
                    name: r.title,
                    servings: r.servings,
                    difficulty: r.difficulty,
                    estimatedCost: r.estimatedCost
                })),
                savings: budget * 0.15, // Estimate 15% savings from bulk cooking
                action: 'meal_prep',
                benefits: ['Lower cost per serving', 'Time savings', 'Consistent meals']
            });
        }

    } catch (error) {
        console.error('Error in generateBudgetOptimizationSuggestions:', error);
    }

    return suggestions;
}

async function generateSeasonalSuggestions(mealPlan, userId, preferences) {
    const suggestions = [];

    try {
        const currentMonth = new Date().getMonth();

        // Define seasonal ingredients by month
        const seasonalIngredients = {
            spring: ['asparagus', 'peas', 'spinach', 'strawberries', 'artichoke', 'spring onions'],
            summer: ['tomato', 'corn', 'bell pepper', 'zucchini', 'berries', 'cucumber'],
            fall: ['squash', 'pumpkin', 'apple', 'sweet potato', 'brussels sprouts', 'cranberries'],
            winter: ['root vegetables', 'cabbage', 'citrus', 'hearty greens', 'winter squash']
        };

        const currentSeason = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer',
            'summer', 'summer', 'fall', 'fall', 'fall', 'winter'][currentMonth];

        const seasonalItems = seasonalIngredients[currentSeason] || [];

        if (seasonalItems.length > 0) {
            // Create regex patterns for seasonal ingredients
            const seasonalPatterns = seasonalItems.map(item => new RegExp(escapeRegex(item), 'i'));

            const seasonalRecipes = await Recipe.find({
                'ingredients.name': { $in: seasonalPatterns }
            }).limit(6);

            if (seasonalRecipes.length > 0) {
                suggestions.push({
                    type: 'seasonal',
                    title: `Embrace ${currentSeason} flavors`,
                    description: `These recipes feature fresh, seasonal ingredients that are cheaper and at peak flavor`,
                    urgency: 'low',
                    priority: 4,
                    season: currentSeason,
                    recipes: seasonalRecipes.map(r => {
                        const seasonalIngs = r.ingredients.filter(ing =>
                            seasonalItems.some(seasonal =>
                                ing.name.toLowerCase().includes(seasonal.toLowerCase())
                            )
                        );

                        return {
                            id: r._id,
                            name: r.title,
                            seasonalIngredients: seasonalIngs.map(ing => ing.name),
                            difficulty: r.difficulty,
                            totalTime: (r.prepTime || 0) + (r.cookTime || 0),
                            servings: r.servings
                        };
                    }),
                    savings: 12.00, // Estimated seasonal savings
                    action: 'add_meal',
                    benefits: ['Fresh ingredients', 'Better prices', 'Peak flavor', 'Seasonal variety'],
                    targetSlots: findAvailableSlots(mealPlan)
                });
            }
        }

    } catch (error) {
        console.error('Error in generateSeasonalSuggestions:', error);
    }

    return suggestions;
}

async function generateNutritionSuggestions(mealPlan, userId, preferences) {
    const suggestions = [];

    try {
        // Analyze current meal plan for nutrition gaps
        const currentMeals = extractMealsFromPlan(mealPlan);

        // Count vegetable-based meals
        const vegetableKeywords = ['vegetable', 'salad', 'veggie', 'kale', 'spinach', 'broccoli'];
        const vegetableMeals = currentMeals.filter(meal =>
                meal.recipeName && vegetableKeywords.some(keyword =>
                    meal.recipeName.toLowerCase().includes(keyword)
                )
        ).length;

        const totalMeals = currentMeals.length;
        const vegetableRatio = totalMeals > 0 ? vegetableMeals / totalMeals : 0;

        if (vegetableRatio < 0.3) { // Less than 30% vegetable meals
            const vegetableRecipes = await Recipe.find({
                $or: [
                    { title: { $regex: 'vegetable|salad|veggie|kale|spinach|broccoli', $options: 'i' } },
                    { tags: { $in: ['vegetarian', 'healthy', 'vegetables', 'plant-based'] } },
                    { 'ingredients.name': { $regex: 'vegetable|spinach|kale|broccoli|cauliflower', $options: 'i' } }
                ]
            }).limit(5);

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
                        nutritionHighlights: ['High fiber', 'Rich in vitamins', 'Low calorie', 'Antioxidants'],
                        difficulty: r.difficulty,
                        totalTime: (r.prepTime || 0) + (r.cookTime || 0),
                        estimatedCost: r.estimatedCost
                    })),
                    savings: 8.00, // Vegetables often cost less than meat
                    action: 'add_meal',
                    healthBenefits: ['Better nutrition', 'Often lower cost', 'Environmentally friendly', 'Fiber boost'],
                    targetSlots: findAvailableSlots(mealPlan)
                });
            }
        }

        // Check for protein variety
        const proteinKeywords = ['chicken', 'beef', 'fish', 'pork', 'turkey'];
        const proteinCounts = {};
        proteinKeywords.forEach(protein => {
            proteinCounts[protein] = currentMeals.filter(meal =>
                meal.recipeName && meal.recipeName.toLowerCase().includes(protein)
            ).length;
        });

        const dominantProtein = Object.keys(proteinCounts).reduce((a, b) =>
            proteinCounts[a] > proteinCounts[b] ? a : b
        );

        if (proteinCounts[dominantProtein] > totalMeals * 0.5) { // More than 50% same protein
            const alternativeProteins = proteinKeywords.filter(p => p !== dominantProtein);
            const alternativeRecipes = await Recipe.find({
                title: { $regex: alternativeProteins.join('|'), $options: 'i' }
            }).limit(4);

            if (alternativeRecipes.length > 0) {
                suggestions.push({
                    type: 'nutrition_balance',
                    title: 'Add protein variety to your meals',
                    description: `You have a lot of ${dominantProtein} meals. Try these alternatives for better nutrition balance`,
                    urgency: 'low',
                    priority: 2,
                    nutritionGoal: 'Protein variety',
                    recipes: alternativeRecipes.map(r => ({
                        id: r._id,
                        name: r.title,
                        nutritionHighlights: ['Different protein source', 'Varied nutrients', 'Dietary diversity'],
                        difficulty: r.difficulty,
                        totalTime: (r.prepTime || 0) + (r.cookTime || 0)
                    })),
                    savings: 5.00,
                    action: 'replace_meal',
                    healthBenefits: ['Better nutrition balance', 'Varied amino acids', 'Prevents food boredom']
                });
            }
        }

    } catch (error) {
        console.error('Error in generateNutritionSuggestions:', error);
    }

    return suggestions;
}

async function generateMealPrepSuggestions(mealPlan, inventory, userId) {
    const suggestions = [];

    try {
        // Find recipes good for meal prep (high servings, reheats well)
        const mealPrepRecipes = await Recipe.find({
            servings: { $gte: 4 },
            $or: [
                { tags: { $in: ['meal prep', 'freezable', 'make ahead'] } },
                { title: { $regex: 'casserole|stew|soup|curry|chili', $options: 'i' } }
            ]
        }).limit(4);

        if (mealPrepRecipes.length > 0) {
            suggestions.push({
                type: 'meal_prep',
                title: 'Set up meal prep for the week',
                description: 'These recipes are perfect for batch cooking and will save you time and money',
                urgency: 'low',
                priority: 3,
                recipes: mealPrepRecipes.map(r => ({
                    id: r._id,
                    name: r.title,
                    servings: r.servings,
                    difficulty: r.difficulty,
                    totalTime: (r.prepTime || 0) + (r.cookTime || 0),
                    mealPrepNotes: 'Reheats well, stores 3-5 days'
                })),
                savings: 25.00, // Significant meal prep savings
                action: 'meal_prep',
                benefits: ['Saves time during week', 'Portion control', 'Consistent meals', 'Reduces food waste']
            });
        }

        // Check for ingredients that are good for bulk cooking
        const bulkIngredients = inventory.filter(item => {
            const quantity = parseFloat(item.quantity);
            return !isNaN(quantity) && quantity >= 2 &&
                ['rice', 'beans', 'lentils', 'chicken', 'ground beef', 'pasta'].some(bulk =>
                    item.name.toLowerCase().includes(bulk)
                );
        });

        if (bulkIngredients.length > 0) {
            const bulkRecipes = await Recipe.find({
                servings: { $gte: 6 },
                'ingredients.name': {
                    $in: bulkIngredients.map(item => new RegExp(escapeRegex(item.name), 'i'))
                }
            }).limit(3);

            if (bulkRecipes.length > 0) {
                suggestions.push({
                    type: 'batch_cooking',
                    title: 'Bulk cook with your current ingredients',
                    description: `You have bulk ingredients perfect for large batch cooking: ${bulkIngredients.map(i => i.name).join(', ')}`,
                    urgency: 'medium',
                    priority: 5,
                    recipes: bulkRecipes.map(r => ({
                        id: r._id,
                        name: r.title,
                        servings: r.servings,
                        difficulty: r.difficulty,
                        totalTime: (r.prepTime || 0) + (r.cookTime || 0),
                        bulkIngredients: bulkIngredients.filter(item =>
                            r.ingredients.some(ing =>
                                ing.name.toLowerCase().includes(item.name.toLowerCase())
                            )
                        ).map(item => item.name)
                    })),
                    savings: 20.00,
                    action: 'meal_prep',
                    benefits: ['Use bulk ingredients efficiently', 'Multiple meals from one cook', 'Great value per serving']
                });
            }
        }

    } catch (error) {
        console.error('Error in generateMealPrepSuggestions:', error);
    }

    return suggestions;
}

// Helper functions
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
    const mealTypes = ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'];

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

    return availableSlots.slice(0, 8); // Return first 8 available slots
}

function countMealsInPlan(mealPlan) {
    if (!mealPlan.meals) return 0;

    return Object.values(mealPlan.meals).reduce((total, dayMeals) => {
        return total + (Array.isArray(dayMeals) ? dayMeals.length : 0);
    }, 0);
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper function for better recipe matching (now used!)
async function findRecipesByIngredient(ingredientName, limit = 5) {
    try {
        const recipes = await Recipe.find({
            $or: [
                { 'ingredients.name': { $regex: escapeRegex(ingredientName), $options: 'i' } },
                { title: { $regex: escapeRegex(ingredientName), $options: 'i' } },
                { tags: { $in: [new RegExp(escapeRegex(ingredientName), 'i')] } }
            ]
        }).limit(limit);

        return recipes;
    } catch (error) {
        console.error(`Error finding recipes for ingredient ${ingredientName}:`, error);
        return [];
    }
}

// Enhanced function to calculate recipe costs (now used!)
async function calculateRecipeCost(recipe, currentPrices = {}) {
    try {
        let totalCost = 0;

        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            for (const ingredient of recipe.ingredients) {
                const ingredientName = ingredient.name || ingredient;
                const quantity = ingredient.amount || 1;

                // Check if we have current pricing data
                const pricePerUnit = currentPrices[ingredientName.toLowerCase()] ||
                    ingredient.estimatedPrice ||
                    2.00; // Default fallback price

                totalCost += pricePerUnit * quantity;
            }
        }

        // Factor in servings to get cost per serving
        const servings = recipe.servings || 4;
        return {
            totalCost,
            costPerServing: totalCost / servings,
            servings
        };
    } catch (error) {
        console.error('Error calculating recipe cost:', error);
        return {
            totalCost: 0,
            costPerServing: 0,
            servings: recipe.servings || 4
        };
    }
}

// Function to check if suggestions are diverse enough
function diversifySuggestions(suggestions) {
    const typeCount = {};
    const diversified = [];

    // Count suggestions by type
    suggestions.forEach(suggestion => {
        typeCount[suggestion.type] = (typeCount[suggestion.type] || 0) + 1;
    });

    // Limit each type to maximum 3 suggestions
    const typeLimits = {
        'inventory_expiry': 3,
        'deal_opportunity': 3,
        'budget_optimization': 2,
        'seasonal': 2,
        'nutrition_balance': 2,
        'meal_prep': 2,
        'batch_cooking': 2
    };

    const typeCounters = {};

    suggestions.forEach(suggestion => {
        const type = suggestion.type;
        const currentCount = typeCounters[type] || 0;
        const limit = typeLimits[type] || 2;

        if (currentCount < limit) {
            diversified.push(suggestion);
            typeCounters[type] = currentCount + 1;
        }
    });

    return diversified;
}

// Function to enhance suggestions with additional context
function enhanceSuggestionsWithContext(suggestions, mealPlan, preferences) {
    return suggestions.map(suggestion => {
        const enhanced = { ...suggestion };

        // Add time-based context
        const now = new Date();
        const dayOfWeek = now.getDay();
        const hour = now.getHours();

        // Add timing recommendations
        if (suggestion.type === 'meal_prep' && (dayOfWeek === 0 || dayOfWeek === 6)) {
            enhanced.timingNote = 'Perfect timing for weekend meal prep!';
            enhanced.priority += 1;
        }

        if (suggestion.type === 'inventory_expiry' && hour < 12) {
            enhanced.timingNote = 'Great time to prep expiring ingredients!';
        }

        // Add dietary preference alignment
        if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0) {
            const alignedRecipes = enhanced.recipes?.filter(recipe => {
                // Check if recipe aligns with dietary restrictions
                return preferences.dietaryRestrictions.every(restriction => {
                    const restrictionLower = restriction.toLowerCase();
                    const recipeTags = recipe.tags || [];
                    return recipeTags.some(tag =>
                        tag.toLowerCase().includes(restrictionLower)
                    );
                });
            }) || [];

            if (alignedRecipes.length > 0) {
                enhanced.dietaryAlignment = `${alignedRecipes.length} recipes match your ${preferences.dietaryRestrictions.join(', ')} preferences`;
                enhanced.priority += 0.5;
            }
        }

        // Add seasonal bonus
        const currentMonth = now.getMonth();
        const seasons = {
            winter: [11, 0, 1],
            spring: [2, 3, 4],
            summer: [5, 6, 7],
            fall: [8, 9, 10]
        };

        const currentSeason = Object.keys(seasons).find(season =>
            seasons[season].includes(currentMonth)
        );

        if (suggestion.type === 'seasonal' && suggestion.season === currentSeason) {
            enhanced.seasonalBonus = `Perfect for ${currentSeason} season!`;
            enhanced.priority += 0.5;
        }

        return enhanced;
    });
}