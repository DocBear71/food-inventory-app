// file: /src/lib/modal-bridge.js v2 - Enhanced with image extraction support

class ModalServiceBridge {
    constructor() {
        this.baseUrl = process.env.MODAL_ENDPOINT_URL || 'https://docbear71--social-video-recipe-extractor-extract-recipe--01df04.modal.run';
        this.receiptUrl = process.env.MODAL_RECEIPT_ENDPOINT_URL || 'https://docbear71--receipt-processor-process-receipt-with-ai.modal.run';
        this.nutritionUrl = process.env.MODAL_NUTRITION_ENDPOINT_URL || 'https://docbear71--unified-nutrition-analyzer-analyze-nutrition.modal.run';
        this.inventoryUrl = process.env.MODAL_INVENTORY_ENDPOINT_URL || 'https://docbear71--smart-inventory-manager-suggest-ingredients.modal.run';

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
            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                throw new Error(`Modal service error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log(`✅ Modal response received from: ${url}`);
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
            extract_image: videoData.extract_image || false  // NEW: Image extraction flag
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

    // Smart inventory suggestions
    async suggestInventoryItems(inventoryData) {
        return this.makeRequest(this.inventoryUrl, inventoryData);
    }

    // ENHANCED: Recipe extraction with nutrition analysis and optional image
    async extractRecipeWithNutrition(videoData) {
        try {
            // First extract the recipe with optional image
            const recipeResult = await this.extractRecipe({
                ...videoData,
                extract_image: videoData.extract_image || false  // NEW: Pass image flag
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

                // NEW: Log if image was extracted
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

    // NEW: Recipe extraction with image extraction enabled by default
    async extractRecipeWithImage(videoData) {
        return this.extractRecipeWithNutrition({
            ...videoData,
            extract_image: true  // Force image extraction
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
                        items: receiptResult.receipt_data.items,
                        userId: userId,
                        context: 'receipt_processing'
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
}

// Export singleton instance
export const modalBridge = new ModalServiceBridge();
export default modalBridge;