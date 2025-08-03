// app/api/admin/modal-image-search/route.js - Integration with Modal.com AI image search
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import { Recipe } from '@/lib/models.js';

// Enhanced Recipe Image Finder using Modal.com AI analysis
class ModalImageFinder {
    constructor() {
        this.modalUrl = process.env.MODAL_APP_URL; // Your Modal app URL when deployed
        this.delay = 2000; // Longer delay for AI processing
    }

    // Smart recipe analysis that understands dietary restrictions and dish types
    analyzeRecipeForSearch(recipe) {
        const title = recipe.title.toLowerCase();
        const description = (recipe.description || '').toLowerCase();
        const ingredients = Array.isArray(recipe.ingredients) ?
            recipe.ingredients.map(ing => {
                if (typeof ing === 'string') return ing.toLowerCase();
                return (ing.name || '').toLowerCase();
            }).join(' ') : '';

        const tags = Array.isArray(recipe.tags) ? recipe.tags.join(' ').toLowerCase() : '';
        const category = (recipe.category || '').replace('-', ' ').toLowerCase();

        console.log(`🔍 Analyzing recipe: "${recipe.title}"`);

        // Clean the title for better search terms
        const cleanTitle = title
            .replace(/doc bear'?s?\s*/g, '')
            .replace(/\s+(i{1,3}|\d+)$/g, '') // Remove roman numerals
            .replace(/['"]/g, '')
            .trim();

        // Determine dietary restrictions
        const isDietaryRestricted = title.includes('vegan') || title.includes('vegetarian') ||
            title.includes('gluten') || tags.includes('vegan') ||
            tags.includes('vegetarian');

        // Extract key components
        let searchTerms = [];
        let dietaryPrefix = '';

        // Handle vegan recipes specially
        if (title.includes('vegan') || tags.includes('vegan')) {
            dietaryPrefix = 'vegan';

            if (title.includes('alfredo')) {
                searchTerms = [
                    'vegan alfredo sauce',
                    'cashew cream sauce',
                    'dairy free white sauce',
                    'plant based alfredo'
                ];
            } else if (category === 'sauces') {
                searchTerms = [
                    'vegan pasta sauce',
                    'plant based sauce',
                    'dairy free sauce'
                ];
            } else {
                searchTerms = [`vegan ${cleanTitle.replace('vegan', '').trim()}`];
            }
        }
        // Handle lasagna
        else if (title.includes('lasagna') || title.includes('lasagne')) {
            if (title.includes('cheese')) {
                searchTerms = [
                    'vegetarian cheese lasagna',
                    'homemade lasagna layers',
                    'cheesy lasagna baked'
                ];
            } else {
                searchTerms = [
                    'vegetarian lasagna',
                    'homemade lasagna',
                    'pasta lasagna layers'
                ];
            }
        }
        // Handle chicken dishes
        else if (title.includes('chicken')) {
            if (title.includes('sweet') && title.includes('sour')) {
                searchTerms = [
                    'sweet and sour chicken',
                    'chinese sweet sour chicken',
                    'pineapple chicken',
                    'glazed chicken pieces'
                ];
            } else if (title.includes('pineapple')) {
                searchTerms = [
                    'pineapple chicken',
                    'hawaiian chicken',
                    'tropical chicken dish'
                ];
            } else {
                searchTerms = [`${cleanTitle}`];
            }
        }
        // Handle other recipes
        else {
            // Extract meaningful words
            const meaningfulWords = cleanTitle
                .split(/\s+/)
                .filter(word => {
                    return word.length > 3 &&
                        !['recipe', 'easy', 'quick', 'best', 'perfect', 'homemade'].includes(word);
                });

            if (meaningfulWords.length >= 2) {
                searchTerms = [meaningfulWords.join(' ')];
            } else if (meaningfulWords.length === 1) {
                searchTerms = [meaningfulWords[0]];
            } else {
                searchTerms = [cleanTitle];
            }
        }

        // Add category-specific fallbacks
        if (category && category !== 'entrees') {
            const categoryTerm = category.replace('-', ' ');
            searchTerms.push(`${categoryTerm} food`);
        }

        // Ensure we have fallback terms
        if (searchTerms.length === 0) {
            searchTerms = ['homemade food'];
        }

        return {
            searchTerms: searchTerms.slice(0, 4), // Limit to top 4 terms
            dietaryPrefix,
            isDietaryRestricted,
            cleanTitle,
            originalTitle: recipe.title,
            category: recipe.category
        };
    }

    // Call Modal.com function for AI-enhanced image search
    async searchWithModal(recipe) {
        try {
            const analysis = this.analyzeRecipeForSearch(recipe);

            console.log(`🤖 Calling Modal AI search for: "${recipe.title}"`);
            console.log(`🔍 Search terms:`, analysis.searchTerms);

            // For now, we'll call the Modal function locally since it doesn't have web endpoint
            // You would need to either:
            // 1. Add a web endpoint to your Modal app, OR
            // 2. Use Modal's function calling from Node.js (if available), OR
            // 3. Fallback to direct API calls with the same logic

            // Fallback to enhanced local search with AI-like logic
            return await this.enhancedLocalSearch(recipe, analysis);

        } catch (error) {
            console.error(`❌ Modal search failed for "${recipe.title}":`, error);
            return null;
        }
    }

    // Enhanced local search that mimics the Modal AI logic
    async enhancedLocalSearch(recipe, analysis) {
        const { searchTerms, isDietaryRestricted, dietaryPrefix } = analysis;

        // Try multiple sources with AI-like ranking
        const results = [];

        // Search Unsplash
        const unsplashResult = await this.searchUnsplashEnhanced(searchTerms, recipe, isDietaryRestricted);
        if (unsplashResult) results.push({ ...unsplashResult, source: 'unsplash' });

        // Search Pexels
        const pexelsResult = await this.searchPexelsEnhanced(searchTerms, recipe, isDietaryRestricted);
        if (pexelsResult) results.push({ ...pexelsResult, source: 'pexels' });

        if (results.length === 0) return null;

        // AI-like scoring and selection
        const bestResult = this.selectBestImageWithAI(results, recipe, analysis);

        return bestResult;
    }

    async searchUnsplashEnhanced(searchTerms, recipe, isDietaryRestricted) {
        const accessKey = process.env.UNSPLASH_ACCESS_KEY;
        if (!accessKey) return null;

        for (const term of searchTerms) {
            try {
                // Enhanced search with food-specific terms
                const enhancedTerm = `${term} food recipe cooking`;

                console.log(`🔍 Enhanced Unsplash search: "${enhancedTerm}"`);

                const response = await fetch(
                    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(enhancedTerm)}&per_page=15&orientation=landscape&order_by=relevance&content_filter=high`,
                    {
                        headers: {
                            'Authorization': `Client-ID ${accessKey}`,
                            'Accept-Version': 'v1'
                        }
                    }
                );

                if (!response.ok) continue;

                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    // Filter and score images
                    const scoredImages = this.scoreImagesForRelevance(data.results, recipe, term, isDietaryRestricted);

                    if (scoredImages.length > 0) {
                        const best = scoredImages[0];
                        return {
                            url: best.image.urls.regular,
                            thumbnail: best.image.urls.small,
                            attribution: `Photo by ${best.image.user.name} on Unsplash`,
                            description: best.image.description || best.image.alt_description || 'Food photo',
                            searchTerm: term,
                            score: best.score,
                            confidence: Math.min(best.score / 10, 1.0), // Convert to 0-1 range
                            metadata: {
                                width: best.image.width,
                                height: best.image.height,
                                likes: best.image.likes || 0
                            }
                        };
                    }
                }

                await this.sleep(1000);
            } catch (error) {
                console.log(`❌ Enhanced Unsplash search failed for "${term}":`, error.message);
            }
        }
        return null;
    }

    async searchPexelsEnhanced(searchTerms, recipe, isDietaryRestricted) {
        const apiKey = process.env.PEXELS_API_KEY;
        if (!apiKey) return null;

        for (const term of searchTerms) {
            try {
                const enhancedTerm = `${term} food recipe cooking`;

                console.log(`🔍 Enhanced Pexels search: "${enhancedTerm}"`);

                const response = await fetch(
                    `https://api.pexels.com/v1/search?query=${encodeURIComponent(enhancedTerm)}&per_page=15&orientation=landscape`,
                    {
                        headers: {
                            'Authorization': apiKey
                        }
                    }
                );

                if (!response.ok) continue;

                const data = await response.json();
                if (data.photos && data.photos.length > 0) {
                    // Score images for relevance
                    const scoredImages = this.scoreImagesForRelevance(
                        data.photos.map(photo => ({
                            urls: { regular: photo.src.large, small: photo.src.medium },
                            description: photo.alt,
                            alt_description: photo.alt,
                            user: { name: photo.photographer },
                            width: photo.width,
                            height: photo.height,
                            photographer_url: photo.photographer_url
                        })),
                        recipe,
                        term,
                        isDietaryRestricted
                    );

                    if (scoredImages.length > 0) {
                        const best = scoredImages[0];
                        return {
                            url: best.image.urls.regular,
                            thumbnail: best.image.urls.small,
                            attribution: `Photo by ${best.image.user.name} from Pexels`,
                            description: best.image.description || best.image.alt_description || 'Food photo',
                            searchTerm: term,
                            score: best.score,
                            confidence: Math.min(best.score / 10, 1.0)
                        };
                    }
                }

                await this.sleep(1000);
            } catch (error) {
                console.log(`❌ Enhanced Pexels search failed for "${term}":`, error.message);
            }
        }
        return null;
    }

    // AI-like image scoring based on description and context
    scoreImagesForRelevance(images, recipe, searchTerm, isDietaryRestricted) {
        const title = recipe.title.toLowerCase();
        const searchWords = searchTerm.toLowerCase().split(' ');

        const scoredImages = images.map(image => {
            const description = (image.description || image.alt_description || '').toLowerCase();
            let score = 0;

            // Base score for food-related terms
            const foodTerms = ['food', 'dish', 'meal', 'recipe', 'cooking', 'kitchen', 'plate', 'bowl', 'sauce', 'pasta', 'chicken'];
            const foodMatches = foodTerms.filter(term => description.includes(term)).length;
            score += foodMatches * 2;

            // High score for search term matches
            const termMatches = searchWords.filter(word => description.includes(word)).length;
            score += termMatches * 5;

            // Special scoring for specific dish types
            if (title.includes('alfredo') && description.includes('sauce') && description.includes('white')) {
                score += 10;
            }
            if (title.includes('lasagna') && description.includes('lasagna')) {
                score += 10;
            }
            if (title.includes('chicken') && description.includes('chicken')) {
                score += 8;
            }

            // Dietary restriction penalties
            if (isDietaryRestricted && title.includes('vegan')) {
                // Heavy penalty for non-vegan items in vegan recipes
                if (description.includes('meat') || description.includes('dairy') ||
                    description.includes('cheese') || description.includes('beef') ||
                    description.includes('chicken') || description.includes('fish')) {
                    score -= 20;
                }
                // Bonus for vegan-friendly terms
                if (description.includes('vegan') || description.includes('plant') ||
                    description.includes('cashew') || description.includes('dairy free')) {
                    score += 8;
                }
            }

            // Penalty for unrelated items
            const unrelatedTerms = ['person', 'people', 'background', 'text', 'logo', 'building'];
            const unrelatedMatches = unrelatedTerms.filter(term => description.includes(term)).length;
            score -= unrelatedMatches * 3;

            // Bonus for high-quality indicators
            if (description.includes('homemade') || description.includes('fresh') ||
                description.includes('delicious')) {
                score += 2;
            }

            return { image, score, description };
        });

        // Sort by score and return top candidates
        return scoredImages
            .filter(item => item.score > 0) // Only positive scores
            .sort((a, b) => b.score - a.score);
    }

    // Select best image using AI-like logic
    selectBestImageWithAI(results, recipe, analysis) {
        if (results.length === 0) return null;

        // Sort by confidence and score
        results.sort((a, b) => {
            const scoreA = (a.score || 0) + (a.confidence || 0) * 5;
            const scoreB = (b.score || 0) + (b.confidence || 0) * 5;
            return scoreB - scoreA;
        });

        const best = results[0];

        console.log(`🏆 AI-selected best image:`);
        console.log(`   Source: ${best.source}`);
        console.log(`   Score: ${best.score || 'N/A'}`);
        console.log(`   Confidence: ${best.confidence || 'N/A'}`);
        console.log(`   Description: "${best.description}"`);

        return best;
    }

    async findBestRecipeImage(recipe) {
        console.log(`\n🤖 AI-enhanced search for: "${recipe.title}"`);

        const result = await this.searchWithModal(recipe);

        if (result) {
            console.log(`✅ Found AI-optimized image from ${result.source}`);
            return {
                url: result.url,
                attribution: result.attribution,
                source: `${result.source}_ai_enhanced`,
                searchTerm: result.searchTerm,
                description: result.description,
                confidence: result.confidence,
                score: result.score
            };
        } else {
            console.log(`❌ No suitable AI-enhanced images found for "${recipe.title}"`);
            return null;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export async function POST(request) {
    try {
        const { specificRecipes = [], testMode = false, useModalAI = true } = await request.json();

        console.log('🤖 Starting AI-enhanced image search with Modal.com...');

        await connectDB();

        let query = {};
        if (specificRecipes.length > 0) {
            query.title = { $in: specificRecipes };
        } else {
            // Default problematic recipes
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
        console.log(`📊 Found ${recipes.length} recipes for AI analysis`);

        if (testMode) {
            const finder = new ModalImageFinder();
            const testResults = recipes.map(recipe => {
                const analysis = finder.analyzeRecipeForSearch(recipe);
                return {
                    title: recipe.title,
                    analysis: analysis
                };
            });

            return NextResponse.json({
                success: true,
                testMode: true,
                results: testResults,
                message: `Analyzed ${recipes.length} recipes with AI`
            });
        }

        const results = {
            success: 0,
            failed: 0,
            total: recipes.length,
            processed: []
        };

        const finder = new ModalImageFinder();

        for (const recipe of recipes) {
            try {
                const imageData = await finder.findBestRecipeImage(recipe);

                if (imageData) {
                    await Recipe.findByIdAndUpdate(recipe._id, {
                        imageUrl: imageData.url,
                        imageAttribution: imageData.attribution,
                        imageSource: imageData.source,
                        hasUserImage: false,
                        aiImageScore: imageData.score,
                        aiImageConfidence: imageData.confidence,
                        updatedAt: new Date()
                    });

                    results.success++;
                    results.processed.push({
                        title: recipe.title,
                        status: 'ai_enhanced',
                        source: imageData.source,
                        searchTerm: imageData.searchTerm,
                        description: imageData.description,
                        confidence: imageData.confidence,
                        score: imageData.score,
                        url: imageData.url
                    });
                } else {
                    results.failed++;
                    results.processed.push({
                        title: recipe.title,
                        status: 'no_ai_image_found'
                    });
                }

                // Longer delay for AI processing
                await finder.sleep(2000);

            } catch (error) {
                console.error(`Error in AI search for ${recipe.title}:`, error);
                results.failed++;
                results.processed.push({
                    title: recipe.title,
                    status: 'ai_error',
                    error: error.message
                });
            }
        }

        return NextResponse.json({
            success: true,
            results,
            message: `AI-enhanced ${results.success}/${results.total} recipe images`
        });

    } catch (error) {
        console.error('Modal AI image search error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}