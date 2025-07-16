// file: src/lib/ai/receipt-ai-helper.js v1
// AI Enhancement functions for your existing receipt scanner

import {apiPost} from "@/lib/api-config.js";

/**
 * AI-powered enhancement of your existing parseReceiptText function
 * This can be added as an optional enhancement to your current parsing
 */
export async function enhanceReceiptParsingWithAI(rawOcrText, extractedItems, imageFile, storeContext = "") {
    console.log('📡 Sending to Modal for AI receipt enhancement...');
    try {

        let base64ImageString;
        const response = await fetch('https://docbear71--receipt-processor-process-receipt-with-ai.modal.run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageFile: base64ImageString,
                storeContext,
                user_id: "user123",             // Optional user ID if you want to track it
                raw_ocr: rawOcrText,            // Pass the raw OCR text directly
                fallback_items: extractedItems  // Optional
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Modal processing failed');
        }

        // Convert Modal’s format to your frontend’s expected structure if needed
        return result.items;

    } catch (err) {
        console.error('AI enhancement via Modal failed:', err);
        return extractedItems; // Fallback to original OCR results
    }
}

/**
 * Smart category classification for your existing items
 */
export async function aiClassifyFoodItem(itemName, existingCategory = "", context = "") {
    const response = await apiPost('/api/inventory/classifyFoodItem', {
        body: JSON.stringify({ itemName, existingCategory, context }),
    });

    if (!response.ok) {
        throw new Error('Classification API failed');
    }

    return await response.json();
}
