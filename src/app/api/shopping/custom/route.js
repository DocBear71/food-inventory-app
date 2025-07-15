// file: /src/app/api/shopping/custom/route.js v2 - Fixed UUID import

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { User, SavedShoppingList } from '@/lib/models';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST - Create a new custom shopping list
export async function POST(request) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            name,
            items = [],
            listType = 'custom',
            description = '',
            tags = [],
            color = '#3B82F6'
        } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({
                error: 'List name is required'
            }, { status: 400 });
        }

        if (!Array.isArray(items)) {
            return NextResponse.json({
                error: 'Items must be an array'
            }, { status: 400 });
        }

        await connectDB();

        // Get user for subscription checking if needed
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Process items into shopping list format
        const processedItems = {};
        const stats = {
            totalItems: 0,
            needToBuy: 0,
            inInventory: 0,
            purchased: 0
        };

        items.forEach(item => {
            const category = item.category || 'Other';

            if (!processedItems[category]) {
                processedItems[category] = [];
            }

            const shoppingItem = {
                name: item.name,
                ingredient: item.name,
                amount: item.amount || '1',
                unit: item.unit || 'item',
                category: category,
                recipes: [],
                inInventory: false,
                inventoryItem: null,
                purchased: false,
                itemKey: `${item.name}-${category}`,
                haveAmount: '',
                needAmount: item.amount || '1',
                notes: item.notes || '',
                source: item.source || 'manual',
                addedAt: new Date()
            };

            processedItems[category].push(shoppingItem);
            stats.totalItems++;
            stats.needToBuy++;
        });

        // Create the shopping list document
        const shoppingListData = {
            items: processedItems,
            summary: stats,
            generatedAt: new Date(),
            metadata: {
                source: 'custom',
                itemSources: items.map(item => item.source || 'manual')
            }
        };

        // Create saved shopping list record - FIXED: Using randomUUID() from crypto
        const savedList = new SavedShoppingList({
            userId: session.user.id,
            id: randomUUID(),
            name: name.trim(),
            description: description.trim(),
            listType: listType,
            contextName: name.trim(),
            sourceRecipeIds: [],
            sourceMealPlanId: null,
            shoppingListData: shoppingListData,
            color: color,
            tags: Array.isArray(tags) ? tags : [],
            isTemplate: false,
            isArchived: false,
            stats: {
                totalItems: stats.totalItems,
                totalCategories: Object.keys(processedItems).length
            },
            usage: {
                timesLoaded: 0,
                lastLoaded: null,
                createdFromSource: 'custom'
            },
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await savedList.save();

        console.log(`✅ Created custom shopping list: ${name} with ${stats.totalItems} items`);

        return NextResponse.json({
            success: true,
            savedList: {
                id: savedList.id,
                name: savedList.name,
                listType: savedList.listType,
                stats: savedList.stats,
                createdAt: savedList.createdAt
            },
            shoppingList: shoppingListData
        });

    } catch (error) {
        console.error('Create custom shopping list error:', error);
        return NextResponse.json(
            { error: 'Failed to create shopping list: ' + error.message },
            { status: 500 }
        );
    }
}

// PUT - Add items to an existing custom shopping list
export async function PUT(request) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            listId,
            items = [],
            mode = 'add' // 'add' or 'replace'
        } = body;

        if (!listId) {
            return NextResponse.json({
                error: 'List ID is required'
            }, { status: 400 });
        }

        if (!Array.isArray(items)) {
            return NextResponse.json({
                error: 'Items must be an array'
            }, { status: 400 });
        }

        await connectDB();

        // Find the saved shopping list
        const savedList = await SavedShoppingList.findOne({
            userId: session.user.id,
            id: listId
        });

        if (!savedList) {
            return NextResponse.json({
                error: 'Shopping list not found'
            }, { status: 404 });
        }

        // Check if list type allows adding items
        if (!['custom', 'recipes', 'recipe'].includes(savedList.listType)) {
            return NextResponse.json({
                error: 'Cannot add items to this type of shopping list'
            }, { status: 400 });
        }

        const currentItems = savedList.shoppingListData.items || {};
        let updatedItems;

        if (mode === 'replace') {
            // Replace all items
            updatedItems = {};
        } else {
            // Add to existing items
            updatedItems = { ...currentItems };
        }

        // Process new items
        items.forEach(item => {
            const category = item.category || 'Other';

            if (!updatedItems[category]) {
                updatedItems[category] = [];
            }

            // Check for duplicates by name
            const existingItem = updatedItems[category].find(
                existing => existing.name.toLowerCase() === item.name.toLowerCase()
            );

            if (existingItem) {
                // Update existing item
                existingItem.amount = item.amount || existingItem.amount;
                existingItem.notes = item.notes || existingItem.notes;
                existingItem.updatedAt = new Date();
            } else {
                // Add new item
                const shoppingItem = {
                    name: item.name,
                    ingredient: item.name,
                    amount: item.amount || '1',
                    unit: item.unit || 'item',
                    category: category,
                    recipes: [],
                    inInventory: false,
                    inventoryItem: null,
                    purchased: false,
                    itemKey: `${item.name}-${category}`,
                    haveAmount: '',
                    needAmount: item.amount || '1',
                    notes: item.notes || '',
                    source: item.source || 'manual',
                    addedAt: new Date()
                };

                updatedItems[category].push(shoppingItem);
            }
        });

        // Recalculate stats
        const totalItems = Object.values(updatedItems).reduce(
            (sum, categoryItems) => sum + categoryItems.length,
            0
        );

        const stats = {
            totalItems: totalItems,
            needToBuy: totalItems, // Assume all need to be bought for custom lists
            inInventory: 0,
            purchased: 0
        };

        // Update the saved list
        savedList.shoppingListData.items = updatedItems;
        savedList.shoppingListData.summary = stats;
        savedList.shoppingListData.metadata.lastModified = new Date();
        savedList.stats.totalItems = totalItems;
        savedList.stats.totalCategories = Object.keys(updatedItems).length;
        savedList.updatedAt = new Date();

        await savedList.save();

        console.log(`✅ Updated shopping list: ${savedList.name} - added ${items.length} items`);

        return NextResponse.json({
            success: true,
            message: `Added ${items.length} items to ${savedList.name}`,
            savedList: {
                id: savedList.id,
                name: savedList.name,
                stats: savedList.stats,
                updatedAt: savedList.updatedAt
            },
            itemsAdded: items.length
        });

    } catch (error) {
        console.error('Update custom shopping list error:', error);
        return NextResponse.json(
            { error: 'Failed to update shopping list: ' + error.message },
            { status: 500 }
        );
    }
}