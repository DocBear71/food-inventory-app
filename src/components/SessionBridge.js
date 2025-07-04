'use client';

// file: /src/components/SessionBridge.js - Enhanced with session restoration API

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function SessionBridge() {
    const { data: session, status, update } = useSession();
    const [restoreAttempted, setRestoreAttempted] = useState(false);

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
                if (status !== 'loading' && !session && !restoreAttempted) {
                    console.log('🔄 No NextAuth session, checking mobile session...');
                    setRestoreAttempted(true);

                    const { MobileSession } = await import('@/lib/mobile-session-simple');
                    const mobileSession = await MobileSession.getSession();

                    if (mobileSession?.user) {
                        console.log('📱 Found mobile session, attempting restoration...', mobileSession.user.email);

                        try {
                            // Call our session restoration API
                            const response = await fetch('/api/auth/restore-session', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    mobileSession: mobileSession
                                }),
                                credentials: 'include'
                            });

                            if (response.ok) {
                                const result = await response.json();
                                console.log('✅ Session restoration API success:', result);

                                // Force NextAuth to refresh its session
                                await update();

                                // Small delay then check again
                                setTimeout(async () => {
                                    const { getSession } = await import('next-auth/react');
                                    const refreshedSession = await getSession();

                                    if (refreshedSession?.user) {
                                        console.log('🎉 NextAuth session successfully restored!');
                                    } else {
                                        console.log('⚠️ Session restoration API succeeded but NextAuth session not found');
                                        // Force page reload as last resort
                                        window.location.reload();
                                    }
                                }, 1000);

                            } else {
                                const error = await response.json();
                                console.error('❌ Session restoration API failed:', error);
                            }

                        } catch (restoreError) {
                            console.error('💥 Session restoration error:', restoreError);
                        }
                    } else {
                        console.log('ℹ️ No mobile session found');
                    }
                }

            } catch (error) {
                console.error('Session bridge error:', error);
            }
        };

        // Run bridge after a short delay to ensure everything is loaded
        const timer = setTimeout(bridgeSessions, 1000);

        return () => clearTimeout(timer);
    }, [session, status, update, restoreAttempted]);

    // This component doesn't render anything
    return null;
}