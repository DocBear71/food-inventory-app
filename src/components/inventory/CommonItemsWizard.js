'use client';

// file: /src/components/inventory/CommonItemsWizard.js v6 - Added subscription gate for Gold+ users only

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { COMMON_ITEMS } from '@/lib/commonItems';
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { apiPost } from '@/lib/api-config';

export default function CommonItemsWizard({ isOpen, onClose, onComplete }) {
    const [selectedItems, setSelectedItems] = useState(new Map());
    const [currentStep, setCurrentStep] = useState('welcome'); // 'welcome', 'categories', 'review', 'adding'
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Subscription hooks
    const subscription = useSubscription();
    const commonItemsGate = useFeatureGate(FEATURE_GATES.COMMON_ITEMS_WIZARD);

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
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showAlert({
                title: 'No Items Selected',
                message: 'Please select at least one item to add to your inventory.'
            });
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
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showAlert({
                title: 'Invalid Quantities',
                message: `Please set a quantity for: ${invalidItems.join(', ')}\n\nAt least one quantity field must be greater than 0.`
            });
            return;
        }

        // Update state with validated quantities
        setSelectedItems(validatedItems);

        setIsSubmitting(true);
        setCurrentStep('adding');

        try {
            const itemsToAdd = Array.from(validatedItems.values());

            const response = await apiPost('/api/inventory/bulk-add', {
                items: itemsToAdd,
                source: 'Common Items Wizard'
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
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Add Failed',
                    message: data.error || 'Failed to add items'
                });
                return;
            }
        } catch (error) {
            console.error('Error adding items:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Add Error',
                message: 'Error adding items: ' + error.message
            });
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

    // Wrap the entire wizard with subscription gate
    return (
        <FeatureGate
            feature={FEATURE_GATES.COMMON_ITEMS_WIZARD}
            fallback={
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

                    {/* Upgrade Modal */}
                    <div className="relative flex items-center justify-center min-h-screen p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6 rounded-t-lg">
                                <div className="text-center">
                                    <div className="text-4xl mb-2">🏠✨</div>
                                    <h2 className="text-xl font-bold">Common Items Wizard</h2>
                                    <p className="text-yellow-100 text-sm mt-1">Premium Feature</p>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="text-center mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                        Upgrade to Gold for Quick Setup
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        The Common Items Wizard helps you quickly populate your inventory with household staples. This feature is available with Gold and Platinum subscriptions.
                                    </p>

                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                        <div className="text-yellow-800 text-sm">
                                            <div className="font-medium mb-2">✨ What you get with Gold:</div>
                                            <ul className="text-left space-y-1">
                                                <li>• Common Items Wizard</li>
                                                <li>• Up to 250 inventory items</li>
                                                <li>• Unlimited UPC scanning</li>
                                                <li>• Meal planning tools</li>
                                                <li>• Email notifications</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <TouchEnhancedButton
                                        onClick={() => window.location.href = '/pricing?source=common-items-wizard'}
                                        className="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-yellow-700"
                                    >
                                        Upgrade to Gold - $4.99/month
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        onClick={onClose}
                                        className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg"
                                    >
                                        Maybe Later
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            {/* Main Wizard Content - Only shown if user has access */}
            <div className="fixed inset-0 z-50 overflow-hidden">
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

                {/* Main Modal */}
                <div className="relative flex items-center justify-center min-h-screen p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                        {currentStep === 'welcome' && (
                            <div className="p-8 text-center">
                                <div className="text-6xl mb-4">🏠</div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Common Items Wizard</h2>
                                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                    Quickly add common household items to your inventory. Select from organized categories
                                    of pantry staples, kitchen essentials, and everyday items.
                                </p>
                                <div className="space-y-3">
                                    <TouchEnhancedButton
                                        onClick={() => setCurrentStep('categories')}
                                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700"
                                    >
                                        Start Adding Items
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        onClick={onClose}
                                        className="w-full bg-gray-300 text-gray-700 py-2 px-6 rounded-lg"
                                    >
                                        Cancel
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        )}

                        {currentStep === 'categories' && (
                            <div className="flex flex-col h-full max-h-[90vh]">
                                {/* Header */}
                                <div className="p-6 border-b bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-bold text-gray-900">Select Common Items</h2>
                                        <div className="flex items-center space-x-3">
                                            <span className="text-sm text-gray-600">
                                                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                                            </span>
                                            <TouchEnhancedButton
                                                onClick={() => setCurrentStep('review')}
                                                disabled={selectedItems.size === 0}
                                                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
                                            >
                                                Review & Add
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>
                                </div>

                                {/* Categories Content */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="space-y-6">
                                        {Object.entries(COMMON_ITEMS).map(([categoryKey, category]) => {
                                            const selectedCount = getSelectedCountInCategory(categoryKey);
                                            const totalItems = category.items.length;
                                            const allSelected = isAllSelectedInCategory(categoryKey);

                                            return (
                                                <div key={categoryKey} className="bg-white border rounded-lg">
                                                    <div className="p-4 border-b bg-gray-50">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-3">
                                                                <span className="text-2xl">{category.icon}</span>
                                                                <div>
                                                                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                                                                    <p className="text-sm text-gray-600">{category.description}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-sm text-gray-600">
                                                                    {selectedCount}/{totalItems} selected
                                                                </span>
                                                                <TouchEnhancedButton
                                                                    onClick={() => allSelected ? deselectAllInCategory(categoryKey) : selectAllInCategory(categoryKey)}
                                                                    className={`px-3 py-1 rounded text-sm font-medium ${
                                                                        allSelected
                                                                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                                    }`}
                                                                >
                                                                    {allSelected ? 'Deselect All' : 'Select All'}
                                                                </TouchEnhancedButton>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {category.items.map((item, index) => {
                                                                const itemId = `${categoryKey}-${index}`;
                                                                const isSelected = selectedItems.has(itemId);
                                                                const selectedItem = selectedItems.get(itemId);

                                                                return (
                                                                    <div
                                                                        key={index}
                                                                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                                                                            isSelected
                                                                                ? 'border-blue-500 bg-blue-50'
                                                                                : 'border-gray-200 hover:border-gray-300'
                                                                        }`}
                                                                        onClick={() => toggleItem(categoryKey, index, item)}
                                                                    >
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                                                                isSelected
                                                                                    ? 'border-blue-500 bg-blue-500'
                                                                                    : 'border-gray-300'
                                                                            }`}>
                                                                                {isSelected && (
                                                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                                    </svg>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="text-sm text-gray-600">
                                                                            Default: {item.defaultQuantity} {item.unit}
                                                                            {item.secondaryUnit && (
                                                                                <span className="text-gray-400"> • {item.secondaryUnit} option</span>
                                                                            )}
                                                                        </div>

                                                                        {isSelected && (
                                                                            <div className="mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                                                                                <div className="space-y-2">
                                                                                    <div>
                                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                                            Quantity ({item.unit})
                                                                                        </label>
                                                                                        <input
                                                                                            type="number"
                                                                                            min="0"
                                                                                            step="0.01"
                                                                                            value={selectedItem?.quantity || ''}
                                                                                            onChange={(e) => updateQuantity(itemId, e.target.value)}
                                                                                            onBlur={() => handleQuantityBlur(itemId)}
                                                                                            onFocus={handleQuantityFocus}
                                                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                                                                                            placeholder="0"
                                                                                        />
                                                                                    </div>

                                                                                    {item.secondaryUnit && (
                                                                                        <div>
                                                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                                                {item.secondaryUnit} (optional)
                                                                                            </label>
                                                                                            <input
                                                                                                type="number"
                                                                                                min="0"
                                                                                                step="1"
                                                                                                value={selectedItem?.secondaryQuantity || ''}
                                                                                                onChange={(e) => updateQuantity(itemId, e.target.value, true)}
                                                                                                onBlur={() => handleQuantityBlur(itemId, true)}
                                                                                                onFocus={handleQuantityFocus}
                                                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                                                                                                placeholder="0"
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-6 border-t bg-gray-50">
                                    <div className="flex justify-between items-center">
                                        <TouchEnhancedButton
                                            onClick={onClose}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                                        >
                                            Cancel
                                        </TouchEnhancedButton>
                                        <TouchEnhancedButton
                                            onClick={() => setCurrentStep('review')}
                                            disabled={selectedItems.size === 0}
                                            className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
                                        >
                                            Review {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 'review' && (
                            <div className="flex flex-col h-full max-h-[90vh]">
                                {/* Header */}
                                <div className="p-6 border-b bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-bold text-gray-900">Review Your Selection</h2>
                                        <div className="flex items-center space-x-3">
                                            <TouchEnhancedButton
                                                onClick={() => setCurrentStep('categories')}
                                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                                            >
                                                Back to Selection
                                            </TouchEnhancedButton>
                                            <TouchEnhancedButton
                                                onClick={handleSubmit}
                                                disabled={selectedItems.size === 0}
                                                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
                                            >
                                                Add to Inventory
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>
                                </div>

                                {/* Review Content */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    {selectedItems.size === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="text-gray-400 text-6xl mb-4">📝</div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No items selected</h3>
                                            <p className="text-gray-600 mb-4">Go back and select some items to add to your inventory.</p>
                                            <TouchEnhancedButton
                                                onClick={() => setCurrentStep('categories')}
                                                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
                                            >
                                                Select Items
                                            </TouchEnhancedButton>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="text-sm text-gray-600 mb-4">
                                                Review the {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} you've selected before adding them to your inventory.
                                            </div>

                                            {Array.from(selectedItems.values()).map((item, index) => {
                                                const itemId = `${item.categoryKey}-${index}`;
                                                const category = COMMON_ITEMS[item.categoryKey];

                                                return (
                                                    <div key={itemId} className="bg-white border rounded-lg p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-3">
                                                                <span className="text-xl">{category?.icon}</span>
                                                                <div>
                                                                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                                                                    <p className="text-sm text-gray-600">{category?.name}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-medium text-gray-900">
                                                                    {parseFloat(item.quantity) || 0} {item.unit}
                                                                </div>
                                                                {item.secondaryQuantity > 0 && (
                                                                    <div className="text-sm text-gray-600">
                                                                        + {item.secondaryQuantity} {item.secondaryUnit}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-6 border-t bg-gray-50">
                                    <div className="flex justify-between items-center">
                                        <TouchEnhancedButton
                                            onClick={onClose}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                                        >
                                            Cancel
                                        </TouchEnhancedButton>
                                        <div className="flex space-x-3">
                                            <TouchEnhancedButton
                                                onClick={() => setCurrentStep('categories')}
                                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                                            >
                                                Back to Selection
                                            </TouchEnhancedButton>
                                            <TouchEnhancedButton
                                                onClick={handleSubmit}
                                                disabled={selectedItems.size === 0}
                                                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
                                            >
                                                Add {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''} to Inventory
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 'adding' && (
                            <div className="p-12 text-center">
                                <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Adding Items to Inventory</h3>
                                <p className="text-gray-600">Please wait while we add your selected items...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </FeatureGate>
    );
}