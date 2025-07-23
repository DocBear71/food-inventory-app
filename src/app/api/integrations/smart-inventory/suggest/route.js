// file: /src/app/api/integrations/smart-inventory/suggest/route.js v3 - Fixed to match Python script exactly

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        const requestData = await request.json();
        console.log('🧠 Smart inventory suggest API called with:', JSON.stringify(requestData, null, 2));

        // Extract the data that should be sent to Modal.com
        const {
            type = 'recipe_suggestions',
            userId,
            data
        } = requestData;

        if (!data || !data.inventory) {
            return NextResponse.json({
                success: false,
                error: 'Inventory data is required'
            }, { status: 400 });
        }

        console.log('📤 Calling Modal.com smart-inventory-manager...');

        // FIXED: Use the correct deployed endpoint URL
        const modalEndpoint = process.env.MODAL_INVENTORY_ENDPOINT_URL ||
            'https://docbear71--smart-inventory-manager-suggest-ingredients.modal.run';

        // Format the request exactly as your Python script expects
        const modalRequest = {
            type: type,
            userId: userId || session.user.id,
            data: {
                inventory: data.inventory.map(item => ({
                    name: item.name || item.ingredient || 'Unknown Item',
                    category: item.category || 'Other',
                    quantity: parseFloat(item.quantity) || 1,
                    unit: item.unit || '',
                    expirationDate: item.expirationDate || null
                })),
                preferences: data.preferences || {},
                ...(data.goals && { goals: data.goals }),
                ...(data.mealPlans && { mealPlans: data.mealPlans }),
                ...(data.budget && { budget: data.budget }),
                ...(data.nutritionGoals && { nutritionGoals: data.nutritionGoals }),
                ...(data.timeframe && { timeframe: data.timeframe })
            }
        };

        console.log('🔗 Modal.com endpoint:', modalEndpoint);
        console.log('📊 Modal.com request payload:', JSON.stringify(modalRequest, null, 2));

        const modalResponse = await fetch(modalEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'DocBearsComfortKitchen/1.3.1'
            },
            body: JSON.stringify(modalRequest)
        });

        console.log('📥 Modal.com response status:', modalResponse.status);
        console.log('📥 Modal.com response headers:', Object.fromEntries(modalResponse.headers.entries()));

        if (!modalResponse.ok) {
            const errorText = await modalResponse.text();
            console.error('❌ Modal.com error response:', {
                status: modalResponse.status,
                statusText: modalResponse.statusText,
                body: errorText
            });

            // Return fallback response instead of failing completely
            return NextResponse.json({
                success: true,
                fallback: true,
                suggestions: generateFallbackSuggestions(data.inventory),
                error: `Modal.com service error: ${modalResponse.status} - ${errorText}`,
                debug: {
                    endpoint: modalEndpoint,
                    requestData: modalRequest
                }
            });
        }

        const modalResult = await modalResponse.json();
        console.log('✅ Modal.com response data:', JSON.stringify(modalResult, null, 2));

        // Check if Modal.com returned success
        if (modalResult.success) {
            // Transform response based on request type
            const transformedResponse = {
                success: true,
                method: 'modal_ai_enhanced',
                metadata: {
                    processedAt: new Date().toISOString(),
                    requestType: type,
                    modalResponse: modalResult.method || 'unknown'
                }
            };

            // Add type-specific data
            switch (type) {
                case 'recipe_suggestions':
                    transformedResponse.suggestions = modalResult.suggestions || [];
                    transformedResponse.utilization = modalResult.utilization || {};
                    transformedResponse.shoppingNeeded = modalResult.shoppingNeeded || [];
                    break;

                case 'inventory_optimization':
                    transformedResponse.optimizations = modalResult.optimizations || [];
                    transformedResponse.wasteReduction = modalResult.wasteReduction || {};
                    transformedResponse.costSavings = modalResult.costSavings || {};
                    transformedResponse.nutritionImprovements = modalResult.nutritionImprovements || {};
                    break;

                case 'smart_shopping_list':
                    transformedResponse.shoppingList = modalResult.shoppingList || [];
                    transformedResponse.estimatedCost = modalResult.estimatedCost || {};
                    transformedResponse.nutritionImpact = modalResult.nutritionImpact || {};
                    transformedResponse.alternatives = modalResult.alternatives || {};
                    transformedResponse.smartSuggestions = modalResult.smartSuggestions || [];
                    break;

                case 'meal_plan_suggestions':
                    transformedResponse.mealPlan = modalResult.mealPlan || {};
                    transformedResponse.utilization = modalResult.utilization || {};
                    transformedResponse.nutrition = modalResult.nutrition || {};
                    transformedResponse.cost = modalResult.cost || {};
                    transformedResponse.shoppingList = modalResult.shoppingList || [];
                    break;

                default:
                    // Return all data for unknown types
                    Object.assign(transformedResponse, modalResult);
            }

            return NextResponse.json(transformedResponse);
        } else {
            console.warn('⚠️ Modal.com returned failure:', modalResult);
            return NextResponse.json({
                success: true,
                fallback: true,
                suggestions: generateFallbackSuggestions(data.inventory),
                error: modalResult.error || 'Modal.com processing failed',
                debug: {
                    modalResponse: modalResult,
                    endpoint: modalEndpoint
                }
            });
        }

    } catch (error) {
        console.error('❌ Smart inventory API error:', error);

        // Return fallback instead of complete failure
        return NextResponse.json({
            success: true,
            fallback: true,
            suggestions: generateFallbackSuggestions([]),
            error: error.message,
            metadata: {
                processedAt: new Date().toISOString(),
                fallbackReason: 'API_ERROR'
            },
            debug: {
                errorStack: error.stack
            }
        });
    }
}

