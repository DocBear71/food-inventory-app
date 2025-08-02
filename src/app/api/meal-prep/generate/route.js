// file: /src/app/api/meal-prep/generate/route.js v2 - Enhanced meal prep analysis

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { MealPlan } from '@/lib/models';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mealPlanId, userPreferences, regenerate } = await request.json();

        if (!mealPlanId) {
            return NextResponse.json({
                error: 'Meal plan ID is required'
            }, { status: 400 });
        }

        await connectDB();

        // Fetch the meal plan
        const mealPlan = await MealPlan.findOne({
            _id: mealPlanId,
            userId: session.user.id
        });

        if (!mealPlan) {
            return NextResponse.json({
                error: 'Meal plan not found'
            }, { status: 404 });
        }

        console.log('📋 Analyzing meal plan:', {
            id: mealPlanId,
            name: mealPlan.name,
            mealsCount: Object.keys(mealPlan.meals || {}).length
        });

        // Generate suggestions based on the meal plan
        const analysisResult = await generateMealPrepSuggestions(mealPlan, userPreferences);

        console.log('📊 Analysis completed:', {
            batchSuggestions: analysisResult.batchCookingSuggestions.length,
            prepSuggestions: analysisResult.ingredientPrepSuggestions.length,
            totalPrepTime: analysisResult.metrics.totalPrepTime,
            timeSaved: analysisResult.metrics.timeSaved
        });

        return NextResponse.json({
            success: true,
            suggestions: analysisResult,
            summary: {
                batchCookingOpportunities: analysisResult.batchCookingSuggestions.length,
                ingredientPrepTasks: analysisResult.ingredientPrepSuggestions.length,
                totalPrepTime: analysisResult.metrics.totalPrepTime,
                estimatedTimeSaved: analysisResult.metrics.timeSaved,
                recipesAffected: analysisResult.metrics.recipesAffected,
                efficiency: analysisResult.metrics.efficiency
            }
        });

    } catch (error) {
        console.error('Error generating meal prep suggestions:', error);
        return NextResponse.json({
            error: 'Failed to generate meal prep suggestions',
            details: error.message
        }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const mealPlanId = searchParams.get('mealPlanId');

        if (!mealPlanId) {
            return NextResponse.json({
                error: 'Meal plan ID is required'
            }, { status: 400 });
        }

        await connectDB();

        // For now, always generate fresh suggestions
        // In the future, you could check for cached suggestions
        return NextResponse.json({
            success: false,
            message: 'No cached meal prep suggestions found'
        });

    } catch (error) {
        console.error('Error fetching meal prep suggestions:', error);
        return NextResponse.json({
            error: 'Failed to fetch meal prep suggestions',
            details: error.message
        }, { status: 500 });
    }
}

