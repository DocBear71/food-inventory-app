// file: /src/lib/groceryCategories.js v3 - FIXED categorization patterns for better matching

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
            'Radishes', 'Turnips', 'Parsnips', 'Rutabagas', 'Jicama', 'potato',
            'Asparagus', 'Green Beans', 'Snow Peas', 'Sugar Snap Peas', 'carrot',
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
            'Lamb Chops', 'Leg of Lamb', 'Lamb Shoulder', 'Rack of Lamb', 'cube steak',
            'cubed steak'
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
            'Cashew Milk', 'Hemp Milk', 'Pea Milk', 'Cream Cheese Spread', 'Butter', 'Margarine'
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
            'Monterey Jack', 'Pepper Jack', 'Colby', 'Muenster', 'Mozzarella'
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
            'Liquid Egg Whites', 'Liquid Whole Eggs', 'Egg Substitute', 'egg', 'eggs'
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
            'Chicken Broth', 'Beef Broth', 'Vegetable Broth', 'Bone Broth', 'veggie stock',
            'Chicken Stock', 'Beef Stock', 'Vegetable Stock', 'Mushroom Broth', 'chicken or veggie stock',
            'Campbell\'s Soup', 'Progresso Soup', 'Lipton Soup Mix', 'chicken or beef stock',
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
            'Buckwheat', 'Freekeh', 'Teff', 'Cornmeal'
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
            'Enchilada Sauce', 'Salsa', 'Picante Sauce', 'Taco Sauce', 'black olives',
            'pickles', 'pickle relish'
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
            'Nutella'
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
            'Horchata', 'Tamarind', 'Hibiscus', 'Mexican Vanilla', 'Piloncillo', 'Polenta',
            'Masa Harina', 'Cornhusks', 'dried cornhusks'
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
            'Wonton Wrappers', 'Dumpling Wrappers', 'Spring Roll Wrappers', 'eggroll wrappers',
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
 * ENHANCED: Comprehensive ingredient normalization that removes descriptive words
 * This is the key fix for your categorization issue
 */
export function normalizeIngredientForCategorization(ingredientName) {
    if (!ingredientName || typeof ingredientName !== 'string') {
        return '';
    }

    let normalized = ingredientName.toLowerCase().trim();

    // Step 1: Remove parenthetical content
    normalized = normalized.replace(/\([^)]*\)/g, '');

    // Step 2: Remove measurements and quantities (more comprehensive)
    normalized = normalized
        // Remove fractions and decimals
        .replace(/\d+\s*[½¼¾⅓⅔⅛⅜⅝⅞]/g, '')
        .replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, '')
        .replace(/\d*\.\d+/g, '')
        .replace(/\b\d+\/\d+\b/g, '')
        .replace(/\b\d+\b/g, '')

        // Remove measurement units (expanded list)
        .replace(/\b(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|ml|liters?|l|grams?|g|kg|kilograms?|pt\.?|pints?|qt|quarts?|gal|gallons?|fl\.?\s*oz|fluid\s*ounces?|cloves?|heads?|bunches?|stalks?|pieces?|slices?|strips?|cans?|jars?|bottles?|bags?|boxes?|packages?|containers?|ea)\b/gi, '')

        // Remove size descriptors
        .replace(/\b(small|medium|large|extra\s*large|jumbo|mini|tiny|huge|giant|big)\b/gi, '')

        // CRITICAL: Remove preparation/cooking descriptors
        .replace(/\b(fresh|frozen|dried|dehydrated|canned|jarred|bottled|packaged)\b/gi, '')
        .replace(/\b(raw|cooked|baked|roasted|grilled|fried|sautéed|steamed|boiled)\b/gi, '')
        .replace(/\b(chopped|diced|minced|sliced|julienned|grated|shredded|crushed|mashed|pureed)\b/gi, '')
        .replace(/\b(finely|coarsely|roughly|thinly|thickly|finely|coarse|fine|thick|thin)\b/gi, '')
        .replace(/\b(beaten|whipped|melted|softened|room\s*temperature|cold|hot|warm|cool)\b/gi, '')
        .replace(/\b(organic|natural|pure|whole|low\s*fat|non\s*fat|fat\s*free|reduced\s*fat)\b/gi, '')
        .replace(/\b(unsalted|salted|sweetened|unsweetened|seasoned|plain)\b/gi, '')
        .replace(/\b(peeled|unpeeled|seeded|deseeded|stemmed|trimmed|cleaned)\b/gi, '')
        .replace(/\b(boneless|skinless|bone\s*in|skin\s*on)\b/gi, '')

        // Remove cooking state descriptors
        .replace(/\b(soft|hard|firm|tender|crisp|crispy|crunchy)\b/gi, '')
        .replace(/\b(ripe|unripe|green|red|yellow|white|black|brown)\b/gi, '')

        // Remove optional/taste descriptors
        .replace(/\b(optional|to\s*taste|as\s*needed|for\s*serving|for\s*garnish)\b/gi, '')
        .replace(/\b(dash|pinch|splash|handful|bunch)\b/gi, '')

        // Remove brand/quality descriptors
        .replace(/\b(premium|gourmet|artisan|homemade|store\s*bought|fresh\s*from)\b/gi, '')

        // Clean up punctuation and extra spaces
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return normalized;
}

