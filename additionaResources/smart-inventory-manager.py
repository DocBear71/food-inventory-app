# =============================================================================
# PYTHON MODAL SERVICES - Smart Inventory Manager
# =============================================================================

# file: smart-inventory-manager.py - AI-powered inventory optimization and suggestions

import json
import os
from typing import Dict, Any, List, Optional
import modal
from datetime import datetime, timedelta
import re

# Create Modal app
app = modal.App("smart-inventory-manager")

# Define the image with dependencies
image = (
    modal.Image.from_registry("python:3.11")
    .pip_install([
        "openai",
        "requests",
        "fastapi[standard]",
        "python-dateutil",
        "numpy",
        "fuzzywuzzy",
        "python-levenshtein"
    ])
)

def generate_recipe_suggestions_prompt(inventory_items, preferences=None):
    """Generate AI prompt for recipe suggestions from inventory"""
    
    # Group items by category for better organization
    categories = {}
    for item in inventory_items:
        cat = item.get('category', 'Other')
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(item)
    
    inventory_text = ""
    for category, items in categories.items():
        inventory_text += f"\n{category}:\n"
        for item in items:
            exp_info = ""
            if item.get('expirationDate'):
                try:
                    exp_date = datetime.fromisoformat(item['expirationDate'].replace('Z', '+00:00'))
                    days_left = (exp_date - datetime.now()).days
                    if days_left <= 3:
                        exp_info = f" (expires in {days_left} days - USE SOON!)"
                    elif days_left <= 7:
                        exp_info = f" (expires in {days_left} days)"
                except:
                    pass
            
            inventory_text += f"  - {item.get('name', '')} ({item.get('quantity', 1)} {item.get('unit', 'item')}){exp_info}\n"
    
    preferences_text = ""
    if preferences:
        pref_items = []
        if preferences.get('dietaryRestrictions'):
            pref_items.append(f"Dietary restrictions: {', '.join(preferences['dietaryRestrictions'])}")
        if preferences.get('cuisinePreferences'):
            pref_items.append(f"Preferred cuisines: {', '.join(preferences['cuisinePreferences'])}")
        if preferences.get('cookingTime'):
            pref_items.append(f"Cooking time preference: {preferences['cookingTime']}")
        if preferences.get('difficulty'):
            pref_items.append(f"Difficulty preference: {preferences['difficulty']}")
        
        if pref_items:
            preferences_text = f"\nUser Preferences:\n" + "\n".join(f"- {item}" for item in pref_items)
    
    prompt = f"""
    Suggest realistic recipes based on this available inventory:
    
    Current Inventory:{inventory_text}
    {preferences_text}
    
    Provide 5-8 recipe suggestions that:
    1. Use ingredients currently available
    2. Prioritize items expiring soon
    3. Create complete, balanced meals
    4. Match user preferences
    5. Are practical and achievable
    
    Return JSON format:
    {{
        "suggestions": [
            {{
                "name": "Mediterranean Chicken Bowl",
                "description": "Grilled chicken with vegetables and rice",
                "ingredients": [
                    {{"item": "chicken breast", "amount": "1 lb", "inInventory": true}},
                    {{"item": "rice", "amount": "1 cup", "inInventory": true}},
                    {{"item": "bell peppers", "amount": "2", "inInventory": true}}
                ],
                "missingIngredients": [
                    {{"item": "olive oil", "amount": "2 tbsp", "essential": true}},
                    {{"item": "lemon", "amount": "1", "essential": false}}
                ],
                "cookingTime": 30,
                "difficulty": "easy",
                "servings": 4,
                "nutritionHighlights": ["high protein", "balanced macros"],
                "inventoryUsage": 0.85,
                "expirationPriority": "high",
                "substitutions": [
                    {{"original": "bell peppers", "alternatives": ["zucchini", "broccoli"]}}
                ]
            }}
        ],
        "utilization": {{
            "totalItemsUsed": 12,
            "totalItemsAvailable": 15,
            "utilizationPercentage": 80,
            "expiringItemsUsed": 3
        }},
        "shoppingNeeded": [
            {{"item": "olive oil", "priority": "high", "usedInRecipes": ["Mediterranean Chicken Bowl", "Pasta Salad"]}},
            {{"item": "lemons", "priority": "medium", "usedInRecipes": ["Mediterranean Chicken Bowl"]}}
        ]
    }}
    
    Focus on practical, delicious meals that minimize food waste.
    """
    
    return prompt