// Enhanced fallback suggestions when Modal.com is unavailable
function generateFallbackSuggestions(inventory = []) {
    console.log('🔄 Generating enhanced fallback suggestions for', inventory.length, 'items');

    const fallbackSuggestions = [];

    if (!Array.isArray(inventory) || inventory.length === 0) {
        return [{
            name: 'Getting Started',
            description: 'Add some ingredients to your inventory to get personalized recipe suggestions',
            cookingTime: 0,
            difficulty: 'easy',
            inventoryUsage: 0,
            missingIngredients: []
        }];
    }

    // Analyze inventory for meaningful suggestions
    const proteins = inventory.filter(item =>
        item.category?.toLowerCase().includes('meat') ||
        item.category?.toLowerCase().includes('poultry') ||
        item.category?.toLowerCase().includes('fish') ||
        item.category?.toLowerCase().includes('seafood') ||
        ['chicken', 'beef', 'pork', 'fish', 'salmon', 'eggs'].some(p =>
            item.name?.toLowerCase().includes(p)
        )
    );

    const vegetables = inventory.filter(item =>
        item.category?.toLowerCase().includes('vegetable') ||
        item.category?.toLowerCase().includes('produce') ||
        ['tomato', 'onion', 'pepper', 'broccoli', 'spinach', 'carrot'].some(v =>
            item.name?.toLowerCase().includes(v)
        )
    );

    const grains = inventory.filter(item =>
        item.category?.toLowerCase().includes('grain') ||
        ['rice', 'pasta', 'bread', 'quinoa', 'oats'].some(g =>
            item.name?.toLowerCase().includes(g)
        )
    );

    const dairy = inventory.filter(item =>
        item.category?.toLowerCase().includes('dairy') ||
        ['milk', 'cheese', 'yogurt', 'butter'].some(d =>
            item.name?.toLowerCase().includes(d)
        )
    );

    // Generate contextual suggestions based on available ingredients
    if (proteins.length > 0 && vegetables.length > 0) {
        const protein = proteins[0];
        const veggie = vegetables[0];

        fallbackSuggestions.push({
            name: `${protein.name} & ${veggie.name} Stir-Fry`,
            description: `Quick and healthy meal combining your ${protein.name.toLowerCase()} with fresh ${veggie.name.toLowerCase()}`,
            cookingTime: 25,
            difficulty: 'easy',
            inventoryUsage: 0.7,
            missingIngredients: [
                { item: 'cooking oil', amount: '2 tbsp', essential: true },
                { item: 'soy sauce or seasonings', amount: '2-3 tbsp', essential: false }
            ]
        });
    }

    if (grains.length > 0 && (vegetables.length > 0 || proteins.length > 0)) {
        const grain = grains[0];
        const other = vegetables.length > 0 ? vegetables[0] : proteins[0];

        fallbackSuggestions.push({
            name: `${grain.name} Bowl with ${other.name}`,
            description: `Nutritious bowl featuring your ${grain.name.toLowerCase()} topped with ${other.name.toLowerCase()}`,
            cookingTime: 20,
            difficulty: 'easy',
            inventoryUsage: 0.6,
            missingIngredients: [
                { item: 'seasonings', amount: 'to taste', essential: false },
                { item: 'sauce or dressing', amount: '2-3 tbsp', essential: false }
            ]
        });
    }

    if (dairy.length > 0 && grains.length > 0) {
        const dairyItem = dairy[0];
        const grain = grains[0];

        fallbackSuggestions.push({
            name: `Creamy ${grain.name} with ${dairyItem.name}`,
            description: `Comforting dish using your ${grain.name.toLowerCase()} and ${dairyItem.name.toLowerCase()}`,
            cookingTime: 15,
            difficulty: 'easy',
            inventoryUsage: 0.5,
            missingIngredients: [
                { item: 'herbs or spices', amount: 'to taste', essential: false }
            ]
        });
    }

    // Add a generic suggestion using the most common ingredients
    const topIngredients = inventory.slice(0, 3);
    if (topIngredients.length >= 2) {
        fallbackSuggestions.push({
            name: 'Simple Multi-Ingredient Dish',
            description: `Creative combination using ${topIngredients.map(i => i.name.toLowerCase()).join(', ')} from your inventory`,
            cookingTime: 30,
            difficulty: 'medium',
            inventoryUsage: 0.4,
            missingIngredients: [
                { item: 'basic cooking essentials', amount: 'as needed', essential: true }
            ]
        });
    }

    // Ensure we always have at least one suggestion
    if (fallbackSuggestions.length === 0) {
        fallbackSuggestions.push({
            name: 'Inventory-Based Cooking',
            description: 'Use your available ingredients creatively to make a simple, balanced meal',
            cookingTime: 20,
            difficulty: 'easy',
            inventoryUsage: 0.4,
            missingIngredients: [
                { item: 'basic seasonings', amount: 'to taste', essential: false }
            ]
        });
    }

    return fallbackSuggestions.slice(0, 5); // Limit to 5 suggestions
}