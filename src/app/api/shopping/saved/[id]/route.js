// file: /src/app/api/shopping/saved/[id]/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { SavedShoppingList } from '@/lib/models';

// GET - Fetch a specific saved shopping list
export async function GET(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        await connectDB();

        const savedList = await SavedShoppingList.findOne({
            _id: id,
            userId: session.user.id
        })
            .populate('sourceRecipeIds', 'title')
            .populate('sourceMealPlanId', 'name');

        if (!savedList) {
            return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
        }

        // Mark as loaded
        await savedList.markAsLoaded();

        return NextResponse.json({
            success: true,
            savedList: {
                id: savedList._id,
                name: savedList.name,
                description: savedList.description,
                listType: savedList.listType,
                contextName: savedList.contextName,
                items: savedList.items,
                stats: savedList.stats,
                tags: savedList.tags,
                color: savedList.color,
                isTemplate: savedList.isTemplate,
                isArchived: savedList.isArchived,
                usage: savedList.usage,
                shoppingSessions: savedList.shoppingSessions,
                sourceRecipes: savedList.sourceRecipeIds,
                sourceMealPlan: savedList.sourceMealPlanId,
                createdAt: savedList.createdAt,
                updatedAt: savedList.updatedAt
            }
        });

    } catch (error) {
        console.error('Error fetching saved shopping list:', error);
        return NextResponse.json({ error: 'Failed to fetch shopping list' }, { status: 500 });
    }
}

// PUT - Update a saved shopping list
export async function PUT(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const updates = await request.json();

        await connectDB();

        const savedList = await SavedShoppingList.findOne({
            _id: id,
            userId: session.user.id
        });

        if (!savedList) {
            return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
        }

        // Update allowed fields
        const allowedUpdates = [
            'name', 'description', 'items', 'tags', 'color',
            'isTemplate', 'isArchived'
        ];

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                if (field === 'name' && updates[field].length > 100) {
                    throw new Error('Name must be 100 characters or less');
                }
                savedList[field] = updates[field];
            }
        });

        // Handle special updates
        if (updates.markPurchased) {
            // Mark specific items as purchased
            const { itemKeys } = updates.markPurchased;
            savedList.items.forEach(item => {
                if (itemKeys.includes(item.itemKey)) {
                    item.purchased = true;
                }
            });
        }

        if (updates.completeShoppingSession) {
            // Complete shopping session
            const { itemsPurchased, notes } = updates.completeShoppingSession;
            await savedList.completeShoppingSession(itemsPurchased, notes);
        }

        await savedList.save();

        return NextResponse.json({
            success: true,
            message: 'Shopping list updated successfully',
            savedList: {
                id: savedList._id,
                name: savedList.name,
                description: savedList.description,
                stats: savedList.stats,
                usage: savedList.usage,
                updatedAt: savedList.updatedAt
            }
        });

    } catch (error) {
        console.error('Error updating saved shopping list:', error);
        return NextResponse.json({
            error: error.message || 'Failed to update shopping list'
        }, { status: 500 });
    }
}

// DELETE - Delete a specific saved shopping list
export async function DELETE(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const { searchParams } = new URL(request.url);
        const archive = searchParams.get('archive') === 'true';

        await connectDB();

        if (archive) {
            // Archive the list
            const savedList = await SavedShoppingList.findOneAndUpdate(
                { _id: id, userId: session.user.id },
                { isArchived: true, updatedAt: new Date() },
                { new: true }
            );

            if (!savedList) {
                return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                message: 'Shopping list archived successfully'
            });
        } else {
            // Permanent delete
            const result = await SavedShoppingList.deleteOne({
                _id: id,
                userId: session.user.id
            });

            if (result.deletedCount === 0) {
                return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                message: 'Shopping list deleted successfully'
            });
        }

    } catch (error) {
        console.error('Error deleting saved shopping list:', error);
        return NextResponse.json({ error: 'Failed to delete shopping list' }, { status: 500 });
    }
}