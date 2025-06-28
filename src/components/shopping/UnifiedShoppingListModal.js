'use client';
// file: /src/components/shopping/UnifiedShoppingListModal.js v1 - Standardized shopping list modal

import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import EmailSharingModal from '@/components/sharing/EmailSharingModal'; // Using newer subscription-gated version
import SaveShoppingListModal from '@/components/shared/SaveShoppingListModal';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { getApiUrl } from '@/lib/api-config';

export default function UnifiedShoppingListModal({
                                                     isOpen,
                                                     onClose,
                                                     shoppingList,
                                                     title = '🛒 Shopping List',
                                                     subtitle = null,
                                                     sourceRecipeIds = [],
                                                     sourceMealPlanId = null,
                                                     onRefresh = null,
                                                     showRefresh = false
                                                 }) {
    const { data: session } = useSafeSession();
    const [filter, setFilter] = useState('all');
    const [purchasedItems, setPurchasedItems] = useState({});
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showActions, setShowActions] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setFilter('all');
            setPurchasedItems({});
            setShowEmailModal(false);
            setShowSaveModal(false);
            setShowActions(false);
        }
    }, [isOpen]);

    if (!isOpen || !shoppingList) {
        return null;
    }

    // Normalize shopping list structure to ensure consistency
    const normalizeShoppingList = (list) => {
        if (!list) return { items: {}, summary: { totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0 } };

        let normalizedItems = {};
        let summary = list.summary || list.stats || {};

        // Handle different data structures
        if (list.items) {
            if (Array.isArray(list.items)) {
                // Convert array to categorized object
                list.items.forEach(item => {
                    const category = item.category || 'Other';
                    if (!normalizedItems[category]) {
                        normalizedItems[category] = [];
                    }
                    normalizedItems[category].push(item);
                });
            } else if (typeof list.items === 'object') {
                // Already categorized
                normalizedItems = list.items;
            }
        }

        return {
            items: normalizedItems,
            summary: {
                totalItems: summary.totalItems || 0,
                needToBuy: summary.needToBuy || 0,
                inInventory: summary.inInventory || summary.alreadyHave || 0,
                purchased: summary.purchased || 0
            },
            generatedAt: list.generatedAt,
            recipes: list.recipes || []
        };
    };

    const normalizedList = normalizeShoppingList(shoppingList);

    // Handle checkbox changes
    const handleItemToggle = (itemKey) => {
        setPurchasedItems(prev => ({
            ...prev,
            [itemKey]: !prev[itemKey]
        }));
    };

    const markAllAsPurchased = () => {
        if (!normalizedList.items) return;

        const allItems = {};
        Object.values(normalizedList.items).flat().forEach(item => {
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
        if (!normalizedList.items) return {};

        const grouped = {};
        Object.entries(normalizedList.items).forEach(([category, items]) => {
            const filtered = getFilteredItems(items);
            if (filtered.length > 0) {
                grouped[category] = filtered;
            }
        });

        return grouped;
    };

    // Calculate statistics including purchased count
    const getStats = () => {
        if (!normalizedList.items) {
            return { totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0 };
        }

        const allItems = Object.values(normalizedList.items).flat();
        const itemsWithStatus = addPurchasedStatus(allItems);

        return {
            totalItems: itemsWithStatus.length,
            needToBuy: itemsWithStatus.filter(item => !item.inInventory && !item.purchased).length,
            inInventory: itemsWithStatus.filter(item => item.inInventory).length,
            purchased: itemsWithStatus.filter(item => item.purchased).length
        };
    };

    // UNIFIED ADVANCED PRINT FUNCTION (from meal planning component)
    const handleAdvancedPrint = () => {
        // Prevent multiple clicks
        const button = event.target;
        if (button.disabled) return;
        button.disabled = true;

        try {
            const printContent = document.getElementById('unified-shopping-list-content');

            if (!printContent) {
                alert('Could not find shopping list content to print');
                return;
            }

            // Check if we're on mobile
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                window.innerWidth <= 768;

            if (isMobile) {
                // Mobile: Try Web Share API first, then fallback to blob URL
                if (navigator.share) {
                    shareShoppingList();
                } else {
                    openInNewTab();
                }
            } else {
                // Desktop: Use popup window (original approach)
                desktopPrint();
            }

            function shareShoppingList() {
                // Create text version for sharing
                const textContent = `Shopping List - ${title}\n` +
                    `Generated: ${new Date().toLocaleDateString()}\n\n` +
                    Object.entries(getGroupedItems())
                        .map(([category, items]) => {
                            const categoryItems = items.map(item => {
                                const checkbox = item.purchased ? '☑' : '☐';
                                const status = item.purchased ? ' [PURCHASED]' :
                                    item.inInventory ? ' [IN INVENTORY]' : '';
                                const recipes = item.recipes && item.recipes.length > 0 ?
                                    ` (${item.recipes.join(', ')})` : '';
                                return `  ${checkbox} ${item.amount ? `${item.amount} ` : ''}${item.ingredient || item.name}${status}${recipes}`;
                            });
                            return `${category.toUpperCase()}:\n${categoryItems.join('\n')}`;
                        })
                        .join('\n\n');

                navigator.share({
                    title: `Shopping List - ${title}`,
                    text: textContent
                }).catch((error) => {
                    console.log('Share failed, trying fallback:', error);
                    openInNewTab();
                });
            }

            function openInNewTab() {
                // Create HTML content for mobile viewing/printing
                const contentClone = printContent.cloneNode(true);

                // Replace checkboxes with print-friendly symbols
                const checkboxes = contentClone.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    const replacement = document.createElement('span');
                    replacement.style.cssText = `
                        display: inline-block;
                        width: 14px;
                        height: 14px;
                        border: 2px solid #000;
                        margin-right: 10px;
                        text-align: center;
                        line-height: 10px;
                        font-size: 10pt;
                        vertical-align: top;
                        margin-top: 2px;
                        font-weight: bold;
                    `;
                    replacement.textContent = checkbox.checked ? '✓' : '';
                    if (checkbox.checked) {
                        replacement.style.backgroundColor = '#000';
                        replacement.style.color = 'white';
                    }
                    checkbox.parentNode.replaceChild(replacement, checkbox);
                });

                const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Shopping List - ${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            margin: 0;
            padding: 20px;
            color: #000;
            background: white;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 3px solid #333;
        }
        
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
            font-weight: bold;
        }
        
        .header p {
            margin: 5px 0;
            font-size: 14px;
            color: #666;
        }
        
        .category {
            margin-bottom: 25px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .category h3 {
            color: #333;
            border-bottom: 2px solid #666;
            padding-bottom: 5px;
            margin: 20px 0 15px 0;
            font-size: 18px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .category:first-child h3 {
            margin-top: 0;
        }
        
        .item {
            margin: 10px 0;
            display: flex;
            align-items: flex-start;
            page-break-inside: avoid;
            min-height: 20px;
            padding: 8px;
            background: #fafafa;
            border-radius: 6px;
        }
        
        .item:last-child {
            border-bottom: none;
        }
        
        .item.in-inventory {
            background: #f0f9ff;
            border-left: 4px solid #0ea5e9;
        }
        
        .item-text {
            flex: 1;
            margin-left: 5px;
        }
        
        .item-name {
            font-weight: 500;
            font-size: 16px;
            margin-bottom: 4px;
        }
        
        .inventory-note {
            color: #16a34a;
            font-size: 14px;
            margin-top: 4px;
            font-style: italic;
            background: #f0fdf4;
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #bbf7d0;
        }
        
        .recipe-note {
            color: #666;
            font-size: 13px;
            margin-top: 4px;
            font-style: italic;
            background: #f8fafc;
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
        }
        
        .purchased {
            text-decoration: line-through;
            opacity: 0.6;
        }
        
        .print-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 50px;
            padding: 15px 20px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
        }
        
        @media print {
            .print-button { display: none; }
            body { font-size: 12pt; }
            .item { background: white; border: 1px solid #ddd; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
        <p>Generated: ${new Date().toLocaleDateString()}</p>
    </div>
    ${contentClone.innerHTML}
    <button class="print-button" onclick="window.print()">🖨️ Print</button>
</body>
</html>`;

                // Create blob and open in new tab
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const newTab = window.open(url, '_blank');

                if (!newTab) {
                    alert('Please allow popups to view the printable shopping list');
                } else {
                    // Clean up the blob URL after a delay
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                    }, 5000);
                }
            }

            function desktopPrint() {
                const contentClone = printContent.cloneNode(true);

                // Replace checkboxes with print-friendly symbols
                const checkboxes = contentClone.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    const replacement = document.createElement('span');
                    replacement.style.cssText = `
                        display: inline-block;
                        width: 12px;
                        height: 12px;
                        border: 1px solid #000;
                        margin-right: 8px;
                        text-align: center;
                        line-height: 10px;
                        font-size: 8pt;
                        vertical-align: top;
                        margin-top: 2px;
                    `;
                    replacement.textContent = checkbox.checked ? '✓' : '';
                    if (checkbox.checked) {
                        replacement.style.backgroundColor = '#000';
                        replacement.style.color = 'white';
                    }
                    checkbox.parentNode.replaceChild(replacement, checkbox);
                });

                const printWindow = window.open('', '_blank', 'width=800,height=600');

                if (!printWindow) {
                    alert('Please allow popups to print the shopping list');
                    return;
                }

                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Shopping List - ${title}</title>
                        <style>
                            @page { margin: 0.75in; size: letter; }
                            body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; margin: 0; padding: 0; color: #000; background: white; }
                            .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
                            .header h1 { margin: 0 0 5px 0; font-size: 16pt; font-weight: bold; }
                            .header p { margin: 0; font-size: 10pt; color: #666; }
                            .category { margin-bottom: 20px; page-break-inside: avoid; }
                            .category h3 { color: #333; border-bottom: 1px solid #666; padding-bottom: 3px; margin: 15px 0 8px 0; font-size: 12pt; font-weight: bold; page-break-after: avoid; }
                            .category:first-child h3 { margin-top: 0; }
                            .item { margin: 4px 0; display: flex; align-items: flex-start; page-break-inside: avoid; min-height: 16px; }
                            .item-text { flex: 1; margin-left: 0; }
                            .inventory-note { color: #16a34a; font-size: 9pt; margin-top: 1px; font-style: italic; }
                            .recipe-note { color: #666; font-size: 9pt; margin-top: 1px; font-style: italic; }
                            .purchased { text-decoration: line-through; opacity: 0.6; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>${title}</h1>
                            ${subtitle ? `<p>${subtitle}</p>` : ''}
                            <p>Generated: ${new Date().toLocaleDateString()}</p>
                        </div>
                        ${contentClone.innerHTML}
                    </body>
                    </html>
                `);

                printWindow.document.close();
                printWindow.onload = function() {
                    setTimeout(() => {
                        printWindow.print();
                        printWindow.close();
                    }, 300);
                };
            }

        } catch (error) {
            console.error('Print error:', error);
            alert('There was an error preparing the shopping list for printing');
        } finally {
            // Re-enable button
            setTimeout(() => {
                button.disabled = false;
            }, 2000);
        }
    };

    // Determine list context for saving
    const getListContext = () => {
        if (sourceRecipeIds && sourceRecipeIds.length === 1) {
            return {
                listType: 'recipe',
                contextName: normalizedList.recipes?.[0] || title,
                sourceRecipeIds: sourceRecipeIds
            };
        } else if (sourceRecipeIds && sourceRecipeIds.length > 1) {
            return {
                listType: 'recipes',
                contextName: `${sourceRecipeIds.length} Recipes`,
                sourceRecipeIds: sourceRecipeIds
            };
        } else if (sourceMealPlanId) {
            return {
                listType: 'meal-plan',
                contextName: normalizedList.recipes?.[0] || title,
                sourceMealPlanId: sourceMealPlanId
            };
        } else {
            return {
                listType: 'custom',
                contextName: title,
                sourceRecipeIds: [],
                sourceMealPlanId: null
            };
        }
    };

    const listContext = getListContext();
    const stats = getStats();
    const groupedItems = getGroupedItems();

    const handleSaveSuccess = (savedList) => {
        console.log('Shopping list saved successfully:', savedList);
        // Could show a success message or notification
    };

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
                alignItems: 'stretch',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '0'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    width: '100%',
                    maxWidth: '100vw',
                    height: '100vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Compact Header with Close Button */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        flexShrink: 0
                    }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: '#111827',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {title}
                            </h2>
                            {subtitle && (
                                <p style={{
                                    margin: '0.125rem 0 0 0',
                                    fontSize: '0.75rem',
                                    color: '#6b7280',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        <TouchEnhancedButton
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                color: '#6b7280',
                                padding: '0.5rem',
                                marginLeft: '0.5rem',
                                flexShrink: 0,
                                borderRadius: '0.375rem'
                            }}
                            className="hover:bg-gray-200 transition-colors"
                            title="Close"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>

                    {/* Compact Statistics */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: '#f8fafc',
                        flexShrink: 0
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '0.5rem'
                        }}>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                textAlign: 'center',
                                border: '1px solid #e5e7eb'
                            }}>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e293b' }}>
                                    {stats.totalItems}
                                </div>
                                <div style={{ fontSize: '0.625rem', color: '#64748b' }}>
                                    Total
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                textAlign: 'center',
                                border: '1px solid #bfdbfe'
                            }}>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0369a1' }}>
                                    {stats.inInventory}
                                </div>
                                <div style={{ fontSize: '0.625rem', color: '#0284c7' }}>
                                    Have
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                textAlign: 'center',
                                border: '1px solid #fed7aa'
                            }}>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#d97706' }}>
                                    {stats.needToBuy}
                                </div>
                                <div style={{ fontSize: '0.625rem', color: '#f59e0b' }}>
                                    Need
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                textAlign: 'center',
                                border: '1px solid #e9d5ff'
                            }}>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#7c3aed' }}>
                                    {stats.purchased}
                                </div>
                                <div style={{ fontSize: '0.625rem', color: '#8b5cf6' }}>
                                    Bought
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Compact Controls */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        backgroundColor: '#f8fafc',
                        flexShrink: 0
                    }}>
                        {/* Filter Dropdown */}
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            style={{
                                padding: '0.375rem 0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                backgroundColor: 'white',
                                flex: '1',
                                minWidth: '100px'
                            }}
                        >
                            <option value="all">All ({stats.totalItems})</option>
                            <option value="needToBuy">Need ({stats.needToBuy})</option>
                            <option value="inInventory">Have ({stats.inInventory})</option>
                            <option value="purchased">Bought ({stats.purchased})</option>
                        </select>

                        {/* Quick Actions */}
                        <TouchEnhancedButton
                            onClick={markAllAsPurchased}
                            style={{
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.375rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            ✓ All
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={clearAllPurchased}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.375rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            ✗ Clear
                        </TouchEnhancedButton>

                        {/* More Actions Toggle */}
                        <TouchEnhancedButton
                            onClick={() => setShowActions(!showActions)}
                            style={{
                                backgroundColor: '#374151',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.375rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            {showActions ? '⌄ Less' : '⋯ More'}
                        </TouchEnhancedButton>
                    </div>

                    {/* Expandable Actions Panel */}
                    {showActions && (
                        <div style={{
                            padding: '0.5rem 1rem',
                            borderBottom: '1px solid #f3f4f6',
                            backgroundColor: '#f1f5f9',
                            flexShrink: 0
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                                gap: '0.5rem'
                            }}>
                                {showRefresh && onRefresh && (
                                    <TouchEnhancedButton
                                        onClick={onRefresh}
                                        style={{
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '0.5rem',
                                            fontSize: '0.65rem',
                                            cursor: 'pointer',
                                            textAlign: 'center'
                                        }}
                                    >
                                        🔄<br/>Refresh
                                    </TouchEnhancedButton>
                                )}
                                <TouchEnhancedButton
                                    onClick={() => setShowSaveModal(true)}
                                    style={{
                                        backgroundColor: '#8b5cf6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    💾<br/>Save
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => setShowEmailModal(true)}
                                    style={{
                                        backgroundColor: '#16a34a',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    📧<br/>Share
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={handleAdvancedPrint}
                                    style={{
                                        backgroundColor: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    🖨️<br/>Print
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => {
                                        const textContent = `Shopping List - ${title}\n\n` +
                                            Object.entries(groupedItems)
                                                .map(([category, items]) => {
                                                    const categoryItems = items.map(item => {
                                                        const checkbox = item.purchased ? '☑' : '☐';
                                                        const status = item.purchased ? ' [PURCHASED]' :
                                                            item.inInventory ? ' [IN INVENTORY]' : '';
                                                        const recipes = item.recipes && item.recipes.length > 0 ?
                                                            ` (${item.recipes.join(', ')})` : '';
                                                        return `  ${checkbox} ${item.amount ? `${item.amount} ` : ''}${item.ingredient || item.name}${status}${recipes}`;
                                                    });
                                                    return `${category}:\n${categoryItems.join('\n')}`;
                                                })
                                                .join('\n\n');

                                        const blob = new Blob([textContent], { type: 'text/plain' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `shopping-list-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                    style={{
                                        backgroundColor: '#0891b2',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    📝<br/>Text
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    )}

                    {/* Main Shopping List Content - Scrollable */}
                    <div
                        id="unified-shopping-list-content"
                        style={{
                            flex: 1,
                            padding: '1rem',
                            overflow: 'auto',
                            backgroundColor: 'white',
                            minHeight: 0  // Important for flex scrolling
                        }}
                    >
                        {Object.keys(groupedItems).length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '2rem 1rem',
                                color: '#6b7280'
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛒</div>
                                <p>No items match the current filter</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {Object.entries(groupedItems).map(([category, items]) => (
                                    <div key={category}>
                                        <h3 style={{
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            color: '#374151',
                                            margin: '0 0 0.75rem 0',
                                            padding: '0.5rem 0',
                                            borderBottom: '2px solid #e5e7eb',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span>{category}</span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: '400',
                                                color: '#6b7280',
                                                backgroundColor: '#f3f4f6',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '12px'
                                            }}>
                                                {items.length}
                                            </span>
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                                                            backgroundColor: isPurchased ? '#f0fdf4' : '#fafafa',
                                                            borderRadius: '8px',
                                                            border: '1px solid #e5e7eb',
                                                            opacity: isPurchased ? 0.7 : 1,
                                                            textDecoration: isPurchased ? 'line-through' : 'none'
                                                        }}
                                                    >
                                                        {/* Large, Touch-Friendly Checkbox */}
                                                        <input
                                                            type="checkbox"
                                                            checked={isPurchased}
                                                            onChange={() => handleItemToggle(itemKey)}
                                                            style={{
                                                                marginTop: '0.125rem',
                                                                cursor: 'pointer',
                                                                transform: 'scale(1.3)',  // Bigger for mobile
                                                                accentColor: '#8b5cf6'
                                                            }}
                                                        />

                                                        {/* Item Details */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{
                                                                fontWeight: '500',
                                                                color: '#374151',
                                                                fontSize: '0.95rem',
                                                                lineHeight: '1.4',
                                                                marginBottom: '0.25rem'
                                                            }}>
                                                                {item.amount && `${item.amount} `}{item.ingredient || item.name}
                                                            </div>

                                                            {/* Inventory Status */}
                                                            {item.inInventory && (
                                                                <div style={{
                                                                    fontSize: '0.8rem',
                                                                    color: '#16a34a',
                                                                    backgroundColor: '#f0fdf4',
                                                                    padding: '0.25rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    marginBottom: '0.25rem',
                                                                    border: '1px solid #bbf7d0'
                                                                }}>
                                                                    ✅ In inventory: {item.haveAmount || 'Available'}
                                                                    {item.inventoryItem?.location &&
                                                                        ` (${item.inventoryItem.location})`
                                                                    }
                                                                </div>
                                                            )}

                                                            {/* Recipe References */}
                                                            {item.recipes && item.recipes.length > 0 && (
                                                                <div style={{
                                                                    fontSize: '0.7rem',
                                                                    color: '#6b7280',
                                                                    backgroundColor: '#f8fafc',
                                                                    padding: '0.25rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #e2e8f0'
                                                                }}>
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
                    </div>

                    {/* Footer with Close Button */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderTop: '1px solid #e5e7eb',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexShrink: 0
                    }}>
                        <div style={{
                            fontSize: '0.7rem',
                            color: '#6b7280'
                        }}>
                            {normalizedList.generatedAt && (
                                `Generated ${new Date(normalizedList.generatedAt).toLocaleString()}`
                            )}
                        </div>
                        <TouchEnhancedButton
                            onClick={onClose}
                            style={{
                                backgroundColor: '#374151',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.5rem 1rem',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>

            {/* Email Share Modal */}
            <EmailSharingModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                shoppingList={normalizedList}
                context={listContext.listType}
                contextName={listContext.contextName}
            />

            {/* Save Shopping List Modal */}
            <SaveShoppingListModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={handleSaveSuccess}
                shoppingList={normalizedList}
                listType={listContext.listType}
                contextName={listContext.contextName}
                sourceRecipeIds={listContext.sourceRecipeIds}
                sourceMealPlanId={listContext.sourceMealPlanId}
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