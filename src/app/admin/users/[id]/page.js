'use client';

// file: /src/app/admin/users/[id]/page.js
// Admin User Detail Page - Comprehensive individual user management

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {apiPost} from "@/lib/api-config.js";

export default function AdminUserDetailPage({ params }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const userId = params.id;

    // State management
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Action modals
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Upgrade form data
    const [upgradeData, setUpgradeData] = useState({
        tier: 'platinum',
        endDate: '',
        reason: '',
        sendNotification: true
    });

    // Suspend form data
    const [suspendData, setSuspendData] = useState({
        reason: '',
        duration: '',
        sendNotification: true
    });

    // Check admin access
    useEffect(() => {
        if (status === 'loading') return;

        if (!session?.user?.isAdmin) {
            router.push('/');
            return;
        }
    }, [session, status, router]);

    // Fetch user data
    useEffect(() => {
        if (session?.user?.isAdmin && userId) {
            fetchUserData();
        }
    }, [session, userId]);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/admin/users/${userId}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setUserData(data);

        } catch (err) {
            console.error('Error fetching user data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle subscription upgrade
    const handleUpgrade = async () => {
        try {
            setActionLoading(true);

            const response = await apiPost(`/api/admin/users/${userId}/upgrade`, {
                upgradeData
            });

            if (!response.ok) {
                throw new Error('Upgrade failed');
            }

            const result = await response.json();
            alert(`User successfully upgraded to ${upgradeData.tier}!`);

            setShowUpgradeModal(false);
            fetchUserData(); // Refresh data

        } catch (err) {
            console.error('Upgrade error:', err);
            alert('Error upgrading user: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Handle user suspension
    const handleSuspend = async (action) => {
        try {
            setActionLoading(true);

            const response = await apiPost(`/api/admin/users/${userId}/suspend`, {
                    action,
                    ...suspendData
            });

            if (!response.ok) {
                throw new Error(`${action} failed`);
            }

            const result = await response.json();
            alert(`User successfully ${action}ed!`);

            setShowSuspendModal(false);
            fetchUserData(); // Refresh data

        } catch (err) {
            console.error(`${action} error:`, err);
            alert(`Error ${action}ing user: ` + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Helper functions
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!session?.user?.isAdmin) {
        return null;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading user</h3>
                        <p className="mt-1 text-sm text-gray-500">{error}</p>
                        <div className="mt-6">
                            <button
                                onClick={() => router.back()}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-900">User not found</h3>
                    <button
                        onClick={() => router.back()}
                        className="mt-2 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', name: 'Overview', icon: '👤' },
        { id: 'subscription', name: 'Subscription', icon: '💳' },
        { id: 'usage', name: 'Usage & Stats', icon: '📊' },
        { id: 'activity', name: 'Activity', icon: '🕐' },
        { id: 'actions', name: 'Admin Actions', icon: '⚙️' }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <nav className="flex mb-4" aria-label="Breadcrumb">
                        <ol className="flex items-center space-x-4">
                            <li>
                                <button
                                    onClick={() => router.push('/admin/users')}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    Users
                                </button>
                            </li>
                            <li>
                                <div className="flex items-center">
                                    <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <span className="ml-4 text-sm font-medium text-gray-500">
                                        {userData.user.name}
                                    </span>
                                </div>
                            </li>
                        </ol>
                    </nav>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-2xl font-medium text-indigo-800">
                                    {userData.user.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                                    {userData.user.name}
                                    {userData.user.isAdmin && (
                                        <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                            Admin
                                        </span>
                                    )}
                                </h1>
                                <p className="text-gray-600">{userData.user.email}</p>
                                <p className="text-sm text-gray-500">
                                    Member since {formatDate(userData.user.createdAt)}
                                </p>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                            >
                                Upgrade Subscription
                            </button>
                            <button
                                onClick={() => setShowSuspendModal(true)}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Manage Access
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${
                                    activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* User Info Card */}
                        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">User Information</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{userData.user.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{userData.user.email}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Email Verified</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {userData.user.emailVerified ? (
                                            <span className="text-green-600">✓ Verified</span>
                                        ) : (
                                            <span className="text-red-600">✗ Not verified</span>
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Account Created</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{formatDate(userData.user.createdAt)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{formatDate(userData.user.updatedAt)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Last Notification</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {userData.user.lastNotificationSent
                                            ? formatDate(userData.user.lastNotificationSent)
                                            : 'Never'
                                        }
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {/* Quick Stats Card */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Personal Recipes</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userData.usage.current.personalRecipes}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Inventory Items</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userData.usage.current.inventoryItems}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Recipe Collections</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userData.usage.current.collections}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Monthly UPC Scans</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userData.usage.current.monthlyUPCScans}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Monthly Receipt Scans</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userData.usage.current.monthlyReceiptScans}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'subscription' && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-6">Subscription Details</h3>

                        {/* Current Subscription */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-md font-medium text-gray-900 mb-4">Current Plan</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-500">Tier</span>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierBadgeColor(userData.subscription.tier)}`}>
                                            {userData.subscription.tier.charAt(0).toUpperCase() + userData.subscription.tier.slice(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-500">Status</span>
                                        <span className="text-sm font-medium text-gray-900">{userData.subscription.status}</span>
                                    </div>
                                    {userData.subscription.billingCycle && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Billing Cycle</span>
                                            <span className="text-sm font-medium text-gray-900">{userData.subscription.billingCycle}</span>
                                        </div>
                                    )}
                                    {userData.subscription.subscriptionAge !== null && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Subscription Age</span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {userData.subscription.subscriptionAge} days
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-md font-medium text-gray-900 mb-4">Trial Information</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-500">Has Used Free Trial</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {userData.subscription.hasUsedFreeTrial ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-500">Trial Active</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {userData.subscription.isTrialActive ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    {userData.subscription.trialDaysRemaining !== null && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Trial Days Remaining</span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {userData.subscription.trialDaysRemaining}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'usage' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Inventory Stats */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Usage</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Total Items</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userData.inventory.totalItems}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Categories Used</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userData.inventory.categories.length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Storage Locations</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userData.inventory.locations.length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Items Expiring Soon</span>
                                    <span className="text-sm font-medium text-red-600">
                                        {userData.inventory.expiringItems}
                                    </span>
                                </div>
                                {userData.inventory.lastUpdated && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-500">Last Updated</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {formatDate(userData.inventory.lastUpdated)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recipe Stats */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Recipe Activity</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Total Recipes</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userData.recipes.totalRecipes}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Public Recipes</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userData.recipes.publicRecipes}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Private Recipes</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userData.recipes.privateRecipes}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Average Rating</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userData.recipes.averageRating ? userData.recipes.averageRating.toFixed(1) : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Total Views</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userData.recipes.totalViews || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-6">Recent Activity</h3>

                        {userData.activity.timeline.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No recent activity found.</p>
                            </div>
                        ) : (
                            <div className="flow-root">
                                <ul className="-mb-8">
                                    {userData.activity.timeline.map((activity, activityIdx) => (
                                        <li key={activityIdx}>
                                            <div className="relative pb-8">
                                                {activityIdx !== userData.activity.timeline.length - 1 ? (
                                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                                                ) : null}
                                                <div className="relative flex space-x-3">
                                                    <div>
                                                        <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white">
                                                            <span className="text-white text-sm">
                                                                {activity.type === 'recipe_created' ? '📝' :
                                                                    activity.type === 'collection_created' ? '📚' : '🔄'}
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                        <div>
                                                            <p className="text-sm text-gray-500">
                                                                {activity.description}
                                                            </p>
                                                        </div>
                                                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                            {formatDate(activity.date)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'actions' && (
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowUpgradeModal(true)}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                >
                                    🎯 Upgrade Subscription
                                </button>

                                <button
                                    onClick={() => setShowSuspendModal(true)}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    🚫 Manage Account Access
                                </button>

                                <button
                                    onClick={() => window.open(`mailto:${userData.user.email}`, '_blank')}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    📧 Send Email
                                </button>

                                <button
                                    onClick={fetchUserData}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    🔄 Refresh Data
                                </button>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                These actions are irreversible. Please proceed with caution.
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        if (confirm('Are you sure you want to reset this user\'s monthly usage counters?')) {
                                            // Handle reset monthly usage
                                            alert('This feature is not yet implemented.');
                                        }
                                    }}
                                    className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                                >
                                    ⚠️ Reset Monthly Usage
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upgrade Modal */}
                {showUpgradeModal && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                            <div className="mt-3">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                    Upgrade User Subscription
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Upgrade {userData.user.name} to a higher subscription tier.
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            New Tier
                                        </label>
                                        <select
                                            value={upgradeData.tier}
                                            onChange={(e) => setUpgradeData(prev => ({
                                                ...prev,
                                                tier: e.target.value
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="free">Free</option>
                                            <option value="gold">Gold</option>
                                            <option value="platinum">Platinum</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            End Date (MM/DD/YYYY) - Optional
                                        </label>
                                        <input
                                            type="date"
                                            value={upgradeData.endDate}
                                            onChange={(e) => setUpgradeData(prev => ({
                                                ...prev,
                                                endDate: e.target.value
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Leave empty for permanent upgrade
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Reason
                                        </label>
                                        <input
                                            type="text"
                                            value={upgradeData.reason}
                                            onChange={(e) => setUpgradeData(prev => ({
                                                ...prev,
                                                reason: e.target.value
                                            }))}
                                            placeholder="e.g., Manual admin upgrade"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={upgradeData.sendNotification}
                                            onChange={(e) => setUpgradeData(prev => ({
                                                ...prev,
                                                sendNotification: e.target.checked
                                            }))}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label className="ml-2 block text-sm text-gray-900">
                                            Send email notification to user
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        onClick={() => setShowUpgradeModal(false)}
                                        disabled={actionLoading}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {actionLoading ? 'Upgrading...' : 'Upgrade User'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Suspend Modal */}
                {showSuspendModal && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                            <div className="mt-3">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                    Manage Account Access
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Suspend or restore access for {userData.user.name}.
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Reason
                                        </label>
                                        <textarea
                                            value={suspendData.reason}
                                            onChange={(e) => setSuspendData(prev => ({
                                                ...prev,
                                                reason: e.target.value
                                            }))}
                                            placeholder="Enter reason for suspension/unsuspension..."
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Duration (days) - Optional
                                        </label>
                                        <input
                                            type="number"
                                            value={suspendData.duration}
                                            onChange={(e) => setSuspendData(prev => ({
                                                ...prev,
                                                duration: e.target.value
                                            }))}
                                            placeholder="Leave empty for indefinite"
                                            min="1"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Leave empty for indefinite suspension
                                        </p>
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={suspendData.sendNotification}
                                            onChange={(e) => setSuspendData(prev => ({
                                                ...prev,
                                                sendNotification: e.target.checked
                                            }))}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label className="ml-2 block text-sm text-gray-900">
                                            Send email notification to user
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        onClick={() => setShowSuspendModal(false)}
                                        disabled={actionLoading}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleSuspend('unsuspend')}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {actionLoading ? 'Processing...' : 'Restore Access'}
                                    </button>
                                    <button
                                        onClick={() => handleSuspend('suspend')}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {actionLoading ? 'Processing...' : 'Suspend User'}
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