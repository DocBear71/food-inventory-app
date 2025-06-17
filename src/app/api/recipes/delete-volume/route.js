// file: /src/app/api/recipes/delete-volume/route.js - v1

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

export async function DELETE(request) {
    try {
        console.log('=== DELETE /api/recipes/delete-volume START ===');

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get volume parameter from URL
        const { searchParams } = new URL(request.url);
        const volume = searchParams.get('volume');

        if (!volume) {
            console.log('No volume parameter provided');
            return NextResponse.json(
                { error: 'Volume parameter is required' },
                { status: 400 }
            );
        }

        console.log(`Attempting to delete all recipes from Volume ${volume} for user ${session.user.id}`);

        await connectDB();
        console.log('Database connected successfully');

        // Find all recipes that match the volume criteria
        // We'll look for recipes that have the volume in their source or tags
        const deleteQuery = {
            createdBy: session.user.id,
            $or: [
                { source: { $regex: `Volume ${volume}`, $options: 'i' } },
                { tags: `volume-${volume}` },
                { tags: { $regex: `volume.${volume}`, $options: 'i' } }
            ]
        };

        console.log('Delete query:', JSON.stringify(deleteQuery, null, 2));

        // First, count how many recipes will be deleted
        const recipesToDelete = await Recipe.countDocuments(deleteQuery);
        console.log(`Found ${recipesToDelete} recipes to delete`);

        if (recipesToDelete === 0) {
            return NextResponse.json({
                success: true,
                deletedCount: 0,
                message: `No recipes found for Volume ${volume}`
            });
        }

        // Delete the recipes
        const deleteResult = await Recipe.deleteMany(deleteQuery);
        console.log('Delete result:', deleteResult);

        return NextResponse.json({
            success: true,
            deletedCount: deleteResult.deletedCount,
            message: `Successfully deleted ${deleteResult.deletedCount} recipes from Volume ${volume}`
        });

    } catch (error) {
        console.error('=== DELETE volume error ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('========================');

        return NextResponse.json(
            {
                error: 'Failed to delete recipes',
                details: error.message,
                type: error.name
            },
            { status: 500 }
        );
    }
}