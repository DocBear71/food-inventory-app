// file: src/app/api/recipes/match-inventory/route.js v1

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced recipe matching API
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const {
            preferences = {},
            includeSubstitutions = true,
            prioritizeFreshness = true,
            maxMissingIngredients = 3,
            dietaryRestrictions = []
        } = await request.json();

        const userId = session.user.id;
        console.log(`🍳 Finding recipes for user ${userId}`);

        // Connect to database
        const { db } = await connectDB();

        // Get user's current inventory
        const inventory = await db.collection('food_inventory')
            .find({ userId: userId })
            .toArray();

        if (inventory.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No inventory items found. Add some ingredients to see recipe suggestions!",
                recipes: [],
                suggestions: [
                    "Add ingredients from your kitchen using the inventory scanner",
                    "Scan a receipt to bulk-add grocery items",
                    "Manually add ingredients you have at home"
                ]
            });
        }

        // Get user's recipes
        const userRecipes = await db.collection('recipes')
            .find({ userId: userId })
            .toArray();

        if (userRecipes.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No recipes found. Add some recipes to get personalized suggestions!",
                recipes: [],
                availableIngredients: inventory.map(item => item.name),
                suggestions: [
                    "Add recipes using the video URL extractor",
                    "Import recipes from social media",
                    "Manually add your favorite recipes"
                ]
            });
        }

        console.log(`📊 Analyzing ${inventory.length} ingredients against ${userRecipes.length} recipes`);

        // Prepare inventory for AI analysis
        const inventoryList = inventory.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit || 'each',
            category: item.category,
            expirationDate: item.expirationDate,
            daysUntilExpiration: item.expirationDate ?
                Math.ceil((new Date(item.expirationDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
            freshnessPriority: item.expirationDate &&
                Math.ceil((new Date(item.expirationDate) - new Date()) / (1000 * 60 * 60 * 24)) <= 3
        }));

        // Process recipes in batches for AI analysis
        const batchSize = 5;
        const recipeAnalyses = [];

        for (let i = 0; i < userRecipes.length; i += batchSize) {
            const recipeBatch = userRecipes.slice(i, i + batchSize);
            const batchAnalysis = await analyzeRecipeBatch(recipeBatch, inventoryList, {
                includeSubstitutions,
                prioritizeFreshness,
                maxMissingIngredients,
                dietaryRestrictions
            });
            recipeAnalyses.push(...batchAnalysis);
        }

        // Filter and sort results
        const viableRecipes = recipeAnalyses
            .filter(recipe =>
                recipe.matchPercentage >= 50 || // At least 50% ingredients available
                recipe.missingIngredients.length <= maxMissingIngredients
            )
            .sort((a, b) => {
                // Sort by priority score (combination of match %, freshness, ease)
                return b.priorityScore - a.priorityScore;
            });

        // Get detailed suggestions for top recipes
        const topRecipes = viableRecipes.slice(0, 10);
        const detailedSuggestions = await generateDetailedSuggestions(topRecipes, inventoryList);

        console.log(`✅ Found ${viableRecipes.length} viable recipes, showing top ${topRecipes.length}`);

        return NextResponse.json({
            success: true,
            data: {
                totalRecipesAnalyzed: userRecipes.length,
                viableRecipes: viableRecipes.length,
                recipes: detailedSuggestions,
                inventorySummary: {
                    totalItems: inventory.length,
                    expiringItems: inventoryList.filter(item => item.daysUntilExpiration <= 3).length,
                    categories: [...new Set(inventory.map(item => item.category))]
                },
                recommendations: {
                    prioritizeByFreshness: inventoryList.filter(item => item.freshnessPriority).length > 0,
                    suggestedShoppingItems: getMostNeededIngredients(recipeAnalyses),
                    mealPlanSuggestions: generateMealPlanSuggestions(viableRecipes)
                }
            }
        });

    } catch (error) {
        console.error('Recipe matching error:', error);
        return NextResponse.json(
            { error: 'Recipe matching failed' },
            { status: 500 }
        );
    }
}

