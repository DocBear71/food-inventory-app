# =============================================================================
# PYTHON MODAL SERVICES - Unified Nutrition Analyzer
# =============================================================================

# file: unified-nutrition-analyzer.py - Enhanced nutrition analysis with inventory integration

import json
import os
from typing import Dict, Any, List, Optional
import modal
import requests
from datetime import datetime

# Create Modal app
app = modal.App("unified-nutrition-analyzer")

# Define the image with enhanced dependencies
image = (
    modal.Image.from_registry("python:3.11")
    .pip_install([
        "openai",
        "requests",
        "fastapi[standard]",
        "python-dateutil",
        "numpy",
        "pandas"
    ])
)

def get_comprehensive_nutrition_prompt(item_data, analysis_type="standard"):
    """Generate comprehensive nutrition analysis prompt"""
    
    base_prompt = f"""
    Analyze nutrition for this food item with high accuracy:
    
    Item: {item_data.get('name', 'Unknown')}
    Brand: {item_data.get('brand', 'Unknown')}
    Category: {item_data.get('category', 'Unknown')}
    Quantity: {item_data.get('quantity', 1)} {item_data.get('unit', 'item')}
    """
    
    if analysis_type == "comprehensive":
        base_prompt += f"""
        
        Provide COMPLETE nutrition information per serving in this EXACT JSON format:
        {{
            "nutrition": {{
                "calories": {{"value": 385, "unit": "kcal", "name": "Energy"}},
                "protein": {{"value": 32, "unit": "g", "name": "Protein"}},
                "fat": {{"value": 18, "unit": "g", "name": "Total Fat"}},
                "saturatedFat": {{"value": 6, "unit": "g", "name": "Saturated Fat"}},
                "monounsaturatedFat": {{"value": 8, "unit": "g", "name": "Monounsaturated Fat"}},
                "polyunsaturatedFat": {{"value": 3, "unit": "g", "name": "Polyunsaturated Fat"}},
                "transFat": {{"value": 0, "unit": "g", "name": "Trans Fat"}},
                "cholesterol": {{"value": 75, "unit": "mg", "name": "Cholesterol"}},
                "carbs": {{"value": 12, "unit": "g", "name": "Total Carbohydrate"}},
                "fiber": {{"value": 3, "unit": "g", "name": "Dietary Fiber"}},
                "sugars": {{"value": 4, "unit": "g", "name": "Total Sugars"}},
                "addedSugars": {{"value": 0, "unit": "g", "name": "Added Sugars"}},
                "sodium": {{"value": 420, "unit": "mg", "name": "Sodium"}},
                "potassium": {{"value": 580, "unit": "mg", "name": "Potassium"}},
                "calcium": {{"value": 120, "unit": "mg", "name": "Calcium"}},
                "iron": {{"value": 2.5, "unit": "mg", "name": "Iron"}},
                "magnesium": {{"value": 45, "unit": "mg", "name": "Magnesium"}},
                "phosphorus": {{"value": 180, "unit": "mg", "name": "Phosphorus"}},
                "zinc": {{"value": 2.8, "unit": "mg", "name": "Zinc"}},
                "vitaminA": {{"value": 85, "unit": "µg", "name": "Vitamin A (RAE)"}},
                "vitaminD": {{"value": 0.5, "unit": "µg", "name": "Vitamin D"}},
                "vitaminE": {{"value": 1.2, "unit": "mg", "name": "Vitamin E"}},
                "vitaminK": {{"value": 12, "unit": "µg", "name": "Vitamin K"}},
                "vitaminC": {{"value": 15, "unit": "mg", "name": "Vitamin C"}},
                "thiamin": {{"value": 0.15, "unit": "mg", "name": "Thiamin (B1)"}},
                "riboflavin": {{"value": 0.25, "unit": "mg", "name": "Riboflavin (B2)"}},
                "niacin": {{"value": 8.5, "unit": "mg", "name": "Niacin (B3)"}},
                "vitaminB6": {{"value": 0.8, "unit": "mg", "name": "Vitamin B6"}},
                "folate": {{"value": 25, "unit": "µg", "name": "Folate (B9)"}},
                "vitaminB12": {{"value": 1.2, "unit": "µg", "name": "Vitamin B12"}},
                "biotin": {{"value": 8, "unit": "µg", "name": "Biotin (B7)"}},
                "pantothenicAcid": {{"value": 2.5, "unit": "mg", "name": "Pantothenic Acid (B5)"}},
                "choline": {{"value": 85, "unit": "mg", "name": "Choline"}},
                
                "calculationMethod": "ai_calculated",
                "dataSource": "ai_analysis",
                "confidence": 0.85,
                "coverage": 0.90,
                "aiAnalysis": {{
                    "modelUsed": "gpt-4o",
                    "promptVersion": "v2.0",
                    "warnings": []
                }}
            }},
            "analysis": {{
                "nutritionDensity": "high/medium/low",
                "healthScore": 85,
                "keyNutrients": ["protein", "fiber", "iron"],
                "dietaryFlags": ["high-protein", "low-carb"],
                "allergenWarnings": ["contains-dairy"],
                "storageRecommendations": "Refrigerate after opening"
            }}
        }}
        """
    else:
        base_prompt += f"""
        
        Provide standard nutrition information per serving in this JSON format:
        {{
            "nutrition": {{
                "calories": {{"value": 250, "unit": "kcal", "name": "Energy"}},
                "protein": {{"value": 20, "unit": "g", "name": "Protein"}},
                "fat": {{"value": 15, "unit": "g", "name": "Total Fat"}},
                "carbs": {{"value": 10, "unit": "g", "name": "Total Carbohydrate"}},
                "fiber": {{"value": 3, "unit": "g", "name": "Dietary Fiber"}},
                "sodium": {{"value": 400, "unit": "mg", "name": "Sodium"}},
                "calculationMethod": "ai_calculated",
                "confidence": 0.8
            }}
        }}
        """
    
    base_prompt += """
    
    IMPORTANT:
    - Values should be realistic for the food type and quantity
    - Use exact field names matching the schema
    - Include confidence score (0.0-1.0)
    - Return ONLY valid JSON, no other text
    """
    
    return base_prompt

