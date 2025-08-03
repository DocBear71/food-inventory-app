// app/api/admin/assign-images/route.js v3 - Fixed image detection logic to respect existing images
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import { Recipe } from '@/lib/models.js';

// Enhanced Image Finder with Google Images support
class EnhancedImageFinder {
    constructor() {
        this.delay = 1000;
        this.maxRetries = 3;
    }

    // Check if recipe already has any type of image
    hasExistingImage(recipe) {
        const checks = {
            primaryPhoto: recipe.primaryPhoto && recipe.hasPhotos,
            uploadedImage: recipe.uploadedImage?.data,
            extractedImage: recipe.extractedImage?.data,
            externalUrl: recipe.imageUrl && recipe.imageUrl.trim() !== '',
            photos: recipe.photos && recipe.photos.length > 0
        };

        const hasImage = Object.values(checks).some(Boolean);

        if (hasImage) {
            const imageTypes = Object.entries(checks)
                .filter(([_, hasType]) => hasType)
                .map(([type, _]) => type);

            console.log(`⏭️ Skipping "${recipe.title}" - already has images: [${imageTypes.join(', ')}]`);
        }

        return hasImage;
    }

    extractKeywords(recipe) {
        const title = recipe.title.toLowerCase();
        const category = recipe.category || '';
        const tags = recipe.tags || [];

        // Remove common non-descriptive words
        const stopWords = ['doc', 'bear', 'bears', 'recipe', 'easy', 'quick', 'homemade', 'simple', 'best', 'perfect', 'delicious', 'amazing', 'ultimate', 'classic', 'traditional', 'authentic', 'i', 'ii', 'iii', '1', '2', '3'];

        // Extract meaningful words from title
        let titleWords = title
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.includes(word));

        // Food-specific descriptors that should be preserved
        const foodDescriptors = [
            'creamy', 'crispy', 'spicy', 'sweet', 'sour', 'savory', 'tangy', 'rich',
            'cheesy', 'vegan', 'vegetarian', 'gluten-free', 'healthy', 'fresh',
            'grilled', 'baked', 'fried', 'roasted', 'sauteed', 'steamed'
        ];

        // Core ingredients and dish types
        const coreIngredients = [
            'chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'turkey',
            'pasta', 'noodles', 'rice', 'quinoa', 'bread', 'pizza',
            'cheese', 'alfredo', 'marinara', 'pesto', 'carbonara',
            'lasagna', 'spaghetti', 'fettuccine', 'linguine', 'penne',
            'mushroom', 'tomato', 'garlic', 'onion', 'pepper', 'spinach',
            'broccoli', 'cauliflower', 'zucchini', 'eggplant',
            'chocolate', 'vanilla', 'strawberry', 'lemon', 'apple', 'banana'
        ];

        // Find the most relevant words from title
        let relevantWords = [];

        // Add food descriptors found in title
        foodDescriptors.forEach(desc => {
            if (title.includes(desc)) {
                relevantWords.push(desc);
            }
        });

        // Add core ingredients found in title
        coreIngredients.forEach(ingredient => {
            if (title.includes(ingredient)) {
                relevantWords.push(ingredient);
            }
        });

        // Add other meaningful words from title (max 3)
        titleWords.forEach(word => {
            if (!relevantWords.includes(word) && relevantWords.length < 6) {
                relevantWords.push(word);
            }
        });

        // Build smart search terms
        const searchTerms = [];

        // Primary search: Most specific combination
        if (relevantWords.length >= 2) {
            searchTerms.push(relevantWords.slice(0, 3).join(' '));
        } else if (relevantWords.length === 1) {
            searchTerms.push(relevantWords[0]);
        }

        // Secondary search: Add category context
        if (category && category !== 'entrees') {
            const categoryName = category.replace('-', ' ');
            if (relevantWords.length > 0) {
                searchTerms.push(`${relevantWords[0]} ${categoryName}`);
            } else {
                searchTerms.push(categoryName);
            }
        }

