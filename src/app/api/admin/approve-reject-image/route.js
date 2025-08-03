// app/api/admin/approve-reject-image/route.js - Manual approval/rejection override
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import { Recipe } from '@/lib/models.js';

export async function POST(request) {
    try {
        const {
            action, // 'approve' or 'reject'
            recipeTitle,
            imageOption,
            reason = ''
        } = await request.json();

        console.log(`${action.toUpperCase()} image for: "${recipeTitle}"`);

        await connectDB();

        // Find the recipe
        const recipe = await Recipe.findOne({ title: recipeTitle });
        if (!recipe) {
            return NextResponse.json({
                success: false,
                error: 'Recipe not found'
            }, { status: 404 });
        }

        if (action === 'approve') {
            // Apply the approved image to the recipe
            await Recipe.findByIdAndUpdate(recipe._id, {
                imageUrl: imageOption.url,
                imageAttribution: `${imageOption.attribution?.photographer || 'Unknown'} from ${imageOption.attribution?.source || 'Unknown'}`,
                imageSource: imageOption.source,
                imageSearchTerms: imageOption.searchTerm || '',
                aiRelevanceScore: imageOption.score,
                aiConfidence: imageOption.confidence,
                aiReason: imageOption.reason || '',
                aiTags: imageOption.tags || [],
                manuallyApproved: true,
                manualApprovalReason: reason,
                hasUserImage: false,
                lastImageUpdate: new Date(),
                processingMethod: 'manual_approval',
                updatedAt: new Date()
            });

            console.log(`✅ Applied manually approved image for: "${recipeTitle}"`);

            return NextResponse.json({
                success: true,
                action: 'approved',
                message: `Image approved and applied to "${recipeTitle}"`,
                appliedImage: {
                    url: imageOption.url,
                    score: imageOption.score,
                    source: imageOption.source
                }
            });

        } else if (action === 'reject') {
            // Store rejection info (could be used for learning/improving AI)
            const rejectionData = {
                recipeTitle,
                rejectedImage: {
                    url: imageOption.url,
                    score: imageOption.score,
                    source: imageOption.source,
                    reason: imageOption.reason
                },
                rejectionReason: reason,
                rejectedAt: new Date()
            };

            // You could store this in a separate collection for analysis
            console.log(`❌ Rejected image for: "${recipeTitle}"`, rejectionData);

            return NextResponse.json({
                success: true,
                action: 'rejected',
                message: `Image rejected for "${recipeTitle}". Reason: ${reason}`,
                rejectedImage: {
                    url: imageOption.url,
                    score: imageOption.score
                }
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Invalid action. Use "approve" or "reject"'
        }, { status: 400 });

    } catch (error) {
        console.error('Approval/rejection error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}