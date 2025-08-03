import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

export async function GET() {
    try {
        await connectDB();

        // Check the specific recipes that were processed
        const recipes = await Recipe.find({
            title: {
                $in: [
                    'Italian Drunken Noodles',
                    'Sweet and Sour Pineapple Chicken',
                    'Cheesy Lasagna Sheet Pasta'
                ]
            }
        }).select('title imageUrl imageAttribution imageSource hasUserImage').lean();

        return NextResponse.json({
            success: true,
            recipes: recipes.map(r => ({
                title: r.title,
                imageUrl: r.imageUrl,
                imageAttribution: r.imageAttribution,
                imageSource: r.imageSource,
                hasUserImage: r.hasUserImage
            }))
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}