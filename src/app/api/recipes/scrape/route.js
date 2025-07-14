// file: /src/app/api/recipes/scrape/route.js - v3 - Enhanced with RecipeParser.js logic

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import {
    parseIngredientLine,
    parseInstructionLine,
    extractMetadata,
    extractNumericValue,
    extractText,
    parseDuration,
    cleanTitle
} from '@/lib/recipe-parsing-utils';

// Popular recipe websites that typically use JSON-LD structured data
const SUPPORTED_DOMAINS = [
    'allrecipes.com',
    'food.com',
    'foodnetwork.com',
    'cooking.nytimes.com',
    'epicurious.com',
    'delish.com',
    'tasteofhome.com',
    'simplyrecipes.com',
    'cookist.com',
    'pinterest.com',
    'yummly.com',
    'recipetineats.com',
    'thekitchn.com',
    'bonappetit.com',
    'allrecipes.co.uk',
    'bbcgoodfood.com',
    'jamieoliver.com',
    'kingarthurbaking.com',
    'seriouseats.com',
    'foodandwine.com'
];

// Enhanced ingredient parsing using RecipeParser.js logic
function parseIngredientText(text) {
    if (!text) return { name: '', amount: '', unit: '', optional: false };

    console.log('🥕 Server-side parsing ingredient text:', text);

    // Use the shared parsing utility
    const parsed = parseIngredientLine(text);

    // If parsing failed, return the text as ingredient name
    if (!parsed) {
        return {
            name: text.trim(),
            amount: '',
            unit: '',
            optional: text.toLowerCase().includes('optional')
        };
    }

    return parsed;
}

// Enhanced instruction parsing using RecipeParser.js logic
function parseInstructionText(text, stepNumber) {
    if (!text) return null;

    console.log('📝 Server-side parsing instruction text:', text);

    // Use the shared parsing utility
    const parsed = parseInstructionLine(text, stepNumber);

    // If parsing failed, return the text as instruction
    if (!parsed) {
        return {
            step: stepNumber + 1,
            instruction: text.trim()
        };
    }

    return parsed;
}

