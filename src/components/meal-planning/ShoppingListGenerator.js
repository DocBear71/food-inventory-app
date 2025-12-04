'use client';
// file: /src/components/meal-planning/ShoppingListGenerator.js v16 - FIXED listType validation error

import { useState, useEffect, useMemo, useCallback } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';
import { apiPost, apiGet } from '@/lib/api-config';
import EnhancedAIShoppingListModal from '@/components/shopping/EnhancedAIShoppingListModal';

export default function EnhancedShoppingListGenerator({
                                                          mealPlanId,
                                                          mealPlanName,
                                                          onClose,
                                                          budget = null
                                                      }) {
    const [step, setStep] = useState('options'); // options, generating, optimizing, results
    const [shoppingList, setShoppingList] = useState(null);
    const [optimization, setOptimization] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasSaved, setHasSaved] = useState(false);

    // Shopping List Options
    const [options, setOptions] = useState({
        includePriceOptimization: true,
        maxStores: 2,
        prioritize: 'savings', // 'savings', 'convenience', 'quality'
        useInventoryFirst: true,
        budget: budget,
        excludeExpiredInventory: true,
        generateMealPrepSuggestions: true,
        includeSubstitutions: true
    });

    // Price Intelligence Data
    const [priceData, setPriceData] = useState({
        dealOpportunities: [],
        priceAlerts: [],
        averagePrices: {},
        storePrices: {}
    });

    const [stores, setStores] = useState([]);
    const [inventory, setInventory] = useState([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            // Load stores, inventory, and price data
            const [storesResponse, inventoryResponse, dealsResponse] = await Promise.all([
                apiGet('/api/stores'),
                apiGet('/api/inventory'),
                apiGet('/api/price-tracking/deals?limit=50')
            ]);

            const storesData = await storesResponse.json();
            const inventoryData = await inventoryResponse.json();
            const dealsData = await dealsResponse.json();

            if (storesData.success) {
                setStores(storesData.stores || []);
            }

            if (inventoryData.success) {
                setInventory(inventoryData.inventory?.items || []);
            }

            if (dealsData.success) {
                setPriceData(prev => ({
                    ...prev,
                    dealOpportunities: dealsData.deals || []
                }));
            }

        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    };

    const generateShoppingList = async () => {
        setLoading(true);
        setStep('generating');

        try {
            console.log('=== Generating enhanced shopping list ===');
            console.log('Meal Plan ID:', mealPlanId);
            console.log('Options:', options);

            // Step 1: Generate base shopping list from meal plan
            console.log('🔄 Calling shopping list API...');
            const baseResponse = await apiPost(`/api/meal-plans/${mealPlanId}/shopping-list`, {
                options: options
            });

            if (!baseResponse.ok) {
                const errorText = await baseResponse.text();
                console.error('❌ API Response Error:', {
                    status: baseResponse.status,
                    statusText: baseResponse.statusText,
                    body: errorText
                });
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'API Failed',
                    message: `API Error ${baseResponse.status}: ${baseResponse.statusText} - ${errorText}`
                });
                return;
            }

            const baseData = await baseResponse.json();
            console.log('✅ Base shopping list generated:', baseData);

            if (!options.includePriceOptimization) {
                setShoppingList(baseData.shoppingList);
                setStep('results');
                return;
            }

            // Step 2: Apply price optimization
            setStep('optimizing');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Show optimization step

            try {
                // FIXED: Prepare items in the format expected by price optimization API
                let itemsForOptimization = [];

                console.log('🔧 Preparing items for price optimization...');
                console.log('Base data structure:', {
                    hasItems: !!baseData.shoppingList.items,
                    itemsType: typeof baseData.shoppingList.items,
                    isArray: Array.isArray(baseData.shoppingList.items)
                });

                // Convert shopping list items to the format expected by price optimization
                if (Array.isArray(baseData.shoppingList.items)) {
                    // Case 1: Items is a flat array
                    itemsForOptimization = baseData.shoppingList.items.filter(item =>
                        item && (item.ingredient || item.name)
                    ).map(item => ({
                        name: item.ingredient || item.name,
                        ingredient: item.ingredient || item.name,
                        quantity: item.quantity || item.amount || 1,
                        unit: item.unit || '',
                        category: item.category || 'Other',
                        estimated_price: item.estimatedPrice || 0,
                        optional: !!item.optional
                    }));
                } else if (typeof baseData.shoppingList.items === 'object' && baseData.shoppingList.items !== null) {
                    // Case 2: Items is categorized object
                    Object.entries(baseData.shoppingList.items).forEach(([category, categoryItems]) => {
                        if (Array.isArray(categoryItems)) {
                            categoryItems.filter(item =>
                                item && (item.ingredient || item.name)
                            ).forEach(item => {
                                itemsForOptimization.push({
                                    name: item.ingredient || item.name,
                                    ingredient: item.ingredient || item.name,
                                    quantity: item.quantity || item.amount || 1,
                                    unit: item.unit || '',
                                    category: category,
                                    estimated_price: item.estimatedPrice || 0,
                                    optional: !!item.optional
                                });
                            });
                        }
                    });
                } else {
                    console.warn('⚠️ Unexpected items format, skipping price optimization');
                    setShoppingList(baseData.shoppingList);
                    setStep('results');
                    return;
                }

                console.log(`📋 Prepared ${itemsForOptimization.length} items for price optimization`);

                if (itemsForOptimization.length === 0) {
                    console.warn('⚠️ No valid items for price optimization, using base list');
                    setShoppingList(baseData.shoppingList);
                    setStep('results');
                    return;
                }

                // Make the price optimization request with proper data format
                const optimizationPayload = {
                    items: itemsForOptimization, // Use the properly formatted items
                    budget: options.budget,
                    preferredStores: stores.slice(0, options.maxStores).map(s => s?.name || s).filter(Boolean),
                    maxStores: options.maxStores,
                    prioritize: options.prioritize,
                    inventory: inventory,
                    dealOpportunities: priceData.dealOpportunities,
                    useInventoryFirst: options.useInventoryFirst
                };

                console.log('📤 Sending price optimization request:', {
                    itemsCount: itemsForOptimization.length,
                    budget: options.budget,
                    maxStores: options.maxStores,
                    storesCount: stores.length
                });

                const optimizationResponse = await apiPost('/api/price-tracking/optimize-shopping', optimizationPayload);

                if (optimizationResponse.ok) {
                    const optimizationData = await optimizationResponse.json();
                    if (optimizationData.success) {
                        console.log('✅ Price optimization completed');
                        setOptimization(optimizationData.optimization);

                        // Merge optimization data with shopping list
                        const enhancedShoppingList = enhanceShoppingListWithPrices(
                            baseData.shoppingList,
                            optimizationData.optimization
                        );

                        setShoppingList(enhancedShoppingList);
                    } else {
                        console.warn('Price optimization failed, using base list:', optimizationData.error || 'Unknown error');
                        setShoppingList(baseData.shoppingList);
                    }
                } else {
                    const errorText = await optimizationResponse.text();
                    console.warn('Price optimization API failed:', {
                        status: optimizationResponse.status,
                        statusText: optimizationResponse.statusText,
                        body: errorText
                    });
                    setShoppingList(baseData.shoppingList);
                }
            } catch (optimizationError) {
                console.warn('Price optimization error, using base list:', optimizationError);
                setShoppingList(baseData.shoppingList);
            }

            setStep('results');

        } catch (error) {
            console.error('Shopping list generation error:', error);
            setError(error.message || 'Unknown error occurred');
            setStep('options');
        } finally {
            setLoading(false);
        }
    };

    // FIXED: Complete rewrite with comprehensive null/undefined safety
    const enhanceShoppingListWithPrices = (baseList, optimization) => {
        console.log('🔧 Enhancing shopping list with prices...');
        console.log('Base list structure:', {
            hasItems: !!baseList?.items,
            itemsType: typeof baseList?.items,
            isArray: Array.isArray(baseList?.items)
        });
        console.log('Optimization structure:', {
            hasOptimization: !!optimization,
            hasItems: !!optimization?.items,
            itemsCount: optimization?.items?.length || 0
        });

        // Safety check: ensure we have valid data structures
        if (!baseList || !baseList.items) {
            console.warn('⚠️ Invalid base list structure, returning as-is');
            return baseList || {};
        }

        if (!optimization || !optimization.items || !Array.isArray(optimization.items)) {
            console.warn('⚠️ Invalid optimization structure, returning base list');
            return baseList;
        }

        // Helper function to safely get item name
        const safeGetItemName = (item) => {
            if (!item) return null;
            const name = item.ingredient || item.name;
            return (typeof name === 'string' && name.trim()) ? name.trim() : null;
        };

        // Helper function to safely compare item names
        const safeNameMatch = (name1, name2) => {
            if (!name1 || !name2) return false;
            try {
                const n1 = String(name1).toLowerCase().trim();
                const n2 = String(name2).toLowerCase().trim();
                return n1 === n2 || n1.includes(n2) || n2.includes(n1);
            } catch (error) {
                console.warn('Error comparing names:', name1, name2, error);
                return false;
            }
        };

        // Process items based on structure
        let processedItems;

        if (Array.isArray(baseList.items)) {
            console.log('📋 Processing flat array of items');
            processedItems = baseList.items.map((item, index) => {
                if (!item) {
                    console.warn(`⚠️ Skipping null item at index ${index}`);
                    return null;
                }

                const itemName = safeGetItemName(item);
                if (!itemName) {
                    console.warn(`⚠️ Skipping item with no valid name at index ${index}:`, item);
                    return item; // Return as-is rather than null
                }

                // Find corresponding optimized item
                const optimizedItem = optimization.items.find(opt => {
                    const optName = safeGetItemName(opt);
                    return optName && safeNameMatch(itemName, optName);
                });

                if (optimizedItem) {
                    console.log(`✅ Found price optimization for: ${itemName}`);
                    return {
                        ...item,
                        priceInfo: {
                            bestPrice: optimizedItem.bestPrice || null,
                            alternatives: Array.isArray(optimizedItem.alternatives) ? optimizedItem.alternatives : [],
                            estimatedPrice: typeof optimizedItem.estimatedPrice === 'number' ? optimizedItem.estimatedPrice : 0,
                            dealStatus: (optimizedItem.bestPrice?.savings || 0) > 0 ? 'deal' : 'normal'
                        },
                        priceOptimized: true
                    };
                } else {
                    console.log(`ℹ️ No price optimization found for: ${itemName}`);
                }

                return item;
            }).filter(item => item !== null); // Remove any null items
        } else {
            console.log('📂 Processing categorized items object');
            processedItems = {};

            Object.entries(baseList.items).forEach(([category, categoryItems]) => {
                if (!category || typeof category !== 'string') {
                    console.warn('⚠️ Skipping invalid category:', category);
                    return;
                }

                if (!Array.isArray(categoryItems)) {
                    console.warn(`⚠️ Category "${category}" items is not an array:`, typeof categoryItems);
                    // Try to salvage single item
                    if (categoryItems && typeof categoryItems === 'object') {
                        const itemName = safeGetItemName(categoryItems);
                        if (itemName) {
                            processedItems[category] = [categoryItems];
                        }
                    }
                    return;
                }

                const enhancedCategoryItems = categoryItems.map((item, index) => {
                    if (!item) {
                        console.warn(`⚠️ Skipping null item in category "${category}" at index ${index}`);
                        return null;
                    }

                    const itemName = safeGetItemName(item);
                    if (!itemName) {
                        console.warn(`⚠️ Skipping item with no valid name in category "${category}":`, item);
                        return item; // Return as-is
                    }

                    // Find corresponding optimized item
                    const optimizedItem = optimization.items.find(opt => {
                        const optName = safeGetItemName(opt);
                        return optName && safeNameMatch(itemName, optName);
                    });

                    if (optimizedItem) {
                        console.log(`✅ Found price optimization for: ${itemName} in ${category}`);
                        return {
                            ...item,
                            priceInfo: {
                                bestPrice: optimizedItem.bestPrice || null,
                                alternatives: Array.isArray(optimizedItem.alternatives) ? optimizedItem.alternatives : [],
                                estimatedPrice: typeof optimizedItem.estimatedPrice === 'number' ? optimizedItem.estimatedPrice : 0,
                                dealStatus: (optimizedItem.bestPrice?.savings || 0) > 0 ? 'deal' : 'normal'
                            },
                            priceOptimized: true
                        };
                    }

                    return item;
                }).filter(item => item !== null);

                if (enhancedCategoryItems.length > 0) {
                    processedItems[category] = enhancedCategoryItems;
                }
            });
        }

        const result = {
            ...baseList,
            items: processedItems,
            optimization: optimization,
            priceOptimized: true,
            totalEstimatedCost: typeof optimization.totalCost === 'number' ? optimization.totalCost : 0,
            totalSavings: typeof optimization.totalSavings === 'number' ? optimization.totalSavings : 0,
            storeRecommendations: Array.isArray(optimization.storeRecommendations) ? optimization.storeRecommendations : []
        };

        console.log('✅ Price enhancement completed');
        return result;
    };

    const handleOptionChange = (key, value) => {
        setOptions(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const retryGeneration = () => {
        setStep('options');
    };

    // BULLETPROOF: Enhanced save handling for complex categorized shopping lists
    const handleSaveToUnifiedModal = useCallback(async (listData) => {
        // SAFE FIX: Check if we've already saved to prevent duplicate saves
        if (hasSaved) {
            console.log('🔄 Save already completed, skipping duplicate save');
            return;
        }

        console.log('🔄 SAVE REQUEST - Starting bulletproof save process...');
        console.log('📊 Input data analysis:', {
            hasListData: !!listData,
            listDataType: typeof listData,
            hasItems: !!listData?.items,
            itemsType: typeof listData?.items,
            isItemsArray: Array.isArray(listData?.items),
            itemsKeys: listData?.items ? Object.keys(listData.items).slice(0, 10) : 'none',
            name: listData?.name || 'unnamed'
        });

        try {
            // SAFE FIX: Mark as saving to prevent double saves
            setHasSaved(true);

            // STEP 1: Extract and validate all items with comprehensive error handling
            const extractedItems = extractAllItemsRobustly(listData);

            if (extractedItems.length === 0) {
                console.error('❌ No valid items extracted from listData');
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Shopping List Failed',
                    message: 'No valid items found in shopping list data'
                });
                return;
            }

            console.log(`✅ Successfully extracted ${extractedItems.length} items for save`);

            // STEP 2: Format items for the SavedShoppingList schema
            const formattedItems = formatItemsForSaveRobustly(extractedItems);

            if (formattedItems.length === 0) {
                console.error('❌ No valid items after formatting');
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Valid Items Failed',
                    message: 'No valid items remain after formatting'
                });
                return;
            }

            console.log(`✅ Successfully formatted ${formattedItems.length} items for schema`);

            // STEP 3: Create the save payload with validation
            const savePayload = createSavePayload(listData, formattedItems);

            console.log('📤 Save payload summary:', {
                name: savePayload.name,
                itemCount: savePayload.items.length,
                categories: [...new Set(savePayload.items.map(item => item.category))],
                listType: savePayload.listType,
                hasDescription: !!savePayload.description
            });

            // STEP 4: Execute the save with enhanced error handling
            const response = await apiPost('/api/shopping/saved', savePayload);

            if (!response.ok) {
                const errorText = await response.text();
                let errorDetails;
                try {
                    errorDetails = JSON.parse(errorText);
                } catch {
                    errorDetails = { message: errorText };
                }

                console.error('❌ API Save Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorDetails: errorDetails
                });

                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Save Failed',
                    message: `Save failed (${response.status}): ${errorDetails.error || errorDetails.message || 'Unknown error'}`
                });
                return;
            }

            const result = await response.json();
            console.log('✅ Shopping list saved successfully:', result);

            onClose(); // Close the generator after successful save

        } catch (error) {
            console.error('💥 SAVE ERROR - Complete error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                inputData: {
                    hasItems: !!listData?.items,
                    itemsType: typeof listData?.items,
                    isArray: Array.isArray(listData?.items)
                }
            });

            // SAFE FIX: Reset saved state on error so user can try again
            setHasSaved(false);
            throw error; // Let the modal handle the error display
        }
    }, [onClose, mealPlanId, mealPlanName, shoppingList, hasSaved]);

