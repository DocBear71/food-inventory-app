// file: /src/app/api/recipes/extract/route.js - v8 FIXED

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
        isPublic: false,
        category: 'entrees'
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
    const {ingredients, instructions, description} = parseIngredientsAndInstructionsFinal(separatedLines);

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

    return {ingredients, instructions, description};
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
        isPublic: false,
        category: 'entrees'
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
    const {ingredients, instructions, description} = parseIngredientsAndInstructionsFixed(contentLines);

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

    return {ingredients, instructions, description};
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
        isPublic: false,
        category: 'entrees'
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

// Enhanced parsing function with delimiter support and fallback
function parseRecipeWithImprovedStructure(section, volume) {
    console.log('\n=== PARSING RECIPE SECTION ===');
    console.log('Raw section:', section.substring(0, 300) + '...');

    // STEP 1: Check if this section uses the new delimiter format
    if (hasDelimiters(section)) {
        console.log('✅ Delimiters detected, using delimiter-based parsing');
        const delimiterResult = parseRecipeWithDelimiters(section, volume);
        if (delimiterResult) {
            return delimiterResult;
        }
        console.log('⚠️ Delimiter parsing failed, falling back to legacy method');
    } else {
        console.log('ℹ️ No delimiters found, using legacy parsing method');
    }

    // STEP 2: Fall back to your existing parsing logic
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
        isPublic: false,
        category: 'entrees'
    };

    // STEP 3: Find the title (first meaningful line)
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

    // STEP 4: Process remaining lines after title
    const contentLines = allLines.slice(titleIndex + 1);
    console.log(`Processing ${contentLines.length} content lines after title`);

    // STEP 5: Separate ingredients from instructions using better logic
    const {ingredients, instructions, description} = parseIngredientsAndInstructions(contentLines);

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

// Recipe Parser with Classification System

// Recipe categories
const RECIPE_CATEGORIES = {
    'seasonings': 'Seasonings',
    'sauces': 'Sauces',
    'salad-dressings': 'Salad Dressings',
    'marinades': 'Marinades',
    'ingredients': 'Basic Ingredients',
    'entrees': 'Entrees',
    'side-dishes': 'Side Dishes',
    'soups': 'Soups',
    'sandwiches': 'Sandwiches',
    'appetizers': 'Appetizers',
    'desserts': 'Desserts',
    'breads': 'Breads',
    'pizza-dough': 'Pizza Dough',
    'specialty-items': 'Specialty Items',
    'beverages': 'Beverages',
    'breakfast': 'Breakfast'
};

// Parse recipes from extracted text with classification
function parseRecipesFromText(text, volume) {
    const recipes = [];

    try {
        console.log('Starting delimiter-based recipe parsing with classification...');
        console.log('Text preview:', text.substring(0, 500));

        // Clean up the text first
        const cleanText = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        // Split by the recipe break delimiter
        const recipeSections = cleanText.split(/---\s*RECIPE\s*BREAK\s*---/i);

        console.log(`Split by RECIPE BREAK found ${recipeSections.length} sections`);

        // Process each section (skip first if it's empty)
        for (let i = 0; i < recipeSections.length; i++) {
            const section = recipeSections[i].trim();

            console.log(`\n--- PROCESSING SECTION ${i + 1} ---`);
            console.log(`Section length: ${section.length}`);
            console.log(`Section preview: "${section.substring(0, 200)}..."`);

            if (section.length < 20) {
                console.log('❌ Section too short, skipping');
                continue;
            }

            const recipe = parseRecipeWithClassification(section, volume);
            if (recipe && recipe.title) {
                recipes.push(recipe);
                console.log(`✅ Successfully parsed: "${recipe.title}" [${recipe.category}]`);
                console.log(`   - ${recipe.ingredients.length} ingredients`);
                console.log(`   - ${recipe.instructions.length} instructions`);
            } else {
                console.log(`❌ Failed to parse section ${i + 1}`);
            }
        }

        console.log(`\nFINAL RESULT: ${recipes.length} recipes parsed successfully`);

    } catch (error) {
        console.error('Error parsing recipes:', error);
    }

    return recipes;
}

