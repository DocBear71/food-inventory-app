// app/api/admin/check-recipe-images/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

export async function GET() {
    try {
        await connectDB();

        // Check the specific problematic recipes
        const problematicTitles = [
            'Doc Bear\'s Vegan Alfredo Sauce I',
            'Doc Bear\'s Vegan Alfredo Sauce II',
            'Doc Bear\'s Vegan Mushroom Alfredo Sauce',
            'Cheesy Lasagna Sheet Pasta',
            'Italian Drunken Noodles',
            'Sweet and Sour Pineapple Chicken'
        ];

        const recipes = await Recipe.find({
            title: { $in: problematicTitles }
        }).select('title imageUrl imageAttribution imageSource hasUserImage description category tags ingredients').lean();

        // Analyze each recipe
        const analysis = recipes.map(recipe => {
            // Basic context analysis
            const hasDescription = !!recipe.description;
            const ingredientCount = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0;
            const tagCount = Array.isArray(recipe.tags) ? recipe.tags.length : 0;

            // Check if it's a vegan recipe
            const title = recipe.title.toLowerCase();
            const description = (recipe.description || '').toLowerCase();
            const tags = Array.isArray(recipe.tags) ? recipe.tags.join(' ').toLowerCase() : '';
            const allText = `${title} ${description} ${tags}`;

            const isVegan = allText.includes('vegan');
            const isSauce = title.includes('sauce') || recipe.category === 'sauces';
            const isAlfredo = title.includes('alfredo');
            const isPasta = title.includes('pasta') || title.includes('noodles') || title.includes('lasagna');
            const isChicken = title.includes('chicken');

            // Determine what the image should show
            let expectedImageType = 'unknown';
            if (isSauce && isAlfredo && isVegan) {
                expectedImageType = 'vegan alfredo sauce (white creamy sauce in bowl)';
            } else if (isSauce && isAlfredo) {
                expectedImageType = 'alfredo sauce (white creamy sauce)';
            } else if (isPasta && title.includes('lasagna')) {
                expectedImageType = 'lasagna (layered pasta casserole)';
            } else if (isPasta && title.includes('drunken')) {
                expectedImageType = 'thai drunken noodles (wide rice noodles)';
            } else if (isChicken && title.includes('sweet') && title.includes('sour')) {
                expectedImageType = 'sweet and sour chicken (chicken pieces with sauce)';
            }

            return {
                title: recipe.title,
                currentImageUrl: recipe.imageUrl,
                imageSource: recipe.imageSource,
                hasUserImage: recipe.hasUserImage,
                category: recipe.category,

                // Context info
                hasDescription,
                ingredientCount,
                tagCount,

                // Recipe type analysis
                isVegan,
                isSauce,
                isAlfredo,
                isPasta,
                isChicken,
                expectedImageType,

                // Image status
                hasImage: !!recipe.imageUrl,
                needsNewImage: !!recipe.imageUrl, // All of these likely need new images

                // Sample ingredients (first 3)
                sampleIngredients: Array.isArray(recipe.ingredients) ?
                    recipe.ingredients.slice(0, 3).map(ing =>
                        typeof ing === 'string' ? ing : ing.name || ''
                    ).filter(Boolean) : []
            };
        });

        // Also get some stats about all recipes
        const totalRecipes = await Recipe.countDocuments();
        const recipesWithImages = await Recipe.countDocuments({
            imageUrl: { $exists: true, $nin: [null, ''] }
        });
        const recipesWithoutImages = await Recipe.countDocuments({
            $and: [
                { $or: [
                        { imageUrl: { $exists: false } },
                        { imageUrl: null },
                        { imageUrl: '' }
                    ]},
                { 'uploadedImage.data': { $exists: false } },
                { 'extractedImage.data': { $exists: false } }
            ]
        });

        return NextResponse.json({
            success: true,
            problematicRecipes: analysis,
            stats: {
                total: totalRecipes,
                withImages: recipesWithImages,
                withoutImages: recipesWithoutImages,
                imagePercentage: Math.round((recipesWithImages / totalRecipes) * 100)
            },
            recommendations: [
                'Run enhanced image finder on problematic recipes',
                'Use context-aware search terms for better results',
                'Consider manual image selection for key recipes'
            ]
        });

    } catch (error) {
        console.error('Check recipe images error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message
            },
            { status: 500 }
        );
    }
}
