// file: src/app/api/auth/[...nextauth]/route.js - v3 - Enhanced mobile session handling

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Enhanced auth options for mobile compatibility
const enhancedAuthOptions = {
    ...authOptions,
    // Force secure cookies to false for mobile
    useSecureCookies: false,
    // Ensure cookies work in mobile environments
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: false, // Set to false for mobile
                domain: undefined, // Let it default to current domain
                maxAge: 24 * 60 * 60, // 24 hours
            },
        },
        callbackUrl: {
            name: `next-auth.callback-url`,
            options: {
                sameSite: 'lax',
                path: '/',
                secure: false,
                domain: undefined,
                maxAge: 24 * 60 * 60,
            },
        },
        csrfToken: {
            name: `next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: false,
                domain: undefined,
                maxAge: 24 * 60 * 60,
            },
        },
    },
    // Enhanced session configuration
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 24 hours
        updateAge: 60 * 60, // Update every hour
    },
    // Enhanced callbacks
    callbacks: {
        ...authOptions.callbacks,
        async redirect({ url, baseUrl }) {
            console.log('Enhanced redirect callback:', { url, baseUrl });

            // For sign out, always go to home page
            if (url.includes('signout') || url.includes('signOut')) {
                return '/';
            }

            // For mobile, force dashboard redirect
            if (typeof window !== 'undefined') {
                try {
                    const { Capacitor } = await import('@capacitor/core');
                    if (Capacitor.isNativePlatform()) {
                        console.log('Mobile platform detected - forcing dashboard redirect');
                        return '/dashboard';
                    }
                } catch (e) {
                    console.log('Capacitor not available, treating as web');
                }
            }

            // Handle relative URLs
            if (url.startsWith('/')) {
                return url;
            }

            // Handle absolute URLs that match our domain
            if (url.startsWith(baseUrl)) {
                return url;
            }

            // Default redirect
            return '/dashboard';
        },
        async session({ session, token }) {
            const enhancedSession = await authOptions.callbacks.session({ session, token });

            // CRITICAL: Enhanced mobile session storage
            if (typeof window !== 'undefined' && enhancedSession?.user) {
                try {
                    console.log('💾 Storing enhanced session for mobile compatibility...');
                    const { MobileSession } = await import('@/lib/mobile-session-simple');

                    // Store session with enhanced mobile compatibility
                    const sessionData = {
                        ...enhancedSession,
                        timestamp: Date.now(),
                        source: 'nextauth-callback'
                    };

                    const success = await MobileSession.setSession(sessionData);
                    console.log('Enhanced mobile session storage result:', success);

                    // CRITICAL: Also store in multiple locations for mobile
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('nextauth-session-backup', JSON.stringify(sessionData));
                        localStorage.setItem('session-timestamp', Date.now().toString());
                        console.log('NextAuth localStorage backup created');
                    }

                    // Force session token in localStorage for mobile APIs
                    if (token?.id) {
                        localStorage.setItem('user-id', token.id);
                        localStorage.setItem('user-email', token.email || '');
                        localStorage.setItem('session-active', 'true');
                    }
                } catch (error) {
                    console.error('💥 Enhanced session storage error:', error);
                }
            }

            return enhancedSession;
        },
        async jwt({ token, user }) {
            // Enhanced JWT handling
            const enhancedToken = await authOptions.callbacks.jwt({ token, user });

            // Store additional mobile-friendly data
            if (user) {
                enhancedToken.timestamp = Date.now();
                enhancedToken.mobileCompatible = true;
            }

            return enhancedToken;
        }
    },
    // Enhanced events
    events: {
        ...authOptions.events,
        async signIn({ user, account, profile }) {
            console.log('Enhanced SignIn event - User:', {
                id: user.id,
                email: user.email,
                effectiveTier: user.effectiveTier,
                isAdmin: user.isAdmin
            });

            // Store sign-in timestamp for mobile
            if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
                localStorage.setItem('last-signin', Date.now().toString());
                localStorage.setItem('signin-platform', 'nextauth');
            }

            return true;
        },
        async signOut({ token, session }) {
            console.log('Enhanced SignOut event - clearing all auth state');

            // Clear mobile session storage
            if (typeof window !== 'undefined') {
                try {
                    const { MobileSession } = await import('@/lib/mobile-session-simple');
                    await MobileSession.clearSession();

                    // Clear all related localStorage
                    const keysToRemove = [
                        'nextauth-session-backup',
                        'android-session-backup',
                        'auth-session-backup',
                        'session-timestamp',
                        'user-id',
                        'user-email',
                        'session-active',
                        'last-signin',
                        'signin-platform'
                    ];

                    keysToRemove.forEach(key => {
                        try {
                            localStorage.removeItem(key);
                        } catch (e) {
                            console.log(`Failed to remove ${key}:`, e);
                        }
                    });
                } catch (error) {
                    console.error('SignOut cleanup error:', error);
                }
            }
        }
    }
};

const handler = NextAuth(enhancedAuthOptions);

export { handler as GET, handler as POST };