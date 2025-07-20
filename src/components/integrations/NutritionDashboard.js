'use client';

// file: /src/components/integrations/NutritionDashboard.js v2 - Fixed Enhanced Quick Actions and API calls

import React, {useState, useEffect, useCallback} from 'react';
import {useSession} from 'next-auth/react';
import {useModalIntegration} from '@/hooks/useModalIntegration';
import { VoiceInput } from '@/components/mobile/VoiceInput';

export default function NutritionDashboard() {
    const {data: session} = useSession();
    const {
        loading,
        error,
        analyzeNutrition,
        performSmartInventoryAction,
        clearError
    } = useModalIntegration();

    const [dashboardData, setDashboardData] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [refreshing, setRefreshing] = useState(false);

    // Voice nutrition state
    const [showVoiceNutrition, setShowVoiceNutrition] = useState(false);
    const [processingVoiceNutrition, setProcessingVoiceNutrition] = useState(false);

    useEffect(() => {
        if (session?.user?.id) {
            loadDashboardData();
        }
    }, [session]);

    // Expose functions to sub-components via window object
    // useEffect(() => {
    //     window.setNutritionActiveTab = setActiveTab;
    //     window.generateSmartShoppingList = generateSmartShoppingList;
    //     window.navigateToMealPlanning = navigateToMealPlanning;
    //     window.setShowVoiceNutrition = setShowVoiceNutrition;
    //
    //     return () => {
    //         // Cleanup
    //         delete window.setNutritionActiveTab;
    //         delete window.generateSmartShoppingList;
    //         delete window.navigateToMealPlanning;
    //         delete window.setShowVoiceNutrition;
    //     };
    // }, [generateSmartShoppingList, navigateToMealPlanning]);

    const loadDashboardData = async () => {
        try {
            setRefreshing(true);

            // Load comprehensive dashboard data
            const [inventoryData, nutritionGoals, recentAnalyses] = await Promise.all([
                fetch('/api/inventory').then(res => res.json()),
                fetch('/api/nutrition/goals').then(res => res.json()).catch(() => ({ goals: {} })),
                fetch('/api/nutrition/recent-analyses').then(res => res.json()).catch(() => ({ analyses: [] }))
            ]);

            if (inventoryData.success && inventoryData.inventory?.length > 0) {
                // Get smart inventory insights using the real API
                try {
                    const insights = await performSmartInventoryAction('suggest_recipes', {
                        inventory: inventoryData.inventory,
                        preferences: session?.user?.preferences || {}
                    });

                    setDashboardData({
                        inventory: inventoryData.inventory,
                        nutritionGoals: nutritionGoals.goals || {},
                        recentAnalyses: recentAnalyses.analyses || [],
                        smartInsights: insights.suggestions || [],
                        inventoryUtilization: insights.inventoryUtilization || {}
                    });
                } catch (smartInventoryError) {
                    console.error('Smart inventory insights failed:', smartInventoryError);
                    // Set dashboard data without smart insights
                    setDashboardData({
                        inventory: inventoryData.inventory,
                        nutritionGoals: nutritionGoals.goals || {},
                        recentAnalyses: recentAnalyses.analyses || [],
                        smartInsights: [],
                        inventoryUtilization: {}
                    });
                }
            } else {
                // No inventory data
                setDashboardData({
                    inventory: [],
                    nutritionGoals: nutritionGoals.goals || {},
                    recentAnalyses: recentAnalyses.analyses || [],
                    smartInsights: [],
                    inventoryUtilization: {}
                });
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            setDashboardData({
                inventory: [],
                nutritionGoals: {},
                recentAnalyses: [],
                smartInsights: [],
                inventoryUtilization: {}
            });
        } finally {
            setRefreshing(false);
        }
    };

    // Voice nutrition analysis functions
    const handleVoiceNutrition = useCallback(async (transcript, confidence) => {
        console.log('🎤 Voice nutrition query:', transcript);
        setProcessingVoiceNutrition(true);

        try {
            const nutritionQuery = parseVoiceNutritionQuery(transcript);

            if (nutritionQuery.action === 'analyze_item') {
                const result = await analyzeSingleItem(nutritionQuery.itemName);

                setShowVoiceNutrition(false);

                const nutrition = result.nutrition;
                const fromCache = result.fromCache;

                let message = `${fromCache ? '📊' : '🔬'} Nutrition for ${result.item.name}:\n\n`;
                message += `Calories: ${nutrition.calories?.value || 'N/A'} kcal\n`;
                message += `Protein: ${nutrition.protein?.value?.toFixed(1) || 'N/A'}g\n`;
                message += `Carbs: ${nutrition.carbs?.value?.toFixed(1) || 'N/A'}g\n`;
                message += `Fat: ${nutrition.fat?.value?.toFixed(1) || 'N/A'}g\n`;

                if (nutrition.fiber?.value) {
                    message += `Fiber: ${nutrition.fiber.value.toFixed(1)}g\n`;
                }

                message += `\n${fromCache ? '📋 From existing data' : '🤖 Fresh AI analysis'}`;

                if (nutrition.confidence) {
                    message += `\nConfidence: ${Math.round(nutrition.confidence * 100)}%`;
                }

                alert(message);

            } else if (nutritionQuery.action === 'get_suggestions') {
                setActiveTab('recipes');
                setShowVoiceNutrition(false);
                alert('✅ Switched to Recipe Suggestions tab');
            } else if (nutritionQuery.action === 'optimization') {
                setActiveTab('optimization');
                setShowVoiceNutrition(false);
                alert('✅ Switched to Smart Optimization tab');
            }
        } catch (error) {
            console.error('Error processing voice nutrition:', error);
            alert(`❌ ${error.message}`);
        } finally {
            setProcessingVoiceNutrition(false);
        }
    }, [setActiveTab]);

    const handleVoiceNutritionError = useCallback((error) => {
        console.error('Voice nutrition error:', error);
        alert('🎤 Voice input failed. Please try again.');
        setProcessingVoiceNutrition(false);
    }, []);

    const parseVoiceNutritionQuery = useCallback((transcript) => {
        const cleanTranscript = transcript.toLowerCase().trim();

        if (cleanTranscript.includes('analyze') || cleanTranscript.includes('nutrition')) {
            const itemMatch = cleanTranscript.match(/(?:analyze|nutrition for|about)\s+(.+?)(?:\s|$)/);
            if (itemMatch) {
                return {
                    action: 'analyze_item',
                    itemName: itemMatch[1].trim()
                };
            }
        }

        if (cleanTranscript.includes('recipe') || cleanTranscript.includes('suggest')) {
            return { action: 'get_suggestions' };
        }

        if (cleanTranscript.includes('optim') || cleanTranscript.includes('improve')) {
            return { action: 'optimization' };
        }

        return { action: 'analyze_item', itemName: cleanTranscript };
    }, []);

    // Quick Action Helper Functions
    const generateSmartShoppingList = useCallback(async () => {
        try {
            if (!dashboardData?.inventory?.length) {
                alert('❌ No inventory items found. Add items to your inventory first.');
                return;
            }

            setRefreshing(true);

            // Use the real smart inventory API
            const result = await performSmartInventoryAction('generate_shopping_list', {
                preferences: session?.user?.preferences || {},
                budget: null // Could be added as a user setting later
            });

            if (result.success) {
                let message = '🛒 Smart Shopping List Generated!\n\n';

                if (result.shoppingList?.length > 0) {
                    message += `📝 Items suggested: ${result.shoppingList.length}\n`;

                    if (result.estimatedCost) {
                        message += `💰 Estimated cost: ${result.estimatedCost}\n`;
                    }

                    message += '\n🏪 View full list in Shopping section?';

                    if (confirm(message)) {
                        window.location.href = '/shopping/saved';
                    }
                } else {
                    alert('✅ Your inventory looks well-stocked! No urgent shopping needed.');
                }
            } else {
                throw new Error(result.error || 'Shopping list generation failed');
            }
        } catch (error) {
            console.error('Error generating smart shopping list:', error);

            // Fallback to basic analysis
            const expiringItems = dashboardData.inventory.filter(item => {
                if (!item.expirationDate) return false;
                const expDate = new Date(item.expirationDate);
                const daysLeft = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
                return daysLeft <= 7 && daysLeft >= 0;
            });

            const lowStockItems = dashboardData.inventory.filter(item =>
                item.quantity <= 1 || (item.quantity <= 2 && item.unit === 'item')
            );

            let message = '🛒 Basic Shopping Recommendations:\n\n';

            if (expiringItems.length > 0) {
                message += `⚠️ USE FIRST - ${expiringItems.length} items expiring soon\n`;
            }

            if (lowStockItems.length > 0) {
                message += `📉 LOW STOCK - Consider restocking:\n`;
                message += lowStockItems.slice(0, 5).map(item => `• ${item.name}`).join('\n');
                message += '\n\n';
            }

            message += 'Navigate to shopping section?';

            if (confirm(message)) {
                window.location.href = '/shopping';
            }
        } finally {
            setRefreshing(false);
        }
    }, [dashboardData, performSmartInventoryAction, session]);

    const navigateToMealPlanning = useCallback(() => {
        if (!dashboardData?.inventory?.length) {
            if (confirm('❌ No inventory items found.\n\nWould you like to add some items first, or go to meal planning anyway?')) {
                window.location.href = '/meal-planning';
            } else {
                window.location.href = '/inventory?action=add';
            }
            return;
        }

        // Show meal planning preview
        const availableIngredients = dashboardData.inventory.length;
        const nutritionCoverage = Math.round((dashboardData.inventory.filter(item => item.nutrition).length / dashboardData.inventory.length) * 100);

        const message = `🍽️ Meal Planning Ready!\n\n` +
            `📦 Available ingredients: ${availableIngredients}\n` +
            `📊 Nutrition data: ${nutritionCoverage}% coverage\n` +
            `🤖 AI will suggest meals based on your inventory\n\n` +
            `Ready to create your meal plan?`;

        if (confirm(message)) {
            window.location.href = '/meal-planning';
        }
    }, [dashboardData]);

    const analyzeInventoryNutrition = useCallback(async () => {
        if (!dashboardData?.inventory?.length) {
            alert('❌ No inventory items found. Add items to your inventory first.');
            return;
        }

        try {
            setRefreshing(true);

            // Get items that don't have nutrition data yet
            const itemsToAnalyze = dashboardData.inventory.filter(item => !item.nutrition);
            const itemsWithNutrition = dashboardData.inventory.filter(item => item.nutrition);

            if (itemsToAnalyze.length === 0) {
                alert('✅ All items already have nutrition data!');
                return;
            }

            const results = [];
            let successCount = 0;
            let errorCount = 0;

            // Add existing nutrition data to results
            itemsWithNutrition.forEach(item => {
                results.push({
                    item,
                    nutrition: item.nutrition,
                    fromCache: true
                });
            });

            // Analyze items without nutrition data (limit to 10 for performance)
            const itemsToProcess = itemsToAnalyze.slice(0, 10);

            for (const item of itemsToProcess) {
                try {
                    console.log(`Analyzing nutrition for: ${item.name}`);

                    // Fixed: Pass the correct data structure to the API
                    const result = await analyzeNutrition('inventory_item', {
                        itemId: item._id,
                        name: item.name,
                        brand: item.brand || '',
                        category: item.category || '',
                        quantity: item.quantity || 1,
                        unit: item.unit || 'item'
                    });

                    if (result.success) {
                        results.push({
                            item: {
                                ...item,
                                nutrition: result.nutrition
                            },
                            nutrition: result.nutrition,
                            fromCache: false
                        });
                        successCount++;
                    } else {
                        console.error(`Failed to analyze ${item.name}:`, result.error);
                        results.push({
                            item,
                            nutrition: null,
                            error: result.error,
                            fromCache: false
                        });
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`Error analyzing ${item.name}:`, error);
                    results.push({
                        item,
                        nutrition: null,
                        error: error.message,
                        fromCache: false
                    });
                    errorCount++;
                }
            }

            // Update dashboard with new nutrition data
            const updatedInventory = dashboardData.inventory.map(item => {
                const result = results.find(r => r.item._id === item._id);
                if (result && result.nutrition) {
                    return {
                        ...item,
                        nutrition: result.nutrition
                    };
                }
                return item;
            });

            setDashboardData(prev => ({
                ...prev,
                inventory: updatedInventory,
                nutritionAnalyses: results,
                lastAnalyzed: new Date()
            }));

            // Show results summary
            let message = '🔬 Nutrition Analysis Complete!\n\n';
            message += `✅ Successfully analyzed: ${successCount} items\n`;
            message += `📊 Already had data: ${itemsWithNutrition.length} items\n`;

            if (errorCount > 0) {
                message += `❌ Failed to analyze: ${errorCount} items\n`;
            }

            if (itemsToAnalyze.length > 10) {
                message += `\n⏳ Remaining items will be analyzed in future runs`;
            }

            alert(message);

        } catch (error) {
            console.error('Error in batch nutrition analysis:', error);
            alert(`❌ Error analyzing nutrition: ${error.message}`);
        } finally {
            setRefreshing(false);
        }
    }, [dashboardData, analyzeNutrition]);

    // Function to analyze a single item (for voice commands)
    const analyzeSingleItem = useCallback(async (itemName) => {
        if (!dashboardData?.inventory?.length) {
            throw new Error('No inventory items found');
        }

        const item = dashboardData.inventory.find(item =>
            item.name.toLowerCase().includes(itemName.toLowerCase())
        );

        if (!item) {
            throw new Error(`Item "${itemName}" not found in inventory`);
        }

        if (item.nutrition) {
            return {
                item,
                nutrition: item.nutrition,
                fromCache: true
            };
        }

        try {
            const result = await analyzeNutrition('inventory_item', {
                itemId: item._id,
                name: item.name,
                brand: item.brand || '',
                category: item.category || '',
                quantity: item.quantity || 1,
                unit: item.unit || 'item'
            });

            if (result.success) {
                // Update the item in dashboard data
                setDashboardData(prev => ({
                    ...prev,
                    inventory: prev.inventory.map(invItem =>
                        invItem._id === item._id
                            ? { ...invItem, nutrition: result.nutrition }
                            : invItem
                    )
                }));

                return {
                    item: { ...item, nutrition: result.nutrition },
                    nutrition: result.nutrition,
                    fromCache: false
                };
            } else {
                throw new Error(result.error || 'Analysis failed');
            }
        } catch (error) {
            console.error(`Error analyzing ${item.name}:`, error);
            throw error;
        }
    }, [dashboardData, analyzeNutrition]);

    if (!session) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="text-center py-12">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        🔐 Sign In Required
                    </h2>
                    <p className="text-gray-600">
                        Please sign in to access your nutrition dashboard.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            🍎 Nutrition Intelligence Dashboard
                        </h1>
                        <p className="text-gray-600">
                            AI-powered nutrition insights from your inventory to meal planning
                        </p>
                    </div>

                    <button
                        onClick={loadDashboardData}
                        disabled={refreshing}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <span className="text-red-600 mr-2">⚠️</span>
                            <span className="text-red-700 font-medium">Error:</span>
                            <span className="text-red-600 ml-2">{error}</span>
                        </div>
                        <button
                            onClick={clearError}
                            className="text-red-600 hover:text-red-700"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Tab Navigation - Mobile Dropdown or Desktop Tabs */}
            <div className="mb-6">
                {/* Mobile Dropdown */}
                <div className="sm:hidden">
                    <select
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="overview">📊 Overview</option>
                        <option value="inventory">🥫 Inventory Nutrition</option>
                        <option value="recipes">🍳 Recipe Suggestions</option>
                        <option value="optimization">⚡ Smart Optimization</option>
                        <option value="goals">🎯 Nutrition Goals</option>
                    </select>
                </div>

                {/* Desktop Tabs */}
                <div className="hidden sm:flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    {[
                        {id: 'overview', label: 'Overview', icon: '📊'},
                        {id: 'inventory', label: 'Inventory', icon: '🥫'},
                        {id: 'recipes', label: 'Recipes', icon: '🍳'},
                        {id: 'optimization', label: 'Optimize', icon: '⚡'},
                        {id: 'goals', label: 'Goals', icon: '🎯'}
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === 'overview' && (
                    <NutritionOverview
                        data={dashboardData}
                        loading={loading || refreshing}
                        onAnalyze={analyzeInventoryNutrition}
                        setActiveTab={setActiveTab}
                        generateSmartShoppingList={generateSmartShoppingList}
                        navigateToMealPlanning={navigateToMealPlanning}
                        setShowVoiceNutrition={setShowVoiceNutrition}
                    />
                )}

                {activeTab === 'inventory' && (
                    <InventoryNutritionView
                        data={dashboardData}
                        loading={loading}
                        onAnalyze={analyzeInventoryNutrition}
                    />
                )}

                {activeTab === 'recipes' && (
                    <SmartRecipeSuggestions
                        data={dashboardData}
                        loading={loading}
                        onRefresh={loadDashboardData}
                    />
                )}

                {activeTab === 'optimization' && (
                    <InventoryOptimization
                        data={dashboardData}
                        loading={loading}
                        performAction={performSmartInventoryAction}
                    />
                )}

                {activeTab === 'goals' && (
                    <NutritionGoalsTracking
                        data={dashboardData}
                        loading={loading}
                        onGoalsUpdate={loadDashboardData}
                    />
                )}
            </div>

            {/* Voice Nutrition Modal */}
            {showVoiceNutrition && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">🎤 Voice Nutrition Analysis</h3>
                            <button
                                onClick={() => setShowVoiceNutrition(false)}
                                disabled={processingVoiceNutrition}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mb-4">
                            <VoiceInput
                                onResult={handleVoiceNutrition}
                                onError={(error) => {
                                    console.error('Voice nutrition error:', error);
                                    alert('🎤 Voice input failed. Please try again.');
                                    setProcessingVoiceNutrition(false);
                                }}
                                placeholder="Ask about nutrition for any item..."
                            />
                        </div>

                        {processingVoiceNutrition && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                                <div className="text-blue-800 font-medium">
                                    🤖 Analyzing nutrition data...
                                </div>
                            </div>
                        )}

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm text-blue-800 mb-2">
                                💡 <strong>Voice Nutrition Examples:</strong>
                            </p>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• "Analyze nutrition for ground beef"</li>
                                <li>• "What's the protein in chicken breast"</li>
                                <li>• "Get nutrition for bananas"</li>
                                <li>• "Show me recipe suggestions"</li>
                                <li>• "Run optimization analysis"</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// =============================================================================
