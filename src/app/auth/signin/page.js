'use client';
// file: /src/app/auth/signin/page.js v5 - FIXED: Direct session storage for mobile

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

        // Use dynamic import for Capacitor to avoid require() issues
        let isNative = false;
        try {
            const { Capacitor } = await import('@capacitor/core');
            isNative = Capacitor.isNativePlatform();
        } catch (e) {
            isNative = false;
        }

        console.log('=== LOGIN ATTEMPT ===');
        console.log('Email:', formData.email);
        console.log('Is native platform:', isNative);

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
                console.log('Login appears successful');
                setRedirecting(true);

                if (isNative) {
                    // For native platforms, we need to get the session data directly
                    // since NextAuth session retrieval might fail
                    console.log('🔄 Native platform - fetching session data directly...');

                    try {
                        // ENHANCED: Try multiple methods to get user data
                        console.log('🔍 Method 1: Trying NextAuth session...');

                        // First try NextAuth session
                        const { getSession } = await import('next-auth/react');
                        const nextAuthSession = await getSession();

                        if (nextAuthSession?.user) {
                            console.log('✅ NextAuth session found:', nextAuthSession.user);
                            const success = await MobileSession.setSession(nextAuthSession);
                            if (success) {
                                console.log('✅ NextAuth session stored, redirecting...');
                                setTimeout(() => {
                                    window.location.replace('/dashboard');
                                }, 1000);
                                return;
                            }
                        }

                        console.log('🔍 Method 2: Trying direct session API...');

                        // Try direct API call to get session data
                        const sessionResponse = await fetch(getApiUrl('/api/auth/session'), {
                            method: 'GET',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        });

                        if (sessionResponse.ok) {
                            const sessionData = await sessionResponse.json();
                            console.log('✅ Direct session fetch response:', sessionData);

                            if (sessionData?.user && Object.keys(sessionData.user).length > 1) {
                                // Store the session in mobile storage
                                const mobileSessionData = {
                                    user: sessionData.user,
                                    expires: sessionData.expires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                                };

                                const success = await MobileSession.setSession(mobileSessionData);
                                console.log('📱 Mobile session storage result:', success);

                                if (success) {
                                    console.log('✅ Session stored successfully, redirecting...');
                                    setTimeout(() => {
                                        window.location.replace('/dashboard');
                                    }, 1000);
                                    return;
                                }
                            }
                        }

                        console.log('🔍 Method 3: Trying user profile API...');

                        // Try to get user data from profile endpoint
                        const profileResponse = await fetch(getApiUrl('/api/user/profile'), {
                            method: 'GET',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        });

                        if (profileResponse.ok) {
                            const userData = await profileResponse.json();
                            console.log('✅ User profile fetch successful:', userData);

                            if (userData?.email) {
                                // Create session from user data
                                const sessionData = {
                                    user: userData,
                                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                                };

                                const success = await MobileSession.setSession(sessionData);
                                console.log('📱 Profile session storage result:', success);

                                if (success) {
                                    console.log('✅ Profile session stored successfully, redirecting...');
                                    setTimeout(() => {
                                        window.location.replace('/dashboard');
                                    }, 1000);
                                    return;
                                }
                            }
                        }

                        console.log('🔍 Method 4: Trying user data by email...');

                        // Add a small delay to ensure the callback processing is complete
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Try to get user data by email
                        const userResponse = await fetch(getApiUrl('/api/user/by-email'), {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ email: formData.email })
                        });

                        console.log('📡 User by email API response status:', userResponse.status);

                        if (userResponse.ok) {
                            const userData = await userResponse.json();
                            console.log('✅ User data by email successful:', userData);

                            if (userData?.email) {
                                // Create session from user data
                                const sessionData = {
                                    user: userData,
                                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                                };

                                const success = await MobileSession.setSession(sessionData);
                                console.log('📱 Email user session storage result:', success);

                                if (success) {
                                    console.log('✅ Email user session stored successfully, redirecting...');
                                    setTimeout(() => {
                                        window.location.replace('/dashboard');
                                    }, 1000);
                                    return;
                                }
                            }
                        } else {
                            console.error('❌ User by email API failed:', userResponse.status, userResponse.statusText);
                            try {
                                const errorData = await userResponse.text();
                                console.error('Error response:', errorData);
                            } catch (e) {
                                console.error('Could not read error response');
                            }
                        }

                        console.log('❌ All methods failed, using fallback...');
                        await handleFallbackSessionRetrieval(isNative);

                    } catch (fetchError) {
                        console.error('❌ Error during session retrieval:', fetchError);
                        // Fallback: try to get the session a different way
                        await handleFallbackSessionRetrieval(isNative);
                    }
                } else {
                    // For web platforms, use the original logic
                    console.log('🌐 Web platform - using NextAuth session...');
                    await handleWebSessionRetrieval();
                }
            }
        } catch (error) {
            console.error('Login exception:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleFallbackSessionRetrieval = async (isNative) => {
        console.log('🔄 Attempting fallback session retrieval...');

        // Try to create a session based on the login credentials
        // This is a fallback when direct session fetch fails
        try {
            // Create a minimal session object based on what we know
            const fallbackSession = {
                user: {
                    email: formData.email,
                    // We don't have all the user data, but we can redirect and let the app fetch it
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            if (isNative) {
                await MobileSession.setSession(fallbackSession);
            }

            setTimeout(() => {
                window.location.replace('/dashboard');
            }, 1000);
        } catch (error) {
            console.error('❌ Fallback session retrieval failed:', error);
            // Final fallback - just redirect and hope for the best
            setTimeout(() => {
                window.location.replace('/dashboard');
            }, 1000);
        }
    };

    const handleWebSessionRetrieval = async () => {
        // Wait a moment for session to be established
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if session was actually created
        const { getSession } = await import('next-auth/react');
        const session = await getSession();
        console.log('Session after login:', session);

        if (session) {
            console.log('Session confirmed, redirecting...');
            router.replace('/dashboard');
        } else {
            console.log('No session found after successful login');
            // Try forcing a page reload to establish session
            setTimeout(() => {
                window.location.replace('/dashboard');
            }, 1000);
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