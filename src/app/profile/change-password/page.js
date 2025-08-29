'use client';
// file: /src/app/profile/change-password/page.js


import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiPost } from '@/lib/api-config';
import {
    NativeTextInput,
    ValidationPatterns
} from '@/components/forms/NativeIOSFormComponents';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export default function ChangePasswordPage() {
    let session = null;
    let status = 'loading';

    try {
        const sessionResult = useSafeSession();
        session = sessionResult?.data || null;
        status = sessionResult?.status || 'loading';
    } catch (error) {
        // Mobile build fallback
        session = null;
        status = 'unauthenticated';
    }

    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Password strength indicators
    const [passwordStrength, setPasswordStrength] = useState({
        score: 0,
        feedback: []
    });

    // Redirect if not authenticated
    useEffect(() => {
        const handleAuthCheck = async () => {
            if (status === 'loading') return;
            if (!session) {
                await NativeNavigation.routerPush(router, '/auth/signin');
            }
        };

        handleAuthCheck();
    }, [session, status, router]);

    // Check password strength
    useEffect(() => {
        if (formData.newPassword) {
            const strength = checkPasswordStrength(formData.newPassword);
            setPasswordStrength(strength);
        } else {
            setPasswordStrength({ score: 0, feedback: [] });
        }
    }, [formData.newPassword]);

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
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Missing Information',
                message: 'Please fill in all password fields'
            });
            setLoading(false);
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Passwords Don\'t Match',
                message: 'Please make sure both new password fields match'
            });
            setLoading(false);
            return;
        }

        if (formData.newPassword.length < 6) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Password Too Short',
                message: 'New password must be at least 6 characters long'
            });
            setLoading(false);
            return;
        }

        if (formData.newPassword === formData.currentPassword) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Password Not Changed',
                message: 'New password must be different from your current password'
            });
            setLoading(false);
            return;
        }

        try {
            const response = await apiPost('/api/user/change-password', formData);

            const data = await response.json();

            if (response.ok) {
                setSuccess('Password changed successfully!');
                setFormData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });

                // Redirect after success
                setTimeout(async () => {
                    await NativeNavigation.routerPush(router, '/profile');
                }, 2000);
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Password Change Failed',
                    message: data.error || 'Failed to change password. Please try again.'
                });
            }
        } catch (error) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Unable to change password. Please check your connection and try again.'
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

    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading dashboard...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <MobileOptimizedLayout>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        Change Password
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Keep your account secure with a strong password
                    </p>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    {error && (
                        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                                Current Password
                            </label>
                            <NativeTextInput
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                inputMode="text"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                placeholder="Enter your current password"
                                autoComplete="current-password"
                                validation={(value) => ({
                                    isValid: value && value.length > 0,
                                    message: value ? 'Current password entered' : ''
                                })}
                                errorMessage="Please enter your current password"
                                successMessage="Current password entered"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                                New Password
                            </label>
                            <NativeTextInput
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                inputMode="text"
                                value={formData.newPassword}
                                onChange={handleChange}
                                placeholder="Enter your new password"
                                autoComplete="new-password"
                                validation={(value) => {
                                    if (!value) return { isValid: false, message: '' };
                                    if (value.length < 6) return { isValid: false, message: 'At least 6 characters required' };
                                    if (value === formData.currentPassword) return { isValid: false, message: 'Must be different from current password' };
                                    return { isValid: true, message: 'New password looks good!' };
                                }}
                                errorMessage="Password must be at least 6 characters and different from current"
                                successMessage="New password looks good!"
                                required
                            />

                            {/* Password Strength Indicator */}
                            {formData.newPassword && (
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
                                    isValid: value && formData.newPassword && value === formData.newPassword,
                                    message: value && formData.newPassword && value === formData.newPassword
                                        ? 'Passwords match!'
                                        : value ? 'Passwords do not match' : ''
                                })}
                                errorMessage="Please confirm your new password"
                                successMessage="Passwords match!"
                                required
                            />

                            {/* Password Match Indicator */}
                            {formData.confirmPassword && (
                                <div className="mt-1">
                                    {formData.newPassword === formData.confirmPassword ? (
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

                        {/* Password Requirements */}
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">🔒 Password Requirements</h4>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li className="flex items-center">
                                    <span className={formData.newPassword.length >= 6 ? "text-green-600" : "text-gray-400"}>
                                        {formData.newPassword.length >= 6 ? "✓" : "○"}
                                    </span>
                                    <span className="ml-2">At least 6 characters</span>
                                </li>
                                <li className="flex items-center">
                                    <span className={formData.newPassword !== formData.currentPassword && formData.newPassword ? "text-green-600" : "text-gray-400"}>
                                        {formData.newPassword !== formData.currentPassword && formData.newPassword ? "✓" : "○"}
                                    </span>
                                    <span className="ml-2">Different from current password</span>
                                </li>
                                <li className="flex items-center">
                                    <span className={formData.newPassword === formData.confirmPassword && formData.newPassword ? "text-green-600" : "text-gray-400"}>
                                        {formData.newPassword === formData.confirmPassword && formData.newPassword ? "✓" : "○"}
                                    </span>
                                    <span className="ml-2">Passwords match</span>
                                </li>
                            </ul>
                        </div>

                        <div className="flex space-x-4">
                            <TouchEnhancedButton
                                type="button"
                                onClick={() => NativeNavigation.routerPush(router, '/profile')}
                                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                Cancel
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                type="submit"
                                disabled={loading || formData.newPassword !== formData.confirmPassword || formData.newPassword.length < 6}
                                className="flex-1 bg-indigo-600 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Changing Password...' : 'Change Password'}
                            </TouchEnhancedButton>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            href="/profile"
                            className="text-indigo-600 hover:text-indigo-500 text-sm"
                        >
                            ← Back to Profile
                        </Link>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
        </MobileOptimizedLayout>
    );
}