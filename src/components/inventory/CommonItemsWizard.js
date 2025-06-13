// file: /src/components/inventory/CommonItemsWizard.js - v5 (Fixed dual unit validation and smart defaults)

'use client';

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { COMMON_ITEMS } from '@/lib/commonItems';

export default function CommonItemsWizard({ isOpen, onClose, onComplete }) {
    const [selectedItems, setSelectedItems] = useState(new Map());
    const [currentStep, setCurrentStep] = useState('welcome'); // 'welcome', 'categories', 'review', 'adding'
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Handle item selection toggle - UPDATED: Better dual unit support with smart defaults
    const toggleItem = (categoryKey, itemIndex, item) => {
        const itemId = `${categoryKey}-${itemIndex}`;
        const newSelectedItems = new Map(selectedItems);

        if (newSelectedItems.has(itemId)) {
            newSelectedItems.delete(itemId);
        } else {
            newSelectedItems.set(itemId, {
                ...item,
                categoryKey,
                quantity: item.defaultQuantity,
                // FIXED: Secondary quantity defaults to 0, not the default value
                secondaryQuantity: 0,
            });
        }

        setSelectedItems(newSelectedItems);
    };

    // FIXED: Handle quantity change with flexible validation - allows 0 in either field
    const updateQuantity = (itemId, value, isSecondary = false) => {
        if (!selectedItems.has(itemId)) return;

        const newSelectedItems = new Map(selectedItems);
        const item = newSelectedItems.get(itemId);

        // Allow any numeric value including 0, but not negative
        const updateKey = isSecondary ? 'secondaryQuantity' : 'quantity';
        const numValue = value === '' ? 0 : parseFloat(value);

        // Prevent negative values, but allow 0
        const finalValue = isNaN(numValue) || numValue < 0 ? 0 : numValue;

        newSelectedItems.set(itemId, {
            ...item,
            [updateKey]: finalValue
        });
        setSelectedItems(newSelectedItems);
    };

    // FIXED: Handle quantity blur with better validation - allows 0 values
    const handleQuantityBlur = (itemId, isSecondary = false) => {
        if (!selectedItems.has(itemId)) return;

        const newSelectedItems = new Map(selectedItems);
        const item = newSelectedItems.get(itemId);
        const updateKey = isSecondary ? 'secondaryQuantity' : 'quantity';
        let currentValue = item[updateKey];

        // Convert empty string or invalid values to 0
        if (currentValue === '' || currentValue === null || currentValue === undefined) {
            currentValue = 0;
        } else {
            const numValue = parseFloat(currentValue);
            if (isNaN(numValue) || numValue < 0) {
                currentValue = 0;
            } else {
                currentValue = numValue;
            }
        }

        newSelectedItems.set(itemId, {
            ...item,
            [updateKey]: currentValue
        });
        setSelectedItems(newSelectedItems);
    };

    // FIXED: Handle input focus to select all text
    const handleQuantityFocus = (event) => {
        // Select all text when focusing to make it easier to replace
        event.target.select();
    };

    // Select all items in a category
    const selectAllInCategory = (categoryKey) => {
        const category = COMMON_ITEMS[categoryKey];
        if (!category) return;

        const newSelectedItems = new Map(selectedItems);
        category.items.forEach((item, index) => {
            const itemId = `${categoryKey}-${index}`;
            newSelectedItems.set(itemId, {
                ...item,
                categoryKey,
                quantity: item.defaultQuantity,
                secondaryQuantity: 0, // FIXED: Default to 0
            });
        });
        setSelectedItems(newSelectedItems);
    };

    // Deselect all items in a category
    const deselectAllInCategory = (categoryKey) => {
        const newSelectedItems = new Map(selectedItems);
        const category = COMMON_ITEMS[categoryKey];
        if (!category) return;

        category.items.forEach((item, index) => {
            const itemId = `${categoryKey}-${index}`;
            newSelectedItems.delete(itemId);
        });
        setSelectedItems(newSelectedItems);
    };

    // Check if all items in category are selected
    const isAllSelectedInCategory = (categoryKey) => {
        const category = COMMON_ITEMS[categoryKey];
        if (!category) return false;

        return category.items.every((item, index) => {
            const itemId = `${categoryKey}-${index}`;
            return selectedItems.has(itemId);
        });
    };

    // Get selected count for category
    const getSelectedCountInCategory = (categoryKey) => {
        const category = COMMON_ITEMS[categoryKey];
        if (!category) return 0;

        return category.items.filter((item, index) => {
            const itemId = `${categoryKey}-${index}`;
            return selectedItems.has(itemId);
        }).length;
    };

    // FIXED: Better validation - at least one quantity must be > 0
    const validateItem = (item) => {
        const primaryQty = parseFloat(item.quantity) || 0;
        const secondaryQty = parseFloat(item.secondaryQuantity) || 0;

        // At least one quantity must be greater than 0
        return primaryQty > 0 || secondaryQty > 0;
    };

    // FIXED: Submit with better validation
    const handleSubmit = async () => {
        if (selectedItems.size === 0) {
            alert('Please select at least one item to add to your inventory.');
            return;
        }

        // Validate items - at least one quantity field must be > 0
        const invalidItems = [];
        const validatedItems = new Map();

        selectedItems.forEach((item, itemId) => {
            if (!validateItem(item)) {
                invalidItems.push(item.name);
                return;
            }

            // Clean up the quantities
            const primaryQty = parseFloat(item.quantity) || 0;
            const secondaryQty = parseFloat(item.secondaryQuantity) || 0;

            validatedItems.set(itemId, {
                ...item,
                quantity: primaryQty,
                // FIXED: Only include secondary quantity if > 0
                secondaryQuantity: secondaryQty > 0 ? secondaryQty : null,
                secondaryUnit: secondaryQty > 0 ? item.secondaryUnit : null
            });
        });

        if (invalidItems.length > 0) {
            alert(`Please set a quantity for: ${invalidItems.join(', ')}\n\nAt least one quantity field must be greater than 0.`);
            return;
        }

        // Update state with validated quantities
        setSelectedItems(validatedItems);

        setIsSubmitting(true);
        setCurrentStep('adding');

        try {
            const itemsToAdd = Array.from(validatedItems.values());

            const response = await fetch('/api/inventory/bulk-add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: itemsToAdd,
                    source: 'Common Items Wizard'
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Success!
                onComplete({
                    success: true,
                    itemsAdded: data.itemsAdded,
                    summary: data.summary
                });
                onClose();
            } else {
                throw new Error(data.error || 'Failed to add items');
            }
        } catch (error) {
            console.error('Error adding items:', error);
            alert('Error adding items: ' + error.message);
            setCurrentStep('review'); // Go back to review step
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset wizard
    const resetWizard = () => {
        setSelectedItems(new Map());
        setCurrentStep('welcome');
        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative flex items-center justify-center min-h-screen p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">

                    {/* Header */}
                    <div className="bg-indigo-600 text-white p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">🏠 Common Items Wizard</h2>
                                <p className="text-indigo-100 text-sm mt-1">
                                    {currentStep === 'welcome' && 'Quickly populate your inventory with household staples'}
                                    {currentStep === 'categories' && `Select items to add • ${selectedItems.size} selected`}
                                    {currentStep === 'review' && `Review your selections • ${selectedItems.size} items`}
                                    {currentStep === 'adding' && 'Adding items to your inventory...'}
                                </p>
                            </div>
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="text-white hover:text-indigo-200 p-2 rounded-lg"
                                disabled={isSubmitting}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>

                        {/* Welcome Step */}
                        {currentStep === 'welcome' && (
                            <div className="text-center space-y-6">
                                <div className="text-6xl">🏠</div>
                                <div>
                                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                                        Welcome to the Common Items Wizard!
                                    </h3>
                                    <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                                        This wizard will help you quickly populate your inventory with common household items.
                                        You can select items by category and adjust quantities as needed. After the items are entered into inventory, you can edit them to change information, add brand names, expiration dates, and more.
                                    </p>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                                        <div className="text-blue-800">
                                            <div className="font-medium mb-2">✨ What you'll get:</div>
                                            <ul className="text-sm space-y-1 text-left">
                                                <li>• Pre-organized categories of common items</li>
                                                <li>• Flexible quantity tracking (by weight, count, or both)</li>
                                                <li>• Proper storage locations (pantry, fridge, freezer)</li>
                                                <li>• Instant inventory population</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-center gap-4">
                                    <TouchEnhancedButton
                                        onClick={onClose}
                                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                    >
                                        Maybe Later
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        onClick={() => setCurrentStep('categories')}
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                        Get Started
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        )}

                        {/* Categories Step */}
                        {currentStep === 'categories' && (
                            <div className="space-y-6">
                                {/* Helpful reminder at the top of categories step */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="text-blue-600 text-lg">💡</div>
                                        <div className="text-blue-800 text-sm">
                                            <div className="font-medium mb-1">Quick Setup Tip:</div>
                                            <div>Don't worry about getting everything perfect - you can edit items later to add brands, expiration dates, and adjust quantities once they're in your inventory.</div>
                                        </div>
                                    </div>
                                </div>
                                {Object.entries(COMMON_ITEMS).map(([categoryKey, category]) => {
                                    const selectedCount = getSelectedCountInCategory(categoryKey);
                                    const totalCount = category.items.length;
                                    const allSelected = isAllSelectedInCategory(categoryKey);

                                    return (
                                        <div key={categoryKey} className="border border-gray-200 rounded-lg overflow-hidden">
                                            {/* Category Header */}
                                            <div className="bg-gray-50 p-4 border-b border-gray-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-2xl">{category.icon}</span>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">{category.name}</h4>
                                                            <p className="text-sm text-gray-600">
                                                                {selectedCount} of {totalCount} selected
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <TouchEnhancedButton
                                                        onClick={() => allSelected ? deselectAllInCategory(categoryKey) : selectAllInCategory(categoryKey)}
                                                        className={`px-4 py-2 text-sm rounded-lg ${
                                                            allSelected
                                                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                                        }`}
                                                    >
                                                        {allSelected ? 'Deselect All' : 'Select All'}
                                                    </TouchEnhancedButton>
                                                </div>
                                            </div>

                                            {/* Category Items */}
                                            <div className="p-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {category.items.map((item, index) => {
                                                        const itemId = `${categoryKey}-${index}`;
                                                        const isSelected = selectedItems.has(itemId);
                                                        const currentItem = selectedItems.get(itemId);
                                                        const hasDualUnits = !!(item.secondaryUnit && item.defaultSecondaryQuantity);

                                                        return (
                                                            <div
                                                                key={itemId}
                                                                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                                                                    isSelected
                                                                        ? 'border-indigo-500 bg-indigo-50'
                                                                        : 'border-gray-200 hover:border-gray-300'
                                                                }`}
                                                                onClick={() => toggleItem(categoryKey, index, item)}
                                                            >
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center space-x-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                onChange={() => toggleItem(categoryKey, index, item)}
                                                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            />
                                                                            <span className="text-sm font-medium text-gray-900 truncate">
                                                                                {item.name}
                                                                            </span>
                                                                        </div>
                                                                        <div className="mt-1 text-xs text-gray-500">
                                                                            {item.category} • {item.location}
                                                                            {hasDualUnits && (
                                                                                <span className="ml-1 text-blue-600">• flexible units</span>
                                                                            )}
                                                                        </div>

                                                                        {/* FIXED: Improved dual unit input display */}
                                                                        {isSelected && (
                                                                            <div className="mt-2 space-y-2">
                                                                                {/* Primary quantity input */}
                                                                                <div className="flex items-center space-x-2">
                                                                                    <span className="text-xs text-gray-600 w-12">Primary:</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        step="0.01"
                                                                                        value={currentItem?.quantity || ''}
                                                                                        onChange={(e) => updateQuantity(itemId, e.target.value, false)}
                                                                                        onBlur={() => handleQuantityBlur(itemId, false)}
                                                                                        onFocus={handleQuantityFocus}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                                                                        placeholder="0"
                                                                                    />
                                                                                    <span className="text-xs text-gray-500 flex-1">{item.unit}</span>
                                                                                </div>

                                                                                {/* FIXED: Secondary quantity input - always available */}
                                                                                {item.secondaryUnit && (
                                                                                    <div className="flex items-center space-x-2">
                                                                                        <span className="text-xs text-gray-600 w-12">Secondary:</span>
                                                                                        <input
                                                                                            type="number"
                                                                                            min="0"
                                                                                            step="0.01"
                                                                                            value={currentItem?.secondaryQuantity || ''}
                                                                                            onChange={(e) => updateQuantity(itemId, e.target.value, true)}
                                                                                            onBlur={() => handleQuantityBlur(itemId, true)}
                                                                                            onFocus={handleQuantityFocus}
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                                                                            placeholder="0"
                                                                                        />
                                                                                        <span className="text-xs text-gray-500 flex-1">{item.secondaryUnit || 'unit'}</span>
                                                                                    </div>
                                                                                )}

                                                                                {/* FIXED: Helper text - only show for dual unit items */}
                                                                                {item.secondaryUnit && (
                                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                                        At least one quantity must be &gt; 0
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Categories Step Actions */}
                                <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                                    <TouchEnhancedButton
                                        onClick={() => setCurrentStep('welcome')}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                    >
                                        ← Back
                                    </TouchEnhancedButton>

                                    <div className="text-sm text-gray-600">
                                        {selectedItems.size} items selected
                                    </div>

                                    <TouchEnhancedButton
                                        onClick={() => setCurrentStep('review')}
                                        disabled={selectedItems.size === 0}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
                                    >
                                        Review → ({selectedItems.size})
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        )}

                        {/* Review Step */}
                        {currentStep === 'review' && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                        Review Your Selections
                                    </h3>
                                    <p className="text-gray-600">
                                        You've selected {selectedItems.size} items to add to your inventory.
                                    </p>
                                </div>

                                {/* Summary by Category */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 mb-3">Summary by Category</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {Object.entries(COMMON_ITEMS).map(([categoryKey, category]) => {
                                            const selectedCount = getSelectedCountInCategory(categoryKey);
                                            if (selectedCount === 0) return null;

                                            return (
                                                <div key={categoryKey} className="text-center">
                                                    <div className="text-2xl mb-1">{category.icon}</div>
                                                    <div className="text-sm font-medium text-gray-900">{selectedCount}</div>
                                                    <div className="text-xs text-gray-600">{category.name.replace(/🔸|🥫|🥛|🥕|🧊|🌶️|🍯|🥤/g, '').trim()}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Selected Items List */}
                                <div className="space-y-4">
                                    <h4 className="font-medium text-gray-900">Selected Items</h4>
                                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                                        {Array.from(selectedItems.entries()).map(([itemId, item]) => {
                                            const primaryQty = parseFloat(item.quantity) || 0;
                                            const secondaryQty = parseFloat(item.secondaryQuantity) || 0;

                                            return (
                                                <div key={itemId} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">{item.name}</div>
                                                        <div className="text-sm text-gray-600">
                                                            {item.category} • {item.location}
                                                        </div>
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {/* FIXED: Smart display of quantities */}
                                                        {primaryQty > 0 && (
                                                            <div>{primaryQty} {item.unit}</div>
                                                        )}
                                                        {secondaryQty > 0 && (
                                                            <div className="text-xs text-gray-600">
                                                                ({secondaryQty} {item.secondaryUnit})
                                                            </div>
                                                        )}
                                                    </div>
                                                    <TouchEnhancedButton
                                                        onClick={() => {
                                                            const newSelectedItems = new Map(selectedItems);
                                                            newSelectedItems.delete(itemId);
                                                            setSelectedItems(newSelectedItems);
                                                        }}
                                                        className="ml-3 text-red-600 hover:text-red-800"
                                                    >
                                                        ✕
                                                    </TouchEnhancedButton>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Review Actions */}
                                <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                                    <TouchEnhancedButton
                                        onClick={() => setCurrentStep('categories')}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                    >
                                        ← Back to Edit
                                    </TouchEnhancedButton>

                                    <div className="flex space-x-3">
                                        <TouchEnhancedButton
                                            onClick={resetWizard}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                        >
                                            Start Over
                                        </TouchEnhancedButton>
                                        <TouchEnhancedButton
                                            onClick={handleSubmit}
                                            disabled={selectedItems.size === 0}
                                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                                        >
                                            Add {selectedItems.size} Items to Inventory
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Adding Step */}
                        {currentStep === 'adding' && (
                            <div className="text-center space-y-6 py-12">
                                <div className="text-6xl">📦</div>
                                <div>
                                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                                        Adding Items to Your Inventory
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Please wait while we add {selectedItems.size} items to your inventory...
                                    </p>

                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                        <span className="ml-3 text-indigo-600">Processing...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer - Progress Indicator */}
                    {currentStep !== 'adding' && (
                        <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex space-x-2">
                                    {['welcome', 'categories', 'review'].map((step, index) => (
                                        <div
                                            key={step}
                                            className={`w-3 h-3 rounded-full ${
                                                step === currentStep
                                                    ? 'bg-indigo-600'
                                                    : index < ['welcome', 'categories', 'review'].indexOf(currentStep)
                                                        ? 'bg-green-500'
                                                        : 'bg-gray-300'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <div className="text-sm text-gray-500">
                                    Step {['welcome', 'categories', 'review'].indexOf(currentStep) + 1} of 3
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}