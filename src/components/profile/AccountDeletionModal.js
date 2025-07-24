'use client';
// file: /src/components/profile/AccountDeletionModal.js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiGet, apiPost } from '@/lib/api-config';
import KeyboardOptimizedInput from '@/components/forms/KeyboardOptimizedInput';

export default function AccountDeletionModal({ isOpen, onClose, userEmail }) {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Warning, 2: Data Summary, 3: Final Confirmation
    const [loading, setLoading] = useState(false);
    const [dataSummary, setDataSummary] = useState(null);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        password: '',
        confirmDeletion: false,
        confirmEmail: ''
    });

    // Fetch data summary when modal opens
    useEffect(() => {
        if (isOpen && step === 2) {
            fetchDataSummary();
        }
    }, [isOpen, step]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setFormData({
                password: '',
                confirmDeletion: false,
                confirmEmail: ''
            });
            setError('');
            setDataSummary(null);
        }
    }, [isOpen]);

    const fetchDataSummary = async () => {
        try {
            setLoading(true);
            const response = await apiGet('/api/user/delete-account');
            const data = await response.json();

            if (response.ok) {
                setDataSummary(data);
            } else {
                setError(data.error || 'Failed to fetch account data');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await apiPost('/api/user/delete-account', {
                password: formData.password,
                confirmDeletion: formData.confirmDeletion
            });

            const data = await response.json();

            if (response.ok) {
                // Account deleted successfully
                alert('Your account has been successfully deleted. You will now be signed out.');

                // Sign out and redirect
                await signOut({ redirect: false });
                router.push('/');
            } else {
                setError(data.error || 'Failed to delete account');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Helper function to check if emails match
    const emailsMatch = () => {
        if (!userEmail || !formData.confirmEmail) return false;
        return formData.confirmEmail.toLowerCase() === userEmail.toLowerCase();
    };

    // Helper function to get display email
    const getDisplayEmail = () => {
        if (userEmail) return userEmail;
        if (sessionData?.user?.email) return sessionData.user.email;
        return 'your email address';
    };

    // Helper function to get validation email
    const getValidationEmail = () => {
        return userEmail || sessionData?.user?.email;
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto relative shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                    <h2 className="text-xl font-semibold text-red-600">
                        {step === 1 && '⚠️ Delete Account'}
                        {step === 2 && '📊 Your Data Summary'}
                        {step === 3 && '🗑️ Final Confirmation'}
                    </h2>
                    <TouchEnhancedButton
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center"
                        aria-label="Close"
                    >
                        ×
                    </TouchEnhancedButton>
                </div>

                <div className="p-6">
                    {/* Step 1: Warning */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                <h3 className="text-lg font-medium text-red-900 mb-2">
                                    This action cannot be undone
                                </h3>
                                <p className="text-red-700">
                                    Deleting your account will permanently remove all your data from Doc Bear's Comfort Kitchen.
                                    This includes your recipes, meal plans, inventory, nutrition logs, and all other personal information.
                                </p>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                                <h4 className="text-md font-medium text-yellow-900 mb-2">
                                    🛡️ What happens to your data:
                                </h4>
                                <ul className="text-yellow-800 space-y-1 text-sm">
                                    <li>• <strong>Private data:</strong> Permanently deleted (recipes, meal plans, inventory, etc.)</li>
                                    <li>• <strong>Public recipes:</strong> Made anonymous (your name removed but recipe remains)</li>
                                    <li>• <strong>Shared lists:</strong> You'll be removed from any shared shopping lists</li>
                                    <li>• <strong>Email notifications:</strong> All notifications will stop</li>
                                </ul>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                                <h4 className="text-md font-medium text-blue-900 mb-2">
                                    💡 Consider these alternatives:
                                </h4>
                                <ul className="text-blue-800 space-y-1 text-sm">
                                    <li>• Export your recipes and meal plans before deleting</li>
                                    <li>• Simply stop using the app (your data remains safe)</li>
                                    <li>• Contact support if you're having issues with the app</li>
                                    <li>• You can always create a new account later with the same email</li>
                                </ul>
                            </div>

                            <div className="flex justify-between space-x-4">
                                <TouchEnhancedButton
                                    onClick={onClose}
                                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                                >
                                    Cancel
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => setStep(2)}
                                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                                >
                                    Continue with Deletion
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Data Summary */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Here's what will be deleted
                                </h3>
                                <p className="text-gray-600">
                                    Review your data before proceeding with deletion
                                </p>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                                </div>
                            ) : dataSummary ? (
                                <div className="space-y-4">
                                    {dataSummary.totalDataPoints > 0 ? (
                                        <>
                                            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                                                <h4 className="font-medium text-gray-900 mb-3">Your Data Summary:</h4>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    {dataSummary.dataSummary.contacts > 0 && (
                                                        <div className="flex justify-between">
                                                            <span>Contacts:</span>
                                                            <span className="font-medium">{dataSummary.dataSummary.contacts}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <div className="flex justify-between font-semibold text-lg">
                                                        <span>Total Data Points:</span>
                                                        <span className="text-red-600">{dataSummary.totalDataPoints}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                                <p className="text-red-700 text-sm">
                                                    <strong>⚠️ All of this data will be permanently deleted.</strong> Make sure you've exported
                                                    or saved anything important before proceeding.
                                                </p>

                                                {dataSummary.dataSummary.inventory > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Inventory Items:</span>
                                                        <span className="font-medium">{dataSummary.dataSummary.inventory}</span>
                                                    </div>
                                                )}
                                                {dataSummary.dataSummary.recipes > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Recipes:</span>
                                                        <span className="font-medium">{dataSummary.dataSummary.recipes}</span>
                                                    </div>
                                                )}
                                                {dataSummary.dataSummary.mealPlans > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Meal Plans:</span>
                                                        <span className="font-medium">{dataSummary.dataSummary.mealPlans}</span>
                                                    </div>
                                                )}
                                                {dataSummary.dataSummary.nutritionLogs > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Nutrition Logs:</span>
                                                        <span className="font-medium">{dataSummary.dataSummary.nutritionLogs}</span>
                                                    </div>
                                                )}
                                                {dataSummary.dataSummary.shoppingLists > 0 && (
                                                    <div className="flex justify-between">
                                                        <span>Shopping Lists:</span>
                                                        <span className="font-medium">{dataSummary.dataSummary.shoppingLists}</span>
                                                    </div>
                                                )}

                                            </div>
                                        </>
                                    ) : (
                                        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                                            <p className="text-gray-600 text-center">
                                                Your account has minimal data to delete. You can proceed safely.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : error && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-between space-x-4">
                                <TouchEnhancedButton
                                    onClick={() => setStep(1)}
                                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                                >
                                    ← Back
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => setStep(3)}
                                    disabled={loading || error}
                                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-red-300"
                                >
                                    Proceed to Final Step
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Final Confirmation */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h3 className="text-lg font-medium text-red-900 mb-2">
                                    Final Confirmation Required
                                </h3>
                                <p className="text-gray-600">
                                    Please confirm your identity and intention to delete your account
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Email Confirmation */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Type your email address to confirm: <strong>{getDisplayEmail()}</strong>
                                    </label>
                                    {!getValidationEmail() && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 mb-2">
                                            <p className="text-yellow-700 text-sm">
                                                ⚠️ Unable to detect your email address. Please enter the email associated with your account.
                                            </p>
                                        </div>
                                    )}
                                    <KeyboardOptimizedInput
                                        type="email"
                                        value={formData.confirmEmail}
                                        onChange={(e) => setFormData(prev => ({ ...prev, confirmEmail: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                                        placeholder="Enter your email address"
                                        required
                                    />
                                </div>

                                {/* Password Confirmation */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Enter your password to confirm deletion:
                                    </label>
                                    <KeyboardOptimizedInput
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                                        placeholder="Enter your current password"
                                        required
                                    />
                                </div>

                                {/* Final Confirmation Checkbox */}
                                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                    <div className="flex items-start">
                                        <input
                                            type="checkbox"
                                            id="confirmDeletion"
                                            checked={formData.confirmDeletion}
                                            onChange={(e) => setFormData(prev => ({ ...prev, confirmDeletion: e.target.checked }))}
                                            className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="confirmDeletion" className="ml-2 text-sm text-red-700">
                                            <strong>I understand that this action is permanent and irreversible.</strong>
                                            I want to permanently delete my Doc Bear's Comfort Kitchen account and all associated data.
                                        </label>
                                    </div>
                                </div>

                                {/* Warning Summary */}
                                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                    <p className="text-yellow-800 text-sm">
                                        <strong>Last chance:</strong> Once you click "Delete Account" below, your account
                                        and all data will be immediately and permanently deleted. This cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-between space-x-4">
                                <TouchEnhancedButton
                                    onClick={() => setStep(2)}
                                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                                    disabled={loading}
                                >
                                    ← Back
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={handleDeleteAccount}
                                    disabled={
                                        loading ||
                                        !formData.password ||
                                        !formData.confirmDeletion ||
                                        (!getValidationEmail() ?
                                            !formData.confirmEmail :
                                            !emailsMatch())
                                    }
                                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Deleting Account...' : '🗑️ Delete Account Permanently'}
                                </TouchEnhancedButton>
                            </div>

                            {/* Validation Messages */}
                            <div className="text-xs text-gray-500 space-y-1">
                                {getValidationEmail() && formData.confirmEmail && !emailsMatch() && (
                                    <p className="text-red-600">❌ Email address doesn't match</p>
                                )}
                                {!getValidationEmail() && !formData.confirmEmail && (
                                    <p className="text-gray-400">⚪ Email address required</p>
                                )}
                                {!formData.password && (
                                    <p className="text-gray-400">⚪ Password required</p>
                                )}
                                {!formData.confirmDeletion && (
                                    <p className="text-gray-400">⚪ Deletion confirmation required</p>
                                )}
                                {((getValidationEmail() && emailsMatch()) || (!getValidationEmail() && formData.confirmEmail)) &&
                                    formData.password &&
                                    formData.confirmDeletion && (
                                        <p className="text-green-600">✅ All requirements met</p>
                                    )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}