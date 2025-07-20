// file: /src/lib/groceryCategories.js v1 - Comprehensive grocery store category system

/**
 * Comprehensive grocery store category system based on real store layouts
 * Organized by typical grocery store departments and sections
 */

export const GROCERY_CATEGORIES = {
    // FRESH DEPARTMENTS (Perimeter)
    'Fresh Produce': {
        name: 'Fresh Produce',
        icon: '🥬',
        color: '#10b981',
        section: 'Fresh',
        items: ['Fruits', 'Vegetables', 'Herbs', 'Organic Produce', 'Salad Kits', 'Pre-cut Vegetables']
    },
    'Fresh Fruits': {
        name: 'Fresh Fruits',
        icon: '🍎',
        color: '#ef4444',
        section: 'Fresh',
        items: ['Apples', 'Bananas', 'Berries', 'Citrus', 'Melons', 'Tropical Fruits']
    },
    'Fresh Vegetables': {
        name: 'Fresh Vegetables',
        icon: '🥕',
        color: '#f59e0b',
        section: 'Fresh',
        items: ['Leafy Greens', 'Root Vegetables', 'Peppers', 'Onions', 'Tomatoes', 'Squash']
    },

    // MEAT & SEAFOOD
    'Fresh Meat': {
        name: 'Fresh Meat',
        icon: '🥩',
        color: '#dc2626',
        section: 'Fresh',
        items: ['Beef', 'Pork', 'Lamb', 'Ground Meat', 'Specialty Meats']
    },
    'Fresh Poultry': {
        name: 'Fresh Poultry',
        icon: '🐔',
        color: '#f59e0b',
        section: 'Fresh',
        items: ['Chicken', 'Turkey', 'Duck', 'Cornish Hens']
    },
    'Fresh Seafood': {
        name: 'Fresh Seafood',
        icon: '🐟',
        color: '#0ea5e9',
        section: 'Fresh',
        items: ['Fish', 'Shellfish', 'Shrimp', 'Crab', 'Lobster', 'Salmon']
    },

    // DAIRY & REFRIGERATED
    'Dairy': {
        name: 'Dairy',
        icon: '🥛',
        color: '#3b82f6',
        section: 'Refrigerated',
        items: ['Milk', 'Cream', 'Half & Half', 'Buttermilk', 'Non-dairy Milk']
    },
    'Cheese': {
        name: 'Cheese',
        icon: '🧀',
        color: '#f59e0b',
        section: 'Refrigerated',
        items: ['Cheddar', 'Mozzarella', 'Swiss', 'Cream Cheese', 'Specialty Cheese']
    },
    'Eggs': {
        name: 'Eggs',
        icon: '🥚',
        color: '#fbbf24',
        section: 'Refrigerated',
        items: ['Large Eggs', 'Extra Large', 'Organic', 'Free Range', 'Egg Whites']
    },
    'Yogurt': {
        name: 'Yogurt',
        icon: '🥛',
        color: '#8b5cf6',
        section: 'Refrigerated',
        items: ['Greek Yogurt', 'Regular Yogurt', 'Plant-based Yogurt', 'Yogurt Drinks']
    },
    'Refrigerated Items': {
        name: 'Refrigerated Items',
        icon: '❄️',
        color: '#06b6d4',
        section: 'Refrigerated',
        items: ['Dips', 'Hummus', 'Pre-made Salads', 'Fresh Pasta', 'Refrigerated Desserts']
    },

    // DELI & BAKERY
    'Deli': {
        name: 'Deli',
        icon: '🥪',
        color: '#8b5cf6',
        section: 'Fresh',
        items: ['Sliced Meats', 'Sliced Cheese', 'Prepared Salads', 'Hot Foods', 'Sandwiches']
    },
    'Bakery': {
        name: 'Bakery',
        icon: '🍞',
        color: '#d97706',
        section: 'Fresh',
        items: ['Fresh Bread', 'Pastries', 'Cakes', 'Cookies', 'Donuts', 'Bagels']
    },
    'Breads': {
        name: 'Breads',
        icon: '🥖',
        color: '#92400e',
        section: 'Bakery',
        items: ['White Bread', 'Wheat Bread', 'Specialty Breads', 'Tortillas', 'English Muffins']
    },

    // FROZEN FOODS
    'Frozen Vegetables': {
        name: 'Frozen Vegetables',
        icon: '🥦',
        color: '#059669',
        section: 'Frozen',
        items: ['Mixed Vegetables', 'Broccoli', 'Corn', 'Peas', 'Spinach', 'Stir Fry Mixes']
    },
    'Frozen Fruits': {
        name: 'Frozen Fruits',
        icon: '🍓',
        color: '#ec4899',
        section: 'Frozen',
        items: ['Berries', 'Tropical Fruits', 'Smoothie Mixes', 'Fruit Medleys']
    },
    'Frozen Meals': {
        name: 'Frozen Meals',
        icon: '🍽️',
        color: '#6366f1',
        section: 'Frozen',
        items: ['TV Dinners', 'Lean Cuisine', 'Family Size Meals', 'Organic Frozen Meals']
    },
    'Frozen Meat': {
        name: 'Frozen Meat',
        icon: '🧊',
        color: '#ef4444',
        section: 'Frozen',
        items: ['Frozen Beef', 'Frozen Chicken', 'Frozen Fish', 'Frozen Seafood']
    },
    'Ice Cream': {
        name: 'Ice Cream',
        icon: '🍦',
        color: '#f472b6',
        section: 'Frozen',
        items: ['Ice Cream', 'Frozen Yogurt', 'Sherbet', 'Ice Cream Bars', 'Novelties']
    },
    'Frozen Pizza': {
        name: 'Frozen Pizza',
        icon: '🍕',
        color: '#f59e0b',
        section: 'Frozen',
        items: ['Thin Crust', 'Thick Crust', 'Personal Size', 'Gluten Free', 'Organic']
    },
    'Frozen Breakfast': {
        name: 'Frozen Breakfast',
        icon: '🧇',
        color: '#fbbf24',
        section: 'Frozen',
        items: ['Waffles', 'Pancakes', 'French Toast', 'Breakfast Sandwiches', 'Hash Browns']
    },

    // DRY GOODS & PANTRY
    'Canned Vegetables': {
        name: 'Canned Vegetables',
        icon: '🥫',
        color: '#059669',
        section: 'Pantry',
        items: ['Green Beans', 'Corn', 'Peas', 'Carrots', 'Mixed Vegetables', 'Artichokes']
    },
    'Canned Fruits': {
        name: 'Canned Fruits',
        icon: '🍑',
        color: '#ef4444',
        section: 'Pantry',
        items: ['Peaches', 'Pears', 'Pineapple', 'Fruit Cocktail', 'Applesauce', 'Cranberry Sauce']
    },
    'Canned Tomatoes': {
        name: 'Canned Tomatoes',
        icon: '🍅',
        color: '#dc2626',
        section: 'Pantry',
        items: ['Whole Tomatoes', 'Diced Tomatoes', 'Crushed Tomatoes', 'Tomato Paste', 'Tomato Sauce']
    },
    'Soups': {
        name: 'Soups',
        icon: '🍲',
        color: '#f59e0b',
        section: 'Pantry',
        items: ['Canned Soup', 'Dry Soup Mixes', 'Broth', 'Stock', 'Bouillon', 'Instant Soup']
    },
    'Pasta': {
        name: 'Pasta',
        icon: '🍝',
        color: '#fbbf24',
        section: 'Pantry',
        items: ['Spaghetti', 'Penne', 'Macaroni', 'Lasagna', 'Specialty Pasta', 'Gluten Free Pasta']
    },
    'Rice & Grains': {
        name: 'Rice & Grains',
        icon: '🌾',
        color: '#92400e',
        section: 'Pantry',
        items: ['White Rice', 'Brown Rice', 'Quinoa', 'Barley', 'Oats', 'Couscous']
    },
    'Beans & Legumes': {
        name: 'Beans & Legumes',
        icon: '🫘',
        color: '#7c2d12',
        section: 'Pantry',
        items: ['Black Beans', 'Kidney Beans', 'Chickpeas', 'Lentils', 'Pinto Beans', 'Navy Beans']
    },

    // BAKING & COOKING
    'Baking Ingredients': {
        name: 'Baking Ingredients',
        icon: '🧁',
        color: '#ec4899',
        section: 'Pantry',
        items: ['Flour', 'Sugar', 'Baking Powder', 'Baking Soda', 'Vanilla', 'Food Coloring']
    },
    'Cooking Oil': {
        name: 'Cooking Oil',
        icon: '🫒',
        color: '#65a30d',
        section: 'Pantry',
        items: ['Vegetable Oil', 'Olive Oil', 'Canola Oil', 'Coconut Oil', 'Cooking Spray']
    },
    'Spices & Seasonings': {
        name: 'Spices & Seasonings',
        icon: '🌶️',
        color: '#dc2626',
        section: 'Pantry',
        items: ['Salt', 'Pepper', 'Garlic Powder', 'Onion Powder', 'Paprika', 'Seasoning Blends']
    },
    'Sauces & Condiments': {
        name: 'Sauces & Condiments',
        icon: '🥫',
        color: '#7c2d12',
        section: 'Pantry',
        items: ['Ketchup', 'Mustard', 'Mayo', 'BBQ Sauce', 'Hot Sauce', 'Salad Dressing']
    },
    'Vinegar': {
        name: 'Vinegar',
        icon: '🍶',
        color: '#6b7280',
        section: 'Pantry',
        items: ['White Vinegar', 'Apple Cider Vinegar', 'Balsamic Vinegar', 'Rice Vinegar']
    },

    // BREAKFAST & CEREAL
    'Cereal': {
        name: 'Cereal',
        icon: '🥣',
        color: '#f59e0b',
        section: 'Pantry',
        items: ['Cold Cereal', 'Granola', 'Oatmeal', 'Instant Oatmeal', 'Breakfast Bars']
    },
    'Breakfast Items': {
        name: 'Breakfast Items',
        icon: '🥞',
        color: '#fbbf24',
        section: 'Pantry',
        items: ['Pancake Mix', 'Syrup', 'Honey', 'Jam', 'Peanut Butter', 'Coffee']
    },

    // BEVERAGES
    'Water': {
        name: 'Water',
        icon: '💧',
        color: '#0ea5e9',
        section: 'Beverages',
        items: ['Bottled Water', 'Sparkling Water', 'Flavored Water', 'Sports Drinks']
    },
    'Soft Drinks': {
        name: 'Soft Drinks',
        icon: '🥤',
        color: '#ef4444',
        section: 'Beverages',
        items: ['Soda', 'Diet Soda', 'Energy Drinks', 'Juice Boxes', 'Mixers']
    },
    'Juices': {
        name: 'Juices',
        icon: '🧃',
        color: '#f59e0b',
        section: 'Beverages',
        items: ['Orange Juice', 'Apple Juice', 'Cranberry Juice', 'Vegetable Juice', 'Smoothies']
    },
    'Coffee & Tea': {
        name: 'Coffee & Tea',
        icon: '☕',
        color: '#92400e',
        section: 'Beverages',
        items: ['Ground Coffee', 'Whole Bean Coffee', 'Instant Coffee', 'Tea Bags', 'Loose Tea']
    },
    'Beer & Wine': {
        name: 'Beer & Wine',
        icon: '🍷',
        color: '#7c2d12',
        section: 'Alcohol',
        items: ['Beer', 'Wine', 'Champagne', 'Cooking Wine']
    },

    // SNACKS & CANDY
    'Chips & Crackers': {
        name: 'Chips & Crackers',
        icon: '🍿',
        color: '#f59e0b',
        section: 'Snacks',
        items: ['Potato Chips', 'Tortilla Chips', 'Crackers', 'Pretzels', 'Popcorn']
    },
    'Nuts & Seeds': {
        name: 'Nuts & Seeds',
        icon: '🥜',
        color: '#92400e',
        section: 'Snacks',
        items: ['Peanuts', 'Almonds', 'Cashews', 'Mixed Nuts', 'Sunflower Seeds', 'Trail Mix']
    },
    'Candy': {
        name: 'Candy',
        icon: '🍬',
        color: '#ec4899',
        section: 'Snacks',
        items: ['Chocolate', 'Gummy Candy', 'Hard Candy', 'Mints', 'Gum']
    },
    'Cookies & Sweets': {
        name: 'Cookies & Sweets',
        icon: '🍪',
        color: '#f472b6',
        section: 'Snacks',
        items: ['Cookies', 'Crackers', 'Granola Bars', 'Fruit Snacks', 'Cake Mixes']
    },

    // HEALTH & BEAUTY
    'Personal Care': {
        name: 'Personal Care',
        icon: '🧴',
        color: '#8b5cf6',
        section: 'Health & Beauty',
        items: ['Shampoo', 'Conditioner', 'Body Wash', 'Soap', 'Deodorant', 'Toothpaste']
    },
    'Health Items': {
        name: 'Health Items',
        icon: '💊',
        color: '#ef4444',
        section: 'Health & Beauty',
        items: ['Vitamins', 'Pain Relief', 'First Aid', 'Thermometers', 'Supplements']
    },
    'Baby Care': {
        name: 'Baby Care',
        icon: '👶',
        color: '#f472b6',
        section: 'Health & Beauty',
        items: ['Diapers', 'Baby Food', 'Formula', 'Baby Wipes', 'Baby Lotion']
    },

    // HOUSEHOLD & CLEANING
    'Cleaning Supplies': {
        name: 'Cleaning Supplies',
        icon: '🧽',
        color: '#06b6d4',
        section: 'Household',
        items: ['All-Purpose Cleaner', 'Dish Soap', 'Laundry Detergent', 'Paper Towels', 'Toilet Paper']
    },
    'Paper Products': {
        name: 'Paper Products',
        icon: '🧻',
        color: '#6b7280',
        section: 'Household',
        items: ['Toilet Paper', 'Paper Towels', 'Napkins', 'Facial Tissues', 'Aluminum Foil']
    },
    'Laundry': {
        name: 'Laundry',
        icon: '🧺',
        color: '#3b82f6',
        section: 'Household',
        items: ['Detergent', 'Fabric Softener', 'Bleach', 'Stain Remover', 'Dryer Sheets']
    },

    // PET SUPPLIES
    'Pet Food': {
        name: 'Pet Food',
        icon: '🐕',
        color: '#92400e',
        section: 'Pet',
        items: ['Dog Food', 'Cat Food', 'Pet Treats', 'Pet Litter', 'Pet Supplies']
    },

    // MISC & OTHER
    'Other': {
        name: 'Other',
        icon: '🛒',
        color: '#6b7280',
        section: 'Other',
        items: ['Miscellaneous Items', 'Hardware', 'Auto', 'Electronics', 'Seasonal']
    }
};

