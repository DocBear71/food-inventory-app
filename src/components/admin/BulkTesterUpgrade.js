
'use client';

// file: /src/components/admin/BulkTesterUpgrade.js
// Google Play Tester Bulk Upgrade Utility - Special component for your closed beta

import { useState } from 'react';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export default function BulkTesterUpgrade() {
    const [testerEmails, setTesterEmails] = useState('');
    const [endDate, setEndDate] = useState('2024-08-31'); // Default to end of August
    const [reason, setReason] = useState('Google Play closed beta tester access');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleBulkUpgrade = async () => {
        if (!testerEmails.trim()) {
            alert('Please enter at least one email address');
            return;
        }

        const emailList = testerEmails
            .split('\n')
            .map(email => email.trim())
            .filter(email => email && email.includes('@'));

        if (emailList.length === 0) {
            alert('Please enter valid email addresses');
            return;
        }

        if (emailList.length > 100) {
            alert('Maximum 100 users per batch. Please split into smaller groups.');
            return;
        }

        try {
            setLoading(true);
            setResult(null);

            const response = await fetch('/api/admin/users/bulk/upgrade', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmails: emailList,
                    tier: 'platinum',
                    endDate,
                    reason,
                    sendNotifications: false // Don't spam testers with emails
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setResult(data);

        } catch (error) {
            console.error('Bulk upgrade error:', error);
            alert('Error upgrading users: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const presetTesterEmails = () => {
        // You can pre-populate with your known tester emails
        const sampleEmails = [
            'tester1@example.com',
            'tester2@example.com',
            'tester3@example.com'
        ].join('\n');

        setTesterEmails(sampleEmails);
    };

    const clearResults = () => {
        setResult(null);
        setTesterEmails('');
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                        🧪 Google Play Tester Bulk Upgrade
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Quickly upgrade your closed beta testers to Platinum tier
                    </p>
                </div>
                <div className="text-right">
                    <button
                        onClick={presetTesterEmails}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                        Load Sample Emails
                    </button>
                </div>
            </div>

            {!result ? (
                <div className="space-y-6">
                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tester Email Addresses
                            <span className="text-gray-500 font-normal"> (one per line, max 100)</span>
                        </label>
                        <textarea
                            value={testerEmails}
                            onChange={(e) => setTesterEmails(e.target.value)}
                            placeholder={`Enter email addresses, one per line:
tester1@gmail.com
tester2@gmail.com
tester3@gmail.com`}
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Current count: {testerEmails.split('\n').filter(email => email.trim() && email.includes('@')).length} emails
                        </p>
                    </div>

                    {/* Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date (MM/DD/YYYY)
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Testers will automatically revert to free tier after this date
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason
                            </label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Reason for upgrade"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Upgrade Preview */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Upgrade Preview</h4>
                        <div className="text-sm text-blue-700 space-y-1">
                            <div>• <strong>Tier:</strong> Platinum (full access)</div>
                            <div>• <strong>Duration:</strong> Until {endDate ? new Date(endDate).toLocaleDateString() : 'end date'}</div>
                            <div>• <strong>Email Notifications:</strong> Disabled (won't spam testers)</div>
                            <div>• <strong>Users to upgrade:</strong> {testerEmails.split('\n').filter(email => email.trim() && email.includes('@')).length}</div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleBulkUpgrade}
                            disabled={loading || !testerEmails.trim()}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Upgrading Users...
                                </>
                            ) : (
                                <>
                                    🚀 Upgrade All Testers to Platinum
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                /* Results Display */
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="mt-2 text-lg font-medium text-gray-900">Bulk Upgrade Complete!</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {result.results.successful.length} users successfully upgraded to Platinum
                        </p>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {result.results.successful.length}
                            </div>
                            <div className="text-sm text-green-700">Successful</div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                                {result.results.notFound.length}
                            </div>
                            <div className="text-sm text-yellow-700">Not Found</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-red-600">
                                {result.results.failed.length}
                            </div>
                            <div className="text-sm text-red-700">Failed</div>
                        </div>
                    </div>

                    {/* Successful Upgrades */}
                    {result.results.successful.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">✅ Successfully Upgraded</h4>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                                <div className="space-y-1">
                                    {result.results.successful.map((user, index) => (
                                        <div key={index} className="text-sm text-green-800">
                                            {user.name} ({user.email}) - {user.previousTier} → {user.newTier}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Not Found Users */}
                    {result.results.notFound.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">⚠️ Users Not Found</h4>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-32 overflow-y-auto">
                                <div className="space-y-1">
                                    {result.results.notFound.map((user, index) => (
                                        <div key={index} className="text-sm text-yellow-800">
                                            {user.email} - No account found with this email
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-yellow-700 mt-2">
                                These users may need to create accounts first before being upgraded.
                            </p>
                        </div>
                    )}

                    {/* Failed Upgrades */}
                    {result.results.failed.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">❌ Failed Upgrades</h4>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-32 overflow-y-auto">
                                <div className="space-y-1">
                                    {result.results.failed.map((user, index) => (
                                        <div key={index} className="text-sm text-red-800">
                                            {user.email} - {user.error}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={clearResults}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Upgrade More Users
                        </button>
                        <button
                            onClick={() => NativeNavigation.navigateTo({ path: '/admin/users', router })}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            View All Users
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}