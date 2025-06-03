// file: /src/app/api/inventory/route.js

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { UserInventory } from '@/lib/models';

// GET - Fetch user's inventory
export async function GET(request) {
    try {
        const session = await getServerSession();

        if (!session?.user?.id) {
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

// POST - Add item to inventory
export async function POST(request) {
    try {
        const session = await getServerSession();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, brand, category, quantity, unit, location, upc, expirationDate } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'Item name is required' },
                { status: 400 }
            );
        }

        await connectDB();

        let inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            inventory = new UserInventory({
                userId: session.user.id,
                items: []
            });
        }

        const newItem = {
            name,
            brand: brand || '',
            category: category || '',
            quantity: quantity || 1,
            unit: unit || 'item',
            location: location || 'pantry',
            upc: upc || '',
            expirationDate: expirationDate ? new Date(expirationDate) : null,
            addedDate: new Date()
        };

        inventory.items.push(newItem);
        inventory.lastUpdated = new Date();

        await inventory.save();

        return NextResponse.json({
            success: true,
            item: newItem,
            message: 'Item added successfully'
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
        const session = await getServerSession();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { itemId, ...updateData } = body;

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

        // Update the item
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                inventory.items[itemIndex][key] = updateData[key];
            }
        });

        inventory.lastUpdated = new Date();
        await inventory.save();

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
        const session = await getServerSession();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('itemId');

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