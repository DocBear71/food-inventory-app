// file: /src/app/api/inventory/bulk-add/route.js v2 - Added subscription-based inventory limits

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory, User } from '@/lib/models';
import { FEATURE_GATES, checkUsageLimit, getUpgradeMessage, getRequiredTier } from '@/lib/subscription-config';

// POST - Bulk add items to inventory (with subscription limits)
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        console.log('POST /api/inventory/bulk-add - Session:', session);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { items, source } = body;

        console.log('POST /api/inventory/bulk-add - Body:', { itemCount: items?.length, source });

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: 'Items array is required and must not be empty' },
                { status: 400 }
            );
        }

        await connectDB();

        // Get user and check subscription limits
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get current inventory
        let inventory = await UserInventory.findOne({ userId: session.user.id });
        if (!inventory) {
            inventory = new UserInventory({
                userId: session.user.id,
                items: []
            });
        }

        const currentItemCount = inventory.items.length;
        const requestedItemCount = items.length;
        const totalAfterAdd = currentItemCount + requestedItemCount;

        // Check subscription limits
        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };

        // Check if adding these items would exceed the limit
        const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.ADD_INVENTORY_ITEM, totalAfterAdd - 1);

        if (!hasCapacity) {
            const requiredTier = getRequiredTier(FEATURE_GATES.ADD_INVENTORY_ITEM);
            const maxItems = userSubscription.tier === 'free' ? 50 :
                userSubscription.tier === 'gold' ? 250 : 'unlimited';

            return NextResponse.json({
                error: `Adding ${requestedItemCount} items would exceed your limit. You have ${currentItemCount} items and can add ${maxItems === 'unlimited' ? 'unlimited' : maxItems - currentItemCount} more.`,
                code: 'USAGE_LIMIT_EXCEEDED',
                feature: FEATURE_GATES.ADD_INVENTORY_ITEM,
                currentCount: currentItemCount,
                requestedCount: requestedItemCount,
                maxItems: maxItems,
                currentTier: userSubscription.tier,
                requiredTier: requiredTier,
                upgradeUrl: `/pricing?source=inventory-bulk-limit&feature=${FEATURE_GATES.ADD_INVENTORY_ITEM}&required=${requiredTier}`
            }, { status: 403 });
        }

        // Validate each item
        const validatedItems = [];
        const errors = [];

        items.forEach((item, index) => {
            if (!item.name || item.name.trim() === '') {
                errors.push(`Item ${index + 1}: Name is required`);
                return;
            }

            // Create validated item with defaults - UPDATED: Support dual units
            const validatedItem = {
                name: item.name.trim(),
                brand: item.brand || '',
                category: item.category || 'Other',
                quantity: Math.max(item.quantity || 1, 0.1), // Ensure positive quantity
                unit: item.unit || 'item',

                // NEW: Secondary unit support
                secondaryQuantity: item.secondaryQuantity && item.secondaryQuantity !== '' ?
                    Math.max(parseFloat(item.secondaryQuantity), 0.1) : null,
                secondaryUnit: item.secondaryQuantity && item.secondaryQuantity !== '' ?
                    item.secondaryUnit : null,

                location: item.location || 'pantry',
                upc: item.upc || '',
                expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
                addedDate: new Date(),
                nutrition: item.nutrition || null,
                notes: item.notes || ''
            };

            validatedItems.push(validatedItem);
        });

        if (errors.length > 0) {
            return NextResponse.json(
                {
                    error: 'Validation errors found',
                    details: errors
                },
                { status: 400 }
            );
        }

        // Add all validated items to inventory
        inventory.items.push(...validatedItems);
        inventory.lastUpdated = new Date();

        await inventory.save();

        // Update user's usage tracking
        if (!user.usageTracking) {
            user.usageTracking = {};
        }
        user.usageTracking.totalInventoryItems = inventory.items.length;
        user.usageTracking.lastUpdated = new Date();
        await user.save();

        console.log(`Bulk add successful: ${validatedItems.length} items added from ${source || 'unknown source'}`);

        return NextResponse.json({
            success: true,
            itemsAdded: validatedItems.length,
            source: source || 'bulk-add',
            message: `Successfully added ${validatedItems.length} items to your inventory`,
            summary: {
                totalItems: validatedItems.length,
                categories: [...new Set(validatedItems.map(item => item.category))],
                locations: [...new Set(validatedItems.map(item => item.location))],
                source: source || 'bulk-add'
            },
            remainingItems: userSubscription.tier === 'free' ?
                Math.max(0, 50 - inventory.items.length) :
                userSubscription.tier === 'gold' ?
                    Math.max(0, 250 - inventory.items.length) : 'Unlimited'
        });

    } catch (error) {
        console.error('POST bulk-add inventory error:', error);
        return NextResponse.json(
            {
                error: 'Failed to add items to inventory',
                details: error.message
            },
            { status: 500 }
        );
    }
}