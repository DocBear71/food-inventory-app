// file: /src/app/api/meal-plans/[id]/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import connectDB from '@/lib/mongodb';
import { MealPlan } from '@/lib/models';

// GET - Fetch a single meal plan
export async function GET(request, { params }) {
    try {
        const session = await auth();
        const resolvedParams = await params;
        const { id } = resolvedParams;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        await connectDB();

        const mealPlan = await MealPlan.findOne({
            _id: id,
            userId: session.user.id
        });

        if (!mealPlan) {
            return NextResponse.json(
                { error: 'Meal plan not found' },
                { status: 404 }
            );
        }

        // Track view
        mealPlan.metrics = mealPlan.metrics || {};
        mealPlan.metrics.lastViewed = new Date();
        mealPlan.metrics.viewCount = (mealPlan.metrics.viewCount || 0) + 1;

        await mealPlan.save();

        return NextResponse.json({
            success: true,
            mealPlan
        });

    } catch (error) {
        console.error('GET meal plan error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch meal plan' },
            { status: 500 }
        );
    }
}

// PUT - Update a meal plan
export async function PUT(request, { params }) {
    try {
        console.log('=== PUT /api/meal-plans/[id] START ===');

        const session = await auth();
        const resolvedParams = await params;
        const { id } = resolvedParams;

        console.log('Meal plan ID:', id);
        console.log('User ID:', session?.user?.id);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        console.log('Update data:', body);

        await connectDB();

        const mealPlan = await MealPlan.findOne({
            _id: id,
            userId: session.user.id
        });

        if (!mealPlan) {
            console.log('Meal plan not found for ID:', id);
            return NextResponse.json(
                { error: 'Meal plan not found' },
                { status: 404 }
            );
        }

        // Update the meal plan with the provided data
        Object.keys(body).forEach(key => {
            if (key !== '_id' && key !== 'userId' && key !== 'createdAt') {
                mealPlan[key] = body[key];
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
            { error: 'Failed to update meal plan', details: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete a meal plan
export async function DELETE(request, { params }) {
    try {
        const session = await auth();
        const resolvedParams = await params;
        const { id } = resolvedParams;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        await connectDB();

        const mealPlan = await MealPlan.findOneAndDelete({
            _id: id,
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