'use client';

// FILE: /src/app/auth/verify-parental-consent/page.js

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import Footer from '@/components/legal/Footer';
import { apiPost } from '@/lib/api-config';
import MobileOptimizedLayout from "@/components/layout/MobileOptimizedLayout";
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

function VerifyParentalConsentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    const [status, setStatus] = useState('loading'); // 'loading', 'verifying', 'success', 'error'
    const [statusMessage, setStatusMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');

    useEffect(() => {
        // Handle URL parameters first
        if (error) {
            setStatus('error');
            switch (error) {
                case 'missing-token':
                    setStatusMessage('No verification token provided in the link.');
                    break;
                case 'invalid-token':
                    setStatusMessage('The verification link is invalid or has expired.');
                    break;
                case 'verification-failed':
                    setStatusMessage('Verification failed due to a technical error.');
                    break;
                default:
                    setStatusMessage('An unknown error occurred.');
            }
        } else if (message) {
            setStatus('success');
            switch (message) {
                case 'consent-verified':
                    setStatusMessage('Parental consent has been successfully verified! The child account is now fully active.');
                    break;
                case 'already-verified':
                    setStatusMessage('Parental consent has already been verified for this account.');
                    break;
                default:
                    setStatusMessage('Operation completed successfully.');
            }
        } else if (token) {
            setStatus('verifying');
            verifyParentalConsent(token);
        } else {
            setStatus('error');
            setStatusMessage('No verification token provided.');
        }
    }, [token, error, message]);

    const verifyParentalConsent = async (verificationToken) => {
        try {
            const response = await apiPost('/api/auth/verify-parental-consent', { token: verificationToken });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setStatusMessage(data.message || 'Parental consent verified successfully!');
            } else {
                setStatus('error');
                setStatusMessage(data.error || 'Verification failed.');
            }
        } catch (error) {
            console.error('Parental consent verification error:', error);
            setStatus('error');
            setStatusMessage('Network error. Please try again.');
        }
    };

    const handleContactSupport = () => {
        window.location.href = 'mailto:privacy@docbearscomfort.kitchen?subject=Parental Consent Verification Issue';
    };

    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-6">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold text-gray-900">
                            Parental Consent Verification
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Doc Bear's Comfort Kitchen
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        {status === 'loading' && (
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading...</p>
                            </div>
                        )}

                        {status === 'verifying' && (
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Verifying parental consent...</p>
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
                                    👨‍👩‍👧‍👦 Parental Consent Verified!
                                </h3>
                                <p className="text-gray-600 mb-4">{statusMessage}</p>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                    <div className="flex items-start">
                                        <div className="text-blue-600 mr-3 mt-0.5">ℹ️</div>
                                        <div className="text-sm text-blue-800">
                                            <p className="font-medium mb-2">What happens next:</p>
                                            <ul className="space-y-1 text-left">
                                                <li>• The child's account is now fully active</li>
                                                <li>• They can sign in and use all features</li>
                                                <li>• You can revoke consent anytime by contacting us</li>
                                                <li>• Account data is protected under COPPA and GDPR</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <TouchEnhancedButton
                                        onClick={() => NativeNavigation.routerPush(router, '/auth/signin')}
                                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Continue to Sign In
                                    </TouchEnhancedButton>

                                    <TouchEnhancedButton
                                        onClick={handleContactSupport}
                                        className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                    >
                                        📧 Contact Support
                                    </TouchEnhancedButton>
                                </div>
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
                                    ❌ Verification Failed
                                </h3>
                                <p className="text-gray-600 mb-6">{statusMessage}</p>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                    <div className="flex items-start">
                                        <div className="text-yellow-600 mr-3 mt-0.5">⚠️</div>
                                        <div className="text-sm text-yellow-800">
                                            <p className="font-medium mb-1">Common Issues:</p>
                                            <ul className="space-y-1 text-left">
                                                <li>• Verification link has expired (7 days max)</li>
                                                <li>• Link was already used</li>
                                                <li>• Link was copied incorrectly</li>
                                                <li>• Technical issue on our end</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="border-t pt-4">
                                        <p className="text-sm text-gray-600 mb-3">
                                            📧 For help with parental consent verification:
                                        </p>
                                        <TouchEnhancedButton
                                            onClick={handleContactSupport}
                                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Contact Privacy Support Team
                                        </TouchEnhancedButton>
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

                    {/* Additional Information Panel */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <div className="text-blue-600 mr-3 mt-0.5">🛡️</div>
                            <div className="text-sm text-blue-800">
                                <h4 className="font-medium mb-2">Minor Protection & Privacy</h4>
                                <p>
                                    We take minor safety seriously. Doc Bear's Comfort Kitchen complies with
                                    COPPA (US) and GDPR (EU) requirements for users under 18. Parental consent
                                    can be revoked at any time by contacting our privacy team.
                                </p>
                                <div className="mt-2">
                                    <a
                                        href="mailto:privacy@docbearscomfort.kitchen"
                                        className="text-blue-700 hover:text-blue-800 underline font-medium"
                                    >
                                        privacy@docbearscomfort.kitchen
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}

export default function VerifyParentalConsentPage() {
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
            <VerifyParentalConsentContent />
        </Suspense>
    );
}