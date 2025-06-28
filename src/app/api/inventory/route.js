// file: /src/app/api/inventory/route.js v5 - Fixed subscription limits and error handling

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory, User } from '@/lib/models';
import { FEATURE_GATES, checkUsageLimit, getUpgradeMessage, getRequiredTier } from '@/lib/subscription-config';

// GET - Fetch user's inventory
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        console.log('GET /api/inventory - Session:', session);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        let inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            // Create empty inventory if doesn't exist
            inventory = new UserInventory({
                userId: session.user.id,
                items: []
            });
            await inventory.save();
        }

        return NextResponse.json({
            success: true,
            inventory: inventory.items
        });

    } catch (error) {
        console.error('GET inventory error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory' },
            { status: 500 }
        );
    }
}

// POST - Add item to inventory (with subscription limits)
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        console.log('POST /api/inventory - Session:', session);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            name, brand, category, quantity, unit, location, upc, expirationDate, nutrition,
            // Secondary units support
            secondaryQuantity, secondaryUnit
        } = body;

        console.log('POST /api/inventory - Body:', body);

        // FIXED: Better validation
        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Item name is required and cannot be empty' },
                { status: 400 }
            );
        }

        // FIXED: Validate quantity
        const validQuantity = parseFloat(quantity);
        if (isNaN(validQuantity) || validQuantity <= 0) {
            return NextResponse.json(
                { error: 'Quantity must be a positive number' },
                { status: 400 }
            );
        }

        await connectDB();

        // Get user and check subscription limits
        const user = await User.findById(session.user.id);
        if (!user) {
            console.error('User not found for ID:', session.user.id);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get current inventory count
        let inventory = await UserInventory.findOne({ userId: session.user.id });
        if (!inventory) {
            inventory = new UserInventory({
                userId: session.user.id,
                items: []
            });
        }

        const currentItemCount = inventory.items.length;

        // FIXED: Better subscription checking
        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };

        console.log('User subscription info:', {
            tier: userSubscription.tier,
            status: userSubscription.status,
            currentItems: currentItemCount
        });

        // FIXED: Check if user has feature access
        const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.INVENTORY_LIMIT, currentItemCount);

        if (!hasCapacity) {
            const requiredTier = getRequiredTier(FEATURE_GATES.INVENTORY_LIMIT);
            console.log('User exceeded inventory limits:', {
                currentTier: userSubscription.tier,
                requiredTier,
                currentItems: currentItemCount
            });

            return NextResponse.json({
                error: getUpgradeMessage(FEATURE_GATES.INVENTORY_LIMIT, requiredTier),
                code: 'USAGE_LIMIT_EXCEEDED',
                feature: FEATURE_GATES.INVENTORY_LIMIT,
                currentCount: currentItemCount,
                currentTier: userSubscription.tier,
                requiredTier: requiredTier,
                upgradeUrl: `/pricing?source=inventory-limit&feature=${FEATURE_GATES.INVENTORY_LIMIT}&required=${requiredTier}`
            }, { status: 403 });
        }

        // FIXED: Better item creation with validation
        const newItem = {
            name: name.trim(),
            brand: brand ? brand.trim() : '',
            category: category ? category.trim() : '',
            quantity: validQuantity,
            unit: unit || 'item',

            // Secondary unit support with validation
            secondaryQuantity: secondaryQuantity && secondaryQuantity !== '' && !isNaN(parseFloat(secondaryQuantity)) ?
                Math.max(parseFloat(secondaryQuantity), 0.1) : null,
            secondaryUnit: secondaryQuantity && secondaryQuantity !== '' && !isNaN(parseFloat(secondaryQuantity)) && secondaryUnit ?
                secondaryUnit.trim() : null,

            location: location || 'pantry',
            upc: upc ? upc.trim() : '',
            expirationDate: expirationDate ? new Date(expirationDate) : null,
            addedDate: new Date(),
            nutrition: nutrition || null
        };

        // FIXED: Validate expiration date
        if (expirationDate) {
            const expDate = new Date(expirationDate);
            if (isNaN(expDate.getTime())) {
                return NextResponse.json(
                    { error: 'Invalid expiration date format' },
                    { status: 400 }
                );
            }
            newItem.expirationDate = expDate;
        }

        console.log('Creating new item:', newItem);

        try {
            inventory.items.push(newItem);
            inventory.lastUpdated = new Date();
            await inventory.save();

            // Update user's usage tracking
            if (!user.usageTracking) {
                user.usageTracking = {};
            }
            user.usageTracking.totalInventoryItems = inventory.items.length;
            user.usageTracking.lastUpdated = new Date();
            await user.save();

            console.log('Item added successfully:', newItem);

            // FIXED: Calculate remaining items properly
            let remainingItems;
            if (userSubscription.tier === 'platinum' || userSubscription.tier === 'admin') {
                remainingItems = 'Unlimited';
            } else if (userSubscription.tier === 'gold') {
                remainingItems = Math.max(0, 250 - inventory.items.length);
            } else {
                remainingItems = Math.max(0, 50 - inventory.items.length);
            }

            return NextResponse.json({
                success: true,
                item: newItem,
                message: 'Item added successfully',
                remainingItems: remainingItems,
                totalItems: inventory.items.length
            });

        } catch (saveError) {
            console.error('Error saving item to inventory:', saveError);
            return NextResponse.json(
                { error: 'Failed to save item to database' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('POST inventory error:', error);
        return NextResponse.json(
            {
                error: 'Failed to add item',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}

// PUT - Update inventory item
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        console.log('PUT /api/inventory - Session:', session);

        if (!session?.user?.id) {
            console.log('PUT: No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { itemId, ...updateData } = body;

        console.log('PUT /api/inventory - Body:', body);

        if (!itemId) {
            return NextResponse.json(
                { error: 'Item ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            return NextResponse.json(
                { error: 'Inventory not found' },
                { status: 404 }
            );
        }

        const itemIndex = inventory.items.findIndex(
            item => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
            return NextResponse.json(
                { error: 'Item not found' },
                { status: 404 }
            );
        }

        // FIXED: Better validation for updates
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                if (key === 'quantity') {
                    const validQuantity = parseFloat(updateData[key]);
                    if (!isNaN(validQuantity) && validQuantity > 0) {
                        inventory.items[itemIndex][key] = validQuantity;
                    }
                } else if (key === 'secondaryQuantity') {
                    inventory.items[itemIndex][key] = updateData[key] && updateData[key] !== '' && !isNaN(parseFloat(updateData[key])) ?
                        Math.max(parseFloat(updateData[key]), 0.1) : null;
                } else if (key === 'secondaryUnit') {
                    inventory.items[itemIndex][key] = updateData[key] && updateData[key] !== '' ?
                        updateData[key].trim() : null;
                } else if (key === 'name' && updateData[key]) {
                    inventory.items[itemIndex][key] = updateData[key].trim();
                } else {
                    inventory.items[itemIndex][key] = updateData[key];
                }
            }
        });

        inventory.lastUpdated = new Date();
        await inventory.save();

        console.log('PUT: Item updated successfully:', inventory.items[itemIndex]);

        return NextResponse.json({
            success: true,
            item: inventory.items[itemIndex],
            message: 'Item updated successfully'
        });

    } catch (error) {
        console.error('PUT inventory error:', error);
        return NextResponse.json(
            { error: 'Failed to update item' },
            { status: 500 }
        );
    }
}

// DELETE - Remove item from inventory
export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);

        console.log('DELETE /api/inventory - Session:', session);

        if (!session?.user?.id) {
            console.log('DELETE: No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('itemId');

        console.log('DELETE /api/inventory - ItemId:', itemId);

        if (!itemId) {
            return NextResponse.json(
                { error: 'Item ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            return NextResponse.json(
                { error: 'Inventory not found' },
                { status: 404 }
            );
        }

        const initialLength = inventory.items.length;
        inventory.items = inventory.items.filter(
            item => item._id.toString() !== itemId
        );

        if (inventory.items.length === initialLength) {
            return NextResponse.json(
                { error: 'Item not found' },
                { status: 404 }
            );
        }

        inventory.lastUpdated = new Date();
        await inventory.save();

        // Update user's usage tracking
        const user = await User.findById(session.user.id);
        if (user) {
            if (!user.usageTracking) {
                user.usageTracking = {};
            }
            user.usageTracking.totalInventoryItems = inventory.items.length;
            user.usageTracking.lastUpdated = new Date();
            await user.save();
        }

        console.log('DELETE: Item removed successfully');

        return NextResponse.json({
            success: true,
            message: 'Item removed successfully'
        });

    } catch (error) {
        console.error('DELETE inventory error:', error);
        return NextResponse.json(
            { error: 'Failed to remove item' },
            { status: 500 }
        );
    }
}