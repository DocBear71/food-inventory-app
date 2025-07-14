// file: /src/lib/auth-simple.js - Test configuration to isolate the issue

import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

console.log('Simple auth config loading...');

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                console.log('Simple auth - credentials received:', credentials);

                // Simple test - just return a dummy user
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
                token.id = user.id;
                token.effectiveTier = user.effectiveTier;
                token.subscriptionTier = user.subscriptionTier;
                token.isAdmin = user.isAdmin;

                console.log('Simple JWT token created:', {
                    id: token.id,
                    email: token.email,
                    effectiveTier: token.effectiveTier
                });
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.effectiveTier = token.effectiveTier;
                session.user.subscriptionTier = token.subscriptionTier;
                session.user.isAdmin = token.isAdmin;

                console.log('Simple session created:', {
                    id: session.user.id,
                    email: session.user.email,
                    effectiveTier: session.user.effectiveTier
                });
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            console.log('Simple auth redirect:', url, '→', baseUrl);

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
            console.log('Simple SignIn callback - User:', {
                id: user.id,
                email: user.email,
                effectiveTier: user.effectiveTier
            });
            return true;
        },
    },
    trustHost: true,
    useSecureCookies: process.env.NODE_ENV === 'production',
};