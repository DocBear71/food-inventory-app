'use client';
// file: /src/components/meal-planning/SimpleMealBuilder.js v6 - FIXED SCROLLABLE AREAS HEIGHT

import {useState, useEffect} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { apiGet } from '@/lib/api-config';
import KeyboardOptimizedInput from '@/components/forms/KeyboardOptimizedInput';

const MEAL_CATEGORIES = [
    {id: 'protein', name: 'Protein', icon: '🥩', color: 'bg-red-50 border-red-200 text-red-700'},
    {id: 'starch', name: 'Starch/Carbs', icon: '🥔', color: 'bg-yellow-50 border-yellow-200 text-yellow-700'},
    {id: 'vegetable', name: 'Vegetables', icon: '🥦', color: 'bg-green-50 border-green-200 text-green-700'},
    {id: 'dairy', name: 'Dairy', icon: '🧀', color: 'bg-blue-50 border-blue-200 text-blue-700'},
    {id: 'fat', name: 'Fats/Oils', icon: '🫒', color: 'bg-purple-50 border-purple-200 text-purple-700'},
    {id: 'seasoning', name: 'Seasonings', icon: '🧂', color: 'bg-gray-50 border-gray-200 text-gray-700'},
    {id: 'other', name: 'Other/Convenience', icon: '📦', color: 'bg-gray-50 border-gray-200 text-gray-700'}
];

const COOKING_METHODS = [
    'grilled', 'roasted', 'baked', 'sautéed', 'steamed', 'boiled', 'fried', 'raw'
];

