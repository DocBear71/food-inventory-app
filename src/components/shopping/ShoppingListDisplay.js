// file: /src/components/shopping/ShoppingListDisplay.js v3

'use client';

import { useState } from 'react';

export default function ShoppingListDisplay({ shoppingList, onClose }) {
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('category');

    // Convert API response structure to component-expected structure
    const normalizeShoppingList = (apiResponse) => {
        if (!apiResponse) return null;

        // Handle the API structure where items are grouped by category
        let normalizedItems = [];

        if (apiResponse.items && typeof apiResponse.items === 'object') {
            // API returns: { items: { Pantry: [...], Produce: [...] } }
            Object.entries(apiResponse.items).forEach(([category, categoryItems]) => {
                if (Array.isArray(categoryItems)) {
                    categoryItems.forEach(item => {
                        normalizedItems.push({
                            ingredient: item.name || item.ingredient,
                            amount: item.name || '',  // API puts full description in 'name'
                            category: category.toLowerCase(),
                            recipes: apiResponse.recipes || [],
                            inInventory: item.haveAmount > 0,
                            purchased: false,
                            originalName: item.originalName,
                            needAmount: item.needAmount,
                            haveAmount: item.haveAmount
                        });
                    });
                }
            });
        } else if (Array.isArray(apiResponse.items)) {
            // Already in expected format
            normalizedItems = apiResponse.items;
        }

        // Create stats from summary or calculate them
        const stats = {
            totalItems: apiResponse.summary?.totalItems || normalizedItems.length,
            needToBuy: apiResponse.summary?.needToBuy || normalizedItems.filter(item => !item.inInventory).length,
            inInventory: apiResponse.summary?.alreadyHave || normalizedItems.filter(item => item.inInventory).length
        };

        return {
            items: normalizedItems,
            stats: stats,
            recipes: apiResponse.recipes || []
        };
    };

    // Print Shopping List
    const printShoppingList = () => {
        const printWindow = window.open('', '_blank');
        const printContent = generatePrintHTML();

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    // Generate Print HTML
    const generatePrintHTML = () => {
        const normalizedList = normalizeShoppingList(shoppingList);
        const groupedItems = getGroupedItems(normalizedList);
        const printDate = new Date().toLocaleDateString();

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Shopping List - Selected Recipes</title>
                <style>
                    @media print {
                        @page { margin: 0.5in; }
                        body { font-family: Arial, sans-serif; font-size: 12pt; }
                    }
                    body { 
                        font-family: Arial, sans-serif; 
                        line-height: 1.4; 
                        color: #333;
                        max-width: 8.5in;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 30px; 
                        border-bottom: 2px solid #333;
                        padding-bottom: 15px;
                    }
                    .header h1 { margin: 0; font-size: 24pt; }
                    .header p { margin: 5px 0 0 0; font-size: 11pt; color: #666; }
                    .category { 
                        margin-bottom: 25px; 
                        break-inside: avoid;
                    }
                    .category h2 { 
                        font-size: 16pt; 
                        margin: 0 0 10px 0; 
                        padding: 8px 12px;
                        background: #f5f5f5; 
                        border-left: 4px solid #333;
                    }
                    .item { 
                        display: flex; 
                        align-items: flex-start; 
                        margin-bottom: 8px; 
                        padding: 4px 0;
                        border-bottom: 1px dotted #ccc;
                    }
                    .checkbox { 
                        width: 15px; 
                        height: 15px; 
                        border: 2px solid #333; 
                        margin-right: 12px; 
                        margin-top: 2px;
                        flex-shrink: 0;
                    }
                    .item-content { flex: 1; }
                    .item-name { font-weight: bold; font-size: 11pt; }
                    .item-amount { font-size: 10pt; color: #666; margin-left: 8px; }
                    .item-recipes { font-size: 9pt; color: #888; font-style: italic; margin-top: 2px; }
                    .inventory-note { 
                        color: #0066cc; 
                        font-size: 9pt; 
                        font-weight: bold; 
                        margin-top: 2px;
                    }
                    .stats { 
                        margin-top: 30px; 
                        padding: 15px; 
                        background: #f9f9f9; 
                        border: 1px solid #ddd;
                        font-size: 10pt;
                    }
                    .footer { 
                        margin-top: 30px; 
                        text-align: center; 
                        font-size: 9pt; 
                        color: #666;
                        border-top: 1px solid #ddd;
                        padding-top: 15px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🛒 Shopping List</h1>
                    <p>Selected Recipes • Generated on ${printDate}</p>
                </div>
                
                ${Object.entries(groupedItems).map(([category, items]) => `
                    <div class="category">
                        <h2>${getCategoryName(category)} (${items.length} items)</h2>
                        ${items.map(item => `
                            <div class="item">
                                <div class="checkbox"></div>
                                <div class="item-content">
                                    <span class="item-name">${item.ingredient}</span>
                                    <span class="item-amount">${formatAmount(item)}</span>
                                    ${item.inInventory ? '<div class="inventory-note">✓ In your inventory</div>' : ''}
                                    <div class="item-recipes">Used in: ${item.recipes.join(', ')}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
                
                <div class="stats">
                    <strong>Shopping Summary:</strong><br>
                    Total Items: ${normalizedList.stats.totalItems} • 
                    Need to Buy: ${normalizedList.stats.needToBuy} • 
                    In Inventory: ${normalizedList.stats.inInventory}
                </div>
                
                <div class="footer">
                    Generated by Food Inventory App • ${new Date().toLocaleString()}
                </div>
            </body>
            </html>
        `;
    };

    // Export to Text
    const exportToText = () => {
        const normalizedList = normalizeShoppingList(shoppingList);
        const groupedItems = getGroupedItems(normalizedList);
        const exportDate = new Date().toLocaleDateString();

        let textContent = `SHOPPING LIST\n`;
        textContent += `Selected Recipes\n`;
        textContent += `Generated: ${exportDate}\n`;
        textContent += `${'='.repeat(50)}\n\n`;

        Object.entries(groupedItems).forEach(([category, items]) => {
            textContent += `${getCategoryName(category).toUpperCase()} (${items.length} items)\n`;
            textContent += `${'-'.repeat(30)}\n`;

            items.forEach(item => {
                textContent += `☐ ${item.ingredient}`;
                if (formatAmount(item)) {
                    textContent += ` - ${formatAmount(item)}`;
                }
                if (item.inInventory) {
                    textContent += ` [IN INVENTORY]`;
                }
                textContent += `\n`;
                textContent += `  Used in: ${item.recipes.join(', ')}\n`;
            });
            textContent += `\n`;
        });

        textContent += `SUMMARY:\n`;
        textContent += `Total Items: ${normalizedList.stats.totalItems}\n`;
        textContent += `Need to Buy: ${normalizedList.stats.needToBuy}\n`;
        textContent += `In Inventory: ${normalizedList.stats.inInventory}\n`;

        // Download as text file
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `shopping-list-recipes-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Export to PDF (using browser's print to PDF)
    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        const printContent = generatePrintHTML();

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();

        // Add instructions for PDF export
        const instructionDiv = printWindow.document.createElement('div');
        instructionDiv.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; background: #ffffcc; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; z-index: 1000;">
                <strong>To save as PDF:</strong><br>
                1. Press Ctrl+P (Cmd+P on Mac)<br>
                2. Choose "Save as PDF"<br>
                3. Click Save
            </div>
        `;
        printWindow.document.body.appendChild(instructionDiv);

        // Auto-trigger print dialog
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    // Filter and sort items
    const getFilteredItems = (normalizedList) => {
        if (!normalizedList?.items) return [];

        let filtered = normalizedList.items;

        switch (filter) {
            case 'needed':
                filtered = filtered.filter(item => !item.inInventory);
                break;
            case 'inventory':
                filtered = filtered.filter(item => item.inInventory);
                break;
            default:
                break;
        }

        switch (sortBy) {
            case 'name':
                filtered.sort((a, b) => a.ingredient.localeCompare(b.ingredient));
                break;
            case 'recipes':
                filtered.sort((a, b) => a.recipes.join(', ').localeCompare(b.recipes.join(', ')));
                break;
            default:
                break;
        }

        return filtered;
    };

    // Group items by category for display
    const getGroupedItems = (normalizedList) => {
        const filtered = getFilteredItems(normalizedList);
        const grouped = {};

        filtered.forEach(item => {
            const category = item.category || 'other';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(item);
        });

        return grouped;
    };

    // Get category display name
    const getCategoryName = (category) => {
        const names = {
            produce: '🥬 Produce',
            meat: '🥩 Meat & Seafood',
            dairy: '🥛 Dairy & Eggs',
            pantry: '🥫 Pantry & Dry Goods',
            frozen: '🧊 Frozen Foods',
            bakery: '🍞 Bakery',
            other: '📦 Other Items'
        };
        return names[category] || `📦 ${category}`;
    };

    // Format amount display
    const formatAmount = (item) => {
        return item.amount || '';
    };

    // Normalize the shopping list for display
    const normalizedShoppingList = normalizeShoppingList(shoppingList);
    const filteredItems = getFilteredItems(normalizedShoppingList);
    const groupedItems = getGroupedItems(normalizedShoppingList);

    if (!normalizedShoppingList) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center">
                    <p className="text-gray-500">No shopping list data available.</p>
                    <button
                        onClick={onClose}
                        className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">🛒 Your Shopping List</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Items you need to buy based on selected recipes
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Stats */}
                {normalizedShoppingList?.stats && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {normalizedShoppingList.stats.totalItems}
                            </div>
                            <div className="text-sm text-blue-800">Total Items</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {normalizedShoppingList.stats.inInventory}
                            </div>
                            <div className="text-sm text-green-800">In Inventory</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold text-orange-600">
                                {normalizedShoppingList.stats.needToBuy}
                            </div>
                            <div className="text-sm text-orange-800">Need to Buy</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4 items-center">
                        <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-700">Filter:</label>
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                            >
                                <option value="all">All Items ({normalizedShoppingList.stats.totalItems})</option>
                                <option value="needed">Need to Buy ({normalizedShoppingList.stats.needToBuy})</option>
                                <option value="inventory">In Inventory ({normalizedShoppingList.stats.inInventory})</option>
                            </select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-700">Sort by:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                            >
                                <option value="category">Category</option>
                                <option value="name">Name</option>
                                <option value="recipes">Recipe</option>
                            </select>
                        </div>
                    </div>

                    {/* Print/Export Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={printShoppingList}
                            className="bg-indigo-600 text-white px-3 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                            </svg>
                            Print
                        </button>

                        <button
                            onClick={exportToPDF}
                            className="bg-red-600 text-white px-3 py-2 rounded-md text-sm hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            </svg>
                            PDF
                        </button>

                        <button
                            onClick={exportToText}
                            className="bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z"/>
                            </svg>
                            Text
                        </button>
                    </div>
                </div>

                <div className="mt-2 text-sm text-gray-600">
                    Showing {filteredItems.length} items
                </div>
            </div>

            {/* Shopping List Content */}
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
                {Object.keys(groupedItems).length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No items match your current filter.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedItems).map(([category, items]) => (
                            <div key={category}>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    {getCategoryName(category)} ({items.length})
                                </h3>

                                <div className="space-y-2">
                                    {items.map((item, index) => (
                                        <div
                                            key={`${item.ingredient}-${index}`}
                                            className={`p-3 border rounded-lg ${
                                                item.inInventory
                                                    ? 'bg-blue-50 border-blue-200'
                                                    : 'bg-white border-gray-200'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900">
                                                        {item.ingredient}
                                                    </div>

                                                    {item.amount && (
                                                        <div className="text-sm text-gray-600 mt-1">
                                                            {item.amount}
                                                        </div>
                                                    )}

                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Used in: {item.recipes.join(', ')}
                                                    </div>

                                                    {/* Show inventory details */}
                                                    {item.inInventory && item.haveAmount && (
                                                        <div className="text-xs text-blue-600 mt-1">
                                                            In inventory: {item.haveAmount} (need: {item.needAmount})
                                                        </div>
                                                    )}
                                                </div>

                                                {item.inInventory && (
                                                    <div className="text-blue-600 text-xs flex items-center">
                                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                        In Inventory
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                    Generated on {new Date().toLocaleDateString()}
                </div>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}