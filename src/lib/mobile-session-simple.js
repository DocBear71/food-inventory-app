// Enhanced mobile-session-simple.js with chunking support to fix truncation

const MOBILE_SESSION_KEY = 'mobile_session';
const MOBILE_SESSION_EXPIRY_KEY = 'mobile_session_expiry';
const MOBILE_SESSION_CHUNKS_KEY = 'mobile_session_chunks';
const CHUNK_SIZE = 700; // Safe chunk size for mobile storage

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

            // Check for chunked data first
            const chunkCount = await storage.get(MOBILE_SESSION_CHUNKS_KEY);
            console.log('📊 Chunk count:', chunkCount);

            if (chunkCount) {
                const chunks = [];
                for (let i = 0; i < parseInt(chunkCount); i++) {
                    const chunk = await storage.get(`${MOBILE_SESSION_KEY}_${i}`);
                    if (chunk) {
                        chunks.push(chunk);
                        console.log(`📦 Chunk ${i}: ${chunk.length} chars`);
                    }
                }
                const fullData = chunks.join('');
                console.log('📦 Reconstructed from chunks:', fullData.length, 'chars');
                
                try {
                    const parsed = JSON.parse(fullData);
                    console.log('📋 Chunked session user:', parsed.user?.email);
                    console.log('📋 Full chunked data:', JSON.stringify(parsed.user, null, 2));
                } catch (e) {
                    console.error('❌ Failed to parse chunked data:', e);
                }
            }

            // Check regular storage
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
                    console.log('Raw session data (first 500 chars):', sessionData.substring(0, 500));
                    console.log('Raw session data (last 100 chars):', sessionData.substring(sessionData.length - 100));
                }
            }

            console.log('🔍 === MOBILE SESSION DEBUG END ===');
            return { sessionData, expiryTime, chunkCount };
        } catch (error) {
            console.error('💥 Debug session error:', error);
            return null;
        }
    },

    // FIXED: Enhanced setSession with automatic chunking
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

            // Create minimal version to reduce size
            const minimalSession = {
                user: {
                    id: sessionData.user?.id,
                    name: sessionData.user?.name,
                    email: sessionData.user?.email,
                    emailVerified: sessionData.user?.emailVerified,
                    avatar: sessionData.user?.avatar,
                    subscriptionTier: sessionData.user?.subscriptionTier,
                    subscriptionStatus: sessionData.user?.subscriptionStatus,
                    effectiveTier: sessionData.user?.effectiveTier,
                    isAdmin: sessionData.user?.isAdmin,
                    // Only essential subscription info
                    subscription: {
                        status: sessionData.user?.subscription?.status,
                        tier: sessionData.user?.subscription?.tier,
                        startDate: sessionData.user?.subscription?.startDate
                    }
                },
                expires: sessionData.expires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            const sessionString = JSON.stringify(minimalSession);
            console.log('📦 Minimal session length:', sessionString.length);

            // Clear any existing chunks first
            await this.clearChunks();

            // If too large, use chunking
            if (sessionString.length > CHUNK_SIZE) {
                console.log('📦 Session too large, using chunking');
                
                const chunks = [];
                for (let i = 0; i < sessionString.length; i += CHUNK_SIZE) {
                    chunks.push(sessionString.slice(i, i + CHUNK_SIZE));
                }

                // Store each chunk
                for (let i = 0; i < chunks.length; i++) {
                    await storage.set(`${MOBILE_SESSION_KEY}_${i}`, chunks[i]);
                    console.log(`📦 Stored chunk ${i}: ${chunks[i].length} chars`);
                }

                // Store metadata
                await storage.set(MOBILE_SESSION_CHUNKS_KEY, chunks.length.toString());
                await storage.set(MOBILE_SESSION_EXPIRY_KEY, minimalSession.expires);

                console.log(`✅ Session stored in ${chunks.length} chunks`);
            } else {
                // Store normally
                await storage.set(MOBILE_SESSION_KEY, sessionString);
                await storage.set(MOBILE_SESSION_EXPIRY_KEY, minimalSession.expires);
                console.log('✅ Session stored normally');
            }

            // Verify storage worked
            console.log('🔍 Verifying stored data...');
            await this.debugSession();

            return true;
        } catch (error) {
            console.error('💥 Error storing mobile session:', error);
            return false;
        }
    },

    // FIXED: Enhanced getSession with chunking support
    async getSession() {
        try {
            console.log('📖 === RETRIEVING MOBILE SESSION ===');

            // Check for chunked data first
            const chunkCountStr = await storage.get(MOBILE_SESSION_CHUNKS_KEY);
            
            if (chunkCountStr) {
                console.log('📦 Found chunked session data');
                const chunkCount = parseInt(chunkCountStr);
                const chunks = [];

                for (let i = 0; i < chunkCount; i++) {
                    const chunk = await storage.get(`${MOBILE_SESSION_KEY}_${i}`);
                    if (!chunk) {
                        console.error(`❌ Missing chunk ${i} of ${chunkCount}`);
                        // Clear corrupted chunked data
                        await this.clearChunks();
                        return null;
                    }
                    chunks.push(chunk);
                }

                const fullSessionString = chunks.join('');
                console.log(`📦 Reconstructed session: ${fullSessionString.length} chars from ${chunkCount} chunks`);

                // Check expiry
                const expiryTime = await storage.get(MOBILE_SESSION_EXPIRY_KEY);
                if (expiryTime && new Date() >= new Date(expiryTime)) {
                    console.log('⏰ Chunked session expired');
                    await this.clearSession();
                    return null;
                }

                try {
                    const parsed = JSON.parse(fullSessionString);
                    console.log('✅ Successfully parsed chunked session for:', parsed.user?.email);
                    return parsed;
                } catch (parseError) {
                    console.error('❌ Failed to parse chunked session:', parseError);
                    await this.clearChunks();
                    return null;
                }
            }

            // Fallback to regular storage
            const sessionData = await storage.get(MOBILE_SESSION_KEY);
            const expiryTime = await storage.get(MOBILE_SESSION_EXPIRY_KEY);

            if (!sessionData || !expiryTime) {
                console.log('❌ No mobile session found (missing data or expiry)');
                return null;
            }

            // Check expiry
            if (new Date() >= new Date(expiryTime)) {
                console.log('⏰ Mobile session expired, clearing...');
                await this.clearSession();
                return null;
            }

            const parsed = JSON.parse(sessionData);
            console.log('📋 Retrieved regular session data:');
            console.log('- User email:', parsed.user?.email);
            console.log('- Subscription tier:', parsed.user?.subscriptionTier);
            console.log('- Effective tier:', parsed.user?.effectiveTier);
            console.log('- Is admin:', parsed.user?.isAdmin);

            console.log('✅ Valid mobile session retrieved');
            return parsed;
        } catch (error) {
            console.error('💥 Error retrieving mobile session:', error);
            return null;
        }
    },

    // Helper to clear chunked data
    async clearChunks() {
        try {
            const chunkCountStr = await storage.get(MOBILE_SESSION_CHUNKS_KEY);
            if (chunkCountStr) {
                const chunkCount = parseInt(chunkCountStr);
                for (let i = 0; i < chunkCount; i++) {
                    await storage.remove(`${MOBILE_SESSION_KEY}_${i}`);
                }
                await storage.remove(MOBILE_SESSION_CHUNKS_KEY);
                console.log(`🗑️ Cleared ${chunkCount} chunks`);
            }
        } catch (error) {
            console.error('💥 Error clearing chunks:', error);
        }
    },

    async clearSession() {
        try {
            console.log('🗑️ Clearing mobile session...');

            // Clear chunked data
            await this.clearChunks();

            // Clear regular data
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