'use client';
// file: /src/app/auth/signin/page.js v4 - Fixed native platform detection and redirect

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import Footer from '@/components/legal/Footer';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import { getApiUrl } from '@/lib/api-config';
import { MobileSession } from '@/lib/mobile-session-simple';

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

    useEffect(() => {
        // Handle URL parameters for messages and errors
        const urlError = searchParams.get('error');
        const urlMessage = searchParams.get('message');

        if (urlError) {
            switch (urlError) {
                case 'missing-token':
                    setError('No verification token provided. Please check your email for the verification link.');
                    break;
                case 'invalid-token':
                    setError('Invalid or expired verification token. Please request a new verification email.');
                    setShowResendVerification(true);
                    break;
                case 'verification-failed':
                    setError('Email verification failed. Please try again or request a new verification email.');
                    setShowResendVerification(true);
                    break;
                case 'email-not-verified':
                    setError('Please verify your email address before signing in.');
                    setShowResendVerification(true);
                    break;
                case 'CredentialsSignin':
                    setError('Invalid email or password. Please try again.');
                    break;
                default:
                    setError('An error occurred. Please try again.');
            }
        }

        if (urlMessage) {
            switch (urlMessage) {
                case 'email-verified':
                    setMessage('Email verified successfully! You can now sign in to your account.');
                    break;
                case 'already-verified':
                    setMessage('Your email is already verified. You can sign in below.');
                    break;
                default:
                    setMessage(urlMessage);
            }
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        setShowResendVerification(false);

        // Enhanced platform detection
        let isNative = false;
        let isAndroid = false;
        let deviceInfo = {};

        try {
            const { Capacitor } = await import('@capacitor/core');
            isNative = Capacitor.isNativePlatform();

            if (isNative) {
                const { Device } = await import('@capacitor/device');
                deviceInfo = await Device.getInfo();
                isAndroid = deviceInfo.platform === 'android';
            }
        } catch (e) {
            isNative = false;
            isAndroid = false;
        }

        console.log('=== ENHANCED LOGIN ATTEMPT ===');
        console.log('Platform Info:', { isNative, isAndroid, deviceInfo });
        console.log('Email:', formData.email);

        try {
            const result = await signIn('credentials', {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            console.log('SignIn result:', result);

            if (result?.error) {
                console.log('Login failed with error:', result.error);
                if (result.error === 'email-not-verified') {
                    setError('Please verify your email address before signing in.');
                    setShowResendVerification(true);
                } else if (result.error === 'CredentialsSignin') {
                    setError('Invalid email or password. Please try again.');
                } else {
                    setError('Sign in failed. Please try again.');
                }
            } else if (result?.ok) {
                console.log('Login successful, establishing session...');
                setRedirecting(true);

                // Enhanced session establishment with multiple strategies
                const maxRetries = isAndroid ? 10 : 5; // More retries for Android
                let sessionEstablished = false;

                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    console.log(`Session establishment attempt ${attempt}/${maxRetries}`);

                    // Progressive delay, longer for Android
                    const delay = isAndroid ? attempt * 1500 : attempt * 500;
                    await new Promise(resolve => setTimeout(resolve, delay));

                    try {
                        const { getSession } = await import('next-auth/react');
                        const session = await getSession();

                        if (session?.user) {
                            console.log('✅ NextAuth session confirmed:', session.user.email);

                            // AGGRESSIVE session storage for Android
                            if (isAndroid) {
                                console.log('🤖 Implementing aggressive Android session storage...');

                                const sessionData = {
                                    user: session.user,
                                    expires: session.expires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                                    timestamp: Date.now(),
                                    platform: 'android',
                                    deviceInfo: deviceInfo,
                                    attempt: attempt
                                };

                                // Strategy 1: Mobile session storage
                                try {
                                    const success = await MobileSession.setSession(sessionData);
                                    console.log('📱 MobileSession result:', success);
                                } catch (e) {
                                    console.error('📱 MobileSession failed:', e);
                                }

                                // Strategy 2: Multiple localStorage keys
                                try {
                                    localStorage.setItem('android-auth-session', JSON.stringify(sessionData));
                                    localStorage.setItem('android-session-backup', JSON.stringify(sessionData));
                                    localStorage.setItem('auth-session-backup', JSON.stringify(sessionData));
                                    localStorage.setItem('android-last-login', Date.now().toString());
                                    localStorage.setItem('android-user-email', session.user.email);
                                    localStorage.setItem('session-established', 'true');
                                    console.log('💾 Multiple localStorage backups created');
                                } catch (e) {
                                    console.error('💾 localStorage failed:', e);
                                }

                                // Strategy 3: SessionStorage
                                try {
                                    sessionStorage.setItem('android-active-session', JSON.stringify(sessionData));
                                    sessionStorage.setItem('current-user', session.user.email);
                                    console.log('🗂️ SessionStorage backups created');
                                } catch (e) {
                                    console.error('🗂️ SessionStorage failed:', e);
                                }

                                // Strategy 4: Force another session refresh
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                const verifySession = await getSession();
                                console.log('🔄 Session verification:', !!verifySession);
                            } else {
                                // Standard session storage for non-Android
                                try {
                                    const sessionData = {
                                        user: session.user,
                                        expires: session.expires,
                                        timestamp: Date.now(),
                                        platform: 'web'
                                    };
                                    await MobileSession.setSession(sessionData);
                                    localStorage.setItem('auth-session-backup', JSON.stringify(sessionData));
                                } catch (e) {
                                    console.error('Standard session storage failed:', e);
                                }
                            }

                            sessionEstablished = true;
                            break;
                        }
                    } catch (sessionError) {
                        console.error(`Session check attempt ${attempt} failed:`, sessionError);
                    }
                }

                if (!sessionEstablished) {
                    console.error('❌ Failed to establish session after all attempts');

                    // For Android, try manual session creation as last resort
                    if (isAndroid) {
                        console.log('🚨 Android emergency session creation...');
                        try {
                            const emergencySession = {
                                user: { email: formData.email },
                                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                                timestamp: Date.now(),
                                platform: 'android-emergency'
                            };

                            localStorage.setItem('android-emergency-session', JSON.stringify(emergencySession));
                            localStorage.setItem('emergency-redirect-flag', 'true');

                            // Force redirect anyway
                            setTimeout(() => {
                                window.location.href = '/dashboard';
                            }, 2000);
                            return;
                        } catch (e) {
                            console.error('Emergency session creation failed:', e);
                        }
                    }

                    setError('Session establishment failed. Please try signing in again.');
                    setLoading(false);
                    setRedirecting(false);
                    return;
                }

                console.log('🎯 Redirecting to dashboard...');

                // Platform-specific redirects with longer delays for Android
                if (isAndroid) {
                    console.log('🤖 Android redirect with extended delay...');
                    setTimeout(() => {
                        console.log('🤖 Executing Android redirect...');
                        window.location.href = '/dashboard';
                    }, 3000); // 3 second delay for Android
                } else if (isNative) {
                    console.log('📱 Native platform redirect...');
                    setTimeout(() => {
                        window.location.replace('/dashboard');
                    }, 1500);
                } else {
                    console.log('🌐 Web platform redirect...');
                    router.replace('/dashboard');
                }
            }
        } catch (error) {
            console.error('Login exception:', error);
            setError('Network error. Please try again.');
            setLoading(false);
            setRedirecting(false);
        }

        // Keep loading state longer for Android
        if (!isAndroid) {
            setTimeout(() => {
                setLoading(false);
                setRedirecting(false);
            }, 1000);
        } else {
            // Android keeps loading state for 4 seconds
            setTimeout(() => {
                setLoading(false);
                setRedirecting(false);
            }, 4000);
        }
    };

    const handleResendVerification = async () => {
        if (!formData.email) {
            setError('Please enter your email address first.');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch(getApiUrl('/api/auth/resend-verification'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: formData.email }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                setShowResendVerification(false);
            } else {
                setError(data.error || 'Failed to resend verification email');
            }
        } catch (error) {
            console.error('Resend verification error:', error);
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
                                    <div className="mt-3">
                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={handleResendVerification}
                                            disabled={loading}
                                            className="text-sm text-red-800 underline hover:text-red-900"
                                        >
                                            {loading ? 'Sending...' : 'Resend verification email'}
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

                        {redirecting && (
                            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                Login successful! Redirecting to dashboard...
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Email address"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleChange}
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