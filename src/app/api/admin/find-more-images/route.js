// app/api/admin/find-more-images/route.js - Search for additional image options
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import { Recipe } from '@/lib/models.js';

class AlternativeImageFinder {
    constructor() {
        this.delay = 1000;
    }

    // Generate alternative search terms when initial search fails
    generateAlternativeSearchTerms(recipeTitle) {
        const title = recipeTitle.toLowerCase();
        const cleanTitle = title
            .replace(/doc bear'?s?\s*/g, '')
            .replace(/\s+(i{1,3}|\d+)$/g, '')
            .replace(/['"]/g, '')
            .trim();

        console.log(`🔍 Generating alternative search terms for: "${recipeTitle}"`);

        const alternatives = [];

        // Strategy 1: Add "homemade" prefix
        alternatives.push(`homemade ${cleanTitle}`);

        // Strategy 2: Add cooking style descriptors
        const cookingStyles = ['fresh', 'authentic', 'traditional', 'classic', 'gourmet'];
        cookingStyles.forEach(style => {
            alternatives.push(`${style} ${cleanTitle}`);
        });

        // Strategy 3: Simplify complex names (take first 2 words)
        const words = cleanTitle.split(' ').filter(w => w.length > 2);
        if (words.length > 2) {
            alternatives.push(words.slice(0, 2).join(' '));
            alternatives.push(words[0]); // Just the first word
        }

        // Strategy 4: Add cuisine context if identifiable
        if (title.includes('alfredo') || title.includes('pasta')) {
            alternatives.push(`italian ${words[0] || cleanTitle}`);
        } else if (title.includes('sweet') && title.includes('sour')) {
            alternatives.push(`chinese ${words[0] || cleanTitle}`);
        } else if (title.includes('drunken') || title.includes('pad')) {
            alternatives.push(`thai ${words[0] || cleanTitle}`);
        }

        // Strategy 5: Generic food terms
        if (title.includes('sauce')) {
            alternatives.push('pasta sauce', 'cooking sauce', 'homemade sauce');
        } else if (title.includes('chicken')) {
            alternatives.push('chicken dish', 'cooked chicken', 'chicken dinner');
        } else if (title.includes('lasagna')) {
            alternatives.push('baked lasagna', 'pasta casserole', 'layered pasta');
        }

        // Strategy 6: Broader food categories
        alternatives.push('delicious food', 'home cooking', 'comfort food');

        // Remove duplicates and limit to top alternatives
        const uniqueTerms = [...new Set(alternatives)].filter(term =>
            term && term.trim() && term.length > 2
        );

        console.log(`🎯 Alternative search terms: ${uniqueTerms.slice(0, 6).join(', ')}`);
        return uniqueTerms.slice(0, 6);
    }

    async searchPexelsAlternatives(searchTerms, excludeUrls = []) {
        const apiKey = process.env.PEXELS_API_KEY;
        if (!apiKey) return [];

        const results = [];

        for (const term of searchTerms) {
            try {
                console.log(`🔍 Pexels alternative search: "${term}"`);

                const response = await fetch(
                    `https://api.pexels.com/v1/search?query=${encodeURIComponent(term)}&per_page=8&orientation=landscape`,
                    {
                        headers: { 'Authorization': apiKey }
                    }
                );

                if (!response.ok) continue;

                const data = await response.json();

                if (data.photos && data.photos.length > 0) {
                    for (const photo of data.photos) {
                        // Skip if we've already rejected this URL
                        if (excludeUrls.includes(photo.src.large)) continue;

                        const score = this.calculateAlternativeScore(photo, term);

                        results.push({
                            url: photo.src.large,
                            thumbnail: photo.src.medium,
                            attribution: {
                                photographer: photo.photographer,
                                source: "Pexels"
                            },
                            source: "pexels_alternative",
                            searchTerm: term,
                            score: score.overall,
                            confidence: score.confidence,
                            relevance: score.relevance,
                            reason: `Alternative search: "${term}" - ${score.reason}`,
                            description: photo.alt || `Alternative ${term} image`,
                            approved: score.overall >= 0.4 // Lower threshold for alternatives
                        });
                    }
                }

                await this.sleep(500);

                // Stop if we have enough good alternatives
                if (results.length >= 5) break;

            } catch (error) {
                console.log(`❌ Pexels alternative search failed for "${term}":`, error.message);
            }
        }

        return results;
    }

    async searchUnsplashAlternatives(searchTerms, excludeUrls = []) {
        const accessKey = process.env.UNSPLASH_ACCESS_KEY;
        if (!accessKey) return [];

        const results = [];

        for (const term of searchTerms.slice(0, 3)) { // Limit Unsplash searches
            try {
                console.log(`🔍 Unsplash alternative search: "${term}"`);

                const response = await fetch(
                    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(term + ' food')}&per_page=6&orientation=landscape`,
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
                    for (const photo of data.results) {
                        // Skip if we've already rejected this URL
                        if (excludeUrls.includes(photo.urls.regular)) continue;

                        const score = this.calculateAlternativeScore(photo, term, 'unsplash');

                        results.push({
                            url: photo.urls.regular,
                            thumbnail: photo.urls.small,
                            attribution: {
                                photographer: photo.user.name,
                                source: "Unsplash"
                            },
                            source: "unsplash_alternative",
                            searchTerm: term,
                            score: score.overall,
                            confidence: score.confidence,
                            relevance: score.relevance,
                            reason: `Alternative search: "${term}" - ${score.reason}`,
                            description: photo.description || photo.alt_description || `Alternative ${term} image`,
                            approved: score.overall >= 0.4
                        });
                    }
                }

                await this.sleep(500);

            } catch (error) {
                console.log(`❌ Unsplash alternative search failed for "${term}":`, error.message);
            }
        }

        return results;
    }

    calculateAlternativeScore(photo, searchTerm, source = 'pexels') {
        const description = source === 'unsplash'
            ? (photo.description || photo.alt_description || '').toLowerCase()
            : (photo.alt || '').toLowerCase();

        let relevanceScore = 0.4; // Lower base score for alternatives
        let confidenceScore = 0.5;
        let reason = 'Alternative search result';

        const searchWords = searchTerm.toLowerCase().split(' ');

        // Basic matching
        const matches = searchWords.filter(word => description.includes(word)).length;
        relevanceScore += matches * 0.1;

        // Food content bonus
        const foodTerms = ['food', 'dish', 'meal', 'delicious', 'homemade'];
        const foodMatches = foodTerms.filter(term => description.includes(term)).length;
        relevanceScore += foodMatches * 0.05;

        // Quality indicators
        if (source === 'unsplash' && photo.likes > 50) {
            relevanceScore += 0.1;
            reason += ', popular image';
        }

        if (description.includes('homemade') || description.includes('fresh')) {
            relevanceScore += 0.1;
            reason += ', homemade quality';
        }

        // Confidence based on source and matching
        confidenceScore = source === 'pexels' ? 0.6 : 0.5;
        confidenceScore += matches * 0.1;

        const overallScore = (relevanceScore * 0.6 + confidenceScore * 0.4);

        return {
            relevance: Math.min(1, relevanceScore),
            confidence: Math.min(1, confidenceScore),
            overall: Math.min(1, overallScore),
            reason: reason
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export async function POST(request) {
    try {
        const {
            recipeTitle,
            excludeUrls = [],
            maxResults = 5,
            useAlternativeTerms = true
        } = await request.json();

        console.log(`🔍 Finding more images for: "${recipeTitle}"`);
        console.log(`📝 Excluding ${excludeUrls.length} previously rejected URLs`);

        await connectDB();

        // Find the recipe to get context
        const recipe = await Recipe.findOne({ title: recipeTitle });
        if (!recipe) {
            return NextResponse.json({
                success: false,
                error: 'Recipe not found'
            }, { status: 404 });
        }

        const finder = new AlternativeImageFinder();
        const alternativeTerms = finder.generateAlternativeSearchTerms(recipeTitle);

        // Search both sources with alternative terms
        const [pexelsResults, unsplashResults] = await Promise.all([
            finder.searchPexelsAlternatives(alternativeTerms, excludeUrls),
            finder.searchUnsplashAlternatives(alternativeTerms, excludeUrls)
        ]);

        // Combine and sort results
        const allResults = [...pexelsResults, ...unsplashResults];
        allResults.sort((a, b) => b.score - a.score);

        // Limit results
        const newOptions = allResults.slice(0, maxResults);

        console.log(`✅ Found ${newOptions.length} alternative image options`);

        if (newOptions.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No alternative images found',
                searchTermsUsed: alternativeTerms
            });
        }

        return NextResponse.json({
            success: true,
            newOptions: newOptions,
            searchTermsUsed: alternativeTerms,
            message: `Found ${newOptions.length} alternative image options using different search strategies`
        });

    } catch (error) {
        console.error('Alternative image search error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}