/**
 * ENHANCED: Extract the core ingredient name with better logic
 */
function extractCoreIngredient(ingredientName) {
    if (!ingredientName) return '';

    const normalized = normalizeIngredientForCategorization(ingredientName);

    // Handle compound ingredient names by keeping the most important words
    const words = normalized.split(' ').filter(word => word.length > 2);

    // If we have multiple words, try to identify the core ingredient
    if (words.length > 1) {
        // Look for known ingredient patterns
        const ingredientPatterns = [
            /\b(tomato|tomatoes)\b/,
            /\b(onion|onions)\b/,
            /\b(pepper|peppers)\b/,
            /\b(cheese|cheddar|mozzarella|parmesan)\b/,
            /\b(chicken|beef|pork|turkey|fish)\b/,
            /\b(flour|sugar|salt|pepper|oil)\b/,
            /\b(milk|cream|butter|yogurt)\b/,
            /\b(bread|tortilla|pasta|rice)\b/,
            /\b(beans|lentils|chickpeas)\b/,
            /\b(cornhusks?|cornhusk)\b/,
            /\b(olives?)\b/,
            /\b(potatoes?|potato)\b/,
            /\b(lettuce)\b/,
            /\b(bacon)\b/
        ];

        // Find the most important word based on patterns
        for (const pattern of ingredientPatterns) {
            const match = normalized.match(pattern);
            if (match) {
                return match[0];
            }
        }

        // If no pattern matches, return the longest meaningful word
        const meaningfulWords = words.filter(word => word.length > 3);
        if (meaningfulWords.length > 0) {
            return meaningfulWords[0];
        }
    }

    return normalized;
}

/**
 * ENHANCED: Category suggestion with better preprocessing
 */
export function suggestCategoryForItem(itemName) {
    if (!itemName) return 'Other';

    // Step 1: Normalize the ingredient name
    const normalized = normalizeIngredientForCategorization(itemName);
    const coreIngredient = extractCoreIngredient(itemName);

    console.log(`[CATEGORIZATION] Original: "${itemName}" → Normalized: "${normalized}" → Core: "${coreIngredient}"`);

    // Step 2: Test both the normalized and core ingredient against patterns
    const testItems = [normalized, coreIngredient, itemName.toLowerCase().trim()];

    for (const testItem of testItems) {
        if (!testItem) continue;

        const category = getCategoryForNormalizedItem(testItem);
        if (category !== 'Other') {
            console.log(`[CATEGORIZATION] ✅ Matched "${testItem}" → "${category}"`);
            return category;
        }
    }

    console.log(`[CATEGORIZATION] ❌ No match found for "${itemName}" → "Other"`);
    return 'Other';
}

