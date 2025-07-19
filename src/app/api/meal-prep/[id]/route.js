// file: /src/app/api/meal-prep/[id]/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { MealPrepSuggestion } from '@/lib/models';

// GET - Fetch specific meal prep suggestion
export async function GET(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        await connectDB();

        const suggestion = await MealPrepSuggestion.findOne({
            _id: id,
            userId: session.user.id
        }).populate('mealPlanId', 'name weekStartDate');

        if (!suggestion) {
            return NextResponse.json({ error: 'Meal prep suggestion not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            suggestion
        });

    } catch (error) {
        console.error('Error fetching meal prep suggestion:', error);
        return NextResponse.json({ error: 'Failed to fetch suggestion' }, { status: 500 });
    }
}

// PUT - Update meal prep suggestion (mark tasks complete, add feedback, etc.)
export async function PUT(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const updates = await request.json();

        await connectDB();

        const suggestion = await MealPrepSuggestion.findOne({
            _id: id,
            userId: session.user.id
        });

        if (!suggestion) {
            return NextResponse.json({ error: 'Meal prep suggestion not found' }, { status: 404 });
        }

        // Handle different types of updates
        if (updates.action === 'markTaskComplete') {
            await suggestion.markTaskCompleted(updates.taskId);
        } else if (updates.action === 'addFeedback') {
            await suggestion.addFeedback(updates.feedback);
        } else if (updates.action === 'updatePreferences') {
            suggestion.preferences = {
                ...suggestion.preferences,
                ...updates.preferences
            };
            await suggestion.save();
        } else if (updates.action === 'updateStatus') {
            suggestion.status = updates.status;
            if (updates.actualTimeSpent) {
                suggestion.implementation.actualTimeSpent = updates.actualTimeSpent;
            }
            await suggestion.save();
        } else {
            // General update
            Object.keys(updates).forEach(key => {
                if (key !== 'action' && suggestion.schema.paths[key]) {
                    suggestion[key] = updates[key];
                }
            });
            await suggestion.save();
        }

        return NextResponse.json({
            success: true,
            suggestion,
            message: 'Meal prep suggestion updated successfully'
        });

    } catch (error) {
        console.error('Error updating meal prep suggestion:', error);
        return NextResponse.json({
            error: 'Failed to update suggestion',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Delete meal prep suggestion
export async function DELETE(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        await connectDB();

        const result = await MealPrepSuggestion.deleteOne({
            _id: id,
            userId: session.user.id
        });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Meal prep suggestion not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Meal prep suggestion deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting meal prep suggestion:', error);
        return NextResponse.json({ error: 'Failed to delete suggestion' }, { status: 500 });
    }
}