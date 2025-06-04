// file: /src/components/shopping/ShoppingListDisplay.js

'use client';

import { useState } from 'react';

export default function ShoppingListDisplay({ shoppingList, onClose }) {
    const [checkedItems, setCheckedItems] = useState(new Set());

    if (!shoppingList || !shoppingList.items) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">No shopping list data available</p>
            </div>
        );
    }

    const toggleItemCheck = (itemId) => {
        const newChecked = new Set(checkedItems);
        if (newChecked.has(itemId)) {
            newChecked.delete(itemId);
        } else {
            newChecked.add(itemId);
        }
        setCheckedItems(newChecked);
    };

    const exportToText = () => {
        let text = `🛒 Shopping List\n`;
        text += `Generated on ${new Date().toLocaleDateString()}\n\n`;

        text += `📋 Recipes (${shoppingList.recipes.length}):\n`;
        shoppingList.recipes.forEach(recipe => {
            text += `• ${recipe}\n`;
        });
        text += '\n';

        Object.entries(shoppingList.items).forEach(([category, items]) => {
            text += `${getCategoryIcon(category)} ${category} (${items.length} items)\n`;
            items.forEach(item => {
                const status = checkedItems.has(item.name) ? '☑' : '☐';
                text += `${status} ${item.name}\n`;
                if (item.haveAmount > 0) {
                    text += `   Have: ${item.haveAmount} ${item.unit} → Need: ${item.needAmount} more\n`;
                }
            });
            text += '\n';
        });

        text += `📊 Summary:\n`;
        text += `Total Items: ${shoppingList.summary.totalItems}\n`;
        text += `Already Have: ${shoppingList.summary.alreadyHave}\n`;
        text += `Need to Buy: ${shoppingList.summary.needToBuy}\n`;

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shopping-list-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const printList = () => {
        const printContent = document.getElementById('shopping-list-content').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Shopping List</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .category { font-weight: bold; margin-top: 20px; }
                        .item { margin-left: 20px; margin-bottom: 5px; }
                        .summary { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <h1>🛒 Shopping List</h1>
                    <p>Generated on ${new Date().toLocaleDateString()}</p>
                    ${printContent}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const getCategoryIcon = (category) => {
        const icons = {
            'Produce': '🥬',
            'Meat': '🥩',
            'Dairy': '🥛',
            'Grains': '🌾',
            'Pantry': '🏺',
            'Condiments': '🧂',
            'Frozen': '🧊',
            'Beverages': '🥤',
            'Other': '📦'
        };
        return icons[category] || '📦';
    };

    const hasItems = Object.keys(shoppingList.items).length > 0;

    return (
        <div className="bg-white">
            {/* Header with Actions */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">🛒 Your Shopping List</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={exportToText}
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                        💾 Export
                    </button>
                    <button
                        onClick={printList}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                        🖨️ Print
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                    >
                        ↻ New List
                    </button>
                </div>
            </div>

            <div id="shopping-list-content">
                {/* Selected Recipes */}
                <div className="mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">📋 Selected Recipes ({shoppingList.recipes.length})</h3>
                    <div className="bg-gray-50 rounded-lg p-3">
                        {shoppingList.recipes.map((recipe, index) => (
                            <span key={index} className="inline-block bg-indigo-100 text-indigo-800 text-sm px-2 py-1 rounded mr-2 mb-1">
                                {recipe}
                            </span>
                        ))}
                    </div>
                </div>

                {!hasItems ? (
                    /* No items needed */
                    <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-green-600 text-lg font-medium mb-2">
                            🎉 You have everything you need!
                        </div>
                        <p className="text-green-700">
                            Your current inventory covers all the ingredients for the selected recipe(s).
                        </p>
                        <div className="mt-4 text-sm text-green-600">
                            📦 Based on standard package sizes and ingredient matching
                        </div>
                    </div>
                ) : (
                    /* Shopping list items by category */
                    <div className="space-y-6">
                        {Object.entries(shoppingList.items).map(([category, items]) => (
                            <div key={category} className="border border-gray-200 rounded-lg">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                    <h4 className="font-medium text-gray-900">
                                        {getCategoryIcon(category)} {category} ({items.length} items)
                                    </h4>
                                </div>
                                <div className="p-4 space-y-3">
                                    {items.map((item, index) => {
                                        const itemId = `${category}-${index}`;
                                        const isChecked = checkedItems.has(itemId);

                                        return (
                                            <div key={index} className="flex items-start space-x-3">
                                                <button
                                                    onClick={() => toggleItemCheck(itemId)}
                                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                                                        isChecked
                                                            ? 'bg-green-500 border-green-500 text-white'
                                                            : 'border-gray-300 hover:border-gray-400'
                                                    }`}
                                                >
                                                    {isChecked && '✓'}
                                                </button>
                                                <div className="flex-1">
                                                    <div className={`${isChecked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                                        <span className="font-medium">{item.originalName}</span>
                                                        <span className="text-sm text-gray-600 ml-2">
                                                            ({item.needAmount} {item.unit})
                                                        </span>
                                                    </div>

                                                    {/* Show inventory status */}
                                                    {item.haveAmount > 0 && (
                                                        <div className="text-sm text-blue-600 mt-1">
                                                            Have: {item.haveAmount} {item.unit} → Need: {item.needAmount} more
                                                        </div>
                                                    )}

                                                    {/* Show pantry staple note */}
                                                    {item.isPantryStaple && (
                                                        <div className="text-xs text-yellow-600 mt-1">
                                                            💡 Common pantry staple - check your spice rack
                                                        </div>
                                                    )}

                                                    {/* Show which recipes use this ingredient */}
                                                    {item.recipes && item.recipes.length > 0 && (
                                                        <div className="text-xs text-gray-500 mt-1">
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

                {/* Shopping Summary */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">📊 Shopping Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-gray-900">{shoppingList.summary.totalItems}</div>
                            <div className="text-sm text-gray-600">Total Items</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-blue-600">{shoppingList.summary.categories}</div>
                            <div className="text-sm text-gray-600">Categories</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-600">{shoppingList.summary.alreadyHave}</div>
                            <div className="text-sm text-gray-600">Already Have</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-red-600">{shoppingList.summary.needToBuy}</div>
                            <div className="text-sm text-gray-600">Need to Buy</div>
                        </div>
                    </div>
                </div>

                {/* Package Size Explanation */}
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">📦 Smart Package Matching</h5>
                    <p className="text-blue-800 text-sm">
                        When your inventory shows "items" or "packages", the system assumes standard package sizes:
                    </p>
                    <ul className="text-blue-700 text-xs mt-2 space-y-1">
                        <li>• Pasta box = 16 oz • Oil bottle = 32 oz • Flour bag = 80 oz</li>
                        <li>• Milk carton = 32 oz • Butter stick = 16 oz • Rice package = 32 oz</li>
                        <li>• For small amounts (≤2 units), assumes one package covers the recipe</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}