# Update your unified-nutrition-analyzer.py analyze_recipe_nutrition function:

def analyze_recipe_nutrition(recipe_data, analysis_level="comprehensive"):
    """Analyze nutrition for entire recipe - FIXED FORMAT"""
    
    ingredients_text = "\n".join([
        f"- {ing.get('name', '')} {ing.get('amount', '')} {ing.get('unit', '')}"
        for ing in recipe_data.get('ingredients', [])
    ])
    
    prompt = f"""
    Calculate comprehensive nutrition for this ENTIRE RECIPE:
    
    Recipe: {recipe_data.get('title', 'Unknown Recipe')}
    Servings: {recipe_data.get('servings', 4)}
    
    Ingredients:
    {ingredients_text}
    
    Instructions: {' '.join(recipe_data.get('instructions', [])[:3])}...
    
    Calculate nutrition PER SERVING and return in this EXACT JSON format:
    {{
        "nutrition": {{
            "calories": {{"value": 385, "unit": "kcal", "name": "Energy"}},
            "protein": {{"value": 32, "unit": "g", "name": "Protein"}},
            "fat": {{"value": 18, "unit": "g", "name": "Total Fat"}},
            "saturatedFat": {{"value": 6, "unit": "g", "name": "Saturated Fat"}},
            "monounsaturatedFat": {{"value": 8, "unit": "g", "name": "Monounsaturated Fat"}},
            "polyunsaturatedFat": {{"value": 3, "unit": "g", "name": "Polyunsaturated Fat"}},
            "transFat": {{"value": 0, "unit": "g", "name": "Trans Fat"}},
            "cholesterol": {{"value": 75, "unit": "mg", "name": "Cholesterol"}},
            "carbs": {{"value": 12, "unit": "g", "name": "Total Carbohydrate"}},
            "fiber": {{"value": 3, "unit": "g", "name": "Dietary Fiber"}},
            "sugars": {{"value": 4, "unit": "g", "name": "Total Sugars"}},
            "addedSugars": {{"value": 0, "unit": "g", "name": "Added Sugars"}},
            "sodium": {{"value": 420, "unit": "mg", "name": "Sodium"}},
            "potassium": {{"value": 580, "unit": "mg", "name": "Potassium"}},
            "calcium": {{"value": 120, "unit": "mg", "name": "Calcium"}},
            "iron": {{"value": 2.5, "unit": "mg", "name": "Iron"}},
            "magnesium": {{"value": 45, "unit": "mg", "name": "Magnesium"}},
            "phosphorus": {{"value": 180, "unit": "mg", "name": "Phosphorus"}},
            "zinc": {{"value": 2.8, "unit": "mg", "name": "Zinc"}},
            "vitaminA": {{"value": 85, "unit": "µg", "name": "Vitamin A (RAE)"}},
            "vitaminD": {{"value": 0.5, "unit": "µg", "name": "Vitamin D"}},
            "vitaminE": {{"value": 1.2, "unit": "mg", "name": "Vitamin E"}},
            "vitaminK": {{"value": 12, "unit": "µg", "name": "Vitamin K"}},
            "vitaminC": {{"value": 15, "unit": "mg", "name": "Vitamin C"}},
            "thiamin": {{"value": 0.15, "unit": "mg", "name": "Thiamin (B1)"}},
            "riboflavin": {{"value": 0.25, "unit": "mg", "name": "Riboflavin (B2)"}},
            "niacin": {{"value": 8.5, "unit": "mg", "name": "Niacin (B3)"}},
            "vitaminB6": {{"value": 0.8, "unit": "mg", "name": "Vitamin B6"}},
            "folate": {{"value": 25, "unit": "µg", "name": "Folate (B9)"}},
            "vitaminB12": {{"value": 1.2, "unit": "µg", "name": "Vitamin B12"}},
            "biotin": {{"value": 8, "unit": "µg", "name": "Biotin (B7)"}},
            "pantothenicAcid": {{"value": 2.5, "unit": "mg", "name": "Pantothenic Acid (B5)"}},
            "choline": {{"value": 85, "unit": "mg", "name": "Choline"}}
        }},
        "analysis": {{
            "nutritionDensity": "high",
            "healthScore": 85,
            "keyNutrients": ["protein", "fiber", "iron"],
            "dietaryFlags": ["high-protein", "low-carb"],
            "allergenWarnings": [],
            "storageRecommendations": "Refrigerate leftovers"
        }}
    }}
    
    CRITICAL: 
    - Use EXACT field names as shown above
    - All nutrition values must be numbers (not strings)
    - Return ONLY valid JSON, no markdown or extra text
    - Consider cooking methods and ingredient interactions
    """
    
    return prompt

