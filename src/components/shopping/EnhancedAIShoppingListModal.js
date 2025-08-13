'use client';
// file: /src/components/shopping/EnhancedAIShoppingListModal.js v10 - Part 1: Fixed Modal.com integration and API communication

import {useState, useEffect, useCallback, useMemo, useRef, memo} from 'react';
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

const PriceControls = ({
                           item,
                           itemKey,
                           localPrices,
                           localQuantities,
                           onPriceChange,
                           onQuantityChange,
                           onPriceBlur
                       }) => {
    // Get current values - prefer local state, fallback to item values
    const currentPrice = localPrices[itemKey] !== undefined ?
        localPrices[itemKey] :
        (item.actualPrice || item.estimatedPrice || '');

    const currentQuantity = localQuantities[itemKey] !== undefined ?
        localQuantities[itemKey] :
        (item.quantity || 1);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.5rem',
            flexWrap: 'wrap',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '0.75rem',
            borderRadius: '6px'
        }}>
            {/* Quantity Control */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
            }}>
                <label style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    fontWeight: '500'
                }}>
                    Qty:
                </label>
                <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={currentQuantity}
                    onChange={(e) => {
                        const newQuantity = e.target.value;
                        // Allow empty string and valid numbers
                        if (newQuantity === '' || /^\d*\.?\d*$/.test(newQuantity)) {
                            const numericValue = newQuantity === '' ? 0 : parseFloat(newQuantity) || 0;
                            onQuantityChange(itemKey, numericValue);
                        }
                    }}
                    style={{
                        width: '4rem',
                        padding: '0.375rem 0.25rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        textAlign: 'center',
                        backgroundColor: 'white'
                    }}
                />
                <span style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    minWidth: '2rem'
                }}>
                    {item.unit || 'qty'}
                </span>
            </div>

            {/* Price Control */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
            }}>
                <label style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    fontWeight: '500'
                }}>
                    Price:
                </label>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.125rem'
                }}>
                    <span style={{
                        fontSize: '0.875rem',
                        color: '#374151',
                        fontWeight: '500'
                    }}>$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={currentPrice}
                        onChange={(e) => {
                            let newPrice = e.target.value;

                            // Allow empty string, numbers, and one decimal point
                            if (newPrice === '' || /^\d*\.?\d{0,2}$/.test(newPrice)) {
                                onPriceChange(itemKey, newPrice);
                            }
                        }}
                        onBlur={(e) => {
                            let value = e.target.value;
                            // Format to 2 decimal places on blur if it's a valid number
                            if (value && !isNaN(parseFloat(value))) {
                                const formatted = parseFloat(value).toFixed(2);
                                onPriceChange(itemKey, formatted);
                                onPriceBlur(itemKey, formatted);
                            } else if (value === '') {
                                onPriceBlur(itemKey, '');
                            }
                        }}
                        onFocus={(e) => {
                            e.target.select(); // Select all text when focused
                        }}
                        placeholder={item.estimatedPrice ? item.estimatedPrice.toFixed(2) : "0.00"}
                        style={{
                            width: '5rem',
                            padding: '0.375rem 0.25rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            textAlign: 'center',
                            backgroundColor: item.priceSource?.startsWith('inventory') ? '#f0fdf4' :
                                item.estimatedPrice > 0 ? '#fefce8' : 'white',
                            borderColor: item.priceSource?.startsWith('inventory') ? '#22c55e' :
                                item.estimatedPrice > 0 ? '#f59e0b' : '#d1d5db'
                        }}
                        title={`Price for ${item.ingredient || item.name}`}
                    />
                </div>
            </div>

            {/* Price Source Indicator */}
            {item.priceSource && item.priceSource !== 'none' && (
                <div style={{
                    fontSize: '0.65rem',
                    color: item.priceSource.startsWith('inventory') ? '#059669' : '#3b82f6',
                    backgroundColor: item.priceSource.startsWith('inventory') ? '#dcfce7' : '#dbeafe',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '8px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                }}>
                    {item.priceSource.startsWith('inventory') ? '📦' : '💡'}
                    {item.priceSource.replace('inventory_', '').replace('_', ' ')}
                </div>
            )}

            {/* Item Total */}
            {(item.estimatedPrice > 0 || item.actualPrice > 0 || currentPrice > 0) && (
                <div style={{
                    fontSize: '0.75rem',
                    color: '#374151',
                    fontWeight: '600',
                    marginLeft: 'auto',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px'
                }}>
                    Total:
                    ${((parseFloat(currentPrice) || item.actualPrice || item.estimatedPrice || 0) * currentQuantity).toFixed(2)}
                </div>
            )}
        </div>
    );
};

const isValidPriceInput = (value) => {
    // Allow empty, numbers, and partial decimal inputs like "25."
    return value === '' || /^\d*\.?\d*$/.test(value);
};