// Clean and normalize recipe data with enhanced parsing
function normalizeRecipeData(jsonLdData) {
    console.log('Raw JSON-LD data received:', JSON.stringify(jsonLdData, null, 2));

    // Handle arrays - some sites return arrays of recipes
    let recipe = Array.isArray(jsonLdData) ? jsonLdData[0] : jsonLdData;

    // Some sites nest the recipe in a graph structure
    if (recipe['@graph']) {
        recipe = recipe['@graph'].find(item =>
            item['@type'] === 'Recipe' ||
            (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
        ) || recipe['@graph'][0];
    }

    if (!recipe || !recipe.name) {
        console.log('No recipe found, available properties:', Object.keys(recipe || {}));
        throw new Error('No valid recipe data found in structured data');
    }

    console.log('Found recipe:', recipe.name);
    console.log('Recipe ingredients raw:', recipe.recipeIngredient);
    console.log('Recipe instructions raw:', recipe.recipeInstructions);

    // Enhanced ingredient normalization with RecipeParser.js logic
    const normalizeIngredients = (ingredients) => {
        if (!ingredients) return [];

        return ingredients.map(ing => {
            let text = extractText(ing);

            // Special handling for structured ingredient objects that some sites use
            if (typeof ing === 'object' && ing !== null) {
                // Some sites structure ingredients as {name: "flour", amount: "2", unit: "cups"}
                if (ing.name && (ing.amount || ing.quantity)) {
                    const amount = ing.amount || ing.quantity || '';
                    const unit = ing.unit || ing.unitText || '';
                    return {
                        name: extractText(ing.name),
                        amount: extractText(amount),
                        unit: extractText(unit),
                        optional: extractText(text).toLowerCase().includes('optional')
                    };
                }

                // Some sites have ingredient text in different properties
                text = ing.text || ing.ingredient || ing.name || extractText(ing);
            }

            // Use enhanced parsing from RecipeParser.js
            const parsed = parseIngredientText(text);

            // Additional cleanup for common issues
            if (parsed.name) {
                // Remove extra whitespace and clean up formatting
                parsed.name = parsed.name.replace(/\s+/g, ' ').trim();

                // Handle cases where amount/unit got mixed into name
                const nameWords = parsed.name.split(' ');
                if (nameWords.length > 1 && !parsed.amount) {
                    const firstWord = nameWords[0];
                    const secondWord = nameWords[1];

                    // Check if first word is a number and second is a unit
                    if (/^\d+(\.\d+)?$/.test(firstWord) && /^(grams?|g|kg|cups?|oz|ounces?)$/i.test(secondWord)) {
                        parsed.amount = firstWord;
                        parsed.unit = secondWord;
                        parsed.name = nameWords.slice(2).join(' ');
                    }
                }
            }

            return parsed;
        }).filter(ing => ing.name && ing.name.trim());
    };

    // Enhanced instruction normalization with RecipeParser.js logic
    const normalizeInstructions = (instructions) => {
        if (!instructions) return [];

        return instructions.map((inst, index) => {
            let text = extractText(inst);

            // Use enhanced parsing from RecipeParser.js
            const parsed = parseInstructionText(text, index);

            return parsed;
        }).filter(inst => inst && inst.instruction && inst.instruction.trim());
    };

    // Enhanced tag extraction with auto-tagging from RecipeParser.js
    const extractTags = (recipe) => {
        const tags = new Set();

        // Recipe category
        if (recipe.recipeCategory) {
            const categories = Array.isArray(recipe.recipeCategory)
                ? recipe.recipeCategory
                : [recipe.recipeCategory];
            categories.forEach(cat => {
                if (typeof cat === 'string') {
                    tags.add(cat.toLowerCase());
                }
            });
        }

        // Recipe cuisine
        if (recipe.recipeCuisine) {
            const cuisines = Array.isArray(recipe.recipeCuisine)
                ? recipe.recipeCuisine
                : [recipe.recipeCuisine];
            cuisines.forEach(cuisine => {
                if (typeof cuisine === 'string') {
                    tags.add(cuisine.toLowerCase());
                }
            });
        }

        // Keywords
        if (recipe.keywords) {
            if (typeof recipe.keywords === 'string') {
                recipe.keywords.split(',').forEach(keyword => {
                    tags.add(keyword.trim().toLowerCase());
                });
            } else if (Array.isArray(recipe.keywords)) {
                recipe.keywords.forEach(keyword => {
                    if (typeof keyword === 'string') {
                        tags.add(keyword.toLowerCase());
                    }
                });
            }
        }

        return Array.from(tags);
    };

    // Build normalized recipe object
    const normalizedRecipe = {
        title: cleanTitle(extractText(recipe.name)) || 'Imported Recipe',
        description: extractText(recipe.description) || '',
        ingredients: normalizeIngredients(recipe.recipeIngredient),
        instructions: normalizeInstructions(recipe.recipeInstructions),
        prepTime: parseDuration(recipe.prepTime),
        cookTime: parseDuration(recipe.cookTime),
        servings: recipe.recipeYield ? parseInt(Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield) : null,
        tags: extractTags(recipe),
        source: recipe.url || 'Imported from URL',
        difficulty: 'medium', // Will be enhanced by extractMetadata

        // Enhanced nutrition information
        nutrition: recipe.nutrition ? {
            calories: {
                value: parseFloat(extractNumericValue(recipe.nutrition.calories)) || 0,
                unit: 'kcal',
                name: 'Calories'
            },
            protein: {
                value: parseFloat(extractNumericValue(recipe.nutrition.proteinContent)) || 0,
                unit: 'g',
                name: 'Protein'
            },
            fat: {
                value: parseFloat(extractNumericValue(recipe.nutrition.fatContent)) || 0,
                unit: 'g',
                name: 'Fat'
            },
            carbs: {
                value: parseFloat(extractNumericValue(recipe.nutrition.carbohydrateContent)) || 0,
                unit: 'g',
                name: 'Carbohydrates'
            },
            fiber: {
                value: parseFloat(extractNumericValue(recipe.nutrition.fiberContent)) || 0,
                unit: 'g',
                name: 'Fiber'
            },
            sodium: {
                value: parseFloat(extractNumericValue(recipe.nutrition.sodiumContent)) || 0,
                unit: 'mg',
                name: 'Sodium'
            },
            sugars: {
                value: parseFloat(extractNumericValue(recipe.nutrition.sugarContent)) || 0,
                unit: 'g',
                name: 'Sugars'
            }
        } : {
            calories: { value: 0, unit: 'kcal', name: 'Calories' },
            protein: { value: 0, unit: 'g', name: 'Protein' },
            fat: { value: 0, unit: 'g', name: 'Fat' },
            carbs: { value: 0, unit: 'g', name: 'Carbohydrates' },
            fiber: { value: 0, unit: 'g', name: 'Fiber' }
        }
    };

    // Enhanced metadata extraction with auto-tagging from RecipeParser.js
    const fullText = [
        normalizedRecipe.title,
        normalizedRecipe.description,
        ...normalizedRecipe.ingredients.map(ing => `${ing.amount} ${ing.unit} ${ing.name}`),
        ...normalizedRecipe.instructions.map(inst => inst.instruction)
    ].join(' ');

    extractMetadata(fullText, normalizedRecipe);

    // Quality check - if we didn't get enough ingredients, try alternative parsing
    if (normalizedRecipe.ingredients.length === 0 && recipe.recipeIngredient) {
        console.log('No ingredients parsed, trying fallback parsing...');
        normalizedRecipe.ingredients = recipe.recipeIngredient.map(ing => {
            const text = extractText(ing);
            console.log('Fallback parsing ingredient:', text);

            // Try one more time with enhanced parsing
            const parsed = parseIngredientText(text);
            if (parsed && parsed.name) {
                return parsed;
            }

            // Simple fallback - just put everything in the name field
            return {
                name: text,
                amount: '',
                unit: '',
                optional: text.toLowerCase().includes('optional')
            };
        }).filter(ing => ing.name && ing.name.trim());
    }

    // Quality check for instructions
    if (normalizedRecipe.instructions.length === 0 && recipe.recipeInstructions) {
        console.log('No instructions parsed, trying fallback parsing...');
        normalizedRecipe.instructions = recipe.recipeInstructions.map((inst, index) => {
            const text = extractText(inst);
            console.log('Fallback parsing instruction:', text);

            // Try one more time with enhanced parsing
            const parsed = parseInstructionText(text, index);
            if (parsed && parsed.instruction) {
                return parsed;
            }

            // Simple fallback
            return {
                step: index + 1,
                instruction: text.trim()
            };
        }).filter(inst => inst.instruction && inst.instruction.trim());
    }

    console.log('Final normalized recipe:', normalizedRecipe);
    return normalizedRecipe;
}

// Extract JSON-LD structured data from HTML
function extractJSONLD(html) {
    console.log('Extracting JSON-LD from HTML');

    // Find all JSON-LD script tags
    const jsonLdRegex = /<script[^>]*type=["\']application\/ld\+json["\'][^>]*>([\s\S]*?)<\/script>/gi;
    const matches = [...html.matchAll(jsonLdRegex)];

    console.log(`Found ${matches.length} JSON-LD script tags`);

    for (const match of matches) {
        try {
            const jsonContent = match[1].trim();
            const data = JSON.parse(jsonContent);

            // Look for Recipe type in the data
            const findRecipe = (obj) => {
                if (!obj) return null;

                // Direct recipe object
                if (obj['@type'] === 'Recipe' ||
                    (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))) {
                    return obj;
                }

                // Array of objects
                if (Array.isArray(obj)) {
                    for (const item of obj) {
                        const recipe = findRecipe(item);
                        if (recipe) return recipe;
                    }
                }

                // Graph structure
                if (obj['@graph']) {
                    return findRecipe(obj['@graph']);
                }

                // Nested objects
                for (const key in obj) {
                    if (typeof obj[key] === 'object') {
                        const recipe = findRecipe(obj[key]);
                        if (recipe) return recipe;
                    }
                }

                return null;
            };

            const recipe = findRecipe(data);
            if (recipe) {
                console.log('Found recipe in JSON-LD:', recipe.name);
                return recipe;
            }
        } catch (error) {
            console.log('Failed to parse JSON-LD:', error.message);
            continue;
        }
    }

    throw new Error('No recipe found in JSON-LD structured data');
}

// Main scraping function with enhanced parsing
async function scrapeRecipeFromUrl(url) {
    console.log('🌐 Scraping recipe from URL:', url);

    // Validate URL
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');

        console.log('🔍 Domain:', domain);

        // Check if domain is supported (optional warning)
        const isSupported = SUPPORTED_DOMAINS.some(supportedDomain =>
            domain.includes(supportedDomain) || supportedDomain.includes(domain)
        );

        if (!isSupported) {
            console.log('⚠️ Warning: Domain not in supported list, but attempting anyway');
        }

    } catch (error) {
        throw new Error('Invalid URL provided');
    }

    // Fetch the webpage
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch recipe page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    console.log('✅ Fetched HTML, length:', html.length);

    // Extract and normalize recipe data with enhanced parsing
    const jsonLdData = extractJSONLD(html);
    const normalizedRecipe = normalizeRecipeData(jsonLdData);

    console.log('🎉 Successfully scraped and parsed recipe:', normalizedRecipe.title);
    console.log('📊 Results: ', {
        ingredients: normalizedRecipe.ingredients.length,
        instructions: normalizedRecipe.instructions.length,
        tags: normalizedRecipe.tags.length,
        difficulty: normalizedRecipe.difficulty
    });

    return normalizedRecipe;
}

