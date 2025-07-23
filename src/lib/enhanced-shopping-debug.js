// file: /src/lib/enhanced-shopping-debug.js - Debug utilities to fix the issues

/**
 * DEBUG UTILITIES FOR ENHANCED SHOPPING MODAL
 *
 * Key issues identified and fixes:
 * 1. Infinite loops from useEffect dependencies
 * 2. Duplicate categories (numeric + named)
 * 3. Category changes not persisting
 * 4. Missing AI integration
 */

// 1. FIX INFINITE LOOPS
export const debugUseEffectDependencies = () => {
    console.log(`
🔧 USEEFFECT DEPENDENCY FIXES:

PROBLEM: useEffect with functions in dependencies recreated every render
SOLUTION: Wrap functions in useCallback with proper dependencies

❌ BAD:
useEffect(() => {
    processData();
}, [processData]); // processData recreated every render

✅ GOOD:
const processData = useCallback(() => {
    // logic
}, [dependency1, dependency2]);

useEffect(() => {
    processData();
}, [processData]); // processData stable now
`);
};

// 2. FIX DUPLICATE CATEGORIES
export const fixDuplicateCategories = (shoppingList) => {
    console.log('🔧 Fixing duplicate categories...');

    if (!shoppingList?.items) return shoppingList;

    const fixedItems = {};

    Object.entries(shoppingList.items).forEach(([category, items]) => {
        // Skip numeric categories completely
        if (/^\d+$/.test(category)) {
            console.log(`🗑️ Removing numeric category: ${category}`);
            // Move items to proper categories
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const properCategory = getAISuggestedCategory(item.ingredient || item.name);
                    if (!fixedItems[properCategory]) {
                        fixedItems[properCategory] = [];
                    }
                    fixedItems[properCategory].push({
                        ...item,
                        category: properCategory
                    });
                });
            }
            return; // Skip this category
        }

        // Keep valid categories
        if (category && Array.isArray(items) && items.length > 0) {
            fixedItems[category] = items.map(item => ({
                ...item,
                category: category
            }));
        }
    });

    console.log('✅ Categories fixed:', Object.keys(fixedItems));

    return {
        ...shoppingList,
        items: fixedItems
    };
};

// 3. PERSISTENT CATEGORY PREFERENCES
export class CategoryPreferenceManager {
    constructor(userId) {
        this.userId = userId;
        this.storageKey = `item-category-preferences-${userId}`;
    }

    // Save preference immediately when item is moved
    savePreference(itemName, category) {
        try {
            const preferences = this.loadPreferences();
            const normalizedName = this.normalizeItemName(itemName);
            preferences[normalizedName] = category;

            localStorage.setItem(this.storageKey, JSON.stringify(preferences));
            console.log(`💾 Saved preference: ${normalizedName} → ${category}`);

            // Also save to backend for persistence across devices
            this.saveToBackend(normalizedName, category);
        } catch (error) {
            console.error('Error saving category preference:', error);
        }
    }

    loadPreferences() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading preferences:', error);
            return {};
        }
    }

    normalizeItemName(itemName) {
        return itemName.toLowerCase()
            .replace(/\b(fresh|frozen|canned|dried|ground|chopped|sliced|diced)\b/g, '')
            .trim();
    }

    async saveToBackend(itemName, category) {
        try {
            await fetch('/api/user/category-preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    itemName,
                    category,
                    userId: this.userId
                })
            });
        } catch (error) {
            console.warn('Failed to save preference to backend:', error);
        }
    }
}

// 4. AI INTEGRATION DEBUGGING
export const debugAIIntegration = () => {
    console.log(`
🤖 AI INTEGRATION DEBUG CHECKLIST:

1. Check Modal.com endpoints are reachable:
   - https://docbear71--smart-inventory-manager-health.modal.run

2. Verify API route exists:
   - /api/integrations/smart-inventory/suggest

3. Check console for AI calls:
   - "🧠 Getting AI smart suggestions from Modal.com..."
   - "✅ AI suggestions received"

4. Test Modal.com health:
   - /api/integrations/modal-health

5. Verify modalBridge is imported correctly:
   - modalBridge.suggestInventoryItems(data)
`);
};

