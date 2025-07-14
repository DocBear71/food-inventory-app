// file: /src/app/api/recipes/bulk-import/route.js - v3 Updated for Delimited Format

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

export async function POST(request) {
    try {
        const session = await auth();

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
            duplicates: 0,
            skipped: 0
        };

        console.log(`Starting bulk import of ${recipes.length} recipes for Volume ${volume}`);

        for (let i = 0; i < recipes.length; i++) {
            const recipeData = recipes[i];

            try {
                // Enhanced validation for required fields
                if (!recipeData.title || !recipeData.title.trim()) {
                    results.errors.push(`Recipe ${i + 1}: Missing title`);
                    results.skipped++;
                    continue;
                }

                if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
                    results.errors.push(`Recipe ${i + 1} "${recipeData.title}": No ingredients found`);
                    results.skipped++;
                    continue;
                }

                if (!recipeData.instructions || recipeData.instructions.length === 0) {
                    results.errors.push(`Recipe ${i + 1} "${recipeData.title}": No instructions found`);
                    results.skipped++;
                    continue;
                }

                // Check for duplicate recipes (case-insensitive)
                const existingRecipe = await Recipe.findOne({
                    title: { $regex: new RegExp(`^${recipeData.title.trim()}$`, 'i') },
                    createdBy: session.user.id
                });

                if (existingRecipe) {
                    results.duplicates++;
                    results.errors.push(`Recipe "${recipeData.title}": Already exists (skipped)`);
                    continue;
                }

                // Process and validate ingredients
                const processedIngredients = processIngredients(recipeData.ingredients || []);
                if (processedIngredients.length === 0) {
                    results.errors.push(`Recipe ${i + 1} "${recipeData.title}": Could not process ingredients`);
                    results.skipped++;
                    continue;
                }

                // Process and validate instructions
                const processedInstructions = processInstructions(recipeData.instructions || []);
                if (processedInstructions.length === 0) {
                    results.errors.push(`Recipe ${i + 1} "${recipeData.title}": Could not process instructions`);
                    results.skipped++;
                    continue;
                }

                // Prepare recipe data with enhanced validation and defaults
                const recipe = new Recipe({
                    title: recipeData.title.trim(),
                    description: recipeData.description || '',
                    ingredients: processedIngredients,
                    instructions: processedInstructions,
                    prepTime: validateNumber(recipeData.prepTime, 15, 1, 480), // 1 min to 8 hours
                    cookTime: validateNumber(recipeData.cookTime, 30, 0, 480), // 0 min to 8 hours
                    servings: validateNumber(recipeData.servings, 4, 1, 20), // 1 to 20 servings
                    difficulty: validateDifficulty(recipeData.difficulty),
                    tags: processTags(recipeData.tags || [], volume),
                    source: recipeData.source || `Doc Bear's Comfort Food Survival Guide Volume ${volume}`,
                    category: validateCategory(recipeData.category),
                    createdBy: session.user.id,
                    isPublic: true, // Doc Bear's recipes are public by default
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                console.log(`Importing recipe ${i + 1}: "${recipe.title}" (${recipe.category}) - ${recipe.ingredients.length} ingredients, ${recipe.instructions.length} steps`);

                await recipe.save();
                results.imported++;

            } catch (error) {
                console.error(`Error importing recipe ${i + 1}:`, error);
                results.errors.push(`Recipe ${i + 1} (${recipeData.title || 'Unknown'}): ${error.message}`);
                results.skipped++;
            }
        }

        console.log(`Bulk import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.duplicates} duplicates, ${results.errors.length} errors`);

        return NextResponse.json({
            success: true,
            results: {
                imported: results.imported,
                errors: results.errors,
                duplicates: results.duplicates,
                skipped: results.skipped,
                total: recipes.length,
                successRate: Math.round((results.imported / recipes.length) * 100)
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

// Enhanced ingredient processing with better validation
function processIngredients(ingredients) {
    if (!Array.isArray(ingredients)) return [];

    return ingredients.map(ingredient => {
        if (typeof ingredient === 'string') {
            return parseIngredientString(ingredient);
        } else if (typeof ingredient === 'object' && ingredient !== null) {
            return {
                name: (ingredient.name || '').trim(),
                amount: parseFloat(ingredient.amount) || 1,
                unit: (ingredient.unit || '').trim(),
                category: (ingredient.category || '').trim(),
                alternatives: Array.isArray(ingredient.alternatives) ? ingredient.alternatives : [],
                optional: Boolean(ingredient.optional)
            };
        }
        return null;
    }).filter(ingredient => ingredient && ingredient.name && ingredient.name.trim().length > 0);
}

// Enhanced ingredient string parsing
function parseIngredientString(ingredientStr) {
    const str = ingredientStr.trim();
    if (!str) return null;

    // Handle fractions and decimals: "1 1/2 cups flour", "2.5 lbs chicken", "1/4 tsp salt"
    const match = str.match(/^(\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+\.?\d*)\s+(\w+)?\s*(.+)$/);

    if (match) {
        let amount = match[1];

        // Convert mixed fractions to decimals
        if (amount.includes(' ')) {
            const [whole, fraction] = amount.split(' ');
            const [num, den] = fraction.split('/');
            amount = parseFloat(whole) + (parseFloat(num) / parseFloat(den));
        } else if (amount.includes('/')) {
            const [num, den] = amount.split('/');
            amount = parseFloat(num) / parseFloat(den);
        } else {
            amount = parseFloat(amount);
        }

        return {
            amount: amount || 1,
            unit: match[2] || '',
            name: match[3].trim(),
            category: '',
            alternatives: [],
            optional: false
        };
    } else {
        // No amount found, treat as ingredient name only
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

// Enhanced instruction processing
function processInstructions(instructions) {
    if (!Array.isArray(instructions)) return [];

    return instructions
        .map(instruction => {
            if (typeof instruction === 'string') {
                return instruction.trim();
            }
            return String(instruction).trim();
        })
        .filter(instruction => instruction.length > 0)
        .map((instruction, index) => {
            // Add step numbers if not already present
            if (!instruction.match(/^\d+\./)) {
                return `${index + 1}. ${instruction}`;
            }
            return instruction;
        });
}

// Process and validate tags
function processTags(tags, volume) {
    const baseTags = ['comfort-food', `volume-${volume}`];

    if (!Array.isArray(tags)) {
        return baseTags;
    }

    const processedTags = tags
        .map(tag => String(tag).trim().toLowerCase())
        .filter(tag => tag.length > 0)
        .filter(tag => !baseTags.includes(tag)); // Remove duplicates

    return [...baseTags, ...processedTags];
}

// Validate numeric fields with min/max bounds
function validateNumber(value, defaultValue, min = 0, max = Infinity) {
    const num = parseInt(value) || defaultValue;
    return Math.max(min, Math.min(max, num));
}

// Validate difficulty level
function validateDifficulty(difficulty) {
    const validDifficulties = ['easy', 'medium', 'hard'];
    const diff = String(difficulty || '').toLowerCase();
    return validDifficulties.includes(diff) ? diff : 'medium';
}

// Validate category
function validateCategory(category) {
    const validCategories = [
        'seasonings', 'sauces', 'salad-dressings', 'marinades', 'ingredients',
        'entrees', 'side-dishes', 'soups', 'sandwiches', 'appetizers',
        'desserts', 'breads', 'pizza-dough', 'specialty-items', 'beverages', 'breakfast'
    ];

    const cat = String(category || '').toLowerCase();
    return validCategories.includes(cat) ? cat : 'entrees';
}