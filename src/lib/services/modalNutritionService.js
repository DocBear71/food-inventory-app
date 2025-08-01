// file: /src/lib/services/modalNutritionService.js
// Modal.com-based nutrition analysis service

import { modalBridge } from '@/lib/modal-bridge';

export class ModalNutritionService {
    constructor() {
        this.serviceVersion = 'v1.0';
        this.maxRetries = 2;
    }

    /**
     * Analyze recipe nutrition using Modal.com service
     */
    async analyzeRecipeNutrition(recipe) {
        const startTime = Date.now();

        try {
            console.log(`🌐 Starting Modal nutrition analysis for recipe: ${recipe.title}`);

            // FIXED: Handle multi-part recipes - extract all ingredients
            let allIngredients = [];

            if (recipe.isMultiPart && recipe.parts && Array.isArray(recipe.parts)) {
                console.log(`📋 Processing multi-part recipe with ${recipe.parts.length} parts`);

                // Flatten ingredients from all parts
                allIngredients = recipe.parts.reduce((acc, part, partIndex) => {
                    const partIngredients = (part.ingredients || [])
                        .filter(ing => ing.name && ing.name.trim())
                        .map(ing => ({
                            name: ing.name,
                            amount: ing.amount || '1',
                            unit: ing.unit || 'item',
                            partName: part.name || `Part ${partIndex + 1}`,
                            partIndex
                        }));

                    console.log(`📋 Part ${partIndex + 1} (${part.name}): ${partIngredients.length} ingredients`);
                    return [...acc, ...partIngredients];
                }, []);
            } else {
                // Single-part recipe
                allIngredients = (recipe.ingredients || [])
                    .filter(ing => ing.name && ing.name.trim())
                    .map(ing => ({
                        name: ing.name,
                        amount: ing.amount || '1',
                        unit: ing.unit || 'item'
                    }));
                console.log(`📋 Processing single-part recipe with ${allIngredients.length} ingredients`);
            }

            if (allIngredients.length === 0) {
                throw new Error('No valid ingredients found for analysis');
            }

            // Prepare data for Modal service
            const modalData = {
                type: "recipe",
                analysis_level: "comprehensive",
                data: {
                    title: recipe.title || 'Untitled Recipe',
                    ingredients: allIngredients,
                    instructions: this.extractInstructions(recipe),
                    servings: parseInt(recipe.servings) || 4,
                    cookTime: recipe.cookTime,
                    prepTime: recipe.prepTime,
                    isMultiPart: recipe.isMultiPart || false,
                    totalParts: recipe.parts?.length || 1
                }
            };

            console.log(`🚀 Sending to Modal nutrition analyzer:`, {
                ingredientCount: allIngredients.length,
                servings: modalData.data.servings,
                isMultiPart: modalData.data.isMultiPart
            });

            // Call Modal service
            const modalResult = await modalBridge.analyzeNutrition(modalData);

            if (!modalResult.success) {
                throw new Error(modalResult.error || 'Modal nutrition analysis failed');
            }

            const processingTime = Date.now() - startTime;

            // FIXED: Handle different response formats and round values
            let nutritionData = modalResult.nutrition;

            // Handle case where nutrition is in nutrition_per_serving format
            if (!nutritionData && modalResult.nutrition_per_serving) {
                console.log('🔄 Converting nutrition_per_serving format to standard format');
                nutritionData = this.convertLegacyNutritionFormat(modalResult.nutrition_per_serving);
            }

            // If still no structured nutrition data, try to extract from root
            if (!nutritionData || typeof nutritionData !== 'object') {
                console.log('🔄 Extracting nutrition from Modal response root');
                nutritionData = this.extractNutritionFromResponse(modalResult);
            }

            // Round nutrition values to 2 decimal places
            const roundedNutrition = this.roundNutritionValues(nutritionData);

            console.log(`✅ Modal nutrition analysis completed in ${processingTime}ms`);
            console.log(`📊 Coverage: ${Math.round((modalResult.coverage || 0) * 100)}%`);

            return {
                success: true,
                nutrition: roundedNutrition,
                metadata: {
                    servings: modalData.data.servings,
                    coverage: modalResult.coverage || 0.9,
                    confidence: modalResult.confidence || 0.85,
                    processingTime,
                    calculationMethod: 'modal_ai_calculated',
                    dataSource: 'modal_service',
                    calculatedAt: new Date(),
                    multiPart: modalData.data.isMultiPart,
                    totalParts: modalData.data.totalParts,
                    totalIngredients: allIngredients.length,
                    aiAnalysis: {
                        modelUsed: modalResult.analysis?.aiAnalysis?.modelUsed || 'gpt-4o',
                        promptVersion: 'modal-v2.0',
                        tokensUsed: modalResult.analysis?.aiAnalysis?.tokensUsed || 0,
                        cost: modalResult.analysis?.aiAnalysis?.cost || 0,
                        processingTime,
                        warnings: modalResult.analysis?.aiAnalysis?.warnings || [],
                        platform: 'modal.com'
                    }
                },
                analysis: modalResult.analysis || {}
            };

        } catch (error) {
            console.error('❌ Modal nutrition analysis failed:', error);
            return {
                success: false,
                error: error.message,
                nutrition: this.getEmptyNutritionProfile()
            };
        }
    }