// API Route Handler
export async function POST(request) {
    try {
        console.log('=== Enhanced Recipe URL Scraping API START ===');

        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in to import recipes.' },
                { status: 401 }
            );
        }

        const { url } = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        console.log('🚀 Scraping recipe from URL:', url);

        // Scrape the recipe with enhanced parsing
        const scrapedRecipe = await scrapeRecipeFromUrl(url);

        console.log('✅ Successfully scraped recipe:', scrapedRecipe.title);
        console.log('📈 Enhanced parsing results:', {
            ingredients: scrapedRecipe.ingredients.length,
            instructions: scrapedRecipe.instructions.length,
            autoTags: scrapedRecipe.tags.length,
            hasPrepTime: !!scrapedRecipe.prepTime,
            hasCookTime: !!scrapedRecipe.cookTime,
            hasServings: !!scrapedRecipe.servings,
            difficulty: scrapedRecipe.difficulty
        });

        return NextResponse.json({
            success: true,
            recipe: scrapedRecipe,
            message: 'Recipe successfully imported and parsed with enhanced logic',
            stats: {
                ingredients: scrapedRecipe.ingredients.length,
                instructions: scrapedRecipe.instructions.length,
                tags: scrapedRecipe.tags.length,
                difficulty: scrapedRecipe.difficulty
            }
        });

    } catch (error) {
        console.error('=== Enhanced Recipe URL Scraping Error ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);

        // Return user-friendly error messages
        let errorMessage = 'Failed to import recipe from URL';

        if (error.message.includes('Invalid URL')) {
            errorMessage = 'Please provide a valid URL';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Could not access the recipe page. Please check the URL and try again.';
        } else if (error.message.includes('No recipe found')) {
            errorMessage = 'No recipe data found on this page. This website might not be supported yet.';
        } else if (error.message.includes('Unauthorized')) {
            errorMessage = 'Please log in to import recipes.';
        }

        return NextResponse.json(
            {
                error: errorMessage,
                details: error.message,
                supportedSites: 'Try URLs from: AllRecipes, Food Network, Epicurious, Simply Recipes, Cookist, BBC Good Food, Jamie Oliver, King Arthur Baking, Serious Eats, and other major recipe sites.',
                enhancedParsing: 'This version includes enhanced ingredient and instruction parsing with auto-tagging capabilities.'
            },
            { status: 400 }
        );
    }
}