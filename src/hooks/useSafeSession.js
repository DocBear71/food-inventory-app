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
    // ADDED: Force re-render trigger
    const [updateTrigger, setUpdateTrigger] = useState(0);

    // Check platform and load mobile session
    useEffect(() => {
        async function initializeSession() {
            // Check a platform
            const native = await isNativePlatform();
            console.log('📱 Platform detected - isNative:', native);
            setIsNative(native);

            if (!native) {
                // Web platform - no mobile session needed
                console.log('🌐 Web platform - using NextAuth only');
                setInitialized(true);
                return;
            }

            // Native platform - load mobile session
            try {
                console.log('📱 Native platform - loading mobile session...');
                const stored = await MobileSession.getSession();

                if (stored) {
                    console.log('✅ Mobile session loaded:', {
                        email: stored.user?.email,
                        effectiveTier: stored.user?.effectiveTier,
                        subscriptionTier: stored.user?.subscriptionTier,
                        isAdmin: stored.user?.isAdmin,
                        allUserKeys: Object.keys(stored.user || {})
                    });

                    setMobileSession(stored);
                    setMobileSessionStatus('authenticated');

                    // ADDED: Force re-render after setting mobile session
                    setUpdateTrigger(prev => prev + 1);
                } else {
                    console.log('❌ No mobile session found');
                    setMobileSessionStatus('unauthenticated');
                }
            } catch (error) {
                console.error('💥 Error loading mobile session:', error);
                setMobileSessionStatus('unauthenticated');
            } finally {
                setInitialized(true);
            }
        }

        initializeSession();
    }, []);

    // Get NextAuth session
    const nextAuthResult = useSession();

    // ENHANCED: Handle session storage for mobile with better state updates
    useEffect(() => {
        if (isNative && nextAuthResult?.data && nextAuthResult?.status === 'authenticated' && !mobileSession) {
            // Store NextAuth session for mobile use
            console.log('💾 Storing fresh NextAuth session for mobile...', {
                email: nextAuthResult.data.user?.email,
                effectiveTier: nextAuthResult.data.user?.effectiveTier,
                subscriptionTier: nextAuthResult.data.user?.subscriptionTier,
                allUserKeys: Object.keys(nextAuthResult.data.user || {})
            });

            MobileSession.setSession(nextAuthResult.data)
                .then((success) => {
                    if (success) {
                        console.log('✅ Mobile session stored, updating state...');
                        setMobileSession(nextAuthResult.data);
                        setMobileSessionStatus('authenticated');

                        // ADDED: Force re-render after successful storage
                        setUpdateTrigger(prev => prev + 1);
                    }
                })
                .catch((error) => {
                    console.error('💥 Error storing mobile session:', error);
                });
        }
    }, [isNative, nextAuthResult?.data, nextAuthResult?.status, mobileSession]);

    // ADDED: Effect to handle session updates and force re-renders
    useEffect(() => {
        if (mobileSession && isNative) {
            console.log('🔄 Mobile session state updated, current data:', {
                email: mobileSession.user?.email,
                effectiveTier: mobileSession.user?.effectiveTier,
                subscriptionTier: mobileSession.user?.subscriptionTier,
                isAdmin: mobileSession.user?.isAdmin,
                updateTrigger: updateTrigger
            });
        }
    }, [mobileSession, updateTrigger, isNative]);

    // Return appropriate session based on platform
    if (isNative === null || !initialized) {
        // Still initializing
        console.log('⏳ Still initializing platform detection...');
        return {
            data: null,
            status: 'loading',
            update: () => Promise.resolve(null),
        };
    }

    if (isNative) {
        // Native platform - use mobile session
        console.log('📱 Returning mobile session data:', {
            hasData: !!mobileSession,
            status: mobileSessionStatus,
            effectiveTier: mobileSession?.user?.effectiveTier,
            updateTrigger: updateTrigger
        });

        return {
            data: mobileSession,
            status: mobileSessionStatus,
            update: async () => {
                console.log('🔄 Manual session update requested...');
                const fresh = await MobileSession.getSession();
                if (fresh) {
                    console.log('✅ Fresh session loaded:', {
                        email: fresh.user?.email,
                        effectiveTier: fresh.user?.effectiveTier
                    });
                    setMobileSession(fresh);
                    setMobileSessionStatus('authenticated');
                    // Force re-render
                    setUpdateTrigger(prev => prev + 1);
                } else {
                    console.log('❌ No fresh session found');
                    setMobileSession(null);
                    setMobileSessionStatus('unauthenticated');
                }
                return fresh;
            },
        };
    }

    // Web platform - use NextAuth
    console.log('🌐 Returning NextAuth session data:', {
        hasData: !!nextAuthResult?.data,
        status: nextAuthResult?.status,
        effectiveTier: nextAuthResult?.data?.user?.effectiveTier
    });

    return {
        data: nextAuthResult?.data || null,
        status: nextAuthResult?.status || 'loading',
        update: nextAuthResult?.update || (() => Promise.resolve(null)),
    };
}