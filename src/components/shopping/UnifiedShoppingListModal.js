'use client';

// file: /src/components/shopping/UnifiedShoppingListModal.js v5 - Auto-applies store category orders

import {useState, useEffect} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import EmailSharingModal from '@/components/sharing/EmailSharingModal';
import SaveShoppingListModal from '@/components/shared/SaveShoppingListModal';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {StoreLayoutUtils} from '@/lib/storeLayouts';
import ShoppingListTotals from '@/components/shopping/ShoppingListTotals';
import PrintOptionsModal from '@/components/shopping/PrintOptionsModal';
import { ShoppingListTotalsCalculator } from '@/lib/shoppingListTotals';

export default function UnifiedShoppingListModal({
                                                     isOpen,
                                                     onClose,
                                                     shoppingList,
                                                     title = '🛒 Shopping List',
                                                     subtitle = null,
                                                     sourceRecipeIds = [],
                                                     sourceMealPlanId = null,
                                                     onRefresh = null,
                                                     showRefresh = false
                                                 }) {
    const {data: session} = useSafeSession();
    const [filter, setFilter] = useState('all');
    const [purchasedItems, setPurchasedItems] = useState({});
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showActions, setShowActions] = useState(false);

    // Drag & Drop State (Items only)
    const [draggedItem, setDraggedItem] = useState(null);
    const [draggedCategory, setDraggedCategory] = useState(null);
    const [dragOverCategory, setDragOverCategory] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [customOrder, setCustomOrder] = useState({});
    const [reorderMode, setReorderMode] = useState(false);

    // Store Layout State
    const [selectedStore, setSelectedStore] = useState('');
    const [storeLayoutMode, setStoreLayoutMode] = useState(false);
    const [currentStoreLayout, setCurrentStoreLayout] = useState(null);
    const [shoppingRoute, setShoppingRoute] = useState(null);
    const [stores, setStores] = useState([]);
    const [showStoreSelector, setShowStoreSelector] = useState(false);
    const [routeMode, setRouteMode] = useState(false);
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

    // 🆕 NEW: Store-specific category orders
    const [storeCategoryOrders, setStoreCategoryOrders] = useState({});
    const [appliedCategoryOrder, setAppliedCategoryOrder] = useState([]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setFilter('all');
            setPurchasedItems({});
            setShowEmailModal(false);
            setShowSaveModal(false);
            setShowActions(false);
            setReorderMode(false);
            setStoreLayoutMode(false);
            setRouteMode(false);
            setDraggedItem(null);
            setDraggedCategory(null);
            setDragOverCategory(null);
            setDragOverIndex(null);
            setShowTotals(false);
        } else {
            loadCustomOrder();
            loadStorePreference();
            fetchStores();
            loadUserPreferences();
            loadStoreCategoryOrders(); // 🆕 NEW: Load store category orders
        }
    }, [isOpen]);

    // 🆕 NEW: Load store-specific category orders
    const loadStoreCategoryOrders = () => {
        try {
            const saved = localStorage.getItem('store-category-orders');
            if (saved) {
                const parsed = JSON.parse(saved);
                setStoreCategoryOrders(parsed);
                console.log('📂 Loaded store category orders:', parsed);

                // Auto-apply if a store is already selected
                if (selectedStore) {
                    applyStoreCategoryOrder(selectedStore);
                }
            }
        } catch (error) {
            console.error('Error loading store category orders:', error);
        }
    };

    // 🆕 NEW: Apply category order for specific store
    const applyStoreCategoryOrder = (storeName) => {
        const storeData = Object.values(storeCategoryOrders).find(
            store => store.storeName === storeName
        );

        if (storeData && storeData.categories.length > 0) {
            setAppliedCategoryOrder(storeData.categories);
            console.log(`📂 Applied category order for ${storeName}:`, storeData.categories);
        } else {
            // Fall back to default store layout order
            const layout = StoreLayoutUtils.getStoreLayout(storeName);
            setAppliedCategoryOrder(layout.categoryOrder || []);
            console.log(`📂 Using default layout order for ${storeName}`);
        }
    };

    const loadUserPreferences = () => {
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
                setUserPreferences(prev => ({ ...prev, ...parsed }));
                console.log('💰 Loaded shopping preferences:', parsed);
            }
        } catch (error) {
            console.error('Error loading user preferences:', error);
        }
    };

    const saveUserPreferences = (newPreferences) => {
        try {
            const updated = { ...userPreferences, ...newPreferences };
            localStorage.setItem('shopping-preferences', JSON.stringify(updated));
            setUserPreferences(updated);
            console.log('💾 Saved shopping preferences:', updated);
        } catch (error) {
            console.error('Error saving user preferences:', error);
        }
    };

    const handleBudgetChange = (budget) => {
        saveUserPreferences({ budget });
    };

    const handleTaxRateChange = (taxRate) => {
        saveUserPreferences({ taxRate });
    };

    // Load/Save Custom Order Functions (Items within categories)
    const loadCustomOrder = () => {
        try {
            const saved = localStorage.getItem('shopping-list-custom-order');
            if (saved) {
                const parsed = JSON.parse(saved);
                setCustomOrder(parsed);
                console.log('📋 Loaded custom shopping order:', parsed);
            }
        } catch (error) {
            console.error('Error loading custom order:', error);
        }
    };

    const saveCustomOrder = (newOrder) => {
        try {
            localStorage.setItem('shopping-list-custom-order', JSON.stringify(newOrder));
            setCustomOrder(newOrder);
            console.log('💾 Saved custom shopping order:', newOrder);
        } catch (error) {
            console.error('Error saving custom order:', error);
        }
    };

    // Store Layout Functions
    const loadStorePreference = () => {
        try {
            const saved = localStorage.getItem('preferred-shopping-store');
            if (saved && session?.user?.id) {
                setSelectedStore(saved);
                console.log('🏪 Loaded preferred store:', saved);
            }
        } catch (error) {
            console.error('Error loading store preference:', error);
        }
    };

    const saveStorePreference = (storeName) => {
        try {
            localStorage.setItem('preferred-shopping-store', storeName);
            setSelectedStore(storeName);
            // 🆕 NEW: Apply category order when store changes
            applyStoreCategoryOrder(storeName);
            console.log('💾 Saved preferred store:', storeName);
        } catch (error) {
            console.error('Error saving store preference:', error);
        }
    };

    const fetchStores = async () => {
        try {
            const response = await fetch('/api/stores');
            const data = await response.json();
            if (data.success) {
                setStores(data.stores || []);
            }
        } catch (error) {
            console.error('Error fetching stores:', error);
        }
    };

    const applyStoreLayout = () => {
        if (!selectedStore || !normalizedList.items) return;

        const storeDetails = stores.find(store => store.name === selectedStore);
        const storeChain = storeDetails?.chain || '';

        console.log(`🏪 Applying store layout for: ${selectedStore} (${storeChain})`);

        const layoutResult = StoreLayoutUtils.applyStoreLayout(
            normalizedList.items,
            selectedStore,
            storeChain
        );

        setCurrentStoreLayout(layoutResult);

        const route = StoreLayoutUtils.generateShoppingRoute(
            normalizedList.items,
            selectedStore,
            storeChain
        );

        setShoppingRoute(route);
        console.log('🗺️ Generated shopping route:', route);
    };

    const toggleStoreLayoutMode = () => {
        if (!storeLayoutMode && selectedStore) {
            applyStoreLayout();
        }
        setStoreLayoutMode(!storeLayoutMode);
    };

    const handleStoreSelection = (storeName) => {
        saveStorePreference(storeName);
        setShowStoreSelector(false);

        if (storeLayoutMode) {
            setTimeout(applyStoreLayout, 100);
        }
    };

    // Apply Custom Ordering (Items within categories)
    const applyCustomOrdering = (items, category) => {
        const categoryOrder = customOrder[category];
        if (!categoryOrder) return items;

        const orderedItems = [];
        const unorderedItems = [...items];

        categoryOrder.forEach(itemName => {
            const index = unorderedItems.findIndex(item =>
                (item.ingredient || item.name) === itemName
            );
            if (index !== -1) {
                orderedItems.push(unorderedItems.splice(index, 1)[0]);
            }
        });

        orderedItems.push(...unorderedItems);
        return orderedItems;
    };

    // 🆕 UPDATED: Apply Store-Specific Category Ordering
    const applyCategoryOrdering = (categorizedItems) => {
        if (!appliedCategoryOrder.length) {
            return categorizedItems; // Return as-is if no custom order
        }

        const orderedCategories = {};
        const allCategories = Object.keys(categorizedItems);

        // First, add categories in the store-specific order
        appliedCategoryOrder.forEach(categoryName => {
            if (categorizedItems[categoryName]) {
                orderedCategories[categoryName] = categorizedItems[categoryName];
            }
        });

        // Then add any categories not in the store-specific order
        allCategories.forEach(categoryName => {
            if (!orderedCategories[categoryName]) {
                orderedCategories[categoryName] = categorizedItems[categoryName];
            }
        });

        return orderedCategories;
    };

    // Drag and Drop Handlers (Items only)
    const handleDragStart = (e, item, category, index) => {
        if (!reorderMode) return;

        setDraggedItem({
            item,
            category,
            index,
            name: item.ingredient || item.name
        });
        setDraggedCategory(category);

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);

        setTimeout(() => {
            e.target.style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedItem(null);
        setDraggedCategory(null);
        setDragOverCategory(null);
        setDragOverIndex(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnter = (e, category, index) => {
        e.preventDefault();
        if (category === draggedCategory) {
            setDragOverCategory(category);
            setDragOverIndex(index);
        }
    };

    const handleDrop = (e, targetCategory, targetIndex) => {
        e.preventDefault();

        if (!draggedItem || !reorderMode) return;

        if (draggedItem.category !== targetCategory) {
            console.log('Cross-category dragging not supported yet');
            return;
        }

        const categoryItems = getFilteredItems(getItemsForDisplay()[targetCategory] || []);
        const newOrder = categoryItems.map(item => item.ingredient || item.name);
        const draggedItemName = draggedItem.name;
        const currentIndex = newOrder.indexOf(draggedItemName);

        if (currentIndex !== -1) {
            newOrder.splice(currentIndex, 1);
        }

        newOrder.splice(targetIndex, 0, draggedItemName);

        const updatedOrder = {
            ...customOrder,
            [targetCategory]: newOrder
        };

        saveCustomOrder(updatedOrder);
        console.log(`🔄 Reordered ${draggedItemName} in ${targetCategory}:`, newOrder);
    };

    const resetCustomOrder = () => {
        if (confirm('Reset custom order to default? This cannot be undone.')) {
            localStorage.removeItem('shopping-list-custom-order');
            setCustomOrder({});
            console.log('🔄 Reset custom order to default');
        }
    };

    if (!isOpen || !shoppingList) {
        return null;
    }

    // Normalize shopping list structure
    const normalizeShoppingList = (list) => {
        if (!list) return {items: {}, summary: {totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0}};

        let normalizedItems = {};
        let summary = list.summary || list.stats || {};

        if (list.items) {
            if (Array.isArray(list.items)) {
                list.items.forEach(item => {
                    const category = item.category || 'Other';
                    if (!normalizedItems[category]) {
                        normalizedItems[category] = [];
                    }
                    normalizedItems[category].push(item);
                });
            } else if (typeof list.items === 'object') {
                normalizedItems = list.items;
            }
        }

        return {
            items: normalizedItems,
            summary: {
                totalItems: summary.totalItems || 0,
                needToBuy: summary.needToBuy || 0,
                inInventory: summary.inInventory || summary.alreadyHave || 0,
                purchased: summary.purchased || 0
            },
            generatedAt: list.generatedAt,
            recipes: list.recipes || []
        };
    };

    const normalizedList = normalizeShoppingList(shoppingList);

    // Handle checkbox changes
    const handleItemToggle = (itemKey) => {
        setPurchasedItems(prev => ({
            ...prev,
            [itemKey]: !prev[itemKey]
        }));
    };

    const markAllAsPurchased = () => {
        if (!normalizedList.items) return;

        const allItems = {};
        Object.values(normalizedList.items).flat().forEach(item => {
            const itemKey = `${item.ingredient || item.name}-${item.category || 'other'}`;
            allItems[itemKey] = true;
        });
        setPurchasedItems(allItems);
    };

    const clearAllPurchased = () => {
        setPurchasedItems({});
    };

    // Add purchased status to items
    const addPurchasedStatus = (items) => {
        return items.map(item => {
            const itemKey = `${item.ingredient || item.name}-${item.category || 'other'}`;
            return {
                ...item,
                purchased: purchasedItems[itemKey] || false,
                itemKey
            };
        });
    };

    // Filter items based on current filter
    const getFilteredItems = (items) => {
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
    };

    // Get items for display (store layout or custom order)
    const getItemsForDisplay = () => {
        if (storeLayoutMode && currentStoreLayout) {
            return currentStoreLayout.items;
        }
        return normalizedList.items;
    };

    // 🆕 UPDATED: Group items by category with store-specific category ordering
    const getGroupedItems = () => {
        const itemsToShow = getItemsForDisplay();
        if (!itemsToShow) return {};

        let grouped = {};
        Object.entries(itemsToShow).forEach(([category, items]) => {
            const filtered = getFilteredItems(items);
            if (filtered.length > 0) {
                const ordered = storeLayoutMode ? filtered : applyCustomOrdering(filtered, category);
                grouped[category] = ordered;
            }
        });

        // Apply store-specific category ordering if not in route mode
        if (!routeMode) {
            grouped = applyCategoryOrdering(grouped);
        }

        return grouped;
    };

    // Calculate statistics including purchased count
    const getStats = () => {
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
    };

    const handleAdvancedPrint = () => {
        console.log('🖨️ Opening print options modal...');
        setShowPrintModal(true);
    };

    const calculatePrintTotals = () => {
        if (!normalizedList.items || Object.keys(normalizedList.items).length === 0) {
            return null;
        }

        try {
            const calculations = totalsCalculator.calculateTotals(normalizedList, {
                budget: userPreferences?.budget,
                taxableCategories: ['Household Items', 'Personal Care', 'Cleaning Supplies'],
                discounts: [],
                coupons: []
            });

            return totalsCalculator.generateSummary(calculations);
        } catch (error) {
            console.error('Error calculating totals for print:', error);
            return null;
        }
    };

    // Determine list context for saving
    const getListContext = () => {
        if (sourceRecipeIds && sourceRecipeIds.length === 1) {
            return {
                listType: 'recipe',
                contextName: normalizedList.recipes?.[0] || title,
                sourceRecipeIds: sourceRecipeIds
            };
        } else if (sourceRecipeIds && sourceRecipeIds.length > 1) {
            return {
                listType: 'recipes',
                contextName: `${sourceRecipeIds.length} Recipes`,
                sourceRecipeIds: sourceRecipeIds
            };
        } else if (sourceMealPlanId) {
            return {
                listType: 'meal-plan',
                contextName: normalizedList.recipes?.[0] || title,
                sourceMealPlanId: sourceMealPlanId
            };
        } else {
            return {
                listType: 'custom',
                contextName: title,
                sourceRecipeIds: [],
                sourceMealPlanId: null
            };
        }
    };

    const listContext = getListContext();
    const stats = getStats();
    const groupedItems = getGroupedItems();

    const handleSaveSuccess = (savedList) => {
        console.log('Shopping list saved successfully:', savedList);
    };

    // 🆕 NEW: Get current store category info for display
    const getCurrentStoreInfo = () => {
        if (!selectedStore) return null;

        const storeData = Object.values(storeCategoryOrders).find(
            store => store.storeName === selectedStore
        );

        return {
            hasCustomOrder: !!storeData,
            categoryCount: storeData?.categories.length || 0,
            lastModified: storeData?.lastModified
        };
    };

    const storeInfo = getCurrentStoreInfo();

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
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    paddingBottom: 'max(env(safe-area-inset-bottom, 48px), 48px)'
                }}>
                    {/* Compact Header with Close Button */}
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
                                {title}
                                {/* Mode Indicators */}
                                {reorderMode && (
                                    <span style={{
                                        marginLeft: '0.5rem',
                                        fontSize: '0.8rem',
                                        color: '#3b82f6',
                                        fontWeight: '500'
                                    }}>
                                        📋 Reorder Mode
                                    </span>
                                )}
                                {storeLayoutMode && selectedStore && (
                                    <span style={{
                                        marginLeft: '0.5rem',
                                        fontSize: '0.8rem',
                                        color: '#059669',
                                        fontWeight: '500'
                                    }}>
                                        🏪 {currentStoreLayout?.layout?.name || selectedStore}
                                    </span>
                                )}
                                {routeMode && shoppingRoute && (
                                    <span style={{
                                        marginLeft: '0.5rem',
                                        fontSize: '0.8rem',
                                        color: '#dc2626',
                                        fontWeight: '500'
                                    }}>
                                        🗺️ Route Mode
                                    </span>
                                )}
                                {/* 🆕 NEW: Store Category Order Indicator */}
                                {selectedStore && storeInfo?.hasCustomOrder && !storeLayoutMode && (
                                    <span style={{
                                        marginLeft: '0.5rem',
                                        fontSize: '0.8rem',
                                        color: '#7c3aed',
                                        fontWeight: '500'
                                    }}>
                                        📂 Custom Order
                                    </span>
                                )}
                            </h2>
                            {subtitle && (
                                <p style={{
                                    margin: '0.125rem 0 0 0',
                                    fontSize: '0.75rem',
                                    color: '#6b7280',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {subtitle}
                                </p>
                            )}
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
                            className="hover:bg-gray-200 transition-colors"
                            title="Close"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>

                    {/* Compact Statistics */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: '#f8fafc',
                        flexShrink: 0
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '0.5rem'
                        }}>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                textAlign: 'center',
                                border: '1px solid #e5e7eb'
                            }}>
                                <div style={{fontSize: '1rem', fontWeight: 'bold', color: '#1e293b'}}>
                                    {stats.totalItems}
                                </div>
                                <div style={{fontSize: '0.625rem', color: '#64748b'}}>
                                    Total
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                textAlign: 'center',
                                border: '1px solid #bfdbfe'
                            }}>
                                <div style={{fontSize: '1rem', fontWeight: 'bold', color: '#0369a1'}}>
                                    {stats.inInventory}
                                </div>
                                <div style={{fontSize: '0.625rem', color: '#0284c7'}}>
                                    Have
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                textAlign: 'center',
                                border: '1px solid #fed7aa'
                            }}>
                                <div style={{fontSize: '1rem', fontWeight: 'bold', color: '#d97706'}}>
                                    {stats.needToBuy}
                                </div>
                                <div style={{fontSize: '0.625rem', color: '#f59e0b'}}>
                                    Need
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                textAlign: 'center',
                                border: '1px solid #e9d5ff'
                            }}>
                                <div style={{fontSize: '1rem', fontWeight: 'bold', color: '#7c3aed'}}>
                                    {stats.purchased}
                                </div>
                                <div style={{fontSize: '0.625rem', color: '#8b5cf6'}}>
                                    Bought
                                </div>
                            </div>
                        </div>

                        {/* Shopping Route Stats */}
                        {routeMode && shoppingRoute && (
                            <div style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem',
                                backgroundColor: '#ecfccb',
                                borderRadius: '6px',
                                border: '1px solid #bef264'
                            }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '0.5rem',
                                    textAlign: 'center'
                                }}>
                                    <div>
                                        <div style={{fontSize: '0.875rem', fontWeight: 'bold', color: '#365314'}}>
                                            {shoppingRoute.totalTime} min
                                        </div>
                                        <div style={{fontSize: '0.625rem', color: '#4d7c0f'}}>
                                            Est. Time
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{fontSize: '0.875rem', fontWeight: 'bold', color: '#365314'}}>
                                            {shoppingRoute.totalSections}
                                        </div>
                                        <div style={{fontSize: '0.625rem', color: '#4d7c0f'}}>
                                            Sections
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{fontSize: '0.875rem', fontWeight: 'bold', color: '#365314'}}>
                                            {shoppingRoute.storeName}
                                        </div>
                                        <div style={{fontSize: '0.625rem', color: '#4d7c0f'}}>
                                            Layout
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🆕 NEW: Store Category Order Status */}
                        {selectedStore && storeInfo?.hasCustomOrder && !routeMode && !storeLayoutMode && (
                            <div style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem',
                                backgroundColor: '#f3e8ff',
                                borderRadius: '6px',
                                border: '1px solid #c4b5fd',
                                textAlign: 'center'
                            }}>
                                <div style={{fontSize: '0.75rem', color: '#5b21b6', fontWeight: '500'}}>
                                    📂 Using custom category order for {selectedStore} ({storeInfo.categoryCount} categories)
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Enhanced Controls with Store Layout */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        backgroundColor: '#f8fafc',
                        flexShrink: 0
                    }}>
                        {/* Filter Dropdown */}
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            disabled={reorderMode || routeMode}
                            style={{
                                padding: '0.375rem 0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                backgroundColor: (reorderMode || routeMode) ? '#f3f4f6' : 'white',
                                flex: '1',
                                minWidth: '80px',
                                opacity: (reorderMode || routeMode) ? 0.6 : 1
                            }}
                        >
                            <option value="all">All ({stats.totalItems})</option>
                            <option value="needToBuy">Need ({stats.needToBuy})</option>
                            <option value="inInventory">Have ({stats.inInventory})</option>
                            <option value="purchased">Bought ({stats.purchased})</option>
                        </select>

                        {/* Store Layout Toggle */}
                        <TouchEnhancedButton
                            onClick={() => selectedStore ? toggleStoreLayoutMode() : setShowStoreSelector(true)}
                            disabled={reorderMode || routeMode}
                            style={{
                                backgroundColor: storeLayoutMode ? '#059669' : '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.375rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: (reorderMode || routeMode) ? 'not-allowed' : 'pointer',
                                fontWeight: '500',
                                opacity: (reorderMode || routeMode) ? 0.6 : 1
                            }}
                            title={selectedStore ? `Toggle ${selectedStore} layout` : 'Select store for layout'}
                        >
                            {storeLayoutMode ? '🏪 Layout On' : '🏪 Store'}
                        </TouchEnhancedButton>

                        {/* Route Mode Toggle */}
                        {storeLayoutMode && shoppingRoute && (
                            <TouchEnhancedButton
                                onClick={() => setRouteMode(!routeMode)}
                                disabled={reorderMode}
                                style={{
                                    backgroundColor: routeMode ? '#dc2626' : '#7c3aed',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.375rem 0.5rem',
                                    fontSize: '0.75rem',
                                    cursor: reorderMode ? 'not-allowed' : 'pointer',
                                    fontWeight: '500',
                                    opacity: reorderMode ? 0.6 : 1
                                }}
                                title={routeMode ? 'Exit route mode' : 'Show shopping route'}
                            >
                                {routeMode ? '✓ Route' : '🗺️ Route'}
                            </TouchEnhancedButton>
                        )}

                        {/* Reorder Mode Toggle */}
                        <TouchEnhancedButton
                            onClick={() => setReorderMode(!reorderMode)}
                            disabled={storeLayoutMode || routeMode}
                            style={{
                                backgroundColor: reorderMode ? '#ef4444' : '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.375rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: (storeLayoutMode || routeMode) ? 'not-allowed' : 'pointer',
                                fontWeight: '500',
                                opacity: (storeLayoutMode || routeMode) ? 0.6 : 1
                            }}
                            title={reorderMode ? 'Exit reorder mode' : 'Enter reorder mode'}
                        >
                            {reorderMode ? '✓ Done' : '📋 Items'}
                        </TouchEnhancedButton>

                        {/* Quick Actions - Disabled in special modes */}
                        {!reorderMode && !routeMode && (
                            <>
                                <TouchEnhancedButton
                                    onClick={markAllAsPurchased}
                                    style={{
                                        backgroundColor: '#8b5cf6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.375rem 0.5rem',
                                        fontSize: '0.75rem',
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
                                        padding: '0.375rem 0.5rem',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    ✗ Clear
                                </TouchEnhancedButton>
                            </>
                        )}

                        {/* More Actions Toggle */}
                        <TouchEnhancedButton
                            onClick={() => setShowActions(!showActions)}
                            disabled={reorderMode || routeMode}
                            style={{
                                backgroundColor: '#374151',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.375rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: (reorderMode || routeMode) ? 'not-allowed' : 'pointer',
                                fontWeight: '500',
                                opacity: (reorderMode || routeMode) ? 0.6 : 1
                            }}
                        >
                            {showActions ? '⌄ Less' : '⋯ More'}
                        </TouchEnhancedButton>
                    </div>

                    {/* Store Selection Modal */}
                    {showStoreSelector && (
                        <div style={{
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            right: '0',
                            bottom: '0',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
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

                                {/* Your Stores */}
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
                                            {stores.map(store => {
                                                const storeHasCustomOrder = Object.values(storeCategoryOrders).some(
                                                    s => s.storeName === store.name
                                                );

                                                return (
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
                                                                {storeHasCustomOrder && (
                                                                    <span style={{
                                                                        marginLeft: '0.5rem',
                                                                        fontSize: '0.75rem',
                                                                        color: '#7c3aed'
                                                                    }}>
                                                                        📂
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {store.chain && (
                                                                <div style={{
                                                                    fontSize: '0.75rem',
                                                                    color: '#6b7280'
                                                                }}>
                                                                    {store.chain}
                                                                </div>
                                                            )}
                                                            {storeHasCustomOrder && (
                                                                <div style={{
                                                                    fontSize: '0.75rem',
                                                                    color: '#7c3aed',
                                                                    fontStyle: 'italic'
                                                                }}>
                                                                    Custom category order set
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{fontSize: '1.25rem'}}>
                                                            🏪
                                                        </div>
                                                    </TouchEnhancedButton>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Popular Store Chains */}
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
                                    {selectedStore && (
                                        <TouchEnhancedButton
                                            onClick={() => {
                                                handleStoreSelection(selectedStore);
                                                toggleStoreLayoutMode();
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Apply Layout
                                        </TouchEnhancedButton>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mode-specific Instructions */}
                    {reorderMode && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: '#dbeafe',
                            borderBottom: '1px solid #3b82f6',
                            flexShrink: 0
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#1e40af'
                            }}>
                                <span>📋</span>
                                <span style={{fontWeight: '500'}}>Drag items to reorder within categories</span>
                                <TouchEnhancedButton
                                    onClick={resetCustomOrder}
                                    style={{
                                        marginLeft: 'auto',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer'
                                    }}
                                    title="Reset to default order"
                                >
                                    🔄 Reset
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    )}

                    {storeLayoutMode && currentStoreLayout && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: '#ecfccb',
                            borderBottom: '1px solid #059669',
                            flexShrink: 0
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#14532d'
                            }}>
                                <span>🏪</span>
                                <span style={{fontWeight: '500'}}>
                                    Shopping list optimized for {currentStoreLayout.layout.name}
                                </span>
                                {currentStoreLayout.tips && currentStoreLayout.tips.length > 0 && (
                                    <TouchEnhancedButton
                                        onClick={() => alert(currentStoreLayout.tips.join('\n• '))}
                                        style={{
                                            marginLeft: 'auto',
                                            backgroundColor: '#059669',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '0.25rem 0.5rem',
                                            fontSize: '0.7rem',
                                            cursor: 'pointer'
                                        }}
                                        title="View store tips"
                                    >
                                        💡 Tips
                                    </TouchEnhancedButton>
                                )}
                            </div>
                        </div>
                    )}

                    {routeMode && shoppingRoute && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: '#fef2f2',
                            borderBottom: '1px solid #dc2626',
                            flexShrink: 0
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#7f1d1d'
                            }}>
                                <span>🗺️</span>
                                <span style={{fontWeight: '500'}}>
                                    Shopping route: {shoppingRoute.totalSections} sections, ~{shoppingRoute.totalTime} minutes
                                </span>
                                <TouchEnhancedButton
                                    onClick={() => {
                                        const routeText = StoreLayoutUtils.exportShoppingRoute(shoppingRoute, selectedStore);
                                        if (navigator.share) {
                                            navigator.share({
                                                title: `Shopping Route - ${selectedStore}`,
                                                text: routeText
                                            });
                                        } else {
                                            alert(routeText);
                                        }
                                    }}
                                    style={{
                                        marginLeft: 'auto',
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer'
                                    }}
                                    title="Share shopping route"
                                >
                                    📤 Share
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    )}

                    {/* 🆕 NEW: Store Category Order Info Banner */}
                    {selectedStore && storeInfo?.hasCustomOrder && !storeLayoutMode && !routeMode && !reorderMode && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: '#f3e8ff',
                            borderBottom: '1px solid #7c3aed',
                            flexShrink: 0
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#5b21b6'
                            }}>
                                <span>📂</span>
                                <span style={{fontWeight: '500'}}>
                                    Categories organized using your custom order for {selectedStore}
                                </span>
                                <TouchEnhancedButton
                                    onClick={() => {
                                        // Open stores page to manage category order
                                        if (confirm('Would you like to edit the category order for this store?')) {
                                            window.open('/stores', '_blank');
                                        }
                                    }}
                                    style={{
                                        marginLeft: 'auto',
                                        backgroundColor: '#7c3aed',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer'
                                    }}
                                    title="Edit category order"
                                >
                                    ✏️ Edit
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    )}

                    {/* Expandable Actions Panel */}
                    {showActions && !reorderMode && !routeMode && (
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
                                    onClick={handleAdvancedPrint}
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
                                    onClick={() => {
                                        const textContent = `Shopping List - ${title}\n\n` +
                                            Object.entries(groupedItems)
                                                .map(([category, items]) => {
                                                    const categoryItems = items.map(item => {
                                                        const checkbox = item.purchased ? '☑' : '☐';
                                                        const status = item.purchased ? ' [PURCHASED]' :
                                                            item.inInventory ? ' [IN INVENTORY]' : '';
                                                        const recipes = item.recipes && item.recipes.length > 0 ?
                                                            ` (${item.recipes.join(', ')})` : '';
                                                        return `  ${checkbox} ${item.amount ? `${item.amount} ` : ''}${item.ingredient || item.name}${status}${recipes}`;
                                                    });
                                                    return `${category}:\n${categoryItems.join('\n')}`;
                                                })
                                                .join('\n\n');

                                        const blob = new Blob([textContent], {type: 'text/plain'});
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `shopping-list-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
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
                                    📝<br/>Text
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    )}

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
                                onBudgetChange={handleBudgetChange}
                                onTaxRateChange={handleTaxRateChange}
                                showBudgetTracker={true}
                                showCategoryBreakdown={true}
                                compact={false}
                            />
                        </div>
                    )}

                    {/* Main Shopping List Content - Scrollable */}
                    <div
                        id="unified-shopping-list-content"
                        style={{
                            flex: 1,
                            padding: '1rem',
                            overflow: 'auto',
                            backgroundColor: 'white',
                            minHeight: 0
                        }}
                    >
                        {Object.keys(groupedItems).length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '2rem 1rem',
                                color: '#6b7280'
                            }}>
                                <div style={{fontSize: '2rem', marginBottom: '1rem'}}>🛒</div>
                                <p>No items match the current filter</p>
                            </div>
                        ) : routeMode && shoppingRoute ? (
                            // Route Mode Display (same as before)
                            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                                <div style={{
                                    textAlign: 'center',
                                    padding: '1rem',
                                    backgroundColor: '#fef3c7',
                                    borderRadius: '8px',
                                    border: '1px solid #f59e0b'
                                }}>
                                    <h3 style={{
                                        margin: '0 0 0.5rem 0',
                                        fontSize: '1.125rem',
                                        fontWeight: '600',
                                        color: '#92400e'
                                    }}>
                                        🗺️ Optimal Shopping Route
                                    </h3>
                                    <p style={{
                                        margin: 0,
                                        fontSize: '0.875rem',
                                        color: '#b45309'
                                    }}>
                                        Follow this route for the most efficient shopping experience
                                    </p>
                                </div>

                                {shoppingRoute.route.map((section, sectionIndex) => (
                                    <div key={sectionIndex} style={{
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '8px',
                                        border: '2px solid #e2e8f0',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            backgroundColor: '#1e293b',
                                            color: 'white',
                                            padding: '1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem'
                                            }}>
                                                <div style={{
                                                    backgroundColor: '#3b82f6',
                                                    color: 'white',
                                                    borderRadius: '50%',
                                                    width: '2rem',
                                                    height: '2rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {sectionIndex + 1}
                                                </div>
                                                <div>
                                                    <h4 style={{
                                                        margin: 0,
                                                        fontSize: '1rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        {section.emoji} {section.section}
                                                    </h4>
                                                </div>
                                            </div>
                                            <div style={{
                                                textAlign: 'right',
                                                fontSize: '0.875rem'
                                            }}>
                                                <div>{section.itemCount} items</div>
                                                <div>~{section.estimatedTime} min</div>
                                            </div>
                                        </div>
                                        <div style={{padding: '1rem'}}>
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                                                {section.items.map((item, itemIndex) => {
                                                    const itemKey = item.itemKey || `${item.ingredient || item.name}-${item.category}`;
                                                    const isPurchased = item.purchased;

                                                    return (
                                                        <div
                                                            key={itemIndex}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.75rem',
                                                                padding: '0.75rem',
                                                                backgroundColor: isPurchased ? '#f0fdf4' : 'white',
                                                                borderRadius: '6px',
                                                                border: '1px solid #e5e7eb',
                                                                opacity: isPurchased ? 0.7 : 1,
                                                                textDecoration: isPurchased ? 'line-through' : 'none'
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isPurchased}
                                                                onChange={() => handleItemToggle(itemKey)}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    transform: 'scale(1.3)',
                                                                    accentColor: '#8b5cf6'
                                                                }}
                                                            />
                                                            <div style={{flex: 1}}>
                                                                <div style={{
                                                                    fontWeight: '500',
                                                                    color: '#374151',
                                                                    fontSize: '0.95rem'
                                                                }}>
                                                                    {item.amount && `${item.amount} `}{item.ingredient || item.name}
                                                                </div>
                                                                {item.recipes && item.recipes.length > 0 && (
                                                                    <div style={{
                                                                        fontSize: '0.75rem',
                                                                        color: '#6b7280',
                                                                        marginTop: '0.25rem'
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
                                    </div>
                                ))}

                                {/* Store Tips */}
                                {shoppingRoute.tips && shoppingRoute.tips.length > 0 && (
                                    <div style={{
                                        backgroundColor: '#eff6ff',
                                        borderRadius: '8px',
                                        border: '1px solid #bfdbfe',
                                        padding: '1rem'
                                    }}>
                                        <h4 style={{
                                            margin: '0 0 0.75rem 0',
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            color: '#1e40af'
                                        }}>
                                            💡 Store Tips
                                        </h4>
                                        <ul style={{
                                            margin: 0,
                                            paddingLeft: '1.25rem',
                                            color: '#1e40af'
                                        }}>
                                            {shoppingRoute.tips.map((tip, index) => (
                                                <li key={index} style={{
                                                    fontSize: '0.875rem',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    {tip}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // 🆕 UPDATED: Category-based Display with Store-Specific Category Ordering
                            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                                {Object.entries(groupedItems).map(([category, items]) => (
                                    <div key={category}>
                                        {/* Category Header - Simplified (no drag & drop) */}
                                        <h3 style={{
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            color: '#374151',
                                            margin: '0 0 0.75rem 0',
                                            padding: '0.5rem 0',
                                            borderBottom: '2px solid #e5e7eb',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: storeLayoutMode ? '#f0fdf4' : 'transparent',
                                            paddingLeft: storeLayoutMode ? '1rem' : '0',
                                            borderLeft: storeLayoutMode ? '4px solid #059669' : 'none'
                                        }}>
                                            <span>{category}</span>
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

                                        {/* Items within category */}
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                                            {items.map((item, index) => {
                                                const itemKey = item.itemKey || `${item.ingredient || item.name}-${category}`;
                                                const isPurchased = item.purchased;

                                                return (
                                                    <div
                                                        key={index}
                                                        draggable={reorderMode}
                                                        onDragStart={(e) => handleDragStart(e, item, category, index)}
                                                        onDragEnd={handleDragEnd}
                                                        onDragOver={handleDragOver}
                                                        onDragEnter={(e) => handleDragEnter(e, category, index)}
                                                        onDrop={(e) => handleDrop(e, category, index)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: '0.75rem',
                                                            padding: '0.75rem',
                                                            backgroundColor: isPurchased ? '#f0fdf4' :
                                                                dragOverCategory === category && dragOverIndex === index ? '#e0f2fe' :
                                                                    '#fafafa',
                                                            borderRadius: '8px',
                                                            border: reorderMode ? '2px dashed #d1d5db' : '1px solid #e5e7eb',
                                                            opacity: isPurchased ? 0.7 : 1,
                                                            textDecoration: isPurchased ? 'line-through' : 'none',
                                                            cursor: reorderMode ? 'grab' : 'default',
                                                            transition: 'all 0.2s ease',
                                                            transform: draggedItem?.name === (item.ingredient || item.name) &&
                                                            draggedItem?.category === category ? 'scale(1.02)' : 'scale(1)',
                                                            boxShadow: reorderMode ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                                                        }}
                                                    >
                                                        {/* Drag Handle (only in reorder mode) */}
                                                        {reorderMode && (
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                color: '#6b7280',
                                                                fontSize: '1.2rem',
                                                                cursor: 'grab',
                                                                userSelect: 'none',
                                                                padding: '0.25rem'
                                                            }}>
                                                                ⋮⋮
                                                            </div>
                                                        )}

                                                        {/* Checkbox (hidden in reorder mode) */}
                                                        {!reorderMode && (
                                                            <input
                                                                type="checkbox"
                                                                checked={isPurchased}
                                                                onChange={() => handleItemToggle(itemKey)}
                                                                style={{
                                                                    marginTop: '0.125rem',
                                                                    cursor: 'pointer',
                                                                    transform: 'scale(1.3)',
                                                                    accentColor: '#8b5cf6'
                                                                }}
                                                            />
                                                        )}

                                                        {/* Item Details */}
                                                        <div style={{flex: 1, minWidth: 0}}>
                                                            <div style={{
                                                                fontWeight: '500',
                                                                color: '#374151',
                                                                fontSize: '0.95rem',
                                                                lineHeight: '1.4',
                                                                marginBottom: '0.25rem'
                                                            }}>
                                                                {item.amount && `${item.amount} `}{item.ingredient || item.name}
                                                            </div>

                                                            {/* Inventory Status */}
                                                            {item.inInventory && (
                                                                <div style={{
                                                                    fontSize: '0.8rem',
                                                                    color: '#16a34a',
                                                                    backgroundColor: '#f0fdf4',
                                                                    padding: '0.25rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    marginBottom: '0.25rem',
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
                                                                    border: '1px solid #e2e8f0'
                                                                }}>
                                                                    Used in: {item.recipes.join(', ')}
                                                                </div>
                                                            )}

                                                            {/* Custom Order Status */}
                                                            {reorderMode && customOrder[category] && (
                                                                <div style={{
                                                                    fontSize: '0.7rem',
                                                                    color: '#3b82f6',
                                                                    backgroundColor: '#dbeafe',
                                                                    padding: '0.25rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #93c5fd',
                                                                    marginTop: '0.25rem'
                                                                }}>
                                                                    📋 Custom order: {customOrder[category].indexOf(item.ingredient || item.name) + 1}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Drag Position Indicator */}
                                                        {reorderMode && dragOverCategory === category && dragOverIndex === index && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: '-2px',
                                                                left: '0',
                                                                right: '0',
                                                                height: '4px',
                                                                backgroundColor: '#3b82f6',
                                                                borderRadius: '2px',
                                                                zIndex: 10
                                                            }} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer with Close Button */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        paddingBottom: `calc(0.75rem + max(env(safe-area-inset-bottom, 8px), 8px))`,
                        borderTop: '1px solid #e5e7eb',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexShrink: 0
                    }}>
                        <div style={{
                            fontSize: '0.7rem',
                            color: '#6b7280'
                        }}>
                            {normalizedList.generatedAt && (
                                `Generated ${new Date(normalizedList.generatedAt).toLocaleString()}`
                            )}
                            {/* Status Indicators */}
                            {Object.keys(customOrder).length > 0 && (
                                <div style={{marginTop: '0.25rem'}}>
                                    📋 Custom order saved for {Object.keys(customOrder).length} categories
                                </div>
                            )}
                            {/* Store Category Order Status */}
                            {selectedStore && storeInfo?.hasCustomOrder && (
                                <div style={{marginTop: '0.25rem'}}>
                                    📂 Custom category order: {storeInfo.categoryCount} categories for {selectedStore}
                                </div>
                            )}
                            {selectedStore && (
                                <div style={{marginTop: '0.25rem'}}>
                                    🏪 Store: {selectedStore}
                                    {storeLayoutMode && currentStoreLayout && (
                                        <span style={{color: '#059669'}}> (Layout Applied)</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <TouchEnhancedButton
                            onClick={onClose}
                            style={{
                                backgroundColor: '#374151',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.5rem 1rem',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>

            {/* Email Share Modal */}
            <EmailSharingModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                shoppingList={normalizedList}
                context={listContext.listType}
                contextName={listContext.contextName}
            />

            {/* Save Shopping List Modal */}
            <SaveShoppingListModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={handleSaveSuccess}
                shoppingList={normalizedList}
                listType={listContext.listType}
                contextName={listContext.contextName}
                sourceRecipeIds={listContext.sourceRecipeIds}
                sourceMealPlanId={listContext.sourceMealPlanId}
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
                title={title}
                subtitle={subtitle}
                storeName={selectedStore}
                shoppingRoute={shoppingRoute}
                totals={calculatePrintTotals()}
            />
        </>
    );
}
