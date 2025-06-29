'use client'

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { MobileSession } from '@/lib/mobile-session';

// Safely import Capacitor
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
    const [isNative, setIsNative] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // Check if we're on a native platform
    useEffect(() => {
        async function checkPlatform() {
            const native = await isNativePlatform();
            setIsNative(native);
            console.log('Platform check - isNative:', native);
        }

        checkPlatform();
    }, []);

    // Load mobile session on mount (only for native platforms)
    useEffect(() => {
        async function loadMobileSession() {
            if (!isNative) {
                setInitialized(true);
                return;
            }

            try {
                console.log('Loading mobile session...');
                const stored = await MobileSession.getSession();

                if (stored) {
                    console.log('Found valid mobile session');
                    setMobileSession(stored);
                    setMobileSessionStatus('authenticated');
                } else {
                    console.log('No valid mobile session found');
                    setMobileSessionStatus('unauthenticated');
                }
            } catch (error) {
                console.error('Error loading mobile session:', error);
                setMobileSessionStatus('unauthenticated');
            } finally {
                setInitialized(true);
            }
        }

        if (isNative !== null) {
            loadMobileSession();
        }
    }, [isNative]);

    try {
        const result = useSession();

        // For native platforms, use mobile session logic
        if (isNative && initialized) {
            console.log('Using mobile session logic - status:', mobileSessionStatus);

            // If we have a regular NextAuth session, store it for mobile use
            if (result?.data && result?.status === 'authenticated' && !mobileSession) {
                console.log('Storing NextAuth session for mobile use');
                MobileSession.setSession(result.data).then(() => {
                    setMobileSession(result.data);
                    setMobileSessionStatus('authenticated');
                });
            }

            // Return mobile session data
            return {
                data: mobileSession,
                status: mobileSessionStatus,
                update: async () => {
                    // Refresh mobile session
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

        // For web platforms, use regular NextAuth
        if (!isNative) {
            console.log('Using regular NextAuth session');
            return {
                data: result?.data || null,
                status: result?.status || 'loading',
                update: result?.update || (() => Promise.resolve(null)),
            };
        }

        // Still loading platform detection
        return {
            data: null,
            status: 'loading',
            update: () => Promise.resolve(null),
        };

    } catch (error) {
        console.error('Session error:', error);
        return {
            data: null,
            status: 'unauthenticated',
            update: () => Promise.resolve(null),
        };
    }
}