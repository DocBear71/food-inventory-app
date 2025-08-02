// file: /src/lib/groceryCategories.js v2 - Comprehensive grocery store category system with International sections

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
        items: [
            'Fruits', 'Vegetables', 'Herbs', 'Organic Produce', 'Salad Kits', 'Pre-cut Vegetables',
            'Leafy Greens', 'Root Vegetables', 'Peppers', 'Onions', 'Tomatoes', 'Squash',
            'Bell Peppers', 'Red Bell Pepper', 'Green Bell Pepper', 'Yellow Bell Pepper',
            'Jalapeño', 'Serrano', 'Habanero', 'Poblano', 'Anaheim', 'Cilantro', 'Parsley',
            'Basil', 'Mint', 'Rosemary', 'Thyme', 'Oregano', 'Sage', 'Dill', 'Chives',
            'Green Onions', 'Scallions', 'Shallots', 'Leeks', 'Garlic', 'Ginger',
            'Avocados', 'Cucumbers', 'Zucchini', 'Yellow Squash', 'Eggplant',
            'Broccoli', 'Cauliflower', 'Brussels Sprouts', 'Cabbage', 'Bok Choy',
            'Kale', 'Spinach', 'Arugula', 'Lettuce', 'Swiss Chard', 'Collard Greens'
        ]
    },
    'Fresh Fruits': {
        name: 'Fresh Fruits',
        icon: '🍎',
        color: '#ef4444',
        section: 'Fresh',
        items: [
            'Apples', 'Bananas', 'Berries', 'Citrus', 'Melons', 'Tropical Fruits',
            'Strawberries', 'Blueberries', 'Raspberries', 'Blackberries', 'Cranberries',
            'Oranges', 'Lemons', 'Limes', 'Grapefruits', 'Tangerines', 'Clementines',
            'Grapes', 'Pineapple', 'Mango', 'Papaya', 'Kiwi', 'Coconut',
            'Peaches', 'Pears', 'Plums', 'Cherries', 'Apricots', 'Nectarines',
            'Watermelon', 'Cantaloupe', 'Honeydew', 'Pomegranate', 'Persimmons'
        ]
    },
    'Fresh Vegetables': {
        name: 'Fresh Vegetables',
        icon: '🥕',
        color: '#f59e0b',
        section: 'Fresh',
        items: [
            'Carrots', 'Celery', 'Potatoes', 'Sweet Potatoes', 'Yams', 'Beets',
            'Radishes', 'Turnips', 'Parsnips', 'Rutabagas', 'Jicama',
            'Asparagus', 'Green Beans', 'Snow Peas', 'Sugar Snap Peas',
            'Corn', 'Okra', 'Artichokes', 'Fennel', 'Mushrooms',
            'Button Mushrooms', 'Cremini Mushrooms', 'Portobello Mushrooms',
            'Shiitake Mushrooms', 'Oyster Mushrooms', 'Enoki Mushrooms'
        ]
    },

    // MEAT & SEAFOOD
    'Fresh Meat': {
        name: 'Fresh Meat',
        icon: '🥩',
        color: '#dc2626',
        section: 'Fresh',
        items: [
            'Beef', 'Pork', 'Lamb', 'Ground Meat', 'Specialty Meats',
            'Ground Beef', 'Ground Chuck', 'Ground Sirloin', 'Lean Ground Beef',
            'Extra Lean Ground Beef', 'Ground Pork', 'Ground Lamb',
            'Beef Steak', 'Sirloin Steak', 'Ribeye', 'Filet Mignon', 'T-Bone',
            'Strip Steak', 'Chuck Roast', 'Pot Roast', 'Brisket', 'Short Ribs',
            'Beef Tenderloin', 'Flank Steak', 'Skirt Steak', 'Round Steak',
            'Pork Chops', 'Pork Tenderloin', 'Pork Shoulder', 'Pork Ribs',
            'Bacon', 'Ham', 'Prosciutto', 'Pancetta', 'Canadian Bacon',
            'Lamb Chops', 'Leg of Lamb', 'Lamb Shoulder', 'Rack of Lamb'
        ]
    },
    'Fresh Poultry': {
        name: 'Fresh Poultry',
        icon: '🐔',
        color: '#f59e0b',
        section: 'Fresh',
        items: [
            'Chicken', 'Turkey', 'Duck', 'Cornish Hens', 'Quail',
            'Chicken Breast', 'Chicken Breasts', 'Boneless Chicken Breast',
            'Skinless Chicken Breast', 'Chicken Thighs', 'Chicken Legs',
            'Chicken Wings', 'Whole Chicken', 'Chicken Drumsticks',
            'Ground Chicken', 'Ground Turkey', 'Turkey Breast', 'Turkey Thighs',
            'Whole Turkey', 'Turkey Wings', 'Turkey Legs'
        ]
    },
    'Fresh Seafood': {
        name: 'Fresh Seafood',
        icon: '🐟',
        color: '#0ea5e9',
        section: 'Fresh',
        items: [
            'Fish', 'Shellfish', 'Shrimp', 'Crab', 'Lobster', 'Salmon',
            'Tuna', 'Cod', 'Halibut', 'Mahi Mahi', 'Tilapia', 'Snapper',
            'Bass', 'Flounder', 'Sole', 'Mackerel', 'Sardines',
            'Scallops', 'Mussels', 'Clams', 'Oysters', 'Calamari',
            'King Crab', 'Snow Crab', 'Dungeness Crab', 'Blue Crab'
        ]
    },

    // DAIRY & REFRIGERATED
    'Dairy': {
        name: 'Dairy',
        icon: '🥛',
        color: '#3b82f6',
        section: 'Refrigerated',
        items: [
            'Milk', 'Cream', 'Half & Half', 'Buttermilk', 'Non-dairy Milk',
            'Whole Milk', '2% Milk', '1% Milk', 'Skim Milk', 'Vitamin D Milk',
            'Heavy Cream', 'Heavy Whipping Cream', 'Light Cream', 'Sour Cream',
            'Almond Milk', 'Oat Milk', 'Soy Milk', 'Coconut Milk', 'Rice Milk',
            'Cashew Milk', 'Hemp Milk', 'Pea Milk'
        ]
    },
    'Cheese': {
        name: 'Cheese',
        icon: '🧀',
        color: '#f59e0b',
        section: 'Refrigerated',
        items: [
            'Cheddar', 'Mozzarella', 'Swiss', 'Cream Cheese', 'Specialty Cheese',
            'Sharp Cheddar', 'Mild Cheddar', 'Aged Cheddar', 'White Cheddar',
            'Shredded Cheddar', 'Sliced Cheddar', 'Block Cheddar',
            'Fresh Mozzarella', 'Part Skim Mozzarella', 'Whole Milk Mozzarella',
            'Shredded Mozzarella', 'String Cheese', 'Mozzarella Balls',
            'Parmesan', 'Parmigiano-Reggiano', 'Grated Parmesan', 'Romano',
            'Provolone', 'Swiss Cheese', 'Baby Swiss', 'Gruyere',
            'Gouda', 'Edam', 'Brie', 'Camembert', 'Feta', 'Goat Cheese',
            'Blue Cheese', 'Gorgonzola', 'Roquefort', 'Stilton',
            'Ricotta', 'Cottage Cheese', 'Mascarpone', 'Boursin',
            'Monterey Jack', 'Pepper Jack', 'Colby', 'Muenster'
        ]
    },
    'Eggs': {
        name: 'Eggs',
        icon: '🥚',
        color: '#fbbf24',
        section: 'Refrigerated',
        items: [
            'Large Eggs', 'Extra Large', 'Organic', 'Free Range', 'Egg Whites',
            'Medium Eggs', 'Small Eggs', 'Jumbo Eggs', 'Brown Eggs',
            'Cage Free Eggs', 'Pasture Raised Eggs', 'Omega-3 Eggs',
            'Liquid Egg Whites', 'Liquid Whole Eggs', 'Egg Substitute'
        ]
    },
    'Yogurt': {
        name: 'Yogurt',
        icon: '🥛',
        color: '#8b5cf6',
        section: 'Refrigerated',
        items: [
            'Greek Yogurt', 'Regular Yogurt', 'Plant-based Yogurt', 'Yogurt Drinks',
            'Plain Greek Yogurt', 'Vanilla Greek Yogurt', 'Strawberry Yogurt',
            'Blueberry Yogurt', 'Peach Yogurt', 'Low Fat Yogurt', 'Non Fat Yogurt',
            'Whole Milk Yogurt', 'Kefir', 'Skyr', 'Labneh'
        ]
    },
    'Refrigerated Items': {
        name: 'Refrigerated Items',
        icon: '❄️',
        color: '#06b6d4',
        section: 'Refrigerated',
        items: [
            'Dips', 'Hummus', 'Pre-made Salads', 'Fresh Pasta', 'Refrigerated Desserts',
            'Guacamole', 'Salsa', 'Queso', 'Spinach Dip', 'Artichoke Dip',
            'Fresh Tortellini', 'Fresh Ravioli', 'Fresh Gnocchi', 'Fresh Linguine',
            'Refrigerated Pizza Dough', 'Refrigerated Pie Crust', 'Cookie Dough',
            'Tofu', 'Tempeh', 'Seitan', 'Plant-Based Meat'
        ]
    },

    // DELI & BAKERY
    'Deli': {
        name: 'Deli',
        icon: '🥪',
        color: '#8b5cf6',
        section: 'Fresh',
        items: [
            'Sliced Meats', 'Sliced Cheese', 'Prepared Salads', 'Hot Foods', 'Sandwiches',
            'Turkey', 'Ham', 'Roast Beef', 'Pastrami', 'Salami', 'Pepperoni',
            'Bologna', 'Mortadella', 'Capicola', 'Sopressata',
            'Potato Salad', 'Macaroni Salad', 'Coleslaw', 'Chicken Salad',
            'Egg Salad', 'Tuna Salad', 'Pasta Salad', 'Olives', 'Pickles'
        ]
    },
    'Bakery': {
        name: 'Bakery',
        icon: '🍞',
        color: '#d97706',
        section: 'Fresh',
        items: [
            'Fresh Bread', 'Pastries', 'Cakes', 'Cookies', 'Donuts', 'Bagels',
            'Croissants', 'Danish', 'Muffins', 'Scones', 'Biscuits',
            'Artisan Bread', 'Sourdough', 'French Bread', 'Italian Bread',
            'Dinner Rolls', 'Hamburger Buns', 'Hot Dog Buns', 'Kaiser Rolls',
            'Cupcakes', 'Brownies', 'Bars', 'Pies', 'Tarts', 'Cheesecake'
        ]
    },
    'Breads': {
        name: 'Breads',
        icon: '🥖',
        color: '#92400e',
        section: 'Bakery',
        items: [
            'White Bread', 'Wheat Bread', 'Specialty Breads', 'Tortillas', 'English Muffins',
            'Whole Wheat Bread', 'Multigrain Bread', 'Rye Bread', 'Pumpernickel',
            'Sourdough Bread', 'French Bread', 'Italian Bread', 'Baguette',
            'Pita Bread', 'Naan', 'Flatbread', 'Focaccia', 'Ciabatta',
            'Flour Tortillas', 'Corn Tortillas', 'Wraps', 'Lavash'
        ]
    },

    // FROZEN FOODS
    'Frozen Vegetables': {
        name: 'Frozen Vegetables',
        icon: '🥦',
        color: '#059669',
        section: 'Frozen',
        items: [
            'Mixed Vegetables', 'Broccoli', 'Corn', 'Peas', 'Spinach', 'Stir Fry Mixes',
            'Green Beans', 'Lima Beans', 'Edamame', 'Brussels Sprouts',
            'Cauliflower', 'Carrots', 'Artichoke Hearts', 'Asparagus',
            'Bell Peppers', 'Onions', 'Hash Browns', 'French Fries',
            'Sweet Potato Fries', 'Tater Tots'
        ]
    },
    'Frozen Fruits': {
        name: 'Frozen Fruits',
        icon: '🍓',
        color: '#ec4899',
        section: 'Frozen',
        items: [
            'Berries', 'Tropical Fruits', 'Smoothie Mixes', 'Fruit Medleys',
            'Strawberries', 'Blueberries', 'Raspberries', 'Blackberries',
            'Mixed Berries', 'Mango', 'Pineapple', 'Peaches', 'Cherries',
            'Acai', 'Dragon Fruit'
        ]
    },
    'Frozen Meals': {
        name: 'Frozen Meals',
        icon: '🍽️',
        color: '#6366f1',
        section: 'Frozen',
        items: [
            'TV Dinners', 'Lean Cuisine', 'Family Size Meals', 'Organic Frozen Meals',
            'Healthy Choice', 'Stouffers', 'Marie Callenders', 'Banquet',
            'Hot Pockets', 'Burritos', 'Pot Pies', 'Lasagna', 'Enchiladas'
        ]
    },
    'Frozen Meat': {
        name: 'Frozen Meat',
        icon: '🧊',
        color: '#ef4444',
        section: 'Frozen',
        items: [
            'Frozen Beef', 'Frozen Chicken', 'Frozen Fish', 'Frozen Seafood',
            'Frozen Ground Beef', 'Frozen Chicken Breast', 'Frozen Salmon',
            'Frozen Shrimp', 'Frozen Scallops', 'Frozen Crab', 'Frozen Lobster',
            'Fish Fillets', 'Fish Sticks', 'Breaded Chicken', 'Chicken Nuggets',
            'Chicken Tenders', 'Meatballs', 'Burger Patties'
        ]
    },
    'Ice Cream': {
        name: 'Ice Cream',
        icon: '🍦',
        color: '#f472b6',
        section: 'Frozen',
        items: [
            'Ice Cream', 'Frozen Yogurt', 'Sherbet', 'Ice Cream Bars', 'Novelties',
            'Gelato', 'Sorbet', 'Popsicles', 'Ice Cream Sandwiches',
            'Drumsticks', 'Push Pops', 'Fudge Bars', 'Fruit Bars'
        ]
    },
    'Frozen Pizza': {
        name: 'Frozen Pizza',
        icon: '🍕',
        color: '#f59e0b',
        section: 'Frozen',
        items: [
            'Thin Crust', 'Thick Crust', 'Personal Size', 'Gluten Free', 'Organic',
            'Pepperoni Pizza', 'Cheese Pizza', 'Supreme Pizza', 'Margherita',
            'Hawaiian Pizza', 'Meat Lovers', 'Veggie Pizza', 'White Pizza'
        ]
    },
    'Frozen Breakfast': {
        name: 'Frozen Breakfast',
        icon: '🧇',
        color: '#fbbf24',
        section: 'Frozen',
        items: [
            'Waffles', 'Pancakes', 'French Toast', 'Breakfast Sandwiches', 'Hash Browns',
            'Eggo Waffles', 'Toaster Pastries', 'Breakfast Burritos',
            'Sausage Links', 'Breakfast Patties', 'Cinnamon Rolls'
        ]
    },

    // DRY GOODS & PANTRY
    'Canned Vegetables': {
        name: 'Canned Vegetables',
        icon: '🥫',
        color: '#059669',
        section: 'Pantry',
        items: [
            'Green Beans', 'Corn', 'Peas', 'Carrots', 'Mixed Vegetables', 'Artichokes',
            'Asparagus', 'Beets', 'Spinach', 'Mushrooms', 'Water Chestnuts',
            'Bamboo Shoots', 'Hearts of Palm', 'Roasted Red Peppers',
            'Pickled Jalapeños', 'Capers', 'Olives', 'Pickles'
        ]
    },
    'Canned Fruits': {
        name: 'Canned Fruits',
        icon: '🍑',
        color: '#ef4444',
        section: 'Pantry',
        items: [
            'Peaches', 'Pears', 'Pineapple', 'Fruit Cocktail', 'Applesauce', 'Cranberry Sauce',
            'Mandarin Oranges', 'Cherries', 'Apricots', 'Plums', 'Grapes',
            'Mixed Fruit', 'Tropical Fruit', 'Pie Filling'
        ]
    },
    'Canned Tomatoes': {
        name: 'Canned Tomatoes',
        icon: '🍅',
        color: '#dc2626',
        section: 'Pantry',
        items: [
            'Whole Tomatoes', 'Diced Tomatoes', 'Crushed Tomatoes', 'Tomato Paste', 'Tomato Sauce',
            'Tomato Puree', 'Stewed Tomatoes', 'Fire Roasted Tomatoes',
            'San Marzano Tomatoes', 'Hunt\'s Tomatoes', 'Del Monte Tomatoes'
        ]
    },
    'Soups': {
        name: 'Soups',
        icon: '🍲',
        color: '#f59e0b',
        section: 'Pantry',
        items: [
            'Canned Soup', 'Dry Soup Mixes', 'Broth', 'Stock', 'Bouillon', 'Instant Soup',
            'Chicken Broth', 'Beef Broth', 'Vegetable Broth', 'Bone Broth',
            'Chicken Stock', 'Beef Stock', 'Vegetable Stock', 'Mushroom Broth',
            'Campbell\'s Soup', 'Progresso Soup', 'Lipton Soup Mix',
            'Chicken Noodle', 'Tomato Soup', 'Cream of Mushroom', 'Minestrone'
        ]
    },
    'Pasta': {
        name: 'Pasta',
        icon: '🍝',
        color: '#fbbf24',
        section: 'Pantry',
        items: [
            'Spaghetti', 'Penne', 'Macaroni', 'Lasagna', 'Specialty Pasta', 'Gluten Free Pasta',
            'Fusilli', 'Rigatoni', 'Linguine', 'Fettuccine', 'Angel Hair',
            'Bow Tie', 'Farfalle', 'Rotini', 'Shells', 'Gemelli', 'Orzo',
            'Pappardelle', 'Tagliatelle', 'Bucatini', 'Cavatappi', 'Ziti',
            'Whole Wheat Pasta', 'Chickpea Pasta', 'Lentil Pasta', 'Rice Pasta'
        ]
    },
    'Rice & Grains': {
        name: 'Rice & Grains',
        icon: '🌾',
        color: '#92400e',
        section: 'Pantry',
        items: [
            'White Rice', 'Brown Rice', 'Quinoa', 'Barley', 'Oats', 'Couscous',
            'Wild Rice', 'Jasmine Rice', 'Basmati Rice', 'Arborio Rice',
            'Black Rice', 'Red Rice', 'Sticky Rice', 'Instant Rice',
            'Steel Cut Oats', 'Rolled Oats', 'Quick Oats', 'Oat Bran',
            'Bulgur', 'Farro', 'Wheat Berries', 'Millet', 'Amaranth',
            'Buckwheat', 'Freekeh', 'Teff', 'Cornmeal', 'Polenta',
            'Masa Harina', 'Cornhusks'
        ]
    },
    'Beans & Legumes': {
        name: 'Beans & Legumes',
        icon: '🫘',
        color: '#7c2d12',
        section: 'Pantry',
        items: [
            'Black Beans', 'Kidney Beans', 'Chickpeas', 'Lentils', 'Pinto Beans', 'Navy Beans',
            'Great Northern Beans', 'Lima Beans', 'Cannellini Beans', 'Garbanzo Beans',
            'Red Lentils', 'Green Lentils', 'French Lentils', 'Split Peas',
            'Black Eyed Peas', 'Fava Beans', 'Adzuki Beans', 'Mung Beans',
            'Refried Beans', 'Baked Beans'
        ]
    },

    // BAKING & COOKING
    'Baking Ingredients': {
        name: 'Baking Ingredients',
        icon: '🧁',
        color: '#ec4899',
        section: 'Pantry',
        items: [
            'Flour', 'Sugar', 'Baking Powder', 'Baking Soda', 'Vanilla', 'Food Coloring',
            'All Purpose Flour', 'Bread Flour', 'Cake Flour', 'Self Rising Flour',
            'Whole Wheat Flour', 'Almond Flour', 'Coconut Flour', 'Gluten Free Flour',
            'White Sugar', 'Brown Sugar', 'Powdered Sugar', 'Coconut Sugar',
            'Vanilla Extract', 'Almond Extract', 'Lemon Extract', 'Rum Extract',
            'Yeast', 'Active Dry Yeast', 'Instant Yeast', 'Cream of Tartar',
            'Cornstarch', 'Arrowroot', 'Cocoa Powder', 'Chocolate Chips',
            'Sprinkles', 'Frosting', 'Cake Mix', 'Brownie Mix'
        ]
    },
    'Cooking Oil': {
        name: 'Cooking Oil',
        icon: '🫒',
        color: '#65a30d',
        section: 'Pantry',
        items: [
            'Vegetable Oil', 'Olive Oil', 'Canola Oil', 'Coconut Oil', 'Cooking Spray',
            'Extra Virgin Olive Oil', 'Light Olive Oil', 'Avocado Oil', 'Sunflower Oil',
            'Safflower Oil', 'Corn Oil', 'Peanut Oil', 'Sesame Oil', 'Walnut Oil',
            'Grapeseed Oil', 'Flaxseed Oil', 'MCT Oil'
        ]
    },
    'Spices & Seasonings': {
        name: 'Spices & Seasonings',
        icon: '🌶️',
        color: '#dc2626',
        section: 'Pantry',
        items: [
            'Salt', 'Pepper', 'Garlic Powder', 'Onion Powder', 'Paprika', 'Seasoning Blends',
            'Black Pepper', 'White Pepper', 'Sea Salt', 'Kosher Salt', 'Table Salt',
            'Cumin', 'Chili Powder', 'Cayenne Pepper', 'Red Pepper Flakes',
            'Oregano', 'Basil', 'Thyme', 'Rosemary', 'Sage', 'Marjoram',
            'Turmeric', 'Coriander', 'Cardamom', 'Cinnamon', 'Nutmeg',
            'Allspice', 'Cloves', 'Bay Leaves', 'Dill', 'Fennel Seeds',
            'Mustard Seeds', 'Celery Seeds', 'Poppy Seeds', 'Sesame Seeds',
            'Everything Bagel Seasoning', 'Italian Seasoning', 'Herbs de Provence',
            'Smoked Paprika', 'Chipotle Powder', 'Ancho Chili Powder'
        ]
    },
    'Sauces & Condiments': {
        name: 'Sauces & Condiments',
        icon: '🥫',
        color: '#7c2d12',
        section: 'Pantry',
        items: [
            'Ketchup', 'Mustard', 'Mayo', 'BBQ Sauce', 'Hot Sauce', 'Salad Dressing',
            'Yellow Mustard', 'Dijon Mustard', 'Whole Grain Mustard', 'Honey Mustard',
            'Mayonnaise', 'Miracle Whip', 'Ranch Dressing', 'Italian Dressing',
            'Caesar Dressing', 'Thousand Island', 'Balsamic Vinaigrette',
            'Tabasco', 'Sriracha', 'Frank\'s RedHot', 'Buffalo Sauce',
            'Worcestershire Sauce', 'A1 Steak Sauce', 'Teriyaki Sauce',
            'Sweet and Sour Sauce', 'Cocktail Sauce', 'Tartar Sauce',
            'Marinara Sauce', 'Alfredo Sauce', 'Pesto', 'Pizza Sauce',
            'Enchilada Sauce', 'Salsa', 'Picante Sauce', 'Taco Sauce'
        ]
    },
    'Vinegar': {
        name: 'Vinegar',
        icon: '🍶',
        color: '#6b7280',
        section: 'Pantry',
        items: [
            'White Vinegar', 'Apple Cider Vinegar', 'Balsamic Vinegar', 'Rice Vinegar',
            'Red Wine Vinegar', 'White Wine Vinegar', 'Champagne Vinegar',
            'Sherry Vinegar', 'Malt Vinegar', 'Coconut Vinegar'
        ]
    },

    // BREAKFAST & CEREAL
    'Cereal': {
        name: 'Cereal',
        icon: '🥣',
        color: '#f59e0b',
        section: 'Pantry',
        items: [
            'Cold Cereal', 'Granola', 'Oatmeal', 'Instant Oatmeal', 'Breakfast Bars',
            'Cheerios', 'Corn Flakes', 'Rice Krispies', 'Frosted Flakes',
            'Lucky Charms', 'Fruit Loops', 'Cocoa Puffs', 'Honey Nut Cheerios',
            'Special K', 'Raisin Bran', 'Bran Flakes', 'Shredded Wheat',
            'Granola Clusters', 'Muesli', 'Quinoa Flakes'
        ]
    },
    'Breakfast Items': {
        name: 'Breakfast Items',
        icon: '🥞',
        color: '#fbbf24',
        section: 'Pantry',
        items: [
            'Pancake Mix', 'Syrup', 'Honey', 'Jam', 'Peanut Butter', 'Coffee',
            'Waffle Mix', 'Bisquick', 'Maple Syrup', 'Pancake Syrup', 'Agave',
            'Strawberry Jam', 'Grape Jelly', 'Orange Marmalade', 'Preserves',
            'Almond Butter', 'Cashew Butter', 'Sunflower Seed Butter',
            'Nutella', 'Cream Cheese Spread', 'Butter', 'Margarine'
        ]
    },

    // BEVERAGES
    'Water': {
        name: 'Water',
        icon: '💧',
        color: '#0ea5e9',
        section: 'Beverages',
        items: [
            'Bottled Water', 'Sparkling Water', 'Flavored Water', 'Sports Drinks',
            'Spring Water', 'Purified Water', 'Alkaline Water', 'Coconut Water',
            'LaCroix', 'Perrier', 'San Pellegrino', 'Tonic Water', 'Club Soda',
            'Gatorade', 'Powerade', 'Vitamin Water', 'Smart Water'
        ]
    },
    'Soft Drinks': {
        name: 'Soft Drinks',
        icon: '🥤',
        color: '#ef4444',
        section: 'Beverages',
        items: [
            'Soda', 'Diet Soda', 'Energy Drinks', 'Juice Boxes', 'Mixers',
            'Coca Cola', 'Pepsi', 'Sprite', 'Dr Pepper', 'Mountain Dew',
            'Root Beer', 'Ginger Ale', 'Orange Soda', 'Lemon Lime Soda',
            'Red Bull', 'Monster', 'Rockstar', 'Bang Energy', '5 Hour Energy'
        ]
    },
    'Juices': {
        name: 'Juices',
        icon: '🧃',
        color: '#f59e0b',
        section: 'Beverages',
        items: [
            'Orange Juice', 'Apple Juice', 'Cranberry Juice', 'Vegetable Juice', 'Smoothies',
            'Grape Juice', 'Pineapple Juice', 'Grapefruit Juice', 'Tomato Juice',
            'V8 Juice', 'Pomegranate Juice', 'Tart Cherry Juice', 'Lemon Juice',
            'Lime Juice', 'Prune Juice', 'Aloe Vera Juice'
        ]
    },
    'Coffee & Tea': {
        name: 'Coffee & Tea',
        icon: '☕',
        color: '#92400e',
        section: 'Beverages',
        items: [
            'Ground Coffee', 'Whole Bean Coffee', 'Instant Coffee', 'Tea Bags', 'Loose Tea',
            'Dark Roast', 'Medium Roast', 'Light Roast', 'Decaf Coffee', 'Espresso',
            'K-Cups', 'Coffee Pods', 'Cold Brew', 'French Roast', 'Colombian',
            'Green Tea', 'Black Tea', 'Herbal Tea', 'Chamomile Tea', 'Earl Grey',
            'English Breakfast', 'Oolong Tea', 'White Tea', 'Matcha', 'Chai Tea',
            'Peppermint Tea', 'Ginger Tea', 'Rooibos Tea'
        ]
    },
    'Beer & Wine': {
        name: 'Beer & Wine',
        icon: '🍷',
        color: '#7c2d12',
        section: 'Alcohol',
        items: [
            'Beer', 'Wine', 'Champagne', 'Cooking Wine',
            'Red Wine', 'White Wine', 'Rosé', 'Sparkling Wine', 'Prosecco',
            'Chardonnay', 'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Sauvignon Blanc',
            'Lager', 'IPA', 'Ale', 'Stout', 'Pilsner', 'Wheat Beer', 'Light Beer'
        ]
    },

    // SNACKS & CANDY
    'Chips & Crackers': {
        name: 'Chips & Crackers',
        icon: '🍿',
        color: '#f59e0b',
        section: 'Snacks',
        items: [
            'Potato Chips', 'Tortilla Chips', 'Crackers', 'Pretzels', 'Popcorn',
            'Corn Chips', 'Pita Chips', 'Rice Cakes', 'Wheat Thins', 'Triscuits',
            'Ritz Crackers', 'Saltines', 'Graham Crackers', 'Cheez-Its',
            'Goldfish', 'Doritos', 'Cheetos', 'Fritos', 'Lay\'s', 'Pringles'
        ]
    },
    'Nuts & Seeds': {
        name: 'Nuts & Seeds',
        icon: '🥜',
        color: '#92400e',
        section: 'Snacks',
        items: [
            'Peanuts', 'Almonds', 'Cashews', 'Mixed Nuts', 'Sunflower Seeds', 'Trail Mix',
            'Walnuts', 'Pecans', 'Pistachios', 'Macadamia Nuts', 'Brazil Nuts',
            'Pine Nuts', 'Hazelnuts', 'Chestnuts', 'Pumpkin Seeds', 'Chia Seeds',
            'Flax Seeds', 'Hemp Seeds', 'Sesame Seeds', 'Poppy Seeds'
        ]
    },
    'Candy': {
        name: 'Candy',
        icon: '🍬',
        color: '#ec4899',
        section: 'Snacks',
        items: [
            'Chocolate', 'Gummy Candy', 'Hard Candy', 'Mints', 'Gum',
            'Chocolate Bars', 'Dark Chocolate', 'Milk Chocolate', 'White Chocolate',
            'Gummy Bears', 'Gummy Worms', 'Sour Patch Kids', 'Swedish Fish',
            'Lollipops', 'Candy Canes', 'Life Savers', 'Tic Tacs', 'Altoids'
        ]
    },
    'Cookies & Sweets': {
        name: 'Cookies & Sweets',
        icon: '🍪',
        color: '#f472b6',
        section: 'Snacks',
        items: [
            'Cookies', 'Crackers', 'Granola Bars', 'Fruit Snacks', 'Cake Mixes',
            'Chocolate Chip Cookies', 'Oreos', 'Chips Ahoy', 'Fig Newtons',
            'Animal Crackers', 'Vanilla Wafers', 'Nutter Butters',
            'Kind Bars', 'Clif Bars', 'Nature Valley', 'Quaker Bars'
        ]
    },

    // INTERNATIONAL SECTIONS
    'Mexican Items': {
        name: 'Mexican Items',
        icon: '🌮',
        color: '#dc2626',
        section: 'International',
        items: [
            'Tortillas', 'Corn Tortillas', 'Flour Tortillas', 'Taco Shells', 'Tostadas',
            'Salsa', 'Picante Sauce', 'Verde Salsa', 'Chunky Salsa', 'Mild Salsa', 'Hot Salsa',
            'Enchilada Sauce', 'Red Enchilada Sauce', 'Green Enchilada Sauce',
            'Taco Seasoning', 'Fajita Seasoning', 'Chili Powder', 'Cumin', 'Mexican Oregano',
            'Chipotle Peppers', 'Jalapeños', 'Serrano Peppers', 'Poblano Peppers',
            'Refried Beans', 'Black Beans', 'Pinto Beans', 'Mexican Rice', 'Spanish Rice',
            'Queso', 'Queso Fresco', 'Oaxaca Cheese', 'Cotija Cheese', 'Monterey Jack',
            'Masa Harina', 'Cornhusks', 'Tamale Dough', 'Hominy', 'Pozole',
            'Adobo Sauce', 'Mole', 'Chorizo', 'Mexican Crema', 'Lime', 'Cilantro',
            'Avocados', 'Tomatillos', 'Chayote', 'Cactus Pads', 'Epazote',
            'Horchata', 'Tamarind', 'Hibiscus', 'Mexican Vanilla', 'Piloncillo'
        ]
    },
    'Asian Items': {
        name: 'Asian Items',
        icon: '🥢',
        color: '#f59e0b',
        section: 'International',
        items: [
            'Soy Sauce', 'Rice Vinegar', 'Sesame Oil', 'Fish Sauce', 'Oyster Sauce',
            'Hoisin Sauce', 'Sweet and Sour Sauce', 'Teriyaki Sauce', 'Sriracha',
            'Chili Garlic Sauce', 'Black Bean Sauce', 'Miso Paste', 'Tahini',
            'Rice Wine', 'Mirin', 'Sake', 'Chinese Cooking Wine', 'Shaoxing Wine',
            'Jasmine Rice', 'Sushi Rice', 'Brown Rice', 'Sticky Rice', 'Wild Rice',
            'Rice Noodles', 'Udon Noodles', 'Soba Noodles', 'Ramen Noodles',
            'Glass Noodles', 'Lo Mein Noodles', 'Pad Thai Noodles',
            'Wonton Wrappers', 'Dumpling Wrappers', 'Spring Roll Wrappers',
            'Egg Roll Wrappers', 'Rice Paper', 'Nori', 'Wakame', 'Kombu',
            'Shiitake Mushrooms', 'Enoki Mushrooms', 'Wood Ear Mushrooms',
            'Water Chestnuts', 'Bamboo Shoots', 'Bean Sprouts', 'Bok Choy',
            'Chinese Cabbage', 'Daikon Radish', 'Lotus Root', 'Lemongrass',
            'Galangal', 'Kaffir Lime Leaves', 'Thai Basil', 'Shiso',
            'Wasabi', 'Pickled Ginger', 'Furikake', 'Panko Breadcrumbs',
            'Coconut Milk', 'Curry Paste', 'Thai Curry', 'Japanese Curry',
            'Five Spice', 'Chinese Five Spice', 'Star Anise', 'Szechuan Peppercorns',
            'White Pepper', 'Tofu', 'Tempeh', 'Kimchi', 'Mochi', 'Dashi'
        ]
    },
    'Indian Items': {
        name: 'Indian Items',
        icon: '🍛',
        color: '#f97316',
        section: 'International',
        items: [
            'Basmati Rice', 'Jasmine Rice', 'Brown Rice', 'Lentils', 'Dal',
            'Red Lentils', 'Yellow Lentils', 'Black Lentils', 'Split Peas',
            'Chickpeas', 'Garbanzo Beans', 'Black Eyed Peas', 'Kidney Beans',
            'Turmeric', 'Cumin', 'Coriander', 'Cardamom', 'Cinnamon', 'Cloves',
            'Fenugreek', 'Mustard Seeds', 'Fennel Seeds', 'Nigella Seeds',
            'Asafoetida', 'Curry Powder', 'Garam Masala', 'Tandoori Masala',
            'Chaat Masala', 'Sambhar Powder', 'Rasam Powder',
            'Ghee', 'Coconut Oil', 'Mustard Oil', 'Sesame Oil',
            'Coconut Milk', 'Tamarind', 'Jaggery', 'Palm Sugar',
            'Naan', 'Chapati', 'Roti', 'Paratha', 'Papadum',
            'Basmati Rice', 'Biryani Rice', 'Sona Masoori Rice',
            'Curry Leaves', 'Mint', 'Cilantro', 'Ginger', 'Garlic',
            'Green Chilies', 'Red Chilies', 'Dried Red Chilies',
            'Paneer', 'Yogurt', 'Lassi', 'Buttermilk',
            'Pickles', 'Chutneys', 'Papad', 'Sev', 'Bhujia'
        ]
    },
    'International Items': {
        name: 'International Items',
        icon: '🌍',
        color: '#8b5cf6',
        section: 'International',
        items: [
            // European
            'Pasta', 'Olive Oil', 'Balsamic Vinegar', 'Parmesan', 'Prosciutto',
            'Pancetta', 'Mortadella', 'Salami', 'Pecorino', 'Gorgonzola',
            'Risotto Rice', 'Arborio Rice', 'Polenta', 'Pine Nuts',
            'Sun Dried Tomatoes', 'Capers', 'Anchovies', 'Pesto',
            'Nutella', 'Biscotti', 'Panettone', 'Gelato',

            // Middle Eastern
            'Hummus', 'Tahini', 'Pita Bread', 'Falafel', 'Tabbouleh',
            'Bulgur', 'Couscous', 'Harissa', 'Za\'atar', 'Sumac',
            'Pomegranate Molasses', 'Rose Water', 'Orange Blossom Water',
            'Dates', 'Figs', 'Pistachios', 'Halva', 'Turkish Delight',

            // Caribbean/Latin American
            'Plantains', 'Yuca', 'Malanga', 'Boniato', 'Chayote',
            'Sofrito', 'Adobo', 'Sazon', 'Culantro', 'Annatto',
            'Coconut Milk', 'Coconut Cream', 'Cassava', 'Tamarind',
            'Scotch Bonnet Peppers', 'Aji Amarillo', 'Chimichurri',

            // African
            'Berbere', 'Injera', 'Plantain Chips', 'Palm Oil',
            'Fufu', 'Couscous', 'Harissa', 'Preserved Lemons',

            // German/Eastern European
            'Sauerkraut', 'Bratwurst', 'Pumpernickel', 'Rye Bread',
            'Mustard', 'Horseradish', 'Spaetzle', 'Strudel',
            'Paprika', 'Caraway Seeds', 'Dill', 'Pickles',

            // British/Irish
            'HP Sauce', 'Worcestershire', 'Marmite', 'Digestive Biscuits',
            'Tea', 'Earl Grey', 'English Breakfast', 'Bangers',

            // Kosher/Jewish
            'Matzo', 'Gefilte Fish', 'Horseradish', 'Kosher Salt',
            'Challah', 'Bagels', 'Lox', 'Cream Cheese'
        ]
    },

    // HEALTH & BEAUTY
    'Personal Care': {
        name: 'Personal Care',
        icon: '🧴',
        color: '#8b5cf6',
        section: 'Health & Beauty',
        items: [
            'Shampoo', 'Conditioner', 'Body Wash', 'Soap', 'Deodorant', 'Toothpaste',
            'Hair Gel', 'Hair Spray', 'Mousse', 'Leave-in Conditioner',
            'Face Wash', 'Moisturizer', 'Lotion', 'Sunscreen', 'Lip Balm',
            'Razors', 'Shaving Cream', 'Aftershave', 'Cologne', 'Perfume'
        ]
    },
    'Health Items': {
        name: 'Health Items',
        icon: '💊',
        color: '#ef4444',
        section: 'Health & Beauty',
        items: [
            'Vitamins', 'Pain Relief', 'First Aid', 'Thermometers', 'Supplements',
            'Multivitamins', 'Vitamin C', 'Vitamin D', 'B Complex', 'Calcium',
            'Iron', 'Magnesium', 'Omega 3', 'Probiotics', 'Protein Powder',
            'Ibuprofen', 'Acetaminophen', 'Aspirin', 'Allergy Medicine',
            'Cold Medicine', 'Cough Drops', 'Band Aids', 'Antiseptic'
        ]
    },
    'Baby Care': {
        name: 'Baby Care',
        icon: '👶',
        color: '#f472b6',
        section: 'Health & Beauty',
        items: [
            'Diapers', 'Baby Food', 'Formula', 'Baby Wipes', 'Baby Lotion',
            'Baby Shampoo', 'Baby Powder', 'Diaper Rash Cream', 'Pacifiers',
            'Baby Bottles', 'Sippy Cups', 'Baby Cereal', 'Baby Snacks'
        ]
    },

    // HOUSEHOLD & CLEANING
    'Cleaning Supplies': {
        name: 'Cleaning Supplies',
        icon: '🧽',
        color: '#06b6d4',
        section: 'Household',
        items: [
            'All-Purpose Cleaner', 'Dish Soap', 'Laundry Detergent', 'Paper Towels', 'Toilet Paper',
            'Glass Cleaner', 'Bathroom Cleaner', 'Kitchen Cleaner', 'Floor Cleaner',
            'Disinfectant', 'Bleach', 'Scrubbing Bubbles', 'Lysol', 'Pine Sol',
            'Sponges', 'Scrub Brushes', 'Microfiber Cloths', 'Rubber Gloves'
        ]
    },
    'Paper Products': {
        name: 'Paper Products',
        icon: '🧻',
        color: '#6b7280',
        section: 'Household',
        items: [
            'Toilet Paper', 'Paper Towels', 'Napkins', 'Facial Tissues', 'Aluminum Foil',
            'Plastic Wrap', 'Wax Paper', 'Parchment Paper', 'Freezer Bags',
            'Storage Bags', 'Sandwich Bags', 'Trash Bags', 'Paper Plates',
            'Paper Cups', 'Plastic Forks', 'Plastic Spoons', 'Plastic Knives'
        ]
    },
    'Laundry': {
        name: 'Laundry',
        icon: '🧺',
        color: '#3b82f6',
        section: 'Household',
        items: [
            'Detergent', 'Fabric Softener', 'Bleach', 'Stain Remover', 'Dryer Sheets',
            'Liquid Detergent', 'Powder Detergent', 'Pods', 'Color Safe Bleach',
            'Oxiclean', 'Shout', 'Tide', 'Gain', 'Downy', 'Bounce'
        ]
    },

    // PET SUPPLIES
    'Pet Food': {
        name: 'Pet Food',
        icon: '🐕',
        color: '#92400e',
        section: 'Pet',
        items: [
            'Dog Food', 'Cat Food', 'Pet Treats', 'Pet Litter', 'Pet Supplies',
            'Dry Dog Food', 'Wet Dog Food', 'Puppy Food', 'Senior Dog Food',
            'Dry Cat Food', 'Wet Cat Food', 'Kitten Food', 'Senior Cat Food',
            'Clay Litter', 'Clumping Litter', 'Crystal Litter', 'Natural Litter',
            'Dog Treats', 'Cat Treats', 'Rawhide', 'Dental Chews', 'Catnip'
        ]
    },

    // MISC & OTHER
    'Other': {
        name: 'Other',
        icon: '🛒',
        color: '#6b7280',
        section: 'Other',
        items: [
            'Miscellaneous Items', 'Hardware', 'Auto', 'Electronics', 'Seasonal',
            'Batteries', 'Light Bulbs', 'Extension Cords', 'Chargers',
            'Phone Cases', 'Headphones', 'Gift Cards', 'Magazines',
            'Books', 'Greeting Cards', 'Wrapping Paper', 'Gift Bags',
            'Candles', 'Air Fresheners', 'Matches', 'Lighters'
        ]
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
 * Enhanced category suggestions based on item name using comprehensive AI/ML patterns
 */
export function suggestCategoryForItem(itemName) {
    if (!itemName) return 'Other';

    const item = itemName.toLowerCase().trim();

    // MEXICAN ITEMS - High priority patterns
    if (/\b(tortilla|taco|enchilada|salsa|queso|chorizo|masa|tamale|jalapeño|serrano|poblano|chipotle|cilantro|lime|avocado|tomatillo|refried beans|mexican|spanish rice|verde|picante|adobo|mole|horchata|piloncillo)\b/i.test(item)) {
        return 'Mexican Items';
    }

    // ASIAN ITEMS - High priority patterns
    if (/\b(soy sauce|sesame oil|rice vinegar|fish sauce|oyster sauce|hoisin|teriyaki|sriracha|miso|tahini|rice wine|mirin|sake|jasmine rice|sushi rice|udon|soba|ramen|rice noodles|wonton|dumpling|spring roll|nori|shiitake|bok choy|daikon|lemongrass|wasabi|panko|coconut milk|curry paste|five spice|tofu|tempeh|kimchi|dashi)\b/i.test(item)) {
        return 'Asian Items';
    }

    // INDIAN ITEMS - High priority patterns
    if (/\b(basmati|lentils|dal|turmeric|cumin|coriander|cardamom|fenugreek|garam masala|tandoori|ghee|tamarind|jaggery|naan|chapati|roti|curry leaves|paneer|lassi|chutney|papad)\b/i.test(item)) {
        return 'Indian Items';
    }

    // INTERNATIONAL ITEMS - Medium priority patterns
    if (/\b(hummus|pita|falafel|bulgur|couscous|harissa|za'atar|sumac|tahini|plantain|yuca|sofrito|berbere|injera|sauerkraut|bratwurst|pumpernickel|hp sauce|marmite|matzo|gefilte|horseradish|kosher)\b/i.test(item)) {
        return 'International Items';
    }

    // TOMATO PRODUCTS - Very specific matching
    if (/\b(tomato paste|paste)\b/i.test(item) && /tomato/i.test(item)) {
        return 'Canned Tomatoes';
    }
    if (/\b(tomato sauce|marinara|pizza sauce)\b/i.test(item)) {
        return 'Canned Tomatoes';
    }
    if (/\b(crushed tomatoes|diced tomatoes|whole tomatoes|stewed tomatoes|fire roasted tomatoes)\b/i.test(item)) {
        return 'Canned Tomatoes';
    }

    // FRESH PRODUCE - Enhanced patterns
    if (/^(apple|banana|orange|lemon|lime|grape|berry|melon|peach|pear|plum|cherry|kiwi|mango|pineapple|avocado|coconut|strawberry|blueberry|raspberry|blackberry|cranberry|watermelon|cantaloupe|pomegranate)/i.test(item)) {
        return 'Fresh Fruits';
    }

    if (/^(onion|garlic|tomato|lettuce|spinach|carrot|celery|pepper|broccoli|cauliflower|cucumber|potato|mushroom|cabbage|zucchini|bell pepper|jalapeño|serrano|poblano|ginger|cilantro|parsley|basil|mint|thyme|oregano|rosemary|sage|dill|chive|scallion|green onion|shallot)/i.test(item)) {
        return /\b(bell pepper|jalapeño|serrano|poblano|pepper)\b/i.test(item) && !/\bblack pepper|white pepper|red pepper flakes/i.test(item) ? 'Fresh Produce' : 'Fresh Vegetables';
    }

    // HERBS AND SEASONINGS - Enhanced detection
    if (/\b(powder|dried|fresh|chopped|minced|ground|leaves)\b.*\b(garlic|onion|ginger|herb|basil|oregano|thyme|rosemary|parsley|cilantro|sage|dill|chive|mint)\b/i.test(item) ||
        /\b(salt|pepper|paprika|cumin|chili|cayenne|turmeric|coriander|cardamom|cinnamon|nutmeg|allspice|cloves|bay leaves|fennel|mustard seed|celery seed|poppy seed|sesame seed|red pepper flakes|italian seasoning|herbs de provence|everything bagel|smoked paprika|chipotle powder|ancho)\b/i.test(item)) {
        return 'Spices & Seasonings';
    }

    // MEAT PATTERNS - Enhanced
    if (/\b(beef|steak|ground beef|hamburger|roast|chuck|sirloin|ribeye|filet|tenderloin|brisket|short rib|flank|skirt|round|cube steak)\b/i.test(item)) {
        return 'Fresh Meat';
    }

    if (/\b(chicken|turkey|duck|poultry|breast|thigh|wing|drumstick|cornish hen|ground chicken|ground turkey)\b/i.test(item)) {
        return 'Fresh Poultry';
    }

    if (/(fish|salmon|tuna|cod|halibut|mahi|tilapia|snapper|bass|flounder|mackerel|sardine|shrimp|crab|lobster|scallop|oyster|clam|mussel|calamari|seafood)/i.test(item)) {
        return 'Fresh Seafood';
    }

    // DAIRY PATTERNS - Enhanced
    if (/\b(milk|cream|half|buttermilk|almond milk|soy milk|oat milk|coconut milk|rice milk|cashew milk)\b/i.test(item) && !/\bcoconut milk\b.*\b(canned|can)\b/i.test(item)) {
        return 'Dairy';
    }

    if (/\b(cheese|cheddar|mozzarella|swiss|parmesan|cream cheese|cottage cheese|ricotta|feta|goat cheese|blue cheese|provolone|monterey jack|pepper jack|colby|muenster|brie|camembert|gorgonzola)\b/i.test(item)) {
        return 'Cheese';
    }

    if (/\b(egg|eggs)\b/i.test(item) && !/\begg roll|eggplant|eggnog/i.test(item)) {
        return 'Eggs';
    }

    if (/\b(yogurt|greek yogurt|kefir|skyr|labneh)\b/i.test(item)) {
        return 'Yogurt';
    }

    // BAKING PATTERNS - Enhanced
    if (/\b(flour|sugar|brown sugar|powdered sugar|baking powder|baking soda|vanilla|yeast|cocoa|chocolate chips|cornstarch|cream of tartar|food coloring|sprinkles|frosting|cake mix|brownie mix)\b/i.test(item)) {
        return 'Baking Ingredients';
    }

    // OIL PATTERNS
    if (/\b(oil|olive oil|vegetable oil|canola oil|coconut oil|cooking spray|avocado oil|sunflower oil|corn oil|peanut oil|sesame oil|walnut oil|grapeseed oil)\b/i.test(item)) {
        return 'Cooking Oil';
    }

    // BREAD PATTERNS
    if (/\b(bread|loaf|bagel|english muffin|tortilla|pita|roll|bun|baguette|sourdough|whole wheat|multigrain|rye|pumpernickel|ciabatta|focaccia|naan|flatbread)\b/i.test(item)) {
        return 'Breads';
    }

    // PASTA PATTERNS - Enhanced
    if (/\b(pasta|spaghetti|penne|fettuccine|fusilli|rigatoni|linguine|angel hair|bow tie|farfalle|macaroni|shells|rotini|gemelli|orzo|pappardelle|tagliatelle|bucatini|cavatappi|ziti|lasagna|ravioli|tortellini|gnocchi)\b/i.test(item)) {
        return 'Pasta';
    }

    // RICE AND GRAINS - Enhanced
    if (/\b(rice|quinoa|barley|oats|oatmeal|couscous|wild rice|brown rice|white rice|jasmine rice|basmati rice|arborio rice|bulgur|farro|wheat berries|millet|amaranth|buckwheat|freekeh|teff|cornmeal|polenta|masa harina)\b/i.test(item)) {
        return (/\b(cereal|granola)\b/i.test(item)) ? 'Cereal' : 'Rice & Grains';
    }

    // BEANS AND LEGUMES
    if (/\b(beans|bean|lentils|lentil|chickpeas|chickpea|garbanzo|split peas|black eyed peas|kidney beans|black beans|pinto beans|navy beans|lima beans|cannellini|great northern|fava beans|adzuki|mung beans|refried beans|baked beans)\b/i.test(item)) {
        return 'Beans & Legumes';
    }

    // CANNED GOODS
    if (/^canned|can of|jar of/i.test(item)) {
        if (/tomato/i.test(item)) return 'Canned Tomatoes';
        if (/(corn|green bean|peas|carrot|vegetable|artichoke|asparagus|beet|spinach|mushroom)/i.test(item)) return 'Canned Vegetables';
        if (/(peach|pear|pineapple|fruit|cherry|apricot|mandarin|applesauce)/i.test(item)) return 'Canned Fruits';
        if (/(bean|chickpea|lentil)/i.test(item)) return 'Beans & Legumes';
        return 'Other';
    }

    // SOUPS AND BROTHS
    if (/\b(soup|broth|stock|bouillon|bisque|chowder|consomme|campbell|progresso|lipton)\b/i.test(item)) {
        return 'Soups';
    }

    // FROZEN ITEMS
    if (/^frozen/i.test(item)) {
        if (/(vegetable|broccoli|corn|peas|spinach|green bean|lima bean|edamame|brussels sprout|cauliflower|carrot|artichoke|asparagus)/i.test(item)) return 'Frozen Vegetables';
        if (/(fruit|berry|strawberry|blueberry|raspberry|mango|pineapple|peach|cherry)/i.test(item)) return 'Frozen Fruits';
        if (/(meal|dinner|entree|lean cuisine|healthy choice|stouffer)/i.test(item)) return 'Frozen Meals';
        if (/(pizza)/i.test(item)) return 'Frozen Pizza';
        if (/(waffle|pancake|french toast|breakfast)/i.test(item)) return 'Frozen Breakfast';
        if (/(chicken|beef|fish|seafood|shrimp|salmon|meat)/i.test(item)) return 'Frozen Meat';
        if (/(ice cream|gelato|sorbet|sherbet)/i.test(item)) return 'Ice Cream';
        return 'Frozen Meals';
    }

    // ICE CREAM AND FROZEN DESSERTS
    if (/\b(ice cream|gelato|sorbet|sherbet|popsicle|frozen yogurt|ice cream sandwich|drumstick|fudge bar|fruit bar)\b/i.test(item)) {
        return 'Ice Cream';
    }

    // BEVERAGES - Enhanced
    if (/\b(juice|soda|water|coffee|tea|beer|wine|energy drink|sports drink)\b/i.test(item)) {
        if (/\b(orange juice|apple juice|cranberry juice|grape juice|pineapple juice|tomato juice|v8|pomegranate|cherry|lemon juice|lime juice)\b/i.test(item)) return 'Juices';
        if (/\b(soda|cola|pepsi|coke|sprite|dr pepper|mountain dew|root beer|ginger ale|energy drink)\b/i.test(item)) return 'Soft Drinks';
        if (/\b(water|sparkling water|spring water|alkaline water|coconut water|lacroix|perrier|tonic|club soda|sports drink|gatorade|powerade)\b/i.test(item)) return 'Water';
        if (/(coffee|espresso|cappuccino|latte|americano|k-cup|ground coffee|instant coffee|cold brew)/i.test(item)) return 'Coffee & Tea';
        if (/(tea|green tea|black tea|herbal tea|chamomile|earl grey|english breakfast|chai|matcha|oolong)/i.test(item)) return 'Coffee & Tea';
        if (/(beer|wine|champagne|prosecco|chardonnay|cabernet|merlot|pinot|sauvignon|lager|ipa|ale|stout|pilsner)/i.test(item)) return 'Beer & Wine';
        return 'Water';
    }

    // SNACKS - Enhanced
    if (/(chip|cracker|pretzel|popcorn|nuts|seeds|trail mix|granola bar|fruit snack|candy|chocolate|gum|mint)/i.test(item)) {
        if (/(chip|cracker|pretzel|popcorn|doritos|cheetos|fritos|lay|pringles|wheat thin|triscuit|ritz|cheez-it)/i.test(item)) return 'Chips & Crackers';
        if (/(nuts|nut|almond|cashew|peanut|walnut|pecan|pistachio|macadamia|brazil nut|hazelnut|seed|sunflower|pumpkin seed|trail mix)/i.test(item)) return 'Nuts & Seeds';
        if (/(candy|chocolate|gummy|lollipop|hard candy|mint|gum|sweet)/i.test(item)) return 'Candy';
        if (/(cookie|granola bar|fruit snack|crackers|animal cracker|fig newton|oreo|chips ahoy)/i.test(item)) return 'Cookies & Sweets';
        return 'Chips & Crackers';
    }

    // CEREAL AND BREAKFAST
    if (/\b(cereal|granola|oatmeal|breakfast|pancake mix|waffle mix|syrup|honey|jam|jelly|preserves|peanut butter|almond butter|nutella)\b/i.test(item)) {
        if (/(cereal|granola|cheerios|corn flakes|rice krispies|frosted flakes|lucky charms|fruit loops|special k|raisin bran|shredded wheat)/i.test(item)) return 'Cereal';
        return 'Breakfast Items';
    }

    // CONDIMENTS AND SAUCES - Enhanced
    if (/(sauce|dressing|condiment|ketchup|mustard|mayo|mayonnaise|bbq|hot sauce|salad dressing|ranch|italian|caesar|thousand island|vinaigrette|worcestershire|a1|teriyaki|sweet and sour|cocktail sauce|tartar|marinara|alfredo|pesto|enchilada|salsa|picante|taco sauce)/i.test(item)) {
        return 'Sauces & Condiments';
    }

    // VINEGAR
    if (/\b(vinegar|balsamic|apple cider vinegar|white vinegar|red wine vinegar|rice vinegar|champagne vinegar)\b/i.test(item)) {
        return 'Vinegar';
    }

    // CLEANING AND HOUSEHOLD
    if (/(cleaner|detergent|soap|paper towel|toilet paper|napkin|tissue|aluminum foil|plastic wrap|trash bag|sponge|brush|glove)/i.test(item)) {
        if (/(paper towel|toilet paper|napkin|tissue|aluminum foil|plastic wrap|wax paper|parchment|freezer bag|storage bag|trash bag)/i.test(item)) return 'Paper Products';
        if (/(detergent|fabric softener|bleach|stain remover|dryer sheet|tide|gain|downy|bounce)/i.test(item)) return 'Laundry';
        return 'Cleaning Supplies';
    }

    // PERSONAL CARE
    if (/(shampoo|conditioner|soap|toothpaste|deodorant|lotion|razor|shaving|cologne|perfume|hair gel|mousse|face wash|moisturizer|sunscreen)/i.test(item)) {
        return 'Personal Care';
    }

    // HEALTH ITEMS
    if (/(vitamin|supplement|medicine|pain relief|ibuprofen|acetaminophen|aspirin|allergy|cold medicine|cough drop|band aid|first aid)/i.test(item)) {
        return 'Health Items';
    }

    // BABY CARE
    if (/(baby|infant|diaper|formula|baby food|baby wipe|pacifier|baby bottle|sippy cup)/i.test(item)) {
        return 'Baby Care';
    }

    // PET SUPPLIES
    if (/(dog|cat|pet|puppy|kitten|pet food|dog food|cat food|pet treat|litter|rawhide|catnip)/i.test(item)) {
        return 'Pet Food';
    }

    // DELI ITEMS
    if (/(turkey|ham|salami|pepperoni|prosciutto|roast beef|pastrami|bologna|deli meat|lunch meat|potato salad|macaroni salad|coleslaw|chicken salad|egg salad|tuna salad)/i.test(item)) {
        return 'Deli';
    }

    // BAKERY ITEMS
    if (/(croissant|danish|muffin|scone|biscuit|pastry|cake|cupcake|brownie|pie|tart|cheesecake|donut)/i.test(item)) {
        return 'Bakery';
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
        'Mexican Items', 'Asian Items', 'Indian Items', 'International Items',
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
 * Enhanced ingredient matching for better categorization
 */
export function findBestCategoryMatch(ingredientName, fallbackCategory = 'Other') {
    if (!ingredientName || typeof ingredientName !== 'string') {
        return fallbackCategory;
    }

    const suggested = suggestCategoryForItem(ingredientName);

    // Validate the suggested category exists
    if (isValidCategory(suggested)) {
        return suggested;
    }

    return fallbackCategory;
}

/**
 * Get categories by international section
 */
export function getInternationalCategories() {
    return {
        'Mexican Items': GROCERY_CATEGORIES['Mexican Items'],
        'Asian Items': GROCERY_CATEGORIES['Asian Items'],
        'Indian Items': GROCERY_CATEGORIES['Indian Items'],
        'International Items': GROCERY_CATEGORIES['International Items']
    };
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
    findBestCategoryMatch,
    getInternationalCategories,

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
    }),

    // Get all items across all categories for search/matching
    getAllCategoryItems: () => {
        const allItems = [];
        Object.values(GROCERY_CATEGORIES).forEach(category => {
            if (category.items) {
                allItems.push(...category.items.map(item => ({
                    item: item.toLowerCase(),
                    category: category.name
                })));
            }
        });
        return allItems;
    },

    // Enhanced category suggestion with confidence scoring
    suggestCategoryWithConfidence: (ingredientName) => {
        const suggested = suggestCategoryForItem(ingredientName);
        const allItems = CategoryUtils.getAllCategoryItems();

        let confidence = 0.5; // Base confidence

        // Exact match in category items
        const exactMatch = allItems.find(item =>
            item.item === ingredientName.toLowerCase().trim()
        );

        if (exactMatch) {
            confidence = 0.95;
        } else {
            // Partial match scoring
            const partialMatches = allItems.filter(item =>
                item.item.includes(ingredientName.toLowerCase().trim()) ||
                ingredientName.toLowerCase().trim().includes(item.item)
            );

            if (partialMatches.length > 0) {
                confidence = Math.min(0.9, 0.6 + (partialMatches.length * 0.1));
            }
        }

        return {
            category: suggested,
            confidence: confidence,
            isValidCategory: isValidCategory(suggested)
        };
    }
};