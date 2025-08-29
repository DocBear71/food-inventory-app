'use client';

// file: src/app/feedback/page.js v1 - Feedback form page

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useSubscription } from '@/hooks/useSubscription';
import {apiPost} from "@/lib/api-config.js";
import {
    NativeTextInput,
    NativeTextarea,
    ValidationPatterns
} from '@/components/forms/NativeIOSFormComponents';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export default function FeedbackPage() {
    const { data: session } = useSafeSession();
    const subscription = useSubscription();

    const [formData, setFormData] = useState({
        name: session?.user?.name || '',
        email: session?.user?.email || '',
        feedbackType: '',
        subject: '',
        message: '',
        rating: '',
        anonymous: false
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState('');

    const feedbackTypes = [
        { value: 'feature-request', label: '💡 Feature Request', description: 'Suggest new features or improvements' },
        { value: 'bug-report', label: '🐛 Bug Report', description: 'Report issues or problems you\'ve encountered' },
        { value: 'general-feedback', label: '💬 General Feedback', description: 'Share your thoughts and experiences' },
        { value: 'user-experience', label: '🎨 User Experience', description: 'Feedback about design and usability' },
        { value: 'performance', label: '⚡ Performance', description: 'Speed, loading, or responsiveness issues' },
        { value: 'recipe-feedback', label: '👨‍🍳 Recipe Feedback', description: 'Suggestions about recipes or cooking features' },
        { value: 'inventory-feedback', label: '📦 Inventory Features', description: 'Feedback about inventory management' },
        { value: 'other', label: '📝 Other', description: 'Anything else you\'d like to share' }
    ];

    const ratingOptions = [
        { value: '5', label: '⭐⭐⭐⭐⭐ Excellent', description: 'Love it!' },
        { value: '4', label: '⭐⭐⭐⭐ Good', description: 'Works well' },
        { value: '3', label: '⭐⭐⭐ Okay', description: 'It\'s fine' },
        { value: '2', label: '⭐⭐ Poor', description: 'Needs work' },
        { value: '1', label: '⭐ Very Poor', description: 'Major issues' }
    ];

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        ;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Add iOS form submission haptic
        try {
            const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
            await MobileHaptics.formSubmit();
        } catch (error) {
            console.log('Form submit haptic failed:', error);
        }

        setIsSubmitting(true);

        try {
            // Validate form
            if (!formData.feedbackType) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Feedback Type Required',
                    message: 'Please select what type of feedback you\'re sharing.'
                });
                setIsSubmitting(false);
                return;
            }

            if (!formData.subject.trim() || !formData.message.trim()) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Missing Information',
                    message: 'Please fill in both the subject and your detailed feedback.'
                });
                setIsSubmitting(false);
                return;
            }

            if (!formData.anonymous && (!formData.name.trim() || !formData.email.trim())) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Contact Information Required',
                    message: 'Please provide your name and email, or check "Submit anonymously" to proceed without contact info.'
                });
                setIsSubmitting(false);
                return;
            }

            // Send feedback
            const response = await apiPost('/api/feedback/submit', {
                    ...formData,
                    userTier: subscription?.tier || 'free',
                    userId: session?.user?.id || null,
                    timestamp: new Date().toISOString()
            });

            const result = await response.json();

            if (!response.ok) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Submission Failed',
                    message: result.error || 'Failed to submit feedback. Please try again.'
                });
                setIsSubmitting(false);
                return;
            }

            setShowSuccess(true);

            // Also show native success dialog
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showSuccess({
                title: 'Feedback Submitted!',
                message: 'Thank you for your feedback. We\'ll review it and get back to you if needed.'
            });

            // Reset form after success
            setTimeout(() => {
                setFormData({
                    name: session?.user?.name || '',
                    email: session?.user?.email || '',
                    feedbackType: '',
                    subject: '',
                    message: '',
                    rating: '',
                    anonymous: false
                });
                setShowSuccess(false);
            }, 5000);

        } catch (error) {
            console.error('Feedback submission error:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Unable to submit feedback. Please check your connection and try again.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showSuccess) {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h2>
                        <p className="text-gray-600 mb-6">
                            Your feedback has been submitted successfully. We really appreciate you taking the time to help us improve Doc Bear's Comfort Kitchen!
                        </p>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                            <p className="text-green-700 text-sm">
                                <strong>What happens next?</strong><br/>
                                Our team reviews all feedback carefully. If you've requested a response, we'll get back to you within 1-3 business days.
                            </p>
                        </div>
                        <TouchEnhancedButton
                            onClick={() => NativeNavigation.navigateTo({ path: '/account', router })}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            Return to Account
                        </TouchEnhancedButton>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Share Your Feedback</h1>
                        <p className="text-gray-600 text-lg">
                            Help us improve Doc Bear's Comfort Kitchen with your suggestions and ideas
                        </p>
                    </div>
                </div>

                {/* Feedback Form */}
                <div className="bg-white shadow rounded-lg p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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

                        {/* Anonymous Option */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="anonymous"
                                    checked={formData.anonymous}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-blue-700 font-medium">Submit feedback anonymously</span>
                            </label>
                            <p className="text-xs text-blue-600 mt-1">
                                Check this if you prefer not to provide your contact information
                            </p>
                        </div>

                        {/* Contact Information */}
                        {!formData.anonymous && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Your Name *
                                    </label>
                                    <NativeTextInput
                                        type="text"
                                        inputMode="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name"
                                        autoComplete="name"
                                        validation={(value) => ({
                                            isValid: !formData.anonymous ? (value && value.length >= 2) : true,
                                            message: value && value.length >= 2 ? 'Name looks good' : ''
                                        })}
                                        errorMessage="Please enter your full name (at least 2 characters)"
                                        successMessage="Name looks good"
                                        required={!formData.anonymous}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address *
                                    </label>
                                    <NativeTextInput
                                        type="email"
                                        inputMode="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Enter your email address"
                                        autoComplete="email"
                                        validation={ValidationPatterns.email}
                                        errorMessage="Please enter a valid email address"
                                        successMessage="Email looks good"
                                        required={!formData.anonymous}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        We'll only use this to respond to your feedback if needed
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Feedback Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                What type of feedback are you sharing? *
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {feedbackTypes.map(type => (
                                    <label key={type.value} className="relative">
                                        <input
                                            type="radio"
                                            name="feedbackType"
                                            value={type.value}
                                            checked={formData.feedbackType === type.value}
                                            onChange={handleInputChange}
                                            className="sr-only"
                                        />
                                        <div className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                            formData.feedbackType === type.value
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}>
                                            <div className="font-medium text-sm">{type.label}</div>
                                            <div className="text-xs text-gray-600 mt-1">{type.description}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Rating */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                How would you rate your overall experience? (Optional)
                            </label>
                            <div className="space-y-2">
                                {ratingOptions.map(rating => (
                                    <label key={rating.value} className="flex items-center">
                                        <input
                                            type="radio"
                                            name="rating"
                                            value={rating.value}
                                            checked={formData.rating === rating.value}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="ml-3 text-sm">
                                            <span className="font-medium">{rating.label}</span>
                                            <span className="text-gray-500 ml-2">{rating.description}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Subject */}
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                                Subject *
                            </label>
                            <NativeTextInput
                                type="text"
                                inputMode="text"
                                id="subject"
                                name="subject"
                                value={formData.subject}
                                onChange={handleInputChange}
                                placeholder="Brief summary of your feedback"
                                autoComplete="off"
                                validation={(value) => ({
                                    isValid: value && value.trim().length >= 3,
                                    message: value && value.trim().length >= 3 ? 'Subject looks good' : ''
                                })}
                                errorMessage="Please enter a subject (at least 3 characters)"
                                successMessage="Subject looks good"
                                required
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                                Your Feedback *
                            </label>
                            <NativeTextarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleInputChange}
                                placeholder="Please share your detailed feedback, suggestions, or ideas. The more specific you are, the better we can help!"
                                autoExpand={true}
                                maxLength={5000}
                                validation={(value) => ({
                                    isValid: value && value.trim().length >= 10,
                                    message: value && value.trim().length >= 10 ? 'Message looks good!' : ''
                                })}
                                errorMessage="Please enter at least 10 characters"
                                successMessage="Message looks good!"
                                required
                            />
                            <div className="flex justify-between mt-1">
                                <p className="text-xs text-gray-500">
                                    Be as detailed as possible to help us understand your perspective.
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formData.message.length} characters
                                </p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <TouchEnhancedButton
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                {isSubmitting ? 'Submitting Feedback...' : 'Submit Feedback'}
                            </TouchEnhancedButton>
                        </div>
                    </form>
                </div>

                {/* Additional Information */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Why Your Feedback Matters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                        <div className="flex items-start space-x-2">
                            <div className="text-green-500 mt-0.5">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <div className="font-medium">Shape Development</div>
                                <div>Your suggestions directly influence our feature roadmap and priorities.</div>
                            </div>
                        </div>

                        <div className="flex items-start space-x-2">
                            <div className="text-blue-500 mt-0.5">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <div className="font-medium">Improve Experience</div>
                                <div>Help us identify pain points and create a better user experience.</div>
                            </div>
                        </div>

                        <div className="flex items-start space-x-2">
                            <div className="text-purple-500 mt-0.5">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <div className="font-medium">Build Community</div>
                                <div>Join thousands of users helping create the perfect kitchen app.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}