// Enhanced parsing function with classification and delimiter support
function parseRecipeWithClassification(section, volume) {
    console.log('\n=== PARSING RECIPE SECTION WITH CLASSIFICATION ===');
    console.log('Raw section:', section.substring(0, 300) + '...');

    // STEP 1: Check if this section uses the new delimiter format
    if (hasDelimiters(section)) {
        console.log('✅ Delimiters detected, using delimiter-based parsing');
        const delimiterResult = parseRecipeWithDelimiters(section, volume);
        if (delimiterResult) {
            // Add classification
            delimiterResult.category = classifyRecipe(delimiterResult);
            console.log(`🏷️ Auto-classified as: ${delimiterResult.category}`);
            return delimiterResult;
        }
        console.log('⚠️ Delimiter parsing failed, falling back to legacy method');
    } else {
        console.log('ℹ️ No delimiters found, using legacy parsing method');
    }

    // STEP 2: Fall back to existing parsing logic
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
        isPublic: false,
        category: 'entrees' // Default category
    };

    // Find the title
    let titleIndex = -1;
    for (let i = 0; i < Math.min(allLines.length, 3); i++) {
        const line = allLines[i];
        const cleanTitle = line.replace(/^\*\*|\*\*$/g, '').trim();

        if (isValidRecipeTitle(cleanTitle)) {
            recipe.title = cleanTitle;
            titleIndex = i;
            console.log(`✅ Found title at line ${i}: "${recipe.title}"`);
            break;
        }
    }

    if (titleIndex === -1 && allLines.length > 0) {
        recipe.title = allLines[0].replace(/^\*\*|\*\*$/g, '').replace(/[^\w\s'&-]/g, '').trim();
        titleIndex = 0;
        console.log(`⚠️ Using first line as title: "${recipe.title}"`);
    }

    if (!recipe.title) {
        console.log('❌ Could not find valid title');
        return null;
    }

    // Process remaining lines
    const contentLines = allLines.slice(titleIndex + 1);
    console.log(`Processing ${contentLines.length} content lines after title`);

    const { ingredients, instructions, description } = parseIngredientsAndInstructions(contentLines);

    recipe.ingredients = ingredients;
    recipe.instructions = instructions;
    recipe.description = description;

    // Add classification
    recipe.category = classifyRecipe(recipe);
    console.log(`🏷️ Auto-classified as: ${recipe.category}`);

    if (recipe.ingredients.length === 0 && recipe.instructions.length === 0) {
        console.log('❌ No ingredients or instructions found');
        return null;
    }

    console.log(`✅ Successfully parsed recipe with ${recipe.ingredients.length} ingredients and ${recipe.instructions.length} instructions`);

    return recipe;
}

// Parse individual recipe using delimiters with classification support
function parseRecipeWithDelimiters(section, volume) {
    console.log('\n=== PARSING RECIPE WITH DELIMITERS ===');

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
        isPublic: false,
        category: 'entrees' // Default category
    };

    try {
        // Check for explicit category in the section
        const categoryMatch = section.match(/--\s*category\s*--\s*\n\s*([^\n]+)/i);
        let explicitCategory = null;

        if (categoryMatch) {
            const categoryName = categoryMatch[1].trim().toLowerCase().replace(/\s+/g, '-');
            if (RECIPE_CATEGORIES[categoryName]) {
                explicitCategory = categoryName;
                console.log(`🏷️ Found explicit category: ${explicitCategory}`);
            }
        }

        // Split the section into parts based on delimiters
        const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        let currentSection = 'title';
        let titleFound = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            console.log(`Processing line ${i}: "${line}" (section: ${currentSection})`);

            // Check for section delimiters
            if (line.match(/^--\s*category\s*--$/i)) {
                currentSection = 'category';
                console.log('  ➡️ Switched to category section');
                continue;
            }

            if (line.match(/^--\s*ingredients\s*--$/i)) {
                currentSection = 'ingredients';
                console.log('  ➡️ Switched to ingredients section');
                continue;
            }

            if (line.match(/^--\s*instructions\s*--$/i)) {
                currentSection = 'instructions';
                console.log('  ➡️ Switched to instructions section');
                continue;
            }

            // Process based on current section
            if (currentSection === 'title' && !titleFound) {
                recipe.title = line.replace(/^\*\*|\*\*$/g, '').trim();
                titleFound = true;
                console.log(`  ✅ Found title: "${recipe.title}"`);
                currentSection = 'description';
                continue;
            }

            if (currentSection === 'description') {
                if (line.length > 0 && !line.match(/^--\s*(category|ingredients)\s*--$/i)) {
                    recipe.description = line;
                    console.log(`  📝 Found description: "${recipe.description}"`);
                }
                continue;
            }

            if (currentSection === 'category') {
                if (line.length > 0) {
                    const categoryName = line.trim().toLowerCase().replace(/\s+/g, '-');
                    if (RECIPE_CATEGORIES[categoryName]) {
                        explicitCategory = categoryName;
                        console.log(`  🏷️ Found category: "${explicitCategory}"`);
                    }
                }
                continue;
            }

            if (currentSection === 'ingredients') {
                const ingredient = parseIngredientLineDelimited(line);
                if (ingredient) {
                    recipe.ingredients.push(ingredient);
                    console.log(`  ✅ Added ingredient: ${ingredient.amount} ${ingredient.unit} ${ingredient.name}`);
                } else {
                    console.log(`  ⚠️ Could not parse ingredient: "${line}"`);
                }
                continue;
            }

            if (currentSection === 'instructions') {
                if (line.length > 0) {
                    recipe.instructions.push(line);
                    console.log(`  ✅ Added instruction: ${line.substring(0, 50)}...`);
                }
                continue;
            }
        }

        // Use explicit category if provided, otherwise auto-classify
        recipe.category = explicitCategory || classifyRecipe(recipe);

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

        console.log(`✅ Successfully parsed recipe: "${recipe.title}" [${recipe.category}]`);

        return recipe;

    } catch (error) {
        console.error('Error parsing recipe with delimiters:', error);
        return null;
    }
}

