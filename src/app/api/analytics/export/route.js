// file: /src/app/api/analytics/export/route.js v1

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

        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'csv';

        // Get user's inventory with price history
        const inventory = await UserInventory.findOne({ userId: session.user.id });
        if (!inventory) {
            return NextResponse.json({ error: 'No inventory found' }, { status: 404 });
        }

        const items = inventory.items || [];

        // Flatten price data
        const priceData = [];
        items.forEach(item => {
            if (item.priceHistory && item.priceHistory.length > 0) {
                item.priceHistory.forEach(price => {
                    priceData.push({
                        itemName: item.name,
                        category: item.category || 'Other',
                        brand: item.brand || '',
                        price: price.price,
                        store: price.store,
                        date: price.date,
                        size: price.size || '',
                        unit: price.unit || '',
                        unitPrice: price.unitPrice || '',
                        isOnSale: price.isOnSale || false,
                        notes: price.notes || ''
                    });
                });
            }
        });

        if (format === 'csv') {
            // Generate CSV
            const headers = ['Item Name', 'Category', 'Brand', 'Price', 'Store', 'Date', 'Size', 'Unit', 'Unit Price', 'On Sale', 'Notes'];
            const csvContent = [
                headers.join(','),
                ...priceData.map(row => [
                    `"${row.itemName}"`,
                    `"${row.category}"`,
                    `"${row.brand}"`,
                    row.price,
                    `"${row.store}"`,
                    new Date(row.date).toLocaleDateString(),
                    `"${row.size}"`,
                    `"${row.unit}"`,
                    row.unitPrice || '',
                    row.isOnSale,
                    `"${row.notes}"`
                ].join(','))
            ].join('\n');

            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="price-history-${new Date().toISOString().split('T')[0]}.csv"`
                }
            });
        }

        // Return JSON format
        return NextResponse.json({
            success: true,
            data: priceData,
            exportDate: new Date().toISOString(),
            totalEntries: priceData.length
        });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}