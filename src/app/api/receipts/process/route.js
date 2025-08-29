// file: src/app/api/receipts/process/route.js v1

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { auth } from '@/lib/auth';

// Receipt processing API route
export async function POST(request) {
    try {
        // Authenticate user
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const userId = session.user.id;
        const formData = await request.formData();
        const image = formData.get('image');
        const storeContext = formData.get('store_context') || '';

        if (!image) {
            return NextResponse.json(
                { error: 'Receipt image is required' },
                { status: 400 }
            );
        }

        // Convert image to base64
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = buffer.toString('base64');

        console.log(`🧾 Processing receipt for user ${userId}`);

        // Call Modal.com function (similar to your video extractor pattern)
        const modalResponse = await fetch(`${process.env.MODAL_BASE_URL}/process_receipt_with_ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MODAL_TOKEN}`,
            },
            body: JSON.stringify({
                image_data: base64Image,
                store_context: storeContext,
                user_id: userId
            })
        });

        if (!modalResponse.ok) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Modal API Failed',
                message: `Modal API error: ${modalResponse.status}`
            });
            return;
        }

        const result = await modalResponse.json();

        if (!result.success) {
            return NextResponse.json(
                {
                    error: result.error,
                    troubleshooting: {
                        tips: [
                            "Ensure receipt is well-lit and clearly visible",
                            "Try straightening the receipt before taking photo",
                            "Make sure all text is readable in the image",
                            "For long receipts, try processing in sections"
                        ]
                    }
                },
                { status: 400 }
            );
        }

        const receiptData = result.receipt_data;

        // Connect to database
        const { db } = await connectDB();

        // Store processing log
        const processingLog = {
            userId: userId,
            receiptImageSize: buffer.length,
            storeInfo: receiptData.store_info,
            processingTime: new Date(),
            itemCount: receiptData.items.length,
            confidenceBreakdown: result.confidence_breakdown,
            ocrTextLength: result.raw_data.ocr_text.length,
            processingMethod: 'ai_enhanced',
            success: true
        };

        await db.collection('receipt_processing_logs').insertOne(processingLog);

        // Prepare items for staging area (user confirmation)
        const stagingItems = receiptData.items.map(item => ({
            userId: userId,
            processingLogId: processingLog._id,

            // Product information
            name: item.name,
            originalReceiptText: item.original_receipt_text,
            category: item.category,
            storageLocation: item.storage_location,
            brand: item.brand,
            sizeInfo: item.size_info,
            dietaryFlags: item.dietary_flags,

            // Purchase information
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price,
            purchaseDate: new Date(item.purchase_date),

            // AI metadata
            confidenceScore: item.confidence_score,
            needsUserReview: item.needs_user_review,
            suggestedAlternatives: item.suggested_alternatives,
            estimatedShelfLifeDays: item.estimated_shelf_life_days,

            // Status
            status: item.confidence_score >= 0.9 ? 'auto_approved' : 'pending_review',
            createdAt: new Date(),
            expirationDate: new Date(Date.now() + (item.estimated_shelf_life_days * 24 * 60 * 60 * 1000))
        }));

        // Insert staging items
        if (stagingItems.length > 0) {
            await db.collection('receipt_items_staging').insertMany(stagingItems);
        }

        // Auto-approve high confidence items to inventory
        const autoApproveItems = stagingItems.filter(item => item.status === 'auto_approved');

        if (autoApproveItems.length > 0) {
            const inventoryItems = autoApproveItems.map(item => ({
                userId: item.userId,
                name: item.name,
                category: item.category,
                storageLocation: item.storageLocation,
                brand: item.brand,
                quantity: item.quantity,
                unit: 'each', // You may want to make this smarter
                purchaseDate: item.purchaseDate,
                expirationDate: item.expirationDate,
                dietaryFlags: item.dietaryFlags,
                addedVia: 'receipt_scan',
                confidenceScore: item.confidenceScore,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            await db.collection('food_inventory').insertMany(inventoryItems);
        }

        console.log(`✅ Receipt processed: ${autoApproveItems.length} auto-added, ${stagingItems.length - autoApproveItems.length} need review`);

        // Return response with staging information
        return NextResponse.json({
            success: true,
            data: {
                storeInfo: receiptData.store_info,
                totals: receiptData.totals,
                summary: {
                    totalItems: receiptData.items.length,
                    autoAddedItems: autoApproveItems.length,
                    itemsNeedingReview: stagingItems.length - autoApproveItems.length,
                    processingMethod: 'ai_enhanced'
                },
                autoApprovedItems: autoApproveItems.map(item => ({
                    name: item.name,
                    category: item.category,
                    quantity: item.quantity,
                    confidenceScore: item.confidenceScore
                })),
                itemsForReview: stagingItems
                    .filter(item => item.status === 'pending_review')
                    .map(item => ({
                        id: item._id,
                        name: item.name,
                        originalText: item.originalReceiptText,
                        category: item.category,
                        storageLocation: item.storageLocation,
                        quantity: item.quantity,
                        confidenceScore: item.confidenceScore,
                        suggestedAlternatives: item.suggestedAlternatives,
                        needsUserReview: item.needsUserReview
                    }))
            }
        });

    } catch (error) {
        console.error('Receipt processing error:', error);

        // Log error to database
        try {
            const { db } = await connectDB();
            await db.collection('receipt_processing_logs').insertOne({
                userId: session?.user?.id || 'unknown',
                processingTime: new Date(),
                success: false,
                error: error.message,
                errorStack: error.stack
            });
        } catch (dbError) {
            console.error('Failed to log error:', dbError);
        }

        return NextResponse.json(
            {
                error: 'Receipt processing failed',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}

// API route for confirming/rejecting staged items
export async function PATCH(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { action, itemIds, corrections } = await request.json();
        const userId = session.user.id;

        const { db } = await connectDB();

        if (action === 'approve') {
            // Move items from staging to inventory
            const stagingItems = await db.collection('receipt_items_staging')
                .find({
                    _id: { $in: itemIds.map(id => new ObjectId(id)) },
                    userId: userId
                })
                .toArray();

            if (stagingItems.length === 0) {
                return NextResponse.json(
                    { error: 'No items found for approval' },
                    { status: 404 }
                );
            }

            // Apply any user corrections
            const inventoryItems = stagingItems.map(item => {
                const correction = corrections?.find(c => c.itemId === item._id.toString());

                return {
                    userId: item.userId,
                    name: correction?.name || item.name,
                    category: correction?.category || item.category,
                    storageLocation: correction?.storageLocation || item.storageLocation,
                    brand: item.brand,
                    quantity: correction?.quantity || item.quantity,
                    unit: 'each',
                    purchaseDate: item.purchaseDate,
                    expirationDate: item.expirationDate,
                    dietaryFlags: item.dietaryFlags,
                    addedVia: 'receipt_scan_reviewed',
                    confidenceScore: item.confidenceScore,
                    userCorrected: !!correction,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
            });

            // Insert to inventory
            await db.collection('food_inventory').insertMany(inventoryItems);

            // Remove from staging
            await db.collection('receipt_items_staging').deleteMany({
                _id: { $in: itemIds.map(id => new ObjectId(id)) },
                userId: userId
            });

            return NextResponse.json({
                success: true,
                message: `${inventoryItems.length} items added to inventory`,
                addedItems: inventoryItems.length
            });

        } else if (action === 'reject') {
            // Remove items from staging
            const result = await db.collection('receipt_items_staging').deleteMany({
                _id: { $in: itemIds.map(id => new ObjectId(id)) },
                userId: userId
            });

            return NextResponse.json({
                success: true,
                message: `${result.deletedCount} items removed`,
                removedItems: result.deletedCount
            });

        } else {
            return NextResponse.json(
                { error: 'Invalid action. Use "approve" or "reject"' },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Receipt confirmation error:', error);
        return NextResponse.json(
            { error: 'Failed to process confirmation' },
            { status: 500 }
        );
    }
}

// Get pending receipt items for review
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { db } = await connectDB();
        const userId = session.user.id;

        const pendingItems = await db.collection('receipt_items_staging')
            .find({
                userId: userId,
                status: 'pending_review'
            })
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json({
            success: true,
            pendingItems: pendingItems.map(item => ({
                id: item._id,
                name: item.name,
                originalText: item.originalReceiptText,
                category: item.category,
                storageLocation: item.storageLocation,
                quantity: item.quantity,
                confidenceScore: item.confidenceScore,
                suggestedAlternatives: item.suggestedAlternatives,
                createdAt: item.createdAt
            }))
        });

    } catch (error) {
        console.error('Error fetching pending items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pending items' },
            { status: 500 }
        );
    }
}