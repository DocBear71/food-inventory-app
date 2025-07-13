// file: /src/app/api/admin/users/[id]/suspend/route.js
// UPDATED - Admin User Suspend API with Email Notifications

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { sendAccountSuspensionEmail, sendAccountReactivationEmail } from '@/lib/email';

export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        // Verify admin status
        const adminUser = await User.findById(session.user.id).select('+isAdmin');
        if (!adminUser?.isAdmin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const userId = params.id;
        const body = await request.json();
        const {
            action, // 'suspend' or 'unsuspend'
            reason = '',
            duration = null, // Duration in days, null for indefinite
            sendNotification = true
        } = body;

        console.log(`🔒 Admin ${action} user ${userId}`, {
            reason,
            duration,
            sendNotification,
            adminUser: session.user.email
        });

        // Validate action
        if (!['suspend', 'unsuspend'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Must be suspend or unsuspend' },
                { status: 400 }
            );
        }

        // Get target user
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Prevent suspending admin users
        if (user.isAdmin && action === 'suspend') {
            return NextResponse.json(
                { error: 'Cannot suspend admin users' },
                { status: 400 }
            );
        }

        const now = new Date();

        if (action === 'suspend') {
            // Calculate suspension end date if duration provided
            const suspensionEndDate = duration
                ? new Date(now.getTime() + (duration * 24 * 60 * 60 * 1000))
                : null;

            // Initialize account status if it doesn't exist
            if (!user.accountStatus) {
                user.accountStatus = {};
            }

            user.accountStatus = {
                status: 'suspended',
                suspendedAt: now,
                suspendedBy: session.user.id,
                suspensionReason: reason,
                suspensionEndDate,
                suspensionHistory: [
                    ...(user.accountStatus?.suspensionHistory || []),
                    {
                        action: 'suspend',
                        date: now,
                        adminId: session.user.id,
                        adminEmail: session.user.email,
                        reason,
                        duration,
                        endDate: suspensionEndDate
                    }
                ].slice(-20) // Keep last 20 suspension actions
            };

        } else if (action === 'unsuspend') {
            // Initialize account status if it doesn't exist
            if (!user.accountStatus) {
                user.accountStatus = {};
            }

            user.accountStatus = {
                ...user.accountStatus,
                status: 'active',
                unsuspendedAt: now,
                unsuspendedBy: session.user.id,
                suspensionHistory: [
                    ...(user.accountStatus?.suspensionHistory || []),
                    {
                        action: 'unsuspend',
                        date: now,
                        adminId: session.user.id,
                        adminEmail: session.user.email,
                        reason
                    }
                ].slice(-20)
            };

            // Clear suspension-specific fields
            user.accountStatus.suspendedAt = undefined;
            user.accountStatus.suspendedBy = undefined;
            user.accountStatus.suspensionReason = undefined;
            user.accountStatus.suspensionEndDate = undefined;
        }

        await user.save();

        console.log(`✅ User ${action} successfully:`, {
            userId,
            userEmail: user.email,
            action,
            reason
        });

        // Send email notification if requested
        let emailResult = null;
        if (sendNotification) {
            try {
                console.log(`📧 Sending ${action} notification email...`);

                if (action === 'suspend') {
                    const emailData = {
                        userName: user.name,
                        userEmail: user.email,
                        reason: reason,
                        suspensionEndDate: user.accountStatus.suspensionEndDate,
                        isIndefinite: !user.accountStatus.suspensionEndDate,
                        supportEmail: 'support@docbearscomfort.kitchen'
                    };

                    emailResult = await sendAccountSuspensionEmail(emailData);

                } else if (action === 'unsuspend') {
                    const emailData = {
                        userName: user.name,
                        userEmail: user.email,
                        reason: reason,
                        supportEmail: 'support@docbearscomfort.kitchen'
                    };

                    emailResult = await sendAccountReactivationEmail(emailData);
                }

                console.log(`✅ ${action} notification email sent successfully:`, emailResult.messageId);

            } catch (emailError) {
                console.error(`❌ Failed to send ${action} notification email:`, emailError);
                // Don't fail the whole operation if email fails
                emailResult = {
                    success: false,
                    error: emailError.message
                };
            }
        }

        return NextResponse.json({
            success: true,
            message: `User ${action}ed successfully`,
            accountStatus: {
                status: user.accountStatus.status,
                suspendedAt: user.accountStatus.suspendedAt,
                suspensionReason: user.accountStatus.suspensionReason,
                suspensionEndDate: user.accountStatus.suspensionEndDate,
                unsuspendedAt: user.accountStatus.unsuspendedAt
            },
            emailSent: sendNotification,
            emailResult: emailResult,
            action: action
        });

    } catch (error) {
        console.error('❌ Admin user suspend API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET endpoint to check suspension status - unchanged
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        // Verify admin status
        const adminUser = await User.findById(session.user.id).select('+isAdmin');
        if (!adminUser?.isAdmin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const userId = params.id;

        // Get user suspension status
        const user = await User.findById(userId)
            .select('name email accountStatus')
            .lean();

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if suspension has expired automatically
        const accountStatus = user.accountStatus || { status: 'active' };
        let currentStatus = accountStatus.status || 'active';

        if (currentStatus === 'suspended' && accountStatus.suspensionEndDate) {
            const now = new Date();
            const endDate = new Date(accountStatus.suspensionEndDate);

            if (now >= endDate) {
                // Suspension has expired, auto-unsuspend
                currentStatus = 'active';

                // Update in database
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

                console.log(`🕐 Auto-unsuspended user ${userId} - suspension period expired`);
            }
        }

        return NextResponse.json({
            userId,
            userName: user.name,
            userEmail: user.email,
            accountStatus: {
                ...accountStatus,
                status: currentStatus
            },
            isSuspended: currentStatus === 'suspended',
            canUnsuspend: currentStatus === 'suspended',
            suspensionHistory: accountStatus.suspensionHistory || []
        });

    } catch (error) {
        console.error('❌ Admin suspension status API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}