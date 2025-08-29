
// file: /src/lib/integratedNutritionSystem.js v1 - Bridge inventory and meal plan nutrition

import { NutritionAnalyzer as InventoryNutritionAnalyzer } from './nutritionAnalysis';
import { NutritionAnalyzer as MealPlanAnalyzer } from './nutritionAnalyzer';
import { Recipe, InventoryItem, MealPlan } from '@/lib/models';
import { NutritionLog } from "@/models/NutritionLog.js";

export class IntegratedNutritionSystem {
    constructor() {
        this.inventoryAnalyzer = new InventoryNutritionAnalyzer();
        this.mealPlanAnalyzer = new MealPlanAnalyzer();
    }

    // =============================================================================
    // 1. RECIPE NUTRITION FROM INVENTORY
    // =============================================================================

    // Calculate recipe nutrition from inventory ingredients
    async calculateRecipeNutritionFromInventory(recipeId) {
        try {
            const recipe = await Recipe.findById(recipeId).populate('ingredients.item');

            if (!recipe || !recipe.ingredients) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Recipe Failed',
                    message: 'Recipe not found or has no ingredients'
                });
                return;
            }

            console.log(`🧮 Calculating nutrition for recipe: ${recipe.title}`);

            const recipeNutrition = this.mealPlanAnalyzer.getEmptyNutritionProfile();
            let ingredientsWithNutrition = 0;
            let totalIngredients = recipe.ingredients.length;

            // Process each ingredient
            for (const ingredient of recipe.ingredients) {
                const { item, quantity, unit } = ingredient;

                let nutrition = null;

                // Try to get nutrition from inventory item
                if (item && item.nutrition) {
                    nutrition = item.nutrition;
                    console.log(`✅ Found nutrition for ${item.name} in inventory`);
                } else {
                    // Analyze nutrition for this ingredient
                    console.log(`🔍 Analyzing nutrition for ingredient: ${ingredient.name || item?.name}`);

                    const analysisResult = await this.inventoryAnalyzer.analyzeItem({
                        name: ingredient.name || item?.name,
                        brand: item?.brand,
                        category: item?.category || this.guessCategory(ingredient.name),
                        quantity: quantity,
                        unit: unit,
                        upc: item?.upc
                    });

                    if (analysisResult.success) {
                        nutrition = analysisResult.nutrition;

                        // Save nutrition back to inventory item if it exists
                        if (item && item._id) {
                            await this.saveNutritionToInventoryItem(item._id, nutrition);
                        }
                    }
                }

                // Add to recipe totals
                if (nutrition) {
                    this.mealPlanAnalyzer.addNutritionToProfile(recipeNutrition, nutrition);
                    ingredientsWithNutrition++;
                }
            }

            // Adjust for recipe servings
            const servings = recipe.servings || 1;
            Object.keys(recipeNutrition).forEach(nutrient => {
                if (recipeNutrition[nutrient].value) {
                    recipeNutrition[nutrient].value = recipeNutrition[nutrient].value / servings;
                }
            });

            // Add metadata
            recipeNutrition.calculationMethod = 'inventory_based';
            recipeNutrition.ingredientsCovered = `${ingredientsWithNutrition}/${totalIngredients}`;
            recipeNutrition.confidence = ingredientsWithNutrition / totalIngredients;
            recipeNutrition.calculatedAt = new Date();

            // Save to recipe
            await Recipe.findByIdAndUpdate(recipeId, {
                nutrition: recipeNutrition,
                nutritionLastCalculated: new Date()
            });

            console.log(`✅ Recipe nutrition calculated: ${ingredientsWithNutrition}/${totalIngredients} ingredients`);

            return {
                success: true,
                nutrition: recipeNutrition,
                coverage: {
                    ingredientsWithNutrition,
                    totalIngredients,
                    percentage: Math.round((ingredientsWithNutrition / totalIngredients) * 100)
                }
            };

        } catch (error) {
            console.error('Error calculating recipe nutrition:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // =============================================================================
    // 2. SMART MEAL PLANNING WITH INVENTORY
    // =============================================================================

    // Suggest recipes based on available inventory and nutrition goals
    async suggestRecipesFromInventory(userId, nutritionGoals = null, availableItems = null) {
        try {
            // Get user's inventory if not provided
            if (!availableItems) {
                availableItems = await InventoryItem.find({
                    userId: userId,
                    quantity: { $gt: 0 }
                });
            }

            // Get user's nutrition goals if not provided
            if (!nutritionGoals) {
                const user = await User.findById(userId).select('nutritionGoals');
                nutritionGoals = user?.nutritionGoals;
            }

            // Find recipes that can be made with available inventory
            const recipes = await Recipe.find({}).populate('ingredients.item');

            const suggestions = [];

            for (const recipe of recipes) {
                const analysis = await this.analyzeRecipeAvailability(recipe, availableItems);

                if (analysis.canMake || analysis.availabilityPercentage > 70) {
                    // Calculate nutrition score against goals
                    const nutritionScore = await this.scoreRecipeAgainstGoals(recipe, nutritionGoals);

                    suggestions.push({
                        recipe: {
                            _id: recipe._id,
                            title: recipe.title,
                            servings: recipe.servings,
                            cookTime: recipe.cookTime,
                            difficulty: recipe.difficulty
                        },
                        availability: analysis,
                        nutritionScore,
                        recommendationReason: this.getRecommendationReason(analysis, nutritionScore, nutritionGoals)
                    });
                }
            }

            // Sort by combined score (availability + nutrition)
            suggestions.sort((a, b) => {
                const scoreA = (a.availability.availabilityPercentage * 0.6) + (a.nutritionScore * 0.4);
                const scoreB = (b.availability.availabilityPercentage * 0.6) + (b.nutritionScore * 0.4);
                return scoreB - scoreA;
            });

            return {
                success: true,
                suggestions: suggestions.slice(0, 10), // Top 10 suggestions
                criteriaUsed: {
                    inventoryItems: availableItems.length,
                    nutritionGoalsConsidered: !!nutritionGoals
                }
            };

        } catch (error) {
            console.error('Error suggesting recipes from inventory:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // =============================================================================
    // 3. COMPREHENSIVE MEAL PLAN ANALYSIS
    // =============================================================================

    // Enhanced meal plan analysis including inventory impact
    async analyzeFullMealPlan(mealPlanId, userId) {
        try {
            // Get standard meal plan analysis
            const mealPlanAnalysis = await this.mealPlanAnalyzer.analyzeMealPlan(mealPlanId, userId);

            if (!mealPlanAnalysis.success) {
                return mealPlanAnalysis;
            }

            // Add inventory-based insights
            const inventoryInsights = await this.analyzeInventoryForMealPlan(mealPlanId, userId);

            // Add cost analysis if price data available
            const costAnalysis = await this.calculateMealPlanCosts(mealPlanId);

            // Combine all analyses
            return {
                ...mealPlanAnalysis,
                inventoryInsights,
                costAnalysis,
                enhancedRecommendations: this.generateEnhancedRecommendations(
                    mealPlanAnalysis.analysis,
                    inventoryInsights,
                    costAnalysis
                )
            };

        } catch (error) {
            console.error('Error in full meal plan analysis:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // =============================================================================
    // 4. INVENTORY CONSUMPTION TRACKING
    // =============================================================================

    // Track nutrition when consuming inventory items for meal prep
    async trackInventoryConsumption(userId, consumptionData) {
        try {
            const { itemId, quantityUsed, recipeId = null, mealPlanId = null } = consumptionData;

            // Get inventory item with nutrition
            const item = await InventoryItem.findById(itemId);
            if (!item) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Inventory Failed',
                    message: 'Inventory item not found'
                });
                return;
            }

            // Calculate consumed nutrition
            let consumedNutrition = null;
            if (item.nutrition) {
                const ratio = quantityUsed / item.quantity;
                consumedNutrition = this.calculateConsumedNutrition(item.nutrition, ratio);
            } else {
                // Analyze nutrition if not available
                const nutritionResult = await this.inventoryAnalyzer.analyzeItem({
                    name: item.name,
                    brand: item.brand,
                    category: item.category,
                    quantity: quantityUsed,
                    unit: item.unit,
                    upc: item.upc
                });

                if (nutritionResult.success) {
                    consumedNutrition = nutritionResult.nutrition;
                    // Save back to item
                    await this.saveNutritionToInventoryItem(itemId, nutritionResult.nutrition);
                }
            }

            // Update inventory quantity
            await InventoryItem.findByIdAndUpdate(itemId, {
                $inc: { quantity: -quantityUsed },
                lastUsed: new Date()
            });

            // Log consumption
            await this.logNutritionConsumption({
                userId,
                itemId,
                nutrition: consumedNutrition,
                quantityUsed,
                recipeId,
                mealPlanId,
                consumedAt: new Date()
            });

            return {
                success: true,
                consumedNutrition,
                remainingQuantity: Math.max(0, item.quantity - quantityUsed)
            };

        } catch (error) {
            console.error('Error tracking inventory consumption:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // =============================================================================
    // 5. HELPER METHODS
    // =============================================================================

    // Analyze if recipe can be made with available inventory
    async analyzeRecipeAvailability(recipe, availableItems) {
        const availability = {
            canMake: true,
            availableIngredients: 0,
            totalIngredients: recipe.ingredients.length,
            missingIngredients: [],
            availabilityPercentage: 0
        };

        for (const ingredient of recipe.ingredients) {
            const requiredQuantity = ingredient.quantity || 1;
            const requiredUnit = ingredient.unit || 'item';

            // Find matching inventory item
            const matchingItem = availableItems.find(item =>
                this.ingredientMatches(ingredient, item)
            );

            if (matchingItem && matchingItem.quantity >= requiredQuantity) {
                availability.availableIngredients++;
            } else {
                availability.canMake = false;
                availability.missingIngredients.push({
                    name: ingredient.name,
                    needed: `${requiredQuantity} ${requiredUnit}`,
                    available: matchingItem ? `${matchingItem.quantity} ${matchingItem.unit}` : 'None'
                });
            }
        }

        availability.availabilityPercentage = Math.round(
            (availability.availableIngredients / availability.totalIngredients) * 100
        );

        return availability;
    }

    // Score recipe nutrition against user goals
    async scoreRecipeAgainstGoals(recipe, nutritionGoals) {
        if (!recipe.nutrition || !nutritionGoals) return 50;

        const goals = [
            { nutrient: 'protein', goal: nutritionGoals.protein, weight: 0.3 },
            { nutrient: 'fiber', goal: nutritionGoals.fiber, weight: 0.2 },
            { nutrient: 'sodium', goal: nutritionGoals.sodium, weight: 0.2, inverse: true },
            { nutrient: 'calories', goal: nutritionGoals.dailyCalories / 3, weight: 0.3 } // Assume 3 meals per day
        ];

        let totalScore = 0;
        let totalWeight = 0;

        goals.forEach(({ nutrient, goal, weight, inverse = false }) => {
            if (goal > 0 && recipe.nutrition[nutrient]?.value) {
                const actual = recipe.nutrition[nutrient].value;
                const percentage = (actual / goal) * 100;

                let score;
                if (inverse) {
                    // For nutrients like sodium, lower is better
                    score = percentage <= 100 ? 100 : Math.max(0, 100 - (percentage - 100) * 0.5);
                } else {
                    // For nutrients like protein, meeting goal is good
                    score = percentage >= 100 ? 100 : percentage * 0.8;
                }

                totalScore += score * weight;
                totalWeight += weight;
            }
        });

        return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
    }

    // Generate recommendation reasons
    getRecommendationReason(availability, nutritionScore, nutritionGoals) {
        const reasons = [];

        if (availability.canMake) {
            reasons.push("✅ You have all ingredients");
        } else if (availability.availabilityPercentage > 80) {
            reasons.push(`🟡 You have ${availability.availabilityPercentage}% of ingredients`);
        }

        if (nutritionScore > 80) {
            reasons.push("🎯 Great nutrition match for your goals");
        } else if (nutritionScore > 60) {
            reasons.push("👍 Good nutrition alignment");
        }

        return reasons.length > 0 ? reasons.join(" • ") : "Recommended based on availability";
    }

    // Check if ingredient matches inventory item
    ingredientMatches(ingredient, item) {
        const ingredientName = (ingredient.name || '').toLowerCase();
        const itemName = (item.name || '').toLowerCase();

        // Simple name matching - could be enhanced with fuzzy matching
        return ingredientName.includes(itemName) ||
            itemName.includes(ingredientName) ||
            ingredient.item === item._id;
    }

    // Calculate consumed nutrition with ratio
    calculateConsumedNutrition(nutrition, ratio) {
        const consumed = {};
        Object.keys(nutrition).forEach(key => {
            if (nutrition[key] && typeof nutrition[key] === 'object' && nutrition[key].value) {
                consumed[key] = {
                    ...nutrition[key],
                    value: nutrition[key].value * ratio
                };
            } else {
                consumed[key] = nutrition[key];
            }
        });
        return consumed;
    }

    // Save nutrition to inventory item
    async saveNutritionToInventoryItem(itemId, nutrition) {
        try {
            await InventoryItem.findByIdAndUpdate(itemId, {
                nutrition: nutrition,
                nutritionLastCalculated: new Date()
            });
        } catch (error) {
            console.error('Error saving nutrition to inventory item:', error);
        }
    }

    // Guess category from ingredient name
    guessCategory(ingredientName) {
        const name = ingredientName.toLowerCase();

        const categoryKeywords = {
            'Fresh Fruits': ['apple', 'banana', 'orange', 'berry', 'grape', 'lemon', 'lime'],
            'Fresh Vegetables': ['carrot', 'onion', 'potato', 'tomato', 'lettuce', 'spinach', 'pepper'],
            'Fresh/Frozen Poultry': ['chicken', 'turkey', 'duck'],
            'Fresh/Frozen Beef': ['beef', 'ground beef', 'steak'],
            'Fresh/Frozen Fish & Seafood': ['fish', 'salmon', 'tuna', 'shrimp', 'crab'],
            'Dairy': ['milk', 'yogurt', 'cheese', 'butter'],
            'Grains & Cereals': ['rice', 'pasta', 'bread', 'flour', 'oats'],
            'Herbs & Spices': ['salt', 'pepper', 'garlic', 'onion powder', 'basil', 'oregano']
        };

        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => name.includes(keyword))) {
                return category;
            }
        }

        return 'Other';
    }

    // Log nutrition consumption
    async logNutritionConsumption(consumptionData) {
        try {
            // Use your existing NutritionLog model

            const log = new NutritionLog(consumptionData);
            await log.save();

            return log;
        } catch (error) {
            console.error('Error logging nutrition consumption:', error);
            throw error;
        }
    }
}

