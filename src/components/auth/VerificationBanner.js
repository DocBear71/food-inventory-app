'use client';
import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiPost } from '@/lib/api-config';

export default function VerificationBanner({ user }) {
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    // Check if banner was dismissed this session
    useEffect(() => {
        const wasDismissed = sessionStorage.getItem('verification-banner-dismissed') === 'true';
        setDismissed(wasDismissed);
    }, []);

    // Don't show if user is verified or banner was dismissed
    if (dismissed || user?.emailVerified) {
        return null;
    }

    const handleResendVerification = async () => {
        if (loading) return;

        setLoading(true);

        try {
            const response = await apiPost('/api/auth/resend-verification', {
                email: user.email
            });

            const data = await response.json();

            if (response.ok) {
                alert('Verification email sent! Please check your inbox and spam folder.');
            } else {
                alert(data.error || 'Failed to resend verification email');
            }
        } catch (error) {
            console.error('Resend verification error:', error);
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem('verification-banner-dismissed', 'true');
    };

    return (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 relative">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                        <span className="text-xl">⚠️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                            Please verify your email address to unlock all features
                        </p>
                        <p className="text-xs opacity-90 mt-1">
                            Check your inbox at <span className="font-semibold">{user.email}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                    <TouchEnhancedButton
                        onClick={handleResendVerification}
                        disabled={loading}
                        className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1 rounded text-sm font-medium transition-all disabled:opacity-50"
                    >
                        {loading ? 'Sending...' : 'Resend Email'}
                    </TouchEnhancedButton>

                    <TouchEnhancedButton
                        onClick={handleDismiss}
                        className="text-white hover:text-gray-200 p-1 rounded transition-colors"
                        aria-label="Dismiss"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </TouchEnhancedButton>
                </div>
            </div>
        </div>
    );
}