// SAFE FIX: Reset hasSaved when the modal closes or opens
    useEffect(() => {
        if (step !== 'results') {
            setHasSaved(false);
        }
    }, [step]);

// STEP 1: Robust item extraction that handles all possible data structures
    const extractAllItemsRobustly = (listData) => {
        console.log('🔍 EXTRACT - Starting robust item extraction...');

        const extractedItems = [];
        let extractionMethod = 'unknown';

        try {
            // Method 1: Direct items array
            if (listData?.items && Array.isArray(listData.items)) {
                console.log('📋 EXTRACT - Method 1: Direct items array');
                extractionMethod = 'direct-array';
                listData.items.forEach((item, index) => {
                    const processed = processItemSafely(item, index, 'direct-array');
                    if (processed) extractedItems.push(processed);
                });
            }

            // Method 2: Categorized items object
            else if (listData?.items && typeof listData.items === 'object') {
                console.log('📂 EXTRACT - Method 2: Categorized items object');
                extractionMethod = 'categorized-object';

                Object.entries(listData.items).forEach(([category, categoryItems]) => {
                    console.log(`📂 Processing category: "${category}" with ${Array.isArray(categoryItems) ? categoryItems.length : 'non-array'} items`);

                    if (Array.isArray(categoryItems)) {
                        categoryItems.forEach((item, index) => {
                            const processed = processItemSafely(item, index, `category-${category}`);
                            if (processed) {
                                // Ensure the item has the correct category from its current location
                                processed.category = category;
                                processed.originalCategory = processed.originalCategory || category;
                                extractedItems.push(processed);
                            }
                        });
                    } else if (categoryItems && typeof categoryItems === 'object') {
                        // Handle single item objects that aren't arrays
                        console.log(`⚠️ Converting single item object in category "${category}"`);
                        const processed = processItemSafely(categoryItems, 0, `single-${category}`);
                        if (processed) {
                            processed.category = category;
                            processed.originalCategory = processed.originalCategory || category;
                            extractedItems.push(processed);
                        }
                    }
                });
            }

            // Method 3: Try categorizedItems property
            else if (listData?.categorizedItems && Array.isArray(listData.categorizedItems)) {
                console.log('📋 EXTRACT - Method 3: categorizedItems array');
                extractionMethod = 'categorized-items-array';
                listData.categorizedItems.forEach((item, index) => {
                    const processed = processItemSafely(item, index, 'categorized-items');
                    if (processed) extractedItems.push(processed);
                });
            }

            // Method 4: Fall back to original shopping list
            else if (shoppingList?.items) {
                console.log('🔄 EXTRACT - Method 4: Fallback to original shoppingList');
                extractionMethod = 'fallback-original';

                if (Array.isArray(shoppingList.items)) {
                    shoppingList.items.forEach((item, index) => {
                        const processed = processItemSafely(item, index, 'fallback-array');
                        if (processed) extractedItems.push(processed);
                    });
                } else if (typeof shoppingList.items === 'object') {
                    Object.values(shoppingList.items).forEach((categoryItems, categoryIndex) => {
                        if (Array.isArray(categoryItems)) {
                            categoryItems.forEach((item, index) => {
                                const processed = processItemSafely(item, index, `fallback-category-${categoryIndex}`);
                                if (processed) extractedItems.push(processed);
                            });
                        }
                    });
                }
            }

            console.log(`✅ EXTRACT - Completed using method: ${extractionMethod}, extracted ${extractedItems.length} items`);

        } catch (extractError) {
            console.error('💥 EXTRACT ERROR:', extractError);
            console.error('📊 Data that caused error:', {
                listData: listData,
                shoppingList: shoppingList
            });
        }

        return extractedItems;
    };

