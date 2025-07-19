// =============================================================================
// file: /src/app/api/shopping/budget-settings/route.js
import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';

export async function POST(request) {
    try {
        const session = await getEnhancedSession(auth);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { budget, settings } = await request.json();
        const { db } = await connectDB();

        const budgetSettings = {
            userId: session.user.id,
            budget,
            settings,
            updatedAt: new Date()
        };

        await db.collection('budget_settings').updateOne(
            { userId: session.user.id },
            { $set: budgetSettings },
            { upsert: true }
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error saving budget settings:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const session = await getEnhancedSession(auth);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { db } = await connectDB();
        const settings = await db.collection('budget_settings').findOne({ userId: session.user.id });

        return NextResponse.json({ settings: settings || {} });

    } catch (error) {
        console.error('Error fetching budget settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

