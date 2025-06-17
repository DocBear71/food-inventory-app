// file: /src/app/api/inventory/consume/route.js - v5 Diagnostic version to identify MongoDB issue

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory } from '@/lib/models';

// POST - Consume inventory items with enhanced dual unit support
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

        // First, let's check the current inventory state
        const beforeInventory = await UserInventory.findOne({ userId: session.user.id });
        console.log('BEFORE - Inventory exists:', !!beforeInventory);
        console.log('BEFORE - ConsumptionHistory length:', beforeInventory?.consumptionHistory?.length || 0);
        console.log('BEFORE - Items count:', beforeInventory?.items?.length || 0);

        if (!beforeInventory) {
            return NextResponse.json(
                { error: 'Inventory not found' },
                { status: 404 }
            );
        }

        const consumptionLogs = [];
        const updatedItems = [];
        const removedItems = [];

        // Handle single item consumption (simplified for debugging)
        const {
            itemId,
            reason,
            quantity,
            unit,
            notes,
            removeCompletely,
            isDualUnitConsumption,
            useSecondaryUnit,
            dualUnitUpdate
        } = consumptions;

        const itemIndex = beforeInventory.items.findIndex(
            item => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
            return NextResponse.json(
                { error: 'Item not found' },
                { status: 404 }
            );
        }

        const item = beforeInventory.items[itemIndex];
        const consumeQuantity = removeCompletely ? quantity : Math.min(quantity, item.quantity);

        // Create the consumption log
        const consumptionLog = {
            itemId: item._id,
            itemName: item.name,
            quantityConsumed: consumeQuantity,
            unitConsumed: unit,
            reason: reason,
            notes: notes || '',
            dateConsumed: new Date(),
            isDualUnitConsumption: isDualUnitConsumption || false,
            useSecondaryUnit: useSecondaryUnit || false,
            originalPrimaryQuantity: item.quantity,
            originalSecondaryQuantity: item.secondaryQuantity || null,
            originalSecondaryUnit: item.secondaryUnit || null
        };

        // Update item quantity
        const newPrimaryQty = Math.max(0, item.quantity - consumeQuantity);
        consumptionLog.remainingQuantity = newPrimaryQty;
        consumptionLog.primaryQuantityChange = item.quantity - newPrimaryQty;
        consumptionLog.remainingSecondaryQuantity = item.secondaryQuantity;

        // Update the item in the array
        beforeInventory.items[itemIndex].quantity = newPrimaryQty;

        if (newPrimaryQty <= 0) {
            removedItems.push(item.name);
            beforeInventory.items.splice(itemIndex, 1);
            consumptionLog.remainingQuantity = 0;
        } else {
            updatedItems.push({
                name: item.name,
                newQuantity: newPrimaryQty,
                unit: item.unit
            });
        }

        consumptionLogs.push(consumptionLog);

        console.log('Consumption log to add:', JSON.stringify(consumptionLog, null, 2));

        // METHOD 1: Try direct initialization if consumptionHistory doesn't exist
        if (!beforeInventory.consumptionHistory) {
            console.log('Initializing consumptionHistory array');
            beforeInventory.consumptionHistory = [];
        }

        console.log('Current history length before adding:', beforeInventory.consumptionHistory.length);

        // METHOD 2: Try direct array push first
        console.log('METHOD 2: Trying direct array push...');
        beforeInventory.consumptionHistory.push(consumptionLog);
        beforeInventory.markModified('consumptionHistory');
        beforeInventory.lastUpdated = new Date();

        try {
            const saveResult = await beforeInventory.save();
            console.log('Direct save result:', !!saveResult);

            // Check immediately after save
            const afterSave = await UserInventory.findOne({ userId: session.user.id });
            console.log('AFTER DIRECT SAVE - History length:', afterSave?.consumptionHistory?.length || 0);

            if (afterSave?.consumptionHistory?.length > 0) {
                console.log('SUCCESS: Direct array push worked!');
                return NextResponse.json({
                    success: true,
                    message: `Successfully updated inventory`,
                    summary: {
                        itemsConsumed: consumptionLogs.length,
                        itemsUpdated: updatedItems.map(item => item.name),
                        itemsRemoved: removedItems,
                        consumptionLogs: consumptionLogs,
                        totalHistoryRecords: afterSave.consumptionHistory.length
                    }
                });
            }
        } catch (saveError) {
            console.error('Direct save failed:', saveError);
        }

        // METHOD 3: If direct save failed, try $push operation
        console.log('METHOD 3: Trying $push operation...');

        // First, reload the inventory to get clean state
        const freshInventory = await UserInventory.findOne({ userId: session.user.id });

        const pushResult = await UserInventory.updateOne(
            { userId: session.user.id },
            {
                $push: {
                    consumptionHistory: consumptionLog
                },
                $set: {
                    lastUpdated: new Date(),
                    items: freshInventory.items
                }
            }
        );

        console.log('$push operation result:', JSON.stringify(pushResult, null, 2));

        // Check after $push
        const afterPush = await UserInventory.findOne({ userId: session.user.id });
        console.log('AFTER PUSH - History length:', afterPush?.consumptionHistory?.length || 0);

        if (afterPush?.consumptionHistory?.length > 0) {
            console.log('SUCCESS: $push operation worked!');
            return NextResponse.json({
                success: true,
                message: `Successfully updated inventory`,
                summary: {
                    itemsConsumed: consumptionLogs.length,
                    itemsUpdated: updatedItems.map(item => item.name),
                    itemsRemoved: removedItems,
                    consumptionLogs: consumptionLogs,
                    totalHistoryRecords: afterPush.consumptionHistory.length
                }
            });
        }

        // METHOD 4: Try raw MongoDB operation
        console.log('METHOD 4: Trying raw MongoDB operation...');

        const collection = beforeInventory.constructor.collection;
        const rawResult = await collection.updateOne(
            { userId: session.user.id },
            {
                $push: {
                    consumptionHistory: consumptionLog
                }
            }
        );

        console.log('Raw MongoDB result:', JSON.stringify(rawResult, null, 2));

        // Final check
        const finalCheck = await UserInventory.findOne({ userId: session.user.id });
        console.log('FINAL CHECK - History length:', finalCheck?.consumptionHistory?.length || 0);

        if (finalCheck?.consumptionHistory?.length > 0) {
            console.log('SUCCESS: Raw MongoDB operation worked!');
        } else {
            console.log('FAILURE: All methods failed to save consumption history');

            // Let's inspect the schema
            console.log('Schema inspection:');
            console.log('consumptionHistory field type:', typeof finalCheck?.consumptionHistory);
            console.log('Is array:', Array.isArray(finalCheck?.consumptionHistory));
            console.log('Schema paths:', Object.keys(beforeInventory.schema.paths));
            console.log('consumptionHistory path exists:', !!beforeInventory.schema.paths.consumptionHistory);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully updated inventory`,
            summary: {
                itemsConsumed: consumptionLogs.length,
                itemsUpdated: updatedItems.map(item => item.name),
                itemsRemoved: removedItems,
                consumptionLogs: consumptionLogs,
                totalHistoryRecords: finalCheck?.consumptionHistory?.length || 0
            }
        });

    } catch (error) {
        console.error('Consume inventory error:', error);
        return NextResponse.json(
            { error: 'Failed to update inventory: ' + error.message },
            { status: 500 }
        );
    }
}

// GET - Get consumption history with enhanced dual unit support
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 50;
        const reason = searchParams.get('reason');

        await connectDB();

        const inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            console.log('No inventory found for user:', session.user.id);
            return NextResponse.json({
                success: true,
                history: [],
                total: 0
            });
        }

        console.log('GET HISTORY - Inventory found. Consumption history length:', inventory.consumptionHistory?.length || 0);
        console.log('GET HISTORY - consumptionHistory type:', typeof inventory.consumptionHistory);
        console.log('GET HISTORY - Is array:', Array.isArray(inventory.consumptionHistory));

        if (inventory.consumptionHistory && inventory.consumptionHistory.length > 0) {
            console.log('GET HISTORY - Sample record:', JSON.stringify(inventory.consumptionHistory[0], null, 2));
        }

        let history = inventory.consumptionHistory || [];

        // Filter by reason if specified
        if (reason && reason !== 'all') {
            history = history.filter(log => log.reason === reason);
            console.log(`Filtered by reason '${reason}', remaining records:`, history.length);
        }

        // Sort by date (most recent first) and limit
        history = history
            .sort((a, b) => new Date(b.dateConsumed) - new Date(a.dateConsumed))
            .slice(0, limit);

        console.log('Final history to return:', history.length, 'records');

        return NextResponse.json({
            success: true,
            history: history,
            total: history.length
        });

    } catch (error) {
        console.error('Get consumption history error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch consumption history: ' + error.message },
            { status: 500 }
        );
    }
}