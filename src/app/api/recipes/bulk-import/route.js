// file: /src/app/api/recipes/extract/route.js - v9 UPDATED FOR NEW DELIMITED FORMAT

import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/lib/auth';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }

        const formData = await request.formData();
        const file = formData.get('file');
        const volume = formData.get('volume');

        if (!file) {
            return NextResponse.json({error: 'No file provided'}, {status: 400});
        }

        console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);

        const fileName = file.name.toLowerCase();
        let extractedText = '';

        // Handle different file types
        if (fileName.endsWith('.pdf')) {
            extractedText = await extractTextFromPDF(file);
        } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
            extractedText = await extractTextFromDOCX(file);
        } else {
            return NextResponse.json({error: 'Unsupported file type. Please upload PDF or DOCX files.'}, {status: 400});
        }

        console.log('Extracted text length:', extractedText.length);

        // Parse recipes from extracted text using new delimited format
        const recipes = parseRecipesFromText(extractedText, volume);

        console.log('Parsed recipes count:', recipes.length);

        return NextResponse.json({
            success: true,
            extractedText,
            recipes,
            fileInfo: {
                name: file.name,
                size: file.size,
                type: file.type
            }
        });

    } catch (error) {
        console.error('Recipe extraction error:', error);
        return NextResponse.json({
            error: 'Failed to extract recipes from file',
            details: error.message
        }, {status: 500});
    }
}

// Extract text from PDF files
async function extractTextFromPDF(file) {
    return `PDF file uploaded: ${file.name}

⚠️ Automatic PDF text extraction is not fully supported yet. 

For best results with your Doc Bear's cookbook PDFs:

1. Try converting your PDF to DOCX format using:
   - Microsoft Word (File → Save As → DOCX)
   - Google Docs (upload PDF, then download as DOCX)
   - Online converters like SmallPDF or ILovePDF

2. Or manually copy recipes using the "Add Recipe Manually" button below

3. You can also copy and paste recipe text directly into the manual entry form

We recommend using DOCX files for the most accurate recipe extraction.

FORMAT YOUR RECIPES LIKE THIS:

Recipe Title

--Description--
Your recipe description here

--Ingredients--
1 cup flour
2 tbsp butter
1 tsp salt

--Instructions--
Mix ingredients together
Bake for 30 minutes

--Tags--
baking, quick, family-friendly

--RECIPE BREAK--`;
}

// Extract text from DOCX files
async function extractTextFromDOCX(file) {
    try {
        // Method 1: Try with mammoth library
        try {
            const mammoth = await import('mammoth');
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            console.log('Attempting mammoth extraction, buffer size:', buffer.length);

            const result = await mammoth.extractRawText({buffer});

            if (result.value && result.value.length > 10) {
                console.log('Mammoth extraction successful, text length:', result.value.length);
                return result.value;
            } else {
                throw new Error('Mammoth returned empty text');
            }
        } catch (mammothError) {
            console.log('Mammoth extraction failed:', mammothError.message);
            throw mammothError;
        }

    } catch (error) {
        console.log('DOCX extraction failed, providing instructions:', error.message);

        // Return helpful instructions instead of failing
        return `DOCX file uploaded: ${file.name}

⚠️ Automatic DOCX text extraction encountered an issue: ${error.message}

Please format your recipes using the new delimited format:

RECIPE FORMAT EXAMPLE:

Classic Mac and Cheese

--Description--
Creamy, cheesy comfort food perfect for family dinners

--Ingredients--
1 lb elbow macaroni
4 tbsp butter
1/4 cup all-purpose flour
2 cups whole milk
1 cup sharp cheddar cheese, shredded
1/2 cup gruyere cheese, shredded
1 tsp salt
1/2 tsp black pepper

--Instructions--
Cook macaroni according to package directions until al dente
In a large saucepan, melt butter over medium heat
Whisk in flour and cook for 1 minute
Gradually add milk, whisking constantly
Cook until sauce thickens, about 5 minutes
Remove from heat and stir in cheeses until melted
Add cooked macaroni to cheese sauce and mix well
Transfer to baking dish and bake at 375°F for 25-30 minutes

--Tags--
pasta, cheese, comfort-food, family-friendly, baked

--RECIPE BREAK--

Then copy and paste your formatted recipes into the "Add Recipe Manually" section below.`;
    }
}

