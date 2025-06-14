// file: /src/app/recipes/suggestions/page.js v5 - Fixed categorization logic and improved meal suggestions

'use client';

import {useSession} from 'next-auth/react';
import {useEffect, useState} from 'react';
import RecipeShoppingList from '@/components/recipes/RecipeShoppingList';
import {redirect} from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

export default function RecipeSuggestions() {
    const {data: session, status} = useSession();
    const [suggestions, setSuggestions] = useState([]);
    const [simpleMealSuggestions, setSimpleMealSuggestions] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchThreshold, setMatchThreshold] = useState(0.4);
    const [sortBy, setSortBy] = useState('match');
    const [showShoppingList, setShowShoppingList] = useState(null);
    const [showRecipeModal, setShowRecipeModal] = useState(null);
    const [loadingRecipe, setLoadingRecipe] = useState(false);
    const [activeTab, setActiveTab] = useState('recipes');

    // UPDATED: Simple meal templates with gravy category
    const mealTemplates = [
        {
            id: 'protein-starch-vegetable',
            name: 'Protein + Starch + Vegetable',
            description: 'Classic balanced meal',
            icon: '🍽️',
            requiredCategories: ['protein', 'starch', 'vegetable'],
            optionalCategories: ['sauce', 'gravy', 'seasoning'],
            examples: ['Steak + Mashed Potatoes + Broccoli', 'Chicken + Rice + Green Beans']
        },
        {
            id: 'pasta-meal',
            name: 'Pasta Dish',
            description: 'Pasta-based meal',
            icon: '🍝',
            requiredCategories: ['pasta'],
            optionalCategories: ['protein', 'vegetable', 'sauce', 'cheese'],
            examples: ['Spaghetti + Marinara + Parmesan', 'Penne + Chicken + Broccoli']
        },
        {
            id: 'sandwich-meal',
            name: 'Sandwich/Wrap',
            description: 'Bread-based meal',
            icon: '🥪',
            requiredCategories: ['bread'],
            optionalCategories: ['protein', 'vegetable', 'cheese', 'condiment'],
            examples: ['Turkey Sandwich + Lettuce + Tomato', 'Grilled Cheese + Tomato Soup']
        },
        {
            id: 'rice-bowl',
            name: 'Rice Bowl',
            description: 'Rice-based bowl',
            icon: '🍚',
            requiredCategories: ['rice'],
            optionalCategories: ['protein', 'vegetable', 'sauce'],
            examples: ['Chicken Teriyaki Bowl', 'Beef and Broccoli Rice']
        },
        {
            id: 'convenience-meal',
            name: 'Convenience Meal',
            description: 'Quick prepared items',
            icon: '⚡',
            requiredCategories: ['convenience'],
            optionalCategories: ['protein', 'vegetable'],
            examples: ['Frozen Pizza', 'Hamburger Helper + Ground Beef', 'Mac & Cheese']
        },
        {
            id: 'soup-meal',
            name: 'Soup & Sides',
            description: 'Soup-based meal',
            icon: '🍲',
            requiredCategories: ['soup'],
            optionalCategories: ['bread', 'cheese', 'vegetable'],
            examples: ['Tomato Soup + Grilled Cheese', 'Chicken Noodle Soup + Crackers']
        }
    ];

    // COMPLETELY REVISED: Category mappings with better organization and specificity
    const categoryMappings = {
        // CONVENIENCE ITEMS - Check first to catch packaged meals
        convenience: [
            // Specific convenience meal patterns
            'frozen pizza', 'pizza', 'hamburger helper', 'mac and cheese', 'instant noodles',
            'ramen', 'tv dinner', 'frozen meals', 'boxed mac and cheese',
            'kraft dinner', 'easy mac', 'hot pockets', 'lean cuisine',
            // Specific items from your inventory
            'four cheese lasagna', 'deluxe beef stroganoff', 'beef stroganoff',
            // Boxed/packaged meal patterns
            'lasagna', 'stroganoff', 'skillet meal', 'meal kit'
        ],

        // PROTEINS - Actual meat, poultry, fish, eggs
        protein: [
            'chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'eggs',
            'ground beef', 'ground turkey', 'chicken breast', 'pork chops', 'steak',
            'bacon', 'sausage', 'ham', 'tofu', 'lentils', 'stew meat',
            'hamburger patties', 'ribeye', 'new york steak', 'chicken nuggets',
            'chicken patties', 'chicken wing', 'spareribs', 'pork loin', 'pork tenderloin',
            'black beans', 'kidney beans', 'black eyed peas', 'red beans', 'refried beans'
        ],

        // STARCHES - Pure starches without other classifications
        starch: [
            'potatoes', 'quinoa', 'mashed potatoes',
            'sweet potatoes', 'couscous', 'barley',
            'stuffing', 'tater tots', 'frozen potatoes'
        ],

        // VEGETABLES - Fresh, frozen, canned vegetables
        vegetable: [
            'broccoli', 'carrots', 'green beans', 'asparagus', 'spinach', 'lettuce',
            'tomatoes', 'onions', 'peppers', 'corn', 'peas', 'mushrooms', 'zucchini',
            'cauliflower', 'cabbage', 'brussels sprouts', 'celery', 'frozen broccoli'
        ],

        // FRUITS
        fruits: [
            'oranges', 'pineapple', 'peaches', 'fruit cocktail', 'mandarin oranges',
            'sliced peaches', 'pineapple tidbits'
        ],

        // RICE SPECIFICALLY
        rice: [
            'rice', 'brown rice', 'white rice', 'jasmine rice', 'basmati rice', 'wild rice',
            'rice pilaf'
        ],

        // PASTA SPECIFICALLY
        pasta: [
            'pasta', 'spaghetti', 'penne', 'macaroni', 'fettuccine', 'rigatoni',
            'lasagna noodles', 'angel hair', 'linguine', 'farfalle', 'bow ties',
            'shell macaroni', 'enriched macaroni', 'noodles'
        ],

        // BREAD SPECIFICALLY
        bread: [
            'bread', 'white bread', 'wheat bread', 'sourdough', 'rye bread', 'bagels',
            'rolls', 'buns', 'tortillas', 'wraps', 'pita bread', 'english muffins',
            'hot dog buns'
        ],

        // SOUP - Liquid-based meals (excluding seasonings)
        soup: [
            'soup', 'chicken soup', 'tomato soup', 'vegetable soup', 'minestrone',
            'chicken noodle soup', 'beef stew', 'broth', 'stock', 'campbell',
            'cream chicken', 'bisque', 'chowder', 'chili'
        ],

        // NEW: GRAVY - Separate from sauces
        gravy: [
            'gravy', 'beef gravy', 'turkey gravy', 'chicken gravy', 'brown gravy',
            'homestyle gravy', 'savory beef gravy', 'homestyle turkey gravy'
        ],

        // SAUCES - Cooking sauces (NOT condiments)
        sauce: [
            'marinara', 'tomato sauce', 'alfredo', 'pesto',
            'pasta sauce', 'cheese sauce', 'cream sauce'
        ],

        // CHEESE - Pure dairy cheese products (not meals containing cheese)
        cheese: [
            'cheddar cheese', 'mozzarella cheese', 'swiss cheese', 'american cheese',
            'cream cheese', 'feta cheese', 'goat cheese', 'string cheese',
            'parmesan cheese', 'blue cheese', 'brie cheese'
            // Removed generic 'cheese' and 'parmesan' to avoid matching composite items
        ],

        // CONDIMENTS - Table condiments
        condiment: [
            'mayonnaise', 'mustard', 'ketchup', 'ranch', 'italian dressing',
            'vinaigrette', 'pickle', 'relish','soy sauce', 'teriyaki sauce',
            'barbecue sauce', 'hot sauce','worcestershire'
        ],

        // SEASONINGS - Spices and herbs
        seasoning: [
            'salt', 'pepper', 'garlic powder', 'onion powder', 'paprika', 'black pepper',
            'white pepper', 'oregano', 'basil', 'thyme', 'rosemary', 'cumin',
            'chili powder', 'red pepper flakes'
        ],

        // BASIC INGREDIENTS - Baking/cooking basics
        ingredients: [
            'flour', 'all-purpose flour', 'brown sugar', 'sugar', 'honey', 'vinegar',
            'baking powder', 'baking soda', 'white vinegar', 'granulated sugar', 'enchilada sauce'
        ],
    };

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session) {
            loadData();
        }
    }, [session]);

    useEffect(() => {
        if (inventory.length > 0 && recipes.length > 0) {
            generateSuggestions();
            generateSimpleMealSuggestions();
        }
    }, [inventory, recipes, matchThreshold]);

    // UPDATED: Generate simple meal suggestions with improved categorization
    const generateSimpleMealSuggestions = () => {
        console.log('=== GENERATING SIMPLE MEAL SUGGESTIONS ===');

        // Categorize inventory items
        const categorizedInventory = categorizeInventoryItems(inventory);

        // Generate suggestions for each meal template
        const suggestions = mealTemplates.map(template => {
            const suggestion = generateMealFromTemplate(template, categorizedInventory);
            return suggestion;
        }).filter(suggestion => suggestion && suggestion.canMake);

        // Sort by completeness and variety
        suggestions.sort((a, b) => {
            // Prioritize meals that are complete
            if (a.isComplete !== b.isComplete) {
                return b.isComplete - a.isComplete;
            }
            // Then by number of components
            return b.components.length - a.components.length;
        });

        console.log('Generated simple meal suggestions:', suggestions.length);
        setSimpleMealSuggestions(suggestions);
    };

    // COMPLETELY REWRITTEN: Improved categorization with priority order and exclusions
    const categorizeInventoryItems = (inventory) => {
        const categorized = {};

        // Initialize categories
        Object.keys(categoryMappings).forEach(category => {
            categorized[category] = [];
        });

        // Priority order for categorization (most specific first)
        const priorityOrder = [
            'convenience',  // Check convenience first to catch packaged meals
            'seasoning',   // Seasonings
            'gravy',       // Check gravy before sauce
            'condiment',   // Check condiments before sauce
            'soup',        // Check soup before other categories
            'rice',        // Check rice before starch
            'pasta',       // Check pasta before starch
            'bread',       // Check bread before starch
            'fruits',      // Check fruits early
            'cheese',      // Check cheese before other categories
            'protein',     // Check protein
            'vegetable',   // Check vegetables
            'starch',      // General starches
            'sauce',       // Sauces (after condiments)
            'ingredients'  // Basic ingredients last
        ];

        inventory.forEach(item => {
            const itemName = item.name.toLowerCase().trim();
            let categorized_item = false;

            console.log(`\n--- Categorizing: "${item.name}" ---`);

            // Go through categories in priority order
            for (const category of priorityOrder) {
                if (categorized_item) break; // Skip if already categorized

                const keywords = categoryMappings[category];
                const matches = keywords.some(keyword => {
                    const keywordLower = keyword.toLowerCase();

                    // More precise matching
                    return itemName === keywordLower ||  // Exact match
                        itemName.includes(keywordLower) ||  // Contains keyword
                        keywordLower.includes(itemName);    // Keyword contains item name
                });

                if (matches) {
                    // Additional validation for specific categories
                    if (category === 'convenience') {
                        // Double-check convenience items
                        const isConvenience = keywords.some(keyword => {
                            const keywordLower = keyword.toLowerCase();
                            return itemName.includes(keywordLower) ||
                                keywordLower.includes(itemName);
                        });
                        if (isConvenience) {
                            categorized[category].push(item);
                            categorized_item = true;
                            console.log(`✅ CONVENIENCE: "${item.name}"`);
                        }
                    } else if (category === 'gravy') {
                        // Only add to gravy if it contains "gravy"
                        if (itemName.includes('gravy')) {
                            categorized[category].push(item);
                            categorized_item = true;
                            console.log(`✅ GRAVY: "${item.name}"`);
                        }
                    } else if (category === 'soup') {
                        // Only add to soup if it's actually soup, not seasonings that contain "chili"
                        const isActualSoup = keywords.some(keyword => {
                            const keywordLower = keyword.toLowerCase();
                            // For chili specifically, make sure it's not "chili powder"
                            if (keywordLower === 'chili') {
                                return itemName.includes('chili') && !itemName.includes('powder') && !itemName.includes('seasoning');
                            }
                            return itemName === keywordLower || itemName.includes(keywordLower);
                        });

                        // Exclude seasonings that contain soup keywords
                        const isNotSoup = itemName.includes('powder') ||
                            itemName.includes('seasoning') ||
                            itemName.includes('spice');

                        if (isActualSoup && !isNotSoup) {
                            categorized[category].push(item);
                            categorized_item = true;
                            console.log(`✅ SOUP: "${item.name}"`);
                        }
                        // Strict condiment matching
                        const isCondiment = ['mayonnaise', 'mustard', 'ketchup', 'ranch', 'italian dressing',
                            'vinaigrette', 'pickle', 'relish','soy sauce', 'teriyaki sauce',
                            'barbecue sauce', 'hot sauce','worcestershire'].some(condiment =>
                            itemName.includes(condiment)
                        );
                        if (isCondiment) {
                            categorized[category].push(item);
                            categorized_item = true;
                            console.log(`✅ CONDIMENT: "${item.name}"`);
                        }
                    } else if (category === 'sauce') {
                        // Don't categorize as sauce if it's already a condiment or gravy
                        const isCondiment = ['mayonnaise', 'mustard', 'ketchup', 'ranch', 'italian dressing',
                            'vinaigrette', 'pickle', 'relish','soy sauce', 'teriyaki sauce',
                            'barbecue sauce', 'hot sauce','worcestershire'].some(condiment =>
                            itemName.includes(condiment)
                        );
                        const isGravy = itemName.includes('gravy');
                        if (!isCondiment && !isGravy) {
                            categorized[category].push(item);
                            categorized_item = true;
                            console.log(`✅ SAUCE: "${item.name}"`);
                        }
                    } else if (category === 'cheese') {
                        // Only add to cheese if it's actually a cheese product, not a meal with cheese
                        const isCheeseProduct = itemName.includes('cheese') &&
                            !itemName.includes('lasagna') &&
                            !itemName.includes('stroganoff') &&
                            !itemName.includes('potatoes'); // Don't include cheese potatoes as cheese
                        if (isCheeseProduct || itemName.includes('parmesan')) {
                            categorized[category].push(item);
                            categorized_item = true;
                            console.log(`✅ CHEESE: "${item.name}"`);
                        }
                    } else if (category === 'pasta') {
                        // Only add to pasta if it's actual pasta, not sauce with pasta in the name
                        const isActualPasta = keywords.some(keyword => {
                            const keywordLower = keyword.toLowerCase();
                            // Must be exact pasta type match, not just containing "pasta"
                            return itemName === keywordLower ||
                                (itemName.split(' ').includes(keywordLower) && !itemName.includes('sauce'));
                        });

                        // Exclude sauces and other non-pasta items
                        const isNotPasta = itemName.includes('sauce') ||
                            itemName.includes('gravy') ||
                            itemName.includes('seasoning');

                        if (isActualPasta && !isNotPasta) {
                            categorized[category].push(item);
                            categorized_item = true;
                            console.log(`✅ PASTA: "${item.name}"`);
                        }
                        // Don't categorize as starch if it's a sauce, gravy, or convenience item
                        const isGravy = itemName.includes('gravy');
                        const isSauce = itemName.includes('sauce');
                        const isConvenience = categoryMappings.convenience.some(keyword =>
                            itemName.includes(keyword.toLowerCase())
                        );
                        if (!isGravy && !isSauce && !isConvenience) {
                            categorized[category].push(item);
                            categorized_item = true;
                            console.log(`✅ STARCH: "${item.name}"`);
                        }
                    } else {
                        // Standard categorization for other categories
                        categorized[category].push(item);
                        categorized_item = true;
                        console.log(`✅ ${category.toUpperCase()}: "${item.name}"`);
                    }
                }
            }

            if (!categorized_item) {
                console.log(`❌ NO CATEGORY: "${item.name}"`);
            }
        });

        console.log('\n=== FINAL CATEGORIZATION RESULTS ===');
        Object.entries(categorized).forEach(([category, items]) => {
            if (items.length > 0) {
                console.log(`${category.toUpperCase()} (${items.length}):`, items.map(i => i.name));
            }
        });

        return categorized;
    };

    // UPDATED: Enhanced culinary pairing rules
    const culinaryPairings = {
        // Good protein + starch combinations
        proteinStarchPairs: {
            'chicken': ['rice', 'potatoes', 'pasta', 'quinoa'],
            'beef': ['potatoes', 'rice', 'pasta'],
            'pork': ['potatoes', 'rice', 'sweet potatoes'],
            'turkey': ['potatoes', 'rice', 'bread'],
            'fish': ['rice', 'potatoes', 'quinoa'],
            'salmon': ['rice', 'potatoes', 'quinoa'],
            'eggs': ['bread', 'potatoes', 'rice'],
            'ground beef': ['pasta', 'rice', 'potatoes'],
            'bacon': ['bread', 'potatoes'],
            'ham': ['bread', 'potatoes'],
            'sausage': ['pasta', 'potatoes', 'rice']
        },

        // Good sauce/gravy combinations by meal type
        saucePairings: {
            'pasta': ['marinara', 'tomato sauce', 'alfredo', 'pesto', 'cheese sauce'],
            'rice': ['soy sauce', 'teriyaki', 'curry sauce'],
            'chicken': ['barbecue sauce', 'teriyaki', 'buffalo sauce'],
            'beef': ['barbecue sauce', 'steak sauce', 'mushroom sauce', 'beef gravy'],
            'pork': ['barbecue sauce', 'apple sauce', 'gravy'],
            'turkey': ['turkey gravy', 'cranberry sauce'],
            'sandwich': ['mayonnaise', 'mustard', 'ranch', 'italian dressing']
        },

        // Vegetables that go well with proteins
        proteinVeggiePairs: {
            'chicken': ['broccoli', 'green beans', 'carrots', 'asparagus', 'spinach'],
            'beef': ['broccoli', 'carrots', 'green beans', 'mushrooms'],
            'pork': ['asparagus', 'green beans', 'corn', 'carrots'],
            'fish': ['asparagus', 'broccoli', 'spinach', 'green beans'],
            'salmon': ['asparagus', 'broccoli', 'spinach']
        },

        // Items to avoid in certain meal types
        avoidCombinations: {
            'sandwich': ['rice', 'pasta'], // Don't put rice/pasta in sandwiches
            'pasta': ['potatoes', 'rice'], // Don't double up on starches
            'rice': ['pasta', 'potatoes', 'bread'], // Don't triple carbs
            'soup': ['rice', 'pasta'] // Keep soup meals simple
        }
    };

    // UPDATED: Smart ingredient selection with enhanced logic
    const selectBestIngredient = (availableItems, category, existingComponents, templateId) => {
        if (!availableItems || availableItems.length === 0) return null;

        // If only one option, use it
        if (availableItems.length === 1) return availableItems[0];

        // Get existing component items for pairing logic
        const existingItems = existingComponents.map(comp => comp.item?.name.toLowerCase()).filter(Boolean);

        // Special logic for different categories
        switch (category) {
            case 'protein':
                // Prefer whole proteins over processed for main meals
                const wholeProteins = availableItems.filter(item =>
                    ['chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'steak'].some(protein =>
                        item.name.toLowerCase().includes(protein)
                    )
                );
                if (wholeProteins.length > 0) return wholeProteins[0];
                break;

            case 'starch':
                // Check if we have a protein to pair with
                const protein = existingItems.find(item =>
                    Object.keys(culinaryPairings.proteinStarchPairs).some(p => item.includes(p))
                );
                if (protein) {
                    const proteinKey = Object.keys(culinaryPairings.proteinStarchPairs).find(p => protein.includes(p));
                    const goodStarches = culinaryPairings.proteinStarchPairs[proteinKey] || [];
                    const matchingStarch = availableItems.find(item =>
                        goodStarches.some(starch => item.name.toLowerCase().includes(starch))
                    );
                    if (matchingStarch) return matchingStarch;
                }
                break;

            case 'vegetable':
                // Pair vegetables with existing protein
                const existingProtein = existingItems.find(item =>
                    Object.keys(culinaryPairings.proteinVeggiePairs).some(p => item.includes(p))
                );
                if (existingProtein) {
                    const proteinKey = Object.keys(culinaryPairings.proteinVeggiePairs).find(p => existingProtein.includes(p));
                    const goodVeggies = culinaryPairings.proteinVeggiePairs[proteinKey] || [];
                    const matchingVeggie = availableItems.find(item =>
                        goodVeggies.some(veggie => item.name.toLowerCase().includes(veggie))
                    );
                    if (matchingVeggie) return matchingVeggie;
                }
                break;

            case 'sauce':
            case 'gravy':
                // Choose sauce/gravy based on meal type and existing ingredients
                const mealBase = existingItems.find(item =>
                    ['pasta', 'rice', 'chicken', 'beef', 'pork', 'turkey'].some(base => item.includes(base))
                );
                if (mealBase) {
                    const baseKey = ['pasta', 'rice', 'chicken', 'beef', 'pork', 'turkey'].find(base => mealBase.includes(base));
                    const goodSauces = culinaryPairings.saucePairings[baseKey] || [];
                    const matchingSauce = availableItems.find(item =>
                        goodSauces.some(sauce => item.name.toLowerCase().includes(sauce))
                    );
                    if (matchingSauce) return matchingSauce;
                }
                break;

            case 'convenience':
                // Prefer complete meals over components
                const completeMeals = availableItems.filter(item =>
                    ['pizza', 'hamburger helper', 'mac and cheese', 'frozen meal', 'lasagna', 'stroganoff'].some(meal =>
                        item.name.toLowerCase().includes(meal)
                    )
                );
                if (completeMeals.length > 0) return completeMeals[0];
                break;
        }

        // Default: return first available item
        return availableItems[0];
    };

    // UPDATED: Enhanced combination validation
    const validateCombination = (components, templateId) => {
        const itemNames = components
            .filter(comp => comp.item)
            .map(comp => comp.item.name.toLowerCase());

        // Check for avoided combinations
        const avoidList = culinaryPairings.avoidCombinations[templateId] || [];
        const hasConflict = avoidList.some(avoid =>
            itemNames.some(item => item.includes(avoid))
        );

        if (hasConflict) return false;

        // Additional specific checks
        switch (templateId) {
            case 'sandwich':
                // Sandwiches shouldn't have soup as main ingredient
                if (itemNames.some(item => item.includes('soup'))) return false;
                break;

            case 'pasta':
                // Pasta meals should make sense
                if (itemNames.some(item => item.includes('hot dog bun'))) return false;
                break;

            case 'convenience':
                // Make sure we actually have convenience items
                const hasConvenienceItem = components.some(comp =>
                    comp.category === 'convenience' && comp.item
                );
                if (!hasConvenienceItem) return false;
                break;
        }

        return true;
    };

    // UPDATED: Generate a meal suggestion from a template with enhanced logic
    const generateMealFromTemplate = (template, categorizedInventory) => {
        const components = [];
        let canMake = true;
        let isComplete = true;

        // Check required categories with smart selection
        for (const category of template.requiredCategories) {
            const availableItems = categorizedInventory[category] || [];
            if (availableItems.length > 0) {
                const selectedItem = selectBestIngredient(availableItems, category, components, template.id);
                if (selectedItem) {
                    components.push({
                        category,
                        item: selectedItem,
                        required: true
                    });
                } else {
                    canMake = false;
                    isComplete = false;
                }
            } else {
                canMake = false;
                isComplete = false;
                components.push({
                    category,
                    item: null,
                    required: true
                });
            }
        }

        // Add optional categories if available and they make sense
        for (const category of template.optionalCategories || []) {
            const availableItems = categorizedInventory[category] || [];
            if (availableItems.length > 0) {
                const selectedItem = selectBestIngredient(availableItems, category, components, template.id);
                if (selectedItem) {
                    components.push({
                        category,
                        item: selectedItem,
                        required: false
                    });
                }
            }
        }

        if (!canMake) return null;

        // Validate the combination makes culinary sense
        if (!validateCombination(components, template.id)) {
            return null;
        }

        return {
            id: template.id,
            template,
            components,
            canMake,
            isComplete,
            estimatedTime: getEstimatedMealTime(template.id)
        };
    };

    // UPDATED: Get estimated preparation time for meal types
    const getEstimatedMealTime = (templateId) => {
        const timings = {
            'protein-starch-vegetable': 45,
            'pasta-meal': 25,
            'sandwich-meal': 10,
            'rice-bowl': 30,
            'convenience-meal': 15,
            'soup-meal': 20
        };
        return timings[templateId] || 30;
    };

    // UPDATED: Enhanced natural meal naming
    const formatMealName = (suggestion) => {
        const mainComponents = suggestion.components
            .filter(comp => comp.item && comp.required);

        const optionalComponents = suggestion.components
            .filter(comp => comp.item && !comp.required);

        // Special naming for different meal types
        switch (suggestion.template.id) {
            case 'convenience-meal':
                // For convenience meals, use the main item name
                const conveniences = mainComponents.filter(comp => comp.category === 'convenience');
                if (conveniences.length > 0) {
                    const mainItem = conveniences[0].item.name;
                    const convenienceProtein = optionalComponents.find(comp => comp.category === 'protein');
                    if (convenienceProtein && mainItem.toLowerCase().includes('helper')) {
                        return `${mainItem} with ${convenienceProtein.item.name}`;
                    }
                    return mainItem;
                }
                break;

            case 'pasta-meal':
                const pasta = mainComponents.find(comp => comp.category === 'pasta');
                const sauce = optionalComponents.find(comp => comp.category === 'sauce');
                const pastaProtein = optionalComponents.find(comp => comp.category === 'protein');

                if (pasta) {
                    let name = pasta.item.name;
                    if (sauce) {
                        // Make sauce names more natural
                        const sauceName = sauce.item.name.toLowerCase().includes('sauce')
                            ? sauce.item.name.replace(/sauce$/i, '').trim()
                            : sauce.item.name;
                        name += ` with ${sauceName}`;
                    }
                    if (pastaProtein) {
                        name += ` and ${pastaProtein.item.name}`;
                    }
                    return name;
                }
                break;

            case 'sandwich-meal':
                const bread = mainComponents.find(comp => comp.category === 'bread');
                const sandwichProtein = optionalComponents.find(comp => comp.category === 'protein');

                if (bread && sandwichProtein) {
                    const breadType = bread.item.name.toLowerCase().includes('bun') ? 'Sandwich' : bread.item.name;
                    return `${sandwichProtein.item.name} ${breadType}`;
                }
                if (bread) {
                    return `${bread.item.name} Sandwich`;
                }
                break;

            case 'rice-bowl':
                const rice = mainComponents.find(comp => comp.category === 'rice');
                const bowlProtein = optionalComponents.find(comp => comp.category === 'protein');
                const bowlSauce = optionalComponents.find(comp => comp.category === 'sauce');

                let bowlName = 'Rice Bowl';
                if (bowlProtein) {
                    bowlName = `${bowlProtein.item.name} Rice Bowl`;
                }
                if (bowlSauce && bowlSauce.item.name.toLowerCase().includes('teriyaki')) {
                    bowlName = bowlName.replace('Rice Bowl', 'Teriyaki Bowl');
                }
                return bowlName;

            case 'soup-meal':
                const soup = mainComponents.find(comp => comp.category === 'soup');
                const soupBread = optionalComponents.find(comp => comp.category === 'bread');

                if (soup) {
                    let soupName = soup.item.name;
                    if (soupBread && soupBread.item.name.toLowerCase().includes('bread')) {
                        soupName += ' with Bread';
                    }
                    return soupName;
                }
                break;

            case 'protein-starch-vegetable':
                const mealProtein = mainComponents.find(comp => comp.category === 'protein');
                const starch = mainComponents.find(comp => comp.category === 'starch');
                const vegetable = mainComponents.find(comp => comp.category === 'vegetable');
                const gravy = optionalComponents.find(comp => comp.category === 'gravy');

                const parts = [];
                if (mealProtein) parts.push(mealProtein.item.name);
                if (starch) parts.push(starch.item.name);
                if (vegetable) parts.push(vegetable.item.name);

                let mealName = '';
                if (parts.length === 3) {
                    mealName = `${parts[0]} with ${parts[1]} and ${parts[2]}`;
                } else if (parts.length === 2) {
                    mealName = `${parts[0]} with ${parts[1]}`;
                } else {
                    mealName = parts[0] || 'Balanced Meal';
                }

                // Add gravy if available
                if (gravy) {
                    mealName += ` with ${gravy.item.name}`;
                }

                return mealName;
        }

        // Fallback to component list for other cases
        const allComponents = [...mainComponents, ...optionalComponents.slice(0, 2)]
            .map(comp => comp.item.name);

        if (allComponents.length === 1) {
            return allComponents[0];
        } else if (allComponents.length === 2) {
            return allComponents.join(' with ');
        } else {
            return `${allComponents.slice(0, -1).join(', ')} and ${allComponents.slice(-1)}`;
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [inventoryResponse, recipesResponse] = await Promise.all([
                fetch('/api/inventory'),
                fetch('/api/recipes')
            ]);

            const inventoryData = await inventoryResponse.json();
            const recipesData = await recipesResponse.json();

            if (inventoryData.success) {
                setInventory(inventoryData.inventory);
                console.log('Loaded inventory items:', inventoryData.inventory.map(item => ({
                    name: item.name,
                    category: item.category,
                    quantity: item.quantity
                })));
            }

            if (recipesData.success) {
                setRecipes(recipesData.recipes);
                console.log('Loaded recipes:', recipesData.recipes.map(r => ({
                    title: r.title,
                    ingredientCount: r.ingredients?.length || 0
                })));
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRecipeDetails = async (recipeId) => {
        setLoadingRecipe(true);
        try {
            const response = await fetch(`/api/recipes/${recipeId}`);
            const data = await response.json();

            if (data.success) {
                setShowRecipeModal(data.recipe);
            } else {
                console.error('Failed to load recipe details');
            }
        } catch (error) {
            console.error('Error loading recipe details:', error);
        } finally {
            setLoadingRecipe(false);
        }
    };

    const generateSuggestions = () => {
        console.log('=== GENERATING RECIPE SUGGESTIONS ===');
        console.log('Inventory count:', inventory.length);
        console.log('Recipe count:', recipes.length);
        console.log('Match threshold:', matchThreshold);

        const suggestions = recipes
            .map(recipe => {
                const analysis = analyzeRecipe(recipe, inventory);
                return {
                    ...recipe,
                    analysis
                };
            })
            .filter(recipe => recipe.analysis.matchPercentage >= matchThreshold)
            .sort((a, b) => {
                switch (sortBy) {
                    case 'match':
                        return b.analysis.matchPercentage - a.analysis.matchPercentage;
                    case 'time':
                        const timeA = (a.prepTime || 0) + (a.cookTime || 0);
                        const timeB = (b.prepTime || 0) + (b.cookTime || 0);
                        return timeA - timeB;
                    case 'difficulty':
                        const difficultyOrder = {easy: 1, medium: 2, hard: 3};
                        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
                    default:
                        return b.analysis.matchPercentage - a.analysis.matchPercentage;
                }
            });

        console.log('Generated recipe suggestions:', suggestions.length);
        setSuggestions(suggestions);
    };

    const analyzeRecipe = (recipe, inventory) => {
        console.log(`\n=== ANALYZING RECIPE: ${recipe.title} ===`);

        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            console.log('Recipe has no ingredients');
            return {
                matchPercentage: 0,
                availableIngredients: [],
                missingIngredients: [],
                canMake: false
            };
        }

        console.log('Recipe ingredients:', recipe.ingredients.map(ing => ing.name));

        const availableIngredients = [];
        const missingIngredients = [];

        recipe.ingredients.forEach(recipeIngredient => {
            const matchResult = findIngredientInInventory(recipeIngredient, inventory);

            if (matchResult.found) {
                availableIngredients.push({
                    ...recipeIngredient,
                    inventoryItem: matchResult.inventoryItem,
                    matchType: matchResult.matchType
                });
            } else {
                missingIngredients.push(recipeIngredient);
            }
        });

        const totalIngredients = recipe.ingredients.length;
        const optionalCount = recipe.ingredients.filter(ing => ing.optional).length;
        const requiredIngredients = totalIngredients - optionalCount;
        const availableRequired = availableIngredients.filter(ing => !ing.optional).length;

        const matchPercentage = totalIngredients > 0 ? (availableIngredients.length / totalIngredients) : 0;
        const canMake = availableRequired >= requiredIngredients;

        console.log(`Results: ${availableIngredients.length}/${totalIngredients} ingredients (${Math.round(matchPercentage * 100)}%)`);

        return {
            matchPercentage,
            availableIngredients,
            missingIngredients,
            canMake,
            requiredMissing: missingIngredients.filter(ing => !ing.optional).length
        };
    };

    // Normalize ingredient names for better comparison
    const normalizeIngredientName = (name) => {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
            .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
            .replace(/\b(fresh|dried|minced|chopped|sliced|diced|whole|ground|crushed|grated|shredded|cooked|raw)\b/g, '')
            .replace(/\b(small|medium|large|extra)\b/g, '')
            .replace(/\b(can|jar|bottle|bag|box|package|container)\b/g, '')
            .replace(/\b(of|the|and|or)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // Much more conservative ingredient matching
    const findIngredientInInventory = (recipeIngredient, inventory) => {
        const recipeName = normalizeIngredientName(recipeIngredient.name);

        console.log(`\n--- Looking for: "${recipeIngredient.name}" (normalized: "${recipeName}") ---`);

        // 1. EXACT MATCH (highest priority)
        for (const item of inventory) {
            const itemName = normalizeIngredientName(item.name);
            if (itemName === recipeName && recipeName.length > 2) {
                console.log(`✅ EXACT MATCH: "${item.name}"`);
                return {
                    found: true,
                    inventoryItem: item,
                    matchType: 'exact'
                };
            }
        }

        // 2. EXACT INGREDIENT VARIATIONS (very specific)
        const specificVariations = {
            // Only very specific, well-defined variations
            'olive oil': ['extra virgin olive oil', 'virgin olive oil', 'evoo'],
            'garlic': ['garlic cloves', 'garlic bulb'],
            'onion': ['yellow onion', 'white onion', 'red onion', 'sweet onion'],
            'tomato': ['roma tomato', 'cherry tomato', 'grape tomato', 'beefsteak tomato'],
            'cheese': ['cheddar cheese', 'mozzarella cheese', 'parmesan cheese'],
            'milk': ['whole milk', '2% milk', 'skim milk', '1% milk'],
            'butter': ['unsalted butter', 'salted butter'],
            'flour': ['all purpose flour', 'bread flour', 'cake flour'],
            'sugar': ['white sugar', 'granulated sugar', 'brown sugar'],
            'salt': ['table salt', 'sea salt', 'kosher salt'],
            'pepper': ['black pepper', 'white pepper', 'ground pepper'],
            'pasta': ['penne', 'spaghetti', 'macaroni', 'fettuccine', 'rigatoni'],
            // Add bell pepper variations
            'bell pepper': ['red bell pepper', 'green bell pepper', 'yellow bell pepper'],
            'red bell pepper': ['bell pepper'],
            'green bell pepper': ['bell pepper'],
            'yellow bell pepper': ['bell pepper']
        };

        // Check if recipe ingredient matches any specific variation
        for (const [baseIngredient, variations] of Object.entries(specificVariations)) {
            // Check if recipe ingredient is the base or a variation
            if (recipeName === baseIngredient || variations.some(v => normalizeIngredientName(v) === recipeName)) {
                // Look for base or any variation in inventory
                for (const item of inventory) {
                    const itemName = normalizeIngredientName(item.name);
                    if (itemName === baseIngredient || variations.some(v => normalizeIngredientName(v) === itemName)) {
                        console.log(`✅ VARIATION MATCH: "${item.name}" matches "${recipeIngredient.name}" via ${baseIngredient}`);
                        return {
                            found: true,
                            inventoryItem: item,
                            matchType: 'variation'
                        };
                    }
                }
            }
        }

        // 3. CONSERVATIVE PARTIAL MATCH (only for longer ingredient names)
        if (recipeName.length >= 5) { // Only for longer ingredient names
            for (const item of inventory) {
                const itemName = normalizeIngredientName(item.name);

                // Both must be reasonably long and one must contain the other as a significant portion
                if (itemName.length >= 4 &&
                    (itemName.includes(recipeName) || recipeName.includes(itemName))) {

                    // Additional validation: the contained part must be at least 50% of the longer string
                    const shorterLength = Math.min(itemName.length, recipeName.length);
                    const longerLength = Math.max(itemName.length, recipeName.length);

                    if (shorterLength / longerLength >= 0.6) {
                        console.log(`✅ CONSERVATIVE PARTIAL MATCH: "${item.name}" <-> "${recipeIngredient.name}"`);
                        return {
                            found: true,
                            inventoryItem: item,
                            matchType: 'partial'
                        };
                    }
                }
            }
        }

        // 4. CHECK ALTERNATIVES (if recipe provides them)
        if (recipeIngredient.alternatives && recipeIngredient.alternatives.length > 0) {
            for (const alternative of recipeIngredient.alternatives) {
                const altNormalized = normalizeIngredientName(alternative);
                for (const item of inventory) {
                    const itemName = normalizeIngredientName(item.name);
                    if (itemName === altNormalized) {
                        console.log(`✅ ALTERNATIVE MATCH: "${item.name}" matches alternative "${alternative}"`);
                        return {
                            found: true,
                            inventoryItem: item,
                            matchType: 'alternative'
                        };
                    }
                }
            }
        }

        console.log(`❌ NO MATCH found for: "${recipeIngredient.name}"`);
        return {
            found: false,
            inventoryItem: null,
            matchType: null
        };
    };

    const getMatchColor = (percentage) => {
        if (percentage >= 0.9) return 'text-green-600 bg-green-100';
        if (percentage >= 0.7) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getDifficultyIcon = (difficulty) => {
        switch (difficulty) {
            case 'easy':
                return '🟢';
            case 'medium':
                return '🟡';
            case 'hard':
                return '🔴';
            default:
                return '⚪';
        }
    };

    const getDifficultyColor = (difficulty) => {
        const colors = {
            easy: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            hard: 'bg-red-100 text-red-800'
        };
        return colors[difficulty] || colors.medium;
    };

    const formatCookTime = (minutes) => {
        if (!minutes) return 'Not specified';
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">What Can I Make?</h1>
                        <p className="text-gray-600">Recipe suggestions and simple meal ideas based on your inventory</p>
                    </div>
                    <div>
                        <TouchEnhancedButton
                            onClick={loadData}
                            disabled={loading}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100"
                        >
                            {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Stats and Controls */}
                <div className="bg-white shadow rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                            <div className="text-sm font-medium text-gray-700">Inventory Items</div>
                            <div className="text-2xl font-bold text-indigo-600">{inventory.length}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-700">Total Recipes</div>
                            <div className="text-2xl font-bold text-green-600">{recipes.length}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Minimum Match: {Math.round(matchThreshold * 100)}%
                            </label>
                            <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.1"
                                value={matchThreshold}
                                onChange={(e) => setMatchThreshold(parseFloat(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="match">Best Match</option>
                                <option value="time">Quickest</option>
                                <option value="difficulty">Easiest</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white shadow rounded-lg">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <TouchEnhancedButton
                                onClick={() => setActiveTab('simple')}
                                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                                    activeTab === 'simple'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                🍽️ Simple Meals (alpha version) ({simpleMealSuggestions.length})
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => setActiveTab('recipes')}
                                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                                    activeTab === 'recipes'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                📖 Recipe Matches ({suggestions.length})
                            </TouchEnhancedButton>
                        </nav>
                    </div>

                    <div className="px-4 py-5 sm:p-6">
                        {/* Simple Meal Suggestions */}
                        {activeTab === 'simple' && (
                            <div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    Simple Meal Ideas ({simpleMealSuggestions.length}) <strong>[This functionality is still being refined]</strong>
                                </h3>

                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500">Analyzing your inventory...</div>
                                    </div>
                                ) : inventory.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500 mb-4">No inventory items found</div>
                                        <a
                                            href="/inventory"
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                                        >
                                            Add inventory items first
                                        </a>
                                    </div>
                                ) : simpleMealSuggestions.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500 mb-4">
                                            No simple meals can be made with your current inventory
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            Try adding basic ingredients like proteins, starches, or vegetables
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {simpleMealSuggestions.map((suggestion, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-3 mb-2">
                                                            <span className="text-2xl">{suggestion.template.icon}</span>
                                                            <h4 className="text-xl font-semibold text-gray-900">
                                                                {formatMealName(suggestion)}
                                                            </h4>
                                                        </div>
                                                        <p className="text-gray-600 mb-2">{suggestion.template.description}</p>
                                                        <div className="text-sm text-gray-500">
                                                            Estimated prep time: {suggestion.estimatedTime} minutes
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end space-y-2">
                                                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                                            ✅ Ready to Make
                                                        </div>
                                                        {suggestion.isComplete && (
                                                            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                                                                Complete Meal
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Required Components */}
                                                    <div>
                                                        <h5 className="font-medium text-green-700 mb-3">
                                                            🎯 Main Components
                                                        </h5>
                                                        <div className="space-y-2">
                                                            {suggestion.components
                                                                .filter(comp => comp.required && comp.item)
                                                                .map((component, idx) => (
                                                                    <div key={idx} className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-green-200">
                                                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                                        <div className="flex-1">
                                                                            <div className="font-medium text-gray-900">
                                                                                {component.item.name}
                                                                            </div>
                                                                            <div className="text-sm text-gray-500 capitalize">
                                                                                {component.category.replace('_', ' ')}
                                                                                {component.item.quantity && ` • ${component.item.quantity} available`}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>

                                                    {/* Optional Components */}
                                                    <div>
                                                        <h5 className="font-medium text-blue-700 mb-3">
                                                            ➕ Optional Additions
                                                        </h5>
                                                        <div className="space-y-2">
                                                            {suggestion.components
                                                                .filter(comp => !comp.required && comp.item)
                                                                .map((component, idx) => (
                                                                    <div key={idx} className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-blue-200">
                                                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                                                        <div className="flex-1">
                                                                            <div className="font-medium text-gray-900">
                                                                                {component.item.name}
                                                                            </div>
                                                                            <div className="text-sm text-gray-500 capitalize">
                                                                                {component.category.replace('_', ' ')}
                                                                                {component.item.quantity && ` • ${component.item.quantity} available`}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            {suggestion.components.filter(comp => !comp.required && comp.item).length === 0 && (
                                                                <div className="text-gray-500 text-sm italic p-3">
                                                                    No optional ingredients available
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Simple Cooking Tips */}
                                                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <div className="flex items-start space-x-2">
                                                        <span className="text-yellow-600 mt-0.5">💡</span>
                                                        <div>
                                                            <div className="font-medium text-yellow-800 text-sm">Quick Tip:</div>
                                                            <div className="text-yellow-700 text-sm">
                                                                {getSimpleCookingTip(suggestion.template.id)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Recipe Suggestions */}
                        {activeTab === 'recipes' && (
                            <div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    Recipe Suggestions ({suggestions.length})
                                </h3>

                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500">Analyzing your inventory...</div>
                                    </div>
                                ) : inventory.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500 mb-4">No inventory items found</div>
                                        <a
                                            href="/inventory"
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                                        >
                                            Add inventory items first
                                        </a>
                                    </div>
                                ) : recipes.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500 mb-4">No recipes found</div>
                                        <a
                                            href="/recipes"
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                                        >
                                            Add recipes first
                                        </a>
                                    </div>
                                ) : suggestions.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500 mb-4">
                                            No recipes match your current inventory at {Math.round(matchThreshold * 100)}%
                                            threshold
                                        </div>
                                        <TouchEnhancedButton
                                            onClick={() => setMatchThreshold(0.1)}
                                            className="text-indigo-600 hover:text-indigo-900 text-sm"
                                        >
                                            Try lowering the match threshold to 10%
                                        </TouchEnhancedButton>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {suggestions.map((recipe) => (
                                            <div key={recipe._id} className="border border-gray-200 rounded-lg p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex-1">
                                                        <h4 className="text-xl font-semibold text-gray-900">{recipe.title}</h4>
                                                        {recipe.description && (
                                                            <p className="text-gray-600 mt-1">{recipe.description}</p>
                                                        )}
                                                    </div>
                                                    <div
                                                        className={`px-3 py-1 rounded-full text-sm font-medium ${getMatchColor(recipe.analysis.matchPercentage)}`}>
                                                        {Math.round(recipe.analysis.matchPercentage * 100)}% Match
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    {/* Recipe Info */}
                                                    <div>
                                                        <h5 className="font-medium text-gray-900 mb-2">Recipe Details</h5>
                                                        <div className="space-y-1 text-sm text-gray-600">
                                                            <div className="flex items-center space-x-2">
                                                                <span>{getDifficultyIcon(recipe.difficulty)}</span>
                                                                <span className="capitalize">{recipe.difficulty}</span>
                                                            </div>
                                                            {recipe.prepTime && (
                                                                <div>Prep: {recipe.prepTime} minutes</div>
                                                            )}
                                                            {recipe.cookTime && (
                                                                <div>Cook: {recipe.cookTime} minutes</div>
                                                            )}
                                                            {recipe.servings && (
                                                                <div>Serves: {recipe.servings}</div>
                                                            )}
                                                            {recipe.source && (
                                                                <div className="text-xs">Source: {recipe.source}</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Available Ingredients */}
                                                    <div>
                                                        <h5 className="font-medium text-green-700 mb-2">
                                                            ✅ You Have ({recipe.analysis.availableIngredients.length})
                                                        </h5>
                                                        <div className="space-y-1 text-sm">
                                                            {recipe.analysis.availableIngredients.slice(0, 5).map((ingredient, index) => (
                                                                <div key={index} className="text-green-600">
                                                                    • {ingredient.amount} {ingredient.unit} {ingredient.name}
                                                                    {ingredient.optional &&
                                                                        <span className="text-gray-500"> (optional)</span>}
                                                                </div>
                                                            ))}
                                                            {recipe.analysis.availableIngredients.length > 5 && (
                                                                <div className="text-green-600 text-xs">
                                                                    +{recipe.analysis.availableIngredients.length - 5} more
                                                                    available
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Missing Ingredients */}
                                                    <div>
                                                        <h5 className="font-medium text-red-700 mb-2">
                                                            ❌ You Need ({recipe.analysis.missingIngredients.length})
                                                        </h5>
                                                        <div className="space-y-1 text-sm">
                                                            {recipe.analysis.missingIngredients.slice(0, 5).map((ingredient, index) => (
                                                                <div key={index} className="text-red-600">
                                                                    • {ingredient.amount} {ingredient.unit} {ingredient.name}
                                                                    {ingredient.optional &&
                                                                        <span className="text-gray-500"> (optional)</span>}
                                                                </div>
                                                            ))}
                                                            {recipe.analysis.missingIngredients.length > 5 && (
                                                                <div className="text-red-600 text-xs">
                                                                    +{recipe.analysis.missingIngredients.length - 5} more needed
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="mt-4 flex justify-between items-center">
                                                    <div className="text-sm text-gray-500">
                                                        {recipe.analysis.canMake ? (
                                                            <span className="text-green-600 font-medium">
                                                                🎉 You can make this recipe!
                                                            </span>
                                                        ) : recipe.analysis.requiredMissing === 1 ? (
                                                            <span className="text-yellow-600 font-medium">
                                                                Missing only 1 required ingredient
                                                            </span>
                                                        ) : (
                                                            <span className="text-red-600">
                                                                Missing {recipe.analysis.requiredMissing} required ingredients
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <TouchEnhancedButton
                                                            onClick={() => loadRecipeDetails(recipe._id)}
                                                            disabled={loadingRecipe}
                                                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                                                        >
                                                            {loadingRecipe ? 'Loading...' : 'View Recipe'}
                                                        </TouchEnhancedButton>
                                                        {!recipe.analysis.canMake && (
                                                            <TouchEnhancedButton
                                                                onClick={() => setShowShoppingList({
                                                                    recipeId: recipe._id,
                                                                    recipeName: recipe.title
                                                                })}
                                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                            >
                                                                Shopping List
                                                            </TouchEnhancedButton>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recipe Modal */}
                {showRecipeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-gray-900">{showRecipeModal.title}</h2>
                                <TouchEnhancedButton
                                    onClick={() => setShowRecipeModal(null)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>

                            {/* Modal Content */}
                            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
                                {/* Recipe Meta */}
                                <div className="mb-6">
                                    {showRecipeModal.description && (
                                        <p className="text-gray-600 mb-4">{showRecipeModal.description}</p>
                                    )}

                                    <div className="flex flex-wrap items-center space-x-4 text-sm text-gray-600 mb-4">
                                        {showRecipeModal.prepTime && (
                                            <span>Prep: {formatCookTime(showRecipeModal.prepTime)}</span>
                                        )}
                                        {showRecipeModal.cookTime && (
                                            <span>Cook: {formatCookTime(showRecipeModal.cookTime)}</span>
                                        )}
                                        {showRecipeModal.servings && (
                                            <span>Serves: {showRecipeModal.servings}</span>
                                        )}
                                        {showRecipeModal.difficulty && (
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(showRecipeModal.difficulty)}`}>
                                                {showRecipeModal.difficulty}
                                            </span>
                                        )}
                                    </div>

                                    {showRecipeModal.tags && showRecipeModal.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {showRecipeModal.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Ingredients */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingredients</h3>
                                        <ul className="space-y-2">
                                            {showRecipeModal.ingredients?.map((ingredient, index) => (
                                                <li key={index} className="flex items-start space-x-4">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-gray-700">
                                                        {ingredient.amount && (
                                                            <span className="font-medium">
                                                                {ingredient.amount}
                                                                {ingredient.unit && ` ${ingredient.unit}`}{' '}
                                                            </span>
                                                        )}
                                                        {ingredient.name}
                                                        {ingredient.optional && (
                                                            <span className="text-gray-500 text-sm"> (optional)</span>
                                                        )}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Instructions */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
                                        <ol className="space-y-4">
                                            {showRecipeModal.instructions?.map((instruction, index) => (
                                                <li key={index} className="flex items-start space-x-4">
                                                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                                        {index + 1}
                                                    </span>
                                                    <p className="text-gray-700 leading-relaxed">{instruction}</p>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>

                                {/* Recipe Info */}
                                {showRecipeModal.source && (
                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <div className="text-sm text-gray-500">
                                            <span className="font-medium">Source:</span> {showRecipeModal.source}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                                <div className="text-sm text-gray-500">
                                    {showRecipeModal.isPublic ? '🌍 Public Recipe' : '🔒 Private Recipe'}
                                </div>
                                <div className="flex space-x-2">
                                    <a
                                        href={`/recipes/${showRecipeModal._id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Open Full Page
                                    </a>
                                    <TouchEnhancedButton
                                        onClick={() => window.print()}
                                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Print
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        onClick={() => setShowRecipeModal(null)}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Close
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Shopping List Modal */}
                {showShoppingList && (
                    <RecipeShoppingList
                        recipeId={showShoppingList.recipeId}
                        recipeName={showShoppingList.recipeName}
                        onClose={() => setShowShoppingList(null)}
                    />
                )}
                <Footer />
            </div>
        </MobileOptimizedLayout>
    );

    // Helper function for cooking tips
    function getSimpleCookingTip(templateId) {
        const tips = {
            'protein-starch-vegetable': 'Start with the protein, then add your starch. Cook vegetables until tender-crisp for best nutrition. Add gravy at the end.',
            'pasta-meal': 'Cook pasta until al dente. Save some pasta water to help bind sauces.',
            'sandwich-meal': 'Toast bread lightly for better texture. Layer ingredients thoughtfully for balanced flavors.',
            'rice-bowl': 'Rinse rice before cooking. Let it rest 5 minutes after cooking for fluffier texture.',
            'convenience-meal': 'Follow package directions but consider adding fresh vegetables or protein for extra nutrition.',
            'soup-meal': 'Heat soup gently and taste for seasoning. Pair with crusty bread for a complete meal.'
        };
        return tips[templateId] || 'Enjoy your homemade meal!';
    }
}