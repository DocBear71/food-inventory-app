// file: /src/app/api/inventory/bulk-add/route.js - v1

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory } from '@/lib/models';

// POST - Bulk add items to inventory
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

        // Validate each item
        const validatedItems = [];
        const errors = [];

        items.forEach((item, index) => {
            if (!item.name || item.name.trim() === '') {
                errors.push(`Item ${index + 1}: Name is required`);
                return;
            }

            // Create validated item with defaults
            const validatedItem = {
                name: item.name.trim(),
                brand: item.brand || '',
                category: item.category || 'Other',
                quantity: Math.max(item.quantity || 1, 0.1), // Ensure positive quantity
                unit: item.unit || 'item',
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

        await connectDB();

        let inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            inventory = new UserInventory({
                userId: session.user.id,
                items: []
            });
        }

        // Add all validated items to inventory
        inventory.items.push(...validatedItems);
        inventory.lastUpdated = new Date();

        await inventory.save();

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
            }
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