// NEW: Parse recipes using the delimited format first, then fallback to legacy
function parseRecipesFromText(text, volume) {
    const recipes = [];

    try {
        console.log('Starting recipe parsing...');
        console.log('Text preview:', text.substring(0, 500));

        // Clean up the text first
        const cleanText = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        // NEW: Check for delimited format first (look for --RECIPE BREAK--)
        if (cleanText.includes('--RECIPE BREAK--') || cleanText.includes('--recipe break--')) {
            console.log('✅ Detected new delimited format');
            return parseDelimitedFormat(cleanText, volume);
        }

        // FALLBACK: Try legacy parsing for older format
        console.log('⚠️ No delimiters found, trying legacy parsing');
        return parseLegacyFormat(cleanText, volume);

    } catch (error) {
        console.error('Error parsing recipes:', error);
        return [];
    }
}

// NEW: Parse recipes using the new delimited format
function parseDelimitedFormat(text, volume) {
    const recipes = [];

    // Split by recipe breaks - handle both cases
    const recipeSections = text.split(/--\s*RECIPE\s*BREAK\s*--/i)
        .map(section => section.trim())
        .filter(section => section.length > 0);

    console.log(`Found ${recipeSections.length} recipe sections using delimited format`);

    for (let i = 0; i < recipeSections.length; i++) {
        const section = recipeSections[i];

        console.log(`\n--- PROCESSING DELIMITED SECTION ${i + 1} ---`);
        console.log(`Section length: ${section.length}`);
        console.log(`Section preview: "${section.substring(0, 200)}..."`);

        if (section.length < 20) {
            console.log('❌ Section too short, skipping');
            continue;
        }

        const recipe = parseDelimitedRecipe(section, volume);
        if (recipe && recipe.title) {
            recipes.push(recipe);
            console.log(`✅ Successfully parsed: "${recipe.title}" [${recipe.category}]`);
            console.log(`   - ${recipe.ingredients.length} ingredients`);
            console.log(`   - ${recipe.instructions.length} instructions`);
        } else {
            console.log(`❌ Failed to parse delimited section ${i + 1}`);
        }
    }

    console.log(`\nDELIMITED PARSING RESULT: ${recipes.length} recipes parsed successfully`);
    return recipes;
}

