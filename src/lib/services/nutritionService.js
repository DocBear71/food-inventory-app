// file: /src/lib/services/nutritionService.js - v1

// Open Food Facts API integration
const OPENFOODFACTS_API_BASE = 'https://world.openfoodfacts.org/api/v0';

export class NutritionService {

    // Search for food items in Open Food Facts database
    static async searchFoods(query, limit = 10) {
        try {
            const searchUrl = `${OPENFOODFACTS_API_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}`;

            const response = await fetch(searchUrl);

            if (!response.ok) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Open Food Facts API Failed',
                    message: `Open Food Facts API error: ${response.status}`
                });
                return;
            }

            const data = await response.json();

            return {
                success: true,
                foods: data.products?.map(product => ({
                    code: product.code,
                    name: product.product_name || product.product_name_en || 'Unknown Product',
                    brand: product.brands || product.brand_owner,
                    category: product.categories,
                    image: product.image_url || product.image_front_url,
                    // Extract nutrition per 100g
                    nutrients: this.extractNutrientsFromProduct(product)
                })) || []
            };

        } catch (error) {
            console.error('Open Food Facts search error:', error);
            return {
                success: false,
                error: error.message,
                foods: []
            };
        }
    }

    // Get detailed nutrition information for a specific product by barcode
    static async getProductByBarcode(barcode) {
        try {
            const response = await fetch(`${OPENFOODFACTS_API_BASE}/product/${barcode}.json`);

            if (!response.ok) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Open Food Facts API Failed',
                    message: `Open Food Facts API error: ${response.status}`
                });
                return;
            }

            const data = await response.json();

            if (data.status === 0 || !data.product) {
                return {
                    success: false,
                    error: 'Product not found',
                    product: null
                };
            }

            const product = data.product;

            return {
                success: true,
                product: {
                    code: product.code,
                    name: product.product_name || product.product_name_en || 'Unknown Product',
                    brand: product.brands || product.brand_owner,
                    category: product.categories,
                    image: product.image_url || product.image_front_url,
                    servingSize: product.serving_size,
                    nutrients: this.extractNutrientsFromProduct(product),
                    // Additional Open Food Facts specific data
                    nutriScore: product.nutriscore_grade,
                    novaGroup: product.nova_group,
                    ingredients: product.ingredients_text || product.ingredients_text_en
                }
            };

        } catch (error) {
            console.error('Open Food Facts product fetch error:', error);
            return {
                success: false,
                error: error.message,
                product: null
            };
        }
    }

    // Calculate nutrition for a recipe based on ingredients
    static async calculateRecipeNutrition(ingredients) {
        try {
            let totalNutrition = this.getEmptyNutritionProfile();
            let foundIngredients = 0;

            for (const ingredient of ingredients) {
                if (!ingredient.name || !ingredient.amount) continue;

                // First try to get nutrition data
                let nutritionData = null;

                // If ingredient has UPC, try to get exact product data
                if (ingredient.upc) {
                    const productResult = await this.getProductByBarcode(ingredient.upc);
                    if (productResult.success) {
                        nutritionData = productResult.product.nutrients;
                    }
                }

                // If no UPC or UPC lookup failed, search by name
                if (!nutritionData) {
                    const searchResult = await this.searchFoods(ingredient.name, 1);
                    if (searchResult.success && searchResult.foods.length > 0) {
                        nutritionData = searchResult.foods[0].nutrients;
                    }
                }

                // If still no data, try common ingredients fallback
                if (!nutritionData) {
                    nutritionData = this.getCommonIngredientNutrition(ingredient.name);
                }

                if (nutritionData) {
                    const amount = this.parseAmount(ingredient.amount);

                    if (amount > 0) {
                        // Scale nutrition based on amount (Open Food Facts data is per 100g)
                        const scaleFactor = amount / 100;

                        Object.keys(nutritionData).forEach(nutrient => {
                            if (nutritionData[nutrient] && typeof nutritionData[nutrient].value === 'number') {
                                totalNutrition[nutrient].value += nutritionData[nutrient].value * scaleFactor;
                            }
                        });

                        foundIngredients++;
                    }
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            return {
                success: true,
                nutrition: totalNutrition,
                coverage: foundIngredients / ingredients.length,
                foundIngredients,
                totalIngredients: ingredients.length
            };

        } catch (error) {
            console.error('Recipe nutrition calculation error:', error);
            return {
                success: false,
                error: error.message,
                nutrition: this.getEmptyNutritionProfile()
            };
        }
    }

    // Extract nutrients from Open Food Facts product data
    static extractNutrientsFromProduct(product) {
        if (!product.nutriments) {
            return this.getEmptyNutritionProfile();
        }

        const nutriments = product.nutriments;

        // Open Food Facts uses specific field names
        return {
            calories: {
                value: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
                unit: 'kcal',
                name: 'Calories'
            },
            protein: {
                value: nutriments.proteins_100g || nutriments.proteins || 0,
                unit: 'g',
                name: 'Protein'
            },
            fat: {
                value: nutriments.fat_100g || nutriments.fat || 0,
                unit: 'g',
                name: 'Fat'
            },
            carbs: {
                value: nutriments.carbohydrates_100g || nutriments.carbohydrates || 0,
                unit: 'g',
                name: 'Carbohydrates'
            },
            fiber: {
                value: nutriments.fiber_100g || nutriments.fiber || 0,
                unit: 'g',
                name: 'Fiber'
            },
            sugars: {
                value: nutriments.sugars_100g || nutriments.sugars || 0,
                unit: 'g',
                name: 'Sugars'
            },
            sodium: {
                value: (nutriments.sodium_100g || nutriments.sodium || 0) * 1000, // Convert to mg
                unit: 'mg',
                name: 'Sodium'
            },
            saturatedFat: {
                value: nutriments['saturated-fat_100g'] || nutriments['saturated-fat'] || 0,
                unit: 'g',
                name: 'Saturated Fat'
            },
            vitaminC: {
                value: (nutriments['vitamin-c_100g'] || nutriments['vitamin-c'] || 0) * 1000, // Convert to mg
                unit: 'mg',
                name: 'Vitamin C'
            },
            vitaminA: {
                value: nutriments['vitamin-a_100g'] || nutriments['vitamin-a'] || 0,
                unit: 'IU',
                name: 'Vitamin A'
            },
            calcium: {
                value: (nutriments.calcium_100g || nutriments.calcium || 0) * 1000, // Convert to mg
                unit: 'mg',
                name: 'Calcium'
            },
            iron: {
                value: (nutriments.iron_100g || nutriments.iron || 0) * 1000, // Convert to mg
                unit: 'mg',
                name: 'Iron'
            },
            potassium: {
                value: (nutriments.potassium_100g || nutriments.potassium || 0) * 1000, // Convert to mg
                unit: 'mg',
                name: 'Potassium'
            }
        };
    }

    // Parse amount string to number (handles "1 cup", "2.5", "1/2", etc.)
    static parseAmount(amountStr) {
        if (typeof amountStr === 'number') return amountStr;
        if (!amountStr || typeof amountStr !== 'string') return 0;

        // Remove common words and convert to number
        const cleaned = amountStr
            .toLowerCase()
            .replace(/[^0-9.\/\s]/g, '')
            .trim();

        // Handle fractions
        if (cleaned.includes('/')) {
            const parts = cleaned.split('/');
            if (parts.length === 2) {
                const fraction = parseFloat(parts[0]) / parseFloat(parts[1]);
                return fraction * 100; // Assume 100g base for typical recipe amounts
            }
        }

        // Handle decimal numbers
        const num = parseFloat(cleaned);
        if (isNaN(num)) return 0;

        // For small numbers (like 1, 2, 3), assume they're in typical recipe units
        // Convert to grams for calculation
        if (num <= 10) {
            return num * 50; // Assume 50g per "unit" for small amounts
        }

        return num; // For larger numbers, assume they're already in grams
    }

    // Get empty nutrition profile template
    static getEmptyNutritionProfile() {
        return {
            calories: { value: 0, unit: 'kcal', name: 'Calories' },
            protein: { value: 0, unit: 'g', name: 'Protein' },
            fat: { value: 0, unit: 'g', name: 'Fat' },
            carbs: { value: 0, unit: 'g', name: 'Carbohydrates' },
            fiber: { value: 0, unit: 'g', name: 'Fiber' },
            sugars: { value: 0, unit: 'g', name: 'Sugars' },
            sodium: { value: 0, unit: 'mg', name: 'Sodium' },
            saturatedFat: { value: 0, unit: 'g', name: 'Saturated Fat' },
            vitaminC: { value: 0, unit: 'mg', name: 'Vitamin C' },
            vitaminA: { value: 0, unit: 'IU', name: 'Vitamin A' },
            calcium: { value: 0, unit: 'mg', name: 'Calcium' },
            iron: { value: 0, unit: 'mg', name: 'Iron' },
            potassium: { value: 0, unit: 'mg', name: 'Potassium' }
        };
    }

    // Get nutrition data for common ingredients (fallback)
    static getCommonIngredientNutrition(ingredientName) {
        const commonNutrition = {
            // Pasta & Grains (per 100g)
            'pasta': { calories: 371, protein: 13, fat: 1.1, carbs: 75, fiber: 3.2, sodium: 6 },
            'penne': { calories: 371, protein: 13, fat: 1.1, carbs: 75, fiber: 3.2, sodium: 6 },
            'spaghetti': { calories: 371, protein: 13, fat: 1.1, carbs: 75, fiber: 3.2, sodium: 6 },
            'rice': { calories: 130, protein: 2.7, fat: 0.3, carbs: 28, fiber: 0.4, sodium: 5 },

            // Proteins (per 100g)
            'chicken breast': { calories: 165, protein: 31, fat: 3.6, carbs: 0, fiber: 0, sodium: 74 },
            'ground beef': { calories: 250, protein: 26, fat: 15, carbs: 0, fiber: 0, sodium: 75 },
            'salmon': { calories: 208, protein: 20, fat: 12, carbs: 0, fiber: 0, sodium: 59 },
            'eggs': { calories: 155, protein: 13, fat: 11, carbs: 1.1, fiber: 0, sodium: 124 },

            // Vegetables (per 100g)
            'onion': { calories: 40, protein: 1.1, fat: 0.1, carbs: 9.3, fiber: 1.7, sodium: 4 },
            'garlic': { calories: 149, protein: 6.4, fat: 0.5, carbs: 33, fiber: 2.1, sodium: 17 },
            'tomato': { calories: 18, protein: 0.9, fat: 0.2, carbs: 3.9, fiber: 1.2, sodium: 5 },
            'bell pepper': { calories: 31, protein: 1, fat: 0.3, carbs: 7, fiber: 2.5, sodium: 4 },
            'mushroom': { calories: 22, protein: 3.1, fat: 0.3, carbs: 3.3, fiber: 1, sodium: 5 },

            // Dairy (per 100g)
            'milk': { calories: 42, protein: 3.4, fat: 1, carbs: 5, fiber: 0, sodium: 44 },
            'cheese': { calories: 113, protein: 7, fat: 9, carbs: 1, fiber: 0, sodium: 621 },
            'butter': { calories: 717, protein: 0.9, fat: 81, carbs: 0.1, fiber: 0, sodium: 643 },

            // Oils & Fats (per 100g)
            'olive oil': { calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, sodium: 2 },
            'vegetable oil': { calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, sodium: 0 },

            // Seasonings (per 100g - but used in much smaller quantities)
            'salt': { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 38758 },
            'black pepper': { calories: 251, protein: 10.4, fat: 3.3, carbs: 64, fiber: 25.3, sodium: 20 }
        };

        const name = ingredientName.toLowerCase();

        // Find best match
        let bestMatch = null;
        let highestScore = 0;

        Object.keys(commonNutrition).forEach(key => {
            if (name.includes(key) || key.includes(name)) {
                const score = Math.min(key.length, name.length) / Math.max(key.length, name.length);
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = key;
                }
            }
        });

        if (bestMatch && highestScore > 0.5) {
            const nutrition = commonNutrition[bestMatch];
            return {
                calories: { value: nutrition.calories, unit: 'kcal', name: 'Calories' },
                protein: { value: nutrition.protein, unit: 'g', name: 'Protein' },
                fat: { value: nutrition.fat, unit: 'g', name: 'Fat' },
                carbs: { value: nutrition.carbs, unit: 'g', name: 'Carbohydrates' },
                fiber: { value: nutrition.fiber, unit: 'g', name: 'Fiber' },
                sodium: { value: nutrition.sodium, unit: 'mg', name: 'Sodium' }
            };
        }

        return null;
    }

    // Helper method to get nutrition by UPC (integrates with your existing UPC system)
    static async getNutritionByUPC(upc) {
        return await this.getProductByBarcode(upc);
    }

    // Method to enhance your existing UPC lookup with nutrition data
    static async enhanceUPCProductWithNutrition(existingProduct) {
        if (!existingProduct || !existingProduct.upc) {
            return existingProduct;
        }

        try {
            const nutritionResult = await this.getProductByBarcode(existingProduct.upc);

            if (nutritionResult.success) {
                return {
                    ...existingProduct,
                    nutrition: nutritionResult.product.nutrients,
                    nutriScore: nutritionResult.product.nutriScore,
                    novaGroup: nutritionResult.product.novaGroup
                };
            }
        } catch (error) {
            console.error('Error enhancing UPC product with nutrition:', error);
        }

        return existingProduct;
    }
}