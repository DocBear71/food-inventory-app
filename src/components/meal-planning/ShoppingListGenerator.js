// file: /src/components/meal-planning/ShoppingListGenerator.js v5

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ShoppingListGenerator({ mealPlanId, mealPlanName, onClose }) {
    const { data: session } = useSession();
    const [shoppingList, setShoppingList] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('category');

    // Force scrolling styles - NO CSS CLASSES, PURE INLINE
    const modalStyles = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
    };

    const containerStyles = {
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '1024px',
        width: '100%',
        height: '80vh',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    };

    const headerStyles = {
        padding: '24px',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0
    };

    const controlsStyles = {
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        flexShrink: 0
    };

    const contentStyles = {
        flex: '1',
        overflow: 'auto',
        padding: '16px 24px 40px 24px',
        minHeight: '0'
    };

    const footerStyles = {
        padding: '16px 24px',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
    };

    console.log('ShoppingListGenerator props:', { mealPlanId, mealPlanName });

    // Generate shopping list
    const generateShoppingList = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('=== Generating shopping list ===');
            console.log('Meal plan ID:', mealPlanId);

            const response = await fetch(`/api/meal-plans/${mealPlanId}/shopping-list`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    options: {
                        checkInventory: true,
                        combineIngredients: true
                    }
                })
            });

            console.log('Shopping list API response status:', response.status);
            const data = await response.json();
            console.log('Shopping list API response data:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate shopping list');
            }

            console.log('Shopping list generated successfully:', data);
            setShoppingList(data.shoppingList);

        } catch (err) {
            console.error('Error generating shopping list:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Update item (mark as purchased, etc.)
    const updateItem = async (ingredientName, updates) => {
        try {
            const response = await fetch(`/api/meal-plans/${mealPlanId}/shopping-list`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    updates: [{ ingredientName, ...updates }]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update shopping list');
            }

            // Update local state
            setShoppingList(prev => ({
                ...prev,
                items: prev.items.map(item =>
                    item.ingredient === ingredientName
                        ? { ...item, ...updates }
                        : item
                )
            }));

        } catch (err) {
            console.error('Error updating item:', err);
            setError(err.message);
        }
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
        const groupedItems = getGroupedItems();
        const printDate = new Date().toLocaleDateString();

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Shopping List - ${mealPlanName}</title>
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
                    <p>${mealPlanName} • Generated on ${printDate}</p>
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
                    Total Items: ${shoppingList.stats.totalItems} • 
                    Need to Buy: ${shoppingList.stats.needToBuy} • 
                    In Inventory: ${shoppingList.stats.inInventory} • 
                    Categories: ${shoppingList.stats.categories}
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
        const groupedItems = getGroupedItems();
        const exportDate = new Date().toLocaleDateString();

        let textContent = `SHOPPING LIST\n`;
        textContent += `${mealPlanName}\n`;
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
        textContent += `Total Items: ${shoppingList.stats.totalItems}\n`;
        textContent += `Need to Buy: ${shoppingList.stats.needToBuy}\n`;
        textContent += `In Inventory: ${shoppingList.stats.inInventory}\n`;
        textContent += `Categories: ${shoppingList.stats.categories}\n`;

        // Download as text file
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `shopping-list-${mealPlanName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
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
    const getFilteredItems = () => {
        if (!shoppingList?.items) return [];

        let filtered = shoppingList.items;

        switch (filter) {
            case 'needed':
                filtered = filtered.filter(item => !item.inInventory && !item.purchased);
                break;
            case 'inventory':
                filtered = filtered.filter(item => item.inInventory);
                break;
            case 'purchased':
                filtered = filtered.filter(item => item.purchased);
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
    const getGroupedItems = () => {
        const filtered = getFilteredItems();
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
        let display = item.amount || '';

        if (item.alternativeAmounts && item.alternativeAmounts.length > 0) {
            const alternatives = item.alternativeAmounts
                .map(alt => `${alt.amount} ${alt.unit}`)
                .join(', ');
            display += ` (also: ${alternatives})`;
        }

        return display;
    };

    const filteredItems = getFilteredItems();
    const groupedItems = getGroupedItems();

    return (
        <div style={modalStyles}>
            <div style={containerStyles}>
                {/* Header */}
                <div style={headerStyles}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0' }}>
                                🛒 Shopping List
                            </h2>
                            <p style={{ color: '#6b7280', marginTop: '4px', margin: '4px 0 0 0' }}>
                                {mealPlanName}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                color: '#9ca3af',
                                fontSize: '24px',
                                fontWeight: 'bold',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px'
                            }}
                        >
                            ×
                        </button>
                    </div>

                    {/* Stats */}
                    {shoppingList?.stats && (
                        <div style={{
                            marginTop: '16px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                            gap: '16px'
                        }}>
                            <div style={{ backgroundColor: '#dbeafe', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
                                    {shoppingList.stats.totalItems}
                                </div>
                                <div style={{ fontSize: '12px', color: '#1e40af' }}>Total Items</div>
                            </div>
                            <div style={{ backgroundColor: '#dcfce7', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
                                    {shoppingList.stats.inInventory}
                                </div>
                                <div style={{ fontSize: '12px', color: '#15803d' }}>In Inventory</div>
                            </div>
                            <div style={{ backgroundColor: '#fed7aa', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ea580c' }}>
                                    {shoppingList.stats.needToBuy}
                                </div>
                                <div style={{ fontSize: '12px', color: '#c2410c' }}>Need to Buy</div>
                            </div>
                            <div style={{ backgroundColor: '#e9d5ff', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9333ea' }}>
                                    {shoppingList.stats.categories}
                                </div>
                                <div style={{ fontSize: '12px', color: '#7c3aed' }}>Categories</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls */}
                {shoppingList && (
                    <div style={controlsStyles}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Filter:</label>
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    style={{
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        padding: '4px 12px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="all">All Items ({shoppingList.stats.totalItems})</option>
                                    <option value="needed">Need to Buy ({shoppingList.stats.needToBuy})</option>
                                    <option value="inventory">In Inventory ({shoppingList.stats.inInventory})</option>
                                    <option value="purchased">Purchased</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Sort by:</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        padding: '4px 12px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="category">Category</option>
                                    <option value="name">Name</option>
                                    <option value="recipes">Recipe</option>
                                </select>
                            </div>

                            <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                Showing {filteredItems.length} items
                            </div>
                        </div>
                    </div>
                )}

                {/* Content - GUARANTEED TO SCROLL */}
                <div style={contentStyles}>
                    {loading && (
                        <div style={{ padding: '32px', textAlign: 'center' }}>
                            <div style={{
                                display: 'inline-block',
                                width: '32px',
                                height: '32px',
                                border: '2px solid #6366f1',
                                borderTop: '2px solid transparent',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }}></div>
                            <p style={{ marginTop: '8px', color: '#6b7280' }}>Generating smart shopping list...</p>
                        </div>
                    )}

                    {error && (
                        <div style={{
                            padding: '16px',
                            margin: '16px 0',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px'
                        }}>
                            <div style={{ color: '#991b1b', fontWeight: '500' }}>Error generating shopping list</div>
                            <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>{error}</div>
                            <button
                                onClick={generateShoppingList}
                                style={{
                                    marginTop: '8px',
                                    color: '#dc2626',
                                    fontSize: '14px',
                                    background: 'none',
                                    border: 'none',
                                    textDecoration: 'underline',
                                    cursor: 'pointer'
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {!shoppingList && !loading && !error && (
                        <div style={{ padding: '32px', textAlign: 'center' }}>
                            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</div>
                            <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#111827', marginBottom: '8px' }}>
                                Ready to Generate Shopping List
                            </h3>
                            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                                We'll analyze your meal plan, combine ingredients, and check your inventory
                                to create a smart shopping list organized by store sections.
                            </p>
                            <button
                                onClick={generateShoppingList}
                                style={{
                                    backgroundColor: '#4f46e5',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: '500'
                                }}
                            >
                                Generate Shopping List
                            </button>
                        </div>
                    )}

                    {shoppingList && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {Object.keys(groupedItems).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '32px' }}>
                                    <p style={{ color: '#6b7280' }}>No items match your current filter.</p>
                                </div>
                            ) : (
                                Object.entries(groupedItems).map(([category, items]) => (
                                    <div key={category}>
                                        <h3 style={{
                                            fontSize: '18px',
                                            fontWeight: '600',
                                            color: '#111827',
                                            marginBottom: '12px',
                                            position: 'sticky',
                                            top: '0',
                                            backgroundColor: 'white',
                                            padding: '8px 0'
                                        }}>
                                            {getCategoryName(category)} ({items.length})
                                        </h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {items.map((item, index) => (
                                                <div
                                                    key={`${item.ingredient}-${index}`}
                                                    style={{
                                                        padding: '12px',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        backgroundColor: item.purchased
                                                            ? '#f0fdf4'
                                                            : item.inInventory
                                                                ? '#eff6ff'
                                                                : 'white'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                                        <div style={{ flex: '1' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.purchased || false}
                                                                    onChange={(e) =>
                                                                        updateItem(item.ingredient, {
                                                                            purchased: e.target.checked
                                                                        })
                                                                    }
                                                                    style={{ width: '20px', height: '20px' }}
                                                                />

                                                                <div style={{ flex: '1' }}>
                                                                    <div style={{
                                                                        fontWeight: '500',
                                                                        color: item.purchased ? '#6b7280' : '#111827',
                                                                        textDecoration: item.purchased ? 'line-through' : 'none'
                                                                    }}>
                                                                        {item.ingredient}
                                                                        {item.optional && (
                                                                            <span style={{ color: '#9ca3af', fontSize: '14px', marginLeft: '8px' }}>(optional)</span>
                                                                        )}
                                                                    </div>

                                                                    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                                                                        {formatAmount(item)}
                                                                    </div>

                                                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                                                        Used in: {item.recipes.join(', ')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                                                            {item.inInventory && (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    color: '#2563eb',
                                                                    fontSize: '12px'
                                                                }}>
                                                                    ✓ In Inventory
                                                                </div>
                                                            )}

                                                            {item.purchased && (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    color: '#16a34a',
                                                                    fontSize: '12px'
                                                                }}>
                                                                    ✓ Purchased
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {item.inventoryItem && (
                                                        <div style={{
                                                            marginTop: '8px',
                                                            padding: '8px',
                                                            backgroundColor: '#dbeafe',
                                                            borderRadius: '4px',
                                                            fontSize: '14px',
                                                            color: '#1e40af'
                                                        }}>
                                                            <strong>In your inventory:</strong> {item.inventoryItem.quantity} {item.inventoryItem.unit}
                                                            {item.inventoryItem.location && ` (${item.inventoryItem.location})`}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer with Print/Export Options */}
                {shoppingList && (
                    <div style={footerStyles}>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            Generated on {new Date(shoppingList.generatedAt).toLocaleDateString()}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                                onClick={printShoppingList}
                                style={{
                                    backgroundColor: '#4f46e5',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                                </svg>
                                Print
                            </button>

                            <button
                                onClick={exportToPDF}
                                style={{
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                                </svg>
                                PDF
                            </button>

                            <button
                                onClick={exportToText}
                                style={{
                                    backgroundColor: '#059669',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z"/>
                                </svg>
                                Text
                            </button>

                            <button
                                onClick={generateShoppingList}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}