// NEW: Parse individual recipe using delimited sections
function parseDelimitedRecipe(section, volume) {
    console.log('\n=== PARSING DELIMITED RECIPE ===');

    const recipe = {
        title: '',
        description: '',
        ingredients: [],
        instructions: [],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: 'medium',
        tags: ['comfort-food', `volume-${volume}`],
        source: `Doc Bear's Comfort Food Survival Guide Volume ${volume}`,
        isPublic: true,
        category: 'entrees'
    };

    // Split into lines and process
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let currentSection = 'title';
    let titleFound = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        console.log(`Processing line ${i}: "${line}" (section: ${currentSection})`);

        // Check for section delimiters
        if (line.match(/^--\s*description\s*--$/i)) {
            currentSection = 'description';
            console.log('  ➡️ Switched to description section');
            continue;
        }

        if (line.match(/^--\s*ingredients?\s*--$/i)) {
            currentSection = 'ingredients';
            console.log('  ➡️ Switched to ingredients section');
            continue;
        }

        if (line.match(/^--\s*instructions?\s*--$/i)) {
            currentSection = 'instructions';
            console.log('  ➡️ Switched to instructions section');
            continue;
        }

        if (line.match(/^--\s*tags?\s*--$/i)) {
            currentSection = 'tags';
            console.log('  ➡️ Switched to tags section');
            continue;
        }

        // Process content based on current section
        switch (currentSection) {
            case 'title':
                if (!titleFound && line.length > 0) {
                    recipe.title = line.replace(/^\*\*|\*\*$/g, '').trim();
                    titleFound = true;
                    console.log(`  ✅ Found title: "${recipe.title}"`);
                    currentSection = 'description'; // Default to description after title
                }
                break;

            case 'description':
                if (line.length > 0 && !line.match(/^--\s*\w+\s*--$/i)) {
                    if (recipe.description) {
                        recipe.description += ' ' + line;
                    } else {
                        recipe.description = line;
                    }
                    console.log(`  📝 Added to description: "${line}"`);
                }
                break;

            case 'ingredients':
                if (line.length > 0) {
                    const ingredient = parseIngredientLine(line);
                    if (ingredient) {
                        recipe.ingredients.push(ingredient);
                        console.log(`  ✅ Added ingredient: ${ingredient.amount} ${ingredient.unit} ${ingredient.name}`);
                    } else {
                        console.log(`  ⚠️ Could not parse ingredient: "${line}"`);
                    }
                }
                break;

            case 'instructions':
                if (line.length > 0) {
                    recipe.instructions.push(line);
                    console.log(`  ✅ Added instruction: ${line.substring(0, 50)}...`);
                }
                break;

            case 'tags':
                if (line.length > 0) {
                    // Parse comma-separated tags
                    const newTags = line.split(',')
                        .map(tag => tag.trim().toLowerCase())
                        .filter(tag => tag.length > 0);

                    // Add new tags without duplicates
                    newTags.forEach(tag => {
                        if (!recipe.tags.includes(tag)) {
                            recipe.tags.push(tag);
                        }
                    });
                    console.log(`  🏷️ Added tags: ${newTags.join(', ')}`);
                }
                break;
        }
    }

    // Auto-detect category based on title, tags, and description
    recipe.category = detectRecipeCategory(recipe.title, recipe.tags, recipe.description);

    // Validation
    if (!recipe.title) {
        console.log('❌ No title found');
        return null;
    }

    if (recipe.ingredients.length === 0) {
        console.log('❌ No ingredients found');
        return null;
    }

    if (recipe.instructions.length === 0) {
        console.log('❌ No instructions found');
        return null;
    }

    console.log(`✅ Successfully parsed delimited recipe: "${recipe.title}" [${recipe.category}]`);
    return recipe;
}

// Parse individual ingredient line with better fraction handling
function parseIngredientLine(line) {
    try {
        // Remove list markers and extra spaces
        let cleanLine = line.replace(/^[-•*]\s*/, '').trim();

        if (cleanLine.length < 2) return null;

        // Handle mixed fractions like "1 1/2" -> "1.5"
        cleanLine = cleanLine.replace(/^(\d+)\s+(\d+)\/(\d+)\s+/, (match, whole, num, den) => {
            const decimal = parseInt(whole) + (parseInt(num) / parseInt(den));
            return `${decimal} `;
        });

        // Handle standalone fractions like "1/2" -> "0.5"
        cleanLine = cleanLine.replace(/^(\d+)\/(\d+)\s+/, (match, num, den) => {
            const decimal = parseInt(num) / parseInt(den);
            return `${decimal} `;
        });

        // Handle unicode fractions
        const fractionMap = {
            '½': '0.5', '¼': '0.25', '¾': '0.75', '⅓': '0.33', '⅔': '0.67',
            '⅛': '0.125', '⅜': '0.375', '⅝': '0.625', '⅞': '0.875'
        };

        for (const [fraction, decimal] of Object.entries(fractionMap)) {
            cleanLine = cleanLine.replace(new RegExp(`^${fraction.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`), `${decimal} `);
        }

        console.log(`    Parsing ingredient: "${line}" -> cleaned: "${cleanLine}"`);

        // Parse patterns in order of specificity
        const patterns = [
            {
                regex: /^(\d+(?:\.\d+)?)\s+(cup|cups|tsp|tbsp|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|qt|quart|gallon|stick|sticks|clove|cloves|can|jar)\s+(.+)$/i,
                type: 'amount_unit_name'
            },
            {
                regex: /^(\d+(?:\.\d+)?)\s+(.+)$/,
                type: 'amount_name'
            },
            {
                regex: /^(.+)$/,
                type: 'name_only'
            }
        ];

        for (const pattern of patterns) {
            const match = cleanLine.match(pattern.regex);
            if (match) {
                let amount = 1;
                let unit = '';
                let name = '';

                switch (pattern.type) {
                    case 'amount_unit_name':
                        amount = parseFloat(match[1]);
                        unit = match[2];
                        name = match[3].trim();
                        break;

                    case 'amount_name':
                        amount = parseFloat(match[1]);
                        unit = '';
                        name = match[2].trim();
                        break;

                    case 'name_only':
                        amount = 1;
                        unit = '';
                        name = match[1].trim();
                        break;
                }

                // Skip invalid names
                if (name.length < 1 || /^(and|or|then|until|while|method|attention)$/i.test(name)) {
                    continue;
                }

                console.log(`    ✅ Parsed: ${amount} ${unit} ${name}`);

                return {
                    amount: amount,
                    unit: unit,
                    name: name,
                    category: '',
                    alternatives: [],
                    optional: false
                };
            }
        }

        return null;

    } catch (error) {
        console.error('Error in parseIngredientLine:', error);
        return null;
    }
}

