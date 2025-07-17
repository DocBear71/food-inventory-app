// file: src/app/api/inventory/[id]/prices/route.js v2

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory, User } from '@/lib/models';

// GET - Fetch price history for an inventory item with currency support
export async function GET(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { id } = params;

        // Get user for currency preferences
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Find the inventory item and verify ownership
        const inventory = await UserInventory.findOne({ userId: session.user.id });
        if (!inventory) {
            return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
        }

        const item = inventory.items.id(id);
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // Calculate price statistics
        const priceHistory = item.priceHistory || [];
        const prices = priceHistory.map(p => p.price).filter(p => p > 0);

        let statistics = {
            average: 0,
            lowest: 0,
            highest: 0,
            totalEntries: prices.length,
            // 🆕 ADD CURRENCY INFO
            currency: user.currencyPreferences?.currency || 'USD',
            currencySymbol: user.currencyPreferences?.currencySymbol || '$',
            currencyPosition: user.currencyPreferences?.currencyPosition || 'before'
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
                priceAlerts: item.priceAlerts || { enabled: false },
                // 🆕 ADD USER CURRENCY PREFERENCES
                userCurrency: user.currencyPreferences || {
                    currency: 'USD',
                    currencySymbol: '$',
                    currencyPosition: 'before',
                    showCurrencyCode: false,
                    decimalPlaces: 2
                }
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

// POST - Add new price entry with currency support
export async function POST(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { id } = params;
        const body = await request.json();
        const { formData, quickData } = body;

        // Handle both regular form data and quick add data
        const priceData = formData || quickData;
        const { price, store, size, unit, isOnSale, saleEndDate, notes } = priceData;

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

        // Get user for currency preferences
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Find the inventory item and verify ownership
        const inventory = await UserInventory.findOne({ userId: session.user.id });
        if (!inventory) {
            return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
        }

        const item = inventory.items.id(id);
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // Calculate unit price if size and unit are provided
        let unitPrice = null;
        if (size && unit) {
            const sizeNumber = parseFloat(size);
            if (sizeNumber > 0) {
                unitPrice = parseFloat(price) / sizeNumber;
            }
        }

        // Create new price entry with currency info
        const newPriceEntry = {
            price: parseFloat(price),
            store: store.trim(),
            date: new Date().toISOString().split('T')[0], // Store as date string
            size: size?.trim() || '',
            unit: unit?.trim() || '',
            unitPrice: unitPrice,
            isOnSale: Boolean(isOnSale),
            saleEndDate: saleEndDate ? new Date(saleEndDate).toISOString().split('T')[0] : null,
            notes: notes?.trim() || '',
            addedBy: session.user.id,
            addedDate: new Date(),
            // 🆕 ADD CURRENCY INFO
            currency: user.currencyPreferences?.currency || 'USD',
            currencySymbol: user.currencyPreferences?.currencySymbol || '$'
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
                date: new Date().toISOString().split('T')[0],
                unitPrice: unitPrice,
                isOnSale: Boolean(isOnSale),
                // 🆕 ADD CURRENCY INFO
                currency: user.currencyPreferences?.currency || 'USD',
                currencySymbol: user.currencyPreferences?.currencySymbol || '$'
            };
        }

        // Recalculate price statistics
        const allPrices = item.priceHistory.map(p => p.price).filter(p => p > 0);
        if (allPrices.length > 0) {
            item.averagePrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
            item.lowestPrice = Math.min(...allPrices);
            item.highestPrice = Math.max(...allPrices);
        }

        // Save the updated inventory
        await inventory.save();

        console.log(`💰 Price added: ${user.currencyPreferences?.currencySymbol || '$'}${currentPrice} for ${item.name} at ${store.trim()}`);

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
                    totalEntries: item.priceHistory.length,
                    // 🆕 ADD CURRENCY INFO
                    currency: user.currencyPreferences?.currency || 'USD',
                    currencySymbol: user.currencyPreferences?.currencySymbol || '$'
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