/**
 * Get categories organized by section
 */
export function getCategoriesBySection() {
    const sections = {};

    Object.entries(GROCERY_CATEGORIES).forEach(([key, category]) => {
        const section = category.section;
        if (!sections[section]) {
            sections[section] = [];
        }
        sections[section].push({ key, ...category });
    });

    return sections;
}

/**
 * Get category suggestions based on item name using AI/ML patterns
 */
export function suggestCategoryForItem(itemName) {
    if (!itemName) return 'Other';

    const item = itemName.toLowerCase().trim();

    // Produce patterns
    if (/^(apple|banana|orange|lemon|lime|grape|berry|melon|peach|pear|plum|cherry|kiwi|mango|pineapple|avocado|coconut)/i.test(item)) {
        return 'Fresh Fruits';
    }

    if (/^(onion|garlic|tomato|lettuce|spinach|carrot|celery|pepper|broccoli|cauliflower|cucumber|potato|mushroom|cabbage|zucchini)/i.test(item)) {
        return 'Fresh Vegetables';
    }

    // Herbs and seasonings
    if (/\b(powder|dried|fresh|chopped|minced|ground)\b.*\b(garlic|onion|ginger|herb|basil|oregano|thyme|rosemary|parsley|cilantro|sage)/i.test(item)) {
        return 'Spices & Seasonings';
    }

    // Meat patterns
    if (/\b(beef|steak|ground beef|hamburger|roast|chuck|sirloin|ribeye)/i.test(item)) {
        return 'Fresh Meat';
    }

    if (/\b(chicken|turkey|duck|poultry|breast|thigh|wing|drumstick)/i.test(item)) {
        return 'Fresh Poultry';
    }

    if (/(fish|salmon|tuna|cod|tilapia|shrimp|crab|lobster|scallop|oyster|clam|seafood)/i.test(item)) {
        return 'Fresh Seafood';
    }

    // Dairy patterns
    if (/\b(milk|cream|half|buttermilk|almond milk|soy milk|oat milk)/i.test(item)) {
        return 'Dairy';
    }

    if (/\b(cheese|cheddar|mozzarella|swiss|parmesan|cream cheese|cottage cheese)/i.test(item)) {
        return 'Cheese';
    }

    if (/\b(egg|eggs)\b/i.test(item)) {
        return 'Eggs';
    }

    // Baking patterns
    if (/\b(flour|sugar|brown sugar|baking powder|baking soda|vanilla|yeast|cocoa|chocolate chips)/i.test(item)) {
        return 'Baking Ingredients';
    }

    // Oil patterns
    if (/\b(oil|olive oil|vegetable oil|canola oil|coconut oil|cooking spray)\b/i.test(item)) {
        return 'Cooking Oil';
    }

    // Common cooking ingredients
    if (/\b(salt|pepper|garlic powder|onion powder|paprika|cumin|chili|oregano|basil|thyme)/i.test(item)) {
        return 'Spices & Seasonings';
    }

    // Bread patterns
    if (/\b(bread|loaf|bagel|english muffin|tortilla|pita|roll|bun)/i.test(item)) {
        return 'Breads';
    }

    // Pasta patterns
    if (/\b(pasta|spaghetti|penne|macaroni|linguine|fettuccine|noodle|lasagna)/i.test(item)) {
        return 'Pasta';
    }

    // Rice and grains
    if (/\b(rice|quinoa|barley|oats|oatmeal|cereal|granola)/i.test(item)) {
        return (/\b(cereal|granola)\b/i.test(item)) ? 'Cereal' : 'Rice & Grains';
    }

    // Canned goods
    if (/^canned|can of|jar of/i.test(item)) {
        if (/tomato/i.test(item)) return 'Canned Tomatoes';
        if (/(corn|green bean|peas|carrot|vegetable)/i.test(item)) return 'Canned Vegetables';
        if (/(peach|pear|pineapple|fruit)/i.test(item)) return 'Canned Fruits';
        if (/(bean|chickpea|lentil)/i.test(item)) return 'Beans & Legumes';
        return 'Other';
    }

    // Frozen items
    if (/^frozen/i.test(item)) {
        if (/(vegetable|broccoli|corn|peas)/i.test(item)) return 'Frozen Vegetables';
        if (/(fruit|berry|strawberry|blueberry)/i.test(item)) return 'Frozen Fruits';
        if (/(meal|dinner|entree)/i.test(item)) return 'Frozen Meals';
        if (/(pizza)/i.test(item)) return 'Frozen Pizza';
        if (/(waffle|pancake|french toast)/i.test(item)) return 'Frozen Breakfast';
        return 'Frozen Meals';
    }

    // Beverages
    if (/\b(juice|soda|water|coffee|tea|beer|wine|milk)\b/i.test(item)) {
        if (/juice/i.test(item)) return 'Juices';
        if (/\b(soda|cola|pepsi|coke|sprite|energy drink)\b/i.test(item)) return 'Soft Drinks';
        if (/water/i.test(item)) return 'Water';
        if (/(coffee|tea)/i.test(item)) return 'Coffee & Tea';
        if (/(beer|wine)/i.test(item)) return 'Beer & Wine';
        return 'Water';
    }

    // Cleaning and household
    if (/(cleaner|detergent|soap|paper towel|toilet paper|napkin|tissue)/i.test(item)) {
        if (/(paper towel|toilet paper|napkin|tissue|aluminum foil)/i.test(item)) return 'Paper Products';
        if (/(detergent|fabric softener|bleach)/i.test(item)) return 'Laundry';
        return 'Cleaning Supplies';
    }

    // Personal care
    if (/(shampoo|conditioner|soap|toothpaste|deodorant|lotion|shaving)/i.test(item)) {
        return 'Personal Care';
    }

    // Default fallback
    return 'Other';
}

