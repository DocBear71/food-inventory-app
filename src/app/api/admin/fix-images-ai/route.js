// app/api/admin/fix-images-ai/route.js v4 - Enhanced local AI without Modal endpoints
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import { Recipe } from '@/lib/models.js';

class EnhancedAIImageProcessor {
    constructor(options = {}) {
        this.delay = 2000;
        this.scoreThreshold = options.scoreThreshold || 0.9;
        this.confidenceThreshold = options.confidenceThreshold || 0.7;
        this.maxResults = options.maxResults || 10;

        console.log(`🤖 Enhanced AI Image Processor initialized with thresholds: ${this.scoreThreshold}/${this.confidenceThreshold}`);
    }

    // Check if recipe already has any type of image
    hasExistingImage(recipe) {
        const checks = {
            primaryPhoto: recipe.primaryPhoto && recipe.hasPhotos,
            uploadedImage: recipe.uploadedImage?.data,
            extractedImage: recipe.extractedImage?.data,
            externalUrl: recipe.imageUrl && recipe.imageUrl.trim() !== '' && recipe.imageUrl !== '/images/recipe-placeholder.jpg',
            photos: recipe.photos && recipe.photos.length > 0
        };

        const hasImage = Object.values(checks).some(Boolean);

        if (hasImage) {
            const imageTypes = Object.entries(checks)
                .filter(([_, hasType]) => hasType)
                .map(([type, _]) => type);

            console.log(`⏭️ AI Analysis skipping "${recipe.title}" - already has images: [${imageTypes.join(', ')}]`);
            return true;
        }

        return false;
    }

    // ENHANCED: Extract recipe context like the Modal version
    extractRecipeContext(recipe) {
        const title = recipe.title.toLowerCase();
        const description = (recipe.description || '').toLowerCase();
        const tags = Array.isArray(recipe.tags) ? recipe.tags : [];
        const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
        const category = recipe.category || '';

        console.log(`🔍 Analyzing recipe context for: "${recipe.title}"`);

        // Extract key ingredients (proteins, main components)
        const keyIngredients = this.extractKeyIngredients(ingredients);

        // Identify cooking methods from title, description, and tags
        const cookingMethods = this.identifyCookingMethods(title, description, tags);

        // Determine cuisine/style
        const cuisineStyle = this.identifyCuisineStyle(title, description, tags);

        // Extract descriptive terms
        const descriptors = this.extractDescriptors(title, description);

        const context = {
            title: title,
            description: description,
            tags: tags.map(tag => tag.toLowerCase().trim()),
            keyIngredients: keyIngredients,
            cookingMethods: cookingMethods,
            cuisineStyle: cuisineStyle,
            descriptors: descriptors,
            category: category,
            isVegetarian: this.isVegetarianRecipe(ingredients, tags, title, description),
            isVegan: this.isVeganRecipe(ingredients, tags, title, description),
            mealType: this.determineMealType(category, tags, title)
        };

        console.log(`📊 Recipe context analysis:`);
        console.log(`   Key ingredients: ${keyIngredients.join(', ')}`);
        console.log(`   Cooking methods: ${cookingMethods.join(', ')}`);
        console.log(`   Cuisine: ${cuisineStyle.join(', ')}`);
        console.log(`   Descriptors: ${descriptors.join(', ')}`);
        console.log(`   Dietary: ${context.isVegan ? 'Vegan' : context.isVegetarian ? 'Vegetarian' : 'Regular'}`);

        return context;
    }

