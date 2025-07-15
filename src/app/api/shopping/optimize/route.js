// file: src/app/api/shopping/optimize/route.js v1

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Shopping list optimization API
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const {
            shoppingItems = [],
            storePreference = '',
            budgetConstraints = {},
            householdSize = 2,
            optimizationPreferences = {
                prioritizeHealth: true,
                minimizeWaste: true,
                bulkBuying: false,
                organicPreference: false
            }
        } = await request.json();

        if (!Array.isArray(shoppingItems) || shoppingItems.length === 0) {
            return NextResponse.json(
                { error: 'Shopping items list is required' },
                { status: 400 }
            );
        }

        const userId = session.user.id;
        console.log(`🛒 Optimizing shopping list for user ${userId}: ${shoppingItems.length} items`);

        // Connect to database for historical data
        const { db } = await connectDB();

        // Get user's purchasing history
        const purchaseHistory = await getUserPurchaseHistory(db, userId);

        // Get current inventory to avoid duplicates
        const currentInventory = await db.collection('food_inventory')
            .find({ userId: userId })
            .toArray();

        // Analyze and optimize the shopping list
        const optimizedList = await optimizeShoppingList({
            items: shoppingItems,
            storePreference,
            budgetConstraints,
            householdSize,
            preferences: optimizationPreferences,
            purchaseHistory,
            currentInventory
        });

        // Generate smart suggestions
        const smartSuggestions = await generateSmartSuggestions({
            optimizedItems: optimizedList.items,
            purchaseHistory,
            preferences: optimizationPreferences,
            householdSize
        });

        // Store the optimized shopping list
        const shoppingListRecord = {
            userId: userId,
            originalItems: shoppingItems,
            optimizedItems: optimizedList.items,
            storePreference: storePreference,
            totalEstimatedCost: optimizedList.totalCost,
            optimization: optimizedList.optimization,
            smartSuggestions: smartSuggestions,
            createdAt: new Date(),
            status: 'active'
        };

        const result = await db.collection('shopping_lists').insertOne(shoppingListRecord);

        console.log(`✅ Shopping list optimized: ${optimizedList.items.length} items, $${optimizedList.totalCost.toFixed(2)} estimated`);

        return NextResponse.json({
            success: true,
            data: {
                shoppingListId: result.insertedId,
                optimizedItems: optimizedList.items,
                storeLayout: optimizedList.storeLayout,
                optimization: optimizedList.optimization,
                smartSuggestions: smartSuggestions,
                summary: {
                    totalItems: optimizedList.items.length,
                    estimatedCost: optimizedList.totalCost,
                    estimatedSavings: optimizedList.estimatedSavings,
                    shoppingTime: optimizedList.estimatedShoppingTime,
                    wasteReduction: optimizedList.wasteReduction
                }
            }
        });

    } catch (error) {
        console.error('Shopping optimization error:', error);
        return NextResponse.json(
            { error: 'Shopping list optimization failed' },
            { status: 500 }
        );
    }
}

async function getUserPurchaseHistory(db, userId) {
    try {
        // Get recent purchase history from receipts and manual additions
        const recentPurchases = await db.collection('food_inventory')
            .find({
                userId: userId,
                purchaseDate: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
            })
            .sort({ purchaseDate: -1 })
            .limit(200)
            .toArray();

        // Analyze purchasing patterns
        const patterns = {};
        recentPurchases.forEach(item => {
            const name = item.name.toLowerCase();
            if (!patterns[name]) {
                patterns[name] = {
                    totalPurchases: 0,
                    averageQuantity: 0,
                    lastPurchase: null,
                    averagePrice: 0,
                    category: item.category
                };
            }
            patterns[name].totalPurchases++;
            patterns[name].averageQuantity = (patterns[name].averageQuantity + (item.quantity || 1)) / 2;
            patterns[name].lastPurchase = item.purchaseDate;
        });

        return patterns;
    } catch (error) {
        console.error('Error getting purchase history:', error);
        return {};
    }
}

