'use client';
// file: /src/components/shopping/EnhancedAIShoppingListModal.js v3 - Added expandable actions panel, print functionality, totals, and user preferences

import {useState, useEffect} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import EmailSharingModal from '@/components/sharing/EmailSharingModal';
import SaveShoppingListModal from '@/components/shared/SaveShoppingListModal';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {getAIOptimizedRoute, provideLearningFeedback, createAIShoppingSystem} from '@/lib/aiShoppingOptimizer';
import {CategoryUtils, GROCERY_CATEGORIES, suggestCategoryForItem} from '@/lib/groceryCategories';
import ShoppingListTotals from '@/components/shopping/ShoppingListTotals';
import PrintOptionsModal from '@/components/shopping/PrintOptionsModal';
import { ShoppingListTotalsCalculator } from '@/lib/shoppingListTotals';
import { VoiceInput } from '@/components/mobile/VoiceInput';

export default function EnhancedAIShoppingListModal({
                                                        isOpen,
                                                        onClose,
                                                        shoppingList,
                                                        title = '🛒 Smart Shopping Assistant',
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

    // AI Enhancement State
    const [aiMode, setAiMode] = useState('basic');
    const [aiOptimization, setAiOptimization] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiInsights, setAiInsights] = useState(null);
    const [smartSuggestions, setSmartSuggestions] = useState(null);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [learningProgress, setLearningProgress] = useState(null);

    // Category Management State
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [movingItem, setMovingItem] = useState(null);
    const [availableCategories, setAvailableCategories] = useState([]);
    const [customCategories, setCustomCategories] = useState({});
    const [editingCategories, setEditingCategories] = useState(false);

    // Store Layout State
    const [selectedStore, setSelectedStore] = useState('');
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

    // NEW: Added missing state from Unified version
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
    // NEW: Voice Input State
    const [showVoiceInput, setShowVoiceInput] = useState(false);
    const [voiceResults, setVoiceResults] = useState('');
    const [processingVoice, setProcessingVoice] = useState(false);

    // FIXED: Use state for shopping list items to trigger re-renders
    const [currentShoppingList, setCurrentShoppingList] = useState(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
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
        } else {
            loadPreferences();
            fetchStores();
            initializeAISystem();
            loadCustomCategories();
            loadUserPreferences(); // NEW: Load user preferences
            // FIXED: Set shopping list to state
            setCurrentShoppingList(shoppingList);
        }
    }, [isOpen, shoppingList]);

    const loadPreferences = () => {
        try {
            const savedStore = localStorage.getItem('preferred-shopping-store');
            const savedAiMode = localStorage.getItem('ai-shopping-mode');

            if (savedStore) setSelectedStore(savedStore);
            if (savedAiMode) setAiMode(savedAiMode);
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    };

    // NEW: Load user preferences for totals and currency
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

    // NEW: Save user preferences
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

    // NEW: Handle budget changes
    const handleBudgetChange = (budget) => {
        saveUserPreferences({ budget });
    };

    // NEW: Handle tax rate changes
    const handleTaxRateChange = (taxRate) => {
        saveUserPreferences({ taxRate });
    };

    // NEW: Voice Input Functions
    const handleVoiceResult = async (transcript, confidence) => {
        console.log('🎤 Voice input received:', transcript, 'Confidence:', confidence);
        setVoiceResults(transcript);
        setProcessingVoice(true);

        try {
            // Parse voice input and add items to shopping list
            const newItems = parseVoiceInputToItems(transcript);

            if (newItems.length > 0) {
                await addVoiceItemsToList(newItems);
                setShowVoiceInput(false);
                setVoiceResults('');

                // Show success feedback
                alert(`✅ Added ${newItems.length} item${newItems.length > 1 ? 's' : ''} from voice input!`);
            } else {
                alert('❌ Could not understand any items from voice input. Try saying items like "milk, eggs, bread"');
            }
        } catch (error) {
            console.error('Error processing voice input:', error);
            alert('❌ Error processing voice input. Please try again.');
        } finally {
            setProcessingVoice(false);
        }
    };

    const handleVoiceError = (error) => {
        console.error('🎤 Voice input error:', error);
        setProcessingVoice(false);

        // Show user-friendly error message
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

    const parseVoiceInputToItems = (transcript) => {
        if (!transcript || transcript.trim().length === 0) return [];

        // Clean up the transcript
        const cleanTranscript = transcript.toLowerCase()
            .replace(/[.!?]/g, '') // Remove punctuation
            .replace(/\b(add|to|shopping|list|please|i|need|want|buy|get|pick|up)\b/g, '') // Remove common command words
            .trim();

        // Split by common separators
        const itemTexts = cleanTranscript
            .split(/[,;]|\band\b|\bthen\b|\balso\b|\bplus\b/)
            .map(item => item.trim())
            .filter(item => item.length > 0);

        const parsedItems = [];

        itemTexts.forEach(itemText => {
            if (itemText.length < 2) return; // Skip very short items

            // Extract quantity and item name
            const quantityMatch = itemText.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
            let amount = '';
            let itemName = itemText;

            if (quantityMatch) {
                amount = quantityMatch[1];
                itemName = quantityMatch[2];
            }

            // Clean up item name
            itemName = itemName
                .replace(/\b(of|the|a|an)\b/g, '') // Remove articles
                .trim();

            if (itemName.length > 1) {
                // Use AI category suggestion
                const suggestedCategory = getAISuggestedCategory(itemName);

                parsedItems.push({
                    ingredient: itemName,
                    name: itemName,
                    amount: amount,
                    category: suggestedCategory,
                    addedViaVoice: true,
                    addedAt: new Date().toISOString()
                });
            }
        });

        console.log('🎤 Parsed voice items:', parsedItems);
        return parsedItems;
    };

    const addVoiceItemsToList = async (newItems) => {
        if (!currentShoppingList || newItems.length === 0) return;

        const updatedShoppingList = { ...currentShoppingList };
        const updatedItems = { ...updatedShoppingList.items };

        // Add each new item to the appropriate category
        newItems.forEach(item => {
            const category = item.category || 'Other';

            if (!updatedItems[category]) {
                updatedItems[category] = [];
            }

            // Check for duplicates
            const existingItem = updatedItems[category].find(
                existingItem => (existingItem.ingredient || existingItem.name)?.toLowerCase() ===
                    (item.ingredient || item.name)?.toLowerCase()
            );

            if (!existingItem) {
                updatedItems[category].push(item);
                console.log(`✅ Added "${item.ingredient}" to ${category}`);
            } else {
                console.log(`⚠️ Item "${item.ingredient}" already exists in ${category}`);
            }
        });

        // Update the shopping list state
        updatedShoppingList.items = updatedItems;

        // Update summary counts
        const totalItems = Object.values(updatedItems).flat().length;
        updatedShoppingList.summary = {
            ...updatedShoppingList.summary,
            totalItems: totalItems,
            needToBuy: (updatedShoppingList.summary?.needToBuy || 0) + newItems.length
        };

        setCurrentShoppingList(updatedShoppingList);

        console.log('🎤 Updated shopping list with voice items:', updatedShoppingList);
    };

    const loadCustomCategories = async () => {
        try {
            // Load from API first
            const response = await fetch('/api/categories/custom');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setCustomCategories(data.customCategories || {});
                }
            }

            // Fallback to localStorage for backwards compatibility
            const saved = localStorage.getItem(`custom-categories-${session?.user?.id}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                setCustomCategories(prev => ({ ...parsed, ...prev })); // API takes precedence
            }

            // Get store-specific categories if available
            const storeCategories = localStorage.getItem(`store-categories-${selectedStore}-${session?.user?.id}`);
            if (storeCategories) {
                const storeParsed = JSON.parse(storeCategories);
                setAvailableCategories(storeParsed);
            } else {
                setAvailableCategories(CategoryUtils.getDefaultCategoryOrder());
            }
        } catch (error) {
            console.error('Error loading custom categories:', error);
            setAvailableCategories(CategoryUtils.getDefaultCategoryOrder());
        }
    };

    const saveCustomCategories = async (categories) => {
        try {
            // Save to API
            const response = await fetch('/api/categories/custom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ customCategories: categories })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setCustomCategories(data.customCategories);
                    console.log('✅ Custom categories saved to database');
                }
            } else {
                throw new Error('Failed to save to database');
            }

            // Also save to localStorage for offline access
            localStorage.setItem(`custom-categories-${session?.user?.id}`, JSON.stringify(categories));
        } catch (error) {
            console.error('Error saving custom categories:', error);
            // Fallback to localStorage only
            localStorage.setItem(`custom-categories-${session?.user?.id}`, JSON.stringify(categories));
            setCustomCategories(categories);
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

    const initializeAISystem = async () => {
        if (!session?.user?.id) return;

        try {
            const aiSystem = createAIShoppingSystem(session.user.id);
            const learningStatus = aiSystem.getLearningStatus();
            setLearningProgress(learningStatus);

            console.log('Smart Shopping Assistant System initialized:', learningStatus);
        } catch (error) {
            console.error('Error initializing AI system:', error);
        }
    };

    // AI Optimization Functions
    const handleAIOptimization = async () => {
        if (!selectedStore || !session?.user?.id) {
            alert('Please select a store first');
            return;
        }

        setAiLoading(true);
        setAiMode('ai-optimized');

        try {
            console.log('🚀 Starting AI optimization...');

            const optimization = await getAIOptimizedRoute(
                normalizedList.items,
                selectedStore,
                session.user.id,
                {
                    prioritizeSpeed: true,
                    avoidCrowds: true,
                    foodSafetyFirst: true
                }
            );

            setAiOptimization(optimization);
            setAiInsights(optimization.aiInsights);
            setSmartSuggestions(optimization.smartSuggestions);
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
    };

    // FIXED: Category Management Functions
    const handleMoveItemToCategory = (item, fromCategory, toCategory) => {
        if (fromCategory === toCategory) return;

        console.log(`🔄 Moving ${item.ingredient || item.name} from ${fromCategory} to ${toCategory}`);

        // FIXED: Create a deep copy of the current shopping list
        const updatedShoppingList = { ...currentShoppingList };
        const updatedItems = { ...updatedShoppingList.items };

        // Remove from old category
        if (updatedItems[fromCategory]) {
            updatedItems[fromCategory] = updatedItems[fromCategory].filter(
                listItem => (listItem.ingredient || listItem.name) !== (item.ingredient || item.name)
            );

            // Remove category if empty
            if (updatedItems[fromCategory].length === 0) {
                delete updatedItems[fromCategory];
            }
        }

        // Add to new category
        if (!updatedItems[toCategory]) {
            updatedItems[toCategory] = [];
        }

        const updatedItem = { ...item, category: toCategory };
        updatedItems[toCategory].push(updatedItem);

        // Update the shopping list state
        updatedShoppingList.items = updatedItems;
        setCurrentShoppingList(updatedShoppingList);

        // Save user preference for this item type
        saveItemCategoryPreference(item.ingredient || item.name, toCategory);

        setMovingItem(null);

        console.log('✅ Item moved successfully');
    };

    const saveItemCategoryPreference = (itemName, category) => {
        try {
            const preferences = JSON.parse(localStorage.getItem(`item-category-preferences-${session?.user?.id}`) || '{}');

            // Create a pattern for similar items
            const normalizedName = itemName.toLowerCase().replace(/\b(fresh|frozen|canned|dried|ground|chopped|sliced|diced)\b/g, '').trim();
            preferences[normalizedName] = category;

            localStorage.setItem(`item-category-preferences-${session?.user?.id}`, JSON.stringify(preferences));
            console.log(`💾 Saved preference: ${normalizedName} → ${category}`);
        } catch (error) {
            console.error('Error saving item category preference:', error);
        }
    };

    const getAISuggestedCategory = (itemName) => {
        try {
            // First check user preferences
            const preferences = JSON.parse(localStorage.getItem(`item-category-preferences-${session?.user?.id}`) || '{}');
            const normalizedName = itemName.toLowerCase().replace(/\b(fresh|frozen|canned|dried|ground|chopped|sliced|diced)\b/g, '').trim();

            if (preferences[normalizedName]) {
                return preferences[normalizedName];
            }

            // Fall back to AI suggestion
            return suggestCategoryForItem(itemName);
        } catch (error) {
            return suggestCategoryForItem(itemName);
        }
    };

    const handleSmartRecategorize = () => {
        if (!normalizedList.items) return;

        let moveCount = 0;
        const updatedShoppingList = { ...currentShoppingList };
        const updatedItems = {};

        Object.entries(normalizedList.items).forEach(([category, items]) => {
            items.forEach(item => {
                const suggestedCategory = getAISuggestedCategory(item.ingredient || item.name);

                if (suggestedCategory !== category && CategoryUtils.isValidCategory(suggestedCategory)) {
                    // Move item to suggested category
                    if (!updatedItems[suggestedCategory]) {
                        updatedItems[suggestedCategory] = [];
                    }
                    updatedItems[suggestedCategory].push({ ...item, category: suggestedCategory });
                    moveCount++;
                } else {
                    // Keep in current category
                    if (!updatedItems[category]) {
                        updatedItems[category] = [];
                    }
                    updatedItems[category].push(item);
                }
            });
        });

        if (moveCount > 0) {
            updatedShoppingList.items = updatedItems;
            setCurrentShoppingList(updatedShoppingList);
            alert(`🤖 AI moved ${moveCount} items to better categories!`);
        } else {
            alert('🎯 All items are already in optimal categories!');
        }
    };

    // NEW: Advanced print function
    const handleAdvancedPrint = () => {
        console.log('🖨️ Opening print options modal...');
        setShowPrintModal(true);
    };

    // NEW: Calculate print totals
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

    // Normalize shopping list structure - FIXED: Use currentShoppingList state
    const normalizeShoppingList = (list) => {
        const listToUse = list || currentShoppingList;
        if (!listToUse) return {items: {}, summary: {totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0}};

        let normalizedItems = {};
        let summary = listToUse.summary || listToUse.stats || {};

        if (listToUse.items) {
            if (Array.isArray(listToUse.items)) {
                listToUse.items.forEach(item => {
                    const category = item.category || 'Other';
                    if (!normalizedItems[category]) {
                        normalizedItems[category] = [];
                    }
                    normalizedItems[category].push(item);
                });
            } else if (typeof listToUse.items === 'object') {
                normalizedItems = listToUse.items;
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
            generatedAt: listToUse.generatedAt || new Date().toISOString(),
            recipes: listToUse.recipes || []
        };
    };

    const normalizedList = normalizeShoppingList();

    // Item interaction handlers
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

    // Group items by category for display
    const getGroupedItems = () => {
        if (aiMode === 'ai-optimized' && aiOptimization) {
            // Use AI-optimized route
            return aiOptimization.optimizedRoute.reduce((grouped, section) => {
                const sectionItems = [];
                section.categories.forEach(category => {
                    if (normalizedList.items[category]) {
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
            // Use standard layout
            const grouped = {};
            Object.entries(normalizedList.items).forEach(([category, items]) => {
                const filtered = getFilteredItems(items);
                if (filtered.length > 0) {
                    grouped[category] = filtered;
                }
            });
            return grouped;
        }
    };

    // Calculate statistics
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

    const handleStoreSelection = (storeName) => {
        setSelectedStore(storeName);
        localStorage.setItem('preferred-shopping-store', storeName);
        setShowStoreSelector(false);
        loadCustomCategories(); // Reload categories for new store
    };

    if (!isOpen || !currentShoppingList) {
        return null;
    }

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
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    paddingBottom: 'max(env(safe-area-inset-bottom, 48px), 48px)'
                }}>
                    {/* Enhanced Header with AI and Category Indicators */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: aiMode === 'ai-optimized' ? '#f0f9ff' : editingCategories ? '#fef3c7' : '#f8fafc',
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
                                {aiMode === 'ai-optimized' && (
                                    <span style={{
                                        marginLeft: '0.5rem',
                                        fontSize: '0.8rem',
                                        color: '#0369a1',
                                        fontWeight: '500'
                                    }}>
                                        🎯 Smart Optimized
                                    </span>
                                )}
                                {editingCategories && (
                                    <span style={{
                                        marginLeft: '0.5rem',
                                        fontSize: '0.8rem',
                                        color: '#d97706',
                                        fontWeight: '500'
                                    }}>
                                        📂 Category Mode
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
                            title="Close"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>

                    {/* Enhanced Controls with Category Management */}
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
                                padding: '0.375rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: editingCategories ? 'not-allowed' : 'pointer',
                                fontWeight: '500',
                                opacity: editingCategories ? 0.6 : 1
                            }}
                        >
                            🏪 {selectedStore || 'Store'}
                        </TouchEnhancedButton>

                        {/* AI Optimization Button */}
                        <TouchEnhancedButton
                            onClick={handleAIOptimization}
                            disabled={!selectedStore || aiLoading || editingCategories}
                            style={{
                                backgroundColor: aiMode === 'ai-optimized' ? '#0284c7' : '#7c3aed',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.375rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: (!selectedStore || aiLoading || editingCategories) ? 'not-allowed' : 'pointer',
                                fontWeight: '500',
                                opacity: (!selectedStore || aiLoading || editingCategories) ? 0.6 : 1
                            }}
                        >
                            {aiLoading ? '⏳ AI...' : aiMode === 'ai-optimized' ? '🤖 AI On' : '🤖 AI'}
                        </TouchEnhancedButton>

                        {/* Category Management Toggle */}
                        <TouchEnhancedButton
                            onClick={() => setEditingCategories(!editingCategories)}
                            style={{
                                backgroundColor: editingCategories ? '#dc2626' : '#f59e0b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.375rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            {editingCategories ? '✓ Done' : '📂 Categories'}
                        </TouchEnhancedButton>

                        {/* Smart Recategorize Button */}
                        {editingCategories && (
                            <TouchEnhancedButton
                                onClick={handleSmartRecategorize}
                                style={{
                                    backgroundColor: '#7c3aed',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.375rem 0.5rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                🤖 Smart Fix
                            </TouchEnhancedButton>
                        )}

                        {/* Custom Categories Button */}
                        {editingCategories && (
                            <TouchEnhancedButton
                                onClick={() => setShowCategoryManager(true)}
                                style={{
                                    backgroundColor: '#059669',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.375rem 0.5rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                🔧 Manage
                            </TouchEnhancedButton>
                        )}

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

                        {/* NEW: More Actions Toggle - Added from Unified version */}
                        {!editingCategories && (
                            <TouchEnhancedButton
                                onClick={() => setShowActions(!showActions)}
                                style={{
                                    backgroundColor: '#374151',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.375rem 0.5rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                {showActions ? '⌄ Less' : '⋯ More'}
                            </TouchEnhancedButton>
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
                                    Tap "Move to..." on any item to reorganize categories. Use "Smart Fix" for AI suggestions. Click "Manage" to add/remove custom categories.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* NEW: Expandable Actions Panel - Added from Unified version */}
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

                            </div>
                        </div>
                    )}

                    {/* NEW: Totals Panel - Added from Unified version */}
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

                    {/* Main Shopping List Content */}
                    <div
                        id="enhanced-shopping-list-content"
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
                        ) : (
                            // Category-based Display with Move to Category options
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
                                                                onChange={() => handleItemToggle(itemKey)}
                                                                style={{
                                                                    marginTop: '0.125rem',
                                                                    cursor: 'pointer',
                                                                    transform: 'scale(1.3)',
                                                                    accentColor: '#8b5cf6'
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

                                                            {/* AI Category Suggestion */}
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
                            {selectedStore && (
                                <div style={{marginTop: '0.25rem'}}>
                                    🏪 Store: {selectedStore}
                                    {aiMode === 'ai-optimized' && aiInsights && (
                                        <span style={{color: '#059669'}}> • AI Optimized ({(aiInsights.confidenceScore * 100).toFixed(0)}%)</span>
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
                                {movingItem.item.amount && `${movingItem.item.amount} `}
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
                                            className="hover:bg-gray-50"
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
                                                {categoryInfo?.section && (
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: '#6b7280'
                                                    }}>
                                                        {categoryInfo.section}
                                                    </div>
                                                )}
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

            {/* Custom Category Manager Modal */}
            {showCategoryManager && (
                <CustomCategoryManager
                    isOpen={showCategoryManager}
                    onClose={() => setShowCategoryManager(false)}
                    customCategories={customCategories}
                    onSave={saveCustomCategories}
                    userId={session?.user?.id}
                />
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
                        </div>
                    </div>
                </div>
            )}

            {/* Email Share Modal */}
            <EmailSharingModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                shoppingList={normalizedList}
                context="ai-shopping-enhanced"
                contextName={`Enhanced Smart Shopping Assistant List - ${selectedStore || 'Store'}`}
            />

            {/* Save Shopping List Modal */}
            <SaveShoppingListModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={(savedList) => {
                    console.log('Enhanced Smart Shopping Assistant list saved successfully:', savedList);
                }}
                shoppingList={normalizedList}
                listType="ai-enhanced"
                contextName={`Enhanced Smart Shopping Assistant List - ${selectedStore || 'Store'}`}
                sourceRecipeIds={sourceRecipeIds}
                sourceMealPlanId={sourceMealPlanId}
                metadata={{
                    store: selectedStore,
                    aiMode: aiMode,
                    aiInsights: aiInsights,
                    customCategories: customCategories,
                    categoryManagement: true
                }}
            />

            {/* NEW: Print Options Modal - Added from Unified version */}
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
                shoppingRoute={null} // AI mode doesn't use shopping routes like Unified
                totals={calculatePrintTotals()}
            />

            {/* NEW: Voice Input Modal */}
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

                        {/* Instructions */}
                        <div style={{
                            marginBottom: '1.5rem',
                            padding: '1rem',
                            backgroundColor: '#f0f9ff',
                            borderRadius: '8px',
                            border: '1px solid #0ea5e9'
                        }}>
                            <h4 style={{
                                margin: '0 0 0.5rem 0',
                                fontSize: '1rem',
                                fontWeight: '500',
                                color: '#0c4a6e'
                            }}>
                                💡 How to use Voice Input
                            </h4>
                            <ul style={{
                                margin: 0,
                                paddingLeft: '1.25rem',
                                fontSize: '0.875rem',
                                color: '#0369a1',
                                lineHeight: '1.4'
                            }}>
                                <li>Speak clearly and at normal speed</li>
                                <li>Say items separated by "and" or commas</li>
                                <li>Include quantities: "2 pounds chicken"</li>
                                <li>Examples: "milk, eggs, and 3 bananas"</li>
                                <li>The AI will automatically categorize items</li>
                            </ul>
                        </div>

                        {/* Voice Input Component */}
                        <div style={{
                            marginBottom: '1.5rem'
                        }}>
                            <VoiceInput
                                onResult={handleVoiceResult}
                                onError={handleVoiceError}
                                placeholder="Say items to add: 'milk, eggs, 2 pounds chicken'..."
                            />
                        </div>

                        {/* Processing Status */}
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

                        {/* Recent Voice Results */}
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

                        {/* Action Buttons */}
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
                                onClick={() => {
                                    setVoiceResults('');
                                    // Reset voice input state for next use
                                }}
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

                        {/* Voice Tips */}
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            backgroundColor: '#eff6ff',
                            borderRadius: '6px',
                            border: '1px solid #bfdbfe'
                        }}>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#1e40af',
                                fontWeight: '500',
                                marginBottom: '0.25rem'
                            }}>
                                💡 Voice Tips:
                            </div>
                            <ul style={{
                                fontSize: '0.75rem',
                                color: '#1e40af',
                                marginLeft: '1rem',
                                lineHeight: '1.4',
                                margin: '0 0 0 1rem'
                            }}>
                                <li>Speak in a quiet environment for best results</li>
                                <li>Use natural speech - don't spell out words</li>
                                <li>If items aren't recognized, try speaking more clearly</li>
                                <li>Check microphone permissions if voice input fails</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}

// NEW: Custom Category Manager Component (already exists in original)
function CustomCategoryManager({ isOpen, onClose, customCategories, onSave, userId }) {
    const [categories, setCategories] = useState({});
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('📦');
    const [newCategorySection, setNewCategorySection] = useState('Other');
    const [editingCategory, setEditingCategory] = useState(null);

    useEffect(() => {
        if (isOpen) {
            // Merge default categories with custom ones
            const merged = CategoryUtils.mergeWithCustomCategories(customCategories);
            setCategories(merged);
        }
    }, [isOpen, customCategories]);

    const addCustomCategory = () => {
        if (!newCategoryName.trim()) return;

        const categoryName = newCategoryName.trim();

        // Check for duplicates
        if (categories[categoryName]) {
            alert('A category with this name already exists');
            return;
        }

        const newCategory = CategoryUtils.createCustomCategory(
            categoryName,
            newCategoryIcon,
            '#6366f1', // Default purple color
            newCategorySection
        );

        const updatedCategories = {
            ...categories,
            [categoryName]: newCategory
        };

        setCategories(updatedCategories);

        // Reset form
        setNewCategoryName('');
        setNewCategoryIcon('📦');
        setNewCategorySection('Other');
    };

    const removeCustomCategory = (categoryName) => {
        if (!categories[categoryName]?.custom) {
            alert('Cannot remove default categories');
            return;
        }

        if (!confirm(`Remove category "${categoryName}"?`)) return;

        const updatedCategories = { ...categories };
        delete updatedCategories[categoryName];
        setCategories(updatedCategories);
    };

    const hideDefaultCategory = (categoryName) => {
        const updatedCategories = {
            ...categories,
            [categoryName]: {
                ...categories[categoryName],
                hidden: !categories[categoryName].hidden
            }
        };
        setCategories(updatedCategories);
    };

    const saveChanges = () => {
        // Extract only custom categories for saving
        const customOnly = {};
        Object.entries(categories).forEach(([name, category]) => {
            if (category.custom) {
                customOnly[name] = category;
            }
        });

        onSave(customOnly);
        onClose();
    };

    if (!isOpen) return null;

    const defaultCategories = Object.entries(categories).filter(([_, cat]) => !cat.custom);
    const customCategoriesOnly = Object.entries(categories).filter(([_, cat]) => cat.custom);

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

                <div style={{ flex: 1, overflow: 'auto', marginBottom: '1rem' }}>
                    {/* Add New Category */}
                    <div style={{
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #0ea5e9',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        <h4 style={{
                            margin: '0 0 0.75rem 0',
                            fontSize: '1rem',
                            fontWeight: '500',
                            color: '#0c4a6e'
                        }}>
                            ➕ Add Custom Category
                        </h4>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto auto',
                            gap: '0.5rem',
                            alignItems: 'end'
                        }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '0.25rem'
                                }}>
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="e.g., International Foods"
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem'
                                    }}
                                    maxLength={30}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '0.25rem'
                                }}>
                                    Icon
                                </label>
                                <input
                                    type="text"
                                    value={newCategoryIcon}
                                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                                    style={{
                                        width: '3rem',
                                        padding: '0.5rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem',
                                        textAlign: 'center'
                                    }}
                                    maxLength={2}
                                />
                            </div>

                            <TouchEnhancedButton
                                onClick={addCustomCategory}
                                disabled={!newCategoryName.trim()}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: newCategoryName.trim() ? '#0ea5e9' : '#9ca3af',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: newCategoryName.trim() ? 'pointer' : 'not-allowed',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                Add
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* Custom Categories */}
                    {customCategoriesOnly.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{
                                margin: '0 0 0.75rem 0',
                                fontSize: '1rem',
                                fontWeight: '500',
                                color: '#374151'
                            }}>
                                🎨 Your Custom Categories ({customCategoriesOnly.length})
                            </h4>

                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {customCategoriesOnly.map(([name, category]) => (
                                    <div key={name} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.75rem',
                                        backgroundColor: '#fef3c7',
                                        border: '1px solid #f59e0b',
                                        borderRadius: '6px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '1.25rem' }}>{category.icon}</span>
                                            <span style={{ fontWeight: '500', color: '#92400e' }}>{name}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#d97706' }}>
                                                (Custom)
                                            </span>
                                        </div>

                                        <TouchEnhancedButton
                                            onClick={() => removeCustomCategory(name)}
                                            style={{
                                                padding: '0.25rem 0.5rem',
                                                backgroundColor: '#dc2626',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem'
                                            }}
                                            title="Remove custom category"
                                        >
                                            🗑️ Remove
                                        </TouchEnhancedButton>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Default Categories */}
                    <div>
                        <h4 style={{
                            margin: '0 0 0.75rem 0',
                            fontSize: '1rem',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            📋 Default Categories ({defaultCategories.length})
                        </h4>
                        <p style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            margin: '0 0 0.75rem 0'
                        }}>
                            You can hide default categories you don't use. Hidden categories won't appear in the category list.
                        </p>

                        <div style={{
                            display: 'grid',
                            gap: '0.25rem',
                            maxHeight: '200px',
                            overflow: 'auto',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            padding: '0.5rem'
                        }}>
                            {defaultCategories.map(([name, category]) => (
                                <div key={name} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.5rem',
                                    backgroundColor: category.hidden ? '#f3f4f6' : 'white',
                                    borderRadius: '4px',
                                    opacity: category.hidden ? 0.6 : 1
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '1rem' }}>{category.icon}</span>
                                        <span style={{
                                            fontSize: '0.875rem',
                                            color: category.hidden ? '#6b7280' : '#374151',
                                            textDecoration: category.hidden ? 'line-through' : 'none'
                                        }}>
                                            {name}
                                        </span>
                                        {category.section && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                color: '#9ca3af',
                                                backgroundColor: '#f3f4f6',
                                                padding: '0.125rem 0.375rem',
                                                borderRadius: '12px'
                                            }}>
                                                {category.section}
                                            </span>
                                        )}
                                    </div>

                                    <TouchEnhancedButton
                                        onClick={() => hideDefaultCategory(name)}
                                        style={{
                                            padding: '0.25rem 0.5rem',
                                            backgroundColor: category.hidden ? '#10b981' : '#f59e0b',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem'
                                        }}
                                        title={category.hidden ? 'Show category' : 'Hide category'}
                                    >
                                        {category.hidden ? '👁️ Show' : '🙈 Hide'}
                                    </TouchEnhancedButton>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid #e5e7eb'
                }}>
                    <TouchEnhancedButton
                        onClick={onClose}
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
                        Cancel
                    </TouchEnhancedButton>

                    <TouchEnhancedButton
                        onClick={saveChanges}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            backgroundColor: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        💾 Save Changes
                    </TouchEnhancedButton>
                </div>
            </div>
        </div>
    );
}