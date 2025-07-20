// file: /src/lib/storeLayouts.js v2 - Updated to work with new comprehensive grocery categories system

import { GROCERY_CATEGORIES, CategoryUtils } from './groceryCategories';

/**
 * Store Layout Templates - Updated with comprehensive grocery categories
 * Based on food safety research: Non-perishables → Dairy/Meat → Frozen → Produce (last)
 */

// 🏪 STORE LAYOUTS - Updated for New Category System
export const STORE_LAYOUTS = {
    // Big Box Stores
    'walmart': {
        name: 'Walmart Supercenter',
        description: 'Food safety optimized layout - cold items last, produce final',
        categoryOrder: [
            // 1. NON-PERISHABLES FIRST (safe at room temperature)
            'Canned Vegetables', 'Canned Fruits', 'Canned Tomatoes', 'Beans & Legumes',
            'Soups', 'Pasta', 'Rice & Grains',
            'Baking Ingredients', 'Cooking Oil', 'Spices & Seasonings', 'Sauces & Condiments', 'Vinegar',
            'Cereal', 'Breakfast Items', 'Chips & Crackers', 'Nuts & Seeds', 'Candy', 'Cookies & Sweets',
            'Water', 'Soft Drinks', 'Juices', 'Coffee & Tea',
            'Cleaning Supplies', 'Paper Products', 'Laundry', 'Personal Care', 'Health Items', 'Baby Care',
            'Pet Food', 'Other',

            // 2. REFRIGERATED ITEMS (keep cold, but not frozen)
            'Dairy', 'Cheese', 'Eggs', 'Yogurt', 'Refrigerated Items',
            'Fresh Meat', 'Fresh Poultry', 'Fresh Seafood',
            'Deli', 'Breads',

            // 3. FROZEN ITEMS (minimize thaw time)
            'Frozen Vegetables', 'Frozen Fruits', 'Frozen Meals', 'Frozen Meat',
            'Frozen Pizza', 'Frozen Breakfast', 'Ice Cream',

            // 4. PRODUCE LAST (most fragile, goes on top)
            'Fresh Fruits', 'Fresh Vegetables', 'Fresh Produce'
        ],
        sections: [
            { name: 'Pantry Staples', emoji: '🥫', categories: ['Canned Vegetables', 'Canned Fruits', 'Canned Tomatoes', 'Beans & Legumes', 'Soups'] },
            { name: 'Dry Goods', emoji: '🌾', categories: ['Pasta', 'Rice & Grains', 'Baking Ingredients'] },
            { name: 'Seasonings & Condiments', emoji: '🧂', categories: ['Spices & Seasonings', 'Sauces & Condiments', 'Vinegar'] },
            { name: 'Breakfast & Snacks', emoji: '🥤', categories: ['Cereal', 'Breakfast Items', 'Chips & Crackers', 'Nuts & Seeds', 'Candy', 'Cookies & Sweets'] },
            { name: 'Beverages', emoji: '🥤', categories: ['Water', 'Soft Drinks', 'Juices', 'Coffee & Tea'] },
            { name: 'Household', emoji: '🧽', categories: ['Cleaning Supplies', 'Paper Products', 'Laundry', 'Personal Care', 'Health Items', 'Baby Care'] },
            { name: 'Pet & Other', emoji: '🐕', categories: ['Pet Food', 'Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Cheese', 'Eggs', 'Yogurt', 'Refrigerated Items'] },
            { name: 'Meat & Seafood', emoji: '🥩', categories: ['Fresh Meat', 'Fresh Poultry', 'Fresh Seafood'] },
            { name: 'Deli & Bakery', emoji: '🍞', categories: ['Deli', 'Breads'] },
            { name: 'Frozen Foods', emoji: '🧊', categories: ['Frozen Vegetables', 'Frozen Fruits', 'Frozen Meals', 'Frozen Meat', 'Frozen Pizza', 'Frozen Breakfast', 'Ice Cream'] },
            { name: 'Fresh Produce', emoji: '🥬', categories: ['Fresh Fruits', 'Fresh Vegetables', 'Fresh Produce'] }
        ],
        tips: [
            'Start with shelf-stable items in center aisles',
            'Hit dairy and meat sections after dry goods',
            'Frozen foods next - minimize thaw time',
            'End with produce - keeps delicate items on top',
            'Shop frozen and produce together to minimize time'
        ]
    },

    'target': {
        name: 'Target',
        description: 'Food safety first - cold items at end of trip',
        categoryOrder: [
            'Pasta', 'Canned Vegetables', 'Sauces & Condiments', 'Baking Ingredients',
            'Water', 'Soft Drinks', 'Chips & Crackers', 'Candy', 'Other',
            'Dairy', 'Fresh Meat', 'Fresh Poultry', 'Breads',
            'Frozen Meals', 'Ice Cream', 'Fresh Fruits', 'Fresh Vegetables'
        ],
        sections: [
            { name: 'Pantry Essentials', emoji: '🥫', categories: ['Pasta', 'Canned Vegetables', 'Sauces & Condiments', 'Baking Ingredients'] },
            { name: 'Beverages & Snacks', emoji: '🥤', categories: ['Water', 'Soft Drinks', 'Chips & Crackers', 'Candy'] },
            { name: 'Other', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Meat', emoji: '🥩', categories: ['Fresh Meat', 'Fresh Poultry'] },
            { name: 'Bakery', emoji: '🍞', categories: ['Breads'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Meals', 'Ice Cream'] },
            { name: 'Fresh Market', emoji: '🥬', categories: ['Fresh Fruits', 'Fresh Vegetables'] }
        ],
        tips: [
            'Begin with packaged goods in center aisles',
            'Target\'s grocery section is typically at back of store',
            'Grab dairy and meat after shelf-stable items',
            'Frozen section before checkout',
            'Fresh produce last - handle gently'
        ]
    },

    'costco': {
        name: 'Costco Warehouse',
        description: 'Bulk warehouse optimized for food safety and cart space',
        categoryOrder: [
            'Canned Vegetables', 'Pasta', 'Rice & Grains', 'Baking Ingredients',
            'Sauces & Condiments', 'Water', 'Soft Drinks', 'Chips & Crackers', 'Other',
            'Dairy', 'Fresh Meat', 'Fresh Poultry', 'Fresh Seafood', 'Breads',
            'Frozen Meals', 'Ice Cream', 'Fresh Fruits', 'Fresh Vegetables'
        ],
        sections: [
            { name: 'Bulk Pantry', emoji: '🥫', categories: ['Canned Vegetables', 'Pasta', 'Rice & Grains', 'Baking Ingredients', 'Sauces & Condiments'] },
            { name: 'Beverages & Snacks', emoji: '🥤', categories: ['Water', 'Soft Drinks', 'Chips & Crackers'] },
            { name: 'Other Bulk Items', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Meat & Seafood', emoji: '🥩', categories: ['Fresh Meat', 'Fresh Poultry', 'Fresh Seafood'] },
            { name: 'Bakery', emoji: '🍞', categories: ['Breads'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Meals', 'Ice Cream'] },
            { name: 'Produce', emoji: '🥬', categories: ['Fresh Fruits', 'Fresh Vegetables'] }
        ],
        tips: [
            'Plan cart space for bulk dry goods first',
            'Heavy canned goods on bottom of cart',
            'Meat department has best selection mid-morning',
            'Frozen section near checkout - perfect timing',
            'Produce last - bulk quantities need gentle handling'
        ]
    },

    'kroger': {
        name: 'Kroger',
        description: 'Traditional grocery store with food safety perimeter shopping',
        categoryOrder: [
            'Canned Vegetables', 'Sauces & Condiments', 'Pasta', 'Baking Ingredients',
            'Water', 'Chips & Crackers', 'Other',
            'Dairy', 'Fresh Meat', 'Fresh Poultry', 'Fresh Seafood', 'Breads',
            'Frozen Meals', 'Fresh Fruits', 'Fresh Vegetables'
        ],
        sections: [
            { name: 'Canned Goods', emoji: '🥫', categories: ['Canned Vegetables', 'Sauces & Condiments'] },
            { name: 'Pasta & Grains', emoji: '🍝', categories: ['Pasta', 'Baking Ingredients'] },
            { name: 'Beverages & Snacks', emoji: '🥤', categories: ['Water', 'Chips & Crackers'] },
            { name: 'Other', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Meat & Seafood', emoji: '🥩', categories: ['Fresh Meat', 'Fresh Poultry', 'Fresh Seafood'] },
            { name: 'Bakery', emoji: '🍞', categories: ['Breads'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Meals'] },
            { name: 'Produce', emoji: '🥬', categories: ['Fresh Fruits', 'Fresh Vegetables'] }
        ],
        tips: [
            'Center aisles first for shelf-stable items',
            'Perimeter for fresh items - dairy, meat, then produce',
            'Frozen section typically at end of store',
            'Produce section at entrance - save for last despite location',
            'Use Kroger app for aisle-specific shopping lists'
        ]
    },

    'hyvee': {
        name: 'Hy-Vee',
        description: 'Midwest grocery chain with helpful smiles and food safety focus',
        categoryOrder: [
            'Canned Vegetables', 'Pasta', 'Baking Ingredients', 'Sauces & Condiments',
            'Water', 'Chips & Crackers', 'Other',
            'Dairy', 'Fresh Meat', 'Fresh Poultry', 'Breads',
            'Frozen Meals', 'Fresh Fruits', 'Fresh Vegetables'
        ],
        sections: [
            { name: 'Pantry', emoji: '🥫', categories: ['Canned Vegetables', 'Pasta', 'Baking Ingredients', 'Sauces & Condiments'] },
            { name: 'Beverages & Snacks', emoji: '🥤', categories: ['Water', 'Chips & Crackers'] },
            { name: 'Other', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Meat', emoji: '🥩', categories: ['Fresh Meat', 'Fresh Poultry'] },
            { name: 'Bakery', emoji: '🍞', categories: ['Breads'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Meals'] },
            { name: 'Produce', emoji: '🥬', categories: ['Fresh Fruits', 'Fresh Vegetables'] }
        ],
        tips: [
            'Start with center aisle pantry items',
            'Hy-Vee brand offers great value on staples',
            'Fresh departments staffed with knowledgeable team',
            'Time frozen and produce sections together',
            'Check weekly ads for seasonal produce deals'
        ]
    },

    'traderjoes': {
        name: "Trader Joe's",
        description: 'Compact store with unique products - optimized cold chain',
        categoryOrder: [
            'Pasta', 'Canned Vegetables', 'Sauces & Condiments', 'Chips & Crackers',
            'Water', 'Other', 'Dairy', 'Fresh Meat', 'Fresh Poultry', 'Breads',
            'Frozen Meals', 'Ice Cream', 'Fresh Fruits', 'Fresh Vegetables'
        ],
        sections: [
            { name: 'Center Store', emoji: '🥫', categories: ['Pasta', 'Canned Vegetables', 'Sauces & Condiments'] },
            { name: 'Snacks & Beverages', emoji: '🍪', categories: ['Chips & Crackers', 'Water'] },
            { name: 'Other', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Meat', emoji: '🥩', categories: ['Fresh Meat', 'Fresh Poultry'] },
            { name: 'Bread', emoji: '🍞', categories: ['Breads'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Meals', 'Ice Cream'] },
            { name: 'Produce', emoji: '🥬', categories: ['Fresh Fruits', 'Fresh Vegetables'] }
        ],
        tips: [
            'Small store = efficient shopping when done right',
            'Unique TJ items in center aisles first',
            'Excellent frozen section - don\'t miss signature items',
            'Produce quality is seasonal - end with careful selection',
            'Try samples before committing to new products'
        ]
    },

    'generic': {
        name: 'Standard Grocery Store',
        description: 'Universal food safety layout for any store',
        categoryOrder: CategoryUtils.getDefaultCategoryOrder(), // Use the comprehensive default
        sections: [
            { name: 'Pantry', emoji: '🥫', categories: ['Canned Vegetables', 'Canned Fruits', 'Pasta', 'Rice & Grains', 'Baking Ingredients', 'Sauces & Condiments'] },
            { name: 'Beverages & Snacks', emoji: '🥤', categories: ['Water', 'Soft Drinks', 'Juices', 'Coffee & Tea', 'Chips & Crackers', 'Candy'] },
            { name: 'Household', emoji: '🧽', categories: ['Cleaning Supplies', 'Paper Products', 'Personal Care'] },
            { name: 'Other', emoji: '🛒', categories: ['Other', 'Pet Food'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Cheese', 'Eggs', 'Yogurt'] },
            { name: 'Meat', emoji: '🥩', categories: ['Fresh Meat', 'Fresh Poultry', 'Fresh Seafood'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Vegetables', 'Frozen Meals', 'Ice Cream'] },
            { name: 'Bakery', emoji: '🍞', categories: ['Breads', 'Bakery'] },
            { name: 'Produce', emoji: '🥬', categories: ['Fresh Fruits', 'Fresh Vegetables'] }
        ],
        tips: [
            'Non-perishables first - center aisles typically',
            'Refrigerated items next - dairy and meat',
            'Frozen foods near end of shopping trip',
            'Produce last - most delicate items on top of cart',
            'Keep cold chain intact - minimize time outside refrigeration'
        ]
    }
};

/**
 * Get store layout based on store name or chain
 */
export function getStoreLayout(storeName, storeChain = '') {
    if (!storeName) return STORE_LAYOUTS.generic;

    const searchText = `${storeName} ${storeChain}`.toLowerCase();

    // Direct matches
    if (searchText.includes('walmart')) return STORE_LAYOUTS.walmart;
    if (searchText.includes('target')) return STORE_LAYOUTS.target;
    if (searchText.includes('costco')) return STORE_LAYOUTS.costco;
    if (searchText.includes('kroger')) return STORE_LAYOUTS.kroger;
    if (searchText.includes('hy-vee') || searchText.includes('hyvee')) return STORE_LAYOUTS.hyvee;
    if (searchText.includes('trader joe')) return STORE_LAYOUTS.traderjoes;
    if (searchText.includes('whole foods')) return STORE_LAYOUTS.generic; // Use generic for now

    // Additional chain matches
    if (searchText.includes('safeway') || searchText.includes('albertsons')) return STORE_LAYOUTS.kroger;
    if (searchText.includes('meijer') || searchText.includes('publix')) return STORE_LAYOUTS.kroger;

    return STORE_LAYOUTS.generic;
}

/**
 * Apply store layout to shopping list items
 */
export function applyStoreLayout(shoppingListItems, storeName, storeChain = '') {
    const layout = getStoreLayout(storeName, storeChain);
    const reorderedItems = {};

    console.log(`🏪 Applying ${layout.name} food safety layout to shopping list`);

    // First, organize items by the store's category order
    layout.categoryOrder.forEach(category => {
        if (shoppingListItems[category] && shoppingListItems[category].length > 0) {
            reorderedItems[category] = [...shoppingListItems[category]];
        }
    });

    // Add any remaining categories not in the layout
    Object.keys(shoppingListItems).forEach(category => {
        if (!reorderedItems[category] && shoppingListItems[category].length > 0) {
            reorderedItems[category] = [...shoppingListItems[category]];
        }
    });

    return {
        items: reorderedItems,
        layout: layout,
        sections: layout.sections,
        tips: layout.tips
    };
}

/**
 * Get shopping route with time estimates and food safety considerations
 */
export function generateShoppingRoute(shoppingListItems, storeName, storeChain = '') {
    const layout = getStoreLayout(storeName, storeChain);
    const route = [];

    layout.sections.forEach(section => {
        const sectionItems = [];
        let totalItems = 0;

        section.categories.forEach(category => {
            if (shoppingListItems[category] && shoppingListItems[category].length > 0) {
                sectionItems.push(...shoppingListItems[category]);
                totalItems += shoppingListItems[category].length;
            }
        });

        if (totalItems > 0) {
            // Estimate time based on items and section type
            let baseTime = 2; // 2 minutes base
            let itemTime = 0.5; // 30 seconds per item

            // Adjust time for specific sections
            if (section.name.includes('Produce')) {
                baseTime = 3; // More time for produce selection
                itemTime = 0.75; // 45 seconds per produce item
            } else if (section.name.includes('Meat') || section.name.includes('Seafood')) {
                baseTime = 3; // More time for meat/seafood selection
                itemTime = 0.6; // 36 seconds per meat item
            } else if (section.name.includes('Frozen')) {
                baseTime = 2; // Quick frozen section
                itemTime = 0.4; // 24 seconds per frozen item
            }

            const estimatedTime = Math.max(baseTime, baseTime + Math.ceil(totalItems * itemTime));

            route.push({
                section: section.name,
                emoji: section.emoji,
                categories: section.categories.filter(cat =>
                    shoppingListItems[cat] && shoppingListItems[cat].length > 0
                ),
                itemCount: totalItems,
                items: sectionItems,
                estimatedTime: estimatedTime,
                foodSafetyNotes: getFoodSafetyNotes(section.name)
            });
        }
    });

    return {
        route,
        totalTime: route.reduce((sum, section) => sum + section.estimatedTime, 0),
        totalSections: route.length,
        storeName: layout.name,
        tips: layout.tips,
        foodSafetyReminder: "🧊 Remember: Non-perishables first, frozen items minimize thaw time, produce last for best quality!"
    };
}

/**
 * Get food safety notes for each section
 */
function getFoodSafetyNotes(sectionName) {
    const notes = {
        'Pantry': 'Room temperature items - safe to shop first',
        'Pantry Staples': 'Shelf-stable items - no time pressure',
        'Dry Goods': 'Non-perishable - safe at room temperature',
        'Beverages': 'Most are shelf-stable - shop early',
        'Snacks': 'Packaged goods - no refrigeration needed',
        'Household': 'Non-food items - shop early',
        'Other': 'Check individual item requirements',
        'Dairy': '🥛 Keep cold - shop after dry goods, within 2 hours of home',
        'Meat': '🥩 Keep very cold - minimize time in cart, separate from other foods',
        'Seafood': '🐟 Highly perishable - buy ice if needed for long trips',
        'Frozen': '🧊 Minimize thaw time - shop last among cold items',
        'Produce': '🥬 Most fragile - place on top, shop last to prevent crushing'
    };

    return Object.keys(notes).find(key => sectionName.includes(key)) ?
        notes[Object.keys(notes).find(key => sectionName.includes(key))] :
        'Handle according to temperature requirements';
}

/**
 * Export shopping route as text for sharing - with food safety tips
 */
export function exportShoppingRoute(route, storeName) {
    let text = `🛒 Food Safety Shopping Route - ${storeName}\n`;
    text += `⏱️ Estimated Time: ${route.totalTime} minutes\n`;
    text += `📍 ${route.totalSections} sections to visit\n`;
    text += `🧊 Order: Non-perishables → Cold items → Frozen → Produce\n\n`;

    route.route.forEach((section, index) => {
        text += `${index + 1}. ${section.emoji} ${section.section} (${section.estimatedTime} min)\n`;
        text += `   📦 ${section.itemCount} items\n`;
        if (section.foodSafetyNotes) {
            text += `   🛡️ ${section.foodSafetyNotes}\n`;
        }
        if (section.items.length <= 5) {
            section.items.forEach(item => {
                text += `   • ${item.amount || ''} ${item.ingredient || item.name}\n`;
            });
        } else {
            section.items.slice(0, 3).forEach(item => {
                text += `   • ${item.amount || ''} ${item.ingredient || item.name}\n`;
            });
            text += `   • ... and ${section.items.length - 3} more\n`;
        }
        text += '\n';
    });

    if (route.tips && route.tips.length > 0) {
        text += '💡 Store Tips:\n';
        route.tips.forEach(tip => {
            text += `• ${tip}\n`;
        });
        text += '\n';
    }

    text += '🛡️ Food Safety Reminders:\n';
    text += '• Keep cold items together in cart\n';
    text += '• Frozen foods last - minimize thaw time\n';
    text += '• Produce on top to prevent crushing\n';
    text += '• Get home within 2 hours (1 hour if >90°F)\n';
    text += '• Refrigerate/freeze immediately upon arrival\n';

    return text;
}

/**
 * Bridge function - get user's custom category order for a store
 */
export function getUserStoreCategoryOrder(userId, storeName) {
    try {
        const saved = localStorage.getItem(`store-categories-${userId}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Find store by name
            const storeData = Object.values(parsed).find(store => store.storeName === storeName);
            if (storeData && storeData.categories) {
                return storeData.categories;
            }
        }
    } catch (error) {
        console.error('Error loading user store category order:', error);
    }

    // Fallback to default store layout
    const layout = getStoreLayout(storeName);
    return layout.categoryOrder;
}

/**
 * Enhanced Store Layout Helper Functions
 */
export const StoreLayoutUtils = {
    getStoreLayout,
    applyStoreLayout,
    generateShoppingRoute,
    exportShoppingRoute,
    getUserStoreCategoryOrder,

    // Bridge to new category system
    getCategoryInfo: (categoryName) => GROCERY_CATEGORIES[categoryName],
    getDefaultCategoryOrder: () => CategoryUtils.getDefaultCategoryOrder(),

    // Backward compatibility
    layouts: STORE_LAYOUTS,

    // Store chain detection
    detectStoreChain: (storeName, storeChain = '') => {
        const layout = getStoreLayout(storeName, storeChain);
        return layout !== STORE_LAYOUTS.generic ? layout : null;
    }
};