'use client'

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
                const stored = await MobileSession.getSession();

                if (stored) {
                    setMobileSession(stored);
                    setMobileSessionStatus('authenticated');
                } else {
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

    // Handle session storage for mobile
    useEffect(() => {
        if (isNative && nextAuthResult?.data && nextAuthResult?.status === 'authenticated' && !mobileSession) {
            // Store NextAuth session for mobile use
            MobileSession.setSession(nextAuthResult.data)
                .then((success) => {
                    if (success) {
                        setMobileSession(nextAuthResult.data);
                        setMobileSessionStatus('authenticated');
                    }
                })
                .catch((error) => {
                    console.error('Error storing mobile session:', error);
                });
        }
    }, [isNative, nextAuthResult?.data, nextAuthResult?.status, mobileSession]);

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
        // Native platform - use mobile session
        return {
            data: mobileSession,
            status: mobileSessionStatus,
            update: async () => {
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