async function analyzeRecipeBatch(recipeBatch, inventory, options) {
    try {
        const inventoryText = inventory.map(item =>
            `${item.name} (${item.quantity} ${item.unit})${item.freshnessPriority ? ' [EXPIRES SOON]' : ''}`
        ).join('\n');

        const recipesText = recipeBatch.map((recipe, index) =>
            `Recipe ${index + 1}: "${recipe.title}"
Ingredients: ${recipe.ingredients.map(ing => `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`).join(', ')}
Instructions: ${recipe.instructions.slice(0, 2).join(' ')}`
        ).join('\n\n');

        const prompt = `
        Analyze these recipes against the available inventory and determine which can be made:

        AVAILABLE INVENTORY:
        ${inventoryText}

        RECIPES TO ANALYZE:
        ${recipesText}

        Analysis Options:
        - Include substitutions: ${options.includeSubstitutions}
        - Prioritize freshness: ${options.prioritizeFreshness}
        - Max missing ingredients: ${options.maxMissingIngredients}
        - Dietary restrictions: ${options.dietaryRestrictions.join(', ') || 'None'}

        For each recipe, analyze and return JSON array:
        [
            {
                "recipe_index": 0,
                "title": "Recipe name",
                "match_percentage": 85,
                "available_ingredients": [
                    {"name": "chicken breast", "have": "2 pieces", "need": "1 piece", "sufficient": true},
                    {"name": "rice", "have": "1 cup", "need": "0.5 cup", "sufficient": true}
                ],
                "missing_ingredients": [
                    {"name": "soy sauce", "amount": "2 tbsp", "substitutes": ["tamari", "coconut aminos"], "essential": true}
                ],
                "substitution_suggestions": [
                    {"original": "heavy cream", "substitute": "milk + butter", "confidence": 0.9, "impact": "minimal"}
                ],
                "difficulty_factors": {
                    "missing_count": 1,
                    "substitution_complexity": "easy",
                    "freshness_benefit": 0.8
                },
                "priority_score": 0.85,
                "can_make": true,
                "freshness_priority": ["chicken breast expires in 2 days"],
                "estimated_success": 0.9
            }
        ]

        Guidelines:
        - Be flexible with quantities (having more is usually fine)
        - Consider reasonable substitutions
        - Prioritize recipes using items that expire soon
        - Calculate priority_score = (match_percentage * 0.4) + (freshness_priority * 0.3) + (ease_of_substitution * 0.3)
        - Mark can_make=true if missing ≤ max_missing_ingredients or substitutions cover gaps

        Return ONLY valid JSON array.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_tokens: 2000
        });

        let result = response.choices[0].message.content.trim();
        if (result.startsWith("```json")) {
            result = result.replace("```json", "").replace("```", "").trim();
        }

        const analyses = JSON.parse(result);

        // Combine with original recipe data
        return analyses.map((analysis, index) => ({
            ...recipeBatch[index],
            ...analysis,
            analysisTimestamp: new Date()
        }));

    } catch (error) {
        console.error('Recipe batch analysis error:', error);
        // Return fallback analysis
        return recipeBatch.map((recipe, index) => ({
            ...recipe,
            recipe_index: index,
            match_percentage: 50,
            missing_ingredients: [],
            can_make: false,
            priority_score: 0.5,
            error: 'Analysis failed, using fallback'
        }));
    }
}

