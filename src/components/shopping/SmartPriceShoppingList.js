'use client';
// file: /src/components/shopping/SmartPriceShoppingList.js v2 - Enhanced version combining existing features with price intelligence

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';
import { apiPost, apiGet } from '@/lib/api-config';

export default function SmartPriceShoppingList({
                                                   initialItems = [],
                                                   storePreference = '',
                                                   budgetLimit = null,
                                                   onSave,
                                                   onClose,
                                                   optimization = null,
                                                   shoppingList = null
                                               }) {
    // Enhanced state combining both versions
    const [items, setItems] = useState([]);
    const [selectedStore, setSelectedStore] = useState(storePreference);
    const [stores, setStores] = useState([]);
    const [priceComparison, setPriceComparison] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);

    // Enhanced price intelligence state
    const [priceMode, setPriceMode] = useState('smart'); // smart, budget, deals
    const [budgetTracking, setBudgetTracking] = useState({
        current: 0,
        limit: budgetLimit,
        remaining: budgetLimit
    });
    const [priceAnalysis, setPriceAnalysis] = useState({
        totalSavings: 0,
        bestDeals: [],
        priceAlerts: [],
        storeComparison: {}
    });
    const [showOptimizationDetails, setShowOptimizationDetails] = useState(false);

    useEffect(() => {
        processInitialItems();
        loadStores();
    }, [initialItems, optimization]);

    useEffect(() => {
        if (items.length > 0 && selectedStore) {
            optimizeShoppingList();
        }
    }, [items, selectedStore]);

    const processInitialItems = () => {
        // Handle both array format and enhanced format
        let processedItems = [];

        if (Array.isArray(initialItems)) {
            processedItems = initialItems.map((item, index) => {
                // Support both simple and enhanced item formats
                if (typeof item === 'string') {
                    return {
                        id: `item-${index}`,
                        name: item,
                        ingredient: item,
                        checked: false,
                        selected: true,
                        quantity: 1,
                        unit: '',
                        estimatedPrice: 0,
                        actualPrice: null,
                        priceOptimized: false,
                        dealStatus: 'normal',
                        alternatives: []
                    };
                } else {
                    return {
                        id: item.id || `item-${index}`,
                        name: item.name || item.ingredient,
                        ingredient: item.ingredient || item.name,
                        checked: item.checked || false,
                        selected: item.selected !== false,
                        quantity: item.quantity || item.amount || 1,
                        unit: item.unit || '',
                        estimatedPrice: item.estimatedPrice || item.priceInfo?.estimatedPrice || 0,
                        actualPrice: item.actualPrice || null,
                        priceOptimized: item.priceOptimized || !!item.priceInfo?.bestPrice,
                        dealStatus: item.dealStatus || item.priceInfo?.dealStatus || 'normal',
                        alternatives: item.alternatives || item.priceInfo?.alternatives || [],
                        recipes: item.recipes || [],
                        category: item.category || 'other',
                        inInventory: item.inInventory || false,
                        inventoryItem: item.inventoryItem || null
                    };
                }
            });
        }

        setItems(processedItems);
        calculateBudgetTracking(processedItems);

        if (optimization) {
            setPriceAnalysis({
                totalSavings: optimization.totalSavings || 0,
                bestDeals: optimization.bestDeals || optimization.dealAlerts || [],
                priceAlerts: optimization.priceAlerts || [],
                storeComparison: optimization.storeComparison || {}
            });
        }
    };

    const loadStores = async () => {
        try {
            const response = await apiGet('/api/stores');
            const data = await response.json();
            if (data.success) {
                setStores(data.stores || []);
            }
        } catch (error) {
            console.error('Error loading stores:', error);
        }
    };

    const optimizeShoppingList = async () => {
        if (items.length === 0) return;

        setLoading(true);
        try {
            // Get price data for all items
            const pricePromises = items.map(async (item) => {
                try {
                    const response = await fetch(`/api/shopping/price-lookup?item=${encodeURIComponent(item.name)}&store=${selectedStore}`);
                    const data = await response.json();
                    return {
                        itemName: item.name,
                        prices: data.success ? data.prices : [],
                        currentBestPrice: data.currentBestPrice || null,
                        inventoryMatch: data.inventoryMatch || null
                    };
                } catch (error) {
                    console.error(`Error fetching price for ${item.name}:`, error);
                    return { itemName: item.name, prices: [], currentBestPrice: null };
                }
            });

            const priceData = await Promise.all(pricePromises);

            // Create price comparison object
            const comparison = {};
            priceData.forEach(item => {
                comparison[item.itemName] = item;
            });
            setPriceComparison(comparison);

            // Calculate optimization recommendations
            const optimizationResult = calculateOptimization(priceData, selectedStore, budgetTracking.limit);

            // Merge with existing optimization data
            setPriceAnalysis(prev => ({
                ...prev,
                ...optimizationResult,
                bestDeals: [...(prev.bestDeals || []), ...(optimizationResult.dealAlerts || [])],
                storeRecommendations: optimizationResult.storeRecommendations || []
            }));

        } catch (error) {
            console.error('Error optimizing shopping list:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateOptimization = (priceData, store, budget) => {
        let totalCost = 0;
        let potentialSavings = 0;
        let dealAlerts = [];
        let budgetWarnings = [];
        let storeRecommendations = [];

        // Calculate costs and find deals
        priceData.forEach(item => {
            const currentPrice = item.currentBestPrice?.price || 0;
            const avgPrice = item.prices.length > 0
                ? item.prices.reduce((sum, p) => sum + p.price, 0) / item.prices.length
                : currentPrice;

            totalCost += currentPrice;

            // Check for good deals (20% below average)
            if (currentPrice > 0 && avgPrice > 0 && currentPrice <= avgPrice * 0.8) {
                dealAlerts.push({
                    item: item.itemName,
                    currentPrice,
                    avgPrice,
                    savings: avgPrice - currentPrice,
                    savingsPercent: ((avgPrice - currentPrice) / avgPrice * 100).toFixed(1)
                });
            }

            // Find better prices at other stores
            const betterPrices = item.prices.filter(p =>
                p.store !== store && p.price < currentPrice
            ).sort((a, b) => a.price - b.price);

            if (betterPrices.length > 0) {
                const bestAlternative = betterPrices[0];
                potentialSavings += currentPrice - bestAlternative.price;
                storeRecommendations.push({
                    item: item.itemName,
                    currentStore: store,
                    currentPrice,
                    betterStore: bestAlternative.store,
                    betterPrice: bestAlternative.price,
                    savings: currentPrice - bestAlternative.price
                });
            }
        });

        // Budget analysis
        if (budget && totalCost > budget) {
            budgetWarnings.push({
                type: 'over_budget',
                amount: totalCost - budget,
                message: `You're $${(totalCost - budget).toFixed(2)} over your budget of $${budget.toFixed(2)}`
            });
        }

        return {
            totalCost,
            potentialSavings,
            dealAlerts,
            budgetWarnings,
            storeRecommendations,
            itemCount: priceData.length,
            avgPricePerItem: totalCost / (priceData.length || 1)
        };
    };

    const calculateBudgetTracking = (currentItems) => {
        const selectedItems = currentItems.filter(item => item.selected);
        const totalCost = selectedItems.reduce((sum, item) => {
            const price = item.actualPrice || item.estimatedPrice || 0;
            return sum + price;
        }, 0);

        setBudgetTracking(prev => ({
            ...prev,
            current: totalCost,
            remaining: prev.limit ? prev.limit - totalCost : null
        }));
    };

    const handleStoreChange = (storeId) => {
        setSelectedStore(storeId);
        MobileHaptics?.light();
    };

    const handleItemToggle = (itemId) => {
        const updatedItems = items.map(item =>
            item.id === itemId
                ? { ...item, checked: !item.checked, selected: !item.checked }
                : item
        );
        setItems(updatedItems);
        calculateBudgetTracking(updatedItems);
        MobileHaptics?.light();
    };

    const handleQuantityChange = (itemId, newQuantity) => {
        const updatedItems = items.map(item =>
            item.id === itemId
                ? { ...item, quantity: Math.max(0, newQuantity) }
                : item
        );
        setItems(updatedItems);
        calculateBudgetTracking(updatedItems);
    };

    const handlePriceUpdate = (itemId, actualPrice) => {
        const updatedItems = items.map(item =>
            item.id === itemId
                ? { ...item, actualPrice: parseFloat(actualPrice) || 0 }
                : item
        );
        setItems(updatedItems);
        calculateBudgetTracking(updatedItems);
    };

    const selectAlternative = async (itemId, alternative) => {
        setLoading(true);
        try {
            const updatedItems = items.map(item =>
                item.id === itemId
                    ? {
                        ...item,
                        name: alternative.name,
                        ingredient: alternative.name,
                        estimatedPrice: alternative.price,
                        priceOptimized: true,
                        selectedAlternative: alternative
                    }
                    : item
            );
            setItems(updatedItems);
            calculateBudgetTracking(updatedItems);
            MobileHaptics?.success();
        } catch (error) {
            console.error('Error selecting alternative:', error);
            MobileHaptics?.error();
        } finally {
            setLoading(false);
        }
    };

    const optimizeForBudget = async () => {
        if (!budgetTracking.limit) {
            alert('Please set a budget limit first');
            return;
        }

        setLoading(true);
        try {
            const response = await apiPost('/api/price-tracking/budget-optimize', {
                items: items.filter(item => item.selected),
                budgetLimit: budgetTracking.limit,
                currentTotal: budgetTracking.current
            });

            const data = await response.json();
            if (data.success) {
                const optimizedItems = items.map(item => {
                    const optimization = data.optimizations.find(opt => opt.itemId === item.id);
                    if (optimization) {
                        return {
                            ...item,
                            ...optimization.changes,
                            budgetOptimized: true
                        };
                    }
                    return item;
                });

                setItems(optimizedItems);
                calculateBudgetTracking(optimizedItems);
                MobileHaptics?.success();
            }
        } catch (error) {
            console.error('Budget optimization error:', error);
            MobileHaptics?.error();
        } finally {
            setLoading(false);
        }
    };

    const handleSaveList = async () => {
        const finalList = {
            items: items.filter(item => item.selected),
            selectedStore,
            optimization: priceAnalysis,
            priceComparison,
            budgetTracking,
            metadata: {
                generatedAt: new Date().toISOString(),
                priceMode,
                optimized: true
            }
        };

        if (onSave) {
            await onSave(finalList);
        }
        MobileHaptics?.success();
    };

    const formatPrice = (price) => {
        return typeof price === 'number' ? `$${price.toFixed(2)}` : '$0.00';
    };

    const getItemPriceInfo = (itemName) => {
        const priceInfo = priceComparison[itemName];
        if (!priceInfo || !priceInfo.currentBestPrice) {
            return { price: 0, store: selectedStore, status: 'no-price' };
        }

        const { price, store } = priceInfo.currentBestPrice;
        const avgPrice = priceInfo.prices.length > 0
            ? priceInfo.prices.reduce((sum, p) => sum + p.price, 0) / priceInfo.prices.length
            : price;

        let status = 'normal';
        if (price <= avgPrice * 0.8) status = 'deal';
        else if (price >= avgPrice * 1.2) status = 'expensive';

        return { price, store, status, avgPrice };
    };

    const getCategoryIcon = (category) => {
        const icons = {
            produce: '🥬',
            meat: '🥩',
            dairy: '🥛',
            pantry: '🥫',
            frozen: '🧊',
            bakery: '🍞',
            other: '📦'
        };
        return icons[category?.toLowerCase()] || icons.other;
    };

    const getItemStatusColor = (item) => {
        if (item.dealStatus === 'deal') return 'border-green-300 bg-green-50';
        if (item.priceOptimized) return 'border-blue-300 bg-blue-50';
        if (budgetTracking.limit && item.estimatedPrice > (budgetTracking.limit * 0.1)) return 'border-yellow-300 bg-yellow-50';
        return 'border-gray-200 bg-white';
    };

    // Group items by category for better organization
    const groupedItems = items.reduce((groups, item) => {
        const category = item.category || 'other';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(item);
        return groups;
    }, {});

    const selectedItems = items.filter(item => item.selected);
    const checkedItems = items.filter(item => item.checked);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
                {/* Enhanced Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="text-white hover:text-green-200"
                            >
                                ← Back
                            </TouchEnhancedButton>
                            <div>
                                <h1 className="text-lg font-bold">💰 Smart Shopping List</h1>
                                <p className="text-sm text-green-100">Price-optimized shopping</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-xl font-bold">{formatPrice(budgetTracking.current)}</div>
                            <div className="text-xs text-green-100">Total Est.</div>
                        </div>
                    </div>

                    {/* Enhanced Summary Cards */}
                    <div className="grid grid-cols-4 gap-2">
                        <div className="bg-white bg-opacity-20 rounded p-2 text-center">
                            <div className="text-sm font-medium">Budget</div>
                            <div className="text-lg font-bold">
                                {budgetTracking.limit ? formatPrice(budgetTracking.limit) : 'None'}
                            </div>
                        </div>

                        <div className="bg-white bg-opacity-20 rounded p-2 text-center">
                            <div className="text-sm font-medium">Savings</div>
                            <div className="text-lg font-bold">
                                {formatPrice(priceAnalysis.totalSavings)}
                            </div>
                        </div>

                        <div className="bg-white bg-opacity-20 rounded p-2 text-center">
                            <div className="text-sm font-medium">Items</div>
                            <div className="text-lg font-bold">
                                {selectedItems.length}
                            </div>
                        </div>

                        <div className="bg-white bg-opacity-20 rounded p-2 text-center">
                            <div className="text-sm font-medium">Deals</div>
                            <div className="text-lg font-bold">
                                {items.filter(item => item.dealStatus === 'deal').length}
                            </div>
                        </div>
                    </div>

                    {/* Store Selection */}
                    <div className="mt-3">
                        <label className="block text-sm text-green-100 mb-1">🏪 Choose Store</label>
                        <select
                            value={selectedStore}
                            onChange={(e) => handleStoreChange(e.target.value)}
                            className="w-full bg-white text-gray-900 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">All Stores</option>
                            {stores.map(store => (
                                <option key={store._id} value={store.name}>{store.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                        <div className="flex gap-2">
                            <TouchEnhancedButton
                                onClick={() => setPriceMode('smart')}
                                className={`px-3 py-1 rounded text-sm font-medium ${
                                    priceMode === 'smart'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 border border-gray-300'
                                }`}
                            >
                                🧠 Smart
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => setPriceMode('budget')}
                                className={`px-3 py-1 rounded text-sm font-medium ${
                                    priceMode === 'budget'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-white text-gray-700 border border-gray-300'
                                }`}
                            >
                                💰 Budget
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => setPriceMode('deals')}
                                className={`px-3 py-1 rounded text-sm font-medium ${
                                    priceMode === 'deals'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white text-gray-700 border border-gray-300'
                                }`}
                            >
                                🎯 Deals
                            </TouchEnhancedButton>
                        </div>

                        <div className="flex gap-2">
                            {budgetTracking.limit && (
                                <TouchEnhancedButton
                                    onClick={optimizeForBudget}
                                    disabled={loading}
                                    className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:bg-yellow-400"
                                >
                                    💡 Optimize
                                </TouchEnhancedButton>
                            )}

                            <TouchEnhancedButton
                                onClick={() => setShowOptimizationDetails(!showOptimizationDetails)}
                                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                            >
                                📊 Details
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="p-4 text-center border-b border-gray-200">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                        <p className="text-gray-600 text-sm">Optimizing prices...</p>
                    </div>
                )}

                {/* Optimization Summary */}
                {!loading && (priceAnalysis.bestDeals.length > 0 || priceAnalysis.storeRecommendations?.length > 0 || (budgetTracking.limit && budgetTracking.current > budgetTracking.limit)) && (
                    <div className="p-4 space-y-3 border-b border-gray-200 max-h-48 overflow-y-auto">
                        {/* Deal Alerts */}
                        {priceAnalysis.bestDeals.length > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center mb-2">
                                    <span className="text-lg">🎯</span>
                                    <h3 className="ml-2 font-semibold text-green-900">Great Deals Found!</h3>
                                </div>
                                {priceAnalysis.bestDeals.slice(0, 2).map((deal, index) => (
                                    <div key={index} className="text-sm text-green-800">
                                        <strong>{deal.item}</strong> - Save {formatPrice(deal.savings)} ({deal.savingsPercent}% off)
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Budget Warnings */}
                        {budgetTracking.limit && budgetTracking.current > budgetTracking.limit && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-center mb-2">
                                    <span className="text-lg">⚠️</span>
                                    <h3 className="ml-2 font-semibold text-yellow-900">Budget Alert</h3>
                                </div>
                                <div className="text-sm text-yellow-800">
                                    You're {formatPrice(budgetTracking.current - budgetTracking.limit)} over your budget
                                </div>
                            </div>
                        )}

                        {/* Store Recommendations */}
                        {priceAnalysis.storeRecommendations?.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center">
                                        <span className="text-lg">💡</span>
                                        <h3 className="ml-2 font-semibold text-blue-900">Save at Other Stores</h3>
                                    </div>
                                    <TouchEnhancedButton
                                        onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
                                        className="text-blue-600 text-sm"
                                    >
                                        {showPriceBreakdown ? 'Hide' : 'Show'} Details
                                    </TouchEnhancedButton>
                                </div>
                                <div className="text-sm text-blue-800">
                                    Potential savings: {formatPrice(priceAnalysis.potentialSavings || 0)} by shopping elsewhere
                                </div>

                                {showPriceBreakdown && (
                                    <div className="mt-3 space-y-2">
                                        {priceAnalysis.storeRecommendations.slice(0, 3).map((rec, index) => (
                                            <div key={index} className="bg-white rounded p-2 text-xs">
                                                <div className="font-medium">{rec.item}</div>
                                                <div className="text-gray-600">
                                                    {rec.currentStore}: {formatPrice(rec.currentPrice)} → {rec.betterStore}: {formatPrice(rec.betterPrice)}
                                                    <span className="text-green-600 ml-1">(Save {formatPrice(rec.savings)})</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Shopping List Items */}
                <div className="flex-1 overflow-y-auto p-4">
                    {Object.keys(groupedItems).length > 0 ? (
                        Object.entries(groupedItems).map(([category, categoryItems]) => (
                            <div key={category} className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                    <span className="mr-2">{getCategoryIcon(category)}</span>
                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                        ({categoryItems.filter(item => item.selected).length} items)
                                    </span>
                                </h3>

                                <div className="space-y-3">
                                    {categoryItems.map(item => {
                                        const priceInfo = getItemPriceInfo(item.name);

                                        return (
                                            <div
                                                key={item.id}
                                                className={`border rounded-lg p-3 transition-all ${getItemStatusColor(item)} ${
                                                    item.selected ? 'ring-1 ring-blue-200' : 'opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <TouchEnhancedButton
                                                        onClick={() => handleItemToggle(item.id)}
                                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                                                            item.checked
                                                                ? 'bg-green-500 border-green-500 text-white'
                                                                : 'border-gray-300 hover:border-green-500'
                                                        }`}
                                                    >
                                                        {item.checked && '✓'}
                                                    </TouchEnhancedButton>

                                                    <div className="flex-1 min-w-0">
                                                        <div className={`font-medium mb-1 ${item.checked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                                            {item.name}
                                                            {item.dealStatus === 'deal' && (
                                                                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                                    ON SALE 🎉
                                                                </span>
                                                            )}
                                                            {item.priceOptimized && (
                                                                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                                    OPTIMIZED 💡
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Quantity and Price Controls */}
                                                        <div className="flex items-center space-x-3 mb-2">
                                                            <div className="flex items-center space-x-1">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.1"
                                                                    value={item.quantity}
                                                                    onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value))}
                                                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                                                />
                                                                <span className="text-sm text-gray-600">{item.unit}</span>
                                                            </div>

                                                            <div className="flex items-center space-x-1">
                                                                <span className="text-sm text-gray-600">$</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={item.actualPrice || item.estimatedPrice || ''}
                                                                    onChange={(e) => handlePriceUpdate(item.id, e.target.value)}
                                                                    placeholder="Price"
                                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                                                />
                                                            </div>
                                                        </div>


                                                        {/* Price Information */}
                                                        {priceInfo.status !== 'no-price' && (
                                                            <div className="flex items-center space-x-2 mb-2">
                                                                <span className={`text-sm font-semibold ${
                                                                    priceInfo.status === 'deal' ? 'text-green-600' :
                                                                        priceInfo.status === 'expensive' ? 'text-red-600' :
                                                                            'text-gray-700'
                                                                }`}>
                                                                    {formatPrice(priceInfo.price)}
                                                                </span>

                                                                <span className="text-xs text-gray-500">at {priceInfo.store}</span>

                                                                {priceInfo.status === 'deal' && (
                                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                                        Great Deal!
                                                                    </span>
                                                                )}

                                                                {priceInfo.status === 'expensive' && (
                                                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                                                        High Price
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Alternatives */}
                                                        {item.alternatives && item.alternatives.length > 0 && (
                                                            <div className="mt-2">
                                                                <details className="text-sm">
                                                                    <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                                                                        💡 View {item.alternatives.length} cheaper alternatives
                                                                    </summary>
                                                                    <div className="mt-2 space-y-2 bg-blue-50 p-3 rounded border border-blue-200">
                                                                        {item.alternatives.map((alt, index) => (
                                                                            <div key={index} className="flex items-center justify-between">
                                                                                <div>
                                                                                    <span className="font-medium">{alt.name}</span>
                                                                                    <span className="text-gray-600 ml-2">at {alt.store}</span>
                                                                                    <span className="text-green-600 ml-2 font-medium">
                                                                                        {formatPrice(alt.price)} (Save {formatPrice(item.estimatedPrice - alt.price)})
                                                                                    </span>
                                                                                </div>
                                                                                <TouchEnhancedButton
                                                                                    onClick={() => selectAlternative(item.id, alt)}
                                                                                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                                                                >
                                                                                    Use This
                                                                                </TouchEnhancedButton>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </details>
                                                            </div>
                                                        )}

                                                        {/* Recipe References */}
                                                        {item.recipes && item.recipes.length > 0 && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                Used in: {item.recipes.join(', ')}
                                                            </div>
                                                        )}

                                                        {/* Inventory Status */}
                                                        {item.inInventory && (
                                                            <div className="text-xs text-green-600 mt-1 bg-green-50 px-2 py-1 rounded">
                                                                ✅ Available in inventory
                                                                {item.inventoryItem?.location && ` (${item.inventoryItem.location})`}
                                                            </div>
                                                        )}
                                                </div>

                                                {/* Price History Button */}
                                                {priceComparison[item.name]?.prices.length > 0 && (
                                                    <TouchEnhancedButton
                                                        onClick={() => {/* Open price history modal */}}
                                                        className="text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded self-start"
                                                    >
                                                        📊 History
                                                    </TouchEnhancedButton>
                                                )}
                                            </div>
                                    </div>
                                    );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-4">🛒</div>
                            <p className="text-gray-500">No items in your shopping list</p>
                        </div>
                    )}
                </div>

                {/* Enhanced Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="space-y-3">
                        {/* Primary Action */}
                        <TouchEnhancedButton
                            onClick={handleSaveList}
                            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center space-x-2"
                        >
                            <span>💾</span>
                            <span>Save Smart Shopping List</span>
                        </TouchEnhancedButton>

                        {/* Secondary Actions */}
                        <div className="grid grid-cols-2 gap-3">
                            <TouchEnhancedButton
                                onClick={() => {/* Start shopping mode */}}
                                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center space-x-1"
                            >
                                <span>🛒</span>
                                <span>Start Shopping</span>
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => {/* Share list */}}
                                className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 text-sm flex items-center justify-center space-x-1"
                            >
                                <span>📤</span>
                                <span>Share List</span>
                            </TouchEnhancedButton>
                        </div>

                        {/* Summary */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-gray-600">Selected Items:</div>
                                    <div className="font-semibold text-gray-900">{selectedItems.length} items</div>
                                </div>
                                <div>
                                    <div className="text-gray-600">Checked Off:</div>
                                    <div className="font-semibold text-gray-900">{checkedItems.length} completed</div>
                                </div>
                                <div>
                                    <div className="text-gray-600">Total Cost:</div>
                                    <div className="font-semibold text-gray-900">{formatPrice(budgetTracking.current)}</div>
                                </div>
                                <div>
                                    <div className="text-gray-600">Potential Savings:</div>
                                    <div className="font-semibold text-green-600">{formatPrice(priceAnalysis.totalSavings)}</div>
                                </div>
                            </div>

                            {budgetTracking.limit && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Budget Status:</span>
                                        <span className={`font-semibold ${
                                            budgetTracking.remaining >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {budgetTracking.remaining >= 0 ? 'Under' : 'Over'} by {formatPrice(Math.abs(budgetTracking.remaining))}
                                        </span>
                                    </div>
                                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${
                                                budgetTracking.current <= budgetTracking.limit ? 'bg-green-500' : 'bg-red-500'
                                            }`}
                                            style={{
                                                width: `${Math.min(100, (budgetTracking.current / budgetTracking.limit) * 100)}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}