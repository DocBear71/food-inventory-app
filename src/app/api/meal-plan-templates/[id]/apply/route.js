// file: /src/app/api/meal-plan-templates/[id]/apply/route.js v1

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { MealPlanTemplate, MealPlan } from '@/lib/models';

// POST - Apply template to a meal plan
export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: templateId } = params;
        const { mealPlanId, weekStartDate, mergeMeals = false } = await request.json();

        if (!mealPlanId) {
            return NextResponse.json({
                error: 'Meal plan ID is required'
            }, { status: 400 });
        }

        await connectDB();

        // Fetch template
        const template = await MealPlanTemplate.findById(templateId)
            .populate('templateMeals.monday.recipeId templateMeals.tuesday.recipeId templateMeals.wednesday.recipeId templateMeals.thursday.recipeId templateMeals.friday.recipeId templateMeals.saturday.recipeId templateMeals.sunday.recipeId');

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        // Check access permissions
        if (!template.isPublic && template.userId.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Fetch target meal plan
        const mealPlan = await MealPlan.findOne({
            _id: mealPlanId,
            userId: session.user.id
        });

        if (!mealPlan) {
            return NextResponse.json({
                error: 'Meal plan not found'
            }, { status: 404 });
        }

        // Prepare meals to apply
        const newMeals = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
        };

        // Copy template meals to new meal plan structure
        Object.keys(newMeals).forEach(day => {
            if (template.templateMeals[day]) {
                newMeals[day] = template.templateMeals[day].map(templateMeal => ({
                    recipeId: templateMeal.recipeId._id || templateMeal.recipeId,
                    recipeName: templateMeal.recipeName,
                    mealType: templateMeal.mealType,
                    servings: templateMeal.servings || 4,
                    notes: templateMeal.notes || '',
                    prepTime: templateMeal.prepTime || 0,
                    cookTime: templateMeal.cookTime || 0,
                    createdAt: new Date()
                }));
            }
        });

        // Apply meals to meal plan
        if (mergeMeals) {
            // Merge with existing meals
            Object.keys(newMeals).forEach(day => {
                mealPlan.meals[day] = [
                    ...(mealPlan.meals[day] || []),
                    ...newMeals[day]
                ];
            });
        } else {
            // Replace existing meals
            mealPlan.meals = newMeals;
        }

        // Update meal plan dates if provided
        if (weekStartDate) {
            mealPlan.weekStartDate = new Date(weekStartDate);
        }

        mealPlan.updatedAt = new Date();
        await mealPlan.save();

        // Update template usage statistics
        template.timesUsed += 1;
        await template.save();

        console.log('Template applied to meal plan:', {
            templateId: template._id,
            templateName: template.name,
            mealPlanId: mealPlan._id,
            mergeMeals,
            totalMeals: Object.values(newMeals).reduce((total, dayMeals) => total + dayMeals.length, 0)
        });

        return NextResponse.json({
            success: true,
            mealPlan,
            template: {
                id: template._id,
                name: template.name,
                timesUsed: template.timesUsed
            },
            mealsApplied: Object.values(newMeals).reduce((total, dayMeals) => total + dayMeals.length, 0),
            message: `Template "${template.name}" applied successfully`
        });

    } catch (error) {
        console.error('Error applying template:', error);
        return NextResponse.json({
            error: 'Failed to apply template',
            details: error.message
        }, { status: 500 });
    }
}

// GET - Preview template application (without saving)
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: templateId } = params;

        await connectDB();

        // Fetch template
        const template = await MealPlanTemplate.findById(templateId)
            .populate('templateMeals.monday.recipeId templateMeals.tuesday.recipeId templateMeals.wednesday.recipeId templateMeals.thursday.recipeId templateMeals.friday.recipeId templateMeals.saturday.recipeId templateMeals.sunday.recipeId')
            .populate('userId', 'name');

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        // Check access permissions
        if (!template.isPublic && template.userId._id.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Calculate template statistics
        const mealCounts = {};
        let totalMeals = 0;
        const recipesUsed = new Set();

        Object.keys(template.templateMeals).forEach(day => {
            const dayMeals = template.templateMeals[day] || [];
            mealCounts[day] = dayMeals.length;
            totalMeals += dayMeals.length;

            dayMeals.forEach(meal => {
                if (meal.recipeId) {
                    recipesUsed.add(meal.recipeId._id || meal.recipeId);
                }
            });
        });

        return NextResponse.json({
            success: true,
            template,
            preview: {
                totalMeals,
                mealCounts,
                uniqueRecipes: recipesUsed.size,
                estimatedPrepTime: Object.values(template.templateMeals)
                    .flat()
                    .reduce((total, meal) => total + (meal.prepTime || 0) + (meal.cookTime || 0), 0)
            }
        });

    } catch (error) {
        console.error('Error previewing template:', error);
        return NextResponse.json({
            error: 'Failed to preview template'
        }, { status: 500 });
    }
}