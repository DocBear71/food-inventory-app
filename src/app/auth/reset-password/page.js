// file: /src/app/auth/reset-password/page.js v3 - WITH PASSWORD REQUIREMENTS DISPLAY

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import Footer from '@/components/legal/Footer';
import { getApiUrl } from '@/lib/api-config';

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

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });

    // Verify token on component mount
    useEffect(() => {
        if (token) {
            verifyToken();
        } else {
            setError('Invalid reset link');
            setVerifying(false);
        }
    }, [token]);

    const verifyToken = async () => {
        try {
            const response = await fetch(getApiUrl('/api/auth/verify-reset-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token }),
            }));

            const data = await response.json();

            if (response.ok) {
                setValidToken(true);
                setUserEmail(data.email);
            } else {
                setError(data.error || 'Invalid or expired reset token');
            }
        } catch (error) {
            setError('Network error. Please try again.');
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
        setLoading(true);
        setError('');
        setSuccess('');

        // Client-side validation
        if (!formData.password || !formData.confirmPassword) {
            setError('All fields are required');
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        // UPDATED: Strong password validation
        const passwordErrors = validatePassword(formData.password);
        if (passwordErrors.length > 0) {
            setError(`Password must contain ${passwordErrors.join(', ')}`);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(getApiUrl('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword
                }),
            }));

            const data = await response.json();

            if (response.ok) {
                setSuccess(data.message);
                setTimeout(() => {
                    router.push('/auth/signin');
                }, 3000);
            } else {
                setError(data.error || 'Failed to reset password');
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

    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Verifying reset token...</p>
                </div>
            </div>
        );
    }

    if (!validToken) {
        return (
            <div className="flex items-start justify-center bg-gray-50 py-4 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '3rem', paddingBottom: '2rem' }}>
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
                            onClick={() => router.push('/auth/forgot-password')}
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
        );
    }

    if (success) {
        return (
            <div className="flex items-start justify-center bg-gray-50 py-4 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '3rem', paddingBottom: '2rem' }}>
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
        );
    }

    // Get current password requirements status
    const passwordReqs = getPasswordRequirements(formData.password);
    const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
    const passwordsDontMatch = formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword;

    return (
        <div className="flex items-start justify-center bg-gray-50 py-4 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '3rem', paddingBottom: '2rem' }}>
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
                        {error}
                    </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            New Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Create a secure password"
                        />
                    </div>

                    {/* Password Requirements Display */}
                    {formData.password && (
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
            <Footer />
        </div>

    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}