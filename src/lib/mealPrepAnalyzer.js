// file: /src/lib/mealPrepAnalyzer.js v1

import { MealPlan, Recipe, MealPrepSuggestion, MealPrepKnowledge } from '@/lib/models';

// Meal prep knowledge base - common ingredients and their prep characteristics
const MEAL_PREP_KNOWLEDGE = {
    // Proteins that batch cook well
    proteins: {
        'chicken breast': {
            methods: ['oven_bake', 'grill', 'slow_cook'],
            maxBatchSize: '5-6 lbs',
            prepTime: 15, // minutes per batch
            cookTime: 25, // minutes per lb
            shelfLife: '3-4 days',
            storageInstructions: 'Refrigerate in airtight container, slice when ready to use',
            reheatingMethods: ['microwave', 'oven', 'stovetop'],
            tips: ['Season well before cooking', 'Let rest 5 minutes before slicing', 'Cook to 165°F internal temp']
        },
        'ground beef': {
            methods: ['stovetop_brown', 'oven_cook'],
            maxBatchSize: '3-4 lbs',
            prepTime: 10,
            cookTime: 15,
            shelfLife: '3-4 days',
            storageInstructions: 'Drain fat, cool completely before refrigerating',
            reheatingMethods: ['microwave', 'stovetop'],
            tips: ['Brown in batches for better texture', 'Season after browning', 'Drain excess fat']
        },
        'chicken thighs': {
            methods: ['oven_bake', 'slow_cook'],
            maxBatchSize: '4-5 lbs',
            prepTime: 10,
            cookTime: 35,
            shelfLife: '3-4 days',
            storageInstructions: 'Store with skin on if possible, refrigerate in cooking juices',
            reheatingMethods: ['oven', 'stovetop'],
            tips: ['Crispy skin holds up well', 'More forgiving than breast meat']
        },
        'pork tenderloin': {
            methods: ['oven_roast', 'grill'],
            maxBatchSize: '3-4 pieces',
            prepTime: 15,
            cookTime: 20,
            shelfLife: '3-4 days',
            storageInstructions: 'Slice when ready to serve, store whole if possible',
            reheatingMethods: ['oven', 'stovetop'],
            tips: ['Marinate for better flavor', 'Don\'t overcook - very lean']
        },
        'beef sirloin': {
            methods: ['oven_roast', 'grill', 'stovetop_sear'],
            maxBatchSize: '3-4 lbs',
            prepTime: 20,
            cookTime: 25,
            shelfLife: '3-4 days',
            storageInstructions: 'Slice against grain when ready to serve',
            reheatingMethods: ['stovetop', 'oven'],
            tips: ['Let come to room temp before cooking', 'Rest after cooking']
        }
    },

    // Vegetables that prep well
    vegetables: {
        'onion': {
            prepMethods: ['dice', 'slice', 'rough_chop'],
            prepTime: 2, // minutes per onion
            shelfLife: '5-7 days',
            storageMethod: 'Airtight container in refrigerator',
            tips: ['Dice extra for multiple recipes', 'Store diced onions separately by size']
        },
        'bell pepper': {
            prepMethods: ['slice', 'dice', 'julienne'],
            prepTime: 3,
            shelfLife: '4-5 days',
            storageMethod: 'Airtight container, paper towel to absorb moisture',
            tips: ['Remove seeds and membranes', 'Different colors can be prepped together']
        },
        'carrots': {
            prepMethods: ['slice', 'dice', 'julienne', 'shred'],
            prepTime: 5, // per cup
            shelfLife: '5-7 days',
            storageMethod: 'Submerged in water in refrigerator',
            tips: ['Keep in water to maintain crispness', 'Peel before cutting']
        },
        'broccoli': {
            prepMethods: ['florets', 'rough_chop'],
            prepTime: 8, // per head
            shelfLife: '3-4 days',
            storageMethod: 'Dry storage in refrigerator',
            tips: ['Don\'t wash until ready to use', 'Cut florets uniform size']
        },
        'garlic': {
            prepMethods: ['mince', 'chop', 'whole_cloves'],
            prepTime: 1, // per clove
            shelfLife: '3-4 days minced, 1 week whole',
            storageMethod: 'Airtight container, whole cloves in pantry',
            tips: ['Minced garlic loses potency quickly', 'Remove green germ from center']
        }
    },

    // Grains and starches
    grains: {
        'rice': {
            batchMethods: ['rice_cooker', 'stovetop', 'oven'],
            maxBatchSize: '6-8 cups dry',
            prepTime: 5,
            cookTime: 20,
            shelfLife: '4-5 days',
            storageInstructions: 'Cool completely, refrigerate in portions',
            reheatingMethods: ['microwave', 'stovetop'],
            tips: ['Add a splash of water when reheating', 'Freeze portions for longer storage']
        },
        'pasta': {
            batchMethods: ['large_pot_boiling'],
            maxBatchSize: '2-3 lbs dry',
            prepTime: 5,
            cookTime: 12,
            shelfLife: '3-4 days',
            storageInstructions: 'Toss with oil to prevent sticking, refrigerate',
            reheatingMethods: ['boiling_water', 'microwave'],
            tips: ['Slightly undercook for reheating', 'Rinse with cold water to stop cooking']
        },
        'quinoa': {
            batchMethods: ['stovetop', 'rice_cooker'],
            maxBatchSize: '4-6 cups dry',
            prepTime: 5,
            cookTime: 15,
            shelfLife: '4-5 days',
            storageInstructions: 'Fluff and cool completely before storing',
            reheatingMethods: ['microwave', 'stovetop'],
            tips: ['Rinse before cooking', 'Let steam after cooking for fluffiness']
        }
    }
};

