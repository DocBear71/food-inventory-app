// file: /src/lib/auth.js - NextAuth v5 configuration with working mobile CSRF bypass

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

console.log('NextAuth v5 config loading...');

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials, request) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    await connectDB();

                    const user = await User.findOne({ email: credentials.email });

                    if (!user) {
                        return null;
                    }

                    const isPasswordValid = await bcrypt.compare(
                        credentials.password,
                        user.password
                    );

                    if (!isPasswordValid) {
                        return null;
                    }

                    // Check and expire trial FIRST, before determining admin status
                    const trialExpired = user.checkAndExpireTrial();
                    const usageReset = user.checkAndResetMonthlyUsage();

                    // Save if either trial expired or usage was reset
                    if (trialExpired || usageReset) {
                        await user.save();
                        if (trialExpired) {
                            console.log(`⏰ Trial expired and user downgraded to free: ${user.email}`);
                        }
                        if (usageReset) {
                            console.log(`🔄 Monthly usage reset applied for ${user.email}`);
                        }
                    }

                    // Get effective tier AFTER potential trial expiration
                    const effectiveTier = user.getEffectiveTier?.() || 'free';
                    const subscriptionTier = user.subscription?.tier || 'free';

                    // Proper admin determination
                    const isAdmin = user.isAdmin === true ||
                        effectiveTier === 'admin' ||
                        (effectiveTier === 'platinum' && user.subscription?.status === 'active');

                    console.log('🔐 Authorizing user (v5):', {
                        id: user._id.toString(),
                        email: user.email,
                        effectiveTier: effectiveTier,
                        subscriptionTier: subscriptionTier,
                        subscriptionStatus: user.subscription?.status,
                        isAdmin: isAdmin,
                        trialExpired: trialExpired
                    });

                    // Map usage tracking to frontend format
                    const usageTracking = user.usageTracking || {};

                    const usage = {
                        monthlyReceiptScans: usageTracking.monthlyReceiptScans || 0,
                        monthlyUPCScans: usageTracking.monthlyUPCScans || 0,
                        totalInventoryItems: usageTracking.totalInventoryItems || 0,
                        totalPersonalRecipes: usageTracking.totalPersonalRecipes || 0,
                        totalRecipeCollections: usageTracking.totalRecipeCollections || 0,
                        totalSavedRecipes: usageTracking.totalSavedRecipes || user.savedRecipes?.length || 0,
                        // Backwards compatibility
                        inventoryItems: usageTracking.totalInventoryItems || 0,
                        recipeCollections: usageTracking.totalRecipeCollections || 0,
                        savedRecipes: usageTracking.totalSavedRecipes || user.savedRecipes?.length || 0
                    };

                    return {
                        id: user._id.toString(),
                        email: user.email,
                        name: user.name,
                        emailVerified: user.emailVerified || false,
                        avatar: user.avatar || '',
                        subscriptionTier: subscriptionTier,
                        subscriptionStatus: user.subscription?.status || 'free',
                        effectiveTier: effectiveTier,
                        subscription: user.subscription || null,
                        isAdmin: isAdmin,
                        roles: user.roles || [],
                        createdAt: user.createdAt,
                        usage: usage
                    };
                } catch (error) {
                    console.error('Auth error (v5):', error);
                    return null;
                }
            }
        })
    ],
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 24 hours
    },
    
    pages: {
        signIn: '/auth/signin',
        signUp: '/auth/signup',
        signOut: '/auth/signout',
    },
    
    callbacks: {
        async jwt({ token, user, account, profile, trigger }) {
            if (user) {
                token.id = user.id;
                token.emailVerified = user.emailVerified;
                token.avatar = user.avatar;
                token.subscriptionTier = user.subscriptionTier;
                token.subscriptionStatus = user.subscriptionStatus;
                token.effectiveTier = user.effectiveTier;
                token.subscription = user.subscription;
                token.isAdmin = user.isAdmin;
                token.roles = user.roles;
                token.createdAt = user.createdAt;
                token.usage = user.usage;

                console.log('🎫 JWT token created (v5):', {
                    id: token.id,
                    email: token.email,
                    effectiveTier: token.effectiveTier,
                    subscriptionTier: token.subscriptionTier,
                    isAdmin: token.isAdmin,
                    createdAt: token.createdAt,
                    hasUsage: !!token.usage
                });
            }
            return token;
        },
        
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.emailVerified = token.emailVerified;
                session.user.avatar = token.avatar;
                session.user.subscriptionTier = token.subscriptionTier;
                session.user.subscriptionStatus = token.subscriptionStatus;
                session.user.effectiveTier = token.effectiveTier;
                session.user.subscription = token.subscription;
                session.user.isAdmin = token.isAdmin;
                session.user.roles = token.roles;
                session.user.createdAt = token.createdAt;
                session.user.usage = token.usage;

                console.log('👤 Session created (v5):', {
                    id: session.user.id,
                    email: session.user.email,
                    effectiveTier: session.user.effectiveTier,
                    subscriptionTier: session.user.subscriptionTier,
                    isAdmin: session.user.isAdmin,
                    createdAt: session.user.createdAt,
                    hasUsage: !!session.user.usage,
                    allKeys: Object.keys(session.user)
                });

                // Store in mobile session storage for cross-platform compatibility
                if (typeof window !== 'undefined' && session?.user) {
                    try {
                        console.log('💾 Storing session in mobile session from NextAuth v5 callback...');
                        const { MobileSession } = await import('@/lib/mobile-session-simple');
                        const success = await MobileSession.setSession(session);

                        if (success) {
                            console.log('✅ Mobile session stored successfully from NextAuth v5 callback');
                        } else {
                            console.error('❌ Failed to store mobile session from NextAuth v5 callback');
                        }
                    } catch (error) {
                        console.error('💥 Error storing mobile session in NextAuth v5 callback:', error);
                    }
                }
            }
            return session;
        },
        
        async redirect({ url, baseUrl }) {
            console.log('Auth redirect (v5):', url, '→', baseUrl);

            // Handle mobile app redirects
            if (url.includes('?error=MissingCSRF')) {
                console.log('🔧 CSRF error detected, redirecting to sign in');
                return `${baseUrl}/auth/signin`;
            }

            if (url.includes('signout') || url.includes('signOut')) {
                return baseUrl;
            }

            if (url === '/dashboard' || url.endsWith('/dashboard')) {
                return `${baseUrl}/dashboard`;
            }

            if (url.startsWith('/')) {
                return `${baseUrl}${url}`;
            }

            if (url.startsWith(baseUrl)) {
                return url;
            }

            return `${baseUrl}/dashboard`;
        },
        
        async signIn({ user, account, profile, email, credentials }) {
            console.log('SignIn callback (v5) - User:', {
                id: user.id,
                email: user.email,
                effectiveTier: user.effectiveTier,
                isAdmin: user.isAdmin
            });
            console.log('SignIn callback (v5) - Account:', account);
            
            // Additional mobile app validation can go here
            return true;
        },
    },
    
    events: {
        async signOut({ token, session }) {
            console.log('SignOut event triggered (v5) - clearing all auth state');
            
            // Clear mobile session storage on sign out
            if (typeof window !== 'undefined') {
                try {
                    const { MobileSession } = await import('@/lib/mobile-session-simple');
                    await MobileSession.clearSession();
                    console.log('📱 Mobile session cleared on sign out');
                } catch (error) {
                    console.error('Error clearing mobile session:', error);
                }
            }
        },
        
        async session({ token, session }) {
            if (session && session.expires) {
                const now = new Date();
                const expires = new Date(session.expires);
                if (now >= expires) {
                    console.log('Session expired (v5), preventing restoration');
                    return null;
                }
            }
        }
    },
    
    // MOBILE PRODUCTION FIX: Enhanced configuration
    trustHost: true,
    useSecureCookies: process.env.NODE_ENV === 'production',
    
    // Add debug mode for development
    debug: process.env.NODE_ENV === 'development',
});