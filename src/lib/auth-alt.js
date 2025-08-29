// file: /src/lib/auth-alt.js - Alternative import approach

import NextAuth from 'next-auth';
// Try different import approaches

// Method 3: Dynamic import
import mod from "next-auth/providers/credentials";

let CredentialsProvider;

try {
    // Method 1: Direct import
    CredentialsProvider = mod.default;
} catch (e1) {
    try {
        // Method 2: Named import
        CredentialsProvider = mod.default || mod.CredentialsProvider;
    } catch (e2) {
        try {
            CredentialsProvider = mod.default || mod;
        } catch (e3) {
            console.error('Failed to import CredentialsProvider:', e1, e2, e3);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Credintials Provider Failed',
                message: 'Cannot import CredentialsProvider'
            });
            return;
        }
    }
}

console.log('Alternative auth config loading... CredentialsProvider:', typeof CredentialsProvider);

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                console.log('Alt auth - credentials received:', credentials);

                // Simple test
                if (credentials?.email === 'test@test.com' && credentials?.password === 'password') {
                    return {
                        id: '1',
                        email: 'test@test.com',
                        name: 'Test User',
                        effectiveTier: 'free',
                        subscriptionTier: 'free',
                        isAdmin: false
                    };
                }
                return null;
            }
        })
    ],
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60,
    },
    pages: {
        signIn: '/auth/signin',
        signUp: '/auth/signup',
        signOut: '/auth/signout',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.effectiveTier = user.effectiveTier;
                token.subscriptionTier = user.subscriptionTier;
                token.isAdmin = user.isAdmin;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.effectiveTier = token.effectiveTier;
                session.user.subscriptionTier = token.subscriptionTier;
                session.user.isAdmin = token.isAdmin;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            if (url.includes('signout') || url.includes('signOut')) {
                return '/';
            }
            if (url === '/dashboard' || url.endsWith('/dashboard')) {
                return '/dashboard';
            }
            if (url.startsWith('/')) {
                return url;
            }
            if (url.startsWith(baseUrl)) {
                return url;
            }
            return '/dashboard';
        },
        async signIn({ user, account, profile }) {
            return true;
        },
    },
    trustHost: true,
    useSecureCookies: process.env.NODE_ENV === 'production',
};