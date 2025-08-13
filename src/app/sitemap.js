// file: /src/app/sitemap.js v1 - Dynamic sitemap generation with recipe URLs

import { connectToDatabase } from '@/lib/mongodb';

export default async function sitemap() {
    const baseUrl = 'https://docbearscomfort.kitchen';

    // Static pages with priorities and change frequencies
    const staticPages = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/recipe-search`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/pricing`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/auth/signin`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/auth/signup`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
    ];

    let dynamicPages = [];

    try {
        // Get public recipes for dynamic URLs
        const { db } = await connectToDatabase();

        // Fetch public recipes with basic info
        const publicRecipes = await db.collection('recipes')
            .find(
                { isPublic: true },
                {
                    projection: {
                        _id: 1,
                        updatedAt: 1,
                        createdAt: 1,
                        title: 1,
                        isMultiPart: 1,
                        ratingStats: 1
                    }
                }
            )
            .sort({ updatedAt: -1 })
            .limit(1000) // Limit for performance
            .toArray();

        // Generate recipe preview URLs
        dynamicPages = publicRecipes.map(recipe => {
            // Higher priority for highly rated or multi-part recipes
            let priority = 0.5;
            if (recipe.ratingStats?.averageRating >= 4.5) priority = 0.7;
            if (recipe.isMultiPart) priority = Math.max(priority, 0.6);
            if (recipe.ratingStats?.totalRatings >= 10) priority = Math.max(priority, 0.6);

            return {
                url: `${baseUrl}/recipe-preview/${recipe._id}`,
                lastModified: recipe.updatedAt || recipe.createdAt || new Date(),
                changeFrequency: 'weekly',
                priority: priority,
            };
        });

        // Add category pages
        const categories = [
            'breakfast', 'entrees', 'side-dishes', 'soups', 'desserts',
            'appetizers', 'beverages', 'seasonings', 'sauces', 'salad-dressings',
            'marinades', 'sandwiches', 'breads', 'specialty-items'
        ];

        const categoryPages = categories.map(category => ({
            url: `${baseUrl}/recipe-search?category=${category}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.7,
        }));

        dynamicPages = [...dynamicPages, ...categoryPages];

        // Add special search pages
        const specialPages = [
            {
                url: `${baseUrl}/recipe-search?filter=multi-part`,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.8,
            },
            {
                url: `${baseUrl}/recipe-search?sort=featured`,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.8,
            },
            {
                url: `${baseUrl}/recipe-search?dietary=vegetarian`,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.7,
            },
            {
                url: `${baseUrl}/recipe-search?dietary=vegan`,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.7,
            },
            {
                url: `${baseUrl}/recipe-search?difficulty=easy`,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.7,
            },
        ];

        dynamicPages = [...dynamicPages, ...specialPages];

    } catch (error) {
        console.error('Error generating dynamic sitemap entries:', error);
        // Continue with static pages only if DB fails
    }

    return [...staticPages, ...dynamicPages];
}