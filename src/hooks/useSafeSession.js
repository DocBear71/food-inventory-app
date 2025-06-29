'use client'

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { MobileSession } from '@/lib/mobile-session-simple';

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
    const [isNative, setIsNative] = useState(null); // Start with null to know when it's been checked
    const [initialized, setInitialized] = useState(false);

    // Check if we're on a native platform
    useEffect(() => {
        async function checkPlatform() {
            console.log('🔍 Checking platform...');
            const native = await isNativePlatform();
            console.log('📱 Platform check result - isNative:', native);
            setIsNative(native);
        }

        checkPlatform();
    }, []);

    // Load mobile session on mount (only for native platforms)
    useEffect(() => {
        async function loadMobileSession() {
            if (isNative === null) {
                console.log('⏳ Platform not checked yet, waiting...');
                return;
            }

            if (!isNative) {
                console.log('🌐 Web platform detected, skipping mobile session');
                setInitialized(true);
                return;
            }

            try {
                console.log('📱 Native platform - loading mobile session...');
                const stored = await MobileSession.getSession();

                if (stored) {
                    console.log('✅ Found valid mobile session:', stored.user?.email);
                    setMobileSession(stored);
                    setMobileSessionStatus('authenticated');
                } else {
                    console.log('❌ No valid mobile session found');
                    setMobileSessionStatus('unauthenticated');
                }
            } catch (error) {
                console.error('💥 Error loading mobile session:', error);
                setMobileSessionStatus('unauthenticated');
            } finally {
                console.log('🏁 Mobile session initialization complete');
                setInitialized(true);
            }
        }

        loadMobileSession();
    }, [isNative]);

    try {
        const result = useSession();
        console.log('🔐 NextAuth session status:', result?.status, 'isNative:', isNative, 'initialized:', initialized);

        // For native platforms, use mobile session logic
        if (isNative && initialized) {
            console.log('📱 Using mobile session logic - status:', mobileSessionStatus);

            // If we have a regular NextAuth session, store it for mobile use
            if (result?.data && result?.status === 'authenticated' && !mobileSession) {
                console.log('💾 Storing NextAuth session for mobile use');

                // FIXED: Use async/await instead of .then()
                (async () => {
                    try {
                        const success = await MobileSession.setSession(result.data);
                        if (success) {
                            console.log('✅ Mobile session stored, updating state');
                            setMobileSession(result.data);
                            setMobileSessionStatus('authenticated');
                        } else {
                            console.log('❌ Failed to store mobile session');
                        }
                    } catch (error) {
                        console.error('💥 Error storing mobile session:', error);
                    }
                })();
            }

            // Return mobile session data
            return {
                data: mobileSession,
                status: mobileSessionStatus,
                update: async () => {
                    console.log('🔄 Updating mobile session...');
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
        if (isNative === false) {
            console.log('🌐 Using regular NextAuth session');
            return {
                data: result?.data || null,
                status: result?.status || 'loading',
                update: result?.update || (() => Promise.resolve(null)),
            };
        }

        // Still loading platform detection or mobile session
        console.log('⏳ Still loading... isNative:', isNative, 'initialized:', initialized);
        return {
            data: null,
            status: 'loading',
            update: () => Promise.resolve(null),
        };

    } catch (error) {
        console.error('💥 Session error:', error);
        return {
            data: null,
            status: 'unauthenticated',
            update: () => Promise.resolve(null),
        };
    }
}