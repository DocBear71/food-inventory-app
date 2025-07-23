// file: /src/lib/modal-bridge.js v4 - Fixed with correct smart-inventory-manager endpoint URLs

class ModalServiceBridge {
    constructor() {
        this.baseUrl = process.env.MODAL_ENDPOINT_URL || 'https://docbear71--social-video-recipe-extractor-extract-recipe--01df04.modal.run';
        this.receiptUrl = process.env.MODAL_RECEIPT_ENDPOINT_URL || 'https://docbear71--receipt-processor-process-receipt-with-ai.modal.run';
        this.nutritionUrl = process.env.MODAL_NUTRITION_ENDPOINT_URL || 'https://docbear71--unified-nutrition-analyzer-analyze-nutrition.modal.run';

        // FIXED: Correct smart-inventory-manager endpoint from your deployment
        this.inventoryUrl = process.env.MODAL_INVENTORY_ENDPOINT_URL || 'https://docbear71--smart-inventory-manager-suggest-ingredients.modal.run';

        // Health check endpoint for testing connectivity
        this.inventoryHealthUrl = 'https://docbear71--smart-inventory-manager-health.modal.run';

        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': 'DocBearsComfortKitchen/1.3.1'
        };
    }

    async makeRequest(url, data, options = {}) {
        const requestOptions = {
            method: 'POST',
            headers: {
                ...this.defaultHeaders,
                ...options.headers
            },
            body: JSON.stringify(data),
            ...options
        };

        try {
            console.log(`🔗 Modal request to: ${url}`);
            console.log(`📊 Request data:`, JSON.stringify(data, null, 2));

            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Modal service error: ${response.status} ${response.statusText}`, errorText);
                throw new Error(`Modal service error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ Modal response received from: ${url}`, result);
            return result;
        } catch (error) {
            console.error(`❌ Modal request failed:`, error);
            throw error;
        }
    }

    // ENHANCED: Recipe extraction with optional image extraction
    async extractRecipe(videoData) {
        return this.makeRequest(this.baseUrl, {
            ...videoData,
            extract_image: videoData.extract_image || false
        });
    }

    // Receipt processing
    async processReceipt(receiptData) {
        return this.makeRequest(this.receiptUrl, receiptData);
    }

    // Nutrition analysis
    async analyzeNutrition(nutritionData) {
        return this.makeRequest(this.nutritionUrl, nutritionData);
    }

    // FIXED: Smart inventory suggestions with correct format matching Python script
    async suggestInventoryItems(inventoryData) {
        console.log('🧠 Calling smart-inventory-manager with data:', inventoryData);

        // Format data to match Python endpoint expectations exactly
        const formattedData = {
            type: inventoryData.type || 'recipe_suggestions',
            userId: inventoryData.userId || inventoryData.user_id,
            data: inventoryData.data || {
                inventory: inventoryData.items || inventoryData.inventory || [],
                preferences: inventoryData.preferences || {}
            }
        };

        console.log('🎯 Formatted data for Python script:', JSON.stringify(formattedData, null, 2));

        return this.makeRequest(this.inventoryUrl, formattedData);
    }

    // NEW: Test smart inventory connection
    async testSmartInventoryConnection() {
        try {
            console.log('🩺 Testing smart inventory health...');

            // First test health endpoint
            const healthResponse = await fetch(this.inventoryHealthUrl, {
                method: 'GET',
                headers: this.defaultHeaders
            });

            if (healthResponse.ok) {
                const healthData = await healthResponse.json();
                console.log('✅ Health check passed:', healthData);
            }

            // Then test actual functionality
            const testData = {
                type: 'recipe_suggestions',
                userId: 'test_user',
                data: {
                    inventory: [
                        {
                            name: 'Chicken Breast',
                            category: 'Fresh/Frozen Poultry',
                            quantity: 2,
                            unit: 'lbs'
                        },
                        {
                            name: 'Broccoli',
                            category: 'Fresh Vegetables',
                            quantity: 1,
                            unit: 'head'
                        }
                    ],
                    preferences: {
                        cookingTime: '30 minutes',
                        difficulty: 'easy'
                    }
                }
            };

            const result = await this.suggestInventoryItems(testData);
            console.log('✅ Smart inventory connection test successful:', result);
            return result;
        } catch (error) {
            console.error('❌ Smart inventory connection test failed:', error);
            throw error;
        }
    }

    // ENHANCED: Recipe extraction with nutrition analysis and optional image
    async extractRecipeWithNutrition(videoData) {
        try {
            // First extract the recipe with optional image
            const recipeResult = await this.extractRecipe({
                ...videoData,
                extract_image: videoData.extract_image || false
            });

            if (recipeResult.success && recipeResult.recipe) {
                // Then analyze nutrition for the recipe
                try {
                    const nutritionResult = await this.analyzeNutrition({
                        recipe: recipeResult.recipe,
                        analysis_type: 'comprehensive'
                    });

                    if (nutritionResult.success) {
                        recipeResult.recipe.nutrition = nutritionResult.nutrition;
                        recipeResult.recipe.nutritionAnalysis = nutritionResult.analysis;
                    }
                } catch (nutritionError) {
                    console.warn('⚠️ Nutrition analysis failed, continuing with recipe only:', nutritionError);
                }

                // Log if image was extracted
                if (recipeResult.recipe.extractedImage) {
                    console.log('📸 Image extracted from video:', {
                        method: recipeResult.recipe.extractedImage.extractionMethod,
                        frameCount: recipeResult.recipe.extractedImage.frameCount,
                        platform: recipeResult.recipe.extractedImage.source
                    });
                }
            }

            return recipeResult;
        } catch (error) {
            console.error('❌ Enhanced recipe extraction failed:', error);
            throw error;
        }
    }

    // Recipe extraction with image extraction enabled by default
    async extractRecipeWithImage(videoData) {
        return this.extractRecipeWithNutrition({
            ...videoData,
            extract_image: true
        });
    }

    // Process receipt with inventory suggestions
    async processReceiptWithSuggestions(receiptData, userId) {
        try {
            // Process the receipt
            const receiptResult = await this.processReceipt(receiptData);

            if (receiptResult.success && receiptResult.receipt_data?.items) {
                // Get smart inventory suggestions
                try {
                    const suggestionResult = await this.suggestInventoryItems({
                        type: 'smart_shopping_list',
                        userId: userId,
                        data: {
                            currentInventory: receiptResult.receipt_data.items,
                            preferences: {}
                        }
                    });

                    if (suggestionResult.success) {
                        receiptResult.receipt_data.smartSuggestions = suggestionResult.suggestions;
                        receiptResult.receipt_data.inventoryOptimizations = suggestionResult.optimizations;
                    }
                } catch (suggestionError) {
                    console.warn('⚠️ Inventory suggestions failed, continuing with receipt only:', suggestionError);
                }
            }

            return receiptResult;
        } catch (error) {
            console.error('❌ Enhanced receipt processing failed:', error);
            throw error;
        }
    }

    // NEW: Get recipe suggestions from inventory
    async getRecipeSuggestions(inventoryItems, preferences = {}) {
        return this.suggestInventoryItems({
            type: 'recipe_suggestions',
            data: {
                inventory: inventoryItems,
                preferences: preferences
            }
        });
    }

    // NEW: Optimize inventory for waste reduction
    async optimizeInventory(inventoryItems, goals = ['reduce_waste', 'save_money']) {
        return this.suggestInventoryItems({
            type: 'inventory_optimization',
            data: {
                inventory: inventoryItems,
                goals: goals
            }
        });
    }

    // NEW: Generate smart shopping list
    async generateSmartShoppingList(currentInventory, mealPlans = [], preferences = {}, budget = null) {
        return this.suggestInventoryItems({
            type: 'smart_shopping_list',
            data: {
                currentInventory: currentInventory,
                mealPlans: mealPlans,
                preferences: preferences,
                budget: budget
            }
        });
    }

    // NEW: Get meal plan suggestions
    async getMealPlanSuggestions(inventoryItems, preferences = {}, nutritionGoals = null, timeframe = 'week') {
        return this.suggestInventoryItems({
            type: 'meal_plan_suggestions',
            data: {
                inventory: inventoryItems,
                preferences: preferences,
                nutritionGoals: nutritionGoals,
                timeframe: timeframe
            }
        });
    }
}

// Export singleton instance
export const modalBridge = new ModalServiceBridge();
export default modalBridge;