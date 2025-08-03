// file: /src/app/api/shopping/saved/route.js v2 - Fixed DELETE endpoint with enhanced error handling

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { SavedShoppingList, Recipe, MealPlan } from '@/lib/models';
import { ObjectId } from 'mongodb';

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
                id: list._id.toString(), // Ensure ID is always a string
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

// POST - Save a new shopping list (ENHANCED ERROR HANDLING)
export async function POST(request) {
    try {
        console.log('📥 SAVE API - Starting save request processing...');

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('✅ SAVE API - User authenticated:', session.user.id);

        let requestData;
        try {
            requestData = await request.json();
            console.log('📊 SAVE API - Request data received:', {
                hasName: !!requestData.name,
                hasItems: !!requestData.items,
                itemsType: typeof requestData.items,
                isItemsArray: Array.isArray(requestData.items),
                itemsCount: requestData.items?.length || 0,
                listType: requestData.listType
            });
        } catch (parseError) {
            console.error('❌ SAVE API - Failed to parse request JSON:', parseError);
            return NextResponse.json({
                error: 'Invalid JSON in request body',
                details: parseError.message
            }, { status: 400 });
        }

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

        // ENHANCED VALIDATION with detailed error messages
        console.log('🔍 SAVE API - Starting validation...');

        if (!name || typeof name !== 'string' || !name.trim()) {
            console.error('❌ SAVE API - Invalid name:', { name, type: typeof name });
            return NextResponse.json({
                error: 'Shopping list name is required and must be a non-empty string',
                field: 'name',
                received: { value: name, type: typeof name }
            }, { status: 400 });
        }

        if (!listType || typeof listType !== 'string') {
            console.error('❌ SAVE API - Invalid listType:', { listType, type: typeof listType });
            return NextResponse.json({
                error: 'ListType is required and must be a string',
                field: 'listType',
                received: { value: listType, type: typeof listType }
            }, { status: 400 });
        }

        if (!items || !Array.isArray(items)) {
            console.error('❌ SAVE API - Invalid items:', {
                hasItems: !!items,
                type: typeof items,
                isArray: Array.isArray(items)
            });
            return NextResponse.json({
                error: 'Items must be provided as an array',
                field: 'items',
                received: {
                    hasItems: !!items,
                    type: typeof items,
                    isArray: Array.isArray(items),
                    length: items?.length
                }
            }, { status: 400 });
        }

        if (items.length === 0) {
            console.error('❌ SAVE API - Empty items array');
            return NextResponse.json({
                error: 'Shopping list must contain at least one item',
                field: 'items',
                received: { length: 0 }
            }, { status: 400 });
        }

        if (name.length > 100) {
            return NextResponse.json({
                error: 'Shopping list name must be 100 characters or less',
                field: 'name',
                received: { length: name.length, maxLength: 100 }
            }, { status: 400 });
        }

        // DETAILED ITEM VALIDATION
        console.log(`🔍 SAVE API - Validating ${items.length} items...`);
        const invalidItems = [];
        const validItems = [];

        items.forEach((item, index) => {
            try {
                if (!item || typeof item !== 'object') {
                    invalidItems.push({
                        index,
                        error: 'Item must be an object',
                        received: { type: typeof item, value: item }
                    });
                    return;
                }

                if (!item.ingredient || typeof item.ingredient !== 'string' || !item.ingredient.trim()) {
                    invalidItems.push({
                        index,
                        error: 'Item must have a valid ingredient name',
                        received: {
                            ingredient: item.ingredient,
                            type: typeof item.ingredient
                        }
                    });
                    return;
                }

                // Create a clean, validated item
                const cleanItem = {
                    ingredient: String(item.ingredient).trim(),
                    amount: item.amount ? String(item.amount).trim() : '',
                    category: item.category ? String(item.category).trim() : 'other',
                    inInventory: Boolean(item.inInventory),
                    purchased: Boolean(item.purchased),
                    recipes: Array.isArray(item.recipes) ? item.recipes.filter(r => r && typeof r === 'string') : [],
                    originalName: item.originalName ? String(item.originalName).trim() : String(item.ingredient).trim(),
                    needAmount: item.needAmount ? String(item.needAmount).trim() : '',
                    haveAmount: item.haveAmount ? String(item.haveAmount).trim() : '',
                    itemKey: item.itemKey ? String(item.itemKey).trim() : `${item.ingredient}-${item.category || 'other'}`,
                    notes: item.notes ? String(item.notes).trim() : ''
                };

                // Add price information if provided and valid
                if (typeof item.price === 'number' && !isNaN(item.price) && item.price >= 0) {
                    cleanItem.price = item.price;
                }
                if (typeof item.unitPrice === 'number' && !isNaN(item.unitPrice) && item.unitPrice >= 0) {
                    cleanItem.unitPrice = item.unitPrice;
                }
                if (typeof item.estimatedPrice === 'number' && !isNaN(item.estimatedPrice) && item.estimatedPrice >= 0) {
                    cleanItem.estimatedPrice = item.estimatedPrice;
                }
                if (item.priceSource && typeof item.priceSource === 'string') {
                    cleanItem.priceSource = item.priceSource;
                }

                validItems.push(cleanItem);
                console.log(`✅ SAVE API - Item ${index + 1} validated: ${cleanItem.ingredient}`);

            } catch (itemError) {
                console.error(`💥 SAVE API - Error validating item ${index}:`, itemError);
                invalidItems.push({
                    index,
                    error: `Validation failed: ${itemError.message}`,
                    item: item
                });
            }
        });

        if (invalidItems.length > 0) {
            console.error(`❌ SAVE API - ${invalidItems.length} invalid items found:`, invalidItems.slice(0, 5));
            return NextResponse.json({
                error: `${invalidItems.length} invalid items found`,
                field: 'items',
                invalidItems: invalidItems.slice(0, 10), // Limit to first 10 for response size
                validItemsCount: validItems.length
            }, { status: 400 });
        }

        console.log(`✅ SAVE API - All ${validItems.length} items validated successfully`);

        await connectDB();

        // Check for duplicate names (within user's lists)
        console.log('🔍 SAVE API - Checking for duplicate names...');
        const existingList = await SavedShoppingList.findOne({
            userId: session.user.id,
            name: name.trim(),
            isArchived: { $ne: true }
        });

        if (existingList) {
            console.log('❌ SAVE API - Duplicate name found:', name.trim());
            return NextResponse.json({
                error: 'A shopping list with this name already exists',
                field: 'name',
                existingListId: existingList._id
            }, { status: 400 });
        }

        // Create new saved shopping list
        console.log('💾 SAVE API - Creating new shopping list...');
        const savedList = new SavedShoppingList({
            userId: session.user.id,
            name: name.trim(),
            description: description?.trim() || '',
            listType,
            contextName: contextName?.trim() || '',
            sourceRecipeIds: Array.isArray(sourceRecipeIds) ? sourceRecipeIds : [],
            sourceMealPlanId: sourceMealPlanId || null,
            items: validItems,
            tags: Array.isArray(tags) ? tags : [],
            color: color || '#3b82f6',
            isTemplate: Boolean(isTemplate)
        });

        console.log('💾 SAVE API - Saving to database...');
        await savedList.save();
        console.log('✅ SAVE API - Shopping list saved to database:', savedList._id);

        // Populate references for response
        await savedList.populate('sourceRecipeIds', 'title');
        await savedList.populate('sourceMealPlanId', 'name');

        const response = {
            success: true,
            message: 'Shopping list saved successfully',
            savedList: {
                id: savedList._id.toString(), // Ensure ID is always a string
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
        };

        console.log('✅ SAVE API - Response prepared successfully');
        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 SAVE API - Unexpected error:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        // Check for specific MongoDB errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));

            return NextResponse.json({
                error: 'Data validation failed',
                type: 'ValidationError',
                validationErrors: validationErrors
            }, { status: 400 });
        }

        if (error.code === 11000) {
            return NextResponse.json({
                error: 'Duplicate key error - this shopping list name already exists',
                type: 'DuplicateKeyError',
                field: Object.keys(error.keyPattern)[0]
            }, { status: 409 });
        }

        return NextResponse.json({
            error: 'Internal server error occurred while saving shopping list',
            type: error.name || 'UnknownError',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Contact support if this persists'
        }, { status: 500 });
    }
}