def calculate_inventory_nutrition_impact(inventory_items, nutrition_goals=None):
    """Calculate nutrition impact of inventory items"""
    
    items_text = "\n".join([
        f"- {item.get('name', '')} ({item.get('quantity', 1)} {item.get('unit', '')}) - {item.get('category', '')}"
        for item in inventory_items[:20]  # Limit to prevent token overflow
    ])
    
    goals_text = ""
    if nutrition_goals:
        goals_text = f"""
        User's Nutrition Goals:
        - Daily Calories: {nutrition_goals.get('dailyCalories', 2000)}
        - Protein: {nutrition_goals.get('protein', 150)}g
        - Carbs: {nutrition_goals.get('carbs', 250)}g
        - Fat: {nutrition_goals.get('fat', 65)}g
        - Fiber: {nutrition_goals.get('fiber', 25)}g
        - Sodium: {nutrition_goals.get('sodium', 2300)}mg
        """
    
    prompt = f"""
    Analyze this inventory for nutrition optimization:
    
    Current Inventory:
    {items_text}
    
    {goals_text}
    
    Provide analysis in JSON format:
    {{
        "inventoryNutrition": {{
            "totalCaloriesPotential": 15000,
            "proteinSources": ["chicken", "beans"],
            "fiberSources": ["vegetables", "grains"],
            "vitaminSources": {{"vitaminC": ["oranges"], "iron": ["spinach"]}}
        }},
        "optimization": {{
            "missingNutrients": ["vitamin D", "omega-3"],
            "excessNutrients": ["sodium"],
            "recommendations": [
                "Add fatty fish for omega-3",
                "Include vitamin D fortified foods"
            ]
        }},
        "mealSuggestions": [
            {{
                "meal": "High Protein Stir Fry",
                "ingredients": ["chicken", "broccoli", "rice"],
                "nutritionHighlights": ["high protein", "good fiber"]
            }}
        ]
    }}
    """
    
    return prompt

