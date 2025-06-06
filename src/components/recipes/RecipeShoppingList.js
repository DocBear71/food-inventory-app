// file: /src/components/recipes/RecipeShoppingList.js v5

'use client';

import { useState, useEffect } from 'react';
import EmailShareModal from '@/components/shared/EmailShareModal';

export default function RecipeShoppingList({ recipeId, recipeName, onClose }) {
    const [shoppingList, setShoppingList] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('category');
    const [showEmailModal, setShowEmailModal] = useState(false);

    useEffect(() => {
        generateShoppingList();
    }, [recipeId]);

    // Convert API response structure to component-expected structure
    const normalizeShoppingList = (apiResponse) => {
        if (!apiResponse) return null;

        console.log('Normalizing API response:', apiResponse);

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
                            recipes: [recipeName],  // Single recipe context
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

        console.log('Normalized shopping list:', {
            items: normalizedItems,
            stats: stats
        });

        return {
            items: normalizedItems,
            stats: stats,
            recipes: [recipeName]
        };
    };

    const generateShoppingList = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('Generating shopping list for recipe:', recipeId);

            const response = await fetch('/api/shopping/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipeIds: [recipeId]
                })
            });

            const data = await response.json();
            console.log('Shopping list API response:', data);

            if (data.success) {
                setShoppingList(data.shoppingList);
            } else {
                setError(data.error || 'Failed to generate shopping list');
            }
        } catch (err) {
            console.error('Error generating shopping list:', err);
            setError('Failed to generate shopping list');
        } finally {
            setLoading(false);
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
        const normalizedList = normalizeShoppingList(shoppingList);
        const groupedItems = getGroupedItems(normalizedList);
        const printDate = new Date().toLocaleDateString();

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Shopping List - ${recipeName}</title>
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
                    <p>${recipeName} • Generated on ${printDate}</p>
                </div>
                
                ${Object.entries(groupedItems).map(([category, items]) => `
                    <div class="category">
                        <h2>${getCategoryName(category)} (${items.length} items)</h2>
                        ${items.map(item => `
                            <div class="item">
                                <div class="checkbox"></div>
                                <div class="item-content">
                                    <span class="item-name">${item.ingredient}</span>
                                    <span class="item-amount">${item.amount || ''}</span>
                                    ${item.inInventory ? '<div class="inventory-note">✓ In your inventory</div>' : ''}
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
        textContent += `${recipeName}\n`;
        textContent += `Generated: ${exportDate}\n`;
        textContent += `${'='.repeat(50)}\n\n`;

        Object.entries(groupedItems).forEach(([category, items]) => {
            textContent += `${getCategoryName(category).toUpperCase()} (${items.length} items)\n`;
            textContent += `${'-'.repeat(30)}\n`;

            items.forEach(item => {
                textContent += `☐ ${item.ingredient}`;
                if (item.amount) {
                    textContent += ` - ${item.amount}`;
                }
                if (item.inInventory) {
                    textContent += ` [IN INVENTORY]`;
                }
                textContent += `\n`;
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
        link.download = `shopping-list-${recipeName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Export to PDF
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

    // Refresh shopping list
    const refreshShoppingList = () => {
        generateShoppingList();
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

    // Normalize the shopping list for display
    const normalizedShoppingList = normalizeShoppingList(shoppingList);

    if (loading) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        display: 'inline-block',
                        width: '2rem',
                        height: '2rem',
                        border: '2px solid #e5e7eb',
                        borderTopColor: '#3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginBottom: '1rem'
                    }}></div>
                    <p>Generating shopping list...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '2rem',
                    textAlign: 'center',
                    maxWidth: '400px'
                }}>
                    <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
                        Error: {error}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                            onClick={generateShoppingList}
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Try Again
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!normalizedShoppingList) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <p style={{ color: '#6b7280' }}>No shopping list data available.</p>
                    <button
                        onClick={onClose}
                        style={{
                            marginTop: '1rem',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const filteredItems = getFilteredItems(normalizedShoppingList);
    const groupedItems = getGroupedItems(normalizedShoppingList);

    return (
        <>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
                padding: '1rem'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    width: '100%',
                    maxWidth: '1200px',
                    height: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #e5e7eb',
                        flexShrink: 0
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h2 style={{
                                    margin: 0,
                                    fontSize: '1.5rem',
                                    fontWeight: '600',
                                    color: '#111827'
                                }}>
                                    🛒 Shopping List for {recipeName}
                                </h2>
                                <p style={{
                                    margin: '0.25rem 0 0 0',
                                    fontSize: '0.875rem',
                                    color: '#6b7280'
                                }}>
                                    Items you need to buy for this recipe
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    color: '#9ca3af',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '1.5rem'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Stats */}
                        {normalizedShoppingList?.stats && (
                            <div style={{
                                marginTop: '1rem',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                gap: '1rem'
                            }}>
                                <div style={{
                                    backgroundColor: '#dbeafe',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold',
                                        color: '#2563eb'
                                    }}>
                                        {normalizedShoppingList.stats.totalItems}
                                    </div>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: '#1e40af'
                                    }}>
                                        Total Items
                                    </div>
                                </div>
                                <div style={{
                                    backgroundColor: '#dcfce7',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold',
                                        color: '#16a34a'
                                    }}>
                                        {normalizedShoppingList.stats.inInventory}
                                    </div>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: '#15803d'
                                    }}>
                                        In Inventory
                                    </div>
                                </div>
                                <div style={{
                                    backgroundColor: '#fed7aa',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold',
                                        color: '#ea580c'
                                    }}>
                                        {normalizedShoppingList.stats.needToBuy}
                                    </div>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: '#c2410c'
                                    }}>
                                        Need to Buy
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div style={{
                        padding: '1rem 1.5rem',
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: '#f9fafb',
                        flexShrink: 0
                    }}>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '1rem',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <label style={{
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        color: '#374151'
                                    }}>
                                        Filter:
                                    </label>
                                    <select
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        style={{
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            padding: '0.25rem 0.75rem',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        <option value="all">All Items ({normalizedShoppingList.stats.totalItems})</option>
                                        <option value="needed">Need to Buy ({normalizedShoppingList.stats.needToBuy})</option>
                                        <option value="inventory">In Inventory ({normalizedShoppingList.stats.inInventory})</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <label style={{
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        color: '#374151'
                                    }}>
                                        Sort by:
                                    </label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        style={{
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            padding: '0.25rem 0.75rem',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        <option value="category">Category</option>
                                        <option value="name">Name</option>
                                    </select>
                                </div>
                            </div>

                            {/* Print/Export/Share Buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={refreshShoppingList}
                                    style={{
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '0.875rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    🔄 Refresh
                                </button>
                                <button
                                    onClick={() => setShowEmailModal(true)}
                                    style={{
                                        backgroundColor: '#16a34a',
                                        color: 'white',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '0.875rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    📧 Share
                                </button>
                                <button
                                    onClick={printShoppingList}
                                    style={{
                                        backgroundColor: '#4f46e5',
                                        color: 'white',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '0.875rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    🖨️ Print
                                </button>
                                <button
                                    onClick={exportToPDF}
                                    style={{
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '0.875rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    📄 PDF
                                </button>
                                <button
                                    onClick={exportToText}
                                    style={{
                                        backgroundColor: '#059669',
                                        color: 'white',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '0.875rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    📝 Text
                                </button>
                            </div>
                        </div>

                        <div style={{
                            marginTop: '0.5rem',
                            fontSize: '0.875rem',
                            color: '#6b7280'
                        }}>
                            Showing {filteredItems.length} items
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        padding: '1.5rem'
                    }}>
                        {Object.keys(groupedItems).length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '2rem',
                                color: '#6b7280'
                            }}>
                                No items match your current filter.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {Object.entries(groupedItems).map(([category, items]) => (
                                    <div key={category}>
                                        <h3 style={{
                                            fontSize: '1.125rem',
                                            fontWeight: '600',
                                            color: '#111827',
                                            marginBottom: '0.75rem'
                                        }}>
                                            {getCategoryName(category)} ({items.length})
                                        </h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {items.map((item, index) => (
                                                <div
                                                    key={`${item.ingredient}-${index}`}
                                                    style={{
                                                        padding: '0.75rem',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        backgroundColor: item.inInventory ? '#eff6ff' : 'white',
                                                        borderColor: item.inInventory ? '#bfdbfe' : '#e5e7eb'
                                                    }}
                                                >
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'flex-start'
                                                    }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{
                                                                fontWeight: '500',
                                                                color: '#111827'
                                                            }}>
                                                                {item.ingredient}
                                                            </div>

                                                            {item.amount && (
                                                                <div style={{
                                                                    fontSize: '0.875rem',
                                                                    color: '#6b7280',
                                                                    marginTop: '0.25rem'
                                                                }}>
                                                                    {item.amount}
                                                                </div>
                                                            )}

                                                            {/* Show inventory details */}
                                                            {item.inInventory && item.haveAmount && (
                                                                <div style={{
                                                                    fontSize: '0.75rem',
                                                                    color: '#2563eb',
                                                                    marginTop: '0.25rem'
                                                                }}>
                                                                    In inventory: {item.haveAmount} (need: {item.needAmount})
                                                                </div>
                                                            )}
                                                        </div>

                                                        {item.inInventory && (
                                                            <div style={{
                                                                color: '#2563eb',
                                                                fontSize: '0.75rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem'
                                                            }}>
                                                                ✓ In Inventory
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
                    <div style={{
                        padding: '1rem 1.5rem',
                        borderTop: '1px solid #e5e7eb',
                        backgroundColor: '#f9fafb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexShrink: 0
                    }}>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#6b7280'
                        }}>
                            Generated on {new Date().toLocaleDateString()}
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>

            {/* Email Share Modal */}
            <EmailShareModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                shoppingList={shoppingList}
                context="recipe"
                contextName={recipeName}
            />
        </>
    );
}