async function generateDetailedSuggestions(topRecipes, inventory) {
    try {
        const recipeSummaries = topRecipes.slice(0, 5).map(recipe =>
            `${recipe.title}: ${recipe.match_percentage}% match, ${recipe.missing_ingredients?.length || 0} missing ingredients`
        ).join('\n');

        const inventorySummary = inventory
            .filter(item => item.freshnessPriority)
            .map(item => `${item.name} (expires in ${item.daysUntilExpiration} days)`)
            .join('\n');

        const prompt = `
        Generate detailed cooking suggestions and tips for these top recipe matches:

        TOP RECIPES:
        ${recipeSummaries}

        ITEMS EXPIRING SOON:
        ${inventorySummary}

        Provide practical cooking advice in JSON format:
        {
            "daily_suggestions": {
                "today": "Make X recipe to use up ingredients expiring today",
                "this_week": "Plan Y recipe for later this week",
                "weekend": "Try Z recipe for a weekend cooking project"
            },
            "freshness_alerts": [
                {"ingredient": "chicken", "expires": "2 days", "suggested_recipes": ["Chicken Stir Fry", "Chicken Soup"]}
            ],
            "meal_prep_ideas": [
                "Cook rice in bulk to use across multiple recipes",
                "Prep vegetables for quick cooking"
            ],
            "shopping_optimization": {
                "buy_now": ["Ingredients needed for tonight's dinner"],
                "buy_later": ["Items for weekend recipes"],
                "avoid_buying": ["Items you already have plenty of"]
            },
            "cooking_tips": [
                "Tips specific to available ingredients and recipes"
            ]
        }

        Focus on practical, actionable advice that helps the user make the most of their current inventory.
        Return ONLY valid JSON.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 1000
        });

        let result = response.choices[0].message.content.trim();
        if (result.startsWith("```json")) {
            result = result.replace("```json", "").replace("```", "").trim();
        }

        const suggestions = JSON.parse(result);

        // Combine recipes with suggestions
        return topRecipes.map(recipe => ({
            id: recipe._id,
            title: recipe.title,
            description: recipe.description,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            servings: recipe.servings,

            // Enhanced matching data
            matchPercentage: recipe.match_percentage,
            canMake: recipe.can_make,
            priorityScore: recipe.priority_score,

            // Ingredient analysis
            availableIngredients: recipe.available_ingredients || [],
            missingIngredients: recipe.missing_ingredients || [],
            substitutionSuggestions: recipe.substitution_suggestions || [],

            // Freshness info
            freshnessPriority: recipe.freshness_priority || [],
            estimatedSuccess: recipe.estimated_success || 0.5,

            // AI suggestions (applied to all recipes)
            aiSuggestions: suggestions
        }));

    } catch (error) {
        console.error('Detailed suggestions error:', error);
        return topRecipes;
    }
}

function getMostNeededIngredients(recipeAnalyses) {
    const ingredientCounts = {};

    recipeAnalyses.forEach(recipe => {
        recipe.missing_ingredients?.forEach(ingredient => {
            const name = ingredient.name;
            if (!ingredientCounts[name]) {
                ingredientCounts[name] = { count: 0, recipes: [] };
            }
            ingredientCounts[name].count++;
            ingredientCounts[name].recipes.push(recipe.title);
        });
    });

    return Object.entries(ingredientCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10)
        .map(([ingredient, data]) => ({
            ingredient,
            appearsIn: data.count,
            recipes: data.recipes.slice(0, 3), // Show up to 3 recipe examples
            priority: data.count >= 3 ? 'high' : data.count >= 2 ? 'medium' : 'low'
        }));
}

function generateMealPlanSuggestions(viableRecipes) {
    const today = new Date();
    const suggestions = {
        today: [],
        tomorrow: [],
        this_week: [],
        weekend: []
    };

    // Sort by priority and freshness
    const sortedRecipes = viableRecipes.sort((a, b) => {
        const aFreshness = a.freshness_priority?.length || 0;
        const bFreshness = b.freshness_priority?.length || 0;
        if (aFreshness !== bFreshness) return bFreshness - aFreshness;
        return b.priority_score - a.priority_score;
    });

    // Categorize recipes by urgency
    sortedRecipes.forEach(recipe => {
        const hasExpiringIngredients = recipe.freshness_priority?.length > 0;
        const isEasyToMake = recipe.missing_ingredients?.length <= 1;
        const isHighMatch = recipe.match_percentage >= 80;

        if (hasExpiringIngredients && isHighMatch) {
            suggestions.today.push({
                title: recipe.title,
                reason: 'Use expiring ingredients',
                matchPercentage: recipe.match_percentage,
                urgency: 'high'
            });
        } else if (isEasyToMake && isHighMatch) {
            suggestions.tomorrow.push({
                title: recipe.title,
                reason: 'Easy to make with current ingredients',
                matchPercentage: recipe.match_percentage,
                urgency: 'medium'
            });
        } else if (recipe.missing_ingredients?.length <= 2) {
            suggestions.this_week.push({
                title: recipe.title,
                reason: `Only need ${recipe.missing_ingredients.length} more ingredients`,
                matchPercentage: recipe.match_percentage,
                urgency: 'low'
            });
        } else {
            suggestions.weekend.push({
                title: recipe.title,
                reason: 'Good weekend cooking project',
                matchPercentage: recipe.match_percentage,
                urgency: 'low'
            });
        }
    });

    // Limit suggestions per category
    Object.keys(suggestions).forEach(key => {
        suggestions[key] = suggestions[key].slice(0, 3);
    });

    return suggestions;
}

