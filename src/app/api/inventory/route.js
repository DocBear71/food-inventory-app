// file: /src/app/api/inventory/route.js v5 - Fixed subscription limits and error handling

import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import {UserInventory, User} from '@/lib/models';
import {FEATURE_GATES, checkUsageLimit, getUpgradeMessage, getRequiredTier} from '@/lib/subscription-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

// POST - Add item to inventory (with subscription limits and duplicate detection)
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
            name,
            brand,
            category,
            quantity,
            unit,
            location,
            upc,
            expirationDate,
            nutrition,
            secondaryQuantity,
            secondaryUnit,
            mergeDuplicates = true  // Default to true
        } = body;

        console.log('POST /api/inventory - Body:', body);

        if (!name) {
            return NextResponse.json(
                { error: 'Item name is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Get user and check subscription limits
        const user = await User.findById(session.user.id);
        if (!user) {
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

        // Check subscription limits
        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };

        // DUPLICATE DETECTION LOGIC
        if (mergeDuplicates) {
            console.log('🔍 Checking for duplicate items...');

            const existingItemIndex = inventory.items.findIndex(existingItem => {
                // Ensure we have valid strings for comparison
                const existingName = (existingItem.name || '').toLowerCase().trim();
                const newName = (name || '').toLowerCase().trim();
                const existingBrand = (existingItem.brand || '').toLowerCase().trim();
                const newBrand = (brand || '').toLowerCase().trim();
                const existingCategory = (existingItem.category || '').toLowerCase().trim();
                const newCategory = (category || '').toLowerCase().trim();

                // UPC matching (strongest indicator)
                if (upc && existingItem.upc) {
                    const existingUPC = existingItem.upc.replace(/\D/g, '');
                    const newUPC = upc.replace(/\D/g, '');
                    if (existingUPC && newUPC && existingUPC === newUPC) {
                        console.log('📦 Found UPC match:', existingUPC);
                        return true;
                    }
                }

                // Name + Brand + Category matching
                const nameMatch = existingName === newName;
                const brandMatch = existingBrand === newBrand;
                const categoryMatch = existingCategory === newCategory;

                if (nameMatch && brandMatch && categoryMatch) {
                    console.log('📦 Found name/brand/category match:', newName);
                    return true;
                }

                return false;
            });

            if (existingItemIndex !== -1) {
                console.log('✅ Merging with existing item at index:', existingItemIndex);

                const existingItem = inventory.items[existingItemIndex];

                // Calculate new PRIMARY quantity (this is what gets added)
                const newPrimaryQuantity = (existingItem.quantity || 0) + (parseFloat(quantity) || 1);

                // FIXED: Secondary quantity logic - it represents size per unit, not additive quantity
                let newSecondaryQuantity = null;
                let newSecondaryUnit = null;

                if (existingItem.secondaryQuantity && secondaryQuantity) {
                    // Both have secondary quantities - check if they match
                    const existingSecondary = parseFloat(existingItem.secondaryQuantity);
                    const newSecondary = parseFloat(secondaryQuantity);

                    if (Math.abs(existingSecondary - newSecondary) < 0.01) {
                        // They match (within rounding), keep the existing one
                        newSecondaryQuantity = existingItem.secondaryQuantity;
                        newSecondaryUnit = existingItem.secondaryUnit;
                        console.log(`📦 Secondary quantities match (${existingSecondary} ${existingItem.secondaryUnit}), keeping existing`);
                    } else {
                        // They don't match - keep existing and warn
                        newSecondaryQuantity = existingItem.secondaryQuantity;
                        newSecondaryUnit = existingItem.secondaryUnit;
                        console.log(`⚠️ Secondary quantity mismatch: existing ${existingSecondary} ${existingItem.secondaryUnit} vs new ${newSecondary} ${secondaryUnit}, keeping existing`);
                    }
                } else if (existingItem.secondaryQuantity) {
                    // Keep existing secondary quantity
                    newSecondaryQuantity = existingItem.secondaryQuantity;
                    newSecondaryUnit = existingItem.secondaryUnit;
                    console.log(`📦 Keeping existing secondary quantity: ${newSecondaryQuantity} ${newSecondaryUnit}`);
                } else if (secondaryQuantity) {
                    // Use new secondary quantity (existing item didn't have one)
                    newSecondaryQuantity = parseFloat(secondaryQuantity);
                    newSecondaryUnit = secondaryUnit;
                    console.log(`📦 Adding new secondary quantity: ${newSecondaryQuantity} ${newSecondaryUnit}`);
                }

                // Update the existing item
                inventory.items[existingItemIndex].quantity = newPrimaryQuantity;
                inventory.items[existingItemIndex].secondaryQuantity = newSecondaryQuantity;
                inventory.items[existingItemIndex].secondaryUnit = newSecondaryUnit;
                inventory.items[existingItemIndex].lastUpdated = new Date();

                // Only update fields if the existing field is empty/null AND we have new data
                if (!existingItem.brand && brand) {
                    inventory.items[existingItemIndex].brand = brand;
                }
                if (!existingItem.category && category) {
                    inventory.items[existingItemIndex].category = category;
                }
                if (!existingItem.upc && upc) {
                    inventory.items[existingItemIndex].upc = upc;
                }
                if (!existingItem.expirationDate && expirationDate) {
                    inventory.items[existingItemIndex].expirationDate = new Date(expirationDate);
                }
                if (!existingItem.nutrition && nutrition) {
                    inventory.items[existingItemIndex].nutrition = nutrition;
                }

                // Mark the inventory as modified and save
                inventory.markModified('items');
                inventory.lastUpdated = new Date();

                await inventory.save();

                // Update user's usage tracking
                await User.updateOne(
                    { _id: session.user.id },
                    {
                        $set: {
                            'usageTracking.totalInventoryItems': inventory.items.length,
                            'usageTracking.lastUpdated': new Date()
                        }
                    },
                    { runValidators: false }
                );

                // Calculate remaining items
                let remainingItems;
                if (userSubscription.tier === 'free') {
                    remainingItems = Math.max(0, 50 - inventory.items.length);
                } else if (userSubscription.tier === 'gold') {
                    remainingItems = Math.max(0, 250 - inventory.items.length);
                } else {
                    remainingItems = 'Unlimited';
                }

                console.log('✅ Item merged successfully');

                // FIXED: Better message that explains the secondary quantity logic
                let mergeMessage = `Merged with existing item. New quantity: ${newPrimaryQuantity} ${unit}`;
                if (newSecondaryQuantity) {
                    mergeMessage += ` (${newSecondaryQuantity} ${newSecondaryUnit} each)`;
                }

                return NextResponse.json({
                    success: true,
                    item: inventory.items[existingItemIndex],
                    message: mergeMessage,
                    merged: true,
                    previousQuantity: existingItem.quantity,
                    addedQuantity: parseFloat(quantity) || 1,
                    remainingItems: remainingItems,
                    currentItemCount: inventory.items.length
                });
            }

            console.log('🆕 No duplicates found, creating new item');
        }

        // Check subscription limits BEFORE creating new item
        const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.INVENTORY_LIMIT, currentItemCount);

        if (!hasCapacity) {
            const requiredTier = getRequiredTier(FEATURE_GATES.INVENTORY_LIMIT);

            let errorMessage;
            if (userSubscription.tier === 'free') {
                errorMessage = `You've reached the free plan limit of 50 inventory items. Upgrade to Gold for 250 items or Platinum for unlimited items.`;
            } else if (userSubscription.tier === 'gold') {
                errorMessage = `You've reached the Gold plan limit of 250 inventory items. Upgrade to Platinum for unlimited items.`;
            } else {
                errorMessage = getUpgradeMessage(FEATURE_GATES.INVENTORY_LIMIT, requiredTier);
            }

            return NextResponse.json({
                error: errorMessage,
                code: 'INVENTORY_LIMIT_EXCEEDED',
                feature: FEATURE_GATES.INVENTORY_LIMIT,
                currentCount: currentItemCount,
                currentTier: userSubscription.tier,
                requiredTier: requiredTier,
                upgradeUrl: `/pricing?source=inventory-limit&feature=inventory&required=${requiredTier}`
            }, { status: 403 });
        }

        // CREATE NEW ITEM (no duplicates found or mergeDuplicates is false)
        const newItem = {
            name,
            brand: brand || '',
            category: category || '',
            quantity: parseFloat(quantity) || 1,
            unit: unit || 'item',
            secondaryQuantity: secondaryQuantity && secondaryQuantity !== '' ?
                Math.max(parseFloat(secondaryQuantity), 0.1) : null,
            secondaryUnit: secondaryQuantity && secondaryQuantity !== '' ?
                secondaryUnit : null,
            location: location || 'pantry',
            upc: upc || '',
            expirationDate: expirationDate ? new Date(expirationDate) : null,
            addedDate: new Date(),
            nutrition: nutrition || null
        };

        inventory.items.push(newItem);
        inventory.lastUpdated = new Date();

        await inventory.save();

        // Update user's usage tracking
        await User.updateOne(
            { _id: session.user.id },
            {
                $set: {
                    'usageTracking.totalInventoryItems': inventory.items.length,
                    'usageTracking.lastUpdated': new Date()
                }
            },
            { runValidators: false }
        );

        console.log('Item added successfully:', newItem);

        // Calculate remaining items
        let remainingItems;
        if (userSubscription.tier === 'free') {
            remainingItems = Math.max(0, 50 - inventory.items.length);
        } else if (userSubscription.tier === 'gold') {
            remainingItems = Math.max(0, 250 - inventory.items.length);
        } else {
            remainingItems = 'Unlimited';
        }

        return NextResponse.json({
            success: true,
            item: newItem,
            message: 'Item added successfully',
            merged: false,
            remainingItems: remainingItems,
            currentItemCount: inventory.items.length
        });

    } catch (error) {
        console.error('POST inventory error:', error);
        return NextResponse.json(
            { error: 'Failed to add item' },
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