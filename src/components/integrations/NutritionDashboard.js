'use client';

// file: /src/components/integrations/NutritionDashboard.js v2 - Fixed Enhanced Quick Actions and API calls

import React, {useState, useEffect, useCallback} from 'react';
import {useSession} from 'next-auth/react';
import {useModalIntegration} from '@/hooks/useModalIntegration';
import { VoiceInput } from '@/components/mobile/VoiceInput';
import NutritionModal from '@/components/nutrition/NutritionModal';

export default function NutritionDashboard({ onShowNutritionModal }) {
    const {data: session} = useSession();
    const {
        loading,
        error,
        analyzeNutrition,
        performSmartInventoryAction,
        clearError
    } = useModalIntegration();

    const [dashboardData, setDashboardData] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [refreshing, setRefreshing] = useState(false);

    // Voice nutrition state
    const [showVoiceNutrition, setShowVoiceNutrition] = useState(false);
    const [processingVoiceNutrition, setProcessingVoiceNutrition] = useState(false);
    const [showNutritionModal, setShowNutritionModal] = useState(false);
    const [modalNutritionData, setModalNutritionData] = useState(null);
    const [modalRecipeTitle, setModalRecipeTitle] = useState('');


    useEffect(() => {
        if (session?.user?.id) {
            loadDashboardData();
        }
    }, [session]);

    const loadDashboardData = async () => {
        try {
            setRefreshing(true);

            // Load comprehensive dashboard data
            const [inventoryData, nutritionGoals, recentAnalyses] = await Promise.all([
                fetch('/api/inventory').then(res => res.json()),
                fetch('/api/nutrition/goals').then(res => res.json()).catch(() => ({ goals: {} })),
                fetch('/api/nutrition/recent-analyses').then(res => res.json()).catch(() => ({ analyses: [] }))
            ]);

            if (inventoryData.success && inventoryData.inventory?.length > 0) {
                // Get smart inventory insights using the real API
                try {
                    const insights = await performSmartInventoryAction('suggest_recipes', {
                        inventory: inventoryData.inventory,
                        preferences: session?.user?.preferences || {}
                    });

                    setDashboardData({
                        inventory: inventoryData.inventory,
                        nutritionGoals: nutritionGoals.goals || {},
                        recentAnalyses: recentAnalyses.analyses || [],
                        smartInsights: insights.suggestions || [],
                        inventoryUtilization: insights.inventoryUtilization || {}
                    });
                } catch (smartInventoryError) {
                    console.error('Smart inventory insights failed:', smartInventoryError);
                    // Set dashboard data without smart insights
                    setDashboardData({
                        inventory: inventoryData.inventory,
                        nutritionGoals: nutritionGoals.goals || {},
                        recentAnalyses: recentAnalyses.analyses || [],
                        smartInsights: [],
                        inventoryUtilization: {}
                    });
                }
            } else {
                // No inventory data
                setDashboardData({
                    inventory: [],
                    nutritionGoals: nutritionGoals.goals || {},
                    recentAnalyses: recentAnalyses.analyses || [],
                    smartInsights: [],
                    inventoryUtilization: {}
                });
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            setDashboardData({
                inventory: [],
                nutritionGoals: {},
                recentAnalyses: [],
                smartInsights: [],
                inventoryUtilization: {}
            });
        } finally {
            setRefreshing(false);
        }
    };

    // UPDATED: Enhanced voice nutrition handler with modal integration
    const handleVoiceNutrition = useCallback(async (transcript, confidence) => {
        console.log('🎤 Voice nutrition query:', transcript);
        console.log('🎤 Confidence level:', confidence);
        setProcessingVoiceNutrition(true);

        try {
            // Data validation
            if (!dashboardData?.inventory || !Array.isArray(dashboardData.inventory)) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Data Unavailable',
                    message: 'Inventory data not available. Please refresh and try again.'
                });
                return;
            }

            if (dashboardData.inventory.length === 0) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showAlert({
                    title: 'No Inventory',
                    message: 'No inventory items found. Please add items to your inventory first.'
                });
                return;
            }

            console.log(`📦 Processing voice command with ${dashboardData.inventory.length} inventory items available`);

            const nutritionQuery = parseVoiceNutritionQuery(transcript);
            console.log('🎯 Parsed query:', nutritionQuery);

            if (nutritionQuery.action === 'analyze_item') {
                console.log('🔬 Starting analysis for:', nutritionQuery.itemName);

                const result = await analyzeItemWithModalService(nutritionQuery.itemName);

                setShowVoiceNutrition(false);

                // Enhanced result handling with better debugging
                if (!result) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Analysis Failed',
                        message: 'No result received from analysis'
                    });
                    return;
                }

                console.log('🔍 ANALYSIS RESULT:', JSON.stringify(result, null, 2));

                const nutrition = result.nutrition;
                const analysisMethod = result.method || 'ai_analysis';
                const confidence = result.confidence || 0.8;

                if (!nutrition) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Data Missing',
                        message: 'No nutrition data received'
                    });
                    return;
                }

                // Use the enhanced display function (modal or alert)
                displayNutritionResults(nutrition, result.analyzedItem || nutritionQuery.itemName, result);

            } else if (nutritionQuery.action === 'get_suggestions') {
                setActiveTab('recipes');
                setShowVoiceNutrition(false);
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showSuccess({
                    title: 'Tab Switched',
                    message: '✅ Switched to Recipe Suggestions tab'
                });
            } else if (nutritionQuery.action === 'optimization') {
                setActiveTab('optimization');
                setShowVoiceNutrition(false);
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showSuccess({
                    title: 'Tab Switched',
                    message: '✅ Switched to Smart Optimization tab'
                });
            } else if (nutritionQuery.action === 'list_items') {
                const itemList = dashboardData.inventory
                    .slice(0, 10)
                    .map((item, index) => {
                        let itemText = `${index + 1}. ${item.name}`;
                        if (item.brand) itemText += ` (${item.brand})`;
                        if (item.location) itemText += ` - ${item.location}`;
                        if (item.nutrition) itemText += ` ✅`;
                        else itemText += ` 🤖`;
                        return itemText;
                    })
                    .join('\n');

                let message = `📦 Your inventory items:\n\n${itemList}`;
                if (dashboardData.inventory.length > 10) {
                    message += `\n... and ${dashboardData.inventory.length - 10} more items`;
                }
                message += `\n\n✅ = Has nutrition data\n🤖 = Can analyze with AI`;

                setShowVoiceNutrition(false);
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showAlert({
                    title: 'Notification',
                    message: message
                });
            }
        } catch (error) {
            console.error('❌ Error processing voice nutrition:', error);

            let errorMessage = error.message;

            if (errorMessage.includes('not found in inventory')) {
                errorMessage += '\n\n💡 Try saying "list my items" to see what\'s available.';
            } else if (errorMessage.includes('No inventory items found')) {
                errorMessage = 'Your inventory is empty. Please add some items first.';
            } else if (errorMessage.includes('Modal service')) {
                errorMessage = 'AI nutrition service is temporarily unavailable.';
            }

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Error',
                message: `❌ ${errorMessage}`
            });
        } finally {
            setProcessingVoiceNutrition(false);
        }
    }, [dashboardData, setActiveTab]);

    // FIXED: Better voice query parsing to extract item names correctly
    const parseVoiceNutritionQuery = useCallback((transcript) => {
        const cleanTranscript = transcript.toLowerCase().trim();
        console.log('🎯 Parsing voice query:', cleanTranscript);

        // Check for special actions first
        if (cleanTranscript.includes('list') || cleanTranscript.includes('show me') || cleanTranscript.includes('what do i have')) {
            return { action: 'list_items' };
        }

        if (cleanTranscript.includes('recipe') || cleanTranscript.includes('suggest') || cleanTranscript.includes('cook')) {
            return { action: 'get_suggestions' };
        }

        if (cleanTranscript.includes('optim') || cleanTranscript.includes('improve') || cleanTranscript.includes('smart')) {
            return { action: 'optimization' };
        }

        // FIXED: Extract item names more accurately
        let itemName = '';

        // Try specific patterns first
        const patterns = [
            /(?:analyze\s+)?nutrition\s+(?:of|for)\s+(.+)$/,  // "nutrition of beef enchiladas"
            /^analyze\s+(?!nutrition)(.+)$/,                   // "analyze beef enchiladas"
            /(?:get|show|find)\s+nutrition\s+(?:for|of)\s+(.+)$/, // "get nutrition for beef"
            /(?:how\s+much\s+)?(?:protein|calories|carbs|fat|fiber)\s+(?:in|for)\s+(.+)$/, // "protein in chicken"
            /(?:tell\s+me\s+about|what\s+about|info\s+(?:on|about))\s+(.+)$/ // "tell me about beef"
        ];

        for (const pattern of patterns) {
            const match = cleanTranscript.match(pattern);
            if (match) {
                itemName = match[1].trim();
                console.log('🎯 Extracted item name using pattern:', itemName);
                return { action: 'analyze_item', itemName };
            }
        }

        // Smart word filtering as fallback
        const commandWords = ['analyze', 'nutrition', 'get', 'show', 'find', 'tell', 'me', 'about', 'of', 'for', 'in', 'the', 'a', 'an'];
        const words = cleanTranscript.split(/\s+/);

        // Find the longest contiguous sequence of non-command words
        let bestSequence = '';
        let currentSequence = '';

        for (const word of words) {
            if (!commandWords.includes(word)) {
                currentSequence += (currentSequence ? ' ' : '') + word;
            } else {
                if (currentSequence.length > bestSequence.length) {
                    bestSequence = currentSequence;
                }
                currentSequence = '';
            }
        }

        if (currentSequence.length > bestSequence.length) {
            bestSequence = currentSequence;
        }

        if (bestSequence.trim()) {
            itemName = bestSequence.trim();
            console.log('🎯 Extracted item name using smart filtering:', itemName);
            return { action: 'analyze_item', itemName };
        }

        console.warn('⚠️ Could not parse query, using full transcript:', cleanTranscript);
        return {
            action: 'analyze_item',
            itemName: cleanTranscript
        };
    }, []);

    // NEW: Main analysis function that uses your Modal service
    const analyzeItemWithModalService = useCallback(async (itemName) => {
        console.log('🧠 Modal service analysis for:', itemName);

        // Step 1: Check for perfect inventory matches (exact only)
        const perfectMatch = findPerfectInventoryMatch(itemName, dashboardData.inventory);

        if (perfectMatch) {
            console.log('🎯 Perfect inventory match found:', perfectMatch.name);

            if (perfectMatch.nutrition) {
                // Return existing nutrition with high confidence
                return {
                    item: perfectMatch,
                    nutrition: perfectMatch.nutrition,
                    method: 'perfect_inventory_match',
                    confidence: 0.98,
                    analyzedItem: perfectMatch.name
                };
            } else {
                // Analyze the inventory item with Modal
                return await analyzeInventoryItemWithModal(perfectMatch);
            }
        }

        // Step 2: No perfect match - use Modal AI to analyze as recipe/ingredient
        console.log('🤖 No perfect match - using Modal AI analysis');

        const isLikelyRecipe = detectRecipeOrDish(itemName);

        if (isLikelyRecipe) {
            return await analyzeRecipeWithModal(itemName);
        } else {
            return await analyzeIngredientWithModal(itemName);
        }
    }, [dashboardData]);

    // Helper function to find perfect matches only
    const findPerfectInventoryMatch = (searchTerm, inventory) => {
        const searchTermLower = searchTerm.toLowerCase().trim();

        // Remove quantity descriptors
        const cleanSearchTerm = searchTermLower.replace(/^\d+\s*(lbs?|pounds?|oz|ounces?|cups?|tbsp|tsp|grams?|kg)\s+/, '');

        console.log('🎯 Looking for perfect match:', cleanSearchTerm);

        // Only accept exact matches
        const exactMatch = inventory.find(item =>
            item.name.toLowerCase().trim() === cleanSearchTerm
        );

        if (exactMatch) {
            console.log('✅ Found perfect exact match:', exactMatch.name);
            return exactMatch;
        }

        console.log('❌ No perfect matches - will use AI');
        return null;
    };

    // Helper function to detect recipes vs ingredients
    const detectRecipeOrDish = (itemName) => {
        const recipeKeywords = [
            'enchiladas', 'tacos', 'burrito', 'sandwich', 'salad', 'soup', 'stew', 'casserole',
            'pasta', 'pizza', 'burger', 'omelet', 'smoothie', 'stir fry', 'curry', 'chili',
            'roasted', 'grilled', 'baked', 'fried', 'sauteed', 'braised', 'steamed',
            'with', 'and', 'topped', 'stuffed', 'filled', 'style', 'recipe'
        ];

        const nameLower = itemName.toLowerCase();
        return recipeKeywords.some(keyword => nameLower.includes(keyword));
    };

    // Enhanced Modal analysis with better error handling and response parsing
    const analyzeRecipeWithModal = async (recipeName) => {
        console.log('🍽️ Analyzing recipe with Modal:', recipeName);
        try {
            const { modalBridge } = await import('@/lib/modal-bridge');

            const result = await modalBridge.analyzeNutrition({
                type: 'recipe',
                analysis_level: 'comprehensive',
                data: {
                    title: recipeName,
                    servings: 1,
                    ingredients: [], // Empty for voice analysis
                    instructions: []
                }
            });

            console.log('🔍 MODAL RECIPE RESPONSE:', JSON.stringify(result, null, 2));

            if (result.success) {
                let nutrition = extractNutritionFromResponse(result);

                if (!nutrition) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Extraction Failed',
                        message: 'Could not extract nutrition data from Modal response'
                    });
                    return;
                }

                return {
                    nutrition: nutrition,
                    method: 'ai_recipe_analysis',
                    confidence: result.confidence || nutrition.confidence || 0.85,
                    analyzedItem: recipeName,
                    warning: nutrition.calculationMethod === 'mock_data_for_debugging' ?
                        'Using mock data - check Modal response format' : null
                };
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Analysis Failed',
                    message: result.error || 'Recipe analysis failed'
                });
                return;
            }
        } catch (error) {
            console.error('❌ Recipe Modal analysis failed:', error);
            return generateBasicEstimate(recipeName, 'recipe');
        }
    };

    // Enhanced ingredient analysis
    const analyzeIngredientWithModal = async (ingredientName) => {
        console.log('🥕 Analyzing ingredient with Modal:', ingredientName);
        try {
            const { modalBridge } = await import('@/lib/modal-bridge');

            const result = await modalBridge.analyzeNutrition({
                type: 'inventory_item',
                analysis_level: 'comprehensive',
                data: {
                    name: ingredientName,
                    brand: '',
                    category: '',
                    quantity: 1,
                    unit: 'serving'
                }
            });

            console.log('🔍 MODAL INGREDIENT RESPONSE:', JSON.stringify(result, null, 2));

            if (result.success) {
                let nutrition = extractNutritionFromResponse(result);

                if (!nutrition) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Extraction Failed',
                        message: 'Could not extract nutrition data from Modal response'
                    });
                    return;
                }

                return {
                    nutrition: nutrition,
                    method: 'ai_ingredient_analysis',
                    confidence: result.confidence || nutrition.confidence || 0.85,
                    analyzedItem: ingredientName,
                    warning: nutrition.calculationMethod === 'mock_data_for_debugging' ?
                        'Using mock data - check Modal response format' : null
                };
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Analysis Failed',
                    message: result.error || 'Ingredient analysis failed'
                });
                return;
            }
        } catch (error) {
            console.error('❌ Ingredient Modal analysis failed:', error);
            return generateBasicEstimate(ingredientName, 'ingredient');
        }
    };

    const analyzeInventoryItemWithModal = async (item) => {
        console.log('📦 Analyzing inventory item with Modal:', item.name);
        try {
            const { modalBridge } = await import('@/lib/modal-bridge');

            const result = await modalBridge.analyzeNutrition({
                type: 'inventory_item',
                analysis_level: 'comprehensive',
                data: {
                    itemId: item._id,
                    name: item.name,
                    brand: item.brand || '',
                    category: item.category || '',
                    quantity: item.quantity || 1,
                    unit: item.unit || 'item'
                }
            });

            console.log('🔍 MODAL INVENTORY RESPONSE:', result);

            if (result.success) {
                let nutrition = extractNutritionFromResponse(result);

                if (!nutrition) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Extraction Failed',
                        message: 'Could not extract nutrition data from Modal response'
                    });
                    return;
                }

                // Update inventory with new nutrition data
                setDashboardData(prev => ({
                    ...prev,
                    inventory: prev.inventory.map(invItem =>
                        invItem._id === item._id
                            ? { ...invItem, nutrition: nutrition }
                            : invItem
                    )
                }));

                return {
                    item: { ...item, nutrition: nutrition },
                    nutrition: nutrition,
                    method: 'ai_inventory_item_analysis',
                    confidence: result.confidence || nutrition.confidence || 0.85,
                    analyzedItem: item.name,
                    inventoryUpdated: true
                };
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'AI Analysis Failed',
                    message: result.error || 'AI analysis failed'
                });
                return;
            }
        } catch (error) {
            console.error('❌ Inventory Modal analysis failed:', error);
            return generateBasicEstimate(item.name, 'ingredient');
        }
    };

    const extractNutritionFromResponse = (result) => {
        console.log('🔍 Extracting nutrition from response...');
        console.log('🔍 Full result object:', JSON.stringify(result, null, 2));

        let nutrition = null;

        // Handle the specific format returned by your Modal service
        if (result.nutrition && result.nutrition.nutrition_per_serving) {
            const rawNutrition = result.nutrition.nutrition_per_serving;
            console.log('✅ Found nutrition_per_serving data:', rawNutrition);

            // Convert the raw format to your expected format
            nutrition = convertRawNutritionToStandardFormat(rawNutrition);

            // Add additional metadata from the response
            if (result.nutrition.calculationMethod) {
                nutrition.calculationMethod = result.nutrition.calculationMethod;
            }
            if (result.nutrition.confidence) {
                nutrition.confidence = result.nutrition.confidence;
            }
            if (result.nutrition.aiAnalysis) {
                nutrition.aiAnalysis = result.nutrition.aiAnalysis;
            }

            console.log('✅ Converted to standard format:', nutrition);
            return nutrition;
        }

        // Fallback to existing logic for other formats
        if (result.nutrition && typeof result.nutrition === 'object') {
            const nutritionKeys = Object.keys(result.nutrition);
            console.log('🔍 Nutrition keys found:', nutritionKeys);

            if (nutritionKeys.length > 0) {
                const hasNutrientData = nutritionKeys.some(key =>
                    result.nutrition[key] &&
                    typeof result.nutrition[key] === 'object' &&
                    'value' in result.nutrition[key]
                );

                if (hasNutrientData) {
                    nutrition = result.nutrition;
                    console.log('✅ Found nutrition at result.nutrition with data');
                } else {
                    console.log('⚠️ result.nutrition exists but appears empty or malformed');
                }
            }
        }

        // Try recursive search if still not found
        if (!nutrition) {
            nutrition = findNutritionObjectRecursively(result);
            if (nutrition) {
                console.log('✅ Found nutrition through recursive search');
            }
        }

        // Create mock data for debugging if nothing found
        if (!nutrition) {
            console.error('❌ Could not find nutrition data in response, creating mock data for debugging');
            nutrition = {
                calories: { value: 350, unit: 'kcal', name: 'Energy' },
                protein: { value: 25, unit: 'g', name: 'Protein' },
                fat: { value: 15, unit: 'g', name: 'Total Fat' },
                carbs: { value: 30, unit: 'g', name: 'Total Carbohydrate' },
                fiber: { value: 5, unit: 'g', name: 'Dietary Fiber' },
                sodium: { value: 600, unit: 'mg', name: 'Sodium' },
                calculationMethod: 'mock_data_for_debugging',
                confidence: 0.5
            };
            console.log('🧪 Using mock nutrition data:', nutrition);
        }

        console.log('📊 Final nutrition object:', nutrition);
        return nutrition;
    };

    // UPDATED: convertRawNutritionToStandardFormat function for NutritionDashboard.js
    const convertRawNutritionToStandardFormat = (rawNutrition) => {
        const standardNutrition = {};

        console.log('🔍 Raw nutrition keys:', Object.keys(rawNutrition));

        // UPDATED: Mapping from Modal response field names to your standard field names
        // Handle both old format (total_fat) and new format (total_fat_g, protein_g, etc.)
        const fieldMapping = {
            // Energy
            calories: { key: 'calories', unit: 'kcal', name: 'Energy' },

            // Macronutrients - handle both formats
            total_fat: { key: 'fat', unit: 'g', name: 'Total Fat' },
            total_fat_g: { key: 'fat', unit: 'g', name: 'Total Fat' },
            saturated_fat: { key: 'saturatedFat', unit: 'g', name: 'Saturated Fat' },
            saturated_fat_g: { key: 'saturatedFat', unit: 'g', name: 'Saturated Fat' },
            trans_fat: { key: 'transFat', unit: 'g', name: 'Trans Fat' },
            trans_fat_g: { key: 'transFat', unit: 'g', name: 'Trans Fat' },

            // Protein
            protein: { key: 'protein', unit: 'g', name: 'Protein' },
            protein_g: { key: 'protein', unit: 'g', name: 'Protein' },

            // Carbohydrates
            total_carbohydrates: { key: 'carbs', unit: 'g', name: 'Total Carbohydrate' },
            carbohydrates: { key: 'carbs', unit: 'g', name: 'Total Carbohydrate' },
            carbohydrates_g: { key: 'carbs', unit: 'g', name: 'Total Carbohydrate' },
            dietary_fiber: { key: 'fiber', unit: 'g', name: 'Dietary Fiber' },
            fiber: { key: 'fiber', unit: 'g', name: 'Dietary Fiber' },
            fiber_g: { key: 'fiber', unit: 'g', name: 'Dietary Fiber' },
            sugars: { key: 'sugars', unit: 'g', name: 'Total Sugars' },
            sugars_g: { key: 'sugars', unit: 'g', name: 'Total Sugars' },

            // Minerals - handle mg suffix
            cholesterol: { key: 'cholesterol', unit: 'mg', name: 'Cholesterol' },
            cholesterol_mg: { key: 'cholesterol', unit: 'mg', name: 'Cholesterol' },
            sodium: { key: 'sodium', unit: 'mg', name: 'Sodium' },
            sodium_mg: { key: 'sodium', unit: 'mg', name: 'Sodium' },
            calcium: { key: 'calcium', unit: 'mg', name: 'Calcium' },
            calcium_mg: { key: 'calcium', unit: 'mg', name: 'Calcium' },
            iron: { key: 'iron', unit: 'mg', name: 'Iron' },
            iron_mg: { key: 'iron', unit: 'mg', name: 'Iron' },
            magnesium: { key: 'magnesium', unit: 'mg', name: 'Magnesium' },
            magnesium_mg: { key: 'magnesium', unit: 'mg', name: 'Magnesium' },
            potassium: { key: 'potassium', unit: 'mg', name: 'Potassium' },
            potassium_mg: { key: 'potassium', unit: 'mg', name: 'Potassium' },
            zinc: { key: 'zinc', unit: 'mg', name: 'Zinc' },
            zinc_mg: { key: 'zinc', unit: 'mg', name: 'Zinc' },

            // Vitamins - handle different units and suffixes
            vitamin_a: { key: 'vitaminA', unit: 'µg', name: 'Vitamin A (RAE)' },
            vitamin_a_iu: { key: 'vitaminA', unit: 'IU', name: 'Vitamin A' }, // IU format
            vitamin_a_mcg: { key: 'vitaminA', unit: 'µg', name: 'Vitamin A (RAE)' },
            vitamin_c: { key: 'vitaminC', unit: 'mg', name: 'Vitamin C' },
            vitamin_c_mg: { key: 'vitaminC', unit: 'mg', name: 'Vitamin C' },
            vitamin_d: { key: 'vitaminD', unit: 'µg', name: 'Vitamin D' },
            vitamin_d_mcg: { key: 'vitaminD', unit: 'µg', name: 'Vitamin D' },
            vitamin_e: { key: 'vitaminE', unit: 'mg', name: 'Vitamin E' },
            vitamin_e_mg: { key: 'vitaminE', unit: 'mg', name: 'Vitamin E' },
            vitamin_k: { key: 'vitaminK', unit: 'µg', name: 'Vitamin K' },
            vitamin_k_mcg: { key: 'vitaminK', unit: 'µg', name: 'Vitamin K' },

            // B Vitamins
            thiamin: { key: 'thiamin', unit: 'mg', name: 'Thiamin (B1)' },
            thiamin_mg: { key: 'thiamin', unit: 'mg', name: 'Thiamin (B1)' },
            riboflavin: { key: 'riboflavin', unit: 'mg', name: 'Riboflavin (B2)' },
            riboflavin_mg: { key: 'riboflavin', unit: 'mg', name: 'Riboflavin (B2)' },
            niacin: { key: 'niacin', unit: 'mg', name: 'Niacin (B3)' },
            niacin_mg: { key: 'niacin', unit: 'mg', name: 'Niacin (B3)' },
            vitamin_b6: { key: 'vitaminB6', unit: 'mg', name: 'Vitamin B6' },
            vitamin_b6_mg: { key: 'vitaminB6', unit: 'mg', name: 'Vitamin B6' },
            folate: { key: 'folate', unit: 'µg', name: 'Folate (B9)' },
            folate_mcg: { key: 'folate', unit: 'µg', name: 'Folate (B9)' },
            vitamin_b12: { key: 'vitaminB12', unit: 'µg', name: 'Vitamin B12' },
            vitamin_b12_mcg: { key: 'vitaminB12', unit: 'µg', name: 'Vitamin B12' }
        };

        // Convert each field
        let convertedCount = 0;
        Object.entries(fieldMapping).forEach(([modalField, config]) => {
            if (rawNutrition[modalField] !== undefined && rawNutrition[modalField] !== null) {
                standardNutrition[config.key] = {
                    value: Number(rawNutrition[modalField]),
                    unit: config.unit,
                    name: config.name
                };
                convertedCount++;
                console.log(`✅ Converted ${modalField} (${rawNutrition[modalField]}) -> ${config.key}`);
            }
        });

        console.log(`🔄 Converted ${convertedCount} fields from raw nutrition`);
        console.log('🔄 Raw nutrition fields found:', Object.keys(rawNutrition));
        console.log('🔄 Converted standard nutrition fields:', Object.keys(standardNutrition));

        // If no fields were converted, try a more flexible approach
        if (convertedCount === 0) {
            console.log('⚠️ No fields matched standard mapping, trying flexible conversion...');

            // Try to map fields dynamically based on patterns
            Object.keys(rawNutrition).forEach(key => {
                const value = rawNutrition[key];
                if (typeof value === 'number' && value > 0) {

                    if (key.includes('protein')) {
                        standardNutrition.protein = { value, unit: 'g', name: 'Protein' };
                    } else if (key.includes('fat') && !key.includes('saturated') && !key.includes('trans')) {
                        standardNutrition.fat = { value, unit: 'g', name: 'Total Fat' };
                    } else if (key.includes('saturated')) {
                        standardNutrition.saturatedFat = { value, unit: 'g', name: 'Saturated Fat' };
                    } else if (key.includes('carb')) {
                        standardNutrition.carbs = { value, unit: 'g', name: 'Total Carbohydrate' };
                    } else if (key.includes('fiber')) {
                        standardNutrition.fiber = { value, unit: 'g', name: 'Dietary Fiber' };
                    } else if (key.includes('sugar')) {
                        standardNutrition.sugars = { value, unit: 'g', name: 'Total Sugars' };
                    } else if (key.includes('sodium')) {
                        standardNutrition.sodium = { value, unit: 'mg', name: 'Sodium' };
                    } else if (key.includes('calcium')) {
                        standardNutrition.calcium = { value, unit: 'mg', name: 'Calcium' };
                    } else if (key.includes('iron')) {
                        standardNutrition.iron = { value, unit: 'mg', name: 'Iron' };
                    } else if (key.includes('vitamin_c')) {
                        standardNutrition.vitaminC = { value, unit: 'mg', name: 'Vitamin C' };
                    } else if (key.includes('vitamin_a')) {
                        const unit = key.includes('iu') ? 'IU' : 'µg';
                        standardNutrition.vitaminA = { value, unit, name: 'Vitamin A' };
                    } else if (key.includes('cholesterol')) {
                        standardNutrition.cholesterol = { value, unit: 'mg', name: 'Cholesterol' };
                    }

                    console.log(`🔄 Flexible mapping: ${key} -> ${value}`);
                }
            });

            console.log(`🔄 Flexible conversion created ${Object.keys(standardNutrition).length} fields`);
        }

        return standardNutrition;
    };

    // ENHANCED: Show nutrition data using modal or alert
    const displayNutritionResults = async (nutrition, analyzedItem, result) => {
        console.log('🎨 Displaying nutrition results for:', analyzedItem);

        // Check if we have enough data for the modal
        const hasRichData = nutrition && (
            nutrition.calories?.value ||
            nutrition.protein?.value ||
            nutrition.fat?.value
        );

        if (hasRichData && onShowNutritionModal) {
            // Use the fancy NutritionModal via props
            onShowNutritionModal(nutrition, analyzedItem || 'Voice Analysis Result');
            console.log('✅ Showing nutrition modal with data:', nutrition);
        } else {
            // Fallback to alert for incomplete data or if no modal handler
            const message = formatNutritionForAlert(nutrition, analyzedItem, result);
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showAlert({
                title: 'Nutrition Information',
                message: message
            });
            console.log('⚠️ Using alert fallback due to incomplete data or missing modal handler');
        }
    };

    // ENHANCED: Format nutrition for alert (fallback)
    const formatNutritionForAlert = (nutrition, analyzedItem, result) => {
        if (!nutrition) {
            return '❌ No nutrition data available';
        }

        let message = '';

        // Add header based on analysis method
        const method = result.method || 'unknown';
        if (method.includes('recipe')) {
            message = `🤖 Recipe Analysis: "${analyzedItem}"\n\n`;
        } else if (method.includes('ingredient')) {
            message = `🤖 Ingredient Analysis: "${analyzedItem}"\n\n`;
        } else {
            message = `🔬 Nutrition Analysis: "${analyzedItem}"\n\n`;
        }

        // Count successful extractions
        let nutritionCount = 0;

        // Define the nutrition fields we want to display
        const nutritionMap = {
            calories: { label: 'Calories', unit: 'kcal', decimals: 0 },
            protein: { label: 'Protein', unit: 'g', decimals: 1 },
            carbs: { label: 'Carbs', unit: 'g', decimals: 1 },
            fat: { label: 'Fat', unit: 'g', decimals: 1 },
            fiber: { label: 'Fiber', unit: 'g', decimals: 1 },
            sodium: { label: 'Sodium', unit: 'mg', decimals: 0 },
            saturatedFat: { label: 'Saturated Fat', unit: 'g', decimals: 1 },
            sugars: { label: 'Sugars', unit: 'g', decimals: 1 },
            cholesterol: { label: 'Cholesterol', unit: 'mg', decimals: 0 },
            transFat: { label: 'Trans Fat', unit: 'g', decimals: 1 }
        };

        // Display nutrition values
        Object.entries(nutritionMap).forEach(([key, config]) => {
            const nutrientData = nutrition[key];

            if (nutrientData && typeof nutrientData === 'object' && typeof nutrientData.value === 'number' && nutrientData.value > 0) {
                const value = config.decimals === 0 ?
                    Math.round(nutrientData.value) :
                    nutrientData.value.toFixed(config.decimals);
                message += `${config.label}: ${value} ${config.unit}\n`;
                nutritionCount++;
            }
        });

        // Add metadata
        const confidence = result.confidence || nutrition.confidence || 0.8;
        message += `\n📊 Method: ${getAnalysisMethodDescription(result.method || 'ai_analysis')}`;
        message += `\nConfidence: ${Math.round(confidence * 100)}%`;

        // Add any warnings
        if (result.warning) {
            message += `\n⚠️ ${result.warning}`;
        }

        if (nutritionCount === 0) {
            message += `\n\n[DEBUG] No standard nutrition found. Raw data keys: ${Object.keys(nutrition).join(', ')}`;
        }

        return message;
    };

    // Helper to recursively search for nutrition-like objects
    const findNutritionObjectRecursively = (obj, path = '') => {
        if (!obj || typeof obj !== 'object') return null;

        // Check if current object looks like nutrition data
        if (obj.calories || obj.protein || obj.carbs || obj.fat) {
            console.log(`🎯 Found nutrition-like data at: ${path}`);
            return obj;
        }

        // Recursively search nested objects
        for (const [key, value] of Object.entries(obj)) {
            const found = findNutritionObjectRecursively(value, path ? `${path}.${key}` : key);
            if (found) return found;
        }

        return null;
    };

    // Helper functions
    const getAnalysisMethodDescription = (method) => {
        switch (method) {
            case 'perfect_inventory_match':
                return 'Exact inventory match';
            case 'ai_recipe_analysis':
                return 'AI analyzed this as a recipe/dish';
            case 'ai_ingredient_analysis':
                return 'AI analyzed this as an ingredient';
            case 'ai_inventory_item_analysis':
                return 'AI analyzed inventory item';
            case 'basic_estimation':
                return 'Basic estimate (AI unavailable)';
            default:
                return 'AI analysis';
        }
    };

    // Helper to generate mock estimates when Modal fails
    const generateBasicEstimate = (itemName, type) => {
        console.log('📊 Generating basic estimate for:', itemName, 'type:', type);

        const estimates = {
            recipe: { calories: 350, protein: 20, fat: 15, carbs: 35, fiber: 5, sodium: 600 },
            ingredient: { calories: 100, protein: 5, fat: 2, carbs: 15, fiber: 2, sodium: 50 }
        };

        const baseNutrition = estimates[type] || estimates.ingredient;

        return {
            nutrition: {
                calories: { value: baseNutrition.calories, unit: 'kcal', name: 'Energy' },
                protein: { value: baseNutrition.protein, unit: 'g', name: 'Protein' },
                fat: { value: baseNutrition.fat, unit: 'g', name: 'Total Fat' },
                carbs: { value: baseNutrition.carbs, unit: 'g', name: 'Total Carbohydrate' },
                fiber: { value: baseNutrition.fiber, unit: 'g', name: 'Dietary Fiber' },
                sodium: { value: baseNutrition.sodium, unit: 'mg', name: 'Sodium' },
                calculationMethod: 'estimated',
                confidence: 0.5
            },
            method: 'basic_estimation',
            confidence: 0.5,
            analyzedItem: itemName,
            warning: 'Modal AI service unavailable - basic estimate provided'
        };
    };

    // Quick Action Helper Functions
    const generateSmartShoppingList = useCallback(async () => {
        try {
            if (!dashboardData?.inventory?.length) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showAlert({
                    title: 'No Inventory',
                    message: '❌ No inventory items found. Add items to your inventory first.'
                });
                return;
            }

            setRefreshing(true);

            // Use the real smart inventory API
            const result = await performSmartInventoryAction('generate_shopping_list', {
                preferences: session?.user?.preferences || {},
                budget: null // Could be added as a user setting later
            });

            if (result.success) {
                let message = '🛒 Smart Shopping List Generated!\n\n';

                if (result.shoppingList?.length > 0) {
                    message += `📝 Items suggested: ${result.shoppingList.length}\n`;

                    if (result.estimatedCost) {
                        message += `💰 Estimated cost: ${result.estimatedCost}\n`;
                    }

                    message += '\n🏪 View full list in Shopping section?';

                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    const confirmed = await NativeDialog.showConfirm({
                        title: 'Navigate',
                        message: message,
                        confirmText: 'Go',
                        cancelText: 'Cancel'
                    });
                    if (confirmed) {
                        window.location.href = '/shopping/saved';
                    }
                } else {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showSuccess({
                        title: 'Inventory Status',
                        message: '✅ Your inventory looks well-stocked! No urgent shopping needed.'
                    });
                }
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Generation Failed',
                    message: result.error || 'Shopping list generation failed'
                });
                return;
            }
        } catch (error) {
            console.error('Error generating smart shopping list:', error);

            // Fallback to basic analysis
            const expiringItems = dashboardData.inventory.filter(item => {
                if (!item.expirationDate) return false;
                const expDate = new Date(item.expirationDate);
                const daysLeft = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
                return daysLeft <= 7 && daysLeft >= 0;
            });

            const lowStockItems = dashboardData.inventory.filter(item =>
                item.quantity <= 1 || (item.quantity <= 2 && item.unit === 'item')
            );

            let message = '🛒 Basic Shopping Recommendations:\n\n';

            if (expiringItems.length > 0) {
                message += `⚠️ USE FIRST - ${expiringItems.length} items expiring soon\n`;
            }

            if (lowStockItems.length > 0) {
                message += `📉 LOW STOCK - Consider restocking:\n`;
                message += lowStockItems.slice(0, 5).map(item => `• ${item.name}`).join('\n');
                message += '\n\n';
            }

            message += 'Navigate to shopping section?';

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            const confirmed = await NativeDialog.showConfirm({
                title: 'Navigate',
                message: message,
                confirmText: 'Go',
                cancelText: 'Cancel'
            });
            if (confirmed) {
                window.location.href = '/shopping';
            }
        } finally {
            setRefreshing(false);
        }
    }, [dashboardData, performSmartInventoryAction, session]);

    const navigateToMealPlanning = useCallback(async () => {
        if (!dashboardData?.inventory?.length) {
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            const confirmed = await NativeDialog.showConfirm({
                title: 'No Inventory Items',
                message: '❌ No inventory items found.\n\nWould you like to add some items first, or go to meal planning anyway?',
                confirmText: 'Meal Planning',
                cancelText: 'Add Items'
            });
            if (confirmed) {
                window.location.href = '/meal-planning';
            } else {
                window.location.href = '/inventory?action=add';
            }
            return;
        }

        // Show meal planning preview
        const availableIngredients = dashboardData.inventory.length;
        const nutritionCoverage = Math.round((dashboardData.inventory.filter(item => item.nutrition).length / dashboardData.inventory.length) * 100);

        const message = `🍽️ Meal Planning Ready!\n\n` +
            `📦 Available ingredients: ${availableIngredients}\n` +
            `📊 Nutrition data: ${nutritionCoverage}% coverage\n` +
            `🤖 AI will suggest meals based on your inventory\n\n` +
            `Ready to create your meal plan?`;

        const { NativeDialog } = await import('@/components/mobile/NativeDialog');
        const confirmed = await NativeDialog.showConfirm({
            title: 'Navigate to Meal Planning',
            message: message,
            confirmText: 'Go',
            cancelText: 'Cancel'
        });
        if (confirmed) {
            window.location.href = '/meal-planning';
        }
    }, [dashboardData]);

    const analyzeInventoryNutrition = useCallback(async () => {
        if (!dashboardData?.inventory?.length) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showAlert({
                title: 'No Inventory',
                message: '❌ No inventory items found. Add items to your inventory first.'
            });
            return;
        }

        try {
            setRefreshing(true);

            // Get items that don't have nutrition data yet
            const itemsToAnalyze = dashboardData.inventory.filter(item => !item.nutrition);
            const itemsWithNutrition = dashboardData.inventory.filter(item => item.nutrition);

            if (itemsToAnalyze.length === 0) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showSuccess({
                    title: 'Analysis Complete',
                    message: '✅ All items already have nutrition data!'
                });
                return;
            }

            const results = [];
            let successCount = 0;
            let errorCount = 0;

            // Add existing nutrition data to results
            itemsWithNutrition.forEach(item => {
                results.push({
                    item,
                    nutrition: item.nutrition,
                    fromCache: true
                });
            });

            // Analyze items without nutrition data (limit to 10 for performance)
            const itemsToProcess = itemsToAnalyze.slice(0, 10);

            for (const item of itemsToProcess) {
                try {
                    console.log(`Analyzing nutrition for: ${item.name}`);

                    // Fixed: Pass the correct data structure to the API
                    const result = await analyzeNutrition('inventory_item', {
                        itemId: item._id,
                        name: item.name,
                        brand: item.brand || '',
                        category: item.category || '',
                        quantity: item.quantity || 1,
                        unit: item.unit || 'item'
                    });

                    if (result.success) {
                        results.push({
                            item: {
                                ...item,
                                nutrition: result.nutrition
                            },
                            nutrition: result.nutrition,
                            fromCache: false
                        });
                        successCount++;
                    } else {
                        console.error(`Failed to analyze ${item.name}:`, result.error);
                        results.push({
                            item,
                            nutrition: null,
                            error: result.error,
                            fromCache: false
                        });
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`Error analyzing ${item.name}:`, error);
                    results.push({
                        item,
                        nutrition: null,
                        error: error.message,
                        fromCache: false
                    });
                    errorCount++;
                }
            }

            // Update dashboard with new nutrition data
            const updatedInventory = dashboardData.inventory.map(item => {
                const result = results.find(r => r.item._id === item._id);
                if (result && result.nutrition) {
                    return {
                        ...item,
                        nutrition: result.nutrition
                    };
                }
                return item;
            });

            setDashboardData(prev => ({
                ...prev,
                inventory: updatedInventory,
                nutritionAnalyses: results,
                lastAnalyzed: new Date()
            }));

            // Show results summary
            let message = '🔬 Nutrition Analysis Complete!\n\n';
            message += `✅ Successfully analyzed: ${successCount} items\n`;
            message += `📊 Already had data: ${itemsWithNutrition.length} items\n`;

            if (errorCount > 0) {
                message += `❌ Failed to analyze: ${errorCount} items\n`;
            }

            if (itemsToAnalyze.length > 10) {
                message += `\n⏳ Remaining items will be analyzed in future runs`;
            }

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showAlert({
                title: 'Analysis Result',
                message: message
            });

        } catch (error) {
            console.error('Error in batch nutrition analysis:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Analysis Error',
                message: `❌ Error analyzing nutrition: ${error.message}`
            });
        } finally {
            setRefreshing(false);
        }
    }, [dashboardData, analyzeNutrition]);

    if (!session) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="text-center py-12">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        🔐 Sign In Required
                    </h2>
                    <p className="text-gray-600">
                        Please sign in to access your nutrition dashboard.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            🍎 Nutrition Intelligence Dashboard
                        </h1>
                        <p className="text-gray-600">
                            AI-powered nutrition insights from your inventory to meal planning
                        </p>
                    </div>

                    <button
                        onClick={loadDashboardData}
                        disabled={refreshing}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <span className="text-red-600 mr-2">⚠️</span>
                            <span className="text-red-700 font-medium">Error:</span>
                            <span className="text-red-600 ml-2">{error}</span>
                        </div>
                        <button
                            onClick={clearError}
                            className="text-red-600 hover:text-red-700"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Tab Navigation - Mobile Dropdown or Desktop Tabs */}
            <div className="mb-6">
                {/* Mobile Dropdown */}
                <div className="sm:hidden">
                    <select
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="overview">📊 Overview</option>
                        <option value="inventory">🥫 Inventory Nutrition</option>
                        <option value="recipes">🍳 Recipe Suggestions</option>
                        <option value="optimization">⚡ Smart Optimization</option>
                        <option value="goals">🎯 Nutrition Goals</option>
                    </select>
                </div>

                {/* Desktop Tabs */}
                <div className="hidden sm:flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    {[
                        {id: 'overview', label: 'Overview', icon: '📊'},
                        {id: 'inventory', label: 'Inventory', icon: '🥫'},
                        {id: 'recipes', label: 'Recipes', icon: '🍳'},
                        {id: 'optimization', label: 'Optimize', icon: '⚡'},
                        {id: 'goals', label: 'Goals', icon: '🎯'}
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === 'overview' && (
                    <NutritionOverview
                        data={dashboardData}
                        loading={loading || refreshing}
                        onAnalyze={analyzeInventoryNutrition}
                        setActiveTab={setActiveTab}
                        generateSmartShoppingList={generateSmartShoppingList}
                        navigateToMealPlanning={navigateToMealPlanning}
                        setShowVoiceNutrition={setShowVoiceNutrition}
                    />
                )}

                {activeTab === 'inventory' && (
                    <InventoryNutritionView
                        data={dashboardData}
                        loading={loading}
                        onAnalyze={analyzeInventoryNutrition}
                    />
                )}

                {activeTab === 'recipes' && (
                    <SmartRecipeSuggestions
                        data={dashboardData}
                        loading={loading}
                        onRefresh={loadDashboardData}
                    />
                )}

                {activeTab === 'optimization' && (
                    <InventoryOptimization
                        data={dashboardData}
                        loading={loading}
                        performAction={performSmartInventoryAction}
                    />
                )}

                {activeTab === 'goals' && (
                    <NutritionGoalsTracking
                        data={dashboardData}
                        loading={loading}
                        onGoalsUpdate={loadDashboardData}
                    />
                )}
            </div>

            {/* Voice Nutrition Modal */}
            {showVoiceNutrition && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">🎤 Voice Nutrition Analysis</h3>
                            <button
                                onClick={() => setShowVoiceNutrition(false)}
                                disabled={processingVoiceNutrition}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mb-4">
                            <VoiceInput
                                onResult={handleVoiceNutrition}
                                onError={async (error) => {
                                    console.error('Voice nutrition error:', error);
                                    const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                                    await NativeDialog.showError({
                                        title: 'Voice Input Failed',
                                        message: '🎤 Voice input failed. Please try again.'
                                    });
                                    setProcessingVoiceNutrition(false);
                                }}
                                placeholder="Ask about nutrition for any item..."
                            />
                        </div>

                        {processingVoiceNutrition && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                                <div className="text-blue-800 font-medium">
                                    🤖 Analyzing nutrition data...
                                </div>
                            </div>
                        )}

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm text-blue-800 mb-2">
                                💡 <strong>Voice Nutrition Examples:</strong>
                            </p>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• "Analyze nutrition for ground beef"</li>
                                <li>• "What's the protein in chicken breast"</li>
                                <li>• "Get nutrition for bananas"</li>
                                <li>• "Show me recipe suggestions"</li>
                                <li>• "Run optimization analysis"</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// =============================================================================