// ROBUST: Process individual items with comprehensive validation
    const processItemSafely = (item, index, source) => {
        try {
            // Skip null/undefined items
            if (!item) {
                console.log(`⚠️ PROCESS - Skipping null/undefined item at index ${index} from ${source}`);
                return null;
            }

            // Handle string items (shouldn't happen but be safe)
            if (typeof item === 'string') {
                console.log(`⚠️ PROCESS - Converting string item "${item}" to object`);
                return {
                    name: item,
                    ingredient: item,
                    category: 'Other',
                    amount: '',
                    unit: '',
                    quantity: '1'
                };
            }

            // Skip non-object items
            if (typeof item !== 'object') {
                console.warn(`⚠️ PROCESS - Skipping non-object item at index ${index}:`, typeof item, item);
                return null;
            }

            // Extract name with multiple fallbacks
            const name = extractItemName(item);
            if (!name) {
                console.warn(`⚠️ PROCESS - Skipping item with no valid name at index ${index}:`, item);
                return null;
            }

            // Extract other properties safely
            const category = extractItemCategory(item);
            const { amount, unit, quantity } = extractAmountInfo(item);

            // Create processed item with all required fields
            const processedItem = {
                name: name,
                ingredient: name,
                category: category,
                amount: amount,
                unit: unit,
                quantity: quantity,

                // Additional properties with safe extraction
                inInventory: Boolean(item.inInventory),
                purchased: Boolean(item.purchased || item.checked),
                selected: item.selected !== false,
                optional: Boolean(item.optional),

                // Recipe information
                recipes: extractRecipeList(item),

                // Original data preservation
                originalName: item.originalName || name,
                id: item.id || generateSafeItemId(name, index),

                // Additional safe properties
                notes: (item.notes && typeof item.notes === 'string') ? item.notes : '',
                haveAmount: (item.haveAmount && typeof item.haveAmount === 'string') ? item.haveAmount : '',
                needAmount: (item.needAmount && typeof item.needAmount === 'string') ? item.needAmount : amount,

                // Metadata
                processedFrom: source,
                processedAt: Date.now()
            };

            console.log(`✅ PROCESS - Successfully processed: ${name} [${category}]`);
            return processedItem;

        } catch (processError) {
            console.error(`💥 PROCESS ERROR - Failed to process item at index ${index}:`, processError);
            console.error(`📊 Item data:`, item);
            return null;
        }
    };

