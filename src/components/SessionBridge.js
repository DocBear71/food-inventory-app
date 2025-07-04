'use client';

// file: /src/components/SessionBridge.js - Bridges mobile sessions with NextAuth

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function SessionBridge() {
    const { data: session, status } = useSession();

    useEffect(() => {
        const bridgeSessions = async () => {
            try {
                // If NextAuth session exists, ensure mobile session is in sync
                if (session?.user) {
                    console.log('🌉 Bridging NextAuth session to mobile storage...');

                    const { MobileSession } = await import('@/lib/mobile-session-simple');
                    const mobileSession = await MobileSession.getSession();

                    // If mobile session is missing or outdated, update it
                    if (!mobileSession || mobileSession.user?.email !== session.user.email) {
                        const sessionData = {
                            user: session.user,
                            expires: session.expires,
                            timestamp: Date.now(),
                            source: 'session-bridge'
                        };

                        await MobileSession.setSession(sessionData);

                        // Also update localStorage for API calls
                        localStorage.setItem('nextauth-session-active', 'true');
                        localStorage.setItem('current-user-id', session.user.id);
                        localStorage.setItem('current-user-email', session.user.email);

                        console.log('✅ Mobile session synchronized with NextAuth');
                    }

                    return;
                }

                // If no NextAuth session, check if mobile session exists and try to restore
                if (status !== 'loading' && !session) {
                    console.log('🔄 No NextAuth session, checking mobile session...');

                    const { MobileSession } = await import('@/lib/mobile-session-simple');
                    const mobileSession = await MobileSession.getSession();

                    if (mobileSession?.user) {
                        console.log('📱 Found mobile session, attempting to restore NextAuth...');

                        // Try to trigger NextAuth session refresh
                        const { signIn } = await import('next-auth/react');

                        // Don't actually sign in again, but trigger session refresh
                        // This is a workaround - you might need a custom API endpoint
                        try {
                            const response = await fetch('/api/auth/session', {
                                method: 'GET',
                                credentials: 'include'
                            });

                            if (response.ok) {
                                const sessionData = await response.json();
                                if (sessionData.user) {
                                    console.log('✅ NextAuth session restored from mobile session');
                                    // Force a page refresh to pick up the session
                                    window.location.reload();
                                }
                            }
                        } catch (error) {
                            console.error('Failed to restore NextAuth session:', error);
                        }
                    }
                }

            } catch (error) {
                console.error('Session bridge error:', error);
            }
        };

        // Run bridge after a short delay to ensure everything is loaded
        const timer = setTimeout(bridgeSessions, 1000);

        return () => clearTimeout(timer);
    }, [session, status]);

    // This component doesn't render anything
    return null;
}