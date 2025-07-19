// file: /src/app/api/notifications/expiration/route.js v2 - Enhanced with email notifications

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { UserInventory, User } from '@/lib/models';
import { sendExpirationNotificationEmail } from '@/lib/email';

// GET - Get expiration notifications for user (with optional email sending)
export async function GET(request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sendEmail = searchParams.get('sendEmail') === 'true';

        await connectDB();

        const inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory || !inventory.items.length) {
            return NextResponse.json({
                success: true,
                notifications: {
                    expired: [],
                    expiresToday: [],
                    expiresThisWeek: [],
                    expiresNextWeek: []
                },
                summary: {
                    totalExpired: 0,
                    totalExpiringSoon: 0,
                    totalExpiringThisWeek: 0
                },
                emailSent: false
            });
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const oneWeekFromNow = new Date(today);
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
        const twoWeeksFromNow = new Date(today);
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

        const notifications = {
            expired: [],
            expiresToday: [],
            expiresThisWeek: [],
            expiresNextWeek: []
        };

        inventory.items.forEach(item => {
            if (!item.expirationDate) return;

            const expirationDate = new Date(item.expirationDate);
            const expirationDay = new Date(expirationDate.getFullYear(), expirationDate.getMonth(), expirationDate.getDate());

            const notification = {
                id: item._id,
                name: item.name,
                brand: item.brand,
                category: item.category,
                quantity: item.quantity,
                unit: item.unit,
                location: item.location,
                expirationDate: item.expirationDate,
                daysUntilExpiration: Math.ceil((expirationDay - today) / (1000 * 60 * 60 * 24))
            };

            if (expirationDay < today) {
                notifications.expired.push({
                    ...notification,
                    priority: 'critical',
                    status: 'expired',
                    daysUntil: Math.abs(notification.daysUntilExpiration),
                    message: `Expired ${Math.abs(notification.daysUntilExpiration)} day${Math.abs(notification.daysUntilExpiration) !== 1 ? 's' : ''} ago`
                });
            } else if (expirationDay.getTime() === today.getTime()) {
                notifications.expiresToday.push({
                    ...notification,
                    priority: 'high',
                    status: 'expires-today',
                    daysUntil: 0,
                    message: 'Expires today'
                });
            } else if (expirationDay <= oneWeekFromNow) {
                notifications.expiresThisWeek.push({
                    ...notification,
                    priority: 'medium',
                    status: notification.daysUntilExpiration <= 3 ? 'expires-soon' : 'expires-week',
                    daysUntil: notification.daysUntilExpiration,
                    message: `Expires in ${notification.daysUntilExpiration} day${notification.daysUntilExpiration !== 1 ? 's' : ''}`
                });
            } else if (expirationDay <= twoWeeksFromNow) {
                notifications.expiresNextWeek.push({
                    ...notification,
                    priority: 'low',
                    status: 'expires-week',
                    daysUntil: notification.daysUntilExpiration,
                    message: `Expires in ${notification.daysUntilExpiration} day${notification.daysUntilExpiration !== 1 ? 's' : ''}`
                });
            }
        });

        // Sort by expiration date (soonest first)
        const sortByExpiration = (a, b) => new Date(a.expirationDate) - new Date(b.expirationDate);

        notifications.expired.sort(sortByExpiration);
        notifications.expiresToday.sort(sortByExpiration);
        notifications.expiresThisWeek.sort(sortByExpiration);
        notifications.expiresNextWeek.sort(sortByExpiration);

        const summary = {
            totalExpired: notifications.expired.length,
            totalExpiringSoon: notifications.expiresToday.length + notifications.expiresThisWeek.length,
            totalExpiringThisWeek: notifications.expiresThisWeek.length,
            totalExpiringToday: notifications.expiresToday.length
        };

        let emailResult = { sent: false };

        // Send email if requested and there are items that need attention
        if (sendEmail) {
            const itemsNeedingAttention = [
                ...notifications.expired,
                ...notifications.expiresToday,
                ...notifications.expiresThisWeek.filter(item => item.daysUntil <= 3)
            ];

            if (itemsNeedingAttention.length > 0) {
                try {
                    // Get user details for email
                    const user = await User.findById(session.user.id).select('name email subscription usageTracking');

                    if (user && user.email) {
                        const result = await sendExpirationNotificationEmail({
                            toEmail: user.email,
                            userName: user.name || session.user.name || 'there',
                            expiringItems: itemsNeedingAttention,
                            userSubscription: user.subscription,
                            userId: user._id
                        });

                        emailResult = {
                            sent: result.success,
                            messageId: result.messageId,
                            itemCount: result.itemCount,
                            reason: result.reason || null
                        };
                    }
                } catch (emailError) {
                    console.error('Email sending failed:', emailError);
                    emailResult = {
                        sent: false,
                        error: emailError.message
                    };
                }
            } else {
                emailResult = {
                    sent: false,
                    reason: 'No items requiring immediate attention'
                };
            }
        }

        return NextResponse.json({
            success: true,
            notifications,
            summary,
            emailSent: emailResult.sent,
            emailDetails: sendEmail ? emailResult : undefined
        });

    } catch (error) {
        console.error('GET expiration notifications error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch expiration notifications' },
            { status: 500 }
        );
    }
}

