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

// Helper function to map Open Food Facts categories to our simplified categories
function mapCategory(categoriesTags) {
    if (!categoriesTags || !Array.isArray(categoriesTags)) return 'Other';

    const categoryMap = {
        'dairy': ['en:dairy', 'en:milk', 'en:cheese', 'en:yogurt', 'en:butter'],
        'meat': ['en:meat', 'en:beef', 'en:pork', 'en:chicken', 'en:fish', 'en:seafood'],
        'produce': ['en:fruits', 'en:vegetables', 'en:fresh-foods'],
        'grains': ['en:cereals', 'en:bread', 'en:pasta', 'en:rice'],
        'canned': ['en:canned', 'en:preserved', 'en:tinned'],
        'frozen': ['en:frozen', 'en:frozen-foods'],
        'beverages': ['en:beverages', 'en:drinks', 'en:sodas', 'en:juices', 'en:water'],
        'snacks': ['en:snacks', 'en:chips', 'en:crackers', 'en:cookies'],
        'condiments': ['en:condiments', 'en:sauces', 'en:dressings', 'en:spices'],
    };

    // Check each category mapping
    for (const [ourCategory, tags] of Object.entries(categoryMap)) {
        if (categoriesTags.some(tag =>
            tags.some(mappedTag => tag.toLowerCase().includes(mappedTag.replace('en:', '')))
        )) {
            return ourCategory.charAt(0).toUpperCase() + ourCategory.slice(1);
        }
    }

    return 'Other';
}