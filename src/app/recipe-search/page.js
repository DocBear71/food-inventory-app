// file: /src/app/recipe-search/page.js v2 - Enhanced SEO with dynamic meta tags

import RecipeSearchContent from './RecipeSearchContent';

// Function to generate dynamic metadata based on search params
export async function generateMetadata({ searchParams }) {
    const resolvedSearchParams = await searchParams;
    const category = resolvedSearchParams.category;
    const dietary = resolvedSearchParams.dietary;
    const difficulty = resolvedSearchParams.difficulty;
    const isMultiPart = resolvedSearchParams.filter === 'multi-part';
    const sortBy = resolvedSearchParams.sort;

    let title = 'Recipe Search - Doc Bear\'s Comfort Kitchen';
    let description = 'Discover amazing recipes from Dr. Edward McKeown\'s cookbook series. Search by ingredients, dietary preferences, difficulty, and more.';
    let keywords = ['recipe search', 'food recipes', 'cooking', 'meal ideas', 'recipe finder'];

    // Customize title and description based on filters
    if (category) {
        const categoryNames = {
            breakfast: 'Breakfast Recipes',
            entrees: 'Main Dish Recipes',
            'side-dishes': 'Side Dish Recipes',
            soups: 'Soup & Stew Recipes',
            desserts: 'Dessert Recipes',
            appetizers: 'Appetizer Recipes',
            beverages: 'Beverage Recipes',
            sandwiches: 'Sandwich Recipes',
            breads: 'Bread Recipes'
        };

        const categoryName = categoryNames[category] || `${category} Recipes`;
        title = `${categoryName} - Doc Bear's Comfort Kitchen`;
        description = `Explore our collection of delicious ${categoryName.toLowerCase()} from Dr. Edward McKeown's cookbook series. Professional recipes with detailed instructions.`;
        keywords.push(category, `${category} recipes`, `${category} cooking`);
    }

    if (isMultiPart) {
        title = 'Multi-Part Recipes - Professional Recipe Collection - Doc Bear\'s Kitchen';
        description = 'Discover complex multi-part recipes with organized sections like "Filling" and "Topping". Professional-style recipes from Dr. Edward McKeown\'s cookbook series.';
        keywords.push('multi-part recipes', 'complex recipes', 'professional cooking', 'recipe sections');
    }

    if (dietary) {
        const dietaryMap = {
            vegetarian: 'Vegetarian',
            vegan: 'Vegan',
            'gluten-free': 'Gluten-Free',
            healthy: 'Healthy',
            'low-carb': 'Low-Carb'
        };

        const dietaryName = dietaryMap[dietary] || dietary;
        title = `${dietaryName} Recipes - Doc Bear's Comfort Kitchen`;
        description = `Find delicious ${dietaryName.toLowerCase()} recipes from our cookbook collection. Healthy, flavorful options for every dietary preference.`;
        keywords.push(dietary, `${dietary} recipes`, `${dietary} cooking`, `${dietary} meals`);
    }

    if (difficulty) {
        title = `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Recipes - Doc Bear's Kitchen`;
        description = `${difficulty === 'easy' ? 'Quick and simple' : difficulty === 'medium' ? 'Moderately challenging' : 'Advanced'} recipes perfect for your skill level. Clear instructions and helpful tips included.`;
        keywords.push(`${difficulty} recipes`, `${difficulty} cooking`, 'cooking difficulty');
    }

    if (sortBy === 'featured') {
        title = 'Featured Recipes - Best of Doc Bear\'s Comfort Kitchen';
        description = 'Discover our handpicked featured recipes - the best of Dr. Edward McKeown\'s cookbook series with daily variety and top-rated dishes.';
        keywords.push('featured recipes', 'best recipes', 'top rated recipes');
    }

    return {
        title,
        description,
        keywords: keywords.join(', '),
        openGraph: {
            title: title,
            description: description,
            url: `${process.env.NODE_ENV === 'production' ? 'https://docbearscomfort.kitchen' : 'http://localhost:3000'}/recipe-search${Object.keys(resolvedSearchParams).length ? '?' + new URLSearchParams(resolvedSearchParams).toString() : ''}`,
            images: [
                {
                    url: '/images/og-recipe-search.jpg',
                    width: 1200,
                    height: 630,
                    alt: 'Doc Bear\'s Recipe Search - Discover Amazing Recipes',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: title,
            description: description,
            images: ['/images/twitter-recipe-search.jpg'],
        },
        alternates: {
            canonical: `/recipe-search${Object.keys(resolvedSearchParams).length ? '?' + new URLSearchParams(resolvedSearchParams).toString() : ''}`,
        },
    };
}

// Enhanced structured data for recipe search page
async function RecipeSearchStructuredData({ searchParams }) {
    const resolvedSearchParams = await searchParams;
    const category = resolvedSearchParams.category;
    const isMultiPart = resolvedSearchParams.filter === 'multi-part';

    let name = 'Recipe Collection';
    let description = 'Professional recipe collection from Dr. Edward McKeown\'s cookbook series';

    if (category) {
        name = `${category.charAt(0).toUpperCase() + category.slice(1)} Recipe Collection`;
        description = `${name} from Doc Bear's Comfort Kitchen cookbook series`;
    }

    if (isMultiPart) {
        name = 'Multi-Part Recipe Collection';
        description = 'Complex recipes with organized sections and professional cooking techniques';
    }

    const collectionSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": name,
        "description": description,
        "url": `${process.env.NODE_ENV === 'production' ? 'https://docbearscomfort.kitchen' : 'http://localhost:3000'}/recipe-search${Object.keys(resolvedSearchParams).length ? '?' + new URLSearchParams(resolvedSearchParams).toString() : ''}`,
        "publisher": {
            "@type": "Organization",
            "name": "Doc Bear Enterprises, LLC",
            "url": "https://docbearscomfort.kitchen"
        },
        "mainEntity": {
            "@type": "WebPage",
            "name": "Recipe Search",
            "description": "Search and discover recipes from Doc Bear's Comfort Kitchen"
        }
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
        />
    );
}

export default async function RecipeSearchPage({ searchParams }) {
    // Resolve searchParams once here to avoid client-side issues
    const resolvedSearchParams = await searchParams;

    return (
        <>
            <RecipeSearchStructuredData searchParams={searchParams} />
            <RecipeSearchContent searchParams={resolvedSearchParams} />
        </>
    );
}