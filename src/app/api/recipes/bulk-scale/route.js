// file: /src/app/api/recipes/bulk-scale/route.js

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

        // Scale each recipe
        const scaledRecipes = recipes.map(recipe => {
            const scalingFactor = targetServings / (recipe.servings || 4);

            const scaledIngredients = recipe.ingredients.map(ingredient => {
                const quantityInfo = parseQuantity(ingredient.quantity);
                if (quantityInfo) {
                    return {
                        ...ingredient,
                        quantity: formatScaledQuantity(quantityInfo.amount * scalingFactor, quantityInfo.unit),
                        originalQuantity: ingredient.quantity,
                        scalingFactor
                    };
                }
                return ingredient;
            });

            return {
                ...recipe,
                scaledIngredients,
                scalingFactor,
                originalServings: recipe.servings,
                targetServings
            };
        });

        return NextResponse.json({ scaledRecipes });

    } catch (error) {
        console.error('Error bulk scaling recipes:', error);
        return NextResponse.json({ error: 'Bulk scaling failed' }, { status: 500 });
    }
}

function parseQuantity(quantityStr) {
    if (!quantityStr) return null;

    // Handle fractions
    const fractionRegex = /(\d+)?\s*(\d+)\/(\d+)/;
    const fractionMatch = quantityStr.match(fractionRegex);

    if (fractionMatch) {
        const whole = parseInt(fractionMatch[1]) || 0;
        const numerator = parseInt(fractionMatch[2]);
        const denominator = parseInt(fractionMatch[3]);
        const amount = whole + (numerator / denominator);
        const unit = quantityStr.replace(fractionRegex, '').trim();
        return { amount, unit };
    }

    // Handle decimals
    const decimalRegex = /(\d+\.?\d*)\s*(.+)?/;
    const decimalMatch = quantityStr.match(decimalRegex);

    if (decimalMatch) {
        const amount = parseFloat(decimalMatch[1]);
        const unit = decimalMatch[2] ? decimalMatch[2].trim() : '';
        return { amount, unit };
    }

    return null;
}

function formatScaledQuantity(amount, unit) {
    const rounded = Math.round(amount * 100) / 100;
    const fraction = decimalToFraction(rounded);

    if (fraction && fraction.length < 8) {
        return `${fraction} ${unit}`.trim();
    }

    return `${rounded} ${unit}`.trim();
}

function decimalToFraction(decimal) {
    if (decimal === Math.floor(decimal)) {
        return decimal.toString();
    }

    const tolerance = 1.0E-6;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = decimal;

    do {
        const a = Math.floor(b);
        let aux = h1; h1 = a * h1 + h2; h2 = aux;
        aux = k1; k1 = a * k1 + k2; k2 = aux;
        b = 1 / (b - a);
    } while (Math.abs(decimal - h1 / k1) > decimal * tolerance);

    if (h1 > k1) {
        const whole = Math.floor(h1 / k1);
        const remainder = h1 % k1;
        if (remainder === 0) {
            return whole.toString();
        }
        return `${whole} ${remainder}/${k1}`;
    }

    return `${h1}/${k1}`;
}