// Get recipe substitution suggestions
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');
        const ingredientName = searchParams.get('ingredient');

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        const { db } = await connectDB();
        const userId = session.user.id;

        // Get the specific recipe
        const recipe = await db.collection('recipes').findOne({
            _id: new ObjectId(recipeId),
            userId: userId
        });

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        // Get user's inventory
        const inventory = await db.collection('food_inventory')
            .find({ userId: userId })
            .toArray();

        console.log(`🔄 Finding substitutions for recipe: ${recipe.title}`);

        // Generate substitution suggestions using AI
        const substitutions = await generateSubstitutionSuggestions(
            recipe,
            inventory,
            ingredientName
        );

        return NextResponse.json({
            success: true,
            data: {
                recipe: {
                    id: recipe._id,
                    title: recipe.title
                },
                substitutions: substitutions,
                availableIngredients: inventory.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    category: item.category
                }))
            }
        });

    } catch (error) {
        console.error('Substitution suggestions error:', error);
        return NextResponse.json(
            { error: 'Failed to generate substitution suggestions' },
            { status: 500 }
        );
    }
}

async function generateSubstitutionSuggestions(recipe, inventory, specificIngredient = null) {
    try {
        const recipeIngredients = recipe.ingredients.map(ing =>
            `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`
        ).join('\n');

        const availableItems = inventory.map(item =>
            `${item.name} (${item.quantity} ${item.unit || 'each'})`
        ).join('\n');

        const focusText = specificIngredient ?
            `Focus specifically on substitutions for: ${specificIngredient}` :
            'Provide substitutions for any missing ingredients';

        const prompt = `
        Generate ingredient substitution suggestions for this recipe:

        RECIPE: "${recipe.title}"
        INGREDIENTS NEEDED:
        ${recipeIngredients}

        AVAILABLE INVENTORY:
        ${availableItems}

        ${focusText}

        Provide practical substitution suggestions in JSON format:
        {
            "substitutions": [
                {
                    "original_ingredient": "heavy cream",
                    "available_substitute": "milk + butter",
                    "substitution_ratio": "3/4 cup milk + 1/4 cup melted butter = 1 cup heavy cream",
                    "confidence": 0.9,
                    "taste_impact": "minimal",
                    "texture_impact": "slight",
                    "cooking_adjustments": "May need to whip longer",
                    "category": "dairy",
                    "why_it_works": "Similar fat content and cooking properties"
                }
            ],
            "recipe_adaptations": [
                {
                    "adaptation_type": "quantity_adjustment",
                    "description": "Recipe can be halved if you have limited ingredients",
                    "impact": "Reduces servings from 4 to 2"
                }
            ],
            "ingredient_priorities": [
                {
                    "ingredient": "flour",
                    "importance": "essential",
                    "alternatives": ["all-purpose flour", "bread flour", "cake flour"],
                    "cannot_substitute": false
                }
            ]
        }

        Guidelines:
        - Only suggest substitutions using available inventory items
        - Provide specific ratios and measurements
        - Explain how the substitution affects taste/texture
        - Rate confidence from 0.1 to 1.0
        - Include cooking adjustments if needed
        - Mark essential ingredients that cannot be easily substituted

        Return ONLY valid JSON.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_tokens: 1500
        });

        let result = response.choices[0].message.content.trim();
        if (result.startsWith("```json")) {
            result = result.replace("```json", "").replace("```", "").trim();
        }

        return JSON.parse(result);

    } catch (error) {
        console.error('Substitution generation error:', error);
        return {
            substitutions: [],
            recipe_adaptations: [],
            ingredient_priorities: [],
            error: 'Failed to generate substitutions'
        };
    }
}