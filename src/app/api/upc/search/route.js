// file: /src/app/api/upc/search/route.js - v4 Enhanced with international search support

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { FEATURE_GATES, checkUsageLimit, getUpgradeMessage, getRequiredTier } from '@/lib/subscription-config';

// Enhanced international search endpoints
const INTERNATIONAL_SEARCH_ENDPOINTS = {
    openFoodFacts: {
        global: 'https://world.openfoodfacts.org/cgi/search.pl',
        uk: 'https://uk.openfoodfacts.org/cgi/search.pl',
        france: 'https://fr.openfoodfacts.org/cgi/search.pl',
        germany: 'https://de.openfoodfacts.org/cgi/search.pl',
        spain: 'https://es.openfoodfacts.org/cgi/search.pl',
        italy: 'https://it.openfoodfacts.org/cgi/search.pl',
        canada: 'https://ca.openfoodfacts.org/cgi/search.pl',
        australia: 'https://au.openfoodfacts.org/cgi/search.pl'
    }
};

// Enhanced region selection for search
function getOptimalSearchEndpoints(userCurrency = 'USD') {
    const currencyToRegion = {
        'GBP': ['uk', 'global', 'france'],
        'EUR': ['france', 'germany', 'spain', 'italy', 'global'],
        'CAD': ['canada', 'global', 'uk'],
        'AUD': ['australia', 'global', 'uk'],
        'USD': ['global', 'uk', 'canada']
    };

    const regionKeys = currencyToRegion[userCurrency] || ['global', 'uk'];
    return regionKeys.map(key => INTERNATIONAL_SEARCH_ENDPOINTS.openFoodFacts[key]);
}

