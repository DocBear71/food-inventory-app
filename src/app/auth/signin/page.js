'use client';
// file: /src/app/auth/signin/page.js v7 - FIXED: NextAuth URL parsing error and improved callback handling

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import Footer from '@/components/legal/Footer';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import { apiGet, apiPost } from '@/lib/api-config';
import {
    NativeTextInput,
    ValidationPatterns
} from '@/components/forms/NativeIOSFormComponents';
import { PlatformDetection } from "@/utils/PlatformDetection.js";

function SignInContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [redirecting, setRedirecting] = useState(false);
    const [showResendVerification, setShowResendVerification] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        // Handle URL parameters for messages and errors
        const urlError = searchParams.get('error');
        const urlMessage = searchParams.get('message');

        const handleUrlErrorsAndMessages = async () => {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');

            if (urlError) {
                switch (urlError) {
                    case 'missing-token':
                        await NativeDialog.showError({
                            title: 'Missing Token',
                            message: 'No verification token provided. Please check your email for the verification link.'
                        });
                        break;
                    case 'invalid-token':
                        await NativeDialog.showError({
                            title: 'Invalid Token',
                            message: 'Invalid or expired verification token. Please request a new verification email.'
                        });
                        setShowResendVerification(true);
                        break;
                    case 'verification-failed':
                        await NativeDialog.showError({
                            title: 'Verification Failed',
                            message: 'Email verification failed. Please try again or request a new verification email.'
                        });
                        setShowResendVerification(true);
                        break;
                    case 'email-not-verified':
                        await NativeDialog.showError({
                            title: 'Email Not Verified',
                            message: 'Please verify your email address before signing in.'
                        });
                        setShowResendVerification(true);
                        break;
                    case 'CredentialsSignin':
                        await NativeDialog.showError({
                            title: 'Sign In Failed',
                            message: 'Invalid email or password. Please try again.'
                        });
                        break;
                    default:
                        await NativeDialog.showError({
                            title: 'Error',
                            message: 'An error occurred. Please try again.'
                        });
                }
            }

            if (urlMessage) {
                switch (urlMessage) {
                    case 'email-verified':
                        await NativeDialog.showSuccess({
                            title: 'Email Verified',
                            message: 'Email verified successfully! You can now sign in to your account.'
                        });
                        break;
                    case 'already-verified':
                        await NativeDialog.showSuccess({
                            title: 'Already Verified',
                            message: 'Your email is already verified. You can sign in below.'
                        });
                        break;
                    default:
                        await NativeDialog.showAlert({
                            title: 'Message',
                            message: urlMessage
                        });
                }
            }
        };

        if (urlError || urlMessage) {
            handleUrlErrorsAndMessages();
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // iOS-specific form validation
        if (PlatformDetection.isIOS()) {
            // Force iOS to complete any pending input
            const activeElement = document.activeElement;
            if (activeElement && activeElement.blur) {
                activeElement.blur();
            }

            // Wait for iOS to process input changes
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 🍎 Native iOS form submit haptic
        try {
            const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
            await MobileHaptics.formSubmit();
        } catch (error) {
            console.log('Form submit haptic failed:', error);
        }

        // Basic validation
        if (!formData.email || !formData.password) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Missing Credentials',
                message: 'Please enter both email and password.'
            });

            // Error haptic feedback
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.error();
            } catch (error) {
                console.log('Error haptic failed:', error);
            }

            setLoading(false);
            return;
        }

        try {
            console.log('Attempting sign in with:', { email: formData.email });

            const result = await signIn('credentials', {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            console.log('Sign in result:', result);

            if (result?.error) {
                // 🍎 Error haptic feedback
                try {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.error();
                } catch (error) {
                    console.log('Error haptic failed:', error);
                }

                if (result.error === 'CredentialsSignin') {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Sign In Failed',
                        message: 'Invalid email or password. Please try again.'
                    });
                } else if (result.error === 'email-not-verified') {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showVerificationRequired({
                        email: formData.email,
                        onResend: async () => {
                            await handleResendVerificationFromSignIn();
                        }
                    });
                } else {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Sign In Failed',
                        message: 'Sign in failed. Please try again.'
                    });
                }
            } else if (result?.ok) {
                // 🍎 Success haptic feedback
                try {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.success();
                } catch (error) {
                    console.log('Success haptic failed:', error);
                }

                console.log('Sign in successful, redirecting...');
                setRedirecting(true);

                // Determine redirect URL
                const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
                const cleanCallbackUrl = callbackUrl.startsWith('/') ? callbackUrl : '/dashboard';

                // Redirect after short delay for user feedback
                setTimeout(() => {
                    router.push(cleanCallbackUrl);
                }, 500);
            }
        } catch (error) {
            console.error('Sign in error:', error);

            // 🍎 Error haptic feedback
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.error();
            } catch (error) {
                console.log('Error haptic failed:', error);
            }

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Network error. Please check your connection and try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerificationFromSignIn = async () => {
        if (resendLoading) return;

        setResendLoading(true);

        try {
            const response = await apiPost('/api/auth/resend-verification', {
                email: unverifiedEmail
            });

            const data = await response.json();

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            if (response.ok) {
                await NativeDialog.showSuccess({
                    title: 'Verification Email Sent',
                    message: 'Verification email sent! Please check your inbox and spam folder, then try signing in again.'
                });
                setShowResendVerification(false);
            } else {
                await NativeDialog.showError({
                    title: 'Resend Failed',
                    message: data.error || 'Failed to resend verification email'
                });
            }
        } catch (error) {
            console.error('Resend verification error:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Network error. Please try again.'
            });
        } finally {
            setResendLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setResendLoading(true);
        setSuccess('');

        // 🍎 Native iOS action haptic
        try {
            const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
            await MobileHaptics.buttonTap();
        } catch (error) {
            console.log('Button haptic failed:', error);
        }

        try {
            const response = await apiPost('/api/auth/resend-verification', {
                email: unverifiedEmail || formData.email
            });

            const data = await response.json();

            if (data.success) {
                // 🍎 Success haptic feedback
                try {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.success();
                } catch (error) {
                    console.log('Success haptic failed:', error);
                }

                setSuccess('Verification email sent! Please check your inbox.');
                setShowResendVerification(false);
            } else {
                // 🍎 Error haptic feedback
                try {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.error();
                } catch (error) {
                    console.log('Error haptic failed:', error);
                }

                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Send Failed',
                    message: data.error || 'Failed to send verification email.'
                });
            }
        } catch (error) {
            console.error('Resend verification error:', error);

            // 🍎 Error haptic feedback
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.error();
            } catch (error) {
                console.log('Error haptic failed:', error);
            }

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Network error. Please try again.'
            });
        } finally {
            setResendLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <MobileOptimizedLayout>
            <div className="flex items-start justify-center bg-gray-50 py-4 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '3rem', paddingBottom: '2rem' }}>
                <div className="max-w-md w-full space-y-4">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-gray-900">
                            Sign in to Doc Bear's Comfort Kitchen
                        </h2>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                {error}
                                {showResendVerification && (
                                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                        <div className="flex items-center mb-2">
                                            <span className="text-orange-600 mr-2">⚠️</span>
                                            <span className="text-sm font-medium text-orange-800">Email Not Verified</span>
                                        </div>
                                        <p className="text-sm text-orange-700 mb-3">
                                            We sent a verification email to <strong>{unverifiedEmail}</strong>.
                                            Please check your inbox and spam folder.
                                        </p>
                                        <TouchEnhancedButton
                                            onClick={handleResendVerificationFromSignIn}
                                            disabled={resendLoading}
                                            className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
                                        >
                                            {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                                        </TouchEnhancedButton>
                                    </div>
                                )}
                            </div>
                        )}

                        {message && (
                            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                {message}
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                {success}
                            </div>
                        )}

                        {redirecting && (
                            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                Login successful! Redirecting to dashboard...
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email address
                                </label>
                                <NativeTextInput
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    placeholder="Enter your email address"
                                    value={formData.email}
                                    onChange={handleChange}
                                    validation={ValidationPatterns.email}
                                    errorMessage="Please enter a valid email address"
                                    successMessage="Email format is correct"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <NativeTextInput
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    validation={(value) => ({
                                        isValid: value.length >= 1,
                                        message: value.length >= 1 ? '' : 'Password is required'
                                    })}
                                    errorMessage="Password is required"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="text-sm">
                                <Link
                                    href="/auth/forgot-password"
                                    className="font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    Forgot your password?
                                </Link>
                            </div>

                            <div className="text-sm">
                                <Link
                                    href="/auth/verify-email"
                                    className="font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    Resend verification
                                </Link>
                            </div>
                        </div>

                        <div>
                            <TouchEnhancedButton
                                type="submit"
                                disabled={loading || redirecting}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                            >
                                {loading ? 'Signing in...' : redirecting ? 'Redirecting...' : 'Sign in'}
                            </TouchEnhancedButton>
                        </div>

                        <div className="text-center">
                            <Link
                                href="/auth/signup"
                                className="text-indigo-600 hover:text-indigo-500"
                            >
                                Don't have an account? Sign up
                            </Link>
                        </div>
                    </form>

                    {/* Email Verification Help Section */}
                    {showResendVerification && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-blue-900 mb-2">
                                📧 Email Verification Required
                            </h3>
                            <p className="text-sm text-blue-800 mb-3">
                                You need to verify your email address before signing in. Check your inbox for a verification email.
                            </p>
                            <div className="space-y-2">
                                <p className="text-xs text-blue-700">
                                    • Check your spam/junk folder if you don't see the email
                                </p>
                                <p className="text-xs text-blue-700">
                                    • Verification links expire after 24 hours
                                </p>
                                <p className="text-xs text-blue-700">
                                    • Enter your email above and click "Resend verification email" if needed
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </MobileOptimizedLayout>
    );
}

export default function SignIn() {
    return (
        <Suspense fallback={
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        }>
            <SignInContent />
        </Suspense>
    );
}