// Enhanced meal prep analysis function
async function generateMealPrepSuggestions(mealPlan, userPreferences = {}) {
    const suggestions = {
        batchCookingSuggestions: [],
        ingredientPrepSuggestions: [],
        prepSchedule: [],
        metrics: {
            totalPrepTime: 0,
            timeSaved: 0,
            recipesAffected: 0,
            efficiency: 0
        },
        implementation: {
            completionRate: 0,
            tasksCompleted: []
        }
    };

    if (!mealPlan.meals || Object.keys(mealPlan.meals).length === 0) {
        console.log('ℹ️ No meals found in meal plan');
        return suggestions;
    }

    // Analyze meals for batch cooking opportunities
    const mealsByRecipe = {};
    const ingredientUsage = {};
    let totalMeals = 0;

    // Group meals by recipe and analyze ingredient usage
    Object.entries(mealPlan.meals).forEach(([day, dayMeals]) => {
        if (!Array.isArray(dayMeals)) return;

        dayMeals.forEach(meal => {
            totalMeals++;

            if (meal.entryType === 'recipe' && meal.recipeId) {
                const recipeKey = meal.recipeId.toString();
                if (!mealsByRecipe[recipeKey]) {
                    mealsByRecipe[recipeKey] = {
                        recipeName: meal.recipeName,
                        meals: [],
                        totalServings: 0
                    };
                }
                mealsByRecipe[recipeKey].meals.push({ day, meal });
                mealsByRecipe[recipeKey].totalServings += meal.servings || 4;
            }

            // Analyze simple meals for common ingredients
            if (meal.entryType === 'simple' && meal.simpleMeal?.items) {
                meal.simpleMeal.items.forEach(item => {
                    const ingredient = item.itemName?.toLowerCase();
                    if (ingredient) {
                        if (!ingredientUsage[ingredient]) {
                            ingredientUsage[ingredient] = {
                                recipes: [],
                                totalAmount: 0,
                                days: new Set()
                            };
                        }
                        ingredientUsage[ingredient].recipes.push(meal.simpleMeal.name || 'Simple Meal');
                        ingredientUsage[ingredient].days.add(day);
                        ingredientUsage[ingredient].totalAmount += parseFloat(item.quantity) || 1;
                    }
                });
            }
        });
    });

    console.log('📊 Analysis data:', {
        totalMeals,
        uniqueRecipes: Object.keys(mealsByRecipe).length,
        commonIngredients: Object.keys(ingredientUsage).length
    });

    // Generate batch cooking suggestions for recipes used multiple times
    Object.entries(mealsByRecipe).forEach(([recipeId, recipeData]) => {
        if (recipeData.meals.length >= 2) {
            suggestions.batchCookingSuggestions.push({
                ingredient: recipeData.recipeName,
                totalAmount: `${recipeData.totalServings} servings`,
                recipes: [recipeData.recipeName],
                estimatedPrepTime: Math.min(120, recipeData.meals.length * 30),
                difficulty: 'medium',
                shelfLife: '3-5 days',
                prepInstructions: `Cook ${recipeData.recipeName} in larger batches and portion for ${recipeData.meals.length} meals this week.`,
                storageInstructions: 'Store cooked portions in airtight containers in the refrigerator.',
                timeSaved: (recipeData.meals.length - 1) * 20 // Estimated time saved per additional meal
            });
        }
    });

    // Generate ingredient prep suggestions for commonly used ingredients
    Object.entries(ingredientUsage).forEach(([ingredient, usage]) => {
        if (usage.days.size >= 2) {
            suggestions.ingredientPrepSuggestions.push({
                ingredient: ingredient,
                prepType: getIngredientPrepType(ingredient),
                totalAmount: `${usage.totalAmount} units`,
                recipes: [...new Set(usage.recipes)],
                estimatedPrepTime: Math.min(30, usage.days.size * 10),
                prepInstructions: generatePrepInstructions(ingredient),
                storageMethod: getStorageMethod(ingredient)
            });
        }
    });

    // Generate basic prep schedule
    const preferredPrepDays = userPreferences.preferredPrepDays || ['sunday'];

    if (suggestions.batchCookingSuggestions.length > 0 || suggestions.ingredientPrepSuggestions.length > 0) {
        suggestions.prepSchedule = preferredPrepDays.map(day => ({
            day,
            tasks: [
                ...suggestions.batchCookingSuggestions.map((suggestion, index) => ({
                    taskType: 'batch_cook',
                    description: `Batch cook ${suggestion.ingredient}`,
                    estimatedTime: suggestion.estimatedPrepTime,
                    priority: 'medium',
                    ingredients: [suggestion.ingredient],
                    equipment: ['stove', 'containers']
                })),
                ...suggestions.ingredientPrepSuggestions.map((suggestion, index) => ({
                    taskType: 'ingredient_prep',
                    description: `${suggestion.prepType} ${suggestion.ingredient}`,
                    estimatedTime: suggestion.estimatedPrepTime,
                    priority: 'low',
                    ingredients: [suggestion.ingredient],
                    equipment: ['knife', 'cutting board']
                }))
            ]
        }));
    }

    // Calculate metrics
    suggestions.metrics.totalPrepTime = [
        ...suggestions.batchCookingSuggestions,
        ...suggestions.ingredientPrepSuggestions
    ].reduce((total, suggestion) => total + (suggestion.estimatedPrepTime || 0), 0);

    suggestions.metrics.timeSaved = suggestions.batchCookingSuggestions.reduce((total, suggestion) =>
        total + (suggestion.timeSaved || 0), 0
    );

    suggestions.metrics.recipesAffected = new Set([
        ...suggestions.batchCookingSuggestions.flatMap(s => s.recipes),
        ...suggestions.ingredientPrepSuggestions.flatMap(s => s.recipes)
    ]).size;

    suggestions.metrics.efficiency = suggestions.metrics.timeSaved > 0 ?
        Math.round((suggestions.metrics.timeSaved / suggestions.metrics.totalPrepTime) * 100) : 0;

    return suggestions;
}

function getIngredientPrepType(ingredient) {
    const lowerIngredient = ingredient.toLowerCase();

    if (lowerIngredient.includes('onion') || lowerIngredient.includes('garlic')) {
        return 'Chop';
    } else if (lowerIngredient.includes('carrot') || lowerIngredient.includes('celery')) {
        return 'Dice';
    } else if (lowerIngredient.includes('lettuce') || lowerIngredient.includes('cabbage')) {
        return 'Shred';
    } else if (lowerIngredient.includes('pepper') || lowerIngredient.includes('bell')) {
        return 'Slice';
    } else if (lowerIngredient.includes('herb') || lowerIngredient.includes('cilantro') || lowerIngredient.includes('parsley')) {
        return 'Wash and chop';
    }

    return 'Prep';
}

function generatePrepInstructions(ingredient) {
    const lowerIngredient = ingredient.toLowerCase();

    if (lowerIngredient.includes('onion')) {
        return 'Peel and dice onions, store in airtight container.';
    } else if (lowerIngredient.includes('garlic')) {
        return 'Mince garlic cloves and store in small containers or freeze in ice cube trays with oil.';
    } else if (lowerIngredient.includes('carrot')) {
        return 'Wash, peel, and dice carrots. Store in container with damp paper towel.';
    } else if (lowerIngredient.includes('celery')) {
        return 'Wash and chop celery, store in water to maintain crispness.';
    } else if (lowerIngredient.includes('pepper')) {
        return 'Wash, remove seeds, and slice peppers. Store in airtight container.';
    } else if (lowerIngredient.includes('herb')) {
        return 'Wash, dry thoroughly, and chop herbs. Store between damp paper towels.';
    }

    return `Prepare ${ingredient} in advance and store properly until needed.`;
}

function getStorageMethod(ingredient) {
    const lowerIngredient = ingredient.toLowerCase();

    if (lowerIngredient.includes('herb') || lowerIngredient.includes('lettuce')) {
        return 'Refrigerate between damp paper towels in airtight container.';
    } else if (lowerIngredient.includes('onion') || lowerIngredient.includes('garlic')) {
        return 'Store in airtight container in refrigerator for up to 1 week.';
    } else if (lowerIngredient.includes('celery')) {
        return 'Store in water in refrigerator to maintain crispness.';
    }

    return 'Store in airtight container in refrigerator.';
}