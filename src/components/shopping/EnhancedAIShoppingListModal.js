'use client';
// file: /src/components/shopping/EnhancedAIShoppingListModal.js v10 - Part 1: Fixed Modal.com integration and API communication

import {useState, useEffect, useCallback, useMemo} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import EmailSharingModal from '@/components/sharing/EmailSharingModal';
import SaveShoppingListModal from '@/components/shared/SaveShoppingListModal';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {getAIOptimizedRoute, provideLearningFeedback, createAIShoppingSystem} from '@/lib/aiShoppingOptimizer';
import {CategoryUtils, GROCERY_CATEGORIES, suggestCategoryForItem} from '@/lib/groceryCategories';
import ShoppingListTotals from '@/components/shopping/ShoppingListTotals';
import PrintOptionsModal from '@/components/shopping/PrintOptionsModal';
import {ShoppingListTotalsCalculator} from '@/lib/shoppingListTotals';
import {VoiceInput} from '@/components/mobile/VoiceInput';
import {apiPost, apiGet} from '@/lib/api-config';
import {MobileHaptics} from '@/components/mobile/MobileHaptics';

export default function EnhancedAIShoppingListModal({
                                                        isOpen,
                                                        onClose,
                                                        shoppingList,
                                                        title = '🛒 Smart Shopping Assistant',
                                                        subtitle = null,
                                                        sourceRecipeIds = [],
                                                        sourceMealPlanId = null,
                                                        onRefresh = null,
                                                        showRefresh = false,
                                                        initialItems = [],
                                                        storePreference = '',
                                                        budgetLimit = null,
                                                        onSave,
                                                        optimization = null,
                                                        initialMode = 'enhanced'
                                                    }) {
    const {data: session} = useSafeSession();

    // All state declarations at the top
    const [filter, setFilter] = useState('all');
    const [purchasedItems, setPurchasedItems] = useState({});
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [shoppingMode, setShoppingMode] = useState(initialMode);
    const [showModeSelector, setShowModeSelector] = useState(false);

    // AI Enhancement State
    const [aiMode, setAiMode] = useState('basic');
    const [aiOptimization, setAiOptimization] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiInsights, setAiInsights] = useState(null);
    const [smartSuggestions, setSmartSuggestions] = useState(null);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [learningProgress, setLearningProgress] = useState(null);

    // Smart Price Shopping List State
    const [priceComparison, setPriceComparison] = useState({});
    const [priceMode, setPriceMode] = useState('smart');
    const [budgetTracking, setBudgetTracking] = useState({
        current: 0,
        limit: budgetLimit,
        remaining: budgetLimit
    });
    const [priceAnalysis, setPriceAnalysis] = useState({
        totalSavings: 0,
        bestDeals: [],
        priceAlerts: [],
        storeComparison: {}
    });
    const [showOptimizationDetails, setShowOptimizationDetails] = useState(false);
    const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
    const [loading, setLoading] = useState(false);

    // Category Management State (keeping working version)
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [movingItem, setMovingItem] = useState(null);
    const [availableCategories, setAvailableCategories] = useState([]);
    const [customCategories, setCustomCategories] = useState({});
    const [editingCategories, setEditingCategories] = useState(false);

    // Store Layout State
    const [selectedStore, setSelectedStore] = useState(storePreference);
    const [stores, setStores] = useState([]);
    const [showStoreSelector, setShowStoreSelector] = useState(false);

    // Shopping Progress Tracking
    const [shoppingProgress, setShoppingProgress] = useState({
        startTime: null,
        completedSections: [],
        currentSection: 0,
        timePerSection: {},
        routeDeviations: []
    });

    // User Preferences and Totals
    const [showTotals, setShowTotals] = useState(false);
    const [userPreferences, setUserPreferences] = useState({
        currency: 'USD',
        currencySymbol: '$',
        currencyPosition: 'before',
        decimalPlaces: 2,
        taxRate: 0.06,
        region: 'IA',
        budget: null
    });
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [totalsCalculator] = useState(() => new ShoppingListTotalsCalculator());

    // Voice Input State
    const [showVoiceInput, setShowVoiceInput] = useState(false);
    const [voiceResults, setVoiceResults] = useState('');
    const [processingVoice, setProcessingVoice] = useState(false);

    // Shopping List State
    const [currentShoppingList, setCurrentShoppingList] = useState(null);

    // UI State
    const [headerCollapsed, setHeaderCollapsed] = useState(false);
    const [footerCollapsed, setFooterCollapsed] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // Helper functions - memoized to prevent re-creation
    const getAISuggestedCategory = useCallback((itemName) => {
        try {
            const preferences = JSON.parse(localStorage.getItem(`item-category-preferences-${session?.user?.id}`) || '{}');
            const normalizedName = itemName.toLowerCase().replace(/\b(fresh|frozen|canned|dried|ground|chopped|sliced|diced)\b/g, '').trim();

            if (preferences[normalizedName]) {
                return preferences[normalizedName];
            }

            return suggestCategoryForItem(itemName);
        } catch (error) {
            return suggestCategoryForItem(itemName);
        }
    }, [session?.user?.id]);

    const saveItemCategoryPreference = useCallback((itemName, category) => {
        try {
            const preferences = JSON.parse(localStorage.getItem(`item-category-preferences-${session?.user?.id}`) || '{}');
            const normalizedName = itemName.toLowerCase().replace(/\b(fresh|frozen|canned|dried|ground|chopped|sliced|diced)\b/g, '').trim();
            preferences[normalizedName] = category;
            localStorage.setItem(`item-category-preferences-${session?.user?.id}`, JSON.stringify(preferences));
            console.log(`💾 Saved preference: ${normalizedName} → ${category}`);
        } catch (error) {
            console.error('Error saving item category preference:', error);
        }
    }, [session?.user?.id]);

    // Data conversion and processing functions
    const convertSmartPriceToEnhanced = useCallback((smartPriceItems) => {
        console.log('🔄 Converting smart price items:', smartPriceItems.length);

        const items = {};

        if (!Array.isArray(smartPriceItems)) {
            console.warn('⚠️ smartPriceItems is not an array:', typeof smartPriceItems);
            return {
                items: {},
                summary: {totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0},
                generatedAt: new Date().toISOString()
            };
        }

        smartPriceItems.forEach((item, index) => {
            if (!item) {
                console.warn(`⚠️ Skipping null/undefined item at index ${index}`);
                return;
            }

            let processedItem;

            if (typeof item === 'string') {
                processedItem = {
                    id: `item-${index}-${Date.now()}`,
                    name: item,
                    ingredient: item,
                    checked: false,
                    selected: true,
                    quantity: 1,
                    unit: '',
                    estimatedPrice: 0,
                    actualPrice: null,
                    priceOptimized: false,
                    dealStatus: 'normal',
                    alternatives: [],
                    category: getAISuggestedCategory(item)
                };
            } else if (typeof item === 'object') {
                processedItem = {
                    id: item.id || `item-${index}-${Date.now()}`,
                    name: item.name || item.ingredient || 'Unknown Item',
                    ingredient: item.ingredient || item.name || 'Unknown Item',
                    checked: item.checked || false,
                    selected: item.selected !== false,
                    quantity: item.quantity || item.amount || 1,
                    unit: item.unit || '',
                    estimatedPrice: item.estimatedPrice || item.priceInfo?.estimatedPrice || 0,
                    actualPrice: item.actualPrice || null,
                    priceOptimized: item.priceOptimized || !!item.priceInfo?.bestPrice,
                    dealStatus: item.dealStatus || item.priceInfo?.dealStatus || 'normal',
                    alternatives: item.alternatives || item.priceInfo?.alternatives || [],
                    recipes: item.recipes || [],
                    category: item.category || getAISuggestedCategory(item.name || item.ingredient || 'Unknown Item'),
                    inInventory: item.inInventory || false,
                    inventoryItem: item.inventoryItem || null
                };
            } else {
                console.warn(`⚠️ Skipping invalid item type at index ${index}:`, typeof item);
                return;
            }

            // Ensure category is valid and not numeric
            let categoryName = processedItem.category;

            if (!categoryName ||
                typeof categoryName === 'number' ||
                /^\d+$/.test(categoryName) ||
                !CategoryUtils.isValidCategory(categoryName)) {

                console.log(`🔧 Fixing invalid category "${categoryName}" for item "${processedItem.ingredient}"`);
                categoryName = getAISuggestedCategory(processedItem.ingredient);
            }

            if (!items[categoryName]) {
                items[categoryName] = [];
            }
            items[categoryName].push({...processedItem, category: categoryName});
        });

        console.log('✅ Conversion complete. Categories:', Object.keys(items));
        return {
            items,
            summary: {
                totalItems: smartPriceItems.length,
                needToBuy: smartPriceItems.length,
                inInventory: 0,
                purchased: 0
            },
            generatedAt: new Date().toISOString()
        };
    }, [getAISuggestedCategory]);

    const mergeShoppingLists = useCallback((enhancedList, smartPriceItems) => {
        const merged = {...enhancedList};
        const mergedItems = {...merged.items};

        smartPriceItems.forEach((item, index) => {
            const itemName = typeof item === 'string' ? item : (item.name || item.ingredient);
            const category = typeof item === 'string' ? getAISuggestedCategory(item) : (item.category || getAISuggestedCategory(itemName));

            const existsInCategory = mergedItems[category]?.find(existing =>
                (existing.ingredient || existing.name)?.toLowerCase() === itemName.toLowerCase()
            );

            if (!existsInCategory) {
                if (!mergedItems[category]) mergedItems[category] = [];

                const newItem = typeof item === 'string' ? {
                    id: `smart-${index}`,
                    name: item,
                    ingredient: item,
                    estimatedPrice: 0,
                    priceOptimized: true,
                    fromSmartPrice: true
                } : {
                    ...item,
                    id: item.id || `smart-${index}`,
                    fromSmartPrice: true
                };

                mergedItems[category].push(newItem);
            }
        });

        merged.items = mergedItems;
        return merged;
    }, [getAISuggestedCategory]);

    // Initialize data
    const processInitialData = useCallback(() => {
        console.log('🔄 Processing initial data:', {
            hasShoppingList: !!shoppingList,
            initialItemsCount: initialItems.length,
            initialized
        });

        if (initialized) return;

        if (shoppingList) {
            setCurrentShoppingList(shoppingList);
            if (initialItems.length > 0) {
                const mergedList = mergeShoppingLists(shoppingList, initialItems);
                setCurrentShoppingList(mergedList);
            }
        } else if (initialItems.length > 0) {
            const convertedList = convertSmartPriceToEnhanced(initialItems);
            setCurrentShoppingList(convertedList);
            setShoppingMode('smart-price');
        }

        if (optimization) {
            setPriceAnalysis({
                totalSavings: optimization.totalSavings || 0,
                bestDeals: optimization.bestDeals || optimization.dealAlerts || [],
                priceAlerts: optimization.priceAlerts || [],
                storeComparison: optimization.storeComparison || {}
            });
        }

        setInitialized(true);
    }, [shoppingList, initialItems, optimization, initialized, convertSmartPriceToEnhanced, mergeShoppingLists]);

    // Load functions
    const loadPreferences = useCallback(() => {
        try {
            const savedStore = localStorage.getItem('preferred-shopping-store');
            const savedAiMode = localStorage.getItem('ai-shopping-mode');
            const savedShoppingMode = localStorage.getItem('preferred-shopping-mode');

            if (savedStore) setSelectedStore(savedStore);
            if (savedAiMode) setAiMode(savedAiMode);
            if (savedShoppingMode) setShoppingMode(savedShoppingMode);
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }, []);

    const loadUserPreferences = useCallback(() => {
        try {
            if (session?.user?.currencyPreferences) {
                setUserPreferences(prev => ({
                    ...prev,
                    currency: session.user.currencyPreferences.currency || 'USD',
                    currencySymbol: session.user.currencyPreferences.currencySymbol || '$',
                    currencyPosition: session.user.currencyPreferences.currencyPosition || 'before',
                    decimalPlaces: session.user.currencyPreferences.decimalPlaces || 2
                }));
            }

            const saved = localStorage.getItem('shopping-preferences');
            if (saved) {
                const parsed = JSON.parse(saved);
                setUserPreferences(prev => ({...prev, ...parsed}));

                if (parsed.budget) {
                    setBudgetTracking(prev => ({
                        ...prev,
                        limit: parsed.budget,
                        remaining: prev.current ? parsed.budget - prev.current : parsed.budget
                    }));
                }
            }
        } catch (error) {
            console.error('Error loading user preferences:', error);
        }
    }, [session?.user?.currencyPreferences]);

    const fetchStores = useCallback(async () => {
        try {
            const response = await fetch('/api/stores');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                setStores(data.stores || []);
            }
        } catch (error) {
            console.error('Error fetching stores:', error);
            setStores([]);
        }
    }, []);

    const loadCustomCategories = useCallback(async () => {
        try {
            const defaultCategories = CategoryUtils.getDefaultCategoryOrder();
            setAvailableCategories(defaultCategories);

            const response = await fetch('/api/categories/custom');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.customCategories) {
                    setCustomCategories(data.customCategories);
                }
            }

            const saved = localStorage.getItem(`custom-categories-${session?.user?.id}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                setCustomCategories(prev => ({...prev, ...parsed}));
            }
        } catch (error) {
            console.error('Error loading custom categories:', error);
            setAvailableCategories(CategoryUtils.getDefaultCategoryOrder());
            setCustomCategories({});
        }
    }, [session?.user?.id]);

    const getAISmartSuggestions = useCallback(async (items) => {
        console.log('🧠 Getting AI smart suggestions from Modal.com...');
        console.log('📊 Input items for AI analysis:', items);

        if (!items || !Array.isArray(items) || items.length === 0) {
            console.warn('⚠️ No items provided for AI suggestions');
            return [];
        }

        try {
            // Convert items to the format expected by Modal.com
            const inventoryData = items.map(item => {
                const name = item.ingredient || item.name || 'Unknown Item';
                const category = item.category || 'Other';
                const quantity = item.quantity || item.amount || 1;
                const unit = item.unit || '';

                return {
                    name: String(name).trim(),
                    category: String(category).trim(),
                    quantity: parseFloat(quantity) || 1,
                    unit: String(unit).trim(),
                    inInventory: !!item.inInventory,
                    optional: !!item.optional
                };
            }).filter(item => item.name && item.name !== 'Unknown Item');

            if (inventoryData.length === 0) {
                console.warn('⚠️ No valid items found after conversion');
                return [];
            }

            console.log('📋 Converted inventory data for Modal.com:', inventoryData);

            // Prepare the payload for Modal.com (same format that worked in our test)
            const payload = {
                type: 'recipe_suggestions',
                userId: session?.user?.id || 'anonymous',
                data: {
                    inventory: inventoryData,
                    preferences: {
                        difficulty: 'easy',
                        cookingTime: 30,
                        servings: 4,
                        dietaryRestrictions: [],
                        cuisine: 'any'
                    },
                    context: {
                        timestamp: new Date().toISOString(),
                        source: 'shopping_list_modal',
                        itemCount: inventoryData.length
                    }
                }
            };

            console.log('📤 Sending request to Modal.com...');

            const response = await fetch('https://docbear71--smart-inventory-manager-suggest-ingredients.modal.run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });

            console.log('📥 Modal.com response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Modal.com API error: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Modal.com response data:', data);

            // Process the response (we know it returns suggestions array)
            const suggestions = data.suggestions || [];

            const formattedSuggestions = suggestions.slice(0, 5).map((suggestion, index) => ({
                name: suggestion.name || suggestion.title || `Recipe ${index + 1}`,
                description: suggestion.description || suggestion.summary ||
                    'AI-generated recipe suggestion based on your ingredients',
                cookingTime: suggestion.cookingTime || suggestion.prepTime || 30,
                difficulty: suggestion.difficulty || 'easy',
                inventoryUsage: suggestion.inventoryUsage || 0.7,
                missingIngredients: Array.isArray(suggestion.missingIngredients)
                    ? suggestion.missingIngredients.slice(0, 3) : [],
                id: suggestion.id || `ai-suggestion-${Date.now()}-${index}`
            }));

            console.log('✅ Processed AI suggestions:', formattedSuggestions);

            // Update AI insights
            setAiInsights({
                utilization: {
                    utilizationPercentage: data.utilization?.utilizationPercentage || 70,
                    expiringItemsUsed: 0
                },
                fallback: false,
                lastUpdated: new Date().toISOString(),
                source: 'modal.com'
            });

            return formattedSuggestions;

        } catch (error) {
            console.error('❌ AI suggestions error:', error);

            setAiInsights({
                error: error.message,
                fallback: true,
                lastUpdated: new Date().toISOString()
            });

            // Return simple fallback suggestions
            return [
                {
                    name: "Quick Stir-Fry",
                    description: "A simple stir-fry using your available ingredients",
                    cookingTime: 15,
                    difficulty: "easy",
                    inventoryUsage: 0.6,
                    missingIngredients: ['cooking oil', 'soy sauce'],
                    id: `fallback-${Date.now()}-1`
                }
            ];
        }
    }, [session?.user?.id, setAiInsights]);

// Fallback suggestion generator
    const generateFallbackSuggestions = useCallback((items) => {
        const categories = [...new Set(items.map(item => item.category || 'Other'))];
        const itemNames = items.map(item => item.ingredient || item.name).filter(Boolean);

        const templates = [
            {
                name: "Quick Stir-Fry",
                description: `A simple stir-fry using ${itemNames.slice(0, 3).join(', ')}`,
                cookingTime: 15,
                difficulty: "easy"
            },
            {
                name: "One-Pot Meal",
                description: `A hearty one-pot dish combining your available ingredients`,
                cookingTime: 25,
                difficulty: "easy"
            },
            {
                name: "Simple Soup",
                description: `A comforting soup made with ${categories.join(' and ')} ingredients`,
                cookingTime: 30,
                difficulty: "easy"
            }
        ];

        return templates.slice(0, 2).map((template, index) => ({
            ...template,
            inventoryUsage: 0.6,
            missingIngredients: ['seasoning', 'cooking oil'],
            id: `fallback-${Date.now()}-${index}`
        }));
    }, []);

    const initializeAISystem = useCallback(async () => {
        if (!session?.user?.id) return;

        try {
            console.log('🤖 Initializing AI Shopping System...');

            const aiSystem = createAIShoppingSystem(session.user.id);
            const learningStatus = aiSystem.getLearningStatus();
            setLearningProgress(learningStatus);

            if (currentShoppingList?.items) {
                const allItems = Object.values(currentShoppingList.items).flat();
                if (allItems.length > 0) {
                    await getAISmartSuggestions(allItems);
                }
            }

            console.log('✅ AI Shopping System initialized:', learningStatus);
        } catch (error) {
            console.error('Error initializing AI system:', error);
        }
    }, [session?.user?.id, currentShoppingList?.items, getAISmartSuggestions]);

    // Item and category management (keeping working version)
    const handleMoveItemToCategory = useCallback(async (item, fromCategory, toCategory) => {
        if (fromCategory === toCategory) return;

        console.log(`🔄 Moving ${item.ingredient || item.name} from ${fromCategory} to ${toCategory}`);

        const updatedShoppingList = {...currentShoppingList};
        const updatedItems = {...updatedShoppingList.items};

        // Remove from source category
        if (updatedItems[fromCategory]) {
            updatedItems[fromCategory] = updatedItems[fromCategory].filter(
                listItem => {
                    const itemId = listItem.id || `${listItem.ingredient || listItem.name}`;
                    const moveItemId = item.id || `${item.ingredient || item.name}`;
                    return itemId !== moveItemId;
                }
            );

            if (updatedItems[fromCategory].length === 0) {
                delete updatedItems[fromCategory];
            }
        }

        // Add to destination category
        if (!updatedItems[toCategory]) {
            updatedItems[toCategory] = [];
        }

        const updatedItem = {...item, category: toCategory};
        updatedItems[toCategory].push(updatedItem);

        updatedShoppingList.items = updatedItems;
        setCurrentShoppingList(updatedShoppingList);

        saveItemCategoryPreference(item.ingredient || item.name, toCategory);
        setMovingItem(null);

        console.log('✅ Item moved successfully');
    }, [currentShoppingList, saveItemCategoryPreference]);

    // Smart Price Shopping List Functions
    const optimizeShoppingList = useCallback(async () => {
        if (!currentShoppingList?.items || Object.keys(currentShoppingList.items).length === 0) return;

        setLoading(true);
        try {
            const allItems = Object.values(currentShoppingList.items).flat();

            // Get price data for all items
            const pricePromises = allItems.map(async (item) => {
                try {
                    const response = await fetch(`/api/shopping/price-lookup?item=${encodeURIComponent(item.ingredient || item.name)}&store=${selectedStore}`);
                    const data = await response.json();
                    return {
                        itemName: item.ingredient || item.name,
                        prices: data.success ? data.prices : [],
                        currentBestPrice: data.currentBestPrice || null,
                        inventoryMatch: data.inventoryMatch || null
                    };
                } catch (error) {
                    console.error(`Error fetching price for ${item.ingredient || item.name}:`, error);
                    return {itemName: item.ingredient || item.name, prices: [], currentBestPrice: null};
                }
            });

            const priceData = await Promise.all(pricePromises);

            // Create price comparison object
            const comparison = {};
            priceData.forEach(item => {
                comparison[item.itemName] = item;
            });
            setPriceComparison(comparison);

            // Calculate optimization recommendations
            const optimizationResult = calculatePriceOptimization(priceData, selectedStore, budgetTracking.limit);

            // Merge with existing optimization data
            setPriceAnalysis(prev => ({
                ...prev,
                ...optimizationResult,
                bestDeals: [...(prev.bestDeals || []), ...(optimizationResult.dealAlerts || [])],
                storeRecommendations: optimizationResult.storeRecommendations || []
            }));

            // Update budget tracking
            calculateBudgetTracking();

        } catch (error) {
            console.error('Error optimizing shopping list:', error);
        } finally {
            setLoading(false);
        }
    }, [currentShoppingList?.items, selectedStore, budgetTracking.limit]);

    const calculatePriceOptimization = useCallback((priceData, store, budget) => {
        let totalCost = 0;
        let potentialSavings = 0;
        let dealAlerts = [];
        let budgetWarnings = [];
        let storeRecommendations = [];

        // Calculate costs and find deals
        priceData.forEach(item => {
            const currentPrice = item.currentBestPrice?.price || 0;
            const avgPrice = item.prices.length > 0
                ? item.prices.reduce((sum, p) => sum + p.price, 0) / item.prices.length
                : currentPrice;

            totalCost += currentPrice;

            // Check for good deals (20% below average)
            if (currentPrice > 0 && avgPrice > 0 && currentPrice <= avgPrice * 0.8) {
                dealAlerts.push({
                    item: item.itemName,
                    currentPrice,
                    avgPrice,
                    savings: avgPrice - currentPrice,
                    savingsPercent: ((avgPrice - currentPrice) / avgPrice * 100).toFixed(1)
                });
            }

            // Find better prices at other stores
            const betterPrices = item.prices.filter(p =>
                p.store !== store && p.price < currentPrice
            ).sort((a, b) => a.price - b.price);

            if (betterPrices.length > 0) {
                const bestAlternative = betterPrices[0];
                potentialSavings += currentPrice - bestAlternative.price;
                storeRecommendations.push({
                    item: item.itemName,
                    currentStore: store,
                    currentPrice,
                    betterStore: bestAlternative.store,
                    betterPrice: bestAlternative.price,
                    savings: currentPrice - bestAlternative.price
                });
            }
        });

        // Budget analysis
        if (budget && totalCost > budget) {
            budgetWarnings.push({
                type: 'over_budget',
                amount: totalCost - budget,
                message: `You're $${(totalCost - budget).toFixed(2)} over your budget of $${budget.toFixed(2)}`
            });
        }

        return {
            totalCost,
            potentialSavings,
            dealAlerts,
            budgetWarnings,
            storeRecommendations,
            itemCount: priceData.length,
            avgPricePerItem: totalCost / (priceData.length || 1)
        };
    }, []);

    const calculateBudgetTracking = useCallback(() => {
        if (!currentShoppingList?.items) return;

        const allItems = Object.values(currentShoppingList.items).flat();
        const selectedItems = allItems.filter(item => item.selected !== false);
        const totalCost = selectedItems.reduce((sum, item) => {
            const price = item.actualPrice || item.estimatedPrice || 0;
            const quantity = item.quantity || 1;
            return sum + (price * quantity);
        }, 0);

        setBudgetTracking(prev => ({
            ...prev,
            current: totalCost,
            remaining: prev.limit ? prev.limit - totalCost : null
        }));
    }, [currentShoppingList?.items]);

    const handleQuantityChange = useCallback((itemId, newQuantity) => {
        const updatedShoppingList = {...currentShoppingList};
        const updatedItems = {...updatedShoppingList.items};

        Object.keys(updatedItems).forEach(category => {
            updatedItems[category] = updatedItems[category].map(item =>
                item.id === itemId || (item.ingredient || item.name) === itemId
                    ? {...item, quantity: Math.max(0, newQuantity)}
                    : item
            );
        });

        updatedShoppingList.items = updatedItems;
        setCurrentShoppingList(updatedShoppingList);
        calculateBudgetTracking();
        MobileHaptics?.light();
    }, [currentShoppingList, calculateBudgetTracking]);

    const handlePriceUpdate = useCallback((itemId, actualPrice) => {
        const updatedShoppingList = {...currentShoppingList};
        const updatedItems = {...updatedShoppingList.items};

        Object.keys(updatedItems).forEach(category => {
            updatedItems[category] = updatedItems[category].map(item =>
                item.id === itemId || (item.ingredient || item.name) === itemId
                    ? {...item, actualPrice: parseFloat(actualPrice) || 0}
                    : item
            );
        });

        updatedShoppingList.items = updatedItems;
        setCurrentShoppingList(updatedShoppingList);
        calculateBudgetTracking();
    }, [currentShoppingList, calculateBudgetTracking]);

    const selectAlternative = useCallback(async (itemId, alternative) => {
        setLoading(true);
        try {
            const updatedShoppingList = {...currentShoppingList};
            const updatedItems = {...updatedShoppingList.items};

            Object.keys(updatedItems).forEach(category => {
                updatedItems[category] = updatedItems[category].map(item =>
                    item.id === itemId || (item.ingredient || item.name) === itemId
                        ? {
                            ...item,
                            name: alternative.name,
                            ingredient: alternative.name,
                            estimatedPrice: alternative.price,
                            priceOptimized: true,
                            selectedAlternative: alternative
                        }
                        : item
                );
            });

            updatedShoppingList.items = updatedItems;
            setCurrentShoppingList(updatedShoppingList);
            calculateBudgetTracking();
            MobileHaptics?.success();
        } catch (error) {
            console.error('Error selecting alternative:', error);
            MobileHaptics?.error();
        } finally {
            setLoading(false);
        }
    }, [currentShoppingList, calculateBudgetTracking]);

    const getFoodSafetyPriority = (category) => {
        const priorityMap = {
            'Fresh Meat': 1,
            'Fresh Seafood': 1,
            'Dairy': 2,
            'Frozen Foods': 3,
            'Fresh Fruits': 4,
            'Fresh Vegetables': 4,
            'Bread & Bakery': 5,
            'Pantry Staples': 6,
            'Canned Goods': 7,
            'Cleaning Supplies': 8,
            'Personal Care': 9,
            'Other': 10
        };
        return priorityMap[category] || 10;
    };

    const optimizeForBudget = useCallback(async () => {
        if (!budgetTracking.limit) {
            alert('Please set a budget limit first');
            return;
        }

        setLoading(true);
        try {
            const allItems = Object.values(currentShoppingList.items).flat();
            const selectedItems = allItems.filter(item => item.selected !== false);

            const response = await apiPost('/api/price-tracking/budget-optimize', {
                    items: selectedItems,
                    budgetLimit: budgetTracking.limit,
                    currentTotal: budgetTracking.current,
                    store: selectedStore
            });

            const data = await response.json();
            if (data.success) {
                const updatedShoppingList = {...currentShoppingList};
                const updatedItems = {...updatedShoppingList.items};

                Object.keys(updatedItems).forEach(category => {
                    updatedItems[category] = updatedItems[category].map(item => {
                        const optimization = data.optimizations?.find(opt =>
                            opt.itemId === item.id || opt.itemId === (item.ingredient || item.name)
                        );
                        if (optimization) {
                            return {
                                ...item,
                                ...optimization.changes,
                                budgetOptimized: true
                            };
                        }
                        return item;
                    });
                });

                updatedShoppingList.items = updatedItems;
                setCurrentShoppingList(updatedShoppingList);
                calculateBudgetTracking();
                MobileHaptics?.success();
            }
        } catch (error) {
            console.error('Budget optimization error:', error);
            MobileHaptics?.error();
        } finally {
            setLoading(false);
        }
    }, [budgetTracking.limit, budgetTracking.current, currentShoppingList, selectedStore, calculateBudgetTracking]);

    // Main initialization effect
    useEffect(() => {
        if (!isOpen) {
            // Reset all state when modal closes
            setFilter('all');
            setPurchasedItems({});
            setShowEmailModal(false);
            setShowSaveModal(false);
            setShowActions(false);
            setAiMode('basic');
            setAiOptimization(null);
            setShowAiPanel(false);
            setShowCategoryManager(false);
            setMovingItem(null);
            setCurrentShoppingList(null);
            setShowTotals(false);
            setShowPrintModal(false);
            setShowVoiceInput(false);
            setVoiceResults('');
            setProcessingVoice(false);
            setShowModeSelector(false);
            setPriceComparison({});
            setPriceAnalysis({
                totalSavings: 0,
                bestDeals: [],
                priceAlerts: [],
                storeComparison: {}
            });
            setHeaderCollapsed(false);
            setFooterCollapsed(false);
            setInitialized(false);
            setAiLoading(false);
            setSmartSuggestions(null);
            setAiInsights(null);
            return;
        }

        if (!initialized) {
            console.log('🚀 Initializing Enhanced AI Shopping Modal...');
            loadPreferences();
            fetchStores();
            loadCustomCategories();
            loadUserPreferences();
            processInitialData();

            setTimeout(() => {
                initializeAISystem();
            }, 500);

            setTimeout(() => {
                autoTriggerAISuggestions();
            }, 1000);
        }
    }, [isOpen, initialized, loadPreferences, fetchStores, loadCustomCategories, loadUserPreferences, processInitialData, initializeAISystem]);

    const autoTriggerAISuggestions = useCallback(async () => {
        console.log('🤖 Auto-triggering AI suggestions...');

        if (!currentShoppingList || !currentShoppingList.items) {
            console.log('⚠️ No shopping list available for AI suggestions');
            return;
        }

        try {
            // Convert shopping list items to flat array for AI processing
            let allItems = [];

            if (Array.isArray(currentShoppingList.items)) {
                allItems = currentShoppingList.items;
            } else if (typeof currentShoppingList.items === 'object') {
                // Flatten categorized items
                Object.values(currentShoppingList.items).forEach(categoryItems => {
                    if (Array.isArray(categoryItems)) {
                        allItems.push(...categoryItems);
                    }
                });
            }

            if (allItems.length === 0) {
                console.log('⚠️ No items found in shopping list');
                return;
            }

            console.log('📋 Processing', allItems.length, 'items for AI suggestions');

            // Call the AI suggestions function
            const suggestions = await getAISmartSuggestions(allItems);

            if (suggestions && suggestions.length > 0) {
                console.log('✅ AI suggestions received:', suggestions.length, 'suggestions');
                setSmartSuggestions(suggestions);
                setShowAiPanel(true); // Automatically show the AI panel
            } else {
                console.log('⚠️ No AI suggestions received');
            }

        } catch (error) {
            console.error('❌ Auto-trigger AI suggestions error:', error);
        }
    }, [currentShoppingList, getAISmartSuggestions]);

    // Normalize shopping list data
    const normalizedList = useMemo(() => {
        if (!currentShoppingList) return {
            items: {},
            summary: {totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0}
        };

        let normalizedItems = {};
        let summary = currentShoppingList.summary || currentShoppingList.stats || {};

        if (currentShoppingList.items) {
            if (Array.isArray(currentShoppingList.items)) {
                console.log('📋 Normalizing flat array of items');
                currentShoppingList.items.forEach((item, index) => {
                    if (!item || typeof item !== 'object') {
                        console.warn(`⚠️ Skipping invalid item at index ${index}:`, item);
                        return;
                    }

                    let category = item.category;

                    // FIX: Handle numeric or invalid categories
                    if (!category ||
                        typeof category === 'number' ||
                        /^\d+$/.test(category) ||
                        category === 'undefined' ||
                        category === null) {

                        category = getAISuggestedCategory(item.ingredient || item.name);
                        console.log(`🔧 Fixed invalid category for "${item.ingredient || item.name}": ${category}`);
                    }

                    // Ensure category is a valid string
                    if (typeof category !== 'string' || category.trim() === '') {
                        category = 'Other';
                    }

                    if (!normalizedItems[category]) {
                        normalizedItems[category] = [];
                    }
                    normalizedItems[category].push({
                        ...item,
                        category,
                        id: item.id || `normalized-${index}-${Date.now()}`
                    });
                });
            } else if (typeof currentShoppingList.items === 'object' && currentShoppingList.items !== null) {
                console.log('📂 Normalizing categorized items object');
                Object.entries(currentShoppingList.items).forEach(([category, categoryItems]) => {
                    // FIX: Skip numeric categories completely
                    if (/^\d+$/.test(category)) {
                        console.log(`🔧 Skipping numeric category: ${category}`);
                        if (Array.isArray(categoryItems)) {
                            categoryItems.forEach(item => {
                                if (item && typeof item === 'object' && (item.ingredient || item.name)) {
                                    const properCategory = getAISuggestedCategory(item.ingredient || item.name);
                                    if (!normalizedItems[properCategory]) {
                                        normalizedItems[properCategory] = [];
                                    }
                                    normalizedItems[properCategory].push({
                                        ...item,
                                        category: properCategory,
                                        id: item.id || `fixed-${Date.now()}-${Math.random()}`
                                    });
                                }
                            });
                        }
                        return;
                    }

                    // Ensure valid category name
                    const validCategory = (typeof category === 'string' &&
                        category !== 'undefined' &&
                        category.trim() !== '') ? category : 'Other';

                    if (Array.isArray(categoryItems)) {
                        normalizedItems[validCategory] = categoryItems.filter(item =>
                            item && typeof item === 'object' && (item.ingredient || item.name)
                        ).map(item => ({
                            ...item,
                            category: validCategory,
                            id: item.id || `cat-${Date.now()}-${Math.random()}`
                        }));
                    } else if (categoryItems && typeof categoryItems === 'object' && (categoryItems.ingredient || categoryItems.name)) {
                        normalizedItems[validCategory] = [{
                            ...categoryItems,
                            category: validCategory,
                            id: categoryItems.id || `single-${Date.now()}`
                        }];
                    }
                });
            }
        }

        // Clean up empty categories
        Object.keys(normalizedItems).forEach(category => {
            if (!Array.isArray(normalizedItems[category]) || normalizedItems[category].length === 0) {
                delete normalizedItems[category];
            }
        });

        console.log('✅ Normalized categories:', Object.keys(normalizedItems));

        return {
            items: normalizedItems,
            summary: {
                totalItems: summary.totalItems || 0,
                needToBuy: summary.needToBuy || 0,
                inInventory: summary.inInventory || summary.alreadyHave || 0,
                purchased: summary.purchased || 0
            },
            generatedAt: currentShoppingList.generatedAt || new Date().toISOString(),
            recipes: currentShoppingList.recipes || []
        };
    }, [currentShoppingList, getAISuggestedCategory]);

    // Helper functions for rendering
    const getModeConfig = useCallback(() => {
        const configs = {
            'enhanced': {
                title: '🤖 Enhanced AI Shopping',
                subtitle: 'Full-featured shopping with AI optimization',
                showPriceFeatures: false,
                showAdvancedFeatures: true,
                primaryColor: '#7c3aed'
            },
            'smart-price': {
                title: '💰 Smart Price Shopping',
                subtitle: 'Price-optimized shopping with deals',
                showPriceFeatures: true,
                showAdvancedFeatures: false,
                primaryColor: '#059669'
            },
            'unified': {
                title: '🚀 Ultimate Shopping Assistant',
                subtitle: 'All features: AI optimization + Price intelligence',
                showPriceFeatures: true,
                showAdvancedFeatures: true,
                primaryColor: '#0ea5e9'
            }
        };
        return configs[shoppingMode] || configs['enhanced'];
    }, [shoppingMode]);

    const addPurchasedStatus = useCallback((items) => {
        if (!Array.isArray(items)) {
            console.warn('addPurchasedStatus received non-array items:', typeof items, items);
            return [];
        }

        return items.map(item => {
            if (!item) return null;
            const itemKey = `${item.ingredient || item.name}-${item.category || 'other'}`;
            return {
                ...item,
                purchased: purchasedItems[itemKey] || false,
                itemKey
            };
        }).filter(item => item !== null);
    }, [purchasedItems]);

    const getFilteredItems = useCallback((items) => {
        if (!Array.isArray(items)) {
            console.warn('getFilteredItems received non-array:', typeof items, items);
            return [];
        }

        const itemsWithStatus = addPurchasedStatus(items);

        switch (filter) {
            case 'needToBuy':
                return itemsWithStatus.filter(item => !item.inInventory && !item.purchased);
            case 'inInventory':
                return itemsWithStatus.filter(item => item.inInventory);
            case 'purchased':
                return itemsWithStatus.filter(item => item.purchased);
            default:
                return itemsWithStatus;
        }
    }, [filter, addPurchasedStatus]);

    const getGroupedItems = useCallback(() => {
        if (aiMode === 'ai-optimized' && aiOptimization) {
            return aiOptimization.optimizedRoute.reduce((grouped, section) => {
                const sectionItems = [];
                section.categories.forEach(category => {
                    if (normalizedList.items[category] && Array.isArray(normalizedList.items[category])) {
                        const filtered = getFilteredItems(normalizedList.items[category]);
                        sectionItems.push(...filtered);
                    }
                });

                if (sectionItems.length > 0) {
                    grouped[section.name] = sectionItems;
                }
                return grouped;
            }, {});
        } else {
            const grouped = {};

            if (normalizedList.items && typeof normalizedList.items === 'object') {
                Object.entries(normalizedList.items).forEach(([category, items]) => {
                    if (Array.isArray(items)) {
                        const filtered = getFilteredItems(items);
                        if (filtered.length > 0) {
                            grouped[category] = filtered;
                        }
                    }
                });
            }

            return grouped;
        }
    }, [aiMode, aiOptimization, normalizedList.items, getFilteredItems]);

    const getStats = useCallback(() => {
        if (!normalizedList.items) {
            return {totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0};
        }

        const allItems = Object.values(normalizedList.items).flat();
        const itemsWithStatus = addPurchasedStatus(allItems);

        return {
            totalItems: itemsWithStatus.length,
            needToBuy: itemsWithStatus.filter(item => !item.inInventory && !item.purchased).length,
            inInventory: itemsWithStatus.filter(item => item.inInventory).length,
            purchased: itemsWithStatus.filter(item => item.purchased).length
        };
    }, [normalizedList.items, addPurchasedStatus]);

    const safeHandleItemToggle = useCallback((itemKey) => {
        try {
            setPurchasedItems(prev => ({
                ...prev,
                [itemKey]: !prev[itemKey]
            }));
        } catch (error) {
            console.error('Error toggling item:', error);
        }
    }, []);

    // Voice input handlers
    const handleVoiceResult = useCallback((transcript) => {
        setVoiceResults(transcript);
        setProcessingVoice(true);

        // Process voice input here
        setTimeout(() => {
            setProcessingVoice(false);
            console.log('Voice input processed:', transcript);
        }, 2000);
    }, []);

    const handleVoiceError = useCallback((error) => {
        console.error('Voice input error:', error);
        setProcessingVoice(false);
    }, []);

    // Helper functions for Smart Price features
    const formatPrice = useCallback((price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price || 0);
    }, []);

    const getItemPriceInfo = useCallback((itemName) => {
        const priceInfo = priceComparison[itemName];
        if (!priceInfo || !priceInfo.currentBestPrice) {
            return {price: 0, store: selectedStore, status: 'no-price'};
        }

        const {price, store} = priceInfo.currentBestPrice;
        const avgPrice = priceInfo.prices.length > 0
            ? priceInfo.prices.reduce((sum, p) => sum + p.price, 0) / priceInfo.prices.length
            : price;

        let status = 'normal';
        if (price <= avgPrice * 0.8) status = 'deal';
        else if (price >= avgPrice * 1.2) status = 'expensive';

        return {price, store, status, avgPrice};
    }, [priceComparison, selectedStore]);

    const getItemStatusColor = useCallback((item) => {
        if (item.dealStatus === 'deal') return 'border-green-300 bg-green-50';
        if (item.priceOptimized) return 'border-blue-300 bg-blue-50';
        if (budgetTracking.limit && item.estimatedPrice > (budgetTracking.limit * 0.1)) return 'border-yellow-300 bg-yellow-50';
        return 'border-gray-200 bg-white';
    }, [budgetTracking.limit]);

    // Mode Management Functions
    const switchShoppingMode = useCallback((newMode) => {
        setShoppingMode(newMode);
        setShowModeSelector(false);

        if (newMode === 'smart-price' || newMode === 'unified') {
            // Initialize price optimization when switching to price modes
            if (selectedStore && currentShoppingList) {
                optimizeShoppingList();
            }
        }

        // Save user preference
        localStorage.setItem('preferred-shopping-mode', newMode);
        MobileHaptics?.light();
    }, [selectedStore, currentShoppingList, optimizeShoppingList]);

    // AI Optimization Functions
    const handleAIOptimization = useCallback(async () => {
        if (!selectedStore || !session?.user?.id) {
            alert('Please select a store first');
            return;
        }

        setAiLoading(true);
        setAiMode('ai-optimized');

        try {
            console.log('🚀 Starting AI optimization...');

            // Add the missing getFoodSafetyPriority function to items
            const enhancedItems = {};
            Object.entries(normalizedList.items).forEach(([category, items]) => {
                enhancedItems[category] = items.map(item => ({
                    ...item,
                    getFoodSafetyPriority: () => getFoodSafetyPriority(category)
                }));
            });

            // Create mock optimization for now (replace with actual API call)
            const optimization = {
                optimizedRoute: Object.entries(enhancedItems).map(([category, items], index) => ({
                    name: category,
                    categories: [category],
                    items: items,
                    order: index + 1,
                    foodSafetyPriority: getFoodSafetyPriority(category),
                    estimatedTime: Math.ceil(items.length * 1.5) // minutes
                })).sort((a, b) => a.foodSafetyPriority - b.foodSafetyPriority),

                aiInsights: {
                    confidenceScore: 0.92,
                    timeOptimization: '15-20% faster',
                    routeEfficiency: 'optimal',
                    foodSafetyCompliant: true
                },

                smartSuggestions: smartSuggestions || [],

                trafficInfo: {
                    currentLevel: 'moderate',
                    peakHours: false,
                    recommendation: 'good time to shop'
                },

                metadata: {
                    optimizedAt: new Date().toISOString(),
                    store: selectedStore,
                    version: '2.0'
                }
            };

            setAiOptimization(optimization);
            setAiInsights(optimization.aiInsights);
            setShowAiPanel(true);

            localStorage.setItem('ai-shopping-mode', 'ai-optimized');

            console.log('✅ AI optimization complete:', optimization);

        } catch (error) {
            console.error('AI optimization error:', error);
            alert('AI optimization failed. Using basic layout.');
            setAiMode('basic');
        } finally {
            setAiLoading(false);
        }
    }, [selectedStore, session?.user?.id, normalizedList.items, smartSuggestions]);

    // Store and preference management
    const handleStoreSelection = useCallback((storeName) => {
        setSelectedStore(storeName);
        localStorage.setItem('preferred-shopping-store', storeName);
        setShowStoreSelector(false);
        loadCustomCategories();

        // Auto-optimize if in price mode
        if ((shoppingMode === 'smart-price' || shoppingMode === 'unified') && currentShoppingList) {
            setTimeout(() => {
                try {
                    optimizeShoppingList();
                } catch (error) {
                    console.error('Error in auto-optimization:', error);
                }
            }, 500);
        }
    }, [shoppingMode, currentShoppingList, loadCustomCategories, optimizeShoppingList]);

    const markAllAsPurchased = useCallback(() => {
        if (!normalizedList.items) return;

        const allItems = {};
        Object.values(normalizedList.items).flat().forEach(item => {
            const itemKey = `${item.ingredient || item.name}-${item.category || 'other'}`;
            allItems[itemKey] = true;
        });
        setPurchasedItems(allItems);
    }, [normalizedList.items]);

    const clearAllPurchased = useCallback(() => {
        setPurchasedItems({});
    }, []);

    // FIXED SECTION: handleSmartSave function with correct listType