async function optimizeShoppingList(params) {
    try {
        const {
            items,
            storePreference,
            budgetConstraints,
            householdSize,
            preferences,
            purchaseHistory,
            currentInventory
        } = params;

        // Prepare data for AI analysis
        const itemsText = items.map(item =>
            typeof item === 'string' ? item : `${item.name} ${item.quantity ? `(${item.quantity})` : ''}`
        ).join('\n');

        const inventoryText = currentInventory.map(inv =>
            `${inv.name} - have ${inv.quantity} ${inv.unit || 'units'}`
        ).join('\n');

        const historyText = Object.entries(purchaseHistory)
            .slice(0, 10) // Top 10 most frequent purchases
            .map(([item, data]) =>
                `${item}: bought ${data.totalPurchases} times, avg ${data.averageQuantity} units`
            ).join('\n');

        const prompt = `
        Optimize this shopping list for efficiency, cost, and waste reduction:

        SHOPPING LIST:
        ${itemsText}

        CURRENT INVENTORY (to avoid duplicates):
        ${inventoryText}

        PURCHASE HISTORY PATTERNS:
        ${historyText}

        PREFERENCES:
        - Store: ${storePreference || 'Any'}
        - Household size: ${householdSize}
        - Budget limit: ${budgetConstraints.maxTotal ? `$${budgetConstraints.maxTotal}` : 'No limit'}
        - Prioritize health: ${preferences.prioritizeHealth}
        - Minimize waste: ${preferences.minimizeWaste}
        - Bulk buying: ${preferences.bulkBuying}
        - Organic preference: ${preferences.organicPreference}

        Provide optimization in JSON format:
        {
            "items": [
                {
                    "name": "Bananas",
                    "category": "fresh_produce",
                    "recommended_quantity": "6 pieces",
                    "estimated_price": 2.50,
                    "store_section": "Produce",
                    "priority": "high",
                    "optimization_notes": {
                        "quantity_reasoning": "Optimal for household of 2, reduces waste",
                        "price_optimization": "Buy loose rather than bagged for better value",
                        "freshness_tips": "Choose slightly green for longer shelf life"
                    },
                    "alternatives": [
                        {"name": "Organic bananas", "price_difference": "+$0.50", "benefit": "Pesticide-free"}
                    ],
                    "bulk_option": {
                        "available": false,
                        "savings": 0
                    }
                }
            ],
            "store_layout": {
                "produce": ["Bananas", "Apples", "Lettuce"],
                "dairy": ["Milk", "Yogurt"],
                "meat": ["Chicken breast"],
                "pantry": ["Rice", "Pasta"],
                "frozen": ["Frozen vegetables"]
            },
            "optimization": {
                "total_cost": 45.67,
                "estimated_savings": 8.23,
                "waste_reduction": "15% less food waste expected",
                "health_score": 8.5,
                "convenience_score": 9.0
            },
            "shopping_route": [
                {"section": "Produce", "items": 5, "estimated_time": "10 minutes"},
                {"section": "Dairy", "items": 2, "estimated_time": "5 minutes"}
            ]
        }

        Guidelines:
        - Optimize quantities based on household size and usage patterns
        - Suggest store sections for efficient shopping route
        - Consider shelf life and waste reduction
        - Provide price estimates based on typical grocery costs
        - Include alternatives (generic vs brand, organic vs conventional)
        - Factor in bulk buying opportunities if preferred
        - Avoid items already in sufficient quantity in inventory

        Return ONLY valid JSON.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_tokens: 2500
        });

        let result = response.choices[0].message.content.trim();
        if (result.startsWith("```json")) {
            result = result.replace("```json", "").replace("```", "").trim();
        }

        const optimizedData = JSON.parse(result);

        // Add calculated fields
        return {
            items: optimizedData.items || [],
            storeLayout: optimizedData.store_layout || {},
            optimization: optimizedData.optimization || {},
            shoppingRoute: optimizedData.shopping_route || [],
            totalCost: optimizedData.optimization?.total_cost || 0,
            estimatedSavings: optimizedData.optimization?.estimated_savings || 0,
            estimatedShoppingTime: optimizedData.shopping_route?.reduce((total, section) =>
                total + parseInt(section.estimated_time || 0), 0) || 30,
            wasteReduction: optimizedData.optimization?.waste_reduction || "Unknown"
        };

    } catch (error) {
        console.error('Shopping list optimization error:', error);

        // Return fallback optimization
        return {
            items: items.map(item => ({
                name: typeof item === 'string' ? item : item.name,
                category: 'general',
                recommended_quantity: '1 unit',
                estimated_price: 3.00,
                priority: 'medium'
            })),
            storeLayout: { general: items.map(item => typeof item === 'string' ? item : item.name) },
            optimization: { total_cost: items.length * 3, estimated_savings: 0 },
            totalCost: items.length * 3,
            estimatedSavings: 0,
            estimatedShoppingTime: 30,
            wasteReduction: "Optimization unavailable"
        };
    }
}

