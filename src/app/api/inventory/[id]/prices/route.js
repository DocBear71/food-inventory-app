// file: src/app/api/inventory/[id]/prices/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { InventoryItem } from '@/lib/models';

// GET - Fetch price history for an inventory item
export async function GET(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { id } = params;

        // Find the inventory item and verify ownership
        const item = await InventoryItem.findById(id);
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        if (item.userId.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Calculate price statistics
        const priceHistory = item.priceHistory || [];
        const prices = priceHistory.map(p => p.price).filter(p => p > 0);

        let statistics = {
            average: 0,
            lowest: 0,
            highest: 0,
            totalEntries: prices.length
        };

        if (prices.length > 0) {
            statistics.average = prices.reduce((a, b) => a + b, 0) / prices.length;
            statistics.lowest = Math.min(...prices);
            statistics.highest = Math.max(...prices);
        }

        return NextResponse.json({
            success: true,
            data: {
                itemId: item._id,
                itemName: item.name,
                priceHistory: priceHistory.sort((a, b) => new Date(b.date) - new Date(a.date)), // newest first
                currentBestPrice: item.currentBestPrice || null,
                statistics,
                priceAlerts: item.priceAlerts || { enabled: false }
            }
        });

    } catch (error) {
        console.error('GET price history error:', error);
        return NextResponse.json({
            error: 'Failed to fetch price history',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Add new price entry
export async function POST(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { id } = params;
        const body = await request.json();
        const { price, store, size, unit, isOnSale, saleEndDate, notes } = body;

        // Validation
        if (!price || isNaN(price) || parseFloat(price) <= 0) {
            return NextResponse.json({
                error: 'Valid price is required and must be greater than 0'
            }, { status: 400 });
        }

        if (!store || store.trim().length === 0) {
            return NextResponse.json({
                error: 'Store name is required'
            }, { status: 400 });
        }

        // Find the inventory item and verify ownership
        const item = await InventoryItem.findById(id);
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        if (item.userId.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Calculate unit price if size and unit are provided
        let unitPrice = null;
        if (size && unit) {
            const sizeNumber = parseFloat(size);
            if (sizeNumber > 0) {
                unitPrice = parseFloat(price) / sizeNumber;
            }
        }

        // Create new price entry
        const newPriceEntry = {
            price: parseFloat(price),
            store: store.trim(),
            date: new Date(),
            size: size?.trim() || '',
            unit: unit?.trim() || '',
            unitPrice: unitPrice,
            isOnSale: Boolean(isOnSale),
            saleEndDate: saleEndDate ? new Date(saleEndDate) : null,
            notes: notes?.trim() || '',
            addedBy: session.user.id
        };

        // Initialize priceHistory if it doesn't exist
        if (!item.priceHistory) {
            item.priceHistory = [];
        }

        // Add new price entry
        item.priceHistory.push(newPriceEntry);

        // Update current best price if this is better (or first price)
        const currentPrice = parseFloat(price);
        if (!item.currentBestPrice || currentPrice < item.currentBestPrice.price) {
            item.currentBestPrice = {
                price: currentPrice,
                store: store.trim(),
                date: new Date(),
                unitPrice: unitPrice,
                isOnSale: Boolean(isOnSale)
            };
        }

        // Recalculate price statistics
        const allPrices = item.priceHistory.map(p => p.price).filter(p => p > 0);
        if (allPrices.length > 0) {
            item.averagePrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
            item.lowestPrice = Math.min(...allPrices);
            item.highestPrice = Math.max(...allPrices);
        }

        // Save the updated item
        await item.save();

        return NextResponse.json({
            success: true,
            message: 'Price added successfully',
            data: {
                priceEntry: newPriceEntry,
                currentBestPrice: item.currentBestPrice,
                averagePrice: item.averagePrice,
                statistics: {
                    average: item.averagePrice,
                    lowest: item.lowestPrice,
                    highest: item.highestPrice,
                    totalEntries: item.priceHistory.length
                }
            }
        });

    } catch (error) {
        console.error('POST price entry error:', error);
        return NextResponse.json({
            error: 'Failed to add price entry',
            details: error.message
        }, { status: 500 });
    }
}

// PUT - Update price alert settings
export async function PUT(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { id } = params;
        const body = await request.json();
        const { enabled, targetPrice, alertWhenBelow } = body;

        // Find the inventory item and verify ownership
        const item = await InventoryItem.findById(id);
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        if (item.userId.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Update price alerts
        item.priceAlerts = {
            enabled: Boolean(enabled),
            targetPrice: targetPrice ? parseFloat(targetPrice) : null,
            alertWhenBelow: Boolean(alertWhenBelow),
            lastAlertSent: item.priceAlerts?.lastAlertSent || null
        };

        await item.save();

        return NextResponse.json({
            success: true,
            message: 'Price alerts updated successfully',
            data: {
                priceAlerts: item.priceAlerts
            }
        });

    } catch (error) {
        console.error('PUT price alerts error:', error);
        return NextResponse.json({
            error: 'Failed to update price alerts',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Remove a specific price entry
export async function DELETE(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { id } = params;
        const { searchParams } = new URL(request.url);
        const priceEntryId = searchParams.get('priceEntryId');

        if (!priceEntryId) {
            return NextResponse.json({
                error: 'Price entry ID is required'
            }, { status: 400 });
        }

        // Find the inventory item and verify ownership
        const item = await InventoryItem.findById(id);
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        if (item.userId.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Remove the price entry
        if (item.priceHistory) {
            item.priceHistory = item.priceHistory.filter(
                entry => entry._id.toString() !== priceEntryId
            );

            // Recalculate best price and statistics
            if (item.priceHistory.length > 0) {
                const allPrices = item.priceHistory.map(p => p.price);
                const lowestPriceEntry = item.priceHistory.find(
                    entry => entry.price === Math.min(...allPrices)
                );

                item.currentBestPrice = {
                    price: lowestPriceEntry.price,
                    store: lowestPriceEntry.store,
                    date: lowestPriceEntry.date,
                    unitPrice: lowestPriceEntry.unitPrice,
                    isOnSale: lowestPriceEntry.isOnSale
                };

                item.averagePrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
                item.lowestPrice = Math.min(...allPrices);
                item.highestPrice = Math.max(...allPrices);
            } else {
                // No price history left
                item.currentBestPrice = null;
                item.averagePrice = null;
                item.lowestPrice = null;
                item.highestPrice = null;
            }

            await item.save();
        }

        return NextResponse.json({
            success: true,
            message: 'Price entry deleted successfully'
        });

    } catch (error) {
        console.error('DELETE price entry error:', error);
        return NextResponse.json({
            error: 'Failed to delete price entry',
            details: error.message
        }, { status: 500 });
    }
}