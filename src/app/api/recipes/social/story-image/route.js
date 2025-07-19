// file: /src/app/api/recipes/social/story-image/route.js - Generate story images for sharing

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');
        const title = searchParams.get('title');
        const template = searchParams.get('template') || 'modern';
        const includeQR = searchParams.get('includeQR') !== 'false';

        if (!recipeId) {
            return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
        }

        await connectDB();

        // Get recipe (public recipes don't need auth)
        const recipe = await Recipe.findById(recipeId).lean();
        if (!recipe) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        // For private recipes, check auth
        if (!recipe.isPublic) {
            const session = await getEnhancedSession(request);
            if (!session?.user?.id || recipe.createdBy.toString() !== session.user.id) {
                return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
            }
        }

        // Generate a simple preview image (placeholder implementation)
        // In production, you'd use the same Canvas logic as the POST route
        const svg = generatePreviewSVG(recipe, template);

        return new NextResponse(svg, {
            headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=3600',
            },
        });

    } catch (error) {
        console.error('Error generating story preview:', error);
        return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
    }
}

function generatePreviewSVG(recipe, template) {
    const colors = {
        modern: { bg: '#667eea', text: '#ffffff' },
        classic: { bg: '#8b4513', text: '#ffffff' },
        minimal: { bg: '#ffffff', text: '#000000' }
    };

    const color = colors[template] || colors.modern;

    return `
        <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="${color.bg}"/>
            <text x="540" y="960" text-anchor="middle" fill="${color.text}" 
                  font-family="Arial, sans-serif" font-size="48" font-weight="bold">
                ${escapeXml(recipe.title)}
            </text>
            <text x="540" y="1020" text-anchor="middle" fill="${color.text}" 
                  font-family="Arial, sans-serif" font-size="24">
                Doc Bear's Comfort Kitchen
            </text>
        </svg>
    `;
}

function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}