/**
 * Get all category names as array
 */
export function getAllCategoryNames() {
    return Object.keys(GROCERY_CATEGORIES);
}

/**
 * Get category info by name
 */
export function getCategoryInfo(categoryName) {
    return GROCERY_CATEGORIES[categoryName] || GROCERY_CATEGORIES['Other'];
}

/**
 * Validate category name
 */
export function isValidCategory(categoryName) {
    return categoryName in GROCERY_CATEGORIES;
}

/**
 * Get default store category order (food safety optimized)
 */
export function getDefaultCategoryOrder() {
    return [
        // Non-perishables first
        'Canned Vegetables', 'Canned Fruits', 'Canned Tomatoes', 'Beans & Legumes',
        'Pasta', 'Rice & Grains', 'Soups',
        'Baking Ingredients', 'Cooking Oil', 'Spices & Seasonings', 'Sauces & Condiments', 'Vinegar',
        'Cereal', 'Breakfast Items', 'Chips & Crackers', 'Nuts & Seeds', 'Candy', 'Cookies & Sweets',
        'Water', 'Soft Drinks', 'Juices', 'Coffee & Tea',
        'Cleaning Supplies', 'Paper Products', 'Laundry', 'Personal Care', 'Health Items', 'Baby Care',
        'Pet Food', 'Other',

        // Refrigerated items
        'Dairy', 'Cheese', 'Eggs', 'Yogurt', 'Refrigerated Items',
        'Fresh Meat', 'Fresh Poultry', 'Fresh Seafood',
        'Deli', 'Breads',

        // Frozen items
        'Frozen Vegetables', 'Frozen Fruits', 'Frozen Meals', 'Frozen Meat',
        'Frozen Pizza', 'Frozen Breakfast', 'Ice Cream',

        // Fresh produce last
        'Fresh Fruits', 'Fresh Vegetables', 'Fresh Produce'
    ];
}

/**
 * Category management utilities
 */
export const CategoryUtils = {
    getCategoriesBySection,
    suggestCategoryForItem,
    getAllCategoryNames,
    getCategoryInfo,
    isValidCategory,
    getDefaultCategoryOrder,

    // Create new custom category
    createCustomCategory: (name, icon = '📦', color = '#6b7280', section = 'Other') => ({
        name,
        icon,
        color,
        section,
        items: [],
        custom: true
    }),

    // Merge categories with custom ones
    mergeWithCustomCategories: (customCategories = {}) => ({
        ...GROCERY_CATEGORIES,
        ...customCategories
    })
};