def generate_inventory_optimization_prompt(inventory_items, goals=None):
    """Generate AI prompt for inventory optimization"""
    
    # Analyze current inventory
    total_items = len(inventory_items)
    expiring_soon = []
    categories_count = {}
    
    for item in inventory_items:
        # Count categories
        cat = item.get('category', 'Other')
        categories_count[cat] = categories_count.get(cat, 0) + 1
        
        # Check expiration
        if item.get('expirationDate'):
            try:
                exp_date = datetime.fromisoformat(item['expirationDate'].replace('Z', '+00:00'))
                days_left = (exp_date - datetime.now()).days
                if days_left <= 7:
                    expiring_soon.append({
                        'name': item.get('name'),
                        'days': days_left
                    })
            except:
                pass
    
    inventory_summary = f"""
    Total Items: {total_items}
    Items Expiring Soon (≤7 days): {len(expiring_soon)}
    
    Categories:
    """ + "\n".join([f"  - {cat}: {count} items" for cat, count in categories_count.items()])
    
    if expiring_soon:
        inventory_summary += f"\n\nExpiring Items:\n"
        inventory_summary += "\n".join([f"  - {item['name']} ({item['days']} days)" for item in expiring_soon])
    
    goals_text = ""
    if goals:
        goals_text = f"\nOptimization Goals: {', '.join(goals)}"
    
    prompt = f"""
    Analyze this inventory for optimization opportunities:
    
    {inventory_summary}
    {goals_text}
    
    Provide comprehensive optimization analysis in JSON format:
    {{
        "optimizations": [
            {{
                "type": "waste_reduction",
                "priority": "high",
                "action": "Use expiring vegetables in stir-fry this week",
                "impact": "Prevent waste of 3 items worth $12",
                "itemsAffected": ["bell peppers", "broccoli", "carrots"],
                "timeframe": "3 days"
            }},
            {{
                "type": "cost_savings",
                "priority": "medium", 
                "action": "Buy rice in bulk next time",
                "impact": "Save $3-5 per month",
                "reasoning": "You use rice frequently but buy small packages"
            }}
        ],
        "wasteReduction": {{
            "currentRisk": "medium",
            "itemsAtRisk": 3,
            "potentialSavings": "$15",
            "actions": [
                "Cook expiring vegetables first",
                "Freeze excess meat portions",
                "Use ripe fruits in smoothies"
            ]
        }},
        "costSavings": {{
            "monthlyPotential": "$25-35",
            "opportunities": [
                {{"action": "Buy bulk grains", "savings": "$8-12"}},
                {{"action": "Store seasonal vegetables", "savings": "$10-15"}},
                {{"action": "Batch cook proteins", "savings": "$7-8"}}
            ]
        }},
        "nutritionImprovements": {{
            "gaps": ["omega-3 fatty acids", "vitamin D"],
            "excesses": ["sodium from processed foods"],
            "recommendations": [
                "Add fatty fish or flax seeds for omega-3",
                "Include vitamin D fortified foods",
                "Reduce processed food purchases"
            ]
        }},
        "storageOptimizations": [
            {{
                "issue": "Vegetables spoiling quickly",
                "solution": "Store leafy greens with paper towels",
                "impact": "Extend freshness by 3-5 days"
            }}
        ]
    }}
    
    Focus on actionable, specific recommendations with quantified benefits.
    """
    
    return prompt

