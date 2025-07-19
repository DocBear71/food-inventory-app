// file: /src/app/api/nutrition/goals/route.js v2 - Enhanced to sync with profile

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

// GET - Fetch user's nutrition goals
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const user = await User.findById(session.user.id).select('nutritionGoals');

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Return default goals if none exist
        const defaultGoals = {
            dailyCalories: 2000,
            protein: 150,
            fat: 65,
            carbs: 250,
            fiber: 25,
            sodium: 2300
        };

        return NextResponse.json({
            success: true,
            goals: user.nutritionGoals || defaultGoals
        });

    } catch (error) {
        console.error('Error fetching nutrition goals:', error);
        return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
    }
}

// POST - Update user's nutrition goals (compatible with NutritionGoalsTracking component)
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const updates = await request.json();
        console.log('Updating nutrition goals via POST:', updates);

        // Validate input
        const validFields = ['dailyCalories', 'protein', 'fat', 'carbs', 'fiber', 'sodium'];
        const filteredUpdates = {};

        Object.keys(updates).forEach(key => {
            if (validFields.includes(key) && typeof updates[key] === 'number' && updates[key] >= 0) {
                filteredUpdates[key] = updates[key];
            }
        });

        if (Object.keys(filteredUpdates).length === 0) {
            return NextResponse.json({
                error: 'No valid nutrition goals provided'
            }, { status: 400 });
        }

        await connectDB();

        // Update the user's nutritionGoals object
        const user = await User.findByIdAndUpdate(
            session.user.id,
            {
                $set: Object.keys(filteredUpdates).reduce((acc, key) => {
                    acc[`nutritionGoals.${key}`] = filteredUpdates[key];
                    return acc;
                }, {}),
                updatedAt: new Date()
            },
            { new: true }
        ).select('nutritionGoals');

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log('Nutrition goals updated successfully:', {
            userId: session.user.id,
            updates: filteredUpdates,
            newGoals: user.nutritionGoals
        });

        return NextResponse.json({
            success: true,
            goals: user.nutritionGoals,
            message: 'Nutrition goals updated successfully'
        });

    } catch (error) {
        console.error('Error updating nutrition goals:', error);
        return NextResponse.json({
            error: 'Failed to update goals',
            details: error.message
        }, { status: 500 });
    }
}

// PUT - Update user's nutrition goals (same as POST for compatibility)
export async function PUT(request) {
    return POST(request);
}

// DELETE - Reset nutrition goals to defaults
export async function DELETE(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const defaultGoals = {
            dailyCalories: 2000,
            protein: 150,
            fat: 65,
            carbs: 250,
            fiber: 25,
            sodium: 2300
        };

        const user = await User.findByIdAndUpdate(
            session.user.id,
            {
                nutritionGoals: defaultGoals,
                updatedAt: new Date()
            },
            { new: true }
        ).select('nutritionGoals');

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log('Nutrition goals reset to defaults:', {
            userId: session.user.id
        });

        return NextResponse.json({
            success: true,
            goals: user.nutritionGoals,
            message: 'Nutrition goals reset to defaults'
        });

    } catch (error) {
        console.error('Error resetting nutrition goals:', error);
        return NextResponse.json({
            error: 'Failed to reset goals',
            details: error.message
        }, { status: 500 });
    }
}