// Enhanced UPC lookup route with USDA FoodData Central backup
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { FEATURE_GATES, checkUsageLimit, getUpgradeMessage, getRequiredTier } from '@/lib/subscription-config';

// API Configuration
const OPEN_FOOD_FACTS_ENDPOINTS = [
    'https://world.openfoodfacts.org/api/v2/product',
    'https://world.openfoodfacts.net/api/v2/product',
    'https://fr.openfoodfacts.org/api/v2/product'
];

const USDA_API_CONFIG = {
    baseUrl: 'https://api.nal.usda.gov/fdc/v1',
    apiKey: process.env.USDA_API_KEY, // Add this to your environment variables
    searchEndpoint: '/foods/search',
    foodEndpoint: '/food'
};

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 2,
    timeoutMs: 8000,
    backoffMs: 1000
};

// UPC to GTIN-14 converter (USDA uses GTIN-14 format)
function convertUPCToGTIN14(upc) {
    const cleanUpc = upc.replace(/\D/g, '');

    // Convert different UPC formats to GTIN-14
    if (cleanUpc.length === 12) {
        // UPC-A to GTIN-14: add two leading zeros
        return '00' + cleanUpc;
    } else if (cleanUpc.length === 13) {
        // EAN-13 to GTIN-14: add one leading zero
        return '0' + cleanUpc;
    } else if (cleanUpc.length === 14) {
        // Already GTIN-14
        return cleanUpc;
    } else if (cleanUpc.length === 8) {
        // UPC-E to GTIN-14: convert to UPC-A first, then add zeros
        // This is a simplified conversion - full UPC-E conversion is complex
        return '000000' + cleanUpc;
    }

    return cleanUpc.padStart(14, '0');
}

// Enhanced Open Food Facts fetcher
async function fetchFromOpenFoodFacts(upc, maxRetries = RETRY_CONFIG.maxRetries) {
    const cleanUpc = upc.replace(/\D/g, '');

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        for (const baseUrl of OPEN_FOOD_FACTS_ENDPOINTS) {
            try {
                console.log(`🥫 OpenFoodFacts attempt ${attempt + 1}/${maxRetries} - ${baseUrl}`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), RETRY_CONFIG.timeoutMs);

                const response = await fetch(`${baseUrl}/${cleanUpc}.json`, {
                    headers: {
                        'User-Agent': 'FoodInventoryManager/1.0 (food-inventory@docbearscomfort.kitchen)',
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    if (data.status !== 0 && data.status_verbose !== 'product not found') {
                        console.log(`✅ OpenFoodFacts success with ${baseUrl}`);
                        return { success: true, data, source: 'openfoodfacts', endpoint: baseUrl };
                    }
                }

            } catch (error) {
                console.log(`❌ OpenFoodFacts error with ${baseUrl}:`, error.message);
            }
        }

        if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.backoffMs));
        }
    }

    return { success: false, source: 'openfoodfacts' };
}

