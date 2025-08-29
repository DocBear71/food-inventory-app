// file: /src/lib/shoppingListUtils.js v1 - Standardized utilities for shopping lists

/**
 * Normalize shopping list data structure for consistency across components
 */
export function normalizeShoppingListData(shoppingList) {
    if (!shoppingList) {
        return {
            items: {},
            summary: { totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0 },
            recipes: [],
            generatedAt: new Date().toISOString()
        };
    }

    let normalizedItems = {};
    let summary = shoppingList.summary || shoppingList.stats || {};

    // Handle different data structures
    if (shoppingList.items) {
        if (Array.isArray(shoppingList.items)) {
            // Convert array to categorized object
            shoppingList.items.forEach(item => {
                const category = item.category || 'Other';
                if (!normalizedItems[category]) {
                    normalizedItems[category] = [];
                }
                normalizedItems[category].push({
                    name: item.name || item.ingredient,
                    ingredient: item.ingredient || item.name,
                    amount: item.amount || '',
                    unit: item.unit || '',
                    category: category,
                    recipes: item.recipes || [],
                    inInventory: item.inInventory || false,
                    inventoryItem: item.inventoryItem || null,
                    purchased: item.purchased || false,
                    itemKey: item.itemKey || `${item.name || item.ingredient}-${category}`,
                    haveAmount: item.haveAmount || '',
                    needAmount: item.needAmount || '',
                    notes: item.notes || ''
                });
            });
        } else if (typeof shoppingList.items === 'object') {
            // Already categorized - normalize item structure
            Object.entries(shoppingList.items).forEach(([category, items]) => {
                normalizedItems[category] = items.map(item => ({
                    name: item.name || item.ingredient,
                    ingredient: item.ingredient || item.name,
                    amount: item.amount || '',
                    unit: item.unit || '',
                    category: category,
                    recipes: item.recipes || [],
                    inInventory: item.inInventory || false,
                    inventoryItem: item.inventoryItem || null,
                    purchased: item.purchased || false,
                    itemKey: item.itemKey || `${item.name || item.ingredient}-${category}`,
                    haveAmount: item.haveAmount || '',
                    needAmount: item.needAmount || '',
                    notes: item.notes || ''
                }));
            });
        }
    }

    // Calculate summary if not provided
    if (!summary.totalItems) {
        const allItems = Object.values(normalizedItems).flat();
        summary = {
            totalItems: allItems.length,
            needToBuy: allItems.filter(item => !item.inInventory && !item.purchased).length,
            inInventory: allItems.filter(item => item.inInventory).length,
            purchased: allItems.filter(item => item.purchased).length
        };
    }

    return {
        items: normalizedItems,
        summary: {
            totalItems: summary.totalItems || 0,
            needToBuy: summary.needToBuy || 0,
            inInventory: summary.inInventory || summary.alreadyHave || 0,
            purchased: summary.purchased || 0
        },
        recipes: shoppingList.recipes || [],
        generatedAt: shoppingList.generatedAt || new Date().toISOString(),
        metadata: shoppingList.metadata || {}
    };
}

/**
 * Advanced print function with mobile optimization
 */
export function createAdvancedPrintFunction(options = {}) {
    const {
        contentElementId = 'shopping-list-content',
        title = 'Shopping List',
        subtitle = null,
        getGroupedItems,
        onError = (error) => console.error('Print error:', error)
    } = options;

    return async function handleAdvancedPrint(event) {
        // Prevent multiple clicks
        const button = event?.target;
        if (button?.disabled) return;
        if (button) button.disabled = true;

        try {
            const printContent = document.getElementById(contentElementId);

            if (!printContent) {
                const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Print Error',
                    message: 'Could not find shopping list content to print'
                });
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
                // Desktop: Use popup window
                desktopPrint();
            }

            function shareShoppingList() {
                // Create text version for sharing
                const textContent = generatePlainTextShoppingList(title, subtitle, getGroupedItems);

                navigator.share({
                    title: `Shopping List - ${title}`,
                    text: textContent
                }).catch((error) => {
                    console.log('Share failed, trying fallback:', error);
                    openInNewTab();
                });
            }

            async function openInNewTab() {
                const htmlContent = generatePrintableHTML(printContent, title, subtitle, true);

                // Create blob and open in new tab
                const blob = new Blob([htmlContent], {type: 'text/html'});
                const url = URL.createObjectURL(blob);
                const newTab = window.open(url, '_blank');

                if (!newTab) {
                    const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showAlert({
                        title: 'Pop-up Blocked',
                        message: 'Please allow popups to view the printable shopping list'
                    });
                } else {
                    // Clean up the blob URL after a delay
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                    }, 5000);
                }
            }

            async function desktopPrint() {
                const printWindow = window.open('', '_blank', 'width=800,height=600');

                if (!printWindow) {
                    const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showAlert({
                        title: 'Pop-up Blocked',
                        message: 'Please allow popups to print the shopping list'
                    });
                    return;
                }

                const htmlContent = generatePrintableHTML(printContent, title, subtitle, false);
                printWindow.document.write(htmlContent);
                printWindow.document.close();

                printWindow.onload = function () {
                    setTimeout(() => {
                        printWindow.print();
                        printWindow.close();
                    }, 300);
                };
            }

        } catch (error) {
            onError(error);
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Print Preparation Failed',
                message: 'There was an error preparing the shopping list for printing'
            });
        } finally {
            // Re-enable button
            if (button) {
                setTimeout(() => {
                    button.disabled = false;
                }, 2000);
            }
        }
    };
}

