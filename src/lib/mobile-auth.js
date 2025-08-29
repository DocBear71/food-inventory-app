// Create a new file: /src/lib/mobile-auth.js

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export class MobileAuthStorage {
    static async setSession(session) {
        if (Capacitor.isNativePlatform()) {
            try {
                await Preferences.set({
                    key: 'user-session',
                    value: JSON.stringify(session)
                });
                console.log('Session stored in mobile preferences');
            } catch (error) {
                console.error('Failed to store session:', error);
            }
        }
    }

    static async getSession() {
        if (Capacitor.isNativePlatform()) {
            try {
                const { value } = await Preferences.get({ key: 'user-session' });
                if (value) {
                    const session = JSON.parse(value);
                    console.log('Retrieved session from mobile preferences:', session);
                    return session;
                }
            } catch (error) {
                console.error('Failed to retrieve session:', error);
            }
        }
        return null;
    }

    static async clearSession() {
        if (Capacitor.isNativePlatform()) {
            try {
                await Preferences.remove({ key: 'user-session' });
                console.log('Session cleared from mobile preferences');
            } catch (error) {
                console.error('Failed to clear session:', error);
            }
        }
    }
}

// Enhanced sign-in handler that stores session in mobile storage
export const handleMobileSignIn = async (credentials, { setLoading, setError, setRedirecting, router }) => {
    setLoading(true);

    try {
        // Import signIn dynamically to avoid SSR issues
        const { signIn, getSession } = await import('next-auth/react');

        const result = await signIn('credentials', {
            ...credentials,
            redirect: false,
        });

        console.log('SignIn result:', result);

        if (result?.error) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Authentication Failed',
                message: 'Invalid email or password. Please try again.'
            });
            return false;
        }

        if (result?.ok) {
            // Get the session
            const session = await getSession();
            console.log('Session after login:', session);

            if (session) {
                // Store session in mobile preferences for persistence
                await MobileAuthStorage.setSession(session);

                setRedirecting(true);

                // Use a more reliable redirect for mobile
                if (Capacitor.isNativePlatform()) {
                    setTimeout(() => {
                        // Force a full page reload to ensure session is recognized
                        window.location.replace('/dashboard');
                    }, 500);
                } else {
                    await NativeNavigation.routerPush(router, '/dashboard');
                }
                return true;
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Authentication Failed',
                    message: 'Authentication failed. Please try again.'
                });
                return false;
            }
        }
    } catch (error) {
        console.error('Login exception:', error);
        const { NativeDialog } = await import('@/components/mobile/NativeDialog');
        await NativeDialog.showError({
            title: 'Network Error',
            message: 'Network error. Please try again.'
        });
        return false;
    } finally {
        setLoading(false);
    }
};