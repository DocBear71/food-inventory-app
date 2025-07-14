// file: /src/app/api/recipes/extract/route.js - v9 UPDATED FOR NEW DELIMITED FORMAT

import {NextResponse} from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request) {
    try {
        const session = await auth();

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
        console.log('Text length:', text.length);
        console.log('Text preview:', text.substring(0, 500));

        // Clean up the text first
        const cleanText = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        console.log('After cleaning, text length:', cleanText.length);

        // NEW: Check for delimited format first (look for various RECIPE BREAK formats)
        if (cleanText.includes('--RECIPE BREAK--') || cleanText.includes('--recipe break--') ||
            cleanText.includes('--- RECIPE BREAK ---') || cleanText.includes('---RECIPE BREAK---')) {
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

    console.log('=== STARTING DELIMITED FORMAT PARSING ===');
    console.log('Full text length:', text.length);
    console.log('Looking for recipe breaks...');

    // Split by recipe breaks - handle multiple formats
    const recipeSections = text.split(/---?\s*RECIPE\s*BREAK\s*---?/i)
        .map(section => section.trim())
        .filter(section => section.length > 0);

    console.log(`Split by RECIPE BREAK found ${recipeSections.length} sections`);

    // Log each section preview
    recipeSections.forEach((section, index) => {
        console.log(`Section ${index + 1} preview (${section.length} chars): "${section.substring(0, 200)}..."`);
    });

    for (let i = 0; i < recipeSections.length; i++) {
        const section = recipeSections[i];

        console.log(`\n--- PROCESSING DELIMITED SECTION ${i + 1} ---`);
        console.log(`Section length: ${section.length}`);

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

            // Debug: show what went wrong
            if (!recipe) {
                console.log('   Reason: parseDelimitedRecipe returned null');
            } else if (!recipe.title) {
                console.log('   Reason: no title found');
                console.log('   Recipe object:', recipe);
            }
        }
    }

    console.log(`\nDELIMITED PARSING RESULT: ${recipes.length} recipes parsed successfully`);
    return recipes;
}

// NEW: Parse individual recipe using delimited sections
function parseDelimitedRecipe(section, volume) {
    console.log('\n=== PARSING DELIMITED RECIPE ===');
    console.log('Section start:', section.substring(0, 100));

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
    console.log(`Processing ${lines.length} lines`);

    let currentSection = 'title';
    let titleFound = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        console.log(`Line ${i}: "${line}" (section: ${currentSection})`);

        // Check for section delimiters (case insensitive, flexible dashes)
        if (line.match(/^--+\s*description\s*--+(.*)$/i)) {
            currentSection = 'description';
            console.log('  ➡️ Switched to description section');

            // Check if there's content on the same line as the delimiter
            const match = line.match(/^--+\s*description\s*--+\s*(.+)$/i);
            if (match && match[1].trim()) {
                recipe.description = match[1].trim();
                console.log(`  📝 Found description on same line: "${match[1].trim()}"`);
            }
            continue;
        }

        if (line.match(/^--+\s*ingredients?\s*--+(.*)$/i)) {
            currentSection = 'ingredients';
            console.log('  ➡️ Switched to ingredients section');

            // Check if there's content on the same line as the delimiter
            const match = line.match(/^--+\s*ingredients?\s*--+\s*(.+)$/i);
            if (match && match[1].trim()) {
                const ingredientsText = match[1].trim();
                console.log(`  🥕 Found ingredients on same line: "${ingredientsText}"`);

                // Parse ingredients that are all on one line
                const parsedIngredients = parseIngredientsFromSingleLine(ingredientsText);
                recipe.ingredients.push(...parsedIngredients);
                console.log(`  ✅ Parsed ${parsedIngredients.length} ingredients from single line`);
            }
            continue;
        }

        if (line.match(/^--+\s*instructions?\s*--+(.*)$/i)) {
            currentSection = 'instructions';
            console.log('  ➡️ Switched to instructions section');

            // Check if there's content on the same line as the delimiter
            const match = line.match(/^--+\s*instructions?\s*--+\s*(.+)$/i);
            if (match && match[1].trim()) {
                const instructionsText = match[1].trim();
                console.log(`  📋 Found instructions on same line: "${instructionsText}"`);

                // For now, add the whole line as one instruction
                // We could split this later if needed
                recipe.instructions.push(instructionsText);
            }
            continue;
        }

        if (line.match(/^--+\s*tags?\s*--+(.*)$/i)) {
            currentSection = 'tags';
            console.log('  ➡️ Switched to tags section');

            // Check if there's content on the same line as the delimiter
            const match = line.match(/^--+\s*tags?\s*--+\s*(.+)$/i);
            if (match && match[1].trim()) {
                const tagsText = match[1].trim();
                console.log(`  🏷️ Found tags on same line: "${tagsText}"`);

                // Parse comma-separated tags
                const newTags = tagsText.split(',')
                    .map(tag => tag.trim().toLowerCase())
                    .filter(tag => tag.length > 0);

                newTags.forEach(tag => {
                    if (!recipe.tags.includes(tag)) {
                        recipe.tags.push(tag);
                    }
                });
                console.log(`  ✅ Added tags: ${newTags.join(', ')}`);
            }
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
                if (line.length > 0 && !line.match(/^--+\s*\w+\s*--+$/i)) {
                    if (recipe.description) {
                        recipe.description += ' ' + line;
                    } else {
                        recipe.description = line;
                    }
                    console.log(`  📝 Added to description: "${line.substring(0, 50)}..."`);
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
                    // Check if this looks like multiple instructions concatenated
                    if (line.length > 200) {
                        console.log(`  📋 Long instruction line, attempting to split: "${line.substring(0, 100)}..."`);
                        const splitInstructions = splitLongInstructionLine(line);
                        recipe.instructions.push(...splitInstructions);
                        console.log(`  ✅ Split into ${splitInstructions.length} instructions`);
                    } else {
                        recipe.instructions.push(line);
                        console.log(`  ✅ Added instruction: ${line.substring(0, 50)}...`);
                    }
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

    console.log('\n--- RECIPE VALIDATION ---');
    console.log(`Title: "${recipe.title}" (${recipe.title ? 'OK' : 'MISSING'})`);
    console.log(`Ingredients: ${recipe.ingredients.length} (${recipe.ingredients.length > 0 ? 'OK' : 'MISSING'})`);
    console.log(`Instructions: ${recipe.instructions.length} (${recipe.instructions.length > 0 ? 'OK' : 'MISSING'})`);
    console.log(`Category: ${recipe.category}`);

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

// Parse ingredients that are all on one line (space or comma separated)
function parseIngredientsFromSingleLine(ingredientsText) {
    console.log(`  🔍 Parsing ingredients from single line: "${ingredientsText}"`);

    const ingredients = [];

    // First, try to split by common patterns that indicate new ingredients
    // Look for patterns like "number unit ingredient" followed by another "number"
    const splits = [];

    // Method 1: Split on measurement patterns at word boundaries
    const measurementPattern = /(\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+\.\d+)\s+(tbsp|tsp|cup|cups|oz|lb|lbs|tablespoon|tablespoons|teaspoon|teaspoons|stick|sticks|clove|cloves|can|jar|large|medium|small)/gi;

    let lastIndex = 0;
    let match;
    const regex = new RegExp(measurementPattern.source, measurementPattern.flags);

    while ((match = regex.exec(ingredientsText)) !== null) {
        if (lastIndex < match.index) {
            // There's text before this match, it might be the end of a previous ingredient
            const prevText = ingredientsText.slice(lastIndex, match.index).trim();
            if (prevText && splits.length > 0) {
                // Append to the last split
                splits[splits.length - 1] += ' ' + prevText;
            }
        }

        // Start a new ingredient from this measurement
        const restOfText = ingredientsText.slice(match.index);
        const nextMatch = regex.exec(ingredientsText);

        if (nextMatch) {
            // Take text up to the next measurement
            splits.push(ingredientsText.slice(match.index, nextMatch.index).trim());
            regex.lastIndex = nextMatch.index; // Reset for next iteration
        } else {
            // Take the rest of the text
            splits.push(restOfText.trim());
            break;
        }

        lastIndex = match.index + match[0].length;
    }

    // If no measurements found, try splitting by common words that start new ingredients
    if (splits.length === 0) {
        console.log('  📝 No measurements found, trying word-based splitting');

        // Try splitting on common ingredient starters
        const ingredientStarters = /\b(to taste:|up to|about|approximately|\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+\.\d+)/gi;
        const parts = ingredientsText.split(ingredientStarters).filter(part => part && part.trim());

        // Reconstruct with the separators
        for (let i = 0; i < parts.length - 1; i += 2) {
            if (parts[i + 1]) {
                splits.push((parts[i] + ' ' + parts[i + 1]).trim());
            }
        }
    }

    // If still no splits, try a simpler approach - split by length and common words
    if (splits.length === 0) {
        console.log('  📝 Trying simple word-based splitting');

        // Look for ingredient-like chunks
        const words = ingredientsText.split(/\s+/);
        let currentIngredient = '';

        for (let i = 0; i < words.length; i++) {
            const word = words[i];

            // If this word starts with a number and we already have content, start new ingredient
            if (/^\d+/.test(word) && currentIngredient.trim()) {
                splits.push(currentIngredient.trim());
                currentIngredient = word;
            } else {
                currentIngredient += ' ' + word;
            }
        }

        // Add the last ingredient
        if (currentIngredient.trim()) {
            splits.push(currentIngredient.trim());
        }
    }

    console.log(`  📋 Split into ${splits.length} parts:`, splits);

    // Parse each split as an ingredient
    for (const split of splits) {
        if (split.trim().length > 2) {
            const ingredient = parseIngredientLine(split.trim());
            if (ingredient) {
                ingredients.push(ingredient);
                console.log(`    ✅ Parsed: ${ingredient.amount} ${ingredient.unit} ${ingredient.name}`);
            } else {
                console.log(`    ⚠️ Could not parse: "${split}"`);
            }
        }
    }

    return ingredients;
}

// Split long instruction lines that might be concatenated
function splitLongInstructionLine(instructionText) {
    console.log(`  🔄 Splitting long instruction: "${instructionText.substring(0, 200)}..."`);

    const instructions = [];

    // Try splitting on sentence boundaries with instructional phrases
    const sentenceEnders = /\.\s+(?=[A-Z]|[a-z]+(?:\s+[a-z]+)*\s+(?:until|for|about|in|on|over|at|to|and|then|next|after|while|when|add|place|heat|cook|stir|mix|blend|pour|remove|continue|repeat|bring|allow|set|transfer|using|with))/g;

    let splits = instructionText.split(sentenceEnders);

    // If that didn't work well, try other patterns
    if (splits.length < 2) {
        // Try splitting on instructional phrase boundaries
        const instructionBoundaries = /\.\s+(Add|Place|Heat|Cook|Stir|Mix|Blend|Pour|Remove|Continue|Repeat|Bring|Allow|Set|Transfer|Using|With|In a|After|While|When|Then|Next)/gi;
        splits = instructionText.split(instructionBoundaries);

        // Rejoin with the split words
        const rejoined = [];
        for (let i = 0; i < splits.length; i++) {
            if (i === 0) {
                rejoined.push(splits[i].trim());
            } else {
                // The split word is in the next iteration, but we need to add it back
                const match = instructionText.match(instructionBoundaries);
                if (match && match[i - 1]) {
                    rejoined.push(match[i - 1].trim() + ' ' + splits[i].trim());
                } else {
                    rejoined.push(splits[i].trim());
                }
            }
        }
        splits = rejoined;
    }

    // Clean up and filter the splits
    for (let split of splits) {
        split = split.trim();
        if (split.length > 10) { // Only keep reasonably long instructions
            // Make sure it ends with a period if it doesn't already
            if (!split.endsWith('.') && !split.endsWith('!') && !split.endsWith('?')) {
                split += '.';
            }
            instructions.push(split);
        }
    }

    // If we still don't have good splits, just return the original as one instruction
    if (instructions.length === 0) {
        instructions.push(instructionText);
    }

    console.log(`    📝 Split into ${instructions.length} instructions`);
    return instructions;
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