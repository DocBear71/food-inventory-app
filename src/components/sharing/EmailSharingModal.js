'use client';
// file: /src/components/sharing/EmailSharingModal.js v1 - Email sharing with subscription gates

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiPost } from '@/lib/api-config';
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';

export default function EmailSharingModal({
                                              isOpen,
                                              onClose,
                                              shoppingList,
                                              context = 'shopping-list',
                                              contextName = 'Shopping List',
                                              onEmailSent
                                          }) {
    const [recipients, setRecipients] = useState(['']);
    const [personalMessage, setPersonalMessage] = useState('');
    const [senderName, setSenderName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Subscription hooks
    const subscription = useSubscription();
    const emailGate = useFeatureGate(FEATURE_GATES.EMAIL_SHARING);

    const addRecipient = () => {
        setRecipients([...recipients, '']);
    };

    const updateRecipient = (index, value) => {
        const newRecipients = [...recipients];
        newRecipients[index] = value;
        setRecipients(newRecipients);
    };

    const removeRecipient = (index) => {
        if (recipients.length > 1) {
            setRecipients(recipients.filter((_, i) => i !== index));
        }
    };

    const validateEmails = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validRecipients = recipients.filter(email => email.trim() && emailRegex.test(email.trim()));

        if (validRecipients.length === 0) {
            setError('Please enter at least one valid email address');
            return false;
        }

        if (!senderName.trim()) {
            setError('Please enter your name');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!validateEmails()) return;

        setIsSubmitting(true);

        try {
            const validEmails = recipients.filter(email => email.trim());

            const response = await apiPost('/api/sharing/email', {
                toEmails: validEmails,
                senderName: senderName.trim(),
                shoppingList,
                personalMessage: personalMessage.trim(),
                context,
                contextName
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(`Shopping list sent successfully to ${data.recipientCount} recipient${data.recipientCount !== 1 ? 's' : ''}!`);
                if (onEmailSent) {
                    onEmailSent(data);
                }
                // Reset form after successful send
                setTimeout(() => {
                    onClose();
                    setRecipients(['']);
                    setPersonalMessage('');
                    setSuccess('');
                }, 2000);
            } else {
                setError(data.error || 'Failed to send email');
            }
        } catch (error) {
            console.error('Email sharing error:', error);
            setError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <FeatureGate
            feature={FEATURE_GATES.EMAIL_SHARING}
            fallback={
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6">
                            <div className="text-center">
                                <div className="text-4xl mb-2">📧🔒</div>
                                <h2 className="text-xl font-bold">Email Sharing</h2>
                                <p className="text-yellow-100 text-sm mt-1">Premium Feature</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Upgrade to Gold for Email Sharing
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Share shopping lists, recipes, and meal plans directly via email with family and friends.
                                </p>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                    <div className="text-yellow-800 text-sm">
                                        <div className="font-medium mb-2">📧 What you get with Email Sharing:</div>
                                        <ul className="text-left space-y-1">
                                            <li>• Send shopping lists via email</li>
                                            <li>• Share recipes with friends & family</li>
                                            <li>• Email meal plans to household members</li>
                                            <li>• Beautiful, mobile-friendly email templates</li>
                                            <li>• Personal messages & custom branding</li>
                                            <li>• 50 emails per month (Gold)</li>
                                            <li>• Unlimited emails (Platinum)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <TouchEnhancedButton
                                    onClick={() => window.location.href = '/pricing?source=email-sharing'}
                                    className="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-yellow-700"
                                >
                                    Upgrade to Gold - $4.99/month
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={onClose}
                                    className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg"
                                >
                                    Maybe Later
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">📧 Share via Email</h2>
                                <p className="text-blue-100 text-sm mt-1">{contextName}</p>
                            </div>
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="text-blue-100 hover:text-white text-xl"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Usage info for Gold users */}
                        {subscription && subscription.tier === 'gold' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                <div className="text-blue-800 text-sm">
                                    <span className="font-medium">💫 Gold Member:</span> You can send up to 50 emails per month.
                                    <a href="/pricing" className="underline hover:no-underline ml-1">
                                        Upgrade to Platinum for unlimited emails
                                    </a>.
                                </div>
                            </div>
                        )}

                        {/* Error/Success Messages */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Sender Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Your Name *
                                </label>
                                <input
                                    type="text"
                                    value={senderName}
                                    onChange={(e) => setSenderName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            {/* Recipients */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Send to *
                                </label>
                                {recipients.map((email, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => updateRecipient(index, e.target.value)}
                                            placeholder="Enter email address"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            required={index === 0}
                                        />
                                        {recipients.length > 1 && (
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => removeRecipient(index)}
                                                className="text-red-500 hover:text-red-700 p-2"
                                            >
                                                ✕
                                            </TouchEnhancedButton>
                                        )}
                                    </div>
                                ))}
                                <TouchEnhancedButton
                                    type="button"
                                    onClick={addRecipient}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                    + Add another recipient
                                </TouchEnhancedButton>
                            </div>

                            {/* Personal Message */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Personal Message (Optional)
                                </label>
                                <textarea
                                    value={personalMessage}
                                    onChange={(e) => setPersonalMessage(e.target.value)}
                                    placeholder="Add a personal note..."
                                    rows={3}
                                    maxLength={500}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                                <div className="text-xs text-gray-500 mt-1">
                                    {personalMessage.length}/500 characters
                                </div>
                            </div>

                            {/* Email Preview Info */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">📧 Email Preview</h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <div><strong>Subject:</strong> 🛒 Shopping List from {senderName || 'Your Name'}</div>
                                    <div><strong>Content:</strong> Beautiful, mobile-friendly shopping list</div>
                                    <div><strong>Items:</strong> {shoppingList?.stats?.totalItems || 0} items organized by category</div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex gap-3 pt-4">
                                <TouchEnhancedButton
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    type="submit"
                                    disabled={isSubmitting || !senderName.trim()}
                                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            📧 Send Email
                                        </>
                                    )}
                                </TouchEnhancedButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </FeatureGate>
    );
}