// Auto-detect recipe category
function detectRecipeCategory(title, tags, description) {
    const titleLower = title.toLowerCase();
    const tagsLower = tags.join(' ').toLowerCase();
    const descLower = description.toLowerCase();
    const combined = `${titleLower} ${tagsLower} ${descLower}`;

    // Seasonings & Spice Mixes
    if (combined.match(/\b(seasoning|spice|blend|rub|mix)\b/)) {
        return 'seasonings';
    }

    // Sauces
    if (combined.match(/\b(sauce|gravy|glaze|syrup)\b/)) {
        return 'sauces';
    }

    // Salad Dressings
    if (combined.match(/\b(dressing|vinaigrette)\b/)) {
        return 'salad-dressings';
    }

    // Marinades
    if (combined.match(/\b(marinade|marinate)\b/)) {
        return 'marinades';
    }

    // Breads & Baking
    if (combined.match(/\b(bread|biscuit|roll|muffin|scone|bake|baking)\b/)) {
        return 'breads';
    }

    // Pizza Dough
    if (combined.match(/\b(pizza.*dough|dough.*pizza)\b/)) {
        return 'pizza-dough';
    }

    // Desserts
    if (combined.match(/\b(dessert|cake|cookie|pie|sweet|candy|chocolate|sugar)\b/)) {
        return 'desserts';
    }

    // Breakfast
    if (combined.match(/\b(breakfast|pancake|waffle|french.*toast|oatmeal|cereal)\b/)) {
        return 'breakfast';
    }

    // Beverages
    if (combined.match(/\b(drink|beverage|tea|coffee|smoothie|juice|cocktail)\b/)) {
        return 'beverages';
    }

    // Soups
    if (combined.match(/\b(soup|stew|chili|broth|bisque)\b/)) {
        return 'soups';
    }

    // Sandwiches
    if (combined.match(/\b(sandwich|burger|wrap|sub|panini)\b/)) {
        return 'sandwiches';
    }

    // Appetizers
    if (combined.match(/\b(appetizer|snack|dip|chip|finger.*food)\b/)) {
        return 'appetizers';
    }

    // Side Dishes
    if (combined.match(/\b(side|potato|rice|vegetable|salad)\b/) && !combined.match(/\b(main|entree|chicken|beef|pork|fish)\b/)) {
        return 'side-dishes';
    }

    // Default to entrees for main dishes
    return 'entrees';
}

// FALLBACK: Parse recipes using legacy format (your existing logic)
function parseLegacyFormat(text, volume) {
    console.log('Using legacy parsing format...');

    // Use your existing parsing logic here
    // For now, return empty array since we're focusing on the new format
    return [];
}