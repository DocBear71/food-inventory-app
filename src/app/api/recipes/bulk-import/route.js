// file: /src/app/api/recipes/bulk-import/route.js - v2

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipes, volume } = await request.json();

        if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
            return NextResponse.json({ error: 'No recipes provided' }, { status: 400 });
        }

        await connectDB();

        const results = {
            imported: 0,
            errors: [],
            duplicates: 0
        };

        for (let i = 0; i < recipes.length; i++) {
            const recipeData = recipes[i];

            try {
                // Validate required fields
                if (!recipeData.title || !recipeData.title.trim()) {
                    results.errors.push(`Recipe ${i + 1}: Missing title`);
                    continue;
                }

                // Check for duplicate recipes
                const existingRecipe = await Recipe.findOne({
                    title: { $regex: new RegExp(`^${recipeData.title.trim()}$`, 'i') },
                    createdBy: session.user.id
                });

                if (existingRecipe) {
                    results.duplicates++;
                    results.errors.push(`Recipe "${recipeData.title}": Already exists`);
                    continue;
                }

                // Prepare recipe data - FIXED: Include category
                const recipe = new Recipe({
                    title: recipeData.title.trim(),
                    description: recipeData.description || '',
                    ingredients: processIngredients(recipeData.ingredients || []),
                    instructions: processInstructions(recipeData.instructions || []),
                    prepTime: parseInt(recipeData.prepTime) || 15,
                    cookTime: parseInt(recipeData.cookTime) || 30,
                    servings: parseInt(recipeData.servings) || 4,
                    difficulty: recipeData.difficulty || 'medium',
                    tags: [...(recipeData.tags || []), 'comfort-food', `volume-${volume}`],
                    source: recipeData.source || `Doc Bear's Comfort Food Survival Guide Volume ${volume}`,
                    category: recipeData.category || 'entrees', // ADDED: Include category
                    createdBy: session.user.id,
                    isPublic: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                console.log(`Importing recipe ${i + 1}: "${recipe.title}" with category: "${recipe.category}"`);

                await recipe.save();
                results.imported++;

            } catch (error) {
                console.error(`Error importing recipe ${i + 1}:`, error);
                results.errors.push(`Recipe ${i + 1} (${recipeData.title || 'Unknown'}): ${error.message}`);
            }
        }

        console.log(`Bulk import completed: ${results.imported} imported, ${results.errors.length} errors, ${results.duplicates} duplicates`);

        return NextResponse.json({
            success: true,
            results: {
                imported: results.imported,
                errors: results.errors,
                duplicates: results.duplicates,
                total: recipes.length
            }
        });

    } catch (error) {
        console.error('Bulk import error:', error);
        return NextResponse.json({
            error: 'Failed to import recipes',
            details: error.message
        }, { status: 500 });
    }
}

// Helper function to process ingredients
function processIngredients(ingredients) {
    if (!Array.isArray(ingredients)) return [];

    return ingredients.map(ingredient => {
        if (typeof ingredient === 'string') {
            // Parse string ingredient
            return parseIngredientString(ingredient);
        } else if (typeof ingredient === 'object') {
            // Clean up object ingredient
            return {
                name: (ingredient.name || '').trim(),
                amount: parseFloat(ingredient.amount) || 1,
                unit: (ingredient.unit || '').trim(),
                category: (ingredient.category || '').trim(),
                alternatives: ingredient.alternatives || [],
                optional: ingredient.optional || false
            };
        }
        return null;
    }).filter(ingredient => ingredient && ingredient.name);
}

// Helper function to parse ingredient string
function parseIngredientString(ingredientStr) {
    const str = ingredientStr.trim();
    if (!str) return null;

    // Try to match pattern: "amount unit ingredient"
    const match = str.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(\w+)?\s+(.+)$/);

    if (match) {
        return {
            amount: parseFloat(match[1]) || 1,
            unit: match[2] || '',
            name: match[3].trim(),
            category: '',
            alternatives: [],
            optional: false
        };
    } else {
        // No amount found, treat as ingredient name
        return {
            amount: 1,
            unit: '',
            name: str,
            category: '',
            alternatives: [],
            optional: false
        };
    }
}

// Helper function to process instructions
function processInstructions(instructions) {
    if (!Array.isArray(instructions)) return [];

    return instructions
        .map(instruction => {
            if (typeof instruction === 'string') {
                return instruction.trim();
            }
            return String(instruction).trim();
        })
        .filter(instruction => instruction.length > 0);
}