// file: /src/app/inventory/page.js

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import UPCLookup from '@/components/inventory/UPCLookup';
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Check session before making API call
        console.log('Current session:', session);
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

            console.log('Submitting to API:', { method, url, body });

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    // Include credentials to ensure session cookies are sent
                    'credentials': 'include'
                },
                // Ensure cookies are included
                credentials: 'include',
                body: JSON.stringify(body),
            });

            console.log('API Response status:', response.status);

            const data = await response.json();
            console.log('API Response data:', data);

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
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Food Inventory</h1>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        {showAddForm ? 'Cancel' : 'Add Item'}
                    </button>
                </div>

                {/* Add/Edit Form */}
                {showAddForm && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                {editingItem ? 'Edit Item' : 'Add New Item'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* UPC Lookup Section */}
                                <UPCLookup
                                    onProductFound={handleProductFound}
                                    onUPCChange={handleUPCChange}
                                    currentUPC={formData.upc}
                                />

                                {/* Divider */}
                                <div className="border-t border-gray-200 pt-6">
                                    <h4 className="text-md font-medium text-gray-900 mb-4">
                                        Item Details
                                    </h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                            <option value="Dairy">Dairy</option>
                                            <option value="Meat">Meat</option>
                                            <option value="Produce">Produce</option>
                                            <option value="Grains">Grains</option>
                                            <option value="Canned">Canned</option>
                                            <option value="Frozen">Frozen</option>
                                            <option value="Beverages">Beverages</option>
                                            <option value="Snacks">Snacks</option>
                                            <option value="Condiments">Condiments</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                                            Storage Location
                                        </label>
                                        <select
                                            id="location"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="pantry">Pantry</option>
                                            <option value="fridge">Refrigerator</option>
                                            <option value="freezer">Freezer</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                                            Quantity
                                        </label>
                                        <input
                                            type="number"
                                            id="quantity"
                                            name="quantity"
                                            min="0"
                                            step="0.1"
                                            value={formData.quantity}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                                            Unit
                                        </label>
                                        <select
                                            id="unit"
                                            name="unit"
                                            value={formData.unit}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="item">Item(s)</option>
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

                                    <div>
                                        <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700">
                                            Expiration Date
                                        </label>
                                        <input
                                            type="date"
                                            id="expirationDate"
                                            name="expirationDate"
                                            value={formData.expirationDate}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                                    >
                                        {loading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Inventory List */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Current Inventory ({inventory.length} items)
                        </h3>

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500">Loading inventory...</div>
                            </div>
                        ) : inventory.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500 mb-4">No items in your inventory yet</div>
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                                >
                                    Add your first item
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
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
                                            Expires
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {inventory.map((item) => {
                                        const expirationDate = item.expirationDate ? new Date(item.expirationDate) : null;
                                        const isExpiring = expirationDate && expirationDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                                        const isExpired = expirationDate && expirationDate <= new Date();

                                        return (
                                            <tr key={item._id} className={isExpired ? 'bg-red-50' : isExpiring ? 'bg-yellow-50' : ''}>
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
                                                    <span className="capitalize">{item.location}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {expirationDate ? (
                                                        <span className={`${isExpired ? 'text-red-600' : isExpiring ? 'text-yellow-600' : ''}`}>
                                {expirationDate.toLocaleDateString()}
                                                            {isExpired && ' (Expired)'}
                                                            {isExpiring && !isExpired && ' (Soon)'}
                              </span>
                                                    ) : (
                                                        'No expiration'
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
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