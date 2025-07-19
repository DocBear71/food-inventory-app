// file: /src/lib/nutritionAnalysis.js v1 - AI-powered nutrition estimation for fresh items

export class NutritionAnalyzer {
    constructor() {
        this.usdaCache = new Map();
        this.aiEstimateCache = new Map();
    }

    // Main entry point for nutrition analysis
    async analyzeItem(itemData) {
        const { name, brand, category, quantity, unit, upc } = itemData;

        console.log(`🔍 Analyzing nutrition for: ${name} (${quantity} ${unit})`);

        try {
            // Step 1: Try UPC/USDA lookup first
            if (upc) {
                const upcResult = await this.lookupByUPC(upc);
                if (upcResult.success) {
                    console.log('✅ Found UPC nutrition data');
                    return this.formatNutritionResult(upcResult.data, quantity, unit, 'upc_lookup');
                }
            }

            // Step 2: Try USDA database search
            const usdaResult = await this.searchUSDA(name, brand);
            if (usdaResult.success) {
                console.log('✅ Found USDA nutrition data');
                return this.formatNutritionResult(usdaResult.data, quantity, unit, 'usda_lookup');
            }

            // Step 3: AI estimation for fresh produce, meats, etc.
            console.log('🤖 Falling back to AI nutrition estimation');
            const aiResult = await this.estimateWithAI(itemData);
            if (aiResult.success) {
                console.log('✅ Generated AI nutrition estimate');
                return this.formatNutritionResult(aiResult.data, quantity, unit, 'ai_estimated');
            }

            // Step 4: Fallback to basic nutrition template
            console.log('⚠️ Using fallback nutrition template');
            return this.getFallbackNutrition(itemData);

        } catch (error) {
            console.error('❌ Nutrition analysis failed:', error);
            return this.getFallbackNutrition(itemData);
        }
    }

    // UPC lookup via existing API
    async lookupByUPC(upc) {
        try {
            const response = await fetch(`/api/nutrition/upc/${upc}`);
            const data = await response.json();

            if (data.success && data.nutrition) {
                return {
                    success: true,
                    data: data.nutrition,
                    source: 'upc_database'
                };
            }

            return { success: false, error: 'No UPC data found' };
        } catch (error) {
            console.error('UPC lookup failed:', error);
            return { success: false, error: error.message };
        }
    }