// USDA FoodData Central fetcher
async function fetchFromUSDA(upc, maxRetries = RETRY_CONFIG.maxRetries) {
    if (!USDA_API_CONFIG.apiKey) {
        console.log('⚠️ USDA API key not configured, skipping USDA lookup');
        return { success: false, source: 'usda', error: 'API key not configured' };
    }

    const gtin14 = convertUPCToGTIN14(upc);
    console.log(`🇺🇸 USDA lookup for UPC ${upc} -> GTIN-14: ${gtin14}`);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`🇺🇸 USDA attempt ${attempt + 1}/${maxRetries}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), RETRY_CONFIG.timeoutMs);

            // Search by GTIN in USDA database
            const searchUrl = `${USDA_API_CONFIG.baseUrl}${USDA_API_CONFIG.searchEndpoint}`;
            const searchParams = new URLSearchParams({
                api_key: USDA_API_CONFIG.apiKey,
                query: gtin14,
                dataType: ['Branded'], // Focus on branded foods which have GTINs
                pageSize: 5,
                sortBy: 'dataType.keyword',
                sortOrder: 'asc'
            });

            const response = await fetch(`${searchUrl}?${searchParams}`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'FoodInventoryManager/1.0'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                console.log(`📊 USDA search returned ${data.foods?.length || 0} results`);

                // Look for exact GTIN match
                const exactMatch = data.foods?.find(food =>
                    food.gtinUpc === gtin14 ||
                    food.gtinUpc === upc.replace(/\D/g, '') ||
                    food.gtinUpc?.endsWith(upc.replace(/\D/g, ''))
                );

                if (exactMatch) {
                    console.log(`✅ USDA exact match found: ${exactMatch.description}`);

                    // Get detailed nutrition data
                    const detailResponse = await fetch(
                        `${USDA_API_CONFIG.baseUrl}${USDA_API_CONFIG.foodEndpoint}/${exactMatch.fdcId}?api_key=${USDA_API_CONFIG.apiKey}`,
                        { signal: controller.signal }
                    );

                    if (detailResponse.ok) {
                        const detailData = await detailResponse.json();
                        return {
                            success: true,
                            data: detailData,
                            source: 'usda',
                            searchData: exactMatch
                        };
                    }
                }

                // If no exact match, try the first result if it looks similar
                if (data.foods && data.foods.length > 0) {
                    const firstResult = data.foods[0];
                    console.log(`🔍 USDA using best match: ${firstResult.description}`);

                    const detailResponse = await fetch(
                        `${USDA_API_CONFIG.baseUrl}${USDA_API_CONFIG.foodEndpoint}/${firstResult.fdcId}?api_key=${USDA_API_CONFIG.apiKey}`,
                        { signal: controller.signal }
                    );

                    if (detailResponse.ok) {
                        const detailData = await detailResponse.json();
                        return {
                            success: true,
                            data: detailData,
                            source: 'usda',
                            searchData: firstResult,
                            isApproximateMatch: true
                        };
                    }
                }
            }

        } catch (error) {
            console.log(`❌ USDA error on attempt ${attempt + 1}:`, error.message);
        }

        if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.backoffMs));
        }
    }

    return { success: false, source: 'usda' };
}

// Convert USDA nutrition data to our standard format
function processUSDANutrition(usdaFood) {
    const nutrients = {};

    if (usdaFood.foodNutrients) {
        const nutrientMap = {
            'Energy': ['208', '1008'], // Energy in kcal
            'Protein': ['203'],
            'Total lipid (fat)': ['204'],
            'Carbohydrate, by difference': ['205'],
            'Fiber, total dietary': ['291'],
            'Sugars, total including NLEA': ['269'],
            'Sodium, Na': ['307']
        };

        for (const [nutrientName, nutrientIds] of Object.entries(nutrientMap)) {
            const nutrient = usdaFood.foodNutrients.find(n =>
                nutrientIds.includes(n.nutrient?.number?.toString())
            );

            if (nutrient && nutrient.amount) {
                const key = nutrientName.toLowerCase().includes('energy') ? 'energy_100g' :
                    nutrientName.toLowerCase().includes('protein') ? 'proteins_100g' :
                        nutrientName.toLowerCase().includes('fat') ? 'fat_100g' :
                            nutrientName.toLowerCase().includes('carbohydrate') ? 'carbohydrates_100g' :
                                nutrientName.toLowerCase().includes('fiber') ? 'fiber_100g' :
                                    nutrientName.toLowerCase().includes('sugar') ? 'sugars_100g' :
                                        nutrientName.toLowerCase().includes('sodium') ? 'sodium_100mg' : null;

                if (key) {
                    // Convert per 100g if needed (USDA is usually per 100g)
                    nutrients[key] = nutrient.amount;
                }
            }
        }
    }

    return nutrients;
}

// Convert USDA food data to our product format
function convertUSDAToProduct(usdaResult, upc) {
    const { data: usdaFood, searchData, isApproximateMatch } = usdaResult;

    // Extract brand and product name
    const description = usdaFood.description || searchData?.description || 'Unknown Product';
    const brandOwner = usdaFood.brandOwner || usdaFood.brandName || '';

    // Parse description to separate brand and product name
    let productName = description;
    let brand = brandOwner;

    if (brandOwner && description.toLowerCase().startsWith(brandOwner.toLowerCase())) {
        productName = description.substring(brandOwner.length).trim().replace(/^[,\-\s]+/, '');
    }

    return {
        found: true,
        upc: upc.replace(/\D/g, ''),
        name: productName,
        brand: brand,
        category: mapUSDACategory(usdaFood.foodCategory?.description || usdaFood.brandedFoodCategory),
        ingredients: usdaFood.ingredients || '',
        image: null, // USDA doesn't provide images
        nutrition: processUSDANutrition(usdaFood),
        scores: {
            nutriscore: null, // USDA doesn't provide Nutri-Score
            nova_group: null,
            ecoscore: null
        },
        allergens: [], // Would need to parse from ingredients
        packaging: usdaFood.packageWeight ? `${usdaFood.packageWeight}g` : '',
        quantity: usdaFood.servingSize ? `${usdaFood.servingSize} ${usdaFood.servingSizeUnit || ''}`.trim() : '',
        stores: '',
        countries: 'United States',
        labels: [],
        openFoodFactsUrl: `https://world.openfoodfacts.org/product/${upc.replace(/\D/g, '')}`,
        usdaUrl: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${usdaFood.fdcId}/nutrients`,
        lastModified: usdaFood.modifiedDate || usdaFood.availableDate,
        dataSource: 'USDA FoodData Central',
        fdcId: usdaFood.fdcId,
        isApproximateMatch: isApproximateMatch || false
    };
}

// Map USDA categories to our categories
function mapUSDACategory(usdaCategory) {
    if (!usdaCategory) return 'Other';

    const categoryLower = usdaCategory.toLowerCase();

    const categoryMap = {
        'Dairy': ['dairy', 'milk', 'cheese', 'yogurt', 'butter', 'cream'],
        'Fresh/Frozen Beef': ['beef', 'cattle'],
        'Fresh/Frozen Pork': ['pork', 'swine'],
        'Fresh/Frozen Poultry': ['poultry', 'chicken', 'turkey'],
        'Fresh/Frozen Fish & Seafood': ['fish', 'seafood', 'salmon', 'tuna'],
        'Beverages': ['beverages', 'drinks', 'juice', 'soda', 'water'],
        'Snacks': ['snacks', 'chips', 'crackers', 'cookies'],
        'Grains': ['grains', 'cereal', 'rice', 'bread', 'pasta'],
        'Fresh Vegetables': ['vegetables', 'produce'],
        'Fresh Fruits': ['fruits', 'fruit'],
        'Soups & Soup Mixes': ['soup', 'broth', 'stew'],
        'Condiments': ['condiments', 'sauce', 'dressing'],
        'Canned Meals': ['meals', 'entree', 'dinner'],
        'Frozen Vegetables': ['frozen vegetables'],
        'Frozen Fruit': ['frozen fruit']
    };

    for (const [ourCategory, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(keyword => categoryLower.includes(keyword))) {
            return ourCategory;
        }
    }

    return 'Other';
}

// Fallback products for when all APIs fail
const FALLBACK_PRODUCTS = {
    '0064144282432': {
        name: 'Campbell\'s Condensed Tomato Soup',
        brand: 'Campbell\'s',
        category: 'Soups & Soup Mixes',
        image: null,
        nutrition: {
            energy_100g: 67,
            proteins_100g: 1.8,
            carbohydrates_100g: 13.3,
            fat_100g: 0.9,
            sodium_100mg: 356
        },
        dataSource: 'fallback'
    }
};

export async function GET(request) {
    try {
        // Authentication and subscription checks (keep existing logic)
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };

        // Reset monthly counter if needed (keep existing logic)
        const now = new Date();
        try {
            if (!user.usageTracking ||
                user.usageTracking.currentMonth !== now.getMonth() ||
                user.usageTracking.currentYear !== now.getFullYear()) {

                if (!user.usageTracking) {
                    user.usageTracking = {};
                }

                user.usageTracking.currentMonth = now.getMonth();
                user.usageTracking.currentYear = now.getFullYear();
                user.usageTracking.monthlyUPCScans = 0;
                user.usageTracking.lastUpdated = now;

                await User.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            'usageTracking.currentMonth': now.getMonth(),
                            'usageTracking.currentYear': now.getFullYear(),
                            'usageTracking.monthlyUPCScans': 0,
                            'usageTracking.lastUpdated': now
                        }
                    },
                    { runValidators: false }
                );
            }
        } catch (trackingError) {
            console.error('Error resetting usage tracking:', trackingError);
        }

        const currentScans = user.usageTracking?.monthlyUPCScans || 0;

        // Check usage limits
        const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.UPC_SCANNING, currentScans);

        if (!hasCapacity) {
            const requiredTier = getRequiredTier(FEATURE_GATES.UPC_SCANNING);
            return NextResponse.json({
                error: getUpgradeMessage(FEATURE_GATES.UPC_SCANNING, requiredTier),
                code: 'USAGE_LIMIT_EXCEEDED',
                feature: FEATURE_GATES.UPC_SCANNING,
                currentCount: currentScans,
                currentTier: userSubscription.tier,
                requiredTier: requiredTier,
                upgradeUrl: `/pricing?source=upc-limit&feature=${FEATURE_GATES.UPC_SCANNING}&required=${requiredTier}`
            }, { status: 403 });
        }

        // Get and validate UPC
        const { searchParams } = new URL(request.url);
        const upc = searchParams.get('upc');

        if (!upc) {
            return NextResponse.json({ error: 'UPC code is required' }, { status: 400 });
        }

        const cleanUpc = upc.replace(/\D/g, '');

        if (cleanUpc.length < 8 || cleanUpc.length > 14) {
            return NextResponse.json({ error: 'Invalid UPC format' }, { status: 400 });
        }

        // Track the scan attempt BEFORE making API calls
        let scanTracked = false;
        try {
            const newScanCount = currentScans + 1;
            console.log(`🔄 Incrementing UPC scan count from ${currentScans} to ${newScanCount}`);

            const updateResult = await User.updateOne(
                { _id: user._id },
                {
                    $set: {
                        'usageTracking.monthlyUPCScans': newScanCount,
                        'usageTracking.lastUpdated': now,
                        'usageTracking.currentMonth': now.getMonth(),
                        'usageTracking.currentYear': now.getFullYear()
                    }
                },
                { runValidators: false, upsert: false }
            );

            scanTracked = updateResult.modifiedCount === 1;
        } catch (trackingError) {
            console.error('❌ Error tracking UPC scan:', trackingError);
        }

        console.log(`🔍 Starting multi-source UPC lookup for: ${cleanUpc}`);

        // Try Open Food Facts first (usually has better product data)
        const offResult = await fetchFromOpenFoodFacts(cleanUpc);

        if (offResult.success) {
            console.log('✅ Using Open Food Facts data');
            const product = offResult.data.product;
            const productInfo = {
                found: true,
                upc: cleanUpc,
                name: product.product_name || product.product_name_en || 'Unknown Product',
                brand: product.brands || product.brand_owner || '',
                category: mapCategory(product.categories_tags),
                ingredients: product.ingredients_text || product.ingredients_text_en || '',
                image: product.image_url || product.image_front_url || '',
                nutrition: {
                    serving_size: product.serving_size || '',
                    energy_100g: product.nutriments?.['energy-kcal_100g'] || product.nutriments?.energy_100g || null,
                    fat_100g: product.nutriments?.fat_100g || null,
                    carbohydrates_100g: product.nutriments?.carbohydrates_100g || null,
                    proteins_100g: product.nutriments?.proteins_100g || null,
                    salt_100g: product.nutriments?.salt_100g || null,
                    sugars_100g: product.nutriments?.sugars_100g || null,
                    fiber_100g: product.nutriments?.fiber_100g || null,
                },
                scores: {
                    nutriscore: product.nutriscore_grade || null,
                    nova_group: product.nova_group || null,
                    ecoscore: product.ecoscore_grade || null,
                },
                allergens: product.allergens_tags || [],
                packaging: product.packaging || '',
                quantity: product.quantity || '',
                openFoodFactsUrl: `https://world.openfoodfacts.org/product/${cleanUpc}`,
                dataSource: 'Open Food Facts',
                apiEndpoint: offResult.endpoint
            };

            return NextResponse.json({
                success: true,
                product: productInfo,
                usageIncremented: scanTracked,
                dataSource: 'openfoodfacts',
                remainingScans: userSubscription.tier === 'free' ?
                    Math.max(0, 10 - (currentScans + 1)) : 'Unlimited'
            });
        }

        // Try USDA as backup
        console.log('🇺🇸 Open Food Facts failed, trying USDA...');
        const usdaResult = await fetchFromUSDA(cleanUpc);

        if (usdaResult.success) {
            console.log('✅ Using USDA data');
            const productInfo = convertUSDAToProduct(usdaResult, cleanUpc);

            return NextResponse.json({
                success: true,
                product: productInfo,
                usageIncremented: scanTracked,
                dataSource: 'usda',
                isApproximateMatch: usdaResult.isApproximateMatch,
                remainingScans: userSubscription.tier === 'free' ?
                    Math.max(0, 10 - (currentScans + 1)) : 'Unlimited'
            });
        }

        // Try fallback data
        if (FALLBACK_PRODUCTS[cleanUpc]) {
            console.log('📋 Using fallback data');
            const fallbackProduct = {
                ...FALLBACK_PRODUCTS[cleanUpc],
                found: true,
                upc: cleanUpc,
                openFoodFactsUrl: `https://world.openfoodfacts.org/product/${cleanUpc}`,
            };

            return NextResponse.json({
                success: true,
                product: fallbackProduct,
                usageIncremented: scanTracked,
                dataSource: 'fallback',
                remainingScans: userSubscription.tier === 'free' ?
                    Math.max(0, 10 - (currentScans + 1)) : 'Unlimited'
            });
        }

        // All sources failed
        return NextResponse.json({
            success: false,
            found: false,
            message: 'Product not found in any database',
            upc: cleanUpc,
            usageIncremented: scanTracked,
            searchedSources: ['Open Food Facts', 'USDA FoodData Central', 'Fallback'],
            remainingScans: userSubscription.tier === 'free' ?
                Math.max(0, 10 - (currentScans + 1)) : 'Unlimited'
        }, { status: 404 });

    } catch (error) {
        console.error('❌ UPC lookup error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to lookup product information',
            details: error.message
        }, { status: 500 });
    }
}

