// file: /src/app/api/nutrition/recent-analyses/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, UserInventory } from '@/lib/models';
import { NutritionLog } from "@/models/NutritionLog.js";

export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 20;
        const type = searchParams.get('type') || 'all'; // 'all', 'consumption', 'recipe', 'inventory'
        const days = parseInt(searchParams.get('days')) || 30;

        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        let analyses = [];

        // Get nutrition consumption logs
        if (type === 'all' || type === 'consumption') {
            const nutritionLogs = await NutritionLog.find({
                userId: session.user.id,
                consumedAt: { $gte: startDate }
            })
                .sort({ consumedAt: -1 })
                .limit(limit)
                .lean();

            analyses.push(...nutritionLogs.map(log => ({
                type: 'consumption',
                date: log.consumedAt,
                data: {
                    itemName: log.nutrition?.itemName || 'Unknown Item',
                    nutrition: log.nutrition,
                    quantity: log.nutrition?.consumedQuantity,
                    method: log.nutrition?.calculationMethod || 'unknown'
                },
                id: log._id
            })));
        }

        // Get recently analyzed recipes
        if (type === 'all' || type === 'recipe') {
            const recentRecipes = await Recipe.find({
                createdBy: session.user.id,
                nutritionCalculatedAt: { $gte: startDate, $exists: true }
            })
                .sort({ nutritionCalculatedAt: -1 })
                .limit(limit)
                .select('title nutrition nutritionCalculatedAt nutritionCoverage')
                .lean();

            analyses.push(...recentRecipes.map(recipe => ({
                type: 'recipe',
                date: recipe.nutritionCalculatedAt,
                data: {
                    recipeName: recipe.title,
                    nutrition: recipe.nutrition,
                    coverage: recipe.nutritionCoverage,
                    method: recipe.nutrition?.calculationMethod || 'unknown'
                },
                id: recipe._id
            })));
        }

        // Get recently analyzed inventory items
        if (type === 'all' || type === 'inventory') {
            const userInventory = await UserInventory.findOne({
                userId: session.user.id
            }).lean();

            if (userInventory) {
                const recentlyAnalyzed = userInventory.items
                    .filter(item =>
                        item.nutritionLastCalculated &&
                        new Date(item.nutritionLastCalculated) >= startDate
                    )
                    .sort((a, b) => new Date(b.nutritionLastCalculated) - new Date(a.nutritionLastCalculated))
                    .slice(0, limit);

                analyses.push(...recentlyAnalyzed.map(item => ({
                    type: 'inventory',
                    date: item.nutritionLastCalculated,
                    data: {
                        itemName: item.name,
                        brand: item.brand,
                        category: item.category,
                        nutrition: item.nutrition,
                        method: item.nutrition?.calculationMethod || 'unknown'
                    },
                    id: item._id
                })));
            }
        }

        // Sort all analyses by date and limit
        analyses.sort((a, b) => new Date(b.date) - new Date(a.date));
        analyses = analyses.slice(0, limit);

        // Calculate summary statistics
        const summary = {
            totalAnalyses: analyses.length,
            byType: {
                consumption: analyses.filter(a => a.type === 'consumption').length,
                recipe: analyses.filter(a => a.type === 'recipe').length,
                inventory: analyses.filter(a => a.type === 'inventory').length
            },
            byMethod: {},
            averageConfidence: 0
        };

        // Calculate method distribution and confidence
        let confidenceSum = 0;
        let confidenceCount = 0;

        analyses.forEach(analysis => {
            const method = analysis.data.method || 'unknown';
            summary.byMethod[method] = (summary.byMethod[method] || 0) + 1;

            const confidence = analysis.data.nutrition?.confidence;
            if (confidence && typeof confidence === 'number') {
                confidenceSum += confidence;
                confidenceCount++;
            }
        });

        if (confidenceCount > 0) {
            summary.averageConfidence = Math.round((confidenceSum / confidenceCount) * 100) / 100;
        }

        return NextResponse.json({
            success: true,
            analyses: analyses,
            summary: summary,
            timeframe: {
                days: days,
                startDate: startDate,
                endDate: new Date()
            }
        });
    } catch (error) {
        console.error('Recent analyses API error:', error);
        return NextResponse.json({
            error: 'Failed to fetch recent analyses',
            details: error.message
        }, { status: 500 });
    }
}