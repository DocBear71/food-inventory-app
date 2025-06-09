
// file: /src/app/auth/reset-password/page.js

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

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

    // Password strength indicators
    const [passwordStrength, setPasswordStrength] = useState({
        score: 0,
        feedback: []
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

    // Check password strength
    useEffect(() => {
        if (formData.password) {
            const strength = checkPasswordStrength(formData.password);
            setPasswordStrength(strength);
        } else {
            setPasswordStrength({ score: 0, feedback: [] });
        }
    }, [formData.password]);

    const verifyToken = async () => {
        try {
            const response = await fetch('/api/auth/verify-reset-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token }),
            });

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

    const checkPasswordStrength = (password) => {
        let score = 0;
        const feedback = [];

        if (password.length >= 8) {
            score += 1;
        } else {
            feedback.push('At least 8 characters');
        }

        if (/[a-z]/.test(password)) {
            score += 1;
        } else {
            feedback.push('Include lowercase letters');
        }

        if (/[A-Z]/.test(password)) {
            score += 1;
        } else {
            feedback.push('Include uppercase letters');
        }

        if (/[0-9]/.test(password)) {
            score += 1;
        } else {
            feedback.push('Include numbers');
        }

        if (/[^A-Za-z0-9]/.test(password)) {
            score += 1;
        } else {
            feedback.push('Include special characters');
        }

        return { score, feedback };
    };

    const getStrengthColor = (score) => {
        if (score <= 1) return 'bg-red-500';
        if (score <= 2) return 'bg-yellow-500';
        if (score <= 3) return 'bg-blue-500';
        if (score <= 4) return 'bg-green-500';
        return 'bg-green-600';
    };

    const getStrengthText = (score) => {
        if (score <= 1) return 'Very Weak';
        if (score <= 2) return 'Weak';
        if (score <= 3) return 'Fair';
        if (score <= 4) return 'Good';
        return 'Strong';
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

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword
                }),
            });

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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
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

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                            placeholder="Enter your new password"
                        />

                        {/* Password Strength Indicator */}
                        {formData.password && (
                            <div className="mt-2">
                                <div className="flex items-center space-x-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
                                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className={`text-xs font-medium ${
                                        passwordStrength.score <= 2 ? 'text-red-600' :
                                            passwordStrength.score <= 3 ? 'text-yellow-600' :
                                                'text-green-600'
                                    }`}>
                                        {getStrengthText(passwordStrength.score)}
                                    </span>
                                </div>

                                {passwordStrength.feedback.length > 0 && (
                                    <div className="mt-1">
                                        <p className="text-xs text-gray-600 mb-1">To improve strength:</p>
                                        <ul className="text-xs text-gray-500 space-y-1">
                                            {passwordStrength.feedback.map((item, index) => (
                                                <li key={index} className="flex items-center">
                                                    <span className="text-red-400 mr-1">•</span>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

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
                            <div className="mt-1">
                                {formData.password === formData.confirmPassword ? (
                                    <p className="text-xs text-green-600 flex items-center">
                                        <span className="mr-1">✓</span>
                                        Passwords match
                                    </p>
                                ) : (
                                    <p className="text-xs text-red-600 flex items-center">
                                        <span className="mr-1">✗</span>
                                        Passwords do not match
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <TouchEnhancedButton
                            type="submit"
                            disabled={loading || formData.password !== formData.confirmPassword || formData.password.length < 6}
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