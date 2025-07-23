'use client';
// file: /src/components/shopping/EnhancedAIShoppingListModal.js v8 - Complete rebuild with all fixes

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
    const [aiMode, setAiMode] = useState('basic');
    const [aiOptimization, setAiOptimization] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiInsights, setAiInsights] = useState(null);
    const [smartSuggestions, setSmartSuggestions] = useState(null);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [learningProgress, setLearningProgress] = useState(null);
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
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [movingItem, setMovingItem] = useState(null);
    const [availableCategories, setAvailableCategories] = useState([]);
    const [customCategories, setCustomCategories] = useState({});
    const [editingCategories, setEditingCategories] = useState(false);
    const [selectedStore, setSelectedStore] = useState(storePreference);
    const [stores, setStores] = useState([]);
    const [showStoreSelector, setShowStoreSelector] = useState(false);
    const [shoppingProgress, setShoppingProgress] = useState({
        startTime: null,
        completedSections: [],
        currentSection: 0,
        timePerSection: {},
        routeDeviations: []
    });
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
    const [showVoiceInput, setShowVoiceInput] = useState(false);
    const [voiceResults, setVoiceResults] = useState('');
    const [processingVoice, setProcessingVoice] = useState(false);
    const [currentShoppingList, setCurrentShoppingList] = useState(null);
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
                summary: { totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0 },
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

    // AI Integration
    const getAISmartSuggestions = useCallback(async (items) => {
        try {
            console.log('🧠 Getting AI smart suggestions from Modal.com...');
            setAiLoading(true);

            const response = await fetch('/api/integrations/smart-inventory/suggest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: items.map(item => ({
                        name: item.ingredient || item.name,
                        category: item.category,
                        quantity: item.quantity,
                        unit: item.unit,
                        expirationDate: item.expirationDate || null
                    })),
                    userId: session?.user?.id,
                    context: 'shopping_list_enhancement',
                    preferences: {
                        cookingTime: userPreferences?.cookingTime || '30 minutes',
                        difficulty: userPreferences?.difficulty || 'easy',
                        cuisinePreferences: userPreferences?.cuisinePreferences || [],
                        dietaryRestrictions: userPreferences?.dietaryRestrictions || []
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.suggestions) {
                    setSmartSuggestions(data.suggestions);
                    setAiInsights({
                        utilization: data.utilization,
                        shoppingNeeded: data.shoppingNeeded,
                        method: data.method,
                        confidenceScore: 0.85
                    });
                    console.log('✅ AI suggestions received:', data.suggestions);

                    if (data.suggestions.length > 0) {
                        setShowAiPanel(true);
                    }
                } else {
                    console.warn('⚠️ AI suggestions returned no data');
                }
            } else {
                console.error('❌ AI suggestions API error:', response.status);
            }
        } catch (error) {
            console.error('❌ Failed to get AI suggestions:', error);
        } finally {
            setAiLoading(false);
        }
    }, [session?.user?.id, userPreferences]);

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

    // Item and category management
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
        }
    }, [isOpen, initialized, loadPreferences, fetchStores, loadCustomCategories, loadUserPreferences, processInitialData, initializeAISystem]);

    // Normalize shopping list data
    const normalizedList = useMemo(() => {
        if (!currentShoppingList) return {items: {}, summary: {totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0}};

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

                    if (!category || typeof category === 'number' || /^\d+$/.test(category)) {
                        category = getAISuggestedCategory(item.ingredient || item.name);
                        console.log(`🔧 Fixed numeric category for "${item.ingredient || item.name}": ${category}`);
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
                    if (/^\d+$/.test(category)) {
                        console.log(`🔧 Skipping numeric category: ${category}`);
                        if (Array.isArray(categoryItems)) {
                            categoryItems.forEach(item => {
                                const properCategory = getAISuggestedCategory(item.ingredient || item.name);
                                if (!normalizedItems[properCategory]) {
                                    normalizedItems[properCategory] = [];
                                }
                                normalizedItems[properCategory].push({...item, category: properCategory});
                            });
                        }
                        return;
                    }

                    const validCategory = (typeof category === 'string' && category !== 'undefined') ? category : 'Other';

                    if (Array.isArray(categoryItems)) {
                        normalizedItems[validCategory] = categoryItems.filter(item =>
                            item && typeof item === 'object' && (item.ingredient || item.name)
                        ).map(item => ({...item, category: validCategory}));
                    } else if (categoryItems && typeof categoryItems === 'object' && (categoryItems.ingredient || categoryItems.name)) {
                        normalizedItems[validCategory] = [{...categoryItems, category: validCategory}];
                    }
                });
            }
        }

        Object.keys(normalizedItems).forEach(category => {
            if (!Array.isArray(normalizedItems[category]) || normalizedItems[category].length === 0) {
                delete normalizedItems[category];
            }
        });

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
    const getModeConfig = () => {
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
    };

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
            purchased: itemWithStatus.filter(item => item.purchased).length
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
                    {/* Header */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        flexShrink: 0
                    }}>
                        <div style={{flex: 1, minWidth: 0}}>
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
                            <p style={{
                                margin: '0.125rem 0 0 0',
                                fontSize: '0.75rem',
                                color: '#6b7280'
                            }}>
                                {config.subtitle}
                            </p>

                            {/* AI Status Indicators */}
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

                    {/* Controls */}
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
                                                Need: {suggestion.missingIngredients.slice(0, 3).map(ing => ing.item).join(', ')}
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
                                    💡 AI Insights: Using {aiInsights.utilization?.utilizationPercentage || 0}% of your inventory
                                    {aiInsights.utilization?.expiringItemsUsed > 0 &&
                                        ` • Prevents waste of ${aiInsights.utilization.expiringItemsUsed} expiring items`
                                    }
                                </div>
                            )}
                        </div>
                    )}

                    {/* Main Content */}
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

                                                return (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: '0.75rem',
                                                            padding: '0.75rem',
                                                            backgroundColor: isPurchased ? '#f0fdf4' : '#fafafa',
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
                                                                {item.ingredient || item.name}
                                                            </div>

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
                                                                                    🤖 → {GROCERY_CATEGORIES[suggested]?.icon || '📦'} {suggested}
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

                    {/* Footer */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderTop: '1px solid #e5e7eb',
                        backgroundColor: '#f8fafc',
                        flexShrink: 0
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <TouchEnhancedButton
                                onClick={() => setShowSaveModal(true)}
                                style={{
                                    flex: 1,
                                    backgroundColor: config.primaryColor,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    marginRight: '0.75rem'
                                }}
                            >
                                <span>💾</span>
                                <span>Save List</span>
                            </TouchEnhancedButton>
                        </div>

                        {/* Summary */}
                        <div style={{
                            marginTop: '0.75rem',
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            textAlign: 'center'
                        }}>
                            {stats.totalItems} items • {stats.purchased} completed
                            {smartSuggestions && smartSuggestions.length > 0 && <span style={{color: '#059669'}}> • AI Enhanced</span>}
                        </div>
                    </div>
                </div>
            </div>

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
                                            onClick={() => {
                                                setSelectedStore(store.name);
                                                setShowStoreSelector(false);
                                                localStorage.setItem('preferred-shopping-store', store.name);
                                            }}
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
                                        onClick={() => {
                                            setSelectedStore(chain);
                                            setShowStoreSelector(false);
                                            localStorage.setItem('preferred-shopping-store', chain);
                                        }}
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
                                onClick={() => {
                                    setShoppingMode('enhanced');
                                    setShowModeSelector(false);
                                    localStorage.setItem('preferred-shopping-mode', 'enhanced');
                                }}
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
                                    Full-featured shopping with AI route optimization, smart categorization, voice input, and advanced organization tools.
                                </p>
                            </TouchEnhancedButton>

                            {/* Smart Price Mode */}
                            <TouchEnhancedButton
                                onClick={() => {
                                    setShoppingMode('smart-price');
                                    setShowModeSelector(false);
                                    localStorage.setItem('preferred-shopping-mode', 'smart-price');
                                }}
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
                                    Price-optimized shopping with deal alerts, budget tracking, store comparisons, and savings recommendations.
                                </p>
                            </TouchEnhancedButton>

                            {/* Unified Mode */}
                            <TouchEnhancedButton
                                onClick={() => {
                                    setShoppingMode('unified');
                                    setShowModeSelector(false);
                                    localStorage.setItem('preferred-shopping-mode', 'unified');
                                }}
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
                                    The complete shopping experience combining AI optimization with price intelligence for maximum savings and efficiency.
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
                    unified: true
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
                                    Custom category management is available. You can move items between categories using the "📂 Categories" mode.
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

// Helper component for formatting price
function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(price || 0);
}
