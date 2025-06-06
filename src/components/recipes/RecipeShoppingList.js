// file: /src/components/recipes/RecipeShoppingList.js v7

'use client';

import { useState, useEffect } from 'react';
import EmailShareModal from '@/components/shared/EmailShareModal';
import SaveShoppingListModal from '@/components/shared/SaveShoppingListModal';

export default function RecipeShoppingList({ recipeId, recipeName, onClose }) {
    const [shoppingList, setShoppingList] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [purchasedItems, setPurchasedItems] = useState({});
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);

    useEffect(() => {
        if (recipeId) {
            generateShoppingList();
        }
    }, [recipeId]);

    const generateShoppingList = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/shopping/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipeIds: [recipeId]
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate shopping list');
            }

            setShoppingList(result.shoppingList);
        } catch (error) {
            console.error('Error generating shopping list:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle checkbox changes
    const handleItemToggle = (itemKey) => {
        setPurchasedItems(prev => ({
            ...prev,
            [itemKey]: !prev[itemKey]
        }));
    };

    const markAllAsPurchased = () => {
        if (!shoppingList?.items) return;

        const allItems = {};
        Object.values(shoppingList.items).flat().forEach(item => {
            const itemKey = `${item.ingredient || item.name}-${item.category || 'other'}`;
            allItems[itemKey] = true;
        });
        setPurchasedItems(allItems);
    };

    const clearAllPurchased = () => {
        setPurchasedItems({});
    };

    // Add purchased status to items
    const addPurchasedStatus = (items) => {
        return items.map(item => {
            const itemKey = `${item.ingredient || item.name}-${item.category || 'other'}`;
            return {
                ...item,
                purchased: purchasedItems[itemKey] || false,
                itemKey
            };
        });
    };

    // Filter items based on current filter
    const getFilteredItems = (items) => {
        const itemsWithStatus = addPurchasedStatus(items);

        switch (filter) {
            case 'needToBuy':
                return itemsWithStatus.filter(item => !item.inInventory && !item.purchased);
            case 'inInventory':
                return itemsWithStatus.filter(item => item.inInventory);
            case 'purchased':
                return itemsWithStatus.filter(item => item.purchased);
            default:
                return itemsWithStatus;
        }
    };

    // Group items by category for display
    const getGroupedItems = () => {
        if (!shoppingList?.items) return {};

        const allItems = Object.values(shoppingList.items).flat();
        const filtered = getFilteredItems(allItems);
        const grouped = {};

        filtered.forEach(item => {
            const category = item.category || 'Other';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(item);
        });

        return grouped;
    };

    // Calculate statistics including purchased count
    const getStats = () => {
        if (!shoppingList?.items) {
            return { totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0 };
        }

        const allItems = Object.values(shoppingList.items).flat();
        const itemsWithStatus = addPurchasedStatus(allItems);

        return {
            totalItems: itemsWithStatus.length,
            needToBuy: itemsWithStatus.filter(item => !item.inInventory && !item.purchased).length,
            inInventory: itemsWithStatus.filter(item => item.inInventory).length,
            purchased: itemsWithStatus.filter(item => item.purchased).length
        };
    };

    const stats = getStats();
    const groupedItems = getGroupedItems();

    const handleSaveSuccess = (savedList) => {
        console.log('Recipe shopping list saved successfully:', savedList);
        // Could show a success message
    };

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
                zIndex: 1000
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '3rem',
                        height: '3rem',
                        border: '4px solid #e5e7eb',
                        borderTop: '4px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
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
                zIndex: 1000,
                padding: '1rem'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    textAlign: 'center',
                    maxWidth: '400px'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#dc2626' }}>Error</h3>
                    <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280' }}>{error}</p>
                    <button
                        onClick={onClose}
                        style={{
                            backgroundColor: '#374151',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.75rem 1.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    if (!shoppingList) {
        return null;
    }

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
                zIndex: 1000,
                padding: '1rem'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    width: '100%',
                    maxWidth: '800px',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <h2 style={{
                                margin: 0,
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                color: '#111827'
                            }}>
                                🛒 Shopping List
                            </h2>
                            <p style={{
                                margin: '0.25rem 0 0 0',
                                fontSize: '0.875rem',
                                color: '#6b7280'
                            }}>
                                {recipeName}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                color: '#6b7280',
                                padding: '0.25rem'
                            }}
                        >
                            ×
                        </button>
                    </div>

                    {/* Statistics Cards */}
                    <div style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #f3f4f6'
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                            gap: '1rem'
                        }}>
                            <div style={{
                                backgroundColor: '#f8fafc',
                                padding: '1rem',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
                                    {stats.totalItems}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                    Total Items
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: '#f0f9ff',
                                padding: '1rem',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0369a1' }}>
                                    {stats.inInventory}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.25rem' }}>
                                    In Inventory
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: '#fef3c7',
                                padding: '1rem',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706' }}>
                                    {stats.needToBuy}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                                    Need to Buy
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: '#f3e8ff',
                                padding: '1rem',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7c3aed' }}>
                                    {stats.purchased}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '0.25rem' }}>
                                    Purchased
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div style={{
                        padding: '1rem 1.5rem',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                        flexWrap: 'wrap'
                    }}>
                        {/* Filter Dropdown */}
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            style={{
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                backgroundColor: 'white'
                            }}
                        >
                            <option value="all">All Items ({stats.totalItems})</option>
                            <option value="needToBuy">Need to Buy ({stats.needToBuy})</option>
                            <option value="inInventory">In Inventory ({stats.inInventory})</option>
                            <option value="purchased">Purchased ({stats.purchased})</option>
                        </select>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {/* Checkbox Actions */}
                            <button
                                onClick={markAllAsPurchased}
                                style={{
                                    backgroundColor: '#8b5cf6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                ✓ All
                            </button>
                            <button
                                onClick={clearAllPurchased}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                ✗ Clear
                            </button>

                            {/* Refresh Button */}
                            <button
                                onClick={generateShoppingList}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Refresh
                            </button>

                            {/* Save Button */}
                            <button
                                onClick={() => setShowSaveModal(true)}
                                style={{
                                    backgroundColor: '#8b5cf6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer'
                                }}
                            >
                                💾 Save
                            </button>

                            {/* Email Share Button */}
                            <button
                                onClick={() => setShowEmailModal(true)}
                                style={{
                                    backgroundColor: '#16a34a',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer'
                                }}
                            >
                                📧 Share
                            </button>

                            {/* Print Button */}
                            <button
                                onClick={() => window.print()}
                                style={{
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer'
                                }}
                            >
                                🖨️ Print
                            </button>

                            {/* PDF Export Button */}
                            <button
                                onClick={() => {
                                    const printContent = document.getElementById('recipe-shopping-list-content').innerHTML;
                                    const printWindow = window.open('', '_blank');
                                    printWindow.document.write(`
                                        <html><head><title>Shopping List - ${recipeName}</title>
                                        <style>
                                            body { font-family: Arial, sans-serif; margin: 20px; }
                                            .header { text-align: center; margin-bottom: 30px; }
                                            .header h1 { margin: 0; font-size: 24pt; }
                                            .header p { margin: 5px 0 0 0; font-size: 11pt; color: #666; }
                                            .category { 
                                                margin-bottom: 25px; 
                                                break-inside: avoid; 
                                            }
                                            .category h3 { 
                                                color: #333; 
                                                border-bottom: 2px solid #333; 
                                                padding-bottom: 5px; 
                                                margin-top: 0;
                                                font-size: 14pt;
                                            }
                                            .item { 
                                                margin: 8px 0; 
                                                display: flex; 
                                                align-items: flex-start;
                                                page-break-inside: avoid;
                                            }
                                            .checkbox { 
                                                margin-right: 10px; 
                                                margin-top: 2px;
                                                width: 12px;
                                                height: 12px;
                                                border: 1px solid #000;
                                                display: inline-block;
                                            }
                                            .checkbox.checked {
                                                background-color: #000;
                                            }
                                            .item-text {
                                                flex: 1;
                                                line-height: 1.3;
                                            }
                                            .inventory-note { 
                                                color: #16a34a; 
                                                font-size: 0.9em; 
                                                margin-top: 2px;
                                                font-style: italic;
                                            }
                                            .purchased {
                                                text-decoration: line-through;
                                                opacity: 0.6;
                                            }
                                        </style></head>
                                        <body>
                                            <div class="header">
                                                <h1>🛒 Shopping List</h1>
                                                <p>${recipeName}</p>
                                            </div>
                                            ${printContent}
                                        </body></html>
                                    `);
                                    printWindow.document.close();
                                    printWindow.print();
                                }}
                                style={{
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer'
                                }}
                            >
                                📄 PDF
                            </button>

                            {/* Text Export Button */}
                            <button
                                onClick={() => {
                                    const textContent = `Shopping List - ${recipeName}\n\n` +
                                        Object.entries(groupedItems)
                                            .map(([category, items]) => {
                                                const categoryItems = items.map(item => {
                                                    const checkbox = item.purchased ? '☑' : '☐';
                                                    const status = item.purchased ? ' [PURCHASED]' :
                                                        item.inInventory ? ' [IN INVENTORY]' : '';
                                                    return `  ${checkbox} ${item.amount ? `${item.amount} ` : ''}${item.ingredient || item.name}${status}`;
                                                });
                                                return `${category}:\n${categoryItems.join('\n')}`;
                                            })
                                            .join('\n\n');

                                    const blob = new Blob([textContent], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `shopping-list-${recipeName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                                style={{
                                    backgroundColor: '#0891b2',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer'
                                }}
                            >
                                📝 Text
                            </button>
                        </div>
                    </div>

                    {/* Shopping List Content */}
                    <div
                        id="recipe-shopping-list-content"
                        style={{
                            flex: 1,
                            padding: '1.5rem',
                            overflow: 'auto'
                        }}
                    >
                        {Object.keys(groupedItems).length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '3rem',
                                color: '#6b7280'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
                                <p>No items match the current filter</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {Object.entries(groupedItems).map(([category, items]) => (
                                    <div key={category}>
                                        <h3 style={{
                                            fontSize: '1.125rem',
                                            fontWeight: '600',
                                            color: '#374151',
                                            marginBottom: '0.75rem',
                                            padding: '0.5rem 0',
                                            borderBottom: '2px solid #e5e7eb'
                                        }}>
                                            {category} ({items.length})
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {items.map((item, index) => {
                                                const itemKey = item.itemKey || `${item.ingredient || item.name}-${category}`;
                                                const isPurchased = item.purchased;

                                                return (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: '0.75rem',
                                                            padding: '0.75rem',
                                                            backgroundColor: isPurchased ? '#f0fdf4' : 'transparent',
                                                            borderRadius: '6px',
                                                            opacity: isPurchased ? 0.7 : 1,
                                                            textDecoration: isPurchased ? 'line-through' : 'none',
                                                            border: '1px solid transparent'
                                                        }}
                                                    >
                                                        {/* Checkbox */}
                                                        <input
                                                            type="checkbox"
                                                            checked={isPurchased}
                                                            onChange={() => handleItemToggle(itemKey)}
                                                            style={{
                                                                marginTop: '0.125rem',
                                                                cursor: 'pointer'
                                                            }}
                                                        />

                                                        {/* Item Details */}
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'flex-start',
                                                                marginBottom: '0.25rem'
                                                            }}>
                                                                <span style={{
                                                                    fontWeight: '500',
                                                                    color: '#374151'
                                                                }}>
                                                                    {item.amount && `${item.amount} `}{item.ingredient || item.name}
                                                                </span>
                                                            </div>

                                                            {/* Inventory Status */}
                                                            {item.inInventory && (
                                                                <div style={{
                                                                    fontSize: '0.875rem',
                                                                    color: '#16a34a',
                                                                    marginTop: '0.25rem'
                                                                }}>
                                                                    <strong>In your inventory:</strong> {item.haveAmount || 'Available'}
                                                                    {item.inventoryItem?.location &&
                                                                        ` (${item.inventoryItem.location})`
                                                                    }
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
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '1rem 1.5rem',
                        borderTop: '1px solid #e5e7eb',
                        backgroundColor: '#f9fafb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#6b7280'
                        }}>
                            {shoppingList.generatedAt && (
                                `Generated ${new Date(shoppingList.generatedAt).toLocaleString()}`
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                backgroundColor: '#374151',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Email Share Modal */}
            <EmailShareModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                shoppingList={shoppingList}
                context="recipe"
                contextName={recipeName}
            />

            {/* Save Shopping List Modal */}
            <SaveShoppingListModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={handleSaveSuccess}
                shoppingList={shoppingList}
                listType="recipe"
                contextName={recipeName}
                sourceRecipeIds={[recipeId]}
                sourceMealPlanId={null}
            />

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}