def generate_smart_shopping_list_prompt(current_inventory, meal_plans, preferences=None, budget=None):
    """Generate AI prompt for smart shopping list creation"""
    
    # Analyze current inventory
    inventory_summary = {}
    for item in current_inventory:
        category = item.get('category', 'Other')
        if category not in inventory_summary:
            inventory_summary[category] = []
        inventory_summary[category].append(f"{item.get('name')} ({item.get('quantity')} {item.get('unit')})")
    
    inventory_text = "Current Inventory:\n"
    for category, items in inventory_summary.items():
        inventory_text += f"  {category}: {', '.join(items)}\n"
    
    # Analyze meal plans
    meal_plan_text = ""
    if meal_plans:
        meal_plan_text = "Planned Meals:\n"
        for plan in meal_plans:
            meal_plan_text += f"  Week of {plan.get('weekStartDate', 'Unknown')}: {plan.get('name', 'Meal Plan')}\n"
            # Add meal details if available
            meals = plan.get('meals', {})
            for day, day_meals in meals.items():
                if day_meals:
                    meal_plan_text += f"    {day.title()}: {len(day_meals)} meals planned\n"
    
    budget_text = ""
    if budget:
        budget_text = f"\nBudget Constraints:\n  Target budget: ${budget.get('amount', 100)}\n  Priority: {budget.get('priority', 'balanced')}"
    
    preferences_text = ""
    if preferences:
        pref_list = []
        if preferences.get('stores'):
            pref_list.append(f"Preferred stores: {', '.join(preferences['stores'])}")
        if preferences.get('organic'):
            pref_list.append(f"Organic preference: {preferences['organic']}")
        if preferences.get('bulkBuying'):
            pref_list.append(f"Bulk buying: {preferences['bulkBuying']}")
        
        if pref_list:
            preferences_text = f"\nShopping Preferences:\n" + "\n".join(f"  - {item}" for item in pref_list)
    
    prompt = f"""
    Create an optimized shopping list based on current inventory and meal plans:
    
    {inventory_text}
    
    {meal_plan_text}
    {budget_text}
    {preferences_text}
    
    Generate a smart shopping list that:
    1. Avoids items already in inventory
    2. Supports planned meals
    3. Suggests complementary items
    4. Optimizes for budget and nutrition
    5. Minimizes waste
    
    Return JSON format:
    {{
        "shoppingList": [
            {{
                "item": "organic spinach",
                "category": "Fresh Vegetables",
                "amount": "1 bag",
                "estimatedPrice": 3.99,
                "priority": "high",
                "reasoning": "Needed for 3 planned meals, good source of iron",
                "mealPlans": ["Mediterranean Bowl", "Green Smoothie"],
                "alternatives": [
                    {{"item": "baby kale", "price": 4.49, "note": "Higher nutrition"}},
                    {{"item": "regular spinach", "price": 2.99, "note": "Budget option"}}
                ],
                "storageLife": "5-7 days",
                "nutritionBenefit": "High in iron, folate, vitamin K"
            }}
        ],
        "estimatedCost": {{
            "subtotal": 67.50,
            "tax": 4.73,
            "total": 72.23,
            "budgetStatus": "under budget",
            "comparison": "15% less than typical grocery trip"
        }},
        "nutritionImpact": {{
            "addedNutrients": ["vitamin C", "omega-3", "fiber"],
            "improvedCategories": ["vegetables", "healthy fats"],
            "weeklyNutritionScore": 85
        }},
        "alternatives": {{
            "budgetFriendly": [
                {{"swap": "organic → conventional", "savings": "$8-12"}},
                {{"swap": "brand name → store brand", "savings": "$5-8"}}
            ],
            "premiumOptions": [
                {{"upgrade": "add organic meat", "cost": "+$12-15", "benefit": "Higher quality protein"}}
            ]
        }},
        "smartSuggestions": [
            {{
                "type": "bulk_opportunity",
                "item": "brown rice",
                "suggestion": "Buy 5lb bag instead of 1lb",
                "savings": "$2-3 per month",
                "reasoning": "You use rice frequently"
            }},
            {{
                "type": "seasonal_deal",
                "item": "winter squash", 
                "suggestion": "Stock up - in season now",
                "benefit": "30% cheaper than summer prices"
            }}
        ]
    }}
    
    Focus on practical, cost-effective recommendations that improve nutrition and reduce waste.
    """
    
    return prompt

