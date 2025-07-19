// file: /src/components/shopping/UpdatedShoppingListWithBudget.js
'use client';

import React, { useState, useEffect } from 'react';
import { BudgetTracker } from '@/components/shopping/BudgetTracker';
import { SmartBudgetSuggestions } from '@/components/shopping/SmartBudgetSuggestions';
import { BudgetNotifications } from '@/components/shopping/BudgetNotifications';
import ShoppingListTotals from '@/components/shopping/ShoppingListTotals'; // Use existing component
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';

export function UpdatedShoppingListWithBudget({ initialItems = [], onItemsChange }) {
    const [items, setItems] = useState(initialItems);
    const [budget, setBudget] = useState(0);
    const [budgetSettings, setBudgetSettings] = useState({
        warningThreshold: 0.8,
        enabled: true,
        categories: {}
    });
    const [alerts, setAlerts] = useState([]);
    const [showBudgetTracker, setShowBudgetTracker] = useState(false);
    const [showTotals, setShowTotals] = useState(false);

    useEffect(() => {
        loadBudgetSettings();
    }, []);

    useEffect(() => {
        onItemsChange?.(items);
        checkBudgetAlerts();
    }, [items, budget, budgetSettings, onItemsChange]);

    const loadBudgetSettings = async () => {
        try {
            const response = await fetch('/api/shopping/budget-settings');
            if (response.ok) {
                const data = await response.json();
                if (data.settings) {
                    setBudget(data.settings.budget || 0);
                    setBudgetSettings(data.settings.settings || budgetSettings);
                }
            }
        } catch (error) {
            console.error('Error loading budget settings:', error);
        }
    };

    const checkBudgetAlerts = () => {
        if (!budgetSettings.enabled || budget <= 0) {
            setAlerts([]);
            return;
        }

        const currentTotal = getTotalCost();
        const percentage = (currentTotal / budget) * 100;
        const newAlerts = [];

        if (percentage >= 100) {
            newAlerts.push({
                id: 'over_budget',
                type: 'over_budget',
                message: `You're $${(currentTotal - budget).toFixed(2)} over budget!`,
                severity: 'high',
                action: 'Review and remove items'
            });
        } else if (percentage >= budgetSettings.warningThreshold * 100) {
            newAlerts.push({
                id: 'approaching_budget',
                type: 'approaching_budget',
                message: `You're at ${percentage.toFixed(0)}% of your budget`,
                severity: 'medium',
                action: 'Consider removing non-essential items'
            });
        }

        setAlerts(newAlerts);

        if (newAlerts.length > 0 && newAlerts.some(alert => alert.severity === 'high')) {
            MobileHaptics?.error();
        }
    };

    const updateItemQuantity = (itemId, newQuantity) => {
        setItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, quantity: Math.max(0, newQuantity) }
                : item
        ));
        MobileHaptics?.light();
    };

    const updateItemPrice = (itemId, newPrice) => {
        setItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, estimatedPrice: Math.max(0, newPrice) }
                : item
        ));
    };

    const toggleItemChecked = (itemId) => {
        setItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, checked: !item.checked }
                : item
        ));
        MobileHaptics?.light();
    };

    const removeItem = (itemId) => {
        setItems(prev => prev.filter(item => item.id !== itemId));
        MobileHaptics?.medium();
    };

    const addItem = (newItem) => {
        const item = {
            id: Date.now().toString(),
            name: newItem.name,
            quantity: newItem.quantity || 1,
            estimatedPrice: newItem.estimatedPrice || 0,
            category: newItem.category || 'Other',
            checked: false,
            ...newItem
        };
        setItems(prev => [...prev, item]);
        MobileHaptics?.light();
    };

    const applySuggestion = (suggestion) => {
        switch (suggestion.action.type) {
            case 'remove':
                setItems(prev => prev.filter(item => !suggestion.action.items.includes(item.id)));
                break;
            case 'reduce_quantity':
                setItems(prev => prev.map(item =>
                    suggestion.action.items.includes(item.id)
                        ? { ...item, quantity: Math.max(1, Math.floor(item.quantity / 2)) }
                        : item
                ));
                break;
            case 'switch_brand':
                setItems(prev => prev.map(item =>
                    suggestion.action.items.includes(item.id)
                        ? { ...item, brand: 'Store Brand', estimatedPrice: item.estimatedPrice * 0.7 }
                        : item
                ));
                break;
        }
        MobileHaptics?.success();
    };

    const handleBudgetUpdate = (budgetData) => {
        setBudget(budgetData.budget);
        setBudgetSettings(budgetData.settings);
    };

    const getTotalCost = () => {
        return items.reduce((total, item) => total + ((item.estimatedPrice || 0) * (item.quantity || 1)), 0);
    };

    const groupItemsByCategory = () => {
        return items.reduce((groups, item) => {
            const category = item.category || 'Other';
            if (!groups[category]) groups[category] = [];
            groups[category].push(item);
            return groups;
        }, {});
    };

    const [newItemName, setNewItemName] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    const handleAddItem = (e) => {
        e.preventDefault();
        if (newItemName.trim()) {
            addItem({
                name: newItemName.trim(),
                quantity: 1,
                estimatedPrice: 0,
                category: 'Other'
            });
            setNewItemName('');
            setShowAddForm(false);
        }
    };

    const groupedItems = groupItemsByCategory();
    const totalCost = getTotalCost();

    return (
        <div className="space-y-6">
            {/* Budget Notifications */}
            <BudgetNotifications
                alerts={alerts}
                onDismiss={(alertId) => setAlerts(prev => prev.filter(a => a.id !== alertId))}
            />

            {/* Header with Budget Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold text-gray-900">🛒 Shopping List</h2>
                    <div className="flex space-x-2">
                        <TouchEnhancedButton
                            onClick={() => setShowBudgetTracker(!showBudgetTracker)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                        >
                            <span>💰</span>
                            <span>{showBudgetTracker ? 'Hide Budget' : 'Budget'}</span>
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => setShowTotals(!showTotals)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                        >
                            <span>📊</span>
                            <span>{showTotals ? 'Hide Totals' : 'Totals'}</span>
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Quick Budget Summary */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Cost: ${totalCost.toFixed(2)}</span>
                    {budget > 0 && (
                        <span className={`font-medium ${totalCost > budget ? 'text-red-600' : 'text-green-600'}`}>
                            Budget: ${budget.toFixed(2)} ({totalCost > budget ? 'Over' : 'Under'} by ${Math.abs(budget - totalCost).toFixed(2)})
                        </span>
                    )}
                </div>
            </div>

            {/* Budget Tracker */}
            {showBudgetTracker && (
                <BudgetTracker
                    shoppingList={items}
                    onBudgetUpdate={handleBudgetUpdate}
                />
            )}

            {/* Shopping List Totals - Use existing component */}
            {showTotals && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <ShoppingListTotals
                        shoppingList={{
                            items: groupedItems,
                            summary: {
                                totalItems: items.length,
                                needToBuy: items.filter(item => !item.checked).length,
                                inInventory: 0,
                                purchased: items.filter(item => item.checked).length
                            }
                        }}
                        compact={false}
                        showBudgetTracker={false} // We handle this separately
                    />
                </div>
            )}

            {/* Smart Budget Suggestions */}
            {budget > 0 && totalCost > budget && (
                <SmartBudgetSuggestions
                    shoppingList={items}
                    budget={budget}
                    onApplySuggestion={applySuggestion}
                />
            )}

            {/* Add Item Form */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Add New Item</h3>
                    <TouchEnhancedButton
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        {showAddForm ? 'Cancel' : '+ Add Item'}
                    </TouchEnhancedButton>
                </div>

                {showAddForm && (
                    <form onSubmit={handleAddItem} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder="Item name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                            />
                        </div>
                        <div className="flex space-x-2">
                            <TouchEnhancedButton
                                type="submit"
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                            >
                                Add Item
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                            >
                                Cancel
                            </TouchEnhancedButton>
                        </div>
                    </form>
                )}
            </div>

            {/* Shopping List Items by Category */}
            <div className="space-y-4">
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <div key={category} className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                            <span>{category}</span>
                            <span className="text-sm text-gray-500">
                                ${categoryItems.reduce((sum, item) => sum + ((item.estimatedPrice || 0) * (item.quantity || 1)), 0).toFixed(2)}
                            </span>
                        </h3>

                        <div className="space-y-3">
                            {categoryItems.map((item) => (
                                <div
                                    key={item.id}
                                    className={`flex items-center space-x-3 p-3 rounded-lg border ${
                                        item.checked
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-white border-gray-200'
                                    }`}
                                >
                                    {/* Checkbox */}
                                    <TouchEnhancedButton
                                        onClick={() => toggleItemChecked(item.id)}
                                        className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                            item.checked
                                                ? 'bg-green-500 border-green-500 text-white'
                                                : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        {item.checked && <span className="text-sm">✓</span>}
                                    </TouchEnhancedButton>

                                    {/* Item Details */}
                                    <div className="flex-1">
                                        <div className={`font-medium ${item.checked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                            {item.name}
                                        </div>
                                        {item.brand && (
                                            <div className="text-sm text-gray-500">{item.brand}</div>
                                        )}
                                        {item.notes && (
                                            <div className="text-sm text-gray-500">{item.notes}</div>
                                        )}
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center space-x-2">
                                        <TouchEnhancedButton
                                            onClick={() => updateItemQuantity(item.id, (item.quantity || 1) - 1)}
                                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                        >
                                            -
                                        </TouchEnhancedButton>
                                        <span className="w-8 text-center">{item.quantity || 1}</span>
                                        <TouchEnhancedButton
                                            onClick={() => updateItemQuantity(item.id, (item.quantity || 1) + 1)}
                                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                        >
                                            +
                                        </TouchEnhancedButton>
                                    </div>

                                    {/* Price */}
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-500">$</span>
                                        <input
                                            type="number"
                                            value={item.estimatedPrice || 0}
                                            onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>

                                    {/* Remove Button */}
                                    <TouchEnhancedButton
                                        onClick={() => removeItem(item.id)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </TouchEnhancedButton>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary Footer */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-gray-900">
                        Total: ${totalCost.toFixed(2)}
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">
                            {items.filter(item => item.checked).length} of {items.length} items checked
                        </span>
                        <TouchEnhancedButton
                            onClick={() => setItems(prev => prev.map(item => ({ ...item, checked: false })))}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                            Clear All
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        </div>
    );
}