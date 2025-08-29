'use client';
// file: /src/components/recipes/RecipeParser.js v7 - iOS Native Enhancements with Document Picker

import {useState, useEffect, useRef, useCallback} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {
    parseIngredientLine,
    parseInstructionLine,
    extractMetadata,
    isIngredientLine,
    isInstructionLine,
    isIngredientSectionHeader,
    isInstructionSectionHeader,
    isHeaderLine,
    cleanTitle
} from '@/lib/recipe-parsing-utils';
import {
    NativeTextInput,
    NativeTextarea,
    NativeSelect
} from '@/components/forms/NativeIOSFormComponents';
import { PlatformDetection } from '@/utils/PlatformDetection';

// AutoExpandingTextarea component
const AutoExpandingTextarea = ({value, onChange, placeholder, className, ...props}) => {
    const textareaRef = useRef(null);

    const adjustHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.max(textarea.scrollHeight, 48)}px`;
        }
    }, []);

    useEffect(() => {
        adjustHeight();
    }, [value, adjustHeight]);

    const handleChange = useCallback((e) => {
        onChange(e);
        setTimeout(adjustHeight, 0);
    }, [onChange, adjustHeight]);

    return (
        <textarea
            ref={textareaRef}
            value={value || ''}
            onChange={handleChange}
            onInput={adjustHeight}
            placeholder={placeholder}
            className={`${className} resize-none overflow-hidden`}
            style={{minHeight: '48px'}}
            {...props}
        />
    );
};

export default function RecipeParser({onRecipeParsed, onCancel}) {
    const [rawText, setRawText] = useState('');
    const [parsedRecipe, setParsedRecipe] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [forceMultiPart, setForceMultiPart] = useState(false);
    const [detectedMultiPart, setDetectedMultiPart] = useState(false);

    const isIOS = PlatformDetection.isIOS();

    // Multi-part recipe detection
    const detectMultiPartRecipe = useCallback((text) => {
        const multiPartIndicators = [
            /^(filling|topping|sauce|marinade|base|crust|dough|biscuit|pastry|glaze|frosting)/im,
            /(\w+\s*(ingredients?|preparation|instructions?):)/gi,
            /^(part\s*\d+|section\s*[a-z]|step\s*[a-z])/im,
            /(recipe|for\s+the)\s*\w+.*\n.*\n.*(recipe|for\s+the)\s*\w+/i,
            /(for\s+the\s+\w+)/gi
        ];

        const matches = multiPartIndicators.reduce((count, pattern) => {
            const result = text.match(pattern);
            return count + (result ? result.length : 0);
        }, 0);

        return matches >= 2;
    }, []);

    // Update detection when text changes
    useEffect(() => {
        const isMultiPart = detectMultiPartRecipe(rawText);
        setDetectedMultiPart(isMultiPart);
    }, [rawText, detectMultiPartRecipe]);

    // iOS Native Document Picker for importing text files
    const handleIOSDocumentImport = async () => {
        if (!isIOS) return;

        try {
            const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
            await MobileHaptics.buttonTap();

            // Use Capacitor Filesystem plugin for iOS document picker
            const { Filesystem } = await import('@capacitor/filesystem');

            // Show action sheet for import options
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            const result = await NativeDialog.showActionSheet({
                title: 'Import Recipe Text',
                message: 'Choose how to import your recipe',
                buttons: [
                    {
                        text: 'Import from Files',
                        style: 'default',
                        action: async () => {
                            try {
                                // iOS native file picker
                                const { FilePicker } = await import('@capawesome/capacitor-file-picker');

                                const fileResult = await FilePicker.pickFiles({
                                    types: ['text/plain', 'text/rtf', 'application/rtf'],
                                    multiple: false
                                });

                                if (fileResult.files && fileResult.files.length > 0) {
                                    const file = fileResult.files[0];

                                    // Read file content
                                    const content = await Filesystem.readFile({
                                        path: file.path,
                                        encoding: 'utf8'
                                    });

                                    await MobileHaptics.success();
                                    setRawText(content.data);

                                    await NativeDialog.showSuccess({
                                        title: 'File Imported',
                                        message: `Successfully imported text from ${file.name}`
                                    });
                                }
                            } catch (error) {
                                console.error('File picker error:', error);
                                await MobileHaptics.error();

                                await NativeDialog.showError({
                                    title: 'Import Failed',
                                    message: 'Could not import file. Please try copying and pasting the text instead.'
                                });
                            }
                        }
                    },
                    {
                        text: 'Paste from Clipboard',
                        style: 'default',
                        action: async () => {
                            try {
                                const { Clipboard } = await import('@capacitor/clipboard');
                                const clipResult = await Clipboard.read();

                                if (clipResult.value && clipResult.value.trim()) {
                                    await MobileHaptics.success();
                                    setRawText(clipResult.value);

                                    await NativeDialog.showSuccess({
                                        title: 'Text Pasted',
                                        message: 'Successfully pasted text from clipboard'
                                    });
                                } else {
                                    await MobileHaptics.error();
                                    await NativeDialog.showAlert({
                                        title: 'No Text Found',
                                        message: 'No text found in clipboard. Please copy some recipe text and try again.'
                                    });
                                }
                            } catch (error) {
                                console.error('Clipboard error:', error);
                                await MobileHaptics.error();

                                await NativeDialog.showError({
                                    title: 'Paste Failed',
                                    message: 'Could not access clipboard. Please paste manually in the text area.'
                                });
                            }
                        }
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        action: () => null
                    }
                ]
            });

        } catch (error) {
            console.error('iOS document import error:', error);
            // Fallback - do nothing, user can still type
        }
    };

    // Enhanced parsing function with multi-part support
    const parseRecipeText = (text) => {
        console.log('Starting enhanced recipe parsing with multi-part support:', text.substring(0, 100) + '...');

        if (!text || text.trim().length === 0) {
            return null;
        }

        const shouldParseMultiPart = forceMultiPart || detectedMultiPart;

        if (shouldParseMultiPart) {
            console.log('Attempting multi-part recipe parsing');
            const multiPartResult = parseMultiPartRecipe(text);
            if (multiPartResult && multiPartResult.parts && multiPartResult.parts.length > 1) {
                console.log('Successfully parsed as multi-part recipe with', multiPartResult.parts.length, 'parts');
                return multiPartResult;
            }
            console.log('Multi-part parsing failed, falling back to single-part');
        }

        console.log('Parsing as single-part recipe');
        return parseSinglePartRecipe(text);
    };

    // Multi-part recipe parsing
    const parseMultiPartRecipe = (text) => {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);

        const recipe = {
            title: '',
            description: '',
            isMultiPart: true,
            parts: [],
            ingredients: [],
            instructions: [],
            prepTime: null,
            cookTime: null,
            servings: null,
            difficulty: 'medium',
            tags: [],
            source: 'Text Parser',
            isPublic: false,
            category: 'entrees',
            nutrition: {}
        };

        let currentPart = null;
        let currentSection = 'title';
        let hasProcessedTitle = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lowerLine = line.toLowerCase();

            if (!hasProcessedTitle && line.length > 2 && !isHeaderLine(line) && !isRecipeSectionHeader(line)) {
                recipe.title = cleanTitle(line);
                hasProcessedTitle = true;
                continue;
            }

            if (isRecipeSectionHeader(line)) {
                if (currentPart && (currentPart.ingredients.length > 0 || currentPart.instructions.length > 0)) {
                    recipe.parts.push(currentPart);
                }

                currentPart = {
                    name: cleanPartName(line),
                    description: '',
                    ingredients: [],
                    instructions: [],
                    order: recipe.parts.length
                };
                currentSection = 'part_content';
                continue;
            }

            if (isIngredientSectionHeader(lowerLine)) {
                currentSection = 'ingredients';
                continue;
            }

            if (isInstructionSectionHeader(lowerLine)) {
                currentSection = 'instructions';
                continue;
            }

            switch (currentSection) {
                case 'title':
                case 'description':
                    if (line.length > 20 && !isIngredientLine(line) && !isInstructionLine(line)) {
                        recipe.description = recipe.description ? recipe.description + ' ' + line : line;
                    }
                    break;

                case 'part_content':
                case 'ingredients':
                    if (currentPart) {
                        if (isIngredientLine(line) || currentSection === 'ingredients') {
                            const ingredient = parseIngredientLine(line);
                            if (ingredient) {
                                currentPart.ingredients.push(ingredient);
                            }
                        } else if (isInstructionLine(line) && line.length > 10) {
                            const instruction = parseInstructionLine(line, currentPart.instructions.length);
                            if (instruction) {
                                currentPart.instructions.push({
                                    step: currentPart.instructions.length + 1,
                                    instruction: instruction
                                });
                            }
                        }
                    }
                    break;

                case 'instructions':
                    if (currentPart) {
                        const instruction = parseInstructionLine(line, currentPart.instructions.length);
                        if (instruction) {
                            currentPart.instructions.push({
                                step: currentPart.instructions.length + 1,
                                instruction: instruction
                            });
                        }
                    }
                    break;
            }
        }

        if (currentPart && (currentPart.ingredients.length > 0 || currentPart.instructions.length > 0)) {
            recipe.parts.push(currentPart);
        }

        extractMetadata(text, recipe);

        if (recipe.parts.length === 0) {
            return null;
        }

        if (recipe.parts.length === 1 && !forceMultiPart) {
            return null;
        }

        if (!recipe.title) {
            recipe.title = 'Multi-Part Recipe';
        }

        console.log(`Multi-part parsing results: ${recipe.parts.length} parts`);
        recipe.parts.forEach((part, index) => {
            console.log(`   Part ${index + 1}: "${part.name}" - ${part.ingredients.length} ingredients, ${part.instructions.length} instructions`);
        });

        return recipe;
    };

    // Enhanced single-part parsing
    const parseSinglePartRecipe = (text) => {
        console.log('Parsing single-part recipe using enhanced utilities');

        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        const recipe = {
            title: '',
            description: '',
            isMultiPart: false,
            parts: [],
            ingredients: [],
            instructions: [],
            prepTime: null,
            cookTime: null,
            servings: null,
            difficulty: 'medium',
            tags: [],
            source: 'Text Parser',
            isPublic: false,
            category: 'entrees',
            nutrition: {}
        };

        const structuredResult = parseStructuredFormat(lines, recipe);
        if (structuredResult.success) {
            console.log('Successfully parsed structured format');
            return structuredResult.recipe;
        }

        const delimitedResult = parseDelimitedFormat(text, recipe);
        if (delimitedResult.success) {
            console.log('Successfully parsed delimited format');
            return delimitedResult.recipe;
        }

        console.log('Using smart auto-detection parsing');
        return parseSmartAutoDetection(lines, recipe);
    };

    // Helper parsing functions (keeping existing logic)
    const parseStructuredFormat = (lines, recipe) => {
        let currentSection = 'title';
        let ingredientSectionFound = false;
        let instructionSectionFound = false;
        let hasProcessedTitle = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lowerLine = line.toLowerCase();

            if (isIngredientSectionHeader(lowerLine)) {
                currentSection = 'ingredients';
                ingredientSectionFound = true;
                continue;
            }

            if (isInstructionSectionHeader(lowerLine)) {
                currentSection = 'instructions';
                instructionSectionFound = true;
                continue;
            }

            switch (currentSection) {
                case 'title':
                    if (!hasProcessedTitle && line.length > 2) {
                        recipe.title = cleanTitle(line);
                        hasProcessedTitle = true;
                        currentSection = 'description';
                    }
                    break;

                case 'description':
                    if (line.length > 10 && !isIngredientLine(line) && !isInstructionLine(line)) {
                        recipe.description = recipe.description ? recipe.description + ' ' + line : line;
                    }
                    break;

                case 'ingredients':
                    const ingredient = parseIngredientLine(line);
                    if (ingredient) {
                        recipe.ingredients.push(ingredient);
                    }
                    break;

                case 'instructions':
                    const instruction = parseInstructionLine(line, recipe.instructions.length);
                    if (instruction) {
                        recipe.instructions.push({
                            step: recipe.instructions.length + 1,
                            instruction: instruction
                        });
                    }
                    break;
            }
        }

        extractMetadata(lines.join('\n'), recipe);

        return {
            success: ingredientSectionFound && instructionSectionFound && recipe.ingredients.length > 0 && recipe.instructions.length > 0,
            recipe: ingredientSectionFound && instructionSectionFound ? recipe : null
        };
    };

    const parseDelimitedFormat = (text, recipe) => {
        const sections = text.split(/--([A-Za-z\s]+)--/);

        if (sections.length < 3) {
            return {success: false};
        }

        let hasIngredients = false;
        let hasInstructions = false;

        const firstSection = sections[0].trim();
        if (firstSection) {
            const firstLines = firstSection.split('\n').filter(line => line.trim());
            if (firstLines.length > 0) {
                recipe.title = cleanTitle(firstLines[0]);
                if (firstLines.length > 1) {
                    recipe.description = firstLines.slice(1).join(' ').trim();
                }
            }
        }

        for (let i = 1; i < sections.length; i += 2) {
            const sectionName = sections[i].toLowerCase().trim();
            const sectionContent = sections[i + 1] ? sections[i + 1].trim() : '';

            switch (sectionName) {
                case 'description':
                    recipe.description = sectionContent;
                    break;
                case 'ingredients':
                    recipe.ingredients = parseIngredientsSection(sectionContent);
                    hasIngredients = true;
                    break;
                case 'instructions':
                case 'directions':
                case 'method':
                    recipe.instructions = parseInstructionsSection(sectionContent);
                    hasInstructions = true;
                    break;
                case 'tags':
                    recipe.tags = sectionContent.split(',').map(tag => tag.trim()).filter(tag => tag);
                    break;
            }
        }

        return {
            success: hasIngredients && hasInstructions,
            recipe: hasIngredients && hasInstructions ? recipe : null
        };
    };

    const parseSmartAutoDetection = (lines, recipe) => {
        let titleSet = false;
        const potentialIngredients = [];
        const potentialInstructions = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (!titleSet && !isHeaderLine(line) && line.length > 2) {
                recipe.title = cleanTitle(line);
                titleSet = true;
                continue;
            }

            if (isHeaderLine(line)) {
                continue;
            }

            if (isIngredientLine(line)) {
                const ingredient = parseIngredientLine(line);
                if (ingredient) {
                    potentialIngredients.push(ingredient);
                }
            } else if (isInstructionLine(line) && line.length > 10) {
                const instruction = parseInstructionLine(line, potentialInstructions.length);
                if (instruction) {
                    potentialInstructions.push({
                        step: potentialInstructions.length + 1,
                        instruction: instruction
                    });
                }
            } else if (!recipe.description && line.length > 20 && titleSet) {
                recipe.description = line;
            }
        }

        recipe.ingredients = potentialIngredients;
        recipe.instructions = potentialInstructions;

        extractMetadata(lines.join('\n'), recipe);

        if (!recipe.title) {
            recipe.title = 'Imported Recipe';
        }

        console.log(`Auto-detection results: ${recipe.ingredients.length} ingredients, ${recipe.instructions.length} instructions`);

        return recipe;
    };

    // Helper parsing functions
    const parseIngredientsSection = (content) => {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        const ingredients = [];

        for (const line of lines) {
            const ingredient = parseIngredientLine(line);
            if (ingredient) {
                ingredients.push(ingredient);
            }
        }

        return ingredients;
    };

    const parseInstructionsSection = (content) => {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        const instructions = [];

        for (const line of lines) {
            const instruction = parseInstructionLine(line, instructions.length);
            if (instruction) {
                instructions.push({
                    step: instructions.length + 1,
                    instruction: instruction
                });
            }
        }

        return instructions;
    };

    // Multi-part specific helpers
    const isRecipeSectionHeader = (line) => {
        const sectionPatterns = [
            /^(filling|topping|sauce|marinade|base|crust|dough|biscuit|pastry|glaze|frosting)/i,
            /^(for\s+the\s+\w+)/i,
            /^(\w+\s+topping|\w+\s+filling|\w+\s+sauce|\w+\s+dough|\w+\s+marinade)/i,
            /^(part\s*\d+|section\s*[a-z])/i
        ];

        return sectionPatterns.some(pattern => pattern.test(line)) &&
            !line.includes(':') &&
            line.length < 60;
    };

    const cleanPartName = (line) => {
        return line
            .replace(/^(for\s+the\s+)/i, '')
            .replace(/^\d+\.\s*/, '')
            .replace(/^[a-z]\.\s*/i, '')
            .trim()
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    // Main parsing handler
    const handleParse = async () => {
        // iOS haptic for parse action
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.formSubmit();
            } catch (error) {
                console.log('Parse haptic failed:', error);
            }
        }

        setIsParsing(true);

        setTimeout(async () => {
            try {
                const parsed = parseRecipeText(rawText);
                setParsedRecipe(parsed);
                setShowPreview(true);

                // iOS success haptic
                if (isIOS && parsed) {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.success();
                } else if (isIOS && !parsed) {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.error();
                }
            } catch (error) {
                console.error('Parsing error:', error);
                if (isIOS) {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.error();
                }
            } finally {
                setIsParsing(false);
            }
        }, 500);
    };

    const handleUseRecipe = async () => {
        if (parsedRecipe) {
            // iOS success haptic for using recipe
            if (isIOS) {
                try {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.success();
                } catch (error) {
                    console.log('Use recipe haptic failed:', error);
                }
            }

            onRecipeParsed(parsedRecipe);
        }
    };

    // Field editing handlers
    const handleEditField = (field, value) => {
        setParsedRecipe(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleEditIngredient = (index, field, value, partIndex = null) => {
        setParsedRecipe(prev => {
            if (prev.isMultiPart && partIndex !== null) {
                const updatedParts = [...prev.parts];
                updatedParts[partIndex].ingredients[index] = {
                    ...updatedParts[partIndex].ingredients[index],
                    [field]: value
                };
                return {...prev, parts: updatedParts};
            } else {
                return {
                    ...prev,
                    ingredients: prev.ingredients.map((ing, i) =>
                        i === index ? {...ing, [field]: value} : ing
                    )
                };
            }
        });
    };

    const handleEditInstruction = useCallback((index, value, partIndex = null) => {
        setParsedRecipe(prev => {
            if (prev.isMultiPart && partIndex !== null) {
                const updatedParts = [...prev.parts];
                updatedParts[partIndex].instructions[index] = {
                    ...updatedParts[partIndex].instructions[index],
                    instruction: value
                };
                return {...prev, parts: updatedParts};
            } else {
                return {
                    ...prev,
                    instructions: prev.instructions.map((inst, i) =>
                        i === index ? {...inst, instruction: value} : inst
                    )
                };
            }
        });
    }, []);

    const handleEditPart = (partIndex, field, value) => {
        setParsedRecipe(prev => {
            const updatedParts = [...prev.parts];
            updatedParts[partIndex] = {
                ...updatedParts[partIndex],
                [field]: value
            };
            return {...prev, parts: updatedParts};
        });
    };

    // Example multi-part recipe text
    const exampleMultiPartText = `Chicken Pot Pie

