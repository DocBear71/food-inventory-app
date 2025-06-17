// file: /src/app/api/notifications/expiration/route.js v1

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory } from '@/lib/models';

// GET - Get expiration notifications for user
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
                }
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
                    message: `Expired ${Math.abs(notification.daysUntilExpiration)} day${Math.abs(notification.daysUntilExpiration) !== 1 ? 's' : ''} ago`
                });
            } else if (expirationDay.getTime() === today.getTime()) {
                notifications.expiresToday.push({
                    ...notification,
                    priority: 'high',
                    message: 'Expires today'
                });
            } else if (expirationDay <= oneWeekFromNow) {
                notifications.expiresThisWeek.push({
                    ...notification,
                    priority: 'medium',
                    message: `Expires in ${notification.daysUntilExpiration} day${notification.daysUntilExpiration !== 1 ? 's' : ''}`
                });
            } else if (expirationDay <= twoWeeksFromNow) {
                notifications.expiresNextWeek.push({
                    ...notification,
                    priority: 'low',
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

        return NextResponse.json({
            success: true,
            notifications,
            summary
        });

    } catch (error) {
        console.error('GET expiration notifications error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch expiration notifications' },
            { status: 500 }
        );
    }
}

// POST - Mark items as used/consumed (remove from inventory)
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { itemIds, action } = await request.json();

        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return NextResponse.json({ error: 'Item IDs are required' }, { status: 400 });
        }

        await connectDB();

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