// file: src/lib/ai/receipt-ai-helper.js v1
// AI Enhancement functions for your existing receipt scanner

import { apiPost } from "@/lib/api-config.js";

/**
 * Convert image file/blob to base64 string
 */
async function convertImageToBase64(imageFile) {
    return new Promise((resolve, reject) => {
        if (!imageFile) {
            reject(new Error('No image file provided'));
            return;
        }

        const reader = new FileReader();

        reader.onload = function(event) {
            try {
                // Get the base64 string without the data:image/jpeg;base64, prefix
                const base64String = event.target.result.split(',')[1];
                console.log('✅ Base64 conversion successful, length:', base64String.length);
                resolve(base64String);
            } catch (error) {
                console.error('❌ Base64 conversion failed:', error);
                reject(error);
            }
        };

        reader.onerror = function(error) {
            console.error('❌ FileReader error:', error);
            reject(new Error('Failed to read image file'));
        };

        // Read the file as data URL (base64)
        reader.readAsDataURL(imageFile);
    });
}

/**
 * Enhanced AI-powered receipt parsing with Modal integration
 */
export async function enhanceReceiptParsingWithAI(rawOcrText, extractedItems, imageFile, storeContext = "", userCurrency = null) {
    console.log('📡 Starting AI enhancement via Modal...');

    try {
        let base64ImageString = '';
        if (imageFile) {
            console.log('🖼️ Converting image to base64...');
            base64ImageString = await convertImageToBase64(imageFile);
        }

        // Get user currency preferences from local storage or API
        let currencyInfo = { currency: 'USD', currencySymbol: '$' };
        if (userCurrency) {
            currencyInfo = userCurrency;
        } else {
            try {
                const response = await fetch('/api/user/profile');
                const data = await response.json();
                if (data.user?.currencyPreferences) {
                    currencyInfo = {
                        currency: data.user.currencyPreferences.currency,
                        currencySymbol: data.user.currencyPreferences.currencySymbol
                    };
                }
            } catch (error) {
                console.warn('Could not fetch user currency preferences, using USD default');
            }
        }

        const requestPayload = {
            image_data: base64ImageString,
            store_context: storeContext,
            user_id: "user123",
            raw_ocr: rawOcrText,
            fallback_items: extractedItems,
            // 🆕 ADD CURRENCY SUPPORT
            user_currency: currencyInfo.currency,
            currency_symbol: currencyInfo.currencySymbol
        };

        console.log('📤 Sending request to Modal with currency support:', currencyInfo);

        const response = await fetch('https://docbear71--receipt-processor-process-receipt-with-ai.modal.run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            throw new Error(`Modal API returned ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            console.warn('🔄 Modal processing failed, using fallback items:', result.error);
            // Return enhanced original items with price tracking structure
            return extractedItems.map(item => ({
                ...item,
                priceData: item.price ? {
                    price: item.price,
                    unitPrice: item.unitPrice || item.price,
                    quantity: item.quantity || 1,
                    size: '',
                    unit: 'each',
                    store: extractStoreName(storeContext) || 'Unknown Store',
                    purchaseDate: new Date().toISOString().split('T')[0],
                    isFromReceipt: true
                } : null
            }));
        }

        // Process successful Modal response
        const aiEnhancedItems = result.receipt_data?.items || [];
        console.log(`✅ AI enhancement complete: ${aiEnhancedItems.length} items enhanced`);

        return aiEnhancedItems.map((item, index) => ({
            id: Date.now() + Math.random() + index,
            name: item.name || item.resolved_name || `Unknown Item ${index + 1}`,
            price: parseFloat(item.total_price) || parseFloat(item.unit_price) || 0,
            quantity: parseInt(item.quantity) || 1,
            unitPrice: parseFloat(item.unit_price) || parseFloat(item.total_price) || 0,
            upc: item.upc || '',
            taxCode: '',
            category: item.category || guessCategory(item.name),
            location: item.storage_location || guessLocation(item.name),
            brand: item.brand || '',
            rawText: item.original_receipt_text || item.original_text || '',
            selected: true,
            needsReview: item.needs_user_review || item.confidence_score < 0.8,
            confidence: item.confidence_score || 0.7,

            // 🆕 PRICE TRACKING FIELDS
            priceData: {
                price: parseFloat(item.total_price) || parseFloat(item.unit_price) || 0,
                unitPrice: parseFloat(item.unit_price) || 0,
                quantity: parseInt(item.quantity) || 1,
                size: item.size_info || '',
                unit: extractUnit(item.size_info) || 'each',
                store: extractStoreName(storeContext) || 'Unknown Store',
                purchaseDate: item.purchase_date || new Date().toISOString().split('T')[0],
                isFromReceipt: true
            }
        }));

    } catch (error) {
        console.error('❌ AI enhancement via Modal failed:', error);
        console.log('🔄 Falling back to original OCR results');

        // Return original items with enhanced structure
        return extractedItems.map(item => ({
            ...item,
            priceData: item.price ? {
                price: item.price,
                unitPrice: item.unitPrice || item.price,
                quantity: item.quantity || 1,
                size: '',
                unit: 'each',
                store: extractStoreName(storeContext) || 'Unknown Store',
                purchaseDate: new Date().toISOString().split('T')[0],
                isFromReceipt: true
            } : null
        }));
    }
}

