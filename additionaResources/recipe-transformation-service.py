# file: recipe-transformation-service.py - AI-powered recipe scaling and unit conversion

import json
import os
from typing import Dict, Any, List, Optional
import modal
from datetime import datetime
import re

# Create Modal app
app = modal.App("recipe-transformation-service")

# Define the image with dependencies
image = (
    modal.Image.from_registry("python:3.11")
    .pip_install([
        "openai",
        "requests", 
        "fastapi[standard]",
        "python-dateutil"
    ])
)

def generate_recipe_scaling_prompt(recipe_data, target_servings):
    """Generate AI prompt for intelligent recipe scaling"""
    
    original_servings = recipe_data.get('servings', 4)
    scaling_factor = target_servings / original_servings
    
    # Format ingredients for AI analysis
    ingredients_text = ""
    for i, ingredient in enumerate(recipe_data.get('ingredients', []), 1):
        ing_name = ingredient.get('name', '')
        ing_amount = ingredient.get('amount', '')
        ing_unit = ingredient.get('unit', '')
        ingredients_text += f"{i}. {ing_name} - {ing_amount} {ing_unit}\n"
    
    # Format instructions
    instructions_text = ""
    for i, instruction in enumerate(recipe_data.get('instructions', []), 1):
        # Handle both string and object instructions
        if isinstance(instruction, str):
            inst_text = instruction
        elif isinstance(instruction, dict):
            inst_text = instruction.get('text', instruction.get('instruction', ''))
        else:
            inst_text = str(instruction)
        
        instructions_text += f"{i}. {inst_text}\n"
    
    prompt = f"""
You are an expert chef and recipe developer. Scale this recipe intelligently from {original_servings} to {target_servings} servings.

RECIPE TO SCALE:
Title: {recipe_data.get('title', 'Unknown Recipe')}
Current Servings: {original_servings}
Target Servings: {target_servings}
Scaling Factor: {scaling_factor:.2f}x

INGREDIENTS:
{ingredients_text}

INSTRUCTIONS:
{instructions_text}

SCALING REQUIREMENTS:
1. Scale ingredients intelligently (not just mathematically)
2. Consider ingredient behavior:
   - Seasonings: Don't scale 1:1 (diminishing returns)
   - Leavening agents: Scale carefully for proper rise
   - Liquids: May need slight adjustments for evaporation
   - Aromatics (garlic, onions): Often don't need full scaling
3. Adjust cooking times and methods for new quantity
4. Round measurements to practical amounts
5. Suggest equipment changes if needed
6. Note any difficulty changes

Return ONLY this JSON format:
{{
    "scaled_ingredients": [
        {{
            "name": "chicken breast",
            "amount": "2.5",
            "unit": "lbs",
            "original_amount": "1.5",
            "scaling_notes": "Scaled proportionally"
        }}
    ],
    "cooking_adjustments": {{
        "time_multiplier": 1.25,
        "temperature_changes": "No change needed",
        "equipment_notes": "Use larger pot or split into two pans",
        "difficulty_notes": "Slightly more complex due to larger batch"
    }},
    "scaling_notes": "Successfully scaled for {target_servings} servings. Watch seasoning levels - taste and adjust.",
    "success_probability": 0.92,
    "practical_tips": [
        "Taste seasoning before serving and adjust",
        "May need to cook in batches if pan too small"
    ]
}}

Focus on creating a delicious, properly balanced recipe at the new serving size.
"""
    
    return prompt

