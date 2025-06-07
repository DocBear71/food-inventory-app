// file: /src/app/inventory/page.js - v4 (With Consumption Integration)

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import UPCLookup from '@/components/inventory/UPCLookup';
import InventoryConsumption from '@/components/inventory/InventoryConsumption';
import ConsumptionHistory from '@/components/inventory/ConsumptionHistory';
import { redirect } from 'next/navigation';

// Separate component for search params to wrap in Suspense
function InventoryContent() {
    const { data: session, status, update } = useSession();
    const searchParams = useSearchParams();
    const shouldShowAddForm = searchParams.get('action') === 'add';

    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(shouldShowAddForm);
    const [editingItem, setEditingItem] = useState(null);
    const [consumingItem, setConsumingItem] = useState(null);
    const [showConsumptionHistory, setShowConsumptionHistory] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('expiration');
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        category: '',
        quantity: 1,
        unit: 'item',
        location: 'pantry',
        expirationDate: '',
        upc: ''
    });

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

    const fetchInventory = async () => {
        try {
            const response = await fetch('/api/inventory');
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

    // Handle consumption of items
    const handleConsumption = async (consumptionData, mode = 'single') => {
        try {
            const response = await fetch('/api/inventory/consume', {
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
                const { summary } = result;
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
        if (!expirationDate) return { status: 'no-date', color: 'gray', bgColor: 'bg-gray-50', textColor: 'text-gray-600', label: 'No expiration date' };

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

    // Filter and sort inventory
    const getFilteredAndSortedInventory = () => {
        let filtered = [...inventory];

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
                default:
                    return 0;
            }
        });

        return filtered;
    };

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
                ? { itemId: editingItem._id, ...formData }
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

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            brand: item.brand || '',
            category: item.category || '',
            quantity: item.quantity,
            unit: item.unit,
            location: item.location,
            expirationDate: item.expirationDate ? item.expirationDate.split('T')[0] : '',
            upc: item.upc || ''
        });
        setShowAddForm(true);
    };

    const handleDelete = async (itemId) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const response = await fetch(`/api/inventory?itemId=${itemId}`, {
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
        const { name, value } = e.target;
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

    const resetForm = () => {
        setFormData({
            name: '',
            brand: '',
            category: '',
            quantity: 1,
            unit: 'item',
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
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Food Inventory</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowConsumptionHistory(true)}
                            className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            📊 View History
                        </button>
                        {expiredCount > 0 && (
                            <button
                                onClick={handleBulkConsumeExpired}
                                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                🗑️ Remove {expiredCount} Expired
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {showAddForm ? 'Cancel' : 'Add Item'}
                        </button>
                    </div>
                </div>

                {/* Rest of your existing inventory page code... */}
                {/* I'll skip the form and table sections since they're the same */}
                {/* Just add the action column with the Use button */}

                {/* Filters and Sorting */}
                <div className="bg-white shadow rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="all">All Items ({inventory.length})</option>
                                    <option value="expired">Expired ({inventory.filter(item => getExpirationStatus(item.expirationDate).status === 'expired').length})</option>
                                    <option value="expiring">Expiring Soon ({inventory.filter(item => ['expires-today', 'expires-soon', 'expires-week'].includes(getExpirationStatus(item.expirationDate).status)).length})</option>
                                    <option value="fresh">Fresh ({inventory.filter(item => ['fresh', 'no-date'].includes(getExpirationStatus(item.expirationDate).status)).length})</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="expiration">Expiration Date</option>
                                    <option value="name">Name</option>
                                    <option value="category">Category</option>
                                    <option value="location">Location</option>
                                </select>
                            </div>
                        </div>

                        <div className="text-sm text-gray-500">
                            Showing {filteredInventory.length} of {inventory.length} items
                        </div>
                    </div>
                </div>

                {/* Inventory Table with Use Button */}
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
                                {inventory.length === 0 && (
                                    <button
                                        onClick={() => setShowAddForm(true)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                                    >
                                        Add your first item
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Item
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Quantity
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Location
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Expiration
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredInventory.map((item) => {
                                        const expirationInfo = getExpirationStatus(item.expirationDate);

                                        return (
                                            <tr key={item._id} className={expirationInfo.bgColor}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <span className="text-xl mr-2">{expirationInfo.icon || '📦'}</span>
                                                        <div>
                                                            <div className={`text-xs font-medium ${expirationInfo.textColor}`}>
                                                                {expirationInfo.label}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                                        {item.brand && (
                                                            <div className="text-sm text-gray-500">{item.brand}</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.category || 'No category'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.quantity} {item.unit}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                                                        {item.location}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {item.expirationDate ? (
                                                        <div>
                                                            <div className={expirationInfo.textColor}>
                                                                {new Date(item.expirationDate).toLocaleDateString()}
                                                            </div>
                                                            <div className={`text-xs ${expirationInfo.textColor}`}>
                                                                {expirationInfo.label}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">No expiration set</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                    <button
                                                        onClick={() => setConsumingItem(item)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                        title="Use/Consume Item"
                                                    >
                                                        📦 Use
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item._id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

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
            </div>
        </DashboardLayout>
    );
}

// Main component wrapped with Suspense
export default function Inventory() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-lg">Loading...</div>
                </div>
            </DashboardLayout>
        }>
            <InventoryContent />
        </Suspense>
    );
}