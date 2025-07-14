// file: /src/app/api/meal-plan-templates/[id]/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import connectDB from '@/lib/mongodb';
import { MealPlanTemplate, MealPlan } from '@/lib/models';

// GET - Fetch specific template
export async function GET(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        await connectDB();

        const template = await MealPlanTemplate.findById(id)
            .populate('userId', 'name')
            .populate('templateMeals.monday.recipeId templateMeals.tuesday.recipeId templateMeals.wednesday.recipeId templateMeals.thursday.recipeId templateMeals.friday.recipeId templateMeals.saturday.recipeId templateMeals.sunday.recipeId');

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        // Check access permissions
        if (!template.isPublic && template.userId._id.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            template
        });

    } catch (error) {
        console.error('Error fetching template:', error);
        return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
    }
}

// PUT - Update template
export async function PUT(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const updates = await request.json();

        await connectDB();

        // Find template and verify ownership
        const template = await MealPlanTemplate.findOne({
            _id: id,
            userId: session.user.id
        });

        if (!template) {
            return NextResponse.json({
                error: 'Template not found or access denied'
            }, { status: 404 });
        }

        // Update allowed fields
        const allowedUpdates = ['name', 'description', 'category', 'isPublic'];
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                template[key] = updates[key];
            }
        });

        template.updatedAt = new Date();
        await template.save();

        console.log('Template updated:', {
            templateId: template._id,
            updates: Object.keys(updates)
        });

        return NextResponse.json({
            success: true,
            template,
            message: 'Template updated successfully'
        });

    } catch (error) {
        console.error('Error updating template:', error);
        return NextResponse.json({
            error: 'Failed to update template',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Delete template
export async function DELETE(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        await connectDB();

        const result = await MealPlanTemplate.deleteOne({
            _id: id,
            userId: session.user.id
        });

        if (result.deletedCount === 0) {
            return NextResponse.json({
                error: 'Template not found or access denied'
            }, { status: 404 });
        }

        console.log('Template deleted:', { templateId: id });

        return NextResponse.json({
            success: true,
            message: 'Template deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting template:', error);
        return NextResponse.json({
            error: 'Failed to delete template'
        }, { status: 500 });
    }
}