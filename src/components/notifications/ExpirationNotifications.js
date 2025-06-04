// file: /src/components/notifications/ExpirationNotifications.js v1

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ExpirationNotifications({ onItemsUpdated }) {
    const { data: session } = useSession();
    const [notifications, setNotifications] = useState({
        expired: [],
        expiresToday: [],
        expiresThisWeek: [],
        expiresNextWeek: []
    });
    const [summary, setSummary] = useState({
        totalExpired: 0,
        totalExpiringSoon: 0,
        totalExpiringThisWeek: 0,
        totalExpiringToday: 0
    });
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [showAll, setShowAll] = useState(false);
    const [processingAction, setProcessingAction] = useState(false);

    useEffect(() => {
        if (session) {
            fetchNotifications();
        }
    }, [session]);

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/api/notifications/expiration');
            const data = await response.json();

            if (data.success) {
                setNotifications(data.notifications);
                setSummary(data.summary);
            }
        } catch (error) {
            console.error('Error fetching expiration notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleItemSelection = (itemId, checked) => {
        const newSelected = new Set(selectedItems);
        if (checked) {
            newSelected.add(itemId);
        } else {
            newSelected.delete(itemId);
        }
        setSelectedItems(newSelected);
    };

    const handleBulkAction = async (action) => {
        if (selectedItems.size === 0) {
            alert('Please select items first');
            return;
        }

        setProcessingAction(true);

        try {
            const response = await fetch('/api/notifications/expiration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemIds: Array.from(selectedItems),
                    action
                })
            });

            const data = await response.json();

            if (data.success) {
                await fetchNotifications();
                setSelectedItems(new Set());
                if (onItemsUpdated) {
                    onItemsUpdated();
                }
                alert(data.message);
            } else {
                alert(data.error || 'Failed to update items');
            }
        } catch (error) {
            console.error('Error updating items:', error);
            alert('Error updating items');
        } finally {
            setProcessingAction(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return 'bg-red-50 border-red-200 text-red-800';
            case 'high': return 'bg-orange-50 border-orange-200 text-orange-800';
            case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            case 'low': return 'bg-blue-50 border-blue-200 text-blue-800';
            default: return 'bg-gray-50 border-gray-200 text-gray-800';
        }
    };

    const getActionButtonColor = (priority) => {
        switch (priority) {
            case 'critical': return 'bg-red-600 hover:bg-red-700';
            case 'high': return 'bg-orange-600 hover:bg-orange-700';
            case 'medium': return 'bg-yellow-600 hover:bg-yellow-700';
            case 'low': return 'bg-blue-600 hover:bg-blue-700';
            default: return 'bg-gray-600 hover:bg-gray-700';
        }
    };

    const renderNotificationGroup = (title, items, defaultShow = true) => {
        if (!items || items.length === 0) return null;

        const isVisible = defaultShow || showAll;

        return (
            <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
                    {title} ({items.length})
                    {!defaultShow && (
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                            {isVisible ? 'Hide' : 'Show'}
                        </button>
                    )}
                </h4>

                {isVisible && (
                    <div className="space-y-2">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className={`p-3 rounded-lg border ${getPriorityColor(item.priority)} flex items-center justify-between`}
                            >
                                <div className="flex items-center space-x-3 flex-1">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.has(item.id)}
                                        onChange={(e) => handleItemSelection(item.id, e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium">
                                            {item.name}
                                            {item.brand && <span className="text-sm font-normal"> ({item.brand})</span>}
                                        </div>
                                        <div className="text-sm">
                                            {item.quantity} {item.unit} • {item.location} • {item.message}
                                        </div>
                                        <div className="text-xs">
                                            Expires: {new Date(item.expirationDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {item.priority === 'critical' && (
                                        <span className="text-red-600 text-xl">🚨</span>
                                    )}
                                    {item.priority === 'high' && (
                                        <span className="text-orange-600 text-xl">⚠️</span>
                                    )}
                                    {item.priority === 'medium' && (
                                        <span className="text-yellow-600 text-xl">⏰</span>
                                    )}
                                    {item.priority === 'low' && (
                                        <span className="text-blue-600 text-xl">📅</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center text-gray-500">Loading expiration notifications...</div>
            </div>
        );
    }

    if (summary.totalExpired === 0 && summary.totalExpiringSoon === 0) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="text-center">
                    <div className="text-green-600 text-2xl mb-2">✅</div>
                    <div className="text-green-800 font-medium">No expiring items!</div>
                    <div className="text-green-600 text-sm">All your food items are fresh.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Expiration Alerts
                    </h3>
                    <div className="text-sm text-gray-500">
                        {summary.totalExpired + summary.totalExpiringSoon} items need attention
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-red-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600">{summary.totalExpired}</div>
                        <div className="text-sm text-red-800">Expired</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-orange-600">{summary.totalExpiringToday}</div>
                        <div className="text-sm text-orange-800">Today</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-yellow-600">{summary.totalExpiringThisWeek}</div>
                        <div className="text-sm text-yellow-800">This Week</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{notifications.expiresNextWeek.length}</div>
                        <div className="text-sm text-blue-800">Next Week</div>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedItems.size > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleBulkAction('consumed')}
                                    disabled={processingAction}
                                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-green-400"
                                >
                                    Mark as Consumed
                                </button>
                                <button
                                    onClick={() => handleBulkAction('extend')}
                                    disabled={processingAction}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                                >
                                    Extend 7 Days
                                </button>
                                <button
                                    onClick={() => setSelectedItems(new Set())}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notification Groups */}
                <div className="space-y-6">
                    {renderNotificationGroup('🚨 Expired Items', notifications.expired)}
                    {renderNotificationGroup('⚠️ Expires Today', notifications.expiresToday)}
                    {renderNotificationGroup('⏰ Expires This Week', notifications.expiresThisWeek)}
                    {renderNotificationGroup('📅 Expires Next Week', notifications.expiresNextWeek, false)}
                </div>
            </div>
        </div>
    );
}