// Analysis functions
class MealPrepAnalyzer {
    constructor() {
        this.knowledgeBase = MEAL_PREP_KNOWLEDGE;
    }

    // Main analysis function
    async analyzeMealPlan(mealPlanId, userPreferences = {}) {
        try {
            // Fetch meal plan with populated recipes
            const mealPlan = await MealPlan.findById(mealPlanId)
                .populate({
                    path: 'meals.monday.recipeId meals.tuesday.recipeId meals.wednesday.recipeId meals.thursday.recipeId meals.friday.recipeId meals.saturday.recipeId meals.sunday.recipeId',
                    model: 'Recipe'
                });

            if (!mealPlan) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Meal Plan Failed',
                    message: 'Meal plan not found'
                });
                return;
            }

            // Extract all recipes from the meal plan
            const allRecipes = this.extractRecipesFromMealPlan(mealPlan);

            // Analyze ingredients across all recipes
            const ingredientAnalysis = this.analyzeIngredients(allRecipes);

            // Generate batch cooking suggestions
            const batchSuggestions = this.generateBatchCookingSuggestions(ingredientAnalysis);

            // Generate ingredient prep suggestions
            const prepSuggestions = this.generateIngredientPrepSuggestions(ingredientAnalysis);

            // Create prep schedule
            const prepSchedule = this.createPrepSchedule(batchSuggestions, prepSuggestions, userPreferences);

            // Calculate metrics
            const metrics = this.calculateMetrics(batchSuggestions, prepSuggestions, prepSchedule);

            return {
                mealPlanId,
                batchCookingSuggestions: batchSuggestions,
                ingredientPrepSuggestions: prepSuggestions,
                prepSchedule,
                metrics,
                weekStartDate: mealPlan.weekStartDate
            };

        } catch (error) {
            console.error('Error analyzing meal plan:', error);
            throw error;
        }
    }

    // Extract all recipes from meal plan
    extractRecipesFromMealPlan(mealPlan) {
        const recipes = [];
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        days.forEach(day => {
            if (mealPlan.meals[day] && Array.isArray(mealPlan.meals[day])) {
                mealPlan.meals[day].forEach(meal => {
                    if (meal.recipeId && meal.recipeId.ingredients) {
                        recipes.push({
                            ...meal.recipeId.toObject(),
                            servings: meal.servings || meal.recipeId.servings || 4,
                            scheduledDay: day,
                            mealType: meal.mealType
                        });
                    }
                });
            }
        });

        return recipes;
    }

    // Analyze ingredients for batch cooking opportunities
    analyzeIngredients(recipes) {
        const ingredientMap = new Map();

        recipes.forEach(recipe => {
            if (!recipe.ingredients) return;

            recipe.ingredients.forEach(ingredient => {
                const normalizedName = this.normalizeIngredientName(ingredient.name);
                const key = normalizedName;

                if (ingredientMap.has(key)) {
                    const existing = ingredientMap.get(key);
                    existing.recipes.push(recipe.title);
                    existing.totalAmount = this.combineAmounts(existing.totalAmount, ingredient.amount);
                    existing.usageCount += 1;
                } else {
                    ingredientMap.set(key, {
                        name: ingredient.name,
                        normalizedName,
                        amount: ingredient.amount || '',
                        unit: ingredient.unit || '',
                        totalAmount: ingredient.amount || '',
                        recipes: [recipe.title],
                        category: this.categorizeIngredient(ingredient.name),
                        usageCount: 1,
                        originalIngredients: [ingredient]
                    });
                }
            });
        });

        return Array.from(ingredientMap.values());
    }

    // Generate batch cooking suggestions
    generateBatchCookingSuggestions(ingredientAnalysis) {
        const suggestions = [];

        ingredientAnalysis.forEach(ingredient => {
            // Only suggest batch cooking for ingredients used in 2+ recipes
            if (ingredient.usageCount < 2) return;

            const knowledge = this.getIngredientKnowledge(ingredient.normalizedName);
            if (!knowledge || !knowledge.methods) return;

            // Determine if this ingredient is suitable for batch cooking
            if (this.isSuitableForBatchCooking(ingredient, knowledge)) {
                const suggestion = {
                    ingredient: ingredient.name,
                    totalAmount: ingredient.totalAmount,
                    unit: ingredient.unit,
                    recipes: ingredient.recipes,
                    cookingMethod: knowledge.methods[0], // Use first/preferred method
                    prepInstructions: this.generateBatchPrepInstructions(ingredient, knowledge),
                    storageInstructions: knowledge.storageInstructions || 'Refrigerate in airtight container',
                    shelfLife: knowledge.shelfLife || '3-4 days',
                    estimatedPrepTime: this.calculatePrepTime(ingredient, knowledge),
                    difficulty: this.assessDifficulty(ingredient, knowledge)
                };

                suggestions.push(suggestion);
            }
        });

        return suggestions.sort((a, b) => b.recipes.length - a.recipes.length); // Sort by impact
    }

    // Generate ingredient prep suggestions
    generateIngredientPrepSuggestions(ingredientAnalysis) {
        const suggestions = [];

        ingredientAnalysis.forEach(ingredient => {
            if (ingredient.usageCount < 2) return;

            const vegKnowledge = this.knowledgeBase.vegetables[ingredient.normalizedName];
            if (!vegKnowledge) return;

            const suggestion = {
                ingredient: ingredient.name,
                totalAmount: ingredient.totalAmount,
                prepType: vegKnowledge.prepMethods[0], // Use first method
                recipes: ingredient.recipes,
                prepInstructions: this.generatePrepInstructions(ingredient, vegKnowledge),
                storageMethod: vegKnowledge.storageMethod,
                estimatedPrepTime: this.calculateVegPrepTime(ingredient, vegKnowledge)
            };

            suggestions.push(suggestion);
        });

        return suggestions;
    }

    // Create optimal prep schedule
    createPrepSchedule(batchSuggestions, prepSuggestions, userPreferences) {
        const schedule = [];
        const preferredDays = userPreferences.preferredPrepDays || ['sunday'];
        const maxPrepTime = userPreferences.maxPrepTime || 180; // 3 hours default

        // Distribute tasks across preferred days
        preferredDays.forEach((day, index) => {
            const daySchedule = {
                day,
                tasks: []
            };

            // Add batch cooking tasks (higher priority)
            if (index === 0) { // Primary prep day gets batch cooking
                batchSuggestions.forEach(suggestion => {
                    daySchedule.tasks.push({
                        taskType: 'batch_cook',
                        description: `Batch cook ${suggestion.totalAmount} ${suggestion.ingredient}`,
                        estimatedTime: suggestion.estimatedPrepTime,
                        priority: 'high',
                        ingredients: [suggestion.ingredient],
                        equipment: this.getRequiredEquipment(suggestion)
                    });
                });
            }

            // Add ingredient prep tasks
            prepSuggestions.forEach((suggestion, idx) => {
                if (idx % preferredDays.length === index) { // Distribute across days
                    daySchedule.tasks.push({
                        taskType: 'ingredient_prep',
                        description: `Prep ${suggestion.totalAmount} ${suggestion.ingredient}`,
                        estimatedTime: suggestion.estimatedPrepTime,
                        priority: 'medium',
                        ingredients: [suggestion.ingredient],
                        equipment: ['cutting board', 'knife']
                    });
                }
            });

            // Only add day if it has tasks
            if (daySchedule.tasks.length > 0) {
                schedule.push(daySchedule);
            }
        });

        return schedule;
    }

    // Calculate prep metrics
    calculateMetrics(batchSuggestions, prepSuggestions, prepSchedule) {
        const totalPrepTime = prepSchedule.reduce((total, day) =>
            total + day.tasks.reduce((dayTotal, task) => dayTotal + (task.estimatedTime || 0), 0), 0
        );

        const recipesAffected = new Set([
            ...batchSuggestions.flatMap(s => s.recipes),
            ...prepSuggestions.flatMap(s => s.recipes)
        ]).size;

        const ingredientsConsolidated = batchSuggestions.length + prepSuggestions.length;

        // Estimate time saved during the week
        const timeSaved = Math.floor(totalPrepTime * 0.4); // Conservative 40% savings estimate

        return {
            totalPrepTime,
            timeSaved,
            efficiency: timeSaved > 0 ? Math.min(Math.floor((timeSaved / totalPrepTime) * 100), 100) : 0,
            recipesAffected,
            ingredientsConsolidated
        };
    }

    // Helper methods
    normalizeIngredientName(name) {
        return name.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b(fresh|dried|minced|chopped|sliced|diced|whole|ground|crushed)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    categorizeIngredient(ingredient) {
        const normalized = this.normalizeIngredientName(ingredient);

        if (this.knowledgeBase.proteins[normalized]) return 'protein';
        if (this.knowledgeBase.vegetables[normalized]) return 'vegetable';
        if (this.knowledgeBase.grains[normalized]) return 'grain';

        // Fallback categorization
        const proteinKeywords = ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp'];
        const vegetableKeywords = ['onion', 'pepper', 'tomato', 'carrot', 'broccoli', 'spinach'];
        const grainKeywords = ['rice', 'pasta', 'quinoa', 'bread', 'noodles'];

        for (const keyword of proteinKeywords) {
            if (normalized.includes(keyword)) return 'protein';
        }
        for (const keyword of vegetableKeywords) {
            if (normalized.includes(keyword)) return 'vegetable';
        }
        for (const keyword of grainKeywords) {
            if (normalized.includes(keyword)) return 'grain';
        }

        return 'other';
    }

    getIngredientKnowledge(normalizedName) {
        return this.knowledgeBase.proteins[normalizedName] ||
            this.knowledgeBase.vegetables[normalizedName] ||
            this.knowledgeBase.grains[normalizedName];
    }

    isSuitableForBatchCooking(ingredient, knowledge) {
        // Check if ingredient is a protein or grain (better for batch cooking)
        const category = this.categorizeIngredient(ingredient.name);
        return category === 'protein' || category === 'grain';
    }

    generateBatchPrepInstructions(ingredient, knowledge) {
        const method = knowledge.methods[0];
        const baseInstructions = {
            'oven_bake': `Preheat oven to 375°F. Season ${ingredient.name} and bake until cooked through.`,
            'slow_cook': `Add ${ingredient.name} to slow cooker with seasonings. Cook on low 6-8 hours.`,
            'stovetop_brown': `Heat oil in large pan. Brown ${ingredient.name} in batches until cooked through.`,
            'grill': `Preheat grill to medium-high. Grill ${ingredient.name} until cooked through.`,
            'oven_roast': `Preheat oven to 400°F. Roast ${ingredient.name} until internal temp reaches safe level.`
        };

        return baseInstructions[method] || `Cook ${ingredient.name} using preferred method.`;
    }

    generatePrepInstructions(ingredient, vegKnowledge) {
        const prepType = vegKnowledge.prepMethods[0];
        const instructions = {
            'dice': `Wash and peel if needed. Dice ${ingredient.name} into uniform pieces.`,
            'slice': `Wash and trim ${ingredient.name}. Slice into even pieces.`,
            'chop': `Wash and prepare ${ingredient.name}. Chop into desired size.`,
            'mince': `Peel and mince ${ingredient.name} finely.`,
            'julienne': `Wash and trim ${ingredient.name}. Cut into thin matchsticks.`
        };

        return instructions[prepType] || `Prep ${ingredient.name} as needed for recipes.`;
    }

    calculatePrepTime(ingredient, knowledge) {
        const baseTime = knowledge.prepTime || 15;
        const multiplier = this.estimateQuantityMultiplier(ingredient.totalAmount);
        return Math.ceil(baseTime * multiplier);
    }

    calculateVegPrepTime(ingredient, vegKnowledge) {
        const baseTime = vegKnowledge.prepTime || 5;
        const multiplier = this.estimateQuantityMultiplier(ingredient.totalAmount);
        return Math.ceil(baseTime * multiplier);
    }

    estimateQuantityMultiplier(amount) {
        if (!amount || typeof amount !== 'string') return 1;

        const match = amount.match(/(\d+(?:\.\d+)?)/);
        if (!match) return 1;

        const quantity = parseFloat(match[1]);

        // Simple scaling - more quantity = more time, but with diminishing returns
        if (quantity <= 2) return 1;
        if (quantity <= 4) return 1.5;
        if (quantity <= 8) return 2;
        return 2.5;
    }

    assessDifficulty(ingredient, knowledge) {
        const category = this.categorizeIngredient(ingredient.name);
        const method = knowledge.methods ? knowledge.methods[0] : '';

        // Simple difficulty assessment
        if (category === 'protein' && method.includes('slow_cook')) return 'easy';
        if (category === 'protein' && method.includes('oven')) return 'easy';
        if (category === 'protein' && method.includes('grill')) return 'medium';
        if (category === 'grain') return 'easy';

        return 'easy'; // Default to easy
    }

    getRequiredEquipment(suggestion) {
        const method = suggestion.cookingMethod;
        const equipment = {
            'oven_bake': ['baking sheet', 'oven'],
            'slow_cook': ['slow cooker'],
            'stovetop_brown': ['large skillet', 'stovetop'],
            'grill': ['grill', 'tongs'],
            'oven_roast': ['roasting pan', 'oven'],
            'rice_cooker': ['rice cooker'],
            'large_pot_boiling': ['large pot', 'stovetop']
        };

        return equipment[method] || ['basic cooking equipment'];
    }

    combineAmounts(amount1, amount2) {
        // Simple amount combination - in a real implementation, you'd want more sophisticated parsing
        if (!amount1) return amount2;
        if (!amount2) return amount1;

        const num1 = parseFloat(amount1) || 0;
        const num2 = parseFloat(amount2) || 0;

        if (num1 > 0 && num2 > 0) {
            return (num1 + num2).toString();
        }

        return `${amount1}, ${amount2}`;
    }
}