// Enhanced search with regional prioritization
async function performInternationalSearch(query, pageNum, pageSizeNum, userCurrency) {
    const endpoints = getOptimalSearchEndpoints(userCurrency);

    console.log(`🌍 International search for "${query}" with currency ${userCurrency}`);
    console.log(`🎯 Trying ${endpoints.length} regional endpoints`);

    for (const [index, endpoint] of endpoints.entries()) {
        try {
            console.log(`🔍 Search attempt ${index + 1}/${endpoints.length} - ${endpoint}`);

            const searchUrl = new URL(endpoint);
            searchUrl.searchParams.set('search_terms', query);
            searchUrl.searchParams.set('search_simple', '1');
            searchUrl.searchParams.set('action', 'process');
            searchUrl.searchParams.set('json', '1');
            searchUrl.searchParams.set('page_size', pageSizeNum.toString());
            searchUrl.searchParams.set('page', pageNum.toString());

            // Add language preference based on currency
            const languageMap = {
                'GBP': 'en',
                'EUR': 'en',
                'CAD': 'en',
                'AUD': 'en',
                'USD': 'en'
            };

            if (languageMap[userCurrency]) {
                searchUrl.searchParams.set('lang', languageMap[userCurrency]);
            }

            const response = await fetch(searchUrl.toString(), {
                headers: {
                    'User-Agent': 'DocBearsComfortKitchen/1.0 (international-food-search@docbearscomfort.kitchen)',
                    'Accept': 'application/json',
                    'Accept-Language': getAcceptLanguageHeader(userCurrency)
                },
                signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
                const data = await response.json();

                if (data.products && data.products.length > 0) {
                    console.log(`✅ Found ${data.products.length} products from ${endpoint}`);
                    return {
                        success: true,
                        data,
                        endpoint,
                        regional: index === 0, // First endpoint is most region-specific
                        userCurrency
                    };
                }
            }

        } catch (error) {
            console.log(`❌ Search error with ${endpoint}:`, error.message);
        }
    }

    return { success: false, userCurrency };
}

// Get Accept-Language header based on currency
function getAcceptLanguageHeader(userCurrency) {
    const languageMap = {
        'GBP': 'en-GB,en;q=0.9',
        'EUR': 'en-GB,fr;q=0.9,de;q=0.8,es;q=0.7,it;q=0.6',
        'CAD': 'en-CA,fr-CA;q=0.9,en;q=0.8',
        'AUD': 'en-AU,en;q=0.9',
        'USD': 'en-US,en;q=0.9'
    };

    return languageMap[userCurrency] || 'en-US,en;q=0.9';
}

// Enhanced international category mapping
function mapCategoryInternational(categoriesTags, userCurrency = 'USD') {
    if (!categoriesTags || !Array.isArray(categoriesTags)) return 'Other';

    const internationalCategoryMap = {
        // Baking and cooking ingredients with international variants
        'Baking & Cooking Ingredients': [
            'en:baking-ingredients', 'en:cooking-ingredients', 'en:flour', 'en:sugar', 'en:brown-sugar',
            'en:baking-powder', 'en:baking-soda', 'en:yeast', 'en:vanilla-extract', 'en:extracts',
            'en:oils', 'en:cooking-oils', 'en:olive-oil', 'en:vegetable-oil', 'en:vinegar',
            'en:breadcrumbs', 'en:panko', 'en:cornstarch', 'en:lard', 'en:shortening', 'en:honey',
            'en:maple-syrup', 'en:molasses', 'en:cocoa-powder', 'en:chocolate-chips', 'en:food-coloring',
            // UK/EU specific
            'en:caster-sugar', 'en:icing-sugar', 'en:plain-flour', 'en:self-raising-flour', 'en:cornflour',
            'en:bicarbonate-of-soda', 'en:cream-of-tartar', 'en:golden-syrup', 'en:treacle'
        ],

        // International beans and legumes
        'Beans': [
            'en:beans', 'en:dried-beans', 'en:red-beans', 'en:pinto-beans', 'en:kidney-beans',
            'en:black-beans', 'en:navy-beans', 'en:lima-beans', 'en:black-eyed-peas', 'en:chickpeas',
            'en:lentils', 'en:split-peas', 'en:cannellini-beans', 'en:butter-beans', 'en:broad-beans'
        ],

        // Enhanced beverages with international variants
        'Beverages': [
            'en:beverages', 'en:drinks', 'en:sodas', 'en:juices', 'en:water', 'en:coffee', 'en:tea', 'en:energy-drinks',
            // UK/International variants
            'en:squash', 'en:cordial', 'en:fizzy-drinks', 'en:soft-drinks', 'en:mineral-water', 'en:sparkling-water',
            'en:herbal-tea', 'en:green-tea', 'en:earl-grey', 'en:builders-tea'
        ],

        // UK/EU specific categories
        'Biscuits & Confectionery': [
            'en:biscuits', 'en:cookies', 'en:crackers', 'en:confectionery', 'en:sweets', 'en:candy',
            'en:chocolate', 'en:digestives', 'en:hobnobs', 'en:custard-creams', 'en:jammy-dodgers',
            'en:rich-tea', 'en:ginger-nuts', 'en:bourbon-biscuits'
        ],

        'Ready Meals': [
            'en:ready-meals', 'en:microwave-meals', 'en:tv-dinners', 'en:convenience-foods',
            'en:prepared-meals', 'en:frozen-meals', 'en:instant-meals'
        ],

        // International dairy variants
        'Dairy': [
            'en:dairy', 'en:milk', 'en:yogurt', 'en:butter', 'en:cream', 'en:sour-cream',
            // UK/EU variants
            'en:yoghurt', 'en:double-cream', 'en:single-cream', 'en:clotted-cream', 'en:crème-fraîche',
            'en:fromage-frais', 'en:quark', 'en:skyr'
        ],

        // Enhanced cheese varieties
        'Cheese': [
            'en:cheese', 'en:cheeses', 'en:cheddar', 'en:mozzarella', 'en:parmesan', 'en:cream-cheese',
            // UK/EU specific cheeses
            'en:stilton', 'en:wensleydale', 'en:camembert', 'en:brie', 'en:roquefort', 'en:gouda',
            'en:edam', 'en:gruyere', 'en:emmental', 'en:feta', 'en:halloumi', 'en:mascarpone',
            'en:ricotta', 'en:pecorino', 'en:gorgonzola', 'en:cheshire', 'en:red-leicester'
        ],

        // Enhanced condiments with international variants
        'Condiments': [
            'en:condiments', 'en:ketchup', 'en:mustard', 'en:mayonnaise', 'en:salad-dressings',
            // UK/International variants
            'en:brown-sauce', 'en:hp-sauce', 'en:worcestershire-sauce', 'en:marmite', 'en:vegemite',
            'en:branston-pickle', 'en:mint-sauce', 'en:horseradish', 'en:chutney'
        ],

        // International meat categories
        'Fresh/Frozen Beef': [
            'en:beef', 'en:beef-meat', 'en:ground-beef', 'en:steaks', 'en:roasts',
            'en:mince', 'en:mincemeat', 'en:minced-beef'
        ],

        'Fresh/Frozen Pork': [
            'en:pork', 'en:pork-meat', 'en:bacon', 'en:ham', 'en:sausages', 'en:ground-pork',
            'en:gammon', 'en:pancetta', 'en:prosciutto', 'en:chorizo', 'en:bratwurst',
            'en:black-pudding', 'en:white-pudding'
        ],

        // Enhanced frozen foods
        'Frozen Foods': [
            'en:frozen-foods', 'en:frozen-vegetables', 'en:frozen-fruits', 'en:frozen-meals',
            'en:ice-cream', 'en:frozen-desserts', 'en:frozen-chips', 'en:frozen-peas',
            'en:frozen-pizza', 'en:frozen-fish-fingers'
        ],

        // Enhanced fresh produce
        'Fresh Fruits': [
            'en:fruits', 'en:fresh-fruits', 'en:apples', 'en:bananas', 'en:oranges', 'en:berries',
            'en:citrus', 'en:tropical-fruits', 'en:stone-fruits', 'en:pears', 'en:grapes',
            'en:strawberries', 'en:raspberries', 'en:blackberries', 'en:blueberries'
        ],

        'Fresh Vegetables': [
            'en:vegetables', 'en:fresh-vegetables', 'en:leafy-vegetables', 'en:root-vegetables',
            'en:tomatoes', 'en:onions', 'en:carrots', 'en:potatoes', 'en:peppers', 'en:lettuce',
            'en:spinach', 'en:broccoli', 'en:cauliflower', 'en:cabbage', 'en:brussels-sprouts',
            'en:courgettes', 'en:aubergines', 'en:leeks', 'en:parsnips', 'en:swede'
        ],

        // Enhanced canned/jarred foods
        'Canned/Jarred Foods': [
            'en:canned-foods', 'en:jarred-foods', 'en:preserves', 'en:pickles', 'en:jams', 'en:marmalade',
            'en:canned-beans', 'en:canned-vegetables', 'en:canned-fruit', 'en:canned-fish',
            'en:baked-beans', 'en:mushy-peas', 'en:tinned-tomatoes', 'en:canned-soup'
        ],

        // Enhanced grains and cereals
        'Grains': [
            'en:cereals', 'en:rice', 'en:quinoa', 'en:oats', 'en:barley', 'en:bulgur',
            'en:rice-mixes', 'en:rice-a-roni', 'en:porridge', 'en:muesli', 'en:granola'
        ],

        // Enhanced pasta with international variants
        'Pasta': [
            'en:pasta', 'en:noodles', 'en:spaghetti', 'en:macaroni', 'en:penne', 'en:linguine',
            'en:fettuccine', 'en:ravioli', 'en:lasagna', 'en:tagliatelle', 'en:gnocchi'
        ],

        // Enhanced seasonings and spices
        'Seasonings': [
            'en:seasonings', 'en:salt', 'en:pepper', 'en:garlic-powder', 'en:onion-powder',
            'en:seasoning-mixes', 'en:mixed-herbs', 'en:italian-seasoning'
        ],

        'Spices': [
            'en:spices', 'en:cinnamon', 'en:paprika', 'en:cumin', 'en:oregano', 'en:thyme',
            'en:rosemary', 'en:bay-leaves', 'en:turmeric', 'en:coriander', 'en:cardamom',
            'en:nutmeg', 'en:cloves', 'en:allspice'
        ],

        // Enhanced snacks
        'Snacks': [
            'en:snacks', 'en:chips', 'en:crackers', 'en:cookies', 'en:nuts', 'en:pretzels',
            'en:popcorn', 'en:crisps', 'en:peanuts', 'en:almonds', 'en:walnuts'
        ],

        // Enhanced soups with international variants
        'Soups & Soup Mixes': [
            'en:soups', 'en:soup-mixes', 'en:canned-soup', 'en:instant-soup', 'en:soup-packets',
            'en:ramen', 'en:instant-noodles', 'en:chicken-soup', 'en:vegetable-soup', 'en:tomato-soup',
            'en:beef-soup', 'en:minestrone', 'en:cream-soups', 'en:bisque', 'en:cup-a-soup'
        ]
    };

    // Currency-specific category prioritization
    const categoryPriority = {
        'GBP': ['Biscuits & Confectionery', 'Ready Meals', 'Canned/Jarred Foods', 'Condiments'],
        'EUR': ['Ready Meals', 'Cheese', 'Condiments'],
        'AUD': ['Snacks', 'Condiments'],
        'CAD': ['Dairy', 'Condiments']
    };

    const prioritizedCategories = categoryPriority[userCurrency] || [];

    // Check prioritized categories first
    for (const priorityCategory of prioritizedCategories) {
        if (internationalCategoryMap[priorityCategory]) {
            const tags = internationalCategoryMap[priorityCategory];
            if (categoriesTags.some(tag =>
                tags.some(mappedTag => tag.toLowerCase().includes(mappedTag.replace('en:', '')))
            )) {
                return priorityCategory;
            }
        }
    }

    // Standard mapping
    for (const [ourCategory, tags] of Object.entries(internationalCategoryMap)) {
        if (categoriesTags.some(tag =>
            tags.some(mappedTag => tag.toLowerCase().includes(mappedTag.replace('en:', '')))
        )) {
            return ourCategory;
        }
    }

    // Fallback mapping with regional context
    const fallbackMap = {
        'GBP': {
            'en:biscuits': 'Biscuits & Confectionery',
            'en:ready-meals': 'Ready Meals',
            'en:crisps': 'Snacks'
        },
        'EUR': {
            'en:fromage': 'Cheese',
            'en:pain': 'Breads',
            'en:conserves': 'Canned/Jarred Foods'
        }
    };

    const regionFallback = fallbackMap[userCurrency] || {};
    for (const tag of categoriesTags) {
        for (const [tagPattern, category] of Object.entries(regionFallback)) {
            if (tag.toLowerCase().includes(tagPattern.replace('en:', ''))) {
                return category;
            }
        }
    }

    return 'Other';
}

export async function GET(request) {
    try {
        // Authentication and usage limit checking (keeping existing logic)
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get user's currency preference for regional optimization
        const userCurrency = user.currencyPreferences?.currency || 'USD';
        console.log(`💰 Search with user currency: ${userCurrency}`);

        // Get current subscription info
        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };

        // Reset monthly counter if needed (keeping existing logic)
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
                    { _id: session.user.id },
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
            console.error('Error resetting search usage tracking:', trackingError);
        }

        const currentScans = user.usageTracking?.monthlyUPCScans || 0;

        // Check if user can perform UPC scan/search
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

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');
        const page = searchParams.get('page') || '1';
        const pageSize = searchParams.get('page_size') || '15';

        console.log(`🔍 International text search request for: "${query}" (page ${page}) with currency ${userCurrency}`);

        if (!query || query.trim().length < 2) {
            return NextResponse.json(
                { error: 'Search query must be at least 2 characters long' },
                { status: 400 }
            );
        }

        // Clean and validate query
        const cleanQuery = query.trim();
        const pageNum = Math.max(1, parseInt(page));
        const pageSizeNum = Math.min(50, Math.max(5, parseInt(pageSize)));

        // Track the search usage BEFORE processing
        try {
            if (!user.usageTracking) {
                user.usageTracking = {
                    currentMonth: now.getMonth(),
                    currentYear: now.getFullYear(),
                    monthlyUPCScans: 0,
                    lastUpdated: now
                };
            }

            user.usageTracking.monthlyUPCScans = (user.usageTracking.monthlyUPCScans || 0) + 1;
            user.usageTracking.lastUpdated = now;

            await User.updateOne(
                { _id: session.user.id },
                {
                    $set: {
                        'usageTracking.monthlyUPCScans': user.usageTracking.monthlyUPCScans,
                        'usageTracking.lastUpdated': now
                    }
                },
                { runValidators: false }
            );

            console.log(`✅ International search tracked. User ${user.email} now has ${user.usageTracking.monthlyUPCScans} scans this month.`);
        } catch (trackingError) {
            console.error('❌ Error tracking international search:', trackingError);
        }

        // Perform international search with regional optimization
        const searchResult = await performInternationalSearch(cleanQuery, pageNum, pageSizeNum, userCurrency);

        if (searchResult.success) {
            const data = searchResult.data;

            // Transform results with international context
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

                // Enhanced category mapping with currency context
                const category = mapCategoryInternational(product.categories_tags, userCurrency);

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
                    // Enhanced international context
                    userCurrency: userCurrency,
                    regionalMatch: searchResult.regional,
                    searchEndpoint: searchResult.endpoint
                };
            });

            // Prioritize results with images and regional relevance
            const resultsWithImages = transformedResults.filter(r => r.image);
            const resultsWithoutImages = transformedResults.filter(r => !r.image);
            const prioritizedResults = [...resultsWithImages, ...resultsWithoutImages];

            // Calculate pagination info
            const totalResults = data.count || 0;
            const totalPages = Math.ceil(totalResults / pageSizeNum);

            console.log(`✅ Successfully processed ${prioritizedResults.length} international products for "${cleanQuery}"`);

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
                query: cleanQuery,
                internationalContext: {
                    userCurrency: userCurrency,
                    searchEndpoint: searchResult.endpoint,
                    regionalOptimization: searchResult.regional,
                    endpointUsed: searchResult.endpoint
                },
                // Include usage information in response
                usageInfo: {
                    scansUsed: user.usageTracking.monthlyUPCScans,
                    scansRemaining: userSubscription.tier === 'free' ?
                        Math.max(0, 10 - user.usageTracking.monthlyUPCScans) : 'unlimited'
                }
            });
        }

        // Search failed - return empty results with international context
        return NextResponse.json({
            success: true,
            results: [],
            pagination: {
                page: pageNum,
                pageSize: pageSizeNum,
                totalResults: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: false
            },
            query: cleanQuery,
            internationalContext: {
                userCurrency: userCurrency,
                searchAttempted: true,
                endpointsChecked: getOptimalSearchEndpoints(userCurrency).length,
                suggestion: `No products found for "${cleanQuery}". Try searching with different terms or check spelling.`
            },
            usageInfo: {
                scansUsed: user.usageTracking.monthlyUPCScans,
                scansRemaining: userSubscription.tier === 'free' ?
                    Math.max(0, 10 - user.usageTracking.monthlyUPCScans) : 'unlimited'
            }
        });

    } catch (error) {
        console.error('❌ International text search error:', error);
        console.error('Error stack:', error.stack);

        // Handle specific error types
        if (error.message.includes('429') || error.message.includes('Rate limit')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Search service is busy. Please wait a moment and try again.',
                    details: 'Rate limit exceeded'
                },
                { status: 429 }
            );
        }

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

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unable to connect to search service',
                    details: 'Network connectivity issue'
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to search for products',
                details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            },
            { status: 500 }
        );
    }
}