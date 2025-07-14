// file: /src/app/api/nutrition/goals/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
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

        return NextResponse.json({
            success: true,
            goals: user.nutritionGoals
        });

    } catch (error) {
        console.error('Error fetching nutrition goals:', error);
        return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
    }
}

// PUT - Update user's nutrition goals
export async function PUT(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const updates = await request.json();

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

        console.log('Nutrition goals updated:', {
            userId: session.user.id,
            updates: filteredUpdates
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

// POST - Reset nutrition goals to defaults
export async function POST(request) {
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