// DASHBOARD SUB-COMPONENTS
// =============================================================================

function NutritionOverview({data, loading, onAnalyze, setActiveTab, generateSmartShoppingList, navigateToMealPlanning, setShowVoiceNutrition}) {
    if (loading && !data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    const stats = [
        {
            title: 'Inventory Items',
            value: data?.inventory?.length || 0,
            subtitle: 'Total items tracked',
            icon: '📦',
            color: 'bg-blue-100 text-blue-600'
        },
        {
            title: 'Items with Nutrition',
            value: data?.inventory?.filter(item => item.nutrition)?.length || 0,
            subtitle: `${data?.inventory?.length ? Math.round((data.inventory.filter(item => item.nutrition).length / data.inventory.length) * 100) : 0}% coverage`,
            icon: '📊',
            color: 'bg-green-100 text-green-600'
        },
        {
            title: 'Recipe Suggestions',
            value: data?.smartInsights?.length || 0,
            subtitle: 'AI-generated recipes',
            icon: '🍳',
            color: 'bg-purple-100 text-purple-600'
        },
        {
            title: 'Inventory Utilization',
            value: `${Math.round((data?.inventoryUtilization?.utilizationPercentage || 0))}%`,
            subtitle: 'Efficient ingredient use',
            icon: '⚡',
            color: 'bg-yellow-100 text-yellow-600'
        },
        {
            title: 'Expiring Soon',
            value: data?.inventory?.filter(item => {
                if (!item.expirationDate) return false;
                const expDate = new Date(item.expirationDate);
                const daysLeft = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
                return daysLeft <= 7 && daysLeft >= 0;
            })?.length || 0,
            subtitle: 'Items to use first',
            icon: '⏰',
            color: 'bg-red-100 text-red-600'
        },
        {
            title: 'Nutrition Score',
            value: calculateOverallNutritionScore(data),
            subtitle: 'Based on variety & quality',
            icon: '🎯',
            color: 'bg-indigo-100 text-indigo-600'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.map((stat, index) => (
                    <div key={index}
                         className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-900">{stat.title}</h3>
                            <span
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${stat.color}`}>
                                {stat.icon}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                        <div className="text-sm text-gray-600">{stat.subtitle}</div>
                    </div>
                ))}
            </div>

            {/* Enhanced Quick Actions - Fixed */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <button
                        onClick={onAnalyze}
                        disabled={loading || !data?.inventory?.length}
                        className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">🔬</div>
                        <div className="font-medium">Analyze Nutrition</div>
                        <div className="text-xs opacity-90">AI-powered analysis</div>
                    </button>

                    <button
                        onClick={() => setActiveTab('recipes')}
                        className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">🍳</div>
                        <div className="font-medium">Recipe Ideas</div>
                        <div className="text-xs opacity-90">From your inventory</div>
                    </button>

                    <button
                        onClick={generateSmartShoppingList}
                        disabled={!data?.inventory?.length}
                        className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">🛒</div>
                        <div className="font-medium">Smart Shopping</div>
                        <div className="text-xs opacity-90">Optimized lists</div>
                    </button>

                    <button
                        onClick={navigateToMealPlanning}
                        className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">📋</div>
                        <div className="font-medium">Meal Planning</div>
                        <div className="text-xs opacity-90">AI suggestions</div>
                    </button>

                    <button
                        onClick={() => setShowVoiceNutrition(true)}
                        className="bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">🎤</div>
                        <div className="font-medium">Voice Nutrition</div>
                        <div className="text-xs opacity-90">Ask about items</div>
                    </button>
                </div>
            </div>

            {/* Recent Insights */}
            {data?.smartInsights?.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Smart Insights</h3>
                    <div className="space-y-3">
                        {data.smartInsights.slice(0, 3).map((insight, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <span className="text-2xl">🤖</span>
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{insight.name}</h4>
                                    <p className="text-sm text-gray-600">{insight.description}</p>
                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                        <span>⏱️ {insight.cookingTime} min</span>
                                        <span>👥 {insight.servings} servings</span>
                                        <span>📊 {Math.round(insight.inventoryUsage * 100)}% inventory use</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function InventoryNutritionView({data, loading, onAnalyze}) {
    const [selectedItems, setSelectedItems] = useState([]);
    const [analysisResults, setAnalysisResults] = useState({});

    const itemsWithNutrition = data?.inventory?.filter(item => item.nutrition) || [];
    const itemsWithoutNutrition = data?.inventory?.filter(item => !item.nutrition) || [];

    return (
        <div className="space-y-6">
            {/* Nutrition Coverage Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Nutrition Coverage</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{itemsWithNutrition.length}</div>
                        <div className="text-sm text-gray-600">Items with nutrition data</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{itemsWithoutNutrition.length}</div>
                        <div className="text-sm text-gray-600">Items needing analysis</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {data?.inventory?.length ? Math.round((itemsWithNutrition.length / data.inventory.length) * 100) : 0}%
                        </div>
                        <div className="text-sm text-gray-600">Coverage percentage</div>
                    </div>
                </div>

                {itemsWithoutNutrition.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-medium text-blue-900">🤖 AI Analysis Available</h4>
                                <p className="text-sm text-blue-700">
                                    {itemsWithoutNutrition.length} items can be analyzed with AI for complete nutrition
                                    data.
                                </p>
                            </div>
                            <button
                                onClick={onAnalyze}
                                disabled={loading}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? '🔬 Analyzing...' : '🔬 Analyze All'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Items with Nutrition */}
            {itemsWithNutrition.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">✅ Items with Nutrition Data</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {itemsWithNutrition.map((item, index) => (
                            <div key={index}
                                 className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                        📊 Complete
                                    </span>
                                </div>

                                {item.brand && (
                                    <p className="text-xs text-gray-500 mb-2">{item.brand}</p>
                                )}

                                <div className="space-y-1 text-sm">
                                    {item.nutrition.calories && (
                                        <div className="flex justify-between">
                                            <span>Calories:</span>
                                            <span
                                                className="font-medium">{Math.round(item.nutrition.calories.value)} kcal</span>
                                        </div>
                                    )}
                                    {item.nutrition.protein && (
                                        <div className="flex justify-between">
                                            <span>Protein:</span>
                                            <span
                                                className="font-medium">{item.nutrition.protein.value?.toFixed(1)}g</span>
                                        </div>
                                    )}
                                    {item.nutrition.carbs && (
                                        <div className="flex justify-between">
                                            <span>Carbs:</span>
                                            <span
                                                className="font-medium">{item.nutrition.carbs.value?.toFixed(1)}g</span>
                                        </div>
                                    )}
                                    {item.nutrition.fat && (
                                        <div className="flex justify-between">
                                            <span>Fat:</span>
                                            <span className="font-medium">{item.nutrition.fat.value?.toFixed(1)}g</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                        <span>
                                            {item.nutrition.calculationMethod === 'ai_calculated' ? '🤖 AI' :
                                                item.nutrition.calculationMethod === 'usda_lookup' ? '🗃️ USDA' :
                                                    '📋 Manual'}
                                        </span>
                                        {item.nutrition.confidence && (
                                            <span>{Math.round(item.nutrition.confidence * 100)}% confidence</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Items without Nutrition */}
            {itemsWithoutNutrition.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">⏳ Items Awaiting Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {itemsWithoutNutrition.map((item, index) => (
                            <div key={index}
                                 className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                        ⏳ Pending
                                    </span>
                                </div>

                                {item.brand && (
                                    <p className="text-xs text-gray-500 mb-2">{item.brand}</p>
                                )}

                                <p className="text-xs text-gray-600 mb-3">
                                    Category: {item.category || 'Unknown'}
                                </p>

                                <p className="text-xs text-gray-600">
                                    {item.quantity} {item.unit}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function SmartRecipeSuggestions({data, loading, onRefresh}) {
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [showDetails, setShowDetails] = useState({});

    const suggestions = data?.smartInsights || [];

    const toggleDetails = (index) => {
        setShowDetails(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">🤖 AI Recipe Suggestions</h3>
                        <p className="text-sm text-gray-600">
                            Smart recipes based on your current inventory
                        </p>
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? '🔄 Refreshing...' : '🔄 New Suggestions'}
                    </button>
                </div>
            </div>

            {/* Suggestions Grid */}
            {suggestions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {suggestions.map((suggestion, index) => (
                        <div key={index}
                             className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            {/* Recipe Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 mb-1">{suggestion.name}</h4>
                                    <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>

                                    {/* Quick Stats */}
                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                        <span>⏱️ {suggestion.cookingTime} min</span>
                                        <span>👥 {suggestion.servings} servings</span>
                                        <span>📊 {suggestion.difficulty}</span>
                                        {suggestion.inventoryUsage && (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                                {Math.round(suggestion.inventoryUsage * 100)}% inventory
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="ml-4">
                                    {suggestion.expirationPriority === 'high' && (
                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                            ⚡ Use Soon
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Available Ingredients */}
                            {suggestion.ingredients && (
                                <div className="mb-4">
                                    <h5 className="text-sm font-medium text-gray-900 mb-2">✅ Available Ingredients:</h5>
                                    <div className="flex flex-wrap gap-1">
                                        {suggestion.ingredients
                                            .filter(ing => ing.inInventory)
                                            .slice(0, 6)
                                            .map((ingredient, idx) => (
                                                <span key={idx}
                                                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                {ingredient.item}
                                            </span>
                                            ))}
                                        {suggestion.ingredients.filter(ing => ing.inInventory).length > 6 && (
                                            <span className="text-xs text-gray-500">
                                                +{suggestion.ingredients.filter(ing => ing.inInventory).length - 6} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Missing Ingredients */}
                            {suggestion.missingIngredients?.length > 0 && (
                                <div className="mb-4">
                                    <h5 className="text-sm font-medium text-gray-900 mb-2">🛒 Need to Buy:</h5>
                                    <div className="flex flex-wrap gap-1">
                                        {suggestion.missingIngredients.slice(0, 4).map((ingredient, idx) => (
                                            <span key={idx}
                                                  className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                                {ingredient.item}
                                            </span>
                                        ))}
                                        {suggestion.missingIngredients.length > 4 && (
                                            <span className="text-xs text-gray-500">
                                                +{suggestion.missingIngredients.length - 4} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Nutrition Highlights */}
                            {suggestion.nutritionHighlights && (
                                <div className="mb-4">
                                    <h5 className="text-sm font-medium text-gray-900 mb-2">🥗 Nutrition:</h5>
                                    <div className="flex flex-wrap gap-1">
                                        {suggestion.nutritionHighlights.map((highlight, idx) => (
                                            <span key={idx}
                                                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                {highlight}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => toggleDetails(index)}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    {showDetails[index] ? '▲ Hide Details' : '▼ Show Details'}
                                </button>

                                <div className="space-x-2">
                                    <button
                                        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors">
                                        📋 Add to Meal Plan
                                    </button>
                                    <button
                                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                                        💾 Save Recipe
                                    </button>
                                </div>
                            </div>

                            {/* Detailed View */}
                            {showDetails[index] && (
                                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                    {/* Full Ingredients List */}
                                    {suggestion.ingredients && (
                                        <div>
                                            <h6 className="text-sm font-medium text-gray-900 mb-2">📝 All
                                                Ingredients:</h6>
                                            <div className="space-y-1 text-sm">
                                                {suggestion.ingredients.map((ingredient, idx) => (
                                                    <div key={idx} className="flex justify-between items-center">
                                                        <span
                                                            className={ingredient.inInventory ? 'text-green-700' : 'text-gray-600'}>
                                                            {ingredient.item} - {ingredient.amount}
                                                        </span>
                                                        {ingredient.inInventory ? (
                                                            <span className="text-xs text-green-600">✓ Have</span>
                                                        ) : (
                                                            <span className="text-xs text-orange-600">🛒 Buy</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Substitutions */}
                                    {suggestion.substitutions?.length > 0 && (
                                        <div>
                                            <h6 className="text-sm font-medium text-gray-900 mb-2">🔄 Possible
                                                Substitutions:</h6>
                                            <div className="space-y-1 text-sm">
                                                {suggestion.substitutions.map((sub, idx) => (
                                                    <div key={idx}
                                                         className="flex justify-between items-center text-gray-600">
                                                        <span>{sub.original} → {sub.alternatives?.join(', ')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <div className="text-4xl mb-4">🤖</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recipe Suggestions Yet</h3>
                    <p className="text-gray-600 mb-4">
                        Add items to your inventory to get AI-powered recipe suggestions.
                    </p>
                    <button
                        onClick={onRefresh}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        🔄 Generate Suggestions
                    </button>
                </div>
            )}
        </div>
    );
}

function InventoryOptimization({data, loading, performAction}) {
    const [optimizations, setOptimizations] = useState(null);
    const [optimizing, setOptimizing] = useState(false);

    const runOptimization = async () => {
        if (!data?.inventory?.length) return;

        try {
            setOptimizing(true);

            const result = await performAction('optimize_inventory', {
                inventory: data.inventory,
                goals: ['reduce_waste', 'save_money', 'improve_nutrition']
            });

            if (result.success) {
                setOptimizations({
                    optimizations: result.optimizations || [],
                    wasteReduction: result.wasteReduction || {},
                    costSavings: result.costSavings || {},
                    nutritionImprovements: result.nutritionImprovements || {}
                });
            }
        } catch (error) {
            console.error('Optimization failed:', error);
        } finally {
            setOptimizing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">⚡ Smart Optimization</h3>
                        <p className="text-sm text-gray-600">
                            AI-powered suggestions to reduce waste, save money, and improve nutrition
                        </p>
                    </div>
                    <button
                        onClick={runOptimization}
                        disabled={optimizing || !data?.inventory?.length}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        {optimizing ? '🔄 Optimizing...' : '⚡ Run Optimization'}
                    </button>
                </div>
            </div>

            {/* Optimization Results */}
            {optimizations ? (
                <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                            <div className="text-3xl mb-2">🗑️</div>
                            <div className="text-lg font-semibold text-gray-900">Waste Reduction</div>
                            <div className="text-2xl font-bold text-green-600">
                                {optimizations.wasteReduction.potentialSavings || '$0'}
                            </div>
                            <div className="text-sm text-gray-600">
                                {optimizations.wasteReduction.itemsAtRisk || 0} items at risk
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                            <div className="text-3xl mb-2">💰</div>
                            <div className="text-lg font-semibold text-gray-900">Cost Savings</div>
                            <div className="text-2xl font-bold text-blue-600">
                                {optimizations.costSavings.monthlyPotential || '$0'}
                            </div>
                            <div className="text-sm text-gray-600">per month potential</div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                            <div className="text-3xl mb-2">🥗</div>
                            <div className="text-lg font-semibold text-gray-900">Nutrition</div>
                            <div className="text-2xl font-bold text-purple-600">
                                {optimizations.nutritionImprovements.gaps?.length || 0}
                            </div>
                            <div className="text-sm text-gray-600">improvement areas</div>
                        </div>
                    </div>

                    {/* Optimization Actions */}
                    {optimizations.optimizations?.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">🎯 Recommended Actions</h4>
                            <div className="space-y-4">
                                {optimizations.optimizations.map((opt, index) => (
                                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                                        opt.priority === 'high' ? 'border-red-400 bg-red-50' :
                                            opt.priority === 'medium' ? 'border-yellow-400 bg-yellow-50' :
                                                'border-green-400 bg-green-50'
                                    }`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                                                        opt.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                            opt.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-green-100 text-green-700'
                                                    }`}>
                                                        {opt.priority} priority
                                                    </span>
                                                    <span
                                                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                                        {opt.type}
                                                    </span>
                                                </div>
                                                <h5 className="font-medium text-gray-900">{opt.action}</h5>
                                                <p className="text-sm text-gray-600 mt-1">{opt.impact}</p>
                                                {opt.timeframe && (
                                                    <p className="text-xs text-gray-500 mt-1">⏰ {opt.timeframe}</p>
                                                )}
                                            </div>
                                            <button
                                                className="ml-4 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detailed Recommendations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Waste Reduction */}
                        {optimizations.wasteReduction.actions?.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">🗑️ Waste Reduction</h4>
                                <div className="space-y-3">
                                    {optimizations.wasteReduction.actions.map((action, index) => (
                                        <div key={index}
                                             className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                            <span className="text-lg">♻️</span>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-700">{action}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cost Savings */}
                        {optimizations.costSavings.opportunities?.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">💰 Cost Savings</h4>
                                <div className="space-y-3">
                                    {optimizations.costSavings.opportunities.map((opportunity, index) => (
                                        <div key={index}
                                             className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                            <span className="text-lg">💡</span>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-700">{opportunity.action}</p>
                                                <p className="text-xs text-green-600 font-medium">Save {opportunity.savings}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Nutrition Improvements */}
                    {optimizations.nutritionImprovements.recommendations?.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">🥗 Nutrition Improvements</h4>

                            {optimizations.nutritionImprovements.gaps?.length > 0 && (
                                <div className="mb-4">
                                    <h5 className="text-sm font-medium text-gray-900 mb-2">Missing Nutrients:</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {optimizations.nutritionImprovements.gaps.map((gap, index) => (
                                            <span key={index}
                                                  className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                                {gap}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {optimizations.nutritionImprovements.recommendations.map((rec, index) => (
                                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                        <span className="text-lg">🍎</span>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-700">{rec}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <div className="text-4xl mb-4">⚡</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready for Optimization</h3>
                    <p className="text-gray-600 mb-4">
                        Click "Run Optimization" to get AI-powered suggestions for reducing waste, saving money, and
                        improving nutrition.
                    </p>
                    {!data?.inventory?.length && (
                        <p className="text-sm text-gray-500">
                            Add items to your inventory first to enable optimization.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function NutritionGoalsTracking({data, loading, onGoalsUpdate}) {
    const [goals, setGoals] = useState({
        dailyCalories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65,
        fiber: 25,
        sodium: 2300
    });

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (data?.nutritionGoals) {
            setGoals(data.nutritionGoals);
        }
    }, [data]);

    const saveGoals = async () => {
        try {
            setSaving(true);

            const response = await fetch('/api/nutrition/goals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(goals),
            });

            if (response.ok) {
                onGoalsUpdate?.();
            }
        } catch (error) {
            console.error('Error saving goals:', error);
        } finally {
            setSaving(false);
        }
    };

    const updateGoal = (key, value) => {
        setGoals(prev => ({
            ...prev,
            [key]: parseFloat(value) || 0
        }));
    };

    return (
        <div className="space-y-6">
            {/* Goals Setting */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">🎯 Nutrition Goals</h3>
                        <p className="text-sm text-gray-600">
                            Set your daily nutrition targets for personalized recommendations
                        </p>
                    </div>
                    <button
                        onClick={saveGoals}
                        disabled={saving}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? '💾 Saving...' : '💾 Save Goals'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        {key: 'dailyCalories', label: 'Daily Calories', unit: 'kcal', color: 'blue'},
                        {key: 'protein', label: 'Protein', unit: 'g', color: 'green'},
                        {key: 'carbs', label: 'Carbohydrates', unit: 'g', color: 'orange'},
                        {key: 'fat', label: 'Fat', unit: 'g', color: 'purple'},
                        {key: 'fiber', label: 'Fiber', unit: 'g', color: 'teal'},
                        {key: 'sodium', label: 'Sodium', unit: 'mg', color: 'red'}
                    ].map(goal => (
                        <div key={goal.key} className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">
                                {goal.label}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={goals[goal.key]}
                                    onChange={(e) => updateGoal(goal.key, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={`Enter ${goal.label.toLowerCase()}`}
                                />
                                <span className="absolute right-3 top-2 text-sm text-gray-500">
                                    {goal.unit}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Goals Progress */}
            {data?.nutritionGoals && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 Current Progress</h4>
                    <p className="text-sm text-gray-600 mb-4">
                        Based on your recent nutrition data and inventory analysis
                    </p>

                    <div className="space-y-4">
                        {Object.entries(goals).map(([key, goal]) => {
                            // Mock progress data - replace with real data from your nutrition tracking
                            const current = goal * (0.7 + Math.random() * 0.6); // Random progress for demo
                            const percentage = Math.min((current / goal) * 100, 100);

                            return (
                                <div key={key} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-900">
                                            {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                                        </span>
                                        <span className="text-sm text-gray-600">
                                            {Math.round(current)} / {goal} {key === 'dailyCalories' ? 'kcal' : key === 'sodium' ? 'mg' : 'g'}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                percentage >= 90 ? 'bg-green-500' :
                                                    percentage >= 70 ? 'bg-blue-500' :
                                                        percentage >= 50 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                            }`}
                                            style={{width: `${Math.min(percentage, 100)}%`}}
                                        ></div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {percentage >= 90 ? '✅ Goal achieved!' :
                                            percentage >= 70 ? '👍 Good progress' :
                                                percentage >= 50 ? '📈 Making progress' :
                                                    '🎯 Need more focus'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Goal Recommendations */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">💡 Smart Recommendations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <h5 className="text-sm font-medium text-gray-900">🥗 Inventory Suggestions</h5>
                        <div className="space-y-2 text-sm text-gray-600">
                            <p>• Add high-protein items like Greek yogurt or lean meats</p>
                            <p>• Include more fiber-rich vegetables and whole grains</p>
                            <p>• Stock omega-3 sources like salmon or walnuts</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h5 className="text-sm font-medium text-gray-900">🍳 Recipe Focus</h5>
                        <div className="space-y-2 text-sm text-gray-600">
                            <p>• Look for high-protein breakfast options</p>
                            <p>• Try fiber-rich salads and vegetable dishes</p>
                            <p>• Consider heart-healthy cooking methods</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper function
function calculateOverallNutritionScore(data) {
    if (!data?.inventory?.length) return 'N/A';

    const itemsWithNutrition = data.inventory.filter(item => item.nutrition).length;
    const coverageScore = (itemsWithNutrition / data.inventory.length) * 40;

    const varietyCategories = [...new Set(data.inventory.map(item => item.category))].length;
    const varietyScore = Math.min(varietyCategories * 5, 30);

    const expiringItems = data.inventory.filter(item => {
        if (!item.expirationDate) return false;
        const expDate = new Date(item.expirationDate);
        const daysLeft = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 7 && daysLeft >= 0;
    }).length;
    const freshnessScore = Math.max(30 - (expiringItems * 5), 0);

    const totalScore = Math.round(coverageScore + varietyScore + freshnessScore);
    return `${totalScore}/100`;
}