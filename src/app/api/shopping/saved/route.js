// file: /src/app/api/shopping/saved/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { SavedShoppingList, Recipe, MealPlan } from '@/lib/models';

// GET - Fetch user's saved shopping lists
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const includeArchived = searchParams.get('includeArchived') === 'true';
        const listType = searchParams.get('type'); // 'recipe', 'recipes', 'meal-plan', 'custom'
        const tags = searchParams.get('tags')?.split(',').filter(Boolean);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        await connectDB();

        // Build query
        const query = {
            userId: session.user.id
        };

        if (!includeArchived) {
            query.isArchived = { $ne: true };
        }

        if (listType) {
            query.listType = listType;
        }

        if (tags && tags.length > 0) {
            query.tags = { $in: tags };
        }

        // Get lists with pagination
        const lists = await SavedShoppingList.find(query)
            .sort({ 'usage.lastLoaded': -1, updatedAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('sourceRecipeIds', 'title')
            .populate('sourceMealPlanId', 'name');

        const total = await SavedShoppingList.countDocuments(query);

        // Get summary statistics
        const stats = await SavedShoppingList.aggregate([
            { $match: { userId: session.user.id, isArchived: { $ne: true } } },
            {
                $group: {
                    _id: '$listType',
                    count: { $sum: 1 },
                    totalItems: { $sum: '$stats.totalItems' },
                    avgCompletionRate: { $avg: '$usage.completionRate' }
                }
            }
        ]);

        return NextResponse.json({
            success: true,
            lists: lists.map(list => ({
                id: list._id,
                name: list.name,
                description: list.description,
                listType: list.listType,
                contextName: list.contextName,
                stats: list.stats,
                tags: list.tags,
                color: list.color,
                isTemplate: list.isTemplate,
                isArchived: list.isArchived,
                usage: list.usage,
                sourceRecipes: list.sourceRecipeIds,
                sourceMealPlan: list.sourceMealPlanId,
                createdAt: list.createdAt,
                updatedAt: list.updatedAt
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            stats: stats.reduce((acc, stat) => {
                acc[stat._id] = {
                    count: stat.count,
                    totalItems: stat.totalItems,
                    avgCompletionRate: stat.avgCompletionRate || 0
                };
                return acc;
            }, {})
        });

    } catch (error) {
        console.error('Error fetching saved shopping lists:', error);
        return NextResponse.json({ error: 'Failed to fetch saved lists' }, { status: 500 });
    }
}

// POST - Save a new shopping list (ENHANCED WITH DEBUGGING)
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let requestData;
        try {
            requestData = await request.json();
        } catch (parseError) {
            console.error('❌ Failed to parse request JSON:', parseError);
            return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }

        console.log('📥 Received save request:', {
            name: requestData.name,
            listType: requestData.listType,
            itemsCount: requestData.items?.length,
            userId: session.user.id
        });

        const {
            name,
            description,
            listType,
            contextName,
            sourceRecipeIds,
            sourceMealPlanId,
            items,
            tags,
            color,
            isTemplate
        } = requestData;

        // Enhanced Validation
        if (!name || typeof name !== 'string') {
            console.error('❌ Invalid name:', name);
            return NextResponse.json({ error: 'Name is required and must be a string' }, { status: 400 });
        }

        if (!listType || typeof listType !== 'string') {
            console.error('❌ Invalid listType:', listType);
            return NextResponse.json({ error: 'ListType is required and must be a string' }, { status: 400 });
        }

        if (!items || !Array.isArray(items)) {
            console.error('❌ Invalid items:', { type: typeof items, isArray: Array.isArray(items) });
            return NextResponse.json({ error: 'Items must be an array' }, { status: 400 });
        }

        if (items.length === 0) {
            console.error('❌ Empty items array');
            return NextResponse.json({ error: 'Items array cannot be empty' }, { status: 400 });
        }

        if (name.length > 100) {
            return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
        }

        // Validate each item
        const invalidItems = [];
        items.forEach((item, index) => {
            if (!item || typeof item !== 'object') {
                invalidItems.push({ index, error: 'Item is not an object', item: typeof item });
            } else if (!item.ingredient || typeof item.ingredient !== 'string') {
                invalidItems.push({ index, error: 'Missing or invalid ingredient', item: item.ingredient });
            }
        });

        if (invalidItems.length > 0) {
            console.error('❌ Invalid items found:', invalidItems.slice(0, 5)); // Log first 5
            return NextResponse.json({
                error: `${invalidItems.length} invalid items found`,
                details: invalidItems.slice(0, 5)
            }, { status: 400 });
        }

        await connectDB();

        // Check for duplicate names (within user's lists)
        const existingList = await SavedShoppingList.findOne({
            userId: session.user.id,
            name: name.trim(),
            isArchived: { $ne: true }
        });

        if (existingList) {
            return NextResponse.json({
                error: 'A shopping list with this name already exists'
            }, { status: 400 });
        }

        // Process items with enhanced validation
        const processedItems = items.map((item, index) => {
            try {
                return {
                    ingredient: String(item.ingredient).trim(),
                    amount: item.amount ? String(item.amount).trim() : '',
                    category: item.category ? String(item.category).trim() : 'other',
                    inInventory: Boolean(item.inInventory),
                    purchased: Boolean(item.purchased),
                    recipes: Array.isArray(item.recipes) ? item.recipes : [],
                    originalName: item.originalName ? String(item.originalName).trim() : String(item.ingredient).trim(),
                    needAmount: item.needAmount ? String(item.needAmount).trim() : '',
                    haveAmount: item.haveAmount ? String(item.haveAmount).trim() : '',
                    itemKey: item.itemKey ? String(item.itemKey).trim() : `${item.ingredient}-${item.category || 'other'}`,
                    notes: item.notes ? String(item.notes).trim() : '',
                    price: (typeof item.price === 'number') ? item.price : undefined,
                    unitPrice: (typeof item.unitPrice === 'number') ? item.unitPrice : undefined,
                    estimatedPrice: (typeof item.estimatedPrice === 'number') ? item.estimatedPrice : undefined,
                    priceSource: item.priceSource || undefined,
                    priceUpdatedAt: item.priceUpdatedAt || undefined
                };
            } catch (itemError) {
                console.error(`❌ Error processing item ${index}:`, itemError, item);
                throw new Error(`Failed to process item ${index}: ${itemError.message}`);
            }
        });

        console.log('✅ Processed items successfully:', processedItems.length);

        // Create new saved shopping list
        const savedList = new SavedShoppingList({
            userId: session.user.id,
            name: name.trim(),
            description: description?.trim() || '',
            listType,
            contextName: contextName?.trim() || '',
            sourceRecipeIds: Array.isArray(sourceRecipeIds) ? sourceRecipeIds : [],
            sourceMealPlanId: sourceMealPlanId || null,
            items: processedItems,
            tags: Array.isArray(tags) ? tags : [],
            color: color || '#3b82f6',
            isTemplate: Boolean(isTemplate)
        });

        await savedList.save();
        console.log('✅ Shopping list saved to database:', savedList._id);

        // Populate references for response
        await savedList.populate('sourceRecipeIds', 'title');
        await savedList.populate('sourceMealPlanId', 'name');

        return NextResponse.json({
            success: true,
            message: 'Shopping list saved successfully',
            savedList: {
                id: savedList._id,
                name: savedList.name,
                description: savedList.description,
                listType: savedList.listType,
                contextName: savedList.contextName,
                stats: savedList.stats,
                tags: savedList.tags,
                color: savedList.color,
                isTemplate: savedList.isTemplate,
                sourceRecipes: savedList.sourceRecipeIds,
                sourceMealPlan: savedList.sourceMealPlanId,
                createdAt: savedList.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Error saving shopping list:', error);
        console.error('❌ Error stack:', error.stack);
        return NextResponse.json({
            error: 'Failed to save shopping list',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}

// DELETE - Delete multiple saved lists
export async function DELETE(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { listIds, archive = false } = await request.json();

        if (!listIds || !Array.isArray(listIds) || listIds.length === 0) {
            return NextResponse.json({
                error: 'List IDs are required'
            }, { status: 400 });
        }

        await connectDB();

        if (archive) {
            // Archive instead of delete
            const result = await SavedShoppingList.updateMany(
                {
                    _id: { $in: listIds },
                    userId: session.user.id
                },
                {
                    isArchived: true,
                    updatedAt: new Date()
                }
            );

            return NextResponse.json({
                success: true,
                message: `${result.modifiedCount} list(s) archived successfully`,
                archivedCount: result.modifiedCount
            });
        } else {
            // Permanent delete
            const result = await SavedShoppingList.deleteMany({
                _id: { $in: listIds },
                userId: session.user.id
            });

            return NextResponse.json({
                success: true,
                message: `${result.deletedCount} list(s) deleted successfully`,
                deletedCount: result.deletedCount
            });
        }

    } catch (error) {
        console.error('Error deleting shopping lists:', error);
        return NextResponse.json({ error: 'Failed to delete shopping lists' }, { status: 500 });
    }
}