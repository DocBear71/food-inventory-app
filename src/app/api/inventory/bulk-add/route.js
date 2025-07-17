// file: /src/app/api/inventory/bulk-add/route.js v3 - Added OCR engine tracking and enhanced logging

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory, User } from '@/lib/models';
import { getSubscriptionTier, checkUsageLimit, getRequiredTier, getUpgradeMessage, FEATURE_GATES } from '@/lib/subscription-config';

// POST - Bulk add items to inventory (with subscription limits, OCR engine tracking, and price tracking)
export async function POST(request) {
    try {
        const session = await auth();

        console.log('POST /api/inventory/bulk-add - Session:', session);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { items, source, ocrEngine, metadata } = body;

        console.log('POST /api/inventory/bulk-add - Body:', {
            itemCount: items?.length,
            source,
            ocrEngine,
            metadata: metadata ? Object.keys(metadata) : 'none',
            // 🆕 LOG PRICE TRACKING INFO
            itemsWithPriceData: items?.filter(item => item.hasReceiptPriceData)?.length || 0
        });

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: 'Items array is required and must not be empty' },
                { status: 400 }
            );
        }

        await connectDB();

        // Get user and check subscription limits
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get current inventory
        let inventory = await UserInventory.findOne({ userId: session.user.id });
        if (!inventory) {
            inventory = new UserInventory({
                userId: session.user.id,
                items: []
            });
        }

        const currentItemCount = inventory.items.length;
        const requestedItemCount = items.length;
        const totalAfterAdd = currentItemCount + requestedItemCount;

        // Use proper subscription object and feature gate
        const userSubscription = user.subscription || { tier: 'free', status: 'free' };
        const effectiveTier = getSubscriptionTier(userSubscription);

        console.log('🔍 BULK-ADD DEBUG:', {
            userId: session.user.id,
            email: session.user.email,
            userSubscription,
            effectiveTier,
            currentItems: currentItemCount,
            requestedItems: requestedItemCount,
            isAdmin: user.isAdmin,
            source,
            ocrEngine
        });

        // Check subscription limits (bypass for Platinum/Admin)
        if (effectiveTier === 'platinum' || effectiveTier === 'admin' || user.isAdmin) {
            console.log('✅ PLATINUM/ADMIN BYPASS - Unlimited bulk-add access');
        } else {
            const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.INVENTORY_LIMIT, totalAfterAdd - 1);

            if (!hasCapacity) {
                const requiredTier = getRequiredTier(FEATURE_GATES.INVENTORY_LIMIT);
                const maxItems = effectiveTier === 'free' ? 50 :
                    effectiveTier === 'gold' ? 250 : 'unlimited';

                console.log(`❌ Bulk add rejected: ${effectiveTier} tier limit exceeded`);

                return NextResponse.json({
                    error: `Adding ${requestedItemCount} items would exceed your limit. You have ${currentItemCount} items and can add ${maxItems === 'unlimited' ? 'unlimited' : maxItems - currentItemCount} more.`,
                    code: 'USAGE_LIMIT_EXCEEDED',
                    feature: FEATURE_GATES.INVENTORY_LIMIT,
                    currentCount: currentItemCount,
                    requestedCount: requestedItemCount,
                    maxItems: maxItems,
                    currentTier: effectiveTier,
                    requiredTier: requiredTier,
                    upgradeUrl: `/pricing?source=inventory-bulk-limit&feature=inventory&required=${requiredTier}`
                }, { status: 403 });
            }
        }

        // Validate each item and process price tracking
        const validatedItems = [];
        const errors = [];
        let priceDataAdded = 0;

        items.forEach((item, index) => {
            if (!item.name || item.name.trim() === '') {
                errors.push(`Item ${index + 1}: Name is required`);
                return;
            }

            // 🆕 PROCESS PRICE TRACKING DATA
            let priceHistory = [];
            let currentBestPrice = null;
            let averagePrice = null;

            if (item.hasReceiptPriceData && item.receiptPriceEntry) {
                try {
                    const priceEntry = {
                        price: parseFloat(item.receiptPriceEntry.price),
                        store: item.receiptPriceEntry.store || 'Unknown Store',
                        date: item.receiptPriceEntry.date || new Date().toISOString().split('T')[0],
                        size: item.receiptPriceEntry.size || '',
                        unit: item.receiptPriceEntry.unit || 'each',
                        notes: item.receiptPriceEntry.notes || 'From receipt scan',
                        isOnSale: item.receiptPriceEntry.isOnSale || false,
                        addedDate: new Date(),
                        // 🆕 ADD CURRENCY INFO
                        currency: user.currencyPreferences?.currency || 'USD',
                        currencySymbol: user.currencyPreferences?.currencySymbol || '$'
                    };

                    // Validate price data
                    if (priceEntry.price > 0 && priceEntry.price < 10000) {
                        priceHistory = [priceEntry];
                        currentBestPrice = priceEntry;
                        averagePrice = priceEntry.price;
                        priceDataAdded++;

                        console.log(`💰 Added price tracking for ${item.name}: ${user.currencyPreferences?.currencySymbol || '$'}${priceEntry.price} at ${priceEntry.store}`);
                    }
                } catch (priceError) {
                    console.error(`❌ Error processing price data for ${item.name}:`, priceError);
                }
            }

            // Create validated item with defaults and price tracking
            const validatedItem = {
                name: item.name.trim(),
                brand: item.brand || '',
                category: item.category || 'Other',
                quantity: Math.max(item.quantity || 1, 0.1),
                unit: item.unit || 'item',

                // Secondary unit support
                secondaryQuantity: item.secondaryQuantity && item.secondaryQuantity !== '' ?
                    Math.max(parseFloat(item.secondaryQuantity), 0.1) : null,
                secondaryUnit: item.secondaryQuantity && item.secondaryQuantity !== '' ?
                    item.secondaryUnit : null,

                location: item.location || 'pantry',
                upc: item.upc || '',
                expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
                addedDate: new Date(),
                nutrition: item.nutrition || null,
                notes: item.notes || '',

                // 🆕 PRICE TRACKING FIELDS
                priceHistory: priceHistory,
                currentBestPrice: currentBestPrice,
                averagePrice: averagePrice,
                priceAlerts: {
                    enabled: false,
                    targetPrice: null,
                    alertWhenBelow: true,
                    lastAlertSent: null
                },

                // OCR and source metadata
                sourceMetadata: {
                    source: source || 'bulk-add',
                    ocrEngine: ocrEngine || null,
                    addedVia: 'bulk-add-api',
                    rawText: item.rawText || null,
                    confidence: item.confidence || null,
                    unitPrice: item.unitPrice || null,
                    originalPrice: item.price || null,
                    addedAt: new Date(),
                    // 🆕 PRICE TRACKING METADATA
                    priceTrackingEnabled: priceHistory.length > 0,
                    priceSource: 'receipt-scan'
                }
            };

            validatedItems.push(validatedItem);
        });

        if (errors.length > 0) {
            console.log('❌ Validation errors:', errors);
            return NextResponse.json(
                {
                    error: 'Validation errors found',
                    details: errors
                },
                { status: 400 }
            );
        }

        // Add all validated items to inventory
        inventory.items.push(...validatedItems);
        inventory.lastUpdated = new Date();

        await inventory.save();

        // Update user's usage tracking with OCR engine info
        if (!user.usageTracking) {
            user.usageTracking = {};
        }

        // Track overall inventory usage
        user.usageTracking.totalInventoryItems = inventory.items.length;
        user.usageTracking.lastUpdated = new Date();

        // 🆕 TRACK PRICE TRACKING USAGE
        if (priceDataAdded > 0) {
            if (!user.usageTracking.priceTracking) {
                user.usageTracking.priceTracking = {
                    totalPriceEntries: 0,
                    itemsWithPrices: 0,
                    firstPriceAdded: new Date(),
                    lastPriceAdded: new Date()
                };
            }

            user.usageTracking.priceTracking.totalPriceEntries += priceDataAdded;
            user.usageTracking.priceTracking.itemsWithPrices += priceDataAdded;
            user.usageTracking.priceTracking.lastPriceAdded = new Date();
        }

        // Track OCR engine usage for analytics
        if (ocrEngine) {
            if (!user.usageTracking.ocrEngineUsage) {
                user.usageTracking.ocrEngineUsage = {};
            }

            const engineKey = ocrEngine.toLowerCase();
            if (!user.usageTracking.ocrEngineUsage[engineKey]) {
                user.usageTracking.ocrEngineUsage[engineKey] = {
                    totalScans: 0,
                    totalItemsExtracted: 0,
                    firstUsed: new Date(),
                    lastUsed: new Date()
                };
            }

            user.usageTracking.ocrEngineUsage[engineKey].totalScans += 1;
            user.usageTracking.ocrEngineUsage[engineKey].totalItemsExtracted += validatedItems.length;
            user.usageTracking.ocrEngineUsage[engineKey].lastUsed = new Date();
        }

        await user.save();

        // Log successful operation with detailed info
        console.log(`✅ Bulk add successful:`, {
            userId: session.user.id,
            itemsAdded: validatedItems.length,
            priceDataAdded: priceDataAdded,
            source: source || 'bulk-add',
            ocrEngine: ocrEngine || 'none',
            userTier: userSubscription.tier,
            totalItemsAfter: inventory.items.length,
            categories: [...new Set(validatedItems.map(item => item.category))],
            locations: [...new Set(validatedItems.map(item => item.location))]
        });

        // Generate comprehensive response
        const response = {
            success: true,
            itemsAdded: validatedItems.length,
            priceDataAdded: priceDataAdded, // 🆕 PRICE TRACKING COUNT
            source: source || 'bulk-add',
            ocrEngine: ocrEngine || null,
            message: `Successfully added ${validatedItems.length} items to your inventory${priceDataAdded > 0 ? ` with price tracking for ${priceDataAdded} items` : ''}`,
            summary: {
                totalItems: validatedItems.length,
                categories: [...new Set(validatedItems.map(item => item.category))],
                locations: [...new Set(validatedItems.map(item => item.location))],
                source: source || 'bulk-add',
                ocrEngine: ocrEngine || null,
                processingInfo: {
                    validationErrors: 0,
                    duplicatesRemoved: 0,
                    enhancedWith: ocrEngine ? [`${ocrEngine} OCR`] : [],
                    priceTrackingEnabled: priceDataAdded > 0 // 🆕
                }
            },
            inventoryStatus: {
                totalItems: inventory.items.length,
                remainingCapacity: userSubscription.tier === 'free' ?
                    Math.max(0, 50 - inventory.items.length) :
                    userSubscription.tier === 'gold' ?
                        Math.max(0, 250 - inventory.items.length) : 'Unlimited',
                currentTier: userSubscription.tier
            },
            // 🆕 PRICE TRACKING STATUS
            priceTrackingStatus: {
                itemsWithPrices: priceDataAdded,
                priceTrackingEnabled: priceDataAdded > 0,
                analyticsUrl: '/inventory?tab=analytics'
            },
            metadata: metadata || {}
        };

        // Add performance metrics if available
        if (metadata?.processingTime) {
            response.performance = {
                ocrProcessingTime: metadata.processingTime,
                itemsPerSecond: Math.round(validatedItems.length / (metadata.processingTime / 1000)),
                engine: ocrEngine
            };
        }

        return NextResponse.json(response);

    } catch (error) {
        console.error('❌ POST bulk-add inventory error:', {
            error: error.message,
            stack: error.stack,
            userId: session?.user?.id
        });

        return NextResponse.json(
            {
                error: 'Failed to add items to inventory',
                details: error.message,
                code: 'INTERNAL_SERVER_ERROR'
            },
            { status: 500 }
        );
    }
}