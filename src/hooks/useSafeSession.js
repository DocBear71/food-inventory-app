'use client'

// file: src/hooks/useSafeSession.js v2

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

    // ENHANCED: Handle session clearing when NextAuth session is lost
    useEffect(() => {
        if (isNative && nextAuthResult?.status === 'unauthenticated' && mobileSession) {
            console.log('🔄 NextAuth session lost - clearing mobile session');
            MobileSession.clearSession()
                .then(() => {
                    setMobileSession(null);
                    setMobileSessionStatus('unauthenticated');
                })
                .catch((error) => {
                    console.error('Error clearing mobile session:', error);
                });
        }
    }, [isNative, nextAuthResult?.status, mobileSession]);

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
        // Native platform - use mobile session with NextAuth fallback
        const sessionData = mobileSession || nextAuthResult?.data;
        const sessionStatus = sessionData ? 'authenticated' :
            mobileSessionStatus === 'loading' ? 'loading' : 'unauthenticated';

        return {
            data: sessionData,
            status: sessionStatus,
            update: async () => {
                console.log('🔄 Updating session...');

                // First try to get fresh session from NextAuth
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

                // Fallback to mobile storage
                const fresh = await MobileSession.getSession();
                if (fresh) {
                    setMobileSession(fresh);
                    setMobileSessionStatus('authenticated');
                } else {
                    setMobileSession(null);
                    setMobileSessionStatus('unauthenticated');
                }
                return fresh;
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