// Auto-classify recipe based on title and ingredients
function classifyRecipe(recipe) {
    const title = recipe.title.toLowerCase();
    const ingredientNames = recipe.ingredients.map(ing => ing.name.toLowerCase()).join(' ');
    const allText = (title + ' ' + ingredientNames).toLowerCase();

    console.log(`🔍 Classifying recipe: "${recipe.title}"`);
    console.log(`   Title: "${title}"`);
    console.log(`   Ingredients text: "${ingredientNames}"`);

    // Classification rules in order of specificity (FIXED ORDER)
    const classificationRules = [
        // Specialty Items - FIRST to catch Doc Bear's unique creations
        {
            category: 'specialty-items',
            patterns: [
                /\b(coca.cola|dr.pepper|jack daniels|whiskey|bourbon|rum|beer).*(?:chicken|pork|beef|fudge|sauce|marinade)\b/i,
                /\b(?:chicken|pork|beef|fudge|sauce|marinade).*(coca.cola|dr.pepper|jack daniels|whiskey|bourbon|rum|beer)\b/i,
                /\bDoc Bear.*(?:coca.cola|dr.pepper|jack daniels|whiskey|bourbon)\b/i,
                /\b(soda|cola|pepsi|sprite).*(?:chicken|pork|beef|tacos)\b/i,
                /\b(?:chicken|pork|beef|tacos).*(soda|cola|pepsi|sprite)\b/i,
                /\balcohol.*(?:fudge|dessert|sauce|marinade)\b/i,
                /\b(?:fudge|dessert|sauce|marinade).*(?:alcohol|whiskey|bourbon|rum)\b/i,
                /\bsoft tacos.*coca.cola\b/i,
                /\bpulled pork.*dr.pepper\b/i,
                /\bwhiskey.*fudge\b/i
            ],
            keywords: ['coca-cola chicken', 'dr pepper pork', 'jack daniels', 'whiskey fudge', 'cola tacos', 'bourbon', 'rum sauce']
        },

        // Soups - Check BEFORE seasonings to catch "soup"
        {
            category: 'soups',
            patterns: [
                /\b(soup|stew|chowder|bisque|broth|stock)\b/i,
                /\begg drop soup\b/i
            ],
            keywords: ['soup', 'stew', 'chowder', 'broth', 'egg drop soup']
        },

        // Sauces - Check BEFORE seasonings to catch "sauce"
        {
            category: 'sauces',
            patterns: [
                /\b(sauce|gravy|reduction|glaze)\b/i,
                /\b(tomato sauce|alfredo|cheese sauce|mushroom sauce|enchilada|marinara|salsa|pico de gallo)\b/i,
                /\bDoc Bear.*sauce\b/i
            ],
            keywords: ['sauce', 'gravy', 'alfredo', 'marinara', 'enchilada', 'salsa', 'pico de gallo', 'cheese sauce']
        },

        // Salad Dressings - Check BEFORE seasonings
        {
            category: 'salad-dressings',
            patterns: [
                /\b(dressing|vinaigrette)\b/i,
                /\bsalad.*dressing\b/i
            ],
            keywords: ['dressing', 'vinaigrette', 'salad dressing']
        },

        // Marinades - Check BEFORE seasonings
        {
            category: 'marinades',
            patterns: [
                /\b(marinade|marinating)\b/i
            ],
            keywords: ['marinade', 'marinating']
        },

        // Entrees - Check BEFORE seasonings to catch main dishes
        {
            category: 'entrees',
            patterns: [
                /\b(chicken|beef|pork|fish|salmon|turkey|duck|lamb).*(?:parmigiana|parmesan|grilled|roasted|baked|fried)\b/i,
                /\b(?:parmigiana|parmesan|grilled|roasted|baked|fried).*(?:chicken|beef|pork|fish|salmon|turkey|duck|lamb)\b/i,
                /\bDoc Bear.*(?:chicken|beef|pork|fish|salmon|turkey|duck|lamb)\b/i,
                /\b(pasta|spaghetti|lasagna|casserole|meatloaf|steak|chops|roast)\b/i,
                /\bDoc Bear.*(?:pasta|casserole|meatloaf)\b/i,
                /\bchicken parmigiana\b/i
            ],
            keywords: ['chicken parmigiana', 'pasta', 'casserole', 'meatloaf', 'steak', 'roast', 'grilled chicken', 'baked fish']
        },

        // Side Dishes - Check BEFORE seasonings
        {
            category: 'side-dishes',
            patterns: [
                /\b(mashed potatoes|roasted vegetables|rice pilaf|garlic.*potatoes|red.*potatoes)\b/i,
                /\bDoc Bear.*(?:mashed potatoes|potatoes|rice|vegetables)\b/i,
                /\bside.*dish\b/i,
                /\b(potato|rice|vegetable).*side\b/i
            ],
            keywords: ['mashed potatoes', 'garlic potatoes', 'red potatoes', 'rice pilaf', 'roasted vegetables', 'side dish']
        },

        // Pizza Dough
        {
            category: 'pizza-dough',
            patterns: [
                /\bpizza.*dough\b/i,
                /\bdough.*pizza\b/i
            ],
            keywords: ['pizza dough']
        },

        // Breads
        {
            category: 'breads',
            patterns: [
                /\b(bread|biscuit|roll|loaf|bun)\b/i,
                /\b(yeast|flour.*bread|bread.*flour)\b/i
            ],
            keywords: ['bread', 'biscuit', 'roll', 'loaf']
        },

        // Desserts
        {
            category: 'desserts',
            patterns: [
                /\b(cake|cookie|pie|tart|pudding|ice cream|chocolate|dessert|sweet|sugar|frosting|icing)\b/i,
                /\bfruit.*sauce\b/i
            ],
            keywords: ['cake', 'cookie', 'pie', 'dessert', 'chocolate', 'sweet']
        },

        // Appetizers
        {
            category: 'appetizers',
            patterns: [
                /\b(appetizer|starter|dip|spread|finger food)\b/i,
                /\b(chips|crackers|bite|canapé)\b/i
            ],
            keywords: ['appetizer', 'dip', 'spread', 'finger']
        },

        // Sandwiches
        {
            category: 'sandwiches',
            patterns: [
                /\b(sandwich|burger|wrap|sub|hoagie|panini)\b/i
            ],
            keywords: ['sandwich', 'burger', 'wrap']
        },

        // Beverages
        {
            category: 'beverages',
            patterns: [
                /\b(drink|beverage|juice|smoothie|cocktail|tea|coffee|punch)\b/i
            ],
            keywords: ['drink', 'juice', 'smoothie', 'cocktail']
        },

        // Basic Ingredients - MORE SPECIFIC patterns
        {
            category: 'ingredients',
            patterns: [
                /^tomato paste$/i,
                /\bhomemade.*(?:butter|cheese|extract|stock|base)\b/i,
                /\b(?:ricotta|riccata).*cheese$/i,
                /^hamburger patties$/i,
                /\b(?:pinto|kidney|refried).*beans.*(?:from dry|dry)$/i,
                /^.*beans.*(?:from dry|dry)$/i,
                /^homemade.*(?:vanilla|almond).*extract$/i
            ],
            keywords: ['tomato paste', 'ricotta cheese', 'riccata cheese', 'hamburger patties', 'pinto beans from dry', 'kidney beans from dry', 'refried beans', 'homemade butter', 'homemade cheese', 'vanilla extract', 'almond extract']
        },

        // Breakfast
        {
            category: 'breakfast',
            patterns: [
                /\b(breakfast|pancake|waffle|omelette|eggs|bacon|sausage|cereal|oatmeal)\b/i
            ],
            keywords: ['breakfast', 'pancake', 'eggs', 'bacon']
        },

        // Seasonings - MOVED TO LAST to be most specific
        {
            category: 'seasonings',
            patterns: [
                /^.*seasoning$/i,
                /^.*spice.*blend$/i,
                /^.*rub$/i,
                /^Doc Bear.*seasoning$/i,
                /^(?:salt|pepper|garlic|onion).*(?:blend|mix|powder)$/i,
                /^.*(?:spice|seasoning).*mix$/i
            ],
            keywords: ['seasoning mix', 'spice blend', 'rub', 'seasoning powder', 'spice mix']
        }
    ];

    // Check each classification rule
    for (const rule of classificationRules) {
        // Check if any pattern matches
        const patternMatch = rule.patterns.some(pattern => pattern.test(allText));

        // Check if any keyword is present
        const keywordMatch = rule.keywords.some(keyword => allText.includes(keyword));

        if (patternMatch || keywordMatch) {
            console.log(`   ✅ Classified as: ${rule.category} (pattern: ${patternMatch}, keyword: ${keywordMatch})`);
            return rule.category;
        }
    }

    // Default to entrees if no specific category found
    console.log(`   ⚠️ No specific category found, defaulting to: entrees`);
    return 'entrees';
}

