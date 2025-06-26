// file: src/components/support/ContactSupportModal.jsx v1 - Contact support modal with form

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

const ContactSupportModal = ({ isOpen, onClose, userSubscription = null }) => {
    const [formData, setFormData] = useState({
        subject: '',
        category: '',
        priority: 'normal',
        message: '',
        email: '',
        name: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState('');

    // Determine priority options based on subscription
    const getPriorityOptions = () => {
        const options = [
            { value: 'low', label: 'Low', description: 'General questions, feature requests' },
            { value: 'normal', label: 'Normal', description: 'Standard support issues' }
        ];

        if (userSubscription?.tier === 'gold') {
            options.push({ value: 'high', label: 'High (Gold)', description: 'Urgent issues for Gold members' });
        } else if (userSubscription?.tier === 'platinum') {
            options.push(
                    { value: 'high', label: 'High (Platinum)', description: 'Urgent issues for Platinum members' },
                    { value: 'urgent', label: 'Urgent (Platinum)', description: 'Critical issues requiring immediate attention' }
            );
        }

        return options;
    };

    const categoryOptions = [
        { value: 'account', label: 'Account & Billing' },
        { value: 'inventory', label: 'Inventory Management' },
        { value: 'recipes', label: 'Recipes & Meal Planning' },
        { value: 'technical', label: 'Technical Issues' },
        { value: 'feature', label: 'Feature Request' },
        { value: 'bug', label: 'Bug Report' },
        { value: 'data', label: 'Data Import/Export' },
        { value: 'nutrition', label: 'Nutrition Information' },
        { value: 'other', label: 'Other' }
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            // Validate form
            if (!formData.subject.trim() || !formData.message.trim() || !formData.email.trim() || !formData.name.trim()) {
                throw new Error('Please fill in all required fields.');
            }

            if (!formData.category) {
                throw new Error('Please select a category.');
            }

            // Send support request
            const response = await fetch('/api/support/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    userTier: userSubscription?.tier || 'free',
                    timestamp: new Date().toISOString()
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send support request');
            }

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                onClose();
                // Reset form
                setFormData({
                    subject: '',
                    category: '',
                    priority: 'normal',
                    message: '',
                    email: '',
                    name: ''
                });
            }, 3000);

        } catch (error) {
            console.error('Support request error:', error);
            setError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    if (showSuccess) {
        return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="text-center">
                            <div className="text-6xl mb-4">✅</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Support Request Sent!</h3>
                            <p className="text-gray-600 mb-4">
                                Thank you for contacting us. We'll get back to you within:
                            </p>
                            <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-3">
                                {userSubscription?.tier === 'platinum' && (
                                        <p className="text-blue-700 font-medium">⚡ Platinum Priority: 2-4 hours</p>
                                )}
                                {userSubscription?.tier === 'gold' && (
                                        <p className="text-yellow-700 font-medium">🥇 Gold Priority: 4-8 hours</p>
                                )}
                                {(!userSubscription?.tier || userSubscription?.tier === 'free') && (
                                        <p className="text-gray-700">📧 Standard: 24-48 hours</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
        );
    }

    return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">Contact Support</h2>
                            <TouchEnhancedButton
                                    onClick={onClose}
                                    className="text-gray-400 hover:text-gray-600 p-2"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </TouchEnhancedButton>
                        </div>
                        {userSubscription?.tier && (
                                <div className="mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    userSubscription.tier === 'platinum' ? 'bg-purple-100 text-purple-800' :
                                            userSubscription.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                            }`}>
                                {userSubscription.tier.charAt(0).toUpperCase() + userSubscription.tier.slice(1)} Member
                                {userSubscription.tier === 'platinum' && ' - Priority Support'}
                                {userSubscription.tier === 'gold' && ' - Enhanced Support'}
                            </span>
                                </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <div className="flex">
                                        <div className="text-red-400">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-red-800">{error}</p>
                                        </div>
                                    </div>
                                </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                    Your Name *
                                </label>
                                <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address *
                                </label>
                                <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                                    Category *
                                </label>
                                <select
                                        id="category"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                >
                                    <option value="">Select a category...</option>
                                    {categoryOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                                    Priority
                                </label>
                                <select
                                        id="priority"
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {getPriorityOptions().map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {getPriorityOptions().find(opt => opt.value === formData.priority)?.description}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                                Subject *
                            </label>
                            <input
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Brief description of your issue"
                                    required
                            />
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                                Message *
                            </label>
                            <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleInputChange}
                                    rows={6}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Please provide detailed information about your issue, including any error messages or steps to reproduce the problem..."
                                    required
                            />
                            <div className="flex justify-between mt-1">
                                <p className="text-xs text-gray-500">
                                    Include as much detail as possible to help us assist you quickly.
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formData.message.length} characters
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <TouchEnhancedButton
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                            >
                                {isSubmitting ? 'Sending...' : 'Send Support Request'}
                            </TouchEnhancedButton>
                        </div>
                    </form>
                </div>
            </div>
    );
};

export default ContactSupportModal;