// file: src/components/shopping/AddToShoppingListModal.js v1

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function AddToShoppingListModal({
                                                   isOpen,
                                                   onClose,
                                                   item,
                                                   onAddToNew,
                                                   onAddToExisting
                                               }) {
    const [selectedOption, setSelectedOption] = useState('new');
    const [newListName, setNewListName] = useState('');
    const [selectedExistingList, setSelectedExistingList] = useState('');
    const [savedLists, setSavedLists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Load saved lists when modal opens
    useEffect(() => {
        if (isOpen) {
            loadSavedLists();
            // Auto-generate a list name based on item
            setNewListName(item ? `Shopping List with ${item.name}` : 'New Shopping List');
        }
    }, [isOpen, item]);

    const loadSavedLists = async () => {
        try {
            const response = await fetch('/api/shopping/saved?includeArchived=false&limit=20');
            const result = await response.json();

            if (result.success) {
                // Filter for custom and recipe lists that can accept new items
                const editableLists = result.lists.filter(list =>
                    ['custom', 'recipes', 'recipe'].includes(list.listType)
                );
                setSavedLists(editableLists);

                // Pre-select the first available list
                if (editableLists.length > 0) {
                    setSelectedExistingList(editableLists[0].id);
                }
            }
        } catch (error) {
            console.error('Error loading saved lists:', error);
            setError('Failed to load saved lists');
        }
    };

    const handleSubmit = async () => {
        if (!item) return;

        setLoading(true);
        setError('');

        try {
            if (selectedOption === 'new') {
                if (!newListName.trim()) {
                    setError('Please enter a name for the new list');
                    setLoading(false);
                    return;
                }

                await onAddToNew({
                    item,
                    listName: newListName.trim()
                });
            } else {
                if (!selectedExistingList) {
                    setError('Please select an existing list');
                    setLoading(false);
                    return;
                }

                await onAddToExisting({
                    item,
                    listId: selectedExistingList
                });
            }

            onClose();
        } catch (error) {
            setError(error.message || 'Failed to add item to shopping list');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <h2 className="text-xl font-semibold text-gray-900">
                        🛒 Add to Shopping List
                    </h2>
                    {item && (
                        <p className="text-sm text-gray-600 mt-1">
                            Adding: <strong>{item.name}</strong>
                            {item.brand && <span> ({item.brand})</span>}
                        </p>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Option Selection */}
                    <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700 mb-3">
                            Choose an option:
                        </div>

                        {/* New List Option */}
                        <div
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                                selectedOption === 'new'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedOption('new')}
                        >
                            <div className="flex items-start space-x-3">
                                <input
                                    type="radio"
                                    checked={selectedOption === 'new'}
                                    onChange={() => setSelectedOption('new')}
                                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                        📝 Create New Shopping List
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        Start a fresh shopping list with this item
                                    </div>

                                    {selectedOption === 'new' && (
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
                                            <div className="text-xs text-gray-500 mt-1">
                                                {newListName.length}/50 characters
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Existing List Option */}
                        <div
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                                selectedOption === 'existing'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedOption('existing')}
                        >
                            <div className="flex items-start space-x-3">
                                <input
                                    type="radio"
                                    checked={selectedOption === 'existing'}
                                    onChange={() => setSelectedOption('existing')}
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

                                    {selectedOption === 'existing' && (
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
                                                        <option value="">Choose a list...</option>
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

                    {/* Item Details Preview */}
                    {item && (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="text-sm font-medium text-gray-700 mb-2">
                                📦 Item to Add:
                            </div>
                            <div className="space-y-1">
                                <div className="font-medium text-gray-900">
                                    {item.name}
                                    {item.brand && <span className="text-gray-600"> ({item.brand})</span>}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Category: {item.category || 'Uncategorized'}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Current stock: {item.quantity} {item.unit}
                                    {item.secondaryQuantity && (
                                        <span> ({item.secondaryQuantity} {item.secondaryUnit})</span>
                                    )}
                                </div>
                                {item.location && (
                                    <div className="text-sm text-gray-600">
                                        Location: {item.location}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex space-x-3 flex-shrink-0">
                    <TouchEnhancedButton
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 text-center font-medium"
                    >
                        Cancel
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={handleSubmit}
                        disabled={loading || (selectedOption === 'existing' && savedLists.length === 0)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-center font-medium"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Adding...</span>
                            </div>
                        ) : (
                            `🛒 Add to ${selectedOption === 'new' ? 'New' : 'Existing'} List`
                        )}
                    </TouchEnhancedButton>
                </div>
            </div>
        </div>
    );
}