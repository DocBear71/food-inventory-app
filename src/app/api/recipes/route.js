// file: /src/app/api/recipes/route.js - v4 - Updated with user tracking

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, User } from '@/lib/models';

// GET - Fetch user's recipes or a single recipe
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        await connectDB();

        if (recipeId) {
            // Get single recipe with user information populated
            const recipe = await Recipe.findOne({
                _id: recipeId,
                $or: [
                    { createdBy: session.user.id },
                    { isPublic: true }
                ]
            })
                .populate('createdBy', 'name email') // Populate creator info
                .populate('lastEditedBy', 'name email'); // Populate last editor info

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
            // Get user's recipes and public recipes with user info
            const recipes = await Recipe.find({
                $or: [
                    { createdBy: session.user.id },
                    { isPublic: true }
                ]
            })
                .populate('createdBy', 'name email')
                .populate('lastEditedBy', 'name email')
                .sort({ createdAt: -1 });

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
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
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
            category,
            nutrition,
            importedFrom // ADD THIS for imported recipes
        } = body;

        if (!title || !ingredients || ingredients.length === 0) {
            return NextResponse.json(
                { error: 'Recipe title and at least one ingredient are required' },
                { status: 400 }
            );
        }

        await connectDB();

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
            category: category || 'entrees',
            createdBy: session.user.id, // Set creator
            lastEditedBy: session.user.id, // Set initial editor as creator
            importedFrom: importedFrom || null, // Track if imported
            createdAt: new Date(),
            updatedAt: new Date(),
            ...(nutrition && Object.keys(nutrition).length > 0 && {
                nutrition: nutrition,
                nutritionManuallySet: true,
                nutritionCalculatedAt: new Date()
            })
        };

        const recipe = new Recipe(recipeData);
        await recipe.save();

        // Populate user info for response
        await recipe.populate('createdBy', 'name email');
        await recipe.populate('lastEditedBy', 'name email');

        return NextResponse.json({
            success: true,
            recipe,
            message: 'Recipe added successfully'
        });

    } catch (error) {
        console.error('POST recipes error:', error);
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
            lastEditedBy: session.user.id, // UPDATE: Track who edited
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
        )
            .populate('createdBy', 'name email')
            .populate('lastEditedBy', 'name email');

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

// DELETE - Remove recipe (unchanged, but could add user tracking here too)
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