// POST - Mark items as used/consumed OR send email notification
export async function POST(request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { itemIds, action, sendNotificationEmail } = body;

        await connectDB();

        // Handle email notification request
        if (sendNotificationEmail || action === 'sendEmail') {
            try {
                // Get user and inventory details
                const [user, inventory] = await Promise.all([
                    User.findById(session.user.id).select('name email subscription usageTracking'),
                    UserInventory.findOne({ userId: session.user.id })
                ]);

                if (!user || !user.email) {
                    return NextResponse.json({ error: 'User email not found' }, { status: 400 });
                }

                if (!inventory || !inventory.items.length) {
                    return NextResponse.json({
                        success: true,
                        message: 'No inventory items found',
                        emailSent: false
                    });
                }

                // Get expiring items
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const oneWeekFromNow = new Date(today);
                oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

                const expiringItems = [];

                inventory.items.forEach(item => {
                    if (!item.expirationDate) return;

                    const expirationDate = new Date(item.expirationDate);
                    const expirationDay = new Date(expirationDate.getFullYear(), expirationDate.getMonth(), expirationDate.getDate());
                    const daysUntil = Math.ceil((expirationDay - today) / (1000 * 60 * 60 * 24));

                    // Include expired, expiring today, and expiring within 3 days
                    if (daysUntil <= 3) {
                        let status;
                        if (daysUntil < 0) status = 'expired';
                        else if (daysUntil === 0) status = 'expires-today';
                        else status = 'expires-soon';

                        expiringItems.push({
                            id: item._id,
                            name: item.name,
                            brand: item.brand,
                            category: item.category,
                            quantity: item.quantity,
                            unit: item.unit,
                            location: item.location,
                            expirationDate: item.expirationDate,
                            status,
                            daysUntil: Math.abs(daysUntil)
                        });
                    }
                });

                if (expiringItems.length === 0) {
                    return NextResponse.json({
                        success: true,
                        message: 'No items requiring immediate attention',
                        emailSent: false
                    });
                }

                // Send email
                const result = await sendExpirationNotificationEmail({
                    toEmail: user.email,
                    userName: user.name || session.user.name || 'there',
                    expiringItems,
                    userSubscription: user.subscription,
                    userId: user._id
                });

                return NextResponse.json({
                    success: true,
                    message: result.success ?
                        `Expiration notification sent for ${result.itemCount} items` :
                        'Email notification failed',
                    emailSent: result.success,
                    emailDetails: result
                });

            } catch (emailError) {
                console.error('Email notification error:', emailError);
                return NextResponse.json({
                    success: false,
                    error: 'Failed to send email notification',
                    details: emailError.message
                }, { status: 500 });
            }
        }

        // Handle inventory item actions (existing functionality)
        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return NextResponse.json({ error: 'Item IDs are required' }, { status: 400 });
        }

        const inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
        }

        let updatedCount = 0;

        if (action === 'consumed') {
            // Remove items from inventory
            const initialLength = inventory.items.length;
            inventory.items = inventory.items.filter(item =>
                !itemIds.includes(item._id.toString())
            );
            updatedCount = initialLength - inventory.items.length;
        } else if (action === 'extend') {
            // Extend expiration date by 7 days
            itemIds.forEach(itemId => {
                const item = inventory.items.find(item => item._id.toString() === itemId);
                if (item && item.expirationDate) {
                    const newExpiration = new Date(item.expirationDate);
                    newExpiration.setDate(newExpiration.getDate() + 7);
                    item.expirationDate = newExpiration;
                    updatedCount++;
                }
            });
        }

        if (updatedCount > 0) {
            inventory.lastUpdated = new Date();
            await inventory.save();
        }

        return NextResponse.json({
            success: true,
            message: `${updatedCount} item${updatedCount !== 1 ? 's' : ''} ${action === 'consumed' ? 'removed from inventory' : 'expiration extended'}`,
            updatedCount
        });

    } catch (error) {
        console.error('POST expiration notifications error:', error);
        return NextResponse.json(
            { error: 'Failed to update items' },
            { status: 500 }
        );
    }
}