Filling
Ingredients:
3 ea Onions, diced
3 ea Carrots, diced
2 bunches Celery, diced
1 qt Chicken stock
3 ea Potatoes, peeled & diced
5 lb Chicken, diced
1 bag Peas
1 qt Heavy cream
To Taste Salt
To Taste Pepper

Instructions:
1. In a medium stockpot, sweat the onions, carrots and celery until tender.
2. Add the chicken stock, diced potatoes and chicken; continue to cook until potatoes are tender.
3. Add the peas and heavy cream; reduce heat and cook until sauce has thickened.
4. Season to taste with the salt and pepper.
5. When thickened sufficiently, ladle into large dishes and top with the biscuit dough.
6. Bake in the broiler until biscuit is golden brown.

Biscuit Topping
Ingredients:
2 cup Flour
8 tbsp Butter
½ tsp Baking soda
¼ tsp Salt
As Needed Milk

Instructions:
1. Combine flour and butter; blend until only pea-sized crumbles remain.
2. Add the baking soda and salt, blend well
3. Slowly add in the milk; only add enough to form a soft dough.
4. Cover, label, store and refrigerate until needed.`;

    return (
        <div className="space-y-6">
            {!showPreview ? (
                // Input Phase
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Smart Recipe Text Parser
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Paste a recipe from anywhere! The smart parser can handle structured recipes, YouTube
                        transcripts, unformatted text, and multi-part recipes like pot pies with separate
                        fillings and toppings.
                    </p>

                    {/* Multi-part detection indicator */}
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-blue-900">Enhanced Parsing Features:</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-blue-600">
                                    {detectedMultiPart ? 'Multi-part detected' : 'Single-part detected'}
                                </span>
                            </div>
                        </div>
                        <ul className="text-blue-800 text-sm space-y-1">
                            <li>• <strong>Multi-part recipes</strong> with separate components (filling + topping)</li>
                            <li>• <strong>Structured recipes</strong> with "Ingredients:" and "Instructions:" headers</li>
                            <li>• <strong>Delimited format</strong> with --Ingredients-- and --Instructions-- sections</li>
                            <li>• <strong>Unstructured text</strong> from websites, messages, or documents</li>
                            <li>• <strong>YouTube transcripts</strong> - copy/paste video captions for recipe extraction</li>
                            <li>• <strong>Smart detection</strong> - separates ingredients from instructions automatically</li>
                        </ul>
                    </div>

                    {/* Force multi-part toggle */}
                    <div className="mb-4 flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={forceMultiPart}
                                    onChange={(e) => setForceMultiPart(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                                <span className="ml-2 text-sm font-medium text-purple-900">
                                    Force multi-part parsing
                                </span>
                            </label>
                            <p className="text-xs text-purple-700 mt-1">
                                Check this for recipes with multiple components that aren't auto-detected
                            </p>
                        </div>
                        <div className="text-purple-600 text-2xl">
                            {detectedMultiPart || forceMultiPart ? '🧩' : '📝'}
                        </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start">
                            <div className="text-green-600 mr-3 mt-0.5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-green-900 mb-2">YouTube Recipe Extraction</h3>
                                <p className="text-green-800 text-sm mb-3">
                                    Want to extract recipes from YouTube cooking videos? Follow these steps:
                                </p>
                                <div className="bg-green-100 rounded-lg p-3 mb-3">
                                    <h4 className="font-medium text-green-900 text-sm mb-2">How to get YouTube transcripts:</h4>
                                    <ol className="list-decimal list-inside text-green-800 text-sm space-y-1">
                                        <li>Open the YouTube video on desktop or mobile</li>
                                        <li>Click the "..." (more) menu below the video</li>
                                        <li>Select <strong>"Show transcript"</strong> or <strong>"Open transcript"</strong></li>
                                        <li>Copy all the transcript text</li>
                                        <li>Paste it in the text box below</li>
                                        <li>Let our AI extract the recipe automatically</li>
                                    </ol>
                                </div>
                                <div className="flex items-center text-sm text-green-700">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd"
                                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                              clipRule="evenodd"/>
                                    </svg>
                                    <span><strong>Pro tip:</strong> Works great with complex recipes like pot pies that have multiple components!</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Recipe Text
                                </label>
                                {/* iOS Document Import Button */}
                                {isIOS && (
                                    <TouchEnhancedButton
                                        onClick={handleIOSDocumentImport}
                                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Import Text
                                    </TouchEnhancedButton>
                                )}
                            </div>

                            <NativeTextarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder={`Paste your recipe here...