// DELETE - Delete multiple saved lists (FIXED WITH ENHANCED ERROR HANDLING)
export async function DELETE(request) {
    console.log('🗑️ DELETE API - Starting delete request processing...');

    try {
        const session = await auth();
        if (!session?.user?.id) {
            console.log('❌ DELETE API - Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('✅ DELETE API - User authenticated:', session.user.id);

        let requestData;
        try {
            requestData = await request.json();
            console.log('📊 DELETE API - Request data received:', {
                hasListIds: !!requestData.listIds,
                listIdsType: typeof requestData.listIds,
                isListIdsArray: Array.isArray(requestData.listIds),
                listIdsCount: requestData.listIds?.length || 0,
                archive: requestData.archive
            });
        } catch (parseError) {
            console.error('❌ DELETE API - Failed to parse request JSON:', parseError);
            return NextResponse.json({
                error: 'Invalid JSON in request body',
                details: parseError.message
            }, { status: 400 });
        }

        const { listIds, archive = false } = requestData;

        // Enhanced validation
        if (!listIds || !Array.isArray(listIds) || listIds.length === 0) {
            console.error('❌ DELETE API - Invalid listIds:', {
                hasListIds: !!listIds,
                type: typeof listIds,
                isArray: Array.isArray(listIds),
                length: listIds?.length
            });
            return NextResponse.json({
                error: 'List IDs are required and must be a non-empty array',
                field: 'listIds',
                received: {
                    hasListIds: !!listIds,
                    type: typeof listIds,
                    isArray: Array.isArray(listIds),
                    length: listIds?.length
                }
            }, { status: 400 });
        }

        // Validate each listId format
        const invalidIds = [];
        const validIds = [];

        listIds.forEach((id, index) => {
            if (!id || typeof id !== 'string') {
                invalidIds.push({
                    index,
                    value: id,
                    error: 'ID must be a non-empty string'
                });
                return;
            }

            // Check if it's a valid ObjectId format
            try {
                new ObjectId(id);
                validIds.push(id);
            } catch (objectIdError) {
                invalidIds.push({
                    index,
                    value: id,
                    error: 'Invalid ObjectId format'
                });
            }
        });

        if (invalidIds.length > 0) {
            console.error(`❌ DELETE API - ${invalidIds.length} invalid IDs found:`, invalidIds);
            return NextResponse.json({
                error: `${invalidIds.length} invalid list IDs found`,
                field: 'listIds',
                invalidIds: invalidIds,
                validIdsCount: validIds.length
            }, { status: 400 });
        }

        console.log(`✅ DELETE API - All ${validIds.length} IDs validated successfully`);

        // Connect to database
        console.log('🔌 DELETE API - Connecting to database...');
        await connectDB();
        console.log('✅ DELETE API - Database connected successfully');

        // First, check if the lists exist and belong to the user
        console.log('🔍 DELETE API - Checking list ownership...');
        const existingLists = await SavedShoppingList.find({
            _id: { $in: validIds },
            userId: session.user.id
        }).select('_id name listType');

        console.log(`📊 DELETE API - Found ${existingLists.length} lists owned by user out of ${validIds.length} requested`);

        if (existingLists.length === 0) {
            console.log('❌ DELETE API - No lists found or user does not own any of the requested lists');
            return NextResponse.json({
                error: 'No lists found or you do not have permission to delete these lists',
                requestedCount: validIds.length,
                foundCount: 0
            }, { status: 404 });
        }

        const existingIds = existingLists.map(list => list._id.toString());

        if (archive) {
            console.log(`📦 DELETE API - Archiving ${existingIds.length} lists...`);

            // Archive instead of delete
            const result = await SavedShoppingList.updateMany(
                {
                    _id: { $in: existingIds },
                    userId: session.user.id
                },
                {
                    $set: {
                        isArchived: true,
                        updatedAt: new Date()
                    }
                }
            );

            console.log('✅ DELETE API - Archive operation completed:', {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                acknowledged: result.acknowledged
            });

            return NextResponse.json({
                success: true,
                message: `${result.modifiedCount} list(s) archived successfully`,
                operation: 'archive',
                requestedCount: validIds.length,
                foundCount: existingLists.length,
                modifiedCount: result.modifiedCount,
                archivedLists: existingLists.map(list => ({
                    id: list._id,
                    name: list.name,
                    listType: list.listType
                }))
            });
        } else {
            console.log(`🗑️ DELETE API - Permanently deleting ${existingIds.length} lists...`);

            // Permanent delete
            const result = await SavedShoppingList.deleteMany({
                _id: { $in: existingIds },
                userId: session.user.id
            });

            console.log('✅ DELETE API - Delete operation completed:', {
                deletedCount: result.deletedCount,
                acknowledged: result.acknowledged
            });

            return NextResponse.json({
                success: true,
                message: `${result.deletedCount} list(s) deleted successfully`,
                operation: 'delete',
                requestedCount: validIds.length,
                foundCount: existingLists.length,
                deletedCount: result.deletedCount,
                deletedLists: existingLists.map(list => ({
                    id: list._id,
                    name: list.name,
                    listType: list.listType
                }))
            });
        }

    } catch (error) {
        console.error('💥 DELETE API - Unexpected error:', {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5).join('\n') // Limit stack trace
        });

        // Check for specific MongoDB/Mongoose errors
        if (error.name === 'CastError') {
            return NextResponse.json({
                error: 'Invalid ID format provided',
                type: 'CastError',
                details: 'One or more list IDs have invalid format'
            }, { status: 400 });
        }

        if (error.name === 'MongoServerError' || error.name === 'MongoError') {
            return NextResponse.json({
                error: 'Database operation failed',
                type: error.name,
                details: process.env.NODE_ENV === 'development' ? error.message : 'Database error occurred'
            }, { status: 500 });
        }

        if (error.name === 'ValidationError') {
            return NextResponse.json({
                error: 'Data validation failed',
                type: 'ValidationError',
                details: process.env.NODE_ENV === 'development' ? error.message : 'Invalid data provided'
            }, { status: 400 });
        }

        // Generic error response
        return NextResponse.json({
            error: 'Internal server error occurred while deleting shopping lists',
            type: error.name || 'UnknownError',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Contact support if this persists'
        }, { status: 500 });
    }
}