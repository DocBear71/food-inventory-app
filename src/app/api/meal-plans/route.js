// file: /src/app/api/meal-plans/route.js v1

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { MealPlan, Recipe, UserInventory } from '@/lib/models';

// GET - Fetch user's meal plans
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const weekStart = searchParams.get('weekStart');
        const active = searchParams.get('active') !== 'false';

        await connectDB();

        let query = { userId: session.user.id };

        if (weekStart) {
            query.weekStartDate = new Date(weekStart);
        }

        if (active) {
            query.isActive = true;
        }

        const mealPlans = await MealPlan.find(query)
            .populate('meals.monday.recipeId', 'title prepTime cookTime difficulty')
            .populate('meals.tuesday.recipeId', 'title prepTime cookTime difficulty')
            .populate('meals.wednesday.recipeId', 'title prepTime cookTime difficulty')
            .populate('meals.thursday.recipeId', 'title prepTime cookTime difficulty')
            .populate('meals.friday.recipeId', 'title prepTime cookTime difficulty')
            .populate('meals.saturday.recipeId', 'title prepTime cookTime difficulty')
            .populate('meals.sunday.recipeId', 'title prepTime cookTime difficulty')
            .sort({ weekStartDate: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            mealPlans
        });

    } catch (error) {
        console.error('GET meal plans error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch meal plans' },
            { status: 500 }
        );
    }
}

// POST - Create a new meal plan
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { name, description, weekStartDate, preferences } = body;

        if (!name || !weekStartDate) {
            return NextResponse.json(
                { error: 'Name and week start date are required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Check if meal plan already exists for this week
        const existingPlan = await MealPlan.findOne({
            userId: session.user.id,
            weekStartDate: new Date(weekStartDate)
        });

        if (existingPlan) {
            return NextResponse.json(
                { error: 'Meal plan already exists for this week' },
                { status: 400 }
            );
        }

        // Create new meal plan
        const mealPlan = new MealPlan({
            userId: session.user.id,
            name,
            description: description || '',
            weekStartDate: new Date(weekStartDate),
            preferences: preferences || {},
            meals: {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: []
            }
        });

        await mealPlan.save();

        return NextResponse.json({
            success: true,
            mealPlan,
            message: 'Meal plan created successfully'
        });

    } catch (error) {
        console.error('POST meal plan error:', error);
        return NextResponse.json(
            { error: 'Failed to create meal plan' },
            { status: 500 }
        );
    }
}

// PUT - Update meal plan
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
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

        return NextResponse.json({
            success: true,
            mealPlan,
            message: 'Meal plan updated successfully'
        });

    } catch (error) {
        console.error('PUT meal plan error:', error);
        return NextResponse.json(
            { error: 'Failed to update meal plan' },
            { status: 500 }
        );
    }
}

// DELETE - Delete meal plan
export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);

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