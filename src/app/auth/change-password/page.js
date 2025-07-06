'use client';
// file: /src/app/auth/change-password/page.js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSafeSession } from '@/hooks/useSafeSession';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiPost } from '@/lib/api-config';

export default function ChangePasswordPage() {
    const { data: session, status } = useSafeSession();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [passwordFocused, setPasswordFocused] = useState(false);

    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    // Show loading while checking authentication
    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    // Don't render if no session
    if (!session) {
        return null;
    }

    // Strong password validation function
    const validatePassword = (password) => {
        const errors = [];

        if (password.length < 8) {
            errors.push('at least 8 characters');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('one lowercase letter');
        }

        if (!/[0-9]/.test(password)) {
            errors.push('one number');
        }

        if (!/[!@#$%^&*]/.test(password)) {
            errors.push('one special character (!@#$%^&*)');
        }

        return errors;
    };

    // Check individual password requirements
    const getPasswordRequirements = (password) => {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*]/.test(password)
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Client-side validation
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            setError('All fields are required');
            setLoading(false);
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('New passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.currentPassword === formData.newPassword) {
            setError('New password must be different from your current password');
            setLoading(false);
            return;
        }

        // Strong password validation
        const passwordErrors = validatePassword(formData.newPassword);
        if (passwordErrors.length > 0) {
            setError(`New password must contain ${passwordErrors.join(', ')}`);
            setLoading(false);
            return;
        }

        try {
            const response = await apiPost('/api/auth/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
                confirmPassword: formData.confirmPassword
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(data.message);
                // Clear the form
                setFormData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
                // Redirect to account page after 3 seconds
                setTimeout(() => {
                    router.push('/account');
                }, 3000);
            } else {
                setError(data.error || 'Failed to change password');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    // Get current password requirements status
    const passwordReqs = getPasswordRequirements(formData.newPassword);
    const passwordsMatch = formData.newPassword && formData.confirmPassword && formData.newPassword === formData.confirmPassword;
    const passwordsDontMatch = formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword;

    if (success) {
        return (
            <MobileOptimizedLayout>
                <div className="flex items-start justify-center bg-gray-50 py-4 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '3rem', paddingBottom: '2rem' }}>
                    <div className="max-w-md w-full space-y-6">
                        <div className="text-center">
                            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-2xl">✅</span>
                            </div>
                            <h2 className="text-3xl font-extrabold text-gray-900">
                                Password Changed Successfully
                            </h2>
                            <p className="mt-2 text-sm text-gray-600">
                                Your password has been updated successfully.
                            </p>
                        </div>

                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                            {success}
                        </div>

                        <div className="text-center">
                            <Link
                                href="/account"
                                className="text-indigo-600 hover:text-indigo-500 text-sm"
                            >
                                Return to Account Settings →
                            </Link>
                        </div>
                    </div>
                    <Footer />
                </div>
            </MobileOptimizedLayout>
        );
    }

    return (
        <MobileOptimizedLayout>
            <div className="flex items-start justify-center bg-gray-50 py-4 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '3rem', paddingBottom: '2rem' }}>
                <div className="max-w-md w-full space-y-6">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-gray-900">
                            Change Password
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Update your password for <strong>{session.user?.email}</strong>
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                                Current Password
                            </label>
                            <input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                required
                                value={formData.currentPassword}
                                onChange={handleChange}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Enter your current password"
                            />
                        </div>

                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                                New Password
                            </label>
                            <input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                required
                                value={formData.newPassword}
                                onChange={handleChange}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Create a new secure password"
                            />
                        </div>

                        {/* Password Requirements Display */}
                        {(passwordFocused || formData.newPassword) && (
                            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h4>
                                <div className="space-y-1">
                                    <div className="flex items-center text-xs">
                                        <span className={`mr-2 ${passwordReqs.length ? 'text-green-600' : 'text-red-600'}`}>
                                            {passwordReqs.length ? '✓' : '✗'}
                                        </span>
                                        <span className={passwordReqs.length ? 'text-green-700' : 'text-gray-600'}>
                                            At least 8 characters
                                        </span>
                                    </div>
                                    <div className="flex items-center text-xs">
                                        <span className={`mr-2 ${passwordReqs.uppercase ? 'text-green-600' : 'text-red-600'}`}>
                                            {passwordReqs.uppercase ? '✓' : '✗'}
                                        </span>
                                        <span className={passwordReqs.uppercase ? 'text-green-700' : 'text-gray-600'}>
                                            One uppercase letter (A-Z)
                                        </span>
                                    </div>
                                    <div className="flex items-center text-xs">
                                        <span className={`mr-2 ${passwordReqs.lowercase ? 'text-green-600' : 'text-red-600'}`}>
                                            {passwordReqs.lowercase ? '✓' : '✗'}
                                        </span>
                                        <span className={passwordReqs.lowercase ? 'text-green-700' : 'text-gray-600'}>
                                            One lowercase letter (a-z)
                                        </span>
                                    </div>
                                    <div className="flex items-center text-xs">
                                        <span className={`mr-2 ${passwordReqs.number ? 'text-green-600' : 'text-red-600'}`}>
                                            {passwordReqs.number ? '✓' : '✗'}
                                        </span>
                                        <span className={passwordReqs.number ? 'text-green-700' : 'text-gray-600'}>
                                            One number (0-9)
                                        </span>
                                    </div>
                                    <div className="flex items-center text-xs">
                                        <span className={`mr-2 ${passwordReqs.special ? 'text-green-600' : 'text-red-600'}`}>
                                            {passwordReqs.special ? '✓' : '✗'}
                                        </span>
                                        <span className={passwordReqs.special ? 'text-green-700' : 'text-gray-600'}>
                                            One special character (!@#$%^&*)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirm New Password
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Confirm your new password"
                            />

                            {/* Password Match Indicator */}
                            {formData.confirmPassword && (
                                <div className="mt-2">
                                    {passwordsMatch ? (
                                        <div className="flex items-center text-xs text-green-600">
                                            <span className="mr-2">✓</span>
                                            <span>Passwords match</span>
                                        </div>
                                    ) : passwordsDontMatch ? (
                                        <div className="flex items-center text-xs text-red-600">
                                            <span className="mr-2">✗</span>
                                            <span>Passwords do not match</span>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>

                        <div>
                            <TouchEnhancedButton
                                type="submit"
                                disabled={loading || !passwordsMatch || Object.values(passwordReqs).some(req => !req)}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Changing Password...' : 'Change Password'}
                            </TouchEnhancedButton>
                        </div>

                        <div className="text-center space-y-2">
                            <Link
                                href="/account"
                                className="block text-indigo-600 hover:text-indigo-500 text-sm"
                            >
                                ← Back to Account Settings
                            </Link>
                            <div className="text-xs text-gray-500">
                                Forgot your current password?{' '}
                                <Link href="/auth/forgot-password" className="text-indigo-600 hover:text-indigo-500">
                                    Reset it here
                                </Link>
                            </div>
                        </div>
                    </form>
                </div>
                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}