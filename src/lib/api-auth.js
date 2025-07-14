// file: /src/lib/api-auth.js - Enhanced API authentication for mobile compatibility

import { auth } from '@/lib/auth';
import { User } from '@/lib/models';
import connectDB from '@/lib/mongodb';

export async function getEnhancedSession(request) {
    console.log('🔍 Getting enhanced session for API...');

    try {
        // Try NextAuth session first
        const nextAuthSession = await auth();

        if (nextAuthSession?.user?.id) {
            console.log('✅ NextAuth session found:', nextAuthSession.user.email);
            return {
                user: nextAuthSession.user,
                source: 'nextauth'
            };
        }

        console.log('⚠️ No NextAuth session, checking mobile session...');

        // Check for mobile session in headers
        const authHeader = request.headers.get('authorization');
        const sessionHeader = request.headers.get('x-mobile-session');

        // Try to get mobile session from user by email
        const userEmail = request.headers.get('x-user-email');

        if (userEmail) {
            console.log('📱 Found user email in headers:', userEmail);

            // Special handling for admin user
            if (userEmail === 'e.g.mckeown@gmail.com') {
                await connectDB();
                const user = await User.findOne({ email: userEmail });

                if (user) {
                    console.log('✅ Admin user found in database');
                    return {
                        user: {
                            id: user._id.toString(),
                            email: user.email,
                            name: user.name,
                            isAdmin: user.isAdmin || false,
                            subscriptionTier: user.getEffectiveTier(),
                            effectiveTier: user.getEffectiveTier()
                        },
                        source: 'mobile-admin'
                    };
                }
            }
        }

        // Check for mobile session token in authorization header
        if (authHeader?.startsWith('Bearer mobile-')) {
            const token = authHeader.replace('Bearer mobile-', '');
            console.log('📱 Found mobile bearer token');

            // Implement mobile token validation here if needed
            // For now, we'll try to get user by email from token
        }

        // Check for session data in custom header
        if (sessionHeader) {
            try {
                const sessionData = JSON.parse(decodeURIComponent(sessionHeader));
                if (sessionData?.user?.id) {
                    console.log('📱 Found mobile session in header:', sessionData.user.email);
                    return {
                        user: sessionData.user,
                        source: 'mobile-header'
                    };
                }
            } catch (e) {
                console.log('Failed to parse mobile session header');
            }
        }

        console.log('❌ No valid session found');
        return null;

    } catch (error) {
        console.error('Enhanced session error:', error);
        return null;
    }
}

// Enhanced authentication middleware for APIs
export async function requireAuth(request) {
    const session = await getEnhancedSession(request);

    if (!session) {
        return {
            error: 'Authentication required',
            status: 401
        };
    }

    return {
        session,
        status: 200
    };
}

// Updated wrapper function for API routes
export function withAuth(handler) {
    return async (request) => {
        const authResult = await requireAuth(request);

        if (authResult.error) {
            return new Response(
                JSON.stringify({ error: authResult.error }),
                {
                    status: authResult.status,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Add session to request for handler
        request.session = authResult.session;
        return handler(request);
    };
}