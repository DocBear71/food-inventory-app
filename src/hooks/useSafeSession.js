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

            console.log('🔍 Native platform session check - NextAuth:', nextAuthResult?.status, 'Mobile:', mobileSessionStatus);

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
                        console.log('✅ Mobile session still valid, keeping it');
                        // Update the session data if it changed
                        if (JSON.stringify(currentSession) !== JSON.stringify(mobileSession)) {
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
        }, 100); // 100ms debounce

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
                console.log('🔄 Updating session...');

                // For native, always check mobile storage first
                const fresh = await MobileSession.getSession();
                if (fresh) {
                    setMobileSession(fresh);
                    setMobileSessionStatus('authenticated');
                    return fresh;
                }

                // Then try to get fresh session from NextAuth
                if (nextAuthResult?.update) {
                    try {
                        const updated = await nextAuthResult.update();
                        if (updated) {
                            await MobileSession.setSession(updated);
                            setMobileSession(updated);
                            setMobileSessionStatus('authenticated');
                            return updated;
                        }
                    } catch (error) {
                        console.error('Error updating NextAuth session:', error);
                    }
                }

                // No valid session found
                setMobileSession(null);
                setMobileSessionStatus('unauthenticated');
                return null;
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