// HELPER: Extract item name with multiple fallbacks
    const extractItemName = (item) => {
        const possibleFields = ['ingredient', 'name', 'title', 'itemName', 'displayName'];

        for (const field of possibleFields) {
            if (item[field] && typeof item[field] === 'string' && item[field].trim()) {
                return item[field].trim();
            }
        }

        return null;
    };

// HELPER: Extract category with validation
    const extractItemCategory = (item) => {
        if (item.category && typeof item.category === 'string' && item.category.trim()) {
            return item.category.trim();
        }
        return 'Other';
    };

// HELPER: Extract amount information with comprehensive parsing
    const extractAmountInfo = (item) => {
        let amount = '';
        let unit = '';
        let quantity = '';

        // Try different amount fields
        const amountFields = ['amount', 'quantity', 'qty', 'size'];
        const unitFields = ['unit', 'units', 'measure'];

        // Extract amount
        for (const field of amountFields) {
            if (item[field] && (typeof item[field] === 'string' || typeof item[field] === 'number')) {
                const value = String(item[field]).trim();
                if (value) {
                    amount = value;
                    quantity = value;
                    break;
                }
            }
        }

        // Extract unit
        for (const field of unitFields) {
            if (item[field] && typeof item[field] === 'string' && item[field].trim()) {
                unit = item[field].trim();
                break;
            }
        }

        // If we have both amount and unit, combine them for display
        if (amount && unit && !amount.includes(unit)) {
            amount = `${amount} ${unit}`.trim();
        }

        return {
            amount: amount || '',
            unit: unit || '',
            quantity: quantity || '1'
        };
    };

// HELPER: Extract recipe list safely
    const extractRecipeList = (item) => {
        if (Array.isArray(item.recipes)) {
            return item.recipes.filter(recipe => recipe && typeof recipe === 'string');
        } else if (item.recipes && typeof item.recipes === 'string') {
            return [item.recipes];
        } else if (item.recipe && typeof item.recipe === 'string') {
            return [item.recipe];
        }
        return [];
    };

// HELPER: Generate safe item ID
    const generateSafeItemId = (name, index) => {
        const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `${safeName}-${Date.now()}-${index}`;
    };

// STEP 2: Format items for SavedShoppingList schema with comprehensive validation
    const formatItemsForSaveRobustly = (items) => {
        console.log(`🔧 FORMAT - Starting robust formatting of ${items.length} items...`);

        if (!Array.isArray(items)) {
            console.error('❌ FORMAT - Items is not an array:', typeof items);
            return [];
        }

        const formattedItems = [];
        const seenNames = new Set(); // Prevent duplicates

        items.forEach((item, index) => {
            try {
                if (!item || typeof item !== 'object') {
                    console.warn(`⚠️ FORMAT - Skipping invalid item at index ${index}:`, item);
                    return;
                }

                const name = item.name || item.ingredient;
                if (!name || typeof name !== 'string' || !name.trim()) {
                    console.warn(`⚠️ FORMAT - Skipping item with invalid name at index ${index}:`, item);
                    return;
                }

                const trimmedName = name.trim();

                // Skip duplicates based on name
                if (seenNames.has(trimmedName.toLowerCase())) {
                    console.log(`⚠️ FORMAT - Skipping duplicate item: ${trimmedName}`);
                    return;
                }
                seenNames.add(trimmedName.toLowerCase());

                // Create formatted item according to SavedShoppingList schema
                const formattedItem = {
                    // Required fields
                    ingredient: trimmedName,

                    // Amount information
                    amount: formatAmountSafely(item),

                    // Categorization
                    category: formatCategorySafely(item.category),

                    // Status fields
                    inInventory: Boolean(item.inInventory),
                    purchased: Boolean(item.purchased),

                    // Recipe information
                    recipes: formatRecipesSafely(item.recipes),

                    // Additional fields from schema
                    originalName: item.originalName || trimmedName,
                    needAmount: item.needAmount || '',
                    haveAmount: item.haveAmount || '',
                    itemKey: item.itemKey || item.id || generateSafeItemId(trimmedName, index),
                    notes: item.notes || '',

                    // Price information (if available)
                    price: formatPriceSafely(item.price),
                    unitPrice: formatPriceSafely(item.unitPrice),
                    estimatedPrice: formatPriceSafely(item.estimatedPrice) || 0,
                    priceSource: (item.priceSource && typeof item.priceSource === 'string') ? item.priceSource : 'estimated'
                };

                formattedItems.push(formattedItem);
                console.log(`✅ FORMAT - Item ${index + 1}: ${trimmedName} -> ${formattedItem.category}`);

            } catch (formatError) {
                console.error(`💥 FORMAT ERROR - Item ${index}:`, formatError, item);
            }
        });

        console.log(`✅ FORMAT - Completed: ${formattedItems.length} items formatted successfully`);
        return formattedItems;
    };

