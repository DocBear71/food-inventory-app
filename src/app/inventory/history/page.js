'use client';
// file: /src/app/inventory/history/page.js v1


import { useSafeSession } from '@/hooks/useSafeSession';
import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { getApiUrl } from '../../../lib/api-config';

export default function ConsumptionHistoryPage() {
    const { data: session, status } = useSafeSession();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterReason, setFilterReason] = useState('all');
    const [sortBy, setSortBy] = useState('date');

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session?.user?.id) {
            fetchHistory();
        }
    }, [session?.user?.id, filterReason]);

    const fetchHistory = async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams({
                limit: '100'
            });

            // Add reason filter if not 'all'
            if (filterReason !== 'all') {
                params.append('reason', filterReason);
            }

            // Try to use getApiUrl, but fallback to direct path if it fails
            let apiUrl;
            try {
                apiUrl = getApiUrl(`/api/inventory/consume?${params}`);
            } catch (e) {
                console.warn('getApiUrl failed, using direct path:', e);
                apiUrl = `/api/inventory/consume?${params}`;
            }

            const response = await fetch(apiUrl);

            const result = await response.json();

            if (result.success) {
                setHistory(result.history || []);
            } else {
                setError(result.error || 'Failed to fetch consumption history');
            }
        } catch (error) {
            console.error('Error fetching consumption history:', error);
            setError('Failed to load consumption history');
        } finally {
            setLoading(false);
        }
    };

    const reasonOptions = [
        { value: 'all', label: 'All Reasons', icon: '📊', color: 'gray' },
        { value: 'consumed', label: 'Consumed/Used', icon: '🍽️', color: 'green' },
        { value: 'recipe', label: 'Used in Recipe', icon: '👨‍🍳', color: 'blue' },
        { value: 'expired', label: 'Expired/Bad', icon: '🗑️', color: 'red' },
        { value: 'donated', label: 'Donated/Gifted', icon: '❤️', color: 'purple' },
        { value: 'spilled', label: 'Spilled/Wasted', icon: '💧', color: 'orange' },
        { value: 'other', label: 'Other Reason', icon: '📝', color: 'gray' }
    ];

    const getReasonInfo = (reason) => {
        return reasonOptions.find(opt => opt.value === reason) || reasonOptions[0];
    };

    const getSortedHistory = () => {
        let sorted = [...history];

        switch (sortBy) {
            case 'date':
                sorted.sort((a, b) => new Date(b.dateConsumed) - new Date(a.dateConsumed));
                break;
            case 'item':
                sorted.sort((a, b) => a.itemName.localeCompare(b.itemName));
                break;
            case 'quantity':
                sorted.sort((a, b) => b.quantityConsumed - a.quantityConsumed);
                break;
            case 'reason':
                sorted.sort((a, b) => a.reason.localeCompare(b.reason));
                break;
            default:
                break;
        }

        return sorted;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const getReasonStats = () => {
        const stats = {};
        reasonOptions.forEach(option => {
            if (option.value !== 'all') {
                stats[option.value] = history.filter(item => item.reason === option.value).length;
            }
        });
        return stats;
    };

    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-lg">Loading...</div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    if (!session) {
        return null;
    }

    const sortedHistory = getSortedHistory();
    const reasonStats = getReasonStats();

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">📊 Consumption History</h1>
                        <p className="text-gray-600 mt-1">Track what you've used, consumed, or removed from inventory</p>
                    </div>
                    <TouchEnhancedButton
                        onClick={() => window.history.back()}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        ← Back to Inventory
                    </TouchEnhancedButton>
                </div>

                {/* Stats Overview */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        {reasonOptions.slice(1).map((option) => {
                            const count = reasonStats[option.value] || 0;
                            return (
                                <div key={option.value} className="text-center p-3 bg-gray-50 rounded-lg">
                                    <div className="text-2xl mb-1">{option.icon}</div>
                                    <div className="text-lg font-semibold text-gray-900">{count}</div>
                                    <div className="text-xs text-gray-600">{option.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Filters and Controls */}
                <div className="bg-white shadow rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Filter by Reason
                                </label>
                                <select
                                    value={filterReason}
                                    onChange={(e) => setFilterReason(e.target.value)}
                                    className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                >
                                    {reasonOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label} {option.value !== 'all' ? `(${reasonStats[option.value] || 0})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sort by
                                </label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                >
                                    <option value="date">Date (Recent First)</option>
                                    <option value="item">Item Name</option>
                                    <option value="quantity">Quantity</option>
                                    <option value="reason">Reason</option>
                                </select>
                            </div>
                        </div>

                        <div className="text-sm text-gray-500">
                            {sortedHistory.length} records
                        </div>
                    </div>
                </div>

                {/* History List */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Consumption Records
                        </h3>

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <div className="text-gray-500">Loading consumption history...</div>
                            </div>
                        ) : error ? (
                            <div className="text-center py-8">
                                <div className="text-red-600 mb-4">❌ {error}</div>
                                <TouchEnhancedButton
                                    onClick={fetchHistory}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                >
                                    Try Again
                                </TouchEnhancedButton>
                            </div>
                        ) : sortedHistory.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-6xl mb-4">📦</div>
                                <div className="text-gray-500 text-lg mb-2">No consumption history yet</div>
                                <div className="text-gray-400 text-sm">
                                    Start using items from your inventory to see consumption tracking here
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sortedHistory.map((record, index) => {
                                    const reasonInfo = getReasonInfo(record.reason);

                                    return (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start space-x-3">
                                                    <div className="text-2xl">{reasonInfo.icon}</div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2">
                                                            <h4 className="font-medium text-gray-900">
                                                                {record.itemName}
                                                            </h4>
                                                            {record.ingredient && record.ingredient !== record.itemName && (
                                                                <span className="text-sm text-gray-500">
                                                                    (used as {record.ingredient})
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="mt-1 space-y-1">
                                                            <div className="text-sm text-gray-600">
                                                                <span className="font-medium">Consumed:</span> {record.quantityConsumed} {record.unitConsumed}
                                                                {record.remainingQuantity > 0 && (
                                                                    <span className="ml-2">
                                                                        • <span className="font-medium">Remaining:</span> {record.remainingQuantity} {record.unitConsumed}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                    reasonInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                                                                        reasonInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                                                            reasonInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                                                                                reasonInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                                                                                    reasonInfo.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                                                                                        'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                    {reasonInfo.label}
                                                                </span>
                                                                <span>{formatDate(record.dateConsumed)}</span>
                                                            </div>

                                                            {record.recipeName && (
                                                                <div className="text-sm text-blue-600">
                                                                    🍽️ Recipe: {record.recipeName}
                                                                </div>
                                                            )}

                                                            {record.notes && (
                                                                <div className="text-sm text-gray-600 italic">
                                                                    "{record.notes}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="text-xs text-gray-400">
                                                        {new Date(record.dateConsumed).toLocaleDateString()}
                                                    </div>
                                                    {record.remainingQuantity === 0 && (
                                                        <div className="text-xs text-red-500 font-medium mt-1">
                                                            Item Removed
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}