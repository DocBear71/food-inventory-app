'use client';
// file: /src/components/recipes/EnhancedRecipeForm.js v8 - Complete with multi-part support and all original functionality restored

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

    // RESTORED: nutritionForDisplay helper
    const nutritionForDisplay = {
        calories: {value: recipe.nutrition.calories?.value || recipe.nutrition.calories || 0, unit: 'kcal'},
        protein: {value: recipe.nutrition.protein?.value || recipe.nutrition.protein || 0, unit: 'g'},
        carbs: {value: recipe.nutrition.carbs?.value || recipe.nutrition.carbs || 0, unit: 'g'},
        fat: {value: recipe.nutrition.fat?.value || recipe.nutrition.fat || 0, unit: 'g'},
        fiber: {value: recipe.nutrition.fiber?.value || recipe.nutrition.fiber || 0, unit: 'g'}
    };

    // RESTORED: Image handling functions
    const handleImageUpload = async (file) => {
        if (!file) return;

        setIsUploadingImage(true);
        try {
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target.result);
                setRecipeImage(file);
                setImageSource('upload');
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading image:', error);
        } finally {
            setIsUploadingImage(false);
        }
    };

    const removeImage = () => {
        setRecipeImage(null);
        setImagePreview(null);
        setImageSource(null);
    };

    // RESTORED: useShareHandler
    useShareHandler((shareData) => {
        setSharedContent(shareData);

        console.log('📱 Share data received:', shareData);

        // ENHANCED: Handle ALL social media platforms, not just video types
        const url = shareData.url || shareData.text || shareData.link;
        if (url) {
            const platform = shareData.platform || detectPlatformFromUrl(url);
            setVideoImportPlatform(platform);

            console.log(`🎯 ${platform} content shared:`, url);

            // For import mode, continue with current behavior
            if (isImportMode) {
                setVideoUrl(url);
                setShowVideoImport(true);
            } else {
                // For regular add page, redirect to import page with platform info
                setTimeout(() => {
                    router.push(`/recipes/import?videoUrl=${encodeURIComponent(url)}&source=share&platform=${platform}`);
                }, 0);
            }
        }
    });

    // RESTORED: Image loading from initialData
    useEffect(() => {
        if (initialData?.extractedImage) {
            setImagePreview(`data:image/jpeg;base64,${initialData.extractedImage.data}`);
            setImageSource('extracted');
            console.log('📸 Loaded extracted image from video import');
        }
    }, [initialData]);

    // RESTORED: Auto-import useEffect
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const videoUrl = urlParams.get('videoUrl');
        const source = urlParams.get('source');
        const platform = urlParams.get('platform');

        if (videoUrl && source === 'share' && ['facebook', 'tiktok', 'instagram'].includes(platform)) {
            console.log(`📱 Auto-importing ${platform} video:`, videoUrl);

            // Decode the URL
            const decodedVideoUrl = decodeURIComponent(videoUrl);

            // Set the video URL in the input
            setVideoUrl(decodedVideoUrl);
            setVideoImportPlatform(platform);

            // Show video import section
            setShowVideoImport(true);

            // Start the import after UI is ready
            const timer = setTimeout(() => {
                handleVideoImport(decodedVideoUrl);
            }, 1000);

            // Clean up URL parameters after triggering import
            const cleanUrl = new URL(window.location);
            cleanUrl.searchParams.delete('videoUrl');
            cleanUrl.searchParams.delete('source');
            cleanUrl.searchParams.delete('platform');
            window.history.replaceState({}, '', cleanUrl);

            return () => clearTimeout(timer);
        }
    }, []);

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
        if (recipe.parts.length <= 1) return;

        setRecipe(prev => ({
            ...prev,
            parts: prev.parts.filter((_, index) => index !== partIndex)
        }));

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

    const convertNutritionFormat = (nutritionPerServing) => {
        const mapping = {
            'calories': 'calories',
            'total_fat': 'fat',
            'saturated_fat': 'saturatedFat',
            'trans_fat': 'transFat',
            'cholesterol': 'cholesterol',
            'sodium': 'sodium',
            'total_carbohydrates': 'carbs',
            'dietary_fiber': 'fiber',
            'sugars': 'sugars',
            'protein': 'protein',
            'vitamin_a': 'vitaminA',
            'vitamin_c': 'vitaminC',
            'calcium': 'calcium',
            'iron': 'iron'
        };

        const converted = {};

        Object.keys(nutritionPerServing).forEach(key => {
            const standardKey = mapping[key];
            if (standardKey) {
                const value = nutritionPerServing[key];

                // Parse numeric values from strings like "7g", "200mg", "30%"
                let numericValue = 0;
                let unit = 'g';

                if (typeof value === 'string') {
                    const match = value.match(/(\d+(?:\.\d+)?)/);
                    numericValue = match ? parseFloat(match[1]) : 0;

                    // Determine unit
                    if (value.includes('mg')) unit = 'mg';
                    else if (value.includes('µg')) unit = 'µg';
                    else if (value.includes('kcal') || key === 'calories') unit = 'kcal';
                    else if (key === 'calories') unit = 'kcal';
                } else if (typeof value === 'number') {
                    numericValue = value;
                    unit = key === 'calories' ? 'kcal' : 'g';
                }

                converted[standardKey] = {
                    value: Math.round(numericValue * 100) / 100, // Round to 2 decimal places
                    unit: unit,
                    name: getNutrientName(standardKey)
                };
            }
        });

        return converted;
    };

    const getNutrientName = (key) => {
        const names = {
            calories: 'Energy',
            protein: 'Protein',
            fat: 'Total Fat',
            saturatedFat: 'Saturated Fat',
            transFat: 'Trans Fat',
            cholesterol: 'Cholesterol',
            carbs: 'Total Carbohydrate',
            fiber: 'Dietary Fiber',
            sugars: 'Total Sugars',
            sodium: 'Sodium',
            vitaminA: 'Vitamin A',
            vitaminC: 'Vitamin C',
            calcium: 'Calcium',
            iron: 'Iron'
        };

        return names[key] || key;
    };

    // Handle parsed recipe data
    const handleParsedRecipe = (parsedData) => {
        if (parsedData.isMultiPart && parsedData.parts && parsedData.parts.length > 0) {
            setIsMultiPart(true);
            setRecipe(prevRecipe => ({
                ...prevRecipe,
                title: parsedData.title || prevRecipe.title,
                description: parsedData.description || prevRecipe.description,
                isMultiPart: true,
                parts: parsedData.parts,
                ingredients: [],
                instructions: [],
                prepTime: parsedData.prepTime || prevRecipe.prepTime,
                cookTime: parsedData.cookTime || prevRecipe.cookTime,
                servings: parsedData.servings || prevRecipe.servings,
                tags: [...new Set([...prevRecipe.tags, ...parsedData.tags])],
                source: parsedData.source || prevRecipe.source,
                nutrition: parsedData.nutrition || prevRecipe.nutrition
            }));
            setActivePart(0);
        } else {
            setIsMultiPart(false);
            setRecipe(prevRecipe => ({
                ...prevRecipe,
                title: parsedData.title || prevRecipe.title,
                description: parsedData.description || prevRecipe.description,
                isMultiPart: false,
                ingredients: parsedData.ingredients.length > 0 ? parsedData.ingredients : prevRecipe.ingredients,
                instructions: parsedData.instructions.length > 0 ? parsedData.instructions : prevRecipe.instructions,
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

        setTagsString([...new Set([...recipe.tags, ...parsedData.tags])].join(', '));
        setShowParser(false);
        setInputMethod('manual');
    };

    // RESTORED: All helper functions
    const detectPlatformFromUrl = (url) => {
        if (!url) return 'unknown';
        const urlLower = url.toLowerCase();

        // Enhanced platform detection for ALL social media platforms
        if (urlLower.includes('tiktok.com') || urlLower.includes('vm.tiktok.com')) return 'tiktok';
        if (urlLower.includes('instagram.com')) return 'instagram';
        if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch') || urlLower.includes('fb.com')) return 'facebook';
        if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
        if (urlLower.includes('reddit.com') || urlLower.includes('redd.it')) return 'reddit';
        if (urlLower.includes('bsky.app') || urlLower.includes('bluesky.app')) return 'bluesky';
        if (urlLower.includes('pinterest.com')) return 'pinterest';
        if (urlLower.includes('snapchat.com')) return 'snapchat';
        if (urlLower.includes('linkedin.com')) return 'linkedin';
        if (urlLower.includes('threads.net')) return 'threads';

        return 'unknown';
    };

    // RESTORED: Enhanced URL import with smart parsing
    const handleUrlImport = async (url) => {
        if (!url || !url.trim()) {
            setImportError('Please enter a valid URL');
            return;
        }

        setIsImporting(true);
        setImportError('');

        try {
            const response = await apiPost('/api/recipes/scrape', {url: url.trim()});
            const data = await response.json();

            if (data.success) {
                const parseImportedIngredients = (ingredients) => {
                    if (!ingredients || !Array.isArray(ingredients)) return [{
                        name: '',
                        amount: '',
                        unit: '',
                        optional: false
                    }];

                    return ingredients.map(ingredient => {
                        if (typeof ingredient === 'object' && ingredient.name) {
                            return {
                                name: ingredient.name || '',
                                amount: ingredient.amount || '',
                                unit: ingredient.unit || '',
                                optional: ingredient.optional || false
                            };
                        }

                        const ingredientString = typeof ingredient === 'string' ? ingredient : (ingredient.name || '');
                        return parseIngredientLine(ingredientString);
                    }).filter(ing => ing && ing.name);
                };

                const parseImportedInstructions = (instructions) => {
                    if (!instructions || !Array.isArray(instructions)) return [{step: 1, instruction: ''}];

                    return instructions.map((instruction, index) => {
                        const instructionText = typeof instruction === 'string' ? instruction : (instruction.instruction || instruction);
                        const cleanInstruction = parseInstructionLine(instructionText, index);
                        return cleanInstruction || {step: index + 1, instruction: instructionText};
                    }).filter(inst => inst && inst.instruction);
                };

                const importedRecipe = {
                    title: data.recipe.title || '',
                    description: data.recipe.description || '',
                    ingredients: parseImportedIngredients(data.recipe.ingredients),
                    instructions: parseImportedInstructions(data.recipe.instructions),
                    prepTime: data.recipe.prepTime || '',
                    cookTime: data.recipe.cookTime || '',
                    servings: data.recipe.servings || '',
                    difficulty: data.recipe.difficulty || 'medium',
                    tags: data.recipe.tags || [],
                    source: data.recipe.source || url,
                    isPublic: false,
                    category: 'entrees',
                    nutrition: {
                        calories: data.recipe.nutrition?.calories?.value || '',
                        protein: data.recipe.nutrition?.protein?.value || '',
                        carbs: data.recipe.nutrition?.carbs?.value || '',
                        fat: data.recipe.nutrition?.fat?.value || '',
                        fiber: data.recipe.nutrition?.fiber?.value || ''
                    }
                };

                setRecipe(importedRecipe);
                setTagsString(importedRecipe.tags.join(', '));
                setShowUrlImport(false);
                setInputMethod('manual');
                setUrlInput('');
            } else {
                console.error('Import failed:', data.error);
                setImportError(data.error || 'Failed to import recipe from URL');
            }
        } catch (error) {
            console.error('URL import error:', error);
            setImportError('Network error. Please check your connection and try again.');
        } finally {
            setIsImporting(false);
        }
    };

    // RESTORED: Video import handler
    const handleVideoImport = async (url) => {
        const startTime = Date.now();
        const MIN_DISPLAY_TIME = 10000;

        if (!url || !url.trim()) {
            setVideoImportError('Please enter a valid video URL');
            return;
        }

        const detectedPlatform = detectPlatformFromUrl(url);
        setVideoImportPlatform(detectedPlatform);

        const videoPatterns = [
            /tiktok\.com\/@[^/]+\/video\//,
            /tiktok\.com\/t\//,
            /vm\.tiktok\.com\//,
            /instagram\.com\/reel\//,
            /instagram\.com\/p\//,
            /instagram\.com\/tv\//,
            /facebook\.com\/watch\?v=/,
            /facebook\.com\/[^\/]+\/videos\//,
            /fb\.watch\//,
            /facebook\.com\/share\/r\//,
            /facebook\.com\/reel\//
        ];

        const isVideoUrl = videoPatterns.some(pattern => pattern.test(url));
        if (!isVideoUrl) {
            setVideoImportError('Please enter a valid TikTok, Instagram, or Facebook video URL.');
            return;
        }

        setIsVideoImporting(true);
        setVideoImportProgress({
            stage: 'connecting',
            platform: detectedPlatform,
            message: `🔗 Connecting to ${detectedPlatform}...`
        });

        try {
            setVideoImportProgress({
                stage: 'downloading',
                platform: detectedPlatform,
                message: `📥 Downloading ${detectedPlatform} video content...`
            });

            const response = await apiPost('/api/recipes/video-extract', {
                video_url: url.trim(),  // ✅ FIXED: Changed from 'url' to 'video_url'
                analysisType: 'ai_vision_enhanced',
                extractImage: true,
                platform: detectPlatformFromUrl(url)
            });

            setVideoImportProgress({
                stage: 'processing',
                platform: detectedPlatform,
                message: `🤖 AI analyzing ${detectedPlatform} video content...`
            });

            const data = await response.json();

            if (data.success) {
                setVideoImportProgress({
                    stage: 'complete',
                    platform: detectedPlatform,
                    message: '✅ Recipe extraction complete!'
                });

                const videoRecipe = {
                    title: data.recipe.title || '',
                    description: data.recipe.description || '',
                    ingredients: (data.recipe.ingredients || []).map((ing, index) => {
                        const ingredient = {
                            name: ing.name || '',
                            amount: ing.amount || '',
                            unit: ing.unit || '',
                            optional: ing.optional || false
                        };
                        if (ing.videoTimestamp) {
                            ingredient.videoTimestamp = ing.videoTimestamp;
                            ingredient.videoLink = ing.videoLink;
                        }
                        return ingredient;
                    }),
                    instructions: (data.recipe.instructions || []).map((inst, index) => {
                        let instruction;
                        if (typeof inst === 'object' && inst.text) {
                            instruction = {
                                step: inst.step || index + 1,
                                instruction: inst.text,
                                text: inst.text
                            };
                            if (inst.videoTimestamp) {
                                instruction.videoTimestamp = inst.videoTimestamp;
                                instruction.videoLink = inst.videoLink;
                            }
                        } else {
                            instruction = {
                                step: index + 1,
                                instruction: typeof inst === 'string' ? inst : inst.instruction || inst
                            };
                        }
                        return instruction;
                    }),
                    prepTime: data.recipe.prepTime || '',
                    cookTime: data.recipe.cookTime || '',
                    servings: data.recipe.servings || '',
                    difficulty: data.recipe.difficulty || 'medium',
                    tags: data.recipe.tags || [],
                    source: data.recipe.source || url,
                    isPublic: false,
                    category: data.recipe.category || 'entrees',
                    nutrition: data.recipe.nutrition || {
                        calories: '',
                        protein: '',
                        carbs: '',
                        fat: '',
                        fiber: ''
                    },
                    videoMetadata: data.recipe.videoMetadata || {
                        videoSource: data.videoInfo?.originalUrl || null,
                        videoPlatform: data.videoInfo?.platform || null,
                        videoId: data.videoInfo?.videoId || null,
                        extractionMethod: data.extractionInfo?.method || null,
                        socialMediaOptimized: data.extractionInfo?.socialMediaOptimized || false
                    },
                    _formMetadata: {
                        importedFrom: `${data.videoInfo?.platform || 'video'} video`,
                        extractionInfo: data.extractionInfo,
                        hasTimestamps: data.extractionInfo?.hasTimestamps || false,
                        hasExtractedImage: Boolean(data.recipe?.extractedImage || data.extractedImage),
                        extractionMethod: data.extractionInfo?.method || 'universal-ai'
                    }
                };

                console.log('🔍 Full Modal response structure:', JSON.stringify(data, null, 2));
                console.log('🔍 Recipe data:', data.recipe);
                console.log('🔍 Has extractedImage in recipe?', !!data.recipe?.extractedImage);
                console.log('🔍 Has extractedImage in root?', !!data.extractedImage);
                console.log('🔍 ExtractedImage data:', data.recipe?.extractedImage || data.extractedImage);

                // SAFE IMAGE HANDLING - Check both possible locations
                const extractedImageData = data.recipe?.extractedImage || data.extractedImage;
                if (extractedImageData) {
                    setImagePreview(`data:image/jpeg;base64,${extractedImageData.data}`);
                    setImageSource('extracted');
                    console.log('📸 Video image extracted successfully');
                    videoRecipe.extractedImage = extractedImageData;

                    // Add to metadata for tracking
                    videoRecipe._formMetadata.hasExtractedImage = true;
                } else {
                    console.log('⚠️ No extracted image found in response');
                    videoRecipe._formMetadata.hasExtractedImage = false;
                }

                setRecipe(videoRecipe);
                setTagsString(videoRecipe.tags.join(', '));
                setVideoInfo({
                    ...data.videoInfo,
                    extractionInfo: data.extractionInfo,
                    metadata: data.extractionInfo?.metadata
                });
                setImportSource('video');
                setShowVideoImport(false);
                setInputMethod('manual');
                setVideoUrl('');

                setTimeout(() => {
                    scrollToBasicInfo();
                }, 100);

            } else {
                console.error('❌ Video import failed:', data.error);

                // Check if Modal.com detected static content
                if (data.error === 'static_content_detected') {
                    console.log(`Modal.com detected static content for ${detectedPlatform}, trying standard URL scraper...`);

                    try {
                        // Update progress to show fallback attempt
                        setVideoImportProgress({
                            stage: 'processing',
                            platform: detectedPlatform,
                            message: `Trying standard URL scraper for ${detectedPlatform} content...`
                        });

                        // Call standard URL scraper
                        const fallbackResponse = await apiPost('/api/recipes/scrape', {
                            url: url.trim()
                        });

                        const fallbackData = await fallbackResponse.json();

                        if (fallbackData.success) {
                            console.log(`Standard URL scraper succeeded for ${detectedPlatform}`);

                            // Format the recipe data for the form
                            const scrapedRecipe = {
                                title: fallbackData.recipe.title || '',
                                description: fallbackData.recipe.description || '',
                                ingredients: fallbackData.recipe.ingredients || [],
                                instructions: fallbackData.recipe.instructions || [],
                                prepTime: fallbackData.recipe.prepTime || '',
                                cookTime: fallbackData.recipe.cookTime || '',
                                servings: fallbackData.recipe.servings || '',
                                difficulty: fallbackData.recipe.difficulty || 'medium',
                                tags: fallbackData.recipe.tags || [],
                                source: fallbackData.recipe.source || url,
                                isPublic: false,
                                category: fallbackData.recipe.category || 'entrees',
                                _formMetadata: {
                                    importedFrom: `${detectedPlatform} static content`,
                                    extractionMethod: 'standard_url_scraper'
                                }
                            };

                            setRecipe(scrapedRecipe);
                            setTagsString(scrapedRecipe.tags.join(', '));
                            setImportSource('website');
                            setShowVideoImport(false);
                            setInputMethod('manual');
                            setVideoUrl('');

                            // Update progress to show success
                            setVideoImportProgress({
                                stage: 'complete',
                                platform: detectedPlatform,
                                message: `Recipe extracted from ${detectedPlatform} using standard scraper!`
                            });

                            setTimeout(() => {
                                scrollToBasicInfo();
                            }, 100);

                            return; // Exit successfully

                        } else {
                            throw new Error(fallbackData.error || 'Standard URL scraper also failed');
                        }

                    } catch (fallbackError) {
                        console.error(`Both Modal.com and standard scraper failed for ${detectedPlatform}:`, fallbackError);

                        // Platform-specific error messages
                        if (detectedPlatform === 'instagram') {
                            setVideoImportError(`Instagram blocks automated access to post content. Please copy the recipe text from the Instagram post description and use the "Text Paste" option for best results.`);
                        } else if (detectedPlatform === 'facebook') {
                            setVideoImportError(`Facebook restricts automated content access. Please copy the recipe text from the Facebook post and use the "Text Paste" option instead.`);
                        } else {
                            setVideoImportError(`${detectedPlatform} content extraction failed. Please copy the recipe text manually and use the "Text Paste" option.`);
                        }

                        // Show helpful instructions
                        setTimeout(() => {
                            setShowTextImportHint(true);
                        }, 2000);
                    }
                } else {
                    setVideoImportError(data.error || 'Failed to extract recipe from video');
                }
            }

        } catch (error) {
            console.error('💥 Video import error:', error);

            // Check if this is the static content detection error from the API
            if (error.message && error.message.includes('static_content_detected')) {
                if (detectedPlatform === 'instagram') {
                    setVideoImportError(`Instagram post detected as static content. Please copy the recipe text from the post description and use the "Text Paste" option for better results.`);
                } else {
                    setVideoImportError(`${detectedPlatform} post contains static content. Please try using the "Text Paste" option to manually enter the recipe.`);
                }
            } else {
                setVideoImportError('Network error. Please check your connection and try again.');
            }

            // CRITICAL: Always reset UI state on error
            setIsVideoImporting(false);
            setVideoImportProgress({ stage: '', platform: '', message: '' });
        }

        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsedTime);

        if (remainingTime > 0) {
            setTimeout(() => {
                setIsVideoImporting(false);  // ENSURE THIS IS ADDED
                setVideoImportProgress({stage: '', platform: '', message: ''});
            }, remainingTime);
        } else {
            setIsVideoImporting(false);  // ENSURE THIS IS ADDED
            setVideoImportProgress({stage: '', platform: '', message: ''});
        }
    };

    // RESTORED: Enhanced parsing functions
    const parseIngredientLine = (line) => {
        if (!line || line.length < 2) return null;

        let cleanLine = line
            .replace(/^[\*\-\•]\s*/, '')
            .replace(/^\d+\.\s*/, '')
            .replace(/^\d+\)\s*/, '')
            .replace(/\(\$[\d\.]+\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanLine) return null;

        cleanLine = convertFractions(cleanLine);

        let match;

        match = cleanLine.match(/^(.+?)\s*,?\s*to\s+taste$/i);
        if (match) {
            return {
                name: match[1].trim(),
                amount: 'to taste',
                unit: '',
                optional: false
            };
        }

        match = cleanLine.match(/^(\d+(?:\/\d+)?(?:\.\d+)?(?:\s+\d+\/\d+)?)\s+(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|cloves?|ribs?|rib?|stalks?|sprigs?|leaves?|bulbs?|heads?|ears?|slices?|pieces?|cans?|jars?|bottles?|small|medium|large|bunch|handful)\s+(.+)$/i);
        if (match) {
            return {
                name: match[3].trim(),
                amount: match[1].trim(),
                unit: match[2].toLowerCase(),
                optional: cleanLine.toLowerCase().includes('optional')
            };
        }

        match = cleanLine.match(/^(\d+(?:\/\d+)?(?:\.\d+)?(?:\s+\d+\/\d+)?)\s+(.+)$/);
        if (match) {
            const secondPart = match[2].trim();
            const unitMatch = secondPart.match(/^(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|cloves?|ribs?|rib?|stalks?|sprigs?|leaves?|bulbs?|heads?|ears?|slices?|pieces?|cans?|jars?|bottles?)\s+(.+)$/i);
            if (unitMatch) {
                return {
                    name: unitMatch[2].trim(),
                    amount: match[1].trim(),
                    unit: unitMatch[1].toLowerCase(),
                    optional: cleanLine.toLowerCase().includes('optional')
                };
            }

            return {
                name: secondPart,
                amount: match[1].trim(),
                unit: '',
                optional: cleanLine.toLowerCase().includes('optional')
            };
        }

        match = cleanLine.match(/^(\d+\/\d+)\s+(.+)$/);
        if (match) {
            const secondPart = match[2].trim();
            const unitMatch = secondPart.match(/^(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|cloves?|ribs?|rib?|stalks?|sprigs?|leaves?|bulbs?|heads?|ears?|slices?|pieces?|cans?|jars?|bottles?)\s+(.+)$/i);

            if (unitMatch) {
                return {
                    name: unitMatch[2].trim(),
                    amount: match[1],
                    unit: unitMatch[1].toLowerCase(),
                    optional: cleanLine.toLowerCase().includes('optional')
                };
            }

            return {
                name: secondPart,
                amount: match[1],
                unit: '',
                optional: cleanLine.toLowerCase().includes('optional')
            };
        }

        return {
            name: cleanLine,
            amount: '',
            unit: '',
            optional: cleanLine.toLowerCase().includes('optional')
        };
    };

    const parseInstructionLine = (line, stepNumber) => {
        if (!line || line.length < 5) return null;

        let cleanLine = line
            .replace(/^[\*\-\•]\s*/, '')
            .replace(/^\d+[\.\)]\s*/, '')
            .replace(/^(step\s*\d*[:.]?\s*)/i, '')
            .trim();

        if (!cleanLine || cleanLine.length < 5) return null;

        return {
            step: stepNumber + 1,
            instruction: cleanLine
        };
    };

    const convertFractions = (text) => {
        return text
            .replace(/½/g, '1/2')
            .replace(/¼/g, '1/4')
            .replace(/¾/g, '3/4')
            .replace(/⅓/g, '1/3')
            .replace(/⅔/g, '2/3')
            .replace(/⅛/g, '1/8')
            .replace(/⅜/g, '3/8')
            .replace(/⅝/g, '5/8')
            .replace(/⅞/g, '7/8');
    };

    // RESTORED: Voice input functions
    const handleVoiceTitle = async (transcript, confidence) => {
        console.log('🎤 Voice title received:', transcript);
        setVoiceResults(transcript);
        setProcessingVoice(true);

        try {
            updateRecipe('title', transcript.trim());
            setShowVoiceTitle(false);
            setVoiceResults('');
            alert(`✅ Title added: "${transcript.trim()}"`);
        } catch (error) {
            console.error('Error processing voice title:', error);
            alert('❌ Error processing voice input. Please try again.');
        } finally {
            setProcessingVoice(false);
        }
    };

    const handleVoiceDescription = async (transcript, confidence) => {
        console.log('🎤 Voice description received:', transcript);
        setVoiceResults(transcript);
        setProcessingVoice(true);

        try {
            updateRecipe('description', transcript.trim());
            setShowVoiceDescription(false);
            setVoiceResults('');
            alert(`✅ Description added: "${transcript.slice(0, 50)}..."`);
        } catch (error) {
            console.error('Error processing voice description:', error);
            alert('❌ Error processing voice input. Please try again.');
        } finally {
            setProcessingVoice(false);
        }
    };

    const handleVoiceIngredients = async (transcript, confidence) => {
        console.log('🎤 Voice ingredients received:', transcript);
        setVoiceResults(transcript);
        setProcessingVoice(true);

        try {
            const newIngredients = parseVoiceIngredients(transcript);

            if (newIngredients.length > 0) {
                if (isMultiPart) {
                    setRecipe(prev => ({
                        ...prev,
                        parts: prev.parts.map((part, index) =>
                            index === activePart
                                ? { ...part, ingredients: [...part.ingredients, ...newIngredients] }
                                : part
                        )
                    }));
                } else {
                    setRecipe(prev => ({
                        ...prev,
                        ingredients: [...prev.ingredients, ...newIngredients]
                    }));
                }

                setShowVoiceIngredients(false);
                setVoiceResults('');
                alert(`✅ Added ${newIngredients.length} ingredient${newIngredients.length > 1 ? 's' : ''} from voice input!`);
            } else {
                alert('❌ Could not understand any ingredients. Try saying items like "2 cups flour, 1 egg, half cup milk"');
            }
        } catch (error) {
            console.error('Error processing voice ingredients:', error);
            alert('❌ Error processing voice input. Please try again.');
        } finally {
            setProcessingVoice(false);
        }
    };

    const handleVoiceInstructions = async (transcript, confidence) => {
        console.log('🎤 Voice instructions received:', transcript);
        setVoiceResults(transcript);
        setProcessingVoice(true);

        try {
            const newInstructions = parseVoiceInstructions(transcript);

            if (newInstructions.length > 0) {
                if (isMultiPart) {
                    setRecipe(prev => ({
                        ...prev,
                        parts: prev.parts.map((part, index) => {
                            if (index === activePart) {
                                const currentStepCount = part.instructions.length;
                                const numberedInstructions = newInstructions.map((inst, i) => ({
                                    step: currentStepCount + i + 1,
                                    instruction: inst.instruction
                                }));
                                return {
                                    ...part,
                                    instructions: [...part.instructions, ...numberedInstructions]
                                };
                            }
                            return part;
                        })
                    }));
                } else {
                    setRecipe(prev => {
                        const currentStepCount = prev.instructions.length;
                        const numberedInstructions = newInstructions.map((inst, index) => ({
                            step: currentStepCount + index + 1,
                            instruction: inst.instruction
                        }));

                        return {
                            ...prev,
                            instructions: [...prev.instructions, ...numberedInstructions]
                        };
                    });
                }

                setShowVoiceInstructions(false);
                setVoiceResults('');
                alert(`✅ Added ${newInstructions.length} instruction step${newInstructions.length > 1 ? 's' : ''} from voice input!`);
            } else {
                alert('❌ Could not understand any instructions. Try speaking step-by-step cooking directions.');
            }
        } catch (error) {
            console.error('Error processing voice instructions:', error);
            alert('❌ Error processing voice input. Please try again.');
        } finally {
            setProcessingVoice(false);
        }
    };

    const getAllIngredientsFromRecipe = (recipe) => {
        if (!recipe) return [];

        // Multi-part recipe
        if (recipe.isMultiPart && recipe.parts && Array.isArray(recipe.parts)) {
            return recipe.parts.reduce((allIngredients, part) => {
                const partIngredients = (part.ingredients || []).filter(ing => ing.name && ing.name.trim());
                return [...allIngredients, ...partIngredients];
            }, []);
        }

        // Single-part recipe (legacy)
        return (recipe.ingredients || []).filter(ing => ing.name && ing.name.trim());
    };

    const handleVoiceError = (error) => {
        console.error('🎤 Voice input error:', error);
        setProcessingVoice(false);

        let userMessage = 'Voice input failed. ';
        if (error.includes('not-allowed') || error.includes('denied')) {
            userMessage += 'Please allow microphone access in your browser settings.';
        } else if (error.includes('network')) {
            userMessage += 'Voice recognition requires an internet connection.';
        } else {
            userMessage += 'Please try again.';
        }

        alert(`🎤 ${userMessage}`);
    };

    const parseVoiceIngredients = (transcript) => {
        if (!transcript || transcript.trim().length === 0) return [];

        const cleanTranscript = transcript.toLowerCase()
            .replace(/[.!?]/g, '')
            .replace(/\b(add|ingredients|include|need|use|get)\b/g, '')
            .trim();

        const itemTexts = cleanTranscript
            .split(/[,;]|\band\b|\bthen\b|\balso\b|\bplus\b/)
            .map(item => item.trim())
            .filter(item => item.length > 0);

        const parsedIngredients = [];

        itemTexts.forEach(itemText => {
            if (itemText.length < 2) return;

            const parsed = parseIngredientLine(itemText);
            if (parsed && parsed.name) {
                parsedIngredients.push(parsed);
            }
        });

        console.log('🎤 Parsed voice ingredients:', parsedIngredients);
        return parsedIngredients;
    };

    const parseVoiceInstructions = (transcript) => {
        if (!transcript || transcript.trim().length === 0) return [];

        const cleanTranscript = transcript
            .replace(/[.!?]/g, '.')
            .replace(/\b(then|next|after that|step|now)\b/gi, '.')
            .trim();

        const stepTexts = cleanTranscript
            .split(/[.]|\bthen\b|\bnext\b|\bafter that\b/i)
            .map(step => step.trim())
            .filter(step => step.length > 5);

        const parsedInstructions = [];

        stepTexts.forEach((stepText, index) => {
            const cleanStep = stepText
                .replace(/^(step\s*\d*[:.]?\s*)/i, '')
                .replace(/^\d+\.\s*/, '')
                .trim();

            if (cleanStep.length > 5) {
                parsedInstructions.push({
                    step: index + 1,
                    instruction: cleanStep
                });
            }
        });

        console.log('🎤 Parsed voice instructions:', parsedInstructions);
        return parsedInstructions;
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

    const handleTagsStringChange = (value) => {
        setTagsString(value);
    };

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

        // CRITICAL FIX: Prevent double submission
        if (isSubmitting) {
            console.log('🚫 Submission already in progress, ignoring duplicate');
            return;
        }

        setIsSubmitting(true);

        try {
            const finalTags = tagsString
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            // FIXED: Properly define finalRecipe variable
            const finalRecipe = {
                title: recipe.title,
                description: recipe.description,
                isMultiPart: recipe.isMultiPart,
                parts: recipe.parts || [],
                // For backward compatibility and search, populate flat arrays
                ingredients: recipe.isMultiPart && recipe.parts && Array.isArray(recipe.parts) && recipe.parts.length > 0 ?
                    // Flatten ingredients from all parts
                    recipe.parts.reduce((allIngredients, part) => {
                        return [...allIngredients, ...(part.ingredients || [])];
                    }, [])
                    : recipe.ingredients || [],
                instructions: recipe.isMultiPart && recipe.parts && Array.isArray(recipe.parts) && recipe.parts.length > 0 ?
                    // Flatten instructions from all parts with part labels
                    recipe.parts.reduce((allInstructions, part, partIndex) => {
                        const partInstructions = (part.instructions || []).map(instruction => {
                            const instructionText = typeof instruction === 'string' ? instruction :
                                (instruction.text || instruction.instruction || '');
                            return {
                                step: allInstructions.length + 1,
                                instruction: `[${part.name || `Part ${partIndex + 1}`}] ${instructionText}`
                            };
                        });
                        return [...allInstructions, ...partInstructions];
                    }, [])
                    : recipe.instructions || [],
                cookTime: recipe.cookTime,
                prepTime: recipe.prepTime,
                servings: recipe.servings,
                difficulty: recipe.difficulty,
                tags: finalTags,
                source: recipe.source,
                category: recipe.category,
                isPublic: recipe.isPublic,
                nutrition: recipe.nutrition || {},
                // Include any video metadata or extracted images
                ...(recipe.videoMetadata && { videoMetadata: recipe.videoMetadata }),
                ...(recipe.extractedImage && { extractedImage: recipe.extractedImage })
            };

            console.log('🚀 Submitting recipe:', {
                title: finalRecipe.title,
                isMultiPart: finalRecipe.isMultiPart,
                ingredientCount: finalRecipe.ingredients.length,
                instructionCount: finalRecipe.instructions.length,
                partsCount: finalRecipe.parts?.length || 0,
                hasImage: !!recipeImage,
                hasExtractedImage: !!finalRecipe.extractedImage,
                submissionId: Date.now() // Add unique ID for tracking
            });

            // Use FormData for consistency
            console.log('📸 Submitting with FormData (unified photo system)');
            const formData = new FormData();
            formData.append('recipeData', JSON.stringify(finalRecipe));

            // Add image if present
            if (recipeImage) {
                formData.append('recipeImage', recipeImage);
                console.log('📸 Added image to FormData:', recipeImage.name, recipeImage.size);
            }

            const response = await fetch('/api/recipes', {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: {
                    'X-Submission-ID': Date.now().toString() // Unique submission ID
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save recipe');
            }

            const result = await response.json();

            // Check for duplicate response
            if (result.isDuplicate) {
                console.log('✅ Duplicate prevented, using existing recipe:', result.recipe._id);
            } else {
                console.log('✅ Recipe submission successful:', result.message);
            }

            // Call the onSubmit callback with the result
            await onSubmit(result.recipe);

        } catch (error) {
            console.error('Error submitting recipe:', error);
            alert(`Failed to save recipe: ${error.message}`);
        } finally {
            // Always reset submission state
            setIsSubmitting(false);
        }
    };

    // Show parser component
    if (showParser) {
        return (
            <RecipeParser
                onRecipeParsed={handleParsedRecipe}
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
                                setImportError('');
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
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

    // Show video import component
    if (showVideoImport) {
        return (
            <div className="space-y-6">
                <VideoImportLoadingModal
                    isVisible={isVideoImporting}
                    platform={videoImportProgress.platform || 'facebook'}
                    stage={videoImportProgress.stage || 'processing'}
                    message={videoImportProgress.message || 'Processing video...'}
                    videoUrl={videoUrl}
                    onComplete={() => {}}
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
                                    setVideoImportError('');
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
                                        <div>• <strong>👥 Facebook:</strong> Use the share button inside Facebook mobile</div>
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
                                        setShowParser(true);
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
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
                            {!isEditing && (
                                <div className="flex flex-wrap gap-2">
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setShowParser(true)}
                                        className="text-sm text-indigo-600 hover:text-indigo-700 px-3 py-2 min-h-[44px]"
                                    >
                                        📝 Text Parser
                                    </TouchEnhancedButton>
                                    <span className="text-gray-300 hidden sm:inline">|</span>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setShowUrlImport(true)}
                                        className="text-sm text-indigo-600 hover:text-indigo-700 px-3 py-2 min-h-[44px]"
                                    >
                                        🌐 URL Import
                                    </TouchEnhancedButton>
                                    <span className="text-gray-300 hidden sm:inline">|</span>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setShowVideoImport(true)}
                                        className="text-sm text-purple-600 hover:text-purple-700 px-3 py-2 min-h-[44px]"
                                    >
                                        🤖 Social Video Extract
                                    </TouchEnhancedButton>
                                </div>
                            )}
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

                    {/* RESTORED: Recipe Image Section */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            📸 Recipe Image
                        </h3>

                        {imagePreview ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Recipe preview"
                                        className="w-full h-64 object-cover rounded-lg border border-gray-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd"
                                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                  clipRule="evenodd"/>
                                        </svg>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center text-sm text-gray-600">
                                        {imageSource === 'extracted' && (
                                            <>
                                                <span className="text-purple-600 mr-2">🤖</span>
                                                <span>AI-extracted from video ({videoImportPlatform})</span>
                                            </>
                                        )}
                                        {imageSource === 'upload' && (
                                            <>
                                                <span className="text-blue-600 mr-2">📁</span>
                                                <span>User uploaded</span>
                                            </>
                                        )}
                                        {imageSource === 'url' && (
                                            <>
                                                <span className="text-green-600 mr-2">🌐</span>
                                                <span>Imported from website</span>
                                            </>
                                        )}
                                    </div>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={removeImage}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        Remove Image
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e.target.files[0])}
                                        className="hidden"
                                        id="recipe-image-upload"
                                        disabled={isUploadingImage}
                                    />
                                    <label
                                        htmlFor="recipe-image-upload"
                                        className="cursor-pointer flex flex-col items-center"
                                    >
                                        <svg className="w-8 h-8 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                        </svg>
                                        <span className="text-sm font-medium text-gray-700">
                                            {isUploadingImage ? 'Uploading...' : 'Click to upload recipe image'}
                                        </span>
                                        <span className="text-xs text-gray-500 mt-1">
                                            PNG, JPG, GIF up to 10MB
                                        </span>
                                    </label>
                                </div>

                                {!isEditing && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-start">
                                            <span className="text-blue-600 mr-2 mt-0.5">💡</span>
                                            <div className="text-sm text-blue-800">
                                                <strong>Tip:</strong> Import recipes from social media videos to automatically extract the best food image using AI!
                                                <div className="mt-2 text-xs text-blue-700">
                                                    • TikTok, Instagram, and Facebook videos supported
                                                    • AI selects the most appetizing frame
                                                    • No manual image upload needed
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* NEW: Multi-Part Recipe Sections OR Single-Part Recipe Sections */}
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
                                                                x
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

                    {/* RESTORED: Tags Section */}
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
                                        className="px-4 py-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium min-h-[48px]"
                                    >
                                        + Add Tag
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RESTORED: Enhanced Nutrition Section */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900">Nutrition Information</h3>
                            <div className="flex gap-2">
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

                        {recipe.nutrition && Object.keys(recipe.nutrition).length > 0 ? (
                            <div className="mb-6">
                                <NutritionFacts
                                    nutrition={nutritionForDisplay}
                                    servings={parseInt(recipe.servings) || 4}
                                    showPerServing={true}
                                    compact={false}
                                />

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

                        <UpdateNutritionButton
                            recipe={recipe} // Pass the full recipe object
                            onNutritionUpdate={(newNutrition, analysisResult) => {
                                console.log('🔄 Nutrition updated:', newNutrition);
                                console.log('📊 Analysis result:', analysisResult);

                                // FIXED: Handle the nutrition data properly
                                let processedNutrition = newNutrition;

                                // If newNutrition is not in the expected format, try to process it
                                if (newNutrition && !newNutrition.calories && newNutrition.nutrition_per_serving) {
                                    console.log('🔄 Converting nutrition_per_serving format');
                                    processedNutrition = convertNutritionFormat(newNutrition.nutrition_per_serving);
                                } else if (newNutrition && !newNutrition.calories) {
                                    console.log('🔄 Using raw nutrition data');
                                    processedNutrition = newNutrition;
                                }

                                setRecipe(prev => ({
                                    ...prev,
                                    nutrition: processedNutrition,
                                    nutritionCalculatedAt: new Date(),
                                    nutritionCoverage: analysisResult?.coverage || 0.9,
                                    nutritionManuallySet: false,
                                    // Add analysis metadata
                                    aiAnalysis: {
                                        ...analysisResult?.aiAnalysis,
                                        nutritionGenerated: true,
                                        nutritionMetadata: analysisResult
                                    }
                                }));
                            }}
                            disabled={getAllIngredientsFromRecipe(recipe).length === 0} // Fixed disabled condition
                        />


                        {!isImportMode && (
                            <div className="mt-6 pt-6 border-t">
                                <h4 className="text-sm font-medium text-gray-700 mb-4">Or enter basic nutrition manually:</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Calories</label>
                                        <input
                                            type="number"
                                            value={extractNutritionValue(recipe.nutrition.calories)}
                                            onChange={(e) => updateNutrition('calories', e.target.value)}
                                            placeholder="250"
                                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            style={{minHeight: '48px'}}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Protein (g)</label>
                                        <input
                                            type="number"
                                            value={extractNutritionValue(recipe.nutrition.protein)}
                                            onChange={(e) => updateNutrition('protein', e.target.value)}
                                            placeholder="15"
                                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            style={{minHeight: '48px'}}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Carbs (g)</label>
                                        <input
                                            type="number"
                                            value={extractNutritionValue(recipe.nutrition.carbs)}
                                            onChange={(e) => updateNutrition('carbs', e.target.value)}
                                            placeholder="30"
                                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            style={{minHeight: '48px'}}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Fat (g)</label>
                                        <input
                                            type="number"
                                            value={extractNutritionValue(recipe.nutrition.fat)}
                                            onChange={(e) => updateNutrition('fat', e.target.value)}
                                            placeholder="10"
                                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            style={{minHeight: '48px'}}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Fiber (g)</label>
                                        <input
                                            type="number"
                                            value={extractNutritionValue(recipe.nutrition.fiber)}
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

                    {/* RESTORED: Source Section */}
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

                    {/* RESTORED: Video Import Success Message */}
                    {importSource === 'video' && videoInfo && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-purple-900 mb-4">
                                🎥 Video Recipe Successfully Imported!
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {recipe.ingredients?.filter(i => i.videoTimestamp).length || 0}
                                    </div>
                                    <div className="text-sm text-gray-600">Ingredients with video timestamps</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {recipe.instructions?.filter(i => i.videoTimestamp).length || 0}
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

                            <div className="mt-4 flex items-center justify-between">
                                <p className="text-sm text-purple-700">
                                    Recipe extracted from video transcript. Review and edit as needed before saving.
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

            {/* RESTORED: NutritionModal */}
            <NutritionModal
                nutrition={recipe.nutrition}
                isOpen={showNutritionModal}
                onClose={() => setShowNutritionModal(false)}
                servings={parseInt(recipe.servings) || 4}
                recipeTitle={recipe.title || "Recipe"}
            />

            {/* RESTORED: Voice Input Modals */}
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
    );
}