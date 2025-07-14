// file: /src/app/api/meal-plan-templates/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import connectDB from '@/lib/mongodb';
import { MealPlanTemplate, MealPlan } from '@/lib/models';

// GET - Fetch user's meal plan templates
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const isPublic = searchParams.get('public') === 'true';
        const limit = parseInt(searchParams.get('limit')) || 20;

        await connectDB();

        let query = {};

        if (isPublic) {
            // Fetch public templates from all users
            query.isPublic = true;
        } else {
            // Fetch user's own templates
            query.userId = session.user.id;
        }

        if (category && category !== 'all') {
            query.category = category;
        }

        const templates = await MealPlanTemplate.find(query)
            .populate('userId', 'name')
            .sort({ timesUsed: -1, createdAt: -1 })
            .limit(limit);

        return NextResponse.json({
            success: true,
            templates
        });

    } catch (error) {
        console.error('Error fetching meal plan templates:', error);
        return NextResponse.json({
            error: 'Failed to fetch templates'
        }, { status: 500 });
    }
}

// POST - Create new meal plan template
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mealPlanId, name, description, category, isPublic } = await request.json();

        if (!mealPlanId || !name) {
            return NextResponse.json({
                error: 'Meal plan ID and name are required'
            }, { status: 400 });
        }

        await connectDB();

        // Fetch the source meal plan
        const sourceMealPlan = await MealPlan.findOne({
            _id: mealPlanId,
            userId: session.user.id
        }).populate('meals.monday.recipeId meals.tuesday.recipeId meals.wednesday.recipeId meals.thursday.recipeId meals.friday.recipeId meals.saturday.recipeId meals.sunday.recipeId');

        if (!sourceMealPlan) {
            return NextResponse.json({
                error: 'Meal plan not found'
            }, { status: 404 });
        }

        // Create template from meal plan
        const templateMeals = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
        };

        // Copy meals structure (without specific dates)
        Object.keys(templateMeals).forEach(day => {
            if (sourceMealPlan.meals[day]) {
                templateMeals[day] = sourceMealPlan.meals[day].map(meal => ({
                    recipeId: meal.recipeId._id || meal.recipeId,
                    recipeName: meal.recipeName,
                    mealType: meal.mealType,
                    servings: meal.servings,
                    notes: meal.notes || '',
                    prepTime: meal.prepTime || 0,
                    cookTime: meal.cookTime || 0
                }));
            }
        });

        const template = new MealPlanTemplate({
            userId: session.user.id,
            name: name.trim(),
            description: description?.trim() || '',
            category: category || 'custom',
            templateMeals,
            isPublic: Boolean(isPublic),
            timesUsed: 0,
            rating: 0
        });

        await template.save();

        console.log('Meal plan template created:', {
            templateId: template._id,
            name: template.name,
            category: template.category,
            isPublic: template.isPublic
        });

        return NextResponse.json({
            success: true,
            template,
            message: 'Template created successfully'
        });

    } catch (error) {
        console.error('Error creating meal plan template:', error);
        return NextResponse.json({
            error: 'Failed to create template',
            details: error.message
        }, { status: 500 });
    }
}