'use client';

// Create this file: /src/hooks/useAuthSession.js
// Enhanced session detection for mobile apps

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useAuthSession() {
    const [mobileSession, setMobileSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const nextAuthSession = useSession();

    useEffect(() => {
        async function checkSession() {
            setIsLoading(true);
            
            try {
                // Check if we're in a native platform
                let isNative = false;
                try {
                    const { Capacitor } = await import('@capacitor/core');
                    isNative = Capacitor.isNativePlatform();
                } catch (e) {
                    isNative = false;
                }

                if (isNative) {
                    console.log('🔍 Checking mobile session...');
                    
                    // Check mobile session storage
                    const { Preferences } = await import('@capacitor/preferences');
                    
                    // Check multiple storage locations
                    const [sessionResult, authFlagResult, userResult] = await Promise.all([
                        Preferences.get({ key: 'mobile_session' }),
                        Preferences.get({ key: 'is_authenticated' }),
                        Preferences.get({ key: 'current_user' })
                    ]);

                    console.log('📱 Session check results:', {
                        hasSession: !!sessionResult.value,
                        authFlag: authFlagResult.value,
                        hasUser: !!userResult.value
                    });

                    if (sessionResult.value) {
                        try {
                            const session = JSON.parse(sessionResult.value);
                            console.log('✅ Mobile session found:', session.user?.email);
                            
                            // Check if session is still valid
                            const now = new Date();
                            const expires = new Date(session.expires);
                            
                            if (now < expires) {
                                console.log('✅ Mobile session is valid');
                                setMobileSession(session);
                                setIsAuthenticated(true);
                                setIsLoading(false);
                                return;
                            } else {
                                console.log('⚠️ Mobile session expired');
                                // Clear expired session
                                await Preferences.remove({ key: 'mobile_session' });
                                await Preferences.remove({ key: 'is_authenticated' });
                                await Preferences.remove({ key: 'current_user' });
                            }
                        } catch (error) {
                            console.error('❌ Error parsing mobile session:', error);
                        }
                    }

                    // Check auth flag as backup
                    if (authFlagResult.value === 'true' && userResult.value) {
                        try {
                            const user = JSON.parse(userResult.value);
                            console.log('✅ Auth flag found, creating session from user data');
                            
                            const session = {
                                user,
                                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                            };
                            
                            setMobileSession(session);
                            setIsAuthenticated(true);
                            setIsLoading(false);
                            return;
                        } catch (error) {
                            console.error('❌ Error parsing user data:', error);
                        }
                    }

                    console.log('❌ No valid mobile session found');
                } else {
                    // Web platform - use NextAuth session
                    console.log('🌐 Using NextAuth session');
                    if (nextAuthSession.data) {
                        setIsAuthenticated(true);
                        setIsLoading(false);
                        return;
                    }
                }

                // No session found
                setIsAuthenticated(false);
                setMobileSession(null);
                
            } catch (error) {
                console.error('Session check error:', error);
                setIsAuthenticated(false);
                setMobileSession(null);
            } finally {
                setIsLoading(false);
            }
        }

        checkSession();
    }, [nextAuthSession.data, nextAuthSession.status]);

    // Return unified session object
    const session = mobileSession || nextAuthSession.data;
    
    return {
        data: session,
        status: isLoading ? 'loading' : (isAuthenticated ? 'authenticated' : 'unauthenticated'),
        isAuthenticated,
        isLoading,
        user: session?.user || null
    };
}