def generate_meal_plan_suggestions_prompt(inventory_items, preferences=None, nutrition_goals=None, timeframe="week"):
    """Generate AI prompt for meal plan suggestions from inventory"""
    
    # Categorize inventory
    proteins = []
    vegetables = []
    grains = []
    dairy = []
    other = []
    
    for item in inventory_items:
        category = item.get('category', '').lower()
        name = item.get('name', '')
        
        if any(keyword in category for keyword in ['meat', 'poultry', 'fish', 'seafood', 'beef', 'pork']):
            proteins.append(f"{name} ({item.get('quantity')} {item.get('unit')})")
        elif any(keyword in category for keyword in ['vegetable', 'produce']):
            vegetables.append(f"{name} ({item.get('quantity')} {item.get('unit')})")
        elif any(keyword in category for keyword in ['grain', 'rice', 'pasta', 'bread']):
            grains.append(f"{name} ({item.get('quantity')} {item.get('unit')})")
        elif 'dairy' in category:
            dairy.append(f"{name} ({item.get('quantity')} {item.get('unit')})")
        else:
            other.append(f"{name} ({item.get('quantity')} {item.get('unit')})")
    
    inventory_text = f"""
    Available Inventory:
    Proteins: {', '.join(proteins) if proteins else 'None'}
    Vegetables: {', '.join(vegetables) if vegetables else 'None'}
    Grains/Starches: {', '.join(grains) if grains else 'None'}
    Dairy: {', '.join(dairy) if dairy else 'None'}
    Other: {', '.join(other) if other else 'None'}
    """
    
    preferences_text = ""
    if preferences:
        pref_list = []
        if preferences.get('mealTypes'):
            pref_list.append(f"Meal types: {', '.join(preferences['mealTypes'])}")
        if preferences.get('cookingTime'):
            pref_list.append(f"Cooking time: {preferences['cookingTime']}")
        if preferences.get('difficulty'):
            pref_list.append(f"Difficulty: {preferences['difficulty']}")
        
        if pref_list:
            preferences_text = f"\nPreferences:\n" + "\n".join(f"  - {item}" for item in pref_list)
    
    nutrition_text = ""
    if nutrition_goals:
        nutrition_text = f"""
        Nutrition Goals:
        - Daily Calories: {nutrition_goals.get('dailyCalories', 2000)}
        - Protein: {nutrition_goals.get('protein', 150)}g
        - Carbs: {nutrition_goals.get('carbs', 250)}g
        - Fat: {nutrition_goals.get('fat', 65)}g
        - Fiber: {nutrition_goals.get('fiber', 25)}g
        """
    
    prompt = f"""
    Create a {timeframe} meal plan using available inventory:
    
    {inventory_text}
    {preferences_text}
    {nutrition_text}
    
    Design a complete meal plan that:
    1. Maximizes use of current inventory
    2. Creates balanced, nutritious meals
    3. Minimizes additional shopping needs
    4. Matches user preferences and goals
    5. Prevents food waste
    
    Return JSON format:
    {{
        "mealPlan": {{
            "monday": [
                {{
                    "mealType": "Breakfast",
                    "name": "Veggie Scramble",
                    "inventoryItems": [
                        {{"item": "eggs", "amount": "2", "fromInventory": true}},
                        {{"item": "bell peppers", "amount": "1/2 cup", "fromInventory": true}}
                    ],
                    "additionalItems": [
                        {{"item": "cheese", "amount": "1/4 cup", "essential": false}}
                    ],
                    "nutrition": {{
                        "calories": 320,
                        "protein": 18,
                        "carbs": 8,
                        "fat": 24
                    }},
                    "prepTime": 10,
                    "cookTime": 15
                }}
            ],
            "tuesday": [...],
            "wednesday": [...],
            "thursday": [...],
            "friday": [...],
            "saturday": [...],
            "sunday": [...]
        }},
        "utilization": {{
            "inventoryUsagePercentage": 85,
            "itemsUsed": 12,
            "totalItems": 15,
            "wasteReduction": "Prevents $15 in food waste"
        }},
        "nutrition": {{
            "dailyAverages": {{
                "calories": 1950,
                "protein": 145,
                "carbs": 220,
                "fat": 70,
                "fiber": 28
            }},
            "goalsAlignment": {{
                "calories": "within range",
                "protein": "slightly low", 
                "fiber": "exceeds goal"
            }}
        }},
        "cost": {{
            "additionalShoppingNeeded": 23.50,
            "costPerMeal": 4.75,
            "savingsFromInventoryUse": 45.00
        }},
        "shoppingList": [
            {{"item": "olive oil", "amount": "1 bottle", "price": 4.99, "essential": true}},
            {{"item": "lemons", "amount": "3", "price": 2.99, "essential": false}}
        ]
    }}
    
    Create practical, delicious meals that make the most of available ingredients.
    """
    
    return prompt

@app.function(image=image)
@modal.fastapi_endpoint(method="GET")
def health():
    """Health check endpoint for smart inventory manager"""
    return {
        "healthy": True,
        "service": "smart-inventory-manager", 
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
def suggest_ingredients(item: dict) -> Dict[str, Any]:
    """Smart inventory management and suggestions endpoint"""
    
    try:
        # Extract parameters
        suggestion_type = item.get("type", "recipe_suggestions")
        data = item.get("data") or item
        user_id = item.get("userId")
        
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            return {
                "success": False,
                "error": "OpenAI API key not configured"
            }
        
        print(f"🧠 Smart inventory analysis - Type: {suggestion_type}")
        
        # Route to appropriate analysis function
        if suggestion_type == "recipe_suggestions":
            result = suggest_recipes_from_inventory(data, openai_api_key)
        elif suggestion_type == "inventory_optimization":
            result = optimize_inventory_with_ai(data, openai_api_key)
        elif suggestion_type == "smart_shopping_list":
            result = generate_smart_shopping_list_with_ai(data, openai_api_key)
        elif suggestion_type == "meal_plan_suggestions":
            result = suggest_meal_plan_from_inventory(data, openai_api_key)
        elif suggestion_type == "ingredient_optimization":
            result = optimize_recipe_ingredients(data, openai_api_key)
        else:
            return {
                "success": False,
                "error": f"Unknown suggestion type: {suggestion_type}"
            }
        
        return result
        
    except Exception as e:
        print(f"❌ Smart inventory error: {e}")
        return {
            "success": False,
            "error": f"Smart inventory operation failed: {str(e)}"
        }

def suggest_recipes_from_inventory(data, openai_api_key):
    """Suggest recipes based on available inventory"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        inventory_items = data.get('inventory', [])
        preferences = data.get('preferences', {})
        
        if not inventory_items:
            return {
                "success": False,
                "error": "No inventory items provided"
            }
        
        prompt = generate_recipe_suggestions_prompt(inventory_items, preferences)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2500
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            suggestions_data = json.loads(json_str)
            
            return {
                "success": True,
                "suggestions": suggestions_data.get('suggestions', []),
                "utilization": suggestions_data.get('utilization', {}),
                "shoppingNeeded": suggestions_data.get('shoppingNeeded', []),
                "method": "ai_recipe_suggestions"
            }
        
        return {
            "success": False,
            "error": "Failed to parse AI recipe suggestions"
        }
        
    except Exception as e:
        print(f"❌ Recipe suggestions failed: {e}")
        return {
            "success": False,
            "error": f"Recipe suggestions failed: {str(e)}"
        }

def optimize_inventory_with_ai(data, openai_api_key):
    """Optimize inventory for waste reduction and cost savings"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        inventory_items = data.get('inventory', [])
        goals = data.get('goals', ['reduce_waste', 'save_money'])
        
        prompt = generate_inventory_optimization_prompt(inventory_items, goals)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
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
                "optimizations": optimization_data.get('optimizations', []),
                "wasteReduction": optimization_data.get('wasteReduction', {}),
                "costSavings": optimization_data.get('costSavings', {}),
                "nutritionImprovements": optimization_data.get('nutritionImprovements', {}),
                "storageOptimizations": optimization_data.get('storageOptimizations', []),
                "method": "ai_inventory_optimization"
            }
        
        return {
            "success": False,
            "error": "Failed to parse AI inventory optimization"
        }
        
    except Exception as e:
        print(f"❌ Inventory optimization failed: {e}")
        return {
            "success": False,
            "error": f"Inventory optimization failed: {str(e)}"
        }

def generate_smart_shopping_list_with_ai(data, openai_api_key):
    """Generate smart shopping list based on inventory and meal plans"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        current_inventory = data.get('currentInventory', [])
        meal_plans = data.get('mealPlans', [])
        preferences = data.get('preferences', {})
        budget = data.get('budget')
        
        prompt = generate_smart_shopping_list_prompt(current_inventory, meal_plans, preferences, budget)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=2500
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            shopping_data = json.loads(json_str)
            
            return {
                "success": True,
                "shoppingList": shopping_data.get('shoppingList', []),
                "estimatedCost": shopping_data.get('estimatedCost', {}),
                "nutritionImpact": shopping_data.get('nutritionImpact', {}),
                "alternatives": shopping_data.get('alternatives', {}),
                "smartSuggestions": shopping_data.get('smartSuggestions', []),
                "method": "ai_smart_shopping"
            }
        
        return {
            "success": False,
            "error": "Failed to parse AI shopping list"
        }
        
    except Exception as e:
        print(f"❌ Smart shopping list failed: {e}")
        return {
            "success": False,
            "error": f"Smart shopping list failed: {str(e)}"
        }

def suggest_meal_plan_from_inventory(data, openai_api_key):
    """Suggest meal plan based on available inventory"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        inventory_items = data.get('inventory', [])
        preferences = data.get('preferences', {})
        nutrition_goals = data.get('nutritionGoals')
        timeframe = data.get('timeframe', 'week')
        
        prompt = generate_meal_plan_suggestions_prompt(inventory_items, preferences, nutrition_goals, timeframe)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=3000
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        json_start = ai_response.find('{')
        json_end = ai_response.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = ai_response[json_start:json_end]
            meal_plan_data = json.loads(json_str)
            
            return {
                "success": True,
                "mealPlan": meal_plan_data.get('mealPlan', {}),
                "utilization": meal_plan_data.get('utilization', {}),
                "nutrition": meal_plan_data.get('nutrition', {}),
                "cost": meal_plan_data.get('cost', {}),
                "shoppingList": meal_plan_data.get('shoppingList', []),
                "method": "ai_meal_planning"
            }
        
        return {
            "success": False,
            "error": "Failed to parse AI meal plan"
        }
        
    except Exception as e:
        print(f"❌ Meal plan suggestions failed: {e}")
        return {
            "success": False,
            "error": f"Meal plan suggestions failed: {str(e)}"
        }

def optimize_recipe_ingredients(data, openai_api_key):
    """Optimize recipe ingredients based on inventory"""
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        recipe_ingredients = data.get('recipeIngredients', [])
        current_inventory = data.get('currentInventory', [])
        user_id = data.get('userId')
        
        # Create ingredient matching analysis
        inventory_names = [item.get('name', '').lower() for item in current_inventory]
        
        missing_ingredients = []
        available_ingredients = []
        substitution_opportunities = []
        
        for ingredient in recipe_ingredients:
            ing_name = ingredient.get('name', '').lower()
            
            # Simple matching (could be enhanced with fuzzy matching)
            if any(ing_name in inv_name or inv_name in ing_name for inv_name in inventory_names):
                available_ingredients.append(ingredient)
            else:
                missing_ingredients.append(ingredient)
                # Look for potential substitutions
                for inv_item in current_inventory:
                    if inv_item.get('category') == ingredient.get('category'):
                        substitution_opportunities.append({
                            'original': ingredient.get('name'),
                            'substitute': inv_item.get('name'),
                            'reasoning': f"Same category: {ingredient.get('category')}"
                        })
        
        return {
            "success": True,
            "missing": missing_ingredients,
            "available": available_ingredients,
            "substitutions": substitution_opportunities[:5],  # Limit to top 5
            "shoppingList": missing_ingredients,
            "inventoryUtilization": len(available_ingredients) / len(recipe_ingredients) if recipe_ingredients else 0,
            "method": "ingredient_optimization"
        }
        
    except Exception as e:
        print(f"❌ Recipe ingredient optimization failed: {e}")
        return {
            "success": False,
            "error": f"Recipe ingredient optimization failed: {str(e)}"
        }

# Test function
@app.function(image=image)
def test_smart_inventory():
    """Test the smart inventory manager"""
    print("🧪 Testing smart inventory manager...")
    
    test_data = {
        "type": "recipe_suggestions",
        "data": {
            "inventory": [
                {"name": "Chicken Breast", "category": "Fresh/Frozen Poultry", "quantity": 2, "unit": "lbs"},
                {"name": "Broccoli", "category": "Fresh Vegetables", "quantity": 1, "unit": "head", "expirationDate": "2024-01-15T00:00:00Z"},
                {"name": "Rice", "category": "Grains & Cereals", "quantity": 2, "unit": "cups"},
                {"name": "Bell Peppers", "category": "Fresh Vegetables", "quantity": 3, "unit": "pieces"}
            ],
            "preferences": {
                "cookingTime": "30 minutes",
                "difficulty": "easy",
                "cuisinePreferences": ["Mediterranean", "Asian"]
            }
        }
    }
    
    result = suggest_ingredients(test_data)
    print("Test result:", json.dumps(result, indent=2))
    return result

@app.local_entrypoint()
def main():
    print("🧠 Testing smart inventory manager...")
    result = test_smart_inventory.remote()
    print("Final result:", json.dumps(result, indent=2))

if __name__ == "__main__":
    main()