def generate_unit_conversion_prompt(recipe_data, target_system):
    """Generate AI prompt for intelligent unit conversion"""
    
    source_system = detect_measurement_system(recipe_data.get('ingredients', []))
    
    # Format ingredients for conversion
    ingredients_text = ""
    for i, ingredient in enumerate(recipe_data.get('ingredients', []), 1):
        ing_name = ingredient.get('name', '')
        ing_amount = ingredient.get('amount', '')
        ing_unit = ingredient.get('unit', '')
        ingredients_text += f"{i}. {ing_name} - {ing_amount} {ing_unit}\n"
    
    # Get recipe context
    recipe_context = f"Recipe: {recipe_data.get('title', 'Unknown')}"
    if recipe_data.get('category'):
        recipe_context += f", Category: {recipe_data.get('category')}"
    if recipe_data.get('tags'):
        recipe_context += f", Tags: {', '.join(recipe_data.get('tags', [])[:3])}"
    
    prompt = f"""
You are an expert in culinary measurements and international cooking standards.

CONVERSION TASK:
Convert this recipe from {source_system.upper()} to {target_system.upper()} measurements.

RECIPE CONTEXT:
{recipe_context}
Servings: {recipe_data.get('servings', 4)}

INGREDIENTS TO CONVERT:
{ingredients_text}

CONVERSION REQUIREMENTS:
1. Use ingredient-specific density conversions:
   - Flour: 1 cup = 120g (all-purpose)
   - Sugar: 1 cup = 200g (granulated)
   - Butter: 1 cup = 227g
   - Milk: 1 cup = 240ml
   - Water: 1 cup = 240ml
2. Round to practical measurements for home cooking
3. Consider regional preferences and common package sizes
4. Convert temperatures if mentioned in instructions
5. Provide cultural adaptations where helpful

Return ONLY this JSON format:
{{
    "converted_ingredients": [
        {{
            "name": "all-purpose flour",
            "amount": "240",
            "unit": "g",
            "original_amount": "2",
            "original_unit": "cups",
            "conversion_method": "density_specific",
            "notes": "Standard all-purpose flour density"
        }}
    ],
    "temperature_conversions": {{
        "instructions_updates": [
            "Bake at 180°C (originally 350°F) for 25-30 minutes"
        ]
    }},
    "conversion_notes": {{
        "method_used": "ingredient_specific_density",
        "accuracy_level": "high",
        "regional_adaptations": "Measurements rounded to common {target_system} package sizes"
    }},
    "cultural_notes": "In {target_system} regions, this recipe works well with locally available ingredients.",
    "success_probability": 0.95
}}

Ensure all conversions are accurate and practical for home cooks.
"""
    
    return prompt