@app.function(image=image)
@modal.fastapi_endpoint(method="GET")
def health():
    """Health check endpoint for unified nutrition analyzer"""
    return {
        "healthy": True,
        "service": "unified-nutrition-analyzer",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "status": "operational"
    }

@app.function(
    image=image,
    timeout=300,
    memory=2048,
    secrets=[modal.Secret.from_name("openai-api-key")]
)
@modal.fastapi_endpoint(method="POST")
def analyze_nutrition(item: dict) -> Dict[str, Any]:
    """Enhanced nutrition analysis endpoint"""
    
    try:
        # Extract parameters
        analysis_type = item.get("type", "inventory_item")
        data = item.get("data") or item  # Support both formats
        user_id = item.get("userId")
        analysis_level = item.get("analysis_level", "standard")
        
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            return {
                "success": False,
                "error": "OpenAI API key not configured"
            }
        
        print(f"🥗 Analyzing nutrition - Type: {analysis_type}, Level: {analysis_level}")
        
        # Route to appropriate analysis function
        if analysis_type == "recipe":
            result = analyze_recipe_nutrition_with_ai(data, analysis_level, openai_api_key)
        elif analysis_type == "inventory_item":
            result = analyze_item_nutrition_with_ai(data, analysis_level, openai_api_key)
        elif analysis_type == "ingredients_list":
            result = analyze_ingredients_list_with_ai(data, analysis_level, openai_api_key)
        elif analysis_type == "inventory_optimization":
            result = analyze_inventory_optimization_with_ai(data, openai_api_key)
        else:
            return {
                "success": False,
                "error": f"Unknown analysis type: {analysis_type}"
            }
        
        return result
        
    except Exception as e:
        print(f"❌ Nutrition analysis error: {e}")
        return {
            "success": False,
            "error": f"Nutrition analysis failed: {str(e)}"
        }

