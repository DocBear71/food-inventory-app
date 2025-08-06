'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export function useSafeSession() {
    const [session, setSession] = useState(null);
    const [status, setStatus] = useState('loading');
    const nextAuthSession = useSession();
    const hasChecked = useRef(false);

    useEffect(() => {
        if (hasChecked.current) return;
        
        async function checkSession() {
            console.log('🔍 useSafeSession ONE-TIME check starting...');
            
            try {
                // Check if we're on client side
                if (typeof window === 'undefined') {
                    setStatus('unauthenticated');
                    hasChecked.current = true;
                    return;
                }

                // Check if native platform
                let isNative = false;
                try {
                    const { Capacitor } = await import('@capacitor/core');
                    isNative = Capacitor.isNativePlatform();
                } catch (e) {
                    isNative = false;
                }

                if (isNative) {
                    console.log('📱 Checking mobile session...');
                    
                    try {
                        const { Preferences } = await import('@capacitor/preferences');
                        const result = await Preferences.get({ key: 'mobile_session' });
                        
                        if (result.value) {
                            const storedSession = JSON.parse(result.value);
                            console.log('📱 Found stored session:', storedSession);
                            
                            // Check if session is valid
                            if (storedSession.expires) {
                                const now = new Date();
                                const expires = new Date(storedSession.expires);
                                
                                if (now < expires) {
                                    console.log('✅ Mobile session is valid, setting authenticated');
                                    setSession(storedSession);
                                    setStatus('authenticated');
                                    hasChecked.current = true;
                                    return;
                                }
                            }
                            
                            // Session expired or invalid
                            console.log('⚠️ Mobile session expired');
                            await Preferences.remove({ key: 'mobile_session' });
                        }
                    } catch (error) {
                        console.error('Error checking mobile session:', error);
                    }
                }

                // No mobile session or web platform
                if (nextAuthSession.data) {
                    console.log('🌐 Using NextAuth session');
                    setSession(nextAuthSession.data);
                    setStatus('authenticated');
                } else {
                    console.log('❌ No session found');
                    setSession(null);
                    setStatus('unauthenticated');
                }
                
            } catch (error) {
                console.error('Session check error:', error);
                setSession(null);
                setStatus('unauthenticated');
            } finally {
                hasChecked.current = true;
            }
        }

        checkSession();
    }, [nextAuthSession.data]);

    // Monitor NextAuth changes after initial check
    useEffect(() => {
        if (!hasChecked.current) return;
        
        if (nextAuthSession.status === 'authenticated' && !session) {
            console.log('🔄 NextAuth session detected after initial check');
            setSession(nextAuthSession.data);
            setStatus('authenticated');
        } else if (nextAuthSession.status === 'unauthenticated' && session && !session.user?.isAdmin) {
            // Only clear non-admin sessions when NextAuth says unauthenticated
            console.log('🔄 NextAuth unauthenticated, clearing session');
            setSession(null);
            setStatus('unauthenticated');
        }
    }, [nextAuthSession.status, nextAuthSession.data, session]);

    console.log('🎯 useSafeSession returning:', {
        status,
        hasSession: !!session,
        userEmail: session?.user?.email,
        hasChecked: hasChecked.current
    });

    return {
        data: session,
        status,
        isAuthenticated: status === 'authenticated',
        isLoading: status === 'loading',
        user: session?.user || null
    };
}