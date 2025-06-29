// Enhanced mobile-session-simple.js with complete debugging

const MOBILE_SESSION_KEY = 'mobile_session';
const MOBILE_SESSION_EXPIRY_KEY = 'mobile_session_expiry';

// Simple wrapper that handles both Capacitor and localStorage
class SimpleStorage {
    constructor() {
        this.isCapacitor = false;
        this.preferences = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            if (typeof window === 'undefined') {
                console.log('🖥️ Server environment, using no-op storage');
                this.isCapacitor = false;
                this.initialized = true;
                return;
            }

            // Try to load Capacitor Preferences
            const { Preferences } = await import('@capacitor/preferences');
            const { Capacitor } = await import('@capacitor/core');

            if (Capacitor.isNativePlatform()) {
                console.log('📱 Native platform detected, using Capacitor Preferences');
                this.preferences = Preferences;
                this.isCapacitor = true;
            } else {
                console.log('🌐 Web platform detected, using localStorage');
                this.isCapacitor = false;
            }
        } catch (error) {
            console.log('⚠️ Capacitor not available, using localStorage:', error.message);
            this.isCapacitor = false;
        }

        this.initialized = true;
    }

    async set(key, value) {
        await this.init();

        try {
            if (this.isCapacitor && this.preferences) {
                console.log(`📱 Capacitor set: ${key} (length: ${value?.length || 0})`);
                return await this.preferences.set({ key, value });
            } else {
                console.log(`🌐 localStorage set: ${key} (length: ${value?.length || 0})`);
                localStorage.setItem(key, value);
                return Promise.resolve();
            }
        } catch (error) {
            console.error(`💥 Error setting ${key}:`, error);
            // Fallback to localStorage
            localStorage.setItem(key, value);
        }
    }

    async get(key) {
        await this.init();

        try {
            if (this.isCapacitor && this.preferences) {
                console.log(`📱 Capacitor get: ${key}`);
                const result = await this.preferences.get({ key });
                console.log(`📱 Capacitor get result: ${key} = ${result.value ? 'found' : 'null'} (length: ${result.value?.length || 0})`);
                return result.value;
            } else {
                console.log(`🌐 localStorage get: ${key}`);
                const result = localStorage.getItem(key);
                console.log(`🌐 localStorage get result: ${key} = ${result ? 'found' : 'null'} (length: ${result?.length || 0})`);
                return result;
            }
        } catch (error) {
            console.error(`💥 Error getting ${key}:`, error);
            // Fallback to localStorage
            return localStorage.getItem(key);
        }
    }

    async remove(key) {
        await this.init();

        try {
            if (this.isCapacitor && this.preferences) {
                console.log(`📱 Capacitor remove: ${key}`);
                return await this.preferences.remove({ key });
            } else {
                console.log(`🌐 localStorage remove: ${key}`);
                localStorage.removeItem(key);
                return Promise.resolve();
            }
        } catch (error) {
            console.error(`💥 Error removing ${key}:`, error);
            // Fallback to localStorage
            localStorage.removeItem(key);
        }
    }

    async clear() {
        await this.init();

        try {
            if (this.isCapacitor && this.preferences) {
                console.log('📱 Capacitor clear all');
                return await this.preferences.clear();
            } else {
                console.log('🌐 localStorage clear all');
                localStorage.clear();
                return Promise.resolve();
            }
        } catch (error) {
            console.error('💥 Error clearing storage:', error);
            // Fallback to localStorage
            localStorage.clear();
        }
    }
}

// Create a single instance
const storage = new SimpleStorage();