/**
 * Generate printable HTML content
 */
function generatePrintableHTML(contentElement, title, subtitle, isMobile) {
    const contentClone = contentElement.cloneNode(true);

    // Replace checkboxes with print-friendly symbols
    const checkboxes = contentClone.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        const replacement = document.createElement('span');
        replacement.style.cssText = `
            display: inline-block;
            width: ${isMobile ? '14px' : '12px'};
            height: ${isMobile ? '14px' : '12px'};
            border: ${isMobile ? '2px' : '1px'} solid #000;
            margin-right: ${isMobile ? '10px' : '8px'};
            text-align: center;
            line-height: ${isMobile ? '10px' : '10px'};
            font-size: ${isMobile ? '10pt' : '8pt'};
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

    const styles = isMobile ? getMobileStyles() : getDesktopStyles();

    return `<!DOCTYPE html>
<html>
<head>
    <title>Shopping List - ${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>${styles}</style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
        <p>Generated: ${new Date().toLocaleDateString()}</p>
    </div>
    ${contentClone.innerHTML}
    ${isMobile ? '<button class="print-button" onclick="window.print()">🖨️ Print</button>' : ''}
</body>
</html>`;
}

/**
 * Generate plain text shopping list for sharing
 */
function generatePlainTextShoppingList(title, subtitle, getGroupedItems) {
    let textContent = `Shopping List - ${title}\n`;
    if (subtitle) textContent += `${subtitle}\n`;
    textContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;

    if (getGroupedItems) {
        const groupedItems = getGroupedItems();
        textContent += Object.entries(groupedItems)
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
    }

    return textContent;
}

/**
 * Mobile-optimized print styles
 */
function getMobileStyles() {
    return `
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
    `;
}

/**
 * Desktop-optimized print styles
 */
function getDesktopStyles() {
    return `
        @page { margin: 0.75in; size: letter; }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 11pt; 
            line-height: 1.4; 
            margin: 0; 
            padding: 0; 
            color: #000; 
            background: white; 
        }
        .header { 
            text-align: center; 
            margin-bottom: 20px; 
            padding-bottom: 10px; 
            border-bottom: 2px solid #333; 
        }
        .header h1 { 
            margin: 0 0 5px 0; 
            font-size: 16pt; 
            font-weight: bold; 
        }
        .header p { 
            margin: 0; 
            font-size: 10pt; 
            color: #666; 
        }
        .category { 
            margin-bottom: 20px; 
            page-break-inside: avoid; 
        }
        .category h3 { 
            color: #333; 
            border-bottom: 1px solid #666; 
            padding-bottom: 3px; 
            margin: 15px 0 8px 0; 
            font-size: 12pt; 
            font-weight: bold; 
            page-break-after: avoid; 
        }
        .category:first-child h3 { 
            margin-top: 0; 
        }
        .item { 
            margin: 4px 0; 
            display: flex; 
            align-items: flex-start; 
            page-break-inside: avoid; 
            min-height: 16px; 
        }
        .item-text { 
            flex: 1; 
            margin-left: 0; 
        }
        .inventory-note { 
            color: #16a34a; 
            font-size: 9pt; 
            margin-top: 1px; 
            font-style: italic; 
        }
        .recipe-note { 
            color: #666; 
            font-size: 9pt; 
            margin-top: 1px; 
            font-style: italic; 
        }
        .purchased { 
            text-decoration: line-through; 
            opacity: 0.6; 
        }
    `;
}

/**
 * Create download function for text format
 */
export function createTextDownloadFunction(title, getGroupedItems) {
    return function downloadAsText() {
        const textContent = generatePlainTextShoppingList(title, null, getGroupedItems);

        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shopping-list-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };
}

/**
 * Determine shopping list context for saving
 */
export function getShoppingListContext(sourceRecipeIds = [], sourceMealPlanId = null, recipes = [], title = 'Shopping List') {
    if (sourceRecipeIds && sourceRecipeIds.length === 1) {
        return {
            listType: 'recipe',
            contextName: recipes?.[0] || title,
            sourceRecipeIds: sourceRecipeIds,
            sourceMealPlanId: null
        };
    } else if (sourceRecipeIds && sourceRecipeIds.length > 1) {
        return {
            listType: 'recipes',
            contextName: `${sourceRecipeIds.length} Recipes`,
            sourceRecipeIds: sourceRecipeIds,
            sourceMealPlanId: null
        };
    } else if (sourceMealPlanId) {
        return {
            listType: 'meal-plan',
            contextName: recipes?.[0] || title,
            sourceRecipeIds: [],
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
}

/**
 * Calculate shopping list statistics with purchased items
 */
export function calculateShoppingListStats(items, purchasedItems = {}) {
    if (!items || typeof items !== 'object') {
        return { totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0 };
    }

    const allItems = Object.values(items).flat();

    const itemsWithStatus = allItems.map(item => {
        const itemKey = `${item.ingredient || item.name}-${item.category || 'other'}`;
        return {
            ...item,
            purchased: purchasedItems[itemKey] || false
        };
    });

    return {
        totalItems: itemsWithStatus.length,
        needToBuy: itemsWithStatus.filter(item => !item.inInventory && !item.purchased).length,
        inInventory: itemsWithStatus.filter(item => item.inInventory).length,
        purchased: itemsWithStatus.filter(item => item.purchased).length
    };
}

/**
 * Filter shopping list items based on criteria
 */
export function filterShoppingListItems(items, filter, purchasedItems = {}) {
    if (!items || typeof items !== 'object') {
        return {};
    }

    const filtered = {};

    Object.entries(items).forEach(([category, categoryItems]) => {
        const itemsWithStatus = categoryItems.map(item => {
            const itemKey = `${item.ingredient || item.name}-${item.category || 'other'}`;
            return {
                ...item,
                purchased: purchasedItems[itemKey] || false,
                itemKey
            };
        });

        let filteredItems;
        switch (filter) {
            case 'needToBuy':
                filteredItems = itemsWithStatus.filter(item => !item.inInventory && !item.purchased);
                break;
            case 'inInventory':
                filteredItems = itemsWithStatus.filter(item => item.inInventory);
                break;
            case 'purchased':
                filteredItems = itemsWithStatus.filter(item => item.purchased);
                break;
            default:
                filteredItems = itemsWithStatus;
        }

        if (filteredItems.length > 0) {
            filtered[category] = filteredItems;
        }
    });

    return filtered;
}

/**
 * Create standardized shopping list actions
 */
export function createShoppingListActions(items, setPurchasedItems) {
    const markAllAsPurchased = () => {
        if (!items || typeof items !== 'object') return;

        const allItems = {};
        Object.values(items).flat().forEach(item => {
            const itemKey = `${item.ingredient || item.name}-${item.category || 'other'}`;
            allItems[itemKey] = true;
        });
        setPurchasedItems(allItems);
    };

    const clearAllPurchased = () => {
        setPurchasedItems({});
    };

    const handleItemToggle = (itemKey) => {
        setPurchasedItems(prev => ({
            ...prev,
            [itemKey]: !prev[itemKey]
        }));
    };

    return {
        markAllAsPurchased,
        clearAllPurchased,
        handleItemToggle
    };
}

/**
 * Validate shopping list data structure
 */
export function validateShoppingListData(shoppingList) {
    const errors = [];
    const warnings = [];

    if (!shoppingList) {
        errors.push('Shopping list data is required');
        return { isValid: false, errors, warnings };
    }

    if (!shoppingList.items) {
        errors.push('Shopping list must have items');
    } else if (typeof shoppingList.items !== 'object') {
        errors.push('Shopping list items must be an object or array');
    } else if (Array.isArray(shoppingList.items) && shoppingList.items.length === 0) {
        warnings.push('Shopping list is empty');
    } else if (typeof shoppingList.items === 'object' && Object.keys(shoppingList.items).length === 0) {
        warnings.push('Shopping list is empty');
    }

    // Validate item structure
    if (shoppingList.items) {
        const allItems = Array.isArray(shoppingList.items)
            ? shoppingList.items
            : Object.values(shoppingList.items).flat();

        allItems.forEach((item, index) => {
            if (!item.name && !item.ingredient) {
                errors.push(`Item at index ${index} missing name/ingredient`);
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Create standard shopping list props for consistency
 */
export function createStandardShoppingListProps({
                                                    shoppingList,
                                                    title,
                                                    subtitle = null,
                                                    sourceRecipeIds = [],
                                                    sourceMealPlanId = null,
                                                    onClose,
                                                    onRefresh = null,
                                                    showRefresh = false
                                                }) {
    const validation = validateShoppingListData(shoppingList);

    if (!validation.isValid) {
        console.error('Invalid shopping list data:', validation.errors);
    }

    const normalizedList = normalizeShoppingListData(shoppingList);
    const context = getShoppingListContext(sourceRecipeIds, sourceMealPlanId, normalizedList.recipes, title);

    return {
        shoppingList: normalizedList,
        title: title || '🛒 Shopping List',
        subtitle,
        sourceRecipeIds,
        sourceMealPlanId,
        onClose,
        onRefresh,
        showRefresh,
        context,
        validation
    };
}

/**
 * Export all utilities as a unified object for easy importing
 */
export const ShoppingListUtils = {
    normalizeShoppingListData,
    createAdvancedPrintFunction,
    createTextDownloadFunction,
    getShoppingListContext,
    calculateShoppingListStats,
    filterShoppingListItems,
    createShoppingListActions,
    validateShoppingListData,
    createStandardShoppingListProps
};