// file: /src/lib/shoppingListTotals.js v1 - Shopping list totals calculation with tax and budget support

export class ShoppingListTotalsCalculator {
    constructor(options = {}) {
        this.taxRate = options.taxRate || 0; // Default 0% tax
        this.currency = options.currency || 'USD';
        this.currencySymbol = options.currencySymbol || '$';
        this.currencyPosition = options.currencyPosition || 'before'; // 'before' or 'after'
        this.decimalPlaces = options.decimalPlaces || 2;
        this.locale = options.locale || 'en-US';
    }

    // Format currency based on user preferences
    formatCurrency(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            return this.currencyPosition === 'before' ? `${this.currencySymbol}0.00` : `0.00${this.currencySymbol}`;
        }

        const formatted = amount.toFixed(this.decimalPlaces);
        return this.currencyPosition === 'before' ?
            `${this.currencySymbol}${formatted}` :
            `${formatted}${this.currencySymbol}`;
    }

    // Parse price from string (handles various formats)
    parsePrice(priceString) {
        if (typeof priceString === 'number') return priceString;
        if (!priceString || typeof priceString !== 'string') return 0;

        // Remove currency symbols and clean up
        const cleaned = priceString
            .replace(/[^\d.-]/g, '') // Keep only digits, dots, and minus
            .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
            .trim();

        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : Math.max(0, parsed); // Ensure non-negative
    }

    // Extract quantity from amount string (e.g., "2 lbs" -> 2)
    parseQuantity(amountString) {
        if (typeof amountString === 'number') return amountString;
        if (!amountString || typeof amountString !== 'string') return 1;

        const match = amountString.match(/^(\d*\.?\d+)/);
        return match ? parseFloat(match[1]) : 1;
    }

    // Calculate totals for a shopping list
    calculateTotals(shoppingList, options = {}) {
        const {
            budget = null,
            taxableCategories = [], // Categories that are taxable
            discounts = [], // Array of discount objects
            coupons = [] // Array of coupon objects
        } = options;

        const calculations = {
            // Item-level totals
            items: [],

            // Category-level totals
            categories: {},

            // Overall totals
            subtotal: 0,
            taxableAmount: 0,
            nonTaxableAmount: 0,
            taxAmount: 0,
            discountAmount: 0,
            couponAmount: 0,
            total: 0,

            // Budget tracking
            budget: budget,
            budgetRemaining: null,
            budgetPercentUsed: null,
            isOverBudget: false,

            // Statistics
            totalItems: 0,
            itemsWithPrices: 0,
            estimatedItems: 0,

            // Metadata
            calculatedAt: new Date(),
            hasIncompleteData: false,
            warnings: []
        };

        // Normalize shopping list structure
        const normalizedItems = this.normalizeShoppingListItems(shoppingList);

        // Process each item
        normalizedItems.forEach(item => {
            const itemCalc = this.calculateItemTotal(item, taxableCategories);
            calculations.items.push(itemCalc);

            // Update category totals
            const category = item.category || 'Other';
            if (!calculations.categories[category]) {
                calculations.categories[category] = {
                    name: category,
                    subtotal: 0,
                    taxAmount: 0,
                    total: 0,
                    itemCount: 0,
                    estimatedCount: 0
                };
            }

            calculations.categories[category].subtotal += itemCalc.subtotal;
            calculations.categories[category].taxAmount += itemCalc.taxAmount;
            calculations.categories[category].total += itemCalc.total;
            calculations.categories[category].itemCount++;
            if (itemCalc.isEstimated) {
                calculations.categories[category].estimatedCount++;
            }

            // Update overall totals
            calculations.subtotal += itemCalc.subtotal;
            if (itemCalc.isTaxable) {
                calculations.taxableAmount += itemCalc.subtotal;
            } else {
                calculations.nonTaxableAmount += itemCalc.subtotal;
            }
            calculations.taxAmount += itemCalc.taxAmount;
            calculations.totalItems++;

            if (itemCalc.hasPrice) {
                calculations.itemsWithPrices++;
            }
            if (itemCalc.isEstimated) {
                calculations.estimatedItems++;
            }
        });

        // Apply discounts and coupons
        this.applyDiscountsAndCoupons(calculations, discounts, coupons);

        // Calculate final total
        calculations.total = calculations.subtotal + calculations.taxAmount - calculations.discountAmount - calculations.couponAmount;
        calculations.total = Math.max(0, calculations.total); // Ensure non-negative

        // Budget calculations
        if (budget && budget > 0) {
            calculations.budgetRemaining = budget - calculations.total;
            calculations.budgetPercentUsed = (calculations.total / budget) * 100;
            calculations.isOverBudget = calculations.total > budget;
        }

        // Add warnings for incomplete data
        if (calculations.estimatedItems > 0) {
            calculations.hasIncompleteData = true;
            calculations.warnings.push(`${calculations.estimatedItems} items have estimated prices`);
        }

        if (calculations.itemsWithPrices < calculations.totalItems) {
            const missingPrices = calculations.totalItems - calculations.itemsWithPrices;
            calculations.warnings.push(`${missingPrices} items are missing price information`);
        }

        return calculations;
    }

    // Calculate total for individual item
    calculateItemTotal(item, taxableCategories = []) {
        const quantity = this.parseQuantity(item.amount) || 1;
        const unitPrice = this.parsePrice(item.price || item.unitPrice || item.estimatedPrice);
        const hasPrice = !!(item.price || item.unitPrice || item.estimatedPrice);
        const isEstimated = !!(item.estimatedPrice && !item.price && !item.unitPrice);

        // Determine if item is taxable
        const isTaxable = taxableCategories.length === 0 ||
            taxableCategories.includes(item.category) ||
            taxableCategories.includes('all');

        const subtotal = unitPrice * quantity;
        const taxAmount = isTaxable ? subtotal * this.taxRate : 0;
        const total = subtotal + taxAmount;

        return {
            ...item,
            quantity,
            unitPrice,
            subtotal,
            taxAmount,
            total,
            hasPrice,
            isEstimated,
            isTaxable,
            formattedUnitPrice: this.formatCurrency(unitPrice),
            formattedSubtotal: this.formatCurrency(subtotal),
            formattedTaxAmount: this.formatCurrency(taxAmount),
            formattedTotal: this.formatCurrency(total)
        };
    }

    // Apply discounts and coupons
    applyDiscountsAndCoupons(calculations, discounts = [], coupons = []) {
        // Apply percentage discounts
        discounts.forEach(discount => {
            if (discount.type === 'percentage' && discount.value > 0) {
                const discountAmount = calculations.subtotal * (discount.value / 100);
                calculations.discountAmount += discountAmount;
            } else if (discount.type === 'fixed' && discount.value > 0) {
                calculations.discountAmount += discount.value;
            }
        });

        // Apply coupons (fixed amount reductions)
        coupons.forEach(coupon => {
            if (coupon.value > 0) {
                calculations.couponAmount += coupon.value;
            }
        });
    }

    // Normalize different shopping list structures
    normalizeShoppingListItems(shoppingList) {
        let items = [];

        if (!shoppingList) return items;

        // Handle different shopping list structures
        if (Array.isArray(shoppingList)) {
            items = shoppingList;
        } else if (shoppingList.items) {
            if (Array.isArray(shoppingList.items)) {
                items = shoppingList.items;
            } else if (typeof shoppingList.items === 'object') {
                // Items grouped by category
                Object.entries(shoppingList.items).forEach(([category, categoryItems]) => {
                    if (Array.isArray(categoryItems)) {
                        categoryItems.forEach(item => {
                            items.push({
                                ...item,
                                category: item.category || category
                            });
                        });
                    }
                });
            }
        }

        return items;
    }

    // Generate totals summary for display
    generateSummary(calculations) {
        const summary = {
            // Main totals
            subtotal: this.formatCurrency(calculations.subtotal),
            tax: this.formatCurrency(calculations.taxAmount),
            discount: this.formatCurrency(calculations.discountAmount),
            coupon: this.formatCurrency(calculations.couponAmount),
            total: this.formatCurrency(calculations.total),

            // Item counts
            totalItems: calculations.totalItems,
            itemsWithPrices: calculations.itemsWithPrices,
            estimatedItems: calculations.estimatedItems,

            // Budget info
            budget: calculations.budget ? this.formatCurrency(calculations.budget) : null,
            budgetRemaining: calculations.budgetRemaining !== null ?
                this.formatCurrency(calculations.budgetRemaining) : null,
            budgetPercentUsed: calculations.budgetPercentUsed !== null ?
                Math.round(calculations.budgetPercentUsed) : null,
            isOverBudget: calculations.isOverBudget,

            // Categories
            categories: Object.values(calculations.categories).map(cat => ({
                ...cat,
                formattedSubtotal: this.formatCurrency(cat.subtotal),
                formattedTax: this.formatCurrency(cat.taxAmount),
                formattedTotal: this.formatCurrency(cat.total)
            })),

            // Metadata
            hasIncompleteData: calculations.hasIncompleteData,
            warnings: calculations.warnings,
            calculatedAt: calculations.calculatedAt
        };

        return summary;
    }

    // Export totals for sharing/printing
    exportTotals(calculations, format = 'text') {
        const summary = this.generateSummary(calculations);

        if (format === 'text') {
            let output = 'Shopping List Totals\n';
            output += '===================\n\n';

            // Main totals
            output += `Subtotal: ${summary.subtotal}\n`;
            if (calculations.taxAmount > 0) {
                output += `Tax (${(this.taxRate * 100).toFixed(1)}%): ${summary.tax}\n`;
            }
            if (calculations.discountAmount > 0) {
                output += `Discount: -${summary.discount}\n`;
            }
            if (calculations.couponAmount > 0) {
                output += `Coupons: -${summary.coupon}\n`;
            }
            output += `TOTAL: ${summary.total}\n\n`;

            // Budget info
            if (summary.budget) {
                output += `Budget: ${summary.budget}\n`;
                output += `Remaining: ${summary.budgetRemaining}\n`;
                output += `Used: ${summary.budgetPercentUsed}%\n\n`;
            }

            // Category breakdown
            if (summary.categories.length > 1) {
                output += 'Category Breakdown:\n';
                summary.categories.forEach(cat => {
                    output += `  ${cat.name}: ${cat.formattedTotal} (${cat.itemCount} items)\n`;
                });
                output += '\n';
            }

            // Warnings
            if (summary.warnings.length > 0) {
                output += 'Notes:\n';
                summary.warnings.forEach(warning => {
                    output += `  • ${warning}\n`;
                });
            }

            return output;
        }

        return summary;
    }
}

// Default tax rates by region (can be customized)
export const DEFAULT_TAX_RATES = {
    'US': {
        'AL': 0.04,   // Alabama
        'CA': 0.0725, // California
        'FL': 0.06,   // Florida
        'IA': 0.06,   // Iowa (for Cedar Rapids)
        'NY': 0.08,   // New York
        'TX': 0.0625, // Texas
        'WA': 0.065,  // Washington
        // Add more as needed
    },
    'CA': 0.05,  // Canada GST
    'UK': 0.20,  // UK VAT
    'EU': 0.21,  // EU average VAT
};

// Common taxable categories
export const TAXABLE_CATEGORIES = {
    // Generally taxable in most jurisdictions
    TAXABLE: [
        'Household Items',
        'Personal Care',
        'Cleaning Supplies',
        'Paper Products',
        'Pet Supplies',
        'Beverages' // Non-essential beverages
    ],

    // Generally tax-exempt (food items)
    TAX_EXEMPT: [
        'Produce',
        'Meat & Seafood',
        'Dairy',
        'Bread & Bakery',
        'Canned Goods',
        'Frozen Foods',
        'Pantry Staples',
        'Fresh Fruits',
        'Fresh Vegetables',
        'Grains',
        'Condiments'
    ]
};