// file: /src/app/api/shopping/saved/unarchive/route.js

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';

import dbConnect from '@/lib/mongodb';
import { SavedShoppingList } from '@/lib/models';

export async function PUT(request) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        await dbConnect();

        const { listIds } = await request.json();

        if (!listIds || !Array.isArray(listIds) || listIds.length === 0) {
            return NextResponse.json(
                { success: false, error: 'List IDs are required' },
                { status: 400 }
            );
        }

        // Verify all lists belong to the user and update them
        const result = await SavedShoppingList.updateMany(
            {
                _id: { $in: listIds },
                userId: session.user.id
            },
            {
                $set: {
                    isArchived: false,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, error: 'No lists found or access denied' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Successfully unarchived ${result.modifiedCount} list(s)`,
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error('Error unarchiving shopping lists:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to unarchive lists' },
            { status: 500 }
        );
    }
}