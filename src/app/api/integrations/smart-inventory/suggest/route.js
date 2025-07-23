// file: /src/app/api/integrations/smart-inventory/suggest/route.js - Complete with Modal.com integration
import { modalBridge } from '@/lib/modal-bridge';

export async function POST(request) {
    try {
        const { items, userId, context, preferences } = await request.json();

        if (!items || !Array.isArray(items)) {
            return Response.json({
                success: false,
                error: 'Invalid items array provided'
            }, { status: 400 });
        }

        console.log('🧠 Processing AI inventory suggestions for', items.length, 'items');

        // Call Modal.com smart-inventory-manager
        const inventoryData = {
            items: items.map(item => ({
                name: item.name,
                category: item.category,
                quantity: item.quantity || 1,
                unit: item.unit || '',
                context: context || 'shopping_list'
            })),
            user_id: userId,
            analysis_type: 'shopping_enhancement',
            preferences: {
                dietary_restrictions: preferences?.dietaryRestrictions || [],
                budget_conscious: preferences?.budgetConscious || false,
                organic_preference: preferences?.organicPreference || false,
                store_brands_ok: preferences?.storeBrandsOk || true
            },
            context_metadata: {
                source: 'enhanced_ai_shopping_modal',
                timestamp: new Date().toISOString(),
                shopping_context: context
            }
        };

        const result = await modalBridge.suggestInventoryItems(inventoryData);

        if (result.success) {
            console.log('✅ AI suggestions received from Modal.com');

            return Response.json({
                success: true,
                suggestions: result.suggestions,
                optimizations: result.optimizations,
                aiInsights: result.ai_insights,
                categoryImprovements: result.category_improvements,
                costOptimizations: result.cost_optimizations,
                metadata: {
                    processedAt: new Date().toISOString(),
                    itemCount: items.length,
                    modalResponse: result.metadata
                }
            });
        } else {
            console.error('❌ Modal.com AI suggestions failed:', result.error);

            return Response.json({
                success: false,
                error: 'AI suggestions service temporarily unavailable',
                fallback: true,
                suggestions: generateFallbackSuggestions(items)
            }, { status: 503 });
        }

    } catch (error) {
        console.error('❌ Smart inventory API error:', error);

        return Response.json({
            success: false,
            error: error.message,
            fallback: true,
            suggestions: generateFallbackSuggestions(items || [])
        }, { status: 500 });
    }
}

// Fallback suggestions when Modal.com is unavailable
function generateFallbackSuggestions(items) {
    const fallbackSuggestions = {
        categoryOptimizations: [],
        smartAlternatives: [],
        costSavings: [],
        healthierOptions: []
    };

    // Basic category suggestions
    items.forEach(item => {
        // Suggest common alternatives
        if (item.name?.toLowerCase().includes('milk')) {
            fallbackSuggestions.smartAlternatives.push({
                original: item.name,
                suggestion: 'Store brand milk',
                reason: 'Save 20-30% with store brand',
                savings: 0.50
            });
        }

        if (item.name?.toLowerCase().includes('bread')) {
            fallbackSuggestions.smartAlternatives.push({
                original: item.name,
                suggestion: 'Whole grain bread',
                reason: 'Better nutritional value',
                healthBenefit: 'Higher fiber content'
            });
        }

        // Category optimization suggestions
        if (item.category === 'General' || item.category === 'Other') {
            const categoryName = item.name?.toLowerCase();

            if (categoryName?.includes('milk') || categoryName?.includes('cheese') || categoryName?.includes('yogurt')) {
                fallbackSuggestions.categoryOptimizations.push({
                    item: item.name,
                    currentCategory: item.category,
                    suggestedCategory: 'Dairy',
                    reason: 'Better organization'
                });
            } else if (categoryName?.includes('apple') || categoryName?.includes('banana') || categoryName?.includes('fruit')) {
                fallbackSuggestions.categoryOptimizations.push({
                    item: item.name,
                    currentCategory: item.category,
                    suggestedCategory: 'Fresh Fruits',
                    reason: 'Better organization'
                });
            } else if (categoryName?.includes('chicken') || categoryName?.includes('beef') || categoryName?.includes('meat')) {
                fallbackSuggestions.categoryOptimizations.push({
                    item: item.name,
                    currentCategory: item.category,
                    suggestedCategory: 'Fresh Meat',
                    reason: 'Better organization'
                });
            }
        }
    });

    return fallbackSuggestions;
}