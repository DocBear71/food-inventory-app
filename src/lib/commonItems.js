// file: /src/lib/commonItems.js - v1

export const COMMON_ITEMS = {
    'pantry-staples': {
        name: '🏠 Pantry Staples',
        icon: '🏠',
        items: [
            { name: 'Rice (White)', category: 'Grains', unit: 'lbs', defaultQuantity: 2, location: 'pantry' },
            { name: 'Rice (Brown)', category: 'Grains', unit: 'lbs', defaultQuantity: 1, location: 'pantry' },
            { name: 'Pasta (Spaghetti)', category: 'Pasta', unit: 'lbs', defaultQuantity: 1, location: 'pantry' },
            { name: 'Pasta (Penne)', category: 'Pasta', unit: 'lbs', defaultQuantity: 1, location: 'pantry' },
            { name: 'All-Purpose Flour', category: 'Grains', unit: 'lbs', defaultQuantity: 5, location: 'pantry' },
            { name: 'Sugar (Granulated)', category: 'Other', unit: 'lbs', defaultQuantity: 4, location: 'pantry' },
            { name: 'Brown Sugar', category: 'Other', unit: 'lbs', defaultQuantity: 1, location: 'pantry' },
            { name: 'Salt', category: 'Seasonings', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Black Pepper', category: 'Seasonings', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Olive Oil', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Vegetable Oil', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'White Vinegar', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Baking Soda', category: 'Other', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Baking Powder', category: 'Other', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Vanilla Extract', category: 'Other', unit: 'item', defaultQuantity: 1, location: 'pantry' },
        ]
    },
    'canned-jarred': {
        name: '🥫 Canned & Jarred',
        icon: '🥫',
        items: [
            { name: 'Tomato Sauce', category: 'Canned Sauces', unit: 'can', defaultQuantity: 4, location: 'pantry' },
            { name: 'Diced Tomatoes', category: 'Canned Tomatoes', unit: 'can', defaultQuantity: 3, location: 'pantry' },
            { name: 'Tomato Paste', category: 'Canned Tomatoes', unit: 'can', defaultQuantity: 2, location: 'pantry' },
            { name: 'Chicken Broth', category: 'Stock/Broth', unit: 'can', defaultQuantity: 4, location: 'pantry' },
            { name: 'Vegetable Broth', category: 'Stock/Broth', unit: 'can', defaultQuantity: 2, location: 'pantry' },
            { name: 'Black Beans', category: 'Canned Beans', unit: 'can', defaultQuantity: 2, location: 'pantry' },
            { name: 'Kidney Beans', category: 'Canned Beans', unit: 'can', defaultQuantity: 2, location: 'pantry' },
            { name: 'Chickpeas/Garbanzo Beans', category: 'Canned Beans', unit: 'can', defaultQuantity: 2, location: 'pantry' },
            { name: 'Corn (Canned)', category: 'Canned Vegetables', unit: 'can', defaultQuantity: 2, location: 'pantry' },
            { name: 'Green Beans (Canned)', category: 'Canned Vegetables', unit: 'can', defaultQuantity: 2, location: 'pantry' },
            { name: 'Tuna', category: 'Canned Meat', unit: 'can', defaultQuantity: 4, location: 'pantry' },
            { name: 'Peanut Butter', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Jelly/Jam', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'pantry' },
        ]
    },
    'dairy-eggs': {
        name: '🥛 Dairy & Eggs',
        icon: '🥛',
        items: [
            { name: 'Milk (Whole)', category: 'Dairy', unit: 'item', defaultQuantity: 1, location: 'fridge' },
            { name: 'Eggs (Large)', category: 'Eggs', unit: 'item', defaultQuantity: 1, location: 'fridge' },
            { name: 'Butter', category: 'Dairy', unit: 'item', defaultQuantity: 1, location: 'fridge' },
            { name: 'Cheddar Cheese', category: 'Cheese', unit: 'item', defaultQuantity: 1, location: 'fridge' },
            { name: 'Mozzarella Cheese', category: 'Cheese', unit: 'item', defaultQuantity: 1, location: 'fridge' },
            { name: 'Cream Cheese', category: 'Cheese', unit: 'item', defaultQuantity: 1, location: 'fridge' },
            { name: 'Greek Yogurt', category: 'Dairy', unit: 'item', defaultQuantity: 1, location: 'fridge' },
            { name: 'Sour Cream', category: 'Dairy', unit: 'item', defaultQuantity: 1, location: 'fridge' },
            { name: 'Heavy Cream', category: 'Dairy', unit: 'item', defaultQuantity: 1, location: 'fridge' },
        ]
    },
    'fresh-produce': {
        name: '🥕 Fresh Produce',
        icon: '🥕',
        items: [
            { name: 'Onions (Yellow)', category: 'Fresh Vegetables', unit: 'lbs', defaultQuantity: 2, location: 'pantry' },
            { name: 'Garlic', category: 'Fresh Vegetables', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Carrots', category: 'Fresh Vegetables', unit: 'lbs', defaultQuantity: 1, location: 'fridge' },
            { name: 'Celery', category: 'Fresh Vegetables', unit: 'item', defaultQuantity: 1, location: 'fridge' },
            { name: 'Potatoes (Russet)', category: 'Fresh Vegetables', unit: 'lbs', defaultQuantity: 3, location: 'pantry' },
            { name: 'Bananas', category: 'Fresh Fruits', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Apples', category: 'Fresh Fruits', unit: 'lbs', defaultQuantity: 2, location: 'fridge' },
            { name: 'Lemons', category: 'Fresh Fruits', unit: 'item', defaultQuantity: 3, location: 'fridge' },
            { name: 'Bell Peppers', category: 'Fresh Vegetables', unit: 'item', defaultQuantity: 3, location: 'fridge' },
            { name: 'Tomatoes', category: 'Fresh Vegetables', unit: 'lbs', defaultQuantity: 1, location: 'fridge' },
        ]
    },
    'frozen-foods': {
        name: '🧊 Frozen Foods',
        icon: '🧊',
        items: [
            { name: 'Frozen Peas', category: 'Frozen Vegetables', unit: 'item', defaultQuantity: 1, location: 'freezer' },
            { name: 'Frozen Corn', category: 'Frozen Vegetables', unit: 'item', defaultQuantity: 1, location: 'freezer' },
            { name: 'Frozen Broccoli', category: 'Frozen Vegetables', unit: 'item', defaultQuantity: 1, location: 'freezer' },
            { name: 'Frozen Mixed Vegetables', category: 'Frozen Vegetables', unit: 'item', defaultQuantity: 1, location: 'freezer' },
            { name: 'Frozen Berries', category: 'Frozen Fruit', unit: 'item', defaultQuantity: 1, location: 'freezer' },
            { name: 'Chicken Breasts (Frozen)', category: 'Fresh/Frozen Poultry', unit: 'lbs', defaultQuantity: 2, location: 'freezer' },
            { name: 'Ground Beef (Frozen)', category: 'Fresh/Frozen Beef', unit: 'lbs', defaultQuantity: 1, location: 'freezer' },
        ]
    },
    'spices-seasonings': {
        name: '🌶️ Spices & Seasonings',
        icon: '🌶️',
        items: [
            { name: 'Garlic Powder', category: 'Seasonings', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Onion Powder', category: 'Seasonings', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Paprika', category: 'Spices', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Cumin', category: 'Spices', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Chili Powder', category: 'Spices', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Italian Seasoning', category: 'Seasonings', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Oregano', category: 'Spices', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Thyme', category: 'Spices', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Bay Leaves', category: 'Spices', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Red Pepper Flakes', category: 'Spices', unit: 'item', defaultQuantity: 1, location: 'pantry' },
        ]
    },
    'condiments-sauces': {
        name: '🍯 Condiments & Sauces',
        icon: '🍯',
        items: [
            { name: 'Ketchup', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'fridge' },
            { name: 'Mustard (Yellow)', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'fridge' },
            { name: 'Mayonnaise', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'fridge' },
            { name: 'Soy Sauce', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Hot Sauce', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Worcestershire Sauce', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Honey', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Barbecue Sauce', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Ranch Dressing', category: 'Condiments', unit: 'item', defaultQuantity: 1, location: 'fridge' },
        ]
    },
    'beverages': {
        name: '🥤 Beverages',
        icon: '🥤',
        items: [
            { name: 'Coffee (Ground)', category: 'Beverages', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Tea Bags', category: 'Beverages', unit: 'item', defaultQuantity: 1, location: 'pantry' },
            { name: 'Orange Juice', category: 'Beverages', unit: 'item', defaultQuantity: 1, location: 'fridge' },
            { name: 'Bottled Water', category: 'Beverages', unit: 'item', defaultQuantity: 1, location: 'pantry' },
        ]
    }
};

export const getAllCommonItems = () => {
    const allItems = [];
    Object.entries(COMMON_ITEMS).forEach(([categoryKey, categoryData]) => {
        categoryData.items.forEach(item => {
            allItems.push({
                ...item,
                categoryKey,
                categoryName: categoryData.name,
                id: `${categoryKey}-${item.name.toLowerCase().replace(/\s+/g, '-')}`
            });
        });
    });
    return allItems;
};

export const getItemsByCategory = (categoryKey) => {
    return COMMON_ITEMS[categoryKey]?.items || [];
};

export const getCategoryInfo = (categoryKey) => {
    return COMMON_ITEMS[categoryKey] || null;
};