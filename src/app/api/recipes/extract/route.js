// file: /src/app/api/recipes/extract/route.js

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
    // For now, provide a user-friendly message for PDF files
    // PDF text extraction is complex and often unreliable without specialized libraries
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

// Parse recipes from extracted text
function parseRecipesFromText(text, volume) {
    const recipes = [];

    try {
        console.log('Starting recipe parsing with delimiters...');

        // Clean up the text first
        const cleanText = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .trim();

        // Split by the recipe break delimiter you added
        let recipeSections = cleanText.split(/---\s*RECIPE\s*BREAK\s*---/i);

        // If no delimiters found, try other common separators
        if (recipeSections.length === 1) {
            console.log('No RECIPE BREAK delimiters found, trying other methods...');
            // Try splitting by recipe titles (looking for lines that end and then start with capital letters)
            recipeSections = cleanText.split(/\n\s*\n(?=[A-Z][A-Za-z\s']+(?:\n|$))/);
        }

        console.log(`Found ${recipeSections.length} recipe sections`);

        for (let i = 0; i < recipeSections.length; i++) {
            const section = recipeSections[i].trim();

            if (section.length < 20) continue; // Skip very short sections

            console.log(`\nProcessing section ${i + 1}:`);
            console.log('First 200 chars:', section.substring(0, 200));

            const recipe = parseRecipeWithStructure(section, volume);
            if (recipe && recipe.title) {
                recipes.push(recipe);
                console.log(`✅ Successfully parsed: "${recipe.title}"`);
                console.log(`   - ${recipe.ingredients.length} ingredients`);
                console.log(`   - ${recipe.instructions.length} instructions`);
            } else {
                console.log(`❌ Failed to parse section ${i + 1}`);
            }
        }

        console.log(`\nFinal recipe count: ${recipes.length}`);

    } catch (error) {
        console.error('Error parsing recipes:', error);
    }

    return recipes;
}

// Parse a single recipe with better structure detection
function parseRecipeWithStructure(section, volume) {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length < 3) return null;

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

    let titleFound = false;
    let ingredientsSection = false;
    let instructionsSection = false;

    // First pass: find the title (usually the first meaningful line)
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const line = lines[i];
        if (isValidRecipeTitle(line) && !titleFound) {
            recipe.title = line.trim();
            titleFound = true;
            console.log(`Found title: "${recipe.title}"`);
            break;
        }
    }

    // If no clear title found, use first line and clean it up
    if (!titleFound && lines.length > 0) {
        recipe.title = lines[0].replace(/[^\w\s'-]/g, '').trim();
        titleFound = true;
        console.log(`Using first line as title: "${recipe.title}"`);
    }

    // Second pass: parse ingredients and instructions
    let currentMode = 'scanning';

    for (let i = (titleFound ? 1 : 0); i < lines.length; i++) {
        const line = lines[i];

        // Skip the title line if we used it
        if (line === recipe.title) continue;

        // Check if this line looks like an ingredient
        if (looksLikeIngredient(line)) {
            const ingredient = parseIngredientLine(line);
            if (ingredient) {
                recipe.ingredients.push(ingredient);
                ingredientsSection = true;
                currentMode = 'ingredients';
                console.log(`Found ingredient: ${ingredient.amount} ${ingredient.unit} ${ingredient.name}`);
                continue;
            }
        }

        // Check if this line looks like an instruction
        if (looksLikeInstruction(line)) {
            // Only start instructions after we've found some ingredients, or if this looks very much like an instruction
            if (ingredientsSection || isDefinitelyInstruction(line)) {
                recipe.instructions.push(line.trim());
                instructionsSection = true;
                currentMode = 'instructions';
                console.log(`Found instruction: ${line.substring(0, 50)}...`);
                continue;
            }
        }

        // If we're in ingredients mode and this doesn't look like an ingredient or instruction,
        // it might be a description or note
        if (currentMode === 'ingredients' && !recipe.description && line.length < 200) {
            recipe.description = line;
        }
    }

    // Validation: recipe should have at least a title and either ingredients or instructions
    if (!recipe.title) {
        console.log('❌ No valid title found');
        return null;
    }

    if (recipe.ingredients.length === 0 && recipe.instructions.length === 0) {
        console.log('❌ No ingredients or instructions found');
        return null;
    }

    return recipe;
}

// Check if a line looks like an ingredient (improved)
function looksLikeIngredient(line) {
    // Must start with a number, fraction, or common measurement
    const startsWithMeasurement = /^(\d+|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞|\d+\/\d+|\d+\.\d+)\s/;

    // Common ingredient patterns
    const ingredientPatterns = [
        /\b\d+\s*(cup|cups|tsp|tsp\.|tbsp|tbsp\.|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|qt|quart|quarts|gallon|gallons|stick|sticks)\b/i,
        /\b(½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s*(cup|tsp|tbsp|oz|lb)/i,
    ];

    // Should not start with instruction words
    const instructionStarters = /^(combine|heat|cook|bake|mix|stir|add|melt|bring|place|remove|using|in a|with a)/i;

    return (startsWithMeasurement.test(line) || ingredientPatterns.some(pattern => pattern.test(line)))
        && !instructionStarters.test(line)
        && line.length < 150; // Ingredients should be relatively short
}

// Check if a line looks like an instruction (improved)
function looksLikeInstruction(line) {
    const instructionStarters = /^(combine|heat|cook|bake|mix|stir|add|melt|bring|place|remove|using|in a|with a|set|allow|continue|repeat|pour|crush|strain|grate|slowly|next)/i;

    // Should not be an ingredient
    const startsWithMeasurement = /^(\d+|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞|\d+\/\d+|\d+\.\d+)\s/;

    return instructionStarters.test(line)
        && !startsWithMeasurement.test(line)
        && line.length > 15; // Instructions should be reasonably long
}

// Check if a line is definitely an instruction (very confident)
function isDefinitelyInstruction(line) {
    const definiteInstructionStarters = /^(combine all ingredients|heat oil|cook over|bake at|mix together|stir until|add the|melt the|bring to a boil|place in|remove from|using a)/i;
    return definiteInstructionStarters.test(line);
}

// Check if a title looks valid (keep existing function but make it more lenient)
function isValidRecipeTitle(title) {
    // Filter out obvious non-titles
    const invalidPatterns = [
        /^(combine|heat|cook|bake|mix|stir|add|melt|bring|place|remove|using|in a|with a|set|allow)/i,
        /\b(minutes?|hours?|degrees?)\b/i,
        /^\d+\s*(cup|tsp|tbsp|oz|lb)/i, // Measurements
        /^[a-z]/, // Should start with capital
        /\bcontinued on next page\b/i,
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
}

// Parse ingredient line (keep the existing function)
function parseIngredientLine(line) {
    // Remove list markers
    const cleanLine = line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim();

    if (cleanLine.length < 3) return null;

    // Try to parse amount, unit, and name
    const match = cleanLine.match(/^(\d+(?:\/\d+)?(?:\.\d+)?|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s+(\w+)?\s+(.+)$/);

    if (match) {
        let amount = match[1];
        // Convert fractions to decimals
        if (amount === '½') amount = 0.5;
        else if (amount === '¼') amount = 0.25;
        else if (amount === '¾') amount = 0.75;
        else if (amount === '⅓') amount = 0.33;
        else if (amount === '⅔') amount = 0.67;
        else if (amount === '⅛') amount = 0.125;
        else if (amount.includes('/')) {
            const [num, den] = amount.split('/').map(Number);
            amount = num / den;
        } else {
            amount = parseFloat(amount) || 1;
        }

        return {
            amount: amount,
            unit: match[2] || '',
            name: match[3].trim(),
            category: '',
            alternatives: [],
            optional: false
        };
    } else {
        // If no amount found, treat whole line as ingredient name
        return {
            amount: 1,
            unit: '',
            name: cleanLine,
            category: '',
            alternatives: [],
            optional: false
        };
    }
}