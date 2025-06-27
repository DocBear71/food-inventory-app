'use client';
// file: /src/components/meal-planning/SimpleMealBuilder.js v3 - FIXED SCROLLING ISSUES

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { getApiUrl } from '@/lib/api-config';

const MEAL_CATEGORIES = [
    { id: 'protein', name: 'Protein', icon: '🥩', color: 'bg-red-50 border-red-200 text-red-700' },
    { id: 'starch', name: 'Starch/Carbs', icon: '🥔', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    { id: 'vegetable', name: 'Vegetables', icon: '🥦', color: 'bg-green-50 border-green-200 text-green-700' },
    { id: 'dairy', name: 'Dairy', icon: '🧀', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { id: 'fat', name: 'Fats/Oils', icon: '🫒', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { id: 'seasoning', name: 'Seasonings', icon: '🧂', color: 'bg-gray-50 border-gray-200 text-gray-700' },
    { id: 'other', name: 'Other/Convenience', icon: '📦', color: 'bg-gray-50 border-gray-200 text-gray-700' }
];

const COOKING_METHODS = [
    'grilled', 'roasted', 'baked', 'sautéed', 'steamed', 'boiled', 'fried', 'raw'
];

export default function SimpleMealBuilder({
                                              isOpen,
                                              onClose,
                                              onSave,
                                              selectedSlot, // { day, mealType }
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

    const [mealData, setMealData] = useState({
        name: '',
        description: '',
        items: [],
        totalEstimatedTime: 30,
        difficulty: 'easy'
    });

    // ... (keep all existing functions: selectRandomIngredient, filterInventoryByDietary, checkMealConflicts, etc.)
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

            if (initialMeal?.simpleMeal) {
                setMealData(initialMeal.simpleMeal);
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
            const response = await fetch(getApiUrl('/api/inventory'));
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

        console.log(`🏷️ Categorizing SimpleMealBuilder item: "${item.name}"`);

        const conveniencePatterns = [
            'hamburger helper', 'tuna helper', 'chicken helper',
            'four cheese lasagna', 'deluxe beef stroganoff', 'cheesy italian shells',
            'frozen pizza', 'lean cuisine', 'stouffer', 'marie callender'
        ];

        if (conveniencePatterns.some(pattern => name.includes(pattern) || brand.includes(pattern))) {
            console.log(`✅ CONVENIENCE MEAL: "${item.name}"`);
            return 'other';
        }

        const seasoningPatterns = [
            'ground cinnamon', 'ground pepper', 'white pepper', 'black pepper',
            'garlic powder', 'onion powder', 'paprika', 'oregano', 'basil',
            'thyme', 'cumin', 'chili powder', 'red pepper flakes', 'kosher salt',
            'coarse salt', 'cayenne pepper'
        ];

        if (seasoningPatterns.some(pattern => name.includes(pattern)) ||
            (category.includes('spice') || category.includes('seasoning')) ||
            (name.includes('salt') && !name.includes('salted')) ||
            (name.includes('pepper') && !name.includes('bell') && !name.includes('sweet'))) {
            console.log(`✅ SEASONING: "${item.name}"`);
            return 'seasoning';
        }

        if (name.includes('sauce') || name.includes('gravy') || name.includes('dressing') ||
            name.includes('vinegar') || name.includes('mayo') || name.includes('mustard') ||
            name.includes('ketchup')) {
            console.log(`✅ SAUCE/CONDIMENT: "${item.name}"`);
            return 'other';
        }

        if (name.includes('soup') || name.includes('broth') || name.includes('stock')) {
            console.log(`✅ SOUP: "${item.name}"`);
            return 'other';
        }

        const convenienceProteinPatterns = [
            'hamburger patties', 'chicken patties', 'chicken nuggets', 'hot dogs',
            'bratwurst', 'polish sausage', 'breakfast sausage'
        ];

        if (convenienceProteinPatterns.some(pattern => name.includes(pattern))) {
            console.log(`✅ CONVENIENCE PROTEIN: "${item.name}"`);
            return 'protein';
        }

        const proteinPatterns = [
            'ground beef', 'stew meat', 'ribeye', 'new york steak', 'pork chops',
            'chicken breast', 'chicken wing', 'cubed steak', 'bacon', 'ham',
            'salmon', 'tuna', 'shrimp', 'eggs'
        ];

        if (proteinPatterns.some(pattern => name.includes(pattern))) {
            console.log(`✅ PROTEIN (exact): "${item.name}"`);
            return 'protein';
        }

        if ((name.includes('chicken') || name.includes('beef') || name.includes('pork') ||
                name.includes('turkey') || name.includes('fish') || name.includes('meat')) &&
            !name.includes('sauce') && !name.includes('gravy') && !name.includes('soup') &&
            !name.includes('helper') && !name.includes('seasoning') && !name.includes('powder')) {
            console.log(`✅ PROTEIN (general): "${item.name}"`);
            return 'protein';
        }

        if (name.includes('buns') || name.includes('bread') || name.includes('rolls') ||
            name.includes('bagel') || name.includes('tortilla') || name.includes('pita')) {
            console.log(`✅ BREAD/STARCH: "${item.name}"`);
            return 'starch';
        }

        if (name.includes('pasta') || name.includes('spaghetti') || name.includes('penne') ||
            name.includes('macaroni') || name.includes('noodle') || name.includes('shells') ||
            name.includes('rigatoni') || name.includes('farfalle') || name.includes('rotini')) {
            console.log(`✅ PASTA/STARCH: "${item.name}"`);
            return 'starch';
        }

        if ((name.includes('rice') || name.includes('potato') || name.includes('quinoa') ||
                name.includes('oats') || name.includes('stuffing') || name.includes('barley') ||
                name.includes('couscous')) &&
            !name.includes('vinegar') && !name.includes('sauce')) {
            console.log(`✅ STARCH: "${item.name}"`);
            return 'starch';
        }

        if ((name.includes('milk') || name.includes('yogurt') || name.includes('cream') ||
                name.includes('butter') || name.includes('cottage cheese') || name.includes('sour cream')) ||
            (name.includes('cheese') && !name.includes('lasagna') && !name.includes('helper') &&
                !name.includes('sauce') && !name.includes('shells'))) {
            console.log(`✅ DAIRY: "${item.name}"`);
            return 'dairy';
        }

        const vegetablePatterns = [
            'broccoli', 'carrot', 'spinach', 'lettuce', 'corn', 'peas',
            'green beans', 'asparagus', 'zucchini', 'cauliflower', 'cabbage', 'brussels'
        ];

        if (vegetablePatterns.some(pattern => name.includes(pattern)) ||
            (category.includes('vegetable') && !name.includes('sauce') &&
                !name.includes('mushroom') && !name.includes('onion') &&
                !name.includes('pepper') && !name.includes('celery') && !name.includes('tomato'))) {
            console.log(`✅ VEGETABLE: "${item.name}"`);
            return 'vegetable';
        }

        if (name.includes('oil') && !name.includes('olive oil vinegar') ||
            name.includes('avocado') || name.includes('nuts') || name.includes('seeds')) {
            console.log(`✅ FAT: "${item.name}"`);
            return 'fat';
        }

        console.log(`✅ OTHER: "${item.name}"`);
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

        console.log('📊 Available items by category:', Object.fromEntries(
            Object.entries(categorizedItems).map(([cat, items]) => [cat, items.length])
        ));

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
        updatedItems[index] = { ...updatedItems[index], [field]: value };

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                                    🍽️ Create Simple Meal
                                </h2>
                                <p className="text-sm text-gray-600">
                                    Build a meal from your inventory items for {selectedSlot?.day} {selectedSlot?.mealType}
                                </p>
                                {(userDietaryRestrictions.length > 0 || userAvoidIngredients.length > 0) && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        {userDietaryRestrictions.length > 0 && (
                                            <span>Diet: {userDietaryRestrictions.join(', ')}</span>
                                        )}
                                        {userDietaryRestrictions.length > 0 && userAvoidIngredients.length > 0 && <span> • </span>}
                                        {userAvoidIngredients.length > 0 && (
                                            <span>Avoiding: {userAvoidIngredients.join(', ')}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="ml-4">
                                <TouchEnhancedButton
                                    onClick={suggestRandomMeal}
                                    disabled={filteredInventory.length === 0}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:bg-gray-400 transition-colors flex items-center gap-2"
                                >
                                    <span>🎲</span>
                                    <span>Suggest Random Meal</span>
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                    <TouchEnhancedButton
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl p-1 ml-4"
                    >
                        ×
                    </TouchEnhancedButton>
                </div>

                {/* Dietary Conflicts Warning */}
                {showDietaryWarning && dietaryConflicts.length > 0 && (
                    <div className="mx-6 mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 flex-shrink-0">
                        <div className="flex items-start">
                            <span className="text-orange-500 mr-2">⚠️</span>
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-orange-800">Dietary Conflicts Detected</h4>
                                <ul className="text-sm text-orange-700 mt-1 space-y-1">
                                    {dietaryConflicts.map((conflict, index) => (
                                        <li key={index}>• {conflict}</li>
                                    ))}
                                </ul>
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

                {/* Main Content - FIXED SCROLLING */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel - Inventory Selection - FIXED HEIGHT AND SCROLLING */}
                    <div className="w-1/2 border-r border-gray-200 flex flex-col">
                        {/* Search and Filters - Fixed at top */}
                        <div className="p-4 border-b border-gray-100 flex-shrink-0">
                            <h3 className="font-medium text-gray-900 mb-3">Select from Inventory</h3>

                            {inventory.length > 0 && filteredInventory.length < inventory.length && (
                                <div className="mb-3 text-sm text-orange-600">
                                    Showing {filteredInventory.length} of {inventory.length} items (filtered by dietary preferences)
                                </div>
                            )}

                            {/* Search */}
                            <input
                                type="text"
                                placeholder="Search inventory..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3"
                            />

                            {/* Category Filter */}
                            <div className="flex flex-wrap gap-2">
                                <TouchEnhancedButton
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        selectedCategory === 'all'
                                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    All
                                </TouchEnhancedButton>
                                {MEAL_CATEGORIES.map(category => (
                                    <TouchEnhancedButton
                                        key={category.id}
                                        onClick={() => setSelectedCategory(category.id)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                                            selectedCategory === category.id
                                                ? category.color
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        <span>{category.icon}</span>
                                        <span>{category.name}</span>
                                    </TouchEnhancedButton>
                                ))}
                            </div>
                        </div>

                        {/* Inventory Items - FIXED: Proper scrollable area */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                    <p className="text-gray-500">Loading inventory...</p>
                                </div>
                            ) : filteredInventory.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">
                                        {inventory.length === 0
                                            ? "No inventory items found"
                                            : "No items match your current filters"}
                                    </p>
                                    {inventory.length > filteredInventory.length && (
                                        <p className="text-xs text-orange-600 mt-2">
                                            {inventory.length - filteredInventory.length} items filtered by dietary preferences
                                        </p>
                                    )}
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
                                                        <div className="font-medium text-gray-900">{item.name}</div>
                                                        {item.brand && (
                                                            <div className="text-sm text-gray-600">{item.brand}</div>
                                                        )}
                                                        <div className="text-sm text-gray-500">
                                                            {item.quantity} {item.unit} • {item.location}
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                                                        {categoryInfo.icon} {categoryInfo.name}
                                                    </span>
                                                </div>
                                            </TouchEnhancedButton>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Meal Builder - FIXED HEIGHT AND SCROLLING */}
                    <div className="w-1/2 flex flex-col">
                        {/* Meal Info - Fixed at top */}
                        <div className="p-4 border-b border-gray-100 flex-shrink-0">
                            <h3 className="font-medium text-gray-900 mb-3">Build Your Meal</h3>

                            {/* Meal Name */}
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Meal Name
                                </label>
                                <input
                                    type="text"
                                    value={mealData.name}
                                    onChange={(e) => setMealData({...mealData, name: e.target.value})}
                                    placeholder="Auto-generated from items"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                            </div>

                            {/* Estimated Time */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Est. Time (min)
                                    </label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="180"
                                        value={mealData.totalEstimatedTime}
                                        onChange={(e) => setMealData({...mealData, totalEstimatedTime: parseInt(e.target.value)})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Difficulty
                                    </label>
                                    <select
                                        value={mealData.difficulty}
                                        onChange={(e) => setMealData({...mealData, difficulty: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Selected Items - FIXED: Much larger scrollable area */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {mealData.items.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-4">🍽️</div>
                                    <p className="text-gray-500">Add items from your inventory to build your meal</p>
                                    {(userDietaryRestrictions.length > 0 || userAvoidIngredients.length > 0) && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Items are filtered based on your dietary preferences
                                        </p>
                                    )}
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
                                            <div key={index} className={`border rounded-lg p-3 ${hasConflict ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-gray-50'}`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900 flex items-center">
                                                            {hasConflict && (
                                                                <span className="text-orange-500 mr-1" title={itemConflicts.join(', ')}>⚠️</span>
                                                            )}
                                                            {item.itemName}
                                                        </div>
                                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                                                            {categoryInfo.icon} {categoryInfo.name}
                                                        </span>
                                                        {hasConflict && (
                                                            <div className="text-xs text-orange-600 mt-1">
                                                                {itemConflicts[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <TouchEnhancedButton
                                                        onClick={() => removeItemFromMeal(index)}
                                                        className="text-red-600 hover:text-red-700 p-1"
                                                    >
                                                        ×
                                                    </TouchEnhancedButton>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 mb-2">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Quantity
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0.1"
                                                            step="0.1"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItemInMeal(index, 'quantity', parseFloat(e.target.value))}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Unit
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={item.unit}
                                                            onChange={(e) => updateItemInMeal(index, 'unit', e.target.value)}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Cooking Method/Notes
                                                    </label>
                                                    <div className="flex gap-1 mb-1 flex-wrap">
                                                        {COOKING_METHODS.map(method => (
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
                                                        placeholder="e.g., grilled, seasoned with salt"
                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Description - Fixed at bottom */}
                        <div className="p-4 border-t border-gray-100 flex-shrink-0">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Optional)
                            </label>
                            <textarea
                                value={mealData.description}
                                onChange={(e) => setMealData({...mealData, description: e.target.value})}
                                placeholder="Brief description of the meal..."
                                rows="2"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
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