// Your existing mapCategory function for Open Food Facts (keep as is)
function mapCategory(categoriesTags) {
    if (!categoriesTags || !Array.isArray(categoriesTags)) return 'Other';

    const categoryMap = {
        // Baking and cooking ingredients
        'Baking & Cooking Ingredients': ['en:baking-ingredients', 'en:cooking-ingredients', 'en:flour', 'en:sugar', 'en:brown-sugar', 'en:baking-powder', 'en:baking-soda', 'en:yeast', 'en:vanilla-extract', 'en:extracts', 'en:oils', 'en:cooking-oils', 'en:olive-oil', 'en:vegetable-oil', 'en:vinegar', 'en:breadcrumbs', 'en:panko', 'en:cornstarch', 'en:lard', 'en:shortening', 'en:honey', 'en:maple-syrup', 'en:molasses', 'en:cocoa-powder', 'en:chocolate-chips', 'en:food-coloring', 'en:cooking-wine'],

        // Dry goods
        'Beans': ['en:beans', 'en:dried-beans', 'en:red-beans', 'en:pinto-beans', 'en:kidney-beans', 'en:black-beans', 'en:navy-beans', 'en:lima-beans', 'en:black-eyed-peas', 'en:chickpeas', 'en:lentils', 'en:split-peas'],

        // Other categories
        'Beverages': ['en:beverages', 'en:drinks', 'en:sodas', 'en:juices', 'en:water', 'en:coffee', 'en:tea', 'en:energy-drinks'],

        'Bouillon': ['en:bouillon', 'en:bouillon-cubes', 'en:stock-cubes', 'en:broth-cubes'],

        'Boxed Meals': ['en:meal-kits', 'en:hamburger-helper', 'en:boxed-dinners', 'en:mac-and-cheese', 'en:instant-meals'],

        // Pantry staples
        'Breads': ['en:bread', 'en:sandwich-bread', 'en:white-bread', 'en:wheat-bread', 'en:hotdog-buns', 'en:hamburger-buns', 'en:baguettes', 'en:french-bread', 'en:pita', 'en:pita-bread', 'en:tortillas', 'en:flour-tortillas', 'en:corn-tortillas', 'en:bagels', 'en:rolls', 'en:croissants'],

        // Canned items
        'Canned Beans': ['en:canned-beans', 'en:black-beans', 'en:kidney-beans', 'en:chickpeas', 'en:pinto-beans', 'en:navy-beans', 'en:baked-beans'],
        'Canned Fruit': ['en:canned-fruits', 'en:canned-peaches', 'en:canned-pears', 'en:fruit-cocktail', 'en:canned-pineapple'],
        'Canned Meals': ['en:canned-meals', 'en:canned-soup', 'en:canned-chili', 'en:canned-stew', 'en:ravioli', 'en:spaghetti'],
        'Canned Meat': ['en:canned-meat', 'en:canned-chicken', 'en:canned-beef', 'en:canned-fish', 'en:tuna', 'en:salmon', 'en:sardines', 'en:spam'],
        'Canned Sauces': ['en:canned-sauces', 'en:pasta-sauces', 'en:marinara', 'en:alfredo'],
        'Canned Tomatoes': ['en:canned-tomatoes', 'en:tomato-sauce', 'en:tomato-paste', 'en:diced-tomatoes', 'en:crushed-tomatoes', 'en:tomato-puree'],
        'Canned Vegetables': ['en:canned-vegetables', 'en:canned-corn', 'en:canned-peas', 'en:canned-carrots', 'en:canned-green-beans'],

        // Dairy and eggs
        'Cheese': ['en:cheese', 'en:cheeses', 'en:cheddar', 'en:mozzarella', 'en:parmesan', 'en:cream-cheese'],

        'Condiments': ['en:condiments', 'en:ketchup', 'en:mustard', 'en:mayonnaise', 'en:salad-dressings'],

        'Dairy': ['en:dairy', 'en:milk', 'en:yogurt', 'en:butter', 'en:cream', 'en:sour-cream'],

        'Eggs': ['en:eggs', 'en:chicken-eggs', 'en:egg-products'],

        // Fresh produce
        'Fresh Fruits': ['en:fruits', 'en:fresh-fruits', 'en:apples', 'en:bananas', 'en:oranges', 'en:berries', 'en:citrus', 'en:tropical-fruits', 'en:stone-fruits'],
        'Fresh Spices': ['en:fresh-herbs', 'en:fresh-spices', 'en:basil', 'en:cilantro', 'en:parsley', 'en:mint', 'en:ginger'],
        'Fresh Vegetables': ['en:vegetables', 'en:fresh-vegetables', 'en:leafy-vegetables', 'en:root-vegetables', 'en:tomatoes', 'en:onions', 'en:carrots', 'en:potatoes', 'en:peppers', 'en:lettuce', 'en:spinach', 'en:broccoli', 'en:cauliflower'],

        // Fresh/Frozen meats
        'Fresh/Frozen Beef': ['en:beef', 'en:beef-meat', 'en:ground-beef', 'en:steaks', 'en:roasts'],
        'Fresh/Frozen Fish & Seafood': ['en:fish', 'en:seafood', 'en:salmon', 'en:tuna', 'en:cod', 'en:tilapia', 'en:shrimp', 'en:crab', 'en:lobster', 'en:scallops', 'en:mussels', 'en:clams', 'en:fresh-fish', 'en:frozen-fish'],
        'Fresh/Frozen Lamb': ['en:lamb', 'en:lamb-meat', 'en:mutton'],
        'Fresh/Frozen Pork': ['en:pork', 'en:pork-meat', 'en:bacon', 'en:ham', 'en:sausages', 'en:ground-pork'],
        'Fresh/Frozen Poultry': ['en:chicken', 'en:poultry', 'en:turkey', 'en:duck', 'en:chicken-meat', 'en:turkey-meat'],
        'Fresh/Frozen Rabbit': ['en:rabbit', 'en:rabbit-meat'],
        'Fresh/Frozen Venison': ['en:venison', 'en:deer', 'en:game-meat'],

        // Frozen items
        'Frozen Fruit': ['en:frozen-fruits', 'en:frozen-berries', 'en:frozen-strawberries', 'en:frozen-mango'],
        'Frozen Vegetables': ['en:frozen-vegetables', 'en:frozen-peas', 'en:frozen-corn', 'en:frozen-broccoli', 'en:frozen-spinach'],

        'Grains': ['en:cereals', 'en:rice', 'en:quinoa', 'en:oats', 'en:barley', 'en:bulgur', 'en:rice-mixes', 'en:rice-a-roni'],

        'Pasta': ['en:pasta', 'en:noodles', 'en:spaghetti', 'en:macaroni', 'en:penne', 'en:linguine', 'en:fettuccine', 'en:ravioli', 'en:lasagna'],

        'Seasonings': ['en:seasonings', 'en:salt', 'en:pepper', 'en:garlic-powder', 'en:onion-powder', 'en:seasoning-mixes'],

        'Snacks': ['en:snacks', 'en:chips', 'en:crackers', 'en:cookies', 'en:nuts', 'en:pretzels', 'en:popcorn'],

        // New category for soups
        'Soups & Soup Mixes': ['en:soups', 'en:soup-mixes', 'en:canned-soup', 'en:instant-soup', 'en:soup-packets', 'en:ramen', 'en:instant-noodles', 'en:chicken-soup', 'en:vegetable-soup', 'en:tomato-soup', 'en:beef-soup', 'en:minestrone', 'en:cream-soups', 'en:bisque'],

        'Spices': ['en:spices', 'en:cinnamon', 'en:paprika', 'en:cumin', 'en:oregano', 'en:thyme', 'en:rosemary', 'en:bay-leaves'],

        'Stock/Broth': ['en:broth', 'en:stock', 'en:chicken-broth', 'en:beef-broth', 'en:vegetable-broth', 'en:bone-broth'],

        'Stuffing & Sides': ['en:stuffing', 'en:stuffing-mix', 'en:instant-mashed-potatoes', 'en:mashed-potato-mix', 'en:au-gratin-potatoes', 'en:scalloped-potatoes', 'en:cornbread-mix', 'en:biscuit-mix', 'en:gravy-mix', 'en:side-dishes'],
    };

    for (const [ourCategory, tags] of Object.entries(categoryMap)) {
        if (categoriesTags.some(tag =>
            tags.some(mappedTag => tag.toLowerCase().includes(mappedTag.replace('en:', '')))
        )) {
            return ourCategory;
        }
    }

    return 'Other';
}