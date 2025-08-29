'use client';
// file: /src/app/auth/forgot-password/page.js

import { useState } from 'react';
import Link from 'next/link';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiPost } from '@/lib/api-config';
import {
    NativeTextInput,
    ValidationPatterns
} from '@/components/forms/NativeIOSFormComponents';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Add iOS form submission haptic
        try {
            const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
            await MobileHaptics.formSubmit();
        } catch (error) {
            console.log('Form submit haptic failed:', error);
        }

        setLoading(true);
        setSuccess('');

        // Client-side validation
        const { NativeDialog } = await import('@/components/mobile/NativeDialog');

        if (!email) {
            await NativeDialog.showError({
                title: 'Email Required',
                message: 'Email is required'
            });
            setLoading(false);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            await NativeDialog.showError({
                title: 'Invalid Email',
                message: 'Please enter a valid email address'
            });
            setLoading(false);
            return;
        }

        try {
            const response = await apiPost('/api/auth/forgot-password', { email });

            const data = await response.json();

            if (response.ok) {
                await NativeDialog.showSuccess({
                    title: 'Reset Email Sent',
                    message: data.message
                });
                setSubmitted(true);
            } else {
                await NativeDialog.showError({
                    title: 'Reset Failed',
                    message: data.error || 'An error occurred'
                });
            }
        } catch (error) {
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Network error. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <MobileOptimizedLayout>
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl">📧</span>
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900">
                            Check your email
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            We've sent password reset instructions to <strong>{email}</strong>
                        </p>
                    </div>

                    {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                            {success}
                        </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">📋 Next Steps</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Check your email inbox (and spam folder)</li>
                            <li>• Click the reset link in the email</li>
                            <li>• The link will expire in 10 minutes</li>
                            <li>• Contact support if you don't receive the email</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <TouchEnhancedButton
                            onClick={() => {
                                setSubmitted(false);
                                setEmail('');
                                setSuccess('');
                            }}
                            className="w-full bg-indigo-600 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Send Another Reset Email
                        </TouchEnhancedButton>

                        <div className="text-center">
                            <Link
                                href="/auth/signin"
                                className="text-indigo-600 hover:text-indigo-500 text-sm"
                            >
                                ← Back to Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
                <Footer />

                </MobileOptimizedLayout>
        );
    }

    return (
        <MobileOptimizedLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        Forgot your password?
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        No worries! Enter your email and we'll send you reset instructions.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email Address
                        </label>
                        <NativeTextInput
                            id="email"
                            name="email"
                            type="email"
                            inputMode="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
                            autoComplete="email"
                            validation={ValidationPatterns.email}
                            errorMessage="Please enter a valid email address"
                            successMessage="Email looks good"
                            required
                        />
                    </div>

                    <div>
                        <TouchEnhancedButton
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                        >
                            {loading ? 'Sending Reset Email...' : 'Send Reset Email'}
                        </TouchEnhancedButton>
                    </div>

                    <div className="text-center">
                        <Link
                            href="/auth/signin"
                            className="text-indigo-600 hover:text-indigo-500"
                        >
                            Remember your password? Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
            <Footer />

            </MobileOptimizedLayout>
    );
}
