// file: /src/lib/api-auth.js - Enhanced API authentication with better error handling

import { auth } from '@/lib/auth';
import { User } from '@/lib/models';
import connectDB from '@/lib/mongodb';

export async function getEnhancedSession(request) {
    try {
        console.log('🔍 Getting enhanced session for API...', request?.url || 'unknown URL');
        console.log('🔍 Request method:', request?.method);
        
        // FIXED: Safely extract headers to avoid entries() errors
        let headers = {};
        try {
            if (request?.headers) {
                // Use for...of instead of entries() to avoid potential errors
                for (const [key, value] of request.headers) {
                    headers[key] = value;
                }
            }
        } catch (headerError) {
            console.warn('⚠️ Error reading request headers:', headerError.message);
            headers = {}; // Continue with empty headers
        }
        
        // Only log essential headers for debugging
        const debugHeaders = {
            'user-agent': headers['user-agent'],
            'x-user-email': headers['x-user-email'],
            'x-user-id': headers['x-user-id'],
            'x-is-admin': headers['x-is-admin'],
            'x-mobile-session': headers['x-mobile-session'] ? '[present]' : undefined
        };
        console.log('🔍 Request headers:', debugHeaders);

        // Try NextAuth session first
        const nextAuthSession = await auth();

        if (nextAuthSession?.user?.id) {
            console.log('✅ NextAuth session found:', nextAuthSession.user.email);
            console.log('✅ Returning NextAuth session for:', request?.url);
            return {
                user: nextAuthSession.user,
                source: 'nextauth'
            };
        }

        console.log('⚠️ No NextAuth session, checking mobile session...');

        // FIXED: Safe header extraction
        const userEmail = headers['x-user-email'] || headers['X-User-Email'];
        const userId = headers['x-user-id'] || headers['X-User-ID']; 
        const isAdmin = headers['x-is-admin'] || headers['X-Is-Admin'];
        const mobileSessionHeader = headers['x-mobile-session'] || headers['X-Mobile-Session'];

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
                    console.log('✅ Returning mobile session for:', request?.url);
                    return {
                        user: sessionData.user,
                        source: 'mobile-header'
                    };
                }
            } catch (parseError) {
                console.log('❌ Failed to parse mobile session header:', parseError.message);
            }
        }

        // Fallback: use individual headers for admin user
        if (userEmail && userId) {
            console.log('📱 Found user email and ID in headers:', userEmail);

            try {
                await connectDB();
                
                // Special handling for admin user
                if (userEmail === 'e.g.mckeown@gmail.com') {
                    const user = await User.findById(userId);

                    if (user) {
                        console.log('✅ Admin user found in database via headers');
                        console.log('✅ Returning admin session for:', request?.url);
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

                // Try to find any user by email
                const user = await User.findOne({ email: userEmail });
                if (user) {
                    console.log('✅ User found in database by email');
                    console.log('✅ Returning email lookup session for:', request?.url);
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
            } catch (dbError) {
                console.error('❌ Database lookup error:', dbError.message);
            }
        }

        // Try to find user by email only (if no userId provided)
        if (userEmail && !userId) {
            console.log('📱 Found user email only, looking up in database:', userEmail);
            try {
                await connectDB();
                const user = await User.findOne({ email: userEmail });

                if (user) {
                    console.log('✅ User found in database by email only');
                    console.log('✅ Returning email-only lookup session for:', request?.url);
                    return {
                        user: {
                            id: user._id.toString(),
                            email: user.email,
                            name: user.name,
                            isAdmin: user.isAdmin || false,
                            subscriptionTier: user.getEffectiveTier(),
                            effectiveTier: user.getEffectiveTier()
                        },
                        source: 'mobile-email-only-lookup'
                    };
                }
            } catch (dbError) {
                console.error('❌ Email-only database lookup error:', dbError.message);
            }
        }

        console.log('❌ No valid session found for:', request?.url);
        console.log('❌ Available headers were:', {
            userEmail,
            userId,
            isAdmin,
            hasMobileSession: !!mobileSessionHeader
        });
        return null;

    } catch (error) {
        console.error('❌ Enhanced session error for:', request?.url || 'unknown', error.message);
        console.error('❌ Error stack:', error.stack);
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