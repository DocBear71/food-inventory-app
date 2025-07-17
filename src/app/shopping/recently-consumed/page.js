'use client';

// file: src/app/shopping/recently-consumed/page.js v1

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import {apiPost} from "@/lib/api-config.js";

export default function RecentlyConsumedPage() {
    const [selectedDays, setSelectedDays] = useState(30);
    const [consumedItems, setConsumedItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Load consumed items when component mounts or days change
    useEffect(() => {
        loadConsumedItems();
    }, [selectedDays]);

    const loadConsumedItems = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(`/api/inventory/consume?limit=200`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to load consumption history');
            }

            // Filter by date range and group by item
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - selectedDays);

            const recentHistory = result.history.filter(record => {
                const consumedDate = new Date(record.dateConsumed);
                return consumedDate >= cutoffDate && !record.isReversed && !record.isReversal;
            });

            // Group by item name and aggregate data
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
                        category: 'Other', // We'll try to infer this
                        records: []
                    };
                }

                itemGroups[key].totalConsumed += record.quantityConsumed;
                itemGroups[key].timesUsed += 1;
                itemGroups[key].reasons.add(record.reason);
                itemGroups[key].records.push(record);

                // Keep the most recent date
                if (new Date(record.dateConsumed) > new Date(itemGroups[key].lastUsed)) {
                    itemGroups[key].lastUsed = record.dateConsumed;
                }
            });

            // Convert to array and sort by last used
            const items = Object.values(itemGroups)
                .map(item => ({
                    ...item,
                    reasons: Array.from(item.reasons),
                    daysSinceUsed: Math.floor((new Date() - new Date(item.lastUsed)) / (1000 * 60 * 60 * 24))
                }))
                .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));

            setConsumedItems(items);
        } catch (error) {
            console.error('Error loading consumed items:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleItemSelection = (itemName) => {
        const newSelection = new Set(selectedItems);
        if (newSelection.has(itemName)) {
            newSelection.delete(itemName);
        } else {
            newSelection.add(itemName);
        }
        setSelectedItems(newSelection);
    };

    const selectAll = () => {
        const filteredItems = getFilteredItems();
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(item => item.name)));
        }
    };

    const getFilteredItems = () => {
        let filtered = consumedItems;

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(query)
            );
        }

        // Apply reason filter
        if (filter !== 'all') {
            filtered = filtered.filter(item =>
                item.reasons.includes(filter)
            );
        }

        return filtered;
    };

    const addToShoppingList = async () => {
        if (selectedItems.size === 0) {
            alert('Please select at least one item to add to your shopping list');
            return;
        }

        try {
            const itemsToAdd = Array.from(selectedItems).map(itemName => {
                const item = consumedItems.find(i => i.name === itemName);
                return {
                    name: item.name,
                    category: item.category,
                    unit: item.unit,
                    amount: Math.ceil(item.totalConsumed / item.timesUsed) || 1, // Average consumption
                    source: 'consumed_history',
                    notes: `Used ${item.timesUsed} times in last ${selectedDays} days`
                };
            });

            // For now, create a new shopping list
            // Later you can add the modal to choose between new/existing
            const listName = `Shopping List - ${new Date().toLocaleDateString()}`;

            const response = await apiPost('/api/shopping/custom', {
                    name: listName,
                    items: itemsToAdd,
                    listType: 'custom'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create shopping list');
            }

            alert(`✅ Added ${selectedItems.size} items to new shopping list: "${listName}"`);
            setSelectedItems(new Set());

            // Optionally navigate to shopping lists
            // window.location.href = '/shopping/saved';

        } catch (error) {
            console.error('Error creating shopping list:', error);
            alert('❌ Error creating shopping list: ' + error.message);
        }
    };

    const getReasonIcon = (reasons) => {
        if (reasons.includes('expired')) return '🗑️';
        if (reasons.includes('consumed')) return '🍽️';
        if (reasons.includes('recipe')) return '👨‍🍳';
        if (reasons.includes('donated')) return '❤️';
        if (reasons.includes('spilled')) return '💧';
        return '📦';
    };

    const getReasonText = (reasons) => {
        const reasonMap = {
            'consumed': 'Used/Eaten',
            'recipe': 'Used in Recipe',
            'expired': 'Expired',
            'donated': 'Donated',
            'spilled': 'Spilled/Wasted',
            'other': 'Other'
        };

        return reasons.map(r => reasonMap[r] || r).join(', ');
    };

    const filteredItems = getFilteredItems();
    const uniqueReasons = [...new Set(consumedItems.flatMap(item => item.reasons))];

    return (
        <MobileOptimizedLayout>
            <div className="px-4 py-6 pb-20">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        🔄 Recently Used Items
                    </h1>
                    <p className="text-gray-600">
                        Add previously consumed items back to your shopping list
                    </p>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6 space-y-4">
                    {/* Time Period Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📅 Show items used in the last:
                        </label>
                        <select
                            value={selectedDays}
                            onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value={30}>30 days</option>
                            <option value={60}>60 days</option>
                            <option value={90}>90 days</option>
                        </select>
                    </div>

                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            🔍 Search Items
                        </label>
                        <input
                            type="text"
                            placeholder="Search by item name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Reason Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📊 Filter by reason
                        </label>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All reasons</option>
                            {uniqueReasons.map(reason => (
                                <option key={reason} value={reason}>
                                    {getReasonText([reason])}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Selection Controls */}
                {filteredItems.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-blue-800 font-medium">
                                {selectedItems.size} of {filteredItems.length} items selected
                            </div>
                            <TouchEnhancedButton
                                onClick={selectAll}
                                className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                            >
                                {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
                            </TouchEnhancedButton>
                        </div>

                        {selectedItems.size > 0 && (
                            <TouchEnhancedButton
                                onClick={addToShoppingList}
                                className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-medium hover:bg-green-700"
                            >
                                🛒 Add {selectedItems.size} Items to Shopping List
                            </TouchEnhancedButton>
                        )}
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading consumed items...</span>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                        <TouchEnhancedButton
                            onClick={loadConsumedItems}
                            className="mt-3 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                        >
                            Try Again
                        </TouchEnhancedButton>
                    </div>
                )}

                {/* Items List */}
                {!loading && !error && (
                    <>
                        {filteredItems.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">📦</div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    No items found
                                </h3>
                                <p className="text-gray-600">
                                    {consumedItems.length === 0
                                        ? `No items were consumed in the last ${selectedDays} days`
                                        : 'No items match your current filters'
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredItems.map((item, index) => {
                                    const isSelected = selectedItems.has(item.name);

                                    return (
                                        <div
                                            key={index}
                                            className={`bg-white border-2 rounded-lg p-4 transition-all ${
                                                isSelected
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                            onClick={() => toggleItemSelection(item.name)}
                                        >
                                            <div className="flex items-start space-x-3">
                                                {/* Checkbox */}
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleItemSelection(item.name)}
                                                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    onClick={(e) => e.stopPropagation()}
                                                />

                                                {/* Item Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-gray-900 text-base mb-1">
                                                                {getReasonIcon(item.reasons)} {item.name}
                                                            </h3>

                                                            <div className="space-y-1 text-sm text-gray-600">
                                                                <div>
                                                                    <strong>Used:</strong> {item.totalConsumed} {item.unit}
                                                                    ({item.timesUsed} times)
                                                                </div>
                                                                <div>
                                                                    <strong>Last used:</strong> {item.daysSinceUsed === 0
                                                                    ? 'Today'
                                                                    : `${item.daysSinceUsed} days ago`
                                                                }
                                                                </div>
                                                                <div>
                                                                    <strong>Reason:</strong> {getReasonText(item.reasons)}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Average per use */}
                                                        <div className="text-right ml-4">
                                                            <div className="text-xs text-gray-500">Avg per use</div>
                                                            <div className="font-medium text-gray-900">
                                                                {Math.ceil(item.totalConsumed / item.timesUsed)} {item.unit}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* Info Box */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                    <div className="flex items-start">
                        <div className="text-yellow-600 mr-3 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-yellow-800">
                                💡 How this works
                            </h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                This shows items you've used or consumed from your inventory in the selected time period.
                                Select items to quickly add them back to a shopping list.
                            </p>
                        </div>
                    </div>
                </div>

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}