// file: /src/app/api/upc/search/route.js - v1 Text search API for Open Food Facts

import { NextResponse } from 'next/server';

// Open Food Facts V1 Search API endpoint
const OPEN_FOOD_FACTS_SEARCH_API = 'https://world.openfoodfacts.org/cgi/search.pl';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');
        const page = searchParams.get('page') || '1';
        const pageSize = searchParams.get('page_size') || '15';

        console.log(`Text search request for: "${query}" (page ${page})`);

        if (!query || query.trim().length < 2) {
            return NextResponse.json(
                { error: 'Search query must be at least 2 characters long' },
                { status: 400 }
            );
        }

        // Clean and validate query
        const cleanQuery = query.trim();
        const pageNum = Math.max(1, parseInt(page));
        const pageSizeNum = Math.min(50, Math.max(5, parseInt(pageSize))); // Limit between 5-50

        // Build search URL with parameters
        const searchUrl = new URL(OPEN_FOOD_FACTS_SEARCH_API);
        searchUrl.searchParams.set('search_terms', cleanQuery);
        searchUrl.searchParams.set('search_simple', '1');
        searchUrl.searchParams.set('action', 'process');
        searchUrl.searchParams.set('json', '1');
        searchUrl.searchParams.set('page_size', pageSizeNum.toString());
        searchUrl.searchParams.set('page', pageNum.toString());

        console.log(`Fetching from Open Food Facts: ${searchUrl.toString()}`);

        // Make request to Open Food Facts with proper headers
        const response = await fetch(searchUrl.toString(), {
            headers: {
                'User-Agent': 'DocBearsComfortKitchen/1.0 (food-inventory@docbear.com)',
                'Accept': 'application/json',
            },
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        console.log(`Open Food Facts search response status: ${response.status}`);

        if (!response.ok) {
            console.error(`Open Food Facts API error: ${response.status} ${response.statusText}`);
            throw new Error(`Open Food Facts API returned ${response.status}`);
        }

        const data = await response.json();
        console.log(`Search returned ${data.count || 0} total results for "${cleanQuery}"`);

        // Check if we got valid results
        if (!data.products || !Array.isArray(data.products)) {
            return NextResponse.json({
                success: true,
                results: [],
                pagination: {
                    page: pageNum,
                    pageSize: pageSizeNum,
                    totalResults: 0,
                    totalPages: 0
                },
                query: cleanQuery
            });
        }

        // Transform results to match our standardized format
        const transformedResults = data.products.map(product => {
            // Extract nutrition data
            const nutrition = product.nutriments ? {
                energy_100g: product.nutriments['energy-kcal_100g'] || product.nutriments.energy_100g || 0,
                fat_100g: product.nutriments.fat_100g || 0,
                carbohydrates_100g: product.nutriments.carbohydrates_100g || 0,
                proteins_100g: product.nutriments.proteins_100g || 0,
                salt_100g: product.nutriments.salt_100g || 0,
                sugars_100g: product.nutriments.sugars_100g || 0,
                fiber_100g: product.nutriments.fiber_100g || 0,
            } : null;

            // Use the same category mapping from your UPC lookup
            const category = mapCategory(product.categories_tags);

            return {
                found: true,
                upc: product.code || '',
                name: product.product_name || product.product_name_en || product.abbreviated_product_name || 'Unknown Product',
                brand: product.brands || product.brand_owner || '',
                category: category,
                ingredients: product.ingredients_text || product.ingredients_text_en || '',
                image: product.image_front_url || product.image_front_small_url || product.image_url || '',
                nutrition: nutrition,
                scores: {
                    nutriscore: product.nutriscore_grade || product.nutrition_grade_fr || null,
                    nova_group: product.nova_group || null,
                    ecoscore: product.ecoscore_grade || null,
                },
                allergens: product.allergens_tags || [],
                packaging: product.packaging || product.packaging_text || '',
                quantity: product.quantity || product.product_quantity || '',
                stores: product.stores || '',
                countries: product.countries || product.countries_tags?.join(', ') || '',
                labels: product.labels_tags || [],
                openFoodFactsUrl: `https://world.openfoodfacts.org/product/${product.code}`,
                lastModified: product.last_modified_t ? new Date(product.last_modified_t * 1000).toISOString() : null,
            };
        });

        // Prioritize results with images (as requested)
        const resultsWithImages = transformedResults.filter(r => r.image);
        const resultsWithoutImages = transformedResults.filter(r => !r.image);
        const prioritizedResults = [...resultsWithImages, ...resultsWithoutImages];

        // Calculate pagination info
        const totalResults = data.count || 0;
        const totalPages = Math.ceil(totalResults / pageSizeNum);

        console.log(`Successfully processed ${prioritizedResults.length} products for "${cleanQuery}"`);

        return NextResponse.json({
            success: true,
            results: prioritizedResults,
            pagination: {
                page: pageNum,
                pageSize: pageSizeNum,
                totalResults: totalResults,
                totalPages: totalPages,
                hasNextPage: pageNum < totalPages,
                hasPreviousPage: pageNum > 1
            },
            query: cleanQuery
        });

    } catch (error) {
        console.error('Text search error:', error);

        // Handle timeout errors specifically
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Search request timed out. Please try again.',
                    details: 'The search service is temporarily slow'
                },
                { status: 408 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to search for products',
                details: error.message
            },
            { status: 500 }
        );
    }
}

