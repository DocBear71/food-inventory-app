// app/api/admin/fix-wrong-images/route.js - Updated with Enhanced Image Selection
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import { Recipe } from '@/lib/models.js';

// Enhanced Image Finder with much better selection logic
class EnhancedRecipeImageFinder {
    constructor() {
        this.delay = 1000;
        this.maxRetries = 3;

        // Specific patterns for problematic recipes
        this.recipePatterns = {
            // VEGAN ALFREDO - Must show creamy white sauce
            'vegan alfredo': {
                keywords: [
                    'vegan alfredo sauce bowl',
                    'cashew cream sauce',
                    'dairy free white pasta sauce',
                    'plant based alfredo cream',
                    'vegan white sauce bowl'
                ],
                mustInclude: ['sauce', 'cream', 'white'],
                mustExclude: ['falafel', 'pita', 'bread', 'hummus', 'chickpea', 'balls']
            },

            'vegan mushroom alfredo': {
                keywords: [
                    'vegan mushroom pasta sauce',
                    'mushroom alfredo bowl',
                    'dairy free mushroom sauce',
                    'cashew mushroom cream sauce',
                    'plant based mushroom pasta'
                ],
                mustInclude: ['mushroom', 'sauce'],
                mustExclude: ['meat', 'chicken', 'beef', 'falafel']
            },

            // LASAGNA - Must show proper homemade layers
            'cheesy lasagna': {
                keywords: [
                    'homemade cheese lasagna slice',
                    'layered lasagna close up',
                    'fresh baked lasagna',
                    'cheesy lasagna layers',
                    'homemade lasagna plate'
                ],
                mustInclude: ['lasagna', 'cheese'],
                mustExclude: ['disposable', 'takeout', 'aluminum', 'tray', 'foil']
            },

            // SWEET & SOUR CHICKEN - Must show chicken with pineapple
            'sweet sour pineapple chicken': {
                keywords: [
                    'sweet and sour chicken pineapple',
                    'pineapple chicken pieces bowl',
                    'chinese sweet sour chicken',
                    'glazed chicken pineapple chunks',
                    'sweet sour chicken dish'
                ],
                mustInclude: ['chicken', 'sweet'],
                mustExclude: ['vegetarian', 'tofu', 'raw']
            }
        };
    }

