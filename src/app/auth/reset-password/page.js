'use client';
// file: /src/app/auth/reset-password/page.js v4 - FIXED LAYOUT AND NETWORK ERROR

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import Footer from '@/components/legal/Footer';
import { apiPost } from '@/lib/api-config';
import {
    NativeTextInput,
    ValidationPatterns
} from '@/components/forms/NativeIOSFormComponents';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [validToken, setValidToken] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [passwordFocused, setPasswordFocused] = useState(false);

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });

    // Verify token on component mount
    useEffect(() => {
        const handleTokenVerification = async () => {
            if (token) {
                verifyToken();
            } else {
                const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Invalid Link',
                    message: 'Invalid reset link'
                });
                setVerifying(false);
            }
        };

        handleTokenVerification();
    }, [token]);

    const verifyToken = async () => {
        try {
            console.log('🔍 Verifying reset token:', token);

            const response = await apiPost('/api/auth/verify-reset-token', { token });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Token verification failed:', response.status, errorText);
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Verification Failed',
                    message: `Server returned ${response.status}`
                });
                return;
            }

            const data = await response.json();

            if (data.success !== false) {
                setValidToken(true);
                setUserEmail(data.email);
                console.log('✅ Token verified for email:', data.email);
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Invalid Reset Link',
                    message: data.error || 'This reset link is invalid or has expired. Please request a new one.'
                });
            }
        } catch (error) {
            console.error('❌ Password reset error:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Unable to reset password. Please check your connection and try again.'
            });
        } finally {
            setVerifying(false);
        }
    };

    // UPDATED: Strong password validation function
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

        // Add iOS form submission haptic
        try {
            const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
            await MobileHaptics.formSubmit();
        } catch (error) {
            console.log('Form submit haptic failed:', error);
        }

        setLoading(true);
        setSuccess('');

        if (!formData.password || !formData.confirmPassword) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Missing Information',
                message: 'Please fill in both password fields'
            });
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Passwords Don\'t Match',
                message: 'Please make sure both password fields match'
            });
            setLoading(false);
            return;
        }

// UPDATED: Strong password validation
        const passwordErrors = validatePassword(formData.password);
        if (passwordErrors.length > 0) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Weak Password',
                message: `Password must contain ${passwordErrors.join(', ')}`
            });
            setLoading(false);
            return;
        }

        try {
            console.log('🔄 Resetting password for token:', token);

            const response = await apiPost('/api/auth/reset-password', {
                token,
                password: formData.password,
                confirmPassword: formData.confirmPassword
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Password reset failed:', response.status, errorText);
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Password Reset Failed',
                    message: `Server returned ${response.status}`
                });
                return;
            }

            const data = await response.json();

            if (data.success !== false) {
                setSuccess(data.message || 'Password reset successfully!');
                console.log('✅ Password reset successful');
                setTimeout( () => {
                    NativeNavigation.routerPush(router, '/auth/signin');
                }, 3000);
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Reset Failed',
                    message: data.error || 'Failed to reset password. Please try again.'
                });
            }
        } catch (error) {
            console.error('❌ Password reset error:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Unable to reset password. Please check your connection and try again.'
            });
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

    if (verifying) {
        return (
            <>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Verifying reset token...</p>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    if (!validToken) {
        return (
            <>
                <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '3rem', paddingBottom: '2rem' }}>
                    <div className="flex items-start justify-center">
                        <div className="max-w-md w-full space-y-6">
                            <div className="text-center">
                                <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <span className="text-2xl">❌</span>
                                </div>
                                <h2 className="text-3xl font-extrabold text-gray-900">
                                    Invalid Reset Link
                                </h2>
                                <p className="mt-2 text-sm text-gray-600">
                                    This password reset link is invalid or has expired.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <TouchEnhancedButton
                                    onClick={() => NativeNavigation.routerPush(router, '/auth/forgot-password')}
                                    className="w-full bg-indigo-600 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Request New Reset Link
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
                </div>
                <Footer />
            </>
        );
    }

    if (success) {
        return (
            <>
                <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '3rem', paddingBottom: '2rem' }}>
                    <div className="flex items-start justify-center">
                        <div className="max-w-md w-full space-y-6">
                            <div className="text-center">
                                <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <span className="text-2xl">✅</span>
                                </div>
                                <h2 className="text-3xl font-extrabold text-gray-900">
                                    Password Reset Successfully
                                </h2>
                                <p className="mt-2 text-sm text-gray-600">
                                    Your password has been updated. You will be redirected to sign in.
                                </p>
                            </div>

                            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                {success}
                            </div>

                            <div className="text-center">
                                <Link
                                    href="/auth/signin"
                                    className="text-indigo-600 hover:text-indigo-500 text-sm"
                                >
                                    Continue to Sign In →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    // Get current password requirements status
    const passwordReqs = getPasswordRequirements(formData.password);
    const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
    const passwordsDontMatch = formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword;

    return (
        <>
            <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '3rem', paddingBottom: '2rem' }}>
                <div className="flex items-start justify-center">
                    <div className="max-w-md w-full space-y-6">
                        <div className="text-center">
                            <h2 className="text-3xl font-extrabold text-gray-900">
                                Reset Your Password
                            </h2>
                            <p className="mt-2 text-sm text-gray-600">
                                Enter a new password for <strong>{userEmail}</strong>
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                <div className="font-medium">Error:</div>
                                <div>{error}</div>
                                {error.includes('Network error') && (
                                    <div className="mt-2 text-sm">
                                        <strong>Troubleshooting:</strong>
                                        <ul className="list-disc list-inside mt-1">
                                            <li>Check your internet connection</li>
                                            <li>Try refreshing the page</li>
                                            <li>Request a new reset link if this one has expired</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    New Password
                                </label>
                                <NativeTextInput
                                    id="password"
                                    name="password"
                                    type="password"
                                    inputMode="text"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onFocus={() => setPasswordFocused(true)}
                                    onBlur={() => setPasswordFocused(false)}
                                    placeholder="Create a secure password"
                                    autoComplete="new-password"
                                    validation={(value) => {
                                        const passwordReqs = getPasswordRequirements(value);
                                        const isValid = Object.values(passwordReqs).every(req => req);
                                        return {
                                            isValid: isValid,
                                            message: isValid ? 'Strong password!' : 'Password requirements not met'
                                        };
                                    }}
                                    errorMessage="Password must meet all requirements"
                                    successMessage="Strong password!"
                                    required
                                />
                            </div>

                            {/* Password Requirements Display */}
                            {(passwordFocused || formData.password) && (
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
                                <NativeTextInput
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    inputMode="text"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm your new password"
                                    autoComplete="new-password"
                                    validation={(value) => ({
                                        isValid: value && formData.password && value === formData.password,
                                        message: value && formData.password && value === formData.password
                                            ? 'Passwords match!'
                                            : value ? 'Passwords do not match' : ''
                                    })}
                                    errorMessage="Passwords must match"
                                    successMessage="Passwords match!"
                                    required
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
                                    {loading ? 'Resetting Password...' : 'Reset Password'}
                                </TouchEnhancedButton>
                            </div>

                            <div className="text-center">
                                <Link
                                    href="/auth/signin"
                                    className="text-indigo-600 hover:text-indigo-500 text-sm"
                                >
                                    ← Back to Sign In
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
                </div>
                <Footer />
            </>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}