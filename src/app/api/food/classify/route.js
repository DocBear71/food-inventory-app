// file: src/app/api/food/classify/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Food classification API route
export async function POST(request) {
    try {
        // Authenticate user
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { itemName, productDetails, usdaData, context } = await request.json();

        if (!itemName) {
            return NextResponse.json(
                { error: 'Item name is required' },
                { status: 400 }
            );
        }

        console.log(`🔍 Classifying food item: ${itemName}`);

        // Prepare context for AI
        const contextInfo = [
            `Item Name: ${itemName}`,
            productDetails ? `Product Details: ${productDetails}` : '',
            usdaData ? `USDA Data: ${JSON.stringify(usdaData)}` : '',
            context ? `Additional Context: ${context}` : ''
        ].filter(Boolean).join('\n');

        const prompt = `
        Classify this food item and determine its optimal storage and categorization:

        ${contextInfo}

        Analyze and return JSON with this exact structure:
        {
            "classification": {
                "category": "fresh_produce|dairy|meat|frozen|pantry|bakery|beverages|snacks|condiments|prepared_foods",
                "subcategory": "specific subcategory within main category",
                "storage_location": "fridge|freezer|pantry|counter",
                "confidence_score": 0.95
            },
            "storage_info": {
                "optimal_temperature": "refrigerated|frozen|room_temperature",
                "estimated_shelf_life_days": 7,
                "storage_tips": ["Keep in original packaging", "Store in crisper drawer"],
                "spoilage_indicators": ["Brown spots", "Soft texture", "Off smell"]
            },
            "nutritional_category": {
                "primary_macronutrient": "protein|carbohydrate|fat|mixed",
                "dietary_flags": ["organic", "gluten_free", "vegan", "low_sodium"],
                "allergen_warnings": ["contains_dairy", "contains_nuts", "contains_gluten"]
            },
            "ai_analysis": {
                "reasoning": "Brief explanation of classification decision",
                "alternatives": ["Alternative category if uncertain"],
                "confidence_factors": ["Factors that influenced confidence score"]
            }
        }

        Classification Guidelines:
        - fresh_produce: fruits, vegetables, herbs
        - dairy: milk, cheese, yogurt, butter
        - meat: fresh meat, poultry, fish, deli meats
        - frozen: frozen vegetables, frozen meals, ice cream
        - pantry: canned goods, dry goods, spices, oils
        - bakery: bread, pastries, cakes
        - beverages: juices, sodas, water
        - snacks: chips, crackers, nuts
        - condiments: sauces, dressings, spreads
        - prepared_foods: ready-to-eat meals, leftovers

        Storage Locations:
        - fridge: items needing refrigeration (32-40°F)
        - freezer: items needing freezing (0°F or below)
        - pantry: dry storage items
        - counter: items best at room temperature

        Return ONLY valid JSON.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1, // Low temperature for consistent classification
            max_tokens: 1000
        });

        let result = response.choices[0].message.content.trim();

        // Clean up response
        if (result.startsWith("```json")) {
            result = result.replace("```json", "").replace("```", "").trim();
        }

        const classification = JSON.parse(result);

        // Validate classification
        const validCategories = [
            'fresh_produce', 'dairy', 'meat', 'frozen', 'pantry',
            'bakery', 'beverages', 'snacks', 'condiments', 'prepared_foods'
        ];

        const validStorageLocations = ['fridge', 'freezer', 'pantry', 'counter'];

        if (!validCategories.includes(classification.classification.category)) {
            classification.classification.category = 'pantry'; // Safe default
            classification.classification.confidence_score = Math.min(classification.classification.confidence_score, 0.5);
        }

        if (!validStorageLocations.includes(classification.classification.storage_location)) {
            classification.classification.storage_location = 'pantry'; // Safe default
            classification.classification.confidence_score = Math.min(classification.classification.confidence_score, 0.5);
        }

        // Add processing metadata
        classification.processing_info = {
            processed_at: new Date().toISOString(),
            model_used: "gpt-4o-mini",
            processing_time_ms: Date.now() - Date.now(), // Simplified
            input_context_length: contextInfo.length,
            fallback_used: false
        };

        console.log(`✅ Classification complete: ${classification.classification.category} (${classification.classification.confidence_score})`);

        return NextResponse.json({
            success: true,
            data: classification
        });

    } catch (error) {
        console.error('Food classification error:', error);

        // Fallback classification based on keywords
        const fallbackClassification = getFallbackClassification(itemName);

        return NextResponse.json({
            success: true,
            data: {
                ...fallbackClassification,
                processing_info: {
                    processed_at: new Date().toISOString(),
                    model_used: "fallback_rules",
                    fallback_used: true,
                    fallback_reason: error.message
                }
            }
        });
    }
}