        // Tertiary search: Broader food context
        if (relevantWords.length > 0) {
            searchTerms.push(`${relevantWords[0]} food`);
        }

        // Fallback search terms
        if (searchTerms.length === 0) {
            if (category) {
                searchTerms.push(category.replace('-', ' '));
            } else {
                searchTerms.push('delicious food');
            }
        }

        // Remove duplicates and empty terms
        const finalTerms = [...new Set(searchTerms)].filter(term => term.trim());

        console.log(`🔍 Smart keyword extraction for "${recipe.title}":`, {
            relevantWords,
            finalSearchTerms: finalTerms
        });

        return finalTerms;
    }

    async searchGoogleImages(searchTerms) {
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

        if (!apiKey || !searchEngineId) {
            console.log('⚠️ Google Custom Search API keys not found');
            return null;
        }

        for (const term of searchTerms.slice(0, 3)) { // Limit Google searches due to quota
            try {
                console.log(`🔍 Searching Google Images for: "${term}"`);

                const response = await fetch(
                    `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(term + ' food recipe')}&searchType=image&imgSize=large&imgType=photo&safe=active&num=5`,
                    {
                        headers: {
                            'Accept': 'application/json'
                        }
                    }
                );

                if (!response.ok) {
                    console.log(`❌ Google Search API error: ${response.status}`);
                    continue;
                }

                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    const image = data.items[0];

                    // Basic validation for food images
                    const title = (image.title || '').toLowerCase();
                    const snippet = (image.snippet || '').toLowerCase();
                    const foodKeywords = ['food', 'recipe', 'dish', 'meal', 'cooking', 'kitchen'];

                    const isFoodRelated = foodKeywords.some(keyword =>
                        title.includes(keyword) || snippet.includes(keyword)
                    );

                    if (isFoodRelated) {
                        return {
                            url: image.link,
                            attribution: `Image from ${image.displayLink}`,
                            source: 'google_images',
                            searchTerm: term,
                            description: image.title || snippet
                        };
                    }
                }

                await this.sleep(1000);
            } catch (error) {
                console.log(`❌ Google Images search failed for "${term}":`, error.message);
            }
        }
        return null;
    }

    async searchUnsplash(searchTerms) {
        const accessKey = process.env.UNSPLASH_ACCESS_KEY;
        if (!accessKey) {
            console.log('⚠️ Unsplash API key not found');
            return null;
        }

        for (const term of searchTerms) {
            try {
                const response = await fetch(
                    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(term)}&per_page=5&orientation=landscape`,
                    {
                        headers: {
                            'Authorization': `Client-ID ${accessKey}`
                        }
                    }
                );

                if (!response.ok) continue;

                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    const image = data.results[0];
                    return {
                        url: image.urls.regular,
                        attribution: `Photo by ${image.user.name} on Unsplash`,
                        source: 'unsplash',
                        searchTerm: term,
                        description: image.description || image.alt_description
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
                const response = await fetch(
                    `https://api.pexels.com/v1/search?query=${encodeURIComponent(term)}&per_page=5&orientation=landscape`,
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

    async findBestFreeImage(recipe) {
        // Skip if recipe already has images
        if (this.hasExistingImage(recipe)) {
            return null;
        }

        const searchTerms = this.extractKeywords(recipe);
        console.log(`🔍 Searching for "${recipe.title}" using:`, searchTerms);

        // Try sources in order: Google Images (best quality), Pexels, then Unsplash
        let result = await this.searchGoogleImages(searchTerms);
        if (!result) {
            result = await this.searchPexels(searchTerms);
        }
        if (!result) {
            result = await this.searchUnsplash(searchTerms);
        }

        if (result) {
            console.log(`✅ Found image for "${recipe.title}" from ${result.source}`);
        } else {
            console.log(`❌ No images found for "${recipe.title}"`);
        }

        return result;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export async function POST(request) {
    try {
        const { limit = 5, dryRun = true, publicOnly = true } = await request.json();

        console.log('🍳 Starting enhanced recipe image automation...');
        console.log(`Settings: limit=${limit}, dryRun=${dryRun}, publicOnly=${publicOnly}`);

        await connectDB();

        // UPDATED: Comprehensive query to exclude recipes with ANY type of image
        const query = {
            $and: [
                // No primary photos
                {
                    $or: [
                        { primaryPhoto: { $exists: false } },
                        { primaryPhoto: null },
                        { hasPhotos: { $ne: true } }
                    ]
                },
                // No uploaded images
                {
                    $or: [
                        { 'uploadedImage.data': { $exists: false } },
                        { 'uploadedImage.data': null },
                        { 'uploadedImage.data': '' }
                    ]
                },
                // No extracted images
                {
                    $or: [
                        { 'extractedImage.data': { $exists: false } },
                        { 'extractedImage.data': null },
                        { 'extractedImage.data': '' }
                    ]
                },
                // No external URLs
                {
                    $or: [
                        { imageUrl: { $exists: false } },
                        { imageUrl: null },
                        { imageUrl: '' }
                    ]
                },
                // No photos array or empty photos array
                {
                    $or: [
                        { photos: { $exists: false } },
                        { photos: { $size: 0 } }
                    ]
                }
            ]
        };

        if (publicOnly) query.isPublic = true;

        const recipes = await Recipe.find(query)
            .select('title category tags primaryPhoto hasPhotos uploadedImage extractedImage imageUrl photos imagePriority')
            .limit(limit)
            .lean();

        console.log(`📊 Found ${recipes.length} recipes genuinely needing images`);

        // Double-check to ensure no recipes with images slip through
        const recipesNeedingImages = recipes.filter(recipe => {
            const imageFinder = new EnhancedImageFinder();
            return !imageFinder.hasExistingImage(recipe);
        });

        console.log(`📊 After double-check: ${recipesNeedingImages.length} recipes confirmed need images`);

        const results = {
            success: 0,
            failed: 0,
            skipped: recipes.length - recipesNeedingImages.length,
            total: recipesNeedingImages.length,
            processed: []
        };

        if (dryRun) {
            console.log('🧪 DRY RUN - Would process:');
            for (const recipe of recipesNeedingImages) {
                console.log(`- ${recipe.title} (${recipe.category})`);
                results.processed.push({
                    title: recipe.title,
                    category: recipe.category,
                    status: 'would_process'
                });
            }

            return NextResponse.json({
                success: true,
                dryRun: true,
                results,
                message: `Would process ${recipesNeedingImages.length} recipes (${results.skipped} already have images)`
            });
        }

        // Actually process recipes
        const imageFinder = new EnhancedImageFinder();

        for (const recipe of recipesNeedingImages) {
            try {
                const imageData = await imageFinder.findBestFreeImage(recipe);

                if (imageData) {
                    await Recipe.findByIdAndUpdate(recipe._id, {
                        imageUrl: imageData.url,
                        imageAttribution: imageData.attribution,
                        imageSource: imageData.source,
                        imageSearchTerms: imageData.searchTerm,
                        hasUserImage: false,
                        imagePriority: 'external_url',
                        'imageMetadata.primarySource': 'external_url',
                        'imageMetadata.lastUpdated': new Date(),
                        $inc: { 'imageMetadata.updateCount': 1 },
                        updatedAt: new Date()
                    });

                    results.success++;
                    results.processed.push({
                        title: recipe.title,
                        status: 'success',
                        source: imageData.source,
                        url: imageData.url
                    });
                } else {
                    results.failed++;
                    results.processed.push({
                        title: recipe.title,
                        status: 'no_image_found'
                    });
                }

                // Small delay between recipes
                await imageFinder.sleep(500);

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

        return NextResponse.json({
            success: true,
            results,
            message: `Processed ${results.total} recipes. Success: ${results.success}, Failed: ${results.failed}, Already had images: ${results.skipped}`
        });

    } catch (error) {
        console.error('Enhanced image automation error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}