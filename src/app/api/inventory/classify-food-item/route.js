// /pages/api/classify-food-item.js
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Category list for food classification
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

export async function POST(request) {
    try {
        const { itemName, existingCategory = "", context = "" } = await request.json();

        if (!itemName) {
            return NextResponse.json({
                error: 'Item name is required'
            }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY) {
            // Fallback without AI
            return NextResponse.json({
                category: existingCategory || "Other",
                storage_location: "pantry",
                confidence: 0.1,
                reasoning: "OpenAI API key not configured, using fallback",
            });
        }

        const categories = getExistingCategories().join(', ');

        const prompt = `
Classify this food item:

Item: "${itemName}"
Current Category: "${existingCategory}"
Context: "${context}"

Return JSON only (no markdown):
{
  "category": "Best category from the provided list",
  "storage_location": "pantry|fridge|fridge-freezer|deep-freezer|kitchen",
  "confidence": 0.95,
  "reasoning": "Why this classification"
}

Available categories: ${categories}
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 300,
        });

        let result = response.choices[0].message.content.trim();

        // Clean up markdown formatting if present
        if (result.startsWith("```json")) {
            result = result.replace("```json", "").replace("```", "").trim();
        }

        const classification = JSON.parse(result);

        return NextResponse.json(classification);

    } catch (error) {
        console.error("AI classification error:", error);

        // Return fallback classification
        return NextResponse.json({
            category: "Other",
            storage_location: "pantry",
            confidence: 0.1,
            reasoning: "AI classification failed, using fallback",
        });
    }
}