// file: src/lib/capacitor-auth-fix.js v4 - Simplified to work with CapacitorAuthProvider

import { Capacitor } from '@capacitor/core'

console.log('Auth fix file loaded v4 - Working with CapacitorAuthProvider')

// Run immediately when the file loads
if (typeof window !== 'undefined') {
    console.log('Window is available')

    // Function to check authentication state
    const checkAuthState = async () => {
        if (Capacitor.isNativePlatform()) {
            console.log('Checking auth state on native platform')

            try {
                // Check if we have a session by calling the session endpoint
                // Use current domain since CapacitorAuthProvider handles redirects
                const response = await fetch('/api/auth/session', {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                const session = await response.json();
                console.log('Session check result:', session);

                if (session && session.user) {
                    console.log('User is authenticated:', session.user.email);
                    // Trigger a custom event to notify components
                    window.dispatchEvent(new CustomEvent('capacitor-auth-restored', {
                        detail: { session }
                    }));
                } else {
                    console.log('No active session found');
                }
            } catch (error) {
                console.error('Error checking auth state:', error);
            }
        }
    };

    // Wait for Capacitor to be ready
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, checking Capacitor')

        if (Capacitor.isNativePlatform()) {
            console.log('Is native platform - CapacitorAuthProvider will handle fetch override')

            // Just focus on auth state checking since CapacitorAuthProvider handles fetch
            setTimeout(() => {
                checkAuthState();
            }, 2000);

            // Check when app becomes visible
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    console.log('App became visible, checking auth state');
                    setTimeout(() => {
                        checkAuthState();
                    }, 500);
                }
            });

        } else {
            console.log('Not native platform')
        }
    });

    // Handle app resume events for Capacitor
    if (Capacitor.isNativePlatform()) {
        document.addEventListener('resume', () => {
            console.log('App resumed, checking auth state');
            setTimeout(() => {
                checkAuthState();
            }, 1000);
        });
    }

} else {
    console.log('Window not available')
}