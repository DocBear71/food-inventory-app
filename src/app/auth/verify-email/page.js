'use client';

// FILE 3: /src/app/auth/verify-email/page.js

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import Footer from '@/components/legal/Footer';
import { getApiUrl } from '@/lib/api-config';
import MobileOptimizedLayout from "@/components/layout/MobileOptimizedLayout";

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');

    useEffect(() => {
        if (token) {
            verifyEmail(token);
        } else {
            setStatus('error');
            setMessage('No verification token provided.');
        }
    }, [token]);

    const verifyEmail = async (verificationToken) => {
        try {
            const response = await fetch(getApiUrl('/api/auth/verify-email'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: verificationToken }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || 'Email verified successfully!');
            } else {
                setStatus('error');
                setMessage(data.error || 'Verification failed.');
            }
        } catch (error) {
            console.error('Verification error:', error);
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    };

    const handleResendVerification = async (e) => {
        e.preventDefault();
        if (!email) {
            alert('Please enter your email address');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(getApiUrl('/api/auth/resend-verification'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                setEmail('');
            } else {
                alert(data.error || 'Failed to resend verification email');
            }
        } catch (error) {
            console.error('Resend error:', error);
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-6">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-gray-900">
                            Email Verification
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Doc Bear's Comfort Kitchen
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        {status === 'verifying' && (
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Verifying your email...</p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Email Verified Successfully!
                                </h3>
                                <p className="text-gray-600 mb-6">{message}</p>
                                <TouchEnhancedButton
                                    onClick={() => router.push('/auth/signin')}
                                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Sign In to Your Account
                                </TouchEnhancedButton>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="text-center">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Verification Failed
                                </h3>
                                <p className="text-gray-600 mb-6">{message}</p>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-3">
                                            Need a new verification email? Enter your email address:
                                        </p>
                                        <form onSubmit={handleResendVerification} className="space-y-3">
                                            <input
                                                type="email"
                                                placeholder="Enter your email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                required
                                            />
                                            <TouchEnhancedButton
                                                type="submit"
                                                disabled={loading}
                                                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                                            >
                                                {loading ? 'Sending...' : 'Resend Verification Email'}
                                            </TouchEnhancedButton>
                                        </form>
                                    </div>

                                    <div className="border-t pt-4">
                                        <Link
                                            href="/auth/signin"
                                            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                                        >
                                            ← Back to Sign In
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}

export default function VerifyEmailPage() {
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
            <VerifyEmailContent />
        </Suspense>
    );
}