// file: /src/app/api/integrations/smart-inventory/suggest/route.js v2 - Fixed Modal.com integration

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
        console.log('🧠 Smart inventory suggest API called with:', requestData);

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

        // FIXED: Call Modal.com directly with correct endpoint
        const modalEndpoint = process.env.MODAL_INVENTORY_ENDPOINT_URL ||
            'https://docbear71--smart-inventory-manager-suggest-ingredients.modal.run';

        // Format the request exactly as your Python script expects
        const modalRequest = {
            type: type,
            userId: userId || session.user.id,
            data: {
                inventory: data.inventory || [],
                preferences: data.preferences || {}
            }
        };

        console.log('🔗 Modal.com endpoint:', modalEndpoint);
        console.log('📊 Modal.com request:', JSON.stringify(modalRequest, null, 2));

        const modalResponse = await fetch(modalEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'DocBearsComfortKitchen/1.3.1'
            },
            body: JSON.stringify(modalRequest)
        });

        console.log('📥 Modal.com response status:', modalResponse.status);

        if (!modalResponse.ok) {
            const errorText = await modalResponse.text();
            console.error('❌ Modal.com error:', modalResponse.status, errorText);

            // Return fallback response instead of failing completely
            return NextResponse.json({
                success: true,
                fallback: true,
                suggestions: generateFallbackSuggestions(data.inventory),
                error: `Modal.com service temporarily unavailable: ${modalResponse.status}`
            });
        }

        const modalResult = await modalResponse.json();
        console.log('✅ Modal.com response:', modalResult);

        // Check if Modal.com returned success
        if (modalResult.success) {
            return NextResponse.json({
                success: true,
                suggestions: modalResult.suggestions || [],
                utilization: modalResult.utilization || {},
                shoppingNeeded: modalResult.shoppingNeeded || [],
                aiInsights: modalResult.aiInsights || null,
                method: 'modal_ai_enhanced',
                metadata: {
                    processedAt: new Date().toISOString(),
                    modalResponse: modalResult.metadata || {}
                }
            });
        } else {
            console.warn('⚠️ Modal.com returned failure:', modalResult);
            return NextResponse.json({
                success: true,
                fallback: true,
                suggestions: generateFallbackSuggestions(data.inventory),
                error: modalResult.error || 'Modal.com processing failed'
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
            }
        });
    }
}

// Fallback suggestions when Modal.com is unavailable
function generateFallbackSuggestions(inventory = []) {
    console.log('🔄 Generating fallback suggestions for', inventory.length, 'items');

    const fallbackSuggestions = [];

    // Create basic recipe suggestions based on inventory
    if (inventory.length > 0) {
        const hasProtein = inventory.some(item =>
            item.name?.toLowerCase().includes('chicken') ||
            item.name?.toLowerCase().includes('beef') ||
            item.name?.toLowerCase().includes('fish') ||
            item.name?.toLowerCase().includes('eggs')
        );

        const hasVeggies = inventory.some(item =>
            item.category?.toLowerCase().includes('vegetable') ||
            item.name?.toLowerCase().includes('tomato') ||
            item.name?.toLowerCase().includes('onion') ||
            item.name?.toLowerCase().includes('pepper')
        );

        const hasGrains = inventory.some(item =>
            item.name?.toLowerCase().includes('rice') ||
            item.name?.toLowerCase().includes('pasta') ||
            item.name?.toLowerCase().includes('bread')
        );

        if (hasProtein && hasVeggies) {
            fallbackSuggestions.push({
                name: 'Protein & Vegetable Stir-Fry',
                description: 'Quick and healthy meal using your available protein and vegetables',
                cookingTime: 25,
                difficulty: 'easy',
                inventoryUsage: 0.7,
                missingIngredients: [
                    { item: 'cooking oil', amount: '2 tbsp', essential: true },
                    { item: 'soy sauce', amount: '3 tbsp', essential: false }
                ]
            });
        }

        if (hasGrains && hasVeggies) {
            fallbackSuggestions.push({
                name: 'Vegetable Grain Bowl',
                description: 'Nutritious bowl combining your grains and fresh vegetables',
                cookingTime: 20,
                difficulty: 'easy',
                inventoryUsage: 0.6,
                missingIngredients: [
                    { item: 'olive oil', amount: '2 tbsp', essential: true }
                ]
            });
        }

        if (hasProtein && hasGrains) {
            fallbackSuggestions.push({
                name: 'Protein & Grain Combo',
                description: 'Satisfying meal pairing your protein with grains',
                cookingTime: 30,
                difficulty: 'medium',
                inventoryUsage: 0.8,
                missingIngredients: [
                    { item: 'seasonings', amount: 'to taste', essential: false }
                ]
            });
        }
    }

    // Always provide at least one suggestion
    if (fallbackSuggestions.length === 0) {
        fallbackSuggestions.push({
            name: 'Simple Ingredient Preparation',
            description: 'Basic preparation ideas for your available ingredients',
            cookingTime: 15,
            difficulty: 'easy',
            inventoryUsage: 0.4,
            missingIngredients: [
                { item: 'basic seasonings', amount: 'to taste', essential: false }
            ]
        });
    }

    return fallbackSuggestions;
}