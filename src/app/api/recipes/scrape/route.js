// file: /src/app/api/recipes/scrape/route.js - v2

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

// Helper function to extract numeric values from nutrition data
const extractNumericValue = (value) => {
    if (!value) return '';

    // Convert to string if it's not already
    const strValue = String(value);

    // Extract just the number from strings like "203 kcal", "12 g", "9 mg"
    const match = strValue.match(/^(\d+(?:\.\d+)?)/);
    return match ? match[1] : '';
};

// Parse ingredient text into structured format
function parseIngredientText(text) {
    if (!text) return { name: '', amount: '', unit: '', optional: false };

    console.log('Parsing ingredient text:', text);

    // Clean up the text first
    text = text.trim();

    // Convert fraction characters
    text = text
        .replace(/½/g, '1/2')
        .replace(/¼/g, '1/4')
        .replace(/¾/g, '3/4')
        .replace(/⅓/g, '1/3')
        .replace(/⅔/g, '2/3')
        .replace(/⅛/g, '1/8');

    // Enhanced unit lists including metric
    const units = [
        // US measurements
        'cups?', 'cup', 'tablespoons?', 'tablespoon', 'tbsp', 'teaspoons?', 'teaspoon', 'tsp',
        'pounds?', 'pound', 'lbs?', 'lb', 'ounces?', 'ounce', 'oz', 'fluid ounces?', 'fl oz',
        'pints?', 'pint', 'pt', 'quarts?', 'quart', 'qt', 'gallons?', 'gallon', 'gal',

        // Metric measurements
        'grams?', 'gram', 'g', 'kilograms?', 'kilogram', 'kg', 'milligrams?', 'milligram', 'mg',
        'liters?', 'liter', 'litres?', 'litre', 'l', 'milliliters?', 'milliliter', 'ml', 'millilitres?', 'millitre',

        // Count-based units
        'pieces?', 'piece', 'slices?', 'slice', 'cloves?', 'clove', 'bulbs?', 'bulb', 'ribs', 'rib',
        'stalks?', 'stalk', 'sprigs?', 'sprig', 'leaves?', 'leaf', 'strips?', 'strip',
        'wedges?', 'wedge', 'segments?', 'segment', 'cans?', 'can', 'jars?', 'jar',
        'bottles?', 'bottle', 'packages?', 'package', 'boxes?', 'box', 'bags?', 'bag', 'bunches?', 'bunch',

        // Size descriptors (treated as units for parsing purposes)
        'large', 'medium', 'small', 'extra-large', 'extra large', 'xl',
        'jumbo', 'mini', 'baby', 'whole', 'half', 'quarter'
    ];

    // Create a comprehensive pattern for all units - more specific matching
    const unitPattern = units.join('|');

    // Enhanced patterns for different ingredient formats - order matters!
    const patterns = [
        // "to taste" items like "salt, to taste" or "vegetable oil, to taste"
        /^(.+?),?\s+to\s+taste$/i,

        // "2 tablespoons vegetable oil" (amount + unit + ingredient)
        new RegExp(`^(\\d+(?:\\.\\d+)?(?:\\/\\d+)?)\\s+(${unitPattern})\\s+(.+)$`, 'i'),

        // "vegetable oil, 2 tablespoons" (ingredient first, then amount + unit)
        new RegExp(`^([^,]+),\\s*(\\d+(?:\\.\\d+)?(?:\\/\\d+)?)\\s+(${unitPattern})$`, 'i'),

        // "2 large eggs" or "1 medium onion" (amount + size + ingredient)
        new RegExp(`^(\\d+(?:\\.\\d+)?(?:\\/\\d+)?)\\s+(large|medium|small|extra-large|extra large|xl|jumbo|mini|baby|whole)\\s+(.+)$`, 'i'),

        // "1 (15 oz) can tomatoes" - handle parenthetical amounts
        /^(\d+(?:\.\d+)?(?:\/\d+)?)\s*\([^)]+\)\s*(.+)$/i,

        // "2 pounds ground beef" - general amount + item (fallback)
        /^(\d+(?:\.\d+)?(?:\/\d+)?)\s+(.+)$/i
    ];

    // Try each pattern in order
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const match = text.match(pattern);

        if (match) {
            console.log(`Pattern ${i + 1} matched:`, match);

            // Handle "to taste" items (Pattern 1)
            if (pattern.source.includes('to\\s+taste')) {
                return {
                    name: match[1].trim(),
                    amount: 'to taste',
                    unit: '',
                    optional: text.toLowerCase().includes('optional')
                };
            }

            // Handle "amount + unit + ingredient" (Pattern 2)
            if (i === 1) {
                return {
                    name: match[3].trim(),
                    amount: match[1],
                    unit: match[2],
                    optional: text.toLowerCase().includes('optional')
                };
            }

            // Handle "ingredient, amount + unit" (Pattern 3)
            if (i === 2) {
                return {
                    name: match[1].trim(),
                    amount: match[2],
                    unit: match[3],
                    optional: text.toLowerCase().includes('optional')
                };
            }

            // Handle "amount + size + ingredient" (Pattern 4)
            if (i === 3) {
                return {
                    name: `${match[2]} ${match[3]}`.trim(),
                    amount: match[1],
                    unit: '',
                    optional: text.toLowerCase().includes('optional')
                };
            }

            // Handle parenthetical amounts (Pattern 5)
            if (i === 4) {
                return {
                    name: match[2].trim(),
                    amount: match[1],
                    unit: '',
                    optional: text.toLowerCase().includes('optional')
                };
            }

            // Handle general amount + item (Pattern 6 - fallback)
            if (i === 5) {
                // Check if the second part starts with a known unit
                const remainingText = match[2].trim();
                const unitMatch = remainingText.match(new RegExp(`^(${unitPattern})\\s+(.+)$`, 'i'));

                if (unitMatch) {
                    return {
                        name: unitMatch[2].trim(),
                        amount: match[1],
                        unit: unitMatch[1],
                        optional: text.toLowerCase().includes('optional')
                    };
                } else {
                    return {
                        name: remainingText,
                        amount: match[1],
                        unit: '',
                        optional: text.toLowerCase().includes('optional')
                    };
                }
            }
        }
    }

    console.log('No pattern matched, using entire text as ingredient name');
    // No pattern matched, return the whole text as ingredient name
    return {
        name: text.trim(),
        amount: '',
        unit: '',
        optional: text.toLowerCase().includes('optional')
    };
}

// Clean and normalize recipe data
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

            // Parse the text format
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

    // Quality check - if we didn't get enough ingredients, try alternative parsing
    if (normalizedRecipe.ingredients.length === 0 && recipe.recipeIngredient) {
        console.log('No ingredients parsed, trying fallback parsing...');
        normalizedRecipe.ingredients = recipe.recipeIngredient.map(ing => {
            const text = extractText(ing);
            console.log('Fallback parsing ingredient:', text);

            // Simple fallback - just put everything in the name field
            return {
                name: text,
                amount: '',
                unit: '',
                optional: text.toLowerCase().includes('optional')
            };
        }).filter(ing => ing.name && ing.name.trim());
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