def analyze_recipe_nutrition_with_ai(recipe_data, analysis_level, openai_api_key):
    """Analyze nutrition for a complete recipe - FIXED VERSION"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        prompt = analyze_recipe_nutrition(recipe_data, analysis_level)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=2000
        )
        
        ai_response = response.choices[0].message.content.strip()
        print(f"🤖 Raw AI response: {ai_response[:500]}...")  # Debug log
        
        # Parse JSON response
        import json
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            print(f"🔍 Extracted JSON string: {json_str[:200]}...")  # Debug log
            
            nutrition_data = json.loads(json_str)
            print(f"📊 Parsed nutrition_data keys: {list(nutrition_data.keys())}")  # Debug log
            
            # FIXED: The OpenAI response should have this structure:
            # {
            #   "nutrition": { "calories": {...}, "protein": {...}, ... },
            #   "analysis": { "nutritionDensity": "...", ... }
            # }
            
            # Extract nutrition and analysis correctly
            nutrition = nutrition_data.get('nutrition', {})
            analysis = nutrition_data.get('analysis', {})
            
            # If nutrition is still empty, the AI might have returned data at root level
            if not nutrition or len(nutrition) == 0:
                print("⚠️ Nutrition data empty, checking for root-level data...")
                
                # Check if nutrition data is at root level
                nutrition_fields = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sodium']
                root_nutrition = {}
                
                for field in nutrition_fields:
                    if field in nutrition_data and isinstance(nutrition_data[field], dict):
                        root_nutrition[field] = nutrition_data[field]
                
                if root_nutrition:
                    nutrition = root_nutrition
                    print(f"✅ Found nutrition at root level: {list(nutrition.keys())}")
                else:
                    # Last resort: return the entire parsed data as nutrition
                    nutrition = nutrition_data
                    print("⚠️ Using entire response as nutrition data")
            
            # Add processing metadata
            if isinstance(nutrition, dict):
                nutrition.setdefault('calculationMethod', 'ai_calculated')
                nutrition.setdefault('confidence', 0.85)
                nutrition.setdefault('dataSource', 'ai_analysis')
                
                if 'aiAnalysis' not in nutrition:
                    nutrition['aiAnalysis'] = {
                        "modelUsed": "gpt-4o",
                        "promptVersion": "v2.0",
                        "tokensUsed": response.usage.total_tokens if hasattr(response, 'usage') else 0,
                        "analysisLevel": analysis_level,
                        "timestamp": datetime.now().isoformat(),
                        "warnings": []
                    }
            
            print(f"✅ Final nutrition keys: {list(nutrition.keys()) if isinstance(nutrition, dict) else 'Not a dict'}")
            
            return {
                "success": True,
                "nutrition": nutrition,
                "analysis": analysis,
                "coverage": nutrition.get('coverage', 0.9) if isinstance(nutrition, dict) else 0.9,
                "confidence": nutrition.get('confidence', 0.85) if isinstance(nutrition, dict) else 0.85,
                "method": "ai_recipe_analysis"
            }
        
        return {
            "success": False,
            "error": "Failed to parse AI nutrition response - no valid JSON found"
        }
        
    except json.JSONDecodeError as je:
        print(f"❌ JSON parsing error: {je}")
        print(f"🔍 Raw response: {ai_response}")
        return {
            "success": False,
            "error": f"JSON parsing failed: {str(je)}"
        }
        
    except Exception as e:
        print(f"❌ Recipe nutrition analysis failed: {e}")
        return {
            "success": False,
            "error": f"Recipe nutrition analysis failed: {str(e)}"
        }


def analyze_item_nutrition_with_ai(item_data, analysis_level, openai_api_key):
    """Analyze nutrition for individual inventory item - FIXED VERSION"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        prompt = get_comprehensive_nutrition_prompt(item_data, analysis_level)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1500
        )
        
        ai_response = response.choices[0].message.content.strip()
        print(f"🤖 Raw AI response: {ai_response[:500]}...")  # Debug log
        
        # Parse JSON response
        import json
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            nutrition_data = json.loads(json_str)
            
            # FIXED: Same logic as recipe analysis
            nutrition = nutrition_data.get('nutrition', {})
            analysis = nutrition_data.get('analysis', {})
            
            # Check for root-level nutrition data if nested data is empty
            if not nutrition or len(nutrition) == 0:
                nutrition_fields = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sodium']
                root_nutrition = {}
                
                for field in nutrition_fields:
                    if field in nutrition_data and isinstance(nutrition_data[field], dict):
                        root_nutrition[field] = nutrition_data[field]
                
                if root_nutrition:
                    nutrition = root_nutrition
                else:
                    nutrition = nutrition_data
            
            # Add metadata
            if isinstance(nutrition, dict):
                nutrition.setdefault('calculationMethod', 'ai_calculated')
                nutrition.setdefault('confidence', 0.8)
                nutrition.setdefault('dataSource', 'ai_analysis')
            
            return {
                "success": True,
                "nutrition": nutrition,
                "analysis": analysis,
                "confidence": nutrition.get('confidence', 0.8) if isinstance(nutrition, dict) else 0.8,
                "method": "ai_item_analysis"
            }
        
        return {
            "success": False,
            "error": "Failed to parse AI nutrition response"
        }
        
    except Exception as e:
        print(f"❌ Item nutrition analysis failed: {e}")
        return {
            "success": False,
            "error": f"Item nutrition analysis failed: {str(e)}"
        }

