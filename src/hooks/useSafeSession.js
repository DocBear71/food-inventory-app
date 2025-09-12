'use client'

// file: src/hooks/useSafeSession.js v4

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { MobileSession } from '@/lib/mobile-session-simple';

// Safely check if we're on a native platform
async function isNativePlatform() {
    try {
        if (typeof window === 'undefined') return false;

        const { Capacitor } = await import('@capacitor/core');
        return Capacitor.isNativePlatform();
    } catch (e) {
        return false;
    }
}

export function useSafeSession() {
    const [mobileSession, setMobileSession] = useState(null);
    const [mobileSessionStatus, setMobileSessionStatus] = useState('loading');
    const [isNative, setIsNative] = useState(null);
    const [initialized, setInitialized] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(false); // Prevent concurrent checks

    // Check platform and load mobile session
    useEffect(() => {
        async function initializeSession() {
            // Check platform
            const native = await isNativePlatform();
            setIsNative(native);

            if (!native) {
                // Web platform - no mobile session needed
                setInitialized(true);
                return;
            }

            // Native platform - load mobile session
            try {
                console.log('🔍 Loading mobile session...');
                const stored = await MobileSession.getSession();

                if (stored) {
                    console.log('✅ Found existing mobile session');
                    setMobileSession(stored);
                    setMobileSessionStatus('authenticated');
                } else {
                    console.log('❌ No existing mobile session found');
                    setMobileSessionStatus('unauthenticated');
                }
            } catch (error) {
                console.error('Error loading mobile session:', error);
                setMobileSessionStatus('unauthenticated');
            } finally {
                setInitialized(true);
            }
        }

        initializeSession();
    }, []);

    // Get NextAuth session
    const nextAuthResult = useSession();

    // ENHANCED: Handle session storage/sync for mobile
    useEffect(() => {
        if (isNative && nextAuthResult?.data && nextAuthResult?.status === 'authenticated') {
            // If we have a NextAuth session on native, sync it to mobile storage
            if (!mobileSession || mobileSession.user?.email !== nextAuthResult.data.user?.email) {
                console.log('📱 Syncing NextAuth session to mobile storage...');
                MobileSession.setSession(nextAuthResult.data)
                    .then((success) => {
                        if (success) {
                            console.log('✅ NextAuth session synced to mobile storage');
                            setMobileSession(nextAuthResult.data);
                            setMobileSessionStatus('authenticated');
                        }
                    })
                    .catch((error) => {
                        console.error('Error syncing mobile session:', error);
                    });
            }
        }
    }, [isNative, nextAuthResult?.data, nextAuthResult?.status, mobileSession]);

    // FIXED: Don't clear mobile session just because NextAuth is unauthenticated
    // On native platforms, NextAuth often fails to get sessions, so rely on mobile storage
    useEffect(() => {
        // Only run this effect when we have the necessary data and avoid infinite loops
        if (!isNative || !initialized) return;

        // Debounce the session check to prevent rapid successive calls
        const debounceTimeout = setTimeout(() => {
            if (isCheckingSession) return; // Prevent concurrent checks

            // Only log periodically to reduce noise
            if (Date.now() - (window.lastSessionLogTime || 0) > 5000) {
                console.log('🔍 Native platform session check - NextAuth:', nextAuthResult?.status, 'Mobile:', mobileSessionStatus);
                window.lastSessionLogTime = Date.now();
            }

            // Only clear if we have a specific sign-out event or expired session
            if (nextAuthResult?.status === 'unauthenticated' && mobileSession && mobileSessionStatus === 'authenticated') {
                setIsCheckingSession(true);

                // Check if the mobile session is still valid (but only if we don't already have a valid session)
                MobileSession.getSession().then(currentSession => {
                    if (!currentSession) {
                        console.log('🔄 Mobile session expired - clearing state');
                        setMobileSession(null);
                        setMobileSessionStatus('unauthenticated');
                    } else {
                        // Only update if the session actually changed
                        if (JSON.stringify(currentSession) !== JSON.stringify(mobileSession)) {
                            console.log('✅ Mobile session updated with new data');
                            setMobileSession(currentSession);
                            setMobileSessionStatus('authenticated');
                        }
                    }
                }).catch(error => {
                    console.error('Error checking mobile session validity:', error);
                }).finally(() => {
                    setIsCheckingSession(false);
                });
            }
        }, 500); // Increased debounce to 500ms

        return () => clearTimeout(debounceTimeout);
    }, [isNative, initialized, nextAuthResult?.status, mobileSessionStatus]); // Removed mobileSession from dependencies to prevent loop

    // Return appropriate session based on platform
    if (isNative === null || !initialized) {
        // Still initializing
        return {
            data: null,
            status: 'loading',
            update: () => Promise.resolve(null),
        };
    }

    if (isNative) {
        // Native platform - prioritize mobile session
        const sessionData = mobileSession || nextAuthResult?.data;
        const sessionStatus = sessionData ? 'authenticated' :
            (mobileSessionStatus === 'loading' || nextAuthResult?.status === 'loading') ? 'loading' : 'unauthenticated';

        return {
            data: sessionData,
            status: sessionStatus,
            update: async () => {
                console.log('🔄 Updating session on native platform...');

                try {
                    // STEP 1: Always force NextAuth session refresh FIRST
                    if (nextAuthResult?.update) {
                        console.log('🔄 Forcing NextAuth database refresh...');

                        // CRITICAL: Force the JWT callback to run with update trigger
                        const refreshedSession = await nextAuthResult.update({
                            forceRefresh: true,
                            trigger: 'update'
                        });

                        console.log('📊 NextAuth refresh result:', {
                            hasSession: !!refreshedSession,
                            tier: refreshedSession?.user?.subscription?.tier,
                            status: refreshedSession?.user?.subscription?.status
                        });

                        if (refreshedSession?.user?.subscription) {
                            // STEP 2: Sync fresh data to mobile storage
                            console.log('💾 Syncing fresh session to mobile storage...');
                            const syncSuccess = await MobileSession.setSession(refreshedSession);

                            if (syncSuccess) {
                                console.log('✅ Fresh session synced to mobile storage');
                                setMobileSession(refreshedSession);
                                setMobileSessionStatus('authenticated');
                                return refreshedSession;
                            } else {
                                console.error('❌ Failed to sync fresh session to mobile storage');
                            }
                        }
                    }

                    // STEP 3: Fallback - check mobile storage
                    console.log('🔄 Checking mobile session storage as fallback...');
                    const storedSession = await MobileSession.getSession();

                    if (storedSession) {
                        console.log('📱 Found session in mobile storage');
                        setMobileSession(storedSession);
                        setMobileSessionStatus('authenticated');
                        return storedSession;
                    }

                    // STEP 4: No valid session found
                    console.log('❌ No valid session found after update');
                    setMobileSession(null);
                    setMobileSessionStatus('unauthenticated');
                    return null;

                } catch (error) {
                    console.error('❌ Critical error updating session:', error);

                    // Emergency fallback - try mobile storage one more time
                    try {
                        const emergencySession = await MobileSession.getSession();
                        if (emergencySession) {
                            console.log('🚨 Emergency fallback session found');
                            setMobileSession(emergencySession);
                            setMobileSessionStatus('authenticated');
                            return emergencySession;
                        }
                    } catch (emergencyError) {
                        console.error('💥 Emergency fallback failed:', emergencyError);
                    }

                    return null;
                }
            },
        };
    }

    // Web platform - use NextAuth
    return {
        data: nextAuthResult?.data || null,
        status: nextAuthResult?.status || 'loading',
        update: nextAuthResult?.update || (() => Promise.resolve(null)),
    };
}