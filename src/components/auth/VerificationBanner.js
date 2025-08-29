'use client';
import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiPost } from '@/lib/api-config';

export default function VerificationBanner({ user }) {
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [lastSent, setLastSent] = useState(null);
    const [cooldown, setCooldown] = useState(0);

    // Check if banner was dismissed this session and get last sent time
    useEffect(() => {
        const wasDismissed = sessionStorage.getItem('verification-banner-dismissed') === 'true';
        const lastSentTime = localStorage.getItem('last-verification-sent');

        setDismissed(wasDismissed);

        if (lastSentTime) {
            const timeDiff = Date.now() - parseInt(lastSentTime);
            const remainingCooldown = Math.max(0, 60000 - timeDiff); // 1 minute cooldown
            setCooldown(Math.ceil(remainingCooldown / 1000));
            setLastSent(new Date(parseInt(lastSentTime)));
        }
    }, []);

    // Cooldown timer
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    // Don't show if user is verified or banner was dismissed
    if (dismissed || user?.emailVerified) {
        return null;
    }

    const handleResendVerification = async () => {
        if (loading || cooldown > 0) return;

        setLoading(true);

        try {
            console.log('Attempting to resend verification email to:', user.email);

            const response = await apiPost('/api/auth/resend-verification', {
                email: user.email
            });

            const data = await response.json();

            console.log('Resend verification response:', {
                status: response.status,
                ok: response.ok,
                data
            });

            if (response.ok) {
                const now = Date.now();
                localStorage.setItem('last-verification-sent', now.toString());
                setLastSent(new Date(now));
                setCooldown(60); // 1 minute cooldown

                // Better success message
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showSuccess({
                    title: 'Email Sent Successfully',
                    message: 'Verification email sent successfully!\n\nPlease check:\n• Your inbox\n• Spam/Junk folder\n• Promotions tab (Gmail)\n\nThe email should arrive within 2-3 minutes.'
                });
            } else {
                console.error('Resend verification failed:', data);
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Email Send Failed',
                    message: `Failed to send verification email:\n\n${data.error || 'Unknown error occurred'}\n\nPlease try again in a few minutes or contact support if the problem persists.`
                });
            }
        } catch (error) {
            console.error('Resend verification network error:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Network error occurred.\n\nPlease check your internet connection and try again.\n\nIf the problem persists, please contact support.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem('verification-banner-dismissed', 'true');
    };

    const canResend = !loading && cooldown === 0;

    return (
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-3 relative border-b border-orange-700">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                        <span className="text-xl">⚠️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">
                            Please verify your email address to unlock all features
                        </p>
                        <p className="text-xs text-orange-100 mt-1">
                            Check your inbox at <span className="font-semibold text-white">{user.email}</span>
                            {lastSent && (
                                <span className="block mt-1">
                                    Last sent: {lastSent.toLocaleTimeString()}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                    <TouchEnhancedButton
                        onClick={handleResendVerification}
                        disabled={!canResend}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                            !canResend
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-white text-orange-600 hover:bg-orange-50 hover:text-orange-700 shadow-sm'
                        }`}
                        title={cooldown > 0 ? `Wait ${cooldown} seconds before resending` : ''}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500 inline" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending...
                            </>
                        ) : cooldown > 0 ? (
                            `Resend (${cooldown}s)`
                        ) : (
                            'Resend Email'
                        )}
                    </TouchEnhancedButton>

                    <TouchEnhancedButton
                        onClick={handleDismiss}
                        className="text-white hover:text-orange-200 p-2 rounded-md transition-colors hover:bg-white hover:bg-opacity-10"
                        aria-label="Dismiss"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </TouchEnhancedButton>
                </div>
            </div>

            {/* Debug info in development */}
            {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-orange-200 mt-2 border-t border-orange-500 pt-2">
                    Debug: User verified: {user?.emailVerified ? 'Yes' : 'No'} |
                    Email: {user?.email} |
                    Cooldown: {cooldown}s |
                    Last sent: {lastSent?.toISOString() || 'Never'}
                </div>
            )}
        </div>
    );
}