    extractKeyIngredients(ingredients) {
        if (!ingredients) return [];

        const ingredientItems = [];
        for (const ing of ingredients) {
            if (typeof ing === 'object' && ing.name) {
                ingredientItems.push({
                    name: ing.name.toLowerCase().trim(),
                    original: ing.name
                });
            } else if (typeof ing === 'string') {
                ingredientItems.push({
                    name: ing.toLowerCase().trim(),
                    original: ing
                });
            }
        }

        const proteinKeywords = {
            'beef': ['beef stew meat', 'beef chuck', 'ground beef', 'beef broth', 'beef'],
            'chicken': ['chicken breast', 'chicken thigh', 'chicken stock', 'chicken broth', 'chicken'],
            'pork': ['pork chop', 'pork shoulder', 'ground pork', 'pork'],
            'turkey': ['ground turkey', 'turkey breast', 'turkey'],
            'fish': ['salmon', 'cod', 'tuna', 'fish', 'shrimp'],
            'seafood': ['shrimp', 'crab', 'lobster', 'scallops']
        };

        const starchKeywords = {
            'pasta': ['spaghetti', 'penne', 'fettuccine', 'linguine', 'pasta'],
            'noodles': ['egg noodles', 'rice noodles', 'ramen noodles', 'noodles'],
            'rice': ['brown rice', 'white rice', 'basmati rice', 'rice'],
            'potato': ['russet potato', 'red potato', 'sweet potato', 'potato']
        };

        const veganProteinKeywords = {
            'cashews': ['raw cashew', 'cashew', 'cashews'],
            'tofu': ['firm tofu', 'silken tofu', 'tofu'],
            'beans': ['black bean', 'kidney bean', 'chickpea', 'beans'],
            'lentils': ['red lentil', 'green lentil', 'lentils']
        };

        const sauceKeywords = {
            'alfredo': ['alfredo sauce', 'alfredo'],
            'marinara': ['marinara sauce', 'marinara'],
            'soy sauce': ['soy sauce']
        };

        const keyIngredients = [];

        // Find proteins first
        this.findInCategory(proteinKeywords, ingredientItems, keyIngredients, 1);

        // If no proteins, look for vegan proteins
        if (keyIngredients.length === 0) {
            this.findInCategory(veganProteinKeywords, ingredientItems, keyIngredients, 1);
        }

        // Add starches
        this.findInCategory(starchKeywords, ingredientItems, keyIngredients, 1);

        // Add sauces
        this.findInCategory(sauceKeywords, ingredientItems, keyIngredients, 1);

        return keyIngredients.slice(0, 4);
    }

    findInCategory(categoryDict, ingredientItems, keyIngredients, maxItems) {
        let found = 0;
        for (const [key, patterns] of Object.entries(categoryDict)) {
            for (const ingredientItem of ingredientItems) {
                const ingredientName = ingredientItem.name;
                for (const pattern of patterns) {
                    if (ingredientName.includes(pattern)) {
                        if (!keyIngredients.includes(key)) {
                            keyIngredients.push(key);
                            found++;
                            break;
                        }
                    }
                }
                if (found >= maxItems) break;
            }
            if (found >= maxItems) break;
        }
    }

    identifyCookingMethods(title, description, tags) {
        const allText = `${title} ${description} ${tags.join(' ')}`.toLowerCase();
        const cookingMethods = [];

        const methodKeywords = {
            'slow-cooked': ['slow cooker', 'slow-cooked', 'crockpot', 'slow cook'],
            'grilled': ['grilled', 'grill', 'barbecue', 'bbq'],
            'baked': ['baked', 'oven-baked', 'roasted', 'casserole'],
            'fried': ['fried', 'deep-fried', 'pan-fried', 'sautéed'],
            'steamed': ['steamed', 'steam'],
            'stir-fried': ['stir-fried', 'stir fry', 'wok']
        };

        for (const [method, keywords] of Object.entries(methodKeywords)) {
            for (const keyword of keywords) {
                if (allText.includes(keyword)) {
                    cookingMethods.push(method);
                    break;
                }
            }
        }

        return cookingMethods;
    }

    identifyCuisineStyle(title, description, tags) {
        const allText = `${title} ${description} ${tags.join(' ')}`.toLowerCase();
        const cuisineStyles = [];

        const cuisineKeywords = {
            'italian': ['italian', 'pasta', 'pizza', 'marinara', 'parmesan', 'basil'],
            'mexican': ['mexican', 'taco', 'burrito', 'salsa', 'cilantro', 'jalapeño'],
            'asian': ['asian', 'chinese', 'thai', 'japanese', 'soy sauce', 'ginger'],
            'american': ['american', 'comfort food', 'bbq', 'burger', 'mac and cheese']
        };

        for (const [cuisine, keywords] of Object.entries(cuisineKeywords)) {
            for (const keyword of keywords) {
                if (allText.includes(keyword)) {
                    cuisineStyles.push(cuisine);
                    break;
                }
            }
        }

        return cuisineStyles;
    }

