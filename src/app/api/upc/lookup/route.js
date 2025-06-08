// file: /src/app/api/upc/lookup/route.js

import { NextResponse } from 'next/server';

// Open Food Facts API v2 endpoint
const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v2/product';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const upc = searchParams.get('upc');

        console.log(`UPC lookup request for: ${upc}`);

        if (!upc) {
            return NextResponse.json(
                { error: 'UPC code is required' },
                { status: 400 }
            );
        }

        // Clean UPC (remove any non-numeric characters)
        const cleanUpc = upc.replace(/\D/g, '');

        if (cleanUpc.length < 8 || cleanUpc.length > 14) {
            return NextResponse.json(
                { error: 'Invalid UPC format' },
                { status: 400 }
            );
        }

        // Query Open Food Facts API v2 (current version)
        console.log(`Fetching from Open Food Facts: ${cleanUpc}`);
        const response = await fetch(`${OPEN_FOOD_FACTS_API}/${cleanUpc}.json`, {
            headers: {
                'User-Agent': 'FoodInventoryManager/1.0 (food-inventory@example.com)',
            },
        });

        console.log(`Open Food Facts response status: ${response.status}`);

        if (!response.ok) {
            console.error(`Open Food Facts API error: ${response.status} ${response.statusText}`);
            throw new Error(`Open Food Facts API returned ${response.status}`);
        }

        const data = await response.json();
        console.log(`Product data status: ${data.status}`);

        // Check if product was found
        if (data.status === 0 || data.status_verbose === 'product not found') {
            return NextResponse.json(
                {
                    found: false,
                    message: 'Product not found in Open Food Facts database',
                    upc: cleanUpc
                },
                { status: 404 }
            );
        }

        // Extract relevant product information from API v2 response
        const product = data.product;
        const productInfo = {
            found: true,
            upc: cleanUpc,
            name: product.product_name || product.product_name_en || product.abbreviated_product_name || 'Unknown Product',
            brand: product.brands || product.brand_owner || '',
            category: mapCategory(product.categories_tags),
            ingredients: product.ingredients_text || product.ingredients_text_en || '',
            image: product.image_url || product.image_front_url || product.image_front_small_url || '',
            nutrition: {
                serving_size: product.serving_size || product.product_quantity || '',
                energy_100g: product.nutriments?.['energy-kcal_100g'] || product.nutriments?.energy_100g || null,
                fat_100g: product.nutriments?.fat_100g || null,
                carbohydrates_100g: product.nutriments?.carbohydrates_100g || null,
                proteins_100g: product.nutriments?.proteins_100g || null,
                salt_100g: product.nutriments?.salt_100g || null,
                sugars_100g: product.nutriments?.sugars_100g || null,
                fiber_100g: product.nutriments?.fiber_100g || null,
            },
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
            openFoodFactsUrl: `https://world.openfoodfacts.org/product/${cleanUpc}`,
            lastModified: product.last_modified_t ? new Date(product.last_modified_t * 1000).toISOString() : null,
        };

        console.log(`Successfully processed product: ${productInfo.name}`);

        return NextResponse.json({
            success: true,
            product: productInfo,
        });

    } catch (error) {
        console.error('UPC lookup error:', error);
        return NextResponse.json(
            {
                error: 'Failed to lookup product information',
                details: error.message
            },
            { status: 500 }
        );
    }
}

// Helper function to map Open Food Facts categories to our detailed categories
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
        'Grains': ['en:cereals', 'en:bread', 'en:pasta', 'en:rice', 'en:quinoa', 'en:oats', 'en:flour', 'en:noodles'],
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