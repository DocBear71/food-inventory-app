'use client';
// file: /src/components/recipes/EnhancedRecipeForm.js v5 - MOBILE RESPONSIVE LAYOUT


import { useState, useEffect, useRef } from 'react';
import RecipeParser from './RecipeParser';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { apiPost } from '@/lib/api-config';
import VideoImportLoadingModal from "./VideoImportLoadingModal";
import { useShareHandler} from "@/hooks/useShareHandler";
import { useSearchParams, useRouter } from 'next/navigation'; // Add useRouter here
import NutritionFacts from '@/components/nutrition/NutritionFacts'; // ADD THIS
import NutritionModal from '@/components/nutrition/NutritionModal'; // ADD THIS
import UpdateNutritionButton from '@/components/nutrition/UpdateNutritionButton'; // ADD THIS


export default function EnhancedRecipeForm({
                                               initialData,
                                               onSubmit,
                                               onCancel,
                                               isEditing = false,
                                               isImportMode = false, // NEW: Import mode flag
                                               showAdvancedNutrition = false // NEW: Advanced nutrition flag
                                           }) {
    const [inputMethod, setInputMethod] = useState('manual'); // 'manual', 'parser', 'url'
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


    const searchParams = useSearchParams();

    const CATEGORY_OPTIONS = [
        { value: 'seasonings', label: 'Seasonings' },
        { value: 'sauces', label: 'Sauces' },
        { value: 'salad-dressings', label: 'Salad Dressings' },
        { value: 'marinades', label: 'Marinades' },
        { value: 'ingredients', label: 'Basic Ingredients' },
        { value: 'entrees', label: 'Entrees' },
        { value: 'side-dishes', label: 'Side Dishes' },
        { value: 'soups', label: 'Soups' },
        { value: 'sandwiches', label: 'Sandwiches' },
        { value: 'appetizers', label: 'Appetizers' },
        { value: 'desserts', label: 'Desserts' },
        { value: 'breads', label: 'Breads' },
        { value: 'pizza-dough', label: 'Pizza Dough' },
        { value: 'specialty-items', label: 'Specialty Items' },
        { value: 'beverages', label: 'Beverages' },
        { value: 'breakfast', label: 'Breakfast' }
    ];

    // Recipe form state
    const [recipe, setRecipe] = useState({
        title: '',
        description: '',
        ingredients: [{ name: '', amount: '', unit: '', optional: false }],
        instructions: [{ step: 1, instruction: '' }],
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
    // FIXED: Add state for tags string to prevent comma parsing issues
    const [tagsString, setTagsString] = useState(
        initialData?.tags ? initialData.tags.join(', ') : ''
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // URL import state
    const [urlInput, setUrlInput] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState('');

    const router = useRouter();

    const extractNumber = (value) => {
        if (!value) return '';
        const match = String(value).match(/^(\d+)/);
        return match ? match[1] : '';
    };

    const extractNutritionValue = (value) => {
        if (!value) return '';

        // Handle object format {value: 320, unit: 'kcal'}
        if (typeof value === 'object' && value.value !== undefined) {
            return String(value.value);
        }

        // Handle number or string
        return String(value);
    };

    useShareHandler((shareData) => {
        console.log('📥 Share received in EnhancedRecipeForm:', shareData);
        setSharedContent(shareData);

        if (shareData.type === 'facebook_video') {
            // For import mode, continue with current behavior
            if (isImportMode) {
                setVideoUrl(shareData.url);
                setShowVideoImport(true);
                console.log('🎯 Facebook video shared to import page:', shareData.url);
            } else {
                // For regular add page, redirect to import page
                // Use setTimeout to avoid hook call during render
                setTimeout(() => {
                    router.push(`/recipes/import?videoUrl=${encodeURIComponent(shareData.url)}&source=share&platform=facebook`);
                }, 0);
            }
        }
    });

    // REPLACE with this single useEffect for auto-import
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const videoUrl = urlParams.get('videoUrl');
        const source = urlParams.get('source');
        const platform = urlParams.get('platform');

        console.log('🔍 Auto-import check on mount:');
        console.log('  - Current URL:', window.location.href);
        console.log('  - Video URL param:', videoUrl);
        console.log('  - Source param:', source);
        console.log('  - Platform param:', platform);

        if (videoUrl && source === 'share' && platform === 'facebook') {
            console.log('✅ Auto-import conditions met!');
            console.log('🎯 Auto-starting Facebook video import:', videoUrl);

            // Decode the URL
            const decodedVideoUrl = decodeURIComponent(videoUrl);
            console.log('🔗 Decoded URL:', decodedVideoUrl);

            // Set the video URL in the input
            setVideoUrl(decodedVideoUrl);

            // Show video import section
            setShowVideoImport(true);

            // Start the import after UI is ready
            const timer = setTimeout(() => {
                console.log('⏰ Auto-import timer triggered');
                handleVideoImport(decodedVideoUrl);
            }, 1000);

            // Clean up URL parameters after triggering import
            const cleanUrl = new URL(window.location);
            cleanUrl.searchParams.delete('videoUrl');
            cleanUrl.searchParams.delete('source');
            cleanUrl.searchParams.delete('platform');
            window.history.replaceState({}, '', cleanUrl);

            return () => clearTimeout(timer);
        } else {
            console.log('❌ Auto-import conditions NOT met');
            console.log('  - Has videoUrl?', !!videoUrl);
            console.log('  - Source is share?', source === 'share');
            console.log('  - Platform is facebook?', platform === 'facebook');
        }
    }, []); // Empty dependency array - only run once on mount

    // Auto-expanding textarea hook
    const useAutoExpandingTextarea = () => {
        const textareaRef = useRef(null);

        const adjustHeight = () => {
            const textarea = textareaRef.current;
            if (textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = `${Math.max(textarea.scrollHeight, 48)}px`;
            }
        };

        useEffect(() => {
            adjustHeight();
        });

        return [textareaRef, adjustHeight];
    };

    // Helper function to clean nutrition values (remove units)
    const cleanNutritionValue = (value) => {
        if (!value) return '';

        // Extract just the number from strings like "203 kcal", "12 g", "9 mg"
        const strValue = String(value);
        const match = strValue.match(/^(\d+(?:\.\d+)?)/);
        return match ? match[1] : '';
    };

    const getNormalizedNutritionSummary = () => {
        if (!recipe.nutrition) return null;

        console.log('🔍 Raw nutrition data:', recipe.nutrition);

        return {
            calories: recipe.nutrition.calories?.value || recipe.nutrition.calories || 0,
            protein: recipe.nutrition.protein?.value || recipe.nutrition.protein || 0,
            carbs: recipe.nutrition.carbs?.value || recipe.nutrition.carbs || 0,
            fat: recipe.nutrition.fat?.value || recipe.nutrition.fat || 0,
            fiber: recipe.nutrition.fiber?.value || recipe.nutrition.fiber || 0
        };
    };

    const nutritionForDisplay = {
        calories: { value: recipe.nutrition.calories?.value || 0, unit: 'kcal' },
        protein: { value: recipe.nutrition.protein?.value || 0, unit: 'g' },
        carbs: { value: recipe.nutrition.carbs?.value || 0, unit: 'g' },
        fat: { value: recipe.nutrition.fat?.value || 0, unit: 'g' },
        fiber: { value: recipe.nutrition.fiber?.value || 0, unit: 'g' }
    };

    console.log('🍎 Nutrition for display:', nutritionForDisplay);

    const ShareSuccessIndicator = ({ shareData }) => {
        console.log('ShareSuccessIndicator rendered with:', shareData);
        if (!shareData) return null;

        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                    <div className="text-green-600 mr-3">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-green-800">
                            🎯 Video Shared Successfully!
                        </h3>
                        <p className="text-sm text-green-700 mt-1">
                            Received Facebook video from {shareData.source === 'android_share' ? 'Android share' : 'web share'}.
                            Ready to extract recipe!
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    // Handle parsed recipe data
    const handleParsedRecipe = (parsedData) => {
        setRecipe(prevRecipe => ({
            ...prevRecipe,
            title: parsedData.title || prevRecipe.title,
            description: parsedData.description || prevRecipe.description,
            ingredients: parsedData.ingredients.length > 0 ? parsedData.ingredients : prevRecipe.ingredients,
            instructions: parsedData.instructions.length > 0 ? parsedData.instructions : prevRecipe.instructions,
            prepTime: parsedData.prepTime || prevRecipe.prepTime,
            cookTime: parsedData.cookTime || prevRecipe.cookTime,
            servings: parsedData.servings || prevRecipe.servings,
            tags: [...new Set([...prevRecipe.tags, ...parsedData.tags])], // Merge tags
            source: parsedData.source || prevRecipe.source,
            nutrition: parsedData.nutrition || prevRecipe.nutrition
        }));

        // Update tags string as well
        const allTags = [...new Set([...recipe.tags, ...parsedData.tags])];
        setTagsString(allTags.join(', '));

        setShowParser(false);
        setInputMethod('manual'); // Switch back to manual editing
    };

    const detectPlatformFromUrl = (url) => {
        if (!url) return 'video';
        const urlLower = url.toLowerCase();
        if (urlLower.includes('facebook.com') || urlLower.includes('fb.com')) return 'facebook';
        if (urlLower.includes('instagram.com')) return 'instagram';
        if (urlLower.includes('tiktok.com')) return 'tiktok';
        return 'video';
    };

    // Enhanced URL import with smart parsing
    const handleUrlImport = async (url) => {
        if (!url || !url.trim()) {
            setImportError('Please enter a valid URL');
            return;
        }

        setIsImporting(true);
        setImportError('');

        try {
            console.log('Importing recipe from URL:', url);

            const response = await apiPost('/api/recipes/scrape', { url: url.trim() });

            const data = await response.json();

            if (data.success) {
                console.log('Successfully imported recipe:', data.recipe);

                // ENHANCED: Use smart parsing for ingredients like RecipeParser
                const parseImportedIngredients = (ingredients) => {
                    if (!ingredients || !Array.isArray(ingredients)) return [{ name: '', amount: '', unit: '', optional: false }];

                    return ingredients.map(ingredient => {
                        // If ingredient is already parsed as object, use it
                        if (typeof ingredient === 'object' && ingredient.name) {
                            return {
                                name: ingredient.name || '',
                                amount: ingredient.amount || '',
                                unit: ingredient.unit || '',
                                optional: ingredient.optional || false
                            };
                        }

                        // If ingredient is a string, parse it using RecipeParser logic
                        const ingredientString = typeof ingredient === 'string' ? ingredient : (ingredient.name || '');
                        return parseIngredientLine(ingredientString);
                    }).filter(ing => ing && ing.name); // Remove any null results
                };

                // ENHANCED: Use smart parsing for instructions
                const parseImportedInstructions = (instructions) => {
                    if (!instructions || !Array.isArray(instructions)) return [{ step: 1, instruction: '' }];

                    return instructions.map((instruction, index) => {
                        const instructionText = typeof instruction === 'string' ? instruction : (instruction.instruction || instruction);
                        const cleanInstruction = parseInstructionLine(instructionText, index);
                        return cleanInstruction || { step: index + 1, instruction: instructionText };
                    }).filter(inst => inst && inst.instruction);
                };

                // Transform scraped data with enhanced parsing
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
                    isPublic: false, // Default to private, user can change
                    category: 'entrees',
                    nutrition: {
                        // Convert from structured format to simple values for form
                        calories: data.recipe.nutrition?.calories?.value || '',
                        protein: data.recipe.nutrition?.protein?.value || '',
                        carbs: data.recipe.nutrition?.carbs?.value || '',
                        fat: data.recipe.nutrition?.fat?.value || '',
                        fiber: data.recipe.nutrition?.fiber?.value || ''
                    }
                };

                setRecipe(importedRecipe);
                // Update tags string
                setTagsString(importedRecipe.tags.join(', '));
                setShowUrlImport(false);
                setInputMethod('manual'); // Switch to manual editing
                setUrlInput(''); // Clear the URL input
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

    // Video import handler
    const handleVideoImport = async (url) => {
        console.log('🎥 handleVideoImport called with URL:', url);

        // ADD THIS: Force minimum display time
        const startTime = Date.now();
        const MIN_DISPLAY_TIME = 3000; // 3 seconds minimum

        // Check if this came from a share
        if (sharedContent && sharedContent.url === url) {
            console.log(`🎯 Processing shared ${sharedContent.type} from ${sharedContent.source}`);

            // Show special UI for shared content
            setVideoInfo({
                ...videoInfo,
                sharedFromApp: true,
                shareSource: sharedContent.source
            });
        }
        console.log('🎥 handleVideoImport called with URL:', url);

        if (!url || !url.trim()) {
            setVideoImportError('Please enter a valid video URL');
            return;
        }

        // UPDATED: Remove YouTube patterns, add Facebook patterns
        const videoPatterns = [
            // TikTok patterns
            /tiktok\.com\/@[^/]+\/video\//,
            /tiktok\.com\/t\//,
            /vm\.tiktok\.com\//,
            // Instagram patterns
            /instagram\.com\/reel\//,
            /instagram\.com\/p\//,
            /instagram\.com\/tv\//,
            // Facebook patterns - ADD THESE
            /facebook\.com\/watch\?v=/,
            /facebook\.com\/[^\/]+\/videos\//,
            /fb\.watch\//,
            /facebook\.com\/share\/r\//,
            /facebook\.com\/reel\//
            // REMOVED: All YouTube patterns
        ];

        const isVideoUrl = videoPatterns.some(pattern => pattern.test(url));
        if (!isVideoUrl) {
            // UPDATED: Remove YouTube from error message
            setVideoImportError('Please enter a valid TikTok, Instagram, or Facebook video URL. For YouTube videos, use the Text Paste option with transcripts.');
            return;
        }

        // DEBUG: Log state changes
        console.log('🔄 Setting isVideoImporting to true');
        setIsVideoImporting(true);

        const platform = detectPlatformFromUrl(url);
        setVideoImportProgress({
            stage: 'starting',
            platform: platform, // Use detected platform
            message: `Initializing ${platform} video analysis...`
        });

        setVideoImportError('');

        // ADD: Set initial progress stage
        setVideoImportProgress({
            stage: 'starting',
            platform: 'facebook',
            message: 'Initializing video analysis...'
        });


        try {
            console.log('📡 Starting API call to video-extract...');

            // UPDATE: Set downloading stage
            setVideoImportProgress({
                stage: 'downloading',
                platform: 'facebook',
                message: 'Downloading video from Facebook...'
            });

            const requestPayload = {
                url: url.trim(),
                analysisType: 'ai_vision_enhanced' // Signal to use AI frame analysis
            };

            console.log('📡 Starting API call with AI analysis:', requestPayload);

            // UPDATE: Set processing stage
            setVideoImportProgress({
                stage: 'processing',
                platform: 'facebook',
                message: 'AI analyzing video frames...'
            });

            const response = await apiPost('/api/recipes/video-extract', {
                url: url.trim(),
                analysisType: 'ai_vision_enhanced'
            });
            const data = await response.json();

            console.log('📥 Received response from video-extract:', data);

            if (data.success) {
                console.log('✅ Video extraction successful');

                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsedTime);

                if (remainingTime > 0) {
                    console.log(`⏱️ API completed in ${elapsedTime}ms, waiting additional ${remainingTime}ms for minimum display`);

                    // Show completion message while waiting
                    setVideoImportProgress({
                        stage: 'complete',
                        platform: 'facebook',
                        message: 'Recipe generated successfully!'
                    });

                    await new Promise(resolve => setTimeout(resolve, remainingTime));
                }

                // UPDATE: Set generating stage
                setVideoImportProgress({
                    stage: 'generating',
                    platform: 'facebook',
                    message: 'Generating recipe from analysis...'
                });

                // DEBUG: Check for timestamps in raw data
                console.log('🕒 Checking for timestamps in ingredients:');
                data.recipe.ingredients?.forEach((ing, i) => {
                    if (ing.videoTimestamp) {
                        console.log(`  Ingredient ${i}: ${ing.name} has timestamp ${ing.videoTimestamp}`);
                    }
                });

                console.log('🕒 Checking for timestamps in instructions:');
                data.recipe.instructions?.forEach((inst, i) => {
                    if (inst.videoTimestamp) {
                        console.log(`  Instruction ${i}: has timestamp ${inst.videoTimestamp}`);
                    }
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
                            console.log(`✅ Adding timestamp to ingredient ${index}: ${ing.name} at ${ing.videoTimestamp}s`);
                            ingredient.videoTimestamp = ing.videoTimestamp;
                            ingredient.videoLink = ing.videoLink;
                        } else {
                            console.log(`❌ No timestamp for ingredient ${index}: ${ing.name}`);
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
                                console.log(`✅ Adding timestamp to instruction ${index}: at ${inst.videoTimestamp}s`);
                                instruction.videoTimestamp = inst.videoTimestamp;
                                instruction.videoLink = inst.videoLink;
                            } else {
                                console.log(`❌ No timestamp for instruction ${index}`);
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
                        hasTimestamps: data.extractionInfo?.hasTimestamps || false
                    }
                };

                setRecipe(videoRecipe);
                setTagsString(videoRecipe.tags.join(', '));

                // UPDATE: Show completion message
                setVideoImportProgress({
                    stage: 'complete',
                    platform: 'facebook',
                    message: 'Recipe generated successfully!'
                });

                setTimeout(() => {
                    console.log('🎭 Hiding modal after delay');
                    setIsVideoImporting(false);
                    setVideoImportProgress({ stage: '', platform: '', message: '' });
                }, 1500); // Show success for 1.5 seconds

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
            } else {
                console.error('❌ Video import failed:', data.error);
                setVideoImportError(data.error || 'Failed to extract recipe from video');
            }
        } catch (error) {
            console.error('💥 Video import error:', error);
            setVideoImportError('Network error. Please check your connection and try again.');
        } finally {
            console.log('🔄 Setting isVideoImporting to false');
            setIsVideoImporting(false);
            setVideoImportProgress({ stage: '', platform: '', message: '' });
        }
    };

    // ENHANCED PARSING FUNCTIONS (from RecipeParser)
    // Enhanced ingredient parsing (same logic as RecipeParser)
    const parseIngredientLine = (line) => {
        if (!line || line.length < 2) return null;

        // Remove bullets, pricing, and clean the line
        let cleanLine = line
            .replace(/^[\*\-\•]\s*/, '') // Remove bullet points only (*, -, •)
            .replace(/^\d+\.\s*/, '') // Remove numbered list markers like "1. " but not measurements
            .replace(/^\d+\)\s*/, '') // Remove numbered list markers like "1) " but not measurements
            .replace(/\(\$[\d\.]+\)/g, '') // Remove pricing like ($0.37)
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        if (!cleanLine) return null;

        console.log('🥕 Parsing URL import ingredient:', cleanLine);

        // Convert fraction characters
        cleanLine = convertFractions(cleanLine);

        let match;

        // Pattern 1: "to taste" ingredients
        match = cleanLine.match(/^(.+?)\s*,?\s*to\s+taste$/i);
        if (match) {
            return {
                name: match[1].trim(),
                amount: 'to taste',
                unit: '',
                optional: false
            };
        }

        // Pattern 2: Amount + Unit + Description (e.g., "2 cups flour", "1 tsp salt")
        match = cleanLine.match(/^(\d+(?:\/\d+)?(?:\.\d+)?(?:\s+\d+\/\d+)?)\s+(cups?|tbsp|tsp|tablespoons?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|cloves?|ribs?|rib?|stalks?|sprigs?|leaves?|bulbs?|heads?|ears?|slices?|pieces?|cans?|jars?|bottles?|small|medium|large|bunch|handful)\s+(.+)$/i);
        if (match) {
            return {
                name: match[3].trim(),
                amount: match[1].trim(),
                unit: match[2].toLowerCase(),
                optional: cleanLine.toLowerCase().includes('optional')
            };
        }

        // Pattern 3: Amount + Description (no unit)
        match = cleanLine.match(/^(\d+(?:\/\d+)?(?:\.\d+)?(?:\s+\d+\/\d+)?)\s+(.+)$/);
        if (match) {
            const secondPart = match[2].trim();

            // Check if second part starts with a unit
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

        // Pattern 4: Fractional amounts (e.g., "1/2 onion", "3/4 cup butter")
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

        // Fallback: treat entire line as ingredient name
        return {
            name: cleanLine,
            amount: '',
            unit: '',
            optional: cleanLine.toLowerCase().includes('optional')
        };
    };

    // Enhanced instruction parsing (same logic as RecipeParser)
    const parseInstructionLine = (line, stepNumber) => {
        if (!line || line.length < 5) return null;

        // Clean the line
        let cleanLine = line
            .replace(/^[\*\-\•]\s*/, '') // Remove bullets
            .replace(/^\d+[\.\)]\s*/, '') // Remove step numbers
            .replace(/^(step\s*\d*[:.]?\s*)/i, '') // Remove "Step X:" prefixes
            .trim();

        if (!cleanLine || cleanLine.length < 5) return null;

        return {
            step: stepNumber + 1,
            instruction: cleanLine
        };
    };

    // Helper function for fraction conversion
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

    // Original manual form handlers
    const updateRecipe = (field, value) => {
        setRecipe(prev => ({ ...prev, [field]: value }));
    };

    const updateNutrition = (field, value) => {
        setRecipe(prev => ({
            ...prev,
            nutrition: { ...prev.nutrition, [field]: value }
        }));
    };

    const addIngredient = () => {
        setRecipe(prev => ({
            ...prev,
            ingredients: [...prev.ingredients, { name: '', amount: '', unit: '', optional: false }]
        }));
    };

    const updateIngredient = (index, field, value) => {
        setRecipe(prev => ({
            ...prev,
            ingredients: prev.ingredients.map((ing, i) =>
                i === index ? { ...ing, [field]: value } : ing
            )
        }));
    };

    const removeIngredient = (index) => {
        setRecipe(prev => ({
            ...prev,
            ingredients: prev.ingredients.filter((_, i) => i !== index)
        }));
    };

    const addInstruction = () => {
        setRecipe(prev => ({
            ...prev,
            instructions: [...prev.instructions, { step: prev.instructions.length + 1, instruction: '' }]
        }));
    };

    const updateInstruction = (index, value) => {
        setRecipe(prev => ({
            ...prev,
            instructions: prev.instructions.map((inst, i) =>
                i === index ? { ...inst, instruction: value } : inst
            )
        }));
    };

    const removeInstruction = (index) => {
        setRecipe(prev => ({
            ...prev,
            instructions: prev.instructions
                .filter((_, i) => i !== index)
                .map((inst, i) => ({ ...inst, step: i + 1 }))
        }));
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
            // Make sure tags are processed from the string before submitting
            const finalTags = tagsString
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            // Create final recipe object that matches MongoDB schema
            const finalRecipe = {
                ...recipe,
                tags: finalTags,

                // Handle video metadata properly
                ...(recipe.videoMetadata && {
                    videoMetadata: recipe.videoMetadata
                }),

                // Add import source info
                ...(importSource === 'video' && {
                    importedFrom: recipe._formMetadata?.importedFrom || 'video import'
                }),

                // Remove form-specific metadata before saving
                _formMetadata: undefined
            };

            // Clean up any undefined values
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

    // Auto-expanding textarea component
    const AutoExpandingTextarea = ({ value, onChange, placeholder, className, ...props }) => {
        const [textareaRef, adjustHeight] = useAutoExpandingTextarea();

        return (
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                    onChange(e);
                    setTimeout(adjustHeight, 0);
                }}
                onInput={adjustHeight}
                placeholder={placeholder}
                className={`${className} resize-none overflow-hidden`}
                style={{ minHeight: '48px' }}
                {...props}
            />
        );
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

    console.log('🔍 Recipe nutrition data for summary:', recipe.nutrition);
    console.log('🔍 Sample values:', {
        calories: recipe.nutrition.calories,
        protein: recipe.nutrition.protein,
        fat: recipe.nutrition.fat,
        carbs: recipe.nutrition.carbs
    });

    console.log('🔍 Passing to NutritionFacts:', nutritionForDisplay);
    console.log('🔍 Servings:', parseInt(recipe.servings) || 4);

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
                        <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => {
                                setUrlInput(e.target.value);
                                setImportError(''); // Clear error when user types
                            }}
                            placeholder="https://www.allrecipes.com/recipe/..."
                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            style={{ minHeight: '48px' }}
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

    {/* Show video import component */}
    if (showVideoImport) {

        return (
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
                        <input
                            type="url"
                            value={videoUrl}
                            onChange={(e) => {
                                setVideoUrl(e.target.value);
                                setVideoImportError(''); // Clear error when user types
                            }}
                            placeholder="https://tiktok.com/@user/video/... or Instagram/Facebook URL"
                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            style={{ minHeight: '48px' }}
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
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
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
        );
    }

    return (
        <div className="space-y-6">
            {console.log('🔍 RENDERING MODAL with isVisible:', isVideoImporting)}

            {/* ADD THIS DEBUG TEXT */}
            <div className="fixed top-10 left-4 bg-yellow-500 text-black p-2 rounded z-50">
                DEBUG: Component is rendering!
                <br />
                isVideoImporting: {isVideoImporting.toString()}
            </div>

            <VideoImportLoadingModal
                isVisible={isVideoImporting}
                platform="facebook"  // Static since you know it's Facebook
                stage="processing"   // Static stage
                message="Processing Facebook video..."  // Static message
                videoUrl={videoUrl}
                onComplete={() => {
                    setIsVideoImporting(false);
                }}
                style={{ zIndex: 9999 }}
            />
            <button
                onClick={() => {
                    console.log('🧪 TEST: Setting isVideoImporting to TRUE');
                    setIsVideoImporting(true);
                }}
                className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded z-50"
            >
                TEST MODAL
            </button>

            {/* DEBUG: Add visible state indicator */}
            {process.env.NODE_ENV === 'development' && (
                <div className="fixed top-4 right-4 bg-black text-white p-2 rounded text-xs z-40">
                    isVideoImporting: {isVideoImporting.toString()}<br/>
                    Modal should be: {isVideoImporting ? 'VISIBLE' : 'HIDDEN'}<br/>

                    {/* ADD: Manual test button */}
                    <button
                        onClick={() => {
                            console.log('🧪 TEST: Setting isVideoImporting to true');
                            setIsVideoImporting(true);
                        }}
                        className="bg-red-500 text-white px-2 py-1 rounded mt-2 text-xs"
                    >
                        TEST MODAL
                    </button>

                    <button
                        onClick={() => {
                            console.log('🧪 TEST: Setting isVideoImporting to false');
                            setIsVideoImporting(false);
                        }}
                        className="bg-blue-500 text-white px-2 py-1 rounded mt-2 text-xs ml-1"
                    >
                        HIDE MODAL
                    </button>
                </div>
            )}

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

                        {/* SINGLE IMPORT BUTTON */}
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
                                💡 <strong>Tip:</strong> You can always switch to the text parser or import recipes from other sources!
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Manual Recipe Form */}
            {(inputMethod === 'manual' || isEditing) && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
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
                                    {/* ADD THIS VIDEO IMPORT BUTTON */}
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Recipe Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={recipe.title}
                                    onChange={(e) => updateRecipe('title', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
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
                                    style={{ minHeight: '48px' }}
                                >
                                    {CATEGORY_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
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
                                <input
                                    type="number"
                                    value={extractNumber(recipe.prepTime)} // CHANGE THIS
                                    onChange={(e) => updateRecipe('prepTime', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                    placeholder="15"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cook Time (minutes)
                                </label>
                                <input
                                    type="number"
                                    value={extractNumber(recipe.cookTime)} // CHANGE THIS
                                    onChange={(e) => updateRecipe('cookTime', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
                                    placeholder="30"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Servings
                                </label>
                                <input
                                    type="number"
                                    value={extractNumber(recipe.servings)} // CHANGE THIS
                                    onChange={(e) => updateRecipe('servings', e.target.value)}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
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
                                    style={{ minHeight: '48px' }}
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Ingredients - MOBILE RESPONSIVE */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Ingredients ({recipe.ingredients.length})
                        </h3>

                        <div className="space-y-4">
                            {recipe.ingredients.map((ingredient, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    {/* Top row: Optional checkbox and Delete button */}
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="flex items-center text-sm text-gray-600 pl-2"> {/* Add pl-2 for left padding */}
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
                                            disabled={recipe.ingredients.length === 1}
                                        >
                                            ✕
                                        </TouchEnhancedButton>
                                    </div>

                                    {/* Input fields */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {/* Amount and Unit row on mobile, side by side */}
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
                                                    style={{ minHeight: '48px' }}
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
                                                    style={{ minHeight: '48px' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Ingredient name - full width on mobile */}
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
                                                style={{ minHeight: '48px' }}
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

                    {/* Instructions - MOBILE RESPONSIVE */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Instructions ({recipe.instructions.length})
                        </h3>

                        <div className="space-y-4">
                            {recipe.instructions.map((instruction, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    {/* Top row: Step number and Delete button */}
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                                            {instruction.step}
                                        </div>
                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={() => removeInstruction(index)}
                                            className="font-semibold text-red-600 hover:text-red-700 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                            disabled={recipe.instructions.length === 1}
                                        >
                                            ✕
                                        </TouchEnhancedButton>
                                    </div>

                                    {/* Textarea - full width */}
                                    <AutoExpandingTextarea
                                        value={instruction.instruction}
                                        onChange={(e) => updateInstruction(index, e.target.value)}
                                        placeholder="Describe this step..."
                                        className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    />
                                </div>
                            ))}
                        </div>

                        <TouchEnhancedButton
                            type="button"
                            onClick={addInstruction}
                            className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium px-4 py-3 min-h-[48px]"
                        >
                            + Add Step
                        </TouchEnhancedButton>
                    </div>

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
                                <input
                                    type="text"
                                    value={tagsString}
                                    onChange={(e) => handleTagsStringChange(e.target.value)}
                                    onBlur={handleTagsStringBlur}
                                    placeholder="italian, dinner, easy, comfort-food"
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
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
                                        style={{ minHeight: '48px' }}
                                    />
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={addTag}
                                        className="px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 min-h-[48px] sm:w-auto w-full"
                                    >
                                        Add
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
                                    <h4 className="text-sm font-medium text-gray-700 mb-4">Or enter basic nutrition manually:</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Calories</label>
                                            <input
                                                type="number"
                                                value={extractNutritionValue(recipe.nutrition.calories)} // CHANGE THIS
                                                onChange={(e) => updateNutrition('calories', e.target.value)}
                                                placeholder="250"
                                                className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ minHeight: '48px' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Protein (g)</label>
                                            <input
                                                type="number"
                                                value={extractNutritionValue(recipe.nutrition.protein)} // CHANGE THIS
                                                onChange={(e) => updateNutrition('protein', e.target.value)}
                                                placeholder="15"
                                                className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ minHeight: '48px' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Carbs (g)</label>
                                            <input
                                                type="number"
                                                value={extractNutritionValue(recipe.nutrition.carbs)} // CHANGE THIS
                                                onChange={(e) => updateNutrition('carbs', e.target.value)}
                                                placeholder="30"
                                                className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ minHeight: '48px' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Fat (g)</label>
                                            <input
                                                type="number"
                                                value={extractNutritionValue(recipe.nutrition.fat)} // CHANGE THIS
                                                onChange={(e) => updateNutrition('fat', e.target.value)}
                                                placeholder="10"
                                                className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ minHeight: '48px' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Fiber (g)</label>
                                            <input
                                                type="number"
                                                value={extractNutritionValue(recipe.nutrition.fiber)} // CHANGE THIS
                                                onChange={(e) => updateNutrition('fiber', e.target.value)}
                                                placeholder="5"
                                                className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ minHeight: '48px' }}
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
                                <input
                                    type="text"
                                    value={recipe.source}
                                    onChange={(e) => updateRecipe('source', e.target.value)}
                                    placeholder="Recipe source or URL..."
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    style={{ minHeight: '48px' }}
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
                                    <div className="text-sm text-gray-600">Ingredients with video timestamps</div>
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

                    {/* Submit Buttons - MOBILE RESPONSIVE */}
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
                                </>
                            )}
                        </TouchEnhancedButton>
                    </div>
                </form>
            )}

            {/* Add your NutritionModal at the very end of the component, before the closing </div> */}
            <NutritionModal
                nutrition={recipe.nutrition}
                isOpen={showNutritionModal}
                onClose={() => setShowNutritionModal(false)}
                servings={parseInt(recipe.servings) || 4}
                recipeTitle={recipe.title || "Recipe"}
            />


        </div>
    );
}