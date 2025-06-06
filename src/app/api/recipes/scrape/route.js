// file: /src/app/api/recipes/scrape/route.js - v1

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

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
    'bonappetit.com'
];

// Clean and normalize recipe data
function normalizeRecipeData(jsonLdData) {
    console.log('Normalizing recipe data:', jsonLdData);

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
        throw new Error('No valid recipe data found in structured data');
    }

    // Helper function to extract text from various formats
    const extractText = (data) => {
        if (!data) return '';
        if (typeof data === 'string') return data;
        if (Array.isArray(data)) return data.join(' ');
        if (data.text) return data.text;
        if (data['@value']) return data['@value'];
        return String(data);
    };

    // Helper function to parse duration (ISO 8601 format like "PT30M")
    const parseDuration = (duration) => {
        if (!duration) return null;
        if (typeof duration === 'number') return duration;

        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (match) {
            const hours = parseInt(match[1] || 0);
            const minutes = parseInt(match[2] || 0);
            return hours * 60 + minutes;
        }
        return null;
    };

    // Helper function to normalize ingredients
    const normalizeIngredients = (ingredients) => {
        if (!ingredients) return [];

        return ingredients.map(ing => {
            const text = extractText(ing);
            return parseIngredientText(text);
        }).filter(ing => ing.name && ing.name.trim());
    };

    // Helper function to normalize instructions
    const normalizeInstructions = (instructions) => {
        if (!instructions) return [];

        return instructions.map(inst => {
            let text = extractText(inst);
            // Remove step numbers if they exist
            text = text.replace(/^\d+\.\s*/, '').trim();
            return text;
        }).filter(inst => inst && inst.trim());
    };

    // Extract tags from various sources
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
        title: extractText(recipe.name) || 'Imported Recipe',
        description: extractText(recipe.description) || '',
        ingredients: normalizeIngredients(recipe.recipeIngredient),
        instructions: normalizeInstructions(recipe.recipeInstructions),
        prepTime: parseDuration(recipe.prepTime),
        cookTime: parseDuration(recipe.cookTime),
        servings: recipe.recipeYield ? parseInt(Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield) : null,
        tags: extractTags(recipe),
        source: recipe.url || 'Imported from URL',
        difficulty: 'medium', // Default, could be smarter based on cook time

        // Nutrition information if available
        nutrition: recipe.nutrition ? {
            calories: recipe.nutrition.calories || '',
            protein: recipe.nutrition.proteinContent || '',
            fat: recipe.nutrition.fatContent || '',
            carbs: recipe.nutrition.carbohydrateContent || '',
            fiber: recipe.nutrition.fiberContent || ''
        } : {
            calories: '',
            protein: '',
            fat: '',
            carbs: '',
            fiber: ''
        }
    };

    console.log('Normalized recipe:', normalizedRecipe);
    return normalizedRecipe;
}

// Parse ingredient text into structured format
function parseIngredientText(text) {
    if (!text) return { name: '', amount: '', unit: '', optional: false };

    // Convert fraction characters
    text = text
        .replace(/½/g, '1/2')
        .replace(/¼/g, '1/4')
        .replace(/¾/g, '3/4')
        .replace(/⅓/g, '1/3')
        .replace(/⅔/g, '2/3')
        .replace(/⅛/g, '1/8');

    // Pattern matching for amount, unit, and ingredient
    const patterns = [
        // "2 cups flour" or "1 tablespoon olive oil"
        /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(cups?|tablespoons?|tbsp|teaspoons?|tsp|pounds?|lbs?|ounces?|oz|cloves?|slices?|pieces?)\s+(.+)$/i,
        // "2 large eggs" or "1 medium onion"
        /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(large|medium|small|extra-large)\s+(.+)$/i,
        // "1 (15 oz) can tomatoes"
        /^(\d+(?:\/\d+)?(?:\.\d+)?)\s*\([^)]+\)\s*(.+)$/i,
        // "2 pounds ground beef"
        /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(.+)$/
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            if (pattern.source.includes('cups?|tablespoons?')) {
                // Has explicit unit
                return {
                    name: match[3].trim(),
                    amount: match[1],
                    unit: match[2],
                    optional: text.toLowerCase().includes('optional')
                };
            } else if (pattern.source.includes('large|medium|small')) {
                // Size descriptor
                return {
                    name: `${match[2]} ${match[3]}`.trim(),
                    amount: match[1],
                    unit: '',
                    optional: text.toLowerCase().includes('optional')
                };
            } else {
                // General amount + item
                return {
                    name: match[2].trim(),
                    amount: match[1],
                    unit: '',
                    optional: text.toLowerCase().includes('optional')
                };
            }
        }
    }

    // No pattern matched, return the whole text as ingredient name
    return {
        name: text.trim(),
        amount: '',
        unit: '',
        optional: text.toLowerCase().includes('optional')
    };
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

// Main scraping function
async function scrapeRecipeFromUrl(url) {
    console.log('Scraping recipe from URL:', url);

    // Validate URL
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');

        console.log('Domain:', domain);

        // Check if domain is supported (optional warning)
        const isSupported = SUPPORTED_DOMAINS.some(supportedDomain =>
            domain.includes(supportedDomain) || supportedDomain.includes(domain)
        );

        if (!isSupported) {
            console.log('Warning: Domain not in supported list, but attempting anyway');
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
    console.log('Fetched HTML, length:', html.length);

    // Extract and normalize recipe data
    const jsonLdData = extractJSONLD(html);
    const normalizedRecipe = normalizeRecipeData(jsonLdData);

    return normalizedRecipe;
}

// API Route Handler
export async function POST(request) {
    try {
        console.log('=== Recipe URL Scraping API START ===');

        const session = await getServerSession(authOptions);

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

        console.log('Scraping recipe from URL:', url);

        // Scrape the recipe
        const scrapedRecipe = await scrapeRecipeFromUrl(url);

        console.log('Successfully scraped recipe:', scrapedRecipe.title);

        return NextResponse.json({
            success: true,
            recipe: scrapedRecipe,
            message: 'Recipe successfully imported from URL'
        });

    } catch (error) {
        console.error('=== Recipe URL Scraping Error ===');
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
        }

        return NextResponse.json(
            {
                error: errorMessage,
                details: error.message,
                supportedSites: 'Try URLs from: AllRecipes, Food Network, Epicurious, Simply Recipes, Cookist, and other major recipe sites.'
            },
            { status: 400 }
        );
    }
}