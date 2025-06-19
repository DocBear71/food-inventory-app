// For App Router: /app/api/analyze-recipes/route.js
// For Pages Router: /pages/api/analyze-recipes.js

import { NextResponse } from 'next/server'; // Fixed import path
// import { NextApiRequest, NextApiResponse } from 'next'; // Pages Router

const analyzeDietaryInfo = (recipes) => {
    const dietaryTerms = {
        vegan: ['vegan', 'plant-based', 'plant based'],
        vegetarian: ['vegetarian', 'veggie'],
        glutenFree: ['gluten-free', 'gluten free', 'gf', 'celiac'],
        dairyFree: ['dairy-free', 'dairy free', 'lactose-free', 'lactose free', 'non-dairy'],
        keto: ['keto', 'ketogenic', 'low-carb', 'low carb', 'lchf'],
        paleo: ['paleo', 'paleolithic', 'primal'],
        nutFree: ['nut-free', 'nut free', 'no nuts', 'allergen-free'],
        sugarFree: ['sugar-free', 'sugar free', 'no sugar', 'diabetic'],
        lowSodium: ['low-sodium', 'low sodium', 'no salt', 'heart-healthy']
    };

    const cookingMethods = {
        noCook: ['no-cook', 'no cook', 'raw', 'uncooked', 'cold'],
        onePot: ['one-pot', 'one pot', 'single pot', 'sheet pan'],
        slowCooker: ['slow cooker', 'crockpot', 'crock pot'],
        instantPot: ['instant pot', 'pressure cooker', 'instapot'],
        airFryer: ['air fryer', 'air fried'],
        grilling: ['grilled', 'bbq', 'barbecue', 'grill'],
        baking: ['baked', 'oven', 'roasted']
    };

    const timeCategories = {
        quick: ['quick', '15 min', '20 min', '30 min', 'fast', 'easy'],
        makeAhead: ['make-ahead', 'make ahead', 'prep ahead', 'freezer', 'meal prep']
    };

    const results = {
        dietary: {},
        cooking: {},
        timing: {},
        totalRecipes: recipes.length,
        sampleMatches: {}
    };

    // Initialize counters
    Object.keys(dietaryTerms).forEach(key => {
        results.dietary[key] = 0;
        results.sampleMatches[key] = [];
    });
    Object.keys(cookingMethods).forEach(key => {
        results.cooking[key] = 0;
        results.sampleMatches[key] = [];
    });
    Object.keys(timeCategories).forEach(key => {
        results.timing[key] = 0;
        results.sampleMatches[key] = [];
    });

    recipes.forEach(recipe => {
        const searchText = [
            recipe.title || '',
            recipe.description || '',
            recipe.tags ? (Array.isArray(recipe.tags) ? recipe.tags.join(' ') : recipe.tags) : '',
            recipe.ingredients ? (Array.isArray(recipe.ingredients) ?
                recipe.ingredients.map(ing => typeof ing === 'string' ? ing : ing.name || ing.ingredient || '').join(' ') :
                recipe.ingredients) : '',
            recipe.instructions ? (Array.isArray(recipe.instructions) ?
                recipe.instructions.join(' ') : recipe.instructions) : ''
        ].join(' ').toLowerCase();

        // Check dietary terms
        Object.entries(dietaryTerms).forEach(([category, terms]) => {
            const matchedTerm = terms.find(term => searchText.includes(term));
            if (matchedTerm) {
                results.dietary[category]++;
                if (results.sampleMatches[category].length < 5) {
                    results.sampleMatches[category].push({
                        title: recipe.title,
                        matchedTerm: matchedTerm,
                        id: recipe._id
                    });
                }
            }
        });

        // Check cooking methods
        Object.entries(cookingMethods).forEach(([category, terms]) => {
            const matchedTerm = terms.find(term => searchText.includes(term));
            if (matchedTerm) {
                results.cooking[category]++;
                if (results.sampleMatches[category].length < 5) {
                    results.sampleMatches[category].push({
                        title: recipe.title,
                        matchedTerm: matchedTerm,
                        id: recipe._id
                    });
                }
            }
        });

        // Check timing
        Object.entries(timeCategories).forEach(([category, terms]) => {
            const matchedTerm = terms.find(term => searchText.includes(term));
            if (matchedTerm) {
                results.timing[category]++;
                if (results.sampleMatches[category].length < 5) {
                    results.sampleMatches[category].push({
                        title: recipe.title,
                        matchedTerm: matchedTerm,
                        id: recipe._id
                    });
                }
            }
        });
    });

    return results;
};

