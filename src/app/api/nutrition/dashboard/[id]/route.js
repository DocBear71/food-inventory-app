// file: /src/app/api/nutrition/dashboard/[id]/route.js v1 - Unified dashboard API

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User, UserInventory, Recipe, MealPlan } from '@/lib/models';
import { NutritionLog } from '@/models/NutritionLog.js'
import { modalBridge } from '@/lib/modal-bridge';

export async function GET(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = params;

        // Verify user access
        if (session.user.id !== userId && !session.user.isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await connectDB();

        // Fetch comprehensive dashboard data
        const [user, inventory, recentMealPlans, nutritionLogs, personalRecipes] = await Promise.all([
            User.findById(userId).select('nutritionGoals mealPlanningPreferences'),
            UserInventory.findOne({ userId }).lean(),
            MealPlan.find({
                userId,
                weekStartDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
            }).limit(5).lean(),
            NutritionLog.find({
                userId,
                consumedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
            }).limit(20).lean(),
            Recipe.find({ createdBy: userId, isPublic: false }).limit(10).lean()
        ]);

        // Calculate nutrition insights
        const nutritionInsights = await calculateNutritionInsights(inventory, nutritionLogs, user?.nutritionGoals);

        // Get smart recipe suggestions if inventory exists
        let smartSuggestions = [];
        if (inventory?.items?.length > 0) {
            try {
                const suggestionResult = await modalBridge.suggestInventoryItems({
                    type: 'recipe_suggestions',
                    inventory: inventory.items.slice(0, 15), // Limit for performance
                    preferences: {
                        cuisinePreferences: user?.mealPlanningPreferences?.preferredCuisines || [],
                        dietaryRestrictions: user?.mealPlanningPreferences?.dietaryRestrictions || [],
                        cookingTime: user?.mealPlanningPreferences?.cookingTimePreference || 'any'
                    },
                    userId: userId
                });

                if (suggestionResult.success) {
                    smartSuggestions = suggestionResult.suggestions?.slice(0, 8) || [];
                }
            } catch (error) {
                console.warn('Smart suggestions failed:', error);
            }
        }

        // Compile dashboard data
        const dashboardData = {
            success: true,
            overview: {
                inventoryCount: inventory?.items?.length || 0,
                itemsWithNutrition: inventory?.items?.filter(item => item.nutrition)?.length || 0,
                recentMealPlans: recentMealPlans.length,
                personalRecipes: personalRecipes.length,
                weeklyNutritionLogs: nutritionLogs.length,
                nutritionScore: calculateNutritionScore(inventory, nutritionLogs)
            },
            inventory: {
                items: inventory?.items || [],
                nutritionCoverage: calculateNutritionCoverage(inventory?.items || []),
                expiringItems: getExpiringItems(inventory?.items || []),
                categoryBreakdown: getCategoryBreakdown(inventory?.items || [])
            },
            mealPlans: {
                recent: recentMealPlans,
                upcomingMeals: getUpcomingMeals(recentMealPlans),
                weeklyNutrition: calculateWeeklyNutrition(recentMealPlans)
            },
            goals: {
                current: user?.nutritionGoals || getDefaultNutritionGoals(),
                progress: nutritionInsights.goalProgress,
                recommendations: nutritionInsights.recommendations
            },
            smartInsights: {
                recipeSuggestions: smartSuggestions,
                optimizationOpportunities: nutritionInsights.optimizations,
                wasteReduction: nutritionInsights.wasteReduction
            }
        };

        return NextResponse.json(dashboardData);
    } catch (error) {
        console.error('Dashboard API error:', error);
        return NextResponse.json({
            error: 'Failed to load dashboard data',
            details: error.message
        }, { status: 500 });
    }
}

