// file: /src/app/api/notifications/settings/route.js v1

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

// Default notification settings
const DEFAULT_SETTINGS = {
    email: {
        enabled: false,
        dailyDigest: false,
        expirationAlerts: true,
        daysBeforeExpiration: 3
    },
    dashboard: {
        showExpirationPanel: true,
        showQuickStats: true,
        alertThreshold: 7 // days
    },
    mobile: {
        pushNotifications: false,
        soundEnabled: true
    }
};

// GET - Get user's notification settings
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Merge user settings with defaults
        const settings = {
            ...DEFAULT_SETTINGS,
            ...user.notificationSettings
        };

        return NextResponse.json({
            success: true,
            settings
        });

    } catch (error) {
        console.error('GET notification settings error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notification settings' },
            { status: 500 }
        );
    }
}

// PUT - Update user's notification settings
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { settings } = await request.json();

        if (!settings) {
            return NextResponse.json({ error: 'Settings are required' }, { status: 400 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Validate and merge settings
        const validatedSettings = {
            email: {
                enabled: Boolean(settings.email?.enabled),
                dailyDigest: Boolean(settings.email?.dailyDigest),
                expirationAlerts: Boolean(settings.email?.expirationAlerts),
                daysBeforeExpiration: Math.max(1, Math.min(30, parseInt(settings.email?.daysBeforeExpiration) || 3))
            },
            dashboard: {
                showExpirationPanel: Boolean(settings.dashboard?.showExpirationPanel),
                showQuickStats: Boolean(settings.dashboard?.showQuickStats),
                alertThreshold: Math.max(1, Math.min(30, parseInt(settings.dashboard?.alertThreshold) || 7))
            },
            mobile: {
                pushNotifications: Boolean(settings.mobile?.pushNotifications),
                soundEnabled: Boolean(settings.mobile?.soundEnabled)
            }
        };

        // Update user settings
        user.notificationSettings = validatedSettings;
        user.updatedAt = new Date();
        await user.save();

        return NextResponse.json({
            success: true,
            message: 'Notification settings updated successfully',
            settings: validatedSettings
        });

    } catch (error) {
        console.error('PUT notification settings error:', error);
        return NextResponse.json(
            { error: 'Failed to update notification settings' },
            { status: 500 }
        );
    }
}

// POST - Send test notification
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type } = await request.json();

        if (!type || !['email', 'push'].includes(type)) {
            return NextResponse.json({ error: 'Valid notification type is required' }, { status: 400 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Here you would implement actual notification sending
        // For now, we'll just simulate it
        let message = '';

        if (type === 'email') {
            // TODO: Implement email sending logic
            // Example: await sendTestEmail(user.email, user.name);
            message = `Test email notification would be sent to ${user.email}`;
        } else if (type === 'push') {
            // TODO: Implement push notification logic
            // Example: await sendTestPushNotification(user.id);
            message = 'Test push notification would be sent to your device';
        }

        return NextResponse.json({
            success: true,
            message,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('POST test notification error:', error);
        return NextResponse.json(
            { error: 'Failed to send test notification' },
            { status: 500 }
        );
    }
}