export const MobileSession = {
    // Enhanced debug function
    async debugSession() {
        try {
            console.log('🔍 === MOBILE SESSION DEBUG START ===');

            const sessionData = await storage.get(MOBILE_SESSION_KEY);
            const expiryTime = await storage.get(MOBILE_SESSION_EXPIRY_KEY);

            console.log('📊 Raw storage data:');
            console.log('- Session data exists:', !!sessionData);
            console.log('- Session data length:', sessionData?.length || 0);
            console.log('- Expiry data exists:', !!expiryTime);

            if (sessionData) {
                try {
                    const parsed = JSON.parse(sessionData);
                    console.log('📋 Parsed session data:');
                    console.log('- User ID:', parsed.user?.id);
                    console.log('- User name:', parsed.user?.name);
                    console.log('- User email:', parsed.user?.email);
                    console.log('- Email verified:', parsed.user?.emailVerified);
                    console.log('- Avatar:', parsed.user?.avatar);
                    console.log('- Subscription tier:', parsed.user?.subscriptionTier);
                    console.log('- Subscription status:', parsed.user?.subscriptionStatus);
                    console.log('- Effective tier:', parsed.user?.effectiveTier);
                    console.log('- Is admin:', parsed.user?.isAdmin);
                    console.log('- Subscription object:', parsed.user?.subscription);
                    console.log('- Session expires:', parsed.expires);
                    console.log('- All user keys:', Object.keys(parsed.user || {}));
                    console.log('- Full user object:', JSON.stringify(parsed.user, null, 2));
                } catch (parseError) {
                    console.error('💥 Failed to parse session data:', parseError);
                    console.log('Raw session data:', sessionData.substring(0, 500));
                }
            }

            console.log('🔍 === MOBILE SESSION DEBUG END ===');
            return { sessionData, expiryTime };
        } catch (error) {
            console.error('💥 Debug session error:', error);
            return null;
        }
    },

    // Enhanced setSession with complete logging
    async setSession(sessionData) {
        try {
            if (!sessionData) {
                console.log('❌ No session data to store');
                return false;
            }

            console.log('💾 === STORING MOBILE SESSION ===');
            console.log('📋 Input session data:');
            console.log('- User email:', sessionData.user?.email);
            console.log('- User ID:', sessionData.user?.id);
            console.log('- Subscription tier:', sessionData.user?.subscriptionTier);
            console.log('- Subscription status:', sessionData.user?.subscriptionStatus);
            console.log('- Effective tier:', sessionData.user?.effectiveTier);
            console.log('- Is admin:', sessionData.user?.isAdmin);
            console.log('- All user keys:', Object.keys(sessionData.user || {}));
            console.log('- Full user object to store:', JSON.stringify(sessionData.user, null, 2));

            // Set expiry to 24 hours from now (matching NextAuth)
            const expiryTime = new Date();
            expiryTime.setHours(expiryTime.getHours() + 24);

            const sessionWithExpiry = {
                ...sessionData,
                expires: expiryTime.toISOString()
            };

            const sessionString = JSON.stringify(sessionWithExpiry);
            console.log('📦 Serialized session length:', sessionString.length);

            // Store both pieces of data
            await storage.set(MOBILE_SESSION_KEY, sessionString);
            await storage.set(MOBILE_SESSION_EXPIRY_KEY, expiryTime.toISOString());

            console.log('✅ Mobile session stored successfully');

            // VERIFY what was actually stored
            console.log('🔍 Verifying stored data...');
            const verification = await this.debugSession();

            return true;
        } catch (error) {
            console.error('💥 Error storing mobile session:', error);
            return false;
        }
    },

    // Enhanced getSession with complete logging
    async getSession() {
        try {
            console.log('📖 === RETRIEVING MOBILE SESSION ===');

            const sessionData = await storage.get(MOBILE_SESSION_KEY);
            const expiryTime = await storage.get(MOBILE_SESSION_EXPIRY_KEY);

            if (!sessionData || !expiryTime) {
                console.log('❌ No mobile session found (missing data or expiry)');
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
            console.log('📋 Retrieved session data:');
            console.log('- User email:', parsed.user?.email);
            console.log('- Subscription tier:', parsed.user?.subscriptionTier);
            console.log('- Effective tier:', parsed.user?.effectiveTier);
            console.log('- Is admin:', parsed.user?.isAdmin);
            console.log('- All user keys in retrieved session:', Object.keys(parsed.user || {}));

            console.log('✅ Valid mobile session retrieved');
            return parsed;
        } catch (error) {
            console.error('💥 Error retrieving mobile session:', error);
            return null;
        }
    },

    // Rest of your methods stay the same...
    async clearSession() {
        try {
            console.log('🗑️ Clearing mobile session...');

            await storage.remove(MOBILE_SESSION_KEY);
            await storage.remove(MOBILE_SESSION_EXPIRY_KEY);

            console.log('✅ Mobile session cleared');
            return true;
        } catch (error) {
            console.error('💥 Error clearing mobile session:', error);
            return false;
        }
    },

    async hasValidSession() {
        const session = await this.getSession();
        const hasSession = session !== null;
        console.log('🔍 Has valid session:', hasSession);
        return hasSession;
    },

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