// Helper function to map Open Food Facts categories to our detailed categories
// This matches the same function in your UPC lookup route
function mapCategory(categoriesTags) {
    if (!categoriesTags || !Array.isArray(categoriesTags)) return 'Other';

    const categoryMap = {
        // Fresh produce
        'Fresh Vegetables': ['en:vegetables', 'en:fresh-vegetables', 'en:leafy-vegetables', 'en:root-vegetables', 'en:tomatoes', 'en:onions', 'en:carrots', 'en:potatoes', 'en:peppers', 'en:lettuce', 'en:spinach', 'en:broccoli', 'en:cauliflower'],
        'Fresh Fruits': ['en:fruits', 'en:fresh-fruits', 'en:apples', 'en:bananas', 'en:oranges', 'en:berries', 'en:citrus', 'en:tropical-fruits', 'en:stone-fruits'],
        'Fresh Spices': ['en:fresh-herbs', 'en:fresh-spices', 'en:basil', 'en:cilantro', 'en:parsley', 'en:mint', 'en:ginger'],

        // Dairy and eggs
        'Dairy': ['en:dairy', 'en:milk', 'en:yogurt', 'en:butter', 'en:cream', 'en:sour-cream'],
        'Cheese': ['en:cheese', 'en:cheeses', 'en:cheddar', 'en:mozzarella', 'en:parmesan', 'en:cream-cheese'],
        'Eggs': ['en:eggs', 'en:chicken-eggs', 'en:egg-products'],

        // Fresh/Frozen meats
        'Fresh/Frozen Poultry': ['en:chicken', 'en:poultry', 'en:turkey', 'en:duck', 'en:chicken-meat', 'en:turkey-meat'],
        'Fresh/Frozen Beef': ['en:beef', 'en:beef-meat', 'en:ground-beef', 'en:steaks', 'en:roasts'],
        'Fresh/Frozen Pork': ['en:pork', 'en:pork-meat', 'en:bacon', 'en:ham', 'en:sausages', 'en:ground-pork'],
        'Fresh/Frozen Lamb': ['en:lamb', 'en:lamb-meat', 'en:mutton'],
        'Fresh/Frozen Rabbit': ['en:rabbit', 'en:rabbit-meat'],
        'Fresh/Frozen Venison': ['en:venison', 'en:deer', 'en:game-meat'],
        'Fresh/Frozen Fish & Seafood': ['en:fish', 'en:seafood', 'en:salmon', 'en:tuna', 'en:cod', 'en:tilapia', 'en:shrimp', 'en:crab', 'en:lobster', 'en:scallops', 'en:mussels', 'en:clams', 'en:fresh-fish', 'en:frozen-fish'],

        // Dry goods
        'Beans': ['en:beans', 'en:dried-beans', 'en:red-beans', 'en:pinto-beans', 'en:kidney-beans', 'en:black-beans', 'en:navy-beans', 'en:lima-beans', 'en:black-eyed-peas', 'en:chickpeas', 'en:lentils', 'en:split-peas'],

        // Canned items
        'Canned Meat': ['en:canned-meat', 'en:canned-chicken', 'en:canned-beef', 'en:canned-fish', 'en:tuna', 'en:salmon', 'en:sardines', 'en:spam'],
        'Canned Vegetables': ['en:canned-vegetables', 'en:canned-corn', 'en:canned-peas', 'en:canned-carrots', 'en:canned-green-beans'],
        'Canned Fruit': ['en:canned-fruits', 'en:canned-peaches', 'en:canned-pears', 'en:fruit-cocktail', 'en:canned-pineapple'],
        'Canned Sauces': ['en:canned-sauces', 'en:pasta-sauces', 'en:marinara', 'en:alfredo'],
        'Canned Tomatoes': ['en:canned-tomatoes', 'en:tomato-sauce', 'en:tomato-paste', 'en:diced-tomatoes', 'en:crushed-tomatoes', 'en:tomato-puree'],
        'Canned Beans': ['en:canned-beans', 'en:black-beans', 'en:kidney-beans', 'en:chickpeas', 'en:pinto-beans', 'en:navy-beans', 'en:baked-beans'],
        'Canned Meals': ['en:canned-meals', 'en:canned-soup', 'en:canned-chili', 'en:canned-stew', 'en:ravioli', 'en:spaghetti'],

        // Frozen items
        'Frozen Vegetables': ['en:frozen-vegetables', 'en:frozen-peas', 'en:frozen-corn', 'en:frozen-broccoli', 'en:frozen-spinach'],
        'Frozen Fruit': ['en:frozen-fruits', 'en:frozen-berries', 'en:frozen-strawberries', 'en:frozen-mango'],

        // Pantry staples
        'Breads': ['en:bread', 'en:sandwich-bread', 'en:white-bread', 'en:wheat-bread', 'en:hotdog-buns', 'en:hamburger-buns', 'en:baguettes', 'en:french-bread', 'en:pita', 'en:pita-bread', 'en:tortillas', 'en:flour-tortillas', 'en:corn-tortillas', 'en:bagels', 'en:rolls', 'en:croissants'],
        'Grains': ['en:cereals', 'en:rice', 'en:quinoa', 'en:oats', 'en:flour', 'en:barley', 'en:bulgur', 'en:rice-mixes', 'en:rice-a-roni'],
        'Pasta': ['en:pasta', 'en:noodles', 'en:spaghetti', 'en:macaroni', 'en:penne', 'en:linguine', 'en:fettuccine', 'en:ravioli', 'en:lasagna'],
        'Stuffing & Sides': ['en:stuffing', 'en:stuffing-mix', 'en:instant-mashed-potatoes', 'en:mashed-potato-mix', 'en:au-gratin-potatoes', 'en:scalloped-potatoes', 'en:cornbread-mix', 'en:biscuit-mix', 'en:gravy-mix', 'en:side-dishes'],
        'Boxed Meals': ['en:meal-kits', 'en:hamburger-helper', 'en:boxed-dinners', 'en:mac-and-cheese', 'en:instant-meals'],
        'Seasonings': ['en:seasonings', 'en:salt', 'en:pepper', 'en:garlic-powder', 'en:onion-powder', 'en:seasoning-mixes'],
        'Spices': ['en:spices', 'en:cinnamon', 'en:paprika', 'en:cumin', 'en:oregano', 'en:thyme', 'en:rosemary', 'en:bay-leaves'],
        'Bouillon': ['en:bouillon', 'en:bouillon-cubes', 'en:stock-cubes', 'en:broth-cubes'],
        'Stock/Broth': ['en:broth', 'en:stock', 'en:chicken-broth', 'en:beef-broth', 'en:vegetable-broth', 'en:bone-broth'],

        // Other categories
        'Beverages': ['en:beverages', 'en:drinks', 'en:sodas', 'en:juices', 'en:water', 'en:coffee', 'en:tea', 'en:energy-drinks'],
        'Snacks': ['en:snacks', 'en:chips', 'en:crackers', 'en:cookies', 'en:nuts', 'en:pretzels', 'en:popcorn'],
        'Condiments': ['en:condiments', 'en:ketchup', 'en:mustard', 'en:mayonnaise', 'en:salad-dressings', 'en:vinegar', 'en:oils'],
    };

    // Check each category mapping with priority order (most specific first)
    const categoryKeys = Object.keys(categoryMap);

    for (const ourCategory of categoryKeys) {
        const tags = categoryMap[ourCategory];
        if (categoriesTags.some(tag =>
            tags.some(mappedTag => tag.toLowerCase().includes(mappedTag.replace('en:', '')))
        )) {
            return ourCategory;
        }
    }

    // Fallback for generic categories if no specific match found
    const fallbackMap = {
        'Dairy': ['en:dairy'],
        'Fresh/Frozen Beef': ['en:meat', 'en:beef'],
        'Fresh/Frozen Pork': ['en:pork'],
        'Fresh/Frozen Poultry': ['en:chicken'],
        'Fresh/Frozen Fish & Seafood': ['en:fish', 'en:seafood'],
        'Beans': ['en:beans', 'en:legumes'],
        'Pasta': ['en:pasta', 'en:noodles'],
        'Grains': ['en:grains', 'en:rice'],
        'Fresh Vegetables': ['en:vegetables'],
        'Fresh Fruits': ['en:fruits'],
        'Beverages': ['en:beverages'],
        'Snacks': ['en:snacks'],
    };

    for (const [ourCategory, tags] of Object.entries(fallbackMap)) {
        if (categoriesTags.some(tag =>
            tags.some(mappedTag => tag.toLowerCase().includes(mappedTag.replace('en:', '')))
        )) {
            return ourCategory;
        }
    }

    return 'Other';
}