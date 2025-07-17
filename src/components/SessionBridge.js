'use client';

// file: /src/components/SessionBridge.js - Enhanced with session restoration API

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {apiPost} from "@/lib/api-config.js";

export default function SessionBridge() {
    const { data: session, status, update } = useSession();
    const [restoreAttempted, setRestoreAttempted] = useState(false);
    const [restoreInProgress, setRestoreInProgress] = useState(false);

    useEffect(() => {
        const bridgeSessions = async () => {
            // Prevent multiple simultaneous restore attempts
            if (restoreInProgress) {
                console.log('🔄 Restore already in progress, skipping...');
                return;
            }

            try {
                // If NextAuth session exists, ensure mobile session is in sync
                if (session?.user) {
                    console.log('🌉 NextAuth session found, syncing to mobile storage...');

                    const { MobileSession } = await import('@/lib/mobile-session-simple');
                    const mobileSession = await MobileSession.getSession();

                    // If mobile session is missing or outdated, update it
                    if (!mobileSession || mobileSession.user?.email !== session.user.email) {
                        const sessionData = {
                            user: session.user,
                            expires: session.expires,
                            timestamp: Date.now(),
                            source: 'session-bridge-sync'
                        };

                        await MobileSession.setSession(sessionData);
                        console.log('✅ Mobile session synchronized with NextAuth');
                    }

                    return;
                }

                // Only attempt restore once and if not already in progress
                if (status !== 'loading' && !session && !restoreAttempted && !restoreInProgress) {
                    console.log('🔄 No NextAuth session, checking mobile session...');
                    setRestoreAttempted(true);
                    setRestoreInProgress(true);

                    const { MobileSession } = await import('@/lib/mobile-session-simple');
                    const mobileSession = await MobileSession.getSession();

                    if (mobileSession?.user) {
                        console.log('📱 Found mobile session, attempting restoration...', mobileSession.user.email);

                        try {
                            // Call our session restoration API
                            const response = await apiPost('/api/auth/restore-session', {
                                mobileSession
                            });

                            if (response.ok) {
                                const result = await response.json();
                                console.log('✅ Session restoration API success:', result);

                                // Wait a bit, then check if NextAuth picked up the session
                                setTimeout(async () => {
                                    const { getSession } = await import('next-auth/react');
                                    const refreshedSession = await getSession();

                                    if (refreshedSession?.user) {
                                        console.log('🎉 NextAuth session successfully restored!');
                                        // Force a refresh of the current page content
                                        await update();
                                    } else {
                                        console.log('⚠️ Session restoration failed, redirecting to sign-in');
                                        // Clear the problematic mobile session and redirect
                                        await MobileSession.clearSession();
                                        localStorage.removeItem('mobile_session');
                                        localStorage.removeItem('mobile_session_expiry');
                                        window.location.href = '/auth/signin';
                                    }
                                    setRestoreInProgress(false);
                                }, 2000);

                            } else {
                                const error = await response.json();
                                console.error('❌ Session restoration API failed:', error);
                                setRestoreInProgress(false);

                                // Clear bad mobile session
                                await MobileSession.clearSession();
                                localStorage.removeItem('mobile_session');
                                localStorage.removeItem('mobile_session_expiry');
                            }

                        } catch (restoreError) {
                            console.error('💥 Session restoration error:', restoreError);
                            setRestoreInProgress(false);
                        }
                    } else {
                        console.log('ℹ️ No mobile session found');
                        setRestoreInProgress(false);
                    }
                }

            } catch (error) {
                console.error('Session bridge error:', error);
                setRestoreInProgress(false);
            }
        };

        // Only run if we haven't attempted restoration yet
        if (!restoreAttempted && !restoreInProgress) {
            const timer = setTimeout(bridgeSessions, 1000);
            return () => clearTimeout(timer);
        }
    }, [session, status, update, restoreAttempted, restoreInProgress]);

    // This component doesn't render anything
    return null;
}