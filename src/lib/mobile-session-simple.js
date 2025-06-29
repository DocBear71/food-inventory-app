// file: /src/lib/mobile-session-simple.js
// Simplified mobile session that definitely works on Android

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
                console.log(`📱 Capacitor set: ${key}`);
                return await this.preferences.set({ key, value });
            } else {
                console.log(`🌐 localStorage set: ${key}`);
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
                return result.value;
            } else {
                console.log(`🌐 localStorage get: ${key}`);
                return localStorage.getItem(key);
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
    // Store session data securely
    async setSession(sessionData) {
        try {
            if (!sessionData) {
                console.log('❌ No session data to store');
                return false;
            }

            console.log('💾 Storing mobile session for user:', sessionData.user?.email);

            // Set expiry to 24 hours from now (matching NextAuth)
            const expiryTime = new Date();
            expiryTime.setHours(expiryTime.getHours() + 24);

            const sessionWithExpiry = {
                ...sessionData,
                expires: expiryTime.toISOString()
            };

            // Store both pieces of data
            await storage.set(MOBILE_SESSION_KEY, JSON.stringify(sessionWithExpiry));
            await storage.set(MOBILE_SESSION_EXPIRY_KEY, expiryTime.toISOString());

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

            const sessionData = await storage.get(MOBILE_SESSION_KEY);
            const expiryTime = await storage.get(MOBILE_SESSION_EXPIRY_KEY);

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

            await storage.remove(MOBILE_SESSION_KEY);
            await storage.remove(MOBILE_SESSION_EXPIRY_KEY);

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