    // USDA Food Data Central search
    async searchUSDA(name, brand = null) {
        const searchTerm = brand ? `${brand} ${name}` : name;
        const cacheKey = searchTerm.toLowerCase();

        // Check cache first
        if (this.usdaCache.has(cacheKey)) {
            return this.usdaCache.get(cacheKey);
        }

        try {
            const response = await fetch('/api/nutrition/usda/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchTerm, limit: 1 })
            });

            const data = await response.json();

            if (data.success && data.foods && data.foods.length > 0) {
                const food = data.foods[0];
                const result = {
                    success: true,
                    data: this.parseUSDANutrition(food),
                    source: 'usda_database',
                    fdcId: food.fdcId
                };

                // Cache the result
                this.usdaCache.set(cacheKey, result);
                return result;
            }

            const result = { success: false, error: 'No USDA data found' };
            this.usdaCache.set(cacheKey, result);
            return result;

        } catch (error) {
            console.error('USDA search failed:', error);
            const result = { success: false, error: error.message };
            this.usdaCache.set(cacheKey, result);
            return result;
        }
    }

    // AI-powered nutrition estimation
    async estimateWithAI(itemData) {
        const { name, brand, category, quantity, unit } = itemData;
        const cacheKey = `${name}-${brand}-${category}`.toLowerCase();

        // Check cache first
        if (this.aiEstimateCache.has(cacheKey)) {
            return this.aiEstimateCache.get(cacheKey);
        }

        try {
            const response = await fetch('/api/nutrition/ai-estimate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    brand,
                    category,
                    quantity,
                    unit,
                    context: this.getNutritionContext(category)
                })
            });

            const data = await response.json();

            if (data.success && data.nutrition) {
                const result = {
                    success: true,
                    data: data.nutrition,
                    source: 'ai_estimated',
                    confidence: data.confidence || 0.7,
                    warnings: data.warnings || []
                };

                // Cache the result
                this.aiEstimateCache.set(cacheKey, result);
                return result;
            }

            const result = { success: false, error: data.error || 'AI estimation failed' };
            this.aiEstimateCache.set(cacheKey, result);
            return result;

        } catch (error) {
            console.error('AI nutrition estimation failed:', error);
            const result = { success: false, error: error.message };
            this.aiEstimateCache.set(cacheKey, result);
            return result;
        }
    }

    // Get nutrition context for AI estimation
    getNutritionContext(category) {
        const contexts = {
            'Fresh Fruits': {
                typical: 'High in vitamins, fiber, natural sugars. Usually 80-90% water.',
                examples: 'Apple: 52 cal/100g, Orange: 47 cal/100g, Banana: 89 cal/100g'
            },
            'Fresh Vegetables': {
                typical: 'Low calories, high fiber, vitamins. 80-95% water.',
                examples: 'Broccoli: 34 cal/100g, Carrots: 41 cal/100g, Spinach: 23 cal/100g'
            },
            'Fresh/Frozen Beef': {
                typical: 'High protein (20-26g/100g), varying fat. No carbs.',
                examples: 'Ground beef 80/20: 254 cal/100g, Sirloin: 158 cal/100g'
            },
            'Fresh/Frozen Poultry': {
                typical: 'High protein (20-31g/100g), moderate fat. No carbs.',
                examples: 'Chicken breast: 165 cal/100g, Thigh: 209 cal/100g'
            },
            'Fresh/Frozen Fish & Seafood': {
                typical: 'High protein (18-25g/100g), omega-3 fats. No carbs.',
                examples: 'Salmon: 208 cal/100g, Cod: 105 cal/100g'
            },
            'Fresh/Frozen Pork': {
                typical: 'High protein (20-26g/100g), varying fat. No carbs.',
                examples: 'Pork chop: 231 cal/100g, Tenderloin: 143 cal/100g'
            },
            'Dairy': {
                typical: 'Protein, calcium, varying fat. Some carbs (lactose).',
                examples: 'Whole milk: 61 cal/100ml, Cheddar: 403 cal/100g'
            },
            'Cheese': {
                typical: 'High protein and fat, calcium. Minimal carbs.',
                examples: 'Cheddar: 403 cal/100g, Mozzarella: 300 cal/100g'
            }
        };

        return contexts[category] || {
            typical: 'Estimate based on similar food items.',
            examples: 'Provide reasonable nutritional estimates.'
        };
    }

    // Parse USDA nutrition data into our schema
    parseUSDANutrition(food) {
        const nutrients = {};

        if (food.foodNutrients) {
            food.foodNutrients.forEach(nutrient => {
                const name = nutrient.nutrientName?.toLowerCase();
                const value = nutrient.value || 0;

                // Map USDA nutrients to our schema
                if (name?.includes('energy') || name?.includes('calorie')) {
                    nutrients.calories = { value, unit: 'kcal' };
                } else if (name?.includes('protein')) {
                    nutrients.protein = { value, unit: 'g' };
                } else if (name?.includes('total lipid') || name?.includes('fat, total')) {
                    nutrients.fat = { value, unit: 'g' };
                } else if (name?.includes('carbohydrate')) {
                    nutrients.carbs = { value, unit: 'g' };
                } else if (name?.includes('fiber')) {
                    nutrients.fiber = { value, unit: 'g' };
                } else if (name?.includes('sugars, total')) {
                    nutrients.sugars = { value, unit: 'g' };
                } else if (name?.includes('sodium')) {
                    nutrients.sodium = { value, unit: 'mg' };
                } else if (name?.includes('calcium')) {
                    nutrients.calcium = { value, unit: 'mg' };
                } else if (name?.includes('iron')) {
                    nutrients.iron = { value, unit: 'mg' };
                } else if (name?.includes('vitamin c')) {
                    nutrients.vitaminC = { value, unit: 'mg' };
                } else if (name?.includes('vitamin a')) {
                    nutrients.vitaminA = { value, unit: 'µg' };
                }
                // Add more nutrient mappings as needed
            });
        }

        return {
            ...nutrients,
            calculationMethod: 'usda_lookup',
            dataSource: 'usda',
            calculatedAt: new Date(),
            confidence: 0.95,
            fdcId: food.fdcId
        };
    }

    // Format nutrition result with quantity adjustment
    formatNutritionResult(nutritionData, quantity, unit, method) {
        // Adjust nutrition values based on quantity
        const adjustedNutrition = this.adjustForQuantity(nutritionData, quantity, unit);

        return {
            success: true,
            nutrition: {
                ...adjustedNutrition,
                calculationMethod: method,
                calculatedAt: new Date(),
                originalQuantity: quantity,
                originalUnit: unit
            }
        };
    }

    // Adjust nutrition values for actual quantity
    adjustForQuantity(nutrition, quantity, unit) {
        // Most nutrition data is per 100g, adjust based on actual quantity
        const multiplier = this.getQuantityMultiplier(quantity, unit);

        const adjusted = {};
        Object.entries(nutrition).forEach(([key, value]) => {
            if (value && typeof value === 'object' && value.value !== undefined) {
                adjusted[key] = {
                    ...value,
                    value: value.value * multiplier
                };
            } else {
                adjusted[key] = value;
            }
        });

        return adjusted;
    }

    // Calculate quantity multiplier for nutrition adjustment
    getQuantityMultiplier(quantity, unit) {
        // Convert various units to grams for calculation
        const unitConversions = {
            'g': 1,
            'gram': 1,
            'grams': 1,
            'kg': 1000,
            'kilogram': 1000,
            'kilograms': 1000,
            'lb': 453.592,
            'pound': 453.592,
            'pounds': 453.592,
            'oz': 28.3495,
            'ounce': 28.3495,
            'ounces': 28.3495,
            'ml': 1, // Approximate for liquids
            'l': 1000,
            'liter': 1000,
            'cup': 240, // Approximate
            'cups': 240,
            'item': 100, // Default assumption for single items
            'each': 100,
            'piece': 100,
            'pieces': 100
        };

        const gramsPerUnit = unitConversions[unit?.toLowerCase()] || 100;
        const totalGrams = quantity * gramsPerUnit;

        // Most nutrition data is per 100g
        return totalGrams / 100;
    }

    // Fallback nutrition when all else fails
    getFallbackNutrition(itemData) {
        const { name, category, quantity, unit } = itemData;

        // Basic fallback based on category
        const fallbacks = {
            'Fresh Fruits': { calories: { value: 50, unit: 'kcal' }, carbs: { value: 12, unit: 'g' }, fiber: { value: 2, unit: 'g' } },
            'Fresh Vegetables': { calories: { value: 25, unit: 'kcal' }, carbs: { value: 5, unit: 'g' }, fiber: { value: 2, unit: 'g' } },
            'Fresh/Frozen Beef': { calories: { value: 200, unit: 'kcal' }, protein: { value: 22, unit: 'g' }, fat: { value: 12, unit: 'g' } },
            'Fresh/Frozen Poultry': { calories: { value: 165, unit: 'kcal' }, protein: { value: 25, unit: 'g' }, fat: { value: 7, unit: 'g' } },
            'Fresh/Frozen Fish & Seafood': { calories: { value: 150, unit: 'kcal' }, protein: { value: 22, unit: 'g' }, fat: { value: 6, unit: 'g' } },
            'Dairy': { calories: { value: 60, unit: 'kcal' }, protein: { value: 3, unit: 'g' }, fat: { value: 3, unit: 'g' }, carbs: { value: 5, unit: 'g' } }
        };

        const baseNutrition = fallbacks[category] || { calories: { value: 100, unit: 'kcal' } };

        return {
            success: true,
            nutrition: {
                ...this.adjustForQuantity(baseNutrition, quantity, unit),
                calculationMethod: 'estimated',
                dataSource: 'fallback',
                calculatedAt: new Date(),
                confidence: 0.3,
                warnings: ['Nutrition data estimated due to lack of specific information']
            }
        };
    }

    // Get nutrition quality score
    getNutritionQuality(nutrition) {
        if (!nutrition) return 'unknown';

        switch (nutrition.calculationMethod) {
            case 'upc_lookup':
            case 'usda_lookup':
                return 'high';
            case 'ai_estimated':
                return nutrition.confidence > 0.7 ? 'medium' : 'low';
            case 'estimated':
            case 'fallback':
                return 'low';
            default:
                return 'unknown';
        }
    }
}