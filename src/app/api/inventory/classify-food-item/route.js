// /pages/api/classify-food-item.js
import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Category list, moved from client-side
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

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { itemName, existingCategory = "", context = "" } = req.body;

    try {
        const categories = getExistingCategories().join(', ');

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

Use these categories: ${categories}
    `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 300,
        });

        let result = response.choices[0].message.content.trim();

        if (result.startsWith("```json")) {
            result = result.replace("```json", "").replace("```", "").trim();
        }

        return res.status(200).json(JSON.parse(result));
    } catch (error) {
        console.error("AI classification error:", error);
        return res.status(200).json({
            category: existingCategory || "Other",
            storage_location: "pantry",
            confidence: 0.1,
            reasoning: "AI classification failed, using fallback",
        });
    }
}
