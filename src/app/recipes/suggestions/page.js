// file: /src/app/recipes/suggestions/page.js v6 - Enhanced brand-aware categorization and improved meal suggestions

'use client';

import {useSession} from 'next-auth/react';
import {useEffect, useState} from 'react';
import RecipeShoppingList from '@/components/recipes/RecipeShoppingList';
import {redirect} from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { getApiUrl } from '@/lib/api-config';

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
    const [selectedCategory, setSelectedCategory] = useState('all');


    // UPDATED: Meal templates with new convenience protein categories
    const mealTemplates = [
        {
            id: 'protein-starch-vegetable',
            name: 'Protein + Starch + Vegetable',
            description: 'Classic balanced meal',
            icon: '🍽️',
            requiredCategories: ['protein', 'starch', 'vegetable'],
            optionalCategories: ['sauce', 'gravy'],
            examples: ['Steak + Mashed Potatoes + Broccoli', 'Chicken + Rice + Green Beans']
        },
        {
            id: 'helper-meal',
            name: 'Helper Meal',
            description: 'Boxed meal kit with required protein',
            icon: '📦',
            requiredCategories: ['helper_meal'],
            optionalCategories: ['vegetable'],
            examples: ['Hamburger Helper + Ground Beef', 'Tuna Helper + Tuna']
        },
        {
            id: 'hamburger-meal',
            name: 'Hamburger/Sandwich',
            description: 'Hamburger patties with hamburger buns',
            icon: '🍔',
            requiredCategories: ['hamburger_patties', 'hamburger_buns'],
            optionalCategories: ['cheese', 'vegetable', 'condiment'],
            examples: ['Hamburger Patties + Hamburger Buns + Cheese']
        },
        {
            id: 'chicken-patty-meal',
            name: 'Chicken Sandwich',
            description: 'Chicken patties with hamburger buns',
            icon: '🥪',
            requiredCategories: ['chicken_patties', 'hamburger_buns'],
            optionalCategories: ['cheese', 'vegetable', 'condiment'],
            examples: ['Chicken Patties + Hamburger Buns + Lettuce']
        },
        {
            id: 'hot-dog-meal',
            name: 'Hot Dog/Sausage',
            description: 'Hot dogs, brats, or sausages with hot dog buns',
            icon: '🌭',
            requiredCategories: ['hot_dog_proteins', 'hot_dog_buns'],
            optionalCategories: ['condiment', 'vegetable'],
            examples: ['Hot Dogs + Hot Dog Buns + Mustard']
        },
        {
            id: 'chicken-nuggets-meal',
            name: 'Chicken Nuggets',
            description: 'Standalone chicken nuggets',
            icon: '🍗',
            requiredCategories: ['chicken_nuggets'],
            optionalCategories: ['condiment', 'vegetable'],
            examples: ['Chicken Nuggets + Barbecue Sauce']
        },
        {
            id: 'pasta-meal',
            name: 'Pasta Dish',
            description: 'Pasta-based meal',
            icon: '🍝',
            requiredCategories: ['pasta', 'sauce'],
            optionalCategories: ['protein', 'vegetable', 'cheese'],
            examples: ['Spaghetti + Marinara + Parmesan', 'Penne + Chicken + Broccoli']
        },
        {
            id: 'sandwich-meal',
            name: 'Sandwich/Wrap',
            description: 'Bread-based meal',
            icon: '🥪',
            requiredCategories: ['bread', 'protein'],
            optionalCategories: ['vegetable', 'cheese', 'condiment'],
            examples: ['Turkey Sandwich + Lettuce + Tomato', 'Grilled Cheese + Tomato Soup']
        },
        {
            id: 'rice-bowl',
            name: 'Rice Bowl',
            description: 'Rice-based bowl',
            icon: '🍚',
            requiredCategories: ['rice', 'protein'],
            optionalCategories: ['vegetable', 'sauce'],
            examples: ['Chicken Teriyaki Bowl', 'Beef and Broccoli Rice']
        },
        {
            id: 'standalone-convenience',
            name: 'Ready-to-Eat Meal',
            description: 'Complete prepared items',
            icon: '⚡',
            requiredCategories: ['standalone_convenience'],
            optionalCategories: ['vegetable'],
            examples: ['Frozen Pizza', 'Ramen Noodles', 'Instant Mac & Cheese']
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

    const recipeCategories = [
        {value: 'all', label: 'All Categories'},
        {value: 'seasonings', label: 'Seasonings'},
        {value: 'sauces', label: 'Sauces'},
        {value: 'salad-dressings', label: 'Salad Dressings'},
        {value: 'marinades', label: 'Marinades'},
        {value: 'ingredients', label: 'Basic Ingredients'},
        {value: 'entrees', label: 'Entrees'},
        {value: 'side-dishes', label: 'Side Dishes'},
        {value: 'soups', label: 'Soups'},
        {value: 'sandwiches', label: 'Sandwiches'},
        {value: 'appetizers', label: 'Appetizers'},
        {value: 'desserts', label: 'Desserts'},
        {value: 'breads', label: 'Breads'},
        {value: 'pizza-dough', label: 'Pizza Dough'},
        {value: 'specialty-items', label: 'Specialty Items'},
        {value: 'beverages', label: 'Beverages'},
        {value: 'breakfast', label: 'Breakfast'}
    ];


    // FIXED: Much more precise brand-specific product definitions
    const brandSpecificProducts = {
        // Helper meals that require specific proteins - VERY STRICT PATTERNS
        helper_meals: {
            'hamburger helper': {
                requiredProtein: 'ground beef',
                brandPattern: /^hamburger\s*helper$/i,
                strictPattern: /hamburger\s+helper\s+(beef|stroganoff|cheeseburger|lasagna|cheesy|taco|italian)/i
            },
            'tuna helper': {
                requiredProtein: 'tuna',
                brandPattern: /^tuna\s*helper$/i,
                strictPattern: /tuna\s+helper\s+/i
            },
            'chicken helper': {
                requiredProtein: 'chicken',
                brandPattern: /^chicken\s*helper$/i,
                strictPattern: /chicken\s+helper\s+/i
            }
        },

        // NEW: Convenience proteins that need specific components
        convenience_proteins: {
            'hamburger patties': { requiredComponent: 'hamburger_buns', category: 'hamburger_patties' },
            'chicken patties': { requiredComponent: 'hamburger_buns', category: 'chicken_patties' },
            'chicken nuggets': { requiredComponent: null, category: 'chicken_nuggets' }, // standalone
            'white meat chicken nuggets': { requiredComponent: null, category: 'chicken_nuggets' }
        },

        // Standalone convenience items (complete meals)
        standalone_convenience: {
            patterns: [
                /^frozen\s+pizza$/i, /^pizza$/i, /^ramen$/i, /^instant\s+noodles$/i,
                /^mac\s+and\s+cheese$/i, /^kraft\s+dinner$/i, /^easy\s+mac$/i,
                /^hot\s+pockets$/i, /^lean\s+cuisine$/i, /^tv\s+dinner$/i,
                /^frozen\s+meal$/i, /^microwave\s+meal$/i, /^stouffer/i,
                /^healthy\s+choice$/i, /^smart\s+ones$/i
            ]
        }
    };

    // FIXED: Much more precise brand-aware item analysis
    const analyzeItemBrand = (item) => {
        // Handle both separate brand field (Option A) and combined name scenarios
        const brandName = item.brand ? item.brand.toLowerCase().trim() : '';
        const itemName = item.name.toLowerCase().trim();

        const result = {
            isHelperMeal: false,
            requiredProtein: null,
            isStandaloneConvenience: false,
            isConvenienceProtein: false,
            convenienceType: null,
            requiredComponent: null,
            originalCategory: null
        };

        console.log(`\n--- Brand Analysis for: "${item.name}" (Brand: "${item.brand || 'N/A'}") ---`);

        // Check for convenience proteins (patties and nuggets)
        for (const [convenienceType, convenienceInfo] of Object.entries(brandSpecificProducts.convenience_proteins)) {
            if (itemName.includes(convenienceType.toLowerCase()) ||
                itemName.includes(convenienceType.toLowerCase().replace(' ', ''))) {
                result.isConvenienceProtein = true;
                result.convenienceType = convenienceInfo.category;
                result.requiredComponent = convenienceInfo.requiredComponent;
                console.log(`✅ CONVENIENCE PROTEIN: "${item.name}" type: ${convenienceInfo.category} ${convenienceInfo.requiredComponent ? `(requires ${convenienceInfo.requiredComponent})` : '(standalone)'}`);
                return result;
            }
        }

        // STRICT Helper meal detection - only for actual helper products
        for (const [helperType, helperInfo] of Object.entries(brandSpecificProducts.helper_meals)) {
            let isMatch = false;

            // Check brand field first (more reliable for Option A structure)
            if (brandName && helperInfo.brandPattern && helperInfo.brandPattern.test(brandName)) {
                // Additional validation: make sure the item name suggests it's a meal kit
                if (itemName.includes('stroganoff') || itemName.includes('lasagna') ||
                    itemName.includes('cheeseburger') || itemName.includes('beef') ||
                    itemName.includes('chicken') || itemName.includes('tuna') ||
                    itemName.includes('shells') && brandName.includes('helper')) {
                    isMatch = true;
                }
            }
            // Fallback: very strict pattern matching for full names
            else if (helperInfo.strictPattern && helperInfo.strictPattern.test(`${brandName} ${itemName}`.trim())) {
                isMatch = true;
            }

            if (isMatch) {
                result.isHelperMeal = true;
                result.requiredProtein = helperInfo.requiredProtein;
                console.log(`✅ HELPER MEAL: "${item.name}" (${item.brand || 'Generic'}) requires ${helperInfo.requiredProtein}`);
                return result;
            }
        }

        // Check for standalone convenience items
        for (const pattern of brandSpecificProducts.standalone_convenience.patterns) {
            if (pattern.test(itemName) || pattern.test(`${brandName} ${itemName}`)) {
                result.isStandaloneConvenience = true;
                console.log(`✅ STANDALONE CONVENIENCE: "${item.name}"`);
                return result;
            }
        }

        console.log(`❌ No special brand categorization for: "${item.name}"`);
        return result;
    };

    // COMPLETELY REWRITTEN: Much more precise category mappings with exact matching
    const categoryMappings = {
        // Helper meals and standalone convenience are handled by brand analysis above
        helper_meal: [],
        standalone_convenience: [],

        // NEW: Convenience protein categories
        hamburger_patties: [],
        chicken_patties: [],
        chicken_nuggets: [],

        // PROTEINS - Exact and partial matching for meats (REMOVED patties, nuggets, and hot dogs)
        protein: {
            exact: [
                'eggs', 'stew meat', 'chicken wing', 'spareribs', 'ground beef', 'ribeye steak', 'new york steak',
                'pork chops', 'chicken breasts', 'cubed steaks', 'bacon', 'breakfast sausage',
                'turkey', 'ham', 'tofu', 'salmon', 'tuna', 'shrimp', 'fish'
            ],
            contains: [
                'chicken', 'beef', 'pork', 'turkey', 'steak', 'meat', 'loin', 'tenderloin', 'wing'
            ],
            excludes: ['patties', 'nuggets', 'hot dog', 'brat', 'sausage'] // Exclude convenience proteins
        },

        // NEW: Hot dog proteins (cylindrical proteins for hot dog buns)
        hot_dog_proteins: {
            exact: ['hot dogs', 'hot dog', 'bratwurst', 'brats', 'polish sausage', 'kielbasa'],
            contains: ['hot dog', 'brat', 'sausage'],
            excludes: ['breakfast sausage'] // Breakfast sausage is different
        },

        // PASTA - Very specific pasta matching
        pasta: {
            exact: [
                'pasta', 'spaghetti', 'penne', 'macaroni', 'fettuccine', 'rigatoni',
                'lasagna noodles', 'angel hair', 'linguine', 'farfalle', 'bow ties',
                'shell macaroni', 'shells', 'jumbo shells', 'rotini', 'garden rotini',
                'enriched macaroni', 'noodles', 'pappardelle', 'ziti', 'cavatappi',
                'fusilli', 'rotelle', 'alphabet pasta', 'ditali', 'farfalline',
                'cannelloni', 'manicotti', 'small shell macaroni'
            ],
            contains: ['shells', 'macaroni']
        },

        // RICE - Exact rice products only
        rice: {
            exact: [
                'rice', 'brown rice', 'white rice', 'jasmine rice', 'basmati rice',
                'wild rice', 'rice pilaf'
            ],
            contains: ['rice'],
            excludes: ['vinegar', 'wine'] // Exclude rice vinegar, rice wine, etc.
        },

        // STARCHES - Include rice as option, exclude butter and other non-starches
        starch: {
            exact: [
                'potatoes', 'mashed potatoes', 'quinoa', 'sweet potatoes', 'couscous',
                'barley', 'stuffing', 'stuffing mix', 'tater tots', 'frozen potatoes',
                'rice', 'brown rice', 'white rice', 'rice pilaf' // Added rice options
            ],
            contains: ['potatoes', 'stuffing', 'rice'],
            excludes: ['butter', 'sauce', 'gravy', 'vinegar'] // Added vinegar exclusion
        },

        // VEGETABLES - Removed onions, peppers, celery
        vegetable: {
            exact: [
                'broccoli', 'carrots', 'green beans', 'asparagus', 'spinach', 'lettuce',
                'corn', 'peas', 'zucchini',
                'cauliflower', 'cabbage', 'brussels sprouts', 'frozen broccoli'
            ],
            contains: [
                'broccoli', 'carrot', 'bean', 'asparagus', 'spinach', 'lettuce',
                'corn', 'potato'
            ],
            excludes: ['mushroom', 'onion', 'pepper', 'celery', 'sauce'] // Exclude moved items
        },

        // FRUITS - FIXED spelling for strawberry and blueberry
        fruits: {
            contains: [
                'fruit cocktail', 'peaches', 'pears', 'pineapple', 'mandarin', 'orange',
                'apple', 'banana', 'grape', 'strawberry', 'blueberry', 'cherry'
            ]
        },

        // BREAD - Split into specific types
        bread: {
            exact: [
                'bread', 'white bread', 'wheat bread', 'sourdough', 'rye bread', 'bagels',
                'rolls', 'tortillas', 'wraps', 'pita bread', 'english muffins'
            ],
            contains: ['bread', 'rolls'],
            excludes: ['buns'] // Exclude buns since they're categorized separately
        },

        // HAMBURGER BUNS - Specifically for patties
        hamburger_buns: {
            exact: ['hamburger buns', 'burger buns'],
            contains: ['hamburger bun', 'burger bun'],
            excludes: ['hot dog']
        },

        // HOT DOG BUNS - Specifically for cylindrical proteins
        hot_dog_buns: {
            exact: ['hot dog buns', 'hot dog rolls'],
            contains: ['hot dog bun', 'hot dog roll'],
            excludes: []
        },

        // SOUP - Must contain "soup" and not be a seasoning
        soup: {
            contains: ['soup', 'broth', 'stock', 'chowder', 'bisque'],
            excludes: ['powder', 'seasoning', 'mix']
        },

        // GRAVY - Must explicitly contain "gravy"
        gravy: {
            contains: ['gravy'],
            excludes: []
        },

        // SAUCES - Cooking sauces, not condiments
        sauce: {
            exact: [
                'marinara', 'alfredo', 'pesto', 'pasta sauce', 'cheese sauce',
                'cream sauce', 'three cheese pasta sauce'
            ],
            contains: ['pasta sauce', 'cheese sauce'],
            excludes: ['barbecue', 'ketchup', 'mustard', 'mayo', 'ranch']
        },

        // CHEESE
        cheese: {
            contains: ['cheese'],
            excludes: ['sauce', 'pasta', 'lasagna', 'stroganoff', 'potatoes']
        },

        // CONDIMENTS - Removed hot sauce, soy sauce, vinegar
        condiment: {
            exact: [
                'mayonnaise', 'mustard', 'ketchup', 'ranch', 'barbecue sauce'
            ],
            contains: ['mayo', 'mustard', 'ketchup', 'barbecue']
        },

        // SEASONINGS - Spices and herbs
        seasoning: {
            exact: [
                'salt', 'pepper', 'garlic powder', 'onion powder', 'paprika',
                'black pepper', 'white pepper', 'oregano', 'basil', 'thyme',
                'rosemary', 'cumin', 'chili powder', 'red pepper flakes',
                'ground cinnamon', 'cayenne pepper', 'kosher salt'
            ],
            contains: [
                'pepper', 'salt', 'powder', 'oregano', 'basil', 'thyme', 'cumin',
                'cinnamon', 'cayenne', 'paprika', 'chili powder', 'minced onion'
            ],
            excludes: ['sauce', 'gravy']
        },

        // BASIC INGREDIENTS - Added moved items
        ingredients: {
            exact: [
                'flour', 'sugar', 'honey', 'vinegar', 'butter', 'oil', 'vanilla',
                'baking powder', 'baking soda', 'mushrooms', 'hot sauce', 'soy sauce',
                'onions', 'peppers', 'celery', 'tomatoes'
            ],
            contains: ['flour', 'sugar', 'honey', 'butter', 'oil', 'vinegar', 'mushroom',
                'hot sauce', 'soy sauce', 'onion', 'pepper', 'celery', 'tomato']
        }
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
    }, [inventory, recipes, matchThreshold, selectedCategory]); // Add selectedCategory here


    // ENHANCED: Generate simple meal suggestions with brand-aware logic
    const generateSimpleMealSuggestions = () => {
        console.log('=== GENERATING SIMPLE MEAL SUGGESTIONS ===');

        // Categorize inventory items with brand awareness
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

    // UPDATED: Categorization function with convenience protein handling
    const categorizeInventoryItems = (inventory) => {
        const categorized = {};

        // Initialize categories
        Object.keys(categoryMappings).forEach(category => {
            categorized[category] = [];
        });

        inventory.forEach(item => {
            const itemName = item.name.toLowerCase().trim();
            let categorized_item = false;

            console.log(`\n--- Categorizing: "${item.name}" ---`);

            // First, perform brand analysis for helper meals, convenience items, and convenience proteins
            const brandAnalysis = analyzeItemBrand(item);

            if (brandAnalysis.isHelperMeal) {
                categorized['helper_meal'].push({
                    ...item,
                    requiredProtein: brandAnalysis.requiredProtein
                });
                categorized_item = true;
                console.log(`✅ HELPER MEAL: "${item.name}"`);
            } else if (brandAnalysis.isStandaloneConvenience) {
                categorized['standalone_convenience'].push(item);
                categorized_item = true;
                console.log(`✅ STANDALONE CONVENIENCE: "${item.name}"`);
            } else if (brandAnalysis.isConvenienceProtein) {
                categorized[brandAnalysis.convenienceType].push({
                    ...item,
                    requiredComponent: brandAnalysis.requiredComponent
                });
                categorized_item = true;
                console.log(`✅ CONVENIENCE PROTEIN: "${item.name}" (${brandAnalysis.convenienceType})`);
            }

            // If not categorized by brand analysis, use precise standard categorization
            if (!categorized_item) {
                // Priority order: most specific categories first
                const priorityOrder = [
                    'hot_dog_proteins', 'hamburger_buns', 'hot_dog_buns', 'seasoning', 'gravy',
                    'soup', 'pasta', 'rice', 'bread', 'sauce', 'condiment', 'cheese',
                    'protein', 'fruits', 'vegetable', 'starch', 'ingredients'
                ];

                for (const category of priorityOrder) {
                    if (categorized_item) break;

                    const categoryRules = categoryMappings[category];
                    if (!categoryRules) continue;

                    let matches = false;

                    // Check exact matches first
                    if (categoryRules.exact) {
                        matches = categoryRules.exact.some(exact =>
                            itemName === exact.toLowerCase() ||
                            itemName.includes(exact.toLowerCase())
                        );
                    }

                    // Check contains matches if no exact match
                    if (!matches && categoryRules.contains) {
                        matches = categoryRules.contains.some(keyword => {
                            const keywordLower = keyword.toLowerCase();
                            return itemName.includes(keywordLower);
                        });
                    }

                    // Apply exclusions
                    if (matches && categoryRules.excludes) {
                        const hasExclusion = categoryRules.excludes.some(exclude =>
                            itemName.includes(exclude.toLowerCase())
                        );
                        if (hasExclusion) {
                            matches = false;
                            console.log(`❌ EXCLUDED from ${category}: "${item.name}" (contains exclusion)`);
                        }
                    }

                    // Additional specific validation
                    if (matches) {
                        let shouldCategorize = true;

                        // Special validation for rice (exclude vinegar)
                        if (category === 'rice' && itemName.includes('vinegar')) {
                            shouldCategorize = false;
                            console.log(`❌ RICE EXCLUSION: "${item.name}" contains vinegar`);
                        }

                        // Special validation for starch (exclude vinegar)
                        if (category === 'starch' && itemName.includes('vinegar')) {
                            shouldCategorize = false;
                            console.log(`❌ STARCH EXCLUSION: "${item.name}" contains vinegar`);
                        }

                        // Special validation for pasta (make sure it's actual pasta)
                        if (category === 'pasta') {
                            const isPasta = categoryRules.exact.some(pasta =>
                                itemName.includes(pasta.toLowerCase())
                            ) || itemName.includes('macaroni') || itemName.includes('shells');
                            shouldCategorize = isPasta;
                        }

                        // Special validation for seasonings (avoid false matches)
                        if (category === 'seasoning') {
                            const isSpice = categoryRules.exact.some(spice =>
                                    itemName.includes(spice.toLowerCase())
                                ) || itemName.includes('powder') || itemName.includes('pepper') ||
                                itemName.includes('salt') || itemName.includes('oregano') ||
                                itemName.includes('cinnamon') || itemName.includes('cayenne') ||
                                itemName.includes('minced onion');
                            shouldCategorize = isSpice;
                        }

                        if (shouldCategorize) {
                            categorized[category].push(item);
                            categorized_item = true;
                            console.log(`✅ ${category.toUpperCase()}: "${item.name}"`);
                        }
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

    // NEW: Randomized ingredient selection with variety
    const selectRandomIngredient = (availableItems, category, existingComponents, templateId) => {
        if (!availableItems || availableItems.length === 0) {
            console.log(`❌ No items available for category: ${category}`);
            return null;
        }

        console.log(`🎲 Selecting from ${availableItems.length} ${category} options:`, availableItems.map(i => i.name));

        // If only one option, use it
        if (availableItems.length === 1) {
            console.log(`✅ Only one option for ${category}: ${availableItems[0].name}`);
            return availableItems[0];
        }

        // Get existing component items for pairing logic
        const existingItems = existingComponents.map(comp => comp.item?.name.toLowerCase()).filter(Boolean);

        // Special logic for different categories with randomization
        let preferredItems = [];

        switch (category) {
            case 'protein':
                // Prefer whole proteins over processed, but randomize within preferred group
                const wholeProteins = availableItems.filter(item =>
                    ['chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'steak'].some(protein =>
                        item.name.toLowerCase().includes(protein)
                    )
                );
                preferredItems = wholeProteins.length > 0 ? wholeProteins : availableItems;
                break;

            case 'standalone_convenience':
                // Prefer complete meals that don't need additional items
                const completeMeals = availableItems.filter(item =>
                    ['frozen pizza', 'pizza', 'ramen', 'instant noodles', 'mac and cheese'].some(meal =>
                        item.name.toLowerCase().includes(meal)
                    )
                );
                preferredItems = completeMeals.length > 0 ? completeMeals : availableItems;
                break;

            case 'vegetable':
                // For vegetables, prefer fresh/frozen over canned, but randomize
                const freshVeggies = availableItems.filter(item =>
                    !item.name.toLowerCase().includes('canned')
                );
                preferredItems = freshVeggies.length > 0 ? freshVeggies : availableItems;
                break;

            case 'starch':
                // Prefer actual starches over rice (since rice has its own category)
                const nonRiceStarches = availableItems.filter(item =>
                    !item.name.toLowerCase().includes('rice')
                );
                preferredItems = nonRiceStarches.length > 0 ? nonRiceStarches : availableItems;
                break;

            default:
                // For all other categories, use all available items
                preferredItems = availableItems;
                break;
        }

        // Randomly select from preferred items
        const randomIndex = Math.floor(Math.random() * preferredItems.length);
        const selectedItem = preferredItems[randomIndex];

        console.log(`✅ Randomly selected ${category}: ${selectedItem.name} (${randomIndex + 1} of ${preferredItems.length} options)`);
        return selectedItem;
    };

    // ENHANCED: Protein requirement checking with stricter validation
    const checkHelperMealRequirements = (helperItem, categorizedInventory) => {
        if (!helperItem.requiredProtein) return false; // Require explicit protein

        const availableProteins = categorizedInventory.protein || [];
        const hasRequiredProtein = availableProteins.some(protein => {
            const proteinName = protein.name.toLowerCase();
            const requiredProtein = helperItem.requiredProtein.toLowerCase();

            console.log(`Checking protein "${proteinName}" against required "${requiredProtein}"`);

            // Strict protein matching - only suggest if we actually have what's needed
            if (requiredProtein === 'ground beef') {
                const matches = proteinName.includes('ground beef') ||
                    proteinName.includes('hamburger') ||
                    (proteinName.includes('ground') && proteinName.includes('beef'));
                console.log(`Ground beef check: ${matches}`);
                return matches;
            } else if (requiredProtein === 'ground turkey') {
                const matches = proteinName.includes('ground turkey') ||
                    (proteinName.includes('ground') && proteinName.includes('turkey'));
                console.log(`Ground turkey check: ${matches}`);
                return matches;
            } else if (requiredProtein === 'chicken') {
                const matches = proteinName.includes('chicken');
                console.log(`Chicken check: ${matches}`);
                return matches;
            } else if (requiredProtein === 'tuna') {
                const matches = proteinName.includes('tuna');
                console.log(`Tuna check: ${matches}`);
                return matches;
            }

            return proteinName.includes(requiredProtein);
        });

        console.log(`Helper "${helperItem.name}" requires "${helperItem.requiredProtein}": ${hasRequiredProtein ? 'AVAILABLE' : 'MISSING'}`);
        return hasRequiredProtein;
    };

    // ENHANCED: Generate a meal suggestion from a template with helper meal support
    const generateMealFromTemplate = (template, categorizedInventory) => {
        const components = [];
        let canMake = true;
        let isComplete = true;
        let missingItems = [];

        console.log(`\n=== Generating meal for template: ${template.id} ===`);

        // Check required categories
        for (const category of template.requiredCategories) {
            const availableItems = categorizedInventory[category] || [];
            console.log(`Checking category ${category}: ${availableItems.length} items available`);

            if (availableItems.length > 0) {
                let selectedItem = null;
                let itemCanMake = false;

                // Special handling for helper meals - ONLY suggest if required protein is available
                if (category === 'helper_meal') {
                    console.log('Checking helper meals...');
                    for (const helperItem of availableItems) {
                        const hasRequiredProtein = checkHelperMealRequirements(helperItem, categorizedInventory);

                        if (hasRequiredProtein) {
                            selectedItem = helperItem;
                            itemCanMake = true;

                            // Find and add the required protein as a component
                            const requiredProtein = (categorizedInventory.protein || []).find(protein => {
                                const proteinName = protein.name.toLowerCase();
                                const requiredProtein = helperItem.requiredProtein.toLowerCase();

                                if (requiredProtein === 'ground beef') {
                                    return proteinName.includes('ground beef') ||
                                        proteinName.includes('hamburger') ||
                                        (proteinName.includes('ground') && proteinName.includes('beef'));
                                } else if (requiredProtein === 'ground turkey') {
                                    return proteinName.includes('ground turkey') ||
                                        (proteinName.includes('ground') && proteinName.includes('turkey'));
                                } else if (requiredProtein === 'chicken') {
                                    return proteinName.includes('chicken');
                                } else if (requiredProtein === 'tuna') {
                                    return proteinName.includes('tuna');
                                }

                                return proteinName.includes(requiredProtein);
                            });

                            if (requiredProtein) {
                                components.push({
                                    category: 'protein',
                                    item: requiredProtein,
                                    required: true,
                                    helperRequirement: true
                                });
                                console.log(`✅ Added required protein: ${requiredProtein.name}`);
                            }
                            break; // Found a workable helper meal, stop looking
                        } else {
                            console.log(`❌ Helper "${helperItem.name}" missing required protein: ${helperItem.requiredProtein}`);
                        }
                    }

                    // If no helper meal can be made, don't add this category
                    if (!selectedItem) {
                        console.log(`❌ No helper meals can be made - missing required proteins`);
                        // Don't set canMake = false here, just skip this template entirely
                        return null; // This will cause the template to not be suggested
                    }
                } else {
                    // Standard item selection for other categories
                    selectedItem = selectRandomIngredient(availableItems, category, components, template.id);
                    itemCanMake = true;
                }

                if (selectedItem && itemCanMake) {
                    components.push({
                        category,
                        item: selectedItem,
                        required: true
                    });
                } else {
                    canMake = false;
                    isComplete = false;
                    components.push({
                        category,
                        item: null,
                        required: true
                    });
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
                const selectedItem = selectRandomIngredient(availableItems, category, components, template.id);
                if (selectedItem) {
                    components.push({
                        category,
                        item: selectedItem,
                        required: false
                    });
                }
            }
        }

        if (!canMake) {
            console.log(`Cannot make ${template.id}: missing items: ${missingItems.join(', ')}`);
            return null;
        }

        return {
            id: template.id,
            template,
            components,
            canMake,
            isComplete,
            missingItems,
            estimatedTime: getEstimatedMealTime(template.id)
        };
    };

    // ENHANCED: Natural meal naming with helper meal support
    const formatMealName = (suggestion) => {
        const mainComponents = suggestion.components
            .filter(comp => comp.item && comp.required);

        const optionalComponents = suggestion.components
            .filter(comp => comp.item && !comp.required);

        // Special naming for different meal types
        switch (suggestion.template.id) {
            case 'helper-meal':
                // For helper meals, combine the helper product with its required protein
                const helperItem = mainComponents.find(comp => comp.category === 'helper_meal');
                const requiredProtein = mainComponents.find(comp => comp.helperRequirement);

                if (helperItem && requiredProtein) {
                    return `${helperItem.item.name} with ${requiredProtein.item.name}`;
                } else if (helperItem) {
                    return helperItem.item.name;
                }
                break;

            case 'standalone-convenience':
                // For standalone convenience meals, use the main item name
                const standaloneItem = mainComponents.find(comp => comp.category === 'standalone_convenience');
                if (standaloneItem) {
                    const additionalItems = optionalComponents.filter(comp => comp.category === 'vegetable');
                    if (additionalItems.length > 0) {
                        return `${standaloneItem.item.name} with ${additionalItems[0].item.name}`;
                    }
                    return standaloneItem.item.name;
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

// UPDATED: Get estimated preparation time for meal types
    const getEstimatedMealTime = (templateId) => {
        const timings = {
            'protein-starch-vegetable': 45,
            'helper-meal': 20,
            'pasta-meal': 25,
            'sandwich-meal': 10,
            'rice-bowl': 30,
            'standalone-convenience': 10,
            'soup-meal': 20
        };
        return timings[templateId] || 30;
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [inventoryResponse, recipesResponse] = await Promise.all([
                fetch(getApiUrl('/api/inventory')),
                fetch(getApiUrl('/api/recipes'))
            ]);

            const inventoryData = await inventoryResponse.json();
            const recipesData = await recipesResponse.json();

            if (inventoryData.success) {
                setInventory(inventoryData.inventory);
                console.log('Loaded inventory items:', inventoryData.inventory.map(item => ({
                    name: item.name,
                    brand: item.brand,
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
            const response = await fetch(getApiUrl(`/api/recipes/${recipeId}`));
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
        console.log('Selected category:', selectedCategory);

        let filteredRecipes = recipes;

        // Apply category filter
        if (selectedCategory !== 'all') {
            filteredRecipes = recipes.filter(recipe => recipe.category === selectedCategory);
            console.log(`Filtered to ${selectedCategory}: ${filteredRecipes.length} recipes`);
        }

        const suggestions = filteredRecipes
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

    // ENHANCED: Better ingredient name normalization with vegan/plant-based exclusions
    const normalizeIngredientName = (name) => {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
            .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
            .replace(/\b(fresh|dried|minced|chopped|sliced|diced|whole|ground|crushed|grated|shredded|cooked|raw|frozen)\b/g, '')
            .replace(/\b(boneless|skinless|butterflied|pounded|lean|extra)\b/g, '')
            .replace(/\b(small|medium|large|extra|about)\b/g, '')
            .replace(/\b(can|jar|bottle|bag|box|package|container|lb|lbs|oz|cup|cups|teaspoon|teaspoons|tablespoon|tablespoons)\b/g, '')
            .replace(/\b(of|the|and|or|each|divided)\b/g, '')
            .replace(/\b(\d+\/\d+|\d+)\b/g, '') // Remove fractions and numbers
            .replace(/\b(inch|thickness)\b/g, '') // Remove measurement descriptors
            .replace(/\s+/g, ' ')
            .trim();
    };

    // NEW: Function to detect vegan/plant-based ingredients
    const isVeganOrPlantBased = (ingredientName) => {
        const veganKeywords = [
            'vegan', 'plant-based', 'plant based', 'meatless', 'meat-free', 'meat free',
            'vegetarian', 'veggie', 'mock', 'imitation', 'artificial', 'fake',
            'seitan', 'tempeh', 'tofu', 'soy protein', 'textured vegetable protein',
            'tvp', 'beyond', 'impossible', 'gardein', 'lightlife', 'morningstar',
            'boca', 'field roast', 'tofurky', 'quorn', 'jackfruit'
        ];

        const lowerName = ingredientName.toLowerCase();
        return veganKeywords.some(keyword => lowerName.includes(keyword));
    };

    // NEW: Function to detect if an ingredient is animal protein
    const isAnimalProtein = (ingredientName) => {
        const animalProteins = [
            'chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna',
            'shrimp', 'crab', 'lobster', 'bacon', 'ham', 'sausage', 'steak',
            'ground beef', 'ground turkey', 'ground chicken', 'ground pork'
        ];

        const normalizedName = normalizeIngredientName(ingredientName);
        return animalProteins.some(protein => normalizedName.includes(protein));
    };

    // ENHANCED: Much more comprehensive ingredient matching with vegan exclusions
    const findIngredientInInventory = (recipeIngredient, inventory) => {
        const recipeName = normalizeIngredientName(recipeIngredient.name);
        const recipeNameOriginal = recipeIngredient.name.toLowerCase();

        console.log(`\n--- Looking for: "${recipeIngredient.name}" (normalized: "${recipeName}") ---`);

        // CRITICAL: Check if recipe ingredient is vegan/plant-based
        const recipeIsVegan = isVeganOrPlantBased(recipeIngredient.name);
        const recipeIsAnimalProtein = isAnimalProtein(recipeIngredient.name);

        console.log(`Recipe ingredient analysis: isVegan=${recipeIsVegan}, isAnimalProtein=${recipeIsAnimalProtein}`);

        // 1. EXACT MATCH (highest priority)
        for (const item of inventory) {
            const itemName = normalizeIngredientName(item.name);
            const itemIsVegan = isVeganOrPlantBased(item.name);
            const itemIsAnimalProtein = isAnimalProtein(item.name);

            if (itemName === recipeName && recipeName.length > 2) {
                // Additional validation: ensure vegan/meat compatibility
                if (recipeIsVegan && itemIsAnimalProtein) {
                    console.log(`❌ VEGAN/MEAT MISMATCH: Recipe wants vegan "${recipeIngredient.name}" but inventory has animal protein "${item.name}"`);
                    continue;
                }
                if (recipeIsAnimalProtein && itemIsVegan) {
                    console.log(`❌ MEAT/VEGAN MISMATCH: Recipe wants animal protein "${recipeIngredient.name}" but inventory has vegan "${item.name}"`);
                    continue;
                }

                console.log(`✅ EXACT MATCH: "${item.name}"`);
                return {
                    found: true,
                    inventoryItem: item,
                    matchType: 'exact'
                };
            }
        }

        // 2. ENHANCED INGREDIENT VARIATIONS with vegan/meat validation
        const specificVariations = {
            // Proteins - Handle all the common variations
            'chicken breast': ['chicken breasts', 'boneless skinless chicken breast', 'boneless chicken breast', 'skinless chicken breast'],
            'chicken breasts': ['chicken breast', 'boneless skinless chicken breast', 'boneless chicken breast', 'skinless chicken breast'],
            'boneless skinless chicken breast': ['chicken breast', 'chicken breasts'],
            'boneless chicken breast': ['chicken breast', 'chicken breasts'],
            'ground beef': ['lb ground beef', 'ground chuck', 'hamburger'],
            'cube steaks': ['cubed steaks', 'cube steak', 'cubed steak'],
            'cubed steaks': ['cube steaks', 'cube steak', 'cubed steak'],
            'cube steak': ['cubed steaks', 'cube steaks', 'cubed steak'],
            'cubed steak': ['cube steaks', 'cubed steaks', 'cube steak'],

            // Mushrooms
            'mushrooms': ['fresh mushrooms', 'mushrooms stems and pieces', 'sliced mushrooms', 'button mushrooms'],
            'fresh mushrooms': ['mushrooms', 'mushrooms stems and pieces', 'sliced mushrooms'],
            'sliced mushrooms': ['mushrooms', 'fresh mushrooms', 'mushrooms stems and pieces'],
            'button mushrooms': ['mushrooms', 'fresh mushrooms'],

            // Salt variations
            'kosher salt': ['coarse kosher salt', 'salt'],
            'coarse kosher salt': ['kosher salt', 'salt'],
            'salt': ['kosher salt', 'coarse kosher salt', 'table salt'],

            // Wine and cooking liquids
            'marsala wine': ['marsala cooking wine', 'cooking marsala'],
            'marsala cooking wine': ['marsala wine', 'cooking marsala'],
            'cooking wine': ['wine'],
            'white wine': ['white cooking wine', 'dry white wine'],
            'red wine': ['red cooking wine', 'dry red wine'],

            // Basic ingredients
            'olive oil': ['extra virgin olive oil', 'virgin olive oil', 'evoo'],
            'garlic': ['garlic cloves', 'garlic bulb', 'minced garlic'],
            'onion': ['yellow onion', 'white onion', 'red onion', 'sweet onion'],
            'tomato': ['roma tomato', 'cherry tomato', 'grape tomato', 'beefsteak tomato'],
            'cheese': ['cheddar cheese', 'mozzarella cheese', 'parmesan cheese'],
            'milk': ['whole milk', '2% milk', 'skim milk', '1% milk'],
            'butter': ['unsalted butter', 'salted butter'],
            'flour': ['all purpose flour', 'bread flour', 'cake flour'],
            'sugar': ['white sugar', 'granulated sugar', 'brown sugar'],
            'pepper': ['black pepper', 'white pepper', 'ground pepper'],
            'pasta': ['penne', 'spaghetti', 'macaroni', 'fettuccine', 'rigatoni'],
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

                        // CRITICAL: Vegan/meat compatibility check
                        const itemIsVegan = isVeganOrPlantBased(item.name);
                        const itemIsAnimalProtein = isAnimalProtein(item.name);

                        if (recipeIsVegan && itemIsAnimalProtein) {
                            console.log(`❌ VARIATION MISMATCH: Recipe wants vegan "${recipeIngredient.name}" but inventory has animal protein "${item.name}"`);
                            continue;
                        }
                        if (recipeIsAnimalProtein && itemIsVegan) {
                            console.log(`❌ VARIATION MISMATCH: Recipe wants animal protein "${recipeIngredient.name}" but inventory has vegan "${item.name}"`);
                            continue;
                        }

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

        // 3. SMART PARTIAL MATCHING with enhanced vegan/meat validation
        if (recipeName.length >= 4) {
            for (const item of inventory) {
                const itemName = normalizeIngredientName(item.name);

                // Handle common cooking terms and descriptors
                const recipeCore = recipeName
                    .replace(/\b(diced|sliced|chopped|minced|butterflied|pounded|fresh|dried|frozen)\b/g, '')
                    .replace(/\b(boneless|skinless|lean|extra)\b/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                const inventoryCore = itemName
                    .replace(/\b(stems and pieces|cooking|coarse|extra large)\b/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                console.log(`Comparing cores: "${recipeCore}" vs "${inventoryCore}"`);

                // Check if the core ingredients match
                if (recipeCore.length >= 3 && inventoryCore.length >= 3) {
                    if (recipeCore === inventoryCore ||
                        recipeCore.includes(inventoryCore) ||
                        inventoryCore.includes(recipeCore)) {

                        // CRITICAL: Enhanced vegan/meat compatibility check for partial matches
                        const itemIsVegan = isVeganOrPlantBased(item.name);
                        const itemIsAnimalProtein = isAnimalProtein(item.name);

                        // Strict validation for animal proteins
                        if (recipeIsAnimalProtein || itemIsAnimalProtein) {
                            if (recipeIsVegan && itemIsAnimalProtein) {
                                console.log(`❌ SMART PARTIAL MISMATCH: Recipe wants vegan "${recipeIngredient.name}" but inventory has animal protein "${item.name}"`);
                                continue;
                            }
                            if (recipeIsAnimalProtein && itemIsVegan) {
                                console.log(`❌ SMART PARTIAL MISMATCH: Recipe wants animal protein "${recipeIngredient.name}" but inventory has vegan "${item.name}"`);
                                continue;
                            }
                        }

                        // Additional validation: make sure it's a reasonable match
                        const similarity = Math.max(recipeCore.length, inventoryCore.length) > 0 ?
                            Math.min(recipeCore.length, inventoryCore.length) / Math.max(recipeCore.length, inventoryCore.length) : 0;

                        if (similarity >= 0.5) {
                            console.log(`✅ SMART PARTIAL MATCH: "${item.name}" <-> "${recipeIngredient.name}" (similarity: ${Math.round(similarity * 100)}%)`);
                            return {
                                found: true,
                                inventoryItem: item,
                                matchType: 'smart_partial'
                            };
                        }
                    }
                }
            }
        }

        // 4. FLEXIBLE KEYWORD MATCHING with vegan/meat validation
        const recipeKeywords = recipeName.split(' ').filter(word => word.length >= 3);

        for (const item of inventory) {
            const itemName = normalizeIngredientName(item.name);
            const itemKeywords = itemName.split(' ').filter(word => word.length >= 3);

            // Count matching keywords
            const matchingKeywords = recipeKeywords.filter(rKeyword =>
                itemKeywords.some(iKeyword =>
                    rKeyword.includes(iKeyword) || iKeyword.includes(rKeyword)
                )
            );

            // If most keywords match, consider it a match
            if (matchingKeywords.length >= Math.min(2, recipeKeywords.length) &&
                matchingKeywords.length / recipeKeywords.length >= 0.6) {

                // CRITICAL: Final vegan/meat compatibility check
                const itemIsVegan = isVeganOrPlantBased(item.name);
                const itemIsAnimalProtein = isAnimalProtein(item.name);

                if (recipeIsVegan && itemIsAnimalProtein) {
                    console.log(`❌ KEYWORD MISMATCH: Recipe wants vegan "${recipeIngredient.name}" but inventory has animal protein "${item.name}"`);
                    continue;
                }
                if (recipeIsAnimalProtein && itemIsVegan) {
                    console.log(`❌ KEYWORD MISMATCH: Recipe wants animal protein "${recipeIngredient.name}" but inventory has vegan "${item.name}"`);
                    continue;
                }

                console.log(`✅ KEYWORD MATCH: "${item.name}" matches "${recipeIngredient.name}" (${matchingKeywords.length}/${recipeKeywords.length} keywords)`);
                return {
                    found: true,
                    inventoryItem: item,
                    matchType: 'keyword'
                };
            }
        }

        // 5. CHECK ALTERNATIVES (if recipe provides them) with vegan/meat validation
        if (recipeIngredient.alternatives && recipeIngredient.alternatives.length > 0) {
            for (const alternative of recipeIngredient.alternatives) {
                const altNormalized = normalizeIngredientName(alternative);
                const altIsVegan = isVeganOrPlantBased(alternative);
                const altIsAnimalProtein = isAnimalProtein(alternative);

                for (const item of inventory) {
                    const itemName = normalizeIngredientName(item.name);
                    if (itemName === altNormalized || itemName.includes(altNormalized) || altNormalized.includes(itemName)) {

                        // Vegan/meat compatibility check for alternatives
                        const itemIsVegan = isVeganOrPlantBased(item.name);
                        const itemIsAnimalProtein = isAnimalProtein(item.name);

                        if (altIsVegan && itemIsAnimalProtein) {
                            console.log(`❌ ALTERNATIVE MISMATCH: Alternative wants vegan "${alternative}" but inventory has animal protein "${item.name}"`);
                            continue;
                        }
                        if (altIsAnimalProtein && itemIsVegan) {
                            console.log(`❌ ALTERNATIVE MISMATCH: Alternative wants animal protein "${alternative}" but inventory has vegan "${item.name}"`);
                            continue;
                        }

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
                        <p className="text-gray-600">Recipe suggestions and simple meal ideas based on your
                            inventory</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Category</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                {recipeCategories.map(category => (
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>
                                ))}
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
                                🍽️ Simple Meals ({simpleMealSuggestions.length})
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
                                    Smart Meal Ideas ({simpleMealSuggestions.length})
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
                                            <div key={index}
                                                 className="border border-gray-200 rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
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
                                                        <div
                                                            className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                                            ✅ Ready to Make
                                                        </div>
                                                        {suggestion.isComplete && (
                                                            <div
                                                                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
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
                                                                    <div key={idx}
                                                                         className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-green-200">
                                                                        <div
                                                                            className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                                        <div className="flex-1">
                                                                            <div className="font-medium text-gray-900">
                                                                                {component.item.name}
                                                                                {component.helperRequirement && (
                                                                                    <span
                                                                                        className="text-sm text-blue-600 ml-2">(required for helper meal)</span>
                                                                                )}
                                                                            </div>
                                                                            <div
                                                                                className="text-sm text-gray-500 capitalize">
                                                                                {component.category.replace('_', ' ')}
                                                                                {component.item.quantity && ` • ${component.item.quantity} available`}
                                                                                {component.item.brand && ` • ${component.item.brand}`}
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
                                                                    <div key={idx}
                                                                         className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-blue-200">
                                                                        <div
                                                                            className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                                                        <div className="flex-1">
                                                                            <div className="font-medium text-gray-900">
                                                                                {component.item.name}
                                                                            </div>
                                                                            <div
                                                                                className="text-sm text-gray-500 capitalize">
                                                                                {component.category.replace('_', ' ')}
                                                                                {component.item.quantity && ` • ${component.item.quantity} available`}
                                                                                {component.item.brand && ` • ${component.item.brand}`}
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

                                                {/* Enhanced Cooking Tips */}
                                                <div
                                                    className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <div className="flex items-start space-x-2">
                                                        <span className="text-yellow-600 mt-0.5">💡</span>
                                                        <div>
                                                            <div className="font-medium text-yellow-800 text-sm">Quick
                                                                Tip:
                                                            </div>
                                                            <div className="text-yellow-700 text-sm">
                                                                {getSimpleCookingTip(suggestion.template.id, suggestion)}
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
                                    {selectedCategory !== 'all' && (
                                        <span className="text-sm text-gray-500 ml-2">
                                            • Filtered by {recipeCategories.find(cat => cat.value === selectedCategory)?.label}
                                        </span>
                                    )}
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
                                            No recipes match your current inventory
                                            at {Math.round(matchThreshold * 100)}%
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
                                                        <h5 className="font-medium text-gray-900 mb-2">Recipe
                                                            Details</h5>
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
                                                                        <span
                                                                            className="text-gray-500"> (optional)</span>}
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
                                                                        <span
                                                                            className="text-gray-500"> (optional)</span>}
                                                                </div>
                                                            ))}
                                                            {recipe.analysis.missingIngredients.length > 5 && (
                                                                <div className="text-red-600 text-xs">
                                                                    +{recipe.analysis.missingIngredients.length - 5} more
                                                                    needed
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
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(showRecipeModal.difficulty)}`}>
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
                                                    <span
                                                        className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
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
                <Footer/>
            </div>
        </MobileOptimizedLayout>
    );

    // ENHANCED: Helper function for cooking tips with brand awareness
    function getSimpleCookingTip(templateId, suggestion) {
        const tips = {
            'protein-starch-vegetable': 'Start with the protein, then add your starch. Cook vegetables until tender-crisp for best nutrition. Add gravy at the end.',
            'helper-meal': (() => {
                const helperItem = suggestion?.components?.find(comp => comp.category === 'helper_meal');
                if (helperItem?.item?.name?.toLowerCase().includes('hamburger helper') ||
                    helperItem?.item?.brand?.toLowerCase().includes('hamburger helper')) {
                    return 'Brown the ground beef first, then follow the Hamburger Helper package directions. The meat adds flavor to the entire dish.';
                } else if (helperItem?.item?.name?.toLowerCase().includes('tuna helper') ||
                    helperItem?.item?.brand?.toLowerCase().includes('tuna helper')) {
                    return 'Drain the tuna well before adding to prevent excess liquid. Mix gently to keep tuna chunks intact.';
                } else if (helperItem?.item?.name?.toLowerCase().includes('chicken helper') ||
                    helperItem?.item?.brand?.toLowerCase().includes('chicken helper')) {
                    return 'Use pre-cooked chicken or cook chicken pieces thoroughly before following package directions.';
                }
                return 'Follow the package directions but make sure to fully cook any required protein first.';
            })(),
            'pasta-meal': 'Cook pasta until al dente. Save some pasta water to help bind sauces.',
            'sandwich-meal': 'Toast bread lightly for better texture. Layer ingredients thoughtfully for balanced flavors.',
            'rice-bowl': 'Rinse rice before cooking. Let it rest 5 minutes after cooking for fluffier texture.',
            'standalone-convenience': 'Follow package directions. Consider adding fresh vegetables or herbs for extra nutrition and flavor.',
            'soup-meal': 'Heat soup gently and taste for seasoning. Pair with crusty bread for a complete meal.'
        };
        return tips[templateId] || 'Enjoy your homemade meal!';
    }
}