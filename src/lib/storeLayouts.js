// file: /src/lib/storeLayouts.js - Store Layout Templates System (CORRECTED for Food Safety)

/**
 * Store Layout Templates - CORRECTED with proper food safety shopping order
 * Based on food safety research: Non-perishables → Dairy/Meat → Frozen → Produce (last)
 */

// 🏪 STORE LAYOUTS - CORRECTED FOR FOOD SAFETY
export const STORE_LAYOUTS = {
    // Big Box Stores
    'walmart': {
        name: 'Walmart Supercenter',
        description: 'Food safety optimized layout - cold items last, produce final',
        categoryOrder: [
            // 1. NON-PERISHABLES FIRST (safe at room temperature)
            'Canned/Jarred Vegetables',
            'Canned/Jarred Tomatoes',
            'Canned/Jarred Sauces',
            'Canned/Jarred Meals',
            'Pasta',
            'Grains',
            'Baking & Cooking Ingredients',
            'Seasonings',
            'Spices',
            'Condiments',
            'Beverages',
            'Snacks',
            'Other',

            // 2. REFRIGERATED ITEMS (keep cold, but not frozen)
            'Dairy',
            'Fresh/Frozen Beef',
            'Fresh/Frozen Poultry',
            'Fresh/Frozen Fish & Seafood',
            'Breads', // Often refrigerated section

            // 3. FROZEN ITEMS (minimize thaw time)
            'Frozen Items',
            'Frozen Meals',
            'Frozen Vegetables',
            'Frozen Fruit',

            // 4. PRODUCE LAST (most fragile, goes on top)
            'Fresh Fruits',
            'Fresh Vegetables'
        ],
        sections: [
            { name: 'Pantry Staples', emoji: '🥫', categories: ['Canned/Jarred Vegetables', 'Canned/Jarred Tomatoes', 'Canned/Jarred Sauces', 'Canned/Jarred Meals'] },
            { name: 'Dry Goods', emoji: '🌾', categories: ['Pasta', 'Grains', 'Baking & Cooking Ingredients'] },
            { name: 'Seasonings & Condiments', emoji: '🧂', categories: ['Seasonings', 'Spices', 'Condiments'] },
            { name: 'Beverages & Snacks', emoji: '🥤', categories: ['Beverages', 'Snacks'] },
            { name: 'Other Items', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Meat & Seafood', emoji: '🥩', categories: ['Fresh/Frozen Beef', 'Fresh/Frozen Poultry', 'Fresh/Frozen Fish & Seafood'] },
            { name: 'Bakery', emoji: '🍞', categories: ['Breads'] },
            { name: 'Frozen Foods', emoji: '🧊', categories: ['Frozen Items', 'Frozen Meals', 'Frozen Vegetables', 'Frozen Fruit'] },
            { name: 'Fresh Produce', emoji: '🥬', categories: ['Fresh Fruits', 'Fresh Vegetables'] }
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
            'Pasta',
            'Canned/Jarred Vegetables',
            'Canned/Jarred Sauces',
            'Baking & Cooking Ingredients',
            'Condiments',
            'Beverages',
            'Snacks',
            'Other',
            'Dairy',
            'Fresh/Frozen Beef',
            'Fresh/Frozen Poultry',
            'Breads',
            'Frozen Items',
            'Frozen Meals',
            'Fresh Fruits',
            'Fresh Vegetables'
        ],
        sections: [
            { name: 'Pantry Essentials', emoji: '🥫', categories: ['Pasta', 'Canned/Jarred Vegetables', 'Canned/Jarred Sauces', 'Baking & Cooking Ingredients', 'Condiments'] },
            { name: 'Beverages & Snacks', emoji: '🥤', categories: ['Beverages', 'Snacks'] },
            { name: 'Other', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Meat', emoji: '🥩', categories: ['Fresh/Frozen Beef', 'Fresh/Frozen Poultry'] },
            { name: 'Bakery', emoji: '🍞', categories: ['Breads'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Items', 'Frozen Meals'] },
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
            'Canned/Jarred Vegetables',
            'Pasta',
            'Grains',
            'Baking & Cooking Ingredients',
            'Condiments',
            'Beverages',
            'Snacks',
            'Other',
            'Dairy',
            'Fresh/Frozen Beef',
            'Fresh/Frozen Poultry',
            'Fresh/Frozen Fish & Seafood',
            'Breads',
            'Frozen Items',
            'Frozen Meals',
            'Fresh Fruits',
            'Fresh Vegetables'
        ],
        sections: [
            { name: 'Bulk Pantry', emoji: '🥫', categories: ['Canned/Jarred Vegetables', 'Pasta', 'Grains', 'Baking & Cooking Ingredients', 'Condiments'] },
            { name: 'Beverages & Snacks', emoji: '🥤', categories: ['Beverages', 'Snacks'] },
            { name: 'Other Bulk Items', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Meat & Seafood', emoji: '🥩', categories: ['Fresh/Frozen Beef', 'Fresh/Frozen Poultry', 'Fresh/Frozen Fish & Seafood'] },
            { name: 'Bakery', emoji: '🍞', categories: ['Breads'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Items', 'Frozen Meals'] },
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
            'Canned/Jarred Vegetables',
            'Canned/Jarred Sauces',
            'Pasta',
            'Baking & Cooking Ingredients',
            'Condiments',
            'Beverages',
            'Snacks',
            'Other',
            'Dairy',
            'Fresh/Frozen Beef',
            'Fresh/Frozen Poultry',
            'Fresh/Frozen Fish & Seafood',
            'Breads',
            'Frozen Items',
            'Fresh Fruits',
            'Fresh Vegetables'
        ],
        sections: [
            { name: 'Canned Goods', emoji: '🥫', categories: ['Canned/Jarred Vegetables', 'Canned/Jarred Sauces'] },
            { name: 'Pasta & Grains', emoji: '🍝', categories: ['Pasta', 'Baking & Cooking Ingredients'] },
            { name: 'Condiments', emoji: '🧂', categories: ['Condiments'] },
            { name: 'Beverages & Snacks', emoji: '🥤', categories: ['Beverages', 'Snacks'] },
            { name: 'Other', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Meat & Seafood', emoji: '🥩', categories: ['Fresh/Frozen Beef', 'Fresh/Frozen Poultry', 'Fresh/Frozen Fish & Seafood'] },
            { name: 'Bakery', emoji: '🍞', categories: ['Breads'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Items'] },
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
            'Canned/Jarred Vegetables',
            'Pasta',
            'Baking & Cooking Ingredients',
            'Condiments',
            'Beverages',
            'Snacks',
            'Other',
            'Dairy',
            'Fresh/Frozen Beef',
            'Fresh/Frozen Poultry',
            'Breads',
            'Frozen Items',
            'Fresh Fruits',
            'Fresh Vegetables'
        ],
        sections: [
            { name: 'Pantry', emoji: '🥫', categories: ['Canned/Jarred Vegetables', 'Pasta', 'Baking & Cooking Ingredients', 'Condiments'] },
            { name: 'Beverages & Snacks', emoji: '🥤', categories: ['Beverages', 'Snacks'] },
            { name: 'Other', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Meat', emoji: '🥩', categories: ['Fresh/Frozen Beef', 'Fresh/Frozen Poultry'] },
            { name: 'Bakery', emoji: '🍞', categories: ['Breads'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Items'] },
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
            'Pasta',
            'Canned/Jarred Vegetables',
            'Condiments',
            'Snacks',
            'Beverages',
            'Other',
            'Dairy',
            'Fresh/Frozen Beef',
            'Fresh/Frozen Poultry',
            'Breads',
            'Frozen Items',
            'Frozen Meals',
            'Fresh Fruits',
            'Fresh Vegetables'
        ],
        sections: [
            { name: 'Center Store', emoji: '🥫', categories: ['Pasta', 'Canned/Jarred Vegetables', 'Condiments'] },
            { name: 'Snacks & Beverages', emoji: '🍪', categories: ['Snacks', 'Beverages'] },
            { name: 'Other', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Meat', emoji: '🥩', categories: ['Fresh/Frozen Beef', 'Fresh/Frozen Poultry'] },
            { name: 'Bread', emoji: '🍞', categories: ['Breads'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Items', 'Frozen Meals'] },
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

    'samsclub': {
        name: "Sam's Club",
        description: 'Warehouse club with food safety bulk shopping strategy',
        categoryOrder: [
            'Canned/Jarred Vegetables',
            'Pasta',
            'Grains',
            'Baking & Cooking Ingredients',
            'Beverages',
            'Snacks',
            'Other',
            'Dairy',
            'Fresh/Frozen Beef',
            'Fresh/Frozen Poultry',
            'Breads',
            'Frozen Items',
            'Fresh Fruits',
            'Fresh Vegetables'
        ],
        sections: [
            { name: 'Bulk Pantry', emoji: '🥫', categories: ['Canned/Jarred Vegetables', 'Pasta', 'Grains', 'Baking & Cooking Ingredients'] },
            { name: 'Bulk Beverages & Snacks', emoji: '🥤', categories: ['Beverages', 'Snacks'] },
            { name: 'Other Bulk Items', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Meat & Poultry', emoji: '🥩', categories: ['Fresh/Frozen Beef', 'Fresh/Frozen Poultry'] },
            { name: 'Bakery', emoji: '🍞', categories: ['Breads'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Items'] },
            { name: 'Produce', emoji: '🥬', categories: ['Fresh Fruits', 'Fresh Vegetables'] }
        ],
        tips: [
            'Bring membership card and plan for bulk quantities',
            'Heavy non-perishables first - use cart space wisely',
            'Consider splitting bulk fresh items with family/friends',
            'Frozen department excellent for large families',
            'Produce section - buy only what you\'ll use quickly'
        ]
    },

    'wholefoods': {
        name: 'Whole Foods Market',
        description: 'Organic and natural foods with premium cold chain management',
        categoryOrder: [
            'Grains',
            'Pasta',
            'Canned/Jarred Vegetables',
            'Condiments',
            'Beverages',
            'Snacks',
            'Other',
            'Dairy',
            'Cheese',
            'Fresh/Frozen Fish & Seafood',
            'Fresh/Frozen Beef',
            'Fresh/Frozen Poultry',
            'Breads',
            'Frozen Items',
            'Fresh Fruits',
            'Fresh Vegetables'
        ],
        sections: [
            { name: 'Bulk & Grains', emoji: '🌾', categories: ['Grains', 'Pasta'] },
            { name: 'Pantry', emoji: '🥫', categories: ['Canned/Jarred Vegetables', 'Condiments'] },
            { name: 'Beverages & Snacks', emoji: '🥤', categories: ['Beverages', 'Snacks'] },
            { name: 'Other', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Cheese', emoji: '🧀', categories: ['Cheese'] },
            { name: 'Seafood', emoji: '🐟', categories: ['Fresh/Frozen Fish & Seafood'] },
            { name: 'Meat', emoji: '🥩', categories: ['Fresh/Frozen Beef', 'Fresh/Frozen Poultry'] },
            { name: 'Bakery', emoji: '🍞', categories: ['Breads'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Items'] },
            { name: 'Produce', emoji: '🥬', categories: ['Fresh Fruits', 'Fresh Vegetables'] }
        ],
        tips: [
            'Start with bulk bins and pantry items',
            'Premium cheese counter after dairy section',
            'Seafood department has fresh daily selections',
            'Organic frozen options are extensive',
            'Produce section showcases seasonal, local items - save for last'
        ]
    },

    'generic': {
        name: 'Standard Grocery Store',
        description: 'Universal food safety layout for any store',
        categoryOrder: [
            'Canned/Jarred Vegetables',
            'Pasta',
            'Baking & Cooking Ingredients',
            'Condiments',
            'Beverages',
            'Snacks',
            'Other',
            'Dairy',
            'Fresh/Frozen Beef',
            'Fresh/Frozen Poultry',
            'Frozen Items',
            'Breads',
            'Fresh Fruits',
            'Fresh Vegetables'
        ],
        sections: [
            { name: 'Pantry', emoji: '🥫', categories: ['Canned/Jarred Vegetables', 'Pasta', 'Baking & Cooking Ingredients', 'Condiments'] },
            { name: 'Beverages & Snacks', emoji: '🥤', categories: ['Beverages', 'Snacks'] },
            { name: 'Other', emoji: '🛒', categories: ['Other'] },
            { name: 'Dairy', emoji: '🥛', categories: ['Dairy', 'Eggs'] },
            { name: 'Meat', emoji: '🥩', categories: ['Fresh/Frozen Beef', 'Fresh/Frozen Poultry'] },
            { name: 'Frozen', emoji: '🧊', categories: ['Frozen Items'] },
            { name: 'Bakery', emoji: '🍞', categories: ['Breads'] },
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

// 🗺️ STORE LAYOUT UTILITIES (Keep existing functions but with corrected data)

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
    if (searchText.includes('sam\'s club') || searchText.includes('sams club')) return STORE_LAYOUTS.samsclub;
    if (searchText.includes('whole foods')) return STORE_LAYOUTS.wholefoods;

    // Additional chain matches
    if (searchText.includes('safeway') || searchText.includes('albertsons')) return STORE_LAYOUTS.kroger;
    if (searchText.includes('meijer') || searchText.includes('publix')) return STORE_LAYOUTS.kroger;
    if (searchText.includes('smith') || searchText.includes('king soopers')) return STORE_LAYOUTS.kroger;

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
 * Get available store layout options for dropdown
 */
export function getAvailableStoreLayouts() {
    return Object.entries(STORE_LAYOUTS).map(([key, layout]) => ({
        value: key,
        label: layout.name,
        description: layout.description
    }));
}

/**
 * Save user's preferred store layout
 */
export function savePreferredStoreLayout(userId, storeName, layoutKey) {
    try {
        const preferences = JSON.parse(localStorage.getItem('store-layout-preferences') || '{}');
        preferences[`${userId}-${storeName}`] = layoutKey;
        localStorage.setItem('store-layout-preferences', JSON.stringify(preferences));
        console.log(`💾 Saved store layout preference: ${storeName} → ${layoutKey}`);
    } catch (error) {
        console.error('Error saving store layout preference:', error);
    }
}

/**
 * Get user's preferred store layout
 */
export function getPreferredStoreLayout(userId, storeName) {
    try {
        const preferences = JSON.parse(localStorage.getItem('store-layout-preferences') || '{}');
        return preferences[`${userId}-${storeName}`] || null;
    } catch (error) {
        console.error('Error getting store layout preference:', error);
        return null;
    }
}

/**
 * Validate and normalize category names
 */
export function normalizeCategoryName(categoryName) {
    if (!categoryName) return 'Other';

    const normalized = categoryName.trim();

    // Map common variations to standard categories
    const categoryMappings = {
        'Produce': 'Fresh Vegetables',
        'Fruits': 'Fresh Fruits',
        'Vegetables': 'Fresh Vegetables',
        'Meat': 'Fresh/Frozen Beef',
        'Poultry': 'Fresh/Frozen Poultry',
        'Seafood': 'Fresh/Frozen Fish & Seafood',
        'Fish': 'Fresh/Frozen Fish & Seafood',
        'Milk': 'Dairy',
        'Eggs': 'Dairy',
        'Frozen': 'Frozen Items',
        'Bread': 'Breads',
        'Bakery': 'Breads',
        'Canned': 'Canned/Jarred Vegetables',
        'Pantry': 'Other',
        'Dry Goods': 'Other',
        'Spices': 'Seasonings'
    };

    return categoryMappings[normalized] || normalized;
}

/**
 * Get food safety priority level for category
 */
export function getFoodSafetyPriority(categoryName) {
    const priorities = {
        // Priority 1: Non-perishables (shop first)
        'Canned/Jarred Vegetables': 1,
        'Canned/Jarred Tomatoes': 1,
        'Canned/Jarred Sauces': 1,
        'Canned/Jarred Meals': 1,
        'Pasta': 1,
        'Grains': 1,
        'Baking & Cooking Ingredients': 1,
        'Seasonings': 1,
        'Spices': 1,
        'Condiments': 1,
        'Beverages': 1,
        'Snacks': 1,
        'Other': 1,

        // Priority 2: Refrigerated (shop second)
        'Dairy': 2,
        'Fresh/Frozen Beef': 2,
        'Fresh/Frozen Poultry': 2,
        'Fresh/Frozen Fish & Seafood': 2,
        'Breads': 2,

        // Priority 3: Frozen (shop third)
        'Frozen Items': 3,
        'Frozen Meals': 3,
        'Frozen Vegetables': 3,
        'Frozen Fruit': 3,

        // Priority 4: Produce (shop last)
        'Fresh Fruits': 4,
        'Fresh Vegetables': 4
    };

    return priorities[categoryName] || 1;
}

/**
 * Sort categories by food safety priority
 */
export function sortCategoriesByFoodSafety(categories) {
    return categories.sort((a, b) => {
        const priorityA = getFoodSafetyPriority(a);
        const priorityB = getFoodSafetyPriority(b);
        return priorityA - priorityB;
    });
}

/**
 * Get temperature requirements for category
 */
export function getTemperatureRequirements(categoryName) {
    const requirements = {
        'Dairy': { temp: '34-38°F', storage: 'Refrigerated', urgency: 'High' },
        'Fresh/Frozen Beef': { temp: '33-36°F', storage: 'Refrigerated', urgency: 'Very High' },
        'Fresh/Frozen Poultry': { temp: '33-36°F', storage: 'Refrigerated', urgency: 'Very High' },
        'Fresh/Frozen Fish & Seafood': { temp: '33-36°F', storage: 'Refrigerated', urgency: 'Critical' },
        'Frozen Items': { temp: '0°F or below', storage: 'Frozen', urgency: 'High' },
        'Frozen Meals': { temp: '0°F or below', storage: 'Frozen', urgency: 'High' },
        'Frozen Vegetables': { temp: '0°F or below', storage: 'Frozen', urgency: 'High' },
        'Frozen Fruit': { temp: '0°F or below', storage: 'Frozen', urgency: 'High' },
        'Fresh Fruits': { temp: '35-40°F', storage: 'Cool, Humid', urgency: 'Medium' },
        'Fresh Vegetables': { temp: '35-40°F', storage: 'Cool, Humid', urgency: 'Medium' },
        'Breads': { temp: 'Room temp', storage: 'Dry', urgency: 'Low' }
    };

    return requirements[categoryName] || { temp: 'Room temp', storage: 'Dry', urgency: 'Low' };
}

/**
 * Calculate food safety score for shopping list order
 */
export function calculateFoodSafetyScore(shoppingOrder, timeEstimates) {
    let score = 100;
    let totalTime = 0;

    shoppingOrder.forEach((category, index) => {
        const requirements = getTemperatureRequirements(category);
        const priority = getFoodSafetyPriority(category);
        totalTime += timeEstimates[category] || 2;

        // Deduct points for cold items being in cart too long
        if (requirements.urgency === 'Critical' && totalTime > 15) {
            score -= 20;
        } else if (requirements.urgency === 'Very High' && totalTime > 20) {
            score -= 15;
        } else if (requirements.urgency === 'High' && totalTime > 30) {
            score -= 10;
        }

        // Deduct points for wrong order
        if (priority === 4 && index < shoppingOrder.length - 2) { // Produce too early
            score -= 15;
        } else if (priority === 3 && index < shoppingOrder.length * 0.7) { // Frozen too early
            score -= 10;
        } else if (priority === 1 && index > shoppingOrder.length * 0.4) { // Non-perishables too late
            score -= 5;
        }
    });

    return Math.max(0, Math.min(100, score));
}

/**
 * Get food safety recommendations for improvement
 */
export function getFoodSafetyRecommendations(shoppingOrder, currentScore) {
    const recommendations = [];

    if (currentScore < 70) {
        recommendations.push('🛡️ Critical: Reorganize your shopping order for food safety');
    }

    const produceIndex = shoppingOrder.findIndex(cat =>
        cat === 'Fresh Fruits' || cat === 'Fresh Vegetables'
    );
    const frozenIndex = shoppingOrder.findIndex(cat =>
        cat.includes('Frozen')
    );
    const dairyIndex = shoppingOrder.findIndex(cat =>
        cat === 'Dairy' || cat.includes('Fresh/Frozen')
    );

    if (produceIndex !== -1 && produceIndex < shoppingOrder.length - 2) {
        recommendations.push('🥬 Move produce to the end of your shopping trip');
    }

    if (frozenIndex !== -1 && frozenIndex < shoppingOrder.length * 0.7) {
        recommendations.push('🧊 Shop frozen foods closer to checkout time');
    }

    if (dairyIndex !== -1 && dairyIndex < shoppingOrder.length * 0.4) {
        recommendations.push('🥛 Shop dairy and meat after non-perishable items');
    }

    recommendations.push('⏰ Keep cold items in cart for less than 30 minutes total');
    recommendations.push('🏠 Get home within 2 hours and refrigerate immediately');

    return recommendations;
}

/**
 * Store Layout Helper Functions - Enhanced with Food Safety
 */
export const StoreLayoutUtils = {
    getStoreLayout,
    applyStoreLayout,
    generateShoppingRoute,
    getAvailableStoreLayouts,
    savePreferredStoreLayout,
    getPreferredStoreLayout,
    normalizeCategoryName,
    exportShoppingRoute,

    // Food Safety Functions
    getFoodSafetyPriority,
    sortCategoriesByFoodSafety,
    getTemperatureRequirements,
    calculateFoodSafetyScore,
    getFoodSafetyRecommendations,

    // Quick access to layouts
    layouts: STORE_LAYOUTS,

    // Store chain detection
    detectStoreChain: (storeName, storeChain = '') => {
        const layout = getStoreLayout(storeName, storeChain);
        return layout !== STORE_LAYOUTS.generic ? layout : null;
    },

    // Food safety constants
    FOOD_SAFETY_TIPS: [
        '🧊 Non-perishables first, frozen foods last',
        '🥛 Keep cold items together in cart',
        '🥬 Produce on top to prevent crushing',
        '⏰ Get home within 2 hours (1 hour if >90°F)',
        '🏠 Refrigerate/freeze immediately upon arrival',
        '🛒 Separate raw meat from ready-to-eat foods'
    ]
};