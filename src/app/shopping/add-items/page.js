'use client';

// file: src/app/shopping/add-items/page.js v1

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { formatInventoryDisplayText } from '@/lib/inventoryDisplayUtils';
import {apiPost, apiPut} from "@/lib/api-config.js";
import {
    NativeTextInput,
    ValidationPatterns
} from '@/components/forms/NativeIOSFormComponents';

export default function AddItemsPage() {
    const [activeTab, setActiveTab] = useState('inventory');
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Inventory tab state
    const [inventory, setInventory] = useState([]);
    const [inventoryFilter, setInventoryFilter] = useState('all');
    const [inventorySearch, setInventorySearch] = useState('');

    // Recently consumed tab state
    const [consumedItems, setConsumedItems] = useState([]);
    const [selectedDays, setSelectedDays] = useState(30);
    const [consumedFilter, setConsumedFilter] = useState('all');
    const [consumedSearch, setConsumedSearch] = useState('');

    // Manual add tab state
    const [manualItems, setManualItems] = useState([{ name: '', category: '', amount: '1', unit: 'item', notes: '' }]);

    // Shopping list choice state
    const [showListChoice, setShowListChoice] = useState(false);
    const [listChoice, setListChoice] = useState('new');
    const [newListName, setNewListName] = useState('');
    const [savedLists, setSavedLists] = useState([]);
    const [selectedExistingList, setSelectedExistingList] = useState('');

    const categories = [
        'Produce', 'Dairy', 'Meat & Seafood', 'Pantry', 'Frozen', 'Bakery',
        'Beverages', 'Snacks', 'Personal Care', 'Household', 'Other'
    ];

    const units = [
        'item', 'lbs', 'oz', 'kg', 'g', 'cup', 'tbsp', 'tsp', 'ml', 'l',
        'can', 'package', 'bottle', 'bag', 'box'
    ];

    // Load data when component mounts or tab changes
    useEffect(() => {
        if (activeTab === 'inventory') {
            loadInventory();
        } else if (activeTab === 'consumed') {
            loadConsumedItems();
        }
        // Reset selections when switching tabs
        setSelectedItems(new Set());
    }, [activeTab, selectedDays]);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/inventory');
            const result = await response.json();

            if (result.success) {
                setInventory(result.inventory || []);
            }
        } catch (error) {
            console.error('Error loading inventory:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Load Failed',
                message: 'Failed to load inventory'
            });
        } finally {
            setLoading(false);
        }
    };

    const loadConsumedItems = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/inventory/consume?limit=200');
            const result = await response.json();

            if (!response.ok) {
                if (!response.ok) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Load Failed',
                        message: result.error || 'Failed to load consumption history'
                    });
                    return;
                }
            }

            // Filter by date range and group by item
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - selectedDays);

            const recentHistory = result.history.filter(record => {
                const consumedDate = new Date(record.dateConsumed);
                return consumedDate >= cutoffDate && !record.isReversed && !record.isReversal;
            });

            // Group by item name
            const itemGroups = {};
            recentHistory.forEach(record => {
                const key = record.itemName.toLowerCase();
                if (!itemGroups[key]) {
                    itemGroups[key] = {
                        name: record.itemName,
                        totalConsumed: 0,
                        unit: record.unitConsumed,
                        timesUsed: 0,
                        lastUsed: record.dateConsumed,
                        reasons: new Set(),
                        category: 'Other'
                    };
                }

                itemGroups[key].totalConsumed += record.quantityConsumed;
                itemGroups[key].timesUsed += 1;
                itemGroups[key].reasons.add(record.reason);

                if (new Date(record.dateConsumed) > new Date(itemGroups[key].lastUsed)) {
                    itemGroups[key].lastUsed = record.dateConsumed;
                }
            });

            const items = Object.values(itemGroups)
                .map(item => ({
                    ...item,
                    reasons: Array.from(item.reasons),
                    daysSinceUsed: Math.floor((new Date() - new Date(item.lastUsed)) / (1000 * 60 * 60 * 24)),
                    id: `consumed-${item.name.toLowerCase().replace(/\s+/g, '-')}`
                }))
                .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));

            setConsumedItems(items);
        } catch (error) {
            console.error('Error loading consumed items:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Load Error',
                message: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const loadSavedLists = async () => {
        try {
            const response = await fetch('/api/shopping/saved?includeArchived=false&limit=20');
            const result = await response.json();

            if (result.success) {
                const editableLists = result.lists.filter(list =>
                    ['custom', 'recipes', 'recipe'].includes(list.listType)
                );
                setSavedLists(editableLists);
                if (editableLists.length > 0) {
                    setSelectedExistingList(editableLists[0].id);
                }
            }
        } catch (error) {
            console.error('Error loading saved lists:', error);
        }
    };

    const toggleItemSelection = (itemId) => {
        const newSelection = new Set(selectedItems);
        if (newSelection.has(itemId)) {
            newSelection.delete(itemId);
        } else {
            newSelection.add(itemId);
        }
        setSelectedItems(newSelection);
    };

    const addManualItem = () => {
        setManualItems([...manualItems, { name: '', category: '', amount: '1', unit: 'item', notes: '' }]);
    };

    const removeManualItem = (index) => {
        if (manualItems.length > 1) {
            const newItems = manualItems.filter((_, i) => i !== index);
            setManualItems(newItems);
        }
    };

    const updateManualItem = (index, field, value) => {
        const newItems = [...manualItems];
        newItems[index][field] = value;
        setManualItems(newItems);
    };

    const getFilteredInventory = () => {
        let filtered = inventory;

        if (inventorySearch.trim()) {
            const query = inventorySearch.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(query) ||
                (item.brand && item.brand.toLowerCase().includes(query))
            );
        }

        if (inventoryFilter !== 'all') {
            filtered = filtered.filter(item => item.location === inventoryFilter);
        }

        return filtered;
    };

    const getFilteredConsumed = () => {
        let filtered = consumedItems;

        if (consumedSearch.trim()) {
            const query = consumedSearch.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(query)
            );
        }

        if (consumedFilter !== 'all') {
            filtered = filtered.filter(item =>
                item.reasons.includes(consumedFilter)
            );
        }

        return filtered;
    };

    const proceedToShoppingList = async () => {
        const itemsToAdd = [];

        // Collect items from active tab
        if (activeTab === 'inventory') {
            const selectedInventoryItems = getFilteredInventory().filter(item =>
                selectedItems.has(item._id)
            );

            selectedInventoryItems.forEach(item => {
                itemsToAdd.push({
                    name: item.name,
                    category: item.category || 'Other',
                    unit: item.unit,
                    amount: '1',
                    brand: item.brand || '',
                    notes: `From inventory - ${item.location}`,
                    source: 'inventory'
                });
            });
        } else if (activeTab === 'consumed') {
            const selectedConsumedItems = getFilteredConsumed().filter(item =>
                selectedItems.has(item.id)
            );

            selectedConsumedItems.forEach(item => {
                itemsToAdd.push({
                    name: item.name,
                    category: item.category,
                    unit: item.unit,
                    amount: Math.ceil(item.totalConsumed / item.timesUsed) || 1,
                    notes: `Used ${item.timesUsed} times in last ${selectedDays} days`,
                    source: 'consumed_history'
                });
            });
        } else if (activeTab === 'manual') {
            const validManualItems = manualItems.filter(item => item.name.trim());

            validManualItems.forEach(item => {
                itemsToAdd.push({
                    name: item.name.trim(),
                    category: item.category || 'Other',
                    unit: item.unit,
                    amount: item.amount || '1',
                    notes: item.notes || '',
                    source: 'manual'
                });
            });
        }

        if (itemsToAdd.length === 0) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'No Items Selected',
                message: 'Please select or add at least one item to continue.'
            });
            return;
        }

        // Show list choice modal
        await loadSavedLists();
        setNewListName(`Shopping List - ${new Date().toLocaleDateString()}`);
        setShowListChoice(true);
    };

    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-orange-500' : 'bg-blue-500';

        toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full opacity-0`;
        toast.innerHTML = `
        <div class="flex items-center space-x-2">
            <span>${message}</span>
        </div>
    `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    };

    const createShoppingList = async () => {
        try {
            setLoading(true);

            const itemsToAdd = [];

            // Collect items based on active tab (same logic as before)
            if (activeTab === 'inventory') {
                const selectedInventoryItems = getFilteredInventory().filter(item =>
                    selectedItems.has(item._id)
                );

                selectedInventoryItems.forEach(item => {
                    itemsToAdd.push({
                        ingredient: item.name,
                        amount: '1',
                        category: item.category || 'Other',
                        inInventory: true,
                        purchased: false,
                        recipes: [],
                        originalName: item.name,
                        needAmount: '1',
                        haveAmount: `${item.quantity} ${item.unit}`,
                        itemKey: `${item.name}-${item.category || 'Other'}`,
                        notes: `From inventory - ${item.location}${item.brand ? ` (${item.brand})` : ''}`
                    });
                });
            } else if (activeTab === 'consumed') {
                const selectedConsumedItems = getFilteredConsumed().filter(item =>
                    selectedItems.has(item.id)
                );

                selectedConsumedItems.forEach(item => {
                    const estimatedAmount = Math.ceil(item.totalConsumed / item.timesUsed) || 1;
                    itemsToAdd.push({
                        ingredient: item.name,
                        amount: estimatedAmount.toString(),
                        category: item.category || 'Other',
                        inInventory: false,
                        purchased: false,
                        recipes: [],
                        originalName: item.name,
                        needAmount: estimatedAmount.toString(),
                        haveAmount: '0',
                        itemKey: `${item.name}-${item.category || 'Other'}`,
                        notes: `Used ${item.timesUsed} times in last ${selectedDays} days`
                    });
                });
            } else if (activeTab === 'manual') {
                const validManualItems = manualItems.filter(item => item.name.trim());

                validManualItems.forEach(item => {
                    itemsToAdd.push({
                        ingredient: item.name.trim(),
                        amount: item.amount || '1',
                        category: item.category || 'Other',
                        inInventory: false,
                        purchased: false,
                        recipes: [],
                        originalName: item.name.trim(),
                        needAmount: item.amount || '1',
                        haveAmount: '0',
                        itemKey: `${item.name.trim()}-${item.category || 'Other'}`,
                        notes: item.notes || ''
                    });
                });
            }

            if (itemsToAdd.length === 0) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'No Items Selected',
                    message: 'Please select or add at least one item to create a shopping list.'
                });
                return;
            }

            if (listChoice === 'new') {
                // Create new saved shopping list using the correct API
                const response = await apiPost('/api/shopping/saved', {
                    name: newListName.trim(),
                    description: `Shopping list with ${itemsToAdd.length} items`,
                    listType: 'custom',
                    contextName: newListName.trim(),
                    sourceRecipeIds: [],
                    sourceMealPlanId: null,
                    items: itemsToAdd,
                    tags: ['custom', 'manual'],
                    color: '#3b82f6',
                    isTemplate: false
                });

                const result = await response.json();
                if (!response.ok) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Creation Failed',
                        message: result.error
                    });
                    return;
                }

                showToast(`✅ Created new shopping list: "${newListName}" with ${itemsToAdd.length} items!`);

            } else {
                // Add to existing list - get current list first, then update
                const getResponse = await apiGet(`/api/shopping/saved/${selectedExistingList}`);
                const getResult = await getResponse.json();

                if (!getResponse.ok) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Get List Failed',
                        message: getResult.error
                    });
                    return;
                }

                const existingList = getResult.savedList;

                // Merge items - avoid duplicates based on itemKey
                const existingItemKeys = new Set(existingList.items.map(item => item.itemKey));
                const newItems = itemsToAdd.filter(item => !existingItemKeys.has(item.itemKey));
                const updatedItems = [...existingList.items, ...newItems];

                // Update the list using apiPut
                const updateResponse = await apiPut(`/api/shopping/saved/${selectedExistingList}`, {
                    items: updatedItems
                });

                const updateResult = await updateResponse.json();
                if (!updateResponse.ok) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Update Failed',
                        message: updateResult.error
                    });
                    return;
                }

                showToast(`✅ Added ${newItems.length} new items to existing shopping list!`);
            }

            // Reset and redirect
            setSelectedItems(new Set());
            setShowListChoice(false);

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            const viewLists = await NativeDialog.showConfirm({
                title: 'Shopping List Created!',
                message: 'Your shopping list has been updated successfully. Would you like to view your saved lists?',
                confirmText: 'View Lists',
                cancelText: 'Stay Here'
            });

            if (viewLists) {
                window.location.href = '/shopping/saved';

            } else {
                // Reset the form
                if (activeTab === 'manual') {
                    setManualItems([{ name: '', category: '', amount: '1', unit: 'item', notes: '' }]);
                }
            }

        } catch (error) {
            console.error('Error creating shopping list:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Creation Failed',
                message: error.message
            });
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const getReasonIcon = (reasons) => {
        if (reasons.includes('expired')) return '🗑️';
        if (reasons.includes('consumed')) return '🍽️';
        if (reasons.includes('recipe')) return '👨‍🍳';
        return '📦';
    };

    const filteredInventory = getFilteredInventory();
    const filteredConsumed = getFilteredConsumed();
    const validManualItems = manualItems.filter(item => item.name.trim());

    return (
        <MobileOptimizedLayout>
            <div className="px-4 py-6 pb-20">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        🛒 Add Items to Shopping List
                    </h1>
                    <p className="text-gray-600">
                        Choose items from your inventory, recently used items, or add new ones
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 overflow-hidden">
                    <div className="flex">
                        <TouchEnhancedButton
                            onClick={() => setActiveTab('inventory')}
                            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'inventory'
                                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                                    : 'border-transparent text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            📦 From Inventory
                            {activeTab === 'inventory' && selectedItems.size > 0 && (
                                <span className="ml-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                    {selectedItems.size}
                                </span>
                            )}
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => setActiveTab('consumed')}
                            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'consumed'
                                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                                    : 'border-transparent text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            🔄 Recently Used
                            {activeTab === 'consumed' && selectedItems.size > 0 && (
                                <span className="ml-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                    {selectedItems.size}
                                </span>
                            )}
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => setActiveTab('manual')}
                            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'manual'
                                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                                    : 'border-transparent text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            ➕ Add New
                            {activeTab === 'manual' && validManualItems.length > 0 && (
                                <span className="ml-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                    {validManualItems.length}
                                </span>
                            )}
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {/* Inventory Tab */}
                    {activeTab === 'inventory' && (
                        <div className="space-y-4">
                            {/* Filters */}
                            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        🔍 Search Items
                                    </label>
                                    <NativeTextInput
                                        type="text"
                                        inputMode="search"
                                        value={inventorySearch}
                                        onChange={(e) => setInventorySearch(e.target.value)}
                                        placeholder="Search by name or brand..."
                                        autoComplete="off"
                                        validation={(value) => ({
                                            isValid: true,
                                            message: value && value.length > 1 ? `Searching inventory for "${value}"` : ''
                                        })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        📍 Filter by Location
                                    </label>
                                    <select
                                        value={inventoryFilter}
                                        onChange={(e) => setInventoryFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    >
                                        <option value="pantry">Pantry</option>
                                        <option value="kitchen">Kitchen Cabinets</option>
                                        <option value="fridge">Fridge</option>
                                        <option value="fridge-freezer">Fridge Freezer</option>
                                        <option value="deep-freezer">Deep/Stand-up Freezer</option>
                                        <option value="garage">Garage/Storage</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            {/* Inventory Items */}
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <span className="ml-3 text-gray-600">Loading inventory...</span>
                                </div>
                            ) : filteredInventory.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">📦</div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
                                    <p className="text-gray-600">
                                        {inventory.length === 0 ? 'Your inventory is empty' : 'No items match your filters'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredInventory.map((item) => {
                                        const isSelected = selectedItems.has(item._id);
                                        return (
                                            <div
                                                key={item._id}
                                                className={`bg-white border-2 rounded-lg p-4 transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                                onClick={() => toggleItemSelection(item._id)}
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleItemSelection(item._id)}
                                                        className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-900 mb-1">
                                                            {item.name}
                                                            {item.brand && <span className="text-gray-600"> ({item.brand})</span>}
                                                        </h3>
                                                        <div className="text-sm text-gray-600 space-y-1">
                                                            <div>Stock: {formatInventoryDisplayText(item)}</div>
                                                            <div>Location: {item.location}</div>
                                                            {item.category && <div>Category: {item.category}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recently Consumed Tab */}
                    {activeTab === 'consumed' && (
                        <div className="space-y-4">
                            {/* Filters */}
                            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        📅 Show items used in the last:
                                    </label>
                                    <select
                                        value={selectedDays}
                                        onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    >
                                        <option value={30}>30 days</option>
                                        <option value={60}>60 days</option>
                                        <option value={90}>90 days</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        🔍 Search Items
                                    </label>
                                    <NativeTextInput
                                        type="text"
                                        inputMode="search"
                                        value={consumedSearch}
                                        onChange={(e) => setConsumedSearch(e.target.value)}
                                        placeholder="Search by item name..."
                                        autoComplete="off"
                                        validation={(value) => ({
                                            isValid: true,
                                            message: value && value.length > 1 ? `Searching consumed items for "${value}"` : ''
                                        })}
                                    />
                                </div>
                            </div>

                            {/* Consumed Items */}
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <span className="ml-3 text-gray-600">Loading consumed items...</span>
                                </div>
                            ) : filteredConsumed.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">🔄</div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
                                    <p className="text-gray-600">
                                        {consumedItems.length === 0
                                            ? `No items were consumed in the last ${selectedDays} days`
                                            : 'No items match your search'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredConsumed.map((item) => {
                                        const isSelected = selectedItems.has(item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                className={`bg-white border-2 rounded-lg p-4 transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                                onClick={() => toggleItemSelection(item.id)}
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleItemSelection(item.id)}
                                                        className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-900 mb-1">
                                                            {getReasonIcon(item.reasons)} {item.name}
                                                        </h3>
                                                        <div className="text-sm text-gray-600 space-y-1">
                                                            <div>Used: {item.totalConsumed} {item.unit} ({item.timesUsed} times)</div>
                                                            <div>Last used: {item.daysSinceUsed === 0 ? 'Today' : `${item.daysSinceUsed} days ago`}</div>
                                                            <div>Avg per use: {Math.ceil(item.totalConsumed / item.timesUsed)} {item.unit}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual Add Tab */}
                    {activeTab === 'manual' && (
                        <div className="space-y-4">
                            {manualItems.map((item, index) => (
                                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-gray-700">
                                            Item #{index + 1}
                                        </div>
                                        {manualItems.length > 1 && (
                                            <TouchEnhancedButton
                                                onClick={() => removeManualItem(index)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                🗑️ Remove
                                            </TouchEnhancedButton>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Item Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => updateManualItem(index, 'name', e.target.value)}
                                            placeholder="e.g., Milk, Bread, Bananas..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Category
                                            </label>
                                            <select
                                                value={item.category}
                                                onChange={(e) => updateManualItem(index, 'category', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            >
                                                <option value="">Select...</option>
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Amount
                                            </label>
                                            <div className="flex space-x-2">
                                                <input
                                                    type="text"
                                                    value={item.amount}
                                                    onChange={(e) => updateManualItem(index, 'amount', e.target.value)}
                                                    placeholder="1"
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                />
                                                <select
                                                    value={item.unit}
                                                    onChange={(e) => updateManualItem(index, 'unit', e.target.value)}
                                                    className="px-2 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                >
                                                    {units.map(unit => (
                                                        <option key={unit} value={unit}>{unit}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Notes (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={item.notes}
                                            onChange={(e) => updateManualItem(index, 'notes', e.target.value)}
                                            placeholder="e.g., Organic, Large size, On sale..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                </div>
                            ))}

                            <TouchEnhancedButton
                                onClick={addManualItem}
                                className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                            >
                                ➕ Add Another Item
                            </TouchEnhancedButton>

                            {/* Quick Add Suggestions */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                                    💡 Quick Add Suggestions
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { name: 'Milk', category: 'Dairy', amount: '1', unit: 'package' },
                                        { name: 'Bread', category: 'Bakery', amount: '1', unit: 'item' },
                                        { name: 'Bananas', category: 'Produce', amount: '1', unit: 'lbs' },
                                        { name: 'Eggs', category: 'Dairy', amount: '1', unit: 'package' },
                                        { name: 'Chicken', category: 'Meat & Seafood', amount: '2', unit: 'lbs' },
                                        { name: 'Rice', category: 'Pantry', amount: '1', unit: 'bag' }
                                    ].map((suggestion, index) => (
                                        <TouchEnhancedButton
                                            key={index}
                                            onClick={() => {
                                                const newItems = [...manualItems];
                                                const emptyIndex = newItems.findIndex(item => !item.name.trim());
                                                if (emptyIndex !== -1) {
                                                    newItems[emptyIndex] = { ...suggestion, notes: '' };
                                                    setManualItems(newItems);
                                                } else {
                                                    setManualItems([...newItems, { ...suggestion, notes: '' }]);
                                                }
                                            }}
                                            className="text-left bg-white border border-yellow-300 rounded-md p-2 hover:bg-yellow-50 text-sm"
                                        >
                                            <div className="font-medium text-gray-900">{suggestion.name}</div>
                                            <div className="text-xs text-gray-600">
                                                {suggestion.amount} {suggestion.unit} • {suggestion.category}
                                            </div>
                                        </TouchEnhancedButton>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <div className="mt-6">
                    <TouchEnhancedButton
                        onClick={proceedToShoppingList}
                        disabled={
                            loading ||
                            (activeTab === 'inventory' && selectedItems.size === 0) ||
                            (activeTab === 'consumed' && selectedItems.size === 0) ||
                            (activeTab === 'manual' && validManualItems.length === 0)
                        }
                        className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 text-lg"
                    >
                        {(() => {
                            if (activeTab === 'inventory') {
                                return `🛒 Add ${selectedItems.size} Items to Shopping List`;
                            } else if (activeTab === 'consumed') {
                                return `🛒 Add ${selectedItems.size} Items to Shopping List`;
                            } else {
                                return `🛒 Create Shopping List (${validManualItems.length} items)`;
                            }
                        })()}
                    </TouchEnhancedButton>
                </div>

                {/* Shopping List Choice Modal */}
                {showListChoice && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
                            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    🛒 Choose Shopping List
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    Create a new list or add to an existing one
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {/* New List Option */}
                                <div
                                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                                        listChoice === 'new'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => setListChoice('new')}
                                >
                                    <div className="flex items-start space-x-3">
                                        <input
                                            type="radio"
                                            checked={listChoice === 'new'}
                                            onChange={() => setListChoice('new')}
                                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">
                                                📝 Create New Shopping List
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                Start a fresh shopping list
                                            </div>

                                            {listChoice === 'new' && (
                                                <div className="mt-3">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        List Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newListName}
                                                        onChange={(e) => setNewListName(e.target.value)}
                                                        placeholder="Enter list name..."
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                        maxLength={50}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Existing List Option */}
                                <div
                                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                                        listChoice === 'existing'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => setListChoice('existing')}
                                >
                                    <div className="flex items-start space-x-3">
                                        <input
                                            type="radio"
                                            checked={listChoice === 'existing'}
                                            onChange={() => setListChoice('existing')}
                                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">
                                                📋 Add to Existing List
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                Add to one of your saved shopping lists
                                                {savedLists.length > 0 && (
                                                    <span className="text-green-600"> ({savedLists.length} available)</span>
                                                )}
                                            </div>

                                            {listChoice === 'existing' && (
                                                <div className="mt-3">
                                                    {savedLists.length === 0 ? (
                                                        <div className="text-sm text-gray-500 italic">
                                                            No existing lists available. Create a new list instead.
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Select List
                                                            </label>
                                                            <select
                                                                value={selectedExistingList}
                                                                onChange={(e) => setSelectedExistingList(e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                            >
                                                                {savedLists.map(list => (
                                                                    <option key={list.id} value={list.id}>
                                                                        {list.name} ({list.stats.totalItems} items)
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-200 flex space-x-3 flex-shrink-0">
                                <TouchEnhancedButton
                                    onClick={() => setShowListChoice(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 text-center font-medium"
                                >
                                    Cancel
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={createShoppingList}
                                    disabled={loading || (listChoice === 'existing' && savedLists.length === 0)}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-center font-medium"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Creating...</span>
                                        </div>
                                    ) : (
                                        `✅ ${listChoice === 'new' ? 'Create List' : 'Add to List'}`
                                    )}
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                )}

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}