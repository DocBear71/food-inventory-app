// file: src/app/api/auth/[...nextauth]/route.js - v2 - Fixed for Android APK

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Enhanced auth options for Android APK compatibility
const enhancedAuthOptions = {
    ...authOptions,
    // Force secure cookies to false for Android APK
    useSecureCookies: false,
    // Ensure cookies work in WebView
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: false, // Set to false for Android APK
                domain: undefined, // Let it default to current domain
            },
        },
        callbackUrl: {
            name: `next-auth.callback-url`,
            options: {
                sameSite: 'lax',
                path: '/',
                secure: false,
                domain: undefined,
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
            },
        },
    },
    // Enhanced redirect callback for Android
    callbacks: {
        ...authOptions.callbacks,
        async redirect({ url, baseUrl }) {
            console.log('Enhanced redirect callback:', { url, baseUrl });

            // For sign out, always go to home page
            if (url.includes('signout') || url.includes('signOut')) {
                return '/';
            }

            // For Android APK, force dashboard redirect
            if (typeof window !== 'undefined') {
                try {
                    const { Capacitor } = await import('@capacitor/core');
                    if (Capacitor.isNativePlatform()) {
                        console.log('Native platform detected - forcing dashboard redirect');
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

            // Enhanced mobile session storage for Android
            if (typeof window !== 'undefined' && enhancedSession?.user) {
                try {
                    console.log('💾 Enhanced session storage for Android...');
                    const { MobileSession } = await import('@/lib/mobile-session-simple');

                    // Store session with enhanced Android compatibility
                    const sessionData = {
                        ...enhancedSession,
                        timestamp: Date.now(),
                        platform: 'android-apk'
                    };

                    const success = await MobileSession.setSession(sessionData);
                    console.log('Android session storage result:', success);

                    // Also store in localStorage as backup for Android
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('auth-session-backup', JSON.stringify(sessionData));
                        console.log('Android localStorage backup created');
                    }
                } catch (error) {
                    console.error('💥 Enhanced session storage error:', error);
                }
            }

            return enhancedSession;
        }
    }
};

const handler = NextAuth(enhancedAuthOptions);

export { handler as GET, handler as POST };