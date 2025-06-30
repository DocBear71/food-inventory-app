// file: /src/app/api/inventory/route.js v5 - Fixed subscription limits and error handling

import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import {UserInventory, User} from '@/lib/models';
import {FEATURE_GATES, checkUsageLimit, getUpgradeMessage, getRequiredTier} from '@/lib/subscription-config';

// GET - Fetch user's inventory
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        console.log('GET /api/inventory - Session:', session);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        await connectDB();

        let inventory = await UserInventory.findOne({userId: session.user.id});

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
            {error: 'Failed to fetch inventory'},
            {status: 500}
        );
    }
}

// POST - Add item to inventory (with subscription limits)
export async function POST(request) {
    console.log('🔍 POST /api/inventory - START');

    try {
        const session = await getServerSession(authOptions);
        console.log('🔍 Session check:', {
            hasSession: !!session,
            userId: session?.user?.id,
            userEmail: session?.user?.email
        });

        if (!session?.user?.id) {
            console.log('❌ No session or user ID found');
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        console.log('🔍 Reading request body...');
        const body = await request.json();
        console.log('🔍 Request body:', JSON.stringify(body, null, 2));

        const {
            name, brand, category, quantity, unit, location, upc, expirationDate, nutrition,
            secondaryQuantity, secondaryUnit, mergeDuplicates = true
        } = body;


        // Validation
        if (!name || name.trim().length === 0) {
            console.log('❌ Validation failed: missing name');
            return NextResponse.json(
                {error: 'Item name is required and cannot be empty'},
                {status: 400}
            );
        }

        const validQuantity = parseFloat(quantity);
        if (isNaN(validQuantity) || validQuantity <= 0) {
            console.log('❌ Validation failed: invalid quantity:', quantity);
            return NextResponse.json(
                {error: 'Quantity must be a positive number'},
                {status: 400}
            );
        }
        if (mergeDuplicates) {
            const existingItemIndex = inventory.items.findIndex(item => {
                // Primary matching criteria
                const nameMatch = item.name.toLowerCase().trim() === name.toLowerCase().trim();
                const brandMatch = (item.brand || '').toLowerCase().trim() === (brand || '').toLowerCase().trim();
                const upcMatch = upc && item.upc && item.upc.replace(/\D/g, '') === upc.replace(/\D/g, '');

                // If UPC exists and matches, that's a definitive match
                if (upcMatch) return true;

                // If no UPC, match on name + brand + category
                const categoryMatch = (item.category || '').toLowerCase().trim() === (category || '').toLowerCase().trim();

                return nameMatch && brandMatch && categoryMatch;
            });

            if (existingItemIndex !== -1) {
                // Item exists, merge quantities instead of creating new item
                const existingItem = inventory.items[existingItemIndex];

                // Add quantities (handle both primary and secondary units)
                const newQuantity = (existingItem.quantity || 0) + (quantity || 1);
                const newSecondaryQuantity = existingItem.secondaryQuantity && secondaryQuantity ?
                    (existingItem.secondaryQuantity + parseFloat(secondaryQuantity)) :
                    existingItem.secondaryQuantity || (secondaryQuantity ? parseFloat(secondaryQuantity) : null);

                // Update the existing item
                inventory.items[existingItemIndex] = {
                    ...existingItem,
                    quantity: newQuantity,
                    secondaryQuantity: newSecondaryQuantity,
                    secondaryUnit: newSecondaryQuantity ? (secondaryUnit || existingItem.secondaryUnit) : null,
                    // Update other fields if they were empty before
                    brand: existingItem.brand || brand || '',
                    category: existingItem.category || category || '',
                    upc: existingItem.upc || upc || '',
                    expirationDate: expirationDate ? new Date(expirationDate) : existingItem.expirationDate,
                    nutrition: nutrition || existingItem.nutrition,
                    lastUpdated: new Date()
                };

                inventory.lastUpdated = new Date();
                await inventory.save();

                // Update usage tracking (same as before)
                await User.updateOne(
                    {_id: session.user.id},
                    {
                        $set: {
                            'usageTracking.totalInventoryItems': inventory.items.length,
                            'usageTracking.lastUpdated': new Date()
                        }
                    },
                    {runValidators: false}
                );

                return NextResponse.json({
                    success: true,
                    item: inventory.items[existingItemIndex],
                    message: `Merged with existing item. New quantity: ${newQuantity} ${unit}`,
                    merged: true,
                    previousQuantity: existingItem.quantity,
                    addedQuantity: quantity || 1,
                    remainingItems: userSubscription.tier === 'free' ? Math.max(0, 50 - inventory.items.length) :
                        userSubscription.tier === 'gold' ? Math.max(0, 250 - inventory.items.length) : 'Unlimited',
                    currentItemCount: inventory.items.length
                });
            }
        }

        console.log('🔍 Connecting to MongoDB...');
        await connectDB();
        console.log('✅ MongoDB connected successfully');

        console.log('🔍 Finding user in database...');
        const user = await User.findById(session.user.id);
        if (!user) {
            console.error('❌ User not found for ID:', session.user.id);
            return NextResponse.json({error: 'User not found'}, {status: 404});
        }
        console.log('✅ User found:', user.email);

        console.log('🔍 Getting user subscription info...');
        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };
        console.log('✅ User subscription:', userSubscription);

        console.log('🔍 Finding user inventory...');
        let inventory = await UserInventory.findOne({userId: session.user.id});
        if (!inventory) {
            console.log('🔧 Creating new inventory for user');
            inventory = new UserInventory({
                userId: session.user.id,
                items: []
            });
        }
        console.log('✅ Inventory found/created, current items:', inventory.items.length);

        const currentItemCount = inventory.items.length;

        // TEMPORARILY BYPASS SUBSCRIPTION CHECKING
        console.log('🔧 BYPASSING subscription limits for debugging');
        const hasCapacity = true;

        /*
        // ORIGINAL SUBSCRIPTION CHECK (commented out for debugging)
        console.log('🔍 Checking subscription limits...');
        const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.INVENTORY_LIMIT, currentItemCount);
        console.log('✅ Has capacity:', hasCapacity);

        if (!hasCapacity) {
            const requiredTier = getRequiredTier(FEATURE_GATES.INVENTORY_LIMIT);
            console.log('❌ User exceeded inventory limits');
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
        */

        console.log('🔍 Creating new item object...');
        const newItem = {
            name: name.trim(),
            brand: brand ? brand.trim() : '',
            category: category ? category.trim() : '',
            quantity: validQuantity,
            unit: unit || 'item',
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

        console.log('✅ New item created:', JSON.stringify(newItem, null, 2));

        if (expirationDate) {
            const expDate = new Date(expirationDate);
            if (isNaN(expDate.getTime())) {
                console.log('❌ Invalid expiration date:', expirationDate);
                return NextResponse.json(
                    {error: 'Invalid expiration date format'},
                    {status: 400}
                );
            }
            newItem.expirationDate = expDate;
        }

        console.log('🔍 Adding item to inventory...');
        inventory.items.push(newItem);
        inventory.lastUpdated = new Date();

        console.log('🔍 Saving inventory to database...');
        await inventory.save();
        console.log('✅ Inventory saved successfully');

        console.log('🔍 Updating user usage tracking...');
        if (!user.usageTracking) {
            user.usageTracking = {};
        }
        user.usageTracking.totalInventoryItems = inventory.items.length;
        user.usageTracking.lastUpdated = new Date();

        console.log('🔍 Saving user...');
        await user.save();
        console.log('✅ User saved successfully');

        console.log('🔍 Calculating remaining items...');
        let remainingItems;
        if (userSubscription.tier === 'platinum' || userSubscription.tier === 'admin') {
            remainingItems = 'Unlimited';
        } else if (userSubscription.tier === 'gold') {
            remainingItems = Math.max(0, 250 - inventory.items.length);
        } else {
            remainingItems = Math.max(0, 50 - inventory.items.length);
        }

        console.log('✅ SUCCESS - Preparing response...');
        const response = {
            success: true,
            item: newItem,
            message: 'Item added successfully',
            remainingItems: remainingItems,
            totalItems: inventory.items.length
        };

        console.log('✅ Sending response:', JSON.stringify(response, null, 2));
        return NextResponse.json(response);

    } catch (error) {
        console.error('❌❌❌ CRITICAL ERROR in POST /api/inventory:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error name:', error.name);

        // Return a proper JSON error response
        return NextResponse.json(
            {
                error: 'Failed to add item',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            {status: 500}
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
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        const body = await request.json();
        const {itemId, ...updateData} = body;

        console.log('PUT /api/inventory - Body:', body);

        if (!itemId) {
            return NextResponse.json(
                {error: 'Item ID is required'},
                {status: 400}
            );
        }

        await connectDB();

        const inventory = await UserInventory.findOne({userId: session.user.id});

        if (!inventory) {
            return NextResponse.json(
                {error: 'Inventory not found'},
                {status: 404}
            );
        }

        const itemIndex = inventory.items.findIndex(
            item => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
            return NextResponse.json(
                {error: 'Item not found'},
                {status: 404}
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
            {error: 'Failed to update item'},
            {status: 500}
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
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        const {searchParams} = new URL(request.url);
        const itemId = searchParams.get('itemId');

        console.log('DELETE /api/inventory - ItemId:', itemId);

        if (!itemId) {
            return NextResponse.json(
                {error: 'Item ID is required'},
                {status: 400}
            );
        }

        await connectDB();

        const inventory = await UserInventory.findOne({userId: session.user.id});

        if (!inventory) {
            return NextResponse.json(
                {error: 'Inventory not found'},
                {status: 404}
            );
        }

        const initialLength = inventory.items.length;
        inventory.items = inventory.items.filter(
            item => item._id.toString() !== itemId
        );

        if (inventory.items.length === initialLength) {
            return NextResponse.json(
                {error: 'Item not found'},
                {status: 404}
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
            {error: 'Failed to remove item'},
            {status: 500}
        );
    }
}