// Factory function to create analyzer instance
export function createMealPrepAnalyzer() {
    return new MealPrepAnalyzer();
}

// Utility function to save meal prep suggestions
export async function saveMealPrepSuggestions(userId, analysisResult, userPreferences = {}) {
    try {
        const suggestion = new MealPrepSuggestion({
            userId,
            mealPlanId: analysisResult.mealPlanId,
            batchCookingSuggestions: analysisResult.batchCookingSuggestions,
            ingredientPrepSuggestions: analysisResult.ingredientPrepSuggestions,
            prepSchedule: analysisResult.prepSchedule,
            metrics: analysisResult.metrics,
            preferences: {
                maxPrepTime: userPreferences.maxPrepTime || 180,
                preferredPrepDays: userPreferences.preferredPrepDays || ['sunday'],
                avoidedTasks: userPreferences.avoidedTasks || [],
                skillLevel: userPreferences.skillLevel || 'beginner'
            },
            weekStartDate: analysisResult.weekStartDate,
            status: 'generated'
        });

        await suggestion.save();
        return suggestion;

    } catch (error) {
        console.error('Error saving meal prep suggestions:', error);
        throw error;
    }
}

// Utility function to get existing suggestions for a meal plan
export async function getMealPrepSuggestions(userId, mealPlanId) {
    try {
        const suggestions = await MealPrepSuggestion.findOne({
            userId,
            mealPlanId,
            status: { $ne: 'abandoned' }
        }).sort({ createdAt: -1 });

        return suggestions;

    } catch (error) {
        console.error('Error fetching meal prep suggestions:', error);
        throw error;
    }
}

export default MealPrepAnalyzer;