const isValidQuantityInput = (value) => {
    // Allow empty, numbers, and partial decimal inputs
    return value === '' || /^\d*\.?\d*$/.test(value);
};

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
                                                        initialMode = 'enhanced',
                                                        preventDoubleSave = false
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
    const [expandedItems, setExpandedItems] = useState(new Set());

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
    const [updateTrigger, setUpdateTrigger] = useState(0);

    // Debounced price update state
    const [localPrices, setLocalPrices] = useState({});
    const [localQuantities, setLocalQuantities] = useState({});
    const priceUpdateTimeouts = useRef({});
    const quantityUpdateTimeouts = useRef({});

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
        console.log('📦 Available inventory data for price integration...');

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
                    category: getAISuggestedCategory(item),
                    priceSource: 'none'
                };
            } else if (typeof item === 'object') {
                // NEW: Enhanced price extraction from shopping list data
                let estimatedPrice = 0;
                let priceSource = 'none';
                let priceOptimized = false;

                // Priority 1: Use existing estimated price if available
                if (item.estimatedPrice && item.estimatedPrice > 0) {
                    estimatedPrice = item.estimatedPrice;
                    priceSource = item.priceSource || 'estimated';
                    priceOptimized = true;
                    console.log(`💰 Using item estimated price for ${item.name}: $${estimatedPrice} (${priceSource})`);
                }
                // Priority 2: Extract from inventory item data
                else if (item.inventoryItem) {
                    if (item.inventoryItem.averagePrice && item.inventoryItem.averagePrice > 0) {
                        estimatedPrice = item.inventoryItem.averagePrice;
                        priceSource = 'inventory_average';
                        priceOptimized = true;
                        console.log(`💰 Using inventory average price for ${item.name}: $${estimatedPrice}`);
                    } else if (item.inventoryItem.lowestPrice && item.inventoryItem.lowestPrice > 0) {
                        estimatedPrice = item.inventoryItem.lowestPrice;
                        priceSource = 'inventory_lowest';
                        priceOptimized = true;
                        console.log(`💰 Using inventory lowest price for ${item.name}: $${estimatedPrice}`);
                    } else if (item.inventoryItem.lastPurchasePrice && item.inventoryItem.lastPurchasePrice > 0) {
                        estimatedPrice = item.inventoryItem.lastPurchasePrice;
                        priceSource = 'inventory_last';
                        priceOptimized = true;
                        console.log(`💰 Using inventory last purchase price for ${item.name}: $${estimatedPrice}`);
                    }
                }

                processedItem = {
                    id: item.id || `item-${index}-${Date.now()}`,
                    name: item.name || item.ingredient || 'Unknown Item',
                    ingredient: item.ingredient || item.name || 'Unknown Item',
                    checked: item.checked || false,
                    selected: item.selected !== false,
                    quantity: item.quantity || item.amount || 1,
                    unit: item.unit || '',
                    estimatedPrice: estimatedPrice, // NOW PROPERLY EXTRACTS INVENTORY PRICES
                    actualPrice: item.actualPrice || null,
                    priceSource: priceSource, // Track where price came from
                    priceOptimized: priceOptimized,
                    dealStatus: item.dealStatus || 'normal',
                    alternatives: item.alternatives || [],
                    recipes: item.recipes || [],
                    category: item.category || getAISuggestedCategory(item.name || item.ingredient || 'Unknown Item'),
                    inInventory: item.inInventory || false,
                    inventoryItem: item.inventoryItem || null,
                    // NEW: Additional price context
                    needAmount: item.needAmount || item.amount || '',
                    haveAmount: item.haveAmount || '',
                    priceHistory: item.inventoryItem?.priceHistory || []
                };
            } else {
                console.warn(`⚠️ Skipping invalid item type at index ${index}:`, typeof item);
                return;
            }

            // Ensure category is valid
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

        // Log pricing statistics
        const allItems = Object.values(items).flat();
        const itemsWithPrices = allItems.filter(item => item.estimatedPrice > 0);
        const totalEstimatedValue = allItems.reduce((sum, item) => sum + (item.estimatedPrice * (item.quantity || 1)), 0);

        console.log(`✅ Price integration complete:`, {
            totalItems: allItems.length,
            itemsWithPrices: itemsWithPrices.length,
            totalEstimatedValue: totalEstimatedValue.toFixed(2),
            categories: Object.keys(items)
        });

        return {
            items,
            summary: {
                totalItems: smartPriceItems.length,
                needToBuy: smartPriceItems.length,
                inInventory: 0,
                purchased: 0,
                totalEstimatedValue: totalEstimatedValue
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

    const processInitialData = useCallback(() => {
        console.log('🔄 Processing initial data:', {
            hasShoppingList: !!shoppingList,
            initialItemsCount: initialItems.length,
            initialized,
            shoppingListStructure: shoppingList ? {
                hasItems: !!shoppingList.items,
                itemsType: typeof shoppingList.items,
                isArray: Array.isArray(shoppingList.items),
                itemsKeys: shoppingList.items ? Object.keys(shoppingList.items) : null,
                sampleItem: shoppingList.items ? (
                    Array.isArray(shoppingList.items) ? shoppingList.items[0] :
                        Object.values(shoppingList.items)[0]?.[0]
                ) : null
            } : null
        });

        if (initialized) {
            console.log('⚠️ Already initialized, skipping processInitialData');
            return;
        }

        try {
            if (shoppingList) {
                console.log('✅ Setting currentShoppingList from shoppingList prop');
                setCurrentShoppingList(shoppingList);

                if (initialItems.length > 0) {
                    console.log('🔄 Merging with initial items');
                    const mergedList = mergeShoppingLists(shoppingList, initialItems);
                    setCurrentShoppingList(mergedList);
                }
            } else if (initialItems.length > 0) {
                console.log('🔄 Converting initial items to shopping list');
                const convertedList = convertSmartPriceToEnhanced(initialItems);
                setCurrentShoppingList(convertedList);
                setShoppingMode('smart-price');
            } else {
                console.log('⚠️ No shopping list or initial items provided');
            }

            if (optimization) {
                console.log('🔧 Setting price analysis from optimization');
                setPriceAnalysis({
                    totalSavings: optimization.totalSavings || 0,
                    bestDeals: optimization.bestDeals || optimization.dealAlerts || [],
                    priceAlerts: optimization.priceAlerts || [],
                    storeComparison: optimization.storeComparison || {}
                });
            }

            setInitialized(true);
            console.log('✅ Initial data processing complete');

        } catch (error) {
            console.error('❌ Error in processInitialData:', error);
            console.error('🔍 Error details:', {
                shoppingList,
                initialItems,
                optimization
            });
        }
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

            const response = await fetch('https://doc-bears-comfort-kitchen--smart-inventory-manager-sugge-308eea.modal.run', {
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

    // FIXED: handleMoveItemToCategory function with proper item removal
    const handleMoveItemToCategory = useCallback(async (item, fromCategory, toCategory) => {
        if (fromCategory === toCategory) {
            console.log('⚠️ Source and destination categories are the same, no move needed');
            return;
        }

        console.log(`🔄 Moving "${item.ingredient || item.name}" from "${fromCategory}" to "${toCategory}"`);

        const updatedShoppingList = {...currentShoppingList};
        const updatedItems = {...updatedShoppingList.items};

        // STEP 1: Remove from source category with better matching
        if (updatedItems[fromCategory]) {
            const itemToMoveId = item.id || `${item.ingredient || item.name}-${fromCategory}`;
            const itemToMoveName = (item.ingredient || item.name).toLowerCase().trim();

            console.log(`🔍 Looking for item to remove: ID="${itemToMoveId}", Name="${itemToMoveName}"`);

            const beforeCount = updatedItems[fromCategory].length;

            updatedItems[fromCategory] = updatedItems[fromCategory].filter(listItem => {
                // Try multiple matching strategies
                const listItemId = listItem.id || `${listItem.ingredient || listItem.name}-${fromCategory}`;
                const listItemName = (listItem.ingredient || listItem.name).toLowerCase().trim();

                // Match by ID first, then by name, then by ingredient
                const matchById = listItemId === itemToMoveId;
                const matchByName = listItemName === itemToMoveName;
                const matchByIngredient = (listItem.ingredient || '').toLowerCase().trim() === (item.ingredient || '').toLowerCase().trim();
                const matchByOriginalName = (listItem.originalName || '').toLowerCase().trim() === (item.originalName || item.ingredient || item.name || '').toLowerCase().trim();

                const isMatch = matchById || matchByName || matchByIngredient || matchByOriginalName;

                if (isMatch) {
                    console.log(`✅ Found matching item to remove:`, {
                        listItemId,
                        listItemName,
                        matchType: matchById ? 'ID' : matchByName ? 'Name' : matchByIngredient ? 'Ingredient' : 'OriginalName'
                    });
                }

                return !isMatch; // Keep items that DON'T match (remove the one that does match)
            });

            const afterCount = updatedItems[fromCategory].length;
            const removedCount = beforeCount - afterCount;

            console.log(`📊 Removal results: ${beforeCount} → ${afterCount} (removed ${removedCount} items)`);

            // If no items were removed, try a more aggressive search
            if (removedCount === 0) {
                console.warn('⚠️ No items removed with standard matching, trying partial name matching...');

                const partialNameMatch = (item.ingredient || item.name).toLowerCase().replace(/[^a-z0-9]/g, '');

                updatedItems[fromCategory] = updatedItems[fromCategory].filter(listItem => {
                    const listItemPartial = (listItem.ingredient || listItem.name).toLowerCase().replace(/[^a-z0-9]/g, '');
                    const isPartialMatch = listItemPartial.includes(partialNameMatch) || partialNameMatch.includes(listItemPartial);

                    if (isPartialMatch) {
                        console.log(`✅ Found partial match for removal: "${listItem.ingredient || listItem.name}"`);
                    }

                    return !isPartialMatch;
                });
            }

            // Remove empty categories
            if (updatedItems[fromCategory].length === 0) {
                console.log(`🗑️ Removing empty category: ${fromCategory}`);
                delete updatedItems[fromCategory];
            }
        } else {
            console.warn(`⚠️ Source category "${fromCategory}" not found in shopping list`);
        }

        // STEP 2: Add to destination category
        if (!updatedItems[toCategory]) {
            console.log(`📁 Creating new category: ${toCategory}`);
            updatedItems[toCategory] = [];
        }

        // Create the moved item with updated category
        const movedItem = {
            ...item,
            category: toCategory,
            id: item.id || `${item.ingredient || item.name}-${toCategory}`, // Update ID to reflect new category
            itemKey: `${item.ingredient || item.name}-${toCategory}` // Update itemKey as well
        };

        // Check if item already exists in destination (prevent duplicates)
        const existsInDestination = updatedItems[toCategory].some(existingItem => {
            const existingName = (existingItem.ingredient || existingItem.name).toLowerCase().trim();
            const movingName = (movedItem.ingredient || movedItem.name).toLowerCase().trim();
            return existingName === movingName;
        });

        if (existsInDestination) {
            console.warn(`⚠️ Item "${movedItem.ingredient || movedItem.name}" already exists in "${toCategory}", skipping add`);
        } else {
            updatedItems[toCategory].push(movedItem);
            console.log(`✅ Added item to destination category "${toCategory}"`);
        }

        // STEP 3: Update the shopping list
        updatedShoppingList.items = updatedItems;
        setCurrentShoppingList(updatedShoppingList);

        // STEP 4: Update purchased items state (move the purchased status)
        const oldItemKey = `${item.ingredient || item.name}-${fromCategory}`;
        const newItemKey = `${item.ingredient || item.name}-${toCategory}`;

        setPurchasedItems(prev => {
            const updated = {...prev};

            // If the old item was purchased, transfer that status to the new location
            if (updated[oldItemKey]) {
                updated[newItemKey] = updated[oldItemKey];
                delete updated[oldItemKey];
                console.log(`📦 Transferred purchased status from "${oldItemKey}" to "${newItemKey}"`);
            }

            return updated;
        });

        // STEP 5: Save user preference and cleanup
        saveItemCategoryPreference(item.ingredient || item.name, toCategory);
        setMovingItem(null);

        console.log(`✅ Item "${item.ingredient || item.name}" successfully moved from "${fromCategory}" to "${toCategory}"`);

        // Provide haptic feedback
        MobileHaptics?.success();

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

    // NEW: Helper function for inventory price tooltips
    const getInventoryPriceTooltip = (item) => {
        if (!item.priceSource || item.priceSource === 'none') {
            return 'Enter price manually';
        }

        switch (item.priceSource) {
            case 'inventory_average':
                return `Average price from your inventory: $${item.estimatedPrice.toFixed(2)}`;
            case 'inventory_lowest':
                return `Lowest price from your inventory: $${item.estimatedPrice.toFixed(2)}`;
            case 'inventory_last':
                return `Last purchase price from inventory: $${item.estimatedPrice.toFixed(2)}`;
            default:
                return `Price from ${item.priceSource}: $${item.estimatedPrice.toFixed(2)}`;
        }
    };

// NEW: Helper function for price source labels
    const getPriceSourceLabel = (priceSource) => {
        switch (priceSource) {
            case 'inventory_average':
                return 'Avg';
            case 'inventory_lowest':
                return 'Low';
            case 'inventory_last':
                return 'Last';
            case 'estimated':
                return 'Est';
            default:
                return 'Price';
        }
    };

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
    }, [currentShoppingList?.items, setBudgetTracking]);

    const handlePriceUpdate = useCallback((itemKey, newPriceValue) => {
        // Validate input before processing
        if (!isValidPriceInput(newPriceValue)) {
            console.log(`[PRICE] Invalid input rejected: "${newPriceValue}"`);
            return;
        }

        // Update local state immediately (no re-render of full list)
        setLocalPrices(prev => ({
            ...prev,
            [itemKey]: newPriceValue
        }));

        // Clear existing timeout for this item
        if (priceUpdateTimeouts.current[itemKey]) {
            clearTimeout(priceUpdateTimeouts.current[itemKey]);
        }

        // Only set timeout if we have a complete number (not ending with decimal)
        const shouldUpdate = newPriceValue !== '' && !newPriceValue.endsWith('.');

        if (shouldUpdate) {
            // Set timeout for complete numbers
            priceUpdateTimeouts.current[itemKey] = setTimeout(() => {
                console.log(`[PRICE HANDLER] Debounced update for: "${itemKey}", Price: $${newPriceValue}`);
                updateShoppingListPrice(itemKey, newPriceValue);
                delete priceUpdateTimeouts.current[itemKey];
            }, 500);
        } else {
            // For incomplete inputs (ending with .), set a longer timeout
            priceUpdateTimeouts.current[itemKey] = setTimeout(() => {
                console.log(`[PRICE HANDLER] Final update after decimal: "${itemKey}", Price: $${newPriceValue}`);
                updateShoppingListPrice(itemKey, newPriceValue);
                delete priceUpdateTimeouts.current[itemKey];
            }, 1500); // Longer delay for decimal inputs
        }
    }, []);

    const updateShoppingListPrice = useCallback((itemKey, newPriceValue) => {
        if (!currentShoppingList?.items) return;

        const updatedShoppingList = {...currentShoppingList};
        const updatedItems = {...updatedShoppingList.items};
        let itemFound = false;

        Object.keys(updatedItems).forEach(category => {
            updatedItems[category] = updatedItems[category].map(item => {
                const matchByName = (item.ingredient || item.name) === itemKey;
                const matchByItemKey = item.itemKey === itemKey;
                const matchByIngredientKey = item.ingredientKey === itemKey;
                const matchById = item.id === itemKey;
                const itemNameKey = `${item.ingredient || item.name}-${category}`;
                const matchByComputedKey = itemNameKey === itemKey;

                const matches = matchByName || matchByItemKey || matchByIngredientKey || matchById || matchByComputedKey;

                if (matches && !itemFound) {
                    itemFound = true;
                    const newPrice = parseFloat(newPriceValue) || 0;
                    const updated = {...item, actualPrice: newPrice};
                    return updated;
                }
                return item;
            });
        });

        if (itemFound) {
            updatedShoppingList.items = updatedItems;
            setCurrentShoppingList(updatedShoppingList);

            // Use a different trigger mechanism to avoid re-rendering all items
            setTimeout(() => {
                setUpdateTrigger(prev => prev + 1);
            }, 0);
        }
    }, [currentShoppingList, setCurrentShoppingList, setUpdateTrigger]);

    const updateShoppingListQuantity = useCallback((itemKey, newQuantity) => {
        if (!currentShoppingList?.items) return;

        const updatedShoppingList = {...currentShoppingList};
        const updatedItems = {...updatedShoppingList.items};
        let itemFound = false;

        Object.keys(updatedItems).forEach(category => {
            updatedItems[category] = updatedItems[category].map(item => {
                const matchByName = (item.ingredient || item.name) === itemKey;
                const matchByItemKey = item.itemKey === itemKey;
                const matchByIngredientKey = item.ingredientKey === itemKey;
                const matchById = item.id === itemKey;
                const itemNameKey = `${item.ingredient || item.name}-${category}`;
                const matchByComputedKey = itemNameKey === itemKey;

                const matches = matchByName || matchByItemKey || matchByIngredientKey || matchById || matchByComputedKey;

                if (matches && !itemFound) {
                    itemFound = true;
                    const updated = {...item, quantity: Math.max(0, newQuantity)};
                    return updated;
                }
                return item;
            });
        });

        if (itemFound) {
            updatedShoppingList.items = updatedItems;
            setCurrentShoppingList(updatedShoppingList);

            setTimeout(() => {
                setUpdateTrigger(prev => prev + 1);
            }, 0);
        }
    }, [currentShoppingList, setCurrentShoppingList, setUpdateTrigger]);

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

    // NEW: Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            // Clear all timeouts when component unmounts
            Object.values(priceUpdateTimeouts.current).forEach(timeout => clearTimeout(timeout));
            Object.values(quantityUpdateTimeouts.current).forEach(timeout => clearTimeout(timeout));
        };
    }, []);

// NEW: Clear local state when shopping list changes
    useEffect(() => {
        // Clear local state when switching to a new shopping list
        setLocalPrices({});
        setLocalQuantities({});
    }, [currentShoppingList?.generatedAt]);

// NEW: Debug logging effect (existing one)
    useEffect(() => {
        console.log('🔄 currentShoppingList changed:', {
            hasCurrentShoppingList: !!currentShoppingList,
            type: typeof currentShoppingList,
            structure: currentShoppingList ? {
                hasItems: !!currentShoppingList.items,
                itemsType: typeof currentShoppingList.items,
                isArray: Array.isArray(currentShoppingList.items),
                keys: currentShoppingList.items ? Object.keys(currentShoppingList.items) : null
            } : null
        });
    }, [currentShoppingList]);

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

    // UPDATED: Enhanced normalizedList useMemo with comprehensive debugging
    const normalizedList = useMemo(() => {
        console.log('🔄 Re-computing normalized list...');
        console.log('📊 Input currentShoppingList:', currentShoppingList);

        if (!currentShoppingList) {
            console.log('❌ No currentShoppingList provided');
            return {
                items: {},
                summary: {totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0}
            };
        }

        let normalizedItems = {};
        let summary = currentShoppingList.summary || currentShoppingList.stats || {};

        console.log('📋 Shopping list structure check:', {
            hasItems: !!currentShoppingList.items,
            itemsType: typeof currentShoppingList.items,
            isArray: Array.isArray(currentShoppingList.items),
            itemsKeys: currentShoppingList.items ? Object.keys(currentShoppingList.items) : 'none'
        });

        if (currentShoppingList.items) {
            if (Array.isArray(currentShoppingList.items)) {
                console.log('📋 Processing flat array of items:', currentShoppingList.items.length);

                currentShoppingList.items.forEach((item, index) => {
                    console.log(`🔍 Processing item ${index}:`, item);

                    if (!item || typeof item !== 'object') {
                        console.warn(`⚠️ Skipping invalid item at index ${index}:`, item);
                        return;
                    }

                    // Check for required fields
                    const itemName = item.ingredient || item.name;
                    if (!itemName) {
                        console.warn(`⚠️ Skipping item without name at index ${index}:`, item);
                        return;
                    }

                    let category = item.category;

                    // FIX: Handle invalid categories more robustly
                    if (!category ||
                        typeof category === 'number' ||
                        /^\d+$/.test(String(category)) ||
                        category === 'undefined' ||
                        category === null ||
                        category.trim() === '') {

                        console.log(`🔧 Fixing invalid category "${category}" for "${itemName}"`);
                        category = getAISuggestedCategory(itemName);
                        console.log(`🤖 AI suggested category: "${category}"`);
                    }

                    // Ensure category is a valid string
                    if (typeof category !== 'string' || category.trim() === '') {
                        console.warn(`⚠️ Category still invalid after fix, using 'Other' for "${itemName}"`);
                        category = 'Other';
                    }

                    // Create the normalized item
                    const normalizedItem = {
                        ...item,
                        category,
                        id: item.id || `normalized-${index}-${Date.now()}`,
                        ingredient: itemName,
                        name: itemName
                    };

                    console.log(`✅ Normalized item for category "${category}":`, normalizedItem);

                    if (!normalizedItems[category]) {
                        normalizedItems[category] = [];
                    }
                    normalizedItems[category].push(normalizedItem);
                });

            } else if (typeof currentShoppingList.items === 'object' && currentShoppingList.items !== null) {
                console.log('📂 Processing categorized items object');

                Object.entries(currentShoppingList.items).forEach(([category, categoryItems]) => {
                    console.log(`🔍 Processing category "${category}" with items:`, categoryItems);

                    // FIX: Skip numeric categories completely
                    if (/^\d+$/.test(String(category))) {
                        console.log(`🔧 Skipping numeric category: ${category}`);

                        // Try to re-categorize items from numeric categories
                        if (Array.isArray(categoryItems)) {
                            categoryItems.forEach((item, itemIndex) => {
                                if (item && typeof item === 'object' && (item.ingredient || item.name)) {
                                    const itemName = item.ingredient || item.name;
                                    const properCategory = getAISuggestedCategory(itemName);

                                    console.log(`🔧 Moving item "${itemName}" from numeric category "${category}" to "${properCategory}"`);

                                    if (!normalizedItems[properCategory]) {
                                        normalizedItems[properCategory] = [];
                                    }
                                    normalizedItems[properCategory].push({
                                        ...item,
                                        category: properCategory,
                                        id: item.id || `fixed-${Date.now()}-${Math.random()}`,
                                        ingredient: itemName,
                                        name: itemName
                                    });
                                }
                            });
                        }
                        return;
                    }

                    // Ensure valid category name
                    const validCategory = (typeof category === 'string' &&
                        category !== 'undefined' &&
                        category.trim() !== '') ? category.trim() : 'Other';

                    console.log(`📂 Processing valid category: "${validCategory}"`);

                    if (Array.isArray(categoryItems)) {
                        console.log(`📦 Category "${validCategory}" has ${categoryItems.length} items`);

                        const validItems = categoryItems.filter((item, itemIndex) => {
                            const isValid = item &&
                                typeof item === 'object' &&
                                (item.ingredient || item.name);

                            if (!isValid) {
                                console.warn(`⚠️ Filtering out invalid item at index ${itemIndex} in category "${validCategory}":`, item);
                            }

                            return isValid;
                        }).map((item, itemIndex) => {
                            const normalizedItem = {
                                ...item,
                                category: validCategory,
                                id: item.id || `cat-${Date.now()}-${Math.random()}`,
                                ingredient: item.ingredient || item.name,
                                name: item.ingredient || item.name
                            };

                            console.log(`✅ Normalized item ${itemIndex} in category "${validCategory}":`, normalizedItem);
                            return normalizedItem;
                        });

                        if (validItems.length > 0) {
                            normalizedItems[validCategory] = validItems;
                        } else {
                            console.warn(`⚠️ No valid items found in category "${validCategory}"`);
                        }

                    } else if (categoryItems && typeof categoryItems === 'object' && (categoryItems.ingredient || categoryItems.name)) {
                        // Single item in category
                        console.log(`📦 Category "${validCategory}" has single item:`, categoryItems);

                        normalizedItems[validCategory] = [{
                            ...categoryItems,
                            category: validCategory,
                            id: categoryItems.id || `single-${Date.now()}`,
                            ingredient: categoryItems.ingredient || categoryItems.name,
                            name: categoryItems.ingredient || categoryItems.name
                        }];
                    } else {
                        console.warn(`⚠️ Invalid category items structure for "${validCategory}":`, categoryItems);
                    }
                });
            } else {
                console.error('❌ Invalid items structure - not array or object:', currentShoppingList.items);
            }
        } else {
            console.warn('⚠️ No items found in currentShoppingList');
        }

        // Clean up empty categories
        Object.keys(normalizedItems).forEach(category => {
            if (!Array.isArray(normalizedItems[category]) || normalizedItems[category].length === 0) {
                console.log(`🗑️ Removing empty category: ${category}`);
                delete normalizedItems[category];
            }
        });

        const finalCategories = Object.keys(normalizedItems);
        const totalItems = Object.values(normalizedItems).reduce((sum, items) => sum + items.length, 0);

        console.log(`✅ Normalization complete:`, {
            categories: finalCategories,
            totalItems: totalItems,
            categoriesWithCounts: Object.fromEntries(
                Object.entries(normalizedItems).map(([cat, items]) => [cat, items.length])
            )
        });

        // ADDITIONAL DEBUGGING: Log sample items from each category
        Object.entries(normalizedItems).forEach(([category, items]) => {
            console.log(`📦 Category "${category}" sample items:`, items.slice(0, 2));
        });

        return {
            items: normalizedItems,
            summary: {
                totalItems: totalItems,
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
                showPriceFeatures: false, // Set to true if you want price features in enhanced mode
                showAdvancedFeatures: true,
                primaryColor: '#7c3aed'
            },
            'smart-price': {
                title: '💰 Smart Price Shopping',
                subtitle: 'Price-optimized shopping with deals',
                showPriceFeatures: true, // This should be true
                showAdvancedFeatures: false,
                primaryColor: '#059669'
            },
            'unified': {
                title: '🚀 Ultimate Shopping Assistant',
                subtitle: 'All features: AI optimization + Price intelligence',
                showPriceFeatures: true, // This should be true
                showAdvancedFeatures: true,
                primaryColor: '#0ea5e9'
            }
        };
        return configs[shoppingMode] || configs['enhanced'];
    }, [shoppingMode]);

// NEW: Add these helper functions AFTER normalizedList is defined
    const getEstimatedTotal = useCallback(() => {
        if (!normalizedList?.items) return 0;

        let total = 0;
        Object.values(normalizedList.items).forEach(categoryItems => {
            categoryItems.forEach(item => {
                if (item.selected !== false && !item.purchased) {
                    const price = item.actualPrice || item.estimatedPrice || 0;
                    const quantity = item.quantity || 1;
                    total += price * quantity;
                }
            });
        });

        return total;
    }, [normalizedList?.items]);

    const getItemsWithInventoryPrices = useCallback(() => {
        if (!normalizedList?.items) return [];

        const itemsWithPrices = [];
        Object.values(normalizedList.items).forEach(categoryItems => {
            categoryItems.forEach(item => {
                if (item.priceSource && item.priceSource.startsWith('inventory') && item.estimatedPrice > 0) {
                    itemsWithPrices.push(item);
                }
            });
        });

        return itemsWithPrices;
    }, [normalizedList?.items]);

    const getItemsNeedingPrices = useCallback(() => {
        if (!normalizedList?.items) return [];

        const itemsNeedingPrices = [];
        Object.values(normalizedList.items).forEach(categoryItems => {
            categoryItems.forEach(item => {
                if (item.selected !== false && !item.estimatedPrice && !item.actualPrice) {
                    itemsNeedingPrices.push(item);
                }
            });
        });

        return itemsNeedingPrices;
    }, [normalizedList?.items]);

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

    const getGroupedItems = useMemo(() => {
        console.log('🔄 Computing grouped items');
        console.log('📊 Input data:', {
            aiMode,
            hasAiOptimization: !!aiOptimization,
            normalizedListItems: normalizedList.items,
            normalizedListKeys: Object.keys(normalizedList.items || {})
        });

        if (aiMode === 'ai-optimized' && aiOptimization) {
            console.log('🤖 Using AI-optimized grouping');
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
            console.log('📂 Using standard category grouping');
            const grouped = {};

            if (normalizedList.items && typeof normalizedList.items === 'object') {
                Object.entries(normalizedList.items).forEach(([category, items]) => {
                    console.log(`🔍 Processing category "${category}" with ${items?.length || 0} items`);

                    if (Array.isArray(items)) {
                        const filtered = getFilteredItems(items);
                        console.log(`✅ Filtered category "${category}": ${filtered.length} items`);

                        if (filtered.length > 0) {
                            grouped[category] = filtered;
                        }
                    } else {
                        console.warn(`⚠️ Items in category "${category}" is not an array:`, items);
                    }
                });
            } else {
                console.error('❌ normalizedList.items is not a valid object:', normalizedList.items);
            }

            console.log('✅ Grouped items result:', {
                categories: Object.keys(grouped),
                totalItems: Object.values(grouped).reduce((sum, items) => sum + items.length, 0)
            });

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

    const handlePriceChange = useCallback((itemKey, newPriceValue) => {
        // Update local state immediately (this won't trigger PriceControls re-render due to memo fix)
        setLocalPrices(prev => ({
            ...prev,
            [itemKey]: newPriceValue
        }));

        // Clear existing timeout
        if (priceUpdateTimeouts.current[itemKey]) {
            clearTimeout(priceUpdateTimeouts.current[itemKey]);
        }

        // Only update the actual shopping list for complete values
        // Increased delay for decimal inputs to allow user to finish typing
        const shouldUpdateImmediately = newPriceValue !== '' &&
            !newPriceValue.endsWith('.') &&
            !isNaN(parseFloat(newPriceValue));

        const delay = shouldUpdateImmediately ? 800 : 2000; // Longer delays to reduce interruptions

        priceUpdateTimeouts.current[itemKey] = setTimeout(() => {
            if (newPriceValue !== '' && !isNaN(parseFloat(newPriceValue))) {
                updateShoppingListPrice(itemKey, newPriceValue);
            }
            delete priceUpdateTimeouts.current[itemKey];
        }, delay);
    }, [updateShoppingListPrice]);

    const handleQuantityChange = useCallback((itemKey, newQuantity) => {
        setLocalQuantities(prev => ({
            ...prev,
            [itemKey]: newQuantity
        }));

        if (quantityUpdateTimeouts.current[itemKey]) {
            clearTimeout(quantityUpdateTimeouts.current[itemKey]);
        }

        // Longer delay for quantity changes to prevent focus loss
        quantityUpdateTimeouts.current[itemKey] = setTimeout(() => {
            updateShoppingListQuantity(itemKey, newQuantity);
            delete quantityUpdateTimeouts.current[itemKey];
        }, 600); // Increased from 300ms to 600ms
    }, [updateShoppingListQuantity]);

    const handlePriceBlur = useCallback((itemKey, value) => {
        if (priceUpdateTimeouts.current[itemKey]) {
            clearTimeout(priceUpdateTimeouts.current[itemKey]);
            updateShoppingListPrice(itemKey, value);
            delete priceUpdateTimeouts.current[itemKey];
        }
    }, [updateShoppingListPrice]);

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

    // FIXED: handleRemoveItem function with proper state updates and re-rendering
    const handleRemoveItem = useCallback((itemToRemove, categoryName) => {
        console.log(`🗑️ Removing item "${itemToRemove.ingredient || itemToRemove.name}" from category "${categoryName}"`);

        // CRITICAL FIX: Create completely new objects to trigger React re-render
        const updatedShoppingList = JSON.parse(JSON.stringify(currentShoppingList)); // Deep clone
        const updatedItems = {...updatedShoppingList.items};

        if (updatedItems[categoryName]) {
            const beforeCount = updatedItems[categoryName].length;

            // Remove the specific item from the category
            updatedItems[categoryName] = updatedItems[categoryName].filter(item => {
                const itemId = item.id || `${item.ingredient || item.name}-${item.category || categoryName}`;
                const removeItemId = itemToRemove.id || `${itemToRemove.ingredient || itemToRemove.name}-${itemToRemove.category || categoryName}`;

                // Also check by ingredient/name for extra safety
                const itemName = (item.ingredient || item.name).toLowerCase().trim();
                const removeItemName = (itemToRemove.ingredient || itemToRemove.name).toLowerCase().trim();

                const shouldRemove = itemId === removeItemId || itemName === removeItemName;

                if (shouldRemove) {
                    console.log(`✅ Found and removing item: "${item.ingredient || item.name}"`);
                }

                return !shouldRemove;
            });

            const afterCount = updatedItems[categoryName].length;
            console.log(`📊 Item removal: ${beforeCount} → ${afterCount} items in "${categoryName}"`);

            // If category is now empty, remove it entirely
            if (updatedItems[categoryName].length === 0) {
                delete updatedItems[categoryName];
                console.log(`🗑️ Removed empty category: ${categoryName}`);
            }
        } else {
            console.warn(`⚠️ Category "${categoryName}" not found in shopping list`);
            return; // Exit early if category doesn't exist
        }

        // CRITICAL FIX: Update items first, then the shopping list
        updatedShoppingList.items = updatedItems;

        // Force a complete re-render by setting state to null first, then the new state
        setCurrentShoppingList(null);

        // Use setTimeout to ensure the null state is processed before setting the new state
        setTimeout(() => {
            setCurrentShoppingList(updatedShoppingList);
            console.log(`✅ Shopping list state updated - ${Object.keys(updatedItems).length} categories remaining`);
        }, 0);

        // Update purchased items state to remove the deleted item
        const itemKey = itemToRemove.itemKey || `${itemToRemove.ingredient || itemToRemove.name}-${categoryName}`;
        setPurchasedItems(prev => {
            const updated = {...prev};
            delete updated[itemKey];
            console.log(`🗑️ Removed purchased status for: ${itemKey}`);
            return updated;
        });

        // Recalculate budget if in price mode
        const config = getModeConfig();
        if (config.showPriceFeatures) {
            // Delay budget calculation to ensure state is updated
            setTimeout(() => {
                calculateBudgetTracking();
            }, 100);
        }

        MobileHaptics?.light();
        console.log(`✅ Item "${itemToRemove.ingredient || itemToRemove.name}" successfully removed`);
    }, [currentShoppingList, getModeConfig, calculateBudgetTracking]);

    const renderControls = () => (
        <div style={{
            padding: headerCollapsed ? '0.25rem 1rem' : '0.5rem 1rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            gap: '0.375rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            flexShrink: 0,
            minHeight: headerCollapsed ? '44px' : '64px'
        }}>
            {/* Collapsible Details Section */}
            {!headerCollapsed && (
                <>
                    {/* Filter Dropdown with Icon */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '100px', maxWidth: '120px' }}>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            disabled={editingCategories}
                            style={{
                                padding: '0.375rem 0.375rem 0.375rem 2rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                backgroundColor: editingCategories ? '#f3f4f6' : 'white',
                                width: '100%',
                                opacity: editingCategories ? 0.6 : 1,
                                appearance: 'none',
                                backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1rem'
                            }}
                        >
                            <option value="all">All ({stats.totalItems})</option>
                            <option value="needToBuy">Need ({stats.needToBuy})</option>
                            <option value="inInventory">Have ({stats.inInventory})</option>
                            <option value="purchased">Done ({stats.purchased})</option>
                        </select>
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#6b7280"
                            strokeWidth="2"
                            style={{
                                position: 'absolute',
                                left: '0.5rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none'
                            }}
                        >
                            <path d="M3 6h18"/>
                            <path d="M7 12h10"/>
                            <path d="M10 18h4"/>
                        </svg>
                    </div>

                    {/* Store Selection with Icon */}
                    <TouchEnhancedButton
                        onClick={() => setShowStoreSelector(true)}
                        disabled={editingCategories}
                        style={{
                            background: selectedStore ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.375rem 0.5rem',
                            fontSize: '0.7rem',
                            cursor: editingCategories ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            opacity: editingCategories ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            maxWidth: '100px',
                            overflow: 'hidden'
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 7h-3V5a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v2H5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3zM10 5h4v2h-4V5z"/>
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedStore ? selectedStore.substring(0, 6) : 'Store'}
                    </span>
                    </TouchEnhancedButton>

                    {/* Smart Price Mode Controls */}
                    {config.showPriceFeatures && (
                        <>
                            <TouchEnhancedButton
                                onClick={() => setPriceMode('smart')}
                                style={{
                                    padding: '0.375rem',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: priceMode === 'smart' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'white',
                                    color: priceMode === 'smart' ? 'white' : '#64748b',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    boxShadow: priceMode === 'smart' ? '0 2px 4px rgba(59, 130, 246, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17C15.24 5.06 14.32 5 13.4 5C11.1 5 8.84 5.56 6.84 6.62L3 3L1.5 4.5L6.05 9.05C5.38 9.86 5 10.89 5 12C5 14.21 6.79 16 9 16H15C17.21 16 19 14.21 19 12C19 11.42 18.88 10.86 18.67 10.34L21 12.5V9M11 11H9V13H11V11M15 11H13V13H15V11Z"/>
                                </svg>
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => setPriceMode('budget')}
                                style={{
                                    padding: '0.375rem',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: priceMode === 'budget' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'white',
                                    color: priceMode === 'budget' ? 'white' : '#64748b',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    boxShadow: priceMode === 'budget' ? '0 2px 4px rgba(16, 185, 129, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.5 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.5 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.5 11.8 10.9Z"/>
                                </svg>
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => setPriceMode('deals')}
                                style={{
                                    padding: '0.375rem',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: priceMode === 'deals' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'white',
                                    color: priceMode === 'deals' ? 'white' : '#64748b',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    boxShadow: priceMode === 'deals' ? '0 2px 4px rgba(139, 92, 246, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                            </TouchEnhancedButton>
                        </>
                    )}

                    {/* AI Button with Enhanced Icon */}
                    <TouchEnhancedButton
                        onClick={async () => {
                            if (smartSuggestions && smartSuggestions.length > 0) {
                                setShowAiPanel(!showAiPanel);
                            } else {
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
                            background: smartSuggestions?.length > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.375rem 0.5rem',
                            fontSize: '0.7rem',
                            cursor: (aiLoading || editingCategories) ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            opacity: (aiLoading || editingCategories) ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {aiLoading ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-spin">
                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                            </svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17C15.24 5.06 14.32 5 13.4 5C11.1 5 8.84 5.56 6.84 6.62L3 3L1.5 4.5L6.05 9.05C5.38 9.86 5 10.89 5 12C5 14.21 6.79 16 9 16H15C17.21 16 19 14.21 19 12C19 11.42 18.88 10.86 18.67 10.34L21 12.5V9M11 11H9V13H11V11M15 11H13V13H15V11Z"/>
                            </svg>
                        )}
                        <span>
                        {aiLoading ? 'AI...' : smartSuggestions?.length > 0 ? `AI (${smartSuggestions.length})` : 'AI'}
                    </span>
                    </TouchEnhancedButton>

                    {/* Category Management Button */}
                    <TouchEnhancedButton
                        onClick={() => setEditingCategories(!editingCategories)}
                        style={{
                            background: editingCategories ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.375rem 0.5rem',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                        }}
                    >
                        {editingCategories ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10 4H4c-1.11 0-2 .89-2 2v5h2V8h4V6m6 0v2h4v8h-4v2h4c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2h-6M16 10v6l5.5-3L16 10Z"/>
                            </svg>
                        )}
                        <span>{editingCategories ? 'Done' : 'Edit'}</span>
                    </TouchEnhancedButton>

                    {/* Quick Actions - Enhanced with Icons */}
                    {!editingCategories && (
                        <>
                            <TouchEnhancedButton
                                onClick={markAllAsPurchased}
                                style={{
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.375rem',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)'
                                }}
                                title="Mark all as purchased"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M20 6L9 17l-5-5"/>
                                </svg>
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => setShowActions(!showActions)}
                                style={{
                                    background: showActions ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.375rem',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    boxShadow: showActions ? '0 2px 4px rgba(220, 38, 38, 0.3)' : '0 2px 4px rgba(100, 116, 139, 0.3)'
                                }}
                                title="More actions"
                            >
                                {showActions ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M18 6L6 18"/>
                                        <path d="M6 6l12 12"/>
                                    </svg>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                                    </svg>
                                )}
                            </TouchEnhancedButton>
                        </>
                    )}
                </>
            )}

            {/* Collapsed State Info */}
            {headerCollapsed && (
                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: '500'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
                        </svg>
                        <span>{stats.totalItems} items</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <span>{stats.purchased} done</span>
                    </div>
                    {config.showPriceFeatures && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: '#059669',
                            fontWeight: '600'
                        }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.5 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.5 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.5 11.8 10.9Z"/>
                            </svg>
                            <span>{formatPrice(budgetTracking.current)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );



    // ENHANCED: Item rendering with delete functionality
    const renderShoppingItem = (item, index, category) => {
        const itemKey = item.itemKey || item.ingredientKey || `${item.ingredient || item.name}-${category}`;
        const isPurchased = item.purchased;
        const isExpanded = expandedItems.has(itemKey); // ✅ Use component state instead

        const toggleExpanded = () => {
            setExpandedItems(prev => {
                const newSet = new Set(prev);
                if (newSet.has(itemKey)) {
                    newSet.delete(itemKey);
                } else {
                    newSet.add(itemKey);
                }
                return newSet;
            });
        };

        // Get category icon from GROCERY_CATEGORIES
        const categoryInfo = GROCERY_CATEGORIES[category];
        const categoryIcon = categoryInfo?.icon || '📦';

        return (
            <div
                key={`${index}-${itemKey}-${updateTrigger}`}
                style={{
                    backgroundColor: isPurchased ? '#f0fdf4' : 'white',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    opacity: isPurchased ? 0.7 : 1,
                    marginBottom: '0.5rem',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease'
                }}
            >
                {/* Compact Item Row */}
                <div
                    onClick={toggleExpanded} // ✅ Use the new toggle function
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        cursor: 'pointer',
                        minHeight: '60px'
                    }}
                >
                    {/* Checkbox */}
                    {!editingCategories && (
                        <input
                            type="checkbox"
                            checked={isPurchased}
                            onChange={(e) => {
                                e.stopPropagation();
                                safeHandleItemToggle(itemKey);
                            }}
                            style={{
                                cursor: 'pointer',
                                transform: 'scale(1.2)',
                                accentColor: config.primaryColor,
                                flexShrink: 0
                            }}
                        />
                    )}

                    {/* Enhanced Category Icon with Visual Status */}
                    <div style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        position: 'relative',
                        flexShrink: 0,
                        background: (() => {
                            if (isPurchased) return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                            if (item.inInventory) return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                            if (item.estimatedPrice > 0) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                            return 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
                        })(),
                        border: `2px solid ${(() => {
                            if (isPurchased) return '#065f46';
                            if (item.inInventory) return '#1e40af';
                            if (item.estimatedPrice > 0) return '#92400e';
                            return '#cbd5e1';
                        })()}`,
                        color: (() => {
                            if (isPurchased || item.inInventory || item.estimatedPrice > 0) return 'white';
                            return '#64748b';
                        })(),
                        fontSize: '1rem',
                        fontWeight: '600',
                        boxShadow: (() => {
                            if (isPurchased) return '0 2px 4px rgba(16, 185, 129, 0.3)';
                            if (item.inInventory) return '0 2px 4px rgba(59, 130, 246, 0.3)';
                            if (item.estimatedPrice > 0) return '0 2px 4px rgba(245, 158, 11, 0.3)';
                            return '0 1px 3px rgba(0, 0, 0, 0.1)';
                        })(),
                        transition: 'all 0.2s ease'
                    }}>
                        {/* Main Category Icon */}
                        <span style={{ fontSize: '14px', lineHeight: 1 }}>
        {categoryIcon}
    </span>

                        {/* Status Indicator Badges */}
                        {isPurchased && (
                            <div style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                width: '16px',
                                height: '16px',
                                backgroundColor: '#065f46',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid white',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                            }}>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="none">
                                    <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/>
                                </svg>
                            </div>
                        )}

                        {item.inInventory && !isPurchased && (
                            <div style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                width: '16px',
                                height: '16px',
                                backgroundColor: '#1e40af',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid white',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                            }}>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="none">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                            </div>
                        )}

                        {item.priceSource && item.priceSource.startsWith('inventory') && !isPurchased && !item.inInventory && (
                            <div style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                width: '16px',
                                height: '16px',
                                backgroundColor: '#d97706',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid white',
                                fontSize: '8px',
                                fontWeight: '700',
                                color: 'white',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                            }}>
                                $
                            </div>
                        )}

                        {/* Priority indicator for urgent items */}
                        {item.dealStatus === 'deal' && !isPurchased && (
                            <div style={{
                                position: 'absolute',
                                bottom: '-4px',
                                left: '-4px',
                                width: '14px',
                                height: '14px',
                                backgroundColor: '#dc2626',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid white',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                            }}>
                                <svg width="6" height="6" viewBox="0 0 24 24" fill="white">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Item Info */}
                    <div style={{flex: 1, minWidth: 0}}>
                        <div style={{
                            fontWeight: '500',
                            color: '#374151',
                            fontSize: '0.95rem',
                            lineHeight: '1.4',
                            textDecoration: isPurchased ? 'line-through' : 'none',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {item.quantity && item.quantity !== 1 && `${item.quantity} `}
                            {item.unit && `${item.unit} `}
                            {item.ingredient || item.name}
                        </div>

                        {/* Compact status indicators */}
                        <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            marginTop: '0.25rem',
                            fontSize: '0.7rem'
                        }}>
                            {item.inInventory && (
                                <span style={{
                                    color: '#16a34a',
                                    backgroundColor: '#dcfce7',
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: '8px',
                                    fontWeight: '500'
                                }}>
                                ✅ In Stock
                            </span>
                            )}

                            {config.showPriceFeatures && item.estimatedPrice > 0 && (
                                <span style={{
                                    color: '#374151',
                                    fontWeight: '600'
                                }}>
                                {formatPrice(item.estimatedPrice * (item.quantity || 1))}
                            </span>
                            )}

                            {item.recipes && item.recipes.length > 0 && (
                                <span style={{
                                    color: '#6b7280',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1,
                                    minWidth: 0
                                }}>
                                {item.recipes.slice(0, 2).join(', ')}
                                    {item.recipes.length > 2 && ` +${item.recipes.length - 2}`}
                            </span>
                            )}
                        </div>
                    </div>

                    {/* Expand/Collapse Indicator */}
                    <div style={{
                        fontSize: '0.875rem',
                        color: '#9ca3af',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0
                    }}>
                        ▼
                    </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                    <div style={{
                        borderTop: '1px solid #f3f4f6',
                        padding: '0.75rem',
                        backgroundColor: '#f8fafc'
                    }}>
                        {/* Price Controls - Only in price modes */}
                        {config.showPriceFeatures && (
                            <div style={{marginBottom: '0.75rem'}}>
                                <PriceControls
                                    item={item}
                                    itemKey={itemKey}
                                    localPrices={localPrices}
                                    localQuantities={localQuantities}
                                    onPriceChange={handlePriceChange}
                                    onQuantityChange={handleQuantityChange}
                                    onPriceBlur={handlePriceBlur}
                                />
                            </div>
                        )}

                        {/* Inventory Details */}
                        {item.inInventory && item.inventoryItem && (
                            <div style={{
                                fontSize: '0.8rem',
                                color: '#16a34a',
                                backgroundColor: '#f0fdf4',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #bbf7d0',
                                marginBottom: '0.75rem'
                            }}>
                                📦 <strong>In inventory:</strong> {item.haveAmount || 'Available'}
                                {item.inventoryItem?.location && (
                                    <span> ({item.inventoryItem.location})</span>
                                )}
                            </div>
                        )}

                        {/* Recipe References */}
                        {item.recipes && item.recipes.length > 0 && (
                            <div style={{
                                fontSize: '0.8rem',
                                color: '#6b7280',
                                backgroundColor: '#f8fafc',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #e2e8f0',
                                marginBottom: '0.75rem'
                            }}>
                                <strong>Used in:</strong> {item.recipes.join(', ')}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            flexWrap: 'wrap'
                        }}>
                            {editingCategories ? (
                                <>
                                    <TouchEnhancedButton
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMovingItem({
                                                item,
                                                fromCategory: category,
                                                currentCategories: Object.keys(normalizedList.items)
                                            });
                                        }}
                                        style={{
                                            backgroundColor: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '0.375rem 0.75rem',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            fontWeight: '500'
                                        }}
                                    >
                                        📦 Move
                                    </TouchEnhancedButton>

                                    <TouchEnhancedButton
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Remove "${item.ingredient || item.name}"?`)) {
                                                handleRemoveItem(item, category);
                                            }
                                        }}
                                        style={{
                                            backgroundColor: '#dc2626',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '0.375rem 0.75rem',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            fontWeight: '500'
                                        }}
                                    >
                                        🗑️ Remove
                                    </TouchEnhancedButton>
                                </>
                            ) : (
                                <TouchEnhancedButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Remove "${item.ingredient || item.name}"?`)) {
                                            handleRemoveItem(item, category);
                                        }
                                    }}
                                    style={{
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.375rem 0.75rem',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    Remove
                                </TouchEnhancedButton>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

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
                    {/* Enhanced Header with Brand Colors and Heroicons */}
                    <div style={{
                        padding: '0.5rem 1rem',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: (() => {
                            if (aiMode === 'ai-optimized') return 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)';
                            if (editingCategories) return 'linear-gradient(135deg, #fef3c7 0%, #fff7ed 100%)';
                            if (shoppingMode === 'smart-price') return 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)';
                            if (shoppingMode === 'unified') return 'linear-gradient(135deg, #f3e8ff 0%, #eff6ff 100%)';
                            return 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';
                        })(),
                        flexShrink: 0,
                        minHeight: '64px'
                    }}>
                        <div style={{flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                            {/* Collapse Toggle with Heroicon */}
                            <TouchEnhancedButton
                                onClick={() => setHeaderCollapsed(!headerCollapsed)}
                                style={{
                                    backgroundColor: headerCollapsed ? '#6366f1' : '#e2e8f0',
                                    color: headerCollapsed ? 'white' : '#64748b',
                                    border: 'none',
                                    borderRadius: '8px',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    flexShrink: 0,
                                    transition: 'all 0.2s ease'
                                }}
                                title={headerCollapsed ? 'Show controls' : 'Hide controls'}
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    style={{
                                        transform: headerCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease'
                                    }}
                                >
                                    <path d="m18 15-6-6-6 6"/>
                                </svg>
                            </TouchEnhancedButton>

                            <div style={{flex: 1, minWidth: 0}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap'}}>
                                    {/* Brand Icon */}
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                            <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
                                        </svg>
                                    </div>

                                    <h2 style={{
                                        margin: 0,
                                        fontSize: '1rem',
                                        fontWeight: '700',
                                        color: '#1e293b',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        minWidth: 0
                                    }}>
                                        {config.title}
                                    </h2>

                                    {/* Compact Mode Switcher Button */}
                                    <TouchEnhancedButton
                                        onClick={() => setShowModeSelector(true)}
                                        style={{
                                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '0.125rem 0.5rem',
                                            fontSize: '0.65rem',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            whiteSpace: 'nowrap',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                                        }}
                                        title="Switch shopping mode"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 12c0 1.2-4.03 6-9 6s-9-4.8-9-6c0-1.2 4.03-6 9-6s9 4.8 9 6"/>
                                            <path d="M9 12l2 2 4-4"/>
                                        </svg>
                                        Mode
                                    </TouchEnhancedButton>
                                </div>

                                <p style={{
                                    margin: '0.125rem 0 0 0',
                                    fontSize: '0.7rem',
                                    color: '#64748b',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {config.subtitle}
                                </p>

                                {/* Compact Status Indicators */}
                                <div style={{display: 'flex', gap: '0.375rem', marginTop: '0.25rem', flexWrap: 'wrap'}}>
                                    {aiLoading && (
                                        <span style={{
                                            fontSize: '0.6rem',
                                            color: '#d97706',
                                            backgroundColor: '#fef3c7',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            border: '1px solid #fbbf24'
                                        }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-spin">
                            <path d="M21 12a9 9 0 11-6.219-8.56"/>
                        </svg>
                        AI Processing
                    </span>
                                    )}

                                    {smartSuggestions && smartSuggestions.length > 0 && (
                                        <TouchEnhancedButton
                                            onClick={() => setShowAiPanel(!showAiPanel)}
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#059669',
                                                backgroundColor: '#d1fae5',
                                                padding: '0.125rem 0.375rem',
                                                borderRadius: '8px',
                                                fontWeight: '600',
                                                border: '1px solid #10b981',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}
                                        >
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17C15.24 5.06 14.32 5 13.4 5C11.1 5 8.84 5.56 6.84 6.62L3 3L1.5 4.5L6.05 9.05C5.38 9.86 5 10.89 5 12C5 14.21 6.79 16 9 16H15C17.21 16 19 14.21 19 12C19 11.42 18.88 10.86 18.67 10.34L21 12.5V9M11 11H9V13H11V11M15 11H13V13H15V11Z"/>
                                            </svg>
                                            AI ({smartSuggestions.length}) {showAiPanel ? '▼' : '▶'}
                                        </TouchEnhancedButton>
                                    )}

                                    {config.showPriceFeatures && priceAnalysis.totalSavings > 0 && (
                                        <span style={{
                                            fontSize: '0.6rem',
                                            color: '#059669',
                                            backgroundColor: '#d1fae5',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            border: '1px solid #10b981'
                                        }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M17,13H13V17H11V13H7V11H11V7H13V11H17V13Z"/>
                        </svg>
                                            {formatPrice(priceAnalysis.totalSavings)} saved
                    </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Close Button with Heroicon - Properly positioned */}
                        <TouchEnhancedButton
                            onClick={onClose}
                            style={{
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.5rem',
                                cursor: 'pointer',
                                marginLeft: '0.75rem',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '36px',
                                height: '36px',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.2s ease'
                            }}
                            title="Close shopping list"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 6L6 18"/>
                                <path d="M6 6l12 12"/>
                            </svg>
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
                                    }}>Est. Total
                                    </div>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        color: budgetTracking.limit && getEstimatedTotal() > budgetTracking.limit ? '#dc2626' : '#059669'
                                    }}>
                                        {formatPrice(getEstimatedTotal())}
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
                                    }}>Inventory
                                    </div>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        color: '#059669'
                                    }}>
                                        {getItemsWithInventoryPrices().length}
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
                                    }}>Need Price
                                    </div>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        color: '#dc2626'
                                    }}>
                                        {getItemsNeedingPrices().length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Enhanced Controls with Mode-Specific Features */}
                    {renderControls()}

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
                                            Object.entries(getGroupedItems)
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
                        {Object.keys(getGroupedItems).length === 0 ? (
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
                                {Object.entries(getGroupedItems).map(([category, items]) => (
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
                                            {items.map((item, index) => renderShoppingItem(item, index, category))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Enhanced Footer with Brand Styling */}
                    <div style={{
                        padding: footerCollapsed ? '0.5rem 1rem' : '0.75rem 1rem',
                        paddingBottom: `calc(${footerCollapsed ? '0.5rem' : '0.75rem'} + max(env(safe-area-inset-bottom, 12px), 12px))`,
                        borderTop: '1px solid #e2e8f0',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: footerCollapsed ? '0.5rem' : '0.75rem',
                        flexShrink: 0,
                        minHeight: footerCollapsed ? '64px' : '88px'
                    }}>
                        {/* Primary Actions Row */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto auto auto',
                            gap: '0.5rem',
                            alignItems: 'center'
                        }}>
                            {/* Save Button with Enhanced Styling */}
                            <TouchEnhancedButton
                                onClick={config.showPriceFeatures ? handleSmartSave : () => setShowSaveModal(true)}
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: footerCollapsed ? '0.625rem 1rem' : '0.75rem 1.25rem',
                                    fontSize: footerCollapsed ? '0.875rem' : '0.95rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    minWidth: 0,
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                                    <polyline points="17,21 17,13 7,13 7,21"/>
                                    <polyline points="7,3 7,8 15,8"/>
                                </svg>
                                <span>Save List</span>
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
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: footerCollapsed ? '0.625rem' : '0.75rem',
                                    fontSize: footerCollapsed ? '0.8rem' : '0.875rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.375rem',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
                                </svg>
                                <span>{shoppingProgress.startTime ? 'Resume' : 'Shop'}</span>
                            </TouchEnhancedButton>

                            {/* Share Button */}
                            <TouchEnhancedButton
                                onClick={() => setShowEmailModal(true)}
                                style={{
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: footerCollapsed ? '0.625rem' : '0.75rem',
                                    fontSize: footerCollapsed ? '0.8rem' : '0.875rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.375rem',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                                    <polyline points="16,6 12,2 8,6"/>
                                    <line x1="12" y1="2" x2="12" y2="15"/>
                                </svg>
                                <span>Share</span>
                            </TouchEnhancedButton>

                            {/* Collapse Toggle with Enhanced Icon */}
                            <TouchEnhancedButton
                                onClick={() => setFooterCollapsed(!footerCollapsed)}
                                style={{
                                    background: footerCollapsed ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.625rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    minWidth: '44px',
                                    textAlign: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                    transition: 'all 0.2s ease'
                                }}
                                title={footerCollapsed ? 'Expand footer' : 'Collapse for more space'}
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    style={{
                                        transform: footerCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                                        transition: 'transform 0.2s ease'
                                    }}
                                >
                                    <path d="m18 15-6-6-6 6"/>
                                </svg>
                            </TouchEnhancedButton>
                        </div>

                        {/* Expandable Footer Content with Enhanced Styling */}
                        {!footerCollapsed && (
                            <>
                                {/* Summary Statistics with Enhanced Visual Design */}
                                <div style={{
                                    background: 'linear-gradient(135deg, white 0%, #f8fafc 100%)',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                                }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: config.showPriceFeatures ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
                                        gap: '1rem',
                                        fontSize: '0.875rem'
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.25rem',
                                                color: '#64748b',
                                                marginBottom: '0.25rem'
                                            }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
                                                </svg>
                                                <span>Items:</span>
                                            </div>
                                            <div style={{fontWeight: '700', color: '#1e293b', fontSize: '1.125rem'}}>
                                                {stats.totalItems}
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.25rem',
                                                color: '#64748b',
                                                marginBottom: '0.25rem'
                                            }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M20 6L9 17l-5-5"/>
                                                </svg>
                                                <span>Done:</span>
                                            </div>
                                            <div style={{fontWeight: '700', color: '#10b981', fontSize: '1.125rem'}}>
                                                {stats.purchased}
                                            </div>
                                        </div>

                                        {config.showPriceFeatures && (
                                            <>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.25rem',
                                                        color: '#64748b',
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.5 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.5 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.5 11.8 10.9Z"/>
                                                        </svg>
                                                        <span>Total:</span>
                                                    </div>
                                                    <div style={{
                                                        fontWeight: '700',
                                                        color: budgetTracking.limit && budgetTracking.current > budgetTracking.limit ? '#dc2626' : '#1e293b',
                                                        fontSize: '1.125rem'
                                                    }}>
                                                        {formatPrice(budgetTracking.current)}
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.25rem',
                                                        color: '#64748b',
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                                        </svg>
                                                        <span>Saved:</span>
                                                    </div>
                                                    <div style={{fontWeight: '700', color: '#10b981', fontSize: '1.125rem'}}>
                                                        {formatPrice(priceAnalysis.totalSavings || 0)}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Enhanced Budget Progress Bar */}
                                    {config.showPriceFeatures && budgetTracking.limit && (
                                        <div style={{
                                            marginTop: '1rem',
                                            paddingTop: '1rem',
                                            borderTop: '1px solid #e2e8f0'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontSize: '0.875rem',
                                                marginBottom: '0.75rem'
                                            }}>
                                                <span style={{color: '#64748b', fontWeight: '600'}}>Budget Progress:</span>
                                                <span style={{
                                                    fontWeight: '700',
                                                    color: budgetTracking.remaining >= 0 ? '#10b981' : '#dc2626'
                                                }}>
                                {budgetTracking.remaining >= 0 ? 'Under' : 'Over'} by {formatPrice(Math.abs(budgetTracking.remaining))}
                            </span>
                                            </div>
                                            <div style={{
                                                width: '100%',
                                                height: '8px',
                                                backgroundColor: '#e2e8f0',
                                                borderRadius: '6px',
                                                overflow: 'hidden',
                                                position: 'relative'
                                            }}>
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        width: `${Math.min(100, (budgetTracking.current / budgetTracking.limit) * 100)}%`,
                                                        background: budgetTracking.current <= budgetTracking.limit
                                                            ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                                                            : 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
                                                        borderRadius: '6px',
                                                        transition: 'width 0.3s ease'
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Enhanced Footer Info */}
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#64748b',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25rem'
                                }}>
                                    {normalizedList.generatedAt && (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10"/>
                                                <polyline points="12,6 12,12 16,14"/>
                                            </svg>
                                            <span>Generated {new Date(normalizedList.generatedAt).toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.75rem',
                                        flexWrap: 'wrap'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19 7h-3V5a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v2H5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3zM10 5h4v2h-4V5z"/>
                                            </svg>
                                            <span>{selectedStore || 'No store selected'}</span>
                                        </div>
                                        {aiMode === 'ai-optimized' && aiInsights && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17C15.24 5.06 14.32 5 13.4 5C11.1 5 8.84 5.56 6.84 6.62L3 3L1.5 4.5L6.05 9.05C5.38 9.86 5 10.89 5 12C5 14.21 6.79 16 9 16H15C17.21 16 19 14.21 19 12C19 11.42 18.88 10.86 18.67 10.34L21 12.5V9M11 11H9V13H11V11M15 11H13V13H15V11Z"/>
                                                </svg>
                                                <span>AI Optimized ({(aiInsights.confidenceScore * 100).toFixed(0)}%)</span>
                                            </div>
                                        )}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            padding: '0.25rem 0.5rem',
                                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '0.7rem',
                                            fontWeight: '600'
                                        }}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17C15.24 5.06 14.32 5 13.4 5C11.1 5 8.84 5.56 6.84 6.62L3 3L1.5 4.5L6.05 9.05C5.38 9.86 5 10.89 5 12C5 14.21 6.79 16 9 16H15C17.21 16 19 14.21 19 12C19 11.42 18.88 10.86 18.67 10.34L21 12.5V9M11 11H9V13H11V11M15 11H13V13H15V11Z"/>
                                            </svg>
                                            <span>{config.title}</span>
                                        </div>
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
            {/* Save Shopping List Modal - FIXED to prevent double save */}
            <SaveShoppingListModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={(savedList) => {
                    console.log(`${config.title} saved successfully:`, savedList);

                    // SAFE FIX: Only call parent onSave if preventDoubleSave is false
                    if (!preventDoubleSave && onSave) {
                        onSave(savedList);
                    }

                    // Always close the modal after save
                    setShowSaveModal(false);
                }}
                shoppingList={normalizedList}
                listType={sourceMealPlanId ? 'meal-plan' : 'recipes'}
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
                                    Object.entries(getGroupedItems)
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