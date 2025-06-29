// file: /src/lib/mobile-session.js
// Mobile session storage using Capacitor Preferences for native apps - FIXED for Android

let Preferences = null;
let isInitialized = false;

// Initialize Preferences with proper error handling
async function initializePreferences() {
    if (isInitialized) return Preferences;

    if (typeof window !== 'undefined') {
        try {
            console.log('🔧 Initializing Capacitor Preferences...');
            const capacitorModule = await import('@capacitor/preferences');
            Preferences = capacitorModule.Preferences;
            console.log('✅ Capacitor Preferences loaded successfully');
            isInitialized = true;
            return Preferences;
        } catch (e) {
            console.log('⚠️ Capacitor Preferences not available, using localStorage fallback:', e);
            // Fallback to localStorage for web
            Preferences = {
                set: async ({ key, value }) => {
                    console.log('📝 localStorage.setItem:', key);
                    localStorage.setItem(key, value);
                    return Promise.resolve();
                },
                get: async ({ key }) => {
                    const value = localStorage.getItem(key);
                    console.log('📖 localStorage.getItem:', key, '=', value ? 'found' : 'null');
                    return Promise.resolve({ value });
                },
                remove: async ({ key }) => {
                    console.log('🗑️ localStorage.removeItem:', key);
                    localStorage.removeItem(key);
                    return Promise.resolve();
                },
                clear: async () => {
                    console.log('🗑️ localStorage.clear()');
                    localStorage.clear();
                    return Promise.resolve();
                }
            };
            isInitialized = true;
            return Preferences;
        }
    }

    // Server-side fallback
    console.log('🖥️ Server-side environment, using no-op preferences');
    Preferences = {
        set: async () => Promise.resolve(),
        get: async () => Promise.resolve({ value: null }),
        remove: async () => Promise.resolve(),
        clear: async () => Promise.resolve()
    };
    isInitialized = true;
    return Preferences;
}

const MOBILE_SESSION_KEY = 'mobile_session';
const MOBILE_SESSION_EXPIRY_KEY = 'mobile_session_expiry';

export const MobileSession = {
    // Store session data securely
    async setSession(sessionData) {
        try {
            if (!sessionData) {
                console.log('❌ No session data to store');
                return false;
            }

            console.log('💾 Storing mobile session for user:', sessionData.user?.email);
            const prefs = await initializePreferences();

            // Set expiry to 24 hours from now (matching NextAuth)
            const expiryTime = new Date();
            expiryTime.setHours(expiryTime.getHours() + 24);

            const sessionWithExpiry = {
                ...sessionData,
                expires: expiryTime.toISOString()
            };

            // FIXED: Properly await each operation
            await prefs.set({
                key: MOBILE_SESSION_KEY,
                value: JSON.stringify(sessionWithExpiry)
            });

            await prefs.set({
                key: MOBILE_SESSION_EXPIRY_KEY,
                value: expiryTime.toISOString()
            });

            console.log('✅ Mobile session stored successfully');
            return true;
        } catch (error) {
            console.error('💥 Error storing mobile session:', error);
            return false;
        }
    },

    // Retrieve session data
    async getSession() {
        try {
            console.log('📖 Retrieving mobile session...');
            const prefs = await initializePreferences();

            // FIXED: Properly await each operation
            const sessionResult = await prefs.get({ key: MOBILE_SESSION_KEY });
            const expiryResult = await prefs.get({ key: MOBILE_SESSION_EXPIRY_KEY });

            const sessionData = sessionResult.value;
            const expiryTime = expiryResult.value;

            if (!sessionData || !expiryTime) {
                console.log('❌ No mobile session found');
                return null;
            }

            // Check if session has expired
            const now = new Date();
            const expiry = new Date(expiryTime);

            if (now >= expiry) {
                console.log('⏰ Mobile session expired, clearing...');
                await this.clearSession();
                return null;
            }

            const parsed = JSON.parse(sessionData);
            console.log('✅ Retrieved valid mobile session for:', parsed.user?.email);
            return parsed;
        } catch (error) {
            console.error('💥 Error retrieving mobile session:', error);
            return null;
        }
    },

    // Clear session data
    async clearSession() {
        try {
            console.log('🗑️ Clearing mobile session...');
            const prefs = await initializePreferences();

            // FIXED: Properly await each operation
            await prefs.remove({ key: MOBILE_SESSION_KEY });
            await prefs.remove({ key: MOBILE_SESSION_EXPIRY_KEY });

            console.log('✅ Mobile session cleared');
            return true;
        } catch (error) {
            console.error('💥 Error clearing mobile session:', error);
            return false;
        }
    },

    // Check if session exists and is valid
    async hasValidSession() {
        const session = await this.getSession();
        const hasSession = session !== null;
        console.log('🔍 Has valid session:', hasSession);
        return hasSession;
    },

    // Update session expiry (for activity-based renewal)
    async renewSession() {
        try {
            console.log('🔄 Renewing mobile session...');
            const session = await this.getSession();
            if (session) {
                await this.setSession(session);
                console.log('✅ Mobile session renewed');
                return true;
            }
            console.log('❌ No session to renew');
            return false;
        } catch (error) {
            console.error('💥 Error renewing mobile session:', error);
            return false;
        }
    }
};