'use client';
// file: /src/components/shopping/AIEnhancedShoppingListModal.js - AI-Powered Shopping Experience

import {useState, useEffect} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import EmailSharingModal from '@/components/sharing/EmailSharingModal';
import SaveShoppingListModal from '@/components/shared/SaveShoppingListModal';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {StoreLayoutUtils} from '@/lib/storeLayouts';
import {getAIOptimizedRoute, provideLearningFeedback, createAIShoppingSystem} from '@/lib/aiShoppingOptimizer';

export default function AIEnhancedShoppingListModal({
                                                        isOpen,
                                                        onClose,
                                                        shoppingList,
                                                        title = '🛒 AI Shopping Assistant',
                                                        subtitle = null,
                                                        sourceRecipeIds = [],
                                                        sourceMealPlanId = null,
                                                        onRefresh = null,
                                                        showRefresh = false
                                                    }) {
    const {data: session} = useSafeSession();
    const [filter, setFilter] = useState('all');
    const [purchasedItems, setPurchasedItems] = useState({});
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showActions, setShowActions] = useState(false);

    // AI Enhancement State
    const [aiMode, setAiMode] = useState('basic'); // 'basic', 'ai-optimized', 'learning'
    const [aiOptimization, setAiOptimization] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiInsights, setAiInsights] = useState(null);
    const [smartSuggestions, setSmartSuggestions] = useState(null);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [learningProgress, setLearningProgress] = useState(null);

    // Store Layout State (from Phase 2)
    const [selectedStore, setSelectedStore] = useState('');
    const [stores, setStores] = useState([]);
    const [showStoreSelector, setShowStoreSelector] = useState(false);

    // Shopping Progress Tracking
    const [shoppingProgress, setShoppingProgress] = useState({
        startTime: null,
        completedSections: [],
        currentSection: 0,
        timePerSection: {},
        routeDeviations: []
    });

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setFilter('all');
            setPurchasedItems({});
            setShowEmailModal(false);
            setShowSaveModal(false);
            setShowActions(false);
            setAiMode('basic');
            setAiOptimization(null);
            setShowAiPanel(false);
        } else {
            loadPreferences();
            fetchStores();
            initializeAISystem();
        }
    }, [isOpen]);

    const loadPreferences = () => {
        try {
            const savedStore = localStorage.getItem('preferred-shopping-store');
            const savedAiMode = localStorage.getItem('ai-shopping-mode');

            if (savedStore) setSelectedStore(savedStore);
            if (savedAiMode) setAiMode(savedAiMode);
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    };

    const fetchStores = async () => {
        try {
            const response = await fetch('/api/stores');
            const data = await response.json();
            if (data.success) {
                setStores(data.stores || []);
            }
        } catch (error) {
            console.error('Error fetching stores:', error);
        }
    };

    const initializeAISystem = async () => {
        if (!session?.user?.id) return;

        try {
            const aiSystem = createAIShoppingSystem(session.user.id);
            const learningStatus = aiSystem.getLearningStatus();
            setLearningProgress(learningStatus);

            console.log('🤖 AI Shopping System initialized:', learningStatus);
        } catch (error) {
            console.error('Error initializing AI system:', error);
        }
    };

    const handleAIOptimization = async () => {
        if (!selectedStore || !session?.user?.id) {
            alert('Please select a store first');
            return;
        }

        setAiLoading(true);
        setAiMode('ai-optimized');

        try {
            console.log('🚀 Starting AI optimization...');

            const optimization = await getAIOptimizedRoute(
                normalizedList.items,
                selectedStore,
                session.user.id,
                {
                    prioritizeSpeed: true,
                    avoidCrowds: true,
                    foodSafetyFirst: true
                }
            );

            setAiOptimization(optimization);
            setAiInsights(optimization.aiInsights);
            setSmartSuggestions(optimization.smartSuggestions);
            setShowAiPanel(true);

            // Save AI mode preference
            localStorage.setItem('ai-shopping-mode', 'ai-optimized');

            console.log('✅ AI optimization complete:', optimization);

        } catch (error) {
            console.error('AI optimization error:', error);
            alert('AI optimization failed. Using basic layout.');
            setAiMode('basic');
        } finally {
            setAiLoading(false);
        }
    };

    const startShoppingSession = () => {
        setShoppingProgress({
            startTime: new Date(),
            completedSections: [],
            currentSection: 0,
            timePerSection: {},
            routeDeviations: []
        });

        setAiMode('learning');
        console.log('📊 Started shopping session with AI learning');
    };

    const completeSection = (sectionIndex, sectionName) => {
        const now = new Date();
        const timeSpent = shoppingProgress.startTime ?
            (now - shoppingProgress.startTime) / 1000 / 60 : 0; // minutes

        setShoppingProgress(prev => ({
            ...prev,
            completedSections: [...prev.completedSections, sectionIndex],
            currentSection: sectionIndex + 1,
            timePerSection: {
                ...prev.timePerSection,
                [sectionName]: timeSpent
            }
        }));

        console.log(`✅ Section completed: ${sectionName} (${timeSpent.toFixed(1)}min)`);
    };

    const finishShoppingSession = async () => {
        if (!shoppingProgress.startTime) return;

        const totalTime = (new Date() - shoppingProgress.startTime) / 1000 / 60; // minutes
        const completionRate = shoppingProgress.completedSections.length / (aiOptimization?.optimizedRoute?.length || 1);

        // Gather user feedback
        const satisfaction = window.confirm('Was this shopping experience helpful?') ? 5 : 3;

        const feedback = {
            store: selectedStore,
            items: Object.values(normalizedList.items).flat(),
            route: aiOptimization?.optimizedRoute || [],
            timeSpent: totalTime,
            actualOrder: shoppingProgress.completedSections,
            userSatisfaction: satisfaction,
            completionTime: new Date().toISOString(),
            completionRate
        };

        try {
            await provideLearningFeedback(session.user.id, feedback);
            console.log('📊 Learning feedback provided successfully');

            // Update learning progress
            const aiSystem = createAIShoppingSystem(session.user.id);
            const updatedStatus = aiSystem.getLearningStatus();
            setLearningProgress(updatedStatus);

        } catch (error) {
            console.error('Error providing learning feedback:', error);
        }

        setAiMode('ai-optimized');
        alert(`Shopping session complete! Total time: ${totalTime.toFixed(1)} minutes`);
    };

    // Normalize shopping list structure
    const normalizeShoppingList = (list) => {
        if (!list) return {items: {}, summary: {totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0}};

        let normalizedItems = {};
        let summary = list.summary || list.stats || {};

        if (list.items) {
            if (Array.isArray(list.items)) {
                list.items.forEach(item => {
                    const category = item.category || 'Other';
                    if (!normalizedItems[category]) {
                        normalizedItems[category] = [];
                    }
                    normalizedItems[category].push(item);
                });
            } else if (typeof list.items === 'object') {
                normalizedItems = list.items;
            }
        }

        return {
            items: normalizedItems,
            summary: {
                totalItems: summary.totalItems || 0,
                needToBuy: summary.needToBuy || 0,
                inInventory: summary.inInventory || summary.alreadyHave || 0,
                purchased: summary.purchased || 0
            },
            generatedAt: list.generatedAt,
            recipes: list.recipes || []
        };
    };

    const normalizedList = normalizeShoppingList(shoppingList);

    // Handle checkbox changes
    const handleItemToggle = (itemKey) => {
        setPurchasedItems(prev => ({
            ...prev,
            [itemKey]: !prev[itemKey]
        }));
    };

    const markAllAsPurchased = () => {
        if (!normalizedList.items) return;

        const allItems = {};
        Object.values(normalizedList.items).flat().forEach(item => {
            const itemKey = `${item.ingredient || item.name}-${item.category || 'other'}`;
            allItems[itemKey] = true;
        });
        setPurchasedItems(allItems);
    };

    const clearAllPurchased = () => {
        setPurchasedItems({});
    };

    // Add purchased status to items
    const addPurchasedStatus = (items) => {
        return items.map(item => {
            const itemKey = `${item.ingredient || item.name}-${item.category || 'other'}`;
            return {
                ...item,
                purchased: purchasedItems[itemKey] || false,
                itemKey
            };
        });
    };

    // Filter items based on current filter
    const getFilteredItems = (items) => {
        const itemsWithStatus = addPurchasedStatus(items);

        switch (filter) {
            case 'needToBuy':
                return itemsWithStatus.filter(item => !item.inInventory && !item.purchased);
            case 'inInventory':
                return itemsWithStatus.filter(item => item.inInventory);
            case 'purchased':
                return itemsWithStatus.filter(item => item.purchased);
            default:
                return itemsWithStatus;
        }
    };

    // Get items for display based on mode
    const getItemsForDisplay = () => {
        if (aiMode === 'ai-optimized' && aiOptimization) {
            return aiOptimization.optimizedRoute;
        }
        return normalizedList.items;
    };

    // Group items by category for display
    const getGroupedItems = () => {
        if (aiMode === 'ai-optimized' && aiOptimization) {
            // Use AI-optimized route
            return aiOptimization.optimizedRoute.reduce((grouped, section) => {
                const sectionItems = [];
                section.categories.forEach(category => {
                    if (normalizedList.items[category]) {
                        const filtered = getFilteredItems(normalizedList.items[category]);
                        sectionItems.push(...filtered);
                    }
                });

                if (sectionItems.length > 0) {
                    grouped[section.name] = sectionItems;
                }
                return grouped;
            }, {});
        } else {
            // Use standard layout
            const grouped = {};
            Object.entries(normalizedList.items).forEach(([category, items]) => {
                const filtered = getFilteredItems(items);
                if (filtered.length > 0) {
                    grouped[category] = filtered;
                }
            });
            return grouped;
        }
    };

    // Calculate statistics
    const getStats = () => {
        if (!normalizedList.items) {
            return {totalItems: 0, needToBuy: 0, inInventory: 0, purchased: 0};
        }

        const allItems = Object.values(normalizedList.items).flat();
        const itemsWithStatus = addPurchasedStatus(allItems);

        return {
            totalItems: itemsWithStatus.length,
            needToBuy: itemsWithStatus.filter(item => !item.inInventory && !item.purchased).length,
            inInventory: itemsWithStatus.filter(item => item.inInventory).length,
            purchased: itemsWithStatus.filter(item => item.purchased).length
        };
    };

    const handleStoreSelection = (storeName) => {
        setSelectedStore(storeName);
        localStorage.setItem('preferred-shopping-store', storeName);
        setShowStoreSelector(false);
    };

    if (!isOpen || !shoppingList) {
        return null;
    }

    const stats = getStats();
    const groupedItems = getGroupedItems();

    return (
        <>
            <div style={{
                position: 'fixed',
                top: 'max(env(safe-area-inset-top, 0px), 0px)',
                left: 'env(safe-area-inset-left, 0px)',
                right: 'env(safe-area-inset-right, 0px)',
                bottom: '0px',
                paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'stretch',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '0'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    width: '100%',
                    maxWidth: '100vw',
                    height: '100vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    paddingBottom: 'max(env(safe-area-inset-bottom, 48px), 48px)'
                }}>
                    {/* Enhanced Header with AI Indicators */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: aiMode === 'ai-optimized' ? '#f0f9ff' : '#f8fafc',
                        flexShrink: 0
                    }}>
                        <div style={{flex: 1, minWidth: 0}}>
                            <h2 style={{
                                margin: 0,
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: '#111827',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {title}
                                {/* AI Mode Indicators */}
                                {aiMode === 'ai-optimized' && (
                                    <span style={{
                                        marginLeft: '0.5rem',
                                        fontSize: '0.8rem',
                                        color: '#0369a1',
                                        fontWeight: '500'
                                    }}>
                                        🤖 AI Optimized
                                    </span>
                                )}
                                {aiMode === 'learning' && (
                                    <span style={{
                                        marginLeft: '0.5rem',
                                        fontSize: '0.8rem',
                                        color: '#7c3aed',
                                        fontWeight: '500'
                                    }}>
                                        📊 Learning Mode
                                    </span>
                                )}
                            </h2>
                            {subtitle && (
                                <p style={{
                                    margin: '0.125rem 0 0 0',
                                    fontSize: '0.75rem',
                                    color: '#6b7280',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        <TouchEnhancedButton
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                color: '#6b7280',
                                padding: '0.5rem',
                                marginLeft: '0.5rem',
                                flexShrink: 0,
                                borderRadius: '0.375rem'
                            }}
                            title="Close"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>

                    {/* AI Insights Panel */}
                    {(aiInsights || learningProgress) && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: '#f0f9ff',
                            borderBottom: '1px solid #0284c7',
                            flexShrink: 0
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#0c4a6e'
                            }}>
                                <span>🤖</span>
                                {aiInsights && (
                                    <span style={{fontWeight: '500'}}>
                                        AI Confidence: {(aiInsights.confidenceScore * 100).toFixed(0)}% •
                                        Est. Time Savings: {aiInsights.estimatedTimeSavings}min
                                    </span>
                                )}
                                {learningProgress && (
                                    <span style={{fontWeight: '500'}}>
                                        Learning Level: {learningProgress.learningLevel} •
                                        {learningProgress.nextMilestone}
                                    </span>
                                )}
                                <TouchEnhancedButton
                                    onClick={() => setShowAiPanel(!showAiPanel)}
                                    style={{
                                        marginLeft: 'auto',
                                        backgroundColor: '#0284c7',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showAiPanel ? '🔽 Hide' : '🔼 Details'}
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    )}

                    {/* Expandable AI Panel */}
                    {showAiPanel && aiOptimization && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#fafbff',
                            borderBottom: '1px solid #e0e7ff',
                            flexShrink: 0,
                            maxHeight: '200px',
                            overflow: 'auto'
                        }}>
                            {/* AI Recommendations */}
                            {smartSuggestions && (
                                <div style={{marginBottom: '1rem'}}>
                                    <h4 style={{
                                        margin: '0 0 0.5rem 0',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#1e40af'
                                    }}>
                                        🎯 Smart Suggestions
                                    </h4>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: '0.5rem'
                                    }}>
                                        {smartSuggestions.itemSuggestions?.slice(0, 2).map((suggestion, index) => (
                                            <div key={index} style={{
                                                padding: '0.5rem',
                                                backgroundColor: '#dbeafe',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem'
                                            }}>
                                                <div style={{fontWeight: '500', color: '#1e40af'}}>
                                                    {suggestion.type === 'missing-staple' && '📝 Missing Item'}
                                                    {suggestion.type === 'organic-alternative' && '🌱 Organic Option'}
                                                    {suggestion.type === 'bulk-opportunity' && '📦 Bulk Buy'}
                                                </div>
                                                <div style={{color: '#1e3a8a', marginTop: '0.25rem'}}>
                                                    {suggestion.message}
                                                </div>
                                            </div>
                                        ))}

                                        {smartSuggestions.timingAdvice?.slice(0, 1).map((suggestion, index) => (
                                            <div key={`timing-${index}`} style={{
                                                padding: '0.5rem',
                                                backgroundColor: '#fef3c7',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem'
                                            }}>
                                                <div style={{fontWeight: '500', color: '#d97706'}}>
                                                    ⏰ Timing Tip
                                                </div>
                                                <div style={{color: '#92400e', marginTop: '0.25rem'}}>
                                                    {suggestion.message}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Traffic Info */}
                            {aiOptimization.trafficInfo && (
                                <div>
                                    <h4 style={{
                                        margin: '0 0 0.5rem 0',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#1e40af'
                                    }}>
                                        🚦 Store Traffic
                                    </h4>
                                    <div style={{
                                        padding: '0.5rem',
                                        backgroundColor: aiOptimization.trafficInfo.overallTraffic > 0.7 ? '#fee2e2' : '#f0fdf4',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem'
                                    }}>
                                        <div style={{fontWeight: '500'}}>
                                            Current Level: {(aiOptimization.trafficInfo.overallTraffic * 100).toFixed(0)}%
                                            {aiOptimization.trafficInfo.overallTraffic > 0.7 ? ' (Busy)' : ' (Good)'}
                                        </div>
                                        {aiOptimization.trafficInfo.recommendations?.[0] && (
                                            <div style={{marginTop: '0.25rem', color: '#6b7280'}}>
                                                {aiOptimization.trafficInfo.recommendations[0].message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Statistics with AI Enhancements */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: '#f8fafc',
                        flexShrink: 0
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: aiMode === 'ai-optimized' ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)',
                            gap: '0.5rem'
                        }}>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                textAlign: 'center',
                                border: '1px solid #e5e7eb'
                            }}>
                                <div style={{fontSize: '1rem', fontWeight: 'bold', color: '#1e293b'}}>
                                    {stats.totalItems}
                                </div>
                                <div style={{fontSize: '0.625rem', color: '#64748b'}}>
                                    Total
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                textAlign: 'center',
                                border: '1px solid #bfdbfe'
                            }}>
                                <div style={{fontSize: '1rem', fontWeight: 'bold', color: '#0369a1'}}>
                                    {stats.inInventory}
                                </div>
                                <div style={{fontSize: '0.625rem', color: '#0284c7'}}>
                                    Have
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                textAlign: 'center',
                                border: '1px solid #fed7aa'
                            }}>
                                <div style={{fontSize: '1rem', fontWeight: 'bold', color: '#d97706'}}>
                                    {stats.needToBuy}
                                </div>
                                <div style={{fontSize: '0.625rem', color: '#f59e0b'}}>
                                    Need
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                textAlign: 'center',
                                border: '1px solid #e9d5ff'
                            }}>
                                <div style={{fontSize: '1rem', fontWeight: 'bold', color: '#7c3aed'}}>
                                    {stats.purchased}
                                </div>
                                <div style={{fontSize: '0.625rem', color: '#8b5cf6'}}>
                                    Bought
                                </div>
                            </div>

                            {/* AI Optimization Score */}
                            {aiMode === 'ai-optimized' && aiInsights && (
                                <div style={{
                                    backgroundColor: 'white',
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    textAlign: 'center',
                                    border: '1px solid #bfdbfe'
                                }}>
                                    <div style={{fontSize: '1rem', fontWeight: 'bold', color: '#0369a1'}}>
                                        {(aiInsights.confidenceScore * 100).toFixed(0)}%
                                    </div>
                                    <div style={{fontSize: '0.625rem', color: '#0284c7'}}>
                                        AI Score
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Enhanced Controls with AI Features */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        backgroundColor: '#f8fafc',
                        flexShrink: 0
                    }}>
                        {/* Filter Dropdown */}
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            style={{
                                padding: '0.375rem 0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                backgroundColor: 'white',
                                flex: '1',
                                minWidth: '80px'
                            }}
                        >
                            <option value="all">All ({stats.totalItems})</option>
                            <option value="needToBuy">Need ({stats.needToBuy})</option>
                            <option value="inInventory">Have ({stats.inInventory})</option>
                            <option value="purchased">Bought ({stats.purchased})</option>
                        </select>

                        {/* Store Selection */}
                        <TouchEnhancedButton
                            onClick={() => setShowStoreSelector(true)}
                            style={{
                                backgroundColor: selectedStore ? '#059669' : '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.375rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            🏪 {selectedStore || 'Store'}
                        </TouchEnhancedButton>

                        {/* AI Optimization Button */}
                        <TouchEnhancedButton
                            onClick={handleAIOptimization}
                            disabled={!selectedStore || aiLoading}
                            style={{
                                backgroundColor: aiMode === 'ai-optimized' ? '#0284c7' : '#7c3aed',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.375rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: !selectedStore || aiLoading ? 'not-allowed' : 'pointer',
                                fontWeight: '500',
                                opacity: !selectedStore || aiLoading ? 0.6 : 1
                            }}
                        >
                            {aiLoading ? '⏳ AI...' : aiMode === 'ai-optimized' ? '🤖 AI On' : '🤖 AI'}
                        </TouchEnhancedButton>

                        {/* Learning Mode Toggle */}
                        {aiMode === 'ai-optimized' && (
                            <TouchEnhancedButton
                                onClick={aiMode === 'learning' ? finishShoppingSession : startShoppingSession}
                                style={{
                                    backgroundColor: aiMode === 'learning' ? '#dc2626' : '#7c3aed',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.375rem 0.5rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                {aiMode === 'learning' ? '✓ Finish' : '📊 Learn'}
                            </TouchEnhancedButton>
                        )}

                        {/* Quick Actions */}
                        {aiMode !== 'learning' && (
                            <>
                                <TouchEnhancedButton
                                    onClick={markAllAsPurchased}
                                    style={{
                                        backgroundColor: '#8b5cf6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.375rem 0.5rem',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    ✓ All
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={clearAllPurchased}
                                    style={{
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.375rem 0.5rem',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    ✗ Clear
                                </TouchEnhancedButton>
                            </>
                        )}

                        {/* More Actions Toggle */}
                        <TouchEnhancedButton
                            onClick={() => setShowActions(!showActions)}
                            style={{
                                backgroundColor: '#374151',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.375rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            {showActions ? '⌄ Less' : '⋯ More'}
                        </TouchEnhancedButton>
                    </div>

                    {/* Store Selection Modal */}
                    {showStoreSelector && (
                        <div style={{
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            right: '0',
                            bottom: '0',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '1rem'
                        }}>
                            <div style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                maxWidth: '400px',
                                width: '100%',
                                maxHeight: '80vh',
                                overflow: 'auto'
                            }}>
                                <h3 style={{
                                    margin: '0 0 1rem 0',
                                    fontSize: '1.125rem',
                                    fontWeight: '600',
                                    color: '#111827'
                                }}>
                                    🏪 Select Your Store for AI Optimization
                                </h3>

                                {/* Your Stores */}
                                {stores.length > 0 && (
                                    <div style={{marginBottom: '1rem'}}>
                                        <h4 style={{
                                            margin: '0 0 0.5rem 0',
                                            fontSize: '0.875rem',
                                            fontWeight: '500',
                                            color: '#6b7280'
                                        }}>
                                            Your Stores
                                        </h4>
                                        <div style={{
                                            display: 'grid',
                                            gap: '0.5rem',
                                            maxHeight: '200px',
                                            overflow: 'auto'
                                        }}>
                                            {stores.map(store => (
                                                <TouchEnhancedButton
                                                    key={store._id}
                                                    onClick={() => handleStoreSelection(store.name)}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '0.75rem',
                                                        backgroundColor: selectedStore === store.name ? '#dbeafe' : '#f9fafb',
                                                        border: selectedStore === store.name ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{
                                                            fontWeight: '500',
                                                            color: '#111827',
                                                            fontSize: '0.875rem'
                                                        }}>
                                                            {store.name}
                                                        </div>
                                                        {store.chain && (
                                                            <div style={{
                                                                fontSize: '0.75rem',
                                                                color: '#6b7280'
                                                            }}>
                                                                {store.chain}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{fontSize: '1.25rem'}}>
                                                        🏪
                                                    </div>
                                                </TouchEnhancedButton>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Popular Store Chains */}
                                <div style={{marginBottom: '1rem'}}>
                                    <h4 style={{
                                        margin: '0 0 0.5rem 0',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        color: '#6b7280'
                                    }}>
                                        Popular Chains
                                    </h4>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: '0.5rem'
                                    }}>
                                        {['Walmart', 'Target', 'Costco', 'Kroger', 'Hy-Vee', 'Trader Joe\'s'].map(chain => (
                                            <TouchEnhancedButton
                                                key={chain}
                                                onClick={() => handleStoreSelection(chain)}
                                                style={{
                                                    padding: '0.75rem',
                                                    backgroundColor: selectedStore === chain ? '#dbeafe' : 'white',
                                                    border: selectedStore === chain ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {chain}
                                            </TouchEnhancedButton>
                                        ))}
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: '0.5rem'
                                }}>
                                    <TouchEnhancedButton
                                        onClick={() => setShowStoreSelector(false)}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            backgroundColor: '#f3f4f6',
                                            color: '#374151',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '500'
                                        }}
                                    >
                                        Cancel
                                    </TouchEnhancedButton>
                                    {selectedStore && (
                                        <TouchEnhancedButton
                                            onClick={() => {
                                                setShowStoreSelector(false);
                                                if (aiMode !== 'ai-optimized') {
                                                    handleAIOptimization();
                                                }
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Use AI Optimization
                                        </TouchEnhancedButton>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Expandable Actions Panel */}
                    {showActions && (
                        <div style={{
                            padding: '0.5rem 1rem',
                            borderBottom: '1px solid #f3f4f6',
                            backgroundColor: '#f1f5f9',
                            flexShrink: 0
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                                gap: '0.5rem'
                            }}>
                                {showRefresh && onRefresh && (
                                    <TouchEnhancedButton
                                        onClick={onRefresh}
                                        style={{
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '0.5rem',
                                            fontSize: '0.65rem',
                                            cursor: 'pointer',
                                            textAlign: 'center'
                                        }}
                                    >
                                        🔄<br/>Refresh
                                    </TouchEnhancedButton>
                                )}
                                <TouchEnhancedButton
                                    onClick={() => setShowSaveModal(true)}
                                    style={{
                                        backgroundColor: '#8b5cf6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    💾<br/>Save
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => setShowEmailModal(true)}
                                    style={{
                                        backgroundColor: '#16a34a',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    📧<br/>Share
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => {
                                        const textContent = `AI Shopping List - ${title}\n\n` +
                                            Object.entries(groupedItems)
                                                .map(([category, items]) => {
                                                    const categoryItems = items.map(item => {
                                                        const checkbox = item.purchased ? '☑' : '☐';
                                                        const status = item.purchased ? ' [PURCHASED]' :
                                                            item.inInventory ? ' [IN INVENTORY]' : '';
                                                        const recipes = item.recipes && item.recipes.length > 0 ?
                                                            ` (${item.recipes.join(', ')})` : '';
                                                        return `  ${checkbox} ${item.amount ? `${item.amount} ` : ''}${item.ingredient || item.name}${status}${recipes}`;
                                                    });
                                                    return `${category}:\n${categoryItems.join('\n')}`;
                                                })
                                                .join('\n\n') +
                                            (aiInsights ? `\n\nAI Insights:\n• Confidence Score: ${(aiInsights.confidenceScore * 100).toFixed(0)}%\n• Estimated Time Savings: ${aiInsights.estimatedTimeSavings} minutes\n• Store: ${selectedStore}` : '');

                                        const blob = new Blob([textContent], {type: 'text/plain'});
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `ai-shopping-list-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                    style={{
                                        backgroundColor: '#0891b2',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    📝<br/>Export
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    )}

                    {/* Main Shopping List Content */}
                    <div
                        id="ai-shopping-list-content"
                        style={{
                            flex: 1,
                            padding: '1rem',
                            overflow: 'auto',
                            backgroundColor: 'white',
                            minHeight: 0
                        }}
                    >
                        {Object.keys(groupedItems).length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '2rem 1rem',
                                color: '#6b7280'
                            }}>
                                <div style={{fontSize: '2rem', marginBottom: '1rem'}}>🛒</div>
                                <p>No items match the current filter</p>
                                {aiMode === 'basic' && selectedStore && (
                                    <TouchEnhancedButton
                                        onClick={handleAIOptimization}
                                        style={{
                                            marginTop: '1rem',
                                            backgroundColor: '#7c3aed',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '0.75rem 1.5rem',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🤖 Try AI Optimization
                                    </TouchEnhancedButton>
                                )}
                            </div>
                        ) : aiMode === 'ai-optimized' && aiOptimization ? (
                            // AI-Optimized Route Display
                            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                                <div style={{
                                    textAlign: 'center',
                                    padding: '1rem',
                                    backgroundColor: '#f0f9ff',
                                    borderRadius: '8px',
                                    border: '1px solid #0284c7'
                                }}>
                                    <h3 style={{
                                        margin: '0 0 0.5rem 0',
                                        fontSize: '1.125rem',
                                        fontWeight: '600',
                                        color: '#0c4a6e'
                                    }}>
                                        🤖 AI-Optimized Shopping Route
                                    </h3>
                                    <p style={{
                                        margin: 0,
                                        fontSize: '0.875rem',
                                        color: '#1e40af'
                                    }}>
                                        Optimized for {selectedStore} • {(aiInsights.confidenceScore * 100).toFixed(0)}% confidence
                                    </p>
                                </div>

                                {aiOptimization.optimizedRoute.map((section, sectionIndex) => (
                                    <div key={sectionIndex} style={{
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '8px',
                                        border: '2px solid #e2e8f0',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            backgroundColor: '#1e293b',
                                            color: 'white',
                                            padding: '1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem'
                                            }}>
                                                <div style={{
                                                    backgroundColor: '#3b82f6',
                                                    color: 'white',
                                                    borderRadius: '50%',
                                                    width: '2rem',
                                                    height: '2rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {sectionIndex + 1}
                                                </div>
                                                <div>
                                                    <h4 style={{
                                                        margin: 0,
                                                        fontSize: '1rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        {section.emoji} {section.name}
                                                    </h4>
                                                </div>
                                            </div>
                                            <div style={{
                                                textAlign: 'right',
                                                fontSize: '0.875rem'
                                            }}>
                                                <div>{section.itemCount || 0} items</div>
                                                <div>~{section.estimatedTime || 5} min</div>
                                            </div>
                                            {aiMode === 'learning' && (
                                                <TouchEnhancedButton
                                                    onClick={() => completeSection(sectionIndex, section.name)}
                                                    disabled={shoppingProgress.completedSections.includes(sectionIndex)}
                                                    style={{
                                                        backgroundColor: shoppingProgress.completedSections.includes(sectionIndex) ? '#059669' : '#7c3aed',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '0.375rem 0.75rem',
                                                        fontSize: '0.75rem',
                                                        cursor: shoppingProgress.completedSections.includes(sectionIndex) ? 'not-allowed' : 'pointer',
                                                        opacity: shoppingProgress.completedSections.includes(sectionIndex) ? 0.7 : 1
                                                    }}
                                                >
                                                    {shoppingProgress.completedSections.includes(sectionIndex) ? '✅ Done' : '✓ Complete'}
                                                </TouchEnhancedButton>
                                            )}
                                        </div>
                                        <div style={{padding: '1rem'}}>
                                            {/* AI Insights for Section */}
                                            {section.aiInsights && (
                                                <div style={{
                                                    marginBottom: '1rem',
                                                    padding: '0.75rem',
                                                    backgroundColor: '#f0f9ff',
                                                    borderRadius: '6px',
                                                    border: '1px solid #bfdbfe'
                                                }}>
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: '#1e40af',
                                                        fontWeight: '500'
                                                    }}>
                                                        🤖 AI Insights: {section.aiInsights.optimalTime}
                                                        {section.aiInsights.crowdLevel > 0.7 && ' • Expected to be busy'}
                                                    </div>
                                                    {section.aiInsights.efficiencyTips?.length > 0 && (
                                                        <div style={{
                                                            marginTop: '0.5rem',
                                                            fontSize: '0.7rem',
                                                            color: '#1e3a8a'
                                                        }}>
                                                            💡 {section.aiInsights.efficiencyTips[0]}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                                                {(function() {
                                                    // Get items for this section
                                                    const sectionItems = [];
                                                    section.categories.forEach(category => {
                                                        if (normalizedList.items[category]) {
                                                            const filtered = getFilteredItems(normalizedList.items[category]);
                                                            sectionItems.push(...filtered);
                                                        }
                                                    });

                                                    return sectionItems.map((item, itemIndex) => {
                                                        const itemKey = item.itemKey || `${item.ingredient || item.name}-${item.category}`;
                                                        const isPurchased = item.purchased;

                                                        return (
                                                            <div
                                                                key={itemIndex}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.75rem',
                                                                    padding: '0.75rem',
                                                                    backgroundColor: isPurchased ? '#f0fdf4' : 'white',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #e5e7eb',
                                                                    opacity: isPurchased ? 0.7 : 1,
                                                                    textDecoration: isPurchased ? 'line-through' : 'none'
                                                                }}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isPurchased}
                                                                    onChange={() => handleItemToggle(itemKey)}
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        transform: 'scale(1.3)',
                                                                        accentColor: '#8b5cf6'
                                                                    }}
                                                                />
                                                                <div style={{flex: 1}}>
                                                                    <div style={{
                                                                        fontWeight: '500',
                                                                        color: '#374151',
                                                                        fontSize: '0.95rem'
                                                                    }}>
                                                                        {item.amount && `${item.amount} `}{item.ingredient || item.name}
                                                                    </div>
                                                                    {item.recipes && item.recipes.length > 0 && (
                                                                        <div style={{
                                                                            fontSize: '0.75rem',
                                                                            color: '#6b7280',
                                                                            marginTop: '0.25rem'
                                                                        }}>
                                                                            Used in: {item.recipes.join(', ')}
                                                                        </div>
                                                                    )}
                                                                    {item.inInventory && (
                                                                        <div style={{
                                                                            fontSize: '0.7rem',
                                                                            color: '#16a34a',
                                                                            backgroundColor: '#f0fdf4',
                                                                            padding: '0.25rem 0.5rem',
                                                                            borderRadius: '4px',
                                                                            marginTop: '0.25rem',
                                                                            border: '1px solid #bbf7d0'
                                                                        }}>
                                                                            ✅ In inventory: {item.haveAmount || 'Available'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* AI Recommendations Footer */}
                                {aiInsights && aiInsights.improvementReasons && (
                                    <div style={{
                                        backgroundColor: '#eff6ff',
                                        borderRadius: '8px',
                                        border: '1px solid #bfdbfe',
                                        padding: '1rem'
                                    }}>
                                        <h4 style={{
                                            margin: '0 0 0.75rem 0',
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            color: '#1e40af'
                                        }}>
                                            🎯 AI Optimizations Applied
                                        </h4>
                                        <ul style={{
                                            margin: 0,
                                            paddingLeft: '1.25rem',
                                            color: '#1e40af'
                                        }}>
                                            {aiInsights.improvementReasons.map((reason, index) => (
                                                <li key={index} style={{
                                                    fontSize: '0.875rem',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    {reason}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Standard Category Display
                            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                                {Object.entries(groupedItems).map(([category, items]) => (
                                    <div key={category}>
                                        <h3 style={{
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            color: '#374151',
                                            margin: '0 0 0.75rem 0',
                                            padding: '0.5rem 0',
                                            borderBottom: '2px solid #e5e7eb',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span>{category}</span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: '400',
                                                color: '#6b7280',
                                                backgroundColor: '#f3f4f6',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '12px'
                                            }}>
                                                {items.length}
                                            </span>
                                        </h3>
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                                            {items.map((item, index) => {
                                                const itemKey = item.itemKey || `${item.ingredient || item.name}-${category}`;
                                                const isPurchased = item.purchased;

                                                return (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: '0.75rem',
                                                            padding: '0.75rem',
                                                            backgroundColor: isPurchased ? '#f0fdf4' : '#fafafa',
                                                            borderRadius: '8px',
                                                            border: '1px solid #e5e7eb',
                                                            opacity: isPurchased ? 0.7 : 1,
                                                            textDecoration: isPurchased ? 'line-through' : 'none'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isPurchased}
                                                            onChange={() => handleItemToggle(itemKey)}
                                                            style={{
                                                                marginTop: '0.125rem',
                                                                cursor: 'pointer',
                                                                transform: 'scale(1.3)',
                                                                accentColor: '#8b5cf6'
                                                            }}
                                                        />

                                                        <div style={{flex: 1, minWidth: 0}}>
                                                            <div style={{
                                                                fontWeight: '500',
                                                                color: '#374151',
                                                                fontSize: '0.95rem',
                                                                lineHeight: '1.4',
                                                                marginBottom: '0.25rem'
                                                            }}>
                                                                {item.amount && `${item.amount} `}{item.ingredient || item.name}
                                                            </div>

                                                            {item.inInventory && (
                                                                <div style={{
                                                                    fontSize: '0.8rem',
                                                                    color: '#16a34a',
                                                                    backgroundColor: '#f0fdf4',
                                                                    padding: '0.25rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    marginBottom: '0.25rem',
                                                                    border: '1px solid #bbf7d0'
                                                                }}>
                                                                    ✅ In inventory: {item.haveAmount || 'Available'}
                                                                    {item.inventoryItem?.location &&
                                                                        ` (${item.inventoryItem.location})`
                                                                    }
                                                                </div>
                                                            )}

                                                            {item.recipes && item.recipes.length > 0 && (
                                                                <div style={{
                                                                    fontSize: '0.7rem',
                                                                    color: '#6b7280',
                                                                    backgroundColor: '#f8fafc',
                                                                    padding: '0.25rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #e2e8f0'
                                                                }}>
                                                                    Used in: {item.recipes.join(', ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer with Close Button */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        paddingBottom: `calc(0.75rem + max(env(safe-area-inset-bottom, 8px), 8px))`,
                        borderTop: '1px solid #e5e7eb',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexShrink: 0
                    }}>
                        <div style={{
                            fontSize: '0.7rem',
                            color: '#6b7280'
                        }}>
                            {normalizedList.generatedAt && (
                                `Generated ${new Date(normalizedList.generatedAt).toLocaleString()}`
                            )}
                            {/* AI Status Indicators */}
                            {selectedStore && (
                                <div style={{marginTop: '0.25rem'}}>
                                    🏪 Store: {selectedStore}
                                    {aiMode === 'ai-optimized' && aiInsights && (
                                        <span style={{color: '#059669'}}> • AI Optimized ({(aiInsights.confidenceScore * 100).toFixed(0)}%)</span>
                                    )}
                                </div>
                            )}
                            {learningProgress && (
                                <div style={{marginTop: '0.25rem'}}>
                                    📊 Learning Level: {learningProgress.learningLevel} ({learningProgress.totalTrips} trips)
                                </div>
                            )}
                        </div>
                        <TouchEnhancedButton
                            onClick={onClose}
                            style={{
                                backgroundColor: '#374151',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.5rem 1rem',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>

            {/* Email Share Modal */}
            <EmailSharingModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                shoppingList={normalizedList}
                context="ai-shopping"
                contextName={`AI Shopping List - ${selectedStore || 'Store'}`}
            />

            {/* Save Shopping List Modal */}
            <SaveShoppingListModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={(savedList) => {
                    console.log('AI Shopping list saved successfully:', savedList);
                }}
                shoppingList={normalizedList}
                listType="ai-optimized"
                contextName={`AI Shopping List - ${selectedStore || 'Store'}`}
                sourceRecipeIds={sourceRecipeIds}
                sourceMealPlanId={sourceMealPlanId}
                metadata={{
                    store: selectedStore,
                    aiMode: aiMode,
                    aiInsights: aiInsights,
                    optimizationData: aiOptimization
                }}
            />
        </>
    );
}