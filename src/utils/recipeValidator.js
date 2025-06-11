// file: /src/utils/recipeValidator.js - Recipe Format Validator

/**
 * Validates Doc Bear's recipe format before bulk import
 * Use this to test your recipe text before uploading
 */

export function validateRecipeFormat(text) {
    const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        recipeCount: 0,
        recipes: []
    };

    try {
        // Split by recipe breaks
        const recipeBlocks = text.split(/--RECIPE BREAK--/i)
            .map(block => block.trim())
            .filter(block => block.length > 0);

        validation.recipeCount = recipeBlocks.length;

        if (recipeBlocks.length === 0) {
            validation.isValid = false;
            validation.errors.push('No recipes found. Make sure to use --RECIPE BREAK-- to separate recipes.');
            return validation;
        }

        // Validate each recipe block
        recipeBlocks.forEach((block, index) => {
            const recipeNum = index + 1;
            const recipeValidation = validateSingleRecipe(block, recipeNum);

            validation.recipes.push(recipeValidation);

            if (!recipeValidation.isValid) {
                validation.isValid = false;
            }

            validation.errors.push(...recipeValidation.errors);
            validation.warnings.push(...recipeValidation.warnings);
        });

    } catch (error) {
        validation.isValid = false;
        validation.errors.push(`Parsing error: ${error.message}`);
    }

    return validation;
}

function validateSingleRecipe(block, recipeNum) {
    const recipe = {
        recipeNumber: recipeNum,
        isValid: true,
        errors: [],
        warnings: [],
        title: '',
        hasDescription: false,
        ingredientCount: 0,
        instructionCount: 0,
        tagCount: 0
    };

    const lines = block.split('\n').map(line => line.trim());
    let currentSection = 'title';
    let titleFound = false;
    let sectionsFound = {
        description: false,
        ingredients: false,
        instructions: false,
        tags: false
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip empty lines
        if (!line) continue;

        // Check for section delimiters
        if (line.match(/^--Description--$/i)) {
            currentSection = 'description';
            sectionsFound.description = true;
            continue;
        } else if (line.match(/^--[Ii]ngredients?--$/i)) {
            currentSection = 'ingredients';
            sectionsFound.ingredients = true;
            continue;
        } else if (line.match(/^--[Ii]nstructions?--$/i)) {
            currentSection = 'instructions';
            sectionsFound.instructions = true;
            continue;
        } else if (line.match(/^--[Tt]ags?--$/i)) {
            currentSection = 'tags';
            sectionsFound.tags = true;
            continue;
        }

        // Process content based on current section
        switch (currentSection) {
            case 'title':
                if (!titleFound && line.length > 0) {
                    recipe.title = line;
                    titleFound = true;

                    // Validate title
                    if (line.length < 3) {
                        recipe.warnings.push(`Recipe ${recipeNum}: Title is very short: "${line}"`);
                    }
                    if (line.length > 100) {
                        recipe.warnings.push(`Recipe ${recipeNum}: Title is very long (${line.length} chars)`);
                    }
                }
                break;

            case 'description':
                recipe.hasDescription = true;
                break;

            case 'ingredients':
                if (line.length > 0) {
                    recipe.ingredientCount++;

                    // Validate ingredient format
                    if (!line.match(/\d/) && !line.match(/\b(pinch|dash|to taste)\b/i)) {
                        recipe.warnings.push(`Recipe ${recipeNum}: Ingredient "${line}" has no amount specified`);
                    }
                }
                break;

            case 'instructions':
                if (line.length > 0) {
                    recipe.instructionCount++;

                    // Check for reasonable instruction length
                    if (line.length < 10) {
                        recipe.warnings.push(`Recipe ${recipeNum}: Very short instruction: "${line}"`);
                    }
                }
                break;

            case 'tags':
                if (line.length > 0) {
                    const tags = line.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    recipe.tagCount = tags.length;

                    if (tags.length === 0) {
                        recipe.warnings.push(`Recipe ${recipeNum}: No valid tags found in tags section`);
                    }
                }
                break;
        }
    }

    // Validate required fields
    if (!titleFound || !recipe.title) {
        recipe.isValid = false;
        recipe.errors.push(`Recipe ${recipeNum}: Missing title`);
    }

    if (!sectionsFound.ingredients || recipe.ingredientCount === 0) {
        recipe.isValid = false;
        recipe.errors.push(`Recipe ${recipeNum}: Missing ingredients section or no ingredients found`);
    }

    if (!sectionsFound.instructions || recipe.instructionCount === 0) {
        recipe.isValid = false;
        recipe.errors.push(`Recipe ${recipeNum}: Missing instructions section or no instructions found`);
    }

    // Warnings for missing optional sections
    if (!sectionsFound.description) {
        recipe.warnings.push(`Recipe ${recipeNum}: No description section found`);
    }

    if (!sectionsFound.tags) {
        recipe.warnings.push(`Recipe ${recipeNum}: No tags section found`);
    }

    // Validate reasonable counts
    if (recipe.ingredientCount > 50) {
        recipe.warnings.push(`Recipe ${recipeNum}: Very high ingredient count (${recipe.ingredientCount})`);
    }

    if (recipe.instructionCount > 30) {
        recipe.warnings.push(`Recipe ${recipeNum}: Very high instruction count (${recipe.instructionCount})`);
    }

    if (recipe.ingredientCount < 2) {
        recipe.warnings.push(`Recipe ${recipeNum}: Very few ingredients (${recipe.ingredientCount})`);
    }

    return recipe;
}

// Helper function to format validation results for display
export function formatValidationResults(validation) {
    let output = [];

    output.push(`=== RECIPE FORMAT VALIDATION RESULTS ===`);
    output.push(`Total recipes found: ${validation.recipeCount}`);
    output.push(`Overall status: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}`);
    output.push('');

    if (validation.errors.length > 0) {
        output.push('ERRORS (must fix before import):');
        validation.errors.forEach(error => output.push(`  ❌ ${error}`));
        output.push('');
    }

    if (validation.warnings.length > 0) {
        output.push('WARNINGS (review recommended):');
        validation.warnings.forEach(warning => output.push(`  ⚠️  ${warning}`));
        output.push('');
    }

    output.push('RECIPE SUMMARY:');
    validation.recipes.forEach(recipe => {
        const status = recipe.isValid ? '✅' : '❌';
        output.push(`  ${status} Recipe ${recipe.recipeNumber}: "${recipe.title}"`);
        output.push(`     Ingredients: ${recipe.ingredientCount}, Instructions: ${recipe.instructionCount}, Tags: ${recipe.tagCount}`);
    });

    return output.join('\n');
}

// Browser-friendly version for testing in console
export function testRecipeFormat(text) {
    const validation = validateRecipeFormat(text);
    console.log(formatValidationResults(validation));
    return validation;
}

// Example usage in browser console:
/*
const testText = `
Classic Mac and Cheese

--Description--
Creamy, cheesy comfort food

--Ingredients--
1 lb macaroni
2 cups cheese
1 cup milk

--Instructions--
Cook pasta
Make cheese sauce
Combine and bake

--Tags--
pasta, cheese, comfort-food

--RECIPE BREAK--
`;

testRecipeFormat(testText);
*/