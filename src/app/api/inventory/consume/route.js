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

// UPDATE the DELETE function in your consume route.js file:

// DELETE - Reverse/undo a consumption (un-consume)
export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const consumptionId = searchParams.get('consumptionId');

        console.log('DELETE request - consumptionId:', consumptionId);

        if (!consumptionId || consumptionId === 'undefined') {
            return NextResponse.json({
                error: 'Invalid consumption ID. This record may be from before the undo feature was implemented.'
            }, { status: 400 });
        }

        await connectDB();

        const inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
        }

        console.log('Total consumption history records:', inventory.consumptionHistory?.length || 0);

        // Find the consumption record - try multiple methods
        let consumptionIndex = -1;
        let consumptionRecord = null;

        // Method 1: Try direct string comparison
        consumptionIndex = inventory.consumptionHistory.findIndex(
            log => log._id && log._id.toString() === consumptionId
        );

        if (consumptionIndex === -1) {
            // Method 2: Try ObjectId comparison if the first method fails
            try {
                const { ObjectId } = require('mongodb');
                consumptionIndex = inventory.consumptionHistory.findIndex(
                    log => log._id && log._id.equals(new ObjectId(consumptionId))
                );
            } catch (objectIdError) {
                console.log('ObjectId comparison failed:', objectIdError.message);
            }
        }

        if (consumptionIndex === -1) {
            // Method 3: Search by other criteria as fallback
            console.log('Could not find record by ID, available record IDs:');
            inventory.consumptionHistory.forEach((log, index) => {
                console.log(`Record ${index}: ID = ${log._id}, itemName = ${log.itemName}, date = ${log.dateConsumed}`);
            });

            return NextResponse.json({
                error: 'Consumption record not found. It may have been from before the undo feature was implemented.'
            }, { status: 404 });
        }

        consumptionRecord = inventory.consumptionHistory[consumptionIndex];
        console.log('Found consumption record:', JSON.stringify(consumptionRecord, null, 2));

        // Check if it's too old to undo (optional - you can set a time limit)
        const consumptionDate = new Date(consumptionRecord.dateConsumed);
        const hoursSinceConsumption = (Date.now() - consumptionDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceConsumption > 24) { // 24 hour limit for undo
            return NextResponse.json({
                error: 'Cannot undo consumptions older than 24 hours'
            }, { status: 400 });
        }

        // Check if this consumption was already reversed
        if (consumptionRecord.isReversed) {
            return NextResponse.json({
                error: 'This consumption has already been reversed'
            }, { status: 400 });
        }

        // Rest of the function remains the same...
        // [Continue with the existing logic for restoring the item]

        // Find the item in inventory or create it if it was completely removed
        let itemIndex = inventory.items.findIndex(
            item => item._id.toString() === consumptionRecord.itemId.toString()
        );

        let item;
        let wasCompletelyRemoved = false;

        if (itemIndex === -1) {
            // Item was completely removed, need to recreate it
            wasCompletelyRemoved = true;
            const newItem = {
                name: consumptionRecord.itemName,
                quantity: 0,
                unit: consumptionRecord.unitConsumed,
                location: 'pantry', // Default location
                addedDate: new Date(),
                // Try to restore other properties if available
                secondaryQuantity: 0,
                secondaryUnit: consumptionRecord.originalSecondaryUnit || null
            };

            inventory.items.push(newItem);
            itemIndex = inventory.items.length - 1;
            item = inventory.items[itemIndex];
        } else {
            item = inventory.items[itemIndex];
        }

        // Restore the quantities
        if (consumptionRecord.isDualUnitConsumption) {
            // Handle dual unit restoration
            if (consumptionRecord.useSecondaryUnit) {
                item.secondaryQuantity = (item.secondaryQuantity || 0) + consumptionRecord.quantityConsumed;
                if (wasCompletelyRemoved && consumptionRecord.originalPrimaryQuantity) {
                    item.quantity = consumptionRecord.originalPrimaryQuantity;
                }
            } else {
                item.quantity = item.quantity + consumptionRecord.quantityConsumed;
                if (consumptionRecord.originalSecondaryQuantity && wasCompletelyRemoved) {
                    item.secondaryQuantity = consumptionRecord.originalSecondaryQuantity;
                }
            }
        } else {
            // Standard single unit restoration
            item.quantity = item.quantity + consumptionRecord.quantityConsumed;
        }

        // Mark the consumption as reversed instead of deleting it (for audit trail)
        inventory.consumptionHistory[consumptionIndex].isReversed = true;
        inventory.consumptionHistory[consumptionIndex].reversedDate = new Date();
        inventory.consumptionHistory[consumptionIndex].reversedBy = session.user.id;

        // Add a reversal record to the history
        const reversalRecord = {
            itemId: item._id,
            itemName: consumptionRecord.itemName,
            quantityConsumed: -consumptionRecord.quantityConsumed, // Negative to indicate restoration
            unitConsumed: consumptionRecord.unitConsumed,
            reason: 'undo',
            notes: `Reversed consumption: ${consumptionRecord.reason}`,
            dateConsumed: new Date(),
            isReversal: true,
            originalConsumptionId: consumptionRecord._id,
            remainingQuantity: item.quantity,
            remainingSecondaryQuantity: item.secondaryQuantity || null
        };

        inventory.consumptionHistory.push(reversalRecord);
        inventory.lastUpdated = new Date();
        inventory.markModified('consumptionHistory');

        await inventory.save();

        return NextResponse.json({
            success: true,
            message: `Successfully restored ${consumptionRecord.quantityConsumed} ${consumptionRecord.unitConsumed} of ${consumptionRecord.itemName}`,
            restoredItem: {
                name: item.name,
                newQuantity: item.quantity,
                newSecondaryQuantity: item.secondaryQuantity,
                wasRecreated: wasCompletelyRemoved
            }
        });

    } catch (error) {
        console.error('Un-consume inventory error:', error);
        return NextResponse.json(
            { error: 'Failed to reverse consumption: ' + error.message },
            { status: 500 }
        );
    }
}