// file: /src/lib/api-auth.js - Enhanced API authentication for mobile compatibility

import { auth } from '@/lib/auth';
import { User } from '@/lib/models';
import connectDB from '@/lib/mongodb';

export async function getEnhancedSession(request) {
    // 🔍 ADD THIS DEBUG LOGGING HERE
    console.log('🔍 Getting enhanced session for API...', request.url || 'unknown URL');
    console.log('🔍 Request method:', request.method);
    console.log('🔍 Request headers:', Object.fromEntries(request.headers.entries()));

    try {
        // Try NextAuth session first
        const nextAuthSession = await auth();

        if (nextAuthSession?.user?.id) {
            console.log('✅ NextAuth session found:', nextAuthSession.user.email);
            // 🔍 ADD THIS DEBUG LOGGING HERE
            console.log('✅ Returning NextAuth session for:', request.url);
            return {
                user: nextAuthSession.user,
                source: 'nextauth'
            };
        }

        console.log('⚠️ No NextAuth session, checking mobile session...');

        // FIXED: Check for the exact headers your mobile app sends
        const userEmail = request.headers.get('X-User-Email') || request.headers.get('x-user-email');
        const userId = request.headers.get('X-User-ID') || request.headers.get('x-user-id');
        const isAdmin = request.headers.get('X-Is-Admin') || request.headers.get('x-is-admin');
        const mobileSessionHeader = request.headers.get('X-Mobile-Session') || request.headers.get('x-mobile-session');

        console.log('📱 Mobile headers found:', {
            userEmail,
            userId,
            isAdmin,
            hasMobileSession: !!mobileSessionHeader
        });

        // Try mobile session header first
        if (mobileSessionHeader) {
            try {
                const sessionData = JSON.parse(decodeURIComponent(mobileSessionHeader));
                if (sessionData?.user?.id) {
                    console.log('✅ Mobile session found in header:', sessionData.user.email);
                    // 🔍 ADD THIS DEBUG LOGGING HERE
                    console.log('✅ Returning mobile session for:', request.url);
                    return {
                        user: sessionData.user,
                        source: 'mobile-header'
                    };
                }
            } catch (e) {
                console.log('❌ Failed to parse mobile session header:', e);
            }
        }

        // Fallback: use individual headers for admin user
        if (userEmail && userId) {
            console.log('📱 Found user email and ID in headers:', userEmail);

            // Special handling for admin user
            if (userEmail === 'e.g.mckeown@gmail.com') {
                await connectDB();
                const user = await User.findById(userId);

                if (user) {
                    console.log('✅ Admin user found in database via headers');
                    // 🔍 ADD THIS DEBUG LOGGING HERE
                    console.log('✅ Returning admin session for:', request.url);
                    return {
                        user: {
                            id: user._id.toString(),
                            email: user.email,
                            name: user.name,
                            isAdmin: user.isAdmin || isAdmin === 'true',
                            subscriptionTier: user.getEffectiveTier(),
                            effectiveTier: user.getEffectiveTier()
                        },
                        source: 'mobile-admin-headers'
                    };
                }
            }
        }

        // Try to find user by email only
        if (userEmail && !userId) {
            console.log('📱 Found user email, looking up in database:', userEmail);
            await connectDB();
            const user = await User.findOne({ email: userEmail });

            if (user) {
                console.log('✅ User found in database by email');
                // 🔍 ADD THIS DEBUG LOGGING HERE
                console.log('✅ Returning email lookup session for:', request.url);
                return {
                    user: {
                        id: user._id.toString(),
                        email: user.email,
                        name: user.name,
                        isAdmin: user.isAdmin || false,
                        subscriptionTier: user.getEffectiveTier(),
                        effectiveTier: user.getEffectiveTier()
                    },
                    source: 'mobile-email-lookup'
                };
            }
        }

        // 🔍 ADD THIS DEBUG LOGGING HERE
        console.log('❌ No valid session found for:', request.url);
        console.log('❌ Available headers were:', {
            userEmail,
            userId,
            isAdmin,
            hasMobileSession: !!mobileSessionHeader
        });
        return null;

    } catch (error) {
        console.error('❌ Enhanced session error for:', request.url, error);
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