// Fallback classification using keyword matching
function getFallbackClassification(itemName) {
    const name = itemName.toLowerCase();

    // Define keyword patterns for classification
    const patterns = {
        fresh_produce: [
            'apple', 'banana', 'orange', 'lettuce', 'tomato', 'carrot', 'onion',
            'potato', 'broccoli', 'spinach', 'bell pepper', 'cucumber', 'avocado'
        ],
        dairy: [
            'milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage cheese'
        ],
        meat: [
            'chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'ham', 'bacon', 'sausage'
        ],
        frozen: [
            'frozen', 'ice cream', 'popsicle', 'frozen pizza', 'frozen vegetables'
        ],
        bakery: [
            'bread', 'bagel', 'muffin', 'croissant', 'cake', 'cookies', 'pastry'
        ],
        beverages: [
            'juice', 'soda', 'water', 'coffee', 'tea', 'energy drink', 'beer', 'wine'
        ]
    };

    // Check patterns
    for (const [category, keywords] of Object.entries(patterns)) {
        if (keywords.some(keyword => name.includes(keyword))) {
            const storageMap = {
                fresh_produce: name.includes('potato') || name.includes('onion') ? 'pantry' : 'fridge',
                dairy: 'fridge',
                meat: 'fridge',
                frozen: 'freezer',
                bakery: 'counter',
                beverages: name.includes('juice') || name.includes('milk') ? 'fridge' : 'pantry'
            };

            return {
                classification: {
                    category: category,
                    subcategory: 'general',
                    storage_location: storageMap[category] || 'pantry',
                    confidence_score: 0.7
                },
                storage_info: {
                    optimal_temperature: storageMap[category] === 'fridge' ? 'refrigerated' :
                        storageMap[category] === 'freezer' ? 'frozen' : 'room_temperature',
                    estimated_shelf_life_days: category === 'fresh_produce' ? 7 :
                        category === 'dairy' ? 14 :
                            category === 'meat' ? 3 : 30,
                    storage_tips: [`Store in ${storageMap[category] || 'pantry'}`],
                    spoilage_indicators: ['Check expiration date', 'Look for visible spoilage']
                },
                nutritional_category: {
                    primary_macronutrient: category === 'meat' ? 'protein' :
                        category === 'fresh_produce' ? 'carbohydrate' : 'mixed',
                    dietary_flags: [],
                    allergen_warnings: []
                },
                ai_analysis: {
                    reasoning: `Classified based on keyword matching for category: ${category}`,
                    alternatives: ['pantry'],
                    confidence_factors: ['Keyword-based classification', 'Fallback method used']
                }
            };
        }
    }

    // Ultimate fallback
    return {
        classification: {
            category: 'pantry',
            subcategory: 'general',
            storage_location: 'pantry',
            confidence_score: 0.3
        },
        storage_info: {
            optimal_temperature: 'room_temperature',
            estimated_shelf_life_days: 30,
            storage_tips: ['Store in cool, dry place'],
            spoilage_indicators: ['Check expiration date']
        },
        nutritional_category: {
            primary_macronutrient: 'mixed',
            dietary_flags: [],
            allergen_warnings: []
        },
        ai_analysis: {
            reasoning: 'No specific pattern matched, using safe defaults',
            alternatives: ['fresh_produce', 'frozen'],
            confidence_factors: ['Unknown item', 'Default classification applied']
        }
    };
}

// Batch classification endpoint
export async function PUT(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { items } = await request.json();

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: 'Items array is required' },
                { status: 400 }
            );
        }

        if (items.length > 50) {
            return NextResponse.json(
                { error: 'Maximum 50 items per batch' },
                { status: 400 }
            );
        }

        console.log(`🔍 Batch classifying ${items.length} items`);

        // Process items in parallel
        const classifications = await Promise.allSettled(
            items.map(async (item, index) => {
                try {
                    // Call the classification logic
                    const itemsText = items.slice(index, index + 1).map(i =>
                        `${i.name}${i.productDetails ? ` - ${i.productDetails}` : ''}`
                    ).join('\n');

                    const prompt = `
                    Classify these food items quickly and efficiently:
                    
                    ${itemsText}
                    
                    Return JSON array with this structure for each item:
                    [
                        {
                            "item_index": 0,
                            "category": "fresh_produce",
                            "storage_location": "fridge",
                            "confidence": 0.9,
                            "shelf_life_days": 7
                        }
                    ]
                    
                    Categories: fresh_produce, dairy, meat, frozen, pantry, bakery, beverages, snacks, condiments, prepared_foods
                    Storage: fridge, freezer, pantry, counter
                    
                    Return ONLY valid JSON array.
                    `;

                    const response = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.1,
                        max_tokens: 500
                    });

                    let result = response.choices[0].message.content.trim();
                    if (result.startsWith("```json")) {
                        result = result.replace("```json", "").replace("```", "").trim();
                    }

                    const batchResult = JSON.parse(result);
                    return batchResult[0] || getFallbackClassification(item.name);

                } catch (error) {
                    console.warn(`Fallback for item ${index}:`, item.name);
                    return getFallbackClassification(item.name);
                }
            })
        );

        const results = classifications.map((result, index) => ({
            original_item: items[index],
            classification: result.status === 'fulfilled' ? result.value : getFallbackClassification(items[index].name),
            success: result.status === 'fulfilled'
        }));

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ Batch classification complete: ${successCount}/${items.length} successful`);

        return NextResponse.json({
            success: true,
            results: results,
            summary: {
                total_items: items.length,
                successful_classifications: successCount,
                fallback_classifications: items.length - successCount
            }
        });

    } catch (error) {
        console.error('Batch classification error:', error);
        return NextResponse.json(
            { error: 'Batch classification failed' },
            { status: 500 }
        );
    }
}