// file: /src/components/shopping/EnhancedAIShoppingListModal.js v11 - FIXED listType validation error

    // Enhanced Smart Save Function for unified modes - FIXED listType
    const handleSmartSave = useCallback(async () => {
        const config = getModeConfig();

        const saveData = {
            // Basic required fields with FIXED listType
            name: `Shopping List ${new Date().toLocaleDateString()}`,
            description: `${config.title} - Generated ${new Date().toLocaleString()}`,
            // FIXED: Use valid enum value from schema instead of mode-based string
            listType: sourceMealPlanId ? 'meal-plan' : 'recipes',
            contextName: `${config.title} - ${selectedStore || 'Store'}`,
            sourceRecipeIds: sourceRecipeIds || [],
            sourceMealPlanId: sourceMealPlanId || null,

            // Shopping list items - convert to proper format
            items: (() => {
                const formattedItems = [];

                if (currentShoppingList?.items) {
                    if (Array.isArray(currentShoppingList.items)) {
                        // Handle flat array
                        currentShoppingList.items.forEach((item, index) => {
                            if (item && (item.ingredient || item.name)) {
                                formattedItems.push({
                                    ingredient: item.ingredient || item.name,
                                    amount: item.amount || item.quantity || '',
                                    category: item.category || 'other',
                                    inInventory: Boolean(item.inInventory),
                                    purchased: Boolean(item.purchased),
                                    recipes: Array.isArray(item.recipes) ? item.recipes : [],
                                    originalName: item.originalName || item.ingredient || item.name,
                                    needAmount: item.needAmount || '',
                                    haveAmount: item.haveAmount || '',
                                    itemKey: item.itemKey || `item-${index}`,
                                    notes: item.notes || '',
                                    estimatedPrice: typeof item.estimatedPrice === 'number' ? item.estimatedPrice : 0,
                                    priceSource: item.priceSource || 'estimated'
                                });
                            }
                        });
                    } else if (typeof currentShoppingList.items === 'object') {
                        // Handle categorized object
                        Object.entries(currentShoppingList.items).forEach(([category, categoryItems]) => {
                            if (Array.isArray(categoryItems)) {
                                categoryItems.forEach((item, index) => {
                                    if (item && (item.ingredient || item.name)) {
                                        formattedItems.push({
                                            ingredient: item.ingredient || item.name,
                                            amount: item.amount || item.quantity || '',
                                            category: category,
                                            inInventory: Boolean(item.inInventory),
                                            purchased: Boolean(item.purchased),
                                            recipes: Array.isArray(item.recipes) ? item.recipes : [],
                                            originalName: item.originalName || item.ingredient || item.name,
                                            needAmount: item.needAmount || '',
                                            haveAmount: item.haveAmount || '',
                                            itemKey: item.itemKey || `${category}-${index}`,
                                            notes: item.notes || '',
                                            estimatedPrice: typeof item.estimatedPrice === 'number' ? item.estimatedPrice : 0,
                                            priceSource: item.priceSource || 'estimated'
                                        });
                                    }
                                });
                            }
                        });
                    }
                }

                return formattedItems;
            })(),

            // Optional fields
            tags: [],
            color: '#3b82f6',
            isTemplate: false
        };

        console.log('💾 FIXED SAVE - Payload with correct listType:', {
            listType: saveData.listType,
            itemCount: saveData.items.length,
            sourceMealPlanId: saveData.sourceMealPlanId,
            sourceRecipeIds: saveData.sourceRecipeIds.length
        });

        if (onSave) {
            await onSave(saveData);
        }

        console.log(`✅ ${config.title} saved successfully with listType: ${saveData.listType}`);
        MobileHaptics?.success();
    }, [getModeConfig, currentShoppingList?.items, selectedStore, sourceRecipeIds, sourceMealPlanId, onSave]);

    // Early return if not open or no data
    if (!isOpen) {
        return null;
    }

    if (!currentShoppingList) {
        return (
            <div style={{
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        display: 'inline-block',
                        width: '2rem',
                        height: '2rem',
                        border: '3px solid #e5e7eb',
                        borderTopColor: '#7c3aed',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginBottom: '1rem'
                    }}></div>
                    <p style={{margin: 0, color: '#6b7280'}}>Loading shopping list...</p>
                </div>
            </div>
        );
    }

    const config = getModeConfig();
    const stats = getStats();
    const groupedItems = getGroupedItems();

    return (
        <>
            <div style={{
                position: 'fixed',
                top: 'max(env(safe-area-inset-top, 0px), 0px)',
                left: 'env(safe-area-inset-left, 0px)',
                right: 'env(safe-area-inset-right, 0px)',
                bottom: '0px',
                paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'stretch',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '0'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    width: '100%',
                    maxWidth: '100vw',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    paddingBottom: 'max(env(safe-area-inset-bottom, 48px), 48px)'
                }}>
                    {/* Enhanced Header with Mode Indicator */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: (() => {
                            if (aiMode === 'ai-optimized') return '#f0f9ff';
                            if (editingCategories) return '#fef3c7';
                            if (shoppingMode === 'smart-price') return '#f0fdf4';
                            if (shoppingMode === 'unified') return '#eff6ff';
                            return '#f8fafc';
                        })(),
                        flexShrink: 0
                    }}>
                        <div style={{flex: 1, minWidth: 0}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <h2 style={{
                                    margin: 0,
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: '#111827',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {config.title}
                                </h2>

                                {/* Mode Switcher Button */}
                                <TouchEnhancedButton
                                    onClick={() => setShowModeSelector(true)}
                                    style={{
                                        backgroundColor: config.primaryColor,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                    title="Switch shopping mode"
                                >
                                    🔄 Mode
                                </TouchEnhancedButton>
                            </div>

                            <p style={{
                                margin: '0.125rem 0 0 0',
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {config.subtitle}
                            </p>

                            {/* Mode Indicators */}
                            <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap'}}>
                                {aiLoading && (
                                    <span style={{
                                        fontSize: '0.65rem',
                                        color: '#d97706',
                                        backgroundColor: '#fef3c7',
                                        padding: '0.125rem 0.375rem',
                                        borderRadius: '8px',
                                        fontWeight: '500'
                                    }}>
                                        🤖 AI Processing...
                                    </span>
                                )}
                                {aiMode === 'ai-optimized' && (
                                    <span style={{
                                        fontSize: '0.65rem',
                                        color: '#0369a1',
                                        backgroundColor: '#e0f2fe',
                                        padding: '0.125rem 0.375rem',
                                        borderRadius: '8px',
                                        fontWeight: '500'
                                    }}>
                                        🎯 AI Optimized
                                    </span>
                                )}
                                {smartSuggestions && smartSuggestions.length > 0 && (
                                    <TouchEnhancedButton
                                        onClick={() => setShowAiPanel(!showAiPanel)}
                                        style={{
                                            fontSize: '0.65rem',
                                            color: '#059669',
                                            backgroundColor: '#d1fae5',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '8px',
                                            fontWeight: '500',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🧠 AI Enhanced ({smartSuggestions.length}) {showAiPanel ? '▼' : '▶'}
                                    </TouchEnhancedButton>
                                )}
                                {editingCategories && (
                                    <span style={{
                                        fontSize: '0.65rem',
                                        color: '#d97706',
                                        backgroundColor: '#fef3c7',
                                        padding: '0.125rem 0.375rem',
                                        borderRadius: '8px',
                                        fontWeight: '500'
                                    }}>
                                        📂 Category Mode
                                    </span>
                                )}
                                {config.showPriceFeatures && priceAnalysis.totalSavings > 0 && (
                                    <span style={{
                                        fontSize: '0.65rem',
                                        color: '#059669',
                                        backgroundColor: '#d1fae5',
                                        padding: '0.125rem 0.375rem',
                                        borderRadius: '8px',
                                        fontWeight: '500'
                                    }}>
                                        💰 {formatPrice(priceAnalysis.totalSavings)} saved
                                    </span>
                                )}
                            </div>
                        </div>
                        <TouchEnhancedButton
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                color: '#6b7280',
                                padding: '0.5rem',
                                marginLeft: '0.5rem',
                                flexShrink: 0,
                                borderRadius: '0.375rem'
                            }}
                            title="Close"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>

                    {/* Enhanced Smart Price Summary Cards - Only show in price modes */}
                    {config.showPriceFeatures && (
                        <div style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#f8fafc',
                            borderBottom: '1px solid #e5e7eb',
                            flexShrink: 0
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '0.25rem'
                            }}>
                                <div style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    padding: '0.375rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '0.65rem',
                                        fontWeight: '500',
                                        color: '#6b7280',
                                        marginBottom: '0.125rem'
                                    }}>Budget
                                    </div>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        color: '#111827'
                                    }}>
                                        {budgetTracking.limit ? formatPrice(budgetTracking.limit) : 'None'}
                                    </div>
                                </div>

                                <div style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    padding: '0.375rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '0.65rem',
                                        fontWeight: '500',
                                        color: '#6b7280',
                                        marginBottom: '0.125rem'
                                    }}>Deals
                                    </div>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        color: '#7c2d12'
                                    }}>
                                        {priceAnalysis.bestDeals?.length || 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Enhanced Controls with Mode-Specific Features */}
                    <div style={{
                        padding: '0.5rem 1rem',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        gap: '0.25rem',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        backgroundColor: '#f8fafc',
                        flexShrink: 0
                    }}>
                        {/* Filter Dropdown */}
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            disabled={editingCategories}
                            style={{
                                padding: '0.375rem 0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                backgroundColor: editingCategories ? '#f3f4f6' : 'white',
                                flex: '1',
                                minWidth: '80px',
                                opacity: editingCategories ? 0.6 : 1
                            }}
                        >
                            <option value="all">All ({stats.totalItems})</option>
                            <option value="needToBuy">Need ({stats.needToBuy})</option>
                            <option value="inInventory">Have ({stats.inInventory})</option>
                            <option value="purchased">Bought ({stats.purchased})</option>
                        </select>

                        {/* Store Selection */}
                        <TouchEnhancedButton
                            onClick={() => setShowStoreSelector(true)}
                            disabled={editingCategories}
                            style={{
                                backgroundColor: selectedStore ? '#059669' : '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.25rem 0.375rem',
                                fontSize: '0.7rem',
                                cursor: editingCategories ? 'not-allowed' : 'pointer',
                                fontWeight: '500',
                                opacity: editingCategories ? 0.6 : 1
                            }}
                        >
                            🏪 {selectedStore || 'Store'}
                        </TouchEnhancedButton>

                        {/* Smart Price Mode Controls */}
                        {config.showPriceFeatures && (
                            <>
                                <TouchEnhancedButton
                                    onClick={() => setPriceMode('smart')}
                                    style={{
                                        padding: '0.25rem 0.375rem',
                                        fontSize: '0.7rem',
                                        fontWeight: '500',
                                        borderRadius: '4px',
                                        border: priceMode === 'smart' ? 'none' : '1px solid #d1d5db',
                                        backgroundColor: priceMode === 'smart' ? '#2563eb' : 'white',
                                        color: priceMode === 'smart' ? 'white' : '#374151',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🧠 Smart
                                </TouchEnhancedButton>

                                <TouchEnhancedButton
                                    onClick={() => setPriceMode('budget')}
                                    style={{
                                        padding: '0.25rem 0.375rem',
                                        fontSize: '0.7rem',
                                        fontWeight: '500',
                                        borderRadius: '4px',
                                        border: priceMode === 'budget' ? 'none' : '1px solid #d1d5db',
                                        backgroundColor: priceMode === 'budget' ? '#059669' : 'white',
                                        color: priceMode === 'budget' ? 'white' : '#374151',
                                        cursor: 'pointer'
                                    }}
                                >
                                    💰 Budget
                                </TouchEnhancedButton>

                                <TouchEnhancedButton
                                    onClick={() => setPriceMode('deals')}
                                    style={{
                                        padding: '0.25rem 0.375rem',
                                        fontSize: '0.7rem',
                                        fontWeight: '500',
                                        borderRadius: '4px',
                                        border: priceMode === 'deals' ? 'none' : '1px solid #d1d5db',
                                        backgroundColor: priceMode === 'deals' ? '#7c3aed' : 'white',
                                        color: priceMode === 'deals' ? 'white' : '#374151',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🎯 Deals
                                </TouchEnhancedButton>

                                {budgetTracking.limit && (
                                    <TouchEnhancedButton
                                        onClick={optimizeForBudget}
                                        disabled={loading}
                                        style={{
                                            padding: '0.25rem 0.375rem',
                                            fontSize: '0.7rem',
                                            backgroundColor: loading ? '#9ca3af' : '#f59e0b',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            fontWeight: '500'
                                        }}
                                    >
                                        {loading ? '⏳' : '💡'} Optimize
                                    </TouchEnhancedButton>
                                )}
                            </>
                        )}

                        {/* AI Optimization Button - Enhanced AI modes */}
                        <TouchEnhancedButton
                            onClick={async () => {
                                if (smartSuggestions && smartSuggestions.length > 0) {
                                    // If we already have suggestions, just toggle the panel
                                    setShowAiPanel(!showAiPanel);
                                } else {
                                    // If no suggestions, trigger AI
                                    setAiLoading(true);
                                    try {
                                        await autoTriggerAISuggestions();
                                    } finally {
                                        setAiLoading(false);
                                    }
                                }
                            }}
                            disabled={aiLoading || editingCategories}
                            style={{
                                backgroundColor: smartSuggestions?.length > 0 ? '#059669' : '#7c3aed',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.25rem 0.375rem',
                                fontSize: '0.7rem',
                                cursor: (aiLoading || editingCategories) ? 'not-allowed' : 'pointer',
                                fontWeight: '500',
                                opacity: (aiLoading || editingCategories) ? 0.6 : 1
                            }}
                        >
                            {aiLoading ? '⏳ AI...' :
                                smartSuggestions?.length > 0 ? `🧠 AI (${smartSuggestions.length})` : '🧠 Get AI'}
                        </TouchEnhancedButton>

                        {/* Category Management Toggle */}
                        <TouchEnhancedButton
                            onClick={() => setEditingCategories(!editingCategories)}
                            style={{
                                backgroundColor: editingCategories ? '#dc2626' : '#f59e0b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.25rem 0.375rem',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            {editingCategories ? '✓ Done' : '📂 Categories'}
                        </TouchEnhancedButton>

                        {/* Voice Input Button */}
                        <TouchEnhancedButton
                            onClick={() => setShowVoiceInput(true)}
                            disabled={editingCategories}
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.25rem 0.375rem',
                                fontSize: '0.7rem',
                                cursor: editingCategories ? 'not-allowed' : 'pointer',
                                fontWeight: '500',
                                opacity: editingCategories ? 0.6 : 1
                            }}
                        >
                            🎤 Voice
                        </TouchEnhancedButton>

                        {/* Quick Actions */}
                        {!editingCategories && (
                            <>
                                <TouchEnhancedButton
                                    onClick={markAllAsPurchased}
                                    style={{
                                        backgroundColor: '#8b5cf6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.375rem',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    ✓ All
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={clearAllPurchased}
                                    style={{
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.375rem',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    ✗ Clear
                                </TouchEnhancedButton>

                                <TouchEnhancedButton
                                    onClick={() => setShowActions(!showActions)}
                                    style={{
                                        backgroundColor: '#374151',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.375rem',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    {showActions ? '⌄ Less' : '⋯ More'}
                                </TouchEnhancedButton>
                            </>
                        )}
                    </div>

                    {/* Category Management Instructions */}
                    {editingCategories && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: '#fef3c7',
                            borderBottom: '1px solid #f59e0b',
                            flexShrink: 0
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#92400e'
                            }}>
                                <span>📂</span>
                                <span style={{fontWeight: '500'}}>
                                    Tap "Move to..." on any item to reorganize categories. Changes are saved automatically.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* AI Suggestions Panel */}
                    {showAiPanel && smartSuggestions && smartSuggestions.length > 0 && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #22c55e',
                            borderRadius: '8px',
                            margin: '0.5rem',
                            flexShrink: 0
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.75rem'
                            }}>
                                <h4 style={{
                                    margin: 0,
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#14532d'
                                }}>
                                    🧠 AI Recipe Suggestions
                                    {aiInsights?.fallback && (
                                        <span style={{
                                            marginLeft: '0.5rem',
                                            fontSize: '0.7rem',
                                            color: '#d97706',
                                            backgroundColor: '#fef3c7',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '8px'
                                        }}>
                                            Offline Mode
                                        </span>
                                    )}
                                </h4>
                                <TouchEnhancedButton
                                    onClick={() => setShowAiPanel(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '1rem',
                                        color: '#16a34a',
                                        cursor: 'pointer',
                                        padding: '0.25rem'
                                    }}
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>

                            <div style={{
                                display: 'grid',
                                gap: '0.75rem',
                                maxHeight: '200px',
                                overflow: 'auto'
                            }}>
                                {smartSuggestions.slice(0, 3).map((suggestion, index) => (
                                    <div key={index} style={{
                                        padding: '0.75rem',
                                        backgroundColor: 'white',
                                        borderRadius: '6px',
                                        border: '1px solid #bbf7d0'
                                    }}>
                                        <div style={{
                                            fontWeight: '600',
                                            color: '#14532d',
                                            fontSize: '0.875rem',
                                            marginBottom: '0.25rem'
                                        }}>
                                            {suggestion.name}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#166534',
                                            marginBottom: '0.5rem'
                                        }}>
                                            {suggestion.description}
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            gap: '0.5rem',
                                            fontSize: '0.7rem',
                                            color: '#059669'
                                        }}>
                                            {suggestion.cookingTime && (
                                                <span>⏱️ {suggestion.cookingTime}min</span>
                                            )}
                                            {suggestion.difficulty && (
                                                <span>📊 {suggestion.difficulty}</span>
                                            )}
                                            {suggestion.inventoryUsage && (
                                                <span>📦 {Math.round(suggestion.inventoryUsage * 100)}% inventory</span>
                                            )}
                                        </div>
                                        {suggestion.missingIngredients && suggestion.missingIngredients.length > 0 && (
                                            <div style={{
                                                marginTop: '0.5rem',
                                                fontSize: '0.7rem',
                                                color: '#dc2626'
                                            }}>
                                                Need: {suggestion.missingIngredients.slice(0, 3).map(ing =>
                                                typeof ing === 'string' ? ing : ing.item
                                            ).join(', ')}
                                                {suggestion.missingIngredients.length > 3 && ` +${suggestion.missingIngredients.length - 3} more`}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {aiInsights && (
                                <div style={{
                                    marginTop: '0.75rem',
                                    padding: '0.5rem',
                                    backgroundColor: '#dcfce7',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    color: '#14532d'
                                }}>
                                    💡 AI Insights: Using {aiInsights.utilization?.utilizationPercentage || 0}% of your
                                    inventory
                                    {aiInsights.utilization?.expiringItemsUsed > 0 &&
                                        ` • Prevents waste of ${aiInsights.utilization.expiringItemsUsed} expiring items`
                                    }
                                    {aiInsights.error && (
                                        <div style={{
                                            marginTop: '0.25rem',
                                            color: '#dc2626',
                                            fontSize: '0.7rem'
                                        }}>
                                            ⚠️ {aiInsights.error}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading State */}
                    {(loading || aiLoading) && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'center',
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: '#f8fafc',
                            flexShrink: 0
                        }}>
                            <div style={{
                                display: 'inline-block',
                                width: '1rem',
                                height: '1rem',
                                border: '2px solid #e5e7eb',
                                borderTopColor: config.primaryColor,
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                marginRight: '0.5rem'
                            }}></div>
                            <span style={{fontSize: '0.875rem', color: '#6b7280'}}>
                                {aiLoading ? 'AI optimizing...' : 'Optimizing prices...'}
                            </span>
                        </div>
                    )}

                    {/* Price Optimization Summary - Only show in price modes */}
                    {config.showPriceFeatures && !loading && (priceAnalysis.bestDeals.length > 0 || priceAnalysis.storeRecommendations?.length > 0 || (budgetTracking.limit && budgetTracking.current > budgetTracking.limit)) && (
                        <div style={{
                            padding: showOptimizationDetails ? '0.5rem 1rem' : '0.5rem 1rem',
                            backgroundColor: '#f8fafc',
                            borderBottom: '1px solid #e5e7eb',
                            flexShrink: 0,
                            maxHeight: showOptimizationDetails ? '200px' : '60px',
                            overflow: 'auto'
                        }}>
                            {/* Deal Alerts */}
                            {priceAnalysis.bestDeals.length > 0 && (
                                <div style={{
                                    backgroundColor: '#f0fdf4',
                                    border: '1px solid #16a34a',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    marginBottom: '0.75rem'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        marginBottom: '0.5rem'
                                    }}>
                                        <span style={{fontSize: '1rem'}}>🎯</span>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: '#14532d'
                                        }}>Great Deals Found!</h3>
                                    </div>
                                    {priceAnalysis.bestDeals.slice(0, 2).map((deal, index) => (
                                        <div key={index} style={{
                                            fontSize: '0.8rem',
                                            color: '#166534',
                                            marginBottom: '0.25rem'
                                        }}>
                                            <strong>{deal.item}</strong> -
                                            Save {formatPrice(deal.savings)} ({deal.savingsPercent}% off)
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Budget Warnings */}
                            {budgetTracking.limit && budgetTracking.current > budgetTracking.limit && (
                                <div style={{
                                    backgroundColor: '#fef3c7',
                                    border: '1px solid #f59e0b',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    marginBottom: '0.75rem'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        marginBottom: '0.5rem'
                                    }}>
                                        <span style={{fontSize: '1rem'}}>⚠️</span>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: '#92400e'
                                        }}>Budget Alert</h3>
                                    </div>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        color: '#d97706'
                                    }}>
                                        You're {formatPrice(budgetTracking.current - budgetTracking.limit)} over your
                                        budget
                                    </div>
                                </div>
                            )}

                            {/* Store Recommendations */}
                            {priceAnalysis.storeRecommendations?.length > 0 && (
                                <div style={{
                                    backgroundColor: '#eff6ff',
                                    border: '1px solid #3b82f6',
                                    borderRadius: '6px',
                                    padding: '0.75rem'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '0.5rem'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            <span style={{fontSize: '1rem'}}>💡</span>
                                            <h3 style={{
                                                margin: 0,
                                                fontSize: '0.875rem',
                                                fontWeight: '600',
                                                color: '#1e40af'
                                            }}>Save at Other Stores</h3>
                                        </div>
                                        <TouchEnhancedButton
                                            onClick={() => setShowOptimizationDetails(!showOptimizationDetails)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#3b82f6',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                fontWeight: '500'
                                            }}
                                        >
                                            {showOptimizationDetails ? 'Hide' : 'Show'} Details
                                        </TouchEnhancedButton>
                                    </div>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        color: '#1e40af',
                                        marginBottom: showPriceBreakdown ? '0.75rem' : '0'
                                    }}>
                                        Potential savings: {formatPrice(priceAnalysis.potentialSavings || 0)} by
                                        shopping elsewhere
                                    </div>

                                    {showPriceBreakdown && (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.5rem'
                                        }}>
                                            {priceAnalysis.storeRecommendations.slice(0, 3).map((rec, index) => (
                                                <div key={index} style={{
                                                    backgroundColor: 'white',
                                                    borderRadius: '4px',
                                                    padding: '0.5rem',
                                                    fontSize: '0.75rem'
                                                }}>
                                                    <div style={{
                                                        fontWeight: '500',
                                                        color: '#1e40af',
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        {rec.item}
                                                    </div>
                                                    <div style={{color: '#6b7280'}}>
                                                        {rec.currentStore}: {formatPrice(rec.currentPrice)} → {rec.betterStore}: {formatPrice(rec.betterPrice)}
                                                        <span style={{
                                                            color: '#16a34a',
                                                            marginLeft: '0.25rem',
                                                            fontWeight: '500'
                                                        }}>
                                                            (Save {formatPrice(rec.savings)})
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Expandable Actions Panel */}
                    {showActions && !editingCategories && (
                        <div style={{
                            padding: '0.5rem 1rem',
                            borderBottom: '1px solid #f3f4f6',
                            backgroundColor: '#f1f5f9',
                            flexShrink: 0
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                                gap: '0.5rem'
                            }}>
                                {showRefresh && onRefresh && (
                                    <TouchEnhancedButton
                                        onClick={onRefresh}
                                        style={{
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '0.5rem',
                                            fontSize: '0.65rem',
                                            cursor: 'pointer',
                                            textAlign: 'center'
                                        }}
                                    >
                                        🔄<br/>Refresh
                                    </TouchEnhancedButton>
                                )}
                                <TouchEnhancedButton
                                    onClick={() => setShowSaveModal(true)}
                                    style={{
                                        backgroundColor: '#8b5cf6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    💾<br/>Save
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => setShowEmailModal(true)}
                                    style={{
                                        backgroundColor: '#16a34a',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    📧<br/>Share
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => setShowPrintModal(true)}
                                    style={{
                                        backgroundColor: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    🖨️<br/>Print
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => setShowTotals(!showTotals)}
                                    style={{
                                        backgroundColor: showTotals ? '#059669' : '#6366f1',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    💰<br/>{showTotals ? 'Hide' : 'Totals'}
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => setShowVoiceInput(true)}
                                    style={{
                                        backgroundColor: '#7c3aed',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    🎤<br/>Voice
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => {
                                        const textContent = `Shopping List - ${config.title}\n\n` +
                                            Object.entries(groupedItems)
                                                .map(([category, items]) => {
                                                    const categoryItems = items.map(item => {
                                                        const checkbox = item.purchased ? '☑' : '☐';
                                                        const status = item.purchased ? ' [PURCHASED]' :
                                                            item.inInventory ? ' [IN INVENTORY]' : '';
                                                        const recipes = item.recipes && item.recipes.length > 0 ?
                                                            ` (${item.recipes.join(', ')})` : '';
                                                        const price = config.showPriceFeatures && item.estimatedPrice ?
                                                            ` - ${formatPrice(item.estimatedPrice)}` : '';
                                                        return `  ${checkbox} ${item.quantity && item.quantity !== 1 ? `${item.quantity} ` : ''}${item.ingredient || item.name}${price}${status}${recipes}`;
                                                    });
                                                    return `${category}:\n${categoryItems.join('\n')}`;
                                                })
                                                .join('\n\n');

                                        const blob = new Blob([textContent], {type: 'text/plain'});
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `shopping-list-${shoppingMode}-${Date.now()}.txt`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                    style={{
                                        backgroundColor: '#0891b2',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    📝<br/>Export
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    )}

                    {/* Totals Panel */}
                    {showTotals && (
                        <div style={{
                            padding: '1rem',
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: '#f8fafc',
                            flexShrink: 0
                        }}>
                            <ShoppingListTotals
                                shoppingList={normalizedList}
                                userPreferences={userPreferences}
                                onBudgetChange={(budget) => {
                                    const updated = {...userPreferences, budget};
                                    localStorage.setItem('shopping-preferences', JSON.stringify(updated));
                                    setUserPreferences(updated);
                                    setBudgetTracking(prev => ({
                                        ...prev,
                                        limit: budget,
                                        remaining: budget - prev.current
                                    }));
                                }}
                                onTaxRateChange={(taxRate) => {
                                    const updated = {...userPreferences, taxRate};
                                    localStorage.setItem('shopping-preferences', JSON.stringify(updated));
                                    setUserPreferences(updated);
                                }}
                                showBudgetTracker={true}
                                showCategoryBreakdown={true}
                                compact={false}
                            />
                        </div>
                    )}

                    {/* Main Shopping List Content */}
                    <div style={{
                        flex: 1,
                        padding: '0.5rem',
                        overflow: 'auto',
                        backgroundColor: 'white',
                        minHeight: 0
                    }}>
                        {Object.keys(groupedItems).length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '2rem 1rem',
                                color: '#6b7280'
                            }}>
                                <div style={{fontSize: '2rem', marginBottom: '1rem'}}>🛒</div>
                                <p>No items match the current filter</p>
                                {!smartSuggestions && (
                                    <TouchEnhancedButton
                                        onClick={() => {
                                            if (currentShoppingList?.items) {
                                                const allItems = Object.values(currentShoppingList.items).flat();
                                                if (allItems.length > 0) {
                                                    getAISmartSuggestions(allItems);
                                                }
                                            }
                                        }}
                                        style={{
                                            backgroundColor: '#7c3aed',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '0.75rem 1rem',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            marginTop: '1rem'
                                        }}
                                    >
                                        🧠 Get AI Recipe Suggestions
                                    </TouchEnhancedButton>
                                )}
                            </div>
                        ) : (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                                {Object.entries(groupedItems).map(([category, items]) => (
                                    <div key={category}>
                                        <h3 style={{
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            color: '#374151',
                                            margin: '0 0 0.75rem 0',
                                            padding: '0.5rem 0',
                                            borderBottom: '2px solid #e5e7eb',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span>
                                                {GROCERY_CATEGORIES[category]?.icon || '📦'} {category}
                                            </span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: '400',
                                                color: '#6b7280',
                                                backgroundColor: '#f3f4f6',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '12px'
                                            }}>
                                                {items.length}
                                            </span>
                                        </h3>
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                                            {items.map((item, index) => {
                                                const itemKey = item.itemKey || `${item.ingredient || item.name}-${category}`;
                                                const isPurchased = item.purchased;
                                                const priceInfo = config.showPriceFeatures ? getItemPriceInfo(item.ingredient || item.name) : null;

                                                return (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: '0.75rem',
                                                            padding: '0.75rem',
                                                            backgroundColor: isPurchased ? '#f0fdf4' :
                                                                config.showPriceFeatures ? getItemStatusColor(item) : '#fafafa',
                                                            borderRadius: '8px',
                                                            border: '1px solid #e5e7eb',
                                                            opacity: isPurchased ? 0.7 : 1,
                                                            textDecoration: isPurchased ? 'line-through' : 'none'
                                                        }}
                                                    >
                                                        {/* Checkbox (hidden in edit mode) */}
                                                        {!editingCategories && (
                                                            <input
                                                                type="checkbox"
                                                                checked={isPurchased}
                                                                onChange={() => safeHandleItemToggle(itemKey)}
                                                                style={{
                                                                    marginTop: '0.125rem',
                                                                    cursor: 'pointer',
                                                                    transform: 'scale(1.3)',
                                                                    accentColor: config.primaryColor
                                                                }}
                                                            />
                                                        )}

                                                        <div style={{flex: 1, minWidth: 0}}>
                                                            <div style={{
                                                                fontWeight: '500',
                                                                color: '#374151',
                                                                fontSize: '0.95rem',
                                                                lineHeight: '1.4',
                                                                marginBottom: '0.25rem'
                                                            }}>
                                                                {item.quantity && item.quantity !== 1 && `${item.quantity} `}
                                                                {item.unit && `${item.unit} `}
                                                                {item.ingredient || item.name}

                                                                {/* Smart Price Status Badges */}
                                                                {config.showPriceFeatures && (
                                                                    <>
                                                                        {item.dealStatus === 'deal' && (
                                                                            <span style={{
                                                                                marginLeft: '0.5rem',
                                                                                padding: '0.125rem 0.375rem',
                                                                                backgroundColor: '#dcfce7',
                                                                                color: '#166534',
                                                                                fontSize: '0.7rem',
                                                                                borderRadius: '12px',
                                                                                fontWeight: '500'
                                                                            }}>
                                                                                ON SALE 🎉
                                                                            </span>
                                                                        )}
                                                                        {item.priceOptimized && (
                                                                            <span style={{
                                                                                marginLeft: '0.5rem',
                                                                                padding: '0.125rem 0.375rem',
                                                                                backgroundColor: '#dbeafe',
                                                                                color: '#1e40af',
                                                                                fontSize: '0.7rem',
                                                                                borderRadius: '12px',
                                                                                fontWeight: '500'
                                                                            }}>
                                                                                OPTIMIZED 💡
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>

                                                            {/* Smart Price Quantity and Price Controls */}
                                                            {config.showPriceFeatures && (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.75rem',
                                                                    marginBottom: '0.5rem'
                                                                }}>
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.25rem'
                                                                    }}>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.1"
                                                                            value={item.quantity || 1}
                                                                            onChange={(e) => handleQuantityChange(item.id || itemKey, parseFloat(e.target.value))}
                                                                            style={{
                                                                                width: '3rem',
                                                                                padding: '0.25rem',
                                                                                border: '1px solid #d1d5db',
                                                                                borderRadius: '4px',
                                                                                fontSize: '0.8rem',
                                                                                textAlign: 'center'
                                                                            }}
                                                                        />
                                                                        <span style={{
                                                                            fontSize: '0.8rem',
                                                                            color: '#6b7280'
                                                                        }}>
                                                                            {item.unit || 'qty'}
                                                                        </span>
                                                                    </div>

                                                                    <div style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.25rem'
                                                                    }}>
                                                                        <span style={{
                                                                            fontSize: '0.8rem',
                                                                            color: '#6b7280'
                                                                        }}>$</span>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={item.actualPrice || item.estimatedPrice || ''}
                                                                            onChange={(e) => handlePriceUpdate(item.id || itemKey, e.target.value)}
                                                                            placeholder="Price"
                                                                            style={{
                                                                                width: '4rem',
                                                                                padding: '0.25rem',
                                                                                border: '1px solid #d1d5db',
                                                                                borderRadius: '4px',
                                                                                fontSize: '0.8rem',
                                                                                textAlign: 'center'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Category Movement Controls */}
                                                            {editingCategories && (
                                                                <div style={{
                                                                    marginTop: '0.5rem',
                                                                    display: 'flex',
                                                                    gap: '0.5rem',
                                                                    alignItems: 'center',
                                                                    flexWrap: 'wrap'
                                                                }}>
                                                                    <TouchEnhancedButton
                                                                        onClick={() => setMovingItem({
                                                                            item,
                                                                            fromCategory: category,
                                                                            currentCategories: Object.keys(normalizedList.items)
                                                                        })}
                                                                        style={{
                                                                            backgroundColor: '#3b82f6',
                                                                            color: 'white',
                                                                            border: 'none',
                                                                            borderRadius: '4px',
                                                                            padding: '0.25rem 0.5rem',
                                                                            fontSize: '0.7rem',
                                                                            cursor: 'pointer',
                                                                            fontWeight: '500'
                                                                        }}
                                                                    >
                                                                        📦 Move to...
                                                                    </TouchEnhancedButton>

                                                                    {(() => {
                                                                        const suggested = getAISuggestedCategory(item.ingredient || item.name);
                                                                        if (suggested !== category && CategoryUtils.isValidCategory(suggested)) {
                                                                            return (
                                                                                <TouchEnhancedButton
                                                                                    onClick={() => handleMoveItemToCategory(item, category, suggested)}
                                                                                    style={{
                                                                                        backgroundColor: '#10b981',
                                                                                        color: 'white',
                                                                                        border: 'none',
                                                                                        borderRadius: '4px',
                                                                                        padding: '0.25rem 0.5rem',
                                                                                        fontSize: '0.7rem',
                                                                                        cursor: 'pointer',
                                                                                        fontWeight: '500'
                                                                                    }}
                                                                                    title={`AI suggests moving to ${suggested}`}
                                                                                >
                                                                                    🤖
                                                                                    → {GROCERY_CATEGORIES[suggested]?.icon || '📦'} {suggested}
                                                                                </TouchEnhancedButton>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </div>
                                                            )}

                                                            {/* Inventory Status */}
                                                            {item.inInventory && (
                                                                <div style={{
                                                                    fontSize: '0.8rem',
                                                                    color: '#16a34a',
                                                                    backgroundColor: '#f0fdf4',
                                                                    padding: '0.25rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    marginTop: '0.5rem',
                                                                    border: '1px solid #bbf7d0'
                                                                }}>
                                                                    ✅ In inventory: {item.haveAmount || 'Available'}
                                                                    {item.inventoryItem?.location &&
                                                                        ` (${item.inventoryItem.location})`
                                                                    }
                                                                </div>
                                                            )}

                                                            {/* Recipe References */}
                                                            {item.recipes && item.recipes.length > 0 && (
                                                                <div style={{
                                                                    fontSize: '0.7rem',
                                                                    color: '#6b7280',
                                                                    backgroundColor: '#f8fafc',
                                                                    padding: '0.25rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    marginTop: '0.5rem',
                                                                    border: '1px solid #e2e8f0'
                                                                }}>
                                                                    Used in: {item.recipes.join(', ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Enhanced Footer with Fixed Layout */}
                    <div style={{
                        padding: footerCollapsed ? '0.5rem 1rem' : '0.75rem 1rem',
                        paddingBottom: `calc(${footerCollapsed ? '0.5rem' : '0.75rem'} + max(env(safe-area-inset-bottom, 8px), 8px))`,
                        borderTop: '1px solid #e5e7eb',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: footerCollapsed ? '0.5rem' : '0.75rem',
                        flexShrink: 0
                    }}>
                        {/* Primary Actions Row */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto auto auto',
                            gap: '0.5rem',
                            alignItems: 'center'
                        }}>
                            {/* Save Button - Takes most space */}
                            <TouchEnhancedButton
                                onClick={config.showPriceFeatures ? handleSmartSave : () => setShowSaveModal(true)}
                                style={{
                                    backgroundColor: config.primaryColor,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: footerCollapsed ? '0.5rem 0.75rem' : '0.75rem 1rem',
                                    fontSize: footerCollapsed ? '0.875rem' : '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    minWidth: 0
                                }}
                            >
                                <span>💾</span>
                                <span>Save</span>
                            </TouchEnhancedButton>

                            {/* Start Shopping Button */}
                            <TouchEnhancedButton
                                onClick={() => {
                                    if (shoppingProgress.startTime) {
                                        console.log('Resume shopping...');
                                    } else {
                                        setShoppingProgress({
                                            startTime: new Date(),
                                            completedSections: [],
                                            currentSection: 0,
                                            timePerSection: {},
                                            routeDeviations: []
                                        });
                                        console.log('Start shopping...');
                                    }
                                }}
                                style={{
                                    backgroundColor: '#059669',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: footerCollapsed ? '0.5rem' : '0.75rem',
                                    fontSize: footerCollapsed ? '0.75rem' : '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.25rem',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <span>🛒</span>
                                <span>{shoppingProgress.startTime ? 'Resume' : 'Shop'}</span>
                            </TouchEnhancedButton>

                            {/* Share Button */}
                            <TouchEnhancedButton
                                onClick={() => setShowEmailModal(true)}
                                style={{
                                    backgroundColor: '#7c3aed',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: footerCollapsed ? '0.5rem' : '0.75rem',
                                    fontSize: footerCollapsed ? '0.75rem' : '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.25rem',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <span>📤</span>
                                <span>Share</span>
                            </TouchEnhancedButton>

                            {/* Collapse Toggle */}
                            <TouchEnhancedButton
                                onClick={() => setFooterCollapsed(!footerCollapsed)}
                                style={{
                                    backgroundColor: footerCollapsed ? '#059669' : '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    minWidth: '50px',
                                    textAlign: 'center'
                                }}
                                title={footerCollapsed ? 'Expand footer' : 'Collapse footer for more space'}
                            >
                                {footerCollapsed ? '⬆️' : '⬇️'}
                            </TouchEnhancedButton>
                        </div>

                        {/* Expandable Footer Content */}
                        {!footerCollapsed && (
                            <>
                                {/* Summary Statistics */}
                                <div style={{
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: config.showPriceFeatures ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
                                        gap: '0.75rem',
                                        fontSize: '0.875rem'
                                    }}>
                                        <div>
                                            <div style={{color: '#6b7280'}}>Selected Items:</div>
                                            <div
                                                style={{fontWeight: '600', color: '#111827'}}>{stats.totalItems} items
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{color: '#6b7280'}}>Checked Off:</div>
                                            <div style={{
                                                fontWeight: '600',
                                                color: '#111827'
                                            }}>{stats.purchased} completed
                                            </div>
                                        </div>

                                        {config.showPriceFeatures && (
                                            <>
                                                <div>
                                                    <div style={{color: '#6b7280'}}>Est. Total:</div>
                                                    <div style={{
                                                        fontWeight: '600',
                                                        color: budgetTracking.limit && budgetTracking.current > budgetTracking.limit ? '#dc2626' : '#111827'
                                                    }}>
                                                        {formatPrice(budgetTracking.current)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{color: '#6b7280'}}>Savings:</div>
                                                    <div style={{fontWeight: '600', color: '#16a34a'}}>
                                                        {formatPrice(priceAnalysis.totalSavings || 0)}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Budget Progress Bar - Smart Price modes only */}
                                    {config.showPriceFeatures && budgetTracking.limit && (
                                        <div style={{
                                            marginTop: '0.75rem',
                                            paddingTop: '0.75rem',
                                            borderTop: '1px solid #e5e7eb'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.875rem',
                                                marginBottom: '0.5rem'
                                            }}>
                                                <span style={{color: '#6b7280'}}>Budget Status:</span>
                                                <span style={{
                                                    fontWeight: '600',
                                                    color: budgetTracking.remaining >= 0 ? '#16a34a' : '#dc2626'
                                                }}>
                                                    {budgetTracking.remaining >= 0 ? 'Under' : 'Over'} by {formatPrice(Math.abs(budgetTracking.remaining))}
                                                </span>
                                            </div>
                                            <div style={{
                                                width: '100%',
                                                height: '0.5rem',
                                                backgroundColor: '#e5e7eb',
                                                borderRadius: '0.25rem',
                                                overflow: 'hidden'
                                            }}>
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        width: `${Math.min(100, (budgetTracking.current / budgetTracking.limit) * 100)}%`,
                                                        backgroundColor: budgetTracking.current <= budgetTracking.limit ? '#16a34a' : '#dc2626',
                                                        transition: 'width 0.3s ease'
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Info */}
                                <div style={{
                                    fontSize: '0.7rem',
                                    color: '#6b7280',
                                    textAlign: 'center'
                                }}>
                                    {normalizedList.generatedAt && (
                                        <div>Generated {new Date(normalizedList.generatedAt).toLocaleString()}</div>
                                    )}
                                    <div style={{marginTop: '0.25rem'}}>
                                        🏪 Store: {selectedStore || 'Not selected'}
                                        {aiMode === 'ai-optimized' && aiInsights && (
                                            <span
                                                style={{color: '#059669'}}> • AI Optimized ({(aiInsights.confidenceScore * 100).toFixed(0)}%)</span>
                                        )}
                                        <span style={{color: config.primaryColor}}> • {config.title}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* All Modals */}

            {/* Category Selection Modal */}
            {movingItem && (
                <div style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1100,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        maxWidth: '500px',
                        width: '100%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{
                            margin: '0 0 1rem 0',
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: '#111827'
                        }}>
                            📦 Move Item to Category
                        </h3>

                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '8px',
                            marginBottom: '1rem'
                        }}>
                            <div style={{fontWeight: '500', color: '#374151'}}>
                                {movingItem.item.quantity && movingItem.item.quantity !== 1 && `${movingItem.item.quantity} `}
                                {movingItem.item.ingredient || movingItem.item.name}
                            </div>
                            <div style={{fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem'}}>
                                Currently in: <strong>{movingItem.fromCategory}</strong>
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '0.5rem',
                            maxHeight: '300px',
                            overflow: 'auto',
                            marginBottom: '1rem'
                        }}>
                            {CategoryUtils.getAllCategoryNames()
                                .filter(cat => cat !== movingItem.fromCategory)
                                .sort()
                                .map(categoryName => {
                                    const categoryInfo = GROCERY_CATEGORIES[categoryName];
                                    const isAISuggested = getAISuggestedCategory(movingItem.item.ingredient || movingItem.item.name) === categoryName;

                                    return (
                                        <TouchEnhancedButton
                                            key={categoryName}
                                            onClick={() => handleMoveItemToCategory(movingItem.item, movingItem.fromCategory, categoryName)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.75rem',
                                                backgroundColor: isAISuggested ? '#f0fdf4' : 'white',
                                                border: isAISuggested ? '2px solid #16a34a' : '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                fontSize: '0.875rem',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{fontSize: '1.25rem'}}>
                                                {categoryInfo?.icon || '📦'}
                                            </span>
                                            <div style={{flex: 1}}>
                                                <div style={{fontWeight: '500', color: '#374151'}}>
                                                    {categoryName}
                                                    {isAISuggested && (
                                                        <span style={{
                                                            marginLeft: '0.5rem',
                                                            fontSize: '0.75rem',
                                                            color: '#16a34a',
                                                            fontWeight: '400'
                                                        }}>
                                                            🤖 AI Suggests
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TouchEnhancedButton>
                                    );
                                })}
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.5rem'
                        }}>
                            <TouchEnhancedButton
                                onClick={() => setMovingItem(null)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Cancel
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Voice Input Modal */}
            {showVoiceInput && (
                <div style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1300,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        maxWidth: '500px',
                        width: '100%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                color: '#111827'
                            }}>
                                🎤 Voice Add Items
                            </h3>
                            <TouchEnhancedButton
                                onClick={() => setShowVoiceInput(false)}
                                disabled={processingVoice}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    color: '#6b7280',
                                    cursor: processingVoice ? 'not-allowed' : 'pointer',
                                    opacity: processingVoice ? 0.6 : 1
                                }}
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>

                        <div style={{marginBottom: '1.5rem'}}>
                            <VoiceInput
                                onResult={handleVoiceResult}
                                onError={handleVoiceError}
                                placeholder="Say items to add: 'milk, eggs, 2 pounds chicken'..."
                            />
                        </div>

                        {processingVoice && (
                            <div style={{
                                marginBottom: '1.5rem',
                                padding: '1rem',
                                backgroundColor: '#fef3c7',
                                borderRadius: '8px',
                                border: '1px solid #f59e0b',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '1rem',
                                    fontWeight: '500',
                                    color: '#92400e',
                                    marginBottom: '0.5rem'
                                }}>
                                    🤖 Processing voice input...
                                </div>
                                <div style={{
                                    fontSize: '0.875rem',
                                    color: '#d97706'
                                }}>
                                    Parsing items and adding to your list
                                </div>
                            </div>
                        )}

                        {voiceResults && !processingVoice && (
                            <div style={{
                                marginBottom: '1.5rem',
                                padding: '1rem',
                                backgroundColor: '#f0fdf4',
                                borderRadius: '8px',
                                border: '1px solid #16a34a'
                            }}>
                                <div style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: '#14532d',
                                    marginBottom: '0.5rem'
                                }}>
                                    Last voice input:
                                </div>
                                <div style={{
                                    fontSize: '1rem',
                                    color: '#166534',
                                    fontStyle: 'italic'
                                }}>
                                    "{voiceResults}"
                                </div>
                            </div>
                        )}

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '0.75rem'
                        }}>
                            <TouchEnhancedButton
                                onClick={() => setShowVoiceInput(false)}
                                disabled={processingVoice}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    cursor: processingVoice ? 'not-allowed' : 'pointer',
                                    opacity: processingVoice ? 0.6 : 1
                                }}
                            >
                                Close
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => setVoiceResults('')}
                                disabled={processingVoice || !voiceResults}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    backgroundColor: voiceResults && !processingVoice ? '#3b82f6' : '#9ca3af',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    cursor: (processingVoice || !voiceResults) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Clear & Try Again
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Store Selection Modal */}
            {showStoreSelector && (
                <div style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1100,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        maxWidth: '400px',
                        width: '100%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{
                            margin: '0 0 1rem 0',
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: '#111827'
                        }}>
                            🏪 Select Your Store
                        </h3>

                        {stores.length > 0 && (
                            <div style={{marginBottom: '1rem'}}>
                                <h4 style={{
                                    margin: '0 0 0.5rem 0',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: '#6b7280'
                                }}>
                                    Your Stores
                                </h4>
                                <div style={{
                                    display: 'grid',
                                    gap: '0.5rem',
                                    maxHeight: '200px',
                                    overflow: 'auto'
                                }}>
                                    {stores.map(store => (
                                        <TouchEnhancedButton
                                            key={store._id}
                                            onClick={() => handleStoreSelection(store.name)}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.75rem',
                                                backgroundColor: selectedStore === store.name ? '#dbeafe' : '#f9fafb',
                                                border: selectedStore === store.name ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                textAlign: 'left'
                                            }}
                                        >
                                            <div>
                                                <div style={{
                                                    fontWeight: '500',
                                                    color: '#111827',
                                                    fontSize: '0.875rem'
                                                }}>
                                                    {store.name}
                                                </div>
                                                {store.chain && (
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: '#6b7280'
                                                    }}>
                                                        {store.chain}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{fontSize: '1.25rem'}}>
                                                🏪
                                            </div>
                                        </TouchEnhancedButton>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{marginBottom: '1rem'}}>
                            <h4 style={{
                                margin: '0 0 0.5rem 0',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: '#6b7280'
                            }}>
                                Popular Chains
                            </h4>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '0.5rem'
                            }}>
                                {['Walmart', 'Target', 'Costco', 'Kroger', 'Hy-Vee', 'Trader Joe\'s'].map(chain => (
                                    <TouchEnhancedButton
                                        key={chain}
                                        onClick={() => handleStoreSelection(chain)}
                                        style={{
                                            padding: '0.75rem',
                                            backgroundColor: selectedStore === chain ? '#dbeafe' : 'white',
                                            border: selectedStore === chain ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            fontSize: '0.875rem',
                                            fontWeight: '500'
                                        }}
                                    >
                                        {chain}
                                    </TouchEnhancedButton>
                                ))}
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '0.5rem'
                        }}>
                            <TouchEnhancedButton
                                onClick={() => setShowStoreSelector(false)}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Cancel
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Mode Selector Modal */}
            {showModeSelector && (
                <div style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1200,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        maxWidth: '500px',
                        width: '100%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{
                            margin: '0 0 1rem 0',
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#111827'
                        }}>
                            🔄 Choose Shopping Mode
                        </h3>

                        <div style={{
                            display: 'grid',
                            gap: '1rem',
                            marginBottom: '1.5rem'
                        }}>
                            {/* Enhanced AI Mode */}
                            <TouchEnhancedButton
                                onClick={() => switchShoppingMode('enhanced')}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    padding: '1rem',
                                    backgroundColor: shoppingMode === 'enhanced' ? '#f3f4f6' : 'white',
                                    border: shoppingMode === 'enhanced' ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.5rem'
                                }}>
                                    <span style={{fontSize: '1.5rem'}}>🤖</span>
                                    <span style={{fontSize: '1.125rem', fontWeight: '600', color: '#111827'}}>
                                        Enhanced AI Shopping
                                    </span>
                                    {shoppingMode === 'enhanced' && (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: '#7c3aed',
                                            backgroundColor: '#f3e8ff',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '12px',
                                            fontWeight: '500'
                                        }}>
                                            CURRENT
                                        </span>
                                    )}
                                </div>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.875rem',
                                    color: '#6b7280',
                                    lineHeight: '1.4'
                                }}>
                                    Full-featured shopping with AI route optimization, smart categorization, voice
                                    input, and advanced organization tools.
                                </p>
                            </TouchEnhancedButton>

                            {/* Smart Price Mode */}
                            <TouchEnhancedButton
                                onClick={() => switchShoppingMode('smart-price')}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    padding: '1rem',
                                    backgroundColor: shoppingMode === 'smart-price' ? '#f0fdf4' : 'white',
                                    border: shoppingMode === 'smart-price' ? '2px solid #059669' : '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.5rem'
                                }}>
                                    <span style={{fontSize: '1.5rem'}}>💰</span>
                                    <span style={{fontSize: '1.125rem', fontWeight: '600', color: '#111827'}}>
                                        Smart Price Shopping
                                    </span>
                                    {shoppingMode === 'smart-price' && (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: '#059669',
                                            backgroundColor: '#dcfce7',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '12px',
                                            fontWeight: '500'
                                        }}>
                                            CURRENT
                                        </span>
                                    )}
                                </div>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.875rem',
                                    color: '#6b7280',
                                    lineHeight: '1.4'
                                }}>
                                    Price-optimized shopping with deal alerts, budget tracking, store comparisons, and
                                    savings recommendations.
                                </p>
                            </TouchEnhancedButton>

                            {/* Unified Mode */}
                            <TouchEnhancedButton
                                onClick={() => switchShoppingMode('unified')}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    padding: '1rem',
                                    backgroundColor: shoppingMode === 'unified' ? '#eff6ff' : 'white',
                                    border: shoppingMode === 'unified' ? '2px solid #0ea5e9' : '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.5rem'
                                }}>
                                    <span style={{fontSize: '1.5rem'}}>🚀</span>
                                    <span style={{fontSize: '1.125rem', fontWeight: '600', color: '#111827'}}>
                                        Ultimate Shopping Assistant
                                    </span>
                                    {shoppingMode === 'unified' && (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: '#0ea5e9',
                                            backgroundColor: '#e0f2fe',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '12px',
                                            fontWeight: '500'
                                        }}>
                                            CURRENT
                                        </span>
                                    )}
                                </div>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.875rem',
                                    color: '#6b7280',
                                    lineHeight: '1.4'
                                }}>
                                    The complete shopping experience combining AI optimization with price intelligence
                                    for maximum savings and efficiency.
                                </p>
                            </TouchEnhancedButton>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.75rem'
                        }}>
                            <TouchEnhancedButton
                                onClick={() => setShowModeSelector(false)}
                                style={{
                                    padding: '0.75rem 1rem',
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Cancel
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Share Modal */}
            <EmailSharingModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                shoppingList={normalizedList}
                context={`unified-shopping-${shoppingMode}`}
                contextName={`${config.title} - ${selectedStore || 'Store'}`}
            />

            {/* Save Shopping List Modal */}
            <SaveShoppingListModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={(savedList) => {
                    console.log(`${config.title} saved successfully:`, savedList);
                    if (onSave) onSave(savedList);
                }}
                shoppingList={normalizedList}
                listType={`unified-${shoppingMode}`}
                contextName={`${config.title} - ${selectedStore || 'Store'}`}
                sourceRecipeIds={sourceRecipeIds}
                sourceMealPlanId={sourceMealPlanId}
                metadata={{
                    store: selectedStore,
                    shoppingMode: shoppingMode,
                    aiMode: aiMode,
                    aiInsights: aiInsights,
                    smartSuggestions: smartSuggestions,
                    customCategories: customCategories,
                    priceAnalysis: config.showPriceFeatures ? priceAnalysis : null,
                    budgetTracking: config.showPriceFeatures ? budgetTracking : null,
                    categoryManagement: true,
                    voiceEnabled: true,
                    unified: true,
                    modalComIntegration: true
                }}
            />

            {/* Print Options Modal */}
            <PrintOptionsModal
                isOpen={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                onPrint={() => {
                    console.log('✅ Print completed successfully');
                    setShowPrintModal(false);
                }}
                shoppingList={normalizedList}
                title={config.title}
                subtitle={config.subtitle}
                storeName={selectedStore}
                shoppingRoute={aiOptimization}
                totals={{
                    totalItems: stats.totalItems,
                    estimatedCost: budgetTracking.current,
                    potentialSavings: priceAnalysis.totalSavings
                }}
                metadata={{
                    mode: shoppingMode,
                    priceOptimized: config.showPriceFeatures,
                    aiOptimized: config.showAdvancedFeatures && aiMode === 'ai-optimized'
                }}
            />

            {/* Expandable Actions Panel */}
            {showActions && !editingCategories && (
                <div style={{
                    position: 'fixed',
                    bottom: '200px',
                    left: '1rem',
                    right: '1rem',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '1rem',
                    zIndex: 1050,
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                        gap: '0.5rem'
                    }}>
                        {showRefresh && onRefresh && (
                            <TouchEnhancedButton
                                onClick={onRefresh}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.5rem',
                                    fontSize: '0.65rem',
                                    cursor: 'pointer',
                                    textAlign: 'center'
                                }}
                            >
                                🔄<br/>Refresh
                            </TouchEnhancedButton>
                        )}
                        <TouchEnhancedButton
                            onClick={() => setShowSaveModal(true)}
                            style={{
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                fontSize: '0.65rem',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            💾<br/>Save
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => setShowEmailModal(true)}
                            style={{
                                backgroundColor: '#16a34a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                fontSize: '0.65rem',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            📧<br/>Share
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => setShowPrintModal(true)}
                            style={{
                                backgroundColor: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                fontSize: '0.65rem',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            🖨️<br/>Print
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => setShowTotals(!showTotals)}
                            style={{
                                backgroundColor: showTotals ? '#059669' : '#6366f1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                fontSize: '0.65rem',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            💰<br/>{showTotals ? 'Hide' : 'Totals'}
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => setShowVoiceInput(true)}
                            style={{
                                backgroundColor: '#7c3aed',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                fontSize: '0.65rem',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            🎤<br/>Voice
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => {
                                const textContent = `Shopping List - ${config.title}\n\n` +
                                    Object.entries(groupedItems)
                                        .map(([category, items]) => {
                                            const categoryItems = items.map(item => {
                                                const checkbox = item.purchased ? '☑' : '☐';
                                                const status = item.purchased ? ' [PURCHASED]' :
                                                    item.inInventory ? ' [IN INVENTORY]' : '';
                                                const recipes = item.recipes && item.recipes.length > 0 ?
                                                    ` (${item.recipes.join(', ')})` : '';
                                                const price = config.showPriceFeatures && item.estimatedPrice ?
                                                    ` - ${formatPrice(item.estimatedPrice)}` : '';
                                                return `  ${checkbox} ${item.quantity && item.quantity !== 1 ? `${item.quantity} ` : ''}${item.ingredient || item.name}${price}${status}${recipes}`;
                                            });
                                            return `${category}:\n${categoryItems.join('\n')}`;
                                        })
                                        .join('\n\n');

                                const blob = new Blob([textContent], {type: 'text/plain'});
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `shopping-list-${shoppingMode}-${Date.now()}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            style={{
                                backgroundColor: '#0891b2',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                fontSize: '0.65rem',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            📝<br/>Export
                        </TouchEnhancedButton>
                    </div>
                </div>
            )}

            {/* Totals Panel */}
            {showTotals && (
                <div style={{
                    position: 'fixed',
                    bottom: '120px',
                    left: '1rem',
                    right: '1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    padding: '1rem',
                    zIndex: 1050,
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    maxHeight: '300px',
                    overflow: 'auto'
                }}>
                    <ShoppingListTotals
                        shoppingList={normalizedList}
                        userPreferences={userPreferences}
                        onBudgetChange={(budget) => {
                            const updated = {...userPreferences, budget};
                            localStorage.setItem('shopping-preferences', JSON.stringify(updated));
                            setUserPreferences(updated);
                            setBudgetTracking(prev => ({
                                ...prev,
                                limit: budget,
                                remaining: budget - prev.current
                            }));
                        }}
                        onTaxRateChange={(taxRate) => {
                            const updated = {...userPreferences, taxRate};
                            localStorage.setItem('shopping-preferences', JSON.stringify(updated));
                            setUserPreferences(updated);
                        }}
                        showBudgetTracker={true}
                        showCategoryBreakdown={true}
                        compact={false}
                    />
                </div>
            )}

            {/* Custom Category Manager Modal */}
            {showCategoryManager && (
                <div style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1200,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        maxWidth: '600px',
                        width: '100%',
                        maxHeight: '85vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <h3 style={{
                            margin: '0 0 1rem 0',
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#111827'
                        }}>
                            🔧 Manage Categories
                        </h3>

                        <div style={{flex: 1, overflow: 'auto', marginBottom: '1rem'}}>
                            <div style={{
                                backgroundColor: '#f0f9ff',
                                border: '1px solid #0ea5e9',
                                borderRadius: '8px',
                                padding: '1rem',
                                marginBottom: '1.5rem'
                            }}>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.875rem',
                                    color: '#0c4a6e'
                                }}>
                                    Custom category management is available. You can move items between categories using
                                    the "📂 Categories" mode.
                                </p>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid #e5e7eb'
                        }}>
                            <TouchEnhancedButton
                                onClick={() => setShowCategoryManager(false)}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Close
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}