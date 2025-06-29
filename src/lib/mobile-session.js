// file: /src/lib/mobile-session.js
// Mobile session storage using Capacitor Preferences for native apps

let Preferences;

// Initialize Preferences with proper error handling
async function getPreferences() {
    if (Preferences) return Preferences;

    if (typeof window !== 'undefined') {
        try {
            const { Preferences: Prefs } = await import('@capacitor/preferences');
            Preferences = Prefs;
            return Preferences;
        } catch (e) {
            console.log('Capacitor Preferences not available, using localStorage fallback');
            // Fallback to localStorage for web
            Preferences = {
                set: async ({ key, value }) => {
                    localStorage.setItem(key, value);
                },
                get: async ({ key }) => {
                    return { value: localStorage.getItem(key) };
                },
                remove: async ({ key }) => {
                    localStorage.removeItem(key);
                },
                clear: async () => {
                    localStorage.clear();
                }
            };
            return Preferences;
        }
    }

    // Server-side fallback
    return {
        set: async () => {},
        get: async () => ({ value: null }),
        remove: async () => {},
        clear: async () => {}
    };
}

const MOBILE_SESSION_KEY = 'mobile_session';
const MOBILE_SESSION_EXPIRY_KEY = 'mobile_session_expiry';

export const MobileSession = {
    // Store session data securely
    async setSession(sessionData) {
        try {
            if (!sessionData) {
                console.log('No session data to store');
                return false;
            }

            const prefs = await getPreferences();

            // Set expiry to 24 hours from now (matching NextAuth)
            const expiryTime = new Date();
            expiryTime.setHours(expiryTime.getHours() + 24);

            const sessionWithExpiry = {
                ...sessionData,
                expires: expiryTime.toISOString()
            };

            await prefs.set({
                key: MOBILE_SESSION_KEY,
                value: JSON.stringify(sessionWithExpiry)
            });

            await prefs.set({
                key: MOBILE_SESSION_EXPIRY_KEY,
                value: expiryTime.toISOString()
            });

            console.log('Mobile session stored successfully');
            return true;
        } catch (error) {
            console.error('Error storing mobile session:', error);
            return false;
        }
    },

    // Retrieve session data
    async getSession() {
        try {
            const prefs = await getPreferences();
            const { value: sessionData } = await prefs.get({ key: MOBILE_SESSION_KEY });
            const { value: expiryTime } = await prefs.get({ key: MOBILE_SESSION_EXPIRY_KEY });

            if (!sessionData || !expiryTime) {
                console.log('No mobile session found');
                return null;
            }

            // Check if session has expired
            const now = new Date();
            const expiry = new Date(expiryTime);

            if (now >= expiry) {
                console.log('Mobile session expired, clearing...');
                await this.clearSession();
                return null;
            }

            const parsed = JSON.parse(sessionData);
            console.log('Retrieved valid mobile session');
            return parsed;
        } catch (error) {
            console.error('Error retrieving mobile session:', error);
            return null;
        }
    },

    // Clear session data
    async clearSession() {
        try {
            const prefs = await getPreferences();
            await prefs.remove({ key: MOBILE_SESSION_KEY });
            await prefs.remove({ key: MOBILE_SESSION_EXPIRY_KEY });
            console.log('Mobile session cleared');
            return true;
        } catch (error) {
            console.error('Error clearing mobile session:', error);
            return false;
        }
    },

    // Check if session exists and is valid
    async hasValidSession() {
        const session = await this.getSession();
        return session !== null;
    },

    // Update session expiry (for activity-based renewal)
    async renewSession() {
        try {
            const session = await this.getSession();
            if (session) {
                await this.setSession(session);
                console.log('Mobile session renewed');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error renewing mobile session:', error);
            return false;
        }
    }
};