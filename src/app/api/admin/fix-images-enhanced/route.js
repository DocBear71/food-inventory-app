// app/api/admin/fix-images-enhanced/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import { Recipe } from '@/lib/models.js';

// Enhanced Recipe Image Finder with intelligent context analysis
class EnhancedRecipeImageFinder {
    constructor() {
        this.delay = 1000;
        this.maxRetries = 3;
    }

    // Smart recipe analysis that understands what the dish actually IS
    analyzeRecipe(recipe) {
        const title = recipe.title.toLowerCase();
        const description = (recipe.description || '').toLowerCase();
        const ingredients = Array.isArray(recipe.ingredients) ?
            recipe.ingredients.map(ing => {
                if (typeof ing === 'string') return ing.toLowerCase();
                return (ing.name || '').toLowerCase();
            }).join(' ') : '';

        const tags = Array.isArray(recipe.tags) ? recipe.tags.join(' ').toLowerCase() : '';
        const category = (recipe.category || '').replace('-', ' ').toLowerCase();

        // Combine all text for analysis
        const allText = `${title} ${description} ${ingredients} ${tags} ${category}`;

        console.log(`🔍 Analyzing recipe: "${recipe.title}"`);
        console.log(`📝 Context: ${allText.substring(0, 150)}...`);

        return {
            title,
            description,
            ingredients,
            tags,
            category,
            allText,
            originalTitle: recipe.title
        };
    }

