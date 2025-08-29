// file: /src/lib/nutritionAnalyzer.js v1

import { MealPlan, Recipe, User } from '@/lib/models';

export class NutritionAnalyzer {
    constructor() {
        this.macroNutrients = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sodium'];
        this.microNutrients = ['vitaminC', 'vitaminA', 'calcium', 'iron'];
    }

    // Main analysis function for a meal plan
    async analyzeMealPlan(mealPlanId, userId) {
        try {
            const [mealPlan, user] = await Promise.all([
                MealPlan.findById(mealPlanId).populate({
                    path: 'meals.monday.recipeId meals.tuesday.recipeId meals.wednesday.recipeId meals.thursday.recipeId meals.friday.recipeId meals.saturday.recipeId meals.sunday.recipeId',
                    model: 'Recipe',
                    select: 'title nutrition servings'
                }),
                User.findById(userId).select('nutritionGoals')
            ]);

            if (!mealPlan || !user) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Meal Plan Failed',
                    message: 'Meal plan or user not found'
                });
                return;
            }

            // Calculate daily nutrition for each day
            const dailyNutrition = this.calculateDailyNutrition(mealPlan);

            // Calculate weekly totals and averages
            const weeklyNutrition = this.calculateWeeklyNutrition(dailyNutrition);

            // Compare against goals
            const goalComparison = this.compareAgainstGoals(weeklyNutrition, user.nutritionGoals);

            // Generate insights and recommendations
            const insights = this.generateInsights(weeklyNutrition, goalComparison, dailyNutrition);

            // Calculate nutrition score
            const nutritionScore = this.calculateNutritionScore(goalComparison);

            return {
                success: true,
                analysis: {
                    mealPlanId,
                    weekStartDate: mealPlan.weekStartDate,
                    dailyNutrition,
                    weeklyNutrition,
                    goalComparison,
                    insights,
                    nutritionScore,
                    generatedAt: new Date()
                }
            };

        } catch (error) {
            console.error('Error analyzing meal plan nutrition:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Calculate nutrition for each day of the week
    calculateDailyNutrition(mealPlan) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dailyNutrition = {};

        days.forEach(day => {
            const dayNutrition = this.getEmptyNutritionProfile();
            const meals = mealPlan.meals[day] || [];

            meals.forEach(meal => {
                if (meal.recipeId && meal.recipeId.nutrition) {
                    const recipe = meal.recipeId;
                    const servingMultiplier = (meal.servings || 1) / (recipe.servings || 1);

                    // Add nutrition from this meal to daily totals
                    this.addNutritionToProfile(dayNutrition, recipe.nutrition, servingMultiplier);
                }
            });

            dailyNutrition[day] = {
                ...dayNutrition,
                mealCount: meals.length,
                recipesWithNutrition: meals.filter(meal =>
                    meal.recipeId && meal.recipeId.nutrition &&
                    meal.recipeId.nutrition.calories &&
                    meal.recipeId.nutrition.calories.value > 0
                ).length
            };
        });

        return dailyNutrition;
    }

    // Calculate weekly totals and averages
    calculateWeeklyNutrition(dailyNutrition) {
        const weeklyTotals = this.getEmptyNutritionProfile();
        const days = Object.keys(dailyNutrition);
        let daysWithMeals = 0;

        days.forEach(day => {
            if (dailyNutrition[day].mealCount > 0) {
                daysWithMeals++;
                this.addNutritionToProfile(weeklyTotals, dailyNutrition[day]);
            }
        });

        // Calculate averages
        const weeklyAverages = this.getEmptyNutritionProfile();
        if (daysWithMeals > 0) {
            this.macroNutrients.concat(this.microNutrients).forEach(nutrient => {
                if (weeklyTotals[nutrient]) {
                    weeklyAverages[nutrient] = {
                        ...weeklyTotals[nutrient],
                        value: weeklyTotals[nutrient].value / daysWithMeals
                    };
                }
            });
        }

        return {
            totals: weeklyTotals,
            averages: weeklyAverages,
            daysWithMeals,
            totalDays: 7
        };
    }

    // Compare nutrition against user goals
    compareAgainstGoals(weeklyNutrition, nutritionGoals) {
        const comparison = {};
        const dailyAverages = weeklyNutrition.averages;

        // Map schema fields to goal fields
        const goalMapping = {
            calories: 'dailyCalories',
            protein: 'protein',
            fat: 'fat',
            carbs: 'carbs',
            fiber: 'fiber',
            sodium: 'sodium'
        };

        Object.keys(goalMapping).forEach(nutrient => {
            const goalField = goalMapping[nutrient];
            const goal = nutritionGoals[goalField] || 0;
            const actual = dailyAverages[nutrient]?.value || 0;

            if (goal > 0) {
                const percentage = (actual / goal) * 100;
                const difference = actual - goal;

                comparison[nutrient] = {
                    goal,
                    actual,
                    percentage: Math.round(percentage * 10) / 10,
                    difference: Math.round(difference * 10) / 10,
                    status: this.getGoalStatus(percentage, nutrient),
                    unit: dailyAverages[nutrient]?.unit || ''
                };
            }
        });

        return comparison;
    }

    // Determine goal achievement status
    getGoalStatus(percentage, nutrient) {
        // Different nutrients have different "good" ranges
        if (nutrient === 'sodium') {
            // For sodium, lower is generally better
            if (percentage <= 100) return 'excellent';
            if (percentage <= 120) return 'good';
            if (percentage <= 150) return 'warning';
            return 'over';
        } else if (nutrient === 'calories') {
            // For calories, closer to goal is better
            if (percentage >= 90 && percentage <= 110) return 'excellent';
            if (percentage >= 80 && percentage <= 120) return 'good';
            if (percentage < 80) return 'under';
            return 'over';
        } else {
            // For protein, fiber, etc., meeting or exceeding is good
            if (percentage >= 100) return 'excellent';
            if (percentage >= 80) return 'good';
            if (percentage >= 60) return 'warning';
            return 'under';
        }
    }

    // Generate insights and recommendations
    generateInsights(weeklyNutrition, goalComparison, dailyNutrition) {
        const insights = {
            highlights: [],
            concerns: [],
            recommendations: [],
            trends: []
        };

        // Analyze goal achievements
        Object.keys(goalComparison).forEach(nutrient => {
            const comp = goalComparison[nutrient];

            switch (comp.status) {
                case 'excellent':
                    insights.highlights.push({
                        type: 'achievement',
                        nutrient,
                        message: `Great job! You're hitting your ${nutrient} goal perfectly (${comp.percentage}% of target).`,
                        icon: '🎯'
                    });
                    break;

                case 'under':
                    insights.concerns.push({
                        type: 'deficiency',
                        nutrient,
                        message: `You're getting only ${comp.percentage}% of your ${nutrient} goal. Consider adding more ${this.getNutrientSources(nutrient)}.`,
                        icon: '⚠️',
                        priority: comp.percentage < 50 ? 'high' : 'medium'
                    });
                    break;

                case 'over':
                    if (nutrient === 'sodium' || nutrient === 'calories') {
                        insights.concerns.push({
                            type: 'excess',
                            nutrient,
                            message: `You're consuming ${comp.percentage}% of your ${nutrient} goal. Consider reducing ${this.getNutrientSources(nutrient, 'reduce')}.`,
                            icon: '📈',
                            priority: comp.percentage > 150 ? 'high' : 'medium'
                        });
                    }
                    break;
            }
        });

        // Analyze daily consistency
        const consistency = this.analyzeConsistency(dailyNutrition);
        if (consistency.highVariability.length > 0) {
            insights.trends.push({
                type: 'consistency',
                message: `Your ${consistency.highVariability.join(', ')} intake varies significantly day to day. Try to maintain more consistent eating patterns.`,
                icon: '📊'
            });
        }

        // Generate specific recommendations
        this.generateRecommendations(insights, goalComparison, weeklyNutrition);

        return insights;
    }

    // Generate specific recommendations
    generateRecommendations(insights, goalComparison, weeklyNutrition) {
        // Protein recommendations
        if (goalComparison.protein?.status === 'under') {
            insights.recommendations.push({
                category: 'protein',
                suggestion: 'Add a protein-rich snack like Greek yogurt, nuts, or a protein smoothie',
                impact: 'Could increase daily protein by 15-25g',
                difficulty: 'easy'
            });
        }

        // Fiber recommendations
        if (goalComparison.fiber?.status === 'under') {
            insights.recommendations.push({
                category: 'fiber',
                suggestion: 'Include more whole grains, beans, fruits, and vegetables in your meals',
                impact: 'Could boost daily fiber by 10-15g',
                difficulty: 'moderate'
            });
        }

        // Sodium recommendations
        if (goalComparison.sodium?.status === 'over') {
            insights.recommendations.push({
                category: 'sodium',
                suggestion: 'Use fresh herbs and spices instead of salt, choose low-sodium alternatives',
                impact: 'Could reduce daily sodium by 500-1000mg',
                difficulty: 'easy'
            });
        }

        // Calorie balance recommendations
        if (goalComparison.calories?.status === 'under') {
            insights.recommendations.push({
                category: 'calories',
                suggestion: 'Add healthy calorie-dense foods like avocado, nuts, or olive oil',
                impact: `Could increase daily calories by ${Math.abs(goalComparison.calories.difference)}`,
                difficulty: 'easy'
            });
        }

        // Meal planning recommendations
        if (weeklyNutrition.daysWithMeals < 7) {
            insights.recommendations.push({
                category: 'planning',
                suggestion: `Plan meals for all 7 days (currently ${weeklyNutrition.daysWithMeals} days planned)`,
                impact: 'Better nutrition tracking and goal achievement',
                difficulty: 'moderate'
            });
        }
    }

    // Analyze consistency across days
    analyzeConsistency(dailyNutrition) {
        const nutrients = ['calories', 'protein', 'carbs', 'fat'];
        const highVariability = [];

        nutrients.forEach(nutrient => {
            const values = Object.values(dailyNutrition)
                .map(day => day[nutrient]?.value || 0)
                .filter(val => val > 0);

            if (values.length > 2) {
                const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
                const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
                const stdDev = Math.sqrt(variance);
                const coefficientOfVariation = (stdDev / avg) * 100;

                // If CV > 30%, it's considered high variability
                if (coefficientOfVariation > 30) {
                    highVariability.push(nutrient);
                }
            }
        });

        return { highVariability };
    }

    // Calculate overall nutrition score (0-100)
    calculateNutritionScore(goalComparison) {
        const scores = Object.values(goalComparison).map(comp => {
            switch (comp.status) {
                case 'excellent': return 100;
                case 'good': return 80;
                case 'warning': return 60;
                case 'under': return Math.max(comp.percentage * 0.8, 20);
                case 'over':
                    // Penalize excess differently for different nutrients
                    if (comp.nutrient === 'sodium') {
                        return Math.max(100 - (comp.percentage - 100) * 0.5, 20);
                    }
                    return Math.max(100 - (comp.percentage - 100) * 0.3, 40);
                default: return 50;
            }
        });

        return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    }

    // Get food sources for nutrients
    getNutrientSources(nutrient, action = 'increase') {
        const sources = {
            protein: action === 'increase'
                ? 'lean meats, fish, eggs, beans, nuts, or Greek yogurt'
                : 'smaller portions of meat and dairy',
            fiber: action === 'increase'
                ? 'whole grains, fruits, vegetables, and legumes'
                : 'refined grains instead of whole grains',
            calcium: 'dairy products, leafy greens, or fortified foods',
            iron: 'lean meats, spinach, beans, or fortified cereals',
            sodium: action === 'reduce'
                ? 'processed foods, restaurant meals, and added salt'
                : 'naturally sodium-containing foods',
            calories: action === 'increase'
                ? 'healthy fats like nuts, avocado, and olive oil'
                : 'portion sizes and high-calorie snacks'
        };

        return sources[nutrient] || `${nutrient}-rich foods`;
    }

    // Helper: Get empty nutrition profile
    getEmptyNutritionProfile() {
        return {
            calories: { value: 0, unit: 'kcal', name: 'Calories' },
            protein: { value: 0, unit: 'g', name: 'Protein' },
            fat: { value: 0, unit: 'g', name: 'Fat' },
            carbs: { value: 0, unit: 'g', name: 'Carbohydrates' },
            fiber: { value: 0, unit: 'g', name: 'Fiber' },
            sodium: { value: 0, unit: 'mg', name: 'Sodium' },
            vitaminC: { value: 0, unit: 'mg', name: 'Vitamin C' },
            vitaminA: { value: 0, unit: 'IU', name: 'Vitamin A' },
            calcium: { value: 0, unit: 'mg', name: 'Calcium' },
            iron: { value: 0, unit: 'mg', name: 'Iron' }
        };
    }

    // Helper: Add nutrition from one profile to another
    addNutritionToProfile(targetProfile, sourceProfile, multiplier = 1) {
        this.macroNutrients.concat(this.microNutrients).forEach(nutrient => {
            if (sourceProfile[nutrient] && typeof sourceProfile[nutrient].value === 'number') {
                targetProfile[nutrient].value += sourceProfile[nutrient].value * multiplier;
            }
        });
    }

    // Update meal plan with calculated weekly nutrition
    async updateMealPlanNutrition(mealPlanId, weeklyNutrition) {
        try {
            await MealPlan.findByIdAndUpdate(mealPlanId, {
                weeklyNutrition: {
                    totalCalories: weeklyNutrition.totals.calories.value,
                    averageDailyCalories: weeklyNutrition.averages.calories.value,
                    protein: weeklyNutrition.totals.protein.value,
                    carbs: weeklyNutrition.totals.carbs.value,
                    fat: weeklyNutrition.totals.fat.value,
                    fiber: weeklyNutrition.totals.fiber.value,
                    lastCalculated: new Date()
                }
            });
        } catch (error) {
            console.error('Error updating meal plan nutrition:', error);
        }
    }
}

// Factory function
export function createNutritionAnalyzer() {
    return new NutritionAnalyzer();
}