// file: /src/app/api/inventory/consume/route.js - v3 Debug version to fix consumption history

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
            // Handle single item consumption with enhanced dual unit support
            const {
                itemId,
                reason,
                quantity,
                unit,
                notes,
                removeCompletely,
                // NEW: Dual unit fields
                isDualUnitConsumption,
                useSecondaryUnit,
                dualUnitUpdate
            } = consumptions;

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
            const consumeQuantity = removeCompletely ? quantity : Math.min(quantity,
                useSecondaryUnit && item.secondaryQuantity ? item.secondaryQuantity : item.quantity);

            // Enhanced logging for dual unit items
            const consumptionLog = {
                itemId: item._id,
                itemName: item.name,
                quantityConsumed: consumeQuantity,
                unitConsumed: unit,
                reason: reason,
                notes: notes || '',
                dateConsumed: new Date(),
                // NEW: Enhanced logging for dual units
                isDualUnitConsumption: isDualUnitConsumption || false,
                useSecondaryUnit: useSecondaryUnit || false,
                originalPrimaryQuantity: item.quantity,
                originalSecondaryQuantity: item.secondaryQuantity || null,
                originalSecondaryUnit: item.secondaryUnit || null
            };

            if (removeCompletely) {
                // Remove item completely
                consumptionLog.remainingQuantity = 0;
                consumptionLog.remainingSecondaryQuantity = null;
                removedItems.push(item.name);
                inventory.items.splice(itemIndex, 1);
            } else if (isDualUnitConsumption && dualUnitUpdate) {
                // Handle dual unit consumption with calculated updates
                console.log('Processing dual unit consumption:', dualUnitUpdate);

                // Store original values for logging
                const originalPrimary = item.quantity;
                const originalSecondary = item.secondaryQuantity;

                // Update both quantities based on the calculation from the frontend
                item.quantity = Math.max(0, dualUnitUpdate.newPrimaryQty);
                item.secondaryQuantity = Math.max(0, dualUnitUpdate.newSecondaryQty);

                // Enhanced logging for dual unit consumption
                consumptionLog.remainingQuantity = item.quantity;
                consumptionLog.remainingSecondaryQuantity = item.secondaryQuantity;
                consumptionLog.primaryQuantityChange = originalPrimary - item.quantity;
                consumptionLog.secondaryQuantityChange = originalSecondary - (item.secondaryQuantity || 0);

                // If both quantities are now zero or negative, remove the item
                if (dualUnitUpdate.removeCompletely || (item.quantity <= 0 && (item.secondaryQuantity || 0) <= 0)) {
                    removedItems.push(item.name);
                    inventory.items.splice(itemIndex, 1);
                    consumptionLog.remainingQuantity = 0;
                    consumptionLog.remainingSecondaryQuantity = null;
                } else {
                    updatedItems.push({
                        name: item.name,
                        newQuantity: item.quantity,
                        newSecondaryQuantity: item.secondaryQuantity,
                        unit: item.unit,
                        secondaryUnit: item.secondaryUnit
                    });
                }
            } else {
                // Handle simple single-unit consumption (legacy behavior)
                if (useSecondaryUnit && item.secondaryQuantity) {
                    // Consuming from secondary quantity
                    const newSecondaryQty = Math.max(0, item.secondaryQuantity - consumeQuantity);

                    consumptionLog.remainingSecondaryQuantity = newSecondaryQty;
                    consumptionLog.secondaryQuantityChange = item.secondaryQuantity - newSecondaryQty;

                    item.secondaryQuantity = newSecondaryQty;

                    // If secondary quantity is exhausted, also remove primary quantity
                    if (newSecondaryQty <= 0) {
                        item.quantity = 0;
                        removedItems.push(item.name);
                        inventory.items.splice(itemIndex, 1);
                        consumptionLog.remainingQuantity = 0;
                        consumptionLog.remainingSecondaryQuantity = null;
                    } else {
                        consumptionLog.remainingQuantity = item.quantity;
                        updatedItems.push({
                            name: item.name,
                            newQuantity: item.quantity,
                            newSecondaryQuantity: item.secondaryQuantity,
                            unit: item.unit,
                            secondaryUnit: item.secondaryUnit
                        });
                    }
                } else {
                    // Consuming from primary quantity
                    const newPrimaryQty = Math.max(0, item.quantity - consumeQuantity);

                    consumptionLog.remainingQuantity = newPrimaryQty;
                    consumptionLog.primaryQuantityChange = item.quantity - newPrimaryQty;

                    item.quantity = newPrimaryQty;

                    if (newPrimaryQty <= 0) {
                        // Also clear secondary quantity if primary is exhausted
                        item.secondaryQuantity = null;
                        removedItems.push(item.name);
                        inventory.items.splice(itemIndex, 1);
                        consumptionLog.remainingSecondaryQuantity = null;
                    } else {
                        consumptionLog.remainingSecondaryQuantity = item.secondaryQuantity;
                        updatedItems.push({
                            name: item.name,
                            newQuantity: item.quantity,
                            newSecondaryQuantity: item.secondaryQuantity,
                            unit: item.unit,
                            secondaryUnit: item.secondaryUnit
                        });
                    }
                }
            }

            consumptionLogs.push(consumptionLog);

            // Log consumption details
            console.log(`Consumed ${consumeQuantity} ${unit} of ${item.name} for reason: ${reason}`);
            if (notes) {
                console.log(`Notes: ${notes}`);
            }
            if (isDualUnitConsumption) {
                console.log(`Dual unit consumption - Primary: ${consumptionLog.primaryQuantityChange || 0}, Secondary: ${consumptionLog.secondaryQuantityChange || 0}`);
            }
        }

        // Update inventory timestamp
        inventory.lastUpdated = new Date();

        // CRITICAL FIX: Initialize consumptionHistory if it doesn't exist
        if (!inventory.consumptionHistory) {
            inventory.consumptionHistory = [];
            console.log('Initialized consumption history array');
        }

        // Add consumption log to inventory document (for tracking)
        console.log('Adding consumption logs to history:', consumptionLogs.length);
        inventory.consumptionHistory.push(...consumptionLogs);

        // Keep only last 100 consumption records to prevent document from growing too large
        if (inventory.consumptionHistory.length > 100) {
            inventory.consumptionHistory = inventory.consumptionHistory.slice(-100);
            console.log('Trimmed consumption history to last 100 records');
        }

        console.log('Current consumption history length:', inventory.consumptionHistory.length);

        // IMPORTANT: Mark the consumptionHistory field as modified
        inventory.markModified('consumptionHistory');

        await inventory.save();

        console.log('Inventory consumption completed:', {
            logsCreated: consumptionLogs.length,
            itemsUpdated: updatedItems.length,
            itemsRemoved: removedItems.length,
            totalHistoryRecords: inventory.consumptionHistory.length
        });

        // Enhanced response with dual unit support
        return NextResponse.json({
            success: true,
            message: `Successfully updated inventory`,
            summary: {
                itemsConsumed: consumptionLogs.length,
                itemsUpdated: updatedItems.map(item => item.name),
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

// GET - Get consumption history with enhanced dual unit support
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
            console.log('No inventory found for user:', session.user.id);
            return NextResponse.json({
                success: true,
                history: []
            });
        }

        console.log('Inventory found. Consumption history length:', inventory.consumptionHistory?.length || 0);

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

        // Enhanced history formatting for dual unit items
        const formattedHistory = history.map(log => ({
            ...log,
            // Add formatted display text for dual unit consumptions
            displayText: log.isDualUnitConsumption ?
                `${log.quantityConsumed} ${log.unitConsumed} consumed` +
                (log.primaryQuantityChange ? ` (${log.primaryQuantityChange} ${log.unitConsumed} packages)` : '') +
                (log.secondaryQuantityChange ? ` (${log.secondaryQuantityChange} individual items)` : '') :
                `${log.quantityConsumed} ${log.unitConsumed} consumed`,

            remainingDisplayText: log.isDualUnitConsumption ?
                (log.remainingQuantity > 0 || (log.remainingSecondaryQuantity || 0) > 0) ?
                    `${log.remainingQuantity || 0} packages, ${log.remainingSecondaryQuantity || 0} items remaining` :
                    'Item completely consumed' :
                log.remainingQuantity > 0 ?
                    `${log.remainingQuantity} ${log.unitConsumed} remaining` :
                    'Item completely consumed'
        }));

        return NextResponse.json({
            success: true,
            history: formattedHistory,
            total: formattedHistory.length
        });

    } catch (error) {
        console.error('Get consumption history error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch consumption history' },
            { status: 500 }
        );
    }
}