// Enhanced analyzer that distinguishes between IS vs HAS dietary options
const smartAnalyzeDietaryInfo = (recipes) => {
    const results = {
        actuallyIs: { dietary: {}, cooking: {}, timing: {} },
        hasOptions: { dietary: {}, cooking: {}, timing: {} },
        questionable: [],
        totalRecipes: recipes.length,
        samples: {}
    };

    // Define patterns for "actually is" vs "has options"
    const dietaryPatterns = {
        vegan: {
            actuallyIs: ['this vegan', 'vegan recipe', 'completely vegan', 'fully vegan', 'naturally vegan'],
            hasOptions: ['make vegan', 'vegan version', 'vegan substitute', 'for vegan', 'vegan option', 'can be made vegan'],
            exclusions: ['chicken', 'beef', 'pork', 'fish', 'cheese', 'milk', 'egg', 'butter']
        },
        vegetarian: {
            actuallyIs: ['vegetarian recipe', 'this vegetarian', 'veggie only'],
            hasOptions: ['vegetarian version', 'veggie substitute', 'for vegetarians'],
            exclusions: ['chicken', 'beef', 'pork', 'fish', 'seafood']
        },
        glutenFree: {
            actuallyIs: ['gluten-free recipe', 'naturally gluten-free', 'this is gluten free'],
            hasOptions: ['gluten-free version', 'gf substitute', 'make gluten free', 'gluten free option'],
            exclusions: ['flour', 'wheat', 'bread crumbs', 'soy sauce']
        },
        dairyFree: {
            actuallyIs: ['dairy-free recipe', 'naturally dairy-free', 'no dairy'],
            hasOptions: ['dairy-free version', 'non-dairy substitute', 'dairy free option'],
            exclusions: ['milk', 'cheese', 'butter', 'cream', 'yogurt']
        },
        keto: {
            actuallyIs: ['keto recipe', 'ketogenic', 'this keto'],
            hasOptions: ['keto version', 'low-carb option', 'make keto'],
            exclusions: ['sugar', 'flour', 'rice', 'potato', 'bread', 'pasta']
        }
    };

    // Initialize counters
    Object.keys(dietaryPatterns).forEach(diet => {
        results.actuallyIs.dietary[diet] = 0;
        results.hasOptions.dietary[diet] = 0;
        results.samples[diet + '_is'] = [];
        results.samples[diet + '_has'] = [];
        results.samples[diet + '_questionable'] = [];
    });

    recipes.forEach(recipe => {
        const title = (recipe.title || '').toLowerCase();
        const description = (recipe.description || '').toLowerCase();
        const tags = recipe.tags ? (Array.isArray(recipe.tags) ? recipe.tags.join(' ') : recipe.tags).toLowerCase() : '';
        const ingredients = recipe.ingredients ? (Array.isArray(recipe.ingredients) ?
            recipe.ingredients.map(ing => typeof ing === 'string' ? ing : ing.name || ing.ingredient || '').join(' ') :
            recipe.ingredients).toLowerCase() : '';
        const instructions = recipe.instructions ? (Array.isArray(recipe.instructions) ?
            recipe.instructions.join(' ') : recipe.instructions).toLowerCase() : '';

        const allText = [title, description, tags, ingredients, instructions].join(' ');

        // Analyze each dietary category
        Object.entries(dietaryPatterns).forEach(([diet, patterns]) => {
            let isActually = false;
            let hasOption = false;
            let hasExclusion = false;
            let matchedTerms = [];

            // Check for "actually is" patterns
            patterns.actuallyIs.forEach(pattern => {
                if (allText.includes(pattern)) {
                    isActually = true;
                    matchedTerms.push(`IS: ${pattern}`);
                }
            });

            // Check for "has options" patterns
            patterns.hasOptions.forEach(pattern => {
                if (allText.includes(pattern)) {
                    hasOption = true;
                    matchedTerms.push(`HAS: ${pattern}`);
                }
            });

            // Check for exclusions (ingredients that contradict the diet)
            patterns.exclusions.forEach(exclusion => {
                if (ingredients.includes(exclusion) || title.includes(exclusion)) {
                    hasExclusion = true;
                    matchedTerms.push(`EXCLUDES: ${exclusion}`);
                }
            });

            // Determine classification
            if (isActually && !hasExclusion) {
                results.actuallyIs.dietary[diet]++;
                if (results.samples[diet + '_is'].length < 5) {
                    results.samples[diet + '_is'].push({
                        title: recipe.title,
                        matchedTerms: matchedTerms,
                        id: recipe._id
                    });
                }
            } else if (hasOption) {
                results.hasOptions.dietary[diet]++;
                if (results.samples[diet + '_has'].length < 5) {
                    results.samples[diet + '_has'].push({
                        title: recipe.title,
                        matchedTerms: matchedTerms,
                        id: recipe._id
                    });
                }
            } else if ((isActually || allText.includes(diet)) && hasExclusion) {
                // Questionable - claims to be diet but has conflicting ingredients
                if (results.samples[diet + '_questionable'].length < 10) {
                    results.samples[diet + '_questionable'].push({
                        title: recipe.title,
                        matchedTerms: matchedTerms,
                        id: recipe._id,
                        reason: 'Claims to be ' + diet + ' but has conflicting ingredients'
                    });
                }
            }
        });
    });

    return results;
};