    /**
     * Extract instructions from recipe (handle both single and multi-part)
     */
    extractInstructions(recipe) {
        if (recipe.isMultiPart && recipe.parts && Array.isArray(recipe.parts)) {
            // Flatten instructions from all parts
            return recipe.parts.reduce((allInstructions, part, partIndex) => {
                const partInstructions = (part.instructions || []).map(instruction => {
                    const instructionText = typeof instruction === 'string' ? instruction :
                        (instruction.text || instruction.instruction || '');
                    return `[${part.name || `Part ${partIndex + 1}`}] ${instructionText}`;
                });
                return [...allInstructions, ...partInstructions];
            }, []);
        } else {
            // Single-part recipe
            return (recipe.instructions || []).map(instruction => {
                return typeof instruction === 'string' ? instruction :
                    (instruction.text || instruction.instruction || '');
            });
        }
    }

    /**
     * Round all nutrition values to 2 decimal places
     */
    roundNutritionValues(nutrition) {
        if (!nutrition || typeof nutrition !== 'object') {
            return nutrition;
        }

        const rounded = {};

        Object.keys(nutrition).forEach(key => {
            const nutrient = nutrition[key];

            if (nutrient && typeof nutrient === 'object' && typeof nutrient.value === 'number') {
                rounded[key] = {
                    ...nutrient,
                    value: Math.round(nutrient.value * 100) / 100 // Round to 2 decimal places
                };
            } else {
                rounded[key] = nutrient;
            }
        });

        return rounded;
    }

    /**
     * Convert legacy nutrition_per_serving format to standard format
     */
    convertLegacyNutritionFormat(nutritionPerServing) {
        const mapping = {
            'calories': 'calories',
            'total_fat': 'fat',
            'saturated_fat': 'saturatedFat',
            'trans_fat': 'transFat',
            'cholesterol': 'cholesterol',
            'sodium': 'sodium',
            'total_carbohydrates': 'carbs',
            'dietary_fiber': 'fiber',
            'sugars': 'sugars',
            'protein': 'protein',
            'vitamin_a': 'vitaminA',
            'vitamin_c': 'vitaminC',
            'calcium': 'calcium',
            'iron': 'iron'
        };

        const converted = {};

        Object.keys(nutritionPerServing).forEach(key => {
            const standardKey = mapping[key];
            if (standardKey) {
                const value = nutritionPerServing[key];

                // Parse numeric values from strings like "7g", "200mg", "30%"
                let numericValue = 0;
                let unit = 'g';

                if (typeof value === 'string') {
                    const match = value.match(/(\d+(?:\.\d+)?)/);
                    numericValue = match ? parseFloat(match[1]) : 0;

                    // Determine unit
                    if (value.includes('mg')) unit = 'mg';
                    else if (value.includes('µg')) unit = 'µg';
                    else if (value.includes('kcal') || key === 'calories') unit = 'kcal';
                    else if (value.includes('%')) {
                        // Convert percentage to actual value (this is approximate)
                        unit = standardKey.includes('vitamin') ? 'mg' : 'mg';
                    }
                } else if (typeof value === 'number') {
                    numericValue = value;
                    unit = key === 'calories' ? 'kcal' : 'g';
                }

                converted[standardKey] = {
                    value: numericValue,
                    unit: unit,
                    name: this.getNutrientName(standardKey)
                };
            }
        });

        return converted;
    }

    /**
     * Extract nutrition data from response if in unexpected format
     */
    extractNutritionFromResponse(response) {
        // Try to find nutrition-like data in the response
        const nutritionKeys = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sodium'];
        const extracted = {};

        nutritionKeys.forEach(key => {
            if (response[key] && typeof response[key] === 'object') {
                extracted[key] = response[key];
            }
        });

        // If we found some nutrition data, return it
        if (Object.keys(extracted).length > 0) {
            return extracted;
        }

        // Otherwise return empty nutrition profile
        return this.getEmptyNutritionProfile();
    }

    /**
     * Get human-readable nutrient names
     */
    getNutrientName(key) {
        const names = {
            calories: 'Energy',
            protein: 'Protein',
            fat: 'Total Fat',
            saturatedFat: 'Saturated Fat',
            transFat: 'Trans Fat',
            cholesterol: 'Cholesterol',
            carbs: 'Total Carbohydrate',
            fiber: 'Dietary Fiber',
            sugars: 'Total Sugars',
            sodium: 'Sodium',
            vitaminA: 'Vitamin A',
            vitaminC: 'Vitamin C',
            calcium: 'Calcium',
            iron: 'Iron'
        };

        return names[key] || key;
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
}