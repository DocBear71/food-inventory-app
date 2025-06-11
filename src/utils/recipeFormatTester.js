// file: /src/utils/recipeFormatTester.js - Test your recipe format before uploading

export function testRecipeFormat(recipeText) {
    console.log('=== RECIPE FORMAT TESTER ===');
    console.log('Testing recipe text length:', recipeText.length);

    const results = {
        isValid: true,
        errors: [],
        warnings: [],
        recipes: []
    };

    try {
        // Test 1: Check for recipe breaks
        const sections = recipeText.split(/--\s*RECIPE\s*BREAK\s*--/i);
        console.log(`Found ${sections.length} potential recipe sections`);

        if (sections.length < 2) {
            results.errors.push('No --RECIPE BREAK-- delimiters found. Each recipe must end with --RECIPE BREAK--');
            results.isValid = false;
        }

        // Test each section
        sections.forEach((section, index) => {
            const trimmed = section.trim();
            if (trimmed.length < 20) {
                console.log(`Section ${index + 1} too short, skipping`);
                return;
            }

            console.log(`\n--- Testing Recipe Section ${index + 1} ---`);
            const recipeTest = testSingleRecipe(trimmed, index + 1);
            results.recipes.push(recipeTest);

            if (!recipeTest.isValid) {
                results.isValid = false;
            }

            results.errors.push(...recipeTest.errors);
            results.warnings.push(...recipeTest.warnings);
        });

    } catch (error) {
        results.errors.push(`Testing error: ${error.message}`);
        results.isValid = false;
    }

    return results;
}

function testSingleRecipe(section, recipeNum) {
    const test = {
        recipeNumber: recipeNum,
        isValid: true,
        errors: [],
        warnings: [],
        title: '',
        hasDescription: false,
        ingredientCount: 0,
        instructionCount: 0,
        tagCount: 0,
        sections: {
            description: false,
            ingredients: false,
            instructions: false,
            tags: false
        }
    };

    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let currentSection = 'title';
    let titleFound = false;

    for (const line of lines) {
        // Check for section delimiters
        if (line.match(/^--\s*description\s*--$/i)) {
            currentSection = 'description';
            test.sections.description = true;
            continue;
        }
        if (line.match(/^--\s*ingredients?\s*--$/i)) {
            currentSection = 'ingredients';
            test.sections.ingredients = true;
            continue;
        }
        if (line.match(/^--\s*instructions?\s*--$/i)) {
            currentSection = 'instructions';
            test.sections.instructions = true;
            continue;
        }
        if (line.match(/^--\s*tags?\s*--$/i)) {
            currentSection = 'tags';
            test.sections.tags = true;
            continue;
        }

        // Process content
        switch (currentSection) {
            case 'title':
                if (!titleFound && line.length > 0) {
                    test.title = line;
                    titleFound = true;
                    console.log(`  Title: "${test.title}"`);

                    if (line.length < 3) {
                        test.warnings.push(`Recipe ${recipeNum}: Title is very short`);
                    }
                    if (line.length > 100) {
                        test.warnings.push(`Recipe ${recipeNum}: Title is very long`);
                    }
                }
                break;

            case 'description':
                test.hasDescription = true;
                break;

            case 'ingredients':
                if (line.length > 0) {
                    test.ingredientCount++;

                    // Test ingredient format
                    if (!line.match(/\d/) && !line.match(/\b(pinch|dash|to taste)\b/i)) {
                        test.warnings.push(`Recipe ${recipeNum}: Ingredient "${line}" has no amount`);
                    }
                }
                break;

            case 'instructions':
                if (line.length > 0) {
                    test.instructionCount++;

                    if (line.length < 10) {
                        test.warnings.push(`Recipe ${recipeNum}: Very short instruction: "${line}"`);
                    }
                }
                break;

            case 'tags':
                if (line.length > 0) {
                    const tags = line.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    test.tagCount = tags.length;
                }
                break;
        }
    }

    // Validate required elements
    if (!titleFound) {
        test.isValid = false;
        test.errors.push(`Recipe ${recipeNum}: Missing title`);
    }

    if (!test.sections.ingredients || test.ingredientCount === 0) {
        test.isValid = false;
        test.errors.push(`Recipe ${recipeNum}: Missing --Ingredients-- section or no ingredients`);
    }

    if (!test.sections.instructions || test.instructionCount === 0) {
        test.isValid = false;
        test.errors.push(`Recipe ${recipeNum}: Missing --Instructions-- section or no instructions`);
    }

    // Warnings for optional sections
    if (!test.sections.description) {
        test.warnings.push(`Recipe ${recipeNum}: No --Description-- section`);
    }

    if (!test.sections.tags) {
        test.warnings.push(`Recipe ${recipeNum}: No --Tags-- section`);
    }

    console.log(`  ✅ Recipe ${recipeNum}: ${test.ingredientCount} ingredients, ${test.instructionCount} instructions`);

    return test;
}

// Browser console helper
export function validateInConsole(recipeText) {
    const results = testRecipeFormat(recipeText);

    console.log('\n=== VALIDATION RESULTS ===');
    console.log(`Status: ${results.isValid ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`Recipes found: ${results.recipes.length}`);

    if (results.errors.length > 0) {
        console.log('\n🚨 ERRORS (must fix):');
        results.errors.forEach(error => console.log(`  ${error}`));
    }

    if (results.warnings.length > 0) {
        console.log('\n⚠️ WARNINGS (review recommended):');
        results.warnings.forEach(warning => console.log(`  ${warning}`));
    }

    console.log('\n📊 RECIPE SUMMARY:');
    results.recipes.forEach(recipe => {
        const status = recipe.isValid ? '✅' : '❌';
        console.log(`  ${status} Recipe ${recipe.recipeNumber}: "${recipe.title}"`);
        console.log(`     ${recipe.ingredientCount} ingredients, ${recipe.instructionCount} instructions`);
    });

    return results;
}

// Example usage:
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

validateInConsole(testText);
*/