/**
 * Helper function to extract store name from context
 */
function extractStoreName(storeContext) {
    if (!storeContext) return 'Unknown Store';

    // Clean up store context to get just the store name
    const storeName = storeContext
        .replace(/store|receipt|scan/gi, '')
        .trim()
        .split(' ')[0]; // Take first word

    return storeName || 'Unknown Store';
}

/**
 * Helper function to extract unit from size info
 */
function extractUnit(sizeInfo) {
    if (!sizeInfo) return 'each';

    const unitPatterns = {
        'oz': /(\d+\.?\d*)\s*oz/i,
        'lb': /(\d+\.?\d*)\s*lb/i,
        'g': /(\d+\.?\d*)\s*g\b/i,
        'kg': /(\d+\.?\d*)\s*kg/i,
        'ml': /(\d+\.?\d*)\s*ml/i,
        'l': /(\d+\.?\d*)\s*l\b/i
    };

    for (const [unit, pattern] of Object.entries(unitPatterns)) {
        if (pattern.test(sizeInfo)) {
            return unit;
        }
    }

    return 'each';
}

/**
 * Fallback category guessing function
 */
function guessCategory(itemName) {
    if (!itemName) return 'Other';

    const name = itemName.toLowerCase();

    if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt')) {
        return 'Dairy';
    }
    if (name.includes('bread') || name.includes('bagel') || name.includes('roll')) {
        return 'Breads';
    }
    if (name.includes('apple') || name.includes('banana') || name.includes('fruit')) {
        return 'Fresh Fruits';
    }
    if (name.includes('lettuce') || name.includes('carrot') || name.includes('vegetable')) {
        return 'Fresh Vegetables';
    }
    if (name.includes('chicken') || name.includes('beef') || name.includes('meat')) {
        return 'Fresh/Frozen Meat';
    }

    return 'Other';
}

/**
 * Fallback location guessing function
 */
function guessLocation(itemName) {
    if (!itemName) return 'pantry';

    const name = itemName.toLowerCase();

    if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt')) {
        return 'fridge';
    }
    if (name.includes('frozen') || name.includes('ice cream')) {
        return 'fridge-freezer';
    }

    return 'pantry';
}

/**
 * Smart category classification for your existing items
 */
export async function aiClassifyFoodItem(itemName, existingCategory = "", context = "") {
    const response = await apiPost('/api/inventory/classify-food-item', {
        itemName,
        existingCategory,
        context
    });

    if (!response.ok) {
        throw new Error('Classification API failed');
    }

    return await response.json();
}