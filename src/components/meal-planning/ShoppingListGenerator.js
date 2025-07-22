'use client';
// file: /src/components/meal-planning/ShoppingListGenerator.js v13 - Fixed to return results to EnhancedAIShoppingListModal instead of SmartPriceShoppingList

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiPost, apiGet } from '@/lib/api-config';
import EnhancedAIShoppingListModal from '@/components/shopping/EnhancedAIShoppingListModal';

export default function EnhancedShoppingListGenerator({
                                                          mealPlanId,
                                                          mealPlanName,
                                                          onClose,
                                                          budget = null
                                                      }) {
    const [step, setStep] = useState('options'); // options, generating, optimizing, results
    const [shoppingList, setShoppingList] = useState(null);
    const [optimization, setOptimization] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Shopping List Options
    const [options, setOptions] = useState({
        includePriceOptimization: true,
        maxStores: 2,
        prioritize: 'savings', // 'savings', 'convenience', 'quality'
        useInventoryFirst: true,
        budget: budget,
        excludeExpiredInventory: true,
        generateMealPrepSuggestions: true,
        includeSubstitutions: true
    });

    // Price Intelligence Data
    const [priceData, setPriceData] = useState({
        dealOpportunities: [],
        priceAlerts: [],
        averagePrices: {},
        storePrices: {}
    });

    const [stores, setStores] = useState([]);
    const [inventory, setInventory] = useState([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            // Load stores, inventory, and price data
            const [storesResponse, inventoryResponse, dealsResponse] = await Promise.all([
                apiGet('/api/stores'),
                apiGet('/api/inventory'),
                apiGet('/api/price-tracking/deals?limit=50')
            ]);

            const storesData = await storesResponse.json();
            const inventoryData = await inventoryResponse.json();
            const dealsData = await dealsResponse.json();

            if (storesData.success) {
                setStores(storesData.stores || []);
            }

            if (inventoryData.success) {
                setInventory(inventoryData.inventory?.items || []);
            }

            if (dealsData.success) {
                setPriceData(prev => ({
                    ...prev,
                    dealOpportunities: dealsData.deals || []
                }));
            }

        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    };

    const generateShoppingList = async () => {
        setLoading(true);
        setError('');
        setStep('generating');

        try {
            console.log('=== Generating enhanced shopping list ===');
            console.log('Meal Plan ID:', mealPlanId);
            console.log('Options:', options);

            // Step 1: Generate base shopping list from meal plan
            const baseResponse = await apiPost(`/api/meal-plans/${mealPlanId}/shopping-list`, {
                options: options
            });

            const baseData = await baseResponse.json();

            if (!baseResponse.ok) {
                throw new Error(baseData.error || 'Failed to generate base shopping list');
            }

            console.log('✅ Base shopping list generated');

            if (!options.includePriceOptimization) {
                setShoppingList(baseData.shoppingList);
                setStep('results');
                return;
            }

            // Step 2: Apply price optimization
            setStep('optimizing');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Show optimization step

            const optimizationResponse = await apiPost('/api/price-tracking/optimize-shopping', {
                items: baseData.shoppingList.items,
                budget: options.budget,
                preferredStores: stores.slice(0, options.maxStores).map(s => s.name),
                maxStores: options.maxStores,
                prioritize: options.prioritize,
                inventory: inventory,
                dealOpportunities: priceData.dealOpportunities,
                useInventoryFirst: options.useInventoryFirst
            });

            const optimizationData = await optimizationResponse.json();

            if (optimizationData.success) {
                console.log('✅ Price optimization completed');
                setOptimization(optimizationData.optimization);

                // Merge optimization data with shopping list
                const enhancedShoppingList = enhanceShoppingListWithPrices(
                    baseData.shoppingList,
                    optimizationData.optimization
                );

                setShoppingList(enhancedShoppingList);
            } else {
                console.warn('Price optimization failed, using base list');
                setShoppingList(baseData.shoppingList);
            }

            setStep('results');

        } catch (error) {
            console.error('Shopping list generation error:', error);
            setError(error.message);
            setStep('options');
        } finally {
            setLoading(false);
        }
    };

    // FIXED: Added proper null/undefined checks to prevent toLowerCase() errors
    const enhanceShoppingListWithPrices = (baseList, optimization) => {
        // Enhance the shopping list with price optimization data
        const enhancedItems = baseList.items.map(item => {
            // FIXED: Add safety checks for undefined/null values
            if (!item || !item.ingredient) {
                console.warn('Invalid item found in shopping list:', item);
                return item;
            }

            // FIXED: Ensure optimization has items array and check for undefined names
            if (!optimization || !optimization.items || !Array.isArray(optimization.items)) {
                console.warn('Invalid optimization data:', optimization);
                return item;
            }

            // Find corresponding optimized item with safe property access
            const optimizedItem = optimization.items.find(opt => {
                // FIXED: Check if opt and required properties exist before calling toLowerCase()
                if (!opt || !opt.name || !item.ingredient) {
                    return false;
                }

                const optName = opt.name.toLowerCase();
                const itemIngredient = item.ingredient.toLowerCase();

                return optName === itemIngredient || itemIngredient.includes(optName);
            });

            if (optimizedItem) {
                return {
                    ...item,
                    priceInfo: {
                        bestPrice: optimizedItem.bestPrice || null,
                        alternatives: optimizedItem.alternatives || [],
                        estimatedPrice: optimizedItem.estimatedPrice || 0,
                        dealStatus: (optimizedItem.bestPrice?.savings || 0) > 0 ? 'deal' : 'normal'
                    }
                };
            }

            return item;
        });

        return {
            ...baseList,
            items: enhancedItems,
            optimization: optimization,
            priceOptimized: true,
            totalEstimatedCost: optimization.totalCost || 0,
            totalSavings: optimization.totalSavings || 0,
            storeRecommendations: optimization.storeRecommendations || []
        };
    };

    const handleOptionChange = (key, value) => {
        setOptions(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const retryGeneration = () => {
        setError('');
        setStep('options');
    };

    // UPDATED: New save handler for unified modal
    const handleSaveToUnifiedModal = (listData) => {
        console.log('✅ Shopping list saved from unified modal:', listData);
        onClose(); // Close the generator after saving
    };

    // Step 1: Options Configuration
    if (step === 'options') {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">🛒 Smart Shopping List</h2>
                                <p className="text-sm text-gray-600">{mealPlanName}</p>
                            </div>
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 text-xl"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* Options Form */}
                    <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                        <div className="space-y-6">
                            {/* Price Optimization */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-blue-900">💰 Price Intelligence</h3>
                                        <p className="text-sm text-blue-700">Find the best deals and optimize costs</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={options.includePriceOptimization}
                                            onChange={(e) => handleOptionChange('includePriceOptimization', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {options.includePriceOptimization && (
                                    <div className="space-y-4">
                                        {/* Budget */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Budget Limit (Optional)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={options.budget || ''}
                                                    onChange={(e) => handleOptionChange('budget', parseFloat(e.target.value) || null)}
                                                    className="pl-8 w-full border border-gray-300 rounded-lg px-3 py-2"
                                                    placeholder="No limit"
                                                />
                                            </div>
                                        </div>

                                        {/* Priority */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Optimization Priority
                                            </label>
                                            <select
                                                value={options.prioritize}
                                                onChange={(e) => handleOptionChange('prioritize', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                            >
                                                <option value="savings">💰 Maximum Savings</option>
                                                <option value="convenience">⚡ Convenience (Fewer Stores)</option>
                                                <option value="quality">⭐ Quality Products</option>
                                            </select>
                                        </div>

                                        {/* Max Stores */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Maximum Stores to Visit
                                            </label>
                                            <select
                                                value={options.maxStores}
                                                onChange={(e) => handleOptionChange('maxStores', parseInt(e.target.value))}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                            >
                                                <option value={1}>1 Store (Most Convenient)</option>
                                                <option value={2}>2 Stores (Balanced)</option>
                                                <option value={3}>3 Stores (Maximum Savings)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Inventory Integration */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h3 className="font-semibold text-green-900 mb-3">📦 Inventory Integration</h3>

                                <div className="space-y-3">
                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={options.useInventoryFirst}
                                            onChange={(e) => handleOptionChange('useInventoryFirst', e.target.checked)}
                                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <div>
                                            <div className="font-medium text-green-900">Use Inventory Items First</div>
                                            <div className="text-sm text-green-700">Skip items you already have</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={options.excludeExpiredInventory}
                                            onChange={(e) => handleOptionChange('excludeExpiredInventory', e.target.checked)}
                                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <div>
                                            <div className="font-medium text-green-900">Exclude Expired Items</div>
                                            <div className="text-sm text-green-700">Don't use expired inventory</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Additional Options */}
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h3 className="font-semibold text-purple-900 mb-3">⚙️ Additional Features</h3>

                                <div className="space-y-3">
                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={options.includeSubstitutions}
                                            onChange={(e) => handleOptionChange('includeSubstitutions', e.target.checked)}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <div>
                                            <div className="font-medium text-purple-900">Smart Substitutions</div>
                                            <div className="text-sm text-purple-700">Suggest cheaper alternatives</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={options.generateMealPrepSuggestions}
                                            onChange={(e) => handleOptionChange('generateMealPrepSuggestions', e.target.checked)}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <div>
                                            <div className="font-medium text-purple-900">Meal Prep Suggestions</div>
                                            <div className="text-sm text-purple-700">Tips for batch cooking</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            {priceData.dealOpportunities.length > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-yellow-900 mb-2">📊 Available Intelligence</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="font-medium text-yellow-900">Current Deals</div>
                                            <div className="text-yellow-700">{priceData.dealOpportunities.length} items on sale</div>
                                        </div>
                                        <div>
                                            <div className="font-medium text-yellow-900">Inventory Items</div>
                                            <div className="text-yellow-700">{inventory.length} items available</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={generateShoppingList}
                            disabled={loading}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 font-medium"
                        >
                            {options.includePriceOptimization ? '🚀 Generate Smart List' : '📝 Generate List'}
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Generation States (generating, optimizing)
    if (step === 'generating' || step === 'optimizing') {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {step === 'generating' ? '📝 Generating Shopping List...' : '💰 Optimizing Prices...'}
                    </h3>

                    <div className="space-y-2 text-sm text-gray-600">
                        <p>✓ Analyzing meal plan ingredients</p>
                        <p>✓ Checking your inventory</p>
                        {step === 'optimizing' && (
                            <>
                                <p>✓ Finding best deals and prices</p>
                                <p>🔄 Optimizing store recommendations...</p>
                            </>
                        )}
                    </div>

                    <div className="mt-6">
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                            Cancel
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        );
    }

    // Step 3: Error State
    if (error) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
                    <div className="text-4xl mb-4">❌</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Generation Failed</h3>
                    <p className="text-gray-600 mb-6">{error}</p>

                    <div className="flex space-x-3 justify-center">
                        <TouchEnhancedButton
                            onClick={retryGeneration}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Try Again
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                            Close
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        );
    }

    // NEW: Step 4: Results - Show Enhanced AI Shopping List Modal with Smart Price features
    if (step === 'results' && shoppingList) {
        // Determine the appropriate mode based on optimization
        const initialMode = options.includePriceOptimization ? 'unified' : 'enhanced';

        // Convert enhanced shopping list items to array format for the unified modal
        const convertedItems = [];
        if (shoppingList.items) {
            Object.entries(shoppingList.items).forEach(([category, items]) => {
                items.forEach(item => {
                    convertedItems.push({
                        ...item,
                        category: category,
                        // Add price optimization data if available
                        priceOptimized: !!item.priceInfo,
                        estimatedPrice: item.priceInfo?.estimatedPrice || item.estimatedPrice || 0,
                        dealStatus: item.priceInfo?.dealStatus || 'normal',
                        alternatives: item.priceInfo?.alternatives || [],
                        // Ensure required fields exist
                        id: item.id || `${item.ingredient || item.name}-${Date.now()}`,
                        name: item.name || item.ingredient,
                        ingredient: item.ingredient || item.name,
                        quantity: item.quantity || item.amount || 1,
                        unit: item.unit || '',
                        selected: item.selected !== false,
                        checked: item.checked || false
                    });
                });
            });
        }

        console.log('🚀 Opening Enhanced AI Shopping List Modal with unified data:', {
            mode: initialMode,
            itemsCount: convertedItems.length,
            priceOptimized: options.includePriceOptimization,
            optimization: optimization
        });

        return (
            <EnhancedAIShoppingListModal
                isOpen={true}
                onClose={onClose}
                // Pass both the original shopping list (for enhanced AI features)
                shoppingList={shoppingList}
                // And the converted items (for smart price features)
                initialItems={convertedItems}
                // Smart Price props
                storePreference={stores.length > 0 ? stores[0].name : ''}
                budgetLimit={options.budget}
                optimization={optimization}
                onSave={handleSaveToUnifiedModal}
                // Enhanced AI props
                title={options.includePriceOptimization ? '🚀 Ultimate Shopping Assistant' : '🤖 Enhanced AI Shopping'}
                subtitle={options.includePriceOptimization ?
                    `Smart list for ${mealPlanName} with price optimization` :
                    `AI-optimized list for ${mealPlanName}`
                }
                sourceMealPlanId={mealPlanId}
                showRefresh={false}
                // Force the appropriate initial mode
                initialMode={initialMode}
            />
        );
    }

    return null;
}