// file: /src/app/api/price-tracking/alerts/route.js v1 - Price alerts management

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory } from '@/lib/models';

export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const inventory = await UserInventory.findOne({ userId: session.user.id });
        if (!inventory) {
            return NextResponse.json({ success: true, alerts: [] });
        }

        // Find items with active price alerts
        const itemsWithAlerts = inventory.items.filter(item =>
            item.priceAlerts?.enabled && item.priceAlerts?.targetPrice
        );

        const alerts = itemsWithAlerts.map(item => {
            const currentPrice = item.currentBestPrice?.price || 0;
            const targetPrice = item.priceAlerts.targetPrice;
            const alertWhenBelow = item.priceAlerts.alertWhenBelow;

            let status = 'monitoring';
            let triggered = false;

            if (alertWhenBelow && currentPrice <= targetPrice) {
                status = 'triggered';
                triggered = true;
            } else if (!alertWhenBelow && currentPrice >= targetPrice) {
                status = 'triggered';
                triggered = true;
            }

            return {
                itemId: item._id,
                itemName: item.name,
                category: item.category,
                targetPrice,
                currentPrice,
                store: item.currentBestPrice?.store || 'Unknown',
                alertType: alertWhenBelow ? 'below' : 'above',
                status,
                triggered,
                difference: Math.abs(currentPrice - targetPrice),
                lastAlertSent: item.priceAlerts.lastAlertSent,
                createdAt: item.priceAlerts.createdAt || new Date()
            };
        });

        // Sort by triggered alerts first, then by difference
        alerts.sort((a, b) => {
            if (a.triggered && !b.triggered) return -1;
            if (!a.triggered && b.triggered) return 1;
            return b.difference - a.difference;
        });

        return NextResponse.json({
            success: true,
            alerts,
            summary: {
                total: alerts.length,
                triggered: alerts.filter(a => a.triggered).length,
                monitoring: alerts.filter(a => !a.triggered).length
            }
        });

    } catch (error) {
        console.error('Error fetching price alerts:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { itemId, targetPrice, alertType = 'below', enabled = true } = await request.json();

        if (!itemId || !targetPrice) {
            return NextResponse.json({
                error: 'Item ID and target price are required'
            }, { status: 400 });
        }

        await connectDB();

        const inventory = await UserInventory.findOne({ userId: session.user.id });
        if (!inventory) {
            return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
        }

        const item = inventory.items.id(itemId);
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // Update price alert settings
        item.priceAlerts = {
            enabled,
            targetPrice: parseFloat(targetPrice),
            alertWhenBelow: alertType === 'below',
            lastAlertSent: null,
            createdAt: new Date()
        };

        await inventory.save();

        return NextResponse.json({
            success: true,
            message: 'Price alert created successfully',
            alert: item.priceAlerts
        });

    } catch (error) {
        console.error('Error creating price alert:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