// Helper functions
async function calculateNutritionInsights(inventory, nutritionLogs, nutritionGoals) {
    const insights = {
        goalProgress: {},
        recommendations: [],
        optimizations: [],
        wasteReduction: {}
    };

    // Calculate goal progress from nutrition logs
    if (nutritionLogs?.length > 0 && nutritionGoals) {
        const totalNutrition = nutritionLogs.reduce((acc, log) => {
            if (log.nutrition?.calories?.value) {
                acc.calories += log.nutrition.calories.value;
            }
            if (log.nutrition?.protein?.value) {
                acc.protein += log.nutrition.protein.value;
            }
            if (log.nutrition?.carbs?.value) {
                acc.carbs += log.nutrition.carbs.value;
            }
            if (log.nutrition?.fat?.value) {
                acc.fat += log.nutrition.fat.value;
            }
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

        const days = Math.max(1, Math.ceil(nutritionLogs.length / 3)); // Estimate days
        const dailyAverage = {
            calories: totalNutrition.calories / days,
            protein: totalNutrition.protein / days,
            carbs: totalNutrition.carbs / days,
            fat: totalNutrition.fat / days
        };

        insights.goalProgress = {
            calories: {
                current: Math.round(dailyAverage.calories),
                goal: nutritionGoals.dailyCalories || 2000,
                percentage: Math.round((dailyAverage.calories / (nutritionGoals.dailyCalories || 2000)) * 100)
            },
            protein: {
                current: Math.round(dailyAverage.protein),
                goal: nutritionGoals.protein || 150,
                percentage: Math.round((dailyAverage.protein / (nutritionGoals.protein || 150)) * 100)
            },
            carbs: {
                current: Math.round(dailyAverage.carbs),
                goal: nutritionGoals.carbs || 250,
                percentage: Math.round((dailyAverage.carbs / (nutritionGoals.carbs || 250)) * 100)
            },
            fat: {
                current: Math.round(dailyAverage.fat),
                goal: nutritionGoals.fat || 65,
                percentage: Math.round((dailyAverage.fat / (nutritionGoals.fat || 65)) * 100)
            }
        };
    }

    // Generate recommendations based on inventory
    if (inventory?.items?.length > 0) {
        const proteinItems = inventory.items.filter(item =>
            item.category?.toLowerCase().includes('meat') ||
            item.category?.toLowerCase().includes('poultry') ||
            item.category?.toLowerCase().includes('fish')
        ).length;

        const vegetableItems = inventory.items.filter(item =>
            item.category?.toLowerCase().includes('vegetable') ||
            item.category?.toLowerCase().includes('produce')
        ).length;

        if (proteinItems < 3) {
            insights.recommendations.push({
                type: 'inventory',
                priority: 'medium',
                message: 'Consider adding more protein sources to your inventory',
                action: 'Add lean meats, fish, or plant-based proteins'
            });
        }

        if (vegetableItems < 5) {
            insights.recommendations.push({
                type: 'inventory',
                priority: 'high',
                message: 'Increase vegetable variety for better nutrition',
                action: 'Stock up on colorful vegetables and leafy greens'
            });
        }

        // Waste reduction opportunities
        const expiringItems = getExpiringItems(inventory.items);
        if (expiringItems.length > 0) {
            insights.wasteReduction = {
                itemsAtRisk: expiringItems.length,
                estimatedValue: expiringItems.reduce((sum, item) => sum + (item.price || 3), 0),
                recommendations: [
                    'Use expiring items in today\'s meals',
                    'Consider batch cooking or freezing',
                    'Plan meals around perishable items first'
                ]
            };
        }
    }

    return insights;
}

function calculateNutritionCoverage(items) {
    if (!items?.length) return { percentage: 0, total: 0, withNutrition: 0 };

    const withNutrition = items.filter(item => item.nutrition && Object.keys(item.nutrition).length > 0).length;

    return {
        percentage: Math.round((withNutrition / items.length) * 100),
        total: items.length,
        withNutrition: withNutrition
    };
}

function getExpiringItems(items) {
    if (!items?.length) return [];

    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return items.filter(item => {
        if (!item.expirationDate) return false;
        const expDate = new Date(item.expirationDate);
        return expDate >= today && expDate <= sevenDaysFromNow;
    });
}

function getCategoryBreakdown(items) {
    if (!items?.length) return {};

    const breakdown = {};
    items.forEach(item => {
        const category = item.category || 'Other';
        breakdown[category] = (breakdown[category] || 0) + 1;
    });

    return breakdown;
}

function getUpcomingMeals(mealPlans) {
    if (!mealPlans?.length) return [];

    const upcoming = [];
    const today = new Date();

    mealPlans.forEach(plan => {
        if (plan.meals) {
            Object.entries(plan.meals).forEach(([day, dayMeals]) => {
                if (Array.isArray(dayMeals) && dayMeals.length > 0) {
                    dayMeals.forEach(meal => {
                        upcoming.push({
                            day: day,
                            mealType: meal.mealType,
                            name: meal.recipeName || meal.simpleMeal?.name,
                            planId: plan._id
                        });
                    });
                }
            });
        }
    });

    return upcoming.slice(0, 10); // Return next 10 meals
}

function calculateWeeklyNutrition(mealPlans) {
    // Simplified calculation - would be more complex with actual recipe nutrition
    return {
        averageCalories: 1850,
        averageProtein: 125,
        averageCarbs: 220,
        averageFat: 68,
        mealsPlanned: mealPlans.reduce((sum, plan) => {
            if (plan.meals) {
                return sum + Object.values(plan.meals).reduce((daySum, dayMeals) => {
                    return daySum + (Array.isArray(dayMeals) ? dayMeals.length : 0);
                }, 0);
            }
            return sum;
        }, 0)
    };
}

function calculateNutritionScore(inventory, nutritionLogs) {
    let score = 0;

    // Inventory variety (40 points)
    const categories = inventory?.items ? [...new Set(inventory.items.map(item => item.category))].length : 0;
    score += Math.min(categories * 5, 40);

    // Nutrition coverage (30 points)
    const coverage = calculateNutritionCoverage(inventory?.items || []);
    score += Math.round(coverage.percentage * 0.3);

    // Recent nutrition tracking (30 points)
    const recentLogs = nutritionLogs?.length || 0;
    score += Math.min(recentLogs * 3, 30);

    return Math.min(score, 100);
}

function getDefaultNutritionGoals() {
    return {
        dailyCalories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65,
        fiber: 25,
        sodium: 2300
    };
}