    // Determine what type of dish this actually is
    identifyDishType(analysis) {
        const { title, description, ingredients, allText, category } = analysis;

        // SAUCE IDENTIFICATION - Most specific first
        if (title.includes('sauce') || category === 'sauces' || description.includes('sauce')) {
            if (title.includes('alfredo') || description.includes('alfredo')) {
                const isVegan = allText.includes('vegan') || allText.includes('cashew') || allText.includes('plant');
                return {
                    dishType: 'sauce',
                    subType: 'alfredo',
                    dietary: isVegan ? 'vegan' : 'regular',
                    searchTerms: isVegan ? [
                        'vegan alfredo sauce white bowl',
                        'cashew cream sauce white',
                        'dairy free alfredo sauce',
                        'plant based white sauce pasta',
                        'vegan pasta sauce creamy white'
                    ] : [
                        'alfredo sauce white creamy bowl',
                        'white pasta sauce parmesan',
                        'creamy alfredo sauce dish',
                        'traditional alfredo sauce'
                    ]
                };
            }

            if (title.includes('marinara') || title.includes('tomato') || ingredients.includes('tomato')) {
                return {
                    dishType: 'sauce',
                    subType: 'tomato',
                    searchTerms: [
                        'marinara sauce red tomato bowl',
                        'tomato pasta sauce red',
                        'red pasta sauce bowl',
                        'italian tomato sauce'
                    ]
                };
            }

            if (title.includes('pesto')) {
                return {
                    dishType: 'sauce',
                    subType: 'pesto',
                    searchTerms: [
                        'pesto sauce green basil',
                        'basil pesto sauce bowl',
                        'green pesto sauce',
                        'italian pesto'
                    ]
                };
            }

            // Generic sauce
            return {
                dishType: 'sauce',
                subType: 'generic',
                searchTerms: [
                    'pasta sauce bowl cooking',
                    'homemade sauce kitchen',
                    'cooking sauce recipe'
                ]
            };
        }

        // PASTA & NOODLE IDENTIFICATION
        if (title.includes('pasta') || title.includes('noodles') || title.includes('lasagna') ||
            title.includes('spaghetti') || title.includes('linguine') || title.includes('fettuccine') ||
            ingredients.includes('pasta') || ingredients.includes('noodles')) {

            if (title.includes('lasagna') || title.includes('lasagne')) {
                const isVegetarian = !allText.includes('meat') && !allText.includes('beef') && !allText.includes('sausage');
                const isCheesy = title.includes('cheese') || ingredients.includes('cheese') || allText.includes('cheese');

                return {
                    dishType: 'pasta',
                    subType: 'lasagna',
                    searchTerms: [
                        'vegetarian lasagna layers cheese baked',
                        'cheese lasagna casserole dish',
                        'homemade lasagna layers pasta',
                        'baked lasagna cheese layers',
                        'lasagna pasta dish italian'
                    ]
                };
            }

            if (title.includes('drunken')) {
                if (title.includes('italian')) {
                    return {
                        dishType: 'pasta',
                        subType: 'italian_drunken_noodles',
                        searchTerms: [
                            'italian drunken noodles pasta',
                            'drunken noodles italian style',
                            'pasta with vegetables italian',
                            'italian pasta dish colorful',
                            'drunken pasta italian recipe'
                        ]
                    };
                } else {
                    // Default to Thai if not specified as Italian
                    return {
                        dishType: 'pasta',
                        subType: 'thai_noodles',
                        searchTerms: [
                            'thai drunken noodles pad kee mao',
                            'spicy wide rice noodles thai',
                            'thai stir fry noodles vegetables'
                        ]
                    };
                }
            }


            if (title.includes('carbonara')) {
                return {
                    dishType: 'pasta',
                    subType: 'carbonara',
                    searchTerms: [
                        'pasta carbonara creamy italian',
                        'spaghetti carbonara dish',
                        'carbonara pasta bowl',
                        'italian carbonara pasta'
                    ]
                };
            }

            // Generic pasta
            return {
                dishType: 'pasta',
                subType: 'generic',
                searchTerms: [
                    'pasta dish italian homemade',
                    'cooked pasta meal plate',
                    'italian pasta dinner'
                ]
            };
        }

        // CHICKEN IDENTIFICATION
        if (title.includes('chicken') || ingredients.includes('chicken')) {
            if (title.includes('sweet') && title.includes('sour')) {
                return {
                    dishType: 'meat',
                    subType: 'sweet_sour_chicken',
                    searchTerms: [
                        'sweet and sour chicken pieces orange',
                        'chinese sweet sour chicken dish',
                        'chicken with sweet sour sauce',
                        'orange glazed chicken pieces',
                        'asian sweet sour chicken'
                    ]
                };
            }

            if (title.includes('pineapple')) {
                return {
                    dishType: 'meat',
                    subType: 'pineapple_chicken',
                    searchTerms: [
                        'chicken with pineapple chunks tropical',
                        'hawaiian chicken pineapple dish',
                        'tropical chicken pineapple',
                        'grilled chicken pineapple sauce'
                    ]
                };
            }

            if (title.includes('alfredo')) {
                return {
                    dishType: 'pasta',
                    subType: 'chicken_alfredo',
                    searchTerms: [
                        'chicken alfredo pasta creamy',
                        'fettuccine chicken alfredo',
                        'chicken pasta alfredo sauce',
                        'creamy chicken pasta'
                    ]
                };
            }

            // Generic chicken
            return {
                dishType: 'meat',
                subType: 'chicken',
                searchTerms: [
                    'cooked chicken dish plate',
                    'chicken dinner main course',
                    'chicken meal homemade'
                ]
            };
        }

        // BREAKFAST IDENTIFICATION
        if (category === 'breakfast' || title.includes('pancake') || title.includes('waffle') ||
            title.includes('breakfast') || title.includes('cereal') || title.includes('oatmeal')) {
            return {
                dishType: 'breakfast',
                searchTerms: [
                    'breakfast food plate morning',
                    'breakfast meal homemade',
                    'morning breakfast dish'
                ]
            };
        }

        // DESSERT IDENTIFICATION
        if (category === 'desserts' || title.includes('cake') || title.includes('cookie') ||
            title.includes('dessert') || title.includes('pie') || title.includes('chocolate')) {
            return {
                dishType: 'dessert',
                searchTerms: [
                    'homemade dessert sweet',
                    'dessert plate sweet',
                    'baked dessert food'
                ]
            };
        }

        // SOUP IDENTIFICATION
        if (category === 'soups' || title.includes('soup') || title.includes('stew') || title.includes('broth')) {
            return {
                dishType: 'soup',
                searchTerms: [
                    'homemade soup bowl',
                    'soup dish comfort food',
                    'warm soup bowl'
                ]
            };
        }

        // FALLBACK - try to extract meaningful terms
        const cleanTitle = title
            .replace(/doc bear'?s?/gi, '')
            .replace(/\s+(i{1,3}|\d+)$/g, '')
            .replace(/['"]/g, '')
            .trim();

        return {
            dishType: 'generic',
            searchTerms: [
                cleanTitle + ' food',
                'homemade ' + cleanTitle,
                cleanTitle + ' dish',
                category ? `${category.replace('-', ' ')} food` : 'delicious homemade food'
            ].filter(term => term && term !== 'food' && term !== ' food')
        };
    }

    // Extract smart keywords based on dish analysis
    extractSmartKeywords(recipe) {
        const analysis = this.analyzeRecipe(recipe);
        const dishInfo = this.identifyDishType(analysis);

        console.log(`🎯 Identified as: ${dishInfo.dishType}${dishInfo.subType ? ` (${dishInfo.subType})` : ''}`);
        console.log(`🔍 Search terms:`, dishInfo.searchTerms);

        return dishInfo.searchTerms;
    }

    async searchUnsplash(searchTerms) {
        const accessKey = process.env.UNSPLASH_ACCESS_KEY;
        if (!accessKey) {
            console.log('⚠️ Unsplash API key not found');
            return null;
        }

        for (const term of searchTerms) {
            try {
                console.log(`🔍 Searching Unsplash for: "${term}"`);

                const response = await fetch(
                    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(term)}&per_page=20&orientation=landscape&order_by=relevance`,
                    {
                        headers: {
                            'Authorization': `Client-ID ${accessKey}`
                        }
                    }
                );

                if (!response.ok) {
                    console.log(`❌ Unsplash API error: ${response.status}`);
                    continue;
                }

                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    // Filter for food-related images with better scoring
                    const foodImages = data.results.filter(img => {
                        const description = (img.description || img.alt_description || '').toLowerCase();
                        const foodKeywords = ['food', 'dish', 'meal', 'sauce', 'pasta', 'chicken', 'recipe', 'cooking', 'kitchen', 'plate', 'bowl', 'dinner', 'lunch', 'breakfast'];
                        const excludeKeywords = ['person', 'people', 'man', 'woman', 'restaurant', 'menu', 'logo'];

                        const hasFoodKeywords = foodKeywords.some(keyword => description.includes(keyword));
                        const hasExcludeKeywords = excludeKeywords.some(keyword => description.includes(keyword));

                        return hasFoodKeywords && !hasExcludeKeywords;
                    });

                    const selectedImage = foodImages.length > 0 ? foodImages[0] : data.results[0];

                    console.log(`✅ Found Unsplash image: "${selectedImage.description || selectedImage.alt_description || 'No description'}"`);

                    return {
                        url: selectedImage.urls.regular,
                        attribution: `Photo by ${selectedImage.user.name} on Unsplash`,
                        source: 'unsplash',
                        searchTerm: term,
                        description: selectedImage.description || selectedImage.alt_description
                    };
                }

                await this.sleep(1000);
            } catch (error) {
                console.log(`❌ Unsplash search failed for "${term}":`, error.message);
            }
        }
        return null;
    }

    async searchPexels(searchTerms) {
        const apiKey = process.env.PEXELS_API_KEY;
        if (!apiKey) {
            console.log('⚠️ Pexels API key not found');
            return null;
        }

        for (const term of searchTerms) {
            try {
                console.log(`🔍 Searching Pexels for: "${term}"`);

                const response = await fetch(
                    `https://api.pexels.com/v1/search?query=${encodeURIComponent(term)}&per_page=20&orientation=landscape`,
                    {
                        headers: {
                            'Authorization': apiKey
                        }
                    }
                );

                if (!response.ok) continue;

                const data = await response.json();
                if (data.photos && data.photos.length > 0) {
                    const image = data.photos[0];
                    console.log(`✅ Found Pexels image by ${image.photographer}`);

                    return {
                        url: image.src.large,
                        attribution: `Photo by ${image.photographer} from Pexels`,
                        source: 'pexels',
                        searchTerm: term
                    };
                }

                await this.sleep(1000);
            } catch (error) {
                console.log(`❌ Pexels search failed for "${term}":`, error.message);
            }
        }
        return null;
    }

    async findBestImage(recipe) {
        const searchTerms = this.extractSmartKeywords(recipe);

        console.log(`\n🍳 Processing: "${recipe.title}"`);
        console.log(`🎯 Smart search terms:`, searchTerms);

        // Try Unsplash first (usually better food photography)
        let result = await this.searchUnsplash(searchTerms);

        // Fallback to Pexels
        if (!result) {
            result = await this.searchPexels(searchTerms);
        }

        if (result) {
            console.log(`✅ Found image from ${result.source}: "${result.description || 'No description'}"`);
        } else {
            console.log(`❌ No suitable images found for "${recipe.title}"`);
        }

        return result;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export async function POST(request) {
    try {
        const {
            specificRecipes = [],
            reprocessAll = false,
            dryRun = false,
            limit = 10
        } = await request.json();

        console.log('🔧 Starting ENHANCED image fix automation...');
        console.log(`Settings: dryRun=${dryRun}, limit=${limit}, specificRecipes=${specificRecipes.length}`);

        await connectDB();

        let query = {};

        if (specificRecipes.length > 0) {
            // Target specific recipes by title
            query.title = { $in: specificRecipes };
            console.log(`🎯 Targeting ${specificRecipes.length} specific recipes`);
        } else if (reprocessAll) {
            // Reprocess all recipes that currently have imageUrl
            query.imageUrl = { $exists: true, $ne: null };
            console.log('🔄 Reprocessing ALL recipes with images');
        } else {
            // Target recipes without images
            query = {
                $and: [
                    { $or: [
                            { imageUrl: { $exists: false } },
                            { imageUrl: null },
                            { imageUrl: '' }
                        ]},
                    { 'uploadedImage.data': { $exists: false } },
                    { 'extractedImage.data': { $exists: false } },
                    { isPublic: true } // Only public recipes
                ]
            };
            console.log('📸 Finding recipes without images');
        }

        const recipes = await Recipe.find(query).limit(limit).lean();
        console.log(`📊 Found ${recipes.length} recipes to process`);

        const results = {
            success: 0,
            failed: 0,
            total: recipes.length,
            processed: []
        };

        if (dryRun) {
            console.log('🧪 DRY RUN - Analyzing recipes:');
            const imageFinder = new EnhancedRecipeImageFinder();

            for (const recipe of recipes) {
                const searchTerms = imageFinder.extractSmartKeywords(recipe);
                results.processed.push({
                    title: recipe.title,
                    status: 'analyzed',
                    searchTerms: searchTerms,
                    category: recipe.category,
                    hasDescription: !!recipe.description,
                    ingredientCount: Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0
                });
            }

            return NextResponse.json({
                success: true,
                dryRun: true,
                results,
                message: `Analyzed ${recipes.length} recipes - would process with enhanced algorithm`
            });
        }

        // Actually process recipes with enhanced logic
        const imageFinder = new EnhancedRecipeImageFinder();

        for (const recipe of recipes) {
            try {
                const imageData = await imageFinder.findBestImage(recipe);

                if (imageData) {
                    await Recipe.findByIdAndUpdate(recipe._id, {
                        imageUrl: imageData.url,
                        imageAttribution: imageData.attribution,
                        imageSource: imageData.source,
                        hasUserImage: false,
                        lastImageUpdate: new Date(),
                        updatedAt: new Date()
                    });

                    results.success++;
                    results.processed.push({
                        title: recipe.title,
                        status: 'success',
                        source: imageData.source,
                        url: imageData.url,
                        searchTerm: imageData.searchTerm,
                        description: imageData.description || 'No description'
                    });
                } else {
                    results.failed++;
                    results.processed.push({
                        title: recipe.title,
                        status: 'no_image_found'
                    });
                }

                // Delay between recipes to be respectful to APIs
                await imageFinder.sleep(1500);

            } catch (error) {
                console.error(`Error processing ${recipe.title}:`, error);
                results.failed++;
                results.processed.push({
                    title: recipe.title,
                    status: 'error',
                    error: error.message
                });
            }
        }

        console.log(`\n✅ Processing complete!`);
        console.log(`📊 Results: ${results.success} success, ${results.failed} failed`);

        return NextResponse.json({
            success: true,
            results,
            message: `Enhanced processing complete: ${results.success}/${results.total} recipes updated`
        });

    } catch (error) {
        console.error('Enhanced image fix error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}