export default function SimpleMealBuilder({
                                              isOpen,
                                              onClose,
                                              onSave,
                                              selectedSlot,
                                              initialMeal = null,
                                              userDietaryRestrictions = [],
                                              userAvoidIngredients = []
                                          }) {
    const [inventory, setInventory] = useState([]);
    const [filteredInventory, setFilteredInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showDietaryWarning, setShowDietaryWarning] = useState(false);
    const [dietaryConflicts, setDietaryConflicts] = useState([]);
    const [isMobile, setIsMobile] = useState(false);

    // NEW: Tab state for mobile interface
    const [activeTab, setActiveTab] = useState('inventory');

    const [mealData, setMealData] = useState({
        name: '',
        description: '',
        items: [],
        totalEstimatedTime: 30,
        difficulty: 'easy'
    });

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Auto-switch to meal tab when first item is added (mobile only)
    const [hasAutoSwitched, setHasAutoSwitched] = useState(false);

    useEffect(() => {
        // Only auto-switch once when going from 0 to 1 items, and only if user hasn't manually switched tabs
        if (isMobile && mealData.items.length === 1 && activeTab === 'inventory' && !hasAutoSwitched) {
            // Small delay to let user see the item was added
            setTimeout(() => {
                setActiveTab('meal');
                setHasAutoSwitched(true);
            }, 800);
        }

        // Reset the auto-switch flag if user empties the meal
        if (mealData.items.length === 0) {
            setHasAutoSwitched(false);
        }
    }, [mealData.items.length, isMobile, activeTab, hasAutoSwitched]);

    // All your existing functions remain the same
    const selectRandomIngredient = (availableItems, category) => {
        if (!availableItems || availableItems.length === 0) {
            console.log(`❌ No items available for category: ${category}`);
            return null;
        }

        console.log(`🎲 SimpleMealBuilder selecting from ${availableItems.length} ${category} options:`, availableItems.map(i => i.name));

        if (availableItems.length === 1) {
            console.log(`✅ Only one option for ${category}: ${availableItems[0].name}`);
            return availableItems[0];
        }

        let preferredItems = [];

        switch (category) {
            case 'protein':
                const wholeProteins = availableItems.filter(item =>
                    ['chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'steak'].some(protein =>
                        item.name.toLowerCase().includes(protein)
                    )
                );
                preferredItems = wholeProteins.length > 0 ? wholeProteins : availableItems;
                break;

            case 'vegetable':
                const freshVeggies = availableItems.filter(item =>
                    !item.name.toLowerCase().includes('canned')
                );
                preferredItems = freshVeggies.length > 0 ? freshVeggies : availableItems;
                break;

            case 'starch':
                const nonRiceStarches = availableItems.filter(item =>
                    !item.name.toLowerCase().includes('rice')
                );
                preferredItems = nonRiceStarches.length > 0 ? nonRiceStarches : availableItems;
                break;

            default:
                preferredItems = availableItems;
                break;
        }

        const randomIndex = Math.floor(Math.random() * preferredItems.length);
        const selectedItem = preferredItems[randomIndex];

        console.log(`✅ SimpleMealBuilder randomly selected ${category}: ${selectedItem.name} (${randomIndex + 1} of ${preferredItems.length} options)`);
        return selectedItem;
    };

    const filterInventoryByDietary = (inventoryList) => {
        if (!inventoryList || inventoryList.length === 0) return [];

        return inventoryList.filter(item => {
            const itemName = item.name?.toLowerCase() || '';
            const itemCategory = item.category?.toLowerCase() || '';
            const itemBrand = item.brand?.toLowerCase() || '';

            if (userAvoidIngredients.length > 0) {
                const hasAvoidedIngredient = userAvoidIngredients.some(avoidedIngredient => {
                    const avoidedLower = avoidedIngredient.toLowerCase().trim();
                    return itemName.includes(avoidedLower) ||
                        itemCategory.includes(avoidedLower) ||
                        itemBrand.includes(avoidedLower);
                });

                if (hasAvoidedIngredient) {
                    return false;
                }
            }

            if (userDietaryRestrictions.length > 0) {
                const restrictionConflicts = {
                    'vegetarian': ['meat', 'beef', 'pork', 'chicken', 'fish', 'seafood', 'bacon', 'ham'],
                    'vegan': ['meat', 'beef', 'pork', 'chicken', 'fish', 'seafood', 'dairy', 'milk', 'cheese', 'butter', 'eggs', 'honey'],
                    'gluten-free': ['wheat', 'bread', 'pasta', 'flour', 'gluten', 'barley', 'rye'],
                    'dairy-free': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'dairy'],
                    'nut-free': ['nuts', 'almond', 'peanut', 'walnut', 'cashew', 'pecan']
                };

                const hasConflict = userDietaryRestrictions.some(restriction => {
                    const restrictionLower = restriction.toLowerCase().trim();
                    const conflictingItems = restrictionConflicts[restrictionLower] || [];

                    return conflictingItems.some(conflictItem =>
                        itemName.includes(conflictItem) ||
                        itemCategory.includes(conflictItem)
                    );
                });

                if (hasConflict) {
                    return false;
                }
            }

            return true;
        });
    };

    const checkMealConflicts = () => {
        const conflicts = [];

        mealData.items.forEach(item => {
            const itemName = item.itemName?.toLowerCase() || '';

            userAvoidIngredients.forEach(avoidedIngredient => {
                const avoidedLower = avoidedIngredient.toLowerCase().trim();
                if (itemName.includes(avoidedLower)) {
                    conflicts.push(`${item.itemName} contains avoided ingredient: ${avoidedIngredient}`);
                }
            });

            userDietaryRestrictions.forEach(restriction => {
                const restrictionLower = restriction.toLowerCase().trim();
                const restrictionConflicts = {
                    'vegetarian': ['meat', 'beef', 'pork', 'chicken', 'fish', 'seafood'],
                    'vegan': ['meat', 'beef', 'pork', 'chicken', 'fish', 'seafood', 'dairy', 'milk', 'cheese', 'butter', 'eggs'],
                    'gluten-free': ['wheat', 'bread', 'pasta', 'flour', 'gluten'],
                    'dairy-free': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'dairy']
                };

                const conflictingItems = restrictionConflicts[restrictionLower] || [];
                conflictingItems.forEach(conflictItem => {
                    if (itemName.includes(conflictItem)) {
                        conflicts.push(`${item.itemName} may not be suitable for ${restriction} diet`);
                    }
                });
            });
        });

        setDietaryConflicts([...new Set(conflicts)]);
        setShowDietaryWarning(conflicts.length > 0);
    };

    useEffect(() => {
        if (mealData.items.length > 0) {
            checkMealConflicts();
        } else {
            setDietaryConflicts([]);
            setShowDietaryWarning(false);
        }
    }, [mealData.items, userDietaryRestrictions, userAvoidIngredients]);

    useEffect(() => {
        let filtered = filterInventoryByDietary(inventory);

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(query) ||
                (item.brand && item.brand.toLowerCase().includes(query)) ||
                (item.category && item.category.toLowerCase().includes(query))
            );
        }

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(item =>
                categorizeInventoryItem(item) === selectedCategory
            );
        }

        setFilteredInventory(filtered);
    }, [inventory, userDietaryRestrictions, userAvoidIngredients, searchQuery, selectedCategory]);

    useEffect(() => {
        if (isOpen) {
            fetchInventory();
            // Reset to inventory tab when opening
            setActiveTab('inventory');

            if (initialMeal?.simpleMeal) {
                setMealData(initialMeal.simpleMeal);
                // If editing existing meal, start on meal tab
                setActiveTab('meal');
            } else {
                setMealData({
                    name: '',
                    description: '',
                    items: [],
                    totalEstimatedTime: 30,
                    difficulty: 'easy'
                });
            }
        }
    }, [isOpen, initialMeal]);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const response = await apiGet('/api/inventory');
            const data = await response.json();

            if (data.success) {
                setInventory(data.inventory);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateMealName = (items) => {
        if (items.length === 0) return '';

        const proteins = items.filter(item => item.itemCategory === 'protein');
        const starches = items.filter(item => item.itemCategory === 'starch');
        const vegetables = items.filter(item => item.itemCategory === 'vegetable');

        let name = '';

        if (proteins.length > 0) {
            name += proteins[0].itemName;
        }
        if (starches.length > 0) {
            name += (name ? ' with ' : '') + starches[0].itemName;
        }
        if (vegetables.length > 0) {
            name += (name ? ' and ' : '') + vegetables[0].itemName;
        }

        return name || items[0].itemName;
    };

    const categorizeInventoryItem = (item) => {
        const name = item.name.toLowerCase();
        const category = item.category?.toLowerCase() || '';
        const brand = item.brand?.toLowerCase() || '';

        // Normalize the name similar to your ingredient matching system
        const normalizedName = name
            .replace(/\([^)]*\)/g, '') // Remove parentheses
            .replace(/\b(organic|natural|pure|fresh|raw|whole|fine|coarse|ground)\b/g, '') // Remove descriptors
            .replace(/\b(small|medium|large|extra large|jumbo|mini)\b/g, '') // Remove sizes
            .replace(/\b(can|jar|bottle|bag|box|package|container|pack)\b/g, '') // Remove packaging
            .replace(/[^\w\s]/g, ' ') // Remove special characters
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();

        // CONVENIENCE/PACKAGED MEALS - Check first
        const conveniencePatterns = [
            'hamburger helper', 'tuna helper', 'chicken helper', 'helper',
            'four cheese lasagna', 'deluxe beef stroganoff', 'cheesy italian shells',
            'frozen pizza', 'lean cuisine', 'stouffer', 'marie callender',
            'hot pocket', 'bagel bite', 'pizza roll', 'frozen meal', 'tv dinner'
        ];

        if (conveniencePatterns.some(pattern => normalizedName.includes(pattern) || brand.includes(pattern))) {
            return 'other';
        }

        // SEASONINGS/SPICES - Check early
        const seasoningPatterns = [
            'cinnamon', 'pepper', 'paprika', 'oregano', 'basil', 'thyme', 'cumin',
            'chili powder', 'red pepper flakes', 'salt', 'italian seasoning',
            'taco seasoning', 'ranch packet', 'onion soup mix', 'garlic powder',
            'onion powder', 'cayenne'
        ];

        if (seasoningPatterns.some(pattern => normalizedName.includes(pattern)) ||
            (category.includes('spice') || category.includes('seasoning')) ||
            (normalizedName.includes('salt') && !normalizedName.includes('salted')) ||
            (normalizedName.includes('pepper') && !normalizedName.includes('bell') &&
                !normalizedName.includes('sweet') && !normalizedName.includes('red pepper') &&
                !normalizedName.includes('green pepper'))) {
            return 'seasoning';
        }

        // SAUCES/CONDIMENTS
        if (normalizedName.includes('sauce') || normalizedName.includes('gravy') ||
            normalizedName.includes('dressing') || normalizedName.includes('vinegar') ||
            normalizedName.includes('mayo') || normalizedName.includes('mustard') ||
            normalizedName.includes('ketchup') || normalizedName.includes('relish') ||
            normalizedName.includes('syrup')) {
            return 'other';
        }

        // SOUPS/BROTHS
        if (normalizedName.includes('soup') || normalizedName.includes('broth') ||
            normalizedName.includes('stock')) {
            return 'other';
        }

        // STARCHES/CARBS - Using your bread variations approach
        const starchKeywords = [
            // Bread products - exact matches from your system
            'buns', 'hamburger buns', 'hot dog buns', 'bread', 'rolls', 'bagel',
            'tortilla', 'pita', 'naan', 'english muffin', 'croissant', 'biscuit',
            // Pasta - from your variations
            'pasta', 'spaghetti', 'penne', 'macaroni', 'noodle', 'shells',
            'rigatoni', 'farfalle', 'rotini', 'linguine', 'fettuccine',
            // Grains and starches
            'rice', 'potato', 'potatoes', 'sweet potato', 'quinoa', 'oats',
            'oatmeal', 'stuffing', 'barley', 'couscous', 'polenta', 'grits',
            'cornmeal', 'flour', 'crackers', 'chips'
        ];

        // Check for exact starch matches first
        if (starchKeywords.some(keyword => {
            const normalizedKeyword = keyword.replace(/\s+/g, ' ').trim();
            return normalizedName === normalizedKeyword ||
                normalizedName.includes(normalizedKeyword);
        }) && !normalizedName.includes('vinegar') && !normalizedName.includes('sauce')) {
            return 'starch';
        }

        // VEGETABLES - Comprehensive list like your ingredient variations
        const vegetableKeywords = [
            // Basic vegetables
            'broccoli', 'carrot', 'carrots', 'spinach', 'lettuce', 'corn', 'peas',
            'green beans', 'asparagus', 'zucchini', 'cauliflower', 'cabbage',
            'brussels sprouts',
            // Root vegetables and aromatics
            'onion', 'onions', 'garlic', 'ginger', 'beet', 'turnip', 'parsnip', 'radish',
            // Peppers and nightshades
            'bell pepper', 'red pepper', 'green pepper', 'yellow pepper', 'jalapeño',
            'poblano', 'tomato', 'tomatoes', 'eggplant',
            // Squash family
            'squash', 'pumpkin', 'butternut', 'acorn squash',
            // Leafy greens
            'kale', 'arugula', 'chard', 'collard',
            // Other vegetables
            'celery', 'cucumber', 'mushroom', 'mushrooms', 'artichoke', 'okra'
        ];

        if (vegetableKeywords.some(keyword => normalizedName.includes(keyword)) ||
            (category.includes('vegetable') && !normalizedName.includes('sauce') &&
                !normalizedName.includes('soup'))) {
            return 'vegetable';
        }

        // PROTEINS - More specific like your system
        const proteinKeywords = [
            // Meat cuts
            'ground beef', 'stew meat', 'ribeye', 'new york steak', 'sirloin',
            'tenderloin', 'chuck roast', 'pork chops', 'pork shoulder', 'bacon',
            'ham', 'sausage',
            // Poultry
            'chicken breast', 'chicken thigh', 'chicken wing', 'chicken drumstick',
            'whole chicken', 'turkey breast', 'ground turkey', 'ground chicken',
            // Seafood
            'salmon', 'tuna', 'cod', 'tilapia', 'shrimp', 'crab', 'lobster', 'fish',
            // Processed proteins
            'hamburger patties', 'chicken patties', 'chicken nuggets', 'hot dogs',
            'bratwurst', 'polish sausage', 'breakfast sausage', 'deli meat', 'lunch meat',
            // Other proteins
            'eggs', 'tofu', 'tempeh', 'beans', 'lentils', 'chickpeas'
        ];

        if (proteinKeywords.some(keyword => normalizedName.includes(keyword))) {
            return 'protein';
        }

        // General meat terms - but more specific
        if ((normalizedName.includes('chicken') || normalizedName.includes('beef') ||
                normalizedName.includes('pork') || normalizedName.includes('turkey') ||
                normalizedName.includes('fish') || normalizedName.includes('meat')) &&
            !normalizedName.includes('sauce') && !normalizedName.includes('gravy') &&
            !normalizedName.includes('soup') && !normalizedName.includes('helper') &&
            !normalizedName.includes('seasoning') && !normalizedName.includes('powder') &&
            !normalizedName.includes('broth') && !normalizedName.includes('stock')) {
            return 'protein';
        }

        // DAIRY - Using your variations approach
        const dairyKeywords = [
            'milk', 'whole milk', 'skim milk', 'yogurt', 'greek yogurt',
            'cream', 'heavy cream', 'sour cream', 'whipped cream', 'butter',
            'margarine', 'cottage cheese', 'cream cheese', 'ricotta',
            'cheddar', 'mozzarella', 'parmesan', 'swiss', 'gouda', 'brie', 'feta'
        ];

        if (dairyKeywords.some(keyword => normalizedName.includes(keyword)) ||
            (normalizedName.includes('cheese') && !normalizedName.includes('lasagna') &&
                !normalizedName.includes('helper') && !normalizedName.includes('sauce') &&
                !normalizedName.includes('shells') && !normalizedName.includes('macaroni'))) {
            return 'dairy';
        }

        // FATS/OILS
        const fatKeywords = [
            'olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'avocado oil',
            'nuts', 'almonds', 'walnuts', 'pecans', 'peanuts', 'cashews',
            'seeds', 'sunflower seeds', 'pumpkin seeds', 'chia seeds'
        ];

        if (fatKeywords.some(keyword => normalizedName.includes(keyword)) &&
            !normalizedName.includes('olive oil vinegar')) {
            return 'fat';
        }

        // Special case for avocado - could be fat or vegetable
        if (normalizedName.includes('avocado') && !normalizedName.includes('oil')) {
            return 'vegetable'; // Whole avocados are vegetables, avocado oil is fat
        }

        // Default to 'other'
        return 'other';
    };

    const suggestRandomMeal = () => {
        if (filteredInventory.length === 0) {
            alert('No inventory items available to create a meal suggestion');
            return;
        }

        console.log('🎲 Generating random meal suggestion...');

        const categorizedItems = {
            protein: [],
            starch: [],
            vegetable: [],
            dairy: [],
            fat: [],
            seasoning: [],
            other: []
        };

        filteredInventory.forEach(item => {
            const itemCategory = categorizeInventoryItem(item);
            if (categorizedItems[itemCategory]) {
                categorizedItems[itemCategory].push(item);
            }
        });

        const convenienceItems = categorizedItems.other.filter(item => {
            const name = item.name.toLowerCase();
            return name.includes('helper') || name.includes('lasagna') ||
                name.includes('stroganoff') || name.includes('pizza') ||
                name.includes('frozen meal');
        });

        if (convenienceItems.length > 0 && Math.random() < 0.3) {
            const convenience = selectRandomIngredient(convenienceItems, 'convenience');
            const mealItems = [{
                inventoryItemId: convenience._id,
                itemName: convenience.name,
                itemCategory: 'other',
                quantity: 1,
                unit: convenience.unit || 'item',
                notes: 'follow package directions'
            }];

            if (convenience.name.toLowerCase().includes('helper')) {
                if (categorizedItems.protein.length > 0) {
                    const protein = selectRandomIngredient(categorizedItems.protein, 'protein');
                    mealItems.push({
                        inventoryItemId: protein._id,
                        itemName: protein.name,
                        itemCategory: 'protein',
                        quantity: 1,
                        unit: protein.unit || 'item',
                        notes: 'required for helper meal'
                    });
                }
            }

            setMealData({
                name: convenience.name,
                description: `Quick convenience meal using ${convenience.name}`,
                items: mealItems,
                totalEstimatedTime: 15,
                difficulty: 'easy'
            });

            console.log(`✅ Generated convenience meal: "${convenience.name}"`);
            // Switch to meal tab to show the generated meal
            setActiveTab('meal');
            return;
        }

        const mealItems = [];
        let mealName = '';

        if (categorizedItems.protein.length > 0) {
            const protein = selectRandomIngredient(categorizedItems.protein, 'protein');
            if (protein) {
                mealItems.push({
                    inventoryItemId: protein._id,
                    itemName: protein.name,
                    itemCategory: 'protein',
                    quantity: 1,
                    unit: protein.unit || 'item',
                    notes: 'main protein'
                });
                mealName = protein.name;
            }
        }

        if (categorizedItems.starch.length > 0) {
            const starch = selectRandomIngredient(categorizedItems.starch, 'starch');
            if (starch) {
                mealItems.push({
                    inventoryItemId: starch._id,
                    itemName: starch.name,
                    itemCategory: 'starch',
                    quantity: 1,
                    unit: starch.unit || 'item',
                    notes: 'carbohydrate base'
                });
                mealName += mealName ? ` with ${starch.name}` : starch.name;
            }
        }

        if (categorizedItems.vegetable.length > 0) {
            const vegetable = selectRandomIngredient(categorizedItems.vegetable, 'vegetable');
            if (vegetable) {
                mealItems.push({
                    inventoryItemId: vegetable._id,
                    itemName: vegetable.name,
                    itemCategory: 'vegetable',
                    quantity: 1,
                    unit: vegetable.unit || 'item',
                    notes: 'steamed'
                });
                mealName += mealName ? ` and ${vegetable.name}` : vegetable.name;
            }
        }

        if (categorizedItems.dairy.length > 0 && Math.random() < 0.20) {
            const dairy = selectRandomIngredient(categorizedItems.dairy, 'dairy');
            if (dairy) {
                mealItems.push({
                    inventoryItemId: dairy._id,
                    itemName: dairy.name,
                    itemCategory: 'dairy',
                    quantity: 1,
                    unit: dairy.unit || 'item',
                    notes: 'garnish'
                });
            }
        }

        if (mealItems.length === 0) {
            const randomItems = [...filteredInventory]
                .sort(() => 0.5 - Math.random())
                .slice(0, Math.min(3, filteredInventory.length));

            randomItems.forEach(item => {
                mealItems.push({
                    inventoryItemId: item._id,
                    itemName: item.name,
                    itemCategory: categorizeInventoryItem(item),
                    quantity: 1,
                    unit: item.unit || 'item',
                    notes: ''
                });
            });

            mealName = generateMealName(mealItems);
        }

        const estimatedTime = 20 + (mealItems.length * 10);
        setMealData({
            name: mealName || 'Random Meal',
            description: `A randomly suggested meal using available ingredients: ${mealItems.map(item => item.itemName).join(', ')}`,
            items: mealItems,
            totalEstimatedTime: estimatedTime,
            difficulty: mealItems.length <= 2 ? 'easy' : mealItems.length <= 4 ? 'medium' : 'hard'
        });

        console.log(`✅ Generated random meal: "${mealName}" with ${mealItems.length} items`);

        // Switch to meal tab to show the generated meal
        setActiveTab('meal');
    };

    const addItemToMeal = (inventoryItem) => {
        const itemCategory = categorizeInventoryItem(inventoryItem);

        const newItem = {
            inventoryItemId: inventoryItem._id,
            itemName: inventoryItem.name,
            itemCategory,
            quantity: 1,
            unit: inventoryItem.unit || 'item',
            notes: ''
        };

        const updatedItems = [...mealData.items, newItem];
        const updatedMealData = {
            ...mealData,
            items: updatedItems,
            name: mealData.name || generateMealName(updatedItems)
        };

        setMealData(updatedMealData);
    };

    const removeItemFromMeal = (index) => {
        const updatedItems = mealData.items.filter((_, i) => i !== index);
        const updatedMealData = {
            ...mealData,
            items: updatedItems,
            name: updatedItems.length > 0 ? generateMealName(updatedItems) : ''
        };

        setMealData(updatedMealData);
    };

    const updateItemInMeal = (index, field, value) => {
        const updatedItems = [...mealData.items];
        updatedItems[index] = {...updatedItems[index], [field]: value};

        setMealData({
            ...mealData,
            items: updatedItems
        });
    };

    const handleSave = async () => {
        if (mealData.items.length === 0) {
            alert('Please add at least one item to your meal');
            return;
        }

        if (dietaryConflicts.length > 0) {
            const confirmSave = window.confirm(
                `This meal has potential dietary conflicts:\n\n${dietaryConflicts.join('\n')}\n\nDo you want to save it anyway?`
            );
            if (!confirmSave) return;
        }

        setSaving(true);

        try {
            const simpleMealEntry = {
                entryType: 'simple',
                simpleMeal: {
                    ...mealData,
                    description: mealData.description ||
                        `${mealData.items.map(item => `${item.notes ? item.notes + ' ' : ''}${item.itemName}`).join(', ')}`
                },
                mealType: selectedSlot.mealType,
                servings: 1,
                prepTime: Math.floor(mealData.totalEstimatedTime * 0.3),
                cookTime: Math.floor(mealData.totalEstimatedTime * 0.7),
                notes: dietaryConflicts.length > 0 ? `⚠️ Dietary conflicts noted: ${dietaryConflicts.join('; ')}` : '',
                createdAt: new Date()
            };

            await onSave(selectedSlot.day, selectedSlot.mealType, simpleMealEntry);
            onClose();
        } catch (error) {
            console.error('Error saving simple meal:', error);
            alert('Error saving meal. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
            {/* MUCH TALLER MODAL - 95vh instead of 90vh */}
            <div className="bg-white rounded-lg w-full max-w-6xl h-[95vh] overflow-hidden shadow-2xl flex flex-col">
                {/* MINIMAL Header */}
                <div className="p-3 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    🍽️ Create Simple Meal
                                </h2>
                                <p className="text-sm text-gray-600">
                                    {selectedSlot?.day} {selectedSlot?.mealType}
                                </p>
                            </div>
                            <div className="ml-4">
                                <TouchEnhancedButton
                                    onClick={suggestRandomMeal}
                                    disabled={filteredInventory.length === 0}
                                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:bg-gray-400 transition-colors flex items-center gap-2"
                                >
                                    <span>🎲</span>
                                    <span className={isMobile ? "hidden" : ""}>Random</span>
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                    <TouchEnhancedButton
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl p-1 ml-4"
                    >
                        ×
                    </TouchEnhancedButton>
                </div>

                {/* MINIMAL Dietary Conflicts Warning */}
                {showDietaryWarning && dietaryConflicts.length > 0 && (
                    <div className="mx-3 bg-orange-50 border border-orange-200 rounded p-2 flex-shrink-0">
                        <div className="flex items-center">
                            <span className="text-orange-500 mr-2">⚠️</span>
                            <div className="flex-1 text-sm text-orange-700">
                                Dietary conflicts detected
                            </div>
                            <TouchEnhancedButton
                                onClick={() => setShowDietaryWarning(false)}
                                className="text-orange-500 hover:text-orange-700 ml-2"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>
                    </div>
                )}

                {/* MASSIVE Main Content Area - This gets almost all the height */}
                <div className="flex-1 flex overflow-hidden min-h-0" style={{minHeight: '0px'}}>
                    {isMobile ? (
                        // MOBILE: Tabbed Interface with MAXIMUM HEIGHT
                        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                            {/* MINIMAL Tab Navigation */}
                            <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
                                <TouchEnhancedButton
                                    onClick={() => setActiveTab('inventory')}
                                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                                        activeTab === 'inventory'
                                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    📦 Items ({filteredInventory.length})
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => setActiveTab('meal')}
                                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                                        activeTab === 'meal'
                                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    🍽️ Meal ({mealData.items.length})
                                </TouchEnhancedButton>
                            </div>

                            {/* MASSIVE Tab Content Area */}
                            <div className="flex-1 overflow-hidden min-h-0">
                                {activeTab === 'inventory' ? (
                                    // INVENTORY TAB - MAXIMUM HEIGHT
                                    <div className="h-full flex flex-col min-h-0">
                                        {/* MINIMAL Filters */}
                                        <div className="p-2 border-b border-gray-100 flex-shrink-0">
                                            <KeyboardOptimizedInput
                                                type="text"
                                                placeholder="Search inventory..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                                            />
                                            <select
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                                            >
                                                <option value="all">All Categories</option>
                                                {MEAL_CATEGORIES.map(category => (
                                                    <option key={category.id} value={category.id}>
                                                        {category.icon} {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* MASSIVE Inventory List - Gets almost all remaining height */}
                                        <div className="flex-1 overflow-y-auto p-2 min-h-0" style={{height: '1px'}}>
                                            {loading ? (
                                                <div className="text-center py-8">
                                                    <div
                                                        className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                                    <p className="text-gray-500">Loading inventory...</p>
                                                </div>
                                            ) : filteredInventory.length === 0 ? (
                                                <div className="text-center py-8">
                                                    <p className="text-gray-500">
                                                        {inventory.length === 0
                                                            ? "No inventory items found"
                                                            : "No items match your current filters"}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {filteredInventory.map(item => {
                                                        const itemCategory = categorizeInventoryItem(item);
                                                        const categoryInfo = MEAL_CATEGORIES.find(c => c.id === itemCategory) || MEAL_CATEGORIES.find(c => c.id === 'other');

                                                        return (
                                                            <TouchEnhancedButton
                                                                key={item._id}
                                                                onClick={() => addItemToMeal(item)}
                                                                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                                                            >
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1">
                                                                        <div
                                                                            className="font-medium text-gray-900">{item.name}</div>
                                                                        {item.brand && (
                                                                            <div
                                                                                className="text-sm text-gray-600">{item.brand}</div>
                                                                        )}
                                                                        <div className="text-sm text-gray-500">
                                                                            {item.quantity} {item.unit} • {item.location}
                                                                        </div>
                                                                    </div>
                                                                    <span
                                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.color} flex-shrink-0`}>
                                                                        {categoryInfo.icon}
                                                                    </span>
                                                                </div>
                                                            </TouchEnhancedButton>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    // MEAL BUILDING TAB - MAXIMUM HEIGHT
                                    <div className="h-full flex flex-col min-h-0">
                                        {/* MINIMAL Meal Info at top */}
                                        <div className="p-2 border-b border-gray-100 flex-shrink-0">
                                            <div className="grid grid-cols-3 gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={mealData.name}
                                                    onChange={(e) => setMealData({...mealData, name: e.target.value})}
                                                    placeholder="Meal name..."
                                                    className="col-span-2 px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                                <input
                                                    type="number"
                                                    min="5"
                                                    max="180"
                                                    value={mealData.totalEstimatedTime}
                                                    onChange={(e) => setMealData({
                                                        ...mealData,
                                                        totalEstimatedTime: parseInt(e.target.value)
                                                    })}
                                                    placeholder="Time"
                                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* MASSIVE Selected Items Area */}
                                        <div className="flex-1 overflow-y-auto p-2 min-h-0" style={{height: '1px'}}>
                                            {mealData.items.length === 0 ? (
                                                <div className="text-center py-12">
                                                    <div className="text-4xl mb-4">🍽️</div>
                                                    <p className="text-gray-500 mb-4">No items added yet</p>
                                                    <TouchEnhancedButton
                                                        onClick={() => setActiveTab('inventory')}
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                                    >
                                                        ← Select Items
                                                    </TouchEnhancedButton>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {mealData.items.map((item, index) => {
                                                        const categoryInfo = MEAL_CATEGORIES.find(c => c.id === item.itemCategory) || MEAL_CATEGORIES.find(c => c.id === 'other');

                                                        const itemConflicts = dietaryConflicts.filter(conflict =>
                                                            conflict.includes(item.itemName)
                                                        );
                                                        const hasConflict = itemConflicts.length > 0;

                                                        return (
                                                            <div key={index}
                                                                 className={`border rounded-lg p-3 ${hasConflict ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-gray-50'}`}>
                                                                <div className="flex items-start justify-between mb-3">
                                                                    <div className="flex-1">
                                                                        <div
                                                                            className="font-medium text-gray-900 flex items-center mb-2">
                                                                            {hasConflict && (
                                                                                <span className="text-orange-500 mr-2"
                                                                                      title={itemConflicts.join(', ')}>⚠️</span>
                                                                            )}
                                                                            {item.itemName}
                                                                        </div>
                                                                        <span
                                                                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                                                                            {categoryInfo.icon} {categoryInfo.name}
                                                                        </span>
                                                                    </div>
                                                                    <TouchEnhancedButton
                                                                        onClick={() => removeItemFromMeal(index)}
                                                                        className="text-red-600 hover:text-red-700 p-2 text-lg"
                                                                    >
                                                                        ×
                                                                    </TouchEnhancedButton>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                                    <input
                                                                        type="number"
                                                                        min="0.1"
                                                                        step="0.1"
                                                                        value={item.quantity}
                                                                        onChange={(e) => updateItemInMeal(index, 'quantity', parseFloat(e.target.value))}
                                                                        placeholder="Qty"
                                                                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={item.unit}
                                                                        onChange={(e) => updateItemInMeal(index, 'unit', e.target.value)}
                                                                        placeholder="Unit"
                                                                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                                                                    />
                                                                </div>

                                                                <input
                                                                    type="text"
                                                                    value={item.notes}
                                                                    onChange={(e) => updateItemInMeal(index, 'notes', e.target.value)}
                                                                    placeholder="Cooking method/notes..."
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        // DESKTOP: Split Layout with MAXIMUM HEIGHT
                        <>
                            {/* Left Panel - Inventory Selection */}
                            <div className="w-1/2 border-r border-gray-200 flex flex-col min-h-0">
                                {/* MINIMAL search area */}
                                <div className="p-2 border-b border-gray-100 flex-shrink-0">
                                    <KeyboardOptimizedInput
                                        type="text"
                                        placeholder="Search inventory..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
                                    />
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                                    >
                                        <option value="all">All Categories</option>
                                        {MEAL_CATEGORIES.map(category => (
                                            <option key={category.id} value={category.id}>
                                                {category.icon} {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* MASSIVE inventory list */}
                                <div className="flex-1 overflow-y-auto p-2 min-h-0" style={{height: '1px'}}>
                                    {loading ? (
                                        <div className="text-center py-8">
                                            <div
                                                className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                            <p className="text-gray-500">Loading inventory...</p>
                                        </div>
                                    ) : filteredInventory.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-gray-500">
                                                {inventory.length === 0
                                                    ? "No inventory items found"
                                                    : "No items match your current filters"}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {filteredInventory.map(item => {
                                                const itemCategory = categorizeInventoryItem(item);
                                                const categoryInfo = MEAL_CATEGORIES.find(c => c.id === itemCategory) || MEAL_CATEGORIES.find(c => c.id === 'other');

                                                return (
                                                    <TouchEnhancedButton
                                                        key={item._id}
                                                        onClick={() => addItemToMeal(item)}
                                                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div
                                                                    className="font-medium text-gray-900">{item.name}</div>
                                                                {item.brand && (
                                                                    <div
                                                                        className="text-sm text-gray-600">{item.brand}</div>
                                                                )}
                                                                <div className="text-sm text-gray-500">
                                                                    {item.quantity} {item.unit} • {item.location}
                                                                </div>
                                                            </div>
                                                            <span
                                                                className={`px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.color} flex-shrink-0`}>
                                                                {categoryInfo.icon}
                                                            </span>
                                                        </div>
                                                    </TouchEnhancedButton>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel - Meal Builder */}
                            <div className="w-1/2 flex flex-col min-h-0">
                                {/* MINIMAL meal info */}
                                <div className="p-2 border-b border-gray-100 flex-shrink-0">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={mealData.name}
                                            onChange={(e) => setMealData({...mealData, name: e.target.value})}
                                            placeholder="Meal name..."
                                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                                        />
                                        <input
                                            type="number"
                                            min="5"
                                            max="180"
                                            value={mealData.totalEstimatedTime}
                                            onChange={(e) => setMealData({
                                                ...mealData,
                                                totalEstimatedTime: parseInt(e.target.value)
                                            })}
                                            placeholder="Time (min)"
                                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                                        />
                                    </div>
                                </div>

                                {/* MASSIVE meal items area */}
                                <div className="flex-1 overflow-y-auto p-2 min-h-0" style={{height: '1px'}}>
                                    {mealData.items.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="text-4xl mb-4">🍽️</div>
                                            <p className="text-gray-500">Add items from your inventory to build your
                                                meal</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {mealData.items.map((item, index) => {
                                                const categoryInfo = MEAL_CATEGORIES.find(c => c.id === item.itemCategory) || MEAL_CATEGORIES.find(c => c.id === 'other');

                                                const itemConflicts = dietaryConflicts.filter(conflict =>
                                                    conflict.includes(item.itemName)
                                                );
                                                const hasConflict = itemConflicts.length > 0;

                                                return (
                                                    <div key={index}
                                                         className={`border rounded-lg p-3 ${hasConflict ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-gray-50'}`}>
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex-1">
                                                                <div
                                                                    className="font-medium text-gray-900 flex items-center">
                                                                    {hasConflict && (
                                                                        <span className="text-orange-500 mr-1"
                                                                              title={itemConflicts.join(', ')}>⚠️</span>
                                                                    )}
                                                                    {item.itemName}
                                                                </div>
                                                                <span
                                                                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                                                                    {categoryInfo.icon} {categoryInfo.name}
                                                                </span>
                                                            </div>
                                                            <TouchEnhancedButton
                                                                onClick={() => removeItemFromMeal(index)}
                                                                className="text-red-600 hover:text-red-700 p-1"
                                                            >
                                                                ×
                                                            </TouchEnhancedButton>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                                            <input
                                                                type="number"
                                                                min="0.1"
                                                                step="0.1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItemInMeal(index, 'quantity', parseFloat(e.target.value))}
                                                                placeholder="Quantity"
                                                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={item.unit}
                                                                onChange={(e) => updateItemInMeal(index, 'unit', e.target.value)}
                                                                placeholder="Unit"
                                                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                            />
                                                        </div>

                                                        <div className="flex gap-1 mb-1 flex-wrap">
                                                            {COOKING_METHODS.slice(0, 4).map(method => (
                                                                <TouchEnhancedButton
                                                                    key={method}
                                                                    onClick={() => updateItemInMeal(index, 'notes', method)}
                                                                    className={`px-2 py-1 rounded text-xs ${
                                                                        item.notes === method
                                                                            ? 'bg-indigo-100 text-indigo-700'
                                                                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                                    }`}
                                                                >
                                                                    {method}
                                                                </TouchEnhancedButton>
                                                            ))}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={item.notes}
                                                            onChange={(e) => updateItemInMeal(index, 'notes', e.target.value)}
                                                            placeholder="Cooking method/notes..."
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* MINIMAL Footer */}
                <div className="p-3 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0 bg-white">
                    <TouchEnhancedButton
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={handleSave}
                        disabled={mealData.items.length === 0 || saving}
                        className={`px-4 py-2 text-white rounded-lg transition-colors ${
                            dietaryConflicts.length > 0
                                ? 'bg-orange-600 hover:bg-orange-700'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                        } disabled:bg-gray-400`}
                    >
                        {saving ? 'Saving...' : dietaryConflicts.length > 0 ? 'Save Despite Conflicts' : 'Save Meal'}
                    </TouchEnhancedButton>
                </div>
            </div>
        </div>
    );
}