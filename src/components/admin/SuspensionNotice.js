// file: /src/components/admin/SuspensionNotice.js
// Component to display when user account is suspended

'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function SuspensionNotice({ suspensionInfo, userEmail }) {
    const [isSigningOut, setIsSigningOut] = useState(false);

    const handleSignOut = async () => {
        setIsSigningOut(true);
        try {
            await signOut({ callbackUrl: '/' });
        } catch (error) {
            console.error('Error signing out:', error);
            setIsSigningOut(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDaysRemainingText = () => {
        if (suspensionInfo.isIndefinite) {
            return "This suspension is indefinite.";
        }

        if (suspensionInfo.daysRemaining <= 0) {
            return "Your suspension should be expiring soon. Please try refreshing the page.";
        }

        if (suspensionInfo.daysRemaining === 1) {
            return "Your account will be reactivated tomorrow.";
        }

        return `Your account will be reactivated in ${suspensionInfo.daysRemaining} days.`;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {/* Warning Icon */}
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-6">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Account Suspended
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Your Doc Bear's Comfort Kitchen account has been temporarily suspended.
                        </p>
                    </div>

                    {/* Suspension Details */}
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                        <div className="space-y-3">
                            {suspensionInfo.reason && (
                                <div>
                                    <h4 className="text-sm font-medium text-red-800">Reason for suspension:</h4>
                                    <p className="text-sm text-red-700 mt-1">{suspensionInfo.reason}</p>
                                </div>
                            )}

                            {suspensionInfo.suspendedAt && (
                                <div>
                                    <h4 className="text-sm font-medium text-red-800">Suspended on:</h4>
                                    <p className="text-sm text-red-700 mt-1">
                                        {formatDate(suspensionInfo.suspendedAt)}
                                    </p>
                                </div>
                            )}

                            <div>
                                <h4 className="text-sm font-medium text-red-800">Duration:</h4>
                                <p className="text-sm text-red-700 mt-1">
                                    {getDaysRemainingText()}
                                </p>
                            </div>

                            {suspensionInfo.endDate && (
                                <div>
                                    <h4 className="text-sm font-medium text-red-800">Reactivation date:</h4>
                                    <p className="text-sm text-red-700 mt-1">
                                        {formatDate(suspensionInfo.endDate)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Limited Access Info */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800">
                                    Limited Access During Suspension
                                </h3>
                                <div className="mt-2 text-sm text-yellow-700">
                                    <p>While your account is suspended, you have limited access to the application:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>You can view your existing recipes and inventory</li>
                                        <li>You cannot add new content or make purchases</li>
                                        <li>Some features may be temporarily unavailable</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">
                                    Questions or Appeals
                                </h3>
                                <div className="mt-2 text-sm text-blue-700">
                                    <p>
                                        If you believe this suspension was made in error or would like to appeal,
                                        please contact our support team:
                                    </p>
                                    <p className="mt-2">
                                        <strong>Email:</strong> support@docbearscomfortkitchen.com
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                        Please include your account email ({userEmail}) in your message.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Refresh Page
                        </button>

                        <button
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSigningOut ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing Out...
                                </>
                            ) : (
                                'Sign Out'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}