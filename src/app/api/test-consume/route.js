// file: /src/app/api/test-consume/route.js - Simple test route to debug consumption

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory } from '@/lib/models';

export async function POST(request) {
    console.log('=== TEST CONSUME API CALLED ===');

    try {
        const session = await getServerSession(authOptions);
        console.log('Session:', session?.user?.id ? 'Found' : 'Not found');

        if (!session?.user?.id) {
            console.log('No session - returning 401');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        console.log('Request body received:', JSON.stringify(body, null, 2));

        await connectDB();
        console.log('Connected to DB');

        const inventory = await UserInventory.findOne({ userId: session.user.id });
        console.log('Inventory found:', inventory ? 'Yes' : 'No');

        if (!inventory) {
            console.log('No inventory found for user');
            return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
        }

        console.log('Current consumptionHistory length:', inventory.consumptionHistory?.length || 0);
        console.log('Current items count:', inventory.items?.length || 0);

        // Initialize consumptionHistory if it doesn't exist
        if (!inventory.consumptionHistory) {
            console.log('Initializing consumptionHistory array');
            inventory.consumptionHistory = [];
        }

        // Add a test consumption log
        const testLog = {
            itemId: 'test-id',
            itemName: 'Test Item',
            quantityConsumed: 1,
            unitConsumed: 'test',
            reason: 'test',
            notes: 'Test consumption from debug API',
            dateConsumed: new Date(),
            remainingQuantity: 0
        };

        console.log('Adding test log:', testLog);
        inventory.consumptionHistory.push(testLog);

        console.log('Marking consumptionHistory as modified');
        inventory.markModified('consumptionHistory');

        console.log('Saving inventory...');
        await inventory.save();

        console.log('Inventory saved successfully');
        console.log('New consumptionHistory length:', inventory.consumptionHistory.length);

        return NextResponse.json({
            success: true,
            message: 'Test consumption added',
            historyLength: inventory.consumptionHistory.length,
            testLog: testLog
        });

    } catch (error) {
        console.error('Test consume error:', error);
        return NextResponse.json(
            { error: 'Test failed: ' + error.message },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    console.log('=== TEST GET CONSUME HISTORY ===');

    try {
        const session = await getServerSession(authOptions);
        console.log('Session for GET:', session?.user?.id ? 'Found' : 'Not found');

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const inventory = await UserInventory.findOne({ userId: session.user.id });

        console.log('Inventory found for GET:', inventory ? 'Yes' : 'No');
        console.log('ConsumptionHistory length:', inventory?.consumptionHistory?.length || 0);

        if (inventory?.consumptionHistory?.length > 0) {
            console.log('Sample history record:', JSON.stringify(inventory.consumptionHistory[0], null, 2));
        }

        return NextResponse.json({
            success: true,
            historyLength: inventory?.consumptionHistory?.length || 0,
            history: inventory?.consumptionHistory || []
        });

    } catch (error) {
        console.error('Test GET error:', error);
        return NextResponse.json(
            { error: 'Test GET failed: ' + error.message },
            { status: 500 }
        );
    }
}