// DASHBOARD SUB-COMPONENTS
// =============================================================================

function NutritionOverview({data, loading, onAnalyze, setActiveTab, generateSmartShoppingList, navigateToMealPlanning, setShowVoiceNutrition}) {
    if (loading && !data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    const stats = [
        {
            title: 'Inventory Items',
            value: data?.inventory?.length || 0,
            subtitle: 'Total items tracked',
            icon: '📦',
            color: 'bg-blue-100 text-blue-600'
        },
        {
            title: 'Items with Nutrition',
            value: data?.inventory?.filter(item => item.nutrition)?.length || 0,
            subtitle: `${data?.inventory?.length ? Math.round((data.inventory.filter(item => item.nutrition).length / data.inventory.length) * 100) : 0}% coverage`,
            icon: '📊',
            color: 'bg-green-100 text-green-600'
        },
        {
            title: 'Recipe Suggestions',
            value: data?.smartInsights?.length || 0,
            subtitle: 'AI-generated recipes',
            icon: '🍳',
            color: 'bg-purple-100 text-purple-600'
        },
        {
            title: 'Inventory Utilization',
            value: `${Math.round((data?.inventoryUtilization?.utilizationPercentage || 0))}%`,
            subtitle: 'Efficient ingredient use',
            icon: '⚡',
            color: 'bg-yellow-100 text-yellow-600'
        },
        {
            title: 'Expiring Soon',
            value: data?.inventory?.filter(item => {
                if (!item.expirationDate) return false;
                const expDate = new Date(item.expirationDate);
                const daysLeft = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
                return daysLeft <= 7 && daysLeft >= 0;
            })?.length || 0,
            subtitle: 'Items to use first',
            icon: '⏰',
            color: 'bg-red-100 text-red-600'
        },
        {
            title: 'Nutrition Score',
            value: calculateOverallNutritionScore(data),
            subtitle: 'Based on variety & quality',
            icon: '🎯',
            color: 'bg-indigo-100 text-indigo-600'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.map((stat, index) => (
                    <div key={index}
                         className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-900">{stat.title}</h3>
                            <span
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${stat.color}`}>
                                {stat.icon}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                        <div className="text-sm text-gray-600">{stat.subtitle}</div>
                    </div>
                ))}
            </div>

            {/* Enhanced Quick Actions - Fixed */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <button
                        onClick={onAnalyze}
                        disabled={loading || !data?.inventory?.length}
                        className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">🔬</div>
                        <div className="font-medium">Analyze Nutrition</div>
                        <div className="text-xs opacity-90">AI-powered analysis</div>
                    </button>

                    <button
                        onClick={() => setActiveTab('recipes')}
                        className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">🍳</div>
                        <div className="font-medium">Recipe Ideas</div>
                        <div className="text-xs opacity-90">From your inventory</div>
                    </button>

                    <button
                        onClick={generateSmartShoppingList}
                        disabled={!data?.inventory?.length}
                        className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">🛒</div>
                        <div className="font-medium">Smart Shopping</div>
                        <div className="text-xs opacity-90">Optimized lists</div>
                    </button>

                    <button
                        onClick={navigateToMealPlanning}
                        className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">📋</div>
                        <div className="font-medium">Meal Planning</div>
                        <div className="text-xs opacity-90">AI suggestions</div>
                    </button>

                    <button
                        onClick={() => setShowVoiceNutrition(true)}
                        className="bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">🎤</div>
                        <div className="font-medium">Voice Nutrition</div>
                        <div className="text-xs opacity-90">Ask about items</div>
                    </button>
                </div>
            </div>

            {/* Recent Insights */}
            {data?.smartInsights?.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Smart Insights</h3>
                    <div className="space-y-3">
                        {data.smartInsights.slice(0, 3).map((insight, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <span className="text-2xl">🤖</span>
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{insight.name}</h4>
                                    <p className="text-sm text-gray-600">{insight.description}</p>
                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                        <span>⏱️ {insight.cookingTime} min</span>
                                        <span>👥 {insight.servings} servings</span>
                                        <span>📊 {Math.round(insight.inventoryUsage * 100)}% inventory use</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function InventoryNutritionView({data, loading, onAnalyze}) {
    const [selectedItems, setSelectedItems] = useState([]);
    const [analysisResults, setAnalysisResults] = useState({});

    const itemsWithNutrition = data?.inventory?.filter(item => item.nutrition) || [];
    const itemsWithoutNutrition = data?.inventory?.filter(item => !item.nutrition) || [];

    return (
        <div className="space-y-6">
            {/* Nutrition Coverage Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Nutrition Coverage</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{itemsWithNutrition.length}</div>
                        <div className="text-sm text-gray-600">Items with nutrition data</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{itemsWithoutNutrition.length}</div>
                        <div className="text-sm text-gray-600">Items needing analysis</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {data?.inventory?.length ? Math.round((itemsWithNutrition.length / data.inventory.length) * 100) : 0}%
                        </div>
                        <div className="text-sm text-gray-600">Coverage percentage</div>
                    </div>
                </div>

                {itemsWithoutNutrition.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-medium text-blue-900">🤖 AI Analysis Available</h4>
                                <p className="text-sm text-blue-700">
                                    {itemsWithoutNutrition.length} items can be analyzed with AI for complete nutrition
                                    data.
                                </p>
                            </div>
                            <button
                                onClick={onAnalyze}
                                disabled={loading}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? '🔬 Analyzing...' : '🔬 Analyze All'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Items with Nutrition */}
            {itemsWithNutrition.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">✅ Items with Nutrition Data</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {itemsWithNutrition.map((item, index) => (
                            <div key={index}
                                 className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                        📊 Complete
                                    </span>
                                </div>

                                {item.brand && (
                                    <p className="text-xs text-gray-500 mb-2">{item.brand}</p>
                                )}

                                <div className="space-y-1 text-sm">
                                    {item.nutrition.calories && (
                                        <div className="flex justify-between">
                                            <span>Calories:</span>
                                            <span
                                                className="font-medium">{Math.round(item.nutrition.calories.value)} kcal</span>
                                        </div>
                                    )}
                                    {item.nutrition.protein && (
                                        <div className="flex justify-between">
                                            <span>Protein:</span>
                                            <span
                                                className="font-medium">{item.nutrition.protein.value?.toFixed(1)}g</span>
                                        </div>
                                    )}
                                    {item.nutrition.carbs && (
                                        <div className="flex justify-between">
                                            <span>Carbs:</span>
                                            <span
                                                className="font-medium">{item.nutrition.carbs.value?.toFixed(1)}g</span>
                                        </div>
                                    )}
                                    {item.nutrition.fat && (
                                        <div className="flex justify-between">
                                            <span>Fat:</span>
                                            <span className="font-medium">{item.nutrition.fat.value?.toFixed(1)}g</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                        <span>
                                            {item.nutrition.calculationMethod === 'ai_calculated' ? '🤖 AI' :
                                                item.nutrition.calculationMethod === 'usda_lookup' ? '🗃️ USDA' :
                                                    '📋 Manual'}
                                        </span>
                                        {item.nutrition.confidence && (
                                            <span>{Math.round(item.nutrition.confidence * 100)}% confidence</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Items without Nutrition */}
            {itemsWithoutNutrition.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">⏳ Items Awaiting Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {itemsWithoutNutrition.map((item, index) => (
                            <div key={index}
                                 className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                        ⏳ Pending
                                    </span>
                                </div>

                                {item.brand && (
                                    <p className="text-xs text-gray-500 mb-2">{item.brand}</p>
                                )}

                                <p className="text-xs text-gray-600 mb-3">
                                    Category: {item.category || 'Unknown'}
                                </p>

                                <p className="text-xs text-gray-600">
                                    {item.quantity} {item.unit}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function SmartRecipeSuggestions({data, loading, onRefresh}) {
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [showDetails, setShowDetails] = useState({});

    const suggestions = data?.smartInsights || [];

    const toggleDetails = (index) => {
        setShowDetails(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">🤖 AI Recipe Suggestions</h3>
                        <p className="text-sm text-gray-600">
                            Smart recipes based on your current inventory
                        </p>
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? '🔄 Refreshing...' : '🔄 New Suggestions'}
                    </button>
                </div>
            </div>

            {/* Suggestions Grid */}
            {suggestions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {suggestions.map((suggestion, index) => (
                        <div key={index}
                             className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            {/* Recipe Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 mb-1">{suggestion.name}</h4>
                                    <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>

                                    {/* Quick Stats */}
                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                        <span>⏱️ {suggestion.cookingTime} min</span>
                                        <span>👥 {suggestion.servings} servings</span>
                                        <span>📊 {suggestion.difficulty}</span>
                                        {suggestion.inventoryUsage && (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                                {Math.round(suggestion.inventoryUsage * 100)}% inventory
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="ml-4">
                                    {suggestion.expirationPriority === 'high' && (
                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                            ⚡ Use Soon
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Available Ingredients */}
                            {suggestion.ingredients && (
                                <div className="mb-4">
                                    <h5 className="text-sm font-medium text-gray-900 mb-2">✅ Available Ingredients:</h5>
                                    <div className="flex flex-wrap gap-1">
                                        {suggestion.ingredients
                                            .filter(ing => ing.inInventory)
                                            .slice(0, 6)
                                            .map((ingredient, idx) => (
                                                <span key={idx}
                                                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                {ingredient.item}
                                            </span>
                                            ))}
                                        {suggestion.ingredients.filter(ing => ing.inInventory).length > 6 && (
                                            <span className="text-xs text-gray-500">
                                                +{suggestion.ingredients.filter(ing => ing.inInventory).length - 6} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Missing Ingredients */}
                            {suggestion.missingIngredients?.length > 0 && (
                                <div className="mb-4">
                                    <h5 className="text-sm font-medium text-gray-900 mb-2">🛒 Need to Buy:</h5>
                                    <div className="flex flex-wrap gap-1">
                                        {suggestion.missingIngredients.slice(0, 4).map((ingredient, idx) => (
                                            <span key={idx}
                                                  className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                                {ingredient.item}
                                            </span>
                                        ))}
                                        {suggestion.missingIngredients.length > 4 && (
                                            <span className="text-xs text-gray-500">
                                                +{suggestion.missingIngredients.length - 4} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Nutrition Highlights */}
                            {suggestion.nutritionHighlights && (
                                <div className="mb-4">
                                    <h5 className="text-sm font-medium text-gray-900 mb-2">🥗 Nutrition:</h5>
                                    <div className="flex flex-wrap gap-1">
                                        {suggestion.nutritionHighlights.map((highlight, idx) => (
                                            <span key={idx}
                                                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                {highlight}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => toggleDetails(index)}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    {showDetails[index] ? '▲ Hide Details' : '▼ Show Details'}
                                </button>

                                <div className="space-x-2">
                                    <button
                                        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors">
                                        📋 Add to Meal Plan
                                    </button>
                                    <button
                                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                                        💾 Save Recipe
                                    </button>
                                </div>
                            </div>

                            {/* Detailed View */}
                            {showDetails[index] && (
                                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                    {/* Full Ingredients List */}
                                    {suggestion.ingredients && (
                                        <div>
                                            <h6 className="text-sm font-medium text-gray-900 mb-2">📝 All
                                                Ingredients:</h6>
                                            <div className="space-y-1 text-sm">
                                                {suggestion.ingredients.map((ingredient, idx) => (
                                                    <div key={idx} className="flex justify-between items-center">
                                                        <span
                                                            className={ingredient.inInventory ? 'text-green-700' : 'text-gray-600'}>
                                                            {ingredient.item} - {ingredient.amount}
                                                        </span>
                                                        {ingredient.inInventory ? (
                                                            <span className="text-xs text-green-600">✓ Have</span>
                                                        ) : (
                                                            <span className="text-xs text-orange-600">🛒 Buy</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Substitutions */}
                                    {suggestion.substitutions?.length > 0 && (
                                        <div>
                                            <h6 className="text-sm font-medium text-gray-900 mb-2">🔄 Possible
                                                Substitutions:</h6>
                                            <div className="space-y-1 text-sm">
                                                {suggestion.substitutions.map((sub, idx) => (
                                                    <div key={idx}
                                                         className="flex justify-between items-center text-gray-600">
                                                        <span>{sub.original} → {sub.alternatives?.join(', ')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <div className="text-4xl mb-4">🤖</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recipe Suggestions Yet</h3>
                    <p className="text-gray-600 mb-4">
                        Add items to your inventory to get AI-powered recipe suggestions.
                    </p>
                    <button
                        onClick={onRefresh}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        🔄 Generate Suggestions
                    </button>
                </div>
            )}
        </div>
    );
}

function InventoryOptimization({data, loading, performAction}) {
    const [optimizations, setOptimizations] = useState(null);
    const [optimizing, setOptimizing] = useState(false);

    const runOptimization = async () => {
        if (!data?.inventory?.length) return;

        try {
            setOptimizing(true);

            const result = await performAction('optimize_inventory', {
                inventory: data.inventory,
                goals: ['reduce_waste', 'save_money', 'improve_nutrition']
            });

            if (result.success) {
                setOptimizations({
                    optimizations: result.optimizations || [],
                    wasteReduction: result.wasteReduction || {},
                    costSavings: result.costSavings || {},
                    nutritionImprovements: result.nutritionImprovements || {}
                });
            }
        } catch (error) {
            console.error('Optimization failed:', error);
        } finally {
            setOptimizing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">⚡ Smart Optimization</h3>
                        <p className="text-sm text-gray-600">
                            AI-powered suggestions to reduce waste, save money, and improve nutrition
                        </p>
                    </div>
                    <button
                        onClick={runOptimization}
                        disabled={optimizing || !data?.inventory?.length}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        {optimizing ? '🔄 Optimizing...' : '⚡ Run Optimization'}
                    </button>
                </div>
            </div>

            {/* Optimization Results */}
            {optimizations ? (
                <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                            <div className="text-3xl mb-2">🗑️</div>
                            <div className="text-lg font-semibold text-gray-900">Waste Reduction</div>
                            <div className="text-2xl font-bold text-green-600">
                                {optimizations.wasteReduction.potentialSavings || '$0'}
                            </div>
                            <div className="text-sm text-gray-600">
                                {optimizations.wasteReduction.itemsAtRisk || 0} items at risk
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                            <div className="text-3xl mb-2">💰</div>
                            <div className="text-lg font-semibold text-gray-900">Cost Savings</div>
                            <div className="text-2xl font-bold text-blue-600">
                                {optimizations.costSavings.monthlyPotential || '$0'}
                            </div>
                            <div className="text-sm text-gray-600">per month potential</div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                            <div className="text-3xl mb-2">🥗</div>
                            <div className="text-lg font-semibold text-gray-900">Nutrition</div>
                            <div className="text-2xl font-bold text-purple-600">
                                {optimizations.nutritionImprovements.gaps?.length || 0}
                            </div>
                            <div className="text-sm text-gray-600">improvement areas</div>
                        </div>
                    </div>

                    {/* Optimization Actions */}
                    {optimizations.optimizations?.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">🎯 Recommended Actions</h4>
                            <div className="space-y-4">
                                {optimizations.optimizations.map((opt, index) => (
                                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                                        opt.priority === 'high' ? 'border-red-400 bg-red-50' :
                                            opt.priority === 'medium' ? 'border-yellow-400 bg-yellow-50' :
                                                'border-green-400 bg-green-50'
                                    }`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                                                        opt.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                            opt.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-green-100 text-green-700'
                                                    }`}>
                                                        {opt.priority} priority
                                                    </span>
                                                    <span
                                                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                                        {opt.type}
                                                    </span>
                                                </div>
                                                <h5 className="font-medium text-gray-900">{opt.action}</h5>
                                                <p className="text-sm text-gray-600 mt-1">{opt.impact}</p>
                                                {opt.timeframe && (
                                                    <p className="text-xs text-gray-500 mt-1">⏰ {opt.timeframe}</p>
                                                )}
                                            </div>
                                            <button
                                                className="ml-4 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detailed Recommendations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Waste Reduction */}
                        {optimizations.wasteReduction.actions?.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">🗑️ Waste Reduction</h4>
                                <div className="space-y-3">
                                    {optimizations.wasteReduction.actions.map((action, index) => (
                                        <div key={index}
                                             className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                            <span className="text-lg">♻️</span>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-700">{action}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cost Savings */}
                        {optimizations.costSavings.opportunities?.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">💰 Cost Savings</h4>
                                <div className="space-y-3">
                                    {optimizations.costSavings.opportunities.map((opportunity, index) => (
                                        <div key={index}
                                             className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                            <span className="text-lg">💡</span>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-700">{opportunity.action}</p>
                                                <p className="text-xs text-green-600 font-medium">Save {opportunity.savings}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Nutrition Improvements */}
                    {optimizations.nutritionImprovements.recommendations?.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">🥗 Nutrition Improvements</h4>

                            {optimizations.nutritionImprovements.gaps?.length > 0 && (
                                <div className="mb-4">
                                    <h5 className="text-sm font-medium text-gray-900 mb-2">Missing Nutrients:</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {optimizations.nutritionImprovements.gaps.map((gap, index) => (
                                            <span key={index}
                                                  className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                                {gap}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {optimizations.nutritionImprovements.recommendations.map((rec, index) => (
                                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                        <span className="text-lg">🍎</span>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-700">{rec}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <div className="text-4xl mb-4">⚡</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready for Optimization</h3>
                    <p className="text-gray-600 mb-4">
                        Click "Run Optimization" to get AI-powered suggestions for reducing waste, saving money, and
                        improving nutrition.
                    </p>
                    {!data?.inventory?.length && (
                        <p className="text-sm text-gray-500">
                            Add items to your inventory first to enable optimization.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function NutritionGoalsTracking({data, loading, onGoalsUpdate}) {
    const [goals, setGoals] = useState({
        dailyCalories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65,
        fiber: 25,
        sodium: 2300
    });

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (data?.nutritionGoals) {
            setGoals(data.nutritionGoals);
        }
    }, [data]);

    const saveGoals = async () => {
        try {
            setSaving(true);

            const response = await fetch('/api/nutrition/goals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(goals),
            });

            if (response.ok) {
                onGoalsUpdate?.();
            }
        } catch (error) {
            console.error('Error saving goals:', error);
        } finally {
            setSaving(false);
        }
    };

    const updateGoal = (key, value) => {
        setGoals(prev => ({
            ...prev,
            [key]: parseFloat(value) || 0
        }));
    };

    return (
        <div className="space-y-6">
            {/* Goals Setting */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">🎯 Nutrition Goals</h3>
                        <p className="text-sm text-gray-600">
                            Set your daily nutrition targets for personalized recommendations
                        </p>
                    </div>
                    <button
                        onClick={saveGoals}
                        disabled={saving}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? '💾 Saving...' : '💾 Save Goals'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        {key: 'dailyCalories', label: 'Daily Calories', unit: 'kcal', color: 'blue'},
                        {key: 'protein', label: 'Protein', unit: 'g', color: 'green'},
                        {key: 'carbs', label: 'Carbohydrates', unit: 'g', color: 'orange'},
                        {key: 'fat', label: 'Fat', unit: 'g', color: 'purple'},
                        {key: 'fiber', label: 'Fiber', unit: 'g', color: 'teal'},
                        {key: 'sodium', label: 'Sodium', unit: 'mg', color: 'red'}
                    ].map(goal => (
                        <div key={goal.key} className="space-y-2">
                            <label className="text-sm font-medium text-gray-900">
                                {goal.label}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={goals[goal.key]}
                                    onChange={(e) => updateGoal(goal.key, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={`Enter ${goal.label.toLowerCase()}`}
                                />
                                <span className="absolute right-3 top-2 text-sm text-gray-500">
                                    {goal.unit}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Goals Progress */}
            {data?.nutritionGoals && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 Current Progress</h4>
                    <p className="text-sm text-gray-600 mb-4">
                        Based on your recent nutrition data and inventory analysis
                    </p>

                    <div className="space-y-4">
                        {Object.entries(goals).map(([key, goal]) => {
                            // Mock progress data - replace with real data from your nutrition tracking
                            const current = goal * (0.7 + Math.random() * 0.6); // Random progress for demo
                            const percentage = Math.min((current / goal) * 100, 100);

                            return (
                                <div key={key} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-900">
                                            {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                                        </span>
                                        <span className="text-sm text-gray-600">
                                            {Math.round(current)} / {goal} {key === 'dailyCalories' ? 'kcal' : key === 'sodium' ? 'mg' : 'g'}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                percentage >= 90 ? 'bg-green-500' :
                                                    percentage >= 70 ? 'bg-blue-500' :
                                                        percentage >= 50 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                            }`}
                                            style={{width: `${Math.min(percentage, 100)}%`}}
                                        ></div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {percentage >= 90 ? '✅ Goal achieved!' :
                                            percentage >= 70 ? '👍 Good progress' :
                                                percentage >= 50 ? '📈 Making progress' :
                                                    '🎯 Need more focus'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Goal Recommendations */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">💡 Smart Recommendations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <h5 className="text-sm font-medium text-gray-900">🥗 Inventory Suggestions</h5>
                        <div className="space-y-2 text-sm text-gray-600">
                            <p>• Add high-protein items like Greek yogurt or lean meats</p>
                            <p>• Include more fiber-rich vegetables and whole grains</p>
                            <p>• Stock omega-3 sources like salmon or walnuts</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h5 className="text-sm font-medium text-gray-900">🍳 Recipe Focus</h5>
                        <div className="space-y-2 text-sm text-gray-600">
                            <p>• Look for high-protein breakfast options</p>
                            <p>• Try fiber-rich salads and vegetable dishes</p>
                            <p>• Consider heart-healthy cooking methods</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper function
function calculateOverallNutritionScore(data) {
    if (!data?.inventory?.length) return 'N/A';

    const itemsWithNutrition = data.inventory.filter(item => item.nutrition).length;
    const coverageScore = (itemsWithNutrition / data.inventory.length) * 40;

    const varietyCategories = [...new Set(data.inventory.map(item => item.category))].length;
    const varietyScore = Math.min(varietyCategories * 5, 30);

    const expiringItems = data.inventory.filter(item => {
        if (!item.expirationDate) return false;
        const expDate = new Date(item.expirationDate);
        const daysLeft = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 7 && daysLeft >= 0;
    }).length;
    const freshnessScore = Math.max(30 - (expiringItems * 5), 0);

    const totalScore = Math.round(coverageScore + varietyScore + freshnessScore);
    return `${totalScore}/100`;
}