// Ingredient analysis function
const analyzeIngredientPatterns = (recipes) => {
    const commonIngredients = {};

    recipes.forEach(recipe => {
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            recipe.ingredients.forEach(ingredient => {
                const ingredientText = (typeof ingredient === 'string' ? ingredient : ingredient.name || ingredient.ingredient || '').toLowerCase();

                const words = ingredientText.split(' ');
                words.forEach(word => {
                    if (word.length > 2) {
                        commonIngredients[word] = (commonIngredients[word] || 0) + 1;
                    }
                });
            });
        }
    });

    const sortedIngredients = Object.entries(commonIngredients)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30);

    return { mostCommonIngredients: sortedIngredients };
};

// Title analysis for obvious misclassifications
const analyzeTitlePatterns = (recipes, dietaryCategory) => {
    const problematicTitles = [];
    const conflictingWords = {
        vegan: ['chicken', 'beef', 'pork', 'meat', 'cheese', 'milk', 'butter', 'egg'],
        vegetarian: ['chicken', 'beef', 'pork', 'meat', 'fish'],
        glutenFree: ['bread', 'pasta', 'flour'],
        dairyFree: ['cheese', 'milk', 'butter', 'cream'],
        keto: ['rice', 'potato', 'sugar', 'bread']
    };

    if (conflictingWords[dietaryCategory]) {
        recipes.forEach(recipe => {
            const title = (recipe.title || '').toLowerCase();
            const hasConflict = conflictingWords[dietaryCategory].some(word => title.includes(word));

            if (hasConflict) {
                problematicTitles.push({
                    title: recipe.title,
                    id: recipe._id,
                    conflictingWords: conflictingWords[dietaryCategory].filter(word => title.includes(word))
                });
            }
        });
    }

    return problematicTitles;
};

// App Router version
export async function GET() {
    try {
        // Import your database connection and models (using your existing setup)
        const connectDB = (await import('@/lib/mongodb')).default;
        const { Recipe } = await import('@/lib/models');

        // Connect to database and fetch all recipes
        await connectDB();
        const recipes = await Recipe.find({}).lean();

        console.log(`Found ${recipes.length} recipes to analyze`);

        // Run both analyses for comparison
        const basicAnalysis = analyzeDietaryInfo(recipes);
        const smartAnalysis = smartAnalyzeDietaryInfo(recipes);
        const ingredientAnalysis = analyzeIngredientPatterns(recipes);

        // Check for obvious misclassifications in vegan category
        const veganProblems = analyzeTitlePatterns(recipes, 'vegan');

        return NextResponse.json({
            success: true,
            totalRecipes: recipes.length,
            basicAnalysis,
            smartAnalysis,
            ingredientAnalysis,
            veganTitleProblems: veganProblems.slice(0, 20), // Show first 20 problematic titles
            recommendations: {
                actuallyVegan: smartAnalysis.actuallyIs.dietary.vegan,
                hasVeganOptions: smartAnalysis.hasOptions.dietary.vegan,
                questionableVegan: smartAnalysis.samples.vegan_questionable?.length || 0,
                suggest: "Use the 'actuallyIs' counts for implementing filters"
            }
        });
    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}

// Pages Router version (uncomment if using Pages Router)
/*
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Your database query here
        const recipes = await Recipe.find({}).lean();
        const analysis = analyzeDietaryInfo(recipes);

        res.status(200).json({
            success: true,
            analysis,
            summary: {
                totalRecipes: analysis.totalRecipes,
                mostCommonDietary: Object.entries(analysis.dietary)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5),
                mostCommonCooking: Object.entries(analysis.cooking)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
            }
        });
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Analysis failed' });
    }
}
*/