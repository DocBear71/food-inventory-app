// file: /src/app/api/inventory/enhance-nutrition/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory } from '@/lib/models';
import { modalBridge } from '@/lib/modal-bridge';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { itemIds, analysisLevel = 'standard' } = await request.json();

        // Get user's inventory
        const userInventory = await UserInventory.findOne({ userId: session.user.id });
        if (!userInventory) {
            return NextResponse.json({
                error: 'No inventory found'
            }, { status: 404 });
        }

        // Filter items to analyze
        let itemsToAnalyze = userInventory.items;
        if (itemIds && itemIds.length > 0) {
            itemsToAnalyze = userInventory.items.filter(item =>
                itemIds.includes(item._id.toString())
            );
        } else {
            // Analyze items without nutrition data
            itemsToAnalyze = userInventory.items.filter(item =>
                !item.nutrition || Object.keys(item.nutrition).length === 0
            );
        }

        if (itemsToAnalyze.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No items need nutrition analysis',
                analyzed: 0
            });
        }

        console.log(`🔬 Analyzing nutrition for ${itemsToAnalyze.length} items...`);

        // Analyze nutrition for each item
        const analysisResults = [];
        const batchSize = 5; // Process in batches to avoid overwhelming the API

        for (let i = 0; i < itemsToAnalyze.length; i += batchSize) {
            const batch = itemsToAnalyze.slice(i, i + batchSize);

            const batchPromises = batch.map(async (item) => {
                try {
                    const result = await modalBridge.analyzeNutrition({
                        type: 'inventory_item',
                        data: {
                            name: item.name,
                            brand: item.brand,
                            category: item.category,
                            quantity: item.quantity,
                            unit: item.unit,
                            upc: item.upc
                        },
                        analysis_level: analysisLevel,
                        userId: session.user.id
                    });

                    if (result.success) {
                        // Update item with nutrition data
                        const itemIndex = userInventory.items.findIndex(invItem =>
                            invItem._id.toString() === item._id.toString()
                        );

                        if (itemIndex !== -1) {
                            userInventory.items[itemIndex].nutrition = result.nutrition;
                            userInventory.items[itemIndex].nutritionLastCalculated = new Date();
                            userInventory.items[itemIndex].fdcId = result.fdcId || null;
                        }

                        return {
                            itemId: item._id,
                            itemName: item.name,
                            success: true,
                            nutrition: result.nutrition,
                            confidence: result.confidence || 0.8,
                            method: result.method || 'ai_analysis'
                        };
                    } else {
                        return {
                            itemId: item._id,
                            itemName: item.name,
                            success: false,
                            error: result.error
                        };
                    }
                } catch (error) {
                    console.error(`Failed to analyze ${item.name}:`, error);
                    return {
                        itemId: item._id,
                        itemName: item.name,
                        success: false,
                        error: error.message
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            analysisResults.push(...batchResults);

            // Small delay between batches
            if (i + batchSize < itemsToAnalyze.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Save updated inventory
        userInventory.lastUpdated = new Date();
        await userInventory.save();

        const successfulAnalyses = analysisResults.filter(result => result.success);
        const failedAnalyses = analysisResults.filter(result => !result.success);

        console.log(`✅ Nutrition analysis complete: ${successfulAnalyses.length} successful, ${failedAnalyses.length} failed`);

        return NextResponse.json({
            success: true,
            analyzed: successfulAnalyses.length,
            failed: failedAnalyses.length,
            results: analysisResults,
            summary: {
                totalItems: itemsToAnalyze.length,
                successfulAnalyses: successfulAnalyses.length,
                failedAnalyses: failedAnalyses.length,
                averageConfidence: successfulAnalyses.length > 0
                    ? successfulAnalyses.reduce((sum, result) => sum + (result.confidence || 0), 0) / successfulAnalyses.length
                    : 0
            }
        });
    } catch (error) {
        console.error('Nutrition enhancement error:', error);
        return NextResponse.json({
            error: 'Nutrition enhancement failed',
            details: error.message
        }, { status: 500 });
    }
}