/**
 * FIXED: Core categorization logic with comprehensive patterns
 * Better handling of comma-separated and parenthetical ingredients
 */
function getCategoryForNormalizedItem(item) {
    if (!item) return 'Other';

    // MEXICAN ITEMS - High priority patterns (including cornhusks issue)
    if (/\b(tortilla|tortillas|taco|enchilada|salsa|queso|chorizo|masa|tamale|jalapeño|serrano|poblano|chipotle|cilantro|lime|avocado|tomatillo|refried\s*beans|mexican|spanish\s*rice|verde|picante|adobo|mole|horchata|piloncillo|cornhusks?|cornhusk|dried\s*cornhusks)\b/i.test(item)) {
        return 'Mexican Items';
    }

    // ASIAN ITEMS - High priority patterns (including eggroll wrappers)
    if (/\b(soy\s*sauce|sesame\s*oil|rice\s*vinegar|fish\s*sauce|oyster\s*sauce|hoisin|teriyaki|sriracha|miso|tahini|rice\s*wine|mirin|sake|jasmine\s*rice|sushi\s*rice|udon|soba|ramen|rice\s*noodles|wonton|dumpling|spring\s*roll|eggroll|egg\s*roll\s*wrapper|nori|shiitake|bok\s*choy|daikon|lemongrass|wasabi|panko|coconut\s*milk|curry\s*paste|five\s*spice|tofu|tempeh|kimchi|dashi|bean\s*thread|black\s*fungus)\b/i.test(item)) {
        return 'Asian Items';
    }

    // PASTA ITEMS - High priority (including lasagna noodles)
    if (/\b(pasta|spaghetti|penne|fusilli|rigatoni|linguine|fettuccine|angel\s*hair|bow\s*tie|farfalle|macaroni|shells|rotini|gemelli|orzo|pappardelle|tagliatelle|bucatini|cavatappi|ziti|lasagna\s*noodles?|ravioli|tortellini|gnocchi)\b/i.test(item)) {
        return 'Pasta';
    }

    // TOMATO PRODUCTS - Very specific matching (for canned tomato sauce)
    if (/\b(tomato\s*paste|paste)\b/i.test(item) && /tomato/i.test(item)) {
        return 'Canned Tomatoes';
    }
    if (/\b(tomato\s*sauce|marinara|pizza\s*sauce)\b/i.test(item)) {
        return 'Canned Tomatoes';
    }
    if (/\b(crushed\s*tomatoes|diced\s*tomatoes|whole\s*tomatoes|stewed\s*tomatoes|fire\s*roasted\s*tomatoes)\b/i.test(item)) {
        return 'Canned Tomatoes';
    }

    // FRESH PRODUCE - Enhanced patterns (for fresh items like lettuce, tomatoes)
    if (/^(apple|banana|orange|lemon|lime|grape|berry|melon|peach|pear|plum|cherry|kiwi|mango|pineapple|avocado|coconut|strawberry|blueberry|raspberry|blackberry|cranberry|watermelon|cantaloupe|pomegranate)/i.test(item)) {
        return 'Fresh Fruits';
    }

    if (/\b(lettuce|spinach|arugula|kale|chard|greens|shredded\s*lettuce)\b/i.test(item)) {
        return 'Fresh Produce';
    }

    // Fresh tomatoes (including cherry tomatoes)
    if (/\b(cherry\s*tomatoes|grape\s*tomatoes|roma\s*tomatoes|fresh\s*tomatoes)\b/i.test(item) ||
        (/\b(tomato|tomatoes)\b/i.test(item) && !/\b(paste|sauce|crushed|diced|whole|stewed|fire\s*roasted|canned|can|jar)\b/i.test(item))) {
        return 'Fresh Fruits';
    }

    // Bell peppers and produce peppers (FIXED: better pattern for bell pepper items)
    if (/\b(bell\s*pepper|red\s*bell\s*pepper|green\s*bell\s*pepper|yellow\s*bell\s*pepper)\b/i.test(item) && !/\bblack\s*pepper|white\s*pepper|red\s*pepper\s*flakes/i.test(item)) {
        return 'Fresh Produce';
    }

    // General fresh vegetables (FIXED: better onion and garlic handling)
    if (/\b(onion|onions|yellow\s*onion|white\s*onion|red\s*onion|sweet\s*onion)\b/i.test(item) && !/green\s*onion|scallion/i.test(item)) {
        return 'Fresh Vegetables';
    }

    if (/\b(garlic|cloves\s*garlic)\b/i.test(item)) {
        return 'Fresh Vegetables';
    }

    if (/^(carrot|celery|broccoli|cauliflower|cucumber|mushroom|cabbage|zucchini|ginger|herbs?|basil|mint|thyme|oregano|rosemary|sage|dill|chive|scallion|green\s*onion|shallot)/i.test(item)) {
        return 'Fresh Vegetables';
    }

    // POTATOES - specific handling
    if (/\b(potato|potatoes|russet|red\s*potato|yukon|sweet\s*potato|large\s*russet\s*potatoes|large\s*potato)\b/i.test(item)) {
        return 'Fresh Vegetables';
    }

    // DAIRY PATTERNS - Enhanced (for butter and milk items)
    if (/\b(milk|cream|half|buttermilk|almond\s*milk|soy\s*milk|oat\s*milk|coconut\s*milk|rice\s*milk|cashew\s*milk|cold\s*milk|whole\s*milk)\b/i.test(item) && !/\bcoconut\s*milk\b.*\b(canned|can)\b/i.test(item)) {
        return 'Dairy';
    }

    if (/\b(butter|melted\s*butter)\b/i.test(item) && !/\b(peanut|almond|cashew|sunflower)\b/i.test(item)) {
        return 'Dairy';
    }

    if (/\b(sour\s*cream|heavy\s*cream|cream\s*cheese)\b/i.test(item)) {
        return 'Dairy';
    }

    // CHEESE PATTERNS - Enhanced
    if (/\b(cheese|cheddar|mozzarella|swiss|parmesan|cottage\s*cheese|ricotta|feta|goat\s*cheese|blue\s*cheese|provolone|monterey\s*jack|pepper\s*jack|colby|muenster|brie|camembert|gorgonzola|shredded\s*cheese|shredded\s*mozzarella|shredded\s*cheddar|shredded\s*monterey\s*jack)\b/i.test(item)) {
        return 'Cheese';
    }

    // MEAT PATTERNS - Enhanced (FIXED: better cube steak handling)
    if (/\b(bacon|strips\s*bacon)\b/i.test(item) && !/\b(vegan|plant|turkey)\b/i.test(item)) {
        return 'Fresh Meat';
    }

    if (/\b(beef|steak|ground\s*beef|lean\s*ground\s*beef|hamburger|roast|chuck|sirloin|ribeye|filet|tenderloin|brisket|short\s*rib|flank|skirt|round|cube\s*steaks?|beef\s*patty|roast\s*pork|steaks?)\b/i.test(item)) {
        return 'Fresh Meat';
    }

    // EGGS
    if (/\b(egg|eggs|beaten\s*egg)\b/i.test(item) && !/\begg\s*roll|eggplant|eggnog/i.test(item)) {
        return 'Eggs';
    }

    // BREAD PATTERNS - Enhanced (for eggroll wrappers and other wraps)
    if (/\b(bread|loaf|bagel|english\s*muffin|roll|bun|baguette|sourdough|whole\s*wheat|multigrain|rye|pumpernickel|ciabatta|focaccia|naan|flatbread)\b/i.test(item)) {
        return 'Breads';
    }

    // Egg roll wrappers should go to Asian Items (handled above), but if not caught, put in Breads
    if (/\b(wrapper|wrappers|egg\s*roll\s*wrapper)\b/i.test(item)) {
        return 'Breads';
    }

    // OILS AND COOKING OILS
    if (/\b(oil|olive\s*oil|vegetable\s*oil|canola\s*oil|coconut\s*oil|cooking\s*spray|avocado\s*oil|sunflower\s*oil|corn\s*oil|peanut\s*oil|sesame\s*oil|walnut\s*oil|grapeseed\s*oil|for\s*frying)\b/i.test(item)) {
        return 'Cooking Oil';
    }

    // SPICES AND SEASONINGS - Enhanced (FIXED: better salt handling)
    if (/\b(salt|pepper|black\s*pepper|white\s*pepper|kosher\s*salt|sea\s*salt|table\s*salt|garlic\s*powder|onion\s*powder|paprika|smoked\s*paprika|cumin|chili\s*powder|oregano|mexican\s*oregano|basil|thyme|rosemary|sage|red\s*pepper\s*flakes|hot\s*sauce|tabasco)\b/i.test(item)) {
        return 'Spices & Seasonings';
    }

    // FLOUR AND BAKING - Enhanced (FIXED: better flour handling)
    if (/\b(flour|all\s*purpose\s*flour|cups\s*all\s*purpose\s*flour|sugar|brown\s*sugar|white\s*sugar|vanilla\s*extract|baking\s*powder|baking\s*soda|corn\s*starch|cornstarch)\b/i.test(item)) {
        return 'Baking Ingredients';
    }

    // STOCK AND BROTH
    if (/\b(stock|broth|chicken\s*stock|beef\s*stock|vegetable\s*stock|veggie\s*stock|chicken\s*or\s*veggie\s*stock|chicken\s*or\s*beef\s*stock)\b/i.test(item)) {
        return 'Soups';
    }

    // PICKLES AND CONDIMENTS
    if (/\b(pickle|pickles|pickle\s*slices|olives?|black\s*olives)\b/i.test(item)) {
        return 'Sauces & Condiments';
    }

    // MIXED VEGETABLES AND FROZEN ITEMS
    if (/\b(mixed\s*vegetables)\b/i.test(item)) {
        return 'Frozen Vegetables';
    }

    // BISCUIT DOUGH AND PREPARED ITEMS
    if (/\b(biscuit\s*dough|cookie\s*dough|pie\s*crust|pizza\s*dough)\b/i.test(item)) {
        return 'Refrigerated Items';
    }

    // WATER
    if (/\b(water|cold\s*water)\b/i.test(item) && !/\bwater\s*chestnuts/i.test(item)) {
        return 'Water';
    }

    // WINE (including white wine for cooking)
    if (/\b(wine|white\s*wine|red\s*wine|cooking\s*wine)\b/i.test(item)) {
        return 'Beer & Wine';
    }

    // FRESH HERBS (catch-all for herbs not caught above)
    if (/\b(herbs?|fresh\s*herbs?|parsley|cilantro\s*leaves|chopped\s*fresh\s*herbs)\b/i.test(item)) {
        return 'Fresh Produce';
    }

    // CARROTS AND ROOT VEGETABLES
    if (/\b(carrot|carrots|shredded\s*carrot)\b/i.test(item)) {
        return 'Fresh Vegetables';
    }

    // CELERY
    if (/\b(celery|shredded\s*celery)\b/i.test(item)) {
        return 'Fresh Vegetables';
    }

    // GREEN CABBAGE
    if (/\b(cabbage|green\s*cabbage)\b/i.test(item)) {
        return 'Fresh Vegetables';
    }

    // GROUND PORK AND OTHER MEATS
    if (/\b(ground\s*pork|pork)\b/i.test(item)) {
        return 'Fresh Meat';
    }

    // FILLING - generic catch for prepared items
    if (/\b(filling|filling\s*of\s*choice)\b/i.test(item)) {
        return 'Other';
    }

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