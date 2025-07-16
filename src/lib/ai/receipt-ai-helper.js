// file: src/lib/ai/receipt-ai-helper.js v1
// AI Enhancement functions for your existing receipt scanner

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI-powered enhancement of your existing parseReceiptText function
 * This can be added as an optional enhancement to your current parsing
 */
export async function enhanceReceiptParsingWithAI(rawOcrText, extractedItems, storeContext = "") {
    console.log('🤖 Enhancing receipt parsing with AI...');

    try {
        // Always run full AI parsing for quality comparison
        const aiParsedItems = await aiParseReceiptFromScratch(rawOcrText, storeContext);
        const extractedCount = extractedItems?.length || 0;

        console.log(`🧠 AI parsed ${aiParsedItems.length} items vs OCR extracted ${extractedCount} items`);

        // If original OCR found some items, attempt to enhance them
        let enhancedItems = extractedItems;
        if (extractedCount > 0) {
            enhancedItems = await enhanceExistingItems(extractedItems, rawOcrText);
        }

        // Heuristic: Use AI-parsed if it returns more useful items
        const useAI = aiParsedItems.length > enhancedItems.length + 1;

        if (useAI) {
            console.log("✅ Using AI-parsed results (more complete)");
            return aiParsedItems;
        }

        console.log("✅ Using enhanced OCR results");
        return enhancedItems;

    } catch (error) {
        console.error('AI enhancement failed:', error);
        return extractedItems; // fallback
    }
}


/**
 * Enhance items that your existing parser already found
 */
async function enhanceExistingItems(extractedItems, rawOcrText) {
    const itemsText = extractedItems.map((item, index) =>
        `${index + 1}. "${item.name}" - $${item.price} (${item.quantity || 1} qty) - Raw: "${item.rawText}"`
    ).join('\n');

    const prompt = `
    Enhance these grocery receipt items that were extracted by OCR:

    EXTRACTED ITEMS:
    ${itemsText}

    ORIGINAL OCR TEXT:
    ${rawOcrText}

    Please improve each item by:
    1. Cleaning up the product name (fix OCR errors, proper capitalization)
    2. Suggesting better category classification
    3. Recommending storage location
    4. Detecting any dietary flags (organic, gluten-free, etc.)
    5. Finding any missing quantity information from the OCR text

    Return JSON array with enhanced items:
    [
        {
            "original_index": 1,
            "enhanced_name": "Cleaned product name",
            "suggested_category": "Fresh Produce",
            "suggested_location": "fridge",
            "dietary_flags": ["organic"],
            "confidence": 0.9,
            "improvements_made": ["Fixed OCR errors", "Added category"]
        }
    ]

    Only suggest changes that are clearly better than the original.
    Return ONLY valid JSON array.
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 2000
    });

    let result = response.choices[0].message.content.trim();
    if (result.startsWith("```json")) {
        result = result.replace("```json", "").replace("```", "").trim();
    }

    const aiEnhancements = JSON.parse(result);

    // Apply AI enhancements to original items
    const enhancedItems = extractedItems.map((item, index) => {
        const enhancement = aiEnhancements.find(e => e.original_index === index + 1);

        if (enhancement && enhancement.confidence > 0.7) {
            return {
                ...item,
                name: enhancement.enhanced_name || item.name,
                category: enhancement.suggested_category || item.category,
                location: enhancement.suggested_location || item.location,
                dietaryFlags: enhancement.dietary_flags || [],
                aiEnhanced: true,
                aiConfidence: enhancement.confidence,
                improvementsMade: enhancement.improvements_made || []
            };
        }

        return item;
    });

    console.log(`✅ AI enhanced ${enhancedItems.filter(i => i.aiEnhanced).length}/${extractedItems.length} items`);
    return enhancedItems;
}

/**
 * AI parsing as fallback when your existing parser finds no items
 */
async function aiParseReceiptFromScratch(rawOcrText, storeContext) {
    console.log('🤖 AI parsing receipt from scratch...');

    const prompt = `
    Parse this grocery receipt OCR text into structured items:

    STORE CONTEXT: ${storeContext}
    
    OCR TEXT:
    ${rawOcrText}

    Extract grocery items in JSON format:
    [
        {
            "name": "Product name",
            "price": 2.99,
            "quantity": 1,
            "category": "Fresh Produce",
            "storage_location": "fridge",
            "confidence": 0.85,
            "raw_text": "original OCR line"
        }
    ]

    Guidelines:
    - Only extract actual grocery/food items
    - Skip tax lines, totals, store info, payment methods
    - Clean up OCR errors in product names
    - Assign appropriate categories and storage locations
    - Include confidence score (0.1 to 1.0)

    Return ONLY valid JSON array.
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 2000
    });

    let result = response.choices[0].message.content.trim();
    if (result.startsWith("```json")) {
        result = result.replace("```json", "").replace("```", "").trim();
    }

    const aiItems = JSON.parse(result);

    // Convert to your existing item format
    const formattedItems = aiItems.map(item => ({
        id: Date.now() + Math.random(),
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        unitPrice: item.price / (item.quantity || 1),
        upc: '',
        taxCode: '',
        category: item.category,
        location: item.storage_location,
        rawText: item.raw_text,
        selected: true,
        needsReview: item.confidence < 0.8,
        aiGenerated: true,
        aiConfidence: item.confidence
    }));

    console.log(`✅ AI generated ${formattedItems.length} items from OCR text`);
    return formattedItems;
}

/**
 * Smart category classification for your existing items
 */
export async function aiClassifyFoodItem(itemName, existingCategory = "", context = "") {
    try {
        const prompt = `
        Classify this food item:
        
        Item: "${itemName}"
        Current Category: "${existingCategory}"
        Context: "${context}"
        
        Return JSON:
        {
            "category": "Best category from your existing list",
            "storage_location": "pantry|fridge|fridge-freezer|deep-freezer|kitchen",
            "confidence": 0.95,
            "reasoning": "Why this classification"
        }
        
        Use these categories: ${getExistingCategories().join(', ')}
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 300
        });

        let result = response.choices[0].message.content.trim();
        if (result.startsWith("```json")) {
            result = result.replace("```json", "").replace("```", "").trim();
        }

        return JSON.parse(result);
    } catch (error) {
        console.error('AI classification failed:', error);
        return {
            category: existingCategory || "Other",
            storage_location: "pantry",
            confidence: 0.1,
            reasoning: "AI classification failed, using fallback"
        };
    }
}

/**
 * Get your existing category list
 */
function getExistingCategories() {
    return [
        "Baking & Cooking Ingredients", "Beans", "Beverages", "Bouillon", "Boxed Meals",
        "Breads", "Canned Beans", "Canned Fruit", "Canned Meals", "Canned Meat",
        "Canned Sauces", "Canned Tomatoes", "Canned Vegetables", "Cheese", "Condiments",
        "Dairy", "Eggs", "Fresh Fruits", "Fresh Spices", "Fresh Vegetables",
        "Fresh/Frozen Beef", "Fresh/Frozen Fish & Seafood", "Fresh/Frozen Lamb",
        "Fresh/Frozen Pork", "Fresh/Frozen Poultry", "Fresh/Frozen Rabbit",
        "Fresh/Frozen Venison", "Frozen Fruit", "Frozen Meals", "Frozen Other Items",
        "Frozen Vegetables", "Grains", "Other", "Pasta", "Seasonings", "Snacks",
        "Soups & Soup Mixes", "Spices", "Stock/Broth", "Stuffing & Sides"
    ];
}