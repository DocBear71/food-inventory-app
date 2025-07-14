// file: /src/middleware/checkUserStatus.js
// Middleware to check if user is suspended and handle accordingly

import { User } from '@/lib/models';
import connectDB from '@/lib/mongodb';

export async function checkUserStatus(userId) {
    if (!userId) {
        return { isValid: false, reason: 'no_user_id' };
    }

    try {
        await connectDB();

        const user = await User.findById(userId)
            .select('accountStatus name email')
            .lean();

        if (!user) {
            return { isValid: false, reason: 'user_not_found' };
        }

        // Check if user is suspended
        const accountStatus = user.accountStatus || { status: 'active' };

        if (accountStatus.status === 'suspended') {
            // Check if suspension has expired
            if (accountStatus.suspensionEndDate) {
                const now = new Date();
                const endDate = new Date(accountStatus.suspensionEndDate);

                if (now >= endDate) {
                    // Auto-unsuspend expired suspension
                    await User.findByIdAndUpdate(userId, {
                        'accountStatus.status': 'active',
                        'accountStatus.unsuspendedAt': now,
                        'accountStatus.unsuspendedBy': 'system',
                        $push: {
                            'accountStatus.suspensionHistory': {
                                action: 'auto_unsuspend',
                                date: now,
                                adminId: 'system',
                                adminEmail: 'system',
                                reason: 'Suspension period expired'
                            }
                        }
                    });

                    console.log(`🕐 Auto-unsuspended user ${userId} - suspension expired`);
                    return { isValid: true, wasAutoUnsuspended: true };
                }
            }

            // User is still suspended
            const endDate = accountStatus.suspensionEndDate
                ? new Date(accountStatus.suspensionEndDate)
                : null;

            const daysRemaining = endDate
                ? Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24))
                : null;

            return {
                isValid: false,
                reason: 'suspended',
                suspensionInfo: {
                    reason: accountStatus.suspensionReason,
                    suspendedAt: accountStatus.suspendedAt,
                    endDate: endDate,
                    daysRemaining: daysRemaining,
                    isIndefinite: !endDate
                }
            };
        }

        if (accountStatus.status === 'banned') {
            return {
                isValid: false,
                reason: 'banned',
                banInfo: {
                    reason: accountStatus.suspensionReason,
                    bannedAt: accountStatus.suspendedAt
                }
            };
        }

        return { isValid: true };

    } catch (error) {
        console.error('❌ Error checking user status:', error);
        return { isValid: false, reason: 'error', error: error.message };
    }
}

// Middleware function for API routes
export function withUserStatusCheck(handler) {
    return async (request, context) => {
        const session = await auth();

        if (session?.user?.id) {
            const statusCheck = await checkUserStatus(session.user.id);

            if (!statusCheck.isValid) {
                const statusCode = statusCheck.reason === 'suspended' ? 423 : // Locked
                    statusCheck.reason === 'banned' ? 403 :    // Forbidden
                        401; // Unauthorized

                return Response.json({
                    error: 'Account access restricted',
                    reason: statusCheck.reason,
                    details: statusCheck.suspensionInfo || statusCheck.banInfo || null
                }, { status: statusCode });
            }
        }

        return handler(request, context);
    };
}

// React hook for client-side suspension checks
export function useUserStatus() {
    const { data: session } = useSession();
    const [userStatus, setUserStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkStatus() {
            if (!session?.user?.id) {
                setUserStatus({ isValid: true });
                setLoading(false);
                return;
            }

            try {
                const response = await fetch('/api/auth/check-status');

                if (response.ok) {
                    const data = await response.json();
                    setUserStatus(data);
                } else if (response.status === 423) {
                    // Suspended
                    const data = await response.json();
                    setUserStatus({
                        isValid: false,
                        reason: 'suspended',
                        suspensionInfo: data.details
                    });
                } else if (response.status === 403) {
                    // Banned
                    const data = await response.json();
                    setUserStatus({
                        isValid: false,
                        reason: 'banned',
                        banInfo: data.details
                    });
                } else {
                    setUserStatus({ isValid: true });
                }
            } catch (error) {
                console.error('Error checking user status:', error);
                setUserStatus({ isValid: true }); // Default to valid on error
            } finally {
                setLoading(false);
            }
        }

        checkStatus();
    }, [session]);

    return { userStatus, loading };
}