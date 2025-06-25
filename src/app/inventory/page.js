'use client';
// file: /src/app/inventory/page.js - v12


import {useSafeSession} from '@/hooks/useSafeSession';
import {useEffect, useState, Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import UPCLookup from '@/components/inventory/UPCLookup';
import InventoryConsumption from '@/components/inventory/InventoryConsumption';
import ConsumptionHistory from '@/components/inventory/ConsumptionHistory';
import CommonItemsWizard from '@/components/inventory/CommonItemsWizard';
import {redirect} from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import {getApiUrl} from '@/lib/api-config';
import {useSubscription} from '@/hooks/useSubscription';
import {FEATURE_GATES} from '@/lib/subscription-config';
import FeatureGate from '@/components/subscription/FeatureGate';

// Import smart display utilities
import {
    formatInventoryDisplayText,
    getPrimaryDisplayText,
    getSecondaryDisplayText,
    hasDualUnits,
    getShortDisplayText
} from '@/lib/inventoryDisplayUtils';

// Separate component for search params to wrap in Suspense
function InventoryContent() {
    const {data: session, status, update} = useSafeSession();
    const searchParams = useSearchParams();
    const shouldShowAddForm = searchParams.get('action') === 'add';

    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(shouldShowAddForm);
    const [editingItem, setEditingItem] = useState(null);
    const [consumingItem, setConsumingItem] = useState(null);
    const [showConsumptionHistory, setShowConsumptionHistory] = useState(false);
    const [showCommonItemsWizard, setShowCommonItemsWizard] = useState(false);

    // Advanced filtering and search
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterLocation, setFilterLocation] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('expiration');
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        category: '',
        quantity: 1,
        unit: 'item',
        // Dual unit fields
        secondaryQuantity: '',
        secondaryUnit: '',
        location: 'pantry',
        expirationDate: '',
        upc: ''
    });
    const subscription = useSubscription();

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session) {
            fetchInventory();
        }
    }, [session]);

    useEffect(() => {
        const shouldOpenWizard = searchParams.get('wizard') === 'true';
        if (shouldOpenWizard) {
            setShowCommonItemsWizard(true);
        }
    }, [searchParams]);

    // Add this useEffect to listen for inventory updates
    useEffect(() => {
        const handleInventoryUpdate = () => {
            fetchInventory();
        };

        window.addEventListener('inventoryUpdated', handleInventoryUpdate);

        return () => {
            window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
        };
    }, []);

    const getUsageInfo = () => {
        if (!subscription || subscription.loading) {
            return {current: 0, limit: '...', isUnlimited: false, tier: 'free'};
        }

        const tier = subscription.tier || 'free';
        return {
            current: inventory.length,
            limit: tier === 'free' ? 50 :
                   tier === 'gold' ? 250 :
                   tier === 'admin' ? 'unlimited' :
                   'unlimited',
            isUnlimited: tier === 'platinum' || tier === 'admin',
            tier
        };
    };

    // Add limit checking functions
    const getUsageColor = (isActive = false) => {
        if (subscription.loading) {
            return isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600';
        }

        const usage = getUsageInfo();
        const percentage = usage.isUnlimited ? 0 : (usage.current / (typeof usage.limit === 'number' ? usage.limit : 999999)) * 100;

        if (isActive) {
            if (percentage >= 100) return 'bg-red-100 text-red-600'; // At limit
            if (percentage >= 80) return 'bg-orange-100 text-orange-600'; // Near limit
            return 'bg-indigo-100 text-indigo-600'; // Normal
        } else {
            if (percentage >= 100) return 'bg-red-200 text-red-700'; // At limit
            if (percentage >= 80) return 'bg-orange-200 text-orange-700'; // Near limit
            return 'bg-gray-200 text-gray-600'; // Normal
        }
    };

    const fetchInventory = async () => {
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

    // Handle Common Items Wizard completion
    const handleCommonItemsComplete = async (result) => {
        if (result.success) {
            // Show success message
            alert(`🎉 Successfully added ${result.itemsAdded} common items to your inventory!`);

            // Refresh inventory to show new items
            await fetchInventory();
        }
        setShowCommonItemsWizard(false);
    };

    // Enhanced consumption handler with dual unit support
    const handleConsumption = async (consumptionData, mode = 'single') => {
        try {
            console.log('Handling consumption:', {consumptionData, mode});

            const response = await fetch(getApiUrl('/api/inventory/consume'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    consumptions: consumptionData,
                    mode: mode
                }),
            });

            const result = await response.json();

            if (result.success) {
                // Refresh inventory
                await fetchInventory();

                // Show success message
                const {summary} = result;
                let message = 'Inventory updated successfully!';

                if (summary.itemsRemoved.length > 0) {
                    message += ` Removed: ${summary.itemsRemoved.join(', ')}.`;
                }
                if (summary.itemsUpdated.length > 0) {
                    message += ` Updated quantities for ${summary.itemsUpdated.length} items.`;
                }

                alert(message);
            } else {
                throw new Error(result.error || 'Failed to update inventory');
            }
        } catch (error) {
            console.error('Error consuming items:', error);
            alert('Error updating inventory: ' + error.message);
            throw error;
        }
    };

    // Get expiration status for an item
    const getExpirationStatus = (expirationDate) => {
        if (!expirationDate) return {
            status: 'no-date',
            color: 'gray',
            bgColor: 'bg-gray-50',
            textColor: 'text-gray-600',
            label: 'No expiration date'
        };

        const expDate = new Date(expirationDate);
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const expDateStart = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
        const daysUntil = Math.ceil((expDateStart - todayStart) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) {
            return {
                status: 'expired',
                color: 'red',
                bgColor: 'bg-red-50',
                textColor: 'text-red-600',
                label: `Expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`,
                icon: '🚨'
            };
        } else if (daysUntil === 0) {
            return {
                status: 'expires-today',
                color: 'orange',
                bgColor: 'bg-orange-50',
                textColor: 'text-orange-600',
                label: 'Expires today',
                icon: '⚠️'
            };
        } else if (daysUntil <= 3) {
            return {
                status: 'expires-soon',
                color: 'orange',
                bgColor: 'bg-orange-50',
                textColor: 'text-orange-600',
                label: `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
                icon: '⏰'
            };
        } else if (daysUntil <= 7) {
            return {
                status: 'expires-week',
                color: 'yellow',
                bgColor: 'bg-yellow-50',
                textColor: 'text-yellow-600',
                label: `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
                icon: '📅'
            };
        } else {
            return {
                status: 'fresh',
                color: 'green',
                bgColor: 'bg-green-50',
                textColor: 'text-green-600',
                label: `Fresh (${daysUntil} days left)`,
                icon: '✅'
            };
        }
    };

    // Advanced filter and sort inventory with search
    const getFilteredAndSortedInventory = () => {
        let filtered = [...inventory];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(query) ||
                (item.brand && item.brand.toLowerCase().includes(query)) ||
                (item.category && item.category.toLowerCase().includes(query)) ||
                (item.upc && item.upc.includes(query))
            );
        }

        // Apply status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(item => {
                const status = getExpirationStatus(item.expirationDate);
                switch (filterStatus) {
                    case 'expired':
                        return status.status === 'expired';
                    case 'expiring':
                        return ['expires-today', 'expires-soon', 'expires-week'].includes(status.status);
                    case 'fresh':
                        return status.status === 'fresh' || status.status === 'no-date';
                    default:
                        return true;
                }
            });
        }

        // Apply location filter
        if (filterLocation !== 'all') {
            filtered = filtered.filter(item => item.location === filterLocation);
        }

        // Apply category filter
        if (filterCategory !== 'all') {
            filtered = filtered.filter(item =>
                filterCategory === 'uncategorized'
                    ? (!item.category || item.category === '')
                    : item.category === filterCategory
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'expiration':
                    if (!a.expirationDate && !b.expirationDate) return 0;
                    if (!a.expirationDate) return 1;
                    if (!b.expirationDate) return -1;

                    const aStatus = getExpirationStatus(a.expirationDate);
                    const bStatus = getExpirationStatus(b.expirationDate);

                    const priorityOrder = ['expired', 'expires-today', 'expires-soon', 'expires-week', 'fresh', 'no-date'];
                    const aPriority = priorityOrder.indexOf(aStatus.status);
                    const bPriority = priorityOrder.indexOf(bStatus.status);

                    if (aPriority !== bPriority) {
                        return aPriority - bPriority;
                    }

                    return new Date(a.expirationDate) - new Date(b.expirationDate);

                case 'name':
                    return a.name.localeCompare(b.name);
                case 'category':
                    return (a.category || 'Other').localeCompare(b.category || 'Other');
                case 'location':
                    return a.location.localeCompare(b.location);
                case 'quantity':
                    return b.quantity - a.quantity; // Highest quantity first
                case 'date-added':
                    return new Date(b.addedDate || 0) - new Date(a.addedDate || 0); // Newest first
                default:
                    return 0;
            }
        });

        return filtered;
    };

    // Get unique values for filter dropdowns
    const getUniqueLocations = () => {
        const locations = [...new Set(inventory.map(item => item.location))].sort();
        return locations;
    };

    const getUniqueCategories = () => {
        const categories = [...new Set(inventory.map(item => item.category || '').filter(Boolean))].sort();
        return categories;
    };

    // Clear all filters
    const clearAllFilters = () => {
        setSearchQuery('');
        setFilterStatus('all');
        setFilterLocation('all');
        setFilterCategory('all');
        setSortBy('expiration');
    };

    // Quick filter presets
    const applyQuickFilter = (type) => {
        clearAllFilters();
        switch (type) {
            case 'expired':
                setFilterStatus('expired');
                break;
            case 'expiring-soon':
                setFilterStatus('expiring');
                break;
            case 'pantry':
                setFilterLocation('pantry');
                break;
            case 'fridge':
                setFilterLocation('fridge');
                break;
            case 'freezer':
                setFilterLocation('freezer');
                break;
            case 'kitchen':
                setFilterLocation('kitchen');
                break;
            default:
                break;
        }
    };

    // Form submission handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!session?.user?.id) {
            alert('Session expired. Please sign in again.');
            setLoading(false);
            return;
        }

        try {
            const url = '/api/inventory';
            const method = editingItem ? 'PUT' : 'POST';
            const body = editingItem
                ? {itemId: editingItem._id, ...formData}
                : formData;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'credentials': 'include'
                },
                credentials: 'include',
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.success) {
                await fetchInventory();
                setFormData({
                    name: '',
                    brand: '',
                    category: '',
                    quantity: 1,
                    unit: 'item',
                    secondaryQuantity: '',
                    secondaryUnit: '',
                    location: 'pantry',
                    expirationDate: '',
                    upc: ''
                });
                setShowAddForm(false);
                setEditingItem(null);
            } else {
                if (response.status === 401) {
                    alert('Session expired. Please refresh the page and sign in again.');
                } else {
                    alert(data.error || 'Failed to save item');
                }
            }
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Error saving item');
        } finally {
            setLoading(false);
        }
    };

    // Handle edit with auto-scroll to form
    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            brand: item.brand || '',
            category: item.category || '',
            quantity: item.quantity,
            unit: item.unit,
            // Include secondary unit data
            secondaryQuantity: item.secondaryQuantity || '',
            secondaryUnit: item.secondaryUnit || '',
            location: item.location,
            expirationDate: item.expirationDate ? item.expirationDate.split('T')[0] : '',
            upc: item.upc || ''
        });
        setShowAddForm(true);

        // Auto-scroll to the form after a brief delay to ensure it's rendered
        setTimeout(() => {
            const formElement = document.querySelector('form');
            if (formElement) {
                formElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 100);
    };

    const handleDelete = async (itemId) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const response = await fetch(getApiUrl(`/api/inventory?itemId=${itemId}`), {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                await fetchInventory();
            } else {
                alert(data.error || 'Failed to delete item');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Error deleting item');
        }
    };

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleProductFound = (product) => {
        setFormData(prev => ({
            ...prev,
            name: product.name || prev.name,
            brand: product.brand || prev.brand,
            category: product.category || prev.category,
            upc: product.upc || prev.upc
        }));
    };

    const handleUPCChange = (upc) => {
        setFormData(prev => ({
            ...prev,
            upc
        }));
    };

    // Reset form to include secondary units
    const resetForm = () => {
        setFormData({
            name: '',
            brand: '',
            category: '',
            quantity: 1,
            unit: 'item',
            secondaryQuantity: '',
            secondaryUnit: '',
            location: 'pantry',
            expirationDate: '',
            upc: ''
        });
        setShowAddForm(false);
        setEditingItem(null);
    };

    // Handle bulk consumption for expired items
    const handleBulkConsumeExpired = () => {
        const expiredItems = inventory.filter(item => {
            const status = getExpirationStatus(item.expirationDate);
            return status.status === 'expired';
        });

        if (expiredItems.length === 0) {
            alert('No expired items found');
            return;
        }

        if (confirm(`Remove ${expiredItems.length} expired items from inventory?`)) {
            const consumptions = expiredItems.map(item => ({
                itemId: item._id,
                reason: 'expired',
                quantity: item.quantity,
                unit: item.unit,
                notes: 'Bulk removal of expired items',
                removeCompletely: true
            }));

            Promise.all(consumptions.map(consumption =>
                handleConsumption(consumption, 'single')
            )).then(() => {
                alert(`Successfully removed ${expiredItems.length} expired items`);
            }).catch(error => {
                console.error('Error removing expired items:', error);
            });
        }
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

    const filteredInventory = getFilteredAndSortedInventory();
    const expiredCount = inventory.filter(item => getExpirationStatus(item.expirationDate).status === 'expired').length;

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6">
                {/* Header - WITH COMMON ITEMS WIZARD BUTTON */}
                <div className="space-y-4">
                    {/* Title Row */}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Doc Bear's Comfort Kitchen</h1>
                    </div>

                    {/* Usage Info Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                                📦 Inventory ({(() => {
                                    if (getUsageInfo.isUnlimited || getUsageInfo.tier === 'admin') {
                                    return `${getUsageInfo.current}`;
                                }
                return `${getUsageInfo().current}/{getUsageInfo().limit}`;

                            })})
                            </h2>
                            {!subscription.loading && (
                                <p className="text-sm text-gray-600 mt-1">
                                    {(() => {
                                        const usageInfo = getUsageInfo();
                                        if (usageInfo.isUnlimited || usageInfo.tier === 'admin') {
                                            return `Unlimited Inventory on ${usageInfo.tier} plan`;
                                        } else if (usageInfo.isAtLimit) {
                                            return (
                                                <span className="text-red-600 font-medium">
                                You've reached your {usageInfo.tier} plan limit
                            </span>
                                            );
                                        } else if (usageInfo.isNearLimit) {
                                            return (
                                                <span className="text-orange-600">
                                {typeof usageInfo.limit === 'number' ? usageInfo.limit - usageInfo.current : 0} Inventory{(usageInfo.limit - usageInfo.current) !== 1 ? 's' : ''} remaining
                            </span>
                                            );
                                        } else {
                                            return `${typeof usageInfo.limit === 'number' ? usageInfo.limit - usageInfo.current : 0} Item${(usageInfo.limit - usageInfo.current) !== 1 ? 's' : ''} remaining on ${usageInfo.tier} plan`;
                                        }
                                    })()}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Usage Warning for Near Limit */}
                    {(() => {
                        const usage = getUsageInfo();
                        const isAtLimit = !usage.isUnlimited && usage.current >= usage.limit;
                        const isNearLimit = !usage.isUnlimited && usage.current >= (usage.limit * 0.8);

                        if (isAtLimit) {
                            return (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <div className="text-red-500 mr-3 mt-0.5">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd"
                                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                      clipRule="evenodd"/>
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-medium text-red-800">
                                                Inventory Limit Reached
                                            </h3>
                                            <p className="text-sm text-red-700 mt-1">
                                                You've reached your {usage.tier} plan limit of {usage.limit} inventory
                                                items.
                                                {usage.tier === 'free' && ' Upgrade to Gold for 250 items or Platinum for unlimited.'}
                                                {usage.tier === 'gold' && ' Upgrade to Platinum for unlimited inventory items.'}
                                            </p>
                                            <TouchEnhancedButton
                                                onClick={() => window.location.href = `/pricing?source=inventory-limit&tier=${usage.tier}`}
                                                className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                                            >
                                                🚀 Upgrade Now
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>
                                </div>
                            );
                        } else if (isNearLimit) {
                            return (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <div className="text-orange-500 mr-3 mt-0.5">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd"
                                                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                      clipRule="evenodd"/>
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-medium text-orange-800">
                                                Approaching Inventory Limit
                                            </h3>
                                            <p className="text-sm text-orange-700 mt-1">
                                                You have {usage.limit - usage.current} inventory item slots remaining on
                                                your {usage.tier} plan.
                                                {usage.tier === 'free' && ' Consider upgrading to Gold for 250 items or Platinum for unlimited.'}
                                                {usage.tier === 'gold' && ' Consider upgrading to Platinum for unlimited inventory items.'}
                                            </p>
                                            <TouchEnhancedButton
                                                onClick={() => window.location.href = `/pricing?source=inventory-warning&tier=${usage.tier}`}
                                                className="mt-2 text-orange-600 hover:text-orange-800 underline text-sm"
                                            >
                                                View Upgrade Options
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}


                    {/* Action Buttons Row - Mobile Responsive */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        {/* Left side buttons */}
                        <div className="flex gap-2 flex-1">
                            {/* Common Items Wizard Button - Priority placement for new users */}
                            {inventory.length === 0 && (
                                <FeatureGate
                                    feature={FEATURE_GATES.COMMON_ITEMS_WIZARD}
                                    fallback={
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/pricing?source=common-items-wizard'}
                                            className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            <span className="hidden sm:inline">🔒 Quick Start (Gold)</span>
                                            <span className="sm:hidden">🔒 Start</span>
                                        </TouchEnhancedButton>
                                    }
                                >
                                    <TouchEnhancedButton
                                        onClick={() => setShowCommonItemsWizard(true)}
                                        className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <span className="hidden sm:inline">🏠 Quick Start</span>
                                        <span className="sm:hidden">🏠 Start</span>
                                    </TouchEnhancedButton>
                                </FeatureGate>
                            )}

                            {/* Common Items Wizard Button - For existing users */}
                            {inventory.length > 0 && (
                                <FeatureGate
                                    feature={FEATURE_GATES.COMMON_ITEMS_WIZARD}
                                    fallback={
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/pricing?source=common-items-wizard'}
                                            className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md shadow-sm text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        >
                                            <span className="hidden sm:inline">🔒 Common Items (Gold)</span>
                                            <span className="sm:hidden">🔒 Common</span>
                                        </TouchEnhancedButton>
                                    }
                                >
                                    <TouchEnhancedButton
                                        onClick={() => setShowCommonItemsWizard(true)}
                                        className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md shadow-sm text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        <span className="hidden sm:inline">🏠 Add Common Items</span>
                                        <span className="sm:hidden">🏠 Common</span>
                                    </TouchEnhancedButton>
                                </FeatureGate>
                            )}

                            <FeatureGate
                                feature={FEATURE_GATES.CONSUMPTION_HISTORY}
                                fallback={
                                    <TouchEnhancedButton
                                        onClick={() => window.location.href = '/pricing?source=consumption-history'}
                                        className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <span className="hidden sm:inline">🔒 History (Gold)</span>
                                        <span className="sm:hidden">🔒 History</span>
                                    </TouchEnhancedButton>
                                }
                            >
                                <TouchEnhancedButton
                                    onClick={() => setShowConsumptionHistory(true)}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <span className="hidden sm:inline">📊 View History</span>
                                    <span className="sm:hidden">📊 History</span>
                                </TouchEnhancedButton>
                            </FeatureGate>

                            {expiredCount > 0 && (
                                <TouchEnhancedButton
                                    onClick={handleBulkConsumeExpired}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    <span className="hidden sm:inline">🗑️ Remove {expiredCount} Expired</span>
                                    <span className="sm:hidden">🗑️ Remove {expiredCount}</span>
                                </TouchEnhancedButton>
                            )}
                        </div>

                        {/* Add/Cancel button - Always visible */}
                        <FeatureGate
                            feature={FEATURE_GATES.INVENTORY_LIMIT}
                            currentCount={inventory.length}
                            fallback={
                                <TouchEnhancedButton
                                    onClick={() => window.location.href = `/pricing?source=inventory-add-item&tier=${getUsageInfo().tier}`}
                                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    🔒 Upgrade to Add More
                                </TouchEnhancedButton>
                            }
                        >
                            <TouchEnhancedButton
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                {showAddForm ? 'Cancel' : 'Add Item'}
                            </TouchEnhancedButton>
                        </FeatureGate>
                    </div>
                </div>

                {/* Inventory Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <div className="text-blue-600 mr-3 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                      clipRule="evenodd"/>
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-blue-800">Your Kitchen Inventory</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                Track your food and ingredients to reduce waste and always know what you have on hand.
                            </p>
                            {!subscription.loading && (
                                <div className="mt-2 text-xs text-purple-600">
                                    {(() => {
                                        const usage = getUsageInfo('inventory');
                                        if (usage.isUnlimited || usage.tier === 'admin') {
                                            return `${usage.current} saved • Unlimited on ${usage.tier} plan`;
                                        }
                                        const remaining = Math.max(0, (typeof usage.limit === 'number' ? usage.limit : 0) - usage.current);
                                        return `${usage.current} items stored • ${remaining} remaining on ${usage.tier} plan`;
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Enhanced Search and Filtering */}
                <div className="bg-white shadow rounded-lg p-4 space-y-4">
                    {/* Search Bar */}
                    <div>
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                            🔍 Search Inventory
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                id="search"
                                placeholder="Search by name, brand, category, or UPC..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-400">🔍</span>
                            </div>
                            {searchQuery && (
                                <TouchEnhancedButton
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </TouchEnhancedButton>
                            )}
                        </div>
                    </div>

                    {/* Quick Filter Buttons */}
                    <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">⚡ Quick Filters</div>
                        <div className="flex flex-wrap gap-2">
                            <TouchEnhancedButton
                                onClick={() => applyQuickFilter('expired')}
                                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 border border-red-300"
                            >
                                🚨 Expired
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => applyQuickFilter('expiring-soon')}
                                className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 border border-orange-300"
                            >
                                ⏰ Expiring Soon
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => applyQuickFilter('pantry')}
                                className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 border border-yellow-300"
                            >
                                🏠 Pantry
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => applyQuickFilter('kitchen')}
                                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 border border-green-300"
                            >
                                🚪 Kitchen
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => applyQuickFilter('fridge')}
                                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 border border-blue-300"
                            >
                                ❄️ Fridge
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => applyQuickFilter('freezer')}
                                className="px-3 py-1 text-xs bg-cyan-100 text-cyan-700 rounded-full hover:bg-cyan-200 border border-cyan-300"
                            >
                                🧊 Freezer
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={clearAllFilters}
                                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 border border-gray-300"
                            >
                                🔄 Clear All
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* Advanced Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">📊 Status</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="all">All Items ({inventory.length})</option>
                                <option value="expired">Expired
                                    ({inventory.filter(item => getExpirationStatus(item.expirationDate).status === 'expired').length})
                                </option>
                                <option value="expiring">Expiring Soon
                                    ({inventory.filter(item => ['expires-today', 'expires-soon', 'expires-week'].includes(getExpirationStatus(item.expirationDate).status)).length})
                                </option>
                                <option value="fresh">Fresh
                                    ({inventory.filter(item => ['fresh', 'no-date'].includes(getExpirationStatus(item.expirationDate).status)).length})
                                </option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">📍 Location</label>
                            <select
                                value={filterLocation}
                                onChange={(e) => setFilterLocation(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="all">All Locations</option>
                                {getUniqueLocations().map(location => (
                                    <option key={location} value={location}>
                                        {location.charAt(0).toUpperCase() + location.slice(1)} ({inventory.filter(item => item.location === location).length})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">🏷️ Category</label>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="all">All Categories</option>
                                {getUniqueCategories().map(category => (
                                    <option key={category} value={category}>
                                        {category} ({inventory.filter(item => item.category === category).length})
                                    </option>
                                ))}
                                {inventory.filter(item => !item.category || item.category === '').length > 0 && (
                                    <option value="uncategorized">
                                        Uncategorized
                                        ({inventory.filter(item => !item.category || item.category === '').length})
                                    </option>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">🔃 Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="expiration">Expiration Date</option>
                                <option value="name">Name (A-Z)</option>
                                <option value="category">Category</option>
                                <option value="location">Location</option>
                                <option value="quantity">Quantity (High to Low)</option>
                                <option value="date-added">Date Added (Newest)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Add/Edit Item Form */}
                {showAddForm && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                {editingItem ? 'Edit Item' : 'Add New Item'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* UPC Lookup Section - FIXED PROP NAME */}
                                <div>
                                    <UPCLookup
                                        onProductFound={handleProductFound}
                                        onUPCChange={handleUPCChange}
                                        currentUPC={formData.upc}
                                    />
                                </div>

                                {/* Basic Item Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                            Item Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            placeholder="e.g., Organic Bananas"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                                            Brand
                                        </label>
                                        <input
                                            type="text"
                                            id="brand"
                                            name="brand"
                                            value={formData.brand}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            placeholder="e.g., Dole"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                                            Category
                                        </label>
                                        <select
                                            id="category"
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="">Select category</option>
                                            <option value="Baking & Cooking Ingredients">Baking & Cooking Ingredients
                                            </option>
                                            <option value="Beans">Beans</option>
                                            <option value="Beverages">Beverages</option>
                                            <option value="Bouillon">Bouillon</option>
                                            <option value="Boxed Meals">Boxed Meals</option>
                                            <option value="Breads">Breads</option>
                                            <option value="Canned Beans">Canned/Jarred Beans</option>
                                            <option value="Canned Fruit">Canned/Jarred Fruit</option>
                                            <option value="Canned Meals">Canned/Jarred Meals</option>
                                            <option value="Canned Meat">Canned/Jarred Meat</option>
                                            <option value="Canned Sauces">Canned/Jarred Sauces</option>
                                            <option value="Canned Tomatoes">Canned/Jarred Tomatoes</option>
                                            <option value="Canned Vegetables">Canned/Jarred Vegetables</option>
                                            <option value="Cheese">Cheese</option>
                                            <option value="Condiments">Condiments</option>
                                            <option value="Dairy">Dairy</option>
                                            <option value="Eggs">Eggs</option>
                                            <option value="Fresh Fruits">Fresh Fruits</option>
                                            <option value="Fresh Spices">Fresh Spices</option>
                                            <option value="Fresh Vegetables">Fresh Vegetables</option>
                                            <option value="Fresh/Frozen Beef">Fresh/Frozen Beef</option>
                                            <option value="Fresh/Frozen Fish & Seafood">Fresh/Frozen Fish & Seafood
                                            </option>
                                            <option value="Fresh/Frozen Lamb">Fresh/Frozen Lamb</option>
                                            <option value="Fresh/Frozen Pork">Fresh/Frozen Pork</option>
                                            <option value="Fresh/Frozen Poultry">Fresh/Frozen Poultry</option>
                                            <option value="Fresh/Frozen Rabbit">Fresh/Frozen Rabbit</option>
                                            <option value="Fresh/Frozen Venison">Fresh/Frozen Venison</option>
                                            <option value="Frozen Fruit">Frozen Fruit</option>
                                            <option value="Frozen Vegetables">Frozen Vegetables</option>
                                            <option value="Grains">Grains</option>
                                            <option value="Other">Other</option>
                                            <option value="Pasta">Pasta</option>
                                            <option value="Seasonings">Seasonings</option>
                                            <option value="Snacks">Snacks</option>
                                            <option value="Soups & Soup Mixes">Soups & Soup Mixes</option>
                                            <option value="Spices">Spices</option>
                                            <option value="Stock/Broth">Stock/Broth</option>
                                            <option value="Stuffing & Sides">Stuffing & Sides</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                                            Storage Location *
                                        </label>
                                        <select
                                            id="location"
                                            name="location"
                                            required
                                            value={formData.location}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="pantry">Pantry</option>
                                            <option value="fridge">Refrigerator</option>
                                            <option value="freezer">Freezer</option>
                                            <option value="kitchen">Kitchen Cabinets</option>
                                            <option value="counter">Counter</option>
                                            <option value="garage">Garage/Storage</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Dual Quantity Input Section */}
                                <div className="md:col-span-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Primary Quantity */}
                                        <div>
                                            <label htmlFor="quantity"
                                                   className="block text-sm font-medium text-gray-700">
                                                Primary Quantity *
                                            </label>
                                            <div className="mt-1 flex rounded-md shadow-sm">
                                                <input
                                                    type="number"
                                                    id="quantity"
                                                    name="quantity"
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                    value={formData.quantity}
                                                    onChange={handleChange}
                                                    className="flex-1 block w-full border-gray-300 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                />
                                                <select
                                                    name="unit"
                                                    value={formData.unit}
                                                    onChange={handleChange}
                                                    className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
                                                >
                                                    <option value="item">Item(s)</option>
                                                    <option value="each">Each</option>
                                                    <option value="lbs">Pounds</option>
                                                    <option value="oz">Ounces</option>
                                                    <option value="kg">Kilograms</option>
                                                    <option value="g">Grams</option>
                                                    <option value="cup">Cup(s)</option>
                                                    <option value="tbsp">Tablespoon(s)</option>
                                                    <option value="tsp">Teaspoon(s)</option>
                                                    <option value="ml">Milliliters</option>
                                                    <option value="l">Liters</option>
                                                    <option value="can">Can(s)</option>
                                                    <option value="package">Package(s)</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Secondary Quantity (Optional) */}
                                        <div>
                                            <label htmlFor="secondaryQuantity"
                                                   className="block text-sm font-medium text-gray-700">
                                                Secondary Quantity <span className="text-gray-500">(Optional)</span>
                                            </label>
                                            <div className="mt-1 flex rounded-md shadow-sm">
                                                <input
                                                    type="number"
                                                    id="secondaryQuantity"
                                                    name="secondaryQuantity"
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.secondaryQuantity}
                                                    onChange={handleChange}
                                                    placeholder="0"
                                                    className="flex-1 block w-full border-gray-300 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                />
                                                <select
                                                    name="secondaryUnit"
                                                    value={formData.secondaryUnit}
                                                    onChange={handleChange}
                                                    className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
                                                >
                                                    <option value="">Select unit</option>
                                                    <option value="item">Item(s)</option>
                                                    <option value="each">Each</option>
                                                    <option value="lbs">Pounds</option>
                                                    <option value="oz">Ounces</option>
                                                    <option value="kg">Kilograms</option>
                                                    <option value="g">Grams</option>
                                                    <option value="cup">Cup(s)</option>
                                                    <option value="tbsp">Tablespoon(s)</option>
                                                    <option value="tsp">Teaspoon(s)</option>
                                                    <option value="ml">Milliliters</option>
                                                    <option value="l">Liters</option>
                                                    <option value="can">Can(s)</option>
                                                    <option value="package">Package(s)</option>
                                                </select>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">
                                                Add an alternative unit for tracking (e.g., "2 lbs" and "6 tomatoes")
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700">
                                        Expiration Date
                                        <span
                                            className="text-sm text-gray-500 ml-1">(Important for tracking freshness)</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="expirationDate"
                                        name="expirationDate"
                                        value={formData.expirationDate}
                                        onChange={handleChange}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Setting expiration dates helps track freshness and prevents food waste
                                    </p>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={resetForm}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Cancel
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                                    >
                                        {loading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                                    </TouchEnhancedButton>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Inventory Grid Display with Smart Units */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Current Inventory ({filteredInventory.length} items)
                        </h3>

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500">Loading inventory...</div>
                            </div>
                        ) : filteredInventory.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500 mb-4">
                                    {inventory.length === 0 ? 'No items in your inventory yet' : 'No items match your filters'}
                                </div>
                                {/* In the empty inventory section, replace the existing content with: */}
                                {inventory.length === 0 && (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500 mb-4">
                                            {getUsageInfo().tier === 'free' ? (
                                                <>
                                                    <div className="text-gray-500 mb-4">No items in your inventory yet
                                                    </div>
                                                    <div
                                                        className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                                        <div className="text-sm text-blue-800">
                                                            <strong>📦 Inventory Limits:</strong>
                                                            <ul className="mt-2 space-y-1 text-left">
                                                                <li>• <strong>Free:</strong> Store up to 50 items</li>
                                                                <li>• <strong>Gold:</strong> Store up to 250 items</li>
                                                                <li>• <strong>Platinum:</strong> Unlimited inventory
                                                                </li>
                                                                <li>• Track expiration dates</li>
                                                                <li>• Monitor food waste</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                'No items in your inventory yet'
                                            )}
                                        </div>
                                        <FeatureGate
                                            feature={FEATURE_GATES.INVENTORY_LIMIT}
                                            currentCount={0}
                                            fallback={
                                                <TouchEnhancedButton
                                                    onClick={() => window.location.href = '/pricing?source=inventory-empty'}
                                                    className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white px-6 py-3 rounded-md font-medium hover:from-blue-500 hover:to-indigo-600"
                                                >
                                                    🚀 Upgrade to Add Items
                                                </TouchEnhancedButton>
                                            }
                                        >
                                            <TouchEnhancedButton
                                                onClick={() => setShowAddForm(true)}
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                                            >
                                                Add your first item
                                            </TouchEnhancedButton>
                                        </FeatureGate>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredInventory.map((item) => {
                                    const expirationInfo = getExpirationStatus(item.expirationDate);

                                    return (
                                        <div
                                            key={item._id}
                                            className={`border rounded-lg p-4 ${expirationInfo.bgColor} hover:shadow-md transition-shadow relative`}
                                            style={{
                                                borderLeftColor: expirationInfo.color === 'red' ? '#ef4444' :
                                                    expirationInfo.color === 'orange' ? '#f97316' :
                                                        expirationInfo.color === 'yellow' ? '#eab308' :
                                                            expirationInfo.color === 'green' ? '#22c55e' : '#6b7280',
                                                borderLeftWidth: '4px'
                                            }}
                                        >
                                            {/* Status Icon - Top Right */}
                                            <div className="absolute top-2 right-2 text-lg">
                                                {expirationInfo.icon || '📦'}
                                            </div>

                                            {/* Item Name and Brand */}
                                            <div className="mb-3 pr-8">
                                                <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                                                    {item.name}
                                                </h4>
                                                {item.brand && (
                                                    <p className="text-xs text-gray-600">{item.brand}</p>
                                                )}
                                            </div>

                                            {/* Smart Quantity Display with Dual Units */}
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatInventoryDisplayText(item)}
                                                </div>
                                                <span
                                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                                                    {item.location}
                                                </span>
                                            </div>

                                            {/* Category */}
                                            <div className="text-xs text-gray-500 mb-3">
                                                {item.category || 'No category'}
                                            </div>

                                            {/* Expiration Status */}
                                            <div className={`text-xs font-medium ${expirationInfo.textColor} mb-3`}>
                                                {item.expirationDate ? (
                                                    <div>
                                                        <div>{new Date(item.expirationDate).toLocaleDateString()}</div>
                                                        <div>{expirationInfo.label}</div>
                                                    </div>
                                                ) : (
                                                    'No expiration set'
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-1">
                                                <TouchEnhancedButton
                                                    onClick={() => setConsumingItem(item)}
                                                    className="flex-1 bg-blue-50 text-blue-700 text-xs font-medium py-1.5 px-2 rounded hover:bg-blue-100 border border-blue-200"
                                                    title="Use/Consume Item"
                                                >
                                                    📦 Use
                                                </TouchEnhancedButton>
                                                <TouchEnhancedButton
                                                    onClick={() => handleEdit(item)}
                                                    className="flex-1 bg-indigo-50 text-indigo-700 text-xs font-medium py-1.5 px-2 rounded hover:bg-indigo-100 border border-indigo-200"
                                                >
                                                    ✏️ Edit
                                                </TouchEnhancedButton>
                                                <TouchEnhancedButton
                                                    onClick={() => handleDelete(item._id)}
                                                    className="bg-red-50 text-red-700 text-xs font-medium py-1.5 px-2 rounded hover:bg-red-100 border border-red-200"
                                                >
                                                    🗑️
                                                </TouchEnhancedButton>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Common Items Wizard Modal */}
                <CommonItemsWizard
                    isOpen={showCommonItemsWizard}
                    onClose={() => setShowCommonItemsWizard(false)}
                    onComplete={handleCommonItemsComplete}
                />

                {/* Consumption Modal */}
                {consumingItem && (
                    <InventoryConsumption
                        item={consumingItem}
                        onConsume={handleConsumption}
                        onClose={() => setConsumingItem(null)}
                        mode="single"
                    />
                )}

                {/* Consumption History Modal */}
                {showConsumptionHistory && (
                    <ConsumptionHistory
                        onClose={() => setShowConsumptionHistory(false)}
                    />
                )}
                <Footer/>
            </div>
        </MobileOptimizedLayout>
    );
}

// Main component wrapped with Suspense
export default function Inventory() {
    return (
        <Suspense fallback={
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-lg">Loading...</div>
                </div>
            </MobileOptimizedLayout>
        }>
            <InventoryContent/>
        </Suspense>
    );
}