def analyze_ingredients_list_with_ai(ingredients_data, analysis_level, openai_api_key):
    """Analyze nutrition for list of ingredients"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        ingredients = ingredients_data.get('ingredients', [])
        servings = ingredients_data.get('servings', 1)
        
        ingredients_text = "\n".join([
            f"- {ing.get('name', ing) if isinstance(ing, dict) else ing}"
            for ing in ingredients
        ])
        
        prompt = f"""
        Calculate combined nutrition for these ingredients:
        
        Ingredients:
        {ingredients_text}
        
        Servings: {servings}
        
        Provide nutrition totals AND per-serving breakdown in JSON format:
        {{
            "totalNutrition": {{
                "calories": {{"value": 1000, "unit": "kcal"}},
                "protein": {{"value": 50, "unit": "g"}},
                "carbs": {{"value": 100, "unit": "g"}},
                "fat": {{"value": 30, "unit": "g"}}
            }},
            "perServingNutrition": {{
                "calories": {{"value": 250, "unit": "kcal"}},
                "protein": {{"value": 12.5, "unit": "g"}},
                "carbs": {{"value": 25, "unit": "g"}},
                "fat": {{"value": 7.5, "unit": "g"}}
            }},
            "ingredientBreakdown": [
                {{
                    "ingredient": "chicken breast",
                    "nutrition": {{"calories": {{"value": 200, "unit": "kcal"}}}},
                    "contribution": 0.4
                }}
            ]
        }}
        """
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1500
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            nutrition_data = json.loads(json_str)
            
            return {
                "success": True,
                "totalNutrition": nutrition_data.get('totalNutrition', {}),
                "perServingNutrition": nutrition_data.get('perServingNutrition', {}),
                "ingredientBreakdown": nutrition_data.get('ingredientBreakdown', []),
                "method": "ai_ingredients_analysis"
            }
        
        return {
            "success": False,
            "error": "Failed to parse AI ingredients analysis"
        }
        
    except Exception as e:
        print(f"❌ Ingredients nutrition analysis failed: {e}")
        return {
            "success": False,
            "error": f"Ingredients analysis failed: {str(e)}"
        }

def analyze_inventory_optimization_with_ai(inventory_data, openai_api_key):
    """Analyze inventory for nutrition optimization"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        inventory_items = inventory_data.get('inventory', [])
        nutrition_goals = inventory_data.get('nutritionGoals')
        
        prompt = calculate_inventory_nutrition_impact(inventory_items, nutrition_goals)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            optimization_data = json.loads(json_str)
            
            return {
                "success": True,
                "inventoryNutrition": optimization_data.get('inventoryNutrition', {}),
                "optimization": optimization_data.get('optimization', {}),
                "mealSuggestions": optimization_data.get('mealSuggestions', []),
                "method": "ai_inventory_optimization"
            }
        
        return {
            "success": False,
            "error": "Failed to parse AI optimization analysis"
        }
        
    except Exception as e:
        print(f"❌ Inventory optimization failed: {e}")
        return {
            "success": False,
            "error": f"Inventory optimization failed: {str(e)}"
        }

# Test function
@app.function(image=image)
def test_nutrition_analyzer():
    """Test the nutrition analyzer"""
    print("🧪 Testing nutrition analyzer...")
    
    test_data = {
        "type": "inventory_item",
        "data": {
            "name": "Chicken Breast",
            "brand": "Organic Valley",
            "category": "Fresh/Frozen Poultry",
            "quantity": 1,
            "unit": "lb"
        },
        "analysis_level": "comprehensive"
    }
    
    result = analyze_nutrition(test_data)
    print("Test result:", json.dumps(result, indent=2))
    return result

@app.local_entrypoint()
def main():
    print("🥗 Testing unified nutrition analyzer...")
    result = test_nutrition_analyzer.remote()
    print("Final result:", json.dumps(result, indent=2))

if __name__ == "__main__":
    main()