def detect_measurement_system(ingredients):
    """Detect the measurement system used in ingredients"""
    
    us_units = ['cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'lbs', 'ounce', 'ounces', 'pound', 'pounds', 'tablespoon', 'teaspoon', 'fluid ounce', 'fl oz']
    metric_units = ['g', 'kg', 'ml', 'l', 'gram', 'grams', 'kilogram', 'kilograms', 'milliliter', 'milliliters', 'liter', 'liters']
    
    us_count = 0
    metric_count = 0
    
    for ingredient in ingredients:
        unit = ingredient.get('unit', '').lower()
        amount = str(ingredient.get('amount', '')).lower()
        
        # Check unit field
        if any(us_unit in unit for us_unit in us_units):
            us_count += 1
        elif any(metric_unit in unit for metric_unit in metric_units):
            metric_count += 1
        
        # Check amount field for units
        if any(us_unit in amount for us_unit in us_units):
            us_count += 1
        elif any(metric_unit in amount for metric_unit in metric_units):
            metric_count += 1
    
    if us_count > metric_count:
        return 'us'
    elif metric_count > us_count:
        return 'metric'
    else:
        return 'mixed'

@app.function(image=image)
@modal.fastapi_endpoint(method="GET")
def health():
    """Health check endpoint"""
    return {
        "healthy": True,
        "service": "recipe-transformation-service",
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
def transform_recipe(item: dict) -> Dict[str, Any]:
    """Main recipe transformation endpoint"""
    
    print(f"🤖 Received transformation request: {item}")
    
    try:
        transformation_type = item.get("transformation_type")
        recipe_data = item.get("recipe_data")
        options = item.get("options", {})
        use_ai = item.get("use_ai", True)
        
        print(f"🔄 Processing: {transformation_type}, AI: {use_ai}")
        
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            return {
                "success": False,
                "error": "OpenAI API key not configured"
            }
        
        print(f"🤖 Recipe transformation - Type: {transformation_type}, AI: {use_ai}")
        
        if transformation_type == "scale":
            target_servings = options.get("target_servings")
            if not target_servings:
                return {"success": False, "error": "target_servings required for scaling"}
            
            if use_ai:
                result = scale_recipe_with_ai(recipe_data, target_servings, openai_api_key)
            else:
                result = scale_recipe_basic_math(recipe_data, target_servings)
                
        elif transformation_type == "convert":
            target_system = options.get("target_system")
            if not target_system:
                return {"success": False, "error": "target_system required for conversion"}
            
            if use_ai:
                result = convert_units_with_ai(recipe_data, target_system, openai_api_key)
            else:
                result = convert_units_basic_math(recipe_data, target_system)
                
        else:
            return {"success": False, "error": f"Unknown transformation type: {transformation_type}"}
        
        return result
        
    except Exception as e:
        print(f"❌ Recipe transformation error: {e}")
        return {
            "success": False,
            "error": f"Recipe transformation failed: {str(e)}"
        }

def scale_recipe_with_ai(recipe_data, target_servings, openai_api_key):
    """Scale recipe using AI for intelligent adjustments"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        prompt = generate_recipe_scaling_prompt(recipe_data, target_servings)
        
        start_time = datetime.now()
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        ai_response = response.choices[0].message.content.strip()
        
        # Parse JSON response
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            scaling_result = json.loads(json_str)
            
            return {
                "success": True,
                "scaled_ingredients": scaling_result.get('scaled_ingredients', []),
                "cooking_adjustments": scaling_result.get('cooking_adjustments', {}),
                "scaling_notes": scaling_result.get('scaling_notes', ''),
                "success_probability": scaling_result.get('success_probability', 0.9),
                "practical_tips": scaling_result.get('practical_tips', []),
                "method": "ai_scaling",
                "processing_time_ms": processing_time,
                "tokens_used": response.usage.total_tokens if hasattr(response, 'usage') else 0,
                "cost": calculate_openai_cost(response.usage) if hasattr(response, 'usage') else 0
            }
        
        return {
            "success": False,
            "error": "Failed to parse AI scaling response"
        }
        
    except Exception as e:
        print(f"❌ AI recipe scaling failed: {e}")
        return {
            "success": False,
            "error": f"AI scaling failed: {str(e)}"
        }

def convert_units_with_ai(recipe_data, target_system, openai_api_key):
    """Convert recipe units using AI for contextual conversion"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        prompt = generate_unit_conversion_prompt(recipe_data, target_system)
        
        start_time = datetime.now()
        
        response = client.chat.completions.create(
            model="gpt-4o", 
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=2000
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        ai_response = response.choices[0].message.content.strip()
        
        # Parse JSON response
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            conversion_result = json.loads(json_str)
            
            return {
                "success": True,
                "converted_ingredients": conversion_result.get('converted_ingredients', []),
                "temperature_conversions": conversion_result.get('temperature_conversions', {}),
                "conversion_notes": conversion_result.get('conversion_notes', {}),
                "cultural_notes": conversion_result.get('cultural_notes', ''),
                "success_probability": conversion_result.get('success_probability', 0.9),
                "method": "ai_conversion",
                "processing_time_ms": processing_time,
                "tokens_used": response.usage.total_tokens if hasattr(response, 'usage') else 0,
                "cost": calculate_openai_cost(response.usage) if hasattr(response, 'usage') else 0
            }
        
        return {
            "success": False,
            "error": "Failed to parse AI conversion response"
        }
        
    except Exception as e:
        print(f"❌ AI unit conversion failed: {e}")
        return {
            "success": False,
            "error": f"AI conversion failed: {str(e)}"
        }

def scale_recipe_basic_math(recipe_data, target_servings):
    """Scale recipe using basic mathematical scaling (free tier)"""
    
    try:
        original_servings = recipe_data.get('servings', 4)
        scaling_factor = target_servings / original_servings
        
        scaled_ingredients = []
        
        for ingredient in recipe_data.get('ingredients', []):
            original_amount = ingredient.get('amount', '')
            
            # Try to extract number from amount
            scaled_amount = scale_amount_mathematically(original_amount, scaling_factor)
            
            scaled_ingredients.append({
                "name": ingredient.get('name', ''),
                "amount": scaled_amount,
                "unit": ingredient.get('unit', ''),
                "original_amount": original_amount,
                "scaling_notes": f"Scaled by {scaling_factor:.2f}x"
            })
        
        return {
            "success": True,
            "scaled_ingredients": scaled_ingredients,
            "cooking_adjustments": {
                "time_multiplier": calculate_time_multiplier(scaling_factor),
                "temperature_changes": "No automatic temperature adjustment",
                "equipment_notes": "Consider larger cookware for bigger batches",
                "difficulty_notes": "Basic mathematical scaling applied"
            },
            "scaling_notes": f"Recipe mathematically scaled from {original_servings} to {target_servings} servings",
            "method": "basic_math_scaling",
            "success_probability": 0.75
        }
        
    except Exception as e:
        print(f"❌ Basic math scaling failed: {e}")
        return {
            "success": False,
            "error": f"Basic scaling failed: {str(e)}"
        }

def convert_units_basic_math(recipe_data, target_system):
    """Convert units using basic mathematical conversion (free tier)"""
    
    try:
        # Basic conversion tables
        us_to_metric = {
            'cup': {'ml': 240, 'g_flour': 120, 'g_sugar': 200},
            'tbsp': {'ml': 15},
            'tsp': {'ml': 5},
            'oz': {'g': 28.35},
            'lb': {'g': 453.59, 'kg': 0.454},
            'fahrenheit': 'celsius'
        }
        
        metric_to_us = {
            'ml': {'cup': 0.00422, 'tbsp': 0.0676, 'tsp': 0.2029},
            'g': {'oz': 0.0353, 'cup_flour': 0.00833, 'cup_sugar': 0.005},
            'kg': {'lb': 2.205},
            'celsius': 'fahrenheit'
        }
        
        source_system = detect_measurement_system(recipe_data.get('ingredients', []))
        conversion_table = us_to_metric if source_system == 'us' and target_system == 'metric' else metric_to_us
        
        converted_ingredients = []
        
        for ingredient in recipe_data.get('ingredients', []):
            result = convert_ingredient_basic(ingredient, conversion_table, target_system)
            converted_ingredients.append(result)
        
        return {
            "success": True,
            "converted_ingredients": converted_ingredients,
            "conversion_notes": {
                "method_used": "basic_mathematical_conversion",
                "accuracy_level": "standard",
                "regional_adaptations": f"Basic conversion to {target_system} system"
            },
            "method": "basic_math_conversion",
            "success_probability": 0.8
        }
        
    except Exception as e:
        print(f"❌ Basic unit conversion failed: {e}")
        return {
            "success": False,
            "error": f"Basic conversion failed: {str(e)}"
        }

def scale_amount_mathematically(amount_str, scaling_factor):
    """Scale an amount string mathematically"""
    
    try:
        # Handle fractions like "1/2", "1 1/2"
        from fractions import Fraction
        
        # Clean the amount string
        amount_clean = str(amount_str).strip()
        
        # Try to parse as fraction or decimal
        if '/' in amount_clean:
            # Handle mixed numbers like "1 1/2"
            parts = amount_clean.split()
            if len(parts) == 2 and '/' in parts[1]:
                whole = float(parts[0])
                frac = float(Fraction(parts[1]))
                original_value = whole + frac
            else:
                original_value = float(Fraction(amount_clean))
        else:
            # Try to parse as regular number
            original_value = float(amount_clean)
        
        # Scale the value
        scaled_value = original_value * scaling_factor
        
        # Round to reasonable precision
        if scaled_value < 1:
            return f"{scaled_value:.2f}"
        elif scaled_value < 10:
            return f"{scaled_value:.1f}"
        else:
            return f"{round(scaled_value)}"
            
    except (ValueError, TypeError):
        # If we can't parse the number, return original with note
        return f"{amount_str} (×{scaling_factor:.2f})"

def convert_ingredient_basic(ingredient, conversion_table, target_system):
    """Convert a single ingredient using basic conversion table"""
    
    original_unit = ingredient.get('unit', '').lower()
    original_amount = ingredient.get('amount', '')
    ingredient_name = ingredient.get('name', '')
    
    # Try to get numeric amount
    try:
        numeric_amount = float(original_amount)
    except (ValueError, TypeError):
        return {
            "name": ingredient_name,
            "amount": original_amount,
            "unit": original_unit,
            "original_amount": original_amount,
            "original_unit": original_unit,
            "conversion_method": "no_conversion_needed",
            "notes": "Could not parse numeric amount"
        }
    
    # Look for conversion
    converted_amount = numeric_amount
    converted_unit = original_unit
    conversion_method = "no_conversion_available"
    
    for source_unit, conversions in conversion_table.items():
        if source_unit in original_unit:
            if isinstance(conversions, dict):
                # Multiple conversion options
                if 'flour' in ingredient_name.lower() and 'g_flour' in conversions:
                    converted_amount = numeric_amount * conversions['g_flour']
                    converted_unit = 'g'
                    conversion_method = "ingredient_specific"
                elif 'sugar' in ingredient_name.lower() and 'g_sugar' in conversions:
                    converted_amount = numeric_amount * conversions['g_sugar']
                    converted_unit = 'g'
                    conversion_method = "ingredient_specific"
                elif 'ml' in conversions:
                    converted_amount = numeric_amount * conversions['ml']
                    converted_unit = 'ml'
                    conversion_method = "volume_conversion"
                elif 'g' in conversions:
                    converted_amount = numeric_amount * conversions['g']
                    converted_unit = 'g'
                    conversion_method = "weight_conversion"
            break
    
    return {
        "name": ingredient_name,
        "amount": f"{converted_amount:.1f}" if converted_amount != numeric_amount else original_amount,
        "unit": converted_unit,
        "original_amount": original_amount,
        "original_unit": original_unit,
        "conversion_method": conversion_method,
        "notes": f"Converted from {original_amount} {original_unit}"
    }

def calculate_time_multiplier(scaling_factor):
    """Calculate cooking time adjustment for scaled recipes"""
    
    if scaling_factor <= 0.5:
        return 0.8  # Smaller batches cook faster
    elif scaling_factor <= 1.5:
        return 1.0  # No significant change
    elif scaling_factor <= 2.0:
        return 1.15  # Slightly longer
    elif scaling_factor <= 3.0:
        return 1.25  # Moderately longer
    else:
        return 1.4  # Much larger batches take longer

def calculate_openai_cost(usage):
    """Calculate OpenAI API cost"""
    
    if not usage:
        return 0
    
    # GPT-4o pricing (as of 2024)
    input_cost_per_token = 0.005 / 1000  # $0.005 per 1K input tokens
    output_cost_per_token = 0.015 / 1000  # $0.015 per 1K output tokens
    
    input_cost = usage.prompt_tokens * input_cost_per_token
    output_cost = usage.completion_tokens * output_cost_per_token
    
    return input_cost + output_cost

# Test function
@app.function(image=image)
def test_recipe_transformation():
    """Test the recipe transformation service"""
    print("🧪 Testing recipe transformation...")
    
    test_recipe = {
        "title": "Chocolate Chip Cookies",
        "servings": 24,
        "ingredients": [
            {"name": "all-purpose flour", "amount": "2", "unit": "cups"},
            {"name": "butter", "amount": "1", "unit": "cup"},
            {"name": "brown sugar", "amount": "1", "unit": "cup"},
            {"name": "vanilla extract", "amount": "2", "unit": "tsp"},
            {"name": "chocolate chips", "amount": "2", "unit": "cups"}
        ],
        "instructions": [
            "Cream butter and sugar",
            "Add flour gradually", 
            "Fold in chocolate chips",
            "Bake at 350°F for 12 minutes"
        ]
    }
    
    # Test scaling
    scaling_test = {
        "transformation_type": "scale",
        "recipe_data": test_recipe,
        "options": {"target_servings": 36},
        "use_ai": False  # Test basic math first
    }
    
    result = transform_recipe(scaling_test)
    print("Scaling test result:", json.dumps(result, indent=2))
    
    return result

@app.local_entrypoint()
def main():
    print("🤖 Testing recipe transformation service...")
    result = test_recipe_transformation.remote()
    print("Final result:", json.dumps(result, indent=2))

if __name__ == "__main__":
    main()