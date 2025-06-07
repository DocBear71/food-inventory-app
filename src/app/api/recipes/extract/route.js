// file: /src/app/api/recipes/extract/route.js - v8 FIXED

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file');
        const volume = formData.get('volume');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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
            return NextResponse.json({ error: 'Unsupported file type. Please upload PDF or DOCX files.' }, { status: 400 });
        }

        console.log('Extracted text length:', extractedText.length);

        // Parse recipes from extracted text
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
        }, { status: 500 });
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

We recommend using DOCX files for the most accurate recipe extraction.`;
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

            const result = await mammoth.extractRawText({ buffer });

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

Please try one of these alternatives:

1. **Copy & Paste Method** (Recommended):
   - Open your DOCX file in Microsoft Word or Google Docs
   - Select and copy recipe text
   - Use "Add Recipe Manually" button below to paste each recipe

2. **Save As Text File**:
   - Open DOCX in Word
   - Save As → Plain Text (.txt)
   - Upload the .txt file, or copy/paste the content

3. **Manual Entry**:
   - Use the "Add Recipe Manually" button below
   - Enter each recipe individually

The manual entry method gives you full control over how recipes are formatted and ensures accuracy.`;
    }
}

// Parse recipes from extracted text - IMPROVED VERSION
function parseRecipesFromText(text, volume) {
    const recipes = [];

    try {
        console.log('Starting recipe parsing with delimiters...');
        console.log('Text preview:', text.substring(0, 500));

        // Clean up the text first
        const cleanText = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        // Split by the recipe break delimiter
        let recipeSections = cleanText.split(/---\s*RECIPE\s*BREAK\s*---/i);

        console.log(`Split by RECIPE BREAK found ${recipeSections.length} sections`);

        // If we only got one section, try other splitting methods
        if (recipeSections.length === 1) {
            console.log('No RECIPE BREAK delimiters found, trying other methods...');

            // Try splitting by recipe titles (lines that start with ** and end with **)
            recipeSections = cleanText.split(/\n\s*\*\*([^*]+)\*\*\s*\n/);
            console.log(`Title pattern split found ${recipeSections.length} sections`);

            // If still only one section, try splitting by double asterisks
            if (recipeSections.length === 1) {
                recipeSections = cleanText.split(/\*\*[^*]+\*\*/);
                console.log(`Double asterisk split found ${recipeSections.length} sections`);
            }
        }

        console.log(`Final section count: ${recipeSections.length}`);

        // Process each section
        for (let i = 0; i < recipeSections.length; i++) {
            const section = recipeSections[i].trim();

            console.log(`\n--- PROCESSING SECTION ${i + 1} ---`);
            console.log(`Section length: ${section.length}`);
            console.log(`Section preview: "${section.substring(0, 200)}..."`);

            if (section.length < 20) {
                console.log('❌ Section too short, skipping');
                continue;
            }

            const recipe = parseRecipeWithProperSeparation(section, volume);
            if (recipe && recipe.title) {
                recipes.push(recipe);
                console.log(`✅ Successfully parsed: "${recipe.title}"`);
                console.log(`   - ${recipe.ingredients.length} ingredients`);
                console.log(`   - ${recipe.instructions.length} instructions`);
            }
        }

        console.log(`\nFINAL RESULT: ${recipes.length} recipes parsed successfully`);

    } catch (error) {
        console.error('Error parsing recipes:', error);
    }

    return recipes;
}