async function generateSmartSuggestions(params) {
    try {
        const { optimizedItems, purchaseHistory, preferences, householdSize } = params;

        const itemCategories = [...new Set(optimizedItems.map(item => item.category))];
        const totalCost = optimizedItems.reduce((sum, item) => sum + (item.estimated_price || 0), 0);

        const prompt = `
        Generate smart shopping suggestions based on this optimized shopping list:

        SHOPPING ITEMS: ${optimizedItems.length} items
        CATEGORIES: ${itemCategories.join(', ')}
        TOTAL COST: $${totalCost.toFixed(2)}
        HOUSEHOLD SIZE: ${householdSize}

        Generate helpful suggestions in JSON format:
        {
            "meal_prep_suggestions": [
                {
                    "suggestion": "Buy pre-cut vegetables to save prep time",
                    "items_affected": ["carrots", "celery"],
                    "time_savings": "15 minutes",
                    "cost_impact": "+$2.00"
                }
            ],
            "seasonal_alternatives": [
                {
                    "original_item": "strawberries",
                    "seasonal_alternative": "apples",
                    "reasoning": "Apples are in season and cost 40% less",
                    "savings": "$3.50"
                }
            ],
            "bulk_opportunities": [
                {
                    "item": "rice",
                    "bulk_size": "10 lb bag",
                    "unit_savings": "30% cost reduction",
                    "storage_consideration": "Requires airtight container"
                }
            ],
            "health_upgrades": [
                {
                    "item": "white bread",
                    "upgrade": "whole grain bread",
                    "health_benefit": "More fiber and nutrients",
                    "cost_difference": "+$1.00"
                }
            ],
            "waste_prevention": [
                {
                    "tip": "Buy smaller quantities of fresh herbs",
                    "reasoning": "Herbs spoil quickly in typical household",
                    "items": ["basil", "cilantro"]
                }
            ],
            "convenience_options": [
                {
                    "option": "Pre-marinated meats",
                    "benefit": "Save 30 minutes prep time",
                    "cost_premium": "$2-3 per pound"
                }
            ],
            "budget_optimizations": [
                {
                    "strategy": "Use store brand for basic items",
                    "potential_savings": "$8-12 per trip",
                    "recommended_items": ["pasta", "canned goods", "cleaning supplies"]
                }
            ]
        }

        Focus on practical, actionable suggestions that align with the user's preferences and household needs.
        Return ONLY valid JSON.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 1500
        });

        let result = response.choices[0].message.content.trim();
        if (result.startsWith("```json")) {
            result = result.replace("```json", "").replace("```", "").trim();
        }

        return JSON.parse(result);

    } catch (error) {
        console.error('Smart suggestions generation error:', error);
        return {
            meal_prep_suggestions: [],
            seasonal_alternatives: [],
            bulk_opportunities: [],
            health_upgrades: [],
            waste_prevention: [],
            convenience_options: [],
            budget_optimizations: []
        };
    }
}

// Get optimized shopping lists
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10');
        const status = searchParams.get('status') || 'active';

        const { db } = await connectDB();
        const userId = session.user.id;

        const shoppingLists = await db.collection('shopping_lists')
            .find({
                userId: userId,
                ...(status !== 'all' && { status: status })
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();

        return NextResponse.json({
            success: true,
            data: {
                shoppingLists: shoppingLists.map(list => ({
                    id: list._id,
                    itemCount: list.optimizedItems?.length || 0,
                    estimatedCost: list.totalEstimatedCost || 0,
                    storePreference: list.storePreference,
                    createdAt: list.createdAt,
                    status: list.status,
                    optimization: list.optimization
                })),
                total: shoppingLists.length
            }
        });

    } catch (error) {
        console.error('Error fetching shopping lists:', error);
        return NextResponse.json(
            { error: 'Failed to fetch shopping lists' },
            { status: 500 }
        );
    }
}

// Mark shopping list as completed
export async function PATCH(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { shoppingListId, status, purchasedItems } = await request.json();

        const { db } = await connectDB();
        const userId = session.user.id;

        const updateData = {
            status: status,
            completedAt: new Date(),
            ...(purchasedItems && { purchasedItems: purchasedItems })
        };

        const result = await db.collection('shopping_lists').updateOne(
            {
                _id: new ObjectId(shoppingListId),
                userId: userId
            },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: 'Shopping list not found' },
                { status: 404 }
            );
        }

        // If completed with purchased items, add them to inventory
        if (status === 'completed' && purchasedItems && purchasedItems.length > 0) {
            const inventoryItems = purchasedItems.map(item => ({
                userId: userId,
                name: item.name,
                category: item.category || 'general',
                quantity: item.quantity || 1,
                unit: item.unit || 'each',
                purchaseDate: new Date(),
                addedVia: 'shopping_list',
                estimatedPrice: item.price || 0,
                createdAt: new Date()
            }));

            await db.collection('food_inventory').insertMany(inventoryItems);
        }

        return NextResponse.json({
            success: true,
            message: `Shopping list marked as ${status}`,
            itemsAdded: purchasedItems?.length || 0
        });

    } catch (error) {
        console.error('Shopping list update error:', error);
        return NextResponse.json(
            { error: 'Failed to update shopping list' },
            { status: 500 }
        );
    }
}