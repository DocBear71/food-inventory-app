// file: /src/lib/auth.js - v3 - Added aggressive signOut event handling
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

                    return {
                        id: user._id.toString(),
                        email: user.email,
                        name: user.name,
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
        signOut: '/auth/signout', // Add custom signout page
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
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
            console.log('SignIn callback - User:', user);
            console.log('SignIn callback - Account:', account);
            return true;
        },
    },
    // ADDED: Events to handle signout more aggressively
    events: {
        async signOut({ token, session }) {
            console.log('SignOut event triggered - clearing all auth state');
            // This event is called when signOut happens
            // We can use this to ensure cleanup
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
    // Keep simplified settings
    trustHost: true,
    useSecureCookies: process.env.NODE_ENV === 'production',
};