    extractDescriptors(title, description) {
        const allText = `${title} ${description}`.toLowerCase();
        const descriptors = [];

        const visualDescriptors = [
            'creamy', 'crispy', 'golden', 'caramelized', 'melted', 'layered',
            'chunky', 'smooth', 'thick', 'rich', 'tender', 'juicy', 'fresh'
        ];

        const tasteDescriptors = [
            'spicy', 'sweet', 'sour', 'savory', 'tangy', 'smoky', 'zesty',
            'mild', 'bold', 'hearty', 'light', 'delicious', 'comfort'
        ];

        const allDescriptors = [...visualDescriptors, ...tasteDescriptors];

        for (const descriptor of allDescriptors) {
            if (allText.includes(descriptor)) {
                descriptors.push(descriptor);
            }
        }

        return descriptors;
    }

    isVegetarianRecipe(ingredients, tags, title, description) {
        const allText = `${title} ${description} ${tags.join(' ')}`.toLowerCase();

        if (allText.includes('vegetarian') || allText.includes('veggie')) {
            return true;
        }

        const meatKeywords = ['beef', 'chicken', 'pork', 'turkey', 'fish', 'salmon', 'shrimp', 'meat'];
        const ingredientText = JSON.stringify(ingredients).toLowerCase();

        return !meatKeywords.some(meat => ingredientText.includes(meat));
    }

    isVeganRecipe(ingredients, tags, title, description) {
        const allText = `${title} ${description} ${tags.join(' ')}`.toLowerCase();
        return allText.includes('vegan') || allText.includes('plant based');
    }

    determineMealType(category, tags, title) {
        const allText = `${category} ${tags.join(' ')} ${title}`.toLowerCase();

        if (allText.includes('breakfast')) return 'breakfast';
        if (allText.includes('lunch')) return 'lunch';
        if (allText.includes('dinner') || allText.includes('entree')) return 'dinner';
        if (allText.includes('dessert')) return 'dessert';
        if (allText.includes('appetizer')) return 'appetizer';
        if (allText.includes('side')) return 'side';
        return 'main';
    }