// HELPER: Format amount safely
    const formatAmountSafely = (item) => {
        if (item.amount && typeof item.amount === 'string') {
            return item.amount.trim();
        } else if (item.quantity && typeof item.quantity === 'string') {
            const unit = (item.unit && typeof item.unit === 'string') ? item.unit.trim() : '';
            return unit ? `${item.quantity.trim()} ${unit}`.trim() : item.quantity.trim();
        }
        return '';
    };

// HELPER: Format category safely
    const formatCategorySafely = (category) => {
        if (category && typeof category === 'string' && category.trim()) {
            return category.trim();
        }
        return 'other';
    };

// HELPER: Format recipes safely
    const formatRecipesSafely = (recipes) => {
        if (Array.isArray(recipes)) {
            return recipes.filter(recipe => recipe && typeof recipe === 'string');
        } else if (recipes && typeof recipes === 'string') {
            return [recipes];
        }
        return [];
    };

// HELPER: Format price safely
    const formatPriceSafely = (price) => {
        if (typeof price === 'number' && !isNaN(price) && price >= 0) {
            return price;
        }
        return undefined;
    };

// STEP 3: Create save payload with validation - FIXED: Use correct listType
    const createSavePayload = async (listData, formattedItems) => {
        console.log('📦 PAYLOAD - Creating save payload...');

        const payload = {
            name: (listData.name && typeof listData.name === 'string')
                ? listData.name.trim()
                : `Shopping List ${new Date().toLocaleDateString()}`,
            description: (listData.description && typeof listData.description === 'string')
                ? listData.description.trim()
                : '',
            // FIXED: Use valid enum value from schema
            listType: mealPlanId ? 'meal-plan' : 'recipes',
            contextName: mealPlanName || '',
            sourceRecipeIds: [],
            sourceMealPlanId: mealPlanId || null,
            items: formattedItems,
            tags: Array.isArray(listData.tags) ? listData.tags : [],
            color: (listData.color && typeof listData.color === 'string')
                ? listData.color
                : '#3b82f6',
            isTemplate: Boolean(listData.isTemplate)
        };

        // Validate payload
        if (!payload.name || payload.name.length === 0) {
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Shopping List Name Failed',
                message: 'Shopping list name is required'
            });
            return;
        }

        if (!Array.isArray(payload.items) || payload.items.length === 0) {
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Shopping List Failed',
                message: 'Shopping list must contain at least one item'
            });
            return;
        }

        console.log(`✅ PAYLOAD - Created valid payload with ${payload.items.length} items`);
        return payload;
    };

// ENHANCED: Specialized formatter for items that have been moved between categories
    const formatCategorizedItemsForSave = (items) => {
        console.log('🔧 Formatting categorized items for save:', {
            inputCount: items.length,
            inputType: typeof items,
            isArray: Array.isArray(items)
        });

        if (!Array.isArray(items)) {
            console.error('❌ Items is not an array for categorized formatting');
            return [];
        }

        const validItems = [];
        const categoryStats = {};

        items.forEach((item, index) => {
            try {
                // Skip invalid items
                if (!item || typeof item !== 'object') {
                    console.warn(`⚠️ Skipping invalid item at index ${index}:`, typeof item);
                    return;
                }

                // Extract ingredient name with enhanced fallbacks
                const ingredientName = extractItemName(item);
                if (!ingredientName) {
                    console.warn(`⚠️ Skipping item with no valid name at index ${index}:`, item);
                    return;
                }

                // Get the current category (after any moves)
                const currentCategory = item.category || 'Other';

                // Track category stats
                categoryStats[currentCategory] = (categoryStats[currentCategory] || 0) + 1;

                // Enhanced amount parsing for grocery shopping
                const { amount, needAmount } = parseShoppingAmount(item);

                // Create the formatted item with enhanced categorization data
                const formattedItem = {
                    ingredient: ingredientName,
                    amount: amount,
                    category: currentCategory,
                    inInventory: Boolean(item.inInventory),
                    purchased: Boolean(item.purchased || item.checked),
                    recipes: extractRecipeNames(item),
                    originalName: item.originalName || item.ingredient || item.name || ingredientName,
                    needAmount: needAmount,
                    haveAmount: item.haveAmount || '',
                    itemKey: generateItemKey(ingredientName, currentCategory, index),
                    notes: item.notes || '',

                    // Enhanced price information
                    price: extractPrice(item, 'price'),
                    unitPrice: extractPrice(item, 'unitPrice'),
                    estimatedPrice: extractPrice(item, 'estimatedPrice') || 0,
                    priceSource: item.priceSource || 'estimated',

                    // Category move metadata (optional, for analytics)
                    originalCategory: item.originalCategory || currentCategory,
                    categoryMoves: item.categoryMoves || 0
                };

                // Clean up undefined values
                Object.keys(formattedItem).forEach(key => {
                    if (formattedItem[key] === undefined) {
                        delete formattedItem[key];
                    }
                });

                validItems.push(formattedItem);

            } catch (itemError) {
                console.error(`❌ Error formatting categorized item at index ${index}:`, itemError, item);
            }
        });

        console.log('✅ Categorized formatting completed:', {
            validItems: validItems.length,
            totalInput: items.length,
            categories: Object.keys(categoryStats),
            categoryBreakdown: categoryStats
        });

        return validItems;
    };

// Enhanced amount parsing for grocery shopping context
    const parseShoppingAmount = (item) => {
        let amount = '';
        let needAmount = '';

        // Try to get amount from various fields
        const possibleAmountFields = ['amount', 'quantity', 'qty', 'size'];
        const possibleUnitFields = ['unit', 'units', 'measure'];

        let qty = null;
        let unit = '';

        // Extract quantity
        for (const field of possibleAmountFields) {
            if (item[field] && (typeof item[field] === 'string' || typeof item[field] === 'number')) {
                qty = item[field];
                break;
            }
        }

        // Extract unit
        for (const field of possibleUnitFields) {
            if (item[field] && typeof item[field] === 'string' && item[field].trim()) {
                unit = item[field].trim();
                break;
            }
        }

        // Format the amount
        if (qty !== null) {
            if (unit) {
                amount = `${qty} ${unit}`.trim();
            } else {
                amount = String(qty).trim();
            }
        }

        // Handle needAmount specifically
        if (item.needAmount && typeof item.needAmount === 'string') {
            needAmount = item.needAmount.trim();
        } else if (amount) {
            needAmount = amount;
        }

        return { amount, needAmount };
    };

