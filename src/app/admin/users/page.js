// file: /src/app/admin/users/page.js
// Admin Users Management Page - Main user list with search, filter, and actions

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function AdminUsersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // State management
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({});

    // Filter and search state
    const [filters, setFilters] = useState({
        search: '',
        tier: '',
        status: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });
    const [currentPage, setCurrentPage] = useState(1);

    // Bulk operations state
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [showBulkUpgrade, setShowBulkUpgrade] = useState(false);
    const [bulkUpgradeData, setBulkUpgradeData] = useState({
        tier: 'platinum',
        endDate: '',
        reason: 'Google Play tester access'
    });

    // Check admin access
    useEffect(() => {
        if (status === 'loading') return;

        if (!session?.user?.isAdmin) {
            router.push('/');
            return;
        }
    }, [session, status, router]);

    // Fetch users
    const fetchUsers = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                page: page.toString(),
                limit: '25',
                ...filters
            });

            const response = await fetch(`/api/admin/users?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setUsers(data.users);
            setPagination(data.pagination);
            setCurrentPage(page);

        } catch (err) {
            console.error('Error fetching users:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Initial load and filter changes
    useEffect(() => {
        if (session?.user?.isAdmin) {
            fetchUsers(1);
        }
    }, [session, fetchUsers]);

    // Handle filter changes
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    // Handle user selection for bulk operations
    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(users.map(u => u._id)));
        }
    };

    // Bulk upgrade handler
    const handleBulkUpgrade = async () => {
        try {
            const selectedUsersList = users.filter(u => selectedUsers.has(u._id));
            const userEmails = selectedUsersList.map(u => u.email);

            const response = await fetch(`/api/admin/users/bulk/upgrade`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmails,
                    ...bulkUpgradeData
                })
            });

            if (!response.ok) {
                throw new Error('Bulk upgrade failed');
            }

            const result = await response.json();
            alert(`Successfully upgraded ${result.results.successful.length} users!`);

            setShowBulkUpgrade(false);
            setSelectedUsers(new Set());
            fetchUsers(currentPage);

        } catch (err) {
            console.error('Bulk upgrade error:', err);
            alert('Error upgrading users: ' + err.message);
        }
    };

    // Helper functions
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getTierBadgeColor = (tier) => {
        switch (tier) {
            case 'admin': return 'bg-purple-100 text-purple-800';
            case 'platinum': return 'bg-gray-100 text-gray-800';
            case 'gold': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-green-100 text-green-800';
        }
    };

    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'trial': return 'bg-blue-100 text-blue-800';
            case 'expired': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!session?.user?.isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="mt-2 text-gray-600">
                        Manage user accounts, subscriptions, and access permissions.
                    </p>
                </div>

                {/* Filters and Search */}
                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {/* Search */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search Users
                            </label>
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                placeholder="Search by name or email..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        {/* Tier Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Subscription Tier
                            </label>
                            <select
                                value={filters.tier}
                                onChange={(e) => handleFilterChange('tier', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Tiers</option>
                                <option value="free">Free</option>
                                <option value="gold">Gold</option>
                                <option value="platinum">Platinum</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="trial">Trial</option>
                                <option value="free">Free</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>

                        {/* Sort */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sort By
                            </label>
                            <select
                                value={`${filters.sortBy}-${filters.sortOrder}`}
                                onChange={(e) => {
                                    const [sortBy, sortOrder] = e.target.value.split('-');
                                    handleFilterChange('sortBy', sortBy);
                                    handleFilterChange('sortOrder', sortOrder);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="createdAt-desc">Newest First</option>
                                <option value="createdAt-asc">Oldest First</option>
                                <option value="name-asc">Name A-Z</option>
                                <option value="name-desc">Name Z-A</option>
                                <option value="updatedAt-desc">Recently Active</option>
                            </select>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedUsers.size > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                    {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                                </span>
                                <div className="space-x-2">
                                    <button
                                        onClick={() => setShowBulkUpgrade(true)}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                                    >
                                        Bulk Upgrade to Platinum
                                    </button>
                                    <button
                                        onClick={() => setSelectedUsers(new Set())}
                                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                                    >
                                        Clear Selection
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-800">
                                    Error loading users: {error}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="mt-2 text-gray-500">Loading users...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-gray-500">No users found matching your criteria.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {/* Table Header */}
                            <li className="bg-gray-50 px-6 py-3">
                                <div className="flex items-center">
                                    <div className="flex items-center h-5">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.size === users.length && users.length > 0}
                                            onChange={toggleSelectAll}
                                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                        />
                                    </div>
                                    <div className="ml-6 grid grid-cols-7 gap-4 w-full text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        <div className="col-span-2">User</div>
                                        <div>Subscription</div>
                                        <div>Usage Stats</div>
                                        <div>Member Since</div>
                                        <div>Last Active</div>
                                        <div>Actions</div>
                                    </div>
                                </div>
                            </li>

                            {/* User Rows */}
                            {users.map((user) => (
                                <li key={user._id} className="px-6 py-4 hover:bg-gray-50">
                                    <div className="flex items-center">
                                        <div className="flex items-center h-5">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.has(user._id)}
                                                onChange={() => toggleUserSelection(user._id)}
                                                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                            />
                                        </div>
                                        <div className="ml-6 grid grid-cols-7 gap-4 w-full">
                                            {/* User Info */}
                                            <div className="col-span-2">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                            <span className="text-sm font-medium text-indigo-800">
                                                                {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.name}
                                                            {user.isAdmin && (
                                                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                                    Admin
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Subscription */}
                                            <div>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierBadgeColor(user.subscription.tier)}`}>
                                                    {user.subscription.tier.charAt(0).toUpperCase() + user.subscription.tier.slice(1)}
                                                </span>
                                                <div className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(user.subscription.status)}`}>
                                                    {user.subscription.status}
                                                </div>
                                            </div>

                                            {/* Usage Stats */}
                                            <div className="text-xs text-gray-500">
                                                <div>📝 {user.stats.personalRecipes} recipes</div>
                                                <div>📦 {user.stats.inventoryItems} items</div>
                                                <div>📱 {user.stats.monthlyUPCScans} scans</div>
                                            </div>

                                            {/* Member Since */}
                                            <div className="text-sm text-gray-500">
                                                {formatDate(user.createdAt)}
                                            </div>

                                            {/* Last Active */}
                                            <div className="text-sm text-gray-500">
                                                {user.updatedAt ? formatDate(user.updatedAt) : 'Never'}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => router.push(`/admin/users/${user._id}`)}
                                                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => {/* Handle upgrade */}}
                                                    className="text-green-600 hover:text-green-900 text-sm font-medium"
                                                >
                                                    Upgrade
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => fetchUsers(currentPage - 1)}
                                    disabled={!pagination.hasPrev}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => fetchUsers(currentPage + 1)}
                                    disabled={!pagination.hasNext}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing page <span className="font-medium">{currentPage}</span> of{' '}
                                        <span className="font-medium">{pagination.totalPages}</span> ({pagination.totalUsers} total users)
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                        <button
                                            onClick={() => fetchUsers(currentPage - 1)}
                                            disabled={!pagination.hasPrev}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                            {currentPage} / {pagination.totalPages}
                                        </span>
                                        <button
                                            onClick={() => fetchUsers(currentPage + 1)}
                                            disabled={!pagination.hasNext}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bulk Upgrade Modal */}
                {showBulkUpgrade && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                            <div className="mt-3">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                    Bulk Upgrade Users
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Upgrading {selectedUsers.size} selected users to Platinum tier.
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            End Date (MM/DD/YYYY)
                                        </label>
                                        <input
                                            type="date"
                                            value={bulkUpgradeData.endDate}
                                            onChange={(e) => setBulkUpgradeData(prev => ({
                                                ...prev,
                                                endDate: e.target.value
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Reason
                                        </label>
                                        <input
                                            type="text"
                                            value={bulkUpgradeData.reason}
                                            onChange={(e) => setBulkUpgradeData(prev => ({
                                                ...prev,
                                                reason: e.target.value
                                            }))}
                                            placeholder="e.g., Google Play tester access"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        onClick={() => setShowBulkUpgrade(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBulkUpgrade}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                    >
                                        Upgrade Users
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}