// 5. RENDER LOOP DEBUGGING
export const debugRenderLoops = () => {
    const renderCount = React.useRef(0);
    renderCount.current += 1;

    if (renderCount.current > 10) {
        console.warn(`🔥 EXCESSIVE RENDERS: Component rendered ${renderCount.current} times`);
        console.trace('Render stack trace');
    }

    // Log every 5th render to track frequency
    if (renderCount.current % 5 === 0) {
        console.log(`🔄 Render count: ${renderCount.current}`);
    }
};

// 6. STATE DEBUGGING
export const debugShoppingListState = (shoppingList, componentName) => {
    if (!shoppingList) {
        console.warn(`⚠️ ${componentName}: shoppingList is null/undefined`);
        return;
    }

    console.log(`🔍 ${componentName} Shopping List Debug:`, {
        hasItems: !!shoppingList.items,
        itemsType: typeof shoppingList.items,
        isArray: Array.isArray(shoppingList.items),
        itemsKeys: shoppingList.items ? Object.keys(shoppingList.items) : 'none'
    });

    // Check for numeric categories
    if (shoppingList.items && typeof shoppingList.items === 'object') {
        const numericCategories = Object.keys(shoppingList.items).filter(key => /^\d+$/.test(key));
        if (numericCategories.length > 0) {
            console.warn(`⚠️ Found numeric categories:`, numericCategories);
        }
    }
};

// 7. USEEFFECT MONITORING
export const useEffectLogger = (effectName, dependencies) => {
    React.useEffect(() => {
        console.log(`🔄 useEffect [${effectName}] triggered with deps:`, dependencies);

        return () => {
            console.log(`🧹 useEffect [${effectName}] cleanup`);
        };
    }, dependencies);
};

// 8. FIX CATEGORY MOVEMENT PERSISTENCE
export const createPersistentCategoryMover = (userId) => {
    const preferenceManager = new CategoryPreferenceManager(userId);

    return {
        moveItem: async (item, fromCategory, toCategory, updateStateCallback) => {
            // 1. Update local state immediately
            updateStateCallback(item, fromCategory, toCategory);

            // 2. Save preference for future use
            preferenceManager.savePreference(item.ingredient || item.name, toCategory);

            // 3. Log the action
            console.log(`✅ Item "${item.ingredient || item.name}" moved from ${fromCategory} to ${toCategory}`);
        },

        getSuggestedCategory: (itemName) => {
            const preferences = preferenceManager.loadPreferences();
            const normalizedName = preferenceManager.normalizeItemName(itemName);

            return preferences[normalizedName] || suggestCategoryForItem(itemName);
        }
    };
};

// 9. MODAL.COM CONNECTION TEST
export const testModalConnection = async () => {
    try {
        console.log('🧪 Testing Modal.com connection...');

        const healthResponse = await fetch('/api/integrations/modal-health');
        const healthData = await healthResponse.json();

        console.log('📊 Modal.com Health:', healthData);

        if (healthData.healthy) {
            console.log('✅ Modal.com services are healthy');

            // Test smart inventory endpoint
            const testItems = [
                { name: 'milk', category: 'General', quantity: 1 }
            ];

            const suggestResponse = await fetch('/api/integrations/smart-inventory/suggest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: testItems,
                    userId: 'test-user',
                    context: 'debug_test'
                })
            });

            const suggestData = await suggestResponse.json();
            console.log('🧠 AI Suggestions Test:', suggestData);

        } else {
            console.error('❌ Modal.com services are unhealthy');
        }

    } catch (error) {
        console.error('❌ Modal.com connection test failed:', error);
    }
};

// Helper function that needs to be imported
const getAISuggestedCategory = (itemName) => {
    // This should match the actual function in your component
    return 'Other'; // Fallback
};

const suggestCategoryForItem = (itemName) => {
    // This should match the actual function from groceryCategories
    return 'Other'; // Fallback
};