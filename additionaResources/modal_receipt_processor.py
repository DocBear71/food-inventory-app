import json
import os
from typing import Dict, Any, List
import modal
import base64
from PIL import Image
import io
import re

# Create Modal app
app = modal.App("receipt-processor")

# Define the image with dependencies
image = (
    modal.Image.from_registry("python:3.11")
    .pip_install([
        "openai",
        "Pillow",
        "pytesseract",
        "opencv-python-headless",
        "numpy",
        "requests",
        "fastapi[standard]"
    ])
    .run_commands([
        "apt-get update && apt-get install -y tesseract-ocr && rm -rf /var/lib/apt/lists/*"
    ])
)

def enhanced_ocr_processing(image_data):
    """Enhanced OCR processing with preprocessing"""
    try:
        import cv2
        import numpy as np
        import pytesseract
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Preprocessing for better OCR
        gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
        
        # Apply various preprocessing techniques
        # 1. Denoising
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # 2. Contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        # 3. Sharpening
        kernel = np.array([[-1,-1,-1],
                          [-1, 9,-1],
                          [-1,-1,-1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)
        
        # OCR with multiple configurations
        ocr_configs = [
            '--psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$-@()& ',
            '--psm 4 --oem 3',
            '--psm 6 --oem 1'
        ]
        
        results = []
        for config in ocr_configs:
            try:
                text = pytesseract.image_to_string(sharpened, config=config)
                if text.strip():
                    results.append(text)
            except:
                continue
        
        # Return the longest/best result
        if results:
            return max(results, key=len)
        else:
            # Fallback to basic OCR
            return pytesseract.image_to_string(image)
            
    except Exception as e:
        print(f"OCR processing error: {e}")
        return pytesseract.image_to_string(Image.open(io.BytesIO(base64.b64decode(image_data))))

def parse_receipt_structure(ocr_text, store_context=""):
    """AI-powered receipt structure parsing"""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        prompt = f"""
        Analyze this grocery receipt OCR text and extract structured data.
        
        Store Context: {store_context}
        
        Receipt Text:
        {ocr_text}
        
        Parse and return JSON with this exact structure:
        {{
            "store_info": {{
                "name": "Store name",
                "location": "Store address/location", 
                "date": "YYYY-MM-DD",
                "time": "HH:MM",
                "receipt_number": "Receipt/transaction number"
            }},
            "line_items": [
                {{
                    "raw_description": "Original text from receipt",
                    "quantity": 1,
                    "unit": "each",
                    "unit_price": 2.99,
                    "total_price": 2.99,
                    "original_price": 2.99,
                    "discount_amount": 0.00,
                    "discount_description": "",
                    "department": "PRODUCE",
                    "confidence": 0.95
                }}
            ]
            "totals": {{
                "subtotal": 25.67,
                "tax": 2.30,
                "total": 27.97,
                "discounts": 0.00
            }},
            "parsing_flags": [
                "Items that need manual review due to low confidence"
            ]
        }}
        
        Guidelines:
        - Extract ALL items, even unclear ones (mark with low confidence)
        - Parse quantities carefully (2 @ $1.99 = qty 2, unit_price $1.99)
        - Handle weight-based items (1.34 LB @ $4.99/LB)
        - Identify department/category hints
        - Flag items with confidence < 0.8 for review
        - Parse dates in ISO format
        
        DISCOUNT HANDLING RULES:
        - Hy-Vee/Target style: Discounts appear directly below items (item $5.99, next line -$2.00)
        - Sam's Club/Costco style: Discounts grouped at end of receipt ("INSTANT SAVINGS -$15.00")
        - Walmart style: Mix of inline discounts and rollback pricing
        - Associate negative amounts with correct items or store in totals.discounts
        - Common discount patterns: "-$X.XX", "SAVE $X.XX", "INSTANT SV", "COUPON", "ROLLBACK"
        - Circle/Target app discounts often show as separate line items
        - Manufacturer coupons vs store discounts should both be captured
        - If discount placement is unclear, add to totals.discounts and note in parsing_flags
        
        Return ONLY valid JSON.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2000
        )
        
        result = response.choices[0].message.content.strip()
        if result.startswith("```json"):
            result = result.replace("```json", "").replace("```", "").strip()
            
        return json.loads(result)
        
    except Exception as e:
        print(f"Receipt structure parsing error: {e}")
        return None

def resolve_product_names(receipt_items, store_name="", user_currency="USD"):
    """AI-powered product name resolution and categorization with currency support"""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Get currency symbol for the user's currency
        currency_symbols = {
            'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$', 
            'JPY': '¥', 'CHF': 'CHF', 'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr',
            'PLN': 'zł', 'CZK': 'Kč', 'HUF': 'Ft', 'INR': '₹', 'CNY': '¥',
            'KRW': '₩', 'SGD': 'S$', 'HKD': 'HK$', 'THB': '฿', 'PHP': '₱'
        }
        currency_symbol = currency_symbols.get(user_currency, '$')
        
        # Process items in batches of 10
        resolved_items = []
        
        for i in range(0, len(receipt_items), 10):
            batch = receipt_items[i:i+10]
            
            items_text = "\n".join([
                f"{idx+1}. {item['raw_description']} (qty: {item.get('quantity', 1)}, price: {currency_symbol}{item.get('unit_price', 0)})"
                for idx, item in enumerate(batch)
            ])
            
            prompt = f"""
            Resolve these grocery receipt items from {store_name} into standardized products.
            Currency: {user_currency} ({currency_symbol})
            
            {items_text}
            
            For each item, determine:
            1. Standard product name (clear, descriptive)
            2. Category (MUST be one from the provided list)
            3. Storage location (fridge, freezer, pantry, counter)
            4. Brand (if identifiable)
            5. Size/package info
            6. Price data in {user_currency} currency
            
            Return JSON array with this structure including currency-aware pricing:
            [
                {{
                    "item_number": 1,
                    "original_text": "Raw receipt text",
                    "resolved_name": "Clear product name",
                    "category": "Fresh Fruits",
                    "storage_location": "fridge", 
                    "brand": "Brand name or null",
                    "size_info": "Size/weight info",
                    "dietary_flags": ["organic", "gluten-free"],
                    "confidence": 0.92,
                    "needs_review": false,
                    "suggested_alternatives": ["Alternative name 1", "Alternative name 2"],
                    "price_data": {{
                        "currency": "{user_currency}",
                        "currency_symbol": "{currency_symbol}",
                        "unit_price": 2.99,
                        "total_price": 5.98,
                        "quantity": 2
                    }}
                }}
            ]
            
            Return ONLY valid JSON array.
            """
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=2000
            )
            
            result = response.choices[0].message.content.strip()
            if result.startswith("```json"):
                result = result.replace("```json", "").replace("```", "").strip()
                
            batch_resolved = json.loads(result)
            resolved_items.extend(batch_resolved)
            
        return resolved_items
        
    except Exception as e:
        print(f"Product name resolution error: {e}")
        return []

def estimate_shelf_life(product_info):
    """Estimate shelf life based on product category and storage"""
    
    shelf_life_map = {
        "fresh_produce": {
            "fridge": 7,
            "counter": 3,
            "pantry": 5
        },
        "dairy": {
            "fridge": 14,
            "freezer": 30
        },
        "meat": {
            "fridge": 3,
            "freezer": 90
        },
        "frozen": {
            "freezer": 180
        },
        "pantry": {
            "pantry": 365,
            "counter": 365
        },
        "bakery": {
            "counter": 3,
            "freezer": 30
        }
    }
    
    category = product_info.get("category", "pantry")
    storage = product_info.get("storage_location", "pantry")
    
    return shelf_life_map.get(category, {}).get(storage, 30)

@app.function(
    image=image,
    timeout=300,  # 5 minutes
    memory=2048,  # 2GB
    secrets=[modal.Secret.from_name("openai-api-key")]
)
@modal.fastapi_endpoint(method="POST")
def process_receipt_with_ai(item: dict) -> Dict[str, Any]:
    """Process receipt image with AI-powered parsing - Enhanced for missing image_data"""
    
    try:
        # Extract parameters
        image_data = item.get("image_data")  # base64 encoded image
        store_context = item.get("store_context", "")
        user_id = item.get("user_id")
        raw_ocr = item.get("raw_ocr", "")  # 🆕 NEW: Accept pre-processed OCR text
        fallback_items = item.get("fallback_items", [])  # 🆕 NEW: Fallback items
        user_currency = item.get("user_currency", "USD")
        currency_symbol = item.get("currency_symbol", "$")
        
        print(f"🧾 Processing receipt for user: {user_id}")
        print(f"📊 Input data: image_data={len(image_data) if image_data else 0} chars, raw_ocr={len(raw_ocr) if raw_ocr else 0} chars")
        print(f"🧾 Processing receipt for user currency: {user_currency} ({currency_symbol})")
        
        
        # 🆕 ENHANCED LOGIC: Handle missing image_data gracefully
        if not image_data and not raw_ocr:
            return {
                "success": False,
                "error": "Either image_data (base64) or raw_ocr text is required",
                "fallback_items": fallback_items
            }
        
        if not os.getenv("OPENAI_API_KEY"):
            return {
                "success": False,
                "error": "OpenAI API key not configured",
                "fallback_items": fallback_items
            }
        
        # 🆕 STEP 1: OCR Processing (skip if raw_ocr provided)
        if raw_ocr:
            print("📝 Using provided OCR text, skipping image processing")
            ocr_text = raw_ocr
        else:
            print("📖 Performing enhanced OCR on image...")
            ocr_text = enhanced_ocr_processing(image_data)
            
            if not ocr_text or len(ocr_text.strip()) < 20:
                return {
                    "success": False,
                    "error": "Could not extract text from receipt image. Please ensure the image is clear and well-lit.",
                    "ocr_length": len(ocr_text) if ocr_text else 0,
                    "fallback_items": fallback_items
                }
        
        print(f"✅ OCR complete: {len(ocr_text)} characters extracted")
        
        # STEP 2: Parse receipt structure (existing code continues...)
        print("🧠 Parsing receipt structure with AI...")
        receipt_structure = parse_receipt_structure(ocr_text, store_context)
        
        if not receipt_structure:
            return {
                "success": False,
                "error": "Failed to parse receipt structure",
                "raw_ocr": ocr_text[:500] + "..." if len(ocr_text) > 500 else ocr_text,
                "fallback_items": fallback_items
            }
        
        line_items = receipt_structure.get("line_items", [])
        print(f"📝 Found {len(line_items)} line items")
        
        # If no items found, return fallback
        if len(line_items) == 0 and fallback_items:
            print("⚠️ No AI items found, using fallback items")
            return {
                "success": True,
                "receipt_data": {
                    "store_info": receipt_structure.get("store_info", {}),
                    "totals": receipt_structure.get("totals", {}),
                    "items": fallback_items,  # Use fallback items
                    "processing_summary": {
                        "total_items": len(fallback_items),
                        "ai_enhanced": False,
                        "fallback_used": True,
                        "ocr_text_length": len(ocr_text),
                        "processing_method": "fallback_items"
                    }
                },
                "confidence_breakdown": {
                    "auto_add_items": fallback_items,
                    "review_recommended": []
                },
                "raw_data": {
                    "ocr_text": ocr_text,
                    "parsing_flags": ["Used fallback items due to parsing issues"]
                }
            }
        
        # STEP 3: Continue with existing logic for product name resolution...
        print("🔍 Resolving product names...")
        resolved_items = resolve_product_names(
            line_items, 
            receipt_structure.get("store_info", {}).get("name", ""),
            user_currency
        )
        
        # STEP 4: Rest of existing logic...
        final_items = []
        
        for resolved_item in resolved_items:
            # Estimate shelf life
            shelf_life_days = estimate_shelf_life(resolved_item)
            
            # Prepare final item structure
            final_item = {
                "name": resolved_item.get("resolved_name"),
                "original_receipt_text": resolved_item.get("original_text"),
                "category": resolved_item.get("category"),
                "storage_location": resolved_item.get("storage_location"),
                "brand": resolved_item.get("brand"),
                "size_info": resolved_item.get("size_info"),
                "dietary_flags": resolved_item.get("dietary_flags", []),
                "estimated_shelf_life_days": shelf_life_days,
                "confidence_score": resolved_item.get("confidence"),
                "needs_user_review": resolved_item.get("needs_review", False),
                "suggested_alternatives": resolved_item.get("suggested_alternatives", []),
                
                # Receipt-specific data
                "quantity": line_items[resolved_item.get("item_number", 1) - 1].get("quantity", 1),
                "unit_price": line_items[resolved_item.get("item_number", 1) - 1].get("unit_price"),
                "total_price": line_items[resolved_item.get("item_number", 1) - 1].get("total_price"),
                "original_price": line_items[resolved_item.get("item_number", 1) - 1].get("original_price"),
                "discount_amount": line_items[resolved_item.get("item_number", 1) - 1].get("discount_amount", 0.00),
                "discount_description": line_items[resolved_item.get("item_number", 1) - 1].get("discount_description", ""),
                "purchase_date": receipt_structure.get("store_info", {}).get("date")
                }
            
            final_items.append(final_item)
        
        # STEP 5: Return successful result
        high_confidence = [item for item in final_items if item["confidence_score"] >= 0.9]
        medium_confidence = [item for item in final_items if 0.7 <= item["confidence_score"] < 0.9]
        low_confidence = [item for item in final_items if item["confidence_score"] < 0.7]
        
        print(f"✅ Receipt processing complete!")
        print(f"   High confidence: {len(high_confidence)} items")
        print(f"   Medium confidence: {len(medium_confidence)} items") 
        print(f"   Low confidence: {len(low_confidence)} items")
        
        return {
            "success": True,
            "receipt_data": {
                "store_info": receipt_structure.get("store_info"),
                "totals": receipt_structure.get("totals"),
                "items": final_items,
                "processing_summary": {
                    "total_items": len(final_items),
                    "high_confidence_items": len(high_confidence),
                    "medium_confidence_items": len(medium_confidence),
                    "low_confidence_items": len(low_confidence),
                    "items_needing_review": len([item for item in final_items if item["needs_user_review"]]),
                    "ocr_text_length": len(ocr_text),
                    "processing_method": "ai_enhanced"
                }
            },
            "confidence_breakdown": {
                "auto_add_items": high_confidence,
                "review_recommended": medium_confidence + low_confidence
            },
            "raw_data": {
                "ocr_text": ocr_text,
                "parsing_flags": receipt_structure.get("parsing_flags", [])
            }
        }
        
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"JSON parsing error: {str(e)}",
            "error_type": "json_decode",
            "fallback_items": fallback_items
        }
    
    except Exception as e:
        print(f"❌ Receipt processing error: {e}")
        return {
            "success": False,
            "error": f"Receipt processing failed: {str(e)}",
            "error_type": "processing_error",
            "fallback_items": fallback_items
        }


@app.function(image=image)
def test_receipt_processor():
    """Test the receipt processor with sample data"""
    print("🧪 Testing receipt processor...")
    
    # You would replace this with actual base64 image data
    test_data = {
        "image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "store_context": "Walmart",
        "user_id": "test_user"
    }
    
    result = process_receipt_with_ai(test_data)
    print("Test result:", json.dumps(result, indent=2))
    return result

@app.local_entrypoint()  
def main():
    print("🧾 Testing receipt processor...")
    result = test_receipt_processor.remote()
    print("Final result:", json.dumps(result, indent=2))

if __name__ == "__main__":
    main()