function parseRecipeWithProperSeparation(section, volume) {
    console.log('\n=== PARSING RECIPE SECTION ===');

    // DON'T preprocess - this was causing the concatenation issue
    // Just split into lines and clean them up
    const allLines = section.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (allLines.length < 2) {
        console.log('❌ Section too short');
        return null;
    }

    const recipe = {
        title: '',
        description: '',
        ingredients: [],
        instructions: [],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: 'medium',
        tags: ['comfort-food'],
        source: `Doc Bear's Comfort Food Survival Guide Volume ${volume}`,
        isPublic: false
    };

    // STEP 1: Find the title - look for lines with ** markers or first meaningful line
    let titleIndex = -1;
    for (let i = 0; i < Math.min(allLines.length, 5); i++) {
        const line = allLines[i];

        // Check if line has ** markers
        if (line.includes('**') && line.length > 3) {
            recipe.title = line.replace(/\*\*/g, '').trim();
            titleIndex = i;
            console.log(`✅ Found title with ** at line ${i}: "${recipe.title}"`);
            break;
        }

        // Otherwise check if it's a valid title
        if (isValidRecipeTitle(line)) {
            recipe.title = line;
            titleIndex = i;
            console.log(`✅ Found title at line ${i}: "${recipe.title}"`);
            break;
        }
    }

    // If no title found, use first line
    if (titleIndex === -1 && allLines.length > 0) {
        recipe.title = allLines[0].replace(/[^\w\s'&-]/g, '').trim();
        titleIndex = 0;
        console.log(`⚠️ Using first line as title: "${recipe.title}"`);
    }

    if (!recipe.title) {
        console.log('❌ Could not find valid title');
        return null;
    }

    // STEP 2: Process remaining lines - but handle concatenated ingredients
    const contentLines = allLines.slice(titleIndex + 1);
    console.log(`Processing ${contentLines.length} content lines after title`);

    // STEP 3: FIXED - Separate concatenated ingredients BEFORE parsing
    const separatedLines = separateConcatenatedIngredients(contentLines);

    // STEP 4: Parse ingredients and instructions
    const { ingredients, instructions, description } = parseIngredientsAndInstructionsFinal(separatedLines);

    recipe.ingredients = ingredients;
    recipe.instructions = instructions;
    recipe.description = description;

    if (recipe.ingredients.length === 0 && recipe.instructions.length === 0) {
        console.log('❌ No ingredients or instructions found');
        return null;
    }

    console.log(`✅ Successfully parsed recipe with ${recipe.ingredients.length} ingredients and ${recipe.instructions.length} instructions`);
    return recipe;
}

// NEW: Separate concatenated ingredients into individual lines
function separateConcatenatedIngredients(lines) {
    const separatedLines = [];

    for (const line of lines) {
        console.log(`\nAnalyzing line for concatenation: "${line}"`);

        // Check if this line has multiple ingredients concatenated
        if (hasMultipleIngredients(line)) {
            console.log(`  ✅ Line has multiple ingredients, separating...`);
            const separated = splitIntoIngredients(line);
            separatedLines.push(...separated);
            console.log(`  ➡️ Separated into: ${separated.join(' | ')}`);
        } else {
            separatedLines.push(line);
            console.log(`  ➡️ Single item, keeping as-is`);
        }
    }

    return separatedLines;
}

// Check if a line contains multiple ingredients concatenated together
function hasMultipleIngredients(line) {
    // Count how many measurement patterns exist in the line
    const measurementPattern = /(\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+\.\d+|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s*(cup|cups|tsp|tbsp|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|qt|quart|gallon|stick|sticks|clove|cloves|can|jar)\s+/gi;

    const matches = line.match(measurementPattern);
    const count = matches ? matches.length : 0;

    console.log(`    Measurement count in "${line}": ${count}`);

    // If we have 2+ measurements, it's likely concatenated
    return count >= 2;
}

// Split a concatenated ingredient line into separate ingredients
function splitIntoIngredients(line) {
    const ingredients = [];

    // Split on measurement patterns but keep the pattern
    const parts = line.split(/(?=\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+\.\d+|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)/);

    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.length > 0) {
            // Check if this looks like an ingredient
            if (/^(\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+\.\d+|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)/.test(trimmed) ||
                /\b(cup|cups|tsp|tbsp|oz|lb|salt|pepper|eggs?|butter|flour|milk|cream|cheese|tomato|onion|garlic)/i.test(trimmed)) {
                ingredients.push(trimmed);
            }
        }
    }

    // If splitting didn't work well, try a different approach
    if (ingredients.length < 2) {
        // Try splitting on common ingredient boundaries
        const alternativeSplit = line.split(/(?=\d+\s+(?:cup|cups|tsp|tbsp|oz|lb|lbs))|(?=\d+\s+(?:egg|eggs|butter|flour|milk|cream|cheese|tomato|onion|garlic))/i);

        for (const part of alternativeSplit) {
            const trimmed = part.trim();
            if (trimmed.length > 2) {
                ingredients.push(trimmed);
            }
        }
    }

    // Last resort: if we still don't have good separation, return original
    if (ingredients.length < 2) {
        return [line];
    }

    return ingredients;
}

// FINAL: Better separation logic for ingredients vs instructions
function parseIngredientsAndInstructionsFinal(lines) {
    const ingredients = [];
    const instructions = [];
    let description = '';

    console.log(`\n--- PARSING ${lines.length} SEPARATED LINES ---`);

    // Track whether we've started finding instructions
    let foundFirstInstruction = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip empty lines
        if (!line.trim()) continue;

        console.log(`Line ${i}: "${line}"`);

        // Check if this is definitely an instruction
        if (isDefinitelyAnInstruction(line)) {
            instructions.push(line.trim());
            foundFirstInstruction = true;
            console.log(`  ✅ INSTRUCTION: ${line.substring(0, 50)}...`);
            continue;
        }

        // If we haven't found instructions yet, try to parse as ingredient
        if (!foundFirstInstruction) {
            const parsed = parseIngredientLineFinal(line);
            if (parsed) {
                ingredients.push(parsed);
                console.log(`  ✅ INGREDIENT: ${parsed.amount} ${parsed.unit} ${parsed.name}`);
                continue;
            }
        }

        // If we've already found instructions, everything else is probably instructions
        if (foundFirstInstruction) {
            instructions.push(line.trim());
            console.log(`  ⚠️ INSTRUCTION (after first): ${line.substring(0, 50)}...`);
            continue;
        }

        // Default: if unclear, try ingredient first, then instruction
        const parsed = parseIngredientLineFinal(line);
        if (parsed) {
            ingredients.push(parsed);
            console.log(`  ⚠️ INGREDIENT (default): ${parsed.amount} ${parsed.unit} ${parsed.name}`);
        } else {
            instructions.push(line.trim());
            console.log(`  ⚠️ INSTRUCTION (default): ${line.substring(0, 50)}...`);
        }
    }

    console.log(`--- PARSING COMPLETE: ${ingredients.length} ingredients, ${instructions.length} instructions ---\n`);

    return { ingredients, instructions, description };
}


