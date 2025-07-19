// file: /src/lib/shoppingListPrinter.js v1 - Comprehensive shopping list printing with templates

export class ShoppingListPrinter {
    constructor(options = {}) {
        this.defaultOptions = {
            // Page settings
            pageSize: 'letter', // 'letter', 'a4', 'legal'
            orientation: 'portrait', // 'portrait', 'landscape'
            margins: {
                top: '0.5in',
                bottom: '0.5in',
                left: '0.5in',
                right: '0.5in'
            },

            // Content settings
            fontSize: '11pt',
            fontFamily: 'Arial, sans-serif',
            showCheckboxes: true,
            showCategories: true,
            showPrices: true,
            showRecipes: true,
            showInventoryStatus: true,
            showTotals: true,

            // Layout settings
            columnsPerPage: 1, // 1, 2, or 3
            itemSpacing: '0.2em',
            categorySpacing: '1em',

            // Header/Footer
            showHeader: true,
            showFooter: true,
            showDate: true,
            showStoreName: false,
            storeName: '',

            // Custom styling
            headerColor: '#2563eb',
            categoryColor: '#4b5563',
            accentColor: '#8b5cf6',

            ...options
        };
    }

    // Generate print-optimized HTML
    generatePrintHTML(shoppingList, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        const normalizedList = this.normalizeShoppingList(shoppingList);

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shopping List - ${opts.title || 'Doc Bear\'s Comfort Kitchen'}</title>
    <style>
        ${this.generateCSS(opts)}
    </style>
</head>
<body>
    <div class="print-container">
        ${opts.showHeader ? this.generateHeader(normalizedList, opts) : ''}
        
        <div class="shopping-list-content">
            ${this.generateShoppingListContent(normalizedList, opts)}
        </div>
        
        ${opts.showTotals && normalizedList.totals ? this.generateTotalsSection(normalizedList.totals, opts) : ''}
        
        ${opts.showFooter ? this.generateFooter(opts) : ''}
    </div>
</body>
</html>`;

        return html;
    }

    // Generate CSS for print layout
    generateCSS(opts) {
        return `
            /* Reset and base styles */
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: ${opts.fontFamily};
                font-size: ${opts.fontSize};
                line-height: 1.4;
                color: #000;
                background: white;
            }
            
            /* Print-specific styles */
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .print-container {
                    width: 100%;
                    max-width: none;
                }
                
                .page-break {
                    page-break-before: always;
                }
                
                .no-break {
                    page-break-inside: avoid;
                }
                
                .category-section {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                
                .shopping-item {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
            }
            
            /* Page setup */
            @page {
                size: ${opts.pageSize} ${opts.orientation};
                margin: ${opts.margins.top} ${opts.margins.right} ${opts.margins.bottom} ${opts.margins.left};
            }
            
            /* Container */
            .print-container {
                max-width: 8.5in;
                margin: 0 auto;
                padding: 0;
            }
            
            /* Header styles */
            .print-header {
                text-align: center;
                margin-bottom: 1.5em;
                padding-bottom: 0.5em;
                border-bottom: 2px solid ${opts.headerColor};
            }
            
            .print-title {
                font-size: 1.5em;
                font-weight: bold;
                color: ${opts.headerColor};
                margin-bottom: 0.3em;
            }
            
            .print-subtitle {
                font-size: 0.9em;
                color: #666;
                margin-bottom: 0.2em;
            }
            
            .print-meta {
                font-size: 0.8em;
                color: #888;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 1em;
            }
            
            /* Store header */
            .store-header {
                background-color: #f8fafc;
                padding: 0.75em;
                margin-bottom: 1em;
                border-radius: 6px;
                border: 1px solid #e2e8f0;
                text-align: center;
            }
            
            .store-name {
                font-size: 1.2em;
                font-weight: bold;
                color: ${opts.headerColor};
                margin-bottom: 0.3em;
            }
            
            .store-layout-info {
                font-size: 0.85em;
                color: #666;
            }
            
            /* Shopping list content */
            .shopping-list-content {
                ${opts.columnsPerPage > 1 ? `
                    column-count: ${opts.columnsPerPage};
                    column-gap: 1.5em;
                    column-fill: balance;
                ` : ''}
            }
            
            /* Category sections */
            .category-section {
                margin-bottom: ${opts.categorySpacing};
                ${opts.columnsPerPage > 1 ? 'break-inside: avoid;' : ''}
            }
            
            .category-header {
                font-size: 1.1em;
                font-weight: bold;
                color: ${opts.categoryColor};
                margin-bottom: 0.5em;
                padding: 0.4em 0;
                border-bottom: 1px solid #ddd;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .category-count {
                font-size: 0.8em;
                font-weight: normal;
                color: #888;
                background: #f3f4f6;
                padding: 0.2em 0.5em;
                border-radius: 12px;
            }
            
            /* Shopping items */
            .shopping-items {
                list-style: none;
                margin-left: 0;
            }
            
            .shopping-item {
                display: flex;
                align-items: flex-start;
                margin-bottom: ${opts.itemSpacing};
                padding: 0.3em 0;
                min-height: 1.8em;
            }
            
            .item-checkbox {
                width: 1em;
                height: 1em;
                border: 1.5px solid #666;
                border-radius: 2px;
                margin-right: 0.7em;
                margin-top: 0.1em;
                flex-shrink: 0;
                background: white;
            }
            
            .item-content {
                flex: 1;
                min-width: 0;
            }
            
            .item-name {
                font-weight: 500;
                color: #000;
                line-height: 1.3;
            }
            
            .item-details {
                font-size: 0.85em;
                color: #666;
                margin-top: 0.1em;
                line-height: 1.2;
            }
            
            .item-price {
                font-weight: 500;
                color: #059669;
                margin-right: 0.5em;
            }
            
            .item-estimated {
                color: #f59e0b;
                font-style: italic;
            }
            
            .item-recipes {
                color: #6366f1;
                font-size: 0.8em;
            }
            
            .item-inventory {
                color: #059669;
                background: #f0fdf4;
                padding: 0.1em 0.3em;
                border-radius: 3px;
                font-size: 0.8em;
                margin-right: 0.3em;
                border: 1px solid #bbf7d0;
            }
            
            /* Totals section */
            .totals-section {
                margin-top: 2em;
                padding: 1em;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                page-break-inside: avoid;
            }
            
            .totals-title {
                font-size: 1.2em;
                font-weight: bold;
                color: ${opts.headerColor};
                margin-bottom: 0.8em;
                text-align: center;
            }
            
            .totals-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1em;
            }
            