Examples that work great:
• Multi-part recipes (pot pie with filling + biscuit topping)
• YouTube video transcripts (copy from transcript feature)
• Bullet-pointed ingredients with pricing
• Clear section headers like 'Ingredients' and 'Instructions'
• Mixed format text from websites
• Copy-pasted recipes from anywhere!

The parser will automatically:
- Detect multi-part recipes with separate components
- Extract recipes from YouTube transcripts
- Remove pricing info like ($0.37)
- Detect ingredients vs instructions
- Extract serving size and cooking times
- Generate relevant tags`}
                                className="h-64"
                                autoExpand={false}
                                maxLength={10000}
                                validation={(value) => ({
                                    isValid: value.length >= 50 || value.length === 0,
                                    message: value.length >= 50 ? 'Recipe text looks good!' :
                                        value.length > 0 ? 'Recipe text seems short - add more details for better parsing' : ''
                                })}
                            />
                        </div>

                        {/* Example button and detection indicator */}
                        <div className="flex items-center justify-between">
                            <TouchEnhancedButton
                                type="button"
                                onClick={() => setRawText(exampleMultiPartText)}
                                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                            >
                                Load Example Multi-Part Recipe
                            </TouchEnhancedButton>

                            <div className="text-xs text-gray-500">
                                Auto-detects: {detectedMultiPart || forceMultiPart ? 'Multi-part' : 'Single-part'}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between gap-3">
                            <TouchEnhancedButton
                                onClick={async () => {
                                    if (isIOS) {
                                        const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                                        await MobileHaptics.buttonTap();
                                    }
                                    onCancel();
                                }}
                                className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 min-h-[48px] order-2 sm:order-1"
                            >
                                Cancel
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={handleParse}
                                disabled={!rawText.trim() || isParsing}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2 min-h-[48px] order-1 sm:order-2"
                            >
                                {isParsing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Parsing...
                                    </>
                                ) : (
                                    <>
                                        Smart Parse Recipe
                                        {(detectedMultiPart || forceMultiPart) && (
                                            <span className="text-xs">(Multi-part)</span>
                                        )}
                                    </>
                                )}
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            ) : (
                // Preview Phase
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Parsed Recipe Preview
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Review and edit the extracted information before adding to your recipe collection.
                    </p>

                    {parsedRecipe && (
                        <div className="space-y-6">
                            {/* Parsing Results Summary */}
                            <div className={`border rounded-lg p-4 ${parsedRecipe.isMultiPart ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'}`}>
                                <h3 className={`font-medium mb-2 ${parsedRecipe.isMultiPart ? 'text-purple-900' : 'text-green-900'}`}>
                                    {parsedRecipe.isMultiPart ? 'Multi-Part' : 'Single-Part'} Parsing Results
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    {parsedRecipe.isMultiPart ? (
                                        <>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-700">{parsedRecipe.parts.length}</div>
                                                <div className="text-purple-600">Recipe Parts</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-700">
                                                    {parsedRecipe.parts.reduce((total, part) => total + part.ingredients.length, 0)}
                                                </div>
                                                <div className="text-purple-600">Total Ingredients</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-700">
                                                    {parsedRecipe.parts.reduce((total, part) => total + part.instructions.length, 0)}
                                                </div>
                                                <div className="text-purple-600">Total Steps</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-700">{parsedRecipe.tags.length}</div>
                                                <div className="text-purple-600">Auto Tags</div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-green-700">{parsedRecipe.ingredients.length}</div>
                                                <div className="text-green-600">Ingredients</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-green-700">{parsedRecipe.instructions.length}</div>
                                                <div className="text-green-600">Instructions</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-green-700">{parsedRecipe.tags.length}</div>
                                                <div className="text-green-600">Auto Tags</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-green-700">{parsedRecipe.servings || 'N/A'}</div>
                                                <div className="text-green-600">Servings</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Basic info fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Recipe Title
                                    </label>
                                    <NativeTextInput
                                        type="text"
                                        value={parsedRecipe.title}
                                        onChange={(e) => handleEditField('title', e.target.value)}
                                        placeholder="Enter recipe title..."
                                        validation={(value) => ({
                                            isValid: value.length >= 3 && value.length <= 100,
                                            message: value.length >= 3 && value.length <= 100
                                                ? 'Recipe title looks good!'
                                                : value.length < 3
                                                    ? 'Title should be at least 3 characters'
                                                    : 'Title too long (max 100 characters)'
                                        })}
                                        errorMessage="Recipe title is required (3-100 characters)"
                                        successMessage="Perfect recipe title!"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Cook Time (minutes)
                                    </label>
                                    <NativeTextInput
                                        type="number"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={parsedRecipe.cookTime || ''}
                                        onChange={(e) => handleEditField('cookTime', parseInt(e.target.value) || null)}
                                        placeholder="30"
                                        autoComplete="off"
                                        min="1"
                                        max="960"
                                        validation={(value) => {
                                            const num = parseInt(value);
                                            if (!value) return { isValid: true, message: '' };
                                            return {
                                                isValid: num >= 1 && num <= 960,
                                                message: num >= 1 && num <= 960 ? 'Good cook time' : 'Cook time should be 1-960 minutes'
                                            };
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Servings
                                    </label>
                                    <NativeTextInput
                                        type="number"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={parsedRecipe.servings || ''}
                                        onChange={(e) => handleEditField('servings', parseInt(e.target.value) || null)}
                                        placeholder="4"
                                        autoComplete="off"
                                        min="1"
                                        max="50"
                                        validation={(value) => {
                                            const num = parseInt(value);
                                            if (!value) return { isValid: true, message: '' };
                                            return {
                                                isValid: num >= 1 && num <= 50,
                                                message: num >= 1 && num <= 50 ? 'Good serving size' : 'Servings should be 1-50'
                                            };
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Prep Time (minutes)
                                    </label>
                                    <NativeTextInput
                                        type="number"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={parsedRecipe.prepTime || ''}
                                        onChange={(e) => handleEditField('prepTime', parseInt(e.target.value) || null)}
                                        placeholder="15"
                                        autoComplete="off"
                                        min="1"
                                        max="960"
                                        validation={(value) => {
                                            const num = parseInt(value);
                                            if (!value) return { isValid: true, message: '' };
                                            return {
                                                isValid: num >= 1 && num <= 480,
                                                message: num >= 1 && num <= 480 ? 'Good prep time' : 'Prep time should be 1-480 minutes'
                                            };
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Category
                                    </label>
                                    <NativeSelect
                                        value={parsedRecipe.category}
                                        onChange={(e) => handleEditField('category', e.target.value)}
                                        options={[
                                            { value: 'entrees', label: 'Entrees' },
                                            { value: 'appetizers', label: 'Appetizers' },
                                            { value: 'side-dishes', label: 'Side Dishes' },
                                            { value: 'soups', label: 'Soups' },
                                            { value: 'desserts', label: 'Desserts' },
                                            { value: 'beverages', label: 'Beverages' },
                                            { value: 'breakfast', label: 'Breakfast' },
                                            { value: 'sauces', label: 'Sauces' },
                                            { value: 'seasonings', label: 'Seasonings' },
                                            { value: 'breads', label: 'Breads' }
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <NativeTextarea
                                    value={parsedRecipe.description}
                                    onChange={(e) => handleEditField('description', e.target.value)}
                                    placeholder="Brief description of the recipe..."
                                    autoExpand={true}
                                    maxLength={500}
                                />
                            </div>

                            {/* Multi-part vs Single-part content display */}
                            {parsedRecipe.isMultiPart ? (
                                // Multi-part recipe display
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        Recipe Parts ({parsedRecipe.parts.length})
                                    </h3>
                                    <div className="space-y-6">
                                        {parsedRecipe.parts.map((part, partIndex) => (
                                            <div key={partIndex} className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                                                {/* Part header */}
                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-purple-900 mb-2">
                                                        Part {partIndex + 1} Name
                                                    </label>
                                                    <NativeTextInput
                                                        type="text"
                                                        value={part.name}
                                                        onChange={(e) => handleEditPart(partIndex, 'name', e.target.value)}
                                                        className="bg-white"
                                                    />
                                                </div>

                                                {/* Part ingredients */}
                                                <div className="mb-4">
                                                    <h4 className="font-medium text-purple-900 mb-2">
                                                        Ingredients ({part.ingredients.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {part.ingredients.map((ingredient, ingredientIndex) => (
                                                            <div key={ingredientIndex} className="bg-white border border-purple-200 rounded p-3">
                                                                <div className="flex gap-2">
                                                                    <NativeTextInput
                                                                        type="number"
                                                                        inputMode="numeric"
                                                                        pattern="[0-9]*"
                                                                        value={ingredient.amount}
                                                                        onChange={(e) => handleEditIngredient(ingredientIndex, 'amount', e.target.value, partIndex)}
                                                                        placeholder="1"
                                                                        autoComplete="off"
                                                                        className="w-20"
                                                                    />
                                                                    <NativeTextInput
                                                                        type="text"
                                                                        value={ingredient.unit}
                                                                        onChange={(e) => handleEditIngredient(ingredientIndex, 'unit', e.target.value, partIndex)}
                                                                        placeholder="Unit"
                                                                        className="w-20"
                                                                    />
                                                                    <NativeTextInput
                                                                        type="text"
                                                                        value={ingredient.name}
                                                                        onChange={(e) => handleEditIngredient(ingredientIndex, 'name', e.target.value, partIndex)}
                                                                        placeholder="Ingredient name"
                                                                        className="flex-1"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Part instructions */}
                                                <div>
                                                    <h4 className="font-medium text-purple-900 mb-2">
                                                        Instructions ({part.instructions.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {part.instructions.map((instruction, instructionIndex) => (
                                                            <div key={instructionIndex} className="bg-white border border-purple-200 rounded p-3">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <div className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium">
                                                                        {instruction.step}
                                                                    </div>
                                                                </div>
                                                                <NativeTextarea
                                                                    value={instruction.instruction}
                                                                    onChange={(e) => handleEditInstruction(instructionIndex, e.target.value, partIndex)}
                                                                    placeholder={`Step ${instruction.step} instructions...`}
                                                                    autoExpand={true}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                // Single-part recipe display
                                <>
                                    {/* Ingredients */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                            Ingredients ({parsedRecipe.ingredients.length})
                                        </h3>
                                        <div className="space-y-3 max-h-64 overflow-y-auto">
                                            {parsedRecipe.ingredients.map((ingredient, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <div className="flex gap-2 sm:w-auto">
                                                            <NativeTextInput
                                                                type="number"
                                                                inputMode="numeric"
                                                                pattern="[0-9]*"
                                                                value={ingredient.amount}
                                                                onChange={(e) => handleEditIngredient(index, 'amount', e.target.value)}
                                                                placeholder="1"
                                                                autoComplete="off"
                                                                className="w-20"
                                                            />
                                                            <NativeTextInput
                                                                type="text"
                                                                value={ingredient.unit}
                                                                onChange={(e) => handleEditIngredient(index, 'unit', e.target.value)}
                                                                placeholder="Unit"
                                                                className="w-20"
                                                            />
                                                        </div>
                                                        <NativeTextInput
                                                            type="text"
                                                            value={ingredient.name}
                                                            onChange={(e) => handleEditIngredient(index, 'name', e.target.value)}
                                                            placeholder="Ingredient name"
                                                            className="flex-1"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Instructions */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                            Instructions ({parsedRecipe.instructions.length})
                                        </h3>
                                        <div className="space-y-3 max-h-64 overflow-y-auto">
                                            {parsedRecipe.instructions.map((instruction, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-3">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                                                            {instruction.step}
                                                        </div>
                                                    </div>
                                                    <NativeTextarea
                                                        value={instruction.instruction}
                                                        onChange={(e) => handleEditInstruction(index, e.target.value)}
                                                        placeholder={`Step ${instruction.step} instructions...`}
                                                        autoExpand={true}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tags (comma-separated)
                                </label>
                                <NativeTextInput
                                    type="text"
                                    value={parsedRecipe.tags.join(', ')}
                                    onChange={(e) => handleEditField('tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                                    placeholder="italian, dinner, easy"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Auto-generated tags based on recipe content using enhanced parsing
                                </p>
                            </div>

                            {/* Difficulty */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Difficulty
                                </label>
                                <NativeSelect
                                    value={parsedRecipe.difficulty}
                                    onChange={(e) => handleEditField('difficulty', e.target.value)}
                                    options={[
                                        { value: 'easy', label: 'Easy' },
                                        { value: 'medium', label: 'Medium' },
                                        { value: 'hard', label: 'Hard' }
                                    ]}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Auto-determined based on complexity and instruction count
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row justify-between pt-4 border-t gap-3">
                                <TouchEnhancedButton
                                    onClick={() => setShowPreview(false)}
                                    className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 min-h-[48px] order-3 sm:order-1"
                                >
                                    Back to Edit Text
                                </TouchEnhancedButton>
                                <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
                                    <TouchEnhancedButton
                                        onClick={async () => {
                                            if (isIOS) {
                                                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                                                await MobileHaptics.buttonTap();
                                            }
                                            onCancel();
                                        }}
                                        className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 min-h-[48px] order-2 sm:order-1"
                                    >
                                        Cancel
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        onClick={handleUseRecipe}
                                        className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 min-h-[48px] order-1 sm:order-2"
                                    >
                                        Use This Recipe
                                        {parsedRecipe.isMultiPart && (
                                            <span className="ml-1 text-xs">(Multi-part)</span>
                                        )}
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}