// Helper function to detect if section uses delimiters
function hasDelimiters(section) {
    return /--\s*ingredients\s*--/i.test(section) && /--\s*instructions\s*--/i.test(section);
}

// Parse ingredient line for delimiter-based parsing
function parseIngredientLineDelimited(line) {
    try {
        let cleanLine = line.replace(/^[-•*]\s*/, '').trim();

        if (cleanLine.length < 2) return null;

        console.log(`    Parsing ingredient: "${cleanLine}"`);

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
            cleanLine = cleanLine.replace(new RegExp(`^${fraction}\\s+`), `${decimal} `);
        }

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
        console.error('Error in parseIngredientLineDelimited:', error);
        return null;
    }
}

// Add other helper functions (preprocessConcatenatedIngredients, isValidRecipeTitle, etc.)
function preprocessConcatenatedIngredients(text) {
    let processed = text;
    processed = processed.replace(/([a-zA-Z])\s*(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+(cup|cups|tsp|tbsp|oz|lb|lbs|stick|sticks|qt|quart|gallon)/gi, '$1\n$2 $3');
    processed = processed.replace(/([a-zA-Z])\s*(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+([a-zA-Z])/g, '$1\n$2 $3');
    processed = processed.replace(/(butter|oil|cream|cheese|sauce|flour|sugar|salt|pepper)\s*(\d+(?:[⁄\/]\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+/gi, '$1\n$2 ');
    return processed;
}

function isValidRecipeTitle(title) {
    const invalidPatterns = [
        /^(combine|heat|cook|bake|mix|stir|add|melt|bring|place|remove|using|in a|with a|set|allow)/i,
        /\b(minutes?|hours?|degrees?)\b/i,
        /^\d+\s*(cup|tsp|tbsp|oz|lb)/i,
        /\bcontinued on next page\b/i,
    ];
    return !invalidPatterns.some(pattern => pattern.test(title)) &&
        title.length >= 3 && title.length <= 100 && /[a-zA-Z]/.test(title);
}

function parseIngredientsAndInstructions(contentLines) {
    console.log('⚠️ Using fallback parseIngredientsAndInstructions - implement your existing logic here');
    return {
        ingredients: [],
        instructions: contentLines,
        description: ''
    };
}
//Okay, lets try this again...
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