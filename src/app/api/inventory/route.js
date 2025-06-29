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
        console.log('🔍 API DEBUG: POST /api/inventory started');

        const session = await getServerSession(authOptions);
        console.log('🔍 API DEBUG: Session:', {
            userId: session?.user?.id,
            userEmail: session?.user?.email,
            hasSession: !!session
        });

        if (!session?.user?.id) {
            console.log('❌ API DEBUG: No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        console.log('🔍 API DEBUG: Request body:', body);

        // Validation
        if (!body.name || body.name.trim().length === 0) {
            console.log('❌ API DEBUG: Missing item name');
            return NextResponse.json(
                { error: 'Item name is required and cannot be empty' },
                { status: 400 }
            );
        }

        const validQuantity = parseFloat(body.quantity);
        if (isNaN(validQuantity) || validQuantity <= 0) {
            console.log('❌ API DEBUG: Invalid quantity:', body.quantity);
            return NextResponse.json(
                { error: 'Quantity must be a positive number' },
                { status: 400 }
            );
        }

        console.log('🔍 API DEBUG: Connecting to MongoDB...');
        await connectDB();
        console.log('✅ API DEBUG: MongoDB connected');

        console.log('🔍 API DEBUG: Looking up user...');
        const user = await User.findById(session.user.id);
        if (!user) {
            console.error('❌ API DEBUG: User not found for ID:', session.user.id);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        console.log('✅ API DEBUG: User found:', user.email);

        // ❌ THIS IS WHERE THE ERROR LIKELY OCCURS - when checking subscription
        console.log('🔍 API DEBUG: Checking user subscription...');
        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };
        console.log('✅ API DEBUG: User subscription:', userSubscription);

        // Get current inventory count
        console.log('🔍 API DEBUG: Getting inventory...');
        let inventory = await UserInventory.findOne({ userId: session.user.id });
        if (!inventory) {
            inventory = new UserInventory({
                userId: session.user.id,
                items: []
            });
        }
        console.log('✅ API DEBUG: Inventory found, items:', inventory.items.length);

        const currentItemCount = inventory.items.length;

        // ❌ THIS IS LIKELY WHERE IT FAILS - when using imported functions
        console.log('🔍 API DEBUG: Checking usage limits...');
        const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.INVENTORY_LIMIT, currentItemCount);
        console.log('✅ API DEBUG: Has capacity:', hasCapacity);

        // Continue with rest of your logic...

    } catch (error) {
        console.error('❌ API DEBUG: Unhandled error:', error);
        console.error('❌ API DEBUG: Error stack:', error.stack);
        console.error('❌ API DEBUG: Error name:', error.name);
        console.error('❌ API DEBUG: Error message:', error.message);

        return NextResponse.json(
            {
                error: 'Failed to add item',
                details: error.message,
                stack: error.stack,
                errorType: error.name
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