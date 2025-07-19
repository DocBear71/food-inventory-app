// file: /src/app/api/meal-plans/route.js - v2

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { MealPlan, Recipe } from '@/lib/models';

// GET - Fetch user's meal plans
export async function GET(request) {
    try {
        console.log('=== GET /api/meal-plans START ===');

        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const weekStart = searchParams.get('weekStart');
        const active = searchParams.get('active') !== 'false';

        console.log('Week start:', weekStart);
        console.log('User ID:', session.user.id);

        await connectDB();

        let query = { userId: session.user.id };

        if (weekStart) {
            // Create date range for the entire week
            const weekStartDate = new Date(weekStart);
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekEndDate.getDate() + 6);
            weekEndDate.setHours(23, 59, 59, 999);

            console.log('Searching for meal plans between:', weekStartDate, 'and', weekEndDate);

            query.weekStartDate = {
                $gte: weekStartDate,
                $lte: weekEndDate
            };
        }

        if (active) {
            query.isActive = true;
        }

        console.log('Query:', query);

        const mealPlans = await MealPlan.find(query)
            .sort({ weekStartDate: -1 })
            .lean();

        console.log('Found meal plans:', mealPlans.length);

        return NextResponse.json({
            success: true,
            mealPlans
        });

    } catch (error) {
        console.error('=== GET meal plans error ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        return NextResponse.json(
            { error: 'Failed to fetch meal plans' },
            { status: 500 }
        );
    }
}

// POST - Create a new meal plan
export async function POST(request) {
    try {
        console.log('=== POST /api/meal-plans START ===');

        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        console.log('Request body:', body);

        const { name, description, weekStartDate, preferences } = body;

        if (!name || !weekStartDate) {
            console.log('Validation failed - missing name or weekStartDate');
            return NextResponse.json(
                { error: 'Name and week start date are required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Parse the date properly and set to start of day
        const parsedWeekStart = new Date(weekStartDate);
        parsedWeekStart.setHours(0, 0, 0, 0);
        console.log('Parsed week start:', parsedWeekStart);

        // Check if meal plan already exists for this week (search by date range)
        const weekEndDate = new Date(parsedWeekStart);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        weekEndDate.setHours(23, 59, 59, 999);

        const existingPlan = await MealPlan.findOne({
            userId: session.user.id,
            weekStartDate: {
                $gte: parsedWeekStart,
                $lte: weekEndDate
            }
        });

        if (existingPlan) {
            console.log('Meal plan already exists for this week');
            return NextResponse.json({
                success: true,
                mealPlan: existingPlan,
                message: 'Meal plan already exists for this week'
            });
        }

        // Create new meal plan
        const mealPlanData = {
            userId: session.user.id,
            name,
            description: description || '',
            weekStartDate: parsedWeekStart,
            preferences: preferences || {
                defaultServings: 4,
                mealTypes: ['breakfast', 'lunch', 'dinner', 'snack']
            },
            meals: {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: []
            },
            shoppingList: {
                generated: false,
                items: []
            },
            mealPrep: {
                batchCookingSuggestions: [],
                prepDays: ['sunday']
            },
            weeklyNutrition: {
                totalCalories: 0,
                averageDailyCalories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0
            },
            isTemplate: false,
            isActive: true
        };

        console.log('Creating meal plan with data:', mealPlanData);

        const mealPlan = new MealPlan(mealPlanData);
        await mealPlan.save();

        console.log('Meal plan created successfully:', mealPlan._id);

        return NextResponse.json({
            success: true,
            mealPlan,
            message: 'Meal plan created successfully'
        });

    } catch (error) {
        console.error('=== POST meal plan error ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        return NextResponse.json(
            { error: 'Failed to create meal plan', details: error.message },
            { status: 500 }
        );
    }
}

// PUT - Update meal plan
export async function PUT(request) {
    try {
        console.log('=== PUT /api/meal-plans START ===');

        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        console.log('Update body:', body);

        const { mealPlanId, ...updates } = body;

        if (!mealPlanId) {
            return NextResponse.json(
                { error: 'Meal plan ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const mealPlan = await MealPlan.findOne({
            _id: mealPlanId,
            userId: session.user.id
        });

        if (!mealPlan) {
            return NextResponse.json(
                { error: 'Meal plan not found' },
                { status: 404 }
            );
        }

        // Update meal plan
        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                mealPlan[key] = updates[key];
            }
        });

        mealPlan.updatedAt = new Date();
        await mealPlan.save();

        console.log('Meal plan updated successfully');

        return NextResponse.json({
            success: true,
            mealPlan,
            message: 'Meal plan updated successfully'
        });

    } catch (error) {
        console.error('=== PUT meal plan error ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        return NextResponse.json(
            { error: 'Failed to update meal plan' },
            { status: 500 }
        );
    }
}

// DELETE - Delete meal plan
export async function DELETE(request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const mealPlanId = searchParams.get('mealPlanId');

        if (!mealPlanId) {
            return NextResponse.json(
                { error: 'Meal plan ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const mealPlan = await MealPlan.findOneAndDelete({
            _id: mealPlanId,
            userId: session.user.id
        });

        if (!mealPlan) {
            return NextResponse.json(
                { error: 'Meal plan not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Meal plan deleted successfully'
        });

    } catch (error) {
        console.error('DELETE meal plan error:', error);
        return NextResponse.json(
            { error: 'Failed to delete meal plan' },
            { status: 500 }
        );
    }
}