function parseRecipeWithFixedLogic(section, volume) {
    console.log('\n=== PARSING RECIPE SECTION ===');

    // Split into lines and clean them up
    const allLines = section.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (allLines.length < 2) {
        console.log('❌ Section too short');
        return null;
    }

    const recipe = {
        title: '',
        description: '',
        ingredients: [],
        instructions: [],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: 'medium',
        tags: ['comfort-food'],
        source: `Doc Bear's Comfort Food Survival Guide Volume ${volume}`,
        isPublic: false
    };

    // STEP 1: Find the title - look for lines with ** markers or first meaningful line
    let titleIndex = -1;
    for (let i = 0; i < Math.min(allLines.length, 5); i++) {
        const line = allLines[i];

        // Check if line has ** markers
        if (line.includes('**') && line.length > 3) {
            recipe.title = line.replace(/\*\*/g, '').trim();
            titleIndex = i;
            console.log(`✅ Found title with ** at line ${i}: "${recipe.title}"`);
            break;
        }

        // Otherwise check if it's a valid title
        if (isValidRecipeTitle(line)) {
            recipe.title = line;
            titleIndex = i;
            console.log(`✅ Found title at line ${i}: "${recipe.title}"`);
            break;
        }
    }

    // If no title found, use first line
    if (titleIndex === -1 && allLines.length > 0) {
        recipe.title = allLines[0].replace(/[^\w\s'&-]/g, '').trim();
        titleIndex = 0;
        console.log(`⚠️ Using first line as title: "${recipe.title}"`);
    }

    if (!recipe.title) {
        console.log('❌ Could not find valid title');
        return null;
    }

    // STEP 2: Process remaining lines - use MUCH more accurate ingredient detection
    const contentLines = allLines.slice(titleIndex + 1);
    console.log(`Processing ${contentLines.length} content lines after title`);

    // STEP 3: Separate ingredients from instructions using improved logic
    const { ingredients, instructions, description } = parseIngredientsAndInstructionsFixed(contentLines);

    recipe.ingredients = ingredients;
    recipe.instructions = instructions;
    recipe.description = description;

    if (recipe.ingredients.length === 0 && recipe.instructions.length === 0) {
        console.log('❌ No ingredients or instructions found');
        return null;
    }

    console.log(`✅ Successfully parsed recipe with ${recipe.ingredients.length} ingredients and ${recipe.instructions.length} instructions`);
    return recipe;
}

// FIXED: Much better separation logic
function parseIngredientsAndInstructionsFixed(lines) {
    const ingredients = [];
    const instructions = [];
    let description = '';

    console.log(`\n--- PARSING ${lines.length} CONTENT LINES ---`);

    // First pass: identify all potential ingredients by looking for measurement patterns
    const potentialIngredients = [];
    const potentialInstructions = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip empty lines
        if (!line.trim()) continue;

        console.log(`Analyzing line ${i}: "${line}"`);

        // Use much more accurate ingredient detection
        if (isDefinitelyAnIngredient(line)) {
            potentialIngredients.push(line);
            console.log(`  ✅ DEFINITELY INGREDIENT: ${line}`);
        } else if (isDefinitelyAnInstruction(line)) {
            potentialInstructions.push(line);
            console.log(`  ✅ DEFINITELY INSTRUCTION: ${line}`);
        } else {
            // For ambiguous lines, make a best guess based on context
            if (potentialIngredients.length > 0 && potentialInstructions.length === 0) {
                // We're probably still in ingredients section
                const parsed = parseIngredientLineFixed(line);
                if (parsed) {
                    potentialIngredients.push(line);
                    console.log(`  ⚠️ PROBABLY INGREDIENT: ${line}`);
                } else {
                    potentialInstructions.push(line);
                    console.log(`  ⚠️ PROBABLY INSTRUCTION: ${line}`);
                }
            } else {
                potentialInstructions.push(line);
                console.log(`  ⚠️ DEFAULT TO INSTRUCTION: ${line}`);
            }
        }
    }

    // Parse ingredients
    for (const ingredientLine of potentialIngredients) {
        const parsed = parseIngredientLineFixed(ingredientLine);
        if (parsed) {
            ingredients.push(parsed);
            console.log(`  ✅ Parsed ingredient: ${parsed.amount} ${parsed.unit} ${parsed.name}`);
        }
    }

    // Add instructions
    for (const instructionLine of potentialInstructions) {
        instructions.push(instructionLine.trim());
    }

    console.log(`--- PARSING COMPLETE: ${ingredients.length} ingredients, ${instructions.length} instructions ---\n`);

    return { ingredients, instructions, description };
}

// FIXED: Much more accurate ingredient detection
function isDefinitelyAnIngredient(line) {
    try {
        const cleanLine = line.trim();

        // Strong indicators this is an ingredient
        const strongIngredientPatterns = [
            // Starts with number + unit + ingredient
            /^(\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+\.\d+|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+(cup|cups|tsp|tbsp|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|qt|quart|gallon|stick|sticks|clove|cloves|can|jar)\s+/i,

            // Starts with number + common ingredient
            /^(\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+\.\d+|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+(egg|eggs|tomato|tomatoes|onion|onions|garlic|butter|flour|milk|cream|cheese|water|wine|oil|sugar|salt|pepper)\b/i,
        ];

        // Strong indicators this is NOT an ingredient
        const strongNonIngredientPatterns = [
            // Clearly instructional language
            /^(using|in a|heat|cook|add the|melt|stir|bring|place|remove|warm|fill|blend|rinse|cut|combine|mix|grate|set aside|pour|strain|repeat|occasionally|slow|to give|once|some people|as it|allow)/i,

            // Contains instruction timing
            /\b(for \d+\s*(minutes?|hours?)|until|then|while|as it|when|after|degrees?|°F|°C|simmering|boiling)/i,

            // Section headers
            /method$/i,
            /attention:/i,
            /^\*\*.*\*\*$/
        ];

        // Check patterns
        const matchesIngredient = strongIngredientPatterns.some(pattern => pattern.test(cleanLine));
        const matchesNonIngredient = strongNonIngredientPatterns.some(pattern => pattern.test(cleanLine));

        // Line too long is probably instruction
        if (cleanLine.length > 100) {
            return false;
        }

        return matchesIngredient && !matchesNonIngredient;
    } catch (error) {
        console.error('Error in isDefinitelyAnIngredient:', error);
        return false;
    }
}

// FINAL: More accurate instruction detection
function isDefinitelyAnInstruction(line) {
    try {
        const cleanLine = line.trim();

        // Strong indicators this is an instruction
        const strongInstructionPatterns = [
            // Starts with clear instruction verbs
            /^(using|heat|cook|add|melt|stir|bring|place|remove|warm|fill|blend|rinse|cut|combine|mix|grate|set aside|pour|strain|repeat|occasionally|slow|in a|to give|once|some people|as it|allow)/i,

            // Contains timing/process words
            /\b(for \d+\s*(minutes?|hours?)|until|then|while|as it|when|after|degrees?|°F|°C|simmering|boiling)/i,

            // Multiple sentences (instructions tend to be longer)
            /\.\s+[A-Z]/,

            // Method headers
            /method$/i,
            /attention:/i
        ];

        return strongInstructionPatterns.some(pattern => pattern.test(cleanLine));
    } catch (error) {
        console.error('Error in isDefinitelyAnInstruction:', error);
        return false;
    }
}

// FINAL: Better ingredient parsing that handles "1 1/2" correctly
function parseIngredientLineFinal(line) {
    try {
        // Remove list markers and extra spaces
        let cleanLine = line.replace(/^[-•*]\s*/, '').trim();

        if (cleanLine.length < 2) return null;

        // FIXED: Handle "1 1/2" pattern correctly
        // Pattern: "1 1/2 cups flour" should become "1.5 cups flour"
        cleanLine = cleanLine.replace(/^(\d+)\s+(\d+)\/(\d+)\s+/, (match, whole, num, den) => {
            const decimal = parseInt(whole) + (parseInt(num) / parseInt(den));
            return `${decimal} `;
        });

        // Also handle standalone fractions like "1/2 cups"
        cleanLine = cleanLine.replace(/^(\d+)\/(\d+)\s+/, (match, num, den) => {
            const decimal = parseInt(num) / parseInt(den);
            return `${decimal} `;
        });

        console.log(`    Parsing: "${line}" -> cleaned: "${cleanLine}"`);

        // Try to parse amount, unit, and name
        const patterns = [
            // Pattern 1: Number + Unit + Ingredient (e.g., "2 cups flour")
            /^(\d+(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+(cup|cups|tsp|tbsp|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|qt|quart|gallon|stick|sticks|clove|cloves|can|jar)\s+(.+)$/i,

            // Pattern 2: Number + Ingredient (no unit) (e.g., "3 eggs")
            /^(\d+(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+(.+)$/,

            // Pattern 3: Just ingredient name (e.g., "Salt and pepper to taste")
            /^(.+)$/
        ];

        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            const match = cleanLine.match(pattern);
            if (match) {
                let amount = 1;
                let unit = '';
                let name = '';

                if (i === 0) {
                    // Pattern 1: amount + unit + name
                    amount = convertFractionToDecimalFinal(match[1]);
                    unit = match[2];
                    name = match[3].trim();
                } else if (i === 1) {
                    // Pattern 2: amount + name (no unit)
                    amount = convertFractionToDecimalFinal(match[1]);
                    unit = '';
                    name = match[2].trim();
                } else {
                    // Pattern 3: just name
                    amount = 1;
                    unit = '';
                    name = match[1].trim();
                }

                // Don't create ingredients for things that are clearly instructions
                if (isDefinitelyAnInstruction(name)) {
                    return null;
                }

                // Filter out obvious non-ingredients in the name
                if (name.length < 2 || /^(and|or|then|until|while)$/i.test(name)) {
                    return null;
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
        console.error('Error in parseIngredientLineFinal:', error);
        return null;
    }
}

// FIXED: Much better ingredient parsing that handles "1 1/2" correctly
function parseIngredientLineFixed(line) {
    try {
        // Remove list markers and extra spaces
        let cleanLine = line.replace(/^[-•*]\s*/, '').trim();

        if (cleanLine.length < 2) return null;

        // FIXED: Handle "1 1/2" pattern correctly
        // Pattern: "1 1/2 cups flour" should become "1.5 cups flour"
        cleanLine = cleanLine.replace(/^(\d+)\s+(\d+)\/(\d+)\s+/, (match, whole, num, den) => {
            const decimal = parseInt(whole) + (parseInt(num) / parseInt(den));
            return `${decimal} `;
        });

        // Also handle standalone fractions like "1/2 cups"
        cleanLine = cleanLine.replace(/^(\d+)\/(\d+)\s+/, (match, num, den) => {
            const decimal = parseInt(num) / parseInt(den);
            return `${decimal} `;
        });

        console.log(`Parsing ingredient line: "${line}" -> cleaned: "${cleanLine}"`);

        // Try to parse amount, unit, and name
        const patterns = [
            // Pattern 1: Number + Unit + Ingredient (e.g., "2 cups flour")
            /^(\d+(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+(cup|cups|tsp|tbsp|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|qt|quart|gallon|stick|sticks|clove|cloves|can|jar)\s+(.+)$/i,

            // Pattern 2: Number + Ingredient (no unit) (e.g., "3 eggs")
            /^(\d+(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+(.+)$/,

            // Pattern 3: Just ingredient name (e.g., "Salt and pepper to taste")
            /^(.+)$/
        ];

        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            const match = cleanLine.match(pattern);
            if (match) {
                let amount = 1;
                let unit = '';
                let name = '';

                if (i === 0) {
                    // Pattern 1: amount + unit + name
                    amount = convertFractionToDecimalFixed(match[1]);
                    unit = match[2];
                    name = match[3].trim();
                } else if (i === 1) {
                    // Pattern 2: amount + name (no unit)
                    amount = convertFractionToDecimalFixed(match[1]);
                    unit = '';
                    name = match[2].trim();
                } else {
                    // Pattern 3: just name
                    amount = 1;
                    unit = '';
                    name = match[1].trim();
                }

                // Don't create ingredients for things that are clearly instructions
                if (isDefinitelyAnInstruction(name)) {
                    return null;
                }

                // Filter out obvious non-ingredients in the name
                if (name.length < 2 || /^(and|or|then|until|while)$/i.test(name)) {
                    return null;
                }

                console.log(`  ✅ Parsed: ${amount} ${unit} ${name}`);

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
        console.error('Error in parseIngredientLineFixed:', error);
        return null;
    }
}

// NEW: Aggressive parsing for difficult sections
function parseRecipeAggressively(section, volume) {
    console.log('\n🔧 AGGRESSIVE PARSING MODE');

    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length < 2) {
        console.log('❌ Not enough lines for aggressive parsing');
        return null;
    }

    const recipe = {
        title: '',
        description: '',
        ingredients: [],
        instructions: [],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: 'medium',
        tags: ['comfort-food'],
        source: `Doc Bear's Comfort Food Survival Guide Volume ${volume}`,
        isPublic: false
    };

    // Take first line as title, no matter what
    recipe.title = lines[0].replace(/^\*\*|\*\*$/g, '').replace(/[^\w\s'&-]/g, '').trim();
    console.log(`🔧 Aggressive title: "${recipe.title}"`);

    // Process all remaining lines - be very liberal about what counts as ingredients
    const remainingLines = lines.slice(1);

    for (let i = 0; i < remainingLines.length; i++) {
        const line = remainingLines[i];

        // Try to parse as ingredient first - be very liberal
        if (hasAnyMeasurement(line)) {
            const ingredient = parseIngredientAggressively(line);
            if (ingredient) {
                recipe.ingredients.push(ingredient);
                console.log(`🔧 Aggressive ingredient: ${ingredient.amount} ${ingredient.unit} ${ingredient.name}`);
                continue;
            }
        }

        // If it's not an ingredient, it's probably an instruction
        if (line.length > 10) {
            recipe.instructions.push(line);
            console.log(`🔧 Aggressive instruction: ${line.substring(0, 50)}...`);
        }
    }

    if (recipe.ingredients.length === 0 && recipe.instructions.length === 0) {
        console.log('❌ Aggressive parsing failed - no content found');
        return null;
    }

    return recipe;
}

// Helper: Check if line has any measurement at all
function hasAnyMeasurement(line) {
    try {
        return /(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s*(cup|cups|tsp|tbsp|oz|lb|lbs|stick|sticks|qt|quart|gallon|clove|cloves|can|jar|\w+)/i.test(line);
    } catch (error) {
        console.error('Error in hasAnyMeasurement:', error);
        return /\d+\s*(cup|cups|tsp|tbsp|oz|lb)/i.test(line);
    }
}

// Helper: Very liberal ingredient parsing
function parseIngredientAggressively(line) {
    try {
        const cleanLine = line.replace(/^\d+\s+/, '').trim();

        // Just look for any number followed by anything
        const match = cleanLine.match(/^(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s*(.*)$/);

        if (match) {
            const amount = convertFractionToDecimal(match[1]);
            const rest = match[2].trim();

            // Try to separate unit from name
            const unitMatch = rest.match(/^(cup|cups|tsp|tbsp|oz|lb|lbs|stick|sticks|qt|quart|gallon|clove|cloves|can|jar)\s+(.+)$/i);

            if (unitMatch) {
                return {
                    amount: amount,
                    unit: unitMatch[1],
                    name: unitMatch[2],
                    category: '',
                    alternatives: [],
                    optional: false
                };
            } else {
                return {
                    amount: amount,
                    unit: '',
                    name: rest,
                    category: '',
                    alternatives: [],
                    optional: false
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Error in parseIngredientAggressively:', error);
        return null;
    }
}

// COMPLETELY REWRITTEN PARSER - Much more accurate
function parseRecipeWithImprovedStructure(section, volume) {
    console.log('\n=== PARSING RECIPE SECTION ===');
    console.log('Raw section:', section.substring(0, 300) + '...');

    // First, try to separate concatenated ingredients by looking for patterns
    const preprocessedSection = preprocessConcatenatedIngredients(section);
    console.log('After preprocessing:', preprocessedSection.substring(0, 300) + '...');

    // Split into lines and clean them up
    const allLines = preprocessedSection.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (allLines.length < 2) {
        console.log('❌ Section too short');
        return null;
    }

    const recipe = {
        title: '',
        description: '',
        ingredients: [],
        instructions: [],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: 'medium',
        tags: ['comfort-food'],
        source: `Doc Bear's Comfort Food Survival Guide Volume ${volume}`,
        isPublic: false
    };

    // STEP 1: Find the title (first meaningful line)
    let titleIndex = -1;
    for (let i = 0; i < Math.min(allLines.length, 3); i++) {
        const line = allLines[i];
        // Remove markdown formatting
        const cleanTitle = line.replace(/^\*\*|\*\*$/g, '').trim();

        if (isValidRecipeTitle(cleanTitle)) {
            recipe.title = cleanTitle;
            titleIndex = i;
            console.log(`✅ Found title at line ${i}: "${recipe.title}"`);
            break;
        }
    }

    // If no title found, use first line and clean it
    if (titleIndex === -1 && allLines.length > 0) {
        recipe.title = allLines[0].replace(/^\*\*|\*\*$/g, '').replace(/[^\w\s'&-]/g, '').trim();
        titleIndex = 0;
        console.log(`⚠️ Using first line as title: "${recipe.title}"`);
    }

    if (!recipe.title) {
        console.log('❌ Could not find valid title');
        return null;
    }

    // STEP 2: Process remaining lines after title
    const contentLines = allLines.slice(titleIndex + 1);
    console.log(`Processing ${contentLines.length} content lines after title`);

    // STEP 3: Separate ingredients from instructions using better logic
    const { ingredients, instructions, description } = parseIngredientsAndInstructions(contentLines);

    recipe.ingredients = ingredients;
    recipe.instructions = instructions;
    recipe.description = description;

    // More lenient validation
    if (recipe.ingredients.length === 0 && recipe.instructions.length === 0) {
        console.log('❌ No ingredients or instructions found');
        console.log('Content lines were:', contentLines);
        return null;
    }

    console.log(`✅ Successfully parsed recipe with ${recipe.ingredients.length} ingredients and ${recipe.instructions.length} instructions`);

    return recipe;
}

// NEW: Preprocess concatenated ingredients
function preprocessConcatenatedIngredients(text) {
    // Look for patterns where ingredients are concatenated like "2 cups flour1 cup sugar"
    // Insert line breaks before numbers that follow letters/units
    let processed = text;

    // Pattern: number + unit + ingredient + number (next ingredient starts)
    // Example: "2 cups flour1 cup" -> "2 cups flour\n1 cup"
    processed = processed.replace(/([a-zA-Z])\s*(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+(cup|cups|tsp|tbsp|oz|lb|lbs|stick|sticks|qt|quart|gallon)/gi, '$1\n$2 $3');

    // Pattern: ingredient name + number (next ingredient starts)
    // Example: "olive oil1 cup" -> "olive oil\n1 cup"
    processed = processed.replace(/([a-zA-Z])\s*(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+([a-zA-Z])/g, '$1\n$2 $3');

    // Pattern: unit + ingredient + number
    // Example: "butter1 qt heavy" -> "butter\n1 qt heavy"
    processed = processed.replace(/(butter|oil|cream|cheese|sauce|flour|sugar|salt|pepper)\s*(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+/gi, '$1\n$2 ');

    return processed;
}

// NEW: Better separation of ingredients vs instructions
function parseIngredientsAndInstructions(lines) {
    const ingredients = [];
    const instructions = [];
    let description = '';

    let currentSection = 'unknown';
    let foundFirstIngredient = false;
    let foundFirstInstruction = false;

    console.log(`\n--- PARSING ${lines.length} CONTENT LINES ---`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip empty lines
        if (!line.trim()) continue;

        // Check what type of line this is
        const isIngredient = looksLikeIngredient(line);
        const isInstruction = looksLikeInstruction(line);

        console.log(`Line ${i}: "${line.substring(0, 60)}..." - Ingredient: ${isIngredient}, Instruction: ${isInstruction}`);

        // Try to parse as ingredient first (unless we're clearly in instructions section)
        if (isIngredient && !foundFirstInstruction) {
            const parsed = parseIngredientLine(line);
            if (parsed) {
                ingredients.push(parsed);
                foundFirstIngredient = true;
                currentSection = 'ingredients';
                console.log(`  ✅ Added ingredient: ${parsed.amount} ${parsed.unit} ${parsed.name}`);
                continue;
            }
        }

        // Check if this is clearly an instruction
        if (isInstruction) {
            instructions.push(line.trim());
            foundFirstInstruction = true;
            currentSection = 'instructions';
            console.log(`  ✅ Added instruction: ${line.substring(0, 50)}...`);
            continue;
        }

        // If we've found ingredients but this doesn't look like either, it might be an instruction
        if (foundFirstIngredient && !isIngredient) {
            instructions.push(line.trim());
            foundFirstInstruction = true;
            currentSection = 'instructions';
            console.log(`  ⚠️ Added as instruction (after ingredients): ${line.substring(0, 50)}...`);
            continue;
        }

        // If we haven't found anything yet, check if this could be a description
        if (!foundFirstIngredient && !foundFirstInstruction && line.length < 200 && !description) {
            description = line;
            console.log(`  📝 Set as description: ${line}`);
            continue;
        }

        // Last resort: try to parse as ingredient even if it doesn't look perfect
        if (!foundFirstInstruction) {
            const parsed = parseIngredientLine(line);
            if (parsed && parsed.name.length > 2) {
                ingredients.push(parsed);
                foundFirstIngredient = true;
                console.log(`  ⚠️ Added as ingredient (last resort): ${parsed.amount} ${parsed.unit} ${parsed.name}`);
                continue;
            }
        }

        // If all else fails, add to instructions
        instructions.push(line.trim());
        console.log(`  ⚠️ Added as instruction (fallback): ${line.substring(0, 50)}...`);
    }

    console.log(`--- PARSING COMPLETE: ${ingredients.length} ingredients, ${instructions.length} instructions ---\n`);

    return { ingredients, instructions, description };
}

// IMPROVED: Better ingredient detection
function looksLikeIngredient(line) {
    try {
        // Remove common prefixes that might confuse the parser
        const cleanLine = line.replace(/^\d+\s*/, '').trim();

        // Patterns that indicate this is an ingredient
        const ingredientPatterns = [
            // Starts with number + unit (more flexible)
            /^(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+(cup|cups|tsp|tsp\.|tbsp|tbsp\.|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|qt|quart|quarts|gallon|gallons|stick|sticks|clove|cloves|can|jar)\b/i,

            // Just starts with a measurement (more flexible)
            /^(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+\w/i,

            // Contains common ingredient words anywhere in the line
            /\b(flour|butter|milk|cream|cheese|tomato|tomatoes|onion|onions|garlic|oil|olive oil|salt|pepper|sugar|egg|eggs|chicken|beef|pork|wine|water|sauce|powder|seasoning|basil|oregano|parmesan)\b/i,

            // Looks like "X of Y" pattern (e.g., "2 Cups of flour")
            /^\d+.*\s+(of\s+)?\w+$/i
        ];

        // Patterns that indicate this is NOT an ingredient (more restrictive)
        const notIngredientPatterns = [
            // Clearly instruction sentences (more specific)
            /^(combine all ingredients|heat oil|cook over|in a .*saucepan|add the|melt the|stir until|bring to|used as ingredient)/i,

            // Contains clear instruction timing/temperature
            /\b(for \d+\s*(minutes?|hours?)|at \d+\s*degrees?|°F|°C|until hot|until tender)\b/i,

            // Contains multiple sentences
            /[.!?].*[.!?]/
        ];

        // Check if line is too long to be an ingredient
        if (line.length > 80) {
            return false;
        }

        // Check patterns
        const matchesIngredient = ingredientPatterns.some(pattern => pattern.test(cleanLine));
        const matchesNonIngredient = notIngredientPatterns.some(pattern => pattern.test(line));

        // More lenient: if it matches ingredient pattern and doesn't clearly match non-ingredient, consider it an ingredient
        return matchesIngredient && !matchesNonIngredient;
    } catch (error) {
        console.error('Error in looksLikeIngredient:', error);
        // Fallback: simple check for measurements at start of line
        return /^\d+\s+(cup|cups|tsp|tbsp|oz|lb)\s+\w/i.test(line);
    }
}

// IMPROVED: Better instruction detection
function looksLikeInstruction(line) {
    try {
        // Common instruction starters
        const instructionStarters = /^(combine|heat|cook|bake|mix|stir|add|melt|bring|place|remove|using|set to|continue|repeat|pour|crush|strain|grate|slowly|next|wash|dip|slip|trim|cut|transfer|being|until)/i;

        // Contains instruction timing/process words
        const instructionWords = /\b(minutes?|hours?|degrees?|°F|°C|then|until|to avoid|being careful|approximately|at a time|boil|simmer|medium-high|heat)\b/i;

        // Should not start with measurements (those are likely ingredients)
        const startsWithMeasurement = /^(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s/;

        return (instructionStarters.test(line) || instructionWords.test(line))
            && !startsWithMeasurement.test(line)
            && line.length > 10; // Instructions should be reasonably long
    } catch (error) {
        console.error('Error in looksLikeInstruction:', error);
        // Fallback: simple check for instruction words
        return /^(combine|heat|cook|bake|mix|stir|add)/i.test(line) && line.length > 10;
    }
}

// IMPROVED: Better title validation
function isValidRecipeTitle(title) {
    try {
        // Filter out obvious non-titles
        const invalidPatterns = [
            /^(using|heat|cook|add|melt|stir|bring|place|remove|warm|fill|combine|mix|in a|with a|set|allow)/i,
            /\b(minutes?|hours?|degrees?)\b/i,
            /^\d+\s*(cup|tsp|tbsp|oz|lb)/i, // Measurements
            /method$/i,
            /attention:/i,
            /^\*\*.*\*\*$/
        ];

        // Must not match any invalid patterns
        if (invalidPatterns.some(pattern => pattern.test(title))) {
            return false;
        }

        // Should be reasonable length
        if (title.length < 3 || title.length > 100) {
            return false;
        }

        // Should contain at least one letter
        if (!/[a-zA-Z]/.test(title)) {
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in isValidRecipeTitle:', error);
        return title.length >= 3 && title.length <= 100 && /[a-zA-Z]/.test(title);
    }
}

// IMPROVED: Better ingredient parsing - handles the "1 1 1/2" issue
function parseIngredientLine(line) {
    try {
        // Remove list markers and leading numbers that might be line numbers
        let cleanLine = line.replace(/^[-•*]\s*/, '').replace(/^\d+\s+/, '').trim();

        if (cleanLine.length < 2) return null;

        // Handle the "1 1 1/2 cups" pattern (remove the duplicate "1")
        cleanLine = cleanLine.replace(/^1\s+(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+/, '$1 ');

        // Try to parse amount, unit, and name
        const patterns = [
            // Pattern 1: Number + Unit + Ingredient (e.g., "2 cups flour")
            /^(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+(cup|cups|tsp|tsp\.|tbsp|tbsp\.|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|qt|quart|quarts|gallon|gallons|stick|sticks|clove|cloves|can|jar)\s+(.+)$/i,

            // Pattern 2: Number + Ingredient (no unit) (e.g., "3 eggs")
            /^(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+(.+)$/,

            // Pattern 3: Just ingredient name (e.g., "Salt and pepper to taste")
            /^(.+)$/
        ];

        for (const pattern of patterns) {
            const match = cleanLine.match(pattern);
            if (match) {
                let amount = 1;
                let unit = '';
                let name = '';

                if (pattern === patterns[0]) {
                    // Pattern 1: amount + unit + name
                    amount = convertFractionToDecimal(match[1]);
                    unit = match[2];
                    name = match[3].trim();
                } else if (pattern === patterns[1]) {
                    // Pattern 2: amount + name (no unit)
                    amount = convertFractionToDecimal(match[1]);
                    unit = '';
                    name = match[2].trim();
                } else {
                    // Pattern 3: just name
                    amount = 1;
                    unit = '';
                    name = match[1].trim();
                }

                // Don't create ingredients for things that are clearly instructions
                if (looksLikeInstruction(name)) {
                    return null;
                }

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

// FINAL: Better fraction conversion
function convertFractionToDecimal(fractionStr) {
    if (fractionStr === '½') return 0.5;
    if (fractionStr === '¼') return 0.25;
    if (fractionStr === '¾') return 0.75;
    if (fractionStr === '⅓') return 0.33;
    if (fractionStr === '⅔') return 0.67;
    if (fractionStr === '⅛') return 0.125;
    if (fractionStr === '⅜') return 0.375;
    if (fractionStr === '⅝') return 0.625;
    if (fractionStr === '⅞') return 0.875;

    // Handle regular fractions like "1/2"
    if (fractionStr.includes('/')) {
        const [num, den] = fractionStr.split('/').map(Number);
        return num / den;
    }

    return parseFloat(fractionStr) || 1;
}

// FIXED: Better fraction conversion
function convertFractionToDecimalFixed(fractionStr) {
    if (fractionStr === '½') return 0.5;
    if (fractionStr === '¼') return 0.25;
    if (fractionStr === '¾') return 0.75;
    if (fractionStr === '⅓') return 0.33;
    if (fractionStr === '⅔') return 0.67;
    if (fractionStr === '⅛') return 0.125;
    if (fractionStr === '⅜') return 0.375;
    if (fractionStr === '⅝') return 0.625;
    if (fractionStr === '⅞') return 0.875;

    // Handle regular fractions like "1/2"
    if (fractionStr.includes('/')) {
        const [num, den] = fractionStr.split('/').map(Number);
        return num / den;
    }

    return parseFloat(fractionStr) || 1;
}

// FINAL: Better fraction conversion
function convertFractionToDecimalFinal(fractionStr) {
    if (fractionStr === '½') return 0.5;
    if (fractionStr === '¼') return 0.25;
    if (fractionStr === '¾') return 0.75;
    if (fractionStr === '⅓') return 0.33;
    if (fractionStr === '⅔') return 0.67;
    if (fractionStr === '⅛') return 0.125;
    if (fractionStr === '⅜') return 0.375;
    if (fractionStr === '⅝') return 0.625;
    if (fractionStr === '⅞') return 0.875;

    // Handle regular fractions like "1/2"
    if (fractionStr.includes('/')) {
        const [num, den] = fractionStr.split('/').map(Number);
        return num / den;
    }

    return parseFloat(fractionStr) || 1;
}