// Extract recipe names safely
    const extractRecipeNames = (item) => {
        if (Array.isArray(item.recipes)) {
            return item.recipes.filter(recipe => recipe && typeof recipe === 'string');
        } else if (item.recipes && typeof item.recipes === 'string') {
            return [item.recipes];
        } else if (item.recipe && typeof item.recipe === 'string') {
            return [item.recipe];
        }
        return [];
    };

// Generate consistent item keys for tracking
    const generateItemKey = (ingredientName, category, index) => {
        const safeName = ingredientName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const safeCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `${safeName}-${safeCategory}-${index}`;
    };

// Extract price information safely
    const extractPrice = (item, priceField) => {
        const value = item[priceField];
        if (typeof value === 'number' && !isNaN(value) && value >= 0) {
            return value;
        }
        return undefined;
    };

    // FIXED: Move convertShoppingListForModal function before useMemo to prevent temporal dead zone
    const convertShoppingListForModal = useCallback((shoppingList) => {
        console.log('🔄 Converting shopping list for modal...');
        console.log('Input structure:', {
            hasShoppingList: !!shoppingList,
            hasItems: !!shoppingList?.items,
            itemsType: typeof shoppingList?.items,
            isArray: Array.isArray(shoppingList?.items)
        });

        if (!shoppingList || !shoppingList.items) {
            console.error('❌ No shopping list or items to convert');
            return [];
        }

        const convertedItems = [];
        let itemCounter = 0;

        // Helper function to safely convert a single item
        const convertSingleItem = (item, category = 'Other', sourceIndex = 0) => {
            if (!item || typeof item !== 'object') {
                console.warn(`⚠️ Skipping invalid item:`, item);
                return null;
            }

            // Safely extract item name
            const name = item.ingredient || item.name;
            if (!name || typeof name !== 'string' || !name.trim()) {
                console.warn(`⚠️ Skipping item with invalid name:`, item);
                return null;
            }

            // FIXED: Enhanced unit parsing from amount/quantity strings
            const parseAmountAndUnit = (amountStr) => {
                if (!amountStr) return { quantity: '1', unit: '' };

                const str = String(amountStr).trim();

                // Common unit patterns
                const unitPatterns = [
                    // Volume
                    { regex: /(\d+(?:\.\d+)?)\s*(cups?|cup)\b/i, unit: 'cups' },
                    { regex: /(\d+(?:\.\d+)?)\s*(tablespoons?|tbsp?|tbs?)\b/i, unit: 'tbsp' },
                    { regex: /(\d+(?:\.\d+)?)\s*(teaspoons?|tsp?)\b/i, unit: 'tsp' },
                    { regex: /(\d+(?:\.\d+)?)\s*(pints?|pt)\b/i, unit: 'pints' },
                    { regex: /(\d+(?:\.\d+)?)\s*(quarts?|qt)\b/i, unit: 'quarts' },
                    { regex: /(\d+(?:\.\d+)?)\s*(gallons?|gal)\b/i, unit: 'gallons' },
                    { regex: /(\d+(?:\.\d+)?)\s*(liters?|l)\b/i, unit: 'liters' },
                    { regex: /(\d+(?:\.\d+)?)\s*(milliliters?|ml)\b/i, unit: 'ml' },
                    { regex: /(\d+(?:\.\d+)?)\s*(fluid ounces?|fl oz|floz)\b/i, unit: 'fl oz' },

                    // Weight
                    { regex: /(\d+(?:\.\d+)?)\s*(pounds?|lbs?|lb)\b/i, unit: 'lbs' },
                    { regex: /(\d+(?:\.\d+)?)\s*(ounces?|oz)\b/i, unit: 'oz' },
                    { regex: /(\d+(?:\.\d+)?)\s*(grams?|g)\b/i, unit: 'g' },
                    { regex: /(\d+(?:\.\d+)?)\s*(kilograms?|kg)\b/i, unit: 'kg' },

                    // Count/pieces
                    { regex: /(\d+(?:\.\d+)?)\s*(pieces?|pcs?)\b/i, unit: 'pieces' },
                    { regex: /(\d+(?:\.\d+)?)\s*(items?)\b/i, unit: 'items' },
                    { regex: /(\d+(?:\.\d+)?)\s*(slices?)\b/i, unit: 'slices' },
                    { regex: /(\d+(?:\.\d+)?)\s*(cans?)\b/i, unit: 'cans' },
                    { regex: /(\d+(?:\.\d+)?)\s*(bottles?)\b/i, unit: 'bottles' },
                    { regex: /(\d+(?:\.\d+)?)\s*(bags?)\b/i, unit: 'bags' },
                    { regex: /(\d+(?:\.\d+)?)\s*(boxes?)\b/i, unit: 'boxes' },
                    { regex: /(\d+(?:\.\d+)?)\s*(packages?|pkgs?)\b/i, unit: 'packages' },
                    { regex: /(\d+(?:\.\d+)?)\s*(containers?)\b/i, unit: 'containers' },

                    // Special cases
                    { regex: /(\d+(?:\.\d+)?)\s*(cloves?)\b/i, unit: 'cloves' },
                    { regex: /(\d+(?:\.\d+)?)\s*(bunches?)\b/i, unit: 'bunches' },
                    { regex: /(\d+(?:\.\d+)?)\s*(heads?)\b/i, unit: 'heads' },
                    { regex: /(\d+(?:\.\d+)?)\s*(stalks?)\b/i, unit: 'stalks' },
                ];

                // Try to match patterns
                for (const pattern of unitPatterns) {
                    const match = str.match(pattern.regex);
                    if (match) {
                        return {
                            quantity: match[1],
                            unit: pattern.unit
                        };
                    }
                }

                // If no unit pattern found, try to extract number at the beginning
                const numberMatch = str.match(/^(\d+(?:\.\d+)?)/);
                if (numberMatch) {
                    const restOfString = str.replace(numberMatch[0], '').trim();
                    // If there's text after the number, it might be a unit
                    if (restOfString && restOfString.length < 20) {
                        return {
                            quantity: numberMatch[1],
                            unit: restOfString
                        };
                    }
                    return {
                        quantity: numberMatch[1],
                        unit: ''
                    };
                }

                // Fallback: return as-is
                return {
                    quantity: str || '1',
                    unit: ''
                };
            };

            // Parse amount and unit
            const rawAmount = item.quantity || item.amount || '1';
            const parsedAmount = parseAmountAndUnit(rawAmount);

            // Override with explicit unit if provided
            let finalUnit = item.unit || parsedAmount.unit;
            let finalQuantity = parsedAmount.quantity;

            // Additional cleanup for units
            if (finalUnit) {
                finalUnit = finalUnit.trim();
                // Standardize common variations
                const unitMap = {
                    'cup': 'cups',
                    'tablespoon': 'tbsp',
                    'tablespoons': 'tbsp',
                    'teaspoon': 'tsp',
                    'teaspoons': 'tsp',
                    'pound': 'lbs',
                    'pounds': 'lbs',
                    'lb': 'lbs',
                    'ounce': 'oz',
                    'ounces': 'oz',
                    'piece': 'pieces',
                    'pcs': 'pieces',
                    'slice': 'slices'
                };
                finalUnit = unitMap[finalUnit.toLowerCase()] || finalUnit;
            }

            // Generate unique ID
            const itemId = item.id || `${name.replace(/\s+/g, '-')}-${Date.now()}-${sourceIndex}`;

            // Create the converted item
            const convertedItem = {
                id: itemId,
                name: name.trim(),
                ingredient: name.trim(),
                quantity: String(finalQuantity).trim(),
                unit: finalUnit,
                category: (category && typeof category === 'string') ? category : 'Other',

                // Inventory status
                inInventory: !!item.inInventory,
                haveAmount: item.haveAmount || (item.inventoryItem?.quantity),
                inventoryItem: item.inventoryItem || null,

                // Purchase status
                purchased: !!item.purchased,
                selected: item.selected !== false,
                checked: !!item.checked,
                optional: !!item.optional,

                // Recipe information
                recipes: Array.isArray(item.recipes) ? item.recipes : (item.recipes ? [item.recipes] : []),

                // Price information (enhanced or basic)
                priceOptimized: !!(item.priceInfo || item.priceOptimized),
                estimatedPrice: 0,
                dealStatus: 'normal',
                alternatives: []
            };

            // Handle price information safely
            if (item.priceInfo && typeof item.priceInfo === 'object') {
                convertedItem.estimatedPrice = typeof item.priceInfo.estimatedPrice === 'number' ? item.priceInfo.estimatedPrice : 0;
                convertedItem.dealStatus = (typeof item.priceInfo.dealStatus === 'string') ? item.priceInfo.dealStatus : 'normal';
                convertedItem.alternatives = Array.isArray(item.priceInfo.alternatives) ? item.priceInfo.alternatives : [];
            } else {
                // Fallback to direct properties
                convertedItem.estimatedPrice = typeof item.estimatedPrice === 'number' ? item.estimatedPrice : 0;
                convertedItem.dealStatus = (typeof item.dealStatus === 'string') ? item.dealStatus : 'normal';
                convertedItem.alternatives = Array.isArray(item.alternatives) ? item.alternatives : [];
            }

            console.log(`✅ Converted item: ${finalQuantity} ${finalUnit} ${name}`.trim());

            return convertedItem;
        };

        try {
            if (Array.isArray(shoppingList.items)) {
                console.log('📋 Converting flat array format');
                shoppingList.items.forEach((item, index) => {
                    const converted = convertSingleItem(item, item?.category || 'Other', index);
                    if (converted) {
                        convertedItems.push(converted);
                    }
                });
            } else if (typeof shoppingList.items === 'object') {
                console.log('📂 Converting categorized object format');
                Object.entries(shoppingList.items).forEach(([category, categoryItems]) => {
                    // Validate category
                    if (!category || typeof category !== 'string') {
                        console.warn(`⚠️ Skipping invalid category:`, category);
                        return;
                    }

                    // Handle different categoryItems formats
                    if (Array.isArray(categoryItems)) {
                        // Normal case: array of items
                        categoryItems.forEach((item, index) => {
                            const converted = convertSingleItem(item, category, index);
                            if (converted) {
                                convertedItems.push(converted);
                            }
                        });
                    } else if (categoryItems && typeof categoryItems === 'object') {
                        // Edge case: single item object
                        console.warn(`⚠️ Category "${category}" contains single item instead of array`);
                        const converted = convertSingleItem(categoryItems, category, 0);
                        if (converted) {
                            convertedItems.push(converted);
                        }
                    } else {
                        console.warn(`⚠️ Category "${category}" contains invalid data:`, typeof categoryItems);
                    }
                });
            } else {
                console.error('❌ Unsupported shopping list items format:', typeof shoppingList.items);
            }
        } catch (conversionError) {
            console.error('❌ Error during conversion:', conversionError);
            console.error('📋 Problematic data:', shoppingList);
        }

        console.log(`✅ Conversion completed. Items: ${convertedItems.length}`);
        return convertedItems;
    }, []); // No dependencies needed for this function

    // FIXED: Move useMemo hooks to top level to follow Rules of Hooks
    const memoizedConvertedData = useMemo(() => {
        if (step !== 'results' || !shoppingList) {
            return { convertedItems: [], mode: 'enhanced', hasOptimization: false };
        }

        console.log('🔄 Converting shopping list for modal...');
        // Set mode based on whether price optimization was used
        const initialMode = options.includePriceOptimization ? 'smart' : 'enhanced';
        return {
            convertedItems: convertShoppingListForModal(shoppingList),
            mode: initialMode,
            hasOptimization: !!optimization
        };
    }, [step, shoppingList, options.includePriceOptimization, optimization, convertShoppingListForModal]);

    // Step 1: Options Configuration
    if (step === 'options') {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">🛒 Smart Shopping List</h2>
                                <p className="text-sm text-gray-600">{mealPlanName}</p>
                            </div>
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 text-xl"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* Options Form */}
                    <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                        <div className="space-y-6">
                            {/* Price Optimization */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-blue-900">💰 Price Intelligence</h3>
                                        <p className="text-sm text-blue-700">Find the best deals and optimize costs</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={options.includePriceOptimization}
                                            onChange={(e) => handleOptionChange('includePriceOptimization', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {options.includePriceOptimization && (
                                    <div className="space-y-4">
                                        {/* Budget */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Budget Limit (Optional)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={options.budget || ''}
                                                    onChange={(e) => handleOptionChange('budget', parseFloat(e.target.value) || null)}
                                                    className="pl-8 w-full border border-gray-300 rounded-lg px-3 py-2"
                                                    placeholder="No limit"
                                                />
                                            </div>
                                        </div>

                                        {/* Priority */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Optimization Priority
                                            </label>
                                            <select
                                                value={options.prioritize}
                                                onChange={(e) => handleOptionChange('prioritize', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                            >
                                                <option value="savings">💰 Maximum Savings</option>
                                                <option value="convenience">⚡ Convenience (Fewer Stores)</option>
                                                <option value="quality">⭐ Quality Products</option>
                                            </select>
                                        </div>

                                        {/* Max Stores */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Maximum Stores to Visit
                                            </label>
                                            <select
                                                value={options.maxStores}
                                                onChange={(e) => handleOptionChange('maxStores', parseInt(e.target.value))}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                            >
                                                <option value={1}>1 Store (Most Convenient)</option>
                                                <option value={2}>2 Stores (Balanced)</option>
                                                <option value={3}>3 Stores (Maximum Savings)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Inventory Integration */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h3 className="font-semibold text-green-900 mb-3">📦 Inventory Integration</h3>

                                <div className="space-y-3">
                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={options.useInventoryFirst}
                                            onChange={(e) => handleOptionChange('useInventoryFirst', e.target.checked)}
                                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <div>
                                            <div className="font-medium text-green-900">Use Inventory Items First</div>
                                            <div className="text-sm text-green-700">Skip items you already have</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={options.excludeExpiredInventory}
                                            onChange={(e) => handleOptionChange('excludeExpiredInventory', e.target.checked)}
                                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <div>
                                            <div className="font-medium text-green-900">Exclude Expired Items</div>
                                            <div className="text-sm text-green-700">Don't use expired inventory</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Additional Options */}
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h3 className="font-semibold text-purple-900 mb-3">⚙️ Additional Features</h3>

                                <div className="space-y-3">
                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={options.includeSubstitutions}
                                            onChange={(e) => handleOptionChange('includeSubstitutions', e.target.checked)}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <div>
                                            <div className="font-medium text-purple-900">Smart Substitutions</div>
                                            <div className="text-sm text-purple-700">Suggest cheaper alternatives</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={options.generateMealPrepSuggestions}
                                            onChange={(e) => handleOptionChange('generateMealPrepSuggestions', e.target.checked)}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <div>
                                            <div className="font-medium text-purple-900">Meal Prep Suggestions</div>
                                            <div className="text-sm text-purple-700">Tips for batch cooking</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            {priceData.dealOpportunities.length > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-yellow-900 mb-2">📊 Available Intelligence</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="font-medium text-yellow-900">Current Deals</div>
                                            <div className="text-yellow-700">{priceData.dealOpportunities.length} items on sale</div>
                                        </div>
                                        <div>
                                            <div className="font-medium text-yellow-900">Inventory Items</div>
                                            <div className="text-yellow-700">{inventory.length} items available</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={generateShoppingList}
                            disabled={loading}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 font-medium"
                        >
                            {options.includePriceOptimization ? '🚀 Generate Smart List' : '📝 Generate List'}
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Generation States (generating, optimizing)
    if (step === 'generating' || step === 'optimizing') {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {step === 'generating' ? '📝 Generating Shopping List...' : '💰 Optimizing Prices...'}
                    </h3>

                    <div className="space-y-2 text-sm text-gray-600">
                        <p>✓ Analyzing meal plan ingredients</p>
                        <p>✓ Checking your inventory</p>
                        {step === 'optimizing' && (
                            <>
                                <p>✓ Finding best deals and prices</p>
                                <p>🔄 Optimizing store recommendations...</p>
                            </>
                        )}
                    </div>

                    <div className="mt-6">
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                            Cancel
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        );
    }

    // Step 3: Error State
    if (error) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
                    <div className="text-4xl mb-4">❌</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Generation Failed</h3>
                    <p className="text-gray-600 mb-6 text-sm break-words">{error}</p>

                    <div className="flex space-x-3 justify-center">
                        <TouchEnhancedButton
                            onClick={retryGeneration}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Try Again
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                            Close
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        );
    }

    // Step 4: Results - Show Enhanced AI Shopping List Modal with Smart Price features
    if (step === 'results' && shoppingList) {
        console.log('🚀 Opening Enhanced AI Shopping List Modal:', {
            mode: memoizedConvertedData.mode,
            originalItemsStructure: typeof shoppingList.items,
            convertedItemsCount: memoizedConvertedData.convertedItems.length,
            priceOptimized: options.includePriceOptimization,
            hasOptimization: memoizedConvertedData.hasOptimization
        });

        // FIXED: Added fallback handling for empty results
        if (memoizedConvertedData.convertedItems.length === 0) {
            console.warn('⚠️ No items were successfully converted');
            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Items Found</h3>
                        <p className="text-gray-600 mb-6">
                            The shopping list was generated but no valid items were found. This might be because all
                            ingredients are already in your inventory.
                        </p>

                        <div className="flex space-x-3 justify-center">
                            <TouchEnhancedButton
                                onClick={retryGeneration}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Try Again
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            >
                                Close
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            );
        }

        // FIXED: Use a simple conditional render to prevent re-render loops
        // Format the data correctly for the modal
        return (
            <EnhancedAIShoppingListModal
                key="shopping-list-modal"
                isOpen={true}
                onClose={onClose}
                currentShoppingList={{
                    items: shoppingList.items,
                    summary: shoppingList.summary || shoppingList.stats || {
                        totalItems: memoizedConvertedData.convertedItems.length,
                        needToBuy: memoizedConvertedData.convertedItems.filter(item => !item.inInventory).length,
                        inInventory: memoizedConvertedData.convertedItems.filter(item => item.inInventory).length,
                        purchased: 0,
                        alreadyHave: memoizedConvertedData.convertedItems.filter(item => item.inInventory).length
                    },
                    generatedAt: shoppingList.generatedAt || new Date().toISOString(),
                    recipes: shoppingList.recipes || []
                }}
                sourceMealPlanId={mealPlanId}
                sourceRecipeIds={shoppingList.recipes?.map(r => r.id) || []}
                // SAFE FIX: Pass a wrapper function that checks for double saves
                onSave={(savedData) => {
                    if (!hasSaved) {
                        handleSaveToUnifiedModal(savedData);
                    } else {
                        console.log('🔄 Save already completed, modal save ignored');
                        onClose();
                    }
                }}
                initialBudget={options.budget}
                optimization={optimization}
                title={options.includePriceOptimization ? '🚀 Ultimate Shopping Assistant' : '🤖 Enhanced AI Shopping'}
                subtitle={options.includePriceOptimization ?
                    `Smart list for ${mealPlanName} with price optimization` :
                    `AI-optimized list for ${mealPlanName}`
                }
                showRefresh={false}
                initialShoppingMode={memoizedConvertedData.mode}
                shoppingList={shoppingList}
                priceAnalysis={{
                    totalSavings: optimization?.totalSavings || 0,
                    bestDeals: optimization?.bestDeals || [],
                    priceAlerts: [],
                    storeComparison: {}
                }}
                budgetTracking={{
                    current: optimization?.totalCost || 0,
                    limit: options.budget,
                    remaining: options.budget ? (options.budget - (optimization?.totalCost || 0)) : 0
                }}
            />
        );
    }

    return null;
}