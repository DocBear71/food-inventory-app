// file: /src/lib/services/aiNutritionService.js
// AI-powered recipe nutrition analysis using OpenAI + USDA data

import OpenAI from 'openai';
import { NutritionService } from './nutritionService';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export class AIRecipeNutritionService {
    constructor() {
        this.promptVersion = 'v2.0';
        this.model = 'gpt-4'; // Use GPT-4 for better accuracy
        this.maxRetries = 2;
    }

    /**
     * Main function to analyze recipe nutrition using AI
     */
    async analyzeRecipeNutrition(recipe) {
        const startTime = Date.now();

        try {
            console.log(`🤖 Starting AI nutrition analysis for recipe: ${recipe.title}`);

            // Step 1: Parse and standardize ingredients
            const parsedIngredients = await this.parseIngredientsWithAI(recipe.ingredients);

            // Step 2: Get USDA nutrition data for parsed ingredients
            const nutritionData = await this.gatherNutritionData(parsedIngredients);

            // Step 3: Apply cooking method adjustments
            const adjustedNutrition = await this.applyCookingAdjustments(
                nutritionData,
                recipe.instructions,
                recipe.cookTime,
                recipe.prepTime
            );

            // Step 4: Calculate final per-serving nutrition
            const finalNutrition = this.calculatePerServingNutrition(
                adjustedNutrition,
                recipe.servings || 4
            );

            const processingTime = Date.now() - startTime;

            console.log(`✅ AI nutrition analysis completed in ${processingTime}ms`);

            return {
                success: true,
                nutrition: finalNutrition.nutrition,
                metadata: {
                    ...finalNutrition.metadata,
                    processingTime,
                    calculationMethod: 'ai_calculated',
                    aiAnalysis: finalNutrition.aiAnalysis
                }
            };

        } catch (error) {
            console.error('❌ AI nutrition analysis failed:', error);
            return {
                success: false,
                error: error.message,
                nutrition: this.getEmptyNutritionProfile()
            };
        }
    }

    /**
     * Parse recipe ingredients using AI to standardize format and quantities
     */
    async parseIngredientsWithAI(ingredients) {
        const prompt = this.buildIngredientParsingPrompt(ingredients);

        try {
            // Check if model supports JSON mode
            const supportsJsonMode = this.model.includes('gpt-4o') || this.model.includes('gpt-3.5-turbo');

            const requestConfig = {
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: "You are a nutrition analysis expert who parses recipe ingredients into standardized formats for nutrition calculation. You must respond with valid JSON only."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 2000
            };

            // Only add response_format if the model supports it
            if (supportsJsonMode) {
                requestConfig.response_format = { type: "json_object" };
            }

            const response = await openai.chat.completions.create(requestConfig);

            const usage = response.usage;
            const cost = this.calculateOpenAICost(
                usage.prompt_tokens,
                usage.completion_tokens,
                this.model
            );

            let parsed;
            try {
                parsed = JSON.parse(response.choices[0].message.content);
            } catch (parseError) {
                console.error('❌ Failed to parse AI response as JSON:', parseError);
                throw new Error('AI response was not valid JSON');
            }

            return {
                ingredients: parsed.ingredients || [],
                tokensUsed: {
                    input: usage.prompt_tokens,
                    output: usage.completion_tokens,
                    total: usage.total_tokens
                },
                cost,
                model: this.model
            };

        } catch (error) {
            console.error('❌ AI ingredient parsing failed:', error);

            // Try backup model if main model fails
            if (this.model !== this.backupModel) {
                console.log(`🔄 Retrying with backup model: ${this.backupModel}`);
                const originalModel = this.model;
                this.model = this.backupModel;

                try {
                    const result = await this.parseIngredientsWithAI(ingredients);
                    this.model = originalModel; // Reset
                    return result;
                } catch (backupError) {
                    this.model = originalModel; // Reset
                    console.error('❌ Backup model also failed:', backupError);
                }
            }

            // Fallback to basic parsing
            return {
                ingredients: this.fallbackIngredientParsing(ingredients),
                tokensUsed: { input: 0, output: 0, total: 0 },
                cost: 0,
                model: 'fallback',
                warnings: ['AI parsing failed, used fallback method']
            };
        }
    }

    /**
     * Build the prompt for ingredient parsing
     */
    buildIngredientParsingPrompt(ingredients) {
        return `Parse these recipe ingredients into a standardized format for nutrition analysis. For each ingredient, extract:
1. Ingredient name (standardized, searchable in USDA database)
2. Quantity (numeric)
3. Unit (standardized: g, kg, ml, l, cup, tbsp, tsp, oz, lb, item, etc.)
4. Preparation method (raw, cooked, chopped, etc.)
5. USDA search terms (alternative names for database lookup)

Recipe ingredients:
${ingredients.map((ing, i) => `${i + 1}. ${typeof ing === 'string' ? ing : ing.name + (ing.amount ? ` - ${ing.amount} ${ing.unit || ''}` : '')}`).join('\n')}

Respond with JSON in this exact format:
{
  "ingredients": [
    {
      "originalText": "1 cup diced onions",
      "name": "onions",
      "quantity": 160,
      "unit": "g",
      "preparation": "diced",
      "usdaSearchTerms": ["onions", "yellow onion", "onion raw"],
      "confidence": 0.9,
      "notes": "1 cup diced onions ≈ 160g"
    }
  ]
}

Important guidelines:
- Convert volumes to weights when possible (1 cup flour = 120g, 1 cup water = 240ml, etc.)
- Use metric units (grams, milliliters) when possible
- Be conservative with quantity estimates
- Include multiple search terms for better USDA matching
- Set confidence 0.8+ for clear ingredients, lower for ambiguous ones`;
    }

    /**
     * Gather nutrition data from USDA for parsed ingredients
     */
    async gatherNutritionData(parsedData) {
        const results = {
            ingredients: [],
            totalNutrition: this.getEmptyNutritionProfile(),
            coverage: 0,
            foundIngredients: 0
        };

        for (const ingredient of parsedData.ingredients) {
            try {
                // Try USDA lookup first
                let nutritionData = await this.lookupUSDANutrition(ingredient);

                // Fallback to OpenFoodFacts if USDA fails
                if (!nutritionData) {
                    nutritionData = await this.lookupOpenFoodFactsNutrition(ingredient);
                }

                if (nutritionData) {
                    // Scale nutrition data by quantity
                    const scaledNutrition = this.scaleNutritionData(
                        nutritionData,
                        ingredient.quantity,
                        ingredient.unit
                    );

                    // Add to totals
                    this.addNutritionToProfile(results.totalNutrition, scaledNutrition);

                    results.ingredients.push({
                        ...ingredient,
                        nutrition: scaledNutrition,
                        dataSource: nutritionData.source
                    });

                    results.foundIngredients++;
                } else {
                    // Use AI estimation for unknown ingredients
                    const estimatedNutrition = await this.estimateNutritionWithAI(ingredient);

                    if (estimatedNutrition) {
                        this.addNutritionToProfile(results.totalNutrition, estimatedNutrition);
                        results.ingredients.push({
                            ...ingredient,
                            nutrition: estimatedNutrition,
                            dataSource: 'ai_estimated'
                        });
                    }
                }

                // Rate limiting delay
                await this.delay(100);

            } catch (error) {
                console.error(`❌ Failed to get nutrition for ${ingredient.name}:`, error);
            }
        }

        results.coverage = results.foundIngredients / parsedData.ingredients.length;

        return {
            ...results,
            tokensUsed: parsedData.tokensUsed,
            cost: parsedData.cost
        };
    }

    /**
     * Apply cooking method adjustments using AI
     */
    async applyCookingAdjustments(nutritionData, instructions, cookTime, prepTime) {
        // Skip AI adjustment for simple recipes
        if (!instructions || instructions.length === 0 || !cookTime) {
            return nutritionData;
        }

        try {
            const adjustmentPrompt = this.buildCookingAdjustmentPrompt(
                nutritionData.totalNutrition,
                instructions,
                cookTime,
                prepTime
            );

            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo', // Use cheaper model for adjustments
                messages: [
                    {
                        role: "system",
                        content: "You are a nutrition expert who understands how cooking methods affect nutrient content. Respond with JSON only."
                    },
                    {
                        role: "user",
                        content: adjustmentPrompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 1000
            });

            const adjustments = JSON.parse(response.choices[0].message.content);

            // Apply the adjustments
            const adjustedNutrition = this.applyNutritionAdjustments(
                nutritionData.totalNutrition,
                adjustments
            );

            return {
                ...nutritionData,
                totalNutrition: adjustedNutrition,
                tokensUsed: nutritionData.tokensUsed + (response.usage?.total_tokens || 0),
                cost: nutritionData.cost + this.calculateOpenAICost(response.usage?.total_tokens || 0),
                cookingAdjustments: adjustments
            };

        } catch (error) {
            console.error('❌ Cooking adjustment failed:', error);
            return {
                ...nutritionData,
                warnings: [...(nutritionData.warnings || []), 'Cooking adjustments failed']
            };
        }
    }

    /**
     * Build prompt for cooking adjustments
     */
    buildCookingAdjustmentPrompt(nutrition, instructions, cookTime, prepTime) {
        const cookingMethods = this.extractCookingMethods(instructions);

        return `Analyze how these cooking methods affect the nutritional content and provide adjustment factors.

Cooking Methods Detected: ${cookingMethods.join(', ')}
Cook Time: ${cookTime} minutes
Prep Time: ${prepTime} minutes

Current Nutrition (raw ingredients):
- Calories: ${nutrition.calories?.value || 0} kcal
- Protein: ${nutrition.protein?.value || 0} g
- Fat: ${nutrition.fat?.value || 0} g
- Carbs: ${nutrition.carbs?.value || 0} g
- Vitamin C: ${nutrition.vitaminC?.value || 0} mg
- Folate: ${nutrition.folate?.value || 0} µg

Respond with JSON adjustment factors (1.0 = no change, 0.8 = 20% loss, 1.2 = 20% increase):
{
  "adjustments": {
    "calories": 1.0,
    "protein": 1.0,
    "fat": 1.0,
    "carbs": 1.0,
    "vitaminC": 0.7,
    "folate": 0.8,
    "thiamin": 0.9,
    "riboflavin": 0.95
  },
  "reasoning": "Brief explanation of adjustments",
  "confidence": 0.8
}

Guidelines:
- Water-soluble vitamins (B, C) typically decrease with cooking
- Fat-soluble vitamins (A, D, E, K) may increase bioavailability
- Protein increases bioavailability when cooked
- Calories generally remain stable
- Longer cooking times = more nutrient loss`;
    }

    /**
     * Calculate per-serving nutrition
     */
    calculatePerServingNutrition(nutritionData, servings) {
        const perServingNutrition = this.getEmptyNutritionProfile();

        // Divide all nutrients by servings
        Object.keys(perServingNutrition).forEach(nutrient => {
            if (nutritionData.totalNutrition[nutrient]) {
                perServingNutrition[nutrient] = {
                    ...nutritionData.totalNutrition[nutrient],
                    value: nutritionData.totalNutrition[nutrient].value / servings
                };
            }
        });

        return {
            nutrition: perServingNutrition,
            metadata: {
                servings,
                coverage: nutritionData.coverage,
                confidence: this.calculateOverallConfidence(nutritionData),
                dataSource: 'ai_calculated',
                calculatedAt: new Date()
            },
            aiAnalysis: {
                modelUsed: this.model,
                promptVersion: this.promptVersion,
                tokensUsed: nutritionData.tokensUsed || 0,
                cost: nutritionData.cost || 0,
                processingTime: 0, // Set by caller
                warnings: nutritionData.warnings || []
            }
        };
    }

    /**
     * Lookup nutrition data in USDA database
     */
    async lookupUSDANutrition(ingredient) {
        try {
            // Use your existing USDA service
            const result = await NutritionService.searchFoods(ingredient.usdaSearchTerms[0], 1);

            if (result.success && result.foods.length > 0) {
                return {
                    ...result.foods[0].nutrients,
                    source: 'usda'
                };
            }

            return null;
        } catch (error) {
            console.error('USDA lookup failed:', error);
            return null;
        }
    }

    /**
     * Lookup nutrition data in OpenFoodFacts
     */
    async lookupOpenFoodFactsNutrition(ingredient) {
        try {
            // Use your existing OpenFoodFacts service
            const result = await NutritionService.searchFoods(ingredient.name, 1);

            if (result.success && result.foods.length > 0) {
                return {
                    ...result.foods[0].nutrients,
                    source: 'openfoodfacts'
                };
            }

            return null;
        } catch (error) {
            console.error('OpenFoodFacts lookup failed:', error);
            return null;
        }
    }

    /**
     * Estimate nutrition using AI when database lookup fails
     */
    async estimateNutritionWithAI(ingredient) {
        try {
            const prompt = `Estimate nutritional content for ${ingredient.quantity}${ingredient.unit} of ${ingredient.name} (${ingredient.preparation}).

Provide nutrition per 100g in this JSON format:
{
  "calories": {"value": 250, "unit": "kcal", "name": "Energy"},
  "protein": {"value": 8.5, "unit": "g", "name": "Protein"},
  "fat": {"value": 12.0, "unit": "g", "name": "Total Fat"},
  "carbs": {"value": 30.0, "unit": "g", "name": "Total Carbohydrate"},
  "fiber": {"value": 2.5, "unit": "g", "name": "Dietary Fiber"},
  "sodium": {"value": 450, "unit": "mg", "name": "Sodium"},
  "confidence": 0.6
}

Base estimates on similar common foods. Be conservative.`;

            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: "system",
                        content: "You are a nutrition database. Provide accurate nutritional estimates. Respond with JSON only."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.2,
                max_tokens: 500,
                response_format: { type: "json_object" }
            });

            return JSON.parse(response.choices[0].message.content);

        } catch (error) {
            console.error('AI nutrition estimation failed:', error);
            return null;
        }
    }

    /**
     * Helper methods
     */

    extractCookingMethods(instructions) {
        const methods = [];
        const instructionText = Array.isArray(instructions)
            ? instructions.join(' ').toLowerCase()
            : String(instructions).toLowerCase();

        const cookingTerms = [
            'bake', 'baking', 'roast', 'roasting',
            'fry', 'frying', 'sauté', 'sautéing',
            'boil', 'boiling', 'simmer', 'simmering',
            'steam', 'steaming', 'grill', 'grilling',
            'broil', 'broiling', 'microwave',
            'braise', 'braising', 'stew', 'stewing'
        ];

        cookingTerms.forEach(term => {
            if (instructionText.includes(term)) {
                methods.push(term);
            }
        });

        return [...new Set(methods)]; // Remove duplicates
    }

    scaleNutritionData(nutritionData, quantity, unit) {
        // Convert quantity to grams (approximate)
        const quantityInGrams = this.convertToGrams(quantity, unit);
        const scaleFactor = quantityInGrams / 100; // Nutrition data is per 100g

        const scaled = {};
        Object.keys(nutritionData).forEach(nutrient => {
            if (nutritionData[nutrient] && typeof nutritionData[nutrient].value === 'number') {
                scaled[nutrient] = {
                    ...nutritionData[nutrient],
                    value: nutritionData[nutrient].value * scaleFactor
                };
            }
        });

        return scaled;
    }

    convertToGrams(quantity, unit) {
        const conversions = {
            'g': 1,
            'kg': 1000,
            'oz': 28.35,
            'lb': 453.6,
            'cup': 240, // Approximate for liquids
            'ml': 1, // Approximate density
            'l': 1000,
            'tbsp': 15,
            'tsp': 5,
            'item': 100 // Default assumption
        };

        return quantity * (conversions[unit] || 100);
    }

    applyNutritionAdjustments(nutrition, adjustments) {
        const adjusted = {};

        Object.keys(nutrition).forEach(nutrient => {
            if (nutrition[nutrient] && adjustments.adjustments[nutrient]) {
                adjusted[nutrient] = {
                    ...nutrition[nutrient],
                    value: nutrition[nutrient].value * adjustments.adjustments[nutrient]
                };
            } else {
                adjusted[nutrient] = nutrition[nutrient];
            }
        });

        return adjusted;
    }

    addNutritionToProfile(targetProfile, sourceProfile) {
        Object.keys(sourceProfile).forEach(nutrient => {
            if (sourceProfile[nutrient] && typeof sourceProfile[nutrient].value === 'number') {
                if (!targetProfile[nutrient]) {
                    targetProfile[nutrient] = { ...sourceProfile[nutrient] };
                } else {
                    targetProfile[nutrient].value += sourceProfile[nutrient].value;
                }
            }
        });
    }

    calculateOverallConfidence(nutritionData) {
        if (nutritionData.ingredients.length === 0) return 0;

        const confidences = nutritionData.ingredients
            .map(ing => ing.confidence || 0.5)
            .filter(conf => conf > 0);

        if (confidences.length === 0) return 0;

        // Weight by coverage and data source quality
        const sourceWeights = {
            'usda': 1.0,                    // Highest quality
            'usda+openfoodfacts': 0.95,     // Merged data is very reliable
            'openfoodfacts': 0.8,           // Good quality, crowd-sourced
            'openfoodfacts_direct': 0.8,    // Same as above
            'openfoodfacts_alt': 0.7,       // Alternative search terms
            'common_ingredients': 0.6,       // Generic estimates
            'ai_estimated': 0.5             // AI estimates
        };

        let weightedConfidence = 0;
        let totalWeight = 0;

        nutritionData.ingredients.forEach(ing => {
            const weight = sourceWeights[ing.dataSource] || 0.5;
            weightedConfidence += (ing.confidence || 0.5) * weight;
            totalWeight += weight;
        });

        const avgConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0.5;

        // Adjust for coverage
        return Math.min(avgConfidence * nutritionData.coverage, 1.0);
    }

    calculateOpenAICost(tokens) {
        // GPT-4 pricing (as of 2024)
        const inputCost = 0.03 / 1000; // $0.03 per 1K tokens
        const outputCost = 0.06 / 1000; // $0.06 per 1K tokens

        // Approximate 70% input, 30% output
        return (tokens * 0.7 * inputCost) + (tokens * 0.3 * outputCost);
    }

    fallbackIngredientParsing(ingredients) {
        return ingredients.map((ing, index) => {
            const text = typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`.trim();

            // Basic regex parsing
            const match = text.match(/^(\d+(?:\.\d+)?)\s*(\w+)?\s+(.+)$/);

            if (match) {
                return {
                    originalText: text,
                    name: match[3].trim(),
                    quantity: parseFloat(match[1]),
                    unit: match[2] || 'item',
                    preparation: 'raw',
                    usdaSearchTerms: [match[3].trim()],
                    confidence: 0.6,
                    notes: 'Fallback parsing used'
                };
            }

            return {
                originalText: text,
                name: text,
                quantity: 100,
                unit: 'g',
                preparation: 'raw',
                usdaSearchTerms: [text],
                confidence: 0.4,
                notes: 'Basic fallback parsing'
            };
        });
    }

    getEmptyNutritionProfile() {
        return {
            // Macronutrients
            calories: { value: 0, unit: 'kcal', name: 'Energy' },
            protein: { value: 0, unit: 'g', name: 'Protein' },
            fat: { value: 0, unit: 'g', name: 'Total Fat' },
            saturatedFat: { value: 0, unit: 'g', name: 'Saturated Fat' },
            monounsaturatedFat: { value: 0, unit: 'g', name: 'Monounsaturated Fat' },
            polyunsaturatedFat: { value: 0, unit: 'g', name: 'Polyunsaturated Fat' },
            transFat: { value: 0, unit: 'g', name: 'Trans Fat' },
            cholesterol: { value: 0, unit: 'mg', name: 'Cholesterol' },
            carbs: { value: 0, unit: 'g', name: 'Total Carbohydrate' },
            fiber: { value: 0, unit: 'g', name: 'Dietary Fiber' },
            sugars: { value: 0, unit: 'g', name: 'Total Sugars' },
            addedSugars: { value: 0, unit: 'g', name: 'Added Sugars' },

            // Minerals
            sodium: { value: 0, unit: 'mg', name: 'Sodium' },
            potassium: { value: 0, unit: 'mg', name: 'Potassium' },
            calcium: { value: 0, unit: 'mg', name: 'Calcium' },
            iron: { value: 0, unit: 'mg', name: 'Iron' },
            magnesium: { value: 0, unit: 'mg', name: 'Magnesium' },
            phosphorus: { value: 0, unit: 'mg', name: 'Phosphorus' },
            zinc: { value: 0, unit: 'mg', name: 'Zinc' },

            // Vitamins
            vitaminA: { value: 0, unit: 'µg', name: 'Vitamin A (RAE)' },
            vitaminD: { value: 0, unit: 'µg', name: 'Vitamin D' },
            vitaminE: { value: 0, unit: 'mg', name: 'Vitamin E' },
            vitaminK: { value: 0, unit: 'µg', name: 'Vitamin K' },
            vitaminC: { value: 0, unit: 'mg', name: 'Vitamin C' },
            thiamin: { value: 0, unit: 'mg', name: 'Thiamin (B1)' },
            riboflavin: { value: 0, unit: 'mg', name: 'Riboflavin (B2)' },
            niacin: { value: 0, unit: 'mg', name: 'Niacin (B3)' },
            vitaminB6: { value: 0, unit: 'mg', name: 'Vitamin B6' },
            folate: { value: 0, unit: 'µg', name: 'Folate (B9)' },
            vitaminB12: { value: 0, unit: 'µg', name: 'Vitamin B12' },
            biotin: { value: 0, unit: 'µg', name: 'Biotin (B7)' },
            pantothenicAcid: { value: 0, unit: 'mg', name: 'Pantothenic Acid (B5)' },
            choline: { value: 0, unit: 'mg', name: 'Choline' }
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}