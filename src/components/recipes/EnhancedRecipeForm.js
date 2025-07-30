'use client';
// file: /src/components/recipes/EnhancedRecipeForm.js v7 - Added multi-part recipe support

import {useState, useEffect, useRef, useCallback} from 'react';
import RecipeParser from './RecipeParser';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {apiPost} from '@/lib/api-config';
import VideoImportLoadingModal from "./VideoImportLoadingModal";
import {useShareHandler} from "@/hooks/useShareHandler";
import {useSearchParams, useRouter} from 'next/navigation';
import NutritionFacts from '@/components/nutrition/NutritionFacts';
import NutritionModal from '@/components/nutrition/NutritionModal';
import UpdateNutritionButton from '@/components/nutrition/UpdateNutritionButton';
import { VoiceInput } from '@/components/mobile/VoiceInput';
import KeyboardOptimizedInput from '@/components/forms/KeyboardOptimizedInput';

// FIXED: Move AutoExpandingTextarea OUTSIDE the main component
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

export default function EnhancedRecipeForm({
                                               initialData,
                                               onSubmit,
                                               onCancel,
                                               isEditing = false,
                                               isImportMode = false,
                                               showAdvancedNutrition = false
                                           }) {
    const [inputMethod, setInputMethod] = useState('manual');
    const [showParser, setShowParser] = useState(false);
    const [showUrlImport, setShowUrlImport] = useState(false);
    const [showVideoImport, setShowVideoImport] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [isVideoImporting, setIsVideoImporting] = useState(false);
    const [videoImportProgress, setVideoImportProgress] = useState({
        stage: '',
        platform: '',
        message: ''
    });
    const [videoImportError, setVideoImportError] = useState('');
    const [videoInfo, setVideoInfo] = useState(null);
    const [importSource, setImportSource] = useState(null);
    const [sharedContent, setSharedContent] = useState(null);
    const [showNutritionModal, setShowNutritionModal] = useState(false);
    const [showNutritionDetailsModal, setShowNutritionDetailsModal] = useState(false);
    const [videoImportPlatform, setVideoImportPlatform] = useState('video');
    const [recipeImage, setRecipeImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageSource, setImageSource] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // NEW: Multi-part recipe state
    const [isMultiPart, setIsMultiPart] = useState(false);
    const [activePart, setActivePart] = useState(0);

    // Voice Input State
    const [showVoiceTitle, setShowVoiceTitle] = useState(false);
    const [showVoiceDescription, setShowVoiceDescription] = useState(false);
    const [showVoiceIngredients, setShowVoiceIngredients] = useState(false);
    const [showVoiceInstructions, setShowVoiceInstructions] = useState(false);
    const [processingVoice, setProcessingVoice] = useState(false);
    const [voiceResults, setVoiceResults] = useState('');

    const searchParams = useSearchParams();

    const CATEGORY_OPTIONS = [
        {value: 'seasonings', label: 'Seasonings'},
        {value: 'sauces', label: 'Sauces'},
        {value: 'salad-dressings', label: 'Salad Dressings'},
        {value: 'marinades', label: 'Marinades'},
        {value: 'ingredients', label: 'Basic Ingredients'},
        {value: 'entrees', label: 'Entrees'},
        {value: 'side-dishes', label: 'Side Dishes'},
        {value: 'soups', label: 'Soups'},
        {value: 'sandwiches', label: 'Sandwiches'},
        {value: 'appetizers', label: 'Appetizers'},
        {value: 'desserts', label: 'Desserts'},
        {value: 'breads', label: 'Breads'},
        {value: 'pizza-dough', label: 'Pizza Dough'},
        {value: 'specialty-items', label: 'Specialty Items'},
        {value: 'beverages', label: 'Beverages'},
        {value: 'breakfast', label: 'Breakfast'}
    ];

    // NEW: Initialize recipe state with multi-part support
    const [recipe, setRecipe] = useState({
        title: '',
        description: '',
        isMultiPart: false,
        parts: [{
            name: '',
            ingredients: [{name: '', amount: '', unit: '', optional: false}],
            instructions: [{step: 1, instruction: ''}]
        }],
        // Legacy fields for backward compatibility
        ingredients: [{name: '', amount: '', unit: '', optional: false}],
        instructions: [{step: 1, instruction: ''}],
        prepTime: '',
        cookTime: '',
        servings: '',
        difficulty: 'medium',
        tags: [],
        source: '',
        isPublic: false,
        category: 'entrees',
        nutrition: {
            calories: '',
            protein: '',
            carbs: '',
            fat: '',
            fiber: ''
        },
        ...initialData
    });

    const [tagInput, setTagInput] = useState('');
    const [tagsString, setTagsString] = useState(
        initialData?.tags ? initialData.tags.join(', ') : ''
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // URL import state
    const [urlInput, setUrlInput] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState('');

    const router = useRouter();
    const basicInfoRef = useRef(null)

    // NEW: Initialize multi-part state from initialData
    useEffect(() => {
        if (initialData) {
            if (initialData.isMultiPart && initialData.parts && initialData.parts.length > 0) {
                setIsMultiPart(true);
                setRecipe(prev => ({
                    ...prev,
                    isMultiPart: true,
                    parts: initialData.parts
                }));
            } else if (initialData.ingredients || initialData.instructions) {
                // Convert legacy single-part recipe to new format
                setIsMultiPart(false);
                setRecipe(prev => ({
                    ...prev,
                    isMultiPart: false,
                    parts: [{
                        name: '',
                        ingredients: initialData.ingredients || [{name: '', amount: '', unit: '', optional: false}],
                        instructions: initialData.instructions || [{step: 1, instruction: ''}]
                    }]
                }));
            }
        }
    }, [initialData]);

    const scrollToBasicInfo = () => {
        if (basicInfoRef.current) {
            const element = basicInfoRef.current;
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - 120;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    // NEW: Multi-part recipe functions
    const toggleMultiPart = () => {
        const newIsMultiPart = !isMultiPart;
        setIsMultiPart(newIsMultiPart);

        if (newIsMultiPart) {
            // Convert single-part to multi-part
            const currentIngredients = recipe.ingredients?.length > 0 ? recipe.ingredients : [{name: '', amount: '', unit: '', optional: false}];
            const currentInstructions = recipe.instructions?.length > 0 ? recipe.instructions : [{step: 1, instruction: ''}];

            setRecipe(prev => ({
                ...prev,
                isMultiPart: true,
                parts: [
                    {
                        name: 'Main Recipe',
                        ingredients: currentIngredients,
                        instructions: currentInstructions
                    }
                ]
            }));
        } else {
            // Convert multi-part back to single-part (use first part)
            const firstPart = recipe.parts?.[0] || {
                ingredients: [{name: '', amount: '', unit: '', optional: false}],
                instructions: [{step: 1, instruction: ''}]
            };

            setRecipe(prev => ({
                ...prev,
                isMultiPart: false,
                ingredients: firstPart.ingredients,
                instructions: firstPart.instructions
            }));
        }
        setActivePart(0);
    };

    const addRecipePart = () => {
        setRecipe(prev => ({
            ...prev,
            parts: [
                ...prev.parts,
                {
                    name: `Part ${prev.parts.length + 1}`,
                    ingredients: [{name: '', amount: '', unit: '', optional: false}],
                    instructions: [{step: 1, instruction: ''}]
                }
            ]
        }));
        setActivePart(recipe.parts.length);
    };

    const removeRecipePart = (partIndex) => {
        if (recipe.parts.length <= 1) return; // Don't allow removing the last part

        setRecipe(prev => ({
            ...prev,
            parts: prev.parts.filter((_, index) => index !== partIndex)
        }));

        // Adjust active part if necessary
        if (activePart >= partIndex && activePart > 0) {
            setActivePart(activePart - 1);
        }
    };

    const updatePartName = (partIndex, name) => {
        setRecipe(prev => ({
            ...prev,
            parts: prev.parts.map((part, index) =>
                index === partIndex ? { ...part, name } : part
            )
        }));
    };

    // NEW: Multi-part ingredient functions
    const addIngredientToPart = (partIndex) => {
        setRecipe(prev => ({
            ...prev,
            parts: prev.parts.map((part, index) =>
                index === partIndex
                    ? { ...part, ingredients: [...part.ingredients, {name: '', amount: '', unit: '', optional: false}] }
                    : part
            )
        }));
    };

    const updateIngredientInPart = (partIndex, ingredientIndex, field, value) => {
        setRecipe(prev => ({
            ...prev,
            parts: prev.parts.map((part, pIndex) =>
                pIndex === partIndex
                    ? {
                        ...part,
                        ingredients: part.ingredients.map((ing, iIndex) =>
                            iIndex === ingredientIndex ? {...ing, [field]: value} : ing
                        )
                    }
                    : part
            )
        }));
    };

    const removeIngredientFromPart = (partIndex, ingredientIndex) => {
        setRecipe(prev => ({
            ...prev,
            parts: prev.parts.map((part, pIndex) =>
                pIndex === partIndex
                    ? { ...part, ingredients: part.ingredients.filter((_, iIndex) => iIndex !== ingredientIndex) }
                    : part
            )
        }));
    };

    // NEW: Multi-part instruction functions
    const addInstructionToPart = (partIndex) => {
        setRecipe(prev => ({
            ...prev,
            parts: prev.parts.map((part, pIndex) =>
                pIndex === partIndex
                    ? { ...part, instructions: [...part.instructions, {step: part.instructions.length + 1, instruction: ''}] }
                    : part
            )
        }));
    };

    const updateInstructionInPart = useCallback((partIndex, instructionIndex, value) => {
        setRecipe(prev => ({
            ...prev,
            parts: prev.parts.map((part, pIndex) =>
                pIndex === partIndex
                    ? {
                        ...part,
                        instructions: part.instructions.map((inst, iIndex) =>
                            iIndex === instructionIndex ? { ...inst, instruction: value } : inst
                        )
                    }
                    : part
            )
        }));
    }, []);

    const removeInstructionFromPart = (partIndex, instructionIndex) => {
        setRecipe(prev => ({
            ...prev,
            parts: prev.parts.map((part, pIndex) =>
                pIndex === partIndex
                    ? {
                        ...part,
                        instructions: part.instructions
                            .filter((_, iIndex) => iIndex !== instructionIndex)
                            .map((inst, index) => ({ ...inst, step: index + 1 }))
                    }
                    : part
            )
        }));
    };

    // Legacy functions for backward compatibility
    const updateRecipe = (field, value) => {
        setRecipe(prev => ({...prev, [field]: value}));
    };

    const updateNutrition = (field, value) => {
        setRecipe(prev => ({
            ...prev,
            nutrition: {...prev.nutrition, [field]: value}
        }));
    };

    // Legacy ingredient/instruction functions (for single-part recipes)
    const addIngredient = () => {
        if (isMultiPart) {
            addIngredientToPart(activePart);
        } else {
            setRecipe(prev => ({
                ...prev,
                ingredients: [...prev.ingredients, {name: '', amount: '', unit: '', optional: false}]
            }));
        }
    };

    const updateIngredient = (index, field, value) => {
        if (isMultiPart) {
            updateIngredientInPart(activePart, index, field, value);
        } else {
            setRecipe(prev => ({
                ...prev,
                ingredients: prev.ingredients.map((ing, i) =>
                    i === index ? {...ing, [field]: value} : ing
                )
            }));
        }
    };

    const removeIngredient = (index) => {
        if (isMultiPart) {
            removeIngredientFromPart(activePart, index);
        } else {
            setRecipe(prev => ({
                ...prev,
                ingredients: prev.ingredients.filter((_, i) => i !== index)
            }));
        }
    };

    const addInstruction = () => {
        if (isMultiPart) {
            addInstructionToPart(activePart);
        } else {
            setRecipe(prev => ({
                ...prev,
                instructions: [...prev.instructions, {step: prev.instructions.length + 1, instruction: ''}]
            }));
        }
    };

    const updateInstruction = useCallback((index, value) => {
        if (isMultiPart) {
            updateInstructionInPart(activePart, index, value);
        } else {
            setRecipe(prev => ({
                ...prev,
                instructions: prev.instructions.map((inst, i) => {
                    if (i === index) {
                        if (typeof inst === 'object') {
                            return {...inst, instruction: value};
                        } else {
                            return {step: index + 1, instruction: value};
                        }
                    }
                    return inst;
                })
            }));
        }
    }, [isMultiPart, activePart]);

    const removeInstruction = (index) => {
        if (isMultiPart) {
            removeInstructionFromPart(activePart, index);
        } else {
            setRecipe(prev => ({
                ...prev,
                instructions: prev.instructions
                    .filter((_, i) => i !== index)
                    .map((inst, i) => ({...inst, step: i + 1}))
            }));
        }
    };

    const getInstructionText = (instruction) => {
        if (typeof instruction === 'string') {
            return instruction;
        }
        if (typeof instruction === 'object') {
            return instruction.instruction || instruction.text || '';
        }
        return '';
    };

    // Helper function to get current part's data
    const getCurrentPartData = () => {
        if (isMultiPart && recipe.parts && recipe.parts[activePart]) {
            return recipe.parts[activePart];
        }
        return {
            ingredients: recipe.ingredients || [],
            instructions: recipe.instructions || []
        };
    };

    const addTag = () => {
        if (tagInput.trim() && !recipe.tags.includes(tagInput.trim())) {
            const newTags = [...recipe.tags, tagInput.trim()];
            setRecipe(prev => ({
                ...prev,
                tags: newTags
            }));
            setTagsString(newTags.join(', '));
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        const newTags = recipe.tags.filter(tag => tag !== tagToRemove);
        setRecipe(prev => ({
            ...prev,
            tags: newTags
        }));
        setTagsString(newTags.join(', '));
    };

    const extractNumber = (value) => {
        if (!value) return '';
        const match = String(value).match(/^(\d+)/);
        return match ? match[1] : '';
    };

    const extractNutritionValue = (value) => {
        if (!value) return '';
        if (typeof value === 'object' && value.value !== undefined) {
            return String(value.value);
        }
        return String(value);
    };

    // FIXED: Handle tags string changes without immediately parsing
    const handleTagsStringChange = (value) => {
        setTagsString(value);
    };

    // FIXED: Process tags string on blur
    const handleTagsStringBlur = () => {
        const tags = tagsString
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        setRecipe(prev => ({
            ...prev,
            tags: tags
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const finalTags = tagsString
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            // NEW: Prepare final recipe with proper structure
            const finalRecipe = {
                ...recipe,
                tags: finalTags,
                isMultiPart,

                // For backward compatibility, if single-part, also populate legacy fields
                ...((!isMultiPart && recipe.parts && recipe.parts[0]) && {
                    ingredients: recipe.parts[0].ingredients.filter(ing => ing.name.trim()),
                    instructions: recipe.parts[0].instructions.filter(inst =>
                        getInstructionText(inst).trim()
                    ).map(inst => getInstructionText(inst))
                }),

                // For multi-part, clean up parts
                ...(isMultiPart && {
                    parts: recipe.parts.map(part => ({
                        ...part,
                        ingredients: part.ingredients.filter(ing => ing.name.trim()),
                        instructions: part.instructions.filter(inst =>
                            getInstructionText(inst).trim()
                        ).map(inst => getInstructionText(inst))
                    }))
                }),

                // Include image data if present
                ...(recipeImage && {
                    recipeImage: recipeImage
                }),
                ...(recipe.extractedImage && {
                    extractedImage: recipe.extractedImage
                }),

                _formMetadata: undefined
            };

            Object.keys(finalRecipe).forEach(key => {
                if (finalRecipe[key] === undefined) {
                    delete finalRecipe[key];
                }
            });

            await onSubmit(finalRecipe);
        } catch (error) {
            console.error('Error submitting recipe:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show parser component
    if (showParser) {
        return (
            <RecipeParser
                onRecipeParsed={(parsedData) => {
                    // FIXED: Handle both single-part and multi-part parsing
                    if (parsedData.isMultiPart && parsedData.parts && parsedData.parts.length > 0) {
                        // Handle multi-part parsed recipe
                        setIsMultiPart(true);
                        setRecipe(prevRecipe => ({
                            ...prevRecipe,
                            title: parsedData.title || prevRecipe.title,
                            description: parsedData.description || prevRecipe.description,
                            isMultiPart: true,
                            parts: parsedData.parts,
                            // Clear legacy fields for multi-part
                            ingredients: [],
                            instructions: [],
                            prepTime: parsedData.prepTime || prevRecipe.prepTime,
                            cookTime: parsedData.cookTime || prevRecipe.cookTime,
                            servings: parsedData.servings || prevRecipe.servings,
                            tags: [...new Set([...prevRecipe.tags, ...parsedData.tags])],
                            source: parsedData.source || prevRecipe.source,
                            nutrition: parsedData.nutrition || prevRecipe.nutrition
                        }));
                        setActivePart(0); // Set to first part
                    } else {
                        // Handle single-part parsed recipe
                        setIsMultiPart(false);
                        setRecipe(prevRecipe => ({
                            ...prevRecipe,
                            title: parsedData.title || prevRecipe.title,
                            description: parsedData.description || prevRecipe.description,
                            isMultiPart: false,
                            ingredients: parsedData.ingredients.length > 0 ? parsedData.ingredients : prevRecipe.ingredients,
                            instructions: parsedData.instructions.length > 0 ? parsedData.instructions : prevRecipe.instructions,
                            // Update parts to match single-part structure for consistency
                            parts: [{
                                name: '',
                                ingredients: parsedData.ingredients.length > 0 ? parsedData.ingredients : prevRecipe.ingredients,
                                instructions: parsedData.instructions.length > 0 ? parsedData.instructions : prevRecipe.instructions
                            }],
                            prepTime: parsedData.prepTime || prevRecipe.prepTime,
                            cookTime: parsedData.cookTime || prevRecipe.cookTime,
                            servings: parsedData.servings || prevRecipe.servings,
                            tags: [...new Set([...prevRecipe.tags, ...parsedData.tags])],
                            source: parsedData.source || prevRecipe.source,
                            nutrition: parsedData.nutrition || prevRecipe.nutrition
                        }));
                    }

                    // Update tags string for UI
                    setTagsString([...new Set([...recipe.tags, ...parsedData.tags])].join(', '));
                    setShowParser(false);
                    setInputMethod('manual');
                }}
                onCancel={() => setShowParser(false)}
            />
        );
    }

    // Show URL import component
    if (showUrlImport) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    🌐 Import from URL
                </h2>
                <p className="text-gray-600 mb-4">
                    Import recipes directly from cooking websites like AllRecipes, Food Network, Epicurious, and more.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Recipe URL
                        </label>
                        <KeyboardOptimizedInput
                            type="url"
                            value={urlInput}
                            onChange={(e) => {
                                setUrlInput(e.target.value);
                                setImportError(''); // Clear error when user types
                            }}
                            placeholder="https://www.allrecipes.com/recipe/..."
                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            style={{minHeight: '48px'}}
                            disabled={isImporting}
                        />
                    </div>

                    {importError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="text-sm text-red-800">
                                <strong>Import Failed:</strong> {importError}
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm text-blue-800">
                            <strong>✨ Supported Sites:</strong> AllRecipes, Food Network, Epicurious, Simply Recipes,
                            Cookist, Delish, Taste of Home, The Kitchn, Bon Appétit, and many more recipe websites.
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
                        <TouchEnhancedButton
                            onClick={() => {
                                setShowUrlImport(false);
                                setUrlInput('');
                                setImportError('');
                            }}
                            className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 min-h-[48px] text-center"
                            disabled={isImporting}
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <TouchEnhancedButton
                                onClick={() => {
                                    setShowUrlImport(false);
                                    setShowParser(true);
                                    setUrlInput('');
                                    setImportError('');
                                }}
                                className="px-4 py-3 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 min-h-[48px] text-center"
                                disabled={isImporting}
                            >
                                📝 Use Text Parser Instead
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => handleUrlImport(urlInput)}
                                disabled={!urlInput.trim() || isImporting}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2 min-h-[48px]"
                            >
                                {isImporting ? (
                                    <>
                                        <div
                                            className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        🌐 Import Recipe
                                    </>
                                )}
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    {/* Show video import component */
    }
    if (showVideoImport) {
        return (
            <div className="space-y-6">
                <VideoImportLoadingModal
                    isVisible={isVideoImporting}
                    platform={videoImportProgress.platform || 'facebook'}
                    stage={videoImportProgress.stage || 'processing'}
                    message={videoImportProgress.message || 'Processing video...'}
                    videoUrl={videoUrl}
                    onComplete={() => {
                    }}
                    style={{zIndex: 9999}}
                />

                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        🎥 Extract Recipe from Social Video (AI-Powered)
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Extract recipes from TikTok, Instagram, and Facebook using advanced AI audio analysis.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Video URL
                            </label>
                            <KeyboardOptimizedInput
                                type="url"
                                value={videoUrl}
                                onChange={(e) => {
                                    setVideoUrl(e.target.value);
                                    setVideoImportError(''); // Clear error when user types
                                }}
                                placeholder="https://tiktok.com/@user/video/... or Instagram/Facebook URL"
                                className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                style={{minHeight: '48px'}}
                                disabled={isVideoImporting}
                            />
                        </div>

                        {videoImportError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="text-sm text-red-800">
                                    <strong>Video Import Failed:</strong> {videoImportError}
                                    {videoImportError.includes('Facebook') && (
                                        <div className="mt-2 text-xs text-red-700">
                                            <strong>Facebook Tips:</strong>
                                            <ul className="list-disc list-inside mt-1 space-y-1">
                                                <li>Make sure the video is public (not private)</li>
                                                <li>Try using the share link from Facebook mobile app</li>
                                                <li>For private videos, copy any recipe text and use Text Paste</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* UPDATED: Info box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div className="flex items-start">
                                <div className="text-blue-600 mr-3 mt-0.5">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd"
                                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                              clipRule="evenodd"/>
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm text-blue-800 mb-2">
                                        <strong>🤖 Smart Extraction Methods:</strong>
                                    </div>
                                    <div className="text-xs text-blue-700 space-y-1">
                                        <div>• <strong>🎵 TikTok:</strong> Full audio + video analysis</div>
                                        <div>• <strong>📸 Instagram:</strong> Audio analysis + text extraction</div>
                                        <div>• <strong>👥 Facebook:</strong> Use the share button inside Facebook mobile
                                        </div>
                                        <div>• <strong>📺 YouTube:</strong> Use Text Paste with transcripts</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
                            <TouchEnhancedButton
                                onClick={() => {
                                    setShowVideoImport(false);
                                    setVideoUrl('');
                                    setVideoImportError('');
                                }}
                                className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 min-h-[48px] text-center"
                                disabled={isVideoImporting}
                            >
                                Cancel
                            </TouchEnhancedButton>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <TouchEnhancedButton
                                    onClick={() => {
                                        setShowVideoImport(false);
                                        setShowParser(true); // CHANGED: Point to text parser for YouTube
                                        setVideoUrl('');
                                        setVideoImportError('');
                                    }}
                                    className="px-4 py-3 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 min-h-[48px] text-center"
                                    disabled={isVideoImporting}
                                >
                                    📝 Use Text Paste (for YouTube)
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => handleVideoImport(videoUrl)}
                                    disabled={!videoUrl.trim() || isVideoImporting}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center gap-2 min-h-[48px]"
                                >
                                    {isVideoImporting ? (
                                        <>
                                            <div
                                                className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            AI Extracting...
                                        </>
                                    ) : (
                                        <>
                                            🤖 Extract Recipe
                                        </>
                                    )}
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            {/* Input Method Selection */}
            {!isEditing && !isImportMode && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        How would you like to add this recipe?
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <TouchEnhancedButton
                            onClick={() => setInputMethod('manual')}
                            className={`p-4 border-2 rounded-lg text-left transition-colors min-h-[120px] ${
                                inputMethod === 'manual'
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className="text-2xl mb-2">✏️</div>
                            <h3 className="font-medium text-gray-900">Manual Entry</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Enter recipe details step by step
                            </p>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => setShowParser(true)}
                            className="p-4 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-colors min-h-[120px]"
                        >
                            <div className="text-2xl mb-2">📝</div>
                            <h3 className="font-medium text-gray-900">Parse Recipe Text</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Paste recipe text and auto-extract details
                            </p>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => router.push('/recipes/import')}
                            className="p-4 border-2 border-gray-200 rounded-lg text-left hover:border-gray-300 transition-colors min-h-[120px]"
                        >
                            <div className="text-2xl mb-2">🎯</div>
                            <h3 className="font-medium text-gray-900">Import Recipe</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Import from social media, websites, or enhance with AI
                            </p>
                        </TouchEnhancedButton>
                    </div>

                    {inputMethod === 'manual' && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                💡 <strong>Tip:</strong> You can create multi-part recipes like pot pies with separate filling and topping sections!
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Manual Recipe Form */}
            {(inputMethod === 'manual' || isEditing) && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div ref={basicInfoRef} className="bg-white shadow rounded-lg p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h4 className="text-sm font-medium text-blue-800">
                                    📝 Verify ingredients, instructions, and other information, then click "Create/Update Recipe" at the bottom.
                                </h4>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Recipe Title *
                                    </label>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setShowVoiceTitle(true)}
                                        className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1"
                                    >
                                        🎤 Voice
                                    </TouchEnhancedButton>
                                </div>
                                <KeyboardOptimizedInput
                                    type="text"
                                    required
                                    value={recipe.title}
                                    onChange={(e) => updateRecipe('title', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{minHeight: '48px'}}
                                    placeholder="Enter recipe title..."
                                />
                            </div>

                            {/* Category Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <select
                                    value={recipe.category || 'entrees'}
                                    onChange={(e) => updateRecipe('category', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{minHeight: '48px'}}
                                >
                                    {CATEGORY_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* NEW: Multi-Part Toggle */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Recipe Type
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="isMultiPart"
                                            checked={isMultiPart}
                                            onChange={toggleMultiPart}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                        />
                                        <label htmlFor="isMultiPart" className="ml-2 text-sm text-gray-700">
                                            Multi-part recipe (e.g., pot pie with filling + topping)
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Description
                                    </label>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setShowVoiceDescription(true)}
                                        className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1"
                                    >
                                        🎤 Voice
                                    </TouchEnhancedButton>
                                </div>
                                <AutoExpandingTextarea
                                    value={recipe.description}
                                    onChange={(e) => updateRecipe('description', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Brief description of the recipe..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Prep Time (minutes)
                                </label>
                                <KeyboardOptimizedInput
                                    type="number"
                                    value={extractNumber(recipe.prepTime)}
                                    onChange={(e) => updateRecipe('prepTime', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{minHeight: '48px'}}
                                    placeholder="15"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cook Time (minutes)
                                </label>
                                <KeyboardOptimizedInput
                                    type="number"
                                    value={extractNumber(recipe.cookTime)}
                                    onChange={(e) => updateRecipe('cookTime', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{minHeight: '48px'}}
                                    placeholder="30"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Servings
                                </label>
                                <KeyboardOptimizedInput
                                    type="number"
                                    value={extractNumber(recipe.servings)}
                                    onChange={(e) => updateRecipe('servings', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{minHeight: '48px'}}
                                    placeholder="4"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Difficulty
                                </label>
                                <select
                                    value={recipe.difficulty}
                                    onChange={(e) => updateRecipe('difficulty', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{minHeight: '48px'}}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* NEW: Multi-Part Recipe Sections */}
                    {isMultiPart ? (
                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Recipe Parts ({recipe.parts?.length || 0})
                                </h3>
                                <TouchEnhancedButton
                                    type="button"
                                    onClick={addRecipePart}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add Part
                                </TouchEnhancedButton>
                            </div>

                            {/* Part Tabs */}
                            {recipe.parts && recipe.parts.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {recipe.parts.map((part, index) => (
                                            <div key={index} className="flex items-center">
                                                <TouchEnhancedButton
                                                    type="button"
                                                    onClick={() => setActivePart(index)}
                                                    className={`px-4 py-2 rounded-l-md text-sm font-medium transition-colors ${
                                                        activePart === index
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    }`}
                                                >
                                                    {part.name || `Part ${index + 1}`}
                                                </TouchEnhancedButton>
                                                {recipe.parts.length > 1 && (
                                                    <TouchEnhancedButton
                                                        type="button"
                                                        onClick={() => removeRecipePart(index)}
                                                        className="bg-red-500 text-white px-2 py-2 rounded-r-md hover:bg-red-600 transition-colors"
                                                        title="Remove this part"
                                                    >
                                                        ×
                                                    </TouchEnhancedButton>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Active Part Name Editor */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Part Name
                                        </label>
                                        <KeyboardOptimizedInput
                                            type="text"
                                            value={recipe.parts[activePart]?.name || ''}
                                            onChange={(e) => updatePartName(activePart, e.target.value)}
                                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            style={{minHeight: '48px'}}
                                            placeholder={`Part ${activePart + 1} (e.g., "Filling", "Topping", "Marinade")`}
                                        />
                                    </div>

                                    {/* Current Part Ingredients */}
                                    <div className="mb-8">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-md font-medium text-gray-900">
                                                Ingredients for {recipe.parts[activePart]?.name || `Part ${activePart + 1}`}
                                                ({getCurrentPartData().ingredients?.length || 0})
                                            </h4>
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => setShowVoiceIngredients(true)}
                                                className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 text-sm font-medium flex items-center gap-2"
                                            >
                                                🎤 Add by Voice
                                            </TouchEnhancedButton>
                                        </div>

                                        <div className="space-y-4">
                                            {getCurrentPartData().ingredients?.map((ingredient, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <label className="flex items-center text-sm text-gray-600 pl-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={ingredient.optional}
                                                                onChange={(e) => updateIngredient(index, 'optional', e.target.checked)}
                                                                className="ingredient-checkbox h-4 w-4"
                                                            />
                                                            <span className="ml-3">Optional</span>
                                                        </label>
                                                        <TouchEnhancedButton
                                                            type="button"
                                                            onClick={() => removeIngredient(index)}
                                                            className="font-semibold text-red-600 hover:text-red-700 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                            disabled={getCurrentPartData().ingredients?.length === 1}
                                                        >
                                                            ✕
                                                        </TouchEnhancedButton>
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row gap-3">
                                                        <div className="flex gap-3 sm:w-auto">
                                                            <div className="flex-1 sm:w-24">
                                                                <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">
                                                                    Amount
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={ingredient.amount}
                                                                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                                                                    placeholder="1"
                                                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                                    style={{minHeight: '48px'}}
                                                                />
                                                            </div>
                                                            <div className="flex-1 sm:w-24">
                                                                <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">
                                                                    Unit
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={ingredient.unit}
                                                                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                                                                    placeholder="cup"
                                                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                                    style={{minHeight: '48px'}}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex-1">
                                                            <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">
                                                                Ingredient
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={ingredient.name}
                                                                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                                                                placeholder="Ingredient name"
                                                                className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                                style={{minHeight: '48px'}}
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={addIngredient}
                                            className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium px-4 py-3 min-h-[48px]"
                                        >
                                            + Add Ingredient
                                        </TouchEnhancedButton>
                                    </div>

                                    {/* Current Part Instructions */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-md font-medium text-gray-900">
                                                Instructions for {recipe.parts[activePart]?.name || `Part ${activePart + 1}`}
                                                ({getCurrentPartData().instructions?.length || 0})
                                            </h4>
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => setShowVoiceInstructions(true)}
                                                className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 text-sm font-medium flex items-center gap-2"
                                            >
                                                🎤 Add by Voice
                                            </TouchEnhancedButton>
                                        </div>

                                        <div className="space-y-4">
                                            {getCurrentPartData().instructions?.map((instruction, index) => {
                                                const instructionText = getInstructionText(instruction);
                                                const stepNumber = typeof instruction === 'object' ? instruction.step : index + 1;

                                                return (
                                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                                                                {stepNumber}
                                                            </div>
                                                            <TouchEnhancedButton
                                                                type="button"
                                                                onClick={() => removeInstruction(index)}
                                                                className="font-semibold text-red-600 hover:text-red-700 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                                disabled={getCurrentPartData().instructions?.length === 1}
                                                            >
                                                                ✕
                                                            </TouchEnhancedButton>
                                                        </div>

                                                        <AutoExpandingTextarea
                                                            value={instructionText}
                                                            onChange={(e) => updateInstruction(index, e.target.value)}
                                                            placeholder="Describe this step..."
                                                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                            required
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={addInstruction}
                                            className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium px-4 py-3 min-h-[48px]"
                                        >
                                            + Add Step
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Single-Part Recipe Sections (Legacy) */
                        <>
                            {/* Ingredients section */}
                            <div className="bg-white shadow rounded-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Ingredients ({recipe.ingredients?.length || 0})
                                    </h3>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setShowVoiceIngredients(true)}
                                        className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 text-sm font-medium flex items-center gap-2"
                                    >
                                        🎤 Add by Voice
                                    </TouchEnhancedButton>
                                </div>

                                <div className="space-y-4">
                                    {recipe.ingredients?.map((ingredient, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="flex items-center text-sm text-gray-600 pl-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={ingredient.optional}
                                                        onChange={(e) => updateIngredient(index, 'optional', e.target.checked)}
                                                        className="ingredient-checkbox h-4 w-4"
                                                    />
                                                    <span className="ml-3">Optional</span>
                                                </label>
                                                <TouchEnhancedButton
                                                    type="button"
                                                    onClick={() => removeIngredient(index)}
                                                    className="font-semibold text-red-600 hover:text-red-700 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                    disabled={recipe.ingredients?.length === 1}
                                                >
                                                    ✕
                                                </TouchEnhancedButton>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <div className="flex gap-3 sm:w-auto">
                                                    <div className="flex-1 sm:w-24">
                                                        <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">
                                                            Amount
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={ingredient.amount}
                                                            onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                                                            placeholder="1"
                                                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                            style={{minHeight: '48px'}}
                                                        />
                                                    </div>
                                                    <div className="flex-1 sm:w-24">
                                                        <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">
                                                            Unit
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={ingredient.unit}
                                                            onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                                                            placeholder="cup"
                                                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                            style={{minHeight: '48px'}}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex-1">
                                                    <label className="block text-xs font-medium text-gray-500 mb-1 sm:hidden">
                                                        Ingredient
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={ingredient.name}
                                                        onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                                                        placeholder="Ingredient name"
                                                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                        style={{minHeight: '48px'}}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <TouchEnhancedButton
                                    type="button"
                                    onClick={addIngredient}
                                    className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium px-4 py-3 min-h-[48px]"
                                >
                                    + Add Ingredient
                                </TouchEnhancedButton>
                            </div>

                            {/* Instructions Section */}
                            <div className="bg-white shadow rounded-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Instructions ({recipe.instructions?.length || 0})
                                    </h3>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setShowVoiceInstructions(true)}
                                        className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 text-sm font-medium flex items-center gap-2"
                                    >
                                        🎤 Add by Voice
                                    </TouchEnhancedButton>
                                </div>

                                <div className="space-y-4">
                                    {recipe.instructions?.map((instruction, index) => {
                                        const instructionText = getInstructionText(instruction);
                                        const stepNumber = typeof instruction === 'object' ? instruction.step : index + 1;

                                        return (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                                                        {stepNumber}
                                                    </div>
                                                    <TouchEnhancedButton
                                                        type="button"
                                                        onClick={() => removeInstruction(index)}
                                                        className="font-semibold text-red-600 hover:text-red-700 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                        disabled={recipe.instructions?.length === 1}
                                                    >
                                                        ✕
                                                    </TouchEnhancedButton>
                                                </div>

                                                <AutoExpandingTextarea
                                                    value={instructionText}
                                                    onChange={(e) => updateInstruction(index, e.target.value)}
                                                    placeholder="Describe this step..."
                                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                    required
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                <TouchEnhancedButton
                                    type="button"
                                    onClick={addInstruction}
                                    className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium px-4 py-3 min-h-[48px]"
                                >
                                    + Add Step
                                </TouchEnhancedButton>
                            </div>
                        </>
                    )}

                        {/* Tags - MOBILE RESPONSIVE */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {recipe.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center px-3 py-2 rounded-full text-sm bg-indigo-100 text-indigo-700 min-h-[36px]"
                                    >
                                    {tag}
                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            className="ml-2 text-indigo-500 hover:text-indigo-700 min-h-[24px] min-w-[24px] flex items-center justify-center"
                                        >
                                        ✕
                                    </TouchEnhancedButton>
                                </span>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tags (comma-separated)
                                    </label>
                                    <KeyboardOptimizedInput
                                        type="text"
                                        value={tagsString}
                                        onChange={(e) => handleTagsStringChange(e.target.value)}
                                        onBlur={handleTagsStringBlur}
                                        placeholder="italian, dinner, easy, comfort-food"
                                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        style={{minHeight: '48px'}}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Enter tags separated by commas. Press Tab or click elsewhere to apply.
                                    </p>
                                </div>

                                <div className="border-t pt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Add individual tag
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                            placeholder="Add a tag..."
                                            className="flex-1 px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            style={{minHeight: '48px'}}
                                        />
                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={addTag}
                                            className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium px-4 py-3 min-h-[48px]"
                                        >
                                            + Add Tag
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Nutrition Section - CLEANED UP */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Nutrition Information</h3>
                                <div className="flex gap-2">
                                    {/* View Details Button */}
                                    {recipe.nutrition && Object.keys(recipe.nutrition).length > 0 && (
                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={() => setShowNutritionModal(true)}
                                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium"
                                        >
                                            View Details
                                        </TouchEnhancedButton>
                                    )}
                                </div>
                            </div>

                            {/* Current nutrition display - NO duplicate text */}
                            {/* Current nutrition display - USE FULL STYLE like Image 2 */}
                            {recipe.nutrition && Object.keys(recipe.nutrition).length > 0 ? (
                                <div className="mb-6">
                                    <NutritionFacts
                                        nutrition={nutritionForDisplay}
                                        servings={parseInt(recipe.servings) || 4}
                                        showPerServing={true}
                                        compact={false}
                                    />

                                    {/* AI Analysis Info */}
                                    {recipe.nutrition.calculationMethod === 'ai_calculated' && (
                                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center text-blue-800 text-sm">
                                                <span className="mr-2">🤖</span>
                                                <span>Nutrition calculated by AI analysis</span>
                                                {recipe.nutrition.confidence && (
                                                    <span className="ml-2 text-blue-600">
                            Confidence: {Math.round(recipe.nutrition.confidence * 100)}%
                        </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 mb-6">
                                    <div className="text-4xl mb-2">📊</div>
                                    <p className="font-medium">No nutrition information yet</p>
                                    <p className="text-sm">Use AI analysis to add comprehensive nutrition data</p>
                                </div>
                            )}

                            {/* AI Nutrition Analysis Button - using your UpdateNutritionButton */}
                            <UpdateNutritionButton
                                recipe={{
                                    ...recipe,
                                    ingredients: recipe.ingredients,
                                    servings: parseInt(recipe.servings) || 4
                                }}
                                onNutritionUpdate={(newNutrition) => {
                                    setRecipe(prev => ({
                                        ...prev,
                                        nutrition: newNutrition
                                    }));
                                }}
                                disabled={!recipe.ingredients.some(ing => ing.name && ing.name.trim())}
                            />

                            {/* Optional: Manual nutrition inputs for basic values */}
                            {!isImportMode && (
                                <div className="mt-6 pt-6 border-t">
                                    <h4 className="text-sm font-medium text-gray-700 mb-4">Or enter basic nutrition
                                        manually:</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div>
                                            <label
                                                className="block text-sm font-medium text-gray-700 mb-2">Calories</label>
                                            <input
                                                type="number"
                                                value={extractNutritionValue(recipe.nutrition.calories)} // CHANGE THIS
                                                onChange={(e) => updateNutrition('calories', e.target.value)}
                                                placeholder="250"
                                                className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{minHeight: '48px'}}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Protein
                                                (g)</label>
                                            <input
                                                type="number"
                                                value={extractNutritionValue(recipe.nutrition.protein)} // CHANGE THIS
                                                onChange={(e) => updateNutrition('protein', e.target.value)}
                                                placeholder="15"
                                                className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{minHeight: '48px'}}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Carbs
                                                (g)</label>
                                            <input
                                                type="number"
                                                value={extractNutritionValue(recipe.nutrition.carbs)} // CHANGE THIS
                                                onChange={(e) => updateNutrition('carbs', e.target.value)}
                                                placeholder="30"
                                                className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{minHeight: '48px'}}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Fat
                                                (g)</label>
                                            <input
                                                type="number"
                                                value={extractNutritionValue(recipe.nutrition.fat)} // CHANGE THIS
                                                onChange={(e) => updateNutrition('fat', e.target.value)}
                                                placeholder="10"
                                                className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{minHeight: '48px'}}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Fiber
                                                (g)</label>
                                            <input
                                                type="number"
                                                value={extractNutritionValue(recipe.nutrition.fiber)} // CHANGE THIS
                                                onChange={(e) => updateNutrition('fiber', e.target.value)}
                                                placeholder="5"
                                                className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{minHeight: '48px'}}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>


                        {/* Source - MOBILE RESPONSIVE */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipe Settings</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Source (Optional)
                                    </label>
                                    <KeyboardOptimizedInput
                                        type="text"
                                        value={recipe.source}
                                        onChange={(e) => updateRecipe('source', e.target.value)}
                                        placeholder="Recipe source or URL..."
                                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        style={{minHeight: '48px'}}
                                    />
                                </div>

                                <div className="flex items-start">
                                    <div className="flex items-center h-5 mt-3">
                                        <input
                                            id="isPublic"
                                            type="checkbox"
                                            checked={recipe.isPublic}
                                            onChange={(e) => updateRecipe('isPublic', e.target.checked)}
                                            className="focus:ring-indigo-500 h-5 w-5 text-indigo-600 border-gray-300 rounded"
                                        />
                                    </div>
                                    <div className="ml-3 text-sm">
                                        <label htmlFor="isPublic" className="font-medium text-gray-700 block mb-1">
                                            Make this recipe public
                                        </label>
                                        <p className="text-gray-500">
                                            Public recipes can be viewed and rated by other users
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Video Import Success Message - ADD THIS SECTION */}
                        {importSource === 'video' && videoInfo && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-purple-900 mb-4">
                                    🎥 Video Recipe Successfully Imported!
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {recipe.ingredients.filter(i => i.videoTimestamp).length}
                                        </div>
                                        <div className="text-sm text-gray-600">Ingredients with video timestamps
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {recipe.instructions.filter(i => i.videoTimestamp).length}
                                        </div>
                                        <div className="text-sm text-gray-600">Instructions with video links</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 text-center">
                                        <div className="text-lg font-bold text-green-600">
                                            {videoInfo.platform?.toUpperCase()}
                                        </div>
                                        <div className="text-sm text-gray-600">Platform</div>
                                    </div>
                                </div>

                                {/* DEBUG: Show actual timestamp data */}
                                {process.env.NODE_ENV === 'development' && (
                                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-3">
                                        <strong>Debug Info:</strong><br/>
                                        <pre className="text-xs">{JSON.stringify({
                                            totalIngredients: recipe.ingredients.length,
                                            ingredientsWithTimestamps: recipe.ingredients.filter(i => i.videoTimestamp).length,
                                            totalInstructions: recipe.instructions.length,
                                            instructionsWithTimestamps: recipe.instructions.filter(i => i.videoTimestamp).length,
                                            sampleIngredient: recipe.ingredients[0],
                                            sampleInstruction: recipe.instructions[0]
                                        }, null, 2)}</pre>
                                    </div>
                                )}

                                <div className="mt-4 flex items-center justify-between">
                                    <p className="text-sm text-purple-700">
                                        Recipe extracted from video transcript. Review and edit as needed before
                                        saving.
                                    </p>
                                    <a
                                        href={videoInfo.originalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M8 5v10l7-5-7-5z"/>
                                        </svg>
                                        Watch Original Video
                                    </a>
                                </div>
                            </div>
                        )}

                    {/* Submit Buttons */}
                    <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 pb-8">
                        <TouchEnhancedButton
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 min-h-[48px] order-2 sm:order-1"
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center gap-2 min-h-[48px] order-1 sm:order-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    {isEditing ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                <>
                                    {isEditing ? '💾 Update Recipe' : '✨ Create Recipe'}
                                    {isMultiPart && <span className="text-xs">(Multi-part)</span>}
                                </>
                            )}
                        </TouchEnhancedButton>
                    </div>
                </form>
            )}

            {/* Add your NutritionModal at the very end of the component, before the closing </div> */
            }
            <NutritionModal
                nutrition={recipe.nutrition}
                isOpen={showNutritionModal}
                onClose={() => setShowNutritionModal(false)}
                servings={parseInt(recipe.servings) || 4}
                recipeTitle={recipe.title || "Recipe"}
            />

            {/* NEW: Voice Input Modals */}
            {/* Title Voice Modal */}
            {showVoiceTitle && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">🎤 Voice Recipe Title</h3>
                            <TouchEnhancedButton
                                onClick={() => setShowVoiceTitle(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>

                        <div className="mb-4">
                            <VoiceInput
                                onResult={handleVoiceTitle}
                                onError={handleVoiceError}
                                placeholder="Say the recipe title..."
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm text-blue-800">
                                💡 <strong>Example:</strong> "Grandma's famous chocolate chip cookies"
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Description Voice Modal */}
            {showVoiceDescription && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">🎤 Voice Recipe Description</h3>
                            <TouchEnhancedButton
                                onClick={() => setShowVoiceDescription(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>

                        <div className="mb-4">
                            <VoiceInput
                                onResult={handleVoiceDescription}
                                onError={handleVoiceError}
                                placeholder="Describe the recipe..."
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm text-blue-800">
                                💡 <strong>Example:</strong> "A classic comfort food that's perfect for family dinners. Takes about 30 minutes and serves 4 people."
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Ingredients Voice Modal */}
            {showVoiceIngredients && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">🎤 Voice Add Ingredients</h3>
                            <TouchEnhancedButton
                                onClick={() => setShowVoiceIngredients(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>

                        <div className="mb-4">
                            <VoiceInput
                                onResult={handleVoiceIngredients}
                                onError={handleVoiceError}
                                placeholder="Say ingredients with amounts..."
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm text-blue-800 mb-2">
                                💡 <strong>Voice Ingredients Examples:</strong>
                            </p>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• "2 cups flour, 1 egg, half cup milk"</li>
                                <li>• "1 pound chicken breast, 2 tablespoons olive oil"</li>
                                <li>• "3 cloves garlic, 1 medium onion, salt to taste"</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions Voice Modal */}
            {showVoiceInstructions && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">🎤 Voice Add Instructions</h3>
                            <TouchEnhancedButton
                                onClick={() => setShowVoiceInstructions(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>

                        <div className="mb-4">
                            <VoiceInput
                                onResult={handleVoiceInstructions}
                                onError={handleVoiceError}
                                placeholder="Say cooking instructions step by step..."
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm text-blue-800 mb-2">
                                💡 <strong>Voice Instructions Examples:</strong>
                            </p>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• "Heat oil in pan. Add onions and cook until soft. Then add garlic and cook 1 minute."</li>
                                <li>• "Mix flour and eggs in bowl. Gradually add milk while whisking."</li>
                                <li>• "Bake at 350 degrees for 25 minutes until golden brown."</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
        ;
}