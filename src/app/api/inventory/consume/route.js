// file: /src/app/api/inventory/consume/route.js - v1

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory } from '@/lib/models';

// POST - Consume inventory items
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { consumptions, mode = 'single' } = body;

        console.log('Consume inventory request:', { consumptions, mode, userId: session.user.id });

        await connectDB();

        const inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            return NextResponse.json(
                { error: 'Inventory not found' },
                { status: 404 }
            );
        }

        const consumptionLogs = [];
        const updatedItems = [];
        const removedItems = [];

        if (mode === 'recipe') {
            // Handle multiple ingredient consumption for recipes
            for (const consumption of consumptions) {
                const { ingredient, quantity, unit, reason, notes, recipeName } = consumption;

                // Find matching items by name (case-insensitive)
                const matchingItems = inventory.items.filter(item =>
                    item.name.toLowerCase().includes(ingredient.toLowerCase()) ||
                    ingredient.toLowerCase().includes(item.name.toLowerCase())
                );

                if (matchingItems.length === 0) {
                    console.log(`No matching inventory item found for ingredient: ${ingredient}`);
                    continue;
                }

                // Use the first matching item (could be enhanced to pick best match)
                const item = matchingItems[0];
                const consumeQuantity = Math.min(quantity, item.quantity);

                // Log consumption
                consumptionLogs.push({
                    itemId: item._id,
                    itemName: item.name,
                    ingredient: ingredient,
                    quantityConsumed: consumeQuantity,
                    unitConsumed: unit,
                    reason: reason,
                    notes: notes,
                    recipeName: recipeName,
                    dateConsumed: new Date(),
                    remainingQuantity: item.quantity - consumeQuantity
                });

                // Update item quantity
                item.quantity -= consumeQuantity;

                if (item.quantity <= 0) {
                    // Remove item completely
                    removedItems.push(item.name);
                    inventory.items = inventory.items.filter(i => i._id.toString() !== item._id.toString());
                } else {
                    updatedItems.push({
                        name: item.name,
                        newQuantity: item.quantity,
                        unit: item.unit
                    });
                }
            }
        } else {
            // Handle single item consumption
            const { itemId, reason, quantity, unit, notes, removeCompletely } = consumptions;

            const itemIndex = inventory.items.findIndex(
                item => item._id.toString() === itemId
            );

            if (itemIndex === -1) {
                return NextResponse.json(
                    { error: 'Item not found' },
                    { status: 404 }
                );
            }

            const item = inventory.items[itemIndex];
            const consumeQuantity = removeCompletely ? item.quantity : Math.min(quantity, item.quantity);

            // Log consumption
            consumptionLogs.push({
                itemId: item._id,
                itemName: item.name,
                quantityConsumed: consumeQuantity,
                unitConsumed: unit,
                reason: reason,
                notes: notes,
                dateConsumed: new Date(),
                remainingQuantity: item.quantity - consumeQuantity
            });

            if (removeCompletely || consumeQuantity >= item.quantity) {
                // Remove item completely
                removedItems.push(item.name);
                inventory.items.splice(itemIndex, 1);
            } else {
                // Update quantity
                item.quantity -= consumeQuantity;
                updatedItems.push({
                    name: item.name,
                    newQuantity: item.quantity,
                    unit: item.unit
                });
            }
        }

        // Update inventory timestamp
        inventory.lastUpdated = new Date();

        // Add consumption log to inventory document (optional - for tracking)
        if (!inventory.consumptionHistory) {
            inventory.consumptionHistory = [];
        }
        inventory.consumptionHistory.push(...consumptionLogs);

        // Keep only last 100 consumption records to prevent document from growing too large
        if (inventory.consumptionHistory.length > 100) {
            inventory.consumptionHistory = inventory.consumptionHistory.slice(-100);
        }

        await inventory.save();

        console.log('Inventory consumption completed:', {
            logsCreated: consumptionLogs.length,
            itemsUpdated: updatedItems.length,
            itemsRemoved: removedItems.length
        });

        return NextResponse.json({
            success: true,
            message: `Successfully updated inventory`,
            summary: {
                itemsConsumed: consumptionLogs.length,
                itemsUpdated: updatedItems,
                itemsRemoved: removedItems,
                consumptionLogs: consumptionLogs
            }
        });

    } catch (error) {
        console.error('Consume inventory error:', error);
        return NextResponse.json(
            { error: 'Failed to update inventory' },
            { status: 500 }
        );
    }
}

// GET - Get consumption history
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 50;
        const reason = searchParams.get('reason'); // Filter by reason

        await connectDB();

        const inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            return NextResponse.json({
                success: true,
                history: []
            });
        }

        let history = inventory.consumptionHistory || [];

        // Filter by reason if specified
        if (reason && reason !== 'all') {
            history = history.filter(log => log.reason === reason);
        }

        // Sort by date (most recent first) and limit
        history = history
            .sort((a, b) => new Date(b.dateConsumed) - new Date(a.dateConsumed))
            .slice(0, limit);

        return NextResponse.json({
            success: true,
            history: history,
            total: history.length
        });

    } catch (error) {
        console.error('Get consumption history error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch consumption history' },
            { status: 500 }
        );
    }
}