    extractSmartKeywords(recipe) {
        const title = recipe.title.toLowerCase();
        const cleanTitle = title
            .replace(/doc bear'?s?\s*/g, '')
            .replace(/\s+(i{1,3}|\d+)$/g, '')
            .replace(/['"]/g, '')
            .trim();

        console.log(`🔍 Smart analysis: "${title}" → "${cleanTitle}"`);

        // Check for exact pattern matches
        for (const [pattern, config] of Object.entries(this.recipePatterns)) {
            if (cleanTitle.includes(pattern.replace(/\s+/g, ' '))) {
                console.log(`✅ Matched pattern: "${pattern}"`);
                return {
                    searchTerms: config.keywords,
                    mustInclude: config.mustInclude,
                    mustExclude: config.mustExclude,
                    pattern: pattern
                };
            }
        }

        // Fallback for unmatched recipes
        const words = cleanTitle.split(' ').filter(w => w.length > 2);
        return {
            searchTerms: [cleanTitle, words.slice(0, 2).join(' ')],
            mustInclude: [],
            mustExclude: [],
            pattern: 'fallback'
        };
    }

    // Enhanced image selection with scoring
    selectBestImage(images, criteria) {
        console.log(`🖼️  Evaluating ${images.length} images...`);

        const scoredImages = images.map((image, index) => {
            const description = (image.description || image.alt_description || '').toLowerCase();
            let score = 0;

            // Heavy bonus for must-include terms
            if (criteria.mustInclude && criteria.mustInclude.length > 0) {
                const includeMatches = criteria.mustInclude.filter(term =>
                    description.includes(term.toLowerCase())
                ).length;
                score += includeMatches * 15; // High weight
                console.log(`   Image ${index + 1}: +${includeMatches * 15} for include matches`);
            }

            // Heavy penalty for must-exclude terms
            if (criteria.mustExclude && criteria.mustExclude.length > 0) {
                const excludeMatches = criteria.mustExclude.filter(term =>
                    description.includes(term.toLowerCase())
                ).length;
                score -= excludeMatches * 100; // Very heavy penalty
                if (excludeMatches > 0) {
                    console.log(`   Image ${index + 1}: -${excludeMatches * 100} for exclude matches`);
                }
            }

            // Bonus for food terms
            const foodTerms = ['food', 'dish', 'meal', 'delicious', 'homemade', 'fresh'];
            const foodMatches = foodTerms.filter(term => description.includes(term)).length;
            score += foodMatches * 3;

            // Small penalty for first position bias (sometimes first isn't best)
            if (index === 0) score -= 1;

            console.log(`   Image ${index + 1}: "${description.substring(0, 50)}..." → Score: ${score}`);

            return { image, score, description, index: index + 1 };
        });

        // Sort by score and return best
        scoredImages.sort((a, b) => b.score - a.score);
        const winner = scoredImages[0];

        console.log(`🏆 Winner: Image ${winner.index} (Score: ${winner.score})`);
        console.log(`   Description: "${winner.description}"`);

        return winner.image;
    }

    async searchPexelsWithSmartSelection(criteria) {
        const apiKey = process.env.PEXELS_API_KEY;
        if (!apiKey) return null;

        for (const searchTerm of criteria.searchTerms) {
            try {
                console.log(`🔍 Pexels search: "${searchTerm}"`);

                const response = await fetch(
                    `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=10&orientation=landscape`,
                    {
                        headers: { 'Authorization': apiKey }
                    }
                );

                if (!response.ok) continue;

                const data = await response.json();
                if (data.photos && data.photos.length > 0) {
                    const bestImage = this.selectBestImage(data.photos, criteria);

                    return {
                        url: bestImage.src.large,
                        attribution: `Photo by ${bestImage.photographer} from Pexels`,
                        source: 'pexels_smart',
                        searchTerm: searchTerm,
                        description: bestImage.alt || 'Food photo'
                    };
                }

                await this.sleep(1000);
            } catch (error) {
                console.log(`❌ Pexels error: ${error.message}`);
            }
        }
        return null;
    }

    async searchUnsplashWithSmartSelection(criteria) {
        const accessKey = process.env.UNSPLASH_ACCESS_KEY;
        if (!accessKey) return null;

        for (const searchTerm of criteria.searchTerms) {
            try {
                console.log(`🔍 Unsplash search: "${searchTerm}"`);

                const response = await fetch(
                    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=10&orientation=landscape`,
                    {
                        headers: { 'Authorization': `Client-ID ${accessKey}` }
                    }
                );

                if (!response.ok) continue;

                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    const bestImage = this.selectBestImage(data.results, criteria);

                    return {
                        url: bestImage.urls.regular,
                        attribution: `Photo by ${bestImage.user.name} on Unsplash`,
                        source: 'unsplash_smart',
                        searchTerm: searchTerm,
                        description: bestImage.description || bestImage.alt_description || 'Food photo'
                    };
                }

                await this.sleep(1000);
            } catch (error) {
                console.log(`❌ Unsplash error: ${error.message}`);
            }
        }
        return null;
    }

    async findBestRecipeImage(recipe) {
        console.log(`\n🍳 Processing: "${recipe.title}"`);

        const criteria = this.extractSmartKeywords(recipe);
        console.log(`🎯 Search criteria:`, criteria);

        // Try Pexels first (usually better food photos), then Unsplash
        let result = await this.searchPexelsWithSmartSelection(criteria);
        if (!result) {
            result = await this.searchUnsplashWithSmartSelection(criteria);
        }

        if (result) {
            console.log(`✅ Found excellent image for "${recipe.title}"`);
            console.log(`   Source: ${result.source}`);
            console.log(`   Search: "${result.searchTerm}"`);
            console.log(`   Desc: "${result.description}"`);
        }

        return result;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export async function POST(request) {
    try {
        const { specificRecipes = [], reprocessAll = false, testMode = false } = await request.json();

        console.log('🔧 Starting ENHANCED wrong image fix...');

        await connectDB();

        let query = {};

        if (specificRecipes.length > 0) {
            query.title = { $in: specificRecipes };
        } else if (reprocessAll) {
            query.imageUrl = { $exists: true, $ne: null };
        } else {
            // Default to the problematic recipes
            query.title = {
                $in: [
                    'Doc Bear\'s Vegan Alfredo Sauce I',
                    'Doc Bear\'s Vegan Alfredo Sauce II',
                    'Doc Bear\'s Vegan Mushroom Alfredo Sauce',
                    'Cheesy Lasagna Sheet Pasta',
                    'Sweet and Sour Pineapple Chicken'
                ]
            };
        }

        const recipes = await Recipe.find(query).lean();
        console.log(`📊 Found ${recipes.length} recipes to enhance`);

        if (testMode) {
            // Just test the keyword extraction
            const finder = new EnhancedRecipeImageFinder();
            const testResults = recipes.map(recipe => {
                const criteria = finder.extractSmartKeywords(recipe);
                return {
                    title: recipe.title,
                    criteria: criteria
                };
            });

            return NextResponse.json({
                success: true,
                testMode: true,
                results: testResults,
                message: `Tested keyword extraction for ${recipes.length} recipes`
            });
        }

        const results = {
            success: 0,
            failed: 0,
            total: recipes.length,
            processed: []
        };

        const finder = new EnhancedRecipeImageFinder();

        for (const recipe of recipes) {
            try {
                const imageData = await finder.findBestRecipeImage(recipe);

                if (imageData) {
                    // Update recipe with new image
                    await Recipe.findByIdAndUpdate(recipe._id, {
                        imageUrl: imageData.url,
                        imageAttribution: imageData.attribution,
                        imageSource: imageData.source,
                        hasUserImage: false,
                        updatedAt: new Date()
                    });

                    results.success++;
                    results.processed.push({
                        title: recipe.title,
                        status: 'enhanced',
                        source: imageData.source,
                        searchTerm: imageData.searchTerm,
                        description: imageData.description,
                        url: imageData.url
                    });
                } else {
                    results.failed++;
                    results.processed.push({
                        title: recipe.title,
                        status: 'no_suitable_image_found'
                    });
                }

                // Rate limiting delay
                await finder.sleep(1500);

            } catch (error) {
                console.error(`Error enhancing ${recipe.title}:`, error);
                results.failed++;
                results.processed.push({
                    title: recipe.title,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return NextResponse.json({
            success: true,
            results,
            message: `Enhanced ${results.success}/${results.total} recipe images using smart selection`
        });

    } catch (error) {
        console.error('Enhanced image fix error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}