'use client';
// file: src/components/support/ContactSupportModal.jsx v2 - iOS Native Enhancements

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiPost } from '@/lib/api-config.js';
import {
    NativeTextInput,
    NativeTextarea,
    NativeSelect,
    ValidationPatterns
} from '@/components/forms/NativeIOSFormComponents';
import { PlatformDetection } from '@/utils/PlatformDetection';

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

    const isIOS = PlatformDetection.isIOS();

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

    // iOS Native Category Selection Action Sheet
    const showCategoryActionSheet = async () => {
        if (!isIOS) return;

        try {
            const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
            await MobileHaptics.buttonTap();

            const buttons = categoryOptions.map(option => ({
                text: formData.category === option.value ? `${option.label} ✓` : option.label,
                style: 'default',
                action: () => {
                    setFormData({ ...formData, category: option.value });
                    return option.value;
                }
            }));

            buttons.push({
                text: 'Cancel',
                style: 'cancel',
                action: () => null
            });

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showActionSheet({
                title: 'Support Category',
                message: 'What type of support do you need?',
                buttons
            });

        } catch (error) {
            console.error('Category action sheet error:', error);
        }
    };

    // iOS Native Priority Selection Action Sheet
    const showPriorityActionSheet = async () => {
        if (!isIOS) return;

        try {
            const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
            await MobileHaptics.buttonTap();

            const priorityOptions = getPriorityOptions();
            const buttons = priorityOptions.map(option => ({
                text: formData.priority === option.value ? `${option.label} ✓` : option.label,
                style: 'default',
                action: () => {
                    setFormData({ ...formData, priority: option.value });
                    return option.value;
                }
            }));

            buttons.push({
                text: 'Cancel',
                style: 'cancel',
                action: () => null
            });

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showActionSheet({
                title: 'Priority Level',
                message: 'How urgent is this issue?',
                buttons
            });

        } catch (error) {
            console.error('Priority action sheet error:', error);
        }
    };

    const handleInputChange = async (e) => {
        const { name, value } = e.target;

        // iOS haptic feedback for input changes
        if (isIOS && name !== 'message') { // Don't fire for every character in message
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.selection();
            } catch (error) {
                console.log('Input haptic failed:', error);
            }
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        ;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // iOS-specific form validation
        if (isIOS) {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.blur) {
                activeElement.blur();
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // iOS form submit haptic
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.formSubmit();
            } catch (error) {
                console.log('Form submit haptic failed:', error);
            }
        }

        setIsSubmitting(true);

        try {
            // Validate form
            if (!formData.subject.trim() || !formData.message.trim() || !formData.email.trim() || !formData.name.trim()) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Fill Fields Failed',
                    message: 'Please fill in all required fields.'
                });
                return;
            }

            if (!formData.category) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Category Failed',
                    message: 'Please select a category.'
                });
                return;
            }

            // Send support request
            const response = await apiPost('/api/support/contact', {
                ...formData,
                userTier: userSubscription?.tier || 'free',
                timestamp: new Date().toISOString()
            });

            const result = await response.json();

            if (!response.ok) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Support Request Failed',
                    message: result.error || 'Failed to send support request'
                });
                return;
            }

            // iOS success haptic and feedback
            if (isIOS) {
                try {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.success();
                } catch (error) {
                    console.log('Success haptic failed:', error);
                }
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

            // iOS error haptic and feedback
            if (isIOS) {
                try {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.error();

                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Support Request Failed',
                        message: error.message || 'Could not send your support request. Please try again.'
                    });
                } catch (dialogError) {
                    console.log('Native error dialog failed:', dialogError);
                    setError(error.message);
                }
            } else {
                setError(error.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle modal close
    const handleClose = async () => {
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.buttonTap();
            } catch (error) {
                console.log('Close haptic failed:', error);
            }
        }
        onClose();
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
                                    onClick={handleClose}
                                    className="text-gray-400 hover:text-gray-600 p-2"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </TouchEnhancedButton>
                        </div>
                        {userSubscription?.tier && (
                                <div className="mt-2">
                            <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${
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
                        {/* Error message for non-iOS */}
                        {!isIOS && error && (
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
                                <NativeTextInput
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        validation={ValidationPatterns.required}
                                        errorMessage="Your name is required"
                                        successMessage="Name entered"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address *
                                </label>
                                <NativeTextInput
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        validation={ValidationPatterns.email}
                                        errorMessage="Please enter a valid email address"
                                        successMessage="Email format is correct"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                                    Category *
                                </label>
                                {/* iOS uses action sheet, others use native select */}
                                {isIOS ? (
                                        <TouchEnhancedButton
                                                type="button"
                                                onClick={showCategoryActionSheet}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <span>{formData.category ? categoryOptions.find(opt => opt.value === formData.category)?.label : 'Select a category...'}</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </TouchEnhancedButton>
                                ) : (
                                        <NativeSelect
                                                id="category"
                                                name="category"
                                                value={formData.category}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Select a category..."
                                                options={categoryOptions}
                                                validation={ValidationPatterns.required}
                                                errorMessage="Please select a support category"
                                                successMessage="Category selected"
                                        />
                                )}
                            </div>

                            <div>
                                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                                    Priority
                                </label>
                                {/* iOS uses action sheet, others use native select */}
                                {isIOS ? (
                                        <TouchEnhancedButton
                                                type="button"
                                                onClick={showPriorityActionSheet}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <span>{getPriorityOptions().find(opt => opt.value === formData.priority)?.label}</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </TouchEnhancedButton>
                                ) : (
                                        <NativeSelect
                                                id="priority"
                                                name="priority"
                                                value={formData.priority}
                                                onChange={handleInputChange}
                                                options={getPriorityOptions()}
                                        />
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    {getPriorityOptions().find(opt => opt.value === formData.priority)?.description}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                                Subject *
                            </label>
                            <NativeTextInput
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                    placeholder="Brief description of your issue"
                                    required
                                    maxLength={200}
                                    validation={(value) => ({
                                        isValid: value && value.length >= 5 && value.length <= 200,
                                        message: value && value.length >= 5 && value.length <= 200
                                                ? 'Good subject line'
                                                : value && value.length < 5
                                                        ? 'Subject should be more descriptive'
                                                        : 'Subject too long (max 200 characters)'
                                    })}
                                    errorMessage="Please enter a descriptive subject (5-200 characters)"
                                    successMessage="Clear subject line"
                            />
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                                Message *
                            </label>
                            <NativeTextarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleInputChange}
                                    rows={6}
                                    placeholder="Please provide detailed information about your issue, including any error messages or steps to reproduce the problem..."
                                    required
                                    maxLength={2000}
                                    autoExpand={false}
                                    validation={(value) => ({
                                        isValid: value && value.length >= 20 && value.length <= 2000,
                                        message: value && value.length >= 20 && value.length <= 2000
                                                ? 'Detailed message provided'
                                                : value && value.length < 20
                                                        ? 'Please provide more details (at least 20 characters)'
                                                        : 'Message too long (max 2000 characters)'
                                    })}
                                    errorMessage="Please provide detailed information (20-2000 characters)"
                                    successMessage="Detailed message provided"
                            />
                            <div className="flex justify-between mt-1">
                                <p className="text-xs text-gray-500">
                                    Include as much detail as possible to help us assist you quickly.
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formData.message.length}/2000 characters
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <TouchEnhancedButton
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Sending...
                                        </>
                                ) : (
                                        'Send Support Request'
                                )}
                            </TouchEnhancedButton>
                        </div>
                    </form>
                </div>
            </div>
    );
};

export default ContactSupportModal;