    // ENHANCED: Build contextual search terms
    buildContextualSearchTerms(context) {
        const searchTerms = [];

        // Primary search: Key ingredients + cooking method + descriptors
        if (context.keyIngredients.length > 0) {
            const parts = [];

            // Add dietary prefix if important
            if (context.isVegan) {
                parts.push('vegan');
            } else if (context.isVegetarian) {
                parts.push('vegetarian');
            }

            // Add cooking method
            if (context.cookingMethods.length > 0) {
                const method = context.cookingMethods[0].replace('-', ' ');
                parts.push(method);
            }

            // Add best descriptor
            if (context.descriptors.length > 0) {
                const visualDescriptors = context.descriptors.filter(d =>
                    ['creamy', 'crispy', 'tender', 'golden', 'melted'].includes(d)
                );
                if (visualDescriptors.length > 0) {
                    parts.push(visualDescriptors[0]);
                } else {
                    parts.push(context.descriptors[0]);
                }
            }

            // Add ingredients
            parts.push(...context.keyIngredients.slice(0, 3));

            if (parts.length >= 2) {
                const primarySearch = parts.join(' ');
                searchTerms.push(primarySearch);
                console.log(`🎯 Primary contextual search: "${primarySearch}"`);
            }
        }

        // Secondary search: Clean recipe title
        let cleanTitle = context.title.replace(/doc bear'?s?/gi, '').replace(/\s+(i{1,3}|\d+)$/g, '').trim();
        if (cleanTitle && cleanTitle.length > 3) {
            searchTerms.push(cleanTitle);
            console.log(`🎯 Title search: "${cleanTitle}"`);
        }

        // Tertiary search: Dietary + main ingredient
        if (context.keyIngredients.length > 0) {
            const mainIngredient = context.keyIngredients[0];

            if (context.isVegan) {
                const veganSearch = `vegan ${mainIngredient}`;
                if (!searchTerms.includes(veganSearch)) {
                    searchTerms.push(veganSearch);
                    console.log(`🎯 Vegan search: "${veganSearch}"`);
                }
            }

            if (context.cuisineStyle.length > 0) {
                const cuisineSearch = `${context.cuisineStyle[0]} ${mainIngredient}`;
                if (!searchTerms.includes(cuisineSearch)) {
                    searchTerms.push(cuisineSearch);
                    console.log(`🎯 Cuisine search: "${cuisineSearch}"`);
                }
            }
        }

        // Ensure we have fallback terms
        if (searchTerms.length === 0) {
            if (context.keyIngredients.length > 0) {
                searchTerms.push(context.keyIngredients[0]);
            } else {
                searchTerms.push('homemade food');
            }
        }

        const finalTerms = searchTerms.slice(0, 4);
        console.log(`🎯 Final contextual search terms: ${finalTerms.join(', ')}`);

        return finalTerms;
    }

    // ENHANCED: Google Images with contextual scoring
    async searchGoogleImagesEnhanced(searchTerms, context) {
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

        if (!apiKey || !searchEngineId) {
            console.log('⚠️ Google Custom Search API keys not found');
            return { success: false, options: [] };
        }

        try {
            const allOptions = [];

            for (const term of searchTerms.slice(0, 2)) {
                console.log(`🔍 Enhanced Google search: "${term}"`);

                const response = await fetch(
                    `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(term + ' food recipe cooking')}&searchType=image&imgSize=large&imgType=photo&safe=active&num=5`,
                    { headers: { 'Accept': 'application/json' } }
                );

                if (!response.ok) {
                    console.log(`❌ Google API error: ${response.status}`);
                    continue;
                }

                const data = await response.json();

                if (data.items && data.items.length > 0) {
                    for (let i = 0; i < Math.min(data.items.length, 3); i++) {
                        const image = data.items[i];

                        // Enhanced relevance scoring
                        const score = this.calculateEnhancedScore(image, term, context, 'google');

                        if (score.overall > 0.3) { // Filter low-quality results
                            allOptions.push({
                                url: image.link,
                                thumbnail: image.image?.thumbnailLink || image.link,
                                score: score.overall,
                                confidence: score.confidence,
                                relevance: score.relevance,
                                reason: score.reason,
                                approved: score.overall >= this.scoreThreshold && score.confidence >= this.confidenceThreshold,
                                source: "google_enhanced",
                                description: image.title || `${term} image`,
                                attribution: {
                                    photographer: 'Various',
                                    source: "Google Images"
                                },
                                searchTerm: term,
                                tags: this.generateSmartTags(image, context),
                                matchedElements: score.matchedElements,
                                ranking: i + 1
                            });
                        }
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`🥇 Google Enhanced found ${allOptions.length} relevant options`);
            return {
                success: allOptions.length > 0,
                options: allOptions,
                autoApproved: allOptions.find(opt => opt.approved) || null
            };

        } catch (error) {
            console.error('Enhanced Google search error:', error);
            return { success: false, options: [] };
        }
    }

    // ENHANCED: Pexels with contextual scoring
    async searchPexelsEnhanced(searchTerms, context) {
        const accessKey = process.env.PEXELS_API_KEY;
        if (!accessKey) {
            console.log('⚠️ Pexels API key not found');
            return { success: false, options: [] };
        }

        try {
            const allOptions = [];

            for (const term of searchTerms.slice(0, 3)) {
                console.log(`🔍 Enhanced Pexels search: "${term}"`);

                const response = await fetch(
                    `https://api.pexels.com/v1/search?query=${encodeURIComponent(term + ' food homemade')}&per_page=8&orientation=landscape`,
                    { headers: { 'Authorization': accessKey } }
                );

                if (!response.ok) continue;

                const data = await response.json();

                if (data.photos && data.photos.length > 0) {
                    for (let i = 0; i < Math.min(data.photos.length, 3); i++) {
                        const photo = data.photos[i];

                        const score = this.calculateEnhancedScore(photo, term, context, 'pexels');

                        allOptions.push({
                            url: photo.src.large,
                            thumbnail: photo.src.medium,
                            score: score.overall,
                            confidence: score.confidence,
                            relevance: score.relevance,
                            reason: score.reason,
                            approved: score.overall >= this.scoreThreshold && score.confidence >= this.confidenceThreshold,
                            source: "pexels_enhanced",
                            description: photo.alt || `${term} image`,
                            attribution: {
                                photographer: photo.photographer,
                                source: "Pexels"
                            },
                            searchTerm: term,
                            tags: this.generateSmartTags(photo, context),
                            matchedElements: score.matchedElements,
                            ranking: i + 1
                        });
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 500));
            }

            console.log(`🥈 Pexels Enhanced found ${allOptions.length} options`);
            return {
                success: allOptions.length > 0,
                options: allOptions,
                autoApproved: allOptions.find(opt => opt.approved) || null
            };

        } catch (error) {
            console.error('Enhanced Pexels search error:', error);
            return { success: false, options: [] };
        }
    }

    // ENHANCED: Calculate contextual relevance score
    calculateEnhancedScore(photo, searchTerm, context, source = 'pexels') {
        let relevanceScore = 0.5;
        let confidenceScore = 0.6;
        let reason = '';
        const matchedElements = [];

        const description = source === 'google'
            ? (photo.title || photo.snippet || '').toLowerCase()
            : (photo.alt || '').toLowerCase();

        const searchWords = searchTerm.toLowerCase().split(' ');
        const recipeTitle = context.title;

        // Basic term matching
        let matchCount = 0;
        for (const word of searchWords) {
            if (description.includes(word)) {
                matchCount++;
                relevanceScore += 0.1;
                matchedElements.push(word);
            }
        }

        // Context-based bonuses

        // Key ingredient matching
        for (const ingredient of context.keyIngredients) {
            if (description.includes(ingredient)) {
                relevanceScore += 0.15;
                matchedElements.push(ingredient);
                reason += `${ingredient} match, `;
            }
        }

        // Cooking method matching
        for (const method of context.cookingMethods) {
            const methodWord = method.replace('-', ' ');
            if (description.includes(methodWord)) {
                relevanceScore += 0.1;
                matchedElements.push(methodWord);
                reason += `${methodWord} cooking, `;
            }
        }

        // Descriptor matching
        for (const descriptor of context.descriptors) {
            if (description.includes(descriptor)) {
                relevanceScore += 0.08;
                matchedElements.push(descriptor);
                reason += `${descriptor} style, `;
            }
        }

        // Dietary matching
        if (context.isVegan) {
            if (description.includes('meat') || description.includes('dairy') || description.includes('cheese')) {
                relevanceScore -= 0.3;
                reason += 'contains non-vegan elements, ';
            } else if (description.includes('vegan') || description.includes('plant')) {
                relevanceScore += 0.2;
                matchedElements.push('vegan');
                reason += 'vegan-friendly, ';
            }
        }

        // Specific dish matching
        if (recipeTitle.includes('alfredo') && description.includes('alfredo')) {
            relevanceScore += 0.25;
            matchedElements.push('alfredo');
            reason += 'exact dish match, ';
        }
        if (recipeTitle.includes('lasagna') && description.includes('lasagna')) {
            relevanceScore += 0.25;
            matchedElements.push('lasagna');
            reason += 'exact dish match, ';
        }

        // Food relevance bonus
        const foodKeywords = ['food', 'dish', 'meal', 'recipe', 'cooking', 'delicious', 'homemade'];
        const foodMatches = foodKeywords.filter(keyword => description.includes(keyword)).length;
        relevanceScore += foodMatches * 0.05;

        // Source-based confidence adjustments
        if (source === 'google') {
            confidenceScore += 0.2; // Google Images bonus
        } else if (source === 'pexels') {
            confidenceScore += 0.1; // Pexels food specialty bonus
        }

        confidenceScore += matchCount * 0.05;

        // Quality penalties
        const badKeywords = ['person', 'people', 'restaurant exterior', 'menu', 'text', 'logo'];
        const badMatches = badKeywords.filter(keyword => description.includes(keyword)).length;
        relevanceScore -= badMatches * 0.15;

        const overallScore = (relevanceScore * 0.6 + confidenceScore * 0.4);

        if (!reason) {
            reason = `${matchCount}/${searchWords.length} terms matched`;
        }

        return {
            relevance: Math.max(0, Math.min(1, relevanceScore)),
            confidence: Math.max(0, Math.min(1, confidenceScore)),
            overall: Math.max(0, Math.min(1, overallScore)),
            reason: reason.trim().replace(/,$/, ''),
            matchedElements: [...new Set(matchedElements)]
        };
    }

    generateSmartTags(photo, context) {
        const tags = ['food', 'recipe'];

        // Add context-based tags
        tags.push(...context.keyIngredients);
        tags.push(...context.descriptors.slice(0, 2));

        if (context.isVegan) tags.push('vegan');
        if (context.isVegetarian) tags.push('vegetarian');

        tags.push(...context.cuisineStyle);

        return [...new Set(tags)];
    }

    async processRecipeWithEnhancedAI(recipe, options = {}) {
        try {
            // Check if recipe already has images
            if (this.hasExistingImage(recipe)) {
                return {
                    success: false,
                    error: 'Recipe already has images - skipped by AI analysis',
                    skipped: true
                };
            }

            // Extract enhanced context
            const context = this.extractRecipeContext(recipe);
            const searchTerms = this.buildContextualSearchTerms(context);

            console.log(`🔍 Enhanced AI processing for: "${recipe.title}"`);

            // Search multiple sources with enhanced scoring
            const [googleResult, pexelsResult] = await Promise.all([
                this.searchGoogleImagesEnhanced(searchTerms, context),
                this.searchPexelsEnhanced(searchTerms, context)
            ]);

            // Combine results with Google priority
            const allOptions = [
                ...(googleResult.options || []),
                ...(pexelsResult.options || [])
            ];

            // Sort by overall score
            allOptions.sort((a, b) => b.score - a.score);

            // Find auto-approved option
            const autoApproved = allOptions.find(opt => opt.approved);

            console.log(`📊 Enhanced AI found ${allOptions.length} options for "${recipe.title}"`);
            console.log(`🎯 Auto-approved: ${autoApproved ? 'Yes' : 'No'} (threshold: ${this.scoreThreshold})`);

            if (!allOptions.length) {
                return {
                    success: false,
                    error: 'No suitable images found by enhanced AI analysis'
                };
            }

            if (options.returnAllOptions) {
                return {
                    success: true,
                    allOptions: allOptions.slice(0, this.maxResults),
                    autoApproved: autoApproved,
                    needsReview: !autoApproved && allOptions.length > 0,
                    enhancedAIUsed: true,
                    context: context
                };
            }

            // For automatic processing, use auto-approved or best option
            const selectedImage = autoApproved || allOptions[0];

            return {
                success: true,
                imageData: {
                    url: selectedImage.url,
                    attribution: `${selectedImage.attribution.photographer} from ${selectedImage.attribution.source}`,
                    source: selectedImage.source,
                    searchTerms: [selectedImage.searchTerm],
                    aiScore: selectedImage.relevance,
                    aiConfidence: selectedImage.confidence,
                    qualityScore: selectedImage.score,
                    overallScore: selectedImage.score,
                    aiReason: selectedImage.reason,
                    aiTags: selectedImage.tags,
                    description: selectedImage.description,
                    autoApproved: selectedImage.approved,
                    needsReview: !selectedImage.approved,
                    enhancedAIUsed: true,
                    matchedElements: selectedImage.matchedElements,
                    recipeContext: context
                },
                allOptions: allOptions.slice(0, this.maxResults)
            };

        } catch (error) {
            console.error(`Error in enhanced AI processing:`, error);
            return {
                success: false,
                error: error.message || 'Unknown enhanced AI processing error'
            };
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export async function POST(request) {
    try {
        const {
            specificRecipes = [],
            dryRun = false,
            limit = 20,
            scoreThreshold = 0.9,
            confidenceThreshold = 0.7,
            maxResults = 20,
            returnAllOptions = false,
            action = 'process'
        } = await request.json();

        console.log('🧠 Starting Enhanced AI image processing (Local + Smart Context)...');
        console.log(`📊 Thresholds - Score: ${scoreThreshold}, Confidence: ${confidenceThreshold}`);

        await connectDB();

        let query = {};
        if (specificRecipes.length > 0) {
            query.title = { $in: specificRecipes };
            console.log(`🎯 Targeting ${specificRecipes.length} specific recipes`);
        } else {
            // Same comprehensive filtering as before
            query = {
                $and: [
                    {
                        $or: [
                            { primaryPhoto: { $exists: false } },
                            { primaryPhoto: null },
                            { hasPhotos: { $ne: true } }
                        ]
                    },
                    {
                        $or: [
                            { 'uploadedImage.data': { $exists: false } },
                            { 'uploadedImage.data': null },
                            { 'uploadedImage.data': '' }
                        ]
                    },
                    {
                        $or: [
                            { 'extractedImage.data': { $exists: false } },
                            { 'extractedImage.data': null },
                            { 'extractedImage.data': '' }
                        ]
                    },
                    {
                        $or: [
                            { imageUrl: { $exists: false } },
                            { imageUrl: null },
                            { imageUrl: '' },
                            { imageUrl: '/images/recipe-placeholder.jpg' }
                        ]
                    },
                    {
                        $or: [
                            { photos: { $exists: false } },
                            { photos: { $size: 0 } }
                        ]
                    },
                    { isPublic: true },
                    {
                        $or: [
                            { needsManualImage: { $exists: false } },
                            { needsManualImage: false }
                        ]
                    },
                    {
                        $or: [
                            { imageSource: { $ne: 'placeholder' } },
                            { imageSource: { $exists: false } }
                        ]
                    }
                ]
            };
        }

        // Fetch recipes with comprehensive image detection
        const recipes = await Recipe.find(query)
            .select('title category tags primaryPhoto hasPhotos uploadedImage extractedImage imageUrl photos imagePriority description ingredients')
            .limit(limit)
            .lean();

        console.log(`📊 Found ${recipes.length} recipes for Enhanced AI analysis`);

        // Double-check to ensure no recipes with images slip through
        const recipesNeedingImages = recipes.filter(recipe => {
            const aiProcessor = new EnhancedAIImageProcessor();
            return !aiProcessor.hasExistingImage(recipe);
        });

        console.log(`📊 After double-check: ${recipesNeedingImages.length} recipes confirmed need images`);

        const results = {
            success: 0,
            failed: 0,
            needsReview: 0,
            skipped: recipes.length - recipesNeedingImages.length,
            total: recipesNeedingImages.length,
            processed: [],
            enhancedAIUsed: 0,
            contextualMatches: 0
        };

        const aiProcessor = new EnhancedAIImageProcessor({
            scoreThreshold,
            confidenceThreshold,
            maxResults
        });

        if (dryRun || action === 'analyze') {
            console.log('🧪 ANALYSIS MODE - Finding image options using Enhanced AI with contextual scoring');

            for (const recipe of recipesNeedingImages) {
                try {
                    const result = await aiProcessor.processRecipeWithEnhancedAI(recipe, { returnAllOptions: true });

                    if (result.success) {
                        results.enhancedAIUsed++;
                        if (result.autoApproved && result.autoApproved.matchedElements?.length > 0) {
                            results.contextualMatches++;
                        }

                        results.processed.push({
                            title: recipe.title,
                            status: result.autoApproved ? 'auto_approved' : 'needs_review',
                            hasAutoApproved: !!result.autoApproved,
                            optionCount: result.allOptions.length,
                            autoApprovedScore: result.autoApproved?.score || null,
                            bestScore: result.allOptions[0]?.score || null,
                            options: result.allOptions.map(opt => ({
                                url: opt.url,
                                thumbnail: opt.thumbnail,
                                score: opt.score,
                                confidence: opt.confidence,
                                reason: opt.reason,
                                approved: opt.approved,
                                source: opt.source,
                                description: opt.description,
                                matchedElements: opt.matchedElements || []
                            })),
                            category: recipe.category,
                            hasDescription: !!recipe.description,
                            ingredientCount: Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0,
                            enhancedAIUsed: true,
                            recipeContext: {
                                keyIngredients: result.context?.keyIngredients || [],
                                cookingMethods: result.context?.cookingMethods || [],
                                cuisineStyle: result.context?.cuisineStyle || [],
                                descriptors: result.context?.descriptors || [],
                                dietary: result.context?.isVegan ? 'Vegan' : result.context?.isVegetarian ? 'Vegetarian' : 'Regular'
                            }
                        });

                        if (result.autoApproved) {
                            results.success++;
                        } else {
                            results.needsReview++;
                        }
                    } else if (result.skipped) {
                        console.log(`⏭️ Skipped recipe with existing images: "${recipe.title}"`);
                        results.skipped++;
                    } else {
                        results.failed++;
                        results.processed.push({
                            title: recipe.title,
                            status: 'analysis_failed',
                            error: result.error
                        });
                    }

                    await aiProcessor.sleep(1500); // Shorter delay for enhanced local processing

                } catch (error) {
                    console.error(`Enhanced AI analysis error for ${recipe.title}:`, error);
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
                dryRun: true,
                results,
                thresholds: { scoreThreshold, confidenceThreshold },
                enhancedStats: {
                    enhancedAIUsed: results.enhancedAIUsed,
                    contextualMatches: results.contextualMatches,
                    contextualMatchRate: results.enhancedAIUsed > 0 ? (results.contextualMatches / results.enhancedAIUsed * 100) : 0,
                    avgOptionsPerRecipe: results.processed.length > 0 ? (results.processed.reduce((sum, item) => sum + (item.optionCount || 0), 0) / results.processed.length) : 0
                },
                message: `Enhanced AI analysis complete: ${results.success} auto-approved, ${results.needsReview} need review, ${results.failed} failed, ${results.skipped} already have images. Contextual matches: ${results.contextualMatches}/${results.enhancedAIUsed}`
            });
        }

        // Actual processing with Enhanced AI
        for (const recipe of recipesNeedingImages) {
            try {
                console.log(`\n🤖 Enhanced AI processing: "${recipe.title}"`);

                const result = await aiProcessor.processRecipeWithEnhancedAI(recipe);

                if (result.success) {
                    results.enhancedAIUsed++;
                    if (result.imageData.matchedElements?.length > 0) {
                        results.contextualMatches++;
                    }

                    // Only update if auto-approved or score is above threshold
                    const shouldUpdate = result.imageData.autoApproved ||
                        (result.imageData.overallScore >= scoreThreshold &&
                            result.imageData.aiConfidence >= confidenceThreshold);

                    if (shouldUpdate) {
                        await Recipe.findByIdAndUpdate(recipe._id, {
                            imageUrl: result.imageData.url,
                            imageAttribution: result.imageData.attribution,
                            imageSource: result.imageData.source,
                            imageSearchTerms: result.imageData.searchTerms.join(', '),
                            aiRelevanceScore: result.imageData.aiScore,
                            aiConfidence: result.imageData.aiConfidence,
                            aiQualityScore: result.imageData.qualityScore,
                            aiOverallScore: result.imageData.overallScore,
                            aiReason: result.imageData.aiReason,
                            aiTags: result.imageData.aiTags,
                            aiAutoApproved: result.imageData.autoApproved,
                            enhancedAIUsed: result.imageData.enhancedAIUsed,
                            matchedElements: result.imageData.matchedElements,
                            recipeContext: result.imageData.recipeContext,
                            hasUserImage: false,
                            imagePriority: 'external_url',
                            'imageMetadata.primarySource': 'external_url',
                            'imageMetadata.lastUpdated': new Date(),
                            $inc: { 'imageMetadata.updateCount': 1 },
                            lastImageUpdate: new Date(),
                            processingMethod: 'enhanced_ai_local',
                            updatedAt: new Date()
                        });

                        results.success++;
                        results.processed.push({
                            title: recipe.title,
                            status: 'ai_success',
                            source: result.imageData.source,
                            url: result.imageData.url,
                            aiScore: result.imageData.aiScore,
                            aiConfidence: result.imageData.aiConfidence,
                            overallScore: result.imageData.overallScore,
                            autoApproved: result.imageData.autoApproved,
                            aiReason: result.imageData.aiReason,
                            description: result.imageData.description,
                            enhancedAIUsed: true,
                            matchedElements: result.imageData.matchedElements,
                            contextualScore: result.imageData.matchedElements?.length || 0
                        });
                    } else {
                        results.needsReview++;
                        results.processed.push({
                            title: recipe.title,
                            status: 'needs_manual_review',
                            bestScore: result.imageData.overallScore,
                            confidence: result.imageData.aiConfidence,
                            reason: 'Scores below threshold - needs manual review',
                            enhancedAIUsed: true,
                            matchedElements: result.imageData.matchedElements,
                            options: result.allOptions?.slice(0, 3).map(opt => ({
                                url: opt.url,
                                score: opt.score,
                                reason: opt.reason,
                                matchedElements: opt.matchedElements
                            }))
                        });
                    }
                } else if (result.skipped) {
                    results.skipped++;
                } else {
                    results.failed++;
                    results.processed.push({
                        title: recipe.title,
                        status: 'ai_failed',
                        error: result.error
                    });
                }

                await aiProcessor.sleep(aiProcessor.delay);

            } catch (error) {
                console.error(`Enhanced AI processing error for ${recipe.title}:`, error);
                results.failed++;
                results.processed.push({
                    title: recipe.title,
                    status: 'processing_error',
                    error: error.message
                });
            }
        }

        return NextResponse.json({
            success: true,
            results,
            thresholds: { scoreThreshold, confidenceThreshold },
            enhancedStats: {
                enhancedAIUsed: results.enhancedAIUsed,
                contextualMatches: results.contextualMatches,
                contextualMatchRate: results.enhancedAIUsed > 0 ? (results.contextualMatches / results.enhancedAIUsed * 100) : 0,
                avgScoreImprovement: results.contextualMatches > 0 ? 'Significant contextual improvements detected' : 'Standard scoring applied'
            },
            message: `Enhanced AI processing complete: ${results.success} auto-approved, ${results.needsReview} need review, ${results.failed} failed, ${results.skipped} already have images. Enhanced AI used: ${results.enhancedAIUsed}, Contextual matches: ${results.contextualMatches}`
        });

    } catch (error) {
        console.error('Enhanced AI image processing error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}