            .totals-main {
                background: white;
                padding: 0.8em;
                border-radius: 4px;
                border: 1px solid #d1d5db;
            }
            
            .totals-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.3em;
                padding: 0.2em 0;
            }
            
            .totals-row.total {
                font-weight: bold;
                font-size: 1.1em;
                border-top: 1px solid #666;
                padding-top: 0.5em;
                margin-top: 0.5em;
            }
            
            .budget-info {
                background: #ecfdf5;
                padding: 0.8em;
                border-radius: 4px;
                border: 1px solid #bbf7d0;
            }
            
            .budget-warning {
                background: #fef2f2;
                border-color: #fecaca;
                color: #991b1b;
            }
            
            .category-breakdown {
                background: white;
                padding: 0.8em;
                border-radius: 4px;
                border: 1px solid #d1d5db;
            }
            
            .category-breakdown-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.2em;
                font-size: 0.9em;
            }
            
            /* Footer */
            .print-footer {
                margin-top: 2em;
                padding-top: 1em;
                border-top: 1px solid #ddd;
                text-align: center;
                font-size: 0.8em;
                color: #666;
            }
            
            /* Store layout specific styles */
            .store-layout-route {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                padding: 0.8em;
                margin-bottom: 1.5em;
            }
            
            .route-title {
                font-weight: bold;
                color: #92400e;
                margin-bottom: 0.5em;
                display: flex;
                align-items: center;
                gap: 0.5em;
            }
            
            .route-steps {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 0.5em;
                font-size: 0.85em;
            }
            
            .route-step {
                display: flex;
                align-items: center;
                gap: 0.3em;
            }
            
            .step-number {
                background: #3b82f6;
                color: white;
                border-radius: 50%;
                width: 1.5em;
                height: 1.5em;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8em;
                font-weight: bold;
                flex-shrink: 0;
            }
            
            /* Responsive adjustments for smaller prints */
            @media print and (max-width: 6in) {
                .shopping-list-content {
                    column-count: 1 !important;
                }
                
                .totals-grid {
                    grid-template-columns: 1fr;
                }
                
                .print-meta {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.3em;
                }
            }
            
            /* Dark mode support for screen preview */
            @media screen and (prefers-color-scheme: dark) {
                body {
                    background: white;
                    color: black;
                }
            }
        `;
    }

    // Generate header section
    generateHeader(normalizedList, opts) {
        const currentDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const currentTime = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="print-header">
                <div class="print-title">
                    🛒 ${opts.title || 'Shopping List'}
                </div>
                ${opts.subtitle ? `<div class="print-subtitle">${opts.subtitle}</div>` : ''}
                <div class="print-meta">
                    ${opts.showDate ? `<span>📅 ${currentDate} at ${currentTime}</span>` : ''}
                    <span>📦 ${normalizedList.totalItems || 0} items</span>
                    ${normalizedList.totalCategories ? `<span>📂 ${normalizedList.totalCategories} categories</span>` : ''}
                </div>
            </div>
            
            ${opts.showStoreName && opts.storeName ? `
                <div class="store-header">
                    <div class="store-name">🏪 ${opts.storeName}</div>
                    ${opts.storeLayoutInfo ? `<div class="store-layout-info">${opts.storeLayoutInfo}</div>` : ''}
                </div>
            ` : ''}
            
            ${opts.shoppingRoute ? this.generateRouteSection(opts.shoppingRoute) : ''}
        `;
    }

    // Generate shopping route section
    generateRouteSection(route) {
        if (!route || !route.route) return '';

        return `
            <div class="store-layout-route">
                <div class="route-title">
                    🗺️ Optimal Shopping Route
                    <span style="font-weight: normal; font-size: 0.9em;">
                        (~${route.totalTime} minutes, ${route.totalSections} sections)
                    </span>
                </div>
                <div class="route-steps">
                    ${route.route.map((section, index) => `
                        <div class="route-step">
                            <div class="step-number">${index + 1}</div>
                            <span>${section.emoji || '📍'} ${section.section}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Generate main shopping list content
    generateShoppingListContent(normalizedList, opts) {
        if (!normalizedList.items || Object.keys(normalizedList.items).length === 0) {
            return '<p style="text-align: center; color: #666; font-style: italic;">No items in shopping list</p>';
        }

        // Sort categories for consistent printing
        const sortedCategories = Object.entries(normalizedList.items)
            .sort(([a], [b]) => a.localeCompare(b));

        return sortedCategories.map(([categoryName, items]) => {
            if (!items || items.length === 0) return '';

            return `
                <div class="category-section no-break">
                    <div class="category-header">
                        <span>${categoryName}</span>
                        <span class="category-count">${items.length}</span>
                    </div>
                    <ul class="shopping-items">
                        ${items.map(item => this.generateItemHTML(item, opts)).join('')}
                    </ul>
                </div>
            `;
        }).join('');
    }

    // Generate individual item HTML
    generateItemHTML(item, opts) {
        const hasPrice = !!(item.price || item.unitPrice || item.estimatedPrice);
        const price = item.price || item.unitPrice || item.estimatedPrice;
        const isEstimated = !!(item.estimatedPrice && !item.price && !item.unitPrice);
        const amount = item.amount || '';
        const name = item.ingredient || item.name || 'Unknown item';

        const details = [];

        // Add price information
        if (opts.showPrices && hasPrice) {
            const formattedPrice = this.formatCurrency(price);
            details.push(`<span class="item-price ${isEstimated ? 'item-estimated' : ''}">${formattedPrice}${isEstimated ? ' (est.)' : ''}</span>`);
        }

        // Add inventory status
        if (opts.showInventoryStatus && item.inInventory) {
            details.push(`<span class="item-inventory">✅ Have: ${item.haveAmount || 'Available'}</span>`);
        }

        // Add recipe references
        if (opts.showRecipes && item.recipes && item.recipes.length > 0) {
            details.push(`<span class="item-recipes">Used in: ${item.recipes.join(', ')}</span>`);
        }

        return `
            <li class="shopping-item">
                ${opts.showCheckboxes ? '<div class="item-checkbox"></div>' : ''}
                <div class="item-content">
                    <div class="item-name">
                        ${amount ? `${amount} ` : ''}${name}
                    </div>
                    ${details.length > 0 ? `<div class="item-details">${details.join(' • ')}</div>` : ''}
                </div>
            </li>
        `;
    }

    // Generate totals section
    generateTotalsSection(totals, opts) {
        if (!totals) return '';

        const budget = totals.budget;
        const isOverBudget = totals.isOverBudget;
        const categories = totals.categories || [];

        return `
            <div class="totals-section">
                <div class="totals-title">💰 Shopping List Totals</div>
                <div class="totals-grid">
                    <div class="totals-main">
                        <div class="totals-row">
                            <span>Subtotal (${totals.totalItems || 0} items):</span>
                            <span>${totals.subtotal || '$0.00'}</span>
                        </div>
                        ${totals.taxAmount && parseFloat(totals.taxAmount.replace(/[^0-9.-]/g, '')) > 0 ? `
                            <div class="totals-row">
                                <span>Tax:</span>
                                <span>${totals.tax || '$0.00'}</span>
                            </div>
                        ` : ''}
                        ${totals.discountAmount && parseFloat(totals.discountAmount.replace(/[^0-9.-]/g, '')) > 0 ? `
                            <div class="totals-row">
                                <span>Discounts:</span>
                                <span>-${totals.discount || '$0.00'}</span>
                            </div>
                        ` : ''}
                        <div class="totals-row total">
                            <span>Total:</span>
                            <span>${totals.total || '$0.00'}</span>
                        </div>
                    </div>
                    
                    ${budget ? `
                        <div class="budget-info ${isOverBudget ? 'budget-warning' : ''}">
                            <div class="totals-row">
                                <span>Budget:</span>
                                <span>${totals.budget}</span>
                            </div>
                            <div class="totals-row">
                                <span>${isOverBudget ? 'Over by:' : 'Remaining:'}:</span>
                                <span>${totals.budgetRemaining}</span>
                            </div>
                            <div class="totals-row">
                                <span>Used:</span>
                                <span>${totals.budgetPercentUsed || 0}%</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${categories.length > 1 ? `
                        <div class="category-breakdown">
                            <div style="font-weight: bold; margin-bottom: 0.5em; color: #374151;">By Category:</div>
                            ${categories.map(cat => `
                                <div class="category-breakdown-item">
                                    <span>${cat.name} (${cat.itemCount}):</span>
                                    <span>${cat.formattedTotal || '$0.00'}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                ${totals.warnings && totals.warnings.length > 0 ? `
                    <div style="margin-top: 1em; font-size: 0.85em; color: #666;">
                        <div style="font-weight: 500; margin-bottom: 0.3em;">📝 Notes:</div>
                        <ul style="margin-left: 1.2em; line-height: 1.3;">
                            ${totals.warnings.map(warning => `<li>${warning}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Generate footer section
    generateFooter(opts) {
        return `
            <div class="print-footer">
                <p>Created with Doc Bear's Comfort Kitchen • docbearscomfort.kitchen</p>
                ${opts.customFooter ? `<p>${opts.customFooter}</p>` : ''}
            </div>
        `;
    }

    // Format currency
    formatCurrency(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
        return `$${amount.toFixed(2)}`;
    }

    // Normalize shopping list structure
    normalizeShoppingList(shoppingList) {
        if (!shoppingList) return { items: {}, totalItems: 0, totalCategories: 0 };

        let normalizedItems = {};
        let totalItems = 0;

        if (shoppingList.items) {
            if (Array.isArray(shoppingList.items)) {
                // Convert array to categorized object
                shoppingList.items.forEach(item => {
                    const category = item.category || 'Other';
                    if (!normalizedItems[category]) {
                        normalizedItems[category] = [];
                    }
                    normalizedItems[category].push(item);
                    totalItems++;
                });
            } else if (typeof shoppingList.items === 'object') {
                // Already categorized
                normalizedItems = shoppingList.items;
                totalItems = Object.values(normalizedItems).reduce((sum, items) => sum + items.length, 0);
            }
        }

        return {
            ...shoppingList,
            items: normalizedItems,
            totalItems,
            totalCategories: Object.keys(normalizedItems).length
        };
    }

    // Print shopping list
    async printShoppingList(shoppingList, options = {}) {
        try {
            console.log('🖨️ Starting print process...');

            const printHTML = this.generatePrintHTML(shoppingList, options);

            // Open print window
            const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');

            if (!printWindow) {
                throw new Error('Pop-up blocked. Please allow pop-ups for printing.');
            }

            // Write HTML to print window
            printWindow.document.write(printHTML);
            printWindow.document.close();

            // Wait for content to load, then print
            printWindow.onload = () => {
                console.log('🖨️ Print window loaded, triggering print dialog...');
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();

                    // Close print window after print dialog
                    setTimeout(() => {
                        printWindow.close();
                    }, 1000);
                }, 500);
            };

            return true;
        } catch (error) {
            console.error('❌ Print error:', error);
            throw error;
        }
    }

    // Generate PDF (browser-based)
    async generatePDF(shoppingList, options = {}) {
        try {
            const printHTML = this.generatePrintHTML(shoppingList, {
                ...options,
                showFooter: false // PDFs handle their own footer
            });

            // Create hidden iframe for PDF generation
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.width = '8.5in';
            iframe.style.height = '11in';

            document.body.appendChild(iframe);

            iframe.contentDocument.write(printHTML);
            iframe.contentDocument.close();

            // Wait for content to render
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Trigger print to PDF
            iframe.contentWindow.focus();
            iframe.contentWindow.print();

            // Clean up
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 2000);

            return true;
        } catch (error) {
            console.error('❌ PDF generation error:', error);
            throw error;
        }
    }

    // Export as text file
    exportAsText(shoppingList, options = {}) {
        const normalized = this.normalizeShoppingList(shoppingList);
        const title = options.title || 'Shopping List';
        const showPrices = options.showPrices !== false;
        const showRecipes = options.showRecipes !== false;

        let output = `${title}\n`;
        output += '='.repeat(title.length) + '\n\n';

        if (options.showDate !== false) {
            output += `Generated: ${new Date().toLocaleString()}\n`;
            output += `Total Items: ${normalized.totalItems}\n\n`;
        }

        // Add store information
        if (options.storeName) {
            output += `Store: ${options.storeName}\n\n`;
        }

        // Add shopping route
        if (options.shoppingRoute) {
            output += 'Shopping Route:\n';
            options.shoppingRoute.route.forEach((section, index) => {
                output += `  ${index + 1}. ${section.section} (${section.itemCount} items)\n`;
            });
            output += '\n';
        }

        // Add categories and items
        Object.entries(normalized.items).forEach(([category, items]) => {
            output += `${category.toUpperCase()} (${items.length} items):\n`;
            output += '-'.repeat(category.length + 10) + '\n';

            items.forEach(item => {
                const checkbox = '☐';
                const amount = item.amount ? `${item.amount} ` : '';
                const name = item.ingredient || item.name;
                const price = showPrices && (item.price || item.unitPrice || item.estimatedPrice) ?
                    ` - ${this.formatCurrency(item.price || item.unitPrice || item.estimatedPrice)}` : '';
                const estimated = showPrices && item.estimatedPrice ? ' (est.)' : '';
                const inventory = item.inInventory ? ' [HAVE]' : '';
                const recipes = showRecipes && item.recipes && item.recipes.length > 0 ?
                    ` (${item.recipes.join(', ')})` : '';

                output += `  ${checkbox} ${amount}${name}${price}${estimated}${inventory}${recipes}\n`;
            });
            output += '\n';
        });

        // Add totals if available
        if (options.totals) {
            output += 'TOTALS:\n';
            output += '-------\n';
            output += `Subtotal: ${options.totals.subtotal || '$0.00'}\n`;
            if (options.totals.tax && parseFloat(options.totals.tax.replace(/[^0-9.-]/g, '')) > 0) {
                output += `Tax: ${options.totals.tax}\n`;
            }
            output += `Total: ${options.totals.total || '$0.00'}\n`;

            if (options.totals.budget) {
                output += `Budget: ${options.totals.budget}\n`;
                output += `Remaining: ${options.totals.budgetRemaining}\n`;
            }
        }

        output += '\n---\nCreated with Doc Bear\'s Comfort Kitchen\n';

        return output;
    }
}

// Default print templates
export const PRINT_TEMPLATES = {
    standard: {
        name: 'Standard List',
        description: 'Clean, simple shopping list with checkboxes',
        options: {
            showCheckboxes: true,
            showCategories: true,
            showPrices: true,
            showRecipes: false,
            showInventoryStatus: true,
            columnsPerPage: 1,
            fontSize: '11pt'
        }
    },

    compact: {
        name: 'Compact List',
        description: 'Space-efficient 2-column layout',
        options: {
            showCheckboxes: true,
            showCategories: true,
            showPrices: false,
            showRecipes: false,
            showInventoryStatus: false,
            columnsPerPage: 2,
            fontSize: '10pt',
            itemSpacing: '0.1em'
        }
    },

    detailed: {
        name: 'Detailed List',
        description: 'Complete information with prices and recipes',
        options: {
            showCheckboxes: true,
            showCategories: true,
            showPrices: true,
            showRecipes: true,
            showInventoryStatus: true,
            showTotals: true,
            columnsPerPage: 1,
            fontSize: '11pt'
        }
    },

    storeOptimized: {
        name: 'Store Layout',
        description: 'Optimized for specific store layouts with route',
        options: {
            showCheckboxes: true,
            showCategories: true,
            showPrices: true,
            showRecipes: false,
            showInventoryStatus: true,
            showStoreName: true,
            columnsPerPage: 1,
            fontSize: '11pt'
        }
    },

    minimal: {
        name: 'Minimal',
        description: 'Just the essentials - items only',
        options: {
            showCheckboxes: true,
            showCategories: false,
            showPrices: false,
            showRecipes: false,
            showInventoryStatus: false,
            showHeader: false,
            showFooter: false,
            columnsPerPage: 3,
            fontSize: '10pt'
        }
    }
};