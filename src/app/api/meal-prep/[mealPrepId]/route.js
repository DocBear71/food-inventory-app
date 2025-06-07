// file: /src/app/api/meal-prep/[mealPrepId]/route.js v1

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { MealPrepSuggestion } from '@/lib/models';

// GET - Fetch specific meal prep suggestion
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mealPrepId } = params;

        await connectDB();

        const suggestion = await MealPrepSuggestion.findOne({
            _id: mealPrepId,
            userId: session.user.id
        }).populate('mealPlanId');

        if (!suggestion) {
            return NextResponse.json({ error: 'Meal prep suggestion not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            suggestion
        });

    } catch (error) {
        console.error('Error fetching meal prep suggestion:', error);
        return NextResponse.json({
            error: 'Failed to fetch meal prep suggestion',
            details: error.message
        }, { status: 500 });
    }
}

// PUT - Update meal prep suggestion (mark tasks complete, update preferences, etc.)
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mealPrepId } = params;
        const { action, taskId, ...updateData } = await request.json();

        await connectDB();

        const suggestion = await MealPrepSuggestion.findOne({
            _id: mealPrepId,
            userId: session.user.id
        });

        if (!suggestion) {
            return NextResponse.json({ error: 'Meal prep suggestion not found' }, { status: 404 });
        }

        // Handle different actions
        switch (action) {
            case 'markTaskComplete':
                if (!taskId) {
                    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
                }

                // Initialize implementation object if it doesn't exist
                if (!suggestion.implementation) {
                    suggestion.implementation = {
                        tasksCompleted: [],
                        completionRate: 0,
                        lastUpdated: new Date()
                    };
                }

                // Add task to completed list if not already there
                if (!suggestion.implementation.tasksCompleted.includes(taskId)) {
                    suggestion.implementation.tasksCompleted.push(taskId);
                }

                // Calculate total tasks and completion rate
                const totalTasks = calculateTotalTasks(suggestion);
                const completedCount = suggestion.implementation.tasksCompleted.length;
                suggestion.implementation.completionRate = Math.round((completedCount / totalTasks) * 100);
                suggestion.implementation.lastUpdated = new Date();

                break;

            case 'markTaskIncomplete':
                if (!taskId) {
                    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
                }

                if (suggestion.implementation && suggestion.implementation.tasksCompleted) {
                    suggestion.implementation.tasksCompleted = suggestion.implementation.tasksCompleted.filter(id => id !== taskId);

                    // Recalculate completion rate
                    const totalTasks = calculateTotalTasks(suggestion);
                    const completedCount = suggestion.implementation.tasksCompleted.length;
                    suggestion.implementation.completionRate = Math.round((completedCount / totalTasks) * 100);
                    suggestion.implementation.lastUpdated = new Date();
                }

                break;

            case 'updatePreferences':
                if (updateData.userPreferences) {
                    suggestion.userPreferences = {
                        ...suggestion.userPreferences,
                        ...updateData.userPreferences
                    };
                }
                break;

            case 'addNote':
                if (!suggestion.implementation) {
                    suggestion.implementation = {
                        tasksCompleted: [],
                        completionRate: 0,
                        notes: [],
                        lastUpdated: new Date()
                    };
                }

                if (!suggestion.implementation.notes) {
                    suggestion.implementation.notes = [];
                }

                suggestion.implementation.notes.push({
                    text: updateData.note,
                    createdAt: new Date()
                });

                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        suggestion.updatedAt = new Date();
        await suggestion.save();

        console.log('Meal prep suggestion updated:', {
            mealPrepId,
            action,
            taskId,
            completionRate: suggestion.implementation?.completionRate
        });

        return NextResponse.json({
            success: true,
            suggestion,
            message: 'Meal prep suggestion updated successfully'
        });

    } catch (error) {
        console.error('Error updating meal prep suggestion:', error);
        return NextResponse.json({
            error: 'Failed to update meal prep suggestion',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Delete meal prep suggestion
export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mealPrepId } = params;

        await connectDB();

        const result = await MealPrepSuggestion.deleteOne({
            _id: mealPrepId,
            userId: session.user.id
        });

        if (result.deletedCount === 0) {
            return NextResponse.json({
                error: 'Meal prep suggestion not found or access denied'
            }, { status: 404 });
        }

        console.log('Meal prep suggestion deleted:', { mealPrepId });

        return NextResponse.json({
            success: true,
            message: 'Meal prep suggestion deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting meal prep suggestion:', error);
        return NextResponse.json({
            error: 'Failed to delete meal prep suggestion'
        }, { status: 500 });
    }
}

// Helper function to calculate total tasks in a meal prep suggestion
function calculateTotalTasks(suggestion) {
    let totalTasks = 0;

    // Count batch cooking suggestions
    if (suggestion.batchCookingSuggestions) {
        totalTasks += suggestion.batchCookingSuggestions.length;
    }

    // Count ingredient prep suggestions
    if (suggestion.ingredientPrepSuggestions) {
        totalTasks += suggestion.ingredientPrepSuggestions.length;
    }

    // Count schedule tasks
    if (suggestion.prepSchedule) {
        suggestion.prepSchedule.forEach(daySchedule => {
            if (daySchedule.tasks) {
                totalTasks += daySchedule.tasks.length;
            }
        });
    }

    return totalTasks;
}