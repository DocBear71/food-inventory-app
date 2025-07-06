// file: /src/lib/auth.js - v5 - FIXED: Added admin/tier information to session
console.log('Auth config loading...');
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
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

                    // Get effective tier
                    const effectiveTier = user.getEffectiveTier?.() || 'free';
                    const subscriptionTier = user.subscription?.tier || 'free';

                    // **FIXED: Set isAdmin based on subscription tier**
                    const isAdmin = subscriptionTier === 'admin' || effectiveTier === 'admin' || subscriptionTier === 'platinum' || effectiveTier === 'platinum';

                    // **NEW: Map usage tracking to frontend format**
                    const usageTracking = user.usageTracking || {};
                    const usage = {
                        inventoryItems: usageTracking.totalInventoryItems || 0,
                        monthlyReceiptScans: usageTracking.monthlyReceiptScans || 0,
                        recipeCollections: usageTracking.totalRecipeCollections || 0,
                        savedRecipes: usageTracking.totalSavedRecipes || user.savedRecipes?.length || 0,
                        personalRecipes: usageTracking.totalPersonalRecipes || 0,
                        monthlyUPCScans: usageTracking.monthlyUPCScans || 0
                    };

                    console.log('🔐 Authorizing user:', {
                        id: user._id.toString(),
                        email: user.email,
                        effectiveTier: effectiveTier,
                        subscriptionTier: subscriptionTier,
                        isAdmin: isAdmin,
                        createdAt: user.createdAt,
                        usageTracking: usageTracking,
                        usage: usage
                    });

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
                        createdAt: user.createdAt,  // **NEW: Add createdAt**
                        usage: usage  // **NEW: Add usage data**
                    };
                } catch (error) {
                    console.error('Auth error:', error);
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
        async jwt({ token, user }) {
            if (user) {
                // Store ALL user data in the JWT token
                token.id = user.id;
                token.emailVerified = user.emailVerified;
                token.avatar = user.avatar;
                // ADDED: Store subscription/admin information in JWT
                token.subscriptionTier = user.subscriptionTier;
                token.subscriptionStatus = user.subscriptionStatus;
                token.effectiveTier = user.effectiveTier;
                token.subscription = user.subscription;
                token.isAdmin = user.isAdmin;
                token.roles = user.roles;
                token.createdAt = user.createdAt;  // **ADD THIS**
                token.usage = user.usage;  // **ADD THIS**

                console.log('🎫 JWT token created with data:', {
                    id: token.id,
                    email: token.email,
                    effectiveTier: token.effectiveTier,
                    subscriptionTier: token.subscriptionTier,
                    isAdmin: token.isAdmin,
                    createdAt: token.createdAt,  // **ADD THIS**
                    hasUsage: !!token.usage  // **ADD THIS**
                });
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                // Include ALL data in the session
                session.user.id = token.id;
                session.user.emailVerified = token.emailVerified;
                session.user.avatar = token.avatar;
                // ADDED: Include subscription/admin information in session
                session.user.subscriptionTier = token.subscriptionTier;
                session.user.subscriptionStatus = token.subscriptionStatus;
                session.user.effectiveTier = token.effectiveTier;
                session.user.subscription = token.subscription;
                session.user.isAdmin = token.isAdmin;
                session.user.roles = token.roles;
                session.user.createdAt = token.createdAt;  // **ADD THIS**
                session.user.usage = token.usage;  // **ADD THIS**

                console.log('👤 Session created with data:', {
                    id: session.user.id,
                    email: session.user.email,
                    effectiveTier: session.user.effectiveTier,
                    subscriptionTier: session.user.subscriptionTier,
                    isAdmin: session.user.isAdmin,
                    createdAt: session.user.createdAt,  // **ADD THIS**
                    hasUsage: !!session.user.usage,  // **ADD THIS**
                    allKeys: Object.keys(session.user)
                });

                // **NEW: Store in mobile session storage for cross-platform compatibility**
                if (typeof window !== 'undefined' && session?.user) {
                    try {
                        console.log('💾 Storing session in mobile session from NextAuth callback...');
                        const { MobileSession } = await import('@/lib/mobile-session-simple');
                        const success = await MobileSession.setSession(session);

                        if (success) {
                            console.log('✅ Mobile session stored successfully from NextAuth callback');
                        } else {
                            console.error('❌ Failed to store mobile session from NextAuth callback');
                        }
                    } catch (error) {
                        console.error('💥 Error storing mobile session in NextAuth callback:', error);
                    }
                }
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            console.log('Auth redirect:', url, '→', baseUrl);

            // For sign out, always go to home page
            if (url.includes('signout') || url.includes('signOut')) {
                return '/';
            }

            // For mobile apps, always redirect to dashboard after login
            if (url === '/dashboard' || url.endsWith('/dashboard')) {
                return '/dashboard';
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
        async signIn({ user, account, profile }) {
            console.log('SignIn callback - User:', {
                id: user.id,
                email: user.email,
                effectiveTier: user.effectiveTier,
                isAdmin: user.isAdmin
            });
            console.log('SignIn callback - Account:', account);
            return true;
        },
    },
    events: {
        async signOut({ token, session }) {
            console.log('SignOut event triggered - clearing all auth state');
        },
        async session({ token, session }) {
            // Prevent session restoration after signout
            if (session && session.expires) {
                const now = new Date();
                const expires = new Date(session.expires);
                if (now >= expires) {
                    console.log('Session expired, preventing restoration');
                    return null;
                }
            }
        }
    },
    trustHost: true,
    useSecureCookies: process.env.NODE_ENV === 'production',
};