// file: /src/app/api/recipes/route.js - v3

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

// GET - Fetch user's recipes or a single recipe
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        console.log('GET /api/recipes - Session:', session);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        await connectDB();

        if (recipeId) {
            // Get single recipe
            const recipe = await Recipe.findOne({
                _id: recipeId,
                $or: [
                    { createdBy: session.user.id },
                    { isPublic: true }
                ]
            });

            if (!recipe) {
                return NextResponse.json(
                    { error: 'Recipe not found or access denied' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                recipe
            });
        } else {
            // Get user's recipes and public recipes
            const recipes = await Recipe.find({
                $or: [
                    { createdBy: session.user.id },
                    { isPublic: true }
                ]
            }).sort({ createdAt: -1 });

            return NextResponse.json({
                success: true,
                recipes
            });
        }

    } catch (error) {
        console.error('GET recipes error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch recipes' },
            { status: 500 }
        );
    }
}

// POST - Add new recipe
export async function POST(request) {
    try {
        console.log('=== POST /api/recipes START ===');

        const session = await getServerSession(authOptions);
        console.log('Session:', session);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        console.log('Request body:', JSON.stringify(body, null, 2));

        const {
            title,
            description,
            ingredients,
            instructions,
            cookTime,
            prepTime,
            servings,
            difficulty,
            tags,
            source,
            isPublic,
            nutrition // Make sure to extract nutrition from body
        } = body;

        if (!title || !ingredients || ingredients.length === 0) {
            console.log('Validation failed - missing title or ingredients');
            return NextResponse.json(
                { error: 'Recipe title and at least one ingredient are required' },
                { status: 400 }
            );
        }

        console.log('Connecting to database...');
        await connectDB();
        console.log('Database connected successfully');

        console.log('Nutrition data received:', nutrition);

        const recipeData = {
            title,
            description: description || '',
            ingredients: ingredients.filter(ing => ing.name && ing.name.trim() !== ''),
            instructions: instructions.filter(inst => inst && inst.trim() !== ''),
            cookTime: cookTime || null,
            prepTime: prepTime || null,
            servings: servings || null,
            difficulty: difficulty || 'medium',
            tags: tags || [],
            source: source || '',
            isPublic: isPublic || false,
            createdBy: session.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            // Include nutrition data if provided
            ...(nutrition && Object.keys(nutrition).length > 0 && {
                nutrition: nutrition,
                nutritionManuallySet: true,
                nutritionCalculatedAt: new Date()
            })
        };

        console.log('Creating recipe with data:', JSON.stringify(recipeData, null, 2));

        const recipe = new Recipe(recipeData);
        console.log('Recipe instance created, attempting to save...');

        await recipe.save();
        console.log('Recipe saved successfully:', recipe._id);
        console.log('Saved recipe nutrition:', recipe.nutrition);

        return NextResponse.json({
            success: true,
            recipe,
            message: 'Recipe added successfully'
        });

    } catch (error) {
        console.error('=== POST recipes error ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('========================');

        return NextResponse.json(
            {
                error: 'Failed to add recipe',
                details: error.message,
                type: error.name
            },
            { status: 500 }
        );
    }
}

// PUT - Update recipe
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { recipeId, ...updateData } = body;

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Find recipe and verify ownership
        const recipe = await Recipe.findOne({
            _id: recipeId,
            createdBy: session.user.id
        });

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found or you do not have permission to edit it' },
                { status: 404 }
            );
        }

        // Prepare update data
        const updateFields = {
            ...updateData,
            ingredients: updateData.ingredients?.filter(ing => ing.name && ing.name.trim() !== ''),
            instructions: updateData.instructions?.filter(inst => inst && inst.trim() !== ''),
            updatedAt: new Date()
        };

        // Handle nutrition data if provided
        if (updateData.nutrition && Object.keys(updateData.nutrition).length > 0) {
            updateFields.nutrition = updateData.nutrition;
            updateFields.nutritionManuallySet = true;
            updateFields.nutritionCalculatedAt = new Date();
        }

        // Update the recipe
        const updatedRecipe = await Recipe.findByIdAndUpdate(
            recipeId,
            updateFields,
            { new: true }
        );

        return NextResponse.json({
            success: true,
            recipe: updatedRecipe,
            message: 'Recipe updated successfully'
        });

    } catch (error) {
        console.error('PUT recipes error:', error);
        return NextResponse.json(
            { error: 'Failed to update recipe' },
            { status: 500 }
        );
    }
}

// DELETE - Remove recipe
export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Find and delete recipe (verify ownership)
        const recipe = await Recipe.findOneAndDelete({
            _id: recipeId,
            createdBy: session.user.id
        });

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found or you do not have permission to delete it' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Recipe deleted successfully'
        });

    } catch (error) {
        console.error('DELETE recipes error:', error);
        return NextResponse.json(
            { error: 'Failed to delete recipe' },
            { status: 500 }
        );
    }
}