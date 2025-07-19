// file: /src/app/api/recipes/combined-shopping-list/route.js

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request) {
    try {
        const session = await getEnhancedSession(auth);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipeIds, targetServings } = await request.json();
        const { db } = await connectDB();

        // Fetch recipes
        const recipes = await db.collection('recipes').find({
            _id: { $in: recipeIds.map(id => new ObjectId(id)) }
        }).toArray();

        // Combine and consolidate ingredients
        const combinedIngredients = {};

        recipes.forEach(recipe => {
            const scalingFactor = targetServings / (recipe.servings || 4);

            recipe.ingredients.forEach(ingredient => {
                const key = ingredient.name.toLowerCase();
                const quantityInfo = parseQuantity(ingredient.quantity);

                if (quantityInfo) {
                    const scaledAmount = quantityInfo.amount * scalingFactor;

                    if (combinedIngredients[key]) {
                        // Combine with existing ingredient if units match
                        if (combinedIngredients[key].unit === quantityInfo.unit) {
                            combinedIngredients[key].amount += scaledAmount;
                        } else {
                            // Different units - create separate entries
                            const newKey = `${key}_${quantityInfo.unit}`;
                            combinedIngredients[newKey] = {
                                name: ingredient.name,
                                amount: scaledAmount,
                                unit: quantityInfo.unit,
                                category: ingredient.category || 'Other',
                                recipes: [recipe.title]
                            };
                        }
                    } else {
                        combinedIngredients[key] = {
                            name: ingredient.name,
                            amount: scaledAmount,
                            unit: quantityInfo.unit,
                            category: ingredient.category || 'Other',
                            recipes: [recipe.title]
                        };
                    }

                    // Add recipe to the list if not already there
                    if (!combinedIngredients[key].recipes.includes(recipe.title)) {
                        combinedIngredients[key].recipes.push(recipe.title);
                    }
                }
            });
        });

        // Format combined list
        const combinedList = Object.values(combinedIngredients).map(ingredient => ({
            name: ingredient.name,
            quantity: formatScaledQuantity(ingredient.amount, ingredient.unit),
            category: ingredient.category,
            notes: `For: ${ingredient.recipes.join(', ')}`,
            recipes: ingredient.recipes
        }));

        return NextResponse.json({ combinedList });

    } catch (error) {
        console.error('Error generating combined shopping list:', error);
        return NextResponse.json({ error: 'Failed to generate combined list' }, { status: 500 });
    }
}