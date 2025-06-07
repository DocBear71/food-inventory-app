// file: /src/components/inventory/ConsumptionHistory.js v1

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ConsumptionHistory({ onClose }) {
    const { data: session } = useSession();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterReason, setFilterReason] = useState('all');
    const [sortBy, setSortBy] = useState('date');

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
                limit: '100',
                reason: filterReason
            });

            const response = await fetch(`/api/inventory/consume?${params}`);
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

    const sortedHistory = getSortedHistory();
    const reasonStats = getReasonStats();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                📊 Consumption History
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Track what you've used, consumed, or removed from inventory
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        {reasonOptions.slice(1).map((option) => {
                            const count = reasonStats[option.value] || 0;
                            return (
                                <div key={option.value} className="text-center">
                                    <div className="text-2xl">{option.icon}</div>
                                    <div className="text-lg font-semibold text-gray-900">{count}</div>
                                    <div className="text-xs text-gray-600">{option.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Filters and Controls */}
                <div className="px-6 py-4 border-b border-gray-200">
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
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                            <div className="text-gray-500">Loading consumption history...</div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <div className="text-red-600 mb-4">❌ {error}</div>
                            <button
                                onClick={fetchHistory}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                Try Again